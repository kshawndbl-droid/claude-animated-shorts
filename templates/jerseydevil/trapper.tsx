// Trapper cast for "The Jersey Devil" (Pine Barrens, c. 1935): a copy of the approved Hidebehind logger rig
// (templates/hidebehind/logger.tsx, itself the approved Toon rig) with a new costume option: a battered felt slouch hat
// (look.hat = "slouch": pinched crown, sweat-stained band, wide drooping brim). Everything else is unchanged.
// Original header of the logger rig follows.
// Logger cast for "The Hidebehind" (American lumberjack legend), built on the approved Toon rig
// (templates/tsavo3d/toon.tsx): the same distance-driven planted-foot walk (no sliding, feet never cross), soft volume
// arms that bend smoothly (no hinges, no joint circles, no V bends), a leaning/bobbing torso whose shoulders turn with
// the arm swing, and arms that hang and only breathe when standing. New for this story:
//  - a 1900s north-woods logger: knit wool toque with a folded brim, a short beard, a buffalo-check wool shirt,
//    suspenders, heavy wool trousers and lace-up boots;
//  - a kerosene lantern held in the near hand: the arm carries its weight (smaller swing), the lantern hangs from its
//    bail and swings like a pendulum behind the hand's motion, with a flickering flame and a warm glow (lit: 0..1, so it
//    can go out).
// Units are metres, feet on y = 0, the figure faces +x (flip mirrors it).
import React from "react";

export const INK = "#1d1820";
const rad = (d: number) => (d * Math.PI) / 180;
const P = (n: number) => n.toFixed(4);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export type ToonLook = {
  toque?: string; toqueDark?: string; beard?: string; check?: string; braces?: string;
  skin: string; top: string; topDark: string; legs: string; legsDark?: string; boots: string; hair: string;
  hat?: "pith" | "turban" | "none" | "slouch"; hatCol?: string; band?: string; mustache?: boolean; belt?: string; sash?: string;
  /** long shirt (kurta) over the trousers instead of a short jacket */
  long?: boolean;
};
export type ToonPose = {
  /** metres walked so far along the facing direction (drives the feet) */
  dist?: number;
  /** 0 standing .. 1 walking */
  walk?: number;
  /** seconds, for breathing and the idle sway */
  t?: number;
  /** arm overrides: [upper arm angle from straight down (+ = forward), elbow bend (>= 0, always bends forward)] */
  armNear?: [number, number]; armFar?: [number, number];
  expr?: "neutral" | "stern" | "worried" | "scared" | "smile";
  lookX?: number; blink?: boolean; talk?: number; tilt?: number;
  hold?: "plank" | "rifle" | "lantern" | null;
  /** lantern flame 0 (out) .. 1 (lit) */
  lit?: number;
};

// proportions (metres, y up is negative)
const HIP = 0.625, THIGH = 0.29, SHIN = 0.28, ANKLE = 0.07;
const SHOULDER = 0.94, NECK = 0.99, HEAD_R = 0.25;
const UPPER = 0.2, FORE = 0.18;
/** stride (same foot to same foot) and the share of the cycle a foot is on the ground */
export const TOON_STRIDE = 0.9;
const STANCE = 0.6;

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

/** one foot's place relative to the hips for a figure that has walked `dist` metres; o = 0 near foot, 0.5 far foot */
const footAt = (dist: number, o: number, w: number, idleRel: number) => {
  const C = TOON_STRIDE, cyc = dist / C + o, loc = cyc - Math.floor(cyc);
  let rel: number, lift = 0, pitch = 0;
  if (loc < STANCE) {
    rel = 0.5 * STANCE * C - loc * C;                   // planted: moves back exactly as fast as the body moves on
    pitch = loc < 0.1 ? mix(-14, 0, smooth(loc / 0.1)) : loc > 0.4 ? mix(0, 30, smooth((loc - 0.4) / (STANCE - 0.4))) : 0;
  } else {
    const k = (loc - STANCE) / (1 - STANCE), e = smooth(k);
    rel = -0.5 * STANCE * C + STANCE * C * e;
    lift = 0.09 * Math.sin(Math.PI * Math.min(1, k * 1.15));
    pitch = mix(30, -14, smooth(k * 1.1));
  }
  return { rel: mix(idleRel, rel, w), lift: lift * w, pitch: pitch * w, loc };
};

/** boot in ankle space (ankle at 0,0, sole at y = ANKLE): heel at -0.055, toe at +0.16 */
const BOOT = `M-0.05,-0.045 L0.035,-0.045 L0.05,0.005 Q0.16,0.0 0.168,0.05 L0.165,0.07 L-0.06,0.07 Q-0.07,0.02 -0.05,-0.045 Z`;
const HEEL: V = [-0.055, ANKLE], BALL: V = [0.1, ANKLE];
/** the ankle point and boot angle for a foot planted at rel, rolled by pitch (+ heel up about the ball, - toe up about the heel) */
const footPose = (rel: number, lift: number, pitch: number) => {
  const piv = pitch >= 0 ? BALL : HEEL, a = rad(pitch), c = Math.cos(a), s = Math.sin(a);
  const pw: V = [rel + piv[0], -lift];                 // pivot in body space (ground y = 0)
  const vx = -piv[0], vy = -piv[1];                    // ankle relative to pivot, rotated
  return { ax: pw[0] + vx * c - vy * s, ay: pw[1] + vx * s + vy * c, deg: pitch };
};

const Head: React.FC<{ hx: number; hy: number; L: ToonLook; pose: ToonPose }> = ({ hx, hy, L, pose }) => {
  const lx = (pose.lookX ?? 0.4) * 0.03;
  const ex = pose.expr ?? "neutral";
  const talk = pose.talk !== undefined ? Math.max(0, Math.sin(pose.talk * 14)) * Math.max(0, Math.sin(pose.talk * 3.1 + 1)) : 0;
  const browT = ex === "stern" ? 0.035 : ex === "worried" || ex === "scared" ? -0.03 : 0;
  const eyeR = ex === "scared" ? 0.045 : 0.036;
  return (
    <g transform={`rotate(${P((pose.tilt ?? 0))},${P(hx)},${P(hy + HEAD_R)})`}>
      <circle cx={hx - HEAD_R * 0.95} cy={hy + 0.03} r={0.055} fill={L.skin} stroke={INK} strokeWidth={0.02} />
      <circle cx={hx} cy={hy} r={HEAD_R} fill={L.skin} stroke={INK} strokeWidth={0.024} />
      <ellipse cx={hx - 0.06} cy={hy + 0.12} rx={0.12} ry={0.06} fill="rgba(0,0,0,0.07)" />
      {!L.toque && L.hat !== "turban" && L.hat !== "pith" && L.hat !== "slouch" && <path d={`M${P(hx - HEAD_R)},${P(hy - 0.02)} Q${P(hx - 0.1)},${P(hy - HEAD_R - 0.06)} ${P(hx + HEAD_R * 0.8)},${P(hy - HEAD_R * 0.55)} Q${P(hx)},${P(hy - HEAD_R * 0.6)} ${P(hx - HEAD_R)},${P(hy - 0.02)} Z`} fill={L.hair} stroke={INK} strokeWidth={0.018} />}
      {[0.03, 0.15].map((ox, i) => <g key={i}>
        {pose.blink ? <path d={`M${P(hx + ox - eyeR)},${P(hy - 0.02)} q${P(eyeR)},0.02 ${P(eyeR * 2)},0`} stroke={INK} strokeWidth={0.016} fill="none" /> : <>
          <ellipse cx={hx + ox} cy={hy - 0.02} rx={eyeR} ry={eyeR * 1.2} fill="#fffaf2" stroke={INK} strokeWidth={0.012} />
          <circle cx={hx + ox + lx} cy={hy - 0.015} r={ex === "scared" ? 0.014 : 0.019} fill={INK} />
        </>}
        <path d={`M${P(hx + ox - 0.045)},${P(hy - 0.085 + (i === 0 ? -browT : browT) * 0.6)} L${P(hx + ox + 0.045)},${P(hy - 0.085 + (i === 0 ? browT : -browT) * 0.6)}`} stroke={INK} strokeWidth={0.026} strokeLinecap="round" />
      </g>)}
      <path d={`M${P(hx + 0.1)},${P(hy + 0.0)} q0.035,0.05 -0.005,0.06`} stroke={INK} strokeWidth={0.014} fill="none" strokeLinecap="round" />
      {L.beard && <path d={`M${P(hx - 0.215)},${P(hy + 0.07)} Q${P(hx - 0.19)},${P(hy + 0.3)} ${P(hx + 0.05)},${P(hy + 0.315)} Q${P(hx + 0.23)},${P(hy + 0.29)} ${P(hx + 0.248)},${P(hy + 0.06)} Q${P(hx + 0.19)},${P(hy + 0.12)} ${P(hx + 0.13)},${P(hy + 0.1)} Q${P(hx + 0.03)},${P(hy + 0.14)} ${P(hx - 0.07)},${P(hy + 0.09)} Q${P(hx - 0.15)},${P(hy + 0.06)} ${P(hx - 0.215)},${P(hy + 0.07)} Z`} fill={L.beard} stroke={INK} strokeWidth={0.016} strokeLinejoin="round" />}
      {L.mustache && <path d={`M${P(hx + 0.0)},${P(hy + 0.09)} q0.045,-0.05 0.09,-0.012 q0.045,-0.04 0.09,0.012 q-0.045,0.035 -0.09,0.0 q-0.045,0.035 -0.09,0 Z`} fill={L.hair} stroke={INK} strokeWidth={0.012} />}
      {talk > 0.15 ? <ellipse cx={hx + 0.09} cy={hy + 0.135} rx={0.035} ry={0.02 + 0.025 * talk} fill="#5a1a22" stroke={INK} strokeWidth={0.012} />
        : <path d={ex === "smile" ? `M${P(hx + 0.05)},${P(hy + 0.12)} q0.04,0.035 0.08,0` : ex === "scared" || ex === "worried" ? `M${P(hx + 0.05)},${P(hy + 0.14)} q0.04,-0.03 0.08,0` : `M${P(hx + 0.055)},${P(hy + 0.13)} L${P(hx + 0.125)},${P(hy + 0.128)}`}
          stroke={INK} strokeWidth={0.016} fill="none" strokeLinecap="round" />}
      {L.toque && <g>
        <path d={`M${P(hx - 0.255)},${P(hy - 0.06)} Q${P(hx - 0.27)},${P(hy - 0.36)} ${P(hx - 0.02)},${P(hy - 0.38)} Q${P(hx + 0.25)},${P(hy - 0.37)} ${P(hx + 0.255)},${P(hy - 0.08)} Z`} fill={L.toque} stroke={INK} strokeWidth={0.022} strokeLinejoin="round" />
        {[-0.14, -0.05, 0.04, 0.13].map((ox, i) => <path key={i} d={`M${P(hx + ox)},${P(hy - 0.15)} Q${P(hx + ox * 1.1)},${P(hy - 0.28)} ${P(hx + ox * 0.6)},${P(hy - 0.35)}`} stroke={L.toqueDark} strokeWidth={0.012} fill="none" strokeLinecap="round" />)}
        <path d={`M${P(hx - 0.27)},${P(hy - 0.02)} Q${P(hx)},${P(hy - 0.08)} ${P(hx + 0.27)},${P(hy - 0.04)} L${P(hx + 0.265)},${P(hy - 0.14)} Q${P(hx)},${P(hy - 0.18)} ${P(hx - 0.265)},${P(hy - 0.12)} Z`} fill={L.toqueDark} stroke={INK} strokeWidth={0.02} strokeLinejoin="round" />
      </g>}
      {L.hat === "slouch" && <g>
        <path d={`M${P(hx - 0.21)},${P(hy - 0.13)} Q${P(hx - 0.23)},${P(hy - 0.36)} ${P(hx - 0.06)},${P(hy - 0.4)} Q${P(hx + 0.0)},${P(hy - 0.34)} ${P(hx + 0.06)},${P(hy - 0.4)} Q${P(hx + 0.23)},${P(hy - 0.37)} ${P(hx + 0.22)},${P(hy - 0.13)} Z`} fill={L.hatCol} stroke={INK} strokeWidth={0.022} strokeLinejoin="round" />
        <path d={`M${P(hx - 0.215)},${P(hy - 0.19)} Q${P(hx)},${P(hy - 0.215)} ${P(hx + 0.225)},${P(hy - 0.19)} L${P(hx + 0.222)},${P(hy - 0.135)} Q${P(hx)},${P(hy - 0.16)} ${P(hx - 0.212)},${P(hy - 0.135)} Z`} fill={L.band} />
        <path d={`M${P(hx - 0.36)},${P(hy - 0.06)} Q${P(hx - 0.3)},${P(hy - 0.17)} ${P(hx)},${P(hy - 0.155)} Q${P(hx + 0.32)},${P(hy - 0.16)} ${P(hx + 0.42)},${P(hy - 0.04)} Q${P(hx + 0.3)},${P(hy - 0.09)} ${P(hx)},${P(hy - 0.1)} Q${P(hx - 0.27)},${P(hy - 0.1)} ${P(hx - 0.36)},${P(hy - 0.06)} Z`} fill={L.hatCol} stroke={INK} strokeWidth={0.02} strokeLinejoin="round" />
        <path d={`M${P(hx - 0.2)},${P(hy - 0.3)} Q${P(hx - 0.1)},${P(hy - 0.33)} ${P(hx - 0.05)},${P(hy - 0.36)}`} stroke="rgba(0,0,0,0.25)" strokeWidth={0.014} fill="none" strokeLinecap="round" />
      </g>}
      {L.hat === "pith" && <g>
        <path d={`M${P(hx - 0.2)},${P(hy - 0.1)} Q${P(hx - 0.2)},${P(hy - 0.4)} ${P(hx + 0.02)},${P(hy - 0.41)} Q${P(hx + 0.24)},${P(hy - 0.4)} ${P(hx + 0.23)},${P(hy - 0.1)} Z`} fill={L.hatCol} stroke={INK} strokeWidth={0.022} />
        <path d={`M${P(hx - 0.2)},${P(hy - 0.15)} L${P(hx + 0.23)},${P(hy - 0.15)} L${P(hx + 0.23)},${P(hy - 0.1)} L${P(hx - 0.2)},${P(hy - 0.1)} Z`} fill={L.band} />
        <path d={`M${P(hx - 0.33)},${P(hy - 0.05)} Q${P(hx)},${P(hy - 0.15)} ${P(hx + 0.37)},${P(hy - 0.05)} Q${P(hx)},${P(hy - 0.08)} ${P(hx - 0.33)},${P(hy - 0.05)} Z`} fill={L.hatCol} stroke={INK} strokeWidth={0.022} strokeLinejoin="round" />
        <path d={`M${P(hx - 0.1)},${P(hy - 0.33)} q0.06,-0.04 0.12,-0.03`} stroke="rgba(255,255,255,0.5)" strokeWidth={0.02} fill="none" strokeLinecap="round" />
      </g>}
      {L.hat === "turban" && <g>
        <path d={`M${P(hx - 0.25)},${P(hy - 0.02)} Q${P(hx - 0.3)},${P(hy - 0.33)} ${P(hx - 0.02)},${P(hy - 0.36)} Q${P(hx + 0.28)},${P(hy - 0.36)} ${P(hx + 0.26)},${P(hy - 0.06)} Q${P(hx)},${P(hy - 0.12)} ${P(hx - 0.25)},${P(hy - 0.02)} Z`} fill={L.hatCol} stroke={INK} strokeWidth={0.022} strokeLinejoin="round" />
        {[0, 1].map((k) => <path key={k} d={`M${P(hx - 0.22 + k * 0.03)},${P(hy - 0.1 - k * 0.1)} Q${P(hx)},${P(hy - 0.22 - k * 0.1)} ${P(hx + 0.24 - k * 0.04)},${P(hy - 0.12 - k * 0.09)}`} stroke={L.band} strokeWidth={0.022} fill="none" strokeLinecap="round" />)}
      </g>}
    </g>
  );
};

/** arm from the shoulder: upper angle th (deg from down, + forward), elbow bend e (deg, forward only) */
const armPts = (sx: number, sy: number, th: number, e: number) => {
  const a1 = rad(th), ex = sx + Math.sin(a1) * UPPER, ey = sy + Math.cos(a1) * UPPER;
  const a2 = rad(th + Math.max(0, e)), wx = ex + Math.sin(a2) * FORE, wy = ey + Math.cos(a2) * FORE;
  return { s: [sx, sy] as V, e: [ex, ey] as V, w: [wx, wy] as V, dir: th + Math.max(0, e) };
};

const Arm: React.FC<{ a: ReturnType<typeof armPts>; L: ToonLook; far?: boolean }> = ({ a, L, far }) => {
  const sleeve = far ? L.topDark : L.top;
  const d = rad(a.dir), ux = Math.sin(d), uy = Math.cos(d), nx = uy, ny = -ux; // along the forearm, and toward the thumb
  const hx = a.w[0] + ux * 0.05, hy = a.w[1] + uy * 0.05, deg = (Math.atan2(uy, ux) * 180) / Math.PI;
  const cuff: V = [a.w[0] - ux * 0.012, a.w[1] - uy * 0.012];
  return (
    <g>
      {/* hand under the sleeve end: a mitten with a thumb */}
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(${P(deg)})`}>
        <Two fill={L.skin} ow={0.022} d={[
          `M-0.03,-0.038 Q0.05,-0.05 0.058,0.0 Q0.05,0.048 -0.03,0.04 Q-0.05,0.0 -0.03,-0.038 Z`,
          `M-0.025,-0.025 Q0.0,-0.075 0.035,-0.062 Q0.05,-0.045 0.02,-0.022 Z`,
        ]} />
      </g>
      <Two fill={sleeve} d={tube(a.s, a.e, cuff, 0.05, 0.036, 0.08)} />
      {L.check && <path d={tube(a.s, a.e, cuff, 0.05, 0.036, 0.08)} fill="url(#lg-check)" opacity={far ? 0.5 : 0.85} />}
      {/* cuff */}
      <path d={`M${P(cuff[0] + nx * 0.036)},${P(cuff[1] + ny * 0.036)} L${P(cuff[0] - nx * 0.036)},${P(cuff[1] - ny * 0.036)}`} stroke={far ? INK : L.topDark} strokeWidth={0.014} strokeLinecap="round" />
    </g>
  );
};

const Leg: React.FC<{ hip: V; f: ReturnType<typeof footPose>; L: ToonLook; far?: boolean }> = ({ hip, f, L, far }) => {
  const k = ik(hip[0], hip[1], f.ax, f.ay, THIGH, SHIN, 1);
  const col = far ? (L.legsDark ?? L.topDark) : L.legs;
  return (
    <g>
      <g transform={`translate(${P(f.ax)},${P(f.ay)}) rotate(${P(f.deg)})`}>
        <Two fill={far ? "#2e1e14" : L.boots} ow={0.022} d={BOOT} />
        <path d="M-0.055,0.06 L0.16,0.06" stroke="rgba(0,0,0,0.35)" strokeWidth={0.014} />
      </g>
      <Two fill={col} d={tube(hip, [k.jx, k.jy], [k.tx, k.ty - 0.015], 0.058, 0.042, 0.05)} />
    </g>
  );
};

export const Logger: React.FC<{ x: number; y: number; ppm: number; look: ToonLook; pose: ToonPose; flip?: boolean; shade?: number }> =
  ({ x, y, ppm, look: L, pose, flip = false, shade = 1 }) => {
    const w = clamp01(pose.walk ?? 0), dist = pose.dist ?? 0, t = pose.t ?? 0;
    const near = footAt(dist, 0, w, 0.07), far = footAt(dist, 0.5, w, -0.06);
    // hips: lower while walking, rise over each planted foot (twice per cycle), idle breathing and a slow weight shift
    const cyc = dist / TOON_STRIDE, mid = Math.cos(4 * Math.PI * (cyc - 0.5 * STANCE * 0.5));
    const sway = (1 - w) * 0.012 * Math.sin(t * 0.7);
    const hipY = -(HIP - 0.055 * w + 0.016 * w * mid) + (1 - w) * 0.004 * Math.sin(t * 1.7);
    const hipX = sway;
    const lean = 5 * w + (1 - w) * 0.6 * Math.sin(t * 0.7);
    const breath = (1 - w) * Math.sin(t * 1.7);
    // torso turn: the near shoulder comes forward with the near arm
    const armPh = Math.cos(2 * Math.PI * near.loc);
    const turn = 0.018 * w * -armPh;
    // arms: opposite the legs while walking, hanging and still (only breathing) when standing
    const swing = 22 * w;
    const lantern = pose.hold === "lantern";
    const nearA: [number, number] = pose.armNear ?? (lantern ? [mix(5, 7, w) - 0.45 * swing * armPh + breath * 0.4, mix(14, 18, w) + 6 * w * Math.max(0, -armPh)] : [mix(2, 4, w) - swing * armPh + breath * 0.6, mix(8, 12, w) + 16 * w * Math.max(0, -armPh)]);
    const farA: [number, number] = pose.armFar ?? [mix(1, 4, w) + swing * armPh + breath * 0.6, mix(8, 12, w) + 16 * w * Math.max(0, armPh)];
    // body frame: rotate by the lean about the hip
    const lr = rad(lean), cl = Math.cos(lr), sl = Math.sin(lr);
    const up = (h: number, dx = 0): V => [hipX + dx * cl + Math.sin(lr) * h, hipY - Math.cos(lr) * h + dx * sl];
    const sh = up(SHOULDER - HIP + 0.004 * breath);
    const shN: V = [sh[0] + 0.015 + turn, sh[1] + 0.025], shF: V = [sh[0] - 0.035 - turn, sh[1] + 0.03];
    const nk = up(NECK - HIP + 0.004 * breath);
    const hx = nk[0] + 0.02 + 0.01 * w, hy = nk[1] - HEAD_R + 0.05;
    const holdPlank = pose.hold === "plank";
    const nA = armPts(shN[0], shN[1], holdPlank ? 42 : nearA[0], holdPlank ? 58 : nearA[1]);
    const fA = armPts(shF[0], shF[1], holdPlank ? 48 : farA[0], holdPlank ? 52 : farA[1]);
    const d0 = rad(nA.dir), lpx = nA.w[0] + Math.sin(d0) * 0.06, lpy = nA.w[1] + Math.cos(d0) * 0.06;
    const pend = lantern ? -0.55 * swing * Math.sin(2 * Math.PI * near.loc) + (1 - w) * 2.5 * Math.sin(t * 1.3) : 0;
    const lit = clamp01(pose.lit ?? 1), flick = lit * (0.86 + 0.09 * Math.sin(t * 13.1) + 0.05 * Math.sin(t * 31.3 + 1));
    const hipN: V = [hipX + 0.025, hipY], hipF: V = [hipX - 0.03, hipY - 0.01];
    // jacket / shirt in body space (drawn rotated by the lean about the hip)
    const top = SHOULDER - HIP, hem = L.long ? -0.2 : -0.1;
    const jacket = `M-0.12,${P(-top + 0.05)} Q-0.13,${P(-top - 0.02)} -0.02,${P(-top - 0.035)} L0.05,${P(-top - 0.035)} Q0.15,${P(-top - 0.02)} 0.14,${P(-top + 0.06)}
      Q0.16,${P(-0.1)} ${P(L.long ? 0.17 : 0.15)},${P(-hem)} Q0.02,${P(-hem + 0.035)} ${P(L.long ? -0.16 : -0.14)},${P(-hem)} Q-0.15,${P(-0.12)} -0.12,${P(-top + 0.05)} Z`;
    return (
      <g transform={`translate(${P(x)},${P(y)}) scale(${P((flip ? -1 : 1) * ppm)},${P(ppm)})`} style={shade !== 1 ? { filter: `brightness(${shade})` } : undefined}>
        <defs>
          <pattern id="lg-check" patternUnits="userSpaceOnUse" width={0.09} height={0.09} patternTransform="rotate(3)">
            <rect x={0} y={0} width={0.045} height={0.09} fill="rgba(12,8,10,0.55)" />
            <rect x={0} y={0} width={0.09} height={0.045} fill="rgba(12,8,10,0.55)" />
            <path d="M0,0.0675 L0.09,0.0675 M0.0675,0 L0.0675,0.09" stroke="rgba(255,255,255,0.06)" strokeWidth={0.004} />
          </pattern>
          <radialGradient id="lg-glow" r={0.5}>
            <stop offset="0" stopColor="#ffc070" stopOpacity={0.55} /><stop offset="0.35" stopColor="#ff9a40" stopOpacity={0.2} /><stop offset="1" stopColor="#ff7a20" stopOpacity={0} />
          </radialGradient>
        </defs>
        {lantern && flick > 0.01 && <circle cx={lpx} cy={lpy + 0.17} r={1.7} fill="url(#lg-glow)" opacity={flick} style={{ mixBlendMode: "screen" }} />}
        <ellipse cx={hipX} cy={0} rx={0.34} ry={0.05} fill="rgba(10,5,10,0.33)" />
        <Arm a={fA} L={L} far />
        <Leg hip={hipF} f={footPose(far.rel, far.lift, far.pitch)} L={L} far />
        <Leg hip={hipN} f={footPose(near.rel, near.lift, near.pitch)} L={L} />
        <g transform={`translate(${P(hipX)},${P(hipY)}) rotate(${P(lean)}) scale(1,${P(1 + 0.008 * breath)})`}>
          <Two fill={L.top} d={jacket} />
          {L.check && <path d={jacket} fill="url(#lg-check)" opacity={0.85} />}
          {L.braces && <>
            <path d={`M0.075,${P(-top - 0.03)} Q0.1,${P(-0.2)} 0.1,${P(-hem - 0.005)}`} stroke={L.braces} strokeWidth={0.026} fill="none" />
            <path d={`M-0.03,${P(-top - 0.03)} Q-0.02,${P(-0.2)} -0.03,${P(-hem - 0.005)}`} stroke={L.braces} strokeWidth={0.022} fill="none" opacity={0.85} />
          </>}
          {/* back shade, front opening, collar */}
          <path d={`M-0.11,${P(-top + 0.08)} Q-0.135,${P(-0.12)} ${P(L.long ? -0.14 : -0.125)},${P(-hem - 0.02)}`} stroke={L.topDark} strokeWidth={0.035} fill="none" strokeLinecap="round" />
          <path d={`M0.085,${P(-top - 0.02)} Q0.1,${P(-0.15)} 0.09,${P(-hem + 0.01)}`} stroke={L.topDark} strokeWidth={0.012} fill="none" strokeLinecap="round" />
          <path d={`M-0.01,${P(-top - 0.035)} L0.06,${P(-top + 0.04)} L0.1,${P(-top - 0.03)}`} stroke={INK} strokeWidth={0.014} fill={L.topDark} strokeLinejoin="round" />
          {!L.sash && !L.long && [0, 1, 2].map((i) => <circle key={i} cx={0.105} cy={-top + 0.09 + i * 0.075} r={0.011} fill={L.topDark} stroke={INK} strokeWidth={0.006} />)}
          {!L.long && <path d="M0.09,-0.2 L0.13,-0.2" stroke={L.topDark} strokeWidth={0.01} />}
          {L.belt && <path d={`M-0.14,-0.04 Q0.0,-0.025 0.15,-0.04`} stroke={L.belt} strokeWidth={0.035} fill="none" />}
          {L.sash && <path d={`M-0.12,-0.03 Q0.0,-0.01 0.15,-0.035`} stroke={L.sash} strokeWidth={0.04} fill="none" />}
        </g>
        <Head hx={hx} hy={hy} L={L} pose={{ ...pose, tilt: (pose.tilt ?? 0) + lean * 0.4 }} />
        {holdPlank && <g transform={`translate(${P((nA.w[0] + fA.w[0]) / 2 + 0.04)},${P((nA.w[1] + fA.w[1]) / 2 + 0.03)}) rotate(-4)`}>
          <rect x={-0.8} y={-0.035} width={1.6} height={0.07} fill="#6a4a2a" stroke={INK} strokeWidth={0.014} />
          <path d="M-0.78,0.0 L0.78,0.0" stroke="rgba(0,0,0,0.18)" strokeWidth={0.01} />
        </g>}
        {pose.hold === "rifle" && <g transform={`translate(${P(nA.w[0])},${P(nA.w[1])}) rotate(-35)`}>
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
        <Arm a={nA} L={L} />
        {/* soft shoulder: hides where the sleeve starts, so the arm grows out of the jacket */}
        <circle cx={nA.s[0]} cy={nA.s[1] + 0.012} r={0.044} fill={L.top} />
      </g>
    );
  };
