"use client"
import Layout from "@/components/layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Clock, BookOpen, Headphones, PenTool, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { getTasks, Task } from "@/lib/firebase"

const getDifficultyStyle = (difficulty: string) => {
  switch (difficulty) {
    case "初級":
      return "bg-gray-100 text-gray-700"
    case "中級":
      return "bg-gray-200 text-gray-800"
    case "上級":
      return "bg-black text-white"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getTasks()
      setTasks(data)
      setLoading(false)
    }
    fetchTasks()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div>Loading...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Integrated Task 演習</h1>
          </div>
          <p className="text-lg text-gray-600 leading-relaxed">
            本番と同じ形式でTOEFL iBT Writing Integrated Taskを練習しましょう。各タスクは約26分で完了します。
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-gray-900 mb-2">{tasks.length}</div>
            <div className="text-gray-600">利用可能なタスク</div>
          </div>
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-gray-900 mb-2">26分</div>
            <div className="text-gray-600">1タスクあたりの時間</div>
          </div>
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-gray-900 mb-2">150-225</div>
            <div className="text-gray-600">目標語数</div>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-6">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="bg-white rounded-lg p-8 hover:bg-gray-50/50 transition-all hover:shadow-md border border-gray-200"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-black text-white rounded flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyStyle(task.difficulty)}`}
                  >
                    {task.difficulty}
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed">{task.description}</p>
                <div className="flex flex-wrap gap-2">
                  {task.category && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {task.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {task.estimatedTime}
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <Headphones className="w-4 h-4" />
                      <PenTool className="w-4 h-4" />
                    </div>
                  </div>
                  <Link href={`/tasks/${task.id}`}>
                    <Button className="bg-black hover:bg-gray-700 text-white transition-all hover:scale-105">
                      演習を開始
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-16 p-8 bg-white rounded-lg border border-gray-200">
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
      </div>
    </Layout>
  )
}
