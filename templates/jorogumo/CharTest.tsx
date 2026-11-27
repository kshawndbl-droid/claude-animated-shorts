// Character tests for the spider woman Short: a walking test and a standing test in the abandoned house (still camera),
// on the kimono version of the approved Toon rig. Both characters are lit to sit in the night set: dimmed, cooled,
// with the warm lantern glow and the moonlit screens behind them.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Kimono, KLook } from "./kimono";
import camTest from "../../stories/jorogumo/sets/chartest.json";

const FPS = 30;
export const J_WALK_FRAMES = 7 * FPS, J_STAND_FRAMES = 7 * FPS;
type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
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
const walk = (T: number, t0: number, t1: number, V: number) => {
  const v = (t: number) => V * sm((t - t0) / 0.6) * sm((t1 - t) / 0.6);
  let s = 0; const dt = 1 / 240;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};

export const SAMURAI: KLook = { kind: "samurai", skin: "#e6bc96", top: "#3d4b68", topDark: "#28324a", legs: "#55504c", legsDark: "#3a3532",
  hair: "#17121a", sock: "#ece8de", sole: "#a98c55", obi: "#7a2a22", obiDark: "#4a1812", collar: "#e8e2d6", stride: 0.85, lift: 0.9, sleeve: 0.22 };
export const LADY: KLook = { kind: "lady", skin: "#f3e4dc", top: "#3e2040", topDark: "#28132a", legs: "#3e2040", legsDark: "#28132a",
  hair: "#120e14", sock: "#f2eee6", sole: "#2a1a14", obi: "#c9a24a", obiDark: "#8a6a2a", collar: "#f1ebe4", stride: 0.42, lift: 0.3, sleeve: 0.46,
  lips: "#b0142c", pin: "#c4202c", pattern: "#c9c4d6", flower: "#c42030" };

const cam = camTest as CamJ;
const C0 = [0.2, -3.4], D = [-0.0213, 0.9998], RT = [0.9998, 0.0213];
const at = (dd: number, s: number) => project(cam, 1, [C0[0] + dd * D[0] + s * RT[0], C0[1] + dd * D[1] + s * RT[1], 0.05]);
const LAMP = project(cam, 1, [1.5, 2.6, 0.42]);

/** set plate + cast + the light that ties them together (lantern glow, cool night grade, vignette) */
const Stage: React.FC<{ children: React.ReactNode; t: number }> = ({ children, t }) => {
  const flick = 0.9 + 0.06 * Math.sin(t * 13.1) + 0.04 * Math.sin(t * 29.7 + 1);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Img src={staticFile("jorogumo/chartest/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="lamp" cx={LAMP.x} cy={LAMP.y} r={620} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffb060" stopOpacity={0.42 * flick} /><stop offset="1" stopColor="#ff8030" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="vig" cx={540} cy={1050} r={1150} gradientUnits="userSpaceOnUse">
            <stop offset="0.45" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.75} />
          </radialGradient>
        </defs>
        <g style={{ filter: "brightness(0.74) saturate(0.82)" }}>{children}</g>
        <rect width={1080} height={1920} fill="#1a2a55" opacity={0.16} style={{ mixBlendMode: "multiply" }} />
        <rect width={1080} height={1920} fill="url(#lamp)" style={{ mixBlendMode: "screen" }} />
        <rect width={1080} height={1920} fill="url(#vig)" />
      </svg>
    </AbsoluteFill>
  );
};

export const JWalkTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const p = walk(T, 0.3, 4.6, 0.62), q = walk(T, 0.5, 6.6, 0.3);
  const P = at(2.9, -1.45 + p.s), Q = at(4.2, 1.9 - q.s);
  return (
    <Stage t={T}>
      <Kimono x={Q.x} y={Q.y} ppm={Q.ppm} look={LADY} flip pose={{ dist: q.s, walk: q.w, t: T + 2, lookX: 0.2, blink: (T % 4.3) < 0.1, expr: "eerie" }} />
      <Kimono x={P.x} y={P.y} ppm={P.ppm} look={SAMURAI} pose={{ dist: p.s, walk: p.w, t: T, lookX: 0.3, blink: (T % 3.1) < 0.1, expr: "stern" }} />
    </Stage>
  );
};

/** a slow reach from resting to the sword hilt, held, then let go (elbow drops, forearm comes level) */
const grip = (T: number): [number, number] | undefined => {
  const k = sm((T - 2.6) / 0.55) * (1 - sm((T - 5.4) / 0.6));
  return k > 0 ? [2 + 2 * k, 8 + 85 * k] : undefined;
};

export const JStandTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const P = at(2.8, -0.45), Q = at(4.4, 0.55);
  const look = T < 1.6 ? 0.4 : T < 2.5 ? -0.7 : 0.5;
  const tilt = -9 * sm((T - 3.2) / 1.2) * (1 - sm((T - 5.8) / 0.8));
  return (
    <Stage t={T}>
      <Kimono x={Q.x} y={Q.y} ppm={Q.ppm} look={LADY} flip pose={{ t: T + 1.3, lookX: 0.5, blink: Math.abs(T - 4.6) < 0.06, expr: "eerie", tilt,
        armNear: [8, 72 + 2 * Math.sin(T * 1.1)], armFar: [6, 78] }} />
      <Kimono x={P.x} y={P.y} ppm={P.ppm} look={SAMURAI} pose={{ t: T, lookX: look, blink: (T % 3.3) < 0.1 || Math.abs(T - 1.65) < 0.05,
        expr: T > 2.4 && T < 5.6 ? "worried" : "stern", armNear: grip(T) }} />
    </Stage>
  );
};
