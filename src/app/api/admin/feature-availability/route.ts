import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase-admin";
import { mergeFeatureAvailability } from "@/lib/prep/feature-availability";

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const snap = await adminDb.collection("appConfig").doc("featureAvailability").get();
  return NextResponse.json(mergeFeatureAvailability(snap.data()));
}

export async function PUT(request: NextRequest) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const value = mergeFeatureAvailability(await request.json());
  await adminDb.collection("appConfig").doc("featureAvailability").set({
    ...value,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: access.token.email,
  });
  return NextResponse.json(value);
}
