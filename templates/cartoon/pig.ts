// 2D cartoon pig: a round pink barrel body on four short trotters, big snout that wiggles, floppy ears that lag
// (follow-through), a curly tail that springs, and a trot with squash and stretch. Can wear a halo (the ending).
// Deterministic like figure.ts: springs are replayed from the pose function (settlePig).
import { rng } from "../bridge/paint";
import { shadeOf } from "./figure";

export type PigFace = "neutral" | "happy" | "munch" | "shock" | "smug" | "angel";
export type PigPose = { trot?: number; phase?: number; root?: number; face?: PigFace; chew?: number; bounce?: number; squash?: number; headTilt?: number; look?: number; halo?: boolean; wings?: number };
export type Pig = { seed: number; P: PigPose; sp: Record<string, { x: number; v: number }>; skin: string; spots?: string };
type Ctx = CanvasRenderingContext2D;
const INK = "#16121c";

export const makePig = (seed = 0): Pig => { const r = rng(seed + 17); return { seed, P: {}, sp: {}, skin: r() > 0.5 ? "#f4a9b4" : "#f2b7a8", spots: r() > 0.6 ? "#8a5a4a" : undefined }; };
const spring = (p: Pig, key: string, target: number, reset: boolean, k = 170, d = 13) => {
  let s = p.sp[key];
  if (!s || reset) { s = p.sp[key] = { x: target, v: 0 }; return s; }
  const h = 1 / 60;
  for (let i = 0; i < 2; i++) { s.v += (k * (target - s.x) - d * s.v) * h; s.x += s.v * h; }
  return s;
};
function pigSprings(e: Pig, reset: boolean) {
  const P = e.P, trot = P.trot ?? 0, ph = (P.phase ?? 0) * Math.PI * 2;
  const root = spring(e, "root", P.root ?? 0, reset, 200, 15);
  const bounce = spring(e, "bounce", P.bounce ?? 0, reset, 260, 14);
  const ear = spring(e, "ear", -bounce.v * 0.06 + (trot ? Math.sin(ph * 2 - 1) * 0.25 * trot : 0) + root.v * 0.05, reset, 80, 7);
  const tail = spring(e, "tail", (trot ? Math.sin(ph * 2) * 0.6 : 0) + bounce.v * 0.1, reset, 120, 6);
  const wings = spring(e, "wings", P.wings ?? 0, reset, 200, 10);
  return { trot, ph, root: root.x, bounce: { ...bounce }, ear: ear.x, tail: tail.x, wings: wings.x };
}
type PSt = ReturnType<typeof pigSprings>;
export function settlePig(e: Pig, poseAt: (t: number) => PigPose, t: number, t0 = -1e9): PSt {
  const n = Math.max(0, Math.min(45, Math.floor((t - t0) * 30 + 1e-6)));
  let st!: PSt;
  for (let i = n; i >= 0; i--) { e.P = poseAt(t - i / 30); st = pigSprings(e, i === n); }
  return st;
}
function fo(g: Ctx, path: Path2D, col: string, OL: number, inside?: () => void) {
  g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(path); g.fillStyle = col; g.fill(path);
  if (inside) { g.save(); g.clip(path); inside(); g.restore(); }
}

/** draw at the current transform: metres, y up, origin under the body; side view faces +x (dir -1 mirrors). About 0.75 m tall. */
export function drawPig(g: Ctx, e: Pig, st: PSt, t: number, view: "side" | "front", dir: number, lightSide: number, OL: number) {
  const P = e.P, r = rng(e.seed + 3), ph0 = r() * 10;
  g.save(); if (view === "side" && dir < 0) g.scale(-1, 1);
  g.lineJoin = "round"; g.lineCap = "round";
  const ls = view === "side" ? lightSide * dir : lightSide;
  const { trot, ph, root, bounce, ear, tail, wings } = st;
  const skin = e.skin, skinD = shadeOf(skin, 0.8);
  let bob = Math.sin(t * 2.6 + ph0) * 0.006 + bounce.x, sq = (P.squash ?? 0) - bounce.v * 0.02 + bounce.x * 0.5;
  if (trot) { const c2 = Math.cos(ph * 2); bob += (0.5 - 0.5 * c2) * 0.05 * trot; sq += (-0.06 * Math.max(0, c2) ** 3 + 0.04 * Math.max(0, -c2)) * trot; }
  const sy = 1 + sq, sx = 1 / Math.sqrt(Math.max(0.6, sy));
  const shade = (w: number, h: number, cy: number) => { g.fillStyle = "rgba(60,20,60,0.18)"; g.beginPath(); g.ellipse(-ls * w * 0.5, cy - h * 0.5, w * 0.9, h * 1.1, 0, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,0.2)"; g.beginPath(); g.ellipse(ls * w * 0.3, cy + h * 0.45, w * 0.25, h * 0.15, 0, 0, 7); g.fill(); };
  if (P.halo) { g.save(); g.translate(0.15, 0.95 + bob + Math.sin(t * 2) * 0.02); g.strokeStyle = INK; g.lineWidth = 0.07; g.beginPath(); g.ellipse(0, 0, 0.17, 0.05, 0, 0, 7); g.stroke(); g.strokeStyle = "#ffe46b"; g.lineWidth = 0.04; g.stroke(); g.restore(); }
  g.save(); g.scale(sx, sy); g.translate(0, bob);
  if (view === "side") {
    // legs: two far, two near, swinging in diagonal pairs
    const leg = (x: number, s: number, far: boolean) => {
      const sw = trot ? Math.sin(ph + s) * 0.35 * trot : 0, lift = trot ? Math.max(0, Math.sin(ph + s)) * 0.06 * trot : 0;
      const p = new Path2D(); p.moveTo(x - 0.06, 0.25); p.lineTo(x - 0.05 + sw * 0.25, lift + 0.04); p.lineTo(x + 0.06 + sw * 0.25, lift + 0.04); p.lineTo(x + 0.06, 0.25); p.closePath();
      fo(g, p, far ? skinD : skin, OL * 0.8);
      const hoof = new Path2D(); hoof.rect(x - 0.055 + sw * 0.25, lift, 0.11, 0.05); fo(g, hoof, "#5a3a3a", OL * 0.6);
    };
    leg(-0.28, Math.PI, true); leg(0.24, 0, true);
    // curly tail (springy)
    g.save(); g.translate(-0.45, 0.48); g.rotate(0.3 + tail * 0.6); g.strokeStyle = INK; g.lineWidth = 0.045 + OL * 1.6; const curl = () => { g.beginPath(); for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2.4, rr = 0.06 * (1 - i / 30); const x = -0.04 - i * 0.006 + Math.cos(a) * rr, y = Math.sin(a) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y); } }; curl(); g.stroke(); g.strokeStyle = skin; g.lineWidth = 0.045; curl(); g.stroke(); g.restore();
    // body barrel
    const body = new Path2D(); body.ellipse(-0.03, 0.42, 0.46, 0.25, 0, 0, 7);
    fo(g, body, skin, OL, () => { if (e.spots) { g.fillStyle = e.spots; g.beginPath(); g.ellipse(-0.2, 0.5, 0.12, 0.08, 0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(0.1, 0.35, 0.07, 0.05, 0, 0, 7); g.fill(); } shade(0.46, 0.25, 0.42); });
    leg(-0.22, 0, false); leg(0.3, Math.PI, false);
    if (wings > 0.01) { for (const s of [1, -1]) { g.save(); g.translate(-0.08, 0.6); g.rotate(-0.4 + Math.sin(t * 10) * 0.4 * wings + (s < 0 ? 0.3 : 0)); g.scale(wings, wings); const w = new Path2D(); w.moveTo(0, 0); w.quadraticCurveTo(-0.15, 0.3, -0.35, 0.28); w.quadraticCurveTo(-0.25, 0.15, -0.3, 0.08); w.quadraticCurveTo(-0.15, 0.05, 0, 0); fo(g, w, "#ffffff", OL * 0.7); g.restore(); } }
    // head
    g.save(); g.translate(0.4, 0.5 - root * 0.28); g.rotate(-(P.headTilt ?? 0) - root * 0.5);
    const ears = (far: boolean) => { const p = new Path2D(); const a = 0.4 + ear * 0.8 + (far ? 0.25 : 0); p.moveTo(-0.08, 0.14); p.quadraticCurveTo(-0.05 + Math.sin(a) * 0.08, 0.3, 0.05 + Math.sin(a) * 0.12, 0.24 - Math.cos(a) * 0.08); p.quadraticCurveTo(0.03, 0.15, 0.03, 0.12); p.closePath(); fo(g, p, far ? skinD : skin, OL * 0.8); };
    ears(true);
    const head = new Path2D(); head.ellipse(0.04, 0.04, 0.2, 0.17, 0, 0, 7); fo(g, head, skin, OL, () => shade(0.2, 0.17, 0.04));
    ears(false);
    // snout (wiggles)
    const wig = Math.sin(t * 9 + e.seed) * 0.01 * (Math.sin(t * 1.1 + e.seed) > 0.3 ? 1 : 0) + (P.chew ? Math.sin(t * 18) * 0.012 * P.chew : 0);
    const sn = new Path2D(); sn.ellipse(0.24, 0.0 + wig, 0.075, 0.07, 0, 0, 7); fo(g, sn, shadeOf(skin, 0.9), OL * 0.8);
    g.fillStyle = INK; g.beginPath(); g.ellipse(0.25, 0.025 + wig, 0.012, 0.02, 0, 0, 7); g.ellipse(0.25, -0.025 + wig, 0.012, 0.02, 0, 0, 7); g.fill();
    face(g, e, P, t, OL, 0.1, 0.08);
    g.restore();
  } else {
    for (const s of [-1, 1]) { const p = new Path2D(); p.rect(s * 0.15 - 0.055, 0, 0.11, 0.25); fo(g, p, skinD, OL * 0.8); }
    const body = new Path2D(); body.ellipse(0, 0.42, 0.3, 0.26, 0, 0, 7); fo(g, body, skin, OL, () => shade(0.3, 0.26, 0.42));
    if (wings > 0.01) for (const s of [-1, 1]) { g.save(); g.translate(s * 0.25, 0.55); g.scale(s * wings, wings); g.rotate(-0.3 + Math.sin(t * 10) * 0.35); const w = new Path2D(); w.moveTo(0, 0); w.quadraticCurveTo(0.15, 0.3, 0.35, 0.28); w.quadraticCurveTo(0.25, 0.15, 0.3, 0.08); w.quadraticCurveTo(0.15, 0.05, 0, 0); fo(g, w, "#ffffff", OL * 0.7); g.restore(); }
    g.save(); g.translate(0, 0.62 - root * 0.2); g.rotate(-(P.headTilt ?? 0));
    for (const s of [-1, 1]) { const p = new Path2D(); const a = 0.3 + ear * 0.6; p.moveTo(s * 0.1, 0.12); p.quadraticCurveTo(s * (0.2 + a * 0.05), 0.3, s * (0.26 + a * 0.06), 0.18 - a * 0.1); p.quadraticCurveTo(s * 0.18, 0.1, s * 0.16, 0.06); p.closePath(); fo(g, p, skin, OL * 0.8); }
    const head = new Path2D(); head.ellipse(0, 0, 0.21, 0.18, 0, 0, 7); fo(g, head, skin, OL, () => shade(0.21, 0.18, 0));
    const wig = Math.sin(t * 9 + e.seed) * 0.008 + (P.chew ? Math.sin(t * 18) * 0.01 * P.chew : 0);
    const sn = new Path2D(); sn.ellipse(0, -0.06 + wig, 0.09, 0.065, 0, 0, 7); fo(g, sn, shadeOf(skin, 0.9), OL * 0.8);
    g.fillStyle = INK; g.beginPath(); g.ellipse(-0.03, -0.06 + wig, 0.014, 0.022, 0, 0, 7); g.ellipse(0.03, -0.06 + wig, 0.014, 0.022, 0, 0, 7); g.fill();
    face(g, e, P, t, OL, 0, 0.06, true);
    g.restore();
  }
  g.restore();
  g.restore();
}
function face(g: Ctx, e: Pig, P: PigPose, t: number, OL: number, ex0: number, ey: number, front = false) {
  const f = P.face ?? "neutral";
  const eyes = front ? [[-0.08, ey], [0.08, ey]] : [[ex0, ey]];
  const blink = ((t * 0.21 + e.seed * 0.17) % 1) < 0.03;
  for (const [ex, yy] of eyes) {
    const big = f === "shock" ? 1.4 : 1, ew = 0.035 * big, eh = 0.042 * big;
    if (f === "happy" || f === "angel" || f === "munch" || blink) { g.strokeStyle = INK; g.lineWidth = OL * 0.9; g.beginPath(); g.arc(ex, yy - 0.01, ew, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); continue; }
    const eye = new Path2D(); eye.ellipse(ex, yy, ew, eh, 0, 0, 7);
    fo(g, eye, "#ffffff", OL * 0.6, () => { const lx = (P.look ?? 0.3) * 0.01; g.fillStyle = INK; g.beginPath(); g.arc(ex + lx, yy, eh * (f === "shock" ? 0.4 : 0.6), 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + lx + 0.008, yy + 0.01, eh * 0.2, 0, 7); g.fill(); if (f === "smug") { g.fillStyle = e.skin; g.fillRect(ex - 0.06, yy + eh * 0.1, 0.12, 0.1); g.strokeStyle = INK; g.lineWidth = OL * 0.7; g.beginPath(); g.moveTo(ex - ew, yy + eh * 0.1); g.lineTo(ex + ew, yy + eh * 0.1); g.stroke(); } });
  }
  // mouth
  const mx = front ? 0 : 0.17, my = front ? -0.14 : -0.09;
  g.strokeStyle = INK; g.lineWidth = OL * 0.8; g.beginPath();
  if (f === "shock") { g.ellipse(mx, my, 0.03, 0.035, 0, 0, 7); }
  else if (f === "munch") { const c = Math.abs(Math.sin(t * 16)); g.moveTo(mx - 0.05, my); g.quadraticCurveTo(mx, my - 0.03 - c * 0.02, mx + 0.04, my + 0.005); }
  else { g.moveTo(mx - 0.05, my + 0.01); g.quadraticCurveTo(mx, my - 0.035, mx + 0.04, my + 0.015); }
  g.stroke();
  g.fillStyle = "rgba(240,90,120,0.35)"; for (const [ex] of eyes) { g.beginPath(); g.ellipse(ex + (front ? Math.sign(ex) * 0.03 : -0.03), ey - 0.07, 0.035, 0.02, 0, 0, 7); g.fill(); }
}
