import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { projectRoot, requestedGuide } from "./common.mjs";
import { guideSteps } from "./guide-steps.config.mjs";

const run = promisify(execFile);
const sourceRoot = path.join(projectRoot, "outputs", "guide-capture", "screenshots");
const outputRoot = path.join(projectRoot, "public", "guide-gifs");
const imageOutputRoot = path.join(projectRoot, "public", "guide-images");
const tempRoot = path.join(projectRoot, "outputs", "guide-capture", "gif-frames");
const generatedFile = path.join(projectRoot, "src", "lib", "generated-guide-steps.json");
const captureManifestFile = path.join(projectRoot, "outputs", "guide-capture", "manifest.json");
const requested = requestedGuide();
const selected = requested ? Object.entries(guideSteps).filter(([id]) => id === requested) : Object.entries(guideSteps);
if (!selected.length) throw new Error(`対象ガイドがありません: ${requested}`);

const captureManifest = JSON.parse(await readFile(captureManifestFile, "utf8"));
const capturedViews = new Map();
for (const target of captureManifest.targets ?? []) {
  for (const view of target.views ?? []) {
    capturedViews.set(`${target.guideId}/${path.basename(view.screenshotPath)}`, view);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 560 }, deviceScaleFactor: 1 });
const manifest = {};

try {
  for (const [guideId, steps] of selected) {
    manifest[guideId] = [];
    const guideOutputDir = path.join(outputRoot, guideId);
    const guideImageOutputDir = path.join(imageOutputRoot, guideId);
    await rm(guideOutputDir, { recursive: true, force: true });
    await rm(guideImageOutputDir, { recursive: true, force: true });
    await mkdir(guideOutputDir, { recursive: true });
    await mkdir(guideImageOutputDir, { recursive: true });
    for (const [stepIndex, step] of steps.entries()) {
      if (step.comingSoon) {
        manifest[guideId].push({ key: step.key, title: step.title, description: step.description, comingSoon: true });
        console.log(`[${guideId}] ${step.title}`);
        continue;
      }
      const sourcePath = path.join(sourceRoot, step.image);
      if (step.staticImage) {
        const imageName = `${String(stepIndex + 1).padStart(2, "0")}-${step.key}.png`;
        await copyFile(sourcePath, path.join(guideImageOutputDir, imageName));
        manifest[guideId].push({
          key: step.key,
          title: step.title,
          description: step.description,
          details: step.details,
          mediaType: "image",
          src: `/guide-images/${guideId}/${imageName}`,
        });
        console.log(`[${guideId}] ${step.title}`);
        continue;
      }
      const frameDir = path.join(tempRoot, guideId, step.key);
      const outputPath = path.join(outputRoot, guideId, `${String(stepIndex + 1).padStart(2, "0")}-${step.key}.gif`);
      await rm(frameDir, { recursive: true, force: true });
      await mkdir(frameDir, { recursive: true });
      const sourceUrl = `data:image/png;base64,${(await readFile(sourcePath)).toString("base64")}`;
      await page.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}html,body{margin:0;background:#f8fafc;overflow:hidden}#stage{position:relative;overflow:hidden}#shot{display:block;width:100%;height:100%;object-fit:fill}.focus{position:absolute;border:4px solid #f97316;border-radius:12px;box-shadow:0 0 0 3px rgba(255,255,255,.92),0 8px 25px rgba(249,115,22,.35);pointer-events:none}.cursor{position:absolute;width:34px;height:42px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35));z-index:4}.pulse{position:absolute;width:20px;height:20px;border:4px solid #f97316;border-radius:999px;z-index:3;transform:translate(-50%,-50%)}.label{position:absolute;left:16px;bottom:16px;z-index:5;max-width:70%;padding:9px 14px;border-radius:10px;background:rgba(15,23,42,.92);color:white;font:700 16px/1.35 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.2)}</style></head><body><div id="stage"><img id="shot" src="${sourceUrl}"><div class="focus"></div><svg class="cursor" viewBox="0 0 32 40"><path d="M3 2v30l8-8 6 13 6-3-6-13h11z" fill="white" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/></svg><div class="pulse"></div><div class="label"></div></div></body></html>`);
      await page.waitForFunction(() => { const image = document.querySelector("#shot"); return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0; });
      const dimensions = await page.$eval("#shot", image => ({ width: image.naturalWidth, height: image.naturalHeight }));
      const width = 800;
      const padding = 12;
      const imageWidth = width - padding * 2;
      const imageHeight = Math.max(336, Math.round(imageWidth * dimensions.height / dimensions.width));
      const height = imageHeight + padding * 2;
      await page.setViewportSize({ width, height });
      const capturedView = capturedViews.get(step.image);
      const capturedTarget = capturedView?.highlights?.find((item) => item.key === step.highlightKey);
      if (!capturedTarget && !step.target) {
        throw new Error(`${guideId}/${step.key}: 撮影した対象座標がありません (${step.highlightKey})`);
      }
      const coordinateWidth = capturedView?.captureBox?.width ?? dimensions.width;
      const coordinateHeight = capturedView?.captureBox?.height ?? dimensions.height;
      const sourceTarget = capturedTarget
        ? [
            Math.max(0, capturedTarget.x - 7) / coordinateWidth,
            Math.max(0, capturedTarget.y - 7) / coordinateHeight,
            Math.min(coordinateWidth - Math.max(0, capturedTarget.x - 7), capturedTarget.width + 14) / coordinateWidth,
            Math.min(coordinateHeight - Math.max(0, capturedTarget.y - 7), capturedTarget.height + 14) / coordinateHeight,
          ]
        : step.target;
      const [tx, ty, tw, th] = sourceTarget;
      await page.evaluate(({ width, height, tx, ty, tw, th, title }) => {
        const padding = 12;
        const imageWidth = width - padding * 2;
        const imageHeight = height - padding * 2;
        const stage = document.querySelector("#stage");
        const shot = document.querySelector("#shot");
        const focus = document.querySelector(".focus");
        const label = document.querySelector(".label");
        Object.assign(stage.style, { width: `${width}px`, height: `${height}px` });
        Object.assign(shot.style, { position: "absolute", left: `${padding}px`, top: `${padding}px`, width: `${imageWidth}px`, height: `${imageHeight}px` });
        Object.assign(focus.style, { left: `${padding + tx * imageWidth}px`, top: `${padding + ty * imageHeight}px`, width: `${tw * imageWidth}px`, height: `${th * imageHeight}px` });
        label.textContent = title;
      }, { width, height, tx, ty, tw, th, title: `STEP ${stepIndex + 1}　${step.title}` });
      const frameCount = 20;
      for (let frame = 0; frame < frameCount; frame += 1) {
        const progress = frame / (frameCount - 1);
        const eased = progress < 0.75 ? 1 - Math.pow(1 - progress / 0.75, 3) : 1;
        const click = Math.max(0, (progress - 0.76) / 0.24);
        await page.evaluate(({ eased, click, width, height, tx, ty, tw, th }) => {
          const cursor = document.querySelector(".cursor");
          const pulse = document.querySelector(".pulse");
          const padding = 12;
          const imageWidth = width - padding * 2;
          const imageHeight = height - padding * 2;
          const targetX = padding + (tx + tw * .52) * imageWidth;
          const targetY = padding + (ty + th * .52) * imageHeight;
          const hotspotX = 3;
          const hotspotY = 2;
          const x = 55 + (targetX - hotspotX - 55) * eased;
          const y = 60 + (targetY - hotspotY - 60) * eased;
          Object.assign(cursor.style, { left: `${x}px`, top: `${y}px`, transform: click > .15 && click < .55 ? "scale(.82)" : "scale(1)" });
          Object.assign(pulse.style, { left: `${targetX}px`, top: `${targetY}px`, opacity: `${click > 0 ? 1 - click : 0}`, transform: `translate(-50%,-50%) scale(${.4 + click * 2.2})` });
        }, { eased, click, width, height, tx, ty, tw, th });
        await page.screenshot({ path: path.join(frameDir, `frame-${String(frame).padStart(3, "0")}.png`) });
      }
      await run("ffmpeg", ["-y", "-framerate", "8", "-i", path.join(frameDir, "frame-%03d.png"), "-filter_complex", "[0:v]split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4", "-loop", "0", outputPath], { windowsHide: true, maxBuffer: 1024 * 1024 * 8 });
      await rm(frameDir, { recursive: true, force: true });
      manifest[guideId].push({ key: step.key, title: step.title, description: step.description, details: step.details, mediaType: "gif", src: `/guide-gifs/${guideId}/${path.basename(outputPath)}` });
      console.log(`[${guideId}] ${step.title}`);
    }
  }
} finally {
  await browser.close();
}

let combined = manifest;
if (requested) {
  try {
    const current = JSON.parse(await readFile(generatedFile, "utf8"));
    combined = { ...current, ...manifest };
  } catch {}
}
await writeFile(generatedFile, `${JSON.stringify(combined, null, 2)}\n`, "utf8");
console.log(`GIF生成完了: ${outputRoot}`);
