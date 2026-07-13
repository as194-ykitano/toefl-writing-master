"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";
import { auth } from "@/lib/firebase";
import { GUIDE_CATEGORY_LABELS, GUIDE_EXAM_LABELS, GUIDE_SKILL_LABELS, type GuideArticle, type GuideCategory, type GuideExam, type GuideSkill } from "@/lib/guides";
import { AdminMarkdownSplitEditor } from "@/components/admin/AdminMarkdownSplitEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function AdminGuideEditorPage() {
  const id = String(useParams<{ id: string }>().id);
  const [guide, setGuide] = useState<GuideArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const call = useCallback(async (url: string, init?: RequestInit) => { if (!auth.currentUser) throw new Error("認証が必要です。"); const token = await auth.currentUser.getIdToken(); const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "処理に失敗しました。"); return data; }, []);
  useEffect(() => auth.onAuthStateChanged(async (user) => { if (!user) return; try { setGuide((await call(`/api/admin/guides/${id}`)).guide); } catch (error) { alert(error instanceof Error ? error.message : "読込に失敗しました。"); } }), [call, id]);
  async function save() { if (!guide) return; try { setSaving(true); await call(`/api/admin/guides/${id}`, { method: "PUT", body: JSON.stringify(guide) }); setGuide((await call(`/api/admin/guides/${id}`)).guide); } catch (error) { alert(error instanceof Error ? error.message : "保存に失敗しました。"); } finally { setSaving(false); } }
  if (!guide) return <div className="grid min-h-screen place-items-center">Loading...</div>;
  return <main className="p-5 md:p-8"><div className="mx-auto max-w-7xl space-y-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/admin/guides" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4"/>ガイド一覧</Link><h1 className="text-3xl font-bold">{guide.title}</h1><p className="mt-1 text-xs text-slate-400">ID: {guide.id}</p></div><div className="flex gap-2">{guide.isPublished && <Button asChild variant="outline"><Link href={`/guides/${guide.id}`} target="_blank"><ExternalLink className="h-4 w-4"/>ユーザー画面</Link></Button>}<Button disabled={saving} onClick={save}><Save className="h-4 w-4"/>{saving ? "保存中..." : "保存"}</Button></div></header>
    <Card><CardHeader><CardTitle>基本情報</CardTitle></CardHeader><CardContent className="grid gap-5"><div><Label htmlFor="guide-title">タイトル</Label><Input id="guide-title" className="mt-1" value={guide.title} onChange={(e) => setGuide({ ...guide, title: e.target.value })}/></div><div><Label htmlFor="guide-summary">概要</Label><Textarea id="guide-summary" className="mt-1" value={guide.summary} onChange={(e) => setGuide({ ...guide, summary: e.target.value })}/></div><div className="grid gap-4 md:grid-cols-4"><SelectField label="試験" value={guide.exam} values={GUIDE_EXAM_LABELS} onChange={(value) => setGuide({ ...guide, exam: value as GuideExam })}/><SelectField label="技能" value={guide.skill} values={GUIDE_SKILL_LABELS} onChange={(value) => setGuide({ ...guide, skill: value as GuideSkill })}/><SelectField label="カテゴリ" value={guide.category} values={GUIDE_CATEGORY_LABELS} onChange={(value) => setGuide({ ...guide, category: value as GuideCategory })}/><div><Label>表示順</Label><Input className="mt-1" type="number" value={guide.order} onChange={(e) => setGuide({ ...guide, order: Number(e.target.value) })}/></div></div><div className="flex items-center justify-between rounded-lg border p-4 dark:border-slate-700"><div><p className="font-medium">ユーザーへ公開</p><p className="text-xs text-slate-500">OFFにするとAdmin以外には表示されません。</p></div><Switch checked={guide.isPublished} onCheckedChange={(checked) => setGuide({ ...guide, isPublished: checked })}/></div></CardContent></Card>
    <Card><CardHeader><CardTitle>本文・スクリーンショット</CardTitle><p className="text-sm text-slate-500">Markdownで手順を編集できます。「Upload image」またはドラッグ＆ドロップでスクリーンショットを挿入してください。</p></CardHeader><CardContent className="p-0"><AdminMarkdownSplitEditor value={guide.content} onChange={(content) => setGuide({ ...guide, content })} storagePrefix={`guide-images/${guide.id}`} height={680} emptyPreview="本文を入力してください。"/></CardContent></Card>
  </div></main>;
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: Record<string, string>; onChange: (value: string) => void }) { return <div><Label>{label}</Label><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">{Object.entries(values).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>; }
