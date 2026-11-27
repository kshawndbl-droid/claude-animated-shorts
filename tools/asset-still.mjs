// Render one still of the asset check: node tools/asset-still.mjs <out.jpg> [AssetToon|AssetRaw] [scale=0.5]
// Env: BROWSER_EXECUTABLE, REMOTION_GL (as in templates/scripts/bridge-stills.mjs).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, id = "AssetToon", scale = "0.5"] = process.argv.slice(2);
const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
const chromiumOptions = { gl: process.env.REMOTION_GL || "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/asset-test/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable });
const t0 = Date.now();
await renderStill({ composition, serveUrl, frame: 0, output: out, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale), chromiumOptions, browserExecutable,
  timeoutInMilliseconds: 300000, onBrowserLog: (l) => { if (l.type === "error") console.log("[error]", l.text.slice(0, 300)); } });
console.log("still", id, ((Date.now() - t0) / 1000).toFixed(1) + "s");
