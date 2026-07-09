// TOEFL 問題データのインポートスクリプト（新形式 TOEFL iBT）
//
// Notion データソース（Skills × Question Types）から問題を取得し、
// src/lib/prep/data/ 配下の静的 JSON へ変換する。
//
//   Reading:   Daily Life / Academic Passage / Complete the Words → toefl-reading-sets.json
//   Listening: Academic Talk / Announcement / Conversation        → toefl-listening-sets.json
//   Speaking:  Take an Interview / Listen and Repeat              → toefl-speaking-sets.json
//   Writing:   Write an Email / Build a Sentence                  → toefl-writing-sets.json
//   ※ Listen and Choose a Response は設問ごとに音声が必要なため今回は未対応（スキップ）
//
// 音声: Notion 添付ファイル（署名付き URL・約1時間有効）をその場でダウンロードし、
//       scripts/.toefl-audio-staging/ に保存する。Storage パスのマッピングは
//       src/lib/prep/data/toefl-asset-paths.json に出力する。
//       アップロード:
//         gcloud storage cp "scripts/.toefl-audio-staging/*" \
//           gs://toefl-writing-reading-b1197.firebasestorage.app/prep/toefl/audio/
//
// 実行: node scripts/import-toefl-prep.mjs
//       （NOTION_TOKEN 未設定時は ../notion-practice-training-creation/.env から読む）

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_SOURCE_ID = "3155f099-9a93-81e0-8fb9-000b4b86445f";
const OUT_DIR = path.resolve(__dirname, "../src/lib/prep/data");
const AUDIO_STAGING = path.resolve(__dirname, ".toefl-audio-staging");
const AUDIO_DEST_PREFIX = "prep/toefl/audio";
const NOTION_VERSION = "2025-09-03";

async function resolveToken() {
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN;
  const envPath = path.resolve(__dirname, "../../notion-practice-training-creation/.env");
  const raw = await fs.readFile(envPath, "utf8");
  const m = raw.match(/^NOTION_TOKEN=(.+)$/m);
  if (!m) throw new Error("NOTION_TOKEN が見つかりません");
  return m[1].trim();
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
  if (!res.ok) throw new Error(`Notion API ${pathName}: ${res.status} ${await res.text()}`);
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
  return rows.map((p) => {
    const title = Object.values(p.properties).find((v) => v.type === "title");
    const multi = (key) => p.properties[key]?.multi_select?.map((o) => o.name) ?? [];
    return {
      id: p.id,
      name: (title?.title?.[0]?.plain_text ?? "").trim(),
      skills: multi("Skills"),
      types: multi("Question Types"),
    };
  });
}

/** ネスト構造を保ったままブロックツリーを取得する */
async function fetchTree(blockId, depth = 0) {
  const nodes = [];
  let cursor = null;
  do {
    const qs = cursor ? `?page_size=100&start_cursor=${cursor}` : "?page_size=100";
    const json = await notion(`/blocks/${blockId}/children${qs}`);
    for (const block of json.results) {
      const data = block[block.type] ?? {};
      const node = {
        type: block.type,
        text: (data.rich_text ?? []).map((t) => t.plain_text).join(""),
        audioUrl: block.type === "audio" ? (data.file?.url ?? data.external?.url ?? null) : null,
        cells:
          block.type === "table_row"
            ? (data.cells ?? []).map((c) => c.map((t) => t.plain_text).join(""))
            : null,
        children: [],
      };
      if (block.has_children && depth < 4) {
        node.children = await fetchTree(block.id, depth + 1);
      }
      nodes.push(node);
    }
    cursor = json.has_more ? json.next_cursor : null;
  } while (cursor);
  return nodes;
}

// ---- 汎用ヘルパー ----

function asciiRatio(text) {
  if (!text) return 0;
  let ascii = 0;
  for (const ch of text) if (ch.charCodeAt(0) < 128) ascii += 1;
  return ascii / text.length;
}

function isEnglish(text) {
  return asciiRatio(text) > 0.7;
}

function* walk(nodes) {
  for (const node of nodes) {
    yield node;
    yield* walk(node.children);
  }
}

function findHeading(nodes, regex) {
  for (const node of walk(nodes)) {
    if (node.type.startsWith("heading") && regex.test(node.text)) return node;
  }
  return null;
}

// 選択肢: "(A) text" 形式と "A. text" 形式の両対応
const OPTION_RE = /^(?:\(([A-E])\)|([A-E])[.．])\s+(.*)$/;

function optionMatch(text) {
  const m = text.match(OPTION_RE);
  if (!m) return null;
  return { letter: m[1] ?? m[2], text: m[3].trim() };
}

/** MC 設問の収集
 *  - numbered_list_item（子に選択肢）形式: LAT / LTC / Academic Passage
 *  - フラットな "N. 設問" paragraph / heading 形式: LTA / Notice / Social Post
 *  number は元の問題番号（解答表との突き合わせに使用。連番でないページがある） */
function collectMCQuestions(nodes) {
  const questions = [];
  let listIndex = 0;
  let flat = null; // フラット形式の作業中の設問

  const flushFlat = () => {
    if (flat && flat.options.length >= 2) questions.push(flat);
    flat = null;
  };

  for (const node of nodes) {
    const text = node.text.trim();
    if (node.type === "numbered_list_item" && text) {
      flushFlat();
      const options = [];
      for (const child of node.children) {
        const m = optionMatch(child.text.trim());
        if (m) options.push(m.text);
      }
      if (options.length >= 2) {
        listIndex += 1;
        questions.push({ number: listIndex, prompt: text, options });
      }
      continue;
    }
    if (node.type === "paragraph" || node.type.startsWith("heading")) {
      const qm = text.match(/^(\d+)[.．]\s*(.+)$/);
      const om = optionMatch(text);
      if (qm && !om) {
        flushFlat();
        flat = { number: Number(qm[1]), prompt: qm[2].trim(), options: [] };
        continue;
      }
      if (om && flat && node.type === "paragraph") {
        flat.options.push(om.text);
        continue;
      }
      if (node.type.startsWith("heading")) flushFlat();
      continue;
    }
    if (node.type === "divider") flushFlat();
  }
  flushFlat();
  return questions;
}

/** 解答テーブル（問題 | 正解 | 解説）→ Map<番号, {letter, explanation}> */
function parseAnswerTable(nodes) {
  const map = new Map();
  for (const node of walk(nodes)) {
    if (node.type !== "table") continue;
    for (const row of node.children) {
      if (!row.cells || row.cells.length < 2) continue;
      const num = Number.parseInt(row.cells[0], 10);
      if (!Number.isFinite(num)) continue; // ヘッダー行
      const letter = (row.cells[1] ?? "").trim().match(/[A-E]/)?.[0];
      if (!letter) continue;
      map.set(num, { letter, explanation: (row.cells[2] ?? "").trim() });
    }
  }
  return map;
}

/** 見出し形式の解説（heading "N. ..." → 正解： (X) → 解説段落）→ Map<番号, {letter, explanation}> */
function parseAnswerHeadings(nodes) {
  const map = new Map();
  const flat = [...walk(nodes)];
  for (let i = 0; i < flat.length; i++) {
    const node = flat[i];
    if (!node.type.startsWith("heading")) continue;
    const qm = node.text.trim().match(/^(\d+)[.．]\s/);
    if (!qm) continue;
    const num = Number(qm[1]);
    let letter = null;
    const parts = [];
    for (let j = i + 1; j < flat.length; j++) {
      const n = flat[j];
      if (n.type.startsWith("heading") && /^\d+[.．]\s/.test(n.text.trim())) break;
      const am = n.text.match(/正解[：:]\s*\(?([A-E])\)?/);
      if (am && !letter) {
        letter = am[1];
        continue;
      }
      if ((n.type === "paragraph" || n.type === "bulleted_list_item") && n.text.trim()) {
        parts.push(n.type === "bulleted_list_item" ? `・${n.text.trim()}` : n.text.trim());
      }
    }
    if (letter) map.set(num, { letter, explanation: parts.join("\n") });
  }
  return map;
}

/** 解答セクション（「解答」を含む見出しの子要素）を返す */
function answerSection(tree) {
  const heading = tree.find((n) => n.type.startsWith("heading") && /解答/.test(n.text));
  return heading ? heading.children : [];
}

/** 見出しに対応する本文ノードを返す（子要素があれば子、なければ後続の兄弟要素） */
function sectionAfterHeading(nodes, regex) {
  const flat = [...walk(nodes)];
  const idx = flat.findIndex((n) => n.type.startsWith("heading") && regex.test(n.text));
  if (idx < 0) return [];
  if (flat[idx].children.length > 0) return flat[idx].children;
  const out = [];
  for (let i = idx + 1; i < flat.length; i++) {
    if (flat[i].type.startsWith("heading")) break;
    out.push(flat[i]);
  }
  return out;
}

/** スクリプト（英語音声原稿）を抽出
 *  スクリプト見出しの「子要素」に段落があるページと、
 *  見出しの「後続の兄弟要素」として段落が並ぶページの両方に対応する */
function extractTranscript(answerNodes) {
  const flat = [...walk(answerNodes)];
  const idx = flat.findIndex((n) => n.type.startsWith("heading") && /スクリプト/.test(n.text));
  let source;
  if (idx >= 0 && flat[idx].children.length > 0) {
    source = flat[idx].children;
  } else if (idx >= 0) {
    source = [];
    for (let i = idx + 1; i < flat.length; i++) {
      const n = flat[i];
      if (n.type.startsWith("heading") && /日本語|解説|解答/.test(n.text)) break;
      source.push(n);
    }
  } else {
    source = flat;
  }
  const lines = [];
  for (const node of source) {
    if (node.type === "paragraph" && node.text.trim() && isEnglish(node.text)) {
      lines.push(node.text.trim());
    }
  }
  return lines.join("\n");
}

function letterIndex(letter) {
  return letter.charCodeAt(0) - 65;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function difficultyFromName(name) {
  if (/easy/i.test(name)) return "easy";
  if (/advanced|hard/i.test(name)) return "hard";
  return "medium";
}

// ---- 音声ダウンロード ----

const audioMapping = { listening: {}, speaking: {} };
let audioCount = 0;

async function downloadAudio(url, fileName) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`audio download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(path.join(AUDIO_STAGING, fileName), buf);
  audioCount += 1;
  return `${AUDIO_DEST_PREFIX}/${fileName}`;
}

// ---- タイプ別ビルダー ----

/** Reading: 1 ページに「セット１：」などの見出しで複数セットが含まれる場合に分割する */
function splitBySetHeadings(tree) {
  const indexes = tree
    .map((n, i) =>
      n.type.startsWith("heading") && /^(セット\s*[0-9０-９]|Set\s*\d)/i.test(n.text.trim()) ? i : -1
    )
    .filter((i) => i >= 0);
  if (indexes.length < 2) return null;
  return indexes.map((start, k) => tree.slice(start, indexes[k + 1] ?? tree.length));
}

/** Reading: Daily Life / Academic Passage */
async function buildReadingMC(row, tree, practiceType) {
  const segments = splitBySetHeadings(tree);
  if (segments) {
    const sets = [];
    for (let i = 0; i < segments.length; i++) {
      const sub = await buildReadingMCSingle(
        { ...row, name: `${row.name} セット${i + 1}` },
        segments[i],
        practiceType
      );
      if (sub) sets.push(sub);
    }
    return sets.length > 0 ? sets : null;
  }
  return buildReadingMCSingle(row, tree, practiceType);
}

async function buildReadingMCSingle(row, tree, practiceType) {
  const answers = parseAnswerTable(answerSection(tree));
  const mcs = collectMCQuestions(tree);
  if (mcs.length === 0) return null;

  // パッセージ: callout（メール・掲示など）または heading_1 + 段落
  const paragraphs = [];
  const h1 = tree.find((n) => n.type === "heading_1");
  const callouts = tree.filter((n) => n.type === "callout");
  if (callouts.length > 0) {
    callouts.forEach((callout, i) => {
      const lines = [callout.text, ...callout.children.map((c) => c.text)]
        .map((t) => t.trim())
        .filter(Boolean);
      paragraphs.push({
        label: callouts.length > 1 ? `文書 ${i + 1}` : undefined,
        text: lines.join("\n"),
      });
    });
  } else {
    for (const node of tree) {
      if (node.type.startsWith("heading") && /解答|Questions/i.test(node.text)) break;
      if (node.type === "paragraph" && node.text.trim() && isEnglish(node.text)) {
        paragraphs.push({ text: node.text.trim() });
      }
    }
  }
  if (paragraphs.length === 0) return null;

  const shortName = row.name.replace(/^Reading\s*-\s*/i, "").trim();
  const setId = `toefl-r-${practiceType}-${slugify(shortName)}`;
  const questions = mcs.map((mc, i) => {
    const answer = answers.get(mc.number ?? i + 1);
    return {
      id: `${setId}-q${i + 1}`,
      number: i + 1,
      type: "multiple_choice",
      prompt: mc.prompt,
      options: mc.options,
      answer: answer ? (mc.options[letterIndex(answer.letter)] ?? answer.letter) : "",
      explanation: answer?.explanation ?? "",
      skillTag: practiceType,
    };
  });
  if (questions.some((q) => !q.answer)) {
    console.warn(`  ! 解答が見つからない設問あり: ${row.name}`);
  }

  return {
    id: setId,
    exam: "toefl",
    skill: "reading",
    practiceType,
    title: h1?.text?.trim() || shortName,
    description: practiceType === "daily-life" ? "日常文書の読解" : "アカデミック読解",
    difficulty: difficultyFromName(row.name),
    timeLimitSec: questions.length * 90,
    passageTitle: h1?.text?.trim() || shortName,
    paragraphs,
    questions: questions.filter((q) => q.answer),
  };
}

/** Reading: Complete the Words */
async function buildCompleteTheWords(row, tree) {
  const callout = tree.find((n) => n.type === "callout");
  if (!callout) return null;
  const passageHeadingIdx = callout.children.findIndex(
    (n) => n.type.startsWith("heading") && /Passage/i.test(n.text)
  );
  const passageLines = callout.children
    .slice(passageHeadingIdx + 1)
    .filter((n) => n.type === "paragraph" && n.text.trim())
    .map((n) => n.text.trim());
  const instructions = callout.children
    .filter((n, i) => i < passageHeadingIdx && n.type === "paragraph" && n.text.trim())
    .map((n) => n.text.trim())
    .join("\n");

  const answerNodes = answerSection(tree);
  const words = [];
  for (const node of walk(answerNodes)) {
    if (node.type === "numbered_list_item" && node.text.trim()) words.push(node.text.trim());
  }
  if (words.length === 0 || passageLines.length === 0) return null;

  const setId = `toefl-r-complete-the-words-${slugify(row.name)}`;
  return {
    id: setId,
    exam: "toefl",
    skill: "reading",
    practiceType: "complete-the-words",
    title: row.name,
    description: instructions || "文中の欠けた単語を補うタスク",
    difficulty: "medium",
    timeLimitSec: words.length * 30,
    passageTitle: row.name,
    paragraphs: passageLines.map((text) => ({ text })),
    questions: words.map((word, i) => ({
      id: `${setId}-q${i + 1}`,
      number: i + 1,
      type: "gap_fill",
      prompt: `Passage 内で ${i + 1} 番目に出てくる未完成の単語（例: fo_ _ _）を、完全な形で入力してください。`,
      answer: word,
      explanation: `正解: ${word}`,
      skillTag: "complete-the-words",
    })),
  };
}

/** Listening: Academic Talk / Announcement / Conversation */
async function buildListening(row, tree, practiceType) {
  const answerNodes = answerSection(tree);
  const answers = new Map([...parseAnswerTable(answerNodes), ...parseAnswerHeadings(answerNodes)]);
  const mcs = collectMCQuestions(tree);
  if (mcs.length === 0) return null;

  const shortName = row.name.trim();
  const setId = `toefl-l-${practiceType}-${slugify(shortName)}`;

  // 冒頭の指示文（Listen to a talk... など）
  const intro = tree.find(
    (n) => (n.type === "paragraph" || n.type === "heading_1") && /^Listen/i.test(n.text.trim())
  );

  // 音声: 最初の audio ブロック
  const audioNode = [...walk(tree)].find((n) => n.type === "audio" && n.audioUrl);
  if (audioNode) {
    const fileName = `${setId}.mp3`;
    try {
      audioMapping.listening[setId] = await downloadAudio(audioNode.audioUrl, fileName);
    } catch (err) {
      console.warn(`  ! audio download failed for ${setId}: ${err.message}`);
    }
  }

  const questions = mcs.map((mc, i) => {
    const answer = answers.get(mc.number ?? i + 1);
    return {
      id: `${setId}-q${i + 1}`,
      number: i + 1,
      type: "multiple_choice",
      prompt: mc.prompt,
      options: mc.options,
      answer: answer ? (mc.options[letterIndex(answer.letter)] ?? answer.letter) : "",
      explanation: answer?.explanation ?? "",
      skillTag: practiceType,
    };
  });
  if (questions.some((q) => !q.answer)) {
    console.warn(`  ! 解答が見つからない設問あり: ${row.name}`);
  }

  return {
    id: setId,
    exam: "toefl",
    skill: "listening",
    practiceType,
    title: shortName,
    description: intro?.text?.trim(),
    difficulty: "medium",
    timeLimitSec: 240 + questions.length * 60,
    transcript: extractTranscript(answerNodes),
    playLimitInTest: 1,
    questions: questions.filter((q) => q.answer),
  };
}

/** Speaking: Take an Interview */
async function buildTakeAnInterview(row, tree) {
  const setId = `toefl-s-take-an-interview-${slugify(row.name)}`;
  const directionsCallout = tree.find((n) => n.type === "callout" && /Directions/i.test(n.text));
  const hearCallout = tree.find((n) => n.type === "callout" && /Test takers hear/i.test(n.text));
  const scriptHeading = tree.find((n) => n.type.startsWith("heading") && /スクリプト/.test(n.text));
  if (!scriptHeading) return null;

  const intro = (directionsCallout?.children ?? [])
    .filter((n) => n.type === "paragraph" && n.text.trim() && isEnglish(n.text))
    .map((n) => n.text.trim())
    .join("\n");

  // Qn 見出しごとに Interviewer 台詞（=設問）と解答例を抽出
  const tasks = [];
  const children = scriptHeading.children;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    const qm = node.type.startsWith("heading") && node.text.trim().match(/^Q(\d+)/i);
    if (!qm) continue;
    const number = Number(qm[1]);
    const prompts = [];
    const samples = [];
    for (let j = i + 1; j < children.length; j++) {
      const n = children[j];
      if (n.type.startsWith("heading")) break;
      if (n.type !== "paragraph" || !n.text.trim()) continue;
      const text = n.text.trim();
      if (/^Interviewer\s*[:：]/i.test(text)) prompts.push(text.replace(/^Interviewer\s*[:：]\s*/i, ""));
      else if (isEnglish(text)) samples.push(text);
    }
    if (prompts.length === 0) continue;
    tasks.push({
      id: `${setId}-t${number}`,
      number,
      label: "Take an Interview",
      prompt: prompts.join("\n"),
      material: number === 1 && intro ? intro : undefined,
      prepSec: 0,
      speakSec: 45,
      sampleAnswers: samples.length > 0 ? [{ label: "解答例", text: samples.join("\n\n") }] : [],
    });
  }
  if (tasks.length === 0) return null;

  // 音声: "Test takers hear" 内の audio を順番にタスクへ対応付け
  const audios = [...walk(hearCallout ? [hearCallout] : [])].filter((n) => n.type === "audio" && n.audioUrl);
  const taskAudio = {};
  for (let i = 0; i < Math.min(audios.length, tasks.length); i++) {
    const fileName = `${setId}-t${tasks[i].number}.mp3`;
    try {
      taskAudio[tasks[i].id] = await downloadAudio(audios[i].audioUrl, fileName);
    } catch (err) {
      console.warn(`  ! audio download failed for ${setId} t${tasks[i].number}: ${err.message}`);
    }
  }
  if (Object.keys(taskAudio).length > 0) audioMapping.speaking[setId] = taskAudio;

  const topic = tree.find((n) => n.type === "heading_2" && /Take an Interview/i.test(n.text));
  const title = topic
    ? topic.text.replace(/^Take an Interview\s*[–—-]\s*/i, "Take an Interview — ")
    : `Take an Interview — ${row.name}`;

  return {
    id: setId,
    exam: "toefl",
    skill: "speaking",
    practiceType: "take-an-interview",
    title,
    description: "インタビュー形式。4 つの質問に各 45 秒で回答します（準備時間なし）",
    difficulty: "medium",
    tasks,
  };
}

/** Speaking: Listen and Repeat */
async function buildListenAndRepeat(row, tree) {
  const setId = `toefl-s-listen-and-repeat-${slugify(row.name)}`;
  const scriptHeading = tree.find((n) => n.type.startsWith("heading") && /スクリプト/.test(n.text));
  if (!scriptHeading) return null;

  // スクリプト: Narrator 以外の英語行が復唱対象
  const narrator = [];
  const sentences = [];
  for (const node of scriptHeading.children) {
    if (node.type !== "paragraph" || !node.text.trim() || !isEnglish(node.text)) continue;
    const text = node.text.trim();
    if (/^Narrator\s*[:：]/i.test(text)) narrator.push(text.replace(/^Narrator\s*[:：]\s*/i, ""));
    else sentences.push(text.replace(/^[A-Za-z ]+\s*[:：]\s*/, ""));
  }
  if (sentences.length === 0) return null;

  const tasks = sentences.map((sentence, i) => ({
    id: `${setId}-t${i + 1}`,
    number: i + 1,
    label: "Listen and Repeat",
    prompt: "音声を聞いて、聞こえた文をそのまま復唱してください。",
    material: i === 0 && narrator.length > 0 ? narrator.join("\n") : undefined,
    prepSec: 0,
    speakSec: 15,
    sampleAnswers: [{ label: "スクリプト", text: sentence }],
  }));

  // 音声: "Test takers hear" callout 内の audio を文の順に対応付け
  const hearCallout = tree.find((n) => n.type === "callout" && /Test takers hear/i.test(n.text));
  const audios = [...walk(hearCallout ? [hearCallout] : [])].filter((n) => n.type === "audio" && n.audioUrl);
  const taskAudio = {};
  for (let i = 0; i < Math.min(audios.length, tasks.length); i++) {
    const fileName = `${setId}-t${i + 1}.mp3`;
    try {
      taskAudio[tasks[i].id] = await downloadAudio(audios[i].audioUrl, fileName);
    } catch (err) {
      console.warn(`  ! audio download failed for ${setId} t${i + 1}: ${err.message}`);
    }
  }
  if (Object.keys(taskAudio).length > 0) audioMapping.speaking[setId] = taskAudio;

  const titleLine = tree.find((n) => n.type === "paragraph" && /Listen and Repeat/i.test(n.text));
  const topic = titleLine?.text?.match(/[–—-]\s*(.+)$/)?.[1];

  return {
    id: setId,
    exam: "toefl",
    skill: "speaking",
    practiceType: "listen-and-repeat",
    title: topic ? `Listen and Repeat — ${topic.trim()}` : `Listen and Repeat — ${row.name}`,
    description: "聞こえた文をそのまま復唱するタスク。音声は 1 回だけ再生されます",
    difficulty: "medium",
    tasks,
  };
}

/** Writing: Write an Email */
async function buildWriteAnEmail(row, tree) {
  const setId = `toefl-w-write-an-email-${slugify(row.name)}`;
  const promptLines = [];
  let to;
  let subject;
  for (const node of tree) {
    if (node.type.startsWith("heading") && /解答|訳/.test(node.text)) break;
    if (node.type === "paragraph" && /^Your Response/i.test(node.text.trim())) continue;
    if (node.type === "paragraph" && node.text.trim()) promptLines.push(node.text.trim());
    if (node.type === "bulleted_list_item" && node.text.trim()) promptLines.push(`・${node.text.trim()}`);
    if (node.type === "callout") {
      const lines = [node.text, ...node.children.map((c) => c.text)].map((t) => t.trim());
      to = lines.find((l) => /^To:/i.test(l))?.replace(/^To:\s*/i, "");
      subject = lines.find((l) => /^Subject:/i.test(l))?.replace(/^Subject:\s*/i, "");
    }
  }
  if (promptLines.length === 0) return null;

  const answerNodes = answerSection(tree);
  const sampleAnswer = sectionAfterHeading(answerNodes, /^解答例/)
    .filter((n) => n.type === "paragraph" && n.text.trim() && isEnglish(n.text))
    .map((n) => n.text.trim())
    .join("\n\n");
  const promptJa = sectionAfterHeading(answerNodes, /日本語訳（問題文）/)
    .filter((n) => (n.type === "paragraph" || n.type === "bulleted_list_item") && n.text.trim())
    .map((n) => (n.type === "bulleted_list_item" ? `・${n.text.trim()}` : n.text.trim()))
    .join("\n");

  return {
    id: setId,
    exam: "toefl",
    skill: "writing",
    practiceType: "write-an-email",
    title: subject ? `Write an Email — ${subject}` : `Write an Email — ${row.name}`,
    description: "7 分・80〜120 語。状況に沿ったメールを書きます",
    difficulty: "medium",
    timeLimitSec: 420,
    promptText: promptLines.join("\n"),
    to,
    subject,
    sampleAnswer: sampleAnswer || undefined,
    promptJa: promptJa || undefined,
  };
}

/** Writing: Build a Sentence */
async function buildBuildASentence(row, tree) {
  const setId = `toefl-w-build-a-sentence-${slugify(row.name)}`;
  const items = [];
  for (const node of tree) {
    if (node.type !== "numbered_list_item" || !node.text.trim()) continue;
    const template = node.children.find((c) => c.type === "paragraph" && /_{2,}/.test(c.text));
    const words = node.children.find((c) => c.type === "quote");
    if (!template || !words) continue;
    items.push({
      context: node.text.trim(),
      template: template.text.trim(),
      words: words.text.split("/").map((w) => w.trim()).filter(Boolean),
    });
  }

  // 解答セクションの numbered_list_item が順番に対応
  const answers = [];
  for (const node of walk(answerSection(tree))) {
    if (node.type === "numbered_list_item" && node.text.trim()) answers.push(node.text.trim());
  }
  if (items.length === 0 || answers.length < items.length) {
    console.warn(`  ! Build a Sentence の解答不足: ${row.name} (${items.length} items / ${answers.length} answers)`);
    return null;
  }

  return {
    id: setId,
    exam: "toefl",
    skill: "writing",
    practiceType: "build-a-sentence",
    title: `Build a Sentence — ${row.name}`,
    description: "語順が入れ替わった語句を並べ替えて正しい文を作ります（10 問・約 7 分）",
    difficulty: "medium",
    timeLimitSec: 420,
    items: items.map((item, i) => ({
      id: `${setId}-q${i + 1}`,
      number: i + 1,
      context: item.context,
      template: item.template,
      words: item.words,
      answer: answers[i],
    })),
  };
}

// ---- メイン ----

const TYPE_BUILDERS = [
  { type: "Daily Life", skill: "Reading", build: (r, t) => buildReadingMC(r, t, "daily-life") },
  { type: "Academic Passage", skill: "Reading", build: (r, t) => buildReadingMC(r, t, "academic-passage") },
  { type: "Complete the Words", skill: "Reading", build: buildCompleteTheWords },
  { type: "Academic Talk", skill: "Listening", build: (r, t) => buildListening(r, t, "academic-talk") },
  { type: "Announcement", skill: "Listening", build: (r, t) => buildListening(r, t, "announcement") },
  { type: "Conversation (2 questions)", skill: "Listening", build: (r, t) => buildListening(r, t, "conversation") },
  { type: "Conversation (3 questions)", skill: "Listening", build: (r, t) => buildListening(r, t, "conversation") },
  { type: "Take an Interview", skill: "Speaking", build: buildTakeAnInterview },
  { type: "Listen and Repeat", skill: "Speaking", build: buildListenAndRepeat },
  { type: "Email", skill: "Writing", build: buildWriteAnEmail },
  { type: "Build a Sentence", skill: "Writing", build: buildBuildASentence },
];

async function main() {
  TOKEN = await resolveToken();
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.rm(AUDIO_STAGING, { recursive: true, force: true });
  await fs.mkdir(AUDIO_STAGING, { recursive: true });

  const rows = await queryAllRows();
  console.log(`Notion rows: ${rows.length}`);

  const out = { reading: [], listening: [], speaking: [], writing: [] };
  for (const row of rows) {
    const builder = TYPE_BUILDERS.find(
      (b) => row.types.includes(b.type) && row.skills.includes(b.skill)
    );
    if (!builder) {
      if (row.types.length > 0) console.log(`  - skip: [${row.types.join(",")}] ${row.name}`);
      continue;
    }
    try {
      const tree = await fetchTree(row.id);
      const built = await builder.build(row, tree);
      const sets = built ? (Array.isArray(built) ? built : [built]) : [];
      if (sets.length === 0) {
        console.warn(`  ! parse failed: ${row.name}`);
      }
      for (const set of sets) {
        out[set.skill].push(set);
        const count = set.questions?.length ?? set.tasks?.length ?? set.items?.length ?? 1;
        console.log(`  + [${set.practiceType}] ${set.title} (${count})`);
      }
    } catch (err) {
      console.warn(`  ! error: ${row.name}: ${err.message}`);
    }
  }

  for (const skill of Object.keys(out)) {
    out[skill].sort((a, b) => a.id.localeCompare(b.id));
    await fs.writeFile(
      path.join(OUT_DIR, `toefl-${skill}-sets.json`),
      JSON.stringify(out[skill], null, 1),
      "utf8"
    );
  }
  await fs.writeFile(
    path.join(OUT_DIR, "toefl-asset-paths.json"),
    JSON.stringify(audioMapping, null, 1),
    "utf8"
  );

  console.log(
    `\nOK: reading ${out.reading.length} / listening ${out.listening.length} / speaking ${out.speaking.length} / writing ${out.writing.length} sets`
  );
  console.log(`audio staged: ${audioCount} files → ${AUDIO_STAGING}`);
  console.log(
    `upload: gcloud storage cp "${AUDIO_STAGING}/*" gs://toefl-writing-reading-b1197.firebasestorage.app/${AUDIO_DEST_PREFIX}/`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
