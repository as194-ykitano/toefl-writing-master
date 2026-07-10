"use client";

// Speaking の文字起こし解析ビュー（発話の癖を可視化）
// トグルで「フィラー」「長いポーズ」の着色を切り替える（常時着色は見にくいので任意表示）。
// speechWords（語ごとの直前ポーズ長）があればポーズ位置を、無くても本文からフィラーは着色できる。

import { useMemo, useState } from "react";
import { Pause, Zap } from "lucide-react";

interface SpeechWord {
  w: string;
  gap: number;
}

interface SpeakingTranscriptViewProps {
  transcript: string;
  speechWords?: SpeechWord[];
  fillerCount?: number;
  longPauses?: number;
}

const FILLER_RE = /^(um+|uh+|er+m?|ah+|hmm+|mm+)$/i;
const LONG_PAUSE = 1.0;

function isFiller(word: string): boolean {
  return FILLER_RE.test(word.trim().replace(/[^a-zA-Z]/g, ""));
}

export default function SpeakingTranscriptView({
  transcript,
  speechWords,
  fillerCount,
  longPauses,
}: SpeakingTranscriptViewProps) {
  const [showFiller, setShowFiller] = useState(false);
  const [showPause, setShowPause] = useState(false);

  // speechWords が無ければ本文をスペース分割してフィラーのみ着色可能に
  const words: SpeechWord[] = useMemo(() => {
    if (speechWords && speechWords.length > 0) return speechWords;
    return transcript
      .split(/(\s+)/)
      .filter((t) => t.trim().length > 0)
      .map((w) => ({ w, gap: 0 }));
  }, [speechWords, transcript]);

  const hasPauseData = !!(speechWords && speechWords.length > 0);

  if (!transcript) return null;

  return (
    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-[11px] font-semibold text-gray-400">あなたの回答（文字起こし）</div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFiller((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              showFiller
                ? "border-amber-300 bg-amber-100 text-amber-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}
          >
            <Zap className="w-3 h-3" /> フィラー{typeof fillerCount === "number" ? ` ${fillerCount}` : ""}
          </button>
          <button
            onClick={() => hasPauseData && setShowPause((v) => !v)}
            disabled={!hasPauseData}
            title={hasPauseData ? undefined : "ポーズ位置データがありません"}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              !hasPauseData
                ? "border-gray-100 bg-white text-gray-300 cursor-not-allowed"
                : showPause
                  ? "border-blue-300 bg-blue-100 text-blue-700"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}
          >
            <Pause className="w-3 h-3" /> 長いポーズ{typeof longPauses === "number" ? ` ${longPauses}` : ""}
          </button>
        </div>
      </div>

      <p className="text-sm leading-[2] text-gray-800">
        {words.map((word, i) => {
          const filler = showFiller && isFiller(word.w);
          const pause = showPause && word.gap >= LONG_PAUSE && i > 0;
          return (
            <span key={i}>
              {pause && (
                <span className="mx-1 inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 text-[10px] font-medium text-blue-600 align-middle">
                  <Pause className="w-2.5 h-2.5" />
                  {word.gap.toFixed(1)}s
                </span>
              )}
              <span
                className={
                  filler ? "rounded bg-amber-200 px-0.5 font-medium text-amber-800" : undefined
                }
              >
                {word.w}
              </span>{" "}
            </span>
          );
        })}
      </p>

      {(showFiller || showPause) && (
        <p className="mt-2 text-[10px] text-gray-400">
          {showFiller && "オレンジ = フィラーワード（um / uh / you know など）。"}
          {showPause && "青 = 1 秒以上の無音（考え込み・言い淀み）。"}
          減らすほど流暢に聞こえます。
        </p>
      )}
    </div>
  );
}
