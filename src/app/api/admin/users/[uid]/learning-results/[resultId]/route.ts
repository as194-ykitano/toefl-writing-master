import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase-admin";

const STORE_BY_KIND = {
  session: "prep_sessions_v1",
  writing: "prep_writing_results_v1",
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uid: string; resultId: string }> },
) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { uid, resultId } = await context.params;
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "session" && kind !== "writing") {
    return NextResponse.json({ error: "kind は session または writing を指定してください。" }, { status: 400 });
  }
  const snap = await adminDb.collection("users").doc(uid).collection("appData").doc(STORE_BY_KIND[kind]).get();
  const rawItems = snap.data()?.items;
  const items = Array.isArray(rawItems) ? rawItems as Array<{ id?: string }> : [];
  const result = items.find((item) => item?.id === resultId);
  if (!result) return NextResponse.json({ error: "学習結果が見つかりません。" }, { status: 404 });
  return NextResponse.json({ result });
}
