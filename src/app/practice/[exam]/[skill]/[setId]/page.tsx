"use client";

// 演習プレイヤー
// /practice/{exam}/{skill}/{setId}?mode={practice|test}

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ReadingPractice from "@/components/prep/ReadingPractice";
import ListeningPractice from "@/components/prep/ListeningPractice";
import SpeakingPractice from "@/components/prep/SpeakingPractice";
import EssayWritingPractice from "@/components/prep/EssayWritingPractice";
import AcademicDiscussionPractice from "@/components/prep/AcademicDiscussionPractice";
import BuildSentencePractice from "@/components/prep/BuildSentencePractice";
import {
  getListeningSet,
  getReadingSet,
  getSpeakingSet,
  getWritingSet,
} from "@/lib/prep/data-source";
import {
  ExamId,
  ListeningSet,
  PracticeMode,
  ReadingSet,
  SpeakingSet,
  WritingPracticeSet,
} from "@/lib/prep/types";

function isExamId(value: string): value is ExamId {
  return value === "toefl" || value === "ielts" || value === "toeic";
}

function PracticePlayer() {
  const params = useParams<{ exam: string; skill: string; setId: string }>();
  const searchParams = useSearchParams();
  const mode: PracticeMode = searchParams.get("mode") === "test" ? "test" : "practice";
  // 本番モードのみ: ?limit=<分> で演習時間を上書きできる（未指定なら各セット既定の時間）
  const limitParam = searchParams.get("limit");
  const customLimitSec =
    mode === "test" && limitParam && Number.isFinite(Number(limitParam)) && Number(limitParam) > 0
      ? Math.round(Number(limitParam) * 60)
      : null;

  const [readingSet, setReadingSet] = useState<ReadingSet | null>(null);
  const [listeningSet, setListeningSet] = useState<ListeningSet | null>(null);
  const [speakingSet, setSpeakingSet] = useState<SpeakingSet | null>(null);
  const [writingSet, setWritingSet] = useState<WritingPracticeSet | null>(null);
  const [loading, setLoading] = useState(true);

  const { exam, skill, setId } = params;

  useEffect(() => {
    if (!isExamId(exam)) {
      setLoading(false);
      return;
    }
    const load = async () => {
      if (skill === "reading") setReadingSet(await getReadingSet(exam, setId));
      else if (skill === "listening") setListeningSet(await getListeningSet(exam, setId));
      else if (skill === "speaking") setSpeakingSet(await getSpeakingSet(exam, setId));
      else if (skill === "writing") setWritingSet(await getWritingSet(exam, setId));
      setLoading(false);
    };
    load();
  }, [exam, skill, setId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (skill === "reading" && readingSet) {
    const set = customLimitSec ? { ...readingSet, timeLimitSec: customLimitSec } : readingSet;
    return <ReadingPractice set={set} mode={mode} />;
  }
  if (skill === "listening" && listeningSet) {
    const set = customLimitSec ? { ...listeningSet, timeLimitSec: customLimitSec } : listeningSet;
    return <ListeningPractice set={set} mode={mode} />;
  }
  if (skill === "speaking" && speakingSet) return <SpeakingPractice set={speakingSet} mode={mode} />;
  if (skill === "writing" && writingSet) {
    const set = customLimitSec ? { ...writingSet, timeLimitSec: customLimitSec } : writingSet;
    if (set.practiceType === "build-a-sentence") {
      return <BuildSentencePractice set={set} mode={mode} />;
    }
    // Academic Discussion は本番 ETS 風レイアウト（Cut/Paste/Undo/Redo・Stance つき）
    if (set.practiceType === "academic-discussion") {
      return <AcademicDiscussionPractice set={set} mode={mode} />;
    }
    // Write an Email / IELTS Task 1・2 は深い添削フロー（EssayWritingPractice）へ
    return <EssayWritingPractice set={set} mode={mode} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-500 gap-4">
      <p>問題セットが見つかりませんでした。</p>
      <Link href="/home" className="text-blue-600 hover:underline text-sm">
        ホームに戻る
      </Link>
    </div>
  );
}

export default function PracticePlayerPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600" />
          </div>
        }
      >
        <PracticePlayer />
      </Suspense>
    </ProtectedRoute>
  );
}
