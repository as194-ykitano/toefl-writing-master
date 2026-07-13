import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-api";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const ESSAY_COLLECTIONS = ["essays", "basicEssays", "youTuberEssays"] as const;

type EssayRow = { id: string; collection: string; examType: string; [key: string]: unknown };

/** Firestore の Timestamp を再帰的に ISO 文字列へ変換する。 */
function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

/** エッセイの提出試験タイプを判定する。 */
function essayExamType(collection: string, data: Record<string, unknown>): string {
  if (collection === "basicEssays") return "Basic";
  if (collection === "youTuberEssays") return "YouTube";
  if (data.taskType === "academic_discussion") return "TOEFL Academic";
  if (data.taskType === "task1" || data.taskType === "task2") return "IELTS";
  if (data.type === "integrated") return "TOEFL Integrated";
  return "TOEFL";
}

export async function GET(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { uid } = await context.params;

  let authRecord;
  try {
    authRecord = await adminAuth.getUser(uid);
  } catch {
    return NextResponse.json({ error: "ユーザーが見つかりません。" }, { status: 404 });
  }

  const profileSnap = await adminDb.collection("users").doc(uid).get();
  const profile = (serialize(profileSnap.data() ?? {}) ?? {}) as Record<string, unknown>;

  const essaySnaps = await Promise.all(
    ESSAY_COLLECTIONS.map((name) => adminDb.collection("users").doc(uid).collection(name).get()),
  );
  const essays: EssayRow[] = essaySnaps.flatMap((snap, index) =>
    snap.docs.map((doc): EssayRow => {
      const data = serialize(doc.data()) as Record<string, unknown>;
      return {
        ...data,
        id: doc.id,
        collection: ESSAY_COLLECTIONS[index],
        examType: essayExamType(ESSAY_COLLECTIONS[index], data),
      };
    }),
  );
  essays.sort((a, b) => {
    const da = typeof a.submittedAt === "string" ? Date.parse(a.submittedAt) : 0;
    const db = typeof b.submittedAt === "string" ? Date.parse(b.submittedAt) : 0;
    return db - da;
  });

  const scores = essays.map((e) => e.score).filter((s): s is number => typeof s === "number");
  const stats = {
    totalEssays: essays.length,
    feedbackCompleted: essays.filter((e) => e.status === "feedback_completed").length,
    averageScore: scores.length ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10 : null,
    totalWords: essays.reduce((sum, e) => sum + (typeof e.wordCount === "number" ? e.wordCount : 0), 0),
    byExamType: essays.reduce<Record<string, number>>((acc, e) => {
      acc[e.examType] = (acc[e.examType] ?? 0) + 1;
      return acc;
    }, {}),
    lastSubmission: essays.length && typeof essays[0].submittedAt === "string" ? essays[0].submittedAt : null,
  };

  return NextResponse.json({
    user: {
      uid: authRecord.uid,
      email: authRecord.email ?? (profile.email as string) ?? "",
      displayName: authRecord.displayName ?? (profile.displayName as string) ?? "",
      lastNameRomaji: (profile.lastNameRomaji as string) ?? "",
      firstNameRomaji: (profile.firstNameRomaji as string) ?? "",
      photoURL: authRecord.photoURL ?? (profile.photoURL as string) ?? null,
      isActive: !authRecord.disabled,
      role: (profile.role as string) ?? "user",
      createdAt: (profile.createdAt as string) ?? authRecord.metadata.creationTime,
      lastLoginAt: (profile.lastLoginAt as string) ?? authRecord.metadata.lastSignInTime,
      trainingPermissions: profile.trainingPermissions ?? null,
      onboarding: profile.onboarding ?? null,
      learningGoals: profile.learningGoals ?? null,
      progress: profile.progress ?? null,
      studySessions: profile.studySessions ?? [],
      totalStudyTime: profile.totalStudyTime ?? 0,
      reminder: profile.reminder ?? null,
    },
    essays,
    stats,
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const { uid } = await context.params;
  const body = await request.json() as {
    disabled?: boolean;
    trainingPermissions?: Record<string, boolean>;
    displayName?: string;
  };

  // トレーニング権限・表示名の更新（自分自身にも許可）
  if (body.trainingPermissions || typeof body.displayName === "string") {
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (body.trainingPermissions) update.trainingPermissions = body.trainingPermissions;
    if (typeof body.displayName === "string") update.displayName = body.displayName.trim();
    await adminDb.collection("users").doc(uid).set(update, { merge: true });
    if (typeof body.displayName === "string") {
      await adminAuth.updateUser(uid, { displayName: body.displayName.trim() });
    }
    return NextResponse.json({ ok: true });
  }

  // 利用状態（有効／停止）の切り替え
  if (uid === access.token.uid) {
    return NextResponse.json({ error: "自分自身の利用状態は変更できません。" }, { status: 400 });
  }
  if (typeof body.disabled !== "boolean") {
    return NextResponse.json({ error: "disabled はbooleanで指定してください。" }, { status: 400 });
  }
  await Promise.all([
    adminAuth.updateUser(uid, { disabled: body.disabled }),
    adminDb.collection("users").doc(uid).set({ isActive: !body.disabled, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
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
