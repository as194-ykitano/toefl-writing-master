"use client";

// セクションページ: 問題タイプ別演習
// /practice/{toefl|ielts}/{reading|listening|speaking|writing}
//
// - タイプ未選択: 問題タイプのカード一覧（Google Classroom 風のグリッド）
// - ?type=slug 付き: そのタイプの問題セット一覧
// - Writing タイプなど href を持つタイプは既存機能（AI 添削）へ直接リンク

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  Clock,
  GraduationCap,
  Headphones,
  ListChecks,
  Mic,
  PenLine,
  Play,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import {
  getListeningSets,
  getReadingSets,
  getSkillStats,
  getSpeakingSets,
  getWritingSets,
} from "@/lib/prep/data-source";
import { getPracticeType, getPracticeTypes, PracticeTypeInfo } from "@/lib/prep/question-types";
import { EXAM_LABELS, ExamId, SKILL_LABELS, SkillId, WritingResult } from "@/lib/prep/types";
import { loadWritingResultsByExam } from "@/lib/prep/writing-store";

interface SetSummary {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  meta: string;
  practiceType?: string;
}

const SKILL_ICONS = { reading: BookOpen, listening: Headphones, speaking: Mic, writing: PenLine };

const DIFFICULTY_LABELS: Record<string, { label: string; className: string }> = {
  easy: { label: "初級", className: "bg-emerald-50 text-emerald-600" },
  medium: { label: "中級", className: "bg-blue-50 text-blue-600" },
  hard: { label: "上級", className: "bg-eg-soft text-eg-deep" },
};

function isExamId(value: string): value is ExamId {
  return value === "toefl" || value === "ielts";
}

function isSkillId(value: string): value is SkillId {
  return value === "reading" || value === "listening" || value === "speaking" || value === "writing";
}

async function loadSets(exam: ExamId, skill: SkillId): Promise<SetSummary[]> {
  if (skill === "reading") {
    const list = await getReadingSets(exam);
    return list.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.passageTitle !== s.title ? s.passageTitle : s.description,
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

// ---- 問題タイプカード ----

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
        <div className="w-10 h-10 rounded-xl bg-eg-soft text-eg-dark flex items-center justify-center">
          <ListChecks className="w-5 h-5" />
        </div>
        {disabled ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-1">
            <Clock className="w-3 h-3" /> 準備中
          </span>
        ) : type.badge ? (
          <span className="text-[10px] font-medium text-eg-deep bg-eg-soft rounded-full px-2 py-1">
            {type.badge}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-1">
            {setCount > 0 ? `${setCount} セット` : ""}
          </span>
        )}
      </div>
      <div className="mt-3 font-semibold text-gray-900 text-sm">{type.label}</div>
      <p className="mt-0.5 text-xs text-gray-500">{type.labelJa}</p>
      {type.description && (
        <p className="mt-1 text-xs text-gray-400 leading-relaxed flex-1">{type.description}</p>
      )}
      {!disabled && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-eg-deep group-hover:text-eg-dark">
          開く <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </>
  );

  const cardClass = `group bg-white rounded-xl border p-5 flex flex-col transition-all ${
    disabled ? "border-gray-100 opacity-70" : "border-gray-200/70 hover:border-gray-300 hover:shadow-sm"
  }`;

  if (disabled) return <div className={cardClass}>{inner}</div>;
  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}

// ---- 問題セットカード ----

function SetCard({
  set,
  exam,
  skill,
}: {
  set: SetSummary;
  exam: ExamId;
  skill: SkillId;
}) {
  const difficulty = DIFFICULTY_LABELS[set.difficulty] ?? DIFFICULTY_LABELS.medium;
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-6 shadow-sm">
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
          className="inline-flex items-center gap-1.5 rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-4 py-2.5 transition-colors"
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
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const exam = params.exam;
  const skill = params.skill;
  const valid = isExamId(exam) && isSkillId(skill);
  const typeParam = searchParams.get("type");

  useEffect(() => {
    if (!valid) return;
    const examId = exam as ExamId;
    const skillId = skill as SkillId;
    const load = async () => {
      const [loaded, stats] = await Promise.all([
        loadSets(examId, skillId),
        getSkillStats(examId, skillId),
      ]);
      setSets(loaded);
      setTypeCounts(stats.typeCounts);
      setLoading(false);
    };
    load();
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

  // タイプ未定義のセット（モックデータなど）— タイプ一覧の下に表示
  const untypedSets = sets.filter((s) => !s.practiceType);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={selectedType ? `/practice/${exam}/${skill}` : `/${exam}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5"
      >
        <ChevronLeft className="w-4 h-4" />
        {selectedType
          ? `${SKILL_LABELS[skillId]} のタイプ一覧に戻る`
          : `${EXAM_LABELS[examId]} コースに戻る`}
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
            filteredSets.map((set) => <SetCard key={set.id} set={set} exam={examId} skill={skillId} />)
          )}
        </div>
      ) : (
        // ---- 問題タイプ一覧 ----
        <>
          <h2 className="mt-8 text-base font-bold text-gray-900">問題タイプ別演習</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((type) => (
              <TypeCard
                key={type.id}
                type={type}
                exam={examId}
                skill={skillId}
                setCount={typeCounts[type.id] ?? 0}
              />
            ))}
          </div>

          {untypedSets.length > 0 && skillId !== "writing" && (
            <>
              <h2 className="mt-10 text-base font-bold text-gray-900">その他の問題セット</h2>
              <p className="mt-1 text-xs text-gray-500">複数の問題タイプを含む総合演習セット</p>
              <div className="mt-4 space-y-4">
                {untypedSets.map((set) => (
                  <SetCard key={set.id} set={set} exam={examId} skill={skillId} />
                ))}
              </div>
            </>
          )}
        </>
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
