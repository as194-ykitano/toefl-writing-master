"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, ArrowLeft, CheckCircle, Edit3 } from "lucide-react";
import Link from "next/link";
import SubmissionComplete from "@/components/SubmissionComplete";
import { saveBasicEssay, updateBasicEssayFeedback, db } from "@/lib/firebase";
import { BasicEssay } from "@/lib/types";
import { doc, onSnapshot } from "firebase/firestore";


type Phase = "ready" | "writing" | "submission-complete";

export default function BasicTasksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("ready");
  const [essayText, setEssayText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEssayData, setSubmittedEssayData] = useState<{
    essayId: string;
    taskTitle?: string;
    wordCount: number;
    timeSpent: number;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // 経過時間（制限時間なし）
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // フィードバック完了通知
  useEffect(() => {
    if (phase === "submission-complete" && submittedEssayData?.essayId && user) {
      const essayRef = doc(db, "users", user.uid, "basicEssays", submittedEssayData.essayId);
      const unsubscribe = onSnapshot(essayRef, () => {});
      return () => unsubscribe();
    }
  }, [phase, submittedEssayData, user]);

  const startWriting = () => {
    setPhase("writing");
    setIsTimerRunning(true);
  };

  const handleSubmit = async () => {
    if (!user || !essayText.trim()) return;
    setIsSubmitting(true);
    try {
      const essayData: Omit<BasicEssay, "id"> = {
        userId: user.uid,
        taskId: "basic-default",
        content: essayText,
        submittedAt: new Date(),
        status: "pending",
        timeSpent,
        wordCount,
      };
      const essayId = await saveBasicEssay(essayData);
      setSubmittedEssayData({ essayId, taskTitle: "自由記述トレーニング", wordCount, timeSpent });
      setPhase("submission-complete");

      fetch("/api/analyze-basic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayText, prompt: "自由記述" }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to analyze essay");
          const feedback = await res.json();
          if (user) await updateBasicEssayFeedback(essayId, user.uid, feedback);
        })
        .catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // 提出完了
  if (phase === "submission-complete" && submittedEssayData) {
    return (
      <SubmissionComplete
        essayId={submittedEssayData.essayId}
        taskTitle={submittedEssayData.taskTitle}
        wordCount={submittedEssayData.wordCount}
        timeSpent={submittedEssayData.timeSpent}
        taskType="basic"
      />
    );
  }

  // ライティング画面
  if (phase === "writing") {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Edit3 className="h-6 w-6 mr-2 text-violet-600" />
                  自由記述トレーニング
                </h1>
                <p className="text-gray-600">自由に英作文を書いてください</p>
              </div>
              <div className="flex items-center space-x-4">
                 <div className="text-right">
                   <div className="text-sm text-gray-500">経過時間</div>
                   <div className="text-lg font-semibold text-gray-900">
                     {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, "0")}
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* ライティングエリア */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>英作文</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{wordCount} 語</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={essayText}
                onChange={(e) => {
                  setEssayText(e.target.value);
                  setWordCount(e.target.value.trim().split(/\s+/).filter(Boolean).length);
                }}
                className="w-full h-[500px] p-4 border border-gray-300 rounded-lg text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ここにエッセイを書いてください..."
              />
            </CardContent>
          </Card>

          {/* 提出ボタン */}
          <div className="mt-6 text-center">
            <Button
              onClick={handleSubmit}
              disabled={!essayText.trim() || isSubmitting}
              size="lg"
              className="bg-violet-600 hover:bg-violet-700 px-8 py-4 text-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  提出中...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  提出する
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 準備画面
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button variant="ghost" asChild className="mr-4">
              <Link href="/basic-dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                ダッシュボードに戻る
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Basicトレーニング</h1>
          <p className="text-gray-600">時間計測機能付きの自由記述トレーニング</p>
        </div>

        {/* 説明 */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Basicトレーニングについて</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-600">
                <p>
                  Basicトレーニングは、英語の基礎力を身につけるための時間計測機能付き自由記述トレーニングです。
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>自由に英作文を書きます（制限時間なし）</li>
                  <li>提出後、文法、語彙、文章構成などについて詳細なフィードバックが得られます</li>
                </ul>

              </div>
            </CardContent>
          </Card>
        </div>

        {/* 開始ボタン（説明の下） */}
        <div className="text-center mt-8">
          <Button onClick={startWriting} size="lg" className="bg-violet-600 hover:bg-violet-700 px-8 py-4 text-lg">
            <Target className="mr-2 h-6 w-6" />
            トレーニング開始
          </Button>
        </div>
      </div>
    </div>
  );
}
