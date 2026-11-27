// Character tests for "The Ahuizotl": a walking test and a standing test on the moonlit shore of Lake Texcoco.
// Same method as the Spider Woman tests (templates/jorogumo/CharTest.tsx): one full-res Blender plate (nothing in the
// background can stutter) with every moving thing drawn at a steady 30 fps on top: the fisherman, his shadow, mist
// drifting over the water, moon glints on the water, and a foreground layer of swaying tule reeds.
// The plate is wide (2400x1920, tools/blender/ahuizotl_lake.py): the walk test pans a 1080x1920 window across it with
// him (a tripod pan: one image sliding, so it is smooth), the standing test holds the window still.
// The flat cast gets moonlight: a pillow-shaded volume lit cold from the moon (up and ahead of him), a dim cool fill
// from the front, a bright cold rim on the moon side, soft contact shadows and a long shadow thrown toward the lens.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Fisherman, FPose } from "./fisherman";
import camTest from "../../stories/ahuizotl/sets/chartest.json";

const FPS = 30;
export const AHZ_WALK_FRAMES = 7 * FPS, AHZ_STAND_FRAMES = 7 * FPS;
type CamJ = { w: number; h: number; frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
export const cam = camTest as CamJ;
export const PW = cam.w, PH = cam.h;   // plate size in px (2400 x 1920)

/** world point -> plate pixels (x across the whole wide plate) and pixels per metre at that depth */
export const project = (p: [number, number, number]) => {
  const c = cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * PH, z = Math.max(0.05, -Z);
  return { x: PW / 2 + (fpx * X) / z, y: PH / 2 - (fpx * Y) / z, ppm: fpx / z, z };
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const sm5 = (v: number) => { const c = clamp01(v); return c * c * c * (c * (c * 6 - 15) + 10); };
/** distance walked at speed V between t0 and t1 with eased starts and stops (integrated, so feet never slide) */
export const walk = (T: number, t0: number, t1: number, V: number, ease = 0.6) => {
  const v = (t: number) => V * sm((t - t0) / ease) * sm((t1 - t) / ease);
  let s = 0; const dt = 1 / 240;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};
const rnd = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

// the moon (same direction as MOON_DIR in the Blender script) and where its path lies on the water
const MOON_DIR: [number, number, number] = (() => { const v = [0.15, 0.94, 0.3], l = Math.hypot(...v); return v.map((a) => a / l) as [number, number, number]; })();
const CAMP = [cam.frames["1"].m[0][3], cam.frames["1"].m[1][3], cam.frames["1"].m[2][3]];
export const MOON = project([CAMP[0] + MOON_DIR[0] * 1000, CAMP[1] + MOON_DIR[1] * 1000, CAMP[2] + MOON_DIR[2] * 1000]);
const WATER_Z = -0.07;
/** where the fisherman stands on the bank (y = depth from the walk line) */
export const at = (x: number, y = 0) => project([x, y, 0.0]);

/** the fisherman lit by the moon: shading from his own blurred silhouette (so he reads as round, not flat) */
export const MoonLit: React.FC<{ id: string; x: number; y: number; ppm: number; pose: FPose; flip?: boolean; feet?: [number, number] }> =
  ({ id, x, y, ppm, pose, flip, feet }) => {
    return <g>
      <defs>
        <filter id={`lit-${id}`} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={ppm * 0.03} result="b" />
          {/* key: the moon, up and ahead of him (screen up-right) */}
          <feDiffuseLighting in="b" surfaceScale={ppm * 0.03} diffuseConstant={1.0} lightingColor="#b8c8ff" result="key">
            <feDistantLight azimuth={flip ? -140 : -40} elevation={34} />
          </feDiffuseLighting>
          {/* fill: dim and cool, from the front-left (the sky behind the camera) */}
          <feDiffuseLighting in="b" surfaceScale={ppm * 0.03} diffuseConstant={0.7} lightingColor="#5a6a9a" result="fill">
            <feDistantLight azimuth={flip ? 20 : 160} elevation={25} />
          </feDiffuseLighting>
          <feComposite in="key" in2="fill" operator="arithmetic" k2={0.62} k3={0.5} k4={0.08} result="light" />
          <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1={1.05} result="shaded" />
          {/* rim: a bright cold edge on the moon side */}
          <feSpecularLighting in="b" surfaceScale={ppm * 0.03} specularConstant={1.1} specularExponent={16} lightingColor="#d4e2ff" result="spec">
            <feDistantLight azimuth={flip ? -175 : -5} elevation={10} />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="rim" />
          <feComposite in="shaded" in2="rim" operator="arithmetic" k2={1} k3={0.5} result="all" />
          <feComposite in="all" in2="SourceAlpha" operator="in" />
        </filter>
        <filter id={`soft-${id}`} x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation={ppm * 0.03} /></filter>
        <linearGradient id={`sh-${id}`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0" stopColor="#000" stopOpacity={0.55} /><stop offset="1" stopColor="#000" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* long shadow thrown toward the lens (the moon is behind him), then soft contact shadows under the feet */}
      <g filter={`url(#soft-${id})`}>
        <path d={`M${x - 0.22 * ppm},${y - 0.01 * ppm} L${x + 0.2 * ppm},${y - 0.01 * ppm} L${x - 0.05 * ppm},${y + 0.75 * ppm} L${x - 0.55 * ppm},${y + 0.72 * ppm} Z`} fill={`url(#sh-${id})`} />
        <ellipse cx={x} cy={y + 0.005 * ppm} rx={0.32 * ppm} ry={0.045 * ppm} fill="#000" opacity={0.42} />
        {feet && feet.map((fx, i) => <ellipse key={i} cx={x + (flip ? -1 : 1) * (fx + 0.05) * ppm} cy={y + 0.006 * ppm} rx={0.13 * ppm} ry={0.025 * ppm} fill="#000" opacity={0.5} />)}
      </g>
      <g filter={`url(#lit-${id})`}>
        <Fisherman id={id} x={x} y={y} ppm={ppm} pose={pose} flip={flip} />
      </g>
    </g>;
  };

/** moon glints: short bright dashes along the moon's path on the water, each twinkling on its own slow cycle */
const Glints: React.FC<{ t: number }> = ({ t }) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 90; i++) {
    // each glint lives for one pulse: it brightens, drifts sideways with the ripple, fades; the next pulse of the same
    // glint appears somewhere new (the jump happens while it is dark, so nothing pops)
    const ph = t * (1.1 + 1.6 * rnd(i, 3)) + rnd(i, 4) * 6.28, n = Math.floor(ph / (2 * Math.PI)), u = ph / (2 * Math.PI) - n;
    if (u > 0.5) continue;
    const k = Math.sin(u * 2 * Math.PI) ** 2;
    const j = i * 37 + n * 101;
    const yw = 2.6 + 45 * rnd(j, 1) ** 2.2;
    const spread = 0.12 + 0.045 * yw;
    const xw = CAMP[0] + (yw - CAMP[1]) * (MOON_DIR[0] / MOON_DIR[1]) + (rnd(j, 2) - 0.5) * 2 * spread * (0.4 + rnd(j, 7));
    const p = project([xw, yw, WATER_Z]);
    const drift = (rnd(j, 6) < 0.5 ? -1 : 1) * (40 + 50 * rnd(j, 8)) * u * (2 * Math.PI) / (1.1 + 1.6 * rnd(i, 3));   // px, ~1.5-3 px a frame
    const len = (0.07 + 0.16 * rnd(j, 5)) * p.ppm;
    out.push(<rect key={i} x={p.x - len / 2 + drift} y={p.y - 1.5} width={len} height={Math.max(3, 0.02 * p.ppm)} rx={1.5} fill="#e8f0ff" opacity={0.9 * k} />);
  }
  return <g style={{ mixBlendMode: "screen" }}>{out}</g>;
};

/** low mist drifting over the water and the waterline: big soft gradient blobs, slow and steady */
const Mist: React.FC<{ t: number }> = ({ t }) => {
  const hz = project([0, 60, WATER_Z]).y, edge = project([0, 1.0, WATER_Z]).y;
  return <g style={{ mixBlendMode: "screen" }}>
    <defs>
      <radialGradient id="mistb"><stop offset="0" stopColor="#a8b8e0" stopOpacity={0.5} /><stop offset="1" stopColor="#a8b8e0" stopOpacity={0} /></radialGradient>
    </defs>
    {Array.from({ length: 16 }, (_, i) => {
      const yy = hz + (edge - hz) * (0.1 + 0.85 * rnd(i, 1)) + 8 * Math.sin(t * 0.3 + i);
      const sp = 10 + 14 * rnd(i, 2), span = PW + 1400;
      const xx = ((rnd(i, 3) * span + t * sp) % span) - 700;
      const rw = 380 + 420 * rnd(i, 4), rh = 40 + 60 * rnd(i, 5) * (0.5 + (yy - hz) / (edge - hz));
      return <ellipse key={i} cx={xx} cy={yy} rx={rw} ry={rh} fill="url(#mistb)" opacity={0.28 + 0.22 * rnd(i, 6)} />;
    })}
    {/* a thin bright haze along the horizon line under the moon */}
    <ellipse cx={MOON.x} cy={hz + 6} rx={900} ry={36} fill="url(#mistb)" opacity={0.35} />
  </g>;
};

/** foreground tule stems close to the lens: dark, out of focus, swaying in slow gusts; screen x already includes the pan */
type Clump = [number, number, number];
/** walk: clumps along the bank in "fg space" (they pass by 1.25x faster than the plate pans); placed so that he ends
 *  between two of them. stand: the camera is still, so they sit at the frame edges */
export const FG_WALK: Clump[] = [[-60, 6, 1.0], [1050, 4, 0.7], [1560, 5, 0.9], [2690, 5, 0.8]];
export const FG_STAND: Clump[] = [[-50, 6, 1.3], [1120, 5, 1.15]];
const FgReeds: React.FC<{ t: number; pan: number; ids: string; clumps: Clump[] }> = ({ t, pan, ids, clumps }) => {
  // clumps along the bank near the lens: [x px, number of stems, height factor]
  const stems: React.ReactNode[] = [];
  clumps.forEach(([cx, n, hf], ci) => {
    const sx = cx - pan * 1.25;
    if (sx < -400 || sx > 1480) return;
    for (let j = 0; j < n; j++) {
      const id = ci * 10 + j;
      const bx = sx + (rnd(id, 1) - 0.5) * 140, by = 1960;
      const h = (600 + 600 * rnd(id, 2)) * hf, lean = (rnd(id, 3) - 0.5) * 220;
      const gust = 0.6 + 0.4 * Math.sin(t * 0.35 + cx * 0.002);
      const sw = (22 * Math.sin(t * (0.7 + 0.35 * rnd(id, 4)) + rnd(id, 5) * 6) + 10 * Math.sin(t * 1.7 + id)) * gust * (h / 1000);
      const tx = bx + lean + sw, ty = by - h, mx = bx + lean * 0.45 + sw * 0.35, my = by - h * 0.55;
      const w0 = 16 + 14 * rnd(id, 6);
      const d = `M${bx - w0},${by} Q${mx - w0 * 0.6},${my} ${tx},${ty} Q${mx + w0 * 0.6},${my} ${bx + w0},${by} Z`;
      stems.push(<path key={id} d={d} fill="#05070b" />);
      stems.push(<path key={id + "r"} d={`M${bx + w0 * 0.7},${by} Q${mx + w0 * 0.5},${my} ${tx},${ty}`} stroke="#6c80b0" strokeWidth={2.2} fill="none" opacity={0.45} />);
      if (rnd(id, 8) < 0.5) stems.push(<ellipse key={id + "t"} cx={tx + 4} cy={ty + 16} rx={9} ry={20} transform={`rotate(${15 + sw * 0.3},${tx + 4},${ty + 16})`} fill="#1a120c" />);
    }
  });
  return <g filter={`url(#fgblur-${ids})`}>{stems}</g>;
};

const Stage: React.FC<{ t: number; pan: number; ids: string; fg: Clump[]; fgPan: number; children: React.ReactNode }> = ({ t, pan, ids, fg, fgPan, children }) => (
  <AbsoluteFill style={{ backgroundColor: "#03050a", overflow: "hidden" }}>
    <Img src={staticFile("ahuizotl/chartest/f_0001.png")} style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transform: `translateX(${-pan}px)` }} />
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <defs>
        <filter id={`fgblur-${ids}`} x="-20%" y="-10%" width="140%" height="120%"><feGaussianBlur stdDeviation={7} /></filter>
        <radialGradient id={`vig-${ids}`} cx={540} cy={1000} r={1250} gradientUnits="userSpaceOnUse">
          <stop offset="0.5" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.62} />
        </radialGradient>
        <linearGradient id={`moonwash-${ids}`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0" stopColor="#7088c0" stopOpacity={0.0} /><stop offset="0.55" stopColor="#7088c0" stopOpacity={0.06} /><stop offset="1" stopColor="#000" stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <g transform={`translate(${-pan},0)`}>
        {/* the plate's mirror image of the moon disc in the near water reads as a lamp at the waterline: damp it to a soft
            glow (plate px 1360-1500 x 1108-1211); the 2D glints carry the shimmer there */}
        <radialGradient id={`moondamp-${ids}`}><stop offset="0" stopColor="#0c1424" stopOpacity={0.72} /><stop offset="0.6" stopColor="#0c1424" stopOpacity={0.45} /><stop offset="1" stopColor="#0c1424" stopOpacity={0} /></radialGradient>
        <ellipse cx={1432} cy={1158} rx={150} ry={80} fill={`url(#moondamp-${ids})`} />
        <Glints t={t} />
        <Mist t={t} />
        {children}
      </g>
      <FgReeds t={t} pan={fgPan} ids={ids} clumps={fg} />
      <rect width={1080} height={1920} fill={`url(#moonwash-${ids})`} />
      <rect width={1080} height={1920} fill={`url(#vig-${ids})`} />
    </svg>
  </AbsoluteFill>
);

// walk test timing: he is already walking when the clip starts, slows and stops at 5.0 s, settles, then listens
const W_T0 = -2, W_T1 = 4.6, W_V = 0.73, W_Y = 0.05;
const W_X0 = 0.5 + (-150 - PW / 2) / at(0, W_Y).ppm - walk(0, W_T0, W_T1, W_V, 0.9).s;   // just inside the left edge at frame 0
const PAN_MAX = PW - 1080;
export const AhzWalkTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const p = walk(T, W_T0, W_T1, W_V, 0.9);
  const P = at(W_X0 + p.s, W_Y);
  // the pan: one smooth ease from the left end of the plate to the right end, timed to keep him left of centre
  const pan = PAN_MAX * sm5(T / 5.0);
    const pose: FPose = {
    dist: p.s, walk: p.w, t: T, expr: T > 5.5 ? "wary" : "neutral", lookX: 0.5 + 0.4 * sm((T - 5.4) / 0.3),
    blink: Math.abs(T - 1.7) < 0.06 || Math.abs(T - 4.0) < 0.06, turn: 0.6 * sm((T - 5.5) / 0.7), tilt: -2 * sm((T - 5.5) / 0.7),
  };
  return <Stage t={T} pan={pan} ids="w" fg={FG_WALK} fgPan={pan}>
    <MoonLit id="fw" x={P.x} y={P.y} ppm={P.ppm} pose={pose} />
  </Stage>;
};

export const STAND_X = 1.0, STAND_Y = 0.2;
export const STAND_PAN = Math.round(at(STAND_X, STAND_Y).x - 420);
export const AhzStandTest: React.FC = () => {
  const T = useCurrentFrame() / FPS;
  const P = at(STAND_X, STAND_Y);
  // he listens: a first small glance toward the reeds, back, then a slower held turn toward them with a lean in
  const turn = 0.35 * sm((T - 1.0) / 0.5) * (1 - sm((T - 2.3) / 0.6)) + 0.85 * sm((T - 3.6) / 0.9);
  const lookX = 0.5 + 0.45 * sm((T - 0.9) / 0.3) - 0.45 * sm((T - 2.2) / 0.3) + 0.5 * sm((T - 3.5) / 0.4);
  const pose: FPose = {
    t: T, expr: T > 3.4 ? "wary" : "neutral", lookX, turn, tilt: -3 * sm((T - 3.6) / 0.9) + 1.5 * sm((T - 5.4) / 1.0), slump: 1.5 * sm((T - 3.8) / 1.0),
    blink: Math.abs(T - 0.6) < 0.06 || Math.abs(T - 3.3) < 0.06 || Math.abs(T - 6.3) < 0.06, breath: 1 - 0.4 * sm((T - 3.7) / 0.6),
  };
  return <Stage t={T} pan={STAND_PAN} ids="s" fg={FG_STAND} fgPan={0}>
    <MoonLit id="fs" x={P.x} y={P.y} ppm={P.ppm} pose={pose} />
  </Stage>;
};
