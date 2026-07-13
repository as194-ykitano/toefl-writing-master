import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { assertProfile, baseUrl, ensureApp, outputDir, profileDir, requestedGuide, settlePage } from "./common.mjs";

await assertProfile();
const requested = requestedGuide();
if (!requested) throw new Error("--guide <guide-id> を指定してください。");
const generatedPath = path.join(outputDir, "generated", `${requested}.json`);
await access(generatedPath).catch(() => { throw new Error(`生成ファイルがありません: ${generatedPath}`); });
const generated = JSON.parse(await readFile(generatedPath, "utf8"));
if (generated.guideId !== requested || typeof generated.content !== "string") throw new Error("生成ファイルの形式が不正です。");

const app = await ensureApp();
const context = await chromium.launchPersistentContext(profileDir, {
  headless: process.env.GUIDE_HEADED !== "1",
  viewport: { width: 1440, height: 1000 },
});
try {
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(`${baseUrl}/admin/guides/${requested}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settlePage(page, "[data-guide-markdown-editor]");
  const editor = page.locator("[data-guide-markdown-editor]");
  const fileInput = page.locator('input[type="file"][accept="image/*"]').first();
  const imageUrls = {};
  for (const image of generated.images || []) {
    const before = await editor.inputValue();
    const beforeUrls = new Set([...before.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)].map((match) => match[1]));
    await editor.evaluate((element) => {
      const textarea = element;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      textarea.dispatchEvent(new Event("select", { bubbles: true }));
    });
    await fileInput.setInputFiles(path.resolve(image.path));
    await page.waitForFunction((previous) => {
      const element = document.querySelector("[data-guide-markdown-editor]");
      return element instanceof HTMLTextAreaElement && element.value !== previous && /!\[[^\]]*\]\(https?:\/\/[^)]+\)/.test(element.value);
    }, before, { timeout: 60000 });
    const after = await editor.inputValue();
    const matches = [...after.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g)];
    const url = matches.map((match) => match[1]).find((candidate) => !beforeUrls.has(candidate));
    if (!url) throw new Error(`${image.key} のアップロードURLを取得できませんでした。`);
    imageUrls[image.key] = url;
  }
  let content = generated.content;
  for (const image of generated.images || []) {
    const token = `{{screenshot:${image.key}}}`;
    const markdown = `![${image.alt || image.key}](${imageUrls[image.key]})`;
    content = content.replaceAll(token, markdown);
  }
  if (/\{\{screenshot:[^}]+\}\}/.test(content)) throw new Error("未解決のスクリーンショットプレースホルダーがあります。");
  await editor.fill(content);
  if (generated.title) await page.locator("#guide-title").fill(generated.title);
  if (generated.summary) await page.locator("#guide-summary").fill(generated.summary);
  const saveResponse = page.waitForResponse((response) => response.url().includes(`/api/admin/guides/${requested}`) && response.request().method() === "PUT", { timeout: 60000 });
  await page.getByRole("button", { name: /^保存$/ }).click();
  const response = await saveResponse;
  if (!response.ok()) throw new Error(`Admin保存に失敗しました: HTTP ${response.status()}`);
  console.log(`ガイドを更新しました: ${baseUrl}/admin/guides/${requested}`);
} finally {
  await context.close();
  app.stop();
}
