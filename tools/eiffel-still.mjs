// node tools/eiffel-still.mjs <out.png> <CompId> [frame=0] [scale=0.5]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, id, frame = "0", scale = "0.5"] = process.argv.slice(2);
const browserExecutable = process.env.BROWSER_EXECUTABLE || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/eiffel/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable });
for (const f of frame.split(",")) {
  const o = frame.includes(",") ? out.replace(/(\.\w+)$/, `_${f}$1`) : out;
  await renderStill({ composition, serveUrl, frame: Number(f), output: o, scale: Number(scale), chromiumOptions, browserExecutable, timeoutInMilliseconds: 300000,
    onBrowserLog: (l) => { if (l.type === "error") console.log("[error]", l.text.slice(0, 300)); } });
  console.log("still", o);
}
