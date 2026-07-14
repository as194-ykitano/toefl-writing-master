import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase-admin";
import { getAllStaticPracticeSets, type ManagedPracticeSet } from "@/lib/prep/data-source";
import { normalizePracticeSet, practiceSetDocumentId } from "@/lib/prep/practice-set-admin";
import type { ExamId, SkillId } from "@/lib/prep/types";

type OverrideData = {
  sourceId: string;
  exam: ExamId;
  skill: SkillId;
  source: "static" | "custom";
  isPublished: boolean;
  data?: ManagedPracticeSet;
  updatedAt?: Timestamp;
};

export async function GET(request: NextRequest) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;

  const [staticSets, overrideSnapshot] = await Promise.all([
    getAllStaticPracticeSets(),
    adminDb.collection("practiceSets").get(),
  ]);
  const records = new Map<string, Record<string, unknown>>();
  for (const data of staticSets) {
    const docId = practiceSetDocumentId(data.exam, data.skill, data.id);
    records.set(`${data.exam}:${data.skill}:${data.id}`, {
      docId,
      sourceId: data.id,
      exam: data.exam,
      skill: data.skill,
      source: "static",
      isPublished: true,
      data,
      updatedAt: null,
    });
  }
  for (const entry of overrideSnapshot.docs) {
    const override = entry.data() as OverrideData;
    if (!override.sourceId || !override.exam || !override.skill) continue;
    const key = `${override.exam}:${override.skill}:${override.sourceId}`;
    const base = records.get(key);
    records.set(key, {
      docId: entry.id,
      sourceId: override.sourceId,
      exam: override.exam,
      skill: override.skill,
      source: override.source ?? (base ? "static" : "custom"),
      isPublished: override.isPublished !== false,
      data: override.data ?? base?.data,
      updatedAt: override.updatedAt?.toDate().toISOString() ?? null,
    });
  }
  const result = [...records.values()].sort((a, b) => {
    const aData = a.data as ManagedPracticeSet;
    const bData = b.data as ManagedPracticeSet;
    return `${a.exam}-${a.skill}-${aData?.title ?? a.sourceId}`.localeCompare(
      `${b.exam}-${b.skill}-${bData?.title ?? b.sourceId}`
    );
  }).map((record) => {
    const { data, ...metadata } = record;
    const set = data as Record<string, unknown> | undefined;
    const contents = Array.isArray(set?.questions) ? set.questions
      : Array.isArray(set?.tasks) ? set.tasks
      : Array.isArray(set?.items) ? set.items
      : [];
    return {
      ...metadata,
      title: set?.title ?? record.sourceId,
      practiceType: set?.practiceType ?? "",
      difficulty: set?.difficulty ?? "",
      part: set?.part ?? (typeof set?.practiceType === "string" ? set.practiceType : ""),
      itemCount: contents.length,
    };
  });
  return NextResponse.json({ practiceSets: result });
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request);
  if (access.error) return access.error;
  const body = await request.json() as { data?: unknown; isPublished?: boolean };
  const data = normalizePracticeSet(body.data);
  const docId = practiceSetDocumentId(data.exam, data.skill, data.id);
  const ref = adminDb.collection("practiceSets").doc(docId);
  if ((await ref.get()).exists) {
    return NextResponse.json({ error: "同じIDの演習セットがすでに存在します。" }, { status: 409 });
  }
  const staticSets = await getAllStaticPracticeSets();
  if (staticSets.some((set) => set.id === data.id && set.exam === data.exam && set.skill === data.skill)) {
    return NextResponse.json({ error: "既存JSONと同じIDです。編集操作を使用してください。" }, { status: 409 });
  }
  await ref.create({
    sourceId: data.id,
    exam: data.exam,
    skill: data.skill,
    source: "custom",
    isPublished: body.isPublished === true,
    data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: access.token.email,
  });
  return NextResponse.json({ docId }, { status: 201 });
}
