"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StudySession {
  date: string;
  duration: number;
  focus: string;
}

export default function StudyTimeTracker() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState('');
  const [focus, setFocus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
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
      const studySession: StudySession = {
        date: new Date().toISOString(),
        duration: parseInt(duration, 10),
        focus,
      };

      const userRef = doc(db, 'users', user.uid);
      const studySessions = [...(profile.studySessions || []), studySession];
      
      await updateDoc(userRef, {
        studySessions,
        totalStudyTime: (profile.totalStudyTime || 0) + studySession.duration,
      });

      setProfile({
        ...profile,
        studySessions,
        totalStudyTime: (profile.totalStudyTime || 0) + studySession.duration,
      });

      setDuration('');
      setFocus('');
      setSuccess('学習時間を記録しました！');
    } catch (error) {
      console.error('Error recording study time:', error);
      setError('学習時間の記録に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const totalStudyTime = profile?.totalStudyTime || 0;
  const studySessions = profile?.studySessions || [];
  const averageStudyTime = studySessions.length > 0
    ? Math.round(totalStudyTime / studySessions.length)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>学習時間の記録</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">総学習時間</p>
            <p className="text-2xl font-bold">{totalStudyTime}分</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">平均学習時間</p>
            <p className="text-2xl font-bold">{averageStudyTime}分</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="duration">学習時間（分）</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus">学習内容</Label>
            <Input
              id="focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="例: 統合型エッセイの練習"
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
            {loading ? '記録中...' : '学習時間を記録'}
          </Button>
        </form>

        {studySessions.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-4">最近の学習記録</h3>
            <div className="space-y-2">
              {studySessions.slice(-5).reverse().map((session, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm text-gray-600">
                      {new Date(session.date).toLocaleDateString('ja-JP')}
                    </p>
                    <p className="text-sm">{session.focus}</p>
                  </div>
                  <p className="font-medium">{session.duration}分</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 