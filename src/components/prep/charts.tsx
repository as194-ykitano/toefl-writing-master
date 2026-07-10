"use client";

// ダッシュボード用の軽量 SVG チャート（依存ライブラリなし）
// ミニマルなトーンに合わせ、折れ線・棒のみを提供する。

interface Point {
  label?: string;
  value: number;
}

interface ChartProps {
  points: Point[];
  /** 縦軸の最大値。未指定ならデータ最大 */
  max?: number;
  color?: string;
  height?: number;
  /** 値のフォーマッタ（ツールチップ/ラベル用） */
  format?: (v: number) => string;
}

const VB_W = 320;

export function MiniLineChart({
  points,
  max,
  color = "#22c55e",
  height = 160,
  format = (v) => String(Math.round(v * 10) / 10),
}: ChartProps) {
  if (points.length === 0) {
    return <EmptyChart height={height} />;
  }
  const vbH = height;
  const padX = 10;
  const padY = 16;
  const maxV = max ?? Math.max(1, ...points.map((p) => p.value));
  const innerW = VB_W - padX * 2;
  const innerH = vbH - padY * 2;
  const x = (i: number) =>
    padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padY + innerH - (Math.min(v, maxV) / maxV) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const areaPath = `${linePath} L ${x(points.length - 1)} ${padY + innerH} L ${x(0)} ${padY + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${VB_W} ${vbH}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {/* グリッド線 */}
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={padX}
          x2={VB_W - padX}
          y1={padY + innerH * f}
          y2={padY + innerH * f}
          stroke="currentColor"
          className="text-gray-100"
          strokeWidth={1}
        />
      ))}
      <path d={areaPath} fill={color} opacity={0.1} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={3} fill={color} />
          {(points.length <= 8 || i === points.length - 1) && (
            <text
              x={x(i)}
              y={y(p.value) - 7}
              textAnchor="middle"
              className="fill-gray-500"
              fontSize={9}
            >
              {format(p.value)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function MiniBarChart({
  points,
  max,
  color = "#3b82f6",
  height = 160,
}: ChartProps) {
  if (points.length === 0) {
    return <EmptyChart height={height} />;
  }
  const vbH = height;
  const padX = 6;
  const padY = 14;
  const maxV = max ?? Math.max(1, ...points.map((p) => p.value));
  const innerW = VB_W - padX * 2;
  const innerH = vbH - padY * 2;
  const gap = points.length > 40 ? 1 : 2;
  const barW = Math.max(1, (innerW - gap * (points.length - 1)) / points.length);
  const hasValue = points.some((p) => p.value > 0);

  return (
    <svg viewBox={`0 0 ${VB_W} ${vbH}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <line
        x1={padX}
        x2={VB_W - padX}
        y1={padY + innerH}
        y2={padY + innerH}
        stroke="currentColor"
        className="text-gray-200"
        strokeWidth={1}
      />
      {points.map((p, i) => {
        const h = hasValue ? (Math.min(p.value, maxV) / maxV) * innerH : 0;
        const bx = padX + i * (barW + gap);
        return (
          <rect
            key={i}
            x={bx}
            y={padY + innerH - h}
            width={barW}
            height={Math.max(0, h)}
            rx={Math.min(2, barW / 2)}
            fill={color}
            opacity={p.value > 0 ? 0.85 : 0.15}
          />
        );
      })}
    </svg>
  );
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center text-xs text-gray-300"
      style={{ height }}
    >
      データなし
    </div>
  );
}
