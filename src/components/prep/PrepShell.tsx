"use client";

// 学習アプリ共通シェル
// Google Classroom 風のサイドバー型レイアウト:
//   - デスクトップ: 左固定サイドバー（展開 / アイコンのみへ縮小可能）
//   - モバイル: ヘッダーのメニューボタンからドロワー表示
// 色味・ブランド感は English Gym Admin（オレンジ #ff9100）に合わせる。

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  Home,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  LucideIcon,
  Menu,
  PenLine,
  Sparkles,
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

const SIDEBAR_COLLAPSED_KEY = "prep_sidebar_collapsed_v1";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** このいずれかで始まるパスならアクティブ扱い */
  activeFor: string[];
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/home", label: "ホーム", icon: Home, activeFor: ["/home"] },
      {
        href: "/overview",
        label: "ダッシュボード",
        icon: LayoutDashboard,
        activeFor: ["/overview", "/results"],
      },
      { href: "/mock", label: "模試", icon: ClipboardCheck, activeFor: ["/mock"] },
      { href: "/review", label: "復習", icon: BookOpenCheck, activeFor: ["/review"] },
      { href: "/study-plan", label: "学習プラン", icon: CalendarDays, activeFor: ["/study-plan"] },
    ],
  },
  {
    title: "コース",
    items: [
      {
        href: "/toefl",
        label: "TOEFL",
        icon: GraduationCap,
        activeFor: ["/toefl", "/practice/toefl", "/toefl-tasks", "/toefl-dashboard", "/toefl-essays"],
      },
      {
        href: "/ielts",
        label: "IELTS",
        icon: GraduationCap,
        activeFor: ["/ielts", "/practice/ielts", "/ielts-tasks", "/ielts-dashboard", "/ielts-essays"],
      },
      {
        href: "/advanced",
        label: "Advanced",
        icon: Lightbulb,
        activeFor: ["/advanced", "/youtuber-tasks", "/youtuber-dashboard", "/youtuber-essays"],
      },
    ],
  },
  {
    title: "その他",
    items: [
      {
        href: "/training-selection",
        label: "Writing 添削（旧トップ）",
        icon: PenLine,
        activeFor: ["/training-selection"],
      },
      { href: "/profile", label: "プロフィール", icon: User, activeFor: ["/profile"] },
    ],
  },
];

interface PrepShellProps {
  children: ReactNode;
  /** 演習中など、ナビゲーションを隠したい画面では false */
  showNav?: boolean;
  /** ログイン不要で表示する場合は false（ランディング用） */
  requireAuth?: boolean;
}

function isActive(pathname: string | null, item: NavItem): boolean {
  if (!pathname) return false;
  return item.activeFor.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/home" className="flex items-center gap-2.5 min-w-0">
      <span className="w-8 h-8 rounded-lg bg-eg flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4.5 h-4.5 text-black" />
      </span>
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block font-bold text-gray-900 text-[15px] tracking-tight truncate">
            Prep Master
          </span>
          <span className="block text-[10px] text-gray-400 truncate">
            Supported by English Gym
          </span>
        </span>
      )}
    </Link>
  );
}

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.title ?? gi}>
          {group.title && !collapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {group.title}
            </div>
          )}
          {group.title && collapsed && <div className="mx-3 mb-2 border-t border-gray-100" />}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-full text-sm transition-colors ${
                    collapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-2.5"
                  } ${
                    active
                      ? "bg-eg-soft text-eg-deep font-semibold"
                      : "text-gray-600 hover:bg-gray-100 font-medium"
                  }`}
                >
                  <item.icon
                    className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-eg-dark" : "text-gray-400"}`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function PrepShell({ children, showNav = true, requireAuth = true }: PrepShellProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // localStorage が使えない環境では展開状態のまま
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, prev ? "0" : "1");
      } catch {
        // 保存できなくても動作には影響しない
      }
      return !prev;
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
    setLogoutDialogOpen(false);
    setDrawerOpen(false);
  };

  if (!showNav) {
    const bare = <div className="min-h-screen bg-[#f7f6f3]">{children}</div>;
    return requireAuth ? <ProtectedRoute>{bare}</ProtectedRoute> : bare;
  }

  const sidebarWidth = collapsed ? "lg:w-[72px]" : "lg:w-64";
  const mainPad = collapsed ? "lg:pl-[72px]" : "lg:pl-64";

  const content = (
    <div className="min-h-screen bg-[#f7f6f3]">
      {/* ヘッダー */}
      <header className="fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-gray-200/80">
        <div className="h-full px-3 sm:px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* モバイル: ドロワー開閉 / デスクトップ: サイドバー縮小切り替え */}
            <button
              className="p-2.5 rounded-full hover:bg-gray-100 text-gray-600 lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="メニューを開く"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              className="p-2.5 rounded-full hover:bg-gray-100 text-gray-600 hidden lg:inline-flex"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "サイドバーを展開" : "サイドバーを縮小"}
            >
              <Menu className="w-5 h-5" />
            </button>
            <BrandMark />
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/profile"
              className="p-2.5 rounded-full hover:bg-gray-100 text-gray-600"
              aria-label="プロフィール"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* デスクトップサイドバー */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-14 bottom-0 z-30 bg-white border-r border-gray-200/80 transition-[width] duration-200 ${sidebarWidth}`}
      >
        <NavLinks collapsed={collapsed} />
        <div className="border-t border-gray-100 p-2.5 space-y-0.5">
          {user && (
            <button
              onClick={() => setLogoutDialogOpen(true)}
              title={collapsed ? "ログアウト" : undefined}
              className={`w-full flex items-center gap-3 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors ${
                collapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-2.5"
              }`}
            >
              <LogOut className="w-[18px] h-[18px] text-gray-400 flex-shrink-0" />
              {!collapsed && <span>ログアウト</span>}
            </button>
          )}
          <button
            onClick={toggleCollapsed}
            className={`w-full flex items-center gap-3 rounded-full text-sm font-medium text-gray-400 hover:bg-gray-100 transition-colors ${
              collapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-2.5"
            }`}
            aria-label={collapsed ? "サイドバーを展開" : "サイドバーを縮小"}
          >
            {collapsed ? (
              <ChevronsRight className="w-[18px] h-[18px] flex-shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="w-[18px] h-[18px] flex-shrink-0" />
                <span>縮小する</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* モバイルドロワー */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100">
              <BrandMark />
              <button
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                onClick={() => setDrawerOpen(false)}
                aria-label="メニューを閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavLinks collapsed={false} onNavigate={() => setDrawerOpen(false)} />
            {user && (
              <div className="border-t border-gray-100 p-2.5">
                <button
                  onClick={() => setLogoutDialogOpen(true)}
                  className="w-full flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  <LogOut className="w-[18px] h-[18px] text-gray-400" />
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main className={`pt-14 transition-[padding] duration-200 ${mainPad}`}>{children}</main>

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
    </div>
  );

  if (!requireAuth) return content;
  return <ProtectedRoute>{content}</ProtectedRoute>;
}
