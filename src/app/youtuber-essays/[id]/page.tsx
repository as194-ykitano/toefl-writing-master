"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Clock, Target, Play, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import Link from "next/link";
import { YouTuberEssay } from "@/lib/types";
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { markYouTuberFeedbackAsRead } from "@/lib/getEssays";

export default function YouTuberEssayPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const essayId = params?.id as string;
  
  const [essay, setEssay] = useState<YouTuberEssay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && essayId) {
      loadEssay();
    }
  }, [user, essayId]);

  const loadEssay = () => {
    if (!user || !essayId) return;
    
    const essayRef = doc(db, 'users', user.uid, 'youTuberEssays', essayId);
    const unsubscribe = onSnapshot(essayRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as YouTuberEssay;
        const essayData = {
          ...data,
          id: snap.id,
          submittedAt: data.submittedAt instanceof Date ? data.submittedAt : data.submittedAt.toDate()
        };
        setEssay(essayData);
        
        // フィードバックが完了していて、まだ読まれていない場合は既読にマーク
        if (essayData.status === 'feedback_completed' && essayData.feedback && !essayData.feedbackRead) {
          markYouTuberFeedbackAsRead(essayId, user.uid);
        }
      } else {
        console.error('Essay not found');
        router.push('/youtuber-dashboard');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'feedback_completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'feedback_completed':
        return '添削完了';
      case 'processing':
        return '添削中';
      case 'pending':
        return '待機中';
      case 'error':
        return 'エラー';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'feedback_completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date | any) => {
    const dateObj = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
    return dateObj.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 字幕をクリーンアップする関数（メタデータを除去）
  const cleanTranscript = (transcript: string): string => {
    return transcript
      .replace(/Kind: captions Language: en\s*/gi, '') // メタデータを除去
      .replace(/^\s*[\d:]+\s*$/gm, '') // タイムスタンプを除去
      .replace(/\s+/g, ' ') // 複数の空白を1つに
      .trim();
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  if (!user || !essay) {
    return null;
  }

  // ハイライトと文法修正リストで共通のスパン解決ロジック
  const computeResolvedSpans = () => {
    const text = essay.content || '';
    const corrections = essay.feedback?.grammarCorrections?.corrections || [];
    type Span = { start: number; end: number; corrIndex: number };
    const usedSpans: Span[] = [];

    const findNonOverlapping = (start: number, end: number): boolean => {
      return !usedSpans.some((s) => Math.max(s.start, start) < Math.min(s.end, end));
    };

    const locateSpan = (
      orig: string,
      context?: string,
      hintStart?: number,
      hintEnd?: number
    ): { start: number; end: number } | null => {
      if (!orig) return null;

      // 単語境界を考慮した検索（より正確な単語マッチング）
      const wordBoundaryRegex = new RegExp(`\\b${orig.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'gi');
      const matches = Array.from(text.matchAll(wordBoundaryRegex));

      if (matches.length > 0) {
        const ha = hintStart ?? 0;
        const sorted = matches.sort((a, b) => Math.abs((a.index || 0) - ha) - Math.abs((b.index || 0) - ha));
        for (const match of sorted) {
          const s = match.index || 0;
          const e = s + match[0].length;
          if (findNonOverlapping(s, e)) return { start: s, end: e };
        }
      }

      // フォールバック: 通常の文字列検索
      const candidates: number[] = [];
      let idx = text.indexOf(orig);
      while (idx !== -1) {
        candidates.push(idx);
        idx = text.indexOf(orig, idx + 1);
      }
      if (candidates.length) {
        const ha = hintStart ?? 0;
        const sorted = candidates.sort((a, b) => Math.abs(a - ha) - Math.abs(b - ha));
        for (const s of sorted) {
          const e = s + orig.length;
          if (findNonOverlapping(s, e)) return { start: s, end: e };
        }
      }

      // 最後のフォールバック: hint を信頼
      if (typeof hintStart === 'number' && typeof hintEnd === 'number') {
        const s = Math.max(0, Math.min(hintStart, text.length));
        const e = Math.max(s, Math.min(hintEnd, text.length));
        if (findNonOverlapping(s, e)) return { start: s, end: e };
      }
      return null;
    };

    const resolved: Span[] = [];
    corrections.forEach((c, i) => {
      const span = locateSpan(c.original, c.context, c.startIndex as number | undefined, c.endIndex as number | undefined);
      if (span) {
        usedSpans.push({ ...span, corrIndex: i });
        resolved.push({ ...span, corrIndex: i });
      }
    });

    resolved.sort((a, b) => a.start - b.start);
    return { text, corrections, spans: resolved };
  };

  const resolvedForList = computeResolvedSpans();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" asChild className="mr-4">
                <Link href="/youtuber-essays">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  エッセイ履歴に戻る
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                  <FileText className="h-8 w-8 mr-3 text-violet-600" />
                  YouTube Learning 結果
                </h1>
                <p className="text-gray-600">動画ID: {essay.videoId}</p>
              </div>
            </div>
            <Badge className={getStatusColor(essay.status)}>
              <span className="flex items-center">
                {getStatusIcon(essay.status)}
                <span className="ml-1">{getStatusLabel(essay.status)}</span>
              </span>
            </Badge>
          </div>
        </div>

        {/* 基本情報 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>提出情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-600">{essay.wordCount || 0}</div>
                <div className="text-sm text-gray-500">語数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-600">
                  {essay.timeSpent ? `${Math.floor(essay.timeSpent / 60)}:${(essay.timeSpent % 60).toString().padStart(2, '0')}` : '不明'}
                </div>
                <div className="text-sm text-gray-500">所要時間</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-600">
                  {essay.timeSpent && essay.wordCount ? Math.round((essay.wordCount / (essay.timeSpent / 60)) * 10) / 10 : 0}
                </div>
                <div className="text-sm text-gray-500">語/分</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-600">
                  {formatDate(essay.submittedAt)}
                </div>
                <div className="text-sm text-gray-500">提出日時</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* エッセイ内容 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
            <CardTitle>あなたのエッセイ</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{essay.submittedAt instanceof Date ? essay.submittedAt.toLocaleDateString('ja-JP') : (essay.submittedAt?.toDate ? essay.submittedAt.toDate().toLocaleDateString('ja-JP') : (typeof essay.submittedAt === 'string' ? new Date(essay.submittedAt).toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP')))}</span>
                <Clock className="w-4 h-4 ml-2" />
                <span>所要時間: {Math.floor((essay.timeSpent || 0) / 60)}:{(essay.timeSpent || 0) % 60 < 10 ? '0' : ''}{(essay.timeSpent || 0) % 60}</span>
                <span className="ml-4">語数: {essay.wordCount || 0} words</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <TooltipProvider>
                {essay.feedback?.grammarCorrections?.corrections && 
                 essay.feedback.grammarCorrections.corrections.length > 0 ? (
                  <div className="whitespace-pre-wrap essay-text-content">
                    {(() => {
                      const text = essay.content;
                      const corrections = essay.feedback.grammarCorrections.corrections;
                      
                      type Span = { start: number; end: number; corrIndex: number };
                      const usedSpans: Span[] = [];

                      const findNonOverlapping = (start: number, end: number): boolean => {
                        return !usedSpans.some((s) => Math.max(s.start, start) < Math.min(s.end, end));
                      };

                      const locateSpan = (orig: string, context?: string, hintStart?: number, hintEnd?: number): { start: number; end: number } | null => {
                        if (!orig) return null;
                        
                        // 単語境界を考慮した検索（より正確な単語マッチング）
                        const wordBoundaryRegex = new RegExp(`\\b${orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                        const matches = Array.from(text.matchAll(wordBoundaryRegex));
                        
                        if (matches.length > 0) {
                          // 最も近いマッチを選択
                          const sorted = matches.sort((a, b) => {
                            const ha = hintStart ?? 0;
                            return Math.abs(a.index! - ha) - Math.abs(b.index! - ha);
                          });
                          
                          for (const match of sorted) {
                            const s = match.index!;
                            const e = s + match[0].length;
                            if (findNonOverlapping(s, e)) return { start: s, end: e };
                          }
                        }
                        
                        // フォールバック: 通常の文字列検索
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
                        
                        // 最後のフォールバック: hint を信頼
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
                              <span className="bg-yellow-200 cursor-help transition-colors duration-200 hover:bg-yellow-300 hover:ring-2 hover:ring-yellow-400 hover:ring-offset-1 rounded-sm px-1 font-medium">
                                {highlightedText}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm bg-white shadow-lg border border-gray-200 rounded-lg p-4">
                              <div className="space-y-2">
                                <p className="font-medium text-red-600 line-through">修正前: {c.original}</p>
                                <p className="font-medium text-green-600">修正後: {c.corrected}</p>
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

                      return elements;
                    })()}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {essay.content}
                  </div>
                )}
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>

        {/* 字幕内容（フィードバック時のみ表示） */}
        {essay.status === 'feedback_completed' && essay.transcript && (
          <Card className="mb-8">
              <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                動画の内容（字幕）
                <Badge className="ml-2 bg-green-100 text-green-800">
                  {essay.transcript.split(' ').length}語
                </Badge>
              </CardTitle>
              </CardHeader>
              <CardContent>
              <div className="max-h-96 overflow-y-auto text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                {cleanTranscript(essay.transcript)}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ※ この字幕内容は添削時に参考にされました
              </p>
              </CardContent>
            </Card>
        )}

        {/* フィードバック */}
        {essay.status === 'feedback_completed' && essay.feedback ? (
          <div className="space-y-8">


            {/* サマリーの質（該当する場合） */}
            {essay.feedback.summaryQuality && (
              <Card>
                <CardHeader>
                  <CardTitle>サマリーの質</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">良い点</h4>
                      <ul className="space-y-1">
                        {essay.feedback.summaryQuality.goodPoints.map((point, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-700 mb-2">改善点</h4>
                      <ul className="space-y-1">
                        {essay.feedback.summaryQuality.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start">
                            <AlertCircle className="h-4 w-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {essay.feedback.summaryQuality.suggestions && essay.feedback.summaryQuality.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-700 mb-2">提案</h4>
                        <ul className="space-y-1">
                          {essay.feedback.summaryQuality.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start">
                              <Target className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 text-sm">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 意見の質（該当する場合） */}
            {essay.feedback.opinionQuality && (
              <Card>
                <CardHeader>
                  <CardTitle>意見の質</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">良い点</h4>
                      <ul className="space-y-1">
                        {essay.feedback.opinionQuality.goodPoints.map((point, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-700 mb-2">改善点</h4>
                      <ul className="space-y-1">
                        {essay.feedback.opinionQuality.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start">
                            <AlertCircle className="h-4 w-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {essay.feedback.opinionQuality.suggestions && essay.feedback.opinionQuality.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-700 mb-2">提案</h4>
                        <ul className="space-y-1">
                          {essay.feedback.opinionQuality.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start">
                              <Target className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 text-sm">{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 文法修正 */}
            {resolvedForList.corrections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">文法修正</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resolvedForList.spans.map((span, index) => {
                      const correction = resolvedForList.corrections[span.corrIndex];
                      const originalFromEssay = resolvedForList.text.slice(span.start, span.end);
                      return (
                      <div key={`${span.corrIndex}-${span.start}`} className="bg-white border border-gray-200 rounded-lg p-4">
                        {/* 誤りを含む文 */}
                        <div className="mb-3">
                          <div className="text-sm text-gray-500 mb-1">誤りを含む文</div>
                          <div className="bg-gray-50 p-2 rounded text-gray-800">
                            {correction.context}
                            </div>
                          </div>
                        
                        {/* 修正部分 */}
                        <div className="mb-3">
                          <div className="text-sm text-gray-500 mb-1">修正</div>
                          <div className="bg-red-50 p-2 rounded">
                            <span className="line-through text-red-600">{originalFromEssay}</span>
                            <span className="mx-2">→</span>
                            <span className="text-green-600">{correction.corrected}</span>
                            </div>
                          </div>
                        
                        {/* 説明 */}
                        <div className="text-sm text-gray-600">
                          {correction.explanation}
                        </div>
                      </div>
                    );})}
                  </div>
                </CardContent>
              </Card>
            )}


            {/* 解答例 */}
            {essay.feedback.sampleAnswer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-700">解答例</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {essay.feedback.sampleAnswer}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : essay.status === 'processing' || essay.status === 'pending' ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="mx-auto h-12 w-12 text-yellow-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">添削中です</h3>
              <p className="text-gray-600">AIがあなたのエッセイを分析しています。しばらくお待ちください。</p>
            </CardContent>
          </Card>
        ) : essay.status === 'error' ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">エラーが発生しました</h3>
              <p className="text-gray-600">添削処理中にエラーが発生しました。もう一度お試しください。</p>
            </CardContent>
          </Card>
        ) : null}

        {/* アクションボタン */}
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <Button asChild variant="outline">
            <Link href="/youtuber-essays">
              <ArrowLeft className="mr-2 h-4 w-4" />
              エッセイ履歴に戻る
            </Link>
          </Button>
          <Button asChild>
            <Link href="/youtuber-tasks">
              <Play className="mr-2 h-4 w-4" />
              新しい学習を始める
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
