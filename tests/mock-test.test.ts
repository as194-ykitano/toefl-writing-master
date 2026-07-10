import { describe, it, expect } from "vitest";
import {
  computeMockReport,
  MockRun,
  pickMockSections,
  sectionScore,
} from "../src/lib/prep/mock-test";
import {
  ExamId,
  ListeningSet,
  PracticeSessionResult,
  ReadingSet,
  SkillId,
  SpeakingSet,
} from "../src/lib/prep/types";

// ---- テスト用のダミーセット生成 ----

function reading(id: string, exam: ExamId): ReadingSet {
  return {
    id,
    exam,
    skill: "reading",
    title: `Reading ${id}`,
    difficulty: "medium",
    timeLimitSec: 600,
    passageTitle: "Passage",
    paragraphs: [{ text: "..." }],
    questions: [],
  };
}

function listening(id: string, exam: ExamId): ListeningSet {
  return {
    id,
    exam,
    skill: "listening",
    title: `Listening ${id}`,
    difficulty: "medium",
    timeLimitSec: 600,
    transcript: "...",
    playLimitInTest: 1,
    questions: [],
  };
}

function speaking(id: string, exam: ExamId): SpeakingSet {
  return {
    id,
    exam,
    skill: "speaking",
    title: `Speaking ${id}`,
    difficulty: "medium",
    tasks: [],
  };
}

function pools(exam: ExamId) {
  return {
    reading: [reading("r1", exam), reading("r2", exam), reading("r3", "advanced" as ExamId)].filter(
      (s) => s.exam === exam
    ) as ReadingSet[],
    listening: [listening("l1", exam), listening("l2", exam)],
    speaking: [speaking("s1", exam)],
  };
}

function result(
  skill: SkillId,
  exam: ExamId,
  over: Partial<PracticeSessionResult> = {}
): PracticeSessionResult {
  return {
    id: `res-${skill}`,
    exam,
    skill,
    setId: `set-${skill}`,
    setTitle: `Set ${skill}`,
    mode: "test",
    finishedAt: new Date().toISOString(),
    durationSec: 600,
    correctCount: 0,
    totalCount: 0,
    results: [],
    ...over,
  };
}

function run(exam: ExamId, results: (PracticeSessionResult | null)[]): MockRun {
  return {
    id: "mock-1",
    exam,
    variant: "mini",
    title: "Test Mock",
    sections: results.map((r, i) => ({
      skill: (r?.skill ?? "reading") as SkillId,
      setId: `set-${i}`,
      setTitle: `Set ${i}`,
      label: "Section",
    })),
    currentIndex: results.length,
    results,
    startedAt: new Date().toISOString(),
  };
}

// ==================================================================

describe("pickMockSections", () => {
  it("mini は各技能 1 セクション、R→L→S の順に並ぶ", () => {
    const sections = pickMockSections("toefl", "mini", pools("toefl"));
    expect(sections.map((s) => s.skill)).toEqual(["reading", "listening", "speaking"]);
    expect(sections).toHaveLength(3);
    // 1 セクションのみの技能は番号なしラベル
    expect(sections[0].label).toBe("Reading Section");
  });

  it("full は R/L を各 2、S を 1 セクション取り、複数はラベルに番号が付く", () => {
    const sections = pickMockSections("toefl", "full", pools("toefl"));
    expect(sections.map((s) => s.skill)).toEqual([
      "reading",
      "reading",
      "listening",
      "listening",
      "speaking",
    ]);
    expect(sections[0].label).toBe("Reading Section 1");
    expect(sections[1].label).toBe("Reading Section 2");
  });

  it("別 exam のセットは混ざらない", () => {
    const sections = pickMockSections("toefl", "mini", pools("toefl"));
    expect(sections.every((s) => s.setId.startsWith("r") || s.setId.startsWith("l") || s.setId.startsWith("s"))).toBe(true);
    // ielts のプールが空なら 0 件
    expect(
      pickMockSections("ielts", "mini", { reading: [], listening: [], speaking: [] })
    ).toHaveLength(0);
  });
});

describe("sectionScore", () => {
  it("TOEFL の R/L は正答率を 30 点満点に換算する", () => {
    const s = sectionScore("toefl", result("reading", "toefl", { correctCount: 8, totalCount: 10 }));
    expect(s.maxScore).toBe(30);
    expect(s.score).toBe(24); // round(0.8 * 30)
  });

  it("IELTS の R/L は Band(9 満点) を返す", () => {
    const s = sectionScore("ielts", result("listening", "ielts", { correctCount: 10, totalCount: 10 }));
    expect(s.maxScore).toBe(9);
    expect(s.score).toBeGreaterThan(0);
    expect(s.score).toBeLessThanOrEqual(9);
  });

  it("Speaking は AI の bandEstimate 平均から算出する", () => {
    const toefl = sectionScore(
      "toefl",
      result("speaking", "toefl", {
        speakingFeedback: [
          { taskId: "t1", transcript: "", summary: "", strengths: [], improvements: [], bandEstimate: 4 },
          { taskId: "t2", transcript: "", summary: "", strengths: [], improvements: [], bandEstimate: 5 },
        ],
      })
    );
    // 平均 Band 4.5 → 30 点換算 round(4.5/6*30)=23
    expect(toefl.maxScore).toBe(30);
    expect(toefl.score).toBe(23);
  });
});

describe("computeMockReport", () => {
  it("TOEFL は各セクション 30 点の合計を総合スコアにする", () => {
    const r = run("toefl", [
      result("reading", "toefl", { correctCount: 9, totalCount: 10 }),
      result("listening", "toefl", { correctCount: 6, totalCount: 10 }),
      result("speaking", "toefl", {
        speakingFeedback: [
          { taskId: "t1", transcript: "", summary: "", strengths: [], improvements: [], bandEstimate: 4 },
        ],
      }),
    ]);
    const report = computeMockReport(r);
    expect(report.overallMax).toBe(90);
    expect(report.sections).toHaveLength(3);
    // 総合スコア = 各セクションの合計
    const sum = report.sections.reduce((a, s) => a + s.score, 0);
    expect(report.overallScore).toBe(sum);
    // R+L の正答合計
    expect(report.correctCount).toBe(15);
    expect(report.totalCount).toBe(20);
    expect(report.cefr).toBeTruthy();
    expect(report.strengths.length).toBeGreaterThan(0);
    expect(report.weaknesses.length).toBeGreaterThan(0);
    expect(report.nextSteps.length).toBeGreaterThan(0);
  });

  it("IELTS はセクション Band の平均を 0.5 刻みで丸める", () => {
    const r = run("ielts", [
      result("reading", "ielts", { correctCount: 40, totalCount: 40 }), // Band 9.0
      result("listening", "ielts", { correctCount: 40, totalCount: 40 }), // Band 9.0
    ]);
    const report = computeMockReport(r);
    expect(report.overallMax).toBe(9);
    // 全問正解 → 平均 9.0
    expect(report.overallScore % 0.5).toBe(0);
    expect(report.overallScore).toBeGreaterThanOrEqual(8);
  });

  it("未完了(null)セクションは集計から除外される", () => {
    const r = run("toefl", [
      result("reading", "toefl", { correctCount: 5, totalCount: 10 }),
      null,
    ]);
    const report = computeMockReport(r);
    expect(report.sections).toHaveLength(1);
    expect(report.overallMax).toBe(30);
  });
});
