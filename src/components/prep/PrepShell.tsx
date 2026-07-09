"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Sparkle,
  User,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ハンバーガーメニュー内の全リンク
const MENU_ITEMS = [
  { href: "/home", label: "ホーム" },
  { href: "/overview", label: "ダッシュボード" },
  { href: "/toefl", label: "TOEFL" },
  { href: "/ielts", label: "IELTS" },
  { href: "/advanced", label: "Advanced" },
  { href: "/review", label: "復習" },
  { href: "/study-plan", label: "学習プラン" },
  { href: "/training-selection", label: "Writing 添削（旧トップ）" },
];

// 下部タブナビゲーション
const TAB_ITEMS = [
  {
    href: "/home",
    label: "学習",
    icon: GraduationCap,
    // 学習系ページはすべて「学習」タブをアクティブに
    activeFor: ["/home", "/toefl", "/ielts", "/advanced", "/practice"],
  },
  { href: "/overview", label: "ダッシュボード", icon: LayoutDashboard, activeFor: ["/overview", "/results"] },
  { href: "/review", label: "復習", icon: BookOpenCheck, activeFor: ["/review"] },
  { href: "/study-plan", label: "プラン", icon: CalendarDays, activeFor: ["/study-plan"] },
];

interface PrepShellProps {
  children: ReactNode;
  /** 演習中など、ナビゲーションを隠したい画面では false */
  showNav?: boolean;
  /** ログイン不要で表示する場合は false（ランディング用） */
  requireAuth?: boolean;
}

function ShellHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
    setLogoutDialogOpen(false);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/home" className="flex items-center gap-2">
          <Sparkle className="w-6 h-6 text-blue-600 fill-blue-600" />
          <span className="font-bold text-gray-900 text-lg tracking-tight">Prep Master</span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/profile"
            className="p-2.5 rounded-lg hover:bg-gray-50 text-gray-700"
            aria-label="プロフィール"
          >
            <User className="w-5 h-5" />
          </Link>
          <button
            className="p-2.5 rounded-lg hover:bg-gray-50 text-gray-700"
            onClick={() => setMenuOpen(true)}
            aria-label="メニューを開く"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <div className="ml-auto w-72 bg-white h-full shadow-xl p-6 relative flex flex-col">
            <button className="absolute top-4 right-4 p-2" onClick={() => setMenuOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <div className="mt-10 space-y-1">
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-gray-100 space-y-1">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  プロフィール編集
                </Link>
                {user && (
                  <button
                    onClick={() => setLogoutDialogOpen(true)}
                    className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    ログアウト
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ログアウトの確認</DialogTitle>
            <DialogDescription>ログアウトしてもよろしいですか？</DialogDescription>
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
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100">
      <div className="max-w-5xl mx-auto flex">
        {TAB_ITEMS.map((tab) => {
          const active = tab.activeFor.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function PrepShell({ children, showNav = true, requireAuth = true }: PrepShellProps) {
  const content = (
    <div className="min-h-screen bg-[#f2f3f6]">
      {showNav && <ShellHeader />}
      <main className={showNav ? "pb-24" : ""}>{children}</main>
      {showNav && <BottomNav />}
    </div>
  );

  if (!requireAuth) return content;
  return <ProtectedRoute>{content}</ProtectedRoute>;
}
