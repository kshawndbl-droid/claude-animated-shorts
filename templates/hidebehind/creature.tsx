// The Hidebehind (our own design; the folklore only says nobody ever saw it): a very tall, starved, hunched thing
// whose hide is like wet black pine bark, so it can press flat to a trunk and vanish. A long thin neck, an elongated
// pale skull-like face (like weathered, split wood) with deep black sockets and pinprick eyes, a seam of teeth
// running along the jaw, a visible spine and ribs, arms that hang past the knees ending in long splinter fingers,
// and backward-bending legs. Same ink-outline language as the cast, but nothing round or friendly.
// Units are metres, feet on y = 0, facing +x. pose: "lurk" (hunched, arms hanging) or "lunge" (thrust forward,
// arms reaching, jaw split wide). glow: pinprick eye shine (0..1). rim: cold moonlight edge (0..1).
import React from "react";

const INK = "#050407";
const HIDE = "#16130f", HIDE2 = "#221d17", FACE = "#9c9384", FACED = "#5f574b", BONE = "#d8cfbd";
type V = [number, number];
const f2 = (p: V) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;

/** a soft tube along a curve through a (root), b (joint) and c (end), half-width wa -> wc (same as the cast's limbs) */
const tube = (a: V, b: V, c: V, wa: number, wc: number) => {
  const q: V = [2 * b[0] - (a[0] + c[0]) / 2, 2 * b[1] - (a[1] + c[1]) / 2], N = 18, pts: V[] = [];
  for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * q[0] + t * t * c[0], u * u * a[1] + 2 * u * t * q[1] + t * t * c[1]]); }
  const L: V[] = [], R: V[] = [];
  for (let i = 0; i <= N; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    const w = wa + (wc - wa) * (i / N) * (i / N) + 0.012 * Math.sin(Math.PI * i / N * 2) ** 2; // knobbly joint
    L.push([pts[i][0] - (dy / l) * w, pts[i][1] + (dx / l) * w]); R.push([pts[i][0] + (dy / l) * w, pts[i][1] - (dx / l) * w]);
  }
  return `M${f2(L[0])} ${L.slice(1).map((p) => "L" + f2(p)).join(" ")} L${f2(R[N])} ${R.slice(0, N).reverse().map((p) => "L" + f2(p)).join(" ")} Z`;
};

/** long splinter fingers from the wrist w, pointing along angle a (deg, 0 = +x, 90 = down) */
const Hand: React.FC<{ w: V; a: number; spread: number; far?: boolean }> = ({ w, a, spread, far }) => (
  <g transform={`translate(${f2(w)}) rotate(${a})`}>
    <path d="M-0.02,-0.035 Q0.06,-0.045 0.09,0 Q0.06,0.045 -0.02,0.035 Z" fill={far ? INK : HIDE} stroke={INK} strokeWidth={0.012} />
    {[-1.5, -0.5, 0.5, 1.5].map((k, i) => {
      const ang = (k * spread * Math.PI) / 180, len = 0.3 + (i === 1 || i === 2 ? 0.06 : 0), ex = Math.cos(ang) * len, ey = Math.sin(ang) * len;
      const mx = Math.cos(ang) * len * 0.5 + 0.06, my = Math.sin(ang) * len * 0.5 + 0.02;
      return <path key={i} d={`M0.07,${(k * 0.014).toFixed(3)} Q${mx.toFixed(3)},${my.toFixed(3)} ${(ex + 0.07).toFixed(3)},${(ey + 0.03).toFixed(3)}`}
        stroke={far ? INK : "#2a241d"} strokeWidth={0.016} strokeLinecap="round" fill="none" />;
    })}
  </g>
);

export type CreaturePose = { pose: "lurk" | "lunge"; open?: number; glow?: number; rim?: number; t?: number };

export const Creature: React.FC<{ x: number; y: number; ppm: number; p: CreaturePose; flip?: boolean; op?: number; noHead?: boolean }> = ({ x, y, ppm, p, flip, op = 1, noHead }) => {
  const lunge = p.pose === "lunge", open = p.open ?? (lunge ? 1 : 0), glow = p.glow ?? 0.7, rim = p.rim ?? 0.6, t = p.t ?? 0;
  const br = Math.sin(t * 0.9) * 0.012;
  // skeleton
  const hip: V = lunge ? [0.05, -1.22] : [0, -1.22];
  const sh: V = lunge ? [0.55, -2.05] : [0.16, -2.22 + br];
  const hump: V = lunge ? [0.25, -2.15] : [-0.06, -2.28 + br];
  const neckTop: V = lunge ? [0.95, -2.1] : [0.5, -2.36 + br];
  const H: V = lunge ? [1.12, -2.08] : [0.64, -2.38 + br];          // face centre
  const tilt = lunge ? -8 : 18;                                       // head tilt (deg), lurking head hangs forward
  const armN = lunge ? { s: [0.6, -2.0] as V, e: [1.0, -1.55] as V, w: [1.5, -1.62] as V, a: -4 } : { s: [0.22, -2.12 + br] as V, e: [0.3, -1.62] as V, w: [0.38, -1.02] as V, a: 84 };
  const armF = lunge ? { s: [0.45, -2.1] as V, e: [0.9, -2.3] as V, w: [1.42, -2.42] as V, a: -18 } : { s: [0.02, -2.14 + br] as V, e: [0.08, -1.6] as V, w: [0.15, -1.02] as V, a: 88 };
  const legN = { h: [hip[0] + 0.05, hip[1]] as V, k: [hip[0] + 0.3, -0.78] as V, a: [hip[0] - 0.02, -0.26] as V };
  const legF = { h: [hip[0] - 0.06, hip[1] - 0.02] as V, k: lunge ? [hip[0] + 0.05, -0.8] as V : [hip[0] + 0.18, -0.8] as V, a: lunge ? [hip[0] - 0.35, -0.24] as V : [hip[0] - 0.2, -0.26] as V };
  const foot = (a: V, far: boolean) => <path d={`M${f2([a[0] - 0.03, a[1]])} L${f2([a[0] + 0.24, -0.02])} L${f2([a[0] + 0.3, 0])} L${f2([a[0] + 0.02, 0])} Z`}
    fill={far ? INK : HIDE} stroke={INK} strokeWidth={0.014} strokeLinejoin="round" />;
  // body: a narrow ribcage hanging from the hump, a pinched waist, all one organic shape
  const body = `M${f2([hip[0] - 0.12, hip[1] + 0.04])}
    C${f2([hip[0] - 0.18, hip[1] - 0.3])} ${f2([hump[0] - 0.12, hump[1] + 0.35])} ${f2([hump[0] - 0.04, hump[1] + 0.02])}
    C${f2([hump[0] + 0.05, hump[1] - 0.1])} ${f2([sh[0] - 0.02, sh[1] - 0.12])} ${f2([neckTop[0] - 0.05, neckTop[1] + 0.02])}
    L${f2([neckTop[0] + 0.02, neckTop[1] + 0.08])}
    C${f2([sh[0] + 0.12, sh[1] + 0.05])} ${f2([sh[0] + 0.16, sh[1] + 0.3])} ${f2([sh[0] + 0.08, sh[1] + 0.5])}
    C${f2([sh[0] + 0.0, sh[1] + 0.7])} ${f2([hip[0] + 0.06, hip[1] - 0.25])} ${f2([hip[0] + 0.12, hip[1] + 0.03])} Z`;
  const ribs = [0, 1, 2, 3].map((i) => {
    const k = 0.18 + i * 0.1, a = lerpV(sh, hip, k), b: V = [a[0] - 0.14, a[1] - 0.03 + i * 0.01];
    return `M${f2([a[0] + 0.12, a[1] + 0.02])} Q${f2([a[0], a[1] + 0.06])} ${f2(b)}`;
  });
  const jaw = 0.03 + 0.26 * open;
  // face in head space (centre 0,0, facing +x), drawn rotated by tilt
  const face = `M-0.2,-0.04 C-0.22,-0.2 -0.08,-0.29 0.06,-0.28 C0.2,-0.27 0.3,-0.17 0.33,-0.04 L0.36,0.06 C0.3,0.08 0.1,0.07 -0.06,0.08 C-0.15,0.08 -0.2,0.04 -0.2,-0.04 Z`;
  const lower = `M-0.14,0.06 L0.34,0.05 C0.33,${(0.1 + jaw * 0.7).toFixed(3)} 0.28,${(0.13 + jaw).toFixed(3)} 0.2,${(0.14 + jaw).toFixed(3)} C0.06,${(0.16 + jaw * 0.9).toFixed(3)} -0.1,${(0.15 + jaw * 0.5).toFixed(3)} -0.14,0.06 Z`;
  const teeth = Array.from({ length: 11 }, (_, i) => {
    const u = i / 10, xx = -0.1 + u * 0.43, up = 0.055, dn = 0.07 + jaw * (0.55 + 0.45 * u) * 0.95, l = 0.035 + 0.025 * ((i * 7) % 3) / 2 + 0.03 * open;
    return <g key={i}>
      <path d={`M${(xx - 0.011).toFixed(3)},${up} L${(xx + 0.011).toFixed(3)},${up} L${xx.toFixed(3)},${(up + l).toFixed(3)} Z`} fill={BONE} stroke={INK} strokeWidth={0.004} />
      {open > 0.15 && <path d={`M${(xx - 0.011).toFixed(3)},${dn.toFixed(3)} L${(xx + 0.011).toFixed(3)},${dn.toFixed(3)} L${xx.toFixed(3)},${(dn - l).toFixed(3)} Z`} fill={BONE} stroke={INK} strokeWidth={0.004} />}
    </g>;
  });
  const sock = (cx: number, cy: number, r: number) => <g>
    <ellipse cx={cx} cy={cy} rx={r * 1.15} ry={r} fill="#000" />
    {glow > 0.01 && <circle cx={cx + r * 0.25} cy={cy - r * 0.05} r={r * 0.2} fill={`rgba(235,240,225,${glow})`} />}
  </g>;
  return (
    <g transform={`translate(${x},${y}) scale(${(flip ? -1 : 1) * ppm},${ppm})`} opacity={op}>
      <g stroke={INK} strokeWidth={0.02} strokeLinejoin="round">
        {/* far limbs */}
        <path d={tube(armF.s, armF.e, armF.w, 0.045, 0.026)} fill={INK} />
        <path d={tube(legF.h, legF.k, legF.a, 0.075, 0.03)} fill={INK} />
        {foot(legF.a, true)}
        <path d={tube(legN.h, legN.k, legN.a, 0.085, 0.032)} fill={HIDE} />
        {foot(legN.a, false)}
        {/* body, spine knobs and ribs */}
        <path d={body} fill={HIDE} />
        {ribs.map((d, i) => <path key={i} d={d} stroke={HIDE2} strokeWidth={0.02} fill="none" strokeLinecap="round" />)}
      </g>
      {/* cold moon rim along the back */}
      {rim > 0 && <path d={`M${f2([hip[0] - 0.13, hip[1] - 0.05])} C${f2([hip[0] - 0.19, hip[1] - 0.32])} ${f2([hump[0] - 0.13, hump[1] + 0.34])} ${f2([hump[0] - 0.05, hump[1] + 0.01])} C${f2([hump[0] + 0.04, hump[1] - 0.1])} ${f2([sh[0] - 0.03, sh[1] - 0.13])} ${f2([neckTop[0] - 0.06, neckTop[1] + 0.01])}`}
        stroke={`rgba(150,175,230,${0.5 * rim})`} strokeWidth={0.012} fill="none" />}
      {/* head */}
      {!noHead && <g transform={`translate(${f2(H)}) rotate(${tilt}) scale(1.22,0.95)`} stroke={INK} strokeWidth={0.018} strokeLinejoin="round">
        <path d={lower} fill={FACED} />
        {open > 0.15 && <path d={`M-0.12,0.06 L0.34,0.05 C0.33,${(0.08 + jaw * 0.65).toFixed(3)} 0.28,${(0.1 + jaw * 0.9).toFixed(3)} 0.2,${(0.1 + jaw * 0.92).toFixed(3)} C0.06,${(0.12 + jaw * 0.8).toFixed(3)} -0.08,${(0.11 + jaw * 0.45).toFixed(3)} -0.12,0.06 Z`} fill="#0b0303" />}
        <path d={face} fill={FACE} />
        {/* wood grain cracks across the face */}
        <path d="M-0.15,-0.12 Q0.0,-0.16 0.18,-0.2 M-0.12,-0.02 Q0.05,-0.07 0.12,-0.12 M0.05,-0.27 Q0.08,-0.2 0.04,-0.13" stroke={FACED} strokeWidth={0.01} fill="none" />
        {sock(0.11, -0.11, 0.05)}
        {sock(0.25, -0.09, 0.036)}
        {/* nasal slits */}
        <path d="M0.32,-0.01 L0.29,0.02 M0.34,0.0 L0.31,0.03" stroke={INK} strokeWidth={0.01} />
        {teeth}
      </g>}
      {/* near arm and splinter fingers in front */}
      <g stroke={INK} strokeWidth={0.02} strokeLinejoin="round">
        <path d={tube(armN.s, armN.e, armN.w, 0.05, 0.028)} fill={HIDE} />
      </g>
      <Hand w={armF.w} a={armF.a} spread={lunge ? 14 : 5} far />
      <Hand w={armN.w} a={armN.a} spread={lunge ? 16 : 5} />
    </g>
  );
};
function lerpV(a: V, b: V, k: number): V { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
