"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Essay, Task } from "@/lib/types";
import { LogOut, FileText, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTasks } from "@/lib/firebase";

type TabType = 'all' | 'unread' | 'read';

export default function EssaysPage() {
  const { user, logout } = useAuth();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (e) {
      alert('ログアウトに失敗しました');
    }
    setLogoutDialogOpen(false);
  };

  // フィルタリングされたエッセイを取得
  const getFilteredEssays = () => {
    let filteredEssays: Essay[];
    
    switch (activeTab) {
      case 'unread':
        filteredEssays = essays.filter(essay => 
          (essay.status === 'completed' || essay.status === 'feedback_completed') && 
          essay.feedback && 
          !essay.feedbackRead
        );
        // 未読の場合は古い順にソート
        return filteredEssays.sort((a, b) => {
          const aDate = a.submittedAt as any;
          const bDate = b.submittedAt as any;
          
          let aTime: number, bTime: number;
          
          if (aDate && typeof aDate === 'object' && typeof aDate.toDate === 'function') {
            aTime = aDate.toDate().getTime();
          } else if (aDate instanceof Date) {
            aTime = aDate.getTime();
          } else if (typeof aDate === 'number') {
            aTime = aDate;
          } else if (typeof aDate === 'string') {
            aTime = new Date(aDate).getTime();
          } else {
            aTime = 0;
          }
          
          if (bDate && typeof bDate === 'object' && typeof bDate.toDate === 'function') {
            bTime = bDate.toDate().getTime();
          } else if (bDate instanceof Date) {
            bTime = bDate.getTime();
          } else if (typeof bDate === 'number') {
            bTime = bDate;
          } else if (typeof bDate === 'string') {
            bTime = new Date(bDate).getTime();
          } else {
            bTime = 0;
          }
          
          return aTime - bTime; // 古い順（昇順）
        });
      case 'read':
        filteredEssays = essays.filter(essay => 
          (essay.status === 'completed' || essay.status === 'feedback_completed') && 
          essay.feedback && 
          essay.feedbackRead
        );
        // 既読の場合は新しい順にソート（デフォルト）
        return filteredEssays;
      default:
        // Allの場合は新しい順にソート（デフォルト）
        return essays;
    }
  };

  // 各タブのエッセイ数を取得
  const getTabCounts = () => {
    const allCount = essays.length;
    const unreadCount = essays.filter(essay => 
      (essay.status === 'completed' || essay.status === 'feedback_completed') && 
      essay.feedback && 
      !essay.feedbackRead
    ).length;
    const readCount = essays.filter(essay => 
      (essay.status === 'completed' || essay.status === 'feedback_completed') && 
      essay.feedback && 
      essay.feedbackRead
    ).length;

    return { allCount, unreadCount, readCount };
  };

  useEffect(() => {
    const loadEssays = async () => {
      if (!user) return;

      try {
        setError(null);
        const userDocRef = doc(db, 'users', user.uid);
        const essaysRef = collection(userDocRef, 'essays');
        const q = query(
          essaysRef,
          orderBy('submittedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const essayList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Essay[];

        // TOEFLのエッセイのみをフィルタリング
        const toeflEssays = [];
        
        for (const essay of essayList) {
          if (essay.taskId) {
            try {
              // タスク情報を取得
              const taskDoc = await getDoc(doc(db, 'tasks', essay.taskId));
              if (taskDoc.exists()) {
                const taskData = taskDoc.data() as Task;
                // TOEFLタスクの条件: typeが"integrated"または"independent"で、IELTS用のtaskTypeフィールドがない
                if (taskData.type && (taskData.type === 'integrated' || taskData.type === 'independent') && !taskData.taskType) {
                  toeflEssays.push(essay);
                }
              }
            } catch (error) {
              console.log(`タスク ${essay.taskId} の取得に失敗しました:`, error);
              // エラーの場合はデフォルトでTOEFLとして扱う
              toeflEssays.push(essay);
            }
          } else {
            // taskIdがない場合はデフォルトでTOEFLとして扱う
            toeflEssays.push(essay);
          }
        }

        // 未読のエッセイを優先的に表示するようにソート
        const sortedEssays = toeflEssays.sort((a, b) => {
          // フィードバックが完了しているエッセイのみを対象
          const aHasFeedback = (a.status === 'completed' || a.status === 'feedback_completed') && a.feedback;
          const bHasFeedback = (b.status === 'completed' || b.status === 'feedback_completed') && b.feedback;
          
          // 両方ともフィードバックがある場合、未読を優先
          if (aHasFeedback && bHasFeedback) {
            const aUnread = !a.feedbackRead;
            const bUnread = !b.feedbackRead;
            if (aUnread && !bUnread) return -1;
            if (!aUnread && bUnread) return 1;
          }
          
          // それ以外は提出日時順（新しい順）
          return 0;
        });

        setEssays(sortedEssays);
        const allTasks = await getTasks();
        // TOEFLのタスクのみをフィルタリング
        const toeflTasks = allTasks.filter(task => 
          task.type && (task.type === 'integrated' || task.type === 'independent') && !task.taskType
        );
        setTasks(toeflTasks);
      } catch (error: any) {
        console.error("Error loading essays:", error);
        setError("エッセイの読み込み中にエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };

    loadEssays();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredEssays = getFilteredEssays();
  const { allCount, unreadCount, readCount } = getTabCounts();

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-8 py-2">
        <div className="flex items-center justify-between mb-2 h-16">
          <h1 className="text-2xl font-bold text-gray-900 m-0 p-0">Essay History</h1>
          <div className="flex items-center gap-4 m-0 p-0">
            <Link href="/tasks">
              <Button>
                <FileText className="w-4 h-4 mr-2" /> 演習を始める
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" /> ダッシュボードを開く
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
              <LogOut className="w-4 h-4 mr-2" /> ログアウト
            </Button>
          </div>
        </div>
      </div>
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
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* タイトルとタブナビゲーション - 同じ行に配置 */}
          <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                ← TOEFLダッシュボードに戻る
              </Button>
            </Link>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">TOEFLエッセイ履歴</h1>
                <p className="text-gray-600">これまでに提出したエッセイの一覧です</p>
              </div>
            </div>
            
            {/* タブナビゲーション - 右上配置 */}
            <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'all'
                    ? 'bg-gray-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span>All</span>
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'unread'
                    ? 'bg-gray-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>未読</span>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('read')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'read'
                    ? 'bg-gray-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>既読</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {filteredEssays.length === 0 ? (
            <Card className="mx-auto max-w-md shadow-md border-0">
              <CardContent className="p-8 text-center">
                {activeTab === 'all' ? (
                  <>
                    <p className="text-gray-600 mb-4">まだエッセイを提出していません。</p>
                    <Link href="/tasks">
                      <Button>新しいエッセイを書く</Button>
                    </Link>
                  </>
                ) : activeTab === 'unread' ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">未読のフィードバックはありません。</p>
                    <p className="text-sm text-gray-500">すべてのフィードバックを確認済みです。</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">既読のフィードバックはありません。</p>
                    <p className="text-sm text-gray-500">フィードバックを確認するとここに表示されます。</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {filteredEssays.map((essay) => {
                const task = tasks.find((t) => t.id === essay.taskId);
                const taskIndex = tasks.findIndex((t) => t.id === essay.taskId);
                return (
                  <Card
                    key={essay.id}
                    className={`relative rounded-2xl shadow-lg hover:shadow-xl transition-shadow group bg-white flex flex-col justify-between h-full
                      ${(essay.status === 'completed' || essay.status === 'feedback_completed') && essay.feedback && !essay.feedbackRead 
                        ? 'border-2 border-red-300' 
                        : 'border-0'
                      }
                    `}
                  >
                    <span
                      className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold z-10
                        ${essay.score ? 'bg-indigo-100 text-indigo-700' : 
                          essay.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          essay.status === 'error' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-500'}
                      `}
                    >
                      {essay.score ? `${essay.score}/30` : 
                       essay.status === 'processing' ? 'AI添削中' :
                       essay.status === 'error' ? 'エラー' :
                       '評価中'}
                    </span>
                    <CardHeader className="pb-2 flex flex-col items-start justify-between gap-2">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate w-full mb-1">
                        {task ? task.title : 'タイトル不明のタスク'}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          {taskIndex !== -1 ? `No. ${taskIndex + 1}` : 'No. ?'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {task ? (task.type === 'integrated' ? 'Integrated Task' : 'Independent Task') : 'Task Type'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4 flex-1 flex flex-col justify-between">
                      <div className="mb-4 min-h-[48px]">
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {essay.content}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs text-gray-400">
                          {(() => {
                            const val = essay.submittedAt as any;
                            let dateObj: Date | null = null;
                            if (val && typeof val === 'object' && typeof val.toDate === 'function') {
                              dateObj = val.toDate();
                            } else if (val instanceof Date) {
                              dateObj = val;
                            } else if (typeof val === 'number') {
                              dateObj = new Date(val);
                            } else if (typeof val === 'string') {
                              const parsed = new Date(val);
                              if (!isNaN(parsed.getTime())) dateObj = parsed;
                            }
                            return dateObj
                              ? dateObj.toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '不明';
                          })()}
                        </span>
                        <div className="flex items-center gap-2">
                          {(essay.status === 'completed' || essay.status === 'feedback_completed') && essay.feedback && (
                            <>
                              {essay.feedbackRead ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>既読</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>未読</span>
                                </div>
                              )}
                            </>
                          )}
                          <Link href={`/dashboard/essays/${essay.id}`}>
                            <Button variant="outline" size="sm" className="group-hover:border-indigo-500 group-hover:text-indigo-700">
                              詳細を見る
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 