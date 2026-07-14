"use client";

import { useState } from "react";

// ダッシュボード用の軽量 SVG チャート（依存ライブラリなし）
// ミニマルなトーンに合わせ、折れ線・棒のみを提供する。
// 均等スケール（preserveAspectRatio 既定）で描画するため、点や線が歪まない。

interface Point {
  label?: string;
  value: number;
  title?: string;
  submittedAt?: string;
}

interface ChartProps {
  points: Point[];
  /** 縦軸の最大値。未指定ならデータ最大 */
  max?: number;
  color?: string;
  /** viewBox の縦横比を決める高さ（px 相当）。実表示は幅に追従して均等スケール */
  height?: number;
  /** 値ラベルのフォーマッタ（最後の点にだけ表示） */
  format?: (v: number) => string;
}

const VB_W = 320;
// 折れ線は表示幅が広いので、実表示 px に近い大きな viewBox を使う。
// これにより拡大率がほぼ 1 になり、点・文字が肥大しない。
const LINE_W = 1000;

// Catmull-Rom 風の滑らかなカーブ（旧仕様の chart.js tension: 0.4 に相当する見た目）
function smoothLinePath(pts: { x: number; y: number }[], smoothing = 0.2): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const controlPoint = (
    cur: { x: number; y: number },
    prev: { x: number; y: number } | undefined,
    next: { x: number; y: number } | undefined,
    reverse: boolean
  ) => {
    const p = prev ?? cur;
    const n = next ?? cur;
    const angle = Math.atan2(n.y - p.y, n.x - p.x) + (reverse ? Math.PI : 0);
    const length = Math.hypot(n.x - p.x, n.y - p.y) * smoothing;
    return { x: cur.x + Math.cos(angle) * length, y: cur.y + Math.sin(angle) * length };
  };
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cps = controlPoint(pts[i - 1], pts[i - 2], pts[i], false);
    const cpe = controlPoint(pts[i], pts[i - 1], pts[i + 1], true);
    d += ` C ${cps.x} ${cps.y} ${cpe.x} ${cpe.y} ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

export function MiniLineChart({
  points,
  max,
  color = "#22c55e",
  height = 150,
  format = (v) => String(Math.round(v * 10) / 10),
}: ChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (points.length === 0) {
    return <EmptyChart height={height} />;
  }
  // viewBox は幅 1000 固定。実表示幅（約 1000px）とほぼ 1:1 になるため、
  // stroke/dot/font は「見た目の px」に近い小さな値でよい。
  const vbH = Math.round((height / 320) * LINE_W); // 従来 height(320基準) を 1000 幅に換算
  const padX = 20;
  const padTop = 26;
  const padBottom = points.some((p) => p.label) ? 40 : 24;
  const maxV = max ?? Math.max(1, ...points.map((p) => p.value));
  const innerW = LINE_W - padX * 2;
  const innerH = vbH - padTop - padBottom;
  const x = (i: number) =>
    padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padTop + innerH - (Math.min(v, maxV) / maxV) * innerH;

  const coords = points.map((p, i) => ({ x: x(i), y: y(p.value) }));
  const linePath = smoothLinePath(coords);
  const areaPath = `${linePath} L ${x(points.length - 1)} ${padTop + innerH} L ${x(0)} ${padTop + innerH} Z`;
  const lastIdx = points.length - 1;
  const showDots = points.length <= 24;
  const gradientId = `chart-grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox={`0 0 ${LINE_W} ${vbH}`} className="w-full h-auto">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.16} />
          <stop offset="100%" stopColor={color} stopOpacity={0.015} />
        </linearGradient>
      </defs>
      {/* グリッド（薄く） */}
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={padX}
          x2={LINE_W - padX}
          y1={padTop + innerH * f}
          y2={padTop + innerH * f}
          stroke="currentColor"
          className="text-gray-100 dark:text-white/[0.06]"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((p, i) => {
        const tooltipW = 340;
        const tooltipH = 48 + Math.max(1, Math.ceil((p.title?.length ?? 4) / 38)) * 18;
        const tooltipX = Math.max(8, Math.min(LINE_W - tooltipW - 8, x(i) - tooltipW / 2));
        const tooltipY = y(p.value) > tooltipH + 18 ? y(p.value) - tooltipH - 12 : y(p.value) + 12;
        return (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
            <circle cx={x(i)} cy={y(p.value)} r={11} fill="transparent" />
            <circle cx={x(i)} cy={y(p.value)} r={hovered === i ? 5 : showDots ? 3.5 : 2} fill={color} stroke="#fff" strokeWidth={showDots ? 1.5 : 0.75} vectorEffect="non-scaling-stroke" />
            {hovered === i && (
              <foreignObject x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} className="pointer-events-none overflow-visible">
                <div className="rounded-lg border border-gray-700 bg-gray-950/95 px-3 py-2 text-white shadow-xl">
                  <div className="whitespace-normal break-words text-[12px] font-semibold leading-[18px]">{p.title || "演習結果"}</div>
                  <div className="mt-0.5 text-[11px]"><span className="font-bold" style={{ color }}>{format(p.value)}</span>{p.submittedAt ? ` ・ ${p.submittedAt}` : ""}</div>
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
      {/* 値ラベルは最後の点のみ */}
      <text
        x={Math.min(LINE_W - padX, x(lastIdx) + (lastIdx === 0 ? 0 : 8))}
        y={Math.max(14, y(points[lastIdx].value) - 10)}
        textAnchor={lastIdx === 0 ? "middle" : "end"}
        className="fill-gray-400"
        fontSize={13}
        fontWeight={700}
      >
        {format(points[lastIdx].value)}
      </text>
      {/* x 軸ラベル（最初と最後の日付だけ） */}
      {points.some((p) => p.label) && (
        <>
          <text x={padX} y={vbH - 10} textAnchor="start" className="fill-gray-300" fontSize={12}>
            {points[0].label}
          </text>
          {lastIdx > 0 && (
            <text x={LINE_W - padX} y={vbH - 10} textAnchor="end" className="fill-gray-300" fontSize={12}>
              {points[lastIdx].label}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

export function MiniBarChart({ points, max, color = "#3b82f6", height = 120 }: ChartProps) {
  if (points.length === 0) {
    return <EmptyChart height={height} />;
  }
  const vbH = height;
  const padX = 8;
  const padY = 12;
  const maxV = max ?? Math.max(1, ...points.map((p) => p.value));
  const innerW = VB_W - padX * 2;
  const innerH = vbH - padY * 2;
  const gap = points.length > 40 ? 0.8 : 2;
  const barW = Math.max(1, (innerW - gap * (points.length - 1)) / points.length);

  return (
    <svg viewBox={`0 0 ${VB_W} ${vbH}`} className="w-full h-auto">
      <line
        x1={padX}
        x2={VB_W - padX}
        y1={padY + innerH}
        y2={padY + innerH}
        stroke="currentColor"
        className="text-gray-200"
        strokeWidth={0.8}
      />
      {points.map((p, i) => {
        const h = (Math.min(p.value, maxV) / maxV) * innerH;
        const bx = padX + i * (barW + gap);
        return (
          <rect
            key={i}
            x={bx}
            y={padY + innerH - h}
            width={barW}
            height={Math.max(0, h)}
            rx={Math.min(1.5, barW / 2)}
            fill={color}
            opacity={p.value > 0 ? 0.85 : 0.12}
          />
        );
      })}
    </svg>
  );
}

// ---- 積み上げ棒グラフ（学習時間の内訳・週次） ----

interface StackedSegment {
  key: string;
  color: string;
  /** 積み上げる値（秒） */
  value: number;
}

interface StackedBar {
  label: string;
  weekday?: string;
  segments: StackedSegment[];
}

interface StackedBarChartProps {
  bars: StackedBar[];
  /** 縦軸の最大値（秒）。未指定なら各バー合計の最大 */
  max?: number;
  height?: number;
  /** グリッド線に添える目盛りラベル（秒 → 文字列） */
  tickFormat?: (sec: number) => string;
}

export function StackedBarChart({
  bars,
  max,
  height = 220,
  tickFormat,
}: StackedBarChartProps) {
  const totals = bars.map((b) => b.segments.reduce((a, s) => a + s.value, 0));
  const maxV = max ?? Math.max(1, ...totals);
  const padL = tickFormat ? 46 : 12;
  const padR = 12;
  const padTop = 12;
  const padBottom = 34;
  const VB_W = 720;
  const innerW = VB_W - padL - padR;
  const innerH = height - padTop - padBottom;
  const slot = innerW / bars.length;
  const barW = Math.min(48, slot * 0.6);

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  // 色ごとにグラス調の縦グラデーションを用意する（上=濃いめ / 下=薄め）
  const uniqueColors = Array.from(
    new Set(bars.flatMap((b) => b.segments.map((s) => s.color)))
  );
  const gradId = (c: string) => `bargrad-${c.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox={`0 0 ${VB_W} ${height}`} className="w-full h-auto">
      <defs>
        {uniqueColors.map((c) => (
          <linearGradient key={c} id={gradId(c)} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.92} />
            <stop offset="100%" stopColor={c} stopOpacity={0.5} />
          </linearGradient>
        ))}
      </defs>
      {/* グリッド + 目盛り */}
      {ticks.map((f) => {
        const y = padTop + innerH * (1 - f);
        return (
          <g key={f}>
            <line
              x1={padL}
              x2={VB_W - padR}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-gray-100 dark:text-gray-800"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {tickFormat && (
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-gray-400 dark:fill-gray-500"
                fontSize={11}
              >
                {tickFormat(maxV * f)}
              </text>
            )}
          </g>
        );
      })}
      {bars.map((bar, bi) => {
        const cx = padL + slot * bi + slot / 2;
        const x = cx - barW / 2;
        let acc = 0;
        return (
          <g key={bi}>
            {/* 積み上げ本体（1日分をまとめて下から伸ばす） */}
            <g className="bar-grow" style={{ animationDelay: `${bi * 55}ms` }}>
              {bar.segments.map((seg) => {
                const h = (seg.value / maxV) * innerH;
                if (h <= 0) return null;
                const y = padTop + innerH - acc - h;
                acc += h;
                const isTop = acc >= (totals[bi] / maxV) * innerH - 0.5;
                return (
                  <rect
                    key={seg.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={`url(#${gradId(seg.color)})`}
                    rx={isTop ? Math.min(3, barW / 2) : 0}
                  />
                );
              })}
            </g>
            {/* 曜日ラベル */}
            <text
              x={cx}
              y={height - 16}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={12}
              fontWeight={600}
            >
              {bar.label}
            </text>
            {bar.weekday && (
              <text
                x={cx}
                y={height - 3}
                textAnchor="middle"
                className="fill-gray-300 dark:fill-gray-600"
                fontSize={10}
              >
                {bar.weekday}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center text-xs text-gray-300"
      style={{ aspectRatio: `${VB_W} / ${height}` }}
    >
      データなし
    </div>
  );
}
