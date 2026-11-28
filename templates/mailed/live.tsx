// Living background plates for Film B: a painted plate becomes a 2.5D set. A depth map (Depth Anything V2 Small)
// drives an SVG displacement so near and far parts of the room shift against each other while the camera drifts
// (real parallax, not a flat zoom); the plate's own light sources glow and flicker; fog/haze drifts; and each set gets
// its own small signs of life (rain on the window, a swinging lamp cone, blinking runway lights, heat shimmer,
// moving leaf shadows, dust in the light).
import React from "react";
import { AbsoluteFill, Easing, staticFile } from "remotion";
import lightsJson from "../../stories/mailed-himself/plates/lights.json";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const LIGHTS = lightsJson as unknown as Record<string, [number, number, number, string][]>;
export type Fx = {
  rain?: [number, number, number, number];          // window rect (plate px) with rain streaks running down
  cone?: [number, number, number, number, string];  // hanging lamp: pivot x, y, cone length, half spread, colour
  heat?: number;                                    // heat shimmer below this y
  dapple?: [number, number, number, number];        // leaf shadows moving over this rect
  beacon?: [number, number];                        // a rotating beacon glow
  fog?: number;                                     // drifting fog strength 0..1
  dust?: number;                                    // dust motes count
  shafts?: [number, number, number];                // light shafts from a window: x, y, angle (deg)
  flicker?: number;                                 // how much the plate's lights breathe (0..1)
  sway?: number;                                    // parallax strength (px)
};
export type LiveCam = { z0: number; z1: number; cx: number; cy: number; dx?: number; dy?: number };

const hash = (i: number, s: number) => Math.abs(Math.sin(i * 12.9898 + s * 78.233) * 43758.5453) % 1;

export const LivePlate: React.FC<{ name: string; t: number; dur: number; T: number; c: LiveCam; blur?: number; bright?: number; fx?: Fx; dir?: string; lightsMap?: Record<string, [number, number, number, string][]> }> =
  ({ name, t, dur, T, c, blur = 0, bright = 1, fx = {}, dir = "mailed", lightsMap = LIGHTS }) => {
    const u = Easing.inOut(Easing.sin)(clamp01(t / dur)), z = c.z0 + (c.z1 - c.z0) * u;
    const dx = (c.dx ?? 0) * u, dy = (c.dy ?? 0) * u;
    const sway = fx.sway ?? 16;
    // parallax: a slow lateral dolly across the shot plus a gentle breathing sway; vertical is smaller
    const px = sway * (0.9 * (u - 0.5) * 2 + 0.45 * Math.sin(T * 0.9 + 1.3));
    const py = sway * 0.35 * Math.sin(T * 0.7);
    const id = `lp${name}`;
    const lights = lightsMap[name] ?? [];
    const fl = fx.flicker ?? 0.5;
    return (
      <AbsoluteFill style={{ overflow: "hidden", filter: `${blur ? `blur(${blur}px) ` : ""}brightness(${bright})` }}>
        <svg width={1080} height={1920} style={{ position: "absolute" }}>
          <defs>
            <filter id={id} x={0} y={0} width={1080} height={1920} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feImage href={staticFile(`${dir}/${name}_d.png`)} x={0} y={0} width={1080} height={1920} preserveAspectRatio="none" result="d" />
              <feDisplacementMap in="SourceGraphic" in2="d" scale={px} xChannelSelector="R" yChannelSelector="B" result="a" />
              <feDisplacementMap in="a" in2="d" scale={py} xChannelSelector="B" yChannelSelector="G" />
            </filter>
            {[...lights.map((l) => l[3]), "#ff5a3a"].map((col, i) => <radialGradient key={i} id={`${id}g${i}`}><stop offset="0" stopColor={col} stopOpacity={1} /><stop offset="0.35" stopColor={col} stopOpacity={0.45} /><stop offset="1" stopColor={col} stopOpacity={0} /></radialGradient>)}
            <linearGradient id={`${id}cone`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={fx.cone?.[4] ?? "#ffd890"} stopOpacity={0.42} /><stop offset="1" stopColor={fx.cone?.[4] ?? "#ffd890"} stopOpacity={0} /></linearGradient>
            <linearGradient id={`${id}shaft`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff4dc" stopOpacity={0.3} /><stop offset="1" stopColor="#fff4dc" stopOpacity={0} /></linearGradient>
            {fx.heat !== undefined && (
              <filter id={`${id}h`} x={0} y={0} width={1080} height={1920} filterUnits="userSpaceOnUse">
                <feTurbulence type="fractalNoise" baseFrequency="0.006 0.045" numOctaves={2} seed={Math.floor(T * 12) % 97} result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale={9} xChannelSelector="R" yChannelSelector="G" />
              </filter>
            )}
            {fx.rain && <clipPath id={`${id}rc`}><rect x={fx.rain[0]} y={fx.rain[1]} width={fx.rain[2]} height={fx.rain[3]} /></clipPath>}
            {fx.dapple && (
              <filter id={`${id}dp`} x={fx.dapple[0]} y={fx.dapple[1]} width={fx.dapple[2]} height={fx.dapple[3]} filterUnits="userSpaceOnUse">
                <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={7} result="n" />
                <feOffset in="n" dx={Math.sin(T * 0.8) * 26} dy={Math.cos(T * 0.6) * 14} result="o" />
                <feColorMatrix in="o" type="matrix" values="0 0 0 0 1  0 0 0 0 0.93  0 0 0 0 0.78  0 0 0 -2.6 1.55" />
              </filter>
            )}
          </defs>
          <g transform={`translate(${c.cx + dx},${c.cy + dy}) scale(${z}) translate(${-c.cx},${-c.cy})`}>
            <g filter={`url(#${id})`}>
              <image href={staticFile(`${dir}/${name}.png`)} x={0} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice" />
            </g>
            {fx.heat !== undefined && (
              <g filter={`url(#${id}h)`}>
                <image href={staticFile(`${dir}/${name}.png`)} x={px * 0.3} y={0} width={1080} height={1920} preserveAspectRatio="xMidYMid slice"
                  style={{ clipPath: `inset(${fx.heat}px 0 0 0)` }} opacity={0.85} />
              </g>
            )}
            {/* the plate's own lamps and lights glow and breathe */}
            <g style={{ mixBlendMode: "screen" }}>
              {lights.map(([x, y, r, col], i) => {
                const f = 1 - fl * (0.25 + 0.25 * Math.sin(T * (1.3 + hash(i, 3) * 2.2) + i * 2.1)) - (hash(Math.floor(T * 9), i) > 0.93 ? 0.3 * fl : 0);
                return <circle key={i} cx={x + px * 0.2} cy={y} r={r * (1.6 + 0.25 * Math.sin(T * 1.1 + i))} fill={`url(#${id}g${i})`} opacity={0.55 * f} />;
              })}
              {lights.map(([x, y, r, col], i) => <circle key={`c${i}`} cx={x + px * 0.2} cy={y} r={r * 0.9} fill={col}
                opacity={0.18 + 0.12 * fl * Math.sin(T * 2.3 + i * 1.7)} />)}
            </g>
            {fx.cone && (() => {
              const [x, y, L, sp] = fx.cone, ang = 4.5 * Math.sin(T * 1.25);
              return <g transform={`rotate(${ang},${x},${y})`} style={{ mixBlendMode: "screen" }}>
                <path d={`M${x - 14},${y} L${x - sp},${y + L} L${x + sp},${y + L} L${x + 14},${y} Z`} fill={`url(#${id}cone)`} opacity={0.85 + 0.15 * Math.sin(T * 7)} />
              </g>;
            })()}
            {fx.shafts && (() => {
              const [x, y, a] = fx.shafts;
              return <g transform={`rotate(${a + 1.5 * Math.sin(T * 0.4)},${x},${y})`} style={{ mixBlendMode: "screen" }}>
                {[0, 1, 2].map((i) => <rect key={i} x={x - 120 + i * 110} y={y} width={60 + 20 * i} height={1500} fill={`url(#${id}shaft)`}
                  opacity={0.5 + 0.35 * Math.sin(T * 0.9 + i * 1.9)} />)}
              </g>;
            })()}
            {fx.rain && (
              <g clipPath={`url(#${id}rc)`}>
                <rect x={fx.rain[0]} y={fx.rain[1]} width={fx.rain[2]} height={fx.rain[3]} fill="rgba(60,80,120,0.18)" />
                {Array.from({ length: 70 }, (_, i) => {
                  const x = fx.rain![0] + hash(i, 1) * fx.rain![2], sp = 260 + 220 * hash(i, 2);
                  const y = fx.rain![1] + ((hash(i, 4) * 3000 + T * sp) % (fx.rain![3] + 80)) - 40;
                  return <path key={i} d={`M${x},${y} l-3,${16 + 18 * hash(i, 5)}`} stroke="rgba(220,235,255,0.55)" strokeWidth={2.2} strokeLinecap="round" />;
                })}
                {Array.from({ length: 14 }, (_, i) => {
                  const x = fx.rain![0] + hash(i, 7) * fx.rain![2], y = fx.rain![1] + ((hash(i, 8) * 900 + T * (30 + 40 * hash(i, 9))) % fx.rain![3]);
                  return <ellipse key={`d${i}`} cx={x} cy={y} rx={4} ry={6} fill="rgba(230,240,255,0.5)" />;
                })}
              </g>
            )}
            {fx.dapple && <rect x={fx.dapple[0]} y={fx.dapple[1]} width={fx.dapple[2]} height={fx.dapple[3]} filter={`url(#${id}dp)`} opacity={0.42} style={{ mixBlendMode: "soft-light" }} />}
            {fx.beacon && (() => {
              const [x, y] = fx.beacon, on = 0.5 + 0.5 * Math.cos(T * 2.6);
              return <g style={{ mixBlendMode: "screen" }}>
                <circle cx={x} cy={y} r={90} fill={`url(#${id}g${lights.length})`} opacity={0.9 * on * on} />
                <circle cx={x} cy={y} r={9} fill="#ffb0a0" opacity={0.4 + 0.6 * on} />
              </g>;
            })()}
          </g>
        </svg>
        {(fx.fog ?? 0) > 0 && [0, 1].map((k) => (
          <AbsoluteFill key={k} style={{
            backgroundImage: `url(${staticFile("mailed/fog.png")})`, backgroundSize: `${1400 + k * 500}px ${1400 + k * 500}px`,
            backgroundPosition: `${(T * (18 + k * 14)) % (1400 + k * 500)}px ${k * 300 + 10 * Math.sin(T * 0.3)}px`, opacity: (fx.fog ?? 0) * (0.55 - k * 0.15), mixBlendMode: "screen",
          }} />
        ))}
        {(fx.dust ?? 0) > 0 && (
          <svg width={1080} height={1920} style={{ position: "absolute" }}>
            {Array.from({ length: fx.dust ?? 0 }, (_, i) => {
              const a = hash(i, 11), b = hash(i, 12);
              const x = (a * 1180 + T * (6 + 9 * b) + 26 * Math.sin(T * 0.6 + i)) % 1180 - 50, y0 = (b * 2000 - T * (10 + 10 * a)) % 2000;
              const r = 1.4 + 3 * hash(i, 13), o = 0.2 + 0.45 * Math.abs(Math.sin(T * 1.3 + i));
              return <circle key={i} cx={x} cy={y0 < 0 ? y0 + 2000 : y0} r={r} fill="#fff0d8" opacity={o} />;
            })}
          </svg>
        )}
      </AbsoluteFill>
    );
  };
