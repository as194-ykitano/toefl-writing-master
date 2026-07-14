import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase-admin";
import { getGuide, normalizeGuide } from "@/lib/guide-store";
import { getSeededGuide } from "@/lib/guides";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { id } = await context.params;
  const guide = await getGuide(id);
  if (!guide) return NextResponse.json({ error: "ガイドが見つかりません。" }, { status: 404 });
  return NextResponse.json({ guide });
}

export async function PUT(request: NextRequest, context: Context) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { id } = await context.params;
  try {
    const guide = normalizeGuide(await request.json());
    if (guide.id !== id) return NextResponse.json({ error: "編集中にIDは変更できません。" }, { status: 400 });
    if (!getSeededGuide(id) && !(await adminDb.collection("guideArticles").doc(id).get()).exists) {
      return NextResponse.json({ error: "ガイドが見つかりません。" }, { status: 404 });
    }
    await adminDb.collection("guideArticles").doc(id).set({ ...guide, updatedAt: FieldValue.serverTimestamp(), updatedBy: access.token.email }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ガイドを保存できませんでした。" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { id } = await context.params;
  await adminDb.collection("guideArticles").doc(id).delete();
  return NextResponse.json({ ok: true, resetToDefault: Boolean(getSeededGuide(id)) });
}
