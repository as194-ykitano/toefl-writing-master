"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BasicEssay } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { markBasicFeedbackAsRead } from '@/lib/getEssays';

export default function BasicEssayDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [essay, setEssay] = useState<BasicEssay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEssay = async () => {
      if (!user || !id) return;

      try {
        const essayRef = doc(db, 'users', user.uid, 'basicEssays', id as string);
        const essayDoc = await getDoc(essayRef);
        if (!essayDoc.exists()) {
          setError('エッセイが見つかりません。');
          return;
        }
        const data = essayDoc.data() as BasicEssay;
        setEssay({ ...data, id: essayDoc.id });
        
        // フィードバックが完了していて未読の場合、既読にマーク
        if (data.status === 'feedback_completed' && !data.feedbackRead) {
          await markBasicFeedbackAsRead(id as string, user.uid);
        }
      } catch (e) {
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
              <h1 className="text-2xl font-bold text-gray-900 text-red-600">{error || 'エッセイが見つかりません。'}</h1>
              <Button asChild className="mt-4">
                <Link href="/basic-dashboard">ダッシュボードに戻る</Link>
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const renderHighlightedEssay = () => {
    if (!essay?.content) return null;
    const text = essay.content;
    const corrections = essay.feedback?.grammarCorrections?.corrections || [];
    if (!corrections.length) {
      return <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{text}</div>;
    }

    type Span = { start: number; end: number; corrIndex: number };
    const usedSpans: Span[] = [];

    const findNonOverlapping = (start: number, end: number): boolean => {
      return !usedSpans.some((s) => Math.max(s.start, start) < Math.min(s.end, end));
    };

    const locateSpan = (orig: string, context?: string, hintStart?: number, hintEnd?: number): { start: number; end: number } | null => {
      if (!orig) return null;
      // 1) Context優先: context 全体が本文に存在し、かつその中に original が入っている場合
      if (context && context.length >= orig.length) {
        const ctxIdx = text.indexOf(context);
        if (ctxIdx !== -1) {
          const localIdx = context.indexOf(orig);
          if (localIdx !== -1) {
            const s = ctxIdx + localIdx;
            const e = s + orig.length;
            if (findNonOverlapping(s, e)) return { start: s, end: e };
          }
        }
      }
      // 2) original を本文から探索。hintStart の近い候補を優先
      const candidates: number[] = [];
      let idx = text.indexOf(orig);
      while (idx !== -1) {
        candidates.push(idx);
        idx = text.indexOf(orig, idx + 1);
      }
      if (candidates.length) {
        const sorted = candidates.sort((a, b) => {
          const ha = hintStart ?? 0;
          return Math.abs(a - ha) - Math.abs(b - ha);
        });
        for (const s of sorted) {
          const e = s + orig.length;
          if (findNonOverlapping(s, e)) return { start: s, end: e };
        }
      }
      // 3) フォールバック: hint を信頼
      if (typeof hintStart === 'number' && typeof hintEnd === 'number') {
        const s = Math.max(0, Math.min(hintStart, text.length));
        const e = Math.max(s, Math.min(hintEnd, text.length));
        if (findNonOverlapping(s, e)) return { start: s, end: e };
      }
      return null;
    };

    // 各訂正の実際のスパンを決定
    const resolved: Span[] = [];
    corrections.forEach((c, i) => {
      const span = locateSpan(c.original, c.context, c.startIndex as number | undefined, c.endIndex as number | undefined);
      if (span) {
        usedSpans.push({ ...span, corrIndex: i });
        resolved.push({ ...span, corrIndex: i });
      }
    });

    // 出現順に並べる
    resolved.sort((a, b) => a.start - b.start);

    const elements: React.ReactNode[] = [];
    let cursor = 0;
    let segId = 0;
    resolved.forEach((span) => {
      if (span.start > cursor) {
        elements.push(<span key={`seg-${segId++}`}>{text.slice(cursor, span.start)}</span>);
      }
      const c = corrections[span.corrIndex];
      const highlightedText = text.slice(span.start, span.end);
      const isLengthMatch = highlightedText.length === (c.original || '').length;
      const isFirstCharMatch = highlightedText.charAt(0) === (c.original || '').charAt(0);

      elements.push(
        <Tooltip key={`corr-${span.corrIndex}-${span.start}`}>
          <TooltipTrigger asChild>
            <span className={`${isLengthMatch && isFirstCharMatch ? 'bg-yellow-100' : 'bg-red-100'} cursor-help transition-colors duration-200 hover:bg-opacity-80 hover:ring-2 hover:ring-yellow-400 hover:ring-offset-2 rounded-sm px-0.5`}>
              {highlightedText}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm bg-white shadow-lg border border-gray-200 rounded-lg p-4">
            <div className="space-y-2">
              <p className="font-medium">修正前: {c.original}</p>
              <p className="font-medium">修正後: {c.corrected}</p>
              <p className="text-sm text-gray-600">{c.explanation}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
      cursor = span.end;
    });
    if (cursor < text.length) {
      elements.push(<span key={`seg-${segId++}`}>{text.slice(cursor)}</span>);
    }

    return (
      <TooltipProvider>
        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{elements}</div>
      </TooltipProvider>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">エッセイ詳細（Basic）</h1>
              <p className="mt-2 text-gray-600">提出日: {(() => {
                let dateObj: Date | null = null;
                const val = essay.submittedAt as any;
                if (val && typeof val === 'object' && typeof val.toDate === 'function') {
                  dateObj = val.toDate();
                } else if (val instanceof Date) {
                  dateObj = val;
                } else if (typeof val === 'number') {
                  dateObj = new Date(val);
                } else if (typeof val === 'string') {
                  const parsed = new Date(val);
                  if (!isNaN(parsed.getTime())) dateObj = parsed;
                }
                return dateObj
                  ? dateObj.toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '不明';
              })()}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/basic-dashboard">ダッシュボードに戻る</Link>
              </Button>
              <Button asChild>
                <Link href="/basic-tasks">新しいトレーニング</Link>
              </Button>
            </div>
          </div>

          {/* 1カラム: 本文の下にフィードバック */}
          <Card>
            <CardHeader>
              <CardTitle>エッセイ本文</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {renderHighlightedEssay()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>フィードバック（文法）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {essay.feedback ? (
                <>
                  <div>
                    <h3 className="font-semibold mb-2">全体的な印象</h3>
                    <p className="text-gray-700">{essay.feedback.overall}</p>
                  </div>

                  {essay.feedback.grammarCorrections?.corrections?.length ? (
                    <div>
                      <h3 className="font-semibold mb-2">文法修正</h3>
                      <div className="space-y-4">
                        {essay.feedback.grammarCorrections.corrections.map((c, idx) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-2">文脈: {c.context}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-red-600">{c.original}</span>
                              <span>→</span>
                              <span className="text-green-600">{c.corrected}</span>
                            </div>
                            <p className="text-sm text-gray-700">{c.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">文法修正はありません。</p>
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
    </ProtectedRoute>
  );
}


