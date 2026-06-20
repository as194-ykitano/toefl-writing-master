"use client";

import { useState, useEffect } from "react"
import React from "react"
import Layout from "@/components/layout"
import Timer from "@/components/timer"
import TextAreaWithControls from "@/components/textarea-with-controls"
import { Button } from "@/components/ui/button"
import { getTaskById } from "@/lib/getTasks"
import { saveEssay, getEssayFeedback } from "@/lib/firebase"
import { Task, Essay } from "@/lib/types"
import { Timestamp } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"
import { LogOut, MessageSquare, FileText, MessageCircle, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useNotification } from '@/contexts/NotificationContext'
import SubmissionComplete from '@/components/SubmissionComplete'
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useParams } from 'next/navigation'
import DiscussionDisplay from '@/components/DiscussionDisplay'
import TOEFLAcademicDiscussionScreen from '@/components/TOEFLAcademicDiscussionScreen'

type Phase = "ready" | "writing" | "completed" | "submission-complete"

interface TaskWithContent extends Omit<Task, 'listeningAudioURL'> {
  content?: string;
  discussionContent?: {
    professor: string;
    student1: string;
    student2: string;
    question: string;
  };
}

export default function TOEFLTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
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
  const [essay, setEssay] = useState<Essay | null>(null)
  const router = useRouter()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [submittedEssayId, setSubmittedEssayId] = useState<string | null>(null);
  const [submittedEssayData, setSubmittedEssayData] = useState<{
    essayId: string;
    taskTitle?: string;
    wordCount: number;
    timeSpent: number;
  } | null>(null);
  const [timerHidden, setTimerHidden] = useState(false);
  const [wordCountHidden, setWordCountHidden] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10分 = 600秒
  const [stance, setStance] = useState<'agree' | 'disagree' | null>(null);
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
        console.log('TOEFL task from firebase:', task);
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
          console.log('Preparing TOEFL essay data:', {
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
            wordCount,
            timeSpent,
            userId: user.uid,
            stance,
          };
          console.log('Calling saveEssay with data:', essayData);
          const essayId = await saveEssay(essayData, user.uid);
          
          if (essayId) {
            console.log('TOEFL essay saved successfully with ID:', essayId);
            setSubmittedEssayId(essayId);
            setSubmittedEssayData({
              essayId,
              taskTitle: taskData?.title,
              wordCount,
              timeSpent
            });
            
            // 提出完了画面に遷移
            setPhase("submission-complete");
            
            // バックグラウンドでフィードバック処理を開始（非同期で実行）
            console.log('Starting background TOEFL feedback processing...');
            getEssayFeedback(essayId, user.uid)
              .then((feedback) => {
                if (feedback) {
                  console.log('TOEFL feedback processing completed:', feedback);
                  // フィードバック完了時に通知を表示（Academic Discussionの場合は'toefl'タイプ）
                  showFeedbackNotification(essayId, taskData?.title, 'toefl');
                }
              })
              .catch((error) => {
                console.error('Error in background TOEFL feedback processing:', error);
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
          console.error("Error in TOEFL essay submission process:", error);
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
    setTimeRemaining(taskData?.timeLimit ? taskData.timeLimit * 60 : 600)
  }

  // タイマーの更新
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (writingTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            submitEssay();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [writingTimerRunning, timeRemaining]);

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
      stance,
      essayText: essayText.substring(0, 100) + '...' // 最初の100文字のみ表示
    });
    
    // stanceの選択をチェック
    if (stance === null) {
      alert('AgreeまたはDisagreeを選択してください。');
      return;
    }
    
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
    } catch (e) {
      alert('ログアウトに失敗しました');
    }
    setLogoutDialogOpen(false);
  };

  if (loading || !taskData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-8 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">タスクを読み込み中...</h1>
          <p className="text-gray-600">しばらくお待ちください。</p>
        </div>
      </div>
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
        taskType="toefl"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー部分（phaseが'ready'の時だけ表示） */}
      {phase === "ready" && (
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-end mb-8">
            <div className="flex items-center gap-4">
              <Link href="/toefl-tasks">
                <Button>
                  <FileText className="w-4 h-4 mr-2" /> 問題リストに戻る
                </Button>
              </Link>
              <Link href="/toefl-essays">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" /> 過去のエッセイ
                </Button>
              </Link>
              <Link href="/toefl-dashboard">
                <Button variant="outline">
                  <MessageCircle className="w-4 h-4 mr-2" /> TOEFLダッシュボード
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
                        Academic Discussion
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
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">ディスカッションの内容をしっかりと理解し、教授や他の学生の意見を踏まえて応答しましょう</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">自分の意見を明確に述べ、具体的な例や理由で裏付けましょう</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">建設的な議論に参加する姿勢を示し、他の意見を尊重しながら自分の立場を述べましょう</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-700">演習開始時にAgreeまたはDisagreeを選択してからエッセイを書き始めましょう</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 演習を開始ボタン */}
                  <div className="text-center">
                    <Button onClick={startWriting} className="bg-blue-600 hover:bg-blue-700 text-white">
                      演習を開始
                    </Button>
                  </div>
                </>
              )}

              {/* phaseごとのUI表示 */}
              {phase === "writing" && taskData?.discussionContent && (
                <TOEFLAcademicDiscussionScreen
                  discussionContent={taskData.discussionContent}
                  essayText={essayText}
                  onEssayTextChange={setEssayText}
                  wordCount={wordCount}
                  timeRemaining={timeRemaining}
                  onTimerToggle={() => setTimerHidden(!timerHidden)}
                  timerHidden={timerHidden}
                  onWordCountToggle={() => setWordCountHidden(!wordCountHidden)}
                  wordCountHidden={wordCountHidden}
                  stance={stance}
                  onStanceChange={setStance}
                  onSubmit={submitEssay}
                  onReset={resetEssay}
                />
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
    </div>
  )
}

