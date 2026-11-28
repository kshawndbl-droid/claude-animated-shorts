// KAIZEN CLIPS PLATES: the Blender set as layers in Remotion (files written by tools/kz-set.py into one folder):
//   plate.png              the lit beauty plate
//   plate_hi/lo.png        the same with practical lights up/down: cross-faded with `flicker` for living fire/candles
//   depth.png              white = near, black = far: drives atmospheric haze (adjustable without re-rendering)
//   fg.png                 RGBA, only objects near the camera: moved a little more than the plate = real parallax
// <Plate dir="villages/s1" ...> draws them in order; put characters between <Plate> and <Foreground>.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const full: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: 1080, height: 1920, objectFit: "cover" };

/** smooth organic flicker 0..1 for fire, candles and torches (incommensurate sines, nothing jumps frame to frame) */
export const flicker = (t: number, seed = 0) => clamp01(0.55 + 0.2 * Math.sin(t * 7.3 + seed) + 0.14 * Math.sin(t * 12.9 + 1.3 + seed * 2)
  + 0.1 * Math.sin(t * 3.1 + 0.4 + seed) + 0.06 * Math.sin(t * 21.7 + 2.2));

export const Plate: React.FC<{
  dir: string;               // folder under public/ holding the plate files
  flick?: number;            // 0..1: cross-fade lo -> hi (needs plate_hi/lo.png); undefined = plain plate.png
  haze?: { color: string; amount: number };   // depth haze strength 0..1 (needs depth.png)
  style?: React.CSSProperties;
}> = ({ dir, flick, haze, style }) => (
  <AbsoluteFill style={style}>
    {flick === undefined ? <Img src={staticFile(`${dir}/plate.png`)} style={full} /> : <>
      <Img src={staticFile(`${dir}/plate_lo.png`)} style={full} />
      <Img src={staticFile(`${dir}/plate_hi.png`)} style={{ ...full, opacity: flick }} />
    </>}
    {haze && haze.amount > 0 && <DepthHaze dir={dir} {...haze} />}
  </AbsoluteFill>
);

/** haze that thickens with distance: inverted depth tinted with the haze colour, screened over the plate */
export const DepthHaze: React.FC<{ dir: string; color: string; amount: number }> = ({ dir, color, amount }) => (
  <AbsoluteFill style={{ isolation: "isolate", mixBlendMode: "screen", opacity: clamp01(amount) }}>
    <Img src={staticFile(`${dir}/depth.png`)} style={{ ...full, filter: "invert(1) contrast(1.15)" }} />
    <AbsoluteFill style={{ background: color, mixBlendMode: "multiply" }} />
  </AbsoluteFill>
);

/** the near layer: give it a slightly stronger zoom/offset than the plate's move for parallax */
export const Foreground: React.FC<{ dir: string; style?: React.CSSProperties; blur?: number }> = ({ dir, style, blur = 0 }) => (
  <AbsoluteFill style={style}>
    <Img src={staticFile(`${dir}/fg.png`)} style={{ ...full, filter: blur ? `blur(${blur}px)` : undefined }} />
  </AbsoluteFill>
);
