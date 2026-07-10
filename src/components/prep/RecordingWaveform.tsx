"use client";

// 録音中の波形ビジュアライザ（画像4枚目の青い波形の雰囲気）
// マイク入力レベル（0〜1）を毎フレーム取得し、右から左へ流れるバー波形を canvas に描画する。
// getLevel が無い / 常に 0 の場合でも、極小の待機アニメーションだけ表示して破綻させない。

import { useEffect, useRef } from "react";

interface RecordingWaveformProps {
  /** 現在のマイク入力レベル (0〜1) を返す関数 */
  getLevel: () => number;
  /** 描画色 */
  color?: string;
  className?: string;
}

const BAR_COUNT = 56;

export default function RecordingWaveform({
  getLevel,
  color = "#3b82f6",
  className = "",
}: RecordingWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // レベル履歴を1つ進める
      const level = Math.min(1, Math.max(0, getLevel()));
      const levels = levelsRef.current;
      levels.push(level);
      if (levels.length > BAR_COUNT) levels.shift();

      const mid = cssH / 2;
      const gap = 2;
      const barW = Math.max(1.5, (cssW - gap * (BAR_COUNT - 1)) / BAR_COUNT);
      ctx.fillStyle = color;
      for (let i = 0; i < levels.length; i++) {
        const v = levels[i];
        // 無音でも細い線が見えるように最小高さを確保
        const h = Math.max(2, v * (cssH * 0.9));
        const x = i * (barW + gap);
        const round = Math.min(barW / 2, h / 2);
        ctx.beginPath();
        // roundRect が無い環境向けにフォールバック
        if (ctx.roundRect) {
          ctx.roundRect(x, mid - h / 2, barW, h, round);
        } else {
          ctx.rect(x, mid - h / 2, barW, h);
        }
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [getLevel, color]);

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} aria-hidden />;
}
