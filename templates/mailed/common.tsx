// Shared cast, props and helpers for the two "Man Who Mailed Himself" Shorts (1964, Reg Spiers).
// Same production approach as the Paris Short: figure.tsx cast, inked painted plates, breathing figures, push-ins.
import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame, delayRender, continueRender, staticFile } from "remotion";
import { Figure, Look, Pose, INK, ARM_UP, ARM_LO, TORSO_TW } from "../eiffel/figure";
import { Plate, camXY, GroundDefs, clamp01 } from "../eiffel/StyleTest";
import { Word } from "../../src/subtitles/Subtitles";
import words from "../../stories/mailed-himself/final/words.json";

export const FPS = 30;
export const END = 77.6;
export const WORDS: Word[] = ((words as any).words ?? words as { w: string; s: number; e: number }[]).map((w: any) => ({ w: w.w, s: w.s, e: w.e }));
export const W = (w: string, n = 0) => WORDS.filter((x) => x.w.toLowerCase().replace(/[^a-z0-9]/g, "") === w)[n]?.s ?? 0;
export const KEY = ["1964", "london", "australia", "wooden", "box", "reg", "spiers", "javelin", "broke", "birthday", "cargo", "bad", "brilliant", "john",
  "straps", "lid", "pillow", "torch", "tinned", "bottles", "water", "perth", "cash", "delivery", "nailed", "dark", "hold", "landing", "bombay", "blazing",
  "upside", "down", "oven", "clothes", "handlers", "swore", "sound", "crate", "suit", "unnoticed", "sixtythree", "hours", "hitchhiked", "adelaide",
  "newspaper", "worldwide", "scared", "frightened"];
export const serif = "Georgia, 'Times New Roman', serif";
export const hand = "'MarkerFont', 'Comic Sans MS', cursive";
export const sans = "Montserrat, Arial, sans-serif";

let markerReady = false;
export const useMarkerFont = () => {
  const [h] = React.useState(() => (markerReady ? null : delayRender("marker font")));
  React.useEffect(() => {
    if (h === null) return;
    const f = new FontFace("MarkerFont", `url(${staticFile("fonts/permanent-marker-latin-400-normal.woff2")})`);
    f.load().then((ff) => { (document.fonts as any).add(ff); markerReady = true; continueRender(h); }).catch(() => continueRender(h));
  }, [h]);
};

// ---------------------------------------------------------------- camera + figure helpers
export type Cam = { z0: number; z1: number; cx: number; cy: number; dx?: number; dy?: number };
export const at = (x: number, y: number, t: number, dur: number, c: Cam) => camXY(x, y, t, dur, c.z0, c.z1, c.cx, c.cy, c.dx ?? 0, c.dy ?? 0);
export const PlateC: React.FC<{ src: string; t: number; dur: number; c: Cam; blur?: number; bright?: number }> = ({ src, t, dur, c, blur = 0, bright = 1 }) => (
  <Plate src={src} t={t} dur={dur} z0={c.z0} z1={c.z1} cx={c.cx} cy={c.cy} dx={c.dx} dy={c.dy} blur={blur} bright={bright} />
);
export const shadowAt = (x: number, y: number, s: number, k = 1) => (
  <g>
    <ellipse cx={x} cy={y + 1} rx={80 * s} ry={14 * s} fill="url(#gshadow)" opacity={0.95 * k} />
    <ellipse cx={x + 30 * s} cy={y + 2} rx={115 * s} ry={17 * s} fill="url(#gshadow)" opacity={0.35 * k} />
  </g>
);
export const alive = (p: Pose, T: number, seed: number): Pose => {
  if ((p.walk ?? 0) > 0.05) return p;
  return { ...p, bob: (p.bob ?? 0) + 1.6 * Math.sin(T * 2.3 + seed * 1.7) + 1.2, headTilt: (p.headTilt ?? 0) + 2.2 * Math.sin(T * 1.1 + seed * 2.3) + 1.2 * Math.sin(T * 2.9 + seed),
    lean: (p.lean ?? 0) + 1.5 * Math.sin(T * 0.8 + seed * 0.9), talk: p.talk ?? T };
};
export const AF: React.FC<React.ComponentProps<typeof Figure>> = (props) => {
  const T = useCurrentFrame() / FPS;
  const seed = props.id.split("").reduce((m, ch) => m + ch.charCodeAt(0), 0) % 17;
  return <Figure {...props} pose={alive(props.pose, T, seed)} />;
};
export const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1080} height={1920} style={{ position: "absolute" }}><GroundDefs />{children}</svg>
);
export const push = (t: number, dur: number) => Easing.inOut(Easing.cubic)(clamp01(t / dur));
export type ShotP = { T: number; a: number; b: number };
const rad = (d: number) => (d * Math.PI) / 180;
/** where a figure's hand is on screen for a given arm angle / elbow (same arm maths as figure.tsx); side +1 = front arm */
export const handAt = (x: number, y: number, s: number, a: number, el: number, side = 1, flip = false, stout = 0, bob = 1.2) => {
  const tw = TORSO_TW(stout), sx = side * (tw - 8), sy = -150 + bob + 14;
  const a1 = rad(a), ex = sx + Math.sin(a1) * ARM_UP(), ey = sy + Math.cos(a1) * ARM_UP();
  const a2 = a1 + rad(el), hx = ex + Math.sin(a2) * ARM_LO(), hy = ey + Math.cos(a2) * ARM_LO();
  return { x: x + (flip ? -hx : hx) * s, y: y + hy * s };
};

// ---------------------------------------------------------------- cast (1964)
const base = { vest: "#000", tie: "#000", hat: "none" as const, hatCol: "#000", band: "#000" };
/** Reg in Film A: sandy hair, navy sweater, grey trousers */
export const REG_A: Look = { ...base, suit: "#2f4f7a", suitDark: "#24405f", shirt: "#f4efe6", shoes: "#3a2a22", trousers: "#6a6a72",
  hair: "#a8743a", brows: "#7a5228", top: "sweater", hairStyle: "short" };
export const REG_A_SUIT: Look = { ...REG_A, top: "suit", suit: "#4a4c5c", suitDark: "#383a48", vest: "#4a4c5c", tie: "#8e2a3a", trousers: "#3f4150" };
export const REG_A_VEST: Look = { ...REG_A, top: "tee", suit: "#f2eee4", suitDark: "#d8d2c4", trousers: "#e8e2d0" };
/** Reg in Film B: same man, drawn for the night-time film: darker blond, green cardigan, brown suit */
export const REG_B: Look = { ...base, suit: "#4f6a3e", suitDark: "#3e5530", shirt: "#f4efe6", shoes: "#3a2a22", trousers: "#5a5048",
  hair: "#8a5e2e", brows: "#6a4422", top: "sweater", hairStyle: "messy" };
export const REG_B_SUIT: Look = { ...REG_B, top: "suit", suit: "#6a5038", suitDark: "#54402c", vest: "#6a5038", tie: "#2a4a6a", trousers: "#54402c" };
export const REG_B_VEST: Look = { ...REG_B, top: "tee", suit: "#f2eee4", suitDark: "#d8d2c4", trousers: "#e8e2d0" };
/** John McSorley: British javelin thrower friend */
export const JOHN_A: Look = { ...base, suit: "#8a4a32", suitDark: "#6e3a26", shirt: "#f4efe6", shoes: "#2a1e1a", trousers: "#4a4038",
  hair: "#3a2418", brows: "#2a1810", top: "sweater", hairStyle: "curly", glasses: true };
export const JOHN_B: Look = { ...base, suit: "#9a4a3a", suitDark: "#7a3628", shirt: "#f4efe6", shoes: "#2a1e1a", trousers: "#4a4238",
  hair: "#6a4426", brows: "#4a2e18", top: "sweater", hairStyle: "short" };
/** cargo handlers in overalls with caps */
export const HANDLER1: Look = { ...base, suit: "#3e6a8a", suitDark: "#2f5470", shirt: "#f4efe6", shoes: "#2a1e1a", trousers: "#3e6a8a",
  hat: "cap", hatCol: "#3e6a8a", band: "#2a4a60", hair: "#2a1a12", brows: "#2a1a12", top: "tee", hairStyle: "short", stout: 1, skin: undefined };
export const HANDLER2: Look = { ...HANDLER1, suit: "#c8a86a", suitDark: "#a88a52", trousers: "#8a7450", hatCol: "#e8e0cc", band: "#b8ac90", stout: 0, mustache: "walrus", hair: "#1a1210", brows: "#1a1210", skin: "#c99a72" };
export const HANDLER3: Look = { ...HANDLER1, suit: "#e8e2d6", suitDark: "#ccc4b4", trousers: "#7a6a54", hatCol: "#f2eee4", band: "#c8bfae", stout: 0, mustache: "pencil", skin: "#b5835c" };
export const REPORTER: Look = { ...base, suit: "#3a3a48", suitDark: "#2c2c38", shirt: "#f4efe6", tie: "#8a2a2a", vest: "#3a3a48", shoes: "#1a1a1e", trousers: "#2c2c38",
  hair: "#4a4a4a", brows: "#3a3a3a", top: "suit", hairStyle: "short", glasses: true, mustache: "pencil" };
export const DAUGHTER: Look = { ...base, suit: "#e07a9a", suitDark: "#c0607e", shirt: "#fff", shoes: "#f3f1ee", trousers: "#e07a9a",
  hair: "#c8904a", brows: "#a87038", top: "tee", hairStyle: "ponytail", lashes: true, band: "#ffd04a" };
export const WIFE: Look = { ...base, suit: "#4a8a8a", suitDark: "#3a7070", shirt: "#fff", shoes: "#5a3a2a", trousers: "#4a8a8a",
  hair: "#5a3422", brows: "#4a2a1a", top: "sweater", hairStyle: "bob", lashes: true };

// ---------------------------------------------------------------- props
const WOOD = "#c9955a", WOOD_D = "#9a6c3c", WOOD_L = "#e0b47a";
/** the crate (about 1.5 x 0.9 x 0.75 m), drawn from the side; anchor = bottom centre. w/h in px. */
export const Crate: React.FC<{ x: number; y: number; w: number; h: number; rot?: number; lid?: number; label?: boolean; arrows?: boolean; cod?: number; knot?: { blink: number; look: number }; shake?: number }> =
  ({ x, y, w, h, rot = 0, lid = 0, label = true, arrows = true, cod = 0, knot, shake = 0 }) => {
    const sx = shake * Math.sin(useCurrentFrame() * 2.1) * 4;
    const planks = 4, ph = h / planks;
    return (
      <g transform={`translate(${x + sx},${y}) rotate(${rot}) translate(0,${-h / 2})`}>
        <ellipse cx={0} cy={h / 2 + 6} rx={w * 0.55} ry={h * 0.08} fill="rgba(30,18,30,0.28)" />
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={WOOD} stroke={INK} strokeWidth={7} />
        {Array.from({ length: planks - 1 }, (_, i) => <path key={i} d={`M${-w / 2 + 4},${-h / 2 + ph * (i + 1)} H${w / 2 - 4}`} stroke={WOOD_D} strokeWidth={5} />)}
        {Array.from({ length: planks }, (_, i) => <path key={`g${i}`} d={`M${-w / 2 + 20},${-h / 2 + ph * i + ph * 0.45} q${w * 0.2},-6 ${w * 0.4},0`} stroke={WOOD_L} strokeWidth={3} fill="none" opacity={0.7} />)}
        <rect x={-w / 2} y={-h / 2} width={w * 0.1} height={h} fill={WOOD_D} stroke={INK} strokeWidth={6} />
        <rect x={w / 2 - w * 0.1} y={-h / 2} width={w * 0.1} height={h} fill={WOOD_D} stroke={INK} strokeWidth={6} />
        {[-1, 1].map((sgn) => [0.18, 0.82].map((v) => <circle key={`${sgn}${v}`} cx={sgn * (w / 2 - w * 0.05)} cy={-h / 2 + h * v} r={Math.max(3, w * 0.01)} fill="#5a5a62" />))}
        {label && <g>
          <text x={0} y={-h * 0.08} textAnchor="middle" fontFamily={hand} fontSize={h * 0.2} fill="#2a2230" opacity={0.85}>PERTH  W.A.</text>
        </g>}
        {arrows && [-0.27, 0.27].map((v) => <g key={v} transform={`translate(${w * v},${h * 0.24})`} opacity={0.85}>
          <path d={`M0,${-h * 0.12} l${-h * 0.06},${h * 0.07} h${h * 0.04} v${h * 0.1} h${h * 0.04} v${-h * 0.1} h${h * 0.04} Z`} fill="#2a2230" />
        </g>)}
        {arrows && <text x={0} y={h * 0.31} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={h * 0.08} fill="#2a2230" opacity={0.85}>THIS WAY UP</text>}
        {cod > 0 && <g transform={`translate(${w * 0.22},${-h * 0.28}) rotate(-12) scale(${1 + 0.6 * (1 - Easing.out(Easing.back(2))(clamp01(cod)))})`} opacity={clamp01(cod * 3)}>
          <rect x={-w * 0.17} y={-h * 0.09} width={w * 0.34} height={h * 0.18} rx={6} fill="none" stroke="#c0303a" strokeWidth={6} />
          <text x={0} y={h * 0.045} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={h * 0.11} fill="#c0303a">C.O.D.</text>
        </g>}
        {knot && <g transform={`translate(${-w * 0.3},${-h * 0.3})`}>
          <ellipse cx={0} cy={0} rx={h * 0.07} ry={h * 0.05} fill="#1a1010" stroke={INK} strokeWidth={4} />
          {knot.blink < 0.5 && <g><circle cx={-h * 0.015 + knot.look * h * 0.015} cy={0} r={h * 0.022} fill="#fff" /><circle cx={-h * 0.01 + knot.look * h * 0.02} cy={0} r={h * 0.011} fill="#1a1010" /></g>}
        </g>}
        {lid > 0 && <g transform={`translate(${-w / 2},${-h / 2}) rotate(${-lid * 70})`}>
          <rect x={0} y={-h * 0.1} width={w} height={h * 0.1} rx={4} fill={WOOD_L} stroke={INK} strokeWidth={6} />
        </g>}
      </g>
    );
  };
/** a 1960s airliner in side view (four props); anchor centre; facing right */
export const Plane: React.FC<{ x: number; y: number; s: number; rot?: number; t: number; lit?: boolean }> = ({ x, y, s, rot = 0, t, lit = false }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-260,-30 Q-280,-34 -300,-90 L-270,-92 L-215,-34 Z" fill="#d8dde6" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-290,-10 Q-140,-46 160,-40 Q250,-38 290,-4 Q250,26 160,26 L-260,22 Q-300,14 -290,-10 Z" fill="#eef1f5" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
    <path d="M-280,2 H250" stroke="#c0303a" strokeWidth={9} />
    {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={-180 + i * 42} cy={-14} r={7} fill={lit ? "#ffe08a" : "#5a7aa0"} stroke={INK} strokeWidth={3} />)}
    <path d="M232,-26 q22,4 34,16 l-30,0 Z" fill="#2a3a52" stroke={INK} strokeWidth={4} />
    <path d="M-40,8 L60,8 L-70,90 L-120,90 Z" fill="#cfd5df" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    {[-10, 30].map((ex, i) => <g key={i} transform={`translate(${ex - 40 * i},${24 + 22 * i})`}>
      <rect x={-14} y={-8} width={44} height={18} rx={8} fill="#b8bfcc" stroke={INK} strokeWidth={4} />
      <ellipse cx={34} cy={1} rx={4} ry={24 * Math.abs(Math.sin(t * 40 + i))} fill="rgba(60,60,70,0.5)" />
    </g>)}
  </g>
);
export const Cloud: React.FC<{ x: number; y: number; s: number; o?: number }> = ({ x, y, s, o = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>
    <path d="M-120,30 Q-140,-10 -90,-20 Q-80,-70 -20,-60 Q10,-100 60,-60 Q120,-70 120,-10 Q160,0 140,30 Z" fill="#fffaf2" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
  </g>
);
export const Bottle: React.FC<{ x: number; y: number; s: number; label: string; col?: string; rot?: number }> = ({ x, y, s, label, col = "#8ac6d8", rot = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-30,0 V-110 Q-30,-140 -12,-150 V-180 H12 V-150 Q30,-140 30,-110 V0 Z" fill={col} fillOpacity={0.85} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <rect x={-14} y={-196} width={28} height={18} rx={4} fill="#8a5a3a" stroke={INK} strokeWidth={4} />
    <rect x={-26} y={-92} width={52} height={50} rx={4} fill="#fbf6ea" stroke={INK} strokeWidth={4} />
    <text x={0} y={-58} textAnchor="middle" fontFamily={hand} fontSize={label.length > 6 ? 13 : 17} fill="#2a2230">{label}</text>
    <path d="M-18,-130 v100" stroke="rgba(255,255,255,0.5)" strokeWidth={6} strokeLinecap="round" />
  </g>
);
export const Pillow: React.FC<{ x: number; y: number; s: number; rot?: number }> = ({ x, y, s, rot = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-110,-50 Q-130,0 -110,50 Q0,70 110,50 Q130,0 110,-50 Q0,-70 -110,-50 Z" fill="#f4efe6" stroke={INK} strokeWidth={6} />
    <path d="M-80,-20 q60,15 160,0" stroke="#d8d0c0" strokeWidth={5} fill="none" />
  </g>
);
export const Tin: React.FC<{ x: number; y: number; s: number; rot?: number }> = ({ x, y, s, rot = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-40} y={-90} width={80} height={90} rx={8} fill="#b8bfcc" stroke={INK} strokeWidth={6} />
    <rect x={-40} y={-66} width={80} height={44} fill="#c0303a" stroke={INK} strokeWidth={4} />
    <text x={0} y={-36} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={18} fill="#fff">BEANS</text>
    <ellipse cx={0} cy={-90} rx={40} ry={8} fill="#d8dde6" stroke={INK} strokeWidth={4} />
  </g>
);
export const Torch: React.FC<{ x: number; y: number; s: number; rot?: number; on?: boolean }> = ({ x, y, s, rot = 0, on = true }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    {on && <path d="M60,-22 L420,-140 L420,140 L60,22 Z" fill="rgba(255,240,180,0.22)" />}
    <rect x={-70} y={-16} width={110} height={32} rx={8} fill="#4a4a58" stroke={INK} strokeWidth={5} />
    <path d="M40,-16 L66,-26 V26 L40,16 Z" fill="#6a6a78" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
    <ellipse cx={66} cy={0} rx={6} ry={24} fill={on ? "#fff6c8" : "#9a9aa8"} stroke={INK} strokeWidth={3} />
  </g>
);
export const Hammer: React.FC<{ x: number; y: number; s: number; rot: number }> = ({ x, y, s, rot }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-8} y={-130} width={16} height={140} rx={6} fill="#a8743a" stroke={INK} strokeWidth={5} />
    <path d="M-44,-150 H40 Q54,-140 40,-118 H-44 Z" fill="#6a6a78" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
  </g>
);
export const Saw: React.FC<{ x: number; y: number; s: number; rot: number }> = ({ x, y, s, rot }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <path d="M0,-14 L230,-4 L230,22 L0,22 Z" fill="#c8ced8" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
    {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${8 + i * 16},22 l8,10 l8,-10`} fill="#c8ced8" stroke={INK} strokeWidth={3} />)}
    <path d="M-50,-24 Q-60,10 -40,34 H8 V-24 Z" fill="#a8743a" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
    <ellipse cx={-22} cy={6} rx={12} ry={16} fill="#6a4a2a" />
  </g>
);
export const Javelin: React.FC<{ x: number; y: number; rot: number; s: number }> = ({ x, y, rot, s }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-260,0 H250" stroke={INK} strokeWidth={14} strokeLinecap="round" />
    <path d="M-260,0 H250" stroke="#e8e2d6" strokeWidth={7} strokeLinecap="round" />
    <path d="M250,-6 L300,0 L250,6 Z" fill="#6a6a78" stroke={INK} strokeWidth={4} />
    <rect x={-30} y={-8} width={60} height={16} rx={4} fill="#c0303a" stroke={INK} strokeWidth={3} />
  </g>
);
export const Moth: React.FC<{ x: number; y: number; t: number; s?: number }> = ({ x, y, t, s = 1 }) => {
  const f = Math.sin(t * 40);
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={-14} cy={0} rx={18} ry={10 + 8 * f} fill="#d8ccb8" stroke={INK} strokeWidth={3} />
      <ellipse cx={14} cy={0} rx={18} ry={10 + 8 * f} fill="#d8ccb8" stroke={INK} strokeWidth={3} />
      <ellipse cx={0} cy={0} rx={5} ry={12} fill="#8a7a6a" stroke={INK} strokeWidth={3} />
    </g>
  );
};
export const Bulb: React.FC<{ x: number; y: number; k: number; s?: number }> = ({ x, y, k, s = 1 }) => {
  if (k <= 0) return null;
  const on = k > 0.35 || (k > 0.12 && k < 0.2);
  const sc = Easing.out(Easing.back(2))(clamp01(k * 2)) * s;
  return (
    <g transform={`translate(${x},${y}) scale(${sc})`}>
      {on && Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <path key={i} d={`M${Math.cos(a) * 90},${Math.sin(a) * 90 - 10} L${Math.cos(a) * 125},${Math.sin(a) * 125 - 10}`} stroke="#ffd04a" strokeWidth={10} strokeLinecap="round" />; })}
      <circle cx={0} cy={-10} r={62} fill={on ? "#fff3a8" : "#e8e2d0"} stroke={INK} strokeWidth={7} />
      <rect x={-28} y={46} width={56} height={34} rx={6} fill="#9a9aa8" stroke={INK} strokeWidth={6} />
      <path d="M-18,10 q18,-40 36,0" stroke={on ? "#e0a020" : "#9a9aa8"} strokeWidth={6} fill="none" />
    </g>
  );
};
/** speech bubble full of censored swearing (#@%!) */
export const Grawlix: React.FC<{ x: number; y: number; k: number; s?: number; flip?: boolean; text?: string }> = ({ x, y, k, s = 1, flip = false, text = "#@%!*" }) => {
  if (k <= 0 || k >= 1) return null;
  const sc = Easing.out(Easing.back(2.2))(clamp01(k * 4)) * s * (k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1);
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -sc : sc},${sc})`}>
      <path d="M-150,-70 Q-160,-130 -60,-128 Q20,-150 80,-120 Q160,-120 150,-60 Q170,0 80,10 L40,10 L10,60 L0,10 Q-150,20 -150,-70 Z" fill="#fffaf0" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <text x={0} y={-36} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={64} fill="#c0303a" transform={flip ? "scale(-1,1)" : undefined}>{text}</text>
    </g>
  );
};
export const Card: React.FC<{ k: number; text: string; y?: number; sub?: string; rot?: number; w?: number }> = ({ k, text, y = 380, sub, rot = -2, w = 760 }) => {
  if (k <= 0) return null;
  const s = Easing.out(Easing.back(1.8))(clamp01(k));
  return (
    <g transform={`translate(540,${y}) scale(${s}) rotate(${rot})`}>
      <rect x={-w / 2} y={-90} width={w} height={sub ? 200 : 160} rx={26} fill="#fffaf0" stroke={INK} strokeWidth={8} />
      <text x={0} y={sub ? -14 : 24} textAnchor="middle" fontFamily={hand} fontSize={62} fill="#1a1420">{text}</text>
      {sub && <text x={0} y={60} textAnchor="middle" fontFamily={serif} fontStyle="italic" fontSize={40} fill="#6a4a3a">{sub}</text>}
    </g>
  );
};
/** heat shimmer lines rising */
export const Heat: React.FC<{ t: number; y0: number; n?: number; o?: number }> = ({ t, y0, n = 9, o = 0.5 }) => (
  <g opacity={o}>
    {Array.from({ length: n }, (_, i) => { const u = (t * 0.5 + i / n) % 1, x = 60 + i * (960 / n), y = y0 - 300 * u;
      return <path key={i} d={`M${x},${y} q20,-30 0,-60 q-20,-30 0,-60`} stroke="#fff4d0" strokeWidth={6} fill="none" opacity={Math.sin(u * Math.PI)} strokeLinecap="round" />; })}
  </g>
);
export const Sun: React.FC<{ x: number; y: number; t: number; r?: number }> = ({ x, y, t, r = 120 }) => (
  <g transform={`translate(${x},${y})`}>
    <circle r={r * 2.4} fill="rgba(255,240,180,0.25)" />
    {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + t * 0.3; return <path key={i} d={`M${Math.cos(a) * r * 1.2},${Math.sin(a) * r * 1.2} L${Math.cos(a) * r * 1.7},${Math.sin(a) * r * 1.7}`} stroke="#ffd04a" strokeWidth={16} strokeLinecap="round" />; })}
    <circle r={r} fill="#fff1a0" stroke="#f0a020" strokeWidth={10} />
  </g>
);
/** sweat drops falling (or rising when upside down) */
export const Sweat: React.FC<{ x: number; y: number; t: number; n?: number; s?: number; dir?: number }> = ({ x, y, t, n = 4, s = 1, dir = 1 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => { const u = (t * 1.4 + i / n) % 1;
      return <path key={i} transform={`translate(${x + (i - n / 2) * 50 * s},${y + dir * 160 * u * s}) scale(${s * (dir < 0 ? -1 : 1)})`} d="M0,-18 Q14,4 0,14 Q-14,4 0,-18 Z" fill="#9ad4f0" stroke={INK} strokeWidth={3} opacity={1 - u} />; })}
  </g>
);
export const Cake: React.FC<{ x: number; y: number; s: number; t: number }> = ({ x, y, s, t }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <ellipse cx={0} cy={0} rx={150} ry={26} fill="#f4efe6" stroke={INK} strokeWidth={6} />
    <rect x={-120} y={-120} width={240} height={120} rx={14} fill="#f0a8c0" stroke={INK} strokeWidth={7} />
    <path d="M-120,-90 q30,30 60,0 q30,30 60,0 q30,30 60,0 q30,30 60,0" fill="#fff" stroke={INK} strokeWidth={5} />
    {[-60, -20, 20, 60].map((cx, i) => <g key={i}>
      <rect x={cx - 7} y={-170} width={14} height={50} fill={["#7ac0e8", "#ffd04a", "#9ad49a", "#e87a7a"][i]} stroke={INK} strokeWidth={4} />
      <path d={`M${cx},${-176} q${-12 + 3 * Math.sin(t * 9 + i)},-16 0,-34 q${12 + 3 * Math.sin(t * 9 + i)},16 0,34 Z`} fill="#ffb43a" stroke={INK} strokeWidth={3} />
    </g>)}
  </g>
);
export const Newspaper: React.FC<{ x: number; y: number; s: number; rot: number; head: string; sub?: string }> = ({ x, y, s, rot, head, sub }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-300} y={-390} width={600} height={780} fill="#f2ecdc" stroke={INK} strokeWidth={8} />
    <text x={0} y={-310} textAnchor="middle" fontFamily={serif} fontWeight={900} fontSize={64} fill="#1a1420">THE DAILY NEWS</text>
    <path d="M-270,-280 H270 M-270,-268 H270" stroke={INK} strokeWidth={4} />
    <text x={0} y={-180} textAnchor="middle" fontFamily={serif} fontWeight={900} fontSize={head.length > 14 ? 58 : 76} fill="#1a1420">{head}</text>
    {sub && <text x={0} y={-110} textAnchor="middle" fontFamily={serif} fontStyle="italic" fontSize={40} fill="#3a3040">{sub}</text>}
    <rect x={-270} y={-70} width={260} height={220} fill="#c9b9a0" stroke={INK} strokeWidth={4} />
    <g transform="translate(-140,120)"><Crate x={0} y={0} w={190} h={110} label={false} arrows={false} /></g>
    {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${20},${-60 + i * 30} H${270}`} stroke="#8a8090" strokeWidth={8} opacity={0.6} />)}
    {Array.from({ length: 6 }, (_, i) => <path key={`b${i}`} d={`M-270,${190 + i * 30} H270`} stroke="#8a8090" strokeWidth={8} opacity={0.6} />)}
  </g>
);
/** a little map: London -> Bombay -> Perth, the dotted route drawn by k (0..1) */
export const RouteMap: React.FC<{ k: number; t: number; plane?: boolean; hours?: number }> = ({ k, t, plane = true, hours }) => {
  const P = [{ x: 330, y: 560, n: "LONDON" }, { x: 640, y: 980, n: "BOMBAY" }, { x: 860, y: 1440, n: "PERTH" }];
  const seg = (u: number) => { const v = u * 2, i = Math.min(1, Math.floor(v)), f = v - i; return { x: P[i].x + (P[i + 1].x - P[i].x) * f, y: P[i].y + (P[i + 1].y - P[i].y) * f - 80 * Math.sin(Math.PI * f) }; };
  const pts = Array.from({ length: 61 }, (_, i) => seg((i / 60) * clamp01(k)));
  const head = seg(clamp01(k)), prev = seg(Math.max(0, clamp01(k) - 0.01));
  const ang = Math.atan2(head.y - prev.y, head.x - prev.x) * 180 / Math.PI;
  return (
    <g>
      <rect x={0} y={0} width={1080} height={1920} fill="#e9dcc0" />
      <path d="M120,300 Q300,250 460,330 Q520,420 430,520 Q300,560 230,470 Q140,420 120,300 Z" fill="#c9d3a8" stroke={INK} strokeWidth={6} opacity={0.9} />
      <path d="M520,780 Q640,760 720,860 Q700,1000 640,1060 Q580,960 520,900 Z" fill="#c9d3a8" stroke={INK} strokeWidth={6} opacity={0.9} />
      <path d="M700,1300 Q860,1220 1000,1300 Q1060,1440 980,1560 Q860,1600 760,1520 Q680,1420 700,1300 Z" fill="#d8b88a" stroke={INK} strokeWidth={6} opacity={0.9} />
      {Array.from({ length: 30 }, (_, i) => <path key={i} d={`M${(i * 173) % 1000},${(i * 331) % 1800 + 60} q14,-8 28,0`} stroke="#b8a888" strokeWidth={3} fill="none" />)}
      <path d={"M" + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")} fill="none" stroke="#c0303a" strokeWidth={9} strokeDasharray="22 16" strokeLinecap="round" />
      {P.map((p, i) => (k * 2 >= i - 0.02) && <g key={i}><circle cx={p.x} cy={p.y} r={16} fill="#c0303a" stroke={INK} strokeWidth={5} />
        <text x={p.x + (i === 2 ? -30 : 30)} y={p.y + 12} textAnchor={i === 2 ? "end" : "start"} fontFamily={hand} fontSize={52} fill="#2a2230">{p.n}</text></g>)}
      {plane && k > 0 && k < 1 && <g transform={`translate(${head.x},${head.y}) rotate(${ang})`}><Crate x={0} y={30} w={80} h={50} label={false} arrows={false} /></g>}
      {hours !== undefined && <g transform="translate(540,1700)">
        <rect x={-260} y={-80} width={520} height={150} rx={24} fill="#2a2230" stroke={INK} strokeWidth={6} />
        <text x={0} y={30} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={84} fill="#ffd04a">{String(Math.round(hours)).padStart(2, "0")} HOURS</text>
      </g>}
      <AbsoluteFillSvgGrain t={t} />
    </g>
  );
};
const AbsoluteFillSvgGrain: React.FC<{ t: number }> = ({ t }) => (
  <rect x={0} y={0} width={1080} height={1920} fill="url(#none)" opacity={0} data-t={t} />
);
/** inside of the crate: planks all round, warm torchlight; used full-frame for the close-ups inside the box */
export const CrateInside: React.FC<{ t: number; light?: number; hot?: number; children?: React.ReactNode }> = ({ t, light = 1, hot = 0, children }) => (
  <AbsoluteFill>
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <defs>
        <radialGradient id="torchglow" cx="50%" cy="48%" r="60%">
          <stop offset="0" stopColor={`rgba(255,${230 - 90 * hot},${170 - 130 * hot},${0.55 * light})`} />
          <stop offset="1" stopColor="rgba(20,10,10,0)" />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={1080} height={1920} fill="#3a2414" />
      {Array.from({ length: 9 }, (_, i) => <g key={i}>
        <rect x={0} y={i * 220} width={1080} height={214} fill={i % 2 ? "#5a3a22" : "#644026"} />
        <path d={`M${80 + (i * 97) % 300},${i * 220 + 90} q160,-14 320,0`} stroke="#7a5232" strokeWidth={5} fill="none" />
        <path d={`M${560 + (i * 61) % 200},${i * 220 + 140} q120,10 260,0`} stroke="#7a5232" strokeWidth={5} fill="none" />
        <circle cx={60} cy={i * 220 + 110} r={9} fill="#2a2a30" /><circle cx={1020} cy={i * 220 + 110} r={9} fill="#2a2a30" />
      </g>)}
      {[480, 1440].map((y) => <rect key={y} x={0} y={y - 18} width={1080} height={36} fill="#2a1a10" opacity={0.6} />)}
      <rect x={0} y={0} width={1080} height={1920} fill="url(#torchglow)" opacity={0.9 + 0.07 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.1)} />
      {/* dust drifting in the torchlight */}
      {Array.from({ length: 26 }, (_, i) => { const a = Math.abs(Math.sin(i * 12.99 + 3) * 43758.5) % 1, b = Math.abs(Math.sin(i * 78.23 + 5) * 12543.1) % 1;
        const x = 200 + ((a * 700 + t * (5 + 8 * b) + 30 * Math.sin(t * 0.5 + i)) % 700), y = 400 + ((b * 1100 - t * (8 + 10 * a)) % 1100 + 1100) % 1100;
        return <circle key={`m${i}`} cx={x} cy={y} r={1.5 + 2.5 * ((i * 7) % 5) / 5} fill="#ffe8c0" opacity={(0.15 + 0.35 * Math.abs(Math.sin(t * 1.4 + i))) * light} />; })}
      <rect x={0} y={0} width={1080} height={1920} fill={`rgba(255,80,20,${0.22 * hot})`} />
      {/* slits of light between the planks */}
      {Array.from({ length: 8 }, (_, i) => <rect key={`s${i}`} x={0} y={i * 220 + 214} width={1080} height={6} fill={`rgba(255,230,170,${0.25 + 0.15 * Math.sin(t * 2 + i)})`} />)}
    </svg>
    {children}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 40%, rgba(10,5,5,0.75) 100%)" }} />
  </AbsoluteFill>
);
export { INK, clamp01 };
