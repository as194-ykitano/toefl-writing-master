"use client";

// 結果レポート用の半円ゲージ（SVG）
// value / max を 0〜1 に正規化して弧を描画する。
// マウント時（および画面内に入ったとき）に 0 から目標値まで弧と数値をアニメーションさせる。

import { useEffect, useRef, useState } from "react";

interface ScoreGaugeProps {
  value: number;
  max: number;
  /** ゲージ中央に表示するメインラベル（format 未指定時に使用） */
  label?: string;
  /** メインラベルの下に出す補足（例: "/ 120", "Band"） */
  subLabel?: string;
  size?: number;
  colorClass?: string; // Tailwind の stroke 色クラス
  /** 指定すると中央ラベルを value からカウントアップ表示する（引数は現在の途中値） */
  format?: (currentValue: number) => string;
}

export default function ScoreGauge({
  value,
  max,
  label,
  subLabel,
  size = 200,
  colorClass = "stroke-blue-600",
  format,
}: ScoreGaugeProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // 半円
  const height = size / 2 + strokeWidth;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0→1
  const [inView, setInView] = useState(false);
  const [glow, setGlow] = useState(false);
  const rafRef = useRef<number | null>(null);
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (glowTimer.current) clearTimeout(glowTimer.current);
    setGlow(false);
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setProgress(eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(1);
        setGlow(true);
        glowTimer.current = setTimeout(() => setGlow(false), 900);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (glowTimer.current) clearTimeout(glowTimer.current);
    };
  }, [inView, value, max]);

  const dashOffset = circumference * (1 - ratio * progress);
  const centerLabel = format ? format(value * progress) : label ?? value;

  return (
    <div ref={wrapRef} className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`}>
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          className="stroke-gray-100 dark:stroke-white/10"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          className={colorClass}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: size / 2 - 44 }}>
        <span
          className={`text-4xl font-bold text-gray-900 dark:text-gray-50 tabular-nums ${
            glow ? "count-glow" : ""
          }`}
        >
          {centerLabel}
        </span>
        {subLabel && <span className="text-sm text-gray-400 dark:text-gray-500 mt-1">{subLabel}</span>}
      </div>
    </div>
  );
}
