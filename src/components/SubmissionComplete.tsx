"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Home } from 'lucide-react';

interface SubmissionCompleteProps {
  essayId: string;
  taskTitle?: string;
  wordCount: number;
  timeSpent: number;
  taskType?: 'ielts' | 'toefl' | 'basic' | 'integrated'; // integratedを追加
}

export default function SubmissionComplete({ 
  taskTitle, 
  wordCount, 
  timeSpent,
  taskType = 'toefl' // デフォルトはTOEFL（Academic Discussion）
}: SubmissionCompleteProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [redirectTimer, setRedirectTimer] = useState(7);

  useEffect(() => {
    const duration = 7000;
    const intervalTime = 50;
    let elapsed = 0;

    const progressTimer = setInterval(() => {
      elapsed += intervalTime;
      const currentProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(progressTimer);
      }
    }, intervalTime);

    const countdownTimer = setInterval(() => {
      setRedirectTimer(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const redirectTimeout = setTimeout(() => {
      // タスクタイプに応じてリダイレクト先を変更
      let redirectPath;
      switch (taskType) {
        case 'ielts':
          redirectPath = '/ielts-dashboard';
          break;
        case 'basic':
          redirectPath = '/basic-dashboard';
          break;
        case 'integrated':
          redirectPath = '/dashboard';
          break;
        default:
          // TOEFL Academic Discussion は TOEFL ダッシュボードへ
          redirectPath = '/toefl-dashboard';
      }
      router.push(redirectPath);
    }, duration);

    return () => {
      clearInterval(progressTimer);
      clearInterval(countdownTimer);
      clearTimeout(redirectTimeout);
    };
  }, [router, taskType]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTaskTypeLabel = () => {
    switch (taskType) {
      case 'ielts':
        return 'IELTS';
      case 'basic':
        return 'Basic';
      case 'integrated':
        return 'TOEFL Integrated';
      default:
        return 'TOEFL';
    }
  };

  const getRedirectPath = () => {
    switch (taskType) {
      case 'ielts':
        return '/ielts-dashboard';
      case 'basic':
        return '/basic-dashboard';
      case 'integrated':
        return '/dashboard';
      default:
        return '/toefl-dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            提出完了！
          </CardTitle>
          <p className="text-gray-600 mt-2">
            エッセイが正常に提出されました
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* エッセイ情報 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex flex-col space-y-1">
              <span className="text-gray-600 text-sm">タスク:</span>
              <span className="font-medium text-gray-900 break-words">{taskTitle || 'Free Writing Task'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">語数:</span>
              <span className="font-medium">{wordCount} words</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">所要時間:</span>
              <span className="font-medium">{formatTime(timeSpent)}</span>
            </div>
          </div>

          {/* 手書きアニメーション */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex justify-center items-center h-36">
              <img 
                src="/image/writing-hand.png" 
                alt="Writing hand animation" 
                className="w-32 h-32 animate-write object-contain"
              />
            </div>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                フィードバックを作成しています...
              </p>
            </div>
              
            {/* プログレスバー - Notion風 */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span>進捗</span>
                <span className="animate-pulse">処理中</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full animate-progress relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shine"></div>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="space-y-3">
            <Button 
              onClick={() => {
                router.push(getRedirectPath());
              }}
              className="w-full bg-gray-800 text-white font-medium rounded-lg relative overflow-hidden"
            >
              {/* Progress Fill (disappearing) */}
              <div
                className="absolute top-0 right-0 h-full bg-white opacity-20"
                style={{ width: `${100 - progress}%` }}
              />
              {/* Text content */}
              <span className="relative z-10 flex items-center justify-center">
                <Home className="w-4 h-4 mr-2" />
                <span>
                {redirectTimer > 0
                    ? `${getTaskTypeLabel()}ダッシュボードに戻る (${redirectTimer}s)`
                    : `${getTaskTypeLabel()}ダッシュボードに戻る`}
                </span>
              </span>
            </Button>
          </div>

          {/* 補足情報 */}
          <div className="text-center text-xs text-gray-500">
            <p>添削完了時にお知らせが表示されます</p>
          </div>
        </CardContent>
      </Card>
      
      {/* カスタムCSSアニメーション */}
      <style jsx>{`
        @keyframes write {
          0% { 
            transform: translateY(0px) translateX(-4px) rotate(-2deg); 
          }
          25% { 
            transform: translateY(2px) translateX(4px) rotate(0deg); 
          }
          50% { 
            transform: translateY(0px) translateX(8px) rotate(2deg); 
          }
          75% { 
            transform: translateY(-2px) translateX(4px) rotate(0deg); 
          }
          100% { 
            transform: translateY(0px) translateX(-4px) rotate(-2deg); 
          }
        }
        
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-write {
          animation: write 1.3s ease-in-out infinite;
        }
        
        .animate-progress {
          animation: progress 3s ease-in-out infinite;
        }
        
        .animate-shine {
          animation: shine 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
} 
