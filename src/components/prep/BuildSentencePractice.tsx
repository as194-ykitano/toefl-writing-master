"use client";

// TOEFL Build a Sentence 演習画面
// 語句チップをタップして正しい順に並べ、文を完成させる
// （実試験のドラッグ&ドロップに相当する操作をタップ選択で再現）

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExamTopBar } from "./exam-ui";
import { BuildSentenceSet, EXAM_LABELS, PracticeMode } from "@/lib/prep/types";

interface BuildSentencePracticeProps {
  set: BuildSentenceSet;
  mode: PracticeMode;
}

/** 比較用の正規化: 小文字化・空白圧縮・末尾記号除去 */
function normalizeSentence(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.?!]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** テンプレートの固定部分（前置き/締めの語）を除いた、学習者が並べる部分を組み立てる */
function assembleAnswer(template: string, picked: string[]): string {
  let index = 0;
  return template
    .split(/(_{2,})/)
    .map((part) => (/_{2,}/.test(part) ? (picked[index++] ?? "") : part))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export default function BuildSentencePractice({ set, mode }: BuildSentencePracticeProps) {
  const [itemIndex, setItemIndex] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const item = set.items[itemIndex];
  const isLast = itemIndex === set.items.length - 1;
  const exitHref = `/practice/${set.exam}/writing?type=build-a-sentence`;
  const blanks = useMemo(() => (item.template.match(/_{2,}/g) ?? []).length, [item]);
  const remainingSec = mode === "test" ? Math.max(0, set.timeLimitSec - elapsedSec) : 0;

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => setElapsedSec((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [finished]);

  // 各語句は 1 回ずつ使える（同じ語句が複数ある場合に対応するため index で管理）
  const available = item.words.map((word, i) => ({ word, key: `${i}` }));
  const usedKeys = new Set(picked.map((p) => p.split("::")[0]));

  const pick = (key: string, word: string) => {
    if (usedKeys.has(key)) return;
    setPicked((prev) => [...prev, `${key}::${word}`]);
  };

  const unpick = (index: number) => {
    setPicked((prev) => prev.filter((_, i) => i !== index));
  };

  const currentSentence = assembleAnswer(
    item.template,
    picked.map((p) => p.split("::")[1])
  );

  const confirm = () => {
    setAnswers((prev) => ({ ...prev, [item.id]: currentSentence }));
    setPicked([]);
    if (isLast) setFinished(true);
    else setItemIndex((i) => i + 1);
  };

  if (finished) {
    const results = set.items.map((it) => {
      const user = answers[it.id] ?? "";
      return { item: it, user, correct: normalizeSentence(user) === normalizeSentence(it.answer) };
    });
    const correctCount = results.filter((r) => r.correct).length;

    return (
      <div className="min-h-screen bg-gray-100">
        <ExamTopBar
          examLabel={EXAM_LABELS[set.exam]}
          title={set.title}
          mode={mode}
          elapsedSec={elapsedSec}
          remainingSec={0}
          exitHref={exitHref}
        />
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="text-xs font-medium text-gray-400">結果</div>
            <div className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">
              {correctCount} <span className="text-gray-300 text-xl">/ {set.items.length}</span>
            </div>
          </div>

          {results.map(({ item: it, user, correct }, i) => (
            <div
              key={it.id}
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
                  <div className="text-sm font-bold text-gray-900">Q{i + 1}</div>
                  <p className="mt-1 text-xs text-gray-500">{it.context}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                    <div className="bg-white rounded-lg border border-gray-200/70 px-3 py-2">
                      <div className="text-[11px] font-medium text-gray-400">あなたの答え</div>
                      <div className={correct ? "text-emerald-700" : "text-red-600"}>
                        {user || "—（未回答）"}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200/70 px-3 py-2">
                      <div className="text-[11px] font-medium text-gray-400">正解</div>
                      <div className="text-gray-900">{it.answer}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3 pb-8">
            <Link
              href={exitHref}
              className="inline-flex items-center rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-5 py-3"
            >
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <ExamTopBar
        examLabel={EXAM_LABELS[set.exam]}
        title={set.title}
        mode={mode}
        elapsedSec={elapsedSec}
        remainingSec={remainingSec}
        exitHref={exitHref}
      />

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          {set.items.map((it, i) => (
            <div
              key={it.id}
              className={`flex-1 h-1.5 rounded-full ${
                i < itemIndex ? "bg-eg" : i === itemIndex ? "bg-eg/40" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase mb-2">
            Question {item.number} / {set.items.length} — Build a Sentence
          </div>
          <p className="text-sm text-gray-500">{item.context}</p>

          {/* 組み立て中の文 */}
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 px-4 py-4 min-h-[64px]">
            <p className="text-[15px] text-gray-900 leading-relaxed">
              {currentSentence || item.template}
            </p>
          </div>

          {/* 選択済みチップ（タップで戻す） */}
          {picked.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {picked.map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  onClick={() => unpick(i)}
                  className="text-sm font-medium rounded-lg px-3 py-1.5 bg-eg text-black hover:bg-eg-dark"
                >
                  {i + 1}. {p.split("::")[1]} ×
                </button>
              ))}
            </div>
          )}

          {/* 語句チップ */}
          <div className="mt-5">
            <div className="text-xs font-medium text-gray-400 mb-2">
              語句を順番にタップして文を作ってください（{picked.length} / {blanks}）
              {item.words.length > blanks && " ※ 使わない語句が含まれています"}
            </div>
            <div className="flex flex-wrap gap-2">
              {available.map(({ word, key }) => (
                <button
                  key={key}
                  onClick={() => pick(key, word)}
                  disabled={usedKeys.has(key) || picked.length >= blanks}
                  className={`text-sm font-medium rounded-lg px-3 py-2 border transition-colors ${
                    usedKeys.has(key)
                      ? "border-gray-100 bg-gray-50 text-gray-300"
                      : "border-gray-200 bg-white text-gray-800 hover:border-eg hover:bg-eg-faint"
                  }`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" onClick={() => setPicked([])} disabled={picked.length === 0}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> やり直す
            </Button>
            <Button
              className="bg-eg hover:bg-eg-dark text-black"
              onClick={confirm}
              disabled={picked.length === 0}
            >
              {isLast ? "回答して結果を見る" : "回答して次へ"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
