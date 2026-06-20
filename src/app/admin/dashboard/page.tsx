"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Plus, Edit, Trash2, Eye, EyeOff, Users, FileText, BarChart3, AlertTriangle, LogOut, ImageIcon, Play } from "lucide-react";
import { isAdmin } from '@/lib/utils';
import { AdminUser, TrainingPermission } from '@/lib/types';

interface TimestampLike {
  toDate?: () => Date;
}

interface Task {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  category: string;
  status: string;
  createdAt?: TimestampLike | null;
  timeLimit: number;
  imageUrl?: string; // 画像URLフィールドを追加
  taskType?: string; // IELTSタスクタイプ（task1, task2）
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<TrainingPermission>({
    toefl: false,
    toeflAcademicDiscussion: false,
    ielts: false,
    basic: false,
    youtuber: false
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = () => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const userIsAdmin = isAdmin(user.email);
        setIsUserAdmin(userIsAdmin);
        if (userIsAdmin) {
          fetchTasks();
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

  const fetchTasks = async () => {
    try {
      const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(tasksQuery);
      const tasksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log("Fetching users...");
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(usersQuery);
      console.log(`Found ${querySnapshot.docs.length} users`);
      
      const usersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`Processing user: ${doc.id}`, data);
        
        // デフォルト値の設定
        const defaultPermissions = {
          toefl: true,
          ielts: true,
          basic: false,
          youtuber: false
        };
        
        return {
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || '名前未設定',
          photoURL: data.photoURL || null,
          createdAt: data.createdAt || new Date().toISOString(),
          lastLoginAt: data.lastLoginAt || null,
          trainingPermissions: data.trainingPermissions || defaultPermissions,
          role: data.role || 'user',
          isActive: data.isActive !== false
        } as AdminUser;
      });
      
      setUsers(usersData);
      console.log("Users loaded successfully:", usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      
      // エラーの詳細を表示
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error name:", error.name);
      }
      
      // ユーザーにエラーを通知
      alert(`ユーザー情報の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      
      // 空の配列を設定してUIが壊れないようにする
      setUsers([]);
    }
  };

  const handleStatusToggle = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "hidden" : "active";
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
        updatedAt: new Date()
      });
      fetchTasks(); // リストを再取得
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("ステータスの更新に失敗しました。");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete.id));
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
      fetchTasks(); // リストを再取得
      alert("タスクが削除されました。");
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("タスクの削除に失敗しました。");
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'hidden': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch {
      alert('ログアウトに失敗しました');
    }
    setLogoutDialogOpen(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
              <p className="text-gray-600 mt-2">Writing Masterの管理機能</p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => router.push('/training-selection')}
                variant="outline"
                className="bg-white hover:bg-gray-50"
              >
                <Users className="h-4 w-4 mr-2" />
                ユーザーダッシュボード
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setLogoutDialogOpen(true)}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" /> 
                ログアウト
              </Button>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">総タスク数</p>
                  <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">公開中</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tasks.filter(task => task.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <EyeOff className="h-8 w-8 text-gray-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">非表示</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tasks.filter(task => task.status === 'hidden').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">TOEFL</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tasks.filter(task => task.type === 'integrated').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">IELTS</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tasks.filter(task => task.taskType && (task.taskType === 'task1' || task.taskType === 'task2')).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Play className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">YouTube Learning</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(user => user.trainingPermissions?.youtuber).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 管理機能への遷移ボタン */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/users')}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">ユーザー管理</h3>
                    <p className="text-sm text-gray-600">ユーザーの権限設定とエッセイ管理</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/tasks/new-integrated')}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">TOEFLタスク追加</h3>
                    <p className="text-sm text-gray-600">新しいTOEFL問題を作成</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/ielts-task-create')}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">IELTS問題追加</h3>
                    <p className="text-sm text-gray-600">新しいIELTS問題を作成</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/toefl-academic-discussion-create')}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">TOEFL Academic Discussion追加</h3>
                    <p className="text-sm text-gray-600">新しいAcademic Discussion問題を作成</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>



        {/* タスク管理 */}
          <Card>
            <CardHeader>
              <CardTitle>タスク管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">タイトル</th>
                      <th className="text-left py-3 px-4 font-medium">タイプ</th>
                      <th className="text-left py-3 px-4 font-medium">難易度</th>
                      <th className="text-left py-3 px-4 font-medium">カテゴリ</th>
                      <th className="text-left py-3 px-4 font-medium">ステータス</th>
                      <th className="text-left py-3 px-4 font-medium">制限時間</th>
                      <th className="text-left py-3 px-4 font-medium">画像</th>
                      <th className="text-left py-3 px-4 font-medium">作成日</th>
                      <th className="text-left py-3 px-4 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{task.title}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {task.taskType === 'task1' ? 'IELTS Task 1' :
                             task.taskType === 'task2' ? 'IELTS Task 2' :
                             task.taskType === 'academic_discussion' ? 'TOEFL Academic Discussion' :
                             task.type === 'integrated' ? 'TOEFL Integrated' : 'TOEFL Independent'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getDifficultyColor(task.difficulty)}>
                            {task.difficulty}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{task.category}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status === 'active' ? '公開中' : '非表示'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{task.timeLimit}分</td>
                        <td className="py-3 px-4">
                          {task.imageUrl ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                              <span className="text-xs text-green-700">あり</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                              <span className="text-xs text-gray-500">なし</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {task.createdAt?.toDate?.() ? 
                            task.createdAt.toDate().toLocaleDateString('ja-JP') : 
                            'N/A'
                          }
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusToggle(task.id, task.status)}
                            >
                              {task.status === 'active' ? 
                                <Eye className="h-4 w-4" /> : 
                                <EyeOff className="h-4 w-4" />
                              }
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/admin/tasks/${task.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTaskToDelete(task);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
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


        {/* 削除確認ダイアログ */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>タスクの削除</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>「{taskToDelete?.title}」を削除しますか？</p>
              <p className="text-sm text-gray-600 mt-2">この操作は取り消せません。</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleDeleteTask}>
                削除
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* ログアウト確認ダイアログ */}
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ログアウトの確認</DialogTitle>
              <DialogDescription>
                ログアウトしてもよろしいですか？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                ログアウト
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 
