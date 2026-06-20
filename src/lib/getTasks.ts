import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Task } from './types';

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