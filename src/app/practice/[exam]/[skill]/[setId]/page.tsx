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
import { getListeningSet, getReadingSet, getSpeakingSet } from "@/lib/prep/data-source";
import { ExamId, ListeningSet, PracticeMode, ReadingSet, SpeakingSet } from "@/lib/prep/types";

function isExamId(value: string): value is ExamId {
  return value === "toefl" || value === "ielts";
}

function PracticePlayer() {
  const params = useParams<{ exam: string; skill: string; setId: string }>();
  const searchParams = useSearchParams();
  const mode: PracticeMode = searchParams.get("mode") === "test" ? "test" : "practice";

  const [readingSet, setReadingSet] = useState<ReadingSet | null>(null);
  const [listeningSet, setListeningSet] = useState<ListeningSet | null>(null);
  const [speakingSet, setSpeakingSet] = useState<SpeakingSet | null>(null);
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

  if (skill === "reading" && readingSet) return <ReadingPractice set={readingSet} mode={mode} />;
  if (skill === "listening" && listeningSet) return <ListeningPractice set={listeningSet} mode={mode} />;
  if (skill === "speaking" && speakingSet) return <SpeakingPractice set={speakingSet} mode={mode} />;

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
