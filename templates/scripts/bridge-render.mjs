// Final render of the bridge short at 1440x2560 (the 1080x1920 composition at exactly 4/3 scale).
// usage: node templates/scripts/bridge-render.mjs <out.mp4> [composition=BridgeShort] [from-to|all] [concurrency]
//   BridgeShort = picture + public/bridge/mix.wav, BridgePicture = picture only (for rendering in chunks).
// Why not `npx remotion render ... --scale 1.3333`: 1920 x 1.3333 = 2559.94, which Remotion rejects
// ("height ... must be an integer"). 4/3 gives exactly 1440x2560.
// Env: BROWSER_EXECUTABLE, REMOTION_GL ("angle" with a GPU, "swangle" without), REMOTION_TMP (big drive for bundles).
import fs from "node:fs";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, id = "BridgeShort", range = "all", conc = "1"] = process.argv.slice(2);
const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
const chromiumOptions = { gl: process.env.REMOTION_GL || "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable });
const frameRange = range === "all" ? null : range.split("-").map(Number);
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, scale: 4 / 3, outputLocation: out, frameRange,
  concurrency: Number(conc), chromiumOptions, browserExecutable, timeoutInMilliseconds: 600000,
  onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 25) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } } });
console.log("done", out, ((Date.now() - t0) / 1000).toFixed(0) + "s");
