"use client";

// オンボーディング完了後のランディング。
// 「ミニ診断を受ける（Coming Soon）」と「問題を解き始める」の2択を提示する。

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ClipboardCheck, FileText, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthThemeToggle from '@/components/auth/AuthThemeToggle';

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const name = user?.displayName;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4 py-12">
      <AuthThemeToggle />
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
            {name ? `ようこそ、${name} さん` : 'ようこそ'}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-gray-500 dark:text-gray-400">
            まずは何から始めますか？
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ミニ診断（Coming Soon：現状は無効） */}
          <div
            className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 opacity-70 cursor-not-allowed animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700"
            style={{ animationDelay: '150ms' }}
          >
            <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-2.5 py-1">
              <Clock className="w-3 h-3" /> Coming Soon
            </span>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
              ミニ診断を受ける
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              まずは今のレベルを短時間でチェック。結果をもとに、あなたに合った学習プランと練習内容を提案します。
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gray-400">
              準備中
            </span>
          </div>

          {/* 問題を解き始める → ホーム（オンボーディング直後は使い方ツアーを強制起動） */}
          <Link
            href="/home?tour=1"
            style={{ animationDelay: '300ms' }}
            className="group relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 transition-all hover:border-emerald-300 dark:hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
              問題を解き始める
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              4技能（Reading / Listening / Speaking / Writing）の問題タイプ別に、すぐに練習を始められます。
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 group-hover:gap-1.5 transition-all">
              始める <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
