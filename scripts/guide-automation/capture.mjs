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

async function locateHighlights(page, definitions) {
  const boxes = [];
  for (const [index, definition] of definitions.entries()) {
    let locator = definition.selector
      ? page.locator(definition.selector).first()
      : page.getByText(definition.text, { exact: true }).first();
    if (definition.key === "settings" && !definition.selector) {
      locator = locator.locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
    }
    if (!await locator.isVisible().catch(() => false)) continue;
    const box = await locator.boundingBox();
    if (box) boxes.push({ ...box, key: definition.key ?? `target-${index + 1}`, number: index + 1, label: definition.label });
  }
  return boxes;
}

async function waitForCaptureReady(page, view) {
  const readySelector = view.clipSelector || view.waitForSelector;
  if (readySelector) {
    try {
      await page.locator(readySelector).first().waitFor({ state: "attached", timeout: 25000 });
    } catch {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await settlePage(page, view.waitFor || "main");
      for (const action of view.actions ?? []) {
        const locator = action.selector
          ? page.locator(action.selector).first()
          : page.getByText(action.text, { exact: action.exact !== false }).first();
        await locator.waitFor({ state: "visible", timeout: 60000 });
        await locator.click();
        await page.waitForTimeout(action.waitMs ?? 500);
      }
      await page.locator(readySelector).first().waitFor({ state: "attached", timeout: 90000 });
    }
  }
  if (view.clipSelector) {
    const clip = page.locator(view.clipSelector).first();
    await clip.waitFor({ state: "attached", timeout: 90000 });
    await clip.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
  }
  if (view.waitForTextGone) {
    await page.getByText(view.waitForTextGone, { exact: true }).first().waitFor({ state: "hidden", timeout: 90000 });
  }
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete), null, { timeout: 90000 });
  await page.evaluate(async () => { await document.fonts?.ready; });
  await page.waitForTimeout(view.settleMs ?? 1200);
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
let manifest = { baseUrl, capturedAt: new Date().toISOString(), targets: [] };
if (requested) {
  try {
    manifest = JSON.parse(await readFile(path.join(outputDir, "manifest.json"), "utf8"));
    manifest.baseUrl = baseUrl;
    manifest.capturedAt = new Date().toISOString();
  } catch {}
}
try {
  let availablePage = context.pages()[0] ?? null;
  for (const target of targets) {
    const targetDir = path.join(outputDir, "screenshots", target.guideId);
    await mkdir(targetDir, { recursive: true });
    const captured = { ...target, views: [] };
    let page = null;
    let currentUrl = "";
    for (const [index, view] of target.views.entries()) {
      const url = new URL(view.route, baseUrl).toString();
      console.log(`[${target.guideId}] ${url}`);
      if (!page || currentUrl !== url) {
        if (!page && availablePage) {
          page = availablePage;
          availablePage = null;
        } else {
          const nextPage = await context.newPage();
          await page?.close();
          page = nextPage;
        }
        currentUrl = url;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await settlePage(page, view.waitFor || "main");
        const tourSkip = page.getByText("スキップ", { exact: true });
        if (await tourSkip.isVisible().catch(() => false)) {
          await tourSkip.click();
          await page.waitForTimeout(400);
        }
      }
      for (const action of view.actions ?? []) {
        const locator = action.selector
          ? page.locator(action.selector).first()
          : page.getByText(action.text, { exact: action.exact !== false }).first();
        await locator.waitFor({ state: "visible", timeout: 60000 });
        await locator.click();
        await page.waitForTimeout(action.waitMs ?? 500);
      }
      await waitForCaptureReady(page, view);
      await addCaptureStyles(page, [...(config.hideSelectors || []), ...(view.hideSelectors || [])]);
      const pageText = await page.locator("body").innerText().catch(() => "");
      const highlightBoxes = await locateHighlights(page, view.highlights || defaultHighlights(view));
      const name = `${String(index + 1).padStart(2, "0")}-${safeName(view.name)}`;
      const screenshotPath = path.join(targetDir, `${name}.png`);
      const textPath = path.join(targetDir, `${name}.txt`);
      await page.bringToFront();
      await page.waitForTimeout(300);
      let captureBox = await page.evaluate(() => ({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
      if (view.clipSelector) {
        const locator = page.locator(view.clipSelector).first();
        await locator.waitFor({ state: "visible", timeout: 60000 });
        if (view.clipSelector === "[data-guide-target=speaking-feedback]") {
          await locator.evaluate((element) => {
            element.style.paddingInline = "20px";
          });
        }
        const box = await locator.boundingBox();
        if (!box) throw new Error(`撮影範囲を取得できません: ${view.clipSelector}`);
        captureBox = box;
        await locator.screenshot({ path: screenshotPath, animations: "disabled" });
      } else if (view.route.startsWith("/guide-demo/")) {
        if (await page.locator("main").count() === 0) {
          await page.waitForTimeout(3000);
          await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
        }
        await page.locator("main").first().waitFor({ state: "visible", timeout: 60000 });
        const mainBox = await page.locator("main").first().boundingBox();
        if (!mainBox) throw new Error(`デモ画面の撮影範囲を取得できません: ${view.route}`);
        captureBox = mainBox;
        await page.screenshot({ path: screenshotPath, clip: mainBox, animations: "disabled" });
      } else {
        await page.screenshot({ path: screenshotPath, fullPage: view.fullPage === true, animations: "disabled" });
        if (view.fullPage === true) {
          captureBox = await page.evaluate(() => ({ x: 0, y: 0, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
        }
      }
      await writeFile(textPath, pageText.slice(0, 30000), "utf8");
      captured.views.push({
        ...view,
        finalUrl: page.url(),
        screenshotPath,
        textPath,
        placeholder: `{{screenshot:${view.name}}}`,
        captureBox,
        highlights: highlightBoxes.map((box) => ({
          key: box.key,
          number: box.number,
          label: box.label,
          x: box.x - captureBox.x,
          y: box.y - captureBox.y,
          width: box.width,
          height: box.height,
        })),
      });
    }
    availablePage = page;
    manifest.targets = manifest.targets.filter((item) => item.guideId !== target.guideId);
    manifest.targets.push(captured);
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  }
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`撮影完了: ${path.join(outputDir, "manifest.json")}`);
} finally {
  await context.close();
  app.stop();
}
