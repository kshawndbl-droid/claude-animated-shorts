// "The Man-Eaters of Tsavo", Part A (story 0.00 to 21.86 s, narration lines 1-4): video only, no subtitles, no audio
// (Part D lays the narration, subtitles and music over the joined parts). Blender sets from tools/blender/tsavo_camp.py,
// rendered on every 2nd frame; the flat 2D cast (Toon people, FlatLion) stands on the 3D ground through cam.json.
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Card, useMarkerFont } from "../mailed/common";
import { Toon } from "./toon";
import { FlatLion } from "./stick";
import { PATTERSON_T, WORKER_T } from "./ToonTest";
import wordsJson from "../../stories/tsavo/final/words.json";
import camBridge from "../../stories/tsavo/sets/bridgenight.json";
import camNight from "../../stories/tsavo/sets/campnight.json";
import camPatterson from "../../stories/tsavo/sets/patterson.json";
import camGrass from "../../stories/tsavo/sets/grass.json";
import camCreep from "../../stories/tsavo/sets/creep.json";
import camFlap from "../../stories/tsavo/sets/flap.json";
import camBush from "../../stories/tsavo/sets/bush.json";

const FPS = 30, STEP = 2;
export const PARTA_END = 21.86;
export const PARTA_FRAMES = Math.round(PARTA_END * FPS);
const WORDS = (wordsJson as any[]).map((w) => ({ w: w.w as string, s: w.s as number }));
const W = (w: string, n = 0) => WORDS.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w)[n]?.s ?? 0;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };

type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
const plateFrame = (t: number, n: number) => Math.max(1, Math.min(n - (n % 2 === 0 ? 1 : 0), 1 + STEP * Math.floor((t * FPS) / STEP)));
const project = (cam: CamJ, f: number, p: [number, number, number]) => {
  const c = cam.frames[String(f)] ?? cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z };
};
/** distance-driven walk at speed V between t0 and t1 with eased starts and stops (feet stay planted: the rig reads dist) */
const walk = (T: number, t0: number, t1: number, V: number) => {
  const v = (t: number) => V * sm((t - t0) / 0.5) * sm((t1 - t) / 0.5);
  let s = 0; const dt = 1 / 120;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};
const along = (from: [number, number], to: [number, number], s: number): [number, number] => {
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]), k = Math.min(1, s / L);
  return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
};
const leftward = (cam: CamJ, f: number, from: [number, number], to: [number, number]) =>
  project(cam, f, [to[0], to[1], 0]).x < project(cam, f, [from[0], from[1], 0]).x;
const Plate: React.FC<{ shot: string; f: number; bright?: number }> = ({ shot, f, bright = 1 }) => (
  <Img src={staticFile(`tsavo3d/${shot}/f_${String(f).padStart(4, "0")}.png`)}
    style={{ position: "absolute", width: 1080, height: 1920, filter: bright !== 1 ? `brightness(${bright})` : undefined }} />
);
const Fg: React.FC<{ shot: string; f: number }> = ({ shot, f }) => (
  <Img src={staticFile(`tsavo3d/${shot}/fg_${String(f).padStart(4, "0")}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />
);
const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => <svg width={1080} height={1920} style={{ position: "absolute" }}>{children}</svg>;
type ShotP = { T: number; a: number };

// 1. the hook: night over the river valley and the unfinished bridge
const S_Bridge: React.FC<ShotP> = ({ T, a }) => {
  const f = plateFrame(T - a, 100);
  return (
    <AbsoluteFill>
      <Plate shot="bridgenight" f={f} />
      <Svg><Card k={Math.min((T - 0.45) / 0.35, (3.15 - T) / 0.25)} text="KENYA, 1898" y={260} w={520} /></Svg>
    </AbsoluteFill>
  );
};

// 2. the camp at night: two workers warm themselves at the fire, a third walks off toward the dark tents
const S_Night: React.FC<ShotP> = ({ T, a }) => {
  const f = plateFrame(T - a, 100), cam = camNight as CamJ;
  const fig = (x: number, y: number, flip: boolean, seed: number, look = WORKER_T) => {
    const p = project(cam, f, [x, y, 0]);
    return <Toon x={p.x} y={p.y} ppm={p.ppm} look={look} flip={flip} shade={0.72} pose={{ t: T + seed, lookX: flip ? -0.6 : 0.6, blink: ((T + seed) % 3) < 0.1 }} />;
  };
  const A: [number, number] = [0.9, 8.2], B: [number, number] = [-2.2, 2.6];
  const w = walk(T, a + 0.3, a + 3.3, 1.0), pos = along(A, B, w.s), P = project(cam, f, [pos[0], pos[1], 0]);
  return (
    <AbsoluteFill>
      <Plate shot="campnight" f={f} />
      <Svg>
        {fig(-0.4, 9.0, false, 0)}
        {fig(1.6, 9.9, true, 2, { ...WORKER_T, skin: "#9a6440", top: "#c9b48a", topDark: "#a08a62", hatCol: "#f2ede0", band: "#cfc6b0", mustache: false })}
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={{ ...WORKER_T, hatCol: "#c8b27a", band: "#8e7444" }} flip={leftward(cam, f, A, B)} shade={0.66}
          pose={{ dist: w.s, walk: w.w, t: T + 4 }} />
      </Svg>
    </AbsoluteFill>
  );
};

// 3. dusk by the line: Patterson walks up beside the track, points back to the bridge, then faces us
const S_Patterson: React.FC<ShotP> = ({ T, a }) => {
  const f = plateFrame(T - a, 170), cam = camPatterson as CamJ;
  const PA: [number, number] = [0.3, -0.3], PB: [number, number] = [2.3, -0.6];
  const pw = walk(T, a + 0.2, W("british") - 0.1, 0.8), pp = along(PA, PB, pw.s), P = project(cam, f, [pp[0], pp[1], 0]);
  const KA: [number, number] = [7.8, 4.2], KB: [number, number] = [5.0, 3.6];
  const kw = walk(T, a, a + 4.2, 0.9), kp = along(KA, KB, kw.s), K = project(cam, f, [kp[0], kp[1], 0]);
  const pk = sm((T - W("led") + 0.15) / 0.45) * (1 - sm((T - W("john") + 0.1) / 0.5));
  const named = T > W("john") - 0.1;
  return (
    <AbsoluteFill>
      <Plate shot="patterson" f={f} />
      <Svg>
        <Toon x={K.x} y={K.y} ppm={K.ppm} look={WORKER_T} flip={leftward(cam, f, KA, KB)} shade={0.92} pose={{ dist: kw.s, walk: kw.w, t: T + 2, hold: "plank" }} />
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} flip={pw.w > 0.05 ? leftward(cam, f, PA, PB) : false}
          pose={{ dist: pw.s, walk: pw.w, t: T, expr: named ? "stern" : "neutral", blink: (T % 3.1) < 0.1, lookX: pk > 0.3 ? 1 : 0.2,
            armNear: pk > 0 ? [2 + 86 * pk + 2 * Math.sin(T * 2.3) * pk, 8 - 4 * pk] : undefined }} />
        <Card k={(T - W("john") + 0.05) / 0.35} text="J. H. PATTERSON" y={230} w={640} sub="railway engineer" rot={2} />
      </Svg>
      <Fg shot="patterson" f={f} />
    </AbsoluteFill>
  );
};

// 4. outside the thorn fence, low in the grass: two pairs of eyes light up, then the lions rise into a crouch
const S_Grass: React.FC<ShotP> = ({ T, a }) => {
  const f = plateFrame(T - a, 98), cam = camGrass as CamJ;
  const eyes = T > W("two") - 0.12, rise = sm((T - W("both") + 0.6) / 0.8);
  const L1 = project(cam, f, [-1.9, -8.3, 0]), L2 = project(cam, f, [-4.6, -9.6, 0]);
  return (
    <AbsoluteFill>
      <Plate shot="grass" f={f} />
      <Svg>
        <g transform={`translate(0,${(1 - rise) * 120})`}>
          <FlatLion id="g2" x={L2.x} y={L2.y} ppm={L2.ppm} pose={{ crouch: 1, eyes: eyes ? "glow" : "narrow", tail: T + 1.4, look: 1 }} shade={0.5} />
          <FlatLion id="g1" x={L1.x} y={L1.y} ppm={L1.ppm} pose={{ crouch: 1, eyes: eyes ? "glow" : "narrow", tail: T, look: -1 }} shade={0.55} />
        </g>
        <Card k={(T - W("manes") + 0.05) / 0.35} text="NO MANES" y={330} w={460} rot={-3} />
      </Svg>
      <Fg shot="grass" f={f} />
    </AbsoluteFill>
  );
};

// 5. inside the camp: the lions creep past the tents, low, toward the firelight
const S_Creep: React.FC<ShotP> = ({ T, a }) => {
  const f = plateFrame(T - a, 80), cam = camCreep as CamJ;
  const lion = (from: [number, number], to: [number, number], t0: number, id: string, shade: number, seed: number) => {
    const w = walk(T, t0, a + 3.0, 1.0), p = along(from, to, w.s), P = project(cam, f, [p[0], p[1], 0]);
    return <FlatLion id={id} x={P.x} y={P.y} ppm={P.ppm} flip={leftward(cam, f, from, to)} pose={{ phase: w.s / 0.9, walk: w.w, crouch: 0.78, eyes: "glow", tail: T + seed }} shade={shade} />;
  };
  return (
    <AbsoluteFill>
      <Plate shot="creep" f={f} />
      <Svg>
        {lion([0.0, 4.6], [-0.6, 10.0], a - 0.4, "c2", 0.6, 1)}
        {lion([1.4, 3.2], [0.8, 9.5], a - 0.7, "c1", 0.66, 0)}
      </Svg>
    </AbsoluteFill>
  );
};

// 6. a lit tent door: the flap is thrown open (Blender animation) and the frame jolts; nothing else is shown
const S_Flap: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 55);
  const jolt = Math.exp(-Math.max(0, t - 0.2) * 6) * (t > 0.2 ? 1 : 0);
  return (
    <AbsoluteFill style={{ transform: `translate(${14 * jolt * Math.sin(t * 70)}px, ${9 * jolt * Math.cos(t * 55)}px) scale(1.02)` }}>
      <Plate shot="flap" f={f} />
    </AbsoluteFill>
  );
};

// 7. through the gap in the thorn fence the two lions slip out into the black bush and are gone
const S_Bush: React.FC<ShotP> = ({ T, a }) => {
  const f = plateFrame(T - a, 65), cam = camBush as CamJ;
  const lion = (from: [number, number], to: [number, number], t0: number, id: string, seed: number) => {
    const w = walk(T, t0, a + 2.6, 1.6), p = along(from, to, w.s), P = project(cam, f, [p[0], p[1], 0]);
    const fade = 1 - sm((Math.hypot(p[0] - from[0], p[1] - from[1]) - 4.5) / 3.5);
    return (
      <g opacity={fade}>
        <FlatLion id={id} x={P.x} y={P.y} ppm={P.ppm} flip={leftward(cam, f, from, to)} pose={{ phase: w.s / 0.9, walk: w.w, crouch: 0.4, eyes: "glow", tail: T + seed }} shade={0.5 * fade + 0.1} />
      </g>
    );
  };
  return (
    <AbsoluteFill>
      <Plate shot="bush" f={f} />
      <Svg>
        {lion([1.8, 2.2], [7.6, -7.0], a - 0.2, "b2", 1)}
        {lion([2.6, 1.2], [8.4, -7.8], a - 0.6, "b1", 0)}
      </Svg>
    </AbsoluteFill>
  );
};

const SHOTS: [number, React.FC<ShotP>][] = [[0, S_Bridge], [3.3, S_Night], [6.6, S_Patterson], [12.2, S_Grass], [15.4, S_Creep], [18.0, S_Flap], [19.75, S_Bush]];

export const TsavoPartA: React.FC = () => {
  useMarkerFont();
  const T = useCurrentFrame() / FPS;
  let k = SHOTS.findIndex(([s0], i) => T >= s0 && T < (SHOTS[i + 1]?.[0] ?? 1e9));
  if (k < 0) k = 0;
  const [a, S] = SHOTS[k];
  const cutK = SHOTS.slice(1).reduce((m, [c]) => Math.min(m, Math.abs(T - c) * FPS), 99);
  const fadeIn = interpolate(T, [0, 0.6], [1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#07070d" }}>
      <S T={T} a={a} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(5,3,10,0.45) 100%)" }} />
      {cutK < 1.5 && <AbsoluteFill style={{ background: "#000", opacity: 0.3 * (1.5 - cutK) / 1.5 }} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
    </AbsoluteFill>
  );
};
