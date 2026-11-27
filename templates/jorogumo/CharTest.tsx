// Character tests for the spider woman Short (v2): a walking test and a standing test in the abandoned house.
// Still camera (a full-res Blender plate, so nothing in the background can stutter) with every moving thing drawn
// at a steady 30 fps: the cast, the lantern flicker, the dust in the moonlight, and the foreground layer on top.
// The flat cast gets real-looking light: a pillow-shaded volume lit warm from the lantern side, a cold moon rim
// from the screens behind, contact shadows, and long soft shadows thrown away from the lantern.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Kimono, KLook, KPose } from "./kimono";
import camTest from "../../stories/jorogumo/sets/chartest.json";

const FPS = 30;
export const J_WALK_FRAMES = 7 * FPS, J_STAND_FRAMES = 7 * FPS;
type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
export const project = (cam: CamJ, f: number, p: [number, number, number]) => {
  const c = cam.frames[String(f)] ?? cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z };
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
/** distance walked at speed V between t0 and t1 with eased starts and stops (integrated, so feet never slide) */
export const walk = (T: number, t0: number, t1: number, V: number, ease = 0.6) => {
  const v = (t: number) => V * sm((t - t0) / ease) * sm((t1 - t) / ease);
  let s = 0; const dt = 1 / 240;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};

export const SAMURAI: KLook = { kind: "samurai", skin: "#e6bc96", top: "#3d4b68", topDark: "#28324a", legs: "#55504c", legsDark: "#3a3532",
  hair: "#17121a", sock: "#ece8de", sole: "#a98c55", obi: "#7a2a22", obiDark: "#4a1812", collar: "#e8e2d6", stride: 0.88, lift: 1.0, sleeve: 0.24 };
export const LADY: KLook = { kind: "lady", skin: "#f3e4dc", top: "#3e2040", topDark: "#28132a", legs: "#3e2040", legsDark: "#28132a",
  hair: "#120e14", sock: "#f2eee6", sole: "#2a1a14", obi: "#c9a24a", obiDark: "#8a6a2a", collar: "#f1ebe4", stride: 0.3, lift: 0.12, sleeve: 0.46,
  lips: "#b0142c", pin: "#c4202c", pattern: "#c9c4d6", flower: "#c42030" };

export const cam = camTest as CamJ;
export const at = (dd: number, s: number) => project(cam, 1, [s, -3.4 + dd, 0.05]);
export const LAMP = project(cam, 1, [1.05, 1.5, 0.42]);

/** one cast member with light: shading from its own blurred silhouette (so it reads as round, not flat) */
export const Lit: React.FC<{ id: string; x: number; y: number; ppm: number; look: KLook; pose: KPose; flip?: boolean; flick: number }> =
  ({ id, x, y, ppm, look, pose, flip, flick }) => {
    const dx = LAMP.x - x, away = dx > 0 ? -1 : 1, dist = Math.abs(dx) / ppm;
    const len = Math.min(2.2, 0.6 + dist * 0.45) * ppm;      // the farther from the lantern, the longer the shadow
    return <g>
      <defs>
        <filter id={`lit-${id}`} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={ppm * 0.035} result="b" />
          <feDiffuseLighting in="b" surfaceScale={ppm * 0.03} diffuseConstant={1.05 * flick} lightingColor="#ffc890" result="warm">
            <fePointLight x={LAMP.x} y={LAMP.y - ppm * 0.3} z={ppm * 1.4} />
          </feDiffuseLighting>
          <feDiffuseLighting in="b" surfaceScale={ppm * 0.03} diffuseConstant={0.55} lightingColor="#a8b8f0" result="cool">
            <feDistantLight azimuth={-90} elevation={40} />
          </feDiffuseLighting>
          <feComposite in="warm" in2="cool" operator="arithmetic" k2={0.52} k3={0.62} result="light" />
          <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1={1} result="shaded" />
          <feSpecularLighting in="b" surfaceScale={ppm * 0.03} specularConstant={0.9} specularExponent={14} lightingColor="#b4c8ff" result="spec">
            <feDistantLight azimuth={-90} elevation={12} />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="rim" />
          <feComposite in="shaded" in2="rim" operator="arithmetic" k2={1} k3={0.35} result="all" />
          <feComposite in="all" in2="SourceAlpha" operator="in" />
        </filter>
        <linearGradient id={`sh-${id}`} x1={0} x2={1}>
          <stop offset="0" stopColor="#000" stopOpacity={0.5} /><stop offset="1" stopColor="#000" stopOpacity={0} />
        </linearGradient>
        <filter id={`blur-${id}`} x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation={ppm * 0.04} /></filter>
      </defs>
      {/* long shadow on the floor, thrown away from the lantern */}
      <g filter={`url(#blur-${id})`} transform={`translate(${x},${y}) scale(${away},1)`}>
        <path d={`M0,${-0.05 * ppm} L${len},${-0.16 * ppm} L${len},${0.1 * ppm} L0,${0.06 * ppm} Z`} fill={`url(#sh-${id})`} opacity={0.9 * flick} />
      </g>
      <g filter={`url(#lit-${id})`}>
        <Kimono x={x} y={y} ppm={ppm} look={look} pose={pose} flip={flip} />
      </g>
    </g>;
  };

/** dust drifting through the moonlit air: slow, deterministic, the same speed every frame (no jitter) */
export const Dust: React.FC<{ t: number }> = ({ t }) => {
  const motes = Array.from({ length: 46 }, (_, i) => {
    const r = (k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
    const x = ((r(1) * 1080 + t * (8 + r(2) * 14) + 20 * Math.sin(t * 0.4 + i)) % 1140) - 30;
    const y = 640 + r(3) * 900 + 26 * Math.sin(t * (0.25 + r(4) * 0.3) + i) - t * (3 + r(5) * 5);
    const warm = Math.hypot(x - LAMP.x, y - LAMP.y) < 380;
    return <circle key={i} cx={x} cy={y} r={1.2 + r(6) * 2.4} fill={warm ? "#ffd8a0" : "#c8d6ff"} opacity={(0.25 + 0.35 * r(7)) * (0.6 + 0.4 * Math.sin(t * 1.3 + i))} />;
  });
  return <g style={{ mixBlendMode: "screen" }}>{motes}</g>;
};

const Stage: React.FC<{ children: (flick: number) => React.ReactNode; t: number }> = ({ children, t }) => {
  // lantern flicker: a few slow sines, so it breathes rather than strobes
  const flick = 0.92 + 0.05 * Math.sin(t * 7.3) + 0.03 * Math.sin(t * 13.9 + 1.2);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Img src={staticFile("jorogumo/chartest/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="lamp" cx={LAMP.x} cy={LAMP.y} r={520} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffb060" stopOpacity={0.3 * flick} /><stop offset="1" stopColor="#ff8030" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="vig" cx={540} cy={1000} r={1250} gradientUnits="userSpaceOnUse">
            <stop offset="0.55" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.6} />
          </radialGradient>
        </defs>
        {children(flick)}
        <Dust t={t} />
        <rect width={1080} height={1920} fill="url(#lamp)" style={{ mixBlendMode: "screen" }} />
      </svg>
      <Img src={staticFile("jorogumo/chartest/fg_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}><rect width={1080} height={1920} fill="url(#vig2)" />
        <defs><radialGradient id="vig2" cx={540} cy={1000} r={1250} gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.6} /></radialGradient></defs>
      </svg>
    </AbsoluteFill>
  );
};

export const JWalkTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const p = walk(T, 0.2, 5.2, 0.64), q = walk(T, 0.3, 7.6, 0.29, 1.2);
  const P = at(1.85, -1.4 + p.s), Q = at(3.1, 1.7 - q.s);
  // she keeps her head level and, once he has passed, slowly tilts it
  const tilt = -8 * sm((T - 5.2) / 1.4);
  return (
    <Stage t={T}>{(flick) => <>
      <Lit id="lady" flick={flick} x={Q.x} y={Q.y} ppm={Q.ppm} look={LADY} flip pose={{ dist: q.s, walk: q.w, t: T + 2, lookX: 0.2, blink: Math.abs(T - 2.9) < 0.06, expr: "eerie", glide: true, tilt }} />
      <Lit id="sam" flick={flick} x={P.x} y={P.y} ppm={P.ppm} look={SAMURAI} pose={{ dist: p.s, walk: p.w, t: T, lookX: T > 2.2 && T < 4.2 ? -0.2 : 0.4, blink: (T % 3.1) < 0.1, expr: "stern" }} />
    </>}</Stage>
  );
};

const grip = (T: number): [number, number] | undefined => {
  const k = sm((T - 2.6) / 0.55) * (1 - sm((T - 5.4) / 0.6));
  return k > 0 ? [2 + 2 * k, 8 + 85 * k] : undefined;
};

export const JStandTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const P = at(1.85, -0.35), Q = at(3.1, 0.55);
  const look = T < 1.6 ? 0.4 : T < 2.5 ? -0.7 : 0.5;
  const tilt = -9 * sm((T - 3.2) / 1.2) * (1 - sm((T - 5.8) / 0.8));
  return (
    <Stage t={T}>{(flick) => <>
      <Lit id="lady" flick={flick} x={Q.x} y={Q.y} ppm={Q.ppm} look={LADY} flip pose={{ t: T + 1.3, lookX: 0.5, blink: Math.abs(T - 4.6) < 0.06, expr: "eerie", tilt, glide: true,
        armNear: [8, 72 + 2 * Math.sin(T * 1.1)], armFar: [6, 78] }} />
      <Lit id="sam" flick={flick} x={P.x} y={P.y} ppm={P.ppm} look={SAMURAI} pose={{ t: T, lookX: look, blink: (T % 3.3) < 0.1 || Math.abs(T - 1.65) < 0.05,
        expr: T > 2.4 && T < 5.6 ? "worried" : "stern", armNear: grip(T) }} />
    </>}</Stage>
  );
};
