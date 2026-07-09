// 4技能対策 (TOEFL / IELTS / Advanced) 共通の型定義
// 問題データは後から実データに差し替える前提のため、
// UI はすべてこの型を経由して描画する

export type ExamId = "toefl" | "ielts";
export type CategoryId = ExamId | "advanced";
export type SkillId = "reading" | "listening" | "speaking" | "writing";
export type PracticeMode = "practice" | "test";

export const EXAM_LABELS: Record<ExamId, string> = {
  toefl: "TOEFL iBT",
  ielts: "IELTS Academic",
};

export const SKILL_LABELS: Record<SkillId, string> = {
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
};

// ---- 問題 ----

export type QuestionType =
  | "multiple_choice" // 4択（単一回答）
  | "multi_select" // 複数選択
  | "gap_fill" // 穴埋め（自由記述）
  | "matching" // 見出し・段落マッチング
  | "true_false_notgiven"; // IELTS TFNG

export interface PracticeQuestion {
  id: string;
  number: number;
  type: QuestionType;
  /** 設問文 */
  prompt: string;
  /** 対象の段落名など（例: "Paragraph B"） */
  reference?: string;
  /** 選択肢（multiple_choice / multi_select / matching で使用） */
  options?: string[];
  /** matching の場合の割り当て対象（例: 段落 A〜F） */
  matchTargets?: string[];
  /** 正解。multi_select / matching は配列 */
  answer: string | string[];
  /** 解説 */
  explanation: string;
  /** ひっかけポイント */
  trapNote?: string;
  /** 弱点分析に使う技能タグ（例: "detail", "inference", "main_idea"） */
  skillTag?: string;
}

// ---- 問題セット ----

interface PracticeSetBase {
  id: string;
  exam: ExamId;
  title: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  /** 制限時間（秒）。テストモードで使用 */
  timeLimitSec: number;
  /** 問題タイプ別演習のタイプ slug（question-types.ts のカタログと対応） */
  practiceType?: string;
  questions: PracticeQuestion[];
}

export interface ReadingSet extends PracticeSetBase {
  skill: "reading";
  passageTitle: string;
  /** 段落ごとの本文。ラベル付き（IELTS の Paragraph A〜 など） */
  paragraphs: { label?: string; text: string }[];
}

export interface ListeningSet extends PracticeSetBase {
  skill: "listening";
  /** 音声ファイル URL。モック段階では未設定で、スクリプト読み上げ表示にフォールバック */
  audioUrl?: string;
  /** 音声スクリプト（audioUrl 未設定時のモック再生・復習表示用） */
  transcript: string;
  /** 本番モードでの再生可能回数 */
  playLimitInTest: number;
  /** 設問と一緒に表示する参照資料（表・フォームなどのテキスト） */
  referenceText?: string;
  /** 地図・図面などの画像 URL（map/plan labelling 用。未アップロード時は undefined） */
  imageUrl?: string;
}

export interface SpeakingTask {
  id: string;
  number: number;
  /** タスク種別（例: "Independent", "Integrated", "Part 2"） */
  label: string;
  prompt: string;
  /** 準備で読む資料（Integrated 用） */
  material?: string;
  prepSec: number;
  speakSec: number;
}

export interface SpeakingSet {
  id: string;
  exam: ExamId;
  skill: "speaking";
  title: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  /** 問題タイプ別演習のタイプ slug */
  practiceType?: string;
  tasks: SpeakingTask[];
}

export type PracticeSet = ReadingSet | ListeningSet;

// ---- セッション（演習の記録） ----

export interface QuestionResult {
  questionId: string;
  userAnswer: string | string[] | null;
  correct: boolean;
}

export interface PracticeSessionResult {
  id: string;
  exam: ExamId;
  skill: SkillId;
  setId: string;
  setTitle: string;
  mode: PracticeMode;
  finishedAt: string; // ISO
  durationSec: number;
  correctCount: number;
  totalCount: number;
  results: QuestionResult[];
  /** 復習済みにした問題 ID */
  reviewedQuestionIds?: string[];
}

// ---- レポート（モック用の集約データ） ----

export interface SectionScore {
  skill: SkillId;
  score: number;
  maxScore: number;
  label?: string;
}

export interface MockReport {
  id: string;
  exam: ExamId;
  title: string;
  finishedAt: string;
  overallScore: number;
  overallMax: number;
  cefr: string;
  sections: SectionScore[];
  correctCount: number;
  totalCount: number;
  durationMin: number;
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
  tutorComment: string;
}

// ---- ダッシュボード / 学習プラン（モック） ----

export interface DashboardSnapshot {
  targetExam: ExamId;
  targetScoreLabel: string;
  currentScoreLabel: string;
  skillScores: {
    skill: SkillId;
    label: string;
    score: string;
    trend: "up" | "down" | "flat";
  }[];
  todayRecommendations: { title: string; href: string; reason: string }[];
  recentWeaknesses: string[];
  submissions: {
    category: CategoryId;
    categoryLabel: string;
    title: string;
    status: string;
    href: string;
  }[];
}

export interface StudyPlanDay {
  day: string;
  focus: string;
  tasks: { title: string; href?: string; minutes: number }[];
}

export interface StudyPlan {
  targetScoreLabel: string;
  currentScoreLabel: string;
  gapLabel: string;
  weakestSkill: SkillId;
  weeklyFocus: string[];
  todayTasks: { title: string; href?: string; minutes: number }[];
  week: StudyPlanDay[];
}
