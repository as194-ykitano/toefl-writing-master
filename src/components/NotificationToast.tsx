"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationToastProps {
  essayId: string;
  taskTitle?: string;
  isVisible: boolean;
  onClose: () => void;
  onView: () => void;
  essayType?: 'basic' | 'ielts' | 'toefl' | 'youtuber' | 'integrated';
}

export default function NotificationToast({
  taskTitle,
  isVisible,
  onClose,
  onView,
  essayType
}: NotificationToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // 自動で消える（5秒後）
      const timer = setTimeout(() => {
        onClose();
        // 通知が消える際にエッセイ種別ごとに遷移
        if (essayType === 'ielts') {
          router.push('/ielts-dashboard');
        } else if (essayType === 'basic') {
          router.push('/basic-dashboard');
        } else if (essayType === 'youtuber') {
          router.push('/youtuber-dashboard');
        } else if (essayType === 'integrated') {
          router.push('/dashboard');
        } else {
          // デフォルトはAcademic Discussion
          router.push('/toefl-dashboard');
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, router]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border border-green-200 transform transition-all duration-300 ease-in-out",
        isAnimating ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-gray-900">
                添削完了！
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {taskTitle || 'エッセイ'}の添削が完了しました
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onView}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                確認する
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
