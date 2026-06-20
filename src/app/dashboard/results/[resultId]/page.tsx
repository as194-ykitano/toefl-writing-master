"use client"

import { useEffect, useState } from "react"
import React from "react"
import Layout from "@/components/layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, Target, FileText, MessageSquare, CheckCircle, AlertCircle, Lightbulb, BookOpen } from "lucide-react"
import { getTaskById } from "@/lib/firebase"
import { Essay as EssayType, Task } from "@/lib/types"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/AuthContext"
import TaskDetailModal from '@/components/TaskDetailModal'
import { useRouter } from "next/navigation"

export default function ResultPage({ params }: { params: Promise<{ resultId: string }> }) {
  const { resultId } = React.use(params)
  const [essay, setEssay] = useState<EssayType | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false)
  type SuggestionDetails = {
    suggestion?: string
    title?: string
    implementation?: string
    whereToInclude?: string
    effectiveness?: string
    reasoning?: string
    example?: string
  }

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid, 'essays', resultId),
      async (doc) => {
        try {
          if (!doc.exists()) {
            setLoading(false);
            return;
          }

          const essayData = doc.data();
          
          // Academic Discussionのエッセイかどうかをチェック
          const isAcademicDiscussion = essayData.taskType === 'academic_discussion' || 
            (essayData.feedback && essayData.feedback.detailedScores && 
             'topicDevelopment' in essayData.feedback.detailedScores);
          
          if (isAcademicDiscussion) {
            // Academic Discussionの場合は専用ページにリダイレクト
            router.replace(`/academic-discussion-results/${resultId}`);
            return;
          }
          
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
            feedback: essayData.feedback ? {
              overall: essayData.feedback.overall,
              strengths: essayData.feedback.strengths || [],
              improvements: essayData.feedback.improvements || [],
              detailedScores: {
                integration: essayData.feedback.detailedScores?.integration || essayData.feedback.detailedScores_integration || 0,
                organization: essayData.feedback.detailedScores?.organization || essayData.feedback.detailedScores_organization || 0,
                language: essayData.feedback.detailedScores?.language || essayData.feedback.detailedScores_language || 0,
                development: essayData.feedback.detailedScores?.development || essayData.feedback.detailedScores_development || 0
              },
              topicDevelopment: {
                goodPoints: essayData.feedback.topicDevelopment?.goodPoints || essayData.feedback.topicDevelopment_goodPoints || [],
                improvements: essayData.feedback.topicDevelopment?.improvements || essayData.feedback.topicDevelopment_improvements || []
              },
              generalDescription: {
                goodPoints: essayData.feedback.generalDescription?.goodPoints || essayData.feedback.generalDescription_goodPoints || [],
                improvements: essayData.feedback.generalDescription?.improvements || essayData.feedback.generalDescription_improvements || []
              },
              specificSuggestions: {
                suggestions: essayData.feedback.specificSuggestions?.suggestions || essayData.feedback.specificSuggestions_suggestions || []
              },
              grammarCorrections: essayData.feedback.grammarCorrections || { corrections: [] }
            } : undefined,
            timeSpent: essayData.timeSpent,
            wordCount: essayData.wordCount
          } as EssayType;
          setEssay(reconstructedEssay);

          if (reconstructedEssay.taskId) {
            const taskData = await getTaskById(reconstructedEssay.taskId);
            setTask(taskData);
          }
        } catch (error) {
          console.error('Error loading essay:', error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error in snapshot listener:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [resultId, user]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">データを読み込み中...</h1>
            <p className="text-gray-600">しばらくお待ちください。</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!essay || !task) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">エッセイが見つかりません</h1>
            <p className="text-gray-600 mb-8">指定されたエッセイは存在しないか、削除された可能性があります。</p>
            <Link href="/dashboard">
              <Button className="bg-black hover:bg-gray-800 text-white">
                ダッシュボードに戻る
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{task.title}</h1>
            <p className="text-gray-600">{task.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setIsTaskDetailModalOpen(true)} className="bg-black hover:bg-gray-800 text-white">
              <BookOpen className="w-4 h-4 mr-2" />
              問題の解答解説を見る
            </Button>
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                ダッシュボードに戻る
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{(essay.submittedAt instanceof Date 
                ? essay.submittedAt 
                : essay.submittedAt?.toDate?.() || new Date()
              ).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <div className="text-sm text-gray-500">
                提出日時: {(essay.submittedAt instanceof Date 
                  ? essay.submittedAt 
                  : essay.submittedAt?.toDate?.() || new Date()
                ).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{essay.timeSpent}</p>
              <p className="text-gray-600 text-sm">所要時間</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{essay.wordCount}</p>
              <p className="text-gray-600 text-sm">語数</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{
                essay.status === "completed" || essay.status === "feedback_completed"
                  ? "フィードバック完了"
                  : essay.status === "pending"
                  ? "提出完了"
                  : essay.status === "processing"
                  ? "フィードバック処理中"
                  : essay.status === "error"
                  ? "エラー"
                  : "不明"
              }</p>
              <p className="text-gray-600 text-sm">ステータス</p>
            </div>
          </div>
        </div>

        {/* Essay Content */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">提出エッセイ</h2>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <TooltipProvider>
              <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
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
                        elements.push(
                          <span key={`text-segment-${textSegmentIndex++}`}>
                            {essay.content.slice(lastIndex, correction.startIndex)}
                          </span>
                        );
                      }

                      // 修正箇所をハイライト
                      const highlightedText = essay.content.slice(correction.startIndex, correction.endIndex);
                      // 原文とハイライトテキストの長さが一致するか確認
                      const isLengthMatch = highlightedText.length === correction.original.length;
                      // 原文とハイライトテキストの最初の文字が一致するか確認
                      const isFirstCharMatch = highlightedText[0] === correction.original[0];

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
                              <p className="text-xs text-gray-500">位置: {correction.startIndex} - {correction.endIndex}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );

                      lastIndex = correction.endIndex;
                    });

                    // 残りのテキストを追加
                    if (lastIndex < essay.content.length) {
                      elements.push(
                        <span key={`text-segment-${textSegmentIndex}`}>
                          {essay.content.slice(lastIndex)}
                        </span>
                      );
                    }

                    return elements;
                  })()
                ) : (
                  <span>{essay.content}</span>
                )}
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Feedback Section - Only show if feedback is completed */}
        {(essay.status === "completed" || essay.status === "feedback_completed") && essay.feedback && (
          <div className="mt-8 bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">フィードバック</h2>
            </div>

            <div className="space-y-6">
              {/* 全体評価 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">全体評価</h3>
                <p className="text-gray-700">{essay.feedback.overall}</p>
              </div>

              {/* スコア */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">スコア</h3>
                {/* Integrated Task用のスコア表示 */}
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-600 mb-1">Integration</div>
                        <div className="text-2xl font-bold text-blue-700">{essay.feedback.detailedScores.integration || 0}</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-600 mb-1">Organization</div>
                        <div className="text-2xl font-bold text-green-700">{essay.feedback.detailedScores.organization || 0}</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm text-purple-600 mb-1">Language</div>
                        <div className="text-2xl font-bold text-purple-700">{essay.feedback.detailedScores.language || 0}</div>
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
                                essay.feedback.detailedScores.integration || 0,
                                essay.feedback.detailedScores.organization || 0,
                                essay.feedback.detailedScores.language || 0,
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
                </>
              </div>

              {/* 長所と改善点 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">長所</h3>
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
                  <h3 className="text-lg font-semibold mb-4">改善点</h3>
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

              {/* Topic Development */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Topic Development</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">良い点</h4>
                    <ul className="space-y-2">
                      {essay.feedback.topicDevelopment.goodPoints.map((point, index) => (
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
                      {essay.feedback.topicDevelopment.improvements.map((improvement, index) => (
                        <li key={index} className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* General Description */}
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

              {/* 具体的な改善提案 */}
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
          </div>
        )}
      </div>

      {/* 問題詳細モーダル */}
      <TaskDetailModal
        task={task}
        isOpen={isTaskDetailModalOpen}
        onClose={() => setIsTaskDetailModalOpen(false)}
      />
    </Layout>
  )
}
