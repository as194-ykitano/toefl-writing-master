"use client";

// Home に並べる技能カード（Reading / Listening / Speaking / Writing）
// 「押したくなる・今どの練習に入れるか分かる」を狙い、
// 技能名 / 説明 / 直近の学習状況 / 問題タイプ数 / Start·Continue CTA を1枚に収める。
// 参考画像より少しミニマルに、既存のカードトーン（白背景・角丸・淡いボーダー）に合わせる。

import Link from "next/link";
import { ArrowRight, LucideIcon } from "lucide-react";

export interface SkillCardProps {
  title: string;
  /** 技能の簡単な説明（日本語） */
  description: string;
  icon: LucideIcon;
  /** アイコンの配色（例: "text-blue-600 bg-blue-50"） */
  accent: string;
  href: string;
  /** 問題タイプ数 */
  typeCount?: number;
  /** 問題・タスク総数 */
  itemCount?: number;
  /** 直近の学習状況（例: "3 セッション完了" / "未着手"） */
  statusLabel?: string;
  /** 進捗 0〜1。指定すると細いバーを表示 */
  progress?: number;
  /** 着手済みなら「続ける」、未着手なら「はじめる」 */
  started?: boolean;
}

export default function SkillCard({
  title,
  description,
  icon: Icon,
  accent,
  href,
  typeCount,
  itemCount,
  statusLabel,
  progress,
  started = false,
}: SkillCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col bg-white rounded-2xl border border-gray-200/70 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        {statusLabel && (
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-1">
            {statusLabel}
          </span>
        )}
      </div>

      <div className="mt-3.5 text-[15px] font-bold text-gray-900">{title}</div>
      <p className="mt-1 text-xs text-gray-500 leading-relaxed flex-1">{description}</p>

      {(typeCount || itemCount) && (
        <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-400">
          {typeCount ? <span>{typeCount} 問題タイプ</span> : null}
          {itemCount ? <span>{itemCount} 問</span> : null}
        </div>
      )}

      {progress !== undefined && (
        <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-eg"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
      )}

      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-eg-deep group-hover:gap-1.5 transition-all">
        {started ? "続ける" : "はじめる"}
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}
