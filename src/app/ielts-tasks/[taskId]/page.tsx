"use client";

import { useState, useEffect, useRef } from "react"
import React from "react"
import Layout from "@/components/layout"
import Timer from "@/components/timer"
import TextAreaWithControls from "@/components/textarea-with-controls"
import { Button } from "@/components/ui/button"
import { getTaskById } from "@/lib/getTasks"
import { saveIELTSEssay, getIELTSEssayFeedback } from "@/lib/firebase"
import { Task } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"
import { LogOut, MessageSquare, FileText, BarChart3, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useNotification } from '@/contexts/NotificationContext'
import SubmissionComplete from '@/components/SubmissionComplete'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type Phase = "ready" | "writing" | "completed" | "submission-complete"

interface TaskWithContent extends Omit<Task, 'listeningAudioURL'> {
  content?: string;
  imageUrl?: string;
}

export default function IELTSTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = React.use(params);
  const { user, logout } = useAuth();
  const { showFeedbackNotification } = useNotification();
  const [taskData, setTaskData] = useState<TaskWithContent | null>(null)
  const [phase, setPhase] = useState<Phase>("ready")
  const [writingTimerRunning, setWritingTimerRunning] = useState(false)
  const [essayText, setEssayText] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [writingStartTime, setWritingStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [submittedEssayData, setSubmittedEssayData] = useState<{
    essayId: string;
    taskTitle?: string;
    wordCount: number;
    timeSpent: number;
  } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasSavedRef = useRef(false);

  // 所要時間を計算する関数
  const calculateTimeSpent = (start: Date, end: Date): number => {
    const diffInSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    return diffInSeconds;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const task = await getTaskById(taskId);
        console.log('IELTS task from firebase:', task);
        if (!task) {
          console.log('No task data found');
          return;
        }

        setTaskData(task);
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

          if (!taskData) {
            throw new Error('タスクデータが取得できていません');
          }

          const timeSpent = calculateTimeSpent(writingStartTime, endTime);
          console.log('Preparing IELTS essay data:', {
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
            taskType: (taskData?.taskType === 'task1' ? 'task1' : 'task2'),
            wordCount,
            timeSpent,
            userId: user.uid
          };
          console.log('Calling saveIELTSEssay with data:', essayData);
          const essayId = await saveIELTSEssay(essayData, user.uid);
          
          if (essayId) {
            console.log('IELTS essay saved successfully with ID:', essayId);
            setSubmittedEssayData({
              essayId,
              taskTitle: taskData?.title,
              wordCount,
              timeSpent
            });
            
            // 提出完了画面に遷移
            setPhase("submission-complete");
            
            // バックグラウンドでフィードバック処理を開始（非同期で実行）
            console.log('Starting background IELTS feedback processing...');
            getIELTSEssayFeedback(essayId, user.uid)
              .then((feedback) => {
                if (feedback) {
                  console.log('IELTS feedback processing completed:', feedback);
                  // フィードバック完了時に通知を表示
                  showFeedbackNotification(essayId, taskData?.title, 'ielts');
                }
              })
              .catch((error) => {
                console.error('Error in background IELTS feedback processing:', error);
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
          console.error("Error in IELTS essay submission process:", error);
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

  const startWriting = () => {
    setPhase("writing")
    setWritingTimerRunning(true)
    setWritingStartTime(new Date())
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
      setPhase("completed");
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
        taskType="ielts"
      />
    );
  }

  return (
    <Layout hideFooter={phase === "writing"}>
      {/* ヘッダー部分（phaseが'ready'の時だけ表示） */}
      {phase === "ready" && (
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-end mb-8">
            <div className="flex items-center gap-4">
              <Link href="/ielts-tasks">
                <Button>
                  <FileText className="w-4 h-4 mr-2" /> 問題リストに戻る
                </Button>
              </Link>
              <Link href="/ielts-essays">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" /> 過去のエッセイ
                </Button>
              </Link>
              <Link href="/ielts-dashboard">
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" /> IELTSダッシュボード
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

                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {taskData?.taskType === 'task1' ? 'Task 1 (Academic Writing)' : 'Task 2 (Essay Writing)'}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                        {taskData?.difficulty}
                      </span>
                    </div>
                  </div>
                  {/* Tips: 演習のポイント */}
                  <div className="mb-8 p-8 bg-white rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">演習のポイント</h3>
                    <div className="space-y-4">
                      {taskData?.taskType === 'task1' ? (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-gray-700">グラフ・図表の主要な特徴（trends, comparisons, key figures）を特定しましょう</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-gray-700">客観的な事実を述べ、主観的な意見は避けましょう</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-gray-700">適切な接続詞を使用して論理的な流れを作りましょう</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-gray-700">設問に直接答える導入段落から始めましょう</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-gray-700">各段落で1つの主要な論点を展開しましょう</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-gray-700">具体例や証拠で主張を裏付けましょう</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {/* 演習を開始ボタン */}
                  <div className="text-center">
                    <Button onClick={startWriting} className="bg-black hover:bg-gray-700 text-white">
                      演習を開始
                    </Button>
                  </div>
                </>
              )}

              {/* phaseごとのUI表示 */}
              {phase === "writing" && (
                <div className="bg-white rounded-lg p-4 border border-gray-200 min-h-[calc(100vh-180px)] mx-8 mt-16 mb-16">
                  {/* Directions & Question */}
                  <div className="mb-2">
                    <div className="text-base text-gray-700 font-semibold border-b pb-1 mb-1">
                      {taskData?.taskType === 'task1' 
                        ? 'Directions: You should spend about 20 minutes on this task. Write at least 150 words.'
                        : 'Directions: You should spend about 40 minutes on this task. Write about the following topic: Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words'
                      }
                    </div>
                    <div className="text-base font-bold mb-4">
                      {taskData?.content}
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
                                     {/* 2カラム - Task1の場合、Task2の場合は1カラム */}
                  <div className={taskData?.taskType === 'task1' ? "grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[calc(100vh-80px)]" : "min-h-[calc(100vh-80px)]"}>
                     {/* 左：グラフ/図のみ表示 - Task1の場合のみ */}
                     {taskData?.taskType === 'task1' && (
                       <div className="h-full border rounded p-6 overflow-y-auto bg-gray-50">
                         {/* グラフや図の表示 */}
                         {taskData?.imageUrl && (
                           <div className="h-full flex flex-col">
                             <div className="text-sm font-semibold text-gray-700 mb-4">グラフ・図表:</div>
                             <div className="flex-1 flex items-center justify-center">
                               <img 
                                 src={taskData.imageUrl} 
                                 alt="Task chart or diagram" 
                                 className="max-w-full max-h-full object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                 onClick={() => setShowImageModal(true)}
                                 title="クリックで拡大表示"
                               />
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                    {/* 右：ライティング - Task2の場合は全幅 */}
                    <div className={`border rounded p-6 bg-white ${taskData?.taskType === 'task2' ? 'w-full' : ''}`}>
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

      {/* 画像拡大表示モーダル */}
      {showImageModal && taskData?.imageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-15 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white bg-opacity-95 rounded-lg overflow-hidden shadow-2xl backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImageModal(false)}
                className="bg-white hover:bg-gray-100 shadow-md"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4">
              <img 
                src={taskData.imageUrl} 
                alt="Task chart or diagram (enlarged)" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
