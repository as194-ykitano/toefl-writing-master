"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, FileText, Target, TrendingUp, Bell, Eye, MessageSquare, LogOut, Settings } from "lucide-react";
import { getBasicEssays } from "@/lib/firebase";
import { BasicEssay } from "@/lib/types";
import Link from "next/link";
import { useSearchParams, useRouter as useNextRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isAdmin } from "@/lib/utils";
import { SubmissionCalendar } from "@/components/SubmissionCalendar";
import NotificationToast from "@/components/NotificationToast";

export default function BasicDashboardPage() {
  const { user, loading } = useAuth();
  const {
    isNotificationVisible,
    notificationEssayId,
    notificationTaskTitle,
    hideFeedbackNotification,
    notificationEssayType,
  } = useNotification();
  const router = useRouter();
  const nextRouter = useNextRouter();
  const searchParams = useSearchParams();
  const [essays, setEssays] = useState<BasicEssay[]>([]);
  const [loadingEssays, setLoadingEssays] = useState(true);
  const [viewEssayId, setViewEssayId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (user && loadingEssays) {
      fetchEssays();
    }
  }, [user, loading, router, loadingEssays]);

  const fetchEssays = async () => {
    if (!user) return;
    
    try {
      const userEssays = await getBasicEssays(user.uid);
      setEssays(userEssays);
    } catch (error) {
      console.error("Error fetching essays:", error);
    } finally {
      setLoadingEssays(false);
    }
  };

  // Handle view query param to open modal
  useEffect(() => {
    const paramId = searchParams?.get('view');
    if (paramId) {
      setViewEssayId(paramId);
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setViewEssayId(null);
    nextRouter.push('/basic-dashboard');
  };

  const handleNotificationView = () => {
    if (notificationEssayId) {
      router.push(`/basic-essays/${notificationEssayId}`);
    }
    hideFeedbackNotification();
  };

  if (loading || loadingEssays) {
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
  const unreadEssays = essays
    .filter(e => (
      e.status === 'feedback_completed' && !e.feedbackRead
    ))
    .sort((a, b) => (new Date(a.submittedAt as any).getTime()) - (new Date(b.submittedAt as any).getTime()))
    .slice(0, 5);
  const unreadCount = essays.filter(e => (
    e.status === 'feedback_completed' && !e.feedbackRead
  )).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 通知トースト */}
        <NotificationToast
          essayId={notificationEssayId || ''}
          taskTitle={notificationTaskTitle || undefined}
          isVisible={isNotificationVisible}
          onClose={hideFeedbackNotification}
          onView={handleNotificationView}
          essayType={notificationEssayType || undefined}
        />
        {/* ヘッダー（IELTSダッシュボード風） */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/training-selection">
                <Button variant="outline" className="text-gray-600 hover:text-gray-800">
                  ← トレーニング選択に戻る
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Basic Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/basic-tasks">
                <Button className="bg-green-600 hover:bg-green-700">
                  <FileText className="w-4 h-4 mr-2" /> 演習を始める
                </Button>
              </Link>
              <Link href="/basic-essays">
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

        {/* 未確認のフィードバック（IELTS風） */}
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
                        <div>
                          <h3 className="font-medium">
                            {new Date(essay.submittedAt as any).toLocaleDateString('ja-JP')} {new Date(essay.submittedAt as any).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            語数 {essay.wordCount || 0} ・ 所要 {Math.round((essay.timeSpent || 0)/60)}分
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            未読
                          </div>
                          <Link href={`/basic-essays/${essay.id}`}>
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 詳細モーダル */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添削結果</DialogTitle>
            </DialogHeader>
            {(() => {
              const essay = essays.find((e) => e.id === viewEssayId);
              if (!essay) return <div className="text-sm text-gray-500">読み込み中...</div>;
              return (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">全体的な印象</h4>
                    <p className="text-gray-700">{essay.feedback?.overall || '—'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">良い点</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {(essay.feedback?.strengths || []).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">改善点</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {(essay.feedback?.improvements || []).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  {essay.feedback?.grammarCorrections?.corrections?.length ? (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">文法添削</h4>
                      <div className="space-y-3">
                        {essay.feedback.grammarCorrections.corrections.map((c, i) => (
                          <div key={i} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <div className="text-sm text-gray-600 mb-1">原文:</div>
                            <div className="text-gray-800 font-medium mb-1">"{c.original}"</div>
                            <div className="text-sm text-gray-600 mb-1">修正後:</div>
                            <div className="text-green-800 font-medium mb-1">"{c.corrected}"</div>
                            <div className="text-sm text-gray-600 mb-1">説明:</div>
                            <div className="text-gray-700">{c.explanation}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
