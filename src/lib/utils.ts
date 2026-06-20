import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 管理者のメールアドレスリスト
export const ADMIN_EMAILS = [
  'admin@gmail.com',    // 管理者のメールアドレス
  'admin@example.com',  // 管理者のメールアドレスをここに追加
  'ykita@example.com'   // あなたのメールアドレスを追加
];

// 管理者かどうかをチェックする関数
export const isAdmin = (email: string | null): boolean => {
  return email ? ADMIN_EMAILS.includes(email) : false;
};

/**
 * 新規ユーザーのデフォルトトレーニング権限を取得
 */
export function getDefaultTrainingPermissions() {
  return {
    toefl: true,    // デフォルトでTOEFLは利用可能
    toeflAcademicDiscussion: true, // デフォルトでTOEFL Academic Discussionは利用可能
    ielts: true,    // デフォルトでIELTSは利用可能
    basic: false,   // Basicはデフォルトで無効
    youtuber: false // YouTuberはデフォルトで無効
  };
}

/**
 * ユーザーのトレーニング権限をチェック
 */
export function checkTrainingPermission(userPermissions: any, trainingType: 'toefl' | 'toeflAcademicDiscussion' | 'ielts' | 'basic' | 'youtuber'): boolean {
  if (!userPermissions) {
    return trainingType === 'toefl' || trainingType === 'toeflAcademicDiscussion' || trainingType === 'ielts'; // デフォルト値
  }
  return userPermissions[trainingType] === true;
}
