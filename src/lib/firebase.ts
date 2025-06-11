import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { analyzeEssay } from './openai';

// 環境変数の値を確認
console.log('Environment variables check:', {
  hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
});

const firebaseConfig = {
  apiKey: "AIzaSyCaV7J6MU0M4BlANVKvNO6NdiT5qbuA-Tk", // Firebase Consoleから取得したAPI Key
  authDomain: "toefl-writing-reading-b1197.firebaseapp.com",
  projectId: "toefl-writing-reading-b1197",
  storageBucket: "toefl-writing-reading-b1197.firebasestorage.app",
  messagingSenderId: "110584604549", // Firebase Consoleから取得したMessaging Sender ID
  appId: "1:110584604549:web:cbbe2182ea43675bd446ec", // Firebase Consoleから取得したApp ID
  measurementId: "G-56NDK1C6R5" // Firebase Consoleから取得したMeasurement ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// デバッグ用：Firebaseの設定を確認
console.log('Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  // 機密情報は表示しない
});

// タスクデータの型定義
export interface Task {
  id: string;
  title: string;
  description: string;
  type: "integrated" | "independent";
  difficulty: "easy" | "medium" | "hard";
  category: string;
  readingPassageId: string;
  listeningAudioURL: string;
  listeningImageURL: string;
  listeningPassageContent: string;
  timeLimit: number;
  status: "not_started" | "in_progress" | "completed";
}

// リーディングパッセージの型定義
export interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  wordCount: number;
  estimatedReadingTime: number;
  keyPoints: string[];
}

// エッセイデータの型定義
export interface Essay {
  id: string;
  taskId: string;
  essayText: string;
  wordCount: number;
  timeSpent: string;
  status: "submitted" | "feedback_completed";
  score?: number;
  feedback?: {
    overall: string;
    strengths: string[];
    improvements: string[];
    detailedScores: {
      integration: number;
      organization: number;
      language: number;
      development: number;
    };
    topicDevelopment: {
      goodPoints: string[];
      improvements: string[];
    };
    generalDescription: {
      goodPoints: string[];
      improvements: string[];
    };
    specificSuggestions: {
      suggestions: string[];
    };
    grammarCorrections?: {
      corrections: Array<{
        original: string;
        corrected: string;
        explanation: string;
        startIndex: number;
        endIndex: number;
      }>;
    };
  };
  createdAt: Date;
}

// タスクの取得
export async function getTasks(): Promise<Task[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'tasks'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

// 特定のタスクの取得
export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const docRef = doc(db, 'tasks', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Task;
  } catch (error) {
    console.error('Error fetching task:', error);
    return null;
  }
}

// エッセイの保存
export async function saveEssay(essay: Omit<Essay, 'id' | 'createdAt'>): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, 'essays'), {
      ...essay,
      status: "submitted",
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving essay:', error);
    return null;
  }
}

// エッセイの取得
export async function getEssays(): Promise<Essay[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'essays'));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Reconstruct the feedback structure if it exists
      let feedback = undefined;
      if (data.feedback) {
        feedback = {
          overall: data.feedback.overall,
          strengths: data.feedback.strengths,
          improvements: data.feedback.improvements,
          detailedScores: {
            integration: data.feedback.detailedScores_integration,
            organization: data.feedback.detailedScores_organization,
            language: data.feedback.detailedScores_language,
            development: data.feedback.detailedScores_development
          },
          topicDevelopment: {
            goodPoints: data.feedback.topicDevelopment_goodPoints,
            improvements: data.feedback.topicDevelopment_improvements
          },
          generalDescription: {
            goodPoints: data.feedback.generalDescription_goodPoints,
            improvements: data.feedback.generalDescription_improvements
          },
          specificSuggestions: {
            suggestions: data.feedback.specificSuggestions_suggestions
          },
          grammarCorrections: data.feedback.grammarCorrections || { corrections: [] }
        };
      }
      return {
        id: doc.id,
        ...data,
        feedback,
        createdAt: data.createdAt?.toDate()
      } as Essay;
    });
  } catch (error) {
    console.error('Error fetching essays:', error);
    return [];
  }
}

// GPTによるエッセイの添削
export async function getEssayFeedback(essayId: string): Promise<Essay | null> {
  try {
    const docRef = doc(db, 'essays', essayId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    // Reconstruct the feedback structure if it exists
    const reconstructedFeedback = data.feedback ? {
      overall: data.feedback.overall,
      strengths: data.feedback.strengths || [],
      improvements: data.feedback.improvements || [],
      detailedScores: {
        integration: data.feedback.detailedScores_integration || 0,
        organization: data.feedback.detailedScores_organization || 0,
        language: data.feedback.detailedScores_language || 0,
        development: data.feedback.detailedScores_development || 0
      },
      topicDevelopment: {
        goodPoints: data.feedback.topicDevelopment_goodPoints || [],
        improvements: data.feedback.topicDevelopment_improvements || []
      },
      generalDescription: {
        goodPoints: data.feedback.generalDescription_goodPoints || [],
        improvements: data.feedback.generalDescription_improvements || []
      },
      specificSuggestions: {
        suggestions: data.feedback.specificSuggestions_suggestions || []
      }
    } : undefined;

    const essay = {
      id: docSnap.id,
      ...data,
      feedback: reconstructedFeedback,
      createdAt: data.createdAt?.toDate()
    } as Essay;

    // タスクの情報を取得
    const taskRef = doc(db, 'tasks', essay.taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }

    const task = taskSnap.data() as Task;

    // リーディングパッセージの内容を取得
    const readingPassageRef = doc(db, 'readingPassages', task.readingPassageId);
    const readingPassageSnap = await getDoc(readingPassageRef);
    
    if (!readingPassageSnap.exists()) {
      throw new Error('Reading passage not found');
    }

    const readingPassage = readingPassageSnap.data() as ReadingPassage;

    // GPT APIを使用して添削を行う
    const feedback = await analyzeEssay(
      essay.essayText,
      readingPassage.content,
      task.listeningPassageContent
    );

    if (!feedback) {
      throw new Error('Failed to get feedback from GPT API');
    }

    // フィードバックを保存
    const flattenedFeedback = {
      overall: feedback.overall || "",
      strengths: feedback.strengths || [],
      improvements: feedback.improvements || [],
      detailedScores_integration: feedback.detailedScores?.integration || 0,
      detailedScores_organization: feedback.detailedScores?.organization || 0,
      detailedScores_language: feedback.detailedScores?.language || 0,
      detailedScores_development: feedback.detailedScores?.development || 0,
      topicDevelopment_goodPoints: feedback.topicDevelopment?.goodPoints || [],
      topicDevelopment_improvements: feedback.topicDevelopment?.improvements || [],
      generalDescription_goodPoints: feedback.generalDescription?.goodPoints || [],
      generalDescription_improvements: feedback.generalDescription?.improvements || [],
      specificSuggestions_suggestions: feedback.specificSuggestions?.suggestions || [],
      grammarCorrections: feedback.grammarCorrections || { corrections: [] }
    };

    // フィードバックデータの検証
    if (!flattenedFeedback.overall || !flattenedFeedback.strengths || !flattenedFeedback.improvements) {
      throw new Error('Invalid feedback data structure');
    }

    await updateDoc(docRef, {
      status: "feedback_completed",
      feedback: flattenedFeedback,
      score: Math.round(
        ((feedback.detailedScores?.integration || 0) +
        (feedback.detailedScores?.organization || 0) +
        (feedback.detailedScores?.language || 0) +
        (feedback.detailedScores?.development || 0)) / 4
      )
    });

    // Return the original feedback structure for the frontend
    return {
      ...essay,
      status: "feedback_completed",
      feedback: {
        overall: feedback.overall || "",
        strengths: feedback.strengths || [],
        improvements: feedback.improvements || [],
        detailedScores: {
          integration: feedback.detailedScores?.integration || 0,
          organization: feedback.detailedScores?.organization || 0,
          language: feedback.detailedScores?.language || 0,
          development: feedback.detailedScores?.development || 0
        },
        topicDevelopment: {
          goodPoints: feedback.topicDevelopment?.goodPoints || [],
          improvements: feedback.topicDevelopment?.improvements || []
        },
        generalDescription: {
          goodPoints: feedback.generalDescription?.goodPoints || [],
          improvements: feedback.generalDescription?.improvements || []
        },
        specificSuggestions: {
          suggestions: feedback.specificSuggestions?.suggestions || []
        },
        grammarCorrections: feedback.grammarCorrections || { corrections: [] }
      },
      score: Math.round(
        ((feedback.detailedScores?.integration || 0) +
        (feedback.detailedScores?.organization || 0) +
        (feedback.detailedScores?.language || 0) +
        (feedback.detailedScores?.development || 0)) / 4
      )
    };
  } catch (error) {
    console.error('Error getting essay feedback:', error);
    return null;
  }
}

export { db };

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