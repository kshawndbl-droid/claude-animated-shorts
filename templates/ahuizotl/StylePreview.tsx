// Style preview for "The Ahuizotl": narration lines 3-5 ("Out in the reeds. Alone. In the dark. / He called out, and
// the crying stopped. / Then it started again. Closer to the water.") with scare 1, cut from the approved mix.
// Six shots on five full-res Blender plates (tools/blender/ahuizotl_lake.py shots wide/ots/med/close/edge, portrait
// 1350x2400 with a fixed field of view, shown at 1080x1920, so a 2D push-in of up to 1.25x never upscales a plate).
// Every moving thing is drawn per frame from time on top of the still plates, so playback is a steady 30 fps:
// the fisherman (approved rig, lit by the moon), the clump of tule reeds at the water's edge in front of him (drawn
// in world space and projected through each shot's camera, so it is the same clump in every shot and it can sway,
// jerk and part), moon glints on the water, drifting mist, out-of-focus foreground stems, ripples.
// Story logic: he stops on the bank and looks at the reeds where the crying came from (wide push-in, then over his
// shoulder onto the dark reeds); he leans in and calls; on "stopped" the wind dies and everything holds still on his
// uneasy face; at 16.53 s (frame 180, the sting in the mix) the crying snaps back close: hard cut low at the waterline,
// the edge clump right in front of him jerks apart, a ripple runs and two glowing eyes flash in the gap and sink; cut
// back to him: he steps back half a step, startled, staring at the reeds that are still moving.
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import wordsJson from "../../stories/ahuizotl/final/words.json";
import camWide from "../../stories/ahuizotl/sets/wide.json";
import camOts from "../../stories/ahuizotl/sets/ots.json";
import camMed from "../../stories/ahuizotl/sets/med.json";
import camClose from "../../stories/ahuizotl/sets/close.json";
import camEdge from "../../stories/ahuizotl/sets/edge.json";
import camReact from "../../stories/ahuizotl/sets/react.json";
import camWide2 from "../../stories/ahuizotl/sets/wide2.json";
import camOts2 from "../../stories/ahuizotl/sets/ots2.json";
import camMed2 from "../../stories/ahuizotl/sets/med2.json";
import camClose2 from "../../stories/ahuizotl/sets/close2.json";
import camReact2 from "../../stories/ahuizotl/sets/react2.json";
import { sm, walk } from "./CharTest";
import { FPose, Fisherman, reach } from "./fisherman";
import { AHZ, GlowEye } from "./creature";

const FPS = 30;
/** the clip starts 10.53 s into the approved mix, so the scare sting (16.53 s) lands exactly on frame 180 */
export const AHZ_PREVIEW_OFF = 10.53;
const OFF = AHZ_PREVIEW_OFF;
export const AHZ_PREVIEW_FRAMES = 279;   // 9.3 s: to 19.83 s, half a second after "...Closer to the water."
const SCARE_F = 180, SCARE_T = OFF + SCARE_F / FPS;   // 16.53
// cuts (frame numbers): wide | over the shoulder | medium (calls) | close (stopped) | the edge (scare) | medium (steps back)
const CUT_B = 45, CUT_C = 92, CUT_D = 135, CUT_F = 222;
const WORDS = (wordsJson as Word[]).filter((w) => w.s >= OFF - 0.05 && w.s < 19.3);
const SUB = defaultStyle("serious", { key: "#3DF0FF", pop: 0.45, y: 0.8, keyWords: ["reeds.", "alone.", "dark.", "crying", "stopped.", "closer", "water."].map((w) => w.replace(/[^a-z']/g, "")) });

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
const rnd = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
type V3 = [number, number, number];

/* ------------------------------------------------------------------ cameras */
type CamJ = { w: number; h: number; frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
type Cam = { m: number[][]; f: number; plate: string; pos: V3 };
const mkCam = (j: unknown, plate: string): Cam => {
  const c = (j as CamJ).frames["1"];
  // fixed field of view: the sensor height maps to the frame height, so in 1080x1920 display space f = lens/sensor*1920
  return { m: c.m, f: (c.lens / c.sensor) * 1920, plate, pos: [c.m[0][3], c.m[1][3], c.m[2][3]] };
};
const CAMS = {
  wide: mkCam(camWide, "wide"), ots: mkCam(camOts, "ots"), med: mkCam(camMed, "med"), close: mkCam(camClose, "close"), edge: mkCam(camEdge, "edge"), react: mkCam(camReact, "react"),
  wide2: mkCam(camWide2, "wide2"), ots2: mkCam(camOts2, "ots2"), med2: mkCam(camMed2, "med2"), close2: mkCam(camClose2, "close2"), react2: mkCam(camReact2, "react2"),
};
type ShotName = keyof typeof CAMS;
/** world point -> 1080x1920 display px, pixels per metre at that depth, depth */
const proj = (c: Cam, p: V3) => {
  const m = c.m, d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const z = Math.max(0.03, -Z);
  return { x: 540 + (c.f * X) / z, y: 960 - (c.f * Y) / z, ppm: c.f / z, z };
};
/** the camera's horizontal right vector in the world */
const right = (c: Cam): V3 => { const r: V3 = [c.m[0][0], c.m[1][0], 0], l = Math.hypot(r[0], r[1]); return [r[0] / l, r[1] / l, 0]; };

/* ------------------------------------------------------------------ world */
const WATER_Z = -0.07;
const MOON_DIR: V3 = (() => { const v = [0.15, 0.94, 0.3], l = Math.hypot(...v); return v.map((a) => a / l) as V3; })();
type Here = { x: number; y: number; z: number };
/** where he stands on the bank, facing +x (toward the reeds). v1: right above the waterline (y ~ 1.0); v2 (user
 *  feedback "too close to the water"): about 3 m further up the bank, open mud between him and the reeds, leaving room
 *  for his walk down to the edge on line 6 */
const HERES: Record<number, Here> = { 1: { x: 0.9, y: 0.25, z: 0.02 }, 2: { x: 0.9, y: -2.0, z: 0.02 } };
const EYES: V3 = [1.8, 1.55, -0.005];        // where the eyes show, in the gap of the edge clump

/** wind: steady breeze; it dies on "stopped" (the world holds its breath); a little comes back after the scare */
const wind = (T: number) => T < 15.0 ? 1 : T < SCARE_T ? lerp(1, 0.1, sm((T - 15.0) / 0.5)) : lerp(0.1, 0.45, sm((T - SCARE_T - 0.5) / 1.5));

/** the scare's push on the reeds: snaps open within two frames, holds open while the eyes show, then springs back
 *  and wobbles out */
const part = (T: number) => {
  const d = T - SCARE_T;
  if (d < 0) return 0;
  const rise = 1 - Math.exp(-d / 0.022);
  return rise * (d < 0.32 ? 1 : Math.exp(-(d - 0.32) / 0.42) * Math.cos(2 * Math.PI * 1.7 * (d - 0.32)));
};
/** something still moving inside the clump after the scare (and a second rustle on "Closer to the water") */
const rustle = (T: number, ph: number) => {
  const d = T - SCARE_T, d2 = T - 18.3;
  let v = 0;
  if (d > 0) v += Math.exp(-d / 0.35) * Math.sin(d * 34 + ph) * 0.6 + Math.exp(-d / 2.2) * Math.sin(d * 11 + ph * 2) * 0.18;
  if (d2 > 0) v += Math.exp(-d2 / 0.5) * Math.sin(d2 * 22 + ph) * 0.35;
  return v;
};

/* the edge clump: tule stems standing in the shallows right at the water's edge in front of him */
type Stem = { bx: number; by: number; h: number; lx: number; ly: number; w0: number; ph: number; tuft: boolean; k: number };
const STEMS: Stem[] = (() => {
  const out: Stem[] = [];
  const ce = mkCam(camEdge, "edge"), R = right(ce), ez = proj(ce, EYES).z;
  for (let i = 0; out.length < 32 && i < 400; i++) {
    const a = rnd(i, 1) * 2 * Math.PI, r = Math.sqrt(rnd(i, 2));
    const bx = 1.8 + Math.cos(a) * r * 0.34, by = 1.44 + Math.sin(a) * r * 0.2;
    if (by < 1.14) continue;
    // a natural gap in front of where the eyes will show (seen from the waterline camera)
    const lat = (bx - EYES[0]) * R[0] + (by - EYES[1]) * R[1];
    if (Math.abs(lat) < 0.07 && proj(ce, [bx, by, 0]).z < ez + 0.05) continue;
    const h = 1.25 + 0.85 * rnd(i, 3), la = rnd(i, 4) * 2 * Math.PI, lean = (rnd(i, 5) < 0.8 ? 0.04 + 0.12 * rnd(i, 6) : 0.2 + 0.25 * rnd(i, 6)) * h;
    out.push({ bx, by, h, lx: Math.cos(la) * lean, ly: Math.sin(la) * lean, w0: 0.0055 + 0.0045 * rnd(i, 7), ph: rnd(i, 8) * 6.28, tuft: rnd(i, 9) < 0.4, k: i });
  }
  return out;
})();

/** one stem's points along its length (u = 0 at the water, 1 at the tip), with the wind sway and the scare push */
const stemPts = (s: Stem, T: number, R: V3, N = 9): V3[] => {
  const wd = wind(T);
  const sway = (0.035 * Math.sin(T * 0.9 + s.ph) + 0.014 * Math.sin(T * 2.3 + s.ph * 1.7)) * wd * (s.h / 1.6);
  // parting: stems on either side of the line of sight to the eyes are thrown outward, the nearest ones hardest
  const lat = (s.bx - EYES[0]) * R[0] + (s.by - EYES[1]) * R[1];
  const pk = part(T), push = Math.sign(lat || 1) * 0.32 * Math.exp(-Math.abs(lat) / 0.16) * pk;
  const rs = rustle(T, s.ph) * 0.07 * (0.5 + rnd(s.k, 11));
  const pts: V3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, b = Math.pow(u, 1.6);
    const dx = s.lx * u * u + (sway + rs) * b + R[0] * push * b, dy = s.ly * u * u + R[1] * push * b + 0.3 * rs * b;
    pts.push([s.bx + dx, s.by + dy, WATER_Z - 0.05 + (s.h + 0.05) * u]);
  }
  return pts;
};
/** a tapered stem outline in screen space from projected centre points */
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

const EdgeClump: React.FC<{ c: Cam; T: number; blur: number; split?: "far" | "near" | "all" }> = ({ c, T, blur, split = "all" }) => {
  const R = right(c), ez = proj(c, EYES).z;
  const items = STEMS.map((s) => ({ s, z: proj(c, [s.bx, s.by, 0.3]).z }))
    .filter((o) => split === "all" || (split === "far" ? o.z >= ez : o.z < ez))
    .sort((a, b) => b.z - a.z);
  return <g filter={blur > 0.3 ? `url(#eblur${Math.round(blur)})` : undefined}>
    {items.map(({ s }) => {
      const pts = stemPts(s, T, R);
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

/** expanding rings on the water around a world point */
const Ripples: React.FC<{ c: Cam; T: number; at: V3; t0: number; n?: number; amp?: number }> = ({ c, T, at, t0, n = 3, amp = 1 }) => {
  const out: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const d = T - t0 - k * 0.16;
    if (d <= 0) continue;
    const r = 0.04 + 0.42 * d, op = amp * 0.55 * Math.exp(-d / 0.9) * clamp01(d / 0.05);
    if (op < 0.01) continue;
    const pts = Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * 2 * Math.PI; const p = proj(c, [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, WATER_Z]); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; });
    const w = Math.max(1.2, 0.006 * proj(c, [at[0], at[1], WATER_Z]).ppm);
    out.push(<path key={k} d={`M${pts.join(" L")}`} stroke="#a8bde6" strokeWidth={w} fill="none" opacity={op} />);
    out.push(<path key={k + "d"} d={`M${pts.join(" L")}`} stroke="#000" strokeWidth={w * 1.6} fill="none" opacity={op * 0.5} transform={`translate(0,${w * 1.6})`} />);
  }
  return <g>{out}</g>;
};

/** the eyes in the gap: eyeshine as in the design's "lurking" panel; on for a few frames, then they sink and are gone */
const Lurker: React.FC<{ c: Cam; T: number }> = ({ c, T }) => {
  const d = T - SCARE_T;
  if (d < 0.02 || d > 0.46) return null;
  const sink = sm((d - 0.3) / 0.14) * 0.07, on = clamp01((d - 0.02) / 0.04);
  const R = right(c), wl = proj(c, [EYES[0], EYES[1], WATER_Z]);
  const E = (s: number): V3 => [EYES[0] + R[0] * 0.042 * s, EYES[1] + R[1] * 0.042 * s, EYES[2] - sink];
  const a = proj(c, E(-1)), b = proj(c, E(1)), hc = proj(c, [EYES[0], EYES[1], EYES[2] + 0.005 - sink]);
  const r = 0.017 * a.ppm, pp = hc.ppm;
  return <g opacity={on * (1 - sm((d - 0.38) / 0.08))}>
    <clipPath id="abovewater"><rect x={0} y={-2000} width={1080} height={wl.y + 2000 + r * 0.25} /></clipPath>
    <g clipPath="url(#abovewater)">
      {/* the top of the head: a black wet dome with ear tips, only its moonlit edge reads */}
      <path d={`M${hc.x - 0.1 * pp},${wl.y + 4} Q${hc.x - 0.1 * pp},${hc.y - 0.06 * pp} ${hc.x},${hc.y - 0.065 * pp} Q${hc.x + 0.1 * pp},${hc.y - 0.06 * pp} ${hc.x + 0.1 * pp},${wl.y + 4} Z`} fill="#020306" />
      {[-1, 1].map((sd) => <path key={sd} d={`M${hc.x + sd * 0.045 * pp},${hc.y - 0.05 * pp} L${hc.x + sd * 0.075 * pp},${hc.y - 0.15 * pp} L${hc.x + sd * 0.09 * pp},${hc.y - 0.035 * pp} Z`} fill="#020306" stroke={sd > 0 ? AHZ.rim : "none"} strokeWidth={1.5} strokeOpacity={0.6} />)}
      <path d={`M${hc.x + 0.03 * pp},${hc.y - 0.064 * pp} Q${hc.x + 0.085 * pp},${hc.y - 0.05 * pp} ${hc.x + 0.098 * pp},${hc.y - 0.005 * pp}`} stroke={AHZ.rim} strokeWidth={2} fill="none" opacity={0.6} />
      <GlowEye c={[a.x, a.y]} r={r} look={[0.15, 0.1]} glow={1.5} />
      <GlowEye c={[b.x, b.y]} r={r} look={[0.15, 0.1]} glow={1.5} />
    </g>
    {/* their reflections, broken by the ripple */}
    {[a, b].map((p, i) => [0, 1, 2, 3].map((k) => <path key={i + "r" + k} d={`M${p.x - r * 0.9 + k * 2 + Math.sin(T * 40 + k) * 3},${wl.y + (wl.y - p.y) + r * (0.6 + k * 0.7)} l${r * (1.8 - k * 0.3)},0`}
      stroke={AHZ.eye} strokeWidth={Math.max(1.5, r * (0.35 - k * 0.06))} opacity={0.6 - k * 0.13} strokeLinecap="round" />))}
  </g>;
};

/** moon glints: short bright dashes along the moon's path on the water, each twinkling on its own slow cycle */
const Glints: React.FC<{ c: Cam; T: number; near?: number }> = ({ c, T, near = 1.0 }) => {
  const out: React.ReactNode[] = [];
  const C = c.pos;
  for (let i = 0; i < 90; i++) {
    const sp = 1.1 + 1.6 * rnd(i, 3), ph = T * sp + rnd(i, 4) * 6.28, n = Math.floor(ph / (2 * Math.PI)), u = ph / (2 * Math.PI) - n;
    if (u > 0.5) continue;
    const k = Math.sin(u * 2 * Math.PI) ** 2, j = i * 37 + n * 101;
    const yw = C[1] + near + 45 * rnd(j, 1) ** 2.2;
    if (yw < 1.05) continue;   // only on the water
    const spread = 0.12 + 0.045 * (yw - C[1]);
    const xw = C[0] + (yw - C[1]) * (MOON_DIR[0] / MOON_DIR[1]) + (rnd(j, 2) - 0.5) * 2 * spread * (0.4 + rnd(j, 7));
    const p = proj(c, [xw, yw, WATER_Z]);
    if (p.x < -50 || p.x > 1130 || p.y < 0 || p.y > 1920) continue;
    const drift = (rnd(j, 6) < 0.5 ? -1 : 1) * (0.03 + 0.04 * rnd(j, 8)) * p.ppm * u;
    const len = (0.07 + 0.16 * rnd(j, 5)) * p.ppm;
    out.push(<rect key={i} x={p.x - len / 2 + drift} y={p.y - 1.5} width={len} height={Math.max(2.5, 0.02 * p.ppm)} rx={1.5} fill="#e8f0ff" opacity={0.85 * k} />);
  }
  return <g style={{ mixBlendMode: "screen" }}>{out}</g>;
};

/** low mist drifting over the water: big soft blobs between the far shore and the near water, slow and steady */
const Mist: React.FC<{ c: Cam; T: number; id: string; amt?: number }> = ({ c, T, id, amt = 1 }) => {
  const C = c.pos, hz = proj(c, [C[0], C[1] + 80, WATER_Z]).y, edge = Math.min(1900, proj(c, [C[0], Math.max(C[1] + 1.2, 1.1), WATER_Z]).y);
  return <g style={{ mixBlendMode: "screen" }}>
    <defs><radialGradient id={`mist-${id}`}><stop offset="0" stopColor="#a8b8e0" stopOpacity={0.5} /><stop offset="1" stopColor="#a8b8e0" stopOpacity={0} /></radialGradient></defs>
    {Array.from({ length: 14 }, (_, i) => {
      const yy = hz + (edge - hz) * (0.05 + 0.8 * rnd(i, 1)) + 8 * Math.sin(T * 0.3 + i);
      const sp = 12 + 16 * rnd(i, 2), span = 1080 + 1400;
      const xx = ((rnd(i, 3) * span + T * sp) % span) - 700;
      const rw = 300 + 380 * rnd(i, 4), rh = 30 + 70 * rnd(i, 5) * (0.4 + clamp01((yy - hz) / Math.max(1, edge - hz)));
      return <ellipse key={i} cx={xx} cy={yy} rx={rw} ry={rh} fill={`url(#mist-${id})`} opacity={amt * (0.25 + 0.2 * rnd(i, 6))} />;
    })}
    <ellipse cx={540} cy={hz + 6} rx={900} ry={34} fill={`url(#mist-${id})`} opacity={0.3 * amt} />
  </g>;
};

/** the plate's mirror image of the moon in the near water is a hard white disc that reads as a lamp at the waterline
 *  (CharTest damps it the same way): cover the disc with the tone of the water round it and leave a soft glow; the 2D
 *  glints carry the shimmer there */
const MoonDamp: React.FC<{ c: Cam; id: string }> = ({ c, id }) => {
  const C = c.pos, p = proj(c, [C[0] + MOON_DIR[0] * 1000, C[1] + MOON_DIR[1] * 1000, C[2] - MOON_DIR[2] * 1000]);
  if (p.y > 2200 || p.x < -300 || p.x > 1380) return null;
  // only where the mirrored ray actually meets the water (from far up the bank it lands on the mud: nothing to cover)
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

/** out-of-focus tule stems right at the lens (screen space; they move with more parallax than the plate) */
type Fg = [number, number, number, number];   // x px, stems, height factor, side lean
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

/* ------------------------------------------------------------------ the fisherman per shot */
/** the fisherman lit by the moon: the same light as CharTest's MoonLit (pillow-shaded from his own blurred silhouette,
 *  cold key and rim from the moon up ahead, dim cool fill, contact shadows, long shadow toward the lens), with the light
 *  map smoothed a touch: at close-up sizes the 8-bit blurred alpha otherwise shows as contour bands on the cloth */
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

/** cupped hand raised beside his mouth, a little in front of the face (wrist target relative to the shoulder) */
const CALL_ARM = reach([0, 0], [0.215, 0.035]);
const ARM_REST: [number, number] = [4, 13], ARM_REST_F: [number, number] = [3, 12];
const mixA = (a: [number, number], b: [number, number], k: number): [number, number] => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
/** his pose and where he stands, from the absolute time T */
const fisher = (T: number, HERE: Here): { pose: FPose; x: number } => {
  const blink = (at: number) => Math.abs(T - at) < 0.055;
  const f = Math.round((T - OFF) * FPS);
  if (f < CUT_B) {   // stopped on the bank, looking out at the reeds where the crying is
    const turn = 0.45 + 0.25 * sm((T - 11.1) / 0.6);
    return { x: HERE.x, pose: { t: T, expr: "wary", lookX: 0.8 + 0.2 * sm((T - 11.0) / 0.3), turn, tilt: -1.5, slump: 1.5, blink: blink(11.75) } };
  }
  if (f < CUT_C) {   // over his shoulder: he is turned away into the dark, leaning a little toward it
    return { x: HERE.x, pose: { t: T, expr: "wary", lookX: 1, turn: 0.95, tilt: -2 + 1.5 * sm((T - 12.4) / 1.0), slump: 2.5 + 1.0 * sm((T - 12.1) / 1.2), breath: 0.8 } };
  }
  if (f < CUT_D) {   // he leans in and calls out, a hand up by his mouth; then lowers it and listens
    const up = sm((T - 13.6) / 0.24), down = sm((T - 14.45) / 0.45);
    const call = CALL_ARM;
    const near = mixA(mixA(ARM_REST, call, up), [8, 34], down);
    return { x: HERE.x, pose: {
      t: T, expr: T > 13.72 && T < 14.42 ? "scared" : "wary", lookX: 1, lookY: -0.2, turn: 0.3 - 0.15 * up + 0.1 * down,
      slump: 1.5 + 6.5 * up - 4.5 * down, tilt: -4 * up + 3 * down, armNear: near, armFar: mixA(ARM_REST_F, [10, 22], up), breath: 1.3,
    } };
  }
  if (f < SCARE_F) {   // "...the crying stopped.": he holds still; only his eyes move
    const look = 0.95 - 0.55 * sm((T - 15.55) / 0.25) + 0.6 * sm((T - 16.05) / 0.3);
    return { x: HERE.x, pose: { t: T, expr: "worried", lookX: look, lookY: 0.1, turn: 0.3, tilt: 1 - 2 * sm((T - 15.4) / 1.0), slump: 2.5, armNear: [8, 30], armFar: [5, 18], breath: 0.25, blink: blink(15.85) } };
  }
  // after the scare: one step back (the front foot swings back, the other stays planted), arms come up, he stares
  const t0 = OFF + CUT_F / FPS + 0.03, t1 = t0 + 0.62, D = 0.456;
  const S = walk(T, t0, t1, 1, 0.22), Sfull = walk(t1 + 1, t0, t1, 1, 0.22).s;
  const s = (S.s / Sfull) * D;
  const k = sm((T - t0) / 0.28);
  return { x: HERE.x - s, pose: {
    t: T, dist: 0.08 * 0.95 - s, walk: 1, expr: "scared", lookX: 1, lookY: 0.35, turn: 0.15, tilt: 2 * k,
    slump: -4.5 * sm((T - t0) / 0.3) * (1 - 0.5 * sm((T - t1) / 0.6)) + 0.6 * Math.sin(T * 1.6),
    armNear: mixA([12, 34], [20, 104], k), armFar: mixA([8, 26], [13, 80], k), blink: false,
  } };
};

/* ------------------------------------------------------------------ one shot */
type Move = { z: number; ax: number; ay: number; px: number; py: number };
const Shot: React.FC<{ name: ShotName; T: number; mv: Move; children?: React.ReactNode; fg?: Fg[]; fgBlur?: number; clumpBlur?: number;
  him?: "lit" | "silhouette" | null; mist?: number; edge?: boolean; here: Here }> =
  ({ name, T, mv, children, fg, fgBlur = 8, clumpBlur = 0, him = "lit", mist = 1, edge = false, here: HERE }) => {
    const c = CAMS[name];
    // keep the plate covering the frame: clamp the pan to what the zoom allows
    const px = Math.max(-(1080 - mv.ax) * (mv.z - 1), Math.min(mv.ax * (mv.z - 1), mv.px));
    const py = Math.max(-(1920 - mv.ay) * (mv.z - 1), Math.min(mv.ay * (mv.z - 1), mv.py));
    const tf = `translate(${mv.ax + px}px,${mv.ay + py}px) scale(${mv.z}) translate(${-mv.ax}px,${-mv.ay}px)`;
    const zf = 1 + (mv.z - 1) * 1.6;
    const tff = `translate(${mv.ax + px * 1.6}px,${mv.ay + py * 1.6}px) scale(${zf}) translate(${-mv.ax}px,${-mv.ay}px)`;
    const F = fisher(T, HERE);
    const feet = proj(c, [F.x, HERE.y, HERE.z]), head = proj(c, [F.x, HERE.y, HERE.z + 1.66]);
    const ppm = (feet.y - head.y) / 1.66;
    return <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#03050a" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: tf }}>
        <Img src={staticFile(`ahuizotl/${c.plate}/f_0001.png`)} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((b) => <filter key={b} id={`eblur${b}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={b} /></filter>)}
            <filter id={`sil-${name}`} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="0.32 0 0 0 0.005  0 0.34 0 0 0.008  0 0 0.42 0 0.02  0 0 0 1 0" result="d" />
              <feGaussianBlur in="d" stdDeviation={5} />
            </filter>
          </defs>
          <MoonDamp c={c} id={name} />
          <Glints c={c} T={T} near={edge ? 1.3 : 1.0} />
          <Mist c={c} T={T} id={name} amt={mist} />
          <EdgeClump c={c} T={T} blur={clumpBlur} split={edge ? "far" : "all"} />
          {edge && children}
          {edge && <EdgeClump c={c} T={T} blur={clumpBlur} split="near" />}
          {!edge && children}
          {him === "lit" && <MoonLitHi id={`f-${name}`} x={feet.x} y={feet.y} ppm={ppm} pose={F.pose} feet={[-0.05, 0.1]} />}
          {him === "silhouette" && <g filter={`url(#sil-${name})`}><MoonLitHi id={`f-${name}`} x={feet.x} y={feet.y} ppm={ppm} pose={F.pose} /></g>}
        </svg>
      </div>
      {fg && <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: tff }}>
        <FgStems T={T} clumps={fg} dx={0} blur={fgBlur} id={name} />
      </div>}
    </AbsoluteFill>;
  };

/* ------------------------------------------------------------------ the preview */
export const AhzStylePreview: React.FC<{ clean?: boolean; v?: number }> = ({ clean, v = 1 }) => {
  const HERE = HERES[v];
  // v2 uses its own plates for every shot with him in it; the scare shot at the waterline is shared
  const n = (s: "wide" | "ots" | "med" | "close" | "react"): ShotName => (v === 2 ? `${s}2` : s) as ShotName;
  const f = useCurrentFrame(), t = f / FPS, T = t + OFF;
  let shot: React.ReactNode;
  let dark = 0, flash = 0;
  if (f < CUT_B) {
    // wide: slow push-in on him and the reeds he is looking at
    const k = sm(f / CUT_B) * 0.6 + 0.4 * (f / CUT_B);
    const h = proj(CAMS[n("wide")], [HERE.x + 0.3, HERE.y + 0.6, 1.0]);
    shot = <Shot name={n("wide")} here={HERE} T={T} mv={{ z: lerp(1.02, v === 2 ? 1.2 : 1.13, k), ax: h.x, ay: h.y, px: lerp(0, -18, k), py: 0 }} fg={[[-40, 5, 1.1, 60], [1150, 4, 0.9, -80]]} fgBlur={9} />;
  } else if (f < CUT_C) {
    // over his shoulder onto the dark reeds: a slow lateral drift and push
    const k = (f - CUT_B) / (CUT_C - CUT_B);
    const a = proj(CAMS[n("ots")], v === 2 ? [1.9, 1.5, 0.9] : [2.5, 1.9, 0.9]);
    shot = <Shot name={n("ots")} here={HERE} T={T} mv={{ z: lerp(1.05, 1.14, k), ax: a.x, ay: a.y, px: lerp(30, -30, 0.5 * k + 0.5 * sm(k)), py: lerp(-6, 12, k) }} him="silhouette" clumpBlur={1.5} />;
    dark = 0.08;
  } else if (f < CUT_D) {
    // medium: he leans in and calls
    const k = (f - CUT_C) / (CUT_D - CUT_C);
    const a = proj(CAMS[n("med")], [HERE.x + 0.15, HERE.y, 1.25]);
    shot = <Shot name={n("med")} here={HERE} T={T} mv={{ z: lerp(1.03, 1.1, k), ax: a.x, ay: a.y, px: 0, py: 0 }} fg={[[1160, 5, 1.0, -120]]} clumpBlur={1} />;
  } else if (f < SCARE_F) {
    // close: "stopped." everything holds; a very slow drift on his uneasy face, the night closing in a little
    const k = (f - CUT_D) / (SCARE_F - CUT_D);
    const a = proj(CAMS[n("close")], [HERE.x + 0.08, HERE.y, 1.5]);
    shot = <Shot name={n("close")} here={HERE} T={T} mv={{ z: lerp(1.04, 1.12, k), ax: a.x, ay: a.y, px: lerp(10, -10, k), py: lerp(-8, 8, k) }} clumpBlur={7} mist={0.8} />;
    dark = 0.16 * sm(k * 1.3);
  } else if (f < CUT_F) {
    // SCARE 1: hard cut low at the waterline, snap-zoom into the gap, the reeds jerk apart, the eyes, a shake
    const d = T - SCARE_T;
    const a = proj(CAMS.edge, EYES);
    const z = lerp(1.0, 1.2, easeOut(d / 0.13)) + 0.035 * sm((d - 0.2) / 1.2);
    const sh = Math.exp(-d / 0.2), sx = 16 * sh * Math.sin(d * 71), sy = 11 * sh * Math.sin(d * 53 + 1.3);
    shot = <Shot name="edge" here={HERE} T={T} mv={{ z, ax: a.x, ay: a.y, px: sx, py: sy }} him={null} edge>
      <Ripples c={CAMS.edge} T={T} at={[EYES[0], EYES[1], WATER_Z]} t0={SCARE_T} n={3} amp={0.8} />
      <Ripples c={CAMS.edge} T={T} at={[EYES[0], EYES[1], WATER_Z]} t0={SCARE_T + 0.36} n={2} amp={1} />
      <Lurker c={CAMS.edge} T={T} />
    </Shot>;
    flash = 0.18 * Math.exp(-d / 0.05);
  } else {
    // back on him: he steps back, startled, staring at the reeds that are still moving
    const k = (f - CUT_F) / (AHZ_PREVIEW_FRAMES - CUT_F);
    const d = T - (OFF + CUT_F / FPS);
    const a = proj(CAMS[n("react")], [HERE.x - 0.1, HERE.y, 0.9]);
    const sh = Math.exp(-d / 0.25), sx = 6 * sh * Math.sin(d * 47), sy = 4 * sh * Math.sin(d * 39 + 0.7);
    shot = <Shot name={n("react")} here={HERE} T={T} mv={{ z: 1.1 - 0.035 * easeOut(k * 1.6) - 0.045 * k, ax: a.x, ay: a.y, px: sx + (v === 2 ? lerp(-28, 28, k) : lerp(-14, 14, k)), py: sy + (v === 2 ? lerp(6, -6, k) : 0) }} fg={[[1160, 5, 1.0, -120]]} clumpBlur={1}>
      <Ripples c={CAMS[n("react")]} T={T} at={[EYES[0], EYES[1], WATER_Z]} t0={SCARE_T} n={3} amp={0.8} />
      <Ripples c={CAMS[n("react")]} T={T} at={[1.9, 1.45, WATER_Z]} t0={18.3} n={2} amp={0.7} />
    </Shot>;
    dark = 0.06;
  }
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {!clean && <Audio src={staticFile("ahuizotl/preview/preview_mix.wav")} />}
      {shot}
      {/* grade: a cold moon wash from the top, the darkening "held breath", a vignette, the cold kick of the sting */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(112,136,192,0) 0%, rgba(112,136,192,0.05) 55%, rgba(0,0,0,0.25) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: dark }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: "#cfdcff", opacity: flash, mixBlendMode: "screen" }} />
      {!clean && <Subtitles words={WORDS} style={SUB} offset={-OFF} />}
    </AbsoluteFill>
  );
};

/** v2: the same span and scare, with him standing a few metres up the bank */
export const AhzStylePreviewV2: React.FC = () => <AhzStylePreview v={2} />;
