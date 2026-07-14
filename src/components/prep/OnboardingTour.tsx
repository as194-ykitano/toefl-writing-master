"use client";

// 初回ログイン時の使い方ツアー（スポットライト付きプロダクトツアー）
//
// 仕様:
//   - 初回のみ自動表示（localStorage で既読管理）
//   - 対象要素をハイライトしながらポップアップで説明
//   - Skip / ✕ でいつでも中断可能
//   - 「次回から表示しない」を選べる（既定 ON）
//   - 使い方ガイドからいつでも再表示できる
//
// 対象要素は各画面側で data-tour="..." を付与する。要素が見つからない
// （モバイルでサイドバーが隠れている等）場合は中央にカード表示でフォールバックする。

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TOUR_SEEN_KEY = "prep_onboarding_tour_v1";

/** 既読か（自動表示すべきでないか）を返す */
export function hasSeenTour(): boolean {
  try {
    return window.localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return true; // localStorage が使えない環境ではしつこく出さない
  }
}

function markTourSeen() {
  try {
    window.localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {
    // 保存できなくても動作に影響なし
  }
}

interface TourStep {
  /** ハイライト対象の CSS セレクタ（未指定なら中央表示） */
  selector?: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    title: "Exavia へようこそ 👋",
    body: "はじめに、基本の使い方をかんたんにご案内します。1 分ほどで終わります。",
  },
  {
    selector: '[data-tour="exam"]',
    title: "① 試験を選ぶ",
    body: "まずはここで TOEFL / IELTS / TOEIC など、練習したい試験を切り替えます。",
  },
  {
    selector: '[data-tour="skills"]',
    title: "② 技能を選ぶ",
    body: "Reading・Listening・Speaking・Writing のバーを押すと、その技能の問題タイプが下に並びます。",
  },
  {
    selector: '[data-tour="types"]',
    title: "③ 問題を解く",
    body: "解きたい問題タイプのカードを開くと演習スタート。AI 添削つきで実力を伸ばせます。",
  },
  {
    selector: '[data-tour="nav-data"]',
    title: "④ データ・学習時間を見る",
    body: "「データ推移」「学習履歴」で成績や解いた問題を、「学習時間」で取り組んだ時間をふり返れます。",
  },
  {
    selector: '[data-tour="nav-guide"]',
    title: "この案内はいつでも 📖",
    body: "「使い方ガイド」から、このツアーや解説動画をいつでも見返せます。それでは始めましょう！",
  },
];

// ハイライト枠のまわりの余白と角丸
const PAD = 8;
const RADIUS = 12;
// ツールチップの想定サイズ（配置計算用）
const TIP_W = 340;
const GAP = 14;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function OnboardingTour({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dontShow, setDontShow] = useState(true);
  const [mounted, setMounted] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipH, setTipH] = useState(160);

  useEffect(() => setMounted(true), []);

  // 開くたびに先頭ステップへ
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = STEPS[index];

  // 対象要素を測定（見つからなければ中央表示）
  const measure = useCallback(() => {
    if (!step?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      setRect(null);
      return;
    }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // ステップ変更時：対象を画面内へスクロールしてから測定
  useLayoutEffect(() => {
    if (!open || !step) return;
    if (step.selector) {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // スクロール完了を少し待ってから測定
    const t = window.setTimeout(measure, 260);
    measure();
    return () => window.clearTimeout(t);
  }, [open, step, measure]);

  // リサイズ・スクロールに追従
  useEffect(() => {
    if (!open) return;
    const handler = () => measure();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, measure]);

  // ツールチップの実高さを取得（配置補正用）
  useLayoutEffect(() => {
    if (tipRef.current) setTipH(tipRef.current.offsetHeight);
  }, [index, rect, open]);

  const finish = useCallback(() => {
    if (dontShow) markTourSeen();
    onClose();
  }, [dontShow, onClose]);

  // ✕ / Skip での中断も「表示しない設定」に従う
  const dismiss = finish;

  const next = () => {
    if (index >= STEPS.length - 1) finish();
    else setIndex((i) => i + 1);
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, dontShow]);

  if (!open || !mounted) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  // ツールチップ配置：対象の下 → 入らなければ上 → それも無理なら中央
  let tipTop: number;
  let tipLeft: number;

  if (rect) {
    const spotTop = rect.top - PAD;
    const spotLeft = rect.left - PAD;
    const spotW = rect.width + PAD * 2;
    const spotH = rect.height + PAD * 2;

    const below = spotTop + spotH + GAP;
    const above = spotTop - GAP - tipH;

    if (below + tipH <= vh - 8) {
      tipTop = below;
    } else if (above >= 8) {
      tipTop = above;
    } else {
      tipTop = Math.min(Math.max(8, spotTop + spotH + GAP), vh - tipH - 8);
    }
    // 対象の中央に合わせて水平配置、画面内へクランプ
    tipLeft = spotLeft + spotW / 2 - TIP_W / 2;
    tipLeft = Math.min(Math.max(12, tipLeft), vw - TIP_W - 12);
  } else {
    tipTop = vh / 2 - tipH / 2;
    tipLeft = vw / 2 - TIP_W / 2;
  }

  const isLast = index === STEPS.length - 1;
  const isFirst = index === 0;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="使い方ツアー">
      {/* 背景：スポットライトの穴あきオーバーレイ */}
      {rect ? (
        <div
          className="absolute pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: RADIUS,
            boxShadow: "0 0 0 9999px rgba(15,23,42,0.62)",
            outline: "2px solid rgba(255,145,0,0.9)",
            outlineOffset: 2,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/62" />
      )}

      {/* クリック吸収（対象の外側を押しても進めない＝誤操作防止。閉じるはボタンから） */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* ツールチップ */}
      <div
        ref={tipRef}
        className="absolute w-[340px] max-w-[calc(100vw-24px)] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200"
        style={{ top: tipTop, left: tipLeft }}
      >
        <button
          onClick={dismiss}
          aria-label="閉じる"
          className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-[11px] font-semibold text-eg-dark dark:text-eg tracking-wide">
          {index + 1} / {STEPS.length}
        </div>
        <h3 className="mt-1.5 text-base font-bold text-gray-900 dark:text-gray-50 pr-6">
          {step.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {step.body}
        </p>

        {/* 進捗ドット */}
        <div className="mt-4 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-5 bg-eg"
                  : "w-1.5 bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                戻る
              </button>
            )}
            {!isLast && (
              <button
                onClick={dismiss}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                スキップ
              </button>
            )}
          </div>
          <Button size="sm" onClick={next} className="h-8 px-4 text-xs">
            {isLast ? "はじめる" : "次へ"}
          </Button>
        </div>

        {/* 次回から表示しない */}
        <label className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-eg accent-eg cursor-pointer"
          />
          次回から自動で表示しない（使い方ガイドから再表示できます）
        </label>
      </div>
    </div>,
    document.body
  );
}
