"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BookOpen, BarChart3, Target } from "lucide-react"
import TaskDisplay from '../components/TaskDisplay'
import { isAdmin } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // 管理者かどうかをチェックして適切なダッシュボードにリダイレクト
        if (isAdmin(user.email)) {
          router.push("/admin/dashboard");
        } else {
          // ユーザーネームが未設定の場合は設定ページに遷移
          if (!user.displayName || user.displayName.trim() === '') {
            router.push("/user-name-setup");
          } else {
            router.push("/training-selection");
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
