// "The Ahuizotl", Part A (global frames 0-315, mix 0.000-10.533 s): lines 1-2.
// L1 "In Aztec legend, something lived in the deep water. They called it the Ahuizotl."
// L2 "One night, a fisherman walking home along the lake heard a baby crying."
// Same method and look as the approved style preview (templates/ahuizotl/StylePreview.tsx, comp AhzStylePreviewV2): still
// Blender plates of the same lakeshore set (tools/blender/ahuizotl_partA.py, rendered at 1.25x display density so a 2D
// push-in never upscales; some are taller or wider for a 2D tilt or pan) with every moving thing drawn per frame on top:
// moon glints, drifting mist, the 2D tule clumps, ripples, the eyes, the fisherman (approved rig, moonlit like v2).
// Shots, word by word:
//  1  0.00-2.87  "In Aztec legend, something lived in the..."  high over the lake: a slow descending tilt from the moon,
//                over the mist, down to the black water
//  2  2.87-4.13  "...deep water."  low over the water, a push into the dark surface; faint rings spread from below
//  3  4.13-6.13  "They called it the Ahuizotl."  by the fishing stakes: ear tips and two glowing eyes rise among the reeds,
//                hold on its name, blink, and sink (the tease of the design sheet's "how it lurks"; nothing more is shown)
//  4  6.13-8.40  "One night, a fisherman walking home along the lake"  side tracking shot along the bank: he walks home
//                with his net on his shoulder (planted-foot walk from the rig)
//  5  8.40-9.53  "...heard a..."  a lower, closer angle a little ahead of him; he slows on "heard"
//  6  9.53-10.53 "baby crying."  close on him as he stops; on the faint far cry (~9.9 s) his eyes snap to the reeds and his
//                head turns toward them; the pose at the last frame is exactly Part B's first pose (same spot (0.9, -2.0),
//                turn 0.45, lookX 0.8, tilt -1.5, slump 1.5, wary), so the cut to B's wide shot is seamless.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import wordsJson from "../../stories/ahuizotl/final/words.json";
import camEdge from "../../stories/ahuizotl/sets/edge.json";
import camHigh from "../../stories/ahuizotl/sets/a_high.json";
import camDeep from "../../stories/ahuizotl/sets/a_deep.json";
import camLurk from "../../stories/ahuizotl/sets/a_lurk.json";
import camTrack from "../../stories/ahuizotl/sets/a_track.json";
import camWalk from "../../stories/ahuizotl/sets/a_walk.json";
import camClose from "../../stories/ahuizotl/sets/a_close.json";
import { sm, walk } from "./CharTest";
import { FPose, Fisherman } from "./fisherman";
import { AHZ, GlowEye } from "./creature";

const FPS = 30;
export const AHZ_PART_A_FRAMES = 316;
const CUT2 = 86, CUT3 = 124, CUT4 = 184, CUT5 = 252, CUT6 = 286;
const WORDS = (wordsJson as Word[]).filter((w) => w.s < 10.5);
const SUB = defaultStyle("serious", { key: "#3DF0FF", pop: 0.45, y: 0.8, keyWords: ["legend,", "deep", "water.", "ahuizotl.", "night,", "fisherman", "baby", "crying."].map((w) => w.replace(/[^a-z']/g, "")) });

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rnd = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
type V3 = [number, number, number];

/* ------------------------------------------------------------------ cameras */
// plates: 2400 plate px = 1920 display px (36 mm of sensor), shown at 0.8; Wd x Hd is the plate in display px
type CamJ = { w: number; h: number; frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
type Cam = { m: number[][]; f: number; plate: string; pos: V3; Wd: number; Hd: number };
const mkCam = (j: unknown, plate: string): Cam => {
  const J = j as CamJ, c = J.frames["1"], s = 1920 / 2400;
  return { m: c.m, f: (c.lens / c.sensor) * 1920, plate, pos: [c.m[0][3], c.m[1][3], c.m[2][3]], Wd: J.w * s, Hd: J.h * s };
};
const CAMS = {
  high: mkCam(camHigh, "a_high"), deep: mkCam(camDeep, "a_deep"), lurk: mkCam(camLurk, "a_lurk"),
  track: mkCam(camTrack, "a_track"), walk: mkCam(camWalk, "a_walk"), close: mkCam(camClose, "a_close"),
};
type ShotName = keyof typeof CAMS;
/** world point -> plate display px, pixels per metre at that depth, depth */
const proj = (c: Cam, p: V3) => {
  const m = c.m, d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const z = Math.max(0.03, -Z);
  return { x: c.Wd / 2 + (c.f * X) / z, y: c.Hd / 2 - (c.f * Y) / z, ppm: c.f / z, z };
};
const right = (c: Cam): V3 => { const r: V3 = [c.m[0][0], c.m[1][0], 0], l = Math.hypot(r[0], r[1]); return [r[0] / l, r[1] / l, 0]; };

/* ------------------------------------------------------------------ world (as in the style preview) */
const WATER_Z = -0.07;
const MOON_DIR: V3 = (() => { const v = [0.15, 0.94, 0.3], l = Math.hypot(...v); return v.map((a) => a / l) as V3; })();
const HERE = { x: 0.9, y: -2.0, z: 0.02 };   // where he stops (Part B's spot)
const EYES_B: V3 = [1.8, 1.55, -0.005];      // Part B's edge clump (drawn here too wherever it is in view)
const EYES_L: V3 = [0.42, 4.35, -0.005];     // the lurk in shot 3, out by the fishing stakes

/* a clump of tule stems standing in the shallows, with a natural gap in front of an eye point (seen from gapCam) */
type Stem = { bx: number; by: number; h: number; lx: number; ly: number; w0: number; ph: number; tuft: boolean; k: number };
const mkStems = (cx: number, cy: number, rx: number, ry: number, minY: number, eyes: V3, gapCam: Cam, n: number, gap: number, seed: number): Stem[] => {
  const out: Stem[] = [];
  const R = right(gapCam), ez = proj(gapCam, eyes).z;
  for (let i = seed; out.length < n && i < seed + 400; i++) {
    const a = rnd(i, 1) * 2 * Math.PI, r = Math.sqrt(rnd(i, 2));
    const bx = cx + Math.cos(a) * r * rx, by = cy + Math.sin(a) * r * ry;
    if (by < minY) continue;
    const lat = (bx - eyes[0]) * R[0] + (by - eyes[1]) * R[1];
    if (Math.abs(lat) < gap && proj(gapCam, [bx, by, 0]).z < ez + 0.05) continue;
    const h = 1.25 + 0.85 * rnd(i, 3), la = rnd(i, 4) * 2 * Math.PI, lean = (rnd(i, 5) < 0.8 ? 0.04 + 0.12 * rnd(i, 6) : 0.2 + 0.25 * rnd(i, 6)) * h;
    out.push({ bx, by, h, lx: Math.cos(la) * lean, ly: Math.sin(la) * lean, w0: 0.0055 + 0.0045 * rnd(i, 7), ph: rnd(i, 8) * 6.28, tuft: rnd(i, 9) < 0.4, k: i });
  }
  return out;
};
// exactly Part B's clump (same generator, same seed, same gap camera)
const STEMS_B = mkStems(1.8, 1.44, 0.34, 0.2, 1.14, EYES_B, mkCam(camEdge, "edge"), 32, 0.07, 0);
const STEMS_L = mkStems(EYES_L[0] + 0.05, EYES_L[1] + 0.12, 0.42, 0.26, -99, EYES_L, CAMS.lurk, 30, 0.11, 900);

/** stem points with the wind sway and a push (the head rising nudges the stems nearest the gap) */
const stemPts = (s: Stem, T: number, eyes: V3, R: V3, nudge: number, N = 9): V3[] => {
  const sway = (0.035 * Math.sin(T * 0.9 + s.ph) + 0.014 * Math.sin(T * 2.3 + s.ph * 1.7)) * (s.h / 1.6);
  const lat = (s.bx - eyes[0]) * R[0] + (s.by - eyes[1]) * R[1];
  const push = Math.sign(lat || 1) * 0.06 * Math.exp(-Math.abs(lat) / 0.16) * nudge;
  const pts: V3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, b = Math.pow(u, 1.6);
    pts.push([s.bx + s.lx * u * u + sway * b + R[0] * push * b, s.by + s.ly * u * u + R[1] * push * b, WATER_Z - 0.05 + (s.h + 0.05) * u]);
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
const Clump: React.FC<{ c: Cam; T: number; stems: Stem[]; eyes: V3; blur: number; split?: "far" | "near" | "all"; nudge?: number }> = ({ c, T, stems, eyes, blur, split = "all", nudge = 0 }) => {
  const R = right(c), ez = proj(c, eyes).z;
  const items = stems.map((s) => ({ s, z: proj(c, [s.bx, s.by, 0.3]).z }))
    .filter((o) => split === "all" || (split === "far" ? o.z >= ez : o.z < ez))
    .sort((a, b) => b.z - a.z);
  return <g filter={blur > 0.3 ? `url(#eblur${Math.round(blur)})` : undefined}>
    {items.map(({ s }) => {
      const pts = stemPts(s, T, eyes, R, nudge);
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

const Ripples: React.FC<{ c: Cam; T: number; at: V3; t0: number; n?: number; amp?: number; spd?: number; gap?: number }> = ({ c, T, at, t0, n = 3, amp = 1, spd = 0.42, gap = 0.16 }) => {
  const out: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const d = T - t0 - k * gap;
    if (d <= 0) continue;
    const r = 0.04 + spd * d, op = amp * 0.55 * Math.exp(-d / 0.9) * clamp01(d / 0.05);
    if (op < 0.01) continue;
    const pts = Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * 2 * Math.PI; const p = proj(c, [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, WATER_Z]); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; });
    const w = Math.max(1.2, 0.006 * proj(c, [at[0], at[1], WATER_Z]).ppm);
    out.push(<path key={k} d={`M${pts.join(" L")}`} stroke="#a8bde6" strokeWidth={w} fill="none" opacity={op} />);
    out.push(<path key={k + "d"} d={`M${pts.join(" L")}`} stroke="#000" strokeWidth={w * 1.6} fill="none" opacity={op * 0.5} transform={`translate(0,${w * 1.6})`} />);
  }
  return <g>{out}</g>;
};

/** the head breaking the surface: rise 0 = under, 1 = eyes clear of the water; ear tips first, then the eyes; blink 0..1 */
const Lurker: React.FC<{ c: Cam; T: number; at: V3; rise: number; blink: number; glow?: number }> = ({ c, T, at, rise, blink, glow = 1 }) => {
  if (rise <= 0.001) return null;
  const sink = (1 - rise) * 0.16;
  const R = right(c), wl = proj(c, [at[0], at[1], WATER_Z]);
  const E = (s: number): V3 => [at[0] + R[0] * 0.042 * s, at[1] + R[1] * 0.042 * s, at[2] - sink];
  const a = proj(c, E(-1)), b = proj(c, E(1)), hc = proj(c, [at[0], at[1], at[2] + 0.005 - sink]);
  const r = 0.017 * a.ppm, pp = hc.ppm;
  const eyeOn = clamp01((rise - 0.45) / 0.35);
  return <g>
    <clipPath id="abovewaterA"><rect x={-2000} y={-4000} width={6000} height={wl.y + 4000 + r * 0.25} /></clipPath>
    <g clipPath="url(#abovewaterA)">
      <path d={`M${hc.x - 0.1 * pp},${wl.y + 4} Q${hc.x - 0.1 * pp},${hc.y - 0.06 * pp} ${hc.x},${hc.y - 0.065 * pp} Q${hc.x + 0.1 * pp},${hc.y - 0.06 * pp} ${hc.x + 0.1 * pp},${wl.y + 4} Z`} fill="#020306" />
      {[-1, 1].map((sd) => <path key={sd} d={`M${hc.x + sd * 0.045 * pp},${hc.y - 0.05 * pp} L${hc.x + sd * 0.075 * pp},${hc.y - 0.15 * pp} L${hc.x + sd * 0.09 * pp},${hc.y - 0.035 * pp} Z`} fill="#020306" stroke={sd > 0 ? AHZ.rim : "none"} strokeWidth={1.5} strokeOpacity={0.6} />)}
      <path d={`M${hc.x + 0.03 * pp},${hc.y - 0.064 * pp} Q${hc.x + 0.085 * pp},${hc.y - 0.05 * pp} ${hc.x + 0.098 * pp},${hc.y - 0.005 * pp}`} stroke={AHZ.rim} strokeWidth={2} fill="none" opacity={0.6} />
      {eyeOn > 0 && <g opacity={eyeOn}>
        <GlowEye c={[a.x, a.y]} r={r} look={[-0.1, 0.15]} glow={1.4 * glow} lid={blink} />
        <GlowEye c={[b.x, b.y]} r={r} look={[-0.1, 0.15]} glow={1.4 * glow} lid={blink} />
      </g>}
    </g>
    {/* eyeshine reflections, broken by the ripple */}
    {eyeOn > 0 && [a, b].map((p, i) => [0, 1, 2, 3].map((k) => <path key={i + "r" + k} d={`M${p.x - r * 0.9 + k * 2 + Math.sin(T * 9 + k) * 3},${wl.y + (wl.y - p.y) + r * (0.6 + k * 0.7)} l${r * (1.8 - k * 0.3)},0`}
      stroke={AHZ.eye} strokeWidth={Math.max(1.5, r * (0.35 - k * 0.06))} opacity={(0.6 - k * 0.13) * eyeOn * (1 - blink * 0.8)} strokeLinecap="round" />))}
  </g>;
};

const Glints: React.FC<{ c: Cam; T: number; near?: number; amt?: number }> = ({ c, T, near = 1.0, amt = 1 }) => {
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
    if (p.x < -50 || p.x > c.Wd + 50 || p.y < 0 || p.y > c.Hd) continue;
    const drift = (rnd(j, 6) < 0.5 ? -1 : 1) * (0.03 + 0.04 * rnd(j, 8)) * p.ppm * u;
    const len = Math.min(70, (0.07 + 0.16 * rnd(j, 5)) * p.ppm);
    out.push(<rect key={i} x={p.x - len / 2 + drift} y={p.y - 1.5} width={len} height={Math.min(4, Math.max(2.5, 0.02 * p.ppm))} rx={1.5} fill="#e8f0ff" opacity={0.85 * k * amt} />);
  }
  return <g style={{ mixBlendMode: "screen" }}>{out}</g>;
};

const Mist: React.FC<{ c: Cam; T: number; id: string; amt?: number }> = ({ c, T, id, amt = 1 }) => {
  const C = c.pos, hz = proj(c, [C[0], C[1] + 80, WATER_Z]).y, edge = Math.min(c.Hd - 20, proj(c, [C[0], Math.max(C[1] + 1.2, 1.1), WATER_Z]).y);
  const span = c.Wd + 1400;
  return <g style={{ mixBlendMode: "screen" }}>
    <defs><radialGradient id={`mist-${id}`}><stop offset="0" stopColor="#a8b8e0" stopOpacity={0.5} /><stop offset="1" stopColor="#a8b8e0" stopOpacity={0} /></radialGradient></defs>
    {Array.from({ length: Math.round(14 * c.Wd / 1080) }, (_, i) => {
      const yy = hz + (edge - hz) * (0.05 + 0.8 * rnd(i, 1)) + 8 * Math.sin(T * 0.3 + i);
      const sp = 12 + 16 * rnd(i, 2);
      const xx = ((rnd(i, 3) * span + T * sp) % span) - 700;
      const rw = 300 + 380 * rnd(i, 4), rh = 30 + 70 * rnd(i, 5) * (0.4 + clamp01((yy - hz) / Math.max(1, edge - hz)));
      return <ellipse key={i} cx={xx} cy={yy} rx={rw} ry={rh} fill={`url(#mist-${id})`} opacity={amt * (0.25 + 0.2 * rnd(i, 6))} />;
    })}
    <ellipse cx={c.Wd / 2} cy={hz + 6} rx={900 * c.Wd / 1080} ry={34} fill={`url(#mist-${id})`} opacity={0.3 * amt} />
  </g>;
};

const MoonDamp: React.FC<{ c: Cam; id: string }> = ({ c, id }) => {
  const C = c.pos, p = proj(c, [C[0] + MOON_DIR[0] * 1000, C[1] + MOON_DIR[1] * 1000, C[2] - MOON_DIR[2] * 1000]);
  if (p.y > c.Hd + 300 || p.x < -300 || p.x > c.Wd + 300) return null;
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

/** out-of-focus tule stems right at the lens, in screen space (dx: their own parallax offset) */
type Fg = [number, number, number, number];
const FgStems: React.FC<{ T: number; clumps: Fg[]; dx: number; blur: number; id: string }> = ({ T, clumps, dx, blur, id }) => {
  const stems: React.ReactNode[] = [];
  clumps.forEach(([cx, n, hf, ln], ci) => {
    if (cx + dx < -500 || cx + dx > 1580) return;
    for (let j = 0; j < n; j++) {
      const k = ci * 10 + j, bx = cx + dx + (rnd(k, 1) - 0.5) * 150, by = 1990;
      const h = (700 + 700 * rnd(k, 2)) * hf, lean = (rnd(k, 3) - 0.5) * 200 + ln;
      const sw = (24 * Math.sin(T * (0.7 + 0.35 * rnd(k, 4)) + rnd(k, 5) * 6) + 9 * Math.sin(T * 1.7 + k)) * (h / 1000);
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

/** the fisherman lit by the moon: identical to the style preview's MoonLitHi */
const MoonLitHi: React.FC<{ id: string; x: number; y: number; ppm: number; pose: FPose; feet?: [number, number] }> = ({ id, x, y, ppm, pose, feet }) => {
  const sm2 = Math.max(0.6, ppm * 0.0035);
  return <g>
    <defs>
      <filter id={`lit-${id}`} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
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
      </filter>
      <filter id={`soft-${id}`} x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation={ppm * 0.03} /></filter>
      <linearGradient id={`sh-${id}`} x1={0} y1={0} x2={0} y2={1}><stop offset="0" stopColor="#000" stopOpacity={0.55} /><stop offset="1" stopColor="#000" stopOpacity={0} /></linearGradient>
    </defs>
    <g filter={`url(#soft-${id})`}>
      <path d={`M${x - 0.22 * ppm},${y - 0.01 * ppm} L${x + 0.2 * ppm},${y - 0.01 * ppm} L${x - 0.05 * ppm},${y + 0.75 * ppm} L${x - 0.55 * ppm},${y + 0.72 * ppm} Z`} fill={`url(#sh-${id})`} />
      <ellipse cx={x} cy={y + 0.005 * ppm} rx={0.34 * ppm} ry={0.045 * ppm} fill="#000" opacity={0.42} />
      {feet && feet.map((fx, i) => <ellipse key={i} cx={x + (fx + 0.05) * ppm} cy={y + 0.006 * ppm} rx={0.13 * ppm} ry={0.025 * ppm} fill="#000" opacity={0.5} />)}
    </g>
    <g filter={`url(#lit-${id})`}><Fisherman id={id} x={x} y={y} ppm={ppm} pose={pose} /></g>
  </g>;
};

/* ------------------------------------------------------------------ the fisherman's walk home */
// he walks +x along the bank (y = -2.0) at an easy pace, slows on "heard" and stops on the spot where Part B finds him
const W_V = 0.74, W_T0 = -6, W_T1 = 9.8, W_EASE = 0.8, STRIDE = 0.95;
const W_TOT = walk(W_T1 + 1, W_T0, W_T1, W_V, W_EASE).s;
// phase the stride so that at the stop the near foot is planted under him and the far foot is coming down (little settle)
const D0 = (((0.2 - W_TOT / STRIDE) % 1) + 1) % 1 * STRIDE;
const CRY = 9.9;   // the faint far cry starts in the mix
const fisher = (T: number): { pose: FPose; x: number } => {
  const W = walk(T, W_T0, W_T1, W_V, W_EASE);
  const x = HERE.x - (W_TOT - W.s);
  const blink = (at: number) => Math.abs(T - at) < 0.055;
  const alert = sm((T - 9.0) / 0.5);          // "heard...": he lifts his head, the tiredness goes
  const hear = sm((T - CRY) / 0.25);          // the cry: eyes snap toward the reeds
  const turn = 0.45 * sm((T - (CRY + 0.08)) / 0.45);
  return { x, pose: {
    dist: W.s + D0, walk: W.w, t: T,
    expr: T < 9.15 ? "tired" : T < CRY ? "neutral" : "wary",
    lookX: lerp(lerp(0.35, 0.55, alert), 0.8, hear), lookY: lerp(0.15, 0, alert),
    turn, tilt: lerp(lerp(2.5, 0, alert), -1.5, sm((T - CRY) / 0.6)), slump: lerp(lerp(0.5, 0, alert), 1.5, sm((T - CRY) / 0.6)),
    blink: blink(7.3) || blink(8.9),
  } };
};

/* ------------------------------------------------------------------ one shot */
type View = { z: number; cx: number; cy: number };
const Shot: React.FC<{ name: ShotName; T: number; v: View; children?: React.ReactNode; fg?: Fg[]; fgDx?: number; fgBlur?: number;
  him?: boolean; mist?: number; glint?: number; near?: number; clumpB?: number }> =
  ({ name, T, v, children, fg, fgDx = 0, fgBlur = 8, him = false, mist = 1, glint = 1, near = 1.0, clumpB }) => {
    const c = CAMS[name];
    const z = Math.max(1, v.z), hw = 540 / z, hh = 960 / z;
    const cx = Math.max(hw, Math.min(c.Wd - hw, v.cx)), cy = Math.max(hh, Math.min(c.Hd - hh, v.cy));
    const tf = `translate(540px,960px) scale(${z}) translate(${-cx}px,${-cy}px)`;
    const F = fisher(T);
    const feet = proj(c, [F.x, HERE.y, HERE.z]), head = proj(c, [F.x, HERE.y, HERE.z + 1.66]);
    const ppm = (feet.y - head.y) / 1.66;
    const zf = 1 + (z - 1) * 1.6;
    return <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#03050a" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: c.Wd, height: c.Hd, transformOrigin: "0 0", transform: tf }}>
        <Img src={staticFile(`ahuizotl/${c.plate}/f_0001.png`)} style={{ position: "absolute", left: 0, top: 0, width: c.Wd, height: c.Hd }} />
        <svg width={c.Wd} height={c.Hd} style={{ position: "absolute" }}>
          <defs>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((b) => <filter key={b} id={`eblur${b}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={b} /></filter>)}</defs>
          <MoonDamp c={c} id={name} />
          <Glints c={c} T={T} near={near} amt={glint} />
          <Mist c={c} T={T} id={name} amt={mist} />
          {clumpB !== undefined && <Clump c={c} T={T} stems={STEMS_B} eyes={EYES_B} blur={clumpB} />}
          {children}
          {him && <MoonLitHi id={`f-${name}`} x={feet.x} y={feet.y} ppm={ppm} pose={F.pose} feet={[-0.05, 0.1]} />}
        </svg>
      </div>
      {fg && <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "540px 960px", transform: `scale(${zf})` }}>
        <FgStems T={T} clumps={fg} dx={fgDx} blur={fgBlur} id={name} />
      </div>}
    </AbsoluteFill>;
  };

/* ------------------------------------------------------------------ Part A */
export const AhzPartA: React.FC<{ clean?: boolean }> = ({ clean }) => {
  const f = useCurrentFrame(), T = f / FPS;
  let shot: React.ReactNode;
  let dark = 0;
  if (f < CUT2) {
    // 1: high over the lake, a slow descending tilt from the moon over the mist down to the black water
    const c = CAMS.high, k = f / (CUT2 - 1), e = 0.7 * sm(k) + 0.3 * k;
    const z = lerp(1.0, 1.14, sm(k));
    shot = <Shot name="high" T={T} v={{ z, cx: c.Wd / 2 + lerp(-10, 12, k), cy: lerp(960 / z, c.Hd - 960 / z, e) }} mist={1.3} near={9}>
      <Ripples c={c} T={T} at={[2.3, 9.0, WATER_Z]} t0={1.7} n={3} amp={0.7} spd={0.6} gap={0.35} />
    </Shot>;
    dark = 1 - sm(f / 10);
  } else if (f < CUT3) {
    // 2: "deep water": low over the water, pushing into the dark surface; rings spread from something below
    const c = CAMS.deep, k = (f - CUT2) / (CUT3 - CUT2);
    const at: V3 = [2.75, 6.0, WATER_Z], a = proj(c, at);
    shot = <Shot name="deep" T={T} v={{ z: lerp(1.02, 1.24, sm(k) * 0.7 + 0.3 * k), cx: lerp(c.Wd / 2, a.x, k), cy: lerp(a.y - 120, a.y, k) }} near={3.5}>
      <Ripples c={c} T={T} at={at} t0={3.0} n={4} amp={0.9} spd={0.5} gap={0.3} />
      <Ripples c={c} T={T} at={[2.55, 5.4, WATER_Z]} t0={3.55} n={2} amp={0.5} spd={0.35} gap={0.3} />
    </Shot>;
    dark = 0.08 + 0.12 * k;
  } else if (f < CUT4) {
    // 3: "They called it the Ahuizotl.": ears and eyes rise among the reeds, hold on the name, blink, sink
    const c = CAMS.lurk, k = (f - CUT3) / (CUT4 - CUT3);
    const rise = sm((T - 4.3) / 0.55) * (1 - sm((T - 5.62) / 0.36));
    const bl = Math.max(0, 1 - Math.abs(T - 5.25) / 0.09);
    const a = proj(c, EYES_L);
    const nudge = Math.exp(-Math.max(0, T - 4.4) / 0.6) * (T > 4.3 ? 1 : 0) * Math.sin((T - 4.3) * 9) + (T > 5.62 ? 0.6 * Math.exp(-(T - 5.62) / 0.5) * Math.sin((T - 5.62) * 8) : 0);
    shot = <Shot name="lurk" T={T} v={{ z: lerp(1.04, 1.25, k), cx: lerp(a.x + 40, a.x, k), cy: lerp(a.y - 40, a.y + 20, k) }} near={2.5}>
      <Clump c={c} T={T} stems={STEMS_L} eyes={EYES_L} blur={0} split="far" nudge={nudge} />
      <Ripples c={c} T={T} at={EYES_L} t0={4.32} n={3} amp={0.6} spd={0.3} gap={0.25} />
      <Lurker c={c} T={T} at={EYES_L} rise={rise} blink={bl} />
      <Ripples c={c} T={T} at={EYES_L} t0={5.75} n={3} amp={0.8} spd={0.32} gap={0.2} />
      <Clump c={c} T={T} stems={STEMS_L} eyes={EYES_L} blur={1} split="near" nudge={nudge} />
    </Shot>;
    dark = 0.06;
  } else if (f < CUT6) {
    if (f < CUT5) {
      // 4: walking home along the lake: a side tracking pan with him
      const c = CAMS.track, k = (f - CUT4) / (CUT5 - CUT4);
      const p = proj(c, [fisher(T).x, HERE.y, 0.9]);
      const cx = p.x + 130 - 60 * k;
      shot = <Shot name="track" T={T} v={{ z: lerp(1.06, 1.12, k), cx, cy: p.y - 60 }} him clumpB={2}
        fg={[[-200, 5, 1.0, 60], [700, 4, 0.8, -40], [1600, 5, 1.1, 30], [2500, 4, 0.9, -60]]} fgDx={-(cx - proj(c, [fisher(CUT4 / FPS).x, HERE.y, 0.9]).x) * 1.5} fgBlur={10} />;
    } else {
      // 5: a lower, closer angle a little ahead of him; he slows on "heard"
      const c = CAMS.walk, k = (f - CUT5) / (CUT6 - CUT5);
      const p = proj(c, [fisher(T).x, HERE.y, 1.0]);
      const cx = p.x + 150 - 40 * k;
      shot = <Shot name="walk" T={T} v={{ z: lerp(1.04, 1.1, k), cx, cy: p.y + 150 }} him clumpB={1.5}
        fg={[[-150, 4, 0.9, 80], [1350, 5, 1.0, -60]]} fgDx={-(cx - proj(c, [fisher(CUT5 / FPS).x, HERE.y, 1.0]).x) * 1.5} fgBlur={10} />;
    }
  } else {
    // 6: "baby crying.": close on him; the faint cry, his eyes snap to the reeds, his head turns toward them
    const c = CAMS.close, k = (f - CUT6) / (AHZ_PART_A_FRAMES - CUT6);
    const h = proj(c, [HERE.x + 0.05, HERE.y, 1.45]);
    shot = <Shot name="close" T={T} v={{ z: lerp(1.03, 1.11, sm(k)), cx: h.x + lerp(170, 140, k), cy: h.y + 200 }} him clumpB={6} mist={0.8} />;
    dark = 0.04 + 0.06 * sm((T - CRY) / 0.5);
  }
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {shot}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(112,136,192,0) 0%, rgba(112,136,192,0.05) 55%, rgba(0,0,0,0.25) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dark }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.6) 100%)" }} />
      {!clean && <Subtitles words={WORDS} style={SUB} offset={0} />}
    </AbsoluteFill>
  );
};
