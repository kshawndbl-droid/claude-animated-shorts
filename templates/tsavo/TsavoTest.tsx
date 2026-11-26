// Style test for "The Man-Eaters of Tsavo" (v2 style): narration lines 2 to 4 (story time 6.6 s to 21.7 s).
// Patterson at the unfinished bridge, dusk falls over the camp, two maneless lions in the grass, the creep through the
// moonlit bush, and a tent at night: a shadow on the canvas, the lantern swings and goes out. Nobody is shown being hurt.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { Pose, FIGCFG } from "../eiffel/figure";
import { V3, setCfg, Haze, blinkAt, walker, clamp01, ramp } from "../eiffel/StyleTest";
import { LivePlate, Fx } from "../mailed/live";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import { Cam, at, shadowAt, AF, Svg, push, ShotP, Card, useMarkerFont, INK } from "../mailed/common";
import { Lion, lionWalker } from "./lion";
import { PATTERSON, WORKER1, WORKER2 } from "./cast";
import wordsJson from "../../stories/tsavo/final/words.json";
import lightsJson from "../../stories/tsavo/plates/lights.json";

const FPS = 30;
export const OFF = 6.6, END = 21.7;
export const TSAVO_TEST_FRAMES = Math.round((END - OFF) * FPS);
const LIGHTS = lightsJson as unknown as Record<string, [number, number, number, string][]>;
const WORDS: Word[] = (wordsJson as any[]).map((w) => ({ w: w.w, s: w.s, e: w.e }));
const W = (w: string, n = 0) => WORDS.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w)[n]?.s ?? 0;
const KEY = ["tsavo", "river", "british", "engineer", "john", "henry", "patterson", "attacks", "lions", "manes", "camp", "dark", "dragged", "tents", "disappeared", "bush"];

const FX: Record<string, Fx> = {
  t_bridge: { heat: 1250, flicker: 0.1, dust: 10, sway: 18 },
  t_camp: { fog: 0.25, flicker: 0.9, sway: 20 },
  t_bush: { fog: 0.4, flicker: 0.2, sway: 22 },
  t_tent: { dust: 14, flicker: 0.8, sway: 14 },
};
const Live: React.FC<{ name: string; T: number; t: number; dur: number; c: Cam; blur?: number; bright?: number }> = (p) => (
  <LivePlate {...p} dir="tsavo" lightsMap={LIGHTS} fx={FX[p.name]} />
);
/** night grade on top of a plate: blue moonlight, darker edges */
const Night: React.FC<{ k: number }> = ({ k }) => (
  <AbsoluteFill style={{ background: "linear-gradient(rgb(60,75,150), rgb(80,95,170) 50%, rgb(30,35,80))", opacity: k, mixBlendMode: "multiply" }} />
);
/** tall dry grass in the foreground, swaying */
const Grass: React.FC<{ y: number; T: number; n?: number; col?: string; h?: number; seed?: number }> = ({ y, T, n = 46, col = "#2a2418", h = 220, seed = 1 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const r = Math.abs(Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1;
      const x = -40 + (i / n) * 1160 + r * 30, hh = h * (0.6 + 0.6 * r), sw = 14 * Math.sin(T * 1.4 + i * 0.7) + 8 * r;
      return <path key={i} d={`M${x - 14},${y} Q${x + sw * 0.4},${y - hh * 0.6} ${x + sw},${y - hh} Q${x + sw * 0.3 + 4},${y - hh * 0.5} ${x + 14},${y} Z`} fill={col} stroke={INK} strokeWidth={2} strokeLinejoin="round" opacity={0.92} />;
    })}
  </g>
);

// 1. the bridge in the heat: Patterson walks in, a worker carries a crate behind him
const S_Bridge: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.06, z1: 1.16, cx: 540, cy: 1400, dx: -20 };
  const wk = walker(T, a + 0.1, W("engineer") + 0.1, 3.4), s = 1.3;
  const P = at(130 + wk.dist * s, 1800, t, dur, c);
  const named = T > W("patterson") - 0.3;
  const pp: Pose = { phase: wk.phase, walk: wk.walk, expr: named ? "stern" : "neutral", facing: wk.walk > 0.1 ? 0.8 : named ? 0.15 : 0.5,
    gesture: T > W("led") && T < W("john") ? "point" : named ? "hips" : "none", gk: T > W("led") ? ramp(T, W("led"), 0.3) : 0, blink: blinkAt(T, 3), lookX: named ? 0 : 0.8 };
  const w2 = walker(T, a + 0.6, b + 1, 4.4), ws = 0.62;
  const Wk = at(1020 - w2.dist * ws, 1520, t, dur, c);
  return (
    <AbsoluteFill>
      <Live name="t_bridge" T={T} t={t} dur={dur} c={c} />
      <Haze top="rgba(255,200,130,0.12)" vig={0.32} />
      <Svg>
        {shadowAt(Wk.x, Wk.y, ws * Wk.z)}
        <AF id="tw1" look={WORKER1} x={Wk.x} y={Wk.y} s={ws * Wk.z} flip pose={{ phase: w2.phase, walk: w2.walk, facing: -0.7, hold: "box", blink: blinkAt(T, 4) }} shadow={false} />
        {shadowAt(P.x, P.y, s * P.z)}
        <AF id="tp" look={PATTERSON} x={P.x} y={P.y} s={s * P.z} pose={pp} shadow={false} />
        <Card k={Math.min((T - a - 0.3) / 0.35, (W("john") - 0.1 - T) / 0.25)} text="KENYA, 1898" y={300} w={520} />
        <Card k={(T - W("john") + 0.05) / 0.35} text="J. H. PATTERSON" y={330} w={640} sub="railway engineer" rot={2} />
      </Svg>
    </AbsoluteFill>
  );
};

// 2. dusk falls over the camp; two pairs of eyes light up in the grass, then the lions rise into a crouch
const S_Dusk: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.05, z1: 1.2, cx: 540, cy: 1300 };
  const dark = ramp(T, a + 0.2, 1.6);
  const eyesOn = T > W("two") - 0.15, rise = ramp(T, W("both") - 0.2, 0.7);
  const lion = (id: string, x: number, flip: boolean, d: number) => (
    <g style={{ filter: `brightness(${0.55 + 0.1 * rise}) saturate(0.75)` }}>
      <Lion id={id} x={x} y={1800 + 50 * (1 - rise)} s={1.05} flip={flip}
        pose={{ crouch: 1, eyes: eyesOn ? "glow" : "closed", tail: T + d, headTurn: 0.6, lookX: flip ? -0.6 : 0.6, lookY: 0.2 }} />
    </g>
  );
  return (
    <AbsoluteFill>
      <Live name="t_camp" T={T} t={t} dur={dur} c={c} bright={1 - 0.25 * dark} />
      <Night k={0.85 * dark} />
      <Haze top="rgba(255,140,80,0.10)" vig={0.5} />
      <Svg>
        <Grass y={1960} T={T} h={300} col="#4a3a22" seed={2} />
        {lion("l1", 140, false, 0)}
        {lion("l2", 950, true, 1.7)}
        <Grass y={1990} T={T + 0.6} n={36} h={240} col="#33281a" seed={5} />
        <Card k={(T - W("manes") + 0.05) / 0.35} text="NO MANES" y={420} w={460} rot={-3} />
      </Svg>
    </AbsoluteFill>
  );
};

// 3. the creep: low through the moonlit bush, two lions stalking toward the camp lights
const S_Creep: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.12, z1: 1.2, cx: 540, cy: 1500, dx: 30 };
  const l1 = lionWalker(T, a - 0.6, b, 150, 0.7), l2 = lionWalker(T, a - 0.2, b, 150, 0.7);
  return (
    <AbsoluteFill>
      <Live name="t_bush" T={T} t={t} dur={dur} c={c} bright={1.05} />
      <Night k={0.12} />
      <Haze top="rgba(120,150,255,0.08)" vig={0.5} />
      <Svg>
        <g style={{ filter: "brightness(0.62) saturate(0.7)" }}>
          <Lion id="c2" x={60 + l2.dist * 0.95} y={1560} s={0.95} pose={{ ...l2, crouch: 0.8, eyes: "glow", tail: T + 1, lookX: 1 }} />
          <Lion id="c1" x={140 + l1.dist * 1.35} y={1800} s={1.35} pose={{ ...l1, crouch: 0.9, eyes: "glow", tail: T, lookX: 1 }} />
        </g>
        <Grass y={1960} T={T} h={260} col="#26302c" seed={9} />
      </Svg>
    </AbsoluteFill>
  );
};

// 4. inside a tent: lamplight, then a lion's shadow slides across the canvas, the lantern swings and goes out
const S_Tent: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.08, z1: 1.22, cx: 540, cy: 1000 };
  const hit = W("dragged"), out = W("disappeared") - 0.05;
  const sx = interpolate(T, [a, hit + 0.2], [-420, 560], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shake = T > hit && T < hit + 0.6 ? 18 * Math.sin((T - hit) * 60) * (1 - (T - hit) / 0.6) : 0;
  const swingAmp = T < hit ? 4 : 34 * Math.exp(-(T - hit) * 0.8);
  const ang = swingAmp * Math.sin((T - a) * 3.2);
  const lamp = T < out ? 1 - 0.15 * Math.sin(T * 17) * (T > hit ? 1 : 0.2) : Math.max(0, 1 - (T - out) / 0.12);
  return (
    <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.4}px)` }}>
      <Live name="t_tent" T={T} t={t} dur={dur} c={c} bright={0.55 + 0.45 * lamp} />
      {/* the shadow on the canvas wall */}
      <Svg>
        <g opacity={0.55 * lamp} style={{ filter: "brightness(0) blur(6px)" }}>
          <Lion id="ts" x={sx} y={1250} s={1.7} pose={{ phase: (T - a) * 0.9, walk: 1, crouch: 0.5, tail: T }} />
        </g>
        {/* the painted lantern's light sways (it is knocked) and finally dies */}
        {(() => { const Lp = at(462, 1150, t, dur, c); return <circle cx={Lp.x + ang * 7} cy={Lp.y + Math.abs(ang) * 1.5} r={330 * Lp.z} fill="url(#lglow)" opacity={0.5 * lamp} style={{ mixBlendMode: "screen" }} />; })()}
        <defs><radialGradient id="lglow"><stop offset="0" stopColor="#ffd890" stopOpacity={0.9} /><stop offset="0.3" stopColor="#ffc060" stopOpacity={0.35} /><stop offset="1" stopColor="#ffd890" stopOpacity={0} /></radialGradient></defs>
      </Svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0) 30%, rgba(5,5,20,0.75) 100%)", opacity: 0.6 + 0.4 * (1 - lamp) }} />
      <AbsoluteFill style={{ background: "rgba(8,10,30,0.85)", opacity: 1 - lamp }} />
    </AbsoluteFill>
  );
};

// 5. into the bush: the grass closes behind a tail, then stillness
const S_Gone: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.2, z1: 1.3, cx: 540, cy: 1500, dx: -20 };
  const l = lionWalker(T, a - 0.8, b, 150, 0.9);
  const part = Math.exp(-(T - a) * 1.5);
  return (
    <AbsoluteFill>
      <Live name="t_bush" T={T} t={t} dur={dur} c={c} bright={0.95} />
      <Night k={0.2} />
      <Haze top="rgba(120,150,255,0.06)" vig={0.55} />
      <Svg>
        <g style={{ filter: "brightness(0.5) saturate(0.6)" }}>
          <Lion id="g1" x={420 + l.dist * 1.4} y={1720} s={1.4} pose={{ ...l, crouch: 0.6, eyes: "narrow", tail: T }} />
        </g>
        <Grass y={1900} T={T * (1 + 3 * part)} h={420} n={52} col="#1e2824" seed={4} />
      </Svg>
    </AbsoluteFill>
  );
};

const SHOTS: [number, React.FC<ShotP>][] = [[OFF, S_Bridge], [12.1, S_Dusk], [15.75, S_Creep], [17.95, S_Tent], [20.2, S_Gone]];
const sub = defaultStyle("serious", { keyWords: KEY, y: 0.86, maxChars: 16 });
const subS = { ...sub, moves: [{ from: 0, to: 12.1, y: 0.56 }, { from: 12.1, to: 15.75, y: 0.62 }, { from: 15.75, to: 17.95, y: 0.4 }, { from: 17.95, to: 20.2, y: 0.8 }, { from: 20.2, to: 30, y: 0.5 }] };

export const TsavoTest: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  setCfg(V3);
  FIGCFG.v2 = true;
  FIGCFG.v3 = false;
  useMarkerFont();
  const f = useCurrentFrame(), T = OFF + f / FPS;
  let k = SHOTS.findIndex(([s0], i) => T >= s0 && T < (SHOTS[i + 1]?.[0] ?? 1e9));
  if (k < 0) k = 0;
  const [a, S] = SHOTS[k], b = SHOTS[k + 1]?.[0] ?? END;
  const cutK = SHOTS.slice(1).reduce((m, [c]) => Math.min(m, Math.abs(T - c) * FPS), 99);
  const fadeIn = interpolate(T, [OFF, OFF + 0.35], [1, 0], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(T, [END - 0.6, END - 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#0a0a12" }}>
      <S T={T} a={a} b={b} />
      <AbsoluteFill style={{ background: "linear-gradient(rgba(255,190,120,0.08), rgba(0,0,0,0) 50%, rgba(30,20,50,0.18))", mixBlendMode: "soft-light" }} />
      {cutK < 2 && <AbsoluteFill style={{ background: "#000", opacity: 0.35 * (2 - cutK) / 2 }} />}
      <Subtitles words={WORDS.filter((w) => w.s >= OFF - 0.05 && w.s < END)} style={subS} offset={-OFF} />
      {withAudio && <Audio src={staticFile("tsavo/test_mix.wav")} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  );
};
