// Character tests for the new Toon rig: a walking test and a standing test on the dusk camp set (static camera).
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Toon, ToonLook } from "./toon";
import camTest from "../../stories/tsavo/sets/chartest.json";

const FPS = 30;
export const TOON_WALK_FRAMES = 6 * FPS, TOON_STAND_FRAMES = 6 * FPS;
type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
const project = (cam: CamJ, f: number, p: [number, number, number]) => {
  const m = (cam.frames[String(f)] ?? cam.frames["1"]).m, c = cam.frames[String(f)] ?? cam.frames["1"];
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z };
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
/** walk at speed V between t0 and t1 with half-second starts and stops; returns metres walked and the walk amount */
const walk = (T: number, t0: number, t1: number, V: number) => {
  const v = (t: number) => V * sm((t - t0) / 0.5) * sm((t1 - t) / 0.5);
  let s = 0; const dt = 1 / 240;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};

export const PATTERSON_T: ToonLook = { skin: "#f2c6a0", top: "#bfa06a", topDark: "#8e7444", legs: "#7c6a4a", legsDark: "#5e5036", boots: "#4a2e1a", hair: "#5a3a22",
  hat: "pith", hatCol: "#ece2c6", band: "#8a7450", mustache: true, belt: "#5a3a22" };
export const WORKER_T: ToonLook = { skin: "#b07850", top: "#ece4d2", topDark: "#b8ae98", legs: "#d8ccb0", legsDark: "#a89c80", boots: "#5a3a22", hair: "#1a1210",
  hat: "turban", hatCol: "#e8892a", band: "#b05e14", mustache: true, long: true, sash: "#b05e14" };

const Plate: React.FC = () => <Img src={staticFile("tsavo3d/chartest/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />;
const cam = camTest as CamJ;
// ground point at depth dd in front of the test camera, s metres to the right of frame centre (walks run across frame)
const D = [0.944, 0.328], RT = [0.328, -0.944], C0 = [-1.5, 0.5];
const at = (dd: number, s: number) => project(cam, 1, [C0[0] + dd * D[0] + s * RT[0], C0[1] + dd * D[1] + s * RT[1], 0]);

export const ToonWalkTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const p = walk(T, 0.3, 4.3, 0.85), q = walk(T, 0.5, 6.0, 1.0);
  const P = at(4.2, -1.6 + p.s);
  const Q = at(5.8, 2.4 - q.s);
  return (
    <AbsoluteFill>
      <Plate />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Toon x={Q.x} y={Q.y} ppm={Q.ppm} look={WORKER_T} flip pose={{ dist: q.s, walk: q.w, t: T + 2, lookX: 0.3, blink: (T % 2.7) < 0.1 }} shade={0.92} />
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} pose={{ dist: p.s, walk: p.w, t: T, lookX: 0.4, blink: (T % 3.1) < 0.1, expr: "neutral" }} />
      </svg>
    </AbsoluteFill>
  );
};

/** a pointing gesture: the arm lifts from rest, holds, and settles back (elbow straightens as it rises) */
const point = (T: number): [number, number] | undefined => {
  const k = sm((T - 3.2) / 0.5) * (1 - sm((T - 4.8) / 0.6));
  return k > 0 ? [2 + 86 * k + 2 * Math.sin(T * 2.3) * k, 8 + 20 * Math.sin(Math.PI * Math.min(1, k * 1.0)) * (1 - k) - 4 * k] : undefined;
};

export const ToonStandTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const P = at(3.4, -0.3), Q = at(4.8, 0.9);
  const look = T < 2.2 ? 0.4 : T < 3.6 ? -0.6 : 0.4;
  return (
    <AbsoluteFill>
      <Plate />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Toon x={Q.x} y={Q.y} ppm={Q.ppm} look={WORKER_T} flip pose={{ t: T + 1.3, lookX: 0.5, blink: ((T + 1) % 2.9) < 0.1 }} shade={0.92} />
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} pose={{ t: T, lookX: look, blink: (T % 3.3) < 0.1 || Math.abs(T - 2.25) < 0.05, expr: T > 3.3 && T < 5.0 ? "stern" : "neutral",
          armNear: point(T) }} />
      </svg>
    </AbsoluteFill>
  );
};
