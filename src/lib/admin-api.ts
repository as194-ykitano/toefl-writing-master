import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { ADMIN_EMAILS } from "@/lib/utils";

export async function requireAdmin(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "認証が必要です。" }, { status: 401 }) };
  }

  try {
    const token = await adminAuth.verifyIdToken(header.slice(7), true);
    if (!token.email || !ADMIN_EMAILS.includes(token.email)) {
      return { error: NextResponse.json({ error: "管理者権限がありません。" }, { status: 403 }) };
    }
    return { token };
  } catch {
    return { error: NextResponse.json({ error: "認証情報が無効です。" }, { status: 401 }) };
  }
}
