// "The Hidebehind" Part C (story 26.50 - 37.70 s, 336 frames, video only: no audio, no subtitles; assembled in Part D).
// Lines 7-9 up to the attack. Same far trail where Part B's tracking shot leaves him (tools/hidebehind_partc_paths.py).
// One full-res Blender plate per still camera; the slow pushes are smooth 2D scales of that plate, so every frame moves.
//  c1  26.50-28.55  close on the lantern at his hip: he slows to a stop, the flame gutters and dies at 27.65 (the lit
//                   plate fades with the flame, the rig's lit goes to 0), a thread of smoke, cold moonlight only
//  c2  28.55-32.45  extreme close-up, profile, eyes wide, frozen; cold breath drifts in from the black behind his neck,
//                   the dark there slowly thickens (never a shape)
//  c3  32.45-37.70  medium: his eyes go back, he starts to turn; cut on the action to a close crop: he has turned to face
//                   the black, a slow push in on his terrified face, total stillness, ending as he stares into it
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Logger } from "./logger";
import { LOGGER } from "./CharTest";
import paths from "../../stories/hidebehind/sets/partc_paths.json";
import cam1 from "../../stories/hidebehind/sets/c1L.json";
import cam2 from "../../stories/hidebehind/sets/c2.json";
import cam3 from "../../stories/hidebehind/sets/c3.json";

const FPS = 30;
export const PC_T0 = 26.5, PC_T1 = 37.7;
export const PARTC_FRAMES = Math.round((PC_T1 - PC_T0) * FPS); // 336
const OUT_T = 27.65; // the flame dies (same moment as the lantern hiss in the approved mix)
const CUT2 = 28.55, CUT3 = 32.45, CUT3B = 33.55;

type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
const project = (cam: CamJ, p: [number, number, number]) => {
  const c = cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z };
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
type PL = { x: number; y: number; dir: number[] };
const LG = (paths as any).c1L.frames[0].logger as PL;

/** the flame: steady, then it gutters (dips and catches twice) and dies exactly at OUT_T */
const flame = (T: number) => {
  if (T >= OUT_T) return 0;
  const g = sm((T - 26.85) / 0.8);                        // 0 steady .. 1 dying
  const dip = Math.max(0, Math.sin((T - 26.85) * 19)) * Math.max(0, Math.sin((T - 26.85) * 7.3 + 0.6));
  return clamp01((1 - 0.75 * g) * (1 - 0.55 * g * dip) * (1 - sm((T - (OUT_T - 0.12)) / 0.12)));
};

/** he slows from a hurried walk to a dead stop by 26.95 s (feet planted: his world position follows the walked distance) */
const V = (t: number) => 1.45 * (1 - sm((t - 26.5) / 0.45));
const walked = (T: number) => { let s = 0; for (let t = 26.5; t < Math.min(T, 27.0); t += 1 / 480) s += V(t) / 480; return s; };
const TOTAL = walked(27.0);

const Plate: React.FC<{ shot: string; op?: number }> = ({ shot, op = 1 }) => (
  <Img src={staticFile(`hidebehind/partc/${shot}.png`)} style={{ position: "absolute", width: 1080, height: 1920, opacity: op }} />
);

/** soft fog banks drifting across the frame (as in the approved preview) */
const Fog: React.FC<{ T: number; y0: number; op: number }> = ({ T, y0, op }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", mixBlendMode: "screen" }}>
    <defs><radialGradient id="fogc"><stop offset="0" stopColor="#8a9bc0" stopOpacity={0.5} /><stop offset="1" stopColor="#8a9bc0" stopOpacity={0} /></radialGradient></defs>
    {[0, 1, 2, 3, 4].map((i) => {
      const sp = 9 + i * 4, x = ((i * 410 + T * sp * (i % 2 ? -1 : 1)) % 1700 + 1700) % 1700 - 310;
      return <ellipse key={i} cx={x} cy={y0 + (i % 3) * 70 + 12 * Math.sin(T * 0.3 + i)} rx={520 + 90 * i} ry={110 + 25 * (i % 2)} fill="url(#fogc)" opacity={op * (0.55 + 0.45 * Math.sin(T * 0.21 + i * 1.7) ** 2)} />;
    })}
  </svg>
);

/** cold breath from the black behind him: a puff that blooms at (x0, y0) and drifts in the direction dx */
const Breath: React.FC<{ T: number; at: number; x0: number; y0: number; s: number; dx: number }> = ({ T, at, x0, y0, s, dx }) => {
  const k = (T - at) / 1.5;
  if (k <= 0 || k >= 1) return null;
  const op = 0.42 * sm(k / 0.18) * (1 - sm((k - 0.35) / 0.65));
  return (
    <g opacity={op}>
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={x0 + dx * s * (0.25 + 0.55 * k + 0.12 * i)} cy={y0 - s * (0.06 * k + 0.05 * i) + 6 * Math.sin(k * 5 + i)}
          rx={s * (0.09 + 0.2 * k + 0.04 * i)} ry={s * (0.05 + 0.09 * k)} fill="url(#breath)" />
      ))}
    </g>
  );
};

export const HPartC: React.FC = () => {
  const fr = useCurrentFrame(), T = PC_T0 + fr / FPS;
  const lit = flame(T), dead = T >= OUT_T ? sm((T - OUT_T) / 0.5) : 0;
  let body: React.ReactNode;
  if (T < CUT2) {
    // c1: close on the lantern (a 1.35x crop on it), the flame dies, the warm pool goes with it
    const s = walked(T) - TOTAL, x = LG.x + s * LG.dir[0], y = LG.y + s * LG.dir[1];
    const cam = cam1 as CamJ, A = project(cam, [x, y, 0.03]), B = project(cam, [x + 0.3 * LG.dir[0], y + 0.3 * LG.dir[1], 0.03]);
    const Lp = project(cam, [LG.x + 0.12 * LG.dir[0], LG.y + 0.12 * LG.dir[1], 0.5]);
    const z = 1.35 + 0.05 * sm((T - PC_T0) / (CUT2 - PC_T0)); // a slow creep in
    const sx = Lp.x, sy = Lp.y;
    const smoke = T > OUT_T ? (T - OUT_T) : -1;
    body = (
      <AbsoluteFill style={{ transform: `translate(${540 - sx}px,${960 - sy}px) scale(${z})`, transformOrigin: `${sx}px ${sy}px` }}>
        <Plate shot="c1D" />
        <Plate shot="c1L" op={Math.pow(lit, 0.8)} />
        <Fog T={T} y0={1450} op={0.22} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs><radialGradient id="smk"><stop offset="0" stopColor="#b8c2d6" stopOpacity={0.55} /><stop offset="1" stopColor="#b8c2d6" stopOpacity={0} /></radialGradient></defs>
          <g style={{ filter: `brightness(${mix(0.8, 0.6, dead)}) saturate(${mix(0.85, 0.5, dead)})` }}>
            <Logger x={A.x} y={A.y} ppm={A.ppm} look={LOGGER} flip={B.x < A.x}
              pose={{ dist: walked(T), walk: V(T) / 1.45, t: T, hold: "lantern", lit, expr: T > 27.2 ? "scared" : "worried", lookX: T > 27.3 ? -0.2 : 0.35, blink: false }} />
          </g>
          {/* a thin thread of smoke from the dead wick, rising and curling away */}
          {smoke > 0 && [0, 1, 2, 3].map((i) => {
            const k = (smoke - i * 0.18) / 0.9;
            if (k <= 0 || k > 1) return null;
            const hy = Lp.y - 0.17 * A.ppm;
            return <ellipse key={i} cx={Lp.x + 0.03 * A.ppm * Math.sin(k * 4 + i)} cy={hy - k * 0.35 * A.ppm} rx={0.02 * A.ppm * (1 + 2 * k)} ry={0.05 * A.ppm * (1 + k)}
              fill="url(#smk)" opacity={(1 - k) * sm(k / 0.15) * (1 - sm((T - 28.2) / 0.35))} />;
          })}
        </svg>
      </AbsoluteFill>
    );
  } else if (T < CUT3) {
    // c2: extreme close-up in profile, frozen; the breath comes from behind (screen right, the dark side)
    const cam = cam2 as CamJ, A0 = project(cam, [LG.x, LG.y, 0.03]), B = project(cam, [LG.x + 0.3 * LG.dir[0], LG.y + 0.3 * LG.dir[1], 0.03]);
    const flip = B.x < A0.x, H0 = project(cam, [LG.x, LG.y, 1.2]);
    // frame him a touch wider and left of centre (he faces left): the empty black behind him fills the right
    const K = 0.74, H = { x: flip ? 430 : 650, y: 880, ppm: H0.ppm * K };
    const A = { x: H.x + (A0.x - H0.x) * K, y: H.y + (A0.y - H0.y) * K, ppm: A0.ppm * K };
    const k = sm((T - CUT2) / (CUT3 - CUT2)), z = 1.04 + 0.1 * k;
    const tremble = 0.35 * Math.sin(T * 23) * Math.sin(T * 3.1);
    const nape = { x: H.x + (flip ? 1 : -1) * 0.2 * H.ppm, y: H.y + 0.12 * H.ppm };
    const back = flip ? 1 : -1;
    const mass = sm((T - 29.2) / 2.6);
    body = (
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${H.x}px ${H.y}px` }}>
        <Plate shot="c2" />
        <Fog T={T} y0={1300} op={0.2} />
        {/* the black behind him thickens: a soft darker mass, no edges, no shape */}
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 46% 40% at ${flip ? 84 - 6 * mass : 16 + 6 * mass}% 46%, rgba(0,0,0,${0.9 * mass}) 0%, rgba(0,0,0,${0.55 * mass}) 55%, rgba(0,0,0,0) 100%)` }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs><radialGradient id="breath"><stop offset="0" stopColor="#c9d4ea" stopOpacity={0.8} /><stop offset="0.6" stopColor="#aab6d0" stopOpacity={0.3} /><stop offset="1" stopColor="#aab6d0" stopOpacity={0} /></radialGradient></defs>
          <g style={{ filter: "brightness(0.6) saturate(0.5)" }}>
            <Logger x={A.x} y={A.y} ppm={A.ppm} look={LOGGER} flip={flip}
              pose={{ dist: 0, walk: 0, t: 28.6 + (T - CUT2) * 0.3, hold: "lantern", lit: 0, expr: "scared", lookX: mix(0.2, -1.0, sm((T - 31.0) / 0.7)), tilt: tremble, blink: false }} />
          </g>
          {[30.0, 30.95, 31.75].map((at, i) => (
            <Breath key={i} T={T} at={at} x0={nape.x + back * 0.42 * H.ppm} y0={nape.y + (i - 1) * 0.03 * H.ppm} s={H.ppm} dx={-back} />
          ))}
        </svg>
      </AbsoluteFill>
    );
  } else {
    // c3: the slow turn. a) medium, facing away from the dark, eyes go back, the body starts to turn; b) cut on the
    // action to a close crop: he has turned to face the black, a slow push in, total stillness to the end
    const cam = cam3 as CamJ, A = project(cam, [LG.x, LG.y, 0.03]), B = project(cam, [LG.x + 0.3 * LG.dir[0], LG.y + 0.3 * LG.dir[1], 0.03]);
    const away = B.x < A.x, H = project(cam, [LG.x, LG.y, 1.2]);
    const b = T >= CUT3B;
    const flip = b ? !away : away;
    const turn = b ? mix(0.8, 1.0, sm((T - CUT3B) / 0.9)) : mix(1.0, 0.8, sm((T - 33.05) / 0.5));
    const z = b ? 1.85 + 0.5 * sm((T - CUT3B) / (PC_T1 - CUT3B)) : 1.0 + 0.04 * sm((T - CUT3) / (CUT3B - CUT3));
    const fx = b ? H.x + (flip ? -1 : 1) * 0.05 * H.ppm : A.x, fy = b ? H.y : 960;
    const tStill = b ? 33.6 + 0.35 * sm((T - CUT3B) / 1.2) : 32.5 + (T - CUT3) * 0.3;
    const look = b ? 0.35 : mix(0.2, -1.0, sm((T - 32.85) / 0.35));
    body = (
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${fx}px ${fy}px` }}>
        <Plate shot="c3" />
        <Fog T={T} y0={1400} op={0.22} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 40% 34% at ${away ? 80 : 20}% 48%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 100%)` }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <g transform={`translate(${A.x},0) scale(${turn},1) translate(${-A.x},0)`} style={{ filter: "brightness(0.6) saturate(0.5)" }}>
            <Logger x={A.x} y={A.y} ppm={A.ppm} look={LOGGER} flip={flip}
              pose={{ dist: 0, walk: 0, t: tStill, hold: "lantern", lit: 0, expr: "scared", lookX: look, tilt: b ? 0 : mix(0, -4, sm((T - 32.9) / 0.6)), blink: false }} />
          </g>
        </svg>
      </AbsoluteFill>
    );
  }
  const grain = (fr * 7919) % 97;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {body}
      <AbsoluteFill style={{ background: "#0a1430", mixBlendMode: "multiply", opacity: 0.18 + 0.1 * dead }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) ${45 - 8 * dead}%, rgba(0,0,0,${0.78 + 0.12 * dead}) 100%)` }} />
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="grc"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={grain} /></filter>
        <rect width={1080} height={1920} filter="url(#grc)" />
      </svg>
    </AbsoluteFill>
  );
};
