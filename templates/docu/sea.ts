// Sea, sky, fog and a two-masted brigantine in the "living engraving" look: flat watercolour washes, engraved
// wave strokes that move with the swell, hatched shadows, tapered ink. Pixel space, y down.
type Ctx = CanvasRenderingContext2D;
export const INK = "#1d1719";
export const PAL = { paper: "#e6dcc6", fog: "#b9c2ba", sky0: "#7d8f93", sky1: "#c9cbbd", sea0: "#2c444b", sea1: "#55706f", sail: "#e4d9bf", hull: "#2b2a2e", stripe: "#d8ccb0", wood: "#8a6a48", amber: "#e2a54c", blood: "#7a2b25" };

export const rng = (seed: number) => { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

export function hatchBox(g: Ctx, x0: number, y0: number, x1: number, y1: number, gap: number, ang: number, w: number, col = INK) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + gap, ca = Math.cos(ang), sa = Math.sin(ang);
  g.save(); g.strokeStyle = col; g.lineWidth = w; g.beginPath();
  for (let d = -R; d <= R; d += gap) { const ox = cx - sa * d, oy = cy + ca * d; g.moveTo(ox - ca * R, oy - sa * R); g.lineTo(ox + ca * R, oy + sa * R); }
  g.stroke(); g.restore();
}
export function hatchIn(g: Ctx, p: Path2D, box: number[], gap: number, ang: number, w: number, col = INK, cross = false) {
  g.save(); g.clip(p); hatchBox(g, box[0], box[1], box[2], box[3], gap, ang, w, col); if (cross) hatchBox(g, box[0], box[1], box[2], box[3], gap * 1.3, ang + 1.2, w * 0.8, col); g.restore();
}

/** sky with a soft sun glow and hatched cloud banks */
export function sky(g: Ctx, W: number, horizon: number, t: number, o: { top?: string; low?: string; sun?: [number, number]; sunCol?: string; clouds?: number; drift?: number } = {}) {
  const gr = g.createLinearGradient(0, 0, 0, horizon); gr.addColorStop(0, o.top ?? PAL.sky0); gr.addColorStop(1, o.low ?? PAL.sky1);
  g.fillStyle = gr; g.fillRect(-W, -2000, W * 3, horizon + 2000);
  if (o.sun) { const [sx, sy] = o.sun; const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 520); sg.addColorStop(0, o.sunCol ?? "rgba(255,226,170,0.85)"); sg.addColorStop(0.25, "rgba(255,214,150,0.35)"); sg.addColorStop(1, "rgba(255,214,150,0)"); g.fillStyle = sg; g.fillRect(sx - 600, sy - 600, 1200, 1200); }
  const n = o.clouds ?? 5, r = rng(77);
  for (let i = 0; i < n; i++) {
    const cx = ((r() * W * 1.6 + t * (o.drift ?? 6) * (0.5 + r())) % (W * 1.6)) - W * 0.3, cy = horizon * (0.15 + r() * 0.6), cw = 260 + r() * 360, ch = 50 + r() * 70;
    const p = new Path2D(); p.moveTo(cx - cw / 2, cy);
    const k = 5; for (let j = 0; j <= k; j++) { const x = cx - cw / 2 + (j / k) * cw; p.quadraticCurveTo(x - cw / k / 2, cy - ch * (0.6 + r() * 0.6) * Math.sin((j / k) * Math.PI + 0.2), x, cy - ch * 0.2 * Math.sin((j / k) * Math.PI)); }
    p.lineTo(cx + cw / 2, cy); p.closePath();
    g.fillStyle = "rgba(225,222,206,0.55)"; g.fill(p);
    hatchIn(g, p, [cx - cw / 2, cy - ch * 0.4, cx + cw / 2, cy + 4], 6, 0.0, 1.1, "rgba(40,50,60,0.35)");
  }
}

/** the open sea from the horizon to the bottom edge: wash + rows of engraved wave strokes in perspective */
export function sea(g: Ctx, W: number, H: number, horizon: number, t: number, o: { top?: string; low?: string; swell?: number; speed?: number; glint?: number; x0?: number } = {}) {
  const gr = g.createLinearGradient(0, horizon, 0, H); gr.addColorStop(0, o.top ?? PAL.sea1); gr.addColorStop(1, o.low ?? PAL.sea0);
  g.fillStyle = gr; g.fillRect(-W, horizon, W * 3, H - horizon + 2000);
  const sw = o.swell ?? 1, sp = o.speed ?? 1, x0 = o.x0 ?? 0;
  g.save(); g.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const d = Math.pow(i / 70, 1.9); const y = horizon + 2 + d * (H - horizon + 200); if (y > H + 40) break;
    const amp = (1.5 + d * 22) * sw, len = 40 + d * 520, w = 0.7 + d * 2.6, r = rng(i * 13 + 5);
    g.strokeStyle = `rgba(20,30,34,${0.25 + d * 0.45})`; g.lineWidth = w;
    const ph = r() * 100 + t * sp * (0.6 + d * 1.2);
    g.beginPath();
    for (let x = -60 - (x0 % len); x < W + 60; x += len) {
      const gap = r(); if (gap < 0.25) continue;
      const a = x + Math.sin(ph + x * 0.01) * len * 0.2, b = a + len * (0.35 + gap * 0.45), yy = y + Math.sin(ph * 0.7 + x * 0.013) * amp;
      g.moveTo(a, yy); g.quadraticCurveTo((a + b) / 2, yy - amp * 0.9, b, yy + amp * 0.1);
    }
    g.stroke();
    if (o.glint) { g.strokeStyle = `rgba(255,236,200,${o.glint * (0.5 - d * 0.4)})`; g.lineWidth = w * 0.7; g.beginPath(); for (let x = -40; x < W + 40; x += len * 1.7) { const a = x + Math.sin(ph * 1.3 + x) * 40, yy = y - amp * 0.6 + 2; g.moveTo(a, yy); g.lineTo(a + len * 0.25, yy); } g.stroke(); }
  }
  g.restore();
}

/** a band of foreground swell drawn over a hull so it sits in the water */
export function swellBand(g: Ctx, W: number, y: number, t: number, h = 120, col = PAL.sea0, amp = 14) {
  const p = new Path2D(); p.moveTo(-50, y + h);
  for (let x = -50; x <= W + 50; x += 20) p.lineTo(x, y + Math.sin(x * 0.012 + t * 1.4) * amp + Math.sin(x * 0.031 - t * 2.1) * amp * 0.35);
  p.lineTo(W + 50, y + h); p.closePath();
  const gr = g.createLinearGradient(0, y - amp, 0, y + h); gr.addColorStop(0, PAL.sea1); gr.addColorStop(1, col); g.fillStyle = gr; g.fill(p);
  g.save(); g.clip(p); g.strokeStyle = "rgba(20,30,34,0.6)"; g.lineWidth = 2;
  for (let r = 0; r < 5; r++) { g.beginPath(); for (let x = -50; x <= W + 50; x += 20) { const yy = y + 14 + r * (h / 5) + Math.sin(x * 0.016 + t * 1.2 + r) * amp * 0.5; if (x === -50) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
  g.restore();
  g.strokeStyle = "rgba(240,236,220,0.75)"; g.lineWidth = 3; g.beginPath(); for (let x = -50; x <= W + 50; x += 20) { const yy = y + Math.sin(x * 0.012 + t * 1.4) * amp + Math.sin(x * 0.031 - t * 2.1) * amp * 0.35; if (x === -50) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke();
}

/** drifting fog banks */
export function fog(g: Ctx, W: number, H: number, t: number, amt = 1, y0 = 0, y1 = H) {
  const r = rng(31);
  for (let i = 0; i < 9; i++) {
    const y = y0 + r() * (y1 - y0), x = ((r() * W * 2 + t * (12 + r() * 20)) % (W * 2)) - W * 0.5, w = 500 + r() * 700, h = 60 + r() * 140;
    const gr = g.createRadialGradient(x, y, 0, x, y, w / 2); gr.addColorStop(0, `rgba(214,220,210,${0.35 * amt})`); gr.addColorStop(1, "rgba(214,220,210,0)");
    g.save(); g.translate(x, y); g.scale(1, h / w); g.translate(-x, -y); g.fillStyle = gr; g.fillRect(x - w / 2, y - w / 2, w, w); g.restore();
  }
}

// ---------------------------------------------------------------- the brigantine
export type ShipOpts = { torn?: number; lifeboat?: boolean; sailsSet?: number; flag?: boolean; lit?: number; ghost?: number };
/** draw the brigantine side-on, facing +x, in ship units (1 unit ~ 1 m), waterline at y = 0, y down.
 *  call inside g.translate(x, y); g.scale(px per m); g.rotate(roll). t drives flapping canvas. */
export function brigantine(g: Ctx, t: number, o: ShipOpts = {}) {
  const lw = 1 / Math.abs(g.getTransform().a || 1);       // one pixel in ship units
  const torn = o.torn ?? 0, set = o.sailsSet ?? 1;
  g.lineJoin = "round"; g.lineCap = "round";
  // ---- rigging behind (thin ink) ----
  const fm = 6.5, mm = -4.5, fTop = -27, mTop = -28, bowX = 15.2, bsTip: [number, number] = [24, -7.2];
  g.strokeStyle = "rgba(29,23,25,0.85)"; g.lineWidth = 1.4 * lw;
  const line = (a: number[], b: number[]) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  line(bsTip, [fm, fTop + 2]); line([bowX, -4.2], [fm, -12]); line([fm, fTop + 1], [mm, mTop + 6]); line([mm, mTop + 1], [-15.5, -4.4]);
  for (const [mx, top] of [[fm, fTop], [mm, mTop]] as [number, number][]) for (let k = -2; k <= 2; k++) line([mx + k * 0.9, -3.8], [mx, top * 0.42]);
  // ---- hull ----
  const hull = new Path2D();
  hull.moveTo(-15, -4.6); hull.quadraticCurveTo(0, -3.4, bowX, -4.9); hull.quadraticCurveTo(15.6, -2.5, 12.5, 1.2); hull.lineTo(-13.6, 1.2); hull.quadraticCurveTo(-15.4, -1.4, -15, -4.6); hull.closePath();
  g.fillStyle = PAL.hull; g.fill(hull);
  g.save(); g.clip(hull);
  g.fillStyle = PAL.stripe; g.beginPath(); g.moveTo(-15.2, -3.6); g.quadraticCurveTo(0, -2.55, 15.6, -3.9); g.lineTo(15.6, -3.3); g.quadraticCurveTo(0, -2.0, -15.2, -3.05); g.fill();
  hatchBox(g, -16, -1.8, 16, 1.4, 0.34, 0.08, 1.0 * lw, "rgba(255,240,220,0.18)");
  g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(-16, -0.5, 33, 2);
  // planking seams
  g.strokeStyle = "rgba(255,240,220,0.14)"; g.lineWidth = 1 * lw; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-15, -2.4 + k * 0.6); g.quadraticCurveTo(0, -1.4 + k * 0.6, 15.5, -2.8 + k * 0.6); g.stroke(); }
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 3 * lw; g.stroke(hull);
  // rail + deckhouse + bowsprit
  g.fillStyle = PAL.wood; g.beginPath(); g.moveTo(-15, -4.6); g.quadraticCurveTo(0, -3.4, bowX, -4.9); g.lineTo(bowX, -5.4); g.quadraticCurveTo(0, -3.95, -15, -5.15); g.closePath(); g.fill(); g.stroke();
  const house = new Path2D(); house.rect(-11.5, -6.6, 5.2, 2.6); g.fillStyle = "#cfc2a5"; g.fill(house); hatchIn(g, house, [-12, -7, -6, -3.8], 0.28, 1.57, 1 * lw, "rgba(29,23,25,0.4)"); g.stroke(house);
  for (let k = 0; k < 3; k++) { g.fillStyle = "#3a3530"; g.fillRect(-11 + k * 1.6, -5.9, 0.7, 0.8); }
  g.lineWidth = 3.2 * lw; line([bowX - 1, -5.0], bsTip);
  if (o.lifeboat) { const lb = new Path2D(); lb.moveTo(-3, -5.6); lb.quadraticCurveTo(0, -4.4, 3.2, -5.6); lb.lineTo(2.8, -6.3); lb.lineTo(-2.7, -6.3); lb.closePath(); g.fillStyle = "#e9e1cf"; g.fill(lb); g.lineWidth = 2 * lw; g.stroke(lb); }
  // ---- masts ----
  g.lineWidth = 5 * lw; g.strokeStyle = INK; line([fm, -4.5], [fm, fTop]); line([mm, -4.5], [mm, mTop]);
  g.lineWidth = 3 * lw; g.strokeStyle = PAL.wood; line([fm, -4.6], [fm, fTop + 0.3]); line([mm, -4.6], [mm, mTop + 0.3]); g.strokeStyle = INK;
  // ---- foremast square sails: course, topsail, topgallant, royal ----
  const yards: [number, number][] = [[-9.5, 7.2], [-14.8, 6.2], [-19.6, 4.8], [-23.6, 3.6]];
  yards.forEach(([y, hw], k) => {
    const flap = Math.sin(t * 2.3 + k * 1.7) * 0.35, belly = (0.9 + Math.sin(t * 0.9 + k) * 0.2) * set;
    g.lineWidth = 3.2 * lw; line([fm - hw, y], [fm + hw, y]);
    const ny = k === 0 ? -5.6 : yards[k - 1][0], bw = k === 0 ? hw * 1.05 : yards[k - 1][1];
    const isTorn = torn > 0 && (k === 1 || k === 3);
    const furled = set < 0.5 && k >= 2;
    if (furled) { g.fillStyle = PAL.sail; g.beginPath(); g.ellipse(fm, y + 0.3, hw * 0.95, 0.35, 0, 0, 7); g.fill(); g.lineWidth = 1.6 * lw; g.stroke(); return; }
    const s = new Path2D(); const drop = isTorn ? (ny - y) * (0.55 + flap * 0.2) : ny - y;
    s.moveTo(fm - hw * 0.98, y); s.lineTo(fm + hw * 0.98, y);
    s.quadraticCurveTo(fm + bw + belly * 1.2, y + drop * 0.5, fm + bw * (isTorn ? 0.7 : 1) + flap, y + drop);
    if (isTorn) { const n = 7; for (let j = 0; j <= n; j++) { const x = fm + bw * 0.7 - (j / n) * bw * 1.5 + flap; s.lineTo(x, y + drop * (j % 2 ? 0.82 : 1) + Math.sin(t * 5 + j) * 0.2); } }
    else s.quadraticCurveTo(fm, y + drop + belly * 0.6, fm - bw + flap, y + drop);
    s.quadraticCurveTo(fm - bw - belly * 0.4, y + drop * 0.5, fm - hw * 0.98, y); s.closePath();
    g.fillStyle = PAL.sail; g.fill(s);
    hatchIn(g, s, [fm - hw - 2, y, fm + hw + 2, ny + 1], 0.32, 1.45, 1.1 * lw, "rgba(29,23,25,0.45)");
    g.save(); g.clip(s); const sh = g.createLinearGradient(fm - hw, 0, fm + hw, 0); sh.addColorStop(0, "rgba(255,240,210,0.5)"); sh.addColorStop(0.5, "rgba(255,240,210,0)"); sh.addColorStop(1, "rgba(40,40,50,0.25)"); g.fillStyle = sh; g.fill(s); g.restore();
    g.lineWidth = 2 * lw; g.stroke(s);
    if (isTorn) { g.lineWidth = 1.2 * lw; for (let j = 0; j < 3; j++) { const x = fm - bw * 0.6 + j * bw * 0.5; g.beginPath(); g.moveTo(x, y + drop * 0.85); g.quadraticCurveTo(x + Math.sin(t * 3 + j) * 0.8, y + drop * 1.1, x + Math.sin(t * 4 + j) * 1.2, ny - 0.4); g.stroke(); } }
  });
  // ---- main: gaff-rigged mainsail + boom ----
  {
    const boomY = -7.2, gaffY = -19, flap = Math.sin(t * 1.9) * 0.4;
    g.lineWidth = 3 * lw; line([mm, boomY], [-16.5, boomY + 0.6]); line([mm, gaffY], [-13.2, gaffY + 4.6]);
    const s = new Path2D(); s.moveTo(mm - 0.2, gaffY + 0.3); s.lineTo(-13 + flap, gaffY + 4.8);
    if (torn > 0) { s.quadraticCurveTo(-15 + flap, -12, -11 + flap * 2, -10); s.lineTo(-9, -12.2); s.lineTo(-7.5, -9.5); s.lineTo(mm - 0.3, -9); }
    else { s.quadraticCurveTo(-16.5 + flap, -12, -16.2 + flap, boomY + 0.4); s.lineTo(mm - 0.3, boomY - 0.2); }
    s.closePath(); g.fillStyle = PAL.sail; g.fill(s);
    hatchIn(g, s, [-17, gaffY, mm, boomY], 0.3, 0.2, 1.1 * lw, "rgba(29,23,25,0.42)");
    g.lineWidth = 2 * lw; g.stroke(s);
  }
  // ---- jibs ----
  for (let k = 0; k < 3; k++) {
    const top: [number, number] = [fm + 0.3, fTop + 3 + k * 4.5], foot: [number, number] = [bsTip[0] - k * 3.2, bsTip[1] + k * 0.9], tack: [number, number] = [fm + 3 + k * 1.2, -6.2 - k * 0.3];
    if (torn > 0 && k === 0) continue;
    const s = new Path2D(); s.moveTo(top[0], top[1]); s.lineTo(foot[0], foot[1]); s.quadraticCurveTo((foot[0] + tack[0]) / 2, (foot[1] + tack[1]) / 2 + 0.9 + Math.sin(t * 2 + k) * 0.3, tack[0], tack[1]); s.quadraticCurveTo(top[0] + 2.6, (top[1] + tack[1]) / 2, top[0], top[1]); s.closePath();
    g.fillStyle = PAL.sail; g.fill(s); hatchIn(g, s, [fm, fTop, bsTip[0], -5], 0.34, 1.0, 1 * lw, "rgba(29,23,25,0.35)"); g.lineWidth = 1.8 * lw; g.stroke(s);
  }
  // pennant / ensign
  if (o.flag !== false) { const f = new Path2D(); const w0 = Math.sin(t * 4) * 0.5; f.moveTo(mm, mTop); f.quadraticCurveTo(mm - 2, mTop + 0.3 + w0, mm - 4.2, mTop + 0.6 - w0); f.lineTo(mm, mTop + 1.1); f.closePath(); g.fillStyle = PAL.blood; g.fill(f); g.lineWidth = 1.2 * lw; g.stroke(f); }
  // a lantern glow on the deckhouse (for night shots)
  if (o.lit) { const lg = g.createRadialGradient(-9, -6.8, 0, -9, -6.8, 5); lg.addColorStop(0, `rgba(255,190,100,${0.8 * o.lit})`); lg.addColorStop(1, "rgba(255,190,100,0)"); g.fillStyle = lg; g.fillRect(-14, -12, 10, 10); }
}
