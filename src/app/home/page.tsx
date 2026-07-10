"use client";

// ホーム（マイコース）
// 画面左上の試験切替に連動し、選択中の試験の Home を表示する。
// 横長の技能バー（Reading / Listening / Speaking / Writing）を押すと、
// その下にその技能の問題タイプがずらっと並ぶ（画像2枚目のイメージ）。

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Clock,
  Headphones,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Mic,
  PenLine,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useExam } from "@/contexts/ExamContext";
import PrepShell from "@/components/prep/PrepShell";
import { getSkillStats } from "@/lib/prep/data-source";
import { getPracticeTypes, PracticeTypeInfo } from "@/lib/prep/question-types";
import { EXAM_LABELS, ExamId, SkillId } from "@/lib/prep/types";

interface SkillTab {
  skill: SkillId;
  title: string;
  description: string;
  icon: typeof BookOpen;
  accent: string; // アクティブバーの色
}

const SKILL_TABS: SkillTab[] = [
  { skill: "reading", title: "Reading", description: "問題タイプ別に読解を演習", icon: BookOpen, accent: "from-blue-500 to-blue-600" },
  { skill: "listening", title: "Listening", description: "音声を聞いて設問に回答", icon: Headphones, accent: "from-violet-500 to-violet-600" },
  { skill: "speaking", title: "Speaking", description: "準備 → 録音 → AI 添削", icon: Mic, accent: "from-orange-500 to-orange-600" },
  { skill: "writing", title: "Writing", description: "AI 添削つきで英作文", icon: PenLine, accent: "from-emerald-500 to-emerald-600" },
];

function TypeCard({
  type,
  exam,
  skill,
  setCount,
}: {
  type: PracticeTypeInfo;
  exam: ExamId;
  skill: SkillId;
  setCount: number;
}) {
  const disabled = type.comingSoon || (!type.href && setCount === 0);
  const href = type.href ?? `/practice/${exam}/${skill}?type=${type.id}`;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="w-9 h-9 rounded-lg bg-eg-soft text-eg-dark flex items-center justify-center">
          <ListChecks className="w-4.5 h-4.5" />
        </div>
        {disabled ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-1">
            <Clock className="w-3 h-3" /> 準備中
          </span>
        ) : type.badge ? (
          <span className="text-[10px] font-medium text-eg-deep bg-eg-soft rounded-full px-2 py-1">
            {type.badge}
          </span>
        ) : setCount > 0 ? (
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-1">
            {setCount} セット
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 font-semibold text-gray-900 text-sm">{type.label}</div>
      <p className="mt-0.5 text-xs text-gray-500">{type.labelJa}</p>
      {type.description && (
        <p className="mt-1 text-[11px] text-gray-400 leading-relaxed flex-1">{type.description}</p>
      )}
      {!disabled && (
        <div className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-eg-deep group-hover:gap-1.5 transition-all">
          開く <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </>
  );

  const cardClass = `group bg-white rounded-xl border p-4 flex flex-col transition-all ${
    disabled ? "border-gray-100 opacity-70" : "border-gray-200/70 hover:border-gray-300 hover:shadow-sm"
  }`;

  if (disabled) return <div className={cardClass}>{inner}</div>;
  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { exam } = useExam();
  const name = user?.displayName;
  const activeExam: ExamId = exam === "ielts" ? "ielts" : "toefl";

  const [skill, setSkill] = useState<SkillId>("reading");
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getSkillStats(activeExam, skill).then((s) => {
      if (cancelled) return;
      setTypeCounts(s.typeCounts);
      setQuestionCount(s.questionCount);
    });
    return () => {
      cancelled = true;
    };
  }, [activeExam, skill]);

  const types = useMemo(() => getPracticeTypes(activeExam, skill), [activeExam, skill]);
  const activeTab = SKILL_TABS.find((t) => t.skill === skill)!;

  return (
    <PrepShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {name ? `こんにちは、${name} さん` : "こんにちは"}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {EXAM_LABELS[activeExam]} の4技能を、練習・診断・復習・AI添削までひとつのアプリで。
        </p>

        {/* 横長の技能バー（押すと下にその技能の問題タイプが並ぶ） */}
        <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SKILL_TABS.map((tab) => {
            const active = tab.skill === skill;
            const Icon = tab.icon;
            return (
              <button
                key={tab.skill}
                onClick={() => setSkill(tab.skill)}
                className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-transparent text-white shadow-md"
                    : "border-gray-200/70 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {active && (
                  <span className={`absolute inset-0 bg-gradient-to-br ${tab.accent}`} aria-hidden />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${active ? "text-white" : "text-gray-400"}`} />
                  <span className={`text-sm font-bold ${active ? "text-white" : "text-gray-900"}`}>
                    {tab.title}
                  </span>
                </span>
                <span
                  className={`relative mt-1.5 block text-[11px] leading-snug ${
                    active ? "text-white/85" : "text-gray-400"
                  }`}
                >
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* 選択中技能の問題タイプ一覧 */}
        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {EXAM_LABELS[activeExam]} {activeTab.title} の問題タイプ
            {questionCount > 0 && (
              <span className="ml-2 text-xs font-medium text-gray-400">合計 {questionCount} 問</span>
            )}
          </h2>
          <Link
            href={`/practice/${activeExam}/${skill}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-eg-deep hover:text-eg-dark"
          >
            すべて見る <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {types.length === 0 ? (
          <div className="mt-4 rounded-xl border border-gray-100 bg-white py-10 text-center text-sm text-gray-400">
            この技能の問題タイプは準備中です
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {types.map((type) => (
              <TypeCard
                key={type.id}
                type={type}
                exam={activeExam}
                skill={skill}
                setCount={typeCounts[type.id] ?? 0}
              />
            ))}
          </div>
        )}

        {/* その他の導線 */}
        <h2 className="text-base font-bold text-gray-900 mt-10">その他</h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/mock" className="bg-white rounded-xl border border-gray-200/70 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-amber-600 bg-amber-50">
              <ClipboardCheck className="w-4.5 h-4.5" />
            </div>
            <div className="text-sm font-semibold text-gray-900">模試・実力診断</div>
            <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">現在地を測定</div>
          </Link>
          <Link href="/overview" className="bg-white rounded-xl border border-gray-200/70 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-blue-600 bg-blue-50">
              <LayoutDashboard className="w-4.5 h-4.5" />
            </div>
            <div className="text-sm font-semibold text-gray-900">ダッシュボード</div>
            <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">学習データを確認</div>
          </Link>
          <Link href="/advanced" className="bg-white rounded-xl border border-gray-200/70 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-teal-600 bg-teal-50">
              <Lightbulb className="w-4.5 h-4.5" />
            </div>
            <div className="text-sm font-semibold text-gray-900">Advanced</div>
            <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">YouTube・自由記述</div>
          </Link>
          <Link href="/training-selection" className="bg-white rounded-xl border border-gray-200/70 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 text-eg-dark bg-eg-soft">
              <PenLine className="w-4.5 h-4.5" />
            </div>
            <div className="text-sm font-semibold text-gray-900">Writing 添削（旧トップ）</div>
            <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">従来の AI 添削</div>
          </Link>
        </div>

        <p className="mt-12 text-center text-[11px] text-gray-400">
          Prep Master — Supported by <span className="font-semibold text-eg-dark">English Gym</span>
        </p>
      </div>
    </PrepShell>
  );
}
