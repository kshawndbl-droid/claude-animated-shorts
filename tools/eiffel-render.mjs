// usage: node _render.mjs <out.mp4> <comp> <from-to|all> <concurrency> [scale]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, comp = "BridgeShort", range = "all", conc = "2", scaleArg = "4/3"] = process.argv.slice(2);
const chromiumOptions = { gl: process.env.GL || "swangle" };
const browserExecutable = process.env.BROWSER_EXECUTABLE || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/eiffel/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions, browserExecutable });
const frameRange = range === "all" ? null : range.split("-").map(Number);
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, scale: eval(scaleArg), outputLocation: out, frameRange,
  concurrency: Number(conc), chromiumOptions, browserExecutable, timeoutInMilliseconds: 600000,
  onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 25) { last = renderedFrames; console.log(new Date().toISOString(), "frames", renderedFrames, ((Date.now() - t0) / 1000).toFixed(0) + "s"); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
