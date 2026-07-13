"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useExam } from '@/contexts/ExamContext';
import { auth, db } from '@/lib/firebase';
import AuthThemeToggle from '@/components/auth/AuthThemeToggle';
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

const fieldClass =
  'flex h-12 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-base text-gray-900 dark:text-gray-100 outline-none transition-all focus:border-eg-deep focus:ring-2 focus:ring-eg-deep/20';

/** ラベル＋中身をまとめ、順番にふわっと出すためのラッパー */
function Field({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <div
      className="space-y-2 animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function UserNameSetup() {
  const [fullName, setFullName] = useState('');
  const [lastNameRomaji, setLastNameRomaji] = useState('');
  const [firstNameRomaji, setFirstNameRomaji] = useState('');
  const [learnerStatus, setLearnerStatus] = useState<LearnerStatus | ''>('');
  const [learningReason, setLearningReason] = useState('');
  const [targetExam, setTargetExam] = useState<OnboardingProfile['targetExam'] | ''>('');
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
    const last = lastNameRomaji.trim();
    const first = firstNameRomaji.trim();
    if (!last || !first) {
      setError('お名前のローマ字（名字・名前）を入力してください');
      return;
    }
    if (!/^[A-Za-z][A-Za-z' -]*$/.test(last) || !/^[A-Za-z][A-Za-z' -]*$/.test(first)) {
      setError('ローマ字はアルファベットで入力してください');
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
    if (!targetExam) {
      setError('対策する試験を選択してください');
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

        // ローマ字を「先頭大文字」に整形して保存
        const normalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName: trimmedName,
          lastNameRomaji: normalize(last),
          firstNameRomaji: normalize(first),
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex flex-col items-center px-4 py-16 sm:py-24">
      <AuthThemeToggle />

      <div className="w-full max-w-2xl">
        {/* 見出し（大きめ・中央） */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-9 h-9 rounded-full bg-eg-deep text-white flex items-center justify-center font-bold">
              EG
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Prep Master</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 leading-tight">
            あなたについて
            <br className="sm:hidden" />
            教えてください
          </h1>
          <p className="mt-5 text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            あなたに合った学習プランを作るため、いくつか質問させてください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Field delay={100}>
            <Label htmlFor="fullName" className="text-base font-semibold text-gray-800 dark:text-gray-200">
              お名前
            </Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="山田 太郎"
              autoFocus
              className="h-12 rounded-xl px-4 text-base"
            />
          </Field>

          <Field delay={150}>
            <Label className="text-base font-semibold text-gray-800 dark:text-gray-200">
              お名前（ローマ字）
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  id="lastNameRomaji"
                  type="text"
                  value={lastNameRomaji}
                  onChange={(e) => setLastNameRomaji(e.target.value)}
                  required
                  placeholder="Yamada"
                  autoComplete="off"
                  className="h-12 rounded-xl px-4 text-base"
                />
                <p className="mt-1.5 text-xs text-gray-400">名字（例: Yamada）</p>
              </div>
              <div>
                <Input
                  id="firstNameRomaji"
                  type="text"
                  value={firstNameRomaji}
                  onChange={(e) => setFirstNameRomaji(e.target.value)}
                  required
                  placeholder="Taro"
                  autoComplete="off"
                  className="h-12 rounded-xl px-4 text-base"
                />
                <p className="mt-1.5 text-xs text-gray-400">名前（例: Taro）</p>
              </div>
            </div>
          </Field>

          <Field delay={200}>
            <Label htmlFor="learnerStatus" className="text-base font-semibold text-gray-800 dark:text-gray-200">
              現在の学年・立場
            </Label>
            <select
              id="learnerStatus"
              className={fieldClass}
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
          </Field>

          <Field delay={300}>
            <Label htmlFor="learningReason" className="text-base font-semibold text-gray-800 dark:text-gray-200">
              英語を学ぶ理由
            </Label>
            <Textarea
              id="learningReason"
              value={learningReason}
              onChange={(e) => setLearningReason(e.target.value)}
              required
              placeholder="例: 海外大学院への出願のため／仕事で英語を使うため など"
              className="min-h-[110px] rounded-xl px-4 py-3 text-base"
            />
          </Field>

          <Field delay={400}>
            <Label htmlFor="targetExam" className="text-base font-semibold text-gray-800 dark:text-gray-200">
              対策する試験
            </Label>
            <select
              id="targetExam"
              className={fieldClass}
              value={targetExam}
              onChange={(e) => setTargetExam(e.target.value as OnboardingProfile['targetExam'])}
              required
            >
              <option value="" disabled>
                選択してください
              </option>
              {EXAM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field delay={500}>
            <Label className="text-base font-semibold text-gray-800 dark:text-gray-200">
              目標スコアと時期（任意）
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  id="targetScore"
                  type="number"
                  step="0.5"
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                  placeholder={scoreHint}
                  className="h-12 rounded-xl px-4 text-base"
                />
                <p className="mt-1.5 text-xs text-gray-400">{scoreHint}</p>
              </div>
              <div>
                <Input
                  id="targetDate"
                  type="month"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-12 rounded-xl px-4 text-base dark:[color-scheme:dark]"
                />
                <p className="mt-1.5 text-xs text-gray-400">いつまでに達成したいか</p>
              </div>
            </div>
          </Field>

          {error && (
            <div className="text-red-500 text-sm text-center animate-in fade-in duration-300">{error}</div>
          )}

          <div
            className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700"
            style={{ animationDelay: '600ms' }}
          >
            <Button
              type="submit"
              className="w-full h-auto py-3.5 text-base font-semibold rounded-xl transition-transform hover:scale-[1.01] active:scale-[0.99]"
              disabled={loading}
            >
              {loading ? '保存中...' : '学習を始める'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
