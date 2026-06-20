"use client"

import { useState, useEffect } from "react"
import React from "react"
import Layout from "@/components/layout"
import ListeningScreen from "@/components/listening-screen"
import { Button } from "@/components/ui/button"
import { getTaskById } from "@/lib/getTasks"
import { Task } from "@/lib/types"
import { useRouter } from "next/navigation"

interface TaskWithPassage extends Omit<Task, 'listeningAudioURL'> {
  listeningAudioURL?: string;
}

export default function ListeningPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = React.use(params);
  const [taskData, setTaskData] = useState<TaskWithPassage | null>(null)
  const [loading, setLoading] = useState(true)
  const [isTestMode, setIsTestMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // 読み込み開始
      try {
        const task = await getTaskById(taskId);
        if (!task) {
          // エラー処理（タスクが見つからない）
          console.error("Task not found");
          return;
        }
        setTaskData(task);
      } catch (error) {
        console.error("Error fetching task data:", error);
      } finally {
        setLoading(false); // 読み込み完了
      }
    };
    fetchData();
  }, [taskId]);

  const finishListening = () => {
    router.push(`/tasks/${taskId}/writing`)
  }

  if (loading || !taskData || !taskData.listeningAudioURL) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-180px)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">タスクを読み込み中...</h1>
            <p className="text-gray-600">音声データを準備しています。しばらくお待ちください。</p>
            {/* スピナーなどを追加しても良い */}
          </div>
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

              {/* Listening Phase Display */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 min-h-[calc(100vh-180px)] mx-8 mt-16 mb-16">
                {isTestMode ? (
                  <div className="text-center">
                    <p className="mb-4">テストモード: リスニングをスキップします</p>
                    <Button onClick={finishListening}>
                      ライティングに進む
                    </Button>
                  </div>
                ) : (
                  <ListeningScreen
                    audioURL={taskData.listeningAudioURL}
                    onComplete={finishListening}
                  />
                )}
              </div>

            </div>
          </div>
        </main>
      </div>
    </Layout>
  )
} 