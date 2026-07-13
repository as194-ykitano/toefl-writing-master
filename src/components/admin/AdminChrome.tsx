"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Database, ExternalLink, Home, LayoutDashboard, Moon, Settings, ShieldCheck, Sun, Users, Video } from "lucide-react";
import { auth } from "@/lib/firebase";
import { isAdmin } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

const legacyPrefixes = [
  "/admin/dashboard", "/admin/users", "/admin/tasks", "/admin/ielts-task-create",
  "/admin/toefl-academic-discussion-create", "/admin/audio-upload",
];

const links = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/user-management", label: "ユーザー管理", icon: Users },
  { href: "/admin/practice-sets", label: "Practice", icon: Database },
  { href: "/admin/guides", label: "使い方ガイド", icon: BookOpen },
  { href: "/admin/video-courses", label: "動画コース", icon: Video },
  { href: "/admin/availability", label: "公開設定", icon: Settings },
];

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isLegacy = legacyPrefixes.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (isLegacy) { setReady(true); return; }
    return auth.onAuthStateChanged((user) => {
    if (!user) return router.replace("/login");
    if (!isAdmin(user.email)) return router.replace("/");
    setReady(true);
    });
  }, [isLegacy, router]);

  if (isLegacy) return children;

  if (!ready) return <div className="grid min-h-screen place-items-center bg-slate-50">Loading...</div>;

  return <div className="admin-console min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-800 bg-slate-950 text-slate-100 lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600"><ShieldCheck className="h-5 w-5" /></div>
        <div><p className="font-semibold">Prep Master</p><p className="text-xs text-slate-400">Admin Console</p></div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Management</p>
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-900 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</Link>;
        })}
        <p className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Legacy</p>
        <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-900 hover:text-white"><ExternalLink className="h-4 w-4" />旧ダッシュボード</Link>
        <p className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500">User App</p>
        <Link href="/home" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-900 hover:text-white"><Home className="h-4 w-4" />ユーザー画面へ</Link>
      </nav>
      <div className="border-t border-slate-800 p-3"><button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-900 hover:text-white">{theme === "dark" ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}{theme === "dark" ? "ライトモード" : "ダークモード"}</button></div>
    </aside>
    <div className="lg:pl-64"><div className="min-h-screen">{children}</div></div>
  </div>;
}
