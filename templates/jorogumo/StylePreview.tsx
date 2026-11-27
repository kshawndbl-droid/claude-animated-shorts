// Style preview for the spider woman Short: narration lines 2-3 ("One stormy night, a wandering samurai shelters in
// an empty house. But it isn't empty.") with jumpscare 1. Two shots in the abandoned house, one Blender plate
// (rendered 1.5x so pushes stay sharp) and a foreground layer, moved as 2.5D layers (the foreground moves more than
// the room, so a push-in has parallax). Everything that moves is computed per frame from time, so playback is a
// steady 30 fps with no held or skipped frames. Living background: branch shadows swaying on the shoji, rain
// running down the paper, distant lightning, the lantern breathing, dust in the moonlight.
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import wordsJson from "../../stories/jorogumo/final/words.json";
import { Dust, LADY, LAMP, Lit, SAMURAI, at, cam, project, sm, walk } from "./CharTest";

const FPS = 30, OFF = 7.4, DUR = 7.8;
export const J_PREVIEW_FRAMES = Math.round(DUR * FPS);
const CUT = 11.1 - OFF, FLASH = 13.68 - OFF, FAR_FLASH = 9.05 - OFF;
const WORDS = (wordsJson as Word[]).filter((w) => w.s >= OFF - 0.05 && w.s < OFF + DUR);
const SUB = defaultStyle("serious", { keyWords: ["stormy", "samurai", "empty", "empty."], y: 0.8 });

const ease = (v: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
// the shoji wall on screen
const SH0 = project(cam, 1, [-4.2, 6.0, 0.05]), SH1 = project(cam, 1, [4.2, 6.0, 1.95]);
const SHX = SH0.x, SHY = SH1.y, SHW = SH1.x - SH0.x, SHH = SH0.y - SH1.y;

/** lightning: a sharp double strike that dies away; returns 0..1 */
const strike = (t: number, t0: number) => {
  const d = t - t0;
  if (d < 0) return 0;
  return Math.max(Math.exp(-d / 0.09) * (d < 0.07 ? 1 : 0.55), d > 0.13 ? 0.8 * Math.exp(-(d - 0.13) / 0.16) : 0);
};

const Branches: React.FC<{ t: number; dark: number }> = ({ t, dark }) => {
  const b = (x: number, y: number, s: number, ph: number, mir: number) => {
    const a = 2.6 * Math.sin(t * 0.85 + ph) + 1.2 * Math.sin(t * 2.3 + ph * 2);
    return <g transform={`translate(${x},${y}) rotate(${a}) scale(${s * mir},${s})`}>
      <path d="M0,0 C60,30 120,40 200,90 C230,110 260,120 300,118 M120,46 C140,90 150,120 140,170 M200,90 C210,60 240,40 280,36 M60,26 C70,60 60,90 40,120"
        stroke="#0a0810" strokeWidth={9} fill="none" strokeLinecap="round" />
      {Array.from({ length: 22 }, (_, k) => { const px = 30 + (k * 53) % 270, py = 20 + (k * 37) % 150, r = 7 + (k % 4) * 3;
        return <ellipse key={k} cx={px + 4 * Math.sin(t * 2.4 + k)} cy={py + 3 * Math.cos(t * 2.0 + k)} rx={r * 1.4} ry={r} fill="#0a0810" transform={`rotate(${(k * 47) % 180},${px},${py})`} />; })}
    </g>;
  };
  return <g style={{ mixBlendMode: "multiply" }} opacity={0.32 + 0.5 * dark} filter="url(#bsoft)" clipPath="url(#shoji)">
    {b(SHX - 40, SHY + 30, 1.5, 0, 1)}{b(SHX + SHW + 40, SHY + 10, 1.3, 1.7, -1)}{b(SHX + SHW * 0.45, SHY - 40, 0.9, 3.1, 1)}
  </g>;
};

const Rain: React.FC<{ t: number }> = ({ t }) => <g clipPath="url(#shoji)" opacity={0.16}>
  {Array.from({ length: 40 }, (_, k) => {
    const x = SHX + ((k * 97) % 1000) / 1000 * SHW, sp = 220 + (k % 5) * 40, y = SHY + ((t * sp + k * 61) % (SHH + 120)) - 60;
    return <path key={k} d={`M${x},${y} l-4,${26 + (k % 3) * 10}`} stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />;
  })}
</g>;

// clean: no audio and no subtitles (Part A of the full video uses it as its second half; Part D adds both)
export const JStylePreview: React.FC<{ clean?: boolean }> = ({ clean }) => {
  const t = useCurrentFrame() / FPS, T = t + OFF;
  const shotB = t >= CUT, after = t >= FLASH;
  // samurai: walks in from the left in shot A, stops; then stands, looks around, and reacts to the flash
  const p = walk(t, 0.15, 3.3, 0.6);
  const pEnd = walk(CUT, 0.15, 3.3, 0.6).s;
  const sx = -1.45 + (shotB ? pEnd : p.s) - (after ? 0.07 * ease((t - FLASH) / 0.18) : 0);
  const P = at(1.85, sx);
  const look = !shotB ? 0.4 : t < CUT + 0.6 ? 0.5 : t < CUT + 1.4 ? -0.6 : after ? 0.7 : lerp(-0.6, 0.6, sm((t - CUT - 1.4) / 0.9));
  const grip = after ? sm((t - FLASH - 0.1) / 0.3) : 0;
  // she is there only from the flash on: close behind him, facing him
  const Q = at(2.35, sx + 0.6);
  // light: the lantern breathes; it sinks low in the held breath before the scare
  const pre = shotB && !after ? sm((t - (FLASH - 0.9)) / 0.8) : 0;
  const flick = (0.92 + 0.05 * Math.sin(T * 7.3) + 0.03 * Math.sin(T * 13.9 + 1.2)) * (1 - 0.45 * pre) * (after ? 0.82 : 1);
  const L1 = strike(t, FAR_FLASH) * 0.35, L2 = strike(t, FLASH), light = Math.max(L1, L2);
  // camera: A = slow push on the room; B = close on him, drifting; the scare snaps in toward her face
  let z: number, fx: number, fy: number, cx = 540, cy = 1000;
  const herFace = { x: Q.x - 0.25 * Q.ppm, y: Q.y - 1.25 * Q.ppm }, hisFace = { x: P.x + 0.05 * P.ppm, y: P.y - 1.25 * P.ppm };
  if (!shotB) { z = lerp(1.0, 1.07, sm(t / CUT)); fx = 540; fy = 1000; }
  else if (!after) { const k = (t - CUT) / (FLASH - CUT); z = lerp(1.36, 1.46, k); fx = hisFace.x + 140; fy = hisFace.y + 160; cx = 560; cy = 900; }
  else { const k = ease((t - FLASH) / 0.22); z = lerp(1.46, 1.78, k) + 0.05 * sm((t - FLASH - 0.3) / 1.2);
    fx = lerp(hisFace.x + 140, (Q.x - 0.03 * Q.ppm + hisFace.x) / 2 + 30, k); fy = lerp(hisFace.y + 160, herFace.y + 170, k); cx = lerp(560, 540, k); cy = lerp(900, 800, k); }
  // a small camera jolt with the thunder (decays in a few frames, no random jitter)
  const jolt = after ? 10 * Math.exp(-(t - FLASH) / 0.12) * Math.sin((t - FLASH) * 60) : 0;
  // the focus point (fx, fy) of the scene is placed at screen point (cx, cy) and the layer scaled by zz around it
  const layer = (zz: number): React.CSSProperties => ({ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0",
    transform: `translate(${cx - fx * zz + jolt}px,${cy - fy * zz + jolt * 0.6}px) scale(${zz})` });
  const zf = 1 + (z - 1) * 1.6;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {!clean && <Audio src={staticFile("jorogumo/preview_mix.wav")} />}
      <div style={layer(z)}>
        <Img src={staticFile("jorogumo/hi/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>
            <clipPath id="shoji"><rect x={SHX} y={SHY} width={SHW} height={SHH} /></clipPath>
            <filter id="bsoft"><feGaussianBlur stdDeviation={5} /></filter>
            <radialGradient id="lamp" cx={LAMP.x} cy={LAMP.y} r={520} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffb060" stopOpacity={0.3 * flick} /><stop offset="1" stopColor="#ff8030" stopOpacity={0} />
            </radialGradient>
          </defs>
          <Branches t={T} dark={light} />
          <Rain t={T} />
          <rect x={SHX} y={SHY} width={SHW} height={SHH} fill="#e8f0ff" opacity={0.85 * light} style={{ mixBlendMode: "screen" }} />
          {after && <Lit id="lady" flick={flick} x={Q.x} y={Q.y} ppm={Q.ppm} look={LADY} flip
            pose={{ t: T, lookX: 0.3, expr: "eerie", glide: true, voidEyes: false, tilt: -6 * sm((t - FLASH - 0.4) / 1.0), armNear: [8, 72], armFar: [6, 78], blink: false }} />}
          <Lit id="sam" flick={flick} x={P.x} y={P.y} ppm={P.ppm} look={SAMURAI}
            pose={{ dist: shotB ? pEnd : p.s, walk: shotB ? 0 : p.w, t: T, lookX: look, blink: !after && (T % 3.1) < 0.1,
              expr: after ? "scared" : shotB ? "worried" : "stern", armNear: grip > 0 ? [2 + 2 * grip, 8 + 85 * grip] : undefined }} />
          <Dust t={T} />
          <rect width={1080} height={1920} fill="url(#lamp)" style={{ mixBlendMode: "screen" }} />
        </svg>
      </div>
      <div style={layer(zf)}>
        <Img src={staticFile("jorogumo/hi/fg_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
      </div>
      {/* the room darkens in the held breath; the flash floods everything cold white, then it is darker than before */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: 0.38 * pre + (after ? 0.12 : 0) }} />
      <AbsoluteFill style={{ backgroundColor: "#dfe8ff", opacity: 0.75 * L2 + 0.12 * L1, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.62) 100%)" }} />
      {!clean && <Subtitles words={WORDS} style={SUB} offset={-OFF} />}
    </AbsoluteFill>
  );
};
