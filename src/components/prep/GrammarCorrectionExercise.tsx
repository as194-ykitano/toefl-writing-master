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
  darkBg: string;
  darkBorder: string;
  darkUnderline: string;
  mark: string; // ハイライト（下線+淡い背景）
  markActive: string; // 選択中
}
const DEFAULT_STYLE: CatStyle = {
  dot: "bg-gray-400",
  chipBg: "bg-gray-100",
  chipText: "text-gray-600",
  darkBg: "#111827",
  darkBorder: "#4b5563",
  darkUnderline: "#9ca3af",
  mark: "bg-gray-100 border-b-2 border-gray-400",
  markActive: "bg-gray-200 border-b-2 border-gray-500 ring-2 ring-gray-300",
};

// 16 色のパレット（種別ごとに固有色を割り当てる）
const p = (c: string, darkBg: string, darkBorder: string, darkUnderline: string): CatStyle => ({
  dot: `bg-${c}-500`,
  chipBg: `bg-${c}-50`,
  chipText: `text-${c}-700`,
  darkBg,
  darkBorder,
  darkUnderline,
  mark: `bg-${c}-100 border-b-2 border-${c}-400`,
  markActive: `bg-${c}-200 border-b-2 border-${c}-500 ring-2 ring-${c}-300`,
});
// ※ 下のコメントは Tailwind の safelist 検出用（動的クラス名を含めるため）:
// bg-amber-500 bg-amber-50 text-amber-700 bg-amber-100 border-amber-400 bg-amber-200 border-amber-500 ring-amber-300
// bg-rose-500 bg-rose-50 text-rose-700 bg-rose-100 border-rose-400 bg-rose-200 border-rose-500 ring-rose-300
// bg-orange-500 bg-orange-50 text-orange-700 bg-orange-100 border-orange-400 bg-orange-200 border-orange-500 ring-orange-300
// bg-cyan-500 bg-cyan-50 text-cyan-700 bg-cyan-100 border-cyan-400 bg-cyan-200 border-cyan-500 ring-cyan-300
// bg-emerald-500 bg-emerald-50 text-emerald-700 bg-emerald-100 border-emerald-400 bg-emerald-200 border-emerald-500 ring-emerald-300
// bg-blue-500 bg-blue-50 text-blue-700 bg-blue-100 border-blue-400 bg-blue-200 border-blue-500 ring-blue-300
// bg-violet-500 bg-violet-50 text-violet-700 bg-violet-100 border-violet-400 bg-violet-200 border-violet-500 ring-violet-300
// bg-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 bg-fuchsia-100 border-fuchsia-400 bg-fuchsia-200 border-fuchsia-500 ring-fuchsia-300
// bg-red-500 bg-red-50 text-red-700 bg-red-100 border-red-400 bg-red-200 border-red-500 ring-red-300
// bg-teal-500 bg-teal-50 text-teal-700 bg-teal-100 border-teal-400 bg-teal-200 border-teal-500 ring-teal-300
// bg-indigo-500 bg-indigo-50 text-indigo-700 bg-indigo-100 border-indigo-400 bg-indigo-200 border-indigo-500 ring-indigo-300
// bg-pink-500 bg-pink-50 text-pink-700 bg-pink-100 border-pink-400 bg-pink-200 border-pink-500 ring-pink-300
// bg-lime-500 bg-lime-50 text-lime-700 bg-lime-100 border-lime-400 bg-lime-200 border-lime-500 ring-lime-300
// bg-sky-500 bg-sky-50 text-sky-700 bg-sky-100 border-sky-400 bg-sky-200 border-sky-500 ring-sky-300
// bg-purple-500 bg-purple-50 text-purple-700 bg-purple-100 border-purple-400 bg-purple-200 border-purple-500 ring-purple-300
// bg-yellow-500 bg-yellow-50 text-yellow-700 bg-yellow-100 border-yellow-400 bg-yellow-200 border-yellow-500 ring-yellow-300
const PALETTE: CatStyle[] = [
  p("amber", "#451a03", "#b45309", "#fbbf24"), p("rose", "#4c0519", "#be123c", "#fb7185"),
  p("orange", "#431407", "#c2410c", "#fb923c"), p("cyan", "#083344", "#0e7490", "#22d3ee"),
  p("emerald", "#022c22", "#047857", "#34d399"), p("blue", "#172554", "#1d4ed8", "#60a5fa"),
  p("violet", "#2e1065", "#6d28d9", "#a78bfa"), p("fuchsia", "#4a044e", "#a21caf", "#e879f9"),
  p("red", "#450a0a", "#b91c1c", "#f87171"), p("teal", "#042f2e", "#0f766e", "#2dd4bf"),
  p("indigo", "#1e1b4b", "#4338ca", "#818cf8"), p("pink", "#500724", "#be185d", "#f472b6"),
  p("lime", "#1a2e05", "#4d7c0f", "#a3e635"), p("sky", "#082f49", "#0369a1", "#38bdf8"),
  p("purple", "#3b0764", "#7e22ce", "#c084fc"), p("yellow", "#422006", "#a16207", "#facc15"),
];

// 既知の誤り種別（この順でパレットの色が安定して割り当たる）。API のプロンプトと揃える。
export const GRAMMAR_CATEGORIES = [
  "動詞の時制",
  "主述の一致",
  "三単現",
  "冠詞",
  "前置詞",
  "単数・複数",
  "可算・不可算",
  "代名詞",
  "語順",
  "語彙選択",
  "コロケーション",
  "語形",
  "スペリング",
  "句読点",
  "大文字小文字",
  "接続詞",
  "関係詞",
  "比較",
  "態（受動・能動）",
  "動名詞・不定詞",
  "冗長・簡潔さ",
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}
function styleOf(category?: string): CatStyle {
  const cat = category?.trim();
  if (!cat || cat === "その他") return DEFAULT_STYLE;
  const known = GRAMMAR_CATEGORIES.indexOf(cat);
  if (known >= 0) return PALETTE[known % PALETTE.length];
  return PALETTE[hashIndex(cat, PALETTE.length)];
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
  heading = "エラー修正ドリル",
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
          style={{
            "--category-dark-bg": cs.darkBg,
            "--category-dark-border": cs.darkBorder,
            "--category-dark-underline": cs.darkUnderline,
          } as React.CSSProperties}
          title={items[r.itemIndex].category || "文法エラー"}
          className={`rounded px-0.5 mx-px align-baseline transition-colors text-black dark:bg-[var(--category-dark-bg)] dark:border-b-[var(--category-dark-underline)] dark:text-white dark:ring-white/30 dark:drop-shadow-[0_2px_3px_var(--category-dark-underline)] ${
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6 dark:border-slate-700 dark:bg-slate-900">
      {/* ヘッダー + 進捗 */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 dark:text-white">
          <Lightbulb className="w-4.5 h-4.5 text-eg-dark dark:text-eg" /> {heading}
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
            <span key={cat} className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-200">
              <span className={`w-2 h-2 rounded-full ${styleOf(cat).dot}`} />
              {cat} <span className="text-gray-400">{n}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 全文（ハイライト箇所を押すと下の修正パネルが切り替わる） */}
      {sourceText && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm leading-[2] text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-gray-200">
          {renderSource()}
        </div>
      )}

      {/* 修正パネル */}
      <div
        style={{
          "--category-dark-bg": state === "correct" ? "#022c22" : st.darkBg,
          "--category-dark-border": state === "correct" ? "#047857" : st.darkBorder,
        } as React.CSSProperties}
        className={`rounded-xl border p-4 dark:bg-[var(--category-dark-bg)] dark:border-[var(--category-dark-border)] ${
          done && state === "correct"
            ? "border-emerald-200 bg-emerald-50/40"
            : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-eg-deep dark:text-white">ハイライトされたエラーを修正</span>
          {item.category && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium dark:bg-white/10 dark:text-white dark:ring-1 dark:ring-white/15 ${st.chipBg} ${st.chipText}`}>
              <span className={`w-2 h-2 rounded-full ${st.dot}`} />
              {item.category}
            </span>
          )}
        </div>

        {/* 文脈（sourceText が無い時のフォールバックでも文が見える） */}
        {!sourceText && (
          <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-white">
            {(() => {
              const idx = item.context.indexOf(item.mistake);
              if (idx < 0 || done) return item.context;
              return (
                <>
                  {item.context.slice(0, idx)}
                  <span
                    style={{
                      "--category-dark-bg": st.darkBg,
                      "--category-dark-border": st.darkBorder,
                      "--category-dark-underline": st.darkUnderline,
                    } as React.CSSProperties}
                    className={`rounded px-0.5 text-black dark:bg-[var(--category-dark-bg)] dark:border-b-[var(--category-dark-underline)] dark:text-white dark:drop-shadow-[0_2px_3px_var(--category-dark-underline)] ${st.mark}`}
                  >
                    {item.mistake}
                  </span>
                  {item.context.slice(idx + item.mistake.length)}
                </>
              );
            })()}
          </p>
        )}

        <label className="block text-xs text-gray-500 mb-1.5 dark:text-gray-200">
          ハイライトされた語句を正しく直して送信してください
        </label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={done}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-colors ${
            state === "correct"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
              : tried
                ? "border-rose-300 bg-rose-50 text-rose-800 focus:border-rose-400 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200"
                : "border-gray-300 bg-white text-gray-900 focus:border-eg dark:border-white/15 dark:bg-white/5 dark:text-gray-100"
          }`}
          placeholder="正しい英文を入力"
        />

        {state === "correct" && (
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-300">
            <Check className="w-4 h-4" /> いいですね！ 正解です。
          </div>
        )}
        {state !== "correct" && tried && (
          <div className="mt-3 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/25 dark:text-rose-200">
            <div className="flex items-center gap-1.5 font-medium">
              <X className="w-4 h-4" /> もう一度試してみましょう
            </div>
            <p className="mt-1 text-xs text-rose-600/90 dark:text-rose-300/80">
              ヒント: {item.category ? `${item.category}に注目。` : ""}
              正解は {item.correction.length} 文字、最初の文字は「{item.correction.charAt(0)}」です。
            </p>
          </div>
        )}

        {done && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-white/15 dark:bg-black/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 mb-0.5">MISTAKE</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{item.mistake}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">CORRECT</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.correction}</div>
              </div>
            </div>
            {item.explanation && (
              <p className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 leading-relaxed dark:border-white/10 dark:text-gray-300">
                {item.explanation}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {!done && (
            <button
              onClick={() => setState("revealed")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-300 dark:border-white/30 dark:bg-black/20 dark:text-white dark:hover:bg-white/10"
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
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">すべての修正が完了しました 🎉</span>
          )}
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> 前へ
        </button>
        <span className="text-gray-400 tabular-nums">
          {index + 1} / {items.length}
        </span>
        <button
          onClick={() => goTo(index + 1)}
          disabled={index === items.length - 1}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-300 dark:hover:text-white"
        >
          次へ <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
