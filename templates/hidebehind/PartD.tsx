// Part D of "The Hidebehind" (story 37.70 - 50.67 s, 389 frames, video only):
//  37.70-38.60  the approved face-only attack (ScareTest v3), night version: his lantern out, moonlit forest behind him
//  38.60-39.30  pure black
//  39.30-44.60  dDawn: cold grey-blue first light on the trail; his lantern on its side in the snow (glass cracked, out),
//               one set of boot tracks that just stops; two men from the camp walk in, stop, look slowly up into the trees
//  44.60-50.67  dEnd: night again, a slow push toward the hide tree; at its edge the faintest shape; fade to black
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Logger, ToonLook, INK } from "./logger";
import { Creature } from "./creature";
import { HScareTest } from "./ScareTest";
import camDawnJ from "../../stories/hidebehind/sets/dDawn.json";
import camEndJ from "../../stories/hidebehind/sets/dEnd.json";

const FPS = 30;
export const D0 = 37.7, D1 = 50.6667;
export const PARTD_FRAMES = 389;
const CUT = 38.6, DAWN0 = 39.3, END0 = 44.6;
type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
const camDawn = camDawnJ as CamJ, camEnd = camEndJ as CamJ;

const project = (cam: CamJ, f: number, p: [number, number, number]) => {
  const c = cam.frames[String(f)] ?? cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z };
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const pad = (f: number) => String(f).padStart(4, "0");

// two men from the camp (not the hero: different shirts, caps and beards)
export const FOREMAN: ToonLook = {
  skin: "#d2a283", top: "#2f4a5e", topDark: "#1d3040", check: "1", legs: "#5a5048", legsDark: "#3a342e", boots: "#2e2016",
  hair: "#8a8a84", beard: "#a8a59c", toque: "#7a2e24", toqueDark: "#521d16", braces: "#1e1a16", belt: "#2a1c12",
};
export const YOUNG: ToonLook = {
  skin: "#e2b898", top: "#6e6a3a", topDark: "#48452a", legs: "#3e4248", legsDark: "#282b30", boots: "#3a2618",
  hair: "#2a1c12", beard: "#3a2616", toque: "#2c3a4c", toqueDark: "#1c2634", braces: "#2a2420", belt: "#22160e",
};

// dawn set-up (world metres, ground z = 0): the lantern where his tracks end; his tracks come from deeper in the trail
const LANT: [number, number] = [-2.82, 15.58];
const TRK: [number, number] = [0.759, -0.651];                // back along his tracks: he came from screen right
const TRK_R: [number, number] = [TRK[1], -TRK[0]];
const FWD: [number, number] = [0.946, 0.324], LEFT: [number, number] = [-0.324, 0.946];  // camera forward, screen left
const at = (a: number, b: number): [number, number] => [LANT[0] + a * FWD[0] + b * LEFT[0], LANT[1] + a * FWD[1] + b * LEFT[1]];

/** a kerosene lantern lying on its side in the snow: cracked globe, cold, out */
const DeadLantern: React.FC<{ x: number; y: number; ppm: number }> = ({ x, y, ppm }) => (
  <g transform={`translate(${x},${y}) scale(${ppm}) rotate(-78)`}>
    <ellipse cx={-0.02} cy={-0.02} rx={0.2} ry={0.05} transform="rotate(78)" fill="#000" opacity={0.45} />
    <path d="M-0.045,0.075 Q-0.09,0.0 -0.03,-0.03" stroke={INK} strokeWidth={0.008} fill="none" />
    <path d="M-0.03,0.07 L0.03,0.07 L0.04,0.095 L-0.04,0.095 Z" fill="#3e3e3a" stroke={INK} strokeWidth={0.01} />
    <ellipse cx={0} cy={0.15} rx={0.045} ry={0.06} fill="rgba(150,170,190,0.35)" stroke={INK} strokeWidth={0.01} />
    <path d="M-0.02,0.11 L0.006,0.145 L-0.012,0.17 M0.006,0.145 L0.03,0.16 M0.0,0.12 L0.02,0.13" stroke="#dfe8f0" strokeWidth={0.004} opacity={0.8} fill="none" />
    <path d="M0.012,0.1 L0.04,0.13 L0.03,0.11 Z" fill="#0a0a10" opacity={0.7} />
    <path d="M-0.045,0.13 L0.045,0.13 M-0.045,0.17 L0.045,0.17 M0,0.09 L0,0.21" stroke={INK} strokeWidth={0.006} opacity={0.8} />
    <path d="M-0.05,0.205 L0.05,0.205 L0.055,0.25 Q0,0.262 -0.055,0.25 Z" fill="#4a4842" stroke={INK} strokeWidth={0.012} />
  </g>
);

/** his boot prints in the snow, alternating feet, ending at the lantern */
const Tracks: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {Array.from({ length: 16 }, (_, i) => {
      const s = 0.35 + i * 0.42, side = i % 2 ? 0.13 : -0.13;
      const P = project(camDawn, f, [LANT[0] + s * TRK[0] + side * TRK_R[0], LANT[1] + s * TRK[1] + side * TRK_R[1], 0.005]);
      const Q = project(camDawn, f, [LANT[0] + (s + 0.14) * TRK[0] + side * TRK_R[0], LANT[1] + (s + 0.14) * TRK[1] + side * TRK_R[1], 0.005]);
      const rx = 0.055 * P.ppm, ang = Math.atan2(Q.y - P.y, Q.x - P.x) * 180 / Math.PI, len = Math.hypot(Q.x - P.x, Q.y - P.y);
      return <ellipse key={i} cx={(P.x + Q.x) / 2} cy={(P.y + Q.y) / 2} rx={Math.max(len * 0.62, rx * 0.5)} ry={rx * 0.42}
        transform={`rotate(${ang},${(P.x + Q.x) / 2},${(P.y + Q.y) / 2})`} fill="#1c2434" opacity={0.55 * (1 - i / 22)} />;
    })}
  </g>
);

/** a man from the camp walking in and stopping, then slowly looking up into the trees */
const Finder: React.FC<{ f: number; T: number; look: ToonLook; start: [number, number]; stop: [number, number]; tIn: number; tStop: number; tUp: number }> =
  ({ f, T, look, start, stop, tIn, tStop, tUp }) => {
    const L = Math.hypot(stop[0] - start[0], stop[1] - start[1]), dir: [number, number] = [(stop[0] - start[0]) / L, (stop[1] - start[1]) / L];
    // constant pace, eased only into the stop (planted feet: dist drives the walk)
    const u = clamp01((T - tIn) / (tStop - tIn)), e = u < 0.8 ? u / 0.9 : 0.8 / 0.9 + (1 - 0.8 / 0.9) * sm((u - 0.8) / 0.2);
    const dist = L * clamp01(e), walk = 1 - sm((T - tStop + 0.25) / 0.45);
    const pos: [number, number, number] = [start[0] + dir[0] * dist, start[1] + dir[1] * dist, 0.03];
    const A = project(camDawn, f, pos), B = project(camDawn, f, [pos[0] + 0.3 * dir[0], pos[1] + 0.3 * dir[1], 0.03]);
    const up = sm((T - tUp) / 1.2);
    return <Logger x={A.x} y={A.y} ppm={A.ppm} look={look} flip={B.x < A.x}
      pose={{ dist, walk, t: T, expr: up > 0.3 ? "worried" : "neutral", lookX: 0.35 - 0.15 * up, tilt: -14 * up, blink: (T % 3.3) < 0.09 }} />;
  };

const Grade: React.FC<{ fr: number; cold?: number }> = ({ fr, cold = 0.18 }) => (
  <>
    <AbsoluteFill style={{ background: "#0a1430", mixBlendMode: "multiply", opacity: cold }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.78) 100%)" }} />
    <svg width={1080} height={1920} style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
      <filter id="grD"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={(fr * 7919) % 97} /></filter>
      <rect width={1080} height={1920} filter="url(#grD)" />
    </svg>
  </>
);

const Fog: React.FC<{ T: number; y0: number; op: number; col?: string }> = ({ T, y0, op, col = "#8a9bc0" }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", mixBlendMode: "screen" }}>
    <defs><radialGradient id="fogD"><stop offset="0" stopColor={col} stopOpacity={0.5} /><stop offset="1" stopColor={col} stopOpacity={0} /></radialGradient></defs>
    {[0, 1, 2, 3, 4].map((i) => {
      const sp = 9 + i * 4, x = ((i * 410 + T * sp * (i % 2 ? -1 : 1)) % 1700 + 1700) % 1700 - 310;
      return <ellipse key={i} cx={x} cy={y0 + (i % 3) * 70 + 12 * Math.sin(T * 0.3 + i)} rx={520 + 90 * i} ry={110 + 25 * (i % 2)} fill="url(#fogD)" opacity={op * (0.55 + 0.45 * Math.sin(T * 0.21 + i * 1.7) ** 2)} />;
    })}
  </svg>
);

export const HPartD: React.FC = () => {
  const fr = useCurrentFrame(), T = D0 + fr / FPS;
  if (T < CUT - 1e-6) return <HScareTest withAudio={false} night startT={D0} />;
  if (T < DAWN0 - 1e-6) return <AbsoluteFill style={{ background: "#000" }} />;
  if (T < END0 - 1e-6) {
    const f = Math.min(159, Math.round((T - DAWN0) * FPS) + 1);
    const Lp = project(camDawn, f, [LANT[0], LANT[1], 0.06]);
    const fadeIn = 1 - sm((T - DAWN0) / 0.9), fadeOut = sm((T - (END0 - 0.25)) / 0.25);
    // they come in from screen left, behind the lantern, and stop a few steps short of it
    const m1s = at(1.9, 3.9), m1e = at(1.9, 0.55), m2s = at(3.1, 3.4), m2e = at(3.1, -0.1);
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <Img src={staticFile(`hidebehind/dDawn/f_${pad(f)}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />
        <Fog T={T} y0={1250} op={0.26} col="#a6b2c8" />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <g style={{ filter: "brightness(0.8) saturate(0.6)" }}>
            <Tracks f={f} />
            <DeadLantern x={Lp.x} y={Lp.y} ppm={Lp.ppm} />
          </g>
          <g style={{ filter: "brightness(0.62) saturate(0.55)" }}>
            <Finder f={f} T={T} look={YOUNG} start={m2s} stop={m2e} tIn={39.7} tStop={42.2} tUp={42.7} />
            <Finder f={f} T={T} look={FOREMAN} start={m1s} stop={m1e} tIn={39.5} tStop={41.9} tUp={42.4} />
          </g>
        </svg>
        <Grade fr={fr} cold={0.12} />
        {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
        {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
      </AbsoluteFill>
    );
  }
  const f = Math.min(182, Math.round((T - END0) * FPS) + 1);
  const H = project(camEnd, f, [2.1 + 0.42, 5.75, 0]);
  const peek = 0.32 * sm((T - 48.4) / 1.0);
  const fadeIn = 1 - sm((T - END0) / 0.35), fadeOut = sm((T - 49.75) / 0.9);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Img src={staticFile(`hidebehind/dEnd/f_${pad(f)}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <Fog T={T} y0={1350} op={0.28} />
      {peek > 0 && <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <g opacity={peek} style={{ filter: "brightness(0.02) blur(1.5px)" }}>
          <Creature x={H.x} y={H.y} ppm={H.ppm} p={{ pose: "lurk", glow: 0, rim: 0.4 }} />
        </g>
      </svg>}
      <Img src={staticFile(`hidebehind/dEnd/fg_${pad(f)}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <Grade fr={fr} />
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  );
};
