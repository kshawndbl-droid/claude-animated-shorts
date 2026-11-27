// 2D cartoon rabbit (tame farm bunny): round body, big head, long ears that lag and flop (follow-through), big shiny eyes,
// twitching nose, cotton tail, and a springy hop (crouch, stretch at take-off, squash on landing). Can sit up and beg.
// Deterministic like figure.ts: springs are replayed from the pose function (settleRabbit).
import { rng } from "../bridge/paint";
import { shadeOf } from "./figure";

export type RabbitFace = "neutral" | "happy" | "hungry" | "curious" | "shock" | "smug" | "sleepy";
export type RabbitPose = {
  hop?: number; phase?: number;      // hop 0..1 strength, phase advances 1 per hop
  beg?: number;                      // 0..1 sit up on the hind legs, paws up
  ears?: number;                     // 0 up .. 1 flopped back
  look?: number; headTilt?: number; face?: RabbitFace; chew?: number; bounce?: number; squash?: number; lean?: number;
  hat?: boolean;                     // wears a tiny bicorne (the last shot)
};
export type Rabbit = { seed: number; P: RabbitPose; sp: Record<string, { x: number; v: number }>; fur: string; patch?: string; inner: string; eye: string; lop: boolean };
type Ctx = CanvasRenderingContext2D;
const INK = "#16121c";

const COATS: [string, string | undefined][] = [["#f4f1ea", undefined], ["#f4f1ea", "#3a3434"], ["#b9a58c", undefined], ["#8f8a86", undefined], ["#c98f5a", "#f4f1ea"], ["#f4f1ea", "#c98f5a"], ["#5e5652", undefined], ["#d8c7a8", undefined]];
export const makeRabbit = (seed = 0): Rabbit => {
  const r = rng(seed * 13 + 5);
  const [fur, patch] = COATS[Math.floor(r() * COATS.length)];
  return { seed, P: {}, sp: {}, fur, patch, inner: "#f2a7b0", eye: fur === "#f4f1ea" && !patch && r() > 0.6 ? "#c2455a" : "#2c2222", lop: r() > 0.85 };
};
const spring = (p: Rabbit, key: string, target: number, reset: boolean, k = 170, d = 13) => {
  let s = p.sp[key];
  if (!s || reset) { s = p.sp[key] = { x: target, v: 0 }; return s; }
  const h = 1 / 60;
  for (let i = 0; i < 2; i++) { s.v += (k * (target - s.x) - d * s.v) * h; s.x += s.v * h; }
  return s;
};
function rabbitSprings(e: Rabbit, reset: boolean) {
  const P = e.P, hop = P.hop ?? 0, ph = (P.phase ?? 0) * Math.PI * 2;
  const beg = spring(e, "beg", P.beg ?? 0, reset, 160, 13);
  const bounce = spring(e, "bounce", P.bounce ?? 0, reset, 260, 14);
  const lean = spring(e, "lean", P.lean ?? 0, reset, 140, 12);
  // hop height for the follow-through targets
  const air = hop * Math.max(0, Math.sin(ph));
  const vy = hop * Math.cos(ph);
  // ears lag behind the body's vertical motion and flop back when moving fast
  const ears = spring(e, "ears", (P.ears ?? 0) + hop * 0.35 + vy * 0.25, reset, 90, 7);
  const earLag = spring(e, "earLag", -bounce.v * 0.08 + vy * 0.3, reset, 70, 6);
  return { hop, ph, air, beg: beg.x, bounce: { ...bounce }, lean: lean.x, ears: ears.x, earLag: earLag.x };
}
type RSt = ReturnType<typeof rabbitSprings>;
export function settleRabbit(e: Rabbit, poseAt: (t: number) => RabbitPose, t: number, t0 = -1e9): RSt {
  const n = Math.max(0, Math.min(45, Math.floor((t - t0) * 30 + 1e-6)));
  let st!: RSt;
  for (let i = n; i >= 0; i--) { e.P = poseAt(t - i / 30); st = rabbitSprings(e, i === n); }
  return st;
}
function fo(g: Ctx, path: Path2D, col: string, OL: number, inside?: () => void) {
  g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(path); g.fillStyle = col; g.fill(path);
  if (inside) { g.save(); g.clip(path); inside(); g.restore(); }
}

/** draw at the current transform: metres, y up, origin under the body; side view faces +x (dir -1 mirrors). About 0.5 m tall sitting. */
export function drawRabbit(g: Ctx, e: Rabbit, st: RSt, t: number, view: "side" | "front" | "back", dir: number, lightSide: number, OL: number) {
  const P = e.P, r = rng(e.seed + 9), ph0 = r() * 10;
  g.save(); if (view === "side" && dir < 0) g.scale(-1, 1);
  g.lineJoin = "round"; g.lineCap = "round";
  const ls = view === "side" ? lightSide * dir : lightSide;
  const { hop, ph, air, beg, bounce, lean, ears, earLag } = st;
  const fur = e.fur, furD = shadeOf(fur, 0.78), patch = e.patch;
  // hop: crouch before take-off (squash), stretch in the air, squash on landing
  const c = Math.cos(ph);
  let sq = (P.squash ?? 0) + Math.sin(t * 3 + ph0) * 0.012 - bounce.v * 0.02 + bounce.x * 0.5;
  if (hop) sq += (Math.sin(ph) > 0 ? 0.16 * Math.abs(c) * Math.sign(c) * 0.6 + 0.08 * Math.sin(ph) : -0.14 * Math.abs(Math.sin(ph))) * hop;
  const lift = air * 0.38 + bounce.x;
  const sy = 1 + sq, sx = 1 / Math.sqrt(Math.max(0.55, sy));
  // body pitch while hopping: nose up at take-off, nose down landing
  const pitch = hop ? -c * 0.28 * hop * (Math.sin(ph) > 0 ? 1 : 0.3) : 0;
  const shade = () => { g.fillStyle = "rgba(40,30,90,0.2)"; g.beginPath(); g.ellipse(-ls * 0.25, -0.05, 0.3, 0.5, 0, 0, 7); g.fill(); g.fillStyle = "rgba(255,250,235,0.18)"; g.beginPath(); g.ellipse(ls * 0.08, 0.2, 0.07, 0.05, 0, 0, 7); g.fill(); };

  g.save(); g.translate(0, lift); g.scale(sx, sy);
  if (view === "side") {
    g.rotate(pitch - lean * 0.3 - beg * 0.9);
    // hind foot (big), cotton tail
    const hf = new Path2D(); const fx = hop ? -0.1 - Math.max(0, Math.sin(ph)) * 0.12 * hop : -0.06;
    hf.ellipse(fx + 0.02, 0.035, 0.15, 0.05, hop ? Math.max(0, Math.sin(ph)) * -0.6 * hop : 0, 0, 7); fo(g, hf, furD, OL * 0.8);
    const tail = new Path2D(); tail.arc(-0.27, 0.2, 0.075, 0, 7); fo(g, tail, "#ffffff", OL * 0.8);
    // body: a pear, heavier at the back
    const body = new Path2D(); body.ellipse(-0.06, 0.17, 0.22, 0.17, -0.15, 0, 7);
    fo(g, body, fur, OL, () => { if (patch) { g.fillStyle = patch; g.beginPath(); g.ellipse(-0.12, 0.25, 0.13, 0.09, 0.3, 0, 7); g.fill(); } shade(); });
    // haunch line + front paw
    g.strokeStyle = furD; g.lineWidth = OL * 0.9; g.beginPath(); g.arc(-0.12, 0.12, 0.1, 0.3, 2.4); g.stroke();
    const fpx = 0.12 + (hop ? Math.sin(ph + 1) * 0.08 * hop : 0) + beg * 0.02, fpy = beg * 0.1;
    const paw = new Path2D(); paw.ellipse(fpx, 0.03 + fpy + (hop ? Math.max(0, -Math.sin(ph)) * 0.0 : 0), 0.06, 0.035, 0, 0, 7); fo(g, paw, fur, OL * 0.7);
    // head
    g.save(); g.translate(0.13, 0.33 + beg * 0.05); g.rotate(-(P.headTilt ?? 0) + beg * 0.9 - pitch * 0.5);
    drawEars(g, e, ears, earLag, "side", OL, t);
    const head = new Path2D(); head.ellipse(0.04, 0.02, 0.15, 0.13, 0.1, 0, 7);
    fo(g, head, fur, OL, () => { if (patch && e.seed % 2) { g.fillStyle = patch; g.beginPath(); g.ellipse(-0.04, 0.08, 0.09, 0.08, 0, 0, 7); g.fill(); } g.fillStyle = "rgba(40,30,90,0.16)"; g.beginPath(); g.ellipse(-ls * 0.1, -0.06, 0.12, 0.08, 0, 0, 7); g.fill(); });
    face(g, e, P, t, "side", OL, 0.04);
    if (P.hat) hat(g, OL, "side");
    g.restore();
  } else {
    // front / back: round body, two feet, head on top
    g.rotate(-lean * 0.2);
    for (const s of [-1, 1]) { const f = new Path2D(); f.ellipse(s * 0.1, 0.03, 0.08, 0.045, 0, 0, 7); fo(g, f, furD, OL * 0.8); }
    const body = new Path2D(); body.ellipse(0, 0.18 + beg * 0.06, 0.19, 0.18 + beg * 0.06, 0, 0, 7);
    fo(g, body, fur, OL, () => {
      if (view === "front") { g.fillStyle = shadeOf(fur, 1.08); g.beginPath(); g.ellipse(0, 0.14, 0.1, 0.12, 0, 0, 7); g.fill(); }
      if (patch) { g.fillStyle = patch; g.beginPath(); g.ellipse(0.1, 0.24, 0.09, 0.08, 0, 0, 7); g.fill(); }
      shade();
    });
    if (view === "back") { const tail = new Path2D(); tail.arc(0, 0.1, 0.07, 0, 7); fo(g, tail, "#ffffff", OL * 0.8); }
    if (view === "front") for (const s of [-1, 1]) { const p = new Path2D(); p.ellipse(s * 0.07, 0.16 + beg * 0.16, 0.05, 0.04, 0, 0, 7); fo(g, p, fur, OL * 0.7); }
    g.save(); g.translate(0, 0.42 + beg * 0.12); g.rotate(-(P.headTilt ?? 0));
    drawEars(g, e, ears, earLag, view, OL, t);
    const head = new Path2D(); head.ellipse(0, 0, 0.15, 0.13, 0, 0, 7);
    fo(g, head, fur, OL, () => { if (patch && e.seed % 2) { g.fillStyle = patch; g.beginPath(); g.ellipse(-0.07, 0.05, 0.08, 0.09, 0, 0, 7); g.fill(); } g.fillStyle = "rgba(40,30,90,0.14)"; g.beginPath(); g.ellipse(-ls * 0.12, -0.05, 0.11, 0.09, 0, 0, 7); g.fill(); });
    if (view === "front") face(g, e, P, t, "front", OL, 0);
    if (P.hat) hat(g, OL, view);
    g.restore();
  }
  g.restore();
  g.restore();
}

function drawEars(g: Ctx, e: Rabbit, ears: number, lag: number, view: "side" | "front" | "back", OL: number, t: number) {
  const L = 0.3, flop = Math.min(1.2, Math.max(-0.3, ears + (e.lop ? 1.0 : 0)));
  const twitch = Math.sin(t * 0.9 + e.seed) > 0.97 ? Math.sin(t * 40) * 0.12 : 0;
  const one = (bx: number, base: number, side: number, far: boolean) => {
    const a = base + side * 0.12 + flop * (view === "side" ? 1.3 : 1.1) * (view === "side" ? 1 : side) + lag * 0.5 + (side > 0 ? twitch : 0);
    // a bendy ear: the tip lags further than the root
    const mx = bx + Math.sin(-a * 0.6) * L * 0.5, my = 0.09 + Math.cos(a * 0.6) * L * 0.5;
    const tx = bx + Math.sin(-a - lag * 0.6) * L, ty = 0.09 + Math.cos(a + lag * 0.6) * L * (view === "side" ? 1 : 1);
    const w = 0.055;
    const p = new Path2D();
    p.moveTo(bx - w, 0.08); p.quadraticCurveTo(mx - w * 1.4, my, tx, ty); p.quadraticCurveTo(mx + w * 1.4, my, bx + w, 0.08); p.closePath();
    fo(g, p, far ? shadeOf(e.fur, 0.85) : e.fur, OL * 0.85, () => {
      if (view !== "back") { g.fillStyle = e.inner; g.beginPath(); g.moveTo(bx - w * 0.4, 0.1); g.quadraticCurveTo(mx - w * 0.5, my, (tx * 0.85 + bx * 0.15), (ty * 0.85 + 0.1 * 0.15)); g.quadraticCurveTo(mx + w * 0.5, my, bx + w * 0.4, 0.1); g.fill(); }
    });
  };
  if (view === "side") { one(-0.02, 0.35, -1, true); one(0.03, 0.25, 1, false); }
  else { one(-0.07, 0, -1, false); one(0.07, 0, 1, false); }
}
function face(g: Ctx, e: Rabbit, P: RabbitPose, t: number, view: "side" | "front", OL: number, ox: number) {
  const f = P.face ?? "neutral";
  const eyes = view === "side" ? [[0.09 + ox, 0.05]] : [[-0.065, 0.03], [0.065, 0.03]];
  const big = f === "shock" ? 1.3 : f === "hungry" ? 1.2 : 1;
  const blink = ((t * 0.23 + e.seed * 0.131) % 1) < 0.03;
  for (const [ex, ey] of eyes) {
    const ew = 0.042 * big, eh = 0.05 * big;
    if (f === "happy" || f === "sleepy" || blink) { g.strokeStyle = INK; g.lineWidth = OL * 0.9; g.beginPath(); if (f === "sleepy") { g.moveTo(ex - ew, ey); g.lineTo(ex + ew, ey); } else g.arc(ex, ey - 0.012, ew, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); continue; }
    const eye = new Path2D(); eye.ellipse(ex, ey, ew, eh, 0, 0, 7);
    fo(g, eye, "#ffffff", OL * 0.6, () => {
      const lx = (P.look ?? 0.3) * 0.012;
      g.fillStyle = e.eye; g.beginPath(); g.arc(ex + lx, ey - 0.004, eh * (f === "shock" ? 0.45 : 0.72), 0, 7); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + lx + 0.01, ey + 0.012, eh * 0.24, 0, 7); g.fill();
      if (f === "hungry") { g.beginPath(); g.arc(ex + lx - 0.012, ey - 0.014, eh * 0.13, 0, 7); g.fill(); }   // sparkly "feed me" eyes
      const lid = f === "smug" ? 0.45 : f === "curious" ? 0.12 : 0;
      if (lid) { g.fillStyle = e.fur; g.fillRect(ex - 0.08, ey + eh - eh * 2 * lid, 0.16, 0.12); g.strokeStyle = INK; g.lineWidth = OL * 0.7; g.beginPath(); g.moveTo(ex - ew, ey + eh - eh * 2 * lid); g.lineTo(ex + ew, ey + eh - eh * 2 * lid); g.stroke(); }
    });
  }
  // nose (twitches), mouth, cheeks, whiskers
  const tw = Math.sin(t * 14 + e.seed) * 0.006 * (Math.sin(t * 1.3 + e.seed) > 0 ? 1 : 0);
  const nx = view === "side" ? 0.18 + ox : 0, ny = -0.02 + tw;
  const nose = new Path2D(); nose.ellipse(nx, ny, 0.022, 0.016, 0, 0, 7); fo(g, nose, "#e8798a", OL * 0.5);
  const chew = P.chew ? Math.abs(Math.sin(t * 16)) * P.chew : 0;
  g.strokeStyle = INK; g.lineWidth = OL * 0.7; g.beginPath();
  if (view === "side") { g.moveTo(nx - 0.005, ny - 0.016); g.quadraticCurveTo(nx - 0.01, ny - 0.045 - chew * 0.015, nx - 0.04, ny - 0.04); }
  else { g.moveTo(0, ny - 0.016); g.lineTo(0, ny - 0.035); g.moveTo(-0.03, ny - 0.045 - chew * 0.01); g.quadraticCurveTo(-0.015, ny - 0.03, 0, ny - 0.035); g.quadraticCurveTo(0.015, ny - 0.03, 0.03, ny - 0.045 - chew * 0.01); }
  g.stroke();
  if (f === "happy" || f === "hungry" || chew > 0 || f === "shock") { // buck teeth
    const tx = view === "side" ? nx - 0.02 : 0; const tt = new Path2D(); tt.rect(tx - 0.012, ny - 0.07 - chew * 0.01, 0.024, 0.03); fo(g, tt, "#ffffff", OL * 0.4);
  }
  g.fillStyle = "rgba(240,120,140,0.35)"; for (const [ex] of eyes) { g.beginPath(); g.ellipse(ex + (view === "side" ? 0.01 : Math.sign(ex) * 0.02), -0.04, 0.03, 0.018, 0, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(22,18,28,0.55)"; g.lineWidth = OL * 0.45;
  for (const s of view === "side" ? [1] : [-1, 1]) for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(nx + s * 0.02, ny - 0.01); g.lineTo(nx + s * 0.12, ny - 0.01 + k * 0.025 + tw * 2); g.stroke(); }
}
function hat(g: Ctx, OL: number, view: "side" | "front" | "back") {
  // a tiny black bicorne, worn sideways
  g.save(); g.translate(0, 0.1); g.rotate(-0.12);
  const w = view === "side" ? 0.12 : 0.24;
  const b = new Path2D(); b.moveTo(-w, 0); b.quadraticCurveTo(-w * 0.9, 0.11, -w * 0.3, 0.14); b.quadraticCurveTo(0, 0.17, w * 0.3, 0.14); b.quadraticCurveTo(w * 0.9, 0.11, w, 0); b.quadraticCurveTo(0, 0.04, -w, 0);
  fo(g, b, "#1f1c22", OL * 0.8, () => { g.strokeStyle = "#d9b44a"; g.lineWidth = 0.012; g.beginPath(); g.moveTo(-w * 0.9, 0.02); g.quadraticCurveTo(0, 0.06, w * 0.9, 0.02); g.stroke(); });
  if (view !== "back") { // tricolour cockade
    for (const [rr, col] of [[0.035, "#2a4fa0"], [0.024, "#ffffff"], [0.013, "#c8262a"]] as [number, string][]) { g.fillStyle = col; g.beginPath(); g.arc(view === "side" ? 0.03 : 0.0, 0.08, rr, 0, 7); g.fill(); }
  }
  g.restore();
}
