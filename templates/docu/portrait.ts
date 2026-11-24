// "Living engraving" busts: a three-quarter head and shoulders drawn like a coloured 19th-century wood engraving.
// Contours are tapered ink strokes; colour is flat watercolour wash; form is built with engraving hatching (parallel
// and cross-hatched lines) clipped to shadow shapes, so faces read as mature and believable without a cartoon look.
// Units: head height = 1 (crown y=0, chin y=1), y down, facing +x (viewer's right). Scale/translate outside.
type Ctx = CanvasRenderingContext2D;

export type Bust = {
  skin: string; hair: string; coat: string; shirt?: string; tie?: string; lapel?: string; buttons?: string;
  hairStyle: "side" | "center-bun" | "child" | "swept" | "cropped" | "bob" | "long" | "curls" | "snakes";
  glasses?: "dark" | "wire";
  beard?: "full" | "none"; moustache?: "full" | "walrus" | "none"; age?: number; female?: boolean; child?: boolean;
  hat?: "none" | "captain" | "watch" | "corinthian" | "crown" | "winged"; hatCol?: string; collar?: "high" | "open" | "lace" | "chiton";
  jaw?: number; nose?: number; brow?: number; snakeLive?: number; crownCol?: string; plume?: string;   // small shape variations (-1..1) so faces differ
};
export type BustAnim = { blink?: number; lookX?: number; lookY?: number; tilt?: number; turn?: number; breathe?: number; brow?: number; mouth?: number; sad?: number };

export const INK = "#22181a";
let TIME = 0;
let WARP: ((x: number, y: number) => [number, number]) | null = null;
const wp = (q: number[]) => { if (!WARP) return q; const o: number[] = []; for (let i = 0; i < q.length; i += 2) { const [a, b] = WARP(q[i], q[i + 1]); o.push(a, b); } return o; };
const P = (pts0: number[][], close = true) => { const pts = pts0.map(wp); const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const q = pts[i]; if (q.length === 2) p.lineTo(q[0], q[1]); else if (q.length === 4) p.quadraticCurveTo(q[0], q[1], q[2], q[3]); else p.bezierCurveTo(q[0], q[1], q[2], q[3], q[4], q[5]); } if (close) p.closePath(); return p; };

/** engraving hatch: parallel strokes across a region, clipped by the caller */
function hatchLines(g: Ctx, x0: number, y0: number, x1: number, y1: number, gap: number, ang: number, w: number, col = INK, wob = 0) {
  g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round";
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + gap;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  g.beginPath();
  let k = 0;
  for (let d = -R; d <= R; d += gap, k++) {
    const ox = cx - sa * d, oy = cy + ca * d;
    const j = wob ? Math.sin(k * 2.3) * wob : 0;
    g.moveTo(ox - ca * R, oy - sa * R + j); g.lineTo(ox + ca * R, oy + sa * R - j);
  }
  g.stroke(); g.restore();
}
/** shade a region with hatching that thickens toward the dark side: layers of hatch with growing density */
function shadeRegion(g: Ctx, region: Path2D, box: number[], s: number, ang: number, dense = 1, cross = false, col = INK) {
  g.save(); g.clip(region);
  hatchLines(g, box[0], box[1], box[2], box[3], 0.022 / dense, ang, 1.25 / s, col);
  if (cross) hatchLines(g, box[0], box[1], box[2], box[3], 0.028 / dense, ang + 1.1, 1.0 / s, col);
  g.restore();
}
/** tapered ink stroke along a path given as points (width swells in the middle) */
function inkStroke(g: Ctx, pts0: number[][], w: number, col = INK) {
  const pts = pts0.map(wp);
  // sample a Catmull-Rom spline through pts, draw as a filled ribbon
  const S: number[][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 8; k++) { const t = k / 8, t2 = t * t, t3 = t2 * t;
      S.push([0, 1].map((d) => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))); }
  }
  S.push(pts[pts.length - 1]);
  const L: number[][] = [], R: number[][] = [];
  for (let i = 0; i < S.length; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
    const u = i / (S.length - 1), ww = w * 0.8 * (0.3 + 0.7 * Math.sin(Math.PI * u));
    L.push([S[i][0] - dy / n * ww, S[i][1] + dx / n * ww]); R.push([S[i][0] + dy / n * ww, S[i][1] - dx / n * ww]);
  }
  g.fillStyle = col; g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const q of L) g.lineTo(q[0], q[1]); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath(); g.fill();
}
const mixC = (a: string, b: string, k: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k);
  return "#" + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
};

/** draw the bust; s = pixels per head unit (to keep line widths constant on screen) */
export function drawBust(g: Ctx, B: Bust, A: BustAnim, t: number, s: number) {
  const lw = 1 / s;                        // one screen pixel in head units
  TIME = t;
  const tn = (A.turn ?? 0) * 0.06, br = (A.breathe ?? Math.sin(t * 1.5)) * 0.008;
  const jaw = B.jaw ?? 0, nose = B.nose ?? 0, age = B.age ?? 0.35, ch = B.child ? 1 : 0;
  const hairC = mixC(B.hair, "#bdb6ad", Math.max(0, age - 0.65) * 1.8);
  const skinS = mixC(B.skin, "#5a3a3a", 0.32);

  // ---------------- shoulders + coat (drawn first, under the head) ----------------
  g.save(); g.translate(0, br);
  const sw = B.female ? 0.68 : B.child ? 0.5 : 0.8;
  const coat = P([[-0.17, 1.0], [-0.45 * sw, 1.1, -0.85 * sw, 1.2, -1.0 * sw, 1.42], [-1.12 * sw, 1.62, -1.12 * sw, 2.0], [-1.16 * sw, 3.2], [-1.2 * sw, 7], [1.2 * sw, 7], [1.16 * sw, 3.2], [1.12 * sw, 2.0], [1.1 * sw, 1.6, 0.98 * sw, 1.4], [0.82 * sw, 1.16, 0.42 * sw, 1.08, 0.22, 0.98]]);
  g.fillStyle = B.coat; g.fill(coat);
  g.save(); g.clip(coat);
  // folds and the far-side shadow
  shadeRegion(g, P([[0.25, 1.0], [0.9, 1.1, 1.3, 1.6], [1.4, 7], [0.55, 7], [0.6, 1.8, 0.35, 1.3]]), [0, 0.9, 1.5, 7], s, 0.9, 1.2, true);
  shadeRegion(g, P([[-1.3, 2.0], [-1.0, 1.6, -0.8, 1.45], [-0.7, 1.9, -0.75, 7], [-1.3, 7]]), [-1.4, 1.4, -0.6, 7], s, 0.8, 0.8);
  g.restore();
  // shirt / collar / tie at the throat
  if (B.collar === "chiton") {
    // draped Greek chiton: a soft scooped neckline, a cloak (himation) thrown over the far shoulder, a brooch
    const nk = P([[-0.2, 0.98], [0.02, 1.2, 0.26, 0.98], [0.3, 1.04], [0.02, 1.3, -0.24, 1.04]]); g.fillStyle = B.shirt ?? "#e8e0cc"; g.fill(nk); inkStroke(g, [[-0.24, 1.04], [0.02, 1.3], [0.3, 1.04]], 2.4 * lw);
    for (let i = 0; i < 5; i++) inkStroke(g, [[-0.1 + i * 0.06, 1.22 + Math.abs(i - 2) * 0.01], [-0.16 + i * 0.07, 1.6 + i * 0.05], [-0.2 + i * 0.08, 2.2]], 1.6 * lw, "rgba(34,24,26,0.55)");
    const hm = P([[0.3 * sw / 0.8 + 0.1, 1.02], [0.9 * sw, 1.2, 1.15 * sw, 1.7], [1.2 * sw, 7], [0.3, 7], [0.55, 2.4, -0.55 * sw, 1.6], [-0.2, 1.35, 0.3, 1.05]]);
    g.fillStyle = mixC(B.coat, "#000000", 0.25); g.fill(hm); g.save(); g.clip(hm); hatchLines(g, -1, 1, 1.2, 4, 0.03, 1.0, 1.2 / s, "rgba(20,12,12,0.35)"); g.restore(); inkStroke(g, [[-0.55 * sw, 1.6], [0.1, 1.95], [0.55, 2.4], [0.3, 7]], 3 * lw);
    g.fillStyle = "#c9a13e"; g.beginPath(); g.arc(0.34, 1.12, 0.045, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 2 * lw; g.stroke();
  } else if (B.collar !== "lace") {
    const sh = P([[-0.12, 1.0], [0.0, 1.55], [0.22, 0.98]]); g.fillStyle = B.shirt ?? "#ece4d4"; g.fill(sh);
    if (B.tie) { const ti = P([[-0.04, 1.06], [0.1, 1.04], [0.07, 1.22], [0.03, 1.5], [-0.01, 1.22]]); g.fillStyle = B.tie; g.fill(ti); inkStroke(g, [[-0.04, 1.06], [0.03, 1.5], [0.1, 1.04]], 2.2 * lw); }
    inkStroke(g, [[-0.12, 1.0], [-0.02, 1.25], [0.0, 1.55]], 2.4 * lw); inkStroke(g, [[0.22, 0.98], [0.12, 1.3], [0.0, 1.55]], 2.4 * lw);
  } else {
    const lc = P([[-0.2, 0.98], [0.05, 1.16, 0.3, 0.98], [0.32, 1.06], [0.05, 1.26, -0.22, 1.06]]); g.fillStyle = "#efe7d8"; g.fill(lc);
    for (let i = 0; i < 9; i++) { const x = -0.2 + i * 0.06; inkStroke(g, [[x, 1.04 + Math.sin(i) * 0.01], [x + 0.01, 1.14 - Math.abs(i - 4) * 0.012]], 1.2 * lw); }
    inkStroke(g, [[-0.22, 1.06], [0.05, 1.26], [0.32, 1.06]], 2 * lw);
  }
  if (B.lapel) for (const sd of [-1, 1]) { const lp = sd < 0 ? P([[-0.13, 1.0], [-0.34, 1.22], [-0.05, 1.72], [0.0, 1.56]]) : P([[0.22, 0.98], [0.42, 1.18], [0.1, 1.7], [0.0, 1.56]]); g.fillStyle = B.lapel; g.fill(lp); inkStroke(g, sd < 0 ? [[-0.13, 1.0], [-0.36, 1.25], [-0.05, 1.75]] : [[0.22, 0.98], [0.46, 1.2], [0.1, 1.72]], 2.2 * lw); }
  if (B.buttons) for (let i = 0; i < 3; i++) for (const x of [-0.18 * sw / 0.8, 0.26 * sw / 0.8]) { g.fillStyle = B.buttons; g.beginPath(); g.arc(x + i * 0.0, 1.95 + i * 0.25, 0.028, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4 * lw; g.stroke(); }
  // coat contour: the same path, bold ink, plus two soft folds
  g.strokeStyle = INK; g.lineWidth = 4.5 * lw; g.lineJoin = "round"; g.stroke(coat);
  inkStroke(g, [[0.62 * sw, 1.55], [0.7 * sw, 2.1], [0.66 * sw, 3.4]], 2.4 * lw);
  inkStroke(g, [[-0.7 * sw, 1.5], [-0.76 * sw, 2.0], [-0.74 * sw, 3.4]], 2.4 * lw);
  g.restore();

  // ---------------- head ----------------
  g.save(); g.translate(0, br * 0.6);
  g.translate(-0.05, 0.6); g.rotate(A.tilt ?? 0); g.translate(0.05, -0.6);
  // neck
  const neck = P([[-0.2, 0.62], [-0.22, 0.9, -0.2, 1.06], [0.22, 1.04], [0.2, 0.92, 0.22, 0.82]]);
  g.fillStyle = B.skin; g.fill(neck); shadeRegion(g, P([[-0.25, 0.6], [0.25, 0.6], [0.25, 0.9], [0.0, 0.84], [-0.25, 0.95]]), [-0.3, 0.6, 0.3, 1.1], s, 0.5, 1.0, false, "#3a2222");
  inkStroke(g, [[-0.2, 0.66], [-0.21, 0.88], [-0.18, 1.04]], 3 * lw); inkStroke(g, [[0.2, 0.86], [0.22, 1.0]], 2.6 * lw);

  // hair mass behind the head
  const back = -0.44 - ch * 0.02;
  if (B.hairStyle === "center-bun") { const bun = new Path2D(); bun.ellipse(back - 0.02, 0.52, 0.15, 0.13, 0, 0, 7); g.fillStyle = hairC; g.fill(bun); g.save(); g.clip(bun); hatchLines(g, -0.7, 0.3, -0.2, 0.7, 0.025, -0.6, 1.3 / s); g.restore(); g.strokeStyle = INK; g.lineWidth = 3 * lw; g.stroke(bun); }
  // each person's own face: the canonical profile is remapped vertically (where brow, eyes, nose, mouth and chin sit)
  // and in depth (how far brow, nose, lips and chin project), so men, women and children get different faces
  const F = faceShape(B);
  const lerpK = (ks: number[], vs: number[], y: number) => { if (y <= ks[0]) return vs[0] + (y - ks[0]) * ((vs[1] - vs[0]) / (ks[1] - ks[0])); for (let i = 1; i < ks.length; i++) if (y <= ks[i]) { const u = (y - ks[i - 1]) / (ks[i] - ks[i - 1]); return vs[i - 1] + (vs[i] - vs[i - 1]) * u; } return vs[vs.length - 1] + (y - ks[ks.length - 1]); };
  const KY = [0.0, 0.42, 0.515, 0.66, 0.79, 0.93, 1.0, 1.25];
  const PK = [0.3, 0.42, 0.55, 0.66, 0.79, 0.95, 1.1], PV = [1, F.kb, F.kb * 0.8 + F.kn * 0.2, F.kn, F.kl, F.kc, F.kc];
  WARP = (x, y) => { const y2 = lerpK(KY, F.ys, y); const x2 = x > 0.22 ? 0.22 + (x - 0.22) * lerpK(PK, PV, y) * F.flat : x; return [x2 + (x > 0.22 ? F.hook * Math.exp(-((y - 0.6) ** 2) / 0.004) : 0), y2]; };
  const WY = (y: number) => lerpK(KY, F.ys, y);
  // skull + face silhouette (crown, back of head, jaw, chin, then the facial profile up to the forehead)
  const fx = tn;                            // features slide slightly with a small head turn
  const chin = 1.0 - ch * 0.04, jx = -0.12 - jaw * 0.04 + (B.female || B.child ? 0.035 : 0);
  const face = P([
    [-0.02, 0.0], [back, 0.02, back - 0.02, 0.45], [back + 0.02, 0.6, jx - 0.06, 0.82],                // back of skull to jaw angle
    [jx + 0.02, 0.92, 0.12 + fx, chin, 0.25 + fx, chin - 0.01],                                          // jaw line to chin
    [0.32 + fx, chin - 0.03, 0.335 + fx, 0.93],                                                           // chin front
    [0.31 + fx, 0.885, 0.325 + fx, 0.86], [0.345 + fx, 0.835, 0.335 + fx, 0.815],                       // chin dip, lower lip
    [0.325 + fx, 0.8, 0.345 + fx, 0.785], [0.355 + fx, 0.76, 0.35 + fx, 0.735],                         // mouth line, upper lip
    [0.36 + fx, 0.715, 0.375 + fx + nose * 0.02, 0.7], [0.44 + fx + nose * 0.03, 0.69, 0.43 + fx + nose * 0.03, 0.64], // under the nose to the tip
    [0.4 + fx + nose * 0.02, 0.55, 0.345 + fx, 0.47],                                                    // nose bridge
    [0.37 + fx, 0.42, 0.355 + fx, 0.38], [0.33 + fx, 0.2, 0.2, 0.06], [0.1, 0.0, -0.02, 0.0],           // brow ridge, forehead, crown
  ]);
  g.fillStyle = B.skin; g.fill(face);
  // ---- form shading inside the face (watercolour warmth + hatching) ----
  g.save(); g.clip(face);
  // warm cheek and nose wash
  const ck = g.createRadialGradient(0.12 + fx, 0.68, 0.01, 0.12 + fx, 0.68, 0.16); ck.addColorStop(0, "rgba(205,95,85,0.30)"); ck.addColorStop(1, "rgba(205,95,85,0)"); g.fillStyle = ck; g.fillRect(-0.1, 0.5, 0.4, 0.4);
  g.fillStyle = "rgba(205,95,85,0.18)"; g.beginPath(); g.ellipse(0.4 + fx, 0.64, 0.05, 0.04, 0, 0, 7); g.fill();
  // shadow side: the far plane of the face from the brow down the cheek (light comes from the left)
  const far = P([[0.25 + fx, 0.44], [0.3 + fx, 0.55, 0.33 + fx, 0.66], [0.36 + fx, 0.72, 0.34 + fx, 0.98], [0.5, 1.1], [0.5, 0.4]]);
  const soft = !!(B.female || B.child);
  g.fillStyle = skinS; g.globalAlpha = soft ? 0.28 : 0.35; g.fill(far); g.globalAlpha = 1; if (!soft) shadeRegion(g, far, [0.2, 0.4, 0.5, 1.1], s, 0.35, 1.3, false, "#3a2222");
  // eye socket shadow under the brow, temple, cheekbone underplane, jaw underside
  for (const [ex, ew] of [[0.07 + fx, 0.13], [0.28 + fx, 0.07]]) { const sg = g.createRadialGradient(ex, 0.5, 0.0, ex, 0.5, ew); sg.addColorStop(0, "rgba(110,55,50,0.2)"); sg.addColorStop(1, "rgba(110,55,50,0)"); g.fillStyle = sg; g.fillRect(ex - ew, 0.38, ew * 2, 0.24); }
  { const bg2 = g.createLinearGradient(back, 0, -0.1, 0); bg2.addColorStop(0, "rgba(90,45,45,0.35)"); bg2.addColorStop(1, "rgba(90,45,45,0)"); g.fillStyle = bg2; g.fillRect(back, 0.2, -0.1 - back, 0.9); }
  if (!soft) {
    shadeRegion(g, P([[jx - 0.02, 0.86], [0.05 + fx, 0.86, 0.25 + fx, 0.93], [0.25 + fx, 1.05], [jx - 0.05, 1.05]]), [-0.2, 0.8, 0.3, 1.1], s, -0.2, 0.8, false, "rgba(58,34,34,0.6)");
    shadeRegion(g, P([[0.0 + fx, 0.7], [0.12 + fx, 0.76, 0.22 + fx, 0.72], [0.22 + fx, 0.76], [0.05 + fx, 0.8]]), [-0.1, 0.65, 0.3, 0.85], s, 0.6, 0.9, false, "#3a2222");
  } else {
    // smooth watercolour modelling instead of hatching: soft jaw shadow and a cheekbone highlight
    const jg = g.createLinearGradient(0, 0.84, 0, 1.0); jg.addColorStop(0, "rgba(120,60,55,0)"); jg.addColorStop(1, "rgba(120,60,55,0.28)"); g.fillStyle = jg; g.fillRect(-0.4, 0.84, 0.8, 0.2);
    const hg = g.createRadialGradient(0.06 + fx, 0.6, 0, 0.06 + fx, 0.6, 0.12); hg.addColorStop(0, "rgba(255,240,225,0.35)"); hg.addColorStop(1, "rgba(255,240,225,0)"); g.fillStyle = hg; g.fillRect(-0.1, 0.45, 0.3, 0.3);
  }
  // under-nose shadow
  shadeRegion(g, P([[0.36 + fx, 0.7], [0.42 + fx, 0.7], [0.4 + fx, 0.735], [0.35 + fx, 0.74]]), [0.3, 0.68, 0.45, 0.76], s, 0.2, soft ? 0.9 : 1.6, false, soft ? "rgba(58,34,34,0.5)" : "#3a2222");
  // age lines
  if (age > 0.4) { const a = (age - 0.4) * 2; g.globalAlpha = Math.min(1, a); inkStroke(g, [[0.25 + fx, 0.69], [0.27 + fx, 0.76], [0.3 + fx, 0.8]], 1.6 * lw); inkStroke(g, [[0.12 + fx, 0.3], [0.25 + fx, 0.29]], 1.2 * lw); inkStroke(g, [[0.1 + fx, 0.34], [0.26 + fx, 0.335]], 1.0 * lw); g.globalAlpha = 1; }
  g.restore();
  // ---- ear ----
  const W0 = WARP; WARP = null;
  const ear = P([[-0.17, 0.47], [-0.27, 0.44, -0.29, 0.56], [-0.27, 0.68, -0.18, 0.7], [-0.15, 0.6, -0.17, 0.47]]);
  if (B.hairStyle !== "center-bun") { g.fillStyle = B.skin; g.fill(ear); shadeRegion(g, ear, [-0.3, 0.42, -0.1, 0.72], s, 0.4, 1.4, false, "#3a2222"); inkStroke(g, [[-0.17, 0.47], [-0.27, 0.45], [-0.285, 0.57], [-0.25, 0.68], [-0.18, 0.7]], 2.6 * lw); inkStroke(g, [[-0.2, 0.52], [-0.24, 0.56], [-0.21, 0.63]], 1.6 * lw); }
  WARP = W0;
  // ---- face contour (tapered ink) ----
  inkStroke(g, [[0.2, 0.06], [0.33 + fx, 0.22], [0.36 + fx, 0.4], [0.345 + fx, 0.47], [0.4 + fx + nose * 0.02, 0.56], [0.44 + fx + nose * 0.03, 0.66], [0.4 + fx, 0.7], [0.36 + fx, 0.715]], 3.6 * lw);
  inkStroke(g, [[0.35 + fx, 0.74], [0.355 + fx, 0.765], [0.335 + fx, 0.8]], 2.6 * lw);
  inkStroke(g, [[0.335 + fx, 0.815], [0.345 + fx, 0.835], [0.325 + fx, 0.86], [0.315 + fx, 0.89], [0.335 + fx, 0.93], [0.31 + fx, 0.985], [0.22 + fx, chin], [0.05 + fx, 0.97], [jx, 0.86], [jx - 0.06, 0.8]], 4 * lw);
  // nostril wing
  inkStroke(g, [[0.37 + fx, 0.66], [0.345 + fx, 0.69], [0.37 + fx, 0.705]], 2.2 * lw);
  // ---- mouth ----
  const mo = A.mouth ?? 0, sad = A.sad ?? 0;
  inkStroke(g, [[0.17 + fx, 0.8 + sad * 0.012], [0.26 + fx, 0.792 + mo * 0.01], [0.34 + fx, 0.792]], (B.female || B.child ? 1.9 : 2.8) * lw);
  if (mo > 0.05) { g.fillStyle = "#4a2424"; g.beginPath(); g.ellipse(0.28 + fx, 0.8, 0.05, 0.012 * mo * 2, 0, 0, 7); g.fill(); }
  if (B.female || B.child) {
    const lc = B.child ? "rgba(190,95,90,0.6)" : "rgba(165,45,58,0.9)";
    g.fillStyle = lc; g.fill(P([[0.18 + fx, 0.797], [0.24 + fx, 0.775, 0.3 + fx, 0.78], [0.33 + fx, 0.772, 0.345 + fx, 0.79], [0.27 + fx, 0.8, 0.18 + fx, 0.797]]));   // upper lip
    g.fill(P([[0.19 + fx, 0.8], [0.26 + fx, 0.85, 0.335 + fx, 0.8], [0.28 + fx, 0.805, 0.19 + fx, 0.8]]));                                                       // lower lip
    g.fillStyle = "rgba(255,235,225,0.5)"; g.beginPath(); g.ellipse(0.28 + fx, 0.818, 0.022, 0.006, 0, 0, 7); g.fill();
  }
  inkStroke(g, [[0.22 + fx, 0.835], [0.29 + fx, 0.84]], 1.4 * lw, "rgba(34,24,26,0.6)");   // lower lip shadow
  // ---- eyes ----
  const ph = (parseInt(B.skin.slice(1), 16) % 997) / 997; const blink = A.blink ?? (((t * 0.27 + ph) % 1) < 0.03 ? 1 : 0), open = 1 - blink * 0.92;
  const lx = (A.lookX ?? 0) * 0.012, ly = (A.lookY ?? 0) * 0.008, bw = (A.brow ?? 0) * 0.015;
  const fe = F.eye; const eyes = [{ x: 0.1 + fx, w: 0.072 * fe, k: fe }, { x: 0.29 + fx, w: 0.04 * fe, k: 0.7 * fe }];
  const W1 = WARP; WARP = null;   // eye coordinates are already placed with WY()
  for (const e of eyes) {
    const y = WY(0.515), h = 0.026 * open * F.eye;
    const ey = P([[e.x - e.w, y], [e.x - e.w * 0.2, y - h * 1.6, e.x + e.w, y - h * 0.2], [e.x + e.w * 0.1, y + h * 1.1, e.x - e.w, y]]);
    g.fillStyle = "#efe6da"; g.fill(ey);
    g.save(); g.clip(ey);
    g.fillStyle = B.child ? "#5b4130" : "#4b3a2c"; g.beginPath(); g.arc(e.x + e.w * 0.3 + lx, y - h * 0.1 + ly, 0.026 * e.k, 0, 7); g.fill();
    g.fillStyle = "#140d0c"; g.beginPath(); g.arc(e.x + e.w * 0.3 + lx, y - h * 0.1 + ly, 0.012 * e.k, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(e.x + e.w * 0.3 + lx - 0.008, y - h * 0.5 + ly, 0.005, 0, 7); g.fill();
    hatchLines(g, e.x - e.w, y - h * 2, e.x + e.w, y - h * 0.3, 0.012, 0.0, 0.9 / s, "rgba(34,24,26,0.5)");   // lid shadow on the eyeball
    g.restore();
    inkStroke(g, [[e.x - e.w * 1.1, y + 0.004], [e.x - e.w * 0.2, y - h * 1.7], [e.x + e.w * 1.05, y - h * 0.15]], (e.k > 0.8 ? 3.4 : 2.6) * lw);      // upper lid
    if (B.female && !B.child) for (let k = 0; k < 3; k++) { const u = 0.45 + k * 0.25; inkStroke(g, [[e.x + e.w * (u * 1.5 - 0.6), y - h * (1.5 - u * 1.1)], [e.x + e.w * (u * 1.5 - 0.5) + 0.012, y - h * (1.5 - u * 1.1) - 0.016]], 1.6 * lw); }
    inkStroke(g, [[e.x - e.w * 0.6, y - 0.03 - h * 0.6], [e.x + e.w * 0.1, y - 0.038 - h * 0.8], [e.x + e.w * 0.9, y - 0.022 - h * 0.4]], 1.5 * lw, "rgba(34,24,26,0.7)");  // crease
    inkStroke(g, [[e.x - e.w * 0.7, y + h * 0.9 + 0.006], [e.x + e.w * 0.2, y + h * 1.2 + 0.008], [e.x + e.w * 0.9, y + 0.004]], 1.4 * lw, "rgba(34,24,26,0.6)");  // lower lid
    // brow: a hairy tapered mass
    const by = WY(0.445) - bw + (e.k < 0.8 ? 0.004 : 0) - (B.brow ?? 0) * 0.01 - (B.female || B.child ? 0.022 : 0);
    const inner = e.k > 0.8 ? 1 : -1;
    g.save(); g.fillStyle = mixC(hairC, INK, 0.35);
    const th = B.female || B.child ? 0.45 : 1; const bp = P([[e.x - e.w * 1.25, by + 0.016 * th], [e.x - e.w * 0.3, by - 0.024 * th - sad * 0.0, e.x + e.w * 1.2, by + 0.004 - sad * 0.012 * inner], [e.x + e.w * 1.2, by + 0.004 + 0.014 * th - sad * 0.01 * inner], [e.x - e.w * 0.2, by - 0.004, e.x - e.w * 1.25, by + 0.016]]);
    g.fill(bp); g.restore();
  }
  WARP = W1;
  // nose side line (the near side of the nose catches a soft edge)
  inkStroke(g, [[0.2 + fx, 0.53], [0.25 + fx, 0.62], [0.3 + fx, 0.68]], 1.4 * lw, "rgba(34,24,26,0.45)");

  // ---- facial hair ----
  if (B.beard === "full") {
    const bd = P([[jx - 0.08, 0.62], [jx - 0.06, 0.96, 0.05 + fx, 1.12], [0.22 + fx, 1.16, 0.36 + fx, 1.02], [0.36 + fx, 0.94], [0.34 + fx, 0.86, 0.3 + fx, 0.83], [0.2 + fx, 0.86, 0.12 + fx, 0.8], [0.02 + fx, 0.76, -0.04, 0.62], [-0.12, 0.55, jx - 0.08, 0.62]]);
    g.fillStyle = hairC; g.fill(bd); g.save(); g.clip(bd);
    hatchLines(g, -0.3, 0.55, 0.45, 1.2, 0.02, 1.35, 1.3 / s, INK, 0.004); hatchLines(g, 0.1, 0.8, 0.45, 1.2, 0.024, 1.75, 1.1 / s, INK);
    g.restore(); inkStroke(g, [[jx - 0.08, 0.62], [jx - 0.06, 0.9], [0.02 + fx, 1.1], [0.22 + fx, 1.15], [0.36 + fx, 1.02]], 3.6 * lw);
  }
  if (B.moustache && B.moustache !== "none") {
    const wal = B.moustache === "walrus" ? 1 : 0;
    const ms = P([[0.37 + fx, 0.72], [0.3 + fx, 0.705, 0.18 + fx, 0.74], [0.12 + fx, 0.78 + wal * 0.03, 0.1 + fx, 0.8 + wal * 0.03], [0.18 + fx, 0.79, 0.26 + fx, 0.775 + wal * 0.01], [0.33 + fx, 0.79 + wal * 0.01, 0.37 + fx, 0.775 + wal * 0.012]]);
    g.fillStyle = hairC; g.fill(ms); g.save(); g.clip(ms); hatchLines(g, 0.05, 0.68, 0.42, 0.84, 0.014, 1.2, 1.1 / s); g.restore();
    inkStroke(g, [[0.1 + fx, 0.8 + wal * 0.03], [0.2 + fx, 0.785], [0.37 + fx, 0.78]], 2.4 * lw);
  }

  WARP = null;
  if (B.glasses) {
    const y = WY(0.515), dark = B.glasses === "dark";
    for (const e of eyes) {
      const lens = new Path2D(); lens.ellipse(e.x + e.w * 0.15, y + 0.005, e.w * 1.45, 0.055, 0, 0, 7);
      if (dark) { g.fillStyle = "rgba(18,16,20,0.9)"; g.fill(lens); g.save(); g.clip(lens); g.fillStyle = "rgba(200,210,230,0.25)"; g.fillRect(e.x - e.w, y - 0.06, e.w * 0.6, 0.05); g.restore(); }
      g.strokeStyle = INK; g.lineWidth = (dark ? 3.2 : 2) * lw; g.stroke(lens);
    }
    inkStroke(g, [[eyes[0].x + eyes[0].w * 1.6, y - 0.005], [eyes[1].x - eyes[1].w * 1.0, y - 0.01]], 2.2 * lw);
    inkStroke(g, [[eyes[0].x - eyes[0].w * 1.3, y - 0.01], [-0.08, y - 0.02], [-0.19, y + 0.0]], 2.4 * lw);   // temple arm to the ear
  }
  WARP = null;
  // ---- hair ----
  hair(g, B, hairC, back, fx, lw, s);
  // ---- hat ----
  if (B.hat && B.hat !== "none") hat(g, B, back, lw, s);
  g.restore();
}

function hair(g: Ctx, B: Bust, col: string, back: number, fx: number, lw: number, s: number) {
  let hp: Path2D, strands: number[][][] = [];
  if (B.hairStyle === "center-bun") {
    hp = P([[0.24, 0.12], [0.12, -0.04, -0.12, -0.04], [back - 0.04, 0.05, back - 0.04, 0.4], [back, 0.56, -0.2, 0.6], [-0.2, 0.42, -0.1, 0.3], [0.06, 0.2, 0.26, 0.22]]);
    strands = [[[0.24, 0.13], [0.05, 0.05], [-0.25, 0.15], [-0.4, 0.4]], [[0.2, 0.18], [0.0, 0.14], [-0.2, 0.3], [-0.28, 0.5]], [[0.22, 0.1], [0.0, -0.01], [-0.3, 0.06], [back - 0.02, 0.3]]];
  } else if (B.hairStyle === "bob") {
    // late-1960s/70s flip: volume on top, side-swept fringe, ends flicking out at the jaw
    hp = P([[0.33, 0.24], [0.34, -0.1, -0.06, -0.1], [back - 0.12, -0.06, back - 0.1, 0.45], [back - 0.1, 0.78, back - 0.2, 0.92], [back - 0.02, 0.92, -0.14, 0.84], [-0.12, 0.6, -0.12, 0.44], [0.0, 0.26, 0.16, 0.22], [0.28, 0.26, 0.33, 0.24]]);
    strands = [[[0.32, 0.2], [0.18, 0.04], [-0.1, -0.03], [-0.42, 0.12]], [[0.22, 0.2], [0.0, 0.12], [-0.3, 0.3], [-0.48, 0.6], [back - 0.18, 0.9]], [[-0.13, 0.46], [-0.2, 0.7], [-0.16, 0.84]], [[0.05, 0.22], [-0.2, 0.24], [-0.38, 0.5], [-0.42, 0.8]]];
  } else if (B.hairStyle === "long") {
    // long loose waves falling down the back past the shoulders, moving a little in the air
    const sw = Math.sin(TIME * 1.3) * 0.03;
    hp = P([[0.33, 0.22], [0.34, -0.1, -0.06, -0.09], [back - 0.14, -0.04, back - 0.16, 0.5], [back - 0.2 + sw, 1.0, back - 0.3 + sw, 1.55], [back - 0.05 + sw, 1.5, -0.12 + sw * 0.5, 1.25], [-0.16, 0.95, -0.13, 0.5], [0.0, 0.24, 0.16, 0.21], [0.28, 0.24, 0.33, 0.22]]);
    strands = [[[0.32, 0.19], [0.15, 0.02], [-0.15, 0.0], [-0.45, 0.3], [-0.55 + sw, 0.9], [back - 0.25 + sw, 1.45]], [[0.18, 0.2], [-0.05, 0.16], [-0.3, 0.4], [-0.4 + sw, 0.85], [-0.3 + sw, 1.3]], [[-0.13, 0.5], [-0.2 + sw * 0.5, 0.85], [-0.16 + sw, 1.2]], [[0.05, 0.08], [-0.25, 0.1], [-0.5, 0.45], [-0.62 + sw, 1.1]]];
  } else if (B.hairStyle === "curls") {
    hp = P([[0.34, 0.24], [0.36, -0.1, -0.04, -0.1], [back - 0.1, -0.06, back - 0.1, 0.42], [back - 0.06, 0.66, -0.18, 0.64], [-0.18, 0.46, -0.12, 0.4], [0.04, 0.24, 0.2, 0.24], [0.3, 0.27, 0.34, 0.24]]);
    for (let i = 0; i < 9; i++) { const a = i / 8, x = 0.3 - a * 0.75, y = 0.02 + Math.sin(a * 3) * 0.08 + (a > 0.6 ? (a - 0.6) * 0.9 : 0); strands.push([[x + 0.04, y + 0.06], [x - 0.02, y - 0.01], [x - 0.06, y + 0.06], [x - 0.02, y + 0.1]]); }
  } else if (B.hairStyle === "snakes") {
    hp = P([[0.3, 0.2], [0.3, -0.04, -0.04, -0.05], [back - 0.06, -0.02, back - 0.05, 0.4], [back - 0.02, 0.6, -0.2, 0.62], [-0.18, 0.46, -0.13, 0.4], [-0.02, 0.2, 0.12, 0.19], [0.24, 0.18, 0.3, 0.2]]);
  } else if (B.hairStyle === "child") {
    hp = P([[0.3, 0.18], [0.25, -0.05, -0.05, -0.04], [back - 0.08, 0.0, back - 0.08, 0.45], [back - 0.04, 0.7, -0.18, 0.72], [-0.18, 0.5, -0.12, 0.42], [0.1, 0.3, 0.2, 0.32], [0.3, 0.3, 0.32, 0.22]]);
    for (let i = 0; i < 6; i++) strands.push([[0.28 - i * 0.12, 0.05 + i * 0.04], [0.18 - i * 0.13, 0.2 + i * 0.03], [0.22 - i * 0.12, 0.3 + i * 0.05]]);
  } else {
    const swept = B.hairStyle === "swept" ? 0.04 : 0, crop = B.hairStyle === "cropped" ? -0.03 : 0;
    hp = P([[0.33, 0.2], [0.3 + swept, -0.06 - swept, -0.04, -0.06 - swept + crop], [back - 0.06, -0.02, back - 0.04, 0.42], [back - 0.02, 0.6, -0.2, 0.62], [-0.18, 0.46, -0.13, 0.4], [-0.02, 0.18, 0.12, 0.17], [0.26, 0.16, 0.33, 0.2]]);
    strands = [[[0.32, 0.18], [0.15, 0.0], [-0.15, -0.02], [-0.4, 0.15]], [[0.25, 0.14], [0.05, 0.06], [-0.2, 0.08], [-0.42, 0.35]], [[0.1, 0.17], [-0.1, 0.2], [-0.3, 0.32], [-0.38, 0.55]], [[-0.13, 0.4], [-0.25, 0.42], [-0.32, 0.58]]];
  }
  g.fillStyle = col; g.fill(hp);
  g.save(); g.clip(hp);
  hatchLines(g, -0.6, -0.1, 0.4, 0.7, 0.02, 0.55, 1.1 / s, "rgba(20,12,12,0.7)", 0.003);
  const hl = g.createLinearGradient(-0.3, 0, 0.2, 0.3); hl.addColorStop(0, "rgba(255,235,200,0.25)"); hl.addColorStop(0.5, "rgba(255,235,200,0)"); g.fillStyle = hl; g.fill(hp);
  g.restore();
  for (const st of strands) inkStroke(g, st, 2 * lw);
  g.strokeStyle = INK; g.lineWidth = 3 * lw; g.stroke(hp);
  if (B.hairStyle === "snakes") snakes(g, back, lw, B.snakeLive ?? 1);
  void fx;
}

function hat(g: Ctx, B: Bust, back: number, lw: number, s: number) {
  const col = B.hatCol ?? "#1e2230";
  if (B.hat === "captain") {
    const cr = P([[back - 0.06, 0.14], [back - 0.06, -0.14, 0.05, -0.16], [0.36, -0.12, 0.4, 0.1], [0.38, 0.18], [0.0, 0.2, back - 0.04, 0.2]]);
    g.fillStyle = col; g.fill(cr); g.save(); g.clip(cr); hatchLines(g, -0.6, -0.2, 0.5, 0.3, 0.02, 0.4, 1.1 / s); g.restore();
    g.fillStyle = "#111"; const band = P([[back - 0.05, 0.12], [0.39, 0.1], [0.39, 0.19], [back - 0.04, 0.21]]); g.fill(band);
    const peak = P([[0.12, 0.19], [0.36, 0.17, 0.55, 0.24], [0.48, 0.27, 0.2, 0.25]]); g.fillStyle = "#0e0e12"; g.fill(peak); inkStroke(g, [[0.12, 0.19], [0.36, 0.18], [0.55, 0.24], [0.42, 0.27], [0.2, 0.25]], 2.6 * lw);
    g.fillStyle = "#c8a24a"; g.beginPath(); g.ellipse(0.22, 0.04, 0.05, 0.035, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5 * lw; g.stroke();
    g.strokeStyle = INK; g.lineWidth = 3.4 * lw; g.stroke(cr);
  } else if (B.hat === "corinthian") {
    // bronze Greek helmet pushed back on the head, with a tall horsehair crest
    const br = "#a8793a";
    const cr = P([[back - 0.08, 0.5], [back - 0.12, -0.1, 0.0, -0.14], [0.3, -0.13, 0.36, 0.1], [0.36, 0.2], [0.2, 0.16, 0.02, 0.24], [back + 0.06, 0.3, back - 0.02, 0.5]]);
    const pl = P([[back + 0.02, 0.12], [back - 0.22, -0.4, 0.05, -0.46], [0.36, -0.42, 0.3, 0.1], [0.0, 0.12]]);
    g.fillStyle = B.plume ?? "#7a1e1e"; g.fill(pl); g.save(); g.clip(pl); hatchLines(g, -0.7, -0.45, 0.4, 0.1, 0.016, 1.2, 1.1 / s, "rgba(20,8,8,0.6)", 0.004); g.restore(); g.strokeStyle = INK; g.lineWidth = 3 * lw; g.stroke(pl);
    g.fillStyle = br; g.fill(cr); g.save(); g.clip(cr);
    const sh = g.createLinearGradient(-0.4, -0.1, 0.3, 0.2); sh.addColorStop(0, "rgba(60,30,10,0.55)"); sh.addColorStop(0.55, "rgba(255,220,150,0.35)"); sh.addColorStop(1, "rgba(60,30,10,0.3)"); g.fillStyle = sh; g.fill(cr);
    hatchLines(g, -0.6, 0.1, 0.0, 0.5, 0.02, 0.5, 1.1 / s, "rgba(40,20,8,0.6)"); g.restore();
    g.strokeStyle = INK; g.lineWidth = 3.4 * lw; g.stroke(cr); inkStroke(g, [[back - 0.06, 0.2], [0.1, 0.12], [0.35, 0.12]], 2 * lw, "rgba(40,20,8,0.8)");
  } else if (B.hat === "crown") {
    const gc = B.crownCol ?? "#c9a13e";
    const cr = P([[back + 0.02, 0.16], [back + 0.0, 0.02], [-0.25, 0.08], [-0.15, -0.06], [-0.04, 0.05], [0.07, -0.08], [0.17, 0.05], [0.27, -0.04], [0.31, 0.12], [0.1, 0.17]]);
    g.fillStyle = gc; g.fill(cr); g.save(); g.clip(cr); hatchLines(g, -0.6, -0.1, 0.4, 0.2, 0.02, 0.3, 1.1 / s, "rgba(60,40,10,0.5)"); g.restore();
    g.strokeStyle = INK; g.lineWidth = 3 * lw; g.stroke(cr);
    for (const [x, y] of [[-0.15, 0.1], [0.07, 0.1], [0.24, 0.1]]) { g.fillStyle = "#8a1f2a"; g.beginPath(); g.arc(x, y, 0.022, 0, 7); g.fill(); g.stroke(); }
  } else if (B.hat === "winged") {
    // a close bronze cap with small wings at the side (the helm of darkness is drawn as a soft dark cap)
    const cr = P([[back - 0.04, 0.26], [back - 0.06, -0.1, 0.05, -0.1], [0.32, -0.08, 0.34, 0.18], [0.05, 0.14, back - 0.04, 0.26]]);
    g.fillStyle = col; g.fill(cr); g.save(); g.clip(cr); hatchLines(g, -0.6, -0.2, 0.5, 0.3, 0.02, 0.4, 1.1 / s); g.restore(); g.strokeStyle = INK; g.lineWidth = 3.2 * lw; g.stroke(cr);
    const fl = Math.sin(TIME * 7) * 0.03;
    for (let k = 0; k < 4; k++) { const f = P([[-0.26, 0.08], [-0.4 - k * 0.04, -0.04 - k * 0.06 + fl, -0.52 - k * 0.05, -0.08 - k * 0.07 + fl], [-0.42, 0.02 - k * 0.02, -0.26, 0.12]]); g.fillStyle = "#e8e0cc"; g.fill(f); g.strokeStyle = INK; g.lineWidth = 2 * lw; g.stroke(f); }
  } else if (B.hat === "watch") {
    const cr = P([[back - 0.05, 0.22], [back - 0.04, -0.12, 0.05, -0.12], [0.34, -0.1, 0.36, 0.2], [0.05, 0.16, back - 0.05, 0.22]]);
    g.fillStyle = col; g.fill(cr); g.save(); g.clip(cr); hatchLines(g, -0.6, -0.2, 0.5, 0.3, 0.018, 1.45, 1.1 / s); g.restore();
    g.strokeStyle = INK; g.lineWidth = 3.4 * lw; g.stroke(cr);
    inkStroke(g, [[back - 0.04, 0.12], [0.0, 0.08], [0.35, 0.1]], 2 * lw);
  }
}

/** per-person face proportions: vertical feature positions (ys for the canonical knots) and how far each part projects */
function faceShape(B: Bust) {
  const n = B.nose ?? 0, j = B.jaw ?? 0, b = B.brow ?? 0;
  if (B.child) return { ys: [0.0, 0.5, 0.6, 0.71, 0.81, 0.9, 0.95, 1.18], kb: 0.8, kn: 0.72 + n * 0.06, kl: 1.0, kc: 0.6, flat: 0.95, hook: -0.008, eye: 1.25 };
  if (B.female) return { ys: [0.0, 0.44, 0.535, 0.67, 0.78, 0.88, 0.94, 1.17], kb: 0.85 + b * 0.1, kn: 0.9 + n * 0.1, kl: 1.15, kc: 0.72 + j * 0.06, flat: 1, hook: -0.004 * (1 + n), eye: 1.14 };
  return { ys: [0.0, 0.42 + b * 0.01, 0.515, 0.66 + n * 0.01, 0.79, 0.93, 1.0 + j * 0.015, 1.25], kb: 1.0 + b * 0.15, kn: 1.0 + n * 0.3, kl: 1.0, kc: 1.0 + j * 0.25, flat: 1, hook: n > 0.5 ? 0.012 * n : 0, eye: 1 };
}

/** a head of living snakes: each one roots on the scalp, writhes, and ends in a small head with an eye */
function snakes(g: Ctx, back: number, lw: number, live: number) {
  const R: [number, number, number, number, number][] = [   // root x, root y, angle, length, phase
    [back + 0.02, 0.32, 3.3, 0.42, 0.0], [back + 0.06, 0.12, 3.8, 0.4, 1.1], [-0.18, -0.02, 4.3, 0.36, 2.2], [0.0, -0.05, 4.75, 0.34, 3.1],
    [0.16, -0.02, 5.3, 0.32, 4.0], [0.26, 0.1, 5.9, 0.26, 5.2], [back + 0.04, 0.5, 2.7, 0.42, 0.7], [-0.25, 0.42, 2.3, 0.5, 1.9], [-0.08, 0.06, 4.5, 0.4, 2.7],
    [-0.3, 0.1, 4.0, 0.3, 3.7], [0.1, 0.02, 5.0, 0.28, 4.6], [back + 0.03, 0.22, 3.0, 0.36, 5.6], [-0.18, 0.5, 1.9, 0.45, 0.3], [-0.05, 0.3, 3.6, 0.3, 6.1],
  ];
  const T = TIME * 1.6 * live;
  const order = [12, 6, 7, 0, 11, 1, 9, 13, 8, 2, 3, 10, 4, 5];
  for (const i of order) {
    const [x0, y0, a0, len, ph] = R[i]; const C: number[][] = [];
    for (let k = 0; k <= 14; k++) { const u = k / 14; const a = a0 + Math.sin(u * 7 + T + ph) * 1.0 * Math.min(1, u * 2) + Math.sin(T * 0.7 + ph) * 0.15 + u * 0.6 * Math.sin(ph * 2); const prev = C[k - 1] ?? [x0, y0];
      C.push(k === 0 ? [x0, y0] : [prev[0] + Math.cos(a) * len / 14, prev[1] + Math.sin(a) * len / 14]); }
    const L: number[][] = [], Rr: number[][] = [];
    for (let k = 0; k < C.length; k++) { const a = C[Math.max(0, k - 1)], b = C[Math.min(C.length - 1, k + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1; const w = 0.05 * (1 - k / C.length * 0.5);
      L.push([C[k][0] - dy / n * w, C[k][1] + dx / n * w]); Rr.push([C[k][0] + dy / n * w, C[k][1] - dx / n * w]); }
    const body = new Path2D(); body.moveTo(L[0][0], L[0][1]); for (const q of L) body.lineTo(q[0], q[1]); for (let k = Rr.length - 1; k >= 0; k--) body.lineTo(Rr[k][0], Rr[k][1]); body.closePath();
    g.fillStyle = i % 3 === 0 ? "#4f5a2c" : i % 3 === 1 ? "#5d6633" : "#46502a"; g.fill(body);
    g.save(); g.clip(body); g.strokeStyle = "rgba(20,24,10,0.55)"; g.lineWidth = 1.1 * lw; g.beginPath();
    for (let k = 1; k < C.length - 1; k++) { g.moveTo(L[k][0], L[k][1]); g.lineTo(Rr[k][0], Rr[k][1]); } g.stroke();
    g.strokeStyle = "rgba(220,210,140,0.45)"; g.lineWidth = 3 * lw; g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const q of L) g.lineTo(q[0], q[1]); g.stroke(); g.restore();
    g.strokeStyle = INK; g.lineWidth = 2.4 * lw; g.stroke(body);
    // head: a wedge pointing along the last segment, a pale eye, a flicker of tongue
    const e = C[C.length - 1], d = C[C.length - 2]; const ha = Math.atan2(e[1] - d[1], e[0] - d[0]);
    g.save(); g.translate(e[0], e[1]); g.rotate(ha);
    const hd = new Path2D(); hd.moveTo(-0.02, -0.03); hd.quadraticCurveTo(0.05, -0.035, 0.075, 0); hd.quadraticCurveTo(0.05, 0.035, -0.02, 0.03); hd.closePath();
    g.fillStyle = "#56602f"; g.fill(hd); g.strokeStyle = INK; g.lineWidth = 2.2 * lw; g.stroke(hd);
    g.fillStyle = "#e8d06a"; g.beginPath(); g.arc(0.03, -0.012, 0.009, 0, 7); g.fill(); g.fillStyle = INK; g.fillRect(0.028, -0.02, 0.004, 0.016);
    if (Math.sin(TIME * 5 + ph * 3) > 0.6) { g.strokeStyle = "#a02626"; g.lineWidth = 1.6 * lw; g.beginPath(); g.moveTo(0.075, 0); g.lineTo(0.11, 0.004); g.lineTo(0.12, -0.008); g.moveTo(0.11, 0.004); g.lineTo(0.12, 0.014); g.stroke(); }
    g.restore();
  }
}
