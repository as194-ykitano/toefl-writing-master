import { PRACTICE_TYPES } from "./prep/question-types";
import type {
  ExamId,
  PracticeSessionResult,
  SkillId,
  WritingResult,
} from "./prep/types";

export type PracticeCatalogItem = {
  id: string;
  exam: ExamId;
  skill: SkillId;
  practiceType?: string;
  title: string;
};

export type AdminLearningActivity = {
  id: string;
  kind: "session" | "writing";
  exam: ExamId;
  skill: SkillId;
  practiceType: string;
  practiceTypeLabel: string;
  title: string;
  finishedAt: string;
  durationSec: number;
  correctCount: number | null;
  totalCount: number | null;
  scoreValue: number | null;
  scoreMax: number;
  wordCount: number | null;
  wpm: number | null;
  feedbackSummary: string | null;
  strengths: string[];
  improvements: string[];
};

export type AdminContentProgress = {
  exam: ExamId;
  skill: SkillId;
  practiceType: string;
  label: string;
  completed: number;
  total: number;
  attempts: number;
  percent: number;
};

export type AdminLearningAnalytics = {
  summary: {
    totalStudyMinutes: number;
    totalActivities: number;
    questionsAnswered: number;
    submissions: number;
    averageAccuracy: number | null;
    activeDays: number;
    lastActivityAt: string | null;
  };
  byExamSkill: Array<{
    exam: ExamId;
    skill: SkillId;
    attempts: number;
    studyMinutes: number;
    averageScore: number | null;
    scoreMax: number;
  }>;
  daily: Array<{ date: string; minutes: number; activities: number; questions: number }>;
  activities: AdminLearningActivity[];
  contentProgress: AdminContentProgress[];
};

const EXAMS: ExamId[] = ["toefl", "ielts", "toeic"];
const SKILLS: SkillId[] = ["reading", "listening", "speaking", "writing"];

function isExam(value: unknown): value is ExamId {
  return value === "toefl" || value === "ielts" || value === "toeic";
}

function isSkill(value: unknown): value is SkillId {
  return value === "reading" || value === "listening" || value === "speaking" || value === "writing";
}

function validIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function parsePracticeSessions(value: unknown): PracticeSessionResult[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PracticeSessionResult => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.id === "string" && isExam(row.exam) && isSkill(row.skill) && validIso(row.finishedAt);
  });
}

export function parseWritingResults(value: unknown): WritingResult[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WritingResult => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.id === "string" && isExam(row.exam) && validIso(row.finishedAt) && !!row.feedback;
  });
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dayKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function labelFor(exam: ExamId, skill: SkillId, practiceType: string): string {
  return PRACTICE_TYPES.find((type) =>
    type.exam === exam && type.skill === skill && type.id === practiceType
  )?.label ?? practiceType;
}

function speakingScore(session: PracticeSessionResult): number | null {
  return average((session.speakingFeedback ?? [])
    .map((feedback) => feedback.bandEstimate)
    .filter((value): value is number => typeof value === "number"));
}

export function buildAdminLearningAnalytics(
  sessions: PracticeSessionResult[],
  writingResults: WritingResult[],
  catalog: PracticeCatalogItem[],
  now = new Date(),
): AdminLearningAnalytics {
  const catalogById = new Map(catalog.map((item) => [`${item.exam}:${item.skill}:${item.id}`, item]));
  const activities: AdminLearningActivity[] = [];

  for (const session of sessions) {
    const catalogItem = catalogById.get(`${session.exam}:${session.skill}:${session.setId}`);
    const practiceType = session.practiceType || catalogItem?.practiceType || "other";
    let scoreValue: number | null = null;
    let scoreMax = 100;
    if ((session.skill === "reading" || session.skill === "listening") && session.totalCount > 0) {
      scoreValue = (session.correctCount / session.totalCount) * 100;
    } else if (session.skill === "speaking") {
      scoreValue = speakingScore(session);
      scoreMax = session.exam === "ielts" ? 9 : 6;
    }
    activities.push({
      id: session.id,
      kind: "session",
      exam: session.exam,
      skill: session.skill,
      practiceType,
      practiceTypeLabel: labelFor(session.exam, session.skill, practiceType),
      title: session.setTitle || catalogItem?.title || session.setId,
      finishedAt: session.finishedAt,
      durationSec: Math.max(0, Number(session.durationSec) || 0),
      correctCount: session.skill === "reading" || session.skill === "listening" ? Number(session.correctCount) || 0 : null,
      totalCount: session.skill === "reading" || session.skill === "listening" ? Number(session.totalCount) || 0 : null,
      scoreValue,
      scoreMax,
      wordCount: session.skill === "speaking"
        ? (session.speakingFeedback ?? []).reduce((sum, feedback) => sum + feedback.transcript.trim().split(/\s+/).filter(Boolean).length, 0)
        : null,
      wpm: session.skill === "speaking" ? average((session.speakingFeedback ?? []).map((feedback) => feedback.fluency?.wpm).filter((value): value is number => typeof value === "number")) : null,
      feedbackSummary: session.speakingFeedback?.map((feedback) => feedback.summary).filter(Boolean).join("\n") || null,
      strengths: session.speakingFeedback?.flatMap((feedback) => feedback.strengths ?? []) ?? [],
      improvements: session.speakingFeedback?.flatMap((feedback) => feedback.improvements ?? []) ?? [],
    });
  }

  for (const writing of writingResults) {
    const catalogItem = catalogById.get(`${writing.exam}:writing:${writing.setId}`);
    const practiceType = writing.practiceType || catalogItem?.practiceType || "other";
    activities.push({
      id: writing.id,
      kind: "writing",
      exam: writing.exam,
      skill: "writing",
      practiceType,
      practiceTypeLabel: labelFor(writing.exam, "writing", practiceType),
      title: writing.title || catalogItem?.title || writing.setId,
      finishedAt: writing.finishedAt,
      durationSec: Math.max(0, Number(writing.durationSec) || 0),
      correctCount: null,
      totalCount: null,
      scoreValue: typeof writing.feedback?.score === "number" ? writing.feedback.score : null,
      scoreMax: typeof writing.feedback?.scoreMax === "number" ? writing.feedback.scoreMax : 5,
      wordCount: Number(writing.wordCount) || 0,
      wpm: null,
      feedbackSummary: writing.feedback?.overall || null,
      strengths: writing.feedback?.strengths ?? [],
      improvements: writing.feedback?.improvements ?? [],
    });
  }
  activities.sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt));

  const totalsByGroup = new Map<string, number>();
  for (const item of catalog) {
    const type = item.practiceType || "other";
    const key = `${item.exam}:${item.skill}:${type}`;
    totalsByGroup.set(key, (totalsByGroup.get(key) ?? 0) + 1);
  }
  const completedByGroup = new Map<string, Set<string>>();
  const attemptsByGroup = new Map<string, number>();
  for (const session of sessions) {
    const item = catalogById.get(`${session.exam}:${session.skill}:${session.setId}`);
    const type = session.practiceType || item?.practiceType || "other";
    const key = `${session.exam}:${session.skill}:${type}`;
    (completedByGroup.get(key) ?? completedByGroup.set(key, new Set()).get(key)!).add(session.setId);
    attemptsByGroup.set(key, (attemptsByGroup.get(key) ?? 0) + 1);
  }
  for (const writing of writingResults) {
    const item = catalogById.get(`${writing.exam}:writing:${writing.setId}`);
    const type = writing.practiceType || item?.practiceType || "other";
    const key = `${writing.exam}:writing:${type}`;
    (completedByGroup.get(key) ?? completedByGroup.set(key, new Set()).get(key)!).add(writing.setId);
    attemptsByGroup.set(key, (attemptsByGroup.get(key) ?? 0) + 1);
  }
  const contentProgress = [...totalsByGroup.entries()].map(([key, total]) => {
    const [exam, skill, practiceType] = key.split(":") as [ExamId, SkillId, string];
    const completed = completedByGroup.get(key)?.size ?? 0;
    return {
      exam,
      skill,
      practiceType,
      label: labelFor(exam, skill, practiceType),
      completed,
      total,
      attempts: attemptsByGroup.get(key) ?? 0,
      percent: total ? Math.round((completed / total) * 100) : 0,
    };
  }).sort((a, b) => a.exam.localeCompare(b.exam) || a.skill.localeCompare(b.skill) || b.percent - a.percent);

  const byExamSkill = EXAMS.flatMap((exam) => SKILLS.map((skill) => {
    const rows = activities.filter((item) => item.exam === exam && item.skill === skill);
    const scores = rows.map((item) => item.scoreValue).filter((value): value is number => value !== null);
    return {
      exam,
      skill,
      attempts: rows.length,
      studyMinutes: rows.reduce((sum, item) => sum + Math.round(item.durationSec / 60), 0),
      averageScore: average(scores),
      scoreMax: rows.find((item) => item.scoreValue !== null)?.scoreMax ?? (skill === "speaking" ? (exam === "ielts" ? 9 : 6) : skill === "writing" ? (exam === "ielts" ? 9 : 5) : 100),
    };
  })).filter((row) => row.attempts > 0);

  const today = dayKey(now.toISOString());
  const start = new Date(`${today}T00:00:00+09:00`);
  start.setUTCDate(start.getUTCDate() - 364);
  const dailyMap = new Map<string, { minutes: number; activities: number; questions: number }>();
  for (const item of activities) {
    if (Date.parse(item.finishedAt) < start.getTime()) continue;
    const key = dayKey(item.finishedAt);
    const day = dailyMap.get(key) ?? { minutes: 0, activities: 0, questions: 0 };
    day.minutes += Math.round(item.durationSec / 60);
    day.activities += 1;
    day.questions += item.totalCount ?? 0;
    dailyMap.set(key, day);
  }
  const daily = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const key = dayKey(date.toISOString());
    return { date: key, ...(dailyMap.get(key) ?? { minutes: 0, activities: 0, questions: 0 }) };
  });

  const accuracyRows = activities.filter((item) =>
    (item.skill === "reading" || item.skill === "listening") && item.scoreValue !== null
  );
  return {
    summary: {
      totalStudyMinutes: activities.reduce((sum, item) => sum + Math.round(item.durationSec / 60), 0),
      totalActivities: activities.length,
      questionsAnswered: activities.reduce((sum, item) => sum + (item.totalCount ?? 0), 0),
      submissions: activities.filter((item) => item.skill === "speaking" || item.skill === "writing").length,
      averageAccuracy: average(accuracyRows.map((item) => item.scoreValue!)),
      activeDays: new Set(activities.map((item) => dayKey(item.finishedAt))).size,
      lastActivityAt: activities[0]?.finishedAt ?? null,
    },
    byExamSkill,
    daily,
    activities: activities.slice(0, 100),
    contentProgress,
  };
}
