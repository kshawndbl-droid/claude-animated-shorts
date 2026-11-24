// Props and places for "Medusa": a Greek myth told in the living-engraving look, with its own identity:
// lamp-lit marble, deep Aegean teal, aged bronze and one colour of danger (snake green). Units are pixels unless noted.
import { INK, rng } from "../docu/sea";
type Ctx = CanvasRenderingContext2D;

export const GR = { night0: "#081417", night1: "#17343a", marble: "#ddd3bd", marbleS: "#a99f8a", bronze: "#a8793a", bronzeD: "#5c3c18", gold: "#d6aa4a", teal: "#2f5a5a", stone: "#8e8a82", snake: "#56602f", blood: "#6a1d1a", lamp: "255,196,120", venom: "190,230,120" };

/** a fluted Doric column standing on y1, capital at y0 */
export function column(g: Ctx, x: number, y0: number, y1: number, w: number, lit = 1, col = GR.marble) {
  const sh = col === GR.marble ? GR.marbleS : "#4a4a46";
  const p = new Path2D(); p.moveTo(x - w * 0.5, y1); p.lineTo(x - w * 0.42, y0 + w * 0.35); p.lineTo(x + w * 0.42, y0 + w * 0.35); p.lineTo(x + w * 0.5, y1); p.closePath();
  const lg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); lg.addColorStop(0, sh); lg.addColorStop(0.35, col); lg.addColorStop(1, sh);
  g.fillStyle = lg; g.fill(p);
  g.save(); g.clip(p); g.strokeStyle = "rgba(40,30,25,0.35)"; g.lineWidth = Math.max(1, w * 0.02);
  for (let k = 1; k < 7; k++) { const fx = x - w * 0.5 + (w * k) / 7; g.beginPath(); g.moveTo(fx, y1); g.lineTo(x + (fx - x) * 0.84, y0); g.stroke(); }
  g.fillStyle = `rgba(20,14,12,${0.35 * lit})`; g.fillRect(x + w * 0.15, y0, w * 0.4, y1 - y0); g.restore();
  g.strokeStyle = INK; g.lineWidth = Math.max(1.5, w * 0.035); g.stroke(p);
  // echinus + abacus
  const cap = new Path2D(); cap.moveTo(x - w * 0.42, y0 + w * 0.35); cap.quadraticCurveTo(x - w * 0.7, y0 + w * 0.2, x - w * 0.72, y0 + w * 0.12); cap.lineTo(x + w * 0.72, y0 + w * 0.12); cap.quadraticCurveTo(x + w * 0.7, y0 + w * 0.2, x + w * 0.42, y0 + w * 0.35); cap.closePath();
  g.fillStyle = col; g.fill(cap); g.stroke(cap); g.fillStyle = col; g.fillRect(x - w * 0.75, y0 - w * 0.02, w * 1.5, w * 0.14); g.strokeRect(x - w * 0.75, y0 - w * 0.02, w * 1.5, w * 0.14);
  g.fillRect(x - w * 0.6, y1 - w * 0.08, w * 1.2, w * 0.1); g.strokeRect(x - w * 0.6, y1 - w * 0.08, w * 1.2, w * 0.1);
}

/** a jagged rock ridge filling below its skyline */
export function ridge(g: Ctx, W: number, H: number, y: number, amp: number, seed: number, col: string, edge = "rgba(0,0,0,0)") {
  const r = rng(seed); g.beginPath(); g.moveTo(-20, H + 20); let x = -20; g.lineTo(x, y);
  while (x < W + 40) { x += 40 + r() * 90; g.lineTo(x, y - r() * amp + (r() < 0.2 ? amp * 0.4 : 0)); }
  g.lineTo(W + 40, H + 20); g.closePath(); g.fillStyle = col; g.fill(); if (edge !== "rgba(0,0,0,0)") { g.strokeStyle = edge; g.lineWidth = 3; g.stroke(); }
}

/** the polished bronze shield, centred on 0,0, radius r. Returns the inner face path (for reflections). */
export function shield(g: Ctx, r: number, t: number, shine = 1): Path2D {
  const rim = new Path2D(); rim.arc(0, 0, r, 0, Math.PI * 2);
  const face = new Path2D(); face.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  const bg = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r); bg.addColorStop(0, "#e9c27a"); bg.addColorStop(0.55, GR.bronze); bg.addColorStop(1, GR.bronzeD);
  g.fillStyle = bg; g.fill(rim); g.strokeStyle = INK; g.lineWidth = Math.max(2, r * 0.025); g.stroke(rim);
  g.fillStyle = "#b98a46"; g.fill(face); g.stroke(face);
  // a slow light sweep across the polished face
  g.save(); g.clip(face); const sx = Math.sin(t * 0.6) * r * 0.8;
  const sw = g.createLinearGradient(sx - r * 0.4, -r, sx + r * 0.4, r); sw.addColorStop(0, "rgba(255,240,200,0)"); sw.addColorStop(0.5, `rgba(255,240,200,${0.35 * shine})`); sw.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = sw; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
  // rivets on the rim
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; g.fillStyle = "#e3c07c"; g.beginPath(); g.arc(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, r * 0.022, 0, 7); g.fill(); g.lineWidth = 1.5; g.stroke(); }
  return face;
}

/** Hermes' harpe: a straight blade with a hooked sickle near the tip. Hilt at 0,0, blade along -y, length L. */
export function harpe(g: Ctx, L: number, glint = 0) {
  g.lineJoin = "round";
  const b = new Path2D(); b.moveTo(-L * 0.03, -L * 0.22); b.lineTo(-L * 0.035, -L * 0.85); b.quadraticCurveTo(-L * 0.04, -L * 1.05, L * 0.12, -L * 1.08); b.quadraticCurveTo(L * 0.3, -L * 1.06, L * 0.32, -L * 0.88);
  b.quadraticCurveTo(L * 0.22, -L * 0.98, L * 0.1, -L * 0.96); b.quadraticCurveTo(L * 0.035, -L * 0.94, L * 0.035, -L * 0.8); b.lineTo(L * 0.03, -L * 0.22); b.closePath();
  const bg = g.createLinearGradient(-L * 0.05, 0, L * 0.1, 0); bg.addColorStop(0, "#9aa0a4"); bg.addColorStop(0.5, "#e8ecec"); bg.addColorStop(1, "#7d8488"); g.fillStyle = bg; g.fill(b);
  g.strokeStyle = INK; g.lineWidth = Math.max(2, L * 0.012); g.stroke(b);
  g.fillStyle = GR.gold; g.fillRect(-L * 0.12, -L * 0.24, L * 0.24, L * 0.035); g.strokeRect(-L * 0.12, -L * 0.24, L * 0.24, L * 0.035);
  g.fillStyle = "#4a2c1a"; g.fillRect(-L * 0.03, -L * 0.2, L * 0.06, L * 0.2); g.strokeRect(-L * 0.03, -L * 0.2, L * 0.06, L * 0.2);
  if (glint > 0) { g.save(); g.globalCompositeOperation = "screen"; const gg = g.createRadialGradient(L * 0.12, -L * 1.0, 0, L * 0.12, -L * 1.0, L * 0.35); gg.addColorStop(0, `rgba(255,255,255,${glint})`); gg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gg; g.fillRect(-L * 0.3, -L * 1.4, L * 0.8, L * 0.8); g.restore(); }
}

/** a winged sandal seen from the side, sole on y=0, toe toward +x, size s */
export function wingedSandal(g: Ctx, s: number, t: number) {
  const sole = new Path2D(); sole.moveTo(-s * 0.5, 0); sole.quadraticCurveTo(0, s * 0.08, s * 0.55, 0); sole.lineTo(s * 0.55, -s * 0.06); sole.lineTo(-s * 0.5, -s * 0.06); sole.closePath();
  g.fillStyle = "#7a5230"; g.fill(sole); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(sole);
  for (let k = 0; k < 4; k++) { g.strokeStyle = "#5a3a1e"; g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(-s * 0.35 + k * s * 0.22, -s * 0.06); g.quadraticCurveTo(-s * 0.2 + k * s * 0.15, -s * 0.3, -s * 0.3, -s * 0.5 - k * s * 0.03); g.stroke(); }
  const fl = Math.sin(t * 9) * 0.25;
  for (let k = 0; k < 5; k++) { g.save(); g.translate(-s * 0.35, -s * 0.38); g.rotate(-2.3 + k * 0.22 + fl); const f = new Path2D(); f.ellipse(s * (0.22 + k * 0.02), 0, s * (0.24 + k * 0.03), s * 0.06, 0, 0, 7); g.fillStyle = "#f2ece0"; g.fill(f); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(f); g.restore(); }
}

/** the kibisis: a leather satchel with a drawstring, centred at 0,0 */
export function kibisis(g: Ctx, s: number) {
  const b = new Path2D(); b.moveTo(-s * 0.4, -s * 0.3); b.quadraticCurveTo(-s * 0.6, s * 0.35, 0, s * 0.45); b.quadraticCurveTo(s * 0.6, s * 0.35, s * 0.4, -s * 0.3); b.quadraticCurveTo(0, -s * 0.2, -s * 0.4, -s * 0.3); b.closePath();
  const lg = g.createLinearGradient(-s * 0.5, 0, s * 0.5, 0); lg.addColorStop(0, "#6a4626"); lg.addColorStop(0.4, "#946638"); lg.addColorStop(1, "#4a2e16"); g.fillStyle = lg; g.fill(b); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(b);
  g.strokeStyle = GR.gold; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(-s * 0.42, -s * 0.22); g.quadraticCurveTo(0, -s * 0.12, s * 0.42, -s * 0.22); g.stroke();
  g.strokeStyle = "#3a2410"; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(-s * 0.3, -s * 0.28); g.quadraticCurveTo(-s * 0.1, -s * 0.7, s * 0.25, -s * 0.28); g.stroke();
}

/** Pegasus rearing, facing +x, body centre at 0,0, body length about 2 units (scale outside). glow 0..1 adds light. */
export function pegasus(g: Ctx, t: number, flap: number, lw: number) {
  const W1 = "#f4f0e6", W2 = "#c9c3b4";
  const wing = (dark: boolean, off: number) => {
    // an arched wing: a bony leading edge from the shoulder to the wrist and tip, long primaries hanging back from it
    g.save(); g.translate(0.1 + off, -0.34 - off * 0.4); g.rotate(0.5 + Math.sin(flap) * 0.4);
    const arm = (u: number) => { const x = -0.2 * u - 1.0 * u * u, y = -1.5 * u + 0.5 * u * u; return [x, y]; };
    for (let k = 13; k >= 0; k--) { const u = 0.12 + (k / 13) * 0.88, [x, y] = arm(u), L = 0.35 + u * 0.95, a = 2.2 + u * 0.9;
      g.save(); g.translate(x, y); g.rotate(a); const f = new Path2D(); f.moveTo(0, -0.05); f.quadraticCurveTo(L * 0.55, -0.1, L, 0); f.quadraticCurveTo(L * 0.5, 0.08, 0, 0.05); f.closePath();
      g.fillStyle = dark ? W2 : (k % 2 ? W1 : "#ebe5d8"); g.fill(f); g.strokeStyle = INK; g.lineWidth = 1.8 * lw; g.stroke(f); g.restore(); }
    // coverts along the arm
    for (let k = 9; k >= 0; k--) { const u = 0.05 + (k / 9) * 0.75, [x, y] = arm(u); g.save(); g.translate(x, y); g.rotate(2.0 + u * 0.8); const f = new Path2D(); f.ellipse(0.12, 0, 0.17, 0.07, 0, 0, 7); g.fillStyle = dark ? "#b7b1a2" : "#fbf8f1"; g.fill(f); g.strokeStyle = INK; g.lineWidth = 1.6 * lw; g.stroke(f); g.restore(); }
    g.strokeStyle = INK; g.lineWidth = 3 * lw; g.beginPath(); for (let k = 0; k <= 20; k++) { const [x, y] = arm(k / 20); if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    g.restore();
  };
  wing(true, 0.18);
  g.lineCap = "round"; g.lineJoin = "round";
  const leg = (pts: number[][], w: number, c: string) => { const e = pts[pts.length - 1]; g.fillStyle = "#3a3430"; g.beginPath(); g.ellipse(e[0], e[1] + 0.03, w * 0.6, w * 0.4, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = w + 7 * lw; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); g.stroke(); g.strokeStyle = c; g.lineWidth = w; g.stroke(); };
  leg([[-0.45, 0.25], [-0.55, 0.85], [-0.5, 1.3]], 0.13, W2); leg([[0.45, 0.2], [0.82, 0.45], [0.88, 0.78]], 0.12, W2);
  // tail
  g.strokeStyle = INK; g.lineWidth = 0.2 + 5 * lw; g.beginPath(); g.moveTo(-0.85, -0.1); g.quadraticCurveTo(-1.45, 0.0, -1.5, 0.75 + Math.sin(t * 3) * 0.08); g.stroke(); g.strokeStyle = W2; g.lineWidth = 0.2; g.stroke();
  // body + neck + head as one shape
  const b = new Path2D();
  b.moveTo(-0.95, -0.05); b.quadraticCurveTo(-0.9, -0.42, -0.3, -0.38); b.quadraticCurveTo(0.35, -0.42, 0.62, -0.45);
  b.quadraticCurveTo(0.85, -0.85, 1.08, -1.05); b.lineTo(1.12, -1.2); b.lineTo(1.2, -1.06);
  b.quadraticCurveTo(1.45, -0.92, 1.66, -0.62); b.quadraticCurveTo(1.68, -0.5, 1.56, -0.48); b.quadraticCurveTo(1.38, -0.52, 1.26, -0.6);
  b.quadraticCurveTo(1.1, -0.4, 0.95, -0.05); b.quadraticCurveTo(0.8, 0.32, 0.3, 0.36); b.quadraticCurveTo(-0.4, 0.42, -0.8, 0.3); b.quadraticCurveTo(-1.02, 0.18, -0.95, -0.05); b.closePath();
  const bg = g.createLinearGradient(0, -1, 0, 0.4); bg.addColorStop(0, "#ffffff"); bg.addColorStop(1, W2); g.fillStyle = bg; g.fill(b);
  g.save(); g.clip(b); g.strokeStyle = "rgba(60,55,50,0.25)"; g.lineWidth = 1.2 * lw; for (let y = 0.05; y < 0.5; y += 0.035) { g.beginPath(); g.moveTo(-1, y); g.lineTo(1, y + 0.05); g.stroke(); } g.restore();
  g.strokeStyle = INK; g.lineWidth = 3.5 * lw; g.stroke(b);
  // mane, eye, nostril
  for (let k = 0; k < 6; k++) { const u = k / 6; g.strokeStyle = INK; g.lineWidth = 2 * lw; g.beginPath(); g.moveTo(0.65 + u * 0.45, -0.5 - u * 0.55); g.quadraticCurveTo(0.5 + u * 0.4, -0.55 - u * 0.5, 0.45 + u * 0.4 + Math.sin(t * 4 + k) * 0.03, -0.42 - u * 0.5); g.stroke(); }
  g.fillStyle = INK; g.beginPath(); g.ellipse(1.3, -0.82, 0.035, 0.025, 0.4, 0, 7); g.fill(); g.beginPath(); g.arc(1.6, -0.56, 0.02, 0, 7); g.fill();
  leg([[0.35, 0.25], [0.7, 0.5], [0.62, 0.85]], 0.13, W1); leg([[-0.7, 0.2], [-0.85, 0.75], [-0.78, 1.28]], 0.14, W1);
  wing(false, 0);
}
