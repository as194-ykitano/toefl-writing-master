import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface ReadingPassage {
  id: string;
  title: string;
  passage: string;
  difficulty: string;
  category: string[];
  createdAt: Date;
  updatedAt: Date;
}

export async function getReadingPassages(): Promise<ReadingPassage[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'readingPassages'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ReadingPassage[];
  } catch (error) {
    console.error('Error fetching reading passages:', error);
    return [];
  }
}

export async function getReadingPassageById(id: string): Promise<ReadingPassage | null> {
  try {
    const docRef = doc(db, 'readingPassages', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('No such document!');
      return null;
    }

    const data = docSnap.data();
    console.log('Document data:', data);

    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as ReadingPassage;
  } catch (error) {
    console.error('Error fetching reading passage:', error);
    return null;
  }
} 