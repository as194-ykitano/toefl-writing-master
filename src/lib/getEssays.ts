import { db } from './firebase';
import { doc, getDoc, collection, updateDoc } from 'firebase/firestore';
import { Essay } from './types';

export async function getEssayById(essayId: string, userId: string): Promise<Essay | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const essaysCollectionRef = collection(userDocRef, 'essays');
    const essayRef = doc(essaysCollectionRef, essayId);
    const essaySnap = await getDoc(essayRef);
    
    if (!essaySnap.exists()) {
      return null;
    }

    return {
      id: essaySnap.id,
      ...essaySnap.data()
    } as Essay;
  } catch (error) {
    console.error('Error getting essay:', error);
    return null;
  }
}

export async function markFeedbackAsRead(essayId: string, userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const essaysCollectionRef = collection(userDocRef, 'essays');
    const essayRef = doc(essaysCollectionRef, essayId);
    
    await updateDoc(essayRef, {
      feedbackRead: true
    });
    
    return true;
  } catch (error) {
    console.error('Error marking feedback as read:', error);
    return false;
  }
}

// Basicエッセイ用の既読処理
export async function markBasicFeedbackAsRead(essayId: string, userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const basicEssaysCollectionRef = collection(userDocRef, 'basicEssays');
    const essayRef = doc(basicEssaysCollectionRef, essayId);
    
    await updateDoc(essayRef, {
      feedbackRead: true
    });
    
    return true;
  } catch (error) {
    console.error('Error marking basic feedback as read:', error);
    return false;
  }
}

// YouTube Learningエッセイ用の既読処理
export async function markYouTuberFeedbackAsRead(essayId: string, userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const youTuberEssaysCollectionRef = collection(userDocRef, 'youTuberEssays');
    const essayRef = doc(youTuberEssaysCollectionRef, essayId);
    
    await updateDoc(essayRef, {
      feedbackRead: true
    });
    
    return true;
  } catch (error) {
    console.error('Error marking YouTuber feedback as read:', error);
    return false;
  }
} 