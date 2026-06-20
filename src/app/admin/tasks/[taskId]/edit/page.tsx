"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";
import { ArrowLeft, Save, AlertTriangle, FileImage, Upload, X, ImageIcon } from "lucide-react";

// 管理者のメールアドレスリスト
const ADMIN_EMAILS = [
  'admin@gmail.com',    // 管理者のメールアドレス
  'admin@example.com',  // 管理者のメールアドレスをここに追加
  'ykita@example.com'   // あなたのメールアドレスを追加
];

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [task, setTask] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    type: "integrated",
    difficulty: "medium",
    category: "",
    timeLimit: 20,
    status: "active",
    readingPassageJapanese: "",
    listeningScriptJapanese: "",
    sampleAnswer: "",
    sampleAnswerJapanese: "", // 解答例の日本語訳
    taskType: "task1", // IELTSタスクタイプ
    wordCountMin: 150,
    wordCountTarget: 200,
    content: "",
    imageUrl: ""
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = () => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const isUserAdmin = ADMIN_EMAILS.includes(user.email || '');
        setIsAdmin(isUserAdmin);
        if (isUserAdmin && taskId) {
          fetchTask();
        }
      } else {
        setIsAdmin(false);
        router.push('/login');
      }
      setAuthChecked(true);
      setLoading(false);
    });

    return unsubscribe;
  };

  const fetchTask = async () => {
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      if (taskDoc.exists()) {
        const taskData = taskDoc.data();
        setTask(taskData);
        setFormData({
          title: taskData.title || "",
          type: taskData.type || "integrated",
          difficulty: taskData.difficulty || "medium",
          category: taskData.category || "",
          timeLimit: taskData.timeLimit || 20,
          status: taskData.status || "active",
          readingPassageJapanese: taskData.readingPassageJapanese || "",
          listeningScriptJapanese: taskData.listeningScriptJapanese || "",
          sampleAnswer: taskData.sampleAnswer || "",
          sampleAnswerJapanese: taskData.sampleAnswerJapanese || "",
          taskType: taskData.taskType || "task1",
          wordCountMin: taskData.wordCount?.min || 150,
          wordCountTarget: taskData.wordCount?.target || 200,
          content: taskData.content || "",
          imageUrl: taskData.imageUrl || ""
        });
      } else {
        alert("タスクが見つかりません。");
        router.push("/admin/dashboard");
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      alert("タスクの取得に失敗しました。");
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // タスクタイプがTask 1に変更された場合、画像URLをクリア
    if (field === 'taskType' && value === 'task1') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        imageUrl: '' // Task 1の場合は画像URLを必須にするためクリア
      }));
    }
  };

  // ファイルアップロード処理
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // ファイルサイズチェック（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      alert('ファイルサイズは5MB以下にしてください。');
      return;
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください。');
      return;
    }

    setUploading(true);
    try {
      // ファイル名をユニークにする
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `ielts_images/${fileName}`);
      
      // ファイルをアップロード
      await uploadBytes(storageRef, file);
      
      // ダウンロードURLを取得
      const downloadURL = await getDownloadURL(storageRef);
      
      // フォームデータを更新
      setFormData(prev => ({
        ...prev,
        imageUrl: downloadURL
      }));

      alert('画像のアップロードが完了しました！');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('画像のアップロードに失敗しました。');
    } finally {
      setUploading(false);
    }
  };

  // ファイル選択処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // ドラッグ&ドロップ処理
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 画像URLをクリア
  const clearImageUrl = () => {
    setFormData(prev => ({
      ...prev,
      imageUrl: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        ...formData,
        updatedAt: new Date()
      });

      alert("タスクが正常に更新されました。");
      router.push("/admin/dashboard");
    } catch (error) {
      console.error("Error updating task:", error);
      alert("タスクの更新に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-center mb-2">アクセス拒否</h2>
            <p className="text-gray-600 text-center mb-4">
              このページにアクセスする権限がありません。
            </p>
            <Button 
              onClick={() => router.push('/')}
              className="w-full"
            >
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            ダッシュボードに戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">タスクを編集</h1>
          <p className="text-gray-600 mt-2">タスクの情報を更新します。</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>タスク情報</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">カテゴリ</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange("category", e.target.value)}
                    placeholder="例: 環境問題、教育、テクノロジー"
                  />
                </div>

                <div>
                  <Label htmlFor="type">タスクタイプ</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="integrated">Integrated Task</SelectItem>
                      <SelectItem value="independent">Independent Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="taskType">IELTSタスクタイプ</Label>
                  <Select value={formData.taskType} onValueChange={(value) => handleInputChange("taskType", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task1">Task 1 (Academic Writing)</SelectItem>
                      <SelectItem value="task2">Task 2 (Essay Writing)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficulty">難易度</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => handleInputChange("difficulty", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="初級">初級</SelectItem>
                      <SelectItem value="中級">中級</SelectItem>
                      <SelectItem value="上級">上級</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timeLimit">制限時間（分）</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => handleInputChange("timeLimit", parseInt(e.target.value))}
                    min="1"
                    max="60"
                  />
                </div>

                <div>
                  <Label htmlFor="status">ステータス</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">公開中</SelectItem>
                      <SelectItem value="hidden">非表示</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* IELTS用の追加フィールド */}
              {formData.type === "independent" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="wordCountMin">最小語数</Label>
                      <Input
                        id="wordCountMin"
                        type="number"
                        value={formData.wordCountMin}
                        onChange={(e) => handleInputChange("wordCountMin", parseInt(e.target.value))}
                        min="50"
                        placeholder="150"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wordCountTarget">目標語数</Label>
                      <Input
                        id="wordCountTarget"
                        type="number"
                        value={formData.wordCountTarget}
                        onChange={(e) => handleInputChange("wordCountTarget", parseInt(e.target.value))}
                        min="50"
                        placeholder="200"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="content">問題文</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => handleInputChange("content", e.target.value)}
                      rows={6}
                      placeholder="IELTSの問題文を入力してください"
                    />
                  </div>

                  {/* 解答例 */}
                  <div>
                    <Label htmlFor="sampleAnswer">解答例（英語）</Label>
                    <Textarea
                      id="sampleAnswer"
                      value={formData.sampleAnswer}
                      onChange={(e) => handleInputChange("sampleAnswer", e.target.value)}
                      rows={8}
                      placeholder="模範解答例を英語で入力してください（オプション）"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      学生が参考にできる模範解答例を入力してください。空欄のままでも問題ありません。
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="sampleAnswerJapanese">解答例の日本語訳</Label>
                    <Textarea
                      id="sampleAnswerJapanese"
                      value={formData.sampleAnswerJapanese}
                      onChange={(e) => handleInputChange("sampleAnswerJapanese", e.target.value)}
                      rows={6}
                      placeholder="解答例の日本語訳を入力してください（オプション）"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      解答例の日本語訳を入力してください。空欄のままでも問題ありません。
                    </p>
                  </div>

                  {/* 画像アップロード */}
                  <div>
                    <Label htmlFor="imageUrl">
                      グラフ・図表の画像
                      {formData.taskType === 'task1' && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    
                    {/* ファイルアップロードエリア */}
                    <div className="mt-2">
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          formData.imageUrl 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                      >
                        {formData.imageUrl ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-center">
                              <img 
                                src={formData.imageUrl} 
                                alt="Uploaded chart" 
                                className="max-w-full h-auto max-h-48 rounded border"
                              />
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                              >
                                <FileImage className="w-4 h-4 mr-2" />
                                別の画像を選択
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearImageUrl}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4 mr-2" />
                                削除
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex flex-col items-center">
                              <Upload className="w-12 h-12 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">
                                画像ファイルをドラッグ&ドロップするか、
                              </p>
                              <p className="text-sm text-gray-600">
                                クリックしてファイルを選択してください
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                            >
                              <FileImage className="w-4 h-4 mr-2" />
                              {uploading ? 'アップロード中...' : '画像を選択'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 隠しファイル入力 */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* 手動URL入力（オプション） */}
                    <div className="mt-4">
                      <Label htmlFor="manualImageUrl" className="text-sm text-gray-600">
                        または、画像URLを直接入力
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="manualImageUrl"
                          value={formData.imageUrl}
                          onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                          placeholder="画像のURLを入力してください"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = prompt('画像のURLを入力してください:');
                            if (url) {
                              handleInputChange('imageUrl', url);
                            }
                          }}
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          URL入力
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      {formData.taskType === 'task1' ? 
                        'Task 1の場合は、グラフや図表の画像が必須です。' : 
                        'Task 1の場合は、グラフや図表の画像を追加することをお勧めします。'
                      }
                      <br />
                      対応形式: JPG, PNG, GIF, WebP (最大5MB)
                    </p>
                  </div>
                </>
              )}

              {/* TOEFL用のフィールド */}
              {formData.type === "integrated" && (
                <>
                  <div>
                    <Label htmlFor="readingPassageJapanese">Readingの日本語訳</Label>
                    <Textarea
                      id="readingPassageJapanese"
                      value={formData.readingPassageJapanese}
                      onChange={(e) => handleInputChange("readingPassageJapanese", e.target.value)}
                      rows={6}
                      placeholder="Reading passageの日本語訳を入力してください"
                    />
                  </div>

                  <div>
                    <Label htmlFor="listeningScriptJapanese">Listeningスクリプトの日本語訳</Label>
                    <Textarea
                      id="listeningScriptJapanese"
                      value={formData.listeningScriptJapanese}
                      onChange={(e) => handleInputChange("listeningScriptJapanese", e.target.value)}
                      rows={6}
                      placeholder="Listeningスクリプトの日本語訳を入力してください"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sampleAnswer">解答例</Label>
                    <Textarea
                      id="sampleAnswer"
                      value={formData.sampleAnswer}
                      onChange={(e) => handleInputChange("sampleAnswer", e.target.value)}
                      rows={8}
                      placeholder="模範解答例を入力してください"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sampleAnswerJapanese">解答例の日本語訳</Label>
                    <Textarea
                      id="sampleAnswerJapanese"
                      value={formData.sampleAnswerJapanese}
                      onChange={(e) => handleInputChange("sampleAnswerJapanese", e.target.value)}
                      rows={6}
                      placeholder="解答例の日本語訳を入力してください"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/dashboard")}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 