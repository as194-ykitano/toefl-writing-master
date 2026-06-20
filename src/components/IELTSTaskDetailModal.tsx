'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, FileText, Image, BookOpen, Languages } from 'lucide-react';
import { Task } from '@/lib/types';
import { useEffect } from 'react';

interface IELTSTaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export default function IELTSTaskDetailModal({ task, isOpen, onClose }: IELTSTaskDetailModalProps) {
  // デバッグ用のログ
  useEffect(() => {
    console.log('IELTSTaskDetailModal props:', { isOpen, task: task?.title });
  }, [isOpen, task]);

  if (!task) {
    console.log('Task is null or undefined');
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 px-6 pt-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            IELTS Task 詳細
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* タスク基本情報 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">タスク情報</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">タイトル:</span>
                <span>{task.title}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium">タスクタイプ:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {task.taskType === 'task1' ? 'Task 1 (Academic Writing)' : 'Task 2 (Essay Writing)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">難易度:</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                  {task.difficulty}
                </span>
              </div>
              {task.wordCount && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">語数制限:</span>
                  <span>{task.wordCount.min} - {task.wordCount.target} words</span>
                </div>
              )}
            </div>
          </div>

          {/* 問題文 */}
          {task.content && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                問題文
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {task.content}
                </p>
              </div>
            </div>
          )}

          {/* 指示事項 */}
          {task.instructions && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                指示事項
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {task.instructions}
                </p>
              </div>
            </div>
          )}

          {/* グラフ・図表（Task 1の場合） */}
          {task.taskType === 'task1' && task.imageUrl && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-600" />
                グラフ・図表
              </h3>
              <div className="flex justify-center">
                <img
                  src={task.imageUrl}
                  alt="Task 1 グラフ・図表"
                  className="max-w-full h-auto rounded-lg border"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            </div>
          )}

          {/* 解答例 */}
          {task.sampleAnswer && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-600" />
                解答例
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {task.sampleAnswer}
                </p>
              </div>
            </div>
          )}

          {/* 解答例の日本語訳 */}
          {task.sampleAnswerJapanese && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Languages className="w-5 h-5 text-red-600" />
                解答例の日本語訳
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {task.sampleAnswerJapanese}
                </p>
              </div>
            </div>
          )}

          {/* 解答例がまだない場合のプレースホルダー */}
          {!task.sampleAnswer && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">解答例</h3>
              <p className="text-gray-500">
                解答例はまだ追加されていません。<br />
                管理者が追加するまでお待ちください。
              </p>
            </div>
          )}

          {/* 解答例の日本語訳がまだない場合のプレースホルダー */}
          {!task.sampleAnswerJapanese && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Languages className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">解答例の日本語訳</h3>
              <p className="text-gray-500">
                解答例の日本語訳はまだ追加されていません。<br />
                管理者が追加するまでお待ちください。
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
