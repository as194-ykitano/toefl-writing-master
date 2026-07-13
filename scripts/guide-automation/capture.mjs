import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { addCaptureStyles, assertProfile, baseUrl, ensureApp, outputDir, profileDir, projectRoot, requestedGuide, safeName, settlePage } from "./common.mjs";

function defaultHighlights(view) {
  if (view.route.startsWith("/practice/")) return [
    { selector: "main h1", label: "選択中の問題タイプ" },
    { text: "練習モード", label: "練習を始める" },
    { text: "本番モード", label: "本番形式で始める" },
  ];
  if (view.route === "/home") return [
    { text: "TOEFL iBT", label: "試験切替" },
    { text: "1日の学習目標", label: "目標時間" },
    { text: "Reading", label: "技能選択" },
  ];
  if (view.route === "/mock") return [{ text: "Coming Soon", label: "模試の公開状態" }];
  if (view.route === "/study-time") return [
    { text: "技能別", label: "技能別" },
    { text: "問題タイプ別", label: "問題タイプ別" },
  ];
  if (view.route === "/history") return [
    { text: "すべて", label: "履歴を絞り込む" },
    { text: "Writing", label: "技能で絞り込む" },
  ];
  if (view.route === "/overview") return [
    { text: "30日", label: "集計期間を選ぶ" },
    { text: "Reading", label: "技能を切り替える" },
  ];
  if (view.route === "/video-courses") return [
    { selector: "input[aria-label='コースを検索']", label: "コース検索" },
    { text: "ライティング添削データベース", label: "コースを開く" },
  ];
  return [];
}

async function addHighlights(page, definitions) {
  const boxes = [];
  for (const [index, definition] of definitions.entries()) {
    const locator = definition.selector
      ? page.locator(definition.selector).first()
      : page.getByText(definition.text, { exact: true }).first();
    if (!await locator.isVisible().catch(() => false)) continue;
    const box = await locator.boundingBox();
    if (box) boxes.push({ ...box, number: index + 1, label: definition.label });
  }
  await page.evaluate((items) => {
    document.querySelectorAll("[data-guide-highlight-overlay]").forEach((element) => element.remove());
    for (const item of items) {
      const overlay = document.createElement("div");
      overlay.dataset.guideHighlightOverlay = "true";
      Object.assign(overlay.style, {
        position: "fixed", left: `${item.x - 5}px`, top: `${item.y - 5}px`,
        width: `${item.width + 10}px`, height: `${item.height + 10}px`,
        border: "4px solid #f97316", borderRadius: "12px", boxSizing: "border-box",
        boxShadow: "0 0 0 3px rgba(255,255,255,.9), 0 8px 24px rgba(249,115,22,.22)",
        pointerEvents: "none", zIndex: "2147483646",
      });
      const badge = document.createElement("div");
      badge.textContent = `${item.number} ${item.label}`;
      Object.assign(badge.style, {
        position: "absolute", left: "-4px", top: item.y < 50 ? `${item.height + 8}px` : "-36px", maxWidth: "220px",
        padding: "6px 10px", borderRadius: "8px", background: "#f97316", color: "white",
        font: "700 13px/1.2 system-ui, sans-serif", whiteSpace: "nowrap",
        boxShadow: "0 3px 10px rgba(0,0,0,.18)",
      });
      overlay.appendChild(badge);
      document.body.appendChild(overlay);
    }
  }, boxes);
  return boxes.map(({ number, label }) => ({ number, label }));
}

await assertProfile();
const configPath = path.join(projectRoot, "guide-capture.config.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const requested = requestedGuide();
const targets = requested ? config.targets.filter((target) => target.guideId === requested) : config.targets;
if (!targets.length) throw new Error(`対象ガイドがありません: ${requested}`);

const app = await ensureApp();
const context = await chromium.launchPersistentContext(profileDir, {
  headless: process.env.GUIDE_HEADLESS === "1",
  args: [
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-features=CalculateNativeWinOcclusion",
  ],
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const manifest = { baseUrl, capturedAt: new Date().toISOString(), targets: [] };
try {
  const page = context.pages()[0] ?? await context.newPage();
  for (const target of targets) {
    const targetDir = path.join(outputDir, "screenshots", target.guideId);
    await mkdir(targetDir, { recursive: true });
    const captured = { ...target, views: [] };
    for (const [index, view] of target.views.entries()) {
      const url = new URL(view.route, baseUrl).toString();
      console.log(`[${target.guideId}] ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await settlePage(page, view.waitFor || "main");
      const tourSkip = page.getByText("スキップ", { exact: true });
      if (await tourSkip.isVisible().catch(() => false)) {
        await tourSkip.click();
        await page.waitForTimeout(400);
      }
      if (view.waitForTextGone) {
        await page.getByText(view.waitForTextGone, { exact: true }).first().waitFor({ state: "hidden", timeout: 60000 });
        await page.waitForTimeout(700);
      }
      await addCaptureStyles(page, [...(config.hideSelectors || []), ...(view.hideSelectors || [])]);
      const pageText = await page.locator("body").innerText().catch(() => "");
      const highlights = await addHighlights(page, view.highlights || defaultHighlights(view));
      const name = `${String(index + 1).padStart(2, "0")}-${safeName(view.name)}`;
      const screenshotPath = path.join(targetDir, `${name}.png`);
      const textPath = path.join(targetDir, `${name}.txt`);
      await page.bringToFront();
      await page.waitForTimeout(300);
      await page.screenshot({ path: screenshotPath, fullPage: view.fullPage === true, animations: "disabled" });
      await writeFile(textPath, pageText.slice(0, 30000), "utf8");
      captured.views.push({
        ...view,
        finalUrl: page.url(),
        screenshotPath,
        textPath,
        placeholder: `{{screenshot:${view.name}}}`,
        highlights,
      });
    }
    manifest.targets.push(captured);
  }
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`撮影完了: ${path.join(outputDir, "manifest.json")}`);
} finally {
  await context.close();
  app.stop();
}
