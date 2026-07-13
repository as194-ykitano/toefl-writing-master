export type GuideScreenshot = {
  src: string;
  alt: string;
};

const practiceScreenshot = (guideId: string, title: string): GuideScreenshot[] => [{
  src: `/guide-screenshots/${guideId}/01-practice-list.png`,
  alt: `${title}の演習一覧と開始ボタン`,
}];

export const GUIDE_SCREENSHOTS: Record<string, GuideScreenshot[]> = {
  "getting-started": [{
    src: "/guide-screenshots/getting-started/01-home.png",
    alt: "ホーム画面の試験切替、目標時間、技能選択",
  }],
  "toefl-reading": practiceScreenshot("toefl-reading", "TOEFL Reading"),
  "toefl-listening": practiceScreenshot("toefl-listening", "TOEFL Listening"),
  "toefl-speaking": practiceScreenshot("toefl-speaking", "TOEFL Speaking"),
  "toefl-writing": practiceScreenshot("toefl-writing", "TOEFL Writing"),
  "ielts-reading": practiceScreenshot("ielts-reading", "IELTS Reading"),
  "ielts-listening": practiceScreenshot("ielts-listening", "IELTS Listening"),
  "ielts-speaking": practiceScreenshot("ielts-speaking", "IELTS Speaking"),
  "ielts-writing": practiceScreenshot("ielts-writing", "IELTS Writing"),
  "toeic-reading": practiceScreenshot("toeic-reading", "TOEIC Reading"),
  "toeic-listening": practiceScreenshot("toeic-listening", "TOEIC Listening"),
  "mock-tests": [{
    src: "/guide-screenshots/mock-tests/01-mock-list.png",
    alt: "模試画面と現在の公開状態",
  }],
  "learning-data": [
    { src: "/guide-screenshots/learning-data/01-study-time.png", alt: "学習時間の技能別・問題タイプ別表示" },
    { src: "/guide-screenshots/learning-data/02-history.png", alt: "学習履歴の技能フィルターと履歴一覧" },
    { src: "/guide-screenshots/learning-data/03-overview.png", alt: "データ推移の集計期間と技能切替" },
  ],
  "video-courses": [{
    src: "/guide-screenshots/video-courses/01-course-list.png",
    alt: "動画コースの検索とコース選択",
  }],
};

export function getGuideScreenshots(guideId: string): GuideScreenshot[] {
  return GUIDE_SCREENSHOTS[guideId] ?? [];
}
