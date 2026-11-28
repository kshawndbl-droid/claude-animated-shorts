// Render a few time ranges of a composition (muted, one chunk each), join them and cut the matching soundtrack pieces.
// usage: node tools/render-clip.mjs <outDir> <compId> <a-b,a-b,...seconds> [scale=0.5] [audio.wav] [propsJSON]
import fs from "node:fs";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [outDir, id, rangesS, scaleS = "0.5", audio = "", propsS = "{}"] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const FPS = 30, ranges = rangesS.split(",").map((r) => r.split("-").map(Number));
const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined, chromiumOptions = { gl: process.env.REMOTION_GL || "angle" };
const inputProps = JSON.parse(propsS);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const t0 = Date.now(), parts = [];
for (let i = 0; i < ranges.length; i++) {
  const [a, b] = ranges[i], f = path.join(outDir, `part${i}.mp4`); parts.push(f);
  if (fs.existsSync(f)) continue;
  const composition = await selectComposition({ serveUrl, id, chromiumOptions, browserExecutable, inputProps });
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 18, scale: Number(scaleS), outputLocation: f + ".part.mp4", frameRange: [Math.round(a * FPS), Math.round(b * FPS) - 1],
    muted: true, concurrency: 1, chromiumOptions, browserExecutable, inputProps, timeoutInMilliseconds: 900000,
    onProgress: ({ renderedFrames }) => { if (renderedFrames % 30 === 0) console.log(`part ${i + 1}/${ranges.length}: ${renderedFrames} frames, ${((Date.now() - t0) / 60000).toFixed(1)} min`); } });
  fs.renameSync(f + ".part.mp4", f);
}
const list = path.join(outDir, "parts.txt"); fs.writeFileSync(list, parts.map((p) => `file '${path.basename(p)}'`).join("\n") + "\n");
const out = path.join(outDir, "clip.mp4");
if (audio) {
  const fc = ranges.map(([a, b], i) => `[1:a]atrim=${a}:${b},asetpts=PTS-STARTPTS[a${i}]`).join(";") + ";" + ranges.map((_, i) => `[a${i}]`).join("") + `concat=n=${ranges.length}:v=0:a=1[aa]`;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-i", audio, "-filter_complex", fc, "-map", "0:v", "-map", "[aa]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]);
} else execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out]);
console.log("DONE", out);
