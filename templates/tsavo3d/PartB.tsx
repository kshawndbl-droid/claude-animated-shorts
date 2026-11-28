// Tsavo full video, Part B (story 21.86-39.82 s, lines 5-8): thorn fences and fires, a lion leaping the fence and one
// crawling through it, Patterson's box trap at dusk and his night watch in an acacia, the workers leaving with their
// bundles and the bridge standing still. Video only (no subtitles, no audio); Part D assembles.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Toon, ToonLook } from "./toon";
import { PATTERSON_T, WORKER_T } from "./ToonTest";
import { FlatLion } from "./stick";
import wordsJson from "../../stories/tsavo/final/words.json";
import camFence from "../../stories/tsavo/sets/fence.json";
import camLeap from "../../stories/tsavo/sets/leap.json";
import camCrawl from "../../stories/tsavo/sets/crawl.json";
import camTrap from "../../stories/tsavo/sets/trap.json";
import camTree from "../../stories/tsavo/sets/tree.json";
import camFlee from "../../stories/tsavo/sets/flee.json";

const FPS = 30, STEP = 2;
export const PARTB_START = 21.86, PARTB_END = 39.82;
export const PARTB_FRAMES = Math.round((PARTB_END - PARTB_START) * FPS);
type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }>; extra?: Record<string, number[]> };
const WORDS = (wordsJson as any[]).map((w) => ({ w: String(w.w), s: Number(w.s) }));
const W = (w: string, n = 0) => WORDS.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w)[n]?.s ?? 0;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const rr = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const mixc = (a: number, b: number, k: number) => a + (b - a) * k;

/** the rendered plate frame at shot-local time t (plates are rendered on every 2nd frame) */
const plateFrame = (t: number, n: number) => Math.min(n - (n % 2 === 0 ? 1 : 0), 1 + STEP * Math.floor((t * FPS) / STEP));
const project = (cam: CamJ, f: number, p: [number, number, number]) => {
  const c = cam.frames[String(f)] ?? cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z, z: -Z };
};
const Plate: React.FC<{ shot: string; f: number; fg?: boolean; style?: React.CSSProperties }> = ({ shot, f, fg, style }) => (
  <Img src={staticFile(`tsavo3d/${shot}/${fg ? "fg" : "f"}_${String(f).padStart(4, "0")}.png`)} style={{ position: "absolute", width: 1080, height: 1920, ...style }} />
);
/** walk at speed V between t0 and t1 with soft starts and stops: metres walked and the walk amount */
const walk = (T: number, t0: number, t1: number, V: number) => {
  const v = (t: number) => V * sm((t - t0) / 0.5) * sm((t1 - t) / 0.5);
  let s = 0; const dt = 1 / 120;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};
const along = (from: [number, number], to: [number, number], s: number): [number, number] => {
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  return [from[0] + ((to[0] - from[0]) * s) / L, from[1] + ((to[1] - from[1]) * s) / L];
};

const WORKER2_T: ToonLook = { ...WORKER_T, skin: "#9a6440", top: "#c9b48a", topDark: "#a08a62", hatCol: "#f2ede0", band: "#cfc6b0", mustache: false };
const WORKER3_T: ToonLook = { ...WORKER_T, skin: "#a86e48", top: "#d8c8a8", topDark: "#aa9a78", hatCol: "#b8402a", band: "#7a2a1a", long: false, sash: "#7a2a1a" };

/** firelight glow, rising embers and thin smoke from a fire at ground point src */
const FireFx: React.FC<{ cam: CamJ; f: number; T: number; src: [number, number]; n?: number }> = ({ cam, f, T, src, n = 26 }) => {
  const base = project(cam, f, [src[0], src[1], 0.4]);
  const glowR = 2.6 * base.ppm * (1 + 0.06 * Math.sin(T * 9) + 0.04 * Math.sin(T * 23));
  return <g>
    <defs>
      <radialGradient id="fglow"><stop offset="0" stopColor="rgb(255,150,60)" stopOpacity={0.3} /><stop offset="1" stopColor="rgb(255,120,40)" stopOpacity={0} /></radialGradient>
      <filter id="fsm"><feGaussianBlur stdDeviation="10" /></filter>
    </defs>
    <circle cx={base.x} cy={base.y} r={glowR} fill="url(#fglow)" style={{ mixBlendMode: "screen" }} />
    <g filter="url(#fsm)">{Array.from({ length: 16 }, (_, k) => {
      const life = 6, age = ((T + 30 - (k * life) / 16) % life), u = age / life;
      const p = project(cam, f, [src[0] + 0.3 * age + 0.12 * Math.sin(age + k), src[1] + 0.05 * age, 0.8 + 2.6 * u]);
      return <circle key={k} cx={p.x} cy={p.y} r={(0.15 + 0.7 * u) * p.ppm} fill="rgb(120,105,110)" opacity={0.18 * sm(u / 0.15) * (1 - sm((u - 0.4) / 0.6))} />;
    })}</g>
    {Array.from({ length: n }, (_, i) => {
      const life = 1.4 + rr(i, 2), age = ((T + 10 + rr(i, 1) * life) % life), u = age / life;
      const p = project(cam, f, [src[0] + (rr(i, 3) - 0.5) * 0.5 + 0.25 * age + 0.1 * Math.sin(age * 5 + i), src[1] + (rr(i, 4) - 0.5) * 0.5, 0.5 + 1.9 * u * (0.7 + 0.6 * rr(i, 5))]);
      return <circle key={i} cx={p.x} cy={p.y} r={Math.max(1.4, 0.018 * p.ppm)} fill="rgb(255,190,90)" opacity={(1 - u) * (0.6 + 0.4 * Math.sin(T * 20 + i))} />;
    })}
  </g>;
};

/** dust motes drifting in the low sun (dusk shots) */
const Dust: React.FC<{ cam: CamJ; f: number; T: number; c: [number, number]; n?: number }> = ({ cam, f, T, c, n = 60 }) => <g>{Array.from({ length: n }, (_, i) => {
  const x = c[0] - 5 + ((10 * rr(i, 1) + 0.3 * T * (0.6 + 0.8 * rr(i, 4))) % 10), y = c[1] - 5 + 10 * rr(i, 2), z = 0.2 + 2.2 * rr(i, 3) + 0.08 * Math.sin(T + i);
  const p = project(cam, f, [x, y, z]);
  if (p.z < 0.6) return null;
  return <circle key={i} cx={p.x} cy={p.y} r={Math.max(1.5, Math.min(7, 0.007 * p.ppm))} fill="rgb(255,214,160)" opacity={0.5 * (0.55 + 0.45 * Math.sin(T * 1.7 + i * 2.3))} />;
})}</g>;

/** two shots meet with a short dip so the cut breathes (k: 0..1 darkness) */
const Dip: React.FC<{ k: number }> = ({ k }) => (k > 0.001 ? <AbsoluteFill style={{ background: "#000", opacity: k }} /> : null);
const Night: React.FC<{ a?: number }> = ({ a = 0.18 }) => <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,10,0.75) 100%)", opacity: a / 0.18 }} />;

type ShotP = { T: number; a: number; b: number };

// 1. "The workers built thorn fences and kept fires burning all night." Inside the boma: a worker brings a log to the
// fire, another stands guard by it, watching the dark beyond the thorns.
const S_Fence: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 96), cam = camFence as CamJ;
  const from: [number, number] = [-4.2, -0.7], to: [number, number] = [-5.5, 0.5];
  const wk = walk(T, a + 0.1, a + 2.6, 0.9), p1 = along(from, to, wk.s);
  const P1 = project(cam, f, [p1[0], p1[1], 0]), P2 = project(cam, f, [-7.2, 1.4, 0]);
  const left1 = project(cam, f, [to[0], to[1], 0]).x < project(cam, f, [from[0], from[1], 0]).x;
  const guardLook = Math.sin(T * 0.8) > 0 ? 0.6 : -0.2;
  const people = [
    { z: P2.z, el: <Toon key="g" x={P2.x} y={P2.y} ppm={P2.ppm} look={WORKER2_T} flip pose={{ t: T + 1.1, lookX: guardLook, blink: (T % 2.9) < 0.1, expr: "worried" }} shade={0.62} /> },
    { z: P1.z, el: <Toon key="w" x={P1.x} y={P1.y} ppm={P1.ppm} look={WORKER_T} flip={left1} pose={{ dist: wk.s, walk: wk.w, t: T, lookX: 0.3, blink: (T % 3.1) < 0.1, hold: "plank", expr: "worried" }} shade={0.66} /> },
  ].sort((x, y) => y.z - x.z);
  return (
    <AbsoluteFill>
      <Plate shot="fence" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {people.map((q) => q.el)}
        <FireFx cam={cam} f={f} T={T} src={[-6.0, 3.0]} />
      </svg>
      <Night />
    </AbsoluteFill>
  );
};

// 2. "The lions leaped over the fences..." Low inside the boma: a lion clears the thorns against the night sky and
// lands toward us; the camera jolts on the landing. Before it crosses, the fence (fg pass) hides its body.
const S_Leap: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 70), cam = camLeap as CamJ;
  const t0 = 0.45, t1 = 1.35; // airborne between these
  const u = clamp01((t - t0) / (t1 - t0));
  const run = clamp01(t / t0), land = clamp01((t - t1) / 0.6);
  const from: [number, number] = [-9.85, -2.24], over: [number, number] = [-8.75, -0.33], to: [number, number] = [-7.65, 1.58];
  const gx = t < t0 ? mixc(-10.55, from[0], run) : t < t1 ? mixc(from[0], to[0], u) : mixc(to[0], -7.25, land);
  const gy = t < t0 ? mixc(-3.45, from[1], run) : t < t1 ? mixc(from[1], to[1], u) : mixc(to[1], 2.27, land);
  const z = t > t0 && t < t1 ? 2.3 * Math.sin(Math.PI * u) : 0;
  const crossed = t > t0 + (t1 - t0) * 0.5;
  const L = project(cam, f, [gx, gy, z]), Lg = project(cam, f, [gx, gy, 0]);
  const dir = project(cam, f, [to[0], to[1], 0]).x > project(cam, f, [from[0], from[1], 0]).x;
  const slope = t > t0 && t < t1 ? (Math.cos(Math.PI * u) * 32) : 0;
  const shake = t > t1 && t < t1 + 0.35 ? 14 * (1 - (t - t1) / 0.35) * Math.sin(t * 90) : 0;
  void over;
  return (
    <AbsoluteFill style={{ transform: `translate(${shake * 0.4}px, ${shake}px) scale(1.02)` }}>
      <Plate shot="leap" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {z > 0.05 && <ellipse cx={Lg.x} cy={Lg.y} rx={1.0 * Lg.ppm} ry={0.12 * Lg.ppm} fill="rgba(0,0,0,0.25)" />}
        <g transform={`rotate(${(dir ? -1 : 1) * slope} ${L.x} ${L.y - 0.9 * L.ppm})`}>
          <FlatLion id="leap" x={L.x} y={L.y} ppm={L.ppm} flip={!dir}
            pose={{ phase: t < t0 ? t * 2.2 : t < t1 ? 0.2 : 0.2 + land * 1.4, walk: t > t0 && t < t1 ? 0.3 : 1, crouch: t < t0 ? 0.6 : t < t1 ? 0 : 0.35, eyes: "glow", tail: T }} shade={0.55} />
        </g>
        {t > t1 && t < t1 + 0.8 && Array.from({ length: 10 }, (_, i) => {
          const k = (t - t1) / 0.8, P = project(cam, f, [to[0] + (rr(i, 1) - 0.5) * 1.6 * (0.4 + k), to[1] + (rr(i, 2) - 0.5) * 1.2, 0.15 + 0.4 * k * rr(i, 3)]);
          return <circle key={i} cx={P.x} cy={P.y} r={(0.12 + 0.3 * k) * P.ppm} fill="rgb(120,90,70)" opacity={0.35 * (1 - k)} />;
        })}
      </svg>
      {!crossed && <Plate shot="leap" f={f} fg />}
      <Night />
    </AbsoluteFill>
  );
};

// 3. "...or crawled right through them." At the foot of the fence: two glowing eyes, then a lion pushes in low under
// the branches (the fence fg pass stays over it).
const S_Crawl: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 60), cam = camCrawl as CamJ;
  const from: [number, number] = [-14.7, 1.95], to: [number, number] = [-13.1, 3.05];
  const k = sm((t - 0.15) / 1.8), g: [number, number] = [mixc(from[0], to[0], k), mixc(from[1], to[1], k)];
  const L = project(cam, f, [g[0], g[1], 0]);
  const dir = project(cam, f, [to[0], to[1], 0]).x > project(cam, f, [from[0], from[1], 0]).x;
  return (
    <AbsoluteFill>
      <Plate shot="crawl" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <FlatLion id="crawl" x={L.x} y={L.y} ppm={L.ppm} flip={!dir} pose={{ phase: k * 2.6, walk: 0.6 * (1 - k) + 0.2, crouch: 1, eyes: "glow", tail: T, look: 0.4 }} shade={0.5} />
      </svg>
      <Plate shot="crawl" f={f} fg />
      <Night a={0.25} />
    </AbsoluteFill>
  );
};

// 4. "Patterson set traps." Dusk outside the camp: he props the heavy door of an iron box trap and ties it off.
const TRAP: [number, number] = [11.0, -7.0];
const S_Trap: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 66), cam = camTrap as CamJ;
  const P = project(cam, f, [10.0, -7.7, 0]);
  const reach = sm((t - 0.2) / 0.5) * (1 - sm((t - 1.6) / 0.4));
  const pull = Math.sin(t * 7) * 3 * reach;
  const top = project(cam, f, [TRAP[0] - 0.4, TRAP[1] - 1.5, 2.7]);
  // the near hand sits at the end of the raised arm: shoulder (~0.94 m) plus the arm toward the door rope
  const hand = project(cam, f, [10.25, -7.95, 1.25 + 0.03 * pull]);
  return (
    <AbsoluteFill>
      <Plate shot="trap" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {reach > 0.2 && <path d={`M${top.x},${top.y} L${hand.x},${hand.y}`} stroke="#6a5236" strokeWidth={Math.max(2, 0.02 * P.ppm)} opacity={reach} />}
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} pose={{ t: T, lookX: 0.6, tilt: -4 * reach, blink: (T % 3.3) < 0.1, expr: "stern",
          armNear: reach > 0 ? [mixc(4, 105, reach) + pull, mixc(10, 15, reach)] : undefined, armFar: reach > 0 ? [mixc(2, 70, reach), mixc(8, 40, reach)] : undefined }} shade={0.92} />
        <Dust cam={cam} f={f} T={T} c={[9.5, -8.0]} n={45} />
      </svg>
    </AbsoluteFill>
  );
};

// 5. "He waited in trees, night after night, rifle ready. Nothing." Night, a lone acacia: Patterson in the fork with
// his rifle. Each "night" is a short dip to black and a new moment (head turned, rifle shifted); on "Nothing" he
// lowers his head.
const FORK: [number, number, number] = [13.2, -3.3, 1.75];
const S_Tree: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 120), cam = camTree as CamJ;
  const tn = W("night"), tn2 = W("night", 1), tno = W("nothing");
  const P = project(cam, f, FORK);
  const phase = T < tn - 0.1 ? 0 : T < tn2 - 0.1 ? 1 : 2;
  const look = [0.5, -0.5, 0.7][phase] + 0.15 * Math.sin(T * 0.9);
  const down = sm((T - tno) / 0.4);
  const dip = Math.max(1 - Math.abs(T - (tn - 0.1)) / 0.12, 1 - Math.abs(T - (tn2 - 0.1)) / 0.12, 0);
  const br = project(cam, f, [FORK[0] - 0.6, FORK[1], FORK[2] + 0.05]), br2 = project(cam, f, [FORK[0] + 0.7, FORK[1], FORK[2] + 0.12]);
  return (
    <AbsoluteFill>
      <Plate shot="tree" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} pose={{ t: T, lookX: look * (1 - down), tilt: 10 * down, blink: (T % 3.1) < 0.1 || down > 0.6, expr: down > 0.3 ? "worried" : "stern", hold: "rifle",
          armNear: [phase === 1 ? 55 : 62, 70], armFar: [40, 60] }} shade={0.5} />
        {/* the branch he stands in, drawn over his boots */}
        <path d={`M${br.x},${br.y} Q${(br.x + br2.x) / 2},${(br.y + br2.y) / 2 + 0.06 * P.ppm} ${br2.x},${br2.y}`} stroke="#1c140e" strokeWidth={0.2 * P.ppm} strokeLinecap="round" fill="none" />
      </svg>
      <Night a={0.22} />
      <Dip k={dip * 0.95} />
    </AbsoluteFill>
  );
};

// 6. "Terrified, hundreds of workers fled. Work on the bridge stopped." Dusk: workers walk away down the line with
// bundles on their heads, then the camera lifts to the bridge, standing unfinished and empty.
const Bundle: React.FC<{ x: number; y: number; ppm: number; col: string; flip: boolean }> = ({ x, y, ppm, col, flip }) => (
  <g transform={`translate(${x},${y}) scale(${(flip ? -1 : 1) * ppm},${ppm})`}>
    <ellipse cx={0.02} cy={-1.66} rx={0.3} ry={0.16} fill={col} stroke="#1d1820" strokeWidth={0.014} />
    <path d="M-0.05,-1.8 Q0.04,-1.64 0.12,-1.8" stroke="#1d1820" strokeWidth={0.012} fill="none" />
  </g>
);
const S_Flee: React.FC<ShotP> = ({ T, a }) => {
  const t = T - a, f = plateFrame(t, 128), cam = camFlee as CamJ;
  const from: [number, number] = [8.2, 4.0], to: [number, number] = [8.6, -4.5];
  const men = [
    { look: WORKER_T, t0: -0.4, v: 1.1, off: 0.0, bundle: "#c8a878", plank: false },
    { look: WORKER2_T, t0: 0.4, v: 1.05, off: 0.6, bundle: "#8a6a4a", plank: false },
    { look: WORKER3_T, t0: 1.0, v: 1.15, off: -0.3, bundle: "", plank: true },
  ].map((m, i) => {
    const wk = walk(t, m.t0, 6, m.v), g = along([from[0] + m.off, from[1]], [to[0] + m.off, to[1]], wk.s);
    const P = project(cam, f, [g[0], g[1], 0]);
    const left = project(cam, f, [to[0], to[1], 0]).x < project(cam, f, [from[0], from[1], 0]).x;
    return { z: P.z, el: <g key={i}>
      <Toon x={P.x} y={P.y} ppm={P.ppm} look={m.look} flip={left} pose={{ dist: wk.s, walk: wk.w, t: T + i, lookX: 0.2, blink: ((T + i) % 2.9) < 0.1, expr: "worried",
        hold: m.plank ? "plank" : null, armNear: m.plank ? undefined : [168, 22] }} shade={0.9} />
      {!m.plank && <Bundle x={P.x} y={P.y} ppm={P.ppm} col={m.bundle} flip={left} />}
    </g> };
  }).sort((x, y) => y.z - x.z);
  const zk = sm((t - 2.6) / 1.6), bz = project(cam, f, [4.0, 56.5, 2.0]);
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + 0.6 * zk})`, transformOrigin: `${bz.x}px ${bz.y}px` }}>
      <Plate shot="flee" f={f} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {men.map((m) => m.el)}
        <Dust cam={cam} f={f} T={T} c={[4.0, 2.0]} n={50} />
        {[0, 1, 2].map((i) => {
          const p = project(cam, f, [4 + 8 * Math.cos(T * 0.4 + i * 2.1), 60 + 6 * Math.sin(T * 0.4 + i * 2.1), 16 + 2 * i]);
          const s = Math.max(7, 0.5 * p.ppm), fl = Math.sin(T * 6 + i * 2) * (Math.sin(T * 0.8 + i) > 0.3 ? 0.2 : 1), wy = -s * 0.5 * fl;
          return <path key={i} d={`M${p.x - s},${p.y + wy} Q${p.x - s * 0.4},${p.y - s * 0.3} ${p.x},${p.y} Q${p.x + s * 0.4},${p.y - s * 0.3} ${p.x + s},${p.y + wy}`}
            stroke="rgba(40,20,35,0.75)" strokeWidth={Math.max(1.6, s * 0.18)} fill="none" strokeLinecap="round" />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

const SHOTS: [number, number, React.FC<ShotP>][] = [
  [21.86, 25.06, S_Fence], [25.06, 27.4, S_Leap], [27.4, 29.4, S_Crawl], [29.4, 31.5, S_Trap], [31.5, 35.6, S_Tree], [35.6, 99, S_Flee],
];

export const TsavoPartB: React.FC = () => {
  const T = PARTB_START + useCurrentFrame() / FPS;
  const [a, b, S] = SHOTS.find(([a_, b_]) => T >= a_ && T < b_) ?? SHOTS[SHOTS.length - 1];
  return <AbsoluteFill style={{ background: "#000" }}><S T={T} a={a} b={b} /></AbsoluteFill>;
};
