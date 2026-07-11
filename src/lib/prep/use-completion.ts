"use client";

// 問題タイプごとの「解答済みセット数」を集計するフック。
// localStorage の演習セッション（session-store）と Writing 添削結果（writing-store）から
// 完了済みの setId を集め、問題セット定義の practiceType と突き合わせて
// practiceType slug → 解答済みセット数（distinct）を返す。
//
// 分母（合計セット数）は getSkillStats().typeCounts と揃うため、
// Home の各カードで「{完了}/{合計} 解答済み」として表示できる。

import { useEffect, useState } from "react";
import { loadSessions } from "./session-store";
import { loadWritingResults } from "./writing-store";
import {
  getListeningSets,
  getReadingSets,
  getSpeakingSets,
  getWritingSets,
} from "./data-source";
import { ExamId, SkillId } from "./types";

/** 指定した試験・技能について practiceType slug → 解答済みセット数 を返す */
export function useCompletedCounts(exam: ExamId, skill: SkillId): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 完了済みの setId 集合（この試験・技能に該当するもの）
      const completedIds = new Set(
        loadSessions()
          .filter((s) => s.exam === exam && s.skill === skill)
          .map((s) => s.setId)
      );
      if (skill === "writing") {
        for (const w of loadWritingResults()) {
          if (w.exam === exam) completedIds.add(w.setId);
        }
      }

      // setId → practiceType を問題セット定義（権威ソース）から解決
      const sets =
        skill === "reading"
          ? await getReadingSets(exam)
          : skill === "listening"
            ? await getListeningSets(exam)
            : skill === "speaking"
              ? await getSpeakingSets(exam)
              : await getWritingSets(exam);

      const byType: Record<string, number> = {};
      for (const set of sets) {
        if (set.practiceType && completedIds.has(set.id)) {
          byType[set.practiceType] = (byType[set.practiceType] ?? 0) + 1;
        }
      }

      if (!cancelled) setCounts(byType);
    })();

    return () => {
      cancelled = true;
    };
  }, [exam, skill]);

  return counts;
}
