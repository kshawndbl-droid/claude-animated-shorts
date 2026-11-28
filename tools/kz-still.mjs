// Render PNG stills of compositions (one bundle for all): node tools/kz-still.mjs <entry.ts> <outdir> <Comp:frame>...
// Output: <outdir>/<Comp>_<frame>.png. Used for catalog sheets, frame checks and pixel-exact regression tests.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [entry, out, ...specs] = process.argv.slice(2);
const chromiumOptions = { gl: process.env.GL || "swangle" };
const browserExecutable = process.env.BROWSER_EXECUTABLE || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve(entry), publicDir: path.resolve("public") });
try {
  for (const s of specs) {
    const [id, f = "0"] = s.split(":");
    const composition = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable });
    await renderStill({ composition, serveUrl, output: path.join(out, `${id}_${f}.png`), frame: Number(f), chromiumOptions, browserExecutable });
    console.log(path.join(out, `${id}_${f}.png`));
  }
} finally {
  fs.rmSync(serveUrl, { recursive: true, force: true });
}
