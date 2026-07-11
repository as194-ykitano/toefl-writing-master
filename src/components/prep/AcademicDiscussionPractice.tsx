"use client";

// TOEFL Academic Discussion 演習画面（本番 ETS 風レイアウト）
// 旧 Writing Masters 版のレイアウト・情報設計に寄せつつ、新トーン（角丸・淡色）で構成:
//   左: インストラクション + 教授（アバター・名前・投稿）
//   右上: Student Responses（Stance 選択 + 他学生2名の投稿）
//   右下: 回答エディタ（Cut / Paste / Undo / Redo / Word Count トグル）
//
// Stance（Agree / Disagree）は提出時に添削 API へ送り、その立場に沿ったモデル解答を生成する。
// 提出後は結果を保存し、結果ページへ遷移。

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, Send, User } from "lucide-react";
import GrammarQuizWhileWaiting from "@/components/prep/GrammarQuizWhileWaiting";
import { Button } from "@/components/ui/button";
import { ExamTopBar, usePracticeTimer } from "./exam-ui";
import {
  EssayWritingSet,
  EXAM_LABELS,
  PracticeMode,
  WritingFeedback,
} from "@/lib/prep/types";
import { newWritingResultId, saveWritingResult } from "@/lib/prep/writing-store";

interface Props {
  set: EssayWritingSet;
  mode: PracticeMode;
}

type Stance = "agree" | "disagree";

export default function AcademicDiscussionPractice({ set, mode }: Props) {
  const router = useRouter();
  const d = set.discussion!;
  const isPractice = mode === "practice";

  const [essay, setEssay] = useState("");
  const [stance, setStance] = useState<Stance | null>(null);
  const [wordCountHidden, setWordCountHidden] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStanceError, setShowStanceError] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const historyRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);

  const exitHref = `/practice/${set.exam}/writing`;
  const { elapsedSec, remainingSec } = usePracticeTimer(mode, set.timeLimitSec, undefined, !submitting);
  const wordCount = useMemo(() => essay.trim().split(/\s+/).filter(Boolean).length, [essay]);

  // ---- テキスト編集（Undo / Redo 用に履歴を積む） ----
  const commit = (next: string) => {
    historyRef.current.push(essay);
    redoRef.current = [];
    setEssay(next);
  };

  const handleCut = async () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    try {
      await navigator.clipboard.writeText(essay.slice(start, end));
    } catch {
      // クリップボード不可でも切り取り自体は行う
    }
    commit(essay.slice(0, start) + essay.slice(end));
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start;
        textareaRef.current.focus();
      }
    });
  };

  const handlePaste = async () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? essay.length;
    const end = el.selectionEnd ?? essay.length;
    try {
      const clip = await navigator.clipboard.readText();
      const caret = start + clip.length;
      commit(essay.slice(0, start) + clip + essay.slice(end));
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = caret;
          textareaRef.current.focus();
        }
      });
    } catch {
      // 権限が無い場合は何もしない
    }
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    redoRef.current.push(essay);
    setEssay(prev);
  };

  const handleRedo = () => {
    if (redoRef.current.length === 0) return;
    const next = redoRef.current.pop()!;
    historyRef.current.push(essay);
    setEssay(next);
  };

  const handleSubmit = async () => {
    if (submitting || essay.trim().length === 0) return;
    if (!stance) {
      setShowStanceError(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rubric: "toefl-academic-discussion",
          essayText: essay,
          promptText: set.promptText,
          discussion: set.discussion,
          stance,
        }),
      });
      const json = (await res.json()) as WritingFeedback & { message?: string; error?: string };
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "添削に失敗しました");

      const feedback: WritingFeedback = { ...json, sampleAnswer: json.sampleAnswer ?? set.sampleAnswer };
      const id = newWritingResultId();
      saveWritingResult({
        id,
        exam: set.exam,
        setId: set.id,
        practiceType: set.practiceType,
        rubric: set.rubric,
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

      <div className="flex-1 max-w-6xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 左: インストラクション + 教授 */}
        <div className="lg:col-span-2 space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-base font-bold text-gray-900 leading-snug">
              Your professor posted a question. Write a post responding to it.
            </h3>
            <div className="mt-3 text-sm text-gray-700 space-y-1.5">
              <p className="font-semibold">In your response, you should do the following.</p>
              <ul className="list-disc list-inside space-y-1 ml-1 text-gray-600">
                <li>Express and support your opinion.</li>
                <li>Make a contribution to the discussion in your own words.</li>
              </ul>
              <p className="pt-1">An effective response will contain at least 100 words.</p>
            </div>

            {/* 教授プロフィール */}
            <div className="flex flex-col items-center mt-5">
              <div className="w-20 h-20 rounded-full bg-violet-100 ring-4 ring-violet-200 flex items-center justify-center">
                <GraduationCap className="w-9 h-9 text-violet-700" />
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-900">
                {d.professorName || "Professor"}
              </div>
            </div>

            {/* 教授の投稿 */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{d.professor}</p>
            </div>
          </div>

          {isPractice && set.promptJa && (
            <details className="bg-white rounded-2xl border border-gray-200 p-4">
              <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600">
                日本語訳を表示
              </summary>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                {set.promptJa}
              </p>
            </details>
          )}
        </div>

        {/* 右: Student Responses + エディタ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Student Responses */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Student Responses</h4>

            {/* Stance 選択 */}
            <div className="flex items-center flex-wrap gap-4">
              <span className="text-sm text-gray-700">Your stance:</span>
              {(["agree", "disagree"] as Stance[]).map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="stance"
                    value={s}
                    checked={stance === s}
                    onChange={() => {
                      setStance(s);
                      setShowStanceError(false);
                    }}
                    className="cursor-pointer accent-eg-dark"
                  />
                  {s === "agree" ? "Agree" : "Disagree"}
                </label>
              ))}
            </div>
            {showStanceError && !stance && (
              <p className="mt-2 text-sm text-red-600">Agree か Disagree を選択してください。</p>
            )}

            {/* 他の学生の投稿 */}
            <div className="mt-4 space-y-4">
              <StudentPost
                name={d.student1Name || "Kelly"}
                text={d.student1}
                ring="ring-blue-200"
                bg="bg-blue-100"
                fg="text-blue-700"
              />
              <StudentPost
                name={d.student2Name || "Andrew"}
                text={d.student2}
                ring="ring-emerald-200"
                bg="bg-emerald-100"
                fg="text-emerald-700"
              />
            </div>
          </div>

          {/* エディタ */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <ToolbarButton onClick={handleCut}>Cut</ToolbarButton>
                <ToolbarButton onClick={handlePaste}>Paste</ToolbarButton>
                <ToolbarButton onClick={handleUndo}>Undo</ToolbarButton>
                <ToolbarButton onClick={handleRedo}>Redo</ToolbarButton>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWordCountHidden((v) => !v)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {wordCountHidden ? "Show Word Count" : "Hide Word Count"}
                </button>
                {!wordCountHidden && (
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      wordCount >= 100 ? "text-emerald-600" : "text-gray-600"
                    }`}
                  >
                    {wordCount}
                  </span>
                )}
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={essay}
              onChange={(e) => commit(e.target.value)}
              placeholder="Write a post."
              disabled={submitting}
              className="w-full min-h-[20rem] p-3 border border-gray-300 rounded-lg resize-none text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-eg focus:border-transparent"
            />

            {error && <p className="mt-3 text-sm text-red-600">添削エラー: {error}</p>}

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
              選択した Stance に沿ったモデル解答が添削結果に表示されます
            </p>
          </div>
        </div>
      </div>

      {/* AI 添削の待ち時間に文法クイズを表示 */}
      {submitting && <GrammarQuizWhileWaiting />}
    </div>
  );
}

function ToolbarButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
    >
      {children}
    </button>
  );
}

function StudentPost({
  name,
  text,
  ring,
  bg,
  fg,
}: {
  name: string;
  text: string;
  ring: string;
  bg: string;
  fg: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ${ring} ${bg}`}>
        <User className={`w-5 h-5 ${fg}`} />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-gray-900 text-sm">{name}</div>
        <p className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
      </div>
    </div>
  );
}
