"use client";

import { useNotification } from "@/contexts/NotificationContext";
import { useRouter } from "next/navigation";
import NotificationToast from "./NotificationToast";

export default function NotificationToastWrapper() {
  const { 
    isNotificationVisible, 
    notificationEssayId, 
    notificationTaskTitle,
    notificationEssayType,
    hideFeedbackNotification 
  } = useNotification();
  const router = useRouter();
  
  console.log('NotificationToastWrapper render:', { 
    isNotificationVisible, 
    notificationEssayId, 
    notificationTaskTitle,
    notificationEssayType
  });

  const handleView = () => {
    if (!notificationEssayId) {
      hideFeedbackNotification();
      return;
    }
    // エッセイの種類に基づいて適切なページに遷移（未設定の場合はTOEFL扱い）
    switch (notificationEssayType) {
      case 'basic':
        router.push(`/basic-essays/${notificationEssayId}`);
        break;
      case 'ielts':
        router.push(`/ielts-dashboard/essays/${notificationEssayId}`);
        break;
      case 'youtuber':
        router.push(`/youtuber-essays/${notificationEssayId}`);
        break;
      case 'integrated':
        router.push(`/dashboard/essays/${notificationEssayId}`);
        break;
      case 'toefl':
      default:
        // TOEFLの場合はAcademic Discussionページに遷移
        router.push(`/academic-discussion-essays/${notificationEssayId}`);
        break;
    }
    hideFeedbackNotification();
  };

  return (
    <NotificationToast
      essayId={notificationEssayId || ''}
      taskTitle={notificationTaskTitle || undefined}
      isVisible={isNotificationVisible}
      onClose={hideFeedbackNotification}
      onView={handleView}
      essayType={notificationEssayType || undefined}
    />
  );
} 