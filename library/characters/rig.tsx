// KAIZEN CLIPS CHARACTER RIG (library): the one shared 2D ink character for every Short, in the Hidebehind look.
// It is the approved Hidebehind logger rig (templates/hidebehind/logger.tsx, from the Toon rig) made general:
// with no new options set it draws exactly what the logger rig draws, so approved looks stay pixel-identical.
//
// Kept from the approved rig: the distance-driven planted-foot walk (no sliding, feet never cross), soft volume arms
// that bend smoothly (no hinges, no joint circles, no V bends), a leaning/bobbing torso whose shoulders turn with the
// arm swing, arms that hang and only breathe when standing, the lantern with a pendulum swing and flame.
// New (all optional, data only, so a new character is a Look object, never a copied file):
//  - body: height, build (slim .. heavy), head size, belly; child and elder looks come from these
//  - hair styles, many hats by period, outfits (jacket, long coat, dress, robe, uniform, vest), patterns, ties,
//    scarves, aprons, glasses, medals, shoes
//  - motion inputs: run (flight phase, bent arms, forward lean), crouch, sit, fall, look up/down
//  - faces: angry, sad, surprised, laugh, smug, determined, pain, plus mouth shapes for talking (A E O U M F)
//  - hands: open, fist, pointing; props in the hand: torch, sword, cane, paper, cup, axe, bag, book, flag ...
// Units are metres, feet on y = 0, the figure faces +x (flip mirrors it). Motion presets live in ./motion.ts,
// ready-made looks in ./looks.ts.
import React from "react";

export const INK = "#1d1820";
const rad = (d: number) => (d * Math.PI) / 180;
const P = (n: number) => n.toFixed(4);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export type Hat = "pith" | "turban" | "none" | "slouch" | "tophat" | "bowler" | "tricorn" | "flatcap" | "kepi" | "helmet"
  | "boater" | "bonnet" | "crown" | "hood" | "cowboy" | "fez" | "beret" | "chef" | "headscarf" | "straw";
export type ToonLook = {
  toque?: string; toqueDark?: string; beard?: string; check?: string; braces?: string;
  skin: string; top: string; topDark: string; legs: string; legsDark?: string; boots: string; hair: string;
  hat?: Hat; hatCol?: string; band?: string; mustache?: boolean; belt?: string; sash?: string;
  /** long shirt (kurta) over the trousers instead of a short jacket */
  long?: boolean;
  // ---- library additions (all optional) ----
  /** body shape: height (1 = adult man, ~0.62 child), build (0.85 slim .. 1.35 heavy), head (1 = normal), belly 0..1 */
  body?: { height?: number; build?: number; head?: number; belly?: number };
  hairStyle?: "short" | "long" | "bun" | "bald" | "ponytail" | "curly" | "topknot";
  /** jacket (default), coat (to the knee), dress (skirt to the ankle), robe (to the ankle, loose), uniform, vest */
  outfit?: "jacket" | "coat" | "dress" | "robe" | "uniform" | "vest";
  /** second colour: the vest over the shirt, the skirt of a dress, the uniform trim, the robe lining */
  accent?: string;
  pattern?: "check" | "stripes";
  tie?: string; scarf?: string; apron?: string; glasses?: boolean; medals?: boolean; lips?: string; blush?: boolean;
  shoes?: "boots" | "shoes" | "sandals" | "bare";
  /** facial hair */
  stubble?: boolean; sideburns?: boolean;
  /** eyebrows colour (default ink) and thickness 1 = normal */
  brow?: number;
};
export type Expr = "neutral" | "stern" | "worried" | "scared" | "smile" | "angry" | "sad" | "surprised" | "laugh" | "smug"
  | "determined" | "pain";
export type Prop = "plank" | "rifle" | "lantern" | "torch" | "sword" | "cane" | "paper" | "cup" | "axe" | "bag" | "book"
  | "flag" | "pistol" | "shovel" | "candle" | null;
export type ToonPose = {
  /** metres walked so far along the facing direction (drives the feet) */
  dist?: number;
  /** 0 standing .. 1 walking (or running, see run) */
  walk?: number;
  /** seconds, for breathing and the idle sway */
  t?: number;
  /** arm overrides: [upper arm angle from straight down (+ = forward), elbow bend (>= 0, always bends forward)] */
  armNear?: [number, number]; armFar?: [number, number];
  expr?: Expr;
  lookX?: number; blink?: boolean; talk?: number; tilt?: number;
  hold?: Prop;
  /** lantern / torch / candle flame 0 (out) .. 1 (lit) */
  lit?: number;
  // ---- library additions ----
  /** 0 walk .. 1 run (longer stride, both feet off the ground, bent arms, forward lean) */
  run?: number;
  /** pupils up (-1) .. down (+1) */
  lookY?: number;
  /** mouth shape for talking: overrides talk */
  mouth?: "A" | "E" | "O" | "U" | "M" | "F" | null;
  /** knees bend, hips drop (0..1) */
  crouch?: number;
  /** sit on a seat `seat` metres high (0..1 blend) */
  sit?: number; seat?: number;
  /** topple: 0 upright .. 1 lying on the ground; fallDir +1 falls forward, -1 backward */
  fall?: number; fallDir?: number;
  /** extra torso lean in degrees (+ forward) */
  lean?: number;
  handNear?: "open" | "fist" | "point"; handFar?: "open" | "fist" | "point";
  /** the far hand holds the prop instead of the near one */
  holdFar?: boolean;
  /** rifle raised to the shoulder and aimed along the near forearm */
  aiming?: boolean;
};

// proportions (metres, y up is negative)
const HIP = 0.625, THIGH = 0.29, SHIN = 0.28, ANKLE = 0.07;
const SHOULDER = 0.94, NECK = 0.99, HEAD_R = 0.25;
const UPPER = 0.2, FORE = 0.18;
/** stride (same foot to same foot) and the share of the cycle a foot is on the ground */
export const TOON_STRIDE = 0.9;
const STANCE = 0.6;
/** running: stride and stance share (less than half: there is a flight phase) */
export const RUN_STRIDE = 1.55;
const RUN_STANCE = 0.36;
/** the stride for a given run blend (motion.ts uses it to turn speed into distance) */
export const strideFor = (run = 0) => mix(TOON_STRIDE, RUN_STRIDE, clamp01(run));

/** two-bone IK: root -> target, bend +1 puts the middle joint forward (+x) */
const ik = (rx: number, ry: number, tx: number, ty: number, l1: number, l2: number, bend: number) => {
  const dx = tx - rx, dy = ty - ry, d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, Math.hypot(dx, dy)));
  const a = Math.atan2(dy, dx), off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = a - bend * off;
  return { jx: rx + Math.cos(ang) * l1, jy: ry + Math.sin(ang) * l1, tx: rx + Math.cos(a) * d, ty: ry + Math.sin(a) * d };
};

type V = [number, number];
/** a soft tube along a curve that passes through a (root), b (joint) and c (end); half-width wa at the root to wc at
 *  the end. The joint is rounded by the curve itself, so an elbow or knee reads as a bend in cloth, not a hinge. */
const tube = (a: V, b: V, c: V, wa: number, wc: number, bulge = 0) => {
  const q: V = [2 * b[0] - (a[0] + c[0]) / 2, 2 * b[1] - (a[1] + c[1]) / 2];
  const N = 16, pts: V[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * q[0] + t * t * c[0], u * u * a[1] + 2 * u * t * q[1] + t * t * c[1]]);
  }
  const L: V[] = [], R: V[] = [];
  for (let i = 0; i <= N; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, t = i / N;
    const w = mix(wa, wc, t) * (1 + bulge * Math.sin(Math.PI * Math.min(1, t * 2)) * (t < 0.5 ? 1 : 0.4));
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const s = (p: V) => `${P(p[0])},${P(p[1])}`;
  return `M${s(L[0])} ${L.slice(1).map((p) => `L${s(p)}`).join(" ")} A${P(wc)},${P(wc)} 0 0 1 ${s(R[N])} ${R.slice(0, N).reverse().map((p) => `L${s(p)}`).join(" ")} A${P(wa)},${P(wa)} 0 0 1 ${s(L[0])} Z`;
};

/** outline pass then fill pass, so overlapping pieces of one part merge into one clean shape */
const Two: React.FC<{ d: string | string[]; fill: string; ow?: number }> = ({ d, fill, ow = 0.026 }) => {
  const ds = Array.isArray(d) ? d : [d];
  return <g>
    {ds.map((x, i) => <path key={"o" + i} d={x} fill={INK} stroke={INK} strokeWidth={ow} strokeLinejoin="round" />)}
    {ds.map((x, i) => <path key={"f" + i} d={x} fill={fill} />)}
  </g>;
};

/** one foot's place relative to the hips for a figure that has moved `dist` metres; o = 0 near foot, 0.5 far foot */
const footAt = (dist: number, o: number, w: number, idleRel: number, run = 0) => {
  const C = strideFor(run), ST = mix(STANCE, RUN_STANCE, run), cyc = dist / C + o, loc = cyc - Math.floor(cyc);
  let rel: number, lift = 0, pitch = 0;
  if (loc < ST) {
    rel = 0.5 * ST * C - loc * C;                       // planted: moves back exactly as fast as the body moves on
    const k = loc / ST;
    pitch = k < 0.1 / STANCE ? mix(-14, 0, smooth(k / (0.1 / STANCE))) : k > 0.4 / STANCE ? mix(0, 30, smooth((k - 0.4 / STANCE) / (1 - 0.4 / STANCE))) : 0;
  } else {
    const k = (loc - ST) / (1 - ST), e = smooth(k);
    rel = -0.5 * ST * C + ST * C * e;
    // running: the swing foot kicks up behind, then reaches forward (knee lifts)
    lift = mix(0.09, 0.26, run) * Math.sin(Math.PI * Math.min(1, k * 1.15)) + run * 0.08 * Math.sin(Math.PI * Math.min(1, k * 1.6));
    pitch = mix(30, -14, smooth(k * 1.1));
  }
  return { rel: mix(idleRel, rel, w), lift: lift * w, pitch: pitch * w, loc };
};

/** boot in ankle space (ankle at 0,0, sole at y = ANKLE): heel at -0.055, toe at +0.16 */
const BOOT = `M-0.05,-0.045 L0.035,-0.045 L0.05,0.005 Q0.16,0.0 0.168,0.05 L0.165,0.07 L-0.06,0.07 Q-0.07,0.02 -0.05,-0.045 Z`;
const SHOE = `M-0.05,0.0 L0.04,0.0 Q0.15,0.01 0.165,0.05 L0.162,0.07 L-0.058,0.07 Q-0.066,0.03 -0.05,0.0 Z`;
const BAREFOOT = `M-0.045,-0.01 L0.03,-0.01 Q0.12,0.02 0.16,0.05 Q0.17,0.07 0.14,0.072 L-0.05,0.072 Q-0.065,0.03 -0.045,-0.01 Z`;
const HEEL: V = [-0.055, ANKLE], BALL: V = [0.1, ANKLE];
/** the ankle point and boot angle for a foot planted at rel, rolled by pitch (+ heel up about the ball, - toe up about the heel) */
const footPose = (rel: number, lift: number, pitch: number) => {
  const piv = pitch >= 0 ? BALL : HEEL, a = rad(pitch), c = Math.cos(a), s = Math.sin(a);
  const pw: V = [rel + piv[0], -lift];                 // pivot in body space (ground y = 0)
  const vx = -piv[0], vy = -piv[1];                    // ankle relative to pivot, rotated
  return { ax: pw[0] + vx * c - vy * s, ay: pw[1] + vx * s + vy * c, deg: pitch };
};

// ---------------------------------------------------------------- head: hair, face, hats
const HIDE_HAIR: Hat[] = ["turban", "pith", "slouch", "tophat", "bowler", "tricorn", "kepi", "helmet", "hood", "cowboy", "chef", "headscarf", "bonnet"];

const HairBack: React.FC<{ hx: number; hy: number; L: ToonLook; t: number }> = ({ hx, hy, L, t }) => {
  const st = L.hairStyle;
  if (st === "long") {
    const sw = 0.012 * Math.sin(t * 1.3);
    return <path d={`M${P(hx - 0.2)},${P(hy - 0.17)} Q${P(hx - 0.36)},${P(hy + 0.1)} ${P(hx - 0.3 + sw)},${P(hy + 0.42)} Q${P(hx - 0.12)},${P(hy + 0.46)} ${P(hx + 0.02 + sw)},${P(hy + 0.36)} L${P(hx + 0.06)},${P(hy + 0.12)} Z`}
      fill={L.hair} stroke={INK} strokeWidth={0.018} strokeLinejoin="round" />;
  }
  if (st === "ponytail") {
    const sw = 0.02 * Math.sin(t * 2.1);
    return <path d={`M${P(hx - 0.2)},${P(hy - 0.12)} Q${P(hx - 0.4)},${P(hy - 0.05)} ${P(hx - 0.36 + sw)},${P(hy + 0.3)} Q${P(hx - 0.3 + sw)},${P(hy + 0.14)} ${P(hx - 0.16)},${P(hy - 0.02)} Z`}
      fill={L.hair} stroke={INK} strokeWidth={0.018} strokeLinejoin="round" />;
  }
  if (st === "bun") return <circle cx={hx - 0.2} cy={hy - 0.2} r={0.1} fill={L.hair} stroke={INK} strokeWidth={0.018} />;
  if (st === "topknot") return <ellipse cx={hx - 0.04} cy={hy - 0.28} rx={0.07} ry={0.05} fill={L.hair} stroke={INK} strokeWidth={0.016} />;
  return null;
};

const HairFront: React.FC<{ hx: number; hy: number; L: ToonLook }> = ({ hx, hy, L }) => {
  const st = L.hairStyle ?? "short";
  if (st === "bald") return <path d={`M${P(hx - HEAD_R)},${P(hy + 0.02)} Q${P(hx - HEAD_R - 0.01)},${P(hy - 0.06)} ${P(hx - HEAD_R * 0.75)},${P(hy - 0.1)} L${P(hx - HEAD_R * 0.7)},${P(hy + 0.02)} Z`} fill={L.hair} stroke={INK} strokeWidth={0.012} />;
  if (st === "curly") return <g>{[-0.2, -0.12, -0.03, 0.06, 0.14, -0.24].map((ox, i) => <circle key={i} cx={hx + ox} cy={hy - HEAD_R * 0.62 + Math.abs(ox) * 0.45 + (i === 5 ? 0.12 : 0)} r={0.075} fill={L.hair} stroke={INK} strokeWidth={0.014} />)}</g>;
  if (st === "long" || st === "ponytail" || st === "bun")
    return <path d={`M${P(hx - HEAD_R)},${P(hy + 0.05)} Q${P(hx - 0.14)},${P(hy - HEAD_R - 0.07)} ${P(hx + HEAD_R * 0.85)},${P(hy - HEAD_R * 0.5)} Q${P(hx + 0.08)},${P(hy - HEAD_R * 0.75)} ${P(hx - 0.06)},${P(hy - HEAD_R * 0.45)} Q${P(hx - 0.17)},${P(hy - 0.08)} ${P(hx - HEAD_R)},${P(hy + 0.05)} Z`} fill={L.hair} stroke={INK} strokeWidth={0.018} />;
  if (st === "topknot") return <path d={`M${P(hx - HEAD_R)},${P(hy - 0.02)} Q${P(hx - 0.2)},${P(hy - 0.17)} ${P(hx - 0.12)},${P(hy - 0.2)} L${P(hx - 0.14)},${P(hy - 0.02)} Z`} fill={L.hair} stroke={INK} strokeWidth={0.016} />;
  // short: the approved logger hair
  return <path d={`M${P(hx - HEAD_R)},${P(hy - 0.02)} Q${P(hx - 0.1)},${P(hy - HEAD_R - 0.06)} ${P(hx + HEAD_R * 0.8)},${P(hy - HEAD_R * 0.55)} Q${P(hx)},${P(hy - HEAD_R * 0.6)} ${P(hx - HEAD_R)},${P(hy - 0.02)} Z`} fill={L.hair} stroke={INK} strokeWidth={0.018} />;
};

const HatShape: React.FC<{ hx: number; hy: number; L: ToonLook }> = ({ hx, hy, L }) => {
  const c = L.hatCol ?? "#2a2624", b = L.band ?? "#151214", sw = 0.022;
  const p = (pts: string) => pts.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_m, x, y) => `${P(hx + Number(x))},${P(hy + Number(y))}`);
  const S = (d: string, fill: string, w = sw) => <path d={p(d)} fill={fill} stroke={INK} strokeWidth={w} strokeLinejoin="round" />;
  switch (L.hat) {
    case "pith": return <g>
      {S("M-0.2,-0.1 Q-0.2,-0.4 0.02,-0.41 Q0.24,-0.4 0.23,-0.1 Z", c)}
      <path d={p("M-0.2,-0.15 L0.23,-0.15 L0.23,-0.1 L-0.2,-0.1 Z")} fill={b} />
      {S("M-0.33,-0.05 Q0,-0.15 0.37,-0.05 Q0,-0.08 -0.33,-0.05 Z", c)}
      <path d={p("M-0.1,-0.33 Q-0.04,-0.37 0.02,-0.36")} stroke="rgba(255,255,255,0.5)" strokeWidth={0.02} fill="none" strokeLinecap="round" />
    </g>;
    case "turban": return <g>
      {S("M-0.25,-0.02 Q-0.3,-0.33 -0.02,-0.36 Q0.28,-0.36 0.26,-0.06 Q0,-0.12 -0.25,-0.02 Z", c)}
      {[0, 1].map((k) => <path key={k} d={p(`M${-0.22 + k * 0.03},${-0.1 - k * 0.1} Q0,${-0.22 - k * 0.1} ${0.24 - k * 0.04},${-0.12 - k * 0.09}`)} stroke={b} strokeWidth={0.022} fill="none" strokeLinecap="round" />)}
    </g>;
    case "slouch": return <g>
      {S("M-0.21,-0.13 Q-0.23,-0.36 -0.06,-0.4 Q0,-0.34 0.06,-0.4 Q0.23,-0.37 0.22,-0.13 Z", c)}
      <path d={p("M-0.215,-0.19 Q0,-0.215 0.225,-0.19 L0.222,-0.135 Q0,-0.16 -0.212,-0.135 Z")} fill={b} />
      {S("M-0.36,-0.06 Q-0.3,-0.17 0,-0.155 Q0.32,-0.16 0.42,-0.04 Q0.3,-0.09 0,-0.1 Q-0.27,-0.1 -0.36,-0.06 Z", c, 0.02)}
    </g>;
    case "tophat": return <g>
      {S("M-0.19,-0.14 L-0.21,-0.62 Q0.02,-0.66 0.23,-0.62 L0.21,-0.14 Z", c)}
      <path d={p("M-0.195,-0.22 L0.215,-0.22 L0.212,-0.15 L-0.192,-0.15 Z")} fill={b} />
      {S("M-0.33,-0.1 Q-0.3,-0.17 0,-0.16 Q0.33,-0.17 0.37,-0.1 Q0.2,-0.13 0,-0.12 Q-0.2,-0.13 -0.33,-0.1 Z", c, 0.02)}
    </g>;
    case "bowler": return <g>
      {S("M-0.22,-0.13 Q-0.24,-0.45 0.01,-0.46 Q0.25,-0.45 0.24,-0.13 Z", c)}
      <path d={p("M-0.222,-0.19 Q0,-0.21 0.24,-0.19 L0.24,-0.14 Q0,-0.16 -0.22,-0.14 Z")} fill={b} />
      {S("M-0.31,-0.08 Q-0.28,-0.16 0,-0.14 Q0.3,-0.16 0.34,-0.08 Q0.2,-0.12 0,-0.11 Q-0.2,-0.12 -0.31,-0.08 Z", c, 0.02)}
    </g>;
    case "tricorn": return <g>
      {S("M-0.2,-0.12 Q-0.22,-0.38 0.02,-0.4 Q0.24,-0.38 0.22,-0.12 Z", c)}
      {S("M-0.36,-0.32 Q-0.3,-0.12 0,-0.12 Q0.3,-0.12 0.38,-0.3 Q0.3,-0.18 0.02,-0.2 Q-0.28,-0.18 -0.36,-0.32 Z", c, 0.02)}
      <path d={p("M-0.36,-0.32 Q-0.3,-0.12 0,-0.12 Q0.3,-0.12 0.38,-0.3")} stroke={b} strokeWidth={0.016} fill="none" />
    </g>;
    case "flatcap": return <g>
      {S("M-0.25,-0.08 Q-0.27,-0.32 0.0,-0.33 Q0.22,-0.32 0.26,-0.14 L0.38,-0.08 Q0.3,-0.04 0.2,-0.07 Q0,-0.1 -0.25,-0.08 Z", c)}
      <path d={p("M-0.15,-0.26 Q0.02,-0.3 0.2,-0.18")} stroke="rgba(0,0,0,0.25)" strokeWidth={0.014} fill="none" />
    </g>;
    case "kepi": return <g>
      {S("M-0.21,-0.1 L-0.17,-0.4 Q0.04,-0.43 0.2,-0.38 L0.23,-0.1 Z", c)}
      <path d={p("M-0.21,-0.16 L0.23,-0.16 L0.23,-0.11 L-0.21,-0.11 Z")} fill={b} />
      {S("M0.1,-0.1 L0.38,-0.07 Q0.36,-0.03 0.1,-0.05 Z", "#141214", 0.016)}
      <circle cx={hx + 0.05} cy={hy - 0.25} r={0.025} fill={b} />
    </g>;
    case "helmet": return <g>
      {S("M-0.38,-0.1 Q-0.3,-0.14 -0.22,-0.15 Q-0.22,-0.42 0.02,-0.43 Q0.26,-0.42 0.26,-0.15 Q0.34,-0.14 0.42,-0.1 Q0.02,-0.06 -0.38,-0.1 Z", c)}
      <path d={p("M-0.08,-0.36 Q0,-0.39 0.08,-0.37")} stroke="rgba(255,255,255,0.3)" strokeWidth={0.016} fill="none" strokeLinecap="round" />
    </g>;
    case "boater": case "straw": return <g>
      {S("M-0.2,-0.12 L-0.19,-0.32 Q0.02,-0.35 0.22,-0.32 L0.22,-0.12 Z", c)}
      <path d={p("M-0.2,-0.2 L0.22,-0.2 L0.22,-0.13 L-0.2,-0.13 Z")} fill={b} />
      {S(L.hat === "straw" ? "M-0.42,-0.04 Q-0.3,-0.15 0,-0.14 Q0.32,-0.15 0.45,-0.03 Q0.2,-0.1 0,-0.1 Q-0.22,-0.1 -0.42,-0.04 Z" : "M-0.34,-0.1 L0.37,-0.1 L0.37,-0.07 L-0.34,-0.07 Z", c, 0.02)}
    </g>;
    case "bonnet": return <g>
      {S("M-0.3,0.12 Q-0.36,-0.32 0.0,-0.36 Q0.3,-0.34 0.34,-0.05 Q0.18,-0.2 -0.05,-0.18 Q-0.22,-0.1 -0.2,0.12 Z", c)}
      <path d={p("M-0.08,0.0 Q0.06,0.18 0.12,0.3")} stroke={b} strokeWidth={0.02} fill="none" strokeLinecap="round" />
    </g>;
    case "crown": return <g>
      {S("M-0.2,-0.14 L-0.22,-0.4 L-0.12,-0.3 L-0.03,-0.44 L0.06,-0.3 L0.15,-0.44 L0.22,-0.3 L0.24,-0.14 Z", c ?? "#d8a828")}
      {[-0.12, 0.02, 0.15].map((ox, i) => <circle key={i} cx={hx + ox} cy={hy - 0.2} r={0.022} fill={b} stroke={INK} strokeWidth={0.008} />)}
    </g>;
    case "hood": return <g>
      {S("M-0.34,0.24 Q-0.42,-0.34 -0.02,-0.36 Q0.31,-0.35 0.32,-0.06 L0.27,0.02 Q0.24,-0.26 -0.03,-0.26 Q-0.24,-0.24 -0.25,0.05 Q-0.24,0.18 -0.14,0.26 Z", c)}
      <path d={p("M0.27,0.02 Q0.24,-0.26 -0.03,-0.26 Q-0.24,-0.24 -0.25,0.05")} stroke="rgba(0,0,0,0.3)" strokeWidth={0.03} fill="none" />
    </g>;
    case "cowboy": return <g>
      {S("M-0.2,-0.13 Q-0.22,-0.4 -0.05,-0.43 Q0,-0.37 0.05,-0.43 Q0.22,-0.4 0.22,-0.13 Z", c)}
      <path d={p("M-0.205,-0.19 Q0,-0.21 0.22,-0.19 L0.22,-0.135 Q0,-0.16 -0.2,-0.135 Z")} fill={b} />
      {S("M-0.44,-0.2 Q-0.36,-0.1 0,-0.12 Q0.36,-0.1 0.46,-0.2 Q0.42,-0.06 0,-0.07 Q-0.4,-0.06 -0.44,-0.2 Z", c, 0.02)}
    </g>;
    case "fez": return S("M-0.16,-0.15 L-0.12,-0.42 L0.14,-0.42 L0.18,-0.15 Z", c);
    case "beret": return S("M-0.27,-0.12 Q-0.3,-0.3 -0.02,-0.33 Q0.3,-0.33 0.33,-0.18 Q0.2,-0.1 -0.27,-0.12 Z", c);
    case "chef": return <g>
      {S("M-0.2,-0.12 L-0.2,-0.3 Q-0.32,-0.52 -0.1,-0.55 Q0.02,-0.66 0.14,-0.55 Q0.34,-0.52 0.22,-0.3 L0.22,-0.12 Z", c ?? "#f4f0e8")}
    </g>;
    case "headscarf": return <g>
      {S("M-0.29,0.08 Q-0.33,-0.33 0.0,-0.34 Q0.3,-0.33 0.3,-0.06 Q0.15,-0.2 -0.05,-0.19 Q-0.2,-0.12 -0.2,0.08 Z", c)}
      {S("M-0.3,0.02 L-0.42,0.2 L-0.3,0.14 Z", c, 0.016)}
    </g>;
    default: return null;
  }
};

const Head: React.FC<{ hx: number; hy: number; L: ToonLook; pose: ToonPose }> = ({ hx, hy, L, pose }) => {
  const lx = (pose.lookX ?? 0.4) * 0.03, ly = (pose.lookY ?? 0) * 0.014;
  const ex = pose.expr ?? "neutral";
  const talk = pose.talk !== undefined ? Math.max(0, Math.sin(pose.talk * 14)) * Math.max(0, Math.sin(pose.talk * 3.1 + 1)) : 0;
  const browT = ex === "stern" ? 0.035 : ex === "angry" || ex === "determined" ? 0.05 : ex === "worried" || ex === "scared" ? -0.03 : ex === "sad" || ex === "pain" ? -0.045 : 0;
  const browUp = ex === "surprised" ? -0.035 : ex === "scared" ? 0 : ex === "laugh" ? -0.012 : 0;
  const eyeR = ex === "scared" ? 0.045 : ex === "surprised" ? 0.05 : 0.036;
  const pupil = ex === "scared" ? 0.014 : ex === "surprised" ? 0.013 : 0.019;
  const closed = pose.blink || ex === "laugh" || ex === "pain";
  // upper lid cover (0 open .. 1 shut): smug and angry look through half lids, sad lids droop
  const lid = ex === "smug" ? 0.45 : ex === "angry" ? 0.25 : ex === "sad" ? 0.3 : ex === "determined" ? 0.2 : 0;
  const hideHair = !!L.toque || (L.hat !== undefined && HIDE_HAIR.includes(L.hat));
  const mouthD = () => {
    const mx = hx + 0.09, my = hy + 0.13;
    const vis = pose.mouth;
    if (vis) {
      const [rx, ry] = { A: [0.04, 0.04], E: [0.045, 0.022], O: [0.028, 0.035], U: [0.02, 0.022], M: [0.04, 0.004], F: [0.035, 0.01] }[vis];
      return vis === "M" ? <path d={`M${P(mx - 0.04)},${P(my)} L${P(mx + 0.04)},${P(my)}`} stroke={INK} strokeWidth={0.016} strokeLinecap="round" />
        : <ellipse cx={mx} cy={my + 0.005} rx={rx} ry={ry} fill="#5a1a22" stroke={INK} strokeWidth={0.012} />;
    }
    if (talk > 0.15) return <ellipse cx={hx + 0.09} cy={hy + 0.135} rx={0.035} ry={0.02 + 0.025 * talk} fill="#5a1a22" stroke={INK} strokeWidth={0.012} />;
    if (ex === "laugh") return <path d={`M${P(hx + 0.035)},${P(hy + 0.11)} L${P(hx + 0.15)},${P(hy + 0.105)} Q${P(hx + 0.14)},${P(hy + 0.2)} ${P(hx + 0.09)},${P(hy + 0.2)} Q${P(hx + 0.04)},${P(hy + 0.19)} ${P(hx + 0.035)},${P(hy + 0.11)} Z`} fill="#5a1a22" stroke={INK} strokeWidth={0.014} strokeLinejoin="round" />;
    if (ex === "surprised") return <ellipse cx={hx + 0.09} cy={hy + 0.145} rx={0.026} ry={0.036} fill="#5a1a22" stroke={INK} strokeWidth={0.012} />;
    if (ex === "angry" || ex === "pain") return <g>
      <rect x={hx + 0.045} y={hy + 0.115} width={0.09} height={0.035} rx={0.012} fill="#f4efe4" stroke={INK} strokeWidth={0.012} />
      <path d={`M${P(hx + 0.045)},${P(hy + 0.1325)} L${P(hx + 0.135)},${P(hy + 0.1325)}`} stroke={INK} strokeWidth={0.006} />
    </g>;
    const d = ex === "smile" ? `M${P(hx + 0.05)},${P(hy + 0.12)} q0.04,0.035 0.08,0`
      : ex === "smug" ? `M${P(hx + 0.05)},${P(hy + 0.135)} q0.05,0.01 0.085,-0.03`
      : ex === "sad" ? `M${P(hx + 0.045)},${P(hy + 0.15)} q0.045,-0.045 0.09,0`
      : ex === "scared" || ex === "worried" ? `M${P(hx + 0.05)},${P(hy + 0.14)} q0.04,-0.03 0.08,0`
      : ex === "determined" ? `M${P(hx + 0.055)},${P(hy + 0.135)} L${P(hx + 0.125)},${P(hy + 0.13)}`
      : `M${P(hx + 0.055)},${P(hy + 0.13)} L${P(hx + 0.125)},${P(hy + 0.128)}`;
    return <path d={d} stroke={INK} strokeWidth={0.016} fill="none" strokeLinecap="round" />;
  };
  return (
    <g transform={`rotate(${P((pose.tilt ?? 0))},${P(hx)},${P(hy + HEAD_R)})`}>
      {!hideHair && <HairBack hx={hx} hy={hy} L={L} t={pose.t ?? 0} />}
      <circle cx={hx - HEAD_R * 0.95} cy={hy + 0.03} r={0.055} fill={L.skin} stroke={INK} strokeWidth={0.02} />
      <circle cx={hx} cy={hy} r={HEAD_R} fill={L.skin} stroke={INK} strokeWidth={0.024} />
      <ellipse cx={hx - 0.06} cy={hy + 0.12} rx={0.12} ry={0.06} fill="rgba(0,0,0,0.07)" />
      {L.stubble && <path d={`M${P(hx - 0.2)},${P(hy + 0.08)} Q${P(hx - 0.1)},${P(hy + 0.27)} ${P(hx + 0.1)},${P(hy + 0.24)} Q${P(hx + 0.22)},${P(hy + 0.18)} ${P(hx + 0.24)},${P(hy + 0.08)} Q${P(hx + 0.1)},${P(hy + 0.17)} ${P(hx - 0.2)},${P(hy + 0.08)} Z`} fill="rgba(40,30,30,0.22)" />}
      {L.blush && <ellipse cx={hx + 0.16} cy={hy + 0.07} rx={0.04} ry={0.022} fill="rgba(230,90,90,0.35)" />}
      {!L.toque && L.hat !== "turban" && L.hat !== "pith" && !hideHair && <HairFront hx={hx} hy={hy} L={L} />}
      {L.sideburns && <path d={`M${P(hx - 0.2)},${P(hy - 0.05)} L${P(hx - 0.2)},${P(hy + 0.1)} L${P(hx - 0.15)},${P(hy + 0.1)} L${P(hx - 0.16)},${P(hy - 0.05)} Z`} fill={L.hair} />}
      {[0.03, 0.15].map((ox, i) => <g key={i}>
        {closed ? <path d={ex === "laugh" ? `M${P(hx + ox - eyeR)},${P(hy - 0.01)} q${P(eyeR)},-0.035 ${P(eyeR * 2)},0` : `M${P(hx + ox - eyeR)},${P(hy - 0.02)} q${P(eyeR)},0.02 ${P(eyeR * 2)},0`} stroke={INK} strokeWidth={0.016} fill="none" strokeLinecap="round" /> : <>
          <ellipse cx={hx + ox} cy={hy - 0.02} rx={eyeR} ry={eyeR * 1.2} fill="#fffaf2" stroke={INK} strokeWidth={0.012} />
          <circle cx={hx + ox + lx} cy={hy - 0.015 + ly} r={pupil} fill={INK} />
          {lid > 0 && (() => {
            const ecx = hx + ox, ecy = hy - 0.02, ry = eyeR * 1.2, yl = ecy - ry + 2 * ry * lid + (ex === "sad" ? 0.004 : 0);
            const dx = eyeR * Math.sqrt(Math.max(0, 1 - ((yl - ecy) / ry) ** 2));
            return <g>
              <path d={`M${P(ecx - dx)},${P(yl)} A${P(eyeR)},${P(ry)} 0 ${yl > ecy ? 1 : 0} 1 ${P(ecx + dx)},${P(yl)} Z`} fill={L.skin} stroke={INK} strokeWidth={0.012} />
              <path d={`M${P(ecx - dx)},${P(yl)} L${P(ecx + dx)},${P(yl)}`} stroke={INK} strokeWidth={0.016} strokeLinecap="round" />
            </g>;
          })()}
        </>}
        <path d={`M${P(hx + ox - 0.045)},${P(hy - 0.085 + browUp + (i === 0 ? -browT : browT) * 0.6)} L${P(hx + ox + 0.045)},${P(hy - 0.085 + browUp + (i === 0 ? browT : -browT) * 0.6)}`} stroke={INK} strokeWidth={0.026 * (L.brow ?? 1)} strokeLinecap="round" />
      </g>)}
      {L.glasses && <g fill="none" stroke={INK} strokeWidth={0.01}>
        <circle cx={hx + 0.03} cy={hy - 0.02} r={0.055} /><circle cx={hx + 0.15} cy={hy - 0.02} r={0.055} />
        <path d={`M${P(hx + 0.085)},${P(hy - 0.025)} L${P(hx + 0.095)},${P(hy - 0.025)} M${P(hx - 0.025)},${P(hy - 0.03)} L${P(hx - 0.2)},${P(hy - 0.04)}`} />
      </g>}
      <path d={`M${P(hx + 0.1)},${P(hy + 0.0)} q0.035,0.05 -0.005,0.06`} stroke={INK} strokeWidth={0.014} fill="none" strokeLinecap="round" />
      {L.beard && <path d={`M${P(hx - 0.215)},${P(hy + 0.07)} Q${P(hx - 0.19)},${P(hy + 0.3)} ${P(hx + 0.05)},${P(hy + 0.315)} Q${P(hx + 0.23)},${P(hy + 0.29)} ${P(hx + 0.248)},${P(hy + 0.06)} Q${P(hx + 0.19)},${P(hy + 0.12)} ${P(hx + 0.13)},${P(hy + 0.1)} Q${P(hx + 0.03)},${P(hy + 0.14)} ${P(hx - 0.07)},${P(hy + 0.09)} Q${P(hx - 0.15)},${P(hy + 0.06)} ${P(hx - 0.215)},${P(hy + 0.07)} Z`} fill={L.beard} stroke={INK} strokeWidth={0.016} strokeLinejoin="round" />}
      {L.mustache && <path d={`M${P(hx + 0.0)},${P(hy + 0.09)} q0.045,-0.05 0.09,-0.012 q0.045,-0.04 0.09,0.012 q-0.045,0.035 -0.09,0.0 q-0.045,0.035 -0.09,0 Z`} fill={L.hair} stroke={INK} strokeWidth={0.012} />}
      {L.lips && !pose.mouth && talk <= 0.15 && ex !== "laugh" && ex !== "surprised" && ex !== "angry" && ex !== "pain" && <ellipse cx={hx + 0.09} cy={hy + 0.13} rx={0.034} ry={0.014} fill={L.lips} />}
      {mouthD()}
      {L.toque && <g>
        <path d={`M${P(hx - 0.255)},${P(hy - 0.06)} Q${P(hx - 0.27)},${P(hy - 0.36)} ${P(hx - 0.02)},${P(hy - 0.38)} Q${P(hx + 0.25)},${P(hy - 0.37)} ${P(hx + 0.255)},${P(hy - 0.08)} Z`} fill={L.toque} stroke={INK} strokeWidth={0.022} strokeLinejoin="round" />
        {[-0.14, -0.05, 0.04, 0.13].map((ox, i) => <path key={i} d={`M${P(hx + ox)},${P(hy - 0.15)} Q${P(hx + ox * 1.1)},${P(hy - 0.28)} ${P(hx + ox * 0.6)},${P(hy - 0.35)}`} stroke={L.toqueDark} strokeWidth={0.012} fill="none" strokeLinecap="round" />)}
        <path d={`M${P(hx - 0.27)},${P(hy - 0.02)} Q${P(hx)},${P(hy - 0.08)} ${P(hx + 0.27)},${P(hy - 0.04)} L${P(hx + 0.265)},${P(hy - 0.14)} Q${P(hx)},${P(hy - 0.18)} ${P(hx - 0.265)},${P(hy - 0.12)} Z`} fill={L.toqueDark} stroke={INK} strokeWidth={0.02} strokeLinejoin="round" />
      </g>}
      {L.hat && L.hat !== "none" && !L.toque && <HatShape hx={hx} hy={hy} L={L} />}
    </g>
  );
};

/** arm from the shoulder: upper angle th (deg from down, + forward), elbow bend e (deg, forward only) */
const armPts = (sx: number, sy: number, th: number, e: number) => {
  const a1 = rad(th), ex = sx + Math.sin(a1) * UPPER, ey = sy + Math.cos(a1) * UPPER;
  const a2 = rad(th + Math.max(0, e)), wx = ex + Math.sin(a2) * FORE, wy = ey + Math.cos(a2) * FORE;
  return { s: [sx, sy] as V, e: [ex, ey] as V, w: [wx, wy] as V, dir: th + Math.max(0, e) };
};

const Arm: React.FC<{ a: ReturnType<typeof armPts>; L: ToonLook; far?: boolean; hand?: "open" | "fist" | "point"; bw?: number }> = ({ a, L, far, hand = "open", bw = 1 }) => {
  const sleeve = far ? L.topDark : L.top;
  const d = rad(a.dir), ux = Math.sin(d), uy = Math.cos(d), nx = uy, ny = -ux; // along the forearm, and toward the thumb
  const hx = a.w[0] + ux * 0.05, hy = a.w[1] + uy * 0.05, deg = (Math.atan2(uy, ux) * 180) / Math.PI;
  const cuff: V = [a.w[0] - ux * 0.012, a.w[1] - uy * 0.012];
  const handD = hand === "fist" ? [`M-0.032,-0.036 Q0.045,-0.046 0.05,0.0 Q0.045,0.044 -0.032,0.038 Q-0.05,0.0 -0.032,-0.036 Z`]
    : hand === "point" ? [`M-0.03,-0.036 Q0.035,-0.044 0.04,0.0 Q0.035,0.042 -0.03,0.038 Q-0.05,0.0 -0.03,-0.036 Z`, `M0.01,-0.03 L0.12,-0.028 Q0.135,-0.016 0.12,-0.006 L0.02,-0.004 Z`,
      `M-0.025,-0.025 Q0.0,-0.07 0.03,-0.058 Q0.045,-0.04 0.018,-0.022 Z`]
    : [`M-0.03,-0.038 Q0.05,-0.05 0.058,0.0 Q0.05,0.048 -0.03,0.04 Q-0.05,0.0 -0.03,-0.038 Z`, `M-0.025,-0.025 Q0.0,-0.075 0.035,-0.062 Q0.05,-0.045 0.02,-0.022 Z`];
  const sleeveD = tube(a.s, a.e, cuff, 0.05 * bw, 0.036 * Math.sqrt(bw), 0.08);
  return (
    <g>
      {/* hand under the sleeve end: a mitten with a thumb */}
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(${P(deg)})`}>
        <Two fill={L.skin} ow={0.022} d={handD} />
      </g>
      <Two fill={sleeve} d={sleeveD} />
      {L.check && <path d={sleeveD} fill="url(#lg-check)" opacity={far ? 0.5 : 0.85} />}
      {L.pattern === "stripes" && <path d={sleeveD} fill="url(#lg-stripes)" opacity={far ? 0.5 : 0.8} />}
      {/* cuff */}
      <path d={`M${P(cuff[0] + nx * 0.036)},${P(cuff[1] + ny * 0.036)} L${P(cuff[0] - nx * 0.036)},${P(cuff[1] - ny * 0.036)}`} stroke={far ? INK : L.topDark} strokeWidth={0.014} strokeLinecap="round" />
    </g>
  );
};

const Leg: React.FC<{ hip: V; f: ReturnType<typeof footPose>; L: ToonLook; far?: boolean; bw?: number }> = ({ hip, f, L, far, bw = 1 }) => {
  const k = ik(hip[0], hip[1], f.ax, f.ay, THIGH, SHIN, 1);
  const col = far ? (L.legsDark ?? L.topDark) : L.legs;
  const shoe = L.shoes === "shoes" ? SHOE : L.shoes === "bare" || L.shoes === "sandals" ? BAREFOOT : BOOT;
  const fill = L.shoes === "bare" || L.shoes === "sandals" ? (far ? L.skin : L.skin) : far ? "#2e1e14" : L.boots;
  return (
    <g>
      <g transform={`translate(${P(f.ax)},${P(f.ay)}) rotate(${P(f.deg)})`}>
        <Two fill={fill} ow={0.022} d={shoe} />
        {L.shoes === "sandals" && <path d="M-0.05,0.065 L0.15,0.065 M0.02,0.0 L0.06,0.06" stroke={L.boots} strokeWidth={0.016} />}
        {L.shoes !== "bare" && L.shoes !== "sandals" && <path d="M-0.055,0.06 L0.16,0.06" stroke="rgba(0,0,0,0.35)" strokeWidth={0.014} />}
        {far && (L.shoes === "bare" || L.shoes === "sandals") && <path d={BAREFOOT} fill="rgba(0,0,0,0.25)" />}
      </g>
      <Two fill={col} d={tube(hip, [k.jx, k.jy], [k.tx, k.ty - 0.015], 0.058 * bw, 0.042 * Math.sqrt(bw), 0.05)} />
    </g>
  );
};

// ---------------------------------------------------------------- props held in one hand
const PropShape: React.FC<{ prop: Prop; x: number; y: number; dir: number; lit: number; t: number }> = ({ prop, x, y, dir, lit, t }) => {
  const g = (children: React.ReactNode, rot = dir) => <g transform={`translate(${P(x)},${P(y)}) rotate(${P(rot)})`}>{children}</g>;
  const flame = (cx: number, cy: number, s: number) => lit > 0.01 && <g opacity={lit}>
    <path d={`M${P(cx)},${P(cy)} Q${P(cx - 0.05 * s)},${P(cy - 0.06 * s)} ${P(cx + 0.01 * Math.sin(t * 9) * s)},${P(cy - (0.16 + 0.02 * Math.sin(t * 13)) * s)} Q${P(cx + 0.05 * s)},${P(cy - 0.06 * s)} ${P(cx)},${P(cy)} Z`} fill="#ffb040" />
    <path d={`M${P(cx)},${P(cy)} Q${P(cx - 0.022 * s)},${P(cy - 0.04 * s)} ${P(cx)},${P(cy - 0.09 * s)} Q${P(cx + 0.022 * s)},${P(cy - 0.04 * s)} ${P(cx)},${P(cy)} Z`} fill="#fff3c0" />
  </g>;
  switch (prop) {
    case "torch": return <g>{g(<><rect x={-0.02} y={-0.32} width={0.04} height={0.5} fill="#6a4426" stroke={INK} strokeWidth={0.012} /><rect x={-0.035} y={-0.36} width={0.07} height={0.07} fill="#3a2a1c" stroke={INK} strokeWidth={0.012} /></>, 0)}{flame(x, y - 0.36, 1.6)}</g>;
    case "candle": return <g>{g(<><rect x={-0.02} y={-0.12} width={0.04} height={0.12} fill="#efe6cf" stroke={INK} strokeWidth={0.01} /><ellipse cx={0} cy={0.0} rx={0.06} ry={0.015} fill="#8a7a5a" stroke={INK} strokeWidth={0.01} /></>, 0)}{flame(x, y - 0.12, 0.7)}</g>;
    case "sword": return g(<><path d="M0.04,-0.012 L0.78,-0.008 L0.83,0 L0.78,0.008 L0.04,0.012 Z" fill="#cfd4da" stroke={INK} strokeWidth={0.012} /><rect x={-0.01} y={-0.06} width={0.03} height={0.12} fill="#8a6a2a" stroke={INK} strokeWidth={0.01} /><rect x={-0.1} y={-0.015} width={0.1} height={0.03} fill="#3a2418" stroke={INK} strokeWidth={0.01} /></>, dir - 90);
    case "cane": return g(<path d="M0,-0.05 L0,0.62 M0,-0.05 Q0,-0.12 0.07,-0.1" stroke="#4a2c18" strokeWidth={0.03} fill="none" strokeLinecap="round" />, 0);
    case "paper": return g(<><path d="M-0.02,-0.16 L0.16,-0.18 L0.18,0.06 L0.0,0.08 Z" fill="#efe6cf" stroke={INK} strokeWidth={0.012} />{[0, 1, 2, 3].map((i) => <path key={i} d={`M0.02,${-0.12 + i * 0.045} L0.14,${-0.13 + i * 0.045}`} stroke="rgba(0,0,0,0.35)" strokeWidth={0.008} />)}</>, 0);
    case "book": return g(<><rect x={-0.02} y={-0.14} width={0.18} height={0.22} rx={0.01} fill="#6a2222" stroke={INK} strokeWidth={0.012} /><path d="M0.0,-0.12 L0.0,0.06" stroke="#d8c8a0" strokeWidth={0.012} /></>, 0);
    case "cup": return g(<><path d="M-0.04,-0.1 L0.06,-0.1 L0.05,0.02 L-0.03,0.02 Z" fill="#c8c0b0" stroke={INK} strokeWidth={0.012} /><path d="M0.06,-0.08 Q0.1,-0.06 0.055,-0.02" stroke={INK} strokeWidth={0.012} fill="none" /></>, 0);
    case "axe": return g(<><rect x={0.02} y={-0.016} width={0.7} height={0.032} fill="#8a5a30" stroke={INK} strokeWidth={0.012} /><path d="M0.6,-0.02 L0.74,-0.12 L0.78,0.06 L0.62,0.03 Z" fill="#9aa0a6" stroke={INK} strokeWidth={0.012} /></>, dir - 90);
    case "shovel": return g(<><rect x={0.02} y={-0.015} width={0.8} height={0.03} fill="#8a5a30" stroke={INK} strokeWidth={0.012} /><path d="M0.8,-0.07 L0.98,-0.06 Q1.02,0 0.98,0.06 L0.8,0.07 Z" fill="#7a7e84" stroke={INK} strokeWidth={0.012} /></>, dir - 90);
    case "bag": return g(<><path d="M-0.1,0.02 Q-0.13,0.3 0.0,0.32 Q0.14,0.3 0.1,0.02 Q0,0.06 -0.1,0.02 Z" fill="#8a6a40" stroke={INK} strokeWidth={0.014} /><path d="M-0.04,0.03 L0.0,-0.03 L0.04,0.03" stroke={INK} strokeWidth={0.012} fill="none" /></>, 0);
    case "flag": return g(<><rect x={-0.015} y={-0.9} width={0.03} height={1.05} fill="#6a4426" stroke={INK} strokeWidth={0.01} /><path d={`M0.015,-0.88 Q0.2,${P(-0.92 + 0.03 * Math.sin(t * 4))} 0.42,-0.86 L0.42,-0.58 Q0.2,${P(-0.62 + 0.03 * Math.sin(t * 4 + 1))} 0.015,-0.6 Z`} fill="#b02a2a" stroke={INK} strokeWidth={0.012} /></>, 0);
    case "pistol": return g(<><rect x={0.0} y={-0.025} width={0.2} height={0.04} fill="#3a3436" stroke={INK} strokeWidth={0.01} /><path d="M0.0,-0.02 L-0.04,0.09 L0.02,0.09 L0.05,0.0 Z" fill="#6a4426" stroke={INK} strokeWidth={0.01} /></>, dir);
    default: return null;
  }
};

export const Logger: React.FC<{ x: number; y: number; ppm: number; look: ToonLook; pose: ToonPose; flip?: boolean; shade?: number }> =
  ({ x, y, ppm, look: L, pose, flip = false, shade = 1 }) => {
    const B = L.body ?? {}, bw = B.build ?? 1, bh = B.height ?? 1, hs = B.head ?? 1;
    const w = clamp01(pose.walk ?? 0), dist = pose.dist ?? 0, t = pose.t ?? 0, run = clamp01(pose.run ?? 0) * w;
    const crouch = clamp01(pose.crouch ?? 0), sit = clamp01(pose.sit ?? 0), fall = clamp01(pose.fall ?? 0);
    const near0 = footAt(dist, 0, w, 0.07, run), far0 = footAt(dist, 0.5, w, -0.06, run);
    // sitting: the feet come forward under the knees
    const near = sit > 0 ? { ...near0, rel: mix(near0.rel, 0.34, sit) } : near0;
    const far = sit > 0 ? { ...far0, rel: mix(far0.rel, 0.3, sit) } : far0;
    // hips: lower while walking, rise over each planted foot (twice per cycle), idle breathing and a slow weight shift
    const C = strideFor(run), cyc = dist / C, mid = Math.cos(4 * Math.PI * (cyc - 0.5 * mix(STANCE, RUN_STANCE, run) * 0.5));
    const sway = (1 - w) * 0.012 * Math.sin(t * 0.7);
    const seat = pose.seat ?? 0.45;
    let hipY = -(HIP - 0.055 * w + 0.016 * w * mid) + (1 - w) * 0.004 * Math.sin(t * 1.7);
    hipY += run * (0.05 - 0.035 * mid) + crouch * 0.2;
    if (sit > 0) hipY = mix(hipY, -seat, sit);
    const hipX = sway - sit * 0.05;
    const lean = 5 * w + (1 - w) * 0.6 * Math.sin(t * 0.7) + run * 9 + crouch * 16 + (pose.lean ?? 0) - sit * 4;
    const breath = (1 - w) * Math.sin(t * 1.7);
    // torso turn: the near shoulder comes forward with the near arm
    const armPh = Math.cos(2 * Math.PI * near.loc);
    const turn = 0.018 * w * -armPh;
    // arms: opposite the legs while walking, hanging and still (only breathing) when standing; running: bent, pumping
    const swing = 22 * w + 16 * run;
    const lantern = pose.hold === "lantern";
    const elbowRun = 70 * run;
    const nearA: [number, number] = pose.armNear ?? (lantern ? [mix(5, 7, w) - 0.45 * swing * armPh + breath * 0.4, mix(14, 18, w) + 6 * w * Math.max(0, -armPh)] : [mix(2, 4, w) - swing * armPh + breath * 0.6, mix(8, 12, w) + 16 * w * Math.max(0, -armPh) + elbowRun]);
    const farA: [number, number] = pose.armFar ?? [mix(1, 4, w) + swing * armPh + breath * 0.6, mix(8, 12, w) + 16 * w * Math.max(0, armPh) + elbowRun];
    // body frame: rotate by the lean about the hip
    const lr = rad(lean), cl = Math.cos(lr), sl = Math.sin(lr);
    const up = (h: number, dx = 0): V => [hipX + dx * cl + Math.sin(lr) * h, hipY - Math.cos(lr) * h + dx * sl];
    const sh = up(SHOULDER - HIP + 0.004 * breath);
    const shN: V = [sh[0] + 0.015 * bw + turn, sh[1] + 0.025], shF: V = [sh[0] - 0.035 * bw - turn, sh[1] + 0.03];
    const nk = up(NECK - HIP + 0.004 * breath);
    const hx = nk[0] + 0.02 + 0.01 * w, hy = nk[1] - HEAD_R + 0.05;
    const holdPlank = pose.hold === "plank";
    const nA = armPts(shN[0], shN[1], holdPlank ? 42 : nearA[0], holdPlank ? 58 : nearA[1]);
    const fA = armPts(shF[0], shF[1], holdPlank ? 48 : farA[0], holdPlank ? 52 : farA[1]);
    const d0 = rad(nA.dir), lpx = nA.w[0] + Math.sin(d0) * 0.06, lpy = nA.w[1] + Math.cos(d0) * 0.06;
    const pend = lantern ? -0.55 * swing * Math.sin(2 * Math.PI * near.loc) + (1 - w) * 2.5 * Math.sin(t * 1.3) : 0;
    const lit = clamp01(pose.lit ?? 1), flick = lit * (0.86 + 0.09 * Math.sin(t * 13.1) + 0.05 * Math.sin(t * 31.3 + 1));
    const hipN: V = [hipX + 0.025 * bw, hipY], hipF: V = [hipX - 0.03 * bw, hipY - 0.01];
    // jacket / shirt in body space (drawn rotated by the lean about the hip)
    const outfit = L.outfit ?? "jacket";
    const top = SHOULDER - HIP, hem = L.long ? -0.2 : outfit === "coat" ? -0.36 : outfit === "uniform" ? -0.16 : -0.1;
    const belly = (B.belly ?? 0) * 0.07;
    const jacket = `M-0.12,${P(-top + 0.05)} Q-0.13,${P(-top - 0.02)} -0.02,${P(-top - 0.035)} L0.05,${P(-top - 0.035)} Q0.15,${P(-top - 0.02)} 0.14,${P(-top + 0.06)}
      Q${P(0.16 + belly * 2)},${P(-0.1)} ${P(L.long || outfit === "coat" ? 0.17 : 0.15)},${P(-hem)} Q0.02,${P(-hem + 0.035)} ${P(L.long || outfit === "coat" ? -0.16 : -0.14)},${P(-hem)} Q-0.15,${P(-0.12)} -0.12,${P(-top + 0.05)} Z`;
    // skirt (dress / robe): from the waist to just above the ground, swaying with the stride
    const skirtSw = (0.05 * Math.sin(2 * Math.PI * near.loc) * w) + 0.01 * Math.sin(t * 1.1);
    const long = outfit === "dress" || outfit === "robe";
    const skirt = long ? `M${P(hipX - 0.13 * bw)},${P(hipY - 0.06)} L${P(hipX + 0.13 * bw)},${P(hipY - 0.06)} Q${P(hipX + 0.2 * bw + skirtSw)},${P(hipY * 0.5)} ${P(hipX + 0.26 * bw + skirtSw * 1.6)},${P(-0.1)}
      Q${P(hipX + skirtSw)},${P(-0.07)} ${P(hipX - 0.25 * bw + skirtSw * 1.3)},${P(-0.1)} Q${P(hipX - 0.2 * bw + skirtSw)},${P(hipY * 0.5)} ${P(hipX - 0.13 * bw)},${P(hipY - 0.06)} Z` : "";
    const heldFar = !!pose.holdFar;
    const propHand = heldFar ? fA : nA, pd = rad(propHand.dir);
    const genericProp = pose.hold && !["lantern", "plank", "rifle"].includes(pose.hold);
    const propEl = genericProp ? <PropShape prop={pose.hold!} x={propHand.w[0] + Math.sin(pd) * 0.05} y={propHand.w[1] + Math.cos(pd) * 0.05} dir={-propHand.dir + 90} lit={lit} t={t} /> : null;
    // fall: topple about the feet (forward or back), settling onto the ground
    const fd = pose.fallDir ?? 1, fk = smooth(fall), fallRot = fd * 88 * fk;
    const rootT = `translate(${P(x)},${P(y)}) scale(${P((flip ? -1 : 1) * ppm * bh)},${P(ppm * bh)})`;
    const fallT = fall > 0 ? `translate(${P(fd * 0.12 * fk)},${P(-0.14 * fk)}) rotate(${P(fallRot)})` : undefined;
    const headT = hs !== 1 ? `translate(${P(nk[0])},${P(nk[1])}) scale(${P(hs)}) translate(${P(-nk[0])},${P(-nk[1])})` : undefined;
    return (
      <g transform={rootT} style={shade !== 1 ? { filter: `brightness(${shade})` } : undefined}>
        <defs>
          <pattern id="lg-check" patternUnits="userSpaceOnUse" width={0.09} height={0.09} patternTransform="rotate(3)">
            <rect x={0} y={0} width={0.045} height={0.09} fill="rgba(12,8,10,0.55)" />
            <rect x={0} y={0} width={0.09} height={0.045} fill="rgba(12,8,10,0.55)" />
            <path d="M0,0.0675 L0.09,0.0675 M0.0675,0 L0.0675,0.09" stroke="rgba(255,255,255,0.06)" strokeWidth={0.004} />
          </pattern>
          {L.pattern === "stripes" && <pattern id="lg-stripes" patternUnits="userSpaceOnUse" width={0.05} height={0.05}>
            <rect x={0} y={0} width={0.018} height={0.05} fill="rgba(12,8,10,0.4)" />
          </pattern>}
          <radialGradient id="lg-glow" r={0.5}>
            <stop offset="0" stopColor="#ffc070" stopOpacity={0.55} /><stop offset="0.35" stopColor="#ff9a40" stopOpacity={0.2} /><stop offset="1" stopColor="#ff7a20" stopOpacity={0} />
          </radialGradient>
        </defs>
        {(lantern || pose.hold === "torch" || pose.hold === "candle") && flick > 0.01 && <circle cx={lantern ? lpx : propHand.w[0]} cy={lantern ? lpy + 0.17 : propHand.w[1] - 0.3} r={pose.hold === "candle" ? 0.9 : 1.7} fill="url(#lg-glow)" opacity={flick} style={{ mixBlendMode: "screen" }} />}
        <ellipse cx={hipX} cy={0} rx={0.34 * mix(1, 1.4, fall)} ry={0.05} fill="rgba(10,5,10,0.33)" />
        <g transform={fallT}>
        <Arm a={fA} L={L} far hand={pose.handFar} bw={bw} />
        {heldFar && propEl}
        <Leg hip={hipF} f={footPose(far.rel, far.lift, far.pitch)} L={L} far bw={bw} />
        <Leg hip={hipN} f={footPose(near.rel, near.lift, near.pitch)} L={L} bw={bw} />
        {long && <><Two fill={outfit === "robe" ? L.top : (L.accent ?? L.top)} d={skirt} />
          {L.pattern === "check" || L.check ? <path d={skirt} fill="url(#lg-check)" opacity={0.7} /> : null}
          <path d={`M${P(hipX - 0.08)},${P(hipY)} Q${P(hipX - 0.1 + skirtSw)},${P(hipY * 0.45)} ${P(hipX - 0.14 + skirtSw)},${P(-0.12)}`} stroke={L.topDark} strokeWidth={0.02} fill="none" opacity={0.6} /></>}
        <g transform={`translate(${P(hipX)},${P(hipY)}) rotate(${P(lean)}) scale(${P(bw)},${P(1 + 0.008 * breath)})`}>
          <Two fill={L.top} d={jacket} />
          {L.check && <path d={jacket} fill="url(#lg-check)" opacity={0.85} />}
          {L.pattern === "stripes" && <path d={jacket} fill="url(#lg-stripes)" opacity={0.8} />}
          {outfit === "vest" && <path d={`M0.0,${P(-top - 0.02)} Q0.13,${P(-top)} 0.14,${P(-top + 0.08)} Q0.15,-0.1 0.14,${P(-hem - 0.01)} L-0.13,${P(-hem - 0.01)} Q-0.14,-0.15 -0.11,${P(-top + 0.06)} Z`} fill={L.accent ?? "#3a3036"} stroke={INK} strokeWidth={0.014} />}
          {L.apron && <path d={`M0.0,${P(-top + 0.1)} L0.15,${P(-top + 0.1)} L0.17,${P(-hem + 0.25)} L0.0,${P(-hem + 0.25)} Z`} fill={L.apron} stroke={INK} strokeWidth={0.014} />}
          {L.braces && <>
            <path d={`M0.075,${P(-top - 0.03)} Q0.1,${P(-0.2)} 0.1,${P(-hem - 0.005)}`} stroke={L.braces} strokeWidth={0.026} fill="none" />
            <path d={`M-0.03,${P(-top - 0.03)} Q-0.02,${P(-0.2)} -0.03,${P(-hem - 0.005)}`} stroke={L.braces} strokeWidth={0.022} fill="none" opacity={0.85} />
          </>}
          {/* back shade, front opening, collar */}
          <path d={`M-0.11,${P(-top + 0.08)} Q-0.135,${P(-0.12)} ${P(L.long || outfit === "coat" ? -0.14 : -0.125)},${P(-hem - 0.02)}`} stroke={L.topDark} strokeWidth={0.035} fill="none" strokeLinecap="round" />
          <path d={`M0.085,${P(-top - 0.02)} Q0.1,${P(-0.15)} 0.09,${P(-hem + 0.01)}`} stroke={L.topDark} strokeWidth={0.012} fill="none" strokeLinecap="round" />
          <path d={`M-0.01,${P(-top - 0.035)} L0.06,${P(-top + 0.04)} L0.1,${P(-top - 0.03)}`} stroke={INK} strokeWidth={0.014} fill={L.topDark} strokeLinejoin="round" />
          {L.tie && <path d={`M0.05,${P(-top + 0.03)} L0.075,${P(-top + 0.03)} L0.085,${P(-top + 0.2)} L0.062,${P(-top + 0.23)} L0.045,${P(-top + 0.2)} Z`} fill={L.tie} stroke={INK} strokeWidth={0.01} />}
          {!L.sash && !L.long && outfit !== "dress" && outfit !== "robe" && [0, 1, 2].map((i) => <circle key={i} cx={0.105} cy={-top + 0.09 + i * 0.075} r={0.011} fill={L.topDark} stroke={INK} strokeWidth={0.006} />)}
          {outfit === "uniform" && <>
            {[0, 1, 2, 3].map((i) => <circle key={"u" + i} cx={0.06} cy={-top + 0.09 + i * 0.075} r={0.012} fill={L.accent ?? "#d8b040"} stroke={INK} strokeWidth={0.006} />)}
            <path d={`M-0.08,${P(-top - 0.03)} L0.06,${P(-top - 0.035)}`} stroke={L.accent ?? "#d8b040"} strokeWidth={0.03} strokeLinecap="round" />
          </>}
          {L.medals && [0, 1].map((i) => <g key={"m" + i}><path d={`M${P(0.0 + i * 0.045)},${P(-top + 0.12)} l0.012,0.04`} stroke="#8a2222" strokeWidth={0.018} /><circle cx={0.008 + i * 0.045} cy={-top + 0.17} r={0.016} fill="#d8b040" stroke={INK} strokeWidth={0.006} /></g>)}
          {!L.long && outfit === "jacket" && <path d="M0.09,-0.2 L0.13,-0.2" stroke={L.topDark} strokeWidth={0.01} />}
          {L.belt && <path d={`M-0.14,-0.04 Q0.0,-0.025 0.15,-0.04`} stroke={L.belt} strokeWidth={0.035} fill="none" />}
          {L.sash && <path d={`M-0.12,-0.03 Q0.0,-0.01 0.15,-0.035`} stroke={L.sash} strokeWidth={0.04} fill="none" />}
          {L.scarf && <path d={`M-0.08,${P(-top - 0.04)} Q0.03,${P(-top + 0.02)} 0.12,${P(-top - 0.04)} L0.1,${P(-top + 0.04)} Q0.02,${P(-top + 0.08)} -0.08,${P(-top + 0.03)} Z M-0.07,${P(-top + 0.02)} L-0.13,${P(-top + 0.2 + 0.02 * Math.sin(t * 2))} L-0.08,${P(-top + 0.21)} Z`} fill={L.scarf} stroke={INK} strokeWidth={0.012} strokeLinejoin="round" />}
        </g>
        <g transform={headT}>
          <Head hx={hx} hy={hy} L={L} pose={{ ...pose, tilt: (pose.tilt ?? 0) + lean * 0.4 }} />
        </g>
        {holdPlank && <g transform={`translate(${P((nA.w[0] + fA.w[0]) / 2 + 0.04)},${P((nA.w[1] + fA.w[1]) / 2 + 0.03)}) rotate(-4)`}>
          <rect x={-0.8} y={-0.035} width={1.6} height={0.07} fill="#6a4a2a" stroke={INK} strokeWidth={0.014} />
          <path d="M-0.78,0.0 L0.78,0.0" stroke="rgba(0,0,0,0.18)" strokeWidth={0.01} />
        </g>}
        {pose.hold === "rifle" && <g transform={`translate(${P(nA.w[0])},${P(nA.w[1])}) rotate(${pose.aiming ? P(90 - nA.dir) + ") scale(-1,1" : "-35"})`}>
          <rect x={-0.55} y={-0.025} width={0.75} height={0.035} fill="#3a3436" stroke={INK} strokeWidth={0.012} />
          <path d="M0.2,-0.03 L0.5,-0.04 L0.52,0.05 L0.2,0.03 Z" fill="#7a4a26" stroke={INK} strokeWidth={0.014} />
        </g>}
        {lantern && <g transform={`translate(${P(lpx)},${P(lpy)}) rotate(${P(pend)})`}>
          {/* wire bail, tin cap, glass globe in a wire guard, fuel fount */}
          <path d="M-0.045,0.075 Q-0.05,-0.005 0,-0.01 Q0.05,-0.005 0.045,0.075" stroke={INK} strokeWidth={0.008} fill="none" />
          <path d="M-0.03,0.07 L0.03,0.07 L0.04,0.095 L-0.04,0.095 Z" fill="#4a4a46" stroke={INK} strokeWidth={0.01} strokeLinejoin="round" />
          <ellipse cx={0} cy={0.15} rx={0.045} ry={0.06} fill={`rgba(255,${P(170 + 60 * flick)},${P(90 + 40 * flick)},${P(0.25 + 0.7 * flick)})`} stroke={INK} strokeWidth={0.01} />
          {flick > 0.01 && <path d={`M0,${P(0.175)} Q-0.016,0.15 0,${P(0.12 - 0.012 * flick)} Q0.016,0.15 0,0.175 Z`} fill="#fff3c0" opacity={flick} />}
          <path d="M-0.045,0.13 L0.045,0.13 M-0.045,0.17 L0.045,0.17 M0,0.09 L0,0.21" stroke={INK} strokeWidth={0.006} opacity={0.8} />
          <path d="M-0.05,0.205 L0.05,0.205 L0.055,0.25 Q0,0.262 -0.055,0.25 Z" fill="#5a5850" stroke={INK} strokeWidth={0.012} strokeLinejoin="round" />
        </g>}
        {!heldFar && propEl}
        <Arm a={nA} L={L} hand={pose.handNear} bw={bw} />
        {/* soft shoulder: hides where the sleeve starts, so the arm grows out of the jacket */}
        <circle cx={nA.s[0]} cy={nA.s[1] + 0.012} r={0.044 * bw} fill={L.top} />
        </g>
      </g>
    );
  };

/** the same figure under a clearer name for new Shorts */
export const Figure = Logger;
export type Look = ToonLook;
export type Pose = ToonPose;
