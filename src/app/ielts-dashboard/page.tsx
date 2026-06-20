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
import { TrendingUp, BookOpen, Clock, FileText, BarChart2, MessageSquare, LogOut, Target, Calendar, CheckCircle, AlertCircle, Settings, List } from 'lucide-react';
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

type ScoreType = 'total' | 'task_achievement' | 'coherence_cohesion' | 'lexical_resource' | 'grammatical_range';

type EssayWithScores = {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  submittedAt: string;
  score: number;
  taskAchievementScore: number; // Task1: taskAchievement, Task2: taskResponse
  coherenceCohesionScore: number;
  lexicalResourceScore: number;
  grammaticalRangeScore: number;
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
      taskAchievement: number; // Task1用
      taskResponse: number;    // Task2用
      coherenceCohesion: number;
      lexicalResource: number;
      grammaticalRange: number;
    };
    taskResponse: {
      goodPoints: string[];
      improvements: string[];
    };
    generalDescription: {
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

export default function IELTSDashboardPage() {
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
  const [selectedTaskType, setSelectedTaskType] = useState<'task1' | 'task2'>('task1');
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
        
        // IELTSの問題のみをフィルタリング（taskIdを使ってタスク情報を確認）
        const ieltsEssays = [];
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
                // IELTSタスクの条件: taskTypeフィールドが"task1"または"task2"
                if (taskData.taskType === 'task1' || taskData.taskType === 'task2') {
                  // タスク情報からtaskTypeを更新
                  essay.taskType = taskData.taskType;
                  ieltsEssays.push(essay);
                }
              }
            } catch (error) {
              console.log(`タスク ${essay.taskId} の取得に失敗しました:`, error);
              // エラーの場合は既存のtaskTypeフィールドで判断
              if (essay.taskType === 'ielts') {
                ieltsEssays.push(essay);
              }
            }
          } else {
            // taskIdがない場合は既存のtaskTypeフィールドで判断
            if (essay.taskType === 'ielts') {
              ieltsEssays.push(essay);
            }
          }
        }
        
        return ieltsEssays;
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
        
        console.log(`Raw data for essay ${doc.id}:`, {
          taskType: data.taskType,
          feedback: data.feedback,
          detailedScores: data.feedback?.detailedScores,
          score: data.score,
          fullData: data
        });

        // タスクタイプを取得して適切なスコアを選択
        let taskType = data.taskType;
        
        // タスクタイプが設定されていない場合、利用可能なスコアから推測
        if (!taskType) {
          console.log(`Task type not found for essay ${doc.id}, attempting to infer from available scores`);
          if (detailedScores.taskAchievement !== undefined) {
            taskType = 'task1';
            console.log(`Inferred task type as 'task1' based on available scores`);
          } else if (detailedScores.taskResponse !== undefined) {
            taskType = 'task2';
            console.log(`Inferred task type as 'task2' based on available scores`);
          } else {
            // デフォルトはtask2
            taskType = 'task2';
            console.log(`Using default task type 'task2'`);
          }
        }
        
        // 最終的なタスクタイプの確認
        console.log(`Final task type for essay ${doc.id}:`, taskType);
        
        // スコア計算の詳細ログ
        // Task1: taskAchievement, Task2: taskResponse を使用
        const taskAchievementScore = taskType === 'task1' 
          ? (detailedScores.taskAchievement || 0) 
          : (detailedScores.taskResponse || 0);
        const coherenceCohesionScore = detailedScores.coherenceCohesion || 0;
        const lexicalResourceScore = detailedScores.lexicalResource || 0;
        const grammaticalRangeScore = detailedScores.grammaticalRange || 0;
        
        console.log(`Score calculation for essay ${doc.id}:`, {
          taskType,
          detailedScores,
          taskAchievementScore,
          coherenceCohesionScore,
          lexicalResourceScore,
          grammaticalRangeScore,
          calculation: {
            task1: detailedScores.taskAchievement,
            task2: detailedScores.taskResponse,
            selected: taskType === 'task1' ? 'taskAchievement' : 'taskResponse'
          }
        });
        
        const essayData = {
          id: doc.id,
          taskId: data.taskId || '',
          userId: user!.uid,
          content: data.content || '',
          submittedAt,
          score: data.score || 0,
          taskAchievementScore,
          coherenceCohesionScore,
          lexicalResourceScore,
          grammaticalRangeScore,
          wordCount: data.wordCount || 0,
          timeSpent: data.timeSpent || 0,
          status: data.status || 'pending',
          feedbackRead: data.feedbackRead,
          feedback: data.feedback,
          taskType: data.taskType || 'ielts' // 既存データの互換性のため
        } as EssayWithScores;
        
        console.log(`Essay ${doc.id} data:`, {
          taskType,
          detailedScores,
          taskAchievementScore: essayData.taskAchievementScore,
          coherenceCohesionScore: essayData.coherenceCohesionScore,
          lexicalResourceScore: essayData.lexicalResourceScore,
          grammaticalRangeScore: essayData.grammaticalRangeScore,
          rawFeedback: data.feedback,
          rawDetailedScores: data.feedback?.detailedScores
        });
        
        return essayData;
      });
      
      return essayList;
    };

    fetchData();
  }, [user]);

  // 平均点の算出方法を修正 - 既存の総合スコア（overall）を使用
  const averageScore = essays.length > 0
    ? Math.round(essays.reduce((sum, e) => sum + (e.score || 0), 0) / essays.length * 10) / 10 // 小数点第1位まで表示
    : 0;
  const totalAttempts = essays.length;
  // 最高スコアの算出方法も修正 - 既存の総合スコア（overall）を使用
  const bestScore = essays.length > 0
    ? Math.round(Math.max(...essays.map((e) => e.score || 0)) * 2) / 2 // 0.5刻みに丸める
    : 0;

  // 選択されたタスクタイプに基づいてエッセイをフィルタリング
  const filteredEssays = essays.filter(essay => {
    // essay.taskTypeフィールドを優先的に使用
    if (essay.taskType === 'task1' || essay.taskType === 'task2') {
      return essay.taskType === selectedTaskType;
    }
    
    // 既存データの互換性のため、taskTypeが'ielts'の場合はtask2として扱う
    if (essay.taskType === 'ielts') {
      return selectedTaskType === 'task2';
    }
    
    // デフォルトはTask2として扱う
    return selectedTaskType === 'task2';
  });

  // フィルタリングされたエッセイに基づいて統計を再計算
  // 既存の総合スコア（overall）を使用 - 4つの観点の平均点から0.5刻みに修正済み
  const filteredAverageScore = filteredEssays.length > 0
    ? Math.round(filteredEssays.reduce((sum, e) => sum + (e.score || 0), 0) / filteredEssays.length * 10) / 10
    : 0;
  
  const filteredTotalAttempts = filteredEssays.length;
  
  const filteredBestScore = filteredEssays.length > 0
    ? Math.round(Math.max(...filteredEssays.map((e) => e.score || 0)) * 2) / 2
    : 0;

  // スコア推移グラフのデータを準備
  const getScoreData = (type: ScoreType) => {
    console.log('Selected score type:', type);
    console.log('Filtered essays data:', filteredEssays);
    
    const scoreData = filteredEssays
      .slice()
      .reverse()
      .map(essay => {
        let score = 0;
        switch (type) {
          case 'task_achievement':
            // Task1: taskAchievement, Task2: taskResponse のスコアを使用
            score = essay.taskAchievementScore || 0;
            console.log(`Essay ${essay.id} - ${essay.taskType === 'task1' ? 'Task Achievement' : 'Task Response'} Score:`, score);
            break;
          case 'coherence_cohesion':
            score = essay.coherenceCohesionScore || 0;
            console.log(`Essay ${essay.id} - Coherence Cohesion Score:`, score);
            break;
          case 'lexical_resource':
            score = essay.lexicalResourceScore || 0;
            console.log(`Essay ${essay.id} - Lexical Resource Score:`, score);
            break;
          case 'grammatical_range':
            score = essay.grammaticalRangeScore || 0;
            console.log(`Essay ${essay.id} - Grammatical Range Score:`, score);
            break;
          default:
            score = essay.score || 0;
            console.log(`Essay ${essay.id} - Total Score:`, score);
            break;
        }
        return score;
      });
    
    console.log('Final score data:', scoreData);
    return scoreData;
  };

  const getScoreLabel = (type: ScoreType) => {
    switch (type) {
      case 'task_achievement':
        // 選択されたタスクタイプに応じてラベルを変更
        return selectedTaskType === 'task1' ? 'Task Achievement' : 'Task Response';
      case 'coherence_cohesion':
        return 'Coherence & Cohesion';
      case 'lexical_resource':
        return 'Lexical Resource';
      case 'grammatical_range':
        return 'Grammatical Range';
      default:
        return '総合スコア';
    }
  };

  const chartData: ChartData<'line'> = {
    labels: filteredEssays
      .slice()
      .reverse()
      .map(essay => new Date(essay.submittedAt).toLocaleDateString('ja-JP')),
    datasets: [
      {
        label: getScoreLabel(selectedScoreType),
        data: getScoreData(selectedScoreType),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(34, 197, 94)',
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
        max: selectedScoreType === 'total' ? 9 : 9,
        ticks: {
          stepSize: selectedScoreType === 'total' ? 1 : 0.5,
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

  // IELTSエッセイ（このページで取得したもの）に限定した未読数
  const ieltsUnreadCount = essays.filter(essay =>
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
      router.push(`/ielts-dashboard/essays/${notificationEssayId}`);
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
            <h1 className="text-3xl font-bold text-gray-900">IELTS Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/ielts-tasks">
              <Button className="bg-green-600 hover:bg-green-700">
                <FileText className="w-4 h-4 mr-2" /> 演習を始める
              </Button>
            </Link>
            <Link href="/ielts-essays">
              <Button variant="outline" className="relative">
                <MessageSquare className="w-4 h-4 mr-2" /> 
                過去のエッセイ
                {ieltsUnreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {ieltsUnreadCount}
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
          {/* Task1/Task2切り替えボタン */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedTaskType('task1')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTaskType === 'task1'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Task 1
              </button>
              <button
                onClick={() => setSelectedTaskType('task2')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTaskType === 'task2'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Task 2
              </button>
            </div>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総演習回数 ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredTotalAttempts}</div>
                <p className="text-xs text-muted-foreground">
                  これまでに提出したエッセイの数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均スコア ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredAverageScore}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}エッセイの平均スコア
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">最高スコア ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredBestScore}</div>
                <p className="text-xs text-muted-foreground">
                  これまでの最高スコア
                </p>
              </CardContent>
            </Card>

            <Card className="hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-transparent hover:border-green-200 bg-gradient-to-br from-white to-green-50/30" onClick={() => router.push('/vocabularylist')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">単語リスト</CardTitle>
                <List className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{thisMonthVocabularyCount}</div>
                <p className="text-xs text-muted-foreground">
                  今月追加された単語・フレーズ
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
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
                <CardTitle>スコア推移 ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedScoreType('total')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'total'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    総合
                  </button>
                  <button
                    onClick={() => setSelectedScoreType('task_achievement')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'task_achievement'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {selectedTaskType === 'task1' ? 'Task Achievement' : 'Task Response'}
                  </button>
                  <button
                    onClick={() => setSelectedScoreType('coherence_cohesion')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'coherence_cohesion'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Coherence & Cohesion
                  </button>
                  <button
                    onClick={() => setSelectedScoreType('lexical_resource')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'lexical_resource'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Lexical Resource
                  </button>
                  <button
                    onClick={() => setSelectedScoreType('grammatical_range')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'grammatical_range'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Grammatical Range
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : filteredEssays.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}のエッセイが提出されていません。
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    他のタスクタイプを選択するか、新しいエッセイを書いてみてください。
                  </p>
                  <Button asChild className="mt-4 bg-green-600 hover:bg-green-700">
                    <Link href="/ielts-tasks">新しいエッセイを書く</Link>
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
              <CardTitle>未確認のフィードバック ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : filteredEssays.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}のエッセイが提出されていません。
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    他のタスクタイプを選択するか、新しいエッセイを書いてみてください。
                  </p>
                  <Button asChild className="mt-4 bg-green-600 hover:bg-green-700">
                    <Link href="/ielts-tasks">新しいエッセイを書く</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEssays
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
                            <Link href={`/ielts-dashboard/essays/${essay.id}`}>詳細を見る</Link>
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
                  {filteredEssays.filter(essay => 
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
