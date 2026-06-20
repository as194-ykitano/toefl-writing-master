"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, FileText, Clock, Target, MessageSquare, LogOut, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { YouTuberEssay } from "@/lib/types";
import { getYouTuberEssays } from "@/lib/firebase";
import { isAdmin } from "@/lib/utils";
import { SubmissionCalendar } from "@/components/SubmissionCalendar";
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function YouTuberDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [essays, setEssays] = useState<YouTuberEssay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoTitles, setVideoTitles] = useState<Record<string, string>>({});

  const toDate = (value: YouTuberEssay["submittedAt"]): Date => {
    if (value instanceof Date) return value;
    if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
      return value.toDate();
    }
    if (typeof value === "string" || typeof value === "number") {
      return new Date(value);
    }
    return new Date();
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);


  const updateVideoTitles = useCallback(async (essays: YouTuberEssay[]) => {
    const titles: Record<string, string> = {};
    const uniqueVideoIds = [...new Set(essays.map(essay => essay.videoId))];
    
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
  }, []);

  const loadEssays = useCallback(async () => {
    if (!user) return;
    
    try {
      const userEssays = await getYouTuberEssays(user.uid);
      setEssays(userEssays);
      
      // 動画タイトルを取得
      await updateVideoTitles(userEssays);
    } catch (error) {
      console.error('Error loading essays:', error);
    } finally {
      setIsLoading(false);
    }
  }, [updateVideoTitles, user]);
  useEffect(() => {
    if (user) {
      loadEssays();
      
      // リアルタイム更新のリスナーを設定
      const essaysRef = collection(db, 'users', user.uid, 'youTuberEssays');
      const unsubscribe = onSnapshot(essaysRef, (snapshot) => {
        const updatedEssays: YouTuberEssay[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as YouTuberEssay;
          updatedEssays.push({
            ...data,
            id: doc.id,
            submittedAt: data.submittedAt instanceof Date ? data.submittedAt : data.submittedAt.toDate()
          });
        });
        
        // 提出日時でソート（新しい順）
        updatedEssays.sort((a, b) => {
          const dateA = a.submittedAt instanceof Date ? a.submittedAt : a.submittedAt.toDate();
          const dateB = b.submittedAt instanceof Date ? b.submittedAt : b.submittedAt.toDate();
          return dateB.getTime() - dateA.getTime();
        });
        
        setEssays(updatedEssays);
        
        // 動画タイトルを更新
        updateVideoTitles(updatedEssays);
      });
      
      return () => unsubscribe();
    }
  }, [user, loadEssays, updateVideoTitles]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalEssays = essays.length;
  const completedEssays = essays.filter(essay => essay.status === 'feedback_completed').length;
  const totalTimeSpent = essays.reduce((total, essay) => total + (essay.timeSpent || 0), 0);
  const averageTimeSpent = totalEssays > 0 ? Math.round(totalTimeSpent / totalEssays / 60) : 0;
  const allUnreadEssays = essays
    .filter(e => e.status === 'feedback_completed' && !e.feedbackRead)
    .sort((a, b) => toDate(a.submittedAt).getTime() - toDate(b.submittedAt).getTime());
  const unreadEssays = allUnreadEssays.slice(0, 5);
  const unreadCount = allUnreadEssays.length;
  const remainingCount = unreadCount - 5;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー（Basicダッシュボード風） */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/training-selection">
                <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                  ← トレーニング選択に戻る
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">YouTube Learning Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/youtuber-tasks">
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Play className="w-4 h-4 mr-2" /> 学習を始める
                </Button>
              </Link>
              <Link href="/youtuber-essays">
                <Button variant="outline" className="relative">
                  <MessageSquare className="w-4 h-4 mr-2" /> 
                  過去のエッセイ
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
              {user && isAdmin(user.email) && (
                <Link href="/admin/dashboard">
                  <Button variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200">
                    <Settings className="w-4 h-4 mr-2" /> 管理者ダッシュボード
                  </Button>
                </Link>
              )}
              <Button variant="ghost" onClick={() => router.push('/login')}>
                <LogOut className="w-4 h-4 mr-2" /> ログアウト
              </Button>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総提出数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEssays}</div>
              <p className="text-xs text-muted-foreground">エッセイ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">完了済み</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedEssays}</div>
              <p className="text-xs text-muted-foreground">添削完了</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均時間</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageTimeSpent}</div>
              <p className="text-xs text-muted-foreground">分</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総学習時間</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(totalTimeSpent / 60)}</div>
              <p className="text-xs text-muted-foreground">分</p>
            </CardContent>
          </Card>
        </div>

        {/* 提出カレンダー */}
        <div className="mb-8">
          <SubmissionCalendar essays={essays} />
        </div>

        {/* 未確認のフィードバック */}
        <div className="mb-8" id="recent-submissions">
          <Card>
            <CardHeader>
              <CardTitle>未確認のフィードバック</CardTitle>
            </CardHeader>
            <CardContent>
              {unreadEssays.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">未確認のフィードバックはありません。</p>
                </div>
              ) : (
                 <div className="space-y-4">
                   {unreadEssays.map((essay) => (
                     <div key={essay.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                       <div className="flex justify-between items-start">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <h3 className="font-medium text-lg">
                               {videoTitles[essay.videoId] || 'YouTube学習エッセイ'}
                             </h3>
                             <span className="px-2 py-0.5 rounded text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                               {essay.taskType === 'summary' ? 'Summary' : 
                                essay.taskType === 'opinion' ? 'Opinion' : 
                                essay.taskId.includes('summary') ? 'Summary' : 
                                essay.taskId.includes('opinion') ? 'Opinion' : 'Summary'}
                             </span>
                           </div>
                           <p className="text-sm text-gray-500">
                             {toDate(essay.submittedAt).toLocaleDateString('ja-JP')} {toDate(essay.submittedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                           </p>
                           <p className="text-sm text-gray-500 mt-1">
                             語数 {essay.wordCount || 0} ・ 所要 {Math.round((essay.timeSpent || 0)/60)}分
                           </p>
                         </div>
                         <div className="flex items-center gap-2 ml-4">
                           <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                             未読
                           </div>
                           <Link href={`/youtuber-essays/${essay.id}`}>
                             <Button asChild variant="outline" size="sm">
                               <span>詳細を見る</span>
                             </Button>
                           </Link>
                         </div>
                       </div>
                       <div className="mt-2">
                         <p className="text-sm text-gray-600 line-clamp-2">{essay.content}</p>
                       </div>
                     </div>
                   ))}
                   {remainingCount > 0 && (
                     <div className="text-center py-2">
                       <p className="text-sm text-gray-500">
                         +{remainingCount}個の未確認フィードバックがあります
                       </p>
                     </div>
                   )}
                 </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
