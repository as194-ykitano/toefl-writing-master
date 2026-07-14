"use client";

// 動画コース機能（english-gym-admin から移植）向けの useAuth 互換シム。
// 移植元コンポーネントは `@/lib/auth-context` の useAuth が
//   { user, isAdmin, studentData } を返す前提で書かれている。
// Exavia 側の AuthContext は { user, loading, logout } のみなので、
// ここで isAdmin（email allowlist 判定）と studentData（Exavia にコーチ概念は無いので undefined）
// を合成して同じ形にそろえる。
import { useAuth as useBaseAuth } from "@/contexts/AuthContext";
import { isAdmin as isAdminEmail } from "@/lib/utils";

export type StudentData = {
  /** Exavia にはコーチ割当が無いため常に undefined */
  coach?: string;
};

export function useAuth() {
  const { user, loading, logout } = useBaseAuth();
  return {
    user,
    loading,
    logout,
    isAdmin: isAdminEmail(user?.email ?? null),
    studentData: undefined as StudentData | undefined,
  };
}
