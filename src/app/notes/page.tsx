"use client";

// ノートページ
// Reading / Listening 演習中に「あとで見直す」でフラグした問題を一覧表示する

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Flag, FlagOff, Headphones, Pause, Play } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { Button } from "@/components/ui/button";
import MarkdownLite from "@/components/prep/MarkdownLite";
import {
  getListeningSets,
  getReadingSets,
  resolveManagedPracticeSetAssets,
} from "@/lib/prep/data-source";
import { loadSessions, unflagQuestion } from "@/lib/prep/session-store";
import { usePrepDataVersion } from "@/lib/prep/use-prep-data";
import { cleanReadingTitle } from "@/lib/prep/display-title";
import {
  EXAM_LABELS,
  ExamId,
  ListeningSet,
  PracticeQuestion,
  ReadingSet,
  SKILL_LABELS,
  SkillId,
} from "@/lib/prep/types";

interface NoteItem {
  key: string;
  sessionId: string;
  exam: ExamId;
  skill: SkillId;
  setId: string;
  setTitle: string;
  question: PracticeQuestion;
  userAnswer: string | string[] | null;
  correct: boolean;
  finishedAt: string;
  practiceSet: ReadingSet | ListeningSet;
}

function formatAnswer(answer: string | string[] | null): string {
  if (answer === null || answer === undefined || answer === "") return "（未回答）";
  return Array.isArray(answer) ? answer.join(" / ") : answer;
}

function formatPracticeDateTime(finishedAt: string): string {
  const date = new Date(finishedAt);
  if (Number.isNaN(date.getTime())) return "日時不明";

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ListeningAudio({ set }: { set: ListeningSet }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  if (set.audioUrl) {
    return (
      <audio
        className="w-full dark:[color-scheme:dark]"
        controls
        preload="metadata"
        src={set.audioUrl}
      />
    );
  }

  const togglePlayback = () => {
    if (!window.speechSynthesis) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(set.transcript);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  };

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="dark:border-violet-700 dark:bg-gray-900 dark:text-violet-100 dark:hover:bg-violet-950"
        onClick={togglePlayback}
      >
        {playing ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
        {playing ? "停止" : "音声を再生"}
      </Button>
      <p className="mt-1.5 text-[11px] text-gray-500 dark:text-violet-300">
        音源を取得できないため、スクリプトを読み上げます。
      </p>
    </div>
  );
}

function ReviewMaterial({ set }: { set: ReadingSet | ListeningSet }) {
  if (set.skill === "reading") {
    return (
      <div className="space-y-4 border-t border-gray-100 pt-5">
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-3 text-sm font-bold text-gray-900">本文：{set.passageTitle}</h2>
          <div className="space-y-3">
            {set.paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line text-sm leading-7 text-gray-700">
                {paragraph.label && <span className="mr-2 font-bold text-gray-500">{paragraph.label}</span>}
                {paragraph.text}
              </p>
            ))}
          </div>
        </section>
        {set.translationJa && (
          <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <h2 className="mb-3 text-sm font-bold text-blue-900">本文の日本語訳</h2>
            <p className="whitespace-pre-line text-sm leading-7 text-gray-700">{set.translationJa}</p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-gray-100 pt-5">
      <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-950/70">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-violet-950 dark:text-violet-100">
          <Headphones className="h-4 w-4 text-violet-600 dark:text-violet-300" /> Listening音源
        </h2>
        <ListeningAudio set={set} />
      </section>
      {set.imageUrl && (
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={set.imageUrl} alt="設問の図・資料" className="max-h-[420px] w-full rounded-lg object-contain" />
        </section>
      )}
      {set.referenceText && (
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-2 text-sm font-bold text-gray-900">参考資料</h2>
          <MarkdownLite text={set.referenceText} />
        </section>
      )}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-3 text-sm font-bold text-gray-900">スクリプト</h2>
        <p className="whitespace-pre-line text-sm leading-7 text-gray-700">{set.transcript}</p>
      </section>
      {set.transcriptJa && (
        <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <h2 className="mb-3 text-sm font-bold text-blue-900">スクリプトの日本語訳</h2>
          <p className="whitespace-pre-line text-sm leading-7 text-gray-700">{set.transcriptJa}</p>
        </section>
      )}
    </div>
  );
}

export default function NotesPage() {
  const [items, setItems] = useState<NoteItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const version = usePrepDataVersion();

  useEffect(() => {
    const load = async () => {
      const allSets = [
        ...(await getReadingSets("toefl")),
        ...(await getReadingSets("ielts")),
        ...(await getListeningSets("toefl")),
        ...(await getListeningSets("ielts")),
      ];
      const sessions = loadSessions();
      const setMap = new Map(allSets.map((set) => [`${set.exam}:${set.id}`, set]));
      const listeningSetsToResolve = new Map<string, ListeningSet>();

      sessions.forEach((session) => {
        if (session.skill !== "listening" || (session.flaggedQuestionIds?.length ?? 0) === 0) return;
        const key = `${session.exam}:${session.setId}`;
        const set = setMap.get(key);
        if (set?.skill === "listening") listeningSetsToResolve.set(key, set);
      });

      await Promise.all(
        Array.from(listeningSetsToResolve, async ([key, set]) => {
          const resolved = await resolveManagedPracticeSetAssets(set);
          if (resolved.skill === "listening") setMap.set(key, resolved);
        })
      );

      const collected: NoteItem[] = [];
      sessions.forEach((session) => {
        const flaggedIds = session.flaggedQuestionIds ?? [];
        if (flaggedIds.length === 0) return;
        const set = setMap.get(`${session.exam}:${session.setId}`);
        if (!set) return;
        flaggedIds.forEach((questionId) => {
          const question = set.questions.find((q) => q.id === questionId);
          if (!question) return;
          const result = session.results.find((r) => r.questionId === questionId);
          collected.push({
            key: `${session.id}:${questionId}`,
            sessionId: session.id,
            exam: session.exam,
            skill: session.skill,
            setId: session.setId,
            setTitle: session.skill === "reading" ? cleanReadingTitle(session.setTitle) : session.setTitle,
            question,
            userAnswer: result?.userAnswer ?? null,
            correct: result?.correct ?? false,
            finishedAt: session.finishedAt,
            practiceSet: set,
          });
        });
      });

      collected.sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1));

      setItems(collected);
      setSelectedKey(collected[0]?.key ?? null);
      setLoading(false);
    };
    load();
  }, [version]);

  const selected = useMemo(() => items.find((i) => i.key === selectedKey) ?? null, [items, selectedKey]);

  const handleUnflag = (item: NoteItem) => {
    unflagQuestion(item.sessionId, item.question.id);
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
          <h1 className="text-2xl font-bold text-gray-900">ノート — あとで見直す</h1>
          <p className="text-sm text-gray-500 mt-1">
            演習中に「あとで見直す」でフラグした問題をここから見返せます。
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <Flag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="font-semibold text-gray-900">フラグ付きの問題はありません</h2>
            <p className="text-sm text-gray-500 mt-1">
              演習中に設問右上の「あとで見直す」を押すと、ここに一覧表示されます。
            </p>
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
                      ? "border-orange-400 ring-1 ring-orange-400"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1.5">
                    <span className="font-medium text-gray-500">
                      {EXAM_LABELS[item.exam]} {SKILL_LABELS[item.skill]}
                    </span>
                    · Q{item.question.number}
                    {item.correct && (
                      <span className="ml-auto inline-flex items-center gap-0.5 text-emerald-500">
                        <CheckCircle2 className="w-3 h-3" /> 正解
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-800 line-clamp-2">{item.question.prompt}</div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-400 tabular-nums">
                    <Clock3 className="h-3 w-3" />
                    演習日時 {formatPracticeDateTime(item.finishedAt)}
                  </div>
                </button>
              ))}
            </div>

            {/* 右: 詳細 */}
            {selected && (
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                    <span>{selected.setTitle}</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock3 className="h-3 w-3" />
                      演習日時 {formatPracticeDateTime(selected.finishedAt)}
                    </span>
                </div>

                <ReviewMaterial set={selected.practiceSet} />

                <div>
                  <div className="mb-1.5 text-xs font-semibold text-gray-500">
                    Question {selected.question.number}
                  </div>
                  <p className="text-sm font-medium text-gray-900 leading-relaxed whitespace-pre-line">{selected.question.prompt}</p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                    <div className="text-[11px] font-semibold text-gray-500 mb-1">あなたの回答</div>
                    <div className="text-sm text-gray-800">{formatAnswer(selected.userAnswer)}</div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 正解
                    </div>
                    <div className="text-sm text-gray-800">{formatAnswer(selected.question.answer)}</div>
                  </div>
                </div>

                {selected.question.explanation && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1.5">解説</div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selected.question.explanation}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-200 text-orange-600 hover:bg-orange-50"
                    onClick={() => handleUnflag(selected)}
                  >
                    <FlagOff className="w-3.5 h-3.5 mr-1.5" /> フラグを解除（見直し完了）
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PrepShell>
  );
}
