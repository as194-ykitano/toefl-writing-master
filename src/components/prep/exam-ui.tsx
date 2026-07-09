"use client";

// 演習画面共通の exam-like UI パーツ
// （トップバー・タイマー・問題番号ナビゲーション）

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Flag, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PracticeMode } from "@/lib/prep/types";

export function formatTime(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** テストモード: 残り時間をカウントダウン / 練習モード: 経過時間をカウントアップ */
export function usePracticeTimer(
  mode: PracticeMode,
  timeLimitSec: number,
  onTimeUp?: () => void,
  running: boolean = true
) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;
  const firedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsedSec((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const remainingSec = timeLimitSec - elapsedSec;

  useEffect(() => {
    if (mode === "test" && remainingSec <= 0 && !firedRef.current) {
      firedRef.current = true;
      onTimeUpRef.current?.();
    }
  }, [mode, remainingSec]);

  return { elapsedSec, remainingSec };
}

interface ExamTopBarProps {
  examLabel: string;
  title: string;
  mode: PracticeMode;
  elapsedSec: number;
  remainingSec: number;
  exitHref: string;
}

export function ExamTopBar({ examLabel, title, mode, elapsedSec, remainingSec, exitHref }: ExamTopBarProps) {
  const router = useRouter();
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const timeText = mode === "test" ? formatTime(remainingSec) : formatTime(elapsedSec);
  const timeWarning = mode === "test" && remainingSec <= 120;

  return (
    <div className="sticky top-0 z-40 bg-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-semibold tracking-wider uppercase bg-white/10 rounded px-2 py-1 flex-shrink-0">
            {examLabel}
          </span>
          <span className="text-sm text-slate-200 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`flex items-center gap-1.5 text-sm font-mono rounded-lg px-3 py-1.5 ${
              timeWarning ? "bg-red-500/90 animate-pulse" : "bg-white/10"
            }`}
          >
            <Clock className="w-4 h-4" />
            {timeText}
            <span className="hidden sm:inline text-[10px] text-slate-300 ml-1">
              {mode === "test" ? "残り時間" : "経過時間"}
            </span>
          </span>
          <button
            onClick={() => setExitDialogOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10"
            aria-label="演習を終了"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>演習を中断しますか？</DialogTitle>
            <DialogDescription>ここまでの回答は保存されません。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitDialogOpen(false)}>
              続ける
            </Button>
            <Button variant="destructive" onClick={() => router.push(exitHref)}>
              中断して戻る
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface QuestionNavProps {
  total: number;
  currentIndex: number;
  answeredIds: boolean[];
  flaggedIds: boolean[];
  onSelect: (index: number) => void;
}

export function QuestionNav({ total, currentIndex, answeredIds, flaggedIds, onSelect }: QuestionNavProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === currentIndex;
        const answered = answeredIds[i];
        const flagged = flaggedIds[i];
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`relative w-9 h-9 rounded-lg text-xs font-semibold border transition-colors ${
              isCurrent
                ? "bg-blue-600 border-blue-600 text-white"
                : answered
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
            aria-label={`問題 ${i + 1} へ移動`}
          >
            {i + 1}
            {flagged && (
              <Flag className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
