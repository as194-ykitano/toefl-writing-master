"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTasks } from "@/lib/firebase";
import { uploadTaskAudio, updateTaskAudioURLManually } from "@/lib/migrateAudioToStorage";
import { Task } from "@/lib/types";
import { FileAudio, CheckCircle, AlertCircle } from "lucide-react";

export default function AudioUploadPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<{ [taskId: string]: File }>({});

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksData = await getTasks();
        setTasks(tasksData);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleFileSelect = (taskId: string, file: File) => {
    if (file.type.startsWith('audio/')) {
      setSelectedFiles(prev => ({
        ...prev,
        [taskId]: file
      }));
    } else {
      alert("音声ファイルを選択してください。");
    }
  };

  const handleUpload = async (taskId: string) => {
    const file = selectedFiles[taskId];
    if (!file) {
      alert("ファイルを選択してください。");
      return;
    }

    setUploading(taskId);
    setUploadProgress("アップロード中...");

    try {
      await uploadTaskAudio(taskId, file);
      setUploadProgress("アップロード完了！");
      
      // 成功したらファイル選択をクリア
      setSelectedFiles(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
      
      // タスクリストを更新
      const updatedTasks = await getTasks();
      setTasks(updatedTasks);
      
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress("アップロードに失敗しました。");
    } finally {
      setTimeout(() => {
        setUploading(null);
        setUploadProgress("");
      }, 2000);
    }
  };

  const handleManualURLUpdate = async (taskId: string, url: string) => {
    if (!url.trim()) {
      alert("URLを入力してください。");
      return;
    }

    setUploading(taskId);
    setUploadProgress("URL更新中...");

    try {
      await updateTaskAudioURLManually(taskId, url.trim());
      setUploadProgress("URL更新完了！");
      
      // タスクリストを更新
      const updatedTasks = await getTasks();
      setTasks(updatedTasks);
      
    } catch (error) {
      console.error("URL update error:", error);
      setUploadProgress("URL更新に失敗しました。");
    } finally {
      setTimeout(() => {
        setUploading(null);
        setUploadProgress("");
      }, 2000);
    }
  };

  const getAudioStatus = (task: Task) => {
    if (!task.listeningAudioURL) {
      return { status: "none", text: "音声なし", icon: AlertCircle, color: "text-gray-500" };
    } else if (task.listeningAudioURL.startsWith('/audio/')) {
      return { status: "local", text: "ローカルファイル", icon: AlertCircle, color: "text-orange-500" };
    } else if (task.listeningAudioURL.startsWith('https://')) {
      return { status: "storage", text: "Storage", icon: CheckCircle, color: "text-green-500" };
    } else {
      return { status: "unknown", text: "不明", icon: AlertCircle, color: "text-red-500" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">音声ファイル管理</h1>
          <p className="text-gray-600 mt-2">タスクの音声ファイルをFirebase Storageにアップロードします。</p>
        </div>

        <div className="grid gap-6">
          {tasks.map((task) => {
            const audioStatus = getAudioStatus(task);
            const StatusIcon = audioStatus.icon;
            const isUploading = uploading === task.id;
            const hasSelectedFile = selectedFiles[task.id];

            return (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">ID: {task.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-5 h-5 ${audioStatus.color}`} />
                      <span className={`text-sm font-medium ${audioStatus.color}`}>
                        {audioStatus.text}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 現在の音声URL表示 */}
                    {task.listeningAudioURL && (
                      <div>
                        <Label className="text-sm font-medium">現在の音声URL:</Label>
                        <p className="text-sm text-gray-600 mt-1 break-all">
                          {task.listeningAudioURL}
                        </p>
                      </div>
                    )}

                    {/* ファイルアップロード */}
                    <div>
                      <Label className="text-sm font-medium">音声ファイルをアップロード:</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(task.id, file);
                          }}
                          className="flex-1"
                          disabled={isUploading}
                        />
                        {hasSelectedFile && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileAudio className="w-4 h-4" />
                            <span>{hasSelectedFile.name}</span>
                            <span className="text-gray-400">
                              ({(hasSelectedFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        )}
                        <Button
                          onClick={() => handleUpload(task.id)}
                          disabled={!hasSelectedFile || isUploading}
                          size="sm"
                        >
                          {isUploading ? "アップロード中..." : "アップロード"}
                        </Button>
                      </div>
                    </div>

                    {/* 手動URL入力 */}
                    <div>
                      <Label className="text-sm font-medium">手動でURLを設定:</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Input
                          type="url"
                          placeholder="https://firebasestorage.googleapis.com/..."
                          className="flex-1"
                          disabled={isUploading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              handleManualURLUpdate(task.id, input.value);
                            }
                          }}
                        />
                        <Button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleManualURLUpdate(task.id, input.value);
                          }}
                          disabled={isUploading}
                          size="sm"
                          variant="outline"
                        >
                          {isUploading ? "更新中..." : "更新"}
                        </Button>
                      </div>
                    </div>

                    {/* 進捗表示 */}
                    {isUploading && uploadProgress && (
                      <div className="text-sm text-blue-600">
                        {uploadProgress}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {tasks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">タスクが見つかりません。</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 
