"use client";

// TOEFL Test Hub — 2026 年 1 月開始の新形式 TOEFL iBT に対応
// Speaking: Listen and Repeat / Take an Interview
// Writing:  Build a Sentence / Write an Email / Academic Discussion
// ※ Integrated Writing は新形式で廃止されたためハブには表示しない
//   （既存の /tasks ルート自体は残してあり、直接アクセスは可能）

import {
  ClipboardList,
  Ear,
  Mail,
  MessagesSquare,
  Mic,
  Puzzle,
  Timer,
} from "lucide-react";
import HubPage from "@/components/prep/HubPage";
import { LISTENING_SETS, READING_SETS, SPEAKING_SETS } from "@/lib/prep/mock-data";

const readingCount = READING_SETS.filter((s) => s.exam === "toefl").reduce(
  (acc, s) => acc + s.questions.length,
  0
);
const listeningCount = LISTENING_SETS.filter((s) => s.exam === "toefl").reduce(
  (acc, s) => acc + s.questions.length,
  0
);
const speakingCount = SPEAKING_SETS.filter((s) => s.exam === "toefl").reduce(
  (acc, s) => acc + s.tasks.length,
  0
);

export default function ToeflHubPage() {
  return (
    <HubPage
      title="TOEFL iBT 対策"
      headerBadges={["新形式対応", "Band 1–6"]}
      subtitle="2026年1月開始の新形式 TOEFL iBT（約90分・アダプティブ・Band 1–6採点）に沿って、Reading, Listening, Speaking, Writing を練習します。"
      sections={[
        {
          style: "banner",
          title: "セクション別学習",
          banners: [
            {
              label: "リーディング問題演習",
              title: "Reading",
              subtitle: `合計 ${readingCount}問`,
              badges: ["新形式100%対応"],
              href: "/practice/toefl/reading",
              tone: "navy",
              pattern: "xo",
              progress: 0,
            },
            {
              label: "リスニング問題演習",
              title: "Listening",
              subtitle: `合計 ${listeningCount}問`,
              badges: ["新形式100%対応"],
              href: "/practice/toefl/listening",
              tone: "blue",
              pattern: "waves",
              progress: 0,
            },
            {
              label: "スピーキング問題演習",
              title: "Speaking",
              subtitle: `合計 ${speakingCount}問（Take an Interview 形式）`,
              badges: ["新形式100%対応"],
              href: "/practice/toefl/speaking",
              tone: "teal",
              pattern: "contour",
              progress: 0,
            },
            {
              label: "ライティング問題演習",
              title: "Writing",
              subtitle: "Academic Discussion 形式",
              badges: ["新形式100%対応", "添削無制限"],
              href: "/toefl-tasks",
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
          title: "Writing タスク（新形式）",
          description: "新形式の Writing は Build a Sentence / Write an Email / Academic Discussion の 3 タスク構成です",
          entries: [
            {
              title: "Academic Discussion",
              description: "教授の質問と学生の投稿を読み、自分の意見を投稿する形式（10 分・100〜130 語）。AI 添削つき",
              href: "/toefl-tasks",
              badge: "AI添削",
              icon: MessagesSquare,
              iconColor: "text-emerald-600 bg-emerald-50",
            },
            {
              title: "Write an Email",
              description: "指定された状況と 3 つの要件を含むメールを書くタスク（7 分・80〜120 語）",
              icon: Mail,
              iconColor: "text-blue-600 bg-blue-50",
              comingSoon: true,
            },
            {
              title: "Build a Sentence",
              description: "語順が入れ替わった返信文を正しく並べ替えるタスク（10 問・約 7 分）",
              icon: Puzzle,
              iconColor: "text-violet-600 bg-violet-50",
              comingSoon: true,
            },
          ],
        },
        {
          style: "compact",
          title: "Speaking タスク（新形式）",
          description: "新形式の Speaking は Listen and Repeat / Take an Interview の 2 タスク構成です（約 8 分）",
          entries: [
            {
              title: "Take an Interview",
              description: "テーマに沿った 4 つの質問に各 45 秒で回答するインタビュー形式",
              href: "/practice/toefl/speaking",
              icon: Mic,
              iconColor: "text-orange-600 bg-orange-50",
            },
            {
              title: "Listen and Repeat",
              description: "聞こえた短い文をそのまま復唱するタスク（7 問）",
              icon: Ear,
              iconColor: "text-teal-600 bg-teal-50",
              comingSoon: true,
            },
          ],
        },
        {
          id: "mock",
          style: "compact",
          title: "模試",
          description: "本番と同じ流れで受験し、Band 1–6 の推定スコアを測定します",
          entries: [
            {
              title: "Full Mock Test",
              description: "新形式の 4 セクション通し模試（約 90 分・アダプティブ）",
              icon: ClipboardList,
              iconColor: "text-blue-600 bg-blue-50",
              comingSoon: true,
            },
            {
              title: "Mini Mock Test",
              description: "各セクション短縮版で現在地を素早く測定（約 40 分）",
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
