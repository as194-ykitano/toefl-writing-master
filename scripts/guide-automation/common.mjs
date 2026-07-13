import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

export const projectRoot = path.resolve(import.meta.dirname, "../..");
export const profileDir = path.join(projectRoot, ".guide-browser-profile");
export const outputDir = path.join(projectRoot, "outputs", "guide-capture");
export const baseUrl = process.env.GUIDE_BASE_URL || "http://localhost:3000";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function isReachable(url = baseUrl) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return response.status < 500;
  } catch {
    return false;
  }
}

export async function ensureApp() {
  if (await isReachable()) return { started: false, stop() {} };
  const parsed = new URL(baseUrl);
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error(`${baseUrl} に接続できません。リモート環境は自動起動できません。`);
  }
  // Windowsでは npm.cmd の直接 spawn が EINVAL になる環境があるため、
  // Next.js CLIを現在のNodeランタイムから直接起動する。
  const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextCli, "dev", "-p", parsed.port || "3000"], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
  });
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await isReachable()) return { started: true, stop: () => child.kill() };
    if (child.exitCode !== null) throw new Error(`開発サーバーが終了しました（exit ${child.exitCode}）。`);
    await wait(1000);
  }
  child.kill();
  throw new Error("開発サーバーの起動が90秒以内に完了しませんでした。");
}

export async function assertProfile() {
  try { await access(profileDir); }
  catch { throw new Error("ログインセッションがありません。先に npm run guide:login を実行してください。"); }
}

export function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "screen";
}

export function requestedGuide(args = process.argv.slice(2)) {
  const named = args.find((arg) => arg.startsWith("--guide="));
  if (named) return named.slice("--guide=".length);
  const index = args.indexOf("--guide");
  if (index >= 0) return args[index + 1] || null;
  return args.find((arg) => !arg.startsWith("-")) || null;
}

export async function settlePage(page, waitFor = "main") {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
  if (waitFor) await page.locator(waitFor).first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  if (new URL(page.url()).pathname.startsWith("/login")) {
    throw new Error("ログイン画面へ戻されました。npm run guide:login で再ログインしてください。");
  }
}

export async function addCaptureStyles(page, hideSelectors = []) {
  const selectors = [
    "[data-guide-private]",
    ...hideSelectors,
  ].filter(Boolean);
  if (!selectors.length) return;
  await page.addStyleTag({ content: `${selectors.join(",")} { filter: blur(10px) !important; }` });
}
