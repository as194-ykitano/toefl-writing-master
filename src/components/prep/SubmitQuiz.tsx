"use client";

// 提出中・添削待ちの「間」に出す文法ミニクイズ（画像5枚目）。
// 採点を待つ数十秒を英語学習に使えるようにする。正誤判定つきで次々に解ける。
// 採点処理そのものとは独立（純粋に暇つぶし兼学習）。

import { useMemo, useState } from "react";
import { Check, X, Zap } from "lucide-react";

interface QuizItem {
  /** 2択（どちらが正しい英語か） */
  options: [string, string];
  /** 正解の index */
  answer: 0 | 1;
  note: string;
}

const QUIZ_BANK: QuizItem[] = [
  { options: ["She's capable to handle difficult situations.", "She's capable of handling difficult situations."], answer: 1, note: "be capable of + 動名詞（-ing）。" },
  { options: ["I look forward to hear from you.", "I look forward to hearing from you."], answer: 1, note: "look forward to の to は前置詞。動名詞が続く。" },
  { options: ["He suggested to go earlier.", "He suggested going earlier."], answer: 1, note: "suggest は to 不定詞ではなく動名詞をとる。" },
  { options: ["There is less people today.", "There are fewer people today."], answer: 1, note: "可算名詞の複数には fewer。people は複数扱い。" },
  { options: ["I've been living here since three years.", "I've been living here for three years."], answer: 1, note: "期間には for、起点には since。" },
  { options: ["If I would have known, I would have come.", "If I had known, I would have come."], answer: 1, note: "仮定法過去完了は if + had + 過去分詞。" },
  { options: ["The informations are useful.", "The information is useful."], answer: 1, note: "information は不可算。複数形にしない。" },
  { options: ["Despite of the rain, we went out.", "Despite the rain, we went out."], answer: 1, note: "despite の後ろに of は不要（in spite of と混同注意）。" },
  { options: ["He is married with a doctor.", "He is married to a doctor."], answer: 1, note: "be married to + 相手。" },
  { options: ["I'm interesting in art.", "I'm interested in art."], answer: 1, note: "人の感情は -ed（interested）、物が -ing（interesting）。" },
  { options: ["Each of the students have a laptop.", "Each of the students has a laptop."], answer: 1, note: "each は単数扱い。動詞も単数。" },
  { options: ["I discussed about the plan.", "I discussed the plan."], answer: 1, note: "discuss は他動詞。about は不要。" },
];

/** 配列をシャッフル（Fisher–Yates） */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SubmitQuiz() {
  const bank = useMemo(() => shuffle(QUIZ_BANK), []);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const item = bank[index % bank.length];
  const answered = picked !== null;
  const correct = picked === item.answer;

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-center gap-1.5 mb-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
          <Zap className="w-3 h-3" /> Grammar Quiz
        </span>
      </div>
      <h3 className="text-center text-base font-bold text-gray-900 mb-5">どちらが正しい？</h3>

      <div className="space-y-2.5">
        {item.options.map((opt, i) => {
          const isAnswer = i === item.answer;
          const isPicked = i === picked;
          let cls = "border-gray-200 hover:border-gray-300 text-gray-800";
          if (answered) {
            if (isAnswer) cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
            else if (isPicked) cls = "border-rose-300 bg-rose-50 text-rose-800";
            else cls = "border-gray-200 text-gray-400";
          }
          return (
            <button
              key={i}
              onClick={() => !answered && setPicked(i)}
              disabled={answered}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${cls}`}
            >
              <span>{opt}</span>
              {answered && isAnswer && <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />}
              {answered && isPicked && !isAnswer && <X className="w-4 h-4 flex-shrink-0 text-rose-500" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4">
          <div
            className={`text-sm font-semibold ${correct ? "text-emerald-600" : "text-rose-600"}`}
          >
            {correct ? "正解！" : "惜しい！"}
          </div>
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.note}</p>
          <button
            onClick={next}
            className="mt-3 w-full rounded-xl bg-eg px-4 py-2.5 text-sm font-semibold text-black hover:bg-eg-dark"
          >
            次の問題
          </button>
        </div>
      )}
    </div>
  );
}
