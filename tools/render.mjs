// Render any composition (new shorts and previews; the bridge keeps templates/scripts/bridge-render.mjs).
// usage: node tools/render.mjs <out.mp4|out.png> <composition> [from-to|all|still@frame] [concurrency] [scale] [propsJSON]
// Env: BROWSER_EXECUTABLE, REMOTION_GL (swangle without GPU), REMOTION_TMP.
import fs from "node:fs";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, id, range = "all", conc = "4", scale = "1", props = "{}"] = process.argv.slice(2);
const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
const chromiumOptions = { gl: process.env.REMOTION_GL || "angle" };
const inputProps = JSON.parse(props);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable, inputProps });
const t0 = Date.now(); let last = 0;
if (range.startsWith("still@")) {
  for (const f of range.slice(6).split(",").map(Number)) {
    const o = out.replace(/\.png$/, `-${f}.png`);
    await renderStill({ composition, serveUrl, output: o, frame: f, scale: Number(scale), chromiumOptions, browserExecutable, inputProps });
    console.log("still", o);
  }
} else {
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, scale: Number(scale), outputLocation: out,
    frameRange: range === "all" ? null : range.split("-").map(Number), concurrency: Number(conc), chromiumOptions,
    browserExecutable, inputProps, timeoutInMilliseconds: 600000, audioBitrate: "192k",
    onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 50) { last = renderedFrames; console.log("frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } } });
}
console.log("done", out, ((Date.now() - t0) / 1000).toFixed(0) + "s");
