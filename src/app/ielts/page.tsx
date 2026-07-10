"use client";

// IELTS コースハブ
// 上位階層は大きなセクション（R / L / S / W / 模試）のみで整理し、
// 問題タイプ別演習（Matching Headings / TFNG など）は
// 各セクションページ（/practice/ielts/...）内に表示する。

import { useEffect, useState } from "react";
import { ClipboardList, Timer } from "lucide-react";
import HubPage from "@/components/prep/HubPage";
import { getSkillStats } from "@/lib/prep/data-source";

export default function IeltsHubPage() {
  const [counts, setCounts] = useState({ reading: 0, listening: 0, speaking: 0 });

  useEffect(() => {
    const load = async () => {
      const [r, l, s] = await Promise.all([
        getSkillStats("ielts", "reading"),
        getSkillStats("ielts", "listening"),
        getSkillStats("ielts", "speaking"),
      ]);
      setCounts({ reading: r.questionCount, listening: l.questionCount, speaking: s.questionCount });
    };
    load();
  }, []);

  return (
    <HubPage
      title="IELTS Academic 対策"
      headerBadges={["Band 0–9"]}
      subtitle="IELTS Academic形式に沿って、Reading, Listening, Speaking, Writing を練習します。各セクションを開くと、Matching Headings や TFNG などの問題タイプ別演習に進めます。"
      sections={[
        {
          style: "banner",
          title: "セクション別学習",
          description: "セクションを開くと、問題タイプ別演習を選べます",
          banners: [
            {
              label: "リーディング問題演習",
              title: "Reading",
              subtitle: counts.reading ? `13 タイプ / 合計 ${counts.reading} 問` : "13 の問題タイプ別演習",
              badges: ["問題タイプ別"],
              href: "/practice/ielts/reading",
              tone: "indigo",
              pattern: "xo",
              progress: 0,
            },
            {
              label: "リスニング問題演習",
              title: "Listening",
              subtitle: counts.listening ? `11 タイプ / 合計 ${counts.listening} 問` : "11 の問題タイプ別演習",
              badges: ["問題タイプ別"],
              href: "/practice/ielts/listening",
              tone: "blue",
              pattern: "waves",
              progress: 0,
            },
            {
              label: "スピーキング問題演習",
              title: "Speaking",
              subtitle: `Part 1〜2 形式（${counts.speaking} タスク）`,
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
              href: "/practice/ielts/writing",
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
          description: "本番と同じ流れで R / L / S を通し受験し、推定 Band と弱点分析を測定します",
          entries: [
            {
              title: "Full Mock Test",
              description: "Reading / Listening を各 2 セクション通し受験（約 60〜75 分）",
              icon: ClipboardList,
              iconColor: "text-blue-600 bg-blue-50",
              href: "/mock?exam=ielts&variant=full",
            },
            {
              title: "Mini Mock Test",
              description: "各技能 1 セクションで現在地を素早く測定（約 30〜40 分）",
              icon: Timer,
              iconColor: "text-violet-600 bg-violet-50",
              href: "/mock?exam=ielts&variant=mini",
            },
          ],
        },
      ]}
    />
  );
}
