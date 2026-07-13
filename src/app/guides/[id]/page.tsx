"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import PrepShell from "@/components/prep/PrepShell";
import { GuideMarkdown } from "@/components/guides/GuideMarkdown";
import { GUIDE_CATEGORY_LABELS, GUIDE_EXAM_LABELS, GUIDE_SKILL_LABELS, type GuideArticle } from "@/lib/guides";
import { Badge } from "@/components/ui/badge";

export default function GuideDetailPage() {
  const id = String(useParams<{ id: string }>().id);
  const [guide, setGuide] = useState<GuideArticle | null>(null);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => { fetch(`/api/guides?id=${encodeURIComponent(id)}`).then(async (response) => { if (!response.ok) throw new Error(); setGuide((await response.json()).guide); }).catch(() => setNotFound(true)); }, [id]);
  return <PrepShell><main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10"><Link href="/guides" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-eg-dark"><ArrowLeft className="h-4 w-4"/>ガイド一覧へ</Link>{notFound ? <div className="rounded-2xl border border-dashed py-20 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-400"/><h1 className="text-xl font-bold">ガイドが見つかりません</h1><p className="mt-2 text-sm text-slate-500">非公開または削除された可能性があります。</p></div> : !guide ? <div className="py-20 text-center text-slate-500">Loading...</div> : <article className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"><header className="border-b bg-slate-50/70 px-6 py-6 dark:border-slate-700 dark:bg-slate-800/60"><div className="mb-3 flex flex-wrap gap-2"><Badge variant="outline">{GUIDE_EXAM_LABELS[guide.exam]}</Badge><Badge variant="outline">{GUIDE_SKILL_LABELS[guide.skill]}</Badge><Badge variant="secondary">{GUIDE_CATEGORY_LABELS[guide.category]}</Badge></div><p className="leading-7 text-slate-600 dark:text-slate-300">{guide.summary}</p></header><div className="px-6 py-6 sm:px-10 sm:py-8"><GuideMarkdown content={guide.content}/></div></article>}</main></PrepShell>;
}
