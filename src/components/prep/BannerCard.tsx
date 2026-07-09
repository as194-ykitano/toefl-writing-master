"use client";

// 参考デザイン（教育系アプリ）風のバナーカード
// ダークグラデーション背景 + 抽象パターン + 白文字 + バッジ + 進捗バー

import Link from "next/link";
import { ReactNode } from "react";

export type BannerTone = "navy" | "indigo" | "violet" | "teal" | "blue" | "amber";
export type BannerPattern = "xo" | "waves" | "letters" | "contour" | "grid";

const TONE_GRADIENTS: Record<BannerTone, string> = {
  navy: "from-[#101d4d] via-[#1d3aa0] to-[#3f6ae0]",
  indigo: "from-[#141263] via-[#3629ac] to-[#6a4de0]",
  violet: "from-[#270e4d] via-[#5a1fa8] to-[#9350e8]",
  teal: "from-[#06304f] via-[#0b6d95] to-[#2fb6d9]",
  blue: "from-[#0b2a6b] via-[#1b52c0] to-[#3f8ae8]",
  amber: "from-[#43200a] via-[#8a4a12] to-[#d97a2b]",
};

function PatternLayer({ pattern }: { pattern: BannerPattern }) {
  if (pattern === "xo") {
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g stroke="white" strokeLinecap="round" fill="none">
          <path d="M60 30 l30 30 M90 30 l-30 30" strokeWidth="8" opacity="0.16" />
          <path d="M210 110 l24 24 M234 110 l-24 24" strokeWidth="7" opacity="0.12" />
          <path d="M330 20 l20 20 M350 20 l-20 20" strokeWidth="6" opacity="0.14" />
          <path d="M140 150 l18 18 M158 150 l-18 18" strokeWidth="5" opacity="0.1" />
          <circle cx="160" cy="55" r="24" strokeWidth="7" opacity="0.14" />
          <circle cx="300" cy="150" r="30" strokeWidth="8" opacity="0.12" />
          <circle cx="30" cy="140" r="16" strokeWidth="5" opacity="0.1" />
          <circle cx="380" cy="90" r="12" strokeWidth="4" opacity="0.12" />
        </g>
        <g fill="white" opacity="0.18" fontSize="9" fontFamily="monospace">
          <text x="110" y="120">864</text>
          <text x="255" y="45">862</text>
          <text x="40" y="80">903</text>
          <text x="345" y="175">865</text>
        </g>
      </svg>
    );
  }

  if (pattern === "waves") {
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g stroke="white" fill="none" strokeWidth="1.5">
          <path d="M0 60 C60 30 120 90 180 60 S 300 30 400 70" opacity="0.16" />
          <path d="M0 95 C70 65 140 125 210 95 S 330 65 400 105" opacity="0.12" />
          <path d="M0 130 C60 105 130 160 200 130 S 320 100 400 140" opacity="0.1" />
          <path d="M0 165 C80 140 160 190 240 165 S 340 140 400 175" opacity="0.08" />
        </g>
        <g fill="white" opacity="0.25">
          <circle cx="180" cy="60" r="2.5" />
          <circle cx="90" cy="45" r="2" />
          <circle cx="310" cy="45" r="2" />
          <circle cx="210" cy="95" r="2.5" />
          <circle cx="120" cy="118" r="2" />
        </g>
        <g fill="white" opacity="0.15" fontSize="8" fontFamily="monospace">
          <text x="186" y="52">478</text>
          <text x="96" y="37">512</text>
          <text x="316" y="38">430</text>
        </g>
      </svg>
    );
  }

  if (pattern === "contour") {
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g stroke="white" fill="none">
          <ellipse cx="320" cy="40" rx="90" ry="55" strokeWidth="1.5" opacity="0.14" />
          <ellipse cx="320" cy="40" rx="65" ry="38" strokeWidth="1.5" opacity="0.12" />
          <ellipse cx="320" cy="40" rx="40" ry="22" strokeWidth="1.5" opacity="0.1" />
          <ellipse cx="60" cy="170" rx="100" ry="60" strokeWidth="1.5" opacity="0.12" />
          <ellipse cx="60" cy="170" rx="70" ry="40" strokeWidth="1.5" opacity="0.1" />
          <ellipse cx="60" cy="170" rx="42" ry="22" strokeWidth="1.5" opacity="0.08" />
          <path d="M140 100 C180 80 240 130 400 110" strokeWidth="1.5" opacity="0.1" />
        </g>
      </svg>
    );
  }

  if (pattern === "grid") {
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g stroke="white" strokeWidth="1" opacity="0.1">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50 + 60} y2="200" />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 50} x2="400" y2={i * 50 - 30} />
          ))}
        </g>
        <g stroke="white" strokeWidth="2" opacity="0.18" strokeLinecap="round">
          <path d="M80 45 v14 M73 52 h14" />
          <path d="M290 130 v14 M283 137 h14" />
          <path d="M350 60 v10 M345 65 h10" />
        </g>
      </svg>
    );
  }

  // letters は patternText で描画するためレイヤーなし
  return null;
}

export interface BannerCardProps {
  /** 上部の小さいラベル（例: リーディング問題演習） */
  label: string;
  /** 大きいタイトル（例: Reading） */
  title: string;
  /** タイトル下のテキスト（例: 合計 67問） */
  subtitle?: string;
  badges?: string[];
  href?: string;
  comingSoon?: boolean;
  tone?: BannerTone;
  pattern?: BannerPattern;
  /** pattern="letters" のとき背景に敷く巨大文字 */
  patternText?: string;
  /** 0〜1。指定すると下部に進捗バーを表示 */
  progress?: number;
  className?: string;
}

export default function BannerCard({
  label,
  title,
  subtitle,
  badges = [],
  href,
  comingSoon = false,
  tone = "navy",
  pattern = "xo",
  patternText,
  progress,
  className = "",
}: BannerCardProps) {
  const body: ReactNode = (
    <div
      className={`relative overflow-hidden rounded-xl min-h-[176px] p-5 flex flex-col justify-between text-white shadow-md transition-transform duration-300 ${
        comingSoon ? "opacity-75" : "group-hover:scale-[1.015] group-hover:shadow-lg"
      } ${className}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${TONE_GRADIENTS[tone]}`} />
      {pattern === "letters" && patternText ? (
        <div
          className="absolute -bottom-8 -left-2 text-[110px] leading-none font-black text-white/[0.08] tracking-tighter whitespace-nowrap select-none"
          aria-hidden
        >
          {patternText}
        </div>
      ) : (
        <PatternLayer pattern={pattern} />
      )}

      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-white/85">{label}</div>
          {comingSoon && (
            <span className="text-[10px] font-semibold bg-white/20 rounded px-2 py-0.5 flex-shrink-0">準備中</span>
          )}
        </div>
        <div className="text-2xl sm:text-[26px] font-bold mt-1 tracking-tight">{title}</div>
        {subtitle && <div className="text-sm text-white/85 mt-2">{subtitle}</div>}
      </div>

      <div className="relative mt-5">
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {badges.map((badge) => (
              <span
                key={badge}
                className="text-[10px] font-semibold bg-white/95 text-blue-700 rounded px-1.5 py-0.5"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
        {progress !== undefined && (
          <div className="h-1 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (href && !comingSoon) {
    return (
      <Link href={href} className="group block">
        {body}
      </Link>
    );
  }
  return <div className="group">{body}</div>;
}
