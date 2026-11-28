// Render one Remotion composition from any entry, reusing one bundle for several comps.
// usage: node tools/kz-render.mjs <entry.ts> <outdir> <Comp[:from-to]>... [--scale 1|0.5] [--conc 3] [--crf 16]
//   --scale 0.5 = fast preview (540x960). Output: <outdir>/<Comp>.mp4 (or <Comp>_<from>-<to>.mp4)
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const scale = Number(opt("--scale", "1")), conc = Number(opt("--conc", "3")), crf = Number(opt("--crf", "16"));
const [entry, outdir, ...comps] = args;
const chromiumOptions = { gl: process.env.GL || "swangle" };
const browserExecutable = process.env.BROWSER_EXECUTABLE || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
fs.mkdirSync(outdir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve(entry), publicDir: path.resolve("public") });
try {
  for (const spec of comps) {
    const [id, range] = spec.split(":");
    const composition = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable });
    const frameRange = range ? range.split("-").map(Number) : null;
    const out = path.join(outdir, range ? `${id}_${range}.mp4` : `${id}.mp4`);
    const t0 = Date.now();
    await renderMedia({ composition, serveUrl, codec: "h264", crf, scale, outputLocation: out, frameRange, concurrency: conc,
      chromiumOptions, browserExecutable, timeoutInMilliseconds: 600000, pixelFormat: "yuv420p" });
    console.log(`${out}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally {
  fs.rmSync(serveUrl, { recursive: true, force: true });
}
