"use client";

// ダッシュボード用の軽量 SVG チャート（依存ライブラリなし）
// ミニマルなトーンに合わせ、折れ線・棒のみを提供する。
// 均等スケール（preserveAspectRatio 既定）で描画するため、点や線が歪まない。

interface Point {
  label?: string;
  value: number;
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
          className="text-gray-100"
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
      {showDots &&
        points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={3.5}
            fill={color}
            stroke="#fff"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
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
