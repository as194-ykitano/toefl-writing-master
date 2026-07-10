"use client";

// ホーム（マイコース）
// Google Classroom 風: あいさつ + コースカード + クイックアクセス

import Link from "next/link";
import { BookOpenCheck, CalendarDays, LayoutDashboard, PenLine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrepShell from "@/components/prep/PrepShell";
import BannerCard from "@/components/prep/BannerCard";

const QUICK_LINKS = [
  {
    href: "/training-selection",
    icon: PenLine,
    title: "Writing 添削",
    description: "従来の AI 添削トップを開く",
    color: "text-eg-dark bg-eg-soft",
  },
  {
    href: "/overview",
    icon: LayoutDashboard,
    title: "ダッシュボード",
    description: "推定スコアと学習状況",
    color: "text-blue-600 bg-blue-50",
  },
  {
    href: "/review",
    icon: BookOpenCheck,
    title: "復習",
    description: "間違えた問題をやり直す",
    color: "text-violet-600 bg-violet-50",
  },
  {
    href: "/study-plan",
    icon: CalendarDays,
    title: "学習プラン",
    description: "今週やるべきことを確認",
    color: "text-emerald-600 bg-emerald-50",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const name = user?.displayName;

  return (
    <PrepShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {name ? `こんにちは、${name} さん` : "こんにちは"}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          TOEFL / IELTS の4技能を、練習・診断・復習・AI添削までひとつのアプリで。
        </p>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">マイコース</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <BannerCard
            label="TOEFL iBT 対策コース"
            title="TOEFL"
            subtitle="Reading / Listening / Speaking / Writing"
            badges={["新形式100%対応", "AI添削つき"]}
            href="/toefl"
            tone="navy"
            pattern="xo"
            progress={0}
          />
          <BannerCard
            label="IELTS Academic 対策コース"
            title="IELTS"
            subtitle="Reading / Listening / Speaking / Writing"
            badges={["Band 推定", "AI添削つき"]}
            href="/ielts"
            tone="indigo"
            pattern="waves"
            progress={0}
          />
          <BannerCard
            label="応用トレーニングコース"
            title="Advanced"
            subtitle="YouTube / 自由記述 / カスタムプロンプト"
            badges={["形式フリー", "添削無制限"]}
            href="/advanced"
            tone="teal"
            pattern="contour"
            progress={0}
          />
          <BannerCard
            label="模試・実力診断"
            title="Mock Test"
            subtitle="フル模試・ミニ模試で現在地を測定"
            badges={["スコアレポート"]}
            href="/mock"
            tone="amber"
            pattern="letters"
            patternText="MOCK TEST"
          />
        </div>

        <h2 className="text-base font-bold text-gray-900 mt-10">クイックアクセス</h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-xl border border-gray-200/70 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${link.color}`}>
                <link.icon className="w-4.5 h-4.5" />
              </div>
              <div className="text-sm font-semibold text-gray-900">{link.title}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{link.description}</div>
            </Link>
          ))}
        </div>

        <p className="mt-12 text-center text-[11px] text-gray-400">
          Prep Master — Supported by <span className="font-semibold text-eg-dark">English Gym</span>
        </p>
      </div>
    </PrepShell>
  );
}
