"use client";

// Reading 演習画面
// 左に本文・右に設問の 2 ペイン構成（本番の PC 受験に近い操作感）

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QuestionRenderer from "./QuestionRenderer";
import { ExamTopBar, QuestionNav, usePracticeTimer } from "./exam-ui";
import { EXAM_LABELS, PracticeMode, PracticeSessionResult, ReadingSet } from "@/lib/prep/types";
import { isAnswerCorrect, newSessionId, saveSession } from "@/lib/prep/session-store";

interface ReadingPracticeProps {
  set: ReadingSet;
  mode: PracticeMode;
  /** 模試モード: 完了時に結果を親へ渡す（渡すと結果画面へは遷移しない） */
  onComplete?: (result: PracticeSessionResult) => void;
}

export default function ReadingPractice({ set, mode, onComplete }: ReadingPracticeProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const questions = set.questions;
  const question = questions[currentIndex];
  const exitHref = `/practice/${set.exam}/reading`;

  const handleSubmit = useMemo(
    () => (elapsedSec: number) => {
      if (submitted) return;
      setSubmitted(true);
      const sessionId = newSessionId();
      const results = questions.map((q) => {
        const userAnswer = answers[q.id] ?? null;
        return { questionId: q.id, userAnswer, correct: isAnswerCorrect(q, userAnswer) };
      });
      const session = {
        id: sessionId,
        exam: set.exam,
        skill: "reading" as const,
        setId: set.id,
        setTitle: set.title,
        practiceType: set.practiceType,
        mode,
        finishedAt: new Date().toISOString(),
        durationSec: elapsedSec,
        correctCount: results.filter((r) => r.correct).length,
        totalCount: results.length,
        results,
      };
      saveSession(session);
      if (onComplete) onComplete(session);
      else router.push(`/results/${sessionId}`);
    },
    [answers, mode, onComplete, questions, router, set, submitted]
  );

  const { elapsedSec, remainingSec } = usePracticeTimer(
    mode,
    set.timeLimitSec,
    () => handleSubmit(set.timeLimitSec),
    !submitted
  );

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) next.delete(question.id);
      else next.add(question.id);
      return next;
    });
  };

  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return a !== undefined && a !== "" && !(Array.isArray(a) && a.length === 0);
  }).length;

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

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 本文ペイン */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{set.passageTitle}</h2>
          <div className="space-y-4">
            {set.paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] leading-7 text-gray-800 whitespace-pre-line">
                {p.label && <span className="font-bold text-gray-500 mr-2">{p.label}</span>}
                {p.text}
              </p>
            ))}
          </div>
        </div>

        {/* 設問ペイン */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-500">
              Question {question.number} <span className="text-gray-300">/ {questions.length}</span>
              {question.reference && (
                <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 rounded px-2 py-0.5">
                  {question.reference}
                </span>
              )}
            </div>
            <button
              onClick={toggleFlag}
              className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors ${
                flagged.has(question.id)
                  ? "border-orange-300 bg-orange-50 text-orange-600"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${flagged.has(question.id) ? "fill-orange-500 text-orange-500" : ""}`} />
              {flagged.has(question.id) ? "フラグ解除" : "あとで見直す"}
            </button>
          </div>

          <p className="text-[15px] text-gray-900 font-medium leading-relaxed mb-5 whitespace-pre-line">
            {question.prompt}
          </p>

          <div className="flex-1">
            <QuestionRenderer
              question={question}
              value={answers[question.id] ?? null}
              onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
            <QuestionNav
              total={questions.length}
              currentIndex={currentIndex}
              answeredIds={questions.map((q) => {
                const a = answers[q.id];
                return a !== undefined && a !== "" && !(Array.isArray(a) && a.length === 0);
              })}
              flaggedIds={questions.map((q) => flagged.has(q.id))}
              onSelect={setCurrentIndex}
            />
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              {currentIndex < questions.length - 1 ? (
                <Button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setSubmitDialogOpen(true)}
                >
                  Submit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>回答を提出しますか？</DialogTitle>
            <DialogDescription>
              {answeredCount} / {questions.length} 問に回答済み
              {flagged.size > 0 && `（フラグ付き ${flagged.size} 問）`}
              。提出後は採点結果とレポートが表示されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              戻って見直す
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSubmit(elapsedSec)}>
              提出する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
