// IELTS Speaking 問題データのインポートスクリプト
//
// Notion データソース（Part1 / Part2 / Part3 / 全体）から Speaking 問題を取得し、
// src/lib/prep/data/ielts-speaking-sets.json（SpeakingSet 互換）へ変換する。
//
// 実行:
//   NOTION_TOKEN=secret_xxx node scripts/import-ielts-speaking.mjs
//   （NOTION_TOKEN 未設定時は ../notion-practice-training-creation/.env から読む）
//
// - Notion への書き込みは一切しない（読み取り専用）
// - Part2 / Part3 の Band 別模範解答は sampleAnswers として保持し、
//   演習後の結果画面で表示する

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_SOURCE_ID = "8df5f099-9a93-83a9-8651-07c78ddc66d3";
const OUT_PATH = path.resolve(__dirname, "../src/lib/prep/data/ielts-speaking-sets.json");
const NOTION_VERSION = "2025-09-03";

async function resolveToken() {
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN;
  const envPath = path.resolve(__dirname, "../../notion-practice-training-creation/.env");
  try {
    const raw = await fs.readFile(envPath, "utf8");
    const m = raw.match(/^NOTION_TOKEN=(.+)$/m);
    if (m) return m[1].trim();
  } catch {
    // fall through
  }
  throw new Error("NOTION_TOKEN が見つかりません（環境変数で指定してください）");
}

let TOKEN = "";

async function notion(pathName, options = {}) {
  const res = await fetch(`https://api.notion.com/v1${pathName}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Notion API ${pathName} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function queryAllRows() {
  const rows = [];
  let cursor = null;
  do {
    const body = cursor ? { page_size: 100, start_cursor: cursor } : { page_size: 100 };
    const json = await notion(`/data_sources/${DATA_SOURCE_ID}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    rows.push(...json.results);
    cursor = json.has_more ? json.next_cursor : null;
  } while (cursor);
  return rows;
}

/** ブロックツリーを再帰取得してフラットな配列に（depth 付き） */
async function fetchBlocks(blockId, depth = 0) {
  const out = [];
  let cursor = null;
  do {
    const qs = cursor ? `?page_size=100&start_cursor=${cursor}` : "?page_size=100";
    const json = await notion(`/blocks/${blockId}/children${qs}`);
    for (const block of json.results) {
      const data = block[block.type];
      const text = (data?.rich_text ?? []).map((t) => t.plain_text).join("");
      out.push({ type: block.type, text, depth });
      if (block.has_children && depth < 4) {
        out.push(...(await fetchBlocks(block.id, depth + 1)));
      }
    }
    cursor = json.has_more ? json.next_cursor : null;
  } while (cursor);
  return out;
}

// ---- パーサ ----

const BAND_RE = /Band\s*([\d.]+\+?)/i;
const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫";

/** 見出しが設問区切りなら 0 始まりの設問 index を返す（① 形式 / Q1. 形式の両対応） */
function questionIndexFromHeading(text) {
  const circled = text ? CIRCLED.indexOf(text[0]) : -1;
  if (circled >= 0) return circled;
  const m = text.match(/^Q?(\d+)[.．]\s*\S/i);
  if (m) return Number(m[1]) - 1;
  return -1;
}

/** 「解答解説 / 模範解答」以降のブロックから Band 別サンプルを抽出する。
 *  Part3 は ①②… の設問見出しごとにグループ化される。 */
function parseSampleAnswers(blocks) {
  // questionIndex（0 始まり、見出しがなければ 0）→ [{label, text}]
  const byQuestion = new Map();
  let currentQuestion = 0;
  let currentBand = null;
  let buffer = [];

  const flush = () => {
    if (currentBand && buffer.length > 0) {
      const list = byQuestion.get(currentQuestion) ?? [];
      list.push({ label: `Band ${currentBand}`, text: buffer.join("\n\n").trim() });
      byQuestion.set(currentQuestion, list);
    }
    buffer = [];
  };

  for (const block of blocks) {
    const text = block.text.trim();
    if (!text && block.type !== "divider") continue;

    const questionIndex =
      block.type === "heading_3" || block.type === "heading_2" ? questionIndexFromHeading(text) : -1;
    if (questionIndex >= 0) {
      flush();
      currentQuestion = questionIndex;
      currentBand = null;
      continue;
    }
    const bandMatch = text.match(BAND_RE);
    if ((block.type.startsWith("heading") || block.type === "paragraph") && bandMatch && text.length < 40) {
      flush();
      currentBand = bandMatch[1];
      continue;
    }
    if (block.type === "divider") {
      flush();
      currentBand = null;
      continue;
    }
    if (currentBand && block.type === "paragraph" && text) {
      buffer.push(text);
    }
  }
  flush();
  return byQuestion;
}

/** 「解答解説 / 模範解答」見出しでブロック列を前半（問題）と後半（解答）に分ける */
function splitAtAnswerHeading(blocks) {
  const idx = blocks.findIndex(
    (b) => b.type.startsWith("heading") && /解答解説|模範解答|スコア別解答例|サンプル/.test(b.text)
  );
  if (idx === -1) return { question: blocks, answer: [] };
  return { question: blocks.slice(0, idx), answer: blocks.slice(idx + 1) };
}

function cleanName(rawName) {
  // "s-s1-4　home/accommodation" → { code: "s-s1-4", topic: "home/accommodation" }
  const m = rawName.match(/^(s-s\d+(?:-\d+)?|s-s\d+\s+practice\d+.*)[\s　]*(.*)$/i);
  if (!m) return { code: rawName, topic: "" };
  return { code: m[1].trim(), topic: m[2].trim() };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPart1Set(row, blocks, practiceType) {
  const { code, topic } = cleanName(row.name);
  const questions = blocks.filter((b) => b.type === "numbered_list_item" && b.text.trim());
  if (questions.length === 0) return null;
  const setId = `ielts-s-${practiceType}-${slugify(code)}`;
  const title =
    practiceType === "full-practice"
      ? `Part 1 通し練習 — ${row.name.replace(/^s-s\d+\s*/i, "")}`
      : `Part 1 — ${topic || code}`;
  return {
    id: setId,
    exam: "ielts",
    skill: "speaking",
    practiceType,
    title,
    description:
      practiceType === "full-practice"
        ? "本番仕様のジャンル混成インタビュー練習"
        : `身近なトピック（${topic || "日常"}）についての質疑応答`,
    difficulty: "medium",
    tasks: questions.map((q, i) => ({
      id: `${setId}-t${i + 1}`,
      number: i + 1,
      label: "Part 1",
      prompt: q.text.trim(),
      prepSec: 5,
      speakSec: 40,
    })),
  };
}

function buildPart2Set(row, blocks) {
  const { code } = cleanName(row.name);
  const { question, answer } = splitAtAnswerHeading(blocks);

  // 最初の callout は試験説明、2 つ目の callout + 子要素がキューカード
  const calloutIndexes = question
    .map((b, i) => (b.type === "callout" && b.depth === 0 ? i : -1))
    .filter((i) => i >= 0);
  if (calloutIndexes.length === 0) return null;

  const instruction = calloutIndexes.length > 1 ? question[calloutIndexes[0]].text.trim() : "";
  const cueStart = calloutIndexes.length > 1 ? calloutIndexes[1] : calloutIndexes[0];
  const cueBlocks = [question[cueStart].text, ...question.slice(cueStart + 1).filter((b) => b.depth > 0).map((b) => (b.type === "bulleted_list_item" ? `・${b.text}` : b.text))];
  const cueText = cueBlocks.map((t) => t.trim()).filter(Boolean).join("\n");
  if (!cueText) return null;

  const samples = parseSampleAnswers(answer).get(0) ?? [];
  const topicLine = cueText.split("\n")[0];
  const setId = `ielts-s-part-2-${slugify(code)}`;
  return {
    id: setId,
    exam: "ielts",
    skill: "speaking",
    practiceType: "part-2",
    title: `Part 2 — ${topicLine.replace(/^Describe\s+/i, "").replace(/\.$/, "")}`,
    description: "キューカード形式（準備 1 分 → スピーチ 2 分）",
    difficulty: "medium",
    tasks: [
      {
        id: `${setId}-t1`,
        number: 1,
        label: "Part 2 (Cue Card)",
        prompt: cueText,
        material: instruction || undefined,
        prepSec: 60,
        speakSec: 120,
        sampleAnswers: samples,
      },
    ],
  };
}

function buildPart3Set(row, blocks) {
  const { code } = cleanName(row.name);
  const { question, answer } = splitAtAnswerHeading(blocks);

  const topicBlock = question.find((b) => b.type.startsWith("heading") && /Topic/i.test(b.text));
  const topic = topicBlock ? topicBlock.text.replace(/^Topic[：:]\s*/i, "").trim() : code;
  const intro = question
    .filter((b) => b.type === "paragraph" && b.text.trim() && b.depth > 0)
    .map((b) => b.text.trim())
    .filter((t) => !/^Examiner/i.test(t))
    .join(" ");
  const questionBlocks = question.filter((b) => b.type === "numbered_list_item" && b.text.trim());
  if (questionBlocks.length === 0) return null;

  const samplesByQuestion = parseSampleAnswers(answer);
  const setId = `ielts-s-part-3-${slugify(code)}`;
  return {
    id: setId,
    exam: "ielts",
    skill: "speaking",
    practiceType: "part-3",
    title: `Part 3 — ${topic}`,
    description: intro || "トピックについてのディスカッション形式",
    difficulty: "hard",
    tasks: questionBlocks.map((q, i) => ({
      id: `${setId}-t${i + 1}`,
      number: i + 1,
      label: "Part 3 (Discussion)",
      prompt: q.text.trim(),
      prepSec: 10,
      speakSec: 60,
      sampleAnswers: samplesByQuestion.get(i) ?? [],
    })),
  };
}

async function main() {
  TOKEN = await resolveToken();
  const rows = (await queryAllRows()).map((p) => ({
    id: p.id,
    name: p.properties?.Name?.title?.[0]?.plain_text ?? "",
    part: p.properties?.Part?.select?.name ?? "",
  }));
  console.log(`Notion rows: ${rows.length}`);

  const sets = [];
  for (const row of rows) {
    if (!row.name) continue;
    const blocks = await fetchBlocks(row.id);
    let set = null;
    if (row.part === "Part1") set = buildPart1Set(row, blocks, "part-1");
    else if (row.part === "全体") set = buildPart1Set(row, blocks, "full-practice");
    else if (row.part === "Part2") set = buildPart2Set(row, blocks);
    else if (row.part === "Part3") set = buildPart3Set(row, blocks);
    if (set) {
      sets.push(set);
      console.log(`  + [${row.part}] ${set.title} (${set.tasks.length} tasks)`);
    } else {
      console.warn(`  ! skipped: [${row.part}] ${row.name}`);
    }
  }

  // Part → 番号順で安定ソート
  const order = { "part-1": 0, "part-2": 1, "part-3": 2, "full-practice": 3 };
  sets.sort((a, b) => (order[a.practiceType] - order[b.practiceType]) || a.id.localeCompare(b.id));

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(sets, null, 1), "utf8");
  const taskCount = sets.reduce((a, s) => a + s.tasks.length, 0);
  const withSamples = sets.reduce(
    (a, s) => a + s.tasks.filter((t) => (t.sampleAnswers ?? []).length > 0).length,
    0
  );
  console.log(`\nOK: ${sets.length} sets / ${taskCount} tasks (${withSamples} tasks with sample answers)`);
  console.log(`→ ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
