"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Essay, Task } from "@/lib/types";
import { LogOut, FileText, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTasks } from "@/lib/firebase";

type TabType = 'all' | 'unread' | 'read';

type FirestoreTimestampLike = {
  toDate: () => Date;
};

const getSubmittedAtTime = (value: unknown): number => {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as FirestoreTimestampLike).toDate === 'function') {
    return (value as FirestoreTimestampLike).toDate().getTime();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return new Date(value).getTime();
  }
  return 0;
};

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
    } catch {
      alert('繝ｭ繧ｰ繧｢繧ｦ繝医↓螟ｱ謨励＠縺ｾ縺励◆');
    }
    setLogoutDialogOpen(false);
  };

  // 繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ縺輔ｌ縺溘お繝・そ繧､繧貞叙蠕・
  const getFilteredEssays = () => {
    let filteredEssays: Essay[];
    
    switch (activeTab) {
      case 'unread':
        filteredEssays = essays.filter(essay => 
          (essay.status === 'completed' || essay.status === 'feedback_completed') && 
          essay.feedback && 
          !essay.feedbackRead
        );
        // 譛ｪ隱ｭ縺ｮ蝣ｴ蜷医・蜿､縺・・↓繧ｽ繝ｼ繝・
        return filteredEssays.sort((a, b) => {
          return getSubmittedAtTime(a.submittedAt) - getSubmittedAtTime(b.submittedAt);
        });
      case 'read':
        filteredEssays = essays.filter(essay => 
          (essay.status === 'completed' || essay.status === 'feedback_completed') && 
          essay.feedback && 
          essay.feedbackRead
        );
        // 譌｢隱ｭ縺ｮ蝣ｴ蜷医・譁ｰ縺励＞鬆・↓繧ｽ繝ｼ繝茨ｼ医ョ繝輔か繝ｫ繝茨ｼ・
        return filteredEssays;
      default:
        // All縺ｮ蝣ｴ蜷医・譁ｰ縺励＞鬆・↓繧ｽ繝ｼ繝茨ｼ医ョ繝輔か繝ｫ繝茨ｼ・
        return essays;
    }
  };

  // 蜷・ち繝悶・繧ｨ繝・そ繧､謨ｰ繧貞叙蠕・
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

        // TOEFL縺ｮ繧ｨ繝・そ繧､縺ｮ縺ｿ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
        const toeflEssays = [];
        
        for (const essay of essayList) {
          if (essay.taskId) {
            try {
              // 繧ｿ繧ｹ繧ｯ諠・ｱ繧貞叙蠕・
              const taskDoc = await getDoc(doc(db, 'tasks', essay.taskId));
              if (taskDoc.exists()) {
                const taskData = taskDoc.data() as Task;
                // TOEFL繧ｿ繧ｹ繧ｯ縺ｮ譚｡莉ｶ: type縺・integrated"縺ｾ縺溘・"independent"縺ｧ縲！ELTS逕ｨ縺ｮtaskType繝輔ぅ繝ｼ繝ｫ繝峨′縺ｪ縺・
                if (taskData.type && (taskData.type === 'integrated' || taskData.type === 'independent') && !taskData.taskType) {
                  toeflEssays.push(essay);
                }
              }
            } catch (error) {
              console.log(`繧ｿ繧ｹ繧ｯ ${essay.taskId} 縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:`, error);
              // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・繝・ヵ繧ｩ繝ｫ繝医〒TOEFL縺ｨ縺励※謇ｱ縺・
              toeflEssays.push(essay);
            }
          } else {
            // taskId縺後↑縺・ｴ蜷医・繝・ヵ繧ｩ繝ｫ繝医〒TOEFL縺ｨ縺励※謇ｱ縺・
            toeflEssays.push(essay);
          }
        }

        // 譛ｪ隱ｭ縺ｮ繧ｨ繝・そ繧､繧貞━蜈育噪縺ｫ陦ｨ遉ｺ縺吶ｋ繧医≧縺ｫ繧ｽ繝ｼ繝・
        const sortedEssays = toeflEssays.sort((a, b) => {
          // 繝輔ぅ繝ｼ繝峨ヰ繝・け縺悟ｮ御ｺ・＠縺ｦ縺・ｋ繧ｨ繝・そ繧､縺ｮ縺ｿ繧貞ｯｾ雎｡
          const aHasFeedback = (a.status === 'completed' || a.status === 'feedback_completed') && a.feedback;
          const bHasFeedback = (b.status === 'completed' || b.status === 'feedback_completed') && b.feedback;
          
          // 荳｡譁ｹ縺ｨ繧ゅヵ繧｣繝ｼ繝峨ヰ繝・け縺後≠繧句ｴ蜷医∵悴隱ｭ繧貞━蜈・
          if (aHasFeedback && bHasFeedback) {
            const aUnread = !a.feedbackRead;
            const bUnread = !b.feedbackRead;
            if (aUnread && !bUnread) return -1;
            if (!aUnread && bUnread) return 1;
          }
          
          // 縺昴ｌ莉･螟悶・謠仙・譌･譎る・ｼ域眠縺励＞鬆・ｼ・
          return 0;
        });

        setEssays(sortedEssays);
        const allTasks = await getTasks();
        // TOEFL縺ｮ繧ｿ繧ｹ繧ｯ縺ｮ縺ｿ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
        const toeflTasks = allTasks.filter(task => 
          task.type && (task.type === 'integrated' || task.type === 'independent') && !task.taskType
        );
        setTasks(toeflTasks);
      } catch (error) {
        console.error("Error loading essays:", error);
        setError("繧ｨ繝・そ繧､縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・");
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
  const { unreadCount } = getTabCounts();

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-8 py-2">
        <div className="flex items-center justify-between mb-2 h-16">
          <h1 className="text-2xl font-bold text-gray-900 m-0 p-0">Essay History</h1>
          <div className="flex items-center gap-4 m-0 p-0">
            <Link href="/tasks">
              <Button>
                <FileText className="w-4 h-4 mr-2" /> 貍皮ｿ偵ｒ蟋九ａ繧・
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" /> 繝繝・す繝･繝懊・繝峨ｒ髢九￥
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
              <LogOut className="w-4 h-4 mr-2" /> 繝ｭ繧ｰ繧｢繧ｦ繝・
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>繝ｭ繧ｰ繧｢繧ｦ繝医・遒ｺ隱・</DialogTitle>
            <DialogDescription>
              繝ｭ繧ｰ繧｢繧ｦ繝医＠縺ｦ繧ゅｈ繧阪＠縺・〒縺吶°・・
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              繧ｭ繝｣繝ｳ繧ｻ繝ｫ
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              繝ｭ繧ｰ繧｢繧ｦ繝・
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* 繧ｿ繧､繝医Ν縺ｨ繧ｿ繝悶リ繝薙ご繝ｼ繧ｷ繝ｧ繝ｳ - 蜷後§陦後↓驟咲ｽｮ */}
          <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                竊・TOEFL繝繝・す繝･繝懊・繝峨↓謌ｻ繧・
              </Button>
            </Link>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">TOEFL繧ｨ繝・そ繧､螻･豁ｴ</h1>
                <p className="text-gray-600">縺薙ｌ縺ｾ縺ｧ縺ｫ謠仙・縺励◆繧ｨ繝・そ繧､縺ｮ荳隕ｧ縺ｧ縺・</p>
              </div>
            </div>
            
            {/* 繧ｿ繝悶リ繝薙ご繝ｼ繧ｷ繝ｧ繝ｳ - 蜿ｳ荳企・鄂ｮ */}
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
                <span>譛ｪ隱ｭ</span>
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
                <span>譌｢隱ｭ</span>
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
                    <p className="text-gray-600 mb-4">縺ｾ縺繧ｨ繝・そ繧､繧呈署蜃ｺ縺励※縺・∪縺帙ｓ縲・</p>
                    <Link href="/tasks">
                      <Button>譁ｰ縺励＞繧ｨ繝・そ繧､繧呈嶌縺・</Button>
                    </Link>
                  </>
                ) : activeTab === 'unread' ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">譛ｪ隱ｭ縺ｮ繝輔ぅ繝ｼ繝峨ヰ繝・け縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・</p>
                    <p className="text-sm text-gray-500">縺吶∋縺ｦ縺ｮ繝輔ぅ繝ｼ繝峨ヰ繝・け繧堤｢ｺ隱肴ｸ医∩縺ｧ縺吶・</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">譌｢隱ｭ縺ｮ繝輔ぅ繝ｼ繝峨ヰ繝・け縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・</p>
                    <p className="text-sm text-gray-500">繝輔ぅ繝ｼ繝峨ヰ繝・け繧堤｢ｺ隱阪☆繧九→縺薙％縺ｫ陦ｨ遉ｺ縺輔ｌ縺ｾ縺吶・</p>
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
                       essay.status === 'processing' ? 'AI豺ｻ蜑贋ｸｭ' :
                       essay.status === 'error' ? '繧ｨ繝ｩ繝ｼ' :
                       '隧穂ｾ｡荳ｭ'}
                    </span>
                    <CardHeader className="pb-2 flex flex-col items-start justify-between gap-2">
                      <CardTitle className="text-lg font-semibold text-gray-900 truncate w-full mb-1">
                        {task ? task.title : '繧ｿ繧､繝医Ν荳肴・縺ｮ繧ｿ繧ｹ繧ｯ'}
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
                            const val = essay.submittedAt as unknown;
                            let dateObj: Date | null = null;
                            if (val && typeof val === 'object' && 'toDate' in val && typeof (val as FirestoreTimestampLike).toDate === 'function') {
                              dateObj = (val as FirestoreTimestampLike).toDate();
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
                              : '荳肴・';
                          })()}
                        </span>
                        <div className="flex items-center gap-2">
                          {(essay.status === 'completed' || essay.status === 'feedback_completed') && essay.feedback && (
                            <>
                              {essay.feedbackRead ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>譌｢隱ｭ</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>譛ｪ隱ｭ</span>
                                </div>
                              )}
                            </>
                          )}
                          <Link href={`/dashboard/essays/${essay.id}`}>
                            <Button variant="outline" size="sm" className="group-hover:border-indigo-500 group-hover:text-indigo-700">
                              隧ｳ邏ｰ繧定ｦ九ｋ
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


