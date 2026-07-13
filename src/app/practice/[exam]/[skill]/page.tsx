"use client";

// セクションページ: 問題タイプ別演習
// /practice/{toefl|ielts}/{reading|listening|speaking|writing}
//
// - タイプ未選択: 問題タイプのカード一覧（Google Classroom 風のグリッド）
// - ?type=slug 付き: そのタイプの問題セット一覧
// - Writing タイプなど href を持つタイプは既存機能（AI 添削）へ直接リンク

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  Clock,
  GraduationCap,
  Headphones,
  Mic,
  PenLine,
  Play,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import {
  getListeningSets,
  getReadingSets,
  getSpeakingSets,
  getWritingSets,
} from "@/lib/prep/data-source";
import { getPracticeType, getPracticeTypes } from "@/lib/prep/question-types";
import { EXAM_LABELS, ExamId, SKILL_LABELS, SkillId, WritingResult } from "@/lib/prep/types";
import { loadWritingResultsByExam } from "@/lib/prep/writing-store";
import { loadSessions } from "@/lib/prep/session-store";
import { cleanReadingTitle } from "@/lib/prep/display-title";

interface SetSummary {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  meta: string;
  practiceType?: string;
}

type ModeCounts = { practice: number; test: number };

const SKILL_ICONS = { reading: BookOpen, listening: Headphones, speaking: Mic, writing: PenLine };

const DIFFICULTY_LABELS: Record<string, { label: string; className: string }> = {
  easy: { label: "初級", className: "bg-emerald-50 text-emerald-600" },
  medium: { label: "中級", className: "bg-blue-50 text-blue-600" },
  hard: { label: "上級", className: "bg-eg-soft text-eg-deep" },
};

function isExamId(value: string): value is ExamId {
  return value === "toefl" || value === "ielts" || value === "toeic";
}

function isSkillId(value: string): value is SkillId {
  return value === "reading" || value === "listening" || value === "speaking" || value === "writing";
}

async function loadSets(exam: ExamId, skill: SkillId): Promise<SetSummary[]> {
  if (skill === "reading") {
    const list = await getReadingSets(exam);
    return list.map((s) => ({
      id: s.id,
      title: cleanReadingTitle(s.title),
      description: s.passageTitle !== s.title ? cleanReadingTitle(s.passageTitle) : s.description,
      difficulty: s.difficulty,
      meta: `${s.questions.length} 問 / ${Math.round(s.timeLimitSec / 60)} 分`,
      practiceType: s.practiceType,
    }));
  }
  if (skill === "listening") {
    const list = await getListeningSets(exam);
    return list.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      difficulty: s.difficulty,
      meta: `${s.questions.length} 問 / ${Math.round(s.timeLimitSec / 60)} 分`,
      practiceType: s.practiceType,
    }));
  }
  if (skill === "speaking") {
    const list = await getSpeakingSets(exam);
    return list.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      difficulty: s.difficulty,
      meta: `${s.tasks.length} タスク`,
      practiceType: s.practiceType,
    }));
  }
  if (skill === "writing") {
    const list = await getWritingSets(exam);
    return list.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      difficulty: s.difficulty,
      meta:
        s.practiceType === "build-a-sentence"
          ? `${s.items.length} 問 / ${Math.round(s.timeLimitSec / 60)} 分`
          : `${Math.round(s.timeLimitSec / 60)} 分`,
      practiceType: s.practiceType,
    }));
  }
  return [];
}

// ---- 問題セットカード ----

function SetCard({
  set,
  exam,
  skill,
  counts,
}: {
  set: SetSummary;
  exam: ExamId;
  skill: SkillId;
  counts: ModeCounts;
}) {
  const difficulty = DIFFICULTY_LABELS[set.difficulty] ?? DIFFICULTY_LABELS.medium;
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-6 shadow-sm">
      <div className="flex flex-wrap items-start gap-2 mb-2">
        <span className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${difficulty.className}`}>
          {difficulty.label}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
          <Clock className="w-3 h-3" /> {set.meta}
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-medium tabular-nums">
          <span className={`rounded-full px-2 py-1 ${counts.practice > 0 ? "bg-eg-soft text-eg-deep" : "bg-gray-100 text-gray-400"}`}>練習 {counts.practice}回</span>
          <span className={`rounded-full px-2 py-1 ${counts.test > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"}`}>本番 {counts.test}回</span>
        </div>
      </div>
      <h2 className="font-semibold text-gray-900">{set.title}</h2>
      {set.description && <p className="text-sm text-gray-500 mt-1">{set.description}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/practice/${exam}/${skill}/${set.id}?mode=practice`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-eg text-eg-deep hover:bg-eg-soft hover:border-eg-dark text-sm font-semibold px-4 py-2.5 transition-colors"
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
}

// ---- Writing 添削履歴（後から見返す導線） ----

function WritingHistory({ exam }: { exam: ExamId }) {
  const [results, setResults] = useState<WritingResult[]>([]);

  useEffect(() => {
    setResults(loadWritingResultsByExam(exam));
  }, [exam]);

  if (results.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-base font-bold text-gray-900">これまでの添削結果</h2>
      <p className="mt-1 text-xs text-gray-500">
        提出した Writing の添削結果です。クリックすると詳細を見返せます。
      </p>
      <div className="mt-4 space-y-2.5">
        {results.slice(0, 10).map((r) => (
          <Link
            key={r.id}
            href={`/writing-result/${r.id}`}
            className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200/70 px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{r.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {new Date(r.finishedAt).toLocaleDateString("ja-JP")} ・ {r.wordCount} words
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-sm font-bold text-eg-dark">
                {r.feedback.score.toFixed(r.feedback.scoreMax === 9 ? 1 : 2)}
              </span>
              <span className="text-[11px] text-gray-400">/ {r.feedback.scoreMax}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SkillPageInner() {
  const params = useParams<{ exam: string; skill: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, ModeCounts>>({});

  const exam = params.exam;
  const skill = params.skill;
  const valid = isExamId(exam) && isSkillId(skill);
  const typeParam = searchParams.get("type");

  // 問題タイプ一覧は Home と重複するため廃止。タイプ未選択でこのページに来た場合は
  // Home へ戻す（?type= 付きのセット一覧のみをこのページで扱う）。
  useEffect(() => {
    if (!valid) return;
    if (!typeParam && getPracticeTypes(exam as ExamId, skill as SkillId).length > 0) {
      router.replace("/home");
    }
  }, [valid, exam, skill, typeParam, router]);

  useEffect(() => {
    if (!valid) return;
    const examId = exam as ExamId;
    const skillId = skill as SkillId;
    const load = async () => {
      const loaded = await loadSets(examId, skillId);
      setSets(loaded);
      setLoading(false);
    };
    load();
  }, [exam, skill, valid]);

  useEffect(() => {
    if (!valid) return;
    const counts: Record<string, ModeCounts> = {};
    const add = (setId: string, mode: "practice" | "test" | undefined) => {
      const current = counts[setId] ?? { practice: 0, test: 0 };
      current[mode === "test" ? "test" : "practice"] += 1;
      counts[setId] = current;
    };
    loadSessions()
      .filter((session) => session.exam === exam && session.skill === skill)
      .forEach((session) => add(session.setId, session.mode));
    if (skill === "writing") {
      loadWritingResultsByExam(exam as ExamId).forEach((result) => add(result.setId, result.mode));
    }
    setAttemptCounts(counts);
  }, [exam, skill, valid]);

  if (!valid) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
        このページは存在しません。
        <div className="mt-4">
          <Link href="/home" className="text-eg-deep hover:underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  const examId = exam as ExamId;
  const skillId = skill as SkillId;
  const Icon = SKILL_ICONS[skillId];
  const types = getPracticeTypes(examId, skillId);
  const selectedType = typeParam ? getPracticeType(examId, skillId, typeParam) : undefined;

  // 選択中タイプの問題セット
  const filteredSets = selectedType
    ? sets.filter((s) => s.practiceType === selectedType.id)
    : sets;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5"
      >
        <ChevronLeft className="w-4 h-4" />
        ホームに戻る
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-eg-soft flex items-center justify-center">
          <Icon className="w-5.5 h-5.5 text-eg-dark" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {EXAM_LABELS[examId]} {SKILL_LABELS[skillId]}
            {selectedType && (
              <span className="text-gray-400 font-medium"> — {selectedType.label}</span>
            )}
          </h1>
          <p className="text-sm text-gray-500">
            {selectedType
              ? `${selectedType.labelJa}の問題セットを選んで演習を開始します`
              : types.length > 0
                ? "問題タイプを選んで演習に進みます"
                : "問題セットとモードを選んで演習を開始します"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
      ) : selectedType || types.length === 0 ? (
        // ---- 問題セット一覧 ----
        <div className="mt-6 space-y-4">
          {filteredSets.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              問題セットがまだ登録されていません（実データ投入時にここへ表示されます）
            </div>
          ) : (
            filteredSets.map((set) => <SetCard key={set.id} set={set} exam={examId} skill={skillId} counts={attemptCounts[set.id] ?? { practice: 0, test: 0 }} />)
          )}
        </div>
      ) : (
        // タイプ未選択（Home と重複するため表示せず、上の useEffect で Home へリダイレクト）
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
      )}

      {skillId === "writing" && <WritingHistory exam={examId} />}
    </div>
  );
}

export default function PracticeSkillPage() {
  return (
    <PrepShell>
      <Suspense fallback={<div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>}>
        <SkillPageInner />
      </Suspense>
    </PrepShell>
  );
}
