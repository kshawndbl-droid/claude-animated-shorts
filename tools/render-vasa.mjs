// Chunked render of the Vasa short: one muted chunk per shot (so a restart resumes where it stopped), the lens-blur
// passes only in the shots that use depth of field (the slowest optional pass), then ffmpeg joins the chunks and
// muxes the soundtrack (public/vasa/mix.wav).
// usage: node tools/render-vasa.mjs <outDir> [scale=1] [crf=16]
// Env: BROWSER_EXECUTABLE, REMOTION_GL (swangle without GPU), REMOTION_TMP.
import fs from "node:fs";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const [outDir, scaleS = "1", crfS = "16"] = process.argv.slice(2);
const scale = Number(scaleS), crf = Number(crfS);
fs.mkdirSync(outDir, { recursive: true });
const FPS = 30;
// shot list mirrors templates/vasa/vstory.ts (a, b in seconds; dof = lens blur on)
const SHOTS = [[0, 5.25], [5.25, 8.35], [8.35, 13.9, 1], [13.9, 19.1], [19.1, 23.8], [23.8, 28.8, 1], [28.8, 34.1], [34.1, 38.7], [38.7, 40.6],
  [40.6, 44.8], [44.8, 50.4], [50.4, 56.1], [56.1, 60.5], [60.5, 63.8], [63.8, 66.2], [66.2, 69.9], [69.9, 75.0]];
const TOTAL = Math.round(75 * FPS);
const log = (s) => { fs.appendFileSync(path.join(outDir, "progress.log"), s + "\n"); console.log(s); };

const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
const chromiumOptions = { gl: process.env.REMOTION_GL || "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
let done = 0;
const t0 = Date.now();
for (let i = 0; i < SHOTS.length; i++) {
  const [a, b, dof] = SHOTS[i];
  const f0 = Math.round(a * FPS), f1 = Math.min(TOTAL, Math.round(b * FPS)) - 1;
  const file = path.join(outDir, `shot${String(i + 1).padStart(2, "0")}.mp4`);
  if (fs.existsSync(file)) { done += f1 - f0 + 1; log(`skip shot ${i + 1} (exists) total ${done}/${TOTAL}`); continue; }
  const inputProps = { withAudio: false, post: { lens: !!dof, audio: false } };
  const composition = await selectComposition({ serveUrl, id: "VasaShort", chromiumOptions, browserExecutable, inputProps });
  let last = 0;
  await renderMedia({ composition, serveUrl, codec: "h264", crf, scale, outputLocation: file + ".part.mp4", frameRange: [f0, f1], muted: true,
    concurrency: 1, chromiumOptions, browserExecutable, inputProps, timeoutInMilliseconds: 900000,
    onProgress: ({ renderedFrames }) => { if (renderedFrames - last >= 15) { last = renderedFrames; log(`shot ${i + 1}: ${done + renderedFrames}/${TOTAL} frames, ${((Date.now() - t0) / 60000).toFixed(1)} min`); } } });
  fs.renameSync(file + ".part.mp4", file);
  done += f1 - f0 + 1;
  log(`shot ${i + 1} done: ${done}/${TOTAL} frames, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
// join + soundtrack
const list = path.join(outDir, "chunks.txt");
fs.writeFileSync(list, SHOTS.map((_, i) => `file 'shot${String(i + 1).padStart(2, "0")}.mp4'`).join("\n") + "\n");
const out = path.join(outDir, "vasa-short.mp4");
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-i", path.resolve("public/vasa/mix.wav"),
  "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out]);
log(`DONE ${out}`);
