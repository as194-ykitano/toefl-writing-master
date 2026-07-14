import { describe, expect, it } from "vitest";
import {
  buildAdminLearningAnalytics,
  parsePracticeSessions,
  parseWritingResults,
} from "../src/lib/admin-learning-analytics";
import type { PracticeSessionResult, WritingResult } from "../src/lib/prep/types";

const catalog = [
  { id: "read-1", exam: "toefl" as const, skill: "reading" as const, practiceType: "daily-life", title: "Reading 1" },
  { id: "read-2", exam: "toefl" as const, skill: "reading" as const, practiceType: "daily-life", title: "Reading 2" },
  { id: "write-1", exam: "ielts" as const, skill: "writing" as const, practiceType: "task-2", title: "Writing 1" },
];

function session(id: string, setId: string, finishedAt: string): PracticeSessionResult {
  return {
    id,
    exam: "toefl",
    skill: "reading",
    setId,
    setTitle: "",
    mode: "practice",
    finishedAt,
    durationSec: 600,
    correctCount: 3,
    totalCount: 4,
    results: [],
  };
}

const writing: WritingResult = {
  id: "writing-result-1",
  exam: "ielts",
  setId: "write-1",
  practiceType: "task-2",
  rubric: "ielts-task2",
  title: "Essay",
  content: "A short answer",
  wordCount: 3,
  durationSec: 1200,
  finishedAt: "2026-07-12T02:00:00.000Z",
  feedback: {
    score: 6.5,
    scoreMax: 9,
    scoreLabel: "推定 Band",
    overall: "",
    strengths: [],
    improvements: [],
    scoreItems: [],
    grammarCorrections: [],
  },
};

describe("buildAdminLearningAnalytics", () => {
  it("新仕様のセッションとWritingを同じ学習履歴へ集計する", () => {
    const result = buildAdminLearningAnalytics(
      [session("s1", "read-1", "2026-07-11T01:00:00.000Z")],
      [writing],
      catalog,
      new Date("2026-07-13T00:00:00.000Z"),
    );

    expect(result.summary).toMatchObject({
      totalStudyMinutes: 30,
      totalActivities: 2,
      questionsAnswered: 4,
      submissions: 1,
      averageAccuracy: 75,
      activeDays: 2,
    });
    expect(result.activities.map((item) => item.kind)).toEqual(["writing", "session"]);
    expect(result.activities[0]).toMatchObject({ feedbackSummary: null, strengths: [], improvements: [] });
    expect(result.daily).toHaveLength(365);
    expect(result.byExamSkill).toEqual(expect.arrayContaining([
      expect.objectContaining({ exam: "toefl", skill: "reading", averageScore: 75 }),
      expect.objectContaining({ exam: "ielts", skill: "writing", averageScore: 6.5, scoreMax: 9 }),
    ]));
  });

  it("日本時間の日付で日別学習時間を集計する", () => {
    const nearMidnightUtc = session("s-jst", "read-1", "2026-07-12T16:00:00.000Z");
    const result = buildAdminLearningAnalytics([nearMidnightUtc], [], catalog, new Date("2026-07-13T12:00:00.000Z"));
    expect(result.daily.find((row) => row.date === "2026-07-13")?.minutes).toBe(10);
  });

  it("同じセットの再受講は実施回数に含め、完了セット数には重複計上しない", () => {
    const result = buildAdminLearningAnalytics(
      [
        session("s1", "read-1", "2026-07-11T01:00:00.000Z"),
        session("s2", "read-1", "2026-07-12T01:00:00.000Z"),
      ],
      [],
      catalog,
      new Date("2026-07-13T00:00:00.000Z"),
    );
    expect(result.contentProgress.find((row) => row.practiceType === "daily-life")).toMatchObject({
      completed: 1,
      total: 2,
      attempts: 2,
      percent: 50,
    });
  });
});

describe("appData parser", () => {
  it("壊れた行を除外し、管理画面全体の読込を失敗させない", () => {
    expect(parsePracticeSessions([session("s1", "read-1", "2026-07-11T01:00:00.000Z"), { id: "broken" }])).toHaveLength(1);
    expect(parseWritingResults([writing, null, { id: "broken" }])).toHaveLength(1);
  });
});
