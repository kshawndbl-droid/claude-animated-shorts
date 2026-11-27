// Spider woman Short, Part B (story time 15.20-25.20 s, narration lines 4-7). Video only: no subtitles, no audio.
//  Shot 1 (15.20-19.35) "She plays soft music for him. He grows sleepy.": both kneel in seiza by the lantern; she plays
//    the biwa (each pluck: a quick stroke and shivering strings); his eyelids sink and his head nods. Slow push from the
//    two-shot onto his face. 2.5D: the 1620px room plate plus the foreground layer moving 1.6x faster.
//  Shot 2 (19.35-25.20) "Something tightens around his ankles. Silk. Thin as hair.": a low close-up on his folded tabi
//    feet (own Blender plate: lens a hand above the tatami, the lantern out of focus behind). Pale threads creep in out
//    of the dark over the tatami and wind round his ankles. Held breath (the light sinks, a slow push), then JUMPSCARE 2
//    on "Silk" (22.36): the threads snap taut, his legs are yanked back, the camera snaps in with a jolt and a cold flash.
//    Eerie hold on "Thin as hair": the threads hum taut and glint, his feet strain against them.
// Everything is computed per frame from time, so playback is a steady 30 fps with no held or repeated frames.
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Dust, LADY, LAMP, Lit, SAMURAI, at, project, sm } from "./CharTest";
import { INK, SOCK, Two } from "./kimono";
import cuJson from "../../stories/jorogumo/sets/anklecu.json";

const FPS = 30, OFF = 15.2, DUR = 10.0;
export const J_PARTB_FRAMES = Math.round(DUR * FPS);
const CUT = 19.35, SILK = 22.36, HOLD0 = 21.4;
/** her plucks (story time); the score in Part D can play a biwa note on each */
export const BIWA_PLUCKS = [15.3, 15.92, 16.28, 16.9, 17.52, 17.86, 18.5, 19.12];

const ease = (v: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const cu = cuJson as Parameters<typeof project>[0];

/** shot 1: the two of them kneeling a metre apart, the lantern behind her */
const Shot1: React.FC<{ T: number }> = ({ T }) => {
  const t = T - OFF;
  const P = at(3.0, -0.5), Q = at(3.05, 0.52);
  const flick = 0.92 + 0.05 * Math.sin(T * 7.3) + 0.03 * Math.sin(T * 13.9 + 1.2);
  // sleep comes in waves: the lids sink, he fights it once (lids up, head jerks up), then they sink further
  const s1 = sm((T - 17.6) / 0.7), fight = Math.exp(-Math.pow((T - 18.55) / 0.12, 2)), s2 = sm((T - 18.7) / 0.6);
  const lids = Math.min(0.92, 0.6 * s1 + 0.3 * s2 - 0.45 * fight + (Math.abs(T - 16.4) < 0.07 ? 1 : 0));
  const nod = 11 * s1 - 9 * fight + 9 * s2;
  const since = T - Math.max(...BIWA_PLUCKS.filter((p) => p <= T), 14.0);
  // camera: start on the two-shot, then a slow push that settles on his sinking face
  const F = at(3.0, 0), hisFace = { x: P.x + 0.08 * P.ppm, y: P.y - 0.86 * P.ppm };
  const k = sm((t - 0.6) / 3.6);
  const z = lerp(1.68, 2.5, k), fx = lerp(F.x, hisFace.x + 60, k), fy = lerp(F.y - 0.5 * F.ppm, hisFace.y + 30, k);
  const cx = 540, cy = lerp(1120, 1000, k);
  const layer = (zz: number): React.CSSProperties => ({ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0",
    transform: `translate(${cx - fx * zz}px,${cy - fy * zz}px) scale(${zz})` });
  const zf = 1 + (z - 1) * 1.6;
  return <>
    <div style={layer(z)}>
      <Img src={staticFile("jorogumo/hi/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="lampB" cx={LAMP.x} cy={LAMP.y} r={520} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffb060" stopOpacity={0.3 * flick} /><stop offset="1" stopColor="#ff8030" stopOpacity={0} />
          </radialGradient>
        </defs>
        <Lit id="lady" flick={flick} x={Q.x} y={Q.y} ppm={Q.ppm} look={LADY} flip
          pose={{ t: T, kneel: true, lookX: 0.5, expr: "eerie", blink: Math.abs(T - 16.0) < 0.06, tilt: -4 - 3 * sm((T - 17.0) / 1.6), biwa: { since } }} />
        <Lit id="sam" flick={flick} x={P.x} y={P.y} ppm={P.ppm} look={SAMURAI}
          pose={{ t: T, kneel: true, lookX: 0.4, expr: "neutral", lids, tilt: nod, slump: 5 * s1 + 3 * s2 - 3 * fight,
            reachNear: [0.25, -0.27], reachFar: [0.2, -0.28] }} />
        <Dust t={T} />
        <rect width={1080} height={1920} fill="url(#lampB)" style={{ mixBlendMode: "screen" }} />
      </svg>
    </div>
    <div style={layer(zf)}>
      <Img src={staticFile("jorogumo/hi/fg_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
    </div>
  </>;
};

// shot 2, drawn in his metres (floor at y = 0, he faces +x): he has slumped asleep with his legs out toward her, so the
// close-up sees two hakama legs along the tatami ending in upright tabi feet. The threads come out of the dark on her side.
const THREADS = [
  { s: [1.5, -0.01], e: [0.0, -0.035], t0: 19.55, wob: 0.05 },
  { s: [1.6, -0.06], e: [0.01, -0.08], t0: 19.75, wob: -0.06 },
  { s: [1.1, -0.9], e: [-0.01, -0.1], t0: 19.95, wob: 0.08 },
  { s: [1.45, 0.0], e: [0.02, -0.05], t0: 20.15, wob: -0.04 },
  { s: [0.5, -1.3], e: [0.0, -0.06], t0: 20.3, wob: 0.07 },
  { s: [1.55, -0.35], e: [0.015, -0.09], t0: 20.5, wob: -0.05 },
  { s: [1.4, -0.03], e: [0.03, -0.05], t0: 20.7, wob: 0.04 },
];
const LOOPS = [{ x: -0.012, t0: 20.4 }, { x: 0.004, t0: 20.6 }, { x: -0.026, t0: 20.8 }, { x: 0.016, t0: 21.0 }];

const tubeD = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number) =>
  `M${x0},${y0 - r0} L${x1},${y1 - r1} Q${x1 + 0.03},${y1} ${x1},${y1 + r1} L${x0},${y0 + r0} Z`;
/** one leg: wide hakama along the floor, a little flared at the hem, and the tabi foot standing up out of it */
const CuLeg: React.FC<{ dx: number; dy: number; far?: boolean; wig: number }> = ({ dx, dy, far, wig }) => {
  const L = SAMURAI, cloth = far ? L.legsDark : L.legs, sock = far ? "#b8b2a6" : L.sock;
  return <g transform={`translate(${dx},${dy})`}>
    {/* foot: the sock rotated toes-up, heel on the floor, sole toward her */}
    <g transform={`translate(0,-0.072) rotate(${-76 + wig})`}>
      <Two fill={sock} ow={0.014} d={SOCK} />
      <path d="M0.105,-0.004 Q0.118,0.025 0.112,0.054" stroke="rgba(60,50,40,0.55)" strokeWidth={0.007} fill="none" />
      <path d="M-0.04,0.05 L0.14,0.05" stroke="rgba(0,0,0,0.12)" strokeWidth={0.012} />
    </g>
    <Two fill={cloth} ow={0.014} d={tubeD(-1.2, -0.12, -0.045, -0.085, 0.11, 0.075)} />
    {[0, 1, 2].map((k) => <path key={k} d={`M${-0.6 + k * 0.18},${-0.19 + k * 0.01} Q${-0.3 + k * 0.1},${-0.13} ${-0.07},${-0.12 + k * 0.03}`}
      stroke={far ? INK : L.legsDark} strokeWidth={0.007} fill="none" opacity={0.75} />)}
  </g>;
};

const Shot2: React.FC<{ T: number }> = ({ T }) => {
  const A = project(cu, 1, [0.05, 0.0, 0.0]), LP = project(cu, 1, [1.05, 1.5, 0.42]), ppm = A.ppm;
  const snapped = T >= SILK, d = T - SILK;
  const pre = sm((T - HOLD0) / 0.9) * (snapped ? 0 : 1);
  const flick = (0.92 + 0.05 * Math.sin(T * 7.3) + 0.03 * Math.sin(T * 13.9 + 1.2)) * (1 - 0.4 * pre) * (snapped ? 0.85 : 1);
  // the yank: his legs are jerked toward her with an overshoot; then two failed pulls back against the silk
  const yank = snapped ? 0.09 * (1 - Math.exp(-d / 0.035)) + 0.03 * Math.exp(-d / 0.18) * Math.sin(d * 28) : 0;
  const pull = (tp: number) => -0.02 * Math.exp(-Math.pow((T - tp) / 0.14, 2));
  const tremble = snapped ? 0.0025 * Math.sin(T * 47) * Math.exp(-d / 1.2) : 0;
  const jx = yank + pull(23.35) + pull(24.45) + tremble;
  // the feet: a sleepy twitch as the silk first touches, then dragged so the toes tip toward her
  const wig = 3 * Math.exp(-Math.pow((T - 20.95) / 0.12, 2)) + (snapped ? 14 * (1 - Math.exp(-d / 0.05)) - 4 * Math.exp(-Math.pow((T - 23.35) / 0.14, 2)) : 0);
  const tension = snapped ? 1 : sm((T - 20.6) / 0.8) * 0.35;
  // camera: slow drift in, deeper during the held breath; the scare snaps in 3 frames with a jolt that dies away
  // (the held breath pushes in steadily, and the hold after the scare keeps creeping in, so no two frames match)
  const base = lerp(1.85, 1.95, Math.min(1, (T - CUT) / (HOLD0 - CUT))) + 0.12 * Math.max(0, Math.min(1, (T - HOLD0) / (SILK - HOLD0)));
  const z = base + (snapped ? 0.3 * ease(d / 0.1) + 0.06 * Math.max(0, d - 0.3) : 0);
  const jolt = snapped ? 9 * Math.exp(-d / 0.11) * Math.sin(d * 70) : 0;
  // keep the plate covering the frame (the focus can't go closer to its edge than half a screen, plus room for the jolt)
  const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const fx = cl(A.x + (0.7 * jx) * ppm, (540 + 30) / z, 1080 - (540 + 30) / z), fy = cl(A.y - 0.08 * ppm, (1100 + 20) / z, 1920 - (820 + 20) / z);
  const cx = 540 + jolt, cy = 1100 + jolt * 0.5;
  const layer = (zz: number): React.CSSProperties => ({ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0",
    transform: `translate(${cx - fx * zz}px,${cy - fy * zz}px) scale(${zz})` });
  const flash = snapped ? Math.exp(-d / 0.07) : 0;
  // a thread: creeps in (dash reveal), snakes over the floor while slack, goes dead straight when it snaps taut
  const thread = (th: typeof THREADS[number], i: number) => {
    const grow = sm((T - th.t0) / 1.0);
    if (grow <= 0) return null;
    const e = [th.e[0] + jx, th.e[1]], s = th.s;
    const slack = (1 - tension) * th.wob * (1 + 0.15 * Math.sin(T * 2.1 + i));
    const mx = (s[0] + e[0]) / 2, my = (s[1] + e[1]) / 2 + slack, hum = snapped ? 0.004 * Math.sin(T * 60 + i * 2) * Math.exp(-d / 0.9) : 0;
    // drawn from her side toward his ankle, so it creeps in out of the dark
    return <path key={i} d={`M${s[0]},${s[1]} Q${mx},${my + hum} ${e[0]},${e[1]}`} pathLength={1} strokeDasharray={`${grow} 2`}
      stroke="#e9ecf4" strokeWidth={snapped ? 0.0042 : 0.003} fill="none" strokeLinecap="round" opacity={0.55 + 0.35 * tension} />;
  };
  // a loop round the ankle: winds on over the sock, and cinches tighter when the threads snap
  const loop = (l: typeof LOOPS[number], i: number) => {
    const g = sm((T - l.t0) / 0.6);
    if (g <= 0) return null;
    // the front of a wrap seen from the side: a slanted, slightly bowed line across the ankle; the wraps spiral up the ankle side by side
    const ry = lerp(0.047, 0.041, tension), cyL = -0.074, x = l.x + jx, sl = 0.012;
    return <path key={i} d={`M${x - sl},${cyL - ry} Q${x + 0.008},${cyL} ${x + sl},${cyL + ry}`} pathLength={1} strokeDasharray={`${g} 2`}
      stroke="#f2f4fa" strokeWidth={0.0034} fill="none" strokeLinecap="round" opacity={0.85} />;
  };
  // a glint of lantern light runs along the taut threads in the hold
  const glint = snapped ? ((T - SILK) * 0.55) % 1 : -1;
  return <>
    <div style={layer(z)}>
      <Img src={staticFile("jorogumo/anklecu/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920 }} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="lampC" cx={LP.x} cy={LP.y} r={700} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffb060" stopOpacity={0.22 * flick} /><stop offset="1" stopColor="#ff8030" stopOpacity={0} />
          </radialGradient>
          <filter id="cshadow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={12} /></filter>
          <filter id="thglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={0.0025} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          {/* the legs are lit like the cast: warm from the lantern (ahead, right), a cold rim from the moonlit screens */}
          <filter id="litcu" x="-10%" y="-30%" width="120%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation={ppm * 0.03} result="b" />
            <feDiffuseLighting in="b" surfaceScale={ppm * 0.03} diffuseConstant={1.05 * flick} lightingColor="#ffc890" result="warm">
              <fePointLight x={LP.x} y={LP.y - 200} z={ppm * 0.9} />
            </feDiffuseLighting>
            <feDiffuseLighting in="b" surfaceScale={ppm * 0.03} diffuseConstant={0.5} lightingColor="#a8b8f0" result="cool">
              <feDistantLight azimuth={-90} elevation={40} />
            </feDiffuseLighting>
            <feComposite in="warm" in2="cool" operator="arithmetic" k2={0.55} k3={0.6} result="light" />
            <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1={1} result="shaded" />
            <feComposite in="shaded" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>
        <ellipse cx={A.x + (jx - 0.3) * ppm} cy={A.y + 2} rx={0.5 * ppm} ry={0.025 * ppm} fill="rgba(0,0,0,0.5)" filter="url(#cshadow)" />
        <g filter="url(#litcu)">
          <g transform={`translate(${A.x},${A.y}) scale(${ppm})`}>
            <CuLeg dx={jx * 0.92 + 0.035} dy={-0.03} far wig={wig * 0.8} />
          </g>
        </g>
        <g transform={`translate(${A.x},${A.y}) scale(${ppm})`} filter="url(#thglow)">{THREADS.map(thread)}</g>
        <g filter="url(#litcu)">
          <g transform={`translate(${A.x},${A.y}) scale(${ppm})`}><CuLeg dx={jx} dy={0} wig={wig} /></g>
        </g>
        <g transform={`translate(${A.x},${A.y}) scale(${ppm})`} filter="url(#thglow)">
          {LOOPS.map(loop)}
          {glint >= 0 && THREADS.slice(0, 4).map((th, i) => { const k = (glint + i * 0.23) % 1, ex = th.e[0] + jx;
            return <circle key={i} cx={lerp(th.s[0], ex, k)} cy={lerp(th.s[1], th.e[1], k)} r={0.005} fill="#fff6e0" opacity={0.9 * Math.sin(Math.PI * k)} />; })}
        </g>
        <Dust t={T} />
        <rect width={1080} height={1920} fill="url(#lampC)" style={{ mixBlendMode: "screen" }} />
      </svg>
    </div>
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: 0.4 * pre + (snapped ? 0.15 : 0) }} />
    <AbsoluteFill style={{ backgroundColor: "#dfe8ff", opacity: 0.22 * flash, mixBlendMode: "screen" }} />
  </>;
};

export const JPartB: React.FC = () => {
  const T = useCurrentFrame() / FPS + OFF;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {T < CUT ? <Shot1 T={T} /> : <Shot2 T={T} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.62) 100%)" }} />
    </AbsoluteFill>
  );
};
