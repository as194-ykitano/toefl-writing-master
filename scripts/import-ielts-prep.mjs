// IELTS 問題データのインポートスクリプト
//
// notion-practice-training-creation/outputs/ielts/questions/formatted-question-for-webapp
// 配下の .txt（webapp 向けフォーマット済み問題）を解析し、
// src/lib/prep/data/ 配下の静的 JSON（ReadingSet / ListeningSet 互換）へ変換する。
//
// 実行:  node scripts/import-ielts-prep.mjs [ソースディレクトリ]
//
// - テキストのみを取り込む。音声(mp3)・地図画像(png)はリポジトリに含めず、
//   後で Firebase Storage 等へアップロードできるようにソースパスを
//   scripts/ielts-assets-manifest.json に記録するだけにとどめる。
// - 既存 DB / Firestore には一切触れない（純粋なローカルファイル生成）。

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_SOURCE = path.resolve(
  __dirname,
  "../../notion-practice-training-creation/outputs/ielts/questions/formatted-question-for-webapp"
);
const SOURCE_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SOURCE;
const OUT_DIR = path.resolve(__dirname, "../src/lib/prep/data");
const MANIFEST_PATH = path.resolve(__dirname, "ielts-assets-manifest.json");

// ファイル内で「フィールド」として扱う行頭キー
const FIELD_NAMES = new Set([
  "ARTICLE",
  "ARTICLE_JA",
  "REFERENCE",
  "TAGS",
  "QUESTION_TYPE",
  "QUESTION_NUMBER",
  "MATCH_TARGET",
  "QUESTION",
  "TRUE",
  "FALSE",
  "NOT_GIVEN",
  "ANSWER",
  "EXPLANATION",
]);

const ROMAN = new Set(["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"]);

/** "FIELD: 値" 形式のフラットテキストを {name, value} の列に分解する */
function parseFields(text) {
  const records = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const m = rawLine.match(/^([A-Z_]+):\s?(.*)$/);
    if (m && FIELD_NAMES.has(m[1])) {
      if (current) records.push(current);
      current = { name: m[1], value: m[2] };
    } else if (current) {
      current.value += `\n${rawLine}`;
    }
  }
  if (current) records.push(current);
  return records.map((r) => ({ name: r.name, value: r.value.trim() }));
}

/** レコード列をファイルレベルのメタと設問ブロックに分ける */
function groupRecords(records) {
  const meta = {};
  const questions = [];
  let block = null;
  for (const rec of records) {
    if (rec.name === "QUESTION_TYPE") {
      if (block) questions.push(block);
      block = { QUESTION_TYPE: rec.value };
    } else if (block) {
      block[rec.name] = rec.value;
    } else {
      meta[rec.name] = rec.value;
    }
  }
  if (block) questions.push(block);
  return { meta, questions };
}

/** 設問文中の選択肢ラベル（A: / i: など）を抽出する */
function extractOptionLabels(prompt) {
  const labels = [];
  for (const line of prompt.split("\n")) {
    const m = line.match(/^([A-Za-z]{1,4})[.:)]\s+\S/);
    if (!m) continue;
    const label = m[1];
    const isLetter = /^[A-J]$/.test(label);
    const isRoman = ROMAN.has(label.toLowerCase());
    if ((isLetter || isRoman) && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

/** 1 設問を PracticeQuestion 互換オブジェクトへ変換 */
function buildQuestion(block, index, setId, typeSlug) {
  const prompt = (block.QUESTION ?? "").trim();
  const answerRaw = (block.ANSWER ?? "").trim();
  const number = Number.parseInt(block.QUESTION_NUMBER ?? `${index + 1}`, 10) || index + 1;
  const base = {
    id: `${setId}-q${number}`,
    number,
    prompt,
    reference: block.MATCH_TARGET || undefined,
    explanation: (block.EXPLANATION ?? "").trim(),
    skillTag: typeSlug,
  };

  const upper = answerRaw.toUpperCase();

  // TFNG / YNNG（mcq 形式・exact_answer 形式の両方に対応）
  if (["TRUE", "FALSE", "NOT GIVEN"].includes(upper) && !typeSlug.includes("ynng")) {
    return { ...base, type: "true_false_notgiven", options: ["TRUE", "FALSE", "NOT GIVEN"], answer: upper };
  }
  if (["YES", "NO", "NOT GIVEN"].includes(upper)) {
    return { ...base, type: "true_false_notgiven", options: ["YES", "NO", "NOT GIVEN"], answer: upper };
  }

  // 選択肢ラベル形式（マッチング・多肢選択）
  const labels = extractOptionLabels(prompt);
  if (labels.length >= 3) {
    const parts = answerRaw.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
    const allInLabels = parts.length > 0 && parts.every((p) => labels.includes(p));
    if (allInLabels && parts.length > 1) {
      return { ...base, type: "multi_select", options: labels, answer: parts };
    }
    if (allInLabels) {
      return { ...base, type: "matching", matchTargets: labels, answer: answerRaw };
    }
  }

  // それ以外は記述式（穴埋め・短答）
  return { ...base, type: "gap_fill", answer: answerRaw };
}

/** ARTICLE を段落配列へ（[A] 形式のラベルがあれば分割） */
function buildParagraphs(article) {
  const lines = article.split("\n");
  const paragraphs = [];
  let label;
  let buffer = [];
  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) paragraphs.push(label ? { label, text } : { text });
    buffer = [];
  };
  for (const line of lines) {
    const m = line.trim().match(/^\[([A-Z])\]$/);
    if (m) {
      flush();
      label = m[1];
    } else {
      buffer.push(line);
    }
  }
  flush();
  if (paragraphs.length === 0) paragraphs.push({ text: article.trim() });
  return paragraphs;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/^\d{8}(-\d{6})?-/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ")
    .replace(/\b(And|Of|The|To|For|From|In|On|A|An)\b/g, (m) => m.toLowerCase());
}

/** "Type2 - matching-headings" → { order: 2, slug: "matching-headings" } */
function parseTypeDir(dirName) {
  const m = dirName.match(/^Type(\d+)\s*-\s*(.+)$/);
  if (!m) return null;
  return { order: Number(m[1]), slug: m[2].trim() };
}

async function collectTxtFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectTxtFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".txt")) out.push(full);
  }
  return out;
}

async function collectAssets(dir) {
  const out = { audio: [], images: [] };
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectAssets(full);
      out.audio.push(...nested.audio);
      out.images.push(...nested.images);
    } else if (entry.name.endsWith(".mp3")) out.audio.push(full);
    else if (entry.name.endsWith(".png")) out.images.push(full);
  }
  return out;
}

async function importSkill(skill, sourceDir) {
  const sets = [];
  const manifest = [];
  const typeDirs = (await fs.readdir(sourceDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  for (const typeDir of typeDirs) {
    const typeInfo = parseTypeDir(typeDir);
    if (!typeInfo) continue;
    const typePath = path.join(sourceDir, typeDir);
    const files = (await collectTxtFiles(typePath)).sort();

    for (const file of files) {
      const text = await fs.readFile(file, "utf8");
      const { meta, questions } = groupRecords(parseFields(text));
      if (!meta.ARTICLE || questions.length === 0) continue;

      const fileSlug = slugify(path.basename(file, ".txt").replace(/^type\d+-?/, ""));
      const setId = `ielts-${skill === "reading" ? "r" : "l"}-${typeInfo.slug}-${fileSlug}`.slice(0, 96);
      const builtQuestions = questions.map((q, i) => buildQuestion(q, i, setId, typeInfo.slug));

      const base = {
        id: setId,
        exam: "ielts",
        skill,
        practiceType: typeInfo.slug,
        title: titleFromSlug(fileSlug),
        difficulty: "medium",
        questions: builtQuestions,
      };

      // 日本語訳（プレースホルダの「あとで入れる」は除外）
      const articleJa =
        meta.ARTICLE_JA && !/^あとで入れる/.test(meta.ARTICLE_JA.trim()) ? meta.ARTICLE_JA.trim() : "";

      if (skill === "reading") {
        sets.push({
          ...base,
          timeLimitSec: builtQuestions.length * 90,
          passageTitle: titleFromSlug(fileSlug),
          paragraphs: buildParagraphs(meta.ARTICLE),
          translationJa: articleJa || undefined,
        });
      } else {
        // リスニング: 音声は未アップロードのためスクリプト表示にフォールバック
        const runDir = path.dirname(path.dirname(file));
        const assets = await collectAssets(runDir).catch(() => ({ audio: [], images: [] }));
        manifest.push({
          setId,
          type: typeInfo.slug,
          sourceTxt: path.relative(SOURCE_ROOT, file),
          audio: (assets?.audio ?? []).map((p) => path.relative(SOURCE_ROOT, p)),
          images: (assets?.images ?? []).map((p) => path.relative(SOURCE_ROOT, p)),
        });
        sets.push({
          ...base,
          timeLimitSec: 300 + builtQuestions.length * 60,
          transcript: meta.ARTICLE,
          transcriptJa: articleJa || undefined,
          referenceText: meta.REFERENCE || undefined,
          playLimitInTest: 1,
        });
      }
    }
  }
  return { sets, manifest };
}

async function main() {
  const readingDir = path.join(SOURCE_ROOT, "IELTS Reading");
  const listeningDir = path.join(SOURCE_ROOT, "IELTS Listening");

  await fs.mkdir(OUT_DIR, { recursive: true });

  const reading = await importSkill("reading", readingDir);
  const listening = await importSkill("listening", listeningDir);

  await fs.writeFile(
    path.join(OUT_DIR, "ielts-reading-sets.json"),
    JSON.stringify(reading.sets, null, 1),
    "utf8"
  );
  await fs.writeFile(
    path.join(OUT_DIR, "ielts-listening-sets.json"),
    JSON.stringify(listening.sets, null, 1),
    "utf8"
  );
  await fs.writeFile(
    MANIFEST_PATH,
    JSON.stringify({ sourceRoot: SOURCE_ROOT, listening: listening.manifest }, null, 1),
    "utf8"
  );

  const count = (sets) => sets.reduce((a, s) => a + s.questions.length, 0);
  console.log(`Reading:   ${reading.sets.length} sets / ${count(reading.sets)} questions`);
  console.log(`Listening: ${listening.sets.length} sets / ${count(listening.sets)} questions`);
  const typeCounts = {};
  for (const s of [...reading.sets, ...listening.sets]) {
    const key = `${s.skill}/${s.practiceType}`;
    typeCounts[key] = (typeCounts[key] ?? 0) + 1;
  }
  console.log(typeCounts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
