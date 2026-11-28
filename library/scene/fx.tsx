// KAIZEN CLIPS 2D EFFECTS: drawn over the Blender plates in Remotion. All are pure functions of time T (seconds):
// identical on every render worker, no state, no frame-to-frame jumps. Positions are screen px; `s` = px per metre
// at that depth (from project(...).ppm), so effects attached to the set keep their real size.
//
// Atmosphere: Fog, Rain, Snow, Dust (motes in light), Embers, Leaves, Birds, GodRays, Lightning
// Practical:  Flames, Smoke, Torch, LightPool, ContactShadow, Breath, Splash
// Finish:     Grade (per genre), Vignette, Grain, Letterbox-free; transitions: Fade, DipToBlack, WhipPan, Iris, FlashCut
import React from "react";
import { AbsoluteFill } from "remotion";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const hash = (i: number, k = 1) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const SVG: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}>{children}</svg>
);

// ================================================================ atmosphere
/** drifting fog banks (horror nights, misty mornings, battlefield smoke when grey) */
export const Fog: React.FC<{ T: number; y0?: number; op?: number; col?: string; id?: string; spread?: number }> =
  ({ T, y0 = 1350, op = 0.25, col = "#8a9bc0", id = "fog", spread = 1 }) => (
    <SVG style={{ mixBlendMode: "screen" }}>
      <defs><radialGradient id={id}><stop offset="0" stopColor={col} stopOpacity={0.5} /><stop offset="1" stopColor={col} stopOpacity={0} /></radialGradient></defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const sp = 9 + i * 4, x = ((i * 410 + T * sp * (i % 2 ? -1 : 1)) % 1700 + 1700) % 1700 - 310;
        return <ellipse key={i} cx={x} cy={y0 + (i % 3) * 70 * spread + 12 * Math.sin(T * 0.3 + i)} rx={520 + 90 * i} ry={(110 + 25 * (i % 2)) * spread}
          fill={`url(#${id})`} opacity={op * (0.55 + 0.45 * Math.sin(T * 0.21 + i * 1.7) ** 2)} />;
      })}
    </SVG>
  );

/** rain streaks in screen space (wind = slant). heavy 0..1 */
export const Rain: React.FC<{ T: number; heavy?: number; wind?: number; col?: string }> = ({ T, heavy = 0.6, wind = 0.18, col = "#c8d4e6" }) => {
  const n = Math.round(80 + 260 * heavy);
  return (
    <SVG style={{ opacity: 0.35 + 0.3 * heavy }}>
      {Array.from({ length: n }).map((_, i) => {
        const near = hash(i, 3), sp = 1900 + 1600 * near, L = 30 + 70 * near;
        const y = ((hash(i, 1) * 2200 + T * sp) % 2200) - 140, x = ((hash(i, 2) * 1300 + y * wind) % 1300) - 110;
        return <line key={i} x1={x} y1={y} x2={x - L * wind} y2={y - L} stroke={col} strokeWidth={0.8 + 1.6 * near} strokeLinecap="round" opacity={0.3 + 0.6 * near} />;
      })}
    </SVG>
  );
};

/** falling snow, three depths (near flakes larger, blurred and faster) */
export const Snow: React.FC<{ T: number; amount?: number; wind?: number }> = ({ T, amount = 0.6, wind = 0.3 }) => {
  const n = Math.round(60 + 220 * amount);
  return (
    <SVG>
      {Array.from({ length: n }).map((_, i) => {
        const near = hash(i, 5), sp = 60 + 160 * near, r = 1.2 + 4.5 * near * near;
        const y = ((hash(i, 1) * 2100 + T * sp) % 2100) - 90;
        const x = ((hash(i, 2) * 1240 + T * sp * wind + 26 * Math.sin(T * (0.6 + near) + i)) % 1240 + 1240) % 1240 - 80;
        return <circle key={i} cx={x} cy={y} r={r} fill="#f4f7ff" opacity={0.45 + 0.45 * near} style={near > 0.75 ? { filter: "blur(1.5px)" } : undefined} />;
      })}
    </SVG>
  );
};

/** dust motes floating in a sunbeam or a lamp's light: inside the ellipse (cx, cy, rx, ry) */
export const Dust: React.FC<{ T: number; cx?: number; cy?: number; rx?: number; ry?: number; n?: number; col?: string }> =
  ({ T, cx = 540, cy = 900, rx = 480, ry = 700, n = 60, col = "#fff2d0" }) => (
    <SVG style={{ mixBlendMode: "screen" }}>
      {Array.from({ length: n }).map((_, i) => {
        const a = hash(i, 1) * 6.283 + T * 0.05 * (hash(i, 4) - 0.5), rr = Math.sqrt(hash(i, 2));
        const x = cx + rx * rr * Math.cos(a) + 14 * Math.sin(T * 0.4 + i), y = cy + ry * rr * Math.sin(a) + 18 * Math.sin(T * 0.3 + i * 1.7) - (T * 6 * hash(i, 3)) % 40;
        return <circle key={i} cx={x} cy={y} r={0.8 + 1.8 * hash(i, 6)} fill={col} opacity={0.25 + 0.5 * (0.5 + 0.5 * Math.sin(T * 1.3 + i))} />;
      })}
    </SVG>
  );

/** glowing embers rising from a source (fires, burning buildings, forges) */
export const Embers: React.FC<{ T: number; x: number; y: number; s: number; n?: number; height?: number }> = ({ T, x, y, s, n = 18, height = 3 }) => (
  <SVG style={{ mixBlendMode: "screen" }}>
    {Array.from({ length: n }).map((_, i) => {
      const per = 1.6 + (i % 5) * 0.35, ph = ((T + i * 0.37) % per) / per;
      const ex = x + s * (0.25 * Math.sin(i * 7.1) + 0.45 * ph * Math.sin(T * 1.3 + i)), ey = y - s * (0.3 + height * ph);
      return <circle key={i} cx={ex} cy={ey} r={Math.max(1, s * 0.014)} fill="#ffc070" opacity={0.9 * (1 - ph) * Math.min(1, ph / 0.05)} />;
    })}
  </SVG>
);

/** leaves (autumn) or petals blowing across */
export const Leaves: React.FC<{ T: number; n?: number; cols?: string[]; wind?: number }> = ({ T, n = 16, cols = ["#c8692a", "#d9a03a", "#9c3b1f"], wind = 1 }) => (
  <SVG>
    {Array.from({ length: n }).map((_, i) => {
      const sp = (90 + 120 * hash(i, 1)) * wind, x = ((hash(i, 2) * 1400 + T * sp) % 1400) - 160;
      const y = hash(i, 3) * 1700 + 40 * Math.sin(T * 1.4 + i) + T * 30 * hash(i, 4) % 300, r = 8 + 10 * hash(i, 5), a = T * 160 * (hash(i, 6) - 0.5) + i * 40;
      return <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.45 * Math.abs(Math.cos(T * 3 + i))} fill={cols[i % cols.length]} transform={`rotate(${a} ${x} ${y})`} opacity={0.9} />;
    })}
  </SVG>
);

/** a flock of birds crossing the sky (life in establishing shots); dir 1 = to the right */
export const Birds: React.FC<{ T: number; n?: number; y?: number; size?: number; speed?: number; dir?: number; col?: string; t0?: number }> =
  ({ T, n = 7, y = 420, size = 14, speed = 90, dir = 1, col = "#1c1a20", t0 = 0 }) => (
    <SVG>
      {Array.from({ length: n }).map((_, i) => {
        const tt = T - t0, bx = (dir > 0 ? -100 : 1180) + dir * (tt * speed + i * 34 * (1 + hash(i))), by = y + 40 * Math.sin(i * 1.9) + 10 * Math.sin(tt * 0.8 + i);
        const flap = Math.sin(tt * 9 + i * 1.3), s = size * (0.7 + 0.5 * hash(i, 2));
        return <path key={i} d={`M${bx - s},${by - s * 0.5 * flap} Q${bx - s * 0.4},${by - s * 0.15} ${bx},${by} Q${bx + s * 0.4},${by - s * 0.15} ${bx + s},${by - s * 0.5 * flap}`}
          stroke={col} strokeWidth={Math.max(1.5, s * 0.16)} fill="none" strokeLinecap="round" />;
      })}
    </SVG>
  );

/** soft shafts of light from a window or through trees (angle in degrees from vertical) */
export const GodRays: React.FC<{ T: number; x: number; y: number; angle?: number; len?: number; n?: number; col?: string; op?: number; id?: string }> =
  ({ T, x, y, angle = 25, len = 1700, n = 5, col = "#fff0c8", op = 0.22, id = "gr" }) => (
    <SVG style={{ mixBlendMode: "screen" }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} stopOpacity={0.9} /><stop offset="1" stopColor={col} stopOpacity={0} /></linearGradient>
        <filter id={`${id}b`}><feGaussianBlur stdDeviation={18} /></filter></defs>
      <g transform={`rotate(${-angle} ${x} ${y})`} filter={`url(#${id}b)`}>
        {Array.from({ length: n }).map((_, i) => {
          const w = 40 + 70 * hash(i, 1), ox = (i - n / 2) * 95 + 20 * Math.sin(T * 0.2 + i);
          return <polygon key={i} points={`${x + ox},${y} ${x + ox + w},${y} ${x + ox + w * 1.8},${y + len} ${x + ox - w * 0.4},${y + len}`}
            fill={`url(#${id})`} opacity={op * (0.6 + 0.4 * Math.sin(T * 0.35 + i * 2.1))} />;
        })}
      </g>
    </SVG>
  );

/** lightning: a full-frame flash plus a forked bolt, at times `at` (s). Returns nothing between strikes. */
export const Lightning: React.FC<{ T: number; at: number[]; x?: number; bolt?: boolean }> = ({ T, at, x = 700, bolt = true }) => {
  const hit = at.find((a) => T >= a && T < a + 0.45);
  if (hit === undefined) return null;
  const tt = T - hit, k = tt < 0.06 ? 1 : tt < 0.12 ? 0.3 : tt < 0.18 ? 0.8 : Math.max(0, 1 - (tt - 0.18) / 0.27) * 0.5;
  const pts: string[] = []; let px = x, py = -20;
  for (let i = 0; py < 900; i++) { px += (hash(i, hit) - 0.5) * 110; py += 60 + 50 * hash(i, hit + 1); pts.push(`${px},${py}`); }
  return <>
    <AbsoluteFill style={{ background: "#dfe8ff", opacity: 0.55 * k, mixBlendMode: "screen" }} />
    {bolt && tt < 0.2 && <SVG style={{ mixBlendMode: "screen" }}><polyline points={`${x},-20 ${pts.join(" ")}`} stroke="#f2f6ff" strokeWidth={5} fill="none" style={{ filter: "drop-shadow(0 0 14px #9fb8ff)" }} /></SVG>}
  </>;
};

// ================================================================ practical effects
/** flames on a base point (campfires, torches when small, burning roofs when large). k = flicker 0..1 */
export const Flames: React.FC<{ x: number; y: number; s: number; T: number; k: number; id?: string; sparks?: boolean; width?: number }> =
  ({ x, y, s, T, k, id = "fl", sparks = true, width = 1 }) => {
    const tongues = [-0.24, -0.12, 0, 0.11, 0.22];
    return (
      <SVG>
        <defs>
          <radialGradient id={`${id}g`}><stop offset="0" stopColor="#ffb25a" stopOpacity={0.55} /><stop offset="0.4" stopColor="#ff7a2a" stopOpacity={0.18} /><stop offset="1" stopColor="#ff5a10" stopOpacity={0} /></radialGradient>
          <linearGradient id={`${id}f`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#fff1c0" /><stop offset="0.35" stopColor="#ffb040" /><stop offset="0.8" stopColor="#ff5a14" /><stop offset="1" stopColor="#c02808" stopOpacity={0} /></linearGradient>
          <filter id={`${id}b`}><feGaussianBlur stdDeviation={Math.max(0.6, s * 0.012)} /></filter>
        </defs>
        <ellipse cx={x} cy={y - 0.35 * s} rx={2.2 * s * width} ry={1.6 * s} fill={`url(#${id}g)`} opacity={0.6 + 0.4 * k} style={{ mixBlendMode: "screen" }} />
        <g filter={`url(#${id}b)`} style={{ mixBlendMode: "screen" }}>
          {tongues.map((o, i) => {
            const h = s * (0.55 + 0.3 * (1 - Math.abs(o) * 3) + 0.14 * Math.sin(T * (6 + i * 1.7) + i * 2.1) + 0.12 * k);
            const w = s * (0.11 + 0.04 * Math.sin(T * 5 + i)) * width, bx = x + o * s * width, sway = s * 0.06 * Math.sin(T * (4.1 + i) + i * 1.3);
            return <path key={i} d={`M${bx - w},${y} Q${bx - w * 1.1},${y - h * 0.45} ${bx + sway},${y - h} Q${bx + w * 1.1},${y - h * 0.45} ${bx + w},${y} Z`} fill={`url(#${id}f)`} opacity={0.85} />;
          })}
        </g>
        {sparks && Array.from({ length: 14 }).map((_, i) => {
          const per = 1.6 + (i % 5) * 0.35, ph = ((T + i * 0.37) % per) / per;
          const sx = x + s * (0.25 * Math.sin(i * 7.1) + 0.35 * ph * Math.sin(T * 1.3 + i)), sy = y - s * (0.4 + 2.4 * ph);
          return <circle key={i} cx={sx} cy={sy} r={Math.max(1, s * 0.012)} fill="#ffc070" opacity={0.9 * (1 - ph) * (ph > 0.05 ? 1 : ph / 0.05)} />;
        })}
      </SVG>
    );
  };

/** smoke curling up (chimneys, gunfire, burning, steam when light). col = grey for smoke, near-white for steam */
export const Smoke: React.FC<{ x: number; y: number; s: number; T: number; op?: number; col?: string; id?: string; rise?: number; wind?: number }> =
  ({ x, y, s, T, op = 1, col = "#8f95a3", id = "sm", rise = 3.2, wind = 0.9 }) => (
    <SVG>
      <defs><radialGradient id={id}><stop offset="0" stopColor={col} stopOpacity={0.5} /><stop offset="1" stopColor={col} stopOpacity={0} /></radialGradient></defs>
      {Array.from({ length: 10 }).map((_, i) => {
        const ph = ((T * 0.22 + i / 10) % 1);
        const px = x + s * (wind * ph * ph + 0.15 * Math.sin(T * 0.8 + i)), py = y - s * rise * ph;
        return <circle key={i} cx={px} cy={py} r={s * (0.18 + 0.75 * ph)} fill={`url(#${id})`} opacity={op * 0.75 * (1 - ph) * Math.min(1, ph * 6)} />;
      })}
    </SVG>
  );

/** a puff that bursts once at t0 (musket shot, cannon, impact dust, a character landing) */
export const Puff: React.FC<{ x: number; y: number; s: number; T: number; t0: number; col?: string; size?: number; id?: string }> =
  ({ x, y, s, T, t0, col = "#cfc8bc", size = 1, id = "pf" }) => {
    const tt = T - t0;
    if (tt < 0 || tt > 2.5) return null;
    const k = 1 - Math.exp(-tt * 3);
    return (
      <SVG>
        <defs><radialGradient id={id}><stop offset="0" stopColor={col} stopOpacity={0.7} /><stop offset="1" stopColor={col} stopOpacity={0} /></radialGradient></defs>
        {Array.from({ length: 7 }).map((_, i) => {
          const a = hash(i, 9) * 3.14, d = s * size * (0.3 + 0.9 * k) * (0.5 + hash(i, 4));
          return <circle key={i} cx={x + Math.cos(a) * d} cy={y - Math.sin(a) * d * 0.7 - s * 0.5 * k * size} r={s * size * (0.25 + 0.6 * k)} fill={`url(#${id})`} opacity={(1 - tt / 2.5) * 0.9} />;
        })}
      </SVG>
    );
  };

/** a warm (or cold) pool of light on the ground around a lamp, torch or window */
export const LightPool: React.FC<{ x: number; y: number; s: number; k?: number; col?: string; r?: number; id?: string }> =
  ({ x, y, s, k = 1, col = "#ffa050", r = 1.4, id = "lp" }) => (
    <SVG style={{ mixBlendMode: "screen" }}>
      <defs><radialGradient id={id}><stop offset="0" stopColor={col} stopOpacity={0.34} /><stop offset="1" stopColor={col} stopOpacity={0} /></radialGradient></defs>
      <ellipse cx={x} cy={y} rx={r * s} ry={r * 0.62 * s} fill={`url(#${id})`} opacity={0.8 + 0.2 * k} />
    </SVG>
  );

/** contact shadow under a character or prop: grounds the 2D cast in the 3D set (no floating) */
export const ContactShadow: React.FC<{ x: number; y: number; ppm: number; op?: number; w?: number }> = ({ x, y, ppm, op = 0.5, w = 0.42 }) => (
  <SVG><ellipse cx={x} cy={y + 0.01 * ppm} rx={w * ppm} ry={0.07 * ppm} fill="#000" opacity={op} style={{ filter: `blur(${0.04 * ppm}px)` }} /></SVG>
);

/** a visible breath cloud in the cold at time `at` */
export const Breath: React.FC<{ T: number; at: number; x: number; y: number; s: number; dx?: number }> = ({ T, at, x, y, s, dx = 1 }) => {
  const tt = T - at;
  if (tt < 0 || tt > 1.6) return null;
  const k = tt / 1.6;
  return <SVG><circle cx={x + dx * s * 0.25 * k} cy={y - s * 0.05 * k} r={s * (0.04 + 0.12 * k)} fill="#dfe6f2" opacity={0.35 * (1 - k)} style={{ filter: `blur(${s * 0.03}px)` }} /></SVG>;
};

/** water splash at t0 (rivers, lakes, the sea): droplets in arcs + a spreading ring */
export const Splash: React.FC<{ x: number; y: number; s: number; T: number; t0: number; size?: number }> = ({ x, y, s, T, t0, size = 1 }) => {
  const tt = T - t0;
  if (tt < 0 || tt > 1.4) return null;
  return (
    <SVG>
      <ellipse cx={x} cy={y} rx={s * size * (0.2 + 1.1 * tt)} ry={s * size * (0.06 + 0.3 * tt)} fill="none" stroke="#e8f2f6" strokeWidth={Math.max(1, s * 0.02)} opacity={1 - tt / 1.4} />
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * 3.14, v = s * size * (1.2 + hash(i) * 1.4), dx = Math.cos(a) * v * 0.8 * tt, dy = Math.sin(a) * v * tt - 4.9 * s * tt * tt;
        return dy > -0.01 ? <circle key={i} cx={x + dx} cy={y - dy} r={Math.max(1, s * 0.025)} fill="#eef6fa" opacity={1 - tt / 1.4} /> : null;
      })}
    </SVG>
  );
};

// ================================================================ finish: grade, vignette, grain
/** genre looks (a starting point per story; tweak per shot). Applied over everything except subtitles. */
export const GRADES = {
  horror: { tint: "#0a1430", tintOp: 0.18, vig: 0.78, grain: 0.07, sat: 0.9, warm: 0 },        // the Hidebehind finish
  mystery: { tint: "#0f2a2e", tintOp: 0.16, vig: 0.62, grain: 0.06, sat: 0.85, warm: 0 },      // teal shadows, muted
  history: { tint: "#3a2410", tintOp: 0.12, vig: 0.5, grain: 0.06, sat: 0.92, warm: 0.12 },     // warm, slightly aged
  epic: { tint: "#1c2030", tintOp: 0.1, vig: 0.55, grain: 0.05, sat: 1.05, warm: 0.06 },        // battles, big moments
  comedy: { tint: "#ffffff", tintOp: 0, vig: 0.28, grain: 0.03, sat: 1.12, warm: 0.05 },        // bright and punchy
  true: { tint: "#20242a", tintOp: 0.08, vig: 0.45, grain: 0.05, sat: 0.95, warm: 0 },          // believable, neutral
  night: { tint: "#081028", tintOp: 0.22, vig: 0.7, grain: 0.06, sat: 0.85, warm: 0 },
  golden: { tint: "#4a2a08", tintOp: 0.1, vig: 0.45, grain: 0.04, sat: 1.05, warm: 0.15 },
} as const;
export type GradeName = keyof typeof GRADES;

export const Grade: React.FC<{ fr: number; look?: GradeName; vig?: number; id?: string }> = ({ fr, look = "horror", vig, id = "grain" }) => {
  const g = GRADES[look];
  return <>
    {g.tintOp > 0 && <AbsoluteFill style={{ background: g.tint, mixBlendMode: "multiply", opacity: g.tintOp }} />}
    {g.warm > 0 && <AbsoluteFill style={{ background: "#ffb060", mixBlendMode: "soft-light", opacity: g.warm }} />}
    <Vignette amount={vig ?? g.vig} />
    <Grain fr={fr} op={g.grain} id={id} />
  </>;
};

export const Vignette: React.FC<{ amount?: number; cx?: number; cy?: number }> = ({ amount = 0.6, cx = 50, cy = 55 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${cx}% ${cy}%, rgba(0,0,0,0) 45%, rgba(0,0,0,${amount}) 100%)` }} />
);

export const Grain: React.FC<{ fr: number; op?: number; id?: string }> = ({ fr, op = 0.06, id = "grain" }) => op > 0 ? (
  <SVG style={{ opacity: op, mixBlendMode: "overlay" }}>
    <filter id={id}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={(fr * 7919) % 97} /></filter>
    <rect width={1080} height={1920} filter={`url(#${id})`} />
  </SVG>
) : null;

// ================================================================ transitions (put on top of the outgoing/incoming shot)
/** fade from/to black: in over [t0, t0 + d] (dir "in") or out over [t1 - d, t1] (dir "out") */
export const Fade: React.FC<{ T: number; at: number; d?: number; dir?: "in" | "out"; col?: string }> = ({ T, at, d = 0.5, dir = "in", col = "#000" }) => {
  const k = dir === "in" ? 1 - sm((T - at) / d) : sm((T - (at - d)) / d);
  return k > 0.001 ? <AbsoluteFill style={{ background: col, opacity: k }} /> : null;
};
/** dip to black around a cut at `at` (d seconds each side) */
export const DipToBlack: React.FC<{ T: number; at: number; d?: number }> = ({ T, at, d = 0.25 }) => {
  const k = T < at ? sm((T - (at - d)) / d) : 1 - sm((T - at) / d);
  return k > 0.001 ? <AbsoluteFill style={{ background: "#000", opacity: k }} /> : null;
};
/** white flash on a cut (jumpscares, impacts, memories) */
export const FlashCut: React.FC<{ T: number; at: number; d?: number; col?: string }> = ({ T, at, d = 0.18, col = "#fff" }) => {
  const k = T >= at && T < at + d ? 1 - (T - at) / d : 0;
  return k > 0 ? <AbsoluteFill style={{ background: col, opacity: k, mixBlendMode: "screen" }} /> : null;
};
/** whip-pan: returns a CSS style for the shot layer (motion blur + slide) around a cut at `at` */
export const whipPan = (T: number, at: number, d = 0.22, dir = 1): React.CSSProperties => {
  const u = (T - (at - d)) / (2 * d);
  if (u <= 0 || u >= 1) return {};
  const k = Math.sin(u * Math.PI), off = -dir * (u - 0.5) * 700;
  return { transform: `translateX(${off}px)`, filter: `blur(${18 * k}px)` };
};
/** iris in/out (comedy, old-film endings): a black frame with a shrinking circle around (cx, cy) */
export const Iris: React.FC<{ T: number; at: number; d?: number; cx?: number; cy?: number; dir?: "in" | "out" }> = ({ T, at, d = 0.8, cx = 540, cy = 900, dir = "out" }) => {
  const u = sm((T - at) / d), r = (dir === "out" ? 1 - u : u) * 1400;
  if ((dir === "out" && T < at) || (dir === "in" && u >= 1)) return null;
  return <AbsoluteFill style={{ background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(0,0,0,0) ${r}px, #000 ${r + 2}px)` }} />;
};
