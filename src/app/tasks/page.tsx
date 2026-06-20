"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Headphones, PenTool, ArrowRight, LogOut, MessageSquare, FileText } from "lucide-react"
import { useEffect, useState } from "react"
import { getTasks } from "@/lib/firebase"
import { Task } from "@/lib/types"
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      alert('ログアウトに失敗しました');
    }
    setLogoutDialogOpen(false);
  };

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getTasks()
      const integratedOnly = data.filter(task => task.type === "integrated")
      setTasks(integratedOnly)
      setLoading(false)
    }
    fetchTasks()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">データを読み込み中...</h1>
            <p className="text-gray-600">しばらくお待ちください。</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ヘッダー部分（max-w-7xlで横幅を広げる） */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                ← ダッシュボードに戻る
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">TOEFL問題リスト</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button>
                <FileText className="w-4 h-4 mr-2" /> ダッシュボードに戻る
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

      {/* ログアウト確認ダイアログ */}
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

      {/* メインコンテンツ部分は従来通りmax-w-4xlで */}
      <div className="max-w-4xl mx-auto px-8 py-12">
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
                    {/* <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {task.estimatedTime}
                    </div> */}
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
      </div>
    </>
  )
}
