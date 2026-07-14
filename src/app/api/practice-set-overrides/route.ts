import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { EXAMS, SKILLS } from "@/lib/prep/practice-set-admin";
import type { ExamId, SkillId } from "@/lib/prep/types";

export async function GET(request: NextRequest) {
  const exam = request.nextUrl.searchParams.get("exam") as ExamId | null;
  const skill = request.nextUrl.searchParams.get("skill") as SkillId | null;
  if (!exam || !skill || !EXAMS.includes(exam) || !SKILLS.includes(skill)) {
    return NextResponse.json({ error: "exam または skill が不正です。" }, { status: 400 });
  }

  const snapshot = await adminDb.collection("practiceSets")
    .where("exam", "==", exam)
    .where("skill", "==", skill)
    .get();
  const overrides = snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      sourceId: data.sourceId,
      exam: data.exam,
      skill: data.skill,
      isPublished: data.isPublished === true,
      // Draft content is not returned to the user-facing catalogue.
      data: data.isPublished === true ? data.data : undefined,
    };
  });
  return NextResponse.json({ overrides }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
