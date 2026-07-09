"use client";

// 学習ダッシュボード
// モックの目標/推定スコア + localStorage の実演習履歴を組み合わせて表示

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Headphones,
  History,
  Lightbulb,
  Mic,
  Minus,
  PenLine,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { DASHBOARD_SNAPSHOT } from "@/lib/prep/mock-data";
import { loadSessions } from "@/lib/prep/session-store";
import { EXAM_LABELS, PracticeSessionResult, SkillId } from "@/lib/prep/types";

const SKILL_ICONS: Record<SkillId, typeof BookOpen> = {
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
  writing: PenLine,
};

const SKILL_COLORS: Record<SkillId, string> = {
  reading: "text-blue-600 bg-blue-50",
  listening: "text-violet-600 bg-violet-50",
  speaking: "text-orange-600 bg-orange-50",
  writing: "text-emerald-600 bg-emerald-50",
};

export default function OverviewPage() {
  const snapshot = DASHBOARD_SNAPSHOT;
  const [sessions, setSessions] = useState<PracticeSessionResult[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const unreviewedCount = sessions.reduce((acc, s) => {
    const reviewed = new Set(s.reviewedQuestionIds ?? []);
    return acc + s.results.filter((r) => !r.correct && s.totalCount > 0 && !reviewed.has(r.questionId)).length;
  }, 0);

  return (
    <PrepShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">今日の学習状況と、次にやるべきことを確認しましょう</p>
        </div>

        {/* 目標 / 現在地 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-6 text-white shadow-sm">
            <div className="flex items-center gap-2 text-blue-100 text-xs font-medium mb-3">
              <Target className="w-4 h-4" /> 目標
            </div>
            <div className="text-3xl font-bold">{snapshot.targetScoreLabel}</div>
            <div className="text-sm text-blue-100 mt-1">{EXAM_LABELS[snapshot.targetExam]}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="text-xs font-medium text-gray-400 mb-3">現在の推定スコア</div>
            <div className="text-3xl font-bold text-gray-900">{snapshot.currentScoreLabel}</div>
            <div className="text-sm text-gray-400 mt-1">直近の模試・演習からの推定</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="text-xs font-medium text-gray-400 mb-3">未復習の問題</div>
            <div className="text-3xl font-bold text-gray-900">
              {unreviewedCount}
              <span className="text-base font-medium text-gray-400 ml-1">問</span>
            </div>
            <Link href="/review" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1">
              復習する <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 技能別スコアカード */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {snapshot.skillScores.map((skill) => {
            const Icon = SKILL_ICONS[skill.skill];
            const TrendIcon = skill.trend === "up" ? TrendingUp : skill.trend === "down" ? TrendingDown : Minus;
            return (
              <div key={skill.skill} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${SKILL_COLORS[skill.skill]}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <TrendIcon
                    className={`w-4 h-4 ${
                      skill.trend === "up" ? "text-emerald-500" : skill.trend === "down" ? "text-red-500" : "text-gray-300"
                    }`}
                  />
                </div>
                <div className="text-sm text-gray-500">{skill.label}</div>
                <div className="text-xl font-bold text-gray-900 mt-0.5">{skill.score}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 今日のおすすめ */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-orange-500" />
              <h2 className="font-semibold text-gray-900">今日のおすすめ学習</h2>
            </div>
            <div className="space-y-3">
              {snapshot.todayRecommendations.map((rec) => (
                <Link
                  key={rec.title}
                  href={rec.href}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors group"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{rec.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{rec.reason}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* 最近の弱点 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-gray-900">最近の弱点</h2>
            </div>
            <ul className="space-y-2.5">
              {snapshot.recentWeaknesses.map((weakness) => (
                <li key={weakness} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  {weakness}
                </li>
              ))}
            </ul>
            <Link
              href="/study-plan"
              className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              学習プランを見る <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 最近の提出（Writing / Speaking 横断） */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <PenLine className="w-4 h-4 text-emerald-600" />
              <h2 className="font-semibold text-gray-900">最近の Writing / Speaking 提出</h2>
            </div>
            <div className="space-y-2.5">
              {snapshot.submissions.map((submission) => (
                <Link
                  key={submission.title}
                  href={submission.href}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{submission.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{submission.categoryLabel}</div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-[11px] font-medium rounded-full px-2.5 py-1 ${
                      submission.status.includes("待ち") || submission.status.includes("改善")
                        ? "bg-orange-50 text-orange-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {submission.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* 最近の演習履歴（実データ） */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900">最近の演習</h2>
            </div>
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-4">まだ演習履歴がありません</p>
                <Link
                  href="/toefl"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  最初の演習を始める <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.slice(0, 5).map((session) => (
                  <Link
                    key={session.id}
                    href={`/results/${session.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{session.setTitle}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {EXAM_LABELS[session.exam]} ·{" "}
                        {new Date(session.finishedAt).toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-sm font-semibold text-gray-700 tabular-nums">
                      {session.totalCount > 0 ? `${session.correctCount}/${session.totalCount}` : "提出済み"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {unreviewedCount > 0 && (
          <Link
            href="/review"
            className="flex items-center justify-between gap-3 bg-orange-50 border border-orange-100 rounded-2xl p-5 hover:border-orange-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">未復習の問題が {unreviewedCount} 問あります</div>
                <div className="text-xs text-gray-500 mt-0.5">間違えた問題は 24 時間以内の復習が最も効果的です</div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-orange-400 flex-shrink-0" />
          </Link>
        )}
      </div>
    </PrepShell>
  );
}
