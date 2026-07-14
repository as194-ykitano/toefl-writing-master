"use client";

// Listening 演習画面
// 音声プレイヤー（audioUrl 未設定時は SpeechSynthesis によるモック再生）
// + メモ欄 + 設問回答
// 本番モード: 再生回数を playLimitInTest 回に制限
// 練習モード: 何度でも再生可・スクリプト表示可

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Flag, Headphones, Pause, Play, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MarkdownLite from "./MarkdownLite";
import QuestionRenderer from "./QuestionRenderer";
import { ExamTopBar, QuestionNav, usePracticeTimer } from "./exam-ui";
import { EXAM_LABELS, ListeningSet, PracticeMode, PracticeSessionResult } from "@/lib/prep/types";
import { isAnswerCorrect, newSessionId, saveSession } from "@/lib/prep/session-store";

interface ListeningPracticeProps {
  set: ListeningSet;
  mode: PracticeMode;
  /** 模試モード: 完了時に結果を親へ渡す（渡すと結果画面へは遷移しない） */
  onComplete?: (result: PracticeSessionResult) => void;
}

export default function ListeningPractice({ set, mode, onComplete }: ListeningPracticeProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [playCount, setPlayCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const questions = set.questions;
  const question = questions[currentIndex];
  const exitHref = `/practice/${set.exam}/listening`;
  const canPlay = mode === "practice" || playCount < set.playLimitInTest;

  const handleSubmit = (elapsedSec: number) => {
    if (submitted) return;
    setSubmitted(true);
    stopPlayback();
    const sessionId = newSessionId();
    const results = questions.map((q) => {
      const userAnswer = answers[q.id] ?? null;
      return { questionId: q.id, userAnswer, correct: isAnswerCorrect(q, userAnswer) };
    });
    const session = {
      id: sessionId,
      exam: set.exam,
      skill: "listening" as const,
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
  };

  const { elapsedSec, remainingSec } = usePracticeTimer(
    mode,
    set.timeLimitSec,
    () => handleSubmit(set.timeLimitSec),
    !submitted
  );

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  };

  useEffect(() => stopPlayback, []);

  const startPlayback = () => {
    if (!canPlay || playing) return;
    setPlayCount((c) => c + 1);
    setPlaying(true);

    if (set.audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(set.audioUrl);
        audioRef.current.onended = () => setPlaying(false);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setPlaying(false));
      return;
    }

    // モック再生: スクリプトを読み上げる（実データ投入時は audioUrl を設定）
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const turns = set.transcript.split(/[\n/]/).map((t) => t.trim()).filter(Boolean);
      turns.forEach((turn, i) => {
        const utterance = new SpeechSynthesisUtterance(turn.replace(/^[A-Za-z ]+:\s*/, ""));
        utterance.lang = "en-US";
        utterance.rate = 0.95;
        if (i === turns.length - 1) {
          utterance.onend = () => setPlaying(false);
        }
        window.speechSynthesis.speak(utterance);
      });
    } else {
      setPlaying(false);
    }
  };

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

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左カラム: プレイヤー + メモ */}
        <div className="space-y-4">
          <div data-guide-target="audio-player" className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
              <Headphones className="w-4 h-4 text-violet-600" />
              音声プレイヤー
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={playing ? stopPlayback : startPlayback}
                disabled={!canPlay && !playing}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                  playing
                    ? "bg-violet-100 text-violet-700"
                    : canPlay
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}
                aria-label={playing ? "停止" : "再生"}
              >
                {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
              </button>
              <div className="text-xs text-gray-500 text-center">
                {mode === "test" ? (
                  <>
                    再生回数: {playCount} / {set.playLimitInTest}
                    {!canPlay && <div className="text-red-500 mt-1">再生回数の上限に達しました</div>}
                  </>
                ) : (
                  <>再生回数: {playCount}（練習モードは無制限）</>
                )}
              </div>
              {!set.audioUrl && (
                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  ※ 現在はモック音声（自動読み上げ）です。実データ投入時に音声ファイルへ差し替わります。
                </p>
              )}
            </div>

            {mode === "practice" && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowTranscript((v) => !v)}
                  className="text-xs font-medium text-violet-600 hover:text-violet-800"
                >
                  {showTranscript ? "スクリプトを隠す" : "スクリプトを表示（練習モード限定）"}
                </button>
                {showTranscript && (
                  <div className="mt-3 text-xs leading-relaxed text-gray-600 space-y-1.5">
                    {set.transcript.split(/[\n/]/).map((turn, i) => (
                      <p key={i}>{turn.trim()}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div data-guide-target="listening-notes" className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <StickyNote className="w-4 h-4 text-orange-500" />
              メモ
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="聞きながらメモを取りましょう（採点対象外）"
              className="min-h-[10rem] text-sm"
            />
          </div>
        </div>

        {/* 右カラム: 設問 */}
        <div data-guide-target="listening-question" className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-500">
              Question {question.number} <span className="text-gray-300">/ {questions.length}</span>
            </div>
            <button data-guide-target="review-flag"
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

          {set.imageUrl && (
            <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={set.imageUrl}
                alt="地図・図面"
                className="w-full max-h-[420px] object-contain rounded-lg"
              />
            </div>
          )}
          {set.referenceText && (
            <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-500 mb-2">参照資料</div>
              <MarkdownLite text={set.referenceText} />
            </div>
          )}
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

          <div data-guide-target="question-navigation" className="mt-6 pt-4 border-t border-gray-100 space-y-4">
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
              {answeredCount} / {questions.length} 問に回答済み。提出後は採点結果とレポートが表示されます。
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
