import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [comp, ...frames] = process.argv.slice(2);
const chromiumOptions = { gl: "swangle" };
const be = process.env.BROWSER_EXECUTABLE;
const serveUrl = await bundle({ entryPoint: path.resolve("src/eiffel/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions, browserExecutable: be });
for (const f of frames) { await renderStill({ composition, serveUrl, frame: Number(f), output: `/tmp/claude-0/st_${f}.png`, scale: 0.4, chromiumOptions, browserExecutable: be }); console.log("ok", f); }
