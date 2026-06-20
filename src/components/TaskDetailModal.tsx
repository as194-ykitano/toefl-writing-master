"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getReadingPassageById } from '@/lib/getReadingPassages';
import { Task, ReadingPassage } from '@/lib/types';
import TextSelectionMenu from '@/components/TextSelectionMenu';
import { saveVocabularyItem } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskDetailModal({ task, isOpen, onClose }: TaskDetailModalProps) {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [readingPassage, setReadingPassage] = useState<ReadingPassage | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [textSelection, setTextSelection] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (task?.readingPassageId) {
      fetchReadingPassage();
    }
  }, [task]);

  useEffect(() => {
    if (task?.listeningAudioURL) {
      const audio = new Audio(task.listeningAudioURL);
      
      const handleEnded = () => setIsPlaying(false);
      const handleError = (e: Event) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      };
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      setAudioElement(audio);
      
      return () => {
        audio.pause();
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [task?.listeningAudioURL]);

  const fetchReadingPassage = async () => {
    if (!task?.readingPassageId) return;
    
    try {
      const passage = await getReadingPassageById(task.readingPassageId);
      setReadingPassage(passage);
    } catch (error) {
      console.error('Error fetching reading passage:', error);
    }
  };

  const toggleAudio = useCallback(() => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play().catch((error) => {
        console.error('Error playing audio:', error);
        alert('音声の再生に失敗しました。音声ファイルを確認してください。');
      });
      setIsPlaying(true);
    }
  }, [audioElement, isPlaying]);

  const skipBackward = useCallback(() => {
    if (!audioElement) return;
    audioElement.currentTime = Math.max(0, audioElement.currentTime - 5);
  }, [audioElement]);

  const skipForward = useCallback(() => {
    if (!audioElement) return;
    audioElement.currentTime = Math.min(duration, audioElement.currentTime + 5);
  }, [audioElement, duration]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioElement) return;
    const newTime = (Number.parseFloat(e.target.value) / 100) * duration;
    audioElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatBoldText = (text: string) => {
    // **テキスト** を <strong>テキスト</strong> に変換
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  void formatBoldText;

  const renderSampleAnswer = (text: string) => {
    // **テキスト** を分割して配列にする
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // 太字部分
        const boldText = part.slice(2, -2);
        return (
          <strong key={index} className="font-bold">
            {boldText}
          </strong>
        );
      } else {
        // 通常のテキスト部分
        return (
          <span key={index}>
            {part}
          </span>
        );
      }
    });
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
    
    const modalContainer = document.querySelector('.task-detail-modal-container');
    const contentContainer = modalContainer?.querySelector('.overflow-y-auto');
    const containerRect = modalContainer?.getBoundingClientRect();
    
    // モーダルが開いている場合のみ、モーダル内での選択を処理
    if (isOpen && containerRect && contentContainer) {
      // 選択範囲がモーダル内にあるかチェック
      const isInModal = rect.left >= containerRect.left && 
                       rect.right <= containerRect.right && 
                       rect.top >= containerRect.top && 
                       rect.bottom <= containerRect.bottom;
      
      if (isInModal) {
        // スクロール位置を考慮した位置計算
        const scrollTop = contentContainer.scrollTop;
        const contentRect = contentContainer.getBoundingClientRect();
        
        // モーダル内での選択の場合、モーダル内にのみプラスボタンを表示
        setTextSelection({
          text: selectedText,
          position: {
            x: rect.left + rect.width / 2 - contentRect.left,
            y: rect.bottom - contentRect.top + scrollTop + 8 // スクロール位置を考慮し、8pxのオフセットを追加
          }
        });
        setShowMenu(false);
        return;
      } else {
        // モーダル外での選択の場合は、モーダル内のプラスボタンを非表示にする
        setTextSelection(null);
        setShowMenu(false);
        return;
      }
    }
    
    // モーダルが開いていない場合は何もしない（フィードバックページ側で処理される）
    setTextSelection(null);
    setShowMenu(false);
  };

  // 単語・フレーズに追加
  const handleAddToVocabulary = async (word: string, meaning?: string) => {
    if (!user) return;

    try {
      await saveVocabularyItem(user.uid, {
        word,
        meaning,
        context: `From task detail: ${task?.title || 'Unknown task'}`,
        source: 'manual',
        sourceId: task?.id || '',
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
    
    if (isOpen) {
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, showMenu]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!audioElement) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          toggleAudio();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, toggleAudio, skipBackward, skipForward]);

  // サイドパネルを閉じる時の処理
  const handleClose = () => {
    // 音声を停止して初期位置に戻す
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
    // テキスト選択状態をリセット
    setTextSelection(null);
    setShowMenu(false);
    onClose();
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-end z-50 pointer-events-none">
      <div className={`bg-white h-full w-full md:w-1/2 lg:w-2/3 xl:w-1/2 shadow-xl overflow-hidden transform transition-transform duration-300 ease-in-out pointer-events-auto task-detail-modal-container ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">問題と解答解説</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto h-[calc(100vh-80px)] p-6 space-y-6 relative">
          {/* Reading Passage */}
          {readingPassage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reading Passage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {readingPassage.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reading Passage 日本語訳 */}
          {task.readingPassageJapanese && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reading Passage 日本語訳</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {task.readingPassageJapanese}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Listening 音源 */}
          {task.listeningAudioURL && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Listening 音源</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  {/* コントロールボタン */}
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Button
                      onClick={skipBackward}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <SkipBack className="h-4 w-4" />
                      5秒戻し
                    </Button>
                    
                    <Button
                      onClick={toggleAudio}
                      className="flex items-center gap-2"
                      variant="outline"
                      size="lg"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      {isPlaying ? "一時停止" : "再生"}
                    </Button>
                    
                    <Button
                      onClick={skipForward}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <SkipForward className="h-4 w-4" />
                      5秒送り
                    </Button>
                  </div>

                  {/* プログレスバー */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progress}
                      onChange={handleSeek}
                      onInput={handleSeek}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`
                      }}
                    />
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-3 text-center">
                    講義音声を再生して内容を確認してください
                  </p>
                  
                  <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
                    <p className="text-center font-medium mb-1">キーボードショートカット</p>
                    <div className="flex justify-center gap-4 text-center">
                      <span>スペース: 再生/一時停止</span>
                      <span>←: 5秒戻し</span>
                      <span>→: 5秒送り</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Listening スクリプト */}
          {task.listeningPassageContent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Listening スクリプト</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {task.listeningPassageContent}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Listening スクリプト 日本語訳 */}
          {task.listeningScriptJapanese && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Listening スクリプト 日本語訳</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {task.listeningScriptJapanese}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 模範解答 */}
          {task.sampleAnswer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">模範解答</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div 
                    className="whitespace-pre-wrap text-gray-900 leading-relaxed"
                    data-sample-answer="true"
                  >
                    {renderSampleAnswer(task.sampleAnswer)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* テキスト選択時の小さなマーク */}
          {textSelection && !showMenu && isOpen && (
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
          {textSelection && showMenu && isOpen && (
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
      </div>
    </div>
  );
}
