// "Napoleon vs the Bunnies, 1807": a mostly-2D cartoon short with its own look: lush French summer meadows, an imperial
// red-and-gold title ribbon instead of pop-up captions, 2D rubber-hose people (cartoon/figure.ts) and hundreds of 2D tame
// bunnies (cartoon/rabbit.ts), plus one 3D prop: Napoleon's travelling carriage (cartoon/Carriage3D.tsx) in a transparent
// three.js layer locked to the same 2.5D camera. Every shot is a pure function of time, cut on the narration's timings.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import { actor, settle, drawFigure, Look, Pose, Actor, Hold } from "../cartoon/figure";
import { makeRabbit, settleRabbit, drawRabbit, Rabbit, RabbitPose } from "../cartoon/rabbit";
import { CarriageLayer, CarriageState } from "../cartoon/Carriage3D";
import { rng } from "../bridge/paint";
import {
  Ctx, Cam, W, H, INK, cam0, proj, camTransform, at, outline, sky, sun, cloud, ground, hills, fence, bush, pond,
  speedLines, burst, popText, clamp01, smooth, lerp, easeOutBack,
} from "../cartoon/stage";
import lines from "../../stories/napoleon-rabbits/lines.json";
import words from "../../stories/napoleon-rabbits/words.json";

export const FPS = 30;
const LINES = lines as { start: number; end: number; text: string }[];
const WORDS = words as Word[];
export const NAP_TOTAL = Math.ceil((LINES[LINES.length - 1].end + 1.6) * FPS);
export const NAP_KEYWORDS = ["napoleon", "bunnies", "rabbits", "rabbit", "europe", "berthier", "hunt", "hundreds", "thousands", "guns", "feeding", "nothing", "emperor", "carriage", "inside", "thiebault", "exaggerated", "armies", "waterloo", "first", "tame", "laughs"];
export const napSubStyle = defaultStyle("funny", { keyWords: NAP_KEYWORDS });

// ---------------- timing ----------------
const LEAD = 0.25;
export const SHOTS = LINES.map((l, i) => ({ i, a: i === 0 ? 0 : l.start - LEAD, b: i === LINES.length - 1 ? NAP_TOTAL / FPS : LINES[i + 1].start - LEAD }));
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
const L_NAP: Look = { coat: "#7e848e", pants: "#efe8d8", hat: "admiral", hatCol: "#1f1c22", plume: "none", hair: "#3a2a1e", skin: "#f3d2b0", belly: 1.08, scale: 0.96 };
const L_BERT: Look = { coat: "#2b3f7a", pants: "#efe8d8", hat: "admiral", hatCol: "#1f1c22", plume: "#ffffff", hair: "#4a3020", skin: "#e9b58a", sash: "#c8262a", belly: 1.12 };
const L_HUNT: Look[] = [
  { coat: "#3f6a3a", pants: "#e9dfc8", hat: "tall", hatCol: "#3a2a20", hair: "#6b3f22", skin: "#f3c9a0" },
  { coat: "#2f5a46", pants: "#d9cdb0", hat: "tall", hatCol: "#1f1c22", moustache: "#2b1b12", hair: "#2b1b12", skin: "#e9b58a" },
  { coat: "#4a6a2f", pants: "#e9dfc8", hat: "beret", hatCol: "#7a2a2a", hair: "#c99a4b", skin: "#f6d3b1", belly: 1.15 },
  { coat: "#355a3a", pants: "#d9cdb0", hat: "tall", hatCol: "#4a3a2a", beard: "#5a3a22", hair: "#5a3a22", skin: "#d79c72" },
];
const L_FARMER: Look = { coat: "#d8cfb8", pants: "#6a5a44", hat: "wide", hatCol: "#d9b86a", vest: "#7a5a3a", hair: "#7a5a3a", beard: "#7a5a3a", skin: "#e0a77c" };
const L_SOLD: Look = { coat: "#2b3f7a", pants: "#efe8d8", hat: "cap", hatCol: "#2b3f7a", hair: "#2b1b12", skin: "#f3c9a0", pockets: true };
const NAP = actor(L_NAP, 1), BERT = actor(L_BERT, 2), FARMER = actor(L_FARMER, 4), SOLD = actor(L_SOLD, 5);
const HUNT = L_HUNT.map((L, i) => actor(L, 20 + i));
const BUNS: Rabbit[] = Array.from({ length: 140 }, (_, i) => makeRabbit(300 + i));
const HERO = makeRabbit(7); HERO.fur = "#f4f1ea"; HERO.patch = "#c98f5a"; HERO.eye = "#2c2222"; HERO.lop = false;
const HAND_IN: [number, number, number] = [0, 0.05, -2.1];   // the famous hand-in-waistcoat

type Item = { z: number; draw: (g: Ctx) => void };
type Shot = { cam: Cam; bg: (g: Ctx) => void; items: Item[]; fg?: (g: Ctx) => void; car?: CarriageState };

function shadow(g: Ctx, r: number) { g.fillStyle = "rgba(30,50,10,0.25)"; g.beginPath(); g.ellipse(0, 0, r, r * 0.22, 0, 0, 7); g.fill(); }
function person(c: Cam, A: Actor, poseAt: (t: number) => Pose, t: number, t0: number, x: number, z: number, view: "side" | "front" | "back", dir = 1, y = 0, hold?: Hold, ls = 1): Item {
  return { z, draw: (g) => { const st = settle(A, poseAt, t, t0); g.save(); const s = at(g, c, x, y, z); if (s) { if (y < 0.3) shadow(g, 0.55); drawFigure(g, A, st, t, view, dir, ls, outline(s), hold); } g.restore(); } };
}
function bun(c: Cam, R: Rabbit, poseAt: (t: number) => RabbitPose, t: number, t0: number, x: number, z: number, view: "side" | "front" | "back", dir = 1, y = 0, sc = 1): Item {
  return { z, draw: (g) => { const st = settleRabbit(R, poseAt, t, t0); g.save(); const s = at(g, c, x, y, z, sc); if (s) { if (y < 0.2) shadow(g, 0.3); drawRabbit(g, R, st, t, view, dir, 1, outline(s * sc, 0.05, 6)); } g.restore(); } };
}
/** a hopping crowd member: deterministic hop phase from its index */
const hopPose = (j: number, rate = 2.3, face: RabbitPose["face"] = "hungry") => (tt: number): RabbitPose => ({ hop: 1, phase: tt * rate + j * 0.37, face, ears: 0.1 });

// ---------------- props held in a hand ----------------
const dirOf = (h: [number, number], e: [number, number]) => { const dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const musket = (aimUp = 0): Hold => (g, h, e, side, far) => {
  if (far) return;
  const [dx0, dy0] = dirOf(h, e); const a = Math.atan2(dy0, dx0) + aimUp * side;
  g.save(); g.translate(h[0], h[1]); g.rotate(a);
  const OLw = 0.035;
  g.lineCap = "round";
  g.strokeStyle = INK; g.lineWidth = 0.1 + OLw * 2; g.beginPath(); g.moveTo(-0.5, -0.03); g.lineTo(0.35, 0); g.stroke();
  g.strokeStyle = "#8a5a32"; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-0.5, -0.03); g.lineTo(0.35, 0); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 0.045 + OLw * 2; g.beginPath(); g.moveTo(0.2, 0.01); g.lineTo(1.05, 0.02); g.stroke();
  g.strokeStyle = "#6e7378"; g.lineWidth = 0.045; g.beginPath(); g.moveTo(0.2, 0.01); g.lineTo(1.05, 0.02); g.stroke();
  g.restore();
};
const stick = (len = 0.85, col = "#7a5030", w = 0.05, wob = 0): Hold => (g, h, e, _s, far) => {
  if (far) return;
  const [dx, dy] = dirOf(h, e); const a = Math.atan2(dy, dx) + wob;
  g.save(); g.translate(h[0], h[1]); g.rotate(a); g.lineCap = "round";
  g.strokeStyle = INK; g.lineWidth = w + 0.06; g.beginPath(); g.moveTo(-0.05, 0); g.quadraticCurveTo(len * 0.5, 0.04 + wob * 0.2, len, wob * 0.15); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(-0.05, 0); g.quadraticCurveTo(len * 0.5, 0.04 + wob * 0.2, len, wob * 0.15); g.stroke();
  g.restore();
};
const quill = (wig: number): Hold => (g, h, _e, side, far) => {
  if (far || side < 0) return;
  g.save(); g.translate(h[0], h[1]); g.rotate(0.6 + wig);
  const p = new Path2D(); p.moveTo(0, 0); p.quadraticCurveTo(0.12, 0.2, 0.05, 0.45); p.quadraticCurveTo(-0.06, 0.22, 0, 0);
  g.strokeStyle = INK; g.lineWidth = 0.04; g.stroke(p); g.fillStyle = "#fbf6ea"; g.fill(p); g.restore();
};

// ---------------- the French countryside ----------------
const PAL = {
  day: { top: "#3f96dc", mid: "#a5d6f2", low: "#fff2cf", near: "#77b64a", far: "#a9cf62", hill1: "#5f9c44", hill2: "#8ab3a4", tree: "#4f8a3a", treeD: "#3a6e2e" },
  gold: { top: "#5a86c8", mid: "#f3c88c", low: "#ffe6b0", near: "#86ad48", far: "#c5c36a", hill1: "#6c9844", hill2: "#a59f8c", tree: "#5a8a3a", treeD: "#43702c" },
  dusk: { top: "#33356f", mid: "#d9779a", low: "#ffc883", near: "#4f6b38", far: "#8c845a", hill1: "#425f35", hill2: "#6e5e74", tree: "#3d5a32", treeD: "#2c4426" },
};
type Pal = typeof PAL.day;
function roundTree(g: Ctx, c: Cam, x: number, z: number, h: number, seed: number, t: number, col: string, dark: string) {
  const p = proj(c, x, 0, z); if (!p) return; const s = p[2]; if (p[0] < -300 || p[0] > W + 300) return;
  const r = rng(seed), sway = Math.sin(t * 0.8 + seed) * 0.02 * h;
  g.save(); g.translate(p[0], p[1]); g.scale(s, -s);
  const OL = outline(s, 0.25, 4);
  g.strokeStyle = INK; g.lineWidth = h * 0.08 + OL * 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(sway * 0.3, h * 0.55); g.stroke();
  g.strokeStyle = "#6a4a30"; g.lineWidth = h * 0.08; g.beginPath(); g.moveTo(0, 0); g.lineTo(sway * 0.3, h * 0.55); g.stroke();
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) blobs.push([(r() - 0.5) * h * 0.5 + sway, h * (0.62 + r() * 0.3), h * (0.2 + r() * 0.1)]);
  g.fillStyle = INK; for (const [bx, by, br] of blobs) { g.beginPath(); g.arc(bx, by, br + OL, 0, 7); g.fill(); }
  g.fillStyle = col; for (const [bx, by, br] of blobs) { g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill(); }
  g.fillStyle = dark; for (const [bx, by, br] of blobs) { g.beginPath(); g.arc(bx - br * 0.3, by - br * 0.35, br * 0.6, 0, 7); g.fill(); }
  g.restore();
}
function poplar(g: Ctx, c: Cam, x: number, z: number, h: number, t: number, col: string) {
  const p = proj(c, x, 0, z); if (!p) return; const s = p[2]; if (p[0] < -200 || p[0] > W + 200) return;
  g.save(); g.translate(p[0], p[1]); g.scale(s, -s); const OL = outline(s, 0.2, 4);
  const sw = Math.sin(t * 0.9 + x) * 0.04 * h;
  const pth = new Path2D(); pth.moveTo(0, h * 0.08); pth.quadraticCurveTo(-h * 0.17, h * 0.45, sw, h); pth.quadraticCurveTo(h * 0.17, h * 0.45, 0, h * 0.08);
  g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(pth); g.fillStyle = col; g.fill(pth); g.restore();
}
function flowers(g: Ctx, c: Cam, seed: number, z0: number, z1: number, n = 140) {
  const r = rng(seed); const cols = ["#ffffff", "#ffd84a", "#e86a8a", "#b78ae8"];
  for (let i = 0; i < n; i++) { const x = c.x + (r() - 0.5) * 30, z = z0 + r() * (z1 - z0); const p = proj(c, x, 0, z); const col = cols[Math.floor(r() * 4)]; if (!p) continue; const s = p[2] * 0.05; if (s < 0.6) continue; g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], s, 0, 7); g.fill(); }
  const r2 = rng(seed + 3); g.strokeStyle = "rgba(40,90,30,0.55)"; g.lineCap = "round";
  for (let i = 0; i < n; i++) { const x = c.x + (r2() - 0.5) * 30, z = z0 + r2() * (z1 - z0); const p = proj(c, x, 0, z); if (!p) continue; const s = p[2] * 0.12; if (s < 1) continue; g.lineWidth = Math.max(1, s * 0.2); g.beginPath(); g.moveTo(p[0] - s, p[1]); g.lineTo(p[0] - s * 1.3, p[1] - s); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] - s * 1.3); g.moveTo(p[0] + s, p[1]); g.lineTo(p[0] + s * 1.4, p[1] - s * 0.9); g.stroke(); }
}
function meadow(g: Ctx, c: Cam, t: number, P: Pal, o: { sunAt?: [number, number]; seed?: number; trees?: boolean; poplars?: boolean } = {}) {
  sky(g, c, P.top, P.mid, P.low);
  if (o.sunAt) sun(g, c, o.sunAt[0], o.sunAt[1], 0.06, P === PAL.dusk ? "#ffd08a" : "#fff6cf");
  const s = o.seed ?? 1;
  for (let i = 0; i < 5; i++) cloud(g, c, (i - 2) * 250 + Math.sin(i * 3 + s) * 80 + t * 2.5, 110 + (i % 3) * 40, 900 + i * 60, 85 + (i % 2) * 40, s * 10 + i, P === PAL.dusk ? "#ffd2c2" : "#ffffff", P === PAL.dusk ? "#d9909a" : "#d8e6f4");
  hills(g, c, 700, 55, P.hill2, 3 + s); ground(g, c, P.near, P.far); hills(g, c, 260, 16, P.hill1, 5 + s);
  if (o.trees !== false) { const r = rng(s + 40); for (let i = 0; i < 16; i++) roundTree(g, c, c.x * 0.8 + (r() - 0.5) * 170, 70 + r() * 60, 8 + r() * 5, i + s * 20, t, P.tree, P.treeD); }
  if (o.poplars) { for (let i = 0; i < 7; i++) poplar(g, c, -30 + i * 9 + (s % 3), 45 + (i % 2) * 4, 13, t, P.treeD); }
  flowers(g, c, s + 7, c.z + 3, c.z + 40);
}

// ---------------- 2D props ----------------
/** a farmer's wooden rabbit crate in metres; door 0..1 swings down; faces peek through the bars */
function crate(g: Ctx, OL: number, door: number, t: number, seed: number, faces = 2) {
  const fo = (p: Path2D, col: string) => { g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(p); g.fillStyle = col; g.fill(p); };
  const box = new Path2D(); box.rect(-0.5, 0, 1.0, 0.62); fo(box, "#6e4a2a");
  const inner = new Path2D(); inner.rect(-0.42, 0.06, 0.84, 0.5); g.fillStyle = "#2a1c14"; g.fill(inner);
  if (door < 0.5) { const r = rng(seed); for (let i = 0; i < faces; i++) { const x = -0.22 + i * 0.4 + (r() - 0.5) * 0.06, y = 0.22 + Math.abs(Math.sin(t * 3 + i + seed)) * 0.03; g.fillStyle = r() > 0.5 ? "#f4f1ea" : "#b9a58c"; g.beginPath(); g.ellipse(x, y, 0.12, 0.1, 0, 0, 7); g.fill(); g.fillStyle = "#2c2222"; g.beginPath(); g.arc(x - 0.04, y + 0.02, 0.022, 0, 7); g.arc(x + 0.04, y + 0.02, 0.022, 0, 7); g.fill(); g.fillStyle = "#e8798a"; g.beginPath(); g.arc(x, y - 0.03, 0.015, 0, 7); g.fill(); g.fillStyle = g.fillStyle; } }
  // door (front, hinged at the bottom): bars
  g.save(); g.translate(0, 0.04); g.scale(1, Math.cos(door * Math.PI * 0.5) * (door > 0.98 ? -0.25 : 1));
  if (door > 0.98) g.scale(1, 1);
  g.strokeStyle = INK; g.lineWidth = 0.05 + OL * 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-0.38 + i * 0.152, 0); g.lineTo(-0.38 + i * 0.152, 0.54); g.stroke(); }
  g.beginPath(); g.moveTo(-0.44, 0.0); g.lineTo(0.44, 0.0); g.moveTo(-0.44, 0.54); g.lineTo(0.44, 0.54); g.stroke();
  g.strokeStyle = "#b08050"; g.lineWidth = 0.05; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-0.38 + i * 0.152, 0); g.lineTo(-0.38 + i * 0.152, 0.54); g.stroke(); }
  g.beginPath(); g.moveTo(-0.44, 0.0); g.lineTo(0.44, 0.0); g.moveTo(-0.44, 0.54); g.lineTo(0.44, 0.54); g.stroke();
  g.restore();
}
function crateItem(c: Cam, x: number, z: number, door: number, t: number, seed: number, y = 0, faces = 2): Item {
  return { z, draw: (g) => { g.save(); const s = at(g, c, x, y, z); if (s) { if (y < 0.1) shadow(g, 0.7); crate(g, outline(s), door, t, seed, faces); } g.restore(); } };
}
/** the imperial title ribbon: a red banner with folded ends and cream lettering (this short's caption device) */
function ribbon(g: Ctx, text: string, y: number, k: number, size = 70, col = "#fff3d6", band = "#b8282c") {
  if (k <= 0) return;
  g.save(); g.font = `800 ${size}px SubFont, Montserrat, Arial Black, sans-serif`;
  const w = Math.min(W - 120, g.measureText(text).width + 90), hh = size * 1.25;
  const s = easeOutBack(k); g.translate(W / 2, y); g.scale(lerp(0.2, 1, Math.min(1, s)) * (s > 1 ? s : 1), Math.min(1.1, s)); g.rotate(-0.015);
  const tail = (sd: number) => { const p = new Path2D(); const x0 = sd * (w / 2 - 10); p.moveTo(x0, -hh * 0.3); p.lineTo(x0 + sd * 70, -hh * 0.3); p.lineTo(x0 + sd * 45, hh * 0.2); p.lineTo(x0 + sd * 70, hh * 0.7); p.lineTo(x0, hh * 0.7); p.closePath(); g.fillStyle = INK; g.save(); g.translate(0, 6); g.fill(p); g.restore(); g.fillStyle = "#7e1a1e"; g.fill(p); g.strokeStyle = INK; g.lineWidth = 6; g.stroke(p); };
  tail(-1); tail(1);
  const b = new Path2D(); b.moveTo(-w / 2, -hh / 2); b.quadraticCurveTo(0, -hh / 2 - 14, w / 2, -hh / 2); b.lineTo(w / 2, hh / 2); b.quadraticCurveTo(0, hh / 2 - 14, -w / 2, hh / 2); b.closePath();
  g.strokeStyle = INK; g.lineWidth = 9; g.stroke(b); g.fillStyle = band; g.fill(b);
  g.strokeStyle = "#e2b847"; g.lineWidth = 4; g.beginPath(); g.moveTo(-w / 2 + 14, -hh / 2 + 10); g.quadraticCurveTo(0, -hh / 2 - 4, w / 2 - 14, -hh / 2 + 10); g.moveTo(-w / 2 + 14, hh / 2 - 10); g.quadraticCurveTo(0, hh / 2 - 24, w / 2 - 14, hh / 2 - 10); g.stroke();
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = col; g.lineJoin = "round"; g.strokeStyle = "#4a0e10"; g.lineWidth = 8; g.strokeText(text, 0, 2 - 6); g.fillText(text, 0, 2 - 6);
  g.restore();
}
function vignette(g: Ctx, a: number, col = "20,10,30") { const gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},${a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
function confetti(g: Ctx, t: number, t0: number, seed: number) {
  const u = t - t0; if (u < 0) return; const r = rng(seed); const cols = ["#2a4fa0", "#ffffff", "#c8262a", "#e2b847"];
  for (let i = 0; i < 70; i++) { const x0 = W / 2 + (r() - 0.5) * 300, vx = (r() - 0.5) * 1300, vy = -900 - r() * 900, rot = r() * 6; const x = x0 + vx * u, y = 1000 + vy * u + 1300 * u * u; if (y > H + 40) continue; g.save(); g.translate(x + Math.sin(u * 6 + i) * 20, y); g.rotate(rot + u * 8); g.fillStyle = cols[i % 4]; g.fillRect(-12, -6, 24, 12 * Math.abs(Math.cos(u * 9 + i))); g.restore(); }
}
function thought(g: Ctx, x: number, y: number, k: number, inside: (g: Ctx) => void, rx = 300, ry = 210) {
  if (k <= 0) return; const s = easeOutBack(k);
  for (const [dx, dy, r] of [[-200, 300, 22], [-150, 245, 34]] as [number, number, number][]) { g.fillStyle = INK; g.beginPath(); g.arc(x + dx, y + dy, r * s + 6, 0, 7); g.fill(); g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(x + dx, y + dy, r * s, 0, 7); g.fill(); }
  g.save(); g.translate(x, y); g.scale(s, s);
  const p = new Path2D(); for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; p.moveTo(Math.cos(a) * rx + 66, Math.sin(a) * ry); p.arc(Math.cos(a) * rx, Math.sin(a) * ry, 66, 0, 7); }
  p.ellipse(0, 0, rx + 10, ry + 10, 0, 0, 7);
  g.fillStyle = INK; g.save(); g.scale(1.03, 1.04); g.fill(p); g.restore(); g.fillStyle = "#fffaf0"; g.fill(p);
  g.save(); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.clip(); inside(g); g.restore();
  g.restore();
}
function carrot(g: Ctx, x: number, y: number, s: number, rot: number) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = "#4f9a3a"; g.strokeStyle = INK; g.lineWidth = 5; for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(Math.sin(a) * 18, -50, 10, 30, a, 0, 7); g.fill(); g.stroke(); }
  const c = new Path2D(); c.moveTo(-24, -28); c.quadraticCurveTo(0, -40, 24, -28); c.lineTo(3, 80); c.lineTo(-3, 80); c.closePath(); g.fillStyle = "#f08a2a"; g.fill(c); g.stroke(c);
  g.strokeStyle = "#c0601a"; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-14 + i * 4, -5 + i * 22); g.lineTo(-4 + i * 4, -3 + i * 22); g.stroke(); }
  g.restore();
}
function lettuce(g: Ctx, x: number, y: number, s: number) {
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = INK; g.lineWidth = 5;
  for (const [dx, dy, r, col] of [[-30, 10, 42, "#7cc04a"], [30, 10, 42, "#7cc04a"], [0, -12, 46, "#9ad65a"], [0, 18, 36, "#b8e87a"]] as [number, number, number, string][]) { g.fillStyle = col; g.beginPath(); g.arc(dx, dy, r, 0, 7); g.fill(); g.stroke(); }
  g.restore();
}

// ---------------- interiors ----------------
function damask(g: Ctx, base: string, pat: string) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = base; g.fillRect(0, 0, W, H);
  g.fillStyle = pat; for (let y = 0; y < H; y += 150) for (let x = (y / 150) % 2 ? 75 : 0; x < W + 80; x += 150) { g.beginPath(); g.ellipse(x, y, 22, 40, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x, y, 40, 14, 0, 0, 7); g.fill(); }
}
function goldFrame(g: Ctx, x: number, y: number, w: number, h: number) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const ring = new Path2D(); ring.rect(x - 60, y - 60, w + 120, h + 120); ring.rect(x, y, w, h);
  g.fillStyle = INK; g.fill(ring, "evenodd");
  const ring2 = new Path2D(); ring2.rect(x - 50, y - 50, w + 100, h + 100); ring2.rect(x - 6, y - 6, w + 12, h + 12);
  const gr = g.createLinearGradient(x - 50, y - 50, x + w + 50, y + h + 50); gr.addColorStop(0, "#f6d36a"); gr.addColorStop(0.5, "#c8932e"); gr.addColorStop(1, "#f0c85a");
  g.fillStyle = gr; g.fill(ring2, "evenodd");
  g.strokeStyle = "#8a5a1a"; g.lineWidth = 5; g.strokeRect(x - 30, y - 30, w + 60, h + 60);
  for (const [cx, cy] of [[x - 30, y - 30], [x + w + 30, y - 30], [x - 30, y + h + 30], [x + w + 30, y + h + 30]]) { g.fillStyle = "#fff0b0"; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 5; g.stroke(); }
  g.restore();
}
function tentInside(g: Ctx) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? "#f3ead2" : "#2f4f9a"; g.fillRect(i * 130 - 40, 0, 130, H); }
  g.fillStyle = "rgba(255,230,170,0.18)"; g.fillRect(0, 0, W, H);
  // ground of the tent: a carpet
  g.fillStyle = "#7a2a2a"; g.fillRect(0, 1180, W, H - 1180); g.fillStyle = "#e2b847"; g.fillRect(0, 1180, W, 14);
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 1194, W, 30);
}

// ---------------- the shots ----------------
function shot(t: number): Shot {
  const S = shotAt(t), u = t - S.a, D = S.b - S.a, i = S.i;
  const k = clamp01(u / D);
  const items: Item[] = [];
  let cam = cam0();
  let bg: (g: Ctx) => void = () => {};
  let fg: ((g: Ctx) => void) | undefined;
  let car: CarriageState | undefined;

  if (i === 0) {
    // HOOK: a live imperial portrait. On "bunnies" a bunny hops onto the frame and the Emperor looks down in horror.
    const eu = wt(0, "europe"), bn = wt(0, "bunnies"), lost = wt(0, "lost");
    cam = camFor(0, 0, lerp(800, 850, smooth(k)), 1.0, 1300);
    bg = (g) => { damask(g, "#6e1c22", "#7c2228"); g.fillStyle = "#3d6a9a"; g.fillRect(170, 330, 740, 1000); const gr = g.createLinearGradient(0, 330, 0, 1330); gr.addColorStop(0, "#9ccbe8"); gr.addColorStop(0.7, "#f2dfb2"); gr.addColorStop(1, "#7f9a5a"); g.fillStyle = gr; g.fillRect(170, 330, 740, 1000); g.fillStyle = "#6a8a4a"; g.beginPath(); g.ellipse(540, 1330, 520, 160, 0, Math.PI, 0); g.fill(); };
    items.push(person(cam, NAP, (tt) => ({ armR: tt > bn + 0.15 ? [1.6, 0.4, 0.6] : HAND_IN, armL: tt > eu && tt < lost ? [2.4, 0.4, 0.3] : [0.1, 0.12, 0.25], face: tt > bn + 0.15 ? "shock" : tt > eu ? "smug" : "neutral", headPitch: tt > bn + 0.15 ? -0.25 : 0.05, headYaw: tt > bn + 0.15 ? 0.1 : -0.2, bounce: tt > bn + 0.15 && tt < bn + 0.45 ? 0.05 : 0 }), t, S.a, 0, 0, "front"));
    fg = (g) => {
      goldFrame(g, 170, 330, 740, 1000);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#2a1a10"; g.fillRect(420, 1420, 240, 60); g.fillStyle = "#e2b847"; g.font = "800 34px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NAPOLEON I", 540, 1451); g.restore();
      // the bunny hops onto the bottom of the frame
      const h = since(t, bn - 0.35, 0.45); if (h > 0) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); const x = lerp(1180, 760, smooth(h)), y = 1385 - Math.sin(h * Math.PI) * 160; g.translate(x, y); g.scale(330, -330); const st = settleRabbit(HERO, (tt) => ({ hop: tt < bn + 0.1 ? 1 : 0, phase: (tt - bn + 0.35) * 2.2 + 0.5, face: tt > bn + 0.1 ? "hungry" : "happy", chew: tt > bn + 0.6 ? 1 : 0, headTilt: 0.15 }), t, S.a); drawRabbit(g, HERO, st, t, "side", -1, 1, 0.012); g.restore(); }
      ribbon(g, "NAPOLEON vs BUNNIES", 190, since(t, bn, 0.3), 72);
      if (t > eu && t < bn) { const kk = since(t, eu, 0.3); popText(g, "HALF OF EUROPE", W / 2, 200, 80, kk, "#e2b847", -0.03); }
      vignette(g, 0.3);
    };
  } else if (i === 1) {
    // July 1807: the treaty is signed (Tilsit). Then: party.
    const sg = wt(1, "signed"), cel = wt(1, "celebrate");
    cam = camFor(0.2, 2.0, lerp(560, 620, smooth(k)), 1.2, 1150);
    bg = (g) => { meadow(g, cam, t, PAL.day, { sunAt: [-40, 40], seed: 2, poplars: true }); pond(g, cam, 0, 40, 40, 8, t); pavilion(g, cam, 0, 9); };
    items.push({ z: 1.6, draw: (g) => { g.save(); const s = at(g, cam, 0.3, 0, 1.6); if (s) table(g, outline(s), since(t, sg, 0.6), t > sg + 0.6); g.restore(); } });
    items.push(person(cam, NAP, (tt) => tt > cel - 0.1 ? { armL: [2.9, 0.4, 0.2], armR: [2.9, 0.4, 0.2], face: "grin", bounce: Math.abs(Math.sin((tt - cel) * 9)) * 0.08, squash: tt < cel + 0.15 ? -0.1 : 0 } : { armL: [0.15, 0.1, 0.3], armR: [0.7 + (tt > sg && tt < sg + 0.7 ? Math.sin(tt * 30) * 0.15 : 0), 0.15, 1.2], face: tt > sg ? "smug" : "neutral", headPitch: -0.2 }, t, S.a, 0.3, 2.3, "front", 1, 0, (g, h, e, side, far) => { if (t < cel - 0.1) quill(Math.sin(t * 30) * 0.2)(g, h, e, -side, far); }));
    items.push(person(cam, SOLD, (tt) => ({ armR: tt > cel ? [2.7, 0.3, 0.3] : [0.1, 0.1, 0.2], face: tt > cel ? "happy" : "neutral", bounce: tt > cel ? Math.abs(Math.sin(tt * 8)) * 0.05 : 0 }), t, S.a, -2.4, 3.2, "front", 1, 0, (g, h, e, s, f) => { if (s < 0) musket()(g, h, e, s, f); }));
    fg = (g) => { ribbon(g, "JULY 1807", 250, since(t, S.a + 0.15, 0.35), 84); if (t > sg) ribbon(g, "PEACE TREATY ✓", 400, since(t, sg + 0.3, 0.3), 56, "#fff3d6", "#2a4fa0"); if (t > cel) { confetti(g, t, cel, 11); for (const [x, y, d] of [[260, 520, 0], [820, 460, 0.25], [560, 380, 0.5]] as [number, number, number][]) { const kk = clamp01((t - cel - d) / 0.6); if (kk > 0 && kk < 1) burst(g, x, y, 150 * kk, 1 - kk, ["#e2b847", "#ffffff", "#e86a8a"][Math.floor(d * 4) % 3], 12); } } };
  } else if (i === 2) {
    // Berthier plans the hunt on an easel
    const nm = wt(2, "berthier"), hunt = wt(2, "hunt");
    cam = camFor(-0.1, 1.2, lerp(760, 800, smooth(k)), 1.4, 1450);
    bg = (g) => tentInside(g);
    items.push({ z: 1.8, draw: (g) => { g.save(); const s = at(g, cam, 0.55, 0, 1.8); if (s) easel(g, outline(s), since(t, hunt - 0.2, 0.4), t); g.restore(); } });
    items.push(person(cam, BERT, (tt) => ({ armL: tt > hunt - 0.3 ? [1.3 + Math.sin(tt * 7) * 0.12, 0.2, 0.2] : [0.6, 0.2, 1.4], armR: [0.3, 0.75, 1.9], hips: 0.5, face: tt > hunt ? "grin" : "smug", headYaw: tt > hunt ? 0.4 : 0.1, bounce: tt > nm && tt < nm + 0.3 ? 0.04 : 0, lean: 0.05 }), t, S.a, -0.9, 1.2, "side", 1, 0, (g, h, e, s, f) => { if (s > 0) stick(0.75, "#3a2a1a", 0.035)(g, h, e, s, f); }));
    fg = (g) => { ribbon(g, "MARSHAL BERTHIER", 230, since(t, nm, 0.3), 62); popText(g, "CHIEF OF STAFF", W / 2, 345, 50, since(t, nm + 0.25, 0.3), "#fff3d6", 0); };
  } else if (i === 3) {
    // the problem: the men BOUGHT tame rabbits from farmers. Hundreds. Maybe thousands.
    const pb = wt(3, "problem"), bought = wt(3, "bought"), hund = wt(3, "hundreds"), thou = wt(3, "thousands");
    const pull = smooth((t - hund + 0.2) / 1.6);
    cam = camFor(lerp(0, 0.5, pull), lerp(2.2, 2.0, pull), lerp(560, 230, pull), lerp(1.2, 2.4, pull), lerp(1150, 1050, pull));
    bg = (g) => { meadow(g, cam, t, PAL.day, { sunAt: [50, 40], seed: 3 }); farmhouse(g, cam, 6, 30); };
    fenceIt(items, cam, -20, 20, 7, "#a37a4a");
    items.push(person(cam, FARMER, (tt) => ({ armL: [0.9, 0.3, 1.3], armR: [0.9, 0.3, 1.3], face: tt > bought + 0.5 ? "grin" : "happy", headYaw: 0.2 }), t, S.a, 1.1, 2.2, "front"));
    items.push(crateItem(cam, 1.1, 1.9, 0, t, 3, 0.85, 2));
    items.push(person(cam, SOLD, (tt) => ({ armL: tt > bought ? [1.4, 0.2, 0.2] : [0.1, 0.1, 0.2], face: "neutral", headYaw: -0.1 }), t, S.a, -0.9, 2.2, "side", 1, 0, (g, h, e, s, f) => { if (t > bought && s > 0 && !f) { g.save(); g.translate(h[0] + 0.05, h[1] - 0.05); const p = new Path2D(); p.ellipse(0, 0, 0.12, 0.1, 0, 0, 7); g.strokeStyle = INK; g.lineWidth = 0.04; g.stroke(p); g.fillStyle = "#c9a65a"; g.fill(p); g.fillStyle = "#e2b847"; g.font = "800 0.1px sans-serif"; g.restore(); } }));
    // stacks of crates appear as the camera pulls back
    if (t > hund - 0.3) { const r = rng(33); for (let j = 0; j < 48; j++) { const x = -9 + (j % 12) * 1.55 + (r() - 0.5) * 0.3, z = 5 + Math.floor(j / 12) * 2.2, st = j % 3 === 0 ? 2 : 1; const app = since(t, hund - 0.2 + (j % 12) * 0.04 + Math.floor(j / 12) * 0.1, 0.25); if (app <= 0 || (Math.abs(x - 1.1) < 1.3 && z < 6)) continue; for (let q = 0; q < st; q++) items.push(crateItem(cam, x, z - q * 0.001, 0, t, j * 3 + q, q * 0.62 + (1 - easeOutBack(app)) * 2.5, 2)); } }
    fg = (g) => {
      if (t < hund - 0.2) ribbon(g, "ONE PROBLEM...", 250, since(t, pb - 0.1, 0.3), 76);
      if (t > bought && t < hund) popText(g, "TAME RABBITS", W / 2, 400, 82, since(t, bought + 0.3, 0.3), "#e2b847", 0.03);
      if (t > hund) popText(g, "HUNDREDS", W / 2, 260, 100, since(t, hund, 0.3), "#ffffff", -0.04);
      if (t > thou) popText(g, "THOUSANDS?!", W / 2, 400, 110, since(t, thou, 0.3), "#e2b847", 0.05);
    };
  } else if (i === 4) {
    // the hunt line from behind: the cages open, the hunters raise their guns
    const op = wt(4, "open"), rs = wt(4, "raise");
    cam = camFor(0, 0.8, 520, 1.8, 1250, { y: 1.8 });
    bg = (g) => { meadow(g, cam, t, PAL.gold, { sunAt: [30, 35], seed: 4 }); };
    for (let j = 0; j < 7; j++) items.push(crateItem(cam, -6 + j * 2, 11, since(t, op + j * 0.05, 0.3), t, 50 + j, 0, 2));
    const line: [Actor, number, number][] = [[HUNT[0], -2.6, 1.8], [HUNT[1], -1.3, 2.0], [NAP, 0.15, 1.5], [HUNT[2], 1.5, 2.0], [HUNT[3], 2.8, 1.8]];
    line.forEach(([A, x, z], j) => items.push(person(cam, A, (tt) => { const up = since(tt, rs + j * 0.06, 0.25); return { armL: up > 0 ? [lerp(0.2, 1.5, up), 0.6, lerp(0.2, 0.9, up)] : [0.15, 0.2, 0.6], armR: up > 0 ? [lerp(0.2, 1.4, up), 0.3, lerp(0.2, -0.5, up)] : [0.15, 0.2, 0.5], face: "neutral", headYaw: 0, squash: up > 0 && up < 1 ? -0.05 : 0 }; }, t, S.a, x, z, "back", 1, 0, (g, h, e, s, f) => { if (s > 0) musket(0.25)(g, h, e, s, f); })));
    fg = (g) => { popText(g, "CREAK", W / 2 + 200, 760, 70, since(t, op, 0.2) * (1 - since(t, op + 0.7, 0.3)), "#fff3d6", 0.1); vignette(g, 0.2); };
  } else if (i === 5) {
    // reverse angle: the bunnies come out, look up... and run straight AT Napoleon
    const inst = wt(5, "instead"), runAt = wt(5, "rabbits") + 0.1, nap = wt(5, "napoleon");
    cam = camFor(0, 1.0, lerp(420, 520, smooth(k)), 1.6, 1260);
    bg = (g) => { meadow(g, cam, t, PAL.gold, { sunAt: [-40, 35], seed: 5 }); };
    for (let j = 0; j < 5; j++) items.push(crateItem(cam, -5 + j * 2.5, 1.3, 1, t, 70 + j, 0, 0));
    // the hunters on the far side, guns up; Napoleon in the middle
    items.push(person(cam, NAP, (tt) => ({ armL: [1.5, 0.6, 0.9], armR: [1.4, 0.3, -0.5], face: tt > nap ? "shock" : tt > runAt ? "worried" : "smug", headPitch: tt > runAt ? -0.2 : 0, bounce: tt > nap && tt < nap + 0.3 ? 0.05 : 0 }), t, S.a, 0, 9, "front", 1, 0, (g, h, e, s, f) => { if (s > 0) musket(0.25)(g, h, e, s, f); }));
    [-3, -1.6, 1.6, 3].forEach((x, j) => items.push(person(cam, HUNT[j], (tt) => ({ armL: [1.5, 0.6, 0.9], armR: [1.4, 0.3, -0.5], face: tt > runAt ? "shock" : "neutral" }), t, S.a, x, 9.4 + (j % 2) * 0.4, "front", 1, 0, (g, h, e, s, f) => { if (s > 0) musket(0.25)(g, h, e, s, f); })));
    for (let j = 0; j < 30; j++) {
      const r = rng(500 + j), x0 = -5 + (j % 5) * 2.5 + (r() - 0.5) * 0.6, z0 = 1.6 + r() * 0.8;
      const go = Math.max(0, t - runAt - r() * 0.4), out = since(t, S.a + 0.2 + r() * 0.8, 0.4);
      const tx = lerp(x0, (r() - 0.5) * 2.2, clamp01(go / 2.2)), tz = z0 + go * 2.6;
      if (out <= 0) continue;
      items.push(bun(cam, BUNS[j], (tt) => { const g0 = tt - runAt - r() * 0.4; return g0 > 0 ? { hop: 1, phase: tt * 2.4 + j * 0.3, face: "hungry", ears: 0.1 } : tt > inst ? { face: "curious", headTilt: Math.sin(tt * 2 + j) * 0.25, beg: 0.7, ears: -0.1 } : { face: "neutral", chew: 1 }; }, t, S.a, go > 0 ? tx : x0, go > 0 ? tz : z0 + (1 - out) * -0.5, go > 0 ? "back" : "front", 1));
    }
    fg = (g) => { if (t > inst && t < runAt) { const p = proj(cam, 0, 2.6, 2); if (p) popText(g, "?", W / 2, 640, 120, since(t, inst + 0.2, 0.25), "#fff3d6"); } if (t > nap) popText(g, "!", W / 2, 520, 150, since(t, nap, 0.2), "#e2b847"); };
  } else if (i === 6) {
    // close-up: not scared. They think it's feeding time.
    const sc = wt(6, "scared"), fe = wt(6, "feeding");
    cam = camFor(0, 0.4, 2400, 0.55, 1560);
    bg = (g) => { meadow(g, cam, t, PAL.gold, { seed: 6, trees: false }); };
    items.push(bun(cam, HERO, (tt) => ({ face: tt > fe ? "hungry" : tt > sc ? "happy" : "curious", beg: tt > fe - 0.2 ? 1 : 0.2, ears: tt > fe ? -0.15 : 0.05, headTilt: tt > fe ? Math.sin(tt * 4) * 0.12 : 0.1, bounce: tt > fe ? Math.abs(Math.sin(tt * 6)) * 0.03 : 0, chew: tt > sc && tt < fe ? 1 : 0 }), t, S.a, 0.05, 0.4, "front", 1, 0, 1));
    for (let j = 0; j < 4; j++) items.push(bun(cam, BUNS[40 + j], (tt) => ({ face: "hungry", beg: 0.8, headTilt: Math.sin(tt * 3 + j) * 0.2 }), t, S.a, -1.1 + (j % 2) * 2.2 + (j > 1 ? 0.3 : 0), 2.5 + j * 0.4, "front", 1));
    fg = (g) => {
      if (t > sc && t < fe) popText(g, "NOT SCARED", W / 2, 320, 90, since(t, sc, 0.3), "#fff3d6", -0.03);
      if (t > fe - 0.1) { thought(g, 620, 520, since(t, fe - 0.1, 0.35), (gg) => { lettuce(gg, -120, 30, 1.2); carrot(gg, 60, 10, 1.1, 0.4 + Math.sin(t * 3) * 0.1); carrot(gg, 170, 30, 0.9, -0.3); }); ribbon(g, "FEEDING TIME", 230, since(t, fe, 0.3), 82); }
    };
  } else if (i === 7) {
    // everyone laughs... then the bunnies just keep coming
    const lg = wt(7, "laughs"), kp = wt(7, "keep");
    const waves = Math.max(0, t - kp + 0.8);
    cam = camFor(0.2, 2.6, lerp(500, 440, smooth(k)), 1.3, 1100);
    bg = (g) => { meadow(g, cam, t, PAL.gold, { sunAt: [-40, 35], seed: 7 }); };
    const laughing = (tt: number) => tt > lg - 0.1 && tt < kp + 0.3;
    const pplPose = (j: number) => (tt: number): Pose => laughing(tt) ? { face: "happy", mouthOpen: 0.4 + Math.abs(Math.sin(tt * 10 + j)) * 0.5, bounce: Math.abs(Math.sin(tt * 9 + j)) * 0.04, lean: -0.12, armL: [0.3, 0.6, 2.2], armR: j === 0 ? [0.4, 0.3, 2.2] : [0.6, 0.4, 1.6] } : tt > kp ? { face: j === 0 ? "worried" : "shock", headYaw: Math.sin(tt * 3 + j) * 0.4, armL: [0.2, 0.2, 0.3], armR: [0.2, 0.2, 0.3], lean: 0.05 } : { face: "smug", armR: j === 0 ? HAND_IN : [0.1, 0.1, 0.2] };
    items.push(person(cam, NAP, pplPose(0), t, S.a, 0.1, 2.6, "front"));
    items.push(person(cam, BERT, pplPose(1), t, S.a, -1.5, 3.1, "front"));
    items.push(person(cam, HUNT[1], pplPose(2), t, S.a, 1.7, 3.2, "front"));
    for (let j = 0; j < 6; j++) items.push(bun(cam, BUNS[j], (tt) => ({ face: "hungry", beg: j % 2 ? 0.9 : 0.4, headTilt: Math.sin(tt * 2 + j) * 0.2, chew: j === 2 ? 1 : 0 }), t, S.a, -1.4 + j * 0.55, 1.6 + (j % 2) * 0.3, "front"));
    // waves pour in over the hill
    for (let j = 0; j < 80; j++) { const r = rng(800 + j), wv = Math.floor(j / 16), t0 = wv * 0.45 + r() * 0.3; const go = waves - t0; if (go <= 0) continue; const x = (r() - 0.5) * 16, z = 22 - go * 4.5 + (j % 4) * 0.6; if (z < 3.6) continue; items.push(bun(cam, BUNS[(j + 10) % BUNS.length], hopPose(j, 2.4), t, S.a, x, z, "front")); }
    fg = (g) => { if (laughing(t)) popText(g, "HA HA HA", W / 2, 320, 100, since(t, lg, 0.25), "#fff3d6", Math.sin(t * 8) * 0.04); if (t > kp) popText(g, "...HA?", W / 2, 320, 100, since(t, kp + 0.3, 0.25), "#e2b847", 0.04); };
  } else if (i === 8) {
    // the swarm around his legs; the riding crop; sticks and whips
    const sw = wt(8, "swings"), stx = wt(8, "sticks");
    const close = t < stx - 0.15;
    cam = close ? camFor(0, 1.2, 700, 1.0, 1200, { shake: t > sw && t < sw + 0.4 ? 4 : 0 }) : camFor(0, 2.2, 470, 1.3, 1160);
    bg = (g) => { meadow(g, cam, t, PAL.gold, { sunAt: [40, 35], seed: 8 }); };
    const swing = (tt: number) => (tt > sw ? Math.sin((tt - sw) * 7) : 0);
    items.push(person(cam, NAP, (tt) => ({ armR: [1.2, 0.2, 0.2], armL: tt > sw ? [1.6 + swing(tt) * 1.1, 0.3, 0.3] : [0.3, 0.3, 0.5], face: tt > sw ? "angry" : "worried", headPitch: -0.3, lean: tt > sw ? swing(tt) * 0.12 : -0.05, bounce: Math.abs(Math.sin(tt * 7)) * 0.02 }), t, S.a, 0, close ? 1.2 : 2.6, "side", 1, 0, (g, h, e, s, f) => { if (s > 0) stick(0.75, "#2a1a14", 0.03, (t > sw ? swing(t) * 0.4 : 0))(g, h, e, s, f); }));
    if (!close) {
      const wav = (j: number) => (tt: number): Pose => ({ armL: [2.2 + Math.sin(tt * 9 + j) * 0.7, 0.3, 0.3], armR: [0.4, 0.3, 0.4], face: "shout", lean: Math.sin(tt * 9 + j) * 0.08, mouthOpen: 0.5 });
      items.push(person(cam, HUNT[0], wav(0), t, S.a, -2.2, 3.0, "side", 1, 0, (g, h, e, s, f) => { if (s > 0) stick(0.9, "#7a5030", 0.06, Math.sin(t * 9) * 0.3)(g, h, e, s, f); }));
      items.push(person(cam, HUNT[2], wav(2), t, S.a, 2.3, 3.0, "side", -1, 0, (g, h, e, s, f) => { if (s > 0) stick(1.0, "#3a2a1a", 0.025, Math.sin(t * 11) * 0.6)(g, h, e, s, f); }));
    }
    const N = close ? 22 : 40;
    for (let j = 0; j < N; j++) { const r = rng(900 + j), a = r() * Math.PI * 2, rad = 0.45 + r() * (close ? 1.4 : 3.2); const ang = a + t * (0.6 + r() * 0.5) * (j % 2 ? 1 : -1); const x = Math.cos(ang) * rad, z = (close ? 1.2 : 2.6) + Math.sin(ang) * rad * 0.6; const dodge = t > sw ? Math.max(0, Math.sin((t - sw) * 7 + j)) : 0; items.push(bun(cam, BUNS[j + 20], (tt) => ({ hop: 0.6, phase: tt * 2.6 + j * 0.31, face: tt > sw && j % 3 === 0 ? "smug" : "hungry", ears: 0.2 }), t, S.a, x, z, "side", Math.cos(ang + Math.PI / 2) > 0 ? 1 : -1, dodge * 0.15)); }
    fg = (g) => { if (t > sw && close) { const ph = (t - sw) * 7 % (Math.PI * 2); if (ph < 2) speedLines(g, W / 2 - 80, 900, 260, -1, t, 4, 7, "rgba(255,255,255,0.9)"); popText(g, "SWISH!", W / 2 + 180, 560, 90, since(t, sw, 0.2), "#fff3d6", 0.08); } if (!close) popText(g, "STICKS & WHIPS", W / 2, 300, 84, since(t, stx, 0.3), "#e2b847", -0.03); };
  } else if (i === 9) {
    // "Nothing works." A high, still view: a sea of bunnies; Napoleon stands in the middle of it
    cam = camFor(0, 3, 300, 4, 1050);
    bg = (g) => { meadow(g, cam, t, PAL.gold, { seed: 9 }); };
    items.push(person(cam, NAP, () => ({ face: "worried", armL: [0.05, 0.1, 0.1], armR: [0.05, 0.1, 0.1], headPitch: -0.3 }), t, S.a, 0, 3, "front"));
    for (let j = 0; j < 130; j++) { const r = rng(1200 + j), a = r() * 7, rad = 0.6 + Math.sqrt(r()) * 7.5; const x = Math.cos(a) * rad, z = 3 + Math.sin(a) * rad * 0.8; items.push(bun(cam, BUNS[j % BUNS.length], (tt) => ({ face: j % 7 === 0 ? "happy" : "hungry", beg: j % 3 === 0 ? 0.9 : 0, chew: j % 2, headTilt: Math.sin(tt * 1.5 + j) * 0.15 }), t, S.a, x, z, r() > 0.3 ? "front" : "side", r() > 0.5 ? 1 : -1)); }
    fg = (g) => { ribbon(g, "NOTHING WORKS", 230, since(t, S.a + 0.15, 0.3), 80); };
  } else if (i === 10) {
    // the Emperor of France retreats... to his carriage (the camera whips to the 3D carriage)
    const em = wt(10, "emperor"), ca = wt(10, "carriage");
    const whip = smooth((t - ca + 0.35) / 0.45);
    const nx = -3 + u * 3.2;
    cam = camFor(lerp(nx + 0.8, 9.5, whip), 3, 470, 1.4, 1130);
    car = { x: 10.5, z: 5, yaw: 0, bounce: 0, roll: 0, pitch: 0, wheel: 0, door: 1, visible: true };
    bg = (g) => { meadow(g, cam, t, PAL.gold, { sunAt: [-40, 35], seed: 10, poplars: true }); };
    items.push(person(cam, NAP, (tt) => ({ run: 1, phase: tt * 1.9, face: "scared", armL: [1.6, 0.2, 1.4], armR: [1.3, 0.2, 1.4], lean: 0.25 }), t, S.a, nx, 3, "side", 1));
    for (let j = 0; j < 16; j++) { const r = rng(1400 + j); items.push(bun(cam, BUNS[j + 60], hopPose(j, 2.6), t, S.a, nx - 1.0 - r() * 4.5, 2.2 + r() * 2.2, "side", 1)); }
    fg = (g) => { ribbon(g, "EMPEROR OF FRANCE", 230, since(t, em, 0.3) * (1 - since(t, ca - 0.4, 0.2)), 66); if (whip > 0 && whip < 1) speedLines(g, W / 2, 900, 600, -1, t, 6, 10); if (t > ca) popText(g, "RETREAT!", W / 2, 260, 96, since(t, ca, 0.3), "#e2b847", -0.04); };
  } else if (i === 11) {
    // the chase, all the way to the carriage; he dives in
    const there = wt(11, "there");
    const nx = lerp(-4, 9.6, smooth(clamp01(u / (there - S.a + 0.3))));
    cam = camFor(Math.min(nx - 0.4, 9.0), 3.2, 430, 1.5, 1130);
    const inn = t > there + 0.2;
    car = { x: 10.5, z: 5, yaw: 0, bounce: inn ? Math.sin((t - there - 0.2) * 20) * 0.05 * Math.exp(-(t - there - 0.2) * 4) : 0, roll: 0, pitch: 0, wheel: 0, door: inn ? 1 - since(t, there + 0.35, 0.2) * 0.85 : 1, visible: true };
    bg = (g) => { meadow(g, cam, t, PAL.gold, { sunAt: [-40, 35], seed: 11, poplars: true }); };
    if (!inn) items.push(person(cam, NAP, (tt) => ({ run: 1, phase: tt * 2.1, face: "scared", armL: [1.6, 0.2, 1.4], armR: [1.3, 0.2, 1.4], lean: 0.3 }), t, S.a, nx, 3.3, "side", 1, t > there - 0.3 ? Math.sin(since(t, there - 0.3, 0.5) * Math.PI) * 0.8 : 0));
    for (let j = 0; j < 24; j++) { const r = rng(1500 + j); const bx = Math.min(nx - 0.7 - r() * 3.2, 8.9 - r() * 1.5); items.push(bun(cam, BUNS[j + 80], hopPose(j, 2.8), t, S.a, bx, 2.0 + r() * 2.8, "side", 1)); }
    fg = (g) => { for (let j = 0; j < 2; j++) { const p = proj(cam, nx - 1.5, 1.2 + j * 0.6, 3.3); if (p && !inn) speedLines(g, p[0], p[1], 160, 1, t + j, 3, 5); } if (inn) popText(g, "SLAM!", W / 2 + 150, 620, 96, since(t, there + 0.35, 0.2), "#fff3d6", 0.08); };
  } else if (i === 12) {
    // "a few hopped right inside": the open carriage door, Napoleon on the seat, bunnies hop in
    const hp = wt(12, "hopped"), acc = wt(12, "accounts");
    cam = camFor(0.15, 4.8, 600, 1.6, 1230);
    car = { x: 0.15, z: 5.3, yaw: 0, bounce: 0, roll: 0, pitch: 0, wheel: 0, door: 1, visible: true };
    bg = (g) => { meadow(g, cam, t, PAL.gold, { seed: 12, trees: true, poplars: true }); };
    items.push(person(cam, NAP, (tt) => ({ sit: 1, face: tt > hp + 0.4 ? "shock" : "worried", armL: tt > hp + 0.4 ? [2.4, 0.5, 0.3] : [0.4, 0.4, 1.2], armR: [0.4, 0.4, 1.2], headYaw: tt > hp ? 0.3 : 0, bounce: tt > hp + 0.4 && tt < hp + 0.7 ? 0.06 : 0 }), t, S.a, 0.15, 5.05, "front", 1, 0.85));
    for (let j = 0; j < 3; j++) {
      const t0 = hp - 0.2 + j * 0.3, h = since(t, t0, 0.55);
      const x = lerp(1.6 + j * 0.5, -0.25 + j * 0.4, smooth(h)), y = h >= 1 ? [1.45, 2.3, 1.15][j] : lerp(0, [1.45, 2.3, 1.15][j], smooth(h)) + Math.sin(h * Math.PI) * 0.8;
      items.push(bun(cam, BUNS[100 + j], (tt) => { const hh = since(tt, t0, 0.55); return hh > 0 && hh < 1 ? { hop: 1, phase: 0.3 + hh * 0.4, face: "happy" } : hh >= 1 ? { face: j === 1 ? "smug" : "hungry", chew: 1, beg: j === 0 ? 0.8 : 0 } : { face: "hungry", beg: 0.6 }; }, t, S.a, x, 4.95 - j * 0.01, h >= 1 ? "front" : "side", -1, y, 0.9));
    }
    fg = (g) => { ribbon(g, "SOME ACCOUNTS SAY...", 230, since(t, acc - 0.1, 0.3), 58); };
  } else if (i === 13) {
    // the source: General Thiebault's memoirs; "may be a little exaggerated" (the sketch grows a giant bunny)
    const mem = wt(13, "memoirs"), ex = wt(13, "exaggerated");
    bg = (g) => memoirDesk(g, t, u, mem, ex);
    cam = camFor(-2.2, 1.4, 560, 1.4, 1880);
    fg = (g) => { ribbon(g, "GEN. THIEBAULT'S MEMOIRS", 210, since(t, mem, 0.3), 52); if (t > ex) { const kk = since(t, ex, 0.3); g.save(); g.translate(W / 2 + 150, 1010); g.rotate(-0.2); g.scale(easeOutBack(kk), easeOutBack(kk)); g.strokeStyle = "#c8262a"; g.lineWidth = 10; g.strokeRect(-230, -55, 460, 110); g.fillStyle = "#c8262a"; g.font = "800 50px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("EXAGGERATED?", 0, 4); g.restore(); } };
  } else if (i === 14) {
    // the contrast: beat entire armies... chased off by hungry bunnies (two comic panels)
    const arm = wt(14, "armies"), ch = wt(14, "chased");
    bg = (g) => panels(g, t, u, arm, ch);
  } else {
    // eight years later: Waterloo (a signpost at dusk, no battle). But the rabbits got him first.
    const wl = wt(15, "waterloo"), rb = wt(15, "rabbits"), first = wt(15, "first");
    if (t < rb - 0.15) {
      cam = camFor(lerp(0, 0.4, smooth(k * 2)), 3, 420, 1.5, 1150);
      bg = (g) => { meadow(g, cam, t, PAL.dusk, { sunAt: [10, 9], seed: 15 }); };
      items.push({ z: 2.6, draw: (g) => { g.save(); const s = at(g, cam, 1.6, 0, 2.6); if (s) signpost(g, outline(s), since(t, wl - 0.2, 0.4)); g.restore(); } });
      items.push(person(cam, NAP, (tt) => ({ run: 0.25, phase: tt * 0.7, face: "worried", armR: HAND_IN, armL: [0.05, 0.1, 0.1], headPitch: -0.25 }), t, S.a, -1.6 + u * 0.35, 3.4, "back"));
      fg = (g) => { ribbon(g, "8 YEARS LATER", 230, since(t, S.a + 0.15, 0.3), 72); if (t > wl) popText(g, "1815", W / 2, 380, 100, since(t, wl, 0.3), "#ffd08a", -0.03); vignette(g, 0.3); };
    } else {
      cam = camFor(lerp(-0.3, 0.3, since(t, rb, 3)), 2.2, lerp(1300, 1150, since(t, rb, 2.5)), 0.6, 1440);
      bg = (g) => { meadow(g, cam, t, PAL.dusk, { sunAt: [2, 3], seed: 16, trees: false }); };
      items.push({ z: 2.3, draw: (g) => { g.save(); const s = at(g, cam, 0, 0, 2.3); if (s) knoll(g, outline(s)); g.restore(); } });
      items.push(bun(cam, HERO, (tt) => ({ hat: true, face: tt > first ? "smug" : "happy", beg: 1, headTilt: tt > first ? 0.15 : 0, bounce: since(tt, first, 0.15) * 0.06 * (1 - since(tt, first + 0.2, 0.3)), ears: -0.1 }), t, S.a, 0, 2.2, "front", 1, 0.34, 1.3));
      for (let j = 0; j < 14; j++) { const r = rng(1700 + j); items.push(bun(cam, BUNS[j + 110], (tt) => ({ face: "happy", chew: j % 2, beg: j % 3 === 0 ? 0.7 : 0 }), t, S.a, -4 + r() * 8, 4 + r() * 8, r() > 0.5 ? "side" : "front", r() > 0.5 ? 1 : -1)); }
      fg = (g) => { if (t > first - 0.2) ribbon(g, "THEY GOT HIM FIRST", 240, since(t, first - 0.2, 0.3), 70); for (let q = 0; q < 6; q++) { const a = q * 1.05 + t * 1.5, rr = 230 + Math.sin(t * 3 + q) * 30, kk = (t * 1.7 + q * 0.3) % 1; const px = W / 2 + Math.cos(a) * rr, py = 760 + Math.sin(a) * rr * 0.5, s2 = 12 + 16 * Math.sin(kk * Math.PI); g.fillStyle = "#fff6b0"; g.beginPath(); g.moveTo(px, py - s2); g.quadraticCurveTo(px, py, px + s2, py); g.quadraticCurveTo(px, py, px, py + s2); g.quadraticCurveTo(px, py, px - s2, py); g.quadraticCurveTo(px, py, px, py - s2); g.fill(); } vignette(g, 0.3); };
    }
  }
  return { cam, bg, items, fg, car };
}

// ---------------- extra painters ----------------
function fenceIt(items: Item[], c: Cam, x0: number, x1: number, z: number, col: string) { items.push({ z, draw: (g) => fence(g, c, x0, x1, z, undefined, col) }); }
function pavilion(g: Ctx, c: Cam, x: number, z: number) {
  // the striped pavilion (a nod to the famous Tilsit meeting on the river)
  const p = proj(c, x, 0, z); if (!p) return; const s = p[2];
  g.save(); g.translate(p[0], p[1]); g.scale(s, -s); const OL = outline(s, 0.06, 5);
  const body = new Path2D(); body.rect(-2.2, 0, 4.4, 2.4); g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(body); g.save(); g.clip(body); for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? "#f3ead2" : "#2f4f9a"; g.fillRect(-2.2 + i * 0.5, 0, 0.5, 2.4); } g.restore();
  const roof = new Path2D(); roof.moveTo(-2.5, 2.4); roof.lineTo(0, 3.8); roof.lineTo(2.5, 2.4); roof.closePath(); g.stroke(roof); g.fillStyle = "#c8262a"; g.fill(roof);
  g.fillStyle = "#1a1420"; g.fillRect(-0.6, 0, 1.2, 1.7);
  g.strokeStyle = INK; g.lineWidth = 0.05; g.beginPath(); g.moveTo(0, 3.8); g.lineTo(0, 4.6); g.stroke();
  const fl = new Path2D(); fl.rect(0, 4.1, 0.6, 0.45); g.fillStyle = "#2a4fa0"; g.fillRect(0, 4.1, 0.2, 0.45); g.fillStyle = "#ffffff"; g.fillRect(0.2, 4.1, 0.2, 0.45); g.fillStyle = "#c8262a"; g.fillRect(0.4, 4.1, 0.2, 0.45); g.lineWidth = OL; g.stroke(fl);
  g.restore();
}
function table(g: Ctx, OL: number, sign: number, sealed: boolean) {
  const fo = (p: Path2D, col: string) => { g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(p); g.fillStyle = col; g.fill(p); };
  for (const x of [-0.7, 0.7]) { const l = new Path2D(); l.rect(x - 0.04, 0, 0.08, 0.75); fo(l, "#6a4426"); }
  const top = new Path2D(); top.rect(-0.85, 0.72, 1.7, 0.1); fo(top, "#8a5a32");
  const cloth = new Path2D(); cloth.moveTo(-0.85, 0.82); cloth.lineTo(0.85, 0.82); cloth.lineTo(0.8, 0.45); cloth.quadraticCurveTo(0, 0.55, -0.8, 0.45); cloth.closePath(); fo(cloth, "#2a4fa0");
  const paper = new Path2D(); paper.rect(-0.35, 0.82, 0.7, 0.05); fo(paper, "#f6edd6");
  g.strokeStyle = "#3a2a1a"; g.lineWidth = 0.012; g.beginPath(); for (let i = 0; i <= 20 * sign; i++) { const x = -0.25 + i * 0.022, y = 0.85 + Math.sin(i * 1.7) * 0.01; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  if (sealed) { const sl = new Path2D(); sl.arc(0.22, 0.86, 0.05, 0, 7); fo(sl, "#c8262a"); }
}
function easel(g: Ctx, OL: number, k: number, t: number) {
  const fo = (p: Path2D, col: string, w = 2) => { g.strokeStyle = INK; g.lineWidth = OL * w; g.stroke(p); g.fillStyle = col; g.fill(p); };
  g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 0.08; g.beginPath(); g.moveTo(-0.6, 0); g.lineTo(-0.1, 2.2); g.moveTo(0.6, 0); g.lineTo(0.1, 2.2); g.moveTo(0, 0.3); g.lineTo(0, 2.1); g.stroke();
  g.strokeStyle = "#8a5a32"; g.lineWidth = 0.05; g.beginPath(); g.moveTo(-0.6, 0); g.lineTo(-0.1, 2.2); g.moveTo(0.6, 0); g.lineTo(0.1, 2.2); g.stroke();
  const board = new Path2D(); board.rect(-0.75, 0.85, 1.5, 1.2); fo(board, "#f6edd6");
  g.save(); g.translate(0, 1.45); g.scale(1, -1);
  g.fillStyle = "#3a2a1a"; g.font = "800 0.15px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.fillText("GRAND HUNT", 0, -0.42);
  g.font = "700 0.09px SubFont, Montserrat, Arial, sans-serif"; g.fillText("for the Emperor", 0, -0.3);
  // a little sketched bunny, and ticks
  g.strokeStyle = "#3a2a1a"; g.lineWidth = 0.02; g.beginPath(); g.ellipse(-0.25, 0.05, 0.16, 0.11, 0, 0, 7); g.moveTo(-0.08, -0.02); g.arc(-0.03, -0.04, 0.07, 0, 7); g.moveTo(-0.03, -0.11); g.lineTo(-0.06, -0.3); g.moveTo(0.0, -0.11); g.lineTo(0.05, -0.29); g.stroke();
  const items = ["DATE: JULY", "GUESTS: VIP", "RABBITS: ?"];
  g.font = "700 0.075px SubFont, Montserrat, Arial, sans-serif"; g.textAlign = "left";
  items.forEach((s, i) => { g.fillStyle = "#3a2a1a"; g.fillText(s, 0.1, -0.05 + i * 0.13); });
  if (k > 0) { g.strokeStyle = "#c8262a"; g.lineWidth = 0.025; g.beginPath(); g.ellipse(0.38, 0.19, 0.33 * k, 0.07 * k, 0, 0, 7); g.stroke(); }
  g.restore(); void t;
}
function farmhouse(g: Ctx, c: Cam, x: number, z: number) {
  const p = proj(c, x, 0, z); if (!p) return; const s = p[2];
  g.save(); g.translate(p[0], p[1]); g.scale(s, -s); const OL = outline(s, 0.08, 5);
  const fo = (q: Path2D, col: string) => { g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(q); g.fillStyle = col; g.fill(q); };
  const wall = new Path2D(); wall.rect(-3, 0, 6, 3); fo(wall, "#efe2c2");
  const roof = new Path2D(); roof.moveTo(-3.4, 3); roof.lineTo(-2.2, 4.8); roof.lineTo(2.2, 4.8); roof.lineTo(3.4, 3); roof.closePath(); fo(roof, "#b65a3a");
  const door = new Path2D(); door.rect(-0.5, 0, 1, 1.8); fo(door, "#6a4426");
  for (const wx of [-2, 1.5]) { const w = new Path2D(); w.rect(wx, 1.4, 0.8, 0.8); fo(w, "#6fa6c8"); }
  g.restore();
}
function signpost(g: Ctx, OL: number, k: number) {
  const fo = (p: Path2D, col: string) => { g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(p); g.fillStyle = col; g.fill(p); };
  const post = new Path2D(); post.rect(-0.07, 0, 0.14, 2.3); fo(post, "#6a4426");
  if (k <= 0) return;
  g.save(); g.translate(0, 1.85); g.rotate(-0.05 + (1 - easeOutBack(k)) * 0.4);
  const sgn = new Path2D(); sgn.moveTo(-0.2, -0.22); sgn.lineTo(1.4, -0.22); sgn.lineTo(1.7, 0); sgn.lineTo(1.4, 0.22); sgn.lineTo(-0.2, 0.22); sgn.closePath(); fo(sgn, "#d9b88a");
  g.scale(1, -1); g.fillStyle = "#3a2a1a"; g.font = "800 0.2px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("WATERLOO", 0.72, 0.01);
  g.restore();
}
function knoll(g: Ctx, OL: number) {
  const p = new Path2D(); p.moveTo(-2.6, 0); p.quadraticCurveTo(0, 0.75, 2.6, 0); p.closePath();
  g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(p); g.fillStyle = "#5e7a3e"; g.fill(p);
  g.fillStyle = "rgba(255,200,150,0.25)"; g.beginPath(); g.ellipse(0.3, 0.25, 1.4, 0.12, 0, 0, 7); g.fill();
}
function memoirDesk(g: Ctx, t: number, u: number, mem: number, ex: number) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createRadialGradient(780, 700, 60, 600, 900, 1200); gr.addColorStop(0, "#7a5034"); gr.addColorStop(1, "#24160e"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // desk
  g.fillStyle = "#5a361e"; g.fillRect(0, 1250, W, H - 1250); g.fillStyle = INK; g.fillRect(0, 1240, W, 14);
  // candle
  const fl = Math.sin(t * 13) * 4 + Math.sin(t * 7.3) * 3;
  g.fillStyle = "#efe2c2"; g.strokeStyle = INK; g.lineWidth = 6; g.fillRect(900, 1020, 60, 220); g.strokeRect(900, 1020, 60, 220);
  const glow = g.createRadialGradient(930, 980, 10, 930, 980, 260); glow.addColorStop(0, "rgba(255,220,140,0.55)"); glow.addColorStop(1, "rgba(255,220,140,0)"); g.fillStyle = glow; g.fillRect(600, 700, 660, 600);
  g.fillStyle = "#ffcf5a"; g.beginPath(); g.ellipse(930 + fl * 0.3, 985, 16, 34 + fl, 0, 0, 7); g.fill(); g.fillStyle = "#fff6c8"; g.beginPath(); g.ellipse(930, 995, 7, 15, 0, 0, 7); g.fill();
  // the book opens
  const o = since(t, mem - 0.1, 0.5);
  g.save(); g.translate(540, 820);
  g.fillStyle = INK; g.fillRect(-330, -230, 660, 470);
  g.fillStyle = "#7a2a2a"; g.fillRect(-320, -220, 640, 450);
  if (o > 0) {
    // two pages
    for (const sd of [-1, 1]) { g.save(); g.scale(sd < 0 ? 1 : 1, 1); const w = 300 * (sd < 0 ? o : 1); g.fillStyle = "#f6edd6"; g.strokeStyle = INK; g.lineWidth = 5; g.fillRect(sd < 0 ? -w : 0, -205, w, 420); g.strokeRect(sd < 0 ? -w : 0, -205, w, 420); g.restore(); }
    g.fillStyle = "#5a4a3a"; g.font = "800 30px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center";
    if (o > 0.8) { g.fillText("MEMOIRS", -150, -150); g.font = "700 22px SubFont, Montserrat, Arial, sans-serif"; g.fillText("of General", -150, -112); g.fillText("Thiebault", -150, -84); g.fillStyle = "#b9a888"; for (let i = 0; i < 6; i++) g.fillRect(-270, -40 + i * 34, 240 - (i % 3) * 30, 9); }
    // sketch on the right page: a little Napoleon and bunnies; on "exaggerated" one bunny becomes giant
    const big = since(t, ex, 0.5);
    g.strokeStyle = "#3a2a1a"; g.lineWidth = 4; g.lineCap = "round";
    g.beginPath(); g.arc(100, -20, 22, 0, 7); g.moveTo(100, 2); g.lineTo(100, 80); g.moveTo(100, 80); g.lineTo(85, 130); g.moveTo(100, 80); g.lineTo(115, 130); g.moveTo(100, 30); g.lineTo(70, 55); g.moveTo(100, 30); g.lineTo(130, 50); g.stroke();
    g.beginPath(); g.moveTo(68, -38); g.quadraticCurveTo(100, -70, 132, -38); g.closePath(); g.fillStyle = "#3a2a1a"; g.fill();
    const bs = lerp(1, 3.4, easeOutBack(big));
    for (let j = 0; j < 3; j++) { const bx = 175 + j * 38 + (j === 0 ? (bs - 1) * 25 : 0), by = 130; const s = j === 0 ? bs : 1; g.save(); g.translate(bx, by); g.scale(s, s); g.beginPath(); g.ellipse(0, -14, 18, 13, 0, 0, 7); g.moveTo(14, -24); g.arc(10, -26, 9, 0, 7); g.moveTo(10, -34); g.lineTo(6, -56); g.moveTo(14, -34); g.lineTo(18, -55); g.stroke(); g.restore(); }
  }
  // the quill keeps writing on the left page
  if (o > 0.8 && t < ex) { const qx = -250 + ((t * 90) % 220), qy = -30 + Math.floor((t * 90) / 220) % 6 * 34; g.save(); g.translate(qx, qy); g.rotate(-0.5 + Math.sin(t * 14) * 0.08); const q = new Path2D(); q.moveTo(0, 0); q.quadraticCurveTo(40, -90, 20, -200); q.quadraticCurveTo(-25, -95, 0, 0); g.strokeStyle = INK; g.lineWidth = 5; g.stroke(q); g.fillStyle = "#fbf6ea"; g.fill(q); g.restore(); }
  g.restore();
  void u;
}
function panels(g: Ctx, t: number, u: number, arm: number, ch: number) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#f4ead2"; g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(180,150,100,0.18)"; for (let i = 0; i < 40; i++) { const r = rng(i); g.beginPath(); g.arc(r() * W, r() * H, 30 + r() * 90, 0, 7); g.fill(); }
  const panel = (y: number, h: number, k: number, inside: (g: Ctx) => void, rot: number) => {
    if (k <= 0) return; const s = easeOutBack(k);
    g.save(); g.translate(W / 2, y + h / 2); g.rotate(rot); g.scale(s, s);
    g.fillStyle = INK; g.fillRect(-470, -h / 2 - 10, 940, h + 20);
    g.save(); g.beginPath(); g.rect(-460, -h / 2, 920, h); g.clip(); inside(g); g.restore();
    g.restore();
  };
  // panel 1: the map table with army flags marching
  panel(170, 560, since(t, t - u + 0.1, 0.35), (gg) => {
    gg.fillStyle = "#c9b98a"; gg.fillRect(-460, -280, 920, 560);
    gg.strokeStyle = "rgba(90,70,40,0.5)"; gg.lineWidth = 6; gg.beginPath(); gg.moveTo(-460, -40); gg.bezierCurveTo(-200, -120, 100, 60, 460, -60); gg.moveTo(-300, -280); gg.bezierCurveTo(-250, 0, -320, 120, -200, 280); gg.stroke();
    const n = Math.floor(clamp01((t - arm + 0.8) / 1.0) * 9);
    for (let i = 0; i < 9; i++) { const x = -360 + (i % 5) * 170, y = -150 + Math.floor(i / 5) * 190; const cap = i < n; gg.strokeStyle = INK; gg.lineWidth = 5; gg.beginPath(); gg.moveTo(x, y + 60); gg.lineTo(x, y - 40); gg.stroke(); gg.fillStyle = cap ? "#2a4fa0" : "#8a8a8a"; gg.fillRect(x, y - 40, 60, 40); gg.strokeRect(x, y - 40, 60, 40); if (cap) { gg.fillStyle = "#ffffff"; gg.fillRect(x + 20, y - 40, 20, 40); gg.fillStyle = "#c8262a"; gg.fillRect(x + 40, y - 40, 20, 40); } }
  }, -0.02);
  popText(g, "ENTIRE ARMIES", W / 2, 110, 76, since(t, arm, 0.3), "#2a4fa0", -0.03, "#fff3d6");
  // panel 2: the Emperor fleeing a tide of bunnies
  panel(830, 560, since(t, ch - 0.2, 0.35), (gg) => {
    const sky2 = gg.createLinearGradient(0, -280, 0, 280); sky2.addColorStop(0, "#8fcaf0"); sky2.addColorStop(1, "#d8eeb0"); gg.fillStyle = sky2; gg.fillRect(-460, -280, 920, 560);
    gg.fillStyle = "#77b64a"; gg.fillRect(-460, 120, 920, 160);
    gg.save(); gg.translate(220, 170); gg.scale(190, -190); const st = settle(NAP, () => ({ run: 1, phase: t * 2, face: "scared", armL: [1.6, 0.2, 1.4], armR: [1.3, 0.2, 1.4], lean: 0.3 }), t, t - u); drawFigure(gg, NAP, st, t, "side", 1, 1, 0.025); gg.restore();
    for (let j = 0; j < 9; j++) { const R = BUNS[j]; gg.save(); gg.translate(-380 + j * 62 + ((t * 120) % 62), 200 - (j % 2) * 20); gg.scale(150, -150); const st = settleRabbit(R, hopPose(j, 2.6), t, t - u); drawRabbit(gg, R, st, t, "side", 1, 1, 0.03); gg.restore(); }
  }, 0.02);
  popText(g, "HUNGRY BUNNIES", W / 2, 780, 76, since(t, ch + 0.3, 0.3), "#c8262a", 0.03, "#fff3d6");
}

// ---------------- the composition ----------------
const Layer: React.FC<{ t: number; which: "back" | "front"; S: Shot }> = ({ t, which, S }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    camTransform(g, S.cam, t);
    const tz = S.car?.visible ? S.car.z : -1e9;
    if (which === "back") { g.save(); S.bg(g); g.restore(); }
    const list = S.items.filter((it) => (which === "back" ? it.z > tz : it.z <= tz)).sort((a, b) => b.z - a.z);
    for (const it of list) { g.save(); it.draw(g); g.restore(); }
    if (which === "front" && S.fg) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); S.fg(g); g.restore(); }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
const flashAt = (t: number) => { for (const s of SHOTS) { const d = t - s.a; if (s.i > 0 && d >= 0 && d < 0.1) return 1 - d / 0.1; } return 0; };

type Post = { subs: boolean; audio: boolean; car: boolean };
export const NapoleonRabbits: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const on: Post = { subs: true, audio: true, car: true, ...((getInputProps() as { post?: Partial<Post> }).post ?? {}) };
  const S = shot(t);
  const fl = flashAt(t);
  return (
    <AbsoluteFill style={{ background: "#cfe6b0" }}>
      <Layer t={t} which="back" S={S} />
      {S.car?.visible && on.car ? (
        <ThreeCanvas width={W} height={H} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }} camera={{ fov: 30, near: 0.2, far: 3000 }}>
          <CarriageLayer cam={S.cam} car={S.car} />
        </ThreeCanvas>
      ) : null}
      <Layer t={t} which="front" S={S} />
      {fl > 0 && <AbsoluteFill style={{ background: "#fffaf0", opacity: fl * 0.5 }} />}
      {on.subs && <Subtitles words={WORDS} style={napSubStyle} />}
      {withAudio && on.audio && <Audio src={staticFile("napoleon/mix.wav")} />}
    </AbsoluteFill>
  );
};
void bush;
