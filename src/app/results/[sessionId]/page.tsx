"use client";

// 結果レポート
// - Reading / Listening: 正答率サマリー + 教材（本文/スクリプト/日本語訳/音声/参照資料）
//   + 全問の解答結果 + AI チャット（EG admin Practice Training 相当）
//   ※ Band 換算は 40 問フルテスト前提の統計処理のため、練習セットでは正答率のみを表示する
// - Speaking (Take an Interview / IELTS): タスク別 AI フィードバック + 録音の聞き直し
// - Speaking (Listen and Repeat): ETS 準拠の一致率採点（各文 0〜5 点 → 平均）
// - サンプル ID (sample-toefl / sample-ielts): 模試レポートのモックを表示

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Headphones,
  ListChecks,
  Loader2,
  MessageSquarePlus,
  Mic,
  Send,
  X,
  XCircle,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import ScoreGauge from "@/components/prep/ScoreGauge";
import MarkdownLite from "@/components/prep/MarkdownLite";
import GrammarCorrectionExercise from "@/components/prep/GrammarCorrectionExercise";
import SpeakingTranscriptView from "@/components/prep/SpeakingTranscriptView";
import { SAMPLE_REPORTS } from "@/lib/prep/mock-data";
import { getListeningSet, getReadingSet, getSpeakingSet } from "@/lib/prep/data-source";
import { loadSession } from "@/lib/prep/session-store";
import { usePrepDataVersion } from "@/lib/prep/use-prep-data";
import { cleanReadingTitle } from "@/lib/prep/display-title";
import { loadRecordings, pruneOldRecordings } from "@/lib/prep/recording-store";
import { getGuidePracticeSession } from "@/lib/prep/guide-fixtures";
import { auth } from "@/lib/firebase";
import {
  EXAM_LABELS,
  ListeningSet,
  MockReport,
  PracticeQuestion,
  PracticeSessionResult,
  ReadingSet,
  SKILL_LABELS,
  SpeakingSet,
  SpeakingTaskFeedback,
} from "@/lib/prep/types";

// =====================================================================
// ユーティリティ
// =====================================================================

function answerText(value: string | string[] | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—（未回答）";
  return Array.isArray(value) ? value.join(", ") : value;
}

function pct(ratio: number): number {
  return Math.round(ratio * 100);
}

// ---- 本文ハイライト → チャットに追加（EG admin Practice Training 相当）----

type SelectionRect = { top: number; left: number; width: number; height: number };

// これらの要素上での選択は「Add to Chat」の対象外にする（ボタン等の操作を妨げない）
const CHAT_SELECTION_INTERACTIVE_SELECTOR = [
  "button",
  "input",
  "textarea",
  "select",
  "audio",
  "video",
  "iframe",
  "a",
  "[role='button']",
].join(",");

function getElementFromNode(node: Node | null): Element | null {
  if (!node) return null;
  return node instanceof Element ? node : node.parentElement;
}

function isNodeWithinInteractive(node: Node | null): boolean {
  return Boolean(getElementFromNode(node)?.closest(CHAT_SELECTION_INTERACTIVE_SELECTOR));
}

// =====================================================================
// 解答結果（全問一覧・EG admin 風）
// =====================================================================

function QuestionReviewCard({
  question,
  userAnswer,
  correct,
  index,
}: {
  question: PracticeQuestion;
  userAnswer: string | string[] | null;
  correct: boolean;
  index: number;
}) {
  const options = question.options ?? question.matchTargets ?? [];
  const showOptions =
    options.length > 0 &&
    (question.type === "multiple_choice" ||
      question.type === "multi_select" ||
      question.type === "true_false_notgiven" ||
      question.type === "matching");
  const correctSet = new Set(
    (Array.isArray(question.answer) ? question.answer : [question.answer]).map((a) =>
      a.trim().toLowerCase()
    )
  );
  const userSet = new Set(
    (Array.isArray(userAnswer) ? userAnswer : userAnswer ? [userAnswer] : []).map((a) =>
      a.trim().toLowerCase()
    )
  );

  return (
    <div
      data-guide-target={index === 0 ? "answer-review-card" : undefined}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className={`rounded-xl border p-5 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both ${
        correct
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/10"
          : "border-red-200 bg-red-50/40 dark:border-red-500/30 dark:bg-red-500/10"
      }`}
    >
      <div className="flex items-start gap-3">
        {correct ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Q{index + 1}</span>
            {question.reference && (
              <span className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5 dark:bg-white/10 dark:border-white/15 dark:text-gray-300">
                {question.reference}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
            {question.prompt}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg border border-gray-200/70 px-3 py-2 dark:bg-white/5 dark:border-white/10">
              <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500">あなたの答え</div>
              <div
                className={`font-medium ${
                  correct
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {answerText(userAnswer)}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200/70 px-3 py-2 dark:bg-white/5 dark:border-white/10">
              <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500">正解</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{answerText(question.answer)}</div>
            </div>
          </div>

          {showOptions && (
            <div className="mt-3 space-y-1.5">
              {options.map((option) => {
                const key = option.trim().toLowerCase();
                const isCorrectOption = correctSet.has(key);
                const isSelected = userSet.has(key);
                return (
                  <div
                    key={option}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                      isCorrectOption
                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                        : isSelected
                          ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                          : "border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
                    }`}
                  >
                    <span className="text-gray-800 dark:text-gray-200 leading-relaxed flex-1">{option}</span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      {isCorrectOption && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Correct</span>
                      )}
                      {isSelected && <span className="text-[10px] text-gray-400 dark:text-gray-500">You</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {question.explanation && (
            <div className="mt-3 bg-white rounded-lg border border-gray-200/70 px-4 py-3">
              <div className="text-[11px] font-semibold text-eg-deep mb-1">解説</div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {question.explanation}
              </p>
              {question.trapNote && (
                <p className="mt-2 text-xs text-orange-600 leading-relaxed">
                  ⚠ ひっかけ: {question.trapNote}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// 教材ビュー（本文 / スクリプト / 日本語訳 / 音声 / 参照資料）
// =====================================================================

function MaterialCard({
  readingSet,
  listeningSet,
}: {
  readingSet: ReadingSet | null;
  listeningSet: ListeningSet | null;
}) {
  const [tab, setTab] = useState<"en" | "ja">("en");
  const translation = readingSet?.translationJa ?? listeningSet?.transcriptJa;

  if (!readingSet && !listeningSet) return null;

  return (
    <div className="glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {listeningSet ? (
            <>
              <Headphones className="w-4 h-4 text-violet-500 dark:text-violet-400" /> 音声とスクリプト
            </>
          ) : (
            <>本文（{readingSet?.passageTitle}）</>
          )}
        </h2>
        {translation && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setTab("en")}
              className={`px-3 py-1.5 ${tab === "en" ? "bg-eg text-black" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              English
            </button>
            <button
              onClick={() => setTab("ja")}
              className={`px-3 py-1.5 ${tab === "ja" ? "bg-eg text-black" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              日本語訳
            </button>
          </div>
        )}
      </div>

      {/* リスニング: 音声プレイヤー（復習では回数無制限） */}
      {listeningSet?.audioUrl && (
        <audio controls src={listeningSet.audioUrl} className="w-full mb-4" preload="none" />
      )}

      <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
        {tab === "ja" && translation ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{translation}</p>
        ) : readingSet ? (
          readingSet.paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-7 text-gray-800 whitespace-pre-line">
              {p.label && <span className="font-bold text-gray-500 mr-2">{p.label}</span>}
              {p.text}
            </p>
          ))
        ) : (
          <div className="text-sm leading-7 text-gray-800 space-y-1.5">
            {(listeningSet?.transcript ?? "").split(/\n/).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        {tab === "en" && listeningSet?.referenceText && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">参照資料</div>
            <MarkdownLite text={listeningSet.referenceText} />
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// AI チャットパネル
// =====================================================================

const CHAT_SUGGESTIONS = [
  "本文を簡単に要約して",
  "間違えた問題をもう一度解説して",
  "本文の重要語彙を5つ教えて",
];

interface AttachedSelection {
  id: string;
  text: string;
}

function ChatPanel({
  context,
  attachedSelections,
  setAttachedSelections,
}: {
  context: string;
  attachedSelections: AttachedSelection[];
  setAttachedSelections: React.Dispatch<React.SetStateAction<AttachedSelection[]>>;
}) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 初回マウント（メッセージ 0 件）では走らせない。
    // scrollIntoView はページ全体をチャット末尾へスクロールさせてしまい、
    // 開いた直後に中央へ飛ぶ原因になるため、会話が始まってからのみ実行する。
    if (messages.length === 0) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    const hasAttachments = attachedSelections.length > 0;
    if ((!trimmed && !hasAttachments) || loading) return;
    const attachmentBlock = hasAttachments
      ? "【選択した本文】\n\n" + attachedSelections.map((a) => a.text).join("\n\n---\n\n") + "\n\n"
      : "";
    const content = attachmentBlock + (trimmed || "上記の部分について教えて");
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setAttachedSelections([]);
    setLoading(true);
    try {
      const res = await fetch("/api/prep-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, messages: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "エラーが発生しました");
      setMessages([...next, { role: "assistant", content: json.message || "（応答がありません）" }]);
    } catch (error) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: `エラー: ${error instanceof Error ? error.message : "送信に失敗しました"}`,
        },
      ]);
    }
    setLoading(false);
  };

  const removeAttached = (id: string) =>
    setAttachedSelections((prev) => prev.filter((a) => a.id !== id));

  return (
    <div className="glass-card rounded-2xl flex flex-col lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] min-h-[520px] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-white/10">
        <div className="w-8 h-8 rounded-lg bg-eg flex items-center justify-center flex-shrink-0">
          <Bot className="w-4.5 h-4.5 text-black" />
        </div>
        <div>
          <div className="font-bold text-gray-900 dark:text-gray-50 text-sm">KAIに質問</div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500">
            本文をドラッグで選ぶと質問に添付できます
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              わからなかった単語や、解説で納得できない部分を KAI に聞いてみましょう。
            </p>
            {CHAT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full text-left text-xs text-eg-deep bg-eg-faint hover:bg-eg-soft border border-eg-soft rounded-lg px-3 py-2 transition-colors dark:text-amber-300 dark:border-eg/20"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                m.role === "user"
                  ? "bg-eg text-black rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md dark:bg-white/10 dark:text-gray-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-white/10 rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-xs text-gray-400 dark:text-gray-500">KAI が考え中...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="px-4 py-3 border-t border-gray-100 dark:border-white/10 space-y-2"
      >
        {attachedSelections.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attachedSelections.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-eg-faint border border-eg-soft px-2.5 py-1 text-xs text-gray-700 dark:bg-eg/10 dark:border-eg/20 dark:text-gray-200"
                title={a.text}
              >
                <BookOpen className="w-3 h-3 flex-shrink-0 text-eg-deep dark:text-amber-300" />
                <span className="max-w-[160px] truncate">
                  {a.text.length > 20 ? a.text.slice(0, 20) + "…" : a.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttached(a.id)}
                  className="flex-shrink-0 rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                  aria-label="削除"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="質問を入力..."
            className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-eg/50 focus:border-eg dark:bg-white/5 dark:border-white/15 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && attachedSelections.length === 0)}
            className="p-2.5 rounded-xl bg-eg hover:bg-eg-dark text-black disabled:opacity-40 flex-shrink-0"
            aria-label="送信"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

// =====================================================================
// Speaking フィードバック
// =====================================================================

function RecordingPlayer({ url }: { url?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const durationFixedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  if (!url) return null;

  // MediaRecorder 製の webm は duration メタデータを持たず 0:00 / Infinity になるため、
  // 読み込み時に末尾までシークして再生時間を確定させる（既知の回避策）
  const fixDuration = () => {
    const el = audioRef.current;
    if (!el || durationFixedRef.current) return;
    if (!Number.isFinite(el.duration) || el.duration === 0) {
      durationFixedRef.current = true;
      const reset = () => {
        el.currentTime = 0;
        el.removeEventListener("timeupdate", reset);
      };
      el.addEventListener("timeupdate", reset);
      el.currentTime = 1e7;
    }
  };

  return (
    <div className="mt-3">
      <div className="text-[11px] font-semibold text-gray-400 mb-1">あなたの録音</div>
      {failed ? (
        <p className="text-xs text-gray-400">
          この録音はお使いのブラウザで再生できませんでした（録音時と同じブラウザでお試しください）。
        </p>
      ) : (
        <audio
          ref={audioRef}
          controls
          src={url}
          className="w-full"
          preload="metadata"
          onLoadedMetadata={fixDuration}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

/** Take an Interview / IELTS Speaking 用の AI フィードバックカード */
function SpeakingFeedbackCard({
  feedback,
  set,
  index,
  recordingUrl,
}: {
  feedback: SpeakingTaskFeedback;
  set: SpeakingSet | null;
  index: number;
  recordingUrl?: string;
}) {
  const task = set?.tasks.find((t) => t.id === feedback.taskId);
  const [openSample, setOpenSample] = useState<string | null>(null);

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 6) * 80}ms` }}
      className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-900">Task {index + 1}</span>
        {task?.label && (
          <span className="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
            {task.label}
          </span>
        )}
        {feedback.bandEstimate !== undefined && (
          <span className="ml-auto text-xs font-bold text-eg-deep bg-eg-soft rounded-full px-3 py-1">
            推定 Band {feedback.bandEstimate.toFixed(1)}
          </span>
        )}
      </div>

      {task && (
        <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{task.prompt}</p>
      )}

      <RecordingPlayer url={recordingUrl} />

      {feedback.error ? (
        <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          解析エラー: {feedback.error}
        </div>
      ) : (
        <>
          {feedback.fluency && (
            <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 lg:grid-cols-8 dark:border-white/10 dark:bg-white/5">
              {[
                { label: "回答時間", value: `${feedback.fluency.durationSec}秒` },
                { label: "発話速度", value: `${feedback.fluency.wpm} WPM` },
                { label: "無音", value: `${Math.round(feedback.fluency.pauseRatio * 100)}%` },
                { label: "長いポーズ", value: `${feedback.fluency.longPauses}回` },
                { label: "フィラー", value: `${feedback.fluency.fillerCount ?? 0}回` },
                { label: "単語繰り返し", value: `${feedback.fluency.wordRepetitionCount ?? 0}回` },
                { label: "言い直し", value: `${(feedback.fluency.phraseRestartCount ?? 0) + (feedback.fluency.selfCorrectionCount ?? 0)}回` },
                { label: "話し始め", value: `${feedback.fluency.startDelaySec ?? 0}秒` },
              ].map((metric) => (
                <div key={metric.label} className="min-w-0 rounded-lg bg-white px-2 py-2 dark:bg-gray-900/70">
                  <div className="truncate text-[9px] text-gray-400">{metric.label}</div>
                  <div className="truncate text-[11px] font-bold tabular-nums text-gray-900 dark:text-gray-100">{metric.value}</div>
                </div>
              ))}
            </div>
          )}
          {feedback.transcript && (
            <SpeakingTranscriptView
              transcript={feedback.transcript}
              speechWords={feedback.speechWords}
              fillerCount={feedback.fluency?.fillerCount}
              longPauses={feedback.fluency?.longPauses}
              trailingPauseSec={feedback.fluency?.trailingPauseSec}
              wordRepetitionCount={feedback.fluency?.wordRepetitionCount}
              correctionCount={(feedback.fluency?.phraseRestartCount ?? 0) + (feedback.fluency?.selfCorrectionCount ?? 0)}
              wordRepetitionIndexes={feedback.fluency?.wordRepetitionIndexes}
              correctionIndexes={feedback.fluency?.correctionIndexes}
            />
          )}

          {feedback.summary && (
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">{feedback.summary}</p>
          )}

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {feedback.strengths.length > 0 && (
              <div className="bg-emerald-50/60 rounded-lg border border-emerald-100 px-4 py-3 dark:bg-emerald-500/10 dark:border-emerald-500/25">
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">良かった点</div>
                <ul className="space-y-1">
                  {feedback.strengths.map((s) => (
                    <li key={s} className="text-xs text-gray-700 leading-relaxed flex gap-1.5">
                      <span className="text-emerald-500">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {feedback.improvements.length > 0 && (
              <div className="bg-eg-faint rounded-lg border border-eg-soft px-4 py-3 dark:border-eg/20">
                <div className="text-[11px] font-semibold text-eg-deep mb-1.5">改善ポイント</div>
                <ul className="space-y-1">
                  {feedback.improvements.map((s) => (
                    <li key={s} className="text-xs text-gray-700 leading-relaxed flex gap-1.5">
                      <span className="text-eg-dark">→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {feedback.improvedVersion && (
            <div className="mt-3 bg-violet-50/60 rounded-lg border border-violet-100 px-4 py-3 dark:bg-violet-500/10 dark:border-violet-500/25">
              <div className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 mb-1">
                ワンランク上の言い直し例
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed italic">{feedback.improvedVersion}</p>
            </div>
          )}

          {feedback.transcript && (
            <div className="mt-3" data-guide-target="grammar-drill">
              {feedback.grammarCorrections && feedback.grammarCorrections.length > 0 ? (
                <GrammarCorrectionExercise
                  items={feedback.grammarCorrections}
                  sourceText={feedback.transcript}
                  heading="エラー修正ドリル — 自分で直してみましょう"
                />
              ) : (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> 文法エラーチェック完了
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">この回答では、修正ドリルにする明確な文法・語法のエラーは見つかりませんでした。</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {task?.sampleAnswers && task.sampleAnswers.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-gray-400 mb-1.5">模範解答</div>
          <div className="flex flex-wrap gap-2">
            {task.sampleAnswers.map((sample) => (
              <button
                key={sample.label}
                onClick={() => setOpenSample(openSample === sample.label ? null : sample.label)}
                className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
                  openSample === sample.label
                    ? "bg-eg text-black border-eg"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>
          {openSample && (
            <div className="mt-2 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {task.sampleAnswers.find((s) => s.label === openSample)?.text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Listen and Repeat: お手本文と発話の語単位比較表示 */
function RepeatDiff({ expected, actual }: { expected: string; actual: string }) {
  // お手本の各語が発話に含まれるか（正規化して順序を無視した簡易判定）
  const actualTokens = new Set(
    actual
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
  const words = expected.split(/\s+/);
  return (
    <p className="text-sm leading-relaxed">
      {words.map((word, i) => {
        const clean = word.toLowerCase().replace(/[^a-z0-9']/g, "");
        const hit = clean.length === 0 || actualTokens.has(clean);
        return (
          <span key={i} className={hit ? "text-emerald-700" : "text-red-500 font-semibold underline decoration-red-300"}>
            {word}{" "}
          </span>
        );
      })}
    </p>
  );
}

/** Listen and Repeat 専用カード: 一致率 + 項目スコア(0-5) */
function RepeatFeedbackCard({
  feedback,
  index,
  recordingUrl,
}: {
  feedback: SpeakingTaskFeedback;
  index: number;
  recordingUrl?: string;
}) {
  const ratio = feedback.matchRatio ?? 0;
  const score = feedback.itemScore ?? 0;
  const good = score >= 4;

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className={`rounded-xl border p-5 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both ${
        feedback.error
          ? "border-gray-200 bg-white dark:border-white/10"
          : good
            ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/10"
            : "border-orange-200 bg-orange-50/30 dark:border-orange-500/30 dark:bg-orange-500/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">文 {index + 1}</span>
        {!feedback.error && (
          <>
            <span className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 tabular-nums">
              一致率 {pct(ratio)}%
            </span>
            <span
              className={`ml-auto text-xs font-bold rounded-full px-3 py-1 tabular-nums ${
                good ? "text-emerald-700 bg-emerald-100" : "text-eg-deep bg-eg-soft"
              }`}
            >
              {score} / 5 点
            </span>
          </>
        )}
      </div>

      {feedback.error ? (
        <div className="mt-3 text-sm text-red-600">解析エラー: {feedback.error}</div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="bg-white rounded-lg border border-gray-200/70 px-4 py-3">
            <div className="text-[11px] font-semibold text-gray-400 mb-1">
              お手本（赤字 = 聞き取れなかった/言えなかった語）
            </div>
            <RepeatDiff expected={feedback.expectedText ?? ""} actual={feedback.transcript} />
          </div>
          <div className="bg-white rounded-lg border border-gray-200/70 px-4 py-3">
            <div className="text-[11px] font-semibold text-gray-400 mb-1">あなたの発話（文字起こし）</div>
            <p className="text-sm text-gray-800 leading-relaxed">
              {feedback.transcript || "—（発話を検出できませんでした）"}
            </p>
          </div>
          <RecordingPlayer url={recordingUrl} />
        </div>
      )}
    </div>
  );
}

// =====================================================================
// ページ本体
// =====================================================================

export default function ResultReportPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId;
  const adminUid = searchParams.get("adminUid");
  const [session, setSession] = useState<PracticeSessionResult | null>(null);
  const [readingSet, setReadingSet] = useState<ReadingSet | null>(null);
  const [listeningSet, setListeningSet] = useState<ListeningSet | null>(null);
  const [speakingSet, setSpeakingSet] = useState<SpeakingSet | null>(null);
  const [recordingUrls, setRecordingUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const version = usePrepDataVersion();

  // 本文ハイライト → チャットに追加
  const [selectionForChat, setSelectionForChat] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [attachedSelections, setAttachedSelections] = useState<AttachedSelection[]>([]);
  const selectionScopeRef = useRef<HTMLDivElement>(null);

  const sampleReport: MockReport | null = SAMPLE_REPORTS.find((r) => r.id === sessionId) ?? null;

  // ドラッグで本文を選択したら「チャットに追加」ボタンを出す（スコープ内のテキストのみ）
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      const scope = selectionScopeRef.current;
      if (!text || !range || !scope) {
        setSelectionForChat(null);
        setSelectionRect(null);
        return;
      }
      const within =
        scope.contains(range.startContainer) && scope.contains(range.endContainer);
      if (
        !within ||
        isNodeWithinInteractive(range.startContainer) ||
        isNodeWithinInteractive(range.endContainer)
      ) {
        setSelectionForChat(null);
        setSelectionRect(null);
        return;
      }
      const r = range.getBoundingClientRect();
      setSelectionForChat(text);
      setSelectionRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    document.addEventListener("mouseup", handler);
    return () => document.removeEventListener("mouseup", handler);
  }, []);

  // 選択が解除されたらボタンを隠す
  useEffect(() => {
    const onChange = () => {
      const sel = window.getSelection();
      if ((!sel || sel.toString().trim() === "") && (selectionForChat || selectionRect)) {
        setSelectionForChat(null);
        setSelectionRect(null);
      }
    };
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, [selectionForChat, selectionRect]);

  const addSelectionToChat = () => {
    if (!selectionForChat) return;
    setAttachedSelections((prev) => [...prev, { id: `att-${Date.now()}`, text: selectionForChat }]);
    window.getSelection()?.removeAllRanges();
    setSelectionForChat(null);
    setSelectionRect(null);
  };

  useEffect(() => {
    if (sampleReport) {
      setLoading(false);
      return;
    }
    const urls: string[] = [];
    const load = async () => {
      const guideFixture = getGuidePracticeSession(sessionId);
      if (guideFixture) {
        setSession(guideFixture.session);
        if (guideFixture.session.skill === "reading") setReadingSet(guideFixture.set as ReadingSet);
        if (guideFixture.session.skill === "listening") setListeningSet(guideFixture.set as ListeningSet);
        if (guideFixture.session.skill === "speaking") setSpeakingSet(guideFixture.set as SpeakingSet);
        setLoading(false);
        return;
      }
      let s = loadSession(sessionId);
      if (adminUid) {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("管理者認証が必要です。");
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/admin/users/${adminUid}/learning-results/${sessionId}?kind=session`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "学習結果を取得できませんでした。");
        s = body.result as PracticeSessionResult;
      }
      setSession(s);
      if (s && s.skill === "reading") {
        setReadingSet(await getReadingSet(s.exam, s.setId));
      } else if (s && s.skill === "listening") {
        setListeningSet(await getListeningSet(s.exam, s.setId));
      } else if (s && s.skill === "speaking") {
        setSpeakingSet(await getSpeakingSet(s.exam, s.setId));
        // 録音の聞き直し（IndexedDB から復元）
        const blobs = adminUid ? new Map<string, Blob>() : await loadRecordings(sessionId);
        const map: Record<string, string> = {};
        blobs.forEach((blob, taskId) => {
          const url = URL.createObjectURL(blob);
          map[taskId] = url;
          urls.push(url);
        });
        setRecordingUrls(map);
        pruneOldRecordings();
      }
      setLoading(false);
    };
    load().catch((error) => { console.error(error); setSession(null); setLoading(false); });
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUid, sessionId, version]);

  const questions = readingSet?.questions ?? listeningSet?.questions ?? [];

  // チャット用の学習コンテキスト
  const chatContext = useMemo(() => {
    if (!session || questions.length === 0) return "";
    const material = readingSet
      ? `【本文: ${readingSet.passageTitle}】\n${readingSet.paragraphs.map((p) => `${p.label ? `[${p.label}] ` : ""}${p.text}`).join("\n\n")}`
      : `【リスニングスクリプト】\n${listeningSet?.transcript ?? ""}${listeningSet?.referenceText ? `\n\n【参照資料】\n${listeningSet.referenceText}` : ""}`;
    const qa = session.results
      .map((r, i) => {
        const q = questions.find((x) => x.id === r.questionId);
        if (!q) return "";
        return `Q${i + 1}: ${q.prompt}\n正解: ${answerText(q.answer)}\n学習者の答え: ${answerText(r.userAnswer)}（${r.correct ? "正解" : "不正解"}）\n解説: ${q.explanation}`;
      })
      .filter(Boolean)
      .join("\n\n");
    return `${material}\n\n【設問と結果】\n${qa}`;
  }, [session, questions, readingSet, listeningSet]);

  if (loading) {
    return (
      <PrepShell>
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-eg" />
        </div>
      </PrepShell>
    );
  }

  // ---- サンプル模試レポート（従来表示のダイジェスト版） ----
  if (sampleReport) {
    return (
      <PrepShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">
          <div>
            <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase">
              {EXAM_LABELS[sampleReport.exam]} — Mock Test Report（サンプル）
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{sampleReport.title}</h1>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center">
            <ScoreGauge
              value={sampleReport.overallScore}
              max={sampleReport.overallMax}
              label={
                sampleReport.exam === "ielts"
                  ? sampleReport.overallScore.toFixed(1)
                  : String(sampleReport.overallScore)
              }
              subLabel={sampleReport.exam === "toefl" ? `/ ${sampleReport.overallMax}` : "Band"}
              colorClass="stroke-eg"
            />
            <p className="mt-3 text-sm text-gray-600 max-w-lg text-center leading-relaxed">
              {sampleReport.tutorComment}
            </p>
          </div>
          <Link href="/overview" className="inline-flex items-center gap-2 text-sm text-eg-deep hover:underline">
            ダッシュボードへ <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </PrepShell>
    );
  }

  if (!session) {
    return (
      <PrepShell>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
          結果が見つかりませんでした。
          <div className="mt-4">
            <Link href="/overview" className="text-eg-deep hover:underline">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </PrepShell>
    );
  }

  // ---- セッション種別ごとの集計 ----
  const isSpeaking = session.skill === "speaking";
  const isRepeat = isSpeaking && speakingSet?.practiceType === "listen-and-repeat";
  const speakingFeedback = session.speakingFeedback ?? [];

  // Listen and Repeat: ETS 準拠（各文 0-5 → 平均がタスクスコア）
  const repeatScores = speakingFeedback
    .filter((f) => !f.error)
    .map((f) => ({ ratio: f.matchRatio ?? 0, score: f.itemScore ?? 0 }));
  const avgRatio =
    repeatScores.length > 0
      ? repeatScores.reduce((a, b) => a + b.ratio, 0) / repeatScores.length
      : 0;
  const avgItemScore =
    repeatScores.length > 0
      ? repeatScores.reduce((a, b) => a + b.score, 0) / repeatScores.length
      : 0;

  // Interview / IELTS Speaking: GPT の Band 推定平均
  const speakingBands = speakingFeedback
    .map((f) => f.bandEstimate)
    .filter((b): b is number => typeof b === "number");
  const speakingAvgBand =
    speakingBands.length > 0
      ? Math.round((speakingBands.reduce((a, b) => a + b, 0) / speakingBands.length) * 2) / 2
      : null;
  const speakingMax = session.exam === "ielts" ? 9 : 6;
  const isIeltsPart1Result = session.exam === "ielts" &&
    (speakingSet?.practiceType === "part-1" || speakingSet?.practiceType === "full-practice");
  const part1Fluencies = speakingFeedback.map((item) => item.fluency).filter((item): item is NonNullable<typeof item> => !!item);
  const average = (values: number[]) => values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  const part1Summary = {
    duration: average(part1Fluencies.map((item) => item.durationSec)),
    wpm: average(part1Fluencies.map((item) => item.wpm)),
    silence: average(part1Fluencies.map((item) => item.pauseRatio)) * 100,
    pauses: part1Fluencies.reduce((sum, item) => sum + item.longPauses, 0),
    fillers: part1Fluencies.reduce((sum, item) => sum + (item.fillerCount ?? 0), 0),
    repetitions: part1Fluencies.reduce((sum, item) => sum + (item.wordRepetitionCount ?? 0), 0),
    corrections: part1Fluencies.reduce((sum, item) => sum + (item.phraseRestartCount ?? 0) + (item.selfCorrectionCount ?? 0), 0),
    startDelay: average(part1Fluencies.map((item) => item.startDelaySec ?? 0)),
  };

  const accuracy = session.totalCount > 0 ? session.correctCount / session.totalCount : 0;
  const durationMin = Math.max(1, Math.round(session.durationSec / 60));

  return (
    <PrepShell>
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div>
          <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase">
            {EXAM_LABELS[session.exam]} {SKILL_LABELS[session.skill]} — Result
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">{session.skill === "reading" ? cleanReadingTitle(session.setTitle) : session.setTitle}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {new Date(session.finishedAt).toLocaleString("ja-JP")} に完了
          </p>
        </div>

        {/* ---- スコアサマリー ---- */}
        <div data-guide-target="result-score" className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500">

          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
            {isRepeat ? (
              <>
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">平均一致率</div>
                <ScoreGauge
                  value={avgRatio * 100}
                  max={100}
                  format={(v) => `${Math.round(v)}%`}
                  subLabel={`タスクスコア ${avgItemScore.toFixed(1)} / 5`}
                  colorClass="stroke-eg"
                />
              </>
            ) : isSpeaking ? (
              speakingAvgBand !== null ? (
                <>
                  <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">推定 Band（KAI）</div>
                  <ScoreGauge
                    value={speakingAvgBand}
                    max={speakingMax}
                    format={(v) => v.toFixed(1)}
                    subLabel={`/ ${speakingMax}（${speakingBands.length} タスク平均）`}
                    colorClass="stroke-eg"
                  />
                </>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                  <div className="font-semibold text-gray-900 dark:text-gray-100">提出完了</div>
                </div>
              )
            ) : (
              <>
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">正答率</div>
                <ScoreGauge
                  value={accuracy * 100}
                  max={100}
                  format={(v) => `${Math.round(v)}%`}
                  subLabel={`${session.correctCount} / ${session.totalCount} 問`}
                  colorClass="stroke-eg"
                />
              </>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 dark:bg-blue-500/15">
              <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {isSpeaking ? "回答タスク数" : "正答数"}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
                {isSpeaking
                  ? `${speakingFeedback.length} / ${session.results.length}`
                  : `${session.correctCount} / ${session.totalCount}`}
              </div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">所要時間 {durationMin} 分</div>
            </div>
          </div>
        </div>

        {/* ---- Speaking: タスク別フィードバック ---- */}
        {isSpeaking && speakingFeedback.length > 0 && (
          <section data-guide-target="speaking-feedback">
            <div className="flex items-center gap-2 mt-6 mb-4">
              <Mic className="w-4 h-4 text-eg-dark" />
              <h2 className="text-lg font-bold text-gray-900">
                {isRepeat ? "文ごとの再現度" : "タスク別 AI フィードバック"}
              </h2>
            </div>
            <div className="space-y-4">
              {isIeltsPart1Result && part1Fluencies.length > 0 && (
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/25 dark:bg-violet-500/10">
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Part 1 全{speakingFeedback.length}問のまとめ</h3>
                    <span className="text-[10px] text-gray-400">時間・速度・無音・話し始めは平均、回数は合計</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-8">
                    {[
                      { label: "平均回答時間", value: `${part1Summary.duration.toFixed(1)}秒` },
                      { label: "平均発話速度", value: `${Math.round(part1Summary.wpm)} WPM` },
                      { label: "平均無音", value: `${Math.round(part1Summary.silence)}%` },
                      { label: "合計ポーズ", value: `${part1Summary.pauses}回` },
                      { label: "合計フィラー", value: `${part1Summary.fillers}回` },
                      { label: "合計繰り返し", value: `${part1Summary.repetitions}回` },
                      { label: "合計言い直し", value: `${part1Summary.corrections}回` },
                      { label: "平均話し始め", value: `${part1Summary.startDelay.toFixed(1)}秒` },
                    ].map((metric) => (
                      <div key={metric.label} className="min-w-0 rounded-lg border border-white/70 bg-white px-2 py-2 dark:border-white/10 dark:bg-gray-900/70">
                        <div className="truncate text-[9px] text-gray-400">{metric.label}</div>
                        <div className="truncate text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {speakingFeedback.map((feedback, i) =>
                isRepeat ? (
                  <RepeatFeedbackCard
                    key={feedback.taskId}
                    feedback={feedback}
                    index={i}
                    recordingUrl={recordingUrls[feedback.taskId]}
                  />
                ) : (
                  <SpeakingFeedbackCard
                    key={feedback.taskId}
                    feedback={feedback}
                    set={speakingSet}
                    index={i}
                    recordingUrl={recordingUrls[feedback.taskId]}
                  />
                )
              )}
            </div>
          </section>
        )}

        {/* ---- Reading / Listening: 教材 + 解答結果 + KAI チャット ---- */}
        {!isSpeaking && questions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px] gap-5 items-start">
            <div ref={selectionScopeRef} className="min-w-0 space-y-5 select-text">
              <div data-guide-target="result-material"><MaterialCard readingSet={readingSet} listeningSet={listeningSet} /></div>

              <section data-guide-target="answer-review">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">解答結果</h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {session.correctCount} / {session.totalCount} 問正解
                  </span>
                </div>
                <div className="space-y-3">
                  {session.results.map((r, i) => {
                    const question = questions.find((q) => q.id === r.questionId);
                    if (!question) return null;
                    return (
                      <QuestionReviewCard
                        key={r.questionId}
                        question={question}
                        userAnswer={r.userAnswer}
                        correct={r.correct}
                        index={i}
                      />
                    );
                  })}
                </div>
              </section>
            </div>

            <div data-guide-target="result-chat"><ChatPanel
              context={chatContext}
              attachedSelections={attachedSelections}
              setAttachedSelections={setAttachedSelections}
            /></div>
          </div>
        )}

        {/* 本文ハイライト時の「チャットに追加」フローティングボタン */}
        {selectionForChat && selectionRect && (
          <div
            className="fixed z-50 -translate-x-1/2"
            style={{
              left: selectionRect.left + selectionRect.width / 2,
              top: Math.max(8, selectionRect.top - 44),
            }}
          >
            <button
              onClick={addSelectionToChat}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold px-3 py-2 shadow-lg border border-gray-700 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:border-white/20 dark:hover:bg-white"
            >
              <MessageSquarePlus className="w-4 h-4" />
              チャットに追加
            </button>
          </div>
        )}

        {/* ---- アクション ---- */}
        {/* NOTE: 復習リスト（/review）への導線は現在 hide 中。
            復習ページを再開する場合は、!isSpeaking && totalCount > correctCount の
            条件で /review へのボタンをここに復活させる。 */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={
              session.practiceType
                ? `/practice/${session.exam}/${session.skill}?type=${session.practiceType}`
                : "/home"
            }
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 transition-colors dark:bg-white/5 dark:border-white/15 dark:text-gray-200 dark:hover:border-white/30"
          >
            もう一度解く
          </Link>
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 transition-colors dark:bg-white/5 dark:border-white/15 dark:text-gray-200 dark:hover:border-white/30"
          >
            ダッシュボードへ <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PrepShell>
  );
}
