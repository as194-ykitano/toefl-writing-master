"use client";

import { useEffect, useState } from "react";
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getYouTuberEssays } from "@/lib/firebase";
import { YouTuberEssay, YouTubeVideo } from "@/lib/types";
import { FileText, ArrowLeft, Clock, CheckCircle, AlertCircle, Play } from "lucide-react";

type TabType = 'all' | 'unread' | 'read';

export default function YouTuberEssaysPage() {
  const { user } = useAuth();
  const [essays, setEssays] = useState<YouTuberEssay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchEssays = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const list = await getYouTuberEssays(user.uid);
        setEssays(list);
        
        // 動画タイトルを取得
        const titles: Record<string, string> = {};
        const uniqueVideoIds = [...new Set(list.map(essay => essay.videoId))];
        
        for (const videoId of uniqueVideoIds) {
          try {
            const response = await fetch(`/api/youtube/video-info?videoId=${videoId}`);
            const data = await response.json();
            if (response.ok && data.video) {
              titles[videoId] = data.video.title;
            }
          } catch (error) {
            console.error('Error fetching video title:', error);
            titles[videoId] = `動画ID: ${videoId}`;
          }
        }
        
        setVideoTitles(titles);
      } finally {
        setLoading(false);
      }
    };
    fetchEssays();
  }, [user]);

  // フィルタリングされたエッセイを取得
  const getFilteredEssays = () => {
    switch (activeTab) {
      case 'unread':
        return essays.filter(essay => 
          (essay.status === 'completed' || essay.status === 'feedback_completed') && 
          essay.feedback && 
          !essay.feedbackRead
        );
      case 'read':
        return essays.filter(essay => 
          (essay.status === 'completed' || essay.status === 'feedback_completed') && 
          essay.feedback && 
          essay.feedbackRead
        );
      default:
        return essays;
    }
  };

  // 各タブのエッセイ数を取得
  const getTabCounts = () => {
    const allCount = essays.length;
    const unreadCount = essays.filter(essay => 
      (essay.status === 'completed' || essay.status === 'feedback_completed') && 
      essay.feedback && 
      !essay.feedbackRead
    ).length;
    const readCount = essays.filter(essay => 
      (essay.status === 'completed' || essay.status === 'feedback_completed') && 
      essay.feedback && 
      essay.feedbackRead
    ).length;

    return { allCount, unreadCount, readCount };
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900">読み込み中...</h1>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/youtuber-dashboard">
                <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                  <ArrowLeft className="w-4 h-4 mr-2" /> YouTube Learningダッシュボードに戻る
                </Button>
              </Link>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">YouTube Learningエッセイ履歴</h1>
                <p className="text-gray-600">提出したYouTube学習エッセイの一覧</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* タブナビゲーション */}
              <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === 'all'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>All</span>
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === 'unread'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>未読</span>
                  {getTabCounts().unreadCount > 0 && (
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                      {getTabCounts().unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('read')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === 'read'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>既読</span>
                </button>
              </div>
              <Link href="/youtuber-tasks">
                <Button>
                  <Play className="w-4 h-4 mr-2" /> 新しい学習
                </Button>
              </Link>
            </div>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総エッセイ数</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getFilteredEssays().length}</div>
                <p className="text-xs text-muted-foreground">
                  現在のタブで表示されているエッセイ数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均語数</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getFilteredEssays().length > 0 
                    ? Math.round(getFilteredEssays().reduce((sum, e) => sum + (e.wordCount || 0), 0) / getFilteredEssays().length)
                    : 0
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  エッセイの平均語数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均時間</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getFilteredEssays().length > 0 
                    ? (() => {
                        const avgSeconds = getFilteredEssays().reduce((sum, e) => sum + (e.timeSpent || 0), 0) / getFilteredEssays().length;
                        const minutes = Math.floor(avgSeconds / 60);
                        const seconds = Math.round(avgSeconds % 60);
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                      })()
                    : '0:00'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  エッセイの平均所要時間
                </p>
              </CardContent>
            </Card>
          </div>

          {getFilteredEssays().length === 0 ? (
            <Card className="mx-auto max-w-md shadow-md border-0">
              <CardContent className="p-8 text-center">
                {activeTab === 'all' ? (
                  <>
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">まだエッセイがありません。</p>
                    <p className="text-sm text-gray-500">新しい学習を始めて提出しましょう。</p>
                  </>
                ) : activeTab === 'unread' ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">未読フィードバックはありません。</p>
                    <p className="text-sm text-gray-500">すべてのフィードバックを確認済みです。</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">既読フィードバックはありません。</p>
                    <p className="text-sm text-gray-500">フィードバックを確認するとここに表示されます。</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {getFilteredEssays().map((essay) => (
                <Card 
                  key={essay.id} 
                  className={`shadow-sm relative ${
                    (essay.status === 'completed' || essay.status === 'feedback_completed') && 
                    essay.feedback && 
                    !essay.feedbackRead 
                      ? 'border-2 border-red-300' 
                      : 'border-0'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {videoTitles[essay.videoId] || 'YouTube学習エッセイ'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                        {essay.taskType === 'summary' ? 'Summary' : 
                         essay.taskType === 'opinion' ? 'Opinion' : 'Summary'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[48px] mb-4">
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {essay.content.length > 200 ? essay.content.substring(0, 200) + '...' : essay.content}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>
                        {(() => {
                          const val = essay.submittedAt as any;
                          let dateObj: Date | null = null;
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
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {Math.round((essay.timeSpent || 0)/60)} 分 / {essay.wordCount || 0} 語
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        essay.status === 'feedback_completed' ? 'bg-green-100 text-green-700' :
                        essay.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {essay.status === 'feedback_completed' ? '完了' : essay.status === 'processing' ? '処理中' : '待機中'}
                      </span>
                      <div className="flex items-center gap-2">
                        {(essay.status === 'completed' || essay.status === 'feedback_completed') && essay.feedback && (
                          <>
                            {essay.feedbackRead ? (
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                <CheckCircle className="w-3 h-3" />
                                <span>既読</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                <AlertCircle className="w-3 h-3" />
                                <span>未読</span>
                              </div>
                            )}
                          </>
                        )}
                        <Link href={`/youtuber-essays/${essay.id}`}>
                          <Button variant="outline" size="sm">詳細を見る</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
