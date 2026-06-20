"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Essay } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Menu, X } from "lucide-react";

export default function ProgressDisplay() {
  const { user } = useAuth();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  useEffect(() => {
    const loadEssays = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        const essaysRef = collection(db, "users", user.uid, "essays");
        const q = query(essaysRef, orderBy("submittedAt", "desc"));
        const querySnapshot = await getDocs(q);
        const essayList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Essay[];

        setEssays(essayList);
      } catch (err) {
        console.error('Error loading essays:', err);
        setError('データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    loadEssays();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const totalEssays = essays.length;
  const averageScore = essays.length > 0
    ? essays.reduce((acc, essay) => acc + (essay.score || 0), 0) / essays.length
    : 0;
  const highestScore = essays.length > 0
    ? Math.max(...essays.map(essay => essay.score || 0))
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>学習進捗</CardTitle>
        <button className="p-2" onClick={() => setSideMenuOpen(true)}>
          <Menu className="w-5 h-5" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">提出エッセイ数</span>
              <span className="text-sm font-medium text-gray-900">{totalEssays}件</span>
            </div>
            <Progress value={(totalEssays / 20) * 100} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">平均スコア</span>
              <span className="text-sm font-medium text-gray-900">{averageScore.toFixed(1)}/5.0</span>
            </div>
            <Progress value={(averageScore / 5) * 100} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">最高スコア</span>
              <span className="text-sm font-medium text-gray-900">{highestScore}/5.0</span>
            </div>
            <Progress value={(highestScore / 5) * 100} className="h-2" />
          </div>
        </div>
      </CardContent>
      {/* サイドメニュー（オーバーレイ） */}
      {sideMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSideMenuOpen(false)} />
          <div className="ml-auto w-72 bg-white h-full shadow-lg p-6 relative flex flex-col">
            <button className="absolute top-4 right-4 p-2" onClick={() => setSideMenuOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <div className="mt-8 space-y-6">
              <a href="/profile" className="block text-gray-700 hover:text-indigo-600 font-medium" onClick={() => setSideMenuOpen(false)}>
                プロフィール編集
              </a>
              <a href="/login" className="block text-gray-700 hover:text-indigo-600 font-medium" onClick={() => setSideMenuOpen(false)}>
                ログイン
              </a>
              <button className="block text-left w-full text-gray-700 hover:text-indigo-600 font-medium" onClick={() => { /* ログアウト処理をここに追加 */ setSideMenuOpen(false) }}>
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 