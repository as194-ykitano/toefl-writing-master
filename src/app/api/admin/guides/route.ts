import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase-admin";
import { listGuides, normalizeGuide } from "@/lib/guide-store";
import { getSeededGuide } from "@/lib/guides";

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  return NextResponse.json({ guides: await listGuides() });
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  try {
    const guide = normalizeGuide(await request.json());
    const ref = adminDb.collection("guideArticles").doc(guide.id);
    if (getSeededGuide(guide.id) || (await ref.get()).exists) {
      return NextResponse.json({ error: "同じIDのガイドがすでにあります。" }, { status: 409 });
    }
    await ref.create({ ...guide, source: "custom", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: access.token.email });
    return NextResponse.json({ id: guide.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ガイドを作成できませんでした。" }, { status: 400 });
  }
}
