// "The Great Emu War, 1932": a mostly-2D cartoon short. Painted 2.5D outback stages on a canvas (real parallax),
// 2D rubber-hose soldiers / farmers / politicians (cartoon/figure.ts) and 2D emus (cartoon/emu.ts), one 3D army truck
// (cartoon/Truck3D.tsx) in a transparent three.js layer locked to the same camera, approved-style subtitles and the
// soundtrack (narration + original music + effects, public/emu/mix.wav).
// Every shot is a pure function of time, cut on the narration's real line and word timings.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import { actor, settle, drawFigure, Look, Pose, Actor } from "../cartoon/figure";
import { makeEmu, settleEmu, drawEmu, Emu, EmuPose } from "../cartoon/emu";
import { TruckLayer, TruckState } from "../cartoon/Truck3D";
import { rng } from "../bridge/paint";
import {
  Ctx, Cam, W, H, INK, cam0, proj, camTransform, at, outline, sky, sun, cloud, ground, hills, wheat, fence, gumTree, bush, pond,
  dust, speedLines, burst, popText, clamp01, smooth, lerp, easeOutBack, hexA,
} from "../cartoon/stage";
import lines from "../../stories/emu-war/lines.json";
import words from "../../stories/emu-war/words.json";

export const FPS = 30;
const LINES = lines as { start: number; end: number; text: string }[];
const WORDS = words as Word[];
export const EMU_TOTAL = Math.ceil((LINES[LINES.length - 1].end + 1.6) * FPS);
export const EMU_KEYWORDS = ["emus", "emu", "birds", "army", "australia", "western", "guns", "bullets", "jammed", "lookout", "medals", "tanks", "undefeated", "round", "no"];
export const emuSubStyle = defaultStyle("funny", { keyWords: EMU_KEYWORDS });

// ---------------- timing helpers ----------------
const LEAD = 0.25; // cut a little before the line starts
/** shot i covers narration line i (the hook shots split lines 1 and 2) */
export const SHOTS = LINES.map((l, i) => ({ i, a: i === 0 ? 0 : l.start - LEAD, b: i === LINES.length - 1 ? EMU_TOTAL / FPS : LINES[i + 1].start - LEAD }));
export const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
/** start time of the n-th occurrence of a word inside line li (falls back to the line start) */
export function wt(li: number, word: string, n = 0) {
  const ws = WORDS.filter((w) => w.line === li && norm(w.w) === norm(word));
  return ws[n]?.s ?? LINES[li].start;
}
const since = (t: number, t0: number, d = 0.25) => clamp01((t - t0) / d);
/** a camera that shows a 1.9 m figure standing at depth z as hPx tall, feet at screen row feet (above the subtitles) */
function camFor(x: number, z: number, hPx: number, y = 1.3, feet = 1130, o: Partial<Cam> = {}): Cam {
  const k = 260, f = 10, s = hPx / 1.9, d = (k * f) / s;
  return cam0({ x, y, z: z - d, k, f, tilt: feet - H / 2 - y * s, ...o });
}

// ---------------- cast ----------------
const KHAKI = "#a8925e", KHAKI_D = "#8a7748", HAT = "#9c8456";
const L_MAJOR: Look = { coat: KHAKI, pants: KHAKI_D, hat: "slouch", hatCol: HAT, moustache: "#5a3a22", pockets: true, belly: 1.12, scale: 1.04, skin: "#f1c6a0", hair: "#5a3a22" };
const L_SGT: Look = { coat: KHAKI, pants: KHAKI_D, hat: "slouch", hatCol: HAT, pockets: true, skin: "#e9b58a", hair: "#2b1b12" };
const L_GUN: Look = { coat: KHAKI, pants: KHAKI_D, hat: "slouch", hatCol: HAT, pockets: true, skin: "#f6d3b1", hair: "#c06a2c", scale: 0.96 };
const L_FARM: Look[] = [
  { coat: "#e8e0cc", pants: "#44608a", hat: "wide", hatCol: "#b08a5a", vest: "#6b4a2f", medal: true, moustache: "#6b3f22", skin: "#d79c72", hair: "#6b3f22" },
  { coat: "#9fb6cf", pants: "#3e4a5c", hat: "wide", hatCol: "#8a6a44", skin: "#f3c9a0", hair: "#2b1b12", beard: "#2b1b12" },
  { coat: "#d9a0a0", pants: "#5c4a3a", hat: "wide", hatCol: "#c9a46a", vest: "#3e5a3a", skin: "#e9b58a", hair: "#c99a4b", belly: 1.15 },
];
const L_POL: Look[] = [
  { coat: "#2f3340", pants: "#2a2d38", hat: "bowler", hatCol: "#1c1c22", tie: "#b8312f", moustache: "#c9c2b5", hair: "#c9c2b5", belly: 1.2 },
  { coat: "#3a2f2a", pants: "#2a2420", hat: "bowler", hatCol: "#1c1c22", tie: "#2f5fa8", hair: "#2b1b12" },
  { coat: "#34404a", pants: "#262c33", hat: "none", tie: "#d6a43a", hair: "#7a5a3a", beard: "#7a5a3a" },
  { coat: "#2a2a30", pants: "#202026", hat: "bowler", hatCol: "#1c1c22", tie: "#7a2f5f", moustache: "#2b1b12", belly: 1.1 },
];
const MAJOR = actor(L_MAJOR, 1), SGT = actor(L_SGT, 2), GUN = actor(L_GUN, 3);
const FARM = L_FARM.map((L, i) => actor(L, 20 + i));
const POL = L_POL.map((L, i) => actor(L, 40 + i));
const HERO = makeEmu(7); HERO.body = "#6b5646";
const FLOCK: Emu[] = Array.from({ length: 70 }, (_, i) => makeEmu(100 + i));

type Item = { z: number; draw: (g: Ctx) => void };
type Shot = { cam: Cam; bg: (g: Ctx) => void; items: Item[]; fg?: (g: Ctx) => void; truck?: TruckState; grade?: string; sunSide?: number };

// draw helpers: put a 2D character on the stage at (x, z) on the ground (y = height above ground)
function person(c: Cam, A: Actor, poseAt: (t: number) => Pose, t: number, t0: number, x: number, z: number, view: "side" | "front" | "back", dir = 1, y = 0, ls = 1): Item {
  return { z, draw: (g) => {
    const st = settle(A, poseAt, t, t0);
    g.save(); const s = at(g, c, x, y, z); if (s) { shadow(g, 0.55); drawFigure(g, A, st, t, view, dir, ls, outline(s)); } g.restore();
  } };
}
function bird(c: Cam, E: Emu, poseAt: (t: number) => EmuPose, t: number, t0: number, x: number, z: number, view: "side" | "front" | "back", dir = 1, y = 0, ls = 1, sc = 1): Item {
  return { z, draw: (g) => {
    const st = settleEmu(E, poseAt, t, t0);
    g.save(); const s = at(g, c, x, y, z, sc); if (s) { if (y < 0.3) shadow(g, 0.6); drawEmu(g, E, st, t, view, dir, ls, outline(s * sc)); } g.restore();
  } };
}
function shadow(g: Ctx, r: number) { g.fillStyle = "rgba(60,30,10,0.28)"; g.beginPath(); g.ellipse(0, 0.0, r, r * 0.22, 0, 0, 7); g.fill(); }

/** the Lewis gun on its bipod, drawn in metres (muzzle toward +x); fire 0..1 flashes, jam shows the stoppage */
function lewis(g: Ctx, OL: number, t: number, fire: number, jam = 0) {
  const fo = (p: Path2D, col: string) => { g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(p); g.fillStyle = col; g.fill(p); };
  const kick = fire > 0 ? Math.abs(Math.sin(t * 60)) * 0.03 : 0;
  g.save(); g.translate(-kick, 0);
  // bipod
  g.strokeStyle = INK; g.lineWidth = 0.05 + OL * 2; g.beginPath(); g.moveTo(0.55, 0.42); g.lineTo(0.75, 0); g.moveTo(0.55, 0.42); g.lineTo(0.4, 0); g.stroke();
  g.strokeStyle = "#3a3a3a"; g.lineWidth = 0.05; g.beginPath(); g.moveTo(0.55, 0.42); g.lineTo(0.75, 0); g.moveTo(0.55, 0.42); g.lineTo(0.4, 0); g.stroke();
  const shroud = new Path2D(); shroud.roundRect(-0.1, 0.36, 0.95, 0.16, 0.06); fo(shroud, "#4a4d4a");
  for (let i = 0; i < 7; i++) { g.strokeStyle = "#2e302e"; g.lineWidth = 0.02; g.beginPath(); g.moveTo(0.0 + i * 0.12, 0.37); g.lineTo(0.0 + i * 0.12, 0.51); g.stroke(); }
  const barrel = new Path2D(); barrel.rect(0.85, 0.41, 0.25, 0.06); fo(barrel, "#3a3a3a");
  const body = new Path2D(); body.roundRect(-0.45, 0.34, 0.4, 0.17, 0.04); fo(body, "#55585a");
  const stock = new Path2D(); stock.moveTo(-0.45, 0.46); stock.lineTo(-0.95, 0.38); stock.lineTo(-0.95, 0.24); stock.lineTo(-0.45, 0.34); stock.closePath(); fo(stock, "#8a5a32");
  const pan = new Path2D(); pan.ellipse(-0.22, 0.56, 0.24, 0.06, 0, 0, 7); fo(pan, "#3e403e");
  g.restore();
  if (fire > 0 && Math.floor(t * 20) % 2 === 0) { // muzzle flash
    g.save(); g.translate(1.16, 0.44); g.scale(1, 1);
    const f = new Path2D(); for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; const rr = (i % 2 ? 0.07 : 0.2) * (0.8 + 0.4 * Math.sin(t * 90 + i)); i ? f.lineTo(Math.cos(a) * rr * 1.4 + 0.08, Math.sin(a) * rr) : f.moveTo(Math.cos(a) * rr * 1.4 + 0.08, Math.sin(a) * rr); }
    f.closePath(); g.fillStyle = "#ffe36b"; g.strokeStyle = "#ff8a2b"; g.lineWidth = 0.03; g.fill(f); g.stroke(f);
    g.restore();
  }
  if (jam > 0) { // steam puff + a popped spring
    for (let i = 0; i < 3; i++) { const k = clamp01(jam * 1.4 - i * 0.15); g.fillStyle = `rgba(240,240,240,${0.85 * (1 - k * 0.6)})`; g.beginPath(); g.arc(-0.2 + i * 0.12 + k * 0.1, 0.62 + k * 0.5 + i * 0.05, 0.08 + k * 0.12, 0, 7); g.fill(); }
    const k = clamp01(jam * 2);
    g.strokeStyle = "#c9c9c9"; g.lineWidth = 0.025; g.beginPath();
    for (let i = 0; i <= 30; i++) { const u = i / 30; const x = -0.25 + u * 0.25 * k + Math.sin(u * 40) * 0.035, y = 0.55 + u * 0.55 * k + Math.cos(u * 40) * 0.035; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
}
function gunItem(c: Cam, x: number, z: number, t: number, fire: number, jam = 0, dir = 1, y = 0, sc = 1): Item {
  return { z: z - 0.01, draw: (g) => { g.save(); const s = at(g, c, x, y, z, sc); if (s) { if (dir < 0) g.scale(-1, 1); lewis(g, outline(s * sc), t, fire, jam); } g.restore(); } };
}

// ---------------- the outback ----------------
const PAL = {
  day: { top: "#3f97d8", mid: "#8bcdf0", low: "#fde4b4", near: "#d99a58", far: "#e9c58d", hill1: "#c58a57", hill2: "#ad7448", tree: "#7f9a58" },
  dawn: { top: "#5a7fc0", mid: "#f2b38a", low: "#ffe0a8", near: "#c98a52", far: "#e8b98a", hill1: "#b27a5a", hill2: "#9a6248", tree: "#6f8a50" },
  dusk: { top: "#3b3f86", mid: "#e2758a", low: "#ffc27a", near: "#a8653e", far: "#d48a5c", hill1: "#8a4f4a", hill2: "#6e3e3e", tree: "#4f5a3a" },
};
type Pal = typeof PAL.day;
function outback(g: Ctx, c: Cam, t: number, P: Pal, opts: { sunAt?: [number, number]; clouds?: boolean; trees?: boolean; seed?: number } = {}) {
  sky(g, c, P.top, P.mid, P.low);
  if (opts.sunAt) sun(g, c, opts.sunAt[0], opts.sunAt[1], 0.06, P === PAL.dusk ? "#ffd08a" : "#fff3c4");
  if (opts.clouds !== false) { const s = opts.seed ?? 1; for (let i = 0; i < 5; i++) cloud(g, c, (i - 2) * 260 + Math.sin(i * 3 + s) * 90 + t * 3, 120 + (i % 3) * 45, 900 + i * 60, 90 + (i % 2) * 40, s * 10 + i, P === PAL.dusk ? "#ffd2c2" : "#ffffff", P === PAL.dusk ? "#d9909a" : "#dbe7f4"); }
  hills(g, c, 700, 60, P.hill2, 3 + (opts.seed ?? 0)); ground(g, c, P.near, P.far); hills(g, c, 380, 28, P.hill1, 5 + (opts.seed ?? 0));
  if (opts.trees !== false) { const r = rng(opts.seed ?? 4); for (let i = 0; i < 9; i++) gumTree(g, c, (r() - 0.5) * 260 + c.x * 0.6, 120 + r() * 120, 9 + r() * 5, i + 50, t, P.tree, "#5c7a40"); }
}

// ---------------- the shots ----------------
function shot(t: number): Shot {
  const S = shotAt(t), u = t - S.a, D = S.b - S.a, i = S.i;
  const k = clamp01(u / D);
  const items: Item[] = [];
  let cam = cam0();
  let bg: (g: Ctx) => void = () => {};
  let fg: ((g: Ctx) => void) | undefined;
  let truck: TruckState | undefined;

  if (i === 0) {
    // HOOK: a standoff in the wheat at dawn. The emu pops up on "birds".
    cam = camFor(lerp(-0.1, -0.25, smooth(k)), 1.9, lerp(520, 590, smooth(k)), 1.2);
    const pop = wt(0, "birds"), war = wt(0, "war");
    bg = (g) => { outback(g, cam, t, PAL.dawn, { sunAt: [40, 26], seed: 2 }); wheat(g, cam, -40, 40, 6, 60, t, { col: "#f0c25a", dark: "#c08a34" }); };
    items.push(person(cam, MAJOR, (tt) => ({ armL: [1.3, 0.1, 0.4], armR: [1.1, 0.1, 0.6], face: tt > pop + 0.2 ? "shock" : tt > war ? "smug" : "neutral", lean: 0.12, bounce: tt > pop + 0.2 && tt < pop + 0.5 ? -0.04 : 0, look: 1 }), t, S.a, -1.35, 1.6, "side", 1));
    items.push(gunItem(cam, -0.85, 1.5, t, 0));
    items.push(bird(cam, HERO, (tt) => { const p = since(tt, pop - 0.25, 0.25), up = since(tt, pop, 0.18); return { squash: -0.25 * p * (1 - up) + 0.12 * up * (1 - since(tt, pop + 0.2, 0.3)), bounce: -0.9 * (1 - up), face: up > 0.5 ? "smug" : "curious", neck: -0.2, headTilt: up > 0.5 ? 0.15 * Math.sin(tt * 3) : 0, look: -0.5 }; }, t, S.a, 1.5, 2.6, "side", -1));
    fg = (g) => { popText(g, "1932", W / 2, 330, 150, since(t, 0.35, 0.35), "#ffffff", -0.04); };
  } else if (i === 1) {
    // "And the birds won." The emu struts past the dejected Major; a scoreboard pops.
    cam = camFor(0.3, 1.6, 600, 1.2);
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [-60, 40], seed: 3 }); wheat(g, cam, -40, 40, 7, 60, t); };
    items.push(person(cam, MAJOR, (tt) => ({ armL: [0.05, 0.1, 0.1], armR: [0.05, 0.1, 0.1], face: "worried", lean: -0.15, headPitch: -0.25, bounce: -0.03 }), t, S.a, -0.95, 1.8, "front"));
    const sx = lerp(3.0, 0.9, smooth(u / 1.3));
    items.push(bird(cam, HERO, (tt) => { const uu = tt - S.a; const walking = uu < 1.3; return { run: walking ? 0.45 : 0, phase: uu * 1.4, face: "proud", neck: walking ? 0 : -0.25, bounce: walking ? 0 : Math.abs(Math.sin(uu * 5)) * 0.03, wing: walking ? 0 : 0.6, beak: 0 }; }, t, S.a, sx, 1.4, "side", -1));
    fg = (g) => { scoreboard(g, since(t, S.a + 0.6, 0.3)); };
  } else if (i === 2) {
    // the map: Western Australia's wheat belt, emus pouring in
    bg = (g) => mapScene(g, t, u, D);
  } else if (i === 3) {
    // feasting in the crops, then one emu smashes the fence (on "smashed")
    const sm = wt(3, "smashed");
    cam = camFor(lerp(-1, 1, smooth(k)), 5.5, 320, 1.6, 1100);
    const eaten = (x: number, z: number) => clamp01(1 - Math.max(0, u - 0.4 - ((x * 7 + z * 3) % 1.2 + 1.2) % 1.2) * 1.2);
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [50, 40], seed: 4 }); wheat(g, cam, -30, 30, 4, 40, t, { crop: (x, z) => (z < 14 ? eaten(x, z) : 1) }); };
    for (let j = 0; j < 8; j++) {
      const x = -5 + j * 1.5 + Math.sin(j * 2.3) * 0.6, z = 6 + (j % 3) * 2.5;
      items.push(bird(cam, FLOCK[j], (tt) => ({ peck: Math.max(0, Math.sin((tt - S.a) * 5 + j * 1.3)) ** 2, face: j % 2 ? "happy" : "neutral", headTilt: Math.sin(tt * 2 + j) * 0.1 }), t, S.a, x, z, "side", j % 2 ? 1 : -1));
    }
    const run = since(t, sm - 0.7, 0.01);
    const ex = lerp(-6.5, 5, clamp01((t - (sm - 0.6)) / 1.0));
    fenceItem(items, cam, -14, 14, 3.0, (x) => clamp01((t - sm) * 4) * (Math.abs(x - 0.0) < 2.5 ? 1 : 0));
    if (run > 0) items.push(bird(cam, HERO, (tt) => ({ run: 1, phase: (tt - S.a) * 3.2, face: "angry", neck: 0.6, squash: tt > sm && tt < sm + 0.12 ? -0.2 : 0 }), t, S.a, ex, 3.6, "side", 1));
    fg = (g) => {
      const b = clamp01((t - sm) / 0.35);
      const p = proj(cam, 0, 0.8, 3.0); if (p && b > 0 && b < 1) { burst(g, p[0], p[1], 230, easeOutBack(b) * (1 - b * 0.4)); popText(g, "CRASH!", p[0], p[1] - 10, 96, easeOutBack(b), "#ff6a3d", -0.08); }
      if (p) for (let j = 0; j < 6; j++) { const a = clamp01((t - sm) / 1.2); if (a <= 0 || a >= 1) continue; const px = p[0] + Math.cos(j * 1.1) * a * 520, py = p[1] - Math.sin(j * 0.9 + 0.5) * 420 * a + 900 * a * a; plank(g, px, py, (j - 3) * a * 6, 0.9 * p[2]); }
      dust(g, cam, 0.5, 0, 3.0, clamp01((t - sm) / 0.9), 1.3);
    };
  } else if (i === 4) {
    // the farmers (ex-soldiers) and their letter to the army
    const ask = wt(4, "asked");
    cam = camFor(0, 2.2, lerp(470, 510, smooth(k)), 1.3);
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [-50, 45], seed: 5 }); wheat(g, cam, -30, 30, 10, 50, t, { crop: (x) => (Math.sin(x * 1.7) > 0.2 ? 0.25 : 0.9) }); };
    fenceItem(items, cam, -14, 14, 4.5, (x) => (Math.abs(x - 1) < 2.5 ? 1 : 0));
    const poses: ((tt: number) => Pose)[] = [
      (tt) => ({ armR: tt < ask ? [1.5, 0.2, 0.1 + Math.sin(tt * 8) * 0.2] : [0.3, 0.2, 2.0], armL: [0.1, 0.15, 0.3], face: tt < ask ? "angry" : "neutral", mouthOpen: tt < ask ? 0.3 + 0.3 * Math.sin(tt * 11) : 0, bounce: Math.abs(Math.sin(tt * 5)) * 0.02 }),
      (tt) => ({ armL: [0.3, 0.7, 1.9], armR: [0.3, 0.7, 1.9], hips: 1, face: "angry", headYaw: Math.sin(tt * 1.3) * 0.3 }),
      (tt) => ({ armR: [0.9 + Math.sin(tt * 6) * 0.25, 0.4, 1.4], armL: [0.2, 0.2, 0.4], face: "worried", headPitch: -0.1 }),
    ];
    [-1.55, 0, 1.55].forEach((x, j) => items.push(person(cam, FARM[j], poses[j], t, S.a, x, 2.0 + (j === 1 ? 0.6 : 0), "front")));
    fg = (g) => { const a = since(t, ask, 0.3); if (a > 0) letter(g, t - ask, a); popText(g, "EX-SOLDIERS", W / 2, 360, 80, since(t, wt(4, "exsoldiers"), 0.3), "#3df0ff", -0.03); };
  } else if (i === 5) {
    // "three men. Two machine guns. Ten thousand bullets." The 3D truck arrives; the men hop out and count off.
    const tThree = wt(5, "three"), tTwo = wt(5, "two"), tTen = wt(5, "ten");
    cam = camFor(0.8, 2.6, 400, 1.6, 1120);
    const arrive = smooth((u + 0.2) / 1.3);
    const tx = lerp(-16, 1.5, arrive);
    truck = { x: tx, z: 4.5, yaw: 0, bounce: Math.abs(Math.sin(u * 14)) * 0.05 * (1 - arrive) + (arrive > 0.98 ? Math.sin((u - 1.1) * 18) * 0.04 * Math.exp(-(u - 1.1) * 5) : 0), pitch: arrive > 0.95 ? -Math.sin((u - 1.1) * 14) * 0.04 * Math.exp(-(u - 1.1) * 4) : 0, roll: 0, wheel: tx * 1.6, visible: true };
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [-40, 40], seed: 6 }); bush(g, cam, -6, 14, 1.4, 3); bush(g, cam, 8, 12, 1.2, 4); };
    const men = [MAJOR, SGT, GUN], hop = [tThree - 0.1, tThree + 0.35, tThree + 0.75];
    men.forEach((A, j) => {
      const h = since(t, hop[j], 0.35); const jump = Math.sin(h * Math.PI) * 0.6;
      const x = lerp(tx - 1.5, -1.8 + j * 1.9, smooth(h)), z = lerp(4.0, 2.2, smooth(h));
      if (t < hop[j]) return;
      items.push(person(cam, A, (tt) => { const hh = since(tt, hop[j], 0.35); return { squash: hh >= 1 && tt < hop[j] + 0.5 ? -0.12 : 0, armL: hh < 1 ? [2.2, 0.6, 0.2] : j === 0 ? [0.4, 0.75, 1.9] : [2.9, 0.1, 0.1], armR: hh < 1 ? [2.2, 0.6, 0.2] : [0.1, 0.15, 0.2], hips: j === 0 && hh >= 1 ? 1 : 0, face: j === 0 ? "smug" : "grin" }; }, t, S.a, x, z, "front", 1, jump));
    });
    if (t > tTwo) { items.push(gunItem(cam, -3.4, 1.6, t, 0, 0, 1, 0, easeOutBack(since(t, tTwo, 0.3)))); items.push(gunItem(cam, 3.6, 1.6, t, 0, 0, -1, 0, easeOutBack(since(t, tTwo + 0.2, 0.3)))); }
    if (t > tTen) for (let j = 0; j < 6; j++) { const a = easeOutBack(since(t, tTen + j * 0.08, 0.25)); const x = -0.6 + (j % 3) * 0.62, y = Math.floor(j / 3) * 0.42; items.push({ z: 1.4, draw: (g) => { g.save(); const s = at(g, cam, x, y, 1.4, a); if (s) crate(g, outline(s)); g.restore(); } }); }
    fg = (g) => {
      popText(g, "3 MEN", W / 2, 300, 110, since(t, tThree, 0.3), "#ffffff", -0.04);
      popText(g, "2 MACHINE GUNS", W / 2, 420, 84, since(t, tTwo, 0.3), "#3df0ff", 0.03);
      popText(g, "10,000 BULLETS", W / 2, 530, 92, since(t, tTen, 0.3), "#ffd400", -0.02);
    };
  } else if (i === 6) {
    // "What could possibly go wrong?" the Major's confident close-up; an emu rises behind him
    cam = camFor(0.05, 0.3, lerp(1180, 1300, smooth(k)), 1.7, 1900);
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [-30, 40], seed: 7, trees: false }); };
    items.push(person(cam, MAJOR, (tt) => ({ armR: [2.2, 0.5, 2.3], armL: [0.3, 0.75, 1.9], hips: 0.5, face: "grin", headYaw: 0.25, bounce: Math.abs(Math.sin((tt - S.a) * 4)) * 0.015, squash: 0.02 * Math.sin(tt * 3) }), t, S.a, -0.15, 0.3, "front"));
    const rise = smooth((u - 0.6) / 0.6);
    items.push(bird(cam, HERO, (tt) => ({ face: "curious", neck: -0.1, headTilt: Math.sin(tt * 2.5) * 0.25, look: -1 }), t, S.a, 1.4, 4.5, "side", -1, lerp(-1.4, 0, rise)));
    fg = (g) => { thumbSpark(g, t); vignette(g, 0.25); };
  } else if (i === 7) {
    // DAY 1: the emus look at the guns... and scatter in every direction
    const look = wt(7, "look"), sc = wt(7, "scattered");
    cam = camFor(0, 0.5, 420, 2.4, 1350, { shake: t > sc ? 6 * Math.exp(-(t - sc) * 2) : 0 });
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [40, 40], seed: 8 }); };
    items.push(person(cam, GUN, (tt) => ({ armL: [1.3, 0.1, 0.4], armR: [1.2, 0.1, 0.5], face: tt > sc ? "shock" : "angry", lean: 0.2, headYaw: tt > sc ? Math.sin((tt - sc) * 9) * 0.6 : 0 }), t, S.a, -2.2, 0.5, "back"));
    items.push(gunItem(cam, -1.6, 0.4, t, 0, 0, 1));
    items.push(person(cam, SGT, (tt) => ({ armR: [1.6, 0.2, 0.1], face: tt > sc ? "shock" : "neutral", headYaw: tt > sc ? -Math.sin((tt - sc) * 7) * 0.6 : 0 }), t, S.a, 2.4, 0.2, "back"));
    for (let j = 0; j < 36; j++) {
      const r = rng(300 + j), x0 = (r() - 0.5) * 14, z0 = 12 + r() * 10, ang = Math.atan2(z0 - 16, x0) + (r() - 0.5) * 0.8;
      const go = Math.max(0, t - sc - r() * 0.25), dx = Math.cos(ang) * go * 7, dz = Math.sin(ang) * go * 5;
      const view = go > 0 ? (Math.abs(Math.cos(ang)) > 0.35 ? "side" : dz > 0 ? "back" : "front") : t > look ? "front" : "side";
      items.push(bird(cam, FLOCK[j], (tt) => { const g0 = tt - sc - r() * 0.25; return g0 > 0 ? { run: 1, phase: tt * 3.4 + j * 0.3, face: "shock", neck: 0.6 } : tt > look ? { face: "shock", neck: -0.4, bounce: since(tt, look, 0.15) * 0.08 * (1 - since(tt, look + 0.3, 0.3)) } : { peck: Math.max(0, Math.sin(tt * 4 + j)) ** 3, face: "neutral" }; }, t, S.a, x0 + dx, z0 + dz, view, Math.cos(ang) > 0 ? 1 : -1));
    }
    fg = (g) => { popText(g, "DAY 1", W / 2, 330, 120, since(t, S.a + 0.1, 0.3), "#ffffff", -0.04); if (t > look && t < sc + 0.5) for (let j = 0; j < 7; j++) { const p = proj(cam, -6 + j * 2, 2.2, 13 + (j % 3) * 3); if (p) popText(g, "!", p[0], p[1], 70 * (p[2] / 60), since(t, look + j * 0.04, 0.2), "#ffd400"); } };
  } else if (i === 8) {
    // DAY 3: the ambush at the dam; a thousand emus walk straight toward the hidden gunners
    cam = camFor(0.4, 1.6, lerp(430, 480, smooth(k)), 0.9, 1420);
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [-40, 35], seed: 9 }); pond(g, cam, 4, 9, 4.5, 2.2, t); };
    for (let j = 0; j < 60; j++) {
      const r = rng(500 + j), x = (r() - 0.5) * 30, z0 = 14 + r() * 40, z = z0 - u * 1.6;
      items.push(bird(cam, FLOCK[j % FLOCK.length], (tt) => ({ run: 0.38, phase: tt * 1.2 + j * 0.37, face: "neutral", neck: 0.1 }), t, S.a, x, z, "front", 1));
    }
    items.push({ z: 1.0, draw: (g) => { bush(g, cam, -1.0, 1.0, 0.8, 11, "#7f8f42"); bush(g, cam, 1.9, 1.1, 0.9, 12, "#8a9a4a"); } });
    items.push(person(cam, GUN, (tt) => ({ armL: [1.3, 0.1, 0.4], armR: [1.2, 0.1, 0.5], face: "worried", sit: 1, headPitch: 0.05, look: 1, headYaw: Math.sin(tt * 2) * 0.2 }), t, S.a, -1.5, 1.6, "side", 1));
    items.push(gunItem(cam, -0.95, 1.5, t, 0, 0, 1, 0.35));
    fg = (g) => { popText(g, "DAY 3", W / 2, 330, 120, since(t, S.a + 0.1, 0.3), "#ffffff", -0.04); popText(g, "~1,000 EMUS", W / 2, 460, 86, since(t, wt(8, "thousand"), 0.3), "#3df0ff", 0.03); };
  } else if (i === 9) {
    // "This was it. The big moment. And then... the gun jammed."
    const jam = wt(9, "jammed"), fireAt = jam - 0.7;
    const push = smooth(clamp01(u / (fireAt - S.a)));
    cam = camFor(lerp(-0.5, -0.3, push), 1.2, lerp(900, 1150, push), 0.9, 1480, { shake: t > fireAt && t < jam ? 5 : 0 });
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [-40, 35], seed: 9, trees: false }); pond(g, cam, 6, 12, 4.5, 2.2, t); };
    for (let j = 0; j < 24; j++) { const r = rng(700 + j); const flee = Math.max(0, t - jam - 0.4); items.push(bird(cam, FLOCK[j], (tt) => (tt > jam + 0.4 ? { run: 1, phase: tt * 3.2 + j, face: "happy", neck: 0.6 } : { run: 0.3, phase: tt * 1.1 + j, face: "neutral" }), t, S.a, (r() - 0.5) * 16 + flee * 6 * (r() > 0.5 ? 1 : -1), 12 + r() * 16 + flee * 3, flee > 0 ? "side" : "front", r() > 0.5 ? 1 : -1)); }
    items.push(person(cam, GUN, (tt) => ({ armL: [1.3, 0.1, 0.4], armR: [1.2, 0.1, 0.5], face: tt > jam ? "shock" : tt > fireAt ? "shout" : "worried", sit: 1, lean: 0.1, look: 1, bounce: tt > fireAt && tt < jam ? Math.sin(tt * 60) * 0.01 : tt > jam ? since(tt, jam, 0.1) * 0.06 * (1 - since(tt, jam + 0.2, 0.3)) : 0 }), t, S.a, -0.9, 1.2, "side", 1));
    items.push(gunItem(cam, -0.35, 1.1, t, t > fireAt && t < jam ? 1 : 0, clamp01((t - jam) / 0.8), 1, 0.35));
    fg = (g) => {
      if (t > fireAt && t < jam) popText(g, "RAT-A-TAT", W / 2 + 120, 520, 92, since(t, fireAt, 0.2), "#ffd400", -0.1);
      const jk = since(t, jam, 0.25); if (jk > 0) { burst(g, W / 2 + 60, 560, 200, easeOutBack(jk) * (1 - since(t, jam + 0.8, 0.4)), "#ffffff"); popText(g, "*CLUNK*", W / 2 + 60, 560, 100, easeOutBack(jk) * (1 - since(t, jam + 0.8, 0.4)), "#ff6a3d", 0.08); }
      if (t < fireAt) heartbeatVignette(g, t, push);
    };
  } else if (i === 10) {
    // the truck chase: the 3D truck bounces over the scrub, the emus simply outran it
    const out = wt(10, "outran");
    const vx = 7.5, tx = -4 + u * vx;
    cam = camFor(tx + 2.6, 5, 400, 1.9, 1130);
    truck = { x: tx, z: 5, yaw: 0, bounce: Math.abs(Math.sin(u * 11)) * 0.18 + Math.abs(Math.sin(u * 17)) * 0.08, pitch: Math.sin(u * 9) * 0.05, roll: Math.sin(u * 7) * 0.05, wheel: tx * 2, visible: true };
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [-40, 40], seed: 10 }); for (let j = -6; j < 20; j++) bush(g, cam, j * 9 + 3, 16 + (j % 3) * 4, 1.1, 60 + j); };
    // the gunner rides the bed, bouncing too much to aim
    items.push(person(cam, GUN, (tt) => ({ armL: [1.3, 0.1, 0.4], armR: [1.2, 0.1, 0.5], face: tt > out ? "shock" : "worried", lean: 0.1 + Math.sin((tt - S.a) * 9) * 0.15, bounce: Math.abs(Math.sin((tt - S.a) * 11)) * 0.12 }), t, S.a, tx - 1.2, 4.6, "side", 1, 1.1 + truck.bounce));
    items.push(gunItem(cam, tx - 0.4, 4.55, t, 0, 0, 1, 1.15 + truck.bounce));
    for (let j = 0; j < 7; j++) {
      const r = rng(900 + j), ev = vx * (1.3 + r() * 0.3), ex = -9 + r() * 4 + u * ev, ez = j % 2 ? 2.4 + r() : 7.5 + r() * 2;
      items.push(bird(cam, FLOCK[j + 10], (tt) => ({ run: 1, phase: (tt - S.a) * 3.6 + j * 0.4, face: tt > out && j === 2 ? "smug" : "happy", neck: 0.7, headTilt: tt > out && j === 2 ? -0.6 : 0, look: tt > out && j === 2 ? -1 : 1 }), t, S.a, ex, ez, "side", 1));
    }
    fg = (g) => { for (let j = 0; j < 3; j++) { const p = proj(cam, -6 + u * 9.5 + j * 2, 1.0, 2.6 + j); if (p) speedLines(g, p[0] - 60, p[1], 140, 1, t + j, 3, 5); } dust(g, cam, tx - 2.5, 0, 5, (u * 2) % 1, 1.6); dust(g, cam, tx - 3.2, 0, 5.2, (u * 2 + 0.5) % 1, 1.4); };
  } else if (i === 11) {
    // the lookout: one tall bird keeps watch; "Big brain move."
    const bb = wt(11, "big"), spot = wt(11, "keeping");
    cam = camFor(lerp(-0.3, 0.5, smooth(k)), 3.5, 470, 1.8, 1200);
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [40, 40], seed: 11 }); };
    items.push({ z: 3.52, draw: (g) => moundItem(g, cam) });
    for (let j = 0; j < 9; j++) { const r = rng(1100 + j); items.push(bird(cam, FLOCK[20 + j], (tt) => ({ peck: Math.max(0, Math.sin(tt * 3 + j)) ** 3, face: "neutral" }), t, S.a, -4 + r() * 8, 8 + r() * 6, "side", r() > 0.5 ? 1 : -1)); }
    items.push(bird(cam, HERO, (tt) => { const scan = Math.sin((tt - S.a) * 1.6); return tt > bb - 0.15 ? { face: "smug", wingTap: Math.abs(Math.sin((tt - bb) * 9)) > 0.3 ? 1 : 0.6, neck: -0.1, headTilt: 0.15 } : { tall: 1, headTilt: scan * 0.4, look: scan, face: tt > spot ? "shock" : "curious", beak: tt > spot && tt < spot + 0.5 ? 1 : 0 }; }, t, S.a, 0.6, 3.5, "side", -1, 0.55));
    fg = (g) => {
      popText(g, "LOOKOUT", W / 2, 330, 104, since(t, wt(11, "lookout"), 0.3), "#3df0ff", -0.03);
      if (t > bb - 0.1) { popText(g, "BIG BRAIN", W / 2, 470, 96, since(t, bb, 0.3), "#ffd400", 0.04); sparkles(g, W / 2 + 90, 820, t); }
      if (t > spot && t < bb - 0.2) popText(g, "!", W / 2 + 120, 650, 140, since(t, spot, 0.2), "#ff6a3d");
    };
  } else if (i === 12) {
    // pulled out after less than a week; parliament jokes about medals
    const pol = wt(12, "politicians"), med = wt(12, "medals");
    if (t < pol - 0.1) {
      cam = camFor(lerp(0, 1.2, smooth(k * 2)), 2.8, 420, 1.6, 1120);
      truck = { x: 5, z: 5, yaw: 0, bounce: 0, pitch: 0, roll: 0, wheel: 0, visible: true };
      bg = (g) => { outback(g, cam, t, PAL.dawn, { sunAt: [60, 20], seed: 12 }); };
      [MAJOR, SGT, GUN].forEach((A, j) => items.push(person(cam, A, (tt) => ({ run: 0.3, phase: tt * 0.9 + j * 0.3, armL: [0.05, 0.1, 0.1], armR: j === 1 ? [0.5, 0.2, 1.8] : [0.05, 0.1, 0.1], face: "worried", headPitch: -0.3, lean: -0.05 }), t, S.a, -3 + j * 1.6 + u * 1.1, 2.5 + j * 0.3, "side", 1)));
      fg = (g) => popText(g, "RETREAT", W / 2, 330, 110, since(t, S.a + 0.2, 0.3), "#ffffff", -0.04);
    } else if (t < med - 0.05) {
      cam = camFor(0, 1.9, 600, 1.6, 1200);
      bg = (g) => parliament(g, cam);
      POL.forEach((A, j) => items.push(person(cam, A, (tt) => { const l = Math.abs(Math.sin(tt * 9 + j)); return { face: "happy", mouthOpen: 0.3 + l * 0.5, bounce: l * 0.04, lean: -0.15 + l * 0.1, armL: j % 2 ? [0.8, 0.3, 1.6] : [0.2, 0.3, 2.3], armR: j % 2 ? [0.2, 0.3, 0.6] : [1.6, 0.2, 1.4 + l * 0.4] }; }, t, pol - 0.1, -1.55 + j * 1.05, 1.4 + (j % 2) * 1.1, "front")));
      fg = (g) => { popText(g, "HA HA HA", W / 2, 360, 100, since(t, pol, 0.25), "#ffffff", Math.sin(t * 8) * 0.04); };
    } else {
      cam = camFor(0.3, 1.2, lerp(950, 1050, since(t, med, 1.5)), 1.4, 1480);
      bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [40, 40], seed: 13, trees: false }); };
      HERO.P.medal = true;
      items.push(bird(cam, HERO, (tt) => ({ face: "proud", medal: since(tt, med, 0.2) > 0, neck: -0.25, bounce: since(tt, med, 0.15) * 0.06 * (1 - since(tt, med + 0.15, 0.3)), squash: 0.04 * Math.sin(tt * 4), wing: 0.4 }), t, med - 0.05, 0.3, 1.2, "front"));
      fg = (g) => { popText(g, "MEDALS?!", W / 2, 360, 110, since(t, med, 0.25), "#ffd400", 0.04); sparkles(g, W / 2, 900, t); };
    }
  } else if (i === 13) {
    // ROUND 2: the numbers. ~9,860 rounds for ~986 birds (Meredith's own disputed tally)
    const tb = wt(13, "nearly"), tf = wt(13, "fewer");
    cam = camFor(0, 2.0, 460, 1.5, 1120);
    const firing = t > S.a + 0.5;
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [-40, 40], seed: 14 }); };
    items.push(person(cam, GUN, (tt) => ({ armL: [1.3, 0.1, 0.4], armR: [1.2, 0.1, 0.5], face: "shout", sit: 1, lean: 0.1, bounce: firing ? Math.sin(tt * 60) * 0.01 : 0 }), t, S.a, -1.7, 1.6, "side", 1));
    items.push(gunItem(cam, -1.1, 1.5, t, firing ? 1 : 0, 0, 1, 0.35));
    items.push(person(cam, SGT, (tt) => ({ armL: [0.4, 0.5, 2.2], armR: [0.4, 0.5, 2.2], face: "worried", headYaw: 0.3 }), t, S.a, 1.5, 2.4, "front"));
    for (let j = 0; j < 12; j++) { const r = rng(1300 + j); items.push(bird(cam, FLOCK[30 + j], (tt) => ({ run: 1, phase: tt * 3 + j, face: "happy", neck: 0.6 }), t, S.a, ((r() * 30 + u * 6 * (r() > 0.5 ? 1 : -1)) % 30) - 15, 20 + r() * 12, "side", r() > 0.5 ? 1 : -1)); }
    // spent casings pile up next to the gun
    items.push({ z: 1.3, draw: (g) => { g.save(); const s = at(g, cam, -0.8, 0, 1.3); if (s) casings(g, clamp01(u / D), outline(s)); g.restore(); } });
    fg = (g) => {
      popText(g, "ROUND 2", W / 2, 300, 110, since(t, S.a + 0.1, 0.3), "#ffffff", -0.04);
      const nb = Math.round(9860 * smooth(clamp01((t - tb) / 1.4))), nf = Math.round(986 * smooth(clamp01((t - tf) / 1.0)));
      if (t > tb - 0.2) counter(g, "BULLETS", nb.toLocaleString("en-US"), 430, "#ffd400", since(t, tb - 0.2, 0.25));
      if (t > tf - 0.2) counter(g, "EMUS HIT", "< " + (nf || 1).toLocaleString("en-US"), 560, "#3df0ff", since(t, tf - 0.2, 0.25));
    };
  } else if (i === 14) {
    // "...take bullets like tanks": the Major explains; his thought bubble shows an emu tank
    const tk = wt(14, "tanks");
    cam = camFor(-0.5, 0.5, 760, 1.7, 1560);
    bg = (g) => { outback(g, cam, t, PAL.day, { sunAt: [40, 40], seed: 15, trees: false }); };
    items.push(person(cam, MAJOR, (tt) => ({ armR: [1.2 + Math.sin(tt * 5) * 0.3, 0.6, 1.0], armL: [0.3, 0.75, 1.9], hips: 0.6, face: tt > tk ? "shock" : "worried", mouthOpen: 0.25 + 0.25 * Math.abs(Math.sin(tt * 10)), headYaw: -0.2 }), t, S.a, -1.2, 0.5, "front"));
    fg = (g) => { const b = since(t, S.a + 0.4, 0.35); thought(g, 700, 620, b, (gg) => emuTank(gg, t, since(t, tk, 0.4))); popText(g, "LIKE TANKS", W / 2, 300, 104, since(t, tk, 0.3), "#3df0ff", -0.03); };
  } else if (i === 15) {
    // three more requests (1934, 1943, 1948): DENIED, DENIED, DENIED. "The answer? No."
    const no = wt(15, "no");
    bg = (g) => desk(g, t, u, no);
  } else {
    // today: hundreds of thousands of emus still roam Australia. Undefeated.
    const und = wt(16, "undefeated");
    cam = camFor(lerp(-0.6, 0.8, smooth(k)), 2.5, lerp(720, 600, smooth(k)), 1.7, 1200);
    bg = (g) => { outback(g, cam, t, PAL.dusk, { sunAt: [10, 9], seed: 16 }); };
    for (let j = 0; j < 22; j++) { const r = rng(1600 + j); items.push(bird(cam, FLOCK[40 + j], (tt) => ({ run: 0.35, phase: tt * 1.2 + j, face: "happy", neck: 0 }), t, S.a, -20 + r() * 40 + u * 0.9, 9 + r() * 30, "side", 1, 0, -1)); }
    HERO.P.medal = true;
    items.push(bird(cam, HERO, (tt) => ({ face: "proud", medal: true, neck: -0.2, wing: tt > und ? 1 : 0.2, bounce: since(tt, und, 0.15) * 0.08 * (1 - since(tt, und + 0.2, 0.3)), squash: tt > und && tt < und + 0.15 ? -0.1 : 0 }), t, S.a, 0.3, 2.5, "front", 1, 0, -1));
    fg = (g) => { popText(g, "UNDEFEATED", W / 2, 360, 120, since(t, und, 0.3), "#ffd400", -0.04); if (t > und) sparkles(g, W / 2, 360, t); vignette(g, 0.3); };
  }
  return { cam, bg, items, fg, truck };
}

// ---------------- extra painters ----------------
function wheatFront(g: Ctx, c: Cam, t: number, P: Pal) { void P; wheat(g, c, -20, 20, c.z + 2.2, c.z + 3.0, t, { col: "#f3c862", dark: "#b98432" }); }
function fenceItem(items: Item[], c: Cam, x0: number, x1: number, z: number, broken?: (x: number) => number) { items.push({ z, draw: (g) => fence(g, c, x0, x1, z, broken) }); }
function plank(g: Ctx, x: number, y: number, rot: number, s: number) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = INK; g.fillRect(-0.7 * s - 4, -0.08 * s - 4, 1.4 * s + 8, 0.16 * s + 8); g.fillStyle = "#9a6a3a"; g.fillRect(-0.7 * s, -0.08 * s, 1.4 * s, 0.16 * s); g.restore(); }
function crate(g: Ctx, OL: number) {
  const p = new Path2D(); p.rect(-0.3, 0, 0.6, 0.4); g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(p); g.fillStyle = "#6f7a42"; g.fill(p);
  g.fillStyle = "#e9dfc0"; g.save(); g.scale(1, -1); g.font = "800 0.11px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.fillText(".303", 0, -0.15); g.restore();
}
function casings(g: Ctx, k: number, OL: number) {
  const n = Math.floor(k * 60), r = rng(5);
  for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 0.9 * Math.min(1, i / 30 + 0.3), y = Math.max(0, 0.45 - Math.abs(x) * 0.8) * Math.min(1, i / 60) * r(); g.save(); g.translate(x, y); g.rotate(r() * 3); g.fillStyle = INK; g.fillRect(-0.05 - OL, -0.018 - OL, 0.1 + 2 * OL, 0.036 + 2 * OL); g.fillStyle = "#e0b448"; g.fillRect(-0.05, -0.018, 0.1, 0.036); g.restore(); }
}
function moundItem(g: Ctx, c: Cam) {
  const pts: [number, number][] = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI; const p = proj(c, 0.6 + Math.cos(a) * 3.2, Math.sin(a) * 0.55, 3.5); if (p) pts.push([p[0], p[1]]); }
  g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.strokeStyle = INK; g.lineWidth = 8; g.stroke(); g.fillStyle = "#a9773f"; g.fill(); g.save(); g.clip(); g.fillStyle = "rgba(255,230,180,0.25)"; g.fillRect(0, 0, W, (pts[12]?.[1] ?? 0) + 40); g.restore();
}
function scoreboard(g: Ctx, k: number) {
  if (k <= 0) return;
  const s = easeOutBack(k);
  g.save(); g.translate(W / 2, 360); g.scale(s, s); g.rotate(-0.03);
  g.fillStyle = INK; g.beginPath(); g.roundRect(-380, -110, 760, 220, 34); g.fill();
  g.fillStyle = "#2b2f3a"; g.beginPath(); g.roundRect(-368, -98, 736, 196, 26); g.fill();
  g.restore();
  popText(g, "EMUS  1", W / 2 - 170, 360, 78, k, "#ffd400", -0.03); popText(g, "ARMY  0", W / 2 + 170, 360, 78, k, "#ffffff", -0.03);
}
function letter(g: Ctx, tt: number, a: number) {
  const x = lerp(W / 2, W + 300, smooth((tt - 1.0) / 0.9)), y = 600 - Math.sin(clamp01((tt - 1.0) / 0.9) * Math.PI) * 220, rot = -0.08 + Math.sin(tt * 3) * 0.05 + smooth((tt - 1.0) / 0.9) * 0.6;
  const s = easeOutBack(a);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = INK; g.fillRect(-250, -160, 500, 320); g.fillStyle = "#f6edd6"; g.fillRect(-240, -150, 480, 300);
  g.fillStyle = "#6b5a46"; g.font = "800 34px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "left";
  g.fillText("TO: MINISTER", -210, -90); g.fillText("OF DEFENCE", -210, -48);
  g.font = "700 28px SubFont, Montserrat, Arial, sans-serif"; g.fillStyle = "#8a7a62"; for (let i = 0; i < 3; i++) g.fillRect(-210, 0 + i * 38, 380 - i * 70, 12);
  g.fillStyle = "#c8392f"; g.font = "800 40px SubFont, Montserrat, Arial Black, sans-serif"; g.fillText("HELP!", 40, 120);
  g.restore();
}
function thumbSpark(g: Ctx, t: number) { const k = (t * 1.3) % 1; g.fillStyle = `rgba(255,255,255,${1 - k})`; g.beginPath(); g.arc(W / 2 + 230, 760 - k * 30, 12 + k * 20, 0, 7); g.fill(); }
function vignette(g: Ctx, a: number) { const gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(20,10,30,${a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
function heartbeatVignette(g: Ctx, t: number, k: number) { const b = Math.pow(Math.max(0, Math.sin(t * 7)), 8); vignette(g, 0.25 + 0.25 * k + 0.15 * b); }
function sparkles(g: Ctx, x: number, y: number, t: number) {
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + t * 1.5, r = 150 + Math.sin(t * 3 + i) * 30, k = (t * 1.7 + i * 0.3) % 1; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.6; const s = 14 + 18 * Math.sin(k * Math.PI);
    g.fillStyle = "#fff6b0"; g.beginPath(); g.moveTo(px, py - s); g.quadraticCurveTo(px, py, px + s, py); g.quadraticCurveTo(px, py, px, py + s); g.quadraticCurveTo(px, py, px - s, py); g.quadraticCurveTo(px, py, px, py - s); g.fill(); }
}
function counter(g: Ctx, label: string, value: string, y: number, col: string, k: number) {
  if (k <= 0) return; const s = easeOutBack(k);
  g.save(); g.translate(W / 2, y); g.scale(s, s);
  g.fillStyle = INK; g.beginPath(); g.roundRect(-400, -58, 800, 116, 28); g.fill(); g.fillStyle = "#262a34"; g.beginPath(); g.roundRect(-390, -48, 780, 96, 22); g.fill();
  g.restore();
  popText(g, label, W / 2 - 190, y, 52, k, "#ffffff"); popText(g, value, W / 2 + 170, y, 78, k, col);
}
function thought(g: Ctx, x: number, y: number, k: number, inside: (g: Ctx) => void) {
  if (k <= 0) return; const s = easeOutBack(k);
  for (const [dx, dy, r] of [[-250, 330, 22], [-210, 270, 34]] as [number, number, number][]) { g.fillStyle = INK; g.beginPath(); g.arc(x + dx, y + dy, r * s + 6, 0, 7); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x + dx, y + dy, r * s, 0, 7); g.fill(); }
  g.save(); g.translate(x, y); g.scale(s, s);
  const p = new Path2D(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; p.moveTo(Math.cos(a) * 300 + 70, Math.sin(a) * 200); p.arc(Math.cos(a) * 300, Math.sin(a) * 200, 70, 0, 7); }
  p.ellipse(0, 0, 310, 210, 0, 0, 7);
  g.fillStyle = INK; g.save(); g.scale(1.03, 1.04); g.fill(p); g.restore(); g.fillStyle = "#ffffff"; g.fill(p);
  g.save(); g.beginPath(); g.ellipse(0, 0, 300, 200, 0, 0, 7); g.clip(); inside(g); g.restore();
  g.restore();
}
function emuTank(g: Ctx, t: number, k: number) {
  // a cartoon tank whose turret is an emu: sketched inside the thought bubble (bubble-local px)
  g.save(); g.translate(-20 + Math.sin(t * 2) * 10, 40);
  g.lineJoin = "round"; g.lineWidth = 8; g.strokeStyle = INK;
  const tread = new Path2D(); tread.roundRect(-200, 20, 400, 80, 40); g.fillStyle = "#3e3e3e"; g.fill(tread); g.stroke(tread);
  for (let i = 0; i < 6; i++) { g.fillStyle = "#8a8a8a"; g.beginPath(); g.arc(-160 + i * 64, 60, 24, 0, 7); g.fill(); g.stroke(); }
  const hull = new Path2D(); hull.moveTo(-180, 20); hull.lineTo(-140, -50); hull.lineTo(150, -50); hull.lineTo(190, 20); hull.closePath(); g.fillStyle = "#6f7a42"; g.fill(hull); g.stroke(hull);
  // emu turret: feather body, neck as the gun barrel pointing forward
  const body = new Path2D(); body.ellipse(-10, -90, 110, 60, 0, 0, 7); g.fillStyle = "#6b5646"; g.fill(body); g.stroke(body);
  g.lineWidth = 34; g.strokeStyle = INK; g.beginPath(); g.moveTo(60, -110); g.quadraticCurveTo(140, -160, 210 + k * 20, -150); g.stroke();
  g.lineWidth = 24; g.strokeStyle = "#8a9bb5"; g.beginPath(); g.moveTo(60, -110); g.quadraticCurveTo(140, -160, 210 + k * 20, -150); g.stroke();
  g.lineWidth = 8; g.strokeStyle = INK; g.fillStyle = "#8a9bb5"; g.beginPath(); g.ellipse(230 + k * 20, -150, 34, 30, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(238 + k * 20, -158, 13, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(242 + k * 20, -158, 6, 0, 7); g.fill();
  g.fillStyle = "#3a3a40"; g.beginPath(); g.moveTo(258 + k * 20, -150); g.lineTo(290 + k * 20, -146); g.lineTo(258 + k * 20, -138); g.fill();
  g.restore();
}
function parliament(g: Ctx, c: Cam) {
  // a 1930s chamber: green benches, panelled walls, a clock, the speaker's chair
  g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#5a3a26"); gr.addColorStop(0.55, "#7a5034"); gr.addColorStop(1, "#4a2e1e"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 7; i++) { g.fillStyle = "#6a4430"; g.fillRect(40 + i * 150, 150, 120, 520); g.strokeStyle = "#3a2216"; g.lineWidth = 6; g.strokeRect(40 + i * 150, 150, 120, 520); }
  g.fillStyle = INK; g.beginPath(); g.arc(W / 2, 110, 74, 0, 7); g.fill(); g.fillStyle = "#f4ecd8"; g.beginPath(); g.arc(W / 2, 110, 64, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(W / 2, 110); g.lineTo(W / 2, 66); g.moveTo(W / 2, 110); g.lineTo(W / 2 + 32, 118); g.stroke();
  for (const y of [1040, 1250]) { g.fillStyle = INK; g.fillRect(-20, y - 8, W + 40, 196); g.fillStyle = y === 1040 ? "#3f6b4a" : "#4a7a55"; g.fillRect(-20, y, W + 40, 180); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(-20, y, W + 40, 26); }
  void c;
}
function desk(g: Ctx, t: number, u: number, no: number) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#8a5a36"); gr.addColorStop(1, "#5a3820"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(40,20,10,0.25)"; g.lineWidth = 4; for (let i = 0; i < 30; i++) { g.beginPath(); g.moveTo(0, i * 70 + Math.sin(i) * 10); g.bezierCurveTo(300, i * 70 + 20, 700, i * 70 - 20, W, i * 70 + 5); g.stroke(); }
  const years = ["1934", "1943", "1948"];
  const S0 = t - u;
  years.forEach((y, j) => {
    const tin = S0 + 0.15 + j * 0.62, a = since(t, tin, 0.28), st = since(t, tin + 0.32, 0.14);
    if (a <= 0) return;
    const x = W / 2 + (j - 1) * 30, yy = 300 + j * 290, rot = (j - 1) * 0.06;
    g.save(); g.translate(x, yy + (1 - easeOutBack(a)) * -300); g.rotate(rot);
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(-300, -150, 620, 330);
    g.fillStyle = INK; g.fillRect(-318, -168, 636, 336); g.fillStyle = "#f6edd6"; g.fillRect(-308, -158, 616, 316);
    g.fillStyle = "#6b5a46"; g.font = "800 42px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "left"; g.fillText("FARMERS' REQUEST", -270, -90);
    g.font = "800 64px SubFont, Montserrat, Arial Black, sans-serif"; g.fillStyle = "#3a2a1a"; g.fillText(y, -270, -10);
    g.fillStyle = "#b9a888"; for (let i = 0; i < 2; i++) g.fillRect(-270, 30 + i * 36, 420 - i * 80, 12);
    if (st > 0) { g.save(); g.translate(120, 40); g.rotate(-0.25); const sc = 1.6 - 0.6 * easeOutBack(st); g.scale(sc, sc); g.globalAlpha = Math.min(1, st * 2); g.strokeStyle = "#c8262a"; g.lineWidth = 12; g.strokeRect(-190, -60, 380, 120); g.fillStyle = "#c8262a"; g.font = "800 84px SubFont, Montserrat, Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("DENIED", 0, 6); g.restore(); }
    g.restore();
  });
  const k = since(t, no, 0.25);
  if (k > 0) { burst(g, W / 2, 1080, 260, easeOutBack(k), "#ffffff", 14); popText(g, "NO.", W / 2, 1080, 220, easeOutBack(k), "#c8262a", -0.06, "#16121c"); }
}
function mapScene(g: Ctx, t: number, u: number, D: number) {
  // stylised map of Australia: wheat belt in Western Australia; emus stream in from the interior
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#4aa3d8"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 3; for (let i = 0; i < 14; i++) { g.beginPath(); for (let x = 0; x <= W; x += 20) { const y = i * 150 + Math.sin(x * 0.02 + t * 1.5 + i) * 10; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  const z = lerp(1.05, 2.0, smooth(clamp01((u - 0.6) / 1.6)));
  const cx = lerp(580, 330, smooth(clamp01((u - 0.6) / 1.6))), cy = lerp(900, 1050, smooth(clamp01((u - 0.6) / 1.6)));
  g.save(); g.translate(W / 2, 860); g.scale(z, z); g.translate(-cx, -cy);
  // coarse outline of the mainland (hand-placed points, cartoon simplified)
  const A: [number, number][] = [[175, 1000], [215, 900], [290, 840], [360, 780], [420, 700], [470, 690], [520, 640], [560, 600], [610, 640], [640, 600], [690, 580], [720, 640], [760, 700], [800, 560], [840, 520], [870, 640], [920, 720], [960, 800], [985, 880], [970, 980], [930, 1070], [890, 1150], [840, 1220], [780, 1250], [720, 1225], [690, 1170], [650, 1130], [600, 1110], [560, 1130], [520, 1120], [460, 1140], [400, 1160], [330, 1200], [270, 1210], [220, 1180], [200, 1110]];
  const land = new Path2D(); A.forEach(([x, y], i) => (i ? land.lineTo(x, y) : land.moveTo(x, y))); land.closePath();
  g.lineJoin = "round"; g.strokeStyle = INK; g.lineWidth = 14; g.stroke(land); g.fillStyle = "#e6b26a"; g.fill(land);
  g.save(); g.clip(land);
  g.fillStyle = "#d39a55"; g.fillRect(0, 0, 450, 2000);                 // Western Australia
  g.strokeStyle = INK; g.lineWidth = 6; g.setLineDash([18, 14]); g.beginPath(); g.moveTo(450, 600); g.lineTo(450, 1300); g.stroke(); g.setLineDash([]);
  // the wheat belt
  g.fillStyle = "#f2cf5b"; g.beginPath(); g.ellipse(270, 1090, 95, 60, -0.5, 0, 7); g.fill(); g.strokeStyle = "#b9862d"; g.lineWidth = 5; g.stroke();
  g.restore();
  // Campion marker
  const pin = smooth(clamp01((u - 1.2) / 0.3));
  if (pin > 0) { g.fillStyle = "#c8262a"; g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.arc(300, 1060 - 40 * pin, 18, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(300, 1078 - 40 * pin); g.lineTo(300, 1060); g.stroke(); }
  // emus streaming in from the east
  const n = Math.floor(clamp01((u - 0.3) / (D - 0.8)) * 60);
  for (let i = 0; i < n; i++) { const r = rng(2000 + i); const p = clamp01((u - 0.3 - i * 0.03) / 1.6); const x = lerp(560 + r() * 200, 240 + r() * 90, smooth(p)), y = lerp(900 + r() * 200, 1050 + r() * 70, smooth(p)); miniEmu(g, x, y, t + i, 0.7); }
  g.restore();
  popText(g, "WESTERN AUSTRALIA", W / 2, 330, 76, since(u, 0.1, 0.3), "#ffffff", -0.03);
  popText(g, "~20,000 EMUS", W / 2, 450, 104, since(u, 1.0, 0.3), "#3df0ff", 0.03);
}
function miniEmu(g: Ctx, x: number, y: number, t: number, s: number) {
  g.save(); g.translate(x, y); g.scale(-s, s); const b = Math.abs(Math.sin(t * 9)) * 3;
  g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(-4, 6 - b); g.lineTo(-8 + Math.sin(t * 9) * 5, 26); g.moveTo(4, 6 - b); g.lineTo(6 - Math.sin(t * 9) * 5, 26); g.stroke();
  g.fillStyle = "#6b5646"; g.beginPath(); g.ellipse(0, -2 - b, 16, 11, 0, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(10, -6 - b); g.quadraticCurveTo(14, -20 - b, 16, -28 - b); g.stroke(); g.strokeStyle = "#8a9bb5"; g.lineWidth = 4; g.stroke();
  g.fillStyle = "#8a9bb5"; g.beginPath(); g.arc(17, -30 - b, 5, 0, 7); g.fill();
  g.restore();
}

// ---------------- the composition ----------------
const Layer: React.FC<{ t: number; which: "back" | "front"; S: Shot }> = ({ t, which, S }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    camTransform(g, S.cam, t);
    const tz = S.truck?.visible ? S.truck.z : -1e9;
    if (which === "back") { g.save(); S.bg(g); g.restore(); }
    const list = S.items.filter((it) => (which === "back" ? it.z > tz : it.z <= tz)).sort((a, b) => b.z - a.z);
    for (const it of list) { g.save(); it.draw(g); g.restore(); }
    if (which === "front" && S.fg) { g.save(); camTransform(g, { ...S.cam, shake: 0, roll: 0 }, t); g.setTransform(1, 0, 0, 1, 0, 0); S.fg(g); g.restore(); }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};

const flashAt = (t: number) => { for (const s of SHOTS) { const d = t - s.a; if (s.i > 0 && d >= 0 && d < 0.12) return 1 - d / 0.12; } return 0; };

type Post = { subs: boolean; audio: boolean; truck: boolean };
export const EmuWar: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const on: Post = { subs: true, audio: true, truck: true, ...((getInputProps() as { post?: Partial<Post> }).post ?? {}) };
  const S = shot(t);
  const fl = flashAt(t);
  return (
    <AbsoluteFill style={{ background: "#f3d9a8" }}>
      <Layer t={t} which="back" S={S} />
      {S.truck?.visible && on.truck ? (
        <ThreeCanvas width={W} height={H} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }} camera={{ fov: 30, near: 0.2, far: 3000 }}>
          <TruckLayer cam={S.cam} truck={S.truck} />
        </ThreeCanvas>
      ) : null}
      <Layer t={t} which="front" S={S} />
      {fl > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: fl * 0.55 }} />}
      {on.subs && <Subtitles words={WORDS} style={emuSubStyle} />}
      {withAudio && on.audio && <Audio src={staticFile("emu/mix.wav")} />}
    </AbsoluteFill>
  );
};
void hexA; void outline;
