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
  ieltsReading: () => import("./data/ielts-reading-sets.json"),
  ieltsListening: () => import("./data/ielts-listening-sets.json"),
  ieltsSpeaking: () => import("./data/ielts-speaking-sets.json"),
  toeflReading: () => import("./data/toefl-reading-sets.json"),
  toeflListening: () => import("./data/toefl-listening-sets.json"),
  toeflSpeaking: () => import("./data/toefl-speaking-sets.json"),
  toeflWriting: () => import("./data/toefl-writing-sets.json"),
};

// ---- Storage 音声・画像の URL 解決 ----

interface IeltsAssetPaths {
  [setId: string]: { audioPath?: string; imagePath?: string };
}

interface ToeflAssetPaths {
  listening: Record<string, string>;
  speaking: Record<string, Record<string, string>>;
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

export async function getReadingSets(exam: ExamId): Promise<ReadingSet[]> {
  const mock = READING_SETS.filter((s) => s.exam === exam);
  const imported = await loadJson<ReadingSet[]>(
    `${exam}-reading`,
    exam === "ielts" ? loaders.ieltsReading : loaders.toeflReading
  );
  return [...imported, ...mock];
}

export async function getReadingSet(exam: ExamId, setId: string): Promise<ReadingSet | null> {
  const sets = await getReadingSets(exam);
  return sets.find((s) => s.id === setId) ?? null;
}

// ---- Listening ----

export async function getListeningSets(exam: ExamId): Promise<ListeningSet[]> {
  const mock = LISTENING_SETS.filter((s) => s.exam === exam);
  const imported = await loadJson<ListeningSet[]>(
    `${exam}-listening`,
    exam === "ielts" ? loaders.ieltsListening : loaders.toeflListening
  );
  return [...imported, ...mock];
}

export async function getListeningSet(exam: ExamId, setId: string): Promise<ListeningSet | null> {
  const sets = await getListeningSets(exam);
  const set = sets.find((s) => s.id === setId) ?? null;
  return set ? resolveListeningAssets(set) : null;
}

// ---- Speaking ----

export async function getSpeakingSets(exam: ExamId): Promise<SpeakingSet[]> {
  const mock = SPEAKING_SETS.filter((s) => s.exam === exam);
  const imported = await loadJson<SpeakingSet[]>(
    `${exam}-speaking`,
    exam === "ielts" ? loaders.ieltsSpeaking : loaders.toeflSpeaking
  );
  return [...imported, ...mock];
}

export async function getSpeakingSet(exam: ExamId, setId: string): Promise<SpeakingSet | null> {
  const sets = await getSpeakingSets(exam);
  const set = sets.find((s) => s.id === setId) ?? null;
  return set ? resolveSpeakingAssets(set) : null;
}

// ---- Writing（TOEFL 新形式の演習セット） ----

export async function getWritingSets(exam: ExamId): Promise<WritingPracticeSet[]> {
  if (exam !== "toefl") return [];
  return loadJson<WritingPracticeSet[]>("toefl-writing", loaders.toeflWriting);
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