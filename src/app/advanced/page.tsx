"use client";

// Advanced Hub
// TOEFL / IELTS の公式形式に属さない応用トレーニングの受け皿
// YouTube Writing / Free Writing は既存機能へ接続

import {
  FileText,
  Lightbulb,
  MessageSquareQuote,
  ScrollText,
} from "lucide-react";
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
          description: "AI 添削つきの応用ライティング練習（既存機能）",
          banners: [
            {
              label: "動画を教材にしたライティング",
              title: "YouTube Writing",
              subtitle: "好きな動画で要約・意見ライティング",
              badges: ["AI添削", "添削無制限"],
              href: "/youtuber-dashboard",
              tone: "amber",
              pattern: "letters",
              patternText: "YOUTUBE",
              progress: 0,
            },
            {
              label: "自由記述トレーニング",
              title: "Free Writing",
              subtitle: "試験形式に縛られない自由なライティング",
              badges: ["AI添削", "添削無制限"],
              href: "/basic-dashboard",
              tone: "violet",
              pattern: "grid",
              progress: 0,
            },
          ],
        },
        {
          style: "compact",
          title: "今後追加予定",
          entries: [
            {
              title: "Custom Prompt Writing",
              description: "自分で設定したプロンプトで書く練習",
              icon: Lightbulb,
              iconColor: "text-orange-600 bg-orange-50",
              comingSoon: true,
            },
            {
              title: "General Essay Practice",
              description: "汎用的なエッセイライティングの練習",
              icon: FileText,
              iconColor: "text-blue-600 bg-blue-50",
              comingSoon: true,
            },
            {
              title: "Opinion Writing",
              description: "意見表明に特化したアウトプット練習",
              icon: MessageSquareQuote,
              iconColor: "text-emerald-600 bg-emerald-50",
              comingSoon: true,
            },
            {
              title: "Summary Writing",
              description: "要約力を鍛えるトレーニング",
              icon: ScrollText,
              iconColor: "text-gray-600 bg-gray-100",
              comingSoon: true,
            },
          ],
        },
      ]}
    />
  );
}
