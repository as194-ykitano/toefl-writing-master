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
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Headphones,
  ListChecks,
  Loader2,
  Mic,
  RotateCcw,
  Send,
  Sparkles,
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
import { loadRecordings, pruneOldRecordings } from "@/lib/prep/recording-store";
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
      className={`rounded-xl border p-5 ${
        correct ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"
      }`}
    >
      <div className="flex items-start gap-3">
        {correct ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-gray-900">Q{index + 1}</span>
            {question.reference && (
              <span className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                {question.reference}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {question.prompt}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg border border-gray-200/70 px-3 py-2">
              <div className="text-[11px] font-medium text-gray-400">あなたの答え</div>
              <div className={`font-medium ${correct ? "text-emerald-700" : "text-red-600"}`}>
                {answerText(userAnswer)}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200/70 px-3 py-2">
              <div className="text-[11px] font-medium text-gray-400">正解</div>
              <div className="font-medium text-gray-900">{answerText(question.answer)}</div>
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
                        ? "border-emerald-300 bg-emerald-50"
                        : isSelected
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="text-gray-800 leading-relaxed flex-1">{option}</span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      {isCorrectOption && (
                        <span className="text-[10px] font-semibold text-emerald-600">Correct</span>
                      )}
                      {isSelected && <span className="text-[10px] text-gray-400">You</span>}
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
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          {listeningSet ? (
            <>
              <Headphones className="w-4 h-4 text-violet-500" /> 音声とスクリプト
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

function ChatPanel({ context }: { context: string }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] min-h-[420px]">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-eg flex items-center justify-center">
          <Bot className="w-4 h-4 text-black" />
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-sm">AI コーチに質問</div>
          <div className="text-[11px] text-gray-400">本文・設問・解説をふまえて答えます</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              わからなかった単語や、解説で納得できない部分を聞いてみましょう。
            </p>
            {CHAT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full text-left text-xs text-eg-deep bg-eg-faint hover:bg-eg-soft border border-eg-soft rounded-lg px-3 py-2 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                m.role === "user"
                  ? "bg-eg text-black rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
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
        className="flex items-center gap-2 px-4 py-3 border-t border-gray-100"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="質問を入力..."
          className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-eg/50 focus:border-eg"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-xl bg-eg hover:bg-eg-dark text-black disabled:opacity-40"
          aria-label="送信"
        >
          <Send className="w-4 h-4" />
        </button>
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
    <div className="rounded-xl border border-gray-200 bg-white p-5">
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
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: "回答時間", value: `${feedback.fluency.durationSec} 秒` },
                { label: "発話速度", value: `${feedback.fluency.wpm} WPM` },
                { label: "無音割合", value: `${Math.round(feedback.fluency.pauseRatio * 100)}%` },
                { label: "長いポーズ", value: `${feedback.fluency.longPauses} 回` },
                { label: "フィラー", value: `${feedback.fluency.fillerCount ?? 0} 回` },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2">
                  <div className="text-[10px] text-gray-400">{m.label}</div>
                  <div className="text-sm font-bold text-gray-900 tabular-nums">{m.value}</div>
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
            />
          )}

          {feedback.summary && (
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">{feedback.summary}</p>
          )}

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {feedback.strengths.length > 0 && (
              <div className="bg-emerald-50/60 rounded-lg border border-emerald-100 px-4 py-3">
                <div className="text-[11px] font-semibold text-emerald-700 mb-1.5">良かった点</div>
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
              <div className="bg-eg-faint rounded-lg border border-eg-soft px-4 py-3">
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
            <div className="mt-3 bg-violet-50/60 rounded-lg border border-violet-100 px-4 py-3">
              <div className="text-[11px] font-semibold text-violet-700 mb-1">
                ワンランク上の言い直し例
              </div>
              <p className="text-sm text-gray-800 leading-relaxed italic">{feedback.improvedVersion}</p>
            </div>
          )}

          {feedback.grammarCorrections && feedback.grammarCorrections.length > 0 && (
            <div className="mt-3">
              <GrammarCorrectionExercise
                items={feedback.grammarCorrections}
                sourceText={feedback.transcript}
                heading="文法チューター — 自分で直してみましょう"
              />
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
      className={`rounded-xl border p-5 ${
        feedback.error
          ? "border-gray-200 bg-white"
          : good
            ? "border-emerald-200 bg-emerald-50/40"
            : "border-orange-200 bg-orange-50/30"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-900">文 {index + 1}</span>
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
  const sessionId = params.sessionId;
  const [session, setSession] = useState<PracticeSessionResult | null>(null);
  const [readingSet, setReadingSet] = useState<ReadingSet | null>(null);
  const [listeningSet, setListeningSet] = useState<ListeningSet | null>(null);
  const [speakingSet, setSpeakingSet] = useState<SpeakingSet | null>(null);
  const [recordingUrls, setRecordingUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const sampleReport: MockReport | null = SAMPLE_REPORTS.find((r) => r.id === sessionId) ?? null;

  useEffect(() => {
    if (sampleReport) {
      setLoading(false);
      return;
    }
    const s = loadSession(sessionId);
    setSession(s);
    const urls: string[] = [];
    const load = async () => {
      if (s && s.skill === "reading") {
        setReadingSet(await getReadingSet(s.exam, s.setId));
      } else if (s && s.skill === "listening") {
        setListeningSet(await getListeningSet(s.exam, s.setId));
      } else if (s && s.skill === "speaking") {
        setSpeakingSet(await getSpeakingSet(s.exam, s.setId));
        // 録音の聞き直し（IndexedDB から復元）
        const blobs = await loadRecordings(sessionId);
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
    load();
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

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

  const accuracy = session.totalCount > 0 ? session.correctCount / session.totalCount : 0;
  const durationMin = Math.max(1, Math.round(session.durationSec / 60));

  return (
    <PrepShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div>
          <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase">
            {EXAM_LABELS[session.exam]} {SKILL_LABELS[session.skill]} — Result
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{session.setTitle}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date(session.finishedAt).toLocaleString("ja-JP")} に完了
          </p>
        </div>

        {/* ---- スコアサマリー ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center justify-center">
            {isRepeat ? (
              <>
                <div className="text-xs font-medium text-gray-400 mb-3">平均一致率</div>
                <ScoreGauge
                  value={avgRatio * 100}
                  max={100}
                  label={`${pct(avgRatio)}%`}
                  subLabel={`タスクスコア ${avgItemScore.toFixed(1)} / 5`}
                  colorClass="stroke-eg"
                />
              </>
            ) : isSpeaking ? (
              speakingAvgBand !== null ? (
                <>
                  <div className="text-xs font-medium text-gray-400 mb-3">推定 Band（AI）</div>
                  <ScoreGauge
                    value={speakingAvgBand}
                    max={speakingMax}
                    label={speakingAvgBand.toFixed(1)}
                    subLabel={`/ ${speakingMax}（${speakingBands.length} タスク平均）`}
                    colorClass="stroke-eg"
                  />
                </>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                  <div className="font-semibold text-gray-900">提出完了</div>
                </div>
              )
            ) : (
              <>
                <div className="text-xs font-medium text-gray-400 mb-3">正答率</div>
                <ScoreGauge
                  value={accuracy * 100}
                  max={100}
                  label={`${pct(accuracy)}%`}
                  subLabel={`${session.correctCount} / ${session.totalCount} 問`}
                  colorClass="stroke-eg"
                />
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <ListChecks className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-400">{isSpeaking ? "回答タスク数" : "正答数"}</div>
              <div className="text-xl font-bold text-gray-900 tabular-nums">
                {isSpeaking
                  ? `${speakingFeedback.length} / ${session.results.length}`
                  : `${session.correctCount} / ${session.totalCount}`}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">所要時間 {durationMin} 分</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-eg-faint to-orange-50 rounded-2xl border border-eg-soft p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-eg-dark" />
              <span className="text-xs font-semibold text-gray-700">スコアについて</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {isRepeat
                ? "実際の TOEFL では各文が 0〜5 点で採点され、7 文の平均が Listen and Repeat のタスクスコアになります（Interview と合わせて Speaking Band 1〜6 に換算）。"
                : isSpeaking
                  ? "Band は AI による参考推定です。実際の採点は複数タスクの平均と専門の採点基準に基づきます。"
                  : "Band 換算は 40 問構成のフルテストを前提とした統計処理のため、練習セットでは正答率を表示しています。Band 判定は模試機能（開発予定）で行います。"}
            </p>
          </div>
        </div>

        {/* ---- Speaking: タスク別フィードバック ---- */}
        {isSpeaking && speakingFeedback.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mt-6 mb-4">
              <Mic className="w-4 h-4 text-eg-dark" />
              <h2 className="text-lg font-bold text-gray-900">
                {isRepeat ? "文ごとの再現度" : "タスク別 AI フィードバック"}
              </h2>
            </div>
            <div className="space-y-4">
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

        {/* ---- Reading / Listening: 教材 + 解答結果 + AI チャット ---- */}
        {!isSpeaking && questions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2 space-y-5">
              <MaterialCard readingSet={readingSet} listeningSet={listeningSet} />

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">解答結果</h2>
                  <span className="text-xs text-gray-400">
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

            <ChatPanel context={chatContext} />
          </div>
        )}

        {/* ---- アクション ---- */}
        <div className="flex flex-wrap gap-3 pt-2">
          {!isSpeaking && session.totalCount > session.correctCount && (
            <Link
              href="/review"
              className="inline-flex items-center gap-2 rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-5 py-3 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> 間違えた問題を復習リストへ
            </Link>
          )}
          <Link
            href={`/practice/${session.exam}/${session.skill}`}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 transition-colors"
          >
            もう一度解く
          </Link>
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 transition-colors"
          >
            ダッシュボードへ <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PrepShell>
  );
}
