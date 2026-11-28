// Monster design sheet for the spider woman: her disguise, the turn, her shadow (jumpscare 3), and the true form
// glimpsed in the rafters. Same flat ink style as the cast, so she fits the video.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Kimono, INK } from "./kimono";
import { LADY } from "./CharTest";

type V = [number, number];
const CHITIN = "#3a1c34", CHITIN_HI = "#8a4a76", BAND = "#b0142c";
/** a spider leg: root -> knee (high) -> joint -> tip, tapered, drawn as ink outline + chitin fill + red joint bands */
const Leg: React.FC<{ pts: V[]; w: number; dark?: boolean }> = ({ pts, w, dark }) => {
  const seg = (i: number) => `M${pts[i][0]},${pts[i][1]} L${pts[i + 1][0]},${pts[i + 1][1]}`;
  const ws = [w, w * 0.75, w * 0.45];
  return <g>
    {[0, 1, 2].map((i) => <path key={"o" + i} d={seg(i)} stroke={INK} strokeWidth={ws[i] + 6} strokeLinecap="round" />)}
    {[0, 1, 2].map((i) => <path key={"f" + i} d={seg(i)} stroke={dark ? "#000" : CHITIN} strokeWidth={ws[i]} strokeLinecap="round" />)}
    {!dark && [0, 1].map((i) => <path key={"h" + i} d={seg(i)} stroke={CHITIN_HI} strokeWidth={ws[i] * 0.25} strokeLinecap="round" opacity={0.7} transform={`translate(${-ws[i] * 0.2},${-ws[i] * 0.2})`} />)}
    {!dark && [1, 2].map((i) => <circle key={"b" + i} cx={pts[i][0]} cy={pts[i][1]} r={ws[i - 1] * 0.42} fill={BAND} stroke={INK} strokeWidth={3} />)}
  </g>;
};
/** eight legs fanning out from a point: four reach up and over, four reach down; s = size, sp = spread */
const legsFrom = (cx: number, cy: number, s: number, side: number, sp = 1): V[][] => {
  const out: V[][] = [];
  for (let k = 0; k < 8; k++) {
    const dir = k < 4 ? side : -side, j = k % 4;
    const a = (-70 + j * 38) * sp;                       // fan angle
    const r = (d: number, ang: number): V => [cx + dir * Math.cos((ang * Math.PI) / 180) * d * s, cy + Math.sin((ang * Math.PI) / 180) * d * s];
    out.push([[cx, cy], r(0.55, a - 35), r(1.0, a + 5), r(1.25, a + 55)]);
  }
  return out;
};

const Label: React.FC<{ x: number; y: number; t: string; sub: string }> = ({ x, y, t, sub }) =>
  <g fontFamily="Georgia, serif" textAnchor="middle">
    <rect x={x - 250} y={y - 50} width={500} height={110} rx={14} fill="#0b080c" opacity={0.82} />
    <text x={x} y={y} fontSize={38} fill="#f1e6d8" fontWeight={700}>{t}</text>
    <text x={x} y={y + 40} fontSize={24} fill="#b8a8a0">{sub}</text>
  </g>;

export const JMonsterSheet: React.FC = () => {
  const PW = 540, PH = 860, Y0 = 200;
  const panel = (i: number) => ({ x: (i % 2) * PW, y: Y0 + Math.floor(i / 2) * PH });
  const lady = (x: number, y: number, ppm: number, voidEyes: boolean, expr: "eerie" | "neutral" = "eerie") =>
    <Kimono x={x} y={y} ppm={ppm} look={LADY} flip pose={{ t: 1.3, lookX: 0.3, expr, voidEyes, glide: true, armNear: [8, 72], armFar: [6, 78] }} />;
  const A = panel(0), B = panel(1), C = panel(2), D = panel(3);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b080c" }}>
      <Img src={staticFile("jorogumo/chartest/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920, opacity: 0.18, filter: "blur(6px)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="glow" cx="50%" cy="60%" r="60%"><stop offset="0" stopColor="#ffb060" stopOpacity={0.35} /><stop offset="1" stopColor="#ff8030" stopOpacity={0} /></radialGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feFlood floodColor="#0a0406" result="c" /><feComposite in="c" in2="SourceAlpha" operator="in" result="s" /><feGaussianBlur in="s" stdDeviation={5} />
          </filter>
          <linearGradient id="paper" x1={0} y1={0} x2={0} y2={1}><stop offset="0" stopColor="#e8c79a" /><stop offset="1" stopColor="#c89660" /></linearGradient>
        </defs>
        <text x={540} y={95} fontFamily="Georgia, serif" fontSize={64} fill="#f1e6d8" textAnchor="middle" fontWeight={700}>The Spider Woman</text>
        <text x={540} y={150} fontFamily="Georgia, serif" fontSize={28} fill="#b8a8a0" textAnchor="middle">monster design sheet · Jorōgumo (legend)</text>
        {[A, B, C, D].map((p, i) => <rect key={i} x={p.x + 14} y={p.y + 10} width={PW - 28} height={PH - 20} rx={18} fill="none" stroke="#3a2a30" strokeWidth={3} />)}

        {/* 1. the disguise */}
        <rect x={A.x + 14} y={A.y + 10} width={PW - 28} height={PH - 20} rx={18} fill="url(#glow)" />
        {lady(A.x + 290, A.y + 690, 360, false)}
        <Label x={A.x + PW / 2} y={A.y + 760} t="1 · The disguise" sub="a kind young woman, web hidden in her kimono" />

        {/* 2. the turn: black eyes, legs unfolding from her back */}
        <rect x={B.x + 14} y={B.y + 10} width={PW - 28} height={PH - 20} rx={18} fill="#140a10" />
        {legsFrom(B.x + 320, B.y + 360, 215, 1, 1.05).map((l, k) => <Leg key={k} pts={l} w={24} />)}
        {legsFrom(B.x + 250, B.y + 360, 170, -1, 0.9).slice(0, 4).map((l, k) => <Leg key={"m" + k} pts={l} w={20} />)}
        {lady(B.x + 270, B.y + 690, 360, true)}
        <Label x={B.x + PW / 2} y={B.y + 760} t="2 · The turn" sub="eyes go black, eight legs unfold behind her" />

        {/* 3. the shadow on the shoji (jumpscare 3) */}
        <rect x={C.x + 14} y={C.y + 10} width={PW - 28} height={PH - 20} rx={18} fill="url(#paper)" />
        {[0, 1, 2, 3, 4].map((k) => <path key={"v" + k} d={`M${C.x + 14 + (k + 1) * 85},${C.y + 10} L${C.x + 14 + (k + 1) * 85},${C.y + PH - 10}`} stroke="#5a3a22" strokeWidth={8} />)}
        {[0, 1, 2, 3, 4, 5, 6].map((k) => <path key={"h" + k} d={`M${C.x + 14},${C.y + 10 + (k + 1) * 105} L${C.x + PW - 14},${C.y + 10 + (k + 1) * 105}`} stroke="#5a3a22" strokeWidth={6} />)}
        <g filter="url(#shadow)">
          {legsFrom(C.x + 270, C.y + 330, 230, 1, 1.05).map((l, k) => <Leg key={k} pts={l} w={26} dark />)}
          {legsFrom(C.x + 270, C.y + 330, 230, -1, 1.05).map((l, k) => <Leg key={"m" + k} pts={l} w={26} dark />)}
          {lady(C.x + 270, C.y + 700, 400, false)}
        </g>
        <Label x={C.x + PW / 2} y={C.y + 760} t="3 · The shadow" sub="lantern flickers: her shadow has eight legs" />

        {/* 4. the true form in the rafters */}
        <rect x={D.x + 14} y={D.y + 10} width={PW - 28} height={PH - 20} rx={18} fill="#241a2c" />
        <rect x={D.x + 14} y={D.y + 120} width={PW - 28} height={46} fill="#2a1a12" stroke={INK} strokeWidth={4} />
        {legsFrom(D.x + 270, D.y + 300, 175, 1, 0.9).map((l, k) => <Leg key={k} pts={l} w={28} />)}
        {legsFrom(D.x + 270, D.y + 300, 175, -1, 0.9).map((l, k) => <Leg key={"m" + k} pts={l} w={28} />)}
        {/* hair hanging from the head, abdomen with the obi's gold band and a spider-lily mark */}
        <path d={`M${D.x + 230},${D.y + 260} Q${D.x + 200},${D.y + 420} ${D.x + 215},${D.y + 560} L${D.x + 325},${D.y + 560} Q${D.x + 340},${D.y + 420} ${D.x + 310},${D.y + 260} Z`} fill="#120e14" stroke={INK} strokeWidth={5} />
        <ellipse cx={D.x + 270} cy={D.y + 215} rx={120} ry={95} fill={LADY.top} stroke={INK} strokeWidth={6} />
        <path d={`M${D.x + 160},${D.y + 215} Q${D.x + 270},${D.y + 250} ${D.x + 380},${D.y + 215}`} stroke={LADY.obi} strokeWidth={22} fill="none" />
        {[0, 60, 120, 180, 240, 300].map((r) => <path key={r} d={`M${D.x + 270},${D.y + 170} l${22 * Math.cos(r * Math.PI / 180)},${22 * Math.sin(r * Math.PI / 180)}`} stroke={BAND} strokeWidth={5} />)}
        <circle cx={D.x + 270} cy={D.y + 300} r={62} fill="#f3e4dc" stroke={INK} strokeWidth={6} />
        <path d={`M${D.x + 208},${D.y + 290} Q${D.x + 215},${D.y + 238} ${D.x + 270},${D.y + 236} Q${D.x + 325},${D.y + 238} ${D.x + 332},${D.y + 290} L${D.x + 300},${D.y + 270} L${D.x + 240},${D.y + 270} Z`} fill="#120e14" />
        {[[-24, 292], [24, 292], [-40, 312], [40, 312], [-12, 312], [12, 312]].map(([dx, dy], k) => <ellipse key={k} cx={D.x + 270 + dx} cy={D.y + dy} rx={k < 2 ? 11 : 6} ry={k < 2 ? 13 : 7} fill="#050304" />)}
        {[[-24, 288], [24, 288]].map(([dx, dy], k) => <circle key={k} cx={D.x + 270 + dx} cy={D.y + dy} r={3} fill={BAND} />)}
        <path d={`M${D.x + 250},${D.y + 338} Q${D.x + 270},${D.y + 350} ${D.x + 290},${D.y + 338}`} stroke={LADY.lips} strokeWidth={6} fill="none" />
        {[0, 1, 2].map((k) => <path key={k} d={`M${D.x + 170 + k * 60},${D.y + 166} L${D.x + 165 + k * 70},${D.y + 650}`} stroke="#c9c4d6" strokeWidth={2} opacity={0.5} />)}
        <Label x={D.x + PW / 2} y={D.y + 760} t="4 · The true form" sub="only glimpsed in the dark rafters" />
      </svg>
    </AbsoluteFill>
  );
};
