// "The Pig War, 1859": a mostly-2D cartoon short with its own look: misty Pacific Northwest island, dark fir forests,
// a snowy volcano on the horizon, hand-painted wooden signs as the caption device, 2D rubber-hose soldiers and settlers
// (cartoon/figure.ts) and one star: a 2D pig (cartoon/pig.ts). The British steam frigates are the 3D props
// (cartoon/Ship3D.tsx) in a transparent three.js layer locked to the same 2.5D camera. Every shot is a pure function
// of time, cut on the narration's timings.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import { actor, settle, drawFigure, Look, Pose, Actor, Hold } from "../cartoon/figure";
import { makePig, settlePig, drawPig, Pig, PigPose } from "../cartoon/pig";
import { ShipLayer, ShipState } from "../cartoon/Ship3D";
import { rng } from "../bridge/paint";
import {
  Ctx, Cam, W, H, INK, cam0, proj, camTransform, at, outline, sky, cloud, ground, hills, fence,
  speedLines, burst, popText, clamp01, smooth, lerp, easeOutBack,
} from "../cartoon/stage";
import lines from "../../stories/pig-war/lines.json";
import words from "../../stories/pig-war/words.json";

export const FPS = 30;
const LINES = lines as { start: number; end: number; text: string }[];
const WORDS = words as Word[];
export const PIG_TOTAL = Math.ceil((LINES[LINES.length - 1].end + 1.8) * FPS);
export const PIG_KEYWORDS = ["pig", "america", "britain", "british", "americans", "war", "island", "potatoes", "shot", "army", "warships", "cannons", "pickett", "admiral", "squabble", "stayed", "twelve", "kaiser", "casualties", "hudsons"];
export const pigSubStyle = defaultStyle("funny", { keyWords: PIG_KEYWORDS });

const LEAD = 0.25;
export const SHOTS = LINES.map((l, i) => ({ i, a: i === 0 ? 0 : l.start - LEAD, b: i === LINES.length - 1 ? PIG_TOTAL / FPS : LINES[i + 1].start - LEAD }));
const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
function wt(li: number, word: string, n = 0) {
  const ws = WORDS.filter((w) => w.line === li && norm(w.w) === norm(word));
  return ws[n]?.s ?? LINES[li].start;
}
const since = (t: number, t0: number, d = 0.25) => clamp01((t - t0) / d);
function camFor(x: number, z: number, hPx: number, y = 1.3, feet = 1130, o: Partial<Cam> = {}): Cam {
  const k = 260, f = 10, s = hPx / 1.9, d = (k * f) / s;
  return cam0({ x, y, z: z - d, k, f, tilt: feet - H / 2 - y * s, ...o });
}

// ---------------- cast ----------------
const BLUE = "#2f4a8a", SKY_BLUE = "#9fb6d8", RED = "#c23a32";
const L_US: Look = { coat: BLUE, pants: SKY_BLUE, hat: "kepi", hatCol: "#2a3a6a", hair: "#5a3a22", skin: "#f3c9a0", pockets: true };
const L_US2: Look = { coat: BLUE, pants: SKY_BLUE, hat: "kepi", hatCol: "#2a3a6a", hair: "#2b1b12", moustache: "#2b1b12", skin: "#e9b58a", pockets: true };
const L_UK: Look = { coat: RED, pants: "#2a2a34", hat: "shako", hatCol: "#1f1c22", hair: "#c99a4b", skin: "#f6d3b1", collar: true };
const L_UK2: Look = { coat: RED, pants: "#2a2a34", hat: "shako", hatCol: "#1f1c22", hair: "#6b3f22", moustache: "#6b3f22", skin: "#f1c6a0", collar: true, belly: 1.1 };
const L_CUTLAR: Look = { coat: "#c9b48a", pants: "#4a5a7a", hat: "wide", hatCol: "#d9b86a", vest: "#7a4a2a", beard: "#7a4a22", hair: "#7a4a22", skin: "#e9b58a" };
const L_GRIFFIN: Look = { coat: "#3a2f2a", pants: "#5a4e44", hat: "tall", hatCol: "#1f1c22", tie: "#c8b47a", hair: "#9a7a5a", beard: "#9a7a5a", skin: "#f3c9a0", belly: 1.18 };
const L_PICKETT: Look = { coat: BLUE, pants: SKY_BLUE, hat: "wide", hatCol: "#1f1c22", hair: "#8a5a2a", moustache: "#8a5a2a", beard: "#8a5a2a", skin: "#f1c6a0", sash: "#c8262a", pockets: true };
const L_BAYNES: Look = { coat: "#1f2a4a", pants: "#efe8d8", hat: "admiral", hatCol: "#1f1c22", plume: "none", hair: "#e9e4da", beard: "#e9e4da", skin: "#f1c6a0", belly: 1.15, medal: true };
const L_KAISER: Look = { coat: "#2a3340", pants: "#1f2430", hat: "spike", hatCol: "#1f1c22", hair: "#e9e4da", moustache: "#e9e4da", beard: "#e9e4da", skin: "#f1c6a0", sash: "#e2b847", medal: true, belly: 1.1 };
const L_SETTLER: Look[] = [
  { coat: "#9a6a4a", pants: "#3e4a5c", hat: "wide", hatCol: "#6a4a2a", hair: "#2b1b12", skin: "#d79c72" },
  { coat: "#7a8a5a", pants: "#4a3a2a", hat: "bowler", hatCol: "#3a2a20", hair: "#c06a2c", skin: "#f6d3b1", vest: "#5a3a2a" },
];
const US = actor(L_US, 1), US2 = actor(L_US2, 2), UK = actor(L_UK, 3), UK2 = actor(L_UK2, 4), CUT = actor(L_CUTLAR, 5), GRIF = actor(L_GRIFFIN, 6), PICK = actor(L_PICKETT, 7), BAY = actor(L_BAYNES, 8), KAI = actor(L_KAISER, 9);
const SET = L_SETTLER.map((L, i) => actor(L, 20 + i));
const TROOP: Actor[] = Array.from({ length: 24 }, (_, i) => actor(i % 2 ? L_US : L_US2, 100 + i));
const PIG = makePig(3); PIG.skin = "#f4a9b4"; PIG.spots = "#7a4a3a";

type Item = { z: number; draw: (g: Ctx) => void };
type Shot = { cam: Cam; bg: (g: Ctx) => void; items: Item[]; fg?: (g: Ctx) => void; ships?: ShipState[] };

function shadow(g: Ctx, r: number) { g.fillStyle = "rgba(20,40,30,0.25)"; g.beginPath(); g.ellipse(0, 0, r, r * 0.22, 0, 0, 7); g.fill(); }
function person(c: Cam, A: Actor, poseAt: (t: number) => Pose, t: number, t0: number, x: number, z: number, view: "side" | "front" | "back", dir = 1, y = 0, hold?: Hold): Item {
  return { z, draw: (g) => { const st = settle(A, poseAt, t, t0); g.save(); const s = at(g, c, x, y, z); if (s) { if (y < 0.3) shadow(g, 0.55); drawFigure(g, A, st, t, view, dir, 1, outline(s), hold); } g.restore(); } };
}
function piggy(c: Cam, poseAt: (t: number) => PigPose, t: number, t0: number, x: number, z: number, view: "side" | "front", dir = 1, y = 0, sc = 1): Item {
  return { z, draw: (g) => { const st = settlePig(PIG, poseAt, t, t0); g.save(); const s = at(g, c, x, y, z, sc); if (s) { if (y < 0.2) shadow(g, 0.5); drawPig(g, PIG, st, t, view, dir, 1, outline(s * sc)); } g.restore(); } };
}
const dirOf = (h: [number, number], e: [number, number]) => { const dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
/** a rifle-musket with a bayonet, held in the hand along the forearm (aim tilts it) */
const rifle = (aim = 0, bayonet = true): Hold => (g, h, e, side, far) => {
  if (far) return;
  const [dx, dy] = dirOf(h, e); const a = Math.atan2(dy, dx) + aim * side;
  g.save(); g.translate(h[0], h[1]); g.rotate(a); g.lineCap = "round";
  const seg = (x0: number, x1: number, w: number, col: string) => { g.strokeStyle = INK; g.lineWidth = w + 0.06; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x1, 0); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x1, 0); g.stroke(); };
  seg(-0.5, 0.4, 0.1, "#8a5a32"); seg(0.2, 1.05, 0.045, "#6e7378"); if (bayonet) seg(1.05, 1.4, 0.02, "#d0d4d8");
  g.restore();
};
const cup: Hold = (g, h, _e, side, far) => { if (far || side < 0) return; g.save(); g.translate(h[0], h[1] + 0.05); const p = new Path2D(); p.rect(-0.06, 0, 0.12, 0.16); g.strokeStyle = INK; g.lineWidth = 0.035; g.stroke(p); g.fillStyle = "#d9d4cc"; g.fill(p); g.fillStyle = "#c98a3a"; g.fillRect(-0.05, 0.1, 0.1, 0.04); g.restore(); };
const scroll = (text: string): Hold => (g, h, _e, side, far) => { if (far || side < 0) return; g.save(); g.translate(h[0] + 0.1, h[1] - 0.1); const p = new Path2D(); p.rect(0, -0.25, 0.42, 0.55); g.strokeStyle = INK; g.lineWidth = 0.03; g.stroke(p); g.fillStyle = "#f6edd6"; g.fill(p); g.scale(1, -1); g.fillStyle = "#c8262a"; g.font = "800 0.09px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.fillText(text, 0.21, -0.1); g.fillStyle = "#b9a888"; g.fillRect(0.06, 0.0, 0.3, 0.025); g.fillRect(0.06, 0.07, 0.25, 0.025); g.restore(); };

// ---------------- the island ----------------
const PAL = {
  day: { top: "#4f93cf", mid: "#a9cfe6", low: "#e6f0ea", near: "#6f9a4e", far: "#93b467", hill1: "#3f6a44", hill2: "#7d98b4", tree: "#2f5a3a", treeD: "#21432b", sea: "#3a7aa6", seaFar: "#7fb0cf" },
  mist: { top: "#7f9fb8", mid: "#c4d4dc", low: "#e8ecea", near: "#6c8f55", far: "#9fb08a", hill1: "#4a6a52", hill2: "#9aaabb", tree: "#3a5a44", treeD: "#2b4433", sea: "#4f7f9a", seaFar: "#a2bccb" },
  dusk: { top: "#3a3f78", mid: "#d98a8a", low: "#ffd29a", near: "#4f6a3e", far: "#8a845e", hill1: "#3c5238", hill2: "#7a6a84", tree: "#2c3f2e", treeD: "#1f2e22", sea: "#5a5a8a", seaFar: "#c99aa0" },
};
type Pal = typeof PAL.day;
function volcano(g: Ctx, c: Cam, x: number, z: number, h: number, col: string) {
  const p = proj(c, x, 0, z); if (!p) return; const s = p[2];
  g.save(); g.translate(p[0], p[1]); g.scale(s, -s);
  const m = new Path2D(); m.moveTo(-h * 2.2, 0); m.quadraticCurveTo(-h * 0.5, h * 0.6, -h * 0.18, h); m.lineTo(h * 0.18, h); m.quadraticCurveTo(h * 0.5, h * 0.6, h * 2.2, 0); m.closePath();
  g.fillStyle = col; g.fill(m);
  const snow = new Path2D(); snow.moveTo(-h * 0.5, h * 0.62); snow.lineTo(-h * 0.18, h); snow.lineTo(h * 0.18, h); snow.lineTo(h * 0.55, h * 0.6); snow.lineTo(h * 0.3, h * 0.66); snow.lineTo(h * 0.12, h * 0.58); snow.lineTo(-h * 0.1, h * 0.68); snow.lineTo(-h * 0.3, h * 0.58); snow.closePath();
  g.fillStyle = "#f4f6f8"; g.fill(snow);
  g.restore();
}
function fir(g: Ctx, c: Cam, x: number, z: number, h: number, col: string, dark: string, t: number) {
  const p = proj(c, x, 0, z); if (!p) return; const s = p[2]; if (p[0] < -200 || p[0] > W + 200) return;
  g.save(); g.translate(p[0], p[1]); g.scale(s, -s); const OL = outline(s, 0.2, 4);
  const sw = Math.sin(t * 0.7 + x) * 0.015 * h;
  g.fillStyle = "#4a3426"; g.fillRect(-h * 0.03, 0, h * 0.06, h * 0.2);
  for (let i = 0; i < 4; i++) { const y0 = h * (0.12 + i * 0.2), w = h * (0.32 - i * 0.065); const tri = new Path2D(); tri.moveTo(-w, y0); tri.lineTo(sw * (i + 1) * 0.4, y0 + h * 0.34); tri.lineTo(w, y0); tri.closePath(); g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(tri); g.fillStyle = i % 2 ? col : dark; g.fill(tri); }
  g.restore();
}
function forest(g: Ctx, c: Cam, t: number, P: Pal, seed: number, z0 = 40, z1 = 90, n = 40) {
  const r = rng(seed); const list: [number, number, number][] = [];
  for (let i = 0; i < n; i++) list.push([c.x * 0.7 + (r() - 0.5) * 140, z0 + r() * (z1 - z0), 9 + r() * 8]);
  list.sort((a, b) => b[1] - a[1]); for (const [x, z, h] of list) fir(g, c, x, z, h, P.tree, P.treeD, t);
}
function sea(g: Ctx, c: Cam, t: number, P: Pal, zFrom = 8) {
  // the sea fills the ground from zFrom out to the horizon; small wave dashes
  const hy = H / 2 + c.tilt; const p0 = proj(c, 0, 0, zFrom); const y0 = p0 ? p0[1] : H;
  const gr = g.createLinearGradient(0, hy, 0, Math.min(H, y0)); gr.addColorStop(0, P.seaFar); gr.addColorStop(1, P.sea);
  g.fillStyle = gr; g.fillRect(-300, hy, W + 600, Math.max(0, y0 - hy) + 2);
  const r = rng(77); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineCap = "round";
  for (let i = 0; i < 70; i++) { const x = c.x + (r() - 0.5) * 120, z = zFrom + 2 + r() * 150; const p = proj(c, x + Math.sin(t * 0.8 + i) * 0.5, 0, z); if (!p || p[1] > y0) continue; const w = p[2] * 0.8; g.lineWidth = Math.max(1, p[2] * 0.06); g.beginPath(); g.moveTo(p[0] - w, p[1]); g.quadraticCurveTo(p[0], p[1] - w * 0.25, p[0] + w, p[1]); g.stroke(); }
}
function island(g: Ctx, c: Cam, t: number, P: Pal, o: { seed?: number; seaFrom?: number; volc?: boolean; forest?: boolean } = {}) {
  sky(g, c, P.top, P.mid, P.low);
  const s = o.seed ?? 1;
  for (let i = 0; i < 4; i++) cloud(g, c, (i - 1.5) * 300 + Math.sin(i * 3 + s) * 80 + t * 2, 120 + (i % 2) * 50, 900 + i * 60, 90 + (i % 2) * 40, s * 10 + i, P === PAL.dusk ? "#ffd2c2" : "#ffffff", P === PAL.dusk ? "#d9909a" : "#d4e0ea");
  if (o.volc !== false) volcano(g, c, c.x * 0.2 + 120, 900, 260, P.hill2);
  hills(g, c, 700, 40, P.hill2, 3 + s);
  ground(g, c, P.near, P.far);
  if (o.seaFrom !== undefined) sea(g, c, t, P, o.seaFrom);
  if (o.forest !== false) forest(g, c, t, P, s + 40, o.seaFrom !== undefined ? 3 : 35, o.seaFrom !== undefined ? 6 : 80, o.seaFrom !== undefined ? 0 : 40);
  grass(g, c, s + 7, c.z + 3, c.z + 30);
}
function grass(g: Ctx, c: Cam, seed: number, z0: number, z1: number, n = 120) {
  const r = rng(seed); g.strokeStyle = "rgba(30,60,30,0.5)"; g.lineCap = "round";
  for (let i = 0; i < n; i++) { const x = c.x + (r() - 0.5) * 30, z = z0 + r() * (z1 - z0); const p = proj(c, x, 0, z); if (!p) continue; const s = p[2] * 0.12; if (s < 1) continue; g.lineWidth = Math.max(1, s * 0.2); g.beginPath(); g.moveTo(p[0] - s, p[1]); g.lineTo(p[0] - s * 1.3, p[1] - s); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] - s * 1.3); g.moveTo(p[0] + s, p[1]); g.lineTo(p[0] + s * 1.4, p[1] - s * 0.9); g.stroke(); }
}

// ---------------- 2D props + caption device ----------------
/** the caption device: a hand-painted wooden sign hanging on two ropes, swinging in */
function sign(g: Ctx, text: string, y: number, k: number, size = 70, col = "#fff3d6", wood = "#8a5a32") {
  if (k <= 0) return;
  g.save(); g.font = `800 ${size}px SubFont, Montserrat, Arial Black, sans-serif`;
  const w = Math.min(W - 100, g.measureText(text).width + 80), hh = size * 1.35;
  const drop = (1 - easeOutBack(k)) * -260, swing = Math.sin(k * 9) * 0.1 * (1 - k);
  g.translate(W / 2, y + drop); g.rotate(swing);
  g.strokeStyle = "#5a4030"; g.lineWidth = 5; g.beginPath(); g.moveTo(-w / 2 + 40, -hh / 2); g.lineTo(-w / 2 + 70, -hh / 2 - 220); g.moveTo(w / 2 - 40, -hh / 2); g.lineTo(w / 2 - 70, -hh / 2 - 220); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.roundRect(-w / 2 - 8, -hh / 2 - 8, w + 16, hh + 16, 14); g.fill();
  g.fillStyle = wood; g.beginPath(); g.roundRect(-w / 2, -hh / 2, w, hh, 10); g.fill();
  g.strokeStyle = "rgba(40,20,10,0.35)"; g.lineWidth = 3; for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo(-w / 2 + 6, -hh / 2 + (hh * i) / 3); g.lineTo(w / 2 - 6, -hh / 2 + (hh * i) / 3 + 4); g.stroke(); }
  g.fillStyle = "#3a2a1a"; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * (w / 2 - 22), 0, 7, 0, 7); g.fill(); }
  g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.strokeStyle = "#2a1a10"; g.lineWidth = 8; g.strokeText(text, 0, 4); g.fillStyle = col; g.fillText(text, 0, 4);
  g.restore();
}
function vignette(g: Ctx, a: number) { const gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); gr.addColorStop(0, "rgba(10,20,30,0)"); gr.addColorStop(1, `rgba(10,20,30,${a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
function usFlag(g: Ctx, x: number, y: number, w: number, t: number, k = 1) {
  if (k <= 0) return; const h = w * 0.6;
  g.save(); g.translate(x, y); g.scale(k, k);
  g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h * 2.2); g.stroke();
  g.save(); g.translate(0, -h * 2.2);
  const wave = (u: number) => Math.sin(u * 5 - t * 6) * h * 0.06 * u;
  for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#c8262a"; g.beginPath(); for (let j = 0; j <= 10; j++) { const u = j / 10; g.lineTo(u * w, (i * h) / 7 + wave(u)); } for (let j = 10; j >= 0; j--) { const u = j / 10; g.lineTo(u * w, ((i + 1) * h) / 7 + wave(u)); } g.closePath(); g.fill(); }
  g.fillStyle = "#2a3f8a"; g.fillRect(0, 0, w * 0.42, h * 0.55); g.fillStyle = "#fff"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w * 0.07 + (i % 3) * w * 0.13, h * 0.13 + Math.floor(i / 3) * h * 0.25, w * 0.025, 0, 7); g.fill(); }
  g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(0, 0, w, h);
  g.restore(); g.restore();
}
function ukFlag(g: Ctx, x: number, y: number, w: number, t: number, k = 1) {
  if (k <= 0) return; const h = w * 0.6;
  g.save(); g.translate(x, y); g.scale(k, k);
  g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h * 2.2); g.stroke();
  g.save(); g.translate(0, -h * 2.2 + Math.sin(t * 5) * 3);
  g.fillStyle = "#2a3f8a"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#fff"; g.lineWidth = h * 0.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  g.strokeStyle = "#c8262a"; g.lineWidth = h * 0.07; g.stroke();
  g.fillStyle = "#fff"; g.fillRect(w * 0.42, 0, w * 0.16, h); g.fillRect(0, h * 0.37, w, h * 0.26);
  g.fillStyle = "#c8262a"; g.fillRect(w * 0.46, 0, w * 0.08, h); g.fillRect(0, h * 0.42, w, h * 0.16);
  g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(0, 0, w, h);
  g.restore(); g.restore();
}
function cannon(g: Ctx, OL: number, recoil = 0) {
  const fo = (p: Path2D, col: string) => { g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(p); g.fillStyle = col; g.fill(p); };
  g.save(); g.translate(-recoil * 0.2, 0);
  const tr = new Path2D(); tr.moveTo(-0.7, 0.25); tr.lineTo(0.2, 0.45); tr.lineTo(0.2, 0.3); tr.lineTo(-0.7, 0.12); tr.closePath(); fo(tr, "#6a4426");
  const b = new Path2D(); b.moveTo(-0.55, 0.42); b.lineTo(0.95, 0.62); b.lineTo(0.95, 0.5); b.lineTo(-0.55, 0.26); b.closePath(); fo(b, "#3a3c40");
  const wh = new Path2D(); wh.arc(0, 0.3, 0.3, 0, 7); fo(wh, "#8a5a32"); g.strokeStyle = INK; g.lineWidth = 0.03; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * 0.27, 0.3 + Math.sin(a) * 0.27); g.lineTo(-Math.cos(a) * 0.27, 0.3 - Math.sin(a) * 0.27); g.stroke(); }
  g.restore();
}
function cannonItem(c: Cam, x: number, z: number, dir = 1, recoil = 0): Item { return { z, draw: (g) => { g.save(); const s = at(g, c, x, 0, z); if (s) { shadow(g, 0.6); if (dir < 0) g.scale(-1, 1); cannon(g, outline(s), recoil); } g.restore(); } }; }
function smokePuff(g: Ctx, x: number, y: number, k: number, size = 120) {
  if (k <= 0 || k >= 1) return;
  for (let i = 0; i < 7; i++) { const a = i * 0.9, r = size * (0.3 + k * 0.7) * (0.6 + (i % 3) * 0.2); g.fillStyle = `rgba(240,240,236,${0.9 * (1 - k)})`; g.beginPath(); g.arc(x + Math.cos(a) * size * k * 0.6, y + Math.sin(a) * size * k * 0.4 - k * 60, r * 0.6, 0, 7); g.fill(); }
}
function cabin(g: Ctx, c: Cam, x: number, z: number) {
  const p = proj(c, x, 0, z); if (!p) return; const s = p[2];
  g.save(); g.translate(p[0], p[1]); g.scale(s, -s); const OL = outline(s, 0.08, 5);
  const fo = (q: Path2D, col: string) => { g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(q); g.fillStyle = col; g.fill(q); };
  const wall = new Path2D(); wall.rect(-2.5, 0, 5, 2.6); fo(wall, "#9a6a42");
  g.strokeStyle = "rgba(40,20,10,0.5)"; g.lineWidth = 0.05; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(-2.5, i * 0.32); g.lineTo(2.5, i * 0.32); g.stroke(); }
  const roof = new Path2D(); roof.moveTo(-3, 2.6); roof.lineTo(0, 4.2); roof.lineTo(3, 2.6); roof.closePath(); fo(roof, "#5a4a3a");
  const door = new Path2D(); door.rect(-0.45, 0, 0.9, 1.8); fo(door, "#5a3a22");
  const win = new Path2D(); win.rect(1.0, 1.1, 0.8, 0.7); fo(win, "#f3d58a");
  g.restore();
}
function tradingPost(g: Ctx, c: Cam, x: number, z: number) {
  const p = proj(c, x, 0, z); if (!p) return; const s = p[2];
  g.save(); g.translate(p[0], p[1]); g.scale(s, -s); const OL = outline(s, 0.08, 5);
  const fo = (q: Path2D, col: string) => { g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(q); g.fillStyle = col; g.fill(q); };
  const wall = new Path2D(); wall.rect(-3.5, 0, 7, 3.4); fo(wall, "#efe2c2");
  const roof = new Path2D(); roof.moveTo(-3.9, 3.4); roof.lineTo(-3.2, 4.6); roof.lineTo(3.2, 4.6); roof.lineTo(3.9, 3.4); roof.closePath(); fo(roof, "#7a3a2a");
  const bd = new Path2D(); bd.rect(-2.6, 2.55, 5.2, 0.7); fo(bd, "#2a3a2a");
  g.save(); g.translate(0, 2.9); g.scale(1, -1); g.fillStyle = "#f3d58a"; g.font = "800 0.42px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("HUDSON'S BAY CO.", 0, 0.02); g.restore();
  const door = new Path2D(); door.rect(-0.5, 0, 1, 2); fo(door, "#5a3a22");
  for (const wx of [-2.6, 1.8]) { const w = new Path2D(); w.rect(wx, 0.9, 0.8, 0.9); fo(w, "#7fa6c0"); }
  g.restore();
}
function potatoPatch(g: Ctx, c: Cam, x0: number, x1: number, z0: number, z1: number, eaten: (x: number) => number) {
  for (let z = z1; z >= z0; z -= 0.7) for (let x = x0; x <= x1; x += 0.6) {
    const p = proj(c, x + (z * 0.3) % 0.3, 0, z); if (!p) continue; const s = p[2], e = eaten(x);
    g.fillStyle = "#6a4a2a"; g.beginPath(); g.ellipse(p[0], p[1], 0.32 * s, 0.07 * s, 0, 0, 7); g.fill();
    if (e < 1) { g.fillStyle = "#4f8a3a"; g.strokeStyle = INK; g.lineWidth = Math.min(4, s * 0.03); for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(p[0] + (i - 1) * 0.1 * s, p[1] - 0.18 * s * (1 - e), 0.09 * s, 0.13 * s * (1 - e), (i - 1) * 0.4, 0, 7); g.fill(); g.stroke(); } }
    else { g.fillStyle = "#c8a060"; g.beginPath(); g.ellipse(p[0] + 0.1 * s, p[1] - 0.03 * s, 0.07 * s, 0.05 * s, 0, 0, 7); g.fill(); }
  }
}
function counter(g: Ctx, label: string, value: string, y: number, col: string, k: number) {
  if (k <= 0) return; const s = easeOutBack(k);
  g.save(); g.translate(W / 2, y); g.scale(s, s);
  g.fillStyle = INK; g.beginPath(); g.roundRect(-390, -54, 780, 108, 16); g.fill(); g.fillStyle = "#efe2c2"; g.beginPath(); g.roundRect(-380, -44, 760, 88, 12); g.fill();
  g.restore();
  popText(g, label, W / 2 - 160, y, 46, k, "#3a2a1a", 0, "#efe2c2"); popText(g, value, W / 2 + 190, y, 70, k, col);
}

// ---------------- the shots ----------------
function shot(t: number): Shot {
  const S = shotAt(t), u = t - S.a, D = S.b - S.a, i = S.i;
  const k = clamp01(u / D);
  const items: Item[] = [];
  let cam = cam0();
  let bg: (g: Ctx) => void = () => {};
  let fg: ((g: Ctx) => void) | undefined;
  let ships: ShipState[] | undefined;
  const guard = (A: Actor, x: number, z: number, dir: number, face: (tt: number) => Pose["face"], extra: (tt: number) => Partial<Pose> = () => ({})) => person(cam, A, (tt) => ({ armL: [0.9, 0.25, 0.9], armR: [0.6, 0.2, 1.2], face: face(tt), ...extra(tt) }), t, S.a, x, z, "side", dir, 0, rifle(0.9));

  if (i === 0) {
    // HOOK: an American and a British soldier nose to nose... and a pig trots between them
    const pg = wt(0, "pig"), war = wt(0, "war");
    cam = camFor(0, 2.2, lerp(620, 680, smooth(k)), 1.3, 1150);
    bg = (g) => island(g, cam, t, PAL.mist, { seed: 1 });
    items.push(guard(US, -0.75, 2.2, 1, (tt) => (tt > pg + 0.3 ? "shock" : "angry"), (tt) => ({ headPitch: tt > pg + 0.3 ? -0.35 : 0, lean: tt < war ? 0.08 : 0 })));
    items.push(guard(UK, 0.75, 2.2, -1, (tt) => (tt > pg + 0.3 ? "shock" : "angry"), (tt) => ({ headPitch: tt > pg + 0.3 ? -0.35 : 0, lean: tt < war ? 0.08 : 0 })));
    const px = lerp(-3.2, 0.1, smooth((t - pg + 0.6) / 0.9));
    items.push(piggy(cam, (tt) => { const walking = tt < pg + 0.3; return walking ? { trot: 1, phase: tt * 2.4, face: "happy" } : { face: "smug", root: 0, look: 1, bounce: since(tt, pg + 0.3, 0.12) * 0.04 * (1 - since(tt, pg + 0.45, 0.2)) }; }, t, S.a, px, 1.6, "side", 1));
    fg = (g) => { sign(g, "1859", 240, since(t, 0.3, 0.45), 96); if (t > pg) sign(g, "THE PIG WAR", 420, since(t, pg + 0.1, 0.45), 78, "#ffd2d8"); if (t > war && t < pg) popText(g, "GRRR", W / 2, 660, 70, since(t, war, 0.2), "#ffffff", 0.05); vignette(g, 0.25); };
  } else if (i === 1) {
    // the map: San Juan Island sits between British Vancouver Island and the American mainland
    bg = (g) => mapScene(g, t, u, D);
  } else if (i === 2) {
    // June 15: farmer Cutlar finds a pig eating his potatoes
    const fd = wt(2, "found"), po = wt(2, "potatoes");
    cam = camFor(lerp(0.4, 0.1, smooth(k)), 2.4, lerp(540, 600, smooth(k)), 1.3, 1140);
    bg = (g) => { island(g, cam, t, PAL.day, { seed: 2 }); cabin(g, cam, -5, 12); potatoPatch(g, cam, -2, 3.2, 2.5, 6, (x) => clamp01((t - fd - (x + 2) * 0.12) * 0.9) * (x > 0.6 ? 1 : 0)); };
    items.push({ z: 7, draw: (g) => fence(g, cam, -9, 9, 7, undefined, "#9a7a52") });
    items.push(person(cam, CUT, (tt) => tt > po ? { face: "angry", armL: [0.4, 0.7, 1.9], armR: [0.4, 0.7, 1.9], hips: 1, bounce: since(tt, po, 0.15) * 0.05 * (1 - since(tt, po + 0.2, 0.3)) } : tt > fd ? { face: "shock", armL: [0.3, 0.3, 0.4], armR: [0.3, 0.3, 0.4], lean: -0.15 } : { face: "happy", armR: [0.5, 0.2, 1.3] }, t, S.a, -1.8, 3.0, "front"));
    items.push(piggy(cam, (tt) => ({ face: tt > po + 0.3 ? "smug" : "munch", chew: 1, root: tt > po + 0.3 ? 0 : 1 }), t, S.a, 1.3, 3.2, "side", -1));
    fg = (g) => { sign(g, "JUNE 15, 1859", 240, since(t, S.a + 0.15, 0.45), 76); if (t > po) { const p = proj(cam, 1.0, 1.0, 3.2); if (p) popText(g, "CHOMP", p[0], p[1] - 120, 70, since(t, po, 0.2), "#ffffff", -0.1); } };
  } else if (i === 3) {
    // "He shot it." The farmer aims... BANG (off-screen). A lone potato rolls by.
    const sh = wt(3, "shot");
    cam = camFor(-0.4, 1.5, 820, 1.4, 1350, { shake: t > sh && t < sh + 0.35 ? 9 * (1 - since(t, sh, 0.35)) : 0 });
    bg = (g) => island(g, cam, t, PAL.day, { seed: 3, forest: true });
    items.push(person(cam, CUT, (tt) => ({ armL: [1.45, 0.1, 0.15], armR: [1.2, 0.15, 0.6], face: tt > sh ? "shock" : "angry", lean: 0.12 - (tt > sh ? since(tt, sh, 0.1) * 0.25 * (1 - since(tt, sh + 0.15, 0.3)) : 0), headPitch: 0.05 }), t, S.a, -1.0, 1.5, "side", 1, 0, rifle(0, false)));
    fg = (g) => { const kk = since(t, sh, 0.7); smokePuff(g, W / 2 + 330, 760, kk, 140); if (t > sh) { burst(g, W / 2 + 300, 760, 220, easeOutBack(since(t, sh, 0.2)) * (1 - since(t, sh + 0.4, 0.3)), "#fff3a0", 12); popText(g, "BANG!", W / 2 + 180, 560, 130, since(t, sh, 0.15), "#ffd24a", -0.08); } if (t > sh + 0.5) { const rx = lerp(W + 80, W / 2 + 100, smooth((t - sh - 0.5) / 0.8)); g.save(); g.translate(rx, 1130); g.rotate(-t * 6); g.fillStyle = INK; g.beginPath(); g.ellipse(0, 0, 40, 30, 0, 0, 7); g.fill(); g.fillStyle = "#c8a060"; g.beginPath(); g.ellipse(0, 0, 34, 24, 0, 0, 7); g.fill(); g.fillStyle = "#8a6a3a"; g.beginPath(); g.arc(10, -6, 4, 0, 7); g.arc(-12, 5, 3, 0, 7); g.fill(); g.restore(); } if (t > sh && t < sh + 0.08) { g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(0, 0, W, H); } };
  } else if (i === 4) {
    // Problem: it was the Hudson's Bay Company's pig. Griffin holds up a framed portrait of it.
    const pr = wt(4, "problem"), br = wt(4, "british");
    cam = camFor(0.2, 2.4, 560, 1.4, 1150);
    bg = (g) => { island(g, cam, t, PAL.mist, { seed: 4 }); tradingPost(g, cam, 0.6, 9); };
    items.push(person(cam, GRIF, (tt) => ({ face: tt > br ? "angry" : "worried", armL: [1.0, 0.4, 1.4], armR: [1.0, 0.4, 1.4], mouthOpen: tt > br ? 0.3 + 0.3 * Math.abs(Math.sin(tt * 10)) : 0, bounce: Math.abs(Math.sin(tt * 4)) * 0.015 }), t, S.a, 1.2, 2.6, "front"));
    items.push({ z: 2.3, draw: (g) => { g.save(); const s = at(g, cam, 1.2, 1.35, 2.3); if (s) portrait(g, outline(s), t); g.restore(); } });
    items.push(person(cam, CUT, (tt) => ({ face: "worried", armL: [0.2, 0.2, 0.3], armR: [0.6, 0.6, 2.4], headYaw: 0.3, lean: -0.08 }), t, S.a, -1.5, 3.0, "front"));
    fg = (g) => { sign(g, "PROBLEM:", 240, since(t, pr - 0.1, 0.4), 84, "#ffb0a0"); const p = proj(cam, -1.3, 2.3, 3.0); if (p && t > pr + 0.3) { g.fillStyle = "#9fd4ff"; g.beginPath(); g.ellipse(p[0] + 50, p[1] - 10 + ((t * 120) % 60), 9, 14, 0, 0, 7); g.fill(); } };
  } else if (i === 5) {
    // the British threaten arrest; the Americans call the army
    const so = wt(5, "so"), ca = wt(5, "called");
    if (t < so - 0.1) {
      cam = camFor(0, 2.2, 600, 1.4, 1150);
      bg = (g) => island(g, cam, t, PAL.mist, { seed: 5 });
      items.push(person(cam, UK2, (tt) => ({ face: "angry", armR: [1.3, 0.2, 0.2], armL: [0.3, 0.5, 2.1], lean: 0.1, mouthOpen: 0.3 + 0.3 * Math.abs(Math.sin(tt * 9)) }), t, S.a, 0.9, 2.2, "side", -1, 0, (g, h, e, s, f) => scroll("ARREST")(g, h, e, s, f)));
      items.push(person(cam, CUT, (tt) => ({ face: "scared", armL: [2.4, 0.4, 0.3], armR: [2.4, 0.4, 0.3], lean: -0.2, bounce: Math.sin(tt * 30) * 0.008 }), t, S.a, -0.9, 2.2, "side", 1));
      fg = (g) => { sign(g, "ARREST HIM!", 240, since(t, S.a + 0.2, 0.4), 82, "#ffb0a0"); };
    } else {
      cam = camFor(0, 2.4, 560, 1.4, 1150);
      bg = (g) => { island(g, cam, t, PAL.day, { seed: 6 }); cabin(g, cam, 3, 14); };
      const shout = (j: number) => (tt: number): Pose => ({ face: "shout", armL: [0.6, 0.6, 2.4], armR: [0.6, 0.6, 2.4], mouthOpen: 0.6, bounce: Math.abs(Math.sin(tt * 7 + j)) * 0.04, headPitch: 0.15 });
      items.push(person(cam, CUT, shout(0), t, so, 0, 2.4, "front"));
      items.push(person(cam, SET[0], shout(1), t, so, -1.5, 3.0, "front")); items.push(person(cam, SET[1], shout(2), t, so, 1.5, 3.0, "front"));
      fg = (g) => { sign(g, "CALL THE ARMY!", 240, since(t, ca, 0.4), 78); for (let j = 0; j < 3; j++) { const kk = ((t - so) * 1.4 + j / 3) % 1; g.strokeStyle = `rgba(255,255,255,${1 - kk})`; g.lineWidth = 8; g.beginPath(); g.arc(W / 2, 760, 80 + kk * 260, -2.4, -0.7); g.stroke(); } };
    }
  } else if (i === 6) {
    // Captain Pickett lands with 64 soldiers: rowboats on the beach, a column marching up
    const pk = wt(6, "pickett"), sx = wt(6, "sixtyfour") > LINES[6].start ? wt(6, "sixtyfour") : wt(6, "soldiers") - 0.5;
    cam = camFor(lerp(-0.5, 0.3, smooth(k)), 2.4, 520, 1.5, 1150);
    bg = (g) => { island(g, cam, t, PAL.day, { seed: 7, seaFrom: 9 }); beach(g, cam, 9); boats(g, cam, t); };
    items.push(person(cam, PICK, (tt) => ({ run: 0.4, phase: tt * 1.0, face: "smug", armR: [0.3, 0.75, 1.9], armL: [1.2, 0.3, 0.4], hips: 0.4 }), t, S.a, -1.2 + u * 0.4, 2.4, "front", 1, 0, (g, h, e, s, f) => { if (s > 0 && !f) { g.save(); g.translate(h[0], h[1]); g.rotate(-0.3); g.strokeStyle = INK; g.lineWidth = 0.06; g.beginPath(); g.moveTo(0, 0); g.lineTo(0.8, 0.5); g.stroke(); g.strokeStyle = "#c9ccd0"; g.lineWidth = 0.03; g.stroke(); g.restore(); } }));
    for (let j = 0; j < 16; j++) { const row = Math.floor(j / 4), col = j % 4; const app = since(t, sx - 0.4 + row * 0.15, 0.3); if (app <= 0) continue; items.push(person(cam, TROOP[j], (tt) => ({ run: 0.35, phase: tt * 1.0 + (j % 2) * 0.5, face: "neutral", armL: [0.9, 0.25, 0.9], armR: [0.6, 0.2, 1.2] }), t, S.a, -2.4 + col * 1.2 + u * 0.4, 4.2 + row * 1.2, "front", 1, (1 - easeOutBack(app)) * 1.5, rifle(0.9))); }
    fg = (g) => { sign(g, "CAPT. GEORGE PICKETT", 240, since(t, pk, 0.4), 64); counter(g, "SOLDIERS", "64", 440, "#2a3f8a", since(t, sx, 0.3)); };
  } else if (i === 7) {
    // the British answer with warships (3D frigates steam in)
    const ws = wt(7, "warships");
    cam = camFor(lerp(0, 1, smooth(k)), 1.4, 380, 2.6, 1230);
    bg = (g) => { island(g, cam, t, PAL.mist, { seed: 8, seaFrom: 5 }); beach(g, cam, 5); };
    ships = [0, 1, 2].map((j) => ({ x: lerp(50 + j * 14, -9 + j * 13, smooth((t - S.a + 0.6 - j * 0.2) / 2.0)), z: 28 + j * 12, yaw: 0, roll: Math.sin(t * 1.3 + j) * 0.03, pitch: Math.sin(t * 0.9 + j) * 0.015, heave: Math.sin(t * 1.1 + j) * 0.1 }));
    items.push(person(cam, US, (tt) => ({ face: tt > ws ? "shock" : "neutral", armL: [0.9, 0.25, 0.9], armR: [0.6, 0.2, 1.2], headYaw: 0.2, lean: tt > ws ? -0.2 : 0 }), t, S.a, -2.3 + lerp(0, 2, smooth(k)), 1.4, "back", 1, 0, rifle(0.9)));
    items.push(person(cam, US2, (tt) => ({ face: tt > ws ? "shock" : "neutral", armL: [0.9, 0.25, 0.9], armR: [0.6, 0.2, 1.2], headYaw: -0.2 }), t, S.a, 2.4 + lerp(0, 2, smooth(k)), 1.7, "back", 1, 0, rifle(0.9)));
    fg = (g) => { sign(g, "WARSHIPS!", 240, since(t, ws, 0.4), 90, "#ffb0a0"); };
  } else if (i === 8) {
    // the numbers by the end of August: Americans + cannons on the shore vs five warships in the bay
    const fo = wt(8, "four"), fc = wt(8, "fourteen"), fv = wt(8, "five"), tw = wt(8, "two");
    const toBay = smooth((t - fv + 0.5) / 1.0);
    cam = camFor(lerp(-1.5, 4, toBay), lerp(3.0, 3.0, toBay), lerp(430, 330, toBay), lerp(1.5, 2.6, toBay), 1150);
    bg = (g) => { island(g, cam, t, PAL.day, { seed: 9, seaFrom: 12 }); beach(g, cam, 12); };
    ships = [0, 1, 2, 3, 4].map((j) => ({ x: -6 + j * 15, z: 50 + (j % 2) * 18, yaw: 0.0, roll: Math.sin(t * 1.3 + j) * 0.03, pitch: 0, heave: Math.sin(t * 1.1 + j) * 0.1 }));
    for (let j = 0; j < 24; j++) { const app = since(t, fo - 0.2 + (j % 8) * 0.04, 0.3); if (app <= 0) continue; items.push(person(cam, TROOP[j], (tt) => ({ face: "angry", armL: [0.9, 0.25, 0.9], armR: [0.6, 0.2, 1.2], bounce: Math.sin(tt * 2 + j) * 0.005 }), t, S.a, -6 + (j % 8) * 1.3, 4 + Math.floor(j / 8) * 1.6, "front", 1, (1 - easeOutBack(app)) * 1.2, rifle(0.9))); }
    for (let j = 0; j < 5; j++) { const app = since(t, fc + j * 0.08, 0.25); if (app > 0) items.push(cannonItem(cam, -6.5 + j * 2.6, 2.6, 1)); }
    fg = (g) => {
      sign(g, "END OF AUGUST", 200, since(t, S.a + 0.1, 0.4), 64);
      counter(g, "AMERICANS", "461", 360, "#2a3f8a", since(t, fo, 0.3) * (1 - since(t, fv - 0.3, 0.2))); counter(g, "CANNONS", "14", 480, "#2a3f8a", since(t, fc, 0.3) * (1 - since(t, fv - 0.3, 0.2)));
      counter(g, "WARSHIPS", "5", 360, "#c23a32", since(t, fv, 0.3)); counter(g, "MEN", "2,000+", 480, "#c23a32", since(t, tw, 0.3));
    };
  } else if (i === 9) {
    // "All because of one pig." The armies stare... at the pig, napping in the middle of the beach
    const one = wt(9, "one");
    cam = camFor(0, 2.4, lerp(330, 900, smooth((t - S.a) / (D * 0.9))), lerp(2.0, 0.8, smooth(k)), lerp(1150, 1250, smooth(k)));
    bg = (g) => { island(g, cam, t, PAL.day, { seed: 9, seaFrom: 12 }); beach(g, cam, 12); };
    for (let j = 0; j < 8; j++) items.push(person(cam, TROOP[j], () => ({ face: "worried", armL: [0.9, 0.25, 0.9], armR: [0.6, 0.2, 1.2], headPitch: -0.2, headYaw: (j < 4 ? 1 : -1) * 0.3 }), t, S.a, (j < 4 ? -3.5 - j * 1.0 : 3.5 + (j - 4) * 1.0), 4 + (j % 2), "front", 1, 0, rifle(0.9)));
    items.push(piggy(cam, (tt) => ({ face: "angel", halo: true, wings: tt > one ? 1 : 0, headTilt: Math.sin(tt * 2) * 0.1, bounce: Math.sin(tt * 3) * 0.02 }), t, S.a, 0, 2.4, "front", 1, lerp(0, 0.5, since(t, one, 0.6))));
    fg = (g) => { sign(g, "ONE. PIG.", 240, since(t, one, 0.4), 96, "#ffd2d8"); };
  } else if (i === 10) {
    // Rear Admiral Baynes refuses: "a squabble about a pig"
    const no = wt(10, "no"), sq = wt(10, "squabble");
    cam = camFor(0.3, 1.0, 900, 1.5, 1480);
    bg = (g) => deck(g, cam, t);
    items.push(person(cam, BAY, (tt) => ({ face: tt > no && tt < sq - 0.4 ? "angry" : "smug", armR: tt > no - 0.1 ? [2.2 + Math.sin(tt * 10) * 0.25, 0.3, 0.3] : HAND_BACK, armL: [0.3, 0.5, 2.1], hips: tt > no ? 0 : 0.4, headYaw: tt > no && tt < no + 0.7 ? Math.sin(tt * 12) * 0.35 : 0.1 }), t, S.a, -0.2, 1.0, "front"));
    fg = (g) => { sign(g, "REAR ADMIRAL BAYNES", 220, since(t, S.a + 0.1, 0.4), 62); if (t > no && t < sq) popText(g, "NO.", W / 2 + 230, 560, 130, since(t, no, 0.25), "#ffffff", 0.06); quote(g, "\"...a squabble about a pig.\"", 470, since(t, sq - 0.1, 0.4)); };
  } else if (i === 11) {
    // so both sides... just stayed. Two camps, one island, crickets.
    const st = wt(11, "stayed");
    cam = camFor(0, 6, 330, 2.0, 1080);
    bg = (g) => island(g, cam, t, PAL.dusk, { seed: 11 });
    items.push(person(cam, US, () => ({ sit: 1, face: "neutral", armL: [0.3, 0.3, 0.5], armR: [0.3, 0.3, 0.5] }), t, S.a, -2.5, 6, "front", 1, 0.35));
    items.push(person(cam, UK, () => ({ sit: 1, face: "neutral", armL: [0.3, 0.3, 0.5], armR: [0.3, 0.3, 0.5] }), t, S.a, 2.5, 6, "front", 1, 0.35));
    items.push({ z: 6.05, draw: (g) => { for (const x of [-2.5, 2.5]) { g.save(); const s = at(g, cam, x, 0, 6.05); if (s) { const p = new Path2D(); p.rect(-0.5, 0, 1.0, 0.35); g.strokeStyle = INK; g.lineWidth = outline(s) * 2; g.stroke(p); g.fillStyle = "#7a5030"; g.fill(p); } g.restore(); } } });
    items.push({ z: 8, draw: (g) => { const pA = proj(cam, -5.5, 0, 8), pB = proj(cam, 5.5, 0, 8); if (pA) usFlag(g, pA[0], pA[1], 130, t); if (pB) ukFlag(g, pB[0], pB[1], 130, t); } });
    fg = (g) => { sign(g, "...AND STAYED", 240, since(t, st, 0.4), 80); vignette(g, 0.3); };
  } else if (i === 12) {
    // twelve years of joint occupation: a calendar flips 1860 -> 1872; officers share drinks and cigars
    const tw = wt(12, "twelve"), wh = wt(12, "whisky");
    cam = camFor(0, 2.0, 640, 1.4, 1180);
    bg = (g) => { island(g, cam, t, PAL.day, { seed: 12 }); };
    const yr = Math.min(1872, 1860 + Math.floor(clamp01((t - tw + 0.2) / 2.0) * 12));
    const toast = (tt: number) => tt > wh - 0.2;
    items.push(person(cam, UK2, (tt) => ({ face: toast(tt) ? "happy" : "smug", armR: toast(tt) ? [2.0, 0.3, 0.6] : [0.9, 0.3, 1.4], armL: [0.2, 0.2, 0.3], bounce: toast(tt) ? Math.abs(Math.sin(tt * 5)) * 0.03 : 0, headYaw: 0.3 }), t, S.a, 0.85, 2.0, "side", -1, 0, cup));
    items.push(person(cam, PICK, (tt) => ({ face: toast(tt) ? "happy" : "smug", armR: toast(tt) ? [2.0, 0.3, 0.6] : [0.9, 0.3, 1.4], armL: [0.2, 0.2, 0.3], bounce: toast(tt) ? Math.abs(Math.sin(tt * 5 + 1)) * 0.03 : 0 }), t, S.a, -0.85, 2.0, "side", 1, 0, cup));
    fg = (g) => { calendar(g, yr, since(t, tw - 0.2, 0.4), t); if (t > wh) { const p = proj(cam, 0, 2.3, 2.0); if (p) { popText(g, "CHEERS!", p[0], p[1] - 230, 76, since(t, wh, 0.25), "#ffffff", -0.06); for (let j = 0; j < 5; j++) { const kk = (t * 0.6 + j * 0.2) % 1; g.fillStyle = `rgba(230,230,230,${0.6 * (1 - kk)})`; g.beginPath(); g.arc(p[0] - 140 + Math.sin(kk * 6 + j) * 20, p[1] - 40 - kk * 200, 18 + kk * 30, 0, 7); g.fill(); } } } };
  } else if (i === 13) {
    // 1872: the German Kaiser settles it. The island goes to America.
    const ka = wt(13, "kaiser"), am = wt(13, "america");
    bg = (g) => kaiserDesk(g, t, ka, am);
    cam = camFor(-1.0, 1.0, 760, 1.4, 1560);
    items.push(person(cam, KAI, (tt) => ({ face: tt > am ? "smug" : "neutral", armR: tt > am - 0.5 && tt < am ? [2.6, 0.2, 0.3] : tt > am ? [1.0, 0.2, 0.9] : [0.5, 0.2, 1.4], armL: [0.3, 0.5, 2.1], headPitch: -0.1, squash: tt > am && tt < am + 0.12 ? -0.04 : 0 }), t, S.a, -1.4, 1.0, "front"));
    fg = (g) => { sign(g, "1872", 230, since(t, S.a + 0.1, 0.4), 96); };
  } else {
    // casualties of the whole war: one pig (it floats up with a halo; both sides salute)
    const ca = wt(14, "casualties"), one = wt(14, "one");
    cam = camFor(0, 3, 520, 2.2, 1220);
    bg = (g) => island(g, cam, t, PAL.dusk, { seed: 14 });
    const salute = (tt: number): Pose => tt > one ? { face: "happy", armR: [2.7, 0.9, 2.3], armL: [0.1, 0.1, 0.2] } : { face: "neutral", armR: [0.1, 0.1, 0.2], armL: [0.1, 0.1, 0.2] };
    items.push(person(cam, US2, salute, t, S.a, -1.7, 3.2, "front")); items.push(person(cam, UK2, salute, t, S.a, 1.7, 3.2, "front"));
    const up = smooth((t - one + 0.3) / 2.5);
    items.push(piggy(cam, (tt) => ({ face: "angel", halo: true, wings: 1, headTilt: Math.sin(tt * 2) * 0.12 }), t, S.a, 0, 3.0, "front", 1, lerp(0.2, 2.4, up)));
    fg = (g) => { sign(g, "CASUALTIES:", 230, since(t, ca, 0.4), 80); if (t > one) popText(g, "1 PIG", W / 2, 400, 120, since(t, one, 0.3), "#ffd2d8", -0.04); for (let q = 0; q < 6; q++) { const a = q * 1.05 + t * 1.5, rr = 200, kk = (t * 1.7 + q * 0.3) % 1; const p = proj(cam, 0, lerp(0.2, 2.4, up) + 0.6, 3.0); if (!p) continue; const px = p[0] + Math.cos(a) * rr, py = p[1] + Math.sin(a) * rr * 0.5, s2 = 10 + 14 * Math.sin(kk * Math.PI); g.fillStyle = "#fff6b0"; g.beginPath(); g.moveTo(px, py - s2); g.quadraticCurveTo(px, py, px + s2, py); g.quadraticCurveTo(px, py, px, py + s2); g.quadraticCurveTo(px, py, px - s2, py); g.quadraticCurveTo(px, py, px, py - s2); g.fill(); } vignette(g, 0.3); };
  }
  return { cam, bg, items, fg, ships };
}
const HAND_BACK: [number, number, number] = [0.2, 0.35, 2.2];

// ---------------- extra painters ----------------
function beach(g: Ctx, c: Cam, zSea: number) {
  // a sand strip along the waterline
  const a = proj(c, c.x - 60, 0, zSea - 1.2), b = proj(c, c.x - 60, 0, zSea + 0.05); if (!a || !b) return;
  g.fillStyle = "#e0cf9a"; g.fillRect(-300, b[1], W + 600, Math.max(0, a[1] - b[1]));
  g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 5; g.beginPath(); g.moveTo(-300, b[1] + 2); g.lineTo(W + 300, b[1] + 2); g.stroke();
}
function boats(g: Ctx, c: Cam, t: number) {
  for (let j = 0; j < 3; j++) { const p = proj(c, -4 + j * 3.5, 0, 9.6 + (j % 2) * 0.8); if (!p) continue; const s = p[2]; g.save(); g.translate(p[0], p[1] + Math.sin(t * 2 + j) * 2); g.scale(s, -s); const hull = new Path2D(); hull.moveTo(-1.2, 0.1); hull.quadraticCurveTo(0, -0.25, 1.2, 0.1); hull.lineTo(1.3, 0.35); hull.lineTo(-1.3, 0.35); hull.closePath(); g.strokeStyle = INK; g.lineWidth = outline(s) * 2; g.stroke(hull); g.fillStyle = "#8a5a32"; g.fill(hull); g.restore(); }
}
function portrait(g: Ctx, OL: number, t: number) {
  // a framed portrait of the late pig with a black ribbon (held up by Griffin)
  const fo = (p: Path2D, col: string) => { g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(p); g.fillStyle = col; g.fill(p); };
  const fr = new Path2D(); fr.rect(-0.42, -0.35, 0.84, 0.7); fo(fr, "#c8932e");
  const inner = new Path2D(); inner.rect(-0.33, -0.27, 0.66, 0.54); fo(inner, "#cfe0e6");
  g.save(); g.beginPath(); g.rect(-0.33, -0.27, 0.66, 0.54); g.clip(); g.translate(0, -0.34); g.scale(0.62, 0.62); const st = settlePig(PIG, () => ({ face: "happy" }), t); drawPig(g, PIG, st, t, "front", 1, 1, OL / 0.62); g.restore();
  g.strokeStyle = INK; g.lineWidth = 0.06; g.beginPath(); g.moveTo(0.22, 0.35); g.lineTo(0.42, 0.15); g.stroke();
  const rb = new Path2D(); rb.moveTo(0.42, 0.35); rb.lineTo(0.2, 0.35); rb.lineTo(0.42, 0.13); rb.closePath(); g.fillStyle = "#1c1c22"; g.fill(rb);
}
function mapScene(g: Ctx, t: number, u: number, D: number) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#4f8ab8"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 3; for (let i = 0; i < 14; i++) { g.beginPath(); for (let x = 0; x <= W; x += 20) { const y = i * 150 + Math.sin(x * 0.02 + t * 1.5 + i) * 10; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  const z = lerp(1.0, 1.25, smooth(u / D));
  g.save(); g.translate(W / 2, 900); g.scale(z, z); g.translate(-540, -900);
  const land = (pts: [number, number][], col: string) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); g.lineJoin = "round"; g.strokeStyle = INK; g.lineWidth = 12; g.stroke(p); g.fillStyle = col; g.fill(p); };
  land([[-100, 300], [180, 420], [300, 620], [380, 820], [360, 1000], [300, 1180], [200, 1300], [-100, 1320]], "#8fb070");                       // Vancouver Island (British)
  land([[1180, 200], [860, 300], [760, 520], [800, 700], [740, 900], [790, 1100], [720, 1300], [820, 1500], [1180, 1600]], "#a8c080");        // mainland (USA)
  const pulse = 1 + Math.sin(t * 6) * 0.04 * since(u, 0.6, 0.3);
  g.save(); g.translate(560, 880); g.scale(pulse, pulse); land([[-70, -50], [10, -80], [80, -40], [70, 30], [10, 70], [-60, 40]], "#f2cf5b"); g.restore();  // San Juan Island
  g.fillStyle = "#3a2a1a"; g.font = "800 34px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center";
  g.fillText("SAN JUAN", 560, 990); g.fillText("ISLAND", 560, 1028);
  ukFlag(g, 200, 760, 140, t, easeOutBack(since(u, 0.9, 0.35)));
  usFlag(g, 880, 760, 140, t, easeOutBack(since(u, 1.3, 0.35)));
  g.restore();
  popText(g, "BRITISH", 220, 860, 54, since(u, 0.9, 0.3), "#ffffff", -0.04); popText(g, "AMERICAN", 860, 860, 54, since(u, 1.3, 0.3), "#ffffff", 0.04);
  if (u > 2.0) { popText(g, "MINE!", 260, 470, 90, since(u, 2.0, 0.25), "#ffb0a0", -0.1); popText(g, "MINE!", 840, 470, 90, since(u, 2.25, 0.25), "#9fd4ff", 0.1); }
  sign(g, "SAN JUAN ISLAND", 240, since(u, 0.1, 0.45), 68);
}
function deck(g: Ctx, c: Cam, t: number) {
  // the quarterdeck of a frigate: sea and sky, a mast, rails, planks
  sky(g, c, "#5f8fb8", "#b9d0dd", "#e2eaea");
  const hy = H / 2 + c.tilt; g.fillStyle = "#4f7f9a"; g.fillRect(-300, hy, W + 600, H);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const roll = Math.sin(t * 0.9) * 0.02; g.translate(W / 2, H / 2); g.rotate(roll); g.translate(-W / 2, -H / 2);
  g.fillStyle = INK; g.fillRect(-100, 1040, W + 200, 30); g.fillStyle = "#8a5a32"; g.fillRect(-100, 1046, W + 200, 20);
  for (let i = 0; i < 9; i++) { g.fillStyle = INK; g.fillRect(-60 + i * 150, 1060, 26, 260); g.fillStyle = "#a8743f"; g.fillRect(-56 + i * 150, 1064, 18, 252); }
  g.fillStyle = "#b98a52"; g.fillRect(-100, 1300, W + 200, H); g.strokeStyle = "rgba(60,30,10,0.4)"; g.lineWidth = 4; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(-100, 1320 + i * 60); g.lineTo(W + 100, 1320 + i * 60); g.stroke(); }
  g.fillStyle = INK; g.fillRect(860, -100, 70, 1420); g.fillStyle = "#a8743f"; g.fillRect(868, -100, 54, 1420);
  g.strokeStyle = "#3a2a1a"; g.lineWidth = 6; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(895, 100 + i * 80); g.lineTo(1100, 1040); g.stroke(); }
}
function quote(g: Ctx, text: string, y: number, k: number) {
  if (k <= 0) return; const s = easeOutBack(k);
  g.save(); g.translate(W / 2, y); g.scale(s, s); g.rotate(-0.02);
  g.font = "800 50px SubFont, Montserrat, Arial Black, sans-serif"; const w = Math.min(W - 80, g.measureText(text).width + 70);
  g.fillStyle = INK; g.fillRect(-w / 2 - 8, -58, w + 16, 116); g.fillStyle = "#f6edd6"; g.fillRect(-w / 2, -50, w, 100);
  g.fillStyle = "#3a2a1a"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, 4);
  g.restore();
}
function calendar(g: Ctx, yr: number, k: number, t: number) {
  if (k <= 0) return; const s = easeOutBack(k);
  g.save(); g.translate(W / 2, 330); g.scale(s, s);
  g.fillStyle = INK; g.fillRect(-190, -130, 380, 270); g.fillStyle = "#f6edd6"; g.fillRect(-180, -120, 360, 250); g.fillStyle = "#c23a32"; g.fillRect(-180, -120, 360, 70);
  g.fillStyle = "#fff"; g.font = "800 40px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("YEAR", 0, -84);
  g.fillStyle = "#3a2a1a"; g.font = "800 110px SubFont, Montserrat, Arial Black, sans-serif"; g.fillText(String(yr), 0, 48 + (yr < 1872 ? Math.sin(t * 30) * 2 : 0));
  g.restore();
}
function kaiserDesk(g: Ctx, t: number, ka: number, am: number) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#6a7a6a"); gr.addColorStop(1, "#3a4a3a"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(60 + i * 170, 120, 110, 900); }
  // the map on the wall: the island turns American
  g.save(); g.translate(720, 640);
  g.fillStyle = INK; g.fillRect(-250, -200, 500, 400); g.fillStyle = "#4f8ab8"; g.fillRect(-240, -190, 480, 380);
  g.fillStyle = "#8fb070"; g.beginPath(); g.ellipse(-200, 0, 90, 190, 0, 0, 7); g.fill(); g.fillStyle = "#a8c080"; g.beginPath(); g.ellipse(230, 0, 100, 200, 0, 0, 7); g.fill();
  g.fillStyle = "#f2cf5b"; g.beginPath(); g.ellipse(0, 0, 60, 45, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
  g.strokeStyle = "#c23a32"; g.lineWidth = 6; g.setLineDash([16, 12]); g.beginPath(); g.moveTo(-90, -190); g.quadraticCurveTo(-80, 0, -95, 190); g.stroke(); g.setLineDash([]);
  if (t > am) usFlag(g, 0, 0, 80, t, easeOutBack(since(t, am, 0.35)));
  g.restore();
  // desk + document + stamp
  g.fillStyle = INK; g.fillRect(-20, 1180, W + 40, 18); g.fillStyle = "#6a4426"; g.fillRect(-20, 1196, W + 40, H);
  g.save(); g.translate(700, 1110); g.rotate(-0.04); g.fillStyle = INK; g.fillRect(-230, -60, 460, 140); g.fillStyle = "#f6edd6"; g.fillRect(-222, -52, 444, 124);
  g.fillStyle = "#5a4a3a"; g.font = "800 30px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.fillText("SAN JUAN BOUNDARY", 0, -12);
  if (t > am) { const st = since(t, am, 0.15); g.save(); g.translate(60, 40); g.rotate(-0.2); const sc = 1.5 - 0.5 * easeOutBack(st); g.scale(sc, sc); g.strokeStyle = "#2a4fa0"; g.lineWidth = 8; g.strokeRect(-110, -34, 220, 68); g.fillStyle = "#2a4fa0"; g.font = "800 50px SubFont, Montserrat, Arial Black, sans-serif"; g.textBaseline = "middle"; g.fillText("USA", 0, 3); g.restore(); }
  g.restore();
  popText(g, "THE GERMAN KAISER", W / 2, 380, 68, since(t, ka, 0.3), "#ffffff", -0.03);
}

// ---------------- the composition ----------------
const Layer: React.FC<{ t: number; which: "back" | "front"; S: Shot }> = ({ t, which, S }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    camTransform(g, S.cam, t);
    const tz = S.ships?.length ? Math.min(...S.ships.map((s) => s.z)) - 4 : -1e9;
    if (which === "back") { g.save(); S.bg(g); g.restore(); }
    const list = S.items.filter((it) => (which === "back" ? it.z > tz : it.z <= tz)).sort((a, b) => b.z - a.z);
    for (const it of list) { g.save(); it.draw(g); g.restore(); }
    if (which === "front" && S.fg) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); S.fg(g); g.restore(); }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
const flashAt = (t: number) => { for (const s of SHOTS) { const d = t - s.a; if (s.i > 0 && d >= 0 && d < 0.1) return 1 - d / 0.1; } return 0; };

type Post = { subs: boolean; audio: boolean; ships: boolean };
export const PigWar: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const on: Post = { subs: true, audio: true, ships: true, ...((getInputProps() as { post?: Partial<Post> }).post ?? {}) };
  const S = shot(t);
  const fl = flashAt(t);
  return (
    <AbsoluteFill style={{ background: "#cfe0e6" }}>
      <Layer t={t} which="back" S={S} />
      {S.ships?.length && on.ships ? (
        <ThreeCanvas width={W} height={H} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }} camera={{ fov: 30, near: 0.2, far: 5000 }}>
          <ShipLayer cam={S.cam} ships={S.ships} t={t} />
        </ThreeCanvas>
      ) : null}
      <Layer t={t} which="front" S={S} />
      {fl > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: fl * 0.5 }} />}
      {on.subs && <Subtitles words={WORDS} style={pigSubStyle} />}
      {withAudio && on.audio && <Audio src={staticFile("pigwar/mix.wav")} />}
    </AbsoluteFill>
  );
};
void speedLines;
