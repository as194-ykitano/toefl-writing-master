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
      taskAchievement: number; // Task1逕ｨ
      taskResponse: number;    // Task2逕ｨ
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
        
        // IELTS縺ｮ蝠城｡後・縺ｿ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ・・askId繧剃ｽｿ縺｣縺ｦ繧ｿ繧ｹ繧ｯ諠・ｱ繧堤｢ｺ隱搾ｼ・
        const ieltsEssays = [];
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
                // IELTS繧ｿ繧ｹ繧ｯ縺ｮ譚｡莉ｶ: taskType繝輔ぅ繝ｼ繝ｫ繝峨′"task1"縺ｾ縺溘・"task2"
                if (taskData.taskType === 'task1' || taskData.taskType === 'task2') {
                  // 繧ｿ繧ｹ繧ｯ諠・ｱ縺九ｉtaskType繧呈峩譁ｰ
                  essay.taskType = taskData.taskType;
                  ieltsEssays.push(essay);
                }
              }
            } catch (error) {
              console.log(`繧ｿ繧ｹ繧ｯ ${essay.taskId} 縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:`, error);
              // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・譌｢蟄倥・taskType繝輔ぅ繝ｼ繝ｫ繝峨〒蛻､譁ｭ
              if (essay.taskType === 'ielts') {
                ieltsEssays.push(essay);
              }
            }
          } else {
            // taskId縺後↑縺・ｴ蜷医・譌｢蟄倥・taskType繝輔ぅ繝ｼ繝ｫ繝峨〒蛻､譁ｭ
            if (essay.taskType === 'ielts') {
              ieltsEssays.push(essay);
            }
          }
        }
        
        return ieltsEssays;
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
        
        console.log(`Raw data for essay ${doc.id}:`, {
          taskType: data.taskType,
          feedback: data.feedback,
          detailedScores: data.feedback?.detailedScores,
          score: data.score,
          fullData: data
        });

        // 繧ｿ繧ｹ繧ｯ繧ｿ繧､繝励ｒ蜿門ｾ励＠縺ｦ驕ｩ蛻・↑繧ｹ繧ｳ繧｢繧帝∈謚・
        let taskType = data.taskType;
        
        // 繧ｿ繧ｹ繧ｯ繧ｿ繧､繝励′險ｭ螳壹＆繧後※縺・↑縺・ｴ蜷医∝茜逕ｨ蜿ｯ閭ｽ縺ｪ繧ｹ繧ｳ繧｢縺九ｉ謗ｨ貂ｬ
        if (!taskType) {
          console.log(`Task type not found for essay ${doc.id}, attempting to infer from available scores`);
          if (detailedScores.taskAchievement !== undefined) {
            taskType = 'task1';
            console.log(`Inferred task type as 'task1' based on available scores`);
          } else if (detailedScores.taskResponse !== undefined) {
            taskType = 'task2';
            console.log(`Inferred task type as 'task2' based on available scores`);
          } else {
            // 繝・ヵ繧ｩ繝ｫ繝医・task2
            taskType = 'task2';
            console.log(`Using default task type 'task2'`);
          }
        }
        
        // 譛邨ら噪縺ｪ繧ｿ繧ｹ繧ｯ繧ｿ繧､繝励・遒ｺ隱・
        console.log(`Final task type for essay ${doc.id}:`, taskType);
        
        // 繧ｹ繧ｳ繧｢險育ｮ励・隧ｳ邏ｰ繝ｭ繧ｰ
        // Task1: taskAchievement, Task2: taskResponse 繧剃ｽｿ逕ｨ
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
          taskType: data.taskType || 'ielts' // 譌｢蟄倥ョ繝ｼ繧ｿ縺ｮ莠呈鋤諤ｧ縺ｮ縺溘ａ
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

  // 蟷ｳ蝮・せ縺ｮ邂怜・譁ｹ豕輔ｒ菫ｮ豁｣ - 譌｢蟄倥・邱丞粋繧ｹ繧ｳ繧｢・・verall・峨ｒ菴ｿ逕ｨ
  const averageScore = essays.length > 0
    ? Math.round(essays.reduce((sum, e) => sum + (e.score || 0), 0) / essays.length * 10) / 10 // 蟆乗焚轤ｹ隨ｬ1菴阪∪縺ｧ陦ｨ遉ｺ
    : 0;
  const totalAttempts = essays.length;
  // void markers moved below bestScore declaration
  // void markers moved below bestScore declaration
  // void markers moved below bestScore declaration
  // 譛鬮倥せ繧ｳ繧｢縺ｮ邂怜・譁ｹ豕輔ｂ菫ｮ豁｣ - 譌｢蟄倥・邱丞粋繧ｹ繧ｳ繧｢・・verall・峨ｒ菴ｿ逕ｨ
  const bestScore = essays.length > 0
    ? Math.round(Math.max(...essays.map((e) => e.score || 0)) * 2) / 2 // 0.5蛻ｻ縺ｿ縺ｫ荳ｸ繧√ｋ
    : 0;
  void averageScore;
  void totalAttempts;
  void bestScore;

  // 驕ｸ謚槭＆繧後◆繧ｿ繧ｹ繧ｯ繧ｿ繧､繝励↓蝓ｺ縺･縺・※繧ｨ繝・そ繧､繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
  const filteredEssays = essays.filter(essay => {
    // essay.taskType繝輔ぅ繝ｼ繝ｫ繝峨ｒ蜆ｪ蜈育噪縺ｫ菴ｿ逕ｨ
    if (essay.taskType === 'task1' || essay.taskType === 'task2') {
      return essay.taskType === selectedTaskType;
    }
    
    // 譌｢蟄倥ョ繝ｼ繧ｿ縺ｮ莠呈鋤諤ｧ縺ｮ縺溘ａ縲》askType縺・ielts'縺ｮ蝣ｴ蜷医・task2縺ｨ縺励※謇ｱ縺・
    if (essay.taskType === 'ielts') {
      return selectedTaskType === 'task2';
    }
    
    // 繝・ヵ繧ｩ繝ｫ繝医・Task2縺ｨ縺励※謇ｱ縺・
    return selectedTaskType === 'task2';
  });

  // 繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ縺輔ｌ縺溘お繝・そ繧､縺ｫ蝓ｺ縺･縺・※邨ｱ險医ｒ蜀崎ｨ育ｮ・
  // 譌｢蟄倥・邱丞粋繧ｹ繧ｳ繧｢・・verall・峨ｒ菴ｿ逕ｨ - 4縺､縺ｮ隕ｳ轤ｹ縺ｮ蟷ｳ蝮・せ縺九ｉ0.5蛻ｻ縺ｿ縺ｫ菫ｮ豁｣貂医∩
  const filteredAverageScore = filteredEssays.length > 0
    ? Math.round(filteredEssays.reduce((sum, e) => sum + (e.score || 0), 0) / filteredEssays.length * 10) / 10
    : 0;
  
  const filteredTotalAttempts = filteredEssays.length;
  
  const filteredBestScore = filteredEssays.length > 0
    ? Math.round(Math.max(...filteredEssays.map((e) => e.score || 0)) * 2) / 2
    : 0;

  // 繧ｹ繧ｳ繧｢謗ｨ遘ｻ繧ｰ繝ｩ繝輔・繝・・繧ｿ繧呈ｺ門ｙ
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
            // Task1: taskAchievement, Task2: taskResponse 縺ｮ繧ｹ繧ｳ繧｢繧剃ｽｿ逕ｨ
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
        // 驕ｸ謚槭＆繧後◆繧ｿ繧ｹ繧ｯ繧ｿ繧､繝励↓蠢懊§縺ｦ繝ｩ繝吶Ν繧貞､画峩
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
          label: function(context: TooltipItem<'line'>) {
            return `${getScoreLabel(selectedScoreType)}: ${context.parsed.y}`;
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

  // IELTS繧ｨ繝・そ繧､・医％縺ｮ繝壹・繧ｸ縺ｧ蜿門ｾ励＠縺溘ｂ縺ｮ・峨↓髯仙ｮ壹＠縺滓悴隱ｭ謨ｰ
  const ieltsUnreadCount = essays.filter(essay =>
    (essay.status === 'completed' || essay.status === 'feedback_completed') &&
    essay.feedback &&
    !essay.feedbackRead
  ).length;

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
        {/* 繝倥ャ繝繝ｼ驛ｨ蛻・*/}
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
                <FileText className="w-4 h-4 mr-2" /> 問題を始める
              </Button>
            </Link>
            <Link href="/ielts-essays">
              <Button variant="outline" className="relative">
                <MessageSquare className="w-4 h-4 mr-2" /> 
                最近のエッセイ
                {ieltsUnreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {ieltsUnreadCount}
                  </span>
                )}
              </Button>
            </Link>
            {/* 邂｡逅・・・縺ｿ陦ｨ遉ｺ縺輔ｌ繧蟻dmin dashboard縺ｸ縺ｮ繝ｪ繝ｳ繧ｯ */}
            {user && isAdmin(user.email) && (
              <Link href="/admin/dashboard">
                <Button variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200">
                  <Settings className="w-4 h-4 mr-2" />
                  管理者ダッシュボード
                </Button>
              </Link>
            )}
            {/* 繝ｭ繧ｰ繧｢繧ｦ繝医・繧ｿ繝ｳ */}
            <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
              <LogOut className="w-4 h-4 mr-2" /> ログアウト
            </Button>
          </div>
        </div>

        {/* 繝ｭ繧ｰ繧｢繧ｦ繝育｢ｺ隱阪ム繧､繧｢繝ｭ繧ｰ */}
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
          {/* Task1/Task2蛻・ｊ譖ｿ縺医・繧ｿ繝ｳ */}
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

          {/* 邨ｱ險医き繝ｼ繝・*/}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">提出回数 ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
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
                <CardTitle className="text-sm font-medium">語彙リスト</CardTitle>
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

          {/* 繧ｹ繧ｳ繧｢謗ｨ遘ｻ繝√Ε繝ｼ繝・*/}
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
                    {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'} のエッセイがまだありません。
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    まずはタスクを選んで、新しいエッセイを書いてみてください。
                  </p>
                  <Button asChild className="mt-4 bg-green-600 hover:bg-green-700">
                    <Link href="/ielts-tasks">新しいエッセイを始める</Link>
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
              <CardTitle>未読のフィードバック ({selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : filteredEssays.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {selectedTaskType === 'task1' ? 'Task 1' : 'Task 2'} のエッセイがまだありません。
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    まずはタスクを選んで、新しいエッセイを書いてみてください。
                  </p>
                  <Button asChild className="mt-4 bg-green-600 hover:bg-green-700">
                    <Link href="/ielts-tasks">新しいエッセイを始める</Link>
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
                          {/* 譛ｪ隱ｭ繝舌ャ繧ｸ縺ｮ縺ｿ陦ｨ遉ｺ */}
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
                  {/* 譛ｪ隱ｭ縺ｮ繝輔ぅ繝ｼ繝峨ヰ繝・け縺後↑縺・ｴ蜷医・繝｡繝・そ繝ｼ繧ｸ */}
                  {filteredEssays.filter(essay => 
                    (essay.status === 'completed' || essay.status === 'feedback_completed') && 
                    essay.feedback && 
                    !essay.feedbackRead
                  ).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">未読のフィードバックはありません。</p>
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


