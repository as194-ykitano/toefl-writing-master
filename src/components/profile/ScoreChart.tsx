"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Essay } from '@/lib/types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ScoreChart() {
  const { user } = useAuth();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEssays = async () => {
      if (!user) return;

      try {
        const essaysRef = collection(db, 'essays');
        const q = query(
          essaysRef,
          where('userId', '==', user.uid),
          orderBy('submittedAt', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const essayList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Essay[];

        setEssays(essayList);
      } catch (error) {
        console.error('Error loading essays:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEssays();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (essays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>スコア推移</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">まだエッセイが提出されていません。</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context: TooltipItem<'line'>) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}点`;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 30,
        ticks: {
          stepSize: 5,
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuad' as const
    }
  };

  const chartData: ChartData<'line'> = {
    labels: essays.map(essay => 
      (essay.submittedAt instanceof Date 
        ? essay.submittedAt 
        : essay.submittedAt?.toDate?.() || new Date()
      ).toLocaleDateString('ja-JP')
    ),
    datasets: [
      {
        label: '総合スコア',
        data: essays.map(essay => essay.score || 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
      },
      {
        label: '統合',
        data: essays.map(essay => essay.feedback?.detailedScores.integration || 0),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
      },
      {
        label: '構成',
        data: essays.map(essay => essay.feedback?.detailedScores.organization || 0),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
      },
      {
        label: '言語',
        data: essays.map(essay => essay.feedback?.detailedScores.language || 0),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
      },
      {
        label: '展開',
        data: essays.map(essay => essay.feedback?.detailedScores.development || 0),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
      }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>スコア推移</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
} 
