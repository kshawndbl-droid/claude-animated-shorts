// Part A of "The Jersey Devil" (story 0.00 - 12.80 s, 384 frames, lines 1-2): the 1735 prologue in a Pine Barrens
// cabin on a stormy night. Plates: tools/blender/jerseydevil_cabin.py (one still camera per shot; fire "hi"/"lo"
// cross-faded per frame for a real firelight flicker, a "flash" plate for the lightning, an "out" plate for the
// guttered fire, and the cradle rendered alone at rock angles -6..6 deg so it rocks with true perspective and light).
// Camera moves are slow 2.5D pushes on the 1296 px plates. On top, through the same camera: the 2D fire, the candle,
// the mother (templates/jerseydevil/mother.tsx), rain at the window, the creature's shadow on the wall (JerseyDevil,
// shadow pose: never shown clearly in this part), the dark shape bursting up the chimney, soot, smoke haze.
//  s1  0.00-4.30  wide: the cabin, the storm (lightning ~1.0 s, thunder 1.2 s), the mother beside the cradle; she
//                 bends and rocks it (creak 3.2 s)
//  s2  4.30-7.45  close: the mother as a silhouette against the fire, rocking (creak 5.0 s); on "cursed" she lets go
//                 and straightens, arms down; lightning (thunder 7.0 s) washes her cold blue
//  s3  7.45-10.95 the cradle rocks on its own; on the wall behind it the firelight throws a shadow that grows hooves
//                 (~8.7), wings (~9.25), a tail (~9.95), then swells huge toward the hearth
//  s4  10.95-12.80 the hearth: a dark shape bursts out past the cradle into the fire and up the chimney (whoosh/flaps
//                 11.07-11.95), the fire gutters, soot falls, the empty cradle still rocks; the push ends on the flue
// Video only (no audio, no subtitles): the main thread lays the approved mix v2 + subtitles over the assembled parts.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Mother } from "./mother";
import { JerseyDevil } from "./devil";
import camS1 from "../../stories/jerseydevil/sets/partA/s1.json";
import camS2 from "../../stories/jerseydevil/sets/partA/s2.json";
import camS3 from "../../stories/jerseydevil/sets/partA/s3.json";
import camS4 from "../../stories/jerseydevil/sets/partA/s4.json";

const FPS = 30;
export const JD_PART_A_FRAMES = 384;
type CamJ = { cradle: number[]; frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
const CAMS: Record<string, CamJ> = { s1: camS1 as CamJ, s2: camS2 as CamJ, s3: camS3 as CamJ, s4: camS4 as CamJ };
const SHOTS: [string, number, number][] = [["s1", 0, 4.3], ["s2", 4.3, 7.45], ["s3", 7.45, 10.95], ["s4", 10.95, 12.8]];
type P3 = [number, number, number];

const project = (cam: CamJ, p: P3) => {
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
const win = (T: number, a: number, b: number, e = 0.35) => sm((T - a) / e) * (1 - sm((T - (b - e)) / e));

// set constants (tools/blender/jerseydevil_cabin.py)
const CR = { x: -0.55, y: 1.3, R: 0.55 };
const FIRE: P3 = [0.6, 2.02, 0.07];
const CANDLE: P3 = [1.6, -0.1, 0.97];
const WIN = { x: -2.72, y: -0.6, z: 1.3 };
const MOTHER = { x: -0.95, y: 1.55 };

/** firelight: a smooth organic flicker 0..1 (incommensurate sines, nothing jumps frame to frame) */
const flick = (t: number) => clamp01(0.55 + 0.2 * Math.sin(t * 7.3) + 0.14 * Math.sin(t * 12.9 + 1.3) + 0.1 * Math.sin(t * 3.1 + 0.4) + 0.06 * Math.sin(t * 21.7 + 2.2));
/** lightning: a quick double flash with a fading tail */
const bolt = (T: number, at: number) => {
  const u = T - at;
  if (u < 0 || u > 0.7) return 0;
  return Math.max(Math.exp(-((u - 0.0) ** 2) / 0.0012), 0.75 * Math.exp(-((u - 0.16) ** 2) / 0.0018), 0.3 * Math.exp(-u * 4) * (u > 0.16 ? 1 : 0));
};
const FLASHES = [0.95, 6.72];
const flashAt = (T: number) => Math.min(1, FLASHES.reduce((a, f) => a + bolt(T, f), 0));

/** cradle rock angle (degrees) at time T; phase integrated so the rhythm changes smoothly */
const rockAngle = (T: number) => {
  let ph = 0, a = 0;
  const dt = 1 / 240;
  for (let q = 0; q <= T; q += dt) {
    let f = 0.75, amp = 0;
    if (q < 7.45) {
      amp = 4.2 * win(q, 3.15, 4.7, 0.3) + 4.2 * win(q, 4.95, 6.35, 0.3);
    } else if (q < 10.95) {
      // on its own: it starts, quickens, jolts on the hooves / wings / tail
      amp = 5.2 * sm((q - 7.6) / 0.8) + 0.8 * win(q, 8.6, 9.0, 0.1) + 0.8 * win(q, 9.15, 9.5, 0.1) + 0.6 * win(q, 9.85, 10.3, 0.1);
      f = mix(0.85, 1.35, sm((q - 7.6) / 2.5));
    } else {
      // after the thing is gone: a hard last swing, then dying away
      amp = 5.8 * Math.exp(-Math.max(0, q - 11.2) * 0.55) * sm((q - 10.95) / 0.15);
      f = 0.85;
    }
    ph += 2 * Math.PI * f * dt;
    a = amp * Math.sin(ph);
  }
  return Math.max(-6, Math.min(6, a));
};

/** the rocking cradle: the two nearest pre-rendered angles, cross-faded; brightness follows the fire */
const Cradle: React.FC<{ shot: string; a: number; k: number; cold: number }> = ({ shot, a, k, cold }) => {
  const lo = Math.max(-6, Math.min(4, Math.floor(a / 2) * 2)), f = clamp01((a - lo) / 2);
  const n = (v: number) => `${v >= 0 ? "+" : ""}${v}`;
  const st = { position: "absolute" as const, width: 1080, height: 1920, filter: `brightness(${0.82 + 0.3 * k + 0.9 * cold}) saturate(${1 - 0.5 * cold})` };
  return <>
    <Img src={staticFile(`jerseydevil/partA/${shot}_rock${n(lo)}.png`)} style={{ ...st, opacity: 1 }} />
    <Img src={staticFile(`jerseydevil/partA/${shot}_rock${n(lo + 2)}.png`)} style={{ ...st, opacity: f }} />
  </>;
};

/** world position of a point on the cradle (relative to its rest position) when rocked by a degrees */
const cradlePt = (dx: number, dy: number, z: number, a: number): P3 => {
  const r = (a * Math.PI) / 180, rz = z - CR.R;
  return [CR.x + CR.R * r + dx * Math.cos(r) + rz * Math.sin(r), CR.y + dy, CR.R - dx * Math.sin(r) + rz * Math.cos(r)];
};

const Plates: React.FC<{ shot: string; k: number; fl: number; out: number }> = ({ shot, k, fl, out }) => {
  const st = { position: "absolute" as const, width: 1080, height: 1920 };
  return <>
    <Img src={staticFile(`jerseydevil/partA/${shot}_lo.png`)} style={st} />
    <Img src={staticFile(`jerseydevil/partA/${shot}_hi.png`)} style={{ ...st, opacity: k }} />
    {(shot === "s1" || shot === "s2") && <Img src={staticFile(`jerseydevil/partA/${shot}_flash.png`)} style={{ ...st, opacity: fl }} />}
    {shot === "s4" && <Img src={staticFile(`jerseydevil/partA/s4_out.png`)} style={{ ...st, opacity: out }} />}
  </>;
};

/** hearth flames (2D), base at screen (x, y), s = px per metre; g = 1 full fire .. 0 guttered to embers, lean = draught */
const Flames: React.FC<{ x: number; y: number; s: number; t: number; k: number; g?: number; lean?: number; id: string }> = ({ x, y, s, t, k, g = 1, lean = 0, id }) => {
  const tongues = [-0.3, -0.18, -0.06, 0.06, 0.17, 0.28];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
      <defs>
        <radialGradient id={`${id}g`}><stop offset="0" stopColor="#ffb25a" stopOpacity={0.5} /><stop offset="0.4" stopColor="#ff7a2a" stopOpacity={0.16} /><stop offset="1" stopColor="#ff5a10" stopOpacity={0} /></radialGradient>
        <linearGradient id={`${id}f`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#fff1c0" /><stop offset="0.35" stopColor="#ffb040" /><stop offset="0.8" stopColor="#ff5a14" /><stop offset="1" stopColor="#c02808" stopOpacity={0} /></linearGradient>
        <filter id={`${id}b`}><feGaussianBlur stdDeviation={Math.max(0.6, s * 0.01)} /></filter>
      </defs>
      <ellipse cx={x} cy={y - 0.3 * s} rx={1.3 * s} ry={0.9 * s} fill={`url(#${id}g)`} opacity={(0.55 + 0.4 * k) * (0.35 + 0.65 * g)} style={{ mixBlendMode: "screen" }} />
      <g filter={`url(#${id}b)`} style={{ mixBlendMode: "screen" }}>
        {tongues.map((o, i) => {
          const h = s * (0.42 + 0.26 * (1 - Math.abs(o) * 2.6) + 0.12 * Math.sin(t * (6 + i * 1.7) + i * 2.1) + 0.1 * k) * (0.15 + 0.85 * g);
          const w = s * (0.07 + 0.03 * Math.sin(t * 5 + i)) * (0.6 + 0.4 * g);
          const bx = x + o * s, sway = s * (0.05 * Math.sin(t * (4.1 + i) + i * 1.3) + lean * 0.35);
          return <path key={i} d={`M${bx - w},${y} Q${bx - w * 1.1},${y - h * 0.45} ${bx + sway},${y - h} Q${bx + w * 1.1},${y - h * 0.45} ${bx + w},${y} Z`} fill={`url(#${id}f)`} opacity={0.85} />;
        })}
      </g>
      {Array.from({ length: 12 }).map((_, i) => {
        const per = 1.4 + (i % 5) * 0.3, ph = ((t + i * 0.37) % per) / per;
        const sx = x + s * (0.3 * Math.sin(i * 7.1) + 0.25 * ph * Math.sin(t * 1.3 + i)), sy = y - s * (0.3 + 1.6 * ph);
        return <circle key={i} cx={sx} cy={sy} r={Math.max(1, s * 0.008)} fill="#ffc070" opacity={0.85 * (1 - ph) * (ph > 0.05 ? 1 : ph / 0.05) * (0.3 + 0.7 * g)} />;
      })}
    </svg>
  );
};

/** a candle flame with its halo */
const CandleFlame: React.FC<{ x: number; y: number; s: number; t: number }> = ({ x, y, s, t }) => {
  const h = s * (0.045 + 0.006 * Math.sin(t * 9.1) + 0.004 * Math.sin(t * 23.0)), w = s * 0.012, sw = s * 0.004 * Math.sin(t * 3.3);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible", mixBlendMode: "screen" }}>
      <defs><radialGradient id="chalo"><stop offset="0" stopColor="#ffc67a" stopOpacity={0.45} /><stop offset="1" stopColor="#ff9a40" stopOpacity={0} /></radialGradient></defs>
      <circle cx={x} cy={y - h * 0.5} r={s * 0.25} fill="url(#chalo)" opacity={0.8 + 0.2 * Math.sin(t * 7)} />
      <path d={`M${x - w},${y} Q${x - w * 1.2},${y - h * 0.5} ${x + sw},${y - h} Q${x + w * 1.2},${y - h * 0.5} ${x + w},${y} Z`} fill="#ffe2a0" />
      <path d={`M${x - w * 0.4},${y} Q${x - w * 0.5},${y - h * 0.3} ${x},${y - h * 0.45} Q${x + w * 0.5},${y - h * 0.3} ${x + w * 0.4},${y} Z`} fill="#fff8e0" />
    </svg>
  );
};

/** smoky air drifting in the room (warm grey, slow) */
const Haze: React.FC<{ T: number; y0: number; op: number }> = ({ T, y0, op }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", mixBlendMode: "screen" }}>
    <defs><radialGradient id="hzb"><stop offset="0" stopColor="#9a8670" stopOpacity={0.4} /><stop offset="1" stopColor="#9a8670" stopOpacity={0} /></radialGradient></defs>
    {[0, 1, 2, 3].map((i) => {
      const sp = 7 + i * 3, x = ((i * 430 + T * sp * (i % 2 ? -1 : 1)) % 1700 + 1700) % 1700 - 310;
      return <ellipse key={i} cx={x} cy={y0 + (i % 3) * 160 + 14 * Math.sin(T * 0.3 + i)} rx={480 + 80 * i} ry={150 + 30 * (i % 2)} fill="url(#hzb)" opacity={op * (0.55 + 0.45 * Math.sin(T * 0.21 + i * 1.7) ** 2)} />;
    })}
  </svg>
);

/** rain running down the window pane and falling past it outside (clipped to the projected pane) */
const WindowRain: React.FC<{ cam: CamJ; T: number; fl: number }> = ({ cam, T, fl }) => {
  const c = [[-0.31, 0.32], [0.31, 0.32], [0.31, -0.32], [-0.31, -0.32]].map(([dy, dz]) => project(cam, [WIN.x, WIN.y + dy, WIN.z + dz]));
  const P = (u: number, v: number) => {   // u 0..1 across, v 0..1 down: bilinear on the pane
    const top = [mix(c[0].x, c[1].x, u), mix(c[0].y, c[1].y, u)], bot = [mix(c[3].x, c[2].x, u), mix(c[3].y, c[2].y, u)];
    return [mix(top[0], bot[0], v), mix(top[1], bot[1], v)];
  };
  const poly = c.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
      <defs><clipPath id="paneclip"><polygon points={poly} /></clipPath></defs>
      <g clipPath="url(#paneclip)">
        <polygon points={poly} fill="#9fb8e8" opacity={0.08 + 0.85 * fl} style={{ mixBlendMode: "screen" }} />
        {/* streaks of rain outside */}
        {Array.from({ length: 26 }).map((_, i) => {
          const u = ((i * 0.381) % 1), sp = 2.4 + (i % 4) * 0.4, v = ((T * sp + i * 0.27) % 1.4) - 0.2;
          const [x0, y0] = P(u, v), [x1, y1] = P(u - 0.06, v + 0.22);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#b9cdf0" strokeWidth={1.2} opacity={0.35 + 0.4 * fl} />;
        })}
        {/* drops running down the glass */}
        {Array.from({ length: 9 }).map((_, i) => {
          const u = 0.08 + ((i * 0.613) % 0.84), v = ((T * (0.12 + (i % 3) * 0.06) + i * 0.31) % 1.1) - 0.05;
          const [x0, y0] = P(u, v);
          return <ellipse key={i} cx={x0} cy={y0} rx={2.2} ry={3} fill="#d8e6ff" opacity={0.45 + 0.4 * fl} />;
        })}
      </g>
    </svg>
  );
};

/** the shadow on the wall (s3): it grows from the cradle's shadow: a hoof kicks over the rim, then wings, then the tail,
 *  then it swells. Base = the rim of the cradle's shadow on the wall (screen), s = px per metre on the wall. */
const WallShadow: React.FC<{ bx: number; by: number; s: number; T: number; k: number; a: number }> = ({ bx, by, s, T, k, a }) => {
  const blur = s * 0.018 * (1.2 - 0.3 * k);
  // jitter with the flame: shadows of a fire breathe in size
  const jit = 1 + 0.025 * Math.sin(T * 9.7) + 0.02 * Math.sin(T * 15.1 + 1);
  // hooves: one goat leg with a cloven hoof kicks up over the rim twice (8.55 - 9.25)
  const legA = win(T, 8.55, 9.3, 0.12);
  const kick = Math.max(Math.exp(-((T - 8.72) ** 2) / 0.006), Math.exp(-((T - 8.98) ** 2) / 0.006));
  const L = 0.5 * legA, ang = -60 + 35 * kick;
  // the body rises out of the cradle shadow from 9.05, wings unfold 9.15 - 9.8, the tail lashes 9.85 - 10.45,
  // then it swells huge and leans toward the hearth (10.45 - 10.95)
  const rise = sm((T - 9.05) / 0.55);
  const wings = sm((T - 9.15) / 0.6);
  const swell = sm((T - 10.45) / 0.5);
  const H = mix(0.62, 1.15, sm((T - 9.05) / 1.4)) * mix(1, 1.45, swell) * jit;     // shadow height (m on the wall)
  const sc = H / 2.4;
  const tailT = T + 6 * sm((T - 9.85) / 0.6);                                        // the tail whips fast for a moment
  const dy = (1 - rise) * 2.0 * sc;                                                   // still sunk below the rim
  const lx = bx + s * (0.05 + 0.02 * a / 6), ly = by;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible", mixBlendMode: "multiply" }}>
      <defs>
        <clipPath id="aboverim"><rect x={0} y={-2000} width={1080} height={by + 2000 + s * 0.02} /></clipPath>
        <filter id="wsb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={blur} /></filter>
      </defs>
      <g clipPath="url(#aboverim)" filter="url(#wsb)" opacity={0.86}>
        {legA > 0.01 && <g transform={`translate(${lx - s * 0.1} ${ly}) rotate(${ang}) scale(${s})`} opacity={legA}>
          <path d={`M0,0.04 L${L * 0.55},-0.01 L${L},0.025 L${L},-0.035 L${L * 0.55},-0.08 L0,-0.04 Z`} fill="#140c08" />
          <path d={`M${L - 0.01},0.03 L${L + 0.07},0.04 L${L + 0.09},0.0 L${L + 0.05},0.0 L${L + 0.07},-0.025 L${L + 0.01},-0.04 Z`} fill="#140c08" />
        </g>}
        {rise > 0.001 && <g transform={`translate(${lx} ${ly + dy * s})`}>
          <JerseyDevil x={0} y={0} ppm={s * sc} p={{ shadow: true, wings, glow: 0, rim: 0, t: tailT, crouch: 0.15 * (1 - rise) + 0.1 * swell, reach: 0.35 * swell, open: 0.1 }} />
        </g>}
      </g>
    </svg>
  );
};

/** the dark shape bursting from the cradle into the hearth and up the flue (s4), with smeared trailing copies */
const Burst: React.FC<{ cam: CamJ; T: number }> = ({ cam, T }) => {
  const t0 = 11.08, t1 = 11.45;
  if (T < t0 - 0.02 || T > t1 + 0.1) return null;
  // path: up out of the cradle -> low across the hearthstone into the fire -> straight up into the throat
  const path: P3[] = [[CR.x, CR.y - 0.05, 0.45], [0.1, 1.65, 0.55], [0.55, 2.0, 0.6], [0.6, 2.15, 1.25], [0.6, 2.2, 2.6]];
  const at = (u: number): P3 => {
    const n = path.length - 1, f = clamp01(u) * n, i = Math.min(n - 1, Math.floor(f)), w = f - i;
    const a = path[Math.max(0, i - 1)], b = path[i], c = path[i + 1], d = path[Math.min(n, i + 2)];
    // Catmull-Rom
    return [0, 1, 2].map((j) => 0.5 * ((2 * b[j]) + (-a[j] + c[j]) * w + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * w * w + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * w * w * w)) as P3;
  };
  const u = (T - t0) / (t1 - t0);
  const ease = (v: number) => v * v * (2.2 - 1.2 * v);
  const copies = [0, 0.03, 0.06, 0.1, 0.14];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
      <defs>
        <filter id="bblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={8} /></filter>
        <filter id="bblur0" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={3.5} /></filter>
      </defs>
      {copies.map((lag, i) => {
        const uu = ease(clamp01(u - lag)), q = project(cam, at(uu)), q2 = project(cam, at(Math.min(1, uu + 0.04)));
        const dir = (Math.atan2(q2.y - q.y, q2.x - q.x) * 180) / Math.PI;
        const op = (i === 0 ? 0.97 : 0.45 / i) * (1 - sm((u - 0.92) / 0.15)) * sm((u + 0.05) / 0.1);
        // body points along its flight: rotate so the head leads (the figure faces +x; up the flue it goes head first)
        return <g key={i} opacity={op} filter={i > 0 ? "url(#bblur)" : "url(#bblur0)"} transform={`translate(${q.x} ${q.y}) rotate(${dir + 70})`}>
          <JerseyDevil x={0} y={q.ppm * 0.45} ppm={q.ppm * 0.4} p={{ shadow: true, wings: 0.55 + 0.4 * Math.sin(T * 40 + i), glow: 0, rim: 0, crouch: 0.4, t: T * 4 }} />
        </g>;
      })}
    </svg>
  );
};

/** soot and ash falling out of the throat after it is gone (s4) */
const Soot: React.FC<{ cam: CamJ; T: number }> = ({ cam, T }) => {
  const u = T - 11.45;
  if (u < 0) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
      <defs><radialGradient id="sootc"><stop offset="0" stopColor="#120c0a" stopOpacity={0.75} /><stop offset="1" stopColor="#120c0a" stopOpacity={0} /></radialGradient></defs>
      {/* a cloud of soot puffing down out of the throat and spreading over the hearth */}
      {[0, 1, 2, 3, 4].map((i) => {
        const v = clamp01((u - i * 0.06) / 1.2), p = project(cam, [0.6 + 0.25 * Math.sin(i * 2.3) * v, 2.1 - 0.35 * v, 1.12 - 0.75 * v]);
        return <circle key={i} cx={p.x} cy={p.y} r={p.ppm * (0.12 + 0.45 * v)} fill="url(#sootc)" opacity={(1 - v) * 0.85 * sm(u / 0.08)} />;
      })}
      {/* flakes of soot and grey ash tumbling down */}
      {Array.from({ length: 46 }).map((_, i) => {
        const delay = (i % 12) * 0.07, life = 1.1 + (i % 5) * 0.12, v = (u - delay) / life;
        if (v < 0 || v > 1) return null;
        const x0 = 0.6 + ((i * 0.377) % 1 - 0.5) * 0.9, sw = 0.05 * Math.sin(T * (2 + (i % 3)) + i);
        const p = project(cam, [x0 + sw + 0.15 * v * Math.sin(i), 2.0 - 0.4 * ((i * 0.21) % 1), 1.15 - 1.1 * v * v - 0.25 * v]);
        const r = Math.max(1.2, p.ppm * (0.006 + 0.006 * (i % 3)));
        return <ellipse key={i} cx={p.x} cy={p.y} rx={r} ry={r * 0.6} transform={`rotate(${(T * 200 + i * 40) % 360} ${p.x} ${p.y})`}
          fill={i % 4 === 0 ? "#6c6460" : "#0e0a08"} opacity={0.9 * (1 - v * v)} />;
      })}
    </svg>
  );
};

export const JDPartA: React.FC = () => {
  const fr = useCurrentFrame(), T = fr / FPS;
  const [shot, t0, t1] = SHOTS.find(([, a, b]) => T >= a - 1e-6 && T < b - 1e-6) ?? SHOTS[SHOTS.length - 1];
  const cam = CAMS[shot];
  const k = flick(T), u = (T - t0) / (t1 - t0), fl = flashAt(T);
  const a = rockAngle(T);
  let zoom = 1, ox = 540, oy = 960, back: React.ReactNode = null, front: React.ReactNode = null, hazeY = 900, hazeOp = 0.16, out = 0;

  // the mother's pose for this moment (s1, s2): beside the cradle's hood, facing it (+x)
  const rocking = win(T, 3.0, 4.75, 0.35) + win(T, 4.8, 6.3, 0.3);
  const curse = sm((T - 6.25) / 0.6);
  const motherEl = (pm: ReturnType<typeof project>, rim: number, dark: number) => {
    const hand = project(cam, cradlePt(-0.13, 0.58, 0.66, a));
    const toLocal = (q: { x: number; y: number }): [number, number] => [(q.x - pm.x) / pm.ppm, (q.y - pm.y) / pm.ppm];
    const hn = toLocal(hand);
    const r = clamp01(rocking) * (1 - curse);
    // hands: folded at the waist / near hand on the hood / (after the curse) both arms down at her sides
    const rest: [number, number] = curse > 0.5 ? [0.04, -0.72] : [0.12, -1.0];
    const handN: [number, number] = [mix(rest[0], hn[0], r), mix(rest[1], hn[1], r)];
    const handF: [number, number] | null = curse > 0.5 ? [-0.02, -0.74] : null;
    return <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
      <ellipse cx={pm.x} cy={pm.y} rx={0.42 * pm.ppm} ry={0.07 * pm.ppm} fill="#000" opacity={0.5} style={{ filter: `blur(${0.04 * pm.ppm}px)` }} />
      <g style={{ filter: `brightness(${0.72 + 0.15 * k + 1.4 * fl}) saturate(${1 - 0.6 * fl})` }}>
        <Mother x={pm.x} y={pm.y} ppm={pm.ppm} id={`mo${shot}`}
          p={{ t: T, lean: mix(8, 30, r) - 4 * curse, head: mix(mix(18, 26, r), -6, curse), handN, handF, rim: rim * (0.7 + 0.3 * k), dark }} />
      </g>
    </svg>;
  };

  if (shot === "s1") {
    const F = project(cam, FIRE), Cd = project(cam, CANDLE), pm = project(cam, [MOTHER.x, MOTHER.y, 0]);
    zoom = mix(1.0, 1.08, sm(u * 0.95 + 0.05)); ox = mix(540, pm.x, 0.5); oy = pm.y - 0.9 * pm.ppm;
    back = <><Flames x={F.x} y={F.y} s={F.ppm} t={T} k={k} id="f1" /><CandleFlame x={Cd.x} y={Cd.y} s={Cd.ppm} t={T} /></>;
    front = <>{motherEl(pm, 0.6, 0.9)}<Cradle shot="s1" a={a} k={k} cold={fl * 0.4} /></>;
    hazeY = 800;
  } else if (shot === "s2") {
    const F = project(cam, FIRE), pm = project(cam, [MOTHER.x, MOTHER.y, 0]);
    zoom = mix(1.0, 1.07, sm(u)); ox = pm.x + 0.2 * pm.ppm; oy = pm.y - 1.2 * pm.ppm;
    back = <Flames x={F.x} y={F.y} s={F.ppm} t={T} k={k} id="f2" />;
    front = <><Cradle shot="s2" a={a} k={k} cold={fl * 0.4} />{motherEl(pm, 0.75, 0.95)}</>;
    hazeY = 850; hazeOp = 0.2;
  } else if (shot === "s3") {
    // the base of the shadow: where the fire throws the cradle's rim onto the left wall
    const Wb = project(cam, [-2.58, 0.85, 0.55]);
    zoom = mix(1.0, 1.1, sm(u)) * mix(1, 1.06, sm((T - 10.4) / 0.55)); ox = Wb.x + 60; oy = Wb.y - 0.6 * Wb.ppm;
    back = <><WindowRain cam={cam} T={T} fl={fl} /><WallShadow bx={Wb.x} by={Wb.y} s={Wb.ppm} T={T} k={k} a={a} /></>;
    front = <Cradle shot="s3" a={a} k={k} cold={0} />;
    hazeY = 1000; hazeOp = 0.14;
  } else {
    const F = project(cam, FIRE), Th = project(cam, [0.6, 2.15, 1.15]);
    out = sm((T - 11.25) / 0.45) * 0.85;
    const g = 1 - 0.85 * sm((T - 11.2) / 0.35) + 0.2 * sm((T - 12.0) / 0.8);    // the fire flattens, then struggles back a little
    const lean = 1.6 * Math.exp(-((T - 11.3) ** 2) / 0.02);                     // the draught it leaves drags the flames up/back
    // push in and up toward the chimney mouth
    zoom = mix(1.0, 1.22, sm(u * 1.05)); ox = mix(F.x, Th.x, 0.6); oy = mix(F.y - 0.4 * F.ppm, Th.y, sm(u));
    back = <><Flames x={F.x} y={F.y} s={F.ppm} t={T} k={k} g={g} lean={lean} id="f4" /></>;
    front = <><Cradle shot="s4" a={a} k={k * (1 - 0.5 * out)} cold={0} /><Burst cam={cam} T={T} /><Soot cam={cam} T={T} /></>;
    hazeY = 900; hazeOp = 0.14 + 0.12 * sm((T - 11.5) / 0.5);
  }

  const grain = (fr * 7919) % 97;
  const fadeIn = 1 - sm(T / 0.45);
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${ox}px ${oy}px` }}>
        <Plates shot={shot} k={k} fl={fl} out={out} />
        {back}
        {front}
      </AbsoluteFill>
      <Haze T={T} y0={hazeY} op={hazeOp} />
      {/* storm-blue cold in the shadows against the warm fire, crushed blacks, heavy vignette, fine film grain */}
      <AbsoluteFill style={{ background: "#0a1838", mixBlendMode: "color", opacity: 0.16 }} />
      <AbsoluteFill style={{ background: "#0a1430", mixBlendMode: "multiply", opacity: 0.2 }} />
      {fl > 0.001 && <AbsoluteFill style={{ background: "#a8c0f0", mixBlendMode: "soft-light", opacity: 0.5 * fl }} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.78) 100%)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={grain} /></filter>
        <rect width={1080} height={1920} filter="url(#gr)" />
      </svg>
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
    </AbsoluteFill>
  );
};
