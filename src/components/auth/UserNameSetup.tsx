"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase';

type ErrorWithMessage = {
  message?: string;
};

export default function UserNameSetup() {
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('フルネームを入力してください');
      return;
    }

    if (trimmedName.length < 2) {
      setError('フルネームは2文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      if (user && auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName,
        });

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName: trimmedName,
        });

        router.push('/training-selection');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      setError((error as ErrorWithMessage).message || 'ユーザー名の更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">ようこそ</h1>
          <p className="mt-2 text-gray-600">学習を始める前に、あなたの名前を教えてください</p>
        </div>

        <Card className="w-full max-w-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">フルネーム</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="山田 太郎"
                className="text-center text-lg"
                autoFocus
              />
              <p className="text-sm text-gray-500">例: 山田 太郎、John Smith</p>
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '保存中...' : '名前を保存'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
