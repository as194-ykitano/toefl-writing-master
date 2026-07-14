"use client";

import { useMemo, useState } from "react";
import { Pause, Repeat2, RotateCcw, Zap } from "lucide-react";

interface SpeechWord { w: string; gap: number }

interface SpeakingTranscriptViewProps {
  transcript: string;
  speechWords?: SpeechWord[];
  fillerCount?: number;
  longPauses?: number;
  trailingPauseSec?: number;
  wordRepetitionCount?: number;
  correctionCount?: number;
  wordRepetitionIndexes?: number[];
  correctionIndexes?: number[];
}

const FILLER_RE = /^(um+|uh+|er+m?|ah+|hmm+|mm+)$/i;
const LONG_PAUSE = 1.0;
const isFiller = (word: string) => FILLER_RE.test(word.trim().replace(/[^a-zA-Z]/g, ""));

export default function SpeakingTranscriptView({
  transcript, speechWords, fillerCount, longPauses, trailingPauseSec, wordRepetitionCount,
  correctionCount, wordRepetitionIndexes, correctionIndexes,
}: SpeakingTranscriptViewProps) {
  const [showFiller, setShowFiller] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showRepetition, setShowRepetition] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const words = useMemo<SpeechWord[]>(() => speechWords?.length
    ? speechWords
    : transcript.split(/\s+/).filter(Boolean).map((w) => ({ w, gap: 0 })), [speechWords, transcript]);
  const repetitions = useMemo(() => new Set(wordRepetitionIndexes ?? []), [wordRepetitionIndexes]);
  const corrections = useMemo(() => new Set(correctionIndexes ?? []), [correctionIndexes]);
  const hasPauseData = !!speechWords?.length;
  if (!transcript) return null;

  const toggleClass = (active: boolean, color: string) =>
    `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${active ? color : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`;

  return (
    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-semibold text-gray-400">あなたの回答（文字起こし）</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setShowFiller((v) => !v)} className={toggleClass(showFiller, "border-amber-300 bg-amber-100 text-amber-700")}><Zap className="h-3 w-3" />フィラー {fillerCount ?? 0}</button>
          <button onClick={() => setShowRepetition((v) => !v)} className={toggleClass(showRepetition, "border-rose-300 bg-rose-100 text-rose-700")}><Repeat2 className="h-3 w-3" />単語繰り返し {wordRepetitionCount ?? 0}</button>
          <button onClick={() => setShowCorrection((v) => !v)} className={toggleClass(showCorrection, "border-violet-300 bg-violet-100 text-violet-700")}><RotateCcw className="h-3 w-3" />言い直し {correctionCount ?? 0}</button>
          <button onClick={() => hasPauseData && setShowPause((v) => !v)} disabled={!hasPauseData} className={`${toggleClass(showPause, "border-blue-300 bg-blue-100 text-blue-700")} ${!hasPauseData ? "cursor-not-allowed opacity-40" : ""}`}><Pause className="h-3 w-3" />長いポーズ {longPauses ?? 0}</button>
        </div>
      </div>
      <p className="text-sm leading-[2] text-gray-800 dark:text-gray-200">
        {words.map((word, i) => {
          const pause = showPause && word.gap >= LONG_PAUSE;
          const classes = showCorrection && corrections.has(i)
            ? "rounded bg-violet-200 px-0.5 font-medium text-violet-900"
            : showRepetition && repetitions.has(i)
              ? "rounded bg-rose-200 px-0.5 font-medium text-rose-900"
              : showFiller && isFiller(word.w)
                ? "rounded bg-amber-200 px-0.5 font-medium text-amber-900" : undefined;
          return <span key={i}>{pause && <span className="mx-1 inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 text-[10px] font-medium text-blue-600"><Pause className="h-2.5 w-2.5" />{word.gap.toFixed(1)}s</span>}<span className={classes}>{word.w}</span>{" "}</span>;
        })}
        {showPause && (trailingPauseSec ?? 0) >= LONG_PAUSE && (
          <span className="ml-1 inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 align-middle">
            <Pause className="h-2.5 w-2.5" />録音終了まで {trailingPauseSec?.toFixed(1)}s
          </span>
        )}
      </p>
    </div>
  );
}
