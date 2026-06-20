"use client";
import { useEffect, useState } from 'react';
import { getTasks, getEssays } from '../lib/firebase';
import { Task, Essay, ReadingPassage } from '../lib/types';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// 秒を分:秒の形式に変換する関数

export default function DataDisplay() {
  // Task型は now: readingPassageId, listeningAudioURL でOK
  // const [tasks, setTasks] = useState<Task[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [readingPassages, setReadingPassages] = useState<ReadingPassage[]>([]);
  const [loading, setLoading] = useState(true);

  // タスクにパッセージを紐付けるための型
  type TaskWithPassage = Task & { readingPassage?: ReadingPassage };
  const [tasksWithPassage, setTasksWithPassage] = useState<TaskWithPassage[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // タスクの取得
        const tasksData = await getTasks();
        // setTasks(tasksData);

        // 各タスクのreadingPassageIdでパッセージを取得
        const passagesMap: { [id: string]: ReadingPassage } = {};
        const passageIds = Array.from(new Set(tasksData.map(t => t.readingPassageId).filter(Boolean)));
        await Promise.all(
          passageIds.map(async (pid) => {
            if (pid) {
              const docSnap = await getDoc(doc(db, 'readingPassages', pid));
              if (docSnap.exists()) {
                passagesMap[pid] = { id: docSnap.id, ...docSnap.data() } as ReadingPassage;
              }
            }
          })
        );
        // タスクにパッセージを紐付け
        const tasksWithPassage = tasksData.map(task => ({
          ...task,
          readingPassage: task.readingPassageId ? passagesMap[task.readingPassageId] : undefined
        }));
        setTasksWithPassage(tasksWithPassage);

        // エッセイの取得
        const essaysData = await getEssays();
        setEssays(essaysData);

        // 全リーディングパッセージも取得
        const readingPassagesSnapshot = await getDocs(collection(db, 'readingPassages'));
        const readingPassagesData = readingPassagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ReadingPassage[];
        setReadingPassages(readingPassagesData);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">TOEFL Writing Master Data</h1>

      {/* タスクの表示 */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tasks</h2>
        <div className="grid gap-4">
          {tasksWithPassage.map(task => (
            <div key={task.id} className="border p-4 rounded-lg shadow">
              <h3 className="text-xl font-medium">{task.title}</h3>
              <p className="text-gray-600">{task.description}</p>
              <div className="mt-2">
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {task.type}
                </span>
                <span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm ml-2">
                  {task.readingPassage?.title || 'No Passage'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* エッセイの表示 */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Essays</h2>
        <div className="grid gap-4">
          {essays.map(essay => (
            <div key={essay.id} className="border p-4 rounded-lg shadow">
              <p className="text-gray-800">{essay.content}</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>Word Count: {essay.wordCount}</p>
                <p>Time Spent: {essay.timeSpent}</p>
                <p>Status: {essay.status === "completed" ? "提出完了" : "フィードバック完了"}</p>
                {essay.score && <p>Score: {essay.score}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* リーディングパッセージの表示 */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Reading Passages</h2>
        <div className="grid gap-4">
          {readingPassages.map(passage => (
            <div key={passage.id} className="border p-4 rounded-lg shadow">
              <h3 className="text-xl font-medium mb-2">{passage.title}</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{passage.content}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
} 
