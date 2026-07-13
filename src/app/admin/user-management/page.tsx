"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowDownAZ, ArrowDownWideNarrow, Ban, CheckCircle2, Eye, KeyRound, Search, Trash2, UserPlus } from "lucide-react";
import { auth } from "@/lib/firebase";
import { isAdmin } from "@/lib/utils";
import type { AdminUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"createdAt" | "romaji">("createdAt");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });

  const adminFetch = useCallback(async (url: string, init?: RequestInit) => {
    if (!auth.currentUser) throw new Error("認証が必要です。");
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "処理に失敗しました。");
    return data;
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await adminFetch("/api/admin/users");
    setUsers(data.users);
  }, [adminFetch]);

  useEffect(() => auth.onAuthStateChanged(async (user) => {
    if (!user) return router.replace("/login");
    if (!isAdmin(user.email)) return router.replace("/");
    try { await loadUsers(); } catch (error) { alert(error instanceof Error ? error.message : "読込に失敗しました。"); }
    finally { setLoading(false); }
  }), [loadUsers, router]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? users.filter((user) => `${user.displayName} ${user.email} ${user.lastNameRomaji ?? ""} ${user.firstNameRomaji ?? ""}`.toLowerCase().includes(needle))
      : [...users];
    if (sortKey === "romaji") {
      matched.sort((a, b) => {
        const ra = `${a.lastNameRomaji ?? ""} ${a.firstNameRomaji ?? ""}`.trim().toLowerCase();
        const rb = `${b.lastNameRomaji ?? ""} ${b.firstNameRomaji ?? ""}`.trim().toLowerCase();
        // 未登録は末尾へ
        if (!ra && rb) return 1;
        if (ra && !rb) return -1;
        return ra.localeCompare(rb);
      });
    }
    return matched;
  }, [query, users, sortKey]);

  async function createUser() {
    try {
      setBusyUid("create");
      await adminFetch("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
      await loadUsers();
      setCreateOpen(false);
      setForm({ displayName: "", email: "", password: "" });
    } catch (error) { alert(error instanceof Error ? error.message : "作成に失敗しました。"); }
    finally { setBusyUid(null); }
  }

  async function toggleActive(user: AdminUser) {
    try {
      setBusyUid(user.uid);
      await adminFetch(`/api/admin/users/${user.uid}`, { method: "PATCH", body: JSON.stringify({ disabled: user.isActive }) });
      await loadUsers();
    } catch (error) { alert(error instanceof Error ? error.message : "変更に失敗しました。"); }
    finally { setBusyUid(null); }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    try {
      setBusyUid(deleteTarget.uid);
      await adminFetch(`/api/admin/users/${deleteTarget.uid}`, { method: "DELETE" });
      await loadUsers();
      setDeleteTarget(null);
    } catch (error) { alert(error instanceof Error ? error.message : "削除に失敗しました。"); }
    finally { setBusyUid(null); }
  }

  async function resetPassword(user: AdminUser) {
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert(`${user.email} にパスワード再設定メールを送信しました。`);
    } catch { alert("パスワード再設定メールの送信に失敗しました。"); }
  }

  if (loading) return <div className="min-h-screen grid place-items-center">読み込み中...</div>;

  return <main className="min-h-screen bg-gray-50 p-4 dark:bg-slate-900 dark:text-slate-100 md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div><h1 className="text-2xl font-bold">ユーザー管理</h1><p className="text-sm text-gray-600">Firebase Authenticationとユーザーデータを一元管理します。</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/users")}>作文・権限管理（旧画面）</Button>
          <Button onClick={() => setCreateOpen(true)}><UserPlus className="h-4 w-4" />ユーザー追加</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-gray-500">登録ユーザー</p><p className="text-3xl font-bold">{users.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-gray-500">利用中</p><p className="text-3xl font-bold text-green-700">{users.filter((u) => u.isActive).length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-gray-500">利用停止</p><p className="text-3xl font-bold text-red-700">{users.filter((u) => !u.isActive).length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4"><CardTitle>アカウント一覧</CardTitle><div className="relative w-full max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・メールで検索" /></div></CardHeader>
        <CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3"><button className="flex items-center gap-1 font-medium hover:text-blue-600" onClick={() => setSortKey("romaji")} title="フリガナ順に並べ替え">ユーザー{sortKey === "romaji" && <ArrowDownAZ className="h-3.5 w-3.5" />}</button></th><th className="p-3">状態</th><th className="p-3"><button className="flex items-center gap-1 font-medium hover:text-blue-600" onClick={() => setSortKey("createdAt")} title="登録日順に並べ替え">登録日{sortKey === "createdAt" && <ArrowDownWideNarrow className="h-3.5 w-3.5" />}</button></th><th className="p-3 text-right">操作</th></tr></thead><tbody>
          {filtered.map((user) => <tr key={user.uid} className="border-b last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800" onClick={() => router.push(`/admin/user-management/${user.uid}`)}><td className="p-3"><div className="font-medium">{user.displayName || "名前未設定"}</div>{(user.lastNameRomaji || user.firstNameRomaji) && <div className="text-xs text-gray-400">{`${user.lastNameRomaji ?? ""} ${user.firstNameRomaji ?? ""}`.trim()}</div>}<div className="text-gray-500">{user.email}</div></td><td className="p-3"><Badge className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{user.isActive ? "利用中" : "利用停止"}</Badge></td><td className="p-3">{new Date(user.createdAt).toLocaleDateString("ja-JP")}</td><td className="p-3" onClick={(e) => e.stopPropagation()}><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => router.push(`/admin/user-management/${user.uid}`)} title="詳細を見る"><Eye className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => resetPassword(user)} title="パスワード再設定"><KeyRound className="h-4 w-4" /></Button><Button variant="outline" size="sm" disabled={busyUid === user.uid} onClick={() => toggleActive(user)}>{user.isActive ? <><Ban className="h-4 w-4" />利用停止</> : <><CheckCircle2 className="h-4 w-4" />再開</>}</Button><Button variant="outline" size="sm" className="text-red-600" disabled={busyUid === user.uid} onClick={() => setDeleteTarget(user)}><Trash2 className="h-4 w-4" />完全削除</Button></div></td></tr>)}
        </tbody></table></div></CardContent>
      </Card>
    </div>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>ユーザーを作成</DialogTitle><DialogDescription>AuthenticationとFirestoreプロフィールを同時に作成します。</DialogDescription></DialogHeader><div className="space-y-4 py-3"><div><Label htmlFor="name">表示名</Label><Input id="name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div><div><Label htmlFor="email">メールアドレス</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div><Label htmlFor="password">初期パスワード（6文字以上）</Label><Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>キャンセル</Button><Button disabled={busyUid === "create" || !form.email || form.password.length < 6} onClick={createUser}>作成</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}><DialogContent><DialogHeader><DialogTitle>ユーザーを完全削除</DialogTitle><DialogDescription>Authentication、プロフィール、その配下の作文・学習データを削除します。この操作は取り消せません。</DialogDescription></DialogHeader><div className="rounded-lg bg-red-50 p-4 text-sm text-red-800"><strong>{deleteTarget?.displayName || deleteTarget?.email}</strong><br />{deleteTarget?.email}</div><DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>キャンセル</Button><Button variant="destructive" disabled={busyUid === deleteTarget?.uid} onClick={deleteUser}>完全削除する</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}
