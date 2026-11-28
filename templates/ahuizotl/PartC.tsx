// "The Ahuizotl", part C (global frames 595-948, 354 frames, mix 19.833-31.633 s): lines 6-9.
//   L6 "He knelt at the edge. The reeds were moving."  L7 "He reached in, and a small hand grabbed his wrist." (the wet
//   grab in the mix at 25.39 s = part frame 167)  L8 "Not a baby's hand. It grew from the end of a long, black tail."
//   L9 "Then it pulled." The part ends mid-pull, right before the big hit that opens part D.
// Same look and method as the approved style preview v2 (templates/ahuizotl/StylePreview.tsx): still full-res Blender
// plates (tools/blender/ahuizotl_lake.py set; two new cameras in tools/blender/ahuizotl_partc.py) with every moving thing
// drawn per frame on top: the moonlit fisherman (approved rig, new optional kneel pose), the same 2D edge clump of tule
// (same stems, same world position), moon glints, drifting mist, out-of-focus foreground stems, ripples.
// Story: the crying lured him; he goes down to help. He walks down the bank to the waterline (side-on: c_walk), the
// clump at the edge trembles (low at the waterline), he kneels beside it (medium) and reaches in (his arm parting the
// stems, low at the waterline); his face, peering; on the wet slap a pale, too-human hand clamps his wrist (push-in,
// shake); his shock; insert of the pale hand on his wrist ("Not a baby's hand."), then the camera tilts down along the
// wet black tail to where it slides under the dark water; his terror, he strains back; "Then it pulled.": the tail
// yanks his arm toward the water and he is thrown forward off his knee, mid-fall at the cut.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import wordsJson from "../../stories/ahuizotl/final/words.json";
import camEdge from "../../stories/ahuizotl/sets/edge.json";
import camMed from "../../stories/ahuizotl/sets/med.json";
import camReact from "../../stories/ahuizotl/sets/react.json";
import camWalk from "../../stories/ahuizotl/sets/c_walk.json";
import camCl from "../../stories/ahuizotl/sets/c_close.json";
import { sm, walk } from "./CharTest";
import { FPose, Fisherman } from "./fisherman";
import { AHZ, AhzDefs, Drip, HumanHand, Rimmed, V, furPath, furStrokes, smooth as cr, tube } from "./creature";

const FPS = 30;
export const AHZ_PARTC_START = 595;
export const AHZ_PARTC_FRAMES = 354;
const OFF = AHZ_PARTC_START / FPS;   // 19.8333 s
const GRAB_F = 167;                  // 25.40 s: the wet slap in the mix (25.39)
const GRAB_T = OFF + GRAB_F / FPS;
const PULL_F = 329;                  // 30.80 s: "pulled."
const PULL_T = OFF + PULL_F / FPS;
// cuts (part frames)
const C_REEDS = 45, C_KNEEL = 66, C_ARM = 100, C_PEER = 140, C_GRAB = 160, C_SHOCK = 186, C_INSERT = 204, C_TERROR = 292, C_PULL = 318;

const WORDS = (wordsJson as Word[]).filter((w) => w.s >= 19.5 && w.s < 31.6);
const SUB = defaultStyle("serious", { key: "#3DF0FF", pop: 0.45, y: 0.8, keyWords: ["knelt", "edge", "reeds", "moving", "reached", "hand", "grabbed", "wrist", "baby's", "black", "tail", "pulled"] });

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
const easeIn = (v: number) => Math.pow(clamp01(v), 2.2);
const rnd = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
type V3 = [number, number, number];
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const len3 = (a: V3) => Math.hypot(a[0], a[1], a[2]);

/* ------------------------------------------------------------------ cameras (as StylePreview, plus wide plates) */
type CamJ = { w: number; h: number; frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
type Cam = { m: number[][]; f: number; plate: string; pos: V3; W: number };
const mkCam = (j: unknown, plate: string): Cam => {
  const c = (j as CamJ).frames["1"], W = ((j as CamJ).w || 1350) * 1920 / ((j as CamJ).h || 2400);
  return { m: c.m, f: (c.lens / c.sensor) * 1920, plate, pos: [c.m[0][3], c.m[1][3], c.m[2][3]], W };
};
const CAMS = { edge: mkCam(camEdge, "edge"), med: mkCam(camMed, "med"), react: mkCam(camReact, "react"), walk: mkCam(camWalk, "c_walk"), cl: mkCam(camCl, "c_close") };
type ShotName = keyof typeof CAMS;
/** world point -> plate display px (the plate is W x 1920), pixels per metre at that depth, depth */
const proj = (c: Cam, p: V3) => {
  const m = c.m, d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const z = Math.max(0.03, -Z);
  return { x: c.W / 2 + (c.f * X) / z, y: 960 - (c.f * Y) / z, ppm: c.f / z, z };
};
const right = (c: Cam): V3 => { const r: V3 = [c.m[0][0], c.m[1][0], 0], l = Math.hypot(r[0], r[1]); return [r[0] / l, r[1] / l, 0]; };

/* ------------------------------------------------------------------ world (the same as StylePreview) */
const WATER_Z = -0.07;
const MOON_DIR: V3 = (() => { const v = [0.15, 0.94, 0.3], l = Math.hypot(...v); return v.map((a) => a / l) as V3; })();
const EYES: V3 = [1.8, 1.55, -0.005];
/** where he kneels: the back foot stays here; the kneel carries his hips 0.43 m forward over the knee */
const KNEEL: V3 = [0.85, 0.95, 0.0];
/** where the tail comes up out of the water, in the clump just past his reach */
const TAIL_IN: V3 = [1.95, 1.4, WATER_Z];

/** wind: the breeze that came back after scare 1 (0.45 at the end of part B); it drops when the hand grabs */
const wind = (T: number) => lerp(0.45, 0.2, sm((T - GRAB_T) / 0.8));
/** something moving inside the clump: rustles on "The reeds were moving", while he reaches, the burst at the grab */
const rustle = (T: number, ph: number) => {
  let v = 0;
  const bursts: [number, number, number][] = [[20.9, 0.9, 1.0], [21.55, 0.7, 0.8], [23.4, 0.8, 0.5], [24.6, 0.6, 0.45], [GRAB_T - 0.07, 0.6, 1.4], [PULL_T, 0.5, 1.4]];
  for (const [t0, tau, a] of bursts) {
    const d = T - t0;
    if (d > 0) v += a * Math.exp(-d / tau) * (Math.sin(d * 27 + ph) * 0.55 + Math.sin(d * 9 + ph * 2) * 0.3) * clamp01(d / 0.08);
  }
  return v;
};

/* the edge clump: exactly the stems of the style preview (same seed, same world points) */
type Stem = { bx: number; by: number; h: number; lx: number; ly: number; w0: number; ph: number; tuft: boolean; k: number };
const STEMS: Stem[] = (() => {
  const out: Stem[] = [];
  const ce = CAMS.edge, R = right(ce), ez = proj(ce, EYES).z;
  for (let i = 0; out.length < 32 && i < 400; i++) {
    const a = rnd(i, 1) * 2 * Math.PI, r = Math.sqrt(rnd(i, 2));
    const bx = 1.8 + Math.cos(a) * r * 0.34, by = 1.44 + Math.sin(a) * r * 0.2;
    if (by < 1.14) continue;
    const lat = (bx - EYES[0]) * R[0] + (by - EYES[1]) * R[1];
    if (Math.abs(lat) < 0.07 && proj(ce, [bx, by, 0]).z < ez + 0.05) continue;
    const h = 1.25 + 0.85 * rnd(i, 3), la = rnd(i, 4) * 2 * Math.PI, lean = (rnd(i, 5) < 0.8 ? 0.04 + 0.12 * rnd(i, 6) : 0.2 + 0.25 * rnd(i, 6)) * h;
    out.push({ bx, by, h, lx: Math.cos(la) * lean, ly: Math.sin(la) * lean, w0: 0.0055 + 0.0045 * rnd(i, 7), ph: rnd(i, 8) * 6.28, tuft: rnd(i, 9) < 0.4, k: i });
  }
  return out;
})();

/** something pushing the stems aside: his arm going in, the tail, his fall */
type Push = { p: V3; r: number; amt: number };
const stemPts = (s: Stem, T: number, pushes: Push[], N = 9): V3[] => {
  const wd = wind(T);
  const sway = (0.035 * Math.sin(T * 0.9 + s.ph) + 0.014 * Math.sin(T * 2.3 + s.ph * 1.7)) * wd * (s.h / 1.6);
  const rs = rustle(T, s.ph) * 0.06 * (0.5 + rnd(s.k, 11));
  let px = 0, py = 0;
  for (const q of pushes) {
    const dx = s.bx - q.p[0], dy = s.by - q.p[1], d = Math.hypot(dx, dy) || 1e-3;
    const k = q.amt * Math.exp(-((d / q.r) ** 2)) * 0.22;
    px += (dx / d) * k; py += (dy / d) * k;
  }
  const pts: V3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, b = Math.pow(u, 1.6), bp = Math.min(1, u * 1.8);
    const dx = s.lx * u * u + (sway + rs) * b + px * bp, dy = s.ly * u * u + 0.3 * rs * b + py * bp;
    pts.push([s.bx + dx, s.by + dy, WATER_Z - 0.05 + (s.h + 0.05) * u]);
  }
  return pts;
};
const ribbon = (c: Cam, pts: V3[], w0: number, mirror = false) => {
  const P = pts.map((p) => proj(c, mirror ? [p[0], p[1], 2 * WATER_Z - p[2]] : p));
  const L: string[] = [], Rr: string[] = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const u = i / (P.length - 1), w = Math.max(0.6, w0 * (1 - 0.75 * u * u) * P[i].ppm);
    L.push(`${(P[i].x + nx * w).toFixed(1)},${(P[i].y + ny * w).toFixed(1)}`);
    Rr.push(`${(P[i].x - nx * w).toFixed(1)},${(P[i].y - ny * w).toFixed(1)}`);
  }
  return { d: `M${L.join(" L")} L${Rr.reverse().join(" L")} Z`, rim: `M${Rr.slice().reverse().join(" L")}`, top: P[P.length - 1], P };
};
/** the clump; split by depth against a reference point (draw "far", then what goes in between, then "near") */
const EdgeClump: React.FC<{ c: Cam; T: number; blur?: number; split?: "far" | "near" | "all"; ref?: V3; pushes?: Push[] }> = ({ c, T, blur = 0, split = "all", ref = EYES, pushes = [] }) => {
  const ez = proj(c, ref).z;
  const items = STEMS.map((s) => ({ s, z: proj(c, [s.bx, s.by, 0.3]).z }))
    .filter((o) => split === "all" || (split === "far" ? o.z >= ez : o.z < ez))
    .sort((a, b) => b.z - a.z);
  return <g filter={blur > 0.3 ? `url(#eblur${Math.round(blur)})` : undefined}>
    {items.map(({ s }) => {
      const pts = stemPts(s, T, pushes);
      const rb = ribbon(c, pts, s.w0), refl = ribbon(c, pts.slice(0, 5), s.w0, true);
      const tip = rb.P[rb.P.length - 2], top = rb.top, tw = s.w0 * top.ppm;
      return <g key={s.k}>
        <path d={refl.d} fill="#0d1622" opacity={0.35} />
        <path d={rb.d} fill={s.k % 3 === 0 ? "#0c1610" : "#09110d"} />
        <path d={rb.rim} stroke="#7d93c4" strokeWidth={Math.max(1, tw * 0.5)} fill="none" opacity={0.42} />
        {s.tuft && <g>
          {[0, 1, 2].map((j) => { const cx = tip.x + (j - 1) * tw * 1.4 + tw, cy = tip.y + tw * (1.5 + j * 1.2);
            return <ellipse key={j} cx={cx} cy={cy} rx={tw * 0.9} ry={tw * 2.1} transform={`rotate(${25 + 15 * (j - 1)},${cx},${cy})`} fill="#2a1b0f" />; })}
        </g>}
      </g>;
    })}
  </g>;
};

const Ripples: React.FC<{ c: Cam; T: number; at: V3; t0: number; n?: number; amp?: number; speed?: number }> = ({ c, T, at, t0, n = 3, amp = 1, speed = 0.42 }) => {
  const out: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const d = T - t0 - k * 0.16;
    if (d <= 0) continue;
    const r = 0.04 + speed * d, op = amp * 0.55 * Math.exp(-d / 0.9) * clamp01(d / 0.05);
    if (op < 0.01) continue;
    const pts = Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * 2 * Math.PI; const p = proj(c, [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, WATER_Z]); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; });
    const w = Math.max(1.2, 0.006 * proj(c, [at[0], at[1], WATER_Z]).ppm);
    out.push(<path key={k} d={`M${pts.join(" L")}`} stroke="#a8bde6" strokeWidth={w} fill="none" opacity={op} />);
    out.push(<path key={k + "d"} d={`M${pts.join(" L")}`} stroke="#000" strokeWidth={w * 1.6} fill="none" opacity={op * 0.5} transform={`translate(0,${w * 1.6})`} />);
  }
  return <g>{out}</g>;
};

const Glints: React.FC<{ c: Cam; T: number; near?: number }> = ({ c, T, near = 1.0 }) => {
  const out: React.ReactNode[] = [];
  const C = c.pos;
  for (let i = 0; i < 90; i++) {
    const sp = 1.1 + 1.6 * rnd(i, 3), ph = T * sp + rnd(i, 4) * 6.28, n = Math.floor(ph / (2 * Math.PI)), u = ph / (2 * Math.PI) - n;
    if (u > 0.5) continue;
    const k = Math.sin(u * 2 * Math.PI) ** 2, j = i * 37 + n * 101;
    const yw = C[1] + near + 45 * rnd(j, 1) ** 2.2;
    if (yw < 1.05) continue;
    const spread = 0.12 + 0.045 * (yw - C[1]);
    const xw = C[0] + (yw - C[1]) * (MOON_DIR[0] / MOON_DIR[1]) + (rnd(j, 2) - 0.5) * 2 * spread * (0.4 + rnd(j, 7));
    const p = proj(c, [xw, yw, WATER_Z]);
    if (p.x < -50 || p.x > c.W + 50 || p.y < 0 || p.y > 1920 || p.z < 0.2) continue;
    const drift = (rnd(j, 6) < 0.5 ? -1 : 1) * (0.03 + 0.04 * rnd(j, 8)) * p.ppm * u;
    const len = (0.07 + 0.16 * rnd(j, 5)) * p.ppm;
    out.push(<rect key={i} x={p.x - len / 2 + drift} y={p.y - 1.5} width={len} height={Math.max(2.5, 0.02 * p.ppm)} rx={1.5} fill="#e8f0ff" opacity={0.85 * k} />);
  }
  return <g style={{ mixBlendMode: "screen" }}>{out}</g>;
};
/** glints scattered over open water seen side-on (the walk camera looks along the shore, off the moon's path) */
const SideGlints: React.FC<{ c: Cam; T: number }> = ({ c, T }) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const sp = 0.9 + 1.4 * rnd(i, 13), ph = T * sp + rnd(i, 14) * 6.28, n = Math.floor(ph / (2 * Math.PI)), u = ph / (2 * Math.PI) - n;
    if (u > 0.5) continue;
    const k = Math.sin(u * 2 * Math.PI) ** 2, j = i * 41 + n * 97;
    const p = proj(c, [-6 + 9 * rnd(j, 1), 1.3 + 14 * rnd(j, 2) ** 1.6, WATER_Z]);
    if (p.x < -50 || p.x > c.W + 50 || p.y < 0 || p.y > 1920) continue;
    const len = (0.05 + 0.1 * rnd(j, 5)) * p.ppm;
    out.push(<rect key={i} x={p.x - len / 2} y={p.y - 1} width={len} height={Math.max(2, 0.015 * p.ppm)} rx={1} fill="#dfe8ff" opacity={0.5 * k} />);
  }
  return <g style={{ mixBlendMode: "screen" }}>{out}</g>;
};

const Mist: React.FC<{ c: Cam; T: number; id: string; amt?: number }> = ({ c, T, id, amt = 1 }) => {
  const C = c.pos, hz = proj(c, [C[0], C[1] + 80, WATER_Z]).y, edge = Math.min(1900, proj(c, [C[0], Math.max(C[1] + 1.2, 1.1), WATER_Z]).y);
  return <g style={{ mixBlendMode: "screen" }}>
    <defs><radialGradient id={`mist-${id}`}><stop offset="0" stopColor="#a8b8e0" stopOpacity={0.5} /><stop offset="1" stopColor="#a8b8e0" stopOpacity={0} /></radialGradient></defs>
    {Array.from({ length: 14 }, (_, i) => {
      const yy = hz + (edge - hz) * (0.05 + 0.8 * rnd(i, 1)) + 8 * Math.sin(T * 0.3 + i);
      const sp = 12 + 16 * rnd(i, 2), span = c.W + 1400;
      const xx = ((rnd(i, 3) * span + T * sp) % span) - 700;
      const rw = 300 + 380 * rnd(i, 4), rh = 30 + 70 * rnd(i, 5) * (0.4 + clamp01((yy - hz) / Math.max(1, edge - hz)));
      return <ellipse key={i} cx={xx} cy={yy} rx={rw} ry={rh} fill={`url(#mist-${id})`} opacity={amt * (0.25 + 0.2 * rnd(i, 6))} />;
    })}
    <ellipse cx={c.W / 2} cy={hz + 6} rx={900} ry={34} fill={`url(#mist-${id})`} opacity={0.3 * amt} />
  </g>;
};

const MoonDamp: React.FC<{ c: Cam; id: string }> = ({ c, id }) => {
  const C = c.pos, p = proj(c, [C[0] + MOON_DIR[0] * 1000, C[1] + MOON_DIR[1] * 1000, C[2] - MOON_DIR[2] * 1000]);
  if (p.y > 2200 || p.x < -300 || p.x > c.W + 300 || p.z < 1) return null;
  const hitY = C[1] + MOON_DIR[1] * (C[2] - WATER_Z) / MOON_DIR[2];
  if (hitY < 1.0) return null;
  return <g>
    <defs>
      <radialGradient id={`md-${id}`}><stop offset="0" stopColor="#47505d" stopOpacity={1} /><stop offset="0.56" stopColor="#47505d" stopOpacity={1} />
        <stop offset="0.78" stopColor="#434b58" stopOpacity={0.55} /><stop offset="1" stopColor="#434b58" stopOpacity={0} /></radialGradient>
      <radialGradient id={`mg-${id}`}><stop offset="0" stopColor="#9fb0d4" stopOpacity={0.35} /><stop offset="1" stopColor="#9fb0d4" stopOpacity={0} /></radialGradient>
    </defs>
    <ellipse cx={p.x} cy={p.y} rx={0.11 * c.f} ry={0.105 * c.f} fill={`url(#md-${id})`} />
    <ellipse cx={p.x} cy={p.y} rx={0.09 * c.f} ry={0.05 * c.f} fill={`url(#mg-${id})`} style={{ mixBlendMode: "screen" }} />
  </g>;
};

type Fg = [number, number, number, number];
const FgStems: React.FC<{ T: number; clumps: Fg[]; dx: number; blur: number; id: string }> = ({ T, clumps, dx, blur, id }) => {
  const stems: React.ReactNode[] = [];
  const wd = wind(T);
  clumps.forEach(([cx, n, hf, ln], ci) => {
    for (let j = 0; j < n; j++) {
      const k = ci * 10 + j, bx = cx + dx + (rnd(k, 1) - 0.5) * 150, by = 1990;
      const h = (700 + 700 * rnd(k, 2)) * hf, lean = (rnd(k, 3) - 0.5) * 200 + ln;
      const sw = (24 * Math.sin(T * (0.7 + 0.35 * rnd(k, 4)) + rnd(k, 5) * 6) + 9 * Math.sin(T * 1.7 + k)) * wd * (h / 1000);
      const tx = bx + lean + sw, ty = by - h, mx = bx + lean * 0.45 + sw * 0.35, my = by - h * 0.55, w0 = 16 + 16 * rnd(k, 6);
      stems.push(<path key={k} d={`M${bx - w0},${by} Q${mx - w0 * 0.6},${my} ${tx},${ty} Q${mx + w0 * 0.6},${my} ${bx + w0},${by} Z`} fill="#04060a" />);
      stems.push(<path key={k + "r"} d={`M${bx + w0 * 0.7},${by} Q${mx + w0 * 0.5},${my} ${tx},${ty}`} stroke="#6c80b0" strokeWidth={2.4} fill="none" opacity={0.4} />);
      if (rnd(k, 8) < 0.45) stems.push(<ellipse key={k + "t"} cx={tx + 4} cy={ty + 18} rx={10} ry={22} transform={`rotate(${15 + sw * 0.3},${tx + 4},${ty + 18})`} fill="#1a120c" />);
    }
  });
  return <svg width={1080} height={1920} style={{ position: "absolute" }}>
    <defs><filter id={`fg-${id}`} x="-20%" y="-10%" width="140%" height="120%"><feGaussianBlur stdDeviation={blur} /></filter></defs>
    <g filter={`url(#fg-${id})`}>{stems}</g>
  </svg>;
};

/* ------------------------------------------------------------------ moonlight on flat shapes (as StylePreview) */
const LitFilter: React.FC<{ id: string; ppm: number }> = ({ id, ppm }) => {
  const sm2 = Math.max(0.6, ppm * 0.0035);
  return <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation={ppm * 0.03} result="b" />
    <feDiffuseLighting in="b" surfaceScale={ppm * 0.03} diffuseConstant={1.0} lightingColor="#b8c8ff" result="key0"><feDistantLight azimuth={-40} elevation={34} /></feDiffuseLighting>
    <feGaussianBlur in="key0" stdDeviation={sm2} result="key" />
    <feDiffuseLighting in="b" surfaceScale={ppm * 0.03} diffuseConstant={0.7} lightingColor="#5a6a9a" result="fill0"><feDistantLight azimuth={160} elevation={25} /></feDiffuseLighting>
    <feGaussianBlur in="fill0" stdDeviation={sm2} result="fill" />
    <feComposite in="key" in2="fill" operator="arithmetic" k2={0.62} k3={0.5} k4={0.08} result="light" />
    <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1={1.05} result="shaded" />
    <feSpecularLighting in="b" surfaceScale={ppm * 0.03} specularConstant={1.1} specularExponent={16} lightingColor="#d4e2ff" result="spec0"><feDistantLight azimuth={-5} elevation={10} /></feSpecularLighting>
    <feGaussianBlur in="spec0" stdDeviation={sm2} result="spec" />
    <feComposite in="spec" in2="SourceAlpha" operator="in" result="rim" />
    <feComposite in="shaded" in2="rim" operator="arithmetic" k2={1} k3={0.5} result="all" />
    <feComposite in="all" in2="SourceAlpha" operator="in" />
  </filter>;
};

/** the fisherman lit by the moon (StylePreview's MoonLitHi), with an optional pitch of the whole body about a pivot
 *  (the pull) */
const MoonLitHi: React.FC<{ id: string; x: number; y: number; ppm: number; pose: FPose; feet?: [number, number]; rot?: number; pivot?: [number, number]; shadow?: number }> =
  ({ id, x, y, ppm, pose, feet, rot = 0, pivot, shadow = 1 }) => {
    const pv = pivot ?? [x, y];
    return <g>
      <defs>
        <LitFilter id={`lit-${id}`} ppm={ppm} />
        <filter id={`soft-${id}`} x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation={ppm * 0.03} /></filter>
        <linearGradient id={`sh-${id}`} x1={0} y1={0} x2={0} y2={1}><stop offset="0" stopColor="#000" stopOpacity={0.55} /><stop offset="1" stopColor="#000" stopOpacity={0} /></linearGradient>
      </defs>
      <g filter={`url(#soft-${id})`} opacity={shadow}>
        <path d={`M${x - 0.22 * ppm},${y - 0.01 * ppm} L${x + 0.2 * ppm},${y - 0.01 * ppm} L${x - 0.05 * ppm},${y + 0.75 * ppm} L${x - 0.55 * ppm},${y + 0.72 * ppm} Z`} fill={`url(#sh-${id})`} />
        <ellipse cx={x + (pose.kneel ?? 0) * 0.35 * ppm} cy={y + 0.005 * ppm} rx={(0.34 + 0.2 * (pose.kneel ?? 0)) * ppm} ry={0.045 * ppm} fill="#000" opacity={0.42} />
        {feet && feet.map((fx, i) => <ellipse key={i} cx={x + (fx + 0.05) * ppm} cy={y + 0.006 * ppm} rx={0.13 * ppm} ry={0.025 * ppm} fill="#000" opacity={0.5} />)}
      </g>
      <g filter={`url(#lit-${id})`}><g transform={`rotate(${rot},${pv[0]},${pv[1]})`}><Fisherman id={id} x={x} y={y} ppm={ppm} pose={pose} /></g></g>
    </g>;
  };

/* ------------------------------------------------------------------ rig geometry (mirrors fisherman.tsx) */
// the wrist of his near arm in figure metres (x forward, y down, soles at 0), for a standing pose (walk 0), so the tail's
// hand can hold the rig's own wrist. Same formulas as Fisherman: hips, lean, shoulder, arm angles.
const rad = (d: number) => (d * Math.PI) / 180;
const wristOf = (pose: FPose) => {
  const t = pose.t ?? 0, kn = clamp01(pose.kneel ?? 0), br = pose.breath ?? 1, breath = Math.sin(t * 1.55) * br;
  const sway = 0.008 * Math.sin(t * 0.55) + 0.003 * Math.sin(t * 1.3 + 0.4);
  const hipY = lerp(-0.86 + 0.002 * breath, -0.45 + 0.002 * breath, kn), hipX = lerp(sway, 0.43, kn);
  const lean = 0.5 * Math.sin(t * 0.55) + 0.8 + (pose.slump ?? 0), cl = Math.cos(rad(lean)), sl = Math.sin(rad(lean));
  const top = 1.375 - 0.86, h = top + 0.006 * breath;
  const sh: [number, number] = [hipX + sl * h + 0.012, hipY - cl * h + 0.03];
  const [th, e] = pose.armNear ?? [3, 12];
  const a1 = rad(th), el: [number, number] = [sh[0] + Math.sin(a1) * 0.29, sh[1] + Math.cos(a1) * 0.29];
  const a2 = rad(th + Math.max(0, e)), wr: [number, number] = [el[0] + Math.sin(a2) * 0.265, el[1] + Math.cos(a2) * 0.265];
  return { sh, el, wr, dir: [Math.sin(a2), Math.cos(a2)] as [number, number] };
};

/* ------------------------------------------------------------------ his poses through the part */
const blinkAt = (T: number, at: number) => Math.abs(T - at) < 0.055;
const mixA = (a: [number, number], b: [number, number], k: number): [number, number] => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// the walk down the bank (part frames 0-66, partly off screen after the cut): he hesitates a beat, then goes
const W_T0 = OFF + 0.22, W_T1 = OFF + 2.45, W_V = 1.45;
const W_FROM: V3 = [0.444, -2.0, 0.02], W_TO: V3 = [0.6, 0.95, 0.0];
const W_DIR = (() => { const d: V3 = [W_TO[0] - W_FROM[0], W_TO[1] - W_FROM[1], 0], l = len3(d); return mul3(d, 1 / l); })();
/** the c_walk camera's screen distance (in rig metres) for s metres walked along the path (so the feet never slide) */
const WALK_TABLE = (() => {
  const c = CAMS.walk, out: number[] = [0];
  let acc = 0, prev = proj(c, W_FROM);
  for (let i = 1; i <= 400; i++) {
    const p = proj(c, add3(W_FROM, mul3(W_DIR, i * 0.01)));
    acc += Math.abs(p.x - prev.x) / ((p.ppm + prev.ppm) / 2) / 0.98;   // ppm at the feet ~ his height in px / 1.66
    out.push(acc); prev = p;
  }
  return out;
})();
const walkDist = (s: number) => { const i = Math.max(0, Math.min(399, Math.floor(s / 0.01))), k = s / 0.01 - i; return lerp(WALK_TABLE[i], WALK_TABLE[i + 1], clamp01(k)); };

type Him = { pos: V3; pose: FPose; rot?: number };
/** the descent (c_walk) */
const himWalk = (T: number): Him => {
  const S = walk(T, W_T0, W_T1, W_V, 0.35);
  const pos = add3(W_FROM, mul3(W_DIR, S.s));
  const k = sm((T - OFF) / 0.5);
  return { pos, pose: {
    t: T, dist: walkDist(S.s), walk: S.w, expr: T < OFF + 0.6 ? "scared" : "worried", lookX: 1, lookY: 0.2, turn: 0.1, tilt: 2,
    slump: 2 + 2 * S.w, armNear: S.w > 0.05 ? undefined : mixA([20, 100], [6, 18], k), armFar: S.w > 0.05 ? undefined : mixA([13, 80], [5, 16], k), blink: blinkAt(T, OFF + 0.9),
  } };
};
// arriving at the edge (med), the last stride in, the kneel, the reach
const A_T0 = OFF + C_KNEEL / FPS - 0.35, A_T1 = OFF + C_KNEEL / FPS + 0.45, K_T0 = OFF + 75 / FPS, K_T1 = K_T0 + 0.6, R_T0 = OFF + 83 / FPS;
const A_D = 0.5;
const REACH_ARM: [number, number] = [62, 6];
/** his whole pose from the arrival on, by time */
const himEdge = (T: number): Him => {
  // arrival: the last stride (planted-foot walk with the eased stop)
  const S = walk(T, A_T0, A_T1, 1.1, 0.3), Sf = walk(A_T1 + 1, A_T0, A_T1, 1.1, 0.3).s;
  const s = (S.s / Sf) * A_D;
  const pos: V3 = [KNEEL[0] - A_D + s, KNEEL[1], 0];
  const kn = sm((T - K_T0) / (K_T1 - K_T0));
  const rch = sm((T - R_T0) / 0.6);
  const grab = T >= GRAB_T ? 1 : 0, gk = easeOut((T - GRAB_T) / 0.12);
  // before the grab: leaning in, the near arm reaching into the reeds, the far hand on his front knee
  let slump = 3 * kn + 22 * rch;
  let near: [number, number] = mixA(mixA([5, 14], [14, 40], kn), REACH_ARM, rch);
  let far: [number, number] = mixA([4, 13], [22, 62], kn);
  let expr: FPose["expr"] = "wary", lookY = 0.1 + 0.4 * kn, tilt = 3 * kn + 4 * rch;
  if (grab) {
    // the grab: the arm is snatched straight and a little down; he jerks back from the hips, far hand flies up
    near = mixA(REACH_ARM, [86, 2], gk);
    const back = sm((T - GRAB_T - 0.05) / 0.35);
    slump = lerp(25, 6, back) + 1.5 * Math.sin((T - GRAB_T) * 31) * Math.exp(-(T - GRAB_T) / 0.3);
    far = mixA([22, 62], [40, 100], sm((T - GRAB_T) / 0.25));
    expr = "scared"; lookY = 0.45; tilt = lerp(7, -2, back);
  }
  // terror: straining back against it (from 29.0 s), trembling
  if (T > OFF + 280 / FPS) {
    const k = sm((T - OFF - 280 / FPS) / 0.7);
    slump = lerp(slump, -9, k) + 1.2 * Math.sin(T * 41) * k;
    near = mixA(near, [80, 0], k);
    far = mixA(far, [-25, 40], k);
    tilt = lerp(tilt, -5, k);
  }
  let rot = 0;
  if (T >= PULL_T - 0.02) {
    // the pull: the arm is jerked out and down toward the water, he pitches forward over his front knee, off balance
    const d = T - PULL_T, k = easeOut(d / 0.16), k2 = sm(d / 0.75);
    near = mixA([80, 0], [100, 0], k);
    far = mixA([-25, 40], [60, 30], sm(d / 0.3));
    slump = lerp(-9, 26, k) + 6 * k2;
    rot = 22 * easeIn(d / 0.8) + 5 * k;
    tilt = lerp(-5, 14, k);
  }
  return { pos: [pos[0] + (T >= PULL_T ? 0.16 * easeIn((T - PULL_T) / 0.8) : 0), pos[1], pos[2]], rot, pose: {
    t: T, dist: s * 0.95, walk: S.w, kneel: kn, expr, lookX: 1, lookY, turn: 0.15, tilt, slump,
    armNear: S.w > 0.05 && kn < 0.01 ? undefined : near, armFar: S.w > 0.05 && kn < 0.01 ? undefined : far, breath: 1.4, blink: blinkAt(T, OFF + 3.2),
  } };
};

/* ------------------------------------------------------------------ the tail-hand drawn on any shot */
const sub2 = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
/** the black wet tail from the water up to the pale hand clamped round his wrist (screen space). w = tail width px at
 *  the cuff; `taut` straightens it */
const TailHand: React.FC<{ from: V; wrist: V; dir: V; ppm: number; T: number; taut?: number; clip?: number; grip?: number }> = ({ from, wrist, dir, ppm, T, taut = 0, clip, grip = 1 }) => {
  // the pale hand sits on top of his wrist, its fingers wrapped down over it; the cuff is above, toward the water side
  const s = (0.16 * ppm) / 150;
  const nrm: V = [dir[1], -dir[0]];   // the side of his arm facing up/back
  const up: V = nrm[1] < 0 ? nrm : [-nrm[0], -nrm[1]];
  const hp: V = [wrist[0] - dir[0] * 0.045 * ppm + up[0] * 0.075 * ppm, wrist[1] - dir[1] * 0.045 * ppm + up[1] * 0.075 * ppm];
  const ang = (Math.atan2(-up[1], -up[0]) * 180) / Math.PI;
  const cuff: V = [hp[0] + up[0] * 0.035 * ppm, hp[1] + up[1] * 0.035 * ppm];
  const sw = (1 - taut) * 0.05 * ppm * Math.sin(T * 3.1);
  const mid: V = [lerp(cuff[0], from[0], 0.5) + (1 - taut) * 0.12 * ppm + sw, lerp(cuff[1], from[1], 0.5) - (1 - taut) * 0.1 * ppm];
  const c: V[] = [from, [lerp(from[0], mid[0], 0.6), lerp(from[1], mid[1], 0.6)], mid, [lerp(mid[0], cuff[0], 0.6) + up[0] * 0.05 * ppm, lerp(mid[1], cuff[1], 0.6) + up[1] * 0.05 * ppm], cuff];
  const tw = (u: number) => (0.05 - 0.02 * u) * ppm;
  const poly = tube(c, tw, 10);
  const S = cr(c, 10);
  const sweep = (p: V): V => { let bi = 0, bd = 1e9; S.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; bi = i; } }); const a = S[Math.max(0, bi - 1)], b = S[Math.min(S.length - 1, bi + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const g = clamp01(grip);
  return <g>
    {clip !== undefined && <defs><clipPath id="tailclip"><rect x={-3000} y={-3000} width={9000} height={clip + 3000} /></clipPath></defs>}
    <g clipPath={clip !== undefined ? "url(#tailclip)" : undefined}>
      <Rimmed d={furPath(poly, { len: Math.max(3, 0.03 * ppm), every: 3, sweep, seed: 17, lay: 0.5 })} fill="url(#ahzFurSide)" ink={Math.max(1.5, ppm * 0.004)} />
      <path d={"M" + S.slice(2, -2).map((q) => `${(q[0] + 0.012 * ppm).toFixed(1)},${(q[1] - 0.012 * ppm).toFixed(1)}`).join(" L")} stroke={AHZ.gloss} strokeWidth={Math.max(1.5, 0.006 * ppm)} fill="none" opacity={0.3} strokeLinecap="round" />
    </g>
    <g opacity={0.45} transform={`translate(${-0.006 * ppm},${0.012 * ppm})`}><HumanHand p={hp} ang={ang} s={s} spread={lerp(0.9, 0.2, g)} curl={[0.12, 0.1, 0.12, 0.16].map((x) => x + 0.4 * (1 - g))} fingerLen={1.5} nailLen={1.7} thumb={false} skin="#140c0a" lo="#140c0a" nail="#140c0a" line="#140c0a" /></g>
    <HumanHand p={hp} ang={ang} s={s} spread={lerp(0.9, 0.2, g)} curl={[0.12, 0.1, 0.12, 0.16].map((x) => x + 0.4 * (1 - g))} fingerLen={1.5} nailLen={1.7} thumb={false} />
    <Rimmed d={furPath(tube([cuff, [lerp(cuff[0], hp[0], 0.9), lerp(cuff[1], hp[1], 0.9)]], () => 0.034 * ppm, 4), { len: Math.max(3, 0.025 * ppm), sweep: [-0.6, 0.6], seed: 9 })} fill="url(#ahzFurSide)" ink={Math.max(1.5, ppm * 0.004)} />
    <Drip p={[mid[0], mid[1] + 0.03 * ppm]} s={Math.max(0.6, ppm / 900)} t={T} phase={0.3} fall={0.08 * ppm} />
    <Drip p={[hp[0] - 0.02 * ppm, hp[1] + 0.06 * ppm]} s={Math.max(0.6, ppm / 900)} t={T} phase={0.75} fall={0.08 * ppm} />
  </g>;
};

/* ------------------------------------------------------------------ one plate shot */
type View = { cx: number; cy: number; z: number; sx?: number; sy?: number };
/** keep the plate covering the frame: the window (1080/z x 1920/z) stays inside the W x 1920 plate */
const viewTf = (c: Cam, v: View) => {
  const hw = 540 / v.z, hh = 960 / v.z;
  const cx = Math.max(hw, Math.min(c.W - hw, v.cx + (v.sx ?? 0) / v.z)), cy = Math.max(hh, Math.min(1920 - hh, v.cy + (v.sy ?? 0) / v.z));
  return `translate(540px,960px) scale(${v.z}) translate(${-cx}px,${-cy}px)`;
};
const Plate: React.FC<{ name: ShotName; T: number; v: View; children?: React.ReactNode; fg?: Fg[]; fgBlur?: number; fgDx?: number; mist?: number; sideGlints?: boolean }> =
  ({ name, T, v, children, fg, fgBlur = 8, fgDx = 0, mist = 1, sideGlints }) => {
    const c = CAMS[name];
    return <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#03050a" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: c.W, height: 1920, transformOrigin: "0 0", transform: viewTf(c, v) }}>
        <Img src={staticFile(`ahuizotl/${c.plate}/f_0001.png`)} style={{ position: "absolute", left: 0, top: 0, width: c.W, height: 1920 }} />
        <svg width={c.W} height={1920} style={{ position: "absolute" }}>
          <defs>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((b) => <filter key={b} id={`eblur${b}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={b} /></filter>)}
          </defs>
          <AhzDefs />
          <MoonDamp c={c} id={name} />
          {sideGlints ? <SideGlints c={c} T={T} /> : <Glints c={c} T={T} near={name === "edge" ? 1.3 : 1.0} />}
          <Mist c={c} T={T} id={name} amt={mist} />
          {children}
        </svg>
      </div>
      {fg && <FgStems T={T} clumps={fg} dx={fgDx} blur={fgBlur} id={name} />}
    </AbsoluteFill>;
  };

/** the close plate sits about a metre from him: for the close-ups he is drawn pushed back along the camera rays (the same
 *  place on screen, about 30 % smaller), so his head and shoulders fit the frame */
const CL_BACK = 1.32;
const HEAD_K: V3 = [0.55, 0, 1.08];   // his head relative to the kneel origin
const backHead = (c: Cam, h: Him, k = CL_BACK): V3 => { const H = add3(h.pos, HEAD_K); return add3(c.pos, mul3([H[0] - c.pos[0], H[1] - c.pos[1], H[2] - c.pos[2]], k)); };
const back = (c: Cam, h: Him, sx = 0): Him => ({ ...h, pos: add3(add3(backHead(c, h), mul3(HEAD_K, -1)), [sx, 0, 0]) });
const headOf = (c: Cam, h: Him, dx = 0.55, sx = 0) => proj(c, add3(backHead(c, h), [dx - 0.55 + sx, 0, 0]));

/** him on a plate, lit, plus the tail-hand on his wrist once it has him */
const HimOn: React.FC<{ c: Cam; T: number; h: Him; id: string; tail?: boolean; feet?: [number, number] }> = ({ c, T, h, id, tail, feet }) => {
  const ft = proj(c, h.pos), hd = proj(c, [h.pos[0], h.pos[1], h.pos[2] + 1.66]);
  const ppm = (ft.y - hd.y) / 1.66;
  // the pivot of the pull: his front foot
  const pv: [number, number] = [ft.x + 0.8 * ppm, ft.y];
  const W = wristOf(h.pose), rr = rad(h.rot ?? 0), cs = Math.cos(rr), sn = Math.sin(rr);
  const rotP = (p: [number, number]): V => { const x = ft.x + p[0] * ppm - pv[0], y = ft.y + p[1] * ppm - pv[1]; return [pv[0] + x * cs - y * sn, pv[1] + x * sn + y * cs]; };
  const wr = rotP(W.wr), dir: V = [W.dir[0] * cs - W.dir[1] * sn, W.dir[0] * sn + W.dir[1] * cs];
  const tin = proj(c, TAIL_IN);
  return <g>
    <MoonLitHi id={id} x={ft.x} y={ft.y} ppm={ppm} pose={h.pose} feet={feet} rot={h.rot} pivot={pv} />
    {tail && <TailHand from={[tin.x, tin.y + 0.03 * tin.ppm]} wrist={wr} dir={dir} ppm={ppm} T={T} taut={T > OFF + 280 / FPS ? 1 : 0.4} />}
  </g>;
};

/* ------------------------------------------------------------------ his arm close at the waterline (edge camera) */
const SH_W: V3 = [1.32, 0.98, 0.9];   // his near shoulder while he kneels and reaches
/** the wrist going into the clump: in at the edge of the stems, then deeper, feeling about */
const wristW = (T: number): V3 => {
  const k = sm((T - (OFF + C_ARM / FPS - 0.15)) / 1.5);
  let p = lerp3([1.52, 1.06, 0.58], [1.73, 1.24, 0.34], k);
  // feeling about inside (small searching moves), then still for a held breath before the grab
  const srch = sm((T - 23.9) / 0.4) * (1 - sm((T - 24.9) / 0.3));
  p = add3(p, [0.025 * Math.sin(T * 5.3) * srch, 0.02 * Math.sin(T * 3.7 + 1) * srch, 0.015 * Math.sin(T * 4.1) * srch]);
  if (T >= GRAB_T) {
    // snatched down toward the water, held
    const d = T - GRAB_T, k2 = easeOut(d / 0.1);
    p = add3(p, [0.04 * k2, 0.05 * k2, -0.07 * k2 + 0.012 * Math.sin(d * 37) * Math.exp(-d / 0.3)]);
  }
  return p;
};
const ArmClose: React.FC<{ T: number; v: View; grab: boolean }> = ({ T, v, grab }) => {
  const c = CAMS.edge;
  const W = wristW(T), d0 = [W[0] - SH_W[0], W[1] - SH_W[1], W[2] - SH_W[2]] as V3, d = len3(d0);
  // the elbow: up and out from the line shoulder-wrist (2-bone, upper 0.29, fore 0.265)
  const a = Math.min(0.29, d * 0.53), hgt = Math.sqrt(Math.max(0, 0.29 * 0.29 - a * a));
  const u = mul3(d0, 1 / d), upv: V3 = [0, 0, 1], dot = u[2], n0 = add3(upv, mul3(u, -dot)), nl = len3(n0) || 1;
  const EL = add3(add3(SH_W, mul3(u, a)), mul3(n0, hgt / nl));
  const ps = proj(c, SH_W), pe = proj(c, EL), pw = proj(c, W);
  const dirS: V = [pw.x - pe.x, pw.y - pe.y], dl = Math.hypot(dirS[0], dirS[1]) || 1, dn: V = [dirS[0] / dl, dirS[1] / dl];
  const hand: V = [pw.x + dn[0] * 0.005 * pw.ppm, pw.y + dn[1] * 0.005 * pw.ppm];
  const ang = (Math.atan2(dn[1], dn[0]) * 180) / Math.PI;
  // limb outline: upper arm and forearm, muscle swell, merged under one ink outline
  const upper = tube([[ps.x, ps.y], [lerp(ps.x, pe.x, 0.5), lerp(ps.y, pe.y, 0.5)], [pe.x, pe.y]], (t) => lerp(0.06 * ps.ppm, 0.043 * pe.ppm, t) * (1 + 0.15 * Math.sin(t * Math.PI)), 8);
  const fore = tube([[pe.x, pe.y], [lerp(pe.x, pw.x, 0.3), lerp(pe.y, pw.y, 0.3)], [pw.x, pw.y]], (t) => lerp(0.043 * pe.ppm, 0.029 * pw.ppm, t) * (1 + 0.22 * Math.sin(t * Math.PI * 0.8)), 8);
  const toD = (p: V[]) => "M" + p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" L") + " Z";
  const g = T >= GRAB_T ? 1 : 0, dG = T - GRAB_T;
  // his hand: open and searching; at the grab the fingers splay in shock, then clench
  const spread = g ? lerp(1, 0.55, sm((dG - 0.15) / 0.4)) : 0.75 + 0.1 * Math.sin(T * 4);
  const curl = g ? [0.05, 0.05, 0.08, 0.1].map((x) => lerp(x, x + 0.5, sm((dG - 0.15) / 0.4))) : [0.25, 0.2, 0.22, 0.3];
  // the pale hand comes up out of the water and clamps (two frames before the slap it breaks the surface)
  const em = clamp01((T - (GRAB_T - 2 / FPS)) / (2 / FPS));
  const pushes: Push[] = [{ p: W, r: 0.11, amt: 0.6 + 0.4 * sm((T - 23.0) / 0.5) }];
  if (em > 0) pushes.push({ p: TAIL_IN, r: 0.14, amt: 1.4 * em });
  const s = (0.19 * pw.ppm) / 150;
  const surf = proj(c, [W[0] + 0.05, W[1] + 0.08, WATER_Z]);
  const from: V = [lerp(surf.x, pw.x + 0.02 * pw.ppm, 0.0), surf.y + 0.04 * pw.ppm];
  const lit = `armlit`;
  const ArmShapes = <g>
    <path d={toD(upper)} fill="#16121a" stroke="#16121a" strokeWidth={Math.max(3, 0.012 * pw.ppm)} strokeLinejoin="round" />
    <path d={toD(fore)} fill="#16121a" stroke="#16121a" strokeWidth={Math.max(3, 0.012 * pw.ppm)} strokeLinejoin="round" />
    <g transform={`translate(${(hand[0]).toFixed(1)},${hand[1].toFixed(1)})`}>
      <HumanHand p={[0, 0]} ang={ang} s={s} spread={spread} curl={curl} skin="#a86c44" lo="#7c4c2e" nail="#cdbcae" nailLen={0.1} fingerLen={1} line="#16121a" flipY />
    </g>
    <path d={toD(upper)} fill="#a86c44" />
    <path d={toD(fore)} fill="#a86c44" />
    <path d={`M${lerp(pe.x, pw.x, 0.25)},${lerp(pe.y, pw.y, 0.25) + 0.012 * pw.ppm} Q${lerp(pe.x, pw.x, 0.6)},${lerp(pe.y, pw.y, 0.6) + 0.02 * pw.ppm} ${pw.x},${pw.y + 0.012 * pw.ppm}`} stroke="#7c4c2e" strokeWidth={0.01 * pw.ppm} fill="none" opacity={0.5} strokeLinecap="round" />
  </g>;
  return <Plate name="edge" T={T} v={v} mist={0.9}>
    <defs><LitFilter id={lit} ppm={pw.ppm * 0.6} /></defs>
    <EdgeClump c={c} T={T} split="far" ref={W} pushes={pushes} blur={0} />
    <Ripples c={c} T={T} at={[W[0], W[1] + 0.06, WATER_Z]} t0={23.1} n={2} amp={0.5} />
    <Ripples c={c} T={T} at={TAIL_IN} t0={21.0} n={2} amp={0.5} />
    {g ? <Ripples c={c} T={T} at={[W[0] + 0.05, W[1] + 0.08, WATER_Z]} t0={GRAB_T - 0.07} n={4} amp={1.2} speed={0.7} /> : null}
    <g filter={`url(#${lit})`}>{ArmShapes}</g>
    {em > 0 && <TailHand from={[lerp(from[0], from[0], 1), from[1]]} wrist={[pw.x, pw.y]} dir={dn} ppm={pw.ppm * 1.05} T={T} taut={0.7} grip={sm((T - GRAB_T + 0.01) / 0.08)} clip={undefined} />}
    {em > 0 && em < 1 && <ellipse cx={from[0]} cy={from[1]} rx={0.12 * pw.ppm} ry={0.03 * pw.ppm} fill="#cfe2ff" opacity={0.35 * (1 - em)} />}
    {/* the splash where it broke the surface */}
    {g ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const dd = T - GRAB_T + 2 / FPS, a = -Math.PI / 2 + (rnd(i, 30) - 0.5) * 2.2, sp = (0.5 + rnd(i, 31)) * pw.ppm * 0.9;
      const x = from[0] + Math.cos(a) * sp * dd, y = from[1] + Math.sin(a) * sp * dd + 0.5 * 9.8 * pw.ppm * dd * dd * 0.6;
      return dd < 0.5 && y < from[1] + 5 ? <circle key={i} cx={x} cy={y} r={Math.max(2, 0.006 * pw.ppm * (1 - dd))} fill="#dce8ff" opacity={0.8 * (1 - dd / 0.5)} /> : null;
    }) : null}
    <EdgeClump c={c} T={T} split="near" ref={W} pushes={pushes} blur={2} />
  </Plate>;
};

/* ------------------------------------------------------------------ the insert: the pale hand, then down the tail */
const INS_H = 4300;   // composition height (px); the waterline where the tail goes under
const INS_WL = 3500;
const Insert: React.FC<{ T: number; f: number }> = ({ T, f }) => {
  const d = (f - C_INSERT) / FPS;
  // camera: hold close on the grip with a slow push ("Not a baby's hand."), then tilt down along the tail (27.4 - 29.5)
  const tilt = sm((T - 27.35) / 2.1);
  const z = lerp(1.55 + 0.1 * sm(d / 1.2), 1.22, sm((T - 27.35) / 0.9)) + 0.06 * sm((T - 28.8) / 0.9);
  const cy = Math.max(960 / z, lerp(640, INS_WL - 300, tilt)), cx = Math.max(540 / z, Math.min(1080 - 540 / z, lerp(600, 640, tilt)));
  const sh = Math.exp(-d / 0.12) * 8, sx = sh * Math.sin(d * 63), sy = sh * Math.sin(d * 51);
  const tf = `translate(540px,960px) scale(${z}) translate(${-cx + sx}px,${-cy + sy}px)`;
  // tail centreline: from the cuff above his wrist, arching over the arm, down behind it, in a long S to the water
  const sw = (k: number) => 22 * Math.sin(T * 2.2 - k * 1.3) * (0.4 + 0.6 * k);
  const tailC: V[] = [[600, 520], [700, 470], [800, 560], [820, 780], [760 + sw(0.15), 1150], [640 + sw(0.3), 1600], [560 + sw(0.45), 2100], [600 + sw(0.6), 2600], [650 + sw(0.8), 3050], [640 + sw(0.95), INS_WL + 20], [630, INS_WL + 400]];
  const tw = (u: number) => 62 + 95 * Math.pow(u, 0.7);
  const poly = tube(tailC, tw, 10), S = cr(tailC, 10);
  const sweep = (p: V): V => { let bi = 0, bd = 1e9; S.forEach((q, i) => { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < bd) { bd = dd; bi = i; } }); const a = S[Math.max(0, bi - 1)], b = S[Math.min(S.length - 1, bi + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const furD = furPath(poly, { len: 16, every: 3, sweep, seed: 77, lay: 0.45 });
  const furStrokesD = furStrokes(tailC.slice(0, -1), tw, 220, 23, 30);
  // his forearm across the frame, from the left edge to his hand (straining: a slow tremble)
  const tr = 2.5 * Math.sin(T * 37) + 1.5 * Math.sin(T * 23);
  const armC: V[] = [[-120, 640 + tr], [300, 668 + tr], [700, 700 + tr]];
  const arm = tube(armC, (u) => 112 - 34 * u, 10);
  const grip = { p: [612, 560 + tr] as V, ang: 98, s: 1.25, spread: 0.2, curl: [0.12, 0.1, 0.12, 0.16], fingerLen: 1.5, nailLen: 1.7, thumb: false };
  const stems = Array.from({ length: 16 }, (_, i) => ({ x: rnd(i, 40) * 1300 - 110, top: 200 + rnd(i, 41) * 1800, base: INS_WL - 260 + rnd(i, 42) * 200, w: 10 + rnd(i, 43) * 14, ph: rnd(i, 44) * 6 }));
  const toD = (p: V[]) => "M" + p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" L") + " Z";
  return <AbsoluteFill style={{ backgroundColor: "#04070d", overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: INS_H, transformOrigin: "0 0", transform: tf }}>
      <svg width={1080} height={INS_H} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="insbg" x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0" stopColor="#2a3a58" /><stop offset={(INS_WL - 900) / INS_H} stopColor="#24324e" /><stop offset={INS_WL / INS_H} stopColor="#1c2840" /><stop offset="1" stopColor="#0a1220" />
          </linearGradient>
          <radialGradient id="insmoon" cx="0.75" cy="0.25" r="0.6"><stop offset="0" stopColor="#8aa0cc" stopOpacity={0.35} /><stop offset="1" stopColor="#8aa0cc" stopOpacity={0} /></radialGradient>
          <filter id="insblur12"><feGaussianBlur stdDeviation={12} /></filter>
          <filter id="insblur5"><feGaussianBlur stdDeviation={5} /></filter>
          <filter id="insblur3"><feGaussianBlur stdDeviation={3} /></filter>
          <LitFilter id="inslit" ppm={900} />
          <clipPath id="abovewl"><rect x={-500} y={-500} width={2100} height={INS_WL + 500} /></clipPath>
          <clipPath id="belowwl"><rect x={-500} y={INS_WL} width={2100} height={INS_H} /></clipPath>
        </defs>
        <AhzDefs />
        <rect x={-600} y={-200} width={2300} height={INS_H + 400} fill="url(#insbg)" />
        <rect x={-600} y={-200} width={2300} height={2400} fill="url(#insmoon)" />
        {/* out-of-focus reeds standing in the water behind, swaying; their wobbling reflections */}
        <g filter="url(#insblur12)">
          {stems.map((s, i) => { const swy = 14 * Math.sin(T * 0.9 + s.ph) * wind(T);
            return <g key={i}>
              <path d={`M${s.x - s.w},${s.base} Q${s.x + swy * 0.5},${(s.base + s.top) / 2} ${s.x + swy},${s.top} Q${s.x + swy * 0.5 + s.w * 0.5},${(s.base + s.top) / 2} ${s.x + s.w},${s.base} Z`} fill="#050a0a" opacity={0.9} />
              <path d={`M${s.x - s.w},${s.base} L${s.x + s.w},${s.base} L${s.x + Math.sin(T * 2 + i) * 8},${s.base + 260} Z`} fill="#0c1422" opacity={0.6} />
            </g>; })}
        </g>
        {/* the water surface: moonlit streak and glints, slow wavelets */}
        <g style={{ mixBlendMode: "screen" }}>
          {Array.from({ length: 70 }, (_, i) => {
            const sp = 1 + 1.5 * rnd(i, 50), ph = T * sp + rnd(i, 51) * 6.28, n = Math.floor(ph / (2 * Math.PI)), u = ph / (2 * Math.PI) - n;
            if (u > 0.5) return null;
            const j = i * 31 + n * 17, k = Math.sin(u * 2 * Math.PI) ** 2;
            const y = INS_WL - 600 + rnd(j, 52) * 1300, x = 760 + (rnd(j, 53) - 0.5) * 700;
            return <rect key={i} x={x} y={y} width={40 + 90 * rnd(j, 54)} height={4} rx={2} fill="#e8f0ff" opacity={0.6 * k} />;
          })}
        </g>
        {Array.from({ length: 9 }, (_, i) => { const y = INS_WL - 300 + i * 90 + 30 * Math.sin(T * 0.8 + i); return <path key={"wv" + i} d={`M-100,${y} Q300,${y - 10 + 8 * Math.sin(T + i)} 600,${y} T1200,${y}`} stroke="#5a6f9a" strokeWidth={2} fill="none" opacity={0.18} />; })}
        {/* the tail: under the water it fades into the dark */}
        <g clipPath="url(#belowwl)" filter="url(#insblur5)" opacity={0.5}><path d={toD(poly)} fill="#02040a" /></g>
        <g clipPath="url(#abovewl)">
          <Rimmed d={furD} fill={AHZ.fur} ink={4} off={[-9, 7]} rimOpacity={0.85} />
          <path d={furStrokesD.hi} stroke={AHZ.strand} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.8} />
          <path d={furStrokesD.lo} stroke="#000" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.6} />
          <path d={"M" + S.slice(4, -12).map((q) => `${(q[0] + 26).toFixed(1)},${(q[1] - 6).toFixed(1)}`).join(" L")} stroke={AHZ.gloss} strokeWidth={5} fill="none" opacity={0.25} strokeLinecap="round" />
          {[1300, 1900, 2500, 3100].map((y, i) => { const q = S.reduce((a, b) => (Math.abs(b[1] - y) < Math.abs(a[1] - y) ? b : a)); return <Drip key={i} p={[q[0] + 50, q[1]]} s={2.2} t={T} phase={rnd(i, 60)} fall={120} />; })}
        </g>
        {/* where it goes under: a ring of disturbed water, the wake of the pull */}
        {[0, 1, 2].map((k) => { const ph = ((T * 0.6 + k / 3) % 1); return <ellipse key={"r" + k} cx={640} cy={INS_WL + 20} rx={150 + 380 * ph} ry={26 + 60 * ph} fill="none" stroke="#a8bde6" strokeWidth={3} opacity={0.5 * (1 - ph)} />; })}
        <ellipse cx={640} cy={INS_WL + 24} rx={170} ry={28} fill="none" stroke="#c9d8f5" strokeWidth={4} opacity={0.45} />
        <ellipse cx={640} cy={INS_WL + 40} rx={190} ry={30} fill="#000" opacity={0.25} filter="url(#insblur3)" />
        {/* his forearm and hand, lit by the moon */}
        <g filter="url(#inslit)">
          <path d={toD(arm)} fill="#16121a" stroke="#16121a" strokeWidth={9} strokeLinejoin="round" />
          <HumanHand p={[690, 702 + tr]} ang={8} s={1.25} spread={0.75} curl={[0.55, 0.5, 0.55, 0.62]} skin="#a86c44" lo="#7c4c2e" nail="#cdbcae" nailLen={0.1} fingerLen={1} line="#16121a" />
          <path d={toD(arm)} fill="#a86c44" />
          <path d={`M-60,${700 + tr} Q300,${728 + tr} 640,${742 + tr}`} stroke="#7c4c2e" strokeWidth={22} fill="none" opacity={0.45} strokeLinecap="round" />
          <path d={`M-60,${598 + tr} Q300,${626 + tr} 640,${668 + tr}`} stroke="#d09068" strokeWidth={6} fill="none" opacity={0.35} strokeLinecap="round" />
          {/* tendons standing out (he is straining) */}
          {[0, 1].map((i) => <path key={i} d={`M${380 + i * 40},${650 + i * 18 + tr} Q${470 + i * 30},${662 + i * 14 + tr} ${560 + i * 20},${676 + i * 10 + tr}`} stroke="#7c4c2e" strokeWidth={3} fill="none" opacity={0.6} />)}
        </g>
        {/* the arch of the tail over his arm (in front of it) and the pale hand clamped round the wrist */}
        <g clipPath="url(#abovewl)"><path d={toD(tube(tailC.slice(0, 3), (u) => 52 + 10 * u, 10))} fill="url(#ahzFurSide)" stroke="#020306" strokeWidth={4} />
          <Rimmed d={furPath(tube(tailC.slice(0, 3), (u) => 52 + 10 * u, 10), { len: 14, sweep: [0.6, -0.2], seed: 78, lay: 0.4 })} fill="url(#ahzFurSide)" ink={4} /></g>
        <g opacity={0.45} transform="translate(-8,12)"><HumanHand {...grip} skin="#20140f" lo="#20140f" nail="#20140f" line="#20140f" /></g>
        <HumanHand {...grip} />
        <Rimmed d={furPath(tube([[634, 470], [612, 528]], () => 48, 4), { len: 18, sweep: [-0.6, 0.6], seed: 9 })} fill="url(#ahzFurSide)" ink={4} />
        <Drip p={[470, 760 + tr]} t={T} phase={0.8} fall={90} s={2} />
        <Drip p={[560, 770 + tr]} t={T} phase={0.3} fall={90} s={1.8} />
        <Drip p={[690, 520]} t={T} phase={0.6} fall={90} s={1.8} />
      </svg>
    </div>
    {/* out-of-focus stems right at the lens, drifting past as the camera tilts */}
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `translate(0px,${(-tilt * 500).toFixed(1)}px)` }}>
      <FgStems T={T} clumps={[[-60, 4, 1.2, 80], [1160, 3, 1.1, -60]]} dx={0} blur={14} id="ins" />
    </div>
  </AbsoluteFill>;
};

/* ------------------------------------------------------------------ the part */
export const AhzPartC: React.FC<{ clean?: boolean }> = ({ clean }) => {
  const f = useCurrentFrame(), T = OFF + f / FPS;
  let shot: React.ReactNode;
  let dark = 0, flash = 0;
  if (f < C_REEDS) {
    // 1. he goes down the bank to the water: side-on, the camera pans with him and pushes in a little
    const h = himWalk(T), c = CAMS.walk, p = proj(c, [h.pos[0], h.pos[1], 0.85]);
    const k = f / C_REEDS;
    shot = <Plate name="walk" T={T} v={{ cx: p.x + lerp(120, 200, k), cy: p.y - 40, z: lerp(1.12, 1.2, sm(k)) }} sideGlints mist={0.5}
      fg={[[-120, 4, 1.15, 90]]} fgBlur={10} fgDx={-f * 3}>
      <HimOn c={c} T={T} h={h} id="fw" feet={[-0.05, 0.1]} />
    </Plate>;
  } else if (f < C_KNEEL) {
    // 2. the clump at the water's edge, low: the stems tremble and shove, small rings run out from inside
    const k = (f - C_REEDS) / (C_KNEEL - C_REEDS), c = CAMS.edge, a = proj(c, [1.8, 1.45, 0.45]);
    shot = <Plate name="edge" T={T} v={{ cx: a.x + lerp(-20, 10, k), cy: a.y + 40, z: lerp(1.08, 1.2, k) }}>
      <EdgeClump c={c} T={T} split="far" />
      <Ripples c={c} T={T} at={[1.82, 1.5, WATER_Z]} t0={20.95} n={3} amp={0.7} />
      <Ripples c={c} T={T} at={[1.7, 1.4, WATER_Z]} t0={21.55} n={2} amp={0.6} />
      <EdgeClump c={c} T={T} split="near" />
    </Plate>;
    dark = 0.04;
  } else if (f < C_ARM) {
    // 3. medium: he arrives at the edge, kneels beside the clump and reaches in
    const k = (f - C_KNEEL) / (C_ARM - C_KNEEL), c = CAMS.med, h = himEdge(T);
    const a = proj(c, [KNEEL[0] + 0.45, KNEEL[1], 0.6]);
    const W = wristOf(h.pose), ft = proj(c, h.pos);
    const ppm = ft.ppm;   // approximate
    const handW: V3 = [h.pos[0] + W.wr[0], h.pos[1], -W.wr[1]];
    shot = <Plate name="med" T={T} v={{ cx: a.x + lerp(-30, 10, k), cy: a.y - 60, z: lerp(1.08, 1.18, sm(k)) }} fg={[[1160, 5, 1.0, -120]]} fgDx={lerp(0, -40, k)}>
      <EdgeClump c={c} T={T} pushes={[{ p: [handW[0] + 0.1, 1.3, 0], r: 0.12, amt: sm((T - R_T0 - 0.4) / 0.4) }]} />
      <Ripples c={c} T={T} at={[1.8, 1.45, WATER_Z]} t0={21.55} n={2} amp={0.6} />
      <HimOn c={c} T={T} h={h} id="fm" feet={h.pose.kneel ? undefined : [-0.05, 0.1]} />
      {/* the nearest stems of the clump close over his reaching hand */}
      <defs><radialGradient id="handmask"><stop offset="0" stopColor="#fff" /><stop offset="0.6" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
        <mask id="hm"><circle cx={proj(c, handW).x + 0.05 * ppm} cy={proj(c, handW).y} r={0.2 * ppm} fill="url(#handmask)" /></mask></defs>
      <g mask="url(#hm)" opacity={sm((T - R_T0 - 0.5) / 0.3)}><EdgeClump c={c} T={T} split="near" ref={[1.8, 1.42, 0]} pushes={[{ p: [handW[0] + 0.1, 1.3, 0], r: 0.12, amt: 1 }]} /></g>
    </Plate>;
  } else if (f < C_PEER) {
    // 4. low at the waterline: his arm comes in and goes into the stems, parting them
    const k = (f - C_ARM) / (C_PEER - C_ARM), a = proj(CAMS.edge, [1.72, 1.3, 0.35]);
    shot = <ArmClose T={T} grab={false} v={{ cx: a.x + lerp(-40, 0, k), cy: a.y - 60, z: lerp(1.05, 1.16, sm(k)) }} />;
    dark = 0.05;
  } else if (f < C_GRAB) {
    // 5. his face, close: peering into the reeds, holding his breath
    const k = (f - C_PEER) / (C_GRAB - C_PEER), c = CAMS.cl, h = back(c, himEdge(T));
    const hd = headOf(c, himEdge(T), 0.6);
    shot = <Plate name="cl" T={T} v={{ cx: hd.x + lerp(30, 0, k), cy: hd.y + 120, z: lerp(1.06, 1.14, k) }} mist={0.7}>
      <EdgeClump c={c} T={T} blur={6} />
      <HimOn c={c} T={T} h={h} id="fc" />
    </Plate>;
    dark = 0.1 * k;
  } else if (f < C_SHOCK) {
    // 6. back on the arm: still... then the pale hand bursts up and clamps the wrist (push-in, shake)
    const a = proj(CAMS.edge, [1.74, 1.28, 0.3]);
    const dG = T - GRAB_T, g = dG >= -0.001;
    const z = 1.1 + (g ? 0.12 * easeOut(dG / 0.12) + 0.03 * sm((dG - 0.2) / 0.6) : 0.02 * (f - C_GRAB) / 7);
    const sh = g ? Math.exp(-dG / 0.18) : 0, sx = 18 * sh * Math.sin(dG * 71), sy = 12 * sh * Math.sin(dG * 53 + 1.3);
    shot = <ArmClose T={T} grab={g} v={{ cx: a.x - 10, cy: a.y - 20, z, sx, sy }} />;
    flash = g ? 0.16 * Math.exp(-dG / 0.06) : 0;
    dark = 0.04;
  } else if (f < C_INSERT) {
    // 7. his face: shock, he jerks back against the grip
    const k = (f - C_SHOCK) / (C_INSERT - C_SHOCK), c = CAMS.cl, h = back(c, himEdge(T));
    const hd = headOf(c, himEdge(T), 0.55);
    const d = T - (OFF + C_SHOCK / FPS), sh = Math.exp(-d / 0.2), sx = 8 * sh * Math.sin(d * 47), sy = 6 * sh * Math.sin(d * 39);
    shot = <Plate name="cl" T={T} v={{ cx: hd.x - 20, cy: hd.y + 140, z: lerp(1.16, 1.12, k), sx, sy }} mist={0.7}>
      <EdgeClump c={c} T={T} blur={6} />
      <HimOn c={c} T={T} h={h} id="fc2" tail />
    </Plate>;
    dark = 0.04;
  } else if (f < C_TERROR) {
    // 8-9. insert: the pale hand on his wrist; the camera tilts down along the long black tail into the water
    shot = <Insert T={T} f={f} />;
    dark = 0.02;
  } else if (f < C_PULL) {
    // 10. his face: terror; he strains back, trembling, the taut tail at his wrist
    const k = (f - C_TERROR) / (C_PULL - C_TERROR), c = CAMS.cl, h = back(c, himEdge(T), 0.22);
    const hd = headOf(c, himEdge(T), 0.45, 0.22);
    shot = <Plate name="cl" T={T} v={{ cx: hd.x + 10, cy: hd.y + 160, z: lerp(1.1, 1.2, sm(k)), sx: 3 * Math.sin(T * 40), sy: 2 * Math.sin(T * 33) }} mist={0.7}>
      <EdgeClump c={c} T={T} blur={6} />
      <HimOn c={c} T={T} h={h} id="fc3" tail />
    </Plate>;
    dark = 0.1 + 0.06 * k;
  } else {
    // 11. "Then it pulled.": wider, from the bank; he strains, then is yanked toward the water, thrown off his knee
    const c = CAMS.react, h = himEdge(T);
    const a = proj(c, [KNEEL[0] + 0.75, KNEEL[1], 0.55]);
    const d = T - PULL_T, g = d >= 0;
    const z = lerp(1.04, 1.1, (f - C_PULL) / (AHZ_PARTC_FRAMES - C_PULL)) + (g ? 0.14 * easeIn(d / 0.8) : 0);
    const sh = g ? Math.exp(-d / 0.25) : 0, sx = 16 * sh * Math.sin(d * 61) + (g ? 120 * easeIn(d / 0.8) : 0), sy = 10 * sh * Math.sin(d * 47) + (g ? 90 * easeIn(d / 0.8) : 0);
    shot = <Plate name="react" T={T} v={{ cx: a.x, cy: a.y - 40, z, sx, sy }} fg={[[1160, 5, 1.0, -120]]} fgDx={g ? -200 * easeIn(d / 0.8) : 0}>
      <EdgeClump c={c} T={T} pushes={[{ p: TAIL_IN, r: 0.18, amt: 0.8 + (g ? 0.8 : 0) }]} />
      <Ripples c={c} T={T} at={TAIL_IN} t0={OFF + C_PULL / FPS} n={2} amp={0.6} />
      {g && <Ripples c={c} T={T} at={TAIL_IN} t0={PULL_T} n={4} amp={1.2} speed={0.8} />}
      <HimOn c={c} T={T} h={h} id="fr" tail />
    </Plate>;
    flash = g ? 0.1 * Math.exp(-d / 0.06) : 0;
    dark = 0.06;
  }
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {shot}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(112,136,192,0) 0%, rgba(112,136,192,0.05) 55%, rgba(0,0,0,0.25) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dark }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: "#cfdcff", opacity: flash, mixBlendMode: "screen" }} />
      {!clean && <Subtitles words={WORDS} style={SUB} offset={-OFF} />}
    </AbsoluteFill>
  );
};
