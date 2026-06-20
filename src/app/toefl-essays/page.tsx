"use client"

import { useEffect, useState } from "react"
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, query, orderBy, getDocs, doc, getDoc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, MessageSquare, FileText, MessageCircle, LogOut, Eye, Clock, BookOpen } from "lucide-react";
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NotificationToast from '@/components/NotificationToast';

type EssayWithScores = {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  submittedAt: string;
  score: number;
  topicDevelopmentScore: number;
  languageUseScore: number;
  organizationScore: number;
  developmentScore: number;
  wordCount: number;
  timeSpent: number;
  status: 'pending' | 'processing' | 'completed' | 'feedback_completed' | 'error';
  feedbackRead?: boolean;
  taskType?: string;
  feedback?: {
    overall?: string;
    strengths?: string[];
    improvements?: string[];
    detailedScores?: {
      topicDevelopment?: number;
      languageUse?: number;
      organization?: number;
      development?: number;
    };
  };
};

export default function TOEFLEssaysPage() {
  const { user, logout } = useAuth();
  const { 
    isNotificationVisible, 
    notificationEssayId, 
    notificationTaskTitle,
    hideFeedbackNotification 
  } = useNotification();
  const router = useRouter();
  const [essays, setEssays] = useState<EssayWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskTitles, setTaskTitles] = useState<{[key: string]: string}>({});
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const essayList = await fetchEssays();
        setEssays(essayList);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchEssays = async () => {
      const essaysRef = collection(db, 'users', user!.uid, 'essays');
      
      try {
        // 全エッセイを取得
        const q = query(
          essaysRef,
          orderBy('submittedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const allEssays = processEssayData(querySnapshot);
        
        // TOEFL Academic Discussionの問題のみをフィルタリング
        const toeflEssays = [];
        const taskDataMap = new Map(); // タスク情報をキャッシュ
        const taskTitlesMap: {[key: string]: string} = {};
        
        for (const essay of allEssays) {
          if (essay.taskId) {
            try {
              // タスク情報を取得（キャッシュがあれば使用）
              let taskData;
              if (taskDataMap.has(essay.taskId)) {
                taskData = taskDataMap.get(essay.taskId);
              } else {
                const taskDoc = await getDoc(doc(db, 'tasks', essay.taskId));
                if (taskDoc.exists()) {
                  taskData = taskDoc.data();
                  taskDataMap.set(essay.taskId, taskData);
                }
              }
              
              if (taskData) {
                // TOEFL Academic Discussionタスクの条件: taskTypeフィールドが"academic_discussion"
                if (taskData.taskType === 'academic_discussion') {
                  toeflEssays.push(essay);
                  // タスクタイトルを保存
                  taskTitlesMap[essay.taskId] = taskData.title || 'Untitled Task';
                }
              }
            } catch (error) {
              console.log(`タスク ${essay.taskId} の取得に失敗しました:`, error);
            }
          }
        }
        
        // タスクタイトルを状態に保存
        setTaskTitles(taskTitlesMap);
        
        return toeflEssays;
      } catch (error) {
        console.error('エッセイの取得に失敗しました:', error);
        return [];
      }
    };

    const processEssayData = (querySnapshot: { docs: QueryDocumentSnapshot<DocumentData>[] }): EssayWithScores[] => {
      const essayList = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        // submittedAtの処理を安全に行う
        let submittedAt: string;
        if (data.submittedAt?.toDate) {
          submittedAt = data.submittedAt.toDate().toISOString();
        } else if (data.submittedAt instanceof Date) {
          submittedAt = data.submittedAt.toISOString();
        } else if (typeof data.submittedAt === 'string') {
          submittedAt = data.submittedAt;
        } else if (typeof data.submittedAt === 'number') {
          submittedAt = new Date(data.submittedAt).toISOString();
        } else {
          submittedAt = new Date().toISOString();
        }

        // フィードバックデータの処理
        const feedback = data.feedback || {};
        const detailedScores = feedback.detailedScores || {};
        
        // TOEFL Academic Discussion用のスコア計算
        const topicDevelopmentScore = detailedScores.topicDevelopment || 0;
        const languageUseScore = detailedScores.languageUse || 0;
        const organizationScore = detailedScores.organization || 0;
        const developmentScore = detailedScores.development || 0;
        
        const essayData = {
          id: doc.id,
          taskId: data.taskId || '',
          userId: user!.uid,
          content: data.content || '',
          submittedAt,
          score: data.score || 0,
          topicDevelopmentScore,
          languageUseScore,
          organizationScore,
          developmentScore,
          wordCount: data.wordCount || 0,
          timeSpent: data.timeSpent || 0,
          status: data.status || 'pending',
          feedbackRead: data.feedbackRead,
          feedback: data.feedback,
          taskType: data.taskType || 'academic_discussion'
        } as EssayWithScores;
        
        return essayData;
      });
      
      return essayList;
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      alert('ログアウトに失敗しました');
    }
    setLogoutDialogOpen(false);
  };

  const handleNotificationView = () => {
    if (notificationEssayId) {
      router.push(`/dashboard/essays/${notificationEssayId}`);
    }
    hideFeedbackNotification();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'feedback_completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
      case 'feedback_completed':
        return '完了';
      case 'processing':
        return 'AI添削中';
      case 'error':
        return 'エラー';
      default:
        return '待機中';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">データを読み込み中...</h1>
              <p className="text-gray-600">しばらくお待ちください。</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* ヘッダー部分 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/toefl-dashboard">
              <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                ダッシュボードに戻る
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">過去のエッセイ</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/toefl-tasks">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4 mr-2" /> 新しいエッセイを書く
              </Button>
            </Link>
            <Link href="/toefl-dashboard">
              <Button variant="outline">
                <MessageCircle className="w-4 h-4 mr-2" /> ダッシュボード
              </Button>
            </Link>
            {/* ログアウトボタン */}
            <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
              <LogOut className="w-4 h-4 mr-2" /> ログアウト
            </Button>
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

        {/* 通知トースト */}
        <NotificationToast
          essayId={notificationEssayId || ''}
          taskTitle={notificationTaskTitle || undefined}
          isVisible={isNotificationVisible}
          onClose={hideFeedbackNotification}
          onView={handleNotificationView}
        />

        {/* エッセイ一覧 */}
        <div className="space-y-6">
          {essays.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">エッセイがありません</h3>
                <p className="text-gray-500 mb-6">
                  TOEFL Academic Discussionのエッセイをまだ提出していません。
                </p>
                <Link href="/toefl-tasks">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <FileText className="w-4 h-4 mr-2" />
                    新しいエッセイを書く
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            essays.map((essay) => (
              <Card key={essay.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Academic Discussion
                        </Badge>
                        <Badge className={getStatusColor(essay.status)}>
                          {getStatusText(essay.status)}
                        </Badge>
                        {!essay.feedbackRead && essay.status === 'feedback_completed' && (
                          <Badge className="bg-red-100 text-red-800">
                            未読
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {taskTitles[essay.taskId] || '問題タイトル不明'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(essay.submittedAt).toLocaleDateString('ja-JP')} {new Date(essay.submittedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {essay.score !== undefined && essay.score !== null && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {essay.score.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-500">スコア</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BookOpen className="w-4 h-4" />
                      <span>{essay.wordCount}語</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{Math.floor(essay.timeSpent / 60)}分{essay.timeSpent % 60}秒</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 line-clamp-3">
                      {essay.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {essay.status === 'feedback_completed' && (
                        <Link href={`/academic-discussion-essays/${essay.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            フィードバックを見る
                          </Button>
                        </Link>
                      )}
                      {essay.status === 'processing' && (
                        <Button variant="outline" size="sm" disabled>
                          <Clock className="w-4 h-4 mr-2" />
                          AI添削中...
                        </Button>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {essay.id.substring(0, 8)}...
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

