"use client";

// 模試レポート
// /mock/report/{runId}
// 完了した模試の総合スコア・セクション別スコア・強み/弱点/学習提案を表示する。

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  ListChecks,
  Mic,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ScoreGauge from "@/components/prep/ScoreGauge";
import { loadMockReport } from "@/lib/prep/mock-store";
import { usePrepDataVersion } from "@/lib/prep/use-prep-data";
import { EXAM_LABELS, MockReport, SkillId } from "@/lib/prep/types";

const SKILL_ICON: Record<SkillId, typeof BookOpen> = {
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
  writing: BookOpen,
};

function SectionRow({
  skill,
  label,
  score,
  maxScore,
  isIelts,
}: {
  skill: SkillId;
  label?: string;
  score: number;
  maxScore: number;
  isIelts: boolean;
}) {
  const Icon = SKILL_ICON[skill];
  const ratio = maxScore > 0 ? Math.min(1, score / maxScore) : 0;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-eg-faint flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-eg-dark" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900">{label ?? skill}</div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-eg" style={{ width: `${ratio * 100}%` }} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold text-gray-900 tabular-nums">
            {isIelts ? score.toFixed(1) : score}
          </div>
          <div className="text-[10px] text-gray-400">{isIelts ? "Band" : `/ ${maxScore}`}</div>
        </div>
      </div>
    </div>
  );
}

function ReportView({ report }: { report: MockReport }) {
  const isIelts = report.exam === "ielts";
  return (
    <PrepShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase">
            {EXAM_LABELS[report.exam]} — Mock Test Report
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{report.title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date(report.finishedAt).toLocaleString("ja-JP")} に完了
          </p>
        </div>

        {/* ---- 総合スコア ---- */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div className="flex flex-col items-center">
            <ScoreGauge
              value={report.overallScore}
              max={report.overallMax}
              label={isIelts ? report.overallScore.toFixed(1) : String(report.overallScore)}
              subLabel={isIelts ? "Band" : `/ ${report.overallMax}`}
              colorClass="stroke-eg"
            />
            <div className="mt-2 text-xs font-semibold text-eg-deep bg-eg-soft rounded-full px-3 py-1">
              CEFR {report.cefr}
            </div>
          </div>
          <div className="sm:col-span-2 grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                <ListChecks className="w-3.5 h-3.5" /> 正答数
              </div>
              <div className="text-lg font-bold text-gray-900 tabular-nums mt-1">
                {report.correctCount} / {report.totalCount}
              </div>
              <div className="text-[10px] text-gray-400">R+L 合計</div>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                <Clock className="w-3.5 h-3.5" /> 所要時間
              </div>
              <div className="text-lg font-bold text-gray-900 tabular-nums mt-1">
                {report.durationMin}
              </div>
              <div className="text-[10px] text-gray-400">分</div>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                <Target className="w-3.5 h-3.5" /> セクション
              </div>
              <div className="text-lg font-bold text-gray-900 tabular-nums mt-1">
                {report.sections.length}
              </div>
              <div className="text-[10px] text-gray-400">技能</div>
            </div>
          </div>
        </div>

        {/* ---- セクション別 ---- */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">セクション別スコア</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.sections.map((s) => (
              <SectionRow
                key={s.skill}
                skill={s.skill}
                label={s.label}
                score={s.score}
                maxScore={s.maxScore}
                isIelts={isIelts}
              />
            ))}
          </div>
        </section>

        {/* ---- 強み / 弱点 ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50/60 rounded-2xl border border-emerald-100 p-5">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3">
              <CheckCircle2 className="w-4 h-4" /> 強み
            </div>
            <ul className="space-y-2">
              {report.strengths.map((s) => (
                <li key={s} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                  <span className="text-emerald-500">✓</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-eg-faint rounded-2xl border border-eg-soft p-5">
            <div className="flex items-center gap-2 text-eg-deep font-semibold text-sm mb-3">
              <Target className="w-4 h-4" /> 弱点
            </div>
            <ul className="space-y-2">
              {report.weaknesses.length > 0 ? (
                report.weaknesses.map((s) => (
                  <li key={s} className="text-sm text-gray-700 leading-relaxed flex gap-2">
                    <span className="text-eg-dark">→</span> {s}
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500">大きな弱点は見られませんでした。</li>
              )}
            </ul>
          </div>
        </div>

        {/* ---- 学習提案 ---- */}
        {report.nextSteps.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-eg-dark" />
              <h2 className="text-base font-bold text-gray-900">次にやること</h2>
            </div>
            <ol className="space-y-2">
              {report.nextSteps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-eg-soft text-eg-deep text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ---- チューターコメント ---- */}
        <div className="bg-gradient-to-br from-eg-faint to-orange-50 rounded-2xl border border-eg-soft p-6">
          <div className="text-xs font-semibold text-gray-700 mb-2">コーチからのコメント</div>
          <p className="text-sm text-gray-700 leading-relaxed">{report.tutorComment}</p>
          <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
            ※ スコアは練習用の参考推定です。Reading / Listening は正答数からの推定、Speaking は AI
            採点に基づきます。正式な Band 判定は本番受験でのみ確定します。
          </p>
        </div>

        {/* ---- アクション ---- */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/mock?exam=${report.exam}`}
            className="inline-flex items-center gap-2 rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-5 py-3 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> もう一度模試を受ける
          </Link>
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 transition-colors"
          >
            ダッシュボードへ <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PrepShell>
  );
}

function MockReportLoader() {
  const params = useParams<{ runId: string }>();
  const [report, setReport] = useState<MockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const version = usePrepDataVersion();

  useEffect(() => {
    setReport(loadMockReport(params.runId));
    setLoading(false);
  }, [params.runId, version]);

  if (loading) {
    return (
      <PrepShell>
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-eg" />
        </div>
      </PrepShell>
    );
  }

  if (!report) {
    return (
      <PrepShell>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
          模試レポートが見つかりませんでした。
          <div className="mt-4">
            <Link href="/mock" className="text-eg-deep hover:underline">
              模試メニューに戻る
            </Link>
          </div>
        </div>
      </PrepShell>
    );
  }

  return <ReportView report={report} />;
}

export default function MockReportPage() {
  return (
    <ProtectedRoute>
      <MockReportLoader />
    </ProtectedRoute>
  );
}
