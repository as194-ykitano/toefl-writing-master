// 学習ダッシュボードの集計ロジック
// localStorage の演習セッション（session-store）と Writing 添削結果（writing-store）を、
// 期間・技能・問題タイプで集計する。実データが無い項目は 0 / null を返し、
// UI 側で「データなし」を表示する。
//
// スコアの尺度は技能ごとに異なるため、各集計に scoreMax を持たせる:
//   Reading / Listening … 正答率（%、max=100）
//   Speaking           … 推定バンド（IELTS=9 / TOEFL=6）
//   Writing            … 添削スコア（結果ごとの feedback.scoreMax）

import { ExamId, PracticeSessionResult, SkillId, WritingResult } from "./types";

export type PeriodKey = "7d" | "30d" | "90d" | "all";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  "7d": "7日",
  "30d": "30日",
  "90d": "90日",
  all: "全期間",
};

export function periodStart(period: PeriodKey, now = new Date()): number | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d.getTime();
}

/** YYYY-MM-DD（ローカル） */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function speakingScoreMax(exam: ExamId): number {
  return exam === "ielts" ? 9 : 6;
}

// ---- 1 問題タイプ / 1 技能の集計 ----

export interface TypeAggregate {
  /** 演習回数（セッション数 or 提出数） */
  attempts: number;
  /** 平均スコア（R/L は正答率%、S はバンド、W はスコア）。attempts=0 なら null */
  avgScore: number | null;
  scoreMax: number;
  /** 対象期間内の時系列（古い順）: 各回のスコア */
  points: { date: string; value: number }[];
}

export interface SkillAggregate {
  attempts: number;
  questions: number;
  avgScore: number | null;
  scoreMax: number;
  /** practiceType slug → 集計 */
  byType: Record<string, TypeAggregate>;
  points: { date: string; value: number }[];
}

export interface DashboardTotals {
  studyMinutes: number;
  questionsAnswered: number;
  submissions: number;
  /** 全体の平均正答率（R/L のみ、%）。データ無しは null */
  avgAccuracy: number | null;
  streakDays: number;
  grammarMistakes: number;
  /** 語彙ミスは未計測（将来対応） */
  vocabMistakes: number | null;
}

export interface DailyPoint {
  date: string;
  questions: number;
  minutes: number;
  submissions: number;
  grammarMistakes: number;
}

export interface DashboardData {
  totals: DashboardTotals;
  bySkill: Record<SkillId, SkillAggregate>;
  daily: DailyPoint[];
}

function emptySkill(scoreMax: number): SkillAggregate {
  return { attempts: 0, questions: 0, avgScore: null, scoreMax, byType: {}, points: [] };
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

interface BuildArgs {
  exam: ExamId;
  period: PeriodKey;
  sessions: PracticeSessionResult[];
  writingResults: WritingResult[];
  now?: Date;
}

export function buildDashboardData({
  exam,
  period,
  sessions,
  writingResults,
  now = new Date(),
}: BuildArgs): DashboardData {
  const start = periodStart(period, now);
  const inRange = (iso: string) => start === null || new Date(iso).getTime() >= start;

  // 古い順にソート（同日の複数提出でも新しい方が右＝末尾に来るように、時刻で並べる）
  const byTime = (a: { finishedAt: string }, b: { finishedAt: string }) =>
    new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime();
  const examSessions = sessions
    .filter((s) => s.exam === exam && inRange(s.finishedAt))
    .sort(byTime);
  const examWriting = writingResults
    .filter((w) => w.exam === exam && inRange(w.finishedAt))
    .sort(byTime);

  const bySkill: Record<SkillId, SkillAggregate> = {
    reading: emptySkill(100),
    listening: emptySkill(100),
    speaking: emptySkill(speakingScoreMax(exam)),
    writing: emptySkill(9),
  };

  // 集計用の一時バッファ
  const skillScores: Record<SkillId, number[]> = { reading: [], listening: [], speaking: [], writing: [] };
  const typeScores: Record<SkillId, Record<string, number[]>> = {
    reading: {}, listening: {}, speaking: {}, writing: {},
  };
  const dailyMap = new Map<string, DailyPoint>();
  const activeDays = new Set<string>();
  let studyMinutes = 0;
  let questionsAnswered = 0;
  let submissions = 0;
  let grammarMistakes = 0;
  const accuracyValues: number[] = [];

  const touchDay = (iso: string): DailyPoint => {
    const key = dayKey(iso);
    activeDays.add(key);
    let d = dailyMap.get(key);
    if (!d) {
      d = { date: key, questions: 0, minutes: 0, submissions: 0, grammarMistakes: 0 };
      dailyMap.set(key, d);
    }
    return d;
  };

  const pushType = (skill: SkillId, type: string | undefined, date: string, value: number) => {
    const t = type || "その他";
    (typeScores[skill][t] ??= []).push(value);
    if (!bySkill[skill].byType[t]) {
      bySkill[skill].byType[t] = { attempts: 0, avgScore: null, scoreMax: bySkill[skill].scoreMax, points: [] };
    }
    const agg = bySkill[skill].byType[t];
    agg.attempts += 1;
    agg.points.push({ date, value });
  };

  // ---- セッション（Reading / Listening / Speaking） ----
  for (const s of examSessions) {
    const day = touchDay(s.finishedAt);
    studyMinutes += Math.round(s.durationSec / 60);
    day.minutes += Math.round(s.durationSec / 60);

    if ((s.skill === "reading" || s.skill === "listening") && s.totalCount > 0) {
      const acc = (s.correctCount / s.totalCount) * 100;
      questionsAnswered += s.totalCount;
      day.questions += s.totalCount;
      skillScores[s.skill].push(acc);
      accuracyValues.push(acc);
      bySkill[s.skill].attempts += 1;
      bySkill[s.skill].questions += s.totalCount;
      bySkill[s.skill].points.push({ date: dayKey(s.finishedAt), value: acc });
      pushType(s.skill, s.practiceType, dayKey(s.finishedAt), acc);
    }

    if (s.skill === "speaking") {
      const fbs = s.speakingFeedback ?? [];
      if (fbs.length > 0) submissions += 1;
      day.submissions += fbs.length > 0 ? 1 : 0;
      const bands = fbs.map((f) => f.bandEstimate).filter((b): b is number => typeof b === "number");
      const gm = fbs.reduce((acc, f) => acc + (f.grammarCorrections?.length ?? 0), 0);
      grammarMistakes += gm;
      day.grammarMistakes += gm;
      if (bands.length > 0) {
        const b = avg(bands)!;
        skillScores.speaking.push(b);
        bySkill.speaking.attempts += 1;
        bySkill.speaking.points.push({ date: dayKey(s.finishedAt), value: b });
        pushType("speaking", s.practiceType, dayKey(s.finishedAt), b);
      }
    }
  }

  // ---- Writing 添削結果 ----
  for (const w of examWriting) {
    const day = touchDay(w.finishedAt);
    studyMinutes += Math.round(w.durationSec / 60);
    day.minutes += Math.round(w.durationSec / 60);
    submissions += 1;
    day.submissions += 1;
    const gm = w.feedback.grammarCorrections?.length ?? 0;
    grammarMistakes += gm;
    day.grammarMistakes += gm;

    const score = w.feedback.score;
    skillScores.writing.push(score);
    bySkill.writing.attempts += 1;
    bySkill.writing.points.push({ date: dayKey(w.finishedAt), value: score });
    // Writing の scoreMax は結果ごと（IELTS=9 / TOEFL=5）。タイプ集計の scoreMax を実データで上書き
    const t = w.practiceType || "その他";
    pushType("writing", w.practiceType, dayKey(w.finishedAt), score);
    bySkill.writing.byType[t].scoreMax = w.feedback.scoreMax;
  }

  // ---- 平均値の確定 ----
  (Object.keys(bySkill) as SkillId[]).forEach((skill) => {
    bySkill[skill].avgScore = avg(skillScores[skill]);
    for (const [t, agg] of Object.entries(bySkill[skill].byType)) {
      agg.avgScore = avg(typeScores[skill][t] ?? []);
      agg.points.sort((a, b) => a.date.localeCompare(b.date));
    }
    bySkill[skill].points.sort((a, b) => a.date.localeCompare(b.date));
  });

  // ---- 連続学習日数（今日 or 昨日から遡って連続する日数） ----
  const streakDays = computeStreak(activeDays, now);

  // ---- 日次系列（期間の全日を埋める） ----
  const daily = buildDailySeries(dailyMap, period, now);

  return {
    totals: {
      studyMinutes,
      questionsAnswered,
      submissions,
      avgAccuracy: avg(accuracyValues),
      streakDays,
      grammarMistakes,
      vocabMistakes: null,
    },
    bySkill,
    daily,
  };
}

function computeStreak(activeDays: Set<string>, now: Date): number {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  // 今日に活動が無ければ昨日を起点にする（当日未学習でも継続とみなす猶予）
  const cursor = new Date(today);
  if (!activeDays.has(fmt(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDays.has(fmt(cursor))) return 0;
  }
  let streak = 0;
  while (activeDays.has(fmt(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function buildDailySeries(map: Map<string, DailyPoint>, period: PeriodKey, now: Date): DailyPoint[] {
  // all の場合はデータのある日だけ（最大 90 日にクランプ）
  if (period === "all") {
    const arr = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    return arr.slice(-90);
  }
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const out: DailyPoint[] = [];
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push(map.get(key) ?? { date: key, questions: 0, minutes: 0, submissions: 0, grammarMistakes: 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}
