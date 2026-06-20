"use client"

import { useEffect, useState } from "react"
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { collection, query, orderBy, getDocs, doc, getDoc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
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
  ChartData,
  TooltipItem
} from 'chart.js';
import { TrendingUp, BookOpen, FileText, MessageSquare, LogOut, Target, AlertCircle, Settings, List } from 'lucide-react';
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

// Chart.js縺ｮ逋ｻ骭ｲ
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
        
        // 繧ｨ繝・そ繧､縺ｨ蜊倩ｪ樊焚繧剃ｸｦ陦後＠縺ｦ蜿門ｾ・
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
        // 蜈ｨ繧ｨ繝・そ繧､繧貞叙蠕・
        const q = query(
          essaysRef,
          orderBy('submittedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const allEssays = processEssayData(querySnapshot);
        
        // TOEFL Academic Discussion縺ｮ蝠城｡後・縺ｿ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
        const toeflEssays = [];
        const taskDataMap = new Map(); // 繧ｿ繧ｹ繧ｯ諠・ｱ繧偵く繝｣繝・す繝･
        
        for (const essay of allEssays) {
          if (essay.taskId) {
            try {
              // 繧ｿ繧ｹ繧ｯ諠・ｱ繧貞叙蠕暦ｼ医く繝｣繝・す繝･縺後≠繧後・菴ｿ逕ｨ・・
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
                // TOEFL Academic Discussion繧ｿ繧ｹ繧ｯ縺ｮ譚｡莉ｶ: taskType繝輔ぅ繝ｼ繝ｫ繝峨′"academic_discussion"
                if (taskData.taskType === 'academic_discussion') {
                  toeflEssays.push(essay);
                }
              }
            } catch (error) {
              console.log(`繧ｿ繧ｹ繧ｯ ${essay.taskId} 縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:`, error);
            }
          }
        }
        
        return toeflEssays;
      } catch (error) {
        console.error('繧ｨ繝・そ繧､縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:', error);
        return [];
      }
    };

    const processEssayData = (querySnapshot: { docs: QueryDocumentSnapshot<DocumentData>[] }): EssayWithScores[] => {
      const essayList = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        // submittedAt縺ｮ蜃ｦ逅・ｒ螳牙・縺ｫ陦後≧
        let submittedAt: string;
        if (data.submittedAt?.toDate) {
          // Firestore縺ｮ繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励・蝣ｴ蜷・
          submittedAt = data.submittedAt.toDate().toISOString();
        } else if (data.submittedAt instanceof Date) {
          // Date繧ｪ繝悶ず繧ｧ繧ｯ繝医・蝣ｴ蜷・
          submittedAt = data.submittedAt.toISOString();
        } else if (typeof data.submittedAt === 'string') {
          // 譌｢縺ｫ譁・ｭ怜・縺ｮ蝣ｴ蜷・
          submittedAt = data.submittedAt;
        } else if (typeof data.submittedAt === 'number') {
          // 繧ｿ繧､繝繧ｹ繧ｿ繝ｳ繝励・蝣ｴ蜷・
          submittedAt = new Date(data.submittedAt).toISOString();
        } else {
          // 繝・ヵ繧ｩ繝ｫ繝亥､
          submittedAt = new Date().toISOString();
        }

        // 繝輔ぅ繝ｼ繝峨ヰ繝・け繝・・繧ｿ縺ｮ蜃ｦ逅・
        const feedback = data.feedback || {};
        const detailedScores = feedback.detailedScores || {};
        
        // TOEFL Academic Discussion逕ｨ縺ｮ繧ｹ繧ｳ繧｢險育ｮ・
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

  // 蟷ｳ蝮・せ縺ｮ邂怜・
  const averageScore = essays.length > 0
    ? Math.round(essays.reduce((sum, e) => sum + (e.score || 0), 0) / essays.length * 10) / 10
    : 0;
  const totalAttempts = essays.length;
  const bestScore = essays.length > 0
    ? Math.round(Math.max(...essays.map((e) => e.score || 0)) * 2) / 2
    : 0;

  // 繧ｹ繧ｳ繧｢謗ｨ遘ｻ繧ｰ繝ｩ繝輔・繝・・繧ｿ繧呈ｺ門ｙ
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
        return '邱丞粋繧ｹ繧ｳ繧｢';
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
          label: function(context: TooltipItem<'line'>) {
            return `${getScoreLabel(selectedScoreType)}: ${context.parsed.y}轤ｹ`;
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

  // Academic Discussion・医％縺ｮ繝壹・繧ｸ縺ｧ蜿門ｾ励＠縺溘ｂ縺ｮ・峨↓髯仙ｮ壹＠縺滓悴隱ｭ謨ｰ
  const toeflUnreadCount = essays.filter(essay =>
    (essay.status === 'completed' || essay.status === 'feedback_completed') &&
    essay.feedback &&
    !essay.feedbackRead
  ).length;

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch {
      alert('繝ｭ繧ｰ繧｢繧ｦ繝医↓螟ｱ謨励＠縺ｾ縺励◆');
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
              <h1 className="text-2xl font-bold text-gray-900 mb-4">繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ...</h1>
              <p className="text-gray-600">縺励・繧峨￥縺雁ｾ・■縺上□縺輔＞縲・</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* 繝倥ャ繝繝ｼ驛ｨ蛻・*/}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/training-selection">
              <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                竊・繝医Ξ繝ｼ繝九Φ繧ｰ驕ｸ謚槭↓謌ｻ繧・
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Academic Discussion</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/toefl-tasks">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4 mr-2" /> 貍皮ｿ偵ｒ蟋九ａ繧・
              </Button>
            </Link>
            <Link href="/toefl-essays">
              <Button variant="outline" className="relative">
                <MessageSquare className="w-4 h-4 mr-2" /> 
                驕主悉縺ｮ繧ｨ繝・そ繧､
                {toeflUnreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {toeflUnreadCount}
                  </span>
                )}
              </Button>
            </Link>
            {/* 邂｡逅・・・縺ｿ陦ｨ遉ｺ縺輔ｌ繧蟻dmin dashboard縺ｸ縺ｮ繝ｪ繝ｳ繧ｯ */}
            {user && isAdmin(user.email) && (
              <Link href="/admin/dashboard">
                <Button variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200">
                  <Settings className="w-4 h-4 mr-2" />
                  邂｡逅・・ム繝・す繝･繝懊・繝・
                </Button>
              </Link>
            )}
            {/* 繝ｭ繧ｰ繧｢繧ｦ繝医・繧ｿ繝ｳ */}
            <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
              <LogOut className="w-4 h-4 mr-2" /> 繝ｭ繧ｰ繧｢繧ｦ繝・
            </Button>
          </div>
        </div>

        {/* 繝ｭ繧ｰ繧｢繧ｦ繝育｢ｺ隱阪ム繧､繧｢繝ｭ繧ｰ */}
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

        {/* 騾夂衍繝医・繧ｹ繝・*/}
        <NotificationToast
          essayId={notificationEssayId || ''}
          taskTitle={notificationTaskTitle || undefined}
          isVisible={isNotificationVisible}
          onClose={hideFeedbackNotification}
          onView={handleNotificationView}
          essayType={notificationEssayType || undefined}
        />

        <div className="max-w-7xl mx-auto">
          {/* 邨ｱ險医き繝ｼ繝・*/}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">邱乗ｼ皮ｿ貞屓謨ｰ</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAttempts}</div>
                <p className="text-xs text-muted-foreground">
                  縺薙ｌ縺ｾ縺ｧ縺ｫ謠仙・縺励◆繧ｨ繝・そ繧､縺ｮ謨ｰ
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">蟷ｳ蝮・せ繧ｳ繧｢</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageScore}</div>
                <p className="text-xs text-muted-foreground">
                  Academic Discussion繧ｨ繝・そ繧､縺ｮ蟷ｳ蝮・せ繧ｳ繧｢
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">譛鬮倥せ繧ｳ繧｢</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bestScore}</div>
                <p className="text-xs text-muted-foreground">
                  縺薙ｌ縺ｾ縺ｧ縺ｮ譛鬮倥せ繧ｳ繧｢
                </p>
              </CardContent>
            </Card>

            <Card className="hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 border-transparent hover:border-blue-200 bg-gradient-to-br from-white to-blue-50/30" onClick={() => router.push('/vocabularylist')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">蜊倩ｪ槭Μ繧ｹ繝・</CardTitle>
                <List className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{thisMonthVocabularyCount}</div>
                <p className="text-xs text-muted-foreground">
                  莉頑怦霑ｽ蜉縺輔ｌ縺溷腰隱槭・繝輔Ξ繝ｼ繧ｺ
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                  <span>隧ｳ邏ｰ繧定ｦ九ｋ</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 繧ｹ繧ｳ繧｢謗ｨ遘ｻ繝√Ε繝ｼ繝・*/}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>繧ｹ繧ｳ繧｢謗ｨ遘ｻ</CardTitle>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedScoreType('total')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      selectedScoreType === 'total'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    邱丞粋
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
                    Academic Discussion縺ｮ繧ｨ繝・そ繧､縺梧署蜃ｺ縺輔ｌ縺ｦ縺・∪縺帙ｓ縲・
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    譁ｰ縺励＞繧ｨ繝・そ繧､繧呈嶌縺・※縺ｿ縺ｦ縺上□縺輔＞縲・
                  </p>
                  <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Link href="/toefl-tasks">譁ｰ縺励＞繧ｨ繝・そ繧､繧呈嶌縺・</Link>
                  </Button>
                </div>
              ) : (
                <div className="h-[400px]">
                  <Line data={chartData} options={chartOptions} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 譛ｪ遒ｺ隱阪・繝輔ぅ繝ｼ繝峨ヰ繝・け */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>譛ｪ遒ｺ隱阪・繝輔ぅ繝ｼ繝峨ヰ繝・け</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : essays.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Academic Discussion縺ｮ繧ｨ繝・そ繧､縺梧署蜃ｺ縺輔ｌ縺ｦ縺・∪縺帙ｓ縲・
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    譁ｰ縺励＞繧ｨ繝・そ繧､繧呈嶌縺・※縺ｿ縺ｦ縺上□縺輔＞縲・
                  </p>
                  <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Link href="/toefl-tasks">譁ｰ縺励＞繧ｨ繝・そ繧､繧呈嶌縺・</Link>
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
                            繧ｹ繧ｳ繧｢: {essay.score !== undefined && essay.score !== null ? 
                              essay.score.toFixed(1) : 
                              essay.status === 'processing' ? 'AI豺ｻ蜑贋ｸｭ' :
                              essay.status === 'error' ? '繧ｨ繝ｩ繝ｼ' :
                              '隧穂ｾ｡荳ｭ'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 譛ｪ隱ｭ繝舌ャ繧ｸ縺ｮ縺ｿ陦ｨ遉ｺ */}
                          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            <span>譛ｪ隱ｭ</span>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/essays/${essay.id}`}>隧ｳ邏ｰ繧定ｦ九ｋ</Link>
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
                  {/* 譛ｪ隱ｭ縺ｮ繝輔ぅ繝ｼ繝峨ヰ繝・け縺後↑縺・ｴ蜷医・繝｡繝・そ繝ｼ繧ｸ */}
                  {essays.filter(essay => 
                    (essay.status === 'completed' || essay.status === 'feedback_completed') && 
                    essay.feedback && 
                    !essay.feedbackRead
                  ).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">譛ｪ遒ｺ隱阪・繝輔ぅ繝ｼ繝峨ヰ繝・け縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・</p>
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

