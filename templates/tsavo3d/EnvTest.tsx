// Living-environment test: the envtest Blender plate (wind in the grass, drifting clouds and cloud shadows, slowly
// fading sun, sideways camera move for parallax) plus 2D atmosphere placed in 3D through the same camera: drifting dust
// in the low sun, thin smoke from the banked camp fire, a few birds far off, and Patterson walking with the new rig.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Toon } from "./toon";
import { PATTERSON_T } from "./ToonTest";
import camEnv from "../../stories/tsavo/sets/envtest.json";

const FPS = 30, N = 150;
export const ENVTEST_FRAMES = N;
export const EnvTest2: React.FC = () => <EnvTest set="envtest2" leaves />;
export const EnvTest3: React.FC = () => <EnvTest set="envtest3" leaves />;
type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
const cam = camEnv as CamJ;
const project = (f: number, p: [number, number, number]) => {
  const c = cam.frames[String(f)] ?? cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = -Z;
  return { x: 540 + (fpx * X) / Math.max(z, 0.05), y: 960 - (fpx * Y) / Math.max(z, 0.05), ppm: fpx / Math.max(z, 0.05), z };
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
// deterministic random
const rr = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

const WIND: [number, number] = [0.35, 0.08];

/** dust motes hanging in the low sun, carried slowly by the wind; near ones big and soft, far ones fine points */
const Dust: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  const motes = Array.from({ length: 90 }, (_, i) => {
    const bx = -5 + 11 * rr(i, 1), by = -4.2 + 12 * rr(i, 2), bz = 0.25 + 2.0 * rr(i, 3);
    const span = 11;
    const x = ((bx + 5 + WIND[0] * T * (0.6 + 0.8 * rr(i, 4))) % span) - 5;
    const y = by + WIND[1] * T + 0.05 * Math.sin(T * 0.7 + i);
    const z = bz + 0.08 * Math.sin(T * (0.5 + rr(i, 5)) + i * 1.7);
    const p = project(f, [x, y, z]);
    if (p.z < 0.4 || p.x < -40 || p.x > 1120 || p.y < -40 || p.y > 1960) return null;
    const r = Math.max(1.8, Math.min(9, 0.007 * p.ppm));
    const near = p.z < 2.2;
    const tw = 0.55 + 0.45 * Math.sin(T * (1.3 + rr(i, 6) * 2) + i * 2.3);
    const edge = Math.min(1, ((x + 5) / 1.2), (6 - x) / 1.2);
    const a = (near ? 0.3 : 0.7) * tw * clamp01(edge);
    return <circle key={i} cx={p.x} cy={p.y} r={near ? r * 1.8 : r} fill="rgb(255,214,160)" opacity={a} filter={near ? "url(#soft)" : undefined} />;
  });
  return <g>{motes}</g>;
};

/** thin smoke rising from the banked fire in the camp, leaning with the wind */
const Smoke: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  const src: [number, number] = [0.6, 9.5];
  const puffs = [];
  for (let k = 0; k < 26; k++) {
    const life = 7, birth = (k * life) / 26, age = ((T + 40 - birth) % life);
    const u = age / life;
    const zz = 0.3 + 3.2 * u, x = src[0] + WIND[0] * 1.6 * age + 0.15 * Math.sin(age * 1.1 + k), y = src[1] + WIND[1] * age;
    const p = project(f, [x, y, zz]);
    const r = (0.12 + 0.75 * u) * p.ppm;
    const a = 0.16 * sm(u / 0.15) * (1 - sm((u - 0.45) / 0.55));
    puffs.push(<circle key={k} cx={p.x} cy={p.y} r={r} fill="rgb(200,170,165)" opacity={a} />);
  }
  return <g filter="url(#smoke)">{puffs}</g>;
};

/** a few birds far off over the plain, wings flapping and gliding */
const Birds: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  return <g>{[0, 1, 2].map((i) => {
    const p = project(f, [-30 + 2.2 * T + 3 * i + 1.5 * Math.sin(i * 2), 90 + 6 * i, 22 + 2 * i + 0.6 * Math.sin(T * 0.8 + i)]);
    const flap = Math.sin(T * 7 + i * 1.9), glide = Math.sin(T * 0.9 + i) > 0.4 ? 0.2 : 1;
    const s = Math.max(8, 0.6 * p.ppm), wy = -s * 0.5 * flap * glide;
    return <path key={i} d={`M${p.x - s},${p.y + wy} Q${p.x - s * 0.4},${p.y - s * 0.3 + wy * 0.3} ${p.x},${p.y} Q${p.x + s * 0.4},${p.y - s * 0.3 + wy * 0.3} ${p.x + s},${p.y + wy}`}
      stroke="rgba(40,20,35,0.75)" strokeWidth={Math.max(1.6, s * 0.18)} fill="none" strokeLinecap="round" />;
  })}</g>;
};

/** a few small acacia leaflets carried on the wind past the lens, tumbling as they fall */
const Leaves: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  return <g>{Array.from({ length: 9 }, (_, i) => {
    const t0 = rr(i, 9) * 5 - 1, age = T - t0;
    if (age < 0 || age > 4.5) return null;
    const x = -3.5 + 6 * rr(i, 10) + 0.9 * age, y = -3.2 + 5 * rr(i, 11) + 0.15 * age;
    const z = 1.6 + 0.6 * rr(i, 12) - 0.35 * age + 0.08 * Math.sin(age * 2.2 + i);
    if (z < 0.02) return null;
    const p = project(f, [x, y, z]);
    if (p.z < 0.5) return null;
    const sz = Math.max(2, 0.03 * p.ppm), rot = (age * (140 + 90 * rr(i, 13)) + i * 40) % 360;
    const flip = Math.cos(age * (5 + 3 * rr(i, 14)) + i);
    const col = ["#7a7a30", "#a08a3a", "#6a6a2c", "#b09440"][i % 4];
    return <ellipse key={i} cx={p.x} cy={p.y} rx={sz} ry={Math.max(0.6, sz * 0.42 * Math.abs(flip))} fill={col} opacity={0.85 * sm(age / 0.4) * (1 - sm((age - 3.8) / 0.7))}
      transform={`rotate(${rot} ${p.x} ${p.y})`} />;
  })}</g>;
};

/** warm haze lying on the horizon, breathing very slowly */
const Haze: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  const c = cam.frames[String(f)] ?? cam.frames["1"];
  const hz = project(f, [c.m[0][3], c.m[1][3] + 600, 0]).y;
  const a = 0.2 + 0.03 * Math.sin(T * 0.6);
  return <g>
    <defs><linearGradient id="hz" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="rgb(255,170,120)" stopOpacity={0} />
      <stop offset="0.55" stopColor="rgb(255,175,125)" stopOpacity={a} />
      <stop offset="1" stopColor="rgb(220,120,90)" stopOpacity={0} />
    </linearGradient></defs>
    <rect x={0} y={hz - 170} width={1080} height={260} fill="url(#hz)" />
  </g>;
};

const walk = (T: number, t0: number, t1: number, V: number) => {
  const v = (t: number) => V * sm((t - t0) / 0.5) * sm((t1 - t) / 0.5);
  let s = 0; const dt = 1 / 240;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};

export const EnvTest: React.FC<{ set?: string; leaves?: boolean }> = ({ set = "envtest", leaves = false }) => {
  const fr = useCurrentFrame(), T = fr / FPS, f = Math.min(N, fr + 1);
  const pad = (n: number) => String(n).padStart(4, "0");
  const w = walk(T, 0.6, 4.4, 0.6);
  const from: [number, number] = [-0.5, 1.5], to: [number, number] = [1.8, 1.2];
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]), k = Math.min(1, w.s / L);
  const P = project(f, [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, 0]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Img src={staticFile(`tsavo3d/${set}/f_${pad(f)}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <filter id="smoke" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id="soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        {leaves && <Haze f={f} T={T} />}
        <Birds f={f} T={T} />
        <Smoke f={f} T={T} />
        <Toon x={P.x} y={P.y} ppm={P.ppm} look={PATTERSON_T} shade={0.9} pose={{ dist: w.s, walk: w.w, t: T, lookX: 0.5, blink: (T % 3.2) < 0.1 }} />
      </svg>
      <Img src={staticFile(`tsavo3d/${set}/fg_${pad(f)}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs><filter id="soft2" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" /></filter></defs>
        <Dust f={f} T={T} />
        {leaves && <Leaves f={f} T={T} />}
      </svg>
    </AbsoluteFill>
  );
};
