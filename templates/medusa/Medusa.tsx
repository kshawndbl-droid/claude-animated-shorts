// "Medusa": the Greek myth (Ovid, Metamorphoses 4; Apollodorus 2.4) in the living-engraving look, with its own
// identity: lamp-lit marble, deep Aegean teal, aged bronze, and snake green as the one colour of danger.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import { drawBust, Bust, BustAnim } from "../docu/portrait";
import { human, settleH, drawHuman, HLook, HPose, setLine } from "../docu/human";
import { litLayer, paperGrain } from "../docu/look";
import { hatchBox, INK, rng, sea, fog } from "../docu/sea";
import { GR, column, ridge, shield, harpe, wingedSandal, kibisis, pegasus } from "./kit";
import lines from "../../stories/medusa/lines.json";
import words from "../../stories/medusa/words.json";

type Ctx = CanvasRenderingContext2D;
const W = 1080, H = 1920, FPS = 30;
const LINES = lines as { start: number; end: number; text: string }[];
const WORDS = words as Word[];
export const MED_TOTAL = Math.ceil((LINES[LINES.length - 1].end + 1.9) * FPS);
const KEY = ["medusa", "hair", "poseidon", "athena", "snakes", "stone", "perseus", "head", "lowkey", "hermes", "shield", "sandals", "invisible", "reflection", "pegasus", "king", "court", "survivor", "monster", "villain", "victim", "forever", "one", "swing", "sea", "god", "goddess"];
const subStyle = defaultStyle("mystery", { keyWords: KEY });

const LEAD = 0.25;
const SHOTS = LINES.map((l, i) => ({ i, a: i === 0 ? 0 : l.start - LEAD, b: i === LINES.length - 1 ? MED_TOTAL / FPS : LINES[i + 1].start - LEAD }));
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
function wt(li: number, word: string, n = 0) { const ws = WORDS.filter((w) => w.line === li && norm(w.w) === norm(word)); return ws[n]?.s ?? LINES[li].start; }
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const since = (t: number, t0: number, d = 0.4) => smooth((t - t0) / d);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rel = (li: number, word: string, n = 0) => wt(li, word, n) - SHOTS[li].a;

// ---------------------------------------------------------------- cast (each a different person)
const MEDUSA: Bust = { skin: "#eac3a2", hair: "#2a1a14", coat: GR.teal, hairStyle: "long", female: true, collar: "chiton", shirt: "#d8cfb8", age: 0.1, jaw: -0.7, nose: 0.2 };
const GORGON: Bust = { ...MEDUSA, hairStyle: "snakes", skin: "#d9c6a6" };
const ATHENA: Bust = { skin: "#e4bc98", hair: "#4a3020", coat: "#c9b98e", hairStyle: "long", female: true, collar: "chiton", shirt: "#e9e2cf", age: 0.3, jaw: 0.3, nose: 0.8, brow: 0.5, hat: "corinthian" };
const PERSEUS: Bust = { skin: "#d6a57e", hair: "#1d1410", coat: "#6a2a20", hairStyle: "curls", shirt: "#d8c9a8", age: 0.05, jaw: 0.2, nose: 0.4, collar: "chiton" };
const KING: Bust = { skin: "#d8a888", hair: "#3a3a3a", coat: "#4a2a5a", hairStyle: "side", beard: "full", moustache: "full", age: 0.75, jaw: 0.6, nose: 1, brow: 0.8, hat: "crown", collar: "chiton", shirt: "#c9b98e" };
const LORD1: Bust = { skin: "#c99572", hair: "#20160f", coat: "#2a4a3a", hairStyle: "cropped", beard: "full", age: 0.4, jaw: 1, nose: -0.4, brow: -0.3, collar: "chiton", shirt: "#d0c6ae" };
const LORD2: Bust = { skin: "#e2b996", hair: "#6a4a2a", coat: "#7a5a2a", hairStyle: "swept", moustache: "walrus", age: 0.55, jaw: -0.6, nose: 0.6, collar: "chiton", shirt: "#e0d6be" };
const STONE: HLook = { skin: "#8e8a82", hair: "#7a766e", hairStyle: "short", beard: "short", coat: "#848078", coatLen: "hip", pants: "#7c786f", boots: "#6e6a62", hat: "none" };

// ---------------------------------------------------------------- helpers
function bust(g: Ctx, B: Bust, A: BustAnim, t: number, x: number, y: number, s: number, flip = false, key = -1, id = "b", rim = `rgba(${GR.lamp},0.85)`, cool = "#8a7f88") {
  // every character is alive: a breathing bob, a slow sway, small head tilts and glances
  let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997; const ph = h * 0.37;
  y += Math.sin(t * 1.7 + ph) * s * 0.012; x += Math.sin(t * 0.8 + ph) * s * 0.025;
  A = { ...A, tilt: (A.tilt ?? 0) + Math.sin(t * 0.9 + ph) * 0.035, lookX: (A.lookX ?? 0) + (Math.floor(t * 0.8 + ph) % 3 - 1) * 0.12, turn: (A.turn ?? 0) + Math.sin(t * 0.6 + ph) * 0.4 };
  litLayer(g, W, H, (f) => { f.save(); f.translate(x, y); f.scale(flip ? -s : s, s); drawBust(f, B, A, t, s); f.restore(); },
    { box: [x - s * 1.2, y - s * 0.8, x + s * 1.2, Math.max(y + s * 2.7, H + 10)], key: flip ? -key : key, contour: 2, hatchAmt: 0, shadowAmt: 1.2, rim, cool }, id);
}
function figure(g: Ctx, L: HLook, pose: HPose, t: number, x: number, y: number, k: number, dir = 1, id = "s", seed = 1, rim = "rgba(200,210,200,0.5)") {
  const p = human(L, seed); const st = settleH(p, () => pose, t, 0);
  setLine("rgba(30,30,30,0.8)");
  litLayer(g, W, H, (f) => { f.save(); f.translate(x, y); f.scale(k, -k); drawHuman(f, p, st, 0, "34", dir, -1, 1.2 / k); f.restore(); },
    { box: [x - k * 1.4, y - k * 2.2, x + k * 1.4, y + k * 0.6], key: -dir, contour: 1.5, hatchAmt: 0, rim, cool: "#555" }, id);
}
function vignette(g: Ctx, a = 0.6) { const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.5, H * 0.72); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(3,8,10,${a})`); g.fillStyle = v; g.fillRect(0, 0, W, H); }
function glow(g: Ctx, x: number, y: number, r: number, a: number, col = GR.lamp) { if (a <= 0) return; const lg = g.createRadialGradient(x, y, 0, x, y, r); lg.addColorStop(0, `rgba(${col},${0.5 * a})`); lg.addColorStop(1, `rgba(${col},0)`); g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = lg; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
function zoom(g: Ctx, z: number, cx = W / 2, cy = H / 2, dx = 0, dy = 0) { g.translate(cx + dx, cy + dy); g.scale(z, z); g.translate(-cx, -cy); }
function grad(g: Ctx, top: string, low: string) { const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, top); sk.addColorStop(1, low); g.fillStyle = sk; g.fillRect(0, 0, W, H); }
function title(g: Ctx, text: string, x: number, y: number, size: number, a: number, col = "#efe4c8") {
  if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `600 ${size}px "Bitstream Charter", "Caladea", serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.letterSpacing = `${size * 0.22}px`;
  g.lineWidth = size * 0.12; g.strokeStyle = "rgba(10,8,8,0.85)"; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y); g.restore();
}
/** the eyes of the gorgon flaring: two green-gold points of light at the bust's eye positions */
function eyeFlare(g: Ctx, x: number, y: number, s: number, a: number, flip = false) {
  if (a <= 0) return; const d = flip ? -1 : 1;
  for (const [ex, k] of [[0.1, 1], [0.29, 0.7]]) { glow(g, x + d * ex * s, y + 0.6 * s, s * 0.35 * k, a, GR.venom); glow(g, x + d * ex * s, y + 0.6 * s, s * 0.08 * k, a * 2, "255,255,220"); }
}
/** stone creeping over whatever draw() paints: grey copy revealed from the bottom up to level (0..1) */
function petrify(g: Ctx, level: number, y0: number, y1: number, draw: () => void) {
  if (level <= 0) return; const y = lerp(y1, y0, level);
  g.save(); g.beginPath(); g.rect(0, y, W, H); g.clip(); g.filter = "grayscale(1) sepia(0.18) brightness(0.92) contrast(1.15)"; draw(); g.filter = "none";
  // cracks in the fresh stone
  const r = rng(7); g.strokeStyle = "rgba(30,28,26,0.55)"; g.lineWidth = 2; for (let k = 0; k < 14; k++) { let x = r() * W, yy = y + r() * (H - y); g.beginPath(); g.moveTo(x, yy); for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 60; yy += 20 + r() * 40; g.lineTo(x, yy); } g.stroke(); }
  g.restore();
  g.save(); const eg = g.createLinearGradient(0, y - 30, 0, y + 30); eg.addColorStop(0, "rgba(230,230,220,0)"); eg.addColorStop(0.5, "rgba(230,230,220,0.35)"); eg.addColorStop(1, "rgba(230,230,220,0)"); g.fillStyle = eg; g.fillRect(0, y - 30, W, 60); g.restore();
}
function templeBack(g: Ctx, t: number, light = 1, z = 1) {
  grad(g, "#0c1a1c", "#24312c");
  for (let k = 0; k < 5; k++) { const d = 1 - k * 0.16, x0 = W / 2 + (k % 2 ? 1 : -1) * (160 + k * 80) * d * z; void x0; }
  // colonnade receding on both sides
  for (let k = 5; k >= 0; k--) { const d = 0.35 + k * 0.13, w = 150 * d; const yb = 1150 + d * 600; const yt = yb - 1150 * d;
    for (const sd of [-1, 1]) column(g, W / 2 + sd * (130 + 520 * d * d), yt, yb, w, 1, GR.marble); }
  glow(g, W / 2, 700, 700, 0.6 * light);
  g.fillStyle = "#2a2a24"; g.fillRect(0, 1720, W, 200); hatchBox(g, 0, 1720, W, H, 10, 0.05, 1.4, "rgba(0,0,0,0.35)");
}

// ---------------------------------------------------------------- shots
type Draw = (g: Ctx, t: number, u: number) => void;

// 0. before the monster: a young woman by the sea, famous for her hair
const shBeauty: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.04 + u * 0.02, W / 2, 800);
  grad(g, "#e9b77a", "#7a8f8c"); glow(g, 820, 520, 700, 1);
  sea(g, W, H, 1150, t, { top: "#3e6a68", low: "#1c3a3e", swell: 0.8, glint: 0.8 });
  column(g, 110, 260, 1320, 150, 1); column(g, 980, 300, 1320, 130, 1);
  const hk0 = since(u, rel(0, "hair") - 0.3, 0.6);
  bust(g, MEDUSA, { lookX: lerp(0.4, -0.3, hk0), lookY: -0.1, tilt: -0.06 * hk0, breathe: Math.sin(t * 1.4) }, t, 500 - 160 * (1 - smooth(u / 0.9)), 560, 400, false, -1, "m0", `rgba(${GR.lamp},0.95)`);
  const hk = since(u, rel(0, "hair") - 0.1, 0.8); glow(g, 280, 760, 380, hk * 0.9);
  g.restore(); vignette(g, 0.45);
};

// 1. the temple of Athena; the sea god's shadow falls across the columns (nothing more is shown)
const shTemple: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.02 + u * 0.03, W / 2, 900);
  templeBack(g, t, 0.8);
  // Athena's great statue at the back
  g.save(); g.globalAlpha = 0.85; g.filter = "grayscale(1) brightness(1.15)"; bust(g, ATHENA, { lookX: 0.2 }, t, 560, 330, 200, true, 1, "at1", "rgba(240,240,230,0.6)"); g.filter = "none"; g.restore();
  const rc = since(u, rel(1, "attacked") - 0.15, 0.35);
  bust(g, MEDUSA, { lookX: lerp(0.3, -0.8, rc), lookY: 0.2, sad: rc, brow: 0.3, tilt: 0.12 * rc }, t, 330 - 70 * rc, 980 + 20 * rc, 300, false, -1, "m1");
  // a vast trident-shaped shadow sweeping in from the right, cold sea light behind it
  const sw = since(u, rel(1, "poseidon") - 0.3, 1.6);
  g.save(); g.globalAlpha = 0.85 * sw; g.translate(lerp(1500, 860, sw), 200); g.rotate(-0.18); g.fillStyle = "#050a0c";
  g.fillRect(-30, 0, 60, 1900); g.fillRect(-170, 0, 340, 50); for (const x of [-170, 0, 170]) { g.beginPath(); g.moveTo(x - 30, 0); g.lineTo(x, -170); g.lineTo(x + 30, 0); g.fill(); }
  g.restore();
  g.fillStyle = `rgba(20,60,70,${0.35 * sw})`; g.fillRect(0, 0, W, H);
  g.restore(); vignette(g, 0.75);
};

// 2. Athena's judgement
const shAthena: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.05 + u * 0.03, W / 2, 700);
  grad(g, "#3a1c12", "#120a08"); glow(g, 540, 600, 800, 0.8, "230,150,80");
  const turn = since(u, rel(2, "punished", 1) - 0.2, 0.5);
  bust(g, ATHENA, { lookX: lerp(0.3, -0.2, turn), brow: lerp(0.2, 0.9, turn), sad: 0, tilt: -0.07 * turn }, t, 470 + 40 * turn, 520 - 60 * turn, 430, false, -1, "a2", "rgba(255,190,110,0.95)");
  glow(g, 470 + 0.1 * 430, 520 + 0.6 * 430, 220, turn * 0.7, "255,220,150");
  g.restore(); vignette(g, 0.6);
};

// 3. the curse: the hair becomes snakes, the gaze turns flesh to stone
const shCurse: Draw = (g, t, u) => {
  const sn = rel(3, "snakes"), stn = rel(3, "stone");
  g.save(); zoom(g, 1.08 + u * 0.03, W / 2, 800);
  grad(g, "#0c1c1a", "#1f2e24");
  const k = since(u, sn - 0.35, 0.6);
  glow(g, 540, 700, 800, 0.4 + k * 0.4, GR.venom);
  if (k < 1) { g.save(); g.globalAlpha = 1 - k; bust(g, MEDUSA, { lookX: 0.2, sad: 0.6 }, t, 470, 470, 440, false, -1, "c3a"); g.restore(); }
  if (k > 0) { const jolt = Math.exp(-Math.max(0, u - sn) * 5) * (u > sn ? 1 : 0); g.save(); g.globalAlpha = k; bust(g, { ...GORGON, snakeLive: 0.3 + k * 1.4 }, { lookX: 0.2, brow: 0.6, tilt: 0.16 * jolt, sad: 0.4 }, t, 470 - 40 * jolt, 470 - 30 * jolt, 440, false, -1, "c3b", `rgba(${GR.venom},0.8)`); g.restore(); }
  eyeFlare(g, 470, 470, 440, since(u, stn - 0.5, 0.3) * (1 - since(u, stn + 1.2, 0.6) * 0.6));
  g.restore();
  g.fillStyle = `rgba(200,220,200,${since(u, stn - 0.15, 0.08) * (1 - since(u, stn, 0.5)) * 0.6})`; g.fillRect(0, 0, W, H);
  vignette(g, 0.7);
};

// 4. the edge of the world: a field of men turned to stone, her cave beyond
const shEdge: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.06, W / 2, 1000, -u * 18);
  grad(g, "#4f5a58", "#a9a99a");
  ridge(g, W, H, 820, 160, 11, "#5d605a"); fog(g, W, H, t, 0.8, 600, 1100);
  ridge(g, W, H, 1050, 120, 4, "#44463f");
  // the cave mouth
  g.fillStyle = "#0a0c0c"; g.beginPath(); g.ellipse(820, 1080, 170, 120, 0, Math.PI, 0); g.lineTo(990, 1110); g.lineTo(650, 1110); g.fill(); glow(g, 820, 1040, 160, 0.4 + Math.sin(t * 2) * 0.1, GR.venom);
  const poses: [number, number, number, HPose][] = [
    [180, 1500, 300, { shR: 2.0, elR: 0.5, shL: 1.2, elL: 1.4, hipL: 0.4, knL: 0.6, lean: -0.15 }],
    [470, 1360, 230, { shR: 1.6, elR: 1.8, shL: 0.3, elL: 0.2, hipR: 0.5, knR: 0.4, lean: 0.05 }],
    [700, 1620, 360, { shR: 2.6, elR: 0.2, shL: 0.6, elL: 1.0, hipL: 0.6, knL: 0.9, lean: 0.25 }],
    [930, 1350, 210, { shR: 0.4, elR: 0.3, shL: 1.9, elL: 1.6, lean: -0.3, hipR: 0.3, knR: 0.6 }],
  ];
  poses.forEach(([x, y, s, p], i) => figure(g, { ...STONE, beard: i % 2 ? "none" : "short", hairStyle: i === 2 ? "curly" : "short" }, p, t, x, y, s, i % 2 ? -1 : 1, "st" + i, 3 + i));
  fog(g, W, H, t * 0.6, 0.6, 1300, H);
  g.restore(); vignette(g, 0.6);
};

// 5. the king sends Perseus
const shKing: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.03 + u * 0.02, W / 2, 900);
  grad(g, "#2a1a12", "#110b08"); column(g, 90, 140, 1900, 130, 1); column(g, 990, 140, 1900, 130, 1); glow(g, 300, 500, 600, 0.8);
  bust(g, KING, { lookX: 0.3, brow: 0.5, mouth: Math.max(0, Math.sin(t * 9)) * 0.4 * (1 - since(u, rel(5, "head") + 0.3, 0.3)) }, t, 300, 380, 340, false, -1, "k5");
  bust(g, PERSEUS, { lookX: 0.1, brow: lerp(-0.2, 0.5, since(u, rel(5, "lowkey") - 0.2, 0.4)) }, t, lerp(1000, 760, smooth(u / 1.0)), 980, 360, true, 1, "p5");
  const ds = since(u, rel(5, "lowkey") - 0.1, 0.5); g.fillStyle = `rgba(90,10,8,${ds * 0.3})`; g.fillRect(0, 0, W, H);
  g.restore(); vignette(g, 0.6);
};

// 6. gifts of the gods: the harpe, the bronze shield
const shGifts: Draw = (g, t, u) => {
  grad(g, "#0f2226", "#22382f");
  const hk = since(u, rel(6, "hermes") - 0.6, 0.8), sk = since(u, rel(6, "athena") - 0.6, 0.8);
  // light breaking down from above: the gods take his side
  g.save(); g.globalCompositeOperation = "screen"; const rays = since(u, 0.1, 1.2);
  for (let k = 0; k < 9; k++) { const x0 = 540 + (k - 4) * 60, x1 = 540 + (k - 4) * 260 + Math.sin(t * 0.5 + k) * 30; const rg = g.createLinearGradient(0, 0, 0, H); rg.addColorStop(0, `rgba(255,226,170,${0.22 * rays})`); rg.addColorStop(1, "rgba(255,226,170,0)");
    g.fillStyle = rg; g.beginPath(); g.moveTo(x0 - 12, -10); g.lineTo(x0 + 12, -10); g.lineTo(x1 + 70, H); g.lineTo(x1 - 70, H); g.fill(); }
  g.restore();
  bust(g, PERSEUS, { lookX: 0.4, lookY: -0.8, brow: -0.2 }, t, 560, 1230, 300, false, -1, "p6", "rgba(255,226,170,0.9)");
  glow(g, 330, 700, 600, 0.3 + hk * 0.7, "220,230,255"); glow(g, 760, 1150, 600, sk, "255,200,120");
  g.save(); g.translate(300, lerp(400, 1000, hk) + Math.sin(t * 1.3) * 10); g.rotate(-0.25 + Math.sin(t * 0.8) * 0.04); g.globalAlpha = hk; harpe(g, 700, 0.4 + 0.4 * Math.sin(t * 3)); g.restore();
  g.save(); g.translate(780, 900 + Math.sin(t * 1.1) * 8); g.scale(lerp(0.6, 1, sk), lerp(0.6, 1, sk)); g.globalAlpha = sk; shield(g, 230, t, 1); g.restore();
  vignette(g, 0.6);
};

// 7. winged sandals, the bag, the helmet of invisibility: Perseus fades from sight
const shSandals: Draw = (g, t, u) => {
  grad(g, "#13262a", "#2a3a32");
  const t1 = rel(7, "sandals") - 0.4, t2 = rel(7, "bag") - 0.4, t3 = rel(7, "helmet") - 0.4, inv = since(u, rel(7, "invisible") - 0.1, 1.0);
  const a1 = since(u, t1, 0.5), a2 = since(u, t2, 0.5);
  glow(g, 540, 900, 700, 0.6);
  const lift = since(u, t1 + 0.3, 1.4);   // the winged sandals lift him off the ground
  bust(g, { ...PERSEUS, hat: since(u, t3, 0.3) > 0.5 ? "winged" : "none", hatCol: "#3a3630" }, { lookX: lerp(0.2, -0.3, lift), lookY: lerp(-0.2, 0.4, lift), brow: -0.2 }, t, 560, 380 - 160 * lift + Math.sin(t * 2.2) * 14 * lift, 360, false, -1, "p7");
  // shimmering out of sight
  if (inv > 0) { g.save(); g.globalCompositeOperation = "source-atop"; g.restore(); g.fillStyle = `rgba(19,38,42,${inv * 0.92})`; g.fillRect(0, 0, W, 1380); for (let k = 0; k < 40; k++) { const r = rng(k + 1); const x = 200 + r() * 700, y = 300 + r() * 1000; glow(g, x, y + Math.sin(t * 3 + k) * 20, 30, inv * (1 - inv) * 3, "220,240,255"); } }
  g.save(); g.translate(300, 1640 + Math.sin(t * 2) * 12); g.globalAlpha = a1; wingedSandal(g, 300, t); g.restore();
  g.save(); g.translate(790, 1600 + Math.sin(t * 1.6 + 1) * 10); g.globalAlpha = a2; kibisis(g, 260); g.restore();
  vignette(g, 0.6);
};

// 8. the cave: she sleeps; he looks only at her reflection in the shield
const shReflect: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.02 + u * 0.03, W / 2, 1000);
  grad(g, "#050807", "#121a16"); glow(g, 560, 1000, 700, 0.5, GR.venom);
  bust(g, PERSEUS, { lookX: 0.6, lookY: 0.2, brow: 0.4 }, t, lerp(80, 300, smooth(u / 1.6)), 260, 300, true, 1, "p8", "rgba(190,230,140,0.7)");
  g.save(); g.translate(560, 1180); const face = shield(g, 380, t, 0.6);
  // the reflection: the sleeping gorgon, faint and bronze-tinted inside the polished face
  g.save(); g.clip(face); g.globalAlpha = 0.85; g.filter = "sepia(0.7) brightness(0.85)"; g.translate(-560, -1180);
  bust(g, { ...GORGON, snakeLive: 0.25 }, { blink: 1, lookY: 0.4 }, t, 560, 950, 330, true, 1, "g8", "rgba(220,200,140,0.6)"); g.filter = "none"; g.restore();
  g.restore();
  g.restore(); vignette(g, 0.75);
};

// 9. one swing, and Pegasus bursts out in a blaze of light
const shStrike: Draw = (g, t, u) => {
  const sw = rel(9, "swing"), pg = rel(9, "pegasus");
  grad(g, "#030505", "#0a100e"); glow(g, 540, 1000, 700, 0.35, GR.venom);
  // Perseus as a backlit silhouette: wind-up, then the swing
  const wind = since(u, 0, sw * 0.9), hit = since(u, sw - 0.05, 0.18), out = since(u, sw + 0.9, 0.4);
  if (out < 1) { g.save(); g.globalAlpha = 1 - out;
    figure(g, { ...STONE, skin: "#050606", hair: "#050606", coat: "#060707", pants: "#050606", boots: "#030303", hairStyle: "curly", beard: "none" },
      { shR: lerp(lerp(0.3, 2.9, wind), 0.9, hit), elR: lerp(0.4, 0.1, hit), shL: lerp(0.2, 1.4, wind), elL: 0.8, hipL: lerp(0.1, 0.7, hit), knL: lerp(0.2, 0.9, hit), hipR: lerp(0, -0.4, hit), knR: 0.3, lean: lerp(-0.15, 0.35, hit) },
      t, 470 + 60 * hit, 1480, 420, 1, "pz", 21, `rgba(${GR.venom},0.9)`); g.restore(); }
  // the blade's arc
  const a = since(u, sw - 0.05, 0.22); if (a > 0 && a < 1) { g.save(); g.strokeStyle = `rgba(240,250,255,${1 - a})`; g.lineWidth = 40 * (1 - a); g.shadowColor = "white"; g.shadowBlur = 40; g.beginPath(); g.arc(560, 900, 520, -2.6, lerp(-2.6, 0.5, a)); g.stroke(); g.restore(); }
  const fl = since(u, sw + 0.15, 0.1) * (1 - since(u, sw + 0.3, 0.7)); g.fillStyle = `rgba(250,250,240,${fl * 0.9})`; g.fillRect(0, 0, W, H);
  // Pegasus bursts up out of the light and climbs across the frame, wings beating hard
  const rise = since(u, pg - 0.7, 2.2);
  if (rise > 0) {
    const px = lerp(420, 700, rise), py = lerp(1600, 650, rise), sc = 300 * lerp(0.7, 1.05, rise);
    glow(g, px, py, 900, rise, "255,250,235"); glow(g, px, py, 380, rise, "255,255,255");
    g.save(); g.translate(px, py + Math.sin(t * 9) * 12); g.scale(sc, sc); g.rotate(-0.45 + Math.sin(t * 9) * 0.03); g.globalAlpha = clamp01(rise * 3); pegasus(g, t, t * 9, 1 / sc); g.restore();
    for (let i = 0; i < 24; i++) { const r = rng(i + 40); const fx = px + (r() - 0.5) * 700, fy = py + 200 + r() * 600 + (u - pg) * 120 * r(); g.save(); g.translate(fx, fy); g.rotate(r() * 6 + t); g.fillStyle = `rgba(250,248,240,${0.7 * rise})`; g.beginPath(); g.ellipse(0, 0, 18, 5, 0, 0, 7); g.fill(); g.restore(); }
  }
  vignette(g, 0.6);
};

// 10. the head held up before the king's court: they turn to stone
const shCourt: Draw = (g, t, u) => {
  const st = rel(10, "stone"), up = rel(10, "held") - 0.3;
  g.save(); zoom(g, 1.03 + u * 0.02, W / 2, 900);
  grad(g, "#2a1a12", "#120b08"); column(g, 80, 100, 1900, 120, 1); column(g, 1000, 100, 1900, 120, 1); glow(g, 540, 500, 700, 0.6);
  const lvl = since(u, st - 0.5, 1.4);
  const court = () => { bust(g, LORD1, { lookX: -0.4, brow: 0.6, mouth: lvl > 0.1 ? 0 : 0.5 }, t * (1 - lvl), 220, 640, 250, false, 1, "l1"); bust(g, LORD2, { lookX: 0.4, brow: 0.6, mouth: 0.4 }, t * (1 - lvl), 860, 660, 240, true, -1, "l2"); bust(g, KING, { lookX: 0, lookY: 0.2, brow: 0.9, mouth: 0.6 }, t * (1 - lvl), 540, 360, 330, false, -1, "k10"); };
  court(); petrify(g, lvl, 300, 1600, court);
  // from below frame: Perseus' arm lifts the open bag; the gorgon's light pours out of it (the head itself is never shown)
  const r = since(u, up, 0.7), hx = 560, hy = lerp(2150, 1480, r);
  if (r > 0) {
    const open = since(u, up + 0.6, 0.5);
    g.save(); g.globalCompositeOperation = "screen";
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.22 + Math.sin(t * 1.5 + k) * 0.03; const L = 1300 * open;
      const bg = g.createLinearGradient(hx, hy - 80, hx + Math.cos(a) * L, hy - 80 + Math.sin(a) * L); bg.addColorStop(0, `rgba(${GR.venom},${0.5 * open})`); bg.addColorStop(1, `rgba(${GR.venom},0)`);
      g.fillStyle = bg; g.beginPath(); g.moveTo(hx - 30, hy - 90); g.lineTo(hx + Math.cos(a - 0.07) * L, hy - 90 + Math.sin(a - 0.07) * L); g.lineTo(hx + Math.cos(a + 0.07) * L, hy - 90 + Math.sin(a + 0.07) * L); g.lineTo(hx + 30, hy - 90); g.fill(); }
    g.restore();
    glow(g, hx, hy - 100, 420, r * (0.5 + open * 0.6), GR.venom);
    const arm = new Path2D(); arm.moveTo(hx + 120, H + 60); arm.quadraticCurveTo(hx + 130, hy + 300, hx + 40, hy + 140); arm.lineTo(hx - 30, hy + 150); arm.quadraticCurveTo(hx + 40, hy + 320, hx + 10, H + 60); arm.closePath();
    g.fillStyle = "#3a2418"; g.fill(arm); g.strokeStyle = INK; g.lineWidth = 5; g.stroke(arm);
    g.save(); g.translate(hx, hy); kibisis(g, 300); g.restore();
  }
  g.restore(); vignette(g, 0.65);
};

// 11. Athena's shield, Medusa's face set in it forever
const shAegis: Draw = (g, t, u) => {
  grad(g, "#1a140c", "#0b0806"); glow(g, 540, 860, 800, 0.8);
  g.save(); g.translate(540, 900); const z = 1 + u * 0.04; g.scale(z, z); g.rotate(Math.sin(t * 0.4) * 0.02);
  const face = shield(g, 430, t, 0.8);
  g.save(); g.clip(face); g.filter = "sepia(1) saturate(1.3) brightness(0.9) contrast(1.2)"; g.translate(-540, -900);
  bust(g, { ...GORGON, snakeLive: 0.05 }, { lookX: -0.1 }, 0, 560, 640, 360, false, -1, "ag", "rgba(255,220,150,0.8)"); g.filter = "none"; g.restore();
  g.restore();
  vignette(g, 0.6);
};

// 12. not a monster: a survivor
const shSurvivor: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.04 + u * 0.02, W / 2, 800);
  grad(g, "#f1c98e", "#5f7c7a"); glow(g, 300, 600, 800, 1);
  sea(g, W, H, 1200, t, { top: "#5d8682", low: "#22444a", swell: 0.6, glint: 1 });
  bust(g, { ...GORGON, snakeLive: 0.25 }, { lookX: -0.1, lookY: -0.1, sad: 0.3, breathe: Math.sin(t * 1.2) }, t, 560, 520, 400, true, 1, "s12", `rgba(${GR.lamp},0.95)`);
  g.restore(); vignette(g, 0.4);
};

// 13. villain or victim: her eyes open; the title cut into marble
const shEnd: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.15 + u * 0.05, W / 2, 700);
  grad(g, "#0a1414", "#192620"); glow(g, 540, 700, 700, 0.5, GR.venom);
  bust(g, { ...GORGON, snakeLive: 0.6 }, { lookX: 0.6, brow: 0.2 }, t, 440, 360, 520, false, -1, "e13", `rgba(${GR.venom},0.6)`);
  eyeFlare(g, 440, 360, 520, since(u, rel(13, "victim") - 0.2, 0.6) * 0.7);
  g.restore();
  const tk = since(u, LINES[13].end - SHOTS[13].a + 0.1, 0.7);
  g.fillStyle = `rgba(4,8,8,${tk * 0.6})`; g.fillRect(0, 0, W, H); title(g, "MEDUSA", W / 2, 520, 120, tk);
  vignette(g, 0.7);
};

const DRAW: Draw[] = [shBeauty, shTemple, shAthena, shCurse, shEdge, shKing, shGifts, shSandals, shReflect, shStrike, shCourt, shAegis, shSurvivor, shEnd];

// ---------------------------------------------------------------- camera: snap-ins, keyword punches, impact shakes, whip cuts
// [line, word, punch amount, shake amount]: the camera reacts to the words that matter
const HITS: [number, string, number, number][] = [
  [0, "monster", 0.06, 0], [0, "hair", 0.08, 0], [1, "attacked", 0.1, 10], [2, "punished", 0.06, 0], [2, "medusa", 0.12, 8],
  [3, "snakes", 0.12, 14], [3, "stone", 0.1, 10], [4, "statues", 0.06, 0], [5, "head", 0.08, 0], [5, "lowkey", 0.06, 0],
  [6, "hermes", 0.06, 0], [6, "athena", 0.06, 4], [7, "invisible", 0.08, 0], [8, "reflection", 0.08, 0], [9, "swing", 0.16, 22],
  [9, "pegasus", 0.08, 8], [10, "king", 0.06, 0], [10, "stone", 0.14, 18], [11, "forever", 0.06, 0], [12, "survivor", 0.06, 0], [13, "victim", 0.1, 0],
];
const HIT_T = HITS.map(([l, w, z, sh]) => ({ l, t: wt(l, w), z, sh }));
function camera(k: number, t: number, u: number) {
  const snap = 1 - smooth(u / 0.5);
  let z = 1.035 + 0.12 * snap + 0.012 * u, sx = 0, sy = 0, rot = (k % 2 ? 1 : -1) * 0.012 * snap;
  for (const h of HIT_T) { if (h.l !== k) continue; const d = t - h.t + 0.05; if (d < 0 || d > 1.2) continue;
    const e = Math.exp(-d * 4.5); z += h.z * (d < 0.08 ? d / 0.08 : 1) * e;
    if (h.sh) { const a = h.sh * Math.exp(-d * 7); sx += Math.sin(d * 70) * a; sy += Math.cos(d * 53) * a * 0.7; } }
  sx += Math.sin(t * 0.7 + k) * 6; sy += Math.cos(t * 0.53 + k * 2) * 5;
  return { z, sx, sy, rot };
}
function drawShot(g: Ctx, k: number, t: number) {
  const S = SHOTS[k], u = t - S.a, c = camera(k, t, u);
  g.save(); g.translate(W / 2 + c.sx, H / 2 + c.sy); g.rotate(c.rot); g.scale(c.z, c.z); g.translate(-W / 2, -H / 2);
  DRAW[k](g, t, u); particles(g, k, t); g.restore();
}
/** drifting motes in each shot's light: dust in marble halls, spray by the sea, green spores near the gorgon */
function particles(g: Ctx, k: number, t: number) {
  const col = [3, 8, 13].includes(k) ? GR.venom : [0, 12].includes(k) ? "235,245,240" : GR.lamp;
  const r = rng(k * 13 + 5); g.save(); g.globalCompositeOperation = "screen";
  for (let i = 0; i < 46; i++) { const sp = 20 + r() * 60, x = (r() * W + Math.sin(t * 0.6 + i) * 40 + t * (r() - 0.5) * 30 + W * 2) % W, y = (r() * H - t * sp + H * 50) % H, s = 1.5 + r() * 4;
    g.fillStyle = `rgba(${col},${0.25 + 0.35 * Math.abs(Math.sin(t * 1.3 + i))})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  g.restore();
}
const XF = 0.24;
let _scr: { c: HTMLCanvasElement; g: Ctx }[] = [];
function scratch(n: number) { if (!_scr[n]) { const c = document.createElement("canvas"); c.width = W; c.height = H; _scr[n] = { c, g: c.getContext("2d")! }; } const s = _scr[n]; s.g.setTransform(1, 0, 0, 1, 0, 0); s.g.clearRect(0, 0, W, H); return s; }
function frame(g: Ctx, t: number) {
  const i = SHOTS.findIndex((s) => t >= s.a && t < s.b); const k = i < 0 ? SHOTS.length - 1 : i, S = SHOTS[k];
  const u = t - S.a;
  if (k > 0 && u < XF) {
    // whip cut: the old shot flies out, the new one flies in, with streaked motion blur
    const e = smooth(u / XF), dir = k % 2 ? 1 : -1;
    const A = scratch(0), B = scratch(1); drawShot(A.g, k - 1, t); drawShot(B.g, k, t);
    g.fillStyle = "#050808"; g.fillRect(0, 0, W, H);
    for (let j = 0; j < 4; j++) { const sm = j * 26 * Math.sin(Math.PI * e);
      g.globalAlpha = j === 0 ? 1 : 0.22; g.drawImage(A.c, -dir * W * e - dir * sm, 0); g.drawImage(B.c, dir * W * (1 - e) + dir * sm, 0); }
    g.globalAlpha = 1;
  } else drawShot(g, k, t);
  paperGrain(g, W, H, Math.floor(t * FPS), 0.7);
}
const Stage: React.FC<{ t: number }> = ({ t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); frame(g, t); });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
export const Medusa: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const on = { subs: true, audio: true, ...((getInputProps() as { post?: { subs?: boolean; audio?: boolean } }).post ?? {}) };
  return (
    <AbsoluteFill style={{ background: "#060a0a" }}>
      <Stage t={t} />
      {on.subs && <Subtitles words={WORDS} style={subStyle} />}
      {withAudio && on.audio && <Audio src={staticFile("medusa/mix.wav")} />}
    </AbsoluteFill>
  );
};
