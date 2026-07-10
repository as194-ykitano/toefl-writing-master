"use client";

// Speaking 演習画面
// 問題表示 → 準備時間 → 録音（回答時間） → 再生確認 → 次のタスク / Submit
// 録音は MediaRecorder を使用。マイクが使えない場合もタイマー進行だけで練習可能
// Submit 時に録音を /api/analyze-speaking へ送信し、
// Whisper 文字起こし + AI フィードバック（Band 推定・講評）を取得して結果画面へ渡す

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Mic, Send, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamTopBar, formatTime } from "./exam-ui";
import {
  EXAM_LABELS,
  PracticeMode,
  PracticeSessionResult,
  SpeakingSet,
  SpeakingTaskFeedback,
} from "@/lib/prep/types";
import { newSessionId, saveSession } from "@/lib/prep/session-store";
import { saveRecording } from "@/lib/prep/recording-store";
import { PcmRecorder } from "@/lib/prep/audio-utils";
import RecordingWaveform from "./RecordingWaveform";
import SubmitQuiz from "./SubmitQuiz";

type Phase = "ready" | "prep" | "recording" | "review";

interface Recording {
  url: string;
  blob: Blob;
  /** 平均音量。0.005 未満はマイクがほぼ無音だった可能性が高い */
  rms?: number;
  /** WAV 変換（=デコード検証）に失敗した場合のメッセージ */
  convertError?: string;
}

interface SpeakingPracticeProps {
  set: SpeakingSet;
  mode: PracticeMode;
  /** 模試モード: 完了時に結果を親へ渡す（渡すと結果画面へは遷移しない） */
  onComplete?: (result: PracticeSessionResult) => void;
}

async function analyzeRecording(
  set: SpeakingSet,
  taskId: string,
  recording: Recording
): Promise<SpeakingTaskFeedback> {
  const task = set.tasks.find((t) => t.id === taskId);
  const isRepeat = set.practiceType === "listen-and-repeat";
  const formData = new FormData();
  const ext = recording.blob.type.includes("wav")
    ? "wav"
    : recording.blob.type.includes("mp4")
      ? "mp4"
      : "webm";
  formData.append("audio", new File([recording.blob], `answer.${ext}`, { type: recording.blob.type }));
  formData.append("prompt", task?.prompt ?? "");
  formData.append("exam", set.exam);
  formData.append("label", task?.label ?? "");
  if (isRepeat) {
    // Listen and Repeat: お手本文との一致率で採点（GPT 講評なし）
    formData.append("evalMode", "repeat");
    formData.append("expected", task?.sampleAnswers?.[0]?.text ?? "");
  }

  const res = await fetch("/api/analyze-speaking", { method: "POST", body: formData });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message ?? json?.error ?? "解析に失敗しました");
  }
  return {
    taskId,
    transcript: json.transcript ?? "",
    bandEstimate: typeof json.bandEstimate === "number" ? json.bandEstimate : undefined,
    summary: json.summary ?? "",
    strengths: Array.isArray(json.strengths) ? json.strengths : [],
    improvements: Array.isArray(json.improvements) ? json.improvements : [],
    improvedVersion: json.improvedVersion || undefined,
    grammarCorrections: Array.isArray(json.grammarCorrections)
      ? json.grammarCorrections
          .filter(
            (c: unknown): c is { mistake: string; correction: string; context?: string; explanation?: string; category?: string } =>
              !!c &&
              typeof (c as { mistake?: unknown }).mistake === "string" &&
              typeof (c as { correction?: unknown }).correction === "string"
          )
          .map((c: { mistake: string; correction: string; context?: string; explanation?: string; category?: string }) => ({
            mistake: c.mistake,
            correction: c.correction,
            explanation: c.explanation ?? "",
            context: c.context?.trim() || c.mistake,
            category: c.category || undefined,
          }))
      : undefined,
    speechWords: Array.isArray(json.speechWords)
      ? json.speechWords
          .filter(
            (w: unknown): w is { w: string; gap: number } =>
              !!w && typeof (w as { w?: unknown }).w === "string"
          )
          .map((w: { w: string; gap?: number }) => ({ w: w.w, gap: typeof w.gap === "number" ? w.gap : 0 }))
      : undefined,
    expectedText: json.expectedText || undefined,
    matchRatio: typeof json.matchRatio === "number" ? json.matchRatio : undefined,
    itemScore: typeof json.itemScore === "number" ? json.itemScore : undefined,
    fluency: json.fluency ?? undefined,
  };
}

export default function SpeakingPractice({ set, mode, onComplete }: SpeakingPracticeProps) {
  const router = useRouter();
  const [taskIndex, setTaskIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(0);
  const [recordings, setRecordings] = useState<Record<string, Recording>>({});
  const [micError, setMicError] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [analyzingIndex, setAnalyzingIndex] = useState(0);
  const [questionAudioPlaying, setQuestionAudioPlaying] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const levelRafRef = useRef<number>(0);

  const pcmRecorderRef = useRef<PcmRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const phaseRef = useRef<Phase>("ready");
  phaseRef.current = phase;

  const task = set.tasks[taskIndex];
  const isLastTask = taskIndex === set.tasks.length - 1;
  const exitHref = `/practice/${set.exam}/speaking`;
  const recordedCount = Object.keys(recordings).length;

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
    cancelAnimationFrame(levelRafRef.current);
    setMicLevel(0);
  };

  useEffect(() => cleanupStream, []);

  /** 録音中のマイク入力レベルを可視化（マイクが拾えていない場合に気づけるように） */
  const startLevelMeter = () => {
    const tick = () => {
      const recorder = pcmRecorderRef.current;
      if (recorder) setMicLevel(recorder.getLevel());
      levelRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const playQuestionAudio = () => {
    if (!task.audioUrl) return;
    questionAudioRef.current?.pause();
    const audio = new Audio(task.audioUrl);
    questionAudioRef.current = audio;
    setQuestionAudioPlaying(true);
    audio.onended = () => setQuestionAudioPlaying(false);
    audio.play().catch(() => setQuestionAudioPlaying(false));
  };

  useEffect(() => {
    return () => questionAudioRef.current?.pause();
  }, []);

  const startPrep = () => {
    setPhase("prep");
    setCountdown(task.prepSec);
    // 質問音声つきタスク（TOEFL Interview / Listen and Repeat）は開始時に自動再生
    if (task.audioUrl) playQuestionAudio();
  };

  const startRecording = async () => {
    setPhase("recording");
    setCountdown(task.speakSec);
    setMicError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // 生の PCM を直接収集して WAV を生成する（コーデック非依存のため
      // 「録音はできるのに再生できない」問題が起きない）
      pcmRecorderRef.current = new PcmRecorder(stream);
      startLevelMeter();
    } catch {
      // マイク拒否・非対応でもタイマーだけで練習を続けられるようにする
      setMicError(true);
    }
  };

  const stopRecording = () => {
    const recorder = pcmRecorderRef.current;
    pcmRecorderRef.current = null;
    if (recorder) {
      try {
        const { wavBlob, rms, durationSec } = recorder.stop();
        if (durationSec > 0.2) {
          setRecordings((prev) => ({
            ...prev,
            [task.id]: { url: URL.createObjectURL(wavBlob), blob: wavBlob, rms },
          }));
        }
      } catch (error) {
        console.warn("録音の生成に失敗:", error);
      }
    }
    cleanupStream();
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

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    const sessionId = newSessionId();

    // 録音を IndexedDB に保存（結果画面での聞き直し用）
    const recordedTasks = set.tasks.filter((t) => recordings[t.id]);
    await Promise.all(
      recordedTasks.map((t) => saveRecording(sessionId, t.id, recordings[t.id].blob))
    );

    // 録音があるタスクを順番に AI 解析（進捗表示のため直列実行）
    const feedback: SpeakingTaskFeedback[] = [];
    for (let i = 0; i < recordedTasks.length; i++) {
      const t = recordedTasks[i];
      setAnalyzingIndex(i + 1);
      try {
        feedback.push(await analyzeRecording(set, t.id, recordings[t.id]));
      } catch (error) {
        feedback.push({
          taskId: t.id,
          transcript: "",
          summary: "",
          strengths: [],
          improvements: [],
          error: error instanceof Error ? error.message : "解析に失敗しました",
        });
      }
    }

    const session = {
      id: sessionId,
      exam: set.exam,
      skill: "speaking" as const,
      setId: set.id,
      setTitle: set.title,
      practiceType: set.practiceType,
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
      speakingFeedback: feedback,
    };
    saveSession(session);
    if (onComplete) onComplete(session);
    else router.push(`/results/${sessionId}`);
  };

  if (submitted) {
    const total = Object.keys(recordings).length;
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-eg-deep">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold">回答を採点しています…</span>
          </div>
          <div className="text-xs text-gray-500">
            {total > 0
              ? `文字起こしとフィードバックを生成中（${analyzingIndex} / ${total}）`
              : "結果を保存しています"}
          </div>
          {/* 進捗バー（おおよその見た目。実際の完了で結果画面へ遷移） */}
          <div className="h-1.5 w-56 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-eg" />
          </div>
        </div>

        {/* 採点を待つ間の文法ミニクイズ（この間も英語学習できる） */}
        <SubmitQuiz />

        <p className="text-[11px] text-gray-400">
          採点は 30 秒〜1 分程度かかることがあります。その間クイズで待ちましょう。
        </p>
      </div>
    );
  }

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
                i < taskIndex ? "bg-eg" : i === taskIndex ? "bg-eg/40" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase">
              Task {task.number} / {set.tasks.length} — {task.label}
            </div>
            {/* Preparation → Recording ステッパー（画像3・4枚目） */}
            {task.prepSec > 0 && (phase === "prep" || phase === "recording") && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                    phase === "prep"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {phase === "recording" && <CheckCircle2 className="w-3 h-3" />}
                  {phase === "prep" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                  Preparation
                </span>
                <span className="text-gray-300">—</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                    phase === "recording"
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {phase === "recording" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  Recording
                </span>
              </div>
            )}
          </div>
          <p className="text-[15px] sm:text-base text-gray-900 font-medium leading-relaxed whitespace-pre-line">
            {task.prompt}
          </p>

          {task.material && (phase === "ready" || phase === "prep") && (
            <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {task.material}
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-4">
            {phase === "ready" && (
              <>
                <div className="text-sm text-gray-500 text-center">
                  {task.prepSec > 0 ? (
                    <>
                      準備時間 {task.prepSec} 秒 → 回答時間 {task.speakSec} 秒
                      <br />
                      準備時間が終わると自動的に録音が始まります
                    </>
                  ) : (
                    <>回答時間 {task.speakSec} 秒（開始するとすぐに録音が始まります）</>
                  )}
                  {task.audioUrl && (
                    <>
                      <br />
                      開始すると質問音声が再生されます
                    </>
                  )}
                </div>
                <Button size="lg" className="bg-eg hover:bg-eg-dark text-black" onClick={startPrep}>
                  開始する
                </Button>
              </>
            )}

            {(phase === "prep" || phase === "recording") && task.audioUrl && (
              <button
                onClick={playQuestionAudio}
                disabled={questionAudioPlaying}
                className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                  questionAudioPlaying
                    ? "border-eg bg-eg-soft text-eg-deep"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                {questionAudioPlaying ? "質問音声を再生中..." : "質問音声をもう一度聞く"}
              </button>
            )}

            {phase === "prep" && (
              <>
                <div className="text-sm font-medium text-eg-deep">準備時間</div>
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
                {/* 録音中の波形（画像4枚目） */}
                {!micError && (
                  <div className="w-full max-w-md">
                    <div className="h-16 w-full rounded-xl border border-gray-200 bg-gray-50/70 px-2">
                      <RecordingWaveform
                        getLevel={() => pcmRecorderRef.current?.getLevel() ?? 0}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400 text-center">
                      {micLevel > 0.05
                        ? "マイク入力を検出しています"
                        : "マイク入力が検出されていません — マイクの位置・音量を確認してください"}
                    </div>
                  </div>
                )}
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
                  <div className="w-full max-w-md space-y-2">
                    <audio controls src={recordings[task.id].url} className="w-full" />
                    {recordings[task.id].convertError && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {recordings[task.id].convertError}
                      </div>
                    )}
                    {recordings[task.id].rms !== undefined && recordings[task.id].rms! < 0.005 && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        録音がほぼ無音です。マイクの設定を確認して録り直すことをおすすめします。
                      </div>
                    )}
                  </div>
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
                    <Button className="bg-eg hover:bg-eg-dark text-black" onClick={goNextTask}>
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
          {recordedCount > 0
            ? `録音済み: ${recordedCount} タスク。提出すると AI が文字起こしと Band 推定つきフィードバックを生成します。`
            : "提出時に録音済みの回答へ AI フィードバック（Band 推定・講評・改善例）が生成されます。"}
        </p>
      </div>
    </div>
  );
}
