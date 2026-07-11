"use client";

// 学習履歴
// 選択中の試験の演習・添削履歴を、問題名 / スコア / 演習日 / 演習時間のリストで一覧表示する。
// 技能でのフィルタとページングに対応。データは use-activity（localStorage 集計）から取得。

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Headphones, ListChecks, Mic, PenLine } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { useExam } from "@/contexts/ExamContext";
import {
  ActivityItem,
  formatActivityScore,
  formatDuration,
  usePrepActivity,
} from "@/lib/prep/use-activity";
import { EXAM_LABELS, EXAM_SKILLS, ExamId, SkillId } from "@/lib/prep/types";

const SKILL_META: Record<SkillId, { label: string; icon: typeof BookOpen; color: string; dark: string }> = {
  reading: { label: "Reading", icon: BookOpen, color: "#3b82f6", dark: "dark:text-blue-400" },
  listening: { label: "Listening", icon: Headphones, color: "#8b5cf6", dark: "dark:text-violet-400" },
  speaking: { label: "Speaking", icon: Mic, color: "#f97316", dark: "dark:text-orange-400" },
  writing: { label: "Writing", icon: PenLine, color: "#10b981", dark: "dark:text-emerald-400" },
};

const PAGE_SIZE = 8;

export default function HistoryPage() {
  const { exam } = useExam();
  const activeExam: ExamId = exam === "advanced" ? "toefl" : exam;
  const { items, loading } = usePrepActivity(activeExam);

  const [skillFilter, setSkillFilter] = useState<SkillId | "all">("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => (skillFilter === "all" ? items : items.filter((it) => it.skill === skillFilter)),
    [items, skillFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const filterSkills = EXAM_SKILLS[activeExam];

  const changeFilter = (f: SkillId | "all") => {
    setSkillFilter(f);
    setPage(0);
  };

  return (
    <PrepShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ヘッダー */}
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">学習履歴</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {EXAM_LABELS[activeExam]} のこれまでの演習・添削の記録
          </p>
        </div>

        {/* 技能フィルタ */}
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-700">
          <FilterChip active={skillFilter === "all"} onClick={() => changeFilter("all")}>
            すべて
          </FilterChip>
          {filterSkills.map((s) => {
            const meta = SKILL_META[s];
            return (
              <FilterChip key={s} active={skillFilter === s} onClick={() => changeFilter(s)}>
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                {meta.label}
              </FilterChip>
            );
          })}
        </div>

        {/* リスト */}
        <div className="glass-card rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
              読み込み中...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ListChecks className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                まだ演習履歴がありません
              </p>
              <Link
                href="/home"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-eg-deep hover:text-eg-dark"
              >
                演習を始める <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <>
              {/* テーブルヘッダー（デスクトップ） */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <div>問題名</div>
                <div className="text-right w-20">スコア</div>
                <div className="text-right w-24">演習日</div>
                <div className="text-right w-20">演習時間</div>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {pageItems.map((it, i) => (
                  <HistoryRow key={it.id} item={it} index={i} />
                ))}
              </ul>
            </>
          )}
        </div>

        {/* ページング */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500 text-xs">
              {filtered.length} 件中 {page * PAGE_SIZE + 1}〜
              {Math.min(filtered.length, page * PAGE_SIZE + PAGE_SIZE)} 件
            </span>
            <div className="flex items-center gap-1.5">
              <PageButton disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                前へ
              </PageButton>
              <span className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                {page + 1} / {totalPages}
              </span>
              <PageButton
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                次へ
              </PageButton>
            </div>
          </div>
        )}
      </div>
    </PrepShell>
  );
}

function HistoryRow({ item, index }: { item: ActivityItem; index: number }) {
  const meta = SKILL_META[item.skill];
  const Icon = meta.icon;
  return (
    <li
      style={{ animationDelay: `${index * 40}ms` }}
      className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
    >
      <Link
        href={item.href}
        className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors items-center"
      >
        {/* 問題名 */}
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${meta.color}1a` }}
          >
            <Icon className={`w-3.5 h-3.5 ${meta.dark}`} style={{ color: meta.color }} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.title}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 sm:hidden">
              {new Date(item.finishedAt).toLocaleDateString("ja-JP")} ・{" "}
              {formatDuration(item.durationSec)}
            </div>
          </div>
        </div>

        {/* スコア */}
        <div className="text-right sm:w-20 text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
          {formatActivityScore(item)}
        </div>

        {/* 演習日（デスクトップ） */}
        <div className="hidden sm:block text-right w-24 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {new Date(item.finishedAt).toLocaleDateString("ja-JP")}
        </div>

        {/* 演習時間（デスクトップ） */}
        <div className="hidden sm:block text-right w-20 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {formatDuration(item.durationSec)}
        </div>
      </Link>
    </li>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      {children}
    </button>
  );
}
