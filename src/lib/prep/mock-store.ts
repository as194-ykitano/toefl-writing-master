// 模試の進行状態と完了レポートの保存・読み込み
// 保存領域はログインユーザー単位（user-scope 経由で Firestore 同期）。

import { MockReport } from "./types";
import { MockRun } from "./mock-test";
import { readStore, writeStore } from "./user-scope";

const RUN_KEY = "prep_mock_runs_v1";
const REPORT_KEY = "prep_mock_reports_v1";

// ---- 進行中の模試 ----

export function saveMockRun(run: MockRun): void {
  const runs = readStore<MockRun>(RUN_KEY).filter((r) => r.id !== run.id);
  runs.unshift(run);
  // 直近 10 回分まで保持
  writeStore(RUN_KEY, runs.slice(0, 10));
}

export function loadMockRun(runId: string): MockRun | null {
  return readStore<MockRun>(RUN_KEY).find((r) => r.id === runId) ?? null;
}

// ---- 完了レポート ----

export function saveMockReport(report: MockReport): void {
  const reports = readStore<MockReport>(REPORT_KEY).filter((r) => r.id !== report.id);
  reports.unshift(report);
  writeStore(REPORT_KEY, reports.slice(0, 30));
}

export function loadMockReport(reportId: string): MockReport | null {
  return readStore<MockReport>(REPORT_KEY).find((r) => r.id === reportId) ?? null;
}

export function loadMockReports(): MockReport[] {
  return readStore<MockReport>(REPORT_KEY);
}
