"use client";

// 演習セッション（session-store）と Writing 添削結果（writing-store）を、
// ダッシュボード系ページ（データ推移 / 学習履歴 / 学習時間）で共通に使える
// 「アクティビティ項目」の統一リストへ正規化するフック。
//
// - practiceType が無い旧セッションは、問題セット定義から補完する
// - スコアは技能ごとに尺度が異なるため scoreValue / scoreMax を持たせる
//     Reading / Listening … 正答率（%、max=100）
//     Speaking           … 推定バンド（IELTS=9 / TOEFL=6）
//     Writing            … 添削スコア（結果ごとの feedback.scoreMax）

import { useEffect, useMemo, useState } from "react";
import { loadSessions } from "./session-store";
import { loadWritingResults } from "./writing-store";
import { getListeningSets, getReadingSets, getSpeakingSets } from "./data-source";
import { PRACTICE_TYPES } from "./question-types";
import { ExamId, PracticeSessionResult, SkillId, WritingResult } from "./types";
import { cleanReadingTitle } from "./display-title";

export interface ActivityItem {
  id: string;
  kind: "session" | "writing";
  exam: ExamId;
  skill: SkillId;
  /** 正規化済みの practiceType slug（不明なら "その他"） */
  practiceType: string;
  title: string;
  finishedAt: string; // ISO
  durationSec: number;
  correctCount: number | null;
  totalCount: number | null;
  /** R/L=正答率%、Speaking=バンド、Writing=スコア。データ無しは null */
  scoreValue: number | null;
  scoreMax: number;
  href: string;
  wpm?: number;
  wordCount?: number;
}

function speakingScoreMax(exam: ExamId): number {
  return exam === "ielts" ? 9 : 6;
}

/** practiceType slug → 表示ラベル（日本語）。見つからなければ slug をそのまま返す */
export function practiceTypeLabel(exam: ExamId, skill: SkillId, slug: string): string {
  if (slug === "その他") return "その他";
  const t = PRACTICE_TYPES.find((p) => p.exam === exam && p.skill === skill && p.id === slug);
  return t ? t.labelJa || t.label : slug;
}

/** Practice一覧と同じ英語表記。学習時間などの短い分類名に使用する。 */
export function practiceTypeEnglishLabel(exam: ExamId, skill: SkillId, slug: string): string {
  if (slug === "その他") return "Other";
  const type = PRACTICE_TYPES.find((item) =>
    item.exam === exam && item.skill === skill && item.id === slug
  );
  return type?.label ?? slug;
}

export function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sessionToItem(s: PracticeSessionResult): ActivityItem {
  const base = {
    id: s.id,
    kind: "session" as const,
    exam: s.exam,
    skill: s.skill,
    practiceType: s.practiceType || "その他",
    title: s.skill === "reading" ? cleanReadingTitle(s.setTitle) : s.setTitle,
    finishedAt: s.finishedAt,
    durationSec: s.durationSec,
    href: `/results/${s.id}`,
  };
  if ((s.skill === "reading" || s.skill === "listening") && s.totalCount > 0) {
    return {
      ...base,
      correctCount: s.correctCount,
      totalCount: s.totalCount,
      scoreValue: (s.correctCount / s.totalCount) * 100,
      scoreMax: 100,
    };
  }
  if (s.skill === "speaking") {
    const bands = (s.speakingFeedback ?? [])
      .map((f) => f.bandEstimate)
      .filter((b): b is number => typeof b === "number");
    return {
      ...base,
      correctCount: null,
      totalCount: null,
      scoreValue: avg(bands),
      scoreMax: speakingScoreMax(s.exam),
      wpm: avg((s.speakingFeedback ?? []).map((f) => f.fluency?.wpm).filter((v): v is number => typeof v === "number")) ?? undefined,
      wordCount: (s.speakingFeedback ?? []).reduce((sum, f) => sum + f.transcript.trim().split(/\s+/).filter(Boolean).length, 0),
    };
  }
  return { ...base, correctCount: null, totalCount: null, scoreValue: null, scoreMax: 100 };
}

function writingToItem(w: WritingResult): ActivityItem {
  return {
    id: w.id,
    kind: "writing",
    exam: w.exam,
    skill: "writing",
    practiceType: w.practiceType || "その他",
    title: w.title,
    finishedAt: w.finishedAt,
    durationSec: w.durationSec,
    correctCount: null,
    totalCount: null,
    scoreValue: w.feedback.score,
    scoreMax: w.feedback.scoreMax,
    href: `/writing-result/${w.id}`,
    wordCount: w.content.trim().split(/\s+/).filter(Boolean).length,
  };
}

/** スコアを表示文字列にする */
export function formatActivityScore(item: ActivityItem): string {
  if (item.scoreValue === null) {
    return item.kind === "session" && item.skill === "speaking" ? "提出済み" : "—";
  }
  if (item.skill === "reading" || item.skill === "listening") {
    return `${(Math.round(item.scoreValue * 10) / 10).toFixed(1)}%`;
  }
  // Speaking / Writing はバンド・スコア（scoreMax 併記）
  const decimals = item.scoreMax === 9 ? 1 : item.scoreMax === 6 ? 1 : 1;
  return `${item.scoreValue.toFixed(decimals)} / ${item.scoreMax}`;
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return s > 0 ? `${m}分${s}秒` : `${m}分`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm > 0 ? `${h}時間${mm}分` : `${h}時間`;
}

interface UseActivityResult {
  items: ActivityItem[];
  loading: boolean;
}

/** 指定した試験の演習・添削履歴を、正規化済みアクティビティ項目として取得する */
export function usePrepActivity(exam: ExamId): UseActivityResult {
  const [sessions, setSessions] = useState<PracticeSessionResult[]>([]);
  const [writingResults, setWritingResults] = useState<WritingResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setWritingResults(loadWritingResults());
  }, []);

  // セッションを読み込み、practiceType が欠けている旧セッションはセット定義から補完
  useEffect(() => {
    setLoading(true);
    const raw = loadSessions();
    setSessions(raw);
    let cancelled = false;
    (async () => {
      const [rd, ls, sp] = await Promise.all([
        getReadingSets(exam),
        getListeningSets(exam),
        getSpeakingSets(exam),
      ]);
      const map = new Map<string, string | undefined>();
      for (const s of [...rd, ...ls, ...sp]) map.set(s.id, s.practiceType);
      if (cancelled) return;
      setSessions((prev) =>
        prev.map((se) =>
          se.practiceType || !map.has(se.setId) ? se : { ...se, practiceType: map.get(se.setId) }
        )
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [exam]);

  const items = useMemo(() => {
    const list: ActivityItem[] = [
      ...sessions.filter((s) => s.exam === exam).map(sessionToItem),
      ...writingResults.filter((w) => w.exam === exam).map(writingToItem),
    ];
    return list.sort(
      (a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
    );
  }, [sessions, writingResults, exam]);

  return { items, loading };
}
