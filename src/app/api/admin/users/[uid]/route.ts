import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-api";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function PATCH(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { uid } = await context.params;
  if (uid === access.token.uid) {
    return NextResponse.json({ error: "自分自身の利用状態は変更できません。" }, { status: 400 });
  }
  const { disabled } = await request.json() as { disabled?: boolean };
  if (typeof disabled !== "boolean") {
    return NextResponse.json({ error: "disabled はbooleanで指定してください。" }, { status: 400 });
  }
  await Promise.all([
    adminAuth.updateUser(uid, { disabled }),
    adminDb.collection("users").doc(uid).set({ isActive: !disabled, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
  ]);
  await adminAuth.revokeRefreshTokens(uid);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { uid } = await context.params;
  if (uid === access.token.uid) {
    return NextResponse.json({ error: "自分自身のアカウントは削除できません。" }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  await adminDb.recursiveDelete(userRef);
  await adminAuth.deleteUser(uid);
  return NextResponse.json({ ok: true });
}
