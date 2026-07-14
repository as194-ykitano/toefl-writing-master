"use client";

// Advanced Hub
// TOEFL / IELTS の公式形式に属さない応用トレーニングの受け皿
// YouTube Writing / Free Writing は既存機能へ接続

import HubPage from "@/components/prep/HubPage";

export default function AdvancedHubPage() {
  return (
    <HubPage
      title="Advanced トレーニング"
      headerBadges={["形式フリー"]}
      subtitle="TOEFLやIELTSの形式に縛られず、YouTube動画・自由記述・カスタムプロンプトを使って英語アウトプットを鍛えます。"
      sections={[
        {
          style: "banner",
          title: "Writing トレーニング",
          description: "AI 添削つきの応用ライティング練習",
          banners: [
            {
              label: "動画を教材にしたライティング",
              title: "YouTube Writing",
              subtitle: "好きな動画で要約・意見ライティング",
              badges: ["AI添削", "添削無制限"],
              href: "/advanced/youtube",
              tone: "amber",
              pattern: "letters",
              patternText: "YOUTUBE",
              progress: 0,
            },
            // Free Writing は新仕様では一時的に非表示（旧 /basic-dashboard は残置）
          ],
        },
        // 「今後追加予定」セクションは一時的に非表示
      ]}
    />
  );
}
