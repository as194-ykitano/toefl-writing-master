"use client";

import { useEffect, useState } from "react";
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileText, Clock, Target, MessageSquare, LogOut, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Essay = {
  id: string;
  taskId: string;
  content: string;
  submittedAt: string;
  score: number;
  wordCount: number;
  timeSpent: number;
  status: 'pending' | 'processing' | 'completed' | 'feedback_completed' | 'error';
  feedbackRead?: boolean;
  feedback?: {
    overall: string;
    strengths: string[];
    improvements: string[];
  };
  taskType?: string;
};

type TabType = 'all' | 'unread' | 'read';

type IELTSEssayTask = {
  id: string;
  title?: string;
  content?: string;
  taskType?: 'task1' | 'task2';
};

export default function IELTSEssaysPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedTaskType, setSelectedTaskType] = useState<'task1' | 'task2'>('task1');
  const [tasks, setTasks] = useState<IELTSEssayTask[]>([]);

  useEffect(() => {
    const fetchEssays = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const essaysRef = collection(db, 'users', user.uid, 'essays');
        const q = query(essaysRef, orderBy('submittedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const allEssays = querySnapshot.docs.map(doc => {
          const data = doc.data();
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

          // スコアの処理（既存の30点満点データと新しい9点満点データの両方に対応）
          let displayScore = data.score || 0;
          
          // もし30点台のスコアが来た場合は9点満点に変換
          if (displayScore > 9) {
            displayScore = Math.min(9.0, Math.round((displayScore / 30) * 9 * 2) / 2);
          }
          
          return {
            id: doc.id,
            taskId: data.taskId || '',
            content: data.content || '',
            submittedAt,
            score: displayScore,
            wordCount: data.wordCount || 0,
            timeSpent: data.timeSpent || 0,
            status: data.status || 'pending',
            feedbackRead: data.feedbackRead,
            feedback: data.feedback,
            taskType: data.taskType
          } as Essay;
        });

        // IELTSのエッセイのみをフィルタリング
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

        setEssays(ieltsEssays);
        
        // タスク情報を取得
        const allTasks: IELTSEssayTask[] = [];
        for (const essay of ieltsEssays) {
          if (essay.taskId) {
            try {
              const taskDoc = await getDoc(doc(db, 'tasks', essay.taskId));
              if (taskDoc.exists()) {
                const taskData = { id: essay.taskId, ...taskDoc.data() } as IELTSEssayTask;
                allTasks.push(taskData);
                // デバッグ用: タスク情報をコンソールに出力
                console.log(`Task ${essay.taskId}:`, {
                  title: taskData.title,
                  content: taskData.content ? taskData.content.substring(0, 100) + '...' : 'No content',
                  taskType: taskData.taskType,
                  essayTaskType: essay.taskType,
                  inferredFromTitle: getTaskTypeFromTitle(taskData.title || ''),
                  inferredFromContent: getTaskTypeFromContent(taskData.content || '')
                });
              }
            } catch (error) {
              console.log(`タスク ${essay.taskId} の取得に失敗しました:`, error);
            }
          }
        }
        setTasks(allTasks);
      } catch (error) {
        console.error('Error fetching essays:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEssays();
  }, [user]);

  // エッセイのタスクタイプを判別する関数（エッセイカードと同じロジック）
  const getEssayTaskType = (essay: Essay): 'task1' | 'task2' => {
    const task = tasks.find(t => t.id === essay.taskId);
    if (task) {
      // 優先順位: 1. タスクの内容から判別, 2. タスクのタイトルから判別, 3. essay.taskType
      if (task.content) {
        return getTaskTypeFromContent(task.content);
      } else if (task.title) {
        return getTaskTypeFromTitle(task.title);
      }
    }
    // フォールバック: essay.taskTypeを使用
    if (essay.taskType === 'task1' || essay.taskType === 'task2') {
      return essay.taskType;
    }
    // 既存データの互換性のため、taskTypeが'ielts'の場合はtask2として扱う
    if (essay.taskType === 'ielts') {
      return 'task2';
    }
    // デフォルトはTask2として扱う
    return 'task2';
  };

  // フィルタリングされたエッセイを取得
  const getFilteredEssays = () => {
    let filteredEssays: Essay[];
    
    // まず、選択されたタスクタイプでフィルタリング（エッセイカードと同じロジックを使用）
    const taskTypeFilteredEssays = essays.filter(essay => {
      const essayTaskType = getEssayTaskType(essay);
      return essayTaskType === selectedTaskType;
    });
    
    switch (activeTab) {
      case 'unread':
        filteredEssays = taskTypeFilteredEssays.filter(essay => 
          (essay.status === 'completed' || essay.status === 'feedback_completed') && 
          essay.feedback && 
          !essay.feedbackRead
        );
        return filteredEssays.sort((a, b) => {
          const aDate = new Date(a.submittedAt);
          const bDate = new Date(b.submittedAt);
          return aDate.getTime() - bDate.getTime();
        });
      case 'read':
        filteredEssays = taskTypeFilteredEssays.filter(essay => 
          (essay.status === 'completed' || essay.status === 'feedback_completed') && 
          essay.feedback && 
          essay.feedbackRead
        );
        return filteredEssays;
      default:
        return taskTypeFilteredEssays;
    }
  };

  // 各タブのエッセイ数を取得
  const getTabCounts = () => {
    // 選択されたタスクタイプでフィルタリングされたエッセイ（エッセイカードと同じロジックを使用）
    const taskTypeFilteredEssays = essays.filter(essay => {
      const essayTaskType = getEssayTaskType(essay);
      return essayTaskType === selectedTaskType;
    });
    
    const allCount = taskTypeFilteredEssays.length;
    const unreadCount = taskTypeFilteredEssays.filter(essay => 
      (essay.status === 'completed' || essay.status === 'feedback_completed') && 
      essay.feedback && 
      !essay.feedbackRead
    ).length;
    const readCount = taskTypeFilteredEssays.filter(essay => 
      (essay.status === 'completed' || essay.status === 'feedback_completed') && 
      essay.feedback && 
      essay.feedbackRead
    ).length;

    return { allCount, unreadCount, readCount };
  };

  // タスクの内容からTask1かTask2かを判別する関数
  const getTaskTypeFromContent = (taskContent: string): 'task1' | 'task2' => {
    if (!taskContent) return 'task1';
    
    const lowerContent = taskContent.toLowerCase();
    
    // Task1の特徴的なキーワード（データ分析系）
    if (lowerContent.includes('chart') ||
        lowerContent.includes('graph') ||
        lowerContent.includes('table') ||
        lowerContent.includes('diagram') ||
        lowerContent.includes('process') ||
        lowerContent.includes('map') ||
        lowerContent.includes('bar') ||
        lowerContent.includes('line') ||
        lowerContent.includes('pie') ||
        lowerContent.includes('percentage') ||
        lowerContent.includes('proportion') ||
        lowerContent.includes('trend') ||
        lowerContent.includes('increase') ||
        lowerContent.includes('decrease') ||
        lowerContent.includes('compare') ||
        lowerContent.includes('describe') ||
        lowerContent.includes('summarize') ||
        lowerContent.includes('information') ||
        lowerContent.includes('data') ||
        lowerContent.includes('figure') ||
        lowerContent.includes('illustration')) {
      return 'task1';
    }
    
    // Task2の特徴的なキーワード（議論・意見系）
    if (lowerContent.includes('agree') ||
        lowerContent.includes('disagree') ||
        lowerContent.includes('discuss') ||
        lowerContent.includes('opinion') ||
        lowerContent.includes('view') ||
        lowerContent.includes('argument') ||
        lowerContent.includes('problem') ||
        lowerContent.includes('solution') ||
        lowerContent.includes('advantage') ||
        lowerContent.includes('disadvantage') ||
        lowerContent.includes('benefit') ||
        lowerContent.includes('drawback') ||
        lowerContent.includes('positive') ||
        lowerContent.includes('negative') ||
        lowerContent.includes('should') ||
        lowerContent.includes('must') ||
        lowerContent.includes('need to') ||
        lowerContent.includes('believe') ||
        lowerContent.includes('think') ||
        lowerContent.includes('consider') ||
        lowerContent.includes('suggest') ||
        lowerContent.includes('recommend')) {
      return 'task2';
    }
    
    // デフォルトはTask1
    return 'task1';
  };

  // タスクのタイトルからTask1かTask2かを判別する関数（フォールバック用）
  const getTaskTypeFromTitle = (title: string): 'task1' | 'task2' => {
    if (!title) return 'task1';
    
    const lowerTitle = title.toLowerCase();
    
    // Task1のキーワード
    if (lowerTitle.includes('task1') || 
        lowerTitle.includes('task 1') || 
        lowerTitle.includes('task-1') ||
        lowerTitle.includes('chart') ||
        lowerTitle.includes('graph') ||
        lowerTitle.includes('table') ||
        lowerTitle.includes('diagram') ||
        lowerTitle.includes('process') ||
        lowerTitle.includes('map') ||
        lowerTitle.includes('bar') ||
        lowerTitle.includes('line') ||
        lowerTitle.includes('pie')) {
      return 'task1';
    }
    
    // Task2のキーワード
    if (lowerTitle.includes('task2') || 
        lowerTitle.includes('task 2') || 
        lowerTitle.includes('task-2') ||
        lowerTitle.includes('agree') ||
        lowerTitle.includes('disagree') ||
        lowerTitle.includes('discuss') ||
        lowerTitle.includes('opinion') ||
        lowerTitle.includes('view') ||
        lowerTitle.includes('argument') ||
        lowerTitle.includes('problem') ||
        lowerTitle.includes('solution')) {
      return 'task2';
    }
    
    // デフォルトはTask1
    return 'task1';
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      alert('ログアウトに失敗しました');
    }
    setLogoutDialogOpen(false);
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
      <div className="max-w-7xl mx-auto px-8 py-2">
        <div className="flex items-center justify-between mb-2 h-16">
          <h1 className="text-2xl font-bold text-gray-900 m-0 p-0">IELTS Essay History</h1>
          <div className="flex items-center gap-4 m-0 p-0">
            <Link href="/ielts-tasks">
              <Button className="bg-green-600 hover:bg-green-700">
                <FileText className="w-4 h-4 mr-2" /> 演習を始める
              </Button>
            </Link>
            <Link href="/ielts-dashboard">
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" /> IELTSダッシュボードを開く
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
          {/* タイトルとタブナビゲーション */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/ielts-dashboard">
                <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                  ← IELTSダッシュボードに戻る
                </Button>
              </Link>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">IELTSエッセイ履歴</h1>
                <p className="text-gray-600">これまでに提出したIELTSエッセイの一覧です</p>
              </div>
            </div>
            
            {/* タブナビゲーション */}
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
                {getTabCounts().unreadCount > 0 && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                    {getTabCounts().unreadCount}
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
                <CardTitle className="text-sm font-medium">総エッセイ数 ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getFilteredEssays().length}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}エッセイの総数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均スコア ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getFilteredEssays().length > 0 
                    ? Math.round(getFilteredEssays().reduce((sum, e) => sum + (e.score || 0), 0) / getFilteredEssays().length * 10) / 10
                    : 0
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}エッセイの平均スコア
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均語数 ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getFilteredEssays().length > 0 
                    ? Math.round(getFilteredEssays().reduce((sum, e) => sum + (e.wordCount || 0), 0) / getFilteredEssays().length)
                    : 0
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}エッセイの平均語数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均時間 ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getFilteredEssays().length > 0 
                    ? (() => {
                        const avgSeconds = getFilteredEssays().reduce((sum, e) => sum + (e.timeSpent || 0), 0) / getFilteredEssays().length;
                        const minutes = Math.floor(avgSeconds / 60);
                        const seconds = Math.round(avgSeconds % 60);
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                      })()
                    : '0:00'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}エッセイの平均所要時間
                </p>
              </CardContent>
            </Card>
          </div>

          {/* エッセイリスト */}
          {getFilteredEssays().length === 0 ? (
            <Card className="mx-auto max-w-md shadow-md border-0">
              <CardContent className="p-8 text-center">
                {activeTab === 'all' ? (
                  <>
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}のIELTSエッセイが提出されていません。
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      他のタスクタイプを選択するか、新しいエッセイを書いてみてください。
                    </p>
                    <Link href="/ielts-tasks">
                      <Button className="bg-green-600 hover:bg-green-700">新しいIELTS演習を始める</Button>
                    </Link>
                  </>
                ) : activeTab === 'unread' ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}の未読フィードバックはありません。
                    </p>
                    <p className="text-sm text-gray-500">すべてのフィードバックを確認済みです。</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'}の既読フィードバックはありません。
                    </p>
                    <p className="text-sm text-gray-500">フィードバックを確認するとここに表示されます。</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {getFilteredEssays().map((essay) => (
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
                    {essay.score ? `${essay.score}/9` : 
                     essay.status === 'processing' ? 'AI添削中' :
                     essay.status === 'error' ? 'エラー' :
                     '評価中'}
                  </span>
                  <CardHeader className="pb-2 flex flex-col items-start justify-between gap-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 truncate w-full mb-1">
                      {(() => {
                        const task = tasks.find(t => t.id === essay.taskId);
                        if (task && task.title) {
                          return task.title;
                        }
                        // フォールバック: essay.taskTypeを使用
                        return `IELTS Task ${essay.taskType === 'task1' ? '1' : '2'}`;
                      })()}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        {(() => {
                          const task = tasks.find(t => t.id === essay.taskId);
                          return task ? `No. ${tasks.indexOf(task) + 1}` : `No. ${essay.id.slice(-4)}`;
                        })()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {getEssayTaskType(essay) === 'task1' ? 'Task 1' : 'Task 2'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 flex-1 flex flex-col justify-between">
                    <div className="mb-4 min-h-[48px]">
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {essay.content.length > 200 
                          ? essay.content.substring(0, 200) + '...' 
                          : essay.content
                        }
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs text-gray-400">
                        {new Date(essay.submittedAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
                        <Link href={`/ielts-dashboard/essays/${essay.id}`}>
                          <Button variant="outline" size="sm" className="group-hover:border-indigo-500 group-hover:text-indigo-700">
                            詳細を見る
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
