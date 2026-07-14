// Writing 添削結果の保存・読み込み
// 保存領域はログインユーザー単位（user-scope 経由で Firestore 同期）。

import { ExamId, WritingResult } from "./types";
import { readStore, writeStore } from "./user-scope";

const STORAGE_KEY = "prep_writing_results_v1";

export function loadWritingResults(): WritingResult[] {
  return readStore<WritingResult>(STORAGE_KEY);
}

export function loadWritingResult(resultId: string): WritingResult | null {
  return loadWritingResults().find((r) => r.id === resultId) ?? null;
}

/** 特定 exam の結果のみ（新しい順） */
export function loadWritingResultsByExam(exam: ExamId): WritingResult[] {
  return loadWritingResults().filter((r) => r.exam === exam);
}

export function saveWritingResult(result: WritingResult): void {
  const results = loadWritingResults().filter((r) => r.id !== result.id);
  results.unshift(result);
  // 直近 50 件まで保持
  writeStore(STORAGE_KEY, results.slice(0, 50));
}

export function deleteWritingResult(resultId: string): void {
  const results = loadWritingResults().filter((r) => r.id !== resultId);
  writeStore(STORAGE_KEY, results);
}

export function newWritingResultId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
