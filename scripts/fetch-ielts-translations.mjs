// english-gym-admin (Firebase: englishgym-ios-app) の practiceTrainings から
// IELTS 問題の日本語訳 (articleJa) を取得するスクリプト（読み取り専用）
//
// アドミン画面の問題作成で手動アップロードされた日本語訳を、
// 本文テキストのフィンガープリントで照合できる形で保存する。
// import-ielts-prep.mjs が本ファイルの出力を読み込み、
// translationJa / transcriptJa としてマージする。
//
// 実行: node scripts/fetch-ielts-translations.mjs
// 前提: gcloud に nagato.coaching@gmail.com（englishgym-ios-app の権限）が登録済み
// 出力: scripts/ielts-translations.json

import { execFileSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, "ielts-translations.json");
const PROJECT = "englishgym-ios-app";
const ACCOUNT = "nagato.coaching@gmail.com";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function getToken() {
  return execFileSync("gcloud", ["auth", "print-access-token", ACCOUNT], {
    encoding: "utf8",
    shell: true,
  }).trim();
}

let TOKEN = "";

async function fsGet(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function listAll(collectionPath, maskFields) {
  const docs = [];
  let pageToken = "";
  do {
    const mask = maskFields.map((f) => `mask.fieldPaths=${f}`).join("&");
    const url = `${BASE}/${collectionPath}?pageSize=300&${mask}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const json = await fsGet(url);
    docs.push(...(json.documents ?? []));
    pageToken = json.nextPageToken ?? "";
  } while (pageToken);
  return docs;
}

function str(fields, key) {
  return fields?.[key]?.stringValue ?? "";
}

/** 本文照合用フィンガープリント: 小文字化 + 英数字のみ + 先頭 240 文字 */
export function fingerprint(text) {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 240);
}

async function main() {
  TOKEN = getToken();

  const trainings = await listAll("practiceTrainings", ["title", "kind"]);
  console.log(`practiceTrainings: ${trainings.length} 件`);

  const entries = [];
  for (const training of trainings) {
    const title = str(training.fields, "title");
    if (!/ielts/i.test(title)) continue;
    const trainingId = training.name.split("/").pop();
    const items = await listAll(`practiceTrainings/${trainingId}/items`, ["article", "articleJa"]);
    let withJa = 0;
    for (const item of items) {
      const article = str(item.fields, "article");
      const articleJa = str(item.fields, "articleJa");
      if (!article || !articleJa || articleJa.trim().length < 20) continue;
      entries.push({
        trainingTitle: title,
        fingerprint: fingerprint(article),
        articleJa: articleJa.trim(),
      });
      withJa += 1;
    }
    console.log(`  ${title}: items ${items.length} / 日本語訳あり ${withJa}`);
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(entries, null, 1), "utf8");
  console.log(`\nOK: ${entries.length} 件の日本語訳 → ${OUT_PATH}`);
}

// 直接実行時のみ動かす（import-ielts-prep.mjs から fingerprint を import できるように）
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
