"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Eye, EyeOff, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { isAdmin } from "@/lib/utils";
import { GUIDE_CATEGORY_LABELS, GUIDE_EXAM_LABELS, GUIDE_SKILL_LABELS, type GuideArticle, type GuideCategory, type GuideExam, type GuideSkill } from "@/lib/guides";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const blank = { id: "", title: "", summary: "", exam: "all" as GuideExam, skill: "all" as GuideSkill, category: "training" as GuideCategory, order: 900, content: "# 新しいガイド\n\nここに手順を入力します。", isPublished: false, source: "custom" as const };

export default function AdminGuidesPage() {
  const [guides, setGuides] = useState<GuideArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState<string | null>(null);

  const call = useCallback(async (url: string, init?: RequestInit) => {
    if (!auth.currentUser) throw new Error("認証が必要です。");
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "処理に失敗しました。");
    return data;
  }, []);
  const load = useCallback(async () => setGuides((await call("/api/admin/guides")).guides), [call]);

  useEffect(() => auth.onAuthStateChanged(async (user) => {
    if (!user || !isAdmin(user.email)) return;
    try { await load(); } catch (error) { alert(error instanceof Error ? error.message : "読込に失敗しました。"); } finally { setLoading(false); }
  }), [load]);

  const filtered = useMemo(() => guides.filter((guide) => `${guide.title} ${guide.summary} ${guide.exam} ${guide.skill}`.toLowerCase().includes(query.toLowerCase())), [guides, query]);

  async function createGuide() {
    try {
      setBusy("create");
      const result = await call("/api/admin/guides", { method: "POST", body: JSON.stringify(draft) });
      window.location.href = `/admin/guides/${result.id}`;
    } catch (error) { alert(error instanceof Error ? error.message : "作成に失敗しました。"); } finally { setBusy(null); }
  }
  async function toggle(guide: GuideArticle) {
    try { setBusy(guide.id); await call(`/api/admin/guides/${guide.id}`, { method: "PUT", body: JSON.stringify({ ...guide, isPublished: !guide.isPublished }) }); await load(); }
    catch (error) { alert(error instanceof Error ? error.message : "更新に失敗しました。"); } finally { setBusy(null); }
  }
  async function remove(guide: GuideArticle) {
    const action = guide.source === "seeded" ? "初期内容へ戻しますか？" : "このガイドを削除しますか？";
    if (!confirm(action)) return;
    try { setBusy(guide.id); await call(`/api/admin/guides/${guide.id}`, { method: "DELETE" }); await load(); }
    catch (error) { alert(error instanceof Error ? error.message : "削除に失敗しました。"); } finally { setBusy(null); }
  }

  if (loading) return <div className="grid min-h-screen place-items-center">Loading...</div>;
  return <main className="p-5 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">GUIDE MANAGEMENT</p><h1 className="mt-1 text-3xl font-bold">使い方ガイド管理</h1><p className="mt-2 text-sm text-slate-500">新仕様のガイド本文・スクリーンショット・公開状態を管理します。</p></div><Button onClick={() => { setDraft({ ...blank }); setCreateOpen(true); }}><Plus className="h-4 w-4"/>新規ガイド</Button></header>
    <div className="flex items-center justify-between gap-3"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ガイドを検索" className="pl-9"/></div><p className="shrink-0 text-sm text-slate-500">{filtered.length}件</p></div>
    <div className="overflow-hidden rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-900"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-800"><tr><th className="px-4 py-3">ガイド</th><th className="px-4 py-3">分類</th><th className="px-4 py-3">状態</th><th className="px-4 py-3">更新</th><th className="px-4 py-3 text-right">操作</th></tr></thead><tbody>{filtered.map((guide) => <tr key={guide.id} className="border-t dark:border-slate-700"><td className="px-4 py-3"><div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-4 w-4 text-blue-500"/><div><Link href={`/admin/guides/${guide.id}`} className="font-semibold hover:text-blue-600">{guide.title}</Link><p className="mt-1 max-w-xl text-xs text-slate-500">{guide.summary}</p><p className="mt-1 text-[11px] text-slate-400">{guide.id} · 表示順 {guide.order}</p></div></div></td><td className="px-4 py-3"><div className="flex flex-wrap gap-1"><Badge variant="outline">{GUIDE_EXAM_LABELS[guide.exam]}</Badge><Badge variant="outline">{GUIDE_SKILL_LABELS[guide.skill]}</Badge><Badge variant="secondary">{GUIDE_CATEGORY_LABELS[guide.category]}</Badge></div></td><td className="px-4 py-3"><Badge className={guide.isPublished ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>{guide.isPublished ? "公開中" : "下書き"}</Badge><p className="mt-1 text-[11px] text-slate-400">{guide.source === "seeded" ? "初期ガイド" : "追加ガイド"}</p></td><td className="px-4 py-3 text-xs text-slate-500">{guide.updatedAt ? new Date(guide.updatedAt).toLocaleString("ja-JP") : "初期版"}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Button asChild variant="outline" size="icon"><Link href={`/admin/guides/${guide.id}`} aria-label="編集"><Pencil className="h-4 w-4"/></Link></Button><Button variant="outline" size="icon" disabled={busy === guide.id} onClick={() => toggle(guide)} aria-label={guide.isPublished ? "非公開" : "公開"}>{guide.isPublished ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</Button><Button variant="outline" size="icon" disabled={busy === guide.id} onClick={() => remove(guide)} aria-label={guide.source === "seeded" ? "初期状態へ戻す" : "削除"}>{guide.source === "seeded" ? <RotateCcw className="h-4 w-4"/> : <Trash2 className="h-4 w-4"/>}</Button></div></td></tr>)}</tbody></table>{!filtered.length && <div className="py-16 text-center text-slate-500">該当するガイドはありません。</div>}</div>
  </div><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>新規ガイド</DialogTitle><DialogDescription>作成後の編集画面で本文とスクリーンショットを追加できます。</DialogDescription></DialogHeader><div className="grid gap-4"><div><Label>ID</Label><Input className="mt-1" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase() })} placeholder="例: toefl-reading-tips"/></div><div><Label>タイトル</Label><Input className="mt-1" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}/></div><div><Label>概要</Label><Textarea className="mt-1" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })}/></div><div className="grid grid-cols-3 gap-3"><SelectField label="試験" value={draft.exam} values={GUIDE_EXAM_LABELS} onChange={(value) => setDraft({ ...draft, exam: value as GuideExam })}/><SelectField label="技能" value={draft.skill} values={GUIDE_SKILL_LABELS} onChange={(value) => setDraft({ ...draft, skill: value as GuideSkill })}/><SelectField label="カテゴリ" value={draft.category} values={GUIDE_CATEGORY_LABELS} onChange={(value) => setDraft({ ...draft, category: value as GuideCategory })}/></div></div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>キャンセル</Button><Button disabled={busy === "create" || !draft.id || !draft.title} onClick={createGuide}>下書きを作成</Button></DialogFooter></DialogContent></Dialog></main>;
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: Record<string, string>; onChange: (value: string) => void }) {
  return <div><Label>{label}</Label><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">{Object.entries(values).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>;
}
