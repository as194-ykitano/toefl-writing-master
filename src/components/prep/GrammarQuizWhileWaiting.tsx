"use client";

// AI 添削の待ち時間に表示する「文法クイズ」オーバーレイ。
// 提出後、AI の添削が返るまでの数十秒を退屈させないための小さな 4 択クイズ。
// 添削結果とは独立した汎用の文法問題バンクから出題する（結果ページ側に本番のドリルがある）。

import { useMemo, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { GRAMMAR_QUIZ_QUESTIONS } from "@/lib/prep/grammar-quiz-questions";

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface GrammarQuizWhileWaitingProps {
  /** 複数回答を順に添削する場合の完了数（Speaking など）。未指定なら進捗バー非表示。 */
  completed?: number;
  /** 添削対象の総数。1 以上を指定すると「X / N 問完了」と進捗バーを表示。 */
  total?: number;
}

export default function GrammarQuizWhileWaiting({ completed, total }: GrammarQuizWhileWaitingProps = {}) {
  const questions = useMemo(() => shuffle(GRAMMAR_QUIZ_QUESTIONS), []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const q = questions[index % questions.length];
  const answered = selected !== null;
  const isRight = answered && selected === q.answer;

  const choose = (i: number) => {
    if (answered) return;
    setSelected(i);
    if (i === q.answer) setCorrectCount((c) => c + 1);
  };
  const next = () => {
    setSelected(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="glass-card rounded-2xl w-full max-w-lg p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* ヘッダー */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-eg flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-4.5 h-4.5 text-black animate-spin" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-gray-50 text-sm">
              KAI が添削中です…
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              待っている間に、文法クイズで腕試し！
            </div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-eg-deep dark:text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            {correctCount} 正解
          </span>
        </div>

        {/* 添削の進捗（複数回答を順に添削する場合のみ） */}
        {typeof total === "number" && total > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-gray-400">
              <span>添削の進捗</span>
              <span className="tabular-nums">
                {Math.min(completed ?? 0, total)} / {total} 問完了
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-eg transition-[width] duration-500 ease-out"
                style={{ width: `${(Math.min(completed ?? 0, total) / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 種別バッジ */}
        <div className="mt-4 mb-2">
          <span className="inline-flex items-center rounded-full bg-eg-faint border border-eg-soft px-2.5 py-0.5 text-[11px] font-medium text-eg-deep dark:bg-eg/10 dark:border-eg/20 dark:text-amber-300">
            {q.category}
          </span>
        </div>

        {/* 問題文 */}
        <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
          {q.sentence.split("___").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="mx-1 inline-block min-w-[3rem] border-b-2 border-eg align-middle" />
              )}
            </span>
          ))}
        </p>

        {/* 選択肢 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {q.choices.map((choice, i) => {
            const showCorrect = answered && i === q.answer;
            const showWrong = answered && i === selected && i !== q.answer;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium text-left transition-all ${
                  showCorrect
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : showWrong
                      ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200"
                      : "border-gray-200 bg-white text-gray-800 hover:border-eg hover:bg-eg-faint dark:border-white/15 dark:bg-white/5 dark:text-gray-100 dark:hover:border-eg/50"
                } ${answered ? "cursor-default" : ""}`}
              >
                <span>{choice}</span>
                {showCorrect && <Check className="w-4 h-4 flex-shrink-0" />}
                {showWrong && <X className="w-4 h-4 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* 解説 + 次へ */}
        {answered && (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                isRight
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200"
              }`}
            >
              <span className="font-semibold">{isRight ? "正解！" : "惜しい！"}</span>{" "}
              {q.explanation}
            </div>
            <button
              onClick={next}
              className="mt-3 w-full rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-4 py-2.5 transition-colors"
            >
              次の問題へ
            </button>
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
          添削が完了すると自動で結果ページに移動します
        </p>
      </div>
    </div>
  );
}
