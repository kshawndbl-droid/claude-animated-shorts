// Flat 2D cast for the 3D-set look: our own simple characters drawn over Blender sets. A big round head with a real
// skin tone, ears, dot eyes with whites, heavy brows and a moustache option; a small clothed torso; thin ink stick
// arms and legs with bending elbows and knees, round hands and boots. Units are metres (feet at y = 0, ~1.75 m tall)
// so a figure can be placed on the 3D ground with the projected pixels-per-metre. Also a matching flat lion.
import React from "react";

export const INK = "#1d1820";
const rad = (d: number) => (d * Math.PI) / 180;
const P = (n: number) => n.toFixed(4);

export type StickLook = {
  skin: string; top: string; topDark: string; legs: string; boots: string; hair: string;
  hat?: "pith" | "turban" | "none"; hatCol?: string; band?: string; mustache?: boolean; belt?: string; sash?: string;
};
export type StickPose = {
  phase?: number; walk?: number;           // walk cycle 0..1 per two steps, amount 0..1
  armL?: [number, number]; armR?: [number, number]; // [shoulder angle from straight down (+ = forward), elbow bend]
  expr?: "neutral" | "stern" | "worried" | "scared" | "smile";
  lookX?: number; blink?: boolean; talk?: number; tilt?: number; bob?: number;
  hold?: "rifle" | "plank" | null;
};

const H = 1.75, HEAD_R = 0.25, NECK_Y = -1.13, HIP_Y = -0.78, SH_Y = -1.07, SH_X = 0.15, HIP_X = 0.08, UP = 0.3, LO = 0.29, THIGH = 0.4, SHIN = 0.38;
const LW = 0.032;

/** two-bone limb from a root: angle a from straight down (+ toward facing), bend b at the middle joint */
const limb = (x: number, y: number, a: number, b: number, l1: number, l2: number) => {
  const a1 = rad(a), mx = x + Math.sin(a1) * l1, my = y + Math.cos(a1) * l1;
  const a2 = rad(a + b), ex = mx + Math.sin(a2) * l2, ey = my + Math.cos(a2) * l2;
  return { mx, my, ex, ey };
};

export const Stick: React.FC<{ x: number; y: number; ppm: number; look: StickLook; pose: StickPose; flip?: boolean; id: string; shade?: number }> =
  ({ x, y, ppm, look: L, pose, flip = false, id, shade = 1 }) => {
    const w = pose.walk ?? 0, ph = (pose.phase ?? 0) * Math.PI * 2;
    const bob = (pose.bob ?? 0) + w * 0.025 * Math.abs(Math.sin(ph));
    const by = -bob;
    // legs: thigh swing and knee bend from the walk phase
    const legs = [0, Math.PI].map((o) => {
      const s = Math.sin(ph + o), lift = Math.max(0, Math.cos(ph + o));
      const a = 26 * w * s, b = -(8 + 40 * w * lift);
      return limb((o ? -1 : 1) * HIP_X * 0.5, HIP_Y + by, a, b, THIGH, SHIN);
    });
    const swing = 28 * w;
    const armR = pose.armR ?? [-swing * Math.sin(ph) + 6, 14];
    const armL = pose.armL ?? [swing * Math.sin(ph) + 6, 14];
    const arms = [limb(SH_X, SH_Y + by, armR[0], armR[1], UP, LO), limb(-SH_X * 0.6, SH_Y + by, armL[0], armL[1], UP, LO)];
    const hx = 0.02, hy = NECK_Y + by - HEAD_R + 0.04 + (pose.tilt ?? 0) * 0.0;
    const lx = (pose.lookX ?? 0.4) * 0.03;
    const ex = pose.expr ?? "neutral";
    const talk = pose.talk !== undefined ? Math.max(0, Math.sin(pose.talk * 14)) * Math.max(0, Math.sin(pose.talk * 3.1 + 1)) : 0;
    const browT = ex === "stern" ? 0.035 : ex === "worried" || ex === "scared" ? -0.03 : 0;
    const eyeR = ex === "scared" ? 0.045 : 0.036;
    const stroke = (d: string, k: string, col = INK, wdt = LW) => <path key={k} d={d} stroke={col} strokeWidth={wdt} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    const limbPath = (l: { mx: number; my: number; ex: number; ey: number }, x0: number, y0: number) => `M${P(x0)},${P(y0)} L${P(l.mx)},${P(l.my)} L${P(l.ex)},${P(l.ey)}`;
    const rifleArm = pose.hold === "rifle";
    return (
      <g transform={`translate(${P(x)},${P(y)}) scale(${P((flip ? -1 : 1) * ppm)},${P(ppm)})`} style={shade !== 1 ? { filter: `brightness(${shade})` } : undefined}>
        {/* ground shadow */}
        <ellipse cx={0} cy={0} rx={0.32} ry={0.05} fill="rgba(10,5,10,0.35)" />
        {/* far arm, far leg */}
        {stroke(limbPath(arms[1], -SH_X * 0.6, SH_Y + by), "al")}
        <circle cx={arms[1].ex} cy={arms[1].ey} r={0.045} fill={L.skin} stroke={INK} strokeWidth={0.018} />
        {stroke(limbPath(legs[1], -HIP_X * 0.5, HIP_Y + by), "ll")}
        <path d={`M${P(legs[1].ex - 0.05)},${P(legs[1].ey + 0.01)} q0.02,-0.08 0.09,-0.06 q0.07,0.01 0.06,0.07 Z`} fill={L.boots} stroke={INK} strokeWidth={0.018} />
        {/* torso: a small rounded smock / jacket */}
        <path d={`M${P(-0.13)},${P(SH_Y + by - 0.03)} Q0,${P(SH_Y + by - 0.09)} ${P(0.15)},${P(SH_Y + by - 0.03)} L${P(0.17)},${P(HIP_Y + by + 0.06)} Q0,${P(HIP_Y + by + 0.11)} ${P(-0.15)},${P(HIP_Y + by + 0.06)} Z`}
          fill={L.top} stroke={INK} strokeWidth={0.022} strokeLinejoin="round" />
        <path d={`M${P(0.1)},${P(SH_Y + by)} L${P(0.12)},${P(HIP_Y + by + 0.06)}`} stroke={L.topDark} strokeWidth={0.03} />
        {L.belt && <path d={`M${P(-0.15)},${P(HIP_Y + by + 0.0)} L${P(0.17)},${P(HIP_Y + by + 0.0)}`} stroke={L.belt} strokeWidth={0.035} />}
        {L.sash && <path d={`M${P(-0.12)},${P(SH_Y + by)} L${P(0.15)},${P(HIP_Y + by + 0.04)}`} stroke={L.sash} strokeWidth={0.04} />}
        {[0, 1, 2].map((i) => !L.sash && <circle key={i} cx={0.04} cy={SH_Y + by + 0.07 + i * 0.07} r={0.011} fill={L.topDark} />)}
        {/* near leg (trousers colour on the thigh), near boot */}
        {stroke(limbPath(legs[0], HIP_X * 0.5, HIP_Y + by), "lr")}
        <path d={`M${P(legs[0].ex - 0.05)},${P(legs[0].ey + 0.01)} q0.02,-0.08 0.09,-0.06 q0.07,0.01 0.06,0.07 Z`} fill={L.boots} stroke={INK} strokeWidth={0.018} />
        {/* head */}
        <g transform={`rotate(${P((pose.tilt ?? 0))},${P(hx)},${P(hy + HEAD_R)})`}>
          <circle cx={hx - HEAD_R * 0.95} cy={hy + 0.03} r={0.055} fill={L.skin} stroke={INK} strokeWidth={0.02} />
          <circle cx={hx} cy={hy} r={HEAD_R} fill={L.skin} stroke={INK} strokeWidth={0.024} />
          <ellipse cx={hx - 0.06} cy={hy + 0.12} rx={0.12} ry={0.06} fill="rgba(0,0,0,0.07)" />
          {L.hat !== "turban" && L.hat !== "pith" && <path d={`M${P(hx - HEAD_R)},${P(hy - 0.02)} Q${P(hx - 0.1)},${P(hy - HEAD_R - 0.06)} ${P(hx + HEAD_R * 0.8)},${P(hy - HEAD_R * 0.55)} Q${P(hx)},${P(hy - HEAD_R * 0.6)} ${P(hx - HEAD_R)},${P(hy - 0.02)} Z`} fill={L.hair} stroke={INK} strokeWidth={0.018} />}
          {/* eyes */}
          {[0.03, 0.15].map((ox, i) => <g key={i}>
            {pose.blink ? <path d={`M${P(hx + ox - eyeR)},${P(hy - 0.02)} q${P(eyeR)},0.02 ${P(eyeR * 2)},0`} stroke={INK} strokeWidth={0.016} fill="none" /> : <>
              <ellipse cx={hx + ox} cy={hy - 0.02} rx={eyeR} ry={eyeR * 1.2} fill="#fffaf2" stroke={INK} strokeWidth={0.012} />
              <circle cx={hx + ox + lx} cy={hy - 0.015} r={ex === "scared" ? 0.014 : 0.019} fill={INK} />
            </>}
            <path d={`M${P(hx + ox - 0.045)},${P(hy - 0.085 + (i === 0 ? -browT : browT) * 0.6)} L${P(hx + ox + 0.045)},${P(hy - 0.085 + (i === 0 ? browT : -browT) * 0.6)}`} stroke={INK} strokeWidth={0.026} strokeLinecap="round" />
          </g>)}
          {/* nose and mouth */}
          <path d={`M${P(hx + 0.1)},${P(hy + 0.0)} q0.035,0.05 -0.005,0.06`} stroke={INK} strokeWidth={0.014} fill="none" strokeLinecap="round" />
          {L.mustache && <path d={`M${P(hx + 0.0)},${P(hy + 0.09)} q0.045,-0.05 0.09,-0.012 q0.045,-0.04 0.09,0.012 q-0.045,0.035 -0.09,0.0 q-0.045,0.035 -0.09,0 Z`} fill={L.hair} stroke={INK} strokeWidth={0.012} />}
          {talk > 0.15 ? <ellipse cx={hx + 0.09} cy={hy + 0.135} rx={0.035} ry={0.02 + 0.025 * talk} fill="#5a1a22" stroke={INK} strokeWidth={0.012} />
            : <path d={ex === "smile" ? `M${P(hx + 0.05)},${P(hy + 0.12)} q0.04,0.035 0.08,0` : ex === "scared" || ex === "worried" ? `M${P(hx + 0.05)},${P(hy + 0.14)} q0.04,-0.03 0.08,0` : `M${P(hx + 0.055)},${P(hy + 0.13)} L${P(hx + 0.125)},${P(hy + 0.128)}`}
              stroke={INK} strokeWidth={0.016} fill="none" strokeLinecap="round" />}
          {/* hats */}
          {L.hat === "pith" && <g>
            <path d={`M${P(hx - 0.2)},${P(hy - 0.1)} Q${P(hx - 0.2)},${P(hy - 0.4)} ${P(hx + 0.02)},${P(hy - 0.41)} Q${P(hx + 0.24)},${P(hy - 0.4)} ${P(hx + 0.23)},${P(hy - 0.1)} Z`} fill={L.hatCol} stroke={INK} strokeWidth={0.022} />
            <path d={`M${P(hx - 0.2)},${P(hy - 0.15)} L${P(hx + 0.23)},${P(hy - 0.15)} L${P(hx + 0.23)},${P(hy - 0.1)} L${P(hx - 0.2)},${P(hy - 0.1)} Z`} fill={L.band} />
            <path d={`M${P(hx - 0.33)},${P(hy - 0.05)} Q${P(hx)},${P(hy - 0.15)} ${P(hx + 0.37)},${P(hy - 0.05)} Q${P(hx)},${P(hy - 0.08)} ${P(hx - 0.33)},${P(hy - 0.05)} Z`} fill={L.hatCol} stroke={INK} strokeWidth={0.022} strokeLinejoin="round" />
            <path d={`M${P(hx - 0.1)},${P(hy - 0.33)} q0.06,-0.04 0.12,-0.03`} stroke="rgba(255,255,255,0.5)" strokeWidth={0.02} fill="none" strokeLinecap="round" />
          </g>}
          {L.hat === "turban" && <g>
            <path d={`M${P(hx - 0.25)},${P(hy - 0.02)} Q${P(hx - 0.3)},${P(hy - 0.33)} ${P(hx - 0.02)},${P(hy - 0.36)} Q${P(hx + 0.28)},${P(hy - 0.36)} ${P(hx + 0.26)},${P(hy - 0.06)} Q${P(hx)},${P(hy - 0.12)} ${P(hx - 0.25)},${P(hy - 0.02)} Z`} fill={L.hatCol} stroke={INK} strokeWidth={0.022} strokeLinejoin="round" />
            {[0, 1].map((k) => <path key={k} d={`M${P(hx - 0.22 + k * 0.03)},${P(hy - 0.1 - k * 0.1)} Q${P(hx)},${P(hy - 0.22 - k * 0.1)} ${P(hx + 0.24 - k * 0.04)},${P(hy - 0.12 - k * 0.09)}`} stroke={L.band} strokeWidth={0.022} fill="none" strokeLinecap="round" />)}
          </g>}
        </g>
        {/* rifle held across the body */}
        {rifleArm && <g transform={`translate(${P(arms[0].ex)},${P(arms[0].ey)}) rotate(-35)`}>
          <rect x={-0.55} y={-0.025} width={0.75} height={0.035} fill="#3a3436" stroke={INK} strokeWidth={0.012} />
          <path d="M0.2,-0.03 L0.5,-0.04 L0.52,0.05 L0.2,0.03 Z" fill="#7a4a26" stroke={INK} strokeWidth={0.014} />
        </g>}
        {pose.hold === "plank" && <rect x={arms[0].ex - 0.7} y={arms[0].ey - 0.06} width={1.4} height={0.07} fill="#6a4a2a" stroke={INK} strokeWidth={0.014} />}
        {/* near arm on top */}
        {stroke(limbPath(arms[0], SH_X, SH_Y + by), "ar")}
        <circle cx={arms[0].ex} cy={arms[0].ey} r={0.048} fill={L.skin} stroke={INK} strokeWidth={0.018} />
      </g>
    );
  };

export type LionP = { phase?: number; walk?: number; crouch?: number; eyes?: "glow" | "normal" | "narrow"; tail?: number; look?: number; roar?: number };
/** flat lion to match the cast: a lean bean body in tawny flat colour with a darker back, a round head with a pale
 *  muzzle, small round ears, NO mane (Tsavo), stick-ish legs with round paws and a tufted tail. Units: metres, ~2.6 m long. */
export const FlatLion: React.FC<{ x: number; y: number; ppm: number; pose: LionP; flip?: boolean; id: string; shade?: number }> = ({ x, y, ppm, pose, flip = false, id, shade = 1 }) => {
  const w = pose.walk ?? 0, ph = (pose.phase ?? 0) * Math.PI * 2, cr = pose.crouch ?? 0;
  const bodyY = -0.68 + 0.22 * cr + w * 0.015 * Math.sin(ph * 2);
  const legLen = 0.62 - 0.2 * cr;
  const FUR = "#c99550", DARK = "#9c6a34", PALE = "#ecd3a4";
  const legs = [[-0.62, 0], [-0.5, 0.5], [0.5, 0.25], [0.62, 0.75]].map(([lx, o], i) => {
    const s = Math.sin(ph + o * Math.PI * 2), lift = Math.max(0, Math.cos(ph + o * Math.PI * 2));
    const a = 24 * w * s, b = (lx < 0 ? 1 : -1) * (10 + 30 * cr + 28 * w * lift);
    const l = limb(lx, bodyY + 0.12, a, b, legLen * 0.52, legLen * 0.5);
    return { ...l, x0: lx, near: i % 2 === 1 };
  });
  const swish = Math.sin((pose.tail ?? 0) * 2.2) * 0.12;
  const eyes = pose.eyes ?? "normal";
  const hx = 0.95, hy = bodyY - 0.12 + 0.1 * cr;
  const legEl = (l: typeof legs[number], k: number) => (
    <g key={k}>
      <path d={`M${P(l.x0)},${P(bodyY + 0.12)} L${P(l.mx)},${P(l.my)} L${P(l.ex)},${P(l.ey - 0.04)}`} stroke={INK} strokeWidth={0.13} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${P(l.x0)},${P(bodyY + 0.12)} L${P(l.mx)},${P(l.my)} L${P(l.ex)},${P(l.ey - 0.04)}`} stroke={l.near ? FUR : DARK} strokeWidth={0.09} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={l.ex + 0.04} cy={l.ey - 0.04} rx={0.08} ry={0.05} fill={l.near ? FUR : DARK} stroke={INK} strokeWidth={0.022} />
    </g>
  );
  return (
    <g transform={`translate(${P(x)},${P(y)}) scale(${P((flip ? -1 : 1) * ppm)},${P(ppm)})`} style={shade !== 1 ? { filter: `brightness(${shade})` } : undefined}>
      <defs><radialGradient id={`lg${id}`}><stop offset="0" stopColor="#fff6b0" stopOpacity={0.95} /><stop offset="0.4" stopColor="#ffcf3a" stopOpacity={0.5} /><stop offset="1" stopColor="#ffb000" stopOpacity={0} /></radialGradient></defs>
      <ellipse cx={0} cy={0} rx={1.0} ry={0.08} fill="rgba(10,5,10,0.35)" />
      {legs.filter((l) => !l.near).map(legEl)}
      {/* tail */}
      <path d={`M-0.8,${P(bodyY - 0.05)} Q-1.25,${P(bodyY - 0.3 + swish)} -1.35,${P(bodyY + 0.15 + swish)}`} stroke={INK} strokeWidth={0.075} fill="none" strokeLinecap="round" />
      <path d={`M-0.8,${P(bodyY - 0.05)} Q-1.25,${P(bodyY - 0.3 + swish)} -1.35,${P(bodyY + 0.15 + swish)}`} stroke={FUR} strokeWidth={0.04} fill="none" strokeLinecap="round" />
      <ellipse cx={-1.36} cy={bodyY + 0.2 + swish} rx={0.06} ry={0.09} fill="#4a2a18" stroke={INK} strokeWidth={0.02} />
      {/* body */}
      <path d={`M-0.85,${P(bodyY)} C-0.9,${P(bodyY - 0.3)} -0.2,${P(bodyY - 0.3)} 0.1,${P(bodyY - 0.24)} C0.5,${P(bodyY - 0.34)} 0.85,${P(bodyY - 0.3)} 0.82,${P(bodyY)}
        C0.82,${P(bodyY + 0.22)} 0.5,${P(bodyY + 0.26)} 0.2,${P(bodyY + 0.16)} C-0.1,${P(bodyY + 0.22)} -0.8,${P(bodyY + 0.26)} -0.85,${P(bodyY)} Z`} fill={FUR} stroke={INK} strokeWidth={0.03} strokeLinejoin="round" />
      <path d={`M-0.7,${P(bodyY - 0.16)} C-0.3,${P(bodyY - 0.27)} 0.3,${P(bodyY - 0.27)} 0.7,${P(bodyY - 0.18)}`} stroke={DARK} strokeWidth={0.07} fill="none" strokeLinecap="round" opacity={0.7} />
      <path d={`M-0.4,${P(bodyY + 0.14)} Q0.1,${P(bodyY + 0.22)} 0.55,${P(bodyY + 0.14)}`} stroke={PALE} strokeWidth={0.05} fill="none" strokeLinecap="round" opacity={0.7} />
      {legs.filter((l) => l.near).map(legEl)}
      {/* head */}
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(${P(6 * cr - 4 * (pose.roar ?? 0))})`}>
        {[-0.13, 0.08].map((ex, i) => <g key={i}><circle cx={ex} cy={-0.24} r={0.075} fill={FUR} stroke={INK} strokeWidth={0.022} /><circle cx={ex} cy={-0.235} r={0.035} fill="#7a4a2a" /></g>)}
        <circle cx={0} cy={0} r={0.27} fill={FUR} stroke={INK} strokeWidth={0.028} />
        <ellipse cx={0.15} cy={0.09} rx={0.17} ry={0.12} fill={PALE} stroke={INK} strokeWidth={0.022} />
        {(pose.roar ?? 0) > 0.1 && <ellipse cx={0.18} cy={0.2} rx={0.1} ry={0.05 + 0.08 * (pose.roar ?? 0)} fill="#5a1a22" stroke={INK} strokeWidth={0.02} />}
        <path d="M0.2,0.02 L0.32,0.02 L0.26,0.08 Z" fill="#3a2024" stroke={INK} strokeWidth={0.014} strokeLinejoin="round" />
        <path d="M0.26,0.08 v0.04 M0.26,0.12 q-0.05,0.03 -0.09,0 M0.26,0.12 q0.05,0.03 0.09,0" stroke={INK} strokeWidth={0.016} fill="none" strokeLinecap="round" />
        {[0.02, 0.18].map((ex, i) => <g key={i}>
          {eyes === "glow" && <circle cx={ex} cy={-0.07} r={0.13} fill={`url(#lg${id})`} />}
          <ellipse cx={ex} cy={-0.07} rx={0.045} ry={eyes === "narrow" ? 0.022 : 0.04} fill={eyes === "glow" ? "#fff3a0" : "#e8b030"} stroke={INK} strokeWidth={0.014} />
          <ellipse cx={ex + (pose.look ?? 0.4) * 0.012} cy={-0.07} rx={0.011} ry={eyes === "narrow" ? 0.015 : 0.03} fill={INK} />
          <path d={`M${P(ex - 0.06)},${P(-0.13 + (i ? -0.015 : 0.015))} L${P(ex + 0.06)},${P(-0.13 + (i ? 0.02 : -0.02))}`} stroke={INK} strokeWidth={0.03} strokeLinecap="round" />
        </g>)}
      </g>
    </g>
  );
};
