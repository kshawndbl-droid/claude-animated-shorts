// Spider woman, PART C (story 25.20 to 33.90 s, lines 8-10): "The lantern flickers... and her shadow on the wall has
// eight legs." (final jumpscare) "He slashes." "The music stops." Video only: no subtitles, no audio (Part D adds them).
// Shots: 1) close on the andon lantern guttering, the room behind it soft and out of focus; 2) the shoji wall lit by the
// lantern, her kneeling shadow with the lute, eight legs unfolding from her back; 3) FINAL JUMPSCARE: the lantern dies,
// her approved true face (MonsterV2) shoots out of the dark, fills the screen in 5 frames, keeps pushing with the jaw
// working, hard shake, flash, cut to black; 4) black, one bright sword slash; 5) black, then the empty cushion in cold
// moonlight with the lantern dead and a thread of smoke, fading back to black.
// Everything is a pure function of the frame, so playback is a constant 30 fps with no held or skipped frames.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { INK } from "./kimono";
import { Face, Hair, Leg, LEGS_L, MonsterBody, mirror } from "./MonsterV2";
import { LADY, LAMP, Lit, SAMURAI, sm } from "./CharTest";

const FPS = 30, OFF = 25.2, DUR = 8.7;
export const J_PARTC_FRAMES = Math.round(DUR * FPS); // 261
const S2 = 26.95, S3 = 28.83, LUNGE = 29.2, SLASH = 30.28, BLACK = 30.42, ROOM = 31.95, END = 33.9;

type V = [number, number];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const bump = (T: number, a: number, b: number, e = 0.03) => sm((T - a) / e) * (1 - sm((T - b) / e));

/** lantern intensity: a steady breathing flame that gutters on "flickers", then sinks before the scare */
const flame = (T: number) => {
  let v = 0.9 + 0.05 * Math.sin(T * 7.3) + 0.04 * Math.sin(T * 17.1 + 1.2);
  v -= 0.62 * bump(T, 25.72, 25.82) + 0.4 * bump(T, 26.02, 26.1) + 0.75 * bump(T, 26.3, 26.52, 0.05);
  v -= 0.25 * sm((T - 27.6) / 1.0);            // it burns lower while the shadow grows
  v -= 0.6 * bump(T, 28.42, 28.5);             // one gutter as the legs unfold
  v -= 0.55 * sm((T - 28.75) / 0.4);           // then it sinks almost out in the held silence before the reveal
  return clamp01(v);
};

/* ---------- shot 1: the lantern ---------- */
const Lantern: React.FC<{ T: number; I: number }> = ({ T, I }) => {
  const x = 540, top = 560, w = 560, h = 900, post = 30;
  const paper = (k: number) => `rgb(${Math.round(lerp(40, 255, k))},${Math.round(lerp(24, 214, k))},${Math.round(lerp(14, 150, k))})`;
  const fx = x + 10 * Math.sin(T * 5.1) + 5 * Math.sin(T * 11.3), fy = top + h * 0.62;
  return <g>
    <defs>
      <radialGradient id="pglow" cx={fx} cy={fy} r={420} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={paper(Math.min(1, I * 1.1))} /><stop offset="0.55" stopColor={paper(I * 0.8)} /><stop offset="1" stopColor={paper(I * 0.45)} />
      </radialGradient>
      <radialGradient id="halo" cx={x} cy={top + h * 0.5} r={900} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffa050" stopOpacity={0.55 * I} /><stop offset="1" stopColor="#ff7020" stopOpacity={0} />
      </radialGradient>
      <radialGradient id="flame" cx="50%" cy="65%" r="55%"><stop offset="0" stopColor="#fff6d8" /><stop offset="0.5" stopColor="#ffc860" stopOpacity={0.8} /><stop offset="1" stopColor="#ff9030" stopOpacity={0} /></radialGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#halo)" style={{ mixBlendMode: "screen" }} />
    {/* paper, with the flame showing through as a hot blob */}
    <rect x={x - w / 2} y={top} width={w} height={h} fill="url(#pglow)" />
    <ellipse cx={fx} cy={fy - 10} rx={70 + 20 * I} ry={150 + 40 * I} fill="url(#flame)" opacity={0.9 * I} />
    {/* stains and a small tear in the paper */}
    <ellipse cx={x - 140} cy={top + 230} rx={60} ry={40} fill="#5a3010" opacity={0.18} />
    <path d={`M${x + 120},${top + 520} l40,30 l-20,50 l-30,-20 Z`} fill="#1a0c06" opacity={0.85} />
    {/* kumiko lattice */}
    {[1, 2].map((i) => <rect key={"v" + i} x={x - w / 2 + (w * i) / 3 - 5} y={top} width={10} height={h} fill={INK} opacity={0.85} />)}
    {[1, 2, 3, 4].map((i) => <rect key={"h" + i} x={x - w / 2} y={top + (h * i) / 5 - 5} width={w} height={10} fill={INK} opacity={0.85} />)}
    {/* frame: four posts, a cap, a base, short legs */}
    <rect x={x - w / 2 - post} y={top - 40} width={post} height={h + 120} fill="#2a1810" stroke={INK} strokeWidth={4} />
    <rect x={x + w / 2} y={top - 40} width={post} height={h + 120} fill="#2a1810" stroke={INK} strokeWidth={4} />
    <rect x={x - w / 2 - post - 20} y={top - 60} width={w + 2 * post + 40} height={44} rx={6} fill="#2a1810" stroke={INK} strokeWidth={4} />
    <rect x={x - w / 2 - post} y={top + h} width={w + 2 * post} height={50} fill="#24140c" stroke={INK} strokeWidth={4} />
    <path d={`M${x - w / 2 - post + 8},${top - 54} L${x + w / 2 + post - 8},${top - 54}`} stroke="#ffb070" strokeOpacity={0.35 * I} strokeWidth={4} />
    {/* warm rim on the inside edges of the posts */}
    <rect x={x - w / 2 - 6} y={top} width={6} height={h} fill="#ffb070" opacity={0.5 * I} />
    <rect x={x + w / 2} y={top} width={6} height={h} fill="#ffb070" opacity={0.5 * I} />
    {/* a moth circling the light */}
    <g transform={`translate(${x + 300 * Math.cos(T * 2.4)},${top + 260 + 120 * Math.sin(T * 3.1)}) rotate(${40 * Math.sin(T * 13)})`} opacity={0.8}>
      <ellipse rx={14} ry={6} fill="#120a08" /><ellipse cx={-6} cy={-6} rx={12} ry={5 + 4 * Math.abs(Math.sin(T * 40))} fill="#120a08" />
    </g>
  </g>;
};

/* ---------- shot 2: shoji wall and her shadow ---------- */
const FLOORY = 1560;
const Shoji: React.FC<{ T: number; I: number }> = ({ T, I }) => {
  const panelW = 270, x0 = -135;
  const holes: [number, number, number][] = [[2, 1, 0], [0, 5, 1], [4, 2, 2], [3, 9, 3]];
  return <g>
    <defs>
      <radialGradient id="wallglow" cx={700} cy={FLOORY + 120} r={1500} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#e0a060" stopOpacity={0.95 * I + 0.05} /><stop offset="0.6" stopColor="#7a4c2c" stopOpacity={0.9 * I + 0.1} /><stop offset="1" stopColor="#1a1018" />
      </radialGradient>
      <filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves={2} seed={4} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0" /></filter>
    </defs>
    <rect width={1080} height={FLOORY} fill="#20161c" />
    <rect width={1080} height={FLOORY} fill="url(#wallglow)" />
    <rect width={1080} height={FLOORY} filter="url(#paper)" />
    {/* torn panes: the stormy dark outside, with rain */}
    {holes.map(([c, r, k]) => { const hx = x0 + c * panelW + 30 + (r % 2) * 60, hy = 180 + r * 128;
      return <g key={k}><path d={`M${hx},${hy} l90,8 l-10,70 l40,40 l-110,10 Z`} fill="#06060c" />
        {[0, 1, 2].map((j) => <path key={j} d={`M${hx + 20 + j * 30},${hy + ((T * 300 + j * 50 + k * 30) % 110)} l-3,18`} stroke="#9ab0d0" strokeOpacity={0.5} strokeWidth={2} />)}</g>; })}
    {/* kumiko grid and the heavy frames */}
    {Array.from({ length: 6 }, (_, c) => <g key={c}>
      {[1, 2, 3].map((i) => <rect key={i} x={x0 + c * panelW + (panelW * i) / 4 - 3} y={0} width={6} height={FLOORY} fill="#1a0f0c" opacity={0.85} />)}
      <rect x={x0 + c * panelW - 14} y={0} width={28} height={FLOORY} fill="#1e120c" stroke={INK} strokeWidth={3} />
    </g>)}
    {Array.from({ length: 12 }, (_, r) => <rect key={r} x={0} y={r * 128 + 60} width={1080} height={6} fill="#1a0f0c" opacity={0.85} />)}
    {/* sill, tatami edge, floor */}
    <rect x={0} y={FLOORY - 40} width={1080} height={40} fill="#24140c" stroke={INK} strokeWidth={3} />
    <rect x={0} y={FLOORY} width={1080} height={1920 - FLOORY} fill="#2a2014" />
    <rect x={0} y={FLOORY} width={1080} height={1920 - FLOORY} fill="#d89048" opacity={0.25 * I} />
    <rect x={0} y={FLOORY + 120} width={1080} height={22} fill="#120c0a" />
  </g>;
};

/** her shadow, kneeling side-on with the lute; eight legs unfold from her back as u goes 0 -> 1 */
const Shadow: React.FC<{ T: number; u: number }> = ({ T, u }) => {
  // body (in shadow space; base on the floor line at y = 0, facing right)
  const pluck = Math.max(0, Math.sin(T * 6.2)) * (1 - u);
  // something is wrong: her head creeps over to an unnatural angle while the music still plays
  const tilt = -10 * sm((T - 27.3) / 1.2) - 16 * sm((u - 0.6) / 0.4);
  const body = <g>
    <path d="M-150,0 Q-180,-120 -110,-170 Q-60,-200 40,-180 Q120,-170 150,-40 Q160,0 120,0 Z" />{/* folded legs and kimono */}
    <path d="M-110,-160 Q-150,-330 -90,-470 Q-40,-540 30,-520 Q70,-470 60,-330 Q50,-220 60,-170 Z" />{/* torso */}
    <g transform={`rotate(${tilt},-20,-540)`}>
      <ellipse cx={-10} cy={-600} rx={62} ry={70} />{/* head */}
      <ellipse cx={-62} cy={-660} rx={52} ry={40} />{/* bun */}
      <path d="M-60,-690 L-130,-760" stroke="#000" strokeWidth={8} strokeLinecap="round" />{/* kanzashi */}
      <circle cx={-136} cy={-766} r={12} />
      <path d="M-60,-580 Q-110,-420 -130,-300 L-100,-300 Q-70,-430 -40,-560 Z" />{/* long hair down her back */}
    </g>
    {/* biwa: pear body on her lap, neck up to the left over her shoulder */}
    <ellipse cx={95} cy={-250} rx={70} ry={110} transform="rotate(-30,95,-250)" />
    <path d="M120,-330 L-20,-650" stroke="#000" strokeWidth={22} strokeLinecap="round" />
    <path d="M-30,-680 L-60,-700" stroke="#000" strokeWidth={16} strokeLinecap="round" />
    {/* plucking arm (forearm to the strings) and the fretting hand on the neck */}
    <path d={`M20,-420 Q110,-380 ${140 + 10 * pluck},${-300 - 30 * pluck}`} stroke="#000" strokeWidth={30} strokeLinecap="round" fill="none" />
    <path d={`M40,-400 L${170 + 12 * pluck},${-310 - 34 * pluck}`} stroke="#000" strokeWidth={8} strokeLinecap="round" />
    <path d="M-30,-450 Q20,-540 40,-570" stroke="#000" strokeWidth={26} strokeLinecap="round" fill="none" />
  </g>;
  // eight legs: root on her back, three segments, folded flat against her back -> arching high over her
  const legs = Array.from({ length: 8 }, (_, i) => {
    const side = i < 4 ? -1 : 1, j = i % 4;
    const k = sm((u - j * 0.08) / 0.55), tw = 4 * Math.sin(T * 9 + i * 1.7) * k;
    const root: V = [-60 + side * 20, -420 - j * 25];
    const a1 = lerp(-95, -95 + side * (30 + j * 22), k) + tw, a2 = a1 + side * lerp(10, 70 + j * 12, k), a3 = a2 + side * lerp(5, 55, k);
    const L = [lerp(90, 240 + j * 30, k), lerp(70, 220 + j * 20, k), lerp(50, 230, k)];
    const p: V[] = [root];
    [a1, a2, a3].forEach((a, n) => { const q = p[n]; const r = (a * Math.PI) / 180; p.push([q[0] + Math.cos(r) * L[n], q[1] + Math.sin(r) * L[n]]); });
    return <g key={i}>
      {p.slice(0, 3).map((q, n) => <line key={n} x1={q[0]} y1={q[1]} x2={p[n + 1][0]} y2={p[n + 1][1]} stroke="#000" strokeWidth={[26, 20, 12][n]} strokeLinecap="round" />)}
      {p.slice(1, 3).map((q, n) => <circle key={"j" + n} cx={q[0]} cy={q[1]} r={[16, 12][n]} />)}
    </g>;
  });
  return <g fill="#000">{legs}{body}</g>;
};

/* ---------- close-ups in lantern light: his reaction, then her ---------- */
const CloseBg: React.FC<{ I: number; dx: number }> = ({ I, dx }) =>
  <div style={{ position: "absolute", inset: 0, transform: "scale(2.6)", transformOrigin: "540px 900px", filter: `blur(16px) brightness(${0.2 + 0.4 * I})` }}>
    <Img src={staticFile("jorogumo/hi/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920, transform: `translate(${dx}px,0px)` }} />
  </div>;
const HEAD = 1.2;   // head-centre height of the rig, metres

/* ---------- shot 5: the room, after ---------- */
const CUSHION = { x: 630, y: 1170 };

export const JPartC: React.FC = () => {
  const t = useCurrentFrame() / FPS, T = t + OFF;
  const I = flame(T);
  let content: React.ReactNode = null;

  if (T < S2) {
    // shot 1: slow push on the lantern; the room behind is soft (depth of field) and dims with every gutter
    const k = sm((T - OFF) / (S2 - OFF)), z = lerp(1.0, 1.08, k);
    content = <>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${2.4 + 0.1 * k})`, transformOrigin: "540px 1000px", filter: `blur(14px) brightness(${0.35 + 0.55 * I})` }}>
        <Img src={staticFile("jorogumo/hi/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920, transform: `translate(${540 - LAMP.x}px,${1000 - LAMP.y}px)` }} />
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", transform: `scale(${z})`, transformOrigin: "540px 1000px" }}><Lantern T={T} I={I} /></svg>
    </>;
  } else if (T < S3) {
    // shot 2: the wall. Her shadow is there; on "eight legs" the legs unfold from her back
    const k = (T - S2) / (S3 - S2), z = lerp(1.0, 1.12, sm(k));
    const u = sm((T - 28.15) / 0.65);
    const sway = 6 * Math.sin(T * 2.3) * I;                 // the flame moves, so the shadow breathes
    const sScale = 1.25 + 0.05 * Math.sin(T * 3.7) * I + 0.12 * u;
    content = <svg width={1080} height={1920} style={{ position: "absolute", transform: `scale(${z})`, transformOrigin: "560px 1150px" }}>
      <defs><filter id="sblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={7} /></filter></defs>
      <Shoji T={T} I={I} />
      <g style={{ mixBlendMode: "multiply" }} opacity={0.35 + 0.6 * I} filter="url(#sblur)" transform={`translate(${590 + sway},${FLOORY - 40}) scale(${sScale}) skewX(${-4 + sway * 0.3})`}>
        <Shadow T={T} u={u} />
      </g>
    </svg>;
  } else if (T < LUNGE) {
    // shot 2b: HIS REACTION. He has seen the wall: eyes wide, he turns toward her and grips the sword
    const k = (T - S3) / (LUNGE - S3), ppm = 1700, z = 1 + 0.06 * k;
    const lamp = { x: 1250, y: 700 };
    content = <>
      <CloseBg I={0.5} dx={-200} />
      <svg width={1080} height={1920} style={{ position: "absolute", transform: `scale(${z})`, transformOrigin: "540px 760px" }}>
        <Lit id="samc" flick={0.75} x={500} y={820 + HEAD * ppm} ppm={ppm} look={SAMURAI} lamp={lamp} noShadow
          pose={{ t: T, expr: "scared", lookX: lerp(-0.2, 0.9, sm(k * 1.6)), blink: false, armNear: [10, 60], armFar: [6, 70] }} />
      </svg>
    </>;
  } else if (T < BLACK) {
    // shot 3: FINAL JUMPSCARE. The flame dies (a few frames of near-black), then her face shoots out of the dark
    const d = T - LUNGE;
    // REVEAL on the end of "legs.": hard cut to her calm human face; in 4 frames it transforms into the approved true
    // face (cracks race across, the eyes flood black, extra eyes open, the grin tears ear to ear) while it lunges
    const morph = sm(clamp01((d - 3 / FPS) / (5 / FPS)));
    const lunge = clamp01((d - 1 / FPS) / (5 / FPS));        // 5 frames from close to filling the screen
    const s = d < 0 ? 0 : lerp(2.4, 6.2, 1 - Math.pow(1 - lunge, 2)) + 1.0 * Math.max(0, d - 6 / FPS);
    const shake = d > 5 / FPS ? 26 * Math.exp(-(d - 5 / FPS) / 0.35) : 0;
    const sx = shake * Math.sin(d * 97), sy = shake * Math.cos(d * 83);
    const jaw = d > 4 / FPS ? 0.55 + 0.45 * Math.sin(d * 34) : 0.3 * morph;
    const flash = bump(T, SLASH + 0.08, BLACK - 0.02, 0.02) + 0.15 * Math.exp(-Math.max(0, d) / 0.05) * (d >= 0 ? 1 : 0);
    const cy = 840 + 20 * lunge;                          // face centre: eyes and grin both on screen when it fills
    const legs = [...LEGS_L.map((l, i) => ({ l, i })), ...LEGS_L.map((l, i) => ({ l: mirror(l), i: i + 4 }))];
    const human = 1 - sm(clamp01((d - 3 / FPS) / (2 / FPS)));
    const legsK = sm(clamp01((d - 3 / FPS) / (7 / FPS)));               // legs burst out over ~7 frames
    const rear = sm(clamp01((d - 0.3) / 0.7));                           // then she rears up toward him
    const pull = sm(clamp01((d - 3 / FPS) / (9 / FPS)));                 // camera pulls back from her face to show all of her
    const bodyS = lerp(2.3, 1.2, pull) + 0.6 * rear;   // her face as we know it, then gone into the lunge
    const ppmL = 1700 * (1 + 0.4 * lunge);
    const sl = d - (SLASH - LUNGE), cut = sl < 0 ? 0 : clamp01(sl / (3 / FPS));
    const L2 = Math.hypot(1280, 1080);
    content = <>
      <AbsoluteFill style={{ backgroundColor: "#050306" }} />
      <CloseBg I={0.6} dx={200} />{human > 0.01 && <><svg width={1080} height={1920} style={{ position: "absolute", opacity: human }}>
        <Lit id="ladyc" flick={0.8} x={540} y={840 + HEAD * ppmL} ppm={ppmL} look={LADY} lamp={{ x: -200, y: 700 }} noShadow flip
          pose={{ t: T, expr: "eerie", lookX: 0.9, glide: true, blink: false, tilt: -12, armNear: [8, 72], armFar: [6, 78] }} />
      </svg></>}
      {/* FULL-BODY REVEAL: the camera pulls back as she rises; eight legs burst out of her kimono, the abdomen swells
          behind her, the face turns into the true face; then she rears toward him (toward camera), jaw working */}
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: 1 - human, transform: `translate(${sx}px,${sy}px)` }}>
        <rect width={1080} height={1920} fill="#000" opacity={0.15} />
        <g transform={`translate(540,${lerp(840, 1150, pull) - 80 * rear}) scale(${bodyS}) translate(-540,-1030)`} style={{ filter: "brightness(1.25)" }}>
          <MonsterBody k={legsK} morph={morph} jaw={jaw} t={T} />
        </g>
        <defs><radialGradient id="under" cx="50%" cy="80%" r="70%"><stop offset="0" stopColor="#ff7040" stopOpacity={0.28} /><stop offset="1" stopColor="#000" stopOpacity={0} /></radialGradient></defs>
        <rect width={1080} height={1920} fill="url(#under)" style={{ mixBlendMode: "screen" }} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)" }} />
      {/* HE SLASHES: his blade tears across her face, a white flash, then black */}
      {sl >= 0 && <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs><filter id="glow2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={18} /></filter></defs>
        <path d="M1180,380 L-100,1460" stroke="#9ab8ff" strokeWidth={70} strokeDasharray={L2} strokeDashoffset={L2 * (1 - cut)} filter="url(#glow2)" strokeLinecap="round" />
        <path d="M1180,380 L-100,1460" stroke="#ffffff" strokeWidth={12} strokeDasharray={L2} strokeDashoffset={L2 * (1 - cut)} strokeLinecap="round" />
      </svg>}
      <AbsoluteFill style={{ backgroundColor: "#fff2ee", opacity: flash }} />
    </>;
  } else if (T < ROOM) {
    // shot 4: black; one sword stroke tears across the dark on "slashes"
    const d = -1, draw = clamp01(d / (3 / FPS)), fade = d < 0 ? 0 : Math.exp(-Math.max(0, d - 3 / FPS) / 0.16);
    const flash = d < 0 ? 0 : 0.55 * Math.exp(-d / 0.06);
    const x1 = 1180, y1 = 420, x2 = -100, y2 = 1500, L = Math.hypot(x2 - x1, y2 - y1);
    content = <>
      <AbsoluteFill style={{ backgroundColor: "#000" }} />
      {d >= 0 && <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={18} /></filter></defs>
        <g opacity={fade}>
          <path d={`M${x1},${y1} L${x2},${y2}`} stroke="#9ab8ff" strokeWidth={60} strokeDasharray={L} strokeDashoffset={L * (1 - draw)} filter="url(#glow)" strokeLinecap="round" />
          <path d={`M${x1},${y1} L${x2},${y2}`} stroke="#ffffff" strokeWidth={10} strokeDasharray={L} strokeDashoffset={L * (1 - draw)} strokeLinecap="round" />
        </g>
      </svg>}
      <AbsoluteFill style={{ backgroundColor: "#dfe8ff", opacity: flash }} />
    </>;
  } else {
    // shot 5: silence. The empty cushion in cold moonlight, the lantern dead and smoking; then back to black
    const k = (T - ROOM) / (END - ROOM), z = lerp(2.0, 2.12, k);
    const vis = sm((T - ROOM) / 0.6) * (1 - sm((T - (END - 0.55)) / 0.5));
    content = <>
      <AbsoluteFill style={{ backgroundColor: "#000" }} />
      <div style={{ position: "absolute", inset: 0, opacity: vis, transform: `translate(${540 - CUSHION.x * z + 90}px,${1050 - CUSHION.y * z}px) scale(${z})`, transformOrigin: "0 0" }}>
        <Img src={staticFile("jorogumo/hi/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920, filter: "saturate(0.3) brightness(0.62) hue-rotate(185deg)" }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs><radialGradient id="dead" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#0b0a10" stopOpacity={0.92} /><stop offset="1" stopColor="#0b0a10" stopOpacity={0} /></radialGradient>
            <filter id="smk"><feGaussianBlur stdDeviation={2.5} /></filter></defs>
          <ellipse cx={LAMP.x} cy={LAMP.y + 5} rx={95} ry={140} fill="url(#dead)" /><ellipse cx={LAMP.x} cy={LAMP.y + 5} rx={60} ry={95} fill="url(#dead)" />
          <path d={Array.from({ length: 12 }, (_, i) => { const y = LAMP.y - 60 - i * 14, x = LAMP.x + 6 * Math.sin(i * 0.7 - T * 2.2) * (1 + i * 0.25); return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ")}
            stroke="#c8ccd8" strokeOpacity={0.35} strokeWidth={3} fill="none" filter="url(#smk)" />
          {/* a few loose silk threads trailing from the cushion toward the dark */}
          {[0, 1, 2].map((i) => <path key={i} d={`M${CUSHION.x - 30 + i * 22},${CUSHION.y - 6} Q${CUSHION.x - 120 + i * 30 + 6 * Math.sin(T * 1.3 + i)},${CUSHION.y - 120} ${CUSHION.x - 190 + i * 40},${CUSHION.y - 300}`}
            stroke="#dfe4f0" strokeOpacity={0.3} strokeWidth={1.2} fill="none" />)}
        </svg>
      </div>
    </>;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {content}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.62) 100%)" }} />
    </AbsoluteFill>
  );
};
