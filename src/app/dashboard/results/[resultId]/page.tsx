"use client"

import { useEffect, useState } from "react"
import React from "react"
import Layout from "@/components/layout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, Target, FileText, MessageSquare, CheckCircle, AlertCircle } from "lucide-react"
import { getEssays, getTaskById, getEssayFeedback, Essay, Task } from "@/lib/firebase"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function ResultPage({ params }: { params: Promise<{ resultId: string }> }) {
  const { resultId } = React.use(params)
  const [essay, setEssay] = useState<Essay | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // エッセイの取得
        const essays = await getEssays()
        const currentEssay = essays.find(e => e.id === resultId)
        
        if (currentEssay) {
          console.log('Current Essay:', currentEssay);
          console.log('Feedback:', currentEssay.feedback);
          console.log('Grammar Corrections:', currentEssay.feedback?.grammarCorrections);
          setEssay(currentEssay)
          // タスクの取得
          const taskData = await getTaskById(currentEssay.taskId)
          if (taskData) {
            setTask(taskData)
          }

          // フィードバックが未完了の場合、定期的にチェック
          if (currentEssay.status === "submitted") {
            const checkFeedback = async () => {
              try {
                const updatedEssay = await getEssayFeedback(resultId)
                if (updatedEssay && updatedEssay.status === "feedback_completed" && updatedEssay.feedback) {
                  console.log('Updated Essay:', updatedEssay);
                  console.log('Updated Feedback:', updatedEssay.feedback);
                  console.log('Updated Grammar Corrections:', updatedEssay.feedback?.grammarCorrections);
                  setEssay(updatedEssay)
                }
              } catch (error) {
                console.error('Error checking feedback:', error)
              }
            }

            // 5秒ごとにフィードバックの状態をチェック
            const intervalId = setInterval(checkFeedback, 5000)
            return () => clearInterval(intervalId)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [resultId])

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

  const getScoreIcon = (score: number) => {
    if (score >= 4) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (score >= 3) return <CheckCircle className="w-5 h-5 text-yellow-500" />
    return <AlertCircle className="w-5 h-5 text-red-500" />
  }

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600"
    if (score >= 3) return "text-yellow-600"
    return "text-red-600"
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
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ダッシュボードに戻る
            </Button>
          </Link>
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
              <p className="text-2xl font-bold text-gray-900">{essay.createdAt.toLocaleDateString()}</p>
              <p className="text-gray-600 text-sm">提出日</p>
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
              <p className="text-2xl font-bold text-gray-900">{essay.status === "submitted" ? "提出完了" : "フィードバック完了"}</p>
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
                            {essay.essayText.slice(lastIndex, correction.startIndex)}
                          </span>
                        );
                      }

                      // 修正箇所をハイライト
                      const highlightedText = essay.essayText.slice(correction.startIndex, correction.endIndex);
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
                    if (lastIndex < essay.essayText.length) {
                      elements.push(
                        <span key={`text-segment-${textSegmentIndex}`}>
                          {essay.essayText.slice(lastIndex)}
                        </span>
                      );
                    }

                    return elements;
                  })()
                ) : (
                  <span>{essay.essayText}</span>
                )}
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Feedback Section - Only show if feedback is completed */}
        {essay.status === "feedback_completed" && essay.feedback && (
          <div className="mt-8 bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">フィードバック</h2>
            </div>

            {/* Overall Score */}
            <div className="mb-8">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">総合評価</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">{essay.score}/30</span>
              </div>
            </div>

            {/* Detailed Scores */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-2">
                  {getScoreIcon(essay.feedback.detailedScores.integration)}
                  <span className="font-medium text-gray-900">統合</span>
                </div>
                <span className={`font-bold ${getScoreColor(essay.feedback.detailedScores.integration)}`}>
                  {essay.feedback.detailedScores.integration}/5
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-2">
                  {getScoreIcon(essay.feedback.detailedScores.organization)}
                  <span className="font-medium text-gray-900">構成</span>
                </div>
                <span className={`font-bold ${getScoreColor(essay.feedback.detailedScores.organization)}`}>
                  {essay.feedback.detailedScores.organization}/5
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-2">
                  {getScoreIcon(essay.feedback.detailedScores.language)}
                  <span className="font-medium text-gray-900">言語使用</span>
                </div>
                <span className={`font-bold ${getScoreColor(essay.feedback.detailedScores.language)}`}>
                  {essay.feedback.detailedScores.language}/5
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-2">
                  {getScoreIcon(essay.feedback.detailedScores.development)}
                  <span className="font-medium text-gray-900">内容発展</span>
                </div>
                <span className={`font-bold ${getScoreColor(essay.feedback.detailedScores.development)}`}>
                  {essay.feedback.detailedScores.development}/5
                </span>
              </div>
            </div>

            {/* Feedback Details */}
            <div className="mt-8 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">総評</h3>
                <p className="text-gray-700">{essay.feedback.overall}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">強み</h3>
                <ul className="list-disc list-inside text-gray-700">
                  {essay.feedback.strengths?.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">改善点</h3>
                <ul className="list-disc list-inside text-gray-700">
                  {essay.feedback.improvements?.map((improvement, index) => (
                    <li key={index}>{improvement}</li>
                  ))}
                </ul>
              </div>

              {/* Topic Development */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Topic Development（主張展開）</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {essay.feedback.topicDevelopment?.goodPoints?.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {essay.feedback.topicDevelopment?.improvements?.map((improvement, index) => (
                        <li key={index}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* General Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">General Description（設問への回答）</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {essay.feedback.generalDescription?.goodPoints?.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
                    <ul className="list-disc list-inside text-gray-700">
                      {essay.feedback.generalDescription?.improvements?.map((improvement, index) => (
                        <li key={index}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Specific Suggestions */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">新しいアイデアの提案</h3>
                <ul className="list-disc list-inside text-gray-700">
                  {essay.feedback.specificSuggestions?.suggestions?.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
