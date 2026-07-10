"use client";

// 文法修正エクササイズ（Speaking / Writing フィードバック共通）
//
// 「最初から正解を見せる」のではなく、学習者に一度考えさせてタイピングで直させる:
//   1. 文字起こし / 提出文の全文を表示し、誤り箇所を「種別ごとの色」でハイライト
//   2. ハイライトをクリック（または前へ/次へ）でその誤りを選択
//   3. 誤りの語句を入力欄で編集 → 送信 → 1問ずつ正誤判定
//   4. 正解なら「いいですね！」→ 次へ / 不正解ならヒント → もう一度
//   5. 「答えを見る」で正解例・解説を表示
//
// sourceText を渡すと全文ハイライト表示、無ければ誤りを含む文だけを表示する。

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, Lightbulb, X } from "lucide-react";
import { GrammarCorrectionItem } from "@/lib/prep/types";

interface GrammarCorrectionExerciseProps {
  items: GrammarCorrectionItem[];
  /** 文字起こし / 提出文の全文（渡すと全文をハイライト表示） */
  sourceText?: string;
  heading?: string;
}

// 誤り種別ごとの配色（Tailwind の JIT 対策で完全な静的クラスを持たせる）
interface CatStyle {
  dot: string;
  chipBg: string;
  chipText: string;
  mark: string; // ハイライト（下線+淡い背景）
  markActive: string; // 選択中
}
const DEFAULT_STYLE: CatStyle = {
  dot: "bg-gray-400",
  chipBg: "bg-gray-100",
  chipText: "text-gray-600",
  mark: "bg-gray-100 border-b-2 border-gray-400",
  markActive: "bg-gray-200 border-b-2 border-gray-500 ring-2 ring-gray-300",
};
const CATEGORY_STYLES: Record<string, CatStyle> = {
  "動詞の時制": { dot: "bg-amber-500", chipBg: "bg-amber-50", chipText: "text-amber-700", mark: "bg-amber-100 border-b-2 border-amber-400", markActive: "bg-amber-200 border-b-2 border-amber-500 ring-2 ring-amber-300" },
  "主述の一致": { dot: "bg-rose-500", chipBg: "bg-rose-50", chipText: "text-rose-700", mark: "bg-rose-100 border-b-2 border-rose-400", markActive: "bg-rose-200 border-b-2 border-rose-500 ring-2 ring-rose-300" },
  "冠詞": { dot: "bg-orange-500", chipBg: "bg-orange-50", chipText: "text-orange-700", mark: "bg-orange-100 border-b-2 border-orange-400", markActive: "bg-orange-200 border-b-2 border-orange-500 ring-2 ring-orange-300" },
  "前置詞": { dot: "bg-cyan-500", chipBg: "bg-cyan-50", chipText: "text-cyan-700", mark: "bg-cyan-100 border-b-2 border-cyan-400", markActive: "bg-cyan-200 border-b-2 border-cyan-500 ring-2 ring-cyan-300" },
  "単数・複数": { dot: "bg-emerald-500", chipBg: "bg-emerald-50", chipText: "text-emerald-700", mark: "bg-emerald-100 border-b-2 border-emerald-400", markActive: "bg-emerald-200 border-b-2 border-emerald-500 ring-2 ring-emerald-300" },
  "語順": { dot: "bg-blue-500", chipBg: "bg-blue-50", chipText: "text-blue-700", mark: "bg-blue-100 border-b-2 border-blue-400", markActive: "bg-blue-200 border-b-2 border-blue-500 ring-2 ring-blue-300" },
  "語彙選択": { dot: "bg-violet-500", chipBg: "bg-violet-50", chipText: "text-violet-700", mark: "bg-violet-100 border-b-2 border-violet-400", markActive: "bg-violet-200 border-b-2 border-violet-500 ring-2 ring-violet-300" },
  "語形": { dot: "bg-fuchsia-500", chipBg: "bg-fuchsia-50", chipText: "text-fuchsia-700", mark: "bg-fuchsia-100 border-b-2 border-fuchsia-400", markActive: "bg-fuchsia-200 border-b-2 border-fuchsia-500 ring-2 ring-fuchsia-300" },
  "スペリング": { dot: "bg-red-500", chipBg: "bg-red-50", chipText: "text-red-700", mark: "bg-red-100 border-b-2 border-red-400", markActive: "bg-red-200 border-b-2 border-red-500 ring-2 ring-red-300" },
  "その他": DEFAULT_STYLE,
};
function styleOf(category?: string): CatStyle {
  return (category && CATEGORY_STYLES[category]) || DEFAULT_STYLE;
}

/** 判定用の正規化: 小文字化・前後空白除去・連続空白圧縮・両端の約物除去 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“”‘’.,!?;:()]+|[\s"'“”‘’.,!?;:()]+$/g, "");
}
function isCorrect(input: string, answer: string): boolean {
  return normalize(input) === normalize(answer);
}

type ItemState = "unanswered" | "correct" | "revealed";

interface Range {
  start: number;
  end: number;
  itemIndex: number;
}

/** 各 item の mistake を sourceText 内で重複しないように位置決めする */
function locateRanges(sourceText: string, items: GrammarCorrectionItem[]): Range[] {
  const claimed: Range[] = [];
  items.forEach((it, itemIndex) => {
    if (!it.mistake) return;
    let from = 0;
    while (from <= sourceText.length) {
      const idx = sourceText.indexOf(it.mistake, from);
      if (idx < 0) break;
      const end = idx + it.mistake.length;
      const overlaps = claimed.some((r) => idx < r.end && end > r.start);
      if (!overlaps) {
        claimed.push({ start: idx, end, itemIndex });
        break;
      }
      from = idx + 1;
    }
  });
  return claimed.sort((a, b) => a.start - b.start);
}

export default function GrammarCorrectionExercise({
  items,
  sourceText,
  heading = "文法チューター",
}: GrammarCorrectionExerciseProps) {
  const [index, setIndex] = useState(0);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [states, setStates] = useState<Record<number, ItemState>>({});
  const [wrongTried, setWrongTried] = useState<Record<number, boolean>>({});

  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const key = it.category?.trim() || "その他";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries());
  }, [items]);

  const ranges = useMemo(
    () => (sourceText ? locateRanges(sourceText, items) : []),
    [sourceText, items]
  );

  if (items.length === 0) return null;

  const item = items[index];
  const state = states[index] ?? "unanswered";
  const value = inputs[index] ?? item.mistake;
  const tried = wrongTried[index] ?? false;
  const solvedCount = Object.values(states).filter((s) => s === "correct").length;
  const done = state === "correct" || state === "revealed";
  const st = styleOf(item.category);

  const setValue = (v: string) => setInputs((p) => ({ ...p, [index]: v }));
  const setState = (s: ItemState) => setStates((p) => ({ ...p, [index]: s }));
  const goTo = (next: number) => {
    if (next < 0 || next >= items.length) return;
    setIndex(next);
  };
  const handleSubmit = () => {
    if (done) return;
    if (isCorrect(value, item.correction)) setState("correct");
    else setWrongTried((p) => ({ ...p, [index]: true }));
  };

  // ---- 全文ハイライト ----
  const renderSource = () => {
    if (!sourceText) return null;
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let key = 0;
    for (const r of ranges) {
      if (r.start > cursor) {
        nodes.push(<span key={key++}>{sourceText.slice(cursor, r.start)}</span>);
      }
      const cs = styleOf(items[r.itemIndex].category);
      const active = r.itemIndex === index;
      const solved = states[r.itemIndex] === "correct";
      nodes.push(
        <button
          key={key++}
          onClick={() => setIndex(r.itemIndex)}
          title={items[r.itemIndex].category || "文法エラー"}
          className={`rounded px-0.5 mx-px align-baseline transition-colors ${
            solved
              ? "bg-emerald-100 border-b-2 border-emerald-400"
              : active
                ? cs.markActive
                : cs.mark
          }`}
        >
          {sourceText.slice(r.start, r.end)}
        </button>
      );
      cursor = r.end;
    }
    if (cursor < sourceText.length) {
      nodes.push(<span key={key++}>{sourceText.slice(cursor)}</span>);
    }
    return nodes;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      {/* ヘッダー + 進捗 */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Lightbulb className="w-4.5 h-4.5 text-eg-dark" /> {heading}
        </h2>
        <span className="text-xs text-gray-400">
          {solvedCount} / {items.length} 修正済み
        </span>
      </div>

      {/* 誤り種別サマリー */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
          <span>エラーの種類</span>
          <span>合計 {items.length} 件</span>
        </div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          {categorySummary.map(([cat, n]) => (
            <div key={cat} className={styleOf(cat).dot} style={{ width: `${(n / items.length) * 100}%` }} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {categorySummary.map(([cat, n]) => (
            <span key={cat} className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${styleOf(cat).dot}`} />
              {cat} <span className="text-gray-400">{n}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 全文（ハイライト箇所を押すと下の修正パネルが切り替わる） */}
      {sourceText && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm leading-[2] text-gray-700">
          {renderSource()}
        </div>
      )}

      {/* 修正パネル */}
      <div className={`rounded-xl border p-4 ${done && state === "correct" ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-white"}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-eg-deep">ハイライトされたエラーを修正</span>
          {item.category && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.chipBg} ${st.chipText}`}>
              <span className={`w-2 h-2 rounded-full ${st.dot}`} />
              {item.category}
            </span>
          )}
        </div>

        {/* 文脈（sourceText が無い時のフォールバックでも文が見える） */}
        {!sourceText && (
          <p className="mb-3 text-sm leading-relaxed text-gray-600">
            {(() => {
              const idx = item.context.indexOf(item.mistake);
              if (idx < 0 || done) return item.context;
              return (
                <>
                  {item.context.slice(0, idx)}
                  <span className={`rounded px-0.5 ${st.mark}`}>{item.mistake}</span>
                  {item.context.slice(idx + item.mistake.length)}
                </>
              );
            })()}
          </p>
        )}

        <label className="block text-xs text-gray-500 mb-1.5">
          ハイライトされた語句を正しく直して送信してください
        </label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={done}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-colors ${
            state === "correct"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : tried
                ? "border-rose-300 bg-rose-50 text-rose-800 focus:border-rose-400"
                : "border-gray-300 bg-white text-gray-900 focus:border-eg"
          }`}
          placeholder="正しい英文を入力"
        />

        {state === "correct" && (
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
            <Check className="w-4 h-4" /> いいですね！ 正解です。
          </div>
        )}
        {state !== "correct" && tried && (
          <div className="mt-3 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
            <div className="flex items-center gap-1.5 font-medium">
              <X className="w-4 h-4" /> もう一度試してみましょう
            </div>
            <p className="mt-1 text-xs text-rose-600/90">
              ヒント: {item.category ? `${item.category}に注目。` : ""}
              正解は {item.correction.length} 文字、最初の文字は「{item.correction.charAt(0)}」です。
            </p>
          </div>
        )}

        {done && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold text-rose-500 mb-0.5">MISTAKE</div>
                <div className="text-sm text-gray-700">{item.mistake}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-emerald-600 mb-0.5">CORRECT</div>
                <div className="text-sm font-medium text-gray-900">{item.correction}</div>
              </div>
            </div>
            {item.explanation && (
              <p className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 leading-relaxed">
                {item.explanation}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {!done && (
            <button
              onClick={() => setState("revealed")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-300"
            >
              <Eye className="w-3.5 h-3.5" /> 答えを見る
            </button>
          )}
          {!done && (
            <button
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-eg px-4 py-2 text-xs font-semibold text-black hover:bg-eg-dark"
            >
              送信
            </button>
          )}
          {done && index < items.length - 1 && (
            <button
              onClick={() => goTo(index + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-eg px-4 py-2 text-xs font-semibold text-black hover:bg-eg-dark"
            >
              次の問題へ <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {done && index === items.length - 1 && (
            <span className="text-xs font-medium text-emerald-600">すべての修正が完了しました 🎉</span>
          )}
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" /> 前へ
        </button>
        <span className="text-gray-400 tabular-nums">
          {index + 1} / {items.length}
        </span>
        <button
          onClick={() => goTo(index + 1)}
          disabled={index === items.length - 1}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
        >
          次へ <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
