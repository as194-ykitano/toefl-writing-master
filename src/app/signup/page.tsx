"use client";

import SignUpForm from '@/components/auth/SignUpForm';
import AuthThemeToggle from '@/components/auth/AuthThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function SignUpPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <AuthThemeToggle />
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <Image src="/exavia-logo.png" alt="Exavia logo" width={64} height={64} className="mx-auto mb-4 rounded-2xl" priority />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Exavia</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">無料でアカウントを作成して学習を始めましょう</p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
