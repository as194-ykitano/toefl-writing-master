"use client";

// 選択中の試験種別（TOEFL / IELTS / …）を保持するコンテキスト。
// 画面左上の切替スイッチと Home の技能カードがこの値を参照する。
// 将来 Advanced などを追加しやすいよう、対象は配列駆動で定義する。
//
// 値は localStorage に永続化し、リロードしても選択が維持される。

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CategoryId } from "@/lib/prep/types";

/**
 * 切替対象（左上ドロップダウンに並ぶ候補）。
 * comingSoon は選択不可（TOEIC など今後追加予定の枠）。
 * ここに 1 行足すだけで UI に反映される拡張しやすい設計。
 */
export interface ExamOption {
  /** 選択可能なものは CategoryId。準備中の枠は任意 slug でよい */
  id: CategoryId | string;
  label: string;
  /** 補足（例: "Academic" / "自由記述"） */
  sublabel?: string;
  /** 選択時の遷移先 */
  href: string;
  comingSoon?: boolean;
}

export const EXAM_OPTIONS: ExamOption[] = [
  { id: "toefl", label: "TOEFL iBT", sublabel: "4技能・新形式対応", href: "/home" },
  { id: "ielts", label: "IELTS Academic", sublabel: "4技能・Band 推定", href: "/home" },
  { id: "toeic", label: "TOEIC", sublabel: "Reading（Part 5-7）", href: "/home" },
  { id: "advanced", label: "Advanced", sublabel: "YouTube・自由記述", href: "/advanced" },
];

/** 選択可能な CategoryId かどうか */
function isCategoryId(value: string): value is CategoryId {
  return (
    value === "toefl" || value === "ielts" || value === "toeic" || value === "advanced"
  );
}

const STORAGE_KEY = "prep_selected_exam_v1";
const DEFAULT_EXAM: CategoryId = "toefl";

interface ExamContextValue {
  /** 現在選択中の試験種別 */
  exam: CategoryId;
  setExam: (exam: CategoryId) => void;
  options: ExamOption[];
}

const ExamContext = createContext<ExamContextValue | null>(null);

function isValidExam(value: string | null): value is CategoryId {
  return !!value && isCategoryId(value);
}

export function ExamProvider({ children }: { children: ReactNode }) {
  const [exam, setExamState] = useState<CategoryId>(DEFAULT_EXAM);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isValidExam(stored)) setExamState(stored);
    } catch {
      // localStorage が使えない環境ではデフォルトのまま
    }
  }, []);

  const setExam = (next: CategoryId) => {
    setExamState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 保存できなくても動作には影響しない
    }
  };

  return (
    <ExamContext.Provider value={{ exam, setExam, options: EXAM_OPTIONS }}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam(): ExamContextValue {
  const ctx = useContext(ExamContext);
  if (!ctx) {
    // Provider 外で呼ばれた場合もクラッシュさせず、デフォルト値で動かす
    return { exam: DEFAULT_EXAM, setExam: () => {}, options: EXAM_OPTIONS };
  }
  return ctx;
}
