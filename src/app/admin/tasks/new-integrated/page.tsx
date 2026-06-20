"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc } from "firebase/firestore";
import { db, auth, uploadAudioFile } from "@/lib/firebase";
import { FileAudio, AlertTriangle } from "lucide-react";

// 管理者のメールアドレスリスト
const ADMIN_EMAILS = [
  'admin@gmail.com',    // 管理者のメールアドレス
  'admin@example.com',  // 管理者のメールアドレスをここに追加
  'ykita@example.com'   // あなたのメールアドレスを追加
];

export default function NewIntegratedTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUploadProgress, setAudioUploadProgress] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    type: "integrated",
    difficulty: "medium",
    readingPassage: "",
    listeningScript: "",
    readingPassageJapanese: "",
    listeningScriptJapanese: "",
    sampleAnswer: "",
    timeLimit: 20
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = () => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const isUserAdmin = ADMIN_EMAILS.includes(user.email || '');
        setIsAdmin(isUserAdmin);
      } else {
        setIsAdmin(false);
        router.push('/login');
      }
      setAuthChecked(true);
    });

    return unsubscribe;
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setAudioUploadProgress("");
    } else {
      alert("音声ファイルを選択してください。");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Reading Passageを保存
      const readingPassageDoc = await addDoc(collection(db, 'readingPassages'), {
        title: formData.title,
        passage: formData.readingPassage,
        difficulty: formData.difficulty,
        category: formData.category,
        createdAt: new Date(),
        estimatedReadingTime: 3, // 仮値
        wordCount: formData.readingPassage.split(/\s+/).length
      });
      const readingPassageId = readingPassageDoc.id;

      // 2. Listening音源をStorageにアップロード
      let listeningAudioURL = "";
      if (audioFile) {
        setAudioUploadProgress("音声ファイルをアップロード中...");
        listeningAudioURL = await uploadAudioFile(audioFile, readingPassageId);
      }

      // 3. タスク本体を保存
      await addDoc(collection(db, 'tasks'), {
        title: formData.title,
        type: formData.type,
        difficulty: formData.difficulty,
        category: formData.category,
        readingPassageId,
        listeningAudioURL,
        listeningPassageContent: formData.listeningScript,
        readingPassageJapanese: formData.readingPassageJapanese,
        listeningScriptJapanese: formData.listeningScriptJapanese,
        sampleAnswer: formData.sampleAnswer,
        timeLimit: formData.timeLimit,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      alert("タスクが正常に作成されました。");
      router.push("/admin/dashboard");
    } catch (error) {
      console.error("Error creating integrated task:", error);
      alert("タスクの作成に失敗しました。");
    } finally {
      setLoading(false);
      setAudioUploadProgress("");
    }
  };

  if (!authChecked) {
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
          <h1 className="text-3xl font-bold text-gray-900">新しいIntegratedタスクを作成</h1>
          <p className="text-gray-600 mt-2">Reading・Listening・タスク情報をまとめて登録できます。</p>
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
                  <Label htmlFor="difficulty">難易度</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => handleInputChange("difficulty", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
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
              </div>
              <div>
                <Label htmlFor="readingPassage">Reading Passage</Label>
                <Textarea
                  id="readingPassage"
                  value={formData.readingPassage}
                  onChange={(e) => handleInputChange("readingPassage", e.target.value)}
                  rows={6}
                  required
                />
              </div>
              <div>
                <Label htmlFor="listeningScript">Listeningスクリプト</Label>
                <Textarea
                  id="listeningScript"
                  value={formData.listeningScript}
                  onChange={(e) => handleInputChange("listeningScript", e.target.value)}
                  rows={6}
                  required
                />
              </div>
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
                <Label htmlFor="audioFile">Listening音声ファイル</Label>
                <div className="mt-2">
                  <div className="flex items-center gap-4">
                    <Input
                      id="audioFile"
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      className="flex-1"
                    />
                    {audioFile && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileAudio className="h-4 w-4" />
                        {audioFile.name}
                      </div>
                    )}
                  </div>
                  {audioUploadProgress && (
                    <p className="text-sm text-blue-600 mt-2">{audioUploadProgress}</p>
                  )}
                </div>
              </div>
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
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "作成中..." : "タスクを作成"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 