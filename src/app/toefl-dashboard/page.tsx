"use client"

import { useEffect, useState } from "react"
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { collection, query, where, orderBy, getDocs, doc, getDoc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getThisMonthVocabularyCount } from "@/lib/firebase";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData
} from 'chart.js';
import { TrendingUp, BookOpen, Clock, FileText, MessageCircle, MessageSquare, LogOut, Target, Calendar, CheckCircle, AlertCircle, Settings, List } from 'lucide-react';
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
import { isAdmin } from '@/lib/utils';

// Chart.jsの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type ScoreType = 'total' | 'topic_development' | 'language_use' | 'organization' | 'development';

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
    overall: string;
    strengths: string[];
    improvements: string[];
    detailedScores: {
      topicDevelopment: number;
      languageUse: number;
      organization: number;
      development: number;
    };
    topicDevelopment: {
      goodPoints: string[];
      improvements: string[];
    };
    languageUse: {
      goodPoints: string[];
      improvements: string[];
    };
    organization: {
      goodPoints: string[];
      improvements: string[];
    };
    development: {
      goodPoints: string[];
      improvements: string[];
    };
    specificSuggestions: {
      suggestions: string[];
    };
    grammarCorrections: {
      corrections: Array<{
        original: string;
        corrected: string;
        explanation: string;
        context: string;
        startIndex: number;
        endIndex: number;
      }>;
    };
  };
};

export default function TOEFLDashboardPage() {
  const { user, logout } = useAuth();
  const { 
    unreadFeedbackCount, 
    isNotificationVisible, 
    notificationEssayId, 
    notificationTaskTitle,
    hideFeedbackNotification,
    notificationEssayType 
  } = useNotification();
  const router = useRouter();
  const [essays, setEssays] = useState<EssayWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScoreType, setSelectedScoreType] = useState<ScoreType>('total');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [thisMonthVocabularyCount, setThisMonthVocabularyCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // エッセイと単語数を並行して取得
        const [essayList, vocabularyCount] = await Promise.all([
          fetchEssays(),
          getThisMonthVocabularyCount(user.uid)
        ]);
        
        setEssays(essayList);
        setThisMonthVocabularyCount(vocabularyCount);
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
                }
              }
            } catch (error) {
              console.log(`タスク ${essay.taskId} の取得に失敗しました:`, error);
            }
          }
        }
        
        return toeflEssays;
      } catch (error) {
        console.error('エッセイの取得に失敗しました:', error);
        return [];
      }
    };

    const processEssayData = (querySnapshot: any): EssayWithScores[] => {
      const essayList = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        // submittedAtの処理を安全に行う
        let submittedAt: string;
        if (data.submittedAt?.toDate) {
          // Firestoreのタイムスタンプの場合
          submittedAt = data.submittedAt.toDate().toISOString();
        } else if (data.submittedAt instanceof Date) {
          // Dateオブジェクトの場合
          submittedAt = data.submittedAt.toISOString();
        } else if (typeof data.submittedAt === 'string') {
          // 既に文字列の場合
          submittedAt = data.submittedAt;
        } else if (typeof data.submittedAt === 'number') {
          // タイムスタンプの場合
          submittedAt = new Date(data.submittedAt).toISOString();
        } else {
          // デフォルト値
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

  // 平均点の算出
  const averageScore = essays.length > 0
    ? Math.round(essays.reduce((sum, e) => sum + (e.score || 0), 0) / essays.length * 10) / 10
    : 0;
  const totalAttempts = essays.length;
  const bestScore = essays.length > 0
    ? Math.round(Math.max(...essays.map((e) => e.score || 0)) * 2) / 2
    : 0;

  // スコア推移グラフのデータを準備
  const getScoreData = (type: ScoreType) => {
    const scoreData = essays
      .slice()
      .reverse()
      .map(essay => {
        let score = 0;
        switch (type) {
          case 'topic_development':
            score = essay.topicDevelopmentScore || 0;
            break;
          case 'language_use':
            score = essay.languageUseScore || 0;
            break;
          case 'organization':
            score = essay.organizationScore || 0;
            break;
          case 'development':
            score = essay.developmentScore || 0;
            break;
          default:
            score = essay.score || 0;
            break;
        }
        return score;
      });
    
    return scoreData;
  };

  const getScoreLabel = (type: ScoreType) => {
    switch (type) {
      case 'topic_development':
        return 'Topic Development';
      case 'language_use':
        return 'Language Use';
      case 'organization':
        return 'Organization';
      case 'development':
        return 'Development';
      default:
        return '総合スコア';
    }
  };

  const chartData: ChartData<'line'> = {
    labels: essays
      .slice()
      .reverse()
      .map(essay => new Date(essay.submittedAt).toLocaleDateString('ja-JP')),
    datasets: [
      {
        label: getScoreLabel(selectedScoreType),
        data: getScoreData(selectedScoreType),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        padding: 12,
        callbacks: {
          label: function(context: any) {
            return `${getScoreLabel(selectedScoreType)}: ${context.parsed.y}点`;
          }
        }
      },
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          }
        }
      },
      y: {
        min: 0,
        max: selectedScoreType === 'total' ? 30 : 5,
        ticks: {
          stepSize: selectedScoreType === 'total' ? 5 : 0.5,
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  // Academic Discussion（このページで取得したもの）に限定した未読数
  const toeflUnreadCount = essays.filter(essay =>
    (essay.status === 'completed' || essay.status === 'feedback_completed') &&
    essay.feedback &&
    !essay.feedbackRead
  ).length;

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (e) {
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
            <Link href="/training-selection">
              <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                ← トレーニング選択に戻る
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Academic Discussion</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/toefl-tasks">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4 mr-2" /> 演習を始める
              </Button>
            </Link>
            <Link href="/toefl-essays">
              <Button variant="outline" className="relative">
                <MessageSquare className="w-4 h-4 mr-2" /> 
                過去のエッセイ
                {toeflUnreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {toeflUnreadCount}
                  </span>
                )}
              </Button>
            </Link>
            {/* 管理者のみ表示されるadmin dashboardへのリンク */}
            {user && isAdmin(user.email) && (
              <Link href="/admin/dashboard">
                <Button variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200">
                  <Settings className="w-4 h-4 mr-2" />
                  管理者ダッシュボード
                </Button>
              </Link>
            )}
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
          essayType={notificationEssayType || undefined}
        />

        <div className="max-w-7xl mx-auto">
          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総演習回数</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAttempts}</div>
                <p className="text-xs text-muted-foreground">
                  これまでに提出したエッセイの数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均スコア</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageScore}</div>
                <p className="text-xs text-muted-foreground">
                  Academic Discussionエッセイの平均スコア
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">最高スコア</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bestScore}</div>
                <p className="text-xs text-muted-foreground">
                  これまでの最高スコア
                </p>
              </CardContent>
            </Card>

            <Card className="hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-transparent hover:border-blue-200 bg-gradient-to-br from-white to-blue-50/30" onClick={() => router.push('/vocabularylist')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">単語リスト</CardTitle>
                <List className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{thisMonthVocabularyCount}</div>
                <p className="text-xs text-muted-foreground">
                  今月追加された単語・フレーズ
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                  <span>詳細を見る</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* スコア推移チャート */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>スコア推移</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedScoreType('total')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'total'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    総合
                  </button>
                  <button
                    onClick={() => setSelectedScoreType('topic_development')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'topic_development'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Topic Development
                  </button>
                  <button
                    onClick={() => setSelectedScoreType('language_use')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'language_use'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Language Use
                  </button>
                  <button
                    onClick={() => setSelectedScoreType('organization')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'organization'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Organization
                  </button>
                  <button
                    onClick={() => setSelectedScoreType('development')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'development'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Development
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : essays.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Academic Discussionのエッセイが提出されていません。
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    新しいエッセイを書いてみてください。
                  </p>
                  <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Link href="/toefl-tasks">新しいエッセイを書く</Link>
                  </Button>
                </div>
              ) : (
                <div className="h-[400px]">
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 未確認のフィードバック */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>未確認のフィードバック</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : essays.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Academic Discussionのエッセイが提出されていません。
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    新しいエッセイを書いてみてください。
                  </p>
                  <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Link href="/toefl-tasks">新しいエッセイを書く</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {essays
                    .filter(essay => 
                      (essay.status === 'completed' || essay.status === 'feedback_completed') && 
                      essay.feedback && 
                      !essay.feedbackRead
                    )
                    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
                    .slice(0, 5)
                    .map((essay) => (
                    <div
                      key={essay.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {new Date(essay.submittedAt).toLocaleDateString('ja-JP')} {new Date(essay.submittedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            スコア: {essay.score !== undefined && essay.score !== null ? 
                              essay.score.toFixed(1) : 
                              essay.status === 'processing' ? 'AI添削中' :
                              essay.status === 'error' ? 'エラー' :
                              '評価中'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 未読バッジのみ表示 */}
                          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            <span>未読</span>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/essays/${essay.id}`}>詳細を見る</Link>
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {essay.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* 未読のフィードバックがない場合のメッセージ */}
                  {essays.filter(essay => 
                    (essay.status === 'completed' || essay.status === 'feedback_completed') && 
                    essay.feedback && 
                    !essay.feedbackRead
                  ).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">未確認のフィードバックはありません。</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
