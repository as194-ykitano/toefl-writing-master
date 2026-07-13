"use client";

// Writing 添削結果ページ（後から見返せる）
// localStorage（writing-store）に保存された WritingResult を読み込み、
// 旧 Writing Masters 版と同等の深さで表示する:
//   総合スコア + 観点別スコア / 本文の文法インラインハイライト /
//   総評・長所・改善点 / General Description / 具体的な改善提案 / 文法修正一覧 / 解答例

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { loadWritingResult } from "@/lib/prep/writing-store";
import { auth } from "@/lib/firebase";
import { usePrepDataVersion } from "@/lib/prep/use-prep-data";
import GrammarCorrectionExercise from "@/components/prep/GrammarCorrectionExercise";
import Reveal from "@/components/prep/Reveal";
import CountUp from "@/components/prep/CountUp";
import { writingCorrectionsToItems } from "@/lib/prep/grammar";
import {
  EXAM_LABELS,
  WritingResult,
  WritingSpecificSuggestion,
} from "@/lib/prep/types";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function suggestionToText(s: string | WritingSpecificSuggestion): {
  title?: string;
  body: string;
} {
  if (typeof s === "string") return { body: s };
  const body = [s.description, s.implementation, s.example, s.reasoning]
    .filter(Boolean)
    .join(" / ");
  return { title: s.title, body: body || s.title || "" };
}

// 本文に文法エラーの「位置」と「種類」だけをインラインで示す。
// ここでは修正後の答えを見せない（下の「エラー修正ドリル」でカンニングにならないように）。
// ホバー/タップで表示するのはエラーの種類（category）のみ。
function HighlightedEssay({
  content,
  corrections,
}: {
  content: string;
  corrections: WritingResult["feedback"]["grammarCorrections"];
}) {
  if (!corrections || corrections.length === 0) {
    return (
      <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
        {content}
      </div>
    );
  }

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let segIndex = 0;
  const contentLength = content.length;
  const sorted = [...corrections]
    .filter((c) => typeof c.startIndex === "number" && typeof c.endIndex === "number")
    .map((c) => ({
      ...c,
      startIndex: Math.max(0, Math.min(contentLength, c.startIndex)),
      endIndex: Math.max(0, Math.min(contentLength, c.endIndex)),
    }))
    .filter((c) => c.endIndex > c.startIndex)
    .sort((a, b) => a.startIndex - b.startIndex);

  sorted.forEach((correction, index) => {
    if (correction.startIndex < lastIndex) return;
    if (correction.startIndex > lastIndex) {
      elements.push(
        <span key={`seg-${segIndex++}`}>
          {content.slice(lastIndex, correction.startIndex)}
        </span>
      );
    }
    const highlighted = content.slice(correction.startIndex, correction.endIndex);
    const category = correction.category?.trim();
    elements.push(
      <Tooltip key={`c-${index}`}>
        <TooltipTrigger asChild>
          <span
            className="bg-amber-200/70 text-black cursor-help transition-colors duration-200 hover:bg-amber-300/80 rounded-sm px-0.5 underline decoration-dotted decoration-amber-500 underline-offset-2"
          >
            {highlighted}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-white shadow-lg border border-gray-200 rounded-lg p-3 dark:bg-gray-800 dark:border-white/10">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {category ? `エラーの種類: ${category}` : "文法エラー"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            修正は下の「エラー修正ドリル」で自分で直してみましょう。
          </p>
        </TooltipContent>
      </Tooltip>
    );
    lastIndex = correction.endIndex;
  });

  if (lastIndex < content.length) {
    elements.push(<span key={`seg-${segIndex}`}>{content.slice(lastIndex)}</span>);
  }

  return (
    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
      {elements}
    </div>
  );
}

function PointList({
  items,
  variant,
}: {
  items: string[];
  variant: "good" | "bad";
}) {
  const Icon = variant === "good" ? CheckCircle : AlertCircle;
  const color = variant === "good" ? "text-emerald-500" : "text-orange-500";
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <Icon className={`h-4.5 w-4.5 ${color} mt-0.5 flex-shrink-0`} />
          <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function WritingResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const searchParams = useSearchParams();
  const adminUid = searchParams.get("adminUid");
  const [result, setResult] = useState<WritingResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [growBars, setGrowBars] = useState(false);
  const version = usePrepDataVersion();

  useEffect(() => {
    if (!adminUid) {
      setResult(loadWritingResult(resultId));
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("管理者認証が必要です。");
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/admin/users/${adminUid}/learning-results/${resultId}?kind=writing`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "添削結果を取得できませんでした。");
        if (!cancelled) setResult(body.result as WritingResult);
      } catch (error) {
        console.error(error);
        if (!cancelled) setResult(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [adminUid, resultId, version]);

  // 観点別スコアの横棒バーを 0 → 値へ伸ばすアニメーション（初期表示時に一度だけ）
  useEffect(() => {
    if (!result) return;
    setGrowBars(false);
    const t = window.setTimeout(() => setGrowBars(true), 80);
    return () => window.clearTimeout(t);
  }, [result]);

  if (!loaded) {
    return (
      <PrepShell>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400 text-sm">
          読み込み中...
        </div>
      </PrepShell>
    );
  }

  if (!result) {
    return (
      <PrepShell>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">添削結果が見つかりませんでした。</p>
          <p className="text-xs text-gray-400 mt-2">
            結果はこのブラウザに保存されます。別の端末・ブラウザでは表示できません。
          </p>
          <Link href="/home" className="inline-block mt-4 text-eg-deep hover:underline text-sm">
            ホームに戻る
          </Link>
        </div>
      </PrepShell>
    );
  }

  const fb = result.feedback;
  const listHref = `/practice/${result.exam}/writing`;

  return (
    <PrepShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={listHref}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Writing 一覧に戻る
        </Link>

        <div className="flex flex-wrap items-center gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <span className="text-[10px] font-semibold tracking-wider uppercase bg-eg-soft text-eg-deep rounded px-2 py-1">
            {EXAM_LABELS[result.exam]}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(result.finishedAt).toLocaleString("ja-JP")} ・ 語数 {result.wordCount} words ・
            所要 {formatDuration(result.durationSec)}
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {result.title}
        </h1>

        {/* エラー時 */}
        {fb.error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/25 dark:text-red-300">
            添削エラー: {fb.error}
          </div>
        )}

        {/* スコア */}
        <Reveal className="mt-6 glass-card rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-eg-dark" /> スコア
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            <div className="text-center sm:border-r sm:border-gray-100 dark:sm:border-white/10">
              <CountUp
                value={fb.score}
                format={(n) => n.toFixed(fb.scoreMax === 9 ? 1 : 2)}
                className="text-4xl font-bold text-eg-dark dark:text-eg"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {fb.scoreLabel} / {fb.scoreMax}
              </div>
            </div>
            <div className="sm:col-span-2 space-y-2.5">
              {fb.scoreItems.map((item, i) => (
                <div key={item.label}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {item.score} <span className="text-gray-400 dark:text-gray-500 text-xs">/ {item.max}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden dark:bg-white/10">
                    <div
                      className="h-full bg-eg rounded-full transition-[width] duration-700 ease-out"
                      style={{
                        width: growBars ? `${Math.min(100, (item.score / item.max) * 100)}%` : "0%",
                        transitionDelay: `${i * 90}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* 要件チェック（Email） */}
        {fb.requirementsCheck && fb.requirementsCheck.length > 0 && (
          <div className="mt-4 glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
            <h2 className="text-base font-semibold text-gray-900 mb-3">要件の達成状況</h2>
            <PointList items={fb.requirementsCheck} variant="good" />
          </div>
        )}

        {/* 本文（文法ハイライト） */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">あなたの回答</h2>
            {fb.grammarCorrections.length > 0 && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                ハイライト部分にカーソルを合わせるとエラーの種類が表示されます
              </span>
            )}
          </div>
          <TooltipProvider>
            <HighlightedEssay content={result.content} corrections={fb.grammarCorrections} />
          </TooltipProvider>
        </div>

        {/* 総評 */}
        {fb.overall && (
          <div className="mt-4 glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
            <h2 className="text-base font-semibold text-gray-900 mb-2">総合評価</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{fb.overall}</p>
          </div>
        )}

        {/* 長所・改善点 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {fb.strengths.length > 0 && (
            <div className="glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
              <h3 className="text-sm font-semibold text-emerald-700 mb-3">良かった点</h3>
              <PointList items={fb.strengths} variant="good" />
            </div>
          )}
          {fb.improvements.length > 0 && (
            <div className="glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
              <h3 className="text-sm font-semibold text-orange-700 mb-3">改善点</h3>
              <PointList items={fb.improvements} variant="bad" />
            </div>
          )}
        </div>

        {/* Topic Development */}
        {fb.topicDevelopment &&
          (fb.topicDevelopment.goodPoints.length > 0 ||
            fb.topicDevelopment.improvements.length > 0) && (
            <div className="mt-4 glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Topic Development</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">良い点</div>
                  <PointList items={fb.topicDevelopment.goodPoints} variant="good" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">改善点</div>
                  <PointList items={fb.topicDevelopment.improvements} variant="bad" />
                </div>
              </div>
            </div>
          )}

        {/* General Description */}
        {fb.generalDescription &&
          (fb.generalDescription.goodPoints.length > 0 ||
            fb.generalDescription.improvements.length > 0) && (
            <div className="mt-4 glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
              <h2 className="text-base font-semibold text-gray-900 mb-4">General Description</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">良い点</div>
                  <PointList items={fb.generalDescription.goodPoints} variant="good" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">改善点</div>
                  <PointList items={fb.generalDescription.improvements} variant="bad" />
                </div>
              </div>
            </div>
          )}

        {/* 具体的な改善提案 */}
        {fb.specificSuggestions && fb.specificSuggestions.length > 0 && (
          <div className="mt-4 glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
            <h2 className="text-base font-semibold text-gray-900 mb-3">具体的な改善提案</h2>
            <ul className="space-y-3">
              {fb.specificSuggestions.map((s, i) => {
                const { title, body } = suggestionToText(s);
                return (
                  <li key={i} className="flex items-start gap-2">
                    <Lightbulb className="h-4.5 w-4.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      {title && <div className="text-sm font-semibold text-gray-800">{title}</div>}
                      <p className="text-sm text-gray-700 leading-relaxed">{body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 文法修正エクササイズ（1問ずつタイピングで直す） */}
        {fb.grammarCorrections.length > 0 && (
          <div className="mt-4">
            <GrammarCorrectionExercise
              items={writingCorrectionsToItems(fb.grammarCorrections)}
              sourceText={result.content}
              heading="エラー修正ドリル — 自分で直してみましょう"
            />
          </div>
        )}

        {/* 改善版（Email） */}
        {fb.improvedVersion && (
          <div className="mt-4 glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
            <h2 className="text-base font-semibold text-violet-700 dark:text-violet-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5" /> 1 ランク上の改善版
            </h2>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line italic">
              {fb.improvedVersion}
            </p>
          </div>
        )}

        {/* 解答例 */}
        {fb.sampleAnswer && (
          <details className="mt-4 glass-card rounded-2xl p-6">
            <summary className="text-sm font-semibold text-eg-deep dark:text-amber-300 cursor-pointer">
              解答例を表示
            </summary>
            <p className="mt-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
              {fb.sampleAnswer}
            </p>
          </details>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={listHref}
            className="inline-flex items-center rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 dark:bg-white/5 dark:border-white/15 dark:text-gray-200 dark:hover:border-white/30"
          >
            Writing 一覧に戻る
          </Link>
          <Link
            href={`/practice/${result.exam}/writing/${result.setId}?mode=practice`}
            className="inline-flex items-center rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-5 py-3"
          >
            もう一度挑戦する
          </Link>
        </div>
      </div>
    </PrepShell>
  );
}
