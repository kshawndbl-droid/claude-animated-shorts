// The Ahuizotl, design v1 ("detailed horror"): a dog-sized, low, otter-like water creature in sleek black wet fur
// clumped into dripping spikes, tall pointed ears, small black-nailed monkey hands on all four limbs, round baby-like
// head with big night-animal eyeshine eyes, a too-wide needle-tooth mouth that stretches into a crying/screaming
// shape, and a very long tail that ends in a pale, too-human hand. Moonlight comes from the upper right (rim light).
// Every piece takes plain numbers (pose, jaw, time) so the video can animate the same design. Bloodless.
import React, { useId } from "react";

export type V = [number, number];
export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
export const len = (a: V) => Math.hypot(a[0], a[1]);
export const unit = (a: V): V => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
export const perp = (a: V): V => { const l = len(a) || 1; return [-a[1] / l, a[0] / l]; };
export const rot = (a: V, deg: number): V => { const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]; };
export const pt = (p: V) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
export const rnd = (i: number) => { const v = Math.sin(i * 91.7 + 13.1) * 43758.5453; return v - Math.floor(v); };
const uid = () => useId().replace(/[^a-zA-Z0-9]/g, "");

export const AHZ = {
  ink: "#020306",
  fur: "#0b0e15",
  furHi: "#1d2535",
  furLo: "#030407",
  strand: "#34425e",
  rim: "#a9c2ea",
  gloss: "#d6e4ff",
  skin: "#22232c",       // bare dark skin: paws, face mask, lips
  skinHi: "#3b3d4c",
  nail: "#050507",
  ear: "#3a2b36",
  pale: "#d9d1c2",       // the tail-hand
  paleLo: "#8e8f8c",
  paleNail: "#2e272b",
  eye: "#d8f86a",
  eyeCore: "#f8ffd8",
  eyeEdge: "#5d8f12",
  mouth: "#2a0a10",
  tooth: "#ece5d2",
  toothLo: "#8d8677",
  water: "#cfe2ff",
};

/** Catmull-Rom through pts, `per` samples per span */
export const smooth = (pts: V[], per = 10, closed = false): V[] => {
  const n = pts.length, out: V[] = [];
  const P = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
};

/** resample a polyline to (about) uniform spacing */
export const resample = (p: V[], step: number, closed = true): V[] => {
  const pts = closed ? [...p, p[0]] : p, out: V[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = len(sub(b, a));
    let pos = step - carry;
    while (pos <= d) { out.push(add(a, mul(sub(b, a), pos / d))); pos += step; }
    carry = d - (pos - step);
  }
  return out;
};

/** a tapered tube around a centerline (closed polygon, round caps) */
export const tube = (c: V[], w: (t: number) => number, per = 8): V[] => {
  const s = smooth(c, per), n = s.length, L: V[] = [], R: V[] = [];
  for (let i = 0; i < n; i++) {
    const d = sub(s[Math.min(n - 1, i + 1)], s[Math.max(0, i - 1)]), nn = perp(d), h = w(i / (n - 1)) / 2;
    L.push(add(s[i], mul(nn, h))); R.push(add(s[i], mul(nn, -h)));
  }
  const dE = sub(s[n - 1], s[n - 2]), dS = sub(s[1], s[0]);
  const endCap = Array.from({ length: 7 }, (_, k) => add(s[n - 1], mul(rot(perp(dE), -22.5 * (k + 1)), w(1) / 2)));
  const startCap = Array.from({ length: 7 }, (_, k) => add(s[0], mul(rot(perp(dS), 180 - 22.5 * (k + 1)), w(0) / 2)));
  return [...L, ...endCap, ...R.reverse(), ...startCap];
};

const area = (p: V[]) => p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
export const polyD = (p: V[]) => "M" + p.map(pt).join(" L") + " Z";

/** a spiky wet-fur edge around a closed outline: clumped, curved spikes that sweep with the fur */
export const furPath = (poly: V[], o: { len: number; every?: number; step?: number; sweep?: V | ((p: V) => V); seed?: number; mask?: (p: V, n: V) => number; lay?: number | ((p: V, n: V) => number) }) => {
  const step = o.step ?? 5, every = o.every ?? 3, seed = o.seed ?? 1;
  const q = resample(poly, step);
  const sg = area(q) > 0 ? 1 : -1; // outward normal sign (screen coords)
  const N = q.length; let d = `M${pt(q[0])}`;
  for (let i = 0, c = 0; i < N - 1; c++) {
    const e = Math.max(2, every + Math.floor(rnd(seed * 31 + c) * 3) - 1); // uneven clumps
    const j = Math.min(N - 1, i + e), a = q[i], b = q[j], m = mul(add(a, b), 0.5); i = j;
    const nn = mul(perp(sub(b, a)), -sg), k = o.mask ? o.mask(m, nn) : 1;
    const L = o.len * (0.3 + 1.1 * Math.pow(rnd(seed * 977 + c), 1.6)) * k * (e / every);
    if (L < 1.2) { d += ` L${pt(b)}`; continue; }
    const sw = typeof o.sweep === "function" ? o.sweep(m) : o.sweep ?? [0, 0];
    const ly = typeof o.lay === "function" ? o.lay(m, nn) : o.lay ?? 0;
    const tip = add(add(m, mul(nn, L * (1 - ly))), mul(sw, L * (0.9 + ly)));
    const c1 = add(add(a, mul(nn, L * 0.35)), mul(sw, L * 0.15)), c2 = add(add(b, mul(nn, L * 0.2)), mul(sw, L * 0.5));
    d += ` Q${pt(c1)} ${pt(tip)} Q${pt(c2)} ${pt(b)}`;
  }
  return d + " Z";
};

/** fill + moonlit rim: the shape in rim colour, then the shape again shifted down-left, clipped to itself */
export const Rimmed: React.FC<{ d: string; fill: string; rim?: string; off?: V; ink?: number; rimOpacity?: number }> = ({ d, fill, rim = AHZ.rim, off = [-1.5, 4], ink = 3, rimOpacity = 0.7 }) => {
  const id = uid();
  return <g>
    <clipPath id={id}><path d={d} /></clipPath>
    {ink > 0 && <path d={d} fill={AHZ.ink} stroke={AHZ.ink} strokeWidth={ink} strokeLinejoin="round" />}
    <path d={d} fill={rim} opacity={rimOpacity} />
    <g clipPath={`url(#${id})`}><path d={d} fill={fill} transform={`translate(${off[0]},${off[1]})`} /></g>
  </g>;
};

/** short fur strokes flowing along a centerline, inside a tube of width w */
export const furStrokes = (c: V[], w: (t: number) => number, count: number, seed: number, sweepLen = 22) => {
  const s = smooth(c, 10), n = s.length, hi: string[] = [], lo: string[] = [];
  for (let k = 0; k < count; k++) {
    const t = rnd(seed + k * 3.1), i = Math.min(n - 2, Math.floor(t * (n - 1))), side = rnd(seed + k * 7.7) * 2 - 1;
    const d = unit(sub(s[i + 1], s[i])), nn = perp(d), h = w(i / (n - 1)) / 2 * 0.85;
    const p0 = add(s[i], mul(nn, side * h)), L = sweepLen * (0.6 + 0.8 * rnd(seed + k));
    const p1 = add(p0, mul(d, L)), c1 = add(add(p0, mul(d, L * 0.5)), mul(nn, (side > 0 ? 1 : -1) * L * 0.18));
    (side < -0.1 ? hi : lo).push(`M${pt(p0)} Q${pt(c1)} ${pt(p1)}`);
  }
  return { hi: hi.join(" "), lo: lo.join(" ") };
};

/** a hanging drop at p plus a falling drop below it (phase in 0..1, animate with t) */
export const Drip: React.FC<{ p: V; s?: number; t?: number; phase?: number; fall?: number }> = ({ p, s = 1, t = 0, phase = 0, fall = 60 }) => {
  const f = (t * 0.9 + phase) % 1, hang = 0.4 + 0.6 * Math.min(1, f * 1.6);
  const y2 = p[1] + 6 * s + fall * s * f * f;
  const drop = (x: number, y: number, r: number) => `M${pt([x, y - r * 2.4])} Q${pt([x + r * 1.05, y - r * 0.4])} ${pt([x, y + r])} Q${pt([x - r * 1.05, y - r * 0.4])} ${pt([x, y - r * 2.4])} Z`;
  return <g>
    <path d={drop(p[0], p[1] + 4 * s * hang, 3.2 * s * hang)} fill={AHZ.water} opacity={0.55} />
    {f > 0.45 && <path d={drop(p[0], y2, 2.6 * s)} fill={AHZ.water} opacity={0.7 * (1 - f * 0.5)} />}
    <circle cx={p[0] - 0.8 * s} cy={p[1] + 3 * s * hang} r={0.9 * s} fill="#fff" opacity={0.8} />
  </g>;
};

/** small black monkey/raccoon hand. Wrist at p, pointing along `ang` degrees; curl bends the fingers down (toward +normal) */
export const Paw: React.FC<{ p: V; ang: number; s?: number; curl?: number; spread?: number; seed?: number; flipY?: boolean }> = ({ p, ang, s = 1, curl = 0.4, spread = 1, seed = 1, flipY = false }) => {
  const fy = flipY ? -1 : 1;
  const T = (q: V): V => add(p, rot([q[0] * s, q[1] * s * fy], ang));
  const palm = [[0, -9], [14, -12], [26, -10], [30, 0], [26, 10], [12, 11], [0, 8]].map((q) => T(q as V));
  const fingers: { pts: V[]; w: number }[] = [];
  [-12, -3, 6, 14].forEach((a0, i) => {
    const base: V = [26, -8 + i * 5.5], ln = [15, 17, 16, 12][i];
    let dir = rot([1, 0], a0 * spread), q = base; const pts: V[] = [q];
    for (let k = 0; k < 3; k++) { q = add(q, mul(dir, ln * [0.45, 0.33, 0.25][k] * 1.6)); pts.push(q); dir = rot(dir, curl * 38); }
    fingers.push({ pts: pts.map(T), w: 5.2 - i * 0.4 });
  });
  const thumb = [[8, 9], [16, 17], [24, 21]].map((q) => T(q as V));
  const claw = (pts: V[]) => {
    const a = pts[pts.length - 2], b = pts[pts.length - 1], d = unit(sub(b, a)), nn = mul(perp(d), fy);
    const tip = add(add(b, mul(d, 7 * s)), mul(nn, 4 * s));
    return `M${pt(add(b, mul(nn, -2.4 * s)))} Q${pt(add(b, mul(d, 6 * s)))} ${pt(tip)} Q${pt(add(b, mul(d, 2 * s)))} ${pt(add(b, mul(nn, 2.4 * s)))} Z`;
  };
  const line = (pts: V[]) => "M" + pts.map(pt).join(" L");
  return <g>
    {[...fingers, { pts: thumb, w: 5 }].map((f, i) => <path key={"o" + i} d={line(f.pts)} stroke={AHZ.ink} strokeWidth={(f.w + 3) * s} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
    <path d={polyD(palm)} fill={AHZ.skin} stroke={AHZ.ink} strokeWidth={3 * s} strokeLinejoin="round" />
    {[...fingers, { pts: thumb, w: 5 }].map((f, i) => <g key={"f" + i}>
      <path d={line(f.pts)} stroke={AHZ.skin} strokeWidth={f.w * s} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={line(f.pts.slice(0, -1))} stroke={AHZ.skinHi} strokeWidth={1.4 * s} strokeLinecap="round" fill="none" transform={`translate(${1.2 * s},${-1.4 * s})`} opacity={0.9} />
      {f.pts.slice(1, -1).map((j, k) => <circle key={k} cx={j[0]} cy={j[1]} r={f.w * 0.55 * s} fill={AHZ.skin} stroke={AHZ.ink} strokeWidth={0.8 * s} />)}
      <path d={claw(f.pts)} fill={AHZ.nail} stroke={AHZ.ink} strokeWidth={0.8 * s} />
      <path d={claw(f.pts)} fill="none" stroke="#8a96b0" strokeWidth={0.7 * s} opacity={0.6} transform={`translate(${0.6 * s},${-0.8 * s})`} />
    </g>)}
    <path d={`M${pt(T([4, -8]))} Q${pt(T([16, -12]))} ${pt(T([27, -8]))}`} stroke={AHZ.rim} strokeWidth={1.6 * s} fill="none" opacity={0.7} />
  </g>;
};

/** the pale, too-human hand. Wrist at p, pointing along `ang`. spread 0..1 opens the fingers, curl 0..1 closes them.
 *  colours can be swapped (the same rig draws the fisherman's hand). flipY mirrors (thumb side). */
export const HumanHand: React.FC<{ p: V; ang: number; s?: number; curl?: number | number[]; spread?: number; flipY?: boolean; skin?: string; lo?: string; nail?: string; nailLen?: number; fingerLen?: number; line?: string; showPalm?: boolean; light?: V; thumb?: boolean }> = (
  { p, ang, s = 1, curl = 0.2, spread = 0.6, flipY = false, skin = AHZ.pale, lo = AHZ.paleLo, nail = AHZ.paleNail, nailLen = 1, fingerLen = 1.3, line = "#24202a", showPalm = true, light = [0.7, -0.7], thumb = true }) => {
  const id = uid();
  const fy = flipY ? -1 : 1;
  const T = (q: V): V => add(p, rot([q[0] * s, q[1] * s * fy], ang));
  const cu = (i: number) => (Array.isArray(curl) ? curl[i] : curl);
  const palm: V[] = smooth([[-6, -20], [30, -28], [64, -33], [80, -16], [80, 10], [74, 33], [40, 34], [4, 25]] as V[], 6, true).map(T);
  const fingers = [-24, -8, 8, 23].map((y0, i) => {
    const ln = [60, 68, 63, 48][i] * fingerLen, a0 = [-9, -2, 5, 13][i] * (0.4 + spread);
    let dir = rot([1, 0], a0), q: V = [70, y0]; const pts: V[] = [q];
    [0.45, 0.31, 0.24].forEach((r, k) => { q = add(q, mul(dir, ln * r)); pts.push(q); dir = rot(dir, cu(i) * (k === 0 ? 42 : 55)); });
    return { pts, w: [16, 16.5, 15.5, 13.5][i] };
  });
  let td = rot([1, 0], 52 - spread * 18), tq: V = [14, 20]; const tpts: V[] = [tq];
  [26, 22, 18].forEach((l, k) => { tq = add(tq, mul(td, l)); tpts.push(tq); td = rot(td, -cu(0) * 35 * (k ? 1 : 0.5)); });
  const all = [...(thumb ? [{ pts: tpts, w: 16 }] : []), ...fingers];
  const ln = (pts: V[]) => "M" + pts.map((q) => pt(T(q))).join(" L");
  const lv = mul(unit(light), 1);
  const nailPath = (pts: V[], w: number) => {
    const a = T(pts[pts.length - 2]), b = T(pts[pts.length - 1]), d = unit(sub(b, a)), nn = perp(d), L = len(sub(b, a));
    const st = add(a, mul(d, L * 0.38)), tip = add(b, mul(d, 6 * s * nailLen)), hw = w * 0.36 * s;
    return `M${pt(add(st, mul(nn, hw)))} Q${pt(add(add(st, mul(d, L * 0.5)), mul(nn, hw * 1.1)))} ${pt(add(tip, mul(nn, hw * 0.4)))} Q${pt(add(tip, mul(d, 2 * s)))} ${pt(add(tip, mul(nn, -hw * 0.4)))} Q${pt(add(add(st, mul(d, L * 0.5)), mul(nn, -hw * 1.1)))} ${pt(add(st, mul(nn, -hw)))} Z`;
  };
  const w0 = T([-6, 0]);
  return <g>
    <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1={w0[0] + lv[0] * 40 * s} y1={w0[1] + lv[1] * 40 * s} x2={w0[0] - lv[0] * 40 * s} y2={w0[1] - lv[1] * 40 * s}><stop offset="0" stopColor={skin} /><stop offset="1" stopColor={lo} /></linearGradient></defs>
    {all.map((f, i) => <path key={"o" + i} d={ln(f.pts)} stroke={line} strokeWidth={(f.w + 4.5) * s} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
    {showPalm && <path d={polyD(palm)} fill={`url(#${id})`} stroke={line} strokeWidth={3.5 * s} strokeLinejoin="round" />}
    {all.map((f, i) => <g key={"f" + i}>
      <path d={ln(f.pts)} stroke={lo} strokeWidth={f.w * s} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={ln(f.pts)} stroke={skin} strokeWidth={f.w * 0.6 * s} strokeLinecap="round" strokeLinejoin="round" fill="none" transform={`translate(${lv[0] * f.w * 0.18 * s},${lv[1] * f.w * 0.18 * s})`} />
      {/* bony knuckles with wrinkles */}
      {f.pts.slice(1, -1).map((j, k) => { const c = T(j), d = unit(sub(T(f.pts[k + 2]), T(f.pts[k]))), nn = perp(d), h = f.w * 0.36 * s;
        return <g key={k}>
          <ellipse cx={c[0] + lv[0] * 2 * s} cy={c[1] + lv[1] * 2 * s} rx={f.w * 0.3 * s} ry={f.w * 0.22 * s} fill="#fff" opacity={0.12} />
          <path d={`M${pt(add(add(c, mul(nn, h)), mul(d, -3 * s)))} Q${pt(add(c, mul(d, 1 * s)))} ${pt(add(add(c, mul(nn, -h)), mul(d, -3 * s)))}`} stroke={line} strokeWidth={1.1 * s} fill="none" opacity={0.45} />
          <path d={`M${pt(add(add(c, mul(nn, h * 0.6)), mul(d, 2 * s)))} Q${pt(add(c, mul(d, 4.5 * s)))} ${pt(add(add(c, mul(nn, -h * 0.6)), mul(d, 2 * s)))}`} stroke={line} strokeWidth={1 * s} fill="none" opacity={0.5} />
          <path d={`M${pt(add(add(c, mul(nn, h * 0.5)), mul(d, -6 * s)))} Q${pt(add(c, mul(d, -4 * s)))} ${pt(add(add(c, mul(nn, -h * 0.5)), mul(d, -6 * s)))}`} stroke={line} strokeWidth={0.9 * s} fill="none" opacity={0.4} />
        </g>; })}
      <path d={nailPath(f.pts, f.w)} fill={nail} stroke={line} strokeWidth={0.9 * s} />
      <path d={nailPath(f.pts, f.w * 0.35)} fill="#fff" opacity={0.2} transform={`translate(${lv[0] * 1.5 * s},${lv[1] * 1.5 * s})`} />
    </g>)}
    {/* knuckle bumps and tendons on the back of the hand */}
    {showPalm && fingers.map((f, i) => { const k = T(f.pts[0]); return <g key={"t" + i}>
      <path d={`M${pt(T([6, -8 + i * 5]))} Q${pt(T([40, f.pts[0][1] * 0.8]))} ${pt(T([64, f.pts[0][1]]))}`} stroke={lo} strokeWidth={2.4 * s} fill="none" opacity={0.75} />
      <path d={`M${pt(T([8, -9 + i * 5]))} Q${pt(T([40, f.pts[0][1] * 0.8 - 2]))} ${pt(T([62, f.pts[0][1] - 2]))}`} stroke="#fff" strokeWidth={1 * s} fill="none" opacity={0.18} />
      <ellipse cx={k[0] + lv[0] * 1.5 * s} cy={k[1] + lv[1] * 1.5 * s} rx={f.w * 0.36 * s} ry={f.w * 0.3 * s} fill="#fff" opacity={0.16} />
    </g>; })}
  </g>;
};

/** big glowing night-animal eye (eyeshine). r = radius, look = pupil offset */
export const GlowEye: React.FC<{ c: V; r: number; look?: V; shape?: string; pupil?: number; glow?: number; tilt?: number; halo?: number; lid?: number }> = ({ c, r, look = [0, 0], shape, pupil = 0.16, glow = 1, tilt = 0, halo = 3.2, lid = 0 }) => {
  const id = uid();
  const d = shape ?? `M${c[0] - r},${c[1]} A${r},${r} 0 1 0 ${c[0] + r},${c[1]} A${r},${r} 0 1 0 ${c[0] - r},${c[1]} Z`;
  return <g>
    <defs>
      <radialGradient id={id + "g"} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={AHZ.eyeCore} /><stop offset="0.42" stopColor={AHZ.eye} /><stop offset="0.85" stopColor={AHZ.eyeEdge} /><stop offset="1" stopColor="#1d3006" /></radialGradient>
      <radialGradient id={id + "h"} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={AHZ.eye} stopOpacity={0.55 * glow} /><stop offset="0.4" stopColor={AHZ.eye} stopOpacity={0.18 * glow} /><stop offset="1" stopColor={AHZ.eye} stopOpacity={0} /></radialGradient>
      <clipPath id={id + "c"}><path d={d} /></clipPath>
    </defs>
    <circle cx={c[0]} cy={c[1]} r={r * halo} fill={`url(#${id}h)`} style={{ mixBlendMode: "screen" }} />
    <filter id={id + "b"} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={r * 0.35} /></filter>
    <path d={d} fill={AHZ.eye} opacity={0.75 * glow} filter={`url(#${id}b)`} transform={`translate(${c[0]},${c[1]}) scale(1.25) translate(${-c[0]},${-c[1]})`} />
    <path d={d} fill={AHZ.ink} stroke={AHZ.ink} strokeWidth={r * 0.12} />
    <g clipPath={`url(#${id}c)`}>
      <circle cx={c[0] + look[0] * r * 0.3} cy={c[1] + look[1] * r * 0.3} r={r * 1.05} fill={`url(#${id}g)`} />
      <ellipse cx={c[0] + look[0] * r * 0.35} cy={c[1] + look[1] * r * 0.35} rx={r * pupil} ry={r * pupil * 1.25} fill="#0a1200" />
      {/* the upper lid shadow, and an optional tilted lid (a sad, pleading slant) */}
      <ellipse cx={c[0]} cy={c[1] - r * 1.25} rx={r * 1.4} ry={r * 0.55} fill="#000" opacity={0.45} />
      {lid > 0 && <g transform={`rotate(${tilt},${c[0]},${c[1]})`}>
        <rect x={c[0] - r * 1.5} y={c[1] - r * 2} width={r * 3} height={r * (1 + lid * 2)} fill="#14151d" />
        <path d={`M${c[0] - r * 1.5},${c[1] - r + lid * 2 * r + r * 0.06} L${c[0] + r * 1.5},${c[1] - r + lid * 2 * r + r * 0.06}`} stroke="#000" strokeWidth={r * 0.14} opacity={0.6} />
        <path d={`M${c[0] - r * 1.5},${c[1] - r + lid * 2 * r - r * 0.05} L${c[0] + r * 1.5},${c[1] - r + lid * 2 * r - r * 0.05}`} stroke="#5a5e74" strokeWidth={r * 0.05} />
      </g>}
    </g>
    <ellipse cx={c[0] - r * 0.34} cy={c[1] - r * 0.36} rx={r * 0.2} ry={r * 0.13} fill="#fff" transform={`rotate(-30,${c[0] - r * 0.34},${c[1] - r * 0.36})`} />
    <circle cx={c[0] + r * 0.3} cy={c[1] + r * 0.32} r={r * 0.06} fill="#fff" opacity={0.8} />
  </g>;
};

/* ---------------------------------------------------------------- full body, side view (faces left) */

export type SidePose = {
  jaw?: number;       // 0 closed .. 1 gaping
  tailSway?: number;  // -1..1 moves the tail-hand
  handOpen?: number;  // 0 grasping .. 1 splayed
  t?: number;         // seconds, drives drips
  crouch?: number;    // 0..1 lowers the body
};

const BODY: V[] = [[-262, -178], [-190, -150], [-80, -150], [60, -158], [190, -142], [262, -126]];
const bodyW = (t: number) => 96 + 50 * Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 0.6 - 30 * Math.max(0, t - 0.85) / 0.15;

/** the whole animal in its own space: ground line y = 0, body centre near x = 0, roughly x -400..520, y -560..0 */
export const AhzSide: React.FC<SidePose & { x: number; y: number; s?: number; flip?: boolean }> = ({ x, y, s = 1, flip = false, jaw = 0.15, tailSway = 0, handOpen = 0.85, t = 0, crouch = 0 }) => {
  const cy = crouch * 16;
  const body = BODY.map(([a, b]) => [a, b + cy] as V);
  const sw = tailSway * 40;
  const tailC: V[] = [[236, -132 + cy], [320, -150], [410, -196], [474, -288], [486, -398], [430, -488 + sw * 0.3], [322, -530 + sw * 0.6], [214, -514 + sw], [150, -470 + sw * 1.2]];
  const tailW = (u: number) => 62 * (1 - u) ** 0.9 + 20;
  const tailPoly = tube(tailC, tailW, 10);
  const tailS = smooth(tailC, 10);
  const tailSweep = (p: V): V => { let bi = 0, bd = 1e9; tailS.forEach((q, i) => { const d = len(sub(q, p)); if (d < bd) { bd = d; bi = i; } }); return unit(sub(tailS[Math.min(tailS.length - 1, bi + 1)], tailS[Math.max(0, bi - 1)])); };
  const bodyPoly = tube(body, bodyW, 12);
  const legs: { c: V[]; far: boolean; paw: V; ang: number; curl: number }[] = [
    { c: [[-120, -132 + cy], [-126, -70], [-146, -18]], far: true, paw: [-146, -14], ang: 170, curl: 0.5 },
    { c: [[150, -132 + cy], [196, -76], [168, -18]], far: true, paw: [166, -14], ang: 176, curl: 0.45 },
    { c: [[-176, -128 + cy], [-200, -62], [-226, -16]], far: false, paw: [-226, -12], ang: 186, curl: 0.95 },
    { c: [[110, -128 + cy], [168, -66], [130, -18]], far: false, paw: [128, -12], ang: 178, curl: 0.6 },
  ];
  const legW = (u: number) => 46 - 26 * u;
  const H: V = [-318, -200 + cy]; // head centre
  const hp = (q: V): V => add(H, mul(q, 1.16)); // big baby-like head
  const jd = jaw * 34;
  const headPts: V[] = [[-96, 22], [-90, 4], [-66, -36], [-24, -70], [24, -66], [58, -40], [80, 2], [66, 44], [20, 60 + jd * 0.6], [-30, 56 + jd], [-74, 46 + jd * 0.7], [-96, 34]].map((q) => hp(q as V));
  const headPoly = smooth(headPts, 8, true);
  const earPoly = (b1: V, tip: V, b2: V): V[] => smooth([b1, add(mul(add(b1, tip), 0.5), [-8, 0]), tip, add(mul(add(b2, tip), 0.5), [10, 4]), b2], 6, true);
  const earFar = earPoly(hp([-30, -56]), hp([-14, -180]), hp([2, -64]));
  const earNear = earPoly(hp([-6, -64]), hp([36, -206]), hp([46, -44]));
  const bodyMask = (p: V, n: V) => (n[1] > 0.4 ? 1.7 : n[1] < -0.5 ? 0.8 : 1.1);
  const layTop = (p: V, n: V) => (n[1] < -0.3 ? 0.65 : n[1] > 0.4 ? 0.05 : 0.35);
  const strokesB = furStrokes(body, bodyW, 190, 11, 30), strokesT = furStrokes(tailC, tailW, 150, 21, 24);
  const drips: V[] = [[-150, -78], [-40, -74], [70, -80], [200, -88], [-280, -136], [330, -126], [470, -250], [-210, -40]];
  const mouthA = hp([-94, 30]), mouthB = hp([22, 30 + jd * 0.4]);
  const lowLip = hp([-40, 40 + jd]);
  const teeth: string[] = [];
  for (let k = 0; k < 13; k++) {
    const u = k / 12, top = add(mouthA, mul(sub(mouthB, mouthA), u)), lo = add(add(mouthA, mul(sub(mouthB, mouthA), u)), [0, jd * Math.sin(u * Math.PI) * 0.9 + 2]);
    const l = (7 + 6 * rnd(k)) * (1 - 0.4 * u);
    teeth.push(`M${pt(add(top, [-1.6, 0]))} L${pt(add(top, [0.4, l]))} L${pt(add(top, [1.6, 0]))} Z`);
    teeth.push(`M${pt(add(lo, [-1.5, 0]))} L${pt(add(lo, [-0.4, -l * 0.8]))} L${pt(add(lo, [1.5, 0]))} Z`);
  }
  const mouthD = `M${pt(mouthA)} Q${pt(hp([-40, 26]))} ${pt(mouthB)} Q${pt(add(lowLip, [10, 8 + jd * 0.3]))} ${pt(mouthA)} Z`;
  return <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
    {/* far legs, darker */}
    {legs.filter((l) => l.far).map((l, i) => <g key={"fl" + i} opacity={0.9}>
      <Rimmed d={furPath(tube(l.c, legW, 8), { len: 7, sweep: [0.2, 0.6], seed: 40 + i })} fill={AHZ.furLo} rimOpacity={0.35} />
      <Paw p={l.paw} ang={l.ang} curl={l.curl} s={1.05} seed={i} flipY />
    </g>)}
    {/* the tail, rising in a long S over the back */}
    <Rimmed d={furPath(tailPoly, { len: 15, every: 3, sweep: tailSweep, seed: 7, lay: 0.5 })} fill="url(#ahzFurSide)" />
    <path d={strokesT.hi} stroke={AHZ.strand} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.9} />
    <path d={strokesT.lo} stroke="#000" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.6} />
    <path d={"M" + smooth(tailC.slice(1, 7), 10).map((q, i, arr) => pt(add(q, mul(perp(sub(arr[Math.min(arr.length - 1, i + 1)], arr[Math.max(0, i - 1)])), 14)))).join(" L")} stroke={AHZ.gloss} strokeWidth={4} fill="none" opacity={0.17} strokeLinecap="round" />
    {/* body */}
    <Rimmed d={furPath(bodyPoly, { len: 17, every: 3, sweep: [0.85, 0.2], seed: 3, mask: bodyMask, lay: layTop })} fill="url(#ahzFurSide)" />
    <path d={strokesB.hi} stroke={AHZ.strand} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.9} />
    <path d={strokesB.lo} stroke="#000" strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.6} />
    {/* wet gloss along the spine */}
    <path d={`M${pt([-200, -198 + cy])} Q${pt([-60, -214 + cy])} ${pt([80, -210 + cy])} T${pt([230, -176 + cy])}`} stroke={AHZ.gloss} strokeWidth={6} fill="none" opacity={0.3} strokeLinecap="round" />
    <path d={`M${pt([-150, -190 + cy])} Q${pt([-40, -202 + cy])} ${pt([40, -200 + cy])}`} stroke="#fff" strokeWidth={2.2} fill="none" opacity={0.55} strokeLinecap="round" />
    {[[-110, -186], [10, -192], [140, -182], [-20, -176], [96, -170]].map(([a, b], i) => <circle key={i} cx={a} cy={b + cy} r={1.8 + rnd(i) * 1.6} fill="#fff" opacity={0.7} />)}
    {/* near legs */}
    {legs.filter((l) => !l.far).map((l, i) => <g key={"nl" + i}>
      <Rimmed d={furPath(tube(l.c, legW, 8), { len: 9, sweep: [0.15, 0.7], seed: 60 + i })} fill="url(#ahzFurSide)" />
      <Paw p={l.paw} ang={l.ang} curl={l.curl} s={1.15} seed={i} flipY />
    </g>)}
    {/* head: far ear, skull, near ear */}
    <Rimmed d={furPath(earFar, { len: 3, sweep: [0, -0.4], seed: 81 })} fill={AHZ.furLo} rimOpacity={0.5} />
    <path d={polyD(smooth([hp([-22, -62]), hp([-14, -160]), hp([-4, -66])], 6, true))} fill={AHZ.ear} opacity={0.45} />
    <Rimmed d={furPath(headPoly, { len: 10, every: 3, sweep: [0.7, 0.4], seed: 5, mask: (p, n) => (p[0] < H[0] - 70 ? 0.15 : n[1] > 0.3 ? 1.4 : 1) })} fill="url(#ahzFurSide)" />
    <Rimmed d={furPath(earNear, { len: 7, sweep: [0.1, -0.5], seed: 82 })} fill="url(#ahzFurSide)" />
    <path d={polyD(smooth([hp([4, -70]), hp([30, -176]), hp([36, -60])], 6, true))} fill={AHZ.ear} opacity={0.9} />
    <path d={`M${pt(hp([10, -76]))} L${pt(hp([28, -150]))} M${pt(hp([22, -70]))} L${pt(hp([32, -132]))}`} stroke={AHZ.furHi} strokeWidth={2} />
    {/* bare muzzle skin, small baby nose */}
    <path d={polyD(smooth([hp([-98, 22]), hp([-86, -2]), hp([-60, -14]), hp([-30, 6]), hp([-20, 30]), hp([-60, 40]), hp([-94, 36])], 6, true))} fill={AHZ.skin} />
    <path d={`M${pt(hp([-100, 14]))} Q${pt(hp([-102, 2]))} ${pt(hp([-90, 0]))} Q${pt(hp([-84, 10]))} ${pt(hp([-92, 20]))} Z`} fill="#060609" stroke="#555a70" strokeWidth={1.2} />
    {/* the mouth: very wide, back past the eye; needle teeth over the lips */}
    <path d={mouthD} fill={AHZ.mouth} stroke={AHZ.ink} strokeWidth={2.5} />
    <path d={teeth.join(" ")} fill={AHZ.tooth} stroke={AHZ.ink} strokeWidth={0.6} />
    <path d={`M${pt(mouthA)} Q${pt(hp([-40, 26]))} ${pt(mouthB)} l${pt([10, -6])}`} stroke="#4a4458" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    {/* whiskers */}
    {[[-80, 16, -150, 0], [-76, 22, -150, 30], [-72, 12, -140, -24]].map(([a, b, c, d], i) => <path key={i} d={`M${pt(hp([a, b]))} Q${pt(hp([(a + c) / 2, (b + d) / 2 - 8]))} ${pt(hp([c, d]))}`} stroke="#b6c4dc" strokeWidth={1} opacity={0.45} fill="none" />)}
    {/* big low baby-like eye with eyeshine */}
    <GlowEye c={hp([-46, -10])} r={21} look={[-0.6, 0.1]} halo={2.4} />
    <path d={`M${pt(hp([-68, -24]))} Q${pt(hp([-48, -34]))} ${pt(hp([-26, -24]))}`} stroke={AHZ.skinHi} strokeWidth={2} fill="none" opacity={0.8} />
    {/* the tail-hand, reaching forward over its own back */}
    <HumanHand p={tailS[tailS.length - 1]} ang={Math.atan2(...(sub(tailS[tailS.length - 1], tailS[tailS.length - 4]).reverse() as [number, number])) * 180 / Math.PI} s={1.02} spread={handOpen} curl={[0.15, 0.22, 0.3, 0.38].map((c) => c * (1.4 - handOpen))} flipY />
    {/* fur cuff where black tail turns into pale skin */}
    <Rimmed d={furPath(tube(tailC.slice(-2).map((q, i, a) => i === 1 ? add(a[0], mul(sub(q, a[0]), 0.95)) : add(q, mul(sub(a[1], q), 0.55))), () => 30, 4), { len: 12, sweep: tailSweep, seed: 99 })} fill="url(#ahzFurSide)" />
    {drips.map((d, i) => <Drip key={i} p={[d[0], d[1] + cy]} t={t} phase={rnd(i + 3)} fall={50} />)}
    <Drip p={add(tailS[tailS.length - 1], [-30, 30])} t={t} phase={0.7} fall={70} />
  </g>;
};

/** gradient defs used by AhzSide / AhzFace; render once inside the <svg> */
export const AhzDefs: React.FC = () => <defs>
  <linearGradient id="ahzFurSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={AHZ.furHi} /><stop offset="0.45" stopColor={AHZ.fur} /><stop offset="1" stopColor={AHZ.furLo} /></linearGradient>
  <radialGradient id="ahzFurFace" cx="60%" cy="25%" r="80%"><stop offset="0" stopColor="#222b3d" /><stop offset="0.5" stopColor={AHZ.fur} /><stop offset="1" stopColor={AHZ.furLo} /></radialGradient>
  <radialGradient id="ahzMask" cx="50%" cy="30%" r="70%"><stop offset="0" stopColor="#3c3f52" /><stop offset="0.55" stopColor="#24252f" /><stop offset="1" stopColor="#111219" /></radialGradient>
  <radialGradient id="ahzMouth" cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#000" /><stop offset="0.45" stopColor="#120306" /><stop offset="1" stopColor="#4a1420" /></radialGradient>
  <linearGradient id="ahzPale" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e6dfd2" /><stop offset="1" stopColor="#9d98a0" /></linearGradient>
</defs>;

/* ---------------------------------------------------------------- face, front view (the jumpscare) */

/** front face close-up. open 0 = wide closed grin-line .. 1 = stretched crying/screaming mouth. head is about 520*s wide */
export const AhzFace: React.FC<{ cx: number; cy: number; s?: number; open?: number; t?: number; glow?: number; look?: V }> = ({ cx, cy, s = 1, open = 1, t = 0, glow = 1, look = [0, 0.1] }) => {
  const o = Math.max(0, Math.min(1, open));
  const P = (x: number, y: number): V => [cx + x * s, cy + y * s];
  const mw = 134 + 66 * o;                 // half mouth width: it stretches wider than the face should allow
  const cornerY = 104 + 70 * o, topY = 80 - 6 * o, botY = 110 + 236 * o;
  const chinY = botY + 52;
  const head = smooth([P(0, -222), P(124, -200), P(206, -132), P(244, -24), P(250 + 10 * o, 80), P(232 + 10 * o, 170 + 50 * o), P(160, chinY - 16), P(0, chinY + 18), P(-160, chinY - 16), P(-232 - 10 * o, 170 + 50 * o), P(-250 - 10 * o, 80), P(-244, -24), P(-206, -132), P(-124, -200)], 8, true);
  const earL = smooth([P(-112, -178), P(-172, -290), P(-226, -410), P(-232, -290), P(-222, -120)], 6, true);
  const earR = earL.map(([x, y]) => [2 * cx - x, y] as V);
  const earInL = smooth([P(-140, -186), P(-184, -290), P(-222, -380), P(-218, -290), P(-204, -150)], 6, true);
  const earInR = earInL.map(([x, y]) => [2 * cx - x, y] as V);
  const mask = smooth([P(0, -130), P(96, -112), P(176, -64), P(196, 24), P(mw + 30, cornerY + 6), P(mw * 0.6, botY + 30), P(0, botY + 36), P(-mw * 0.6, botY + 30), P(-mw - 30, cornerY + 6), P(-196, 24), P(-176, -64), P(-96, -112)], 8, true);
  const faceMask = (p: V, n: V) => (n[1] > 0.3 ? 2.1 : n[1] < -0.6 ? 0.7 : 1.3);
  // mouth outline: upper lip with a slight cupid dip, corners dragged down, lower lip a deep U
  const upper: V[] = smooth([P(-mw, cornerY), P(-mw * 0.86, topY + (cornerY - topY) * 0.4), P(-mw * 0.52, topY + 4), P(-mw * 0.2, topY), P(0, topY + 7), P(mw * 0.2, topY), P(mw * 0.52, topY + 4), P(mw * 0.86, topY + (cornerY - topY) * 0.4), P(mw, cornerY)], 8);
  const lower: V[] = smooth([P(mw, cornerY), P(mw * 0.8, cornerY + (botY - cornerY) * 0.6), P(mw * 0.45, botY - 6), P(0, botY), P(-mw * 0.45, botY - 6), P(-mw * 0.8, cornerY + (botY - cornerY) * 0.6), P(-mw, cornerY)], 8);
  const mouthD = "M" + [...upper, ...lower].map(pt).join(" L") + " Z";
  const needle = (base: V, dir: V, l: number, w: number, bend: number) => {
    const nn = perp(dir), tip = add(add(base, mul(dir, l)), mul(nn, bend * l * 0.15));
    return `M${pt(add(base, mul(nn, w)))} Q${pt(add(add(base, mul(dir, l * 0.55)), mul(nn, w * 0.6 + bend * l * 0.1)))} ${pt(tip)} Q${pt(add(add(base, mul(dir, l * 0.55)), mul(nn, -w * 0.6 + bend * l * 0.1)))} ${pt(add(base, mul(nn, -w)))} Z`;
  };
  const centre: V = P(0, (topY + botY) / 2);
  const rowTeeth = (edge: V[], count: number, L: number, seed: number, inset = 0) => {
    const out: string[] = [];
    for (let k = 0; k < count; k++) {
      const u = (k + 0.5) / count, i = Math.floor(u * (edge.length - 1)), b = edge[i];
      const into = unit(sub(centre, b)), base = add(b, mul(into, inset * s));
      const ln = L * s * (0.55 + 0.65 * rnd(seed + k)) * (0.55 + 0.45 * Math.sin(u * Math.PI)) * (0.35 + 0.65 * Math.max(0.25, o));
      out.push(needle(base, into, ln, 2.6 * s, (rnd(seed + k * 3) - 0.5) * 2));
    }
    return out.join(" ");
  };
  const inner = smooth([P(-mw * 0.7, cornerY + 4), P(0, topY + 34), P(mw * 0.7, cornerY + 4), P(mw * 0.4, botY - 40), P(0, botY - 34), P(-mw * 0.4, botY - 40)], 8, true);
  const drips: V[] = [P(-150, chinY - 10), P(-60, chinY + 18), P(40, chinY + 22), P(130, chinY - 8), P(-212, 150 + 40 * o), P(214, 160 + 40 * o), P(-40, -96), P(30, -90)];
  const brow = (sd: number) => `M${pt(P(sd * 30, -102))} Q${pt(P(sd * 80, -128))} ${pt(P(sd * 160, -96))}`;
  const eyeShape = (sd: number) => { const c = P(sd * 98, -26), r = 60 * s;
    // round baby eye, the inner-upper lid lifted (a sad, pleading tilt)
    return `M${pt(add(c, [-sd * r, 4 * s]))} C${pt(add(c, [-sd * r, -r * 0.95]))} ${pt(add(c, [sd * r * 0.75, -r * 0.82]))} ${pt(add(c, [sd * r, -2 * s]))} C${pt(add(c, [sd * r * 1.02, r * 0.88]))} ${pt(add(c, [-sd * r * 0.85, r * 0.98]))} ${pt(add(c, [-sd * r, 4 * s]))} Z`; };
  // wet strings between the jaws, sagging
  const strings = [[-0.62, -0.5], [0.5, -0.66]].map(([u, u2]) => {
    const ya = topY + 26 + Math.abs(u) * 34, yb = botY - 34 - Math.abs(u2) * 60;
    return `M${pt(P(mw * u, ya))} Q${pt(P(mw * (u + u2) * 0.5, yb + 30))} ${pt(P(mw * u2, yb))}`;
  });
  return <g>
    {/* ears behind the head */}
    {[earL, earR].map((e, i) => <Rimmed key={"e" + i} d={furPath(e, { len: 8, sweep: [0, -0.5], seed: 300 + i })} fill="url(#ahzFurFace)" off={[-6 * s, 7 * s]} />)}
    {[earInL, earInR].map((e, i) => <path key={"ei" + i} d={polyD(e)} fill={AHZ.ear} />)}
    {[earInL, earInR].map((e, i) => <path key={"et" + i} d={furPath(e.slice(0, Math.floor(e.length * 0.5)), { len: 16, every: 2, sweep: [0, -0.4], seed: 320 + i })} fill={AHZ.fur} opacity={0.9} />)}
    {/* head fur mass: wet clumps hanging down off the cheeks and chin */}
    <Rimmed d={furPath(head, { len: 26 * s, every: 3, step: 6 * s, sweep: [0, 0.9], seed: 11, mask: faceMask, lay: (p, n) => (n[1] < -0.3 ? 0.5 : 0.1) })} fill="url(#ahzFurFace)" off={[-7 * s, 8 * s]} />
    {/* bare dark face mask */}
    <path d={furPath(mask, { len: 8 * s, step: 5 * s, sweep: [0, 0.6], seed: 12, mask: (p, n) => (n[1] < -0.3 ? 1.6 : 0.4) })} fill="url(#ahzMask)" />
    {/* wet bangs hanging over the brow */}
    {[-1, 1].map((sd) => <Rimmed key={"b" + sd} d={furPath(smooth([P(sd * 4, -214), P(sd * 80, -204), P(sd * 130, -170), P(sd * 80, -128), P(sd * 16, -134)], 6, true), { len: 44 * s, every: 4, sweep: [sd * -0.2, 1], seed: 40 + sd, mask: (p, n) => (n[1] > 0.2 ? 1 : 0.15) })} fill={AHZ.fur} off={[-2 * s, 4 * s]} ink={2} rimOpacity={0.45} />)}
    {/* crying-baby brow: inner ends pushed up, creases between */}
    {[-1, 1].map((sd) => <g key={"w" + sd}>
      <path d={brow(sd)} stroke="#0a0b10" strokeWidth={7 * s} fill="none" strokeLinecap="round" />
      <path d={brow(sd)} stroke={AHZ.skinHi} strokeWidth={2.5 * s} fill="none" strokeLinecap="round" transform={`translate(0,${-5 * s})`} />
      <path d={`M${pt(P(sd * 14, -98))} Q${pt(P(sd * 22, -80))} ${pt(P(sd * 12, -62))}`} stroke="#0a0b10" strokeWidth={3.5 * s} fill="none" strokeLinecap="round" />
      <path d={`M${pt(P(sd * 40, 36))} Q${pt(P(sd * 96, 50))} ${pt(P(sd * (mw + 6), cornerY - 10))}`} stroke="#0a0b10" strokeWidth={5 * s} fill="none" strokeLinecap="round" />
      <path d={`M${pt(P(sd * 40, 32))} Q${pt(P(sd * 96, 44))} ${pt(P(sd * (mw + 6), cornerY - 16))}`} stroke={AHZ.skinHi} strokeWidth={2 * s} fill="none" strokeLinecap="round" opacity={0.8} />
      {/* bags under the eyes */}
      <path d={`M${pt(P(sd * 50, 34))} Q${pt(P(sd * 100, 50))} ${pt(P(sd * 150, 24))}`} stroke="#0a0b10" strokeWidth={3 * s} fill="none" strokeLinecap="round" opacity={0.8} />
    </g>)}
    {/* eyes: huge, low-set, baby-like, glowing with eyeshine */}
    {/* baby-fat cheeks */}
    {[-1, 1].map((sd) => <ellipse key={"ch" + sd} cx={cx + sd * 150 * s} cy={cy + 70 * s} rx={52 * s} ry={40 * s} fill="#5a5f78" opacity={0.18} />)}
    {[-1, 1].map((sd) => <GlowEye key={"g" + sd} c={P(sd * 98, -26)} r={60 * s} shape={eyeShape(sd)} look={look} pupil={0.11} glow={glow} halo={1.6} lid={0.2} tilt={sd * 13} />)}
    {/* wet lower lids */}
    {[-1, 1].map((sd) => <path key={"ll" + sd} d={`M${pt(P(sd * 46, 22))} Q${pt(P(sd * 96, 42))} ${pt(P(sd * 152, 10))}`} stroke={AHZ.gloss} strokeWidth={2 * s} fill="none" opacity={0.5} />)}
    {/* tear-wet streaks */}
    {[-1, 1].map((sd) => <path key={"tw" + sd} d={`M${pt(P(sd * 48, 18))} Q${pt(P(sd * 58, 60))} ${pt(P(sd * 66, cornerY - 4))}`} stroke={AHZ.water} strokeWidth={2.4 * s} fill="none" opacity={0.45} strokeLinecap="round" />)}
    {/* small human-like baby nose */}
    {[-1, 1].map((sd) => <ellipse key={"nw" + sd} cx={cx + sd * 15 * s} cy={cy + 36 * s} rx={10 * s} ry={8 * s} fill="#1a1b24" stroke="#050508" strokeWidth={2 * s} />)}
    <ellipse cx={cx} cy={cy + 28 * s} rx={14 * s} ry={14 * s} fill="#1e1f2a" stroke="#050508" strokeWidth={2 * s} />
    <ellipse cx={cx + 3 * s} cy={cy + 22 * s} rx={6 * s} ry={4 * s} fill="#9aa6c4" opacity={0.45} />
    {[-1, 1].map((sd) => <ellipse key={"n" + sd} cx={cx + sd * 10 * s} cy={cy + 40 * s} rx={5 * s} ry={3 * s} fill="#000" transform={`rotate(${sd * 25},${cx + sd * 10 * s},${cy + 40 * s})`} />)}
    <path d={`M${pt(P(0, 46))} L${pt(P(0, topY + 6))}`} stroke="#0a0b10" strokeWidth={3 * s} />
    {/* the mouth */}
    <path d={mouthD} fill="url(#ahzMouth)" stroke="#07070a" strokeWidth={8 * s} strokeLinejoin="round" />
    {o > 0.25 && <g opacity={Math.min(1, (o - 0.25) * 3)}>
      {/* ridged palate and a small baby tongue deep in the dark */}
      {[0.3, 0.5, 0.7].map((u, i) => <path key={i} d={`M${pt(P(-mw * u * 0.9, topY + 30 + i * 10))} Q${pt(P(0, topY + 18 + i * 14))} ${pt(P(mw * u * 0.9, topY + 30 + i * 10))}`} stroke="#5a1c26" strokeWidth={3 * s} fill="none" opacity={0.6} />)}
      <path d={`M${pt(P(-70, botY - 16))} Q${pt(P(-60, botY - 74))} ${pt(P(0, botY - 70))} Q${pt(P(60, botY - 74))} ${pt(P(70, botY - 16))} Z`} fill="#4a2430" stroke="#1a0a0e" strokeWidth={3 * s} />
      <path d={`M${pt(P(0, botY - 66))} L${pt(P(0, botY - 30))}`} stroke="#2a1018" strokeWidth={2.5 * s} />
      <path d={`M${pt(P(-36, botY - 58))} Q${pt(P(-10, botY - 66))} ${pt(P(10, botY - 64))}`} stroke="#8a5866" strokeWidth={2.5 * s} fill="none" opacity={0.6} />
    </g>}
    {/* two rows of needle teeth, the inner row smaller */}
    <path d={polyD(inner)} fill="none" />
    <path d={rowTeeth(upper, 30, 30, 500, 10)} fill="#9d9584" stroke="#07070a" strokeWidth={1 * s} opacity={0.85} />
    <path d={rowTeeth(lower, 30, 28, 700, 10)} fill="#9d9584" stroke="#07070a" strokeWidth={1 * s} opacity={0.85} />
    <path d={rowTeeth(upper, 26, 40, 100)} fill={AHZ.tooth} stroke="#07070a" strokeWidth={1.2 * s} />
    <path d={rowTeeth(lower, 24, 34, 200)} fill={AHZ.tooth} stroke="#07070a" strokeWidth={1.2 * s} />
    {/* saliva/water strings between the jaws */}
    {o > 0.4 && strings.map((d, i) => <path key={"s" + i} d={d} stroke={AHZ.water} strokeWidth={1.8 * s} fill="none" opacity={0.3} />)}
    {/* wet dark lips with a moonlit edge */}
    <path d={"M" + upper.map(pt).join(" L")} stroke="#34303e" strokeWidth={7 * s} fill="none" strokeLinecap="round" />
    <path d={"M" + upper.slice(4, -4).map((q) => pt(add(q, [0, -4 * s]))).join(" L")} stroke={AHZ.gloss} strokeWidth={1.8 * s} fill="none" opacity={0.55} strokeLinecap="round" />
    <path d={"M" + lower.map(pt).join(" L")} stroke="#34303e" strokeWidth={7 * s} fill="none" strokeLinecap="round" />
    <path d={"M" + lower.slice(10, -10).map((q) => pt(add(q, [0, 5 * s]))).join(" L")} stroke={AHZ.gloss} strokeWidth={2 * s} fill="none" opacity={0.4} strokeLinecap="round" />
    {/* skin stretched at the corners of the mouth */}
    {[-1, 1].map((sd) => [[-18, 28], [8, 36], [22, 18]].map(([dy, l], k) => <path key={"cr" + sd + k} d={`M${pt(P(sd * (mw + 10), cornerY + dy * 0.6))} q${sd * l * 0.5 * s},${dy * 0.3 * s} ${sd * l * s},${dy * 0.9 * s}`} stroke="#07070a" strokeWidth={3 * s} fill="none" strokeLinecap="round" opacity={0.8} />))}
    {/* whiskers */}
    {[-1, 1].map((sd) => [0, 1, 2].map((k) => <path key={"wh" + sd + k} d={`M${pt(P(sd * (60 + k * 6), 30 + k * 10))} Q${pt(P(sd * (180 + k * 20), 10 + k * 26))} ${pt(P(sd * (290 + k * 16), 30 + k * 50))}`} stroke="#b6c4dc" strokeWidth={1.4 * s} fill="none" opacity={0.4} />))}
    {/* gloss on the crown */}
    <path d={`M${pt(P(-60, -200))} Q${pt(P(40, -214))} ${pt(P(130, -176))}`} stroke={AHZ.gloss} strokeWidth={6 * s} fill="none" opacity={0.3} strokeLinecap="round" />
    <path d={`M${pt(P(150, -160))} Q${pt(P(200, -120))} ${pt(P(222, -50))}`} stroke="#fff" strokeWidth={2.5 * s} fill="none" opacity={0.5} strokeLinecap="round" />
    {drips.map((d, i) => <Drip key={"d" + i} p={d} s={s * 1.8} t={t} phase={rnd(i + 9)} fall={70} />)}
  </g>;
};
