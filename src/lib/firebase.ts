// my-app/src/lib/firebase.ts 縺ｮ蜈磯ｭ
console.log('FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, Timestamp, deleteDoc, query, where, setDoc, orderBy } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, User, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Task, Essay, EssayFeedback, UserProfile, LearningGoals, VocabularyItem, BasicEssay, YouTuberTask, YouTuberEssay, YouTubeVideo, TOEFLAcademicDiscussionFeedback } from './types';
import { getEssayById } from './getEssays';
// analyzeEssay縺ｯAPI繝ｫ繝ｼ繝医ｒ菴ｿ逕ｨ縺吶ｋ縺溘ａ縲∫峩謗･繧､繝ｳ繝昴・繝医＠縺ｪ縺・


// 迺ｰ蠅・､画焚縺ｮ蛟､繧堤｢ｺ隱・
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

// 險ｭ螳壼､縺ｮ讀懆ｨｼ
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

type StoredTask = Partial<Task> & {
  taskType?: string;
  discussionContent?: {
    professor: string;
    student1: string;
    student2: string;
    question: string;
    professorName?: string;
    student1Name?: string;
    student2Name?: string;
  };
  readingPassageId?: string;
  listeningAudioURL?: string;
  content?: string;
  title?: string;
};

type StoredEssayFeedback = (EssayFeedback | TOEFLAcademicDiscussionFeedback) & {
  score?: number;
  modelAnswer?: string;
};

type EssayWithOptionalStance = Essay & {
  stance?: 'agree' | 'disagree';
};

type GrammarCorrectionWithSentence = {
  fullSentence?: string;
} & Record<string, unknown>;

type FirebaseAuthError = {
  code?: string;
};

// 繝・ヰ繝・げ逕ｨ・哥irebase縺ｮ險ｭ螳壹ｒ遒ｺ隱・
console.log('Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  // 讖溷ｯ・ュ蝣ｱ縺ｯ陦ｨ遉ｺ縺励↑縺・
});

// 繧ｿ繧ｹ繧ｯ縺ｮ蜿門ｾ・
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
    
    // 繧ｯ繝ｩ繧､繧｢繝ｳ繝医し繧､繝峨〒菴懈・譌･譎ゅ・譏・・〒繧ｽ繝ｼ繝・
    return tasks.sort((a, b) => {
      const getDate = (date: Date | Timestamp | undefined): Date => {
        if (!date) return new Date(0);
        if (date instanceof Date) return date;
        if (typeof date === 'object' && 'toDate' in date) return date.toDate();
        return new Date(date);
      };
      
      const dateA = getDate(a.createdAt);
      const dateB = getDate(b.createdAt);
      return dateA.getTime() - dateB.getTime(); // 譏・・ｼ亥商縺・・ｼ・
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

// 迚ｹ螳壹・繧ｿ繧ｹ繧ｯ縺ｮ蜿門ｾ・
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

// 繧ｨ繝・そ繧､縺ｮ菫晏ｭ・
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

// 繧ｨ繝・そ繧､縺ｮ蜿門ｾ・
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

// 繧ｨ繝・そ繧､縺ｮ繝輔ぅ繝ｼ繝峨ヰ繝・け繧貞叙蠕・
export async function getEssayFeedback(essayId: string, userId: string): Promise<StoredEssayFeedback | null> {
  try {
    // 蜃ｦ逅・幕蟋区凾縺ｫstatus繧恥rocessing縺ｫ險ｭ螳・
    const essayRef = doc(db, 'users', userId, 'essays', essayId);
    await updateDoc(essayRef, {
      status: 'processing'
    });

    const essay = await getEssayById(essayId, userId);
    if (!essay) {
      throw new Error('Essay not found');
    }

    // 繧ｿ繧ｹ繧ｯ縺ｮ諠・ｱ繧貞叙蠕・
    const taskRef = doc(db, 'tasks', essay.taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }

    const task = taskSnap.data() as StoredTask;
    if (!task) {
      throw new Error('Task data is empty');
    }
    const taskType = task.taskType as string | undefined;

    // Academic Discussion 縺ｮ蝣ｴ蜷医・蛻･繝輔Ο繝ｼ・・penai.ts蜀・・ Academic Discussion 蛻・梵繧・し繝ｳ繝励Ν逕滓・繧貞茜逕ｨ・・
    let feedback: StoredEssayFeedback;
    if (taskType === 'academic_discussion') {
      if (!task.discussionContent) {
        throw new Error('Task missing discussionContent for academic_discussion');
      }
      // Academic Discussion縺ｮ隧穂ｾ｡
      const { analyzeTOEFLAcademicDiscussion, generateTOEFLAcademicDiscussionModelAnswer } = await import('./openai');
      feedback = await analyzeTOEFLAcademicDiscussion(
        essay.content,
        task.discussionContent
      );

      // stance 縺ｯ迴ｾ迥ｶ Firestore 縺ｫ譛ｪ菫晏ｭ倥・縺溘ａ縲∝ｰ・擂逧・↓essay縺ｫ菫晄戟縺吶ｋ縺ｪ繧峨％縺薙〒蜿ら・
      // 證ｫ螳壹→縺励※ agree 繧呈里螳壹↓縺帙★縲√ユ繝ｳ繝励Ξ縺ｫ萓晏ｭ倥☆繧九↓縺ｯ essay.document 蜀・↓ stance 繧剃ｿ晏ｭ倥☆繧句ｿ・ｦ√′縺ゅｋ
      // 繧ゅ＠ essay.stance 繧剃ｿ晏ｭ倥＠縺溷ｴ蜷医・縺昴ｌ繧剃ｽｿ縺・ｼ亥梛諡｡蠑ｵ縺悟ｿ・ｦ・ｼ・
      const stance: 'agree' | 'disagree' = (essay as EssayWithOptionalStance).stance || 'agree';
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
      // 蠕捺擂縺ｮIntegrated繧ｿ繧ｹ繧ｯ遲・
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

    // 繝輔ぅ繝ｼ繝峨ヰ繝・け繧剃ｿ晏ｭ倥＠縲《tatus繧断eedback_completed縺ｫ譖ｴ譁ｰ
    const updatePayload: {
      feedback: StoredEssayFeedback;
      status: 'feedback_completed';
      feedbackRead: false;
      score?: number;
    } = {
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
    
    // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医《tatus繧弾rror縺ｫ譖ｴ譁ｰ
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

// 蜈ｨ縺ｦ縺ｮ繧ｨ繝・そ繧､繧貞炎髯､縺吶ｋ髢｢謨ｰ
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

// 譁・ｳ墓ｷｻ蜑翫・繝・・繧ｿ讒矩繧呈峩譁ｰ縺吶ｋ繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ髢｢謨ｰ
export async function migrateGrammarCorrections() {
  try {
    const essaysRef = collection(db, 'essays');
    const essaysSnapshot = await getDocs(essaysRef);
    
    for (const doc of essaysSnapshot.docs) {
      const essay = doc.data();
      if (essay.feedback?.grammarCorrections?.corrections) {
        const updatedCorrections = essay.feedback.grammarCorrections.corrections.map((correction: GrammarCorrectionWithSentence) => {
          // 5譁・燕蠕後・譁・ц繧剃ｿ晄戟
          return {
            ...correction,
            fullSentence: correction.fullSentence || '' // fullSentence縺悟ｭ伜惠縺励↑縺・ｴ蜷医・遨ｺ譁・ｭ怜・繧定ｨｭ螳・
          };
        });

        // 譖ｴ譁ｰ縺輔ｌ縺溘ョ繝ｼ繧ｿ繧剃ｿ晏ｭ・
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
  } catch (error) {
    console.error('Error signing in:', error);
    const authError = error as FirebaseAuthError;
    if (authError.code === 'auth/user-not-found') {
      throw new Error('繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｾ縺溘・繝代せ繝ｯ繝ｼ繝峨′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ縲・');
    } else if (authError.code === 'auth/wrong-password') {
      throw new Error('繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｾ縺溘・繝代せ繝ｯ繝ｼ繝峨′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ縲・');
    } else if (authError.code === 'auth/invalid-email') {
      throw new Error('譛牙柑縺ｪ繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ繧貞・蜉帙＠縺ｦ縺上□縺輔＞縲・');
    } else {
      throw new Error('繝ｭ繧ｰ繧､繝ｳ荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・');
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

// 髻ｳ螢ｰ繝輔ぃ繧､繝ｫ繧巽irebase Storage縺ｫ繧｢繝・・繝ｭ繝ｼ繝・
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

// 髻ｳ螢ｰ繝輔ぃ繧､繝ｫ縺ｮURL繧貞叙蠕・
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

// 繧ｿ繧ｹ繧ｯ縺ｮ髻ｳ螢ｰURL繧呈峩譁ｰ
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

// 蜊倩ｪ槭・繝輔Ξ繝ｼ繧ｺ繧剃ｿ晏ｭ・
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

// 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ蜊倩ｪ槭・繝輔Ξ繝ｼ繧ｺ荳隕ｧ繧貞叙蠕・
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

// 蜊倩ｪ槭・繝輔Ξ繝ｼ繧ｺ繧貞炎髯､
export async function deleteVocabularyItem(userId: string, itemId: string): Promise<void> {
  try {
    const itemRef = doc(db, 'users', userId, 'vocabulary', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error deleting vocabulary item:', error);
    throw error;
  }
}

// 蜊倩ｪ槭・繝輔Ξ繝ｼ繧ｺ繧呈峩譁ｰ
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

// 莉頑怦縺ｮ蜊倩ｪ樊焚繧貞叙蠕・
export async function getThisMonthVocabularyCount(userId: string): Promise<number> {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 莉頑怦縺ｮ髢句ｧ区律縺ｨ邨ゆｺ・律
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    
    const userDocRef = doc(db, 'users', userId);
    const vocabularyCollectionRef = collection(userDocRef, 'vocabulary');
    
    // 莉頑怦菴懈・縺輔ｌ縺溷腰隱槭ｒ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
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

// IELTS繧ｨ繝・そ繧､縺ｮ菫晏ｭ・
export async function saveIELTSEssay(essay: Omit<Essay, 'id'>, userId: string): Promise<string> {
  try {
    const essayData: Omit<Essay, 'id'> = {
      ...essay,
      submittedAt: essay.submittedAt instanceof Date ? Timestamp.fromDate(essay.submittedAt) : essay.submittedAt,
      status: "processing" as const,
    };

    const docRef = await addDoc(collection(db, 'users', userId, 'essays'), essayData);
    
    // 菫晏ｭ倥＠縺溘お繝・そ繧､縺ｮID繧定ｿ斐☆
    return docRef.id;
  } catch (error) {
    console.error('Error saving IELTS essay:', error);
    throw error;
  }
}

// IELTS繧ｨ繝・そ繧､縺ｮ繝輔ぅ繝ｼ繝峨ヰ繝・け繧貞叙蠕・
export async function getIELTSEssayFeedback(essayId: string, userId: string): Promise<EssayFeedback | null> {
  try {
    // 蜃ｦ逅・幕蟋区凾縺ｫstatus繧恥rocessing縺ｫ險ｭ螳・
    const essayRef = doc(db, 'users', userId, 'essays', essayId);
    await updateDoc(essayRef, {
      status: 'processing'
    });

    const essay = await getEssayById(essayId, userId);
    if (!essay) {
      throw new Error('Essay not found');
    }

    // 繧ｿ繧ｹ繧ｯ縺ｮ諠・ｱ繧貞叙蠕・
    const taskRef = doc(db, 'tasks', essay.taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }

    const task = taskSnap.data() as Task;

    // IELTS逕ｨ縺ｮ繝輔ぅ繝ｼ繝峨ヰ繝・け繧堤函謌・
    const ieltsTaskType: 'task1' | 'task2' = (task.taskType === 'task1' || task.taskType === 'task2') ? task.taskType : 'task2';
    const feedback = await analyzeIELTSEssayWithAPI(
      essay.content,
      ieltsTaskType,
      task.content || '',
      task.imageUrl
    );

    // 繝輔ぅ繝ｼ繝峨ヰ繝・け繧剃ｿ晏ｭ倥＠縲《tatus繧断eedback_completed縺ｫ譖ｴ譁ｰ
    await updateDoc(essayRef, {
      feedback,
      status: 'feedback_completed',
      feedbackRead: false, // 繝輔ぅ繝ｼ繝峨ヰ繝・け譛ｪ隱ｭ縺ｨ縺励※蛻晄悄蛹・
      score: feedback.score // 30轤ｹ貅轤ｹ縺ｮ繧ｹ繧ｳ繧｢繧剃ｿ晏ｭ・
    });

    return feedback;
  } catch (error) {
    console.error('Error in getIELTSEssayFeedback:', error);
    
    // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医《tatus繧弾rror縺ｫ譖ｴ譁ｰ
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

// IELTS繧ｨ繝・そ繧､蛻・梵逕ｨ縺ｮAPI蜻ｼ縺ｳ蜃ｺ縺・
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

// Basic繝医Ξ繝ｼ繝九Φ繧ｰ逕ｨ縺ｮ髢｢謨ｰ
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

export const updateBasicEssayFeedback = async (essayId: string, userId: string, feedback: BasicEssay['feedback']): Promise<void> => {
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

// YouTube Learning逕ｨ縺ｮ髢｢謨ｰ
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

export const updateYouTuberEssayFeedback = async (essayId: string, userId: string, feedback: YouTuberEssay['feedback']): Promise<void> => {
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

