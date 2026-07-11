import type { ExamId, SkillId } from "./types";
import type { ManagedPracticeSet } from "./data-source";

export const EXAMS: ExamId[] = ["toefl", "ielts", "toeic"];
export const SKILLS: SkillId[] = ["reading", "listening", "speaking", "writing"];

export function practiceSetDocumentId(exam: ExamId, skill: SkillId, sourceId: string): string {
  return Buffer.from(`${exam}:${skill}:${sourceId}`, "utf8").toString("base64url");
}

export function normalizePracticeSet(input: unknown): ManagedPracticeSet {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("演習セットのJSONはオブジェクトで指定してください。");
  }
  const data = input as Record<string, unknown>;
  if (typeof data.id !== "string" || !data.id.trim()) throw new Error("id は必須です。");
  if (!EXAMS.includes(data.exam as ExamId)) throw new Error("exam が不正です。");
  if (!SKILLS.includes(data.skill as SkillId)) throw new Error("skill が不正です。");
  if (typeof data.title !== "string" || !data.title.trim()) throw new Error("title は必須です。");
  if (typeof data.difficulty !== "string" || !["easy", "medium", "hard"].includes(data.difficulty)) {
    throw new Error("difficulty は easy / medium / hard のいずれかです。");
  }

  const skill = data.skill as SkillId;
  if (data.exam === "toeic" && (skill === "speaking" || skill === "writing")) {
    throw new Error("現在のTOEICは Reading / Listening のみ対応しています。");
  }
  if ((skill === "reading" || skill === "listening") && !Array.isArray(data.questions)) {
    throw new Error(`${skill} には questions 配列が必要です。`);
  }
  if (skill === "speaking" && !Array.isArray(data.tasks)) {
    throw new Error("speaking には tasks 配列が必要です。");
  }
  return JSON.parse(JSON.stringify(data)) as ManagedPracticeSet;
}
