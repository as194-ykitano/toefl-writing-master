"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Essay } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function EssayDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEssay = async () => {
      if (!user || !id) return;

      try {
        const essayRef = doc(db, 'users', user.uid, 'essays', id as string);
        const essayDoc = await getDoc(essayRef);
        
        if (!essayDoc.exists()) {
          setError('エッセイが見つかりません。');
          return;
        }

        const essayData = essayDoc.data() as Essay;
        setEssay(essayData);
      } catch (error) {
        console.error('Error loading essay:', error);
        setError('エッセイの読み込み中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    loadEssay();
  }, [user, id]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">読み込み中...</h1>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !essay) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 text-red-600">
                {error || 'エッセイが見つかりません。'}
              </h1>
              <Button asChild className="mt-4">
                <Link href="/dashboard">ダッシュボードに戻る</Link>
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">エッセイ詳細</h1>
              <p className="mt-2 text-gray-600">
                提出日: {(essay.submittedAt instanceof Date 
                  ? essay.submittedAt 
                  : essay.submittedAt?.toDate?.() || new Date()
                ).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">ダッシュボードに戻る</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* エッセイ本文 */}
            <Card>
              <CardHeader>
                <CardTitle>エッセイ本文</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{essay.content}</p>
                </div>
              </CardContent>
            </Card>

            {/* フィードバック */}
            <Card>
              <CardHeader>
                <CardTitle>フィードバック</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {essay.feedback ? (
                  <>
                    <div>
                      <h3 className="font-semibold mb-2">総合評価</h3>
                      <p className="text-gray-700">{essay.feedback.overall}</p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">長所</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {essay.feedback.strengths.map((strength, index) => (
                          <li key={index} className="text-gray-700">{strength}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">改善点</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {essay.feedback.improvements.map((improvement, index) => (
                          <li key={index} className="text-gray-700">{improvement}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">詳細スコア</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">
                            {'topicDevelopment' in essay.feedback.detailedScores ? 'Topic Development' : '統合'}
                          </p>
                          <p className="text-lg font-semibold">
                            {essay.feedback.detailedScores.topicDevelopment || essay.feedback.detailedScores.integration}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">構成</p>
                          <p className="text-lg font-semibold">{essay.feedback.detailedScores.organization}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            {'languageUse' in essay.feedback.detailedScores ? 'Language Use' : '言語'}
                          </p>
                          <p className="text-lg font-semibold">
                            {essay.feedback.detailedScores.languageUse || essay.feedback.detailedScores.language}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">展開</p>
                          <p className="text-lg font-semibold">{essay.feedback.detailedScores.development}</p>
                        </div>
                      </div>
                    </div>

                    {essay.feedback.grammarCorrections.corrections.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">文法修正</h3>
                        <div className="space-y-4">
                          {essay.feedback.grammarCorrections.corrections.map((correction, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <p className="text-sm text-gray-600 mb-2">文脈: {correction.context}</p>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-red-600">{correction.original}</span>
                                <span>→</span>
                                <span className="text-green-600">{correction.corrected}</span>
                              </div>
                              <p className="text-sm text-gray-700">{correction.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">フィードバックはまだ生成されていません。</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 
