// The fisherman for "The Ahuizotl" (Aztec legend): an adult Mexica fisherman around 1500, drawn in the same flat,
// bold, outlined style as the Spider Woman cast, but taller with a smaller head (about 6 heads tall) and anatomical,
// jointed limbs. Built on the same mechanics as templates/jorogumo/kimono.tsx (the approved rebuilt rig):
//  - the distance-driven planted-foot walk (a planted foot moves back exactly as fast as the body moves on, so it never
//    slides; feet roll heel to toe), with the hips bobbing and the torso leaning a little into the walk;
//  - arms that swing opposite the legs a touch late (follow-through) and simply hang and breathe when he stands.
// New: real limb shapes instead of tubes. Each limb is two tapered segments with their own muscle profile (deltoid and
// biceps, forearm swell, thigh, calf), merged under one outline, so an elbow or knee bends as a soft natural corner:
// no joint circles, no hinge, no V and no rubber-hose curve. Bare legs and arms in warm brown skin.
// Costume (historically plausible for a commoner): an undyed white cotton maxtlatl (loincloth: a waist wrap with a
// front and a back flap), a plain undyed tilmatli (cloak) knotted on the near shoulder and hanging behind to the knees,
// simple cactli sandals (a sole tied round the ankle), straight black hair cut with a fringe, a small wooden ear spool,
// and a folded fishing net slung over the near shoulder down his back with a few wooden floats.
// Units are metres, the soles on y = 0, the figure faces +x (flip mirrors it).
import React from "react";

export const INK = "#16121a";
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const P = (n: number) => n.toFixed(4);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
type V = [number, number];

export type FLook = {
  skin: string; skinDark: string; hair: string; cloth: string; clothDark: string; cloak: string; cloakDark: string;
  net: string; netDark: string; float: string; sandal: string; lips: string;
  /** stride (same foot to same foot, metres) and how high the feet lift */
  stride: number; lift: number;
};
export type FPose = {
  dist?: number; walk?: number; t?: number;
  /** arm angles [shoulder degrees from straight down, + is forward; elbow bend degrees, forward] */
  armNear?: [number, number]; armFar?: [number, number];
  expr?: "neutral" | "tired" | "wary" | "worried" | "scared";
  /** pupils: -1 look back .. 1 look forward */
  lookX?: number; lookY?: number; blink?: boolean;
  /** head: tilt in degrees (+ nods forward), turn 0 = three-quarter, 1 = turned away toward profile (into the scene) */
  tilt?: number; turn?: number;
  /** extra forward lean of the upper body in degrees */
  slump?: number;
  /** breathing depth (1 = normal) */
  breath?: number;
  /** (added for part C, optional: without it nothing changes) 0 standing .. 1 down on the far knee: the far foot stays
   *  where it stands and rolls onto its toes, the near foot steps forward and plants, the hips go forward and down until
   *  the far knee rests on the ground, the cloak and the loincloth flap drape lower */
  kneel?: number;
};

export const FISHER: FLook = {
  skin: "#a86c44", skinDark: "#7c4c2e", hair: "#120e14", cloth: "#dbd3c0", clothDark: "#aaa08a", cloak: "#ab9c78", cloakDark: "#7d6f52",
  net: "#6e5a3c", netDark: "#4a3c26", float: "#9a7a48", sandal: "#5e4128", lips: "#7a3e2c", stride: 0.95, lift: 1.0,
};

// proportions: about 1.66 m tall, ~6 heads
const HIP = 0.86, THIGH = 0.405, SHIN = 0.39, ANKLE = 0.075;
const SHOULDER = 1.375, NECK = 1.405, HEAD_RX = 0.108, HEAD_RY = 0.128;
const UPPER = 0.29, FORE = 0.265;
const STANCE = 0.6;
// the kneel (pose.kneel): the far foot rolls onto its toes where it stands (rel -0.07, pitch 65: the ankle ends at
// about (0.067, -0.14)); the far knee rests on the ground (y -0.045) a shin length in front of it, with the hips right
// above the knee; the near foot plants a step ahead
const KNEEL_BACK = -0.07, KNEEL_TOE = 65, KNEEL_HIP: V = [0.43, -0.45], KNEEL_FRONT = 0.8;

/** smooth closed (or open) path through points (Catmull-Rom as cubic Beziers) */
export const spline = (pts: V[], closed = true, k = 1) => {
  const n = pts.length, g = (i: number) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${P(pts[0][0])},${P(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1: V = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
    const c2: V = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
    d += ` C${P(c1[0])},${P(c1[1])} ${P(c2[0])},${P(c2[1])} ${P(p2[0])},${P(p2[1])}`;
  }
  return d + (closed ? " Z" : "");
};

/** one limb segment from a to b: its own width profile on each side (muscle shapes), rounded ends.
 *  wl / wr give the half-width on the left / right of the a->b direction for t in 0..1 */
const seg = (a: V, b: V, wl: (t: number) => number, wr: (t: number) => number) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1e-6, ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  const N = 14, L: V[] = [], R: V[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, cx = a[0] + dx * t, cy = a[1] + dy * t;
    L.push([cx + nx * wl(t), cy + ny * wl(t)]);
    R.push([cx - nx * wr(t), cy - ny * wr(t)]);
  }
  const cap = (c: V, w1: number, w2: number, s: number) => {   // half-ellipse round the end, s = +1 forward (b), -1 back (a)
    const out: V[] = [];
    for (let k = 1; k < 8; k++) {
      const th = (k / 8) * Math.PI, cs = Math.cos(th), sn = Math.sin(th), w = cs > 0 ? w1 : w2, r = (w1 + w2) / 2;
      out.push([c[0] + nx * w * cs * s + ux * r * sn * s, c[1] + ny * w * cs * s + uy * r * sn * s]);
    }
    return out;
  };
  const pts = [...L, ...cap(b, wl(1), wr(1), 1), ...R.slice().reverse(), ...cap(a, wr(0), wl(0), -1)];
  return `M${pts.map((p) => `${P(p[0])},${P(p[1])}`).join(" L")} Z`;
};
const bump = (t: number, at: number, w: number) => Math.exp(-(((t - at) / w) ** 2));

/** outline everything first, then fill everything: overlapping parts merge into one shape under one outline */
export const Two: React.FC<{ d: string | string[]; fill: string; ow?: number }> = ({ d, fill, ow = 0.018 }) => {
  const ds = Array.isArray(d) ? d : [d];
  return <g>
    {ds.map((x, i) => <path key={"o" + i} d={x} fill={INK} stroke={INK} strokeWidth={ow} strokeLinejoin="round" />)}
    {ds.map((x, i) => <path key={"f" + i} d={x} fill={fill} />)}
  </g>;
};

const ik = (rx: number, ry: number, tx: number, ty: number, l1: number, l2: number, bend: number) => {
  const dx = tx - rx, dy = ty - ry, d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, Math.hypot(dx, dy)));
  const a = Math.atan2(dy, dx), off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = a - bend * off;
  return { jx: rx + Math.cos(ang) * l1, jy: ry + Math.sin(ang) * l1, tx: rx + Math.cos(a) * d, ty: ry + Math.sin(a) * d };
};

/** one foot relative to the hips after `dist` metres; planted feet move back exactly as fast as the body moves on */
const footAt = (C: number, liftK: number, dist: number, o: number, w: number, idleRel: number) => {
  const cyc = dist / C + o, loc = cyc - Math.floor(cyc);
  let rel: number, lift = 0, pitch = 0;
  if (loc < STANCE) {
    rel = 0.5 * STANCE * C - loc * C;
    pitch = loc < 0.1 ? mix(-12, 0, smooth(loc / 0.1)) : loc > 0.4 ? mix(0, 28, smooth((loc - 0.4) / (STANCE - 0.4))) : 0;
  } else {
    const k = (loc - STANCE) / (1 - STANCE), e = smooth(k);
    rel = -0.5 * STANCE * C + STANCE * C * e;
    lift = 0.1 * liftK * Math.sin(Math.PI * Math.min(1, k * 1.15));
    pitch = mix(28, -12, smooth(k * 1.1));
  }
  return { rel: mix(idleRel, rel, w), lift: lift * w, pitch: pitch * w, loc };
};

// the bare foot (ankle at 0,0; sole at y = ANKLE): heel, arch, ball, toes
const FOOT: V[] = [[-0.035, -0.03], [0.02, -0.022], [0.07, 0.014], [0.13, 0.038], [0.165, 0.05], [0.175, 0.066], [0.155, 0.075], [0.06, 0.072], [-0.02, 0.075], [-0.058, 0.066], [-0.062, 0.03]];
const HEEL: V = [-0.055, ANKLE], BALL: V = [0.12, ANKLE];
const footPose = (rel: number, lift: number, pitch: number) => {
  const piv = pitch >= 0 ? BALL : HEEL, a = rad(pitch), c = Math.cos(a), s = Math.sin(a);
  const pw: V = [rel + piv[0], -lift];
  const vx = -piv[0], vy = -piv[1];
  return { ax: pw[0] + vx * c - vy * s, ay: pw[1] + vx * s + vy * c, deg: pitch };
};
const Foot: React.FC<{ f: ReturnType<typeof footPose>; L: FLook; far?: boolean }> = ({ f, L, far }) =>
  <g transform={`translate(${P(f.ax)},${P(f.ay)}) rotate(${P(f.deg)})`}>
    {/* cactli: a fibre/leather sole under the foot, a toe thong and a tie round the ankle */}
    <Two fill={L.sandal} ow={0.012} d="M-0.075,0.068 L0.185,0.064 Q0.195,0.072 0.185,0.082 L-0.075,0.084 Q-0.085,0.076 -0.075,0.068 Z" />
    <Two fill={far ? L.skinDark : L.skin} ow={0.016} d={spline(FOOT)} />
    <path d="M0.15,0.06 Q0.1,0.025 0.035,0.0 M-0.05,0.0 Q0.0,0.012 0.035,0.0" stroke={L.sandal} strokeWidth={0.013} fill="none" strokeLinecap="round" />
    <path d="M0.155,0.07 L0.152,0.058 M0.135,0.071 L0.133,0.06" stroke={INK} strokeWidth={0.005} opacity={0.6} />
  </g>;

/** bare leg: thigh and shin with their own shapes (front of the thigh, the calf at the back), merged at the knee */
const legShapes = (hip: V, k: { jx: number; jy: number; tx: number; ty: number }) => {
  const knee: V = [k.jx, k.jy], ank: V = [k.tx, k.ty];
  // direction hip->knee points down: left side (+normal) is the BACK of the leg (x negative when facing +x)
  const thigh = seg(hip, knee, (t) => mix(0.082, 0.05, t) + 0.006 * bump(t, 0.35, 0.3), (t) => mix(0.078, 0.052, t) + 0.012 * bump(t, 0.3, 0.3));
  const shin = seg(knee, ank, (t) => mix(0.05, 0.03, t) + 0.02 * bump(t, 0.28, 0.22), (t) => mix(0.046, 0.03, t) + 0.004 * bump(t, 0.2, 0.3));
  return [thigh, shin];
};
const Leg: React.FC<{ hip: V; f: ReturnType<typeof footPose>; L: FLook; far?: boolean }> = ({ hip, f, L, far }) => {
  const k = ik(hip[0], hip[1], f.ax, f.ay, THIGH, SHIN, 1);
  const col = far ? L.skinDark : L.skin;
  const bend = 180 - deg(Math.acos(Math.max(-1, Math.min(1, ((k.jx - hip[0]) * (k.tx - k.jx) + (k.jy - hip[1]) * (k.ty - k.jy)) / (THIGH * Math.hypot(k.tx - k.jx, k.ty - k.jy) + 1e-9)))));
  return <g>
    <Foot f={f} L={L} far={far} />
    <Two fill={col} d={legShapes(hip, k)} />
    {/* knee cap hint and shin line, very light */}
    {!far && <path d={`M${P(k.jx + 0.03)},${P(k.jy - 0.03)} Q${P(k.jx + 0.05)},${P(k.jy)} ${P(k.jx + 0.032)},${P(k.jy + 0.03)}`} stroke={L.skinDark} strokeWidth={0.008} fill="none" opacity={0.55 * clamp01((175 - bend) / 30 + 0.3)} />}
  </g>;
};

/** arm geometry from angles: shoulder angle from straight down (+ forward), elbow bend forward */
const armPts = (sx: number, sy: number, th: number, e: number) => {
  const a1 = rad(th), ex = sx + Math.sin(a1) * UPPER, ey = sy + Math.cos(a1) * UPPER;
  const a2 = rad(th + Math.max(0, e)), wx = ex + Math.sin(a2) * FORE, wy = ey + Math.cos(a2) * FORE;
  return { s: [sx, sy] as V, e: [ex, ey] as V, w: [wx, wy] as V, dir: th + Math.max(0, e), bend: Math.max(0, e) };
};
/** arm angles that put the wrist on a target point (figure metres) */
export const reach = (s: V, tg: V): [number, number] => {
  const dx = tg[0] - s[0], dy = tg[1] - s[1], d = Math.max(0.05, Math.min(UPPER + FORE - 1e-3, Math.hypot(dx, dy)));
  const cl = (v: number) => Math.max(-1, Math.min(1, v));
  const inner = Math.acos(cl((UPPER * UPPER + FORE * FORE - d * d) / (2 * UPPER * FORE)));
  const alpha = Math.acos(cl((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d)));
  return [deg(Math.atan2(dx, dy) - alpha), 180 - deg(inner)];
};

/** bare arm: deltoid and biceps on the upper arm, the forearm swelling below the elbow and slimming to the wrist,
 *  a relaxed hand with the thumb forward and the fingers loosely curled */
const Arm: React.FC<{ a: ReturnType<typeof armPts>; L: FLook; far?: boolean; curl?: number }> = ({ a, L, far, curl = 0.5 }) => {
  const col = far ? L.skinDark : L.skin;
  // upper arm direction is down-ish: the left side (+normal) is the BACK of the arm (triceps), the right side the front
  const upper = seg(a.s, a.e, (t) => mix(0.06, 0.04, t) + 0.012 * bump(t, 0.12, 0.2) + 0.008 * bump(t, 0.5, 0.25),
    (t) => mix(0.058, 0.038, t) + 0.014 * bump(t, 0.1, 0.18) + 0.011 * bump(t, 0.55, 0.22));
  const fore = seg(a.e, a.w, (t) => mix(0.041, 0.027, t) + 0.013 * bump(t, 0.25, 0.25), (t) => mix(0.039, 0.028, t) + 0.009 * bump(t, 0.2, 0.25));
  const d = rad(a.dir), ux = Math.sin(d), uy = Math.cos(d), hd = deg(Math.atan2(uy, ux)) - 5;   // the wrist carries on the forward curve a little
  const c = curl;
  // hand in local coords: +x along the forearm to the fingertips, -y is the thumb side (forward)
  const hand = spline([[-0.012, -0.03], [0.04, -0.036], [0.085, -0.03], [0.12 - 0.02 * c, -0.012 + 0.01 * c], [0.128 - 0.035 * c, 0.016 + 0.02 * c],
    [0.1 - 0.03 * c, 0.036 + 0.008 * c], [0.05, 0.034], [-0.012, 0.028]]);
  const thumb = spline([[0.01, -0.028], [0.04, -0.044], [0.062, -0.046], [0.068, -0.037], [0.05, -0.028], [0.03, -0.018]]);
  return (
    <g>
      <g transform={`translate(${P(a.w[0] - ux * 0.01)},${P(a.w[1] - uy * 0.01)}) rotate(${P(hd)})`}>
        <Two fill={col} ow={0.014} d={[hand, thumb]} />
        <path d={`M${P(0.075 - 0.01 * c)},${P(0.0)} Q${P(0.1 - 0.02 * c)},${P(0.01 + 0.01 * c)} ${P(0.095 - 0.03 * c)},${P(0.026 + 0.008 * c)}`} stroke={INK} strokeWidth={0.006} fill="none" opacity={0.55} />
      </g>
      <Two fill={col} d={[upper, fore]} />
      {/* the inside of the elbow: a soft fold line that only shows when the arm bends */}
      {a.bend > 14 && (() => {
        const b = rad(a.dir - a.bend / 2), fx = Math.cos(b), fy = -Math.sin(b), o = 0.03, k = clamp01((a.bend - 14) / 30);
        return <path d={`M${P(a.e[0] + fx * o - Math.sin(b) * 0.02)},${P(a.e[1] + fy * o - Math.cos(b) * 0.02)} Q${P(a.e[0] + fx * o * 0.7)},${P(a.e[1] + fy * o * 0.7)} ${P(a.e[0] + fx * o + Math.sin(b) * 0.022)},${P(a.e[1] + fy * o + Math.cos(b) * 0.022)}`}
          stroke={INK} strokeWidth={0.007} fill="none" opacity={0.45 * k} strokeLinecap="round" />;
      })()}
    </g>
  );
};

const Head: React.FC<{ hx: number; hy: number; L: FLook; pose: FPose; hairSway: number }> = ({ hx, hy, L, pose, hairSway }) => {
  const tn = clamp01(pose.turn ?? 0);
  const S = (x: number, y: number): V => [hx + x, hy + y];
  const ex = pose.expr ?? "neutral";
  // features slide toward the front edge as he turns away (into the scene); the far eye narrows
  const fx = 0.01 * tn * 3, nearEye = S(0.026 + fx, -0.012), farEye = S(0.078 + fx * 0.8, -0.014);
  const lx = (pose.lookX ?? 0.4) * 0.008 + 0.005 * tn, ly = (pose.lookY ?? 0) * 0.006;
  const browUp = ex === "wary" ? 0.008 : ex === "worried" || ex === "scared" ? 0.012 : ex === "tired" ? -0.004 : 0;
  const browIn = ex === "worried" || ex === "scared" ? 0.01 : ex === "wary" ? 0.004 : ex === "tired" ? -0.002 : 0;
  const eyeR = ex === "scared" ? 1.25 : 1;
  const head: V[] = [[0.0, -HEAD_RY], [0.07, -0.108], [0.1, -0.06], [0.104 + 0.004 * tn, -0.02], [0.1 + 0.004 * tn, 0.01], [0.103, 0.05], [0.098, 0.084], [0.07, 0.118],
    [0.03, 0.128], [-0.02, 0.11], [-0.07, 0.07], [-0.1, 0.02], [-0.108, -0.04], [-0.085, -0.1]].map(([x, y]) => S(x, y));
  const nose = spline([S(0.098 + 0.004 * tn, -0.012), S(0.12 + 0.004 * tn, 0.022), S(0.135 + 0.003 * tn, 0.04), S(0.118, 0.052), S(0.1, 0.05)], false);
  const lids = pose.blink ? 1 : ex === "tired" ? 0.35 : 0;
  const eye = (c: V, rx: number, ry: number, far: boolean) => {
    rx *= eyeR; ry *= eyeR;
    if (lids >= 0.95) return <path d={`M${P(c[0] - rx)},${P(c[1] + 0.002)} Q${P(c[0])},${P(c[1] + 0.008)} ${P(c[0] + rx)},${P(c[1] + 0.002)}`} stroke={INK} strokeWidth={0.008} fill="none" strokeLinecap="round" />;
    const lidY = c[1] - ry + 2 * ry * lids * 0.9;
    return <g>
      <ellipse cx={c[0]} cy={c[1]} rx={rx} ry={ry} fill="#f4eee2" stroke={INK} strokeWidth={0.006} />
      <circle cx={c[0] + lx * (far ? 0.7 : 1)} cy={c[1] + 0.002 + ly} r={ex === "scared" ? 0.007 : 0.0105} fill={INK} />
      <circle cx={c[0] + lx * (far ? 0.7 : 1) + 0.003} cy={c[1] - 0.003 + ly} r={0.0028} fill="#fff" opacity={0.8} />
      {lids > 0.01 && <path d={`M${P(c[0] - rx * 1.1)},${P(c[1] - ry * 1.2)} L${P(c[0] + rx * 1.1)},${P(c[1] - ry * 1.2)} L${P(c[0] + rx * 1.1)},${P(lidY)} L${P(c[0] - rx * 1.1)},${P(lidY)} Z`} fill={L.skin} />}
      {/* upper lid line (heavier, gives the eye its shape) */}
      <path d={`M${P(c[0] - rx * 1.05)},${P(Math.max(c[1] - ry * 0.4, lidY))} Q${P(c[0])},${P(Math.max(c[1] - ry * 1.25, lidY - 0.004))} ${P(c[0] + rx * 1.1)},${P(Math.max(c[1] - ry * 0.5, lidY))}`} stroke={INK} strokeWidth={0.009} fill="none" strokeLinecap="round" />
    </g>;
  };
  const brow = (c: V, w: number, inner: number) => {   // inner = which end is toward the nose (+x side)
    const yo = c[1] - 0.04 - browUp, a: V = [c[0] - w, yo + 0.002], b: V = [c[0] + w, yo + inner * browIn - 0.002];
    return <path d={`M${P(a[0])},${P(a[1])} Q${P(c[0])},${P(yo - 0.008 - browUp * 0.4)} ${P(b[0])},${P(b[1])}`} stroke={INK} strokeWidth={0.014} fill="none" strokeLinecap="round" />;
  };
  const m0 = S(0.064 + fx * 0.6, 0.083), m1 = S(0.096, 0.08);
  const mouth = ex === "scared" ? <ellipse cx={(m0[0] + m1[0]) / 2} cy={m0[1] + 0.004} rx={0.014} ry={0.012} fill="#3a1a14" stroke={INK} strokeWidth={0.006} />
    : ex === "wary" ? <path d={`M${P(m0[0])},${P(m0[1])} Q${P((m0[0] + m1[0]) / 2)},${P(m0[1] + 0.006)} ${P(m1[0])},${P(m1[1] + 0.001)} Q${P((m0[0] + m1[0]) / 2)},${P(m0[1] + 0.001)} ${P(m0[0])},${P(m0[1])} Z`} fill="#3a1a14" stroke={INK} strokeWidth={0.006} />
    : ex === "worried" ? <path d={`M${P(m0[0])},${P(m0[1] + 0.004)} Q${P((m0[0] + m1[0]) / 2)},${P(m0[1] - 0.006)} ${P(m1[0])},${P(m1[1] + 0.004)}`} stroke={INK} strokeWidth={0.008} fill="none" strokeLinecap="round" />
    : <path d={`M${P(m0[0])},${P(m0[1])} Q${P((m0[0] + m1[0]) / 2)},${P(m0[1] + 0.004)} ${P(m1[0])},${P(m1[1] - 0.002)}`} stroke={INK} strokeWidth={0.008} fill="none" strokeLinecap="round" />;
  // hair: straight, black, a fringe cut straight across the forehead, the back cut at the nape; the ends sway
  const hs = hairSway;
  const hair = spline([S(0.098, -0.048), S(0.1, -0.085), S(0.06, -0.128), S(0.0, -0.145), S(-0.07, -0.13), S(-0.115, -0.07), S(-0.122, 0.0),
    S(-0.122 + hs * 0.5, 0.06), S(-0.112 + hs, 0.095), S(-0.075 + hs * 0.8, 0.1), S(-0.05, 0.06), S(-0.045 + 0.01 * tn, 0.0), S(-0.03 + 0.012 * tn, -0.04),
    S(0.0 + 0.01 * tn, -0.052), S(0.05, -0.05)]);
  const ear = S(-0.03 + 0.012 * tn, 0.012);
  return (
    <g transform={`rotate(${P(pose.tilt ?? 0)},${P(hx)},${P(hy + HEAD_RY)})`}>
      <Two fill={L.skin} ow={0.016} d={[spline(head), nose]} />
      {/* soft shading under the cheekbone and along the jaw, a warm cheek */}
      <path d={spline([S(-0.02, 0.05), S(0.04, 0.06), S(0.08, 0.11), S(0.03, 0.12), S(-0.03, 0.1)])} fill="rgba(60,20,10,0.12)" />
      <ellipse cx={hx + 0.06 + fx * 0.6} cy={hy + 0.035} rx={0.022} ry={0.012} fill="rgba(180,60,40,0.16)" />
      {/* ear with a small wooden ear spool */}
      <path d={`M${P(ear[0] + 0.012)},${P(ear[1] - 0.026)} Q${P(ear[0] - 0.022)},${P(ear[1] - 0.03)} ${P(ear[0] - 0.02)},${P(ear[1] + 0.006)} Q${P(ear[0] - 0.016)},${P(ear[1] + 0.032)} ${P(ear[0] + 0.01)},${P(ear[1] + 0.03)}`} fill={L.skin} stroke={INK} strokeWidth={0.01} />
      <circle cx={ear[0] - 0.004} cy={ear[1] + 0.022} r={0.009} fill="#8a6234" stroke={INK} strokeWidth={0.005} />
      <Two fill={L.hair} ow={0.014} d={hair} />
      {/* the fringe's cut edge, a few strands, a cold sheen on the crown */}
      <path d={`M${P(hx + 0.0)},${P(hy - 0.052)} L${P(hx + 0.02)},${P(hy - 0.044)} L${P(hx + 0.04)},${P(hy - 0.05)} L${P(hx + 0.06)},${P(hy - 0.043)} L${P(hx + 0.08)},${P(hy - 0.049)} L${P(hx + 0.098)},${P(hy - 0.045)}`} stroke={L.hair} strokeWidth={0.012} fill="none" strokeLinejoin="round" />
      <path d={spline([S(-0.07, -0.11), S(-0.02, -0.132), S(0.04, -0.125)], false)} stroke="rgba(190,210,255,0.28)" strokeWidth={0.012} fill="none" strokeLinecap="round" />
      {[[-0.1, -0.03], [-0.085, 0.0], [-0.07, 0.03]].map(([x, y], i) => <path key={i} d={`M${P(hx + x)},${P(hy + y - 0.04)} Q${P(hx + x - 0.006 + hs * 0.3)},${P(hy + y + 0.02)} ${P(hx + x - 0.004 + hs * 0.7)},${P(hy + y + 0.06)}`} stroke="rgba(150,160,200,0.18)" strokeWidth={0.006} fill="none" />)}
      {eye(farEye, 0.014 * (1 - 0.25 * tn), 0.02, true)}
      {eye(nearEye, 0.019 * (1 - 0.15 * tn), 0.021, false)}
      {brow(farEye, 0.016, -1)}
      {brow(nearEye, 0.022, 1)}
      {/* nostril, the line from the nose to the mouth corner, the mouth */}
      <path d={`M${P(hx + 0.112)},${P(hy + 0.044)} q0.006,-0.006 0.012,-0.002`} stroke={INK} strokeWidth={0.006} fill="none" />
      <path d={`M${P(hx + 0.085)},${P(hy + 0.045)} Q${P(hx + 0.07)},${P(hy + 0.062)} ${P(m0[0] - 0.004)},${P(m0[1] - 0.002)}`} stroke={INK} strokeWidth={0.005} fill="none" opacity={0.4} />
      {mouth}
    </g>
  );
};

/** the folded fishing net slung over the near shoulder: a soft lumpy bundle down the back with a diamond mesh, its
 *  rope edge and a few wooden floats; it sways a little behind the walk */
const NetBundle: React.FC<{ id: string; sh: V; L: FLook; sw: number }> = ({ id, sh, L, sw }) => {
  const S = (x: number, y: number): V => [sh[0] + x, sh[1] + y];
  const body = spline([S(0.03, -0.035), S(-0.06, -0.045), S(-0.13, 0.0), S(-0.15 + sw * 0.4, 0.12), S(-0.165 + sw * 0.8, 0.27), S(-0.14 + sw, 0.39), S(-0.095 + sw, 0.385),
    S(-0.07 + sw * 0.6, 0.28), S(-0.05 + sw * 0.3, 0.15), S(0.0, 0.05), S(0.06, 0.03), S(0.07, -0.005)]);
  const mesh: string[] = [];
  for (let k = -12; k <= 12; k++) {
    const x0 = sh[0] - 0.25 + k * 0.03;
    mesh.push(`M${P(x0)},${P(sh[1] - 0.06)} L${P(x0 + 0.48)},${P(sh[1] + 0.42)}`, `M${P(x0 + 0.48)},${P(sh[1] - 0.06)} L${P(x0)},${P(sh[1] + 0.42)}`);
  }
  return <g>
    <defs><clipPath id={`net-${id}`}><path d={body} /></clipPath></defs>
    <Two fill={L.net} ow={0.016} d={body} />
    <g clipPath={`url(#net-${id})`}>
      <path d={mesh.join(" ")} stroke={L.netDark} strokeWidth={0.006} fill="none" opacity={0.9} />
      {/* folds in the bundle */}
      <path d={spline([S(-0.04, 0.0), S(-0.1, 0.12), S(-0.12 + sw * 0.6, 0.3)], false)} stroke={INK} strokeWidth={0.01} fill="none" opacity={0.5} />
      <path d={spline([S(-0.1, -0.02), S(-0.155, 0.1), S(-0.16 + sw * 0.8, 0.24)], false)} stroke={INK} strokeWidth={0.008} fill="none" opacity={0.4} />
    </g>
    {/* rope edge with wooden floats */}
    <path d={spline([S(0.05, 0.0), S(-0.02, 0.1), S(-0.08 + sw * 0.5, 0.24), S(-0.13 + sw, 0.36)], false)} stroke="#c9b48a" strokeWidth={0.008} fill="none" opacity={0.85} />
    {[[-0.035, 0.13], [-0.09, 0.26], [-0.135, 0.355]].map(([x, y], i) => <ellipse key={i} cx={sh[0] + x + sw * (0.3 + 0.25 * i)} cy={sh[1] + y} rx={0.018} ry={0.026}
      transform={`rotate(-30,${P(sh[0] + x + sw * (0.3 + 0.25 * i))},${P(sh[1] + y)})`} fill={L.float} stroke={INK} strokeWidth={0.008} />)}
  </g>;
};

export const Fisherman: React.FC<{ id?: string; x: number; y: number; ppm: number; look?: FLook; pose: FPose; flip?: boolean }> =
  ({ id = "f", x, y, ppm, look: L = FISHER, pose, flip = false }) => {
    const w = clamp01(pose.walk ?? 0), dist = pose.dist ?? 0, t = pose.t ?? 0, C = L.stride;
    const near = footAt(C, L.lift, dist, 0, w, 0.06), far = footAt(C, L.lift, dist, 0.5, w, -0.07);
    // two bobs per stride: lowest just after each heel strike, highest at mid-stance
    const cyc = dist / C, mid = Math.cos(4 * Math.PI * (cyc - 0.5 * STANCE * 0.5));
    const br = pose.breath ?? 1;
    const breath = (1 - w) * Math.sin(t * 1.55) * br;   // ~4 s breath cycle when standing
    const sway = (1 - w) * (0.008 * Math.sin(t * 0.55) + 0.003 * Math.sin(t * 1.3 + 0.4));   // slow weight shift
    const knl = clamp01(pose.kneel ?? 0);
    const hipY = mix(-(HIP - 0.035 * w + 0.016 * w * mid) + (1 - w) * 0.002 * breath, KNEEL_HIP[1] + 0.002 * breath, knl);
    const hipX = mix(sway, KNEEL_HIP[0], knl);
    const lean = 4.5 * w + (1 - w) * (0.5 * Math.sin(t * 0.55) + 0.8) + (pose.slump ?? 0);
    // arms follow the legs a touch late (follow-through)
    const armPh = Math.cos(2 * Math.PI * (near.loc - 0.07));
    const turn = 0.016 * w * -armPh;   // shoulders counter-rotate against the hips
    const swing = 17 * w;
    const nearA: [number, number] = pose.armNear ?? [mix(3, 5, w) - swing * armPh + breath * 0.5, mix(12, 14, w) + 20 * w * Math.max(0, -armPh)];
    const farA: [number, number] = pose.armFar ?? [mix(2, 5, w) + swing * armPh + breath * 0.5, mix(11, 14, w) + 20 * w * Math.max(0, armPh)];
    const lr = rad(lean), cl = Math.cos(lr), sl = Math.sin(lr);
    const up = (h: number, dx = 0): V => [hipX + dx * cl + sl * h, hipY - cl * h + dx * sl];
    const top = SHOULDER - HIP;
    const sh = up(top + 0.006 * breath);
    const shN: V = [sh[0] + 0.012 + turn, sh[1] + 0.03], shF: V = [sh[0] - 0.03 - turn, sh[1] + 0.035];
    const nk = up(NECK - HIP + 0.006 * breath);
    // the head rides steadier than the hips (the neck absorbs part of the bob) and leads the lean a little
    const hx = nk[0] + 0.035 + 0.012 * w, hy = nk[1] - HEAD_RY + 0.03 + 0.008 * w * mid;
    const nA = armPts(shN[0], shN[1], nearA[0], nearA[1]);
    const fA = armPts(shF[0], shF[1], farA[0], farA[1]);
    const hipN: V = [hipX + 0.02 + 0.012 * w * -armPh, hipY], hipF: V = [hipX - 0.03 - 0.012 * w * -armPh, hipY - 0.01];
    const stp = clamp01(knl / 0.6);
    const fN = knl > 0 ? footPose(mix(near.rel, KNEEL_FRONT, smooth(stp)), mix(near.lift, 0.075 * Math.sin(Math.PI * stp), knl > 0.001 ? 1 : 0), near.pitch * (1 - knl))
      : footPose(near.rel, near.lift, near.pitch);
    const fF = knl > 0 ? footPose(mix(far.rel, KNEEL_BACK, knl), far.lift * (1 - knl), mix(far.pitch, KNEEL_TOE, smooth(knl))) : footPose(far.rel, far.lift, far.pitch);
    const hd = 0.34 * knl;   // the cloak hem drops with the hips when he kneels (it drapes on the ground behind him)
    // cloth lag: the cloak and the loincloth flap drag behind the walk and swing with the legs; idle drift when standing
    const drag = -0.05 * w, ph = Math.sin(2 * Math.PI * (near.loc - 0.2));
    const cloakSw = drag + 0.02 * w * ph + (1 - w) * 0.006 * Math.sin(t * 0.9);
    const flapSw = -0.035 * w + 0.03 * w * Math.sin(2 * Math.PI * (near.loc - 0.15)) + (1 - w) * 0.004 * Math.sin(t * 1.1);
    const netSw = -0.025 * w + 0.012 * w * Math.sin(2 * Math.PI * (near.loc * 2 - 0.3)) + (1 - w) * 0.004 * Math.sin(t * 0.8);
    const hairSway = -0.012 * w + 0.006 * w * Math.sin(2 * Math.PI * (near.loc * 2 - 0.25)) + (1 - w) * 0.002 * Math.sin(t * 0.7);
    // torso in its own frame (origin at the hips, up is -y), rotated by the lean
    const torso = spline([[-0.1, -top + 0.02], [-0.02, -top - 0.012], [0.07, -top - 0.004], [0.12, -top + 0.06], [0.135, -0.36], [0.122, -0.24],
      [0.118, -0.12], [0.11, 0.0], [0.04, 0.06], [-0.06, 0.05], [-0.115, 0.0], [-0.1, -0.14], [-0.115, -0.3], [-0.125, -0.42]]);
    const pec = `M0.03,${P(-top + 0.13)} Q0.1,${P(-top + 0.16)} 0.128,${P(-top + 0.12)}`;
    const abs_ = `M0.1,-0.2 Q0.09,-0.13 0.1,-0.06`;
    // maxtlatl: the wrap round the hips (between the legs) and the front flap hanging to above the knee
    const wrap = spline([[-0.122, -0.06], [0.0, -0.075], [0.118, -0.06], [0.122, 0.02], [0.1, 0.1], [0.05, 0.13], [-0.03, 0.11], [-0.1, 0.07], [-0.13, 0.0]]);
    const tie = `M-0.124,-0.04 Q0.0,-0.052 0.12,-0.038`;
    // flap in world space (hangs straight down from the front of the waist, it does not lean with the torso)
    const fw = up(-0.02, 0.1), fl = 1 - 0.5 * knl, fk = 0.16 * knl;   // kneeling: the flap lies forward over the front thigh
    const flap = spline([[fw[0] - 0.045, fw[1]], [fw[0] + 0.035, fw[1]], [fw[0] + 0.045 + flapSw * 0.5 + fk * 0.6, fw[1] + 0.2 * fl], [fw[0] + 0.05 + flapSw + fk, fw[1] + 0.36 * fl],
      [fw[0] + 0.0 + flapSw + fk, fw[1] + 0.375 * fl], [fw[0] - 0.04 + flapSw + fk * 0.8, fw[1] + 0.355 * fl], [fw[0] - 0.035 + flapSw * 0.5 + fk * 0.4, fw[1] + 0.2 * fl]]);
    // tilmatli: from the knot on the near shoulder over the back, hanging to the back of the knees
    const kn = up(top - 0.015, 0.05), nape = up(top - 0.005, -0.1), bk1 = up(top - 0.25, -0.135), bk2 = up(0.05, -0.135);
    const hemB: V = [bk2[0] - 0.05 + cloakSw * 1.3 - 0.12 * knl, -0.46 + hd], hemF: V = [hipX + 0.01 + cloakSw - 0.1 * knl, -0.45 + hd];
    const cloak = spline([kn, [nape[0] + 0.02, nape[1] - 0.025], [nape[0] - 0.03, nape[1] + 0.03], bk1, [bk2[0] - 0.02 + cloakSw * 0.4, bk2[1]], hemB,
      [(hemB[0] + hemF[0]) / 2, -0.44 + hd + 0.01 * ph * w], hemF, [hipX + 0.0 + cloakSw * 0.3, hipY + 0.05], up(0.12, -0.07), up(top - 0.14, -0.02)]);
    const cloakFold = spline([up(top - 0.06, -0.05), up(0.3, -0.11), [bk2[0] - 0.03 + cloakSw * 0.8 - 0.1 * knl, -0.48 + hd]], false);
    const cloakFold2 = spline([up(top - 0.12, 0.0), up(0.15, -0.08), [hipX - 0.03 + cloakSw - 0.08 * knl, -0.46 + hd]], false);
    return (
      <g transform={`translate(${P(x)},${P(y)}) scale(${P((flip ? -1 : 1) * ppm)},${P(ppm)})`}>
        <Arm a={fA} L={L} far />
        <Leg hip={hipF} f={fF} L={L} far />
        <Leg hip={hipN} f={fN} L={L} />
        <g transform={`translate(${P(hipX)},${P(hipY)}) rotate(${P(lean)}) scale(1,${P(1 + 0.006 * breath)})`}>
          <Two fill={L.skin} d={torso} />
          <path d={pec} stroke={L.skinDark} strokeWidth={0.01} fill="none" strokeLinecap="round" />
          <path d={abs_} stroke={L.skinDark} strokeWidth={0.008} fill="none" opacity={0.6} strokeLinecap="round" />
          <Two fill={L.cloth} ow={0.016} d={wrap} />
          <path d={tie} stroke={L.clothDark} strokeWidth={0.014} fill="none" />
          <path d="M-0.02,-0.03 Q0.02,0.05 0.06,0.1 M-0.08,-0.02 Q-0.06,0.04 -0.04,0.09" stroke={L.clothDark} strokeWidth={0.008} fill="none" opacity={0.8} />
        </g>
        <Two fill={L.cloth} ow={0.016} d={flap} />
        <path d={`M${P(fw[0] - 0.03 + flapSw * 0.6 + fk * 0.8)},${P(fw[1] + 0.33 * fl)} L${P(fw[0] + 0.035 + flapSw + fk)},${P(fw[1] + 0.335 * fl)}`} stroke={L.clothDark} strokeWidth={0.008} opacity={0.8} />
        <Two fill={L.cloak} ow={0.018} d={cloak} />
        <path d={cloakFold} stroke={L.cloakDark} strokeWidth={0.012} fill="none" strokeLinecap="round" />
        <path d={cloakFold2} stroke={L.cloakDark} strokeWidth={0.009} fill="none" strokeLinecap="round" opacity={0.7} />
        <NetBundle id={id} sh={up(top - 0.02, -0.02)} L={L} sw={netSw} />
        {/* neck */}
        <Two fill={L.skin} ow={0.016} d={seg(up(top - 0.03, 0.02), [hx - 0.01, hy + 0.08], () => 0.045, () => 0.042)} />
        <Head hx={hx} hy={hy} L={L} pose={{ ...pose, tilt: (pose.tilt ?? 0) + lean * 0.35 }} hairSway={hairSway} />
        <Arm a={nA} L={L} />
        {/* the cloak over the top of the near shoulder and its knot (hides where the arm meets the body) */}
        <Two fill={L.cloak} ow={0.014} d={spline([[kn[0] - 0.12, kn[1] + 0.01], [kn[0] - 0.06, kn[1] - 0.03], [kn[0] + 0.0, kn[1] - 0.025], [kn[0] + 0.02, kn[1] + 0.01],
          [kn[0] - 0.03, kn[1] + 0.035], [kn[0] - 0.1, kn[1] + 0.045]])} />
        <path d={`M${P(kn[0] - 0.1)},${P(kn[1] + 0.02)} Q${P(kn[0] - 0.05)},${P(kn[1] - 0.005)} ${P(kn[0] - 0.005)},${P(kn[1] + 0.005)}`} stroke={L.cloakDark} strokeWidth={0.008} fill="none" />
        <Two fill={L.cloakDark} ow={0.012} d={spline([[kn[0] - 0.012, kn[1] - 0.012], [kn[0] + 0.016, kn[1] - 0.008], [kn[0] + 0.02, kn[1] + 0.016], [kn[0] - 0.008, kn[1] + 0.02]])} />
        <Two fill={L.cloak} ow={0.01} d={spline([[kn[0] + 0.005, kn[1] + 0.015], [kn[0] + 0.03 + cloakSw * 0.2, kn[1] + 0.06], [kn[0] + 0.018 + cloakSw * 0.3, kn[1] + 0.075], [kn[0] - 0.004, kn[1] + 0.03]])} />
      </g>
    );
  };
