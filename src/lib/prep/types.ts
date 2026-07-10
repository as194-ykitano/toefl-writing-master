// 4技能対策 (TOEFL / IELTS / Advanced) 共通の型定義
// 問題データは後から実データに差し替える前提のため、
// UI はすべてこの型を経由して描画する

export type ExamId = "toefl" | "ielts" | "toeic";
export type CategoryId = ExamId | "advanced";
export type SkillId = "reading" | "listening" | "speaking" | "writing";
export type PracticeMode = "practice" | "test";

export const EXAM_LABELS: Record<ExamId, string> = {
  toefl: "TOEFL iBT",
  ielts: "IELTS Academic",
  toeic: "TOEIC",
};

/** その試験で対応している技能。TOEIC は Reading + Listening（Listening は現状 Coming Soon）。 */
export const EXAM_SKILLS: Record<ExamId, SkillId[]> = {
  toefl: ["reading", "listening", "speaking", "writing"],
  ielts: ["reading", "listening", "speaking", "writing"],
  toeic: ["reading", "listening"],
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
  /** 本文の日本語訳（結果画面で表示） */
  translationJa?: string;
}

export interface ListeningSet extends PracticeSetBase {
  skill: "listening";
  /** 音声ファイル URL。モック段階では未設定で、スクリプト読み上げ表示にフォールバック */
  audioUrl?: string;
  /** 音声スクリプト（audioUrl 未設定時のモック再生・復習表示用） */
  transcript: string;
  /** 本番モードでの再生可能回数 */
  playLimitInTest: number;
  /** 設問と一緒に表示する参照資料（表・フォームなどの markdown テキスト） */
  referenceText?: string;
  /** スクリプトの日本語訳（結果画面で表示） */
  transcriptJa?: string;
  /** 地図・図面などの画像 URL（map/plan labelling 用。未アップロード時は undefined） */
  imageUrl?: string;
}

export interface SpeakingTask {
  id: string;
  number: number;
  /** タスク種別（例: "Independent", "Integrated", "Part 2"） */
  label: string;
  prompt: string;
  /** 準備で読む資料（Integrated 用）や試験インストラクション */
  material?: string;
  prepSec: number;
  speakSec: number;
  /** Band 別などの模範解答（結果画面で表示） */
  sampleAnswers?: { label: string; text: string }[];
  /** タスクの質問音声（TOEFL Take an Interview / Listen and Repeat 用） */
  audioUrl?: string;
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

// ---- Writing 演習セット（TOEFL 新形式） ----

/** Write an Email: 状況説明を読んでメールを書く（AI 添削つき） */
export interface EmailWritingSet {
  id: string;
  exam: ExamId;
  skill: "writing";
  practiceType: "write-an-email";
  title: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimitSec: number;
  /** 状況説明・要件（改行区切り。箇条書きは「・」付き） */
  promptText: string;
  to?: string;
  subject?: string;
  sampleAnswer?: string;
  promptJa?: string;
}

export interface BuildSentenceItem {
  id: string;
  number: number;
  /** 会話の前置き（相手の発言） */
  context: string;
  /** 空所つきのテンプレート（The ______ ______ .） */
  template: string;
  /** 並べ替え対象の語句（ダミーを含む場合あり） */
  words: string[];
  /** 完成した正しい文 */
  answer: string;
}

/** Build a Sentence: 語句を並べ替えて文を作る */
export interface BuildSentenceSet {
  id: string;
  exam: ExamId;
  skill: "writing";
  practiceType: "build-a-sentence";
  title: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimitSec: number;
  items: BuildSentenceItem[];
}

// ---- エッセイ型 Writing 演習セット（IELTS Task 1/2, TOEFL Academic Discussion） ----
//
// 旧 Writing Masters 版（openai.ts の analyzeIELTSEssay / analyzeTOEFLAcademicDiscussion）
// の深い添削を、新 Writing UI・新データ構造に合わせて扱うための型。

/** 添削ルーブリックの種別（採点項目・スコア上限の切り替えに使う） */
export type WritingRubricKind =
  | "ielts-task1"
  | "ielts-task2"
  | "toefl-academic-discussion"
  | "toefl-email";

/** TOEFL Academic Discussion の議論内容 */
export interface DiscussionContent {
  professor: string;
  student1: string;
  student2: string;
  question: string;
  professorName?: string;
  student1Name?: string;
  student2Name?: string;
}

/**
 * IELTS Task 1 / Task 2 / TOEFL Academic Discussion 共通のエッセイ型演習セット。
 * 旧 Writing Masters 版と同等の深さで AI 添削し、結果ページで見返す。
 */
export interface EssayWritingSet {
  id: string;
  exam: ExamId;
  skill: "writing";
  practiceType: "task-1" | "task-2" | "academic-discussion";
  /** 採点ルーブリックの種別 */
  rubric: WritingRubricKind;
  title: string;
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  timeLimitSec: number;
  /** 問題文（プロンプト本文。改行区切り、箇条書きは「・」付き） */
  promptText: string;
  promptJa?: string;
  /** IELTS Task 1 の図表画像 URL（任意） */
  imageUrl?: string;
  /** TOEFL Academic Discussion の議論内容 */
  discussion?: DiscussionContent;
  /** 語数の目安 */
  minWords?: number;
  targetWords?: number;
  sampleAnswer?: string;
  /** 解答例の日本語訳（練習モードで参照） */
  sampleAnswerJa?: string;
}

export type WritingPracticeSet = EmailWritingSet | BuildSentenceSet | EssayWritingSet;

// ---- 文法修正エクササイズ（Speaking / Writing 共通） ----
//
// 「最初から答えを見せる」のではなく、学習者に一度考えさせて
// タイピングで直させるための1問分のデータ。
// WritingGrammarCorrection / SpeakingTaskFeedback の双方からこの型へ変換して使う。

export interface GrammarCorrectionItem {
  /** 誤りの語句（学習者が直す対象。文中でハイライトされる） */
  mistake: string;
  /** 正しい語句 */
  correction: string;
  /** 解説 */
  explanation: string;
  /** 誤りを含む文全体（前後の文脈表示に使う） */
  context: string;
  /** 誤り種別ラベル（例: "冠詞" / "動詞の時制"）。任意 */
  category?: string;
}

// ---- Writing 添削フィードバック（旧 Writing Masters 版を新仕様へ移植） ----

export interface WritingGrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
  /** 誤りを含む文全体 */
  context: string;
  /** 本文中の開始・終了インデックス（インラインハイライト用） */
  startIndex: number;
  endIndex: number;
  /** 誤り種別ラベル（例: "冠詞" / "動詞の時制"）。エクササイズの色分けに使用 */
  category?: string;
}

/** 観点別スコア（ラベル付き） */
export interface WritingScoreItem {
  label: string;
  score: number;
  /** スコア上限（IELTS=9 / TOEFL=5） */
  max: number;
}

export interface WritingSpecificSuggestion {
  title?: string;
  description?: string;
  implementation?: string;
  example?: string;
  reasoning?: string;
}

/** 統合された Writing 添削結果 */
export interface WritingFeedback {
  overall: string;
  strengths: string[];
  improvements: string[];
  /** 観点別スコア */
  scoreItems: WritingScoreItem[];
  /** 総合スコア（表示用） */
  score: number;
  scoreMax: number;
  /** 総合スコアのラベル（例: "推定 Band" / "推定スコア"） */
  scoreLabel: string;
  topicDevelopment?: { goodPoints: string[]; improvements: string[] };
  generalDescription?: { goodPoints: string[]; improvements: string[] };
  specificSuggestions?: Array<string | WritingSpecificSuggestion>;
  grammarCorrections: WritingGrammarCorrection[];
  /** Write an Email など: 要件ごとの達成状況 */
  requirementsCheck?: string[];
  /** 1 ランク上に改善した英語の全文（改善版） */
  improvedVersion?: string;
  /** 解答例 */
  sampleAnswer?: string;
  /** 添削エラー時のメッセージ */
  error?: string;
}

/** localStorage に保存する添削結果レコード（後から見返す用） */
export interface WritingResult {
  id: string;
  exam: ExamId;
  setId: string;
  practiceType: string;
  rubric: WritingRubricKind;
  title: string;
  /** 提出した本文 */
  content: string;
  wordCount: number;
  durationSec: number;
  finishedAt: string; // ISO
  feedback: WritingFeedback;
}

// ---- セッション（演習の記録） ----

export interface QuestionResult {
  questionId: string;
  userAnswer: string | string[] | null;
  correct: boolean;
}

/** Speaking 1 タスク分の AI フィードバック */
export interface SpeakingTaskFeedback {
  taskId: string;
  /** Whisper による文字起こし */
  transcript: string;
  /** 推定 Band（0.5 刻み） */
  bandEstimate?: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  /** 改善例（言い直し例） */
  improvedVersion?: string;
  /** 文法修正エクササイズ用の1問ずつの修正項目（発話の文字起こしに対する添削） */
  grammarCorrections?: GrammarCorrectionItem[];
  /** 文字起こしの語ごとの「直前ポーズ長（秒）」。フィラー着色・長いポーズ位置の可視化に使う */
  speechWords?: { w: string; gap: number }[];
  /** Listen and Repeat: お手本の文 */
  expectedText?: string;
  /** Listen and Repeat: 語単位の一致率 (0〜1) */
  matchRatio?: number;
  /** Listen and Repeat: ETS 準拠の項目スコア (0〜5) */
  itemScore?: number;
  /** 流暢性の計測値（Whisper のタイムスタンプから算出） */
  fluency?: {
    /** 回答の総時間（秒） */
    durationSec: number;
    /** 発話速度（総時間ベース words per minute） */
    wpm: number;
    /** 調音速度（発話中の時間ベース WPM） */
    articulationWpm: number;
    /** 無音割合 (0〜1)。0.3 秒以上の語間ギャップの合計 ÷ 総時間 */
    pauseRatio: number;
    /** 1 秒以上のポーズの回数 */
    longPauses: number;
    /** フィラーワード（um, uh, you know など）の回数 */
    fillerCount?: number;
  };
  /** 解析に失敗した場合のエラーメッセージ */
  error?: string;
}

export interface PracticeSessionResult {
  id: string;
  exam: ExamId;
  skill: SkillId;
  setId: string;
  setTitle: string;
  /** 問題タイプ slug（ダッシュボードの問題タイプ別集計に使用）。旧セッションには無い */
  practiceType?: string;
  mode: PracticeMode;
  finishedAt: string; // ISO
  durationSec: number;
  correctCount: number;
  totalCount: number;
  results: QuestionResult[];
  /** 復習済みにした問題 ID */
  reviewedQuestionIds?: string[];
  /** Speaking セッションの AI フィードバック（タスクごと） */
  speakingFeedback?: SpeakingTaskFeedback[];
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
