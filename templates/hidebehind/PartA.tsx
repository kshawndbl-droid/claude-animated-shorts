// Part A of "The Hidebehind" (story 0.00 - 15.00 s, 450 frames, lines 1-3): the logging camp at night.
// Plates: tools/blender/hidebehind_camp.py (one still camera per shot, rendered with the fire "hi" and "lo"; the two
// are cross-faded per frame so the firelight really flickers over the snow, logs and cabins). Camera moves are slow
// 2.5D pushes on the 1296 px plates. On top: the 2D fire (flames, glow, sparks), chimney smoke, drifting fog, and the
// cast on the approved Logger rig in three NEW looks (not the hero), drawn through the same camera.
//  a1  0.00-3.40  wide establishing shot of the camp, slow push
//  a2  3.40-6.30  low at the fire: three lumberjacks whispering, glancing at the trees
//  a3  6.30-8.80  close on the old logger's face, fire from below, slow push ("They called it the Hidebehind.")
//  a4  8.80-15.00 the forest edge: a man snaps round to look behind him, nothing; he faces front again and far behind
//                 him between the trunks a near-black tall shape is there for a moment (no flash, no jump); the push
//                 drifts on into the dark trees
// Video only (no audio, no subtitles): the parts are joined and the approved mix v3 + subtitles laid on in Part D.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Logger, ToonLook, ToonPose } from "./logger";
import { Creature } from "./creature";
import camA1 from "../../stories/hidebehind/sets/partA/a1.json";
import camA2 from "../../stories/hidebehind/sets/partA/a2.json";
import camA4 from "../../stories/hidebehind/sets/partA/a4.json";

const FPS = 30;
export const PART_A_FRAMES = 450;
type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
const CAMS: Record<string, CamJ> = { a1: camA1 as CamJ, a2: camA2 as CamJ, a4: camA4 as CamJ };
const SHOTS: [string, number, number][] = [["a1", 0, 3.4], ["a2", 3.4, 6.3], ["a3", 6.3, 8.8], ["a4", 8.8, 15.0]];

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
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

// three new camp looks on the approved rig (the hero logger of Parts B-D keeps his red check and grey toque)
export const OLD: ToonLook = {
  skin: "#d2a383", top: "#5a4630", topDark: "#3a2c1e", legs: "#3e3a34", legsDark: "#28251f", boots: "#2e2016",
  hair: "#a8a49c", beard: "#cfcac0", toque: "#2e4636", toqueDark: "#1e3024", braces: "#1f1a16", belt: "#24180e",
};
export const MAC: ToonLook = {
  skin: "#e0b493", top: "#2d4472", topDark: "#1b2a4c", check: "1", legs: "#5a5146", legsDark: "#3b352d", boots: "#3a2618",
  hair: "#1e140c", beard: "#2a1a0e", toque: "#9a6a26", toqueDark: "#6b4818", braces: "#3a2a1c", belt: "#2a1c12",
};
export const SWEDE: ToonLook = {
  skin: "#e6c0a0", top: "#6a6c66", topDark: "#45463f", legs: "#3a3a40", legsDark: "#25252a", boots: "#33241a",
  hair: "#c99a52", mustache: true, hat: "none", braces: "#5a1c18", belt: "#2a1c12",
};

/** firelight: a smooth, organic flicker 0..1 (several incommensurate sines, nothing jumps frame to frame) */
const flick = (t: number) => clamp01(0.55 + 0.2 * Math.sin(t * 7.3) + 0.14 * Math.sin(t * 12.9 + 1.3) + 0.1 * Math.sin(t * 3.1 + 0.4) + 0.06 * Math.sin(t * 21.7 + 2.2));

const Plates: React.FC<{ shot: string; k: number }> = ({ shot, k }) => (
  <>
    <Img src={staticFile(`hidebehind/partA/${shot}_lo.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />
    <Img src={staticFile(`hidebehind/partA/${shot}_hi.png`)} style={{ position: "absolute", width: 1080, height: 1920, opacity: k }} />
  </>
);

/** the campfire's flames (2D), base at screen (x, y), s = px per metre */
const Flames: React.FC<{ x: number; y: number; s: number; t: number; k: number }> = ({ x, y, s, t, k }) => {
  const tongues = [-0.24, -0.12, 0, 0.11, 0.22];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
      <defs>
        <radialGradient id="fglow"><stop offset="0" stopColor="#ffb25a" stopOpacity={0.55} /><stop offset="0.4" stopColor="#ff7a2a" stopOpacity={0.18} /><stop offset="1" stopColor="#ff5a10" stopOpacity={0} /></radialGradient>
        <linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#fff1c0" /><stop offset="0.35" stopColor="#ffb040" /><stop offset="0.8" stopColor="#ff5a14" /><stop offset="1" stopColor="#c02808" stopOpacity={0} /></linearGradient>
        <filter id="fblur"><feGaussianBlur stdDeviation={Math.max(0.6, s * 0.012)} /></filter>
      </defs>
      <ellipse cx={x} cy={y - 0.35 * s} rx={2.2 * s} ry={1.6 * s} fill="url(#fglow)" opacity={0.6 + 0.4 * k} style={{ mixBlendMode: "screen" }} />
      <g filter="url(#fblur)" style={{ mixBlendMode: "screen" }}>
        {tongues.map((o, i) => {
          const h = s * (0.55 + 0.3 * (1 - Math.abs(o) * 3) + 0.14 * Math.sin(t * (6 + i * 1.7) + i * 2.1) + 0.12 * k);
          const w = s * (0.11 + 0.04 * Math.sin(t * 5 + i));
          const bx = x + o * s, sway = s * 0.06 * Math.sin(t * (4.1 + i) + i * 1.3);
          return <path key={i} d={`M${bx - w},${y} Q${bx - w * 1.1},${y - h * 0.45} ${bx + sway},${y - h} Q${bx + w * 1.1},${y - h * 0.45} ${bx + w},${y} Z`} fill="url(#fl)" opacity={0.85} />;
        })}
      </g>
      {/* sparks: each rises, drifts and fades on its own loop */}
      {Array.from({ length: 14 }).map((_, i) => {
        const per = 1.6 + (i % 5) * 0.35, ph = ((t + i * 0.37) % per) / per;
        const sx = x + s * (0.25 * Math.sin(i * 7.1) + 0.35 * ph * Math.sin(t * 1.3 + i)), sy = y - s * (0.4 + 2.4 * ph);
        return <circle key={i} cx={sx} cy={sy} r={Math.max(1, s * 0.012)} fill="#ffc070" opacity={0.9 * (1 - ph) * (ph > 0.05 ? 1 : ph / 0.05)} />;
      })}
    </svg>
  );
};

/** grey woodsmoke curling up from a stovepipe at screen (x, y) */
const Smoke: React.FC<{ x: number; y: number; s: number; t: number; op?: number }> = ({ x, y, s, t, op = 1 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute" }}>
    <defs>
      <radialGradient id="puff"><stop offset="0" stopColor="#8f95a3" stopOpacity={0.5} /><stop offset="1" stopColor="#8f95a3" stopOpacity={0} /></radialGradient>
    </defs>
    {Array.from({ length: 10 }).map((_, i) => {
      const ph = ((t * 0.22 + i / 10) % 1);
      const px = x + s * (0.9 * ph * ph + 0.15 * Math.sin(t * 0.8 + i)), py = y - s * 3.2 * ph;
      return <circle key={i} cx={px} cy={py} r={s * (0.18 + 0.75 * ph)} fill="url(#puff)" opacity={op * 0.75 * (1 - ph) * Math.min(1, ph * 6)} />;
    })}
  </svg>
);

/** soft fog banks drifting across (same language as Part B) */
const Fog: React.FC<{ T: number; y0: number; op: number }> = ({ T, y0, op }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", mixBlendMode: "screen" }}>
    <defs>
      <radialGradient id="fogb"><stop offset="0" stopColor="#8a9bc0" stopOpacity={0.5} /><stop offset="1" stopColor="#8a9bc0" stopOpacity={0} /></radialGradient>
    </defs>
    {[0, 1, 2, 3, 4].map((i) => {
      const sp = 9 + i * 4, x = ((i * 410 + T * sp * (i % 2 ? -1 : 1)) % 1700 + 1700) % 1700 - 310;
      return <ellipse key={i} cx={x} cy={y0 + (i % 3) * 70 + 12 * Math.sin(T * 0.3 + i)} rx={520 + 90 * i} ry={110 + 25 * (i % 2)} fill="url(#fogb)" opacity={op * (0.55 + 0.45 * Math.sin(T * 0.21 + i * 1.7) ** 2)} />;
    })}
  </svg>
);

/** a camp man on the rig, warm-lit by the fire (k = fire flicker) */
const Man: React.FC<{ x: number; y: number; ppm: number; look: ToonLook; pose: ToonPose; flip?: boolean; k: number; cold?: boolean }> =
  ({ x, y, ppm, look, pose, flip, k, cold }) => (
    <svg width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
      <g style={{ filter: cold ? "brightness(0.62) saturate(0.7)" : `brightness(${0.78 + 0.14 * k}) sepia(0.22) saturate(1.05)` }}>
        <Logger x={x} y={y} ppm={ppm} look={look} flip={flip} pose={pose} />
      </g>
    </svg>
  );

/** contact shadow under a figure */
const Foot: React.FC<{ x: number; y: number; ppm: number; op?: number }> = ({ x, y, ppm, op = 0.55 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute" }}>
    <ellipse cx={x} cy={y + 0.01 * ppm} rx={0.42 * ppm} ry={0.07 * ppm} fill="#000" opacity={op} style={{ filter: `blur(${0.04 * ppm}px)` }} />
  </svg>
);

const Shape: React.FC<{ x: number; y: number; ppm: number; op: number; blur: number }> = ({ x, y, ppm, op, blur }) => (
  <svg width={1080} height={1920} style={{ position: "absolute" }}>
    <g opacity={op} style={{ filter: `brightness(0.02) blur(${blur}px)` }}>
      <Creature x={x} y={y} ppm={ppm} flip p={{ pose: "lurk", glow: 0, rim: 0.4 }} />
    </g>
  </svg>
);

const blinkAt = (t: number, off: number) => ((t + off) % 3.9) < 0.1;

export const HPartA: React.FC = () => {
  const fr = useCurrentFrame(), T = fr / FPS;
  const [shot, t0, t1] = SHOTS.find(([, a, b]) => T >= a - 1e-6 && T < b - 1e-6) ?? SHOTS[SHOTS.length - 1];
  const k = flick(T), u = (T - t0) / (t1 - t0);
  let zoom = 1, ox = 540, oy = 960, scene: React.ReactNode = null, fogY = 1350, fogOp = 0.26;

  if (shot === "a1") {
    const cam = CAMS.a1, F = project(cam, [0, 0, 0.1]), P1 = project(cam, [-2.5, 10.6, 5.28]), P2 = project(cam, [9.89, 4.42, 4.51]);
    zoom = mix(1.0, 1.07, sm(u * 0.9 + 0.05)); ox = F.x; oy = F.y - 120;
    scene = <>
      <Smoke x={P1.x} y={P1.y} s={P1.ppm} t={T} />
      <Smoke x={P2.x} y={P2.y} s={P2.ppm} t={T + 3} op={0.8} />
      <Flames x={F.x} y={F.y} s={F.ppm} t={T} k={k} />
    </>;
    fogY = 1150;
  } else if (shot === "a2") {
    const cam = CAMS.a2, F = project(cam, [0, 0, 0.08]);
    const pO = project(cam, [-1.05, 0.45, 0.02]), pM = project(cam, [1.05, 0.62, 0.02]), pS = project(cam, [-0.55, 1.6, 0.02]);
    zoom = mix(1.0, 1.06, sm(u)); ox = F.x; oy = F.y - 200;
    const tt = T - 3.4;
    // whispering in turn (old man, then Mac), Swede looks over his shoulder at the dark trees and back
    const swedeBack = tt > 1.0 && tt < 2.1;
    scene = <>
      <Foot x={pS.x} y={pS.y} ppm={pS.ppm} />
      <Man x={pS.x} y={pS.y} ppm={pS.ppm} look={SWEDE} flip={swedeBack} k={k}
        pose={{ t: T + 2, expr: "worried", lookX: swedeBack ? 0.9 : 0.5, blink: blinkAt(T, 1.1), tilt: swedeBack ? -4 : 2 }} />
      <Flames x={F.x} y={F.y} s={F.ppm} t={T} k={k} />
      <Foot x={pO.x} y={pO.y} ppm={pO.ppm} />
      <Man x={pO.x} y={pO.y} ppm={pO.ppm} look={OLD} k={k}
        pose={{ t: T, expr: "stern", lookX: 0.6, talk: tt < 1.4 ? T : undefined, tilt: 4, blink: blinkAt(T, 0.3), armNear: [18, 40] }} />
      <Foot x={pM.x} y={pM.y} ppm={pM.ppm} />
      <Man x={pM.x} y={pM.y} ppm={pM.ppm} look={MAC} flip k={k}
        pose={{ t: T + 1, expr: "worried", lookX: tt > 2.0 ? -0.2 : 0.6, talk: tt > 1.5 && tt < 2.6 ? T : undefined, tilt: 5, blink: blinkAt(T, 2.2) }} />
    </>;
    fogY = 1450; fogOp = 0.18;
  } else if (shot === "a3") {
    // close on the old man: framed by hand (feet far below frame), the fire below-right lights his face
    zoom = mix(1.0, 1.09, sm(u)); ox = 560; oy = 760;
    const say = T >= 6.36 && T < 8.7;
    scene = <>
      <Man x={470} y={2140} ppm={1050} look={OLD} k={k}
        pose={{ t: T, expr: "stern", talk: say ? T - 6.36 : undefined, lookX: T > 7.3 ? -0.55 : 0.3, tilt: mix(2, -3, sm((T - 7.0) / 1.2)), blink: T > 8.45 && T < 8.55 }} />
      {/* firelight from below and to the right, flickering; the far side of his face falls into shadow */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 85% 95%, rgba(255,140,50,${0.34 + 0.16 * k}) 0%, rgba(255,110,30,0.1) 40%, rgba(0,0,0,0) 65%)`, mixBlendMode: "overlay" }} />
      <AbsoluteFill style={{ background: "linear-gradient(100deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)" }} />
    </>;
    fogY = 1500; fogOp = 0.12;
  } else {
    const tt = T - 8.8;
    // at the end he heads back toward the fire (screen left, world -y) and walks out of frame: we stay on the trees
    let wd = 0;
    for (let q = 14.0; q < T; q += 1 / 120) wd += (1.35 * sm((q - 14.0) / 0.35)) / 120;
    const cam = CAMS.a4, pm = project(cam, [-8.2, 1.95 - wd, 0.02]), G = project(cam, [-17.5, 5.6, 0]);
    const walkW = sm((T - 14.0) / 0.35);
    // he snaps round on "turned around" (12.2), holds, sees nothing, comes back (12.95)
    const back = T >= 12.2 && T < 12.95;
    // far behind him, between the trunks: a tall near-black shape for a moment (13.45 - 14.35), barely seen
    const sOp = 0.42 * sm((T - 13.45) / 0.3) * (1 - sm((T - 14.05) / 0.3));
    // the push: slow at first, then drifting on toward the trees where the shape stood
    zoom = mix(1.0, 1.05, sm(tt / 4.5)) * mix(1, 1.22, sm((T - 13.2) / 1.8));
    ox = mix(540, G.x, sm((T - 12.8) / 2.2)); oy = 900;
    scene = <>
      {sOp > 0.001 && <Shape x={G.x} y={G.y} ppm={G.ppm} op={sOp} blur={1.6} />}
      <Foot x={pm.x} y={pm.y} ppm={pm.ppm} op={0.45} />
      <Man x={pm.x} y={pm.y} ppm={pm.ppm} look={MAC} flip={!back} k={k} cold
        pose={{ t: T, hold: "lantern", lit: 1, dist: wd, walk: walkW, expr: back || T > 12.95 ? "scared" : "worried", lookX: back ? 0.9 : T > 12.95 && T < 13.95 ? -0.7 : 0.4, blink: blinkAt(T, 0.7) && !back, tilt: back ? -3 : 0 }} />
      {/* his lantern's warm pool on the snow */}
      <svg width={1080} height={1920} style={{ position: "absolute", mixBlendMode: "screen" }}>
        <defs><radialGradient id="lpool"><stop offset="0" stopColor="#ffa050" stopOpacity={0.32} /><stop offset="1" stopColor="#ff8030" stopOpacity={0} /></radialGradient></defs>
        <ellipse cx={pm.x + (back ? 0.25 : -0.25) * pm.ppm} cy={pm.y - 0.1 * pm.ppm} rx={1.4 * pm.ppm} ry={0.9 * pm.ppm} fill="url(#lpool)" opacity={0.85 + 0.15 * k} />
      </svg>
      {/* the camp fire behind the camera: a faint warm wash from the left */}
      <AbsoluteFill style={{ background: `linear-gradient(80deg, rgba(255,120,40,${0.08 + 0.05 * k}) 0%, rgba(0,0,0,0) 40%)`, mixBlendMode: "screen" }} />
    </>;
    fogY = 1300; fogOp = 0.3;
  }

  const grain = (fr * 7919) % 97;
  const fadeIn = 1 - sm(T / 0.5);
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${ox}px ${oy}px` }}>
        <Plates shot={shot} k={k} />
        {scene}
      </AbsoluteFill>
      <Fog T={T} y0={fogY} op={fogOp} />
      {/* cold grade, crushed blacks, heavy vignette, fine film grain (same finish as Part B) */}
      <AbsoluteFill style={{ background: "#0a1430", mixBlendMode: "multiply", opacity: 0.18 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.78) 100%)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={grain} /></filter>
        <rect width={1080} height={1920} filter="url(#gr)" />
      </svg>
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
    </AbsoluteFill>
  );
};
