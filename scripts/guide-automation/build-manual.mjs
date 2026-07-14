import { spawn } from "node:child_process";
import path from "node:path";
import { projectRoot, requestedGuide } from "./common.mjs";

function run(script, guideId) {
  return new Promise((resolve, reject) => {
    const args = [path.join(projectRoot, "scripts", "guide-automation", script)];
    if (guideId) args.push(guideId);
    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${script} failed: exit ${code}`)));
  });
}

const guideId = requestedGuide();
await run("capture.mjs", guideId);
await run("generate-gifs.mjs", guideId);
console.log(`ステップ別ガイドを更新しました${guideId ? `: ${guideId}` : ""}`);
