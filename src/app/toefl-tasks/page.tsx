"use client"
import Layout from "@/components/layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Clock, FileText, ArrowRight, LogOut, MessageSquare, Users, MessageCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { getTasks } from "@/lib/firebase"
import { Task } from "@/lib/types"
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSampleTOEFLAcademicDiscussionTasks } from "@/lib/toeflSampleTasks";

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

export default function TOEFLTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [practiceCounts, setPracticeCounts] = useState<{[key: string]: number}>({});
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (e) {
      alert('ログアウトに失敗しました');
    }
    setLogoutDialogOpen(false);
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await getTasks()
        // TOEFL Academic Discussion専用の問題のみをフィルタリング
        const toeflTasks = data.filter(task => 
          task.taskType === 'academic_discussion'
        )
        
        // TOEFLタスクが存在しない場合はサンプル問題を表示
        if (toeflTasks.length === 0) {
          console.log('TOEFL Academic Discussionタスクが見つからないため、サンプル問題を表示します')
          setTasks(getSampleTOEFLAcademicDiscussionTasks())
        } else {
          setTasks(toeflTasks)
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
        // エラーの場合もサンプル問題を表示
        setTasks(getSampleTOEFLAcademicDiscussionTasks())
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  // ユーザーの演習履歴を取得
  useEffect(() => {
    const fetchPracticeCounts = async () => {
      if (!user) return;
      
      try {
        const { collection, query, getDocs, doc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const essaysRef = collection(db, 'users', user.uid, 'essays');
        const querySnapshot = await getDocs(essaysRef);
        
        const counts: {[key: string]: number} = {};
        
        querySnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.taskId) {
            counts[data.taskId] = (counts[data.taskId] || 0) + 1;
          }
        });
        
        setPracticeCounts(counts);
      } catch (error) {
        console.error('Error fetching practice counts:', error);
      }
    };
    
    fetchPracticeCounts();
  }, [user]);

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
            <Link href="/toefl-dashboard">
              <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                ← ダッシュボードに戻る
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">TOEFL Academic Discussion 問題リスト</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/toefl-dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4 mr-2" /> ダッシュボードに戻る
              </Button>
            </Link>
            <Link href="/toefl-essays">
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
            <div className="text-3xl font-bold text-gray-900 mb-2">10分</div>
            <div className="text-gray-600">1タスクあたりの時間</div>
          </div>
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-gray-900 mb-2">100+</div>
            <div className="text-gray-600">目標語数</div>
          </div>
        </div>

        {/* Task Type Legend */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">TOEFL Academic Discussion について</h3>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-blue-900 mb-1">Academic Discussion</div>
                <div className="text-blue-700">教授と学生のディスカッションを読んで、自分の意見を述べる（10分、100語以上）</div>
              </div>
            </div>
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
                  <div className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      <MessageCircle className="w-4 h-4 inline" />
                      <span className="sr-only">Academic Discussion</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {/* 演習回数表示 */}
                    <div className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                      {practiceCounts[task.id] && practiceCounts[task.id] > 0 ? `演習済（${practiceCounts[task.id]}回）` : '未演習'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{task.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{task.timeLimit}分</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{task.wordCount ? `${task.wordCount.min}+語` : '100+語'}</span>
                    </div>
                  </div>
                  <Link href={`/toefl-tasks/${task.id}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105">
                      演習を開始
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 問題がない場合のメッセージ */}
        {tasks.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 text-gray-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">TOEFL Academic Discussion問題が見つかりません</h3>
            <p className="text-gray-500 mb-6">
              現在、TOEFL Academic Discussion専用の問題が利用できません。管理者にお問い合わせください。
            </p>
            <Link href="/toefl-dashboard">
              <Button variant="outline">ダッシュボードに戻る</Button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

