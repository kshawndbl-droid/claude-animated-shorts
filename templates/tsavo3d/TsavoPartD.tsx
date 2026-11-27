// Part D of "The Man-Eaters of Tsavo" (story 65.34 s to the end): the 2009 lab, the "135 -> about 35" card, Patterson's
// study with the two lion-skin rugs, and the Field Museum in Chicago. Blender interiors (tools/blender/tsavo_interiors.py)
// with the flat 2D cast (Toon) and the lions (FlatLion) placed in 3D through each frame's camera. Video only: no audio,
// no subtitles (those are added in the final assembly).
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Card, useMarkerFont } from "../mailed/common";
import { Toon, ToonLook, INK } from "./toon";
import { FlatLion } from "./stick";
import { PATTERSON_T } from "./ToonTest";
import wordsJson from "../../stories/tsavo/final/words.json";
import camLab from "../../stories/tsavo/sets/lab.json";
import camLabClose from "../../stories/tsavo/sets/labclose.json";
import camStudy from "../../stories/tsavo/sets/study.json";
import camMuseum from "../../stories/tsavo/sets/museum.json";
import camMuseumClose from "../../stories/tsavo/sets/museumclose.json";

const FPS = 30, STEP = 2;
export const OFFD = 65.34, ENDD = 84.5;
export const PARTD_FRAMES = Math.round((ENDD - OFFD) * FPS);
const WORDS = (wordsJson as any[]).map((w) => ({ w: String(w.w), s: Number(w.s) }));
const W = (w: string, n = 0) => WORDS.filter((x) => x.s > 65 && x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w)[n]?.s ?? 0;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const rr = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
const plateFrame = (t: number, n: number) => Math.min(n - (n % 2 === 0 ? 1 : 0), 1 + STEP * Math.floor((t * FPS) / STEP));
const project = (cam: CamJ, f: number, p: [number, number, number]) => {
  const c = cam.frames[String(f)] ?? cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z };
};
const walk = (T: number, t0: number, t1: number, V: number) => {
  const v = (t: number) => V * sm((t - t0) / 0.5) * sm((t1 - t) / 0.5);
  let s = 0; const dt = 1 / 240;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};

const SCIENTIST: ToonLook = { skin: "#c99a78", top: "#f4f4f0", topDark: "#c8c8c2", legs: "#3a4050", legsDark: "#2a3040", boots: "#202020", hair: "#2a1e18", hat: "none", long: true };
const COLLEAGUE: ToonLook = { skin: "#7a5236", top: "#eef0ec", topDark: "#c4c6c0", legs: "#5a5040", legsDark: "#433c30", boots: "#2a2420", hair: "#121010", hat: "none", long: true };
const OLD_PATTERSON: ToonLook = { ...PATTERSON_T, hair: "#c4beb4", hat: "none", top: "#5a4636", topDark: "#3e3026", legs: "#3e342a", legsDark: "#2c241c", belt: "#2a1e14" };
const VISITOR: ToonLook = { skin: "#e0b090", top: "#a8402e", topDark: "#7a2c20", legs: "#2c3a52", legsDark: "#1e2a3c", boots: "#3a2a20", hair: "#3a2416", hat: "none" };

const Plate: React.FC<{ shot: string; f: number; blur?: number }> = ({ shot, f, blur = 0 }) => (
  <Img src={staticFile(`tsavo3d/${shot}/f_${String(f).padStart(4, "0")}.png`)}
    style={{ position: "absolute", width: 1080, height: 1920, filter: blur ? `blur(${blur}px) brightness(0.7)` : undefined, transform: blur ? "scale(1.04)" : undefined }} />
);

/** soft motes drifting in a light beam (screen space, a slow upward drift with a little sway) */
const Motes: React.FC<{ T: number; box: [number, number, number, number]; n: number; col: string; o?: number; rise?: number }> = ({ T, box, n, col, o = 0.5, rise = 12 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const [x0, y0, x1, y1] = box, h = y1 - y0;
      const x = x0 + (x1 - x0) * rr(i, 1) + 18 * Math.sin(T * (0.3 + rr(i, 2) * 0.5) + i);
      const y = y1 - ((h * rr(i, 3) + rise * T * (0.5 + rr(i, 4))) % h);
      const r = 1.5 + 3.5 * rr(i, 5);
      return <circle key={i} cx={x} cy={y} r={r} fill={col} opacity={o * (0.4 + 0.6 * Math.sin(T * (1 + rr(i, 6)) + i) ** 2)} />;
    })}
  </g>
);

type ShotP = { T: number; a: number; b: number };

const S_Lab: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 122), cam = camLab as CamJ;
  const P = project(cam, f, [-1.0, 2.9, 0]), Q = project(cam, f, [2.3, 2.05, 0]);
  // leaning into the microscope, then straightening up and looking over at the samples as "bones and fur" is said
  const up = sm((T - (W("tested") - 0.1)) / 0.5);
  const lean: [number, number] = [70 - 50 * up, 55 - 30 * up], far: [number, number] = [62 - 40 * up, 60 - 30 * up];
  return (
    <AbsoluteFill>
      <Plate shot="lab" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Toon x={Q.x} y={Q.y} ppm={Q.ppm} look={COLLEAGUE} flip pose={{ t: T + 1.7, lookX: 0.3, blink: (T % 2.9) < 0.1, armNear: [35 + 4 * Math.sin(T * 1.3), 85] }} shade={0.9} />
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={SCIENTIST} pose={{ t: T, lookX: 0.5, tilt: 14 * (1 - up), blink: (T % 3.1) < 0.1, armNear: lean, armFar: far, expr: "neutral" }} />
        <Motes T={T} box={[120, 500, 1000, 1000]} n={26} col="#f2f6ff" o={0.35} rise={8} />
      </svg>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Card k={Math.min((t - 0.25) / 0.35, (W("scientists") + 0.2 - T) / 0.25)} text="2009" y={260} w={360} />
      </svg>
    </AbsoluteFill>
  );
};

const S_LabClose: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = Math.min(59, plateFrame(t, 60));
  return (
    <AbsoluteFill>
      <Plate shot="labclose" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Motes T={T} box={[0, 300, 1080, 1300]} n={18} col="#ffffff" o={0.25} rise={6} />
        <Card k={(t - 0.2) / 0.3} text="BONES + FUR" y={300} w={560} sub="chemical tests" rot={2} />
      </svg>
    </AbsoluteFill>
  );
};

/** "135" (Patterson's claim) struck through, then "ABOUT 35" pops up; "may have killed more" as a note */
const S_Count: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a;
  const k1 = sm(t / 0.3), strike = sm((T - W("likely")) / 0.35), k2 = clamp01((T - W("about") + 0.05) / 0.3), k3 = sm((T - W("may") + 0.1) / 0.4);
  const pop = k2 > 0 ? 1 + 0.18 * Math.sin(Math.PI * k2) : 0;
  return (
    <AbsoluteFill>
      <Plate shot="labclose" f={59} blur={14} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <g transform={`translate(540,760) rotate(-3) scale(${0.9 + 0.1 * k1 + 0.01 * t})`} opacity={k1}>
          <rect x={-360} y={-250} width={720} height={500} rx={18} fill="#f4ecd8" stroke={INK} strokeWidth={8} />
          {Array.from({ length: 7 }, (_, i) => <line key={i} x1={-320} x2={320} y1={-160 + i * 62} y2={-160 + i * 62} stroke="#9fb4c8" strokeWidth={3} opacity={0.6} />)}
          <text x={0} y={-215} textAnchor="middle" fontFamily="MarkerFont" fontSize={40} fill="#6a4a3a">PATTERSON'S CLAIM</text>
          <text x={0} y={90} textAnchor="middle" fontFamily="MarkerFont" fontSize={260} fill="#2a1e1a" opacity={1 - 0.45 * strike}>135</text>
          <path d={`M-250,10 L${-250 + 500 * strike},${10 - 60 * strike}`} stroke="#c0281e" strokeWidth={26} strokeLinecap="round" />
        </g>
        {k2 > 0 && <g transform={`translate(540,1190) rotate(2) scale(${pop})`}>
          <rect x={-330} y={-120} width={660} height={240} rx={24} fill="#fffaf0" stroke={INK} strokeWidth={8} />
          <text x={0} y={-48} textAnchor="middle" fontFamily="MarkerFont" fontSize={40} fill="#6a4a3a">2009 TESTS</text>
          <text x={0} y={70} textAnchor="middle" fontFamily="MarkerFont" fontSize={120} fill="#0f8fb0">ABOUT 35</text>
        </g>}
        {k3 > 0 && <text x={540} y={1380} textAnchor="middle" fontFamily="MarkerFont" fontSize={46} fill="#fff4dc" opacity={k3} stroke={INK} strokeWidth={2}>(they may have killed more)</text>}
      </svg>
    </AbsoluteFill>
  );
};

const S_Study: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 130), cam = camStudy as CamJ;
  const P = project(cam, f, [0.45, 3.7, 0]);
  const flick = 0.06 * Math.sin(T * 9) + 0.04 * Math.sin(T * 23 + 1);
  return (
    <AbsoluteFill>
      <Plate shot="study" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={OLD_PATTERSON} flip pose={{ t: T, lookX: 0.2, tilt: 10, blink: (T % 3.4) < 0.1, expr: "stern" }} shade={0.85} />
        <Motes T={T} box={[700, 380, 960, 640]} n={10} col="#ffb050" o={0.7} rise={40} />
        <Card k={Math.min((t - 0.15) / 0.35, (W("skins") + 0.4 - T) / 0.25)} text="25 YEARS" y={250} w={460} rot={-2} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 80% 30%, rgba(255,140,40,0.18), rgba(0,0,0,0) 55%)", opacity: 0.7 + flick }} />
    </AbsoluteFill>
  );
};

// the case and its two mounted lions (shared by both museum shots); the case front glass is at y = 3.32
const LION1: [number, number, number] = [-0.25, 3.95, 0.52], LION2: [number, number, number] = [1.4, 4.9, 0.52];
const Glass: React.FC<{ cam: CamJ; f: number; T: number }> = ({ cam, f, T }) => {
  const c = [[-2.05, 3.32, 0.5], [2.25, 3.32, 0.5], [2.25, 3.32, 3.0], [-2.05, 3.32, 3.0]].map((p) => project(cam, f, p as [number, number, number]));
  const sx = (T * 0.05) % 1;
  return (
    <g>
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset={0} stopColor="#fff" stopOpacity={0} />
          <stop offset={0.25 + 0.2 * sx} stopColor="#fff" stopOpacity={0.14} />
          <stop offset={0.32 + 0.2 * sx} stopColor="#fff" stopOpacity={0} />
          <stop offset={0.55 + 0.2 * sx} stopColor="#fff" stopOpacity={0.08} />
          <stop offset={0.6 + 0.2 * sx} stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={c.map((p) => `${p.x},${p.y}`).join(" ")} fill="url(#sheen)" />
    </g>
  );
};
const Lions: React.FC<{ cam: CamJ; f: number; T: number }> = ({ cam, f, T }) => {
  const A = project(cam, f, LION1), B = project(cam, f, LION2);
  return (
    <g>
      <FlatLion id="m2" x={B.x} y={B.y} ppm={B.ppm} flip pose={{ crouch: 0.0, eyes: "normal", tail: 0.2, look: 0.6 }} shade={0.92} />
      <FlatLion id="m1" x={A.x} y={A.y} ppm={A.ppm} flip pose={{ crouch: 0.55, eyes: "narrow", tail: 0.5, look: 0.3 }} shade={0.98} />
    </g>
  );
};

const S_Museum: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 110), cam = camMuseum as CamJ;
  const v = walk(T, a + 0.2, a + 3.0, 0.9);
  const V = project(cam, f, [-3.4 + v.s, 2.25, 0]);
  return (
    <AbsoluteFill>
      <Plate shot="museum" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Lions cam={cam} f={f} T={T} />
        <Motes T={T} box={[180, 620, 980, 1100]} n={30} col="#fff0d0" o={0.4} rise={6} />
        <Glass cam={cam} f={f} T={T} />
        <Toon x={V.x} y={V.y} ppm={V.ppm} look={VISITOR} pose={{ dist: v.s, walk: v.w, t: T, lookX: 0.5, blink: (T % 3.0) < 0.1 }} shade={0.62} />
        <Card k={(T - W("field") + 0.1) / 0.35} text="FIELD MUSEUM" y={250} w={600} sub="Chicago" rot={-2} />
      </svg>
    </AbsoluteFill>
  );
};

const S_MuseumClose: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, f = plateFrame(t, 100), cam = camMuseumClose as CamJ;
  const V = project(cam, f, [-1.0, 2.25, 0]);
  const glint = sm((T - W("eye") + 0.1) / 0.25) * (1 - sm((T - W("eye") - 0.6) / 0.4));
  const CL: [number, number, number] = [1.55, 4.4, 0.52];
  const L = project(cam, f, CL), E = project(cam, f, [CL[0] - 1.27, CL[1], CL[2] + 1.1]);
  return (
    <AbsoluteFill>
      <Plate shot="museumclose" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <FlatLion id="mc" x={L.x} y={L.y} ppm={L.ppm} flip pose={{ crouch: 0.0, eyes: "normal", tail: 0.2, look: 0.6 }} shade={0.95} />
        {glint > 0 && <circle cx={E.x} cy={E.y} r={10 + 30 * glint} fill="#fff6d8" opacity={0.55 * glint} />}
        <Glass cam={cam} f={f} T={T} />
      </svg>
    </AbsoluteFill>
  );
};

const SHOTS: [number, React.FC<ShotP>][] = [[OFFD, S_Lab], [68.3, S_LabClose], [69.55, S_Count], [73.3, S_Study], [77.6, S_Museum], [81.6, S_MuseumClose]];

export const TsavoPartD: React.FC = () => {
  useMarkerFont();
  const fr = useCurrentFrame(), T = OFFD + fr / FPS;
  let k = SHOTS.findIndex(([s0], i) => T >= s0 && T < (SHOTS[i + 1]?.[0] ?? 1e9));
  if (k < 0) k = 0;
  const [a, S] = SHOTS[k], b = SHOTS[k + 1]?.[0] ?? ENDD;
  const cutK = SHOTS.slice(1).reduce((m, [c]) => Math.min(m, Math.abs(T - c) * FPS), 99);
  const fadeOut = interpolate(T, [ENDD - 0.9, ENDD - 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#07070d" }}>
      <S T={T} a={a} b={b} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(5,3,10,0.45) 100%)" }} />
      {cutK < 1.5 && <AbsoluteFill style={{ background: "#000", opacity: 0.3 * (1.5 - cutK) / 1.5 }} />}
      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  );
};
