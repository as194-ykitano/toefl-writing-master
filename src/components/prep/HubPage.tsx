"use client";

// TOEFL / IELTS / Advanced ハブ画面の共通レイアウト
// セクションは 2 スタイル:
//   banner  — ダークグラデーションの大カード（技能別学習など）
//   compact — 白背景の小カード（タスク別・模試・準備中項目など）

import Link from "next/link";
import { ArrowRight, Clock, LucideIcon } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import BannerCard, { BannerCardProps } from "@/components/prep/BannerCard";

export interface HubCompactEntry {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
  /** 既存の AI 添削機能などを示すバッジ */
  badge?: string;
  icon: LucideIcon;
  iconColor: string; // 例: "text-blue-600 bg-blue-50"
}

export type HubSection =
  | {
      style: "banner";
      id?: string;
      title: string;
      description?: string;
      banners: BannerCardProps[];
    }
  | {
      style: "compact";
      id?: string;
      title: string;
      description?: string;
      entries: HubCompactEntry[];
    };

interface HubPageProps {
  title: string;
  subtitle: string;
  /** タイトル横の小バッジ（例: 新形式対応） */
  headerBadges?: string[];
  sections: HubSection[];
}

function CompactCard({ entry }: { entry: HubCompactEntry }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.iconColor}`}>
          <entry.icon className="w-5 h-5" />
        </div>
        {entry.comingSoon ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-50 rounded-full px-2 py-1">
            <Clock className="w-3 h-3" /> 準備中
          </span>
        ) : entry.badge ? (
          <span className="text-[10px] font-medium text-blue-700 bg-blue-50 rounded-full px-2 py-1">
            {entry.badge}
          </span>
        ) : null}
      </div>
      <div className="mt-3 font-semibold text-gray-900 text-sm">{entry.title}</div>
      <p className="mt-1 text-xs text-gray-500 leading-relaxed flex-1">{entry.description}</p>
      {!entry.comingSoon && entry.href && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:text-blue-800">
          開く <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </>
  );

  const cardClass = `group bg-white rounded-xl border p-5 flex flex-col transition-all ${
    entry.comingSoon ? "border-gray-100 opacity-70" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
  }`;

  if (entry.comingSoon || !entry.href) {
    return <div className={cardClass}>{inner}</div>;
  }
  return (
    <Link href={entry.href} className={cardClass}>
      {inner}
    </Link>
  );
}

export default function HubPage({ title, subtitle, headerBadges = [], sections }: HubPageProps) {
  return (
    <PrepShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
            {headerBadges.map((badge) => (
              <span
                key={badge}
                className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5"
              >
                {badge}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-sm text-gray-500 max-w-2xl leading-relaxed">{subtitle}</p>
        </div>

        {sections.map((section) => (
          <section key={section.title} id={section.id} className="scroll-mt-20">
            <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
            {section.description && <p className="mt-1 text-xs text-gray-500">{section.description}</p>}
            {section.style === "banner" ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.banners.map((banner) => (
                  <BannerCard key={banner.title + banner.label} {...banner} />
                ))}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.entries.map((entry) => (
                  <CompactCard key={entry.title} entry={entry} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </PrepShell>
  );
}
