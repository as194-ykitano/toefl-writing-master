import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  SEEDED_GUIDES,
  type GuideArticle,
  type GuideCategory,
  type GuideExam,
  type GuideSkill,
} from "@/lib/guides";

type StoredGuide = Partial<Omit<GuideArticle, "updatedAt">> & { updatedAt?: Timestamp };

function fromStored(id: string, data: StoredGuide, fallback?: GuideArticle): GuideArticle {
  return {
    id,
    title: data.title ?? fallback?.title ?? "Untitled guide",
    summary: data.summary ?? fallback?.summary ?? "",
    exam: data.exam ?? fallback?.exam ?? "all",
    skill: data.skill ?? fallback?.skill ?? "all",
    category: data.category ?? fallback?.category ?? "start",
    content: data.content ?? fallback?.content ?? "",
    order: Number.isFinite(data.order) ? Number(data.order) : (fallback?.order ?? 9999),
    isPublished: data.isPublished ?? fallback?.isPublished ?? false,
    source: data.source ?? fallback?.source ?? "custom",
    updatedAt: data.updatedAt?.toDate().toISOString() ?? fallback?.updatedAt ?? null,
  };
}

export async function listGuides(): Promise<GuideArticle[]> {
  const records = new Map<string, GuideArticle>();
  for (const guide of SEEDED_GUIDES) records.set(guide.id, { ...guide, source: "seeded", updatedAt: null });
  const snapshot = await adminDb.collection("guideArticles").get();
  for (const document of snapshot.docs) {
    const fallback = records.get(document.id);
    records.set(document.id, fromStored(document.id, document.data() as StoredGuide, fallback));
  }
  return [...records.values()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "ja"));
}

export async function getGuide(id: string): Promise<GuideArticle | null> {
  const seeded = SEEDED_GUIDES.find((guide) => guide.id === id);
  const fallback = seeded ? ({ ...seeded, source: "seeded", updatedAt: null } satisfies GuideArticle) : undefined;
  const document = await adminDb.collection("guideArticles").doc(id).get();
  if (document.exists) return fromStored(id, document.data() as StoredGuide, fallback);
  return fallback ?? null;
}

const exams: GuideExam[] = ["all", "toefl", "ielts", "toeic"];
const skills: GuideSkill[] = ["all", "reading", "listening", "speaking", "writing"];
const categories: GuideCategory[] = ["start", "training", "mock-test", "learning-data", "content"];

export function normalizeGuide(value: unknown): Omit<GuideArticle, "updatedAt"> {
  if (!value || typeof value !== "object") throw new Error("ガイド情報が不正です。");
  const data = value as Record<string, unknown>;
  const id = String(data.id ?? "").trim().toLowerCase();
  const title = String(data.title ?? "").trim();
  const exam = String(data.exam ?? "all") as GuideExam;
  const skill = String(data.skill ?? "all") as GuideSkill;
  const category = String(data.category ?? "start") as GuideCategory;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("IDは半角英小文字・数字・ハイフンで入力してください。");
  if (!title) throw new Error("タイトルは必須です。");
  if (!exams.includes(exam) || !skills.includes(skill) || !categories.includes(category)) throw new Error("分類が不正です。");
  return {
    id,
    title,
    summary: String(data.summary ?? "").trim(),
    exam,
    skill,
    category,
    content: String(data.content ?? ""),
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 9999,
    isPublished: data.isPublished === true,
    source: data.source === "seeded" ? "seeded" : "custom",
  };
}
