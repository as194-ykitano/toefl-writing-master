// 問題データの取得 API
// モックデータ + IELTS インポート済み静的データ（scripts/import-ielts-prep.mjs で生成）を返す。
// 実データを Firestore / REST API に移行する場合もこのファイルの実装だけを
// 差し替えれば UI 側は変更不要。
//
// インポート済み JSON はサイズが大きいため dynamic import で遅延読み込みし、
// 一覧・演習ページを開いたときだけチャンクを取得する。

import { LISTENING_SETS, READING_SETS, SPEAKING_SETS } from "./mock-data";
import { ExamId, ListeningSet, ReadingSet, SkillId, SpeakingSet } from "./types";

let importedReading: ReadingSet[] | null = null;
let importedListening: ListeningSet[] | null = null;
let importedSpeaking: SpeakingSet[] | null = null;

async function loadImportedReading(): Promise<ReadingSet[]> {
  if (!importedReading) {
    const mod = await import("./data/ielts-reading-sets.json");
    importedReading = mod.default as unknown as ReadingSet[];
  }
  return importedReading;
}

async function loadImportedListening(): Promise<ListeningSet[]> {
  if (!importedListening) {
    const mod = await import("./data/ielts-listening-sets.json");
    importedListening = mod.default as unknown as ListeningSet[];
  }
  return importedListening;
}

export async function getReadingSets(exam: ExamId): Promise<ReadingSet[]> {
  const mock = READING_SETS.filter((s) => s.exam === exam);
  if (exam !== "ielts") return mock;
  const imported = await loadImportedReading();
  return [...imported, ...mock];
}

export async function getReadingSet(exam: ExamId, setId: string): Promise<ReadingSet | null> {
  const sets = await getReadingSets(exam);
  return sets.find((s) => s.id === setId) ?? null;
}

export async function getListeningSets(exam: ExamId): Promise<ListeningSet[]> {
  const mock = LISTENING_SETS.filter((s) => s.exam === exam);
  if (exam !== "ielts") return mock;
  const imported = await loadImportedListening();
  return [...imported, ...mock];
}

// Storage 上の音声・画像パス（scripts/upload-ielts-assets.mjs が生成）。
// アップロード前・権限エラー時は URL 解決に失敗するので、
// その場合は従来どおり audioUrl 未設定（読み上げフォールバック）で返す。
async function resolveAssetUrls(set: ListeningSet): Promise<ListeningSet> {
  if (set.audioUrl) return set;
  try {
    const pathsMod = await import("./data/ielts-asset-paths.json");
    const paths = (pathsMod.default as Record<string, { audioPath?: string; imagePath?: string }>)[
      set.id
    ];
    if (!paths) return set;
    const [{ storage }, { getDownloadURL, ref }] = await Promise.all([
      import("@/lib/firebase"),
      import("firebase/storage"),
    ]);
    const resolved = { ...set };
    if (paths.audioPath) {
      resolved.audioUrl = await getDownloadURL(ref(storage, paths.audioPath)).catch(() => undefined);
    }
    if (paths.imagePath) {
      resolved.imageUrl = await getDownloadURL(ref(storage, paths.imagePath)).catch(() => undefined);
    }
    return resolved;
  } catch {
    return set;
  }
}

export async function getListeningSet(exam: ExamId, setId: string): Promise<ListeningSet | null> {
  const sets = await getListeningSets(exam);
  const set = sets.find((s) => s.id === setId) ?? null;
  return set ? resolveAssetUrls(set) : null;
}

async function loadImportedSpeaking(): Promise<SpeakingSet[]> {
  if (!importedSpeaking) {
    const mod = await import("./data/ielts-speaking-sets.json");
    importedSpeaking = mod.default as unknown as SpeakingSet[];
  }
  return importedSpeaking;
}

export async function getSpeakingSets(exam: ExamId): Promise<SpeakingSet[]> {
  const mock = SPEAKING_SETS.filter((s) => s.exam === exam);
  if (exam !== "ielts") return mock;
  const imported = await loadImportedSpeaking();
  return [...imported, ...mock];
}

export async function getSpeakingSet(exam: ExamId, setId: string): Promise<SpeakingSet | null> {
  const sets = await getSpeakingSets(exam);
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
  if (skill === "reading" || skill === "listening") {
    const sets = skill === "reading" ? await getReadingSets(exam) : await getListeningSets(exam);
    for (const set of sets) {
      stats.setCount += 1;
      stats.questionCount += set.questions.length;
      if (set.practiceType) {
        stats.typeCounts[set.practiceType] = (stats.typeCounts[set.practiceType] ?? 0) + 1;
      }
    }
  } else if (skill === "speaking") {
    const sets = await getSpeakingSets(exam);
    for (const set of sets) {
      stats.setCount += 1;
      stats.questionCount += set.tasks.length;
      if (set.practiceType) {
        stats.typeCounts[set.practiceType] = (stats.typeCounts[set.practiceType] ?? 0) + 1;
      }
    }
  }
  return stats;
}
