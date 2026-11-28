// The Ahuizotl, PART D (global frames 949-1366, mix 31.633-45.567 s): the final jumpscare and the ending.
//  1) FINAL JUMPSCARE (frames 0-44, the big hit of the mix): right after he is yanked toward the water, the Ahuizotl's
//     face (AhzFace, the approved design) bursts out of the black water at the lens and fills the frame in 5 frames,
//     the crying face tearing open into the needle-tooth scream, jaw working, eyeshine, spray, hard shake, a white
//     flash on the scream's peak, then a hard CUT TO BLACK on the audio cut (frame 45). No subtitles during the attack.
//  2) L10 "The water closed over him, and the lake went quiet." From black to the still moonlit water at the edge where
//     he knelt: his drag marks in the mud ending at the waterline, rings spreading and settling where he went under, a
//     few last bubbles, his folded net floating, the edge clump still. Slow drift. He is gone (no gore).
//  3) L11 "The Aztecs warned: if you hear a baby crying by the water at night, don't go to it. It isn't a baby."
//     a) the empty bank, wide, mist, a slow pull back from the reeds; b) from where he stood, the camera creeps down the
//     empty mud toward the reeds ("don't go to it"); c) long lens on the edge clump: on "It isn't a baby." two glowing
//     eyes rise out of the water in the gap and stare at the lens (the lurking pose, design panel 4); with the far cry
//     they blink and sink, and the picture fades to black by the last frame.
// Look, light, edge clump, glints, mist and subtitles follow StylePreview (AhzStylePreviewV2); the helpers are copied
// here so the shared file stays untouched. Everything is a pure function of the frame: a steady 30 fps.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import wordsJson from "../../stories/ahuizotl/final/words.json";
import camEdge from "../../stories/ahuizotl/sets/edge.json";
import camWide2 from "../../stories/ahuizotl/sets/wide2.json";
import camOts2 from "../../stories/ahuizotl/sets/ots2.json";
import camLakeD from "../../stories/ahuizotl/sets/lakeD.json";
import camReedsD from "../../stories/ahuizotl/sets/reedsD.json";
import { sm } from "./CharTest";
import { AHZ, AhzDefs, AhzFace, GlowEye } from "./creature";

const FPS = 30;
export const AHZ_PARTD_OFF = 31.633;
const OFF = AHZ_PARTD_OFF;
export const AHZ_PARTD_FRAMES = 418;
// cuts (part frames): scare | black->lake (L10) | wide bank | creeping down the bank | the reeds (eyes)
const CUT_BLACK = 45, CUT_WIDE = 142, CUT_OTS = 191, CUT_REEDS = 305;
const T_EYES = 42.2, T_BLINK = 43.85, T_SINK = 44.45, T_FADE = 44.85, T_END = 45.55;
const WORDS = (wordsJson as Word[]).filter((w) => w.s >= 32.6);
const SUB = defaultStyle("serious", { key: "#3DF0FF", pop: 0.45, y: 0.8, keyWords: ["water", "quiet", "aztecs", "crying", "night", "baby"] });

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
const rnd = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
type V3 = [number, number, number];

/* ------------------------------------------------------------------ cameras (as StylePreview) */
type CamJ = { w: number; h: number; frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
type Cam = { m: number[][]; f: number; plate: string; pos: V3 };
const mkCam = (j: unknown, plate: string): Cam => {
  const c = (j as CamJ).frames["1"];
  return { m: c.m, f: (c.lens / c.sensor) * 1920, plate, pos: [c.m[0][3], c.m[1][3], c.m[2][3]] };
};
const CAMS = { edge: mkCam(camEdge, "edge"), wide2: mkCam(camWide2, "wide2"), ots2: mkCam(camOts2, "ots2"), lakeD: mkCam(camLakeD, "lakeD"), reedsD: mkCam(camReedsD, "reedsD") };
type ShotName = keyof typeof CAMS;
const proj = (c: Cam, p: V3) => {
  const m = c.m, d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const z = Math.max(0.03, -Z);
  return { x: 540 + (c.f * X) / z, y: 960 - (c.f * Y) / z, ppm: c.f / z, z };
};
const right = (c: Cam): V3 => { const r: V3 = [c.m[0][0], c.m[1][0], 0], l = Math.hypot(r[0], r[1]); return [r[0] / l, r[1] / l, 0]; };

/* ------------------------------------------------------------------ world */
const WATER_Z = -0.07;
const MOON_DIR: V3 = (() => { const v = [0.15, 0.94, 0.3], l = Math.hypot(...v); return v.map((a) => a / l) as V3; })();
const EYES: V3 = [1.8, 1.55, -0.005];          // the gap in the edge clump (same spot as scare 1)
const UNDER: V3 = [1.52, 1.3, WATER_Z];
/** in the long-lens shot the eyes rise just left of the scare-1 gap, where the stems leave a clear line to the lens */
const WATCH: V3 = [1.75, 1.6, -0.005];         // where he went under, just off his kneeling spot at the edge
/** the mud bank height (tools/blender/ahuizotl_lake.py shore_z) */
const shoreZ = (x: number, y: number) => (y < 0.55 ? 0 : -0.32 * Math.pow(Math.min(1, (y - 0.55) / 1.4), 1.3)) + 0.025 * Math.sin(x * 1.7 + y * 0.6) + 0.015 * Math.sin(x * 4.1 - y * 2.3);

/** wind: almost dead after he is gone ("the lake went quiet"), a faint breeze comes back for the warning */
const wind = (T: number) => T < 35.5 ? lerp(0.2, 0.12, sm((T - 33.2) / 2)) : lerp(0.12, 0.45, sm((T - 36.4) / 2.5));
/** something moving in the clump: the wash of his going under, and the creature rising behind the gap */
const rustle = (T: number, ph: number) => {
  let v = 0;
  const d1 = T - 33.15, d2 = T - T_EYES + 0.15, d3 = T - T_SINK;
  if (d1 > 0) v += Math.exp(-d1 / 0.9) * Math.sin(d1 * 9 + ph) * 0.5;
  if (d2 > 0) v += Math.exp(-d2 / 0.5) * Math.sin(d2 * 20 + ph) * 0.35;
  if (d3 > 0) v += Math.exp(-d3 / 0.5) * Math.sin(d3 * 16 + ph) * 0.25;
  return v;
};

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
const stemPts = (s: Stem, T: number, N = 9): V3[] => {
  const wd = wind(T);
  const sway = (0.035 * Math.sin(T * 0.9 + s.ph) + 0.014 * Math.sin(T * 2.3 + s.ph * 1.7)) * wd * (s.h / 1.6);
  const rs = rustle(T, s.ph) * 0.07 * (0.5 + rnd(s.k, 11));
  const pts: V3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, b = Math.pow(u, 1.6);
    pts.push([s.bx + s.lx * u * u + (sway + rs) * b, s.by + s.ly * u * u + 0.3 * rs * b, WATER_Z - 0.05 + (s.h + 0.05) * u]);
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
const EdgeClump: React.FC<{ c: Cam; T: number; blur: number; split?: "far" | "near" | "all"; at?: V3 }> = ({ c, T, blur, split = "all", at = EYES }) => {
  const ez = proj(c, at).z;
  const items = STEMS.map((s) => ({ s, z: proj(c, [s.bx, s.by, 0.3]).z }))
    .filter((o) => split === "all" || (split === "far" ? o.z >= ez : o.z < ez))
    .sort((a, b) => b.z - a.z);
  return <g filter={blur > 0.3 ? `url(#eblur${Math.round(blur)})` : undefined}>
    {items.map(({ s }) => {
      const pts = stemPts(s, T);
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

/** rings on the water: [start time, amplitude] pulses, slower and wider than the preview's */
const Rings: React.FC<{ c: Cam; T: number; at: V3; pulses: [number, number][]; speed?: number; decay?: number }> = ({ c, T, at, pulses, speed = 0.35, decay = 1.4 }) => {
  const out: React.ReactNode[] = [];
  const base = proj(c, [at[0], at[1], WATER_Z]);
  pulses.forEach(([t0, amp], k) => {
    const d = T - t0;
    if (d <= 0) return;
    const r = 0.05 + speed * d, op = amp * 0.5 * Math.exp(-d / decay) * clamp01(d / 0.08);
    if (op < 0.01) return;
    const pts = Array.from({ length: 61 }, (_, i) => { const a = (i / 60) * 2 * Math.PI; const p = proj(c, [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, WATER_Z]); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; });
    const w = Math.max(1.2, 0.007 * base.ppm);
    out.push(<path key={k + "d"} d={`M${pts.join(" L")}`} stroke="#000" strokeWidth={w * 1.8} fill="none" opacity={op * 0.5} transform={`translate(0,${w * 1.6})`} />);
    out.push(<path key={k} d={`M${pts.join(" L")}`} stroke="#a8bde6" strokeWidth={w} fill="none" opacity={op} />);
  });
  return <g>{out}</g>;
};

/** last bubbles coming up where he went under (fewer and fewer) */
const Bubbles: React.FC<{ c: Cam; T: number }> = ({ c, T }) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const t0 = 33.15 + 2.6 * Math.pow(rnd(i, 1), 1.6), d = T - t0;
    if (d < 0 || d > 0.5) continue;
    const p = proj(c, [UNDER[0] + (rnd(i, 2) - 0.5) * 0.25, UNDER[1] + (rnd(i, 3) - 0.5) * 0.18, WATER_Z]);
    const r = (0.012 + 0.018 * rnd(i, 4)) * p.ppm * (d < 0.38 ? 1 : 1 + (d - 0.38) * 4), op = d < 0.38 ? 0.8 : Math.max(0, 0.8 - (d - 0.38) * 7);
    out.push(<g key={i} opacity={op}>
      <ellipse cx={p.x} cy={p.y - r * 0.3} rx={r} ry={r * 0.55} fill="#0b111c" stroke="#b8c8ea" strokeWidth={Math.max(1, r * 0.12)} />
      <ellipse cx={p.x - r * 0.35} cy={p.y - r * 0.5} rx={r * 0.22} ry={r * 0.12} fill="#e8f0ff" />
    </g>);
  }
  return <g>{out}</g>;
};

/** his folded net, slipped off his shoulder, floating half sunk and drifting slowly out, a couple of wooden floats */
const NET0: V3 = [1.22, 1.3, WATER_Z];
const netPos = (T: number): V3 => { const d = Math.max(0, T - 33.1); return [NET0[0] + 0.012 * d, NET0[1] + 0.018 * d, WATER_Z]; };
const NetFloat: React.FC<{ c: Cam; T: number; id: string }> = ({ c, T, id }) => {
  const P0 = netPos(T), ang = 0.4 + 0.02 * (T - 33), bob = 0.006 * Math.sin(T * 2.1);
  const W = (u: number, v: number): V3 => { const ca = Math.cos(ang), sa = Math.sin(ang); return [P0[0] + u * ca - v * sa, P0[1] + u * sa + v * ca, WATER_Z + 0.008 + bob]; };
  const outline: [number, number][] = Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * 2 * Math.PI; const rr = 1 + 0.18 * Math.sin(a * 3 + 1) + 0.1 * Math.sin(a * 5); return [Math.cos(a) * 0.28 * rr, Math.sin(a) * 0.16 * rr]; });
  const pts = outline.map(([u, v]) => proj(c, W(u, v)));
  const d = `M${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")} Z`;
  const mesh: string[] = [];
  for (let k = -6; k <= 6; k++) {
    const a1 = proj(c, W(-0.35, k * 0.05 - 0.35)), b1 = proj(c, W(0.35, k * 0.05 + 0.35));
    const a2 = proj(c, W(-0.35, k * 0.05 + 0.35)), b2 = proj(c, W(0.35, k * 0.05 - 0.35));
    mesh.push(`M${a1.x},${a1.y} L${b1.x},${b1.y} M${a2.x},${a2.y} L${b2.x},${b2.y}`);
  }
  const ctr = proj(c, W(0, 0));
  const fl = [[-0.17, 0.05], [0.06, -0.09], [0.2, 0.06]].map(([u, v]) => proj(c, W(u, v)));
  return <g>
    <defs><clipPath id={`netc-${id}`}><path d={d} /></clipPath></defs>
    <path d={d} fill="#000" opacity={0.35} transform={`translate(0,${0.01 * ctr.ppm})`} />
    <path d={d} fill="#2e261b" />
    <g clipPath={`url(#netc-${id})`}><path d={mesh.join(" ")} stroke="#120e09" strokeWidth={Math.max(1, 0.006 * ctr.ppm)} fill="none" opacity={0.9} />
      {/* the far half of the bundle is already under: darker, bluer */}
      <ellipse cx={ctr.x} cy={ctr.y - 0.06 * ctr.ppm} rx={0.3 * ctr.ppm} ry={0.08 * ctr.ppm} fill="#0d1420" opacity={0.55} /></g>
    <path d={d} stroke="#8a9cc4" strokeWidth={Math.max(1, 0.004 * ctr.ppm)} fill="none" opacity={0.35} />
    {fl.map((p, i) => <g key={i}><ellipse cx={p.x} cy={p.y} rx={0.035 * p.ppm} ry={0.016 * p.ppm} fill="#5e4a2c" stroke="#1a1209" strokeWidth={1} />
      <ellipse cx={p.x - 0.008 * p.ppm} cy={p.y - 0.006 * p.ppm} rx={0.015 * p.ppm} ry={0.005 * p.ppm} fill="#c8d4f0" opacity={0.35} /></g>)}
  </g>;
};

/** the drag marks in the mud: two grooves from where his knees were to the waterline, ending in a churned lip */
const DragMarks: React.FC<{ c: Cam }> = ({ c }) => {
  const groove = (x0: number, wid: number, k: number) => {
    const L: string[] = [], R: string[] = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, x = x0 + 0.06 * u + 0.015 * Math.sin(u * 7 + k), y = lerp(0.42, 0.98, u), z = shoreZ(x, y) + 0.004;
      const a = proj(c, [x - wid * (0.6 + 0.4 * u), y, z]), b = proj(c, [x + wid * (0.6 + 0.4 * u), y, z]);
      L.push(`${a.x.toFixed(1)},${a.y.toFixed(1)}`); R.push(`${b.x.toFixed(1)},${b.y.toFixed(1)}`);
    }
    return `M${L.join(" L")} L${R.reverse().join(" L")} Z`;
  };
  return <g>
    {[[1.36, 0.05, 1], [1.6, 0.045, 2]].map(([x, w, k]) => <g key={k}>
      <path d={groove(x, w, k)} fill="#030405" opacity={0.6} />
      <path d={groove(x + w * 0.9, w * 0.25, k)} fill="#7d8db2" opacity={0.18} />
    </g>)}
  </g>;
};

/** moon glints, mist, moon damp: as StylePreview */
const Glints: React.FC<{ c: Cam; T: number; near?: number; calm?: number }> = ({ c, T, near = 1.0, calm = 1 }) => {
  const out: React.ReactNode[] = [];
  const C = c.pos;
  for (let i = 0; i < 90; i++) {
    const sp = (1.1 + 1.6 * rnd(i, 3)) * calm, ph = T * sp + rnd(i, 4) * 6.28, n = Math.floor(ph / (2 * Math.PI)), u = ph / (2 * Math.PI) - n;
    if (u > 0.5) continue;
    const k = Math.sin(u * 2 * Math.PI) ** 2, j = i * 37 + n * 101;
    const yw = C[1] + near + 45 * rnd(j, 1) ** 2.2;
    if (yw < 1.05) continue;
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
const MoonDamp: React.FC<{ c: Cam; id: string }> = ({ c, id }) => {
  const C = c.pos, p = proj(c, [C[0] + MOON_DIR[0] * 1000, C[1] + MOON_DIR[1] * 1000, C[2] - MOON_DIR[2] * 1000]);
  if (p.y > 2200 || p.x < -300 || p.x > 1380) return null;
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
const FgStems: React.FC<{ T: number; clumps: Fg[]; blur: number; id: string }> = ({ T, clumps, blur, id }) => {
  const stems: React.ReactNode[] = [];
  const wd = wind(T);
  clumps.forEach(([cx, n, hf, ln], ci) => {
    for (let j = 0; j < n; j++) {
      const k = ci * 10 + j, bx = cx + (rnd(k, 1) - 0.5) * 150, by = 1990;
      const h = (700 + 700 * rnd(k, 2)) * hf, lean = (rnd(k, 3) - 0.5) * 200 + ln;
      const sw = (24 * Math.sin(T * (0.7 + 0.35 * rnd(k, 4)) + rnd(k, 5) * 6) + 9 * Math.sin(T * 1.7 + k)) * Math.max(0.3, wd) * (h / 1000);
      const tx = bx + lean + sw, ty = by - h, mx = bx + lean * 0.45 + sw * 0.35, my = by - h * 0.55, w0 = 16 + 16 * rnd(k, 6);
      stems.push(<path key={k} d={`M${bx - w0},${by} Q${mx - w0 * 0.6},${my} ${tx},${ty} Q${mx + w0 * 0.6},${my} ${bx + w0},${by} Z`} fill="#04060a" />);
      stems.push(<path key={k + "r"} d={`M${bx + w0 * 0.7},${by} Q${mx + w0 * 0.5},${my} ${tx},${ty}`} stroke="#6c80b0" strokeWidth={2.4} fill="none" opacity={0.4} />);
      if (rnd(k, 8) < 0.45) stems.push(<ellipse key={k + "t"} cx={tx + 4} cy={ty + 18} rx={10} ry={22} transform={`rotate(${15 + sw * 0.3},${tx + 4},${ty + 18})`} fill="#1a120c" />);
    }
  });
  return <svg width={1080} height={1920} style={{ position: "absolute" }}>
    <defs><filter id={`fg-${id}`} x="-20%" y="-10%" width="140%" height="140%"><feGaussianBlur stdDeviation={blur} /></filter></defs>
    <g filter={`url(#fg-${id})`}>{stems}</g>
  </svg>;
};

/** the eyes rising in the gap of the edge clump: the lurking pose (design panel 4): the black wet dome of the head and
 *  the ear tips barely above the water, two eyeshine eyes staring at the lens; they blink once and sink */
const Watcher: React.FC<{ c: Cam; T: number; at: V3 }> = ({ c, T, at: EYES }) => {
  const d = T - T_EYES;
  if (d < 0 || T > T_SINK + 0.7) return null;
  const rise = easeOut(d / 0.6), sink = sm((T - T_SINK) / 0.55);
  const dz = -0.1 * (1 - rise) - 0.12 * sink;
  const R = right(c), wl = proj(c, [EYES[0], EYES[1], WATER_Z]);
  const E = (s: number): V3 => [EYES[0] + R[0] * 0.042 * s, EYES[1] + R[1] * 0.042 * s, EYES[2] + dz];
  const a = proj(c, E(-1)), b = proj(c, E(1)), hc = proj(c, [EYES[0], EYES[1], EYES[2] + 0.005 + dz]);
  const r = 0.017 * a.ppm, pp = hc.ppm;
  const bl = T - T_BLINK, lid = bl > 0 && bl < 0.2 ? Math.sin((bl / 0.2) * Math.PI) : 0;
  const glow = (1.6 + 0.15 * Math.sin(T * 9)) * (1 - 0.8 * lid);
  const look: [number, number] = [0.05 * Math.sin(T * 0.7), 0.05];
  return <g>
    <clipPath id="abovewaterD"><rect x={0} y={-2000} width={1080} height={wl.y + 2000 + r * 0.25} /></clipPath>
    <g clipPath="url(#abovewaterD)">
      <path d={`M${hc.x - 0.1 * pp},${wl.y + 4} Q${hc.x - 0.1 * pp},${hc.y - 0.06 * pp} ${hc.x},${hc.y - 0.065 * pp} Q${hc.x + 0.1 * pp},${hc.y - 0.06 * pp} ${hc.x + 0.1 * pp},${wl.y + 4} Z`} fill="#020306" />
      {[-1, 1].map((sd) => <path key={sd} d={`M${hc.x + sd * 0.045 * pp},${hc.y - 0.05 * pp} L${hc.x + sd * 0.075 * pp},${hc.y - 0.15 * pp} L${hc.x + sd * 0.09 * pp},${hc.y - 0.035 * pp} Z`} fill="#020306" stroke={sd > 0 ? AHZ.rim : "none"} strokeWidth={1.5} strokeOpacity={0.6} />)}
      <path d={`M${hc.x + 0.03 * pp},${hc.y - 0.064 * pp} Q${hc.x + 0.085 * pp},${hc.y - 0.05 * pp} ${hc.x + 0.098 * pp},${hc.y - 0.005 * pp}`} stroke={AHZ.rim} strokeWidth={2} fill="none" opacity={0.6} />
      {/* water running off the dome as it rises */}
      {d < 1.2 && [-0.06, -0.02, 0.03, 0.07].map((u, i) => <path key={"w" + i} d={`M${hc.x + u * pp},${hc.y - 0.05 * pp} l0,${0.05 * pp * (0.5 + rnd(i, 3))}`} stroke={AHZ.water} strokeWidth={1.6} opacity={0.4 * (1 - d / 1.2)} />)}
      <GlowEye c={[a.x, a.y]} r={r} look={look} glow={glow} lid={lid} />
      <GlowEye c={[b.x, b.y]} r={r} look={look} glow={glow} lid={lid} />
    </g>
    {[a, b].map((p, i) => [0, 1, 2, 3].map((k) => <path key={i + "r" + k} d={`M${p.x - r * 0.9 + k * 2 + Math.sin(T * 6 + k) * 2},${wl.y + (wl.y - p.y) + r * (0.6 + k * 0.7)} l${r * (1.8 - k * 0.3)},0`}
      stroke={AHZ.eye} strokeWidth={Math.max(1.5, r * (0.35 - k * 0.06))} opacity={(0.55 - k * 0.12) * (1 - 0.8 * lid) * clamp01((wl.y - p.y) / (r * 2))} strokeLinecap="round" />))}
  </g>;
};

/* ------------------------------------------------------------------ one shot (StylePreview's Shot, without him) */
type Move = { z: number; ax: number; ay: number; px: number; py: number };
const Shot: React.FC<{ name: ShotName; T: number; mv: Move; children?: React.ReactNode; fg?: Fg[]; fgBlur?: number; clumpBlur?: number; mist?: number; edge?: boolean; calm?: number; edgeAt?: V3; under?: React.ReactNode }> =
  ({ name, T, mv, children, fg, fgBlur = 8, clumpBlur = 0, mist = 1, edge = false, calm = 1, edgeAt = EYES, under }) => {
    const c = CAMS[name];
    const px = Math.max(-(1080 - mv.ax) * (mv.z - 1), Math.min(mv.ax * (mv.z - 1), mv.px));
    const py = Math.max(-(1920 - mv.ay) * (mv.z - 1), Math.min(mv.ay * (mv.z - 1), mv.py));
    const tf = `translate(${mv.ax + px}px,${mv.ay + py}px) scale(${mv.z}) translate(${-mv.ax}px,${-mv.ay}px)`;
    const zf = 1 + (mv.z - 1) * 1.6;
    const tff = `translate(${mv.ax + px * 1.6}px,${mv.ay + py * 1.6}px) scale(${zf}) translate(${-mv.ax}px,${-mv.ay}px)`;
    return <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#03050a" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: tf }}>
        <Img src={staticFile(`ahuizotl/${c.plate}/f_0001.png`)} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((b) => <filter key={b} id={`eblur${b}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={b} /></filter>)}</defs>
          <MoonDamp c={c} id={name} />
          {under}
          <Glints c={c} T={T} near={edge ? 1.3 : 1.0} calm={calm} />
          <Mist c={c} T={T} id={name} amt={mist} />
          <DragMarks c={c} />
          <NetFloat c={c} T={T} id={name} />
          <EdgeClump c={c} T={T} blur={clumpBlur} split={edge ? "far" : "all"} at={edgeAt} />
          {children}
          {edge && <EdgeClump c={c} T={T} blur={clumpBlur} split="near" at={edgeAt} />}
        </svg>
      </div>
      {fg && <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: tff }}>
        <FgStems T={T} clumps={fg} blur={fgBlur} id={name} />
      </div>}
    </AbsoluteFill>;
  };

/* ------------------------------------------------------------------ the jumpscare */
const Spray: React.FC<{ f: number; waterY: number }> = ({ f, waterY }) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 170; i++) {
    const born = rnd(i, 1) < 0.7 ? 3 * rnd(i, 2) : 3 + 14 * rnd(i, 2), age = (f - born) / FPS;
    if (age < 0 || age > 0.9) continue;
    const a = -Math.PI / 2 + (rnd(i, 3) - 0.5) * 2.6, v = 900 + 2600 * rnd(i, 4);
    const x0 = 540 + (rnd(i, 5) - 0.5) * 760, y0 = waterY - 20;
    const x = x0 + Math.cos(a) * v * age * (1 + age * 2), y = y0 + Math.sin(a) * v * age + 2400 * age * age;
    const r = (2.5 + 7 * rnd(i, 6)) * (1 + age * 3.5), st = Math.min(6, 1.5 + v * 0.0016);
    const ang = (Math.atan2(Math.sin(a) * v + 4800 * age, Math.cos(a) * v) * 180) / Math.PI;
    out.push(<ellipse key={i} cx={x} cy={y} rx={r * st} ry={r} transform={`rotate(${ang},${x},${y})`} fill="#cfe2ff" opacity={(0.35 + 0.35 * rnd(i, 9)) * (1 - age / 0.9)} />);
  }
  return <g>{out}</g>;
};
const Jumpscare: React.FC<{ f: number; T: number }> = ({ f, T }) => {
  const d = f / FPS;
  const lunge = easeOut(f / 5);                                       // 5 frames to fill the frame
  const surge = sm((f - 31) / 3);                                      // the scream's peak in the mix (frame ~32)
  const s = lerp(0.75, 2.25, lunge) + 0.016 * Math.max(0, f - 5) + 0.25 * surge;
  const cy = lerp(1330, 860, lunge) - 40 * surge;
  const open = f < 2 ? 0.12 : f < 7 ? lerp(0.12, 0.95, sm((f - 2) / 5)) : Math.min(1, 0.8 + 0.18 * Math.sin(d * 26) + 0.2 * surge);
  const shake = f < 3 ? 6 : 34 * Math.exp(-(d - 0.1) / 0.5) + 14 * surge * Math.exp(-(f - 32) / 8);
  const sx = shake * Math.sin(d * 97) + 3 * Math.sin(d * 211), sy = shake * Math.cos(d * 83);
  const waterY = lerp(1420, 2250, easeOut(f / 6));
  const c = CAMS.edge, a = proj(c, EYES);
  // the broken surface: a smooth swell heaped up around where it breaks through (frames 0-8), flattening as it drops away
  const heap = f < 9 ? 1 - f / 9 : 0;
  const surf = Array.from({ length: 55 }, (_, i) => { const x = i * 20, u = (x - 540) / 420;
    return `L${x},${(waterY - heap * 150 * Math.exp(-u * u) - 14 * Math.sin(x * 0.02 + d * 18) - 8 * Math.sin(x * 0.047 - d * 11)).toFixed(1)}`; }).join(" ");
  return <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
    <div style={{ position: "absolute", inset: 0, transform: `translate(${sx * 0.6}px,${sy * 0.6}px)` }}>
      {/* the black water at the edge, very dark, pushed in hard */}
      <div style={{ position: "absolute", inset: 0, filter: "brightness(0.42) saturate(0.8)" }}>
        <Shot name="edge" T={T} mv={{ z: 1.18 + 0.05 * lunge, ax: a.x, ay: a.y, px: 0, py: 0 }} clumpBlur={4} mist={0.6} />
      </div>
    </div>
    <svg width={1080} height={1920} style={{ position: "absolute", transform: `translate(${sx}px,${sy}px)` }}>
      <AhzDefs />
      <defs>
        <linearGradient id="dwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1220" stopOpacity={0.95} /><stop offset="1" stopColor="#020308" /></linearGradient>
        <radialGradient id="facelight" cx="50%" cy="35%" r="60%"><stop offset="0" stopColor="#9fb4e8" stopOpacity={0.22} /><stop offset="1" stopColor="#9fb4e8" stopOpacity={0} /></radialGradient>
        <filter id="spblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={1.6} /></filter>
      </defs>
      {/* water pouring off it as it breaks the surface */}
      <g style={{ filter: "brightness(1.35)" }}>
        <AhzFace cx={540} cy={cy} s={s} open={open} t={T * 2.5} glow={1.5 + 0.3 * Math.sin(d * 40)} look={[0, 0.15]} />
      </g>
      <rect width={1080} height={1920} fill="url(#facelight)" style={{ mixBlendMode: "screen" }} />
      {/* the surface it bursts through: a churned dark band with a foam crown, dropping out of frame as it comes at us */}
      <path d={`M0,${waterY} ${surf} L1080,${waterY} L1080,1920 L0,1920 Z`} fill="url(#dwater)" />
      <path d={`M0,${waterY} ${surf}`} stroke="#dce8ff" strokeWidth={10} fill="none" opacity={0.55} />
      <g filter="url(#spblur)"><Spray f={f} waterY={Math.min(waterY, 1600)} /></g>
      {/* a few big drops right on the lens */}
      {[0, 1, 2, 3].map((i) => { const b = 2 + i * 6 + 4 * rnd(i, 1), age = f - b; if (age < 0 || age > 10) return null;
        const x = 140 + 800 * rnd(i, 2), y = 300 + 1200 * rnd(i, 3) + age * 40, r = 60 + 80 * rnd(i, 4);
        return <circle key={i} cx={x} cy={y} r={r} fill="#cfe2ff" opacity={0.18 * (1 - age / 10)} filter="url(#spblur)" />; })}
    </svg>
  </AbsoluteFill>;
};

/* ------------------------------------------------------------------ the part */
export const AhzPartD: React.FC = () => {
  const f = useCurrentFrame(), T = OFF + f / FPS;
  let shot: React.ReactNode = null;
  let dark = 0, flash = 0, subs = true;
  if (f < CUT_BLACK) {
    shot = <Jumpscare f={f} T={T} />;
    // white kick on the hit, a full white frame on the scream's peak, then the hard cut to black
    flash = f === 0 ? 0.3 : f === 1 ? 0.15 : f === 32 ? 0.92 : f === 33 ? 0.45 : f === 34 ? 0.15 : 0;
    subs = false;
  } else if (f < CUT_WIDE) {
    // L10: from black onto the still water where he went under; rings spread and settle; a slow drift and push
    const k = (f - CUT_BLACK) / (CUT_WIDE - CUT_BLACK);
    const a = proj(CAMS.lakeD, UNDER);
    const pulses: [number, number][] = [[33.0, 1.2], [33.25, 1.0], [33.55, 0.9], [33.95, 0.7], [34.5, 0.5], [35.1, 0.3]];
    const shine = <g><defs><radialGradient id="mudshine"><stop offset="0" stopColor="#0c0f16" stopOpacity={0.75} /><stop offset="0.6" stopColor="#0c0f16" stopOpacity={0.5} /><stop offset="1" stopColor="#0c0f16" stopOpacity={0} /></radialGradient></defs>
      <ellipse cx={290} cy={1295} rx={190} ry={80} fill="url(#mudshine)" /></g>;
    shot = <Shot name="lakeD" T={T} calm={0.6} under={shine} mv={{ z: lerp(1.16, 1.06, 0.4 * k + 0.6 * sm(k)), ax: a.x, ay: a.y, px: lerp(24, -24, k), py: lerp(-10, 10, k) }} clumpBlur={1} mist={0.9}>
      <Rings c={CAMS.lakeD} T={T} at={UNDER} pulses={pulses} />
      <Rings c={CAMS.lakeD} T={T} at={netPos(T)} pulses={[[33.1, 0.5], [34.3, 0.3], [35.6, 0.2]]} speed={0.25} decay={1.1} />
      <Bubbles c={CAMS.lakeD} T={T} />
    </Shot>;
    dark = 1 - 0.94 * sm((f - CUT_BLACK) / 16);   // fade up from black over half a second
  } else if (f < CUT_OTS) {
    // L11 a: the empty bank, wide, mist on the water; a slow pull back from the reed bed (nobody there any more)
    const k = (f - CUT_WIDE) / (CUT_OTS - CUT_WIDE);
    const a = proj(CAMS.wide2, [2.0, 1.6, 0.6]);
    shot = <Shot name="wide2" T={T} mv={{ z: lerp(1.15, 1.04, 0.6 * k + 0.4 * sm(k)), ax: a.x, ay: a.y, px: lerp(0, -16, k), py: 0 }} mist={1.35} fg={[[-40, 5, 1.1, 60], [1150, 4, 0.9, -80]]} fgBlur={9}>
      <Rings c={CAMS.wide2} T={T} at={netPos(T)} pulses={[[36.0, 0.3], [37.4, 0.25]]} speed={0.25} decay={1.1} />
    </Shot>;
    dark = 0.08 * (1 - sm(k * 3));
  } else if (f < CUT_REEDS) {
    // L11 b: from where he stood, the camera creeps down the empty mud toward the reeds (someone else, drawn to it)
    const k = (f - CUT_OTS) / (CUT_REEDS - CUT_OTS);
    const a = proj(CAMS.ots2, [1.8, 1.45, 0.6]);
    const step = 3 * Math.sin(k * Math.PI * 6);
    shot = <Shot name="ots2" T={T} mv={{ z: lerp(1.02, 1.2, k), ax: a.x, ay: a.y, px: lerp(-14, 14, k), py: step }} clumpBlur={1.5} mist={1.2}>
      <Rings c={CAMS.ots2} T={T} at={netPos(T)} pulses={[[38.4, 0.3], [40.2, 0.25]]} speed={0.25} decay={1.1} />
    </Shot>;
    dark = 0.1 + 0.06 * k;
  } else {
    // L11 c: long lens on the edge clump; on "It isn't a baby." the eyes rise in the gap and stare; the far cry: they
    // blink, sink, and the picture fades to black
    const k = (f - CUT_REEDS) / (AHZ_PARTD_FRAMES - CUT_REEDS);
    const a = proj(CAMS.reedsD, WATCH), kk = 0.35 * k + 0.65 * sm(k * 1.1);
    shot = <Shot name="reedsD" T={T} mv={{ z: lerp(1.03, 1.22, kk), ax: a.x, ay: a.y, px: lerp(30, 0, kk), py: lerp(-10, -110, kk) }} clumpBlur={0} mist={0.9} edge edgeAt={WATCH}>
      <Rings c={CAMS.reedsD} T={T} at={[WATCH[0], WATCH[1], WATER_Z]} pulses={[[T_EYES, 0.8], [T_EYES + 0.3, 0.6], [T_SINK + 0.1, 0.8], [T_SINK + 0.4, 0.5]]} speed={0.3} decay={1.0} />
      <Watcher c={CAMS.reedsD} T={T} at={WATCH} />
    </Shot>;
    dark = 0.1 + 0.08 * sm((T - 43.2) / 1.0) + 0.82 * sm((T - T_FADE) / (T_END - T_FADE));
  }
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {shot}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(112,136,192,0) 0%, rgba(112,136,192,0.05) 55%, rgba(0,0,0,0.25) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: Math.min(1, dark) }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill style={{ backgroundColor: "#dfe8ff", opacity: flash }} />
      {subs && f >= 50 && <Subtitles words={WORDS} style={SUB} offset={-OFF} />}
    </AbsoluteFill>
  );
};
