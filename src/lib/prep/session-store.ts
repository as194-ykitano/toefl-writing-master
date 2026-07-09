// 演習セッションの保存・読み込み
// 骨格段階では localStorage に保存する。
// 将来 Firestore に移行する場合もこのファイルの実装を差し替えるだけでよい

import { PracticeQuestion, PracticeSessionResult } from "./types";

const STORAGE_KEY = "prep_sessions_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadSessions(): PracticeSessionResult[] {
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

export function loadSession(sessionId: string): PracticeSessionResult | null {
  return loadSessions().find((s) => s.id === sessionId) ?? null;
}

export function saveSession(session: PracticeSessionResult): void {
  if (!isBrowser()) return;
  const sessions = loadSessions().filter((s) => s.id !== session.id);
  sessions.unshift(session);
  // 直近 50 件まで保持
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)));
}

export function markQuestionReviewed(sessionId: string, questionId: string): void {
  if (!isBrowser()) return;
  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const reviewed = new Set(session.reviewedQuestionIds ?? []);
  reviewed.add(questionId);
  session.reviewedQuestionIds = Array.from(reviewed);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// ---- 採点 ----

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isAnswerCorrect(
  question: PracticeQuestion,
  userAnswer: string | string[] | null
): boolean {
  if (userAnswer === null || userAnswer === undefined) return false;
  if (Array.isArray(question.answer)) {
    if (!Array.isArray(userAnswer)) return false;
    if (userAnswer.length !== question.answer.length) return false;
    const expected = new Set(question.answer.map(normalize));
    return userAnswer.every((a) => expected.has(normalize(a)));
  }
  if (Array.isArray(userAnswer)) return false;
  return normalize(userAnswer) === normalize(question.answer);
}

export function newSessionId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---- スコア換算（骨格段階の簡易推定） ----

export function estimateToeflSectionScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 30);
}

export function estimateIeltsBand(correct: number, total: number): number {
  if (total === 0) return 0;
  const ratio = correct / total;
  // 0.5 刻みの簡易換算
  const band = Math.round((3 + ratio * 6) * 2) / 2;
  return Math.min(9, Math.max(0, band));
}

export function toCefr(ratio: number): string {
  if (ratio >= 0.9) return "C1〜C2";
  if (ratio >= 0.75) return "B2〜C1";
  if (ratio >= 0.6) return "B2";
  if (ratio >= 0.45) return "B1〜B2";
  if (ratio >= 0.3) return "B1";
  return "A2〜B1";
}
