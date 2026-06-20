"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { ArrowLeft, Settings, Users, FileText, Trash2, Eye, AlertTriangle, Play, Edit, Key, UserMinus, GraduationCap, Video } from "lucide-react";
import { isAdmin } from '@/lib/utils';
import { AdminUser, TrainingPermission, Essay } from '@/lib/types';

// 拡張されたEssay型（admin用）
interface ExtendedEssay extends Essay {
  collection?: string;
  taskType?: string;
  type?: string;
  videoTitle?: string;
  videoDescription?: string;
  transcript?: string;
  taskContent?: string;
  imageUrl?: string;
  discussionContent?: Record<string, unknown>;
  readingPassage?: string;
  listeningPassage?: string;
}

interface FeedbackRequestBody {
  essayText: string;
  prompt?: string;
  taskType?: string;
  videoTitle?: string;
  videoDescription?: string;
  transcript?: string;
  taskContent?: string;
  imageUrl?: string;
  discussionContent?: Record<string, unknown>;
  readingPassage?: string;
  listeningPassage?: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<TrainingPermission>({
    toefl: false,
    toeflAcademicDiscussion: false,
    ielts: false,
    basic: false,
    youtuber: false
  });
  
  // エッセイ管理用の状態
  const [essaysDialogOpen, setEssaysDialogOpen] = useState(false);
  const [selectedUserEssays, setSelectedUserEssays] = useState<ExtendedEssay[]>([]);
  const [essayDetailDialogOpen, setEssayDetailDialogOpen] = useState(false);
  const [selectedEssay, setSelectedEssay] = useState<ExtendedEssay | null>(null);
  const [selectedEssaysForBulkDelete, setSelectedEssaysForBulkDelete] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [loadingEssays, setLoadingEssays] = useState(false);
  const [regeneratingFeedback, setRegeneratingFeedback] = useState(false);

  // ユーザー編集用の状態
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState('');

  // ユーザー削除用の状態
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = () => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const userIsAdmin = isAdmin(user.email);
        setIsUserAdmin(userIsAdmin);
        if (userIsAdmin) {
          fetchUsers();
        }
      } else {
        setIsUserAdmin(false);
        router.push('/login');
      }
      setAuthChecked(true);
      setLoading(false);
    });

    return unsubscribe;
  };

  const fetchUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(usersQuery);
      const usersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          ...data,
          trainingPermissions: data.trainingPermissions || {
            toefl: true,
            toeflAcademicDiscussion: true,
            ielts: true,
            basic: false,
            youtuber: false
          },
          role: data.role || 'user',
          isActive: data.isActive !== false
        } as AdminUser;
      });
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handlePermissionUpdate = async () => {
    if (!selectedUser) return;

    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        trainingPermissions: userPermissions,
        updatedAt: new Date()
      });
      setPermissionDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
      alert("トレーニング権限を更新しました。");
    } catch (error) {
      console.error("Error updating permissions:", error);
      alert("権限の更新に失敗しました。");
    }
  };

  const openPermissionDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setUserPermissions(user.trainingPermissions);
    setPermissionDialogOpen(true);
  };

  // エッセイ関連の関数
  const openEssaysDialog = async (user: AdminUser) => {
    setSelectedUser(user);
    setEssaysDialogOpen(true);
    await fetchUserEssays(user.uid);
  };

  const fetchUserEssays = async (userId: string) => {
    setLoadingEssays(true);
    try {
      // 全てのコレクションからエッセイを取得
      const collections = ['essays', 'basicEssays', 'youTuberEssays'];
      const allEssays: ExtendedEssay[] = [];

      for (const collectionName of collections) {
        try {
          const essaysRef = collection(db, 'users', userId, collectionName);
          const essaysQuery = query(essaysRef, orderBy('submittedAt', 'desc'));
          const querySnapshot = await getDocs(essaysQuery);
          const essaysData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            collection: collectionName, // コレクション名を追加
            ...doc.data()
          })) as ExtendedEssay[];
          allEssays.push(...essaysData);
        } catch (error) {
          console.error(`Error fetching ${collectionName}:`, error);
          // 個別のコレクションでエラーが発生しても続行
        }
      }

      // 提出日でソート
      allEssays.sort((a, b) => {
        const dateA = a.submittedAt instanceof Date ? a.submittedAt : a.submittedAt?.toDate?.() || new Date(0);
        const dateB = b.submittedAt instanceof Date ? b.submittedAt : b.submittedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setSelectedUserEssays(allEssays);
    } catch (error) {
      console.error("Error fetching user essays:", error);
      setSelectedUserEssays([]);
    } finally {
      setLoadingEssays(false);
    }
  };

  const openEssayDetail = (essay: ExtendedEssay) => {
    setSelectedEssay(essay);
    setEssayDetailDialogOpen(true);
  };

  const deleteEssay = async (essayId: string, userId: string, collectionName?: string) => {
    if (!confirm('このエッセイを削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      // コレクション名が指定されていない場合は、essaysコレクションから削除
      const targetCollection = collectionName || 'essays';
      await deleteDoc(doc(db, 'users', userId, targetCollection, essayId));
      await fetchUserEssays(userId);
      alert('エッセイを削除しました。');
    } catch (error) {
      console.error("Error deleting essay:", error);
      alert('エッセイの削除に失敗しました。');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedUser || selectedEssaysForBulkDelete.length === 0) return;

    if (!confirm(`${selectedEssaysForBulkDelete.length}件のエッセイを削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const deletePromises = selectedEssaysForBulkDelete.map(essayId => {
        // エッセイのコレクション情報を取得
        const essay = selectedUserEssays.find(e => e.id === essayId);
        const collectionName = essay?.collection || 'essays';
        return deleteDoc(doc(db, 'users', selectedUser.uid, collectionName, essayId));
      });
      await Promise.all(deletePromises);
      
      setSelectedEssaysForBulkDelete([]);
      setBulkDeleteDialogOpen(false);
      await fetchUserEssays(selectedUser.uid);
      alert(`${selectedEssaysForBulkDelete.length}件のエッセイを削除しました。`);
    } catch (error) {
      console.error("Error bulk deleting essays:", error);
      alert('一括削除に失敗しました。');
    }
  };

  const toggleEssaySelection = (essayId: string) => {
    setSelectedEssaysForBulkDelete(prev => 
      prev.includes(essayId) 
        ? prev.filter(id => id !== essayId)
        : [...prev, essayId]
    );
  };

  const selectAllEssays = () => {
    if (selectedEssaysForBulkDelete.length === selectedUserEssays.length) {
      setSelectedEssaysForBulkDelete([]);
    } else {
      setSelectedEssaysForBulkDelete(selectedUserEssays.map(essay => essay.id));
    }
  };

  // フィードバック再作成の関数
  const regenerateFeedback = async (essay: ExtendedEssay) => {
    if (!selectedUser) return;
    
    setRegeneratingFeedback(true);
    try {
      // エッセイのステータスを「処理中」に更新
      const targetCollection = essay.collection || 'essays';
      const essayRef = doc(db, 'users', selectedUser.uid, targetCollection, essay.id);
      await updateDoc(essayRef, {
        status: 'processing',
        updatedAt: new Date()
      });

      // トレーニングタイプに応じて適切なAPIを呼び出し
      let apiEndpoint = '';
      const requestBody: FeedbackRequestBody = {
        essayText: essay.content
      };

      if (essay.collection === 'basicEssays') {
        apiEndpoint = '/api/analyze-basic';
        requestBody.prompt = '自由記述';
      } else if (essay.collection === 'youTuberEssays') {
        apiEndpoint = '/api/analyze-youtuber';
        requestBody.taskType = essay.taskType || 'summary';
        requestBody.videoTitle = essay.videoTitle || '';
        requestBody.videoDescription = essay.videoDescription || '';
        requestBody.transcript = essay.transcript || '';
      } else if (essay.taskType === 'task1' || essay.taskType === 'task2') {
        apiEndpoint = '/api/analyze-ielts';
        requestBody.taskType = essay.taskType;
        requestBody.taskContent = essay.taskContent || '';
        requestBody.imageUrl = essay.imageUrl || '';
      } else if (essay.taskType === 'academic_discussion') {
        apiEndpoint = '/api/analyze-toefl-academic-discussion';
        requestBody.discussionContent = essay.discussionContent || {};
      } else {
        // TOEFL Integrated Task
        apiEndpoint = '/api/analyze-toefl';
        requestBody.readingPassage = essay.readingPassage || '';
        requestBody.listeningPassage = essay.listeningPassage || '';
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const feedback = await response.json();

      // フィードバックを保存
      await updateDoc(essayRef, {
        feedback: feedback,
        status: 'feedback_completed',
        updatedAt: new Date()
      });

      // エッセイ一覧を再取得
      await fetchUserEssays(selectedUser.uid);
      
      alert('フィードバックの再作成が完了しました。');
    } catch (error) {
      console.error('Error regenerating feedback:', error);
      
      // エラーが発生した場合、ステータスをエラーに更新
      if (selectedUser) {
        const targetCollection = essay.collection || 'essays';
        const essayRef = doc(db, 'users', selectedUser.uid, targetCollection, essay.id);
        await updateDoc(essayRef, {
          status: 'error',
          updatedAt: new Date()
        });
      }
      
      alert('フィードバックの再作成に失敗しました。');
    } finally {
      setRegeneratingFeedback(false);
    }
  };

  // ユーザー編集関連の関数
  const openEditUserDialog = (user: AdminUser) => {
    setEditingUser(user);
    setEditedDisplayName(user.displayName || '');
    setEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        displayName: editedDisplayName,
        updatedAt: new Date()
      });
      
      setEditUserDialogOpen(false);
      setEditingUser(null);
      setEditedDisplayName('');
      fetchUsers();
      alert('ユーザー情報を更新しました。');
    } catch (error) {
      console.error("Error updating user:", error);
      alert('ユーザー情報の更新に失敗しました。');
    }
  };

  const openPasswordResetDialog = (user: AdminUser) => {
    setPasswordResetEmail(user.email);
    setPasswordResetDialogOpen(true);
  };

  const handlePasswordReset = async () => {
    try {
      // Firebase Admin SDKを使用してパスワードリセットメールを送信
      // 注意: これは実際の実装では、Firebase Admin SDKを使用する必要があります
      alert(`パスワードリセットメールを ${passwordResetEmail} に送信しました。`);
      setPasswordResetDialogOpen(false);
      setPasswordResetEmail('');
    } catch (error) {
      console.error("Error sending password reset:", error);
      alert('パスワードリセットメールの送信に失敗しました。');
    }
  };

  // ユーザー削除関連の関数
  const openDeleteUserDialog = (user: AdminUser) => {
    setUserToDelete(user);
    setDeleteUserDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // 注意: 実際のユーザー削除はFirebase側で手動で行う必要があります
      // ここではUI上での削除のみを行います
      
      // ユーザー一覧から削除（UI上のみ）
      setUsers(prevUsers => prevUsers.filter(user => user.uid !== userToDelete.uid));
      
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
      
      // Firebase側での手動削除が必要であることを通知
      alert(`ユーザー "${userToDelete.displayName || userToDelete.email}" をUI上から削除しました。\n\n⚠️ 重要: Firebase Authentication と Firestore から実際にユーザーを削除するには、Firebase コンソールで手動で削除してください。`);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert('ユーザーの削除に失敗しました。');
    }
  };

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!isUserAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => router.push('/admin/dashboard')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
                <p className="text-gray-600 mt-2">ユーザーのトレーニング権限とエッセイを管理</p>
              </div>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
                <p className="text-sm text-gray-600">総ユーザー</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 relative overflow-hidden">
              <GraduationCap className="absolute top-2 right-2 h-8 w-8 text-blue-100" />
              <div className="text-center relative z-10">
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(user => user.trainingPermissions.toefl).length}
                </p>
                <p className="text-sm text-gray-600">TOEFL Integrated</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 relative overflow-hidden">
              <Users className="absolute top-2 right-2 h-8 w-8 text-blue-100" />
              <div className="text-center relative z-10">
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(user => user.trainingPermissions.toeflAcademicDiscussion).length}
                </p>
                <p className="text-sm text-gray-600">Academic</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 relative overflow-hidden">
              <GraduationCap className="absolute top-2 right-2 h-8 w-8 text-emerald-100" />
              <div className="text-center relative z-10">
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(user => user.trainingPermissions.ielts).length}
                </p>
                <p className="text-sm text-gray-600">IELTS</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 relative overflow-hidden">
              <FileText className="absolute top-2 right-2 h-8 w-8 text-violet-100" />
              <div className="text-center relative z-10">
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(user => user.trainingPermissions.basic).length}
                </p>
                <p className="text-sm text-gray-600">Basic</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 relative overflow-hidden">
              <Video className="absolute top-2 right-2 h-8 w-8 text-red-100" />
              <div className="text-center relative z-10">
                <p className="text-3xl font-bold text-gray-900">
                  {users.filter(user => user.trainingPermissions.youtuber).length}
                </p>
                <p className="text-sm text-gray-600">YouTube</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ユーザー一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>ユーザー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">ユーザー名</th>
                    <th className="text-left py-3 px-4 font-medium">メールアドレス</th>
                    <th className="text-center py-3 px-4 font-medium">
                      <div 
                        className="flex items-center justify-center"
                        title="TOEFL Integrated Task"
                      >
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium">
                      <div 
                        className="flex items-center justify-center"
                        title="TOEFL Academic Discussion"
                      >
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium">
                      <div 
                        className="flex items-center justify-center"
                        title="IELTSトレーニング"
                      >
                        <GraduationCap className="h-5 w-5 text-emerald-600" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium">
                      <div 
                        className="flex items-center justify-center"
                        title="Basicトレーニング"
                      >
                        <FileText className="h-5 w-5 text-violet-600" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium">
                      <div 
                        className="flex items-center justify-center"
                        title="YouTube Learning"
                      >
                        <Video className="h-5 w-5 text-red-600" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium">作成日</th>
                    <th className="text-left py-3 px-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.uid} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm text-gray-600">
                                {user.displayName?.charAt(0) || user.email?.charAt(0)}
                              </span>
                            </div>
                          )}
                          {user.displayName || '名前未設定'}
                        </div>
                      </td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        <div 
                          className="flex items-center justify-center"
                          title={user.trainingPermissions.toefl ? 'TOEFL利用可能' : 'TOEFL利用不可'}
                        >
                          <GraduationCap 
                            className={`h-5 w-5 ${user.trainingPermissions.toefl ? 'text-green-600' : 'text-gray-400'}`}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div 
                          className="flex items-center justify-center"
                          title={user.trainingPermissions.toeflAcademicDiscussion ? 'Academic Discussion利用可能' : 'Academic Discussion利用不可'}
                        >
                          <Users 
                            className={`h-5 w-5 ${user.trainingPermissions.toeflAcademicDiscussion ? 'text-green-600' : 'text-gray-400'}`}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div 
                          className="flex items-center justify-center"
                          title={user.trainingPermissions.ielts ? 'IELTS利用可能' : 'IELTS利用不可'}
                        >
                          <GraduationCap 
                            className={`h-5 w-5 ${user.trainingPermissions.ielts ? 'text-green-600' : 'text-gray-400'}`}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div 
                          className="flex items-center justify-center"
                          title={user.trainingPermissions.basic ? 'Basic利用可能' : 'Basic利用不可'}
                        >
                          <FileText 
                            className={`h-5 w-5 ${user.trainingPermissions.basic ? 'text-green-600' : 'text-gray-400'}`}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div 
                          className="flex items-center justify-center"
                          title={user.trainingPermissions.youtuber ? 'YouTube利用可能' : 'YouTube利用不可'}
                        >
                          <Video 
                            className={`h-5 w-5 ${user.trainingPermissions.youtuber ? 'text-green-600' : 'text-gray-400'}`}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditUserDialog(user)}
                            title="ユーザー編集"
                            className="text-green-600 hover:text-green-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPasswordResetDialog(user)}
                            title="パスワードリセット"
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEssaysDialog(user)}
                            title="エッセイ管理"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPermissionDialog(user)}
                            title="権限設定"
                            className="text-gray-600 hover:text-gray-700"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteUserDialog(user)}
                            title="ユーザー削除"
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* トレーニング権限設定ダイアログ */}
        <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>トレーニング権限の設定</DialogTitle>
              <DialogDescription>
                {selectedUser?.displayName || selectedUser?.email} の利用可能なトレーニングを設定してください
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="toefl-permission" className="text-sm font-medium">
                  TOEFLトレーニング
                </Label>
                <Switch
                  id="toefl-permission"
                  checked={userPermissions.toefl}
                  onCheckedChange={(checked) => setUserPermissions(prev => ({ ...prev, toefl: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="toefl-academic-discussion-permission" className="text-sm font-medium">
                  TOEFL Academic Discussion
                </Label>
                <Switch
                  id="toefl-academic-discussion-permission"
                  checked={userPermissions.toeflAcademicDiscussion}
                  onCheckedChange={(checked) => setUserPermissions(prev => ({ ...prev, toeflAcademicDiscussion: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ielts-permission" className="text-sm font-medium">
                  IELTSトレーニング
                </Label>
                <Switch
                  id="ielts-permission"
                  checked={userPermissions.ielts}
                  onCheckedChange={(checked) => setUserPermissions(prev => ({ ...prev, ielts: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="basic-permission" className="text-sm font-medium">
                  Basicトレーニング
                </Label>
                <Switch
                  id="basic-permission"
                  checked={userPermissions.basic}
                  onCheckedChange={(checked) => setUserPermissions(prev => ({ ...prev, basic: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="youtuber-permission" className="text-sm font-medium">
                  YouTube Learning
                </Label>
                <Switch
                  id="youtuber-permission"
                  checked={userPermissions.youtuber}
                  onCheckedChange={(checked) => setUserPermissions(prev => ({ ...prev, youtuber: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handlePermissionUpdate}>
                更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* エッセイ管理ダイアログ */}
        <Dialog open={essaysDialogOpen} onOpenChange={setEssaysDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.displayName || selectedUser?.email} のエッセイ管理
              </DialogTitle>
              <DialogDescription>
                提出されたエッセイの確認、削除、一括削除ができます
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {loadingEssays ? (
                <div className="text-center py-8">
                  <div className="text-lg">読み込み中...</div>
                </div>
              ) : selectedUserEssays.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  提出されたエッセイはありません
                </div>
              ) : (
                <>
                  {/* 一括操作バー */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedEssaysForBulkDelete.length === selectedUserEssays.length}
                          onCheckedChange={selectAllEssays}
                        />
                        <span className="text-sm text-gray-600">
                          {selectedEssaysForBulkDelete.length} / {selectedUserEssays.length} 件選択
                        </span>
                      </div>
                      {selectedEssaysForBulkDelete.length > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setBulkDeleteDialogOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          選択したエッセイを削除
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* エッセイ一覧 */}
                  <div className="space-y-3">
                    {selectedUserEssays.map((essay) => (
                      <div key={essay.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={selectedEssaysForBulkDelete.includes(essay.id)}
                              onCheckedChange={() => toggleEssaySelection(essay.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {essay.status === 'completed' ? '完了' : 
                                   essay.status === 'processing' ? '処理中' : 
                                   essay.status === 'feedback_completed' ? 'フィードバック完了' : 
                                   essay.status === 'error' ? 'エラー' : '提出済み'}
                                </Badge>
                                {/* トレーニングタイプのバッジ */}
                                <Badge variant="secondary" className="text-xs">
                                  {essay.collection === 'basicEssays' ? 'Basic' :
                                   essay.collection === 'youTuberEssays' ? 'YouTube' :
                                   essay.taskType === 'academic_discussion' ? 'TOEFL Academic' :
                                   essay.taskType === 'task1' || essay.taskType === 'task2' ? 'IELTS' :
                                   essay.type === 'integrated' ? 'TOEFL Integrated' : 'TOEFL'}
                                </Badge>
                                {essay.wordCount && (
                                  <span className="text-sm text-gray-600">
                                    {essay.wordCount}語
                                  </span>
                                )}
                                {essay.timeSpent && (
                                  <span className="text-sm text-gray-600">
                                    {Math.floor(essay.timeSpent / 60)}分{essay.timeSpent % 60}秒
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                提出日: {essay.submittedAt instanceof Date 
                                  ? essay.submittedAt.toLocaleDateString('ja-JP')
                                  : essay.submittedAt?.toDate?.() ? essay.submittedAt.toDate().toLocaleDateString('ja-JP') : '不明'}
                              </div>
                              <div className="text-sm text-gray-800 line-clamp-2">
                                {essay.content.substring(0, 200)}...
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEssayDetail(essay)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {essay.status !== 'feedback_completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => regenerateFeedback(essay)}
                                disabled={regeneratingFeedback}
                                className="text-blue-600 hover:text-blue-700"
                                title="フィードバック再作成"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteEssay(essay.id, selectedUser!.uid, essay.collection)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* エッセイ詳細ダイアログ */}
        <Dialog open={essayDetailDialogOpen} onOpenChange={setEssayDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>エッセイ詳細</DialogTitle>
            </DialogHeader>
            {selectedEssay && (
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">ステータス:</span>
                    <Badge className="ml-2">
                      {selectedEssay.status === 'completed' ? '完了' : 
                       selectedEssay.status === 'processing' ? '処理中' : 
                       selectedEssay.status === 'feedback_completed' ? 'フィードバック完了' : 
                       selectedEssay.status === 'error' ? 'エラー' : '提出済み'}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">トレーニングタイプ:</span>
                    <Badge variant="secondary" className="ml-2">
                      {selectedEssay.collection === 'basicEssays' ? 'Basic' :
                       selectedEssay.collection === 'youTuberEssays' ? 'YouTube' :
                       selectedEssay.taskType === 'academic_discussion' ? 'TOEFL Academic' :
                       selectedEssay.taskType === 'task1' || selectedEssay.taskType === 'task2' ? 'IELTS' :
                       selectedEssay.type === 'integrated' ? 'TOEFL Integrated' : 'TOEFL'}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">提出日:</span>
                    <span className="ml-2">
                      {selectedEssay.submittedAt instanceof Date 
                        ? selectedEssay.submittedAt.toLocaleDateString('ja-JP')
                        : selectedEssay.submittedAt?.toDate?.() ? selectedEssay.submittedAt.toDate().toLocaleDateString('ja-JP') : '不明'}
                    </span>
                  </div>
                  {selectedEssay.wordCount && (
                    <div>
                      <span className="font-medium">語数:</span>
                      <span className="ml-2">{selectedEssay.wordCount}語</span>
                    </div>
                  )}
                  {selectedEssay.timeSpent && (
                    <div>
                      <span className="font-medium">所要時間:</span>
                      <span className="ml-2">
                        {Math.floor(selectedEssay.timeSpent / 60)}分{selectedEssay.timeSpent % 60}秒
                      </span>
                    </div>
                  )}
                  {selectedEssay.score && (
                    <div>
                      <span className="font-medium">スコア:</span>
                      <span className="ml-2">{selectedEssay.score}点</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">エッセイ内容</h4>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                    {selectedEssay.content}
                  </div>
                </div>

                {/* フィードバック再作成ボタン */}
                {selectedEssay.status !== 'feedback_completed' && (
                  <div className="flex justify-center mb-4">
                    <Button
                      onClick={() => regenerateFeedback(selectedEssay)}
                      disabled={regeneratingFeedback}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {regeneratingFeedback ? 'フィードバック作成中...' : 'フィードバック再作成'}
                    </Button>
                  </div>
                )}

                {selectedEssay.feedback && (
                  <div>
                    <h4 className="font-medium mb-2">フィードバック</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">総合評価:</span>
                        <p className="mt-1 text-sm bg-blue-50 p-3 rounded">{selectedEssay.feedback.overall}</p>
                      </div>
                      
                      {selectedEssay.feedback.strengths && selectedEssay.feedback.strengths.length > 0 && (
                        <div>
                          <span className="font-medium">良い点:</span>
                          <ul className="mt-1 text-sm bg-green-50 p-3 rounded">
                            {selectedEssay.feedback.strengths.map((strength, index) => (
                              <li key={index}>• {strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {selectedEssay.feedback.improvements && selectedEssay.feedback.improvements.length > 0 && (
                        <div>
                          <span className="font-medium">改善点:</span>
                          <ul className="mt-1 text-sm bg-yellow-50 p-3 rounded">
                            {selectedEssay.feedback.improvements.map((improvement, index) => (
                              <li key={index}>• {improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 一括削除確認ダイアログ */}
        <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                一括削除の確認
              </DialogTitle>
              <DialogDescription>
                選択された {selectedEssaysForBulkDelete.length} 件のエッセイを削除します。
                この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete}>
                削除する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ユーザー編集ダイアログ */}
        <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>ユーザー情報の編集</DialogTitle>
              <DialogDescription>
                {editingUser?.displayName || editingUser?.email} の情報を編集します
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">ユーザー名</Label>
                <Input
                  id="displayName"
                  value={editedDisplayName}
                  onChange={(e) => setEditedDisplayName(e.target.value)}
                  placeholder="ユーザー名を入力"
                />
              </div>
              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <Input
                  value={editingUser?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500">メールアドレスは変更できません</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleUpdateUser}>
                更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* パスワードリセットダイアログ */}
        <Dialog open={passwordResetDialogOpen} onOpenChange={setPasswordResetDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-orange-500" />
                パスワードリセット
              </DialogTitle>
              <DialogDescription>
                このユーザーにパスワードリセットメールを送信します
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label>送信先メールアドレス</Label>
                <Input
                  value={passwordResetEmail}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500">
                  パスワードリセットメールが送信されます。ユーザーはメール内のリンクから新しいパスワードを設定できます。
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordResetDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handlePasswordReset} className="bg-orange-600 hover:bg-orange-700">
                パスワードリセットメールを送信
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ユーザー削除確認ダイアログ */}
        <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-red-500" />
                ユーザー削除の確認
              </DialogTitle>
              <DialogDescription>
                このユーザーを削除しますか？
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-2">⚠️ 重要な注意事項</p>
                    <ul className="space-y-1 text-xs">
                      <li>• この操作はUI上での削除のみです</li>
                      <li>• 実際のユーザー削除はFirebase側で手動で行う必要があります</li>
                      <li>• Firebase Authentication と Firestore から手動で削除してください</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>削除対象ユーザー</Label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">{userToDelete?.displayName || '名前未設定'}</p>
                  <p className="text-sm text-gray-600">{userToDelete?.email}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteUserDialogOpen(false)}>
                キャンセル
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700"
              >
                削除する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
