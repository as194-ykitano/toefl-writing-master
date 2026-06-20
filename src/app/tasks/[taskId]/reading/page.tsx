"use client"

import { useState, useEffect } from "react"
import React from "react"
import Layout from "@/components/layout"
import Timer from "@/components/timer"
import { getReadingPassageById } from "@/lib/getReadingPassages"
import { getTaskById } from "@/lib/getTasks"
import { Task } from "@/lib/types"
import { useParams, useRouter } from "next/navigation"

interface TaskWithPassage extends Omit<Task, 'listeningAudioURL'> {
  readingPassage?: string;
  listeningAudioURL?: string;
}

export default function ReadingPage() {
  const params = useParams<{ taskId: string }>();
  const taskId = params?.taskId as string;
  const [taskData, setTaskData] = useState<TaskWithPassage | null>(null)
  const [readingTimerRunning, setReadingTimerRunning] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isTestMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!taskId) return;
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

  const finishReading = () => {
    setReadingTimerRunning(false)
    router.push(`/tasks/${taskId}/listening`)
  }

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

              {/* Reading Phase Display */}
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

            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
} 
