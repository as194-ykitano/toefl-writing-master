"use client";

// 結果レポート
// - 実演習セッション（localStorage）: 採点結果から推定スコア・弱点・次の学習を生成
//   さらに「解答結果」として全問の 自分の答え / 正解 / 解説 を一覧表示（EG admin 風）
// - Speaking セッション: タスクごとの AI フィードバック（文字起こし・Band 推定・改善例）
//   と Band 別模範解答を表示
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
  Mic,
  RotateCcw,
  Sparkles,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import ScoreGauge from "@/components/prep/ScoreGauge";
import { SAMPLE_REPORTS } from "@/lib/prep/mock-data";
import { getListeningSet, getReadingSet, getSpeakingSet } from "@/lib/prep/data-source";
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
  SpeakingSet,
  SpeakingTaskFeedback,
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
    "下の「解答結果」で間違えた問題の解説を確認し、「なぜ間違えたか」を言語化しましょう",
    `${SKILL_LABELS[session.skill]} の別セットで定着を確認しましょう`,
  ];

  const tutorComment =
    session.totalCount === 0
      ? "Speaking の回答を受け付けました。下のタスク別フィードバックで、文字起こし・Band 推定・改善例と模範解答を確認しましょう。"
      : ratio >= 0.8
        ? `正答率 ${Math.round(ratio * 100)}% と良好です。${topWeakness ? `残る課題は「${topWeakness[0]}」です。ここを潰せば安定して高得点が狙えます。` : "このレベルを維持しつつ、本番モードで時間管理の練習をしましょう。"}`
        : ratio >= 0.5
          ? `正答率 ${Math.round(ratio * 100)}% でした。${topWeakness ? `特に「${topWeakness[0]}」で失点が目立ちます。下の解答結果で解説を確認してから、同じタイプの問題に再挑戦しましょう。` : "下の解答結果で間違いの原因を確認しましょう。"}`
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

function answerText(value: string | string[] | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—（未回答）";
  return Array.isArray(value) ? value.join(", ") : value;
}

// ---- 解答結果（全問一覧・EG admin 風） ----

function QuestionReviewCard({
  question,
  userAnswer,
  correct,
  index,
}: {
  question: PracticeQuestion;
  userAnswer: string | string[] | null;
  correct: boolean;
  index: number;
}) {
  const options = question.options ?? question.matchTargets ?? [];
  const showOptions =
    options.length > 0 &&
    (question.type === "multiple_choice" ||
      question.type === "multi_select" ||
      question.type === "true_false_notgiven" ||
      question.type === "matching");
  const correctSet = new Set(
    (Array.isArray(question.answer) ? question.answer : [question.answer]).map((a) =>
      a.trim().toLowerCase()
    )
  );
  const userSet = new Set(
    (Array.isArray(userAnswer) ? userAnswer : userAnswer ? [userAnswer] : []).map((a) =>
      a.trim().toLowerCase()
    )
  );

  return (
    <div
      className={`rounded-xl border p-5 ${
        correct ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"
      }`}
    >
      <div className="flex items-start gap-3">
        {correct ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-gray-900">Q{index + 1}</span>
            {question.reference && (
              <span className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                {question.reference}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {question.prompt}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-lg border border-gray-200/70 px-3 py-2">
              <div className="text-[11px] font-medium text-gray-400">あなたの答え</div>
              <div className={`font-medium ${correct ? "text-emerald-700" : "text-red-600"}`}>
                {answerText(userAnswer)}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200/70 px-3 py-2">
              <div className="text-[11px] font-medium text-gray-400">正解</div>
              <div className="font-medium text-gray-900">{answerText(question.answer)}</div>
            </div>
          </div>

          {showOptions && (
            <div className="mt-3 space-y-1.5">
              {options.map((option) => {
                const key = option.trim().toLowerCase();
                const isCorrectOption = correctSet.has(key);
                const isSelected = userSet.has(key);
                return (
                  <div
                    key={option}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                      isCorrectOption
                        ? "border-emerald-300 bg-emerald-50"
                        : isSelected
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="text-gray-800 leading-relaxed flex-1">{option}</span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      {isCorrectOption && (
                        <span className="text-[10px] font-semibold text-emerald-600">Correct</span>
                      )}
                      {isSelected && <span className="text-[10px] text-gray-400">You</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {question.explanation && (
            <div className="mt-3 bg-white rounded-lg border border-gray-200/70 px-4 py-3">
              <div className="text-[11px] font-semibold text-eg-deep mb-1">解説</div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {question.explanation}
              </p>
              {question.trapNote && (
                <p className="mt-2 text-xs text-orange-600 leading-relaxed">
                  ⚠ ひっかけ: {question.trapNote}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Speaking フィードバック ----

function SpeakingFeedbackCard({
  feedback,
  set,
  index,
}: {
  feedback: SpeakingTaskFeedback;
  set: SpeakingSet | null;
  index: number;
}) {
  const task = set?.tasks.find((t) => t.id === feedback.taskId);
  const [openSample, setOpenSample] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-900">Task {index + 1}</span>
        {task?.label && (
          <span className="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
            {task.label}
          </span>
        )}
        {feedback.bandEstimate !== undefined && (
          <span className="ml-auto text-xs font-bold text-eg-deep bg-eg-soft rounded-full px-3 py-1">
            推定 Band {feedback.bandEstimate.toFixed(1)}
          </span>
        )}
      </div>

      {task && (
        <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{task.prompt}</p>
      )}

      {feedback.error ? (
        <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          解析エラー: {feedback.error}
        </div>
      ) : (
        <>
          {feedback.transcript && (
            <div className="mt-3 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
              <div className="text-[11px] font-semibold text-gray-400 mb-1">
                あなたの回答（文字起こし）
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{feedback.transcript}</p>
            </div>
          )}

          {feedback.summary && (
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">{feedback.summary}</p>
          )}

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {feedback.strengths.length > 0 && (
              <div className="bg-emerald-50/60 rounded-lg border border-emerald-100 px-4 py-3">
                <div className="text-[11px] font-semibold text-emerald-700 mb-1.5">良かった点</div>
                <ul className="space-y-1">
                  {feedback.strengths.map((s) => (
                    <li key={s} className="text-xs text-gray-700 leading-relaxed flex gap-1.5">
                      <span className="text-emerald-500">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {feedback.improvements.length > 0 && (
              <div className="bg-eg-faint rounded-lg border border-eg-soft px-4 py-3">
                <div className="text-[11px] font-semibold text-eg-deep mb-1.5">改善ポイント</div>
                <ul className="space-y-1">
                  {feedback.improvements.map((s) => (
                    <li key={s} className="text-xs text-gray-700 leading-relaxed flex gap-1.5">
                      <span className="text-eg-dark">→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {feedback.improvedVersion && (
            <div className="mt-3 bg-violet-50/60 rounded-lg border border-violet-100 px-4 py-3">
              <div className="text-[11px] font-semibold text-violet-700 mb-1">
                ワンランク上の言い直し例
              </div>
              <p className="text-sm text-gray-800 leading-relaxed italic">{feedback.improvedVersion}</p>
            </div>
          )}
        </>
      )}

      {task?.sampleAnswers && task.sampleAnswers.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-gray-400 mb-1.5">Band 別模範解答</div>
          <div className="flex flex-wrap gap-2">
            {task.sampleAnswers.map((sample) => (
              <button
                key={sample.label}
                onClick={() => setOpenSample(openSample === sample.label ? null : sample.label)}
                className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
                  openSample === sample.label
                    ? "bg-eg text-black border-eg"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>
          {openSample && (
            <div className="mt-2 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                {task.sampleAnswers.find((s) => s.label === openSample)?.text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultReportPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [session, setSession] = useState<PracticeSessionResult | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [speakingSet, setSpeakingSet] = useState<SpeakingSet | null>(null);
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
      } else if (s && s.skill === "speaking") {
        setSpeakingSet(await getSpeakingSet(s.exam, s.setId));
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-eg" />
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
            <Link href="/overview" className="text-eg-deep hover:underline">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </PrepShell>
    );
  }

  const isSpeakingSubmission = session !== null && session.skill === "speaking";
  const speakingFeedback = session?.speakingFeedback ?? [];
  const speakingBands = speakingFeedback
    .map((f) => f.bandEstimate)
    .filter((b): b is number => typeof b === "number");
  const speakingAvgBand =
    speakingBands.length > 0
      ? Math.round((speakingBands.reduce((a, b) => a + b, 0) / speakingBands.length) * 2) / 2
      : null;
  const speakingMax = report.exam === "ielts" ? 9 : 6;

  const scoreLabel =
    report.exam === "ielts" ? report.overallScore.toFixed(1) : String(report.overallScore);

  // 解答結果一覧（reading / listening のみ）
  const reviewItems =
    session && questions.length > 0
      ? session.results
          .map((r) => ({
            result: r,
            question: questions.find((q) => q.id === r.questionId),
          }))
          .filter((item): item is { result: (typeof session.results)[number]; question: PracticeQuestion } =>
            Boolean(item.question)
          )
      : [];

  return (
    <PrepShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-eg-deep uppercase">
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
              speakingAvgBand !== null ? (
                <>
                  <ScoreGauge
                    value={speakingAvgBand}
                    max={speakingMax}
                    label={speakingAvgBand.toFixed(1)}
                    subLabel="Band（AI 推定）"
                    colorClass="stroke-eg"
                  />
                  <div className="mt-2 text-xs font-medium text-gray-500 bg-gray-50 rounded-full px-3 py-1">
                    {speakingBands.length} タスクの平均
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                  <div className="font-semibold text-gray-900">提出完了</div>
                  <div className="text-xs text-gray-400 mt-1 text-center">
                    録音がないため Band 推定はありません
                  </div>
                </div>
              )
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
                        {isSpeakingSubmission && speakingAvgBand !== null
                          ? speakingAvgBand.toFixed(1)
                          : report.exam === "ielts"
                            ? section.score.toFixed(1)
                            : section.score}
                        <span className="text-gray-300 font-normal">
                          {" "}
                          / {isSpeakingSubmission ? speakingMax : section.maxScore}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${SECTION_COLORS[section.skill]}`}
                        style={{
                          width: `${
                            isSpeakingSubmission
                              ? ((speakingAvgBand ?? 0) / speakingMax) * 100
                              : (section.score / section.maxScore) * 100
                          }%`,
                        }}
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
                  <div className="text-xs text-gray-400">
                    {isSpeakingSubmission ? "回答タスク数" : "正答数"}
                  </div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">
                    {isSpeakingSubmission
                      ? `${speakingFeedback.length} / ${session?.results.length ?? 0}`
                      : `${report.correctCount} / ${report.totalCount}`}
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

        {/* 強み / 弱点（採点セッションのみ） */}
        {!isSpeakingSubmission && (
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
        )}

        {/* 次にやるべき学習 + AI Tutor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-eg-dark" />
              <h2 className="font-semibold text-gray-900">次にやるべき学習</h2>
            </div>
            <ol className="space-y-2.5">
              {report.nextSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-eg-soft text-eg-deep text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="bg-gradient-to-br from-eg-faint to-orange-50 rounded-2xl border border-eg-soft p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-eg flex items-center justify-center">
                <Bot className="w-4 h-4 text-black" />
              </div>
              <h2 className="font-semibold text-gray-900">AI Tutor コメント</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{report.tutorComment}</p>
          </div>
        </div>

        {/* Speaking: タスク別 AI フィードバック */}
        {isSpeakingSubmission && speakingFeedback.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mt-8 mb-4">
              <Mic className="w-4 h-4 text-eg-dark" />
              <h2 className="text-lg font-bold text-gray-900">タスク別 AI フィードバック</h2>
            </div>
            <div className="space-y-4">
              {speakingFeedback.map((feedback, i) => (
                <SpeakingFeedbackCard
                  key={feedback.taskId}
                  feedback={feedback}
                  set={speakingSet}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {/* 解答結果（全問一覧） */}
        {reviewItems.length > 0 && (
          <section>
            <div className="flex items-center justify-between mt-8 mb-4">
              <h2 className="text-lg font-bold text-gray-900">解答結果</h2>
              <span className="text-xs text-gray-400">
                {report.correctCount} / {report.totalCount} 問正解
              </span>
            </div>
            <div className="space-y-3">
              {reviewItems.map((item, i) => (
                <QuestionReviewCard
                  key={item.result.questionId}
                  question={item.question}
                  userAnswer={item.result.userAnswer}
                  correct={item.result.correct}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}

        {/* アクション */}
        <div className="flex flex-wrap gap-3 pt-2">
          {!isSpeakingSubmission && report.totalCount > report.correctCount && (
            <Link
              href="/review"
              className="inline-flex items-center gap-2 rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-5 py-3 transition-colors"
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
