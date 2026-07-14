"use client";

// YouTube Writing の添削フィードバック表示（インライン結果 / 保存結果ページで共通利用）
// 良かった点・改善点・提案（例文を分離表示）＋ 共通のエラー修正ドリル ＋ 解答例。

import { Sparkles } from "lucide-react";
import GrammarCorrectionExercise from "@/components/prep/GrammarCorrectionExercise";
import { writingCorrectionsToItems } from "@/lib/prep/grammar";
import { YouTuberFeedback, YouTubeTaskType } from "@/lib/prep/youtube-store";

// 「本文（例：'...'）」形式のアイテムを、本文と例文に分離して読みやすく表示する
function splitExample(text: string): { main: string; example?: string } {
  const m = text.match(/^([\s\S]*?)（例[:：]\s*([\s\S]*?)）\s*$/);
  if (m) return { main: m[1].trim().replace(/[、,]\s*$/, ""), example: m[2].trim() };
  return { main: text.trim() };
}

const TONE_STYLE = {
  good: { head: "text-emerald-700", bar: "bg-emerald-400", card: "border-emerald-100 bg-emerald-50/40", ex: "border-emerald-300", label: "良かった点" },
  bad: { head: "text-orange-700", bar: "bg-orange-400", card: "border-orange-100 bg-orange-50/40", ex: "border-orange-300", label: "改善点" },
  tip: { head: "text-blue-700", bar: "bg-blue-400", card: "border-blue-100 bg-blue-50/40", ex: "border-blue-300", label: "提案" },
} as const;

function QualitySection({ items, tone }: { items: string[]; tone: keyof typeof TONE_STYLE }) {
  if (!items || items.length === 0) return null;
  const s = TONE_STYLE[tone];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`w-1 h-4 rounded-full ${s.bar}`} />
        <h4 className={`text-sm font-semibold ${s.head}`}>{s.label}</h4>
        <span className="text-[11px] text-gray-400">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => {
          const { main, example } = splitExample(it);
          return (
            <div key={i} className={`rounded-xl border p-3 ${s.card}`}>
              <p className="text-sm text-gray-800 leading-relaxed">{main}</p>
              {example && (
                <p className={`mt-1.5 pl-2.5 border-l-2 ${s.ex} text-xs text-gray-500 italic leading-relaxed`}>
                  例: {example}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function YouTubeFeedbackView({
  feedback,
  essay,
  taskType,
}: {
  feedback: YouTuberFeedback;
  essay: string;
  taskType: YouTubeTaskType;
}) {
  const quality = taskType === "summary" ? feedback.summaryQuality : feedback.opinionQuality;
  const items = writingCorrectionsToItems(feedback.grammarCorrections?.corrections ?? []);

  return (
    <div className="space-y-4">
      {quality && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <QualitySection items={quality.goodPoints} tone="good" />
          <QualitySection items={quality.improvements} tone="bad" />
          <QualitySection items={quality.suggestions} tone="tip" />
        </div>
      )}

      {items.length > 0 && (
        <GrammarCorrectionExercise
          items={items}
          sourceText={essay}
          heading="エラー修正ドリル — 自分で直してみましょう"
        />
      )}

      {feedback.sampleAnswer && (
        <div className="bg-white rounded-2xl border border-violet-100 p-6">
          <h3 className="text-base font-semibold text-violet-700 mb-2 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5" /> 解答例
          </h3>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {feedback.sampleAnswer}
          </p>
        </div>
      )}
    </div>
  );
}
