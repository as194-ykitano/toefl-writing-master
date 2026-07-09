"use client";

// 結果レポート
// - 実演習セッション（localStorage）: 採点結果から推定スコア・弱点・次の学習を生成
// - サンプル ID (sample-toefl / sample-ielts): 模試レポートのモックを表示

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ListChecks,
  RotateCcw,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import ScoreGauge from "@/components/prep/ScoreGauge";
import { SAMPLE_REPORTS } from "@/lib/prep/mock-data";
import { getListeningSet, getReadingSet } from "@/lib/prep/data-source";
import {
  estimateIeltsBand,
  estimateToeflSectionScore,
  loadSession,
  toCefr,
} from "@/lib/prep/session-store";
import {
  EXAM_LABELS,
  MockReport,
  PracticeQuestion,
  PracticeSessionResult,
  SKILL_LABELS,
  SkillId,
} from "@/lib/prep/types";

const SKILL_TAG_LABELS: Record<string, string> = {
  detail: "詳細情報の読み取り",
  inference: "推論問題",
  vocabulary: "語彙問題",
  main_idea: "要旨の把握",
  scanning: "スキャニング",
  tfng: "True/False/Not Given",
  completion: "空所補充",
  form_completion: "フォーム穴埋め（数字・単語の聞き取り）",
};

function tagLabel(tag?: string): string {
  return tag ? SKILL_TAG_LABELS[tag] ?? tag : "その他";
}

// 実セッションからレポートを組み立てる
function buildReportFromSession(
  session: PracticeSessionResult,
  questions: PracticeQuestion[]
): MockReport {
  const ratio = session.totalCount > 0 ? session.correctCount / session.totalCount : 0;
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const wrongTags = new Map<string, number>();
  const correctTags = new Map<string, number>();
  session.results.forEach((r) => {
    const tag = tagLabel(questionMap.get(r.questionId)?.skillTag);
    const target = r.correct ? correctTags : wrongTags;
    target.set(tag, (target.get(tag) ?? 0) + 1);
  });

  const weaknesses = Array.from(wrongTags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => `${tag} で ${count} 問失点しています`);
  const strengths = Array.from(correctTags.entries())
    .filter(([tag]) => !wrongTags.has(tag))
    .slice(0, 3)
    .map(([tag, count]) => `${tag} は ${count} 問すべて正解です`);

  const isToefl = session.exam === "toefl";
  const overallScore = isToefl
    ? estimateToeflSectionScore(session.correctCount, session.totalCount)
    : estimateIeltsBand(session.correctCount, session.totalCount);

  const topWeakness = Array.from(wrongTags.entries()).sort((a, b) => b[1] - a[1])[0];
  const nextSteps = [
    ...(topWeakness
      ? [`${topWeakness[0]} の問題を集中的に復習しましょう`]
      : ["この調子で次の問題セットに進みましょう"]),
    "間違えた問題を復習ページで確認し、「なぜ間違えたか」を言語化しましょう",
    `${SKILL_LABELS[session.skill]} の別セットで定着を確認しましょう`,
  ];

  const tutorComment =
    session.totalCount === 0
      ? "Speaking の回答を受け付けました。AI フィードバック（発音・流暢さ・内容評価）は今後のアップデートで提供予定です。録音を自分で聞き直し、言い淀みや文法ミスをメモしておくと効果的です。"
      : ratio >= 0.8
        ? `正答率 ${Math.round(ratio * 100)}% と良好です。${topWeakness ? `残る課題は「${topWeakness[0]}」です。ここを潰せば安定して高得点が狙えます。` : "このレベルを維持しつつ、本番モードで時間管理の練習をしましょう。"}`
        : ratio >= 0.5
          ? `正答率 ${Math.round(ratio * 100)}% でした。${topWeakness ? `特に「${topWeakness[0]}」で失点が目立ちます。復習ページで解説とひっかけポイントを確認してから、同じタイプの問題に再挑戦しましょう。` : "復習ページで間違いの原因を確認しましょう。"}`
          : `正答率 ${Math.round(ratio * 100)}% でした。まずは練習モードでじっくり解き、設問タイプごとの解き方を身につけることをおすすめします。${topWeakness ? `最優先は「${topWeakness[0]}」の対策です。` : ""}`;

  return {
    id: session.id,
    exam: session.exam,
    title: session.setTitle,
    finishedAt: session.finishedAt,
    overallScore,
    overallMax: isToefl ? 30 : 9,
    cefr: toCefr(ratio),
    sections: [
      {
        skill: session.skill,
        score: overallScore,
        maxScore: isToefl ? 30 : 9,
      },
    ],
    correctCount: session.correctCount,
    totalCount: session.totalCount,
    durationMin: Math.max(1, Math.round(session.durationSec / 60)),
    strengths: strengths.length > 0 ? strengths : ["結果を蓄積すると強みが表示されます"],
    weaknesses: weaknesses.length > 0 ? weaknesses : ["大きな弱点は見つかりませんでした"],
    nextSteps,
    tutorComment,
  };
}

const SECTION_COLORS: Record<SkillId, string> = {
  reading: "bg-blue-500",
  listening: "bg-violet-500",
  speaking: "bg-orange-500",
  writing: "bg-emerald-500",
};

export default function ResultReportPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [session, setSession] = useState<PracticeSessionResult | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const sampleReport = SAMPLE_REPORTS.find((r) => r.id === sessionId) ?? null;

  useEffect(() => {
    if (sampleReport) {
      setLoading(false);
      return;
    }
    const s = loadSession(sessionId);
    setSession(s);
    const load = async () => {
      if (s && (s.skill === "reading" || s.skill === "listening")) {
        const set =
          s.skill === "reading"
            ? await getReadingSet(s.exam, s.setId)
            : await getListeningSet(s.exam, s.setId);
        setQuestions(set?.questions ?? []);
      }
      setLoading(false);
    };
    load();
  }, [sessionId, sampleReport]);

  const report: MockReport | null = useMemo(() => {
    if (sampleReport) return sampleReport;
    if (session) return buildReportFromSession(session, questions);
    return null;
  }, [sampleReport, session, questions]);

  if (loading) {
    return (
      <PrepShell>
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600" />
        </div>
      </PrepShell>
    );
  }

  if (!report) {
    return (
      <PrepShell>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
          結果が見つかりませんでした。
          <div className="mt-4">
            <Link href="/overview" className="text-blue-600 hover:underline">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </PrepShell>
    );
  }

  const isSpeakingSubmission = session !== null && session.totalCount === 0;
  const scoreLabel =
    report.exam === "ielts" ? report.overallScore.toFixed(1) : String(report.overallScore);

  return (
    <PrepShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-blue-600 uppercase">
              {EXAM_LABELS[report.exam]} — Result Report
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{report.title}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date(report.finishedAt).toLocaleString("ja-JP")} に完了
            </p>
          </div>
        </div>

        {/* スコアサマリー */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center justify-center">
            <div className="text-xs font-medium text-gray-400 mb-3">Overall Score（推定）</div>
            {isSpeakingSubmission ? (
              <div className="flex flex-col items-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                <div className="font-semibold text-gray-900">提出完了</div>
                <div className="text-xs text-gray-400 mt-1 text-center">
                  AI フィードバックは準備中です
                </div>
              </div>
            ) : (
              <>
                <ScoreGauge
                  value={report.overallScore}
                  max={report.overallMax}
                  label={scoreLabel}
                  subLabel={report.exam === "toefl" ? `/ ${report.overallMax}` : "Band"}
                  colorClass={report.exam === "toefl" ? "stroke-blue-600" : "stroke-violet-600"}
                />
                <div className="mt-2 text-xs font-medium text-gray-500 bg-gray-50 rounded-full px-3 py-1">
                  CEFR 目安: {report.cefr}
                </div>
                {report.exam === "toefl" && (
                  <p className="mt-3 text-[10px] text-gray-400 text-center leading-relaxed">
                    ※ 新形式 TOEFL は Band 1–6 表記です。現在は旧スケール換算の暫定スコアを表示しています。
                  </p>
                )}
              </>
            )}
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* セクション別スコア */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="text-xs font-medium text-gray-400 mb-4">セクション別スコア</div>
              <div className="space-y-3.5">
                {report.sections.map((section) => (
                  <div key={section.skill}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{SKILL_LABELS[section.skill]}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">
                        {report.exam === "ielts" ? section.score.toFixed(1) : section.score}
                        <span className="text-gray-300 font-normal"> / {section.maxScore}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${SECTION_COLORS[section.skill]}`}
                        style={{ width: `${(section.score / section.maxScore) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 正答数・所要時間 */}
            <div className="grid grid-rows-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <ListChecks className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">正答数</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">
                    {isSpeakingSubmission ? "—" : `${report.correctCount} / ${report.totalCount}`}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">所要時間</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{report.durationMin} 分</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 強み / 弱点 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
              <h2 className="font-semibold text-gray-900">強み</h2>
            </div>
            <ul className="space-y-2.5">
              {report.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-gray-900">弱点</h2>
            </div>
            <ul className="space-y-2.5">
              {report.weaknesses.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 次にやるべき学習 + AI Tutor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <h2 className="font-semibold text-gray-900">次にやるべき学習</h2>
            </div>
            <ol className="space-y-2.5">
              {report.nextSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-50 text-orange-600 text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-violet-50 rounded-2xl border border-blue-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-semibold text-gray-900">AI Tutor コメント</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{report.tutorComment}</p>
          </div>
        </div>

        {/* アクション */}
        <div className="flex flex-wrap gap-3 pt-2">
          {!isSpeakingSubmission && report.totalCount > report.correctCount && (
            <Link
              href="/review"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-3 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> 間違えた問題を復習する
            </Link>
          )}
          {session && (
            <Link
              href={`/practice/${session.exam}/${session.skill}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 transition-colors"
            >
              もう一度解く
            </Link>
          )}
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-5 py-3 transition-colors"
          >
            ダッシュボードへ <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PrepShell>
  );
}
