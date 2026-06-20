"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateLearningGoals } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function LearningGoalsForm() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
      }
    };
    loadProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const goals = {
        targetScore: parseInt(formData.get('targetScore') as string, 10),
        targetDate: formData.get('targetDate') as string,
        learningPlan: formData.get('learningPlan') as string,
        focusAreas: (formData.get('focusAreas') as string).split(',').map(s => s.trim()).filter(Boolean),
        weeklyGoal: typeof profile.learningGoals?.weeklyGoal === 'number' ? profile.learningGoals.weeklyGoal : 0
      };

      await updateLearningGoals(user.uid, goals);
      setProfile({ ...profile, learningGoals: goals });
      setSuccess('学習目標を更新しました！');
    } catch (err) {
      setError('学習目標の更新に失敗しました。もう一度お試しください。');
      console.error('Error updating learning goals:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>学習目標の設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="targetScore">目標スコア</Label>
            <Input
              id="targetScore"
              name="targetScore"
              type="number"
              min="0"
              max="30"
              defaultValue={profile.learningGoals?.targetScore || ''}
              placeholder="例: 25"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">目標達成日</Label>
            <Input
              id="targetDate"
              name="targetDate"
              type="date"
              defaultValue={profile.learningGoals?.targetDate || ''}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="learningPlan">学習計画</Label>
            <Textarea
              id="learningPlan"
              name="learningPlan"
              defaultValue={profile.learningGoals?.learningPlan || ''}
              placeholder="週に何回、どのくらいの時間を学習に充てるかなど"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="focusAreas">重点的に学習したい分野（カンマ区切りで複数入力可）</Label>
            <Textarea
              id="focusAreas"
              name="focusAreas"
              defaultValue={profile.learningGoals?.focusAreas?.join(', ') || ''}
              placeholder="例: 統合型エッセイの構成, 文法の正確性など"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {success && (
            <div className="text-green-500 text-sm">{success}</div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? '更新中...' : '学習目標を更新'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 