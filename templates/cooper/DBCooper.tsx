// "D.B. Cooper, 1971": a heist mystery in the living-engraving look, with its own identity: rain-blue nights, sodium
// amber cabin light, a red-tailed trijet, firs and lightning. Timings come from the narration's real word times.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import { drawBust, Bust, BustAnim } from "../docu/portrait";
import { human, settleH, drawHuman, HLook, HPose, setLine } from "../docu/human";
import { litLayer, paperGrain } from "../docu/look";
import { hatchBox, hatchIn, INK, rng } from "../docu/sea";
import { trijet, firs, rain, NIGHT, briefcase, bill, chutePack, flashAt, bolt } from "./kit";
import lines from "../../stories/db-cooper/lines.json";
import words from "../../stories/db-cooper/words.json";

type Ctx = CanvasRenderingContext2D;
const W = 1080, H = 1920, FPS = 30;
const LINES = lines as { start: number; end: number; text: string }[];
const WORDS = words as Word[];
export const DBC_TOTAL = Math.ceil((LINES[LINES.length - 1].end + 1.9) * FPS);
const KEY = ["cooper", "dan", "portland", "seattle", "bourbon", "note", "bomb", "briefcase", "red", "wires", "battery", "two", "hundred", "thousand", "twenties", "four", "parachutes", "thirty-six", "jumps", "money", "dark", "main", "character", "energy", "fbi", "nothing", "eight-year-old", "columbia", "six", "never", "mistake", "d.b.", "twenty", "sixteen", "got", "away", "rain", "washington", "nineteen", "seventy-one", "eighty"];
const subStyle = defaultStyle("mystery", { keyWords: KEY });

const LEAD = 0.25;
const SHOTS = LINES.map((l, i) => ({ i, a: i === 0 ? 0 : l.start - LEAD, b: i === LINES.length - 1 ? DBC_TOTAL / FPS : LINES[i + 1].start - LEAD }));
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
function wt(li: number, word: string, n = 0) { const ws = WORDS.filter((w) => w.line === li && norm(w.w) === norm(word)); return ws[n]?.s ?? LINES[li].start; }
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const since = (t: number, t0: number, d = 0.4) => smooth((t - t0) / d);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rel = (li: number, word: string, n = 0) => wt(li, word, n) - SHOTS[li].a;   // word time inside its shot

// ---------------------------------------------------------------- cast
const COOPER: Bust = { skin: "#e0b694", hair: "#2a201a", hairStyle: "side", coat: "#24262a", shirt: "#eeeae2", tie: "#111114", lapel: "#1c1e22", age: 0.45, jaw: 0.4, nose: 0.2, glasses: "dark" };
const FLO: Bust = { skin: "#f0c8a8", hair: "#7a5432", hairStyle: "bob", female: true, coat: "#2d4a6a", shirt: "#f2ece0", lapel: "#25405e", age: 0.15, jaw: -0.3, nose: 0.1 };
const BOY: Bust = { skin: "#f1cdb0", hair: "#8a6a40", hairStyle: "child", child: true, coat: "#a04a30", shirt: "#e8e2d4", age: 0, nose: -1 };
const MAN: HLook = { skin: "#1a1a20", hair: "#111", hairStyle: "short", coat: "#14151a", coatLen: "knee", pants: "#121318", boots: "#0c0c10", hat: "none" };
const AGENT: HLook = { ...MAN, hat: "wide", hatCol: "#0d0d12" };
const KID: HLook = { skin: "#1b1a1e", hair: "#121114", hairStyle: "curly", child: true, coat: "#141318", coatLen: "waist", pants: "#121116", boots: "#0c0c10" };

// ---------------------------------------------------------------- helpers
function bust(g: Ctx, B: Bust, A: BustAnim, t: number, x: number, y: number, s: number, flip = false, key = -1, id = "b", rim = "rgba(255,200,130,0.85)", cool = "#8790a8") {
  litLayer(g, W, H, (f) => { f.save(); f.translate(x, y); f.scale(flip ? -s : s, s); drawBust(f, B, A, t, s); f.restore(); },
    { box: [x - s * 1.2, y - s * 0.2, x + s * 1.2, Math.max(y + s * 2.7, H + 10)], key: flip ? -key : key, contour: 2, hatchAmt: 0, shadowAmt: 1.2, rim, cool }, id);
}
function figure(g: Ctx, L: HLook, pose: (t: number) => HPose, t: number, x: number, y: number, k: number, dir = 1, id = "s", seed = 1, rim = "rgba(255,200,130,0.8)", rot = 0) {
  const p = human(L, seed); const st = settleH(p, pose, t, 0);
  setLine("rgba(0,0,0,0.6)");
  litLayer(g, W, H, (f) => { f.save(); f.translate(x, y); f.rotate(rot); f.scale(k, -k); drawHuman(f, p, st, t, "34", dir, -1, 1.2 / k); f.restore(); },
    { box: [x - k * 1.4, y - k * 2.2, x + k * 1.4, y + k * 0.6], key: -dir, contour: 1.5, hatchAmt: 0, rim, cool: "#555" }, id);
}
function label(g: Ctx, text: string, x: number, y: number, size: number, a = 1, col = "#f1e8d2", align: CanvasTextAlign = "center", font = "Bitstream Charter", weight = "600") {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = `${weight} ${size}px "${font}", "Caladea", serif`; g.textAlign = align; g.textBaseline = "middle";
  g.letterSpacing = `${size * 0.1}px`; g.lineWidth = size * 0.14; g.strokeStyle = "rgba(20,14,16,0.8)"; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y); g.restore();
}
function vignette(g: Ctx, a = 0.6) { const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.5, H * 0.7); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(5,8,12,${a})`); g.fillStyle = v; g.fillRect(0, 0, W, H); }
function glow(g: Ctx, x: number, y: number, r: number, a: number, col = "255,190,110") { const lg = g.createRadialGradient(x, y, 0, x, y, r); lg.addColorStop(0, `rgba(${col},${0.5 * a})`); lg.addColorStop(1, `rgba(${col},0)`); g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = lg; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
function nightSky(g: Ctx, t: number, top = NIGHT.sky0, low = NIGHT.sky1) {
  const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, top); sk.addColorStop(1, low); g.fillStyle = sk; g.fillRect(0, 0, W, H);
  const r = rng(4); for (let i = 0; i < 7; i++) { const x = ((r() * W * 1.6 + t * 14 * (0.5 + r())) % (W * 1.6)) - W * 0.3, y = r() * 900, w = 400 + r() * 500; const cg = g.createRadialGradient(x, y, 0, x, y, w / 2); cg.addColorStop(0, "rgba(60,72,84,0.35)"); cg.addColorStop(1, "rgba(60,72,84,0)"); g.save(); g.translate(x, y); g.scale(1, 0.35); g.translate(-x, -y); g.fillStyle = cg; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore(); }
}
function zoom(g: Ctx, z: number, cx = W / 2, cy = H / 2, dx = 0, dy = 0) { g.translate(cx + dx, cy + dy); g.scale(z, z); g.translate(-cx, -cy); }
function paper(g: Ctx, x: number, y: number, w: number, h: number, rot: number, col = "#e8dfc8") {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(-w / 2 + 10, -h / 2 + 12, w, h); g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-w / 2, -h / 2, w, h); g.restore();
}

// ---------------------------------------------------------------- shots
type Draw = (g: Ctx, t: number, u: number) => void;

// 0. the ticket counter, Portland, a rainy Thanksgiving eve
const shTicket: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.06 + u * 0.02, W / 2, 800);
  g.fillStyle = "#2c2a26"; g.fillRect(0, 0, W, H);
  // big terminal window with rain and runway lights behind
  g.save(); g.beginPath(); g.rect(60, 120, 960, 760); g.clip(); nightSky(g, t); for (let k = 0; k < 9; k++) glow(g, 120 + k * 110, 760 + (k % 2) * 6, 40, 0.8, "255,200,120"); rain(g, W, 900, t, 0.8, 0.1); g.restore();
  g.strokeStyle = "#151412"; g.lineWidth = 18; g.strokeRect(60, 120, 960, 760); g.beginPath(); g.moveTo(540, 120); g.lineTo(540, 880); g.stroke();
  glow(g, 700, 300, 900, 0.7);
  bust(g, COOPER, { lookX: -0.3, lookY: 0.4, brow: -0.1 }, t, 560, 420, 430, true, -1, "c0");
  // the counter + ticket
  g.fillStyle = "#6a4a30"; g.fillRect(0, 1380, W, 600); hatchBox(g, 0, 1380, W, H, 8, 0.05, 1.2, "rgba(0,0,0,0.3)"); g.fillStyle = "#8a6440"; g.fillRect(0, 1370, W, 30); g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 1370); g.lineTo(W, 1370); g.stroke();
  const a = since(u, 0.6, 0.6);
  g.save(); g.translate(540 + (1 - a) * 500, 1640); g.rotate(-0.06);
  g.fillStyle = "#efe6d0"; g.fillRect(-300, -140, 600, 280); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(-300, -140, 600, 280); g.fillStyle = NIGHT.red; g.fillRect(-300, -140, 600, 56);
  label(g, "PASSENGER TICKET", 0, -112, 30, 1, "#f3ead6"); label(g, "PORTLAND  -  SEATTLE", 0, -30, 34, 1, "#2a1e18");
  g.save(); g.font = `italic 48px "FreeSerif", serif`; g.fillStyle = "#1c2a50"; g.textAlign = "center"; const nm = "Dan Cooper"; const k = Math.floor(clamp01((u - rel(0, "Name") + SHOTS[0].a - 0.1) / 0.8) * nm.length); g.fillText(nm.slice(0, k), 0, 70); g.restore();
  g.restore();
  g.restore(); vignette(g, 0.65);
};

// 1. in the cabin: a bourbon, then a note to the flight attendant
function cabin(g: Ctx, t: number) {
  g.fillStyle = "#3a3026"; g.fillRect(0, 0, W, H);
  // ceiling and overhead bins converging to the back of the cabin
  const vx = 300, vy = 760;
  g.fillStyle = "#cbbf9f"; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(vx + 160, vy - 120); g.lineTo(vx - 160, vy - 120); g.fill();
  for (let k = 0; k < 9; k++) { const y = Math.pow(k / 9, 1.6) * (vy - 120); g.strokeStyle = "rgba(40,30,20,0.4)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0 + k * 30, y); g.lineTo(W - k * 80, y); g.stroke(); }
  for (let k = 0; k < 10; k++) { const u = k / 10, x = lerp(W - 40, vx + 140, u), y = lerp(260, vy - 80, u); glow(g, x, y, 60 * (1 - u * 0.7), 0.9); }
  // window wall on the right with dark rain windows
  g.fillStyle = "#bdb196"; g.beginPath(); g.moveTo(W, 0); g.lineTo(vx + 160, vy - 120); g.lineTo(vx + 160, vy + 200); g.lineTo(W, H); g.fill();
  for (let k = 0; k < 6; k++) { const u = Math.pow(k / 6, 1.3), x = lerp(W - 90, vx + 190, u), y = lerp(600, vy - 10, u), s = 1 - u * 0.75;
    const bz = new Path2D(); bz.roundRect(x - 62 * s, y - 92 * s, 124 * s, 184 * s, 50 * s); g.fillStyle = "#e2d9c4"; g.fill(bz); g.strokeStyle = "rgba(40,30,20,0.6)"; g.lineWidth = 3 * s; g.stroke(bz);
    const wn = new Path2D(); wn.roundRect(x - 40 * s, y - 66 * s, 80 * s, 132 * s, 34 * s); const wg = g.createLinearGradient(x, y - 66 * s, x, y + 66 * s); wg.addColorStop(0, "#1c2836"); wg.addColorStop(1, "#0b1018"); g.fillStyle = wg; g.fill(wn);
    g.save(); g.clip(wn); g.strokeStyle = "rgba(170,195,220,0.35)"; g.lineWidth = 1.5; for (let r = 0; r < 5; r++) { const rx = x - 30 * s + r * 15 * s, ry = y - 60 * s + ((t * 120 + r * 37) % (120 * s)); g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 4 * s, ry + 16 * s); g.stroke(); } g.restore();
    g.strokeStyle = INK; g.lineWidth = 3 * s; g.stroke(wn); }
  // rows of seat backs
  for (let r = 6; r >= 0; r--) {
    const u = r / 7, sc = 1 - u * 0.82, y = lerp(H + 60, vy + 120, Math.pow(u, 0.9)), cx = lerp(560, vx + 60, u);
    for (const sx of [-1.2, -0.4, 0.4, 1.2]) {
      const x = cx + sx * 260 * sc, w = 200 * sc, h = 360 * sc; const p = new Path2D(); p.roundRect(x - w / 2, y - h, w, h, 30 * sc);
      g.fillStyle = r % 2 ? "#7a5a3a" : "#865f3c"; g.fill(p); hatchIn(g, p, [x - w / 2, y - h, x + w / 2, y], 6, 1.4, 1, "rgba(0,0,0,0.3)");
      g.fillStyle = "#d9cfb8"; g.fillRect(x - w * 0.4, y - h + 6 * sc, w * 0.8, 50 * sc); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(p);
    }
  }
}
const shCabin: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.08 + u * 0.015, W / 2, 900); cabin(g, t);
  const noteT = rel(1, "note") - 0.4;
  bust(g, COOPER, { lookX: u > noteT ? -0.6 : 0.2, lookY: 0.2, mouth: 0 }, t, 760, 760, 330, true, 1, "c1");
  bust(g, FLO, { lookX: u > noteT + 0.4 ? 0.5 : 0.1, lookY: u > noteT + 0.4 ? 0.7 : 0 }, t, 240, 820, 320, false, 1, "f1");
  // the drink on a tray, the note sliding toward her
  g.fillStyle = "#cfc5b0"; g.fillRect(560, 1500, 420, 26); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(560, 1500, 420, 26);
  const gl = new Path2D(); gl.moveTo(840, 1500); gl.lineTo(830, 1400); gl.lineTo(910, 1400); gl.lineTo(900, 1500); gl.closePath(); g.fillStyle = "rgba(200,140,60,0.75)"; g.fill(gl); g.fillStyle = "rgba(230,240,245,0.5)"; g.fillRect(832, 1400, 76, 30); g.stroke(gl);
  const a = since(u, noteT, 0.7); if (a > 0) { paper(g, lerp(700, 430, a), lerp(1490, 1440, a), 220, 140, -0.1 + a * 0.15, "#f1ead8"); }
  g.restore(); vignette(g, 0.6);
};

// 2. the note: her face as she reads it
const shNote: Draw = (g, t, u) => {
  g.save(); zoom(g, 1 + u * 0.06, W / 2, 700);
  g.fillStyle = "#2a2420"; g.fillRect(0, 0, W, H); glow(g, 300, 400, 1000, 0.8);
  const shock = since(u, 0.6, 0.35);
  bust(g, FLO, { lookX: 0.3 + shock * 0.2, lookY: lerp(0.9, -0.2, shock), brow: shock * 0.9, eyes: shock, mouth: shock * 0.5, tilt: -shock * 0.04 } as BustAnim, t, 520, 360, 500, false, -1, "f2");
  // the note held up in the foreground, scrawled
  g.save(); g.translate(560, 1560); g.rotate(-0.07); g.fillStyle = "#f1ead8"; g.fillRect(-320, -170, 640, 340); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(-320, -170, 640, 340);
  g.strokeStyle = "#1b2248"; g.lineWidth = 5; const r = rng(7); for (let row = 0; row < 3; row++) { g.beginPath(); let x = -270; g.moveTo(x, -90 + row * 80); while (x < 240 - row * 60) { x += 12; g.lineTo(x, -90 + row * 80 + Math.sin(x * 0.3 + row) * 10 + (r() - 0.5) * 8); } g.stroke(); }
  g.restore();
  g.restore();
  g.fillStyle = `rgba(160,20,20,${shock * 0.18 * (0.6 + 0.4 * Math.sin(t * 8))})`; g.fillRect(0, 0, W, H);
  vignette(g, 0.65);
};

// 3. the briefcase opens just enough
const shCase: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.1 + u * 0.05, W / 2, 800);
  g.fillStyle = "#1c1a18"; g.fillRect(0, 0, W, H); glow(g, 540, 700, 800, 0.6 + 0.1 * Math.sin(t * 13));
  // his lap: dark trousers as a big shape
  g.fillStyle = "#1e2024"; g.beginPath(); g.moveTo(0, 1000); g.quadraticCurveTo(540, 900, W, 1000); g.lineTo(W, H); g.lineTo(0, H); g.fill(); hatchBox(g, 0, 900, W, H, 9, 0.3, 1.2, "rgba(0,0,0,0.4)");
  briefcase(g, 540, 900, 360, since(u, 0.2, 1.2) * 0.75, t);
  g.restore(); vignette(g, 0.75);
};

// 4. demands: the money, the parachutes
const shDemands: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.04 + u * 0.02);
  g.fillStyle = "#2f2a24"; g.fillRect(0, 0, W, H); hatchBox(g, 0, 0, W, H, 10, 0.1, 1, "rgba(0,0,0,0.25)"); glow(g, 540, 500, 1000, 0.8);
  // bills raining down and piling up
  const r = rng(11);
  for (let i = 0; i < 70; i++) { const t0 = r() * 2.4, x = 120 + r() * 840, sp = 900 + r() * 500, k = u - t0; if (k < 0) continue; const y = Math.min(-100 + k * sp, 700 + r() * 380); const land = y >= 700; bill(g, x + (land ? 0 : Math.sin(k * 5 + i) * 40), y, 210, land ? (r() - 0.5) * 0.8 : Math.sin(k * 3 + i) * 1.2, land ? 0 : Math.sin(k * 6 + i) * 1.2, 0, i); }
  // four parachute packs land one by one on "four parachutes"
  const tp = rel(4, "parachutes") - 0.4;
  for (let k = 0; k < 4; k++) { const a = since(u, tp + k * 0.22, 0.25); if (a <= 0) continue; const x = 180 + k * 240, y = lerp(-200, 1560, a); chutePack(g, x, y, 170, ["#5c5a3a", "#6a5c3a", "#4c5a3a", "#5c4e36"][k]); }
  g.restore(); vignette(g, 0.6);
};

// 5. Seattle: passengers released, the plane goes back up
const shSeattle: Draw = (g, t, u) => {
  const up = rel(5, "sends") - 0.2, k = since(u, up, 2.2);
  g.save(); zoom(g, 1.05);
  nightSky(g, t, "#0c131b", "#2a3440");
  // runway lights in perspective
  for (let i = 0; i < 18; i++) { const z = i / 18, y = lerp(1500, 1080, Math.pow(z, 0.6)); for (const s of [-1, 1]) glow(g, 540 + s * lerp(520, 40, Math.pow(z, 0.6)), y, 26 * (1 - z * 0.8), 0.9, i % 3 ? "255,210,130" : "120,180,255"); }
  g.fillStyle = "#14181d"; g.fillRect(0, 1100, W, 900); g.fillStyle = "rgba(255,200,120,0.05)"; g.fillRect(0, 1100, W, 900);
  const px = lerp(520, 1500, k * k), py = lerp(930, 200, k * k), pr = -0.18 * smooth(k * 3);
  g.save(); g.translate(px, py); g.scale(20, 20); g.rotate(pr); trijet(g, t, { lit: 1, wet: 1 }); g.restore();
  g.fillStyle = "rgba(10,20,40,0.28)"; g.fillRect(0, 0, W, H);
  // passengers walking off toward the terminal (left), before takeoff
  const off = 1 - since(u, up - 0.2, 0.4);
  if (off > 0) { g.save(); g.globalAlpha = off; for (let i = 0; i < 9; i++) { const ph = (u * 0.5 + i * 0.13) % 1; const x = lerp(900, 80, ph), y = 1040 + (i % 3) * 14; figure(g, MAN, (tt) => ({ walk: 1, phase: tt * 0.9 + i * 0.3 }), t, x, y, 70, -1, "p" + (i % 9), 40 + i, "rgba(255,200,130,0.6)"); } g.restore(); }
  rain(g, W, H, t, 0.8, 0.15);
  g.restore(); vignette(g, 0.6);
};

// 6. night, rain, the forests of Washington: the rear stairs come down
const shStorm: Draw = (g, t, u) => {
  const jump = rel(6, "jumps"), fl = flashAt(u, [0.8, jump - 0.15]);
  g.save(); zoom(g, 1.05 + u * 0.015, W / 2, 900, -u * 6);
  nightSky(g, t, "#070b10", "#18222b");
  bolt(g, 240, 0, 900, 3, flashAt(u, [0.8]) * 0.9); bolt(g, 820, 0, 1000, 8, flashAt(u, [jump - 0.15]) * 0.9);
  firs(g, W, 1500, 300, 3, "#101a17", t, 1); firs(g, W, 1760, 460, 6, "#0a120f", t, 1);
  g.save(); g.translate(560 + Math.sin(t * 0.7) * 10, 780 + Math.sin(t * 1.1) * 8); g.scale(24, 24); g.rotate(-0.03 + Math.sin(t * 0.9) * 0.01); trijet(g, t, { stairs: since(u, 1.2, jump - 1.5), lit: 0.4, wet: 1 }); g.restore();
  g.fillStyle = "rgba(8,14,26,0.35)"; g.fillRect(0, 0, W, H);
  rain(g, W, H, t, 1.3, 0.3);
  g.restore();
  if (fl > 0) { g.fillStyle = `rgba(220,230,255,${fl * 0.45})`; g.fillRect(0, 0, W, H); }
  vignette(g, 0.65);
};

// 7. with the money, into the dark
const shJump: Draw = (g, t, u) => {
  g.save();
  nightSky(g, t, "#121a22", "#26323c");
  bolt(g, 860, 300, 1300, 5, flashAt(u, [0.15]) * 0.9);
  firs(g, W, 1950, 380, 6, "#0a120f", t, 2);
  // the jet's belly fills the top of the frame; the rear airstair hangs down from it into the rain
  const sh = Math.sin(t * 1.2) * 6;
  g.save(); g.translate(0, sh);
  const belly = new Path2D(); belly.moveTo(-40, 0); belly.lineTo(1120, 0); belly.lineTo(1120, 250); belly.quadraticCurveTo(560, 420, -40, 330); belly.closePath();
  g.fillStyle = "#7d8489"; g.fill(belly); hatchBox(g, -40, 200, 1160, 420, 9, 0.1, 1.4, "rgba(10,14,20,0.35)"); g.strokeStyle = INK; g.lineWidth = 6; g.stroke(belly);
  g.fillStyle = "#a3241c"; g.fillRect(-40, 150, 1160, 18);
  // stair: from the hatch (700, 330) down-left to (330, 1010)
  const sx0 = 700, sy0 = 340, sx1 = 330, sy1 = 1010;
  g.save(); g.translate(sx0, sy0); const ang = Math.atan2(sy1 - sy0, sx1 - sx0), len = Math.hypot(sx1 - sx0, sy1 - sy0); g.rotate(ang);
  g.fillStyle = "#8f959a"; g.fillRect(0, -46, len, 92); g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(0, -46, len, 92);
  g.strokeStyle = "rgba(20,16,18,0.75)"; g.lineWidth = 3; for (let k = 1; k < 14; k++) { g.beginPath(); g.moveTo(len * k / 14, -46); g.lineTo(len * k / 14 + 14, 46); g.stroke(); }
  g.fillStyle = "#5b6166"; g.fillRect(0, 40, len, 14); g.restore();
  glow(g, sx0, sy0 + 20, 260, 0.9, "255,210,140");
  g.restore();
  // he steps off the last step and drops away, tumbling, until the dark swallows him
  const go = 0.55, f = Math.max(0, u - go), drop = f * f * 300 + f * 90;
  const k = 300 * (1 - clamp01(f / 2.6) * 0.55), fx = 395 - f * 60, fy = 895 + drop + sh, rot = f * 0.9;
  const fade = 1 - since(u, rel(7, "dark") + 0.2, 0.8);
  if (fade > 0 && fy < H + 400) {
    g.save(); g.globalAlpha = fade;
    const arms = clamp01(f * 2);
    figure(g, MAN, () => ({ shR: lerp(0.3, 2.5, arms), elR: 0.3, shL: lerp(-0.3, 2.3, arms), elL: 0.4, hipL: lerp(0, 0.4, arms), knL: lerp(0, 0.8, arms), hipR: lerp(0, -0.2, arms), knR: lerp(0, 0.5, arms), lean: 0.1 }), t, fx, fy, k, -1, "jump", 9, "rgba(150,170,200,0.55)", rot);
    g.restore();
  }
  rain(g, W, H, t, 1.5, 0.05, "rgba(190,210,225,0.45)");
  g.restore();
  const dark = since(u, rel(7, "dark") - 0.1, 1.0); g.fillStyle = `rgba(0,0,0,${dark * 0.5})`; g.fillRect(0, 0, W, H);
  vignette(g, 0.8);
};

// 8. the search: flashlights in the woods, the sketch on a tree
const shSearch: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.05 + u * 0.02, W / 2, 1100, -u * 10);
  nightSky(g, t, "#0b1210", "#1e2a26");
  firs(g, W, 1150, 520, 21, "#14201b", t, 0.5); firs(g, W, 1500, 700, 22, "#0d1612", t, 0.5);
  // a pinned sketch of the hijacker on a trunk (pencil version of the bust)
  g.fillStyle = "#2a2018"; g.fillRect(780, 500, 120, 1100); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(780, 500, 120, 1100); hatchBox(g, 780, 500, 900, 1600, 6, 1.57, 1.2, "rgba(0,0,0,0.4)");
  g.save(); g.beginPath(); g.rect(700, 760, 280, 360); g.clip(); g.fillStyle = "#ddd6c4"; g.fillRect(700, 760, 280, 360);
  g.globalAlpha = 0.9; g.filter = "grayscale(1) contrast(1.2)"; g.save(); g.translate(840, 800); g.scale(170, 170); drawBust(g, { ...COOPER, glasses: undefined }, { lookX: 0.2 }, t, 170); g.restore(); g.filter = "none"; g.restore();
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(700, 760, 280, 360); g.fillStyle = "#b03a2a"; g.beginPath(); g.arc(840, 772, 10, 0, 7); g.fill();
  // searchers with flashlight beams sweeping
  for (let i = 0; i < 3; i++) {
    const x = 160 + i * 240, y = 1560 + i * 30, sw = Math.sin(t * 0.9 + i * 1.7) * 0.5;
    g.save(); g.globalCompositeOperation = "screen"; const bx = x + 60, by = y - 230; const ang = -0.9 + sw; const bg = g.createRadialGradient(bx, by, 0, bx, by, 700); bg.addColorStop(0, "rgba(255,240,200,0.45)"); bg.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = bg; g.beginPath(); g.moveTo(bx, by); g.arc(bx, by, 700, ang - 0.18, ang + 0.18); g.closePath(); g.fill(); g.restore();
    figure(g, i === 1 ? AGENT : MAN, () => ({ shR: 1.3, elR: 0.3, turn: sw, walk: 0 }), t, x, y, 200, 1, "sr" + i, 60 + i, "rgba(255,230,180,0.7)");
  }
  rain(g, W, H, t, 0.5, 0.1);
  g.restore(); vignette(g, 0.7);
};

// 9. 1980: a boy on a Columbia River beach finds rotting twenties
const shRiver: Draw = (g, t, u) => {
  const cut = rel(9, "found") - 0.2;
  if (u < cut + 0.3) {
    g.save(); zoom(g, 1.04 + u * 0.03, W / 2, 1200);
    const sk = g.createLinearGradient(0, 0, 0, 900); sk.addColorStop(0, "#8fa3ac"); sk.addColorStop(1, "#d8d2bc"); g.fillStyle = sk; g.fillRect(0, 0, W, 900);
    firs(g, W, 760, 200, 31, "#4a5a50", t, 0, undefined);
    g.fillStyle = "#6f8a8e"; g.fillRect(0, 740, W, 260); g.strokeStyle = "rgba(230,240,240,0.45)"; g.lineWidth = 3; for (let i = 0; i < 9; i++) { const y = 760 + i * 26; g.beginPath(); for (let x = 0; x <= W; x += 30) { const yy = y + Math.sin(x * 0.02 + t * 1.2 + i) * 4; if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
    g.fillStyle = "#c9b48c"; g.beginPath(); g.moveTo(0, 980); g.quadraticCurveTo(540, 920, W, 990); g.lineTo(W, H); g.lineTo(0, H); g.fill(); hatchBox(g, 0, 950, W, H, 9, 0.05, 1.2, "rgba(90,70,40,0.25)");
    bust(g, BOY, { lookX: 0.3, lookY: 0.9 }, t, 360, 900, 300, false, -1, "boy", "rgba(255,240,210,0.7)", "#a9a090");
    // his hands are out of frame: the sand flicks up where he digs
    for (let k = 0; k < 6; k++) { const ph = (u * 1.6 + k * 0.17) % 1; g.fillStyle = `rgba(180,150,100,${1 - ph})`; g.beginPath(); g.arc(700 + k * 20, 1640 - Math.sin(ph * Math.PI) * 160, 8, 0, 7); g.fill(); }
    g.fillStyle = "#a08a64"; g.beginPath(); g.ellipse(720, 1700, 190, 60, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    label(g, "1980", 900, 220, 70, since(u, 0.2, 0.4), "#2a1e18");
    g.restore(); vignette(g, 0.4);
  }
  if (u > cut) {
    g.save(); g.globalAlpha = since(u, cut, 0.3); zoom(g, 1.1 - (u - cut) * 0.02);
    g.fillStyle = "#b9a27a"; g.fillRect(0, 0, W, H); hatchBox(g, 0, 0, W, H, 7, 0.1, 1.2, "rgba(90,70,40,0.3)");
    const r = rng(3); for (let i = 0; i < 9; i++) { const a = since(u, cut + 0.2 + i * 0.12, 0.4); bill(g, 220 + r() * 640, 500 + r() * 900 + (1 - a) * 60, 340, (r() - 0.5) * 1.2, 0, 1, i); }
    g.fillStyle = "rgba(160,130,90,0.5)"; for (let i = 0; i < 80; i++) { g.beginPath(); g.arc(r() * W, r() * H, 2 + r() * 5, 0, 7); g.fill(); }
    g.restore(); vignette(g, 0.5);
  }
};

// 10. the rest of the cash: never found
const shRest: Draw = (g, t, u) => {
  g.save(); zoom(g, 1 + u * 0.04, W / 2, 900);
  nightSky(g, t, "#0e1418", "#2c3a3c");
  firs(g, W, 1250, 420, 41, "#131d19", t, 0.6); firs(g, W, 1700, 620, 42, "#0a110e", t, 0.6);
  const r = rng(5); for (let i = 0; i < 26; i++) { const k = (u * 0.25 + r()) % 1; const x = r() * W + Math.sin(t + i) * 60, y = lerp(200, 1500, k); g.save(); g.globalAlpha = 1 - k; bill(g, x, y, 120, t * 2 + i, Math.sin(t * 3 + i) * 1.3, 0.4, i); g.restore(); }
  g.fillStyle = "rgba(200,210,205,0.15)"; g.fillRect(0, 1100, W, 400);
  g.restore(); vignette(g, 0.75);
};

// 11. even the name is a mistake: a 1971 typewriter, DAN becomes D.B.
const shName: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.05 + u * 0.02, W / 2, 900);
  g.fillStyle = "#3a3330"; g.fillRect(0, 0, W, H); glow(g, 540, 600, 900, 0.7);
  g.fillStyle = "#e9e2cf"; g.fillRect(140, 260, 800, 900); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(140, 260, 800, 900);
  g.strokeStyle = "rgba(40,30,30,0.3)"; g.lineWidth = 2; for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(200, 700 + k * 30); g.lineTo(880 - (k % 4) * 60, 700 + k * 30); g.stroke(); }
  const tDan = rel(11, "Dan") - 0.1, tDB = rel(11, "DB") - 0.6 > 0 ? rel(11, "DB") - 0.6 : rel(11, "reporters");
  g.font = `bold 92px "Courier 10 Pitch", "FreeMono", monospace`; g.textAlign = "left"; g.fillStyle = "#1c1a1e";
  const s1 = "DAN COOPER", n1 = Math.floor(clamp01((u - tDan) / 0.7) * s1.length); g.fillText(s1.slice(0, n1), 220, 420);
  const x0 = since(u, tDB, 0.3); if (x0 > 0) { g.strokeStyle = "#a3241c"; g.lineWidth = 9; g.beginPath(); g.moveTo(210, 395); g.lineTo(210 + 210 * x0, 395); g.stroke(); }
  const s2 = "D. B. COOPER", n2 = Math.floor(clamp01((u - tDB - 0.35) / 0.7) * s2.length); g.fillStyle = "#a3241c"; g.fillText(s2.slice(0, n2), 220, 560);
  // the typewriter carriage
  g.fillStyle = "#2a2c30"; g.fillRect(60, 1180, 960, 600); hatchBox(g, 60, 1180, 1020, 1780, 7, 0.2, 1.2, "rgba(255,255,255,0.06)"); g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(60, 1180, 960, 600);
  g.fillStyle = "#1a1b1e"; g.fillRect(100, 1140, 880, 70); g.strokeRect(100, 1140, 880, 70);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) { const press = ((Math.floor(t * 12) + k * 7 + r * 3) % 23 === 0) ? 6 : 0; g.fillStyle = "#ddd6c4"; g.beginPath(); g.arc(170 + k * 82 + r * 30, 1360 + r * 120 + press, 30, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); }
  g.restore(); vignette(g, 0.6);
};

// 12. 2016: the FBI shelves the active hunt
const shFile: Draw = (g, t, u) => {
  g.save(); zoom(g, 1.08 - u * 0.02, W / 2, 900);
  g.fillStyle = "#4a3a2c"; g.fillRect(0, 0, W, H); hatchBox(g, 0, 0, W, H, 9, 0.05, 1.2, "rgba(0,0,0,0.25)"); glow(g, 700, 600, 900, 0.6);
  g.save(); g.translate(540, 900); g.rotate(-0.05);
  g.fillStyle = "#c9a86a"; g.beginPath(); g.moveTo(-380, -480); g.lineTo(-120, -480); g.lineTo(-90, -530); g.lineTo(120, -530); g.lineTo(150, -480); g.lineTo(380, -480); g.lineTo(380, 520); g.lineTo(-380, 520); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 5; g.stroke();
  hatchBox(g, -380, -480, 380, 520, 8, 0.6, 1, "rgba(90,60,20,0.25)");
  label(g, "NORJAK", 0, -330, 88, 1, "#2a1e18", "center", "Courier 10 Pitch", "700");
  label(g, "CASE FILE  1971", 0, -220, 40, 1, "#2a1e18", "center", "Courier 10 Pitch", "700");
  g.restore();
  const a = since(u, rel(12, "gave") - 0.1, 0.2);
  if (a > 0) { g.save(); g.translate(540, 1040); g.rotate(-0.2); g.scale(1.5 - a * 0.5, 1.5 - a * 0.5); g.globalAlpha = a; g.strokeStyle = "#b02a20"; g.lineWidth = 12; g.strokeRect(-330, -95, 660, 190); label(g, "INACTIVE  2016", 0, 4, 76, 1, "#c8342a", "center", "Courier 10 Pitch", "700"); g.restore(); }
  g.restore(); vignette(g, 0.6);
};

// 13. did he die in those woods, or did he get away?
const shEnd: Draw = (g, t, u) => {
  g.save(); zoom(g, 1 + u * 0.035, W / 2, 1100);
  const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, "#3a4650"); sk.addColorStop(0.6, "#a8a898"); sk.addColorStop(1, "#5a6a60"); g.fillStyle = sk; g.fillRect(0, 0, W, H);
  firs(g, W, 1050, 500, 51, "#5a6a62", t, 0.3); firs(g, W, 1300, 700, 52, "#34443c", t, 0.3);
  // a lone figure with a briefcase walking away into the mist
  const k = u / 6, x = lerp(560, 640, k), y = lerp(1560, 1460, k), s = lerp(260, 200, k);
  g.save(); g.globalAlpha = 0.9 - k * 0.5; figure(g, MAN, (tt) => ({ walk: 0.8, phase: tt * 0.8, shR: 0.1 }), t, x, y, s, 1, "end", 70, "rgba(255,240,220,0.5)"); g.restore();
  const fog = g.createLinearGradient(0, 900, 0, H); fog.addColorStop(0, "rgba(210,214,205,0)"); fog.addColorStop(0.5, `rgba(210,214,205,${0.35 + k * 0.4})`); fog.addColorStop(1, "rgba(210,214,205,0.2)"); g.fillStyle = fog; g.fillRect(0, 900, W, 1100);
  g.restore();
  const end = DBC_TOTAL / FPS - 1.2, fa = clamp01((t - end) / 1.0);
  vignette(g, 0.6 + fa * 0.3); if (fa > 0) { g.fillStyle = `rgba(6,7,8,${fa})`; g.fillRect(0, 0, W, H); }
};

const DRAW: Draw[] = [shTicket, shCabin, shNote, shCase, shDemands, shSeattle, shStorm, shJump, shSearch, shRiver, shRest, shName, shFile, shEnd];

const XF = 0.3;
let _scr: { c: HTMLCanvasElement; g: Ctx } | null = null;
function scratch() { if (!_scr) { const c = document.createElement("canvas"); c.width = W; c.height = H; _scr = { c, g: c.getContext("2d")! }; } _scr.g.setTransform(1, 0, 0, 1, 0, 0); _scr.g.clearRect(0, 0, W, H); return _scr; }
function frame(g: Ctx, t: number) {
  const i = SHOTS.findIndex((s) => t >= s.a && t < s.b); const k = i < 0 ? SHOTS.length - 1 : i, S = SHOTS[k];
  g.save(); DRAW[k](g, t, t - S.a); g.restore();
  if (k > 0 && t - S.a < XF) { const P = SHOTS[k - 1]; const a = 1 - (t - S.a) / XF; const off = scratch(); off.g.save(); DRAW[k - 1](off.g, t, t - P.a); off.g.restore(); g.save(); g.globalAlpha = smooth(a); g.drawImage(off.c, 0, 0); g.restore(); }
  paperGrain(g, W, H, Math.floor(t * FPS), 0.8);
}
const Stage: React.FC<{ t: number }> = ({ t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); frame(g, t); });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};
export const DBCooper: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const on = { subs: true, audio: true, ...((getInputProps() as { post?: { subs?: boolean; audio?: boolean } }).post ?? {}) };
  return (
    <AbsoluteFill style={{ background: "#0a0c10" }}>
      <Stage t={t} />
      {on.subs && <Subtitles words={WORDS} style={subStyle} />}
      {withAudio && on.audio && <Audio src={staticFile("cooper/mix.wav")} />}
    </AbsoluteFill>
  );
};
void hatchIn; void lerp;
