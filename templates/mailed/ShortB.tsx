// "The Man Who Mailed Himself" — Film B, "Inside the Box": the same approved narration, told mostly from inside the
// crate and at night (torchlight, slits of light, sounds from outside), with its own sets, cast drawings and spy-jazz score.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { Look, Pose, FIGCFG } from "../eiffel/figure";
import { V3, setCfg, Haze, blinkAt, walker, Motes, Sparkle, clamp01, ramp } from "../eiffel/StyleTest";
import { LivePlate, Fx } from "./live";
import { Subtitles, defaultStyle } from "../../src/subtitles/Subtitles";
import {
  FPS, END, WORDS, W, KEY, hand, sans, serif, useMarkerFont, Cam, at, PlateC, shadowAt, AF, Svg, push, ShotP, handAt,
  REG_B, REG_B_SUIT, REG_B_VEST, JOHN_B, HANDLER2, DAUGHTER, WIFE,
  Crate, Bottle, Pillow, Tin, Torch, Hammer, Saw, Bulb, Grawlix, Card, Heat, Sweat, Cake, Newspaper, CrateInside, INK,
} from "./common";

/** signs of life for each set (plate px); tuned per plate */
const FX: Record<string, Fx> = {
  b_bedsit: { dust: 18, flicker: 0.4, rain: [405, 505, 285, 665], sway: 22 },
  b_workshop: { dust: 26, flicker: 0.5, cone: [471, 470, 1000, 300, "#ffd890"], sway: 22 },
  b_runway: { fog: 0.55, flicker: 0.95, sway: 20 },
  b_newsroom: { dust: 18, flicker: 0.35, shafts: [560, 240, -22], sway: 18 },
  b_home: { dust: 16, flicker: 0.15, dapple: [120, 1000, 960, 900], shafts: [700, 150, 24], sway: 20 },
  b_apron: { heat: 1330, flicker: 0.3, sway: 14 },
};
export const B_FRAMES = Math.round(END * FPS);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const REG_B_WORK: Look = { ...REG_B, top: "tee", suit: "#d88a3a", suitDark: "#b87028", trousers: "#3e4a5a", hat: "cap", hatCol: "#3e4a5a", band: "#2a3442" };

/** a paper luggage tag on a string */
const Tag: React.FC<{ x: number; y: number; s: number; rot: number; lines: string[]; stamps?: { t: string; k: number; c: string }[] }> = ({ x, y, s, rot, lines, stamps = [] }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <path d="M0,-260 Q-30,-200 0,-150" stroke="#e8e2d0" strokeWidth={6} fill="none" />
    <path d="M-170,-150 H120 L190,-80 V230 H-170 Z" fill="#f2e2b8" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    <circle cx={0} cy={-110} r={16} fill="#2a1a12" stroke={INK} strokeWidth={4} />
    {lines.map((l, i) => <text key={i} x={10} y={-20 + i * 70} textAnchor="middle" fontFamily={hand} fontSize={Math.min(i === 0 ? 58 : 46, 560 / Math.max(1, l.length))} fill="#2a2230">{l}</text>)}
    {stamps.map((st, i) => st.k > 0 && <g key={i} transform={`translate(${-80 + i * 90},${170 - (i % 2) * 40}) rotate(${-14 + i * 12}) scale(${1 + 0.8 * (1 - Easing.out(Easing.back(2))(clamp01(st.k)))})`} opacity={clamp01(st.k * 3)}>
      <rect x={-78} y={-30} width={156} height={60} rx={8} fill="none" stroke={st.c} strokeWidth={6} />
      <text x={0} y={14} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={32} fill={st.c}>{st.t}</text></g>)}
  </g>
);
/** the crate's dark interior lit only by a torch: used for the hold */
const Dark: React.FC<{ bx: number; by: number; r: number; children?: React.ReactNode }> = ({ bx, by, r, children }) => (
  <AbsoluteFill>
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <defs>
        <radialGradient id="beam" cx={bx / 1080} cy={by / 1920} r={r / 1080} gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="rgba(0,0,0,0)" /><stop offset="0.7" stopColor="rgba(5,5,15,0.35)" /><stop offset="1" stopColor="rgba(5,5,15,0.93)" />
        </radialGradient>
      </defs>
    </svg>
    {children}
    <svg width={1080} height={1920} style={{ position: "absolute" }}><rect x={0} y={0} width={1080} height={1920} fill="url(#beam)" /></svg>
  </AbsoluteFill>
);

// 1. darkness; a torch clicks on: a man inside a box
const S_Torch: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const on = T > 0.35;
  const pose: Pose = { expr: T > W("inside") - 0.2 ? "sly" : "neutral", facing: 0.1, gesture: "rub", gk: 1, blink: blinkAt(T, 31), lookX: T < 2.5 ? Math.sin(T * 2) : 0.2, hold: null };
  return (
    <CrateInside t={T} light={on ? 1 : 0}>
      <Svg>
        <g opacity={on ? 1 : 0.06}>
          <AF id="bt" look={REG_B} x={520} y={1930 + 20 * p} s={3.6 + 0.3 * p} pose={pose} shadow={false} />
          <Torch x={170} y={1560} s={1.5} rot={-35} on={on} />
          <Tag x={850} y={560 + 10 * Math.sin(T * 2)} s={0.9} rot={8 * Math.sin(T * 1.6)} lines={["LONDON", "→ AUSTRALIA"]} />
        </g>
        <Card k={(T - 0.8) / 0.35} text="1964" y={300} w={360} />
      </Svg>
    </CrateInside>
  );
};
// 2. outside: a crate rides the belt into an airliner on a foggy night runway
const S_Loading: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.12, z1: 1.3, cx: 600, cy: 1350 };
  const k = clamp01(t / (dur + 0.6));
  const bx = lerp(250, 700, k), by = lerp(1720, 1300, k);
  return (
    <AbsoluteFill>
      <LivePlate name="b_runway" T={T} t={t} dur={dur} c={c} bright={0.85} fx={FX.b_runway} />
      <Haze top="rgba(60,80,160,0.18)" vig={0.5} />
      <Svg>
        <path d="M150,1800 L800,1240 L840,1280 L190,1840 Z" fill="#3a3a48" stroke={INK} strokeWidth={6} />
        {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={lerp(180, 810, i / 9)} cy={lerp(1815, 1262, i / 9)} r={10} fill="#5a5a68" stroke={INK} strokeWidth={3} />)}
        <g transform={`rotate(-40,${bx},${by})`}><Crate x={bx} y={by} w={200} h={120} label={false} cod={1} /></g>
        <Motes t={T} n={20} seed={31} />
      </Svg>
    </AbsoluteFill>
  );
};
// 3. the bedsit: the Olympic dream gets a big red X
const S_Bedsit: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.28, cx: 520, cy: 1550 };
  const R = at(620, 1800, t, dur, c), s = 1.4;
  const x = clamp01((T - W("stuck") + 0.1) / 0.3);
  const pose: Pose = { expr: x > 0 ? "worried" : "smile", facing: -0.5, gesture: x > 0 ? "facepalm" : "point", gk: x > 0 ? ramp(T, W("stuck"), 0.3) : 1, blink: blinkAt(T, 32), lookX: -1, lookY: -0.4 };
  return (
    <AbsoluteFill>
      <LivePlate name="b_bedsit" T={T} t={t} dur={dur} c={c} bright={0.9} fx={FX.b_bedsit} />
      <Haze top="rgba(120,140,200,0.12)" vig={0.4} />
      <Svg>
        <g transform={`translate(${at(250, 1000, t, dur, c).x},${at(250, 1000, t, dur, c).y}) rotate(-3)`}>
          <rect x={-170} y={-230} width={340} height={460} fill="#f2ecdc" stroke={INK} strokeWidth={8} />
          <text x={0} y={-150} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={52} fill="#2a3a6a">OLYMPICS</text>
          <text x={0} y={-90} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={44} fill="#c0303a">1964</text>
          {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={-100 + i * 50} cy={10 + (i % 2) * 40} r={30} fill="none" stroke={["#2a6ac0", "#ffd04a", "#2a2230", "#2f9a52", "#c0303a"][i]} strokeWidth={9} />)}
          <path d="M-110,120 L110,120" stroke="#6a6a72" strokeWidth={10} />
          <path d="M-90,160 L90,160" stroke="#6a6a72" strokeWidth={10} />
          {x > 0 && <g opacity={x}><path d={`M-150,-210 L${-150 + 300 * x},${-210 + 420 * x}`} stroke="#d8202a" strokeWidth={34} strokeLinecap="round" />
            <path d={`M150,-210 L${150 - 300 * clamp01(x * 1.4 - 0.4)},${-210 + 420 * clamp01(x * 1.4 - 0.4)}`} stroke="#d8202a" strokeWidth={34} strokeLinecap="round" /></g>}
        </g>
        {shadowAt(R.x, R.y, s * R.z)}
        <AF id="bb" look={REG_B} x={R.x} y={R.y} s={s * R.z} flip pose={pose} shadow={false} />
      </Svg>
    </AbsoluteFill>
  );
};
// 4. broke (one coin rattling in a jar) and a photo of his daughter: her birthday is coming
const S_Jar: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const ph = T > W("daughters") - 0.25;
  const pose: Pose = { expr: ph ? "smile" : "worried", ex: ph ? { mouth: "wobble", eyes: "happy" } : { mouth: "flat" }, facing: 0.1, gesture: "offer", gk: 1, blink: blinkAt(T, 33),
    lookX: 0.8, lookY: 0.4 };
  const x = 470, y = 1900 + 20 * p, s = 3.4 + 0.2 * p, hp = handAt(x, y, s, 70, 20, 1);
  const shake = !ph ? 14 * Math.sin(T * 30) * clamp01((T - a) / 0.2) : 0;
  const coin = clamp01((T - W("broke") - 0.05) / 0.5);
  return (
    <AbsoluteFill>
      <LivePlate name="b_bedsit" T={T} t={t} dur={dur} c={{ z0: 1.5, z1: 1.6, cx: 540, cy: 1150 }} blur={3.4} bright={0.85} fx={FX.b_bedsit} />
      <Haze top="rgba(120,140,200,0.12)" vig={0.4} />
      <Svg>
        <AF id="bj" look={REG_B} x={x} y={y} s={s} pose={pose} shadow={false} />
        {!ph && <g transform={`translate(${hp.x + shake},${hp.y - 60})`}>
          <rect x={-70} y={-150} width={140} height={190} rx={26} fill="rgba(200,230,240,0.45)" stroke={INK} strokeWidth={7} />
          <rect x={-60} y={-176} width={120} height={30} rx={8} fill="#c0303a" stroke={INK} strokeWidth={5} />
          <text x={0} y={-60} textAnchor="middle" fontFamily={hand} fontSize={34} fill="#2a2230">SAVINGS</text>
          <circle cx={10 * Math.sin(T * 30)} cy={10 + 10 * Math.cos(T * 33)} r={18} fill="#d8b04a" stroke={INK} strokeWidth={4} />
        </g>}
        {!ph && coin > 0 && coin < 1 && <circle cx={hp.x + 200 * coin} cy={hp.y - 300 + 500 * coin * coin} r={20} fill="#d8b04a" stroke={INK} strokeWidth={4} />}
        {ph && <g transform={`translate(${hp.x + 40},${hp.y - 160}) rotate(-6) scale(${Easing.out(Easing.back(1.6))(clamp01((T - W("daughters") + 0.25) / 0.4))})`}>
          <rect x={-150} y={-190} width={300} height={360} rx={10} fill="#a8743a" stroke={INK} strokeWidth={8} />
          <rect x={-120} y={-160} width={240} height={300} fill="#f6e8c8" stroke={INK} strokeWidth={5} />
          <AF id="dp" look={DAUGHTER} x={0} y={160} s={0.85} pose={{ expr: "happy", facing: 0, blink: blinkAt(T, 34), gesture: "wave", gk: 1, talk: T }} shadow={false} />
        </g>}
        {ph && <g transform="translate(820,460) rotate(6)">
          <rect x={-150} y={-130} width={300} height={260} rx={10} fill="#fffaf0" stroke={INK} strokeWidth={7} />
          <rect x={-150} y={-130} width={300} height={60} rx={10} fill="#c0303a" stroke={INK} strokeWidth={7} />
          {Array.from({ length: 15 }, (_, i) => <text key={i} x={-115 + (i % 5) * 58} y={-20 + Math.floor(i / 5) * 50} textAnchor="middle" fontFamily={sans} fontSize={30} fill="#2a2230">{i + 10}</text>)}
          <circle cx={-115 + 3 * 58} cy={-30 + 2 * 50} r={30} fill="none" stroke="#c0303a" strokeWidth={6} opacity={clamp01((T - W("birthday")) / 0.3)} />
        </g>}
      </Svg>
    </AbsoluteFill>
  );
};
// 5. night shift in airport cargo: Reg loads crates onto the belt
const S_Job: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.25, cx: 540, cy: 1600, dx: -30 };
  const R = at(260, 1810, t, dur, c), s = 1.35;
  const cyc = (T - a) % 1.6, lifting = cyc < 0.8;
  const pose: Pose = { expr: "smile", facing: 0.6, gesture: lifting ? "offer" : "present", gk: 1, hold: lifting ? "box" : null, blink: blinkAt(T, 35), lookX: 1, lean: lifting ? 6 : 0 };
  return (
    <AbsoluteFill>
      <LivePlate name="b_runway" T={T} t={t} dur={dur} c={c} bright={0.8} fx={FX.b_runway} />
      <Haze top="rgba(60,80,160,0.18)" vig={0.45} />
      <Svg>
        <path d="M380,1850 L1000,1300 L1040,1340 L420,1890 Z" fill="#3a3a48" stroke={INK} strokeWidth={6} />
        {Array.from({ length: 5 }, (_, i) => { const k = ((T - a) * 0.28 + i / 5) % 1; const x = lerp(420, 1020, k), y = lerp(1830, 1300, k);
          const tags = ["NEW YORK", "CAIRO", "TOKYO", "ROME", "SYDNEY"];
          return <g key={i} transform={`rotate(-41,${x},${y})`}><Crate x={x} y={y} w={170} h={100} label={false} arrows={false} />
            {T > W("crates") - 0.2 && <g transform={`translate(${x},${y - 120})`}><rect x={-70} y={-20} width={140} height={36} rx={6} fill="#fbf6ea" stroke={INK} strokeWidth={4} />
              <text x={0} y={8} textAnchor="middle" fontFamily={hand} fontSize={24} fill="#2a2230">{tags[i]}</text></g>}</g>; })}
        {shadowAt(R.x, R.y, s * R.z)}
        <AF id="bjb" look={REG_B_WORK} x={R.x} y={R.y} s={s * R.z} pose={pose} shadow={false} />
        <Card k={(T - W("cargo") + 0.2) / 0.35} text="NIGHT SHIFT: CARGO" y={380} w={820} />
      </Svg>
    </AbsoluteFill>
  );
};
// 6. the idea, seen from inside an empty crate: Reg's face peers down into it, and a bulb lights
const S_Peek: React.FC<ShotP> = ({ T, a, b }) => {
  // the idea: in the night cargo area Reg leans over an empty crate, looks in... and slowly looks up with a grin
  const t = T - a, dur = b - a, c: Cam = { z0: 1.08, z1: 1.24, cx: 540, cy: 1250 };
  const bad = T > W("bad") - 0.1, bri = T > W("brilliant") - 0.1;
  const up = Easing.inOut(Easing.cubic)(clamp01((T - W("brilliant") + 0.35) / 0.5));
  const pose: Pose = { expr: bri ? "smug" : bad ? "worried" : "surprised", ex: bad && !bri ? { mouth: "frown" } : {}, facing: bri ? 0.1 : 0.4, blink: blinkAt(T, 36),
    lookY: lerp(0.9, 0, up), lookX: bri ? 0 : 0.3, gesture: bri ? "rub" : "offer", gk: bri ? ramp(T, W("brilliant") - 0.2, 0.35) : 1, lean: lerp(9, 0, up), headTilt: lerp(-6, 4, up) };
  const R = at(570, 1760, t, dur, c), K = at(540, 1930, t, dur, c), z = R.z;
  return (
    <AbsoluteFill>
      <LivePlate name="b_runway" T={T} t={t} dur={dur} c={c} bright={0.8} fx={FX.b_runway} />
      <Haze top="rgba(60,80,160,0.18)" vig={0.5} />
      <Svg>
        <AF id="bpk" look={REG_B_WORK} x={R.x} y={R.y} s={2.2 * z} pose={pose} shadow={false} />
        <g transform={`translate(${K.x},${K.y}) scale(${z})`}>
          <path d="M-280,-330 L-230,-372 L230,-372 L280,-330 Z" fill="#2a1a12" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
          <Crate x={0} y={0} w={560} h={330} label={false} arrows={false} />
        </g>
        <Bulb x={R.x + 290 * z} y={R.y - 760 * z} k={(T - W("brilliant") + 0.15) / 0.6} s={0.9} />
        <Motes t={T} n={16} seed={36} />
      </Svg>
    </AbsoluteFill>
  );
};
// 7. John's workshop: sawing planks while Reg holds the board
const S_Saw: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.28, cx: 540, cy: 1620 };
  const J = at(330, 1800, t, dur, c), R = at(820, 1800, t, dur, c), s = 1.35;
  const sk = 0.5 + 0.5 * Math.sin(T * 12);
  const ang = lerp(60, 100, sk), el = lerp(30, -20, sk), hp = handAt(J.x, J.y, s * J.z, ang, el, 1);
  const jp: Pose = { expr: "stern", ex: { mouth: "flat" }, facing: 0.5, gesture: "offer", gk: 1, blink: blinkAt(T, 37), lookX: 1, lookY: 0.6 };
  const rp: Pose = { expr: T > W("straps") - 0.1 ? "happy" : "smile", facing: -0.5, gesture: "offer", gk: 1, blink: blinkAt(T, 38), lookX: -1, lookY: 0.5 };
  const B = at(580, 1620, t, dur, c);
  return (
    <AbsoluteFill>
      <LivePlate name="b_workshop" T={T} t={t} dur={dur} c={c} bright={0.85} fx={FX.b_workshop} />
      <Haze top="rgba(255,190,120,0.14)" vig={0.45} />
      <Svg>
        <rect x={B.x - 260 * B.z} y={B.y - 20 * B.z} width={520 * B.z} height={42 * B.z} rx={4} fill="#c9955a" stroke={INK} strokeWidth={6} />
        {shadowAt(J.x, J.y, s * J.z)}{shadowAt(R.x, R.y, s * R.z)}
        <AF id="js" look={JOHN_B} x={J.x} y={J.y} s={s * J.z} pose={jp} shadow={false} />
        <Saw x={hp.x} y={hp.y} s={0.55 * J.z} rot={10} />
        {Array.from({ length: 6 }, (_, i) => { const u = (T * 1.5 + i / 6) % 1; return <circle key={i} cx={hp.x + 120 + 20 * Math.sin(i * 3)} cy={hp.y + 30 + 200 * u} r={6 * (1 - u)} fill="#e0b47a" />; })}
        <AF id="rs" look={REG_B} x={R.x} y={R.y} s={s * R.z} flip pose={rp} shadow={false} />
        <Card k={(T - W("john") + 0.1) / 0.35} text="HIS FRIEND JOHN" y={380} />
      </Svg>
    </AbsoluteFill>
  );
};
// 8. testing the lid from within: a gap opens and two eyes look out; then a thumbs-up wave
const S_LidTest: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const op = clamp01((T - W("lid") + 0.1) / 0.3) * (T > W("within") + 0.4 ? 1 + clamp01((T - W("within") - 0.4) / 0.3) * 3 : 1);
  const blink = blinkAt(T, 39, [W("opened")]);
  return (
    <AbsoluteFill>
      <LivePlate name="b_workshop" T={T} t={t} dur={dur} c={{ z0: 1.5, z1: 1.6, cx: 540, cy: 1400 }} blur={3} bright={0.8} fx={FX.b_workshop} />
      <Haze top="rgba(255,190,120,0.14)" vig={0.45} />
      <Svg>
        <g transform={`translate(540,${1520 + 10 * p})`}>
          <rect x={-450} y={-180} width={900} height={500} rx={8} fill="#c9955a" stroke={INK} strokeWidth={8} />
          {[0, 1, 2].map((i) => <path key={i} d={`M-445,${-50 + i * 120} H445`} stroke="#9a6c3c" strokeWidth={6} />)}
          <rect x={-450} y={-180} width={900} height={20} fill="#2a1a12" />
          <g transform={`translate(-450,-180) rotate(${-14 * Math.min(1, op) - 40 * Math.max(0, op - 1) / 3})`}>
            <rect x={0} y={-50} width={900} height={50} rx={6} fill="#e0b47a" stroke={INK} strokeWidth={7} />
          </g>
          {op > 0.2 && <g>
            <rect x={-420} y={-180 - 120 * Math.min(1, op)} width={840} height={120 * Math.min(1, op)} fill="#140a06" opacity={0.85} />
            {blink < 0.5 && [-60, 60].map((ex) => <g key={ex}><ellipse cx={ex} cy={-180 - 60 * Math.min(1, op)} rx={30} ry={24} fill="#fff" stroke={INK} strokeWidth={4} />
              <circle cx={ex + 8 * Math.sin(T * 3)} cy={-180 - 60 * Math.min(1, op)} r={12} fill="#1a1010" /></g>)}
          </g>}
          {op > 1.3 && <g transform={`translate(250,${-260 - 60 * Math.sin(T * 8)})`}>
            <circle cx={0} cy={0} r={46} fill="#f3dcc0" stroke={INK} strokeWidth={7} />
            <rect x={-12} y={-90} width={24} height={60} rx={12} fill="#f3dcc0" stroke={INK} strokeWidth={6} />
          </g>}
          <text x={0} y={180} textAnchor="middle" fontFamily={hand} fontSize={70} fill="#2a2230" opacity={0.8}>THIS WAY UP ↑</text>
        </g>
      </Svg>
    </AbsoluteFill>
  );
};
// 9. packing: Reg tosses each item into the crate; the last bottle he shows to us
const S_Toss: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.2, z1: 1.32, cx: 540, cy: 1620 };
  const R = at(260, 1810, t, dur, c), s = 1.4, C = at(720, 1830, t, dur, c);
  const items: [string, number][] = [["pillow", 0], ["torch", 0], ["tinned", 0], ["bottles", 0]];
  const nw = T > W("not") - 0.1;
  const toss = items.some(([w]) => T > W(w) - 0.25 && T < W(w) + 0.05);
  const pose: Pose = { expr: nw ? "sly" : "happy", facing: nw ? 0.1 : 0.6, gesture: nw ? "present" : toss ? "point" : "offer", gk: 1, blink: blinkAt(T, 40), lookX: nw ? 0 : 1,
    wink: T > W("water", 1) && T < W("water", 1) + 0.45 };
  const hp = handAt(R.x, R.y, s * R.z, 95, 25, 1);
  const fly = (w: string, el: (x: number, y: number) => React.ReactNode) => {
    const k = clamp01((T - W(w) + 0.15) / 0.55);
    if (k <= 0 || k >= 1) return null;
    return el(lerp(hp.x, C.x, k), lerp(hp.y, C.y - 300 * C.z, k) - 260 * Math.sin(Math.PI * k));
  };
  return (
    <AbsoluteFill>
      <LivePlate name="b_workshop" T={T} t={t} dur={dur} c={c} bright={0.85} fx={FX.b_workshop} />
      <Haze top="rgba(255,190,120,0.14)" vig={0.45} />
      <Svg>
        <Crate x={C.x} y={C.y} w={460 * C.z} h={260 * C.z} lid={1} />
        {fly("pillow", (x, y) => <Pillow x={x} y={y} s={0.7} rot={T * 300} />)}
        {fly("torch", (x, y) => <Torch x={x} y={y} s={0.8} rot={T * 400} on={false} />)}
        {fly("tinned", (x, y) => <Tin x={x} y={y} s={0.8} rot={T * 300} />)}
        {fly("bottles", (x, y) => <Bottle x={x} y={y} s={0.7} label="WATER" rot={T * 300} />)}
        {shadowAt(R.x, R.y, s * R.z)}
        <AF id="bto" look={REG_B} x={R.x} y={R.y} s={s * R.z} pose={pose} shadow={false} />
        {nw && <Bottle x={hp.x + 10} y={hp.y + 40} s={0.75 * R.z} label="NOT WATER" col="#e8d070" />}
        <Sparkle x={hp.x + 40} y={hp.y - 200} k={(T - W("not") - 0.2) / 0.5} />
        {[["pillow", "PILLOW"], ["torch", "TORCH"], ["tinned", "TINNED FOOD"], ["bottles", "2 BOTTLES"]].map(([w, l], i) => {
          const k = clamp01((T - W(w) + 0.1) / 0.3); return k > 0 && !nw ? <g key={i} transform={`translate(${760},${360 + i * 110}) scale(${Easing.out(Easing.back(2))(k)})`}>
            <rect x={-200} y={-42} width={400} height={84} rx={18} fill="#fffaf0" stroke={INK} strokeWidth={6} />
            <text x={0} y={18} textAnchor="middle" fontFamily={hand} fontSize={46} fill="#2a2230">✓ {l}</text></g> : null; })}
      </Svg>
    </AbsoluteFill>
  );
};
// 10. the tag: a made-up customer in Perth, cash on delivery
const S_TagShot: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  return (
    <AbsoluteFill style={{ background: "#2a1a12" }}>
      <LivePlate name="b_workshop" T={T} t={t} dur={dur} c={{ z0: 1.6, z1: 1.7, cx: 540, cy: 1000 }} blur={6} bright={0.6} fx={FX.b_workshop} />
      <Svg>
        <Tag x={540} y={1050 + 10 * p} s={2.1 + 0.1 * p} rot={6 * Math.sin(T * 1.8)} lines={["TO: A CUSTOMER", "PERTH, W.A."]}
          stamps={[{ t: "C.O.D.", k: (T - W("cash") + 0.05) / 0.3, c: "#c0303a" }, { t: "FREIGHT", k: (T - W("delivery") - 0.2) / 0.3, c: "#2a4a8a" }]} />
        <text x={540} y={330} textAnchor="middle" fontFamily={hand} fontSize={50} fill="#ffe8b0" opacity={clamp01((T - W("madeup")) / 0.3)}>(who doesn't exist)</text>
      </Svg>
    </AbsoluteFill>
  );
};
// 11. from inside: bang, bang, bang... the slits of light vanish. Reg is now cargo.
const S_Bangs: React.FC<ShotP> = ({ T, a, b }) => {
  const bangs = [W("nailed"), W("it"), W("shut")];
  const hit = bangs.reduce((m, bt) => Math.max(m, T > bt - 0.02 && T < bt + 0.18 ? 1 - (T - bt + 0.02) / 0.2 : 0), 0);
  const nb = bangs.filter((bt) => T > bt).length;
  const pose: Pose = { expr: "worried", ex: hit > 0.3 ? { eyes: "closed", mouth: "M" } : { mouth: "wobble" }, facing: 0, gesture: "cross", gk: 1, blink: 0, lookY: -0.6,
    lookX: T > W("cargo", 1) ? 0.3 : 0 };
  const dark = 1 - nb * 0.22;
  return (
    <CrateInside t={T} light={dark}>
      <Svg>
        <g transform={`translate(${hit * 12 * Math.sin(T * 60)},${hit * 8})`}>
          <AF id="bbg" look={REG_B} x={540} y={1930} s={3.8} pose={pose} shadow={false} />
        </g>
        {bangs.map((bt, i) => { const k = clamp01((T - bt) / 0.8); return T > bt && k < 1 ? <g key={i}>
          {Array.from({ length: 10 }, (_, j) => <circle key={j} cx={150 + j * 85 + 20 * i} cy={40 + 900 * k * (0.6 + 0.4 * ((j * 7) % 3) / 3)} r={5} fill="#e0b47a" opacity={1 - k} />)}
          <text x={300 + i * 240} y={260} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={90} fill="#ffd04a" stroke={INK} strokeWidth={8} paintOrder="stroke"
            opacity={1 - k} transform={`rotate(${-10 + i * 10},${300 + i * 240},260)`}>BANG</text></g> : null; })}
        <Card k={(T - W("cargo", 1) + 0.05) / 0.3} text="NOW: CARGO" y={420} rot={3} />
      </Svg>
    </CrateInside>
  );
};
// 12. the dark hold, only his torch beam: out to stretch... the red light blinks, the plane tips: back in!
const S_DarkHold: React.FC<ShotP> = ({ T, a, b }) => {
  const outT = W("sneaked"), dive = W("dived") + 0.15;
  const tilt = T > W("landing") - 0.9 ? -6 * Easing.inOut(Easing.sin)(clamp01((T - W("landing") + 0.9) / 0.6)) : 0;
  const lid = T < outT - 0.3 ? 0 : T < dive + 0.35 ? clamp01((T - outT + 0.3) / 0.3) : 1 - clamp01((T - dive - 0.35) / 0.15);
  const stand = T > W("stretch") - 0.25 && T < dive;
  const rise = T < dive ? Easing.out(Easing.cubic)(clamp01((T - outT) / 0.5)) : 1 - Easing.in(Easing.cubic)(clamp01((T - dive) / 0.3));
  const cx = 380, cy = 1700, s = 1.45;
  const rx = stand ? cx + 330 * Easing.inOut(Easing.sin)(clamp01((T - W("stretch") + 0.25) / 0.6)) : cx;
  const bx = stand ? rx : cx + 100 * Math.sin(T * 1.5), by = stand ? 1350 : 1500;
  const rp: Pose = { expr: T > W("dived") - 0.5 ? "surprised" : stand ? "happy" : "sly", facing: 0.3, gesture: stand ? "shrug" : "none", gk: stand ? ramp(T, W("stretch"), 0.3) : 0,
    blink: blinkAt(T, 41), lookX: T > W("dived") - 0.5 ? 1 : 0, ex: stand && T < W("dived") - 0.5 ? { eyes: "closed", mouth: "open" } : {} };
  const red = T > W("landing") - 1.1 && Math.sin(T * 10) > 0;
  return (
    <AbsoluteFill style={{ background: "#0c0c16" }}>
      <AbsoluteFill style={{ transform: `rotate(${tilt}deg) scale(1.08)` }}>
        <Dark bx={bx} by={by} r={stand ? 640 : 520}>
          <Svg>
            <rect x={0} y={0} width={1080} height={1920} fill="#1e2232" />
            {[0, 1, 2, 3].map((i) => <path key={i} d={`M${-100 + i * 380},0 Q${-200 + i * 380},960 ${-100 + i * 380},1920`} stroke="#2e3448" strokeWidth={40} fill="none" />)}
            {[[160, 1300, 300, 200], [880, 1350, 360, 240], [900, 1110, 260, 160], [120, 1100, 220, 140]].map(([x, y, w, h], i) =>
              <Crate key={i} x={x} y={y} w={w} h={h} label={false} arrows={i % 2 === 0} />)}
            <path d="M0,1500 L1080,1460" stroke="#3a3048" strokeWidth={8} strokeDasharray="30 20" />
            <defs><clipPath id="dhc"><rect x={0} y={0} width={1080} height={cy - 150} /></clipPath></defs>
            {!stand && rise > 0.01 && <g clipPath="url(#dhc)"><AF id="bdh" look={REG_B} x={cx} y={lerp(cy + 320, cy - 280, rise)} s={s} pose={rp} shadow={false} /></g>}
            <Crate x={cx} y={cy} w={480} h={280} cod={1} lid={lid} />
            {stand && <AF id="bdh2" look={REG_B} x={rx} y={cy + 20} s={s} pose={rp} shadow={false} />}
          </Svg>
        </Dark>
      </AbsoluteFill>
      <Svg>
        <circle cx={900} cy={300} r={40} fill={red ? "#ff3a3a" : "#4a1a1a"} stroke={INK} strokeWidth={6} />
        {red && <circle cx={900} cy={300} r={90} fill="rgba(255,60,60,0.25)" />}
      </Svg>
    </AbsoluteFill>
  );
};
// 13. Bombay, blinding noon: the handler yanks the crate off the cart; it lands upside down
const S_Apron: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.12, z1: 1.24, cx: 540, cy: 1600, dx: 20 };
  const s = 1.35, H = at(300, 1810, t, dur, c), CT = at(650, 1760, t, dur, c);
  const yank = W("upside") - 0.4, k = clamp01((T - yank) / 0.5);
  const cx = lerp(CT.x, CT.x - 80, k), cy = CT.y - 90 * CT.z + (90 * CT.z + 50) * k - 160 * Math.sin(Math.PI * k);
  const hp: Pose = { expr: k > 0.9 ? "happy" : "stern", facing: 0.6, gesture: k > 0 && k < 1 ? "point" : "offer", gk: 1, blink: blinkAt(T, 42), lookX: 1, lean: k > 0 && k < 1 ? -8 : 0 };
  return (
    <AbsoluteFill>
      <LivePlate name="b_apron" T={T} t={t} dur={dur} c={c} bright={1.12} fx={FX.b_apron} />
      <Haze top="rgba(255,250,220,0.3)" vig={0.2} />
      <Svg>
        <g transform={`translate(${CT.x},${CT.y})`}>
          <rect x={-200 * CT.z} y={-90 * CT.z} width={400 * CT.z} height={40 * CT.z} fill="#6a6a78" stroke={INK} strokeWidth={6} />
          {[-150, 150].map((x) => <circle key={x} cx={x * CT.z} cy={-30 * CT.z} r={30 * CT.z} fill="#2a2a30" stroke={INK} strokeWidth={5} />)}
        </g>
        <Crate x={cx} y={cy + 50} w={400 * CT.z} h={230 * CT.z} cod={1} rot={180 * Easing.inOut(Easing.cubic)(k)} />
        {shadowAt(H.x, H.y, s * H.z)}
        <AF id="bha" look={HANDLER2} x={H.x} y={H.y} s={s * H.z} pose={hp} shadow={false} />
        <Heat t={T} y0={1800} o={0.6} />
        <Card k={(T - W("bombay") + 0.1) / 0.35} text="BOMBAY, NOON" y={420} />
      </Svg>
    </AbsoluteFill>
  );
};
// 14. inside, upside down: a thermometer climbing, the cardigan comes off
const S_Upside: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const strip = T > W("stripped") - 0.05, sk = clamp01((T - W("stripped") + 0.05) / 0.7);
  const faint = T > W("pass") - 0.2;
  const pose: Pose = { expr: "worried", ex: faint ? { eyes: "closed", mouth: "wobble" } : { mouth: "open", sweat: true }, facing: -0.1, gesture: strip ? "wave" : "shrug", gk: 1, talk: T * 1.4,
    blink: blinkAt(T, 43), headTilt: faint ? 10 * Math.sin(T * 2.5) : 0 };
  const th = clamp01(t / (dur - 0.5));
  return (
    <CrateInside t={T} hot={clamp01(t / 1.0)} light={0.9}>
      <Svg>
        <g transform={`rotate(180,540,980) translate(540,980) scale(${1 + 0.05 * p}) translate(-540,-980)`}>
          <AF id="bup" look={strip ? REG_B_VEST : REG_B} x={600} y={1880} s={3.1} pose={pose} shadow={false} />
        </g>
        <Sweat x={600} y={1000} t={T} n={5} s={1.6} dir={-1} />
        <g transform="translate(140,1250)">
          <rect x={-34} y={-520} width={68} height={560} rx={34} fill="#fffaf0" stroke={INK} strokeWidth={7} />
          <rect x={-16} y={-500 + 480 * (1 - th)} width={32} height={500 - 480 * (1 - th)} rx={16} fill="#e0302a" />
          <circle cx={0} cy={50} r={56} fill="#e0302a" stroke={INK} strokeWidth={7} />
        </g>
        {sk > 0 && sk < 1 && <g transform={`translate(${600 + 520 * sk},${1150 - 600 * Math.sin(Math.PI * sk)}) rotate(${-360 * sk})`}>
          <path d="M-90,-60 L90,-60 L130,40 L80,50 L70,90 L-70,90 L-80,50 L-130,40 Z" fill="#4f6a3e" stroke={INK} strokeWidth={6} strokeLinejoin="round" /></g>}
      </Svg>
    </CrateInside>
  );
};
// 15. Perth, heard from inside: the crate lurches, swearing through the slits; Reg doesn't breathe
const S_Listen: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const lurch = 30 * Math.sin(T * 3.1) * clamp01((T - W("handlers") + 0.3) / 0.4);
  const quiet = T > W("didnt") - 0.15;
  const pose: Pose = { expr: "worried", ex: quiet ? { mouth: "M", sweat: true } : { mouth: "o" }, facing: 0, gesture: "cross", gk: 1, blink: quiet ? 0 : blinkAt(T, 44),
    lookX: Math.sin(T * 4) > 0 ? 1 : -1, lookY: -0.3 };
  return (
    <AbsoluteFill style={{ transform: `rotate(${lurch * 0.15}deg) translate(0,${lurch}px) scale(1.06)` }}>
      <CrateInside t={T} light={0.75}>
        <Svg>
          <AF id="bli" look={REG_B_VEST} x={540} y={1930 + 20 * p} s={3.9 + 0.2 * p} pose={pose} shadow={false} />
          <Grawlix x={270} y={420} k={(T - W("swore") + 0.1) / 1.3} s={0.85} />
          <Grawlix x={810} y={600} k={(T - W("size") + 0.1) / 1.2} s={0.8} flip text="!@#$" />
          <Card k={(T - W("perth", 1) + 0.1) / 0.35} text="PERTH" y={250} w={420} />
        </Svg>
      </CrateInside>
    </AbsoluteFill>
  );
};
// 16a. the lid creaks open; in the gap, Reg pulls on his suit jacket
const S_Dress: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const suit = T > W("suit") - 0.1;
  const pose: Pose = { expr: suit ? "smug" : "sly", facing: 0.15, gesture: suit ? "tip" : "none", gk: ramp(T, W("suit") - 0.1, 0.3), blink: blinkAt(T, 45), lookX: 0.6 };
  const lid = clamp01((T - a - 0.1) / 0.6);
  return (
    <CrateInside t={T} light={0.6 + 0.4 * lid}>
      <Svg>
        <rect x={0} y={0} width={1080} height={420 * lid} fill="#f6d8a0" opacity={0.85} />
        <AF id="bdr" look={suit ? REG_B_SUIT : REG_B_VEST} x={540} y={1930 + 20 * p} s={3.6 + 0.2 * p} pose={pose} shadow={false} />
        <Sparkle x={820} y={900} k={(T - W("suit") + 0.1) / 0.45} />
      </Svg>
    </CrateInside>
  );
};
// 16b. outside at dawn: a small figure in a suit walks away across the apron. Nobody looks.
const S_Away: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.05, z1: 1.15, cx: 540, cy: 1500 };
  const wk = walker(T, a, b + 0.8, 4.2), s = 0.85;
  const R = at(330 + wk.dist * s * 0.7, 1700 - wk.dist * s * 0.25, t, dur, c);
  const rp: Pose = { phase: wk.phase, walk: wk.walk, expr: "sly", facing: 0.7, blink: blinkAt(T, 46), lookX: -0.8 };
  return (
    <AbsoluteFill>
      <LivePlate name="b_runway" T={T} t={t} dur={dur} c={c} bright={1.0} fx={FX.b_runway} />
      <AbsoluteFill style={{ background: "linear-gradient(rgba(255,170,110,0.35), rgba(255,200,150,0.08) 60%, rgba(60,40,80,0.2))" }} />
      <Haze top="rgba(255,180,120,0.1)" vig={0.4} />
      <Svg>
        <Crate x={at(220, 1820, t, dur, c).x} y={at(220, 1820, t, dur, c).y} w={420} h={240} cod={1} lid={1} />
        {shadowAt(R.x, R.y, s * R.z)}
        <AF id="baw" look={REG_B_SUIT} x={R.x} y={R.y} s={s * R.z} pose={rp} shadow={false} />
        <Card k={(T - W("unnoticed") + 0.05) / 0.35} text="UNNOTICED." y={420} w={560} />
      </Svg>
    </AbsoluteFill>
  );
};
// 17. 63 hours: a flip counter, and the tag collects its stamps
const S_Clock: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, h = Math.round(63 * Easing.out(Easing.cubic)(clamp01(t / 1.6)));
  const digit = (d: string, x: number) => (
    <g transform={`translate(${x},620)`}>
      <rect x={-110} y={-160} width={220} height={320} rx={22} fill="#2a2230" stroke={INK} strokeWidth={8} />
      <path d="M-110,0 H110" stroke="#0e0a12" strokeWidth={8} />
      <text x={0} y={95} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={260} fill="#fffaf0">{d}</text>
    </g>
  );
  const ds = String(h).padStart(2, "0");
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #3a4a7a, #141a30)" }}>
      <Svg>
        {digit(ds[0], 420)}{digit(ds[1], 660)}
        <text x={540} y={880} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={84} fill="#ffd04a">HOURS IN A BOX</text>
        <Tag x={540} y={1400} s={1.35} rot={5 * Math.sin(T * 1.5)} lines={["LONDON", "→ PERTH"]}
          stamps={[{ t: "LONDON", k: (t - 0.3) / 0.3, c: "#2a4a8a" }, { t: "BOMBAY", k: (t - 0.9) / 0.3, c: "#c0303a" }, { t: "PERTH", k: (t - 1.5) / 0.3, c: "#2f7a42" }]} />
      </Svg>
    </AbsoluteFill>
  );
};
// 18. home in Adelaide: the door opens, his daughter runs to him, cake and balloons
const S_Home: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.12, z1: 1.26, cx: 540, cy: 1620 };
  const R = at(300, 1810, t, dur, c), s = 1.35;
  const wk = walker(T, a + 0.3, W("birthday", 1) - 0.1, 3.2);
  const D = at(860 - wk.dist * 0.85 * 0.5, 1820, t, dur, c);
  const hug = T > W("birthday", 1) - 0.15;
  const rp: Pose = { expr: "happy", facing: 0.5, gesture: hug ? "offer" : "shrug", gk: 1, blink: blinkAt(T, 47), lookX: 1, lookY: 0.5 };
  const dp: Pose = { phase: wk.phase, walk: wk.walk, expr: "laugh", facing: -0.6, gesture: "wave", gk: 1, talk: T * 1.4, blink: blinkAt(T, 48), lookX: -1, lookY: -0.4 };
  return (
    <AbsoluteFill>
      <LivePlate name="b_home" T={T} t={t} dur={dur} c={c} fx={FX.b_home} />
      <Haze top="rgba(255,220,170,0.08)" vig={0.3} />
      <Svg>
        {(() => { const F = at(790, 1800, t, dur, c), z = F.z; return (
          <g transform={`translate(${F.x},${F.y}) scale(${z})`}>
            <ellipse cx={0} cy={4} rx={170} ry={16} fill="rgba(40,25,20,0.25)" />
            {[-120, 120].map((lx) => <rect key={lx} x={lx - 11} y={-235} width={22} height={235} rx={6} fill="#8a5a32" stroke={INK} strokeWidth={6} />)}
            <rect x={-160} y={-262} width={320} height={34} rx={8} fill="#a8703e" stroke={INK} strokeWidth={7} />
            <path d="M-150,-252 H150" stroke="rgba(255,255,255,0.25)" strokeWidth={5} />
            <path d="M-150,-228 Q-110,-196 -70,-228 Q-30,-196 10,-228 Q50,-196 90,-228 Q120,-200 150,-228" fill="#f6efe2" stroke={INK} strokeWidth={4} />
            <Cake x={0} y={-262} s={0.8} t={T} />
          </g>); })()}
        {shadowAt(R.x, R.y, s * R.z)}{shadowAt(D.x, D.y, 0.85 * D.z)}
        <AF id="bho" look={REG_B_SUIT} x={R.x} y={R.y} s={s * R.z} pose={rp} shadow={false} />
        <AF id="bhd" look={DAUGHTER} x={D.x} y={D.y} s={0.85 * D.z} flip pose={dp} shadow={false} />
        {hug && Array.from({ length: 24 }, (_, i) => { const u = clamp01((T - W("birthday", 1) + 0.15) / 1.6); const ang = i * 2.4;
          return <rect key={i} x={540 + Math.cos(ang) * 500 * u} y={700 + Math.sin(ang) * 300 * u + 600 * u * u} width={18} height={10} fill={["#e87a7a", "#ffd04a", "#7ac0e8", "#9ad49a"][i % 4]}
            transform={`rotate(${i * 40 + T * 300},${540 + Math.cos(ang) * 500 * u},${700 + Math.sin(ang) * 300 * u + 600 * u * u})`} opacity={1 - u * 0.6} />; })}
        <Card k={(T - W("adelaide") + 0.1) / 0.35} text="ADELAIDE" y={380} sub="hitchhiked all the way" />
      </Svg>
    </AbsoluteFill>
  );
};
// 19. London: John's call reaches a newspaper; the typewriter rattles, the story goes worldwide
const S_Newsroom: React.FC<ShotP> = ({ T, a, b }) => {
  // John, worried, calls a newspaper from his office desk; then the story goes worldwide
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.3, cx: 540, cy: 1450 };
  const X = at(600, 1630, t, dur, c), s = 2.0 * X.z;
  const call = T > W("called") - 0.35, talkHard = T > W("newspaper") - 0.1;
  const pose: Pose = { expr: talkHard ? "amazed" : call ? "worried" : "worried", ex: call && !talkHard ? { mouth: "wobble" } : {}, facing: 0.25, blink: blinkAt(T, 49),
    lookX: talkHard ? -0.5 : 0.2, lookY: talkHard ? 0 : 0.3, gesture: call ? "chin" : "rub", gk: call ? ramp(T, W("called") - 0.35, 0.35) : 1,
    gesture2: undefined, talk: call ? T * 2 : undefined, headTilt: call ? 6 : 0 };
  const hp = handAt(X.x, X.y, s, 40, 135, 1);
  const ear = { x: X.x + 96 * s, y: X.y - 250 * s };
  const D = at(540, 1775, t, dur, c), dz = D.z;
  const base = { x: D.x - 250 * dz, y: D.y - 330 * dz };
  const lifted = call && ramp(T, W("called") - 0.35, 0.35) > 0.6;
  const mouth = { x: X.x + 52 * s, y: X.y - 168 * s };
  const hx = lifted ? (ear.x + mouth.x) / 2 : base.x, hy = lifted ? (ear.y + mouth.y) / 2 : base.y - 52 * dz;
  const ang = lifted ? (Math.atan2(ear.y - mouth.y, ear.x - mouth.x) * 180) / Math.PI + 90 : 90;
  const hl = Math.hypot(ear.x - mouth.x, ear.y - mouth.y) / 120;
  const world = T > W("worldwide") - 0.1;
  const ring = !call && Math.sin(T * 40) > 0 ? 1 : 0;
  return (
    <AbsoluteFill>
      <LivePlate name="b_newsroom" T={T} t={t} dur={dur} c={c} fx={FX.b_newsroom} />
      <Haze top="rgba(255,230,190,0.08)" vig={0.35} />
      <Svg>
        <AF id="bjo" look={JOHN_B} x={X.x} y={X.y} s={s} pose={pose} shadow={false} />
        {/* the desk */}
        <g transform={`translate(${D.x},${D.y}) scale(${dz})`}>
          <rect x={-420} y={-300} width={840} height={520} fill="#7a4e2c" stroke={INK} strokeWidth={8} />
          <rect x={-450} y={-330} width={900} height={40} rx={8} fill="#9a6638" stroke={INK} strokeWidth={8} />
          {[-1, 1].map((k) => <g key={k}><rect x={k * 230 - 150} y={-250} width={300} height={90} rx={6} fill="#6a4226" stroke={INK} strokeWidth={5} />
            <rect x={k * 230 - 30} y={-212} width={60} height={14} rx={7} fill="#d8b46a" stroke={INK} strokeWidth={4} /></g>)}
          <g transform="translate(150,-330) rotate(-4)"><rect x={-90} y={-14} width={180} height={14} fill="#f4efe4" stroke={INK} strokeWidth={4} />
            <rect x={-80} y={-26} width={170} height={12} fill="#ebe4d4" stroke={INK} strokeWidth={4} /></g>
        </g>
        {/* black rotary telephone on the desk */}
        <g transform={`translate(${base.x + (ring ? 3 : 0)},${base.y}) scale(${dz})`}>
          <path d="M-95,0 L-70,-60 Q0,-80 70,-60 L95,0 Z" fill="#1e1c24" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
          <circle cx={0} cy={-30} r={30} fill="#efe8d8" stroke={INK} strokeWidth={5} />
          {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={21 * Math.cos(i * 0.55 + 0.6)} cy={-30 + 21 * Math.sin(i * 0.55 + 0.6)} r={4} fill="#1e1c24" />)}
          <rect x={-70} y={-74} width={20} height={16} rx={4} fill="#1e1c24" stroke={INK} strokeWidth={4} />
          <rect x={50} y={-74} width={20} height={16} rx={4} fill="#1e1c24" stroke={INK} strokeWidth={4} />
        </g>
        {/* the coiled cord from the phone to the handset */}
        {lifted && (() => { const x0 = base.x + 80 * dz, y0 = base.y - 10 * dz, x1 = hx + (lifted ? 0 : 60 * dz), y1 = hy + (lifted ? 60 * hl : 0);
          const pts = Array.from({ length: 41 }, (_, i) => { const u = i / 40, sag = Math.sin(Math.PI * u) * 90 * dz;
            return `${(x0 + (x1 - x0) * u + Math.sin(u * 60) * 7 * dz).toFixed(1)},${(y0 + (y1 - y0) * u + sag + Math.cos(u * 60) * 7 * dz).toFixed(1)}`; });
          return <polyline points={pts.join(" ")} fill="none" stroke="#1e1c24" strokeWidth={5 * dz} strokeLinejoin="round" />; })()}
        {/* the handset: on the cradle, then at his ear */}
        <g transform={`translate(${hx},${hy}) rotate(${ang}) scale(${lifted ? hl : dz})`}>
          <path d="M-14,-62 Q-24,-62 -24,-44 L-24,44 Q-24,62 -14,62 L14,62 Q26,62 26,44 L26,-44 Q26,-62 14,-62 Z" fill="none" />
          <rect x={-12} y={-56} width={24} height={112} rx={10} fill="#1e1c24" stroke={INK} strokeWidth={6} />
          <ellipse cx={0} cy={-60} rx={26} ry={18} fill="#1e1c24" stroke={INK} strokeWidth={6} />
          <ellipse cx={0} cy={60} rx={26} ry={18} fill="#1e1c24" stroke={INK} strokeWidth={6} />
          <path d="M-6,-20 V20" stroke="rgba(255,255,255,0.2)" strokeWidth={5} strokeLinecap="round" />
        </g>
        {ring > 0 && !call && <text x={base.x + 120 * dz} y={base.y - 120 * dz} fontFamily={hand} fontSize={40} fill="#fffaf0">)))</text>}
        {world && [0, 1, 2].map((i) => { const k = clamp01((T - W("worldwide") + 0.1 - i * 0.2) / 0.5); return <Newspaper key={i} x={300 + i * 240} y={620 - i * 60} s={0.55 * Easing.out(Easing.back(1.5))(k)}
          rot={-12 + i * 12 + 540 * (1 - k)} head={["MAN POSTS HIMSELF", "HUMAN CARGO!", "BOXED ATHLETE"][i]} />; })}
        <Card k={(T - W("london", 2) + 0.1) / 0.35} text="MEANWHILE, LONDON" y={330} />
      </Svg>
    </AbsoluteFill>
  );
};
// 20. scared? at home, a shrug and a grin, his daughter laughing beside him
const S_Shrug: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const sh = T > W("shrugged") - 0.15, fr = T > W("frightened") - 0.1;
  const pose: Pose = { expr: fr ? "smug" : sh ? "smile" : "neutral", facing: 0.2, gesture: sh ? "shrug" : "none", gk: ramp(T, W("shrugged") - 0.15, 0.3), talk: T,
    wink: T > W("of", 3) + 0.15 && T < W("of", 3) + 0.6, blink: blinkAt(T, 50), lookX: fr ? 0 : 0.5 };
  return (
    <AbsoluteFill>
      <LivePlate name="b_home" T={T} t={t} dur={dur} c={{ z0: 1.5, z1: 1.62, cx: 540, cy: 1200 }} blur={3.2} fx={FX.b_home} />
      <Haze top="rgba(255,220,170,0.08)" vig={0.36} />
      <Svg>
        <AF id="bsh" look={REG_B_SUIT} x={420} y={1900 + 20 * p} s={3.5 + 0.2 * p} pose={pose} shadow={false} />
        <AF id="bsd" look={DAUGHTER} x={880} y={1920 + 20 * p} s={2.0 + 0.1 * p} flip pose={{ expr: "laugh", facing: -0.5, gesture: "rub", gk: 1, blink: blinkAt(T, 51), lookX: -1, lookY: -0.5 }} shadow={false} />
        <Sparkle x={760} y={560} k={(T - W("of", 3) - 0.1) / 0.5} />
      </Svg>
    </AbsoluteFill>
  );
};

const SHOTS: [number, React.FC<ShotP>][] = [
  [0, S_Torch], [4.3, S_Loading], [6.3, S_Bedsit], [9.3, S_Jar], [12.8, S_Job], [17.5, S_Peek], [20.8, S_Saw], [23.4, S_LidTest],
  [25.6, S_Toss], [31.9, S_TagShot], [35.1, S_Bangs], [37.6, S_DarkHold], [43.4, S_Apron], [47.8, S_Upside], [52.4, S_Listen], [57.6, S_Dress],
  [59.6, S_Away], [61.5, S_Clock], [65.3, S_Home], [68.3, S_Newsroom], [73.3, S_Shrug],
];
const sub = defaultStyle("funny", { keyWords: KEY, y: 0.86, maxChars: 16 });
const subS = { ...sub, moves: [{ from: 0, to: 4.3, y: 0.86 }, { from: 4.3, to: 6.3, y: 0.62 }, { from: 6.3, to: 9.3, y: 0.62 }, { from: 9.3, to: 12.8, y: 0.86 },
  { from: 12.8, to: 17.5, y: 0.62 }, { from: 17.5, to: 20.8, y: 0.86 }, { from: 20.8, to: 23.4, y: 0.62 }, { from: 23.4, to: 25.6, y: 0.3 }, { from: 25.6, to: 31.9, y: 0.62 },
  { from: 31.9, to: 35.1, y: 0.86 }, { from: 35.1, to: 37.6, y: 0.86 }, { from: 37.6, to: 43.4, y: 0.25 }, { from: 43.4, to: 47.8, y: 0.62 }, { from: 47.8, to: 52.4, y: 0.86 },
  { from: 52.4, to: 57.6, y: 0.86 }, { from: 57.6, to: 59.6, y: 0.86 }, { from: 59.6, to: 61.5, y: 0.62 }, { from: 61.5, to: 65.3, y: 0.55 }, { from: 65.3, to: 68.3, y: 0.62 },
  { from: 68.3, to: 73.3, y: 0.87 }] };

export const ShortB: React.FC<{ withAudio?: boolean; v3?: boolean }> = ({ withAudio = true, v3 = false }) => {
  setCfg(V3);
  FIGCFG.v2 = true;
  FIGCFG.v3 = v3;
  useMarkerFont();
  const f = useCurrentFrame(), T = f / FPS;
  let k = SHOTS.findIndex(([s0], i) => T >= s0 && T < (SHOTS[i + 1]?.[0] ?? 1e9));
  if (k < 0) k = SHOTS.length - 1;
  const [a, S] = SHOTS[k], b = SHOTS[k + 1]?.[0] ?? END;
  // B's transitions: a quick dip to black (a blink of the torch) instead of A's white flash
  const cutK = SHOTS.slice(1).reduce((m, [c]) => Math.min(m, Math.abs(T - c) * FPS), 99);
  const fadeIn = interpolate(T, [0, 0.35], [1, 0], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(T, [END - 0.7, END - 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#0e0a12" }}>
      <S T={T} a={a} b={b} />
      <AbsoluteFill style={{ background: "linear-gradient(rgba(90,110,200,0.10), rgba(255,200,150,0.0) 50%, rgba(40,20,60,0.16))", mixBlendMode: "soft-light" }} />
      {cutK < 2 && <AbsoluteFill style={{ background: "#000", opacity: 0.35 * (2 - cutK) / 2 }} />}
      <Subtitles words={WORDS} style={subS} />
      {withAudio && <Audio src={staticFile("mailed/b_mix.wav")} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  );
};
