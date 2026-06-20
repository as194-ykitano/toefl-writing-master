"use client"

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { getTaskById } from '@/lib/getTasks';
import { getReadingPassageById } from '@/lib/getReadingPassages';
import { saveEssay, getEssayFeedback } from '@/lib/firebase';
import Layout from '@/components/layout';
import Timer from '@/components/timer';
import TextAreaWithControls from '@/components/textarea-with-controls';
import { Task } from "@/lib/types"
import SubmissionComplete from '@/components/SubmissionComplete';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TaskWithPassage extends Omit<Task, 'listeningAudioURL'> {
  readingPassage?: string;
  listeningAudioURL?: string;
}

export default function WritingPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = React.use(params);
  const [taskData, setTaskData] = useState<TaskWithPassage | null>(null)
  const [writingTimerRunning, setWritingTimerRunning] = useState(true)
  const [essayText, setEssayText] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [writingStartTime, setWritingStartTime] = useState<Date | null>(new Date())
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittedEssayData, setSubmittedEssayData] = useState<{
    essayId: string;
    taskTitle?: string;
    wordCount: number;
    timeSpent: number;
  } | null>(null);
  const [showSubmissionComplete, setShowSubmissionComplete] = useState(false);
  const { user } = useAuth();
  const { showFeedbackNotification } = useNotification();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const task = await getTaskById(taskId);
        if (!task) {
          return;
        }
        if (!task.readingPassageId) {
          setTaskData({
            ...task,
            readingPassage: "No reading passage available. Please check the database."
          });
          setLoading(false);
          return;
        }
        const readingPassage = await getReadingPassageById(task.readingPassageId);
        if (readingPassage?.content) {
          setTaskData({
            ...task,
            readingPassage: readingPassage.content
          });
        } else {
          setTaskData({
            ...task,
            readingPassage: "No reading passage available. Please check the database."
          });
        }
      } catch {
        // エラー処理
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

  const resetEssay = () => {
    setEssayText("")
    setWordCount(0)
  }

  const submitEssay = () => {
    if (window.confirm("エッセイを提出しますか？提出後は編集できません。")) {
      setWritingTimerRunning(false);
      setEndTime(new Date());
      saveEssayData();
    }
  }

  const saveEssayData = async () => {
    try {
      if (!writingStartTime || !endTime) {
        alert('ライティング開始時間または終了時間が記録されていません');
        return;
      }
      if (!user) {
        alert('ユーザーがログインしていません');
        return;
      }
      
      const timeSpent = Math.floor((endTime.getTime() - writingStartTime.getTime()) / 1000);
      const essayData = {
        content: essayText,
        submittedAt: new Date(),
        status: "processing" as const,
        taskId,
        wordCount,
        timeSpent,
        userId: user.uid
      };
      const essayId = await saveEssay(essayData, user.uid);
      if (essayId) {
        setSubmittedEssayData({
          essayId,
          taskTitle: taskData?.title,
          wordCount,
          timeSpent
        });
        
        // 提出完了画面を表示
        setShowSubmissionComplete(true);
        
        // バックグラウンドでフィードバック処理を開始（非同期で実行）
        getEssayFeedback(essayId, user.uid)
          .then((feedback) => {
            if (feedback) {
              // フィードバック完了時に通知を表示
              showFeedbackNotification(essayId, taskData?.title);
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
    } catch {
      alert('エッセイの保存に失敗しました。もう一度お試しください。');
    }
  }

  // ページがマウントされた時にタイマーを開始
  useEffect(() => {
    if (!writingStartTime) {
      setWritingStartTime(new Date());
    }
    console.log('Writing page mounted, timer should be running:', { writingTimerRunning, writingStartTime });
  }, []);

  // タイマーの状態を監視
  useEffect(() => {
    console.log('Timer state changed:', { writingTimerRunning, writingStartTime });
  }, [writingTimerRunning, writingStartTime]);

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
  if (showSubmissionComplete && submittedEssayData) {
    return (
      <SubmissionComplete
        essayId={submittedEssayData.essayId}
        taskTitle={submittedEssayData.taskTitle}
        wordCount={submittedEssayData.wordCount}
        timeSpent={submittedEssayData.timeSpent}
      />
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-[1600px] mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="px-8 py-4">
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

              {/* Writing Phase Display */}
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

            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
} 
