"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon, Target, Clock, Flame } from 'lucide-react';
import { toast } from 'sonner';

export default function LearningGoals() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targetScore, setTargetScore] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [streak] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
        if (userProfile?.learningGoals) {
          setTargetScore(userProfile.learningGoals.targetScore?.toString() || '');
          setTargetDate(userProfile.learningGoals.targetDate ? new Date(userProfile.learningGoals.targetDate) : undefined);
          setWeeklyGoal(userProfile.learningGoals.weeklyGoal?.toString() || '');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('プロフィールの読み込みに失敗しました。');
        toast.error('プロフィールの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setSaving(true);
      setError(null);

      const updatedProfile = {
        ...profile,
        learningGoals: {
          ...profile.learningGoals,
          targetScore: parseInt(targetScore) || 0,
          targetDate: targetDate?.toISOString() || '',
          weeklyGoal: parseInt(weeklyGoal) || 0,
        }
      };

      await updateUserProfile(user.uid, updatedProfile);
      setProfile(updatedProfile);
      toast.success('学習目標を保存しました。');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('学習目標の保存に失敗しました。');
      toast.error('学習目標の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>学習目標</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentScore = profile?.progress?.currentScore || 0;
  const targetScoreNum = parseInt(targetScore) || 0;
  const progressPercentage = targetScoreNum > 0 ? (currentScore / targetScoreNum) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>学習目標</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold">目標スコア</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetScore">目標スコア</Label>
              <Input
                id="targetScore"
                type="number"
                min="0"
                max="30"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                placeholder="例: 26"
              />
            </div>
            <div className="space-y-2">
              <Label>目標達成日</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, 'PPP', { locale: ja }) : '日付を選択'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>現在のスコア: {currentScore.toFixed(1)}</span>
              <span>目標スコア: {targetScoreNum}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold">週間目標</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weeklyGoal">週間演習回数</Label>
            <Input
              id="weeklyGoal"
              type="number"
              min="0"
              value={weeklyGoal}
              onChange={(e) => setWeeklyGoal(e.target.value)}
              placeholder="例: 5"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold">学習継続</h3>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{streak}</p>
            <p className="text-sm text-orange-600">連続学習日数</p>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          className="w-full"
          disabled={saving}
        >
          {saving ? '保存中...' : '目標を保存'}
        </Button>
      </CardContent>
    </Card>
  );
} 
