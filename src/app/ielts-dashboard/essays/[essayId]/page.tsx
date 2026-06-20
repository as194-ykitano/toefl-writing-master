'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Target, FileText, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { Essay, Task } from '@/lib/types';
import { getTaskById } from '@/lib/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { markFeedbackAsRead } from '@/lib/getEssays';
import { getIELTSEssayFeedback } from '@/lib/firebase';
import IELTSTaskDetailModal from '@/components/IELTSTaskDetailModal';

type IELTSDetailedScores = {
  taskAchievement?: number;
  taskResponse?: number;
  coherenceCohesion?: number;
  lexicalResource?: number;
  grammaticalRange?: number;
};

type SuggestionDetails = {
  suggestion?: string;
  title?: string;
  implementation?: string;
  whereToInclude?: string;
  effectiveness?: string;
  reasoning?: string;
  example?: string;
};

type IELTSEssay = Essay & {
  feedback?: {
    overall: string;
    strengths: string[];
    improvements: string[];
    detailedScores: {
      taskAchievement?: number;
      taskResponse?: number;
      coherenceCohesion: number;
      lexicalResource: number;
      grammaticalRange: number;
    };
    taskResponse: {
      goodPoints: string[];
      improvements: string[];
    };
    generalDescription: {
      goodPoints: string[];
      improvements: string[];
    };
    specificSuggestions: {
      suggestions: string[];
    };
    grammarCorrections: {
      corrections: Array<{
        original: string;
        corrected: string;
        explanation: string;
        context: string;
        startIndex: number;
        endIndex: number;
      }>;
    };
  };
};

export default function IELTSEssayDetailPage() {
  const { essayId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [essay, setEssay] = useState<IELTSEssay | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid, 'essays', essayId as string),
      async (doc) => {
        try {
          if (!doc.exists()) {
            setError('エッセイが見つかりません。指定されたエッセイは存在しないか、削除された可能性があります。');
            setLoading(false);
            return;
          }

          const essayData = doc.data();
          const reconstructedEssay = {
            id: doc.id,
            userId: user.uid,
            taskId: essayData.taskId,
            content: essayData.content,
            submittedAt: essayData.submittedAt?.toDate?.() || 
                        (typeof essayData.submittedAt === 'string' ? new Date(essayData.submittedAt) : 
                        (typeof essayData.submittedAt === 'number' ? new Date(essayData.submittedAt) : 
                        new Date())),
            status: essayData.status || 'completed',
            feedbackRead: essayData.feedbackRead || false,
            score: essayData.score,
            feedback: essayData.feedback ? {
              overall: essayData.feedback.overall,
              strengths: essayData.feedback.strengths || [],
              improvements: essayData.feedback.improvements || [],
              detailedScores: {
                taskAchievement: essayData.feedback.detailedScores?.taskAchievement || 0,
                taskResponse: essayData.feedback.detailedScores?.taskResponse || 0,
                coherenceCohesion: essayData.feedback.detailedScores?.coherenceCohesion || 0,
                lexicalResource: essayData.feedback.detailedScores?.lexicalResource || 0,
                grammaticalRange: essayData.feedback.detailedScores?.grammaticalRange || 0
              },
              taskResponse: {
                goodPoints: essayData.feedback.taskResponse?.goodPoints || [],
                improvements: essayData.feedback.taskResponse?.improvements || []
              },
              generalDescription: {
                goodPoints: essayData.feedback.generalDescription?.goodPoints || [],
                improvements: essayData.feedback.generalDescription?.improvements || []
              },
              specificSuggestions: {
                suggestions: essayData.feedback.specificSuggestions?.suggestions || []
              },
              grammarCorrections: essayData.feedback.grammarCorrections || { corrections: [] }
            } : undefined,
            timeSpent: essayData.timeSpent,
            wordCount: essayData.wordCount
          } as IELTSEssay;
          setEssay(reconstructedEssay);

          // フィードバックが完了していて、まだ読まれていない場合は確認済みにマーク
          if (reconstructedEssay.status === 'feedback_completed' && 
              reconstructedEssay.feedback && 
              !reconstructedEssay.feedbackRead) {
            await markFeedbackAsRead(essayId as string, user.uid);
          }

          if (reconstructedEssay.taskId) {
            try {
              const taskData = await getTaskById(reconstructedEssay.taskId);
              setTask(taskData);
            } catch (taskError) {
              console.error('Error fetching task:', taskError);
            }
          }

          setLoading(false);
        } catch (error) {
          console.error('Error processing essay data:', error);
          setError('エッセイデータの処理中にエラーが発生しました。');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to essay document:', error);
        setError('エッセイの取得中にエラーが発生しました。');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, essayId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // IELTSスコアを計算する関数（修正版）
  const calculateIELTSScore = (detailedScores: IELTSDetailedScores | undefined) => {
    if (!detailedScores) return 0;
    
    const { taskAchievement, taskResponse, coherenceCohesion, lexicalResource, grammaticalRange } = detailedScores;
    
    // 有効なスコアのみを計算に含める（Task 1とTask 2で異なるフィールド名）
    const validScores = [taskAchievement, taskResponse, coherenceCohesion, lexicalResource, grammaticalRange]
      .filter((score): score is number => score !== undefined && score > 0);
    
    if (validScores.length === 0) return 0;
    
    // 平均スコアを計算（GPTが既に9点満点で返すので変換不要）
    const averageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    
    // 0.5刻みに丸める
    return Math.round(averageScore * 2) / 2;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button asChild>
            <Link href="/ielts-dashboard">IELTSダッシュボードに戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!essay) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">エッセイが見つかりません</p>
        </div>
      </div>
    );
  }

  // 計算されたスコア
  const calculatedScore = essay.feedback?.detailedScores ? 
    calculateIELTSScore(essay.feedback.detailedScores) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">IELTS エッセイ詳細</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/ielts-dashboard">
                  <FileText className="w-4 h-4 mr-2" />
                  IELTSダッシュボード
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 左カラム: エッセイ内容 - 全幅に拡張 */}
        <div className="max-w-4xl mx-auto">
          {/* スコアカード - 最上部に移動 */}
          {essay.feedback?.detailedScores && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                スコア
              </h3>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {calculatedScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">総合スコア</div>
                </div>
                
                <div className="space-y-3">
                  {task?.taskType === 'task1' ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Task Achievement</span>
                      <span className="font-semibold">{essay.feedback.detailedScores.taskAchievement}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Task Response</span>
                      <span className="font-semibold">{essay.feedback.detailedScores.taskResponse}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Coherence & Cohesion</span>
                    <span className="font-semibold">{essay.feedback.detailedScores.coherenceCohesion}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Lexical Resource</span>
                    <span className="font-semibold">{essay.feedback.detailedScores.lexicalResource}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Grammatical Range</span>
                    <span className="font-semibold">{essay.feedback.detailedScores.grammaticalRange}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* タスク詳細 - スコアの下に移動 */}
          {task && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">タスク詳細</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTaskDetailModalOpen(true)}
                >
                  問題と解答解説を見る
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-gray-700"><strong>タイトル:</strong> {task.title}</p>
                <p className="text-gray-700"><strong>説明:</strong> {task.description}</p>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {task.taskType === 'task1' ? 'Task 1 (Academic Writing)' : 'Task 2 (Essay Writing)'}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                    {task.difficulty}
                  </span>
                </div>
              </div>
            </div>
          )}

                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">エッセイ内容</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{essay.submittedAt instanceof Date ? essay.submittedAt.toLocaleDateString('ja-JP') : (essay.submittedAt?.toDate ? essay.submittedAt.toDate().toLocaleDateString('ja-JP') : (typeof essay.submittedAt === 'string' ? new Date(essay.submittedAt).toLocaleDateString('ja-JP') : essay.submittedAt?.toDate ? essay.submittedAt.toDate().toLocaleDateString('ja-JP') : new Date().toLocaleDateString('ja-JP')))}</span>
                  <Clock className="w-4 h-4 ml-2" />
                  <span>所要時間: {formatTime(essay.timeSpent || 0)}</span>
                  <span className="ml-4">語数: {essay.wordCount || 0} words</span>
                </div>
              </div>

            <div className="prose max-w-none">
              <TooltipProvider>
                {essay.feedback?.grammarCorrections?.corrections && 
                 essay.feedback.grammarCorrections.corrections.length > 0 ? (
                  <div className="whitespace-pre-wrap essay-text-content">
                    {(() => {
                      const elements: React.ReactNode[] = [];
                      let lastIndex = 0;
                      let textSegmentIndex = 0;
                      // 補正: インデックス順に並べ、重複・逆転・範囲外を除外
                      const content = essay.content || '';
                      const contentLength = content.length;
                      const sortedCorrections = [...essay.feedback.grammarCorrections.corrections]
                        .filter(c => typeof c.startIndex === 'number' && typeof c.endIndex === 'number')
                        .map(c => ({
                          ...c,
                          startIndex: Math.max(0, Math.min(contentLength, c.startIndex)),
                          endIndex: Math.max(0, Math.min(contentLength, c.endIndex))
                        }))
                        .filter(c => c.endIndex > c.startIndex)
                        .sort((a, b) => a.startIndex - b.startIndex);

                      sortedCorrections.forEach((correction, index) => {
                        // 重複・オーバーラップはスキップ
                        if (correction.startIndex < lastIndex) {
                          return;
                        }
                        // 修正前のテキストを追加
                        if (correction.startIndex > lastIndex) {
                          elements.push(
                            <span key={`text-segment-${textSegmentIndex++}`}>
                              {content.slice(lastIndex, correction.startIndex)}
                            </span>
                          );
                        }

                        // 修正されたテキストをハイライト表示
                        const highlightedText = content.slice(correction.startIndex, correction.endIndex);
                        const isLengthMatch = highlightedText.length === correction.original.length;
                        const isFirstCharMatch = highlightedText.charAt(0) === correction.original.charAt(0);

                        elements.push(
                          <Tooltip key={`correction-${index}`}>
                            <TooltipTrigger asChild>
                              <span className={`
                                ${isLengthMatch && isFirstCharMatch ? 'bg-yellow-100' : 'bg-red-100'}
                                cursor-help
                                transition-colors duration-200
                                hover:bg-opacity-80
                                hover:ring-2 hover:ring-yellow-400
                                hover:ring-offset-2
                                rounded-sm
                                px-0.5
                              `}>
                                {highlightedText}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm bg-white shadow-lg border border-gray-200 rounded-lg p-4">
                              <div className="space-y-2">
                                <p className="font-medium">修正前: {correction.original}</p>
                                <p className="font-medium">修正後: {correction.corrected}</p>
                                <p className="text-sm text-gray-600">{correction.explanation}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );

                        lastIndex = correction.endIndex;
                      });

                      // 残りのテキストを追加
                      if (lastIndex < content.length) {
                        elements.push(
                          <span key={`text-segment-${textSegmentIndex}`}>
                            {content.slice(lastIndex)}
                          </span>
                        );
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
          </div>

          {/* フィードバック詳細 */}
          {essay.feedback && (
            <div className="space-y-6">
              {/* 全体評価 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">全体評価</h3>
                <p className="text-gray-700">{essay.feedback.overall}</p>
              </div>

              {/* 長所と改善点 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <ul className="space-y-2">
                    {essay.feedback.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <ul className="space-y-2">
                    {essay.feedback.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              

              {/* General Description */}
              {essay.feedback.generalDescription && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">General Description</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">良い点</h4>
                      <ul className="space-y-2">
                        {essay.feedback.generalDescription.goodPoints.map((point, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">改善点</h4>
                      <ul className="space-y-2">
                        {essay.feedback.generalDescription.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 具体的な改善提案 */}
              {essay.feedback.specificSuggestions && essay.feedback.specificSuggestions.suggestions.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">具体的な改善提案</h3>
                  <ul className="space-y-2">
                    {essay.feedback.specificSuggestions.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <Lightbulb className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">
                          {typeof suggestion === 'string'
                            ? suggestion
                            : suggestion && typeof suggestion === 'object'
                            ? [
                                (suggestion as SuggestionDetails).suggestion || (suggestion as SuggestionDetails).title,
                                (suggestion as SuggestionDetails).implementation,
                                (suggestion as SuggestionDetails).whereToInclude,
                                (suggestion as SuggestionDetails).effectiveness || (suggestion as SuggestionDetails).reasoning,
                                (suggestion as SuggestionDetails).example,
                              ]
                                .filter(Boolean)
                                .join(' / ')
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 文法修正 */}
              {essay.feedback.grammarCorrections?.corrections.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">文法修正</h3>
                  <div className="space-y-4">
                    {essay.feedback.grammarCorrections.corrections.map((correction, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start space-x-2 mb-2">
                          <div className="flex-1">
                            <div className="text-sm text-gray-500 mb-1">誤りを含む文</div>
                            <div className="bg-gray-50 p-2 rounded">
                              {correction.context}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="flex-1">
                            <div className="text-sm text-gray-500 mb-1">修正</div>
                            <div className="bg-red-50 p-2 rounded">
                              <span className="line-through text-red-600">{correction.original}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-600">{correction.corrected}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          {correction.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* フィードバック未完了の場合 */}
          {essay.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">添削処理中</h3>
              <p className="text-yellow-700">
                エッセイの添削を処理中です。しばらくお待ちください。
              </p>
            </div>
          )}

          {essay.status === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">AI添削中</h3>
              <p className="text-blue-700">
                AIがエッセイを分析し、詳細なフィードバックを作成中です。
              </p>
            </div>
          )}

          {essay.status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">添削処理エラー</h3>
              <p className="text-red-700">
                エッセイの添削処理中にエラーが発生しました。しばらく時間をおいてから再度お試しください。
              </p>
              <Button 
                className="mt-4"
                onClick={async () => {
                  if (!user) return;
                  try {
                    await getIELTSEssayFeedback(essayId as string, user.uid);
                  } catch (error) {
                    console.error('Error retrying feedback:', error);
                  }
                }}
              >
                再試行
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* タスク詳細モーダル */}
      {task && (
        <IELTSTaskDetailModal
          task={task}
          isOpen={isTaskDetailModalOpen}
          onClose={() => setIsTaskDetailModalOpen(false)}
        />
      )}


    </div>
  );
}
