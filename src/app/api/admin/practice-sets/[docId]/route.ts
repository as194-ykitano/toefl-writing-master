import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase-admin";
import { getAllStaticPracticeSets, getManagedPracticeSetAssetPaths, resolveManagedPracticeSetAssets } from "@/lib/prep/data-source";
import { normalizePracticeSet, practiceSetDocumentId } from "@/lib/prep/practice-set-admin";

type Context = { params: Promise<{ docId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { docId } = await context.params;
  const existing = await adminDb.collection("practiceSets").doc(docId).get();
  if (existing.exists && existing.data()?.data) {
    const rawData = existing.data()?.data;
    const [data, assetPaths] = await Promise.all([
      resolveManagedPracticeSetAssets(rawData),
      getManagedPracticeSetAssetPaths(rawData),
    ]);
    return NextResponse.json({ data, assetPaths, source: existing.data()?.source ?? "custom", isPublished: existing.data()?.isPublished === true });
  }
  const staticSets = await getAllStaticPracticeSets();
  const data = staticSets.find((set) => practiceSetDocumentId(set.exam, set.skill, set.id) === docId);
  if (!data) return NextResponse.json({ error: "演習セットが見つかりません。" }, { status: 404 });
  const [resolvedData, assetPaths] = await Promise.all([
    resolveManagedPracticeSetAssets(data),
    getManagedPracticeSetAssetPaths(data),
  ]);
  return NextResponse.json({ data: resolvedData, assetPaths, source: "static", isPublished: existing.exists ? existing.data()?.isPublished !== false : true });
}

export async function PUT(request: NextRequest, context: Context) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { docId } = await context.params;
  const body = await request.json() as { data?: unknown; isPublished?: boolean; source?: "static" | "custom" };
  const data = normalizePracticeSet(body.data);
  if (practiceSetDocumentId(data.exam, data.skill, data.id) !== docId) {
    return NextResponse.json({ error: "編集時に id / exam / skill は変更できません。" }, { status: 400 });
  }
  const ref = adminDb.collection("practiceSets").doc(docId);
  const existing = await ref.get();
  if (existing.exists) {
    const current = existing.data();
    if (current?.sourceId !== data.id || current?.exam !== data.exam || current?.skill !== data.skill) {
      return NextResponse.json({ error: "編集時に id / exam / skill は変更できません。" }, { status: 400 });
    }
  }
  await ref.set({
    sourceId: data.id,
    exam: data.exam,
    skill: data.skill,
    source: body.source === "custom" ? "custom" : "static",
    isPublished: body.isPublished !== false,
    data,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: access.token.email,
  }, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, context: Context) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { docId } = await context.params;
  const body = await request.json() as {
    sourceId?: string;
    exam?: string;
    skill?: string;
    source?: "static" | "custom";
    isPublished?: boolean;
  };
  if (!body.sourceId || !body.exam || !body.skill || typeof body.isPublished !== "boolean") {
    return NextResponse.json({ error: "公開状態の更新データが不正です。" }, { status: 400 });
  }
  await adminDb.collection("practiceSets").doc(docId).set({
    sourceId: body.sourceId,
    exam: body.exam,
    skill: body.skill,
    source: body.source === "custom" ? "custom" : "static",
    isPublished: body.isPublished,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: access.token.email,
  }, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: Context) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { docId } = await context.params;
  await adminDb.collection("practiceSets").doc(docId).delete();
  return NextResponse.json({ ok: true });
}
