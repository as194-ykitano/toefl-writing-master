import { Timestamp } from 'firebase/firestore';

// タスクデータの型定義
export interface Task {
  id: string;
  title: string;
  description: string;
  type: "integrated" | "independent";
  taskType?: "task1" | "task2" | "academic_discussion"; // IELTS用、TOEFL用
  difficulty: "easy" | "medium" | "hard" | "初級" | "中級" | "上級";
  category: string;
  readingPassageId?: string;
  listeningAudioURL?: string;
  listeningImageURL?: string;
  listeningPassageContent?: string;
  readingPassageJapanese?: string; // Readingの日本語訳
  listeningScriptJapanese?: string; // Listeningスクリプトの日本語訳
  timeLimit: number;
  status: "not_started" | "in_progress" | "completed";
  createdAt?: Date | Timestamp; // 作成日時
  
  // IELTS用の追加プロパティ
  content?: string; // 問題文
  instructions?: string; // 指示事項
  wordCount?: {
    min: number;
    target: number;
  };
  imageUrl?: string; // グラフや図の画像URL
  sampleAnswer?: string; // 解答例
  sampleAnswerJapanese?: string; // 解答例の日本語訳
  
  // TOEFL Academic Discussion用の追加プロパティ
  discussionContent?: {
    professor: string;        // 教授のコメント
    student1: string;         // 学生1のコメント
    student2: string;         // 学生2のコメント
    question: string;         // ディスカッションの質問
    professorName?: string;   // 教授の名前
    student1Name?: string;    // 学生1の名前
    student2Name?: string;    // 学生2の名前
  };
  
  // 演習回数
  practiceCount?: number;
}

// リーディングパッセージの型定義
export interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  wordCount: number;
  estimatedReadingTime: number;
}

// エッセイデータの型定義
export interface Essay {
  id: string;
  userId: string;
  taskId: string;
  content: string;
  submittedAt: Date | Timestamp;
  status: 'pending' | 'processing' | 'completed' | 'feedback_completed' | 'error';
  feedbackRead?: boolean; // フィードバック確認状況
  score?: number;
  feedback?: {
    overall: string;
    strengths: string[];
    improvements: string[];
    detailedScores: {
      integration?: number;
      organization: number;
      language?: number;
      development: number;
      topicDevelopment?: number;
      languageUse?: number;
    };
    topicDevelopment: {
      goodPoints: string[];
      improvements: string[];
    };
    generalDescription: {
      goodPoints: string[];
      improvements: string[];
    };
    specificSuggestions: {
      suggestions: string[];
    };
    grammarCorrections: {
      corrections: Array<{
        original: string;
        corrected: string;
        explanation: string;
        context: string;
        startIndex: number;
        endIndex: number;
      }>;
    };
    modelAnswer?: {
      stance: 'agree' | 'disagree';
      content: string;
    };
  };
  timeSpent?: number;
  wordCount?: number;
}

// エッセイフィードバックの型定義
export interface EssayFeedback {
  overall: string;
  strengths: string[];
  improvements: string[];
  detailedScores: {
    integration: number;
    organization: number;
    language: number;
    development: number;
  };
  topicDevelopment?: {
    goodPoints: string[];
    improvements: string[];
  };
  generalDescription?: {
    goodPoints: string[];
    improvements: string[];
  };
  specificSuggestions?: {
    suggestions: string[];
  };
  grammarCorrections?: {
    corrections: Array<{
      original: string;
      corrected: string;
      explanation: string;
      context: string;
      startIndex?: number;
      endIndex?: number;
    }>;
  };
}

export interface LearningGoals {
  targetScore: number;
  targetDate: string; // ISO string (yyyy-mm-dd)
  weeklyGoal: number;
  learningPlan?: string;
  focusAreas?: string[];
}

export interface Progress {
  currentScore: number;
  essaysCompleted: number;
  lastSubmission: string | null; // ISO string (yyyy-mm-dd) or null
}

export interface StudySession {
  date: string; // ISO string
  duration: number; // minutes
  focus: string;
}

export interface Reminder {
  enabled: boolean;
  time: string; // "HH:mm"
  days: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: string; // ISO string
  learningGoals?: LearningGoals;
  progress?: Progress;
  studySessions: StudySession[];
  totalStudyTime: number;
  reminder?: Reminder;
}

// 単語・フレーズの型定義
export interface VocabularyItem {
  id: string;
  userId: string;
  word: string;
  meaning?: string;
  context: string;
  source: 'essay' | 'reading' | 'listening' | 'manual';
  sourceId?: string; // エッセイIDやタスクIDなど
  createdAt: Date;
  lastReviewed?: Date;
  reviewCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

// トレーニング権限の型定義
export interface TrainingPermission {
  toefl: boolean;
  toeflAcademicDiscussion: boolean; // TOEFL Academic Discussion専用権限
  ielts: boolean;
  basic: boolean;
  youtuber: boolean;
}

// 管理者用ユーザー情報の型定義
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: string;
  lastLoginAt?: string;
  trainingPermissions: TrainingPermission;
  isActive: boolean;
  role: 'user' | 'admin';
} 

// Basicトレーニング用の型定義
export interface BasicTask {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  timeLimit: number; // 分単位
  status: "not_started" | "in_progress" | "completed";
  createdAt?: Date | Timestamp;
}

export interface BasicEssay {
  id: string;
  userId: string;
  taskId: string;
  content: string;
  submittedAt: Date | Timestamp;
  status: 'pending' | 'processing' | 'completed' | 'feedback_completed' | 'error';
  essayType?: 'basic';
  feedbackRead?: boolean;
  feedback?: {
    overall: string;
    strengths: string[];
    improvements: string[];
    grammarCorrections: {
      corrections: Array<{
        original: string;
        corrected: string;
        explanation: string;
        context: string;
        startIndex: number;
        endIndex: number;
      }>;
    };
    suggestions: string[];
  };
  timeSpent?: number; // 秒単位
  wordCount?: number;
}

// YouTube Learning用の型定義
export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  thumbnailUrl: string;
  videoUrl: string;
  transcript?: string; // 字幕内容
  transcriptLanguage?: string;
  category: string;
  tags?: string[];
  wordCount?: number;
  estimatedWatchingTime?: number; // 分単位
}

export interface YouTuberTask {
  id: string;
  title: string;
  description: string;
  videoId: string; // YouTube動画のID
  video?: YouTubeVideo; // 動画情報
  taskType: "summary" | "opinion"; // サマリー、意見
  difficulty: "easy" | "medium" | "hard";
  category: string;
  timeLimit: number; // 分単位（0は制限時間なし）
  status: "not_started" | "in_progress" | "completed";
  createdAt?: Date | Timestamp;
  instructions?: string; // 具体的な指示
  wordCount?: {
    min: number;
    target: number;
  };
}

export interface YouTuberEssay {
  id: string;
  userId: string;
  taskId: string;
  videoId: string;
  content: string;
  transcript?: string; // 字幕内容
  taskType?: 'summary' | 'opinion'; // タスクタイプ
  submittedAt: Date | Timestamp;
  status: 'pending' | 'processing' | 'completed' | 'feedback_completed' | 'error';
  essayType?: 'youtuber';
  feedbackRead?: boolean;
  feedback?: {
    summaryQuality?: {
      goodPoints: string[];
      improvements: string[];
      suggestions: string[];
    };
    opinionQuality?: {
      goodPoints: string[];
      improvements: string[];
      suggestions: string[];
    };
    grammarCorrections: {
      corrections: Array<{
        original: string;
        corrected: string;
        explanation: string;
        context: string;
        startIndex: number;
        endIndex: number;
      }>;
    };
    sampleAnswer?: string;
  };
  timeSpent?: number; // 秒単位
  wordCount?: number;
}

// TOEFL Academic Discussion用の型定義
export interface TOEFLAcademicDiscussionFeedback {
  overall: string;
  strengths: string[];
  improvements: string[];
  detailedScores: {
    topicDevelopment: number;    // トピック展開 (0-5点)
    languageUse: number;         // 言語使用 (0-5点)
    organization: number;        // 構成 (0-5点)
    development: number;         // 展開 (0-5点)
  };
  topicDevelopment: {
    goodPoints: string[];
    improvements: string[];
  };
  languageUse: {
    goodPoints: string[];
    improvements: string[];
  };
  organization: {
    goodPoints: string[];
    improvements: string[];
  };
  development: {
    goodPoints: string[];
    improvements: string[];
  };
  specificSuggestions: {
    suggestions: string[];
  };
  grammarCorrections: {
    corrections: Array<{
      original: string;
      corrected: string;
      explanation: string;
      context: string;
      startIndex: number;
      endIndex: number;
    }>;
  };
}

export interface TOEFLAcademicDiscussionEssay {
  id: string;
  userId: string;
  taskId: string;
  content: string;
  submittedAt: Date | Timestamp;
  status: 'pending' | 'processing' | 'completed' | 'feedback_completed' | 'error';
  feedbackRead?: boolean;
  score?: number; // 総合スコア (0-5点)
  feedback?: TOEFLAcademicDiscussionFeedback;
  timeSpent?: number; // 秒単位
  wordCount?: number;
} 