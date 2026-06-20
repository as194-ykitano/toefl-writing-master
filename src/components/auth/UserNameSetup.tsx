"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function UserNameSetup() {
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!fullName.trim()) {
      setError('フルネームを入力してください');
      return;
    }

    if (fullName.trim().length < 2) {
      setError('フルネームは2文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      if (user && auth.currentUser) {
        // Firebase AuthのdisplayNameを更新
        await updateProfile(auth.currentUser, {
          displayName: fullName.trim()
        });

        // Firestoreのユーザープロファイルも更新
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName: fullName.trim()
        });

        // トレーニング選択ページに遷移
        router.push('/training-selection');
      }
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      setError('ユーザーネームの更新に失敗しました。もう一度お試しください。');
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
          <h1 className="text-3xl font-bold text-gray-900">ようこそ！</h1>
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
              <p className="text-sm text-gray-500">
                例：山田 太郎、佐藤 花子
              </p>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? '処理中...' : '学習を始める'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
