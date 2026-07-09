// 問題データの取得 API
// 現在はモックデータを返すが、実データ投入時はこのファイルの実装だけを
// Firestore / REST API 呼び出しに差し替えれば UI 側は変更不要

import { LISTENING_SETS, READING_SETS, SPEAKING_SETS } from "./mock-data";
import { ExamId, ListeningSet, ReadingSet, SpeakingSet } from "./types";

export async function getReadingSets(exam: ExamId): Promise<ReadingSet[]> {
  return READING_SETS.filter((s) => s.exam === exam);
}

export async function getReadingSet(exam: ExamId, setId: string): Promise<ReadingSet | null> {
  return READING_SETS.find((s) => s.exam === exam && s.id === setId) ?? null;
}

export async function getListeningSets(exam: ExamId): Promise<ListeningSet[]> {
  return LISTENING_SETS.filter((s) => s.exam === exam);
}

export async function getListeningSet(exam: ExamId, setId: string): Promise<ListeningSet | null> {
  return LISTENING_SETS.find((s) => s.exam === exam && s.id === setId) ?? null;
}

export async function getSpeakingSets(exam: ExamId): Promise<SpeakingSet[]> {
  return SPEAKING_SETS.filter((s) => s.exam === exam);
}

export async function getSpeakingSet(exam: ExamId, setId: string): Promise<SpeakingSet | null> {
  return SPEAKING_SETS.find((s) => s.exam === exam && s.id === setId) ?? null;
}
