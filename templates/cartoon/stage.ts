// 2.5D cartoon stage on a plain 2D canvas: a perspective camera over a ground plane (y up, z into the screen), so
// painted layers get real parallax when the camera moves, plus painters for skies, hills, fields, fences, trees, water,
// dust, speed lines, pops and impact stars. Everything is flat-coloured with dark outlines, like a 2D cartoon.
import { rng } from "../bridge/paint";

export type Ctx = CanvasRenderingContext2D;
export const W = 1080, H = 1920;
export type Cam = { x: number; y: number; z: number; f: number; k: number; tilt: number; roll: number; shake: number };
/** camera: (x, y) at depth z, focal distance f (m), k = px per metre at the focal plane, tilt = horizon offset (px) */
export const cam0 = (o: Partial<Cam> = {}): Cam => ({ x: 0, y: 1.6, z: -10, f: 10, k: 260, tilt: 0, roll: 0, shake: 0, ...o });
export const INK = "#16121c";

/** world -> screen: [sx, sy, scale(px per m)] ; null when behind the camera */
export function proj(c: Cam, x: number, y: number, z: number): [number, number, number] | null {
  const d = z - c.z; if (d <= 0.2) return null;
  const s = (c.k * c.f) / d;
  return [W / 2 + (x - c.x) * s, H / 2 + c.tilt - (y - c.y) * s, s];
}
export const horizonY = (c: Cam) => H / 2 + c.tilt + c.y * 0; // ground at infinity projects to the eye line
export function camTransform(g: Ctx, c: Cam, t: number) {
  const sh = c.shake ? [Math.sin(t * 61) * c.shake, Math.cos(t * 47) * c.shake] : [0, 0];
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(W / 2 + sh[0], H / 2 + sh[1]); g.rotate(c.roll); g.translate(-W / 2, -H / 2);
}
/** put the canvas transform at a world point: metres, y up, scaled by perspective */
export function at(g: Ctx, c: Cam, x: number, y: number, z: number, extra = 1): number | null {
  const p = proj(c, x, y, z); if (!p) return null;
  const s = p[2] * extra;
  g.transform(s, 0, 0, -s, p[0], p[1]);
  return p[2];
}
export const outline = (s: number, m = 0.05, maxPx = 7) => Math.min(m, maxPx / Math.max(1, s));

// ---------------- sky ----------------
export function sky(g: Ctx, c: Cam, top: string, mid: string, low: string) {
  const hy = horizonY(c);
  const gr = g.createLinearGradient(0, -200, 0, hy + 40);
  gr.addColorStop(0, top); gr.addColorStop(0.6, mid); gr.addColorStop(1, low);
  g.fillStyle = gr; g.fillRect(-400, -400, W + 800, hy + 440);
}
export function sun(g: Ctx, c: Cam, x: number, y: number, r: number, col = "#fff1b8", glow = "rgba(255,230,150,0.35)") {
  const p = proj(c, x, y, 2000); if (!p) return;
  const R = r * p[2];
  const gr = g.createRadialGradient(p[0], p[1], R * 0.6, p[0], p[1], R * 3.2);
  gr.addColorStop(0, glow); gr.addColorStop(1, "rgba(255,230,150,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], R * 3.2, 0, 7); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], R, 0, 7); g.fill();
}
export function cloud(g: Ctx, c: Cam, x: number, y: number, z: number, w: number, seed: number, col = "#ffffff", shade = "#d9e4f2") {
  const p = proj(c, x, y, z); if (!p) return;
  const s = p[2] * w, r = rng(seed);
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < 6; i++) puffs.push([(i - 2.5) * 0.32 + (r() - 0.5) * 0.1, Math.sin((i / 5) * Math.PI) * 0.22 + r() * 0.08, 0.26 + r() * 0.14]);
  g.save(); g.translate(p[0], p[1]);
  g.fillStyle = shade; for (const [a, b, rr] of puffs) { g.beginPath(); g.arc(a * s, -b * s + 0.04 * s, rr * s, 0, 7); g.fill(); }
  g.fillStyle = col; for (const [a, b, rr] of puffs) { g.beginPath(); g.arc(a * s - 0.03 * s, -b * s - 0.02 * s, rr * s * 0.92, 0, 7); g.fill(); }
  g.fillRect(-1.0 * s, -0.02 * s, 2.0 * s, 0.1 * s);
  g.restore();
}
// ---------------- ground ----------------
export function ground(g: Ctx, c: Cam, near: string, far: string) {
  const hy = horizonY(c);
  const gr = g.createLinearGradient(0, hy, 0, H + 200);
  gr.addColorStop(0, far); gr.addColorStop(0.35, near); gr.addColorStop(1, near);
  g.fillStyle = gr; g.fillRect(-400, hy - 1, W + 800, H - hy + 600);
}
/** rolling hills band at depth z (a silhouette with flat shading) */
export function hills(g: Ctx, c: Cam, z: number, height: number, col: string, seed: number, x0 = -800, x1 = 800) {
  const r = rng(seed); const ph = [r() * 6, r() * 6, r() * 6];
  g.beginPath();
  let first = true;
  for (let x = x0; x <= x1; x += 6) {
    const y = height * (0.55 + 0.25 * Math.sin(x * 0.011 + ph[0]) + 0.15 * Math.sin(x * 0.033 + ph[1]) + 0.05 * Math.sin(x * 0.09 + ph[2]));
    const p = proj(c, x, y, z); if (!p) continue;
    if (first) { g.moveTo(p[0], p[1]); first = false; } else g.lineTo(p[0], p[1]);
  }
  const pr = proj(c, x1, 0, z), pl = proj(c, x0, 0, z);
  if (pr && pl) { g.lineTo(pr[0], pr[1] + 2); g.lineTo(pl[0], pl[1] + 2); }
  g.closePath(); g.fillStyle = col; g.fill();
}
/** a field of wheat between depths z0..z1: rows of swaying stalk tufts (crop: 0 eaten .. 1 full) */
export function wheat(g: Ctx, c: Cam, x0: number, x1: number, z0: number, z1: number, t: number, opts: { col?: string; dark?: string; crop?: (x: number, z: number) => number; wind?: number; seed?: number } = {}) {
  const col = opts.col ?? "#e8b84a", dark = opts.dark ?? "#b9862d", wind = opts.wind ?? 1;
  const rows: number[] = []; for (let z = z1; z >= z0; z -= Math.max(0.35, (z - c.z) * 0.06)) rows.push(z);
  for (const z of rows) {
    const pl = proj(c, x0, 0, z), pr = proj(c, x1, 0, z); if (!pl || !pr) continue;
    const s = pl[2]; const h = 1.05 * s; const step = Math.max(6, 0.32 * s);
    // a back band of colour so rows read as a solid crop
    g.fillStyle = dark; g.fillRect(pl[0], pl[1] - h * 0.55, pr[0] - pl[0], h * 0.6);
    const xs0 = Math.max(-60, pl[0]), xs1 = Math.min(W + 60, pr[0]);
    for (let x = xs0; x < xs1; x += step) {
      const wx = c.x + (x - W / 2) / s; const crop = opts.crop ? opts.crop(wx, z) : 1; if (crop <= 0.02) continue;
      const sway = Math.sin(t * 2.1 + wx * 0.7 + z * 0.3) * 0.12 * wind * h;
      const hh = h * (0.75 + 0.25 * Math.sin(wx * 3.1 + z)) * crop;
      g.strokeStyle = dark; g.lineWidth = Math.max(1.2, s * 0.035);
      g.beginPath(); g.moveTo(x, pl[1]); g.quadraticCurveTo(x, pl[1] - hh * 0.6, x + sway, pl[1] - hh); g.stroke();
      g.fillStyle = col; g.beginPath(); g.ellipse(x + sway, pl[1] - hh, Math.max(1.5, s * 0.06), Math.max(3, s * 0.17), sway / h * 1.5, 0, 7); g.fill();
    }
  }
}
/** wooden post-and-rail fence along x at depth z; broken: (x) => 0..1 how far a section is knocked out */
export function fence(g: Ctx, c: Cam, x0: number, x1: number, z: number, broken?: (x: number) => number, col = "#9a6a3a") {
  const step = 2.4;
  for (let x = x0; x <= x1; x += step) {
    const b = broken ? broken(x) : 0;
    const p = proj(c, x, 0, z); if (!p) continue;
    const s = p[2], OL = Math.max(1, Math.min(4, s * 0.03));
    g.save(); g.translate(p[0], p[1]); g.rotate(b * 0.9 * (x % 4.8 < 2.4 ? 1 : -1));
    g.fillStyle = INK; g.fillRect(-0.09 * s - OL, -1.25 * s - OL, 0.18 * s + 2 * OL, 1.25 * s + 2 * OL);
    g.fillStyle = col; g.fillRect(-0.09 * s, -1.25 * s, 0.18 * s, 1.25 * s);
    g.restore();
    if (x + step <= x1) {
      const q = proj(c, x + step, 0, z); if (!q) continue;
      for (const hy of [0.45, 0.95]) {
        if (b > 0.2 || (broken && broken(x + step) > 0.2)) continue;
        g.strokeStyle = INK; g.lineWidth = 0.13 * s + 2 * OL; g.beginPath(); g.moveTo(p[0], p[1] - hy * s); g.lineTo(q[0], q[1] - hy * q[2]); g.stroke();
        g.strokeStyle = col; g.lineWidth = 0.13 * s; g.beginPath(); g.moveTo(p[0], p[1] - hy * s); g.lineTo(q[0], q[1] - hy * q[2]); g.stroke();
      }
    }
  }
}
/** a gum tree: pale trunk with dark outline, clumpy olive canopy */
export function gumTree(g: Ctx, c: Cam, x: number, z: number, hgt: number, seed: number, t: number, col = "#7f9a58", dark = "#5c7a40") {
  const p = proj(c, x, 0, z); if (!p) return;
  const s = p[2], r = rng(seed), OL = Math.max(1, Math.min(4, s * 0.04));
  g.save(); g.translate(p[0], p[1]);
  const trunk = new Path2D();
  trunk.moveTo(-0.25 * s, 0); trunk.quadraticCurveTo(-0.1 * s, -hgt * 0.4 * s, -0.35 * s, -hgt * 0.75 * s); trunk.lineTo(-0.15 * s, -hgt * 0.78 * s);
  trunk.quadraticCurveTo(0.1 * s, -hgt * 0.45 * s, 0.4 * s, -hgt * 0.8 * s); trunk.lineTo(0.5 * s, -hgt * 0.76 * s); trunk.quadraticCurveTo(0.15 * s, -hgt * 0.4 * s, 0.25 * s, 0); trunk.closePath();
  g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(trunk); g.fillStyle = "#e6dccb"; g.fill(trunk);
  const sw = Math.sin(t * 1.2 + seed) * 0.08 * s;
  for (const [cx, cy, rr, cc] of [[-0.6, 0.78, 0.9, dark], [0.7, 0.82, 1.0, dark], [0, 0.95, 1.1, col], [-0.9, 0.9, 0.7, col], [0.9, 0.95, 0.75, col]] as [number, number, number, string][]) {
    const R = (rr + r() * 0.2) * s * hgt * 0.28;
    g.fillStyle = INK; g.beginPath(); g.ellipse(cx * s * hgt * 0.3 + sw, -cy * hgt * s, R + OL, R * 0.7 + OL, 0, 0, 7); g.fill();
  }
  for (const [cx, cy, rr, cc] of [[-0.6, 0.78, 0.9, dark], [0.7, 0.82, 1.0, dark], [0, 0.95, 1.1, col], [-0.9, 0.9, 0.7, col], [0.9, 0.95, 0.75, col]] as [number, number, number, string][]) {
    const R = (rr + 0.1) * s * hgt * 0.28;
    g.fillStyle = cc; g.beginPath(); g.ellipse(cx * s * hgt * 0.3 + sw, -cy * hgt * s, R, R * 0.7, 0, 0, 7); g.fill();
  }
  g.restore();
}
export function bush(g: Ctx, c: Cam, x: number, z: number, w: number, seed: number, col = "#8a9a4a") {
  const p = proj(c, x, 0, z); if (!p) return;
  const s = p[2] * w, r = rng(seed), OL = Math.max(1, Math.min(4, p[2] * 0.04));
  const blobs: [number, number, number][] = []; for (let i = 0; i < 5; i++) blobs.push([(i - 2) * 0.3 + (r() - 0.5) * 0.1, 0.25 + r() * 0.2, 0.3 + r() * 0.12]);
  g.fillStyle = INK; for (const [a, b, rr] of blobs) { g.beginPath(); g.arc(p[0] + a * s, p[1] - b * s, rr * s + OL, 0, 7); g.fill(); }
  g.fillStyle = col; for (const [a, b, rr] of blobs) { g.beginPath(); g.arc(p[0] + a * s, p[1] - b * s, rr * s, 0, 7); g.fill(); }
  g.fillStyle = "rgba(255,255,220,0.18)"; for (const [a, b, rr] of blobs) { g.beginPath(); g.arc(p[0] + a * s - rr * s * 0.25, p[1] - b * s - rr * s * 0.3, rr * s * 0.45, 0, 7); g.fill(); }
}
/** a flat pond / dam on the ground: ellipse with ripples */
export function pond(g: Ctx, c: Cam, x: number, z: number, rx: number, rz: number, t: number) {
  const n = 40, pts: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const p = proj(c, x + Math.cos(a) * rx, 0, z + Math.sin(a) * rz); if (p) pts.push([p[0], p[1]]); }
  if (pts.length < 3) return;
  g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath();
  g.fillStyle = "#c9a36a"; g.lineWidth = 10; g.strokeStyle = "#a9804c"; g.stroke(); g.fillStyle = "#5fa9c9"; g.fill();
  g.save(); g.clip();
  for (let i = 0; i < 6; i++) { const p = proj(c, x + Math.sin(i * 2.1) * rx * 0.6, 0, z + Math.cos(i * 1.7) * rz * 0.5); if (!p) continue; const k = (t * 0.6 + i * 0.17) % 1; g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; g.lineWidth = 3; g.beginPath(); g.ellipse(p[0], p[1], p[2] * (0.4 + k * 1.2), p[2] * (0.12 + k * 0.35), 0, 0, 7); g.stroke(); }
  g.restore();
}
// ---------------- effects ----------------
/** a puff of dust at a world point, age 0..1 */
export function dust(g: Ctx, c: Cam, x: number, y: number, z: number, age: number, size = 1, col = "#d9b98a") {
  if (age < 0 || age > 1) return;
  const p = proj(c, x, y, z); if (!p) return;
  const s = p[2] * size, a = 1 - age;
  for (let i = 0; i < 4; i++) {
    const ang = i * 1.7, rr = (0.25 + age * 0.55) * s * (0.8 + (i % 2) * 0.3);
    const px = p[0] + Math.cos(ang) * age * 0.5 * s, py = p[1] - (0.2 + age * 0.4 + Math.sin(ang) * 0.1) * s;
    g.fillStyle = `rgba(110,80,50,${0.35 * a})`; g.beginPath(); g.arc(px, py, rr + 2, 0, 7); g.fill();
    g.fillStyle = hexA(col, 0.9 * a); g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill();
  }
}
export const hexA = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
/** speed lines behind something moving (screen space) */
export function speedLines(g: Ctx, x: number, y: number, len: number, dir: number, t: number, n = 5, w = 6, col = "rgba(255,255,255,0.85)") {
  g.strokeStyle = col; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const k = ((t * 3 + i * 0.37) % 1), yy = y + (i - n / 2) * w * 3.5, l = len * (0.5 + 0.5 * Math.sin(i * 2.3));
    g.globalAlpha = 1 - k; g.lineWidth = w * (1 - k * 0.5);
    g.beginPath(); g.moveTo(x - dir * (20 + k * 60), yy); g.lineTo(x - dir * (20 + k * 60 + l), yy); g.stroke();
  }
  g.globalAlpha = 1;
}
/** cartoon impact star / burst (screen space) */
export function burst(g: Ctx, x: number, y: number, r: number, k: number, col = "#fff3a0", n = 10) {
  if (k <= 0) return;
  g.beginPath();
  for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const rr = (i % 2 ? 0.45 : 1) * r * k; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.lineWidth = Math.max(3, r * 0.08); g.strokeStyle = INK; g.stroke(); g.fillStyle = col; g.fill();
}
/** bold cartoon text with a thick outline (screen space); pop 0..1 scales it in with an overshoot */
export function popText(g: Ctx, text: string, x: number, y: number, size: number, k: number, col = "#ffffff", rot = 0, stroke = INK) {
  if (k <= 0) return;
  const sc = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 - (1 - k) * 0.6 : 1;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc);
  g.font = `800 ${size}px SubFont, Montserrat, Arial Black, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = size * 0.2; g.strokeStyle = stroke; g.strokeText(text, 0, 0);
  g.fillStyle = col; g.fillText(text, 0, 0);
  g.restore();
}
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeOutBack = (x: number) => { const k = clamp01(x), c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
