// REGRESSION TEST: the approved Hidebehind walk/stand tests, drawn with the LIBRARY rig instead of the logger file.
// Rendered side by side with HWalkTest/HStandTest they must match exactly (tools/kz-render.mjs + PSNR).
// Character tests for "The Hidebehind": a walking test and a standing test of the logger on the night forest trail
// (still camera, Blender plate from tools/blender/hidebehind_forest.py --shot chartest), on the approved Toon rig.
// The logger is graded into the moonlit set (dimmed, cooled) and lit warm by his own lantern.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Logger, ToonLook } from "../characters/rig";
import camTest from "../../stories/hidebehind/sets/chartest.json";

const FPS = 30;
export const H_WALK_FRAMES = 9 * FPS, H_STAND_FRAMES = 8 * FPS;
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
/** distance walked at time T for a walk from t0 to t1 at speed V (eases in and out), and the walk weight */
const walk = (T: number, t0: number, t1: number, V: number) => {
  const v = (t: number) => V * sm((t - t0) / 0.6) * sm((t1 - t) / 0.6);
  let s = 0; const dt = 1 / 240;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};

export const LOGGER: ToonLook = {
  skin: "#dcae8c", top: "#8e2622", topDark: "#5a1614", check: "1", legs: "#4a4640", legsDark: "#2f2c28", boots: "#3a2618",
  hair: "#3a2616", beard: "#6b4a2e", toque: "#5d5e58", toqueDark: "#3e3f3a", braces: "#2a2420", belt: "#2a1c12",
};

// trail on the chartest plate: walkers cross the frame along RT at depth C0 (world metres, ground z = 0)
const cam = camTest as CamJ;
// (tools/blender/hidebehind_forest.py): D runs left to right on screen, RT is the walker's right (toward camera)
const C0: [number, number] = [0.0, 3.5], D: [number, number] = [0.9846, -0.1748], RT: [number, number] = [-0.1748, -0.9846];
const at = (dd: number, s = 0.15) => project(cam, 1, [C0[0] + dd * D[0] + s * RT[0], C0[1] + dd * D[1] + s * RT[1], 0.03]);

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Img src={staticFile("hidebehind/chartest/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <defs>
        <radialGradient id="vig" cx={540} cy={1050} r={1150} gradientUnits="userSpaceOnUse">
          <stop offset="0.45" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.7} />
        </radialGradient>
      </defs>
      <g style={{ filter: "brightness(0.62) saturate(0.7)" }}>{children}</g>
      <rect width={1080} height={1920} fill="url(#vig)" />
    </svg>
  </AbsoluteFill>
);

/** walking test: in from the left, across the trail, a stop, a turn, and back the other way */
export const LibWalkTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const a = walk(T, 0.2, 3.9, 1.0), b = walk(T, 4.9, 8.8, 1.0);
  const back = T > 4.5;
  const s = -1.9 + a.s - b.s, P = at(s);
  return (
    <Stage>
      <Logger x={P.x} y={P.y} ppm={P.ppm} look={LOGGER} flip={back}
        pose={{ dist: back ? b.s : a.s, walk: back ? b.w : a.w, t: T, hold: "lantern", lookX: 0.35, blink: (T % 3.4) < 0.1, expr: "neutral" }} />
    </Stage>
  );
};

/** standing test: he stops, listens, looks over each shoulder, lifts the lantern to peer into the dark, lowers it */
export const LibStandTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const P = at(0.1);
  const look = T < 1.5 ? 0.35 : T < 3.0 ? -0.8 : T < 4.2 ? 0.8 : 0.3;
  const lift = sm((T - 4.4) / 0.7) * (1 - sm((T - 6.6) / 0.7));
  const arm: [number, number] | undefined = lift > 0 ? [6 + 52 * lift, 16 + 38 * lift] : undefined;
  const tilt = -6 * sm((T - 1.6) / 0.5) * (1 - sm((T - 2.9) / 0.4)) + 5 * sm((T - 3.1) / 0.4) * (1 - sm((T - 4.1) / 0.4));
  return (
    <Stage>
      <Logger x={P.x} y={P.y} ppm={P.ppm} look={LOGGER}
        pose={{ t: T, hold: "lantern", armNear: arm, lookX: look, tilt, blink: (T % 3.6) < 0.09,
          expr: T > 1.4 && T < 7 ? "worried" : "neutral" }} />
    </Stage>
  );
};
