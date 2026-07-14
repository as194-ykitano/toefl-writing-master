"use client";

// 学習時間
// 選択中の試験の週次学習時間を、積み上げ棒グラフ＋内訳テーブルで可視化する。
// 「技能別（Reading/Listening/Speaking/Writing）」と「問題タイプ別」を切り替えられる。
// 週は前後に移動でき、その週の各日・各カテゴリの学習時間を集計する。

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { StackedBarChart } from "@/components/prep/charts";
import Reveal from "@/components/prep/Reveal";
import CountUp from "@/components/prep/CountUp";
import { useExam } from "@/contexts/ExamContext";
import { formatDuration, practiceTypeEnglishLabel, usePrepActivity } from "@/lib/prep/use-activity";
import { EXAM_LABELS, EXAM_SKILLS, ExamId, SkillId } from "@/lib/prep/types";

type Mode = "skill" | "type";

const SKILL_LABEL: Record<SkillId, string> = {
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
};
const SKILL_COLOR: Record<SkillId, string> = {
  reading: "#3b82f6",
  listening: "#8b5cf6",
  speaking: "#f97316",
  writing: "#10b981",
};

// 問題タイプ別の配色パレット（順に割り当て）
const TYPE_PALETTE = [
  "#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#ec4899", "#06b6d4",
  "#eab308", "#6366f1", "#ef4444", "#14b8a6", "#a855f7", "#f59e0b",
];

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

/** 指定日を含む週の月曜 0:00 を返す */
function weekStart(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // 月=0 ... 日=6
  d.setDate(d.getDate() - dow);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtMonthDay(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface Category {
  key: string;
  label: string;
  color: string;
  /** 7 日分の秒数 */
  perDay: number[];
  total: number;
}

export default function StudyTimePage() {
  const { exam } = useExam();
  const [guideExam, setGuideExam] = useState<ExamId | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("guideExam");
    if (value === "toefl" || value === "ielts" || value === "toeic") setGuideExam(value);
  }, []);
  const activeExam: ExamId = guideExam ?? (exam === "advanced" ? "toefl" : exam);
  const { items, loading } = usePrepActivity(activeExam);

  const [mode, setMode] = useState<Mode>("skill");
  const [weekOffset, setWeekOffset] = useState(0); // 0=今週, -1=先週 ...

  const start = useMemo(() => weekStart(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const end = days[6];

  // その週の項目だけに絞る
  const weekItems = useMemo(() => {
    const s = start.getTime();
    const e = addDays(start, 7).getTime();
    return items.filter((it) => {
      const t = new Date(it.finishedAt).getTime();
      return t >= s && t < e;
    });
  }, [items, start]);

  // カテゴリ別 × 日別に秒数を集計
  const categories = useMemo<Category[]>(() => {
    const dayIndex = (iso: string) => {
      const d = new Date(iso);
      d.setHours(0, 0, 0, 0);
      return Math.floor((d.getTime() - start.getTime()) / (24 * 3600 * 1000));
    };

    const map = new Map<string, { label: string; perDay: number[] }>();
    const ensure = (key: string, label: string) => {
      let c = map.get(key);
      if (!c) {
        c = { label, perDay: [0, 0, 0, 0, 0, 0, 0] };
        map.set(key, c);
      }
      return c;
    };

    for (const it of weekItems) {
      const di = dayIndex(it.finishedAt);
      if (di < 0 || di > 6) continue;
      if (mode === "skill") {
        ensure(it.skill, SKILL_LABEL[it.skill]).perDay[di] += it.durationSec;
      } else {
        const key = `${it.skill}:${it.practiceType}`;
        const skillLabel = SKILL_LABEL[it.skill];
        const typeLabel = practiceTypeEnglishLabel(activeExam, it.skill, it.practiceType);
        const label = typeLabel.toLowerCase().startsWith(skillLabel.toLowerCase())
          ? typeLabel
          : `${skillLabel} ${typeLabel}`;
        ensure(key, label).perDay[di] += it.durationSec;
      }
    }

    // 表示順を安定させる
    let ordered: { key: string; label: string; perDay: number[] }[];
    if (mode === "skill") {
      ordered = EXAM_SKILLS[activeExam]
        .filter((s) => map.has(s))
        .map((s) => ({ key: s, label: SKILL_LABEL[s], perDay: map.get(s)!.perDay }));
    } else {
      ordered = Array.from(map.entries())
        .map(([key, v]) => ({ key, label: v.label, perDay: v.perDay }))
        .sort(
          (a, b) =>
            b.perDay.reduce((x, y) => x + y, 0) - a.perDay.reduce((x, y) => x + y, 0)
        );
    }

    return ordered.map((c, i) => ({
      key: c.key,
      label: c.label,
      color: mode === "skill" ? SKILL_COLOR[c.key as SkillId] : TYPE_PALETTE[i % TYPE_PALETTE.length],
      perDay: c.perDay,
      total: c.perDay.reduce((a, b) => a + b, 0),
    }));
  }, [weekItems, mode, activeExam, start]);

  const dailyTotals = useMemo(
    () => days.map((_, di) => categories.reduce((sum, c) => sum + c.perDay[di], 0)),
    [days, categories]
  );
  const weekTotal = dailyTotals.reduce((a, b) => a + b, 0);
  const maxDaily = Math.max(1, ...dailyTotals);

  const bars = days.map((d, di) => ({
    label: fmtMonthDay(d),
    weekday: WEEKDAYS[di],
    segments: categories.map((c) => ({ key: c.key, color: c.color, value: c.perDay[di] })),
  }));

  const tickFormat = (sec: number) => {
    const h = sec / 3600;
    if (maxDaily >= 3600) return `${Math.round(h)}h`;
    return `${Math.round(sec / 60)}m`;
  };

  return (
    <PrepShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-end justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-700">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">学習時間</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {EXAM_LABELS[activeExam]} の週ごとの学習時間の内訳
            </p>
          </div>
          {/* 技能別 / 問題タイプ別 切替 */}
          <div data-guide-target="study-mode" className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 p-0.5 dark:bg-gray-800">
            {(["skill", "type"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  mode === m
                    ? "bg-white text-eg-deep shadow-sm dark:bg-gray-700 dark:text-eg"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {m === "skill" ? "技能別" : "問題タイプ別"}
              </button>
            ))}
          </div>
        </div>

        {/* チャートカード */}
        <Reveal data-guide-target="study-chart" className="glass-card rounded-2xl p-5 sm:p-6">
          {/* 週ナビゲーション + 合計 */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                aria-label="前の週"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums min-w-[8.5rem] text-center">
                {fmtMonthDay(start)} 〜 {fmtMonthDay(end)}
              </div>
              <button
                onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
                disabled={weekOffset >= 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                aria-label="次の週"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="ml-1 text-xs font-medium text-eg-deep hover:text-eg-dark"
                >
                  今週へ
                </button>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end text-gray-400 dark:text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px]">合計</span>
              </div>
              <CountUp
                value={weekTotal}
                format={(n) => (n >= 1 ? formatDuration(Math.round(n)) : "0分")}
                className="text-lg font-bold text-gray-900 dark:text-gray-50 tabular-nums"
              />
            </div>
          </div>

          {/* 棒グラフ */}
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
              読み込み中...
            </div>
          ) : weekTotal === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
              この週の学習記録はありません
            </div>
          ) : (
            <StackedBarChart
              key={`${mode}-${weekOffset}`}
              bars={bars}
              max={maxDaily}
              tickFormat={tickFormat}
              height={220}
            />
          )}

          {/* 凡例 */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              {categories.map((c) => (
                <div key={c.key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </Reveal>

        {/* 内訳テーブル */}
        {categories.length > 0 && (
          <Reveal data-guide-target="study-table" delay={80} className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-white dark:bg-gray-900/60">
                      内容
                    </th>
                    <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">合計</th>
                    {days.map((d, di) => (
                      <th key={di} className="text-right px-3 py-3 font-semibold whitespace-nowrap">
                        {fmtMonthDay(d)}
                        <span className="text-gray-300 dark:text-gray-600">({WEEKDAYS[di]})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/70">
                  {categories.map((c) => (
                    <tr key={c.key} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900/60">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="text-gray-800 dark:text-gray-200 whitespace-nowrap">
                            {c.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100 tabular-nums whitespace-nowrap">
                        {c.total > 0 ? formatDuration(c.total) : "—"}
                      </td>
                      {c.perDay.map((sec, di) => (
                        <td
                          key={di}
                          className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-gray-500 dark:text-gray-400"
                        >
                          {sec > 0 ? formatDuration(sec) : <span className="text-gray-200 dark:text-gray-700">–</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-100 dark:border-gray-800 font-semibold">
                    <td className="px-4 py-2.5 sticky left-0 bg-white dark:bg-gray-900/60 text-gray-700 dark:text-gray-200">
                      合計
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-900 dark:text-gray-100 tabular-nums whitespace-nowrap">
                      {weekTotal > 0 ? formatDuration(weekTotal) : "—"}
                    </td>
                    {dailyTotals.map((sec, di) => (
                      <td
                        key={di}
                        className="px-3 py-2.5 text-right text-gray-700 dark:text-gray-300 tabular-nums whitespace-nowrap"
                      >
                        {sec > 0 ? formatDuration(sec) : "–"}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Reveal>
        )}
      </div>
    </PrepShell>
  );
}
