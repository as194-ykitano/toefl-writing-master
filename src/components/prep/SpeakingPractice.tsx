"use client";

// Speaking 演習画面
// 問題表示 → 準備時間 → 録音（回答時間） → 再生確認 → 次のタスク / Submit
// 録音は MediaRecorder を使用。マイクが使えない場合もタイマー進行だけで練習可能

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Mic, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamTopBar, formatTime } from "./exam-ui";
import { EXAM_LABELS, PracticeMode, SpeakingSet } from "@/lib/prep/types";
import { newSessionId, saveSession } from "@/lib/prep/session-store";

type Phase = "ready" | "prep" | "recording" | "review";

interface SpeakingPracticeProps {
  set: SpeakingSet;
  mode: PracticeMode;
}

export default function SpeakingPractice({ set, mode }: SpeakingPracticeProps) {
  const router = useRouter();
  const [taskIndex, setTaskIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(0);
  const [recordings, setRecordings] = useState<Record<string, string>>({}); // taskId -> blob URL
  const [micError, setMicError] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const phaseRef = useRef<Phase>("ready");
  phaseRef.current = phase;

  const task = set.tasks[taskIndex];
  const isLastTask = taskIndex === set.tasks.length - 1;
  const exitHref = `/practice/${set.exam}/speaking`;

  // 全体経過時間
  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => setElapsedSec((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [submitted]);

  // フェーズ用カウントダウン
  useEffect(() => {
    if (phase !== "prep" && phase !== "recording") return;
    if (countdown <= 0) {
      if (phase === "prep") {
        startRecording();
      } else {
        stopRecording();
      }
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => cleanupStream, []);

  const startPrep = () => {
    setPhase("prep");
    setCountdown(task.prepSec);
  };

  const startRecording = async () => {
    setPhase("recording");
    setCountdown(task.speakSec);
    setMicError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordings((prev) => ({ ...prev, [task.id]: URL.createObjectURL(blob) }));
        cleanupStream();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch {
      // マイク拒否・非対応でもタイマーだけで練習を続けられるようにする
      setMicError(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setPhase("review");
  };

  const goNextTask = () => {
    setTaskIndex((i) => i + 1);
    setPhase("ready");
  };

  const retryTask = () => {
    setRecordings((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
    setPhase("ready");
  };

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    const sessionId = newSessionId();
    saveSession({
      id: sessionId,
      exam: set.exam,
      skill: "speaking",
      setId: set.id,
      setTitle: set.title,
      mode,
      finishedAt: new Date().toISOString(),
      durationSec: elapsedSec,
      correctCount: 0,
      totalCount: 0, // Speaking は正誤採点なし（AI フィードバック対象）
      results: set.tasks.map((t) => ({
        questionId: t.id,
        userAnswer: recordings[t.id] ? "(録音提出済み)" : null,
        correct: false,
      })),
    });
    router.push(`/results/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <ExamTopBar
        examLabel={EXAM_LABELS[set.exam]}
        title={set.title}
        mode={mode}
        elapsedSec={elapsedSec}
        remainingSec={0}
        exitHref={exitHref}
      />

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
        {/* タスク進捗 */}
        <div className="flex items-center gap-2">
          {set.tasks.map((t, i) => (
            <div
              key={t.id}
              className={`flex-1 h-1.5 rounded-full ${
                i < taskIndex ? "bg-blue-600" : i === taskIndex ? "bg-blue-300" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <div className="text-xs font-semibold tracking-wide text-blue-600 uppercase mb-2">
            Task {task.number} / {set.tasks.length} — {task.label}
          </div>
          <p className="text-[15px] sm:text-base text-gray-900 font-medium leading-relaxed">{task.prompt}</p>

          {task.material && (phase === "ready" || phase === "prep") && (
            <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm leading-relaxed text-gray-700">
              {task.material}
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-4">
            {phase === "ready" && (
              <>
                <div className="text-sm text-gray-500 text-center">
                  準備時間 {task.prepSec} 秒 → 回答時間 {task.speakSec} 秒
                  <br />
                  準備時間が終わると自動的に録音が始まります
                </div>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={startPrep}>
                  準備を開始する
                </Button>
              </>
            )}

            {phase === "prep" && (
              <>
                <div className="text-sm font-medium text-orange-600">準備時間</div>
                <div className="text-5xl font-bold text-gray-900 tabular-nums">{formatTime(countdown)}</div>
                <Button variant="outline" onClick={() => setCountdown(0)}>
                  スキップして録音を開始
                </Button>
              </>
            )}

            {phase === "recording" && (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  録音中
                </div>
                <div className="text-5xl font-bold text-gray-900 tabular-nums">{formatTime(countdown)}</div>
                {micError && (
                  <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    マイクを利用できないため録音されません（タイマーのみで練習を続けられます）
                  </div>
                )}
                <button
                  onClick={() => setCountdown(0)}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
                  aria-label="録音を終了"
                >
                  <Square className="w-6 h-6" />
                </button>
                <div className="text-xs text-gray-400">ボタンで録音を早めに終了できます</div>
              </>
            )}

            {phase === "review" && (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Task {task.number} の回答が完了しました
                </div>
                {recordings[task.id] ? (
                  <audio controls src={recordings[task.id]} className="w-full max-w-md" />
                ) : (
                  <div className="text-xs text-gray-400">録音データはありません</div>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  {mode === "practice" && (
                    <Button variant="outline" onClick={retryTask}>
                      <Mic className="w-4 h-4 mr-1.5" /> 録り直す
                    </Button>
                  )}
                  {!isLastTask ? (
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={goNextTask}>
                      次のタスクへ
                    </Button>
                  ) : (
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSubmit}>
                      <Send className="w-4 h-4 mr-1.5" /> Submit for AI Feedback
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          提出後、AI フィードバック（発音・流暢さ・内容の評価）は今後のアップデートで提供予定です。
        </p>
      </div>
    </div>
  );
}
