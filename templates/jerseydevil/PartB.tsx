// "The Jersey Devil", Part B: story 12.80 to 36.50 s (711 frames), video only. Same pipeline as the Hidebehind:
// still Blender plates (tools/blender/jerseydevil_set.py, one still per shot, fire rendered hi + lo and cross-faded per
// frame for a living firelight flicker) with slow 2.5D pushes/pans, the 2D cast drawn through the same camera
// (cam json), and 2D living elements (flames, smoke, dust, soot, sparks, embers).
//  B1 ext1 12.80-15.20  the shack in the pines; he walks to his door and goes in (line 3)
//  B2 in1  15.20-17.80  inside, warming his hands at the fire
//  B3 in1  17.80-20.85  THUD on the roof: dust from the rafters, he freezes, looks up; hoof steps (line 4)
//  B4 in3  20.85-24.05  scare 1: a winged shadow sweeps across the window (21.42) (line 5)
//  B5 in4  24.05-26.35  the scraping moves across the rafters to the chimney (line 6)
//  B6 in5  26.35-30.15  soot falls into the fire; he leans into the hearth and looks up (line 7)
//  B7 flue 30.15-33.60  his view up the flue: the square of night sky... something blots it out (line 8)
//  B8 in5  33.60-35.10  THE ATTACK: it drops; the open-jawed face bursts out of the hearth and fills the screen
//  35.10-36.50 black (the mix's hard cut to silence)
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Logger } from "./trapper";
import { TRAPPER } from "./CharTest";
import { JerseyDevil, DevilFace } from "./devil";
import camExt1 from "../../stories/jerseydevil/sets/ext1.json";
import camIn1 from "../../stories/jerseydevil/sets/in1.json";
import camIn3 from "../../stories/jerseydevil/sets/in3.json";
import camIn4 from "../../stories/jerseydevil/sets/in4.json";
import camIn5 from "../../stories/jerseydevil/sets/in5.json";

const FPS = 30;
export const B0 = 12.8, B1 = 36.5;
export const PARTB_FRAMES = Math.round((B1 - B0) * FPS);   // 711
const T_THUD = 17.8, HOOF0 = 19.653, SCARE1 = 21.42, SCRAPE0 = 24.29, SOOT = 26.44, HIT = 33.6, CUT = 35.1;

type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
const project = (cam: CamJ, p: [number, number, number]) => {
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
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** smooth flicker 0..1 (sum of sines, never jumps between frames) */
const flick = (T: number) => clamp01(0.55 + 0.25 * Math.sin(T * 9.3) + 0.15 * Math.sin(T * 23.1 + 1.3) + 0.1 * Math.sin(T * 41.7 + 2.1));
const walkS = (T: number, t0: number, t1: number, V: number) => {
  const v = (t: number) => V * sm((t - t0) / 0.5) * sm((t1 - t) / 0.5);
  let s = 0; const dt = 1 / 240;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V };
};
const shakeAt = (T: number, t0: number, amp: number, decay = 0.25) => {
  if (T < t0) return [0, 0];
  const k = amp * Math.exp(-(T - t0) / decay);
  return [k * Math.sin(T * 97 + t0), k * Math.cos(T * 83 + t0 * 3)];
};

/** a still plate with the fire flicker (hi/lo cross-fade) */
const Plate: React.FC<{ shot: string; T: number; fire?: boolean; filter?: string }> = ({ shot, T, fire, filter }) => (
  <>
    <Img src={staticFile(`jerseydevil/${shot}${fire ? "_lo" : ""}/f_0001.png`)} style={{ position: "absolute", width: 1080, height: 1920, filter }} />
    {fire && <Img src={staticFile(`jerseydevil/${shot}_hi/f_0001.png`)} style={{ position: "absolute", width: 1080, height: 1920, opacity: flick(T), filter }} />}
  </>
);

/** 2D flames: a cluster of tongues licking upward, base at (x, y), width w px */
const Flames: React.FC<{ x: number; y: number; w: number; T: number; boost?: number }> = ({ x, y, w, T, boost = 0 }) => (
  <g style={{ mixBlendMode: "screen" }}>
    <ellipse cx={x} cy={y} rx={w * 0.6} ry={w * 0.25} fill="rgba(255,120,30,0.35)" style={{ filter: `blur(${w * 0.15}px)` }} />
    {Array.from({ length: 13 }, (_, i) => {
      const u = (i + 0.5) / 13, bx = x + (u - 0.5) * w * 0.9, h = w * (0.45 + 0.5 * rnd(i) + 0.25 * Math.sin(T * (7 + i) + i)) * (1 - 0.5 * Math.abs(u - 0.5) * 2) * (1 + boost);
      const sway = Math.sin(T * (5 + i * 0.7) + i * 2) * w * 0.06, bw = w * 0.11;
      return <path key={i} d={`M${bx - bw},${y} Q${bx - bw * 0.6 + sway},${y - h * 0.5} ${bx + sway * 2},${y - h} Q${bx + bw * 0.6 + sway},${y - h * 0.5} ${bx + bw},${y} Z`}
        fill={i % 3 === 0 ? "#ffd27a" : i % 3 === 1 ? "#ff8a2a" : "#ff5a14"} opacity={0.8} style={{ filter: `blur(${w * 0.035}px)` }} />;
    })}
  </g>
);

/** falling particles (dust from the rafters / soot down the flue) inside a box, starting at t0 */
const Falling: React.FC<{ T: number; t0: number; x0: number; x1: number; y0: number; y1: number; n: number; col: string; dur?: number; size?: number; seed?: number }> = ({ T, t0, x0, x1, y0, y1, n, col, dur = 1.6, size = 3, seed = 0 }) => {
  if (T < t0) return null;
  return <g>{Array.from({ length: n }, (_, i) => {
    const d = rnd(i + seed) * 0.6, k = (T - t0 - d) / (dur * (0.7 + 0.6 * rnd(i + seed + 50)));
    if (k < 0 || k > 1) return null;
    const px = lerp(x0, x1, rnd(i + seed + 9)) + Math.sin(T * 2 + i) * 6, py = lerp(y0, y1, k * k * 0.6 + k * 0.4);
    return <circle key={i} cx={px} cy={py} r={size * (0.5 + rnd(i + seed + 3))} fill={col} opacity={(1 - k) * 0.85} />;
  })}</g>;
};

export const JDPartB: React.FC<{ startT?: number }> = ({ startT = B0 }) => {
  const T = startT + useCurrentFrame() / FPS;
  if (T >= CUT) return <AbsoluteFill style={{ background: "#000" }} />;
  const grade = (warm: boolean) => <>
    <AbsoluteFill style={{ background: warm ? "linear-gradient(to top, rgba(255,110,40,0.1), rgba(0,0,0,0) 40%, rgba(0,0,12,0.5))" : "linear-gradient(to top, rgba(20,30,60,0.15), rgba(0,0,0,0) 45%, rgba(0,0,12,0.45))" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)" }} />
  </>;
  const castF = (warm: number) => `brightness(${0.55 + 0.35 * warm}) saturate(${0.7 + 0.2 * warm}) sepia(${0.25 * warm})`;

  // ---------------- B1: outside, he walks to his door and goes in
  if (T < 15.2) {
    const cam = camExt1 as CamJ;
    const push = 1 + 0.07 * sm((T - 12.8) / 2.4);
    const t0 = 12.85, t1 = 14.45, V = 1.25, tot = walkS(t1, t0, t1, V).s;
    const w = walkS(T, t0, t1, V), xw = 0.25 - tot + w.s, P = project(cam, [xw, 6.25, 0.03]);
    const door = [project(cam, [-0.13, 6.93, 0.12]), project(cam, [0.73, 6.93, 2.02])];
    const open = sm((T - 14.45) / 0.25), gone = sm((T - 14.7) / 0.35);
    const chim = project(cam, [2.47, 8.7, 4.75]);
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "540px 1000px" }}>
          <Plate shot="ext1" T={T} />
          <svg width={1080} height={1920} style={{ position: "absolute" }}>
            {/* chimney smoke */}
            {Array.from({ length: 7 }, (_, i) => { const k = ((T * 0.25 + i / 7) % 1); return <circle key={i} cx={chim.x - 30 * k + 10 * Math.sin(T + i)} cy={chim.y - 260 * k} r={14 + 50 * k} fill="rgba(150,160,180,0.12)" opacity={1 - k} style={{ filter: "blur(10px)" }} />; })}
            {/* the door swings open: warm firelight in the doorway */}
            {open > 0 && <rect x={door[0].x} y={door[1].y} width={(door[1].x - door[0].x) * open} height={door[0].y - door[1].y} fill="#ffa04a" opacity={0.85 * (1 - 0.6 * sm((T - 14.95) / 0.25))} />}
            {open > 0 && <ellipse cx={(door[0].x + door[1].x) / 2} cy={door[0].y + 6} rx={90 * open} ry={22 * open} fill="rgba(255,150,60,0.35)" style={{ filter: "blur(10px)" }} />}
            <g opacity={1 - gone} style={{ filter: castF(0.4) }}>
              <Logger x={P.x} y={P.y - 8 * gone} ppm={P.ppm * (1 - 0.06 * gone)} look={TRAPPER} pose={{ dist: w.s, walk: w.w, t: T, hold: "lantern", lit: 1, lookX: 0.4, expr: "neutral" }} />
            </g>
          </svg>
        </AbsoluteFill>
        {grade(false)}
      </AbsoluteFill>
    );
  }

  // ---------------- B2 + B3: inside at the fire; the thud, dust, he looks up; hoof steps across the roof
  if (T < 20.85) {
    const cam = camIn1 as CamJ;
    const P = project(cam, [1.0, 8.95, 0.14]);
    const fire = project(cam, [1.86, 8.7, 0.28]), fireR = project(cam, [1.86, 9.0, 0.28]);
    const after = T >= T_THUD;
    const push = after ? 1.1 + 0.1 * sm((T - T_THUD) / 3.0) : 1 + 0.06 * sm((T - 15.2) / 2.6);
    const [sx, sy] = shakeAt(T, T_THUD, 16, 0.18);
    let hx = 0, hy = 0;
    for (let i = 0; i < 6; i++) { const [a, b] = shakeAt(T, HOOF0 + i * 0.55, 4, 0.08); hx += a; hy += b; }
    const look = sm((T - 18.15) / 0.5);
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ transform: `translate(${sx + hx}px,${sy + hy}px) scale(${push})`, transformOrigin: `${P.x}px ${P.y - 0.9 * P.ppm}px` }}>
          <Plate shot="in1" T={T} fire />
          <svg width={1080} height={1920} style={{ position: "absolute" }}>
            <Flames x={fire.x} y={fire.y} w={Math.abs(fireR.x - fire.x) * 1.8 + 60} T={T} />
            <g style={{ filter: castF(0.9 + 0.1 * flick(T)) }}>
              <Logger x={P.x} y={P.y} ppm={P.ppm} look={TRAPPER}
                pose={{ t: T, hold: null, armNear: after ? [lerp(68, 20, look), lerp(40, 25, look)] : [68, 40], armFar: after ? undefined : [60, 45], lookX: after ? 0.2 : 0.5,
                  tilt: -16 * look + (T > HOOF0 ? 2 * Math.sin(T * 3) : 0), expr: after ? "scared" : "neutral", blink: !after && (T % 3.1) < 0.1 }} />
            </g>
            {/* firelight rim on him */}
            <ellipse cx={P.x + 0.25 * P.ppm} cy={P.y - 0.9 * P.ppm} rx={0.5 * P.ppm} ry={1.0 * P.ppm} fill="rgba(255,120,40,0.08)" style={{ mixBlendMode: "screen", filter: "blur(20px)" }} />
            {/* dust shaken down from the rafters on the thud, and a puff with every hoof step */}
            <Falling T={T} t0={T_THUD} x0={120} x1={960} y0={60} y1={1500} n={70} col="rgba(210,190,160,0.7)" dur={2.0} size={2.2} />
            {Array.from({ length: 6 }, (_, i) => <Falling key={i} T={T} t0={HOOF0 + i * 0.55} x0={260 + i * 110} x1={360 + i * 110} y0={40} y1={900} n={14} col="rgba(210,190,160,0.6)" dur={1.2} size={2} seed={100 + i * 20} />)}
          </svg>
        </AbsoluteFill>
        {grade(true)}
      </AbsoluteFill>
    );
  }

  // ---------------- B4: scare 1, the winged shadow across the window
  if (T < 24.05) {
    const cam = camIn3 as CamJ;
    const P = project(cam, [0.35, 8.35, 0.14]);
    const wa = project(cam, [-1.49, 7.08, 1.76]), wb = project(cam, [-0.71, 7.08, 1.14]);
    const wx0 = Math.min(wa.x, wb.x), wx1 = Math.max(wa.x, wb.x), wy0 = Math.min(wa.y, wb.y), wy1 = Math.max(wa.y, wb.y);
    const k = (T - SCARE1 + 0.05) / 0.32;                   // the shadow crosses the pane in ~10 frames
    const jolt = sm((T - SCARE1) / 0.13);
    const push = 1 + 0.04 * sm((T - 20.85) / 0.6) + 0.12 * jolt;
    const [sx, sy] = shakeAt(T, SCARE1, 14, 0.2);
    const sweep = T > SCARE1 - 0.05 && T < SCARE1 + 0.6 ? clamp01((T - SCARE1) / 0.4) : -1;
    const cx = (wx0 + wx1) / 2, cy = (wy0 + wy1) / 2;
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ transform: `translate(${sx}px,${sy}px) scale(${push})`, transformOrigin: `${cx}px ${cy}px` }}>
          <Plate shot="in3" T={T} fire />
          <svg width={1080} height={1920} style={{ position: "absolute" }}>
            <defs><clipPath id="pane"><rect x={wx0} y={wy0} width={wx1 - wx0} height={wy1 - wy0} /></clipPath></defs>
            {/* outside the window: pine silhouettes against the moonlit sky, then the winged shape sweeping past */}
            <g clipPath="url(#pane)">
              <rect x={wx0} y={wy0} width={wx1 - wx0} height={wy1 - wy0} fill="rgba(25,40,80,0.72)" />
              {[0.12, 0.35, 0.7, 0.9].map((u, i) => <rect key={i} x={lerp(wx0, wx1, u)} y={wy0 - 20} width={(wx1 - wx0) * 0.05} height={wy1 - wy0 + 40} fill="rgba(5,8,16,0.85)" />)}
              {k > 0 && k < 1.4 && <JerseyDevil x={lerp(wx0 - (wx1 - wx0) * 1.3, wx1 + (wx1 - wx0) * 1.1, k)} y={wy1 + (wy1 - wy0) * 0.9} ppm={(wy1 - wy0) * 0.75} p={{ wings: 1, shadow: true, t: T, reach: 0.6 }} />}
            </g>
            {/* its shadow passing over the room (cold light from the window blocked for a moment) */}
            {sweep >= 0 && <rect x={-200 + 1400 * sweep - 500} y={0} width={500} height={1920} fill="rgba(0,0,0,0.45)" style={{ filter: "blur(60px)" }} />}
            <g style={{ filter: castF(0.75 + 0.15 * flick(T)) }}>
              <Logger x={P.x} y={P.y} ppm={P.ppm} look={TRAPPER} flip
                pose={{ t: T, hold: null, armNear: T > SCARE1 ? [lerp(10, 40, jolt), lerp(15, 70, jolt)] : undefined, lookX: 0.6,
                  tilt: -10 + 8 * jolt, expr: "scared", blink: false }} />
            </g>
          </svg>
        </AbsoluteFill>
        {grade(true)}
      </AbsoluteFill>
    );
  }

  // ---------------- B5: the scraping crosses the rafters to the chimney
  if (T < 26.35) {
    const k = sm((T - 24.05) / 2.3);
    const tx = lerp(-130, 90, k), ty = lerp(170, -40, k);
    const s = 1.28 - 0.06 * k;
    const scr = clamp01((T - SCRAPE0) / 2.2);
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ transform: `translate(${tx}px,${ty}px) scale(${s})`, transformOrigin: "540px 960px" }}>
          <Plate shot="in4" T={T} fire filter="brightness(1.7) contrast(1.05)" />
          <svg width={1080} height={1920} style={{ position: "absolute" }}>
            {/* dust trickling along the ceiling where the claws scrape, moving toward the chimney */}
            <Falling T={T} t0={SCRAPE0} x0={150 + 650 * scr} x1={260 + 650 * scr} y0={150 + 300 * scr} y1={900} n={40} col="rgba(200,180,150,0.6)" dur={1.0} size={2.2} seed={300} />
            <Falling T={T} t0={SCRAPE0 + 1.0} x0={600} x1={900} y0={350} y1={1100} n={30} col="rgba(200,180,150,0.6)" dur={1.0} size={2.2} seed={400} />
          </svg>
        </AbsoluteFill>
        {grade(true)}
      </AbsoluteFill>
    );
  }

  // ---------------- B6 / B8: the hearth close-up (soot, he leans in and looks up) and the attack
  const hearthShot = (attack: boolean) => {
    const cam = camIn5 as CamJ;
    const fire = project(cam, [1.86, 8.7, 0.27]), fireR = project(cam, [1.86, 9.0, 0.27]);
    const op = [project(cam, [1.55, 8.3, 0.2]), project(cam, [1.55, 9.1, 1.0])];
    const lean = sm((T - 27.3) / 1.2), up = sm((T - 28.4) / 0.8);
    const P0 = project(cam, [lerp(1.05, 1.2, lean), lerp(9.35, 9.22, lean), 0.14]);
    const P = { x: P0.x, y: P0.y + 0.62 * P0.ppm, ppm: P0.ppm };          // kneeling: sunk 0.62 m, cropped at the hips
    const hipY = P.y - 0.62 * P.ppm;
    const a = (T - HIT - 0.1) * FPS;                         // frames since the face starts its lunge (cut in at 33.70)
    const kL = clamp01(a / 6), ke = kL * kL * kL;
    const hit = a >= 4.5;
    const [sx, sy] = hit ? [26 * Math.exp(-(a - 4.5) / 9) * (rnd(a | 0) - 0.5) * 2, 26 * Math.exp(-(a - 4.5) / 9) * (rnd((a | 0) + 9) - 0.5) * 2] : [0, 0];
    const push = attack ? 1.12 + (hit ? 0.04 : 0) : 1 + 0.12 * sm((T - 26.35) / 3.8);
    const ocx = (op[0].x + op[1].x) / 2, ocy = (op[0].y + op[1].y) / 2;
    const fs = 90 + (1000 - 90) * ke + (hit ? 200 * clamp01((a - 4.5) / 30) : 0);
    const fx = lerp(ocx, 540, ke), fy = lerp(ocy, 960 - 0.22 * fs, ke);
    const flash = attack && a >= 4 && a < 6 ? (a < 5 ? 1 : 0.55) : 0;
    const blur = attack && a >= 0 && a < 6 ? 10 * (1 - kL) + 3 : 0;
    const flare = Math.max(sm((T - SOOT) / 0.15) * (1 - sm((T - SOOT - 0.6) / 0.6)), attack ? 1 : 0);
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ transform: `translate(${sx}px,${sy}px) scale(${push})`, transformOrigin: `${ocx}px ${ocy}px` }}>
          <Plate shot="in5" T={T} fire />
          <svg width={1080} height={1920} style={{ position: "absolute" }}>
            <Flames x={fire.x} y={fire.y} w={Math.abs(fireR.x - fire.x) * 2 + 80} T={T} boost={0.6 * flare} />
            {/* soot pouring down out of the flue into the fire, sparks jumping */}
            <Falling T={T} t0={SOOT} x0={op[0].x + 40} x1={op[1].x - 40} y0={op[1].y - 20} y1={fire.y} n={80} col="rgba(10,8,6,0.9)" dur={0.9} size={3} seed={500} />
            {T > SOOT && Array.from({ length: 16 }, (_, i) => { const k = (T - SOOT - rnd(i + 70) * 0.3) / 0.8; if (k < 0 || k > 1) return null;
              return <circle key={i} cx={fire.x + (rnd(i + 80) - 0.5) * 300 * k} cy={fire.y - 260 * k + 200 * k * k} r={3} fill="#ffb050" opacity={1 - k} />; })}
            <defs><clipPath id="kneel"><rect x={-2000} y={-4000} width={6000} height={4000 + hipY} /></clipPath></defs>
            {!attack && <g style={{ filter: castF(1) }} clipPath="url(#kneel)" transform={`rotate(${8 * lean},${P.x},${hipY})`}>
              <Logger x={P.x} y={P.y} ppm={P.ppm} look={TRAPPER}
                pose={{ t: T, hold: null, armNear: [lerp(15, 55, lean), lerp(20, 60, lean)], lookX: 0.8, tilt: -24 * up, expr: T > SOOT ? "scared" : "worried", blink: false }} />
            </g>}
            {attack && a >= 0 && <g style={{ filter: `blur(${blur}px)` }}>
              {!hit && <g opacity={0.3}><DevilFace x={fx + 60 * (1 - kL)} y={fy + 40 * (1 - kL)} size={fs * 0.8} open={0.8} t={T} id="dfg" /></g>}
              <DevilFace x={fx} y={fy} size={fs} open={0.75 + 0.25 * kL + (hit ? 0.12 * Math.sin(T * 28) : 0)} t={T} id="dfa" />
            </g>}
            {/* embers burst out of the hearth with it */}
            {attack && Array.from({ length: 40 }, (_, i) => { const k = (T - HIT - 0.1 - rnd(i + 900) * 0.1) / 0.7; if (k < 0 || k > 1) return null;
              const ang = rnd(i + 901) * Math.PI * 2; return <circle key={i} cx={ocx + Math.cos(ang) * 900 * k} cy={ocy + Math.sin(ang) * 900 * k} r={4 + 6 * k} fill="#ff9a3a" opacity={1 - k} />; })}
          </svg>
          <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(255,120,40,0.18), rgba(0,0,0,0) 45%, rgba(0,0,10,0.5))" }} />
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)" }} />
        {flash > 0 && <AbsoluteFill style={{ background: a < 5 ? "#fff" : "#8a0a0a", mixBlendMode: a < 5 ? "normal" : "multiply", opacity: flash }} />}
      </AbsoluteFill>
    );
  };
  if (T < 30.15) return hearthShot(false);

  // ---------------- B7: up the flue; then it drops
  if (T < HIT + 0.1) {
    const push = 1 + 0.14 * sm((T - 30.15) / 3.4);
    const block = sm((T - 32.4) / 1.1);                      // something slowly fills the square of sky
    const drop = clamp01((T - HIT) / 0.1);                   // 3 frames: it falls at the lens
    return (
      <AbsoluteFill style={{ background: "#000" }}>
        <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "540px 960px" }}>
          <Plate shot="flue" T={T} />
          <svg width={1080} height={1920} style={{ position: "absolute" }}>
            {/* embers drifting up the flue */}
            {Array.from({ length: 22 }, (_, i) => { const k = ((T * 0.35 + rnd(i + 40)) % 1); return <circle key={i} cx={540 + (rnd(i + 41) - 0.5) * 700 * (1 - k) + 20 * Math.sin(T * 3 + i)} cy={1900 - 1000 * k} r={4 * (1 - k) + 1} fill="#ffa040" opacity={0.8 * (1 - k)} />; })}
            {/* the shape blotting out the sky: hooves and the edge of a wing, then two ember eyes */}
            {block > 0 && <g opacity={block}>
              <ellipse cx={540} cy={930} rx={150 * block + 10} ry={130 * block + 10} fill="#000" style={{ filter: "blur(14px)" }} />
              <circle cx={520} cy={915} r={6} fill="#ff6a1a" opacity={sm((T - 33.05) / 0.3)} /><circle cx={562} cy={917} r={6} fill="#ff6a1a" opacity={sm((T - 33.05) / 0.3)} />
            </g>}
            {drop > 0 && <circle cx={540} cy={930} r={160 + 1600 * drop * drop} fill="#000" />}
          </svg>
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.8) 100%)" }} />
      </AbsoluteFill>
    );
  }
  return hearthShot(true);
};
