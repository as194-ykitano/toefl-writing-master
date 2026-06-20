import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ReadingPassage } from './types';

export async function getReadingPassages(): Promise<ReadingPassage[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'readingPassages'));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        content: data.passage,
        createdAt: data.createdAt,
        difficulty: data.difficulty || '',
        category: data.category || '',
        wordCount: data.wordCount || 0,
        estimatedReadingTime: data.estimatedReadingTime || 0
      } as ReadingPassage;
    });
  } catch (error) {
    console.error('Error fetching reading passages:', error);
    return [];
  }
}

export async function getReadingPassageById(passageId: string): Promise<ReadingPassage | null> {
  try {
    const passageRef = doc(db, 'readingPassages', passageId);
    const passageSnap = await getDoc(passageRef);
    
    if (!passageSnap.exists()) {
      return null;
    }

    const data = passageSnap.data();
    return {
      id: passageSnap.id,
      title: data.title,
      content: data.passage,
      createdAt: data.createdAt,
      difficulty: data.difficulty || '',
      category: data.category || '',
      wordCount: data.wordCount || 0,
      estimatedReadingTime: data.estimatedReadingTime || 0
    } as ReadingPassage;
  } catch (error) {
    console.error('Error getting reading passage:', error);
    return null;
  }
} 