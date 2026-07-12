import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { mergeFeatureAvailability } from "@/lib/prep/feature-availability";

export async function GET() {
  try {
    const snap = await adminDb.collection("appConfig").doc("featureAvailability").get();
    return NextResponse.json(mergeFeatureAvailability(snap.data()));
  } catch {
    return NextResponse.json(mergeFeatureAvailability());
  }
}
