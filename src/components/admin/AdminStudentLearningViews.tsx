"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpen, ChevronLeft, ChevronRight, Clock, Headphones,
  ListChecks, Mic, PenLine,
} from "lucide-react";
import { MiniLineChart, StackedBarChart } from "@/components/prep/charts";
import type { AdminLearningActivity } from "@/lib/admin-learning-analytics";
import { EXAM_LABELS, EXAM_SKILLS, type ExamId, type SkillId } from "@/lib/prep/types";

const SKILLS: Record<SkillId, { label: string; color: string; icon: typeof BookOpen }> = {
  reading: { label: "Reading", color: "#3b82f6", icon: BookOpen },
  listening: { label: "Listening", color: "#8b5cf6", icon: Headphones },
  speaking: { label: "Speaking", color: "#f97316", icon: Mic },
  writing: { label: "Writing", color: "#10b981", icon: PenLine },
};
const TYPE_COLORS = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981", "#ec4899", "#06b6d4", "#eab308", "#6366f1", "#ef4444", "#14b8a6"];
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

function addDays(date: Date, amount: number) { const next = new Date(date); next.setDate(next.getDate() + amount); return next; }
function weekStart(date: Date) { const next = new Date(date); next.setHours(0, 0, 0, 0); next.setDate(next.getDate() - ((next.getDay() + 6) % 7)); return next; }
function md(date: Date) { return `${date.getMonth() + 1}/${date.getDate()}`; }
function duration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const minutes = Math.floor(seconds / 60); const rest = Math.round(seconds % 60);
  if (minutes < 60) return rest ? `${minutes}分${rest}秒` : `${minutes}分`;
  const hours = Math.floor(minutes / 60); const remain = minutes % 60;
  return remain ? `${hours}時間${remain}分` : `${hours}時間`;
}
function score(item: AdminLearningActivity) {
  if (item.scoreValue == null) return item.skill === "speaking" ? "提出済み" : "—";
  return item.skill === "reading" || item.skill === "listening" ? `${item.scoreValue.toFixed(1)}%` : `${item.scoreValue.toFixed(1)} / ${item.scoreMax}`;
}
function resultHref(uid: string, item: AdminLearningActivity) {
  return `${item.kind === "writing" ? `/writing-result/${item.id}` : `/results/${item.id}`}?adminUid=${uid}`;
}

function ExamPicker({ value, onChange, items }: { value: ExamId; onChange: (exam: ExamId) => void; items: AdminLearningActivity[] }) {
  const exams = (["toefl", "ielts", "toeic"] as ExamId[]).filter((exam) => items.some((item) => item.exam === exam));
  return <div className="flex flex-wrap gap-2">{exams.map((exam) => <button key={exam} onClick={() => onChange(exam)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${value === exam ? "bg-eg-deep text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{EXAM_LABELS[exam]}</button>)}</div>;
}

export function AdminStudyTimeView({ uid, items, initialExam }: { uid: string; items: AdminLearningActivity[]; initialExam: ExamId }) {
  void uid;
  const [exam, setExam] = useState(initialExam);
  const [mode, setMode] = useState<"skill" | "type">("skill");
  const [weekOffset, setWeekOffset] = useState(0);
  const start = useMemo(() => weekStart(addDays(new Date(), weekOffset * 7)), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);
  const end = days[6];
  const weekItems = items.filter((item) => item.exam === exam && Date.parse(item.finishedAt) >= start.getTime() && Date.parse(item.finishedAt) < addDays(start, 7).getTime());
  const categories = useMemo(() => {
    const map = new Map<string, { label: string; perDay: number[] }>();
    for (const item of weekItems) {
      const day = new Date(item.finishedAt); day.setHours(0, 0, 0, 0);
      const dayIndex = Math.round((day.getTime() - start.getTime()) / 86400000);
      if (dayIndex < 0 || dayIndex > 6) continue;
      const key = mode === "skill" ? item.skill : `${item.skill}:${item.practiceType}`;
      const label = mode === "skill" ? SKILLS[item.skill].label : `${SKILLS[item.skill].label} ${item.practiceTypeLabel}`;
      const row = map.get(key) ?? { label, perDay: [0, 0, 0, 0, 0, 0, 0] };
      row.perDay[dayIndex] += item.durationSec;
      map.set(key, row);
    }
    const rows = [...map.entries()].map(([key, value]) => ({ key, ...value }));
    if (mode === "skill") rows.sort((a, b) => EXAM_SKILLS[exam].indexOf(a.key as SkillId) - EXAM_SKILLS[exam].indexOf(b.key as SkillId));
    else rows.sort((a, b) => b.perDay.reduce((x, y) => x + y, 0) - a.perDay.reduce((x, y) => x + y, 0));
    return rows.map((row, index) => ({ ...row, color: mode === "skill" ? SKILLS[row.key as SkillId].color : TYPE_COLORS[index % TYPE_COLORS.length], total: row.perDay.reduce((sum, value) => sum + value, 0) }));
  }, [exam, mode, start, weekItems]);
  const dailyTotals = days.map((_, index) => categories.reduce((sum, category) => sum + category.perDay[index], 0));
  const total = dailyTotals.reduce((sum, value) => sum + value, 0);
  const maxDaily = Math.max(1, ...dailyTotals);
  const bars = days.map((date, index) => ({ label: md(date), weekday: WEEKDAYS[index], segments: categories.map((category) => ({ key: category.key, color: category.color, value: category.perDay[index] })) }));

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">学習時間</h2><p className="mt-1 text-sm text-slate-500">生徒側の学習時間と同じ週次内訳</p></div><div className="flex items-center gap-3"><ExamPicker value={exam} onChange={setExam} items={items}/><div className="rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">{(["skill", "type"] as const).map((value) => <button key={value} onClick={() => setMode(value)} className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${mode === value ? "bg-white text-eg-deep shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>{value === "skill" ? "技能別" : "問題タイプ別"}</button>)}</div></div></div>
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-1"><button onClick={() => setWeekOffset((value) => value - 1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><ChevronLeft className="h-4 w-4"/></button><span className="min-w-36 text-center text-sm font-semibold">{md(start)} 〜 {md(end)}</span><button disabled={weekOffset >= 0} onClick={() => setWeekOffset((value) => Math.min(0, value + 1))} className="grid h-8 w-8 place-items-center rounded-lg disabled:opacity-30 hover:bg-slate-100"><ChevronRight className="h-4 w-4"/></button>{weekOffset !== 0 && <button className="ml-1 text-xs text-eg-deep" onClick={() => setWeekOffset(0)}>今週へ</button>}</div><div className="text-right"><p className="text-[11px] text-slate-400"><Clock className="mr-1 inline h-3.5 w-3.5"/>合計</p><p className="text-lg font-bold">{total ? duration(total) : "0分"}</p></div></div>
      {total ? <StackedBarChart bars={bars} max={maxDaily} tickFormat={(seconds) => maxDaily >= 3600 ? `${Math.round(seconds / 3600)}h` : `${Math.round(seconds / 60)}m`} height={220}/> : <div className="py-16 text-center text-sm text-slate-400">この週の学習記録はありません</div>}
      {categories.length > 0 && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-4 dark:border-slate-800">{categories.map((category) => <span key={category.key} className="flex items-center gap-1.5 text-xs"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: category.color }}/>{category.label}</span>)}</div>}
    </div>
    {categories.length > 0 && <div className="glass-card overflow-hidden rounded-2xl"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-[11px] uppercase text-slate-400 dark:border-slate-800"><th className="sticky left-0 bg-white px-4 py-3 text-left dark:bg-slate-900">内容</th><th className="px-3 py-3 text-right">合計</th>{days.map((date, index) => <th key={index} className="px-3 py-3 text-right whitespace-nowrap">{md(date)}({WEEKDAYS[index]})</th>)}</tr></thead><tbody className="divide-y dark:divide-slate-800">{categories.map((category) => <tr key={category.key}><td className="sticky left-0 bg-white px-4 py-2.5 dark:bg-slate-900"><span className="flex items-center gap-2 whitespace-nowrap"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: category.color }}/>{category.label}</span></td><td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{duration(category.total)}</td>{category.perDay.map((seconds, index) => <td key={index} className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap">{seconds ? duration(seconds) : "–"}</td>)}</tr>)}</tbody><tfoot><tr className="border-t font-semibold dark:border-slate-800"><td className="sticky left-0 bg-white px-4 py-2.5 dark:bg-slate-900">合計</td><td className="px-3 py-2.5 text-right whitespace-nowrap">{total ? duration(total) : "—"}</td>{dailyTotals.map((seconds, index) => <td key={index} className="px-3 py-2.5 text-right whitespace-nowrap">{seconds ? duration(seconds) : "–"}</td>)}</tr></tfoot></table></div></div>}
  </div>;
}

export function AdminHistoryView({ uid, items, initialExam }: { uid: string; items: AdminLearningActivity[]; initialExam: ExamId }) {
  const [exam, setExam] = useState(initialExam); const [skill, setSkill] = useState<SkillId | "all">("all"); const [page, setPage] = useState(0);
  const rows = items.filter((item) => item.exam === exam && (skill === "all" || item.skill === skill));
  const pageCount = Math.max(1, Math.ceil(rows.length / 8)); const visible = rows.slice(page * 8, page * 8 + 8);
  const changeExam = (value: ExamId) => { setExam(value); setSkill("all"); setPage(0); };
  return <div className="space-y-6"><div><h2 className="text-xl font-bold">学習履歴</h2><p className="mt-1 text-sm text-slate-500">生徒側と同じ演習・添削履歴</p></div><ExamPicker value={exam} onChange={changeExam} items={items}/><div className="flex flex-wrap gap-2"><Filter active={skill === "all"} onClick={() => { setSkill("all"); setPage(0); }}>すべて</Filter>{EXAM_SKILLS[exam].map((value) => <Filter key={value} active={skill === value} onClick={() => { setSkill(value); setPage(0); }}><i className="h-2 w-2 rounded-full" style={{ backgroundColor: SKILLS[value].color }}/>{SKILLS[value].label}</Filter>)}</div><div className="glass-card overflow-hidden rounded-2xl">{rows.length === 0 ? <div className="py-16 text-center text-sm text-slate-400"><ListChecks className="mx-auto mb-3 h-8 w-8"/>まだ演習履歴がありません</div> : <><div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 border-b px-5 py-3 text-[11px] uppercase text-slate-400 dark:border-slate-800 sm:grid"><span>問題名</span><span className="w-20 text-right">スコア</span><span className="w-24 text-right">演習日</span><span className="w-20 text-right">演習時間</span></div><ul className="divide-y dark:divide-slate-800">{visible.map((item) => { const Icon = SKILLS[item.skill].icon; return <li key={`${item.kind}-${item.id}`}><Link target="_blank" href={resultHref(uid, item)} className="grid gap-2 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${SKILLS[item.skill].color}18`, color: SKILLS[item.skill].color }}><Icon className="h-4 w-4"/></span><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="text-xs text-slate-400">{item.practiceTypeLabel}</p></div></div><span className="w-20 text-right text-sm font-semibold">{score(item)}</span><span className="w-24 text-right text-xs text-slate-500">{new Date(item.finishedAt).toLocaleDateString("ja-JP")}</span><span className="w-20 text-right text-xs text-slate-500">{duration(item.durationSec)}</span></Link></li>; })}</ul></>}</div>{rows.length > 0 && <div className="flex items-center justify-between text-sm"><span className="text-slate-400">{page * 8 + 1}–{Math.min((page + 1) * 8, rows.length)} / {rows.length}件</span><div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-30">前へ</button><span className="px-2 py-1.5">{page + 1}/{pageCount}</span><button disabled={page >= pageCount - 1} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-30">次へ</button></div></div>}</div>;
}

export function AdminOverviewView({ uid, items, initialExam }: { uid: string; items: AdminLearningActivity[]; initialExam: ExamId }) {
  const [exam, setExam] = useState(initialExam); const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d"); const [skill, setSkill] = useState<SkillId>("reading"); const [selectedType, setSelectedType] = useState<string | null>(null); const [metric, setMetric] = useState<"score" | "wpm" | "words">("score");
  const startTime = period === "all" ? null : (() => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ({ "7d": 6, "30d": 29, "90d": 89 }[period])); return date.getTime(); })();
  const rows = items.filter((item) => item.exam === exam && item.skill === skill && (startTime == null || Date.parse(item.finishedAt) >= startTime));
  const types = [...new Set(rows.map((item) => item.practiceType))];
  const effectiveType = selectedType && types.includes(selectedType) ? selectedType : types[0] ?? null;
  const metricRows = rows.filter((item) => !effectiveType || item.practiceType === effectiveType).sort((a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt));
  const points = metricRows.flatMap((item) => { const value = metric === "score" ? item.scoreValue : metric === "wpm" ? item.wpm : item.wordCount; return typeof value === "number" ? [{ label: new Date(item.finishedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }), value, title: item.title, submittedAt: new Date(item.finishedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) }] : []; });
  const average = points.length ? points.reduce((sum, point) => sum + point.value, 0) / points.length : null;
  const setExamAndReset = (value: ExamId) => { setExam(value); setSkill(EXAM_SKILLS[value][0]); setSelectedType(null); setMetric("score"); };
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">データ推移</h2><p className="mt-1 text-sm text-slate-500">生徒側と同じ技能・問題タイプ別の推移</p></div><div className="flex flex-wrap gap-3"><ExamPicker value={exam} onChange={setExamAndReset} items={items}/><div className="rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">{(["7d", "30d", "90d", "all"] as const).map((value) => <button key={value} onClick={() => setPeriod(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${period === value ? "bg-white text-eg-deep shadow-sm dark:bg-slate-700" : "text-slate-500"}`}>{value === "all" ? "全期間" : value.replace("d", "日")}</button>)}</div></div></div><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${EXAM_SKILLS[exam].length},minmax(0,1fr))` }}>{EXAM_SKILLS[exam].map((value) => { const active = skill === value; const Icon = SKILLS[value].icon; const count = items.filter((item) => item.exam === exam && item.skill === value).length; return <button key={value} onClick={() => { setSkill(value); setSelectedType(null); setMetric("score"); }} className={`rounded-xl border p-3 text-left ${active ? "text-white shadow-md" : "bg-white dark:bg-slate-900"}`} style={active ? { backgroundColor: SKILLS[value].color } : undefined}><span className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4"/>{SKILLS[value].label}</span><span className={`mt-1 block text-[11px] ${active ? "text-white/80" : "text-slate-400"}`}>{count ? `${count}回` : "データなし"}</span></button>; })}</div><div className="glass-card rounded-2xl p-6"><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{metricRows[0]?.practiceTypeLabel ? `${metricRows[0].practiceTypeLabel} の推移` : `${SKILLS[skill].label} の平均スコア推移`}</h3><p className="mt-0.5 text-xs text-slate-400">{metric === "score" ? (skill === "reading" || skill === "listening" ? "正答率（%）" : "添削・推定スコア") : metric === "wpm" ? "平均WPM" : "発話・記述ワード数"}の推移</p></div><div className="flex items-start gap-3">{(skill === "speaking" || skill === "writing") && <div className="rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">{(["score", ...(skill === "speaking" ? ["wpm"] : []), "words"] as ("score" | "wpm" | "words")[]).map((value) => <button key={value} onClick={() => setMetric(value)} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${metric === value ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-400"}`}>{value === "score" ? "スコア" : value === "wpm" ? "WPM" : "ワード数"}</button>)}</div>}{average != null && <div className="text-right"><p className="text-xl font-bold" style={{ color: SKILLS[skill].color }}>{metric === "score" ? (skill === "reading" || skill === "listening" ? `${average.toFixed(1)}%` : `${average.toFixed(1)} / ${metricRows[0]?.scoreMax ?? 0}`) : `${Math.round(average)} ${metric === "wpm" ? "WPM" : "words"}`}</p><p className="text-[10px] text-slate-400">平均</p></div>}</div></div><MiniLineChart points={points} max={metric === "score" ? (skill === "reading" || skill === "listening" ? 100 : metricRows[0]?.scoreMax) : undefined} color={SKILLS[skill].color} format={(value) => metric === "score" ? (skill === "reading" || skill === "listening" ? `${Math.round(value)}%` : value.toFixed(1)) : `${Math.round(value)} ${metric === "wpm" ? "WPM" : "words"}`}/></div><div><h3 className="mb-3 font-semibold">{SKILLS[skill].label} の問題タイプ別</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{types.map((type) => { const typeRows = rows.filter((item) => item.practiceType === type); const values = typeRows.map((item) => item.scoreValue).filter((value): value is number => value != null); const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; const active = type === effectiveType; return <button key={type} disabled={avg == null} onClick={() => setSelectedType(type)} className={`rounded-xl border p-3.5 text-left ${active ? "bg-white shadow-sm dark:bg-slate-800" : "bg-white dark:bg-slate-900"}`} style={active ? { boxShadow: `0 0 0 2px ${SKILLS[skill].color}` } : undefined}><p className="truncate text-[11px] text-slate-500">{typeRows[0]?.practiceTypeLabel ?? type} ({typeRows.length})</p><p className="mt-1 font-bold">{avg == null ? "データなし" : skill === "reading" || skill === "listening" ? `${avg.toFixed(1)}%` : `${avg.toFixed(1)} / ${typeRows[0]?.scoreMax}`}</p></button>; })}</div></div><div className="glass-card rounded-2xl p-6"><h3 className="font-semibold">最近の演習</h3><p className="mb-4 mt-1 text-xs text-slate-400">{SKILLS[skill].label}{metricRows[0]?.practiceTypeLabel ? ` ・ ${metricRows[0].practiceTypeLabel}` : ""} の履歴</p>{[...metricRows].reverse().slice(0, 6).map((item) => <Link target="_blank" key={`${item.kind}-${item.id}`} href={resultHref(uid, item)} className="flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-0.5 text-xs text-slate-400">{new Date(item.finishedAt).toLocaleDateString("ja-JP")}</p></div><span className="shrink-0 text-sm font-semibold">{score(item)}</span></Link>)}{metricRows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">この技能・問題タイプの履歴はありません</p>}</div></div>;
}

function Filter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-eg bg-eg-soft text-eg-deep" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}>{children}</button>;
}
