"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Essay } from '@/lib/types';

type EssayNotificationDoc = Pick<Essay, 'status' | 'feedbackRead'> & {
  taskType?: string;
};

interface NotificationContextType {
  unreadFeedbackCount: number;
  showFeedbackNotification: (essayId: string, taskTitle?: string, essayType?: 'basic' | 'ielts' | 'toefl' | 'youtuber' | 'integrated') => void;
  hideFeedbackNotification: () => void;
  notificationEssayId: string | null;
  notificationTaskTitle: string | null;
  notificationEssayType: 'basic' | 'ielts' | 'toefl' | 'youtuber' | 'integrated' | null;
  isNotificationVisible: boolean;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [notificationEssayId, setNotificationEssayId] = useState<string | null>(null);
  const [notificationTaskTitle, setNotificationTaskTitle] = useState<string | null>(null);
  const [notificationEssayType, setNotificationEssayType] = useState<'basic' | 'ielts' | 'toefl' | 'youtuber' | 'integrated' | null>(null);

  // ページロード時にlocalStorageから通知状態を復元
  useEffect(() => {
    const savedNotification = localStorage.getItem('pendingFeedbackNotification');
    if (savedNotification) {
      try {
        const notificationData = JSON.parse(savedNotification);
        // 5分以内の通知のみ復元（古い通知は無視）
        if (Date.now() - notificationData.timestamp < 5 * 60 * 1000) {
          setNotificationEssayId(notificationData.essayId);
          setNotificationTaskTitle(notificationData.taskTitle);
          setNotificationEssayType(notificationData.essayType);
          setIsNotificationVisible(true);
          
          // 5秒後に自動で非表示にする
          setTimeout(() => {
            hideFeedbackNotification();
          }, 5000);
        } else {
          // 古い通知は削除
          localStorage.removeItem('pendingFeedbackNotification');
        }
      } catch (error) {
        console.error('Error parsing saved notification:', error);
        localStorage.removeItem('pendingFeedbackNotification');
      }
    }
  }, []);

  // 未読フィードバック数の監視
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const essaysRef = collection(userDocRef, 'essays');
    const basicEssaysRef = collection(userDocRef, 'basicEssays');
    const youTuberEssaysRef = collection(userDocRef, 'youTuberEssays');
    
    let totalCount = 0;
    
    const unsubscribeEssays = onSnapshot(essaysRef, (essaysSnapshot) => {
      let count = 0;
      essaysSnapshot.docs.forEach((essayDoc) => {
        const essayData = essayDoc.data() as Essay;
        // フィードバックが完了していて、まだ読まれていないエッセイをカウント
        // statusが'feedback_completed'で、feedbackReadがfalseまたは未設定の場合
        if (essayData.status === 'feedback_completed' && !essayData.feedbackRead) {
          count++;
        }
      });
      totalCount = count;
      setUnreadFeedbackCount(totalCount);
    });

    const unsubscribeBasicEssays = onSnapshot(basicEssaysRef, (basicEssaysSnapshot) => {
      let basicCount = 0;
      basicEssaysSnapshot.docs.forEach((essayDoc) => {
        const essayData = essayDoc.data() as Essay;
        // 未読としてカウントするのはフィードバック完了かつ未読のみ（待機中/処理中は除外）
        if (essayData.status === 'feedback_completed' && !essayData.feedbackRead) {
          basicCount++;
        }
      });
      setUnreadFeedbackCount(totalCount + basicCount);
    });

    const unsubscribeYouTuberEssays = onSnapshot(youTuberEssaysRef, (youTuberEssaysSnapshot) => {
      let youTuberCount = 0;
      youTuberEssaysSnapshot.docs.forEach((essayDoc) => {
        const essayData = essayDoc.data() as Essay;
        // フィードバックが完了していて、まだ読まれていないエッセイをカウント
        if (essayData.status === 'feedback_completed' && !essayData.feedbackRead) {
          youTuberCount++;
        }
      });
      setUnreadFeedbackCount(totalCount + youTuberCount);
    });

    return () => {
      unsubscribeEssays();
      unsubscribeBasicEssays();
      unsubscribeYouTuberEssays();
    };
  }, [user]);

  // フィードバック完了トーストのリアルタイム監視（ユーザー全体）
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const essaysRef = collection(userDocRef, 'essays');
    const basicEssaysRef = collection(userDocRef, 'basicEssays');
    const youTuberEssaysRef = collection(userDocRef, 'youTuberEssays');

    let initializedEssays = false;
    let initializedBasic = false;
    let initializedYouTuber = false;

    const unsub1 = onSnapshot(essaysRef, (snap) => {
      if (!initializedEssays) {
        initializedEssays = true;
        return; // 初回ロードでは通知しない
      }
      snap.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const data = change.doc.data() as EssayNotificationDoc;
          if (data?.status === 'feedback_completed' && !data?.feedbackRead) {
            // TOEFLエッセイかIELTSエッセイかを判定
            const essayType = data?.taskType === 'ielts' ? 'ielts' : 'toefl';
            showFeedbackNotification(change.doc.id, undefined, essayType);
          }
        }
      });
    });

    const unsub2 = onSnapshot(basicEssaysRef, (snap) => {
      if (!initializedBasic) {
        initializedBasic = true;
        return; // 初回ロードでは通知しない
      }
      snap.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const data = change.doc.data() as EssayNotificationDoc;
          if (data?.status === 'feedback_completed' && !data?.feedbackRead) {
            showFeedbackNotification(change.doc.id, undefined, 'basic');
          }
        }
      });
    });

    const unsub3 = onSnapshot(youTuberEssaysRef, (snap) => {
      if (!initializedYouTuber) {
        initializedYouTuber = true;
        return; // 初回ロードでは通知しない
      }
      snap.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const data = change.doc.data() as EssayNotificationDoc;
          if (data?.status === 'feedback_completed' && !data?.feedbackRead) {
            showFeedbackNotification(change.doc.id, undefined, 'youtuber');
          }
        }
      });
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user]);

  const showFeedbackNotification = (essayId: string, taskTitle?: string, essayType?: 'basic' | 'ielts' | 'toefl' | 'youtuber' | 'integrated') => {
    console.log('showFeedbackNotification called with:', { essayId, taskTitle, essayType });
    setNotificationEssayId(essayId);
    setNotificationTaskTitle(taskTitle || null);
    setNotificationEssayType(essayType || null);
    setIsNotificationVisible(true);
    
    // localStorageに通知状態を保存（リフレッシュ後も表示するため）
    const notificationData = {
      essayId,
      taskTitle: taskTitle || null,
      essayType: essayType || null,
      timestamp: Date.now()
    };
    localStorage.setItem('pendingFeedbackNotification', JSON.stringify(notificationData));
    
    console.log('Notification state updated:', { 
      essayId: essayId, 
      taskTitle: taskTitle || null, 
      essayType: essayType || null,
      isVisible: true 
    });
  };

  const hideFeedbackNotification = () => {
    setIsNotificationVisible(false);
    setNotificationEssayId(null);
    setNotificationTaskTitle(null);
    setNotificationEssayType(null);
    
    // localStorageから通知状態を削除
    localStorage.removeItem('pendingFeedbackNotification');
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // 簡単なアラート表示（後でToastコンポーネントに置き換えることも可能）
    if (type === 'error') {
      alert(`エラー: ${message}`);
    } else if (type === 'success') {
      alert(`成功: ${message}`);
    } else {
      alert(message);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadFeedbackCount,
        showFeedbackNotification,
        hideFeedbackNotification,
        notificationEssayId,
        notificationTaskTitle,
        notificationEssayType,
        isNotificationVisible,
        showNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 
