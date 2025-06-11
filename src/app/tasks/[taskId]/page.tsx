"use client"

import { useState, useEffect } from "react"
import React from "react"
import Layout from "@/components/layout"
import Timer from "@/components/timer"
import ScrollingText from "@/components/scrolling-text"
import ListeningScreen from "@/components/listening-screen"
import TextAreaWithControls from "@/components/textarea-with-controls"
import { Button } from "@/components/ui/button"
import { BookOpen, Headphones, PenTool, Clock, Target, AlertCircle } from "lucide-react"
import { getReadingPassageById, ReadingPassage } from "@/lib/getReadingPassages"
import { getTaskById, Task, saveEssay, getEssayFeedback } from "@/lib/firebase"

type Phase = "ready" | "reading" | "listening" | "writing" | "completed"

interface TaskWithPassage extends Omit<Task, 'listeningImageURL'> {
  readingPassage?: string;
  listeningImageURL?: string;
}

export default function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = React.use(params);
  const [taskData, setTaskData] = useState<TaskWithPassage | null>(null)
  const [phase, setPhase] = useState<Phase>("ready")
  const [readingTimerRunning, setReadingTimerRunning] = useState(false)
  const [writingTimerRunning, setWritingTimerRunning] = useState(false)
  const [essayText, setEssayText] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [writingStartTime, setWritingStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  // 所要時間を計算する関数
  const calculateTimeSpent = (start: Date, end: Date): string => {
    const diffInSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    return `${minutes}分${seconds}秒`;
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

        if (readingPassage?.passage) {
          console.log('Setting task data with passage:', readingPassage.passage);
          setTaskData({
            ...task,
            readingPassage: readingPassage.passage
          });
          console.log('setTaskData:', {
            ...task,
            readingPassage: readingPassage.passage
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
    if (phase === "completed") {
      const saveEssayData = async () => {
        try {
          if (!writingStartTime || !endTime) {
            throw new Error('ライティング開始時間または終了時間が記録されていません');
          }

          const timeSpent = calculateTimeSpent(writingStartTime, endTime);
          const essayId = await saveEssay({
            taskId: taskId,
            essayText,
            wordCount,
            timeSpent,
            status: "submitted"
          });
          
          if (essayId) {
            // 添削プロセスを開始（バックグラウンドで実行）
            getEssayFeedback(essayId).catch(error => {
              console.error("Error generating feedback:", error);
            });
            
            // 結果ページにリダイレクト
            window.location.href = `/dashboard/results/${essayId}`;
          }
        } catch (error) {
          console.error("Error saving essay:", error);
          alert('エッセイの保存に失敗しました。もう一度お試しください。');
        }
      };
      
      saveEssayData();
    }
  }, [phase, essayText, wordCount, taskId, writingStartTime, endTime])

  const startReading = () => {
    setPhase("reading")
    setReadingTimerRunning(true)
    setStartTime(new Date())
  }

  const finishReading = () => {
    setReadingTimerRunning(false)
    setPhase("listening")
  }

  const finishListening = () => {
    setPhase("writing")
    setWritingTimerRunning(true)
    setWritingStartTime(new Date())
  }

  const finishWriting = () => {
    setWritingTimerRunning(false)
    setEndTime(new Date())
    setPhase("completed")
  }

  const resetEssay = () => {
    setEssayText("")
    setWordCount(0)
  }

  const submitEssay = () => {
    if (window.confirm("エッセイを提出しますか？提出後は編集できません。")) {
      finishWriting()
    }
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
          <div className="mx-auto px-2 py-4">
            {/* Task Header */}
            <div className="mb-8 mx-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{taskData?.title}</h1>
              <p className="text-gray-600">{taskData?.description}</p>
            </div>

            {/* Phase Display */}
            {phase === "ready" && (
              <div className="text-center py-12">
                <Button onClick={startReading} className="bg-black hover:bg-gray-700 text-white">
                  演習を開始
                </Button>
              </div>
            )}

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
                      initialSeconds={180}
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
              <ListeningScreen
                imageURL={taskData?.listeningImageURL}
                audioURL={taskData?.listeningAudioURL}
                onComplete={finishListening}
              />
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
                      onFinish={finishWriting}
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
                  お疲れ様でした。エッセイは保存されました。
                </p>
                <Button onClick={() => window.location.href = "/tasks"}>
                  タスク一覧に戻る
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  )
}
