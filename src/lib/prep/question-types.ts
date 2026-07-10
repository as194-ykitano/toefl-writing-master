// 問題タイプ別演習のカタログ
// セクション（Reading / Listening / ...）配下に表示する問題タイプの定義。
// IELTS はインポート済み問題データの practiceType slug と対応させる。
// TOEFL は箱のみ先に用意し、問題データは後から追加する。

import { ExamId, SkillId } from "./types";

export interface PracticeTypeInfo {
  /** practiceType slug（問題セット側の practiceType と一致させる） */
  id: string;
  exam: ExamId;
  skill: SkillId;
  label: string;
  labelJa: string;
  description?: string;
  /**
   * 問題セット一覧ではなく既存機能へ直接リンクする場合の遷移先
   * （例: Writing の AI 添削）
   */
  href?: string;
  /** 既存 AI 添削など、特別な機能があることを示すバッジ */
  badge?: string;
  comingSoon?: boolean;
}

export const PRACTICE_TYPES: PracticeTypeInfo[] = [
  // ---- IELTS Reading（インポート済みデータあり） ----
  { id: "multiple-choice", exam: "ielts", skill: "reading", label: "Multiple Choice", labelJa: "多肢選択" },
  { id: "matching-headings", exam: "ielts", skill: "reading", label: "Matching Headings", labelJa: "見出しマッチング" },
  { id: "matching-information", exam: "ielts", skill: "reading", label: "Matching Information", labelJa: "情報マッチング" },
  { id: "matching-features", exam: "ielts", skill: "reading", label: "Matching Features", labelJa: "特徴マッチング" },
  { id: "matching-sentence-endings", exam: "ielts", skill: "reading", label: "Matching Sentence Endings", labelJa: "文末マッチング" },
  { id: "identifying-information-tfng", exam: "ielts", skill: "reading", label: "True / False / Not Given", labelJa: "正誤判定 (TFNG)" },
  { id: "identifying-writers-views-ynng", exam: "ielts", skill: "reading", label: "Yes / No / Not Given", labelJa: "筆者の見解 (YNNG)" },
  { id: "summary-completion", exam: "ielts", skill: "reading", label: "Summary Completion", labelJa: "要約完成" },
  { id: "sentence-completion", exam: "ielts", skill: "reading", label: "Sentence Completion", labelJa: "文完成" },
  { id: "short-answer-questions", exam: "ielts", skill: "reading", label: "Short Answer Questions", labelJa: "短答問題" },
  { id: "diagram-completion", exam: "ielts", skill: "reading", label: "Diagram Completion", labelJa: "図解完成" },
  { id: "table-completion", exam: "ielts", skill: "reading", label: "Table Completion", labelJa: "表完成" },
  { id: "flowchart-completion", exam: "ielts", skill: "reading", label: "Flow-chart Completion", labelJa: "フローチャート完成" },

  // ---- IELTS Listening（インポート済みデータあり） ----
  { id: "multiple-choice", exam: "ielts", skill: "listening", label: "Multiple Choice", labelJa: "多肢選択" },
  { id: "multiple-choice-multiple-answer", exam: "ielts", skill: "listening", label: "Multiple Choice (Multiple Answers)", labelJa: "多肢選択（複数回答）" },
  { id: "matching", exam: "ielts", skill: "listening", label: "Matching", labelJa: "マッチング" },
  { id: "map-labelling", exam: "ielts", skill: "listening", label: "Map Labelling", labelJa: "地図ラベリング", description: "地図画像は準備中です" },
  { id: "plan-labelling", exam: "ielts", skill: "listening", label: "Plan Labelling", labelJa: "図面ラベリング", description: "図面画像は準備中です" },
  { id: "form-note-completion", exam: "ielts", skill: "listening", label: "Form / Note Completion", labelJa: "フォーム・ノート完成" },
  { id: "note-completion", exam: "ielts", skill: "listening", label: "Note Completion", labelJa: "ノート完成" },
  { id: "table-completion", exam: "ielts", skill: "listening", label: "Table Completion", labelJa: "表完成" },
  { id: "flowchart-completion", exam: "ielts", skill: "listening", label: "Flow-chart Completion", labelJa: "フローチャート完成" },
  { id: "sentence-completion", exam: "ielts", skill: "listening", label: "Sentence Completion", labelJa: "文完成" },
  { id: "summary-completion", exam: "ielts", skill: "listening", label: "Summary Completion", labelJa: "要約完成" },

  // ---- IELTS Speaking（Notion からインポート済み） ----
  {
    id: "part-1",
    exam: "ielts",
    skill: "speaking",
    label: "Part 1",
    labelJa: "日常トピックの質疑応答",
    description: "身近なトピックについての短い質疑応答（各 40 秒目安）",
    badge: "AI添削",
  },
  {
    id: "part-2",
    exam: "ielts",
    skill: "speaking",
    label: "Part 2",
    labelJa: "キューカード・スピーチ",
    description: "準備 1 分 → 2 分間のスピーチ。Band 別模範解答つき",
    badge: "AI添削",
  },
  {
    id: "part-3",
    exam: "ielts",
    skill: "speaking",
    label: "Part 3",
    labelJa: "ディスカッション",
    description: "抽象的・社会的なテーマの深掘り質問。Band 別模範解答つき",
    badge: "AI添削",
  },
  {
    id: "full-practice",
    exam: "ielts",
    skill: "speaking",
    label: "Full Practice",
    labelJa: "本番仕様の通し練習",
    description: "ジャンル混成のインタビュー形式（本番仕様）",
    badge: "AI添削",
  },

  // ---- IELTS Writing（既存 AI 添削機能へ接続） ----
  {
    id: "task-1",
    exam: "ielts",
    skill: "writing",
    label: "Writing Task 1",
    labelJa: "グラフ・図表の描写",
    description: "20 分・150 語以上。AI 添削つき",
    badge: "AI添削",
  },
  {
    id: "task-2",
    exam: "ielts",
    skill: "writing",
    label: "Writing Task 2",
    labelJa: "エッセイライティング",
    description: "40 分・250 語以上。AI 添削つき",
    badge: "AI添削",
  },

  // ---- TOEFL Reading（新形式。Notion からインポート済み） ----
  {
    id: "complete-the-words",
    exam: "toefl",
    skill: "reading",
    label: "Complete the Words",
    labelJa: "単語補完",
    description: "文中の欠けた単語の後半を補うタスク",
  },
  {
    id: "daily-life",
    exam: "toefl",
    skill: "reading",
    label: "Read in Daily Life",
    labelJa: "日常文書の読解",
    description: "メール・掲示・SNS 投稿など日常的なテキストの読解",
  },
  {
    id: "academic-passage",
    exam: "toefl",
    skill: "reading",
    label: "Read an Academic Passage",
    labelJa: "アカデミック読解",
    description: "アカデミックな文章を読んで設問に答える",
  },

  // ---- TOEFL Listening（新形式。Notion からインポート済み） ----
  {
    id: "conversation",
    exam: "toefl",
    skill: "listening",
    label: "Listen to a Conversation",
    labelJa: "会話の聞き取り",
    description: "2 人の会話を聞いて 2〜3 問に回答",
  },
  {
    id: "announcement",
    exam: "toefl",
    skill: "listening",
    label: "Listen to an Announcement",
    labelJa: "アナウンスの聞き取り",
    description: "キャンパス内のアナウンスを聞いて設問に回答",
  },
  {
    id: "academic-talk",
    exam: "toefl",
    skill: "listening",
    label: "Listen to an Academic Talk",
    labelJa: "講義の聞き取り",
    description: "短い講義を聞いて 4 問に回答",
  },
  {
    id: "listen-and-choose",
    exam: "toefl",
    skill: "listening",
    label: "Listen and Choose a Response",
    labelJa: "応答選択",
    description: "短い発話に対する適切な応答を選ぶ",
    comingSoon: true,
  },

  // ---- TOEFL Speaking（新形式。Notion からインポート済み） ----
  {
    id: "listen-and-repeat",
    exam: "toefl",
    skill: "speaking",
    label: "Listen and Repeat",
    labelJa: "復唱タスク",
    description: "聞こえた短い文をそのまま復唱する（7 問）",
    badge: "AI添削",
  },
  {
    id: "take-an-interview",
    exam: "toefl",
    skill: "speaking",
    label: "Take an Interview",
    labelJa: "インタビュー形式",
    description: "テーマに沿った 4 つの質問に各 45 秒で回答",
    badge: "AI添削",
  },

  // ---- TOEFL Writing（新形式。Academic Discussion は既存 AI 添削へ接続） ----
  {
    id: "build-a-sentence",
    exam: "toefl",
    skill: "writing",
    label: "Build a Sentence",
    labelJa: "文の並べ替え",
    description: "語順が入れ替わった返信文を正しく並べ替える（10 問・約 7 分）",
  },
  {
    id: "write-an-email",
    exam: "toefl",
    skill: "writing",
    label: "Write an Email",
    labelJa: "メールライティング",
    description: "状況と 3 つの要件を含むメールを書く（7 分・80〜120 語）",
    badge: "AI添削",
  },
  {
    id: "academic-discussion",
    exam: "toefl",
    skill: "writing",
    label: "Academic Discussion",
    labelJa: "ディスカッション投稿",
    description: "教授の質問に対して意見を投稿する（10 分・100〜130 語）。AI 添削つき",
    badge: "AI添削",
  },

  // ---- TOEIC Reading（EG の practiceTrainings からインポート済み） ----
  {
    id: "part-5",
    exam: "toeic",
    skill: "reading",
    label: "Part 5",
    labelJa: "短文穴埋め",
    description: "1 文中の空所に最適な語句を選ぶ（文法・語彙）",
  },
  {
    id: "part-6",
    exam: "toeic",
    skill: "reading",
    label: "Part 6",
    labelJa: "長文穴埋め",
    description: "短い文書中の複数の空所を文脈に合わせて補う",
  },
  {
    id: "part-7-single",
    exam: "toeic",
    skill: "reading",
    label: "Part 7 — Single",
    labelJa: "1 文書の読解",
    description: "メール・広告・記事など 1 つの文書を読んで設問に回答",
  },
  {
    id: "part-7-double",
    exam: "toeic",
    skill: "reading",
    label: "Part 7 — Double",
    labelJa: "2 文書の読解",
    description: "関連する 2 つの文書を読み比べて設問に回答",
  },
  {
    id: "part-7-triple",
    exam: "toeic",
    skill: "reading",
    label: "Part 7 — Triple",
    labelJa: "3 文書の読解",
    description: "関連する 3 つの文書を読み比べて設問に回答",
  },
];

export function getPracticeTypes(exam: ExamId, skill: SkillId): PracticeTypeInfo[] {
  return PRACTICE_TYPES.filter((t) => t.exam === exam && t.skill === skill);
}

export function getPracticeType(
  exam: ExamId,
  skill: SkillId,
  typeId: string
): PracticeTypeInfo | undefined {
  return PRACTICE_TYPES.find((t) => t.exam === exam && t.skill === skill && t.id === typeId);
}
