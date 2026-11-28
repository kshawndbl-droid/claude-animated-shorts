// Spider woman, true form, design v2 ("detailed horror", picked by the user): a glossy spider body wearing the torn
// gold obi and the spider-lily pattern of her kimono, long spiky bristled legs that arch high above her, her face as
// cracked porcelain with black eyes, a row of small extra eyes and a stretched needle-tooth grin, and her long hair
// thinning into web threads that are stuck to the floor. Same ink outline as the cast. Bloodless.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Kimono, INK } from "./kimono";
import { LADY } from "./CharTest";

type V = [number, number];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const len = (a: V) => Math.hypot(a[0], a[1]);
const nrm = (a: V): V => { const l = len(a) || 1; return [-a[1] / l, a[0] / l]; };
const pt = (p: V) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
const rnd = (i: number) => { const v = Math.sin(i * 91.7 + 13.1) * 43758.5453; return v - Math.floor(v); };

/** one leg segment: a tapered, slightly bulging capsule from a (width wa) to b (width wb) */
const segPath = (a: V, b: V, wa: number, wb: number) => {
  const n = nrm(sub(b, a)), mid = add(mul(add(a, b), 0.5), [0, 0]), wm = Math.max(wa, wb) * 0.62;
  const a1 = add(a, mul(n, wa / 2)), a2 = add(a, mul(n, -wa / 2)), b1 = add(b, mul(n, wb / 2)), b2 = add(b, mul(n, -wb / 2));
  const m1 = add(mid, mul(n, wm)), m2 = add(mid, mul(n, -wm));
  return `M${pt(a1)} Q${pt(m1)} ${pt(b1)} A${(wb / 2).toFixed(1)},${(wb / 2).toFixed(1)} 0 0 1 ${pt(b2)} Q${pt(m2)} ${pt(a2)} A${(wa / 2).toFixed(1)},${(wa / 2).toFixed(1)} 0 0 1 ${pt(a1)} Z`;
};

export const Leg: React.FC<{ p: V[]; s?: number; seed: number }> = ({ p, s = 1, seed }) => {
  const W = [34, 30, 22, 13, 3].map((w) => w * s);
  const segs = [0, 1, 2, 3].map((i) => ({ a: p[i], b: p[i + 1], wa: W[i], wb: W[i + 1] * (i === 3 ? 1 : 1.05) }));
  // bristles: short stiff hairs on both edges, raked toward the tip
  const hairs: string[] = [];
  segs.forEach((g, i) => {
    if (i === 0) return;
    const d = sub(g.b, g.a), L = len(d), n = nrm(d), u = mul(d, 1 / L), cnt = Math.floor(L / (13 * s));
    for (let k = 1; k < cnt; k++) {
      const t = k / cnt, w = (g.wa + (g.wb - g.wa) * t) / 2 + 2, base = add(g.a, mul(d, t));
      for (const side of [1, -1]) {
        const h = (9 + 10 * rnd(seed * 100 + i * 20 + k + side)) * s * (i === 3 ? 0.6 : 1);
        const st = add(base, mul(n, side * w)), en = add(st, add(mul(n, side * h * 0.8), mul(u, h * 0.6)));
        hairs.push(`M${pt(st)} L${pt(en)}`);
      }
    }
  });
  const tip = p[4], dirT = sub(p[4], p[3]), nT = nrm(dirT), uT = mul(dirT, 1 / len(dirT));
  const claw = `M${pt(add(tip, mul(nT, 4 * s)))} Q${pt(add(tip, mul(uT, 18 * s)))} ${pt(add(add(tip, mul(uT, 26 * s)), mul(nT, -10 * s)))} Q${pt(add(tip, mul(uT, 8 * s)))} ${pt(add(tip, mul(nT, -4 * s)))} Z`;
  return <g>
    <path d={hairs.join(" ")} stroke={INK} strokeWidth={2.6 * s} strokeLinecap="round" />
    {segs.map((g, i) => <path key={"o" + i} d={segPath(g.a, g.b, g.wa, g.wb)} fill={INK} stroke={INK} strokeWidth={7 * s} strokeLinejoin="round" />)}
    <path d={claw} fill="#0a0608" stroke={INK} strokeWidth={3 * s} />
    {segs.map((g, i) => <path key={"f" + i} d={segPath(g.a, g.b, g.wa, g.wb)} fill="url(#chitin)" />)}
    {/* gloss along the top edge of each segment, and a dull red band at each joint */}
    {segs.slice(0, 3).map((g, i) => { const n = nrm(sub(g.b, g.a)); const o = mul(n, -g.wa * 0.22);
      return <path key={"g" + i} d={`M${pt(add(add(g.a, mul(sub(g.b, g.a), 0.18)), o))} L${pt(add(add(g.a, mul(sub(g.b, g.a), 0.78)), o))}`} stroke="#c08ab0" strokeOpacity={0.55} strokeWidth={g.wa * 0.16} strokeLinecap="round" />; })}
    {[1, 2, 3].map((i) => <circle key={"j" + i} cx={p[i][0]} cy={p[i][1]} r={W[i] * 0.5} fill="#7a1020" stroke={INK} strokeWidth={4 * s} />)}
  </g>;
};

/** her face: cracked porcelain, black eyes with pinpoint red, extra small eyes, a too-wide needle-tooth grin */
/** morph: 0 = her calm human face (no cracks, human eyes, small lips), 1 = the approved true face (default) */
export const Face: React.FC<{ cx: number; cy: number; s: number; jaw?: number; morph?: number }> = ({ cx, cy, s, jaw = 0, morph = 1 }) => {
  const m = Math.max(0, Math.min(1, morph)), mk = 0.25 + 0.75 * m, my = 0.3 + 0.7 * m;
  const mouthT = `translate(${cx},${cy + 54 * s}) scale(${mk},${my}) translate(${-cx},${-(cy + 54 * s)})`;
  const P = (x: number, y: number) => `${(cx + x * s).toFixed(1)},${(cy + y * s).toFixed(1)}`;
  const teeth: string[] = [];
  for (let k = 0; k <= 18; k++) {
    const t = k / 18, x = -78 + 156 * t, yTop = 52 + 26 * Math.pow(Math.abs(t - 0.5) * 2, 2) * -1 + 8, up = k % 2 ? 1 : 0;
    teeth.push(`M${P(x - 3, yTop + 2)} L${P(x, yTop + 13 + 4 * up)} L${P(x + 3, yTop + 2)} Z`);
    const dj = jaw * 34 * (1 - Math.pow(2 * t - 1, 2)); // the jaw drops most in the middle of the grin
    teeth.push(`M${P(x - 3, yTop + 34 + dj)} L${P(x, yTop + 22 - 4 * up + dj)} L${P(x + 3, yTop + 34 + dj)} Z`);
  }
  const cracks = [
    [[-20, -96], [-28, -70], [-18, -52], [-34, -30], [-30, -12]],
    [[60, -80], [48, -60], [58, -44], [44, -20]],
    [[-88, 10], [-66, 18], [-70, 34], [-52, 44]],
    [[84, 20], [70, 30], [76, 48]],
    [[-6, 118], [2, 100], [-8, 92]],
  ].map((c) => "M" + c.map(([x, y]) => P(x, y)).join(" L"));
  return <g>
    <defs>
      <radialGradient id="porcelain" cx="45%" cy="35%" r="75%"><stop offset="0" stopColor="#fbf6f0" /><stop offset="0.7" stopColor="#ddd2c8" /><stop offset="1" stopColor="#a89a92" /></radialGradient>
    </defs>
    <path d={`M${P(0, -120)} Q${P(96, -118)} ${P(100, -10)} Q${P(98, 92)} ${P(0, 126)} Q${P(-98, 92)} ${P(-100, -10)} Q${P(-96, -118)} ${P(0, -120)} Z`} fill="url(#porcelain)" stroke={INK} strokeWidth={6 * s} />
    {cracks.map((d, i) => <g key={i} opacity={Math.min(1, m * 3)}><path d={d} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - m} stroke="#3a2a2a" strokeWidth={3.2 * s} fill="none" strokeLinejoin="bevel" /><path d={d} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - m} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.2 * s} fill="none" transform={`translate(${1.5 * s},${1.5 * s})`} /></g>)}
    {/* a chip missing from the porcelain, dark underneath */}
    <path d={`M${P(62, -96)} L${P(84, -70)} L${P(70, -64)} L${P(58, -80)} Z`} fill="#1a0e14" stroke={INK} strokeWidth={2 * s} opacity={m} />
    {/* extra eyes in an arc on the brow */}
    {m > 0.05 && [[-46, -78, 7], [-18, -90, 8], [18, -90, 8], [46, -78, 7]].map(([x, y, r0], i) => { const r = r0 * m; return <g key={i}>
      <circle cx={cx + x * s} cy={cy + y * s} r={r * s} fill="#050304" stroke={INK} strokeWidth={2 * s} />
      <circle cx={cx + (x - 2) * s} cy={cy + (y - 2) * s} r={1.8 * s} fill="#d8c8ff" opacity={0.8} /></g>; })}
    {/* main eyes: big, black, with a wet highlight and a pinpoint red */}
    {[-40, 40].map((x, i) => <g key={i}>
      {m < 1 && <path d={`M${P(x - 30, -24)} Q${P(x, -52)} ${P(x + 30, -24)} Q${P(x, 6)} ${P(x - 30, -24)} Z`} fill="#f4eee6" stroke={INK} strokeWidth={4 * s} />}
      {/* the black floods out from the iris until the whole eye is black */}
      <path transform={`translate(${cx + x * s},${cy - 22 * s}) scale(${0.36 + 0.64 * m}) translate(${-(cx + x * s)},${-(cy - 22 * s)})`} d={`M${P(x - 30, -24)} Q${P(x, -52)} ${P(x + 30, -24)} Q${P(x, 6)} ${P(x - 30, -24)} Z`} fill="#050304" stroke={INK} strokeWidth={4 * s} />
      <circle cx={cx + x * s} cy={cy - 22 * s} r={3.2 * s} fill="#ff2a2a" opacity={m} />
      <circle cx={cx + x * s} cy={cy - 22 * s} r={9 * s} fill="#ff2a2a" opacity={0.18 * m} />
      <path d={`M${P(x - 14, -36)} q${8 * s},${-6 * s} ${16 * s},${-3 * s}`} stroke="#ffffff" strokeOpacity={0.75} strokeWidth={3 * s} strokeLinecap="round" fill="none" />
      {/* dark tear streaks */}
      <path d={`M${P(x + (i ? 6 : -6), 2)} Q${P(x + (i ? 10 : -10), 30)} ${P(x + (i ? 4 : -4), 52)}`} stroke="#2a1a22" strokeOpacity={0.5 * m} strokeWidth={4 * s} fill="none" strokeLinecap="round" />
    </g>)}
    {/* the grin, stretched almost ear to ear */}
    <g transform={mouthT}>
    <path d={`M${P(-84, 54)} Q${P(0, 98)} ${P(84, 54)} Q${P(0, 120 + 68 * jaw)} ${P(-84, 54)} Z`} fill="#12060a" stroke={INK} strokeWidth={4 * s} />
    <path d={teeth.join(" ")} opacity={m} fill="#efe6da" stroke={INK} strokeWidth={0.8 * s} />
    <path d={`M${P(-84, 54)} Q${P(0, 98)} ${P(84, 54)}`} stroke={LADY.lips} strokeWidth={6 * s} fill="none" strokeLinecap="round" />
    <path d={`M${P(-84, 54)} l${-10 * s},${-8 * s} M${P(84, 54)} l${10 * s},${-8 * s}`} stroke="#3a2a2a" strokeWidth={3 * s} strokeLinecap="round" opacity={m} />
    </g>
  </g>;
};

/** hair: parted over the porcelain face, falling long, then splitting into web threads glued to the floor */
export const Hair: React.FC<{ cx: number; cy: number; s: number; floor: number }> = ({ cx, cy, s, floor }) => {
  const P = (x: number, y: number) => `${(cx + x * s).toFixed(1)},${(cy + y * s).toFixed(1)}`;
  const threads: string[] = [];
  for (let k = 0; k < 16; k++) {
    const side = k < 8 ? -1 : 1, j = k % 8;
    const x0 = side * (70 + j * 8), y0 = 200 + j * 6, x1 = side * (110 + j * 40 + 30 * rnd(k)), y1 = (floor - cy) / s;
    threads.push(`M${P(x0, y0)} Q${P(x0 + side * 20, (y0 + y1) / 2)} ${P(x1, y1)}`);
  }
  return <g>
    <path d={`M${P(0, -150)} Q${P(-150, -150)} ${P(-140, 20)} Q${P(-150, 150)} ${P(-96, 236)} L${P(-60, 210)} Q${P(-96, 120)} ${P(-104, 0)} Q${P(-100, -110)} ${P(0, -128)}
      Q${P(100, -110)} ${P(104, 0)} Q${P(96, 120)} ${P(60, 210)} L${P(96, 236)} Q${P(150, 150)} ${P(140, 20)} Q${P(150, -150)} ${P(0, -150)} Z`} fill="#0e0a10" stroke={INK} strokeWidth={5 * s} />
    {[-1, 1].map((sd) => <path key={sd} d={`M${P(sd * 20, -140)} Q${P(sd * 120, -120)} ${P(sd * 124, 40)}`} stroke="#ffffff" strokeOpacity={0.12} strokeWidth={4} fill="none" />)}
    {/* the kanzashi pin, still in her hair */}
    <path d={`M${P(60, -138)} L${P(120, -210)}`} stroke="#c9a24a" strokeWidth={6 * s} strokeLinecap="round" />
    <circle cx={cx + 124 * s} cy={cy - 214 * s} r={12 * s} fill="#c4202c" stroke={INK} strokeWidth={3 * s} />
  </g>;
};

export const LEGS_L: V[][] = [
  [[488, 1040], [440, 990], [330, 640], [150, 860], [96, 1500]],
  [[478, 1070], [400, 1040], [215, 760], [70, 1040], [50, 1520]],
  [[480, 1105], [410, 1110], [250, 930], [140, 1230], [175, 1545]],
  [[492, 1135], [450, 1160], [340, 1080], [290, 1320], [330, 1555]],
];
export const mirror = (l: V[]): V[] => l.map(([x, y]) => [1080 - x, y]);

export const JMonsterV2: React.FC = () => {
  const FLOOR = 1540;
  const legs = [...LEGS_L.map((l, i) => ({ l, i })), ...LEGS_L.map((l, i) => ({ l: mirror(l), i: i + 4 }))];
  const back = legs.filter((g) => g.i % 4 >= 2), front = legs.filter((g) => g.i % 4 < 2);
  return (
    <AbsoluteFill style={{ backgroundColor: "#07050a" }}>
      <Img src={staticFile("jorogumo/chartest/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920, opacity: 0.4, filter: "blur(3px) brightness(0.7)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="chitin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a2442" /><stop offset="0.5" stopColor="#2a1226" /><stop offset="1" stopColor="#12060f" /></linearGradient>
          <radialGradient id="abd" cx="38%" cy="30%" r="80%"><stop offset="0" stopColor="#6a3462" /><stop offset="0.45" stopColor="#3a1a36" /><stop offset="1" stopColor="#12060f" /></radialGradient>
          <radialGradient id="warm" cx="78%" cy="85%" r="55%"><stop offset="0" stopColor="#ff9a40" stopOpacity={0.45} /><stop offset="1" stopColor="#ff6020" stopOpacity={0} /></radialGradient>
          <radialGradient id="vig" cx="50%" cy="55%" r="70%"><stop offset="0.55" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.8} /></radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation={18} /></filter>
        </defs>
        <rect width={1080} height={1920} fill="url(#warm)" />
        <ellipse cx={540} cy={FLOOR + 10} rx={470} ry={60} fill="#000" opacity={0.7} filter="url(#soft)" />
        {back.map((g) => <Leg key={g.i} p={g.l} seed={g.i} />)}
        {/* abdomen: glossy, with the torn gold obi band and her kimono's spider lilies */}
        <g>
          <ellipse cx={540} cy={800} rx={250} ry={225} fill="url(#abd)" stroke={INK} strokeWidth={8} />
          {Array.from({ length: 60 }, (_, k) => { const a = (k / 60) * Math.PI * 2; const x = 540 + Math.cos(a) * 250, y = 800 + Math.sin(a) * 225;
            return <path key={k} d={`M${x},${y} l${Math.cos(a) * (8 + 8 * rnd(k))},${Math.sin(a) * (8 + 8 * rnd(k))}`} stroke={INK} strokeWidth={2.4} />; })}
          <path d="M300,830 Q540,900 780,830 L776,880 Q540,955 304,880 Z" fill={LADY.obi} stroke={INK} strokeWidth={5} />
          <path d="M330,848 Q540,912 750,848" stroke={LADY.obiDark} strokeWidth={5} fill="none" />
          <path d="M610,905 L630,960 L600,930 L612,990 L585,925 Z" fill={LADY.obi} stroke={INK} strokeWidth={3} />
          {[[470, 690, 1], [610, 720, 0.8], [540, 620, 0.7]].map(([x, y, k], i) => <g key={i}>{[0, 50, 100, 150, 200, 250, 300].map((r) =>
            <path key={r} d={`M${x},${y} q${22 * k * Math.cos(r * Math.PI / 180)},${22 * k * Math.sin(r * Math.PI / 180) - 14 * k} ${40 * k * Math.cos(r * Math.PI / 180)},${40 * k * Math.sin(r * Math.PI / 180)}`} stroke="#c42030" strokeWidth={4 * k} fill="none" strokeLinecap="round" />)}</g>)}
          <path d="M420,640 Q470,600 540,596" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={14} strokeLinecap="round" fill="none" />
          <path d="M650,960 Q720,920 760,850" stroke="#8aa0e0" strokeOpacity={0.35} strokeWidth={6} strokeLinecap="round" fill="none" />
        </g>
        {/* fangs under the face */}
        {[-1, 1].map((sd) => <path key={sd} d={`M${540 + sd * 34},1150 Q${540 + sd * 52},1215 ${540 + sd * 18},1252 Q${540 + sd * 30},1205 ${540 + sd * 14},1160 Z`} fill="#140a0e" stroke={INK} strokeWidth={4} />)}
        {front.map((g) => <Leg key={g.i} p={g.l} seed={g.i} />)}
        <Hair cx={540} cy={1030} s={1} floor={FLOOR} />
        <Face cx={540} cy={1030} s={1} />
        <rect width={1080} height={1920} fill="url(#vig)" />
        {/* small insets: her disguise next to her true face */}
        <g>
          <rect x={40} y={1600} width={480} height={290} rx={16} fill="#120c12" stroke="#3a2a30" strokeWidth={3} />
          <g clipPath="url(#ca)"><Kimono x={300} y={2380} ppm={540} look={LADY} flip pose={{ t: 1, expr: "eerie", glide: true, armNear: [8, 72], armFar: [6, 78] }} /></g>
          <clipPath id="ca"><rect x={40} y={1600} width={480} height={290} rx={16} /></clipPath>
          <text x={60} y={1640} fontFamily="Georgia, serif" fontSize={26} fill="#f1e6d8">the disguise</text>
          <rect x={560} y={1600} width={480} height={290} rx={16} fill="#120c12" stroke="#3a2a30" strokeWidth={3} />
          <g clipPath="url(#cb)"><Hair cx={800} cy={1770} s={0.95} floor={1900} /><Face cx={800} cy={1770} s={0.95} /></g>
          <clipPath id="cb"><rect x={560} y={1600} width={480} height={290} rx={16} /></clipPath>
          <text x={580} y={1640} fontFamily="Georgia, serif" fontSize={26} fill="#f1e6d8">the true face</text>
        </g>
        <text x={540} y={90} fontFamily="Georgia, serif" fontSize={60} fill="#f1e6d8" textAnchor="middle" fontWeight={700}>The Spider Woman</text>
        <text x={540} y={140} fontFamily="Georgia, serif" fontSize={28} fill="#b8a8a0" textAnchor="middle">true form · design v2 · Jorōgumo (legend)</text>
      </svg>
    </AbsoluteFill>
  );
};

/** the approved true form as one piece for animation: legs unfold (k 0 -> 1), face morph and jaw; drawn in sheet space */
export const MonsterBody: React.FC<{ k: number; morph: number; jaw: number; t: number }> = ({ k, morph, jaw, t }) => {
  const FLOOR = 1540, kk = Math.max(0, Math.min(1, k));
  const legs = [...LEGS_L.map((l, i) => ({ l, i })), ...LEGS_L.map((l, i) => ({ l: mirror(l), i: i + 4 }))].map((g) => {
    const r = g.l[0], ki = Math.max(0, Math.min(1, kk * 1.25 - (g.i % 4) * 0.08));
    const tw = 6 * Math.sin(t * 9 + g.i * 1.7) * ki;   // the tips twitch once they are out
    return { ...g, l: g.l.map(([x, y], n) => n === 0 ? [x, y] as V : [r[0] + (x - r[0]) * ki + (n > 2 ? tw : 0), r[1] + (y - r[1]) * ki] as V) };
  });
  const back = legs.filter((g) => g.i % 4 >= 2), front = legs.filter((g) => g.i % 4 < 2);
  const ab = 0.35 + 0.65 * kk;   // the abdomen swells up behind her as the legs come out
  return <g>
    <defs>
      <radialGradient id="abd" cx="38%" cy="30%" r="80%"><stop offset="0" stopColor="#6a3462" /><stop offset="0.45" stopColor="#3a1a36" /><stop offset="1" stopColor="#12060f" /></radialGradient>
      <linearGradient id="chitin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a2442" /><stop offset="0.5" stopColor="#2a1226" /><stop offset="1" stopColor="#12060f" /></linearGradient>
    </defs>
    {back.map((g) => <Leg key={g.i} p={g.l} seed={g.i} />)}
    <g transform={`translate(540,1000) scale(${ab}) translate(-540,-1000)`}>
      <ellipse cx={540} cy={800} rx={250} ry={225} fill="url(#abd)" stroke={INK} strokeWidth={8} />
      <path d="M300,830 Q540,900 780,830 L776,880 Q540,955 304,880 Z" fill={LADY.obi} stroke={INK} strokeWidth={5} />
      <path d="M330,848 Q540,912 750,848" stroke={LADY.obiDark} strokeWidth={5} fill="none" />
      {[[470, 690, 1], [610, 720, 0.8], [540, 620, 0.7]].map(([x, y, q], i) => <g key={i}>{[0, 50, 100, 150, 200, 250, 300].map((r) =>
        <path key={r} d={`M${x},${y} q${22 * q * Math.cos(r * Math.PI / 180)},${22 * q * Math.sin(r * Math.PI / 180) - 14 * q} ${40 * q * Math.cos(r * Math.PI / 180)},${40 * q * Math.sin(r * Math.PI / 180)}`} stroke="#c42030" strokeWidth={4 * q} fill="none" strokeLinecap="round" />)}</g>)}
      <path d="M420,640 Q470,600 540,596" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={14} strokeLinecap="round" fill="none" />
    </g>
    {[-1, 1].map((sd) => <path key={sd} opacity={morph} d={`M${540 + sd * 34},1150 Q${540 + sd * 52},${1215 + 20 * jaw} ${540 + sd * 18},${1252 + 30 * jaw} Q${540 + sd * 30},1205 ${540 + sd * 14},1160 Z`} fill="#140a0e" stroke={INK} strokeWidth={4} />)}
    {front.map((g) => <Leg key={g.i} p={g.l} seed={g.i} />)}
    <Hair cx={540} cy={1030} s={1} floor={FLOOR} />
    <Face cx={540} cy={1030} s={1} jaw={jaw} morph={morph} />
  </g>;
};

