"use client";

// 模試メニュー
// /mock?exam=toefl&variant=mini（クエリは初期選択のプリセット）
// 受験する試験・種別を選び、問題プールからセクションを組んで模試を開始する。
// 過去の模試レポートも一覧表示する。

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  History,
  Loader2,
  Sparkles,
  Timer,
} from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  getListeningSets,
  getReadingSets,
  getSpeakingSets,
} from "@/lib/prep/data-source";
import { EXAM_LABELS, ExamId, MockReport } from "@/lib/prep/types";
import {
  MockRun,
  MockVariant,
  mockTitle,
  newMockRunId,
  pickMockSections,
} from "@/lib/prep/mock-test";
import { loadMockReports, saveMockRun } from "@/lib/prep/mock-store";
import { useFeatureAvailability } from "@/lib/prep/use-feature-availability";

function isExamId(v: string | null): v is ExamId {
  return v === "toefl" || v === "ielts";
}

function MockHub() {
  const availability = useFeatureAvailability();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exam, setExam] = useState<ExamId>(
    isExamId(searchParams.get("exam")) ? (searchParams.get("exam") as ExamId) : "toefl"
  );
  const [variant, setVariant] = useState<MockVariant>(
    searchParams.get("variant") === "full" ? "full" : "mini"
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<MockReport[]>([]);

  useEffect(() => {
    setReports(loadMockReports());
  }, []);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const [reading, listening, speaking] = await Promise.all([
        getReadingSets(exam),
        getListeningSets(exam),
        getSpeakingSets(exam),
      ]);
      const sections = pickMockSections(exam, variant, { reading, listening, speaking });
      if (sections.length === 0) {
        setError("この試験の模試を組める問題がまだありません。");
        setStarting(false);
        return;
      }
      const run: MockRun = {
        id: newMockRunId(),
        exam,
        variant,
        title: mockTitle(exam, variant),
        sections,
        currentIndex: 0,
        results: sections.map(() => null),
        startedAt: new Date().toISOString(),
      };
      saveMockRun(run);
      router.push(`/mock/${run.id}`);
    } catch {
      setError("模試の準備中にエラーが発生しました。時間をおいて再度お試しください。");
      setStarting(false);
    }
  };

  const variantInfo = useMemo(
    () =>
      variant === "mini"
        ? { sections: "各技能 1 セクション", time: "約 30〜40 分" }
        : { sections: "Reading / Listening を各 2 セクション", time: "約 60〜75 分" },
    [variant]
  );

  if (availability.courses.mock) {
    return <PrepShell><div className="mx-auto max-w-3xl px-4 py-20 text-center"><div className="rounded-2xl border bg-white px-6 py-16 dark:border-gray-800 dark:bg-gray-900"><Timer className="mx-auto h-10 w-10 text-gray-400"/><h1 className="mt-5 text-2xl font-bold">Mock Test</h1><p className="mt-2 text-gray-500">現在準備中です。公開までしばらくお待ちください。</p><span className="mt-5 inline-block rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Coming Soon</span></div></div></PrepShell>;
  }

  return (
    <PrepShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">Mock Test</h1>
            <span className="text-[10px] font-semibold text-eg-deep bg-eg-soft rounded px-1.5 py-0.5">
              実力診断
            </span>
          </div>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
            本番形式で Reading・Listening・Speaking を通しで受験し、セクション別スコアと総合スコアの
            推定、弱点分析レポートを受け取れます。（Writing は AI 添削つきの個別演習でトレーニングできます）
          </p>
        </div>

        {/* ---- 設定パネル ---- */}
        <div className="glass-card rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both [animation-delay:80ms]">
          <div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">試験を選ぶ</div>
            <div className="grid grid-cols-2 gap-3">
              {(["toefl", "ielts"] as ExamId[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setExam(e)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    exam === e
                      ? "border-eg bg-eg-faint"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{EXAM_LABELS[e]}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {e === "toefl" ? "Band 1–6 / 各技能 30 点換算" : "Band 1.0–9.0"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">種別を選ぶ</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setVariant("mini")}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${
                  variant === "mini"
                    ? "border-eg bg-eg-faint dark:bg-eg/10"
                    : "border-gray-200 hover:border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-violet-600" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Mini Mock</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">各技能 1 セクションで素早く診断</div>
              </button>
              <button
                onClick={() => setVariant("full")}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${
                  variant === "full"
                    ? "border-eg bg-eg-faint dark:bg-eg/10"
                    : "border-gray-200 hover:border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900/60 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Full Mock</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">通し受験でより安定した推定</div>
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-eg-faint to-orange-50 border border-eg-soft px-4 py-3 flex items-start gap-2 dark:from-eg/10 dark:to-orange-500/5 dark:border-eg/20">
            <Sparkles className="w-4 h-4 text-eg-dark dark:text-eg mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              構成: {variantInfo.sections}（Reading / Listening / Speaking）／目安時間: {variantInfo.time}。
              スコアは練習用の参考推定です（正式な Band 判定は本番受験でのみ確定します）。
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={start}
            disabled={starting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-5 py-3.5 transition-colors disabled:opacity-50"
          >
            {starting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> 模試を準備中...
              </>
            ) : (
              <>
                {mockTitle(exam, variant)} を開始 <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* ---- 過去のレポート ---- */}
        {reports.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both [animation-delay:160ms]">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-gray-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">これまでの模試</h2>
            </div>
            <div className="space-y-2">
              {reports.map((r, i) => (
                <Link
                  key={r.id}
                  href={`/mock/report/${r.id}`}
                  style={{ animationDelay: `${200 + i * 50}ms` }}
                  className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm hover:-translate-y-0.5 px-4 py-3 transition-all dark:bg-gray-900/60 dark:border-gray-800 dark:hover:border-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.title}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(r.finishedAt).toLocaleString("ja-JP")}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-eg-deep dark:text-eg tabular-nums">
                      {r.exam === "ielts" ? r.overallScore.toFixed(1) : r.overallScore}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">
                      {r.exam === "ielts" ? "Band" : `/ ${r.overallMax}`}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </PrepShell>
  );
}

export default function MockHubPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-eg" />
          </div>
        }
      >
        <MockHub />
      </Suspense>
    </ProtectedRoute>
  );
}
