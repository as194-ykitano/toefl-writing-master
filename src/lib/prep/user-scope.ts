"use client";

// prep 系の学習データ（演習セッション / Writing / YouTube / 模試）を
// 「ログインユーザー単位」で保存・同期するための共有レイヤー。
//
// 背景:
//   もともと各ストアは prep_sessions_v1 等の固定 localStorage キーに保存しており、
//   同じブラウザなら全アカウントで同じデータを共有してしまっていた。
//   本レイヤーで uid ごとに領域を分離し、Firestore(users/{uid}/appData/{store})に
//   同期することで、アカウント単位・端末間で一貫したデータになる。
//
// 方針:
//   - 読み書きの同期 API（readStore / writeStore）は据え置き、消費側は最小改修。
//   - 即時性はキャッシュ＋ユーザー別 localStorage、真実の source は Firestore。
//   - ログイン時に Firestore からハイドレート。Firestore 未作成のユーザーは
//     旧グローバル localStorage（削除せず保持）から一度だけ引き継ぐ。
//   - 変更・ハイドレート時に購読者へ通知し、React 側で再取得できるようにする。

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Firestore/ローカルの領域を分ける対象ストアの base キー一覧 */
export const PREP_STORE_BASES = [
  "prep_sessions_v1",
  "prep_writing_results_v1",
  "prep_youtube_results_v1",
  "prep_mock_runs_v1",
  "prep_mock_reports_v1",
] as const;

let currentUid: string | null = null;

/** base -> 現ユーザー分の items[] キャッシュ */
const cache = new Map<string, unknown[]>();

type Listener = () => void;
const listeners = new Set<Listener>();

/** データ変更・ハイドレート時に通知を受け取る（React の再取得用） */
export function subscribePrepData(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emit() {
  for (const fn of listeners) fn();
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** ユーザー単位の localStorage キー */
function scopedKey(base: string): string {
  return `${base}::${currentUid ?? "guest"}`;
}

/** 旧グローバルキーからの引き継ぎ済みフラグ（旧データ自体は削除しない） */
function migratedFlagKey(base: string): string {
  return `${base}::__migrated`;
}

function readLocal(base: string): unknown[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(scopedKey(base));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(base: string, items: unknown[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(scopedKey(base), JSON.stringify(items));
  } catch {
    // 保存できなくても動作に影響なし
  }
}

/** 旧・非スコープの localStorage キー（全アカウント共有だったもの）を読む */
function readLegacyGlobal(base: string): unknown[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(base);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function legacyConsumed(base: string): boolean {
  if (!isBrowser()) return true;
  try {
    return window.localStorage.getItem(migratedFlagKey(base)) === "1";
  } catch {
    return true;
  }
}
function markLegacyConsumed(base: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(migratedFlagKey(base), "1");
  } catch {
    // フラグを保存できなくても致命的ではない
  }
}

/** 同期読み取り：キャッシュ→無ければユーザー別 localStorage */
export function readStore<T>(base: string): T[] {
  const cached = cache.get(base);
  if (cached) return cached as T[];
  const local = readLocal(base);
  cache.set(base, local);
  return local as T[];
}

/** 同期書き込み：キャッシュ＋localStorage を即時更新し、Firestore へ非同期反映 */
export function writeStore<T>(base: string, items: T[]): void {
  cache.set(base, items as unknown[]);
  writeLocal(base, items);
  emit();
  schedulePush(base);
}

// Firestore への書き込みは短時間の連続保存（模試の解答など）を集約するため
// デバウンスする。最新のキャッシュ全体を書くので、最後の1回で整合が取れる。
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
const PUSH_DEBOUNCE_MS = 800;

function schedulePush(base: string): void {
  if (!currentUid) return; // 未ログイン（guest）は Firestore に書かない
  const existing = pushTimers.get(base);
  if (existing) clearTimeout(existing);
  pushTimers.set(
    base,
    setTimeout(() => {
      pushTimers.delete(base);
      void pushToFirestore(base, cache.get(base) ?? []);
    }, PUSH_DEBOUNCE_MS),
  );
}

async function pushToFirestore(base: string, items: unknown[]): Promise<void> {
  const uid = currentUid;
  if (!uid) return; // 未ログイン（guest）は Firestore に書かない
  try {
    await setDoc(doc(db, "users", uid, "appData", base), {
      items,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("prep data sync (push) failed:", base, error);
  }
}

/** items からタイムスタンプ（ISO文字列）を推定して epoch(ms) を返す。無ければ 0。 */
function itemTime(item: unknown): number {
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>;
    const t = o.finishedAt ?? o.submittedAt ?? o.updatedAt ?? o.createdAt;
    if (typeof t === "string") {
      const p = Date.parse(t);
      return Number.isNaN(p) ? 0 : p;
    }
  }
  return 0;
}

/** id 単位でマージ（新しい方を採用）し、新しい順に並べて上限件数で丸める。 */
function mergeById(local: unknown[], remote: unknown[], cap = 50): unknown[] {
  const byId = new Map<string, unknown>();
  const put = (arr: unknown[]) => {
    for (const it of arr) {
      const id = (it as { id?: string })?.id;
      if (!id) continue;
      const prev = byId.get(id);
      if (!prev || itemTime(it) >= itemTime(prev)) byId.set(id, it);
    }
  };
  put(remote);
  put(local); // 同 id・同時刻はローカル（手元の最新）を優先
  return Array.from(byId.values())
    .sort((a, b) => itemTime(b) - itemTime(a))
    .slice(0, cap);
}

async function hydrateStore(base: string, uid: string): Promise<void> {
  try {
    const ref = doc(db, "users", uid, "appData", base);
    const snap = await getDoc(ref);

    // 途中でユーザーが切り替わっていたら破棄
    if (currentUid !== uid) return;

    if (snap.exists()) {
      const remote = (snap.data().items as unknown[]) ?? [];
      // ハイドレート中にローカル保存が発生していても失わないよう id 単位でマージ
      const local = cache.get(base) ?? readLocal(base);
      const merged = mergeById(local, remote);
      cache.set(base, merged);
      writeLocal(base, merged);
      // ローカル由来の差分があれば Firestore にも反映
      if (merged.length !== remote.length) schedulePush(base);
    } else {
      // Firestore 未作成： まずユーザー別ローカル、無ければ旧グローバルから引き継ぐ
      const scoped = readLocal(base);
      const legacy = legacyConsumed(base) ? [] : readLegacyGlobal(base);
      const seed = scoped.length ? scoped : legacy;
      cache.set(base, seed);
      writeLocal(base, seed);
      // 旧グローバルを引き継いだ場合は、他アカウントが二重取得しないよう消費済みに
      if (!scoped.length && legacy.length) markLegacyConsumed(base);
      await setDoc(ref, { items: seed, updatedAt: new Date().toISOString() });
    }
    emit();
  } catch (error) {
    console.error("prep data sync (hydrate) failed:", base, error);
    // 失敗時はローカルのみで動作継続
    if (!cache.has(base)) cache.set(base, readLocal(base));
    emit();
  }
}

/**
 * ログインユーザーを切り替える（auth 状態変化時に呼ぶ）。
 * キャッシュを破棄し、Firestore からハイドレートし直す。
 */
export function setPrepUser(uid: string | null): void {
  if (uid === currentUid) return;
  currentUid = uid;
  cache.clear();
  emit(); // まずは空／ローカルで即再描画
  if (uid) {
    for (const base of PREP_STORE_BASES) void hydrateStore(base, uid);
  }
}
