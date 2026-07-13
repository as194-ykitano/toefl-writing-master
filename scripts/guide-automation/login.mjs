import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { baseUrl, ensureApp, profileDir } from "./common.mjs";

const app = await ensureApp();
await mkdir(profileDir, { recursive: true });
const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: { width: 1440, height: 1000 },
});
try {
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  console.log("ブラウザでガイド撮影用アカウントへログインしてください。ログイン完了を自動検出します。");
  if (new URL(page.url()).pathname.startsWith("/login")) {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10 * 60 * 1000 });
  }
  await page.waitForTimeout(2000);
  console.log(`ログインセッションを保存しました: ${profileDir}`);
} finally {
  await context.close();
  app.stop();
}
