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

// ---- スコア換算 ----
//
// 【重要】IELTS の Band 換算は「40 問構成のフルテスト」を前提とした統計的な等化
// (equating) に基づくため、大問 1 つ（数問〜十数問）の練習結果から Band を
// 算出するのは不正確。練習セットの結果画面では正答率のみを表示し、
// Band 換算は将来の模試（40 問フルセット）機能でのみ下記の公式準拠テーブルを使う。

/** IELTS Listening 公式準拠の raw score → Band 換算（40 問。Academic / General 共通） */
const IELTS_LISTENING_BAND_TABLE: [number, number][] = [
  [39, 9.0], [37, 8.5], [35, 8.0], [32, 7.5], [30, 7.0], [26, 6.5],
  [23, 6.0], [18, 5.5], [16, 5.0], [13, 4.5], [10, 4.0], [8, 3.5], [6, 3.0],
];

/** IELTS Academic Reading 公式準拠の raw score → Band 換算（40 問） */
const IELTS_ACADEMIC_READING_BAND_TABLE: [number, number][] = [
  [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5], [30, 7.0], [27, 6.5],
  [23, 6.0], [19, 5.5], [15, 5.0], [13, 4.5], [10, 4.0], [8, 3.5], [6, 3.0],
];

/** 40 問フルテスト（模試）用の Band 換算。練習セットには使わないこと */
export function ieltsBandFromRaw40(correct: number, skill: "listening" | "reading"): number {
  const table = skill === "listening" ? IELTS_LISTENING_BAND_TABLE : IELTS_ACADEMIC_READING_BAND_TABLE;
  for (const [min, band] of table) {
    if (correct >= min) return band;
  }
  return 2.5;
}

/** @deprecated 練習セットからの推定は不正確なため結果画面では未使用。模試実装時に ieltsBandFromRaw40 を使う */
export function estimateToeflSectionScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 30);
}

/** @deprecated 練習セットからの推定は不正確なため結果画面では未使用。模試実装時に ieltsBandFromRaw40 を使う */
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
