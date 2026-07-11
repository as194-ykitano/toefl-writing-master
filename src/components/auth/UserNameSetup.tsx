"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useExam } from '@/contexts/ExamContext';
import { auth, db } from '@/lib/firebase';
import type { LearnerStatus, OnboardingProfile } from '@/lib/types';

type ErrorWithMessage = {
  message?: string;
};

const STATUS_OPTIONS: { value: LearnerStatus; label: string }[] = [
  { value: 'junior_high', label: '中学生' },
  { value: 'high_school', label: '高校生' },
  { value: 'university', label: '大学生・専門学校生' },
  { value: 'working', label: '社会人' },
  { value: 'other', label: 'その他' },
];

const EXAM_OPTIONS: { value: OnboardingProfile['targetExam']; label: string; scoreHint: string }[] = [
  { value: 'toefl', label: 'TOEFL iBT', scoreHint: '例: 80（0〜120）' },
  { value: 'ielts', label: 'IELTS Academic', scoreHint: '例: 6.5（0〜9.0）' },
  { value: 'toeic', label: 'TOEIC', scoreHint: '例: 800（10〜990）' },
];

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function UserNameSetup() {
  const [fullName, setFullName] = useState('');
  const [learnerStatus, setLearnerStatus] = useState<LearnerStatus | ''>('');
  const [learningReason, setLearningReason] = useState('');
  const [targetExam, setTargetExam] = useState<OnboardingProfile['targetExam']>('toefl');
  const [targetScore, setTargetScore] = useState('');
  const [targetDate, setTargetDate] = useState(''); // yyyy-mm
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { setExam } = useExam();

  const scoreHint = EXAM_OPTIONS.find((e) => e.value === targetExam)?.scoreHint ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('お名前は2文字以上で入力してください');
      return;
    }
    if (!learnerStatus) {
      setError('現在の学年・立場を選択してください');
      return;
    }
    if (!learningReason.trim()) {
      setError('英語を学ぶ理由を入力してください');
      return;
    }

    setLoading(true);

    try {
      if (user && auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName,
        });

        const onboarding: OnboardingProfile = {
          learnerStatus,
          learningReason: learningReason.trim(),
          targetExam,
          ...(targetScore.trim() ? { targetScore: Number(targetScore) } : {}),
          ...(targetDate ? { targetDate } : {}),
          completedAt: new Date().toISOString(),
        };

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName: trimmedName,
          onboarding,
        });

        // 選択した試験をアプリ全体の切替に反映
        setExam(targetExam);

        router.push('/welcome');
      }
    } catch (error) {
      console.error('Error saving onboarding profile:', error);
      setError((error as ErrorWithMessage).message || 'プロフィールの保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">あなたについて教えてください</h1>
          <p className="mt-2 text-gray-600">
            あなたに合った学習プランを作るため、いくつか質問させてください。
          </p>
        </div>

        <Card className="w-full p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">お名前</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="山田 太郎"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="learnerStatus">現在の学年・立場</Label>
              <select
                id="learnerStatus"
                className={selectClass}
                value={learnerStatus}
                onChange={(e) => setLearnerStatus(e.target.value as LearnerStatus)}
                required
              >
                <option value="" disabled>
                  選択してください
                </option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="learningReason">英語を学ぶ理由</Label>
              <Textarea
                id="learningReason"
                value={learningReason}
                onChange={(e) => setLearningReason(e.target.value)}
                required
                placeholder="例: 海外大学院への出願のため／仕事で英語を使うため など"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetExam">対策する試験</Label>
              <select
                id="targetExam"
                className={selectClass}
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value as OnboardingProfile['targetExam'])}
              >
                {EXAM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetScore">目標スコア（任意）</Label>
                <Input
                  id="targetScore"
                  type="number"
                  step="0.5"
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                  placeholder={scoreHint}
                />
                <p className="text-xs text-gray-500">{scoreHint}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDate">目標時期（任意）</Label>
                <Input
                  id="targetDate"
                  type="month"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
                <p className="text-xs text-gray-500">いつまでに達成したいか</p>
              </div>
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '保存中...' : '学習を始める'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
