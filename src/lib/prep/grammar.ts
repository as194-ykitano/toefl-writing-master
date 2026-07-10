// 各フィードバックデータ → 文法修正エクササイズ用 GrammarCorrectionItem への変換。
// Speaking / Writing で同じエクササイズ UI（GrammarCorrectionExercise）を使うための橋渡し。

import { GrammarCorrectionItem, WritingGrammarCorrection } from "./types";

/** Writing 添削の grammarCorrections をエクササイズ項目へ変換 */
export function writingCorrectionsToItems(
  corrections: WritingGrammarCorrection[]
): GrammarCorrectionItem[] {
  return corrections
    .filter((c) => c.original && c.corrected && c.original !== c.corrected)
    .map((c) => ({
      mistake: c.original,
      correction: c.corrected,
      explanation: c.explanation,
      // context が空なら誤り語句自体を文脈として使う
      context: c.context?.trim() || c.original,
      category: undefined,
    }));
}
