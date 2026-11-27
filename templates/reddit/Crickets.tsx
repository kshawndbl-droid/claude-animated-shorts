// Reddit-style story Short #1, "The Cricket Box" (an original story written for the channel, told in first person).
// Same production approach as the Paris Short: the 2D big-head cast (figure.tsx, new modern looks), illustrated plates
// with the same ink treatment, breathing figures, push-ins, close-ups, quick cuts with a soft flash, word-by-word subtitles.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, Easing, delayRender, continueRender } from "remotion";
import { Figure, Look, Pose, INK, STRIDE } from "../eiffel/figure";
import { V3, setCfg, Plate, Haze, camXY, walker, blinkAt, Birds, Motes, Sparkle, GroundDefs, clamp01, smooth, ramp } from "../eiffel/StyleTest";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import words from "../../stories/reddit-crickets/words.json";

const FPS = 30;
export const CRICKETS_FRAMES = Math.round(61.5 * FPS);
const WORDS: Word[] = (words as { w: string; s: number; e: number }[]).map((w) => ({ w: w.w, s: w.s, e: w.e }));
const W = (w: string, n = 0) => WORDS.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w)[n]?.s ?? 0;
const KEY = ["dave", "stealing", "packages", "crickets", "shoes", "blender", "candle", "cozy", "cabin", "mine", "giant", "huge", "red", "live",
  "indoors", "speaker", "loop", "weeks", "gone", "yelling", "crawling", "flashlight", "exhausted", "loose", "weird", "sign", "safely"];
const serif = "Georgia, 'Times New Roman', serif";
const hand = "'MarkerFont', 'Comic Sans MS', cursive";  // Permanent Marker (Apache-2.0, public/fonts)
let markerReady = false;
const useMarkerFont = () => {
  const [h] = React.useState(() => (markerReady ? null : delayRender("marker font")));
  React.useEffect(() => {
    if (h === null) return;
    const f = new FontFace("MarkerFont", `url(${staticFile("fonts/permanent-marker-latin-400-normal.woff2")})`);
    f.load().then((ff) => { (document.fonts as any).add(ff); markerReady = true; continueRender(h); }).catch(() => continueRender(h));
  }, [h]);
};

// ---------------------------------------------------------------- cast (new characters, same drawing style)
const MIA: Look = { suit: "#e2a73a", suitDark: "#b9822a", vest: "#000", shirt: "#f4efe6", tie: "#000", shoes: "#f3f1ee", trousers: "#3e5a86",
  hat: "none", hatCol: "#000", band: "#e0414b", hair: "#5a3422", brows: "#4a2a1a", top: "hoodie", hairStyle: "ponytail", lashes: true };
const DAVE: Look = { suit: "#6f7f4a", suitDark: "#56643a", vest: "#000", shirt: "#f4efe6", tie: "#000", shoes: "#5a4a3a", trousers: "#8a7a62",
  hat: "cap", hatCol: "#c0392b", band: "#8e2b22", hair: "#3a2a1e", brows: "#3a2a1e", top: "tee", hairStyle: "messy", stubble: "#6a5446", stout: 1 };

// ---------------------------------------------------------------- helpers
type Cam = { z0: number; z1: number; cx: number; cy: number; dx?: number; dy?: number };
const at = (x: number, y: number, t: number, dur: number, c: Cam) => camXY(x, y, t, dur, c.z0, c.z1, c.cx, c.cy, c.dx ?? 0, c.dy ?? 0);
const PlateC: React.FC<{ src: string; t: number; dur: number; c: Cam; blur?: number; bright?: number }> = ({ src, t, dur, c, blur = 0, bright = 1 }) => (
  <Plate src={src} t={t} dur={dur} z0={c.z0} z1={c.z1} cx={c.cx} cy={c.cy} dx={c.dx} dy={c.dy} blur={blur} bright={bright} />
);
const shadowAt = (x: number, y: number, s: number, k = 1) => (
  <g>
    <ellipse cx={x} cy={y + 1} rx={80 * s} ry={14 * s} fill="url(#gshadow)" opacity={0.95 * k} />
    <ellipse cx={x + 30 * s} cy={y + 2} rx={115 * s} ry={17 * s} fill="url(#gshadow)" opacity={0.35 * k} />
  </g>
);
const alive = (p: Pose, T: number, seed: number): Pose => {
  if ((p.walk ?? 0) > 0.05) return p;
  return { ...p, bob: (p.bob ?? 0) + 1.6 * Math.sin(T * 2.3 + seed * 1.7) + 1.2, headTilt: (p.headTilt ?? 0) + 2.2 * Math.sin(T * 1.1 + seed * 2.3) + 1.2 * Math.sin(T * 2.9 + seed),
    lean: (p.lean ?? 0) + 1.5 * Math.sin(T * 0.8 + seed * 0.9), talk: T };
};
const AF: React.FC<React.ComponentProps<typeof Figure>> = (props) => {
  const T = useCurrentFrame() / FPS;
  const seed = props.id.split("").reduce((m, ch) => m + ch.charCodeAt(0), 0) % 17;
  return <Figure {...props} pose={alive(props.pose, T, seed)} />;
};
const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => <svg width={1080} height={1920} style={{ position: "absolute" }}><GroundDefs />{children}</svg>;
const push = (t: number, dur: number) => Easing.inOut(Easing.cubic)(clamp01(t / dur));
type ShotP = { T: number; a: number; b: number };

/** a cardboard parcel, optionally with a label */
const Parcel: React.FC<{ x: number; y: number; w: number; h: number; label?: string; labelSize?: number; rot?: number; col?: string }> = ({ x, y, w, h, label, labelSize = 40, rot = 0, col = "#c99a62" }) => (
  <g transform={`translate(${x},${y}) rotate(${rot})`}>
    <rect x={-w / 2} y={-h} width={w} height={h} rx={6} fill={col} stroke={INK} strokeWidth={6} />
    <path d={`M${-w / 2},${-h + h * 0.22} H${w / 2}`} stroke="#9a6e3e" strokeWidth={5} />
    <rect x={-w * 0.08} y={-h} width={w * 0.16} height={h} fill="rgba(240,220,180,0.5)" />
    {label && <g><rect x={-w * 0.36} y={-h * 0.62} width={w * 0.72} height={h * 0.4} rx={4} fill="#fbf6ea" stroke={INK} strokeWidth={4} />
      <text x={0} y={-h * 0.62 + h * 0.4 / 2 + labelSize * 0.35} textAnchor="middle" fontFamily={serif} fontWeight={900} fontSize={labelSize} fill="#1a1420">{label}</text></g>}
  </g>
);
const Poof: React.FC<{ x: number; y: number; k: number; s?: number }> = ({ x, y, k, s = 1 }) => {
  if (k <= 0 || k >= 1) return null;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} opacity={1 - k}>
      {Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * Math.PI * 2; const r = 30 + 90 * Easing.out(Easing.cubic)(k);
        return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r * 0.7} r={38 * (1 - k * 0.5)} fill="#f4efe6" stroke={INK} strokeWidth={5} />; })}
    </g>
  );
};
/** floating "chirp" notes */
const Chirps: React.FC<{ x: number; y: number; t: number; n?: number; k?: number }> = ({ x, y, t, n = 4, k = 1 }) => (
  <g opacity={k}>
    {Array.from({ length: n }, (_, i) => {
      const u = (t * 0.8 + i / n) % 1, xx = x + 60 * Math.sin(u * 6 + i) + (i - n / 2) * 40, yy = y - 220 * u;
      return <g key={i} transform={`translate(${xx},${yy}) scale(${0.8 + 0.4 * Math.sin(u * 3.14)})`} opacity={Math.sin(u * Math.PI)}>
        <path d="M0,0 v-34 l22,-8 v32" fill="none" stroke="#1f6e3a" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx={-6} cy={2} rx={10} ry={8} fill="#2f9a52" stroke={INK} strokeWidth={3} /><ellipse cx={16} cy={-6} rx={10} ry={8} fill="#2f9a52" stroke={INK} strokeWidth={3} />
      </g>;
    })}
  </g>
);
const Speaker: React.FC<{ x: number; y: number; s: number; t: number }> = ({ x, y, s, t }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {[0, 1, 2].map((i) => { const u = (t * 1.2 + i / 3) % 1; return <path key={i} d={`M${70 + 60 * u},-60 Q${100 + 80 * u},0 ${70 + 60 * u},60`} fill="none" stroke="#7fe0a0" strokeWidth={8} opacity={1 - u} strokeLinecap="round" />; })}
    {[0, 1, 2].map((i) => { const u = (t * 1.2 + i / 3) % 1; return <path key={`l${i}`} d={`M${-70 - 60 * u},-60 Q${-100 - 80 * u},0 ${-70 - 60 * u},60`} fill="none" stroke="#7fe0a0" strokeWidth={8} opacity={1 - u} strokeLinecap="round" />; })}
    <rect x={-60} y={-70} width={120} height={140} rx={30} fill="#2a2a36" stroke={INK} strokeWidth={7} />
    <circle cx={0} cy={0} r={38} fill="#44445a" stroke={INK} strokeWidth={5} />
    {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={Math.cos(i) * 22} cy={Math.sin(i) * 22} r={3.5} fill="#22222c" />)}
    <circle cx={0} cy={-52} r={6} fill={Math.sin(t * 6) > 0 ? "#6cff8a" : "#2f7a42"} />
  </g>
);
const Card: React.FC<{ k: number; text: string; y?: number; sub?: string }> = ({ k, text, y = 380, sub }) => {
  if (k <= 0) return null;
  const s = Easing.out(Easing.back(1.8))(clamp01(k));
  return (
    <g transform={`translate(540,${y}) scale(${s}) rotate(-2)`}>
      <rect x={-380} y={-90} width={760} height={sub ? 200 : 160} rx={26} fill="#fffaf0" stroke={INK} strokeWidth={8} />
      <text x={0} y={sub ? -14 : 22} textAnchor="middle" fontFamily={serif} fontWeight={900} fontSize={60} fill="#1a1420">{text}</text>
      {sub && <text x={0} y={60} textAnchor="middle" fontFamily={serif} fontStyle="italic" fontSize={40} fill="#6a4a3a">{sub}</text>}
    </g>
  );
};
/** the story card that opens the Short: our own design (no third-party logos) */
const StoryCard: React.FC<{ k: number; out: number }> = ({ k, out }) => {
  if (k <= 0 || out >= 1) return null;
  const s = Easing.out(Easing.back(1.6))(clamp01(k)) * (1 - Easing.in(Easing.cubic)(clamp01(out)));
  return (
    <g transform={`translate(540,330) scale(${s})`}>
      <rect x={-440} y={-150} width={880} height={300} rx={34} fill="#fffaf0" stroke={INK} strokeWidth={8} />
      <circle cx={-360} cy={-82} r={40} fill="#e2a73a" stroke={INK} strokeWidth={6} />
      <path d="M-380,-82 q20,22 40,0" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <text x={-300} y={-96} fontFamily="Montserrat, Arial, sans-serif" fontWeight={800} fontSize={34} fill="#1a1420">porch_problems</text>
      <text x={-300} y={-58} fontFamily="Montserrat, Arial, sans-serif" fontSize={26} fill="#7a6a5a">story time · 2 min ago</text>
      <text x={-400} y={30} fontFamily="Montserrat, Arial, sans-serif" fontWeight={900} fontSize={46} fill="#1a1420">My neighbor kept stealing my</text>
      <text x={-400} y={88} fontFamily="Montserrat, Arial, sans-serif" fontWeight={900} fontSize={46} fill="#1a1420">packages, so I got creative</text>
    </g>
  );
};

// ---------------------------------------------------------------- shots
// 1. hook: Dave tiptoes off Mia's porch with her parcel, glancing back
const S_Hook: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.0, z1: 1.14, cx: 540, cy: 1600, dx: -40 };
  const wk = walker(T, 0.3, b + 0.6, 4.4), s = 1.05;
  const D = at(300 + wk.dist * s, 1760, t, dur, c);
  const dp: Pose = { phase: wk.phase, walk: wk.walk, expr: "sly", ex: { eyes: "sly" }, facing: 0.6, hold: "box", lean: 6, lookX: Math.sin(T * 3) > 0.3 ? -1 : 0.6, blink: blinkAt(T, 1) };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_street.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.26} />
      <Svg>
        <Birds t={T} y0={300} n={4} seed={2} />
        {shadowAt(D.x, D.y, s * D.z)}
        <AF id="dh" look={DAVE} x={D.x} y={D.y} s={s * D.z} pose={dp} shadow={false} />
        <StoryCard k={(T - 0.1) / 0.45} out={(T - (b - 0.35)) / 0.3} />
        <Motes t={T} n={18} seed={1} />
      </Svg>
    </AbsoluteFill>
  );
};
// 2. Mia's close-up: "so I mailed him a box of crickets... kind of" (shrug and wink)
const S_MiaHook: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const kind = T > W("kind") - 0.1;
  const pose: Pose = { expr: kind ? "smug" : "sly", facing: 0.15, gesture: kind ? "shrug" : "rub", gk: kind ? ramp(T, W("kind") - 0.1, 0.25) : 1, wink: T > W("of", 1) && T < W("of", 1) + 0.4,
    lookX: kind ? 0 : 0.4, blink: blinkAt(T, 2), ex: kind ? {} : { brow: -10, browTilt: -12 } };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_kitchen.png" t={t} dur={dur} c={{ z0: 1.35, z1: 1.45, cx: 540, cy: 1000 }} blur={3.2} bright={0.96} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.34} />
      <Svg>
        <Motes t={T} n={16} seed={3} />
        <AF id="mh" look={MIA} x={540} y={1880 + 30 * p} s={4.0 + 0.3 * p} pose={pose} shadow={false} />
        <Sparkle x={820} y={560} k={(T - W("kind")) / 0.5} />
      </Svg>
    </AbsoluteFill>
  );
};
// 3. every week something went missing: parcels on the porch vanish one by one, Mia gets crosser
const S_Missing: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.12, z1: 1.26, cx: 540, cy: 1600 };
  const M = at(730, 1790, t, dur, c), s = 1.3;
  const gone = [W("shoes"), W("blender")];
  const items: [number, number, number, number, string][] = [[260, 1800, 170, 110, "SHOES"], [470, 1810, 150, 190, "BLENDER"]];
  const mood = T < gone[0] ? "neutral" : T < gone[1] ? "surprised" : "stern";
  const mp: Pose = { expr: mood, facing: -0.3, gesture: T > gone[1] ? "hips" : "none", gk: ramp(T, gone[1], 0.25), lookX: -1, blink: blinkAt(T, 4) };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_porch.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.28} />
      <Svg>
        {items.map(([x, y, w, h, l], i) => { const P = at(x, y, t, dur, c); const k = (T - gone[i]) / 0.5;
          return <g key={i}>{T < gone[i] + 0.05 && <Parcel x={P.x} y={P.y} w={w * P.z} h={h * P.z} label={l} labelSize={26 * P.z} />}<Poof x={P.x} y={P.y - h * P.z * 0.5} k={k} s={P.z} /></g>; })}
        {shadowAt(M.x, M.y, s * M.z)}
        <AF id="mm" look={MIA} x={M.x} y={M.y} s={s * M.z} flip pose={mp} shadow={false} />
        <Motes t={T} n={16} seed={5} />
      </Svg>
    </AbsoluteFill>
  );
};
// 4. the forty-dollar candle: a close-up, then poof
const S_Candle: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const goneT = W("cabin") + 0.35;
  const sway = Math.sin(T * 9) * 3;
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_porch.png" t={t} dur={dur} c={{ z0: 1.6, z1: 1.7, cx: 540, cy: 1500 }} blur={3.5} bright={0.95} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.36} />
      <Svg>
        {T < goneT + 0.05 && (
          <g transform={`translate(540,${1430 - 30 * p}) scale(${1.4 + 0.15 * p})`}>
            <ellipse cx={0} cy={180} rx={170} ry={26} fill="rgba(40,22,40,0.3)" />
            <rect x={-130} y={-120} width={260} height={300} rx={30} fill="#f1dcc0" stroke={INK} strokeWidth={8} />
            <rect x={-130} y={-120} width={260} height={50} rx={20} fill="#c98a5a" stroke={INK} strokeWidth={7} />
            <rect x={-100} y={-20} width={200} height={130} rx={10} fill="#fffaf0" stroke={INK} strokeWidth={5} />
            <text x={0} y={30} textAnchor="middle" fontFamily={serif} fontWeight={900} fontSize={38} fill="#5a3422">COZY</text>
            <text x={0} y={76} textAnchor="middle" fontFamily={serif} fontWeight={900} fontSize={38} fill="#5a3422">CABIN</text>
            <path d={`M0,-120 v-30`} stroke={INK} strokeWidth={6} />
            <path d={`M0,-150 q${-22 + sway},-30 0,-80 q${22 + sway},40 0,80 Z`} fill="#ffb43a" stroke={INK} strokeWidth={5} />
            <g transform="translate(150,-40) rotate(14)">
              <path d="M0,0 L70,0 L90,22 L70,44 L0,44 Z" fill="#ffd04a" stroke={INK} strokeWidth={5} />
              <text x={40} y={32} textAnchor="middle" fontFamily="Montserrat, Arial, sans-serif" fontWeight={900} fontSize={26} fill="#1a1420">$40</text>
            </g>
          </g>
        )}
        <Poof x={540} y={1450} k={(T - goneT) / 0.6} s={2.2} />
        <Sparkle x={720} y={1100} k={(T - W("cozy")) / 0.5} />
      </Svg>
    </AbsoluteFill>
  );
};
// 5. the excuse: Dave on his lawn, a big innocent shrug; Mia with hands on hips
const S_Excuse: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.3, z1: 1.45, cx: 560, cy: 1650, dx: -30 };
  const D = at(330, 1770, t, dur, c), M = at(790, 1780, t, dur, c), s = 1.35;
  const ex = T > W("oh") - 0.1;
  const dp: Pose = { expr: ex ? "happy" : "smile", facing: 0.5, gesture: ex ? "shrug" : "none", gk: ramp(T, W("oh") - 0.1, 0.25), lookX: 0.6, blink: blinkAt(T, 6),
    headTilt: ex ? 8 : 0, ex: ex ? { blush: 0.8 } : {} };
  const mp: Pose = { expr: T > W("dave", 1) - 0.1 ? "stern" : "neutral", facing: 0.4, gesture: "hips", gk: 1, lookX: 0.6, blink: blinkAt(T, 7), ex: { eyes: T > W("dave", 1) ? "squint" : "dot" } };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_street.png" t={t} dur={dur} c={c} blur={0.8} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.3} />
      <Svg>
        {shadowAt(M.x, M.y, s * M.z)}
        <AF id="me" look={MIA} x={M.x} y={M.y} s={s * M.z} flip pose={mp} shadow={false} />
        {shadowAt(D.x, D.y, s * 1.05 * D.z)}
        <AF id="de" look={DAVE} x={D.x} y={D.y} s={s * 1.05 * D.z} pose={dp} shadow={false} />
        <Sparkle x={D.x + 90} y={D.y - 470} k={(T - W("mine")) / 0.5} />
      </Svg>
    </AbsoluteFill>
  );
};
// 6. "It had my name on it. In giant letters." Dave caught with the parcel, MIA written huge
const S_Name: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const big = Easing.out(Easing.back(2))(clamp01((T - (W("giant") - 0.15)) / 0.35));
  const pose: Pose = { expr: T > W("giant") ? "worried" : "smile", facing: 0.15, blink: blinkAt(T, 8), lookX: -0.6, lookY: 0.5, gesture: "none" };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_street.png" t={t} dur={dur} c={{ z0: 1.5, z1: 1.6, cx: 300, cy: 1100 }} blur={3.2} bright={0.96} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.34} />
      <Svg>
        <AF id="dn" look={DAVE} x={540} y={1840 + 20 * p} s={3.4 + 0.2 * p} pose={pose} shadow={false} />
        <g transform={`translate(540,${1900 - 10 * p}) rotate(-3)`}>
          <Parcel x={0} y={0} w={640} h={360} />
          <text x={0} y={-110} textAnchor="middle" fontFamily={hand} fontWeight={400} fontSize={110 + 80 * big} fill="#1a1420" transform={`rotate(-4) scale(${0.9 + 0.1 * big})`}>MIA</text>
          {[-1, 1].map((sd) => <circle key={sd} cx={sd * 330} cy={-200} r={44} fill="#f3dcc0" stroke={INK} strokeWidth={8} />)}
        </g>
      </Svg>
    </AbsoluteFill>
  );
};
// 7. Mia at the kitchen table, writing on a huge box with a red marker
const S_Write: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.2, z1: 1.34, cx: 540, cy: 1600, dx: 20 };
  const M = at(330, 1820, t, dur, c), s = 1.45, B = at(700, 1830, t, dur, c);
  const writing = T > W("wrote") - 0.2;
  const mp: Pose = { expr: writing ? "sly" : "smile", facing: 0.6, gesture: writing ? "write" : "present", gk: 1, hold: writing ? "marker" : null, lookX: 0.8, lookY: writing ? 0.6 : 0,
    blink: blinkAt(T, 9), bob: writing ? 3 * Math.abs(Math.sin(T * 9)) : 0, ex: writing ? { brow: -10, browTilt: -12 } : {} };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_kitchen.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.28} />
      <Svg>
        {shadowAt(M.x, M.y, s * M.z)}
        <AF id="mw" look={MIA} x={M.x} y={M.y} s={s * M.z} pose={mp} shadow={false} />
        {shadowAt(B.x, B.y, 2.4 * B.z, 0.8)}
        <Parcel x={B.x} y={B.y} w={400 * B.z} h={330 * B.z} rot={-1} />
        {writing && <path d={`M${B.x - 150 * B.z},${B.y - 200 * B.z} q40,-20 80,0 t80,0 t80,0`} fill="none" stroke="#d8303a" strokeWidth={10} strokeLinecap="round"
          strokeDasharray={400} strokeDashoffset={400 * (1 - clamp01((T - W("wrote")) / 1.0))} />}
        <Motes t={T} n={14} seed={9} />
      </Svg>
    </AbsoluteFill>
  );
};
// 8. the label, written stroke by stroke: LIVE CRICKETS / DO NOT OPEN INDOORS
const S_Label: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const r1 = clamp01((T - (W("live") - 0.1)) / 0.55), r2 = clamp01((T - (W("do") - 0.1)) / 0.8);
  const mx = 80 + 920 * (r2 > 0 ? r2 : r1), my = r2 > 0 ? 1140 : 900;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#c99a62" }} />
      <Svg>
        <g transform={`translate(540,960) scale(${1 + 0.06 * p}) rotate(${-2 + 2 * p}) translate(-540,-960)`}>
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M0,${i * 240} L1080,${i * 240 + 30}`} stroke="rgba(120,80,40,0.18)" strokeWidth={6} />)}
          <rect x={460} y={-20} width={160} height={1960} fill="rgba(240,220,180,0.45)" />
          <defs>
            <clipPath id="r1"><rect x={0} y={700} width={80 + 1000 * r1} height={300} /></clipPath>
            <clipPath id="r2"><rect x={0} y={1010} width={80 + 1000 * r2} height={300} /></clipPath>
          </defs>
          <g clipPath="url(#r1)"><text x={540} y={930} textAnchor="middle" fontFamily={hand} fontWeight={400} fontSize={140} textLength={900} lengthAdjust="spacingAndGlyphs" fill="#d8303a" transform="rotate(-3 540 930)">LIVE CRICKETS</text></g>
          <g clipPath="url(#r2)"><text x={540} y={1130} textAnchor="middle" fontFamily={hand} fontWeight={400} fontSize={76} textLength={860} lengthAdjust="spacingAndGlyphs" fill="#d8303a" transform="rotate(-2 540 1130)">DO NOT OPEN INDOORS!</text></g>
          {(r1 > 0 && r1 < 1) || (r2 > 0 && r2 < 1) ? (
            <g transform={`translate(${mx},${my}) rotate(35)`}>
              <rect x={-18} y={-200} width={36} height={180} rx={8} fill="#d8303a" stroke={INK} strokeWidth={6} />
              <rect x={-18} y={-250} width={36} height={56} rx={6} fill="#f2f2f2" stroke={INK} strokeWidth={6} />
              <circle cx={0} cy={-120} r={46} fill="#f3dcc0" stroke={INK} strokeWidth={7} />
            </g>
          ) : null}
        </g>
      </Svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(25,12,30,0.35) 100%)" }} />
    </AbsoluteFill>
  );
};
// 9. inside the box: no crickets, just a tiny speaker chirping on a loop
const S_Inside: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const open = Easing.out(Easing.cubic)(clamp01((T - (W("inside") - 0.2)) / 0.5));
  const spk = Easing.out(Easing.back(2))(clamp01((T - (W("speaker") - 0.25)) / 0.4));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#2a1c14" }} />
      <Svg>
        <g transform={`translate(540,1000) scale(${1 + 0.12 * p}) translate(-540,-1000)`}>
          <rect x={90} y={520} width={900} height={1000} fill="#3a2618" stroke={INK} strokeWidth={10} />
          <rect x={90} y={520} width={900} height={1000} fill="url(#inside)" />
          <defs><radialGradient id="inside"><stop offset="0" stopColor="rgba(255,200,120,0.25)" /><stop offset="1" stopColor="rgba(0,0,0,0.45)" /></radialGradient></defs>
          {/* flaps swing open */}
          <path d={`M90,520 L${90 - 340 * open},${520 - 160 * (1 - open) - 40} L${540 - 200 * open},${520 - 160 * (1 - open) - 40} L540,520 Z`} fill="#c99a62" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
          <path d={`M990,520 L${990 + 340 * open},${520 - 160 * (1 - open) - 40} L${540 + 200 * open},${520 - 160 * (1 - open) - 40} L540,520 Z`} fill="#b88a52" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
          {spk > 0 && <Speaker x={540} y={1160} s={1.6 * spk} t={T} />}
          {T > W("cricket") - 0.2 && <Chirps x={540} y={980} t={T} n={5} />}
          {T > W("loop") - 0.1 && (
            <g transform={`translate(800,700) rotate(${(T - W("loop")) * 180})`} opacity={0.9}>
              <path d="M-50,0 A50,50 0 1 1 0,50" fill="none" stroke="#7fe0a0" strokeWidth={14} strokeLinecap="round" />
              <path d="M-12,36 L2,52 L-14,66" fill="none" stroke="#7fe0a0" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
          {T > W("battery") - 0.15 && (
            <g transform="translate(270,730)">
              <rect x={-70} y={-34} width={140} height={68} rx={12} fill="#22222c" stroke="#7fe0a0" strokeWidth={7} />
              <rect x={70} y={-14} width={14} height={28} rx={3} fill="#7fe0a0" />
              {[0, 1, 2, 3].map((i) => <rect key={i} x={-56 + i * 32} y={-22} width={24} height={44} rx={4} fill="#7fe0a0" opacity={clamp01((T - W("battery") - i * 0.12) / 0.2)} />)}
            </g>
          )}
        </g>
      </Svg>
    </AbsoluteFill>
  );
};
// 10. Mia rubs her hands: this is going to be good
const S_Scheme: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const pose: Pose = { expr: T > W("weeks") - 0.2 ? "laugh" : "sly", facing: 0.1, gesture: "rub", gk: 1, blink: blinkAt(T, 10), bob: 3 * Math.abs(Math.sin(T * 8)), ex: { brow: -12, browTilt: -14 } };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_kitchen.png" t={t} dur={dur} c={{ z0: 1.45, z1: 1.55, cx: 760, cy: 1000 }} blur={3.2} bright={0.9} />
      <Haze top="rgba(255,200,150,0.05)" vig={0.42} />
      <Svg>
        <AF id="msc" look={MIA} x={540} y={1880 + 20 * p} s={4.0 + 0.3 * p} pose={pose} shadow={false} />
        <Sparkle x={780} y={540} k={(T - W("weeks")) / 0.5} />
      </Svg>
    </AbsoluteFill>
  );
};
// 11. on the porch: Mia sets the box down and waves it goodbye... ten minutes later, gone
const S_Bait: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.1, z1: 1.22, cx: 540, cy: 1620 };
  const later = T > W("ten") - 0.15, goneT = W("gone");
  const B = at(420, 1810, t, dur, c), M = at(780, 1790, t, dur, c), s = 1.3;
  const mp: Pose = { expr: "smile", facing: -0.3, gesture: "wave", gk: 1, talk: T, lookX: -1, blink: blinkAt(T, 11) };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_porch.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.28} />
      {later && <AbsoluteFill style={{ background: "rgba(40,30,60,0.18)" }} />}
      <Svg>
        {T < goneT + 0.05 && <g>{shadowAt(B.x, B.y, 2.0 * B.z, 0.8)}<Parcel x={B.x} y={B.y} w={260 * B.z} h={210 * B.z} />
          <text x={B.x} y={B.y - 120 * B.z} textAnchor="middle" fontFamily={hand} fontWeight={400} fontSize={34 * B.z} fill="#d8303a">LIVE CRICKETS</text></g>}
        <Poof x={B.x} y={B.y - 100} k={(T - goneT) / 0.55} s={1.4} />
        {!later && <g>{shadowAt(M.x, M.y, s * M.z)}<AF id="mb" look={MIA} x={M.x} y={M.y} s={s * M.z} flip pose={mp} shadow={false} /></g>}
        <Card k={(T - (W("ten") - 0.15)) / 0.35} text="10 MINUTES LATER" y={520} />
        <Motes t={T} n={14} seed={11} />
      </Svg>
    </AbsoluteFill>
  );
};
// 12. that night: Dave jumps on his couch as the chirping starts
const S_Yell: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.2, z1: 1.38, cx: 540, cy: 1600, dx: 20 };
  const jump = T > W("yelling") - 0.3;
  const hop = jump ? 60 * Math.abs(Math.sin((T - W("yelling") + 0.3) * 7)) * Math.exp(-(T - W("yelling")) * 1.2) : 0;
  const D = at(560, 1800, t, dur, c), s = 1.4;
  const dp: Pose = { expr: jump ? "surprised" : "neutral", ex: jump ? { mouth: "open", sweat: true } : {}, facing: 0.2, gesture: jump ? "shrug" : "none", gk: ramp(T, W("yelling") - 0.3, 0.15),
    lookX: jump ? Math.sin(T * 7) : 0.3, blink: blinkAt(T, 12) };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_living.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(120,140,220,0.06)" vig={0.4} />
      <Svg>
        {shadowAt(D.x, D.y, s * D.z)}
        <AF id="dy" look={DAVE} x={D.x} y={D.y - hop} s={s * D.z} pose={dp} shadow={false} />
        <Chirps x={240} y={1500} t={T} n={4} k={clamp01((T - a) / 0.3)} />
        <Chirps x={880} y={1350} t={T + 0.4} n={3} k={clamp01((T - a - 0.4) / 0.3)} />
      </Svg>
    </AbsoluteFill>
  );
};
// 13. the next night: Dave on all fours with a flashlight, sweeping under the furniture
const S_Search: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.3, z1: 1.45, cx: 420, cy: 1700, dx: 40 };
  const wk = walker(T, a + 0.1, b + 0.3, 3.0), s = 1.35;
  const D = at(160 + wk.dist * s * 0.6, 1860, t, dur, c);
  const sweep = Math.sin(T * 2.5) * 18;
  const dp: Pose = { phase: wk.phase, walk: wk.walk * 0.7, expr: "worried", ex: { sweat: true }, facing: 0.7, lean: 18, gesture: "offer", gk: 1, hold: "flashlight", lookX: 1, lookY: 0.6, blink: blinkAt(T, 13) };
  const hx = D.x + 50 * s * D.z, hy = D.y - 107 * s * D.z;
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_living.png" t={t} dur={dur} c={c} bright={0.85} />
      <Haze top="rgba(120,140,220,0.08)" vig={0.5} />
      <Svg>
        {shadowAt(D.x, D.y, s * D.z)}
        <AF id="ds" look={DAVE} x={D.x} y={D.y} s={s * D.z} pose={dp} shadow={false} />
        <g style={{ mixBlendMode: "screen" }}>
          <path d={`M${hx},${hy} L${hx + 700},${hy + 160 + sweep * 8} L${hx + 620},${hy + 420 + sweep * 8} Z`} fill="rgba(255,240,180,0.28)" />
        </g>
        <Chirps x={860} y={1700} t={T} n={4} />
      </Svg>
    </AbsoluteFill>
  );
};
// 14. three days later: Dave on Mia's porch with a stack of her parcels
const S_Return: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.2, z1: 1.36, cx: 560, cy: 1640, dx: -30 };
  const D = at(330, 1800, t, dur, c), M = at(800, 1800, t, dur, c), s = 1.35;
  const knock = T > W("knocked") - 0.1 && T < W("knocked") + 0.45;
  const dp: Pose = { expr: "worried", facing: 0.5, gesture: knock ? "point" : "offer", gk: 1, hold: knock ? null : "box", lookX: 0.6, blink: blinkAt(T, 14), lean: 4,
    ex: { eyes: "squint", brow: 4, browTilt: 12 }, headTilt: -5 };
  const open = T > W("door") - 0.05;
  const mp: Pose = { expr: open ? "surprised" : "neutral", facing: 0.4, gesture: "hips", gk: ramp(T, W("holding"), 0.3), lookX: 0.6, lookY: 0.3, blink: blinkAt(T, 15) };
  const stack = Math.min(3, Math.floor(clamp01((T - W("holding")) / 0.6) * 3));
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_porch.png" t={t} dur={dur} c={c} blur={0.6} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.3} />
      <Svg>
        {open && <g>{shadowAt(M.x, M.y, s * M.z)}<AF id="mr" look={MIA} x={M.x} y={M.y} s={s * M.z} flip pose={mp} shadow={false} /></g>}
        {shadowAt(D.x, D.y, s * 1.05 * D.z)}
        <AF id="dr" look={DAVE} x={D.x} y={D.y} s={s * 1.05 * D.z} pose={dp} shadow={false} />
        {!knock && Array.from({ length: stack }, (_, i) => <Parcel key={i} x={D.x + 195 * D.z} y={D.y - (215 + i * 84) * D.z} w={(170 - i * 18) * D.z} h={88 * D.z} rot={(i % 2 ? 3 : -3)} />)}
        {knock && [0, 1].map((i) => <Sparkle key={i} x={D.x + 160 * D.z} y={D.y - 300 * D.z - i * 40} k={(T - W("knocked") - i * 0.15) / 0.3} />)}
      </Svg>
    </AbsoluteFill>
  );
};
// 15. the stack, item by item: shoes, blender, candle
const S_Stack: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const pop = (w: string) => Easing.out(Easing.back(2.2))(clamp01((T - (W(w, 1) - 0.12)) / 0.3));
  const items: [string, number, number, number][] = [["shoes", 1560, 520, 180], ["blender", 1340, 440, 230], ["candle", 1120, 360, 200]];
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_porch.png" t={t} dur={dur} c={{ z0: 1.5, z1: 1.62, cx: 540, cy: 1300 }} blur={3.2} bright={0.95} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.36} />
      <Svg>
        <g transform={`translate(540,960) scale(${1 + 0.06 * p}) translate(-540,-960)`}>
          {items.map(([w, y, ww, hh], i) => { const k = pop(w); if (k <= 0) return null;
            return <g key={w} transform={`translate(540,${y - 120 * (1 - k)}) scale(${k}) rotate(${(i % 2 ? 4 : -4)})`}><Parcel x={0} y={0} w={ww} h={hh} label={w.toUpperCase()} labelSize={46} /></g>; })}
        </g>
      </Svg>
    </AbsoluteFill>
  );
};
// 16. Dave, exhausted: "I think your crickets got loose."
const S_Tired: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const pose: Pose = { expr: "worried", ex: { eyes: T > W("said") ? "worried" : "closed", sweat: true, brow: 6, browTilt: 16 }, facing: 0.1, blink: blinkAt(T, 16), lean: -3 + 3 * Math.sin(T * 1.5),
    headTilt: -8 + 3 * Math.sin(T * 1.3), gesture: T > W("crickets", 2) - 0.1 ? "shrug" : "none", gk: ramp(T, W("crickets", 2) - 0.1, 0.3) * 0.6, lookY: 0.3 };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_porch.png" t={t} dur={dur} c={{ z0: 1.5, z1: 1.6, cx: 300, cy: 1100 }} blur={3.2} bright={0.92} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.4} />
      <Svg>
        <AF id="dt" look={DAVE} x={540} y={1860 + 20 * p} s={3.9 + 0.3 * p} pose={pose} shadow={false} />
        {/* dark rings under his eyes */}
        {[-1, 1].map((sd) => <path key={sd} d={`M${540 + sd * 130 - 50},${1860 + 20 * p - (246 - 2) * (3.9 + 0.3 * p) + 40} q50,26 100,0`} fill="none" stroke="rgba(110,80,120,0.55)" strokeWidth={10} strokeLinecap="round"
          transform={`rotate(${-8 + 3 * Math.sin(T * 1.3)} 540 ${1860 + 20 * p - 146 * (3.9 + 0.3 * p)})`} />)}
        <Chirps x={880} y={700} t={T} n={2} k={clamp01((T - W("crickets", 2)) / 0.3)} />
      </Svg>
    </AbsoluteFill>
  );
};
// 17. Mia, all innocence: "Weird. Must be a sign."
const S_Sign: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const pose: Pose = { expr: T > W("must") - 0.1 ? "smug" : "smile", ex: T < W("must") - 0.1 ? { eyes: "wide", mouth: "o" } : {}, facing: 0.15, blink: blinkAt(T, 17),
    gesture: T > W("must") - 0.1 ? "shrug" : "cross", gk: T > W("must") - 0.1 ? ramp(T, W("must") - 0.1, 0.25) : ramp(T, a + 0.1, 0.3), wink: T > W("sign") && T < W("sign") + 0.4, lookX: T < W("must") ? 0.8 : 0 };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_porch.png" t={t} dur={dur} c={{ z0: 1.5, z1: 1.6, cx: 760, cy: 1000 }} blur={3.2} bright={0.97} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.34} />
      <Svg>
        <AF id="ms" look={MIA} x={540} y={1880 + 20 * p} s={4.0 + 0.3 * p} pose={pose} shadow={false} />
        <Sparkle x={800} y={560} k={(T - W("sign")) / 0.5} />
        <Sparkle x={260} y={660} k={(T - W("sign") - 0.12) / 0.5} />
      </Svg>
    </AbsoluteFill>
  );
};
// 18. ever since: parcels land safely on Mia's porch, she hugs one
const S_Safe: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.0, z1: 1.16, cx: 540, cy: 1600 };
  const M = at(560, 1800, t, dur, c), s = 1.2;
  const drops = [54.3, 54.9, 55.5, 56.1];
  const mp: Pose = { expr: "happy", facing: 0.1, gesture: "hips", gk: 1, blink: blinkAt(T, 18), bob: 3 * Math.abs(Math.sin(T * 5)) };
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_street.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,220,170,0.05)" vig={0.26} />
      <Svg>
        <Birds t={T} y0={320} n={5} seed={4} />
        {shadowAt(M.x, M.y, s * M.z)}
        <AF id="msf" look={MIA} x={M.x} y={M.y} s={s * M.z} pose={mp} shadow={false} />
        {drops.map((d, i) => { const k = Easing.out(Easing.bounce)(clamp01((T - d) / 0.45)); if (T < d) return null;
          const P = at([300, 820, 220, 880][i], 1830, t, dur, c);
          return <g key={i}>{shadowAt(P.x, P.y, 1.2 * P.z, 0.7)}<Parcel x={P.x} y={P.y - 400 * (1 - k)} w={[140, 120, 110, 150][i] * P.z} h={[100, 120, 80, 90][i] * P.z} rot={[-4, 3, 5, -2][i]} />
            <Sparkle x={P.x} y={P.y - 150 * P.z} k={(T - d - 0.4) / 0.4} /></g>; })}
      </Svg>
    </AbsoluteFill>
  );
};
// 19. and Dave still has not found the speaker: night, his window, a flashlight, one chirp
const S_End: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.32, cx: 540, cy: 1600 };
  const D = at(620, 1860, t, dur, c), s = 1.35;
  const sweep = Math.sin(T * 2) * 20;
  const dp: Pose = { expr: "worried", ex: { sweat: true }, facing: -0.4, lean: 22, gesture: "offer", gk: 1, hold: "flashlight", lookX: -1, lookY: 0.6, blink: blinkAt(T, 19) };
  const hx = D.x - 50 * s * D.z, hy = D.y - 115 * s * D.z;
  return (
    <AbsoluteFill>
      <PlateC src="reddit/bg_living.png" t={t} dur={dur} c={c} bright={0.8} />
      <Haze top="rgba(120,140,220,0.08)" vig={0.5} />
      <Svg>
        {shadowAt(D.x, D.y, s * D.z)}
        <AF id="de2" look={DAVE} x={D.x} y={D.y} s={s * D.z} flip pose={dp} shadow={false} />
        <path d={`M${hx},${hy} L${hx - 700},${hy + 120 + sweep * 8} L${hx - 600},${hy + 400 + sweep * 8} Z`} fill="rgba(255,240,180,0.26)" style={{ mixBlendMode: "screen" }} />
        <Chirps x={900} y={1300} t={T} n={3} />
        <Card k={(T - 59.4) / 0.4} text="Still chirping." y={560} />
      </Svg>
    </AbsoluteFill>
  );
};

const SHOTS: [number, React.FC<ShotP>][] = [
  [0, S_Hook], [2.9, S_MiaHook], [5.6, S_Missing], [9.4, S_Candle], [12.7, S_Excuse], [16.2, S_Name], [19.35, S_Write], [22.4, S_Label],
  [25.3, S_Inside], [30.2, S_Scheme], [31.95, S_Bait], [35.45, S_Yell], [37.75, S_Search], [41.75, S_Return], [45.6, S_Stack], [48.05, S_Tired],
  [51.85, S_Sign], [54.05, S_Safe], [57.05, S_End],
];
const END = 61.5;
const sub = defaultStyle("funny", { keyWords: KEY, y: 0.86 });
const subS = { ...sub, moves: [{ from: 0, to: 2.9, y: 0.6 }, { from: 5.6, to: 9.4, y: 0.42 }, { from: 9.4, to: 12.7, y: 0.86 }, { from: 12.7, to: 16.2, y: 0.42 },
  { from: 16.2, to: 19.35, y: 0.17 }, { from: 19.35, to: 22.4, y: 0.42 }, { from: 22.4, to: 25.3, y: 0.3 }, { from: 25.3, to: 30.2, y: 0.22 }, { from: 31.95, to: 35.45, y: 0.4 },
  { from: 35.45, to: 41.75, y: 0.42 }, { from: 41.75, to: 45.6, y: 0.4 }, { from: 45.6, to: 48.05, y: 0.25 }, { from: 54.05, to: 61.5, y: 0.42 }] };

export const Crickets: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  setCfg(V3);
  useMarkerFont();
  const f = useCurrentFrame(), T = f / FPS;
  let k = SHOTS.findIndex(([s0], i) => T >= s0 && T < (SHOTS[i + 1]?.[0] ?? 1e9));
  if (k < 0) k = SHOTS.length - 1;
  const [a, S] = SHOTS[k], b = SHOTS[k + 1]?.[0] ?? END;
  const cutK = SHOTS.slice(1).reduce((m, [c]) => Math.min(m, Math.abs(T - c) * FPS), 99);
  const fadeIn = interpolate(T, [0, 0.25], [1, 0], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(T, [END - 0.6, END - 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#1a1420" }}>
      <S T={T} a={a} b={b} />
      <AbsoluteFill style={{ background: "linear-gradient(rgba(255,180,120,0.08), rgba(255,200,150,0.0) 50%, rgba(80,40,90,0.10))", mixBlendMode: "soft-light" }} />
      {cutK < 1.5 && <AbsoluteFill style={{ background: "#fff", opacity: 0.12 * (1.5 - cutK) }} />}
      <Subtitles words={WORDS} style={subS} />
      {withAudio && <Audio src={staticFile("reddit/crickets_mix.wav")} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  );
};
export { STRIDE };
