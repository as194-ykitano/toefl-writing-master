"use client";

// TOEFL コースハブ — 2026 年 1 月開始の新形式 TOEFL iBT に対応
// 上位階層は大きなセクション（R / L / S / W / 模試）のみで整理し、
// 問題タイプ別演習は各セクションページ（/practice/toefl/...）内に表示する。

import { useEffect, useState } from "react";
import { ClipboardList, Timer } from "lucide-react";
import HubPage from "@/components/prep/HubPage";
import { getSkillStats } from "@/lib/prep/data-source";

export default function ToeflHubPage() {
  const [counts, setCounts] = useState({ reading: 0, listening: 0, speaking: 0 });

  useEffect(() => {
    const load = async () => {
      const [r, l, s] = await Promise.all([
        getSkillStats("toefl", "reading"),
        getSkillStats("toefl", "listening"),
        getSkillStats("toefl", "speaking"),
      ]);
      setCounts({ reading: r.questionCount, listening: l.questionCount, speaking: s.questionCount });
    };
    load();
  }, []);

  return (
    <HubPage
      title="TOEFL iBT 対策"
      headerBadges={["新形式対応", "Band 1–6"]}
      subtitle="2026年1月開始の新形式 TOEFL iBT（約90分・アダプティブ・Band 1–6採点）に沿って、Reading, Listening, Speaking, Writing を練習します。各セクションを開くと問題タイプ別演習に進めます。"
      sections={[
        {
          style: "banner",
          title: "セクション別学習",
          description: "セクションを開くと、問題タイプ別演習を選べます",
          banners: [
            {
              label: "リーディング問題演習",
              title: "Reading",
              subtitle: "Complete the Words / Daily Life / Academic Passage",
              badges: ["新形式100%対応"],
              href: "/practice/toefl/reading",
              tone: "navy",
              pattern: "xo",
              progress: 0,
            },
            {
              label: "リスニング問題演習",
              title: "Listening",
              subtitle: "Conversation / Announcement / Academic Talk",
              badges: ["新形式100%対応"],
              href: "/practice/toefl/listening",
              tone: "blue",
              pattern: "waves",
              progress: 0,
            },
            {
              label: "スピーキング問題演習",
              title: "Speaking",
              subtitle: `Listen and Repeat / Take an Interview（${counts.speaking} タスク）`,
              badges: ["新形式100%対応"],
              href: "/practice/toefl/speaking",
              tone: "teal",
              pattern: "contour",
              progress: 0,
            },
            {
              label: "ライティング問題演習",
              title: "Writing",
              subtitle: "Build a Sentence / Write an Email / Academic Discussion",
              badges: ["新形式100%対応", "AI添削つき"],
              href: "/practice/toefl/writing",
              tone: "violet",
              pattern: "letters",
              patternText: "WRITE",
              progress: 0,
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
