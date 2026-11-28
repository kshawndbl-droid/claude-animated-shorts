// D.B. Cooper (1971) props in the living-engraving look: a Boeing 727-style trijet (side view, T-tail, rear airstair),
// night forest of firs, rain, lightning, a briefcase, banknotes, parachute packs. Pixel space, y down.
import { hatchBox, hatchIn, INK, rng } from "../docu/sea";
type Ctx = CanvasRenderingContext2D;
export const NIGHT = { sky0: "#0e1620", sky1: "#26323c", fir: "#0f1a16", fir2: "#1b2a24", rain: "rgba(190,210,225,0.35)", amber: "#e8a54a", red: "#a8322a", alu: "#c9cdd0", olive: "#5c5a3a" };

/** the trijet facing +x in metres (about 41 m long), belly at y = 0. stairs: 0 closed .. 1 fully down */
export function trijet(g: Ctx, t: number, o: { stairs?: number; lit?: number; wet?: number } = {}) {
  const lw = 1 / Math.abs(g.getTransform().a || 1);
  g.lineJoin = "round"; g.lineCap = "round";
  const st = o.stairs ?? 0;
  // far wing (behind)
  g.fillStyle = "#7c8286"; g.beginPath(); g.moveTo(2, -1.6); g.lineTo(-6, -1.9); g.lineTo(-13, -4.2); g.lineTo(-11, -4.4); g.lineTo(-2, -2.6); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 2 * lw; g.stroke();
  // rear airstair (drawn before the fuselage so it hangs out of the belly)
  if (st > 0) {
    const hx = -15.5, hy = -0.4, L = 7.5, a = 0.15 + st * 0.6;
    g.save(); g.translate(hx, hy); g.rotate(a);
    const sp = new Path2D(); sp.rect(-L, -0.25, L, 0.7); g.fillStyle = "#8a8f94"; g.fill(sp); g.lineWidth = 2 * lw; g.stroke(sp);
    g.strokeStyle = "rgba(29,23,25,0.8)"; g.lineWidth = 1.2 * lw; for (let k = 1; k < 12; k++) { g.beginPath(); g.moveTo(-L * k / 12, -0.25); g.lineTo(-L * k / 12 + 0.2, 0.45); g.stroke(); }
    g.restore();
  }
  // fuselage
  const f = new Path2D();
  f.moveTo(20.5, -2.2); f.quadraticCurveTo(21.6, -2.6, 21.2, -3.5); f.quadraticCurveTo(19.8, -5.2, 16.5, -5.3);
  f.lineTo(-12, -5.3); f.quadraticCurveTo(-17, -5.3, -21, -6.2); f.lineTo(-21.3, -5.2); f.quadraticCurveTo(-18, -2.4, -14, -0.6); f.lineTo(16, -0.1); f.quadraticCurveTo(19.5, -0.3, 20.5, -2.2); f.closePath();
  g.fillStyle = NIGHT.alu; g.fill(f);
  g.save(); g.clip(f);
  const sh = g.createLinearGradient(0, -5.5, 0, 0); sh.addColorStop(0, "rgba(255,255,255,0.35)"); sh.addColorStop(0.45, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(20,25,30,0.45)"); g.fillStyle = sh; g.fill(f);
  hatchBox(g, -22, -2.4, 22, 0.2, 0.3, 0.05, 1 * lw, "rgba(29,23,25,0.35)");
  g.fillStyle = "#2c3e66"; g.fillRect(-22, -3.3, 44, 0.35);            // cheat line
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 3 * lw; g.stroke(f);
  // windows, glowing when lit
  const lit = o.lit ?? 0;
  for (let k = 0; k < 26; k++) { const x = 15 - k * 1.05; if (x < -12) break; g.fillStyle = lit ? `rgba(255,214,140,${0.55 + 0.45 * lit})` : "#2a3036"; g.beginPath(); g.ellipse(x, -3.95, 0.22, 0.3, 0, 0, 7); g.fill(); }
  g.fillStyle = "#1d2228"; g.beginPath(); g.moveTo(19.0, -4.4); g.lineTo(20.4, -3.7); g.lineTo(19.5, -3.6); g.lineTo(18.7, -4.1); g.closePath(); g.fill();
  g.strokeStyle = INK; g.lineWidth = 1.6 * lw; g.strokeRect(16.2, -4.6, 0.9, 2.2);
  // fin + T-tail
  const fin = new Path2D(); fin.moveTo(-12.5, -5.3); fin.lineTo(-18.6, -13.6); fin.lineTo(-21.0, -13.6); fin.lineTo(-20.6, -6.0); fin.closePath();
  g.fillStyle = NIGHT.red; g.fill(fin); hatchIn(g, fin, [-21, -14, -12, -5], 0.3, 0.9, 1 * lw, "rgba(20,10,10,0.35)"); g.lineWidth = 3 * lw; g.stroke(fin);
  const hs = new Path2D(); hs.moveTo(-18.2, -13.4); hs.lineTo(-22.5, -13.9); hs.lineTo(-23.0, -13.3); hs.lineTo(-19.6, -12.9); hs.closePath(); g.fillStyle = "#8a2a24"; g.fill(hs); g.stroke(hs);
  // centre engine intake at the fin root + near side engine pod
  g.fillStyle = "#9aa0a5"; g.beginPath(); g.ellipse(-12.8, -5.9, 1.0, 0.7, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#222"; g.beginPath(); g.ellipse(-12.3, -5.9, 0.35, 0.45, 0, 0, 7); g.fill();
  const pod = new Path2D(); pod.moveTo(-11.5, -4.0); pod.lineTo(-16.6, -4.2); pod.quadraticCurveTo(-17.4, -5.0, -16.6, -5.8); pod.lineTo(-11.5, -6.0); pod.quadraticCurveTo(-10.8, -5.0, -11.5, -4.0); pod.closePath();
  g.fillStyle = "#b4b9bd"; g.fill(pod); hatchIn(g, pod, [-17, -6, -10, -4], 0.25, 0.1, 1 * lw, "rgba(29,23,25,0.4)"); g.lineWidth = 2.4 * lw; g.stroke(pod); g.fillStyle = "#1a1d20"; g.beginPath(); g.ellipse(-11.3, -5.0, 0.3, 0.9, 0, 0, 7); g.fill();
  // near wing, swept, coming toward the viewer
  const w = new Path2D(); w.moveTo(4.5, -1.2); w.lineTo(-3.0, -1.0); w.lineTo(-9.5, 1.6); w.lineTo(-7.8, 1.8); w.lineTo(1.0, -0.3); w.closePath();
  g.fillStyle = "#a9aeb2"; g.fill(w); hatchIn(g, w, [-10, -2, 5, 2], 0.25, 0.4, 1 * lw, "rgba(29,23,25,0.35)"); g.lineWidth = 2.4 * lw; g.stroke(w);
  // nav / beacon lights
  const blink = (Math.sin(t * 6.5) > 0.6) ? 1 : 0.15;
  g.fillStyle = `rgba(255,60,50,${blink})`; g.beginPath(); g.arc(-5, -5.5, 0.28, 0, 7); g.fill();
  g.fillStyle = `rgba(255,255,255,${blink})`; g.beginPath(); g.arc(-22.4, -13.6, 0.2, 0, 7); g.fill();
  if (o.wet) { g.save(); g.clip(f); g.strokeStyle = "rgba(220,235,245,0.4)"; g.lineWidth = 1 * lw; for (let k = 0; k < 40; k++) { const x = 20 - ((k * 1.37 + t * 9) % 42); g.beginPath(); g.moveTo(x, -5.3); g.lineTo(x - 1.2, -4.6); g.stroke(); } g.restore(); }
}

/** a band of fir trees along y (pixel space), engraved */
export function firs(g: Ctx, W: number, y: number, h: number, seed: number, col = NIGHT.fir, t = 0, sway = 0, lightCol?: string) {
  const r = rng(seed);
  for (let x = -80; x < W + 80; x += h * (0.18 + r() * 0.16)) {
    const th = h * (0.6 + r() * 0.5), tw = th * (0.26 + r() * 0.08), bx = x + Math.sin(t * 0.7 + x) * sway * th * 0.02;
    const p = new Path2D(); p.moveTo(bx, y - th);
    const tiers = 6; for (let k = 1; k <= tiers; k++) { const yy = y - th + (th * k) / tiers, ww = tw * (k / tiers); p.lineTo(bx + ww, yy); p.lineTo(bx + ww * 0.55, yy - th * 0.03); }
    for (let k = tiers; k >= 1; k--) { const yy = y - th + (th * k) / tiers, ww = tw * (k / tiers); p.lineTo(bx - ww * 0.55, yy - th * 0.03); p.lineTo(bx - ww, yy); }
    p.closePath();
    g.fillStyle = col; g.fill(p);
    if (lightCol) { g.save(); g.clip(p); const lg = g.createLinearGradient(bx - tw, 0, bx + tw, 0); lg.addColorStop(0, lightCol); lg.addColorStop(0.5, "rgba(0,0,0,0)"); g.fillStyle = lg; g.fillRect(bx - tw, y - th, tw * 2, th); g.restore(); }
    hatchIn(g, p, [bx, y - th, bx + tw, y], 4, 1.2, 1, "rgba(0,0,0,0.35)");
    g.strokeStyle = "rgba(0,0,0,0.75)"; g.lineWidth = 1.5; g.stroke(p);
  }
  g.fillStyle = col; g.fillRect(-80, y - 2, W + 160, 4000);
}

/** slanted rain streaks over the frame */
export function rain(g: Ctx, W: number, H: number, t: number, amt = 1, slant = 0.25, col = NIGHT.rain) {
  const r = rng(9); g.save(); g.strokeStyle = col; g.lineWidth = 1.6;
  g.beginPath();
  const n = Math.floor(260 * amt);
  for (let i = 0; i < n; i++) { const x0 = r() * (W + 400) - 200, sp = 1500 + r() * 900, len = 30 + r() * 50; const y = ((r() * H + t * sp) % (H + 200)) - 100; const x = x0 - y * slant; g.moveTo(x, y); g.lineTo(x - len * slant, y - len); }
  g.stroke(); g.restore();
}
/** a lightning flash amount at time t (deterministic bursts) */
export const flashAt = (t: number, times: number[]) => { let a = 0; for (const t0 of times) { const d = t - t0; if (d >= 0 && d < 0.5) a = Math.max(a, (d < 0.08 ? 1 : d < 0.16 ? 0.3 : d < 0.22 ? 0.8 : 0) * (1 - d * 1.2)); } return a; };
export function bolt(g: Ctx, x: number, y0: number, y1: number, seed: number, a: number) {
  if (a <= 0) return; const r = rng(seed); g.save(); g.strokeStyle = `rgba(235,240,255,${a})`; g.lineWidth = 5; g.shadowColor = "rgba(200,220,255,0.9)"; g.shadowBlur = 30;
  g.beginPath(); let px = x; g.moveTo(px, y0); for (let y = y0; y < y1; y += 40) { px += (r() - 0.5) * 70; g.lineTo(px, y); } g.stroke(); g.restore();
}

export function briefcase(g: Ctx, x: number, y: number, s: number, open: number, t: number) {
  // body
  const b = new Path2D(); b.rect(x - s, y - s * 0.1, s * 2, s * 0.75);
  g.fillStyle = "#3a2618"; g.fill(b); hatchIn(g, b, [x - s, y, x + s, y + s], 6, 0.2, 1.2, "rgba(0,0,0,0.35)"); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(b);
  // contents visible as the lid opens: red cylinders, wires, a battery
  if (open > 0.05) {
    g.save(); g.beginPath(); g.rect(x - s * 0.95, y - s * 0.1 - s * 0.6 * open, s * 1.9, s * 0.6 * open + 4); g.clip();
    g.fillStyle = "#1b1310"; g.fillRect(x - s, y - s, s * 2, s);
    for (let k = 0; k < 8; k++) { const cx = x - s * 0.85 + k * s * 0.15, cy = y - s * 0.32; g.fillStyle = "#b0322a"; g.fillRect(cx, cy - s * 0.18, s * 0.11, s * 0.42); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(cx, cy - s * 0.18, s * 0.11, s * 0.42); }
    g.fillStyle = "#3a3d44"; g.fillRect(x + s * 0.4, y - s * 0.5, s * 0.45, s * 0.38); g.strokeRect(x + s * 0.4, y - s * 0.5, s * 0.45, s * 0.38); g.fillStyle = "#c9a24a"; g.fillRect(x + s * 0.5, y - s * 0.55, s * 0.08, s * 0.06);
    g.strokeStyle = "#c83a2a"; g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x - s * 0.8 + k * s * 0.3, y - s * 0.12); g.bezierCurveTo(x - s * 0.2 + k * 0.1, y - s * 0.7 + Math.sin(t + k) * 4, x + s * 0.2, y - s * 0.6, x + s * 0.45, y - s * 0.35); g.stroke(); }
    g.restore();
  }
  // lid hinged at the back edge, rising
  g.save(); g.translate(x, y - s * 0.1); g.scale(1, Math.cos(open * 1.2)); const lid = new Path2D(); lid.rect(-s, -s * 0.12, s * 2, s * 0.12); g.restore();
  g.save(); g.translate(x, y - s * 0.1 - s * 0.62 * Math.sin(open * 1.2)); const l2 = new Path2D(); l2.rect(-s, -s * 0.06, s * 2, s * 0.12); g.fillStyle = "#4a3020"; g.fill(l2); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(l2); g.restore();
  g.fillStyle = "#c9a24a"; g.fillRect(x - s * 0.5, y - s * 0.05, s * 0.12, s * 0.08); g.fillRect(x + s * 0.38, y - s * 0.05, s * 0.12, s * 0.08); g.strokeRect(x - s * 0.5, y - s * 0.05, s * 0.12, s * 0.08); g.strokeRect(x + s * 0.38, y - s * 0.05, s * 0.12, s * 0.08);
  void lid;
}

export function bill(g: Ctx, x: number, y: number, w: number, rot: number, rot2 = 0, decay = 0, seed = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, Math.cos(rot2));
  const h = w * 0.42; const p = new Path2D();
  if (decay > 0) { const r = rng(seed); p.moveTo(-w / 2, -h / 2); for (let k = 0; k <= 8; k++) p.lineTo(-w / 2 + (w * k) / 8, -h / 2 + r() * h * 0.2 * decay); for (let k = 0; k <= 4; k++) p.lineTo(w / 2 - r() * w * 0.1 * decay, -h / 2 + (h * k) / 4); for (let k = 8; k >= 0; k--) p.lineTo(-w / 2 + (w * k) / 8, h / 2 - r() * h * 0.25 * decay); p.closePath(); }
  else p.rect(-w / 2, -h / 2, w, h);
  g.fillStyle = decay ? "#9aa67e" : "#b9c4a0"; g.fill(p);
  g.save(); g.clip(p); g.strokeStyle = "rgba(40,60,40,0.55)"; g.lineWidth = 1.2; g.strokeRect(-w / 2 + w * 0.06, -h / 2 + h * 0.12, w * 0.88, h * 0.76);
  g.beginPath(); g.ellipse(0, 0, w * 0.13, h * 0.3, 0, 0, 7); g.stroke(); g.fillStyle = "rgba(40,60,40,0.6)"; g.font = `bold ${h * 0.3}px serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("20", -w * 0.36, -h * 0.22); g.fillText("20", w * 0.36, h * 0.22);
  if (decay) { g.fillStyle = `rgba(80,60,30,${0.35 * decay})`; g.fillRect(-w / 2, -h / 2, w, h); }
  g.restore(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(p); g.restore();
}
export function chutePack(g: Ctx, x: number, y: number, s: number, col = "#5c5a3a") {
  const p = new Path2D(); p.roundRect(x - s * 0.5, y - s * 0.65, s, s * 1.3, s * 0.15);
  g.fillStyle = col; g.fill(p); hatchIn(g, p, [x - s, y - s, x + s, y + s], 5, 0.8, 1.1, "rgba(0,0,0,0.35)"); g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke(p);
  g.strokeStyle = "#2a2a20"; g.lineWidth = 6; g.beginPath(); g.moveTo(x - s * 0.35, y - s * 0.65); g.lineTo(x - s * 0.3, y + s * 0.65); g.moveTo(x + s * 0.35, y - s * 0.65); g.lineTo(x + s * 0.3, y + s * 0.65); g.stroke();
  g.fillStyle = "#b8b8b0"; g.fillRect(x - s * 0.12, y - s * 0.1, s * 0.24, s * 0.16); g.lineWidth = 2; g.strokeRect(x - s * 0.12, y - s * 0.1, s * 0.24, s * 0.16);
}
