// Style test for "The Man-Eaters of Tsavo" in the 3D-set look: Blender-rendered sets (tools/blender/tsavo_camp.py)
// with our flat 2D cast drawn on top, placed on the 3D ground through each frame's camera (cam.json), so they stand
// in the set and stay put while the camera moves. Narration lines 2 to 3 (story time 6.6 s to 17.9 s).
import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import { Card, useMarkerFont } from "../mailed/common";
import { Stick, FlatLion, StickLook, INK } from "./stick";
import wordsJson from "../../stories/tsavo/final/words.json";
import camPatterson from "../../stories/tsavo/sets/patterson.json";
import camNight from "../../stories/tsavo/sets/campnight.json";
import camGrass from "../../stories/tsavo/sets/grass.json";
import camCreep from "../../stories/tsavo/sets/creep.json";

const FPS = 30, STEP = 2;
export const OFF3 = 6.6, END3 = 17.95;
export const TSAVO3D_FRAMES = Math.round((END3 - OFF3) * FPS);
const WORDS: Word[] = (wordsJson as any[]).map((w) => ({ w: w.w, s: w.s, e: w.e }));
const W = (w: string, n = 0) => WORDS.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w)[n]?.s ?? 0;
const KEY = ["tsavo", "river", "british", "engineer", "john", "henry", "patterson", "attacks", "lions", "manes", "camp", "dark"];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ramp = (t: number, a: number, d = 0.3) => { const c = clamp01((t - a) / d); return c * c * (3 - 2 * c); };

type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
/** the rendered frame shown at shot-local time t (sets are rendered on every 2nd frame) */
const plateFrame = (t: number, n: number) => Math.min(n - (n % 2 === 0 ? 1 : 0), 1 + STEP * Math.floor((t * FPS) / STEP));
/** world point -> screen px on the 1080x1920 frame + pixels per metre at that depth (Blender camera, sensor fit AUTO = height) */
const project = (cam: CamJ, f: number, p: [number, number, number]) => {
  const c = cam.frames[String(f)] ?? cam.frames["1"];
  const m = c.m;
  // inverse of a rigid transform: R^T (p - t)
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z };
};
const Plate: React.FC<{ shot: string; f: number; blur?: number; bright?: number }> = ({ shot, f, blur = 0, bright = 1 }) => (
  <Img src={staticFile(`tsavo3d/${shot}/f_${String(f).padStart(4, "0")}.png`)}
    style={{ position: "absolute", width: 1080, height: 1920, filter: `${blur ? `blur(${blur}px) ` : ""}brightness(${bright})` }} />
);

const PATTERSON: StickLook = { skin: "#f2c6a0", top: "#bfa06a", topDark: "#8e7444", legs: "#8e7444", boots: "#4a2e1a", hair: "#5a3a22",
  hat: "pith", hatCol: "#ece2c6", band: "#8a7450", mustache: true, belt: "#5a3a22" };
const WORKER: StickLook = { skin: "#b07850", top: "#ece4d2", topDark: "#b8ae98", legs: "#d8ccb0", boots: "#5a3a22", hair: "#1a1210",
  hat: "turban", hatCol: "#e8892a", band: "#b05e14", mustache: true };
const WORKER2: StickLook = { ...WORKER, skin: "#9a6440", top: "#c9b48a", topDark: "#a08a62", hatCol: "#f2ede0", band: "#cfc6b0", mustache: false };

type ShotP = { T: number; a: number; b: number };
/** walk along a straight ground line: no foot sliding when the stride matches the cycle (1.3 m per cycle) */
const walkPos = (T: number, t0: number, t1: number, from: [number, number], to: [number, number], stride = 1.3) => {
  const u = clamp01((T - t0) / (t1 - t0)), k = Easing.inOut(Easing.sin)(u);
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return { x: from[0] + (to[0] - from[0]) * k, y: from[1] + (to[1] - from[1]) * k, phase: (k * L) / stride, walk: T > t0 && T < t1 ? Math.min(1, (T - t0) / 0.2, (t1 - T) / 0.2) : 0 };
};

// 1. dusk by the line: Patterson walks up beside the track, points back toward the bridge, then faces us
const S_Patterson: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 165);
  const wp = walkPos(T, a + 0.2, W("british") - 0.2, [1.4, 2.6], [2.2, -1.3]);
  const P = project(camPatterson as CamJ, f, [wp.x, wp.y, 0]);
  const pointing = T > W("led") - 0.1 && T < W("john") - 0.1, named = T > W("john") - 0.1;
  const wk = walkPos(T, a, a + 5.6, [6.0, 6.0], [5.7, 0.6]);
  const Wk = project(camPatterson as CamJ, f, [wk.x, wk.y, 0]);
  return (
    <AbsoluteFill>
      <Plate shot="patterson" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Stick id="w1" x={Wk.x} y={Wk.y} ppm={Wk.ppm} look={WORKER} pose={{ phase: wk.phase, walk: wk.walk, hold: "plank", armR: [-60, -50], lookX: -0.2 }} shade={0.92} />
        <Stick id="pat" x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON} flip={!named && !pointing}
          pose={{ phase: wp.phase, walk: wp.walk, expr: named ? "stern" : "neutral", talk: undefined, blink: (T % 3.1) < 0.12,
            armR: pointing ? [-150 + 6 * Math.sin(T * 3), 8] : named ? [-30, -110] : undefined, armL: named ? [-25, -110] : undefined, lookX: pointing ? 1 : 0.2 }} />
        <Card k={Math.min((T - a - 0.3) / 0.35, (W("john") - 0.15 - T) / 0.25)} text="KENYA, 1898" y={210} w={520} />
        <Card k={(T - W("john") + 0.05) / 0.35} text="J. H. PATTERSON" y={230} w={640} sub="railway engineer" rot={2} />
      </svg>
    </AbsoluteFill>
  );
};

// 2. night over the camp: wide, high; two workers warm themselves at a fire
const S_Night: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 45);
  const fig = (x: number, y: number, look: StickLook, flip: boolean, id: string, seed: number) => {
    const p = project(camNight as CamJ, f, [x, y, 0]);
    return <Stick id={id} x={p.x} y={p.y} ppm={p.ppm} look={look} flip={flip} shade={0.75} pose={{ armR: [-40 + 6 * Math.sin(T * 2 + seed), -40], armL: [-30, -50], lookX: flip ? -1 : 1, bob: 0.01 * Math.sin(T * 2 + seed) }} />;
  };
  return (
    <AbsoluteFill>
      <Plate shot="campnight" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {fig(-0.4, 9.0, WORKER, false, "n1", 0)}
        {fig(1.6, 9.9, WORKER2, true, "n2", 2)}
      </svg>
    </AbsoluteFill>
  );
};

// 3. outside the thorn fence, low in the grass: two pairs of eyes light up, then the lions rise into a crouch
const S_Grass: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 66);
  const eyes = T > W("two") - 0.12, rise = ramp(T, W("both") - 0.3, 0.8);
  const L1 = project(camGrass as CamJ, f, [-1.2, -8.4, 0]), L2 = project(camGrass as CamJ, f, [-4.1, -9.0, 0]);
  return (
    <AbsoluteFill>
      <Plate shot="grass" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <g transform={`translate(0,${(1 - rise) * 120})`}>
          <FlatLion id="g1" x={L1.x} y={L1.y} ppm={L1.ppm} flip pose={{ crouch: 1, eyes: eyes ? "glow" : "narrow", tail: T, look: -1 }} shade={0.55} />
          <FlatLion id="g2" x={L2.x} y={L2.y} ppm={L2.ppm} pose={{ crouch: 1, eyes: eyes ? "glow" : "narrow", tail: T + 1.4, look: 1 }} shade={0.5} />
        </g>
        {/* grass blades in front of them */}
        {Array.from({ length: 60 }, (_, i) => {
          const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, x = -30 + i * 19 + r * 14, h = 230 + 260 * r, sw = 16 * Math.sin(T * 1.6 + i * 0.7);
          return <path key={i} d={`M${x - 10},1930 Q${x + sw * 0.4},${1930 - h * 0.6} ${x + sw + 6},${1930 - h} Q${x + sw * 0.3},${1930 - h * 0.5} ${x + 10},1930 Z`} fill="#2a2f38" opacity={0.95} />;
        })}
        <Card k={(T - W("manes") + 0.05) / 0.35} text="NO MANES" y={330} w={460} rot={-3} />
      </svg>
    </AbsoluteFill>
  );
};

// 4. inside the camp: the lions creep past the tents, low, toward the firelight
const S_Creep: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 63);
  const l1 = walkPos(T, a - 0.6, a + 2.6, [1.6, -1.0], [1.0, 8.5], 1.2), l2 = walkPos(T, a - 0.2, a + 2.6, [-0.6, -2.4], [-1.0, 5.6], 1.2);
  const A1 = project(camCreep as CamJ, f, [l1.x, l1.y, 0]), A2 = project(camCreep as CamJ, f, [l2.x, l2.y, 0]);
  // facing: moving toward +y reads right-to-left or left-to-right depending on the camera; use the screen direction
  const B1 = project(camCreep as CamJ, f, [l1.x + 0.0, l1.y + 0.5, 0]);
  const dir = B1.x > A1.x;
  return (
    <AbsoluteFill>
      <Plate shot="creep" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <FlatLion id="c2" x={A2.x} y={A2.y} ppm={A2.ppm} flip={!dir} pose={{ phase: l2.phase, walk: l2.walk, crouch: 0.75, eyes: "glow", tail: T + 1 }} shade={0.6} />
        <FlatLion id="c1" x={A1.x} y={A1.y} ppm={A1.ppm} flip={!dir} pose={{ phase: l1.phase, walk: l1.walk, crouch: 0.8, eyes: "glow", tail: T }} shade={0.66} />
      </svg>
    </AbsoluteFill>
  );
};

const SHOTS: [number, React.FC<ShotP>][] = [[OFF3, S_Patterson], [12.1, S_Night], [13.6, S_Grass], [15.8, S_Creep]];
const sub = defaultStyle("serious", { keyWords: KEY, y: 0.86, maxChars: 16 });
const subS = { ...sub, moves: [{ from: 0, to: 12.1, y: 0.3 }, { from: 12.1, to: 13.6, y: 0.86 }, { from: 13.6, to: 15.8, y: 0.45 }, { from: 15.8, to: 30, y: 0.4 }] };

export const Tsavo3DTest: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  useMarkerFont();
  const fr = useCurrentFrame(), T = OFF3 + fr / FPS;
  let k = SHOTS.findIndex(([s0], i) => T >= s0 && T < (SHOTS[i + 1]?.[0] ?? 1e9));
  if (k < 0) k = 0;
  const [a, S] = SHOTS[k], b = SHOTS[k + 1]?.[0] ?? END3;
  const cutK = SHOTS.slice(1).reduce((m, [c]) => Math.min(m, Math.abs(T - c) * FPS), 99);
  const fadeIn = interpolate(T, [OFF3, OFF3 + 0.3], [1, 0], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(T, [END3 - 0.5, END3 - 0.03], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#07070d" }}>
      <S T={T} a={a} b={b} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(5,3,10,0.45) 100%)" }} />
      {cutK < 1.5 && <AbsoluteFill style={{ background: "#000", opacity: 0.3 * (1.5 - cutK) / 1.5 }} />}
      <Subtitles words={WORDS.filter((w) => w.s >= OFF3 - 0.05 && w.s < END3)} style={subS} offset={-OFF3} />
      {withAudio && <Audio src={staticFile("tsavo3d/test_mix.wav")} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  );
};
export { INK };
