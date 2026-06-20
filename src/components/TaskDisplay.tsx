"use client";
import { useEffect, useState } from 'react';
import { getTasks } from '../lib/firebase';
import { Task, ReadingPassage } from '../lib/types';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, BookOpen, Headphones } from "lucide-react";
import Link from "next/link";
import React from "react";
import { useParams } from "next/navigation";

interface TaskWithPassage extends Task {
  readingPassage?: ReadingPassage;
}

export default function TaskDisplay() {
  const params = useParams();
  const taskId = params?.taskId as string;
  const [tasks, setTasks] = useState<TaskWithPassage[]>([]);
  const [readingPassages, setReadingPassages] = useState<ReadingPassage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('client FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    const fetchData = async () => {
      try {
        // タスクの取得
        const tasksData = await getTasks();
        // 各タスクのreadingPassageIdでパッセージを取得
        const passagesMap: { [id: string]: ReadingPassage } = {};
        const passageIds = Array.from(
          new Set(tasksData.map(t => t.readingPassageId).filter(Boolean))
        );
        await Promise.all(
          passageIds.map(async (pid) => {
            if (!pid) return;
            const docSnap = await getDoc(doc(db, 'readingPassages', pid));
            if (docSnap.exists()) {
              passagesMap[pid] = { id: docSnap.id, ...docSnap.data() } as ReadingPassage;
            }
          })
        );
        // タスクにパッセージを紐付け
        const tasksWithPassage = tasksData.map(task => ({
          ...task,
          readingPassage: task.readingPassageId ? passagesMap[task.readingPassageId] : undefined
        }));
        setTasks(tasksWithPassage);

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
  }, [taskId]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // 難易度に応じた色を返す関数
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Replace direct function call with API call
  const analyzeEssay = async (essayText: string, readingPassage: string, listeningPassage: string) => {
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
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-16">
      {/* タスクセクション */}
      <section className="mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">演習タスク</h2>
          <p className="text-gray-600">本番と同じ形式で練習できるタスクを用意しています</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(task.difficulty)}`}>
                    {task.difficulty}
                  </span>
                </div>
                <p className="text-gray-600">{task.description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {task.type === 'integrated' ? 'Integrated Task' : 'Independent Task'}
                  </span>
                  <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    {task.category}
                  </span>
                  {task.readingPassage && (
                    <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                      {task.readingPassage.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{task.timeLimit}分</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Headphones className="w-4 h-4" />
                    <span>リスニング付き</span>
                  </div>
                </div>
                <Link href={`/tasks/${task.id}`}>
                  <Button className="w-full bg-black hover:bg-gray-700 text-white">
                    開始する
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* リーディングパッセージセクション */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">リーディングパッセージ</h2>
          <p className="text-gray-600">Integrated Taskで使用されるリーディングパッセージ</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {readingPassages.map(passage => (
            <div key={passage.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">{passage.title}</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(passage.difficulty)}`}>
                    {passage.difficulty}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    {passage.category}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-600 line-clamp-3">{passage.content}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{passage.wordCount}語</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>推定{passage.estimatedReadingTime}分</span>
                  </div>
                </div>
                <Link href={`/reading/${passage.id}`}>
                  <Button variant="outline" className="w-full">
                    全文を読む
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
} 