"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Save, MessageCircle } from "lucide-react";

export default function TOEFLAcademicDiscussionCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty: "中級",
    category: "Academic Discussion",
    timeLimit: 10,
    wordCountMin: 100,
    wordCountTarget: 150,
    professor: "",
    student1: "",
    student2: "",
    instructions: "",
    professorName: "Doctor Gupta",
    student1Name: "Kelly",
    student2Name: "Andrew",
    japaneseTranslation: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 必須フィールドのチェック
    if (!formData.professor.trim() || !formData.student1.trim() || !formData.student2.trim()) {
      alert('教授、学生1、学生2のコメントはすべて必須です。');
      setLoading(false);
      return;
    }

    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        type: "independent",
        taskType: "academic_discussion",
        difficulty: formData.difficulty,
        category: formData.category,
        timeLimit: formData.timeLimit,
        wordCount: {
          min: parseInt(formData.wordCountMin.toString()),
          target: parseInt(formData.wordCountTarget.toString())
        },
        discussionContent: {
          professor: formData.professor,
          student1: formData.student1,
          student2: formData.student2,
          professorName: formData.professorName,
          student1Name: formData.student1Name,
          student2Name: formData.student2Name
        },
        japaneseTranslation: formData.japaneseTranslation,
        instructions: formData.instructions,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'tasks'), taskData);
      
      alert('TOEFL Academic Discussion問題が正常に作成されました！');
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
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              管理者ダッシュボードに戻る
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-blue-600" />
            TOEFL Academic Discussion 問題作成
          </h1>
          <p className="text-gray-600 mt-2">
            教授と学生のディスカッション形式の問題を作成します
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">問題タイトル *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="例: リモートワークの影響について"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">問題説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="問題の概要や学習目標を記述してください"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div>
                  <Label htmlFor="timeLimit">制限時間（分） *</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value))}
                    min="5"
                    max="30"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">カテゴリ *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="Academic Discussion"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wordCountMin">最小語数 *</Label>
                  <Input
                    id="wordCountMin"
                    type="number"
                    value={formData.wordCountMin}
                    onChange={(e) => handleInputChange('wordCountMin', parseInt(e.target.value))}
                    min="50"
                    max="200"
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
                    min="100"
                    max="300"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ディスカッション内容 */}
          <Card>
            <CardHeader>
              <CardTitle>ディスカッション内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 名前設定 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="professorName">教授の名前</Label>
                  <Input
                    id="professorName"
                    value={formData.professorName}
                    onChange={(e) => handleInputChange('professorName', e.target.value)}
                    placeholder="例: Doctor Gupta"
                  />
                </div>
                <div>
                  <Label htmlFor="student1Name">学生1の名前</Label>
                  <Input
                    id="student1Name"
                    value={formData.student1Name}
                    onChange={(e) => handleInputChange('student1Name', e.target.value)}
                    placeholder="例: Kelly"
                  />
                </div>
                <div>
                  <Label htmlFor="student2Name">学生2の名前</Label>
                  <Input
                    id="student2Name"
                    value={formData.student2Name}
                    onChange={(e) => handleInputChange('student2Name', e.target.value)}
                    placeholder="例: Andrew"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="professor">教授のコメント *</Label>
                <Textarea
                  id="professor"
                  value={formData.professor}
                  onChange={(e) => handleInputChange('professor', e.target.value)}
                  placeholder="教授がディスカッションを開始するコメントを入力してください"
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="student1">学生1のコメント *</Label>
                <Textarea
                  id="student1"
                  value={formData.student1}
                  onChange={(e) => handleInputChange('student1', e.target.value)}
                  placeholder="学生1の意見やコメントを入力してください"
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="student2">学生2のコメント *</Label>
                <Textarea
                  id="student2"
                  value={formData.student2}
                  onChange={(e) => handleInputChange('student2', e.target.value)}
                  placeholder="学生2の意見やコメントを入力してください"
                  rows={3}
                  required
                />
              </div>


              <div>
                <Label htmlFor="instructions">指示事項</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                  placeholder="学生への具体的な指示を入力してください（例：100語以上で述べる、具体例を含めるなど）"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="japaneseTranslation">問題内容の日本語訳</Label>
                <Textarea
                  id="japaneseTranslation"
                  value={formData.japaneseTranslation}
                  onChange={(e) => handleInputChange('japaneseTranslation', e.target.value)}
                  placeholder="教授と学生のディスカッション内容の日本語訳を入力してください"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* プレビュー */}
          <Card>
            <CardHeader>
              <CardTitle>プレビュー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">{formData.professorName || "教授"}:</h4>
                  <p className="text-gray-800">{formData.professor || "教授のコメントを入力してください"}</p>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">{formData.student1Name || "学生1"}:</h4>
                  <p className="text-gray-800">{formData.student1 || "学生1のコメントを入力してください"}</p>
                </div>
                
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">{formData.student2Name || "学生2"}:</h4>
                  <p className="text-gray-800">{formData.student2 || "学生2のコメントを入力してください"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 送信ボタン */}
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  作成中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  問題を作成
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

