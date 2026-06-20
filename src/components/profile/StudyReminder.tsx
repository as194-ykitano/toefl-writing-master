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
import { Switch } from '@/components/ui/switch';

interface Reminder {
  enabled: boolean;
  time: string;
  days: string[];
}

export default function StudyReminder() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminder, setReminder] = useState<Reminder>({
    enabled: false,
    time: '09:00',
    days: ['monday', 'wednesday', 'friday'],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setProfile(userData);
          if (userData.reminder) {
            setReminder(userData.reminder);
          }
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
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        reminder,
      });

      setProfile({
        ...profile,
        reminder,
      });

      setSuccess('リマインダーを更新しました！');
    } catch (error) {
      console.error('Error updating reminder:', error);
      setError('リマインダーの更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setReminder(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day],
    }));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const days = [
    { id: 'monday', label: '月' },
    { id: 'tuesday', label: '火' },
    { id: 'wednesday', label: '水' },
    { id: 'thursday', label: '木' },
    { id: 'friday', label: '金' },
    { id: 'saturday', label: '土' },
    { id: 'sunday', label: '日' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>学習リマインダー</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="reminder-enabled"
              checked={reminder.enabled}
              onCheckedChange={(checked: boolean) =>
                setReminder(prev => ({ ...prev, enabled: checked }))
              }
            />
            <Label htmlFor="reminder-enabled">リマインダーを有効にする</Label>
          </div>

          {reminder.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reminder-time">通知時間</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={reminder.time}
                  onChange={(e) =>
                    setReminder(prev => ({ ...prev, time: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>通知する曜日</Label>
                <div className="flex flex-wrap gap-2">
                  {days.map((day) => (
                    <Button
                      key={day.id}
                      type="button"
                      variant={reminder.days.includes(day.id) ? 'default' : 'outline'}
                      onClick={() => toggleDay(day.id)}
                      className="w-10 h-10 p-0"
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {success && (
            <div className="text-green-500 text-sm">{success}</div>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? '更新中...' : 'リマインダーを更新'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 