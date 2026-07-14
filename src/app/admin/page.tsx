"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Database, Settings, Sparkles, Users, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cards = [
  { href: "/admin/user-management", eyebrow: "ACCOUNTS", title: "ユーザー管理", text: "アカウント、利用状況、アクセス権限を確認・管理します。", icon: Users, color: "bg-blue-500", glow: "from-blue-500/15" },
  { href: "/admin/practice-sets", eyebrow: "QUESTIONS", title: "問題管理", text: "試験・技能ごとの問題セットと公開状態を管理します。", icon: Database, color: "bg-amber-500", glow: "from-amber-500/15" },
  { href: "/admin/guides", eyebrow: "GUIDES", title: "使い方ガイド管理", text: "ガイドの手順、テキスト、画像・GIF、公開状態を編集します。", icon: BookOpen, color: "bg-emerald-500", glow: "from-emerald-500/15" },
  { href: "/admin/video-courses", eyebrow: "COURSES", title: "動画コース管理", text: "動画コース、モジュール、レッスンと公開状態を管理します。", icon: Video, color: "bg-violet-500", glow: "from-violet-500/15" },
  { href: "/admin/availability", eyebrow: "VISIBILITY", title: "公開設定", text: "試験・技能・問題タイプごとの公開状態をまとめて設定します。", icon: Settings, color: "bg-rose-500", glow: "from-rose-500/15" },
];

export default function NewAdminDashboard() {
  return <main className="min-h-screen bg-slate-50 p-5 dark:bg-slate-900 md:p-8 lg:p-10"><div className="mx-auto max-w-6xl space-y-8">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-950/10 sm:px-9 sm:py-10">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative max-w-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wider text-blue-200"><Sparkles className="h-3.5 w-3.5" />ADMIN CONSOLE</div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">ダッシュボード</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Exaviaのユーザー、問題、使い方ガイド、動画コース、公開設定を一か所から管理できます。</p>
      </div>
    </section>

    <section>
      <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Management</p><h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">管理メニュー</h2></div><p className="hidden text-sm text-slate-500 sm:block">編集する項目を選択してください</p></div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cards.map(({ href, eyebrow, title, text, icon: Icon, color, glow }) => <Link key={href} href={href} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"><Card className="relative h-full overflow-hidden rounded-2xl border-slate-200/80 bg-white transition duration-200 group-hover:-translate-y-1 group-hover:border-slate-300 group-hover:shadow-xl group-hover:shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900 dark:group-hover:border-slate-600 dark:group-hover:shadow-black/20"><div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${glow} via-transparent to-transparent opacity-70`} /><CardHeader className="relative flex-row items-start gap-4 space-y-0 pb-3"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-sm ${color}`}><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-[11px] font-bold tracking-[0.16em] text-slate-400">{eyebrow}</p><CardTitle className="mt-1 text-xl leading-snug">{title}</CardTitle></div><ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-200" /></CardHeader><CardContent className="relative pl-[5.5rem]"><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p></CardContent></Card></Link>)}</div>
    </section>
  </div></main>;
}
