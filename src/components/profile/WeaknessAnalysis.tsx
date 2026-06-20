"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Essay } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface CategoryScore {
  category: string;
  average: number;
  count: number;
}

interface WeaknessAnalysis {
  categories: CategoryScore[];
  commonIssues: string[];
  improvementSuggestions: string[];
}

export default function WeaknessAnalysis() {
  const { user } = useAuth();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [analysis, setAnalysis] = useState<WeaknessAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEssays = async () => {
      if (!user) return;

      try {
        const essaysRef = collection(db, 'essays');
        const q = query(
          essaysRef,
          where('userId', '==', user.uid),
          orderBy('submittedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const essayList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Essay[];

        setEssays(essayList);

        // 弱点分析の実行
        const analysis = analyzeWeaknesses(essayList);
        setAnalysis(analysis);
      } catch (error) {
        console.error('Error loading essays:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEssays();
  }, [user]);

  const analyzeWeaknesses = (essays: Essay[]): WeaknessAnalysis => {
    const categories: CategoryScore[] = [
      { category: '統合', average: 0, count: 0 },
      { category: '構成', average: 0, count: 0 },
      { category: '言語', average: 0, count: 0 },
      { category: '展開', average: 0, count: 0 },
    ];

    const commonIssues: string[] = [];
    const improvementSuggestions: string[] = [];

    essays.forEach(essay => {
      if (essay.feedback) {
        // カテゴリー別の平均スコアを計算
        categories[0].average += essay.feedback.detailedScores.integration || 0;
        categories[0].count++;
        categories[1].average += essay.feedback.detailedScores.organization || 0;
        categories[1].count++;
        categories[2].average += essay.feedback.detailedScores.language || 0;
        categories[2].count++;
        categories[3].average += essay.feedback.detailedScores.development || 0;
        categories[3].count++;

        // 改善点を収集
        essay.feedback.improvements.forEach(improvement => {
          if (!commonIssues.includes(improvement)) {
            commonIssues.push(improvement);
          }
        });

        // 具体的な改善提案を収集
        if (essay.feedback.specificSuggestions) {
          essay.feedback.specificSuggestions.suggestions.forEach(suggestion => {
            if (!improvementSuggestions.includes(suggestion)) {
              improvementSuggestions.push(suggestion);
            }
          });
        }
      }
    });

    // 平均スコアを計算
    categories.forEach(category => {
      if (category.count > 0) {
        category.average = Math.round((category.average / category.count) * 10) / 10;
      }
    });

    // カテゴリーを平均スコアでソート
    categories.sort((a, b) => a.average - b.average);

    return {
      categories,
      commonIssues: commonIssues.slice(0, 3), // 上位3つの問題点を表示
      improvementSuggestions: improvementSuggestions.slice(0, 3), // 上位3つの改善提案を表示
    };
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!analysis || essays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>弱点分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">まだエッセイが提出されていません。</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>弱点分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-4">カテゴリー別スコア</h3>
          <div className="space-y-4">
            {analysis.categories.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{category.category}</span>
                  <span>{category.average.toFixed(1)}点</span>
                </div>
                <Progress value={(category.average / 5) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">よくある問題点</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.commonIssues.map((issue, index) => (
              <li key={index} className="text-gray-700">{issue}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2">改善提案</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.improvementSuggestions.map((suggestion, index) => (
              <li key={index} className="text-gray-700">{suggestion}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 