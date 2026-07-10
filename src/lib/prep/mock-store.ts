// 模試の進行状態と完了レポートの保存・読み込み
// 骨格段階では localStorage に保存する。将来 Firestore へ移行する場合も
// このファイルの実装を差し替えるだけでよい（session-store.ts と同方針）。

import { MockReport } from "./types";
import { MockRun } from "./mock-test";

const RUN_KEY = "prep_mock_runs_v1";
const REPORT_KEY = "prep_mock_reports_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readList<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ---- 進行中の模試 ----

export function saveMockRun(run: MockRun): void {
  if (!isBrowser()) return;
  const runs = readList<MockRun>(RUN_KEY).filter((r) => r.id !== run.id);
  runs.unshift(run);
  // 直近 10 回分まで保持
  window.localStorage.setItem(RUN_KEY, JSON.stringify(runs.slice(0, 10)));
}

export function loadMockRun(runId: string): MockRun | null {
  return readList<MockRun>(RUN_KEY).find((r) => r.id === runId) ?? null;
}

// ---- 完了レポート ----

export function saveMockReport(report: MockReport): void {
  if (!isBrowser()) return;
  const reports = readList<MockReport>(REPORT_KEY).filter((r) => r.id !== report.id);
  reports.unshift(report);
  window.localStorage.setItem(REPORT_KEY, JSON.stringify(reports.slice(0, 30)));
}

export function loadMockReport(reportId: string): MockReport | null {
  return readList<MockReport>(REPORT_KEY).find((r) => r.id === reportId) ?? null;
}

export function loadMockReports(): MockReport[] {
  return readList<MockReport>(REPORT_KEY);
}
