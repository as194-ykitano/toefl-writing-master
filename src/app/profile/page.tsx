"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ProgressDisplay from '@/components/profile/ProgressDisplay';
import WeaknessAnalysis from '@/components/profile/WeaknessAnalysis';
import StudyTimeTracker from '@/components/profile/StudyTimeTracker';
import ScoreChart from '@/components/profile/ScoreChart';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">データを読み込み中...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center mb-8">
            <Link href="/training-selection">
              <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                ← トレーニング選択に戻る
              </Button>
            </Link>
          </div>
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900">TOEFL学習進捗</h1>
            <p className="mt-2 text-gray-600">あなたの学習状況を確認できます</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            <ProgressDisplay />
            <WeaknessAnalysis />
          </div>

          <div className="mb-12">
            <ScoreChart />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StudyTimeTracker />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 
