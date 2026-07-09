"use client";

// セクション別練習: 問題セット一覧
// /practice/{toefl|ielts}/{reading|listening|speaking}

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, ChevronLeft, Clock, GraduationCap, Headphones, Mic, Play } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { getListeningSets, getReadingSets, getSpeakingSets } from "@/lib/prep/data-source";
import { EXAM_LABELS, ExamId, SKILL_LABELS } from "@/lib/prep/types";

type PracticeSkill = "reading" | "listening" | "speaking";

interface SetSummary {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  meta: string;
}

const SKILL_ICONS = { reading: BookOpen, listening: Headphones, speaking: Mic };

const DIFFICULTY_LABELS: Record<string, { label: string; className: string }> = {
  easy: { label: "初級", className: "bg-emerald-50 text-emerald-600" },
  medium: { label: "中級", className: "bg-blue-50 text-blue-600" },
  hard: { label: "上級", className: "bg-orange-50 text-orange-600" },
};

function isExamId(value: string): value is ExamId {
  return value === "toefl" || value === "ielts";
}

function isPracticeSkill(value: string): value is PracticeSkill {
  return value === "reading" || value === "listening" || value === "speaking";
}

export default function PracticeSetListPage() {
  const params = useParams<{ exam: string; skill: string }>();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const exam = params.exam;
  const skill = params.skill;
  const valid = isExamId(exam) && isPracticeSkill(skill);

  useEffect(() => {
    if (!valid) return;
    const examId = exam as ExamId;
    const load = async () => {
      if (skill === "reading") {
        const list = await getReadingSets(examId);
        setSets(
          list.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.passageTitle,
            difficulty: s.difficulty,
            meta: `${s.questions.length} 問 / ${Math.round(s.timeLimitSec / 60)} 分`,
          }))
        );
      } else if (skill === "listening") {
        const list = await getListeningSets(examId);
        setSets(
          list.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            difficulty: s.difficulty,
            meta: `${s.questions.length} 問 / ${Math.round(s.timeLimitSec / 60)} 分`,
          }))
        );
      } else {
        const list = await getSpeakingSets(examId);
        setSets(
          list.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            difficulty: s.difficulty,
            meta: `${s.tasks.length} タスク`,
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, [exam, skill, valid]);

  if (!valid) {
    return (
      <PrepShell>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
          このページは存在しません。
          <div className="mt-4">
            <Link href="/home" className="text-blue-600 hover:underline">
              ホームに戻る
            </Link>
          </div>
        </div>
      </PrepShell>
    );
  }

  const Icon = SKILL_ICONS[skill as PracticeSkill];
  const hubHref = `/${exam}`;

  return (
    <PrepShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={hubHref}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5"
        >
          <ChevronLeft className="w-4 h-4" /> {EXAM_LABELS[exam as ExamId]} ハブに戻る
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center">
            <Icon className="w-5.5 h-5.5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {EXAM_LABELS[exam as ExamId]} {SKILL_LABELS[skill as PracticeSkill]}
            </h1>
            <p className="text-sm text-gray-500">問題セットとモードを選んで演習を開始します</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
          ) : sets.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              問題セットがまだ登録されていません（実データ投入時にここへ表示されます）
            </div>
          ) : (
            sets.map((set) => {
              const difficulty = DIFFICULTY_LABELS[set.difficulty] ?? DIFFICULTY_LABELS.medium;
              return (
                <div key={set.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${difficulty.className}`}>
                      {difficulty.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3" /> {set.meta}
                    </span>
                  </div>
                  <h2 className="font-semibold text-gray-900">{set.title}</h2>
                  {set.description && <p className="text-sm text-gray-500 mt-1">{set.description}</p>}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/practice/${exam}/${skill}/${set.id}?mode=practice`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
                    >
                      <Play className="w-4 h-4" /> 練習モード
                    </Link>
                    <Link
                      href={`/practice/${exam}/${skill}/${set.id}?mode=test`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 transition-colors"
                    >
                      <GraduationCap className="w-4 h-4" /> 本番モード
                    </Link>
                  </div>
                  <p className="mt-3 text-[11px] text-gray-400">
                    練習モード: 時間無制限{skill === "listening" ? "・音声繰り返し再生可" : ""} / 本番モード:
                    制限時間つき{skill === "listening" ? "・再生回数制限あり" : ""}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PrepShell>
  );
}
