// my-app/src/lib/firebase.ts の先頭
console.log('FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, Timestamp, deleteDoc, query, where, setDoc, orderBy } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Task, ReadingPassage, Essay, EssayFeedback, UserProfile, LearningGoals, VocabularyItem, BasicEssay, YouTuberTask, YouTuberEssay, YouTubeVideo } from './types';
import { getReadingPassageById } from './getReadingPassages';
import { getEssayById } from './getEssays';
// analyzeEssayはAPIルートを使用するため、直接インポートしない


// 環境変数の値を確認
console.log('Environment variables check:', {
  hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 設定値の検証
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
  console.error('Firebase configuration is incomplete:', firebaseConfig);
  throw new Error('Firebase configuration is incomplete. Please check your environment variables.');
}

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firebase Functions
export const functions = getFunctions(app);

// デバッグ用：Firebaseの設定を確認
console.log('Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  // 機密情報は表示しない
});

// タスクの取得
export async function getTasks(): Promise<Task[]> {
  try {
    const tasksQuery = query(
      collection(db, 'tasks'), 
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(tasksQuery);
    const tasks = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    
    // クライアントサイドで作成日時の昇順でソート
    return tasks.sort((a, b) => {
      const getDate = (date: Date | Timestamp | undefined): Date => {
        if (!date) return new Date(0);
        if (date instanceof Date) return date;
        if (typeof date === 'object' && 'toDate' in date) return date.toDate();
        return new Date(date);
      };
      
      const dateA = getDate(a.createdAt);
      const dateB = getDate(b.createdAt);
      return dateA.getTime() - dateB.getTime(); // 昇順（古い順）
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

// 特定のタスクの取得
export async function getTaskById(taskId: string): Promise<Task | null> {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      return null;
    }

    return {
      id: taskSnap.id,
      ...taskSnap.data()
    } as Task;
  } catch (error) {
    console.error('Error getting task:', error);
    return null;
  }
}

// エッセイの保存
export async function saveEssay(essay: Omit<Essay, 'id'>, userId: string): Promise<string> {
  try {
    const essayData: Omit<Essay, 'id'> = {
      ...essay,
      userId,
      submittedAt: essay.submittedAt instanceof Date ? essay.submittedAt : (essay.submittedAt instanceof Timestamp ? essay.submittedAt.toDate() : new Date()),
      status: essay.status || 'completed',
    };
    const userDocRef = doc(db, 'users', userId);
    const essaysCollectionRef = collection(userDocRef, 'essays');
    const docRef = await addDoc(essaysCollectionRef, essayData);
    return docRef.id;
  } catch (error) {
    console.error('Error in saveEssay:', error);
    throw error;
  }
}

// Get user's essays
export async function getUserEssays(userId: string): Promise<Essay[]> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const essaysCollectionRef = collection(userDocRef, 'essays');
    const querySnapshot = await getDocs(essaysCollectionRef);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        content: data.content,
        submittedAt: data.submittedAt,
        status: data.status,
        feedback: data.feedback,
      } as Essay;
    });
  } catch (error) {
    console.error('Error fetching user essays:', error);
    throw error;
  }
}

// エッセイの取得
export async function getEssays(): Promise<Essay[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'essays'));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        content: data.content,
        submittedAt: data.submittedAt,
        status: data.status,
        feedback: data.feedback,
      } as Essay;
    });
  } catch (error) {
    console.error('Error fetching essays:', error);
    return [];
  }
}

// エッセイのフィードバックを取得
export async function getEssayFeedback(essayId: string, userId: string): Promise<EssayFeedback | null> {
  try {
    // 処理開始時にstatusをprocessingに設定
    const essayRef = doc(db, 'users', userId, 'essays', essayId);
    await updateDoc(essayRef, {
      status: 'processing'
    });

    const essay = await getEssayById(essayId, userId);
    if (!essay) {
      throw new Error('Essay not found');
    }

    // タスクの情報を取得
    const taskRef = doc(db, 'tasks', essay.taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }

    const task = taskSnap.data() as any;
    if (!task) {
      throw new Error('Task data is empty');
    }
    const taskType = task.taskType as string | undefined;

    // Academic Discussion の場合は別フロー（openai.ts内の Academic Discussion 分析やサンプル生成を利用）
    let feedback: any;
    if (taskType === 'academic_discussion') {
      if (!task.discussionContent) {
        throw new Error('Task missing discussionContent for academic_discussion');
      }
      // Academic Discussionの評価
      const { analyzeTOEFLAcademicDiscussion, generateTOEFLAcademicDiscussionModelAnswer } = await import('./openai');
      feedback = await analyzeTOEFLAcademicDiscussion(
        essay.content,
        task.discussionContent
      );

      // stance は現状 Firestore に未保存のため、将来的にessayに保持するならここで参照
      // 暫定として agree を既定にせず、テンプレに依存するには essay.document 内に stance を保存する必要がある
      // もし essay.stance を保存した場合はそれを使う（型拡張が必要）
      const stance: 'agree' | 'disagree' = (essay as any).stance || 'agree';
      const modelAnswer = await generateTOEFLAcademicDiscussionModelAnswer(
        stance,
        essay.content,
        task.discussionContent
      );
      feedback = {
        ...feedback,
        modelAnswer: modelAnswer,
      };
    } else {
      if (!task.readingPassageId) {
        throw new Error('Task missing readingPassageId for integrated task');
      }
      // 従来のIntegratedタスク等
      const readingPassageRef = doc(db, 'readingPassages', task.readingPassageId);
      const readingPassageSnap = await getDoc(readingPassageRef);
      
      if (!readingPassageSnap.exists()) {
        throw new Error('Reading passage not found');
      }

      const readingPassage = readingPassageSnap.data();

      feedback = await analyzeEssayWithAPI(
        essay.content,
        readingPassage.content,
        task.listeningAudioURL || ''
      );
    }

    // フィードバックを保存し、statusをfeedback_completedに更新
    const updatePayload: any = {
      feedback,
      status: 'feedback_completed',
      feedbackRead: false,
    };
    if (typeof feedback.score === 'number') {
      updatePayload.score = feedback.score;
    }
    await updateDoc(essayRef, updatePayload);

    return feedback;
  } catch (error) {
    console.error('Error in getEssayFeedback:', error);
    
    // エラーが発生した場合、statusをerrorに更新
    try {
      const essayRef = doc(db, 'users', userId, 'essays', essayId);
      await updateDoc(essayRef, {
        status: 'error'
      });
    } catch (updateError) {
      console.error('Error updating essay status to error:', updateError);
    }
    
    throw error;
  }
}

// Add a new function to analyze essay using the API endpoint
export async function analyzeEssayWithAPI(essayText: string, readingPassage: string, listeningPassage: string) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      essayText,
      readingPassage,
      listeningPassage,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze essay');
  }

  return response.json();
}

// 全てのエッセイを削除する関数
export async function deleteAllEssays(): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, 'essays'));
    const deletePromises = querySnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    await Promise.all(deletePromises);
    console.log('All essays have been deleted successfully');
  } catch (error) {
    console.error('Error deleting essays:', error);
    throw error;
  }
}

// 文法添削のデータ構造を更新するマイグレーション関数
export async function migrateGrammarCorrections() {
  try {
    const essaysRef = collection(db, 'essays');
    const essaysSnapshot = await getDocs(essaysRef);
    
    for (const doc of essaysSnapshot.docs) {
      const essay = doc.data();
      if (essay.feedback?.grammarCorrections?.corrections) {
        const updatedCorrections = essay.feedback.grammarCorrections.corrections.map((correction: any) => {
          // 5文前後の文脈を保持
          return {
            ...correction,
            fullSentence: correction.fullSentence || '' // fullSentenceが存在しない場合は空文字列を設定
          };
        });

        // 更新されたデータを保存
        await updateDoc(doc.ref, {
          'feedback.grammarCorrections.corrections': updatedCorrections
        });
      }
    }
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Auth functions
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Error signing in:', error);
    if (error.code === 'auth/user-not-found') {
      throw new Error('メールアドレスまたはパスワードが正しくありません。');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('メールアドレスまたはパスワードが正しくありません。');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('有効なメールアドレスを入力してください。');
    } else {
      throw new Error('ログイン中にエラーが発生しました。');
    }
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// User profile functions
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }
    return userDoc.data() as UserProfile;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);

    // If displayName or photoURL is updated, also update auth profile
    if (data.displayName || data.photoURL) {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: data.displayName,
          photoURL: data.photoURL
        });
      }
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const uploadProfileImage = async (userId: string, file: File): Promise<string> => {
  try {
    const storageRef = ref(storage, `profile_images/${userId}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    // Update user profile with new photo URL
    await updateUserProfile(userId, { photoURL: downloadURL });
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

export async function updateLearningGoals(
  userId: string,
  goals: LearningGoals
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      learningGoals: goals,
    });
  } catch (error) {
    console.error('Error updating learning goals:', error);
    throw error;
  }
}

// Create user profile
export async function createUserProfile(user: User) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || null,
        createdAt: new Date().toISOString(),
        studySessions: [],
        totalStudyTime: 0
      });
    }
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
} 

// 音声ファイルをFirebase Storageにアップロード
export async function uploadAudioFile(file: File, taskId: string): Promise<string> {
  try {
    const audioRef = ref(storage, `audio/${taskId}/${file.name}`);
    const snapshot = await uploadBytes(audioRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading audio file:', error);
    throw error;
  }
}

// 音声ファイルのURLを取得
export async function getAudioURL(taskId: string, fileName: string): Promise<string> {
  try {
    const audioRef = ref(storage, `audio/${taskId}/${fileName}`);
    const downloadURL = await getDownloadURL(audioRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting audio URL:', error);
    throw error;
  }
}

// タスクの音声URLを更新
export async function updateTaskAudioURL(taskId: string, audioURL: string): Promise<void> {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      listeningAudioURL: audioURL,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating task audio URL:', error);
    throw error;
  }
}

// 単語・フレーズを保存
export async function saveVocabularyItem(
  userId: string, 
  vocabularyItem: Omit<VocabularyItem, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const vocabularyCollectionRef = collection(userDocRef, 'vocabulary');
    const docRef = await addDoc(vocabularyCollectionRef, {
      ...vocabularyItem,
      userId,
      createdAt: new Date(),
      reviewCount: 0
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving vocabulary item:', error);
    throw error;
  }
}

// ユーザーの単語・フレーズ一覧を取得
export async function getUserVocabulary(userId: string): Promise<VocabularyItem[]> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const vocabularyCollectionRef = collection(userDocRef, 'vocabulary');
    const querySnapshot = await getDocs(vocabularyCollectionRef);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        word: data.word,
        meaning: data.meaning,
        context: data.context,
        source: data.source,
        sourceId: data.sourceId,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        lastReviewed: data.lastReviewed?.toDate?.() || undefined,
        reviewCount: data.reviewCount || 0,
        difficulty: data.difficulty || 'medium',
        tags: data.tags || []
      } as VocabularyItem;
    });
  } catch (error) {
    console.error('Error fetching user vocabulary:', error);
    throw error;
  }
}

// 単語・フレーズを削除
export async function deleteVocabularyItem(userId: string, itemId: string): Promise<void> {
  try {
    const itemRef = doc(db, 'users', userId, 'vocabulary', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error deleting vocabulary item:', error);
    throw error;
  }
}

// 単語・フレーズを更新
export async function updateVocabularyItem(
  userId: string, 
  itemId: string, 
  updates: Partial<VocabularyItem>
): Promise<void> {
  try {
    const itemRef = doc(db, 'users', userId, 'vocabulary', itemId);
    await updateDoc(itemRef, {
      ...updates,
      lastReviewed: new Date()
    });
  } catch (error) {
    console.error('Error updating vocabulary item:', error);
    throw error;
  }
}

// 今月の単語数を取得
export async function getThisMonthVocabularyCount(userId: string): Promise<number> {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 今月の開始日と終了日
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    const userDocRef = doc(db, 'users', userId);
    const vocabularyCollectionRef = collection(userDocRef, 'vocabulary');
    
    // 今月作成された単語をフィルタリング
    const q = query(
      vocabularyCollectionRef,
      where('createdAt', '>=', thisMonthStart),
      where('createdAt', '<=', thisMonthEnd)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error fetching this month vocabulary count:', error);
    return 0;
  }
} 

// IELTSエッセイの保存
export async function saveIELTSEssay(essay: Omit<Essay, 'id'>, userId: string): Promise<string> {
  try {
    const essayData: Omit<Essay, 'id'> = {
      ...essay,
      submittedAt: essay.submittedAt instanceof Date ? Timestamp.fromDate(essay.submittedAt) : essay.submittedAt,
      status: "processing" as const,
    };

    const docRef = await addDoc(collection(db, 'users', userId, 'essays'), essayData);
    
    // 保存したエッセイのIDを返す
    return docRef.id;
  } catch (error) {
    console.error('Error saving IELTS essay:', error);
    throw error;
  }
}

// IELTSエッセイのフィードバックを取得
export async function getIELTSEssayFeedback(essayId: string, userId: string): Promise<EssayFeedback | null> {
  try {
    // 処理開始時にstatusをprocessingに設定
    const essayRef = doc(db, 'users', userId, 'essays', essayId);
    await updateDoc(essayRef, {
      status: 'processing'
    });

    const essay = await getEssayById(essayId, userId);
    if (!essay) {
      throw new Error('Essay not found');
    }

    // タスクの情報を取得
    const taskRef = doc(db, 'tasks', essay.taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }

    const task = taskSnap.data() as Task;

    // IELTS用のフィードバックを生成
    const ieltsTaskType: 'task1' | 'task2' = (task.taskType === 'task1' || task.taskType === 'task2') ? task.taskType : 'task2';
    const feedback = await analyzeIELTSEssayWithAPI(
      essay.content,
      ieltsTaskType,
      task.content || '',
      task.imageUrl
    );

    // フィードバックを保存し、statusをfeedback_completedに更新
    await updateDoc(essayRef, {
      feedback,
      status: 'feedback_completed',
      feedbackRead: false, // フィードバック未読として初期化
      score: feedback.score // 30点満点のスコアを保存
    });

    return feedback;
  } catch (error) {
    console.error('Error in getIELTSEssayFeedback:', error);
    
    // エラーが発生した場合、statusをerrorに更新
    try {
      const essayRef = doc(db, 'users', userId, 'essays', essayId);
      await updateDoc(essayRef, {
        status: 'error'
      });
    } catch (updateError) {
      console.error('Error updating essay status to error:', updateError);
    }
    
    throw error;
  }
}

// IELTSエッセイ分析用のAPI呼び出し
export async function analyzeIELTSEssayWithAPI(
  essayText: string, 
  taskType: 'task1' | 'task2', 
  taskContent: string, 
  imageUrl?: string
) {
  const response = await fetch('/api/analyze-ielts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      essayText,
      taskType,
      taskContent,
      imageUrl,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze IELTS essay');
  }

  return response.json();
} 

// Basicトレーニング用の関数
export const saveBasicEssay = async (essay: Omit<BasicEssay, 'id'>): Promise<string> => {
  try {
    const essayRef = await addDoc(collection(db, 'users', essay.userId, 'basicEssays'), {
      ...essay,
      submittedAt: Timestamp.now()
    });
    return essayRef.id;
  } catch (error) {
    console.error('Error saving basic essay:', error);
    throw error;
  }
};

export const getBasicEssays = async (userId: string): Promise<BasicEssay[]> => {
  try {
    const essaysRef = collection(db, 'users', userId, 'basicEssays');
    const q = query(
      essaysRef,
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const essays: BasicEssay[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      essays.push({
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : new Date()
      } as BasicEssay);
    });
    
    return essays;
  } catch (error) {
    console.error('Error getting basic essays:', error);
    throw error;
  }
};

export const updateBasicEssayFeedback = async (essayId: string, userId: string, feedback: any): Promise<void> => {
  try {
    console.log('Updating basic essay feedback for:', essayId, 'user:', userId);
    const essayRef = doc(db, 'users', userId, 'basicEssays', essayId);
    await updateDoc(essayRef, {
      feedback,
      status: 'feedback_completed',
      feedbackRead: false,
      updatedAt: Timestamp.now()
    });
    console.log('Basic essay feedback updated successfully');
  } catch (error) {
    console.error('Error updating basic essay feedback:', error);
    throw error;
  }
};

// YouTube Learning用の関数
export const saveYouTuberEssay = async (essay: Omit<YouTuberEssay, 'id'>): Promise<string> => {
  try {
    const essayRef = await addDoc(collection(db, 'users', essay.userId, 'youTuberEssays'), {
      ...essay,
      submittedAt: Timestamp.now()
    });
    return essayRef.id;
  } catch (error) {
    console.error('Error saving YouTuber essay:', error);
    throw error;
  }
};

export const getYouTuberEssays = async (userId: string): Promise<YouTuberEssay[]> => {
  try {
    const essaysRef = collection(db, 'users', userId, 'youTuberEssays');
    const q = query(
      essaysRef,
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const essays: YouTuberEssay[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      essays.push({
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : new Date()
      } as YouTuberEssay);
    });
    
    return essays;
  } catch (error) {
    console.error('Error getting YouTuber essays:', error);
    throw error;
  }
};

export const updateYouTuberEssayFeedback = async (essayId: string, userId: string, feedback: any): Promise<void> => {
  try {
    console.log('Updating YouTuber essay feedback for:', essayId, 'user:', userId);
    const essayRef = doc(db, 'users', userId, 'youTuberEssays', essayId);
    await updateDoc(essayRef, {
      feedback,
      status: 'feedback_completed',
      feedbackRead: false,
      updatedAt: Timestamp.now()
    });
    console.log('YouTuber essay feedback updated successfully');
  } catch (error) {
    console.error('Error updating YouTuber essay feedback:', error);
    throw error;
  }
};

export const getYouTuberTasks = async (): Promise<YouTuberTask[]> => {
  try {
    const tasksQuery = query(
      collection(db, 'youTuberTasks'), 
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(tasksQuery);
    const tasks = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as YouTuberTask[];
    
    return tasks.sort((a, b) => {
      const getDate = (date: Date | Timestamp | undefined): Date => {
        if (!date) return new Date(0);
        if (date instanceof Date) return date;
        if (typeof date === 'object' && 'toDate' in date) return date.toDate();
        return new Date(date);
      };
      
      const dateA = getDate(a.createdAt);
      const dateB = getDate(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
  } catch (error) {
    console.error('Error fetching YouTuber tasks:', error);
    return [];
  }
};

export const getYouTuberTaskById = async (taskId: string): Promise<YouTuberTask | null> => {
  try {
    const taskRef = doc(db, 'youTuberTasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      return null;
    }

    return {
      id: taskSnap.id,
      ...taskSnap.data()
    } as YouTuberTask;
  } catch (error) {
    console.error('Error getting YouTuber task:', error);
    return null;
  }
};

export const saveYouTubeVideo = async (video: Omit<YouTubeVideo, 'id'>): Promise<string> => {
  try {
    const videoRef = await addDoc(collection(db, 'youtubeVideos'), {
      ...video,
      createdAt: Timestamp.now()
    });
    return videoRef.id;
  } catch (error) {
    console.error('Error saving YouTube video:', error);
    throw error;
  }
};

export const getYouTubeVideoById = async (videoId: string): Promise<YouTubeVideo | null> => {
  try {
    const videoRef = doc(db, 'youtubeVideos', videoId);
    const videoSnap = await getDoc(videoRef);
    
    if (!videoSnap.exists()) {
      return null;
    }

    return {
      id: videoSnap.id,
      ...videoSnap.data()
    } as YouTubeVideo;
  } catch (error) {
    console.error('Error getting YouTube video:', error);
    return null;
  }
}; 