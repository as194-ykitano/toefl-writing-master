"use client";

import Link from "next/link";
import { Database, ExternalLink, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cards = [
  { href: "/admin/user-management", title: "ユーザー管理", text: "アカウント作成、利用停止、完全削除を管理します。", icon: Users, color: "bg-blue-100 text-blue-700" },
  { href: "/admin/practice-sets", title: "Practice", text: "演習セットと問題、公開状態を管理します。", icon: Database, color: "bg-amber-100 text-amber-700" },
  { href: "/admin/dashboard", title: "旧ダッシュボード", text: "従来の作文タスク・権限・音声管理を開きます。", icon: ExternalLink, color: "bg-slate-200 text-slate-700" },
];

export default function NewAdminDashboard() {
  return <main className="p-5 dark:bg-slate-900 md:p-8"><div className="mx-auto max-w-6xl space-y-7">
    <div><p className="text-sm font-medium text-blue-600">ADMIN CONSOLE</p><h1 className="mt-1 text-3xl font-bold">ダッシュボード</h1><p className="mt-2 text-slate-600">ユーザーとPracticeを新しい管理画面から操作できます。</p></div>
    <div className="grid gap-5 md:grid-cols-3">{cards.map(({ href, title, text, icon: Icon, color }) => <Link key={href} href={href}><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md"><CardHeader><div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></div><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-slate-600">{text}</p></CardContent></Card></Link>)}</div>
  </div></main>;
}
