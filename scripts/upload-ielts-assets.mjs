// IELTS リスニング音声・地図画像を Firebase Storage へアップロードするスクリプト
//
// 使い方:
//   node scripts/upload-ielts-assets.mjs --map-only   # マッピング JSON の生成のみ（アップロードなし）
//   node scripts/upload-ielts-assets.mjs              # ステージング + gcloud storage でアップロード
//
// 前提:
//   - gcloud CLI にログイン済み（gcloud auth login）で、
//     プロジェクト toefl-writing-reading-b1197 の Storage への書き込み権限があること
//   - アップロード先は gs://<bucket>/prep/ielts/listening/（新設パス）
//     既存の audio/ ielts_images/ profile-images/ には一切触れない
//   - storage.rules の `/prep/**` read ルールをデプロイしておくこと
//     （firebase deploy --only storage）
//
// 生成物:
//   - src/lib/prep/data/ielts-asset-paths.json … setId → Storage パスのマッピング
//     （アプリはこのパスから getDownloadURL で URL を解決する。
//       未アップロードでも安全に読み上げフォールバックする）

import { execFileSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.resolve(__dirname, "ielts-assets-manifest.json");
const OUT_MAP_PATH = path.resolve(__dirname, "../src/lib/prep/data/ielts-asset-paths.json");
const STAGING_DIR = path.resolve(__dirname, "../.staging-prep-assets");
const BUCKET = "toefl-writing-reading-b1197.firebasestorage.app";
const DEST_PREFIX = "prep/ielts/listening";

const mapOnly = process.argv.includes("--map-only");

/** 複数音声がある場合はパイプラインの正式出力（06-stage6-final-*.mp3）を優先する */
function pickAudio(audioList) {
  if (!audioList || audioList.length === 0) return null;
  const final = audioList.find((p) => /06-stage6-final-.*\.mp3$/i.test(p));
  return final ?? audioList[0];
}

async function run() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  const sourceRoot = manifest.sourceRoot;

  const mapping = {};
  const copies = []; // { src, stagedName }

  for (const entry of manifest.listening) {
    const audio = pickAudio(entry.audio);
    const image = entry.images?.[0] ?? null;
    const item = {};
    if (audio) {
      const name = `${entry.setId}.mp3`;
      item.audioPath = `${DEST_PREFIX}/${name}`;
      copies.push({ src: path.join(sourceRoot, audio), stagedName: name });
    }
    if (image) {
      const ext = path.extname(image) || ".png";
      const name = `${entry.setId}${ext}`;
      item.imagePath = `${DEST_PREFIX}/${name}`;
      copies.push({ src: path.join(sourceRoot, image), stagedName: name });
    }
    if (item.audioPath || item.imagePath) mapping[entry.setId] = item;
  }

  await fs.mkdir(path.dirname(OUT_MAP_PATH), { recursive: true });
  await fs.writeFile(OUT_MAP_PATH, JSON.stringify(mapping, null, 1), "utf8");
  console.log(`mapping: ${Object.keys(mapping).length} sets → ${OUT_MAP_PATH}`);

  if (mapOnly) {
    console.log("--map-only: アップロードはスキップしました");
    return;
  }

  // ステージング（setId 名にリネームしてコピー）
  await fs.rm(STAGING_DIR, { recursive: true, force: true });
  await fs.mkdir(STAGING_DIR, { recursive: true });
  let staged = 0;
  for (const copy of copies) {
    try {
      await fs.copyFile(copy.src, path.join(STAGING_DIR, copy.stagedName));
      staged += 1;
    } catch (err) {
      console.warn(`  ! copy failed: ${copy.src} (${err.message})`);
    }
  }
  console.log(`staged: ${staged} files → ${STAGING_DIR}`);

  // gcloud storage で一括アップロード
  console.log(`uploading to gs://${BUCKET}/${DEST_PREFIX}/ ...`);
  try {
    execFileSync(
      "gcloud",
      ["storage", "cp", "-r", `${STAGING_DIR}/*`, `gs://${BUCKET}/${DEST_PREFIX}/`],
      { stdio: "inherit", shell: true }
    );
    console.log("アップロード完了");
    await fs.rm(STAGING_DIR, { recursive: true, force: true });
  } catch {
    console.error(
      [
        "",
        "アップロードに失敗しました。以下を確認してください:",
        "  1. gcloud auth login （Storage 権限のあるアカウントでログイン）",
        `  2. gcloud storage cp -r "${STAGING_DIR}/*" gs://${BUCKET}/${DEST_PREFIX}/`,
        "  3. storage.rules の /prep/** ルールをデプロイ: firebase deploy --only storage",
        "ステージングディレクトリは残してあるので、再実行またはコマンド 2 を直接実行できます。",
      ].join("\n")
    );
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
