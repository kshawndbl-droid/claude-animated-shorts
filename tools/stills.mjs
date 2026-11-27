// usage: node tools/stills.mjs <comp> <outdir> <frame,frame,...> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [comp, outDir, frames, scale = "0.5"] = process.argv.slice(2);
const chromiumOptions = { gl: process.env.GL || "swangle" };
const browserExecutable = process.env.BROWSER_EXECUTABLE || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/eiffel/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions, browserExecutable });
for (const f of frames.split(",").map(Number))
  await renderStill({ composition, serveUrl, frame: f, output: path.join(outDir, `f${String(f).padStart(4, "0")}.png`), scale: Number(scale), chromiumOptions, browserExecutable });
console.log("ok");
