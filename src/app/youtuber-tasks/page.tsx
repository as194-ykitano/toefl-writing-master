"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Play, Clock, Target, ArrowLeft, Edit3, Bell, FileText, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { YouTubeVideo, YouTuberTask } from "@/lib/types";
import { getYouTuberTasks, saveYouTubeVideo, saveYouTuberEssay, updateYouTuberEssayFeedback } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ManualSubtitleInput from "@/components/ManualSubtitleInput";

type Phase = "search" | "video-selected" | "writing" | "submission-complete";

export default function YouTuberTasksPage() {
  const { user, loading } = useAuth();
  const { showFeedbackNotification } = useNotification();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("search");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<"summary" | "opinion">("summary");
  const [essayText, setEssayText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isUrlSearching, setIsUrlSearching] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [isVideoSelecting, setIsVideoSelecting] = useState(false);
  const [submittedEssayData, setSubmittedEssayData] = useState<{
    essayId: string;
    taskTitle?: string;
    wordCount: number;
    timeSpent: number;
  } | null>(null);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [showManualSubtitleInput, setShowManualSubtitleInput] = useState(false);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [showHowtoDialog, setShowHowtoDialog] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // 経過時間（制限時間なし）
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // フィードバック完了を監視して通知（提出直後に設定したessayIdを使用）
  useEffect(() => {
    if (phase === "submission-complete" && submittedEssayData?.essayId && user) {
      console.log('Setting up notification listener for YouTuber essay:', submittedEssayData.essayId);
      const essayRef = doc(db, 'users', user.uid, 'youTuberEssays', submittedEssayData.essayId);
      const unsubscribe = onSnapshot(essayRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          console.log('YouTuber essay status updated:', data.status, 'for essay:', snap.id);
          if (data.status === 'feedback_completed') {
            console.log('YouTuber feedback completed! Showing notification...');
            showFeedbackNotification(submittedEssayData.essayId, submittedEssayData.taskTitle, 'youtuber');
            
            // 通知表示と同時にダッシュボードに遷移
            console.log('Setting up dashboard navigation in 3 seconds...');
            setTimeout(() => {
              console.log('Navigating to dashboard...');
              try {
                // ダッシュボードに直接遷移（状態が確実に更新される）
                window.location.href = '/youtuber-dashboard';
              } catch (error) {
                console.error('Error navigating to dashboard:', error);
                // フォールバック: ページリフレッシュ
                try {
                  window.location.reload();
                } catch (fallbackError) {
                  console.error('Fallback refresh also failed:', fallbackError);
                  // 最後の手段
                  document.location.reload();
                }
              }
            }, 3000); // 3秒後にダッシュボードに遷移（通知が確実に表示されるように）
          }
        }
      });
      return () => unsubscribe();
    }
  }, [phase, submittedEssayData?.essayId, showFeedbackNotification, user]);

  // YouTubeのURLから動画IDを抽出する関数
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  // ISO 8601 durationを秒に変換
  const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    return hours * 3600 + minutes * 60 + seconds;
  };

  // 字幕をクリーンアップする関数（メタデータを除去）
  const cleanTranscript = (transcript: string): string => {
    return transcript
      .replace(/Kind: captions Language: en\s*/gi, '') // メタデータを除去
      .replace(/^\s*[\d:]+\s*$/gm, '') // タイムスタンプを除去
      .replace(/\s+/g, ' ') // 複数の空白を1つに
      .trim();
  };


  const handleUrlSearch = async () => {
    if (!urlInput.trim()) return;
    
    const videoId = extractVideoId(urlInput);
    if (!videoId) {
      alert('有効なYouTubeのURLを入力してください。');
      return;
    }
    
    setIsUrlSearching(true);
    try {
      // 動画IDから動画情報を取得
      const response = await fetch(`/api/youtube/video-info?videoId=${videoId}`);
      const data = await response.json();
      
      if (response.ok && data.video) {
        // 30分制限をチェック
        const durationInSeconds = parseDuration(data.video.duration);
        const durationInMinutes = durationInSeconds / 60;
        
        if (durationInMinutes > 30) {
          alert(`この動画は${Math.round(durationInMinutes)}分と30分を超えているため、学習に使用できません。30分以下の動画を選択してください。`);
          return;
        }
        
        setSearchResults([data.video]);
        setUrlInput("");
      } else {
        console.error('Video info error:', data.error);
        alert('動画情報の取得に失敗しました。動画が存在しないか、プライベート動画の可能性があります。');
      }
    } catch (error) {
      console.error('Video info error:', error);
      alert('動画情報の取得に失敗しました。');
    } finally {
      setIsUrlSearching(false);
    }
  };

  const handleVideoSelect = async (video: YouTubeVideo) => {
    setIsVideoSelecting(true);
    setSelectedVideo(video);
    setTranscriptLoading(false);
    // 自動取得は行わず、説明文を初期値として手動入力へ誘導
    setTranscript(video.description || '');
    setTranscriptData({ transcript: video.description || '' });
    setShowManualSubtitleInput(true);
    setIsVideoSelecting(false);
    setPhase("video-selected");
  };

  const handleManualTranscriptSaved = (newTranscript: string) => {
    setTranscript(newTranscript);
    setShowManualSubtitleInput(false);
  };

  const startWriting = () => {
    setPhase("writing");
    setIsTimerRunning(true);
  };

  const handleSubmit = async () => {
    if (!user || !selectedVideo || !essayText.trim()) return;
    
    setIsSubmitting(true);
    try {
      // 動画をデータベースに保存（まだ保存されていない場合）
      let videoId = selectedVideo.id;
      try {
        const savedVideoId = await saveYouTubeVideo(selectedVideo);
        videoId = savedVideoId;
      } catch (error) {
        console.log('Video already exists or save failed, using existing ID');
      }

      // エッセイを保存
      const essayData = {
        userId: user.uid,
        taskId: `youtuber-${selectedVideo.id}`,
        videoId: selectedVideo.id,
        content: essayText,
        transcript: transcript || undefined, // 字幕を保存
        taskType: selectedTaskType, // タスクタイプを保存
        essayType: 'youtuber' as const,
        submittedAt: new Date(),
        status: 'pending' as const,
        timeSpent,
        wordCount,
      };
      
      const essayId = await saveYouTuberEssay(essayData);
      setSubmittedEssayData({
        essayId,
        taskTitle: `YouTube Learning: ${selectedVideo.title}`,
        wordCount,
        timeSpent,
      });
      setPhase("submission-complete");

      // AI分析はバックグラウンドで実行
      fetch('/api/analyze-youtuber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          essayText, 
          videoTitle: selectedVideo.title,
          videoDescription: selectedVideo.description,
          taskType: selectedTaskType,
          transcript
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to analyze essay');
          const feedback = await res.json();
          if (user) {
            await updateYouTuberEssayFeedback(essayId, user.uid, feedback);
          }
        })
        .catch((err) => {
          console.error('Background analyze failed:', err);
        });
    } catch (error) {
      console.error('Error submitting essay:', error);
      alert('エッセイの提出に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // 提出完了
  if (phase === "submission-complete" && submittedEssayData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">提出完了！</h1>
            <p className="text-gray-600">現在添削中です！しばらくお待ちください。</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>提出内容</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-600">{submittedEssayData.wordCount}</div>
                  <div className="text-sm text-gray-500">語数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-600">
                    {Math.floor(submittedEssayData.timeSpent / 60)}:{(submittedEssayData.timeSpent % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-500">所要時間</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-600">
                    {Math.round((submittedEssayData.wordCount / (submittedEssayData.timeSpent / 60)) * 10) / 10}
                  </div>
                  <div className="text-sm text-gray-500">語/分</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild variant="outline">
              <Link href="/youtuber-dashboard">
                <FileText className="mr-2 h-4 w-4" />
                ダッシュボードに戻る
              </Link>
            </Button>
            <Button asChild onClick={() => {
              setPhase("search");
              setSearchResults([]);
              setSelectedVideo(null);
              setEssayText("");
              setWordCount(0);
              setTimeSpent(0);
              setSubmittedEssayData(null);
            }}>
              <Link href="/youtuber-tasks">
                <Target className="mr-2 h-4 w-4" />
                別の動画で学習する
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ライティング画面
  if (phase === "writing" && selectedVideo) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Edit3 className="h-6 w-6 mr-2 text-violet-600" />
                  YouTube Learning
                </h1>
                <p className="text-gray-600">{selectedVideo.title}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">経過時間</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 動画情報 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>学習動画</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                <img 
                  src={selectedVideo.thumbnailUrl} 
                  alt={selectedVideo.title}
                  className="w-32 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{selectedVideo.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{selectedVideo.channelTitle}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {selectedVideo.estimatedWatchingTime?.toFixed(0)}分
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* ライティングエリア */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {selectedTaskType === 'summary' && 'サマリーを書いてください'}
                  {selectedTaskType === 'opinion' && '意見を書いてください'}
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{wordCount} 語</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={essayText}
                onChange={(e) => {
                  setEssayText(e.target.value);
                  setWordCount(e.target.value.trim().split(/\s+/).filter(Boolean).length);
                }}
                className="w-full h-[500px] p-4 border border-gray-300 rounded-lg text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ここにエッセイを書いてください..."
              />
            </CardContent>
          </Card>

          {/* 提出ボタン */}
          <div className="mt-6 text-center">
            <Button
              onClick={handleSubmit}
              disabled={!essayText.trim() || isSubmitting}
              size="lg"
              className="bg-violet-600 hover:bg-violet-700 px-8 py-4 text-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  提出中...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-5 w-5" />
                  提出する
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 動画選択画面
  if (phase === "video-selected" && selectedVideo) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Button variant="ghost" onClick={() => setPhase("search")} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                検索に戻る
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Play className="h-8 w-8 mr-3 text-violet-600" />
              動画を選択しました
            </h1>
            <p className="text-gray-600">学習する動画とタスクタイプを確認してください</p>
          </div>

          {/* 選択された動画 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>選択された動画</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                <img 
                  src={selectedVideo.thumbnailUrl} 
                  alt={selectedVideo.title}
                  className="w-48 h-36 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-xl mb-2">{selectedVideo.title}</h3>
                  <p className="text-gray-600 mb-2">{selectedVideo.channelTitle}</p>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">{selectedVideo.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {selectedVideo.estimatedWatchingTime?.toFixed(0)}分
                    </span>
                  </div>
                  
                  {/* 自動字幕UIは廃止（プレビュー/取得メッセージ非表示） */}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 手動字幕入力 */}
          {showManualSubtitleInput && transcriptData && (
            <div className="mb-8">
              <ManualSubtitleInput
                videoId={selectedVideo.id}
                fallbackTranscript={transcriptData.transcript}
                onTranscriptSaved={handleManualTranscriptSaved}
              />
            </div>
          )}

          {/* タスクタイプ選択 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>学習タイプを選択してください</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant={selectedTaskType === 'summary' ? 'default' : 'outline'}
                  onClick={() => setSelectedTaskType('summary')}
                  className="h-24 flex-1 flex flex-col items-center justify-center text-base font-medium"
                >
                  <FileText className="h-7 w-7 mb-2" />
                  サマリー
                </Button>
                <Button
                  variant={selectedTaskType === 'opinion' ? 'default' : 'outline'}
                  onClick={() => setSelectedTaskType('opinion')}
                  className="h-24 flex-1 flex flex-col items-center justify-center text-base font-medium"
                >
                  <Edit3 className="h-7 w-7 mb-2" />
                  意見
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 開始ボタン */}
          <div className="text-center">
            <Button 
              onClick={startWriting}
              size="lg"
              className="bg-violet-600 hover:bg-violet-700 px-8 py-4 text-lg"
            >
              <Target className="mr-2 h-6 w-6" />
              学習開始
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 検索画面
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button variant="ghost" asChild className="mr-4">
              <Link href="/youtuber-dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                ダッシュボードに戻る
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">YouTube Learning</h1>
          <p className="text-gray-600">YouTube動画を見て、サマリーや意見を書くトレーニング</p>
        </div>

        {/* 動画URL入力フォーム */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>YouTube動画を選択</CardTitle>
            <p className="text-sm text-gray-600">学習したい動画のURLを貼り付けてください</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">YouTubeのURL</label>
                <div className="flex space-x-4">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... または https://youtu.be/..."
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleUrlSearch()}
                  />
                  <Button 
                    onClick={handleUrlSearch} 
                    disabled={!urlInput.trim() || isUrlSearching}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isUrlSearching ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        取得中...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        動画を取得
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  対応形式: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
                </p>
              </div>
              
              {/* 30分制限の注意事項 */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">動画の長さ制限について</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>学習効果を高めるため、<strong>30分以下の動画</strong>のみ学習に使用できます。</p>
                      <p className="mt-1">30分を超える動画を選択した場合、自動的に除外されます。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 検索結果 */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>検索結果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-gray-600 mb-2">{video.channelTitle}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {video.estimatedWatchingTime?.toFixed(0)}分
                      </span>
                    </div>
                    <Button 
                      onClick={() => handleVideoSelect(video)}
                      size="sm"
                      disabled={isVideoSelecting}
                      className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
                    >
                      {isVideoSelecting ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1"></div>
                          ロード中...
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          選択
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 説明 */}
        {searchResults.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>YouTube Learningについて</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-600">
                <p>
                  YouTube Learningは、YouTube動画を活用した英語学習トレーニングです。
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>学習したい動画のURLを貼り付けて選択します</li>
                  <li>動画を見て、サマリーや意見を英語で書きます（動画はYouTubeで直接視聴してください）</li>
                  <li>実際の動画コンテンツで実践的な英語力を身につけます</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
