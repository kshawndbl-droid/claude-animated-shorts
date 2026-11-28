// Style test for "The Man Who Sold the Eiffel Tower": the first 11.6 s of the narration in three shots.
//   1. wide: a Paris boulevard at dusk, the tower far away, Lustig strolls along the pavement, stops, shrugs, winks
//   2. close-up: Lustig introduces himself (tips his hat), shifty eyes on "dozens of fake names"
//   3. two-shot: Lustig walks up to Poisson and flashes the smile "that could sell sand in the desert"; handshake
// Characters are 2D vector figures (figure.tsx) composited over painted backgrounds with depth blur, slow camera moves,
// light haze, drifting dust and pigeons. Walks are stance-driven (x follows the planted foot), so feet never slide.
import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { Figure, LUSTIG, POISSON, Look, Pose, STRIDE, Gesture } from "./figure";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import vis from "../../stories/eiffel-sale/words_vis.json";

const FPS = 30;
export const TEST_FRAMES = 348;
const WORDS = ((vis as { words: { w: string; s: number; e: number }[] }).words).filter((w) => w.s < 11.5).map((w) => ({ w: w.w, s: w.s, e: w.e })) as Word[];
const KEY = ["1925", "eiffel", "tower", "victor", "lustig", "dozens", "fake", "smile", "sand", "desert", "his"];
const sub = defaultStyle("funny", { keyWords: KEY, y: 0.86 });

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c); };
export const ramp = (t: number, a: number, d = 0.3) => smooth((t - a) / d);
const W = (w: string, n = 0) => WORDS.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w)[n]?.s ?? 0;

/** blink: a 4-frame blink every 2-4 s, plus forced blinks */
export const blinkAt = (t: number, seed: number, extra: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const e of extra) { const k = f - Math.round(e * FPS); if (k >= 0 && k < 4) return [0.5, 1, 1, 0.5][k]; }
  let s = Math.round(20 + 30 * ((seed * 7.3) % 1));
  for (let n = 0; n < 40 && s <= f; n++) { const k = f - s; if (k >= 0 && k < 4) return [0.5, 1, 1, 0.5][k]; s += 60 + Math.round(55 * Math.abs(Math.sin(seed * 13.1 + n * 7.7))); }
  return 0;
};

/** stance-driven walk between t0 and t1 (ease in/out on the phase, the body follows the planted foot) */
export const walker = (t: number, t0: number, t1: number, cycles: number) => {
  const u = clamp01((t - t0) / (t1 - t0));
  // ease the cadence in and out (the body speed always follows the planted foot)
  const k = u < 0.2 ? (u * u) / 0.4 / 0.8 : u > 0.8 ? 1 - ((1 - u) * (1 - u)) / 0.4 / 0.8 : (u - 0.1) / 0.8;
  const phase = k * cycles + 0.25; // starts and ends with the feet together (u = .25 of the cycle)
  const amt = t < t0 ? 0 : t > t1 ? 0 : Math.min(1, (t - t0) / 0.12, (t1 - t) / 0.12);
  return { phase, dist: k * cycles * STRIDE, walk: amt };
};

// ---------------------------------------------------------------- set dressing
export const Birds: React.FC<{ t: number; y0: number; n: number; seed: number; scale?: number }> = ({ t, y0, n, seed, scale = 1 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const x = ((i * 137 + seed * 53 + t * (90 + i * 13)) % 1500) - 200, y = y0 + i * 26 + 18 * Math.sin(t * 1.3 + i);
      const fl = Math.sin(t * 14 + i * 2.1), s = (0.8 + (i % 3) * 0.2) * scale;
      return <path key={i} transform={`translate(${x},${y}) scale(${s})`} d={`M-16,${-8 * fl} Q-7,${-3 - 6 * fl} 0,0 Q7,${-3 - 6 * fl} 16,${-8 * fl}`} fill="none" stroke="#3a2c3c" strokeWidth={3.2} strokeLinecap="round" opacity={0.75} />;
    })}
  </g>
);
export const Motes: React.FC<{ t: number; n: number; seed: number }> = ({ t, n, seed }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const a = Math.abs(Math.sin(i * 12.9898 + seed) * 43758.5453) % 1, b = Math.abs(Math.sin(i * 78.233 + seed) * 12543.13) % 1;
      const x = (a * 1180 + t * (8 + 10 * b) + 30 * Math.sin(t * 0.7 + i)) % 1180 - 50, y = (b * 2000 - t * (14 + 12 * a)) % 2000;
      const r = 1.5 + 3.5 * ((i * 7) % 5) / 5, o = 0.25 + 0.5 * Math.abs(Math.sin(t * 1.7 + i));
      return <circle key={i} cx={x} cy={y < 0 ? y + 2000 : y} r={r} fill="#ffe2b8" opacity={o} />;
    })}
  </g>
);
/** painted background plate with a slow camera move (zoom about a point, drift) and depth blur */
export const Plate: React.FC<{ src: string; t: number; dur: number; z0: number; z1: number; cx: number; cy: number; dx?: number; dy?: number; blur: number; bright?: number }> =
  ({ src, t, dur, z0, z1, cx, cy, dx = 0, dy = 0, blur, bright = 1 }) => {
    const u = Easing.inOut(Easing.sin)(clamp01(t / dur)), z = z0 + (z1 - z0) * u;
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ position: "absolute", width: 1080, height: 1920, objectFit: "cover", transformOrigin: `${cx}px ${cy}px`,
          transform: `translate(${dx * u}px, ${dy * u}px) scale(${z})`, filter: `blur(${blur}px) brightness(${bright}) saturate(${CFG.sat})` }} />
      </AbsoluteFill>
    );
  };
export const Haze: React.FC<{ top?: string; bottom?: string; vig?: number }> = ({ top = "rgba(255,190,170,0.16)", bottom = "rgba(60,30,70,0.0)", vig = 0.45 }) => (
  <>
    <AbsoluteFill style={{ background: `linear-gradient(${top}, rgba(255,200,160,0.0) 45%, ${bottom})` }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(25,12,30,${vig}) 100%)` }} />
  </>
);

/** a figure on a camera-moving plate: world x/ground y in plate pixels, transformed with the same zoom as the plate */
export const camXY = (x: number, y: number, t: number, dur: number, z0: number, z1: number, cx: number, cy: number, dx = 0, dy = 0) => {
  const u = Easing.inOut(Easing.sin)(clamp01(t / dur)), z = z0 + (z1 - z0) * u;
  return { x: cx + (x - cx) * z + dx * u, y: cy + (y - cy) * z + dy * u, z };
};

export const EXTRA1: Look = { ...LUSTIG, suit: "#5a6a4a", suitDark: "#45523a", pin: undefined, vest: "#7a6a4a", tie: "#2a3a6a", hat: "homburg", hatCol: "#4a4038", mustache: undefined, flower: undefined, chain: false, trousers: "#4e5a40" };
export const EXTRA2: Look = { ...POISSON, suit: "#4a5a7a", suitDark: "#384560", check: undefined, vest: "#6a7a9a", hat: "bowler", hatCol: "#3a2a22", glasses: false, mustache: "pencil", stout: 0, hair: "#5a3a22", brows: "#5a3a22", trousers: "#3f4c68" };

// ---------------------------------------------------------------- shots
/** background set: v2 = the first painted plates (kept for reference), v3 = the illustrated plates of the background test */
type BgCfg = { wide: string; cafe: string; blurWide: number; blurClose: number; blurTwo: number; haze: number; vig: number; shadow: number; grade: boolean;
  wideCY: number; wideGY: number; wideX0: number; farGY: [number, number]; twoGY: number; twoCY: number; twoZ: number; closeCY: number; closeZ: number; sat: number };
const V2: BgCfg = { wide: "eiffel/bg_wide.png", cafe: "eiffel/bg_cafe.png", blurWide: 1.2, blurClose: 11, blurTwo: 3.5, haze: 0.16, vig: 0.45, shadow: 0, grade: false,
  wideCY: 1650, wideGY: 1520, wideX0: 320, farGY: [1450, 1420], twoGY: 1640, twoCY: 1700, twoZ: 1.35, closeCY: 900, closeZ: 1.25, sat: 1.08 };
export const V3: BgCfg = { ...V2, wide: "eiffel/bg_wide3.png", cafe: "eiffel/bg_cafe3.png", blurWide: 0, blurClose: 3.2, blurTwo: 0.6, haze: 0.05, vig: 0.28, shadow: 1, grade: true, sat: 1.12,
  wideCY: 1600, wideGY: 1560, wideX0: 330, farGY: [1490, 1478], twoGY: 1725, twoCY: 1725, twoZ: 1.3, closeCY: 1000, closeZ: 1.3 };
export const V4: BgCfg = { ...V3, wide: "eiffel/bg_wide4.png" };
let CFG: BgCfg = V2;
export const setCfg = (c: BgCfg) => { CFG = c; };
const subV4 = { ...sub, moves: [{ from: 0, to: 5.1, y: 0.42 }] };

/** soft ground shadow under the feet (part of the set, drawn before the figure): grounds the character on the painted floor */
const Ground: React.FC<{ x: number; y: number; s: number; k?: number }> = ({ x, y, s, k = 1 }) => CFG.shadow ? (
  <ellipse cx={x} cy={y + 2 * s} rx={95 * s} ry={20 * s} fill="url(#gshadow)" opacity={0.85 * k} />
) : null;
export const GroundDefs = () => (
  <defs>
    <radialGradient id="gshadow"><stop offset="0" stopColor="rgba(40,22,40,0.55)" /><stop offset="0.6" stopColor="rgba(40,22,40,0.28)" /><stop offset="1" stopColor="rgba(40,22,40,0)" /></radialGradient>
  </defs>
);

const S1 = { a: 0, b: 5.1 }, S2 = { a: 5.1, b: 8.75 }, S3 = { a: 8.75, b: 11.6 };

const ShotWide: React.FC<{ t: number }> = ({ t }) => {
  const dur = S1.b - S1.a, Z0 = 1.02, Z1 = 1.3, CX = 540, CY = CFG.wideCY;
  // Lustig strolls left -> right along the near pavement, stops on "small", shrugs, winks on "his"
  const stop = W("small") - 0.25;
  const wk = walker(t, 0.2, stop, 3.0);
  const s0 = 0.62, x = CFG.wideX0 + wk.dist * s0, gy = CFG.wideGY;
  const p = camXY(x, gy, t, dur, Z0, Z1, CX, CY, -40, -60);
  const turned = t > stop;
  const pose: Pose = {
    phase: wk.phase, walk: wk.walk, expr: t < W("small") ? "smile" : t < W("wasnt") - 0.1 ? "worried" : "smug",
    facing: turned ? 0 : 0.6, gesture: t > W("problem") - 0.1 && t < W("his") ? "shrug" : "none", gk: ramp(t, W("problem") - 0.15, 0.25) * (1 - ramp(t, W("wasnt") + 0.1, 0.3)),
    wink: t > W("his") - 0.05 && t < W("his") + 0.45, blink: blinkAt(t, 1), lookX: turned ? 0 : 0.6,
  };
  // two passers-by on the far pavement, walking the other way
  const e1 = walker(t, 0, 6, 6), e2 = walker(t, 0.6, 6, 5);
  const q1 = camXY(700 - e1.dist * 0.16, CFG.farGY[0], t, dur, Z0, Z1, CX, CY, -40, -60), q2 = camXY(760 - e2.dist * 0.13, CFG.farGY[1], t, dur, Z0, Z1, CX, CY, -40, -60);
  return (
    <AbsoluteFill>
      <Plate src={CFG.wide} t={t} dur={dur} z0={Z0} z1={Z1} cx={CX} cy={CY} dx={-40} dy={-60} blur={CFG.blurWide} />
      <Haze top={`rgba(255,190,170,${CFG.haze})`} vig={CFG.vig} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        <Birds t={t} y0={420} n={5} seed={1} />
        <Ground x={q1.x} y={q1.y} s={0.16 * q1.z} />
        <Ground x={q2.x} y={q2.y} s={0.13 * q2.z} />
        <g style={{ filter: `blur(${CFG.shadow ? 0.6 : 1.6}px)` }}>
          <Figure id="x1" look={EXTRA1} x={q1.x} y={q1.y} s={0.16 * q1.z} flip pose={{ phase: e1.phase, walk: 1, expr: "neutral", facing: 0.5, blink: blinkAt(t, 3) }} />
          <Figure id="x2" look={EXTRA2} x={q2.x} y={q2.y} s={0.13 * q2.z} flip pose={{ phase: e2.phase, walk: 1, expr: "smile", facing: 0.5, blink: blinkAt(t, 4) }} />
        </g>
        <Ground x={p.x} y={p.y} s={s0 * p.z} />
        <Figure id="lw" look={LUSTIG} x={p.x} y={p.y} s={s0 * p.z} pose={pose} />
        <Motes t={t} n={40} seed={1} />
      </svg>
    </AbsoluteFill>
  );
};

/** opening shot v4: the street plate gets a measured ground plane (vanishing point, horizon, camera height), so Lustig's
 *  position, size and shadow all come from one projection; he walks diagonally across the cobbles, getting smaller as he
 *  goes deeper, and the body follows the planted foot on screen (no sliding). Camera: a slow push-in on him. */
export const VX = 604, HY = 1410, CH = 4.1, CF = 4510, KS = 0.0012; // vanishing x, horizon y, camera height (m), focal x height, px-per-unit per px below horizon
export const ground = (X: number, Z: number) => { const d = CF / Z; return { x: VX + (X * d) / CH, y: HY + d, s: KS * d }; };
export const ShotWidePersp: React.FC<{ t: number }> = ({ t }) => {
  const dur = S1.b - S1.a, Z0 = 1.0, Z1 = 1.32, CX = 560, CY = 1760;
  const stop = W("small") - 0.25;
  const wk = walker(t, 0.15, stop, 4.0);
  const dir = [0.96, 0.28], mpu = CH * KS; // metres per drawing unit
  const along = (wk.dist * mpu) / dir[0];   // screen-x speed of the body = the planted foot's
  const g = ground(-2.3 + dir[0] * along, 11.0 + dir[1] * along);
  const p = camXY(g.x, g.y, t, dur, Z0, Z1, CX, CY);
  const turned = t > stop;
  const pose: Pose = {
    phase: wk.phase, walk: wk.walk, expr: t < W("small") ? "smile" : t < W("wasnt") - 0.1 ? "worried" : "smug",
    facing: turned ? 0 : 0.6, gesture: t > W("problem") - 0.1 && t < W("his") ? "shrug" : "none", gk: ramp(t, W("problem") - 0.15, 0.25) * (1 - ramp(t, W("wasnt") + 0.1, 0.3)),
    wink: t > W("his") - 0.05 && t < W("his") + 0.45, blink: blinkAt(t, 1), lookX: turned ? 0 : 0.6,
  };
  // two strollers far down the street crossing the other way, sized by the same ground plane
  const e1 = walker(t, 0, 6, 7), e2 = walker(t, 0.5, 6, 6);
  const f1 = ground(1.8 - e1.dist * mpu, 34), f2 = ground(2.2 - e2.dist * mpu, 40);
  const q1 = camXY(f1.x, f1.y, t, dur, Z0, Z1, CX, CY), q2 = camXY(f2.x, f2.y, t, dur, Z0, Z1, CX, CY);
  const shadow = (x: number, y: number, s: number, k = 1) => (
    <g key={`${x}`}>
      <ellipse cx={x} cy={y + 1} rx={72 * s} ry={12 * s} fill="url(#gshadow)" opacity={0.95 * k} />
      <ellipse cx={x + 40 * s} cy={y + 2} rx={110 * s} ry={14 * s} fill="url(#gshadow)" opacity={0.35 * k} />
    </g>
  );
  return (
    <AbsoluteFill>
      <Plate src={CFG.wide} t={t} dur={dur} z0={Z0} z1={Z1} cx={CX} cy={CY} blur={0} />
      <Haze top={`rgba(255,190,170,${CFG.haze})`} vig={CFG.vig} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        <Birds t={t} y0={330} n={5} seed={1} scale={0.8} />
        {shadow(q1.x, q1.y, f1.s * q1.z, 0.8)}
        {shadow(q2.x, q2.y, f2.s * q2.z, 0.8)}
        <Figure id="x1" look={EXTRA1} x={q1.x} y={q1.y} s={f1.s * q1.z} flip shadow={false} pose={{ phase: e1.phase, walk: 1, expr: "neutral", facing: 0.5, blink: blinkAt(t, 3) }} />
        <Figure id="x2" look={EXTRA2} x={q2.x} y={q2.y} s={f2.s * q2.z} flip shadow={false} pose={{ phase: e2.phase, walk: 1, expr: "smile", facing: 0.5, blink: blinkAt(t, 4) }} />
        {shadow(p.x, p.y, g.s * p.z)}
        <Figure id="lw" look={LUSTIG} x={p.x} y={p.y} s={g.s * p.z} pose={pose} shadow={false} />
        {/* warm spill from the cafe lamps on his left side */}
        <ellipse cx={p.x - 40 * g.s * p.z} cy={p.y - 200 * g.s * p.z} rx={170 * g.s * p.z} ry={230 * g.s * p.z} fill="rgba(255,190,110,0.10)" style={{ mixBlendMode: "screen" }} />
        <Motes t={t} n={30} seed={1} />
      </svg>
    </AbsoluteFill>
  );
};

export const ShotClose: React.FC<{ t: number }> = ({ t }) => {
  const T = t + S2.a, dur = S2.b - S2.a;
  const u = smooth(t / dur);
  // gentle push-in and a breathing sway
  const s = 4.5 + 0.25 * u, x = 560 - 20 * u, y = 2010 + 4 * Math.sin(t * 2.2);
  let lookX = 0, lookY = 0;
  if (T > W("dozens") - 0.05) lookX = -1;
  if (T > W("fake") - 0.05) lookX = 1;
  if (T > W("names") + 0.1) lookX = -0.9;
  if (T > W("names") + 0.4) lookX = 0;
  if (T < W("victor")) lookY = -0.2;
  const tip = ramp(T, W("name") - 0.1, 0.25) * (1 - ramp(T, W("lustig") + 0.15, 0.3));
  const expr = T < W("victor") ? "smile" : T < W("con") - 0.05 ? "smug" : T < W("dozens") - 0.05 ? "sly" : "sly";
  const pose: Pose = {
    expr, hatLift: tip, lookX, lookY, blink: blinkAt(T, 2, [W("con") - 0.08]), facing: 0.15,
    headTilt: -4 * tip + (T > W("dozens") ? 3 * Math.sin((T - W("dozens")) * 5) : 0), ex: T > W("dozens") - 0.05 ? { brow: -10, browTilt: -12 } : {},
  };
  return (
    <AbsoluteFill>
      <Plate src={CFG.cafe} t={t} dur={dur} z0={CFG.closeZ} z1={CFG.closeZ + 0.07} cx={520} cy={CFG.closeCY} dx={30} blur={CFG.blurClose} bright={0.95} />
      <Haze top={`rgba(255,190,170,${CFG.haze})`} vig={CFG.vig + 0.05} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Motes t={T} n={26} seed={2} />
        <Figure id="lc" look={LUSTIG} x={x} y={y} s={s} pose={pose} shadow={false} />
      </svg>
    </AbsoluteFill>
  );
};

export const Sparkle: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => {
  if (k <= 0 || k >= 1) return null;
  const r = 46 * Math.sin(Math.PI * k);
  return (
    <g transform={`translate(${x},${y}) rotate(${k * 90})`}>
      <path d={`M0,${-r} Q${r * 0.12},${-r * 0.12} ${r},0 Q${r * 0.12},${r * 0.12} 0,${r} Q${-r * 0.12},${r * 0.12} ${-r},0 Q${-r * 0.12},${-r * 0.12} 0,${-r} Z`} fill="#fffbe6" stroke="#ffd04a" strokeWidth={3} />
    </g>
  );
};

export const ShotTwo: React.FC<{ t: number }> = ({ t }) => {
  const T = t + S3.a, dur = S3.b - S3.a;
  const Z0 = 1.0, Z1 = 1.06, CX = 540, CY = CFG.twoGY;
  const s0 = 1.45, gy = CFG.twoGY;
  // Lustig walks in from the left and stops beside Poisson as the smile flashes
  const stopT = W("could") + 0.08;
  const wk = walker(T, S3.a, stopT, 3.0);
  const lx = -130 + wk.dist * s0;
  const L = camXY(lx, gy, t, dur, Z0, Z1, CX, CY, -50, 0);
  const P2 = camXY(765, gy + 6, t, dur, Z0, Z1, CX, CY, -50, 0);
  const shakeT = W("sand") - 0.1;
  const grin = T > stopT - 0.05;
  const lPose: Pose = {
    phase: wk.phase, walk: wk.walk, facing: 0.6, expr: grin ? "happy" : "sly", ex: grin ? { mouth: "grin", eyes: "sly" } : {},
    gesture: T > shakeT ? "shake" : "none", gk: ramp(T, shakeT, 0.3), blink: blinkAt(T, 5), lookX: 0.8,
  };
  const turn = ramp(T, W("sell") - 0.1, 0.2);
  const pPose: Pose = {
    expr: T < W("sell") ? "neutral" : T < W("sand") + 0.05 ? "amazed" : "laugh", facing: 0.5, hold: T < shakeT + 0.2 ? "letter" : null,
    gesture: T < shakeT + 0.2 ? "offer" : "shake", gk: T < shakeT + 0.2 ? 0.8 * (1 - turn * 0.5) : ramp(T, shakeT + 0.1, 0.3),
    lookY: T < W("sell") ? 1 : 0, lookX: turn > 0.5 ? 0.8 : 0, blink: blinkAt(T, 6), headTilt: T > W("sand") ? 4 * Math.sin((T - W("sand")) * 9) : 0,
    bob: T > W("sand") ? 3 * Math.abs(Math.sin((T - W("sand")) * 9)) : 0,
  };
  const spark = (T - (stopT + 0.05)) / 0.6;
  return (
    <AbsoluteFill>
      <Plate src={CFG.cafe} t={t} dur={dur} z0={CFG.twoZ * Z0} z1={CFG.twoZ * Z1} cx={CX} cy={CFG.twoCY} dx={-50} blur={CFG.blurTwo} />
      <Haze top={`rgba(255,190,170,${CFG.haze})`} vig={CFG.vig} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        <Ground x={P2.x} y={P2.y} s={s0 * P2.z} />
        <Ground x={L.x} y={L.y} s={s0 * L.z} />
        <Figure id="pp" look={POISSON} x={P2.x} y={P2.y} s={s0 * P2.z} flip pose={pPose} />
        <Figure id="ll" look={LUSTIG} x={L.x} y={L.y} s={s0 * L.z} pose={lPose} />
        <Sparkle x={L.x + 70 * s0} y={L.y - 300 * s0} k={spark} />
        <Motes t={T} n={30} seed={3} />
      </svg>
    </AbsoluteFill>
  );
};

export const StyleTest: React.FC<{ withAudio?: boolean; bg?: "v2" | "v3" | "v4" }> = ({ withAudio = true, bg = "v2" }) => {
  CFG = bg === "v4" ? V4 : bg === "v3" ? V3 : V2;
  const f = useCurrentFrame(), t = f / FPS;
  const shot = t < S1.b ? (bg === "v4" ? <ShotWidePersp t={t - S1.a} /> : <ShotWide t={t - S1.a} />) : t < S2.b ? <ShotClose t={t - S2.a} /> : <ShotTwo t={t - S3.a} />;
  // 3-frame dip at each cut keeps the cuts crisp but not harsh
  const cutK = [S2.a, S3.a].reduce((m, c) => Math.min(m, Math.abs(t - c) * FPS), 99);
  return (
    <AbsoluteFill style={{ background: "#1a1420" }}>
      {shot}
      {CFG.grade && <AbsoluteFill style={{ background: "linear-gradient(rgba(255,170,120,0.10), rgba(255,200,150,0.0) 50%, rgba(80,40,90,0.10))", mixBlendMode: "soft-light" }} />}
      {cutK < 1.5 && <AbsoluteFill style={{ background: "#fff", opacity: 0.12 * (1.5 - cutK) }} />}
      <Subtitles words={WORDS} style={bg === "v4" ? subV4 : sub} />
      {withAudio && <Audio src={staticFile("eiffel/test_mix.wav")} />}
      {interpolate(t, [0, 0.25], [1, 0], { extrapolateRight: "clamp" }) > 0 && <AbsoluteFill style={{ background: "#000", opacity: interpolate(t, [0, 0.25], [1, 0], { extrapolateRight: "clamp" }) }} />}
    </AbsoluteFill>
  );
};
export type { Gesture };
