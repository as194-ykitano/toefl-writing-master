"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { ArrowLeft, Save, Plus, Upload, Image as ImageIcon, X, FileImage } from "lucide-react";

export default function IELTSTaskCreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    taskType: "task1",
    content: "",
    timeLimit: 20,
    wordCountMin: 150,
    wordCountTarget: 200,
    category: "Academic Writing",
    difficulty: "中級",
    imageUrl: "", // 画像URLフィールドを追加
    sampleAnswer: "", // 解答例
    sampleAnswerJapanese: "" // 解答例の日本語訳
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Task 1の場合は画像URLが必須
    if (formData.taskType === 'task1' && !formData.imageUrl.trim()) {
      alert('Task 1の場合は、グラフや図表の画像が必要です。');
      setLoading(false);
      return;
    }

    try {
      const taskData = {
        ...formData,
        type: "independent",
        status: "active",
        wordCount: {
          min: parseInt(formData.wordCountMin.toString()),
          target: parseInt(formData.wordCountTarget.toString())
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'tasks'), taskData);
      
      alert('IELTS問題が正常に作成されました！');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Error creating task:', error);
      alert('問題の作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // タスクタイプが変更された場合の処理
    if (field === 'taskType') {
      if (value === 'task1') {
        // Task 1の場合のデフォルト設定
        setFormData(prev => ({
          ...prev,
          [field]: value,
          timeLimit: 20,
          wordCountMin: 150,
          wordCountTarget: 200,
          category: "Academic Writing",
          imageUrl: '' // Task 1の場合は画像URLを必須にするためクリア
        }));
      } else if (value === 'task2') {
        // Task 2の場合のデフォルト設定
        setFormData(prev => ({
          ...prev,
          [field]: value,
          timeLimit: 40,
          wordCountMin: 250,
          wordCountTarget: 280,
          category: "Essay Writing",
          imageUrl: '' // Task 2の場合は画像URLをクリア
        }));
      }
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            ダッシュボードに戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">IELTS問題の作成</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* 基本情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  基本情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">問題タイトル *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="例: IELTS Task 1: 家計所得分布の比較"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="taskType">タスクタイプ *</Label>
                    <Select
                      value={formData.taskType}
                      onValueChange={(value) => handleInputChange('taskType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task1">Task 1 (Academic Writing)</SelectItem>
                        <SelectItem value="task2">Task 2 (Essay Writing)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>



                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="timeLimit">制限時間（分） *</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value))}
                      min="1"
                      max="120"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="wordCountMin">最小語数 *</Label>
                    <Input
                      id="wordCountMin"
                      type="number"
                      value={formData.wordCountMin}
                      onChange={(e) => handleInputChange('wordCountMin', parseInt(e.target.value))}
                      min="50"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="wordCountTarget">目標語数 *</Label>
                    <Input
                      id="wordCountTarget"
                      type="number"
                      value={formData.wordCountTarget}
                      onChange={(e) => handleInputChange('wordCountTarget', parseInt(e.target.value))}
                      min="50"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">カテゴリ *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Academic Writing">Academic Writing</SelectItem>
                        <SelectItem value="Essay Writing">Essay Writing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="difficulty">難易度 *</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value) => handleInputChange('difficulty', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="初級">初級</SelectItem>
                        <SelectItem value="中級">中級</SelectItem>
                        <SelectItem value="上級">上級</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 画像アップロード - Task 1の場合のみ表示 */}
            {formData.taskType === 'task1' && (
              <Card>
                <CardHeader>
                  <CardTitle>画像アップロード</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ファイルアップロードエリア */}
                  <div>
                    <Label htmlFor="imageUrl">
                      グラフ・図表の画像
                      <span className="text-red-500 ml-1">*</span>
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
                      Task 1の場合は、グラフや図表の画像が必須です。
                      <br />
                      対応形式: JPG, PNG, GIF, WebP (最大5MB)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 問題内容 */}
            <Card>
              <CardHeader>
                <CardTitle>問題内容</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="content">問題文 *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="IELTSの問題文を入力してください"
                    rows={6}
                    required
                  />
                </div>


              </CardContent>
            </Card>

            {/* 解答例 */}
            <Card>
              <CardHeader>
                <CardTitle>解答例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sampleAnswer">解答例（英語）</Label>
                  <Textarea
                    id="sampleAnswer"
                    value={formData.sampleAnswer}
                    onChange={(e) => handleInputChange('sampleAnswer', e.target.value)}
                    placeholder="模範解答例を英語で入力してください（オプション）"
                    rows={8}
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
                    onChange={(e) => handleInputChange('sampleAnswerJapanese', e.target.value)}
                    placeholder="解答例の日本語訳を入力してください（オプション）"
                    rows={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    解答例の日本語訳を入力してください。空欄のままでも問題ありません。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* アクションボタン */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/dashboard')}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? '作成中...' : '問題を作成'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
