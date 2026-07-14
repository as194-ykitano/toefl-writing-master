// 問題データの取得 API
// モックデータ + インポート済み静的データ（scripts/import-*.mjs で生成）を返す。
// 実データを Firestore / REST API に移行する場合もこのファイルの実装だけを
// 差し替えれば UI 側は変更不要。
//
// インポート済み JSON はサイズが大きいため dynamic import で遅延読み込みし、
// 一覧・演習ページを開いたときだけチャンクを取得する。
//
// 音声・画像は Firebase Storage の /prep/** に置き、
// asset-paths JSON のパスから getDownloadURL で解決する。
// 未アップロード・権限エラー時は黙って未設定のまま返す（読み上げフォールバック）。

import { LISTENING_SETS, READING_SETS, SPEAKING_SETS } from "./mock-data";
import { cleanReadingTitle } from "./display-title";
import {
  ExamId,
  ListeningSet,
  ReadingSet,
  SkillId,
  SpeakingSet,
  WritingPracticeSet,
} from "./types";

// ---- 遅延ロードのキャッシュ ----

const cache = new Map<string, unknown>();

async function loadJson<T>(key: string, loader: () => Promise<{ default: unknown }>): Promise<T> {
  if (!cache.has(key)) {
    const mod = await loader();
    cache.set(key, mod.default);
  }
  return cache.get(key) as T;
}

const loaders = {
  toeicReading: () => import("./data/toeic-reading-sets.json"),
  toeicListening: () => import("./data/toeic-listening-sets.json"),
  ieltsReading: () => import("./data/ielts-reading-sets.json"),
  ieltsListening: () => import("./data/ielts-listening-sets.json"),
  ieltsSpeaking: () => import("./data/ielts-speaking-sets.json"),
  toeflReading: () => import("./data/toefl-reading-sets.json"),
  toeflListening: () => import("./data/toefl-listening-sets.json"),
  toeflSpeaking: () => import("./data/toefl-speaking-sets.json"),
  toeflWriting: () => import("./data/toefl-writing-sets.json"),
  toeflWritingEssay: () => import("./data/toefl-writing-essay-sets.json"),
  ieltsWriting: () => import("./data/ielts-writing-sets.json"),
};

// ---- Storage 音声・画像の URL 解決 ----

interface IeltsAssetPaths {
  [setId: string]: { audioPath?: string; imagePath?: string };
}

interface ToeflAssetPaths {
  listening: Record<string, string>;
  speaking: Record<string, Record<string, string>>;
}

export interface ManagedPracticeSetAssetPaths {
  audioPath?: string;
  imagePath?: string;
}

/** Storage URLの解決をブラウザで行う画面向けに、元のStorage pathを返す。 */
export async function getManagedPracticeSetAssetPaths(
  set: ManagedPracticeSet
): Promise<ManagedPracticeSetAssetPaths> {
  if (set.skill !== "listening") return {};
  try {
    if (set.exam === "ielts") {
      const paths = await loadJson<IeltsAssetPaths>("ielts-assets", () =>
        import("./data/ielts-asset-paths.json")
      );
      return paths[set.id] ?? {};
    }
    if (set.exam === "toefl") {
      const paths = await loadJson<ToeflAssetPaths>("toefl-assets", () =>
        import("./data/toefl-asset-paths.json")
      );
      return { audioPath: paths.listening[set.id] };
    }
  } catch {
    // URLがデータ本体にある場合はそのまま利用できるため、path解決失敗は空で返す。
  }
  return {};
}

async function getDownloadUrlSafe(storagePath: string): Promise<string | undefined> {
  try {
    const [{ storage }, { getDownloadURL, ref }] = await Promise.all([
      import("@/lib/firebase"),
      import("firebase/storage"),
    ]);
    return await getDownloadURL(ref(storage, storagePath)).catch(() => undefined);
  } catch {
    return undefined;
  }
}

async function resolveListeningAssets(set: ListeningSet): Promise<ListeningSet> {
  if (set.audioUrl) return set;
  try {
    if (set.exam === "ielts") {
      const paths = await loadJson<IeltsAssetPaths>("ielts-assets", () =>
        import("./data/ielts-asset-paths.json")
      );
      const entry = paths[set.id];
      if (!entry) return set;
      const resolved = { ...set };
      if (entry.audioPath) resolved.audioUrl = await getDownloadUrlSafe(entry.audioPath);
      if (entry.imagePath) resolved.imageUrl = await getDownloadUrlSafe(entry.imagePath);
      return resolved;
    }
    const paths = await loadJson<ToeflAssetPaths>("toefl-assets", () =>
      import("./data/toefl-asset-paths.json")
    );
    const audioPath = paths.listening[set.id];
    if (!audioPath) return set;
    return { ...set, audioUrl: await getDownloadUrlSafe(audioPath) };
  } catch {
    return set;
  }
}

/**
 * 管理画面など、個別取得APIでも生徒画面と同じ音声・画像URLを表示するための補完処理。
 * bundled JSON はアセット本体ではなく asset-paths JSON に Storage path を持つため、
 * 編集前に必ず同じ解決処理を通す。
 */
export async function resolveManagedPracticeSetAssets(
  set: ManagedPracticeSet
): Promise<ManagedPracticeSet> {
  if (set.skill === "listening") {
    return resolveListeningAssets(set as ListeningSet);
  }
  if (set.skill === "speaking") {
    return resolveSpeakingAssets(set as SpeakingSet);
  }
  return set;
}

async function resolveSpeakingAssets(set: SpeakingSet): Promise<SpeakingSet> {
  if (set.exam !== "toefl") return set;
  try {
    const paths = await loadJson<ToeflAssetPaths>("toefl-assets", () =>
      import("./data/toefl-asset-paths.json")
    );
    const taskPaths = paths.speaking[set.id];
    if (!taskPaths) return set;
    const tasks = await Promise.all(
      set.tasks.map(async (task) => {
        if (task.audioUrl || !taskPaths[task.id]) return task;
        return { ...task, audioUrl: await getDownloadUrlSafe(taskPaths[task.id]) };
      })
    );
    return { ...set, tasks };
  } catch {
    return set;
  }
}

// ---- Reading ----

const READING_LOADERS: Record<ExamId, () => Promise<{ default: unknown }>> = {
  ielts: loaders.ieltsReading,
  toefl: loaders.toeflReading,
  toeic: loaders.toeicReading,
};

export type ManagedPracticeSet = ReadingSet | ListeningSet | SpeakingSet | WritingPracticeSet;

type PracticeSetOverride = {
  exam: ExamId;
  skill: SkillId;
  sourceId: string;
  isPublished: boolean;
  data?: ManagedPracticeSet;
};

async function applyPracticeSetOverrides<T extends ManagedPracticeSet>(
  exam: ExamId,
  skill: SkillId,
  baseSets: T[]
): Promise<T[]> {
  try {
    if (typeof window === "undefined") return baseSets;
    const response = await fetch(`/api/practice-set-overrides?exam=${exam}&skill=${skill}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`override API returned ${response.status}`);
    const result = await response.json() as { overrides?: PracticeSetOverride[] };
    const overrides = result.overrides ?? [];
    const byId = new Map(baseSets.map((set) => [set.id, set]));

    for (const override of overrides) {
      if (!override.sourceId) continue;
      if (!override.isPublished) {
        byId.delete(override.sourceId);
        continue;
      }
      if (override.data) {
        byId.set(override.sourceId, {
          ...override.data,
          id: override.sourceId,
          exam,
          skill,
        } as T);
      }
    }
    return [...byId.values()];
  } catch (error) {
    // Existing JSON remains usable while signed out, offline, or before rules are deployed.
    console.warn("Practice set overrides could not be loaded; using bundled JSON.", error);
    return baseSets;
  }
}

export async function getStaticReadingSets(exam: ExamId): Promise<ReadingSet[]> {
  const mock = READING_SETS.filter((s) => s.exam === exam);
  const imported = await loadJson<ReadingSet[]>(`${exam}-reading`, READING_LOADERS[exam]);
  return [...imported, ...mock];
}

export async function getReadingSets(exam: ExamId): Promise<ReadingSet[]> {
  const sets = await applyPracticeSetOverrides(exam, "reading", await getStaticReadingSets(exam));
  return sets.map((set) => ({
    ...set,
    title: cleanReadingTitle(set.title),
    passageTitle: cleanReadingTitle(set.passageTitle),
  }));
}

export async function getReadingSet(exam: ExamId, setId: string): Promise<ReadingSet | null> {
  const sets = await getReadingSets(exam);
  return sets.find((s) => s.id === setId) ?? null;
}

// ---- Listening ----

const LISTENING_LOADERS: Record<ExamId, () => Promise<{ default: unknown }>> = {
  ielts: loaders.ieltsListening,
  toefl: loaders.toeflListening,
  toeic: loaders.toeicListening,
};

export async function getStaticListeningSets(exam: ExamId): Promise<ListeningSet[]> {
  const mock = LISTENING_SETS.filter((s) => s.exam === exam);
  const imported = await loadJson<ListeningSet[]>(`${exam}-listening`, LISTENING_LOADERS[exam]);
  return [...imported, ...mock];
}

export async function getListeningSets(exam: ExamId): Promise<ListeningSet[]> {
  return applyPracticeSetOverrides(exam, "listening", await getStaticListeningSets(exam));
}

export async function getListeningSet(exam: ExamId, setId: string): Promise<ListeningSet | null> {
  const sets = await getListeningSets(exam);
  const set = sets.find((s) => s.id === setId) ?? null;
  return set ? resolveListeningAssets(set) : null;
}

// ---- Speaking ----

export async function getStaticSpeakingSets(exam: ExamId): Promise<SpeakingSet[]> {
  const mock = SPEAKING_SETS.filter((s) => s.exam === exam);
  // TOEIC は初回スコープで Reading のみ（Speaking データ未整備）
  if (exam === "toeic") return mock;
  const imported = await loadJson<SpeakingSet[]>(
    `${exam}-speaking`,
    exam === "ielts" ? loaders.ieltsSpeaking : loaders.toeflSpeaking
  );
  return [...imported, ...mock];
}

export async function getSpeakingSets(exam: ExamId): Promise<SpeakingSet[]> {
  return applyPracticeSetOverrides(exam, "speaking", await getStaticSpeakingSets(exam));
}

export async function getSpeakingSet(exam: ExamId, setId: string): Promise<SpeakingSet | null> {
  const sets = await getSpeakingSets(exam);
  const set = sets.find((s) => s.id === setId) ?? null;
  return set ? resolveSpeakingAssets(set) : null;
}

// ---- Writing（TOEFL 新形式の演習セット） ----

export async function getStaticWritingSets(exam: ExamId): Promise<WritingPracticeSet[]> {
  // TOEIC は初回スコープで Reading のみ（Writing データ未整備）
  if (exam === "toeic") return [];
  if (exam === "ielts") {
    // IELTS Writing Task 1 / Task 2（エッセイ型）
    return loadJson<WritingPracticeSet[]>("ielts-writing", loaders.ieltsWriting);
  }
  // TOEFL: Academic Discussion（エッセイ型）+ 既存の Build a Sentence / Write an Email
  const [essays, base] = await Promise.all([
    loadJson<WritingPracticeSet[]>("toefl-writing-essay", loaders.toeflWritingEssay),
    loadJson<WritingPracticeSet[]>("toefl-writing", loaders.toeflWriting),
  ]);
  return [...essays, ...base];
}

export async function getWritingSets(exam: ExamId): Promise<WritingPracticeSet[]> {
  return applyPracticeSetOverrides(exam, "writing", await getStaticWritingSets(exam));
}

export async function getAllStaticPracticeSets(): Promise<ManagedPracticeSet[]> {
  const exams: ExamId[] = ["toefl", "ielts", "toeic"];
  const groups = await Promise.all(exams.flatMap((exam) => [
    getStaticReadingSets(exam),
    getStaticListeningSets(exam),
    getStaticSpeakingSets(exam),
    getStaticWritingSets(exam),
  ]));
  return groups.flat() as ManagedPracticeSet[];
}

export async function getWritingSet(
  exam: ExamId,
  setId: string
): Promise<WritingPracticeSet | null> {
  const sets = await getWritingSets(exam);
  return sets.find((s) => s.id === setId) ?? null;
}

// ---- 集計（ハブ・セクションページ表示用） ----

export interface SkillStats {
  setCount: number;
  questionCount: number;
  /** practiceType slug → セット数 */
  typeCounts: Record<string, number>;
}

export async function getSkillStats(exam: ExamId, skill: SkillId): Promise<SkillStats> {
  const stats: SkillStats = { setCount: 0, questionCount: 0, typeCounts: {} };
  const add = (practiceType: string | undefined, questionCount: number) => {
    stats.setCount += 1;
    stats.questionCount += questionCount;
    if (practiceType) {
      stats.typeCounts[practiceType] = (stats.typeCounts[practiceType] ?? 0) + 1;
    }
  };

  if (skill === "reading" || skill === "listening") {
    const sets = skill === "reading" ? await getReadingSets(exam) : await getListeningSets(exam);
    for (const set of sets) add(set.practiceType, set.questions.length);
  } else if (skill === "speaking") {
    for (const set of await getSpeakingSets(exam)) add(set.practiceType, set.tasks.length);
  } else if (skill === "writing") {
    for (const set of await getWritingSets(exam)) {
      add(set.practiceType, set.practiceType === "build-a-sentence" ? set.items.length : 1);
    }
  }
  return stats;
}
