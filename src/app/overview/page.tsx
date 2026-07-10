"use client";

// 学習ダッシュボード
// 選択中の試験（ExamContext）について、localStorage の演習セッション・Writing 添削結果を
// 期間・技能・問題タイプで集計して可視化する。
// 実データが取れない項目（語彙ミスなど）は「準備中」を明示する。

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
  Headphones,
  History,
  Mic,
  PenLine,
  Send,
  Target,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { MiniBarChart, MiniLineChart } from "@/components/prep/charts";
import { loadSessions } from "@/lib/prep/session-store";
import { loadWritingResults } from "@/lib/prep/writing-store";
import { getPracticeTypes } from "@/lib/prep/question-types";
import {
  buildDashboardData,
  PERIOD_LABELS,
  PeriodKey,
  TypeAggregate,
} from "@/lib/prep/dashboard-stats";
import { useExam } from "@/contexts/ExamContext";
import {
  EXAM_LABELS,
  ExamId,
  PracticeSessionResult,
  SkillId,
  WritingResult,
} from "@/lib/prep/types";

const SKILL_META: { skill: SkillId; label: string; icon: typeof BookOpen; color: string }[] = [
  { skill: "reading", label: "Reading", icon: BookOpen, color: "#3b82f6" },
  { skill: "listening", label: "Listening", icon: Headphones, color: "#8b5cf6" },
  { skill: "speaking", label: "Speaking", icon: Mic, color: "#f97316" },
  { skill: "writing", label: "Writing", icon: PenLine, color: "#10b981" },
];

const PERIODS: PeriodKey[] = ["7d", "30d", "90d", "all"];

function formatScore(skill: SkillId, value: number, scoreMax: number): string {
  if (skill === "reading" || skill === "listening") return `${Math.round(value)}%`;
  return `${(Math.round(value * 10) / 10).toFixed(1)} / ${scoreMax}`;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} 分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} 時間 ${m} 分` : `${h} 時間`;
}

export default function OverviewPage() {
  const { exam } = useExam();
  const activeExam: ExamId = exam === "ielts" ? "ielts" : "toefl";

  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [skill, setSkill] = useState<SkillId>("reading");
  const [sessions, setSessions] = useState<PracticeSessionResult[]>([]);
  const [writingResults, setWritingResults] = useState<WritingResult[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
    setWritingResults(loadWritingResults());
  }, []);

  const data = useMemo(
    () => buildDashboardData({ exam: activeExam, period, sessions, writingResults }),
    [activeExam, period, sessions, writingResults]
  );

  const skillMeta = SKILL_META.find((m) => m.skill === skill)!;
  const skillAgg = data.bySkill[skill];
  const catalogTypes = getPracticeTypes(activeExam, skill);

  // カタログのタイプ + データはあるがカタログに無いタイプ（"その他"など）
  const typeEntries: { id: string; label: string; labelJa?: string; agg: TypeAggregate | null }[] =
    useMemo(() => {
      const seen = new Set<string>();
      const entries: { id: string; label: string; labelJa?: string; agg: TypeAggregate | null }[] =
        catalogTypes.map((t) => {
          seen.add(t.id);
          return { id: t.id, label: t.label, labelJa: t.labelJa, agg: skillAgg.byType[t.id] ?? null };
        });
      for (const [id, agg] of Object.entries(skillAgg.byType)) {
        if (!seen.has(id)) entries.push({ id, label: id, agg });
      }
      return entries;
    }, [catalogTypes, skillAgg]);

  const totals = data.totals;

  const summaryCards = [
    { icon: Clock, label: "合計学習時間", value: formatMinutes(totals.studyMinutes), tone: "text-blue-600 bg-blue-50" },
    { icon: CheckCircle2, label: "合計問題回答数", value: `${totals.questionsAnswered} 問`, tone: "text-emerald-600 bg-emerald-50" },
    { icon: Send, label: "合計提出数", value: `${totals.submissions} 件`, tone: "text-violet-600 bg-violet-50" },
    {
      icon: Target,
      label: "平均正答率 (R/L)",
      value: totals.avgAccuracy === null ? "—" : `${Math.round(totals.avgAccuracy)}%`,
      tone: "text-cyan-600 bg-cyan-50",
    },
    { icon: Flame, label: "連続学習日数", value: `${totals.streakDays} 日`, tone: "text-orange-600 bg-orange-50" },
    { icon: AlertTriangle, label: "復習が必要な文法ミス", value: `${totals.grammarMistakes} 件`, tone: "text-rose-600 bg-rose-50" },
    {
      icon: BookOpen,
      label: "復習が必要な語彙",
      value: totals.vocabMistakes === null ? "準備中" : `${totals.vocabMistakes} 件`,
      tone: "text-gray-500 bg-gray-100",
    },
  ];

  return (
    <PrepShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ヘッダー + 期間選択 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">学習ダッシュボード</h1>
            <p className="text-sm text-gray-500 mt-1">
              {EXAM_LABELS[activeExam]} の学習データ（このブラウザの演習・添削履歴から集計）
            </p>
          </div>
          <div className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  period === p ? "bg-white text-eg-deep shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {summaryCards.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${c.tone}`}>
                <c.icon className="w-4 h-4" />
              </div>
              <div className="text-[11px] text-gray-400 leading-tight">{c.label}</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{c.value}</div>
            </div>
          ))}
        </div>

        {/* 技能タブ */}
        <div className="grid grid-cols-4 gap-2">
          {SKILL_META.map((m) => {
            const active = m.skill === skill;
            const Icon = m.icon;
            const agg = data.bySkill[m.skill];
            return (
              <button
                key={m.skill}
                onClick={() => setSkill(m.skill)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-transparent text-white shadow-md"
                    : "border-gray-200/70 bg-white hover:border-gray-300"
                }`}
                style={active ? { backgroundColor: m.color } : undefined}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-400"}`} />
                  <span className={`text-sm font-bold ${active ? "text-white" : "text-gray-900"}`}>
                    {m.label}
                  </span>
                </div>
                <div className={`mt-1 text-[11px] ${active ? "text-white/85" : "text-gray-400"}`}>
                  {agg.attempts > 0 ? `${agg.attempts} 回` : "データなし"}
                </div>
              </button>
            );
          })}
        </div>

        {/* 平均スコア推移 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-900">{EXAM_LABELS[activeExam]} {skillMeta.label} の平均スコア推移</h2>
            {skillAgg.avgScore !== null && (
              <span className="text-sm font-bold" style={{ color: skillMeta.color }}>
                {formatScore(skill, skillAgg.avgScore, skillAgg.scoreMax)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {skill === "reading" || skill === "listening"
              ? "各演習の正答率の推移"
              : skill === "speaking"
                ? "各提出の推定バンドの推移"
                : "各添削スコアの推移"}
          </p>
          <MiniLineChart
            points={skillAgg.points.map((p) => ({ value: p.value }))}
            max={skill === "reading" || skill === "listening" ? 100 : skillAgg.scoreMax}
            color={skillMeta.color}
            format={(v) =>
              skill === "reading" || skill === "listening" ? `${Math.round(v)}` : `${Math.round(v * 10) / 10}`
            }
          />
        </div>

        {/* 問題タイプ別 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">{skillMeta.label} の問題タイプ別</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {typeEntries.map((t) => {
              const has = t.agg && t.agg.attempts > 0 && t.agg.avgScore !== null;
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border p-4 ${
                    has ? "border-gray-200/70 bg-white" : "border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <div className="text-[11px] text-gray-500 leading-tight truncate" title={t.label}>
                    {t.label}
                    <span className="text-gray-400"> ({t.agg?.attempts ?? 0})</span>
                  </div>
                  {has ? (
                    <div className="mt-1 text-lg font-bold text-gray-900">
                      {formatScore(skill, t.agg!.avgScore!, t.agg!.scoreMax)}
                    </div>
                  ) : (
                    <div className="mt-1 text-sm font-medium text-gray-300">データなし</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* アクティビティ系列 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900">解答した問題数</h3>
            </div>
            <MiniBarChart points={data.daily.map((d) => ({ value: d.questions }))} color="#10b981" height={120} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">学習時間（分）</h3>
            </div>
            <MiniBarChart points={data.daily.map((d) => ({ value: d.minutes }))} color="#3b82f6" height={120} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-semibold text-gray-900">文法ミス数の推移</h3>
            </div>
            <MiniBarChart points={data.daily.map((d) => ({ value: d.grammarMistakes }))} color="#f43f5e" height={120} />
          </div>
        </div>

        {/* 最近の演習 / 未接続項目の注記 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900">最近の演習</h2>
            </div>
            {sessions.filter((s) => s.exam === activeExam).length === 0 &&
            writingResults.filter((w) => w.exam === activeExam).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-4">まだ演習履歴がありません</p>
                <Link href="/home" className="inline-flex items-center gap-1.5 text-sm font-medium text-eg-deep hover:text-eg-dark">
                  最初の演習を始める <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...sessions.filter((s) => s.exam === activeExam).map((s) => ({
                  id: s.id,
                  title: s.setTitle,
                  date: s.finishedAt,
                  href: `/results/${s.id}`,
                  right: s.totalCount > 0 ? `${s.correctCount}/${s.totalCount}` : "提出済み",
                })), ...writingResults.filter((w) => w.exam === activeExam).map((w) => ({
                  id: w.id,
                  title: w.title,
                  date: w.finishedAt,
                  href: `/writing-result/${w.id}`,
                  right: `${w.feedback.score.toFixed(w.feedback.scoreMax === 9 ? 1 : 2)}/${w.feedback.scoreMax}`,
                }))]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 6)
                  .map((r) => (
                    <Link
                      key={r.id}
                      href={r.href}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(r.date).toLocaleDateString("ja-JP")}
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-sm font-semibold text-gray-700 tabular-nums">
                        {r.right}
                      </span>
                    </Link>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">データについて</h2>
            </div>
            <ul className="space-y-2 text-xs text-gray-500 leading-relaxed">
              <li>・集計はこのブラウザの演習・添削履歴（localStorage）に基づきます。</li>
              <li>・スコアは技能ごとに尺度が異なります（R/L=正答率、Speaking=推定バンド、Writing=添削スコア）。</li>
              <li>・語彙ミスの集計は現在準備中です（語彙トラッキング実装後に接続）。</li>
              <li>・端末・ブラウザをまたいだ集計は将来のサーバー同期で対応予定です。</li>
            </ul>
          </div>
        </div>
      </div>
    </PrepShell>
  );
}
