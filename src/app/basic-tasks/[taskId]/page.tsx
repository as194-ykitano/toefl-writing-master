"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, ArrowLeft, FileText, CheckCircle, Edit3, Bell } from "lucide-react";
import { BasicTask, BasicEssay } from "@/lib/types";
import { saveBasicEssay, updateBasicEssayFeedback } from "@/lib/firebase";
import Link from "next/link";
import Timer from "@/components/timer";
import TextAreaWithControls from "@/components/textarea-with-controls";
import SubmissionComplete from "@/components/SubmissionComplete";
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNotification } from '@/contexts/NotificationContext';

// サンプルのBasicタスク（自由記述用）
const sampleTasks: BasicTask[] = [
  {
    id: "basic-1",
    title: "自由記述トレーニング",
    description: "自由記述トレーニング",
    difficulty: "easy",
    category: "Free Writing",
    timeLimit: 0, // 制限時間なし
    status: "not_started",
    createdAt: new Date()
  },
  {
    id: "basic-2",
    title: "自由記述トレーニング",
    description: "自由記述トレーニング",
    difficulty: "medium",
    category: "Free Writing",
    timeLimit: 0, // 制限時間なし
    status: "not_started",
    createdAt: new Date()
  },
  {
    id: "basic-3",
    title: "自由記述トレーニング",
    description: "自由記述トレーニング",
    difficulty: "hard",
    category: "Free Writing",
    timeLimit: 0, // 制限時間なし
    status: "not_started",
    createdAt: new Date()
  }
];

type Phase = "ready" | "writing" | "completed" | "submission-complete";

export default function BasicTaskPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params?.taskId as string;
  const { showFeedbackNotification } = useNotification();
  
  const [task, setTask] = useState<BasicTask | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [essayText, setEssayText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [submittedEssay, setSubmittedEssay] = useState<BasicEssay | null>(null);
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
    if (!task) {
      // デフォルトタスクを設定（制限時間なしの自由記述）
      const defaultTask: BasicTask = {
        id: "basic-default",
        title: "自由記述トレーニング",
        description: "自由記述トレーニング",
        difficulty: "medium",
        category: "Free Writing",
        timeLimit: 0,
        status: "not_started",
        createdAt: new Date()
      };
      setTask(defaultTask);
    }
  }, [user, loading, task]);

  // 経過時間の更新（制限時間なし）
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // フィードバック完了を監視して通知（提出直後に設定したessayIdを使用）
  useEffect(() => {
    if (phase === "submission-complete" && submittedEssayData?.essayId && user) {
      console.log('Setting up notification listener for essay:', submittedEssayData.essayId);
      const essayRef = doc(db, 'users', user.uid, 'basicEssays', submittedEssayData.essayId);
      const unsubscribe = onSnapshot(essayRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as BasicEssay;
          console.log('Essay status updated:', data.status, 'for essay:', snap.id);
          if (data.status === 'feedback_completed') {
            console.log('Feedback completed! Showing notification...');
            showFeedbackNotification(submittedEssayData.essayId, task?.title, 'basic');
          }
        }
      });
      return () => unsubscribe();
    }
  }, [phase, submittedEssayData, task, showFeedbackNotification, user]);

  const startWriting = () => {
    setPhase("writing");
    setStartTime(new Date());
    setIsTimerRunning(true);
  };

  const handleTimerUpdate = (seconds: number) => {
    setTimeSpent(seconds);
    // 制限時間なしなので何もしない
  };

  const handleSubmit = async () => {
    if (!user || !task || !essayText.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // エッセイを保存
      const essayData: Omit<BasicEssay, 'id'> = {
        userId: user.uid,
        taskId: task.id,
        content: essayText,
        essayType: 'basic',
        submittedAt: new Date(),
        status: 'pending',
        timeSpent,
        wordCount
      };
      
      const essayId = await saveBasicEssay(essayData);

      // 提出完了画面へ即時遷移（IELTS/TOEFLと同じフロー）
      setSubmittedEssayData({
        essayId,
        taskTitle: task.title,
        wordCount,
        timeSpent,
      });
      setPhase("submission-complete");

      // AI分析はバックグラウンドで実行して、完了後にDB更新（通知はリスナーで表示）
      fetch('/api/analyze-basic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ essayText, prompt: "自由記述" }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to analyze essay');
          const feedback = await res.json();
          if (user) {
            await updateBasicEssayFeedback(essayId, user.uid, feedback);
          }
        })
        .catch((err) => {
          console.error('Background analyze failed:', err);
        });
    } catch (error) {
      console.error('Error submitting essay:', error);
      alert('エッセイの提出に失敗しました。もう一度お試しください。');
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

  if (!user || !task) {
    return null;
  }

  // 提出完了画面を表示
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "初級";
      case "medium":
        return "中級";
      case "hard":
        return "上級";
      default:
        return difficulty;
    }
  };

  if (phase === "ready") {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <Button variant="ghost" asChild className="mb-4">
                <Link href="/basic-tasks">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  タスク一覧に戻る
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/basic-dashboard">
                    <Bell className="h-4 w-4 mr-2" />
                    添削結果を確認
                  </Link>
                </Button>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Edit3 className="h-8 w-8 mr-3 text-violet-600" />
              自由記述トレーニング
            </h1>
            <p className="text-gray-600">自由に英作文を書いてください</p>
          </div>

          {/* Basic トレーニングについて */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Basic トレーニングについて</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Basic トレーニングは、英語の基礎力を身につけるための時間計測機能付き自由記述トレーニングです。
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">トレーニングの流れ:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>開始ボタンを押すとタイマーがスタートします</li>
                    <li>自由に英作文を書いてください</li>
                    <li>完成したら提出ボタンを押してください</li>
                    <li>AIによる自動添削が行われます</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 開始ボタン */}
          <div className="text-center">
            <Button 
              onClick={startWriting}
              size="lg"
              className="bg-violet-600 hover:bg-violet-700 px-8 py-4 text-lg"
            >
              <Target className="mr-2 h-6 w-6" />
              トレーニング開始
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                <Button asChild variant="outline" size="sm">
                  <Link href="/basic-dashboard">
                    <Bell className="h-4 w-4 mr-2" />
                    添削結果を確認
                  </Link>
                </Button>

                <div className="text-right">
                  <div className="text-sm text-gray-500">経過時間</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
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

  if (phase === "completed" && submittedEssay) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 完了メッセージ */}
          <div className="text-center mb-8">
            <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">トレーニング完了！</h1>
            <p className="text-gray-600">お疲れさまでした。AIによる添削が完了しました。</p>
          </div>

          {/* 結果サマリー */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>結果サマリー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-600">{wordCount}</div>
                  <div className="text-sm text-gray-500">語数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-600">
                    {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-500">所要時間</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-600">
                    {Math.round((wordCount / (timeSpent / 60)) * 10) / 10}
                  </div>
                  <div className="text-sm text-gray-500">語/分</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* フィードバック */}
          {submittedEssay.feedback && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>AI添削結果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">全体的な印象</h4>
                    <p className="text-gray-700">{submittedEssay.feedback.overall}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {submittedEssay.feedback.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {submittedEssay.feedback.improvements.map((improvement, index) => (
                        <li key={index}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* 文法添削 */}
                  {submittedEssay.feedback.grammarCorrections && submittedEssay.feedback.grammarCorrections.corrections.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">文法添削</h4>
                      <div className="space-y-3">
                        {submittedEssay.feedback.grammarCorrections.corrections.map((correction, index) => (
                          <div key={index} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                              <div className="flex-1">
                                <div className="text-sm text-gray-600 mb-1">原文:</div>
                                <div className="text-gray-800 font-medium mb-1">"{correction.original}"</div>
                                <div className="text-sm text-gray-600 mb-1">修正後:</div>
                                <div className="text-green-800 font-medium mb-1">"{correction.corrected}"</div>
                                <div className="text-sm text-gray-600 mb-1">説明:</div>
                                <div className="text-gray-700">{correction.explanation}</div>
                                {correction.context && (
                                  <>
                                    <div className="text-sm text-gray-600 mb-1">文脈:</div>
                                    <div className="text-gray-700 italic">"{correction.context}"</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {submittedEssay.feedback.suggestions && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">アドバイス</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {submittedEssay.feedback.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* アクションボタン */}
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild variant="outline">
              <Link href="/basic-dashboard">
                <FileText className="mr-2 h-4 w-4" />
                ダッシュボードに戻る
              </Link>
            </Button>
            <Button asChild>
              <Link href="/basic-tasks">
                <Target className="mr-2 h-4 w-4" />
                別のトレーニングを始める
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
