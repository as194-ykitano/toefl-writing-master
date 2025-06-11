"use client"

import { useEffect, useState } from "react"
import Layout from "@/components/layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, Clock, Target, ArrowRight, Calendar } from "lucide-react"
import { getEssays, getTaskById, deleteAllEssays, Essay, Task } from "@/lib/firebase"

export default function DashboardPage() {
  const [essays, setEssays] = useState<Essay[]>([])
  const [tasks, setTasks] = useState<{ [key: string]: Task }>({})
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // エッセイの取得
        const essaysData = await getEssays()
        setEssays(essaysData)

        // 各エッセイに関連するタスクの取得
        const taskIds = Array.from(new Set(essaysData.map(essay => essay.taskId)))
        const tasksData: { [key: string]: Task } = {}
        await Promise.all(
          taskIds.map(async (taskId) => {
            const task = await getTaskById(taskId)
            if (task) {
              tasksData[taskId] = task
            }
          })
        )
        setTasks(tasksData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDeleteAllEssays = async () => {
    if (!confirm('本当に全てのエッセイを削除しますか？この操作は取り消せません。')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteAllEssays();
      setEssays([]);
      alert('全てのエッセイを削除しました');
    } catch (error) {
      console.error('Error deleting essays:', error);
      alert('エッセイの削除中にエラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">データを読み込み中...</h1>
            <p className="text-gray-600">しばらくお待ちください。</p>
          </div>
        </div>
      </Layout>
    )
  }

  const averageScore = essays.length > 0
    ? Math.round(essays.reduce((sum, e) => sum + (e.score || 0), 0) / essays.length)
    : 0
  const totalAttempts = essays.length
  const bestScore = essays.length > 0
    ? Math.max(...essays.map((e) => e.score || 0))
    : 0

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">ダッシュボード</h1>
            <p className="text-gray-600">学習の進捗と成績を確認しましょう</p>
          </div>
          <div className="flex gap-4">
            <Link href="/tasks">
              <Button className="bg-black hover:bg-gray-800 text-white">
                新しい演習を開始
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAllEssays}
              disabled={isDeleting || essays.length === 0}
            >
              {isDeleting ? '削除中...' : '全てのエッセイを削除'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{totalAttempts}</p>
              <p className="text-gray-600 text-sm">総演習回数</p>
              <p className="text-gray-500 text-xs">今月の目標: 10回</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{averageScore}</p>
              <p className="text-gray-600 text-sm">平均スコア</p>
              <p className="text-gray-500 text-xs">目標スコア: 26</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{bestScore}</p>
              <p className="text-gray-600 text-sm">最高スコア</p>
              <p className="text-gray-500 text-xs">前回から +2点</p>
            </div>
          </div>
        </div>

        {/* Recent Essays */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">最近の演習</h2>
          </div>

          <div className="space-y-4">
            {essays.map((essay, index) => (
              <Link key={essay.id} href={`/dashboard/results/${essay.id}`}>
                <div className="bg-white rounded-lg p-6 hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{tasks[essay.taskId]?.title || 'Unknown Task'}</h3>
                        <p className="text-sm text-gray-600">{essay.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{essay.wordCount}</div>
                        <div className="text-gray-600">語</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{essay.timeSpent}</div>
                        <div className="text-gray-600">時間</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-900">{essay.score || '-'}</div>
                        <div className="text-gray-600">点</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold ${essay.status === "submitted" ? "text-blue-600" : "text-green-600"}`}>
                          {essay.status === "submitted" ? "提出完了" : "フィードバック完了"}
                        </div>
                        <div className="text-gray-600">ステータス</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">スコア推移</h2>
          </div>
          <div className="bg-white rounded-lg p-12 border border-gray-200">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">グラフ表示エリア</p>
              <p className="text-gray-400 text-sm">Chart.js実装予定</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
