"use client";

// IELTS Test Hub
// Writing Task 1 / 2 は既存の AI 添削機能（/ielts-tasks）へ接続し、R/L/S は新しい演習へ

import {
  BarChart3,
  ClipboardList,
  ListChecks,
  PenLine,
  Timer,
} from "lucide-react";
import HubPage from "@/components/prep/HubPage";
import { LISTENING_SETS, READING_SETS, SPEAKING_SETS } from "@/lib/prep/mock-data";

const readingCount = READING_SETS.filter((s) => s.exam === "ielts").reduce(
  (acc, s) => acc + s.questions.length,
  0
);
const listeningCount = LISTENING_SETS.filter((s) => s.exam === "ielts").reduce(
  (acc, s) => acc + s.questions.length,
  0
);
const speakingCount = SPEAKING_SETS.filter((s) => s.exam === "ielts").reduce(
  (acc, s) => acc + s.tasks.length,
  0
);

export default function IeltsHubPage() {
  return (
    <HubPage
      title="IELTS Academic 対策"
      headerBadges={["Band 0–9"]}
      subtitle="IELTS Academic形式に沿って、Reading, Listening, Speaking, Writing を練習します。Band スコアの推定と問題タイプ別の対策ができます。"
      sections={[
        {
          style: "banner",
          title: "セクション別学習",
          banners: [
            {
              label: "リーディング問題演習",
              title: "Reading",
              subtitle: `合計 ${readingCount}問`,
              badges: ["TFNG・マッチング対応"],
              href: "/practice/ielts/reading",
              tone: "indigo",
              pattern: "xo",
              progress: 0,
            },
            {
              label: "リスニング問題演習",
              title: "Listening",
              subtitle: `合計 ${listeningCount}問`,
              badges: ["穴埋め対応"],
              href: "/practice/ielts/listening",
              tone: "blue",
              pattern: "waves",
              progress: 0,
            },
            {
              label: "スピーキング問題演習",
              title: "Speaking",
              subtitle: `合計 ${speakingCount}問（Part 1〜2 形式）`,
              badges: ["録音・再生確認"],
              href: "/practice/ielts/speaking",
              tone: "teal",
              pattern: "contour",
              progress: 0,
            },
            {
              label: "ライティング問題演習",
              title: "Writing",
              subtitle: "Task 1 / Task 2",
              badges: ["AI添削", "添削無制限"],
              href: "/ielts-tasks",
              tone: "violet",
              pattern: "letters",
              patternText: "WRITE",
              progress: 0,
            },
          ],
        },
        {
          id: "writing",
          style: "compact",
          title: "Writing タスク",
          description: "実績のある AI 添削つき Writing トレーニング（既存機能）",
          entries: [
            {
              title: "Writing Task 1",
              description: "グラフ・図表の描写タスク（20 分・150 語以上）。AI 添削つき",
              href: "/ielts-tasks",
              badge: "AI添削",
              icon: BarChart3,
              iconColor: "text-emerald-600 bg-emerald-50",
            },
            {
              title: "Writing Task 2",
              description: "エッセイライティング（40 分・250 語以上）。AI 添削つき",
              href: "/ielts-tasks",
              badge: "AI添削",
              icon: PenLine,
              iconColor: "text-emerald-600 bg-emerald-50",
            },
          ],
        },
        {
          style: "compact",
          title: "問題タイプ別練習",
          description: "苦手な問題タイプを集中的に鍛えます",
          entries: [
            {
              title: "Reading Question Type Practice",
              description: "TFNG / マッチング / 穴埋めなどタイプ別の集中演習",
              icon: ListChecks,
              iconColor: "text-blue-600 bg-blue-50",
              comingSoon: true,
            },
            {
              title: "Listening Question Type Practice",
              description: "フォーム穴埋め / 地図問題などタイプ別の集中演習",
              icon: ListChecks,
              iconColor: "text-violet-600 bg-violet-50",
              comingSoon: true,
            },
          ],
        },
        {
          id: "mock",
          style: "compact",
          title: "模試",
          description: "本番と同じ流れで受験し、推定 Band を測定します",
          entries: [
            {
              title: "Full Mock Test",
              description: "4 セクション通しの本番形式模試（約 2 時間 45 分）",
              icon: ClipboardList,
              iconColor: "text-blue-600 bg-blue-50",
              comingSoon: true,
            },
            {
              title: "Mini Mock Test",
              description: "各セクション短縮版で現在地を素早く測定（約 60 分）",
              icon: Timer,
              iconColor: "text-violet-600 bg-violet-50",
              comingSoon: true,
            },
          ],
        },
      ]}
    />
  );
}
