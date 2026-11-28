// Render a list of jobs through one Remotion bundle (used by tools/kz.py).
// usage: node tools/kz-remotion.mjs <entry.ts> <jobs.json>
// jobs.json: [{ "comp": "KzScene", "props": {...}, "out": "x.mp4", "scale": 1, "crf": 16, "conc": 4, "muted": true }]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [entry, jobsFile] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf8"));
const chromiumOptions = { gl: process.env.GL || "swangle" };
const browserExecutable = process.env.BROWSER_EXECUTABLE || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve(entry), publicDir: path.resolve("public") });
try {
  for (const j of jobs) {
    const composition = await selectComposition({ serveUrl, id: j.comp, inputProps: j.props ?? {}, chromiumOptions, browserExecutable });
    fs.mkdirSync(path.dirname(j.out), { recursive: true });
    const t0 = Date.now();
    await renderMedia({ composition, serveUrl, inputProps: j.props ?? {}, codec: "h264", crf: j.crf ?? 16, scale: j.scale ?? 1,
      outputLocation: j.out, concurrency: j.conc ?? 4, muted: !!j.muted, chromiumOptions, browserExecutable,
      timeoutInMilliseconds: 600000, pixelFormat: "yuv420p" });
    console.log(`rendered ${j.out} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally {
  fs.rmSync(serveUrl, { recursive: true, force: true });
}
