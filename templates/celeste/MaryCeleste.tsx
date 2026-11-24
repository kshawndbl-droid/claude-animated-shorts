// "The Mary Celeste, 1872": a mystery told in the channel's "living engraving" look (templates/docu): flat watercolour
// washes, engraved hatching, tapered ink, lit busts with rim light, a 2D brigantine on engraved seas, paper grain.
// Every shot is drawn for this story only. Timings come from the narration's real word times.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Audio, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import { drawBust, Bust, BustAnim } from "../docu/portrait";
import { human, settleH, drawHuman, HLook, HPose, setLine } from "../docu/human";
import { litLayer, paperGrain } from "../docu/look";
import { sky, sea, fog, swellBand, brigantine, hatchBox, hatchIn, INK, PAL, rng } from "../docu/sea";
import lines from "../../stories/mary-celeste/lines.json";
import words from "../../stories/mary-celeste/words.json";

type Ctx = CanvasRenderingContext2D;
const W = 1080, H = 1920, FPS = 30;
const LINES = lines as { start: number; end: number; text: string }[];
const WORDS = words as Word[];
export const MC_TOTAL = Math.ceil((LINES[LINES.length - 1].end + 1.9) * FPS);
export const MC_KEYWORDS = ["mary", "celeste", "dei", "gratia", "azores", "genoa", "york", "seventeen", "hundred", "barrels", "alcohol", "ten", "briggs", "sarah", "sophia", "seven", "no", "one", "lifeboat", "nine", "four", "hundred", "miles", "three", "half", "feet", "pump", "fumes", "waterspout", "fake", "news", "arthur", "conan", "doyle", "never", "secret", "lowkey", "creepy", "two-year-old", "gone"];
const subStyle = defaultStyle("mystery", { keyWords: MC_KEYWORDS });

const LEAD = 0.25;
const SHOTS = LINES.map((l, i) => ({ i, a: i === 0 ? 0 : l.start - LEAD, b: i === LINES.length - 1 ? MC_TOTAL / FPS : LINES[i + 1].start - LEAD }));
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
function wt(li: number, word: string, n = 0) { const ws = WORDS.filter((w) => w.line === li && norm(w.w) === norm(word)); return ws[n]?.s ?? LINES[li].start; }
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const since = (t: number, t0: number, d = 0.4) => smooth((t - t0) / d);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- cast
const BRIGGS: Bust = { skin: "#dfb291", hair: "#3b2b22", coat: "#262c3a", shirt: "#ece4d4", tie: "#1c1c22", lapel: "#20252f", buttons: "#c8a24a", hairStyle: "side", beard: "full", moustache: "full", age: 0.45 };
const SARAH: Bust = { skin: "#ecc6a8", hair: "#3e2a1f", coat: "#4a3040", hairStyle: "center-bun", female: true, collar: "lace", age: 0.3, jaw: 1, nose: -0.6 };
const SOPHIA: Bust = { skin: "#f0cdb3", hair: "#6a4a30", coat: "#6b4a5a", hairStyle: "child", child: true, female: true, collar: "lace", age: 0, nose: -1 };
const DOYLE: Bust = { skin: "#e6bc9c", hair: "#5a3e2a", coat: "#2d2a2a", shirt: "#efe8da", tie: "#4a2026", lapel: "#262323", hairStyle: "swept", moustache: "walrus", age: 0.15, nose: 0.3, jaw: -0.5 };
const SAILOR: HLook = { skin: "#2a2224", hair: "#1a1416", hairStyle: "short", coat: "#1d1a1c", coatLen: "hip", pants: "#1a1719", boots: "#121012", hat: "seaman", hatCol: "#141113" };
const SAILOR2: HLook = { ...SAILOR, hat: "cap", beard: "short" };

// ---------------------------------------------------------------- helpers
function bust(g: Ctx, B: Bust, A: BustAnim, t: number, x: number, y: number, s: number, flip = false, key = -1, id = "b") {
  litLayer(g, W, H, (f) => { f.save(); f.translate(x, y); f.scale(flip ? -s : s, s); drawBust(f, B, A, t, s); f.restore(); },
    { box: [x - s * 1.2, y - s * 0.2, x + s * 1.2, Math.max(y + s * 2.7, H + 10)], key: flip ? -key : key, contour: 2, hatchAmt: 0, shadowAmt: 1.2, rim: "rgba(255,220,160,0.85)", cool: "#8e97ad" }, id);
}
function silhouette(g: Ctx, L: HLook, pose: (t: number) => HPose, t: number, x: number, y: number, k: number, dir = 1, id = "s", seed = 1, rim = "rgba(255,214,150,0.9)", hold?: (f: Ctx, hand: [number, number]) => void) {
  const p = human(L, seed); const st = settleH(p, pose, t, 0);
  setLine("rgba(0,0,0,0.6)");
  litLayer(g, W, H, (f) => {
    f.save(); f.translate(x, y); f.scale(k, -k); const r = drawHuman(f, p, st, t, "34", dir, -1, 1.2 / k);
    if (hold) { f.save(); if (dir < 0) f.scale(-1, 1); hold(f, r.handR as [number, number]); f.restore(); }
    f.restore();
  }, { box: [x - k, y - k * 2, x + k, y + 10], key: -dir, contour: 1.5, hatchAmt: 0, rim, cool: "#555" }, id);
}
function label(g: Ctx, text: string, x: number, y: number, size: number, a = 1, col = "#f1e8d2", align: CanvasTextAlign = "center", font = "Bitstream Charter") {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = `600 ${size}px "${font}", "Caladea", serif`; g.textAlign = align; g.textBaseline = "middle";
  g.letterSpacing = `${size * 0.12}px`; g.lineWidth = size * 0.16; g.strokeStyle = "rgba(20,14,16,0.85)"; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y); g.restore();
}
function vignette(g: Ctx, a = 0.6) { const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.5, H * 0.7); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(10,8,10,${a})`); g.fillStyle = v; g.fillRect(0, 0, W, H); }
function wood(g: Ctx, x: number, y: number, w: number, h: number, col = "#5a4030", seed = 1, horizontal = true) {
  g.fillStyle = col; g.fillRect(x, y, w, h); const r = rng(seed);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = "rgba(20,12,10,0.35)"; g.lineWidth = 1.4;
  for (let i = 0; i < (horizontal ? h : w) / 9; i++) { g.beginPath(); for (let j = 0; j <= 30; j++) { const u = j / 30; const a = (horizontal ? y : x) + i * 9 + Math.sin(u * 8 + i * 1.3 + r() * 0.2) * 2.5; if (horizontal) { if (j === 0) g.moveTo(x + u * w, a); else g.lineTo(x + u * w, a); } else { if (j === 0) g.moveTo(a, y + u * h); else g.lineTo(a, y + u * h); } } g.stroke(); }
  g.strokeStyle = "rgba(20,12,10,0.7)"; g.lineWidth = 2.5; const n = horizontal ? Math.floor(h / 70) : Math.floor(w / 110);
  for (let i = 1; i <= n; i++) { g.beginPath(); if (horizontal) { g.moveTo(x, y + i * 70); g.lineTo(x + w, y + i * 70); } else { g.moveTo(x + i * 110, y); g.lineTo(x + i * 110, y + h); } g.stroke(); }
  g.restore();
}
function lanternGlow(g: Ctx, x: number, y: number, r: number, a: number) { const lg = g.createRadialGradient(x, y, 0, x, y, r); lg.addColorStop(0, `rgba(255,196,110,${0.55 * a})`); lg.addColorStop(0.4, `rgba(255,170,80,${0.2 * a})`); lg.addColorStop(1, "rgba(255,170,80,0)"); g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = lg; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
function lantern(g: Ctx, x: number, y: number, s: number, swing: number, a = 1) {
  g.save(); g.translate(x, y); g.rotate(swing);
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -s * 2.4); g.lineTo(0, -s * 0.9); g.stroke();
  const body = new Path2D(); body.rect(-s * 0.45, -s * 0.8, s * 0.9, s * 1.2); g.fillStyle = `rgba(255,${190 + a * 30},${110 + a * 30},1)`; g.fill(body);
  g.strokeStyle = INK; g.lineWidth = 4; g.stroke(body); g.beginPath(); g.moveTo(0, -s * 0.8); g.lineTo(0, s * 0.4); g.stroke();
  g.fillStyle = "#2a2224"; g.beginPath(); g.moveTo(-s * 0.55, -s * 0.8); g.lineTo(0, -s * 1.1); g.lineTo(s * 0.55, -s * 0.8); g.fill(); g.fillRect(-s * 0.55, s * 0.4, s * 1.1, s * 0.15);
  g.restore(); lanternGlow(g, x + Math.sin(swing) * s * 2.4 * 0.0, y, s * 9, a);
}
function barrel(g: Ctx, x: number, y: number, w: number, h: number, seed = 1, shade = 0) {
  const p = new Path2D(); p.moveTo(x - w * 0.42, y - h / 2); p.quadraticCurveTo(x - w * 0.56, y, x - w * 0.42, y + h / 2); p.lineTo(x + w * 0.42, y + h / 2); p.quadraticCurveTo(x + w * 0.56, y, x + w * 0.42, y - h / 2); p.closePath();
  g.fillStyle = "#8a5f3a"; g.fill(p);
  hatchIn(g, p, [x - w, y - h, x + w, y + h], 5, 1.57, 1.1, "rgba(30,18,12,0.4)");
  g.save(); g.clip(p); const sg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); sg.addColorStop(0, `rgba(255,200,120,${0.35 - shade * 0.3})`); sg.addColorStop(0.5, "rgba(0,0,0,0)"); sg.addColorStop(1, `rgba(10,6,6,${0.45 + shade * 0.3})`); g.fillStyle = sg; g.fill(p); g.restore();
  g.strokeStyle = "#2e2a28"; g.lineWidth = Math.max(3, w * 0.05); for (const k of [-0.32, 0.32]) { g.beginPath(); g.moveTo(x - w * 0.5, y + h * k); g.quadraticCurveTo(x, y + h * k + 4, x + w * 0.5, y + h * k); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 3; g.stroke(p); void seed;
}

// ---------------------------------------------------------------- shots
type Shot = { draw: (g: Ctx, t: number, u: number) => void };

// 0. a ship drifting in the morning fog, nobody at the helm
const shDrift: Shot["draw"] = (g, t, u) => {
  const z = 1 + u * 0.025, Hz = 960;
  g.save(); g.translate(W / 2, H * 0.55); g.scale(z, z); g.translate(-W / 2, -H * 0.55);
  sky(g, W, Hz, t, { sun: [300, 820], clouds: 6, top: "#5f7378", low: "#cfcbb5" });
  sea(g, W, H, Hz, t, { glint: 0.7, top: "#6c8582", low: "#22383f" });
  fog(g, W, H, t, 1.2, 760, 1060);
  const sx = 620 - u * 9, sy = 1110 + Math.sin(t * 0.9) * 6;
  g.save(); g.translate(sx, sy); g.scale(17, 17); g.rotate(Math.sin(t * 0.8) * 0.035); brigantine(g, t, { torn: 1, sailsSet: 0.9 }); g.restore();
  swellBand(g, W, 1122, t, 300, "#22383f", 10);
  fog(g, W, H, t * 1.3 + 50, 0.7, 980, 1300);
  g.restore();
  vignette(g, 0.55);
};

// 1. the Dei Gratia's lookout spots her, then the view through his telescope
const shLookout: Shot["draw"] = (g, t, u) => {
  const cut = wt(1, "drifting") - LINES[1].start + 0.1;
  if (u < cut + 0.25) {
    const Hz = 1020;
    sky(g, W, Hz, t, { sun: [880, 900], clouds: 5, top: "#4e6268", low: "#d8cfb4" });
    sea(g, W, H, Hz, t, { glint: 0.9, top: "#7a8f88", low: "#2a3f45" });
    g.save(); g.translate(860, 1040); g.scale(4.2, 4.2); g.rotate(Math.sin(t) * 0.04); brigantine(g, t, { torn: 1 }); g.restore();
    fog(g, W, H, t, 0.8, 900, 1100);
    // the deck of the Dei Gratia in the foreground (rail + shrouds), rocking gently
    const roll = Math.sin(t * 0.9) * 0.02;
    g.save(); g.translate(W / 2, 1500); g.rotate(roll); g.translate(-W / 2, -1500);
    wood(g, -100, 1460, W + 200, 600, "#4a3426", 3, false);
    g.fillStyle = "#3a2a20"; g.fillRect(-100, 1380, W + 200, 60); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(-100, 1380, W + 200, 60);
    g.strokeStyle = "rgba(20,16,18,0.9)"; g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(40 + k * 34, 1380); g.lineTo(260, -40); g.stroke(); }
    const look = (tt: number): HPose => ({ shR: 1.55, elR: 1.9, shL: 1.2, elL: 1.6, lean: -0.05, neck: 0.05, turn: 0.3 });
    silhouette(g, SAILOR, look, t, 420, 1440, 330, 1, "look", 4, "rgba(255,214,150,0.95)", (f, h) => {
      f.save(); f.translate(h[0], h[1]); f.rotate(0.12); f.fillStyle = "#2b2326"; f.strokeStyle = "#000"; f.lineWidth = 1 / 330;
      f.fillRect(-0.05, -0.025, 0.55, 0.05); f.fillStyle = "#c9a24a"; f.fillRect(0.2, -0.03, 0.04, 0.06); f.fillRect(0.46, -0.032, 0.05, 0.064); f.restore();
    });
    g.restore();
    vignette(g, 0.5);
  }
  if (u > cut) {
    const a = since(u, cut, 0.3);
    g.save(); g.globalAlpha = a;
    g.fillStyle = "#0c0a0b"; g.fillRect(0, 0, W, H);
    const cx = W / 2 + Math.sin(t * 2.1) * 10, cy = 900 + Math.cos(t * 1.7) * 8, R = 470;
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
    sky(g, W, 980, t, { sun: [800, 700], clouds: 4, top: "#7a8a88", low: "#ddd2b6" }); sea(g, W, H, 980, t * 1.2, { glint: 0.8, top: "#7a8f88", low: "#2a3f45" });
    g.save(); g.translate(cx - 30, 1020); g.scale(15, 15); g.rotate(Math.sin(t * 1.1) * 0.04); brigantine(g, t, { torn: 1, sailsSet: 0.8 }); g.restore();
    swellBand(g, W, 1036, t, 400, "#2a3f45", 9);
    const lens = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, R); lens.addColorStop(0, "rgba(0,0,0,0)"); lens.addColorStop(1, "rgba(0,0,0,0.75)"); g.fillStyle = lens; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    g.restore();
    g.strokeStyle = "#2a2224"; g.lineWidth = 26; g.beginPath(); g.arc(cx, cy, R + 12, 0, 7); g.stroke(); g.strokeStyle = "#b8923e"; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R + 26, 0, 7); g.stroke();
    g.restore();
  }
};

// 2. a sea chart: New York to Genoa, then the cargo of alcohol in the hold
function chart(g: Ctx, t: number, prog: number, o: { route?: boolean; azores?: number; last?: number; drift?: number } = {}) {
  g.fillStyle = "#e3d5b4"; g.fillRect(0, 0, W, H);
  const r = rng(5); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,90,50,${r() * 0.06})`; g.beginPath(); g.ellipse(r() * W, r() * H, 60 + r() * 200, 40 + r() * 120, r() * 3, 0, 7); g.fill(); }
  // sea hatching near the coasts and a grid of meridians
  g.strokeStyle = "rgba(60,50,40,0.25)"; g.lineWidth = 1.5; for (let x = 60; x < W; x += 160) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 80; y < H; y += 160) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const land = (pts: number[][]) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
  const am = land([[-50, 300], [120, 360], [160, 520], [110, 640], [150, 720], [90, 840], [130, 1000], [60, 1200], [-50, 1260]]);
  const eu = land([[1130, 200], [960, 330], [900, 470], [940, 560], [880, 700], [905, 820], [960, 900], [930, 1040], [1000, 1200], [980, 1400], [1130, 1500]]);
  for (const p of [am, eu]) { g.fillStyle = "#cdb98f"; g.fill(p); hatchIn(g, p, [-60, 150, 1140, 1520], 7, 0.7, 1.2, "rgba(70,50,30,0.35)"); g.strokeStyle = "#3a2a20"; g.lineWidth = 3.5; g.stroke(p); g.save(); g.strokeStyle = "rgba(58,42,32,0.35)"; g.lineWidth = 1.2; for (let k = 1; k <= 4; k++) { g.save(); g.translate(0, 0); g.setLineDash([2, 6]); g.lineWidth = 1.4; g.translate(k * 4 * (p === am ? 1 : -1), 0); g.stroke(p); g.restore(); } g.restore(); }
  // the Mediterranean opening at Gibraltar
  g.fillStyle = "#e3d5b4"; g.fillRect(930, 860, 200, 60);
  const NY = [140, 620], AZ = [560, 900], GE = [1040, 700], FOUND = [790, 860];
  label(g, "NEW YORK", NY[0] + 20, NY[1] - 50, 30, 1, "#2a1e18", "left");
  label(g, "GENOA", GE[0] - 10, GE[1] - 44, 30, 1, "#2a1e18", "right");
  // Azores islands
  const az = o.azores ?? 1; for (const [dx, dy, s] of [[0, 0, 12], [30, -18, 8], [-40, 16, 7], [70, 22, 9], [100, 40, 6]]) { g.fillStyle = "#cdb98f"; g.beginPath(); g.ellipse(AZ[0] + dx, AZ[1] + dy, s * 1.6, s, 0.3, 0, 7); g.fill(); g.strokeStyle = "#3a2a20"; g.lineWidth = 2.5; g.stroke(); }
  label(g, "AZORES", AZ[0] + 20, AZ[1] + 70, 28, az, "#2a1e18");
  // compass rose
  g.save(); g.translate(300, 1350); g.rotate(t * 0.02); g.strokeStyle = "#3a2a20"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 90, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 70, 0, 7); g.stroke();
  for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.fillStyle = k % 2 ? "#3a2a20" : "#7a2b25"; g.beginPath(); g.moveTo(0, -(k % 2 ? 60 : 110)); g.lineTo(10, 0); g.lineTo(-10, 0); g.fill(); } g.restore();
  if (o.route !== false) {
    const path = (k: number) => { const a = clamp01(k); const c = [560, 560]; const x = (1 - a) * (1 - a) * NY[0] + 2 * (1 - a) * a * c[0] + a * a * GE[0], y = (1 - a) * (1 - a) * NY[1] + 2 * (1 - a) * a * c[1] + a * a * GE[1]; return [x, y]; };
    g.save(); g.setLineDash([14, 12]); g.strokeStyle = "#7a2b25"; g.lineWidth = 5; g.beginPath(); for (let k = 0; k <= 60; k++) { const q = path((k / 60) * prog); if (k === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); } g.stroke(); g.restore();
    const q = path(prog), q2 = path(prog + 0.01), ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]);
    g.save(); g.translate(q[0], q[1] - 6); g.scale(2.0, 2.0); g.rotate(ang * 0.15); brigantine(g, t, { flag: false }); g.restore();
  }
  if (o.last !== undefined) {
    const SM = [AZ[0] + 100, AZ[1] + 40];
    const pr = o.last; g.fillStyle = "#7a2b25"; g.beginPath(); g.arc(SM[0], SM[1], 12, 0, 7); g.fill();
    label(g, "25 NOV", SM[0] + 40, SM[1] + 95, 30, since(pr, 0, 0.2), "#7a2b25");
    g.save(); g.setLineDash([6, 12]); g.strokeStyle = "#2a1e18"; g.lineWidth = 4; g.beginPath(); g.moveTo(SM[0], SM[1]); const e = smooth(pr); g.lineTo(lerp(SM[0], FOUND[0], e), lerp(SM[1], FOUND[1], e)); g.stroke(); g.restore();
    if (pr > 0.95) { g.fillStyle = "#2a1e18"; g.beginPath(); g.arc(FOUND[0], FOUND[1], 12, 0, 7); g.fill(); label(g, "4 DEC", FOUND[0] + 10, FOUND[1] - 46, 30, since(pr, 0.95, 0.1), "#2a1e18"); }
    const p = [lerp(SM[0], FOUND[0], e), lerp(SM[1], FOUND[1], e)]; g.save(); g.globalAlpha = 0.85; g.translate(p[0], p[1] - 8); g.scale(2.4, 2.4); brigantine(g, t, { torn: 1, flag: false }); g.restore();
  }
  void o.drift;
}
function hold(g: Ctx, t: number, u: number, water = 0, o: { rod?: number; fumes?: number } = {}) {
  // the cargo hold in section: beams, rows of barrels, a lantern swinging from a beam
  g.fillStyle = "#2a1f1a"; g.fillRect(0, 0, W, H);
  wood(g, 0, 0, W, 360, "#3a2a20", 9);
  for (const x of [120, 540, 960]) { g.fillStyle = "#4a3426"; g.fillRect(x - 30, 300, 60, 1500); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(x - 30, 300, 60, 1500); hatchBox(g, x - 30, 300, x + 30, 1800, 6, 1.57, 1.2, "rgba(0,0,0,0.25)"); }
  const sw = Math.sin(t * 1.1) * 0.12;
  for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) {
    const x = 90 + i * 180 + (row % 2) * 90 - 45, y = 720 + row * 250, w = 170, h = 230;
    barrel(g, x, y, w, h, row * 10 + i, row * 0.15);
  }
  lantern(g, 540 + Math.sin(sw) * 120, 470, 34, sw, 1);
  if (water > 0) {
    const wy = 1720 - water * 320;
    const p = new Path2D(); p.moveTo(-20, H); for (let x = -20; x <= W + 20; x += 20) p.lineTo(x, wy + Math.sin(x * 0.01 + t * 2) * 10 + Math.sin(t * 1.1) * (x - W / 2) * 0.02); p.lineTo(W + 20, H); p.closePath();
    g.fillStyle = "rgba(40,70,80,0.78)"; g.fill(p); hatchIn(g, p, [0, wy - 20, W, H], 10, 0.02, 1.4, "rgba(200,230,230,0.25)");
    g.strokeStyle = "rgba(220,235,235,0.8)"; g.lineWidth = 3; g.beginPath(); for (let x = -20; x <= W + 20; x += 20) { const yy = wy + Math.sin(x * 0.01 + t * 2) * 10 + Math.sin(t * 1.1) * (x - W / 2) * 0.02; if (x === -20) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke();
  }
  if (o.rod !== undefined) {
    // the sounding rod being lowered, with depth marks
    const ry = lerp(300, 1720 - 320 * water - 0, smooth(o.rod)) ;
    g.fillStyle = "#c9b48a"; g.fillRect(820, 300, 16, ry - 300 + 330); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(820, 300, 16, ry - 300 + 330);
    for (let k = 0; k < 8; k++) { g.fillStyle = INK; g.fillRect(816, ry + 330 - k * 80, 24, 4); }
  }
  if (o.fumes) for (let k = 0; k < 7; k++) { const x = 140 + k * 140, a = o.fumes * (0.4 + 0.3 * Math.sin(t * 2 + k)); g.strokeStyle = `rgba(190,210,170,${a})`; g.lineWidth = 10; g.beginPath(); for (let j = 0; j <= 20; j++) { const yy = 700 - j * 25 - ((t * 60 + k * 40) % 120); const xx = x + Math.sin(j * 0.6 + t * 2 + k) * 30; if (j === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.stroke(); }
  vignette(g, 0.75);
}
const shChart: Shot["draw"] = (g, t, u) => {
  const s0 = LINES[2].start - SHOTS[2].a, cut = wt(2, "seventeen") - LINES[2].start + s0 - 0.15;
  if (u < cut + 0.3) { const z = 1 + u * 0.02; g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2); chart(g, t, smooth((u - 0.2) / Math.max(1, cut - 0.2)) * 0.95); g.restore(); vignette(g, 0.45); }
  if (u > cut) { g.save(); g.globalAlpha = since(u, cut, 0.3); const z = 1.18 - (u - cut) * 0.04; g.translate(W / 2 + (u - cut) * 18, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2); hold(g, t, u); g.restore(); }
};

// 3. who was aboard: three portraits, then seven crew
function cameo(g: Ctx, B: Bust, A: BustAnim, t: number, cx: number, cy: number, rw: number, rh: number, a: number, name: string, id: string, s: number, by: number) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * 60);
  // a brass-framed oval with a dark backing
  g.save(); g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, 0, 7); g.clip();
  const bg = g.createRadialGradient(cx - rw * 0.3, cy - rh * 0.3, 0, cx, cy, rh * 1.2); bg.addColorStop(0, "#8d8a7a"); bg.addColorStop(1, "#2c2a28"); g.fillStyle = bg; g.fillRect(cx - rw, cy - rh, rw * 2, rh * 2);
  bust(g, B, A, t, cx - s * 0.05, cy - rh * by, s, false, -1, id);
  g.restore();
  g.strokeStyle = "#b8923e"; g.lineWidth = 16; g.beginPath(); g.ellipse(cx, cy, rw + 8, rh + 8, 0, 0, 7); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(cx, cy, rw + 16, rh + 16, 0, 0, 7); g.stroke();
  g.restore();
  label(g, name, cx, cy + rh + 52, 30, a);
}
const shFamily: Shot["draw"] = (g, t, u) => {
  wood(g, 0, 0, W, H, "#3b2a22", 21, false); vignette(g, 0.7);
  const tb = wt(3, "Benjamin"), ts = wt(3, "Sarah"), tp = wt(3, "Sophia"), tc = wt(3, "seven");
  const ab = since(t, LINES[3].start - 0.1, 0.6), as = since(t, ts - 0.35, 0.5), ap = since(t, tp - 0.35, 0.5), ac = since(t, tc - 0.3, 0.5);
  const lift = ac * 120;
  g.save(); g.translate(0, -lift);
  cameo(g, BRIGGS, { lookX: 0.5, brow: 0.1 }, t, W / 2, 430, 240, 290, ab, "CAPT. BENJAMIN BRIGGS", "bb", 330, 0.82);
  cameo(g, SARAH, { lookX: 0.3 }, t, 285, 1050, 170, 200, as, "SARAH", "bs", 250, 0.84);
  cameo(g, SOPHIA, { lookX: 0.6 }, t, 795, 1050, 170, 200, ap, "SOPHIA, 2", "bp", 230, 0.86);
  g.restore();
  // the seven crew as a row of small silhouettes against a lantern glow
  if (ac > 0) {
    g.save(); g.globalAlpha = ac; lanternGlow(g, W / 2, 1560, 700, 0.8);
    for (let i = 0; i < 7; i++) { const x = 150 + i * 130, k = 170; silhouette(g, i % 2 ? SAILOR2 : SAILOR, () => ({ shR: 0.05, shL: -0.05, turn: (i - 3) * 0.1 }), t, x, 1700 + (i % 2) * 12, k, i < 3 ? 1 : -1, "c" + i, 30 + i, "rgba(255,200,130,0.9)"); }
    g.restore();
  }
};

// 4. aboard: an empty deck
function deck(g: Ctx, t: number, u: number, o: { boarders?: number; door?: number } = {}) {
  const roll = Math.sin(t * 0.8) * 0.03, Hz = 760;
  g.save(); g.translate(W / 2, H * 0.6); g.rotate(roll); g.translate(-W / 2, -H * 0.6);
  sky(g, W, Hz + 400, t, { top: "#56676c", low: "#cfc8b2", clouds: 4 });
  sea(g, W, H, Hz + 300, t, { top: "#7a8f88", low: "#2a3f45" });
  // deck planks in perspective toward the bow
  const vx = W / 2, vy = 820;
  const dk = new Path2D(); dk.moveTo(-200, H + 50); dk.lineTo(vx - 120, vy + 120); dk.lineTo(vx + 120, vy + 120); dk.lineTo(W + 200, H + 50); dk.closePath();
  g.fillStyle = "#a88a62"; g.fill(dk);
  g.save(); g.clip(dk); g.strokeStyle = "rgba(40,26,18,0.55)"; g.lineWidth = 2; for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(vx + k * 10, vy + 120); g.lineTo(vx + k * 120, H + 50); g.stroke(); }
  for (let k = 0; k < 14; k++) { const y = vy + 120 + Math.pow(k / 14, 2) * (H - vy); g.strokeStyle = "rgba(40,26,18,0.25)"; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const sh = g.createLinearGradient(0, vy, 0, H); sh.addColorStop(0, "rgba(40,30,30,0.5)"); sh.addColorStop(1, "rgba(40,30,30,0)"); g.fillStyle = sh; g.fill(dk); g.restore();
  // bulwarks left and right
  for (const s of [-1, 1]) { const bw = new Path2D(); const x0 = s < 0 ? -200 : W + 200; bw.moveTo(x0, H + 50); bw.lineTo(vx + s * 120, vy + 120); bw.lineTo(vx + s * 120, vy + 60); bw.lineTo(x0, H - 380); bw.closePath(); g.fillStyle = "#5a4030"; g.fill(bw); hatchIn(g, bw, [0, vy, W, H], 9, s * 0.5, 1.3, "rgba(0,0,0,0.35)"); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(bw); }
  // masts rising out of frame, loose ropes swinging
  for (const [mx, my, mw] of [[vx - 30, vy + 230, 40], [vx + 10, vy + 125, 22]]) { g.fillStyle = "#6a4a32"; g.fillRect(mx - mw / 2, -100, mw, my + 100); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(mx - mw / 2, -100, mw, my + 100); hatchBox(g, mx, -100, mx + mw / 2, my, 5, 1.57, 1.2, "rgba(0,0,0,0.3)"); }
  g.strokeStyle = INK; g.lineWidth = 3;
  for (let k = 0; k < 4; k++) { const ax = vx - 30 + (k - 1.5) * 8, ay = 200 + k * 90, sw = Math.sin(t * 1.4 + k) * 60; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(ax + 80 + sw, ay + 300, ax + 140 + sw * 1.5, ay + 520 + k * 30); g.stroke(); }
  // deckhouse door, ajar, swinging with the roll
  const dx = 150, dy = 1040, door = (o.door ?? 0.4) + Math.sin(t * 0.8) * 0.15;
  g.fillStyle = "#cfc2a5"; g.fillRect(dx - 160, dy - 380, 330, 500); hatchBox(g, dx - 160, dy - 380, dx + 170, dy + 120, 8, 1.57, 1.2, "rgba(29,23,25,0.3)"); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(dx - 160, dy - 380, 330, 500);
  g.fillStyle = "#120e0e"; g.fillRect(dx - 40, dy - 260, 140, 380);
  g.save(); g.translate(dx - 40, dy - 260); g.scale(Math.cos(door * 1.3), 1); g.fillStyle = "#8a6a48"; g.fillRect(0, 0, 140, 380); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(0, 0, 140, 380); g.restore();
  if (o.boarders) { const a = o.boarders; g.save(); g.globalAlpha = a;
    silhouette(g, SAILOR2, (tt) => ({ shR: 0.3, elR: 0.4, turn: Math.sin(tt * 0.7) * 0.6, walk: 0 }), t, 640, 1060, 150, -1, "bd1", 12);
    silhouette(g, SAILOR, (tt) => ({ shL: 0.2, turn: -0.3 + Math.sin(tt * 0.5) * 0.4 }), t, 780, 1010, 120, -1, "bd2", 13);
    g.restore(); }
  g.restore();
  fog(g, W, H, t, 0.5, 500, 1100);
  vignette(g, 0.6);
}
const shEmpty: Shot["draw"] = (g, t, u) => { const z = 1.04 + u * 0.03; g.save(); g.translate(W / 2, H * 0.55); g.scale(z, z); g.translate(-W / 2, -H * 0.55); deck(g, t, u, { boarders: 1 }); g.restore(); };

// 5. the cabin: everything still in its place
function cabin(g: Ctx, t: number, u: number, creep = 0) {
  const roll = Math.sin(t * 0.8) * 0.025;
  g.save(); g.translate(W / 2, H / 2); g.rotate(roll); g.translate(-W / 2, -H / 2);
  wood(g, -100, -100, W + 200, 1250, "#4a3428", 31, false);
  wood(g, -100, 1150, W + 200, 900, "#6a4a34", 32, true);
  // porthole with grey daylight
  g.save(); g.beginPath(); g.arc(780, 520, 110, 0, 7); g.clip(); sky(g, W, 580, t, { top: "#8a9a9a", low: "#d0cdb8", clouds: 0 }); sea(g, W, H, 580, t, { top: "#7a8f88", low: "#2a3f45" }); g.restore();
  g.strokeStyle = "#b8923e"; g.lineWidth = 24; g.beginPath(); g.arc(780, 520, 120, 0, 7); g.stroke(); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.arc(780, 520, 132, 0, 7); g.stroke();
  const shaft = g.createLinearGradient(780, 520, 400, 1500); shaft.addColorStop(0, "rgba(220,225,215,0.25)"); shaft.addColorStop(1, "rgba(220,225,215,0)"); g.fillStyle = shaft; g.beginPath(); g.moveTo(690, 460); g.lineTo(870, 600); g.lineTo(600, 1600); g.lineTo(150, 1500); g.fill();
  // a coat on a hook, a framed picture
  { const p = new Path2D(); p.moveTo(240, 380); p.quadraticCurveTo(140, 520, 160, 900); p.lineTo(330, 900); p.quadraticCurveTo(340, 520, 240, 380); p.closePath();
    g.fillStyle = "#2a2f3a"; g.fill(p); hatchIn(g, p, [140, 380, 340, 900], 7, 1.3, 1.2, "rgba(0,0,0,0.35)"); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(p);
    g.fillStyle = "#b8923e"; g.beginPath(); g.arc(240, 372, 12, 0, 7); g.fill(); g.stroke(); }
  // the table with plates, bread, a jug, cups
  const ty = 1180;
  g.fillStyle = "#7a5638"; g.fillRect(90, ty, 900, 50); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(90, ty, 900, 50); g.fillRect(140, ty + 50, 40, 450); g.fillRect(900, ty + 50, 40, 450);
  g.fillStyle = "#5a3e2a"; g.fillRect(140, ty + 50, 40, 450); g.fillRect(900, ty + 50, 40, 450); g.strokeRect(140, ty + 50, 40, 450); g.strokeRect(900, ty + 50, 40, 450);
  const items: [number, string][] = [[240, "plate"], [430, "jug"], [600, "plate"], [780, "cup"], [880, "bread"]];
  for (const [x, k] of items) {
    if (k === "plate") { g.fillStyle = "#e9e1cf"; g.beginPath(); g.ellipse(x, ty - 6, 80, 18, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(x, ty - 8, 50, 10, 0, 0, 7); g.stroke(); }
    if (k === "jug") { const p = new Path2D(); p.moveTo(x - 40, ty); p.quadraticCurveTo(x - 60, ty - 80, x - 30, ty - 150); p.lineTo(x + 30, ty - 150); p.quadraticCurveTo(x + 60, ty - 80, x + 40, ty); p.closePath(); g.fillStyle = "#d8d0bc"; g.fill(p); hatchIn(g, p, [x - 60, ty - 150, x + 60, ty], 6, 1.57, 1.2, "rgba(0,0,0,0.3)"); g.stroke(p); g.beginPath(); g.arc(x + 50, ty - 90, 28, -1.4, 1.4); g.stroke(); }
    if (k === "cup") { g.fillStyle = "#d8d0bc"; g.fillRect(x - 28, ty - 60, 56, 60); g.strokeRect(x - 28, ty - 60, 56, 60); }
    if (k === "bread") { g.fillStyle = "#c08a4a"; g.beginPath(); g.ellipse(x, ty - 30, 60, 32, 0, Math.PI, 0); g.fill(); g.stroke(); }
  }
  // a chair that slides a little as she rolls (creepy)
  const cx = 360 + Math.sin(t * 0.8) * 40 * creep + creep * 40;
  g.fillStyle = "#5a3e2a"; g.strokeStyle = INK; g.lineWidth = 4;
  g.fillRect(cx - 80, ty + 120, 170, 30); g.strokeRect(cx - 80, ty + 120, 170, 30); g.fillRect(cx - 80, ty - 200, 26, 600); g.strokeRect(cx - 80, ty - 200, 26, 600); g.fillRect(cx + 64, ty + 150, 26, 250); g.strokeRect(cx + 64, ty + 150, 26, 250);
  // sea chests on the floor
  for (const [x, w] of [[90, 260], [700, 300]]) { const y = 1640; g.fillStyle = "#6a4024"; g.fillRect(x, y, w, 170); hatchBox(g, x, y, x + w, y + 170, 7, 0.3, 1.2, "rgba(0,0,0,0.3)"); g.strokeRect(x, y, w, 170); g.fillStyle = "#b8923e"; g.fillRect(x + w / 2 - 16, y + 20, 32, 40); g.strokeRect(x + w / 2 - 16, y + 20, 32, 40); }
  lantern(g, 560, 300, 34, Math.sin(t * 0.8) * 0.25, 0.8);
  g.restore();
  vignette(g, 0.65);
}
const shCabin: Shot["draw"] = (g, t, u) => { const z = 1.16 - u * 0.025, px = -60 + u * 22; g.save(); g.translate(W / 2 + px, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2); cabin(g, t, u, since(t, wt(5, "Lowkey") - 0.3, 0.6)); g.restore(); };

// 6. the lifeboat is gone; the captain's papers and instruments too
function chocks(g: Ctx, t: number, u: number) {
  g.fillStyle = "#a88a62"; g.fillRect(0, 0, W, H);
  wood(g, 0, 0, W, H, "#a88a62", 41, true);
  // the main hatch with two empty cradles and cut lashings
  g.fillStyle = "#6a4a32"; g.fillRect(140, 640, 800, 640); g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(140, 640, 800, 640); hatchBox(g, 140, 640, 940, 1280, 9, 0.6, 1.3, "rgba(0,0,0,0.3)");
  for (const y of [760, 1160]) { const c = new Path2D(); c.moveTo(180, y); c.quadraticCurveTo(540, y + 120, 900, y); c.lineTo(900, y + 50); c.quadraticCurveTo(540, y + 170, 180, y + 50); c.closePath(); g.fillStyle = "#8a6a48"; g.fill(c); g.stroke(c); }
  // the outline where the boat sat (paler wood, a dust ghost)
  g.save(); g.setLineDash([16, 14]); g.strokeStyle = "rgba(240,230,210,0.8)"; g.lineWidth = 5; g.beginPath(); g.ellipse(540, 960, 330, 250, 0, 0, 7); g.stroke(); g.restore();
  // loose ropes hanging from the cradles, frayed ends
  for (const [x, y, k] of [[260, 800, 0], [820, 800, 1], [300, 1200, 2], [780, 1210, 3]] as number[][]) {
    const sw = Math.sin(t * 1.3 + k) * 20; g.strokeStyle = "#d8c6a0"; g.lineWidth = 10; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 60 + sw, y + 120, x + 30 + sw * 1.5, y + 260); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(x + 30 + sw * 1.5, y + 260); g.lineTo(x + 30 + sw * 1.5 + (j - 1.5) * 10, y + 290); g.stroke(); }
  }
  vignette(g, 0.55);
}
function desk(g: Ctx, t: number, u: number) {
  wood(g, 0, 0, W, H, "#5a3a26", 51, true);
  // open logbook-sized gap, ink well, a candle, dust outlines of the missing sextant and chronometer
  g.fillStyle = "#e3d5b4"; g.save(); g.translate(330, 640); g.rotate(-0.08); g.fillRect(-200, -150, 400, 300); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-200, -150, 400, 300);
  g.strokeStyle = "rgba(60,40,30,0.5)"; g.lineWidth = 2; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(-170, -110 + k * 32); g.lineTo(170 - (k % 3) * 40, -110 + k * 32); g.stroke(); } g.restore();
  g.fillStyle = "#1a1416"; g.beginPath(); g.ellipse(800, 520, 60, 40, 0, 0, 7); g.fill(); g.fillStyle = "#3a2e2a"; g.fillRect(760, 430, 80, 90); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(760, 430, 80, 90);
  g.save(); g.translate(820, 360); g.rotate(-0.5); g.fillStyle = "#e9e1cf"; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-20, -120, 8, -240); g.quadraticCurveTo(30, -120, 10, 0); g.fill(); g.strokeStyle = INK; g.stroke(); g.restore();
  const a = 0.6 + 0.4 * Math.sin(t * 2);
  // the missing instruments: pale dust silhouettes, a dashed outline appearing
  g.save(); g.setLineDash([18, 12]); g.strokeStyle = `rgba(245,235,215,${0.75 * a + 0.2})`; g.lineWidth = 8;
  g.beginPath(); g.moveTo(330, 1120); g.lineTo(560, 1500); g.lineTo(100, 1500); g.closePath(); g.stroke(); g.beginPath(); g.arc(330, 1440, 220, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  g.strokeRect(650, 1150, 300, 300); g.beginPath(); g.arc(800, 1300, 110, 0, 7); g.stroke();
  g.restore();
  g.fillStyle = "rgba(240,230,210,0.12)"; g.fillRect(650, 1150, 300, 300);
  label(g, "SEXTANT", 330, 1580, 40, 1, "#efe2c4"); label(g, "CHRONOMETER", 800, 1520, 40, 1, "#efe2c4");
  vignette(g, 0.6);
}
const shGone: Shot["draw"] = (g, t, u) => {
  const cut = wt(6, "papers") - LINES[6].start + (LINES[6].start - SHOTS[6].a) - 0.15;
  if (u < cut + 0.3) { const z = 1.12 - u * 0.03; g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.rotate(Math.sin(t * 0.8) * 0.02); g.translate(-W / 2, -H / 2); chocks(g, t, u); g.restore(); }
  if (u > cut) { g.save(); g.globalAlpha = since(u, cut, 0.3); const z = 1 + (u - cut) * 0.03; g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2); desk(g, t, u); g.restore(); }
};

// 7. the last log entry, then 400 miles alone on the chart
function slate(g: Ctx, t: number, u: number) {
  wood(g, 0, 0, W, H, "#4a3426", 61, true);
  g.save(); g.translate(W / 2, 900); g.rotate(-0.05);
  g.fillStyle = "#7a5638"; g.fillRect(-430, -560, 860, 1120); g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(-430, -560, 860, 1120);
  g.fillStyle = "#2c3234"; g.fillRect(-380, -510, 760, 1020); hatchBox(g, -380, -510, 380, 510, 5, 0.3, 1, "rgba(255,255,255,0.04)");
  const txt = ["Monday 25th.", "At 8, Eastern Point", "bore S.S.W.", "6 miles distant."];
  g.font = `italic 64px "FreeSerif", serif`; g.fillStyle = "rgba(235,232,220,0.9)"; g.textAlign = "left";
  const shown = (u - 0.3) * 18; let n = 0;
  for (let i = 0; i < txt.length; i++) { const s = txt[i]; const k = Math.max(0, Math.min(s.length, Math.floor(shown - n))); n += s.length; g.fillText(s.slice(0, k), -320, -330 + i * 130); }
  g.restore();
  label(g, "THE LAST ENTRY", W / 2, 240, 46, since(u, 0.2, 0.4), "#efe2c4");
  vignette(g, 0.6);
}
const shLog: Shot["draw"] = (g, t, u) => {
  const s0 = LINES[7].start - SHOTS[7].a, cut = wt(7, "ship") - LINES[7].start + s0 - 0.15;
  if (u < cut + 0.3) { const z = 1 + u * 0.03; g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2); slate(g, t, u); g.restore(); }
  if (u > cut) { g.save(); g.globalAlpha = since(u, cut, 0.3); const z = 1.25; g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-660, -880); chart(g, t, 0, { route: false, last: clamp01((u - cut - 0.3) / Math.max(1, SHOTS[7].b - SHOTS[7].a - cut - 1)) }); g.restore(); vignette(g, 0.45); }
};

// 8. water in the hold, measured
const shWater: Shot["draw"] = (g, t, u) => { const z = 1.02 + u * 0.01; g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2); const wl = since(u, 0.2, 2.2); hold(g, t, u, wl * 1.0, { rod: since(u, 0.5, 1.5) }); g.restore();
  // a depth gauge on the right
  const a = since(u, 1.2, 0.5); if (a > 0) { g.save(); g.globalAlpha = a; g.fillStyle = "#e3d5b4"; g.fillRect(900, 1060, 120, 700); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(900, 1060, 120, 700); for (let k = 0; k <= 5; k++) { const y = 1720 - k * 91; g.fillStyle = INK; g.fillRect(900, y, 40, 4); label(g, `${k}`, 975, y, 28, 1, "#2a1e18"); } g.fillStyle = "#7a2b25"; g.fillRect(900, 1720 - 3.5 * 91, 120, 8); label(g, "FT", 960, 1100, 26, 1, "#2a1e18"); g.restore(); }
};

// 9. why would he leave? the captain, then a tiny boat on a vast sea
const shWhy: Shot["draw"] = (g, t, u) => {
  const s0 = LINES[8].start - SHOTS[8].a, cut = wt(8, "tiny") - LINES[8].start + s0 - 0.2;
  if (u < cut + 0.3) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#2a3236"); bg.addColorStop(1, "#10151a"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    lanternGlow(g, 250, 700, 900, 0.9);
    const z = 1 + u * 0.03; g.save(); g.translate(W / 2, 900); g.scale(z, z); g.translate(-W / 2, -900);
    bust(g, { ...BRIGGS, hat: "captain", hatCol: "#1e2230" }, { lookX: 0.2, lookY: -0.8, brow: 0.4, sad: 0.5, tilt: -0.04 + Math.sin(t * 0.6) * 0.01, blink: ((t * 0.3) % 1) < 0.04 ? 1 : 0 }, t, 520, 520, 470, false, -1, "why");
    g.restore(); vignette(g, 0.7);
  }
  if (u > cut) {
    g.save(); g.globalAlpha = since(u, cut, 0.4);
    const up = (u - cut) * 0.04;
    g.fillStyle = "#1e3038"; g.fillRect(0, 0, W, H);
    // top-down ocean: engraved swell lines across the frame
    g.save(); g.translate(W / 2, H / 2); g.scale(1 - up, 1 - up); g.rotate(-0.3); g.translate(-W / 2, -H / 2);
    for (let i = -10; i < 70; i++) { const y = i * 40; g.strokeStyle = `rgba(160,190,190,${0.15 + 0.1 * Math.sin(i)})`; g.lineWidth = 2.5; g.beginPath(); for (let x = -400; x <= W + 400; x += 30) { const yy = y + Math.sin(x * 0.006 + t * 0.6 + i * 0.7) * 22; if (x === -400) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
    // the yawl with ten small figures
    g.save(); g.translate(W / 2, H / 2 + Math.sin(t) * 6); g.rotate(0.5 + Math.sin(t * 0.7) * 0.05);
    const b = new Path2D(); b.moveTo(-70, 0); b.quadraticCurveTo(-60, -26, 0, -28); b.quadraticCurveTo(70, -22, 80, 0); b.quadraticCurveTo(70, 22, 0, 28); b.quadraticCurveTo(-60, 26, -70, 0); b.closePath();
    g.fillStyle = "#e3d5b4"; g.fill(b); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(b); g.fillStyle = "#7a5638"; g.beginPath(); g.ellipse(0, 0, 60, 18, 0, 0, 7); g.fill();
    for (let k = 0; k < 10; k++) { const x = -48 + (k % 5) * 24, y = (k < 5 ? -8 : 8); g.fillStyle = "#1a1416"; g.beginPath(); g.arc(x, y, k === 4 ? 4 : 6.5, 0, 7); g.fill(); }
    g.strokeStyle = "rgba(220,235,235,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(-80, -10); g.quadraticCurveTo(-180, -20 + Math.sin(t * 2) * 6, -280, -40); g.moveTo(-80, 10); g.quadraticCurveTo(-180, 20, -280, 40); g.stroke();
    g.restore(); g.restore();
    vignette(g, 0.8); g.restore();
  }
};

// 10. the theories: the pump, the fumes, a waterspout
const shTheory: Shot["draw"] = (g, t, u) => {
  const s0 = LINES[9].start - SHOTS[9].a, c1 = wt(9, "Maybe", 1) - LINES[9].start + s0 - 0.15, c2 = wt(9, "waterspout") - LINES[9].start + s0 - 0.6;
  const mark = (n: string, a: number) => { if (a <= 0) return; g.save(); g.globalAlpha = a; g.fillStyle = "rgba(227,213,180,0.92)"; g.beginPath(); g.arc(120, 220, 64, 0, 7); g.fill(); g.strokeStyle = "#7a2b25"; g.lineWidth = 6; g.stroke(); g.restore(); label(g, n, 120, 222, 54, a, "#7a2b25"); };
  if (u < c1 + 0.3) {
    // I. the pump: the sounding rod comes up showing a lot of water
    hold(g, t, u, 0.35 + since(u, 0.5, 1.6) * 0.75, { rod: 1 });
    silhouette(g, SAILOR2, (tt) => ({ shR: 1.1, elR: 0.6, shL: 1.0, elL: 0.7, lean: 0.25, neck: 0.25, turn: 0.4 }), t, 650, 1420, 360, 1, "pump", 7, "rgba(255,200,120,0.9)");
    mark("I", since(u, 0.1, 0.3));
  }
  if (u > c1 && u < c2 + 0.3) { g.save(); g.globalAlpha = since(u, c1, 0.3); hold(g, t, u, 0.2, { fumes: since(u, c1 + 0.2, 0.8) }); mark("II", 1); g.restore(); }
  if (u > c2) {
    g.save(); g.globalAlpha = since(u, c2, 0.3);
    const Hz = 1000; sky(g, W, Hz, t, { top: "#2f3a40", low: "#7d8582", clouds: 7, drift: 20 });
    // the waterspout: a twisting funnel from the cloud base to the sea
    const sx = 360, k = since(u, c2 + 0.1, 1.0);
    for (let j = 0; j < 40; j++) { const y = 120 + j * (Hz - 120) / 40, w = 26 + Math.pow(j / 40, 3) * 60 + (1 - j / 40) * 60, x = sx + Math.sin(j * 0.25 + t * 1.5) * 30 * (j / 40); if (j / 40 > k) break; g.fillStyle = `rgba(210,215,205,${0.5})`; g.fillRect(x - w / 2, y, w, (Hz - 120) / 40 + 1); g.strokeStyle = "rgba(29,23,25,0.4)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2 + Math.sin(t * 6 + j) * 6 + w, y + 20); g.stroke(); }
    sea(g, W, H, Hz, t, { top: "#5a6c6a", low: "#1e2c30", swell: 1.6, speed: 1.6 });
    g.save(); g.translate(740, 1080); g.scale(11, 11); g.rotate(Math.sin(t * 1.6) * 0.07); brigantine(g, t * 1.5, { torn: 0, sailsSet: 1 }); g.restore();
    swellBand(g, W, 1092, t * 1.6, 300, "#1e2c30", 16);
    vignette(g, 0.6); mark("III", 1); g.restore();
  }
};

// 11. the warm-meal myth, and the young Conan Doyle's story
const shMyth: Shot["draw"] = (g, t, u) => {
  const s0 = LINES[10].start - SHOTS[10].a, cut = wt(10, "young") - LINES[10].start + s0 - 0.15, stamp = wt(10, "Pure") - LINES[10].start + s0;
  if (u < cut + 0.3) {
    const z = 1.1 - u * 0.02; g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
    cabin(g, t, u, 0);
    // steaming meals (the legend)
    for (const x of [240, 600]) for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(240,240,235,${0.35 + 0.2 * Math.sin(t * 3 + k)})`; g.lineWidth = 8; g.beginPath(); for (let j = 0; j <= 14; j++) { const yy = 1150 - j * 22 - ((t * 40 + k * 30) % 60); const xx = x - 30 + k * 30 + Math.sin(j * 0.6 + t * 2 + k) * 14; if (j === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); } g.stroke(); }
    g.restore();
    const a = since(u, stamp, 0.18);
    if (a > 0) { g.save(); g.translate(540, 760); g.rotate(-0.18); g.scale(1.6 - a * 0.6, 1.6 - a * 0.6); g.globalAlpha = a; g.strokeStyle = "#a3241c"; g.lineWidth = 12; g.strokeRect(-260, -90, 520, 180); g.restore(); g.save(); g.translate(540, 760); g.rotate(-0.18); g.scale(1.6 - a * 0.6, 1.6 - a * 0.6); label(g, "MYTH", 0, 6, 120, a, "#c8342a"); g.restore(); }
  }
  if (u > cut) {
    g.save(); g.globalAlpha = since(u, cut, 0.3);
    wood(g, 0, 0, W, H, "#3a2820", 71, false); lanternGlow(g, 820, 700, 900, 0.9);
    const dz = 1 + (u - cut) * 0.035; g.translate(W / 2, 700); g.scale(dz, dz); g.translate(-W / 2, -700);
    bust(g, DOYLE, { lookX: 0.4, lookY: 0.6, tilt: 0.03, brow: 0.2, blink: ((t * 0.3) % 1) < 0.04 ? 1 : 0 }, t, 470, 380, 400, false, 1, "doyle");
    // the magazine with the story
    g.save(); g.translate(560, 1630 + (1 - since(u, cut + 0.3, 0.5)) * 300); g.rotate(-0.08);
    g.fillStyle = "#d9c79c"; g.fillRect(-300, -260, 600, 440); g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(-300, -260, 600, 440);
    g.strokeStyle = "#7a2b25"; g.lineWidth = 3; g.strokeRect(-270, -230, 540, 380);
    label(g, "THE CORNHILL MAGAZINE", 0, -170, 30, 1, "#2a1e18"); label(g, "JANUARY 1884", 0, -110, 26, 1, "#7a2b25");
    label(g, "J. HABAKUK JEPHSON'S", 0, -10, 32, 1, "#2a1e18"); label(g, "STATEMENT", 0, 40, 32, 1, "#2a1e18");
    g.restore();
    vignette(g, 0.6); g.restore();
  }
};

// 12. never seen again: an empty sea at dusk
const shNever: Shot["draw"] = (g, t, u) => {
  const Hz = 1000, pan = u * 12;
  g.save(); g.translate(-pan, 0);
  sky(g, W + 200, Hz, t, { top: "#3a3f4a", low: "#c99a6a", sun: [700, 960], sunCol: "rgba(255,190,120,0.9)", clouds: 6, drift: 3 });
  sea(g, W + 200, H, Hz, t * 0.6, { top: "#6a6460", low: "#1a2228", glint: 1.0, speed: 0.6 });
  g.restore();
  fog(g, W, H, t, 0.5, 900, 1100);
  vignette(g, 0.7);
};
// 13. only the ship came back... and she kept her secret
const shSecret: Shot["draw"] = (g, t, u) => {
  const Hz = 980, z = 1 + u * 0.03;
  g.save(); g.translate(W / 2, H * 0.55); g.scale(z, z); g.translate(-W / 2, -H * 0.55);
  sky(g, W, Hz, t, { top: "#2c3438", low: "#9a9a8a", clouds: 5 });
  sea(g, W, H, Hz, t, { top: "#55625f", low: "#141c20" });
  const sx = 300 + u * 40;
  g.save(); g.translate(sx, 1080); g.scale(13, 13); g.rotate(Math.sin(t * 0.8) * 0.03); brigantine(g, t, { torn: 1, sailsSet: 0.9 }); g.restore();
  swellBand(g, W, 1092, t, 300, "#141c20", 9);
  fog(g, W, H, t * 1.5, 0.8 + u * 0.12, 600, 1200);
  g.restore();
  const end = MC_TOTAL / FPS - 1.2; const fa = clamp01((t - end) / 1.0);
  vignette(g, 0.7 + fa * 0.3);
  if (fa > 0) { g.fillStyle = `rgba(8,7,8,${fa})`; g.fillRect(0, 0, W, H); }
};

const DRAW: Shot["draw"][] = [shDrift, shLookout, shChart, shFamily, shEmpty, shCabin, shGone, shLog, shWhy, shTheory, shMyth, shNever, shSecret];
void shWater;

// ---------------------------------------------------------------- composition
const XF = 0.35;   // crossfade between shots
function frame(g: Ctx, t: number) {
  const i = SHOTS.findIndex((s) => t >= s.a && t < s.b); const k = i < 0 ? SHOTS.length - 1 : i, S = SHOTS[k];
  g.save(); DRAW[k](g, t, t - S.a); g.restore();
  if (k > 0 && t - S.a < XF) {
    // fade the previous shot out over the new one
    const P = SHOTS[k - 1]; const a = 1 - (t - S.a) / XF;
    const off = scratch(); off.g.save(); DRAW[k - 1](off.g, t, t - P.a); off.g.restore();
    g.save(); g.globalAlpha = smooth(a); g.drawImage(off.c, 0, 0); g.restore();
  }
  paperGrain(g, W, H, Math.floor(t * FPS), 0.9);
}
let _scr: { c: HTMLCanvasElement; g: Ctx } | null = null;
function scratch() { if (!_scr) { const c = document.createElement("canvas"); c.width = W; c.height = H; _scr = { c, g: c.getContext("2d")! }; } _scr.g.setTransform(1, 0, 0, 1, 0, 0); _scr.g.clearRect(0, 0, W, H); return _scr; }

const Stage: React.FC<{ t: number }> = ({ t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); frame(g, t); });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
};

export const MaryCeleste: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const on = { subs: true, audio: true, ...((getInputProps() as { post?: { subs?: boolean; audio?: boolean } }).post ?? {}) };
  return (
    <AbsoluteFill style={{ background: "#101012" }}>
      <Stage t={t} />
      {on.subs && <Subtitles words={WORDS} style={subStyle} />}
      {withAudio && on.audio && <Audio src={staticFile("celeste/mix.wav")} />}
    </AbsoluteFill>
  );
};
export const MC_SHOTS = SHOTS;
void hatchIn; void PAL;
