// Jumpscare 2 test (story 35.4 - 39.6 s): "And this time... it didn't hide." He has turned and holds the lantern up to
// the dark; on the attack (37.72 s, the approved mix's roar + impact) the creature rushes out of the black into the
// camera in 6 frames, jaw split wide, eyes flaring, fills the screen with a hard shake and a flash, and at 38.60 s it
// hard-cuts to black (the mix's silence). Same 2D style as the cast. Plate: the chartest forest (stand-in).
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { Logger } from "./logger";
import { LOGGER } from "./CharTest";
import { AttackFace } from "./attackFace";

const FPS = 30;
export const S0 = 35.4, S1 = 39.6, ATTACK = 37.72, CUT = 38.6;
export const SCARE_FRAMES = Math.round((S1 - S0) * FPS);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

export const HScareTest: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const fr = useCurrentFrame(), T = S0 + fr / FPS;
  const push = 1 + 0.06 * sm((T - S0) / (ATTACK - S0));
  const a = (T - ATTACK) * FPS;                      // frames since the attack
  const k = clamp01(a / 6), ke = k * k * k;          // lunge: accelerates into the lens
  const hit = a >= 4.5;
  const shake = hit ? 26 * Math.exp(-(a - 4.5) / 9) : 0;
  const sx = shake * (rnd(fr) - 0.5) * 2, sy = shake * (rnd(fr + 9) - 0.5) * 2;
  // creature path: from the dark right side, small, to a face filling the frame
  const fs = 110 + (1300 - 110) * ke + (hit ? 140 * clamp01((a - 4.5) / 22) : 0);
  const fx = 880 + (540 - 880) * ke, fy = 1080 + (930 - 1080) * ke;
  const flash = a >= 4 && a < 6 ? (a < 5 ? 1 : 0.55) : 0;
  const blur = a >= 0 && a < 6 ? 10 * (1 - k) + 4 : 0;
  if (T >= CUT) return <AbsoluteFill style={{ background: "#000" }}>{withAudio && <Audio src={staticFile("hidebehind/mix_v3.wav")} startFrom={Math.round(S0 * FPS)} />}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px,${sy}px) scale(${push * (hit ? 1.04 : 1)})` }}>
        <Img src={staticFile("hidebehind/chartest/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920, transform: "scale(1.35) translate(60px,-120px)", filter: "brightness(0.6)" }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>
            <radialGradient id="pool" cx={560} cy={1330} r={520} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffa050" stopOpacity={0.42} /><stop offset="1" stopColor="#ff8030" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width={1080} height={1920} fill="url(#pool)" style={{ mixBlendMode: "screen" }} />
          <g style={{ filter: "brightness(0.85) saturate(0.85)" }}>
            <Logger x={330} y={1640} ppm={600} look={LOGGER}
              pose={{ t: T, hold: "lantern", lit: 1, armNear: [58, 50], expr: "scared", lookX: 0.9, tilt: -4 + 2 * Math.sin(T * 9) * sm((T - 36.4) / 1) }} />
          </g>
          {a >= 0 && <g style={{ filter: `blur(${blur}px)` }}>
            {/* face only: out of the black into the lens, then it fills the whole screen */}
            {!hit && <g opacity={0.3}><AttackFace x={fx + 90 * (1 - k)} y={fy + 50 * (1 - k)} size={fs * 0.8} open={0.7} t={T} id="atk2" /></g>}
            <AttackFace x={fx} y={fy} size={fs} open={0.7 + 0.3 * k + (hit ? 0.08 * Math.sin(T * 30) : 0)} t={T} id="atk" />
          </g>}
        </svg>
        {/* the lantern light from below on everything near the lens, cold dark above */}
        <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(255,120,40,0.18), rgba(0,0,0,0) 45%, rgba(0,0,10,0.55))" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)" }} />
      {flash > 0 && <AbsoluteFill style={{ background: a < 5 ? "#fff" : "#8a0a0a", mixBlendMode: a < 5 ? "normal" : "multiply", opacity: flash }} />}
      {withAudio && <Audio src={staticFile("hidebehind/mix_v3.wav")} startFrom={Math.round(S0 * FPS)} />}
    </AbsoluteFill>
  );
};
