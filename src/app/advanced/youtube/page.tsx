"use client";

// Advanced: YouTube Writing（新仕様）
// 好きな YouTube 動画を選び、その要約 / 意見を英語で書いて AI 添削を受ける。
//   検索/URL → 動画選択 → 字幕（貼り付け or 自動取得）→ 要約/意見を記述 → 提出 → AI 添削
// 既存の YouTube API（search / video-info / transcript）と analyze-youtuber を再利用し、
// 文法添削は共通の GrammarCorrectionExercise で「自分で直す」形式に。

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Search,
  Send,
  Sparkles,
  Youtube,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import GrammarCorrectionExercise from "@/components/prep/GrammarCorrectionExercise";
import SubmitQuiz from "@/components/prep/SubmitQuiz";
import { writingCorrectionsToItems } from "@/lib/prep/grammar";
import { WritingGrammarCorrection } from "@/lib/prep/types";
import type { YouTubeVideo } from "@/lib/types";

type Phase = "search" | "compose" | "analyzing" | "result";
type TaskType = "summary" | "opinion";

interface QualityBlock {
  goodPoints: string[];
  improvements: string[];
  suggestions: string[];
}
interface YouTuberFeedback {
  summaryQuality?: QualityBlock;
  opinionQuality?: QualityBlock;
  grammarCorrections?: { corrections?: WritingGrammarCorrection[] };
  sampleAnswer?: string;
}

/** YouTube URL / ID から videoId を抽出 */
function extractVideoId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export default function YouTubeWritingPage() {
  const [phase, setPhase] = useState<Phase>("search");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [transcript, setTranscript] = useState("");
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>("summary");
  const [essay, setEssay] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<YouTuberFeedback | null>(null);

  const wordCount = useMemo(() => essay.trim().split(/\s+/).filter(Boolean).length, [essay]);

  // ---- 検索 ----
  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearchError(null);
    // URL / ID が貼られた場合は video-info で1件取得
    const vid = extractVideoId(q);
    setSearching(true);
    try {
      if (vid) {
        const res = await fetch(`/api/youtube/video-info?videoId=${vid}`);
        const data = await res.json();
        if (res.ok && data.video) setVideos([data.video]);
        else setSearchError("動画情報を取得できませんでした。");
      } else {
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&maxResults=12`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.videos)) {
          setVideos(data.videos);
          if (data.videos.length === 0) setSearchError("該当する動画が見つかりませんでした。");
        } else {
          setSearchError(data.error ?? "検索に失敗しました。");
        }
      }
    } catch {
      setSearchError("検索に失敗しました。");
    } finally {
      setSearching(false);
    }
  };

  const selectVideo = (v: YouTubeVideo) => {
    setVideo(v);
    setTranscript((v.description ?? "").replace(/\s+/g, " ").trim());
    setEssay("");
    setFeedback(null);
    setSubmitError(null);
    setPhase("compose");
    void autoFetchTranscript(v.id);
  };

  const autoFetchTranscript = async (videoId: string) => {
    setFetchingTranscript(true);
    try {
      const res = await fetch(`/api/youtube/transcript?videoId=${videoId}`);
      const data = await res.json();
      if (data?.success && typeof data.transcript === "string" && data.transcript.length > 50) {
        setTranscript(data.transcript);
      }
    } catch {
      // 自動取得に失敗しても手動で貼り付けられる
    } finally {
      setFetchingTranscript(false);
    }
  };

  // ---- 提出 ----
  const handleSubmit = async () => {
    if (!video || essay.trim().length === 0) return;
    setPhase("analyzing");
    setSubmitError(null);
    try {
      const res = await fetch("/api/analyze-youtuber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayText: essay,
          videoTitle: video.title,
          videoDescription: video.description,
          taskType,
          transcript: transcript || undefined,
        }),
      });
      const json = (await res.json()) as YouTuberFeedback & { error?: string };
      if (!res.ok) throw new Error(json?.error ?? "添削に失敗しました");
      setFeedback(json);
      setPhase("result");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "添削に失敗しました");
      setPhase("compose");
    }
  };

  const resetAll = () => {
    setPhase("search");
    setVideo(null);
    setVideos([]);
    setQuery("");
    setEssay("");
    setFeedback(null);
  };

  return (
    <PrepShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-2 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <Youtube className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-gray-900">YouTube Writing</h1>
              <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5">
                AI添削
              </span>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">
              好きな動画を選んで、その要約・意見を英語で書き、AI 添削を受けましょう。
            </p>
          </div>
          <Link href="/advanced" className="text-sm text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Advanced
          </Link>
        </div>

        {/* ---- 検索フェーズ ---- */}
        {phase === "search" && (
          <div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="キーワード または YouTube URL を入力"
                  className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-eg"
                />
              </div>
              <Button onClick={runSearch} disabled={searching} className="bg-eg hover:bg-eg-dark text-black">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "検索"}
              </Button>
            </div>
            {searchError && <p className="mt-3 text-sm text-gray-500">{searchError}</p>}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectVideo(v)}
                  className="group text-left bg-white rounded-xl border border-gray-200/70 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {v.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                      {v.title}
                    </div>
                    <div className="mt-1 text-xs text-gray-400 truncate">{v.channelTitle}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---- 作成フェーズ ---- */}
        {phase === "compose" && video && (
          <div className="space-y-4">
            <button
              onClick={() => setPhase("search")}
              className="text-sm text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> 動画を選び直す
            </button>

            {/* 動画情報 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4">
              {video.thumbnailUrl && (
                <Image
                  src={video.thumbnailUrl}
                  alt=""
                  width={160}
                  height={90}
                  unoptimized
                  className="w-40 h-auto rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 leading-snug">{video.title}</div>
                <div className="mt-1 text-xs text-gray-400">{video.channelTitle}</div>
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <Youtube className="w-3.5 h-3.5" /> YouTube で見る
                </a>
              </div>
            </div>

            {/* タスクタイプ */}
            <div className="flex gap-2">
              {(["summary", "opinion"] as TaskType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTaskType(t)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                    taskType === t
                      ? "border-eg bg-eg-faint"
                      : "border-gray-200/70 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900">
                    {t === "summary" ? "Summary（要約）" : "Opinion（意見）"}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {t === "summary" ? "動画の要点をまとめる" : "動画について自分の意見を述べる"}
                  </div>
                </button>
              ))}
            </div>

            {/* 字幕 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500">
                  字幕・文字起こし（添削精度が上がります）
                </div>
                {fetchingTranscript && (
                  <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> 自動取得中...
                  </span>
                )}
              </div>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="字幕が自動取得できない場合は、ここに貼り付けてください（任意）"
                className="min-h-[6rem] text-xs leading-relaxed"
              />
            </div>

            {/* 回答 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-700">
                  Your {taskType === "summary" ? "Summary" : "Opinion"}
                </div>
                <div className="text-xs text-gray-400">{wordCount} words</div>
              </div>
              <Textarea
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder={
                  taskType === "summary"
                    ? "Summarize the video in English..."
                    : "Share your opinion about the video in English..."
                }
                className="min-h-[16rem] text-sm leading-relaxed"
              />
              {submitError && <p className="mt-3 text-sm text-red-600">添削エラー: {submitError}</p>}
              <Button
                className="mt-4 bg-eg hover:bg-eg-dark text-black self-end"
                onClick={handleSubmit}
                disabled={essay.trim().length === 0}
              >
                <Send className="w-4 h-4 mr-1.5" /> 提出して添削を受ける
              </Button>
            </div>
          </div>
        )}

        {/* ---- 添削中フェーズ ---- */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center gap-6 py-10">
            <div className="flex items-center gap-2 text-eg-deep">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-semibold">AI が添削しています…</span>
            </div>
            <SubmitQuiz />
          </div>
        )}

        {/* ---- 結果フェーズ ---- */}
        {phase === "result" && feedback && (
          <YouTubeResult
            feedback={feedback}
            essay={essay}
            taskType={taskType}
            onRetry={() => setPhase("compose")}
            onNew={resetAll}
          />
        )}
      </div>
    </PrepShell>
  );
}

function QualityList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" | "tip" }) {
  if (!items || items.length === 0) return null;
  const color =
    tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-orange-700" : "text-blue-700";
  const dot = tone === "good" ? "bg-emerald-400" : tone === "bad" ? "bg-orange-400" : "bg-blue-400";
  return (
    <div>
      <div className={`text-xs font-semibold mb-2 ${color}`}>{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function YouTubeResult({
  feedback,
  essay,
  taskType,
  onRetry,
  onNew,
}: {
  feedback: YouTuberFeedback;
  essay: string;
  taskType: TaskType;
  onRetry: () => void;
  onNew: () => void;
}) {
  const quality = taskType === "summary" ? feedback.summaryQuality : feedback.opinionQuality;
  const items = writingCorrectionsToItems(feedback.grammarCorrections?.corrections ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle2 className="w-5 h-5" />
        <h2 className="text-base font-semibold text-gray-900">添削結果</h2>
      </div>

      {quality && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <QualityList title="良かった点" items={quality.goodPoints} tone="good" />
          <QualityList title="改善点" items={quality.improvements} tone="bad" />
          <QualityList title="提案" items={quality.suggestions} tone="tip" />
        </div>
      )}

      {/* 文法修正（自分で直す） */}
      {items.length > 0 && (
        <GrammarCorrectionExercise
          items={items}
          sourceText={essay}
          heading="文法チューター — 自分で直してみましょう"
        />
      )}

      {/* 解答例 */}
      {feedback.sampleAnswer && (
        <div className="bg-white rounded-2xl border border-violet-100 p-6">
          <h3 className="text-base font-semibold text-violet-700 mb-2 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5" /> 解答例
          </h3>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {feedback.sampleAnswer}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="outline" onClick={onRetry}>
          <Lightbulb className="w-4 h-4 mr-1.5" /> 書き直す
        </Button>
        <Button className="bg-eg hover:bg-eg-dark text-black" onClick={onNew}>
          別の動画で書く
        </Button>
      </div>
    </div>
  );
}
