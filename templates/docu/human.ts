// Documentary-style 2D human: realistic proportions (about 7.5 heads tall), mature illustrated faces (natural almond
// eyes with lids, a drawn nose, lips, ears, brows), detailed hair and facial hair, period clothing with folds, two-tone
// cel shading plus a soft rim light, and fine warm-brown tapered linework. Drawn procedurally on a canvas in metres
// (y up, origin between the feet). Views: "34" (three-quarter, facing +x; dir -1 mirrors), "front", "back".
// Motion is subtle and polished: breathing, blinks, eased gestures, a natural walk cycle; no squash and stretch.
export const rng = (seed: number) => {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};

type Ctx = CanvasRenderingContext2D;
type V = [number, number];
export type View = "34" | "front" | "back";
export type Hat = "none" | "captain" | "bicorne" | "top" | "wide" | "kepi" | "cap" | "bonnet" | "seaman";
export type HLook = {
  height?: number; build?: number;            // metres; 0.85 slim .. 1.2 heavy
  skin: string; hair: string; hairStyle: "short" | "swept" | "long" | "bun" | "bald" | "curly";
  beard?: "full" | "short" | "chin" | "none"; moustache?: boolean; sideburns?: boolean; age?: number;  // 0 young .. 1 old (lines, grey)
  female?: boolean; child?: boolean;
  coat: string; coatLen?: "waist" | "hip" | "knee" | "dress"; lapels?: string; buttons?: string; vest?: string; shirt?: string; tie?: string;
  pants: string; boots?: string; hat?: Hat; hatCol?: string; epaulettes?: boolean; belt?: string; scarf?: string; apron?: string;
};
export type HPose = {
  lean?: number; neck?: number; turn?: number; tilt?: number;           // radians-ish; turn -1..1 (head yaw within the view)
  shL?: number; elL?: number; shR?: number; elR?: number;                // shoulder angle (0 = down, + forward), elbow bend (+)
  spreadL?: number; spreadR?: number;                                    // front view: arm away from the body
  hipL?: number; knL?: number; hipR?: number; knR?: number;
  walk?: number; phase?: number; sit?: number;
  brow?: number; smile?: number; mouth?: number; eyes?: number; look?: number; lookY?: number; talk?: number;
};
export type Human = { L: HLook; seed: number; P: HPose; sp: Record<string, { x: number; v: number }> };
export const human = (L: HLook, seed = 0): Human => ({ L, seed, P: {}, sp: {} });

let LINE = "#2b1d17";
/** interior line colour; the figure layer draws soft interior lines and gets one bold outer contour afterwards */
export const setLine = (c: string) => { LINE = c; };
export const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16); const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
  return "#" + ((1 << 24) + (f((n >> 16) & 255) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
};
const mix = (a: string, b: string, k: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k);
  return "#" + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
};

// ---------------- motion: gentle springs, replayed deterministically ----------------
const spring = (p: Human, key: string, target: number, reset: boolean, k = 70, d = 13) => {
  let s = p.sp[key];
  if (!s || reset) { s = p.sp[key] = { x: target, v: 0 }; return s; }
  const h = 1 / 60;
  for (let i = 0; i < 2; i++) { s.v += (k * (target - s.x) - d * s.v) * h; s.x += s.v * h; }
  return s;
};
const KEYS: (keyof HPose)[] = ["lean", "neck", "turn", "tilt", "shL", "elL", "shR", "elR", "spreadL", "spreadR", "hipL", "knL", "hipR", "knR", "brow", "smile", "mouth", "eyes", "look", "lookY", "sit"];
function step(p: Human, reset: boolean) {
  const o: Record<string, number> = {};
  for (const k of KEYS) o[k] = spring(p, k, (p.P[k] as number) ?? 0, reset, k === "turn" || k === "look" ? 90 : 60, 12.5).x;
  return o as Required<Record<string, number>>;
}
export type HSt = ReturnType<typeof step>;
export function settleH(p: Human, poseAt: (t: number) => HPose, t: number, t0 = -1e9): HSt {
  const n = Math.max(0, Math.min(60, Math.floor((t - t0) * 30 + 1e-6)));
  let st!: HSt;
  for (let i = n; i >= 0; i--) { p.P = poseAt(t - i / 30); st = step(p, i === n); }
  return st;
}

// ---------------- drawing primitives ----------------
function limbPath(A: V, B: V, wa: number, wb: number, bulge = 0.15, bulgeSide = 1): Path2D {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L;
  const m: V = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], wm = (wa + wb) / 2;
  const p = new Path2D();
  p.moveTo(A[0] + nx * wa, A[1] + ny * wa);
  p.quadraticCurveTo(m[0] + nx * wm * (1 + bulge * (bulgeSide > 0 ? 1 : 0.4)), m[1] + ny * wm * (1 + bulge * (bulgeSide > 0 ? 1 : 0.4)), B[0] + nx * wb, B[1] + ny * wb);
  p.arc(B[0], B[1], wb, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, true);
  p.quadraticCurveTo(m[0] - nx * wm * (1 + bulge * (bulgeSide > 0 ? 0.4 : 1)), m[1] - ny * wm * (1 + bulge * (bulgeSide > 0 ? 0.4 : 1)), A[0] - nx * wa, A[1] - ny * wa);
  p.arc(A[0], A[1], wa, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, true);
  p.closePath();
  return p;
}
/** fill a shape with base colour, a cel shadow on the side away from the light, a rim highlight, then the ink line */
function paint(g: Ctx, path: Path2D, col: string, OL: number, ls: number, box: [number, number, number, number], extra?: () => void, lineK = 1) {
  g.fillStyle = col; g.fill(path);
  g.save(); g.clip(path);
  const [x0, y0, x1, y1] = box, w = x1 - x0;
  // cel shadow: a soft-edged band on the shadow side
  g.fillStyle = shade(col, 0.74);
  g.beginPath(); if (ls > 0) g.rect(x0 - 1, y0 - 1, w * 0.36 + 1, y1 - y0 + 2); else g.rect(x1 - w * 0.36, y0 - 1, w * 0.36 + 1, y1 - y0 + 2); g.fill();
  g.fillStyle = shade(col, 0.86);
  g.beginPath(); if (ls > 0) g.rect(x0 + w * 0.36, y0 - 1, w * 0.06, y1 - y0 + 2); else g.rect(x1 - w * 0.42, y0 - 1, w * 0.06, y1 - y0 + 2); g.fill();
  if (extra) extra();
  // rim light on the lit edge
  g.strokeStyle = "rgba(255,244,220,0.35)"; g.lineWidth = OL * 2.2; g.save(); g.translate(ls * OL * 1.6, OL * 0.6); g.stroke(path); g.restore();
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = OL * lineK; g.lineJoin = "round"; g.stroke(path);
}
const boxOf = (pts: V[], pad = 0.05): [number, number, number, number] => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a - pad, b - pad, c + pad, d + pad]; };
const pol = (o: V, len: number, ang: number): V => [o[0] + Math.sin(ang) * len, o[1] + Math.cos(ang) * len];   // y up; ang 0 = up, + = toward +x

// ---------------- the figure ----------------
export function drawHuman(g: Ctx, p: Human, st: HSt, t: number, view: View, dir: number, lightSide: number, OL: number) {
  const L = p.L, P = p.P, r = rng(p.seed + 3), ph0 = r() * 10;
  g.save(); if (dir < 0) g.scale(-1, 1);
  g.lineJoin = "round"; g.lineCap = "round";
  const ls = lightSide * (dir < 0 ? -1 : 1);
  const Hh = (L.height ?? (L.child ? 1.0 : L.female ? 1.66 : 1.78)), hu = Hh / (L.child ? 5.2 : 7.4), b = L.build ?? 1;
  const walk = P.walk ?? 0, ph = (P.phase ?? 0) * Math.PI * 2, sit = st.sit;
  const breathe = Math.sin(t * 1.6 + ph0) * 0.004 * Hh;
  // walk-cycle overrides
  let hipL = st.hipL, hipR = st.hipR, knL = st.knL, knR = st.knR, shL = st.shL, shR = st.shR, elL = st.elL, elR = st.elR;
  let bob = 0;
  if (walk) {
    hipL += Math.sin(ph) * 0.42 * walk; hipR += Math.sin(ph + Math.PI) * 0.42 * walk;
    knL += Math.max(0, Math.sin(ph - 1.2)) * 0.75 * walk + 0.08 * walk; knR += Math.max(0, Math.sin(ph + Math.PI - 1.2)) * 0.75 * walk + 0.08 * walk;
    shL += Math.sin(ph + Math.PI) * 0.32 * walk; shR += Math.sin(ph) * 0.32 * walk; elL += 0.25 * walk; elR += 0.25 * walk;
    bob = Math.abs(Math.cos(ph)) * 0.025 * walk - 0.012 * walk;
  }
  if (sit) { hipL = -1.45 * sit + hipL * (1 - sit); hipR = -1.45 * sit + hipR * (1 - sit); knL = 1.5 * sit + knL * (1 - sit); knR = 1.5 * sit + knR * (1 - sit); }
  // skeleton (metres); 34 view faces +x
  const legLen = hu * 3.55 * (1 - sit * 0.0), thigh = legLen * 0.5, shin = legLen * 0.46;
  const hipY = legLen + hu * 0.12 - sit * (legLen - thigh * 0.1) + bob + breathe * 0.2;
  const side = view === "34";
  const lean = st.lean + (walk ? 0.05 * walk : 0);
  const torsoLen = hu * 2.55, neckLen = hu * 0.2;
  const pelvis: V = [0, hipY];
  const chest: V = pol(pelvis, torsoLen, lean * (side ? 1 : 0.2));
  const sw = hu * (L.female ? 0.82 : 1.0) * b * (side ? 0.62 : 1.0);           // shoulder half-width
  const hw = hu * (L.female ? 0.78 : 0.66) * b * (side ? 0.7 : 1.0);            // hip half-width
  const neckBase: V = [chest[0] + (side ? hu * 0.08 : 0), chest[1] + breathe];
  const headC: V = pol(neckBase, neckLen + hu * 0.5, st.neck + lean * (side ? 0.6 : 0.1));
  // shoulders / hips per side (34: near = +, far = -)
  const shoulder = (s: number): V => side ? [neckBase[0] - hu * 0.15 + s * sw * 0.35, neckBase[1] - hu * 0.22] : [neckBase[0] + s * sw, neckBase[1] - hu * 0.28];
  const hipJ = (s: number): V => side ? [pelvis[0] + s * hw * 0.3, pelvis[1]] : [pelvis[0] + s * hw * 0.55, pelvis[1]];
  const leg = (s: number, hip: number, kn: number) => {
    const H0 = hipJ(s); const K = pol(H0, thigh, Math.PI - (side ? hip : hip * 0.15));
    const F = pol(K, shin, Math.PI - (side ? hip - kn : (hip - kn) * 0.15));
    return { H: [H0[0], H0[1]] as V, K: [K[0], K[1]] as V, F: [F[0], Math.max(F[1], 0)] as V };
  };
  const arm = (s: number, sh: number, el: number, spread: number) => {
    const S = shoulder(s); const up = hu * 1.45, lo = hu * 1.3;
    const a1 = side ? -sh : s * (0.08 + spread) - 0; const E = side ? pol(S, up, Math.PI - sh) : pol(S, up, Math.PI - s * (0.08 + spread + Math.max(0, sh) * 0.15));
    const a2 = side ? Math.PI - sh - el : Math.PI - s * (0.08 + spread + el * 0.6); void a1;
    const Hn = pol(E, lo, a2);
    return { S, E, H: Hn };
  };
  const lgL = leg(-1, hipL, knL), lgR = leg(1, hipR, knR);
  const amL = arm(-1, shL, elL, st.spreadL), amR = arm(1, shR, elR, st.spreadR);
  const skin = L.skin, coat = L.coat, pants = L.pants, boots = L.boots ?? "#2a211c";
  const limbW = hu * 0.2 * b;

  const drawLeg = (lg: ReturnType<typeof leg>, far: boolean) => {
    const col = far ? shade(pants, 0.82) : pants;
    const th = limbPath(lg.H, lg.K, limbW * 1.25, limbW * 0.95, 0.1); paint(g, th, col, OL, ls, boxOf([lg.H, lg.K]));
    const bootTop: V = [lg.K[0] + (lg.F[0] - lg.K[0]) * 0.45, lg.K[1] + (lg.F[1] - lg.K[1]) * 0.45];
    const sh = limbPath(lg.K, lg.F, limbW * 0.92, limbW * 0.7, 0.12); paint(g, sh, col, OL, ls, boxOf([lg.K, lg.F]));
    if (!L.child || true) { const bt = limbPath(bootTop, lg.F, limbW * 0.85, limbW * 0.72, 0.05); paint(g, bt, far ? shade(boots, 0.8) : boots, OL, ls, boxOf([bootTop, lg.F])); }
    const foot = new Path2D(); const fx = side ? 1 : 0.25;
    foot.moveTo(lg.F[0] - limbW * 0.8, lg.F[1] + 0.005); foot.quadraticCurveTo(lg.F[0] - limbW * 0.9, lg.F[1] + limbW * 1.2, lg.F[0] + limbW * 0.2, lg.F[1] + limbW * 1.0);
    foot.quadraticCurveTo(lg.F[0] + hu * 0.75 * fx, lg.F[1] + limbW * 0.7, lg.F[0] + hu * 0.8 * fx, lg.F[1] + 0.01); foot.closePath();
    paint(g, foot, far ? shade(boots, 0.8) : boots, OL, ls, boxOf([lg.F, [lg.F[0] + hu * 0.8, lg.F[1] + limbW]]));
  };
  const hand = (H: V, E: V, far: boolean) => {
    const a = Math.atan2(H[1] - E[1], H[0] - E[0]);
    g.save(); g.translate(H[0], H[1]); g.rotate(a);
    const s = hu * 0.42; const hp = new Path2D();
    hp.moveTo(-s * 0.15, -s * 0.2); hp.quadraticCurveTo(s * 0.5, -s * 0.32, s * 0.82, -s * 0.12); hp.quadraticCurveTo(s * 0.95, s * 0.05, s * 0.75, s * 0.16);
    hp.quadraticCurveTo(s * 0.45, s * 0.28, s * 0.3, s * 0.42); hp.quadraticCurveTo(s * 0.18, s * 0.45, s * 0.12, s * 0.25); hp.quadraticCurveTo(-s * 0.1, s * 0.22, -s * 0.15, -s * 0.2); hp.closePath();
    paint(g, hp, far ? shade(skin, 0.85) : skin, OL * 0.8, ls, [-s, -s, s, s]);
    g.strokeStyle = shade(skin, 0.6); g.lineWidth = OL * 0.5; g.beginPath(); g.moveTo(s * 0.35, -s * 0.05); g.lineTo(s * 0.75, -s * 0.03); g.stroke();
    g.restore();
  };
  const drawArm = (am: ReturnType<typeof arm>, far: boolean) => {
    const col = far ? shade(coat, 0.8) : coat;
    const up = limbPath(am.S, am.E, limbW * 1.05, limbW * 0.85, 0.15); paint(g, up, col, OL, ls, boxOf([am.S, am.E]));
    const cuff: V = [am.E[0] + (am.H[0] - am.E[0]) * 0.92, am.E[1] + (am.H[1] - am.E[1]) * 0.92];
    const lo = limbPath(am.E, cuff, limbW * 0.85, limbW * 0.75, 0.1); paint(g, lo, col, OL, ls, boxOf([am.E, cuff]));
    // a fold line at the elbow
    g.strokeStyle = shade(col, 0.6); g.lineWidth = OL * 0.6; g.beginPath(); g.moveTo(am.E[0] - limbW * 0.4, am.E[1] + limbW * 0.3); g.quadraticCurveTo(am.E[0], am.E[1] - limbW * 0.1, am.E[0] + limbW * 0.4, am.E[1] + limbW * 0.25); g.stroke();
    if (L.shirt) { const c2 = limbPath(cuff, [cuff[0] + (am.H[0] - am.E[0]) * 0.05, cuff[1] + (am.H[1] - am.E[1]) * 0.05], limbW * 0.62, limbW * 0.62, 0); paint(g, c2, L.shirt, OL * 0.8, ls, boxOf([cuff, am.H])); }
    hand(am.H, am.E, far);
  };

  // ---- far limbs ----
  if (side) { drawArm(amL, true); drawLeg(lgL, true); }
  else { drawLeg(lgL, false); drawLeg(lgR, false); }

  // ---- torso + coat ----
  const sL = shoulder(-1), sR = shoulder(1);
  const coatLen = L.coatLen ?? "hip";
  const hemY = coatLen === "waist" ? hipY + hu * 0.25 : coatLen === "hip" ? hipY - hu * 0.55 : coatLen === "knee" ? hipY - thigh * 0.95 : hipY - legLen * 0.92;
  const flare = coatLen === "dress" ? hu * 0.9 : coatLen === "knee" ? hu * 0.35 : 0.05;
  const torso = new Path2D();
  if (side) {
    const back: V = [chest[0] - sw * 0.85, chest[1] - hu * 0.3], front: V = [chest[0] + sw * 0.75, chest[1] - hu * 0.35];
    torso.moveTo(sL[0] - limbW * 0.2, sL[1] + limbW * 0.6);
    torso.quadraticCurveTo(neckBase[0], neckBase[1] + hu * 0.1, sR[0] + limbW * 0.5, sR[1] + limbW * 0.4);
    torso.quadraticCurveTo(front[0] + hu * 0.12 * b, front[1] - hu * 0.3, pelvis[0] + hw * 0.9 + (b - 1) * hu * 0.5, pelvis[1] + hu * 0.3);
    torso.lineTo(pelvis[0] + hw * 0.9 + flare + Math.sin(lean) * 0.1, hemY);
    torso.quadraticCurveTo(pelvis[0], hemY - hu * 0.06, pelvis[0] - hw * 1.0 - flare, hemY + (coatLen === "knee" ? hu * 0.1 : 0));
    torso.quadraticCurveTo(back[0] - hu * 0.05, back[1] - hu * 0.6, sL[0] - limbW * 0.2, sL[1] + limbW * 0.6);
  } else {
    torso.moveTo(sL[0] - limbW * 0.5, sL[1] + limbW * 0.5);
    torso.quadraticCurveTo(neckBase[0], neckBase[1] + hu * 0.12, sR[0] + limbW * 0.5, sR[1] + limbW * 0.5);
    torso.quadraticCurveTo(sR[0] + limbW * 0.4, chest[1] - hu * 1.3, pelvis[0] + hw * 1.15 + flare, hemY);
    torso.quadraticCurveTo(pelvis[0], hemY - hu * 0.08, pelvis[0] - hw * 1.15 - flare, hemY);
    torso.quadraticCurveTo(sL[0] - limbW * 0.4, chest[1] - hu * 1.3, sL[0] - limbW * 0.5, sL[1] + limbW * 0.5);
  }
  torso.closePath();
  const tb = boxOf([sL, sR, [pelvis[0] - hw - flare, hemY], [pelvis[0] + hw + flare, hemY]]);
  paint(g, torso, coat, OL, ls, tb, () => {
    // shirt / vest opening, lapels, buttons, belt, folds
    const cx = side ? chest[0] + sw * 0.45 : chest[0];
    if (L.vest || L.shirt) {
      const op = new Path2D(); op.moveTo(cx - hu * 0.22, neckBase[1] - hu * 0.05); op.lineTo(cx, chest[1] - hu * 1.0); op.lineTo(cx + hu * 0.22, neckBase[1] - hu * 0.05); op.closePath();
      g.fillStyle = L.vest ?? L.shirt!; g.fill(op);
      if (L.shirt) { g.fillStyle = L.shirt; g.beginPath(); g.moveTo(cx - hu * 0.12, neckBase[1]); g.lineTo(cx, chest[1] - hu * 0.45); g.lineTo(cx + hu * 0.12, neckBase[1]); g.fill(); }
      if (L.tie) { g.fillStyle = L.tie; g.beginPath(); g.moveTo(cx - hu * 0.06, neckBase[1] - hu * 0.05); g.lineTo(cx + hu * 0.06, neckBase[1] - hu * 0.05); g.lineTo(cx + hu * 0.03, chest[1] - hu * 0.5); g.lineTo(cx - hu * 0.03, chest[1] - hu * 0.5); g.fill(); }
      g.strokeStyle = LINE; g.lineWidth = OL * 0.7; g.stroke(op);
    }
    if (L.lapels) { g.fillStyle = L.lapels; for (const s of side ? [1] : [-1, 1]) { g.beginPath(); g.moveTo(cx + s * hu * 0.22, neckBase[1] - hu * 0.02); g.lineTo(cx + s * hu * 0.42, chest[1] - hu * 0.35); g.lineTo(cx + s * hu * 0.08, chest[1] - hu * 0.95); g.closePath(); g.fill(); g.strokeStyle = LINE; g.lineWidth = OL * 0.6; g.stroke(); } }
    if (L.buttons) { g.fillStyle = L.buttons; for (let i = 0; i < 5; i++) for (const s of L.lapels ? [-1, 1] : [0]) { g.beginPath(); g.arc(cx + s * hu * 0.18 + (side ? hu * 0.05 : 0), chest[1] - hu * (1.05 + i * 0.3), hu * 0.045, 0, 7); g.fill(); } }
    if (L.belt) { g.fillStyle = L.belt; g.fillRect(tb[0], hipY + hu * 0.12, tb[2] - tb[0], hu * 0.16); }
    if (L.apron) { g.fillStyle = L.apron; g.beginPath(); g.moveTo(cx - hu * 0.6, hipY + hu * 0.2); g.lineTo(cx + hu * 0.6, hipY + hu * 0.2); g.lineTo(cx + hu * 0.8, hemY); g.lineTo(cx - hu * 0.8, hemY); g.fill(); }
    // cloth folds
    g.strokeStyle = shade(coat, 0.62); g.lineWidth = OL * 0.6;
    for (let i = 0; i < 3; i++) { const x = cx + (i - 1) * hu * 0.35 - (side ? hu * 0.3 : 0); g.beginPath(); g.moveTo(x, hipY + hu * 0.05); g.quadraticCurveTo(x + hu * 0.05, (hipY + hemY) / 2, x - hu * 0.04 + (i - 1) * flare * 0.3, hemY + hu * 0.05); g.stroke(); }
    g.beginPath(); g.moveTo(cx - hu * 0.5, chest[1] - hu * 0.2); g.quadraticCurveTo(cx - hu * 0.2, chest[1] - hu * 0.5, cx - hu * 0.35, chest[1] - hu * 0.9); g.stroke();
  });
  if (L.epaulettes) for (const S0 of side ? [sR] : [sL, sR]) { const e = new Path2D(); e.ellipse(S0[0], S0[1] + limbW * 0.4, limbW * 1.2, limbW * 0.5, 0, 0, 7); paint(g, e, "#d9b04a", OL * 0.8, ls, boxOf([S0], limbW * 1.3)); }
  if (L.scarf) { const sc = new Path2D(); sc.ellipse(neckBase[0], neckBase[1] - hu * 0.02, hu * 0.36, hu * 0.16, 0, 0, 7); paint(g, sc, L.scarf, OL * 0.8, ls, boxOf([neckBase], hu * 0.4)); }

  // ---- near limbs ----
  if (side) { drawLeg(lgR, false); }

  // ---- neck + head ----
  const nk = limbPath(neckBase, [headC[0] - hu * 0.05, headC[1] - hu * 0.35], hu * 0.24, hu * 0.21, 0); paint(g, nk, shade(skin, 0.92), OL, ls, boxOf([neckBase, headC]));
  if (L.shirt && !L.scarf) { const col = new Path2D(); col.moveTo(neckBase[0] - hu * 0.3, neckBase[1] - hu * 0.05); col.lineTo(neckBase[0] - hu * 0.22, neckBase[1] + hu * 0.18); col.lineTo(neckBase[0] + hu * 0.25, neckBase[1] + hu * 0.18); col.lineTo(neckBase[0] + hu * 0.32, neckBase[1] - hu * 0.05); col.closePath(); paint(g, col, L.shirt, OL * 0.8, ls, boxOf([neckBase], hu * 0.35)); }
  drawHead(g, p, st, t, headC, hu, view, ls, OL);

  if (side) drawArm(amR, false);
  else { drawArm(amL, false); drawArm(amR, false); }
  g.restore();
  return { handR: amR.H, handL: amL.H, head: headC, hu };
}

function drawHead(g: Ctx, p: Human, st: HSt, t: number, C: V, hu: number, view: View, ls: number, OL: number) {
  const L = p.L, P = p.P;
  const side = view === "34";
  const turn = Math.max(-1, Math.min(1, (side ? 0.55 : 0) + st.turn));     // 0 = facing camera, 1 = profile to +x
  const age = L.age ?? 0.3;
  const skin = L.skin, skinS = shade(skin, 0.8), hair = mix(L.hair, "#c9c4bc", Math.max(0, age - 0.6) * 1.6);
  g.save(); g.translate(C[0], C[1]); g.rotate(-st.tilt);
  const R = hu * 0.5;                                   // half head height-ish
  const fx = turn * R * 0.32;                           // features shift toward the facing side
  if (view === "back") {
    const hd = new Path2D(); hd.ellipse(0, 0, R * 0.78, R, 0, 0, 7); paint(g, hd, hair, OL, ls, [-R, -R, R, R]);
    drawHat(g, L, R, 0, OL, ls, "back"); g.restore(); return;
  }
  // ears (behind the jaw on the far side from the face)
  const earX = -turn * R * 0.62 + (turn > 0.2 ? 0 : 0);
  if (L.hairStyle !== "long" && !(L.female && L.hairStyle === "bun" && false)) { const ear = new Path2D(); ear.ellipse(earX + (turn > 0 ? -R * 0.08 : R * 0.08), -R * 0.02, R * 0.13, R * 0.22, 0.1 * turn, 0, 7); paint(g, ear, skin, OL * 0.8, ls, [-R, -R, R, R]); }
  if (!side || Math.abs(turn) < 0.4) { const ear2 = new Path2D(); ear2.ellipse(R * 0.74 * (turn > 0 ? 1 : 1), -R * 0.02, R * 0.1, R * 0.2, 0, 0, 7); if (turn < 0.4) paint(g, ear2, skin, OL * 0.8, ls, [-R, -R, R, R]); }
  // head shape: cranium + jaw toward the chin (chin shifts toward the facing side)
  const w = R * (L.female ? 0.7 : 0.76) * (1 - Math.abs(turn) * 0.05), jawW = R * (L.female ? 0.46 : 0.56), chinX = fx * 0.9;
  const head = new Path2D();
  head.moveTo(-w, -R * 0.05);
  head.bezierCurveTo(-w, R * 0.85, w, R * 0.85, w + turn * R * 0.08, -R * 0.05);
  head.bezierCurveTo(w + turn * R * 0.12, -R * 0.45, chinX + jawW * 0.8 + turn * R * 0.1, -R * 0.82, chinX, -R * 0.98);
  head.bezierCurveTo(chinX - jawW * 0.8, -R * 0.9, -w * 0.98, -R * 0.5, -w, -R * 0.05);
  head.closePath();
  paint(g, head, skin, OL, ls, [-w, -R, w, R], () => {
    // planes of the face: shadow under the brow on the far side, cheek, under the nose, jaw
    g.fillStyle = "rgba(120,60,50,0.16)"; g.beginPath(); g.ellipse(fx - turn * R * 0.35 - ls * R * 0.1, -R * 0.28, R * 0.22, R * 0.3, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(200,90,80,0.12)"; g.beginPath(); g.ellipse(fx + R * 0.33, -R * 0.38, R * 0.17, R * 0.1, 0, 0, 7); g.ellipse(fx - R * 0.33 * (1 - turn * 0.6), -R * 0.38, R * 0.14, R * 0.09, 0, 0, 7); g.fill();
    if (age > 0.4) { g.strokeStyle = `rgba(90,50,40,${(age - 0.4) * 0.6})`; g.lineWidth = OL * 0.45; g.beginPath(); g.moveTo(fx - R * 0.25, R * 0.38); g.lineTo(fx + R * 0.25, R * 0.4); g.moveTo(fx + R * 0.2, -R * 0.35); g.quadraticCurveTo(fx + R * 0.28, -R * 0.5, fx + R * 0.24, -R * 0.6); g.stroke(); }
  });
  // facial hair under the features
  const beard = L.beard ?? "none";
  if (beard !== "none") {
    const bd = new Path2D(); const by = beard === "full" ? -R * 1.25 : beard === "short" ? -R * 1.08 : -R * 1.12;
    bd.moveTo(-w * 0.95, -R * 0.12); bd.quadraticCurveTo(-w * 0.9, -R * 0.75, chinX - jawW * 0.4, by + R * 0.05);
    bd.quadraticCurveTo(chinX, by - R * (beard === "full" ? 0.1 : 0), chinX + jawW * 0.5, by + R * 0.05);
    bd.quadraticCurveTo(w * 0.95 + turn * R * 0.1, -R * 0.7, w + turn * R * 0.06, -R * 0.12);
    bd.lineTo(w * 0.7, -R * 0.12); bd.quadraticCurveTo(fx + R * 0.4, -R * 0.58, fx, -R * 0.62); bd.quadraticCurveTo(fx - R * 0.4, -R * 0.58, -w * 0.7, -R * 0.12); bd.closePath();
    if (beard === "chin") { const c2 = new Path2D(); c2.ellipse(chinX, -R * 0.95, jawW * 0.45, R * 0.22, 0, 0, 7); paint(g, c2, hair, OL * 0.8, ls, [-R, -R * 1.3, R, -R * 0.7]); }
    else paint(g, bd, hair, OL * 0.8, ls, [-w, by, w, 0], () => { g.strokeStyle = shade(hair, 0.65); g.lineWidth = OL * 0.4; for (let i = 0; i < 9; i++) { const x = -w * 0.8 + i * w * 0.2; g.beginPath(); g.moveTo(x, -R * 0.4); g.quadraticCurveTo(x + R * 0.03, -R * 0.7, x * 0.7 + chinX * 0.3, by + R * 0.15); g.stroke(); } });
  }
  // eyes: almond shapes with lids, iris, highlight; the far eye is narrower
  const blink = ((t * 0.23 + p.seed * 0.137) % 1) < 0.025 ? 0.1 : 1;
  const open = Math.max(0.1, Math.min(1.2, (1 + st.eyes * 0.5) * blink));
  const eyeY = R * 0.02, gap = R * 0.29;
  const lookX = st.look * R * 0.035, lookY = st.lookY * R * 0.03;
  for (const s of [-1, 1]) {
    const k = 1 - (s < 0 ? Math.max(0, turn) : Math.max(0, -turn)) * 0.55;
    const ex = fx + s * gap * (1 - Math.abs(turn) * 0.25), ew = R * 0.15 * k, eh = R * 0.075 * open;
    const eye = new Path2D(); eye.moveTo(ex - ew, eyeY); eye.quadraticCurveTo(ex - ew * 0.2, eyeY + eh * 1.6, ex + ew, eyeY + eh * 0.1); eye.quadraticCurveTo(ex + ew * 0.1, eyeY - eh * 1.1, ex - ew, eyeY); eye.closePath();
    g.fillStyle = "#f4efe6"; g.fill(eye);
    g.save(); g.clip(eye); g.fillStyle = "#5a4636"; g.beginPath(); g.arc(ex + lookX + turn * ew * 0.25, eyeY + lookY + eh * 0.2, R * 0.065, 0, 7); g.fill();
    g.fillStyle = "#1c1410"; g.beginPath(); g.arc(ex + lookX + turn * ew * 0.25, eyeY + lookY + eh * 0.2, R * 0.03, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(ex + lookX + turn * ew * 0.25 + R * 0.02, eyeY + lookY + eh * 0.45, R * 0.014, 0, 7); g.fill();
    g.fillStyle = "rgba(60,30,20,0.25)"; g.fillRect(ex - ew, eyeY + eh * 0.5, ew * 2, eh * 2); g.restore();
    // upper lid (thicker, tapered), lower lid (thin), crease
    g.strokeStyle = LINE; g.lineWidth = OL * 1.1; g.beginPath(); g.moveTo(ex - ew * 1.05, eyeY - eh * 0.05); g.quadraticCurveTo(ex - ew * 0.2, eyeY + eh * 1.7, ex + ew * 1.05, eyeY + eh * 0.15); g.stroke();
    g.lineWidth = OL * 0.45; g.beginPath(); g.moveTo(ex - ew * 0.8, eyeY - eh * 0.3); g.quadraticCurveTo(ex, eyeY - eh * 1.2, ex + ew * 0.9, eyeY - eh * 0.1); g.stroke();
    g.strokeStyle = "rgba(43,29,23,0.5)"; g.beginPath(); g.moveTo(ex - ew * 0.8, eyeY + eh * 2.1 + R * 0.02); g.quadraticCurveTo(ex, eyeY + eh * 2.7 + R * 0.04, ex + ew * 0.9, eyeY + eh * 1.6 + R * 0.03); g.stroke();
    // brow: tapered stroke, raised/frowned by st.brow (and slanted inward when frowning)
    const by = eyeY + R * 0.2 + st.brow * R * 0.06, slant = -Math.min(0, st.brow) * R * 0.06 * s;
    g.fillStyle = shade(hair, 0.8); g.beginPath();
    g.moveTo(ex - ew * 1.2 * s * -1 * 0 + ex * 0 - ew * 1.1, by + (s > 0 ? -slant * 0 : 0) - R * 0.01 + (s < 0 ? slant : 0));
    g.quadraticCurveTo(ex, by + R * 0.05, ex + ew * 1.2, by - R * 0.02 + (s > 0 ? slant : 0));
    g.quadraticCurveTo(ex, by + R * 0.01, ex - ew * 1.1, by - R * 0.03 + (s < 0 ? slant : 0)); g.fill();
  }
  // nose: bridge line on the far side, tip, nostril, shadow
  const nx = fx + turn * R * 0.12, ny = -R * 0.3;
  g.strokeStyle = LINE; g.lineWidth = OL * 0.75; g.beginPath(); g.moveTo(nx - turn * R * 0.05, eyeY - R * 0.02); g.quadraticCurveTo(nx + turn * R * 0.08, ny + R * 0.1, nx + turn * R * 0.14 + R * 0.02, ny + R * 0.01); g.quadraticCurveTo(nx + turn * R * 0.04, ny - R * 0.07, nx - R * 0.05, ny - R * 0.04); g.stroke();
  g.fillStyle = "rgba(120,60,50,0.22)"; g.beginPath(); g.ellipse(nx - R * 0.05 - turn * R * 0.03, ny - R * 0.03, R * 0.08, R * 0.04, 0, 0, 7); g.fill();
  g.fillStyle = "rgba(43,29,23,0.7)"; g.beginPath(); g.ellipse(nx - R * 0.02, ny - R * 0.045, R * 0.025, R * 0.012, -0.3, 0, 7); g.fill();
  // moustache + mouth
  const my = -R * 0.52, mw = R * 0.24 * (1 - Math.abs(turn) * 0.25), talk = (P.talk ?? 0) > 0 ? Math.abs(Math.sin(t * 13 + Math.sin(t * 5) * 2)) * (P.talk ?? 0) : 0;
  const open2 = Math.max(st.mouth, talk) * R * 0.12, sm = st.smile * R * 0.05;
  if (open2 > R * 0.01) { const mo = new Path2D(); mo.moveTo(fx - mw, my); mo.quadraticCurveTo(fx, my - open2 * 1.6, fx + mw, my); mo.quadraticCurveTo(fx, my + R * 0.02, fx - mw, my); g.fillStyle = "#4a1f1c"; g.fill(mo); g.save(); g.clip(mo); g.fillStyle = "#f2ece2"; g.fillRect(fx - mw, my - R * 0.03, mw * 2, R * 0.03); g.restore(); }
  g.strokeStyle = LINE; g.lineWidth = OL * 0.8; g.beginPath(); g.moveTo(fx - mw, my + sm); g.quadraticCurveTo(fx - mw * 0.3, my - R * 0.012, fx, my - R * 0.005); g.quadraticCurveTo(fx + mw * 0.3, my - R * 0.012, fx + mw, my + sm); g.stroke();
  g.strokeStyle = "rgba(43,29,23,0.45)"; g.lineWidth = OL * 0.5; g.beginPath(); g.moveTo(fx - mw * 0.5, my - R * 0.1 - open2); g.quadraticCurveTo(fx, my - R * 0.13 - open2, fx + mw * 0.5, my - R * 0.1 - open2); g.stroke();
  if (L.moustache) { const ms = new Path2D(); ms.moveTo(fx, my + R * 0.1); ms.quadraticCurveTo(fx - mw * 1.1, my + R * 0.14, fx - mw * 1.35, my - R * 0.04); ms.quadraticCurveTo(fx - mw * 0.6, my + R * 0.02, fx, my + R * 0.04); ms.quadraticCurveTo(fx + mw * 0.6, my + R * 0.02, fx + mw * 1.35, my - R * 0.04); ms.quadraticCurveTo(fx + mw * 1.1, my + R * 0.14, fx, my + R * 0.1); paint(g, ms, hair, OL * 0.7, ls, [-R, my - R * 0.1, R, my + R * 0.2]); }
  // hair
  drawHair(g, L, hair, R, w, turn, OL, ls);
  drawHat(g, L, R, turn, OL, ls, view);
  g.restore();
}

function drawHair(g: Ctx, L: HLook, hair: string, R: number, w: number, turn: number, OL: number, ls: number) {
  const st = L.hairStyle; if (st === "bald") { if (L.sideburns || true) { const sb = new Path2D(); sb.ellipse(-w * 0.95, R * 0.05, R * 0.12, R * 0.3, 0, 0, 7); paint(g, sb, hair, OL * 0.6, ls, [-R, -R, R, R]); } return; }
  const hp = new Path2D();
  const back = -w * 1.05 - turn * R * 0.08, front = w * 1.02;
  if (st === "long" || (L.female && st !== "bun")) {
    hp.moveTo(back - R * 0.12, -R * (L.female ? 1.2 : 0.7)); hp.quadraticCurveTo(back - R * 0.25, R * 0.9, 0, R * 1.08); hp.quadraticCurveTo(front + R * 0.15, R * 0.95, front + R * 0.06, R * 0.1);
    hp.quadraticCurveTo(front * 0.5 + turn * R * 0.2, R * 0.62, -R * 0.05 + turn * R * 0.25, R * 0.55); hp.quadraticCurveTo(back + R * 0.2, R * 0.3, back + R * 0.1, -R * 0.9); hp.closePath();
  } else {
    const top = st === "curly" ? 1.12 : st === "swept" ? 1.1 : 1.02;
    hp.moveTo(back, -R * 0.15); hp.quadraticCurveTo(back - R * 0.06, R * top * 0.95, -R * 0.05, R * top); hp.quadraticCurveTo(front * 0.9 + R * 0.12, R * top * 0.95, front + R * 0.02, R * 0.25);
    hp.quadraticCurveTo(front * 0.45 + turn * R * 0.2, R * (st === "swept" ? 0.72 : 0.6), -R * 0.1 + turn * R * 0.25, R * 0.62); hp.quadraticCurveTo(back + R * 0.25, R * 0.45, back + R * 0.12, -R * 0.1);
    if (L.sideburns) { hp.lineTo(back + R * 0.32, -R * 0.45); hp.lineTo(back + R * 0.2, -R * 0.1); }
    hp.closePath();
  }
  paint(g, hp, hair, OL, ls, [-R * 1.2, -R, R * 1.2, R * 1.1], () => {
    g.strokeStyle = shade(hair, 0.62); g.lineWidth = OL * 0.45;
    for (let i = 0; i < 8; i++) { const x = back + (i / 7) * (front - back); g.beginPath(); g.moveTo(x * 0.9, R * 0.98); g.quadraticCurveTo(x + R * 0.08, R * 0.75, x * 0.95 + R * 0.05, R * 0.45); g.stroke(); }
    g.strokeStyle = "rgba(255,240,210,0.3)"; g.lineWidth = OL * 0.9; g.beginPath(); g.moveTo(-R * 0.3, R * 0.95); g.quadraticCurveTo(R * 0.1, R * 1.02, R * 0.4, R * 0.88); g.stroke();
  });
  if (st === "bun") { const bn = new Path2D(); bn.ellipse(back - R * 0.02, R * 0.55, R * 0.28, R * 0.24, 0, 0, 7); paint(g, bn, hair, OL, ls, [-R * 1.3, 0, 0, R]); }
}

function drawHat(g: Ctx, L: HLook, R: number, turn: number, OL: number, ls: number, view: View) {
  const hat = L.hat ?? "none"; if (hat === "none") return;
  const col = L.hatCol ?? "#1f1c22", bx = R * 1.0;
  const p = new Path2D();
  if (hat === "captain") {   // a peaked merchant captain's cap
    p.moveTo(-bx * 0.82, R * 0.55); p.quadraticCurveTo(-bx * 0.95, R * 1.05, -bx * 0.2, R * 1.12); p.quadraticCurveTo(bx * 0.9, R * 1.15, bx * 0.95, R * 0.75); p.lineTo(bx * 0.82, R * 0.5); p.closePath();
    paint(g, p, col, OL, ls, [-bx, R * 0.4, bx, R * 1.2], () => { g.fillStyle = shade(col, 0.6); g.fillRect(-bx, R * 0.5, bx * 2, R * 0.14); });
    if (view !== "back") { const pk = new Path2D(); pk.ellipse(bx * 0.25 + turn * bx * 0.45, R * 0.52, bx * 0.55, R * 0.1, -0.1 * turn, 0, 7); paint(g, pk, "#141216", OL, ls, [-bx, R * 0.4, bx, R * 0.6]); const bd = new Path2D(); bd.ellipse(turn * bx * 0.3, R * 0.72, R * 0.1, R * 0.07, 0, 0, 7); paint(g, bd, "#d9b04a", OL * 0.6, ls, [-bx, R * 0.6, bx, R * 0.8]); }
  } else if (hat === "top") {
    p.moveTo(-bx * 0.7, R * 0.62); p.lineTo(-bx * 0.66, R * 1.75); p.quadraticCurveTo(0, R * 1.82, bx * 0.66, R * 1.75); p.lineTo(bx * 0.7, R * 0.62); p.closePath(); paint(g, p, col, OL, ls, [-bx, R * 0.6, bx, R * 1.8], () => { g.fillStyle = shade(col, 0.6); g.fillRect(-bx, R * 0.62, bx * 2, R * 0.16); });
    const br = new Path2D(); br.ellipse(0, R * 0.62, bx * 1.1, R * 0.12, 0, 0, 7); paint(g, br, col, OL, ls, [-bx, R * 0.5, bx, R * 0.75]);
  } else if (hat === "wide" || hat === "seaman") {
    const wb = hat === "wide" ? 1.45 : 1.15;
    p.moveTo(-bx * 0.78, R * 0.6); p.quadraticCurveTo(-bx * 0.8, R * 1.25, 0, R * 1.2); p.quadraticCurveTo(bx * 0.8, R * 1.25, bx * 0.78, R * 0.6); p.closePath(); paint(g, p, col, OL, ls, [-bx, R * 0.5, bx, R * 1.3], () => { g.fillStyle = shade(col, 0.65); g.fillRect(-bx, R * 0.6, bx * 2, R * 0.14); });
    const br = new Path2D(); br.ellipse(0, R * 0.6, bx * wb, R * 0.13, -0.04, 0, 7); paint(g, br, col, OL, ls, [-bx * wb, R * 0.45, bx * wb, R * 0.75]);
  } else if (hat === "bonnet") {
    p.moveTo(-bx * 0.95, -R * 0.1); p.quadraticCurveTo(-bx * 1.1, R * 1.3, bx * 0.3, R * 1.15); p.quadraticCurveTo(bx * 1.05, R * 0.95, bx * 0.95, R * 0.4); p.quadraticCurveTo(bx * 0.4, R * 0.7, -bx * 0.6, R * 0.2); p.closePath();
    paint(g, p, col, OL, ls, [-bx, -R * 0.2, bx, R * 1.2]);
    g.strokeStyle = shade(col, 0.6); g.lineWidth = OL * 0.6; g.beginPath(); g.moveTo(-bx * 0.7, -R * 0.2); g.quadraticCurveTo(-bx * 0.3, -R * 0.9, 0, -R * 0.95); g.stroke();
  } else if (hat === "kepi" || hat === "cap") {
    p.moveTo(-bx * 0.82, R * 0.55); p.lineTo(-bx * 0.72, R * 1.15); p.quadraticCurveTo(bx * 0.2, R * 1.25, bx * 0.88, R * 0.95); p.lineTo(bx * 0.82, R * 0.55); p.closePath(); paint(g, p, col, OL, ls, [-bx, R * 0.5, bx, R * 1.25]);
    const pk = new Path2D(); pk.ellipse(bx * 0.25 + turn * bx * 0.45, R * 0.52, bx * 0.5, R * 0.09, -0.1, 0, 7); paint(g, pk, "#141216", OL, ls, [-bx, R * 0.4, bx, R * 0.6]);
  } else if (hat === "bicorne") {
    const ww = bx * (1.6 - Math.abs(turn) * 0.6);
    p.moveTo(-ww, R * 0.62); p.quadraticCurveTo(-ww * 0.9, R * 1.35, 0, R * 1.5); p.quadraticCurveTo(ww * 0.9, R * 1.35, ww, R * 0.62); p.quadraticCurveTo(0, R * 0.8, -ww, R * 0.62); paint(g, p, col, OL, ls, [-ww, R * 0.6, ww, R * 1.5]);
  }
}

/** prop helper: draw a straight held object from the hand (metres, figure frame) */
export function heldLine(g: Ctx, H: V, ang: number, len: number, w: number, col: string, OL: number) {
  g.save(); g.translate(H[0], H[1]); g.rotate(ang); g.lineCap = "round";
  g.strokeStyle = LINE; g.lineWidth = w + OL * 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(len, 0); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(0, 0); g.lineTo(len, 0); g.stroke(); g.restore();
}
