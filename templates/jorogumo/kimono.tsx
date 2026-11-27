// Kimono cast for "Jorogumo: The Spider Woman", built on the approved Toon rig (templates/tsavo3d/toon.tsx):
// the same distance-driven planted-foot walk, soft volume arms that bend smoothly (no hinges, no joint circles),
// a leaning/bobbing torso, and arms that hang and only breathe when standing. New for this story:
//  - samurai: kimono top with a crossed collar, wide hakama trousers, tabi socks on straw sandals, a katana in the obi,
//    hanging kimono sleeves, a shaved crown with a topknot;
//  - lady: a long kimono to the ankles that sways with tiny steps, a wide obi with a bow at the back, deep hanging
//    sleeves, long straight black hair down her back (it sways), a pale face with red lips, and a faint web pattern
//    in the cloth (a hint for the reveal). Her eyes can turn fully black ("void") for the scares.
// Units are metres, feet on y = 0, the figure faces +x (flip mirrors it).
import React from "react";

export const INK = "#1d1820";
const rad = (d: number) => (d * Math.PI) / 180;
const P = (n: number) => n.toFixed(4);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export type KLook = {
  kind: "samurai" | "lady";
  skin: string; top: string; topDark: string; legs: string; legsDark: string; hair: string;
  sock: string; sole: string; obi: string; obiDark: string; collar: string;
  /** stride (same foot to same foot, metres) and how high the feet lift (1 = Toon walk) */
  stride: number; lift: number;
  /** how deep the kimono sleeve hangs below the arm (metres) */
  sleeve: number;
  lips?: string; pin?: string; pattern?: string; flower?: string;
};
export type KPose = {
  dist?: number; walk?: number; t?: number;
  armNear?: [number, number]; armFar?: [number, number];
  expr?: "neutral" | "stern" | "worried" | "scared" | "eerie";
  lookX?: number; blink?: boolean; tilt?: number; voidEyes?: boolean;
};

const HIP = 0.625, THIGH = 0.29, SHIN = 0.28, ANKLE = 0.07;
const SHOULDER = 0.94, NECK = 0.99, HEAD_R = 0.25;
const UPPER = 0.2, FORE = 0.18;
const STANCE = 0.6;

const ik = (rx: number, ry: number, tx: number, ty: number, l1: number, l2: number, bend: number) => {
  const dx = tx - rx, dy = ty - ry, d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, Math.hypot(dx, dy)));
  const a = Math.atan2(dy, dx), off = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = a - bend * off;
  return { jx: rx + Math.cos(ang) * l1, jy: ry + Math.sin(ang) * l1, tx: rx + Math.cos(a) * d, ty: ry + Math.sin(a) * d };
};

type V = [number, number];
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

const Two: React.FC<{ d: string | string[]; fill: string; ow?: number }> = ({ d, fill, ow = 0.026 }) => {
  const ds = Array.isArray(d) ? d : [d];
  return <g>
    {ds.map((x, i) => <path key={"o" + i} d={x} fill={INK} stroke={INK} strokeWidth={ow} strokeLinejoin="round" />)}
    {ds.map((x, i) => <path key={"f" + i} d={x} fill={fill} />)}
  </g>;
};

/** one foot relative to the hips after `dist` metres; planted feet move back exactly as fast as the body moves on */
const footAt = (C: number, liftK: number, dist: number, o: number, w: number, idleRel: number) => {
  const cyc = dist / C + o, loc = cyc - Math.floor(cyc);
  let rel: number, lift = 0, pitch = 0;
  const pk = Math.min(1, C / 0.9);
  if (loc < STANCE) {
    rel = 0.5 * STANCE * C - loc * C;
    pitch = loc < 0.1 ? mix(-14, 0, smooth(loc / 0.1)) : loc > 0.4 ? mix(0, 30, smooth((loc - 0.4) / (STANCE - 0.4))) : 0;
  } else {
    const k = (loc - STANCE) / (1 - STANCE), e = smooth(k);
    rel = -0.5 * STANCE * C + STANCE * C * e;
    lift = 0.09 * liftK * Math.sin(Math.PI * Math.min(1, k * 1.15));
    pitch = mix(30, -14, smooth(k * 1.1));
  }
  return { rel: mix(idleRel, rel, w), lift: lift * w, pitch: pitch * w * pk, loc };
};

/** tabi sock (ankle at 0,0) on a straw sandal; the sole is at y = ANKLE */
const SOCK = `M-0.045,-0.05 L0.03,-0.05 L0.045,-0.005 Q0.14,-0.005 0.15,0.04 L0.148,0.056 L-0.05,0.056 Q-0.062,0.015 -0.045,-0.05 Z`;
const HEEL: V = [-0.055, ANKLE], BALL: V = [0.1, ANKLE];
const footPose = (rel: number, lift: number, pitch: number) => {
  const piv = pitch >= 0 ? BALL : HEEL, a = rad(pitch), c = Math.cos(a), s = Math.sin(a);
  const pw: V = [rel + piv[0], -lift];
  const vx = -piv[0], vy = -piv[1];
  return { ax: pw[0] + vx * c - vy * s, ay: pw[1] + vx * s + vy * c, deg: pitch };
};
const Foot: React.FC<{ f: ReturnType<typeof footPose>; L: KLook; far?: boolean }> = ({ f, L, far }) =>
  <g transform={`translate(${P(f.ax)},${P(f.ay)}) rotate(${P(f.deg)})`}>
    <Two fill={L.sole} ow={0.016} d="M-0.065,0.054 L0.165,0.054 Q0.172,0.062 0.165,0.07 L-0.065,0.07 Q-0.072,0.062 -0.065,0.054 Z" />
    <Two fill={far ? "#b8b2a6" : L.sock} ow={0.02} d={SOCK} />
    <path d="M0.035,0.0 Q0.07,0.03 0.08,0.055" stroke="#5a1e1a" strokeWidth={0.014} fill="none" />
  </g>;

const Head: React.FC<{ hx: number; hy: number; L: KLook; pose: KPose }> = ({ hx, hy, L, pose }) => {
  const lady = L.kind === "lady";
  const lx = (pose.lookX ?? 0.4) * 0.03, ex = pose.expr ?? "neutral";
  const browT = ex === "stern" ? 0.035 : ex === "worried" || ex === "scared" ? -0.03 : 0;
  const eyeR = ex === "scared" ? 0.045 : 0.036;
  const R = HEAD_R, S = (x: number, y: number) => `${P(hx + x)},${P(hy + y)}`;
  return (
    <g transform={`rotate(${P(pose.tilt ?? 0)},${P(hx)},${P(hy + R)})`}>
      {!lady && <circle cx={hx - R * 0.95} cy={hy + 0.03} r={0.055} fill={L.skin} stroke={INK} strokeWidth={0.02} />}
      <circle cx={hx} cy={hy} r={R} fill={L.skin} stroke={INK} strokeWidth={0.024} />
      <ellipse cx={hx - 0.06} cy={hy + 0.12} rx={0.12} ry={0.06} fill="rgba(0,0,0,0.07)" />
      {!lady && <g>
        {/* shaved crown (a cool tint), side and back hair, and the folded topknot lying forward on the crown */}
        <path d={`M${S(-0.17, -0.18)} Q${S(0.02, -0.29)} ${S(0.17, -0.17)} Q${S(0.02, -0.215)} ${S(-0.17, -0.18)} Z`} fill="rgba(90,110,130,0.25)" />
        <path d={`M${S(-R + 0.005, 0.04)} Q${S(-R - 0.012, -0.15)} ${S(-0.15, -0.195)} Q${S(-0.12, -0.1)} ${S(-0.135, 0.02)} Q${S(-0.15, 0.1)} ${S(-0.2, 0.15)} Q${S(-R + 0.02, 0.12)} ${S(-R + 0.005, 0.04)} Z`} fill={L.hair} stroke={INK} strokeWidth={0.018} />
        <path d={`M${S(-0.15, -0.205)} Q${S(-0.06, -0.3)} ${S(0.08, -0.285)} L${S(0.1, -0.255)} Q${S(-0.04, -0.255)} ${S(-0.12, -0.18)} Z`} fill={L.hair} stroke={INK} strokeWidth={0.016} strokeLinejoin="round" />
        <path d={`M${S(-0.1, -0.24)} L${S(-0.08, -0.205)}`} stroke="#e8e0cc" strokeWidth={0.02} />
      </g>}
      {lady && <g>
        {/* hair cap with straight-cut bangs and a straight sidelock in front of the ear */}
        <path d={`M${S(-R - 0.01, 0.14)} Q${S(-R - 0.03, -R - 0.02)} ${S(0.02, -R - 0.02)} Q${S(R + 0.01, -R + 0.03)} ${S(R - 0.01, -0.07)} L${S(0.05, -0.07)} L${S(0.03, -0.17)} Q${S(-0.03, -0.12)} ${S(-0.06, -0.05)} L${S(-0.05, 0.2)} L${S(-0.13, 0.2)} Q${S(-0.2, 0.18)} ${S(-R - 0.01, 0.14)} Z`} fill={L.hair} stroke={INK} strokeWidth={0.018} strokeLinejoin="round" />
        <path d={`M${S(-0.12, -0.2)} Q${S(-0.02, -0.24)} ${S(0.1, -0.2)}`} stroke="rgba(255,255,255,0.18)" strokeWidth={0.02} fill="none" strokeLinecap="round" />
        {L.pin && <g><path d={`M${S(-0.2, -0.16)} L${S(-0.33, -0.3)}`} stroke="#c9a24a" strokeWidth={0.014} strokeLinecap="round" />
          <circle cx={hx - 0.34} cy={hy - 0.31} r={0.028} fill={L.pin} stroke={INK} strokeWidth={0.01} /></g>}
      </g>}
      {[0.03, 0.15].map((ox, i) => <g key={i}>
        {pose.voidEyes ? <ellipse cx={hx + ox} cy={hy - 0.02} rx={0.042} ry={0.048} fill="#050304" stroke={INK} strokeWidth={0.012} />
          : pose.blink ? <path d={`M${P(hx + ox - eyeR)},${P(hy - 0.02)} q${P(eyeR)},0.02 ${P(eyeR * 2)},0`} stroke={INK} strokeWidth={0.016} fill="none" />
          : lady ? <>
            <path d={`M${P(hx + ox - 0.04)},${P(hy - 0.015)} Q${P(hx + ox)},${P(hy - 0.055)} ${P(hx + ox + 0.042)},${P(hy - 0.025)} Q${P(hx + ox)},${P(hy + 0.008)} ${P(hx + ox - 0.04)},${P(hy - 0.015)} Z`} fill="#fffaf2" stroke={INK} strokeWidth={0.01} />
            <circle cx={hx + ox + lx * 0.6} cy={hy - 0.022} r={0.016} fill={INK} />
            <path d={`M${P(hx + ox - 0.045)},${P(hy - 0.02)} Q${P(hx + ox)},${P(hy - 0.065)} ${P(hx + ox + 0.05)},${P(hy - 0.03)}`} stroke={INK} strokeWidth={0.016} fill="none" strokeLinecap="round" />
          </> : <>
            <ellipse cx={hx + ox} cy={hy - 0.02} rx={eyeR} ry={eyeR * 1.2} fill="#fffaf2" stroke={INK} strokeWidth={0.012} />
            <circle cx={hx + ox + lx} cy={hy - 0.015} r={ex === "scared" ? 0.014 : 0.019} fill={INK} />
          </>}
        {lady ? <path d={`M${P(hx + ox - 0.03)},${P(hy - 0.1)} q0.03,-0.012 0.06,0`} stroke={INK} strokeWidth={0.012} fill="none" strokeLinecap="round" />
          : <path d={`M${P(hx + ox - 0.05)},${P(hy - 0.09 + (i === 0 ? -browT : browT) * 0.6)} L${P(hx + ox + 0.05)},${P(hy - 0.09 + (i === 0 ? browT : -browT) * 0.6)}`} stroke={INK} strokeWidth={0.032} strokeLinecap="round" />}
      </g>)}
      <path d={`M${P(hx + 0.1)},${P(hy + 0.0)} q0.035,0.05 -0.005,0.06`} stroke={INK} strokeWidth={0.014} fill="none" strokeLinecap="round" />
      {lady ? <>
        <ellipse cx={hx + 0.15} cy={hy + 0.05} rx={0.035} ry={0.018} fill="rgba(200,60,80,0.18)" />
        <path d={ex === "eerie" ? `M${S(0.055, 0.125)} Q${S(0.09, 0.15)} ${S(0.135, 0.118)} Q${S(0.09, 0.135)} ${S(0.055, 0.125)} Z` : `M${S(0.065, 0.13)} Q${S(0.09, 0.145)} ${S(0.12, 0.128)} Q${S(0.09, 0.12)} ${S(0.065, 0.13)} Z`}
          fill={L.lips} stroke={L.lips} strokeWidth={0.008} />
      </> : <path d={ex === "scared" || ex === "worried" ? `M${S(0.05, 0.14)} q0.04,-0.03 0.08,0` : `M${S(0.055, 0.13)} L${S(0.125, 0.128)}`}
        stroke={INK} strokeWidth={0.016} fill="none" strokeLinecap="round" />}
    </g>
  );
};

/** her long hair, drawn behind the body: hangs from the crown to the waist and lags behind the movement */
const BackHair: React.FC<{ hx: number; hy: number; L: KLook; sway: number }> = ({ hx, hy, L, sway }) => {
  const S = (x: number, y: number) => `${P(hx + x)},${P(hy + y)}`;
  return <g>
    <Two fill={L.hair} ow={0.02} d={`M${S(0.0, -HEAD_R)} Q${S(-HEAD_R - 0.08, -0.2)} ${S(-HEAD_R - 0.06, 0.2)} Q${S(-0.34 + sway, 0.55)} ${S(-0.3 + sway * 1.6, 0.8)} L${S(-0.12 + sway * 1.6, 0.82)} Q${S(-0.1 + sway, 0.5)} ${S(-0.05, 0.2)} Z`} />
    <path d={`M${S(-0.2, 0.1)} Q${S(-0.26 + sway, 0.5)} ${S(-0.22 + sway * 1.5, 0.78)}`} stroke="rgba(255,255,255,0.1)" strokeWidth={0.014} fill="none" />
  </g>;
};

const armPts = (sx: number, sy: number, th: number, e: number) => {
  const a1 = rad(th), ex = sx + Math.sin(a1) * UPPER, ey = sy + Math.cos(a1) * UPPER;
  const a2 = rad(th + Math.max(0, e)), wx = ex + Math.sin(a2) * FORE, wy = ey + Math.cos(a2) * FORE;
  return { s: [sx, sy] as V, e: [ex, ey] as V, w: [wx, wy] as V, dir: th + Math.max(0, e) };
};

/** arm with a hanging kimono sleeve: the sleeve bag hangs straight down under the forearm and lags a little */
const Arm: React.FC<{ a: ReturnType<typeof armPts>; L: KLook; far?: boolean; lag: number }> = ({ a, L, far, lag }) => {
  const cloth = far ? L.topDark : L.top;
  const d = rad(a.dir), ux = Math.sin(d), uy = Math.cos(d), nx = uy, ny = -ux;
  const hx = a.w[0] + ux * 0.05, hy = a.w[1] + uy * 0.05, deg = (Math.atan2(uy, ux) * 180) / Math.PI;
  const cuff: V = [a.w[0] - ux * 0.02, a.w[1] - uy * 0.02];
  const low = Math.max(a.e[1], cuff[1]) + L.sleeve * 0.55, bx = Math.min(a.e[0], cuff[0]) - 0.05 + lag;
  const bag = `M${P(a.e[0] - 0.02)},${P(a.e[1] - 0.06)} L${P(cuff[0])},${P(cuff[1])} Q${P(cuff[0] + lag * 0.5)},${P(low)} ${P((cuff[0] + bx) / 2)},${P(low + 0.02)} Q${P(bx - 0.02)},${P(low)} ${P(bx)},${P(a.e[1])} Z`;
  return (
    <g>
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(${P(deg)})`}>
        <Two fill={L.skin} ow={0.022} d={[
          `M-0.03,-0.038 Q0.05,-0.05 0.058,0.0 Q0.05,0.048 -0.03,0.04 Q-0.05,0.0 -0.03,-0.038 Z`,
          `M-0.025,-0.025 Q0.0,-0.075 0.035,-0.062 Q0.05,-0.045 0.02,-0.022 Z`,
        ]} />
      </g>
      <Two fill={cloth} d={[bag, tube(a.s, a.e, cuff, 0.055, 0.05, 0.05)]} />
      {L.flower && !far && <g opacity={0.9}>{[0, 1].map((k) => { const cx = (cuff[0] + bx) / 2 + 0.01 - k * 0.05, cy = low - 0.04 - k * 0.07;
        return <g key={k}>{[0, 60, 120, 180, 240, 300].map((r) => <path key={r} d={`M${P(cx)},${P(cy)} q${P(0.02 * Math.cos(rad(r)))},${P(0.02 * Math.sin(rad(r)) - 0.012)} ${P(0.035 * Math.cos(rad(r)))},${P(0.035 * Math.sin(rad(r)))}`} stroke={L.flower} strokeWidth={0.008} fill="none" />)}</g>; })}</g>}
      <path d={`M${P(cuff[0] + nx * 0.05)},${P(cuff[1] + ny * 0.05)} L${P(cuff[0] - nx * 0.05)},${P(cuff[1] - ny * 0.05)}`} stroke={far ? INK : L.topDark} strokeWidth={0.014} strokeLinecap="round" />
    </g>
  );
};

/** samurai: a wide hakama leg (pleated tube that flares at the hem) over the sock and sandal */
const HakamaLeg: React.FC<{ hip: V; f: ReturnType<typeof footPose>; L: KLook; far?: boolean }> = ({ hip, f, L, far }) => {
  const k = ik(hip[0], hip[1], f.ax, f.ay, THIGH, SHIN, 1);
  const col = far ? L.legsDark : L.legs;
  const end: V = [k.tx, k.ty - 0.035];
  return <g>
    <Foot f={f} L={L} far={far} />
    <Two fill={col} d={tube(hip, [k.jx, k.jy], end, 0.095, 0.105, 0.0)} />
    <path d={`M${P(hip[0] + 0.02)},${P(hip[1] + 0.05)} Q${P(k.jx + 0.02)},${P(k.jy)} ${P(end[0] + 0.03)},${P(end[1])}`} stroke={far ? INK : L.legsDark} strokeWidth={0.012} fill="none" opacity={0.7} />
  </g>;
};

export const Kimono: React.FC<{ x: number; y: number; ppm: number; look: KLook; pose: KPose; flip?: boolean; shade?: number }> =
  ({ x, y, ppm, look: L, pose, flip = false, shade = 1 }) => {
    const lady = L.kind === "lady";
    const w = clamp01(pose.walk ?? 0), dist = pose.dist ?? 0, t = pose.t ?? 0, C = L.stride;
    const near = footAt(C, L.lift, dist, 0, w, lady ? 0.03 : 0.07), far = footAt(C, L.lift, dist, 0.5, w, lady ? -0.02 : -0.06);
    const cyc = dist / C, mid = Math.cos(4 * Math.PI * (cyc - 0.5 * STANCE * 0.5));
    const sway = (1 - w) * 0.012 * Math.sin(t * 0.7);
    const bob = lady ? 0.4 : 1;
    const hipY = -(HIP - 0.045 * w * bob + 0.014 * w * mid * bob) + (1 - w) * 0.004 * Math.sin(t * 1.7);
    const hipX = sway;
    const lean = (lady ? 2 : 5) * w + (1 - w) * 0.6 * Math.sin(t * 0.7);
    const breath = (1 - w) * Math.sin(t * 1.7);
    const armPh = Math.cos(2 * Math.PI * near.loc);
    const turn = 0.018 * w * -armPh;
    const swing = (lady ? 6 : 20) * w;
    const nearA: [number, number] = pose.armNear ?? [mix(2, 4, w) - swing * armPh + breath * 0.6, mix(8, 12, w) + 14 * w * Math.max(0, -armPh)];
    const farA: [number, number] = pose.armFar ?? [mix(1, 4, w) + swing * armPh + breath * 0.6, mix(8, 12, w) + 14 * w * Math.max(0, armPh)];
    const lr = rad(lean), cl = Math.cos(lr), sl = Math.sin(lr);
    const up = (h: number, dx = 0): V => [hipX + dx * cl + Math.sin(lr) * h, hipY - Math.cos(lr) * h + dx * sl];
    const sh = up(SHOULDER - HIP + 0.004 * breath);
    const shN: V = [sh[0] + 0.015 + turn, sh[1] + 0.025], shF: V = [sh[0] - 0.035 - turn, sh[1] + 0.03];
    const nk = up(NECK - HIP + 0.004 * breath);
    const hx = nk[0] + 0.02 + 0.01 * w, hy = nk[1] - HEAD_R + 0.05;
    const nA = armPts(shN[0], shN[1], nearA[0], nearA[1]);
    const fA = armPts(shF[0], shF[1], farA[0], farA[1]);
    const hipN: V = [hipX + 0.025, hipY], hipF: V = [hipX - 0.03, hipY - 0.01];
    // sleeves and hair lag behind the movement and breathe a little
    const lag = -0.05 * w + 0.012 * Math.sin(t * 1.3) + 0.03 * w * Math.sin(2 * Math.PI * cyc);
    const top = SHOULDER - HIP;
    const torso = `M-0.13,${P(-top + 0.05)} Q-0.14,${P(-top - 0.02)} -0.02,${P(-top - 0.035)} L0.05,${P(-top - 0.035)} Q0.16,${P(-top - 0.02)} 0.15,${P(-top + 0.06)}
      Q0.17,-0.1 0.16,0.1 Q0.02,0.13 -0.15,0.1 Q-0.16,-0.12 -0.13,${P(-top + 0.05)} Z`;
    const fN = footPose(near.rel, near.lift, near.pitch), fF = footPose(far.rel, far.lift, far.pitch);
    // lady: the long kimono hangs from the waist to just above the feet and follows them, so the hem sways with each step
    const robe = (() => {
      if (!lady) return "";
      const wst = up(0.05), bk = Math.min(fN.ax, fF.ax) - 0.12 + lag * 0.6, fr = Math.max(fN.ax, fF.ax) + 0.16;
      const hemY = -0.045, swayH = 0.01 * Math.sin(t * 1.3 + 1);
      return `M${P(wst[0] - 0.15)},${P(wst[1])} Q${P(wst[0] - 0.19)},${P(wst[1] + 0.3)} ${P(bk - 0.02)},${P(hemY + swayH)} Q${P((bk + fr) / 2)},${P(hemY + 0.015)} ${P(fr)},${P(hemY - swayH)} Q${P(wst[0] + 0.21)},${P(wst[1] + 0.3)} ${P(wst[0] + 0.17)},${P(wst[1])} Z`;
    })();
    const web = (() => {
      if (!lady || !L.pattern) return null;
      const cx = Math.min(fN.ax, fF.ax) + 0.02, cy = -0.2, out: string[] = [];
      for (let k = 0; k < 7; k++) { const a = rad(-170 + k * 25); out.push(`M${P(cx)},${P(cy)} L${P(cx + 0.3 * Math.cos(a))},${P(cy + 0.3 * Math.sin(a))}`); }
      for (let r = 1; r <= 3; r++) { const rr = r * 0.09; let s = ""; for (let k = 0; k < 7; k++) { const a = rad(-170 + k * 25); s += `${k ? "L" : "M"}${P(cx + rr * Math.cos(a))},${P(cy + rr * Math.sin(a))} `; } out.push(s); }
      return <path d={out.join(" ")} stroke={L.pattern} strokeWidth={0.006} fill="none" opacity={0.55} />;
    })();
    return (
      <g transform={`translate(${P(x)},${P(y)}) scale(${P((flip ? -1 : 1) * ppm)},${P(ppm)})`} style={shade !== 1 ? { filter: `brightness(${shade})` } : undefined}>
        <ellipse cx={hipX} cy={0} rx={0.34} ry={0.05} fill="rgba(5,3,8,0.4)" />
        {lady && <BackHair hx={hx} hy={hy} L={L} sway={lag} />}
        <Arm a={fA} L={L} far lag={lag} />
        {lady ? <>
          <Foot f={fF} L={L} far />
          <Foot f={fN} L={L} />
          <Two fill={L.top} d={robe} />
          <path d={robe} fill="none" />
          {web}
          {/* the front overlap of the kimono */}
          <path d={`M${P(up(0.05)[0] + 0.12)},${P(up(0.05)[1])} Q${P(Math.max(fN.ax, fF.ax) + 0.06)},-0.3 ${P(Math.max(fN.ax, fF.ax) + 0.1)},-0.05`} stroke={L.topDark} strokeWidth={0.014} fill="none" />
        </> : <>
          <HakamaLeg hip={hipF} f={fF} L={L} far />
          <HakamaLeg hip={hipN} f={fN} L={L} />
        </>}
        <g transform={`translate(${P(hipX)},${P(hipY)}) rotate(${P(lean)}) scale(1,${P(1 + 0.008 * breath)})`}>
          <Two fill={L.top} d={torso} />
          <path d={`M-0.12,${P(-top + 0.08)} Q-0.145,-0.12 -0.14,0.08`} stroke={L.topDark} strokeWidth={0.035} fill="none" strokeLinecap="round" />
          {/* crossed collar: white under-collar, then the kimono collar band running from the nape down to the front */}
          <path d={`M-0.04,${P(-top - 0.03)} Q0.06,${P(-top + 0.06)} 0.15,${P(-top + 0.2)}`} stroke={L.collar} strokeWidth={0.05} fill="none" />
          <path d={`M-0.06,${P(-top - 0.02)} Q0.05,${P(-top + 0.09)} 0.15,${P(-top + 0.25)}`} stroke={L.topDark} strokeWidth={0.04} fill="none" />
          {lady ? <>
            {/* wide obi with a cord, and the bow at the back */}
            <Two fill={L.obi} ow={0.02} d={`M-0.155,${P(-0.2)} L0.165,${P(-0.2)} L0.17,-0.02 L-0.16,-0.02 Z`} />
            <path d="M-0.16,-0.11 L0.17,-0.11" stroke={L.obiDark} strokeWidth={0.014} />
            <Two fill={L.obi} ow={0.02} d="M-0.15,-0.22 Q-0.32,-0.25 -0.31,-0.12 Q-0.32,0.02 -0.15,0.0 Z" />
            <path d="M-0.17,-0.2 Q-0.28,-0.12 -0.17,-0.03" stroke={L.obiDark} strokeWidth={0.012} fill="none" />
          </> : <>
            {/* hakama waist: the stiff back board, the front, the ties */}
            <Two fill={L.legs} d="M-0.155,-0.09 L0.165,-0.09 Q0.2,0.05 0.19,0.17 L-0.18,0.17 Q-0.19,0.0 -0.155,-0.09 Z" />
            <path d="M-0.16,-0.08 L0.17,-0.08" stroke={L.obi} strokeWidth={0.03} />
            <path d="M0.05,0.0 L0.06,0.16 M0.11,0.0 L0.13,0.16" stroke={L.legsDark} strokeWidth={0.01} />
            <Two fill={L.legsDark} ow={0.016} d="M-0.2,-0.12 L-0.12,-0.12 L-0.12,0.02 L-0.2,0.0 Z" />
            {/* the katana in the obi on the far hip: lacquered scabbard back and down, the wrapped hilt forward */}
            <g transform="translate(0.13,-0.06) rotate(-17)">
              <Two fill="#1a1416" ow={0.016} d="M0,-0.022 L-0.78,-0.02 Q-0.8,0 -0.78,0.02 L0,0.022 Z" />
              <path d="M-0.05,-0.008 L-0.74,-0.006" stroke="rgba(255,255,255,0.22)" strokeWidth={0.008} />
              <ellipse cx={0} cy={0} rx={0.012} ry={0.045} fill="#7a6438" stroke={INK} strokeWidth={0.01} />
              <Two fill="#2a2a3a" ow={0.014} d="M0.012,-0.02 L0.25,-0.018 Q0.265,0 0.25,0.018 L0.012,0.02 Z" />
              {[0.04, 0.09, 0.14, 0.19].map((u) => <path key={u} d={`M${u},-0.018 L${u + 0.025},0.018 M${u + 0.025},-0.018 L${u},0.018`} stroke="#d8d0c0" strokeWidth={0.007} />)}
            </g>
          </>}
        </g>
        <Head hx={hx} hy={hy} L={L} pose={{ ...pose, tilt: (pose.tilt ?? 0) + lean * 0.4 }} />
        <Arm a={nA} L={L} lag={lag} />
        <circle cx={nA.s[0]} cy={nA.s[1] + 0.012} r={0.05} fill={L.top} />
      </g>
    );
  };
