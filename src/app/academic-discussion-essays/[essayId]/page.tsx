'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Clock, FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
type SuggestionDetails = {
  suggestion?: string;
  title?: string;
  implementation?: string;
  whereToInclude?: string;
  effectiveness?: string;
  reasoning?: string;
  example?: string;
};
type SuggestionItem = string | SuggestionDetails;
interface AcademicDiscussionEssay {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  submittedAt: any;
  score: number;
  wordCount: number;
  timeSpent: number;
  status: string;
  feedbackRead?: boolean;
  feedback: {
    overall: string;
    strengths: string[];
    improvements: string[];
    detailedScores: {
      topicDevelopment: number;
      languageUse: number;
      organization: number;
      development: number;
    };
    topicDevelopment: {
      goodPoints: string[];
      improvements: string[];
    };
    languageUse: {
      goodPoints: string[];
      improvements: string[];
    };
    organization: {
      goodPoints: string[];
      improvements: string[];
    };
    development: {
      goodPoints: string[];
      improvements: string[];
    };
    specificSuggestions: {
      suggestions: SuggestionItem[];
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
    modelAnswer?: string; // 解答例
  };
}

interface TaskData {
  id: string;
  title: string;
  discussionContent: {
    professor: string;
    student1: string;
    student2: string;
    question: string;
    professorName?: string;
    student1Name?: string;
    student2Name?: string;
  };
  japaneseTranslation?: string;
}

export default function AcademicDiscussionEssayDetailPage() {
  const { essayId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [essay, setEssay] = useState<AcademicDiscussionEssay | null>(null);
  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchEssay = async () => {
      try {
        const essayDoc = await getDoc(doc(db, 'users', user.uid, 'essays', essayId as string));
        if (essayDoc.exists()) {
          const essayData = essayDoc.data();
          
          // Academic Discussionのエッセイかどうかを確認
          const isAcademicDiscussion = essayData.taskType === 'academic_discussion' || 
            (essayData.feedback && essayData.feedback.detailedScores && 
             'topicDevelopment' in essayData.feedback.detailedScores);
          
          if (isAcademicDiscussion) {
            const essayWithData = {
              id: essayDoc.id,
              ...essayData,
              submittedAt: essayData.submittedAt?.toDate(),
            } as AcademicDiscussionEssay;
            
            setEssay(essayWithData);
            
            // フィードバックが完了していて未読の場合は読み取り済みにマーク
            if (essayData.status === 'feedback_completed' && !essayData.feedbackRead) {
              try {
                await updateDoc(doc(db, 'users', user.uid, 'essays', essayDoc.id), {
                  feedbackRead: true
                });
                console.log('Feedback marked as read for essay:', essayDoc.id);
              } catch (updateError) {
                console.error('Error updating feedbackRead status:', updateError);
              }
            }
            
            // タスク情報を取得
            if (essayData.taskId) {
              try {
                const taskDoc = await getDoc(doc(db, 'tasks', essayData.taskId));
                if (taskDoc.exists()) {
                  const taskInfo = taskDoc.data();
                  setTaskData({
                    id: taskDoc.id,
                    title: taskInfo.title || 'Untitled Task',
                    discussionContent: taskInfo.discussionContent || {
                      professor: '',
                      student1: '',
                      student2: '',
                      question: '',
                      professorName: 'Professor',
                      student1Name: 'Student 1',
                      student2Name: 'Student 2',
                    },
                    japaneseTranslation: taskInfo.japaneseTranslation || '',
                  });
                }
              } catch (taskError) {
                console.error('Error fetching task data:', taskError);
              }
            }
          } else {
            setError('このエッセイはAcademic Discussionではありません。');
          }
        } else {
          setError('エッセイが見つかりません。');
        }
      } catch (error) {
        console.error('Error fetching essay:', error);
        setError('エッセイの取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchEssay();
  }, [essayId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">エラーが発生しました</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>戻る</Button>
        </div>
      </div>
    );
  }

  if (!essay) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">エッセイが見つかりません</h1>
          <Button onClick={() => router.back()}>戻る</Button>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 p-0 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            エッセイ一覧に戻る
          </Button>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Academic Discussion Essay Detail
          </h1>
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDate(essay.submittedAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{essay.wordCount}語</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatTime(essay.timeSpent)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>スコア: {essay.score}/30</span>
            </div>
          </div>
        </div>

        {/* エッセイ本文 */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">あなたのエッセイ</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
          <TooltipProvider>
              <div className="whitespace-pre-wrap text-gray-900 leading-relaxed essay-text-content relative">
                {essay.feedback?.grammarCorrections?.corrections ? (
                  (() => {
                    let lastIndex = 0;
                    const elements = [];
                    let textSegmentIndex = 0;
                    
                    // 修正箇所を開始位置でソート
                    const sortedCorrections = [...(essay.feedback?.grammarCorrections?.corrections || [])].sort(
                      (a, b) => a.startIndex - b.startIndex
                    );

                    // 各修正箇所を処理
                    sortedCorrections.forEach((correction, index) => {
                      // 修正箇所の前のテキストを追加
                      if (correction.startIndex > lastIndex) {
                        const beforeText = essay.content.slice(lastIndex, correction.startIndex);
                        if (beforeText) {
                          elements.push(
                            <span key={`text-${textSegmentIndex++}`} className="text-gray-900">
                              {beforeText}
                            </span>
                          );
                        }
                      }

                      // 修正箇所をハイライト
                      const highlightedText = essay.content.slice(correction.startIndex, correction.endIndex);
                      if (highlightedText) {
                        elements.push(
                          <Tooltip key={`correction-${index}`}>
                            <TooltipTrigger asChild>
                              <span className="bg-yellow-200 text-gray-900 px-1 rounded cursor-pointer hover:bg-yellow-300 transition-colors">
                                {highlightedText}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-red-500 line-through font-medium">{correction.original}</span>
                                  <span className="mx-2">→</span>
                                  <span className="text-green-500 font-medium">{correction.corrected}</span>
                                </div>
                                <p className="text-sm text-gray-600">{correction.explanation}</p>
                                {correction.context && (
                                  <p className="text-xs text-gray-500 italic">Context: {correction.context}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      lastIndex = correction.endIndex;
                    });

                    // 最後の修正箇所の後のテキストを追加
                    if (lastIndex < essay.content.length) {
                      const afterText = essay.content.slice(lastIndex);
                      if (afterText) {
                        elements.push(
                          <span key={`text-${textSegmentIndex++}`} className="text-gray-900">
                            {afterText}
                          </span>
                        );
                      }
                    }

                    return elements.length > 0 ? elements : (
                      <span className="text-gray-900">{essay.content}</span>
                    );
                  })()
                ) : (
                  <span className="text-gray-900">{essay.content}</span>
                )}
              </div>
            </TooltipProvider>
          </div>
        </Card>

        {/* 問題内容 */}
        {taskData && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">問題内容</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{taskData.title}</h4>
                <p className="text-gray-700">{taskData.discussionContent.question}</p>
              </div>
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-1">{taskData.discussionContent.professorName}:</p>
                  <p className="text-gray-700">{taskData.discussionContent.professor}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-1">{taskData.discussionContent.student1Name}:</p>
                  <p className="text-gray-700">{taskData.discussionContent.student1}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-purple-800 mb-1">{taskData.discussionContent.student2Name}:</p>
                  <p className="text-gray-700">{taskData.discussionContent.student2}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 日本語訳 */}
        {taskData?.japaneseTranslation && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">問題内容の日本語訳</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-800 whitespace-pre-wrap">{taskData.japaneseTranslation}</p>
            </div>
          </Card>
        )}

        {/* 解答例 */}
        {essay.feedback?.modelAnswer && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">解答例</h3>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-gray-800 whitespace-pre-wrap">{essay.feedback.modelAnswer}</p>
            </div>
          </Card>
        )}

        {/* フィードバック */}
        {essay.feedback && (
          <div className="space-y-6">
            {/* 全体評価 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">全体評価</h3>
              <p className="text-gray-700">{essay.feedback.overall}</p>
            </Card>

            {/* スコア */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">スコア</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 mb-1">Topic Development</div>
                  <div className="text-2xl font-bold text-blue-700">{essay.feedback.detailedScores.topicDevelopment || 0}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 mb-1">Organization</div>
                  <div className="text-2xl font-bold text-green-700">{essay.feedback.detailedScores.organization || 0}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 mb-1">Language Use</div>
                  <div className="text-2xl font-bold text-purple-700">{essay.feedback.detailedScores.languageUse || 0}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600 mb-1">Development</div>
                  <div className="text-2xl font-bold text-orange-700">{essay.feedback.detailedScores.development || 0}</div>
                </div>
              </div>
              {/* 総合スコア表示（30点満点換算） */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-center">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1 text-center">総合スコア</div>
                    <div className="text-3xl font-bold text-gray-800 text-center">
                      {(() => {
                        const scores = [
                          essay.feedback.detailedScores.topicDevelopment || 0,
                          essay.feedback.detailedScores.organization || 0,
                          essay.feedback.detailedScores.languageUse || 0,
                          essay.feedback.detailedScores.development || 0
                        ];
                        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                        // 換算表を使用
                        const rubricToScaledScore = [
                          { mean: 5.00, score: 30 },
                          { mean: 4.75, score: 29 },
                          { mean: 4.50, score: 28 },
                          { mean: 4.25, score: 27 },
                          { mean: 4.00, score: 25 },
                          { mean: 3.75, score: 24 },
                          { mean: 3.50, score: 22 },
                          { mean: 3.25, score: 21 },
                          { mean: 3.00, score: 20 },
                          { mean: 2.75, score: 18 },
                          { mean: 2.50, score: 17 },
                          { mean: 2.25, score: 15 },
                          { mean: 2.00, score: 14 },
                          { mean: 1.75, score: 12 },
                          { mean: 1.50, score: 11 },
                          { mean: 1.25, score: 10 },
                          { mean: 1.00, score: 8 },
                          { mean: 0.75, score: 7 },
                          { mean: 0.50, score: 5 },
                          { mean: 0.25, score: 4 },
                          { mean: 0.00, score: 0 },
                        ];
                        const scaledScore = rubricToScaledScore.find(entry => average >= entry.mean)?.score || 0;
                        return `${scaledScore}/30`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 長所と改善点 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-green-700">長所</h3>
                <ul className="space-y-2">
                  {essay.feedback.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-red-700">改善点</h3>
                <ul className="space-y-2">
                  {essay.feedback.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span className="text-gray-700">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* 詳細フィードバック */}
            <div className="space-y-6">
              {/* Topic Development */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Topic Development（トピック展開）</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
                    <ul className="list-disc list-inside space-y-2">
                      {essay.feedback.topicDevelopment.goodPoints.map((point, index) => (
                        <li key={index} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
                    <ul className="list-disc list-inside space-y-2">
                      {essay.feedback.topicDevelopment.improvements.map((improvement, index) => (
                        <li key={index} className="text-gray-700">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Language Use */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Language Use（言語使用）</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
                    <ul className="list-disc list-inside space-y-2">
                      {essay.feedback.languageUse.goodPoints.map((point, index) => (
                        <li key={index} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
                    <ul className="list-disc list-inside space-y-2">
                      {essay.feedback.languageUse.improvements.map((improvement, index) => (
                        <li key={index} className="text-gray-700">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Organization */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Organization（構成）</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
                    <ul className="list-disc list-inside space-y-2">
                      {essay.feedback.organization.goodPoints.map((point, index) => (
                        <li key={index} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
                    <ul className="list-disc list-inside space-y-2">
                      {essay.feedback.organization.improvements.map((improvement, index) => (
                        <li key={index} className="text-gray-700">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Development */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Development（展開）</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
                    <ul className="list-disc list-inside space-y-2">
                      {essay.feedback.development.goodPoints.map((point, index) => (
                        <li key={index} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
                    <ul className="list-disc list-inside space-y-2">
                      {essay.feedback.development.improvements.map((improvement, index) => (
                        <li key={index} className="text-gray-700">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Specific Suggestions */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">新しいアイデアの提案</h3>
                <ul className="list-disc list-inside space-y-2">
                  {essay.feedback.specificSuggestions.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-gray-700">
                      {typeof suggestion === 'string'
                        ? suggestion
                        : suggestion && typeof suggestion === 'object'
                        ? (() => {
                            const s = suggestion as SuggestionDetails;
                            return [
                              s.suggestion || s.title,
                              s.implementation,
                              s.whereToInclude,
                              s.effectiveness || s.reasoning,
                              s.example,
                            ]
                              .filter(Boolean)
                              .join(' / ');
                          })()
                        : ''}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Grammar Corrections */}
              {essay.feedback.grammarCorrections.corrections.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Grammar Corrections</h3>
                  {essay.feedback.grammarCorrections.corrections.map((correction, index) => (
                    <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="mb-2">
                            <span className="text-red-500 line-through">{correction.original}</span>
                            <span className="mx-2">→</span>
                            <span className="text-green-500">{correction.corrected}</span>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{correction.explanation}</p>
                          <p className="text-gray-500 text-sm italic">Context: {correction.context}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
