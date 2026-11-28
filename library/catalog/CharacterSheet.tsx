// Catalog sheets for the character library (rendered as stills by tools/kz-catalog.sh):
//  CatWardrobe   every WARDROBE look standing, with its name
//  CatFaces      every expression and mouth shape on one head
//  CatMotions    one pose from each motion preset
//  CatBodies     body types side by side
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure, Expr, Pose } from "../characters/rig";
import { WARDROBE, BODY, cast, SKIN, HAIR } from "../characters/looks";
import * as M from "../characters/motion";

const BG = "#d9d2c3", INKT = "#1d1820";
const Label: React.FC<{ x: number; y: number; text: string; size?: number }> = ({ x, y, text, size = 26 }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight={800} fontSize={size} fill={INKT}>{text}</text>
);
const Sheet: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <AbsoluteFill style={{ background: BG }}>
    <svg width={1080} height={1920}>
      <Label x={540} y={70} text={title} size={44} />
      {children}
    </svg>
  </AbsoluteFill>
);

export const CatWardrobe: React.FC = () => {
  const names = Object.keys(WARDROBE), cols = 5, cw = 1080 / cols, rh = 300;
  return <Sheet title="WARDROBE (library/characters/looks.ts)">
    {names.map((n, i) => {
      const cx = cw * (i % cols) + cw / 2, gy = 110 + rh * Math.floor(i / cols) + 240;
      return <g key={n}>
        <Figure x={cx - 10} y={gy} ppm={150} look={WARDROBE[n]} pose={{ t: 1, lookX: 0.4, hold: n === "logger" ? "lantern" : null }} />
        <Label x={cx} y={gy + 40} text={n} size={20} />
      </g>;
    })}
  </Sheet>;
};

const EXPRS: Expr[] = ["neutral", "smile", "laugh", "smug", "surprised", "scared", "worried", "sad", "angry", "stern", "determined", "pain"];
export const CatFaces: React.FC = () => {
  const L = cast(WARDROBE.casual, { skin: SKIN.light, hair: HAIR.brown });
  const L2 = cast(WARDROBE.victorianLady, {});
  const cols = 4, cw = 270;
  return <Sheet title="FACES AND MOUTHS">
    {EXPRS.map((e, i) => {
      const cx = cw * (i % cols) + 110, gy = 760 + 330 * Math.floor(i / cols);
      return <g key={e} clipPath={`url(#cf${i})`}>
        <clipPath id={`cf${i}`}><rect x={cx - 110} y={gy - 640} width={265} height={300} /></clipPath>
        <Figure x={cx} y={gy} ppm={420} look={i % 2 ? L2 : L} pose={{ t: 1, expr: e, lookX: 0.5 }} />
        <Label x={cx + 25} y={gy - 360} text={e} size={26} />
      </g>;
    })}
    {(["A", "E", "O", "U", "M", "F"] as const).map((m, i) => (
      <g key={m}>
        <g clipPath={`url(#cm${i})`}><clipPath id={`cm${i}`}><rect x={i * 175} y={1440} width={175} height={250} /></clipPath>
        <Figure x={60 + i * 175} y={1980} ppm={330} look={L} pose={{ t: 1, mouth: m, lookX: 0.5 }} /></g>
        <Label x={100 + i * 175} y={1730} text={m} />
      </g>
    ))}
  </Sheet>;
};

const MOTIONS: [string, M.Motion, number][] = [
  ["idle", M.idle(), 1], ["walk", M.walk(0, 9), 1.37], ["run", M.run(0, 9), 1.1], ["lookAround", M.lookAround({ side: -1 }), 1],
  ["lookUp", M.lookUp(), 1], ["talk", M.talk(0.8), 0.7], ["point", M.point({ height: 0.3 }), 1], ["wave", M.wave(), 1],
  ["startle", M.startle(0.5), 0.62], ["recoil", M.recoil(), 1], ["shrug", M.shrug(), 0.9], ["laugh", M.laugh(), 1],
  ["think", M.think(), 1], ["cheer", M.cheer(), 1], ["sit", M.sit(0), 1.5], ["crouch", M.crouch(), 1],
  ["fall", M.fall(0.2, -1), 2], ["punch", M.punch(0.5), 0.6], ["swing", M.swing(0.6), 0.65], ["carry", M.carry(), 1],
  ["aim", M.aim(), 1], ["reach", M.reach(), 1], ["torch", M.idle({ hold: "torch" }), 1], ["sword", M.idle({ hold: "sword", armNear: [60, 30] }), 1],
];
export const CatMotions: React.FC = () => {
  const cols = 4, cw = 270, rh = 290;
  const L = cast(WARDROBE.frontiersman, { skin: SKIN.tan });
  return <Sheet title="MOTIONS (library/characters/motion.ts)">
    {MOTIONS.map(([n, m, T], i) => {
      const cx = cw * (i % cols) + cw / 2 - 20, gy = 110 + rh * Math.floor(i / cols) + 240;
      const p: Pose = m(T);
      return <g key={n}>
        {n === "sit" && <rect x={cx - 70} y={gy - 0.45 * 150} width={90} height={0.45 * 150} fill="#8a6a40" stroke={INKT} strokeWidth={3} />}
        <Figure x={cx} y={gy} ppm={150} look={n === "swing" ? cast(L, {}) : L} pose={{ ...p, hold: n === "swing" ? "axe" : n === "aim" ? "rifle" : p.hold }} />
        <Label x={cx + 20} y={gy + 40} text={n} size={22} />
      </g>;
    })}
  </Sheet>;
};

export const CatBodies: React.FC = () => {
  const names = Object.keys(BODY) as (keyof typeof BODY)[];
  return <Sheet title="BODY TYPES">
    {names.map((n, i) => {
      const cx = 70 + i * 100, gy = 700;
      return <g key={n}>
        <Figure x={cx} y={gy} ppm={220} look={cast(WARDROBE.casual, { body: BODY[n], hairStyle: n === "woman" ? "long" : undefined, hair: n === "elder" ? HAIR.white : HAIR.brown })} pose={{ t: 1 }} />
        <Label x={cx + 20} y={gy + 40 + (i % 2) * 28} text={n} size={20} />
      </g>;
    })}
  </Sheet>;
};
