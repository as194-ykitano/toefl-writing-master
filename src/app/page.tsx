"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // 管理者かどうかをチェックして適切なダッシュボードにリダイレクト
        if (isAdmin(user.email)) {
          router.push("/admin");
        } else {
          // ユーザーネームが未設定の場合は設定ページに遷移
          if (!user.displayName || user.displayName.trim() === '') {
            router.push("/user-name-setup");
          } else {
            // 新しい 4 技能ホームへ（旧 /training-selection も引き続き利用可能）
            router.push("/home");
          }
        }
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
