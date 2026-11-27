// Style preview for "The Hidebehind" (story 15.0 - 26.5 s, lines 4-6: the walk, the branch snap and jumpscare 1, "He
// walked faster"). Blender plates with a living forest (drifting fog, swaying boughs, the real lantern light that
// moves with him) + the approved 2D logger drawn through the same camera + the creature kept to barely-seen shapes:
//  pA  wide and high, a slow creep in: tall trunks, black space above, he walks back toward camp alone
//  pB  low and close, slow push: the snap, he freezes; the dark behind him fills the right of the frame
//  pC  his eyes: a 6-frame whip onto the hide tree, a tall shape slips behind it (jumpscare 1), then "Nothing."
//  pE  tracking beside him as he hurries; far back between the trunks something keeps pace
// Audio: the approved horror mix v1 (narration + SFX), unchanged. Subtitles: the established word-highlight style.
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import { Logger } from "./logger";
import { Creature } from "./creature";
import { LOGGER } from "./CharTest";
import paths from "../../stories/hidebehind/sets/preview_paths.json";
import camA from "../../stories/hidebehind/sets/pA.json";
import camB from "../../stories/hidebehind/sets/pB.json";
import camC from "../../stories/hidebehind/sets/pC.json";
import camE from "../../stories/hidebehind/sets/pE.json";
import wordsJson from "../../stories/hidebehind/final/words.json";

const FPS = 30;
export const T0 = 15.0, T1 = 26.5;
export const PREVIEW_FRAMES = Math.round((T1 - T0) * FPS);
type CamJ = { frames: Record<string, { m: number[][]; lens: number; sensor: number }> };
type PF = { cam: number[]; look: number[]; lens: number; logger: null | { x: number; y: number; dist: number; walk: number; dir: number[] } };
type Shot = { t0: number; t1: number; n: number; frames: PF[] };
const P = paths as unknown as Record<string, Shot>;
const CAMS: Record<string, CamJ> = { pA: camA as CamJ, pB: camB as CamJ, pC: camC as CamJ, pE: camE as CamJ };
const ORDER = ["pA", "pB", "pC", "pE"];

const project = (cam: CamJ, f: number, p: [number, number, number]) => {
  const c = cam.frames[String(f)] ?? cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * 1920, z = Math.max(0.05, -Z);
  return { x: 540 + (fpx * X) / z, y: 960 - (fpx * Y) / z, ppm: fpx / z, behind: Z > -0.05 };
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const pad = (f: number) => String(f).padStart(4, "0");

const WORDS: Word[] = (wordsJson as any[]).map((w) => ({ w: w.w, s: w.s, e: w.e }));
const KEY = ["logger", "alone.", "Crack.", "branch", "turned.", "Nothing.", "faster.", "Something", "faster", "too."];
const sub = defaultStyle("serious", { key: "#3DF0FF", keyWords: KEY, y: 0.74, maxChars: 16 });

/** the creature as a near-black silhouette (same design as creature.tsx), never seen clearly before the attack */
const Shape: React.FC<{ x: number; y: number; ppm: number; h?: number; lean?: number; op?: number; blur?: number; flip?: boolean }> =
  ({ x, y, ppm, h = 2.7, lean = 0, op = 1, blur = 0, flip }) => (
    <g transform={`rotate(${lean},${x},${y})`} opacity={op} style={{ filter: `brightness(0.02)${blur ? ` blur(${blur}px)` : ""}` }}>
      <Creature x={x} y={y} ppm={(ppm * h) / 2.7} flip={flip} p={{ pose: "lurk", glow: 0, rim: 0.4 }} />
    </g>
  );

/** soft fog banks that drift across the frame (2D, over the Blender mist), slow and layered */
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

const Plate: React.FC<{ shot: string; f: number }> = ({ shot, f }) => (
  <Img src={staticFile(`hidebehind/${shot}/f_${pad(f)}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />
);
const Fg: React.FC<{ shot: string; f: number }> = ({ shot, f }) => (
  <Img src={staticFile(`hidebehind/${shot}/fg_${pad(f)}.png`)} style={{ position: "absolute", width: 1080, height: 1920 }} />
);

/** the logger through the shot camera: faces the way he moves on screen */
const Man: React.FC<{ shot: string; f: number; T: number; pf: PF; expr: "neutral" | "worried" | "scared"; lookX: number }> = ({ shot, f, T, pf, expr, lookX }) => {
  const L = pf.logger!;
  const cam = CAMS[shot], A = project(cam, f, [L.x, L.y, 0.03]), B = project(cam, f, [L.x + 0.3 * L.dir[0], L.y + 0.3 * L.dir[1], 0.03]);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <g style={{ filter: "brightness(0.78) saturate(0.8)" }}>
        <Logger x={A.x} y={A.y} ppm={A.ppm} look={LOGGER} flip={B.x < A.x}
          pose={{ dist: L.dist, walk: L.walk, t: T, hold: "lantern", lit: 1, expr, lookX, blink: (T % 3.7) < 0.09 }} />
      </g>
    </svg>
  );
};

export const HPreview: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const fr = useCurrentFrame(), T = T0 + fr / FPS;
  let shot = ORDER[0];
  for (const s of ORDER) if (T >= P[s].t0 - 1e-6) shot = s;
  const S = P[shot], f = Math.min(S.n, Math.max(1, Math.round((T - S.t0) * FPS) + 1)), pf = S.frames[f - 1];
  const cam = CAMS[shot];
  let layer: React.ReactNode = null;
  if (shot === "pA") {
    // far down the trail, deep in the dark, a shape that is there for a moment and then isn't (barely visible)
    const G = project(cam, f, [-2.7, 13.5, 0]);
    layer = <>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Shape x={G.x} y={G.y} ppm={G.ppm} op={0.35 * sm((T - 16.2) / 0.8) * (1 - sm((T - 17.2) / 0.5))} blur={2} />
      </svg>
      <Man shot={shot} f={f} T={T} pf={pf} expr="neutral" lookX={0.35} />
    </>;
  } else if (shot === "pB") {
    layer = <Man shot={shot} f={f} T={T} pf={pf} expr={T > 18.15 ? "scared" : "neutral"} lookX={T > 18.5 ? -0.9 : 0.35} />;
  } else if (shot === "pC") {
    // jumpscare 1: during the whip a tall shape is caught beside the hide tree and slips behind it (≈7 frames)
    const k = sm((T - 20.52) / 0.22), H = project(cam, f, [2.1 - 1.0 * (1 - k), 5.85, 0]);
    const vis = T >= 20.5 && T < 20.8;
    layer = <>
      {vis && <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Shape x={H.x} y={H.y} ppm={H.ppm} h={2.7} lean={8 * (1 - k)} blur={f <= 7 ? 5 : 1} />
      </svg>}
      <Fg shot={shot} f={f} />
    </>;
  } else {
    // far behind him, between the trunks, something keeps pace (only seen in the gaps, never clearly)
    const L = pf.logger!, G = project(cam, f, [L.x + 7.5, L.y - 1.6, 0]);
    const ts = sm((T - 23.6) / 0.6);
    layer = <>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Shape x={G.x} y={G.y} ppm={G.ppm} op={0.7 * ts} blur={1.5} flip lean={-6} />
      </svg>
      <Fg shot={shot} f={f} />
      <Man shot={shot} f={f} T={T} pf={pf} expr={T > 23.8 ? "scared" : "worried"} lookX={T > 23.9 && T < 24.9 ? -0.9 : 0.35} />
    </>;
  }
  const fadeIn = 1 - sm((T - T0) / 0.4), fadeOut = sm((T - (T1 - 0.4)) / 0.4);
  const grain = (fr * 7919) % 97;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Plate shot={shot} f={f} />
      <Fog T={T} y0={shot === "pB" ? 1500 : shot === "pC" ? 1250 : 1350} op={shot === "pC" ? 0.22 : 0.3} />
      {layer}
      {/* cold grade, crushed blacks, heavy vignette, fine film grain */}
      <AbsoluteFill style={{ background: "#0a1430", mixBlendMode: "multiply", opacity: 0.18 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.78) 100%)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={grain} /></filter>
        <rect width={1080} height={1920} filter="url(#gr)" />
      </svg>
      <Subtitles words={WORDS.filter((w) => w.s >= T0 - 0.05 && w.s < T1 - 0.2)} style={sub} offset={-T0} />
      {withAudio && <Audio src={staticFile("hidebehind/mix_v3.wav")} startFrom={Math.round(T0 * FPS)} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  );
};
