// 模試（Mock Test）のプラン生成とスコア集計ロジック
//
// このファイルは React / Next / localStorage に依存しない純粋ロジックのみを持つ。
// 「プールから出題セクションを選ぶ」「各セクション結果を採点する」「レポートに集計する」
// の 3 つを提供し、UI（/mock 配下）とストア（mock-store.ts）はここを経由する。
// 純粋関数のためユニットテスト（tests/mock-test.test.ts）で検証している。

import {
  ExamId,
  ListeningSet,
  MockReport,
  PracticeSessionResult,
  ReadingSet,
  SectionScore,
  SkillId,
  SKILL_LABELS,
  SpeakingSet,
} from "./types";
import { estimateIeltsBand, estimateToeflSectionScore, toCefr } from "./session-store";

export type MockVariant = "mini" | "full";

/** 模試 1 セクションが参照する問題セット。実データは data-source から再取得する */
export interface MockSectionRef {
  skill: SkillId;
  setId: string;
  setTitle: string;
  /** 画面見出し（例: "Reading Section"） */
  label: string;
}

/** 進行中／完了した模試 1 回分の状態 */
export interface MockRun {
  id: string;
  exam: ExamId;
  variant: MockVariant;
  title: string;
  sections: MockSectionRef[];
  /** 現在挑戦中のセクション index（0 始まり）。全完了で sections.length になる */
  currentIndex: number;
  /** セクションごとの結果（未完了は null） */
  results: (PracticeSessionResult | null)[];
  startedAt: string;
}

/** 出題プール（各技能の利用可能セット）。UI 側で data-source から集めて渡す */
export interface MockPools {
  reading: ReadingSet[];
  listening: ListeningSet[];
  speaking: SpeakingSet[];
}

/** v1 模試の対象技能。Writing は AI 添削フローが独立しているため個別演習に委ねる */
const MOCK_SKILLS: SkillId[] = ["reading", "listening", "speaking"];

/** variant ごとの技能別セクション数 */
function sectionCount(variant: MockVariant, skill: SkillId): number {
  if (variant === "mini") return 1;
  // full: 読解・聴解は 2 セクション、スピーキングは 1 セクション
  return skill === "speaking" ? 1 : 2;
}

export function mockTitle(exam: ExamId, variant: MockVariant): string {
  const examLabel = exam === "toefl" ? "TOEFL iBT" : "IELTS Academic";
  const variantLabel = variant === "mini" ? "Mini Mock Test" : "Full Mock Test";
  return `${examLabel} ${variantLabel}`;
}

const SKILL_SECTION_LABEL: Record<SkillId, string> = {
  reading: "Reading Section",
  listening: "Listening Section",
  speaking: "Speaking Section",
  writing: "Writing Section",
};

/**
 * プールから模試セクションを選ぶ（純粋関数）。
 * 各技能の先頭から必要数を取り、足りない技能はスキップする。
 */
export function pickMockSections(
  exam: ExamId,
  variant: MockVariant,
  pools: MockPools
): MockSectionRef[] {
  const sections: MockSectionRef[] = [];
  for (const skill of MOCK_SKILLS) {
    const pool =
      skill === "reading" ? pools.reading : skill === "listening" ? pools.listening : pools.speaking;
    const examPool = pool.filter((s) => s.exam === exam);
    const want = sectionCount(variant, skill);
    let placed = 0;
    for (const set of examPool) {
      if (placed >= want) break;
      sections.push({
        skill,
        setId: set.id,
        setTitle: set.title,
        label:
          want > 1 ? `${SKILL_SECTION_LABEL[skill]} ${placed + 1}` : SKILL_SECTION_LABEL[skill],
      });
      placed += 1;
    }
  }
  return sections;
}

// ---- セクション採点 ----

/** スピーキング結果の推定 Band（0〜maxBand）。bandEstimate 優先、無ければ itemScore を換算 */
function speakingBand(result: PracticeSessionResult, maxBand: number): number {
  const feedback = (result.speakingFeedback ?? []).filter((f) => !f.error);
  if (feedback.length === 0) return 0;
  const bands = feedback.map((f) => f.bandEstimate).filter((b): b is number => typeof b === "number");
  if (bands.length > 0) {
    const avg = bands.reduce((a, b) => a + b, 0) / bands.length;
    return Math.min(maxBand, Math.round(avg * 2) / 2);
  }
  // Listen and Repeat 等: itemScore(0〜5) の平均を maxBand へ線形換算
  const items = feedback.map((f) => f.itemScore).filter((s): s is number => typeof s === "number");
  if (items.length === 0) return 0;
  const avgItem = items.reduce((a, b) => a + b, 0) / items.length;
  return Math.round((avgItem / 5) * maxBand * 2) / 2;
}

/** 1 セクションのスコア（exam のスケールに合わせて返す） */
export function sectionScore(exam: ExamId, result: PracticeSessionResult): SectionScore {
  const maxScore = exam === "toefl" ? 30 : 9;
  let score: number;
  if (result.skill === "speaking") {
    const band = speakingBand(result, exam === "toefl" ? 6 : 9);
    score = exam === "toefl" ? Math.round((band / 6) * 30) : band;
  } else {
    // reading / listening: 正答数ベースの推定
    score =
      exam === "toefl"
        ? estimateToeflSectionScore(result.correctCount, result.totalCount)
        : estimateIeltsBand(result.correctCount, result.totalCount);
  }
  return {
    skill: result.skill,
    score,
    maxScore,
    label: SKILL_LABELS[result.skill],
  };
}

// ---- レポート集計 ----

/** IELTS 総合バンド: セクション平均を 0.5 刻みに丸める */
function ieltsOverall(sections: SectionScore[]): number {
  if (sections.length === 0) return 0;
  const avg = sections.reduce((a, s) => a + s.score, 0) / sections.length;
  return Math.round(avg * 2) / 2;
}

function ratioOf(section: SectionScore): number {
  return section.maxScore > 0 ? section.score / section.maxScore : 0;
}

const NEXT_STEP_BY_SKILL: Record<SkillId, string> = {
  reading: "Reading: 推論・言い換え問題を中心に 1 日 1 セット、根拠の場所を必ず特定する",
  listening: "Listening: 会話文の「言い換え表現」と話者の意図に注目した精聴を毎日実施",
  speaking: "Speaking: 「結論→理由→具体例」の型で時間内にまとめる練習を録音して見直す",
  writing: "Writing: 構成（導入・本論・結論）と根拠の具体化を型として固定する",
};

/**
 * 完了した模試を集計してレポートを作る（純粋関数）。
 * results は各セクションの完了結果（null は未完了として除外）。
 */
export function computeMockReport(run: MockRun): MockReport {
  const completed = run.results.filter((r): r is PracticeSessionResult => r !== null);
  const sections = completed.map((r) => sectionScore(run.exam, r));

  const overallMax = run.exam === "toefl" ? 30 * sections.length : 9;
  const overallScore =
    run.exam === "toefl"
      ? sections.reduce((a, s) => a + s.score, 0)
      : ieltsOverall(sections);
  const overallRatio = overallMax > 0 ? overallScore / overallMax : 0;

  // 採点対象（reading/listening）の正誤合計
  const graded = completed.filter((r) => r.skill !== "speaking");
  const correctCount = graded.reduce((a, r) => a + r.correctCount, 0);
  const totalCount = graded.reduce((a, r) => a + r.totalCount, 0);
  const durationSec = completed.reduce((a, r) => a + r.durationSec, 0);

  const sorted = [...sections].sort((a, b) => ratioOf(b) - ratioOf(a));
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const nextSteps: string[] = [];
  if (strongest) {
    strengths.push(
      `${SKILL_LABELS[strongest.skill]} が最も安定しています（達成度 ${Math.round(
        ratioOf(strongest) * 100
      )}%）`
    );
  }
  if (weakest && weakest !== strongest) {
    weaknesses.push(
      `${SKILL_LABELS[weakest.skill]} が最大のボトルネックです（達成度 ${Math.round(
        ratioOf(weakest) * 100
      )}%）`
    );
    nextSteps.push(NEXT_STEP_BY_SKILL[weakest.skill]);
  }
  // 弱点上位 2 技能まで学習提案を出す
  for (const s of sorted.slice(1)) {
    if (nextSteps.length >= 2) break;
    const step = NEXT_STEP_BY_SKILL[s.skill];
    if (!nextSteps.includes(step)) nextSteps.push(step);
  }

  const scoreText =
    run.exam === "toefl"
      ? `${overallScore} / ${overallMax}`
      : `Band ${overallScore.toFixed(1)}`;
  const tutorComment = weakest
    ? `今回の総合スコアは ${scoreText}（${toCefr(overallRatio)}）です。最優先の強化ポイントは ${SKILL_LABELS[weakest.skill]} で、ここを底上げすると総合スコアの伸びが最も期待できます。得意な ${SKILL_LABELS[strongest.skill]} は維持しつつ、弱点技能に学習時間を寄せましょう。`
    : `今回の総合スコアは ${scoreText}（${toCefr(overallRatio)}）です。継続して各技能をバランスよく伸ばしましょう。`;

  return {
    id: run.id,
    exam: run.exam,
    title: run.title,
    finishedAt: new Date().toISOString(),
    overallScore,
    overallMax,
    cefr: toCefr(overallRatio),
    sections,
    correctCount,
    totalCount,
    durationMin: Math.max(1, Math.round(durationSec / 60)),
    strengths,
    weaknesses,
    nextSteps,
    tutorComment,
  };
}

export function newMockRunId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
