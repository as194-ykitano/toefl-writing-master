"use client";

// 模試プレイヤー（オーケストレーター）
// /mock/{runId}
// run に定義されたセクション（Reading → Listening → Speaking）を順番に実施する。
// 各セクションは既存の練習コンポーネントを test モードで再利用し、
// onComplete で結果を受け取って次のセクションへ進める。
// 全セクション完了で結果を集計し、レポート画面へ遷移する。

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  Mic,
  TimerReset,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ReadingPractice from "@/components/prep/ReadingPractice";
import ListeningPractice from "@/components/prep/ListeningPractice";
import SpeakingPractice from "@/components/prep/SpeakingPractice";
import {
  getListeningSet,
  getReadingSet,
  getSpeakingSet,
} from "@/lib/prep/data-source";
import {
  EXAM_LABELS,
  ListeningSet,
  PracticeSessionResult,
  ReadingSet,
  SkillId,
  SpeakingSet,
} from "@/lib/prep/types";
import { computeMockReport, MockRun, MockSectionRef } from "@/lib/prep/mock-test";
import { loadMockRun, saveMockReport, saveMockRun } from "@/lib/prep/mock-store";

const SKILL_ICON: Record<SkillId, typeof BookOpen> = {
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
  writing: BookOpen,
};

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-eg" />
    </div>
  );
}

function MockPlayer() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const [run, setRun] = useState<MockRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // 現在セクション用に読み込んだ問題セット
  const [readingSet, setReadingSet] = useState<ReadingSet | null>(null);
  const [listeningSet, setListeningSet] = useState<ListeningSet | null>(null);
  const [speakingSet, setSpeakingSet] = useState<SpeakingSet | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);

  // 画面フェーズ: セクション導入 → 実施中 → 次への橋渡し
  const [phase, setPhase] = useState<"intro" | "active">("intro");

  // ---- run の読み込み ----
  useEffect(() => {
    const r = loadMockRun(params.runId);
    if (!r) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setRun(r);
    setLoading(false);
  }, [params.runId]);

  const currentSection: MockSectionRef | null =
    run && run.currentIndex < run.sections.length ? run.sections[run.currentIndex] : null;

  // ---- 現在セクションの問題セット読み込み ----
  useEffect(() => {
    if (!run || !currentSection) return;
    let cancelled = false;
    setSectionLoading(true);
    setReadingSet(null);
    setListeningSet(null);
    setSpeakingSet(null);
    const load = async () => {
      const { skill, setId } = currentSection;
      if (skill === "reading") {
        const s = await getReadingSet(run.exam, setId);
        if (!cancelled) setReadingSet(s);
      } else if (skill === "listening") {
        const s = await getListeningSet(run.exam, setId);
        if (!cancelled) setListeningSet(s);
      } else if (skill === "speaking") {
        const s = await getSpeakingSet(run.exam, setId);
        if (!cancelled) setSpeakingSet(s);
      }
      if (!cancelled) setSectionLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [run, currentSection]);

  // ---- セクション完了 → 次へ / レポートへ ----
  const handleSectionComplete = useCallback(
    (result: PracticeSessionResult) => {
      if (!run) return;
      const results = [...run.results];
      results[run.currentIndex] = result;
      const nextIndex = run.currentIndex + 1;
      const updated: MockRun = { ...run, results, currentIndex: nextIndex };
      saveMockRun(updated);

      if (nextIndex >= run.sections.length) {
        // 全セクション完了 → レポート集計
        const report = computeMockReport(updated);
        saveMockReport(report);
        router.push(`/mock/report/${run.id}`);
        return;
      }
      setRun(updated);
      setPhase("intro");
      window.scrollTo({ top: 0 });
    },
    [run, router]
  );

  if (loading) return <Spinner />;

  if (notFound || !run) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 gap-4 text-gray-500">
        <p>模試が見つかりませんでした。</p>
        <Link href="/mock" className="text-eg-deep hover:underline text-sm">
          模試メニューに戻る
        </Link>
      </div>
    );
  }

  // ---- セクション導入画面 ----
  if (phase === "intro" && currentSection) {
    const Icon = SKILL_ICON[currentSection.skill];
    const totalSections = run.sections.length;
    const stepNo = run.currentIndex + 1;
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-eg-deep uppercase">
              {EXAM_LABELS[run.exam]} — {run.title}
            </span>
            <span className="text-xs font-medium text-gray-400 tabular-nums">
              セクション {stepNo} / {totalSections}
            </span>
          </div>

          {/* 進捗ドット */}
          <div className="mt-4 flex gap-1.5">
            {run.sections.map((s, i) => (
              <div
                key={s.setId + i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < run.currentIndex
                    ? "bg-emerald-400"
                    : i === run.currentIndex
                      ? "bg-eg"
                      : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-eg-faint flex items-center justify-center">
              <Icon className="w-7 h-7 text-eg-dark" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{currentSection.label}</div>
              <div className="text-sm text-gray-500">{currentSection.setTitle}</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600 leading-relaxed">
            本番と同じ試験モードで実施します。制限時間内に解答してください。途中で中断すると
            この模試は最初からやり直しになります。準備ができたら開始してください。
          </div>

          <button
            onClick={() => setPhase("active")}
            disabled={sectionLoading}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-5 py-3.5 transition-colors disabled:opacity-50"
          >
            {sectionLoading ? (
              <>
                <TimerReset className="w-4 h-4 animate-spin" /> 読み込み中...
              </>
            ) : (
              <>
                {currentSection.label} を開始 <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <Link
            href="/mock"
            className="mt-3 block text-center text-xs text-gray-400 hover:text-gray-600"
          >
            中断して模試メニューへ
          </Link>
        </div>
      </div>
    );
  }

  // ---- セクション実施中 ----
  if (phase === "active" && currentSection) {
    if (sectionLoading) return <Spinner />;
    if (currentSection.skill === "reading" && readingSet) {
      return <ReadingPractice set={readingSet} mode="test" onComplete={handleSectionComplete} />;
    }
    if (currentSection.skill === "listening" && listeningSet) {
      return (
        <ListeningPractice set={listeningSet} mode="test" onComplete={handleSectionComplete} />
      );
    }
    if (currentSection.skill === "speaking" && speakingSet) {
      return <SpeakingPractice set={speakingSet} mode="test" onComplete={handleSectionComplete} />;
    }
    // セット読み込み失敗時はスキップして次へ
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4 text-gray-500 px-4">
        <p>このセクションの問題を読み込めませんでした。</p>
        <button
          onClick={() =>
            handleSectionComplete({
              id: `skip-${currentSection.setId}`,
              exam: run.exam,
              skill: currentSection.skill,
              setId: currentSection.setId,
              setTitle: currentSection.setTitle,
              mode: "test",
              finishedAt: new Date().toISOString(),
              durationSec: 0,
              correctCount: 0,
              totalCount: 0,
              results: [],
            })
          }
          className="inline-flex items-center gap-2 rounded-xl bg-eg hover:bg-eg-dark text-black text-sm font-semibold px-5 py-3"
        >
          次のセクションへ <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ここに来るのは全完了直後の遷移待ち
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4 text-gray-600">
      <CheckCircle2 className="w-12 h-12 text-emerald-500" />
      <div className="font-semibold">結果を集計しています…</div>
    </div>
  );
}

export default function MockPlayerPage() {
  return (
    <ProtectedRoute>
      <MockPlayer />
    </ProtectedRoute>
  );
}
