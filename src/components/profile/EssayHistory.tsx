"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Essay } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function EssayHistory() {
  const { user } = useAuth();
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEssays = async () => {
      if (!user) return;

      try {
        setError(null);
        const userDocRef = doc(db, 'users', user.uid);
        const essaysRef = collection(userDocRef, 'essays');
        const q = query(
          essaysRef,
          orderBy('submittedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const essayList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Essay[];

        setEssays(essayList);
      } catch (error: any) {
        console.error('Error loading essays:', error);
        if (error.code === 'permission-denied') {
          setError('アクセス権限がありません。管理者にお問い合わせください。');
        } else if (error.code === 'failed-precondition') {
          setError('データベースの設定が必要です。管理者にお問い合わせください。');
        } else {
          setError('エッセイの読み込み中にエラーが発生しました。');
        }
      } finally {
        setLoading(false);
      }
    };

    loadEssays();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>エッセイ履歴</CardTitle>
      </CardHeader>
      <CardContent>
        {essays.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">まだエッセイが提出されていません。</p>
            <Button asChild className="mt-4">
              <Link href="/practice">新しいエッセイを書く</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {essays.map((essay) => (
              <div
                key={essay.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">
                      {(essay.submittedAt instanceof Date 
                        ? essay.submittedAt 
                        : essay.submittedAt?.toDate?.() || new Date()
                      ).toLocaleDateString('ja-JP')}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      スコア: {essay.score?.toFixed(1) || 
                        essay.status === 'processing' ? 'AI添削中' :
                        essay.status === 'error' ? 'エラー' :
                        '評価中'}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/essays/${essay.id}`}>詳細を見る</Link>
                  </Button>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {essay.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 