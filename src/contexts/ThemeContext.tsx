"use client";

// ライト / ダークテーマの管理。
// - `documentElement`（<html>）に `dark` クラスを付け外しして切替（globals.css の `.dark` が効く）
// - 選択は localStorage に永続化。未設定時はダークモードを使用
// - 初回ロードのちらつき（FOUC）は layout.tsx の <head> インラインスクリプトで先回りして防ぐ

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "prep_theme_v1";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** <html> の class と localStorage を実際に更新する */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 保存できなくても動作には影響しない
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 初期値は layout の先読みスクリプトが付けた <html class="dark"> を尊重する。
  // SSR との不一致を避けるため、実際の同期は useEffect（マウント後）で行う。
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setThemeState(isDark ? "dark" : "light");
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Provider 外でも落とさない（既定はダーク）
    return { theme: "dark", setTheme: () => {}, toggleTheme: () => {} };
  }
  return ctx;
}
