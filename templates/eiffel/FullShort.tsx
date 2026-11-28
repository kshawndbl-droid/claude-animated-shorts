// "The Man Who Sold the Eiffel Tower" full Short (about 69.5 s). Shots 1-3 are the approved test shots, unchanged:
// the v4 opening street walk, then the v3 cafe close-up and two-shot. Shots 4-16 follow the rest of the narration with
// the same locked cast (figure.tsx), the same illustrated plate treatment and the same subtitle style.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { Figure, LUSTIG, POISSON, Look, Pose, INK, STRIDE } from "./figure";
import {
  V3, V4, setCfg, ShotWidePersp, ShotClose, ShotTwo, Plate, Haze, camXY, walker, blinkAt, Birds, Motes, Sparkle, GroundDefs,
  EXTRA1, EXTRA2, clamp01, smooth, ramp,
} from "./StyleTest";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import vis from "../../stories/eiffel-sale/words_vis.json";

const FPS = 30;
export const FULL_FRAMES = Math.round(69.5 * FPS);

// words: merge the "$5" ",000" split from the transcriber into one word
const RAW = (vis as { words: { w: string; s: number; e: number }[] }).words;
const WORDS: Word[] = [];
for (let i = 0; i < RAW.length; i++) {
  const w = RAW[i];
  if (w.w === "$5" && RAW[i + 1]?.w === ",000") { WORDS.push({ w: "$5,000", s: w.s, e: RAW[i + 1].e }); i++; continue; }
  WORDS.push({ w: w.w, s: w.s, e: w.e });
}
const KEY = ["1925", "eiffel", "tower", "victor", "lustig", "dozens", "fake", "smile", "sand", "desert", "his", "paris", "fortune", "letterhead",
  "deputy", "director", "scrapmetal", "hotel", "secret", "thousands", "tons", "iron", "lucky", "andre", "poisson", "bit", "cash", "suitcase", "money",
  "embarrassed", "police", "again", "rat", "america", "capone", "boxes", "real", "alcatraz", "rock", "standing", "sale"];
const W = (w: string, n = 0) => WORDS.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w)[n]?.s ?? 0;

// ---------------------------------------------------------------- extra cast (new looks; Lustig and Poisson unchanged)
const DEALER3: Look = { ...POISSON, suit: "#5b3a4a", suitDark: "#44293a", check: undefined, pin: "rgba(240,220,230,0.12)", vest: "#a08a6a", tie: "#7a2a2a",
  hat: "bowler", hatCol: "#4a3a30", glasses: false, mustache: "walrus", hair: "#c9c2b8", brows: "#9a948c", stout: 0.5, trousers: "#4e3242" };
const CAPONE: Look = { ...LUSTIG, suit: "#c9bfae", suitDark: "#a89d8a", pin: "rgba(90,80,70,0.16)", vest: "#d8cfbe", tie: "#2a2430", trousers: "#bcb2a0",
  hat: "homburg", hatCol: "#8a8478", band: "#2a2430", mustache: undefined, flower: undefined, chain: false, stout: 1, brows: "#1f1a1f", hair: "#1f1a1f", shoes: "#2a1e18" };
const BUYER: Look = { ...EXTRA2, suit: "#6a5a3a", suitDark: "#52452c", vest: "#9a8a5a", tie: "#3a5a8a", hat: "homburg", hatCol: "#3a3430", mustache: "walrus", stout: 0.6, glasses: true };

// ---------------------------------------------------------------- shot timeline (seconds)
const CUTS = [0, 5.1, 8.75, 11.6, 15.05, 17.55, 19.6, 23.6, 25.3, 28.2, 30.0, 33.2, 34.9, 37.75, 43.05, 45.85, 47.75, 49.62, 51.35, 52.75, 55.2, 57.7, 61.1, 65.2, 69.5];

// ---------------------------------------------------------------- props
const shadowAt = (x: number, y: number, s: number, k = 1) => (
  <g>
    <ellipse cx={x} cy={y + 1} rx={80 * s} ry={14 * s} fill="url(#gshadow)" opacity={0.95 * k} />
    <ellipse cx={x + 30 * s} cy={y + 2} rx={115 * s} ry={17 * s} fill="url(#gshadow)" opacity={0.35 * k} />
  </g>
);
const Grade: React.FC<{ tint?: string }> = ({ tint = "rgba(255,170,120,0.10)" }) => (
  <AbsoluteFill style={{ background: `linear-gradient(${tint}, rgba(255,200,150,0.0) 50%, rgba(80,40,90,0.10))`, mixBlendMode: "soft-light" }} />
);
const serif = "Georgia, 'Times New Roman', serif";

/** the newspaper Lustig reads (our own drawing and text) */
const Newspaper: React.FC<{ x: number; y: number; w: number; h: number; rot: number }> = ({ x, y, w, h, rot }) => (
  <g transform={`translate(${x},${y}) rotate(${rot})`}>
    <path d={`M${-w / 2},${-h / 2} L${w / 2},${-h / 2 + 6} L${w / 2 - 4},${h / 2} L${-w / 2 + 3},${h / 2 - 4} Z`} fill="#f1e8d2" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <line x1={0} y1={-h / 2 + 4} x2={0} y2={h / 2 - 2} stroke="rgba(60,40,30,0.25)" strokeWidth={4} />
    <text x={-w / 2 + 30} y={-h / 2 + 70} fontFamily={serif} fontWeight={700} fontSize={52} fill="#2a2230">LE JOURNAL DU SOIR</text>
    <line x1={-w / 2 + 28} x2={w / 2 - 28} y1={-h / 2 + 92} y2={-h / 2 + 94} stroke="#2a2230" strokeWidth={4} />
    <text x={-w / 2 + 30} y={-h / 2 + 160} fontFamily={serif} fontWeight={900} fontSize={60} fill="#1a1420">LA TOUR EIFFEL</text>
    <text x={-w / 2 + 30} y={-h / 2 + 215} fontFamily={serif} fontStyle="italic" fontSize={38} fill="#5a2028">des réparations hors de prix !</text>
    {/* little engraving of the tower with scaffolding and coins */}
    <g transform={`translate(${w / 2 - 150},${-h / 2 + 330})`}>
      <path d="M0,-90 L-40,90 L-20,90 L0,10 L20,90 L40,90 Z" fill="none" stroke="#3a2c30" strokeWidth={5} strokeLinejoin="round" />
      <path d="M-26,30 H26 M-14,-20 H14" stroke="#3a2c30" strokeWidth={4} />
      <path d="M-60,40 H60 M-60,70 H60 M-55,40 V90 M55,40 V90" stroke="#8a6a3a" strokeWidth={3} />
      {[-70, -50, 64, 84].map((cx, i) => <circle key={i} cx={cx} cy={84 - (i % 2) * 14} r={12} fill="#e6c25a" stroke={INK} strokeWidth={3} />)}
    </g>
    {Array.from({ length: 9 }, (_, i) => <line key={i} x1={-w / 2 + 30} x2={-w / 2 + 30 + (i % 3 === 2 ? 260 : 360)} y1={-h / 2 + 270 + i * 28} y2={-h / 2 + 270 + i * 28} stroke="rgba(60,50,50,0.45)" strokeWidth={8} />)}
  </g>
);

/** a carved desk front for the letterhead shot */
const Desk: React.FC<{ top: number }> = ({ top }) => (
  <g>
    <rect x={-20} y={top} width={1120} height={40} rx={8} fill="#7a4a2a" stroke={INK} strokeWidth={7} />
    <rect x={-10} y={top + 6} width={1100} height={10} fill="rgba(255,220,170,0.25)" />
    <rect x={20} y={top + 40} width={1040} height={1920 - top} fill="#5e3820" stroke={INK} strokeWidth={7} />
    {[120, 560].map((x) => <g key={x}><rect x={x} y={top + 80} width={400} height={140} rx={10} fill="#6b4126" stroke={INK} strokeWidth={5} /><circle cx={x + 200} cy={top + 150} r={12} fill="#e6c25a" stroke={INK} strokeWidth={3} /></g>)}
  </g>
);
const Letter: React.FC<{ x: number; y: number; rot?: number; seal?: boolean; s?: number }> = ({ x, y, rot = 0, seal = true, s = 1 }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-70,-24 L70,-24 L84,16 L-84,16 Z" fill="#f7f1e0" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    <path d="M-50,-12 H40 M-56,-2 H50 M-60,8 H20" stroke="#8a7f70" strokeWidth={3} />
    {seal && <ellipse cx={52} cy={4} rx={13} ry={7} fill="#b3262f" stroke={INK} strokeWidth={2.5} />}
  </g>
);
const Stamp: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={-40} y={-18} width={80} height={22} rx={4} fill="#3a2a2a" stroke={INK} strokeWidth={5} />
    <rect x={-34} y={2} width={68} height={10} fill="#b3262f" stroke={INK} strokeWidth={3} />
    <path d="M-12,-18 L-10,-70 L10,-70 L12,-18 Z" fill="#7a4a2a" stroke={INK} strokeWidth={5} />
    <ellipse cx={0} cy={-84} rx={30} ry={22} fill="#7a4a2a" stroke={INK} strokeWidth={5} />
    <circle cx={0} cy={-104} r={20} fill="#f3dcc0" stroke={INK} strokeWidth={5} />
  </g>
);
/** a little iron tower drawing (for the thought bubble and the hook charm) */
const MiniTower: React.FC<{ x: number; y: number; s: number; rot?: number; col?: string }> = ({ x, y, s, rot = 0, col = "#4a4a6a" }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <path d="M0,-100 L-8,-60 L-22,0 L-50,60 L-30,60 Q0,20 30,60 L50,60 L22,0 L8,-60 Z" fill={col} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-24,0 H24 M-10,-55 H10" stroke={INK} strokeWidth={5} />
    <line x1={0} y1={-100} x2={0} y2={-118} stroke={INK} strokeWidth={5} />
  </g>
);
const Bubble: React.FC<{ x: number; y: number; k: number; children: React.ReactNode; tailX: number; tailY: number }> = ({ x, y, k, children, tailX, tailY }) => {
  if (k <= 0) return null;
  const s = Easing.out(Easing.back(1.6))(clamp01(k));
  return (
    <g>
      {[0.25, 0.5].map((f, i) => <circle key={i} cx={tailX + (x - tailX) * f} cy={tailY + (y + 170 - tailY) * f} r={(14 + i * 10) * s} fill="#fffaf0" stroke={INK} strokeWidth={5} />)}
      <g transform={`translate(${x},${y}) scale(${s})`}>
        <path d="M-260,0 C-300,-120 -160,-200 -60,-160 C0,-230 160,-210 190,-130 C300,-120 310,60 200,90 C170,190 20,180 -20,150 C-120,200 -280,140 -260,0 Z" fill="#fffaf0" stroke={INK} strokeWidth={7} />
        {children}
      </g>
    </g>
  );
};
const Rat: React.FC<{ x: number; y: number; k: number; t: number }> = ({ x, y, k, t }) => {
  if (k <= 0) return null;
  const up = 60 * (1 - Easing.out(Easing.back(2))(clamp01(k)));
  return (
    <g transform={`translate(${x},${y + up})`}>
      <path d={`M40,10 Q90,${0 + 10 * Math.sin(t * 8)} 120,-20`} fill="none" stroke="#c98a8a" strokeWidth={6} strokeLinecap="round" />
      <ellipse cx={0} cy={0} rx={52} ry={34} fill="#8f8a94" stroke={INK} strokeWidth={6} />
      <circle cx={-44} cy={-26} r={18} fill="#8f8a94" stroke={INK} strokeWidth={5} />
      <circle cx={-44} cy={-26} r={9} fill="#e6a0a8" />
      <ellipse cx={-50} cy={-2} rx={26} ry={22} fill="#9a95a0" stroke={INK} strokeWidth={5} />
      <circle cx={-56} cy={-8} r={5} fill={INK} />
      <circle cx={-76} cy={2} r={6} fill="#e07a8a" stroke={INK} strokeWidth={2} />
      <path d="M-72,6 l-24,-4 M-72,8 l-22,6" stroke={INK} strokeWidth={2} />
    </g>
  );
};
/** the "money-printing" box: a wooden box with a crank and a slot */
const MoneyBox: React.FC<{ x: number; y: number; s: number; crank: number; notes: number; t: number }> = ({ x, y, s, crank, notes, t }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    {Array.from({ length: notes }, (_, i) => {
      const age = (t * 3 + i * 0.37) % 1;
      return <rect key={i} x={-30 + 10 * Math.sin(i * 3)} y={-110 - age * 120} width={60} height={34} rx={3} fill="#9cc49a" stroke={INK} strokeWidth={3}
        transform={`rotate(${(i % 2 ? 1 : -1) * 20 * age} 0 ${-110 - age * 120})`} opacity={1 - age} />;
    })}
    <rect x={-110} y={-90} width={220} height={130} rx={10} fill="#8a5a32" stroke={INK} strokeWidth={6} />
    <rect x={-110} y={-90} width={220} height={26} rx={8} fill="#a06a3c" stroke={INK} strokeWidth={5} />
    <rect x={-44} y={-82} width={88} height={10} rx={3} fill="#2a1a14" />
    {[-80, 80].map((cx) => <circle key={cx} cx={cx} cy={-30} r={9} fill="#e6c25a" stroke={INK} strokeWidth={3} />)}
    <rect x={-40} y={-30} width={80} height={44} rx={6} fill="#6a4226" stroke={INK} strokeWidth={4} />
    <g transform={`translate(112,-28) rotate(${crank * 360})`}>
      <path d="M0,0 L0,-48" stroke={INK} strokeWidth={9} strokeLinecap="round" /><path d="M0,0 L0,-48" stroke="#c9c2b8" strokeWidth={5} strokeLinecap="round" />
      <circle cx={0} cy={-52} r={9} fill="#b3262f" stroke={INK} strokeWidth={3} />
    </g>
  </g>
);
const FallingNotes: React.FC<{ t: number; n: number; k: number }> = ({ t, n, k }) => (
  <g opacity={k}>
    {Array.from({ length: n }, (_, i) => {
      const a = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, b = Math.abs(Math.sin(i * 78.233) * 12543.13) % 1;
      const y = ((t * (260 + 160 * b) + a * 2200) % 2200) - 200, x = a * 1080 + 50 * Math.sin(t * 2 + i);
      return <rect key={i} x={x} y={y} width={84} height={46} rx={4} fill="#9cc49a" stroke={INK} strokeWidth={3.5} transform={`rotate(${40 * Math.sin(t * 3 + i)} ${x + 42} ${y + 23})`} />;
    })}
  </g>
);
const Fog: React.FC<{ t: number; y0: number; n: number; o: number }> = ({ t, y0, n, o }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const x = ((i * 397 + t * (30 + i * 9)) % 1600) - 260, y = y0 + (i % 4) * 90 + 20 * Math.sin(t * 0.5 + i);
      return <ellipse key={i} cx={x} cy={y} rx={300 + (i % 3) * 80} ry={60 + (i % 2) * 20} fill="#e8eef4" opacity={o * (0.5 + 0.5 * ((i * 7) % 3) / 2)} />;
    })}
  </g>
);
const Bars: React.FC<{ xs: number[] }> = ({ xs }) => (
  <g>
    {xs.map((x) => (
      <g key={x}>
        <rect x={x - 20} y={-20} width={40} height={1960} fill="#3a3c46" stroke={INK} strokeWidth={7} />
        <rect x={x - 10} y={-20} width={8} height={1960} fill="rgba(255,255,255,0.18)" />
      </g>
    ))}
    {[430, 1840].map((y) => <g key={y}><rect x={-20} y={y} width={1120} height={44} fill="#3a3c46" stroke={INK} strokeWidth={7} /><rect x={-20} y={y + 8} width={1120} height={8} fill="rgba(255,255,255,0.15)" /></g>)}
  </g>
);
const Banner: React.FC<{ x: number; y: number; k: number; text: string }> = ({ x, y, k, text }) => {
  if (k <= 0) return null;
  const s = Easing.out(Easing.back(2))(clamp01(k));
  return (
    <g transform={`translate(${x},${y}) scale(${s}) rotate(-3)`}>
      <path d="M-250,-48 L250,-48 L230,0 L250,48 L-250,48 L-230,0 Z" fill="#b3262f" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <path d="M-226,-34 H226" stroke="rgba(255,255,255,0.25)" strokeWidth={4} />
      <text x={0} y={14} textAnchor="middle" fontFamily={serif} fontWeight={800} fontSize={42} fill="#ffe9b0" letterSpacing={2}>{text}</text>
    </g>
  );
};
const Sign: React.FC<{ x: number; y: number; k: number; t: number }> = ({ x, y, k, t }) => {
  if (k <= 0) return null;
  const sw = 6 * Math.sin(t * 3) * Math.exp(-Math.max(0, k - 0.3) * 0.5);
  const drop = -260 * (1 - Easing.out(Easing.bounce)(clamp01(k)));
  return (
    <g transform={`translate(${x},${y + drop})`}>
      <path d={`M-120,-130 L0,-210 L120,-130`} fill="none" stroke="#5a4636" strokeWidth={6} />
      <g transform={`rotate(${sw} 0 -210)`}>
        <rect x={-200} y={-140} width={400} height={150} rx={14} fill="#c98a4a" stroke={INK} strokeWidth={8} />
        <rect x={-186} y={-126} width={372} height={122} rx={10} fill="none" stroke="rgba(255,240,200,0.4)" strokeWidth={4} />
        <text x={0} y={-48} textAnchor="middle" fontFamily={serif} fontWeight={900} fontSize={56} fill="#fff4dc" stroke={INK} strokeWidth={3} paintOrder="stroke">NOT FOR SALE</text>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------- living figures
/** standing characters never freeze: a breath, a slow weight shift and small head moves (off while walking) */
const alive = (p: Pose, T: number, seed: number): Pose => {
  if ((p.walk ?? 0) > 0.05) return p;
  const b = 1.6 * Math.sin(T * 2.3 + seed * 1.7) + 1.2;
  return { ...p, bob: (p.bob ?? 0) + b, headTilt: (p.headTilt ?? 0) + 2.2 * Math.sin(T * 1.1 + seed * 2.3) + 1.2 * Math.sin(T * 2.9 + seed),
    lean: (p.lean ?? 0) + 1.5 * Math.sin(T * 0.8 + seed * 0.9) };
};
const AFigure: React.FC<React.ComponentProps<typeof Figure>> = (props) => {
  const T = useCurrentFrame() / FPS;
  const seed = props.id.split("").reduce((m, ch) => m + ch.charCodeAt(0), 0) % 17;
  return <Figure {...props} pose={alive(props.pose, T, seed)} />;
};

// ---------------------------------------------------------------- generic helpers for the new shots
type Cam = { z0: number; z1: number; cx: number; cy: number; dx?: number; dy?: number };
const at = (x: number, y: number, t: number, dur: number, c: Cam) => camXY(x, y, t, dur, c.z0, c.z1, c.cx, c.cy, c.dx ?? 0, c.dy ?? 0);
const PlateC: React.FC<{ src: string; t: number; dur: number; c: Cam; blur?: number; bright?: number }> = ({ src, t, dur, c, blur = 0, bright = 1 }) => (
  <Plate src={src} t={t} dur={dur} z0={c.z0} z1={c.z1} cx={c.cx} cy={c.cy} dx={c.dx} dy={c.dy} blur={blur} bright={bright} />
);

// 4. newspaper close-up: Lustig reads about the costly repairs, lowers the paper and gives us a sly look
const ShotNews: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const lower = Easing.inOut(Easing.cubic)(clamp01((T - (W("fortune") - 0.25)) / 0.5));
  const pose: Pose = { expr: lower > 0.5 ? "sly" : "neutral", lookY: lower > 0.5 ? 0 : 0.8, lookX: lower > 0.5 ? 0.2 : -0.4 + 0.8 * ((t * 0.7) % 1),
    ex: lower > 0.5 ? { brow: -12, browTilt: -12 } : {}, blink: blinkAt(T, 7), facing: 0.1, headTilt: 3 * lower };
  const ny = 1130 + 360 * lower, rot = -3 + 2 * Math.sin(t * 1.5);
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_room.png" t={t} dur={dur} c={{ z0: 1.25, z1: 1.32, cx: 540, cy: 900 }} blur={3.2} bright={0.95} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.33} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <AFigure id="ln" look={LUSTIG} x={540} y={2060 + 6 * Math.sin(t * 2)} s={4.3} pose={pose} shadow={false} />
        <Newspaper x={540} y={ny} w={900} h={640} rot={rot} />
        {[-1, 1].map((sd) => <circle key={sd} cx={540 + sd * 430} cy={ny + 60 - sd * 10} r={44} fill="#f3dcc0" stroke={INK} strokeWidth={8} />)}
        <Motes t={T} n={22} seed={4} />
      </svg>
    </AbsoluteFill>
  );
};

// 5. letterhead: behind his desk Lustig stamps letter after letter, then shows one off with a wink
const ShotStamp: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const hits = [15.55, 16.17, 16.79];
  const n = hits.filter((h) => T > h).length;
  const sy = (() => { for (const h of hits) { const k = T - (h - 0.22); if (k >= 0 && k < 0.45) return k < 0.22 ? -120 + 120 * Easing.in(Easing.quad)(k / 0.22) : -120 * Easing.out(Easing.quad)((k - 0.22) / 0.23); } return -120; })();
  const show = T > 16.95;
  const pose: Pose = { expr: show ? "smug" : "sly", facing: 0.45, lookX: show ? 0.2 : 0.8, lookY: show ? 0 : 0.8, blink: blinkAt(T, 8),
    gesture: show ? "offer" : "rub", gk: 1, hold: show ? "letter" : null, wink: T > 17.1 && T < 17.45, bob: hits.some((h) => T > h && T < h + 0.12) ? 4 : 0 };
  const top = 1720;
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_room.png" t={t} dur={dur} c={{ z0: 1.0, z1: 1.05, cx: 540, cy: 1200 }} blur={0.8} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.28} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <AFigure id="ls" look={LUSTIG} x={400} y={1880} s={1.8} pose={pose} shadow={false} />
        <Desk top={top} />
        {Array.from({ length: n }, (_, i) => <Letter key={i} x={760 + i * 4} y={top - 6 - i * 7} rot={-4 + i * 3} />)}
        {!show && <Letter x={760} y={top - 6 - n * 7} seal={false} rot={2} />}
        <Stamp x={770} y={top - 26 - n * 7 + sy} />
        {hits.map((h, i) => <Sparkle key={i} x={770} y={top - 30 - i * 7} k={(T - h) / 0.35} />)}
        <Motes t={T} n={18} seed={5} />
      </svg>
    </AbsoluteFill>
  );
};


// 6a. "deputy director": a medium close-up, Lustig straightens his bowler and puffs his chest; the camera pushes in
const ShotDeputy: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const push = Easing.inOut(Easing.cubic)(clamp01(t / dur));
  const tip = ramp(T, W("himself") - 0.1, 0.2) * (1 - ramp(T, W("deputy") - 0.05, 0.25));
  const puff = ramp(T, W("deputy") - 0.1, 0.3);
  const pose: Pose = { expr: puff > 0.5 ? "smug" : "sly", hatLift: tip, facing: 0.2, lean: -5 * puff, headTilt: -5 * puff, lookX: puff > 0.5 ? 0.3 : -0.5, lookY: puff > 0.5 ? -0.3 : 0,
    gesture: puff > 0.5 ? "hips" : "none", gk: puff, blink: blinkAt(T, 30), ex: puff > 0.5 ? { brow: -10, browTilt: -10 } : {} };
  const s = 2.7 + 0.3 * push;
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_salon.png" t={t} dur={dur} c={{ z0: 1.3, z1: 1.42, cx: 540, cy: 1100, dx: -30 }} blur={2.4} bright={0.97} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.32} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Motes t={T} n={22} seed={17} />
        <AFigure id="ldep" look={LUSTIG} x={540 - 20 * push} y={1760 + 30 * push} s={s} pose={pose} shadow={false} />
        <Banner x={540} y={560} k={(T - (W("deputy") - 0.1)) / 0.4} text="DEPUTY DIRECTOR" />
        <Sparkle x={300} y={500} k={(T - W("director")) / 0.5} />
        <Sparkle x={790} y={620} k={(T - W("director") - 0.12) / 0.5} />
      </svg>
    </AbsoluteFill>
  );
};

// 7a. "the pitch? top secret": a close-up, Lustig leans in, finger to his chin, eyes darting left and right
const ShotSecret: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const push = Easing.inOut(Easing.cubic)(clamp01(t / dur));
  const sec = T > W("top") - 0.1;
  const dart = sec ? (Math.sin((T - W("top")) * 7) > 0 ? 1 : -1) : 0;
  const pose: Pose = { expr: sec ? "sly" : "smile", facing: 0.1, gesture: sec ? "rub" : "present", gk: ramp(T, a + 0.05, 0.25), lookX: dart, blink: blinkAt(T, 31),
    lean: 6 * push, headTilt: sec ? 6 : 0, ex: sec ? { brow: -12, browTilt: -14 } : {} };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_salon.png" t={t} dur={dur} c={{ z0: 1.45, z1: 1.55, cx: 400, cy: 1100, dx: 20 }} blur={3.2} bright={0.93} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.38 + 0.08 * push} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Motes t={T} n={18} seed={18} />
        <AFigure id="lsec" look={LUSTIG} x={560} y={1900 + 30 * push} s={4.2 + 0.3 * push} pose={pose} shadow={false} />
      </svg>
    </AbsoluteFill>
  );
};

// 7c. the dealers' reaction: three faces, wide-eyed; on "lucky bidder" they all shoot a hand up to bid
const ShotDealers: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.45, z1: 1.62, cx: 560, cy: 1500 };
  const bid = (d: number) => ramp(T, W("bidder") - 0.25 + d, 0.18);
  const dp = (seed: number, d: number, look: number): Pose => ({ expr: bid(d) > 0.5 ? "happy" : "amazed", facing: 0.3, blink: blinkAt(T, seed), lookX: look,
    gesture: bid(d) > 0.02 ? "point" : "none", gk: bid(d), bob: 4 * bid(d) * Math.abs(Math.sin((T - 29.4) * 8)), ex: { blush: 0.8 } });
  const D2 = at(250, 1780, t, dur, c), D1 = at(830, 1770, t, dur, c), P = at(540, 1850, t, dur, c);
  const pp: Pose = { ...dp(32, 0, 0), gesture: bid(0.1) > 0.02 ? "point" : "rub", gk: 1, expr: bid(0.1) > 0.5 ? "happy" : "amazed" };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_salon.png" t={t} dur={dur} c={c} blur={1.6} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.32} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        <AFigure id="rd2" look={EXTRA2} x={D2.x} y={D2.y} s={1.25 * D2.z} pose={dp(33, 0.08, 0.6)} />
        <AFigure id="rd1" look={DEALER3} x={D1.x} y={D1.y} s={1.25 * D1.z} flip pose={dp(34, 0.16, 0.6)} />
        <AFigure id="rp" look={POISSON} x={P.x} y={P.y} s={1.4 * P.z} flip pose={pp} />
        {[0, 1, 2].map((i) => <Sparkle key={i} x={[260, 820, 560][i]} y={[620, 640, 520][i]} k={(T - W("lucky") - i * 0.1) / 0.5} />)}
        <Motes t={T} n={22} seed={19} />
      </svg>
    </AbsoluteFill>
  );
};

// 12b. this dealer smells a rat: close-up, he sniffs the air, squints, and a rat pops up beside him
const ShotSniff: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const push = Easing.inOut(Easing.cubic)(clamp01(t / dur));
  const sniff = T > W("smelled") - 0.3 && T < W("rat") - 0.05, rat = T > W("rat") - 0.05;
  const pose: Pose = { expr: "stern", facing: 0.15, blink: blinkAt(T, 35), lookY: sniff ? -0.8 : rat ? 0.7 : 0, lookX: rat ? -1 : 0,
    headTilt: sniff ? -8 + 4 * Math.sin((T - 46.6) * 16) : rat ? 6 : 0, ex: { eyes: sniff ? "closed" : "squint", brow: 6, browTilt: -16 }, mouth: rat ? "frown" : sniff ? "M" : null };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_salon.png" t={t} dur={dur} c={{ z0: 1.5, z1: 1.6, cx: 820, cy: 1000 }} blur={3.2} bright={0.95} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.36} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Motes t={T} n={18} seed={20} />
        <AFigure id="dsn" look={DEALER3} x={600} y={1880 + 20 * push} s={4.1 + 0.3 * push} flip pose={pose} shadow={false} />
        {sniff && [0, 1].map((i) => { const k = ((T * 2.2 + i * 0.5) % 1); return (
          <path key={i} d={`M${340 - 40 * k},${1020 - 60 * k} q-30,-20 0,-40 q30,-20 0,-40`} fill="none" stroke="#fff6e0" strokeWidth={6} strokeLinecap="round" opacity={0.8 * (1 - k)} />); })}
        <g transform="translate(250,1260) scale(2.2)"><Rat x={0} y={0} k={(T - (W("rat") - 0.1)) / 0.35} t={T} /></g>
      </svg>
    </AbsoluteFill>
  );
};

// 14b. "out of Al Capone": a close-up of Capone chuckling as the name lands
const ShotCaponeClose: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const push = Easing.inOut(Easing.cubic)(clamp01(t / dur));
  const laugh = T > W("capone") - 0.1;
  const pose: Pose = { expr: laugh ? "laugh" : "smile", facing: 0.15, blink: blinkAt(T, 36), gesture: "hips", gk: 1, lookX: -0.4,
    bob: laugh ? 5 * Math.abs(Math.sin((T - 52.2) * 10)) : 0, headTilt: laugh ? 5 * Math.sin((T - 52.2) * 6) : 0 };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_office.png" t={t} dur={dur} c={{ z0: 1.45, z1: 1.55, cx: 760, cy: 1000, dx: -20 }} blur={3.2} bright={0.95} />
      <Haze top="rgba(255,190,140,0.05)" vig={0.36} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Motes t={T} n={14} seed={21} />
        <AFigure id="capc" look={CAPONE} x={540} y={1840 + 20 * push} s={4.0 + 0.3 * push} flip pose={pose} shadow={false} />
      </svg>
    </AbsoluteFill>
  );
};

// 6. the fancy hotel: "deputy director" Lustig welcomes the scrap-metal dealers into the salon
const SAL = { gy: 1850, s: 1.15 };
const ShotSalonWide: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.0, z1: 1.2, cx: 540, cy: 1560, dx: -50 };
  const L = at(540, SAL.gy, t, dur, c);
  const left = T < 21.3, bow = ramp(T, 22.45, 0.2) * (1 - ramp(T, 23.0, 0.25));
  const lp: Pose = { expr: bow > 0.3 ? "happy" : "smile", facing: left ? -0.3 : 0.4, gesture: T < 20.1 ? "hips" : left ? "wave" : "present", gk: T < 20.1 ? 1 : ramp(T, 20.1, 0.25),
    talk: T, blink: blinkAt(T, 9), lookX: left ? -0.8 : 0.8, lean: 12 * bow, headTilt: 6 * bow };
  const sD = SAL.s * 0.92;
  const d1 = walker(T, 19.7, 22.85, 3.0), d2 = walker(T, 20.0, 22.9, 3.0), d3 = walker(T, 20.4, 22.95, 2.5);
  const p1 = at(-90 + d1.dist * sD, SAL.gy + 10, t, dur, c), p2 = at(1170 - d2.dist * sD, SAL.gy + 20, t, dur, c), p3 = at(-120 + d3.dist * sD * 0.8, SAL.gy - 40, t, dur, c);
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_salon.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.28} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        {shadowAt(p3.x, p3.y, sD * 0.8 * p3.z)}
        <AFigure id="d3" look={DEALER3} x={p3.x} y={p3.y} s={sD * 0.8 * p3.z} shadow={false} pose={{ phase: d3.phase, walk: d3.walk, expr: "amazed", facing: 0.5, blink: blinkAt(T, 12), lookY: -1 }} />
        {shadowAt(L.x, L.y, SAL.s * L.z)}
        <AFigure id="lw2" look={LUSTIG} x={L.x} y={L.y} s={SAL.s * L.z} pose={lp} shadow={false} />
        {shadowAt(p1.x, p1.y, sD * p1.z)}
        <AFigure id="d1" look={EXTRA1} x={p1.x} y={p1.y} s={sD * p1.z} shadow={false} pose={{ phase: d1.phase, walk: d1.walk, expr: T > 22.6 ? "happy" : "amazed", facing: 0.5, blink: blinkAt(T, 10), lookY: T < 21.8 ? -1 : 0 }} />
        {shadowAt(p2.x, p2.y, sD * 1.05 * p2.z)}
        <AFigure id="pw" look={POISSON} x={p2.x} y={p2.y} s={sD * 1.05 * p2.z} flip shadow={false} pose={{ phase: d2.phase, walk: d2.walk, expr: T > 22.6 ? "happy" : "amazed", facing: 0.5, blink: blinkAt(T, 11), lookY: T < 22.0 ? -1 : 0 }} />
        <Sparkle x={300} y={420} k={(T - W("fancy")) / 0.5} />
        <Sparkle x={800} y={360} k={(T - W("fancy") - 0.15) / 0.5} />
        <Motes t={T} n={30} seed={6} />
      </svg>
    </AbsoluteFill>
  );
};

// 7. the pitch: top secret, the tower comes down, thousands of tons of iron for one lucky bidder
const ShotPitch: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.28, z1: 1.45, cx: 540, cy: 1600, dx: -70 };
  const gy = 1790;
  const L = at(290, gy, t, dur, c), P = at(800, gy + 10, t, dur, c), D1 = at(980, gy - 60, t, dur, c), D2 = at(640, gy - 80, t, dur, c);
  const secret = T > W("top") - 0.1 && T < W("paris", 1) - 0.1;
  const point = T > W("one", 0) - 0.1 && T > 28.8;
  const lp: Pose = { expr: secret ? "sly" : point ? "happy" : "smile", facing: 0.5, blink: blinkAt(T, 13),
    gesture: T > W("down") - 0.1 && T < W("thousands") - 0.2 ? "shrug" : T > W("thousands") - 0.2 ? "present" : "point", gk: 1, lean: T > W("down") - 0.1 && T < 27.2 ? -6 : 3,
    lookX: secret ? Math.sin((T - 24.4) * 9) : 0.7, ex: secret ? { brow: -10, browTilt: -12 } : {} };
  const wow = T > W("thousands") - 0.05;
  const dp = (seed: number, flipLook = 0): Pose => ({ expr: wow ? (seed === 1 ? "amazed" : "surprised") : "neutral", facing: 0.5, blink: blinkAt(T, seed + 20),
    lookY: T > W("paris", 1) - 0.2 && T < 28.4 ? -0.9 : 0, lookX: flipLook, bob: wow ? 2 * Math.abs(Math.sin((T - 27) * 7)) : 0, lean: T > W("down") && T < W("down") + 0.6 ? -8 * Math.sin(Math.PI * (T - W("down")) / 0.6) : 0 });
  const bub = (T - (W("paris", 1) - 0.25)) / 0.35;
  const fall = Easing.in(Easing.quad)(clamp01((T - W("down")) / 0.55));
  const pile = clamp01((T - (W("thousands") - 0.2)) / 0.4);
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_salon.png" t={t} dur={dur} c={c} blur={0.6} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.3} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        {shadowAt(D2.x, D2.y, 0.95 * D2.z)}
        <AFigure id="pd2" look={EXTRA2} x={D2.x} y={D2.y} s={0.95 * D2.z} flip shadow={false} pose={dp(2)} />
        {shadowAt(D1.x, D1.y, 1.0 * D1.z)}
        <AFigure id="pd1" look={DEALER3} x={D1.x} y={D1.y} s={1.0 * D1.z} flip shadow={false} pose={dp(3)} />
        {shadowAt(P.x, P.y, 1.12 * P.z)}
        <AFigure id="pp2" look={POISSON} x={P.x} y={P.y} s={1.12 * P.z} flip shadow={false} pose={dp(1, 0.6)} />
        {shadowAt(L.x, L.y, 1.22 * L.z)}
        <AFigure id="lp" look={LUSTIG} x={L.x} y={L.y} s={1.22 * L.z} pose={lp} shadow={false} />
        <Bubble x={560} y={520} k={bub} tailX={L.x + 80} tailY={L.y - 520}>
          {pile < 1 && <MiniTower x={-10 + 60 * fall} y={50} s={1.3} rot={80 * fall} />}
          {pile > 0 && (
            <g opacity={pile}>
              {Array.from({ length: 12 }, (_, i) => {
                const row = Math.floor(i / 4), col = i % 4;
                return <rect key={i} x={-170 + col * 86 + row * 40} y={70 - row * 34} width={82} height={30} rx={3} fill="#5a5a72" stroke={INK} strokeWidth={4} transform={`translate(0,${(1 - pile) * -60})`} />;
              })}
              <text x={0} y={-60} textAnchor="middle" fontFamily={serif} fontWeight={900} fontSize={54} fill="#3a2c30">IRON</text>
            </g>
          )}
        </Bubble>
        <Motes t={T} n={24} seed={7} />
      </svg>
    </AbsoluteFill>
  );
};

// 8. Poisson bites: hook, line and tower
const ShotHook: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const drop = Easing.out(Easing.back(1.4))(clamp01((T - (W("hook") - 0.35)) / 0.5));
  const hx = 560 + 26 * Math.sin((T - 31.5) * 2.4), hy = -200 + 860 * drop;
  const bit = T > W("bit") - 0.05, dreamy = T > W("tower", 3) - 0.1;
  const pose: Pose = { expr: dreamy ? "happy" : bit ? "amazed" : "neutral", facing: 0.15, blink: blinkAt(T, 14),
    lookY: bit && !dreamy ? -1 : 0, lookX: bit && !dreamy ? (hx - 560) / 60 : 0, ex: dreamy ? { blush: 1 } : {}, headTilt: dreamy ? 5 * Math.sin((T - 32.8) * 3) : 0 };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_salon.png" t={t} dur={dur} c={{ z0: 1.5, z1: 1.66, cx: 700, cy: 1000 }} blur={3.2} bright={0.95} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.33} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Motes t={T} n={22} seed={8} />
        <AFigure id="ph" look={POISSON} x={540} y={2080 + 5 * Math.sin(t * 2) + 50 * smooth(t / dur)} s={4.2 + 0.35 * smooth(t / dur)} flip pose={pose} shadow={false} />
        {drop > 0 && (
          <g>
            <line x1={hx} y1={-20} x2={hx} y2={hy} stroke="#2a2230" strokeWidth={4} />
            <path d={`M${hx},${hy} v40 q0,36 -30,30 q-18,-6 -14,-26`} fill="none" stroke="#8a8a9a" strokeWidth={9} strokeLinecap="round" />
            <path d={`M${hx},${hy} v40 q0,36 -30,30 q-18,-6 -14,-26`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
            <MiniTower x={hx - 30} y={hy + 160} s={0.75} col="#e6c25a" rot={8 * Math.sin((T - 31.5) * 3)} />
            <Sparkle x={hx - 30} y={hy + 100} k={(T - W("tower", 3)) / 0.5} />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// 9. cash in hand: Poisson pays, Lustig pockets it with a grin
const ShotCash: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.3, z1: 1.5, cx: 540, cy: 1620, dx: -30 };
  const gy = 1760, s = 1.45;
  const L = at(330, gy, t, dur, c), P = at(760, gy + 6, t, dur, c);
  const handT = W("cash") + 0.1;
  const got = T > handT;
  const lp: Pose = { expr: got ? "happy" : "smile", facing: 0.6, gesture: got ? "offer" : "offer", gk: got ? 1 : ramp(T, 33.3, 0.3) * 0.9, hold: got ? "cash" : null, blink: blinkAt(T, 15), lookX: got ? 0 : 0.8, ex: got ? { eyes: "sly" } : {}, hatLift: ramp(T, handT + 0.35, 0.2) * (1 - ramp(T, handT + 0.9, 0.25)), wink: T > handT + 0.4 && T < handT + 0.8 };
  const pp: Pose = { expr: got ? "laugh" : "smile", facing: 0.5, gesture: "offer", gk: got ? 1 - ramp(T, handT, 0.3) : ramp(T, 33.25, 0.25), hold: got ? null : "cash", blink: blinkAt(T, 16), lookX: 0.6 };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_salon.png" t={t} dur={dur} c={c} blur={0.8} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.3} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        {shadowAt(P.x, P.y, s * P.z)}
        <AFigure id="pc" look={POISSON} x={P.x} y={P.y} s={s * P.z} flip pose={pp} shadow={false} />
        {shadowAt(L.x, L.y, s * L.z)}
        <AFigure id="lc2" look={LUSTIG} x={L.x} y={L.y} s={s * L.z} pose={lp} shadow={false} />
        <Sparkle x={L.x + 90 * s} y={L.y - 280 * s} k={(T - handT) / 0.5} />
        <Motes t={T} n={24} seed={9} />
      </svg>
    </AbsoluteFill>
  );
};

// 10. the getaway: Lustig hurries along the platform with a suitcase full of money; the camera tracks with him
const ShotStation: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.12, z1: 1.18, cx: 840, cy: 1800, dx: -60 };
  const gy = 1880, s = 1.3;
  const wk = walker(T, a + 0.05, b + 0.5, 3.6);
  const L = at(560 + wk.dist * s, gy, t, dur, c);
  const lp: Pose = { phase: wk.phase, walk: Math.max(wk.walk, T > a + 0.2 ? 1 : 0), expr: "happy", ex: { eyes: "sly" }, facing: 0.7, lean: 7, hold: "case", blink: blinkAt(T, 17), lookX: 0.8 };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_station.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,200,170,0.06)" vig={0.28} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        {shadowAt(L.x, L.y, s * L.z)}
        <AFigure id="lst" look={LUSTIG} x={L.x} y={L.y} s={s * L.z} pose={lp} shadow={false} />
        {Array.from({ length: 5 }, (_, i) => {
          const k = ((t * 0.5 + i * 0.2) % 1);
          return <ellipse key={i} cx={180 + i * 190 + 60 * k} cy={1100 - 260 * k} rx={140 + 120 * k} ry={70 + 60 * k} fill="#ffffff" opacity={0.22 * (1 - k)} />;
        })}
        <Motes t={T} n={26} seed={10} />
      </svg>
    </AbsoluteFill>
  );
};

// 11. Poisson at the police station door: too embarrassed to go in, he turns around
const ShotPolice: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.05, z1: 1.14, cx: 600, cy: 1600 };
  const gy = 1800, s = 1.1;
  const w1 = walker(T, a + 0.1, 39.4, 3.0), w2 = walker(T, 41.35, b + 0.8, 4.0);
  const back = T > 41.3;
  const x = 150 + w1.dist * s - w2.dist * s;
  const P = at(x, gy, t, dur, c);
  const pp: Pose = { phase: back ? w2.phase : w1.phase, walk: back ? Math.max(w2.walk, 0) : w1.walk, expr: T < 38.6 ? "neutral" : "worried",
    ex: T > W("embarrassed") ? { blush: 1.3 } : {}, facing: 0.5, lookX: back ? 0 : 0.6, lookY: back ? 0.8 : T > 39.6 ? -0.2 : 0, blink: blinkAt(T, 18),
    gesture: T > 39.7 && T < 41.2 ? "rub" : "none", gk: ramp(T, 39.7, 0.25) * (1 - ramp(T, 41.0, 0.25)), headTilt: back ? -6 : 0 };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_police.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(150,170,255,0.05)" vig={0.32} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        {(() => { const q = at(520, 1150, t, dur, c); return (
          <g transform={`translate(${q.x},${q.y}) scale(${q.z})`}>
            <rect x={-110} y={-36} width={220} height={72} rx={10} fill="#1f3f8a" stroke={INK} strokeWidth={6} />
            <rect x={-100} y={-26} width={200} height={52} rx={6} fill="none" stroke="#e8eefc" strokeWidth={3} />
            <text x={0} y={14} textAnchor="middle" fontFamily={serif} fontWeight={900} fontSize={40} fill="#f4f6ff" letterSpacing={4}>POLICE</text>
            <ellipse cx={0} cy={0} rx={190} ry={90} fill="rgba(120,160,255,0.12)" />
          </g>); })()}
        {shadowAt(P.x, P.y, s * P.z)}
        <AFigure id="pol" look={POISSON} x={P.x} y={P.y} s={s * P.z} flip={back} pose={pp} shadow={false} />
        <Motes t={T} n={16} seed={11} />
      </svg>
    </AbsoluteFill>
  );
};

// 12. back for a second sale: this dealer smells a rat
const ShotAgain: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.22, z1: 1.42, cx: 620, cy: 1650, dx: -40 };
  const gy = 1770, s = 1.4;
  const L = at(400, gy, t, dur, c), D = at(830, gy + 6, t, dur, c);
  const sus = T > W("smelled") - 0.4, rat = T > W("rat") - 0.05, flee = T > 47.45;
  const lp: Pose = { expr: flee ? "worried" : "smile", facing: 0.55, gesture: flee ? "none" : "offer", gk: ramp(T, 43.3, 0.3), hold: flee ? null : "letter", blink: blinkAt(T, 19),
    lookX: flee ? 1 : 0.7, ex: T < 45.4 ? { eyes: "sly" } : {} };
  const dp: Pose = { expr: sus ? "stern" : "neutral", facing: 0.4, blink: blinkAt(T, 21), lookY: sus && !rat ? -0.8 : rat ? 1 : 0, lookX: rat ? 0.5 : 0,
    headTilt: sus && !rat ? -8 + 3 * Math.sin((T - 46.6) * 14) : 0, ex: sus ? { eyes: "squint" } : {}, gesture: rat ? "point" : "none", gk: ramp(T, W("rat"), 0.2) * 0.7 };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_salon.png" t={t} dur={dur} c={c} blur={0.8} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.32} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        {shadowAt(D.x, D.y, s * D.z)}
        <AFigure id="da" look={DEALER3} x={D.x} y={D.y} s={s * D.z} flip pose={dp} shadow={false} />
        {shadowAt(L.x, L.y, s * L.z)}
        <AFigure id="la" look={LUSTIG} x={L.x} y={L.y} s={s * L.z} pose={lp} shadow={false} />
        <Rat x={L.x + 150} y={L.y - 30} k={(T - (W("rat") - 0.1)) / 0.35} t={T} />
        <Motes t={T} n={20} seed={12} />
      </svg>
    </AbsoluteFill>
  );
};

// 13. off to America: Lustig hurries along the quay to the liner and waves goodbye
const ShotLiner: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.0, z1: 1.05, cx: 300, cy: 1880 };
  const s = 1.0;
  const stop = 48.95;
  const wk = walker(T, a, stop, 3.6);
  const lx = 40 + wk.dist * s, L = at(lx, 1700 + (lx - 40) * 0.37, t, dur, c);
  const lp: Pose = { phase: wk.phase, walk: wk.walk, expr: T > stop ? "happy" : "smile", facing: T > stop ? 0.1 : 0.7, hold: "case", lean: T < stop ? 5 : 0,
    gesture: T > stop ? "wave" : "none", gk: ramp(T, stop, 0.2), talk: T, blink: blinkAt(T, 22) };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_liner.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,200,160,0.06)" vig={0.28} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        <Birds t={T} y0={300} n={6} seed={3} />
        {shadowAt(L.x, L.y, s * L.z)}
        <AFigure id="lli" look={LUSTIG} x={L.x} y={L.y} s={s * L.z} pose={lp} shadow={false} />
        <Motes t={T} n={18} seed={13} />
      </svg>
    </AbsoluteFill>
  );
};

// 14. Chicago: Lustig charms $5,000 out of Al Capone
const ShotCapone: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.32, cx: 560, cy: 1650, dx: 30 };
  const gy = 1770, s = 1.4;
  const L = at(320, gy, t, dur, c), C = at(790, gy + 4, t, dur, c);
  const payT = W("5000") + 0.25, got = T > W("out") + 0.05;
  const lp: Pose = { expr: got ? "smug" : "smile", facing: 0.6, gesture: got ? "offer" : "present", gk: ramp(T, a + 0.1, 0.3), hold: got ? "cash" : null, blink: blinkAt(T, 23), lookX: 0.7 };
  const cp: Pose = { expr: T < W("charmed") + 0.2 ? "stern" : T < payT - 0.3 ? "neutral" : "smile", lean: T < W("charmed") + 0.2 ? -6 : 0, lookY: T < payT - 0.3 ? 0.2 : 0, facing: 0.5, gesture: T > payT - 0.3 && !got ? "offer" : got ? "hips" : "hips",
    gk: 1, hold: T > payT - 0.3 && !got ? "cash" : null, blink: blinkAt(T, 24), lookX: 0.6 };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_office.png" t={t} dur={dur} c={c} blur={0.6} />
      <Haze top="rgba(255,190,140,0.05)" vig={0.33} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        {shadowAt(C.x, C.y, s * 1.02 * C.z)}
        <AFigure id="cap" look={CAPONE} x={C.x} y={C.y} s={s * 1.02 * C.z} flip pose={cp} shadow={false} />
        {shadowAt(L.x, L.y, s * L.z)}
        <AFigure id="lcp" look={LUSTIG} x={L.x} y={L.y} s={s * L.z} pose={lp} shadow={false} />
        <Sparkle x={L.x + 70 * s} y={L.y - 300 * s} k={(T - (W("charmed") - 0.05)) / 0.5} />
        <Sparkle x={L.x + 110 * s} y={L.y - 150 * s} k={(T - (W("out") + 0.05)) / 0.5} />
        <Motes t={T} n={18} seed={14} />
      </svg>
    </AbsoluteFill>
  );
};

// 15. the fake money-printing box: Lustig cranks it for an astonished buyer
const ShotBox: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.25, z1: 1.32, cx: 560, cy: 1700, dx: 20 };
  const gy = 1790, s = 1.4;
  const L = at(300, gy, t, dur, c), B = at(820, gy + 4, t, dur, c);
  const crank = Math.max(0, T - 53.4) * 1.6;
  const lp: Pose = { expr: "sly", facing: 0.6, gesture: "present", gk: ramp(T, a + 0.1, 0.3), blink: blinkAt(T, 25), lookX: 0.8, ex: { brow: -10 } };
  const bp: Pose = { expr: T > W("printing") ? "amazed" : "surprised", facing: 0.4, blink: blinkAt(T, 26), lookY: 0.6, lookX: -0.4, ex: { blush: 0.8 } };
  const bx = at(570, gy - 40, t, dur, c);
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_office.png" t={t} dur={dur} c={c} blur={1.2} />
      <Haze top="rgba(255,190,140,0.05)" vig={0.33} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <GroundDefs />
        {shadowAt(B.x, B.y, s * B.z)}
        <AFigure id="buy" look={BUYER} x={B.x} y={B.y} s={s * B.z} flip pose={bp} shadow={false} />
        {shadowAt(L.x, L.y, s * L.z)}
        <AFigure id="lbx" look={LUSTIG} x={L.x} y={L.y} s={s * L.z} pose={lp} shadow={false} />
        {/* a little side table under the box */}
        <g transform={`translate(${bx.x},${bx.y}) scale(${bx.z})`}>
          <rect x={-120} y={-12} width={240} height={26} rx={6} fill="#6a3c22" stroke={INK} strokeWidth={6} />
          {[-90, 90].map((x) => <rect key={x} x={x - 9} y={12} width={18} height={70} fill="#5a321c" stroke={INK} strokeWidth={5} />)}
          <MoneyBox x={0} y={-12} s={0.8} crank={crank} notes={T > 53.5 ? 4 : 0} t={T} />
        </g>
        <Motes t={T} n={16} seed={15} />
      </svg>
    </AbsoluteFill>
  );
};

// 16. real fake money: Lustig laughs as his counterfeit notes rain down
const ShotMoney: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const pose: Pose = { expr: T > W("real") - 0.1 ? "laugh" : "smug", facing: 0.1, blink: blinkAt(T, 27), lookY: -0.5, hold: "cash", gesture: "shrug", gk: 0.8 + 0.2 * Math.sin(t * 6),
    bob: T > W("real") ? 4 * Math.abs(Math.sin(t * 9)) : 0, headTilt: 3 * Math.sin(t * 5) };
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_office.png" t={t} dur={dur} c={{ z0: 1.45, z1: 1.55, cx: 540, cy: 1000 }} blur={3.2} bright={0.95} />
      <Haze top="rgba(255,190,140,0.05)" vig={0.33} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <FallingNotes t={t} n={14} k={clamp01(t / 0.4) * 0.6} />
        <AFigure id="lm" look={LUSTIG} x={560} y={1950} s={3.0} pose={pose} shadow={false} />
        <FallingNotes t={t + 3.3} n={10} k={clamp01((t - 0.3) / 0.4)} />
      </svg>
    </AbsoluteFill>
  );
};

// 17. Alcatraz in the fog
const ShotAlcatraz: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const slam = clamp01(1 - (T - (W("alcatraz") + 0.45)) / 0.25);
  const shake = T > W("alcatraz") + 0.45 && T < W("alcatraz") + 0.75 ? 8 * Math.sin(T * 90) : 0;
  return (
    <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.5}px)` }}>
      <PlateC src="eiffel/bg_alcatraz.png" t={t} dur={dur} c={{ z0: 2.0, z1: 2.12, cx: 720, cy: 1700 }} />
      <Haze top="rgba(170,190,230,0.06)" vig={0.34} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Fog t={T} y0={1050} n={9} o={0.16} />
        <Birds t={T} y0={380} n={3} seed={5} />
        <Fog t={T + 7} y0={1450} n={7} o={0.14} />
      </svg>
      {T > W("alcatraz") + 0.4 && <AbsoluteFill style={{ background: "#fff", opacity: 0.25 * (1 - slam) * clamp01(1 - (T - W("alcatraz") - 0.45) / 0.3) }} />}
    </AbsoluteFill>
  );
};

// 18. the cell: the man who talked his way into selling a tower can't talk his way off the rock
const ShotCell: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  const sad = T > W("couldnt") - 0.1;
  const pose: Pose = { expr: sad ? "worried" : "sly", facing: 0.15, blink: blinkAt(T, 28), gesture: sad ? (T > W("rock") - 0.1 ? "shrug" : "none") : "present",
    gk: sad ? ramp(T, W("rock") - 0.15, 0.25) : ramp(T, W("talked") - 0.1, 0.3), lookX: sad ? 0 : 0.5, lookY: sad ? 0.5 : 0, ex: sad ? { sweat: false } : { brow: -8 }, headTilt: sad ? -4 : 2 };
  const zoom = 1 + 0.05 * smooth(t / dur);
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_cell.png" t={t} dur={dur} c={{ z0: 1.05, z1: 1.1, cx: 540, cy: 1200 }} blur={1.4} bright={0.9} />
      <Haze top="rgba(150,170,230,0.06)" vig={0.4} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <g transform={`translate(540,1900) scale(${zoom}) translate(-540,-1900)`}>
          <AFigure id="lcell" look={LUSTIG} x={540} y={1820} s={2.6} pose={pose} shadow={false} />
          <ellipse cx={420} cy={900} rx={300} ry={500} fill="rgba(180,200,255,0.10)" style={{ mixBlendMode: "screen" }} />
          <Bars xs={[150, 330, 750, 930]} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// 19. still standing, still not for sale
const ShotTower: React.FC<{ T: number; a: number; b: number }> = ({ T, a, b }) => {
  const t = T - a, dur = b - a;
  return (
    <AbsoluteFill>
      <PlateC src="eiffel/bg_tower.png" t={t} dur={dur} c={{ z0: 1.18, z1: 1.0, cx: 540, cy: 900 }} />
      <Haze top="rgba(255,190,170,0.05)" vig={0.28} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <Birds t={T} y0={420} n={6} seed={7} />
        <Sign x={540} y={1330} k={(T - (W("not") - 0.25)) / 0.6} t={T} />
        <Sparkle x={540} y={260} k={(T - (W("sale") + 0.2)) / 0.6} />
        <Motes t={T} n={30} seed={16} />
      </svg>
    </AbsoluteFill>
  );
};

const NEW_SHOTS: [number, React.FC<{ T: number; a: number; b: number }>][] = [
  [11.6, ShotNews], [15.05, ShotStamp], [17.55, ShotDeputy], [19.6, ShotSalonWide], [23.6, ShotSecret], [25.3, ShotPitch], [28.2, ShotDealers], [30.0, ShotHook],
  [33.2, ShotCash], [34.9, ShotStation], [37.75, ShotPolice], [43.05, ShotAgain], [45.85, ShotSniff], [47.75, ShotLiner], [49.62, ShotCapone], [51.35, ShotCaponeClose],
  [52.75, ShotBox], [55.2, ShotMoney], [57.7, ShotAlcatraz], [61.1, ShotCell], [65.2, ShotTower],
];

// subtitles: same approved style; lifted where the action is low in frame
const sub = defaultStyle("funny", { keyWords: KEY, y: 0.86 });
const subFull = { ...sub, moves: [{ from: 0, to: 5.1, y: 0.42 }, { from: 5.1, to: 8.75, y: 0.74 }, { from: 45.85, to: 47.75, y: 0.72 }, { from: 51.35, to: 52.75, y: 0.72 }, { from: 55.2, to: 57.7, y: 0.32 }, { from: 15.05, to: 17.55, y: 0.42 }, { from: 19.6, to: 23.6, y: 0.5 }, { from: 25.3, to: 28.2, y: 0.5 }, { from: 33.2, to: 34.9, y: 0.4 },
  { from: 34.9, to: 37.75, y: 0.4 }, { from: 37.75, to: 45.85, y: 0.4 }, { from: 47.75, to: 49.62, y: 0.4 }, { from: 49.62, to: 51.35, y: 0.4 }, { from: 52.75, to: 55.2, y: 0.4 }, { from: 65.2, to: 69.5, y: 0.8 }] };

export const FullShort: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), T = f / FPS;
  let k = CUTS.findIndex((c, i) => T >= c && T < (CUTS[i + 1] ?? 1e9));
  if (k < 0) k = CUTS.length - 2;
  let shot: React.ReactNode;
  if (k === 0) { setCfg(V4); shot = <ShotWidePersp t={T} />; }
  else if (k === 1) { setCfg(V3); shot = <ShotClose t={T - 5.1} />; }
  else if (k === 2) { setCfg(V3); shot = <ShotTwo t={T - 8.75} />; }
  else {
    setCfg(V3);
    const S = NEW_SHOTS.find(([a0]) => Math.abs(a0 - CUTS[k]) < 1e-6)![1];
    shot = <S T={T} a={CUTS[k]} b={CUTS[k + 1]} />;
  }
  const cutK = CUTS.slice(1, -1).reduce((m, c) => Math.min(m, Math.abs(T - c) * FPS), 99);
  const fadeIn = interpolate(T, [0, 0.25], [1, 0], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(T, [68.9, 69.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#1a1420" }}>
      {shot}
      <Grade />
      {cutK < 1.5 && <AbsoluteFill style={{ background: "#fff", opacity: 0.12 * (1.5 - cutK) }} />}
      <Subtitles words={WORDS} style={subFull} />
      {withAudio && <Audio src={staticFile("eiffel/full_mix.wav")} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  );
};
export { STRIDE };
