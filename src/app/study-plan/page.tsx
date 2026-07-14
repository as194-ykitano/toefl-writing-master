"use client";

// 学習プラン
// 目標と現在地のギャップから、今週の重点課題と 7 日間プランを表示（モック）

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Crosshair, Flag, Target, TrendingUp } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { STUDY_PLAN } from "@/lib/prep/mock-data";
import { SKILL_LABELS } from "@/lib/prep/types";

export default function StudyPlanPage() {
  const plan = STUDY_PLAN;

  return (
    <PrepShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">学習プラン</h1>
          <p className="text-sm text-gray-500 mt-1">直近の結果に基づく、目標達成までのロードマップです</p>
        </div>

        {/* 目標と現在地 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
              <Target className="w-3.5 h-3.5" /> 目標スコア
            </div>
            <div className="text-xl font-bold text-gray-900">{plan.targetScoreLabel}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> 現在スコア
            </div>
            <div className="text-xl font-bold text-gray-900">{plan.currentScoreLabel}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
              <Flag className="w-3.5 h-3.5" /> 目標までの差
            </div>
            <div className="text-xl font-bold text-orange-600">{plan.gapLabel}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
              <Crosshair className="w-3.5 h-3.5" /> 一番弱い技能
            </div>
            <div className="text-xl font-bold text-red-600">{SKILL_LABELS[plan.weakestSkill]}</div>
          </div>
        </div>

        {/* 今週の重点課題 + 今日のタスク */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-6 text-white shadow-sm">
            <h2 className="font-semibold mb-4">今週の重点課題</h2>
            <ul className="space-y-3">
              {plan.weeklyFocus.map((focus, i) => (
                <li key={focus} className="flex items-start gap-3 text-sm text-blue-50 leading-relaxed">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {focus}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">今日のタスク</h2>
            <div className="space-y-2.5">
              {plan.todayTasks.map((task) => {
                const inner = (
                  <>
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3" /> {task.minutes} 分
                    </span>
                  </>
                );
                return task.href ? (
                  <Link
                    key={task.title}
                    href={task.href}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={task.title}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 7 日間プラン */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-900">7 日間の学習プラン</h2>
          </div>
          <div className="space-y-1">
            {plan.week.map((day, i) => (
              <div
                key={day.day}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl ${
                  i === 0 ? "bg-blue-50/60 border border-blue-100" : "hover:bg-gray-50"
                }`}
              >
                <div className="sm:w-32 flex-shrink-0">
                  <div className={`text-sm font-semibold ${i === 0 ? "text-blue-700" : "text-gray-900"}`}>
                    {day.day}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{day.focus}</div>
                </div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {day.tasks.map((task) =>
                    task.href ? (
                      <Link
                        key={task.title}
                        href={task.href}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-700 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        {task.title}
                        <span className="text-gray-300">· {task.minutes}分</span>
                      </Link>
                    ) : (
                      <span
                        key={task.title}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5"
                      >
                        {task.title}
                        <span className="text-gray-300">· {task.minutes}分</span>
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
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
