// Part A of the full spider woman Short (story time 0.00-15.20 s, video only: no subtitles, no audio).
// Line 1 (0-7.4 s) "Japanese legend says when a spider lives four hundred years... it learns to wear a woman's face":
// a close shot of an old golden orb spider in a big torn web up in the dark rafters, moonlight and dust. It plucks a
// thread on "spider", then crawls up out of the hub; in the lantern-warm light the web's strands form HER face (the
// approved lady from kimono.tsx, drawn as light caught in the silk), her eyes open on "face", and the camera tilts
// down into the moonlit room. One tall Blender still (shot "rafters", 1620x4320) is panned as a 2.5D layer, and
// every moving thing is computed from time, so playback is a steady 30 fps with no held or skipped frames.
// Lines 2-3 (7.4-15.2 s) are the approved style preview, unchanged, without its audio and subtitles.
import React from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Kimono } from "./kimono";
import { LADY, sm } from "./CharTest";
import { JStylePreview, J_PREVIEW_FRAMES } from "./StylePreview";

const FPS = 30, DUR = 7.4;
export const J_OPEN_FRAMES = Math.round(DUR * FPS);              // 222
export const J_PARTA_FRAMES = J_OPEN_FRAMES + J_PREVIEW_FRAMES;  // 456 = 15.2 s
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const io = (v: number) => sm(v);
const hash = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

// the plate is shown at 1080 x 2880; web hub and her face in plate pixels
const PW = 1080, PH = 2880;
const HUB = { x: 660, y: 950 }, R = 330;
const FACE = { x: 672, y: 1010 };
// beats (story seconds): pluck on "spider", the crawl, the face, the tilt
const PLUCK = 2.72, CRAWL0 = 3.9, CRAWL1 = 5.5, FACE0 = 4.9, EYES = 6.72, TILT0 = 6.2, TILT1 = 7.4;

// the web: spokes with uneven reach, a sagging spiral with gaps (it is old and torn), a few loose hanging threads
const SPOKES = Array.from({ length: 19 }, (_, i) => ({ a: (i / 19) * Math.PI * 2 + (hash(i, 1) - 0.5) * 0.22, r: R * (0.78 + 0.32 * hash(i, 2)) }));
const RINGS = Array.from({ length: 16 }, (_, j) => 34 + j * 18.5 + (j > 8 ? (j - 8) * 2.5 : 0));
const wobble = (t: number, r: number, a: number) => {
  // a slow breeze sway plus the ripple that runs out from the pluck and dies away
  const dp = t - PLUCK;
  const rip = dp > 0 ? 5 * Math.exp(-dp / 0.7) * Math.sin(dp * 26 - r * 0.045) * Math.min(1, dp * 8) : 0;
  return { dx: 2.2 * Math.sin(t * 0.8 + r * 0.01) + rip * Math.cos(a) * 0.6, dy: 3.0 * Math.sin(t * 0.65 + a) * (r / R) + rip };
};
const webPaths = (t: number) => {
  const pt = (a: number, r: number) => { const w = wobble(t, r, a); return [HUB.x + Math.cos(a) * r + w.dx, HUB.y + Math.sin(a) * r + w.dy]; };
  const spokes = SPOKES.map((s) => { const [x0, y0] = pt(s.a, 10), [x1, y1] = pt(s.a, s.r); return `M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)}`; });
  const rings: string[] = [];
  RINGS.forEach((r, j) => SPOKES.forEach((s, i) => {
    const n = SPOKES[(i + 1) % SPOKES.length];
    if (r > Math.min(s.r, n.r) * 0.97 || hash(i * 31 + j, 3) < 0.09) return;      // torn gaps
    const [x0, y0] = pt(s.a, r), [x1, y1] = pt(n.a, r), am = (s.a + n.a + (n.a < s.a ? Math.PI * 2 : 0)) / 2;
    const [cx, cy] = pt(am, r * 0.9);                                             // strands sag toward the hub
    rings.push(`M${x0.toFixed(1)},${y0.toFixed(1)} Q${cx.toFixed(1)},${(cy + 3).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`);
  }));
  // anchor threads out to the beams and the post, and broken threads hanging down
  const anchors = [[-2.4, 520], [-1.6, 470], [-0.7, 430], [2.6, 520], [1.9, 500]].map(([a, L]) => { const [x0, y0] = pt(a, R * 0.8); return `M${x0.toFixed(1)},${y0.toFixed(1)} L${(HUB.x + Math.cos(a) * L).toFixed(1)},${(HUB.y + Math.sin(a) * L).toFixed(1)}`; });
  const loose = [0.6, 1.25, 2.1].map((a, k) => { const [x0, y0] = pt(a, R * (0.85 + 0.05 * k)), sw = 14 * Math.sin(t * 0.9 + k * 2);
    return `M${x0.toFixed(1)},${y0.toFixed(1)} q${(sw * 0.5).toFixed(1)},${60 + 20 * k} ${sw.toFixed(1)},${110 + 40 * k}`; });
  return { strands: [...spokes, ...rings, ...anchors].join(" "), loose: loose.join(" ") };
};

/** the old spider (a golden orb weaver: long banded legs, a long yellow and black abdomen), seen from the front, head up */
const Spider: React.FC<{ x: number; y: number; t: number; crawl: number; dist: number; plk: number }> = ({ x, y, t, crawl, dist, plk }) => {
  const legs = [[-32, 150], [-70, 128], [-112, 84], [-152, 126]];
  const leg = (side: number, i: number) => {
    const [a0, L] = legs[i];
    // tetrapod gait: legs 1 and 3 of one side move with 2 and 4 of the other; a tip slides back while planted and
    // swings forward lifted, so the body travels over still feet
    const ph = dist / 34 + (((i + (side > 0 ? 1 : 0)) % 2) ? 0.5 : 0);
    const f = ph - Math.floor(ph), plant = f < 0.6, u = plant ? f / 0.6 : (f - 0.6) / 0.4;
    const step = crawl * (plant ? lerp(10, -10, u) : lerp(-10, 10, u)), lift = crawl * (plant ? 0 : Math.sin(u * Math.PI) * 9);
    const twitch = 2.2 * Math.sin(t * (1.3 + i * 0.37) + side * 2 + i) + (i === 0 && side < 0 ? 26 * plk : 0);
    const a = ((-a0 + twitch) * side * Math.PI) / 180;
    const bx = side * 9, by = -20 + i * 7;
    const tx = bx + Math.sin(a) * L, ty = by - Math.cos(a) * L + step - lift * 0.3;
    // the knee rises off the web, so seen from the front each leg bends toward the head side of its own line
    const ka = a - side * 0.42;
    const kx = bx + Math.sin(ka) * L * 0.46, ky = by - Math.cos(ka) * L * 0.46 - lift;
    const ma = a + side * 0.12, mx = bx + Math.sin(ma) * L * 0.8, my = by - Math.cos(ma) * L * 0.8 + step * 0.6 - lift * 0.5;
    return <g key={`${side}${i}`}>
      <path d={`M${bx},${by} L${kx.toFixed(1)},${ky.toFixed(1)}`} stroke="#120d0b" strokeWidth={5} strokeLinecap="round" />
      <path d={`M${kx.toFixed(1)},${ky.toFixed(1)} L${mx.toFixed(1)},${my.toFixed(1)} L${tx.toFixed(1)},${ty.toFixed(1)}`} stroke="#120d0b" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${kx.toFixed(1)},${ky.toFixed(1)} L${mx.toFixed(1)},${my.toFixed(1)} L${tx.toFixed(1)},${ty.toFixed(1)}`} stroke="#aebfff" strokeWidth={0.9} fill="none" opacity={0.4} transform="translate(-0.8,-1.2)" />
      <circle cx={kx} cy={ky} r={3.4} fill="#8a6a22" />
      <path d={`M${kx.toFixed(1)},${ky.toFixed(1)} L${(kx + (mx - kx) * 0.35).toFixed(1)},${(ky + (my - ky) * 0.35).toFixed(1)}`} stroke="#8a6a22" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <path d={`M${bx},${by} L${kx.toFixed(1)},${ky.toFixed(1)}`} stroke="#9fb4ff" strokeWidth={1.2} opacity={0.35} transform="translate(-1,-1.5)" />
    </g>;
  };
  const br = 1 + 0.025 * Math.sin(t * 1.6);
  return <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(1.45)`}>
    {[0, 1, 2, 3].map((i) => leg(-1, i))}{[0, 1, 2, 3].map((i) => leg(1, i))}
    {/* abdomen: long, banded, with a cold moon rim light and a warm glint from below */}
    <g transform={`translate(0,34) scale(${br},${br})`}>
      <ellipse cx={0} cy={4} rx={19} ry={50} fill="#211a10" stroke="#060404" strokeWidth={3} />
      {[-30, -12, 6, 24].map((yy, k) => <path key={k} d={`M${-17 + Math.abs(yy) * 0.2},${yy} Q0,${yy + 6} ${17 - Math.abs(yy) * 0.2},${yy}`} stroke="#a8841e" strokeWidth={2.6} fill="none" opacity={0.55} />)}
      <path d="M-9,-36 Q-12,4 -6,44 M9,-36 Q12,4 6,44" stroke="#9a7a1c" strokeWidth={2} fill="none" opacity={0.45} />
      <path d="M-6,-40 Q0,-10 -4,40" stroke="#0e0a07" strokeWidth={5} fill="none" opacity={0.7} />
      <path d="M-18,-30 Q-25,0 -14,34" stroke="#aabaff" strokeWidth={2.4} fill="none" opacity={0.45} />
      {/* age: grey hairs */}
      {Array.from({ length: 14 }, (_, k) => { const yy = -38 + k * 6, xx = (k % 2 ? 1 : -1) * (14 + 6 * hash(k, 9));
        return <path key={k} d={`M${xx},${yy} l${xx > 0 ? 6 : -6},-3`} stroke="#8c8a90" strokeWidth={1} opacity={0.6} />; })}
    </g>
    <ellipse cx={0} cy={-14} rx={15} ry={18} fill="#1d1712" stroke="#060404" strokeWidth={2.5} />
    <path d="M-10,-24 Q0,-30 10,-24" stroke="#c9d6ff" strokeWidth={1.4} fill="none" opacity={0.45} />
    {[[-5, -27], [5, -27], [-9, -22], [9, -22]].map(([ex, ey], k) => <circle key={k} cx={ex} cy={ey} r={k < 2 ? 2.4 : 1.6} fill="#0a0606" stroke="#7a8cc0" strokeWidth={0.6} />)}
    <path d="M-5,-31 q-3,-7 -1,-11 M5,-31 q3,-7 1,-11" stroke="#120d0b" strokeWidth={3} strokeLinecap="round" fill="none" />
  </g>;
};

/** cold dust in the moonlight, a few warm motes near the face */
const Motes: React.FC<{ t: number; warm: number }> = ({ t, warm }) => <g style={{ mixBlendMode: "screen" }}>
  {Array.from({ length: 60 }, (_, i) => {
    const x = ((hash(i, 1) * 1200 + t * (6 + hash(i, 2) * 12) + 18 * Math.sin(t * 0.4 + i)) % 1240) - 80;
    const y = 300 + hash(i, 3) * 2400 + 22 * Math.sin(t * (0.25 + hash(i, 4) * 0.3) + i) - t * (3 + hash(i, 5) * 4);
    const nearFace = Math.hypot(x - FACE.x, y - FACE.y) < 260;
    return <circle key={i} cx={x} cy={y} r={1.1 + hash(i, 6) * 2.2} fill={nearFace && warm > 0.2 ? "#ffd8a0" : "#c8d6ff"}
      opacity={(0.22 + 0.35 * hash(i, 7)) * (0.6 + 0.4 * Math.sin(t * 1.3 + i))} />;
  })}
</g>;

export const JPartAOpen: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const { strands, loose } = webPaths(t);
  // the pluck: front leg lifts, taps the thread, settles
  const plk = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (t - (PLUCK - 0.35)) / 0.5))));
  // crawl up the web out of the hub, so her face can form where it sat
  const ck = io((t - CRAWL0) / (CRAWL1 - CRAWL0));
  const crawl = t > CRAWL0 && t < CRAWL1 ? Math.min(1, Math.min(t - CRAWL0, CRAWL1 - t) * 3) : 0;
  const sy = HUB.y + 8 - 250 * ck, sx = HUB.x - 30 * ck;
  // her face: lantern-warm light gathering in the silk; eyes closed, they open on "face"
  const fk = io((t - FACE0) / 1.3) * (1 - io((t - 7.0) / 0.4) * 0.65);
  const eyesOpen = t >= EYES;
  const glint = eyesOpen ? Math.exp(-(t - EYES) / 0.25) : 0;
  // camera: slow push on the web, then a slow tilt down and pull back into the room
  const tk = io((t - TILT0) / (TILT1 - TILT0));
  const push = lerp(1.5, 1.78, io(t / TILT0));
  const z = lerp(push, 1.02, tk);
  const fx = lerp(lerp(HUB.x, FACE.x, io((t - FACE0) / 1.5)), 540, tk), fy = lerp(lerp(HUB.y - 20, FACE.y, io((t - FACE0) / 1.5)), 1860, tk);
  const tiltDrift = 6 * Math.sin(t * 0.5);   // a slow hand-held drift, no jitter
  const layer = (zz: number, par = 1): React.CSSProperties => ({ position: "absolute", left: 0, top: 0, width: PW, height: PH, transformOrigin: "0 0",
    transform: `translate(${540 - fx * zz * par + tiltDrift}px,${960 - fy * zz * par}px) scale(${zz})` });
  const zf = 1 + (z - 1) * 1.6;
  const moon = 0.85 + 0.08 * Math.sin(t * 0.9);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <div style={layer(z)}>
        <Img src={staticFile("jorogumo/rafters/f_0001.png")} style={{ position: "absolute", width: PW, height: PH }} />
        <svg width={PW} height={PH} style={{ position: "absolute" }}>
          <defs>
            <filter id="silkglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={2.2} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="faceblur"><feGaussianBlur stdDeviation={3} /></filter>
            <filter id="faceblur2"><feGaussianBlur stdDeviation={1.4} /></filter>
            <filter id="lum"><feColorMatrix type="matrix" values="0.5 0.4 0.1 0 0  0.5 0.4 0.1 0 0  0.5 0.4 0.1 0 0  0 0 0 1 0" /></filter>
            <radialGradient id="facefall" cx={FACE.x} cy={FACE.y} r={240} gradientUnits="userSpaceOnUse">
              <stop offset="0.55" stopColor="#fff" /><stop offset="1" stopColor="#000" />
            </radialGradient>
            <mask id="fallmask" maskUnits="userSpaceOnUse" x={0} y={0} width={PW} height={PH}><rect width={PW} height={PH} fill="url(#facefall)" /></mask>
            {/* her face as a luminance mask: pale skin lets the warm light through, the black hair and eyes hold it back */}
            <mask id="facemask" maskUnits="userSpaceOnUse" x={0} y={0} width={PW} height={PH}>
              <rect width={PW} height={PH} fill="#000" />
              <g mask="url(#fallmask)" filter="url(#lum)">
                <Kimono x={FACE.x + 10} y={FACE.y + 1.22 * 640} ppm={640} look={LADY} flip
                  pose={{ t: t + 1, lookX: 0.1, expr: "eerie", glide: true, blink: !eyesOpen, tilt: -4 }} />
              </g>
            </mask>
            <radialGradient id="moonhaze" cx={HUB.x + 160} cy={HUB.y + 420} r={900} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#9fb4ff" stopOpacity={0.16 * moon} /><stop offset="1" stopColor="#9fb4ff" stopOpacity={0} />
            </radialGradient>
            <radialGradient id="warm" cx={FACE.x} cy={FACE.y + 40} r={330} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffb060" stopOpacity={0.26 * fk} /><stop offset="1" stopColor="#ff8030" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width={PW} height={PH} fill="url(#moonhaze)" style={{ mixBlendMode: "screen" }} />
          {/* web shadow cast by the moon onto the ceiling behind it (offset, soft) */}
          <path d={strands} stroke="#000" strokeWidth={2.2} fill="none" opacity={0.25} transform="translate(26,-34)" filter="url(#faceblur)" />
          {/* the face, very faint and soft under the silk, then the silk itself catching her light */}
          <rect width={PW} height={PH} fill="url(#warm)" style={{ mixBlendMode: "screen" }} />
          <g opacity={0.4 * fk} filter="url(#faceblur2)" mask="url(#fallmask)">
            <Kimono x={FACE.x + 10} y={FACE.y + 1.22 * 640} ppm={640} look={LADY} flip
              pose={{ t: t + 1, lookX: 0.1, expr: "eerie", glide: true, blink: !eyesOpen, tilt: -4 }} />
          </g>
          <g filter="url(#silkglow)">
            <path d={strands} stroke="#cfd9ff" strokeWidth={1.15} fill="none" opacity={0.42 * moon} />
            <path d={loose} stroke="#cfd9ff" strokeWidth={1} fill="none" opacity={0.3} />
            <path d={strands} stroke="#ffe2b8" strokeWidth={2.6} fill="none" opacity={0.95 * fk} mask="url(#facemask)" />
          </g>
          {/* the eyes open: a brief cold glint */}
          {glint > 0.01 && <g style={{ mixBlendMode: "screen" }} opacity={glint}>
            <circle cx={FACE.x + 0.03 * 640 * -1 + 10} cy={FACE.y - 0.022 * 640} r={10} fill="#ffffff" filter="url(#faceblur)" />
            <circle cx={FACE.x - 0.15 * 640 + 10} cy={FACE.y - 0.022 * 640} r={10} fill="#ffffff" filter="url(#faceblur)" />
          </g>}
          <path d={`M${sx},${sy - 10} L${sx},${HUB.y}`} stroke="#dfe6ff" strokeWidth={1} opacity={0.4 * ck} />
          <Spider x={sx} y={sy} t={t} crawl={crawl} dist={250 * ck} plk={plk} />
          <Motes t={t} warm={fk} />
        </svg>
      </div>
      {/* near layer: a single out-of-focus strand and big soft motes close to the lens, moving faster than the room */}
      <div style={layer(zf)}>
        <svg width={PW} height={PH} style={{ position: "absolute" }}>
          <defs><filter id="near"><feGaussianBlur stdDeviation={6} /></filter></defs>
          <path d={`M${HUB.x - 420},${HUB.y - 700} Q${HUB.x - 330 + 30 * Math.sin(t * 0.7)},${HUB.y - 200} ${HUB.x - 360 + 40 * Math.sin(t * 0.6)},${HUB.y + 300}`}
            stroke="#b8c6ff" strokeWidth={4} fill="none" opacity={0.18} filter="url(#near)" />
          {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={(hash(i, 11) * PW + t * 12) % PW} cy={HUB.y - 500 + hash(i, 12) * 1500 + 30 * Math.sin(t * 0.5 + i)}
            r={8 + 8 * hash(i, 13)} fill="#c8d6ff" opacity={0.08} filter="url(#near)" />)}
        </svg>
      </div>
      {/* the lantern (behind the camera, to the right) warms the floor as the camera comes down, so the cut to the
          lantern-lit room is not a jump in colour */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 85% 95%, rgba(255,150,70,0.5) 0%, rgba(255,120,50,0) 70%)", mixBlendMode: "screen", opacity: tk }} />
      {/* fade up from black at the very start; the room is a little darker at the edges */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: 1 - io(t / 0.8) }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.66) 100%)" }} />
    </AbsoluteFill>
  );
};

export const JPartA: React.FC = () => <AbsoluteFill style={{ backgroundColor: "#000" }}>
  <Sequence durationInFrames={J_OPEN_FRAMES}><JPartAOpen /></Sequence>
  <Sequence from={J_OPEN_FRAMES} durationInFrames={J_PREVIEW_FRAMES}><JStylePreview clean /></Sequence>
</AbsoluteFill>;
