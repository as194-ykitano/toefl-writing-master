'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Clock, FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';

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

type FirestoreTimestampLike = {
  toDate: () => Date;
};

type GrammarCorrection = {
  original: string;
  corrected: string;
  explanation: string;
  context: string;
  startIndex: number;
  endIndex: number;
};

interface AcademicDiscussionEssay {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  submittedAt: Date | FirestoreTimestampLike | null;
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
      corrections: GrammarCorrection[];
    };
    modelAnswer?: string;
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

const formatSuggestion = (suggestion: SuggestionItem) => {
  if (typeof suggestion === 'string') return suggestion;

  return [
    suggestion.suggestion || suggestion.title,
    suggestion.implementation,
    suggestion.whereToInclude,
    suggestion.effectiveness || suggestion.reasoning,
    suggestion.example,
  ]
    .filter(Boolean)
    .join(' / ');
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const toDate = (value: Date | FirestoreTimestampLike | null) => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return value.toDate();
};

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

        if (!essayDoc.exists()) {
          setError('エッセイが見つかりません。');
          return;
        }

        const essayData = essayDoc.data();
        const isAcademicDiscussion =
          essayData.taskType === 'academic_discussion' ||
          (essayData.feedback &&
            essayData.feedback.detailedScores &&
            'topicDevelopment' in essayData.feedback.detailedScores);

        if (!isAcademicDiscussion) {
          setError('このエッセイは Academic Discussion ではありません。');
          return;
        }

        const essayWithData = {
          id: essayDoc.id,
          ...essayData,
          submittedAt: essayData.submittedAt?.toDate?.() ?? null,
        } as AcademicDiscussionEssay;

        setEssay(essayWithData);

        if (essayData.status === 'feedback_completed' && !essayData.feedbackRead) {
          try {
            await updateDoc(doc(db, 'users', user.uid, 'essays', essayDoc.id), {
              feedbackRead: true,
            });
          } catch (updateError) {
            console.error('Error updating feedbackRead status:', updateError);
          }
        }

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
      } catch (fetchError) {
        console.error('Error fetching essay:', fetchError);
        setError('エッセイの読み込み中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    void fetchEssay();
  }, [essayId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 p-0 text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            エッセイ一覧に戻る
          </Button>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">Academic Discussion 詳細</h1>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDate(toDate(essay.submittedAt))}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{essay.wordCount} words</span>
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

        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">提出したエッセイ</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <TooltipProvider>
              <div className="whitespace-pre-wrap text-gray-900 leading-relaxed essay-text-content relative">
                {essay.feedback?.grammarCorrections?.corrections?.length ? (
                  (() => {
                    let lastIndex = 0;
                    let textSegmentIndex = 0;
                    const elements: React.ReactNode[] = [];
                    const sortedCorrections = [...essay.feedback.grammarCorrections.corrections].sort(
                      (a, b) => a.startIndex - b.startIndex
                    );

                    sortedCorrections.forEach((correction, index) => {
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

                    return elements.length > 0 ? elements : <span className="text-gray-900">{essay.content}</span>;
                  })()
                ) : (
                  <span className="text-gray-900">{essay.content}</span>
                )}
              </div>
            </TooltipProvider>
          </div>
        </Card>

        {taskData && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">タスク情報</h3>
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

        {taskData?.japaneseTranslation && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">タスクの日本語訳</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-800 whitespace-pre-wrap">{taskData.japaneseTranslation}</p>
            </div>
          </Card>
        )}

        {essay.feedback?.modelAnswer && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">模範解答</h3>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-gray-800 whitespace-pre-wrap">{essay.feedback.modelAnswer}</p>
            </div>
          </Card>
        )}

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">総合評価</h3>
            <p className="text-gray-700">{essay.feedback.overall}</p>
          </Card>

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
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-700">良かった点</h3>
              <ul className="space-y-2">
                {essay.feedback.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
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

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Topic Development</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">良かった点</h4>
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

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Language Use</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">良かった点</h4>
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

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Organization</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">良かった点</h4>
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

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Development</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">良かった点</h4>
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

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">具体的なアドバイス</h3>
            <ul className="list-disc list-inside space-y-2">
              {essay.feedback.specificSuggestions.suggestions.map((suggestion, index) => (
                <li key={index} className="text-gray-700">{formatSuggestion(suggestion)}</li>
              ))}
            </ul>
          </Card>

          {essay.feedback.grammarCorrections.corrections.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">文法修正</h3>
              {essay.feedback.grammarCorrections.corrections.map((correction, index) => (
                <div key={index} className="mb-4 p-4 bg-white rounded-lg shadow">
                  <div className="mb-2">
                    <span className="text-red-500 line-through">{correction.original}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-500">{correction.corrected}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{correction.explanation}</p>
                  <p className="text-gray-500 text-sm italic">Context: {correction.context}</p>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
