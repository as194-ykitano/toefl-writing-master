"use client"

import { useState, useEffect } from "react"
import React from "react"
import Layout from "@/components/layout"
import Timer from "@/components/timer"
import ListeningScreen from "@/components/listening-screen"
import TextAreaWithControls from "@/components/textarea-with-controls"
import { Button } from "@/components/ui/button"
import { getReadingPassageById } from "@/lib/getReadingPassages"
import { getTaskById } from "@/lib/getTasks"
import { saveEssay, getEssayFeedback } from "@/lib/firebase"
import { Task } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"
import { LogOut, MessageSquare, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useNotification } from '@/contexts/NotificationContext'
import SubmissionComplete from '@/components/SubmissionComplete'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type Phase = "ready" | "reading" | "listening" | "writing" | "completed" | "submission-complete"

interface TaskWithPassage extends Omit<Task, 'listeningAudioURL'> {
  readingPassage?: string;
  listeningAudioURL?: string;
}

export default function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = React.use(params);
  const { user, logout } = useAuth();
  const { showFeedbackNotification } = useNotification();
  const [taskData, setTaskData] = useState<TaskWithPassage | null>(null)
  const [phase, setPhase] = useState<Phase>("ready")
  const [readingTimerRunning, setReadingTimerRunning] = useState(false)
  const [writingTimerRunning, setWritingTimerRunning] = useState(false)
  const [essayText, setEssayText] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [writingStartTime, setWritingStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [isTestMode] = useState(false)
  const router = useRouter()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [submittedEssayData, setSubmittedEssayData] = useState<{
    essayId: string;
    taskTitle?: string;
    wordCount: number;
    timeSpent: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasSavedRef = React.useRef(false);

  // 所要時間を計算する関数
  const calculateTimeSpent = (start: Date, end: Date): number => {
    const diffInSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    return diffInSeconds;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const task = await getTaskById(taskId);
        console.log('task from firebase:', task);
        if (!task) {
          console.log('No task data found');
          return;
        }

        if (!task.readingPassageId) {
          console.error('No reading passage ID found in task');
          setTaskData({
            ...task,
            readingPassage: "No reading passage available. Please check the database."
          });
          setLoading(false);
          return;
        }

        const readingPassage = await getReadingPassageById(task.readingPassageId);
        console.log('Fetched reading passage:', readingPassage);

        if (readingPassage?.content) {
          console.log('Setting task data with passage:', readingPassage.content);
          setTaskData({
            ...task,
            readingPassage: readingPassage.content
          });
          console.log('setTaskData:', {
            ...task,
            readingPassage: readingPassage.content
          });
        } else {
          console.log('No reading passage found, using default');
          setTaskData({
            ...task,
            readingPassage: "No reading passage available. Please check the database."
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskId]);

  useEffect(() => {
    if (essayText) {
      const words = essayText
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0)
      setWordCount(words.length)
    } else {
      setWordCount(0)
    }
  }, [essayText])

  useEffect(() => {
    console.log('=== Phase changed ===', { 
      phase,
      writingStartTime: writingStartTime?.toISOString(),
      endTime: endTime?.toISOString(),
      wordCount,
      essayTextLength: essayText.length
    });
    
    if (phase === "completed") {
      console.log('Phase is completed, starting saveEssayData');
      const saveEssayData = async () => {
        try {
          if (hasSavedRef.current || isSaving) {
            console.log('Save already in progress or completed. Skipping duplicate save.');
            return;
          }
          setIsSaving(true);
          hasSavedRef.current = true;
          if (!writingStartTime || !endTime) {
            console.error('Missing time data:', { 
              writingStartTime: writingStartTime?.toISOString(), 
              endTime: endTime?.toISOString() 
            });
            throw new Error('ライティング開始時間または終了時間が記録されていません');
          }

          if (!user) {
            throw new Error('ユーザーがログインしていません');
          }

          const timeSpent = calculateTimeSpent(writingStartTime, endTime);
          console.log('Preparing essay data:', {
            taskId,
            wordCount,
            timeSpent,
            status: "processing",
            essayTextLength: essayText.length
          });

          const essayData = {
            content: essayText,
            submittedAt: new Date(),
            status: "processing" as const,
            taskId,
            taskType: 'toefl' as const,
            wordCount,
            timeSpent,
            userId: user.uid
          };
          console.log('Calling saveEssay with data:', essayData);
          const essayId = await saveEssay(essayData, user.uid);
          
          if (essayId) {
            console.log('Essay saved successfully with ID:', essayId);
            setSubmittedEssayData({
              essayId,
              taskTitle: taskData?.title,
              wordCount,
              timeSpent
            });
            
            // 提出完了画面に遷移
            setPhase("submission-complete");
            
            // バックグラウンドでフィードバック処理を開始（非同期で実行）
            console.log('Starting background feedback processing...');
            getEssayFeedback(essayId, user.uid)
              .then((feedback) => {
                if (feedback) {
                  console.log('Feedback processing completed:', feedback);
                  // フィードバック完了時に通知を表示
                  showFeedbackNotification(essayId, taskData?.title, 'toefl');
                }
              })
              .catch((error) => {
                console.error('Error in background feedback processing:', error);
                // エラーが発生した場合、statusをerrorに更新
                const essayRef = doc(db, 'users', user.uid, 'essays', essayId);
                updateDoc(essayRef, {
                  status: 'error'
                }).catch(updateError => {
                  console.error('Error updating essay status to error:', updateError);
                });
              });
          }
        } catch (error) {
          console.error("Error in essay submission process:", error);
          alert('エッセイの保存に失敗しました。もう一度お試しください。');
          hasSavedRef.current = false;
        } finally {
          setIsSaving(false);
        }
      };
      
      saveEssayData();
    }
  }, [phase, essayText, wordCount, taskId, writingStartTime, endTime, user, taskData, showFeedbackNotification]);

  // phaseの変更を監視するuseEffect
  useEffect(() => {
    console.log('=== Phase state changed ===', { 
      phase,
      writingStartTime: writingStartTime?.toISOString(),
      endTime: endTime?.toISOString()
    });
  }, [phase, writingStartTime, endTime]);

  const startReading = () => {
    setPhase("reading")
    setReadingTimerRunning(true)
  }

  const finishReading = () => {
    setReadingTimerRunning(false)
    setPhase("listening")
  }

  const resetEssay = () => {
    setEssayText("")
    setWordCount(0)
  }

  const submitEssay = () => {
    console.log('=== submitEssay called ===');
    console.log('Current state:', {
      phase,
      writingStartTime,
      endTime,
      wordCount,
      essayText: essayText.substring(0, 100) + '...' // 最初の100文字のみ表示
    });
    
    if (window.confirm("エッセイを提出しますか？提出後は編集できません。")) {
      console.log('User confirmed submission');
      // 状態更新を同期的に行う
      setWritingTimerRunning(false);
      setEndTime(new Date());
      if (!hasSavedRef.current) {
        setPhase("completed");
      }
      console.log('State updates triggered');
    } else {
      console.log('User cancelled submission');
    }
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      alert('ログアウトに失敗しました');
    }
    setLogoutDialogOpen(false);
  };

  if (loading || !taskData) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-8 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">タスクを読み込み中...</h1>
          <p className="text-gray-600">しばらくお待ちください。</p>
        </div>
      </Layout>
    )
  }

  // 提出完了画面を表示
  if (phase === "submission-complete" && submittedEssayData) {
    return (
      <SubmissionComplete
        essayId={submittedEssayData.essayId}
        taskTitle={submittedEssayData.taskTitle}
        wordCount={submittedEssayData.wordCount}
        timeSpent={submittedEssayData.timeSpent}
        taskType="integrated"
      />
    );
  }

  return (
    <Layout>
      {/* ヘッダー部分（phaseが'ready'の時だけ表示） */}
      {phase === "ready" && (
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-end mb-8">
            <div className="flex items-center gap-4">
              <Link href="/tasks">
                <Button>
                  <FileText className="w-4 h-4 mr-2" /> 問題リストに戻る
                </Button>
              </Link>
              <Link href="/essays">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" /> 過去のエッセイ
                </Button>
              </Link>
              {/* ログアウトボタン */}
              <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
                <LogOut className="w-4 h-4 mr-2" /> ログアウト
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ログアウト確認ダイアログ（phaseが'ready'の時だけ表示） */}
      {phase === "ready" && (
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ログアウトの確認</DialogTitle>
              <DialogDescription>
                ログアウトしてもよろしいですか？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                ログアウト
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <div className="min-h-screen bg-gray-50">
        <main className={phase === "ready" ? "max-w-[1600px] mx-auto" : "w-full px-0"}>
          <div className={phase === "ready" ? "max-w-4xl mx-auto" : "w-full"}>
            <div className={phase === "ready" ? "px-8 py-4" : "px-0 py-0"}>
              {/* ヘッダー・説明・演習のポイント・演習を開始ボタンはphaseが'ready'のときだけ表示 */}
              {phase === "ready" && (
                <>
                  {/* Task Header */}
                  <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{taskData?.title}</h1>
                    <p className="text-gray-600">{taskData?.description}</p>
                  </div>
                  {/* Tips: 演習のポイント */}
                  <div className="mb-8 p-8 bg-white rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">演習のポイント</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">リーディングは3分間で集中して読み、要点をメモしましょう</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">リスニングは一度しか聞けないので、注意深く聞き取りましょう</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">ライティングでは両方の内容を統合して論理的に記述しましょう</p>
                      </div>
                    </div>
                  </div>
                  {/* 演習を開始ボタン */}
                  <div className="text-center">
                    <Button onClick={startReading} className="bg-black hover:bg-gray-700 text-white">
                      演習を開始
                    </Button>
                  </div>
                </>
              )}

              {/* phaseごとのUI表示 */}
              {phase === "reading" && (
                <div className="bg-white rounded-lg p-4 border border-gray-200 min-h-[calc(100vh-180px)] mx-8 mt-16 mb-16">
                  {/* Directions & Question */}
                  <div className="mb-2">
                    <div className="text-base text-gray-700 font-semibold border-b pb-1 mb-1">
                      Directions: You have 20 minutes to plan and write your response. Your response will be judged on the basis of the quality of your writing and on how well your response presents the points in the lecture and their relationship to the reading passage. Typically, an effective response will be 150 to 225 words.
                    </div>
                    <div className="text-base font-bold mb-4">
                      Question: Summarize the points made in the lecture you just heard, explaining how they cast doubt on points made in the reading.
                    </div>
                    <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 border rounded-lg">
                      <div className="text-base text-gray-700 font-semibold">
                        Reading Time Remaining:
                      </div>
                      <Timer
                        initialSeconds={isTestMode ? 10 : 180}
                        isRunning={readingTimerRunning}
                        onFinish={finishReading}
                      />
                    </div>
                  </div>
                  {/* 2カラム */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-100px)]">
                    {/* 左：リーディング */}
                    <div className="h-full border rounded p-6 overflow-y-auto bg-gray-50">
                      <div className="whitespace-pre-line text-base text-gray-900">
                        {taskData?.readingPassage}
                      </div>
                    </div>
                    {/* 右：ライティング（今はロック中） */}
                    <div className="h-full border rounded p-6 flex flex-col items-center justify-center bg-gray-100">
                      <div className="text-gray-400 text-center">
                        <div className="mb-1 font-bold">Writing Area</div>
                        <div>このエリアは現在ご利用いただけません。</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {phase === "listening" && (
                <div className="bg-white rounded-lg p-4 border border-gray-200 min-h-[calc(100vh-180px)] mx-8 mt-16 mb-16">
                  {isTestMode ? (
                    <div className="text-center">
                      <p className="mb-4">テストモード: リスニングをスキップします</p>
                      <Button onClick={() => {
                        setPhase("writing");
                        setWritingTimerRunning(true);
                        setWritingStartTime(new Date());
                      }}>
                        ライティングに進む
                      </Button>
                    </div>
                  ) : (
                    <ListeningScreen
                      audioURL={taskData?.listeningAudioURL || ""}
                      onComplete={() => {
                        setPhase("writing");
                        setWritingTimerRunning(true);
                        setWritingStartTime(new Date());
                      }}
                    />
                  )}
                </div>
              )}

              {phase === "writing" && (
                <div className="bg-white rounded-lg p-4 border border-gray-200 min-h-[calc(100vh-180px)] mx-8 mt-16 mb-16">
                  {/* Directions & Question */}
                  <div className="mb-2">
                    <div className="text-base text-gray-700 font-semibold border-b pb-1 mb-1">
                      Directions: You have 20 minutes to plan and write your response. Your response will be judged on the basis of the quality of your writing and on how well your response presents the points in the lecture and their relationship to the reading passage. Typically, an effective response will be 150 to 225 words.
                    </div>
                    <div className="text-base font-bold mb-4">
                      Question: Summarize the points made in the lecture you just heard, explaining how they cast doubt on points made in the reading.
                    </div>
                    <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 border rounded-lg">
                      <div className="text-base text-gray-700 font-semibold">
                        Writing Time Remaining:
                      </div>
                      <Timer
                        initialSeconds={taskData?.timeLimit ? taskData.timeLimit * 60 : 1800}
                        isRunning={writingTimerRunning}
                        onFinish={submitEssay}
                      />
                    </div>
                  </div>
                  {/* 2カラム */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-80px)]">
                    {/* 左：リーディング */}
                    <div className="h-full border rounded p-6 overflow-y-auto bg-gray-50">
                      <div className="whitespace-pre-line text-base text-gray-900">
                        {taskData?.readingPassage}
                      </div>
                    </div>
                    {/* 右：ライティング */}
                    <div className="h-full border rounded p-6 bg-white">
                      <TextAreaWithControls
                        value={essayText}
                        onChange={setEssayText}
                        disabled={false}
                        wordCount={wordCount}
                        onReset={resetEssay}
                        onSubmit={submitEssay}
                      />
                    </div>
                  </div>
                </div>
              )}

              {phase === "completed" && (
                <div className="text-center py-12">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">演習完了</h2>
                  <p className="text-gray-600 mb-8">
                    エッセイを保存中です。しばらくお待ちください...
                  </p>
                  <div className="animate-pulse">
                    <div className="h-2 w-48 bg-gray-200 rounded mx-auto mb-4"></div>
                    <div className="h-2 w-32 bg-gray-200 rounded mx-auto"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
}
