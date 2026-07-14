// 旧仕様（Firestore エクスポート legacy-export-*.json）の Writing 問題を
// 新仕様の prep データ形式（src/lib/prep/data/*.json）へ変換する移行スクリプト。
//
// 出力:
//   ielts-writing-sets.json         … IELTS Task 1 / Task 2（EssayWritingSet）
//   toefl-writing-essay-sets.json   … TOEFL Academic Discussion（EssayWritingSet）
//
// タイトルの自然順（Table 1, Table 2, ... / Opinion 1, Opinion 2, ...）でソートする。
//
// 実行: node scripts/migrate-legacy-writing.mjs [path-to-export.json]

import fs from "fs";
import path from "path";

const exportPath = process.argv[2] || "legacy-export-2026-07-10.json";
const raw = JSON.parse(fs.readFileSync(exportPath, "utf8"));
const tasks = (raw.collections?.tasks ?? []).filter((t) => t.status !== "hidden");

const DATA_DIR = path.join("src", "lib", "prep", "data");

// タイトルの自然順ソート（"Table 2" < "Table 10" のように数字を数値として比較）
const byTitle = (a, b) =>
  (a.title || "").localeCompare(b.title || "", undefined, { numeric: true, sensitivity: "base" });

const mapDiff = (d) =>
  ({ 初級: "easy", 中級: "medium", 上級: "hard" }[d]) ||
  (["easy", "medium", "hard"].includes(d) ? d : "medium");

const wordsOf = (t) => ({
  min: t.wordCount?.min ?? t.wordCountMin,
  target: t.wordCount?.target ?? t.wordCountTarget,
});

// undefined を除去して安定したキー順の JSON を作る
const clean = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
};

function baseEssay(t, { exam, practiceType, rubric }) {
  const { min, target } = wordsOf(t);
  return clean({
    id: `${exam}-w-${t.id}`,
    exam,
    skill: "writing",
    practiceType,
    rubric,
    title: t.title || "(無題)",
    difficulty: mapDiff(t.difficulty),
    timeLimitSec: (t.timeLimit || 20) * 60,
    promptText: t.content || t.description || t.instructions || "",
    minWords: min,
    targetWords: target,
    sampleAnswer: t.sampleAnswer,
    sampleAnswerJa: t.sampleAnswerJapanese,
  });
}

// IELTS Task 1
const task1 = tasks
  .filter((t) => t.taskType === "task1")
  .sort(byTitle)
  .map((t) => {
    const e = baseEssay(t, { exam: "ielts", practiceType: "task-1", rubric: "ielts-task1" });
    if (t.imageUrl) e.imageUrl = t.imageUrl;
    return e;
  });

// IELTS Task 2
const task2 = tasks
  .filter((t) => t.taskType === "task2")
  .sort(byTitle)
  .map((t) => baseEssay(t, { exam: "ielts", practiceType: "task-2", rubric: "ielts-task2" }));

// TOEFL Academic Discussion
const ad = tasks
  .filter((t) => t.taskType === "academic_discussion")
  .sort(byTitle)
  .map((t) => {
    const e = baseEssay(t, {
      exam: "toefl",
      practiceType: "academic-discussion",
      rubric: "toefl-academic-discussion",
    });
    const dc = t.discussionContent || {};
    e.discussion = clean({
      professor: dc.professor || "",
      student1: dc.student1 || "",
      student2: dc.student2 || "",
      question: dc.question || "",
      professorName: dc.professorName,
      student1Name: dc.student1Name,
      student2Name: dc.student2Name,
    });
    if (t.japaneseTranslation) e.promptJa = t.japaneseTranslation;
    return e;
  });

fs.writeFileSync(
  path.join(DATA_DIR, "ielts-writing-sets.json"),
  JSON.stringify([...task1, ...task2], null, 2)
);
fs.writeFileSync(
  path.join(DATA_DIR, "toefl-writing-essay-sets.json"),
  JSON.stringify(ad, null, 2)
);

const withImg = task1.filter((t) => t.imageUrl).length;
console.log("=== 移行完了 ===");
console.log(`IELTS Task 1: ${task1.length} 件（画像あり ${withImg} / ${task1.length}）`);
console.log(`IELTS Task 2: ${task2.length} 件`);
console.log(`TOEFL Academic Discussion: ${ad.length} 件（日本語訳あり ${ad.filter((a) => a.promptJa).length}）`);
