// Writing 添削結果の保存・読み込み
// 新 prep 系の他ストア（session-store / mock-store）と同じく localStorage に保存する。
// 将来 Firestore に移行する場合もこのファイルの実装を差し替えるだけでよい。

import { ExamId, WritingResult } from "./types";

const STORAGE_KEY = "prep_writing_results_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadWritingResults(): WritingResult[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadWritingResult(resultId: string): WritingResult | null {
  return loadWritingResults().find((r) => r.id === resultId) ?? null;
}

/** 特定 exam の結果のみ（新しい順） */
export function loadWritingResultsByExam(exam: ExamId): WritingResult[] {
  return loadWritingResults().filter((r) => r.exam === exam);
}

export function saveWritingResult(result: WritingResult): void {
  if (!isBrowser()) return;
  const results = loadWritingResults().filter((r) => r.id !== result.id);
  results.unshift(result);
  // 直近 50 件まで保持
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, 50)));
}

export function deleteWritingResult(resultId: string): void {
  if (!isBrowser()) return;
  const results = loadWritingResults().filter((r) => r.id !== resultId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

export function newWritingResultId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
