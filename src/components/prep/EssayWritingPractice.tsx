"use client";

// エッセイ型 Writing 演習画面（IELTS Task 1 / Task 2 / TOEFL Academic Discussion / Write an Email）
// 旧 Writing Masters 版と同等の深い添削を新 UI で提供する:
//   問題表示 → 回答 → 提出 → AI 添削 → 結果を保存 → 結果ページへ遷移（後から見返せる）

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExamTopBar, usePracticeTimer } from "./exam-ui";
import {
  EmailWritingSet,
  EssayWritingSet,
  EXAM_LABELS,
  PracticeMode,
  WritingFeedback,
  WritingRubricKind,
} from "@/lib/prep/types";
import {
  newWritingResultId,
  saveWritingResult,
} from "@/lib/prep/writing-store";

type SupportedSet = EmailWritingSet | EssayWritingSet;

interface EssayWritingPracticeProps {
  set: SupportedSet;
  mode: PracticeMode;
}

function isEmailSet(set: SupportedSet): set is EmailWritingSet {
  return set.practiceType === "write-an-email";
}

function rubricOf(set: SupportedSet): WritingRubricKind {
  if (isEmailSet(set)) return "toefl-email";
  return set.rubric;
}

/** ルーブリック別の語数の目安（下限） */
function minWordsHint(set: SupportedSet): number {
  if (isEmailSet(set)) return 80;
  if (set.minWords) return set.minWords;
  if (set.rubric === "ielts-task1") return 150;
  if (set.rubric === "ielts-task2") return 250;
  return 100; // academic discussion
}

export default function EssayWritingPractice({ set, mode }: EssayWritingPracticeProps) {
  const router = useRouter();
  const [essay, setEssay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rubric = rubricOf(set);
  const exitHref = `/practice/${set.exam}/writing`;
  const minWords = minWordsHint(set);

  const { elapsedSec, remainingSec } = usePracticeTimer(
    mode,
    set.timeLimitSec,
    undefined,
    !submitting
  );

  const wordCount = useMemo(
    () => essay.trim().split(/\s+/).filter(Boolean).length,
    [essay]
  );

  const buildRequestBody = () => {
    if (isEmailSet(set)) {
      return {
        rubric,
        essayText: essay,
        promptText: set.promptText,
        to: set.to,
        subject: set.subject,
      };
    }
    if (set.rubric === "toefl-academic-discussion") {
      return {
        rubric,
        essayText: essay,
        promptText: set.promptText,
        discussion: set.discussion,
      };
    }
    // IELTS Task 1 / Task 2
    return {
      rubric,
      essayText: essay,
      taskContent: set.promptText,
    };
  };

  const handleSubmit = async () => {
    if (submitting || essay.trim().length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      });
      const json = (await res.json()) as WritingFeedback & { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(json?.message ?? json?.error ?? "添削に失敗しました");
      }

      const feedback: WritingFeedback = {
        ...json,
        sampleAnswer: set.sampleAnswer,
      };

      const id = newWritingResultId();
      saveWritingResult({
        id,
        exam: set.exam,
        setId: set.id,
        practiceType: set.practiceType,
        rubric,
        title: set.title,
        content: essay,
        wordCount,
        durationSec: elapsedSec,
        finishedAt: new Date().toISOString(),
        feedback,
      });
      router.push(`/writing-result/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "添削に失敗しました");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <ExamTopBar
        examLabel={EXAM_LABELS[set.exam]}
        title={set.title}
        mode={mode}
        elapsedSec={elapsedSec}
        remainingSec={remainingSec}
        exitHref={exitHref}
      />

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左: 問題 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <PromptPanel set={set} />
        </div>

        {/* 右: 回答 */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-700">Your Response</div>
              <div
                className={`text-xs ${
                  wordCount >= minWords ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                {wordCount} words（目安 {minWords} 語以上）
              </div>
            </div>
            <Textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder={isEmailSet(set) ? "Dear ..., " : "Write your response here..."}
              disabled={submitting}
              className="min-h-[24rem] text-sm leading-relaxed"
            />
            {error && (
              <p className="mt-3 text-sm text-red-600">添削エラー: {error}</p>
            )}
            <Button
              className="mt-4 bg-eg hover:bg-eg-dark text-black self-end"
              onClick={handleSubmit}
              disabled={submitting || essay.trim().length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> AI 添削中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" /> 提出して添削を受ける
                </>
              )}
            </Button>
            <p className="mt-2 text-[11px] text-gray-400 self-end">
              提出すると添削結果ページに移動します（結果は保存され、後から見返せます）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- 問題パネル（ルーブリック別の表示） ----

function PromptPanel({ set }: { set: SupportedSet }) {
  if (isEmailSet(set)) {
    return (
      <>
        <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase mb-3">
          Write an Email
        </div>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
          {set.promptText}
        </p>
        {(set.to || set.subject) && (
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-700 space-y-1">
            {set.to && (
              <div>
                <span className="text-gray-400">To:</span> {set.to}
              </div>
            )}
            {set.subject && (
              <div>
                <span className="text-gray-400">Subject:</span> {set.subject}
              </div>
            )}
          </div>
        )}
        {set.promptJa && <JaTranslation text={set.promptJa} />}
      </>
    );
  }

  if (set.rubric === "toefl-academic-discussion" && set.discussion) {
    const d = set.discussion;
    return (
      <>
        <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase mb-3">
          Academic Discussion
        </div>
        <div className="space-y-3 text-sm">
          <Speaker name={d.professorName ?? "Professor"} text={d.professor} accent />
          <Speaker name={d.student1Name ?? "Student 1"} text={d.student1} />
          <Speaker name={d.student2Name ?? "Student 2"} text={d.student2} />
        </div>
        <div className="mt-4 rounded-xl bg-eg-faint border border-eg-soft px-4 py-3 text-sm text-gray-800">
          <div className="text-[11px] font-semibold text-eg-deep mb-1">設問</div>
          {d.question}
        </div>
        {set.promptJa && <JaTranslation text={set.promptJa} />}
      </>
    );
  }

  // IELTS Task 1 / Task 2
  return (
    <>
      <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase mb-3">
        {set.rubric === "ielts-task1" ? "IELTS Writing Task 1" : "IELTS Writing Task 2"}
      </div>
      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
        {set.promptText}
      </p>
      {set.imageUrl && (
        <div className="mt-4 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
          <Image
            src={set.imageUrl}
            alt="Task figure"
            width={800}
            height={500}
            className="w-full h-auto"
            unoptimized
          />
        </div>
      )}
      {set.promptJa && <JaTranslation text={set.promptJa} />}
    </>
  );
}

function Speaker({ name, text, accent }: { name: string; text: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-[11px] font-semibold ${accent ? "text-eg-deep" : "text-gray-500"}`}>
        {name}
      </div>
      <p className="text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}

function JaTranslation({ text }: { text: string }) {
  return (
    <details className="mt-4">
      <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600">
        日本語訳を表示
      </summary>
      <p className="mt-2 text-xs text-gray-600 leading-relaxed whitespace-pre-line">{text}</p>
    </details>
  );
}
