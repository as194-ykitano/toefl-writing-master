"use client";

// 結果レポート用の半円ゲージ（SVG）
// value / max を 0〜1 に正規化して弧を描画する

interface ScoreGaugeProps {
  value: number;
  max: number;
  /** ゲージ中央に表示するメインラベル（省略時は value） */
  label?: string;
  /** メインラベルの下に出す補足（例: "/ 120", "Band"） */
  subLabel?: string;
  size?: number;
  colorClass?: string; // Tailwind の stroke 色クラス
}

export default function ScoreGauge({
  value,
  max,
  label,
  subLabel,
  size = 200,
  colorClass = "stroke-blue-600",
}: ScoreGaugeProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // 半円
  const dashOffset = circumference * (1 - ratio);
  const height = size / 2 + strokeWidth;

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`}>
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          className="stroke-gray-100"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          className={`${colorClass} transition-all duration-700`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: size / 2 - 44 }}>
        <span className="text-4xl font-bold text-gray-900 tabular-nums">
          {label ?? value}
        </span>
        {subLabel && <span className="text-sm text-gray-400 mt-1">{subLabel}</span>}
      </div>
    </div>
  );
}
