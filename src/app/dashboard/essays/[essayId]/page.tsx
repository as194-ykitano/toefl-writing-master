'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Target, FileText, MessageSquare, CheckCircle, AlertCircle, Lightbulb, BookOpen } from 'lucide-react';
import { Essay, Task } from '@/lib/types';
import { getTaskById } from '@/lib/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { markFeedbackAsRead } from '@/lib/getEssays';
import { getEssayFeedback } from '@/lib/firebase';
import TaskDetailModal from '@/components/TaskDetailModal';
import TextSelectionMenu from '@/components/TextSelectionMenu';
import { saveVocabularyItem } from '@/lib/firebase';
import { useNotification } from '@/contexts/NotificationContext';

export default function EssayDetailPage() {
  const { essayId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [essay, setEssay] = useState<Essay | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [textSelection, setTextSelection] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  const { showNotification } = useNotification();
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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
          
          // Academic Discussionのエッセイかどうかをチェック
          const isAcademicDiscussion = essayData.taskType === 'academic_discussion' || 
            (essayData.feedback && essayData.feedback.detailedScores && 
             'topicDevelopment' in essayData.feedback.detailedScores);
          
          if (isAcademicDiscussion) {
            // Academic Discussionの場合は専用ページにリダイレクト
            router.replace(`/academic-discussion-essays/${essayId}`);
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
            feedbackRead: essayData.feedbackRead || false,
            score: essayData.score,
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
              grammarCorrections: essayData.feedback.grammarCorrections || { corrections: [] },
              modelAnswer: essayData.feedback.modelAnswer || undefined
            } : undefined,
            timeSpent: essayData.timeSpent,
            wordCount: essayData.wordCount
          } as Essay;
          setEssay(reconstructedEssay);

          // フィードバックが完了していて、まだ読まれていない場合は確認済みにマーク
          if (reconstructedEssay.status === 'feedback_completed' && 
              reconstructedEssay.feedback && 
              !reconstructedEssay.feedbackRead) {
            await markFeedbackAsRead(essayId as string, user.uid);
          }

          if (reconstructedEssay.taskId) {
            const taskData = await getTaskById(reconstructedEssay.taskId);
            setTask(taskData);
          }
        } catch (error) {
          console.error('Error loading essay:', error);
          setError('エッセイの読み込み中にエラーが発生しました。');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error in snapshot listener:', error);
        setError('エッセイの読み込み中にエラーが発生しました。');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [essayId, user]);

  // テキスト選択のハンドラー
  const handleTextSelection = (event?: MouseEvent) => {
    // メニュー表示中にメニュー内をクリックした場合は何もしない
    if (showMenu && event?.target && (event.target as Element).closest('.text-selection-menu-container')) {
      return;
    }

    // ＋ボタン自身をクリックした場合は、ボタンのonClickに任せるので何もしない
    if (event?.target && (event.target as Element).closest('[aria-label="単語・フレーズ登録"]')) {
      return;
    }

    const selection = window.getSelection();

    // ハイライトがない場合
    if (!selection || selection.toString().trim().length === 0) {
      // それ以外の場合は、選択が解除されたとみなし、ボタンとメニューを閉じる
      setTextSelection(null);
      setShowMenu(false);
      return;
    }

    // 新しいハイライトがある場合
    const selectedText = selection.toString().trim();
    if (selectedText.length < 2) return; // 2文字未満は無視

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // どちらのページでテキスト選択が行われたかを判定
    const taskDetailModal = document.querySelector('.task-detail-modal-container');
    const essayContainer = document.getElementById('essay-container');
    
    let containerRect: DOMRect | null = null;
    let isInTaskDetailModal = false;
    
    if (taskDetailModal && isTaskDetailModalOpen) {
      const modalRect = taskDetailModal.getBoundingClientRect();
      // 選択範囲がTaskDetailModal内にあるかチェック
      if (rect.left >= modalRect.left && rect.right <= modalRect.right && 
          rect.top >= modalRect.top && rect.bottom <= modalRect.bottom) {
        // モーダル内での選択の場合は、フィードバックページ側ではプラスボタンを表示しない
        setTextSelection(null);
        setShowMenu(false);
        return;
      }
    }
    
    // TaskDetailModal内でない場合は、元のページのコンテナを使用
    if (essayContainer) {
      containerRect = essayContainer.getBoundingClientRect();
    }
    
    if (!containerRect) return;

    // 選択範囲の情報を更新し、＋ボタンを表示する
    setTextSelection({
      text: selectedText,
      position: {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.bottom - containerRect.top
      }
    });
    setShowMenu(false);
  };

  // 長押し開始
  const handleMouseDown = () => {
    setIsLongPressing(false);
    const timer = setTimeout(() => {
      setIsLongPressing(true);
      handleTextSelection();
    }, 500); // 500ms長押しでメニューを開く
    setLongPressTimer(timer);
  };

  // 長押し終了
  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };

  // マウス移動で長押しをキャンセル
  const handleMouseMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  };

  // 単語・フレーズに追加
  const handleAddToVocabulary = async (word: string, meaning?: string) => {
    if (!user) return;

    try {
      await saveVocabularyItem(user.uid, {
        word,
        meaning,
        context: `From essay: ${essay?.content?.substring(0, 100)}...`,
        source: 'essay',
        sourceId: essayId as string,
        difficulty: 'medium',
        tags: [],
        reviewCount: 0
      });

      showNotification(`${word}を単語・フレーズに追加しました`, 'success');
    } catch (error) {
      console.error('Error adding to vocabulary:', error);
      showNotification('単語・フレーズの追加に失敗しました', 'error');
    }
  };

  // テキスト選択のイベントリスナー
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => handleTextSelection(e);
    
    // 常にテキスト選択機能を有効にする
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [essay, user, showMenu, isTaskDetailModalOpen]);

  // 長押し検出のイベントリスナー
  useEffect(() => {
    // 常に長押し検出機能を有効にする
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [essay, user, longPressTimer, isTaskDetailModalOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !essay) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-red-600 mb-4">エラー</h2>
            <p className="text-gray-700 mb-4">{error || 'エッセイの読み込みに失敗しました。'}</p>
            <Link href="/essays">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                エッセイ一覧に戻る
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className={`px-4 transition-all duration-300 ${isTaskDetailModalOpen ? 'max-w-xl-2xl ml-0' : 'max-w-4xl mx-auto'}`}>
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/essays">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                エッセイ一覧に戻る
              </Button>
            </Link>
            <Button onClick={() => setIsTaskDetailModalOpen(true)} className="bg-black hover:bg-gray-800 text-white">
              <BookOpen className="mr-2 h-4 w-4" />
              問題の解答解説を見る
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {task?.title || 'エッセイ詳細'}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {(() => {
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
              })()}
            </div>
            {essay.wordCount && (
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                {essay.wordCount}語
              </div>
            )}
            {essay.timeSpent && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {Math.floor(essay.timeSpent / 60)}分{essay.timeSpent % 60}秒
              </div>
            )}
            {essay.score && (
              <div className="flex items-center">
                <Target className="h-4 w-4 mr-1" />
                スコア: {essay.score.toFixed(1)}/30
              </div>
            )}
          </div>
        </div>

        {/* エッセイ本文 */}
        <div id="essay-container" className="bg-white rounded-lg shadow p-6 mb-8 relative">
          <h2 className="text-lg font-semibold mb-4">エッセイ本文</h2>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
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
                  <div className="whitespace-pre-wrap essay-text-content">{essay.content}</div>
                )}
              </div>
            </TooltipProvider>
          </div>

          {/* テキスト選択時の小さなマーク */}
          {textSelection && !showMenu && (
            <button
              style={{
                position: 'absolute',
                left: textSelection.position.x,
                top: textSelection.position.y,
                zIndex: 9998,
                background: '#2563eb',
                color: 'white',
                borderRadius: '50%',
                width: 32,
                height: 32,
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transform: 'translate(-50%, 0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                opacity: 0.5,
                transition: 'opacity 0.2s',
                marginTop: '4px',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
              onClick={() => setShowMenu(true)}
              aria-label="単語・フレーズ登録"
            >
              ＋
            </button>
          )}

          {/* テキスト選択メニュー */}
          {textSelection && showMenu && (
            <TextSelectionMenu
              selectedText={textSelection.text}
              position={textSelection.position}
              onAddToVocabulary={handleAddToVocabulary}
              onClose={() => {
                setShowMenu(false);
                setTextSelection(null);
              }}
            />
          )}
        </div>

        {/* フィードバック */}
        {essay.feedback && (
          <div className="space-y-6">
            {/* 一番上に 全体評価 と スコア を配置 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">全体評価</h3>
              <p className="text-gray-700">{essay.feedback.overall}</p>
            </div>

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
            {/* 問題とディスカッション内容 */}
            {essay.feedback && essay.feedback.detailedScores && 'topicDevelopment' in essay.feedback.detailedScores && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-3">問題とディスカッション内容</h3>
                {/* 共通の問題文（簡易説明） */}
                <div className="text-sm text-gray-700 mb-4">
                  <p className="font-medium mb-1">共通の指示</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>教授の質問に対して、自分の意見を述べ、根拠で支える</li>
                    <li>自分の言葉で議論に貢献する（100語以上が目安）</li>
                  </ul>
                </div>
                {/* ディスカッション内容 */}
                {task?.discussionContent ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">教授</div>
                      <div className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap">
                        <span className="font-semibold mr-2">{task.discussionContent.professorName || 'Professor'}:</span>
                        {task.discussionContent.professor}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">学生1</div>
                      <div className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap">
                        <span className="font-semibold mr-2">{task.discussionContent.student1Name || 'Student 1'}:</span>
                        {task.discussionContent.student1}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">学生2</div>
                      <div className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap">
                        <span className="font-semibold mr-2">{task.discussionContent.student2Name || 'Student 2'}:</span>
                        {task.discussionContent.student2}
                      </div>
                    </div>
                    {task.discussionContent.question && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">質問</div>
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap">
                          {task.discussionContent.question}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    <p>ディスカッション内容の詳細は、タスク情報から取得できませんでした。</p>
                    <p>Academic Discussionのエッセイでは、教授と学生の意見を参考にしながら、自分の意見を述べることが求められます。</p>
                  </div>
                )}
              </div>
            )}

            

            {/* 長所と改善点（非表示） */}

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

            {/* General Description（非表示） */}

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
                            (suggestion as any).suggestion || (suggestion as any).title,
                            (suggestion as any).implementation,
                            (suggestion as any).whereToInclude,
                            (suggestion as any).effectiveness || (suggestion as any).reasoning,
                            (suggestion as any).example,
                          ]
                            .filter(Boolean)
                            .join(' / ')
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* モデル解答（Academic Discussion向け） */}
            {essay.feedback.modelAnswer?.content && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-2">模範解答（{essay.feedback.modelAnswer.stance === 'agree' ? '賛成' : '反対'}）</h3>
                <div className="prose max-w-none whitespace-pre-wrap text-gray-900">
                  {essay.feedback.modelAnswer.content.replace(/\*\*/g, '')}
                </div>
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
                  await getEssayFeedback(essayId as string, user.uid);
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

      {/* 問題詳細モーダル */}
      <TaskDetailModal
        task={task}
        isOpen={isTaskDetailModalOpen}
        onClose={() => setIsTaskDetailModalOpen(false)}
      />
    </div>
  );
} 