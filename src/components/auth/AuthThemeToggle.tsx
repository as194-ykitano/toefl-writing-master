"use client";

// 認証まわりの画面（ログイン / サインアップ / オンボーディング / ランディング）で
// 右上に固定表示するライト⇄ダーク切替ボタン。PrepShell の外でも使える。

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function AuthThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "ライトモードに切替" : "ダークモードに切替";

  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="fixed top-4 right-4 z-50 inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur text-gray-500 dark:text-gray-300 shadow-sm transition-all hover:scale-105 hover:shadow-md active:scale-95"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
