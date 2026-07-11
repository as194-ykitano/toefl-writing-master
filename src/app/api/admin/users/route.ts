import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-api";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const defaultPermissions = {
  toefl: true,
  toeflAcademicDiscussion: true,
  ielts: true,
  basic: false,
  youtuber: false,
};

function iso(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : undefined;
}

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;

  const [authResult, profileResult] = await Promise.all([
    adminAuth.listUsers(1000),
    adminDb.collection("users").get(),
  ]);
  const profiles = new Map(profileResult.docs.map((entry) => [entry.id, entry.data()]));
  const users = authResult.users.map((record) => {
    const profile = profiles.get(record.uid) ?? {};
    return {
      uid: record.uid,
      email: record.email ?? profile.email ?? "",
      displayName: record.displayName ?? profile.displayName ?? "",
      photoURL: record.photoURL ?? profile.photoURL ?? null,
      createdAt: iso(profile.createdAt) ?? record.metadata.creationTime,
      lastLoginAt: iso(profile.lastLoginAt) ?? record.metadata.lastSignInTime,
      trainingPermissions: profile.trainingPermissions ?? defaultPermissions,
      role: profile.role ?? "user",
      isActive: !record.disabled,
    };
  });
  users.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;

  const body = await request.json() as { email?: string; password?: string; displayName?: string };
  const email = body.email?.trim().toLowerCase();
  const displayName = body.displayName?.trim() ?? "";
  if (!email || !body.password || body.password.length < 6) {
    return NextResponse.json({ error: "メールアドレスと6文字以上のパスワードが必要です。" }, { status: 400 });
  }

  const user = await adminAuth.createUser({ email, password: body.password, displayName, disabled: false });
  try {
    await adminDb.collection("users").doc(user.uid).set({
      email,
      displayName,
      photoURL: null,
      role: "user",
      isActive: true,
      trainingPermissions: defaultPermissions,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdByAdmin: access.token.email,
    });
  } catch (error) {
    await adminAuth.deleteUser(user.uid);
    throw error;
  }
  return NextResponse.json({ uid: user.uid }, { status: 201 });
}
