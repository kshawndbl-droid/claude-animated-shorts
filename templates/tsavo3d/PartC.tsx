// "The Man-Eaters of Tsavo", Part C (story 39.82-65.34 s): Parliament, the platform at night and the shot, the lion
// carried in next morning, the second hunt (nine shots, no gore), Patterson's "135". Blender plates (tsavo_lords.py,
// tsavo_camp.py shots lords/platform/aim/carry/track/shots) with the flat cast placed in 3D through each camera.
// Video only: no subtitles and no audio (Part D assembles).
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, continueRender, delayRender } from "remotion";
import { Toon, ToonLook, INK } from "./toon";
import { FlatLion } from "./stick";
import { PATTERSON_T, WORKER_T } from "./ToonTest";
import camLords from "../../stories/tsavo/sets/lords.json";
import camPlatform from "../../stories/tsavo/sets/platform.json";
import camAim from "../../stories/tsavo/sets/aim.json";
import camCarry from "../../stories/tsavo/sets/carry.json";
import camTrack from "../../stories/tsavo/sets/track.json";
import camShots from "../../stories/tsavo/sets/shots.json";

const FPS = 30;
export const PARTC_START = 39.82;
export const PARTC_FRAMES = Math.round((65.34 - 39.82) * FPS); // 766
type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
type Pt = { x: number; y: number; ppm: number; z: number };
const proj = (cam: CamJ, f: number, p: [number, number, number]): Pt => {
  const c = cam.frames[String(f)] ?? cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z, z };
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const rr = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
/** a plate frame for frame f (1-based) of a shot rendered every `step` frames; returns the frame actually used */
const held = (f: number, step: number) => f - ((f - 1) % step);
const Plate: React.FC<{ shot: string; f: number; fg?: boolean }> = ({ shot, f, fg }) =>
  <Img src={staticFile(`tsavo3d/${shot}/${fg ? "fg" : "f"}_${String(f).padStart(4, "0")}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />;
const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) =>
  <svg width={1080} height={1920} style={{ position: "absolute", ...style }}>
    <defs>
      <filter id="soft"><feGaussianBlur stdDeviation="6" /></filter>
      <filter id="blur2"><feGaussianBlur stdDeviation="2" /></filter>
      <radialGradient id="flash"><stop offset="0" stopColor="#fffbe8" /><stop offset="0.3" stopColor="#ffd060" stopOpacity="0.9" /><stop offset="1" stopColor="#ff8020" stopOpacity="0" /></radialGradient>
      <radialGradient id="eyeglow"><stop offset="0" stopColor="#fff6b0" /><stop offset="0.35" stopColor="#f0c030" stopOpacity="0.7" /><stop offset="1" stopColor="#f0a020" stopOpacity="0" /></radialGradient>
      <radialGradient id="lamp" cx="0.45" cy="0.35" r="0.75"><stop offset="0" stopColor="#ffcf8a" stopOpacity="0.35" /><stop offset="1" stopColor="#000" stopOpacity="0.85" /></radialGradient>
    </defs>
    {children}
  </svg>;
/** a gentle handheld drift plus decaying kicks (recoil) at the given times */
const shake = (T: number, kicks: number[], amp = 14) => {
  let x = 2.5 * Math.sin(T * 1.3) + 1.5 * Math.sin(T * 2.9), y = 2 * Math.sin(T * 1.7 + 1);
  for (const k of kicks) {
    const u = T - k;
    if (u >= 0 && u < 0.4) { const e = Math.exp(-u * 12); x += amp * e * Math.sin(u * 70); y += amp * 0.7 * e * Math.cos(u * 55); }
  }
  return { x, y };
};

const PM_T: ToonLook = { skin: "#ecc2a0", top: "#25222a", topDark: "#141218", legs: "#3a3740", legsDark: "#26242a", boots: "#141014", hair: "#c9c4bc",
  hat: "none", mustache: true, belt: undefined };

/** the Prime Minister on his feet at the table, speaking across the chamber with a hand that rises and falls */
const Lords: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  const sf = held(f, 2), cam = camLords as CamJ;
  const P = proj(cam, sf, [1.3, 12.0, 0]);
  const g = sm((T - 0.6) / 0.5) * (1 - sm((T - 2.0) / 0.5)) + sm((T - 2.6) / 0.4) * (1 - sm((T - 3.8) / 0.4));
  const arm: [number, number] = [mix(4, 58, g) + 4 * Math.sin(T * 3) * g, mix(10, 45, g)];
  // the peers on the benches: torso and head above the seat, dark coats, a few white heads
  const peers = Array.from({ length: 44 }, (_, i) => {
    const s = i % 2 ? 1 : -1, k = 1 + Math.floor(rr(i, 1) * 3), y = 3.5 + rr(i, 2) * 18;
    return { i, x: s * (2.4 + k * 1.05 - 0.05 * s), y, z: 0.25 * k + 0.33, s };
  }).map((p) => ({ ...p, q: proj(cam, sf, [p.x, p.y, p.z]) })).sort((a, b) => b.q.z - a.q.z);
  return <>
    <Plate shot="lords" f={sf} />
    <Svg>
      {peers.map(({ i, q, s }) => {
        const u = q.ppm, bob = 0.01 * Math.sin(T * 1.3 + i), turn = -s * 0.03;
        const white = rr(i, 4) > 0.6;
        return <g key={i} transform={`translate(${q.x},${q.y}) scale(${u})`} style={{ filter: "brightness(0.8)" }}>
          <path d={`M-0.2,0 Q-0.22,-0.5 0,-0.56 Q0.22,-0.5 0.2,0 Z`} fill={rr(i, 3) > 0.5 ? "#1e1b22" : "#2a2228"} stroke={INK} strokeWidth={0.025} />
          <path d="M-0.05,-0.55 L0,-0.46 L0.05,-0.55" fill="#e8e2d8" stroke={INK} strokeWidth={0.015} />
          <circle cx={turn} cy={-0.7 + bob} r={0.13} fill="#e6bc98" stroke={INK} strokeWidth={0.025} />
          <path d={`M${turn - 0.13},${-0.72 + bob} Q${turn},${-0.9 + bob} ${turn + 0.13},${-0.72 + bob}`} fill={white ? "#e4e0da" : "#4a3a30"} stroke={INK} strokeWidth={0.02} />
        </g>;
      })}
      <Toon x={P.x} y={P.y} ppm={P.ppm} look={PM_T} flip pose={{ t: T, talk: T > 0.3 ? T : undefined, lookX: 0.6, armNear: arm, expr: "stern", blink: (T % 2.9) < 0.1 }} />
    </Svg>
  </>;
};

/** the rifle at the shoulder, aimed level: drawn in the figure's own space (metres, ground at 0, facing +x) */
const AimRifle: React.FC<{ x: number; y: number; ppm: number; flip?: boolean; kick?: number }> = ({ x, y, ppm, flip, kick = 0 }) =>
  <g transform={`translate(${x},${y}) scale(${(flip ? -1 : 1) * ppm},${ppm}) rotate(${-3 - 6 * kick},0.02,-0.9) translate(${-0.05 * kick},0)`}>
    <path d="M-0.04,-0.88 L0.22,-0.9 L0.26,-0.86 L0.02,-0.82 Z" fill="#7a4a26" stroke={INK} strokeWidth={0.014} />
    <rect x={0.2} y={-0.915} width={0.78} height={0.03} fill="#3a3436" stroke={INK} strokeWidth={0.01} />
  </g>;
/** the muzzle point of AimRifle in screen space */
const muzzle = (x: number, y: number, ppm: number, flip?: boolean) => {
  const a = (-3 * Math.PI) / 180, px = 0.98 - 0.02, py = -0.9 + 0.0;
  const rx = 0.02 + (px - 0.02) * Math.cos(a) - (py + 0.9) * Math.sin(a), ry = -0.9 + (px - 0.02) * Math.sin(a);
  return { x: x + (flip ? -1 : 1) * rx * ppm, y: y + ry * ppm };
};
const Flash: React.FC<{ x: number; y: number; r: number; k: number }> = ({ x, y, r, k }) => k <= 0 ? null :
  <g opacity={k}>
    <circle cx={x} cy={y} r={r * 2.2} fill="url(#flash)" />
    {[0, 1, 2, 3, 4, 5].map((i) => { const a = i * Math.PI / 3 + 0.3; return <path key={i} d={`M${x},${y} L${x + Math.cos(a) * r * 1.6},${y + Math.sin(a) * r * 1.6}`} stroke="#fff6c8" strokeWidth={r * 0.18} strokeLinecap="round" />; })}
  </g>;

/** low mist drifting over the grass at night */
const Mist: React.FC<{ cam: CamJ; f: number; T: number; c: [number, number]; n?: number }> = ({ cam, f, T, c, n = 14 }) =>
  <g filter="url(#soft)">{Array.from({ length: n }, (_, i) => {
    const p = proj(cam, f, [c[0] - 8 + 16 * rr(i, 1) + 0.25 * T, c[1] - 6 + 14 * rr(i, 2), 0.25 + 0.3 * rr(i, 3)]);
    return p.z > 7 ? <ellipse key={i} cx={p.x} cy={p.y} rx={2.6 * p.ppm} ry={0.35 * p.ppm} fill="rgb(150,170,210)" opacity={0.05 + 0.03 * Math.sin(T * 0.6 + i)} /> : null;
  })}</g>;

const NIGHT = 0.55;
/** night of 9 December: Patterson waiting on the platform, scanning the dark */
const Platform: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  const sf = held(f, 2), cam = camPlatform as CamJ;
  const P = proj(cam, sf, [14.3, -2.5, 3.04]);
  const look = T < 1.3 ? 0.4 : T < 2.4 ? -0.5 : 0.5;
  return <>
    <Plate shot="platform" f={sf} />
    <Svg>
      <Mist cam={cam} f={sf} T={T} c={[12, 0]} />
      <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} flip shade={NIGHT} pose={{ t: T, lookX: look, hold: "rifle", expr: "stern", blink: (T % 3.1) < 0.1 }} />
    </Svg>
  </>;
};

/** on the platform: eyes in the grass, the aim, the shot (local T 0..2.9; "fired" at 2.2) */
const Aim: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  const cam = camAim as CamJ, FIRE = 2.2;
  const sh = shake(T, [FIRE], 26);
  const P = proj(cam, 1, [14.21, -1.64, 3.04]);
  const raise = sm(T / 0.6);
  const kick = T > FIRE ? Math.exp(-(T - FIRE) * 9) : 0;
  const M = muzzle(P.x, P.y, P.ppm, true);
  const e = sm((T - 0.4) / 0.4) * (T < FIRE ? 1 : 0), u = sm((T - 0.4) / 1.8);
  const E = proj(cam, 1, [mix(9.0, 10.6, u), mix(5.6, 2.8, u), 0.62]);
  const blink = ((T + 0.3) % 1.4) < 0.08;
  const fl = T >= FIRE ? Math.max(0, 1 - (T - FIRE) / 0.12) : 0, white = T >= FIRE ? Math.max(0, 0.75 - (T - FIRE) * 4) : 0;
  const dark = sm((T - 2.45) / 0.4);
  return <>
    <AbsoluteFill style={{ transform: `translate(${sh.x}px,${sh.y}px) scale(${1.04 + 0.02 * T})` }}>
      <Plate shot="aim" f={1} />
      <Svg>
        <Mist cam={cam} f={1} T={T + 3} c={[9, 3]} n={10} />
        {e > 0 && !blink && [-1, 1].map((s) => <circle key={s} cx={E.x + s * 0.09 * E.ppm} cy={E.y} r={Math.max(5, 0.07 * E.ppm)} fill="url(#eyeglow)" opacity={e} />)}
        <AimRifle x={P.x} y={P.y} ppm={P.ppm} flip kick={kick} />
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} flip shade={NIGHT + 0.6 * fl} pose={{ t: T, lookX: 0.6, expr: "stern",
          armNear: [mix(4, 74, raise), mix(10, 16, raise)], armFar: [mix(2, 64, raise), mix(8, 40, raise)], blink: T > FIRE && T < FIRE + 0.12 }} />
        <Flash x={M.x} y={M.y} r={0.25 * P.ppm} k={fl} />
      </Svg>
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "#fff4dc", opacity: white }} />
    <AbsoluteFill style={{ background: "#000", opacity: dark }} />
  </>;
};

/** next morning: eight men carry the first lion on a litter of two poles (local T 0..3.7) */
const Carry: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  const sf = held(f, 2), cam = camCarry as CamJ;
  const D = [0.848, 0.53], R = [0.53, -0.848], B = [6.4, -9.0];
  const V = 0.75, s = -1.3 + V * T;
  const at = (ss: number, dd: number, z = 0) => proj(cam, sf, [B[0] + ss * R[0] + dd * D[0], B[1] + ss * R[1] + dd * D[1], z]);
  const man = (row: number, i: number) => {
    const o = 1.5 - i, P = at(s + o, row);
    return <Toon key={`${row}${i}`} x={P.x} y={P.y} ppm={P.ppm} look={WORKER_T} shade={row > 0 ? 0.85 : 1}
      pose={{ dist: s + o + 0.13 * i + row * 0.31, walk: 1, t: T + i, lookX: 0.2, armNear: [22, 30], armFar: [18, 38], blink: ((T + i * 0.7) % 3) < 0.1 }} />;
  };
  const pole = (row: number) => { const a = at(s - 2.1, row, 0.6), b = at(s + 2.1, row, 0.6);
    return <path d={`M${a.x},${a.y} L${b.x},${b.y}`} stroke="#6a4a2a" strokeWidth={Math.max(4, 0.06 * a.ppm)} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 1px ${INK})` }} />; };
  const L = at(s - 0.1, 0, 0.62);
  const fade = 1 - sm(T / 0.35);
  return <>
    <Plate shot="carry" f={sf} />
    <Svg>
      {[0, 1, 2, 3].map((i) => man(0.75, i))}
      {pole(0.75)}
      <g transform={`translate(${L.x},${L.y}) rotate(-2) translate(${-L.x},${-L.y})`}><FlatLion id="carried" x={L.x} y={L.y} ppm={L.ppm} pose={{ crouch: 1, eyes: "narrow", tail: 0.2 }} /></g>
      {pole(-0.75)}
      {[0, 1, 2, 3].map((i) => man(-0.75, i))}
    </Svg>
    <AbsoluteFill style={{ background: "#000", opacity: fade }} />
  </>;
};

/** 29 December: Patterson moves through the tall grass with his rifle (local T 0..3.8) */
const Track: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  const sf = held(f, 2), cam = camTrack as CamJ;
  const V = 0.9, d = V * Math.max(0, T - 0.15);
  const P = proj(cam, sf, [-6.3 + d, -11.0, 0]);
  return <>
    <Plate shot="track" f={sf} />
    <Svg>
      <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} pose={{ dist: d, walk: sm(T / 0.3), t: T, hold: "rifle", expr: "stern", lookX: T > 2.6 ? 0.8 : 0.5, blink: (T % 2.6) < 0.1 }} />
    </Svg>
    <Plate shot="track" f={sf} fg />
  </>;
};

/** the second lion in the grass ahead; nine shots; it falls out of sight (local T 0..1.62, "fell" at 1.4) */
const SHOT_T = [0.1, 0.25, 0.39, 0.53, 0.68, 0.82, 0.96, 1.1, 1.24];
const Shots: React.FC<{ f: number; T: number }> = ({ T }) => {
  const cam = camShots as CamJ;
  const sh = shake(T, SHOT_T, 12);
  const P = proj(cam, 1, [0.35, -9.88, 0]);
  const Lp = proj(cam, 1, [8.27, -6.6, 0]);
  const fall = sm((T - 1.35) / 0.25);
  const last = SHOT_T.filter((s) => s <= T).pop();
  const fl = last !== undefined ? Math.max(0, 1 - (T - last) / 0.07) : 0;
  const kick = last !== undefined ? Math.exp(-(T - last) * 14) : 0;
  const M = muzzle(P.x, P.y, P.ppm);
  return <AbsoluteFill style={{ transform: `translate(${sh.x}px,${sh.y}px) scale(1.05)` }}>
    <Plate shot="shots" f={1} />
    <Svg>
      <g opacity={1 - fall * 0.6} transform={`translate(0,${(0.22 + fall * 0.9) * Lp.ppm})`}>
        <FlatLion id="second" x={Lp.x} y={Lp.y} ppm={Lp.ppm} flip pose={{ crouch: 0.6 + 0.3 * fall, roar: T < 1.3 ? 0.6 + 0.3 * Math.sin(T * 9) : 0, eyes: "normal", look: -0.4 }} />
      </g>
    </Svg>
    <Plate shot="shots" f={1} fg />
    <Svg>
      <AimRifle x={P.x} y={P.y} ppm={P.ppm} kick={kick} />
      <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} pose={{ t: T, lookX: 0.7, expr: "stern", armNear: [74, 16], armFar: [64, 40] }} />
      <Flash x={M.x} y={M.y} r={0.25 * P.ppm} k={fl} />
    </Svg>
    <AbsoluteFill style={{ background: "#fff4dc", opacity: fl * 0.25 }} />
  </AbsoluteFill>;
};

/** Patterson's diary by lamplight; "135" is written in at "135" (local T 0..5.62, number at 2.72) */
const Card: React.FC<{ T: number }> = ({ T }) => {
  const W = sm((T - 2.6) / 0.7), z = 1.0 + 0.06 * T / 5.6, flick = 0.03 * Math.sin(T * 9) + 0.02 * Math.sin(T * 23);
  const lines = Array.from({ length: 13 }, (_, i) => i);
  return <AbsoluteFill style={{ background: "#120c08" }}>
    <AbsoluteFill style={{ transform: `scale(${z}) rotate(${-3 + 0.4 * T}deg)` }}>
      <Svg>
        <rect x={0} y={0} width={1080} height={1920} fill="#2a1a10" />
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M0,${200 * i + 60} L1080,${200 * i + 20}`} stroke="#1e120a" strokeWidth={8} opacity={0.5} />)}
        <g transform="translate(150,330) rotate(-2)">
          <rect x={0} y={0} width={790} height={1180} rx={10} fill="#e9dbb8" stroke={INK} strokeWidth={5} />
          <rect x={18} y={18} width={754} height={1144} fill="none" stroke="#c9b48a" strokeWidth={3} />
          {lines.map((i) => <path key={i} d={`M60,${300 + i * 62} L740,${300 + i * 62}`} stroke="#9bb0c8" strokeWidth={2} opacity={0.6} />)}
          <path d="M110,40 L110,1140" stroke="#c86a6a" strokeWidth={2} opacity={0.6} />
          <text x={140} y={150} fontFamily="Permanent Marker" fontSize={58} fill="#2a2440">Tsavo</text>
          <text x={140} y={225} fontFamily="Permanent Marker" fontSize={40} fill="#2a2440" opacity={0.85}>December 1898</text>
          {/* earlier entries: ink scribble lines, unreadable on purpose */}
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M140,${290 + i * 62} ${Array.from({ length: 14 }, (_, k) => `q16,${-14 - 8 * rr(i, k)} 32,0 t${18 + 14 * rr(k, i)},0`).join(" ")}`}
            stroke="#2a2440" strokeWidth={4} fill="none" opacity={0.75} strokeLinecap="round" />)}
          <clipPath id="write"><rect x={150} y={560} width={W * 520} height={360} /></clipPath>
          <text x={180} y={850} fontFamily="Permanent Marker" fontSize={300} fill="#3a1414" clipPath="url(#write)">135</text>
          {W > 0 && W < 1 && <circle cx={180 + W * 470} cy={760 + 60 * Math.sin(W * 20)} r={9} fill="#3a1414" />}
          <path d="M170,900 Q400,925 640,890" stroke="#3a1414" strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray="520" strokeDashoffset={520 * (1 - sm((T - 3.4) / 0.4))} />
        </g>
      </Svg>
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 45% 38%, rgba(255,200,120,0.12), rgba(0,0,0,0.78) 75%)", opacity: 1 + flick }} />
    <AbsoluteFill style={{ background: "#000", opacity: 1 - sm(T / 0.3) }} />
  </AbsoluteFill>;
};

const CUTS = [0, 4.32, 7.88, 10.78, 14.48, 18.28, 19.9, 25.6];
export const PartC: React.FC = () => {
  const fr = useCurrentFrame(), T = fr / FPS;
  const k = CUTS.findIndex((c, i) => T >= c && T < CUTS[i + 1]);
  const t = T - CUTS[k], f = Math.min(Math.round(t * FPS) + 1, [130, 107, 87, 111, 114, 49, 169][k]);
  const [h] = React.useState(() => delayRender("font"));
  React.useEffect(() => { document.fonts.load("300px 'Permanent Marker'").then(() => continueRender(h), () => continueRender(h)); }, [h]);
  return <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
    <style>{`@font-face{font-family:'Permanent Marker';src:url(${staticFile("fonts/permanent-marker-latin-400-normal.woff2")}) format('woff2');}`}</style>
    {k === 0 && <Lords f={f} T={t} />}
    {k === 1 && <Platform f={f} T={t} />}
    {k === 2 && <Aim f={f} T={t} />}
    {k === 3 && <Carry f={f} T={t} />}
    {k === 4 && <Track f={f} T={t} />}
    {k === 5 && <Shots f={f} T={t} />}
    {k === 6 && <Card T={t} />}
  </AbsoluteFill>;
};
