// The Jersey Devil (our own design from the traditional description: a horse- or goat-like head, horns, leathery bat
// wings, hooves, a forked tail, standing upright). Tall (about 2.4 m, horns to 2.75 m), gaunt and upright on
// backward-bending goat legs that end in cloven hooves; a sooty, leathery near-black hide; a long horse-skull head with
// a bony muzzle, flared nostril pits and small burning ember eyes; ridged goat horns sweeping back; long thin arms with
// three hooked claws; huge bat wings (bone fingers + torn membrane) that fold behind the shoulders or spread wide; a long
// whip tail ending in a barbed fork. Same ink-outline language as the cast. Units are metres, hooves on y = 0, facing +x.
// pose: wings 0 (folded) .. 1 (spread), crouch 0..1 (landing), reach 0..1 (arms forward), open 0..1 (jaw), glow (eyes),
// rim (cold moon edge), t (breathing / tail sway), shadow (pure black silhouette, for shadows on walls / windows).
import React from "react";

const INK = "#060405";
const HIDE = "#1d1612", HIDE2 = "#2b211b", MEM = "#2a1913", BONE = "#cfc1a6", BONED = "#8f8068";
type V = [number, number];
const f2 = (p: V) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lv = (a: V, b: V, k: number): V => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

const tube = (a: V, b: V, c: V, wa: number, wc: number, knob = 0.01) => {
  const q: V = [2 * b[0] - (a[0] + c[0]) / 2, 2 * b[1] - (a[1] + c[1]) / 2], N = 18, pts: V[] = [];
  for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * q[0] + t * t * c[0], u * u * a[1] + 2 * u * t * q[1] + t * t * c[1]]); }
  const L: V[] = [], R: V[] = [];
  for (let i = 0; i <= N; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    const w = wa + (wc - wa) * (i / N) + knob * Math.sin(Math.PI * i / N) ** 8;
    L.push([pts[i][0] - (dy / l) * w, pts[i][1] + (dx / l) * w]); R.push([pts[i][0] + (dy / l) * w, pts[i][1] - (dx / l) * w]);
  }
  return `M${f2(L[0])} ${L.slice(1).map((p) => "L" + f2(p)).join(" ")} L${f2(R[N])} ${R.slice(0, N).reverse().map((p) => "L" + f2(p)).join(" ")} Z`;
};

export type DevilPose = { wings?: number; crouch?: number; reach?: number; open?: number; glow?: number; rim?: number; t?: number; shadow?: boolean };

/** one bat wing: shoulder root r, spread s (0 folded down behind the back .. 1 wide open), side +1 near / -1 far */
const Wing: React.FC<{ r: V; s: number; far: boolean; t: number; col: string; bone: string }> = ({ r, s, far, t, col, bone }) => {
  const k = far ? 0.82 : 1;
  const flut = Math.sin(t * 2.3) * 0.02 * s;
  const elbow: V = [r[0] - lerp(0.22, 0.5, s) * k, r[1] - lerp(0.18, 0.55, s) * k];
  const wrist: V = [elbow[0] + lerp(0.08, -0.25, s) * k, elbow[1] - lerp(0.42, 0.55, s) * k + flut];
  // finger tips fan out from the wrist (folded: they hang down behind the back like a cloak)
  const tips: V[] = [0, 1, 2, 3].map((i) => {
    const aF = (100 + i * 18) * Math.PI / 180, aS = (-150 + i * 38) * Math.PI / 180;   // folded vs spread angles
    const a = lerp(aF, aS, s), len = lerp(1.15 + i * 0.12, 1.25 - i * 0.12, s) * k;
    return [wrist[0] + Math.cos(a) * len, wrist[1] + Math.sin(a) * len + flut * (i + 1)];
  });
  const root2: V = [r[0] - 0.02, r[1] + lerp(0.7, 0.5, s)];   // membrane meets the body at the waist
  // membrane edge scallops between finger tips (sag inward), torn notch on one panel
  const pts: V[] = [r, elbow, wrist, tips[0]];
  let d = `M${f2(r)} L${f2(elbow)} L${f2(wrist)} L${f2(tips[0])}`;
  for (let i = 1; i < 4; i++) {
    const a = tips[i - 1], b = tips[i], m = lv(a, b, 0.5), c: V = [lerp(m[0], wrist[0], 0.28), lerp(m[1], wrist[1], 0.28)];
    d += i === 2 ? ` Q${f2(c)} ${f2(lv(a, b, 0.45))} L${f2(lv(lv(a, b, 0.5), wrist, 0.35))} L${f2(lv(a, b, 0.58))} Q${f2(c)} ${f2(b)}` : ` Q${f2(c)} ${f2(b)}`;
    pts.push(b);
  }
  const m2 = lv(tips[3], root2, 0.5);
  d += ` Q${f2([lerp(m2[0], wrist[0], 0.3), lerp(m2[1], wrist[1], 0.3)])} ${f2(root2)} Z`;
  return <g>
    <path d={d} fill={col} stroke={INK} strokeWidth={0.02} strokeLinejoin="round" opacity={far ? 1 : 0.97} />
    <path d={tube(r, lv(r, elbow, 0.5), elbow, 0.045, 0.032, 0)} fill={bone} stroke={INK} strokeWidth={0.014} />
    <path d={tube(elbow, lv(elbow, wrist, 0.5), wrist, 0.032, 0.025, 0)} fill={bone} stroke={INK} strokeWidth={0.014} />
    {tips.map((tp, i) => <path key={i} d={`M${f2(wrist)} Q${f2([lerp(wrist[0], tp[0], 0.5) + 0.04, lerp(wrist[1], tp[1], 0.5) - 0.03])} ${f2(tp)}`} stroke={bone === col ? INK : HIDE2} strokeWidth={0.018} fill="none" strokeLinecap="round" />)}
    {/* the thumb claw on the wrist */}
    <path d={`M${f2(wrist)} q0.06,-0.04 0.1,-0.02 q-0.04,0.0 -0.07,0.05 Z`} fill={BONE} stroke={INK} strokeWidth={0.008} />
  </g>;
};

const Claws: React.FC<{ w: V; a: number; spread: number; far?: boolean; shadow?: boolean }> = ({ w, a, spread, far, shadow }) => (
  <g transform={`translate(${f2(w)}) rotate(${a})`}>
    <path d="M-0.03,-0.04 Q0.07,-0.05 0.1,0 Q0.07,0.05 -0.03,0.04 Z" fill={shadow || far ? INK : HIDE} stroke={INK} strokeWidth={0.012} />
    {[-1, 0, 1].map((k) => {
      const ang = (k * spread * Math.PI) / 180, len = 0.2, ex = Math.cos(ang) * len + 0.08, ey = Math.sin(ang) * len;
      return <g key={k}>
        <path d={`M0.08,${(k * 0.02).toFixed(3)} Q${(ex * 0.6).toFixed(3)},${(ey * 0.6 + 0.01).toFixed(3)} ${ex.toFixed(3)},${ey.toFixed(3)}`} stroke={shadow || far ? INK : HIDE2} strokeWidth={0.022} fill="none" strokeLinecap="round" />
        <path d={`M${ex.toFixed(3)},${(ey - 0.012).toFixed(3)} q0.07,0.0 0.08,0.07 q-0.04,-0.04 -0.08,-0.045 Z`} fill={shadow ? INK : BONE} stroke={INK} strokeWidth={0.006} />
      </g>;
    })}
  </g>
);

export const JerseyDevil: React.FC<{ x: number; y: number; ppm: number; p?: DevilPose; flip?: boolean; op?: number }> = ({ x, y, ppm, p = {}, flip, op = 1 }) => {
  const { wings = 0.15, crouch = 0, reach = 0, open = 0.2, glow = 0.9, rim = 0.5, t = 0, shadow = false } = p;
  const br = Math.sin(t * 1.1) * 0.012;
  const cr = crouch;
  const hip: V = [0, -1.18 + 0.45 * cr];
  const sh: V = [0.1 + 0.25 * cr + 0.12 * reach, -1.98 + 0.62 * cr + br];
  const neck: V = [sh[0] + 0.16 + 0.1 * reach, sh[1] - 0.14];
  const H: V = [neck[0] + 0.12 + 0.08 * reach, neck[1] - 0.06];      // skull centre
  const fill = shadow ? INK : HIDE, fill2 = shadow ? INK : HIDE2;
  // goat legs: hip -> knee (forward) -> hock (back) -> hoof
  const leg = (dx: number, far: boolean) => {
    const h: V = [hip[0] + dx, hip[1]], hoof: V = [dx * 1.4 + (far ? -0.12 : 0.12), 0];
    const hock: V = [hoof[0] - 0.13, -0.36 + 0.12 * cr], knee: V = [h[0] + 0.22 + 0.2 * cr, lerp(h[1], hock[1], 0.5) - 0.02];
    const c = far ? INK : fill;
    return <g>
      <path d={tube(h, knee, hock, far ? 0.085 : 0.1, 0.04, 0.02)} fill={c} />
      <path d={tube(hock, lv(hock, [hoof[0] + 0.02, -0.06], 0.5), [hoof[0] + 0.02, -0.06], 0.04, 0.032, 0)} fill={c} />
      <path d={`M${f2([hoof[0] - 0.05, -0.08])} L${f2([hoof[0] + 0.1, -0.08])} L${f2([hoof[0] + 0.13, 0])} L${f2([hoof[0] + 0.04, 0])} L${f2([hoof[0] + 0.03, -0.03])} L${f2([hoof[0] + 0.0, 0])} L${f2([hoof[0] - 0.07, 0])} Z`} fill={INK} />
    </g>;
  };
  // tail: from the base of the spine, a long S whip, barbed fork tip
  const tb: V = [hip[0] - 0.12, hip[1] + 0.05];
  const tw = Math.sin(t * 1.7) * 0.12, tw2 = Math.sin(t * 1.7 - 1) * 0.15;
  const tc1: V = [tb[0] - 0.45, tb[1] + 0.45 + tw * 0.3], tc2: V = [tb[0] - 0.95, tb[1] + 0.2 + tw], tip: V = [tb[0] - 1.05, tb[1] - 0.35 + tw2];
  const tail = `M${f2(tb)} C${f2(tc1)} ${f2(tc2)} ${f2(tip)}`;
  // body: lean upright torso, ribs, hunched shoulders
  const body = `M${f2([hip[0] - 0.14, hip[1] + 0.06])}
    C${f2([hip[0] - 0.2, hip[1] - 0.3])} ${f2([sh[0] - 0.24, sh[1] + 0.3])} ${f2([sh[0] - 0.15, sh[1] + 0.02])}
    C${f2([sh[0] - 0.08, sh[1] - 0.1])} ${f2([neck[0] - 0.1, neck[1] - 0.05])} ${f2([neck[0] + 0.02, neck[1] - 0.02])}
    L${f2([neck[0] + 0.06, neck[1] + 0.1])}
    C${f2([sh[0] + 0.2, sh[1] + 0.1])} ${f2([sh[0] + 0.22, sh[1] + 0.35])} ${f2([sh[0] + 0.12, sh[1] + 0.55])}
    C${f2([sh[0] + 0.02, sh[1] + 0.75])} ${f2([hip[0] + 0.12, hip[1] - 0.2])} ${f2([hip[0] + 0.14, hip[1] + 0.06])} Z`;
  const ribs = [0, 1, 2, 3].map((i) => { const a = lv(sh, hip, 0.22 + i * 0.1); return `M${f2([a[0] + 0.13, a[1]])} Q${f2([a[0] + 0.02, a[1] + 0.05])} ${f2([a[0] - 0.1, a[1] - 0.02])}`; });
  // arms
  const armN = { s: [sh[0] + 0.04, sh[1] + 0.06] as V, e: [lerp(sh[0] + 0.1, sh[0] + 0.45, reach), lerp(sh[1] + 0.48, sh[1] + 0.2, reach)] as V, w: [lerp(sh[0] + 0.2, sh[0] + 0.9, reach), lerp(sh[1] + 0.9, sh[1] + 0.12, reach)] as V };
  const armF = { s: [sh[0] - 0.08, sh[1] + 0.02] as V, e: [lerp(sh[0] - 0.02, sh[0] + 0.38, reach), lerp(sh[1] + 0.46, sh[1] + 0.02, reach)] as V, w: [lerp(sh[0] + 0.06, sh[0] + 0.85, reach), lerp(sh[1] + 0.88, sh[1] - 0.12, reach)] as V };
  const jaw = 0.02 + 0.2 * open;
  const sock = (cx: number, cy: number, r: number) => <g>
    <ellipse cx={cx} cy={cy} rx={r * 1.3} ry={r} fill="#000" />
    {glow > 0.01 && <><circle cx={cx + r * 0.2} cy={cy} r={r * 0.85} fill={`rgba(255,90,20,${0.35 * glow})`} /><circle cx={cx + r * 0.2} cy={cy} r={r * 0.38} fill={`rgba(255,210,140,${glow})`} /></>}
  </g>;
  return (
    <g transform={`translate(${x},${y}) scale(${(flip ? -1 : 1) * ppm},${ppm})`} opacity={op}>
      {/* far wing, far limbs, tail */}
      <Wing r={[sh[0] - 0.12, sh[1] + 0.02]} s={wings} far t={t} col={INK} bone={INK} />
      <path d={tail} stroke={fill} strokeWidth={0.05} fill="none" strokeLinecap="round" />
      <path d={tail} stroke={INK} strokeWidth={0.07} fill="none" strokeLinecap="round" opacity={0.0} />
      <path d={`M${f2(tip)} l-0.1,-0.06 l0.05,0.1 l-0.1,0.05 l0.14,0.0 Z`} fill={shadow ? INK : HIDE2} stroke={INK} strokeWidth={0.01} />
      <path d={tube(armF.s, armF.e, armF.w, 0.045, 0.03, 0.012)} fill={INK} stroke={INK} strokeWidth={0.02} />
      <Claws w={armF.w} a={reach > 0.5 ? -10 : 80} spread={reach > 0.5 ? 22 : 8} far shadow={shadow} />
      {leg(-0.06, true)}
      <g stroke={INK} strokeWidth={0.02} strokeLinejoin="round">
        {leg(0.05, false)}
        <path d={body} fill={fill} />
        {!shadow && ribs.map((d, i) => <path key={i} d={d} stroke={fill2} strokeWidth={0.02} fill="none" strokeLinecap="round" />)}
      </g>
      {/* cold moon rim along the back and wing edge */}
      {rim > 0 && !shadow && <path d={`M${f2([hip[0] - 0.15, hip[1]])} C${f2([hip[0] - 0.21, hip[1] - 0.3])} ${f2([sh[0] - 0.25, sh[1] + 0.3])} ${f2([sh[0] - 0.16, sh[1] + 0.02])}`} stroke={`rgba(150,175,230,${0.55 * rim})`} strokeWidth={0.014} fill="none" />}
      {/* near wing in front of the body when spread (it sweeps forward around him), behind when folded */}
      <Wing r={[sh[0] - 0.02, sh[1] + 0.04]} s={wings} far={false} t={t + 0.4} col={shadow ? INK : MEM} bone={shadow ? INK : HIDE2} />
      {/* head: a long horse skull with goat horns */}
      <g transform={`translate(${f2(H)}) rotate(${18 - 26 * reach})`} stroke={INK} strokeWidth={0.016} strokeLinejoin="round">
        {/* horns: ridged, sweeping back and up, far one darker */}
        <path d="M-0.06,-0.1 C-0.12,-0.34 -0.36,-0.42 -0.44,-0.3 C-0.4,-0.36 -0.2,-0.3 -0.13,-0.06 Z" fill={shadow ? INK : "#2a231c"} />
        <path d="M0.02,-0.13 C-0.02,-0.4 -0.3,-0.52 -0.42,-0.42 C-0.32,-0.44 -0.1,-0.36 -0.06,-0.08 Z" fill={shadow ? INK : "#4a3f33"} />
        {!shadow && [0.25, 0.4, 0.55, 0.7].map((k, i) => <path key={i} d={`M${(-0.02 - 0.3 * k).toFixed(3)},${(-0.13 - 0.3 * Math.sin(k * 2.2)).toFixed(3)} l0.03,0.05`} stroke="#1a1410" strokeWidth={0.012} />)}
        {/* lower jaw */}
        <path d={`M-0.08,0.04 L0.42,${(0.07 + jaw * 0.4).toFixed(3)} C0.42,${(0.1 + jaw).toFixed(3)} 0.3,${(0.12 + jaw).toFixed(3)} 0.1,${(0.12 + jaw * 0.6).toFixed(3)} C-0.02,0.12 -0.08,0.1 -0.08,0.04 Z`} fill={shadow ? INK : BONED} />
        {open > 0.15 && !shadow && <path d={`M-0.04,0.05 L0.4,0.06 L0.4,${(0.07 + jaw * 0.6).toFixed(3)} L0.08,${(0.08 + jaw * 0.45).toFixed(3)} Z`} fill="#140404" />}
        {/* skull: long bony face to a narrow muzzle */}
        <path d="M-0.16,-0.02 C-0.17,-0.15 -0.06,-0.19 0.05,-0.16 C0.2,-0.12 0.36,-0.06 0.47,-0.02 C0.5,0.02 0.48,0.07 0.42,0.075 L-0.04,0.06 C-0.12,0.06 -0.16,0.04 -0.16,-0.02 Z" fill={shadow ? INK : BONE} />
        {!shadow && <>
          <path d="M0.0,-0.15 C0.15,-0.1 0.3,-0.06 0.44,-0.03" stroke={BONED} strokeWidth={0.01} fill="none" />
          <path d="M-0.1,0.03 C0.05,0.0 0.2,0.02 0.38,0.05" stroke={BONED} strokeWidth={0.008} fill="none" />
          <path d="M0.43,0.0 q0.025,0.02 0.0,0.04" stroke={INK} strokeWidth={0.014} fill="#000" />
          {Array.from({ length: 8 }, (_, i) => { const xx = 0.04 + i * 0.048; return <g key={i}>
            <path d={`M${(xx - 0.01).toFixed(3)},0.06 L${(xx + 0.01).toFixed(3)},0.06 L${xx.toFixed(3)},${(0.06 + 0.03 + 0.02 * open).toFixed(3)} Z`} fill="#e8dcc0" strokeWidth={0.004} />
            {open > 0.15 && <path d={`M${(xx - 0.01).toFixed(3)},${(0.08 + jaw * 0.5).toFixed(3)} L${(xx + 0.01).toFixed(3)},${(0.08 + jaw * 0.5).toFixed(3)} L${xx.toFixed(3)},${(0.08 + jaw * 0.5 - 0.035).toFixed(3)} Z`} fill="#e8dcc0" strokeWidth={0.004} />}
          </g>; })}
        </>}
        {sock(0.03, -0.08, 0.04)}
      </g>
      {/* near arm and claws in front */}
      <path d={tube(armN.s, armN.e, armN.w, 0.05, 0.032, 0.014)} fill={fill} stroke={INK} strokeWidth={0.02} />
      <Claws w={armN.w} a={reach > 0.5 ? 0 : 82} spread={reach > 0.5 ? 26 : 8} shadow={shadow} />
    </g>
  );
};

/** the attack close-up: the horse-skull face head-on, filling the screen (jaw dropping, ember eyes flaring, horns out
 *  past the frame), lit hard from below by the fire and from behind by the flue's darkness. Head space: centre (0,0),
 *  skull about 0.8 wide x 1.4 tall. */
export const DevilFace: React.FC<{ x: number; y: number; size: number; open?: number; t?: number; id?: string }> = ({ x, y, size, open = 1, t = 0, id = "df" }) => {
  const J = 0.05 + 0.32 * open, tw = Math.sin(t * 40) * 0.004;
  const rnd = (i: number) => { const v = Math.sin(i * 91.7 + 3.1) * 43758.5453; return v - Math.floor(v); };
  // front skull: wide brow, long tapering face to a broad muzzle with nostril pits
  const skull = `M-0.36,-0.58 C-0.22,-0.72 0.22,-0.72 0.36,-0.58 C0.44,-0.44 0.4,-0.26 0.3,-0.12 C0.24,0.02 0.24,0.2 0.26,0.36
    C0.28,0.48 0.2,0.56 0,0.57 C-0.2,0.56 -0.28,0.48 -0.26,0.36 C-0.24,0.2 -0.24,0.02 -0.3,-0.12 C-0.4,-0.26 -0.44,-0.44 -0.36,-0.58 Z`;
  const jaw = `M-0.22,0.5 C-0.2,${(0.6 + J).toFixed(3)} -0.1,${(0.66 + J).toFixed(3)} 0,${(0.67 + J).toFixed(3)} C0.1,${(0.66 + J).toFixed(3)} 0.2,${(0.6 + J).toFixed(3)} 0.22,0.5 Z`;
  const teethU = Array.from({ length: 10 }, (_, i) => { const u = (i + 0.5) / 10, xx = -0.22 + u * 0.44, L = 0.05 + 0.06 * rnd(i) + 0.04 * open;
    return <path key={"u" + i} d={`M${(xx - 0.018).toFixed(3)},0.5 L${(xx + 0.018).toFixed(3)},0.5 L${(xx + (rnd(i + 5) - 0.5) * 0.02).toFixed(3)},${(0.5 + L).toFixed(3)} Z`} fill={rnd(i + 3) > 0.75 ? "#a89a7a" : "#e2d6ba"} stroke={INK} strokeWidth={0.004} />; });
  const teethL = Array.from({ length: 9 }, (_, i) => { const u = (i + 0.5) / 9, xx = -0.2 + u * 0.4, b = 0.6 + J - 0.04 * Math.abs(u - 0.5), L = 0.05 + 0.05 * rnd(i + 20) + 0.03 * open;
    return <path key={"l" + i} d={`M${(xx - 0.016).toFixed(3)},${b.toFixed(3)} L${(xx + 0.016).toFixed(3)},${b.toFixed(3)} L${xx.toFixed(3)},${(b - L).toFixed(3)} Z`} fill={rnd(i + 23) > 0.75 ? "#a89a7a" : "#e2d6ba"} stroke={INK} strokeWidth={0.004} />; });
  const eye = (sx: number) => <g>
    <path d={`M${sx - 0.13 * Math.sign(sx)},-0.3 C${sx - 0.06 * Math.sign(sx)},-0.36 ${sx + 0.1 * Math.sign(sx)},-0.34 ${sx + 0.14 * Math.sign(sx)},-0.24 C${sx + 0.06 * Math.sign(sx)},-0.16 ${sx - 0.1 * Math.sign(sx)},-0.18 ${sx - 0.13 * Math.sign(sx)},-0.3 Z`} fill="#000" />
    <circle cx={sx} cy={-0.26} r={0.075} fill={`url(#${id}-eye)`} opacity={0.5} />
    <circle cx={sx} cy={-0.26} r={0.03} fill={`url(#${id}-eye)`} />
    <ellipse cx={sx} cy={-0.26} rx={0.006} ry={0.02} fill="#200400" />
  </g>;
  return (
    <g transform={`translate(${x},${y}) scale(${size}) translate(${tw},0)`}>
      <defs>
        <radialGradient id={`${id}-eye`}><stop offset="0" stopColor="#fff0b0" /><stop offset="0.4" stopColor="#ff8a20" stopOpacity={0.95} /><stop offset="1" stopColor="#ff3000" stopOpacity={0} /></radialGradient>
        <linearGradient id={`${id}-under`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff7a2a" stopOpacity={0.4} /><stop offset="0.35" stopColor="#ff6010" stopOpacity={0.1} /><stop offset="0.7" stopColor="#000" stopOpacity={0.35} /><stop offset="1" stopColor="#000" stopOpacity={0.85} />
        </linearGradient>
        <filter id={`${id}-tex`}><feTurbulence type="fractalNoise" baseFrequency="12 5" numOctaves={4} seed={7} /><feColorMatrix values="0 0 0 0 0.05  0 0 0 0 0.04  0 0 0 0 0.03  0 0 0 1.5 -0.35" /></filter>
        <filter id={`${id}-rough`} x="-0.2" y="-0.2" width="1.4" height="1.4"><feTurbulence type="fractalNoise" baseFrequency="8" numOctaves={3} seed={3} result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale={0.02} /></filter>
        <clipPath id={`${id}-clip`}><path d={skull} /></clipPath>
      </defs>
      <g filter={`url(#${id}-rough)`}>
        {/* horns sweeping out and up past the frame */}
        {[-1, 1].map((s) => <g key={s}>
          <path d={`M${0.26 * s},-0.6 C${0.5 * s},-0.9 ${0.95 * s},-0.95 ${1.15 * s},-0.7 C${1.05 * s},-0.82 ${0.7 * s},-0.8 ${0.38 * s},-0.48 Z`} fill="#3b3128" stroke={INK} strokeWidth={0.016} />
          {[0.2, 0.35, 0.5, 0.65, 0.8].map((k, i) => <path key={i} d={`M${(0.3 + 0.8 * k) * s},${(-0.6 - 0.32 * Math.sin(k * 2.8)).toFixed(3)} l${(0.03 * s).toFixed(3)},0.07`} stroke="#15100c" strokeWidth={0.014} />)}
        </g>)}
        {/* leathery hide on the neck/cheeks behind the skull */}
        <path d="M-0.5,-0.3 C-0.55,0.1 -0.45,0.5 -0.3,0.75 L0.3,0.75 C0.45,0.5 0.55,0.1 0.5,-0.3 Z" fill={HIDE} stroke={INK} strokeWidth={0.016} />
        <path d={jaw} fill="#1a0505" stroke={INK} strokeWidth={0.014} />
        {teethL}
        <path d={skull} fill="#b9ab90" stroke={INK} strokeWidth={0.02} />
        <g clipPath={`url(#${id}-clip)`}>
          <rect x={-0.5} y={-0.8} width={1} height={1.5} filter={`url(#${id}-tex)`} />
          {/* cracks and bone ridges */}
          <path d="M0,-0.68 C0.02,-0.5 -0.03,-0.35 0.0,-0.15 C0.02,0.0 -0.01,0.2 0.0,0.35 M-0.2,-0.6 C-0.15,-0.5 -0.2,-0.42 -0.16,-0.36 M0.18,-0.62 C0.14,-0.52 0.2,-0.46 0.15,-0.4" stroke="#3a3024" strokeWidth={0.012} fill="none" />
          <path d="M-0.34,-0.44 C-0.2,-0.5 0.2,-0.5 0.34,-0.44" stroke="#e0d4b8" strokeWidth={0.02} fill="none" opacity={0.6} />
          <path d="M-0.27,-0.05 C-0.2,0.1 -0.2,0.25 -0.22,0.4 M0.27,-0.05 C0.2,0.1 0.2,0.25 0.22,0.4" stroke="#3a3024" strokeWidth={0.03} fill="none" opacity={0.6} />
          {eye(-0.2)}{eye(0.2)}
          {/* flared nostril pits on the muzzle */}
          <path d="M-0.14,0.32 C-0.18,0.38 -0.13,0.46 -0.06,0.43 C-0.05,0.38 -0.08,0.32 -0.14,0.32 Z M0.14,0.32 C0.18,0.38 0.13,0.46 0.06,0.43 C0.05,0.38 0.08,0.32 0.14,0.32 Z" fill="#000" />
          <rect x={-0.5} y={-0.8} width={1} height={1.5} fill={`url(#${id}-under)`} />
        </g>
        {teethU}
      </g>
    </g>
  );
};
