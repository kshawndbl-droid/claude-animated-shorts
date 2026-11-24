// "Medusa" v3: the same myth retold as a chibi cartoon. Original round-headed characters (templates/chibi) are drawn and
// posed every frame (walk cycles, arm swings, blinks, expressions), in front of busy painted backgrounds (free open
// model, softly blurred) with animated crowds, particles and a punchy camera.
import React from "react";
import { AbsoluteFill, Audio, Img, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import { drawChibi, ChibiLook, ChibiPose } from "../chibi/chibi";
import lines from "../../stories/medusa/lines.json";
import words from "../../stories/medusa/words.json";

const W = 1080, H = 1920, FPS = 30, G = 1130; // G: the ground line, kept above the subtitles
const LINES = lines as { start: number; end: number; text: string }[];
const WORDS = words as Word[];
export const MED3_TOTAL = Math.ceil((LINES[LINES.length - 1].end + 1.9) * FPS);
const KEY = ["medusa", "hair", "poseidon", "athena", "snakes", "stone", "perseus", "head", "lowkey", "hermes", "shield", "sandals", "invisible", "reflection", "pegasus", "king", "court", "survivor", "monster", "villain", "victim", "forever", "swing"];
const subStyle = { ...defaultStyle("funny", { keyWords: KEY }), y: 0.77 };

const LEAD = 0.25;
const SHOTS = LINES.map((l, i) => ({ a: i === 0 ? 0 : l.start - LEAD, b: i === LINES.length - 1 ? MED3_TOTAL / FPS : LINES[i + 1].start - LEAD }));
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
function wt(li: number, word: string, n = 0) { const ws = WORDS.filter((w) => w.line === li && norm(w.w) === norm(word)); return ws[n]?.s ?? LINES[li].start; }
const rel = (li: number, word: string, n = 0) => wt(li, word, n) - SHOTS[li].a;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const since = (t: number, t0: number, d = 0.4) => smooth((t - t0) / d);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const pop = (t: number, t0: number, d = 0.45) => { const x = clamp01((t - t0) / d); return x <= 0 ? 0 : 1 + Math.sin(x * Math.PI * 1.5) * Math.exp(-x * 4) * 0.35 - (1 - x) * (1 - x) * (1 - x); };
const pulse = (u: number, t0: number, d = 0.25) => Math.max(0, 1 - Math.abs(u - t0) / d);
type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------- the cast (original designs)
const MED: ChibiLook = { skin: "#f6d2b4", hair: "#3a2416", hairStyle: "long", robe: "#f2ead8", trim: "#3f86c4", skirtLen: 1, female: true, eye: "#2a6a8a" };
const GOR: ChibiLook = { ...MED, skin: "#b9d4a0", hair: "#000000", hairStyle: "snakes", robe: "#4e3a5e", trim: "#c9a13e", glowEyes: "#a6ff5a" };
const ATH: ChibiLook = { skin: "#f0c8a8", hair: "#a8742a", hairStyle: "long", robe: "#ece8f4", armor: "#c99a3e", helmet: "crest", crestCol: "#2a5aa0", skirtLen: 0.9, female: true, eye: "#4a5a7a" };
const PER: ChibiLook = { skin: "#d9a57e", hair: "#2a1a12", hairStyle: "curly", robe: "#b03a2a", cloak: "#6a2a40", skirtLen: 0.2, eye: "#3a2a1a" };
const PER_DARK: ChibiLook = { ...PER, helmet: "crest", helmetCol: "#3a3a46", crestCol: "#1a1a22" };
const HER: ChibiLook = { skin: "#eec39c", hair: "#e0b040", hairStyle: "short", robe: "#3f8a5a", helmet: "winged", helmetCol: "#d6b04a", skirtLen: 0.25, eye: "#3a6a3a" };
const KING: ChibiLook = { skin: "#e8b894", hair: "#2a2220", hairStyle: "short", beard: "full", beardCol: "#2a2220", robe: "#6a2a7a", trim: "#d8b040", helmet: "crown", skirtLen: 1, eye: "#3a2a1a" };
const POS: ChibiLook = { skin: "#c8dfe0", hair: "#1e4a5a", hairStyle: "wild", beard: "long", beardCol: "#e8f2f2", robe: "#2a6a8a", trim: "#e8d8a0", helmet: "coral", skirtLen: 0.7, eye: "#1a3a4a" };
const SOLDIER = (i: number): ChibiLook => ({ skin: "#d8b090", hair: "#3a2a20", hairStyle: "short", robe: ["#8a3a2a", "#2a4a7a", "#5a5a2a"][i % 3], armor: "#9a7a3a", helmet: "crest", helmetCol: "#b08a3a", crestCol: ["#b02a2a", "#2a2a2a", "#d8d0b0"][i % 3], skirtLen: 0.2 });

// crowd extras: varied, seeded
const SK = ["#f3d0b0", "#e0b08a", "#c68e64", "#9a6a48", "#f6dcc4", "#b07a52"], HC = ["#2a1a12", "#5a3a1a", "#a87a3a", "#1a1a1a", "#7a7a7a", "#c04a2a"];
const RB = ["#d8553a", "#3f86c4", "#e8c050", "#6aa84f", "#a05ab0", "#e8e0d0", "#2a8a8a"], HS: ChibiLook["hairStyle"][] = ["short", "long", "curly", "bald", "wild"];
function extra(i: number): ChibiLook { const r = (k: number) => Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
  const f = r(1) > 0.5; return { skin: SK[Math.floor(r(2) * SK.length)], hair: HC[Math.floor(r(3) * HC.length)], hairStyle: f ? (r(4) > 0.5 ? "long" : "curly") : HS[Math.floor(r(5) * HS.length)], robe: RB[Math.floor(r(6) * RB.length)], trim: r(7) > 0.6 ? "#e8d070" : undefined, female: f, skirtLen: r(8), beard: !f && r(9) > 0.6 ? "full" : "none" }; }

/** draw a chibi at x (centre), y (feet) with height h px */
function ch(g: Ctx, L: ChibiLook, P: ChibiPose, x: number, y: number, h: number, t: number, flip = false, alpha = 1) {
  if (alpha <= 0) return; g.save(); g.globalAlpha = alpha; g.translate(x, y); if (flip) g.scale(-1, 1); g.scale(h, h); drawChibi(g, L, P, t, h); g.restore();
}
/** a row of cheering / chatting extras */
function crowd(g: Ctx, t: number, y: number, h: number, n: number, seed: number, mood: "cheer" | "chat" | "feast" | "gasp", stone = 0, x0 = -40, x1 = W + 40) {
  for (let i = 0; i < n; i++) { const L = extra(seed + i), ph = i * 1.7 + seed, x = lerp(x0, x1, (i + 0.5) / n) + Math.sin(i * 7.1) * 20;
    const cheer = mood === "cheer" ? Math.max(0, Math.sin(t * 5 + ph)) : 0, st = clamp01(stone * 1.6 - (i % 4) * 0.2);
    const tt = st >= 1 ? 0 : t;
    const P: ChibiPose = { hop: st ? 0 : cheer * 0.06, armR: mood === "cheer" ? [2.2 + Math.sin(tt * 8 + ph) * 0.4, 0.3] : mood === "feast" ? [1.2 + Math.sin(tt * 4 + ph) * 0.3, 1.2] : mood === "gasp" ? [2.5, 0.4] : [0.2 + Math.sin(tt * 2 + ph) * 0.2, 0.5],
      armL: mood === "gasp" ? [2.5, 0.4] : [0.2, 0.3], mouth: mood === "gasp" ? "o" : mood === "chat" || mood === "feast" ? "smile" : "grin", talk: mood === "chat" && !st ? 1 : 0,
      eyes: mood === "gasp" ? "wide" : mood === "cheer" && cheer > 0.6 ? "happy" : "open", headTilt: Math.sin(tt * 1.3 + ph) * 0.08, stone: st };
    ch(g, L, P, x, y + (i % 2) * h * 0.08, h * (1 - (i % 2) * 0.08), tt + ph, i % 3 === 0); }
}
function particles(g: Ctx, t: number, kind: "dust" | "spores" | "embers" | "spray" | "petals" | "sparkle", n = 60) {
  const col = kind === "spores" ? "170,255,120" : kind === "embers" ? "255,170,80" : kind === "spray" ? "235,250,255" : kind === "petals" ? "255,170,200" : kind === "sparkle" ? "255,250,200" : "255,235,200";
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.save(); g.globalCompositeOperation = "screen";
  for (let i = 0; i < n; i++) { const sp = (kind === "embers" ? 120 : kind === "petals" ? -60 : 40) + r() * 80, x = (r() * W + Math.sin(t * 0.8 + i) * 50 + W * 4) % W, y = (r() * H - t * sp + H * 60) % H, z = 2 + r() * 6;
    g.fillStyle = `rgba(${col},${0.3 + 0.4 * Math.abs(Math.sin(t * 2 + i))})`; g.beginPath();
    if (kind === "sparkle") { const k = z * 1.6 * Math.abs(Math.sin(t * 4 + i)); g.moveTo(x, y - k * 2); g.lineTo(x + k * 0.5, y); g.lineTo(x, y + k * 2); g.lineTo(x - k * 0.5, y); g.closePath(); } else g.arc(x, y, z, 0, 7);
    g.fill(); }
  g.restore();
}
function sparkles(g: Ctx, t: number, cx: number, cy: number, r: number, a: number) {
  if (a <= 0) return; g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 12; i++) { const an = i * 0.52 + t * 0.8, d = r * (0.6 + 0.4 * Math.sin(t * 3 + i)), x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d * 0.8, k = 14 * a * (0.5 + 0.5 * Math.sin(t * 6 + i * 2));
    g.fillStyle = "rgba(255,245,190,0.95)"; g.beginPath(); g.moveTo(x, y - k * 2); g.lineTo(x + k * 0.45, y); g.lineTo(x, y + k * 2); g.lineTo(x - k * 0.45, y); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - k * 2, y); g.lineTo(x, y + k * 0.45); g.lineTo(x + k * 2, y); g.lineTo(x, y - k * 0.45); g.closePath(); g.fill(); }
  g.restore();
}
function flash(g: Ctx, a: number, col = "255,255,255") { if (a > 0) { g.fillStyle = `rgba(${col},${Math.min(1, a)})`; g.fillRect(0, 0, W, H); } }
function glow(g: Ctx, x: number, y: number, r: number, col: string, a: number) { if (a <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
function shadowFloor(g: Ctx, a = 0.35) { const gr = g.createLinearGradient(0, G - 260, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.35, `rgba(10,6,12,${a})`); gr.addColorStop(1, `rgba(10,6,12,${a + 0.35})`); g.fillStyle = gr; g.fillRect(0, G - 260, W, H); }
function bubble(g: Ctx, x: number, y: number, txt: string, a: number, size = 70) { if (a <= 0) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(a, a); g.font = `900 ${size}px SubFont, Arial Black, sans-serif`; const w = g.measureText(txt).width + size;
  g.fillStyle = "#fffaf0"; g.strokeStyle = "#2a1a16"; g.lineWidth = 7; g.beginPath(); g.roundRect(-w / 2, -size * 0.85, w, size * 1.4, size * 0.6); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-20, size * 0.5); g.lineTo(-40, size * 1.1); g.lineTo(10, size * 0.55); g.fill(); g.stroke();
  g.fillStyle = "#2a1a16"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, -size * 0.12); g.restore(); }
function tear(g: Ctx, x: number, y: number, t: number, s: number) { const k = (t * 0.7) % 1; g.save(); g.fillStyle = "rgba(150,210,255,0.95)"; g.strokeStyle = "#2a1a16"; g.lineWidth = 4; g.beginPath(); g.ellipse(x, y + k * s * 0.5, s * 0.03, s * 0.045, 0, 0, 7); g.fill(); g.stroke(); g.restore(); }
function zzz(g: Ctx, x: number, y: number, t: number) { g.save(); g.font = "900 70px SubFont, Arial Black, sans-serif"; g.lineWidth = 8; g.strokeStyle = "#1a1030"; g.fillStyle = "#d8f0ff";
  for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; g.globalAlpha = Math.sin(k * Math.PI); const px = x + k * 90 + Math.sin(k * 6) * 15, py = y - k * 220, sz = 0.6 + k * 0.6; g.save(); g.translate(px, py); g.scale(sz, sz); g.strokeText("z", 0, 0); g.fillText("z", 0, 0); g.restore(); }
  g.restore(); }
function bird(g: Ctx, x: number, y: number, t: number, s: number, stone: number) { g.save(); g.translate(x, y); g.scale(s, s); const c = stone > 0 ? "#8a867e" : "#fbfbf6", fl = stone > 0 ? 0.2 : Math.sin(t * 14) * 0.7;
  g.fillStyle = c; g.strokeStyle = "#2a1a16"; g.lineWidth = 3 / s; g.beginPath(); g.ellipse(0, 0, 0.5, 0.28, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(0.45, -0.18, 0.2, 0, 7); g.fill(); g.stroke();
  g.fillStyle = stone > 0 ? "#6a665e" : "#f0a030"; g.beginPath(); g.moveTo(0.62, -0.2); g.lineTo(0.85, -0.12); g.lineTo(0.62, -0.08); g.fill();
  g.fillStyle = "#1a1010"; g.beginPath(); g.arc(0.5, -0.22, 0.05, 0, 7); g.fill();
  g.fillStyle = c; g.beginPath(); g.moveTo(-0.1, -0.1); g.quadraticCurveTo(-0.3, -0.9 * Math.cos(fl), -0.7, -0.7 * Math.cos(fl) - 0.1); g.quadraticCurveTo(-0.4, -0.2, -0.2, 0); g.fill(); g.stroke(); g.restore(); }
/** an original chibi Pegasus: round white horse, little wings */
function pegasus(g: Ctx, x: number, y: number, s: number, t: number) {
  g.save(); g.translate(x, y); g.scale(s, s); const lw = 3.4 / s, O = "#2a1a16", fl = Math.sin(t * 9);
  const P = (f: (p: Path2D) => void, col: string) => { const p = new Path2D(); f(p); g.fillStyle = col; g.fill(p); g.strokeStyle = O; g.lineWidth = lw; g.lineJoin = "round"; g.stroke(p); };
  const wing = (side: number) => { g.save(); g.translate(-0.04 + side * 0.03, -0.4); g.rotate(-0.25 + fl * 0.45 + (side < 0 ? 0.15 : 0)); for (let k = 3; k >= 0; k--) P((p) => { p.moveTo(0, 0); p.quadraticCurveTo(-0.08 - k * 0.07, -0.18 - k * 0.04, -0.2 - k * 0.09, -0.34 + k * 0.05); p.quadraticCurveTo(-0.08 - k * 0.04, -0.12 + k * 0.03, 0.02, 0.02); p.closePath(); }, side > 0 ? "#ffffff" : "#dfe8f4"); g.restore(); };
  wing(-1);
  for (const [lx, ph] of [[-0.28, 0], [-0.15, 1.5], [0.15, 0.7], [0.28, 2.2]]) { const a = Math.sin(t * 6 + ph) * 0.35; g.save(); g.translate(lx, -0.18); g.rotate(a); P((p) => p.roundRect(-0.045, 0, 0.09, 0.2, 0.04), "#f4f2ee"); P((p) => p.roundRect(-0.05, 0.17, 0.1, 0.06, 0.02), "#c9a13e"); g.restore(); }
  P((p) => p.ellipse(0, -0.28, 0.36, 0.2, 0, 0, 7), "#fbfaf6");
  P((p) => { p.moveTo(-0.34, -0.32); p.quadraticCurveTo(-0.6, -0.3 + fl * 0.05, -0.55, -0.05); p.quadraticCurveTo(-0.45, -0.25, -0.33, -0.22); p.closePath(); }, "#e8d48a");
  g.save(); g.translate(0.3, -0.5); g.rotate(-0.25 + Math.sin(t * 2) * 0.05);
  P((p) => p.ellipse(0.06, -0.06, 0.22, 0.19, 0.2, 0, 7), "#fbfaf6"); P((p) => p.ellipse(0.2, 0.04, 0.12, 0.1, 0.2, 0, 7), "#f1e7e0");
  P((p) => { p.moveTo(-0.05, -0.22); p.lineTo(0.0, -0.36); p.lineTo(0.06, -0.21); p.closePath(); }, "#fbfaf6");
  P((p) => { p.moveTo(-0.16, -0.18); p.quadraticCurveTo(-0.05, -0.3, 0.12, -0.24); p.quadraticCurveTo(-0.05, -0.15, -0.2, 0.08); p.closePath(); }, "#e8d48a");
  g.fillStyle = "#fffaf2"; g.beginPath(); g.ellipse(0.1, -0.08, 0.055, 0.07, 0, 0, 7); g.fill(); g.strokeStyle = O; g.lineWidth = lw; g.stroke();
  g.fillStyle = "#2a5a8a"; g.beginPath(); g.ellipse(0.115, -0.07, 0.035, 0.05, 0, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(0.1, -0.1, 0.014, 0, 7); g.fill();
  g.fillStyle = "rgba(240,120,140,0.4)"; g.beginPath(); g.ellipse(0.1, 0.03, 0.04, 0.025, 0, 0, 7); g.fill();
  g.restore(); wing(1); g.restore();
}

// ---------------------------------------------------------------- scenes
type SceneDef = { bg: string; blur?: number; bright?: number; z?: [number, number]; dx?: number; dy?: number; tint?: string; gray?: (u: number) => number; draw: (g: Ctx, t: number, u: number) => void };
const S: SceneDef[] = [];

// 0. a festival by the sea; the crowd cheers as young Medusa walks through and shows off her famous hair
S[0] = { bg: "c_agora", blur: 4, z: [1.12, 1.2], dx: -40, draw: (g, t, u) => { const h = rel(0, "hair") - 0.25, close = u > h, walk = since(u, 0, 2.4);
  if (!close) {
    crowd(g, t, G - 210, 330, 7, 3, "cheer"); shadowFloor(g, 0.2);
    ch(g, MED, { walk: u < 2.4 ? 1 : 0, mouth: "smile", eyes: u > 2.6 ? "happy" : "open", armR: u > 2.5 ? [2.4 + Math.sin(t * 6) * 0.2, 0.4] : undefined, headTilt: u > 2.5 ? -0.12 : 0, blush: 0.8 }, lerp(-150, 540, walk), G + 40, 720, t);
    particles(g, t, "petals", 40);
  } else {
    const k = pop(u, h, 0.4); ch(g, MED, { mouth: "smile", eyes: "happy", headTilt: -0.1 + Math.sin(t * 2) * 0.06, blush: 1, armR: [2.6, 0.5] }, 540, 1900 + (1 - k) * 300, 1650, t);
    sparkles(g, t, 470, 520, 330, since(u, h, 0.3)); particles(g, t, "sparkle", 40);
  } } };

// 1. a storm: the sea god rises out of the waves; she runs for Athena's temple; close on her fear
S[1] = { bg: "c_storm", blur: 3, bright: 0.85, z: [1.15, 1.25], draw: (g, t, u) => { const pz = rel(1, "poseidon") - 0.3, at = rel(1, "temple") - 0.1;
  if (u < at) {
    const rise = since(u, pz, 0.9);
    glow(g, 760, 900, 700, "80,200,255", 0.4 * rise);
    ch(g, POS, { mouth: "flat", eyes: "angry", holdR: "trident", armR: [1.8, -0.3], propRot: 0.1, headTilt: -0.05 }, 800, lerp(2500, 1450, rise), 1150, t, true);
    ch(g, MED, { walk: 1, phase: t * 13, eyes: "wide", mouth: "o", sweat: 1, armL: [1.6 + Math.sin(t * 13) * 0.6, 0.6], armR: [1.6 - Math.sin(t * 13) * 0.6, 0.6], lean: 0.12 }, lerp(380, 120, clamp01((u - pz) / 1.6)), G + 60, 520, t, true);
    particles(g, t, "spray", 70); flash(g, pulse(u, pz + 0.1, 0.18) * 0.9, "210,235,255");
  } else {
    g.fillStyle = "rgba(10,20,40,0.45)"; g.fillRect(0, 0, W, H);
    const sh = Math.sin(t * 45) * 8 * Math.exp(-(u - at) * 3);
    ch(g, MED, { eyes: "wide", mouth: "o", sweat: 1, armL: [2.7, 0.6], armR: [2.7, 0.6], squash: 0.02 }, 540 + sh, 1950 + (1 - pop(u, at, 0.3)) * 200, 1650, t);
  } } };

// 2. Athena, furious: she stomps and blazes; then Medusa alone and crying
S[2] = { bg: "c_temple", blur: 4, z: [1.1, 1.18], draw: (g, t, u) => { const fu = rel(2, "furious") - 0.2, pm = rel(2, "medusa") - 0.2;
  if (u < pm) {
    const st = u > fu ? Math.abs(Math.sin((u - fu) * 7)) * Math.exp(-(u - fu) * 1.0) : 0;
    glow(g, 540, 820, 650, "255,170,60", 0.55 * since(u, fu, 0.3));
    shadowFloor(g, 0.25);
    ch(g, ATH, { eyes: "angry", mouth: u > fu ? "teeth" : "frown", hop: st * 0.08, squash: st < 0.1 && u > fu ? 0.05 : 0, holdR: "spear", armR: [1.0, -0.5], propRot: 0.05, holdL: "shield", armL: [0.9, 0.6], headTilt: Math.sin(t * 9) * 0.04 * since(u, fu, 0.3) }, 540, G + 40, 900, t);
    particles(g, t, "embers", 70);
    if (u > fu) bubble(g, 800, 380, "!!", pop(u, fu, 0.3), 90);
  } else {
    g.fillStyle = "rgba(20,20,50,0.4)"; g.fillRect(0, 0, W, H);
    ch(g, MED, { eyes: "sad", mouth: "frown", headTilt: 0.1, armL: [0.4, 1.6], armR: [0.5, 1.8], blush: 0.4 }, 540, 1950 + (1 - pop(u, pm, 0.35)) * 200, 1650, t);
    tear(g, 470, 700, t, 1650); tear(g, 590, 690, t + 0.5, 1650);
  } } };

// 3. the curse: green lightning, her hair becomes snakes; a passing bird freezes to stone mid-flight
S[3] = { bg: "c_storm", blur: 6, bright: 0.6, z: [1.25, 1.35], tint: "rgba(40,90,30,0.35)", draw: (g, t, u) => { const sn = rel(3, "snakes") - 0.3, st = rel(3, "stone") - 0.25;
  const cursed = u > sn, sh = cursed ? Math.sin(t * 50) * 14 * Math.exp(-(u - sn) * 3) : 0;
  glow(g, 540, 760, 800, "150,255,100", cursed ? 0.5 : 0.1);
  ch(g, cursed ? GOR : MED, { eyes: u > st ? "glow" : cursed ? "angry" : "sad", mouth: cursed ? "teeth" : "frown", armL: cursed ? [1.9, 0.6] : [0.3, 0.4], armR: cursed ? [1.9, 0.6] : [0.3, 0.4], squash: cursed ? -0.03 * Math.exp(-(u - sn) * 3) : 0 },
    540 + sh, 1700 + (cursed ? (1 - pop(u, sn, 0.35)) * 120 : 0), 1250, t);
  const bs = since(u, st, 0.15), fall = Math.max(0, u - st - 0.3);
  if (u > st - 1.4) bird(g, lerp(-80, 820, clamp01((u - st + 1.4) / 1.4)), 330 + fall * fall * 900, t, 70, bs);
  particles(g, t, "spores", 60); flash(g, pulse(u, sn, 0.25) * 0.9, "190,255,160"); flash(g, pulse(u, st, 0.2) * 0.5, "200,255,180");
} };

// 4. the edge of the world: she walks alone between stone soldiers
S[4] = { bg: "c_isle", blur: 3, z: [1.12, 1.24], dy: -40, draw: (g, t, u) => {
  for (let i = 0; i < 4; i++) ch(g, SOLDIER(i), { stone: 1, holdR: "spear", armR: [1.2, -0.4], propRot: 0.05, holdL: "shield", armL: [0.9, 0.6], eyes: i % 2 ? "wide" : "angry", mouth: "o" }, 110 + i * 290, G - 120 + (i % 2) * 40, 380, 0, i % 2 === 1);
  shadowFloor(g, 0.25);
  ch(g, GOR, { walk: 0.6, phase: t * 5, eyes: "sad", mouth: "flat", headTilt: 0.12, armL: [0.15, 0.3], armR: [0.15, 0.3] }, lerp(140, 760, clamp01(u / 4.5)), G + 50, 600, t);
  ch(g, SOLDIER(4), { stone: 1, holdR: "sword", armR: [2.4, 0.2], eyes: "wide", mouth: "scream" }, 920, G + 160, 640, 0, true);
  particles(g, t, "dust", 50);
} };

// 5. the king's hall: Polydectes sends Perseus off. "Lowkey, a death sentence."
S[5] = { bg: "c_hall", blur: 4, z: [1.1, 1.18], draw: (g, t, u) => { const pin = rel(5, "perseus") - 0.4, lk = rel(5, "lowkey") - 0.2;
  crowd(g, t, G - 230, 300, 6, 20, u > lk ? "gasp" : "feast"); shadowFloor(g, 0.25);
  ch(g, KING, { mouth: "grin", talk: u < lk ? 1 : 0, eyes: u > lk ? "happy" : "open", armR: [lerp(0.3, 1.6, since(u, 0.4, 0.4)), 0.05], headTilt: Math.sin(t * 3) * 0.05 }, 280, G + 30, 820, t);
  const pin1 = since(u, pin, 0.8), gulp = u > lk ? Math.exp(-(u - lk) * 5) : 0;
  ch(g, PER, { walk: u > pin && u < pin + 0.8 ? 1 : 0, eyes: u > lk ? "wide" : "open", mouth: u > lk ? "flat" : "smile", sweat: u > lk ? 1 : 0, hop: gulp * 0.08 * Math.abs(Math.sin((u - lk) * 14)), armL: u > lk ? [0.4, 2.2] : undefined }, lerp(1250, 790, pin1), G + 50, 760, t, true);
  if (u > lk) { bubble(g, 830, 480, "gulp", pop(u, lk + 0.15, 0.3), 64); g.fillStyle = `rgba(120,0,0,${0.18 * since(u, lk, 0.3)})`; g.fillRect(0, 0, W, H); }
  particles(g, t, "embers", 30);
} };

// 6. gifts of the gods: Hermes swoops in with a curved blade, Athena brings a polished shield
S[6] = { bg: "c_clouds", blur: 3, z: [1.1, 1.2], dy: 40, draw: (g, t, u) => { const hm = rel(6, "blade") - 0.6, at = rel(6, "shield") - 0.6;
  const gotB = u > hm + 0.7, gotS = u > at + 0.7;
  particles(g, t, "sparkle", 40);
  ch(g, PER, { eyes: gotB ? "happy" : "wide", mouth: gotB ? "grin" : "o", holdR: gotB ? "harpe" : "none", armR: gotB ? [2.3, 0.2] : [0.6, 0.4], holdL: gotS ? "shield" : "none", armL: gotS ? [1.0, 0.6] : [0.3, 0.3], hop: Math.abs(Math.sin(t * 5)) * 0.03 * (gotB ? 1 : 0) }, 540, G + 40, 760, t);
  const hin = since(u, hm, 0.7);
  ch(g, HER, { hop: 0, holdR: gotB ? "none" : "harpe", armR: [2.0, 0.3], mouth: "grin", eyes: "happy", lean: 0.2 * (1 - hin), legL: [0.6, 0.6], legR: [-0.3, 0.8] }, lerp(-200, 250, hin), lerp(-100, 820, hin) + Math.sin(t * 3) * 20, 600, t);
  const ain = since(u, at, 0.7);
  ch(g, ATH, { mouth: "smile", holdL: gotS ? "none" : "shield", armL: [1.6, 0.3], armR: [0.3, 0.4], eyes: "open" }, lerp(1300, 860, ain), G - 120 + Math.sin(t * 2.6) * 14, 680, t, true);
  glow(g, 540, 700, 500, "255,240,180", 0.35 * (pulse(u, hm + 0.7, 0.3) + pulse(u, at + 0.7, 0.3)));
} };

// 7. winged sandals lift him off; then the helmet of darkness: he vanishes in a puff
S[7] = { bg: "c_clouds", blur: 4, z: [1.2, 1.24], draw: (g, t, u) => { const sd = rel(7, "sandals") - 0.3, bg_ = rel(7, "bag") - 0.3, inv = rel(7, "invisible") - 0.2;
  const lift = since(u, sd + 0.3, 1.0), gone = since(u, inv, 0.5), y = G + 40 - lift * 420 + Math.sin(t * 3) * 20 * lift;
  if (lift > 0) { g.save(); g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 6; for (let i = 0; i < 14; i++) { const x = (i * 97 + 30) % W, yy = ((i * 211 + t * 1600) % (H + 400)) - 200; g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy + 160); g.stroke(); } g.restore(); }
  const L = u > inv - 0.3 ? PER_DARK : PER;
  ch(g, L, { eyes: u > inv - 0.3 ? "happy" : "wide", mouth: "grin", holdR: "harpe", armR: [2.0, 0.3], holdL: u > bg_ ? "bag" : "shield", armL: [0.6, 0.6], legL: [0.3, 0.6], legR: [-0.2, 0.5], lean: Math.sin(t * 2) * 0.06 }, 540, y, 760, t, false, 1 - gone);
  if (u > sd) for (const sx of [-1, 1]) { g.save(); g.globalAlpha = 1 - gone; g.translate(540 + sx * 48, y - 12); g.scale(sx, 1); g.rotate(-0.4 + Math.sin(t * 24) * 0.35); g.fillStyle = "#fbf8f0"; g.strokeStyle = "#2a1a16"; g.lineWidth = 5;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(-30 - k * 12, -12 - k * 14, 46 - k * 6, 13, -0.4 - k * 0.2, 0, 7); g.fill(); g.stroke(); } g.restore(); }
  if (u > inv) { const k = clamp01((u - inv) / 0.8); g.save(); g.globalAlpha = 1 - k; g.fillStyle = "#f4f0ff"; g.strokeStyle = "#2a1a16"; g.lineWidth = 6;
    for (let i = 0; i < 9; i++) { const a = i * 0.7, d = 80 + k * 260; g.beginPath(); g.arc(540 + Math.cos(a) * d, y - 300 + Math.sin(a) * d * 0.8, 70 * (1 - k * 0.5), 0, 7); g.fill(); g.stroke(); } g.restore(); }
  flash(g, pulse(u, sd, 0.15) * 0.4);
} };

// 8. the cave: she's asleep; he backs in, looking only at her reflection in the shield
S[8] = { bg: "c_cave", blur: 5, bright: 0.75, z: [1.15, 1.22], draw: (g, t, u) => { const rf = rel(8, "reflection") - 0.4;
  glow(g, 300, 900, 500, "150,255,110", 0.25);
  if (u < rf) {
    ch(g, GOR, { eyes: "sleep", mouth: "flat", squash: 0.06, headTilt: 0.25, armL: [0.2, 1.4], armR: [0.2, 1.4] }, 270, G + 20, 640, t * 0.4); zzz(g, 380, G - 560, t);
    ch(g, PER, { walk: 0.4, phase: t * 4, eyes: "closed", mouth: "flat", sweat: 1, holdL: "shield", armL: [2.1, 0.1], holdR: "harpe", armR: [0.6, 0.4], propRot: 0.2, headTilt: 0.1 }, lerp(1150, 740, clamp01(u / 2.5)), G + 40, 720, t, false);
  } else {
    const k = pop(u, rf, 0.4), R = 400 * k;
    g.save(); g.translate(540, 860); g.fillStyle = "#6a4218"; g.beginPath(); g.arc(0, 0, R + 34, 0, 7); g.fill(); g.strokeStyle = "#2a1a16"; g.lineWidth = 10; g.stroke();
    const gr = g.createRadialGradient(-R * 0.3, -R * 0.35, 10, 0, 0, R); gr.addColorStop(0, "#f6d896"); gr.addColorStop(0.6, "#b88040"); gr.addColorStop(1, "#7a4a1c"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.stroke();
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, 7); g.clip(); g.globalAlpha = 0.75; g.scale(-1, 1); ch(g, { ...GOR, robe: "#6a5040", skin: "#a8b880" }, { eyes: "sleep", mouth: "flat", squash: 0.06, headTilt: 0.25 }, 0, R * 1.35, R * 1.9, t * 0.4); g.restore();
    g.globalCompositeOperation = "screen"; const sh = g.createLinearGradient(-R, -R, R, R); sh.addColorStop(0.35, "rgba(255,240,200,0)"); sh.addColorStop(0.5, "rgba(255,240,200,0.45)"); sh.addColorStop(0.65, "rgba(255,240,200,0)"); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill();
    g.restore(); zzz(g, 700, 620, t);
  }
  particles(g, t, "spores", 40);
} };

// 9. one swing (a flash, nothing shown); then Pegasus bursts up out of the light
S[9] = { bg: "c_cave", blur: 10, bright: 0.45, z: [1.2, 1.26], draw: (g, t, u) => { const sw = rel(9, "swing") - 0.1, pg = rel(9, "pegasus") - 0.9, rise = since(u, pg, 1.3);
  const arc = clamp01((u - sw) / 0.22);
  ch(g, PER, { holdR: "harpe", armR: [lerp(2.9, 0.8, arc), 0.1], propRot: lerp(-0.3, 1.6, arc), holdL: "shield", armL: [1.0, 0.6], lean: lerp(-0.05, 0.15, arc), squash: 0.03 * arc, eyes: u > pg + 0.4 ? "wide" : "closed", mouth: u > pg + 0.4 ? "o" : "teeth" }, lerp(540, 230, rise), G + 40, lerp(820, 560, rise), t);
  if (arc > 0 && arc < 1) { g.save(); g.strokeStyle = `rgba(255,255,255,${1 - arc})`; g.lineWidth = 60 * (1 - arc) + 8; g.shadowColor = "white"; g.shadowBlur = 40; g.beginPath(); g.arc(540, 820, 420, -2.6 + arc * 0.4, -2.6 + arc * 3.4); g.stroke(); g.restore(); }
  flash(g, since(u, sw + 0.1, 0.06) * (1 - since(u, sw + 0.25, 0.7)));
  if (rise > 0) { glow(g, 540, lerp(1500, 800, rise), 800, "255,250,225", 0.8 * rise); pegasus(g, 660 + Math.sin(t * 2) * 30, lerp(1500, 880, rise), 820 * lerp(0.6, 1, rise), t); particles(g, t, "sparkle", 50); }
} };

// 10. the court: Perseus lifts the bag, eyes shut; the king and all his court turn to stone
S[10] = { bg: "c_hall", blur: 5, z: [1.12, 1.2], gray: (u) => since(u, rel(10, "stone") - 0.25, 0.9), draw: (g, t, u) => { const hd = rel(10, "held") - 0.4, st = rel(10, "stone") - 0.25, lvl = since(u, st, 0.9);
  const sh = u > st ? Math.sin(t * 60) * 12 * Math.exp(-(u - st) * 3) : 0;
  crowd(g, t, G - 230, 300, 6, 40, u > hd + 0.4 ? "gasp" : "chat", lvl);
  shadowFloor(g, 0.25);
  const kt = lvl >= 1 ? SHOTS[10].a + st + 0.9 : t;
  ch(g, KING, { mouth: u > hd + 0.3 ? "scream" : "grin", talk: u < hd ? 1 : 0, eyes: u > hd + 0.3 ? "wide" : "happy", armR: u > hd + 0.3 ? [2.6, 0.3] : [1.0, 1.4], armL: u > hd + 0.3 ? [2.6, 0.3] : [0.3, 0.3], stone: lvl, sweat: u > hd + 0.3 && lvl < 0.5 ? 1 : 0 }, 330 + sh, G + 30, 840, kt);
  ch(g, PER, { eyes: "closed", mouth: "flat", holdR: "bag", armR: [lerp(0.4, 2.6, since(u, hd, 0.35)), 0.1], propRot: Math.PI, headTilt: 0.25, holdL: "shield", armL: [0.9, 0.6] }, 820, G + 50, 760, t, true);
  if (u > hd) glow(g, 700, 520, 520, "150,255,100", 0.7 * since(u, hd, 0.4) * (1 - lvl));
  flash(g, pulse(u, st, 0.18) * 0.5, "200,255,180");
} };

// 11. Athena wears the face on her shield forever
S[11] = { bg: "c_temple", blur: 4, z: [1.12, 1.2], draw: (g, t, u) => { const fv = rel(11, "forever") - 0.3;
  glow(g, 700, 700, 600, "255,220,140", 0.35 + 0.3 * pulse(u, fv, 0.5));
  ch(g, ATH, { mouth: "flat", eyes: "open", holdR: "spear", armR: [1.0, -0.5], propRot: 0.05, armL: [0.9, 0.6], headTilt: -0.05 }, 330, G + 40, 860, t);
  const k = since(u, 0.3, 0.7), R = 260, x = lerp(1250, 740, k), y = 820;
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 1.2) * 0.04); g.fillStyle = "#7a4e1c"; g.strokeStyle = "#2a1a16"; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, R + 26, 0, 7); g.fill(); g.stroke();
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, 10, 0, 0, R); gr.addColorStop(0, "#f8dc98"); gr.addColorStop(1, "#a06a2a"); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.stroke();
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, 7); g.clip(); ch(g, { ...GOR, skin: "#d8a860", robe: "#b07a30", trim: "#e8c070" }, { eyes: "angry", mouth: "teeth" }, 0, R * 1.55, R * 2.1, t); g.restore();
  g.restore(); sparkles(g, t, x, y, R * 1.2, since(u, fv, 0.4)); particles(g, t, "dust", 40);
} };

// 12. a survivor: she sits by the quiet shore at sunset
S[12] = { bg: "c_shore", blur: 4, z: [1.12, 1.2], dx: 30, draw: (g, t, u) => { const sv = rel(12, "survivor") - 0.3;
  glow(g, 540, 700, 700, "255,200,140", 0.25 + 0.3 * since(u, sv, 0.6));
  ch(g, GOR, { eyes: u > sv ? "happy" : "closed", mouth: u > sv ? "smile" : "flat", squash: 0.04, headTilt: -0.06 + Math.sin(t * 0.8) * 0.03, armL: [0.3, 0.5], armR: [0.3, 0.5], blush: 0.5 }, 540, G + 40, 820, t * 0.5);
  particles(g, t, "dust", 30);
} };

// 13. villain or victim? her glowing eyes fill the frame; the title
S[13] = { bg: "c_isle", blur: 12, bright: 0.35, z: [1.2, 1.3], draw: (g, t, u) => { const vt = rel(13, "victim") - 0.2, end = LINES[13].end - SHOTS[13].a + 0.1;
  ch(g, GOR, { eyes: u > vt ? "glow" : "open", mouth: "flat", headTilt: Math.sin(t * 0.9) * 0.03 }, 540, lerp(2300, 2600, clamp01(u / 5)), lerp(2300, 2700, clamp01(u / 5)), t);
  particles(g, t, "spores", 50);
  g.fillStyle = `rgba(2,6,6,${0.7 * since(u, end, 0.6)})`; g.fillRect(0, 0, W, H);
  const a = since(u, end, 0.5); if (a > 0) { g.save(); g.globalAlpha = a; g.translate(540, 620); g.scale(lerp(1.4, 1, a), lerp(1.4, 1, a)); g.font = "900 150px SubFont, Arial Black, sans-serif"; g.textAlign = "center"; g.lineWidth = 16; g.strokeStyle = "#1a1030"; g.strokeText("MEDUSA", 0, 0); g.fillStyle = "#b8ff8a"; g.fillText("MEDUSA", 0, 0); g.restore(); }
} };

// ---------------------------------------------------------------- shot renderer, camera, whip cuts
const Stage: React.FC<{ k: number; t: number; u: number }> = ({ k, t, u }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; g.clearRect(0, 0, W, H); S[k].draw(g, t, u); });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
const HITS: [number, string, number, number][] = [
  [0, "hair", 0.08, 0], [1, "poseidon", 0.08, 14], [1, "attacked", 0.1, 10], [2, "furious", 0.1, 16], [2, "medusa", 0.08, 0],
  [3, "snakes", 0.14, 20], [3, "stone", 0.1, 0], [5, "lowkey", 0.1, 8], [6, "blade", 0.06, 0], [6, "shield", 0.06, 0],
  [7, "sandals", 0.08, 0], [7, "invisible", 0.1, 0], [8, "reflection", 0.08, 0], [9, "swing", 0.16, 26], [9, "pegasus", 0.08, 10], [10, "stone", 0.12, 0], [13, "victim", 0.1, 0],
];
const HIT_T = HITS.map(([l, w, z, sh]) => ({ l, t: wt(l, w), z, sh }));
function camera(k: number, t: number, u: number) {
  const snap = 1 - smooth(u / 0.45);
  let z = 1.0 + 0.1 * snap + 0.008 * u, sx = 0, sy = 0; const rot = (k % 2 ? 1 : -1) * 0.015 * snap;
  for (const h of HIT_T) { if (h.l !== k) continue; const d = t - h.t + 0.05; if (d < 0 || d > 1.2) continue; const e = Math.exp(-d * 4.5);
    z += h.z * (d < 0.08 ? d / 0.08 : 1) * e; if (h.sh) { const a = h.sh * Math.exp(-d * 7); sx += Math.sin(d * 70) * a; sy += Math.cos(d * 53) * a * 0.7; } }
  return { z, sx: sx + Math.sin(t * 0.7 + k) * 5, sy: sy + Math.cos(t * 0.5 + k) * 4, rot };
}
const Shot: React.FC<{ k: number; t: number; dx?: number; blur?: number }> = ({ k, t, dx = 0, blur = 0 }) => {
  const u = t - SHOTS[k].a, c = camera(k, t, u), d = S[k], kk = clamp01(u / 5), z = d.z ?? [1.1, 1.18], gray = d.gray ? d.gray(u) : 0;
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `translateX(${dx}px)`, filter: blur ? `blur(${blur}px)` : undefined }}>
      <AbsoluteFill style={{ transform: `translate(${c.sx}px, ${c.sy}px) rotate(${c.rot}rad) scale(${c.z})`, filter: gray ? `grayscale(${gray}) contrast(${1 + 0.15 * gray})` : undefined }}>
        <Img src={staticFile(`medusa/art3/${d.bg}.png`)} style={{ position: "absolute", width: W, height: H, objectFit: "cover", transform: `translate(${(d.dx ?? 0) * kk}px, ${(d.dy ?? 0) * kk}px) scale(${lerp(z[0], z[1], kk)})`, filter: `blur(${d.blur ?? 4}px) brightness(${d.bright ?? 1}) saturate(1.15)` }} />
        {d.tint && <AbsoluteFill style={{ background: d.tint }} />}
        <Stage k={k} t={t} u={u} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
const XF = 0.22;
export const Medusa3: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const on = { subs: true, audio: true, ...((getInputProps() as { post?: { subs?: boolean; audio?: boolean } }).post ?? {}) };
  const i = SHOTS.findIndex((s) => t >= s.a && t < s.b); const k = i < 0 ? SHOTS.length - 1 : i; const u = t - SHOTS[k].a;
  const whip = k > 0 && u < XF; const e = smooth(u / XF), dir = k % 2 ? 1 : -1, bl = Math.sin(Math.PI * e) * 18;
  return (
    <AbsoluteFill style={{ background: "#0a0810" }}>
      {whip ? (<>
        <Shot k={k - 1} t={t} dx={-dir * W * e} blur={bl} />
        <Shot k={k} t={t} dx={dir * W * (1 - e)} blur={bl} />
      </>) : <Shot k={k} t={t} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.4) 100%)" }} />
      {on.subs && <Subtitles words={WORDS} style={subStyle} />}
      {withAudio && on.audio && <Audio src={staticFile("medusa/mix.wav")} />}
    </AbsoluteFill>
  );
};
