"use client";

// AI 添削の待ち時間に表示する「文法クイズ」オーバーレイ。
// 提出後、AI の添削が返るまでの数十秒を退屈させないための小さな 4 択クイズ。
// 添削結果とは独立した汎用の文法問題バンクから出題する（結果ページ側に本番のドリルがある）。

import { useMemo, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";

interface QuizQuestion {
  sentence: string; // ___ を含む英文
  choices: string[];
  answer: number; // choices の正解インデックス
  explanation: string;
  category: string;
}

// 汎用の文法クイズ（TOEFL / IELTS 頻出ポイント）。出題順はシャッフルする。
const QUESTION_BANK: QuizQuestion[] = [
  {
    sentence: "She ___ to the library every Sunday.",
    choices: ["go", "goes", "going", "gone"],
    answer: 1,
    explanation: "主語が三人称単数（She）なので、現在形は goes になります。",
    category: "三単現",
  },
  {
    sentence: "I have lived here ___ 2015.",
    choices: ["for", "since", "from", "during"],
    answer: 1,
    explanation: "「〜以来」と起点を示すときは since を使います（for は期間）。",
    category: "前置詞",
  },
  {
    sentence: "There ___ a lot of information in this article.",
    choices: ["are", "is", "were", "have"],
    answer: 1,
    explanation: "information は不可算名詞なので単数扱い、is が正解です。",
    category: "可算・不可算",
  },
  {
    sentence: "If it ___ tomorrow, we will cancel the trip.",
    choices: ["rains", "will rain", "rained", "would rain"],
    answer: 0,
    explanation: "条件を表す if 節では、未来のことでも現在形（rains）を使います。",
    category: "動詞の時制",
  },
  {
    sentence: "This book is ___ interesting than that one.",
    choices: ["much", "more", "most", "very"],
    answer: 1,
    explanation: "than があるので比較級 more interesting が正解です。",
    category: "比較",
  },
  {
    sentence: "He is interested ___ learning Japanese.",
    choices: ["on", "at", "in", "for"],
    answer: 2,
    explanation: "be interested in 〜 で「〜に興味がある」という定型表現です。",
    category: "コロケーション",
  },
  {
    sentence: "Each of the students ___ a laptop.",
    choices: ["have", "has", "having", "are having"],
    answer: 1,
    explanation: "Each of ... は単数扱いなので has が正解です。",
    category: "主述の一致",
  },
  {
    sentence: "I look forward to ___ from you.",
    choices: ["hear", "hearing", "heard", "be heard"],
    answer: 1,
    explanation: "look forward to の to は前置詞なので、動名詞 hearing が続きます。",
    category: "動名詞・不定詞",
  },
  {
    sentence: "The report ___ by the team last week.",
    choices: ["wrote", "was written", "has written", "writing"],
    answer: 1,
    explanation: "レポートは「書かれた」側なので受動態 was written が正解です。",
    category: "態（受動・能動）",
  },
  {
    sentence: "She speaks English ___ than her brother.",
    choices: ["good", "well", "better", "best"],
    answer: 2,
    explanation: "than があり、副詞 well の比較級 better が正解です。",
    category: "比較",
  },
  {
    sentence: "I want ___ a doctor in the future.",
    choices: ["become", "becoming", "to become", "became"],
    answer: 2,
    explanation: "want の後は to 不定詞（to become）が続きます。",
    category: "動名詞・不定詞",
  },
  {
    sentence: "___ people think that exercise is important.",
    choices: ["Much", "Many", "A little", "Almost"],
    answer: 1,
    explanation: "people は可算名詞の複数なので Many が正解です。",
    category: "可算・不可算",
  },
];

function shuffle<T>(arr: T[]): T[] {
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
  const questions = useMemo(() => shuffle(QUESTION_BANK), []);
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
