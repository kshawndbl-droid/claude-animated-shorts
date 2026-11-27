// Spider woman Short, Part D (story 33.90 s to the end, line 11): "By morning, she is gone. Only a trail of black
// blood... leading up into the rafters." Video only (no subtitles, no audio; the assembly adds them).
// Shot 1: the empty room at dawn (one 1620px Blender plate, slow 2.5D push): her biwa dropped on the tatami, the
// lantern dark, dust turning in the grey light. Shot 2: ONE tall plate (1080 x 4224) of the black drips running across
// the tatami and up the wall beside the corner post; the frame rises along it into the rafters, which sink into
// darkness, a faint web, then two tiny red points glint in the black and it cuts to black.
// Everything moves per frame from time: a steady 30 fps with no held or skipped frames.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { sm } from "./CharTest";

const FPS = 30;
export const D_START = 33.9, D_END = 41.0;
export const J_PARTD_FRAMES = Math.round((D_END - D_START) * FPS);
const CUT = 35.8 - D_START;           // into the trail just before "Only"
const RISE0 = 37.35 - D_START, RISE1 = 39.6 - D_START;   // the climb rides "leading up into the rafters"
const EYES = 40.05 - D_START, BLACK = 40.62 - D_START;
const TALL = 4224;                     // climb plate height
// the dark corner under the ceiling (plate pixels), where the red points glint
export const CORNER = { x: 560, y: 1430 };

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const DawnDust: React.FC<{ t: number; y0: number; h: number; n?: number }> = ({ t, y0, h, n = 54 }) => {
  const motes = Array.from({ length: n }, (_, i) => {
    const r = (k: number) => { const v = Math.sin(i * 91.7 + k * 271.3) * 43758.5453; return v - Math.floor(v); };
    const x = ((r(1) * 1080 + t * (5 + r(2) * 9) + 24 * Math.sin(t * 0.35 + i)) % 1140) - 30;
    const y = y0 + r(3) * h + 22 * Math.sin(t * (0.2 + r(4) * 0.25) + i) - t * (2 + r(5) * 4);
    return <circle key={i} cx={x} cy={y} r={1.1 + r(6) * 2.6} fill="#f2ead8" opacity={(0.2 + 0.35 * r(7)) * (0.6 + 0.4 * Math.sin(t * 1.1 + i))} />;
  });
  return <svg width={1080} height={y0 + h + 60} style={{ position: "absolute", left: 0, top: 0, mixBlendMode: "screen" }}>{motes}</svg>;
};

export const JPartD: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS, T = t + D_START;
  const vig = <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.6) 100%)" }} />;
  if (t >= BLACK) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  if (t < CUT) {
    // the empty room: a slow push in toward the biwa; the morning light breathes as clouds pass
    const z = lerp(1.0, 1.085, sm(t / CUT) * 0.6 + (t / CUT) * 0.4);
    const fx = 620, fy = 1250;
    const cloud = 0.06 * Math.sin(T * 0.9) + 0.04 * Math.sin(T * 2.1 + 1);
    const fadeIn = 1 - sm(t / 0.55);   // out of the black of "The music stops."
    return (
      <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 1080, height: 1920, transformOrigin: `${fx}px ${fy}px`, transform: `scale(${z})` }}>
          <Img src={staticFile("jorogumo/dawn_wide/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
          <DawnDust t={T} y0={500} h={1100} />
          <AbsoluteFill style={{ backgroundColor: "#dfe6f5", opacity: Math.max(0, cloud), mixBlendMode: "soft-light" }} />
        </div>
        <AbsoluteFill style={{ backgroundColor: "#0a1020", opacity: 0.3 }} />
        {vig}
        <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeIn + Math.max(0, -cloud) * 0.6 }} />
      </AbsoluteFill>
    );
  }
  // the climb: hold low on the trail (a slow creep along it), then rise up the wall into the rafters and hold
  const u = t - CUT;
  const yLow = TALL - 1920, yHigh = 560;
  const creep = 150 * (u / (RISE0 - CUT));
  const k = sm((t - RISE0) / (RISE1 - RISE0));
  const top = t < RISE0 ? yLow - creep : lerp(yLow - 150, yHigh, k);
  const z = 1.0 + 0.09 * sm((t - RISE1 + 0.6) / 1.6);   // a last slow lean into the dark corner
  // the rafters sink into darkness as we arrive; it keeps getting darker during the hold
  const dark = 0.45 + 0.35 * k + 0.15 * sm((t - RISE1) / 0.8);
  const eye = t < EYES ? 0 : Math.min(1, (t - EYES) / 0.08) * (t - EYES > 0.22 && t - EYES < 0.3 ? 0.15 : 1);
  // one black drop gathers on the beam and falls during the hold
  const dropT = t - (RISE1 - 0.2), dropY = dropT < 0.5 ? 0 : 0.5 * 2400 * Math.pow(dropT - 0.5, 2);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1080, height: 1920, transformOrigin: `${CORNER.x}px ${CORNER.y}px`, transform: `scale(${z})` }}>
        <div style={{ position: "absolute", left: 0, top: -top, width: 1080, height: TALL }}>
          <Img src={staticFile("jorogumo/dawn_climb/f_0001.png")} style={{ position: "absolute", width: 1080, height: TALL }} />
          <DawnDust t={T} y0={700} h={3300} n={90} />
          {/* the ceiling and the corner fall away into black (in plate space, so it moves with the wall) */}
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 2400,
            background: `linear-gradient(to bottom, rgba(0,0,0,${dark}) 0%, rgba(0,0,0,${dark * 0.92}) 55%, rgba(0,0,0,${dark * 0.5}) 72%, rgba(0,0,0,0) 100%)` }} />
          {dropT > 0 && dropY < 3000 && <svg width={1080} height={TALL} style={{ position: "absolute", left: 0, top: 0 }}>
            <ellipse cx={CORNER.x + 70} cy={CORNER.y + 230 + dropY} rx={5 + 2 * Math.min(1, dropT / 0.5)} ry={dropY > 0 ? 11 : 4 + 6 * Math.min(1, dropT / 0.5)} fill="#050304" />
            <ellipse cx={CORNER.x + 68} cy={CORNER.y + 226 + dropY} rx={1.6} ry={2.6} fill="#9aa4b8" opacity={0.5} />
          </svg>}
          {eye > 0 && <svg width={1080} height={TALL} style={{ position: "absolute", left: 0, top: 0 }}>
            <defs><filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation={6} /></filter></defs>
            {[-1, 1].map((s) => <g key={s} opacity={eye}>
              <circle cx={CORNER.x + s * 17} cy={CORNER.y} r={16} fill="#ff1020" filter="url(#glow)" />
              <circle cx={CORNER.x + s * 17} cy={CORNER.y} r={4.5} fill="#ff6060" />
            </g>)}
          </svg>}
        </div>
      </div>
      <AbsoluteFill style={{ backgroundColor: "#0a1020", opacity: 0.3 }} />
      {vig}
    </AbsoluteFill>
  );
};
