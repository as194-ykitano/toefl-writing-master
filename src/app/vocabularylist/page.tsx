"use client";

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import VocabularyCards from '@/components/profile/VocabularyCards';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function VocabularyListPage() {
  const { user, logout } = useAuth();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (e) {
      alert('ログアウトに失敗しました');
    }
    setLogoutDialogOpen(false);
  };

  return (
    <ProtectedRoute>
      <>
        {/* ヘッダー部分（max-w-7xlで横幅を広げる） */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Vocabulary List</h1>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button>
                  <FileText className="w-4 h-4 mr-2" /> ダッシュボードに戻る
                </Button>
              </Link>
              <Link href="/essays">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" /> 過去のエッセイ
                </Button>
              </Link>
              {/* ログアウトボタン */}
              <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
                <LogOut className="w-4 h-4 mr-2" /> ログアウト
              </Button>
            </div>
          </div>
        </div>

        {/* ログアウト確認ダイアログ */}
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ログアウトの確認</DialogTitle>
              <DialogDescription>
                ログアウトしてもよろしいですか？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                ログアウト
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* メインコンテンツ部分 */}
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="text-center mb-6">
            <p className="text-gray-600">あなたが追加した単語・フレーズを管理できます</p>
          </div>

          <VocabularyCards />
        </div>
      </>
    </ProtectedRoute>
  );
} 