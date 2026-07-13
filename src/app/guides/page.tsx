"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { useExam } from "@/contexts/ExamContext";
import { GUIDE_CATEGORY_LABELS, GUIDE_EXAM_LABELS, GUIDE_SKILL_LABELS, type GuideArticle, type GuideExam } from "@/lib/guides";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function GuidesPage() {
  const { exam: selectedExam } = useExam();
  const initialExam = (["toefl", "ielts", "toeic"] as string[]).includes(selectedExam) ? selectedExam as GuideExam : "all";
  const [guides, setGuides] = useState<GuideArticle[]>([]);
  const [exam, setExam] = useState<GuideExam>(initialExam);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/guides").then((response) => response.json()).then((data) => setGuides(data.guides ?? [])).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => guides.filter((guide) => (exam === "all" || guide.exam === "all" || guide.exam === exam) && `${guide.title} ${guide.summary} ${GUIDE_CATEGORY_LABELS[guide.category]}`.toLowerCase().includes(query.toLowerCase())), [exam, guides, query]);
  const grouped = useMemo(() => Object.entries(GUIDE_CATEGORY_LABELS).map(([id, label]) => ({ id, label, guides: filtered.filter((guide) => guide.category === id) })).filter((group) => group.guides.length), [filtered]);
  return <PrepShell><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10"><header className="mb-8"><div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-eg-soft text-eg-dark"><BookOpen className="h-6 w-6"/></div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">使い方ガイド</h1><p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">新しいトレーニング、模試、学習データの見方を試験・技能ごとに確認できます。</p></header>
    <div className="mb-8 flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap gap-2">{(Object.keys(GUIDE_EXAM_LABELS) as GuideExam[]).map((id) => <button key={id} onClick={() => setExam(id)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${exam === id ? "bg-eg text-black" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}>{id === "all" ? "すべて" : GUIDE_EXAM_LABELS[id]}</button>)}</div><div className="relative w-full md:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ガイドを検索" className="pl-9"/></div></div>
    {loading ? <div className="py-20 text-center text-slate-500">Loading...</div> : <div className="space-y-10">{grouped.map((group) => <section key={group.id}><h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{group.label}</h2><div className="grid gap-4 md:grid-cols-2">{group.guides.map((guide) => <Link key={guide.id} href={`/guides/${guide.id}`} className="group flex min-h-40 flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-eg hover:shadow-md dark:border-slate-700 dark:bg-slate-900"><div className="mb-3 flex flex-wrap gap-2"><Badge variant="outline">{GUIDE_EXAM_LABELS[guide.exam]}</Badge><Badge variant="secondary">{GUIDE_SKILL_LABELS[guide.skill]}</Badge></div><h3 className="text-lg font-bold text-slate-900 group-hover:text-eg-dark dark:text-white">{guide.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{guide.summary}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-eg-dark">ガイドを読む<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span></Link>)}</div></section>)}{!grouped.length && <div className="rounded-2xl border border-dashed py-20 text-center text-slate-500">該当するガイドはありません。</div>}</div>}
  </main></PrepShell>;
}
