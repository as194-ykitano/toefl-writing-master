"use client";

// 復習 / 間違えた問題ページ
// localStorage の演習履歴から誤答を集約し、解説・ひっかけポイント・
// 次回の解き方を AI Tutor パネルつきで表示する

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  RotateCcw,
  X,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { Button } from "@/components/ui/button";
import { getListeningSets, getReadingSets } from "@/lib/prep/data-source";
import { loadSessions, markQuestionReviewed } from "@/lib/prep/session-store";
import { cleanReadingTitle } from "@/lib/prep/display-title";
import {
  EXAM_LABELS,
  ExamId,
  PracticeQuestion,
  SKILL_LABELS,
  SkillId,
} from "@/lib/prep/types";

interface ReviewItem {
  key: string;
  sessionId: string | null; // null = サンプル
  exam: ExamId;
  skill: SkillId;
  setId: string;
  setTitle: string;
  question: PracticeQuestion;
  userAnswer: string | string[] | null;
  finishedAt: string;
}

function formatAnswer(answer: string | string[] | null): string {
  if (answer === null || answer === undefined || answer === "") return "（未回答）";
  return Array.isArray(answer) ? answer.join(" / ") : answer;
}

const TAG_ADVICE: Record<string, string> = {
  detail: "設問のキーワードを本文・音声中の言い換え表現と照合する練習をしましょう。正解の根拠は必ず本文中にあります。",
  inference: "推論問題は「本文に書かれていることから一歩だけ進める」のが原則です。飛躍した選択肢を消去しましょう。",
  vocabulary: "前後の文脈から意味を推測してから選択肢を見る習慣をつけると、知らない単語でも対応できます。",
  main_idea: "各段落の第 1 文（トピックセンテンス）をつないで全体の流れを把握してから選択肢を検討しましょう。",
  scanning: "設問の固有名詞・数字を手がかりに、本文を上から順ではなく目的の情報だけ探す練習が有効です。",
  tfng: "TFNG は「本文と矛盾する＝FALSE」「本文に情報がない＝NOT GIVEN」の区別が核心です。常識で補完しないこと。",
  completion: "空所の前後の文法（品詞・数）から入る語の形を予測してから本文を探すと精度が上がります。",
  form_completion: "数字・日付・固有名詞は言い直しや訂正（実は〜）が頻出です。最後まで聞いてから確定しましょう。",
};

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // 全セットの問題を引けるように index を作る
      const allSets = [
        ...(await getReadingSets("toefl")),
        ...(await getReadingSets("ielts")),
        ...(await getListeningSets("toefl")),
        ...(await getListeningSets("ielts")),
      ];
      const setMap = new Map(allSets.map((s) => [s.id, s]));

      const sessions = loadSessions();
      const collected: ReviewItem[] = [];
      sessions.forEach((session) => {
        if (session.totalCount === 0) return; // Speaking 提出は対象外
        const set = setMap.get(session.setId);
        if (!set) return;
        const reviewed = new Set(session.reviewedQuestionIds ?? []);
        session.results.forEach((r) => {
          if (r.correct || reviewed.has(r.questionId)) return;
          const question = set.questions.find((q) => q.id === r.questionId);
          if (!question) return;
          collected.push({
            key: `${session.id}:${r.questionId}`,
            sessionId: session.id,
            exam: session.exam,
            skill: session.skill,
            setId: session.setId,
            setTitle: session.skill === "reading" ? cleanReadingTitle(session.setTitle) : session.setTitle,
            question,
            userAnswer: r.userAnswer,
            finishedAt: session.finishedAt,
          });
        });
      });

      // 履歴がない場合はサンプルを表示（画面の動きを確認できるように）
      if (collected.length === 0) {
        const sampleSet = setMap.get("ielts-reading-01");
        const sampleQuestion = sampleSet?.questions.find((q) => q.id === "ir1-q5");
        if (sampleSet && sampleQuestion) {
          collected.push({
            key: "sample:ir1-q5",
            sessionId: null,
            exam: "ielts",
            skill: "reading",
            setId: sampleSet.id,
            setTitle: `${sampleSet.title}（サンプル）`,
            question: sampleQuestion,
            userAnswer: "TRUE",
            finishedAt: new Date().toISOString(),
          });
        }
      }

      setItems(collected);
      setSelectedKey(collected[0]?.key ?? null);
      setLoading(false);
    };
    load();
  }, []);

  const selected = useMemo(() => items.find((i) => i.key === selectedKey) ?? null, [items, selectedKey]);

  const handleMarkReviewed = (item: ReviewItem) => {
    if (item.sessionId) {
      markQuestionReviewed(item.sessionId, item.question.id);
    }
    setItems((prev) => {
      const next = prev.filter((i) => i.key !== item.key);
      setSelectedKey(next[0]?.key ?? null);
      return next;
    });
  };

  return (
    <PrepShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">復習 — 間違えた問題</h1>
          <p className="text-sm text-gray-500 mt-1">
            間違いの原因を確認して「復習済み」にしていきましょう。24 時間以内の復習が最も効果的です。
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="font-semibold text-gray-900">未復習の問題はありません</h2>
            <p className="text-sm text-gray-500 mt-1">新しい演習に挑戦しましょう。</p>
            <div className="mt-5 flex justify-center">
              <Link
                href="/home"
                className="inline-flex items-center gap-1.5 rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-5 py-2.5 transition-colors"
              >
                演習へ <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 左: 問題一覧 */}
            <div className="space-y-2.5 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-1">
              {items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSelectedKey(item.key)}
                  className={`w-full text-left bg-white rounded-xl border p-4 transition-colors ${
                    item.key === selectedKey
                      ? "border-blue-400 ring-1 ring-blue-400"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1.5">
                    <span className="font-medium text-gray-500">
                      {EXAM_LABELS[item.exam]} {SKILL_LABELS[item.skill]}
                    </span>
                    · Q{item.question.number}
                  </div>
                  <div className="text-sm text-gray-800 line-clamp-2">{item.question.prompt}</div>
                </button>
              ))}
            </div>

            {/* 中央: 詳細 */}
            {selected && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div>
                  <div className="text-[11px] text-gray-400 mb-1">{selected.setTitle}</div>
                  <p className="text-sm font-medium text-gray-900 leading-relaxed whitespace-pre-line">{selected.question.prompt}</p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 mb-1">
                      <X className="w-3.5 h-3.5" /> あなたの回答
                    </div>
                    <div className="text-sm text-gray-800">{formatAnswer(selected.userAnswer)}</div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 正解
                    </div>
                    <div className="text-sm text-gray-800">{formatAnswer(selected.question.answer)}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1.5">解説</div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selected.question.explanation}</p>
                </div>

                {selected.question.trapNote && (
                  <div className="rounded-xl bg-orange-50 border border-orange-100 p-3.5">
                    <div className="text-[11px] font-semibold text-orange-600 mb-1">ひっかけポイント</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{selected.question.trapNote}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <Link href={`/practice/${selected.exam}/${selected.skill}/${selected.setId}?mode=practice`}>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> もう一度解く
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleMarkReviewed(selected)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> 復習済みにする
                  </Button>
                </div>
              </div>
            )}

            {/* 右: AI Tutor パネル */}
            {selected && (
              <div className="bg-gradient-to-b from-blue-50 to-violet-50 rounded-2xl border border-blue-100 p-6 h-fit lg:sticky lg:top-20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                    <Bot className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">AI Tutor</div>
                    <div className="text-[10px] text-gray-400">解説と学習アドバイス</div>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                  <div>
                    <div className="text-xs font-semibold text-blue-700 mb-1">なぜ間違えたか</div>
                    <p>
                      {selected.userAnswer === null || selected.userAnswer === ""
                        ? "未回答のまま提出されています。時間配分を見直し、わからない問題も必ず回答してから提出しましょう。"
                        : selected.question.trapNote ??
                          "選択肢の言い換え表現と本文の対応関係を取り違えた可能性があります。正解の根拠となる文をもう一度確認しましょう。"}
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-700 mb-1">次回の解き方</div>
                    <p>
                      {TAG_ADVICE[selected.question.skillTag ?? ""] ??
                        "設問文を先に読み、何を探すべきか明確にしてから本文に戻ると正答率が上がります。"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-3.5 text-xs text-gray-500 leading-relaxed">
                    このタイプ（{selected.question.skillTag ? selected.question.skillTag : "一般"}
                    ）の問題をもう 2〜3 問解いて、解き方を定着させることをおすすめします。
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PrepShell>
  );
}
