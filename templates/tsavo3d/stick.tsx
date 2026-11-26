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

const H = 1.55, HEAD_R = 0.25, NECK_Y = -0.99, HIP_Y = -0.63, SH_Y = -0.93, SH_X = 0.15, HIP_X = 0.08, UP = 0.22, LO = 0.21, THIGH = 0.32, SHIN = 0.31;
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

/** two-bone IK: root -> target with segment lengths l1, l2; bend = +1 puts the joint forward (+x), -1 backward */
const ik = (rx: number, ry: number, tx: number, ty: number, l1: number, l2: number, bend: number) => {
  const dx = tx - rx, dy = ty - ry, d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, Math.hypot(dx, dy)));
  const a = Math.atan2(dy, dx), off = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const ang = a - bend * off;
  return { jx: rx + Math.cos(ang) * l1, jy: ry + Math.sin(ang) * l1 };
};
/** a tapered limb segment with round ends (filled), drawn as an outline pass then a fill pass */
const taper = (ax: number, ay: number, bx: number, by: number, wa: number, wb: number) => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return `M${P(ax + nx * wa)},${P(ay + ny * wa)} L${P(bx + nx * wb)},${P(by + ny * wb)} A${P(wb)},${P(wb)} 0 0 1 ${P(bx - nx * wb)},${P(by - ny * wb)} L${P(ax - nx * wa)},${P(ay - ny * wa)} A${P(wa)},${P(wa)} 0 0 1 ${P(ax + nx * wa)},${P(ay + ny * wa)} Z`;
};

/** flat lion to match the cast: a side-profile maneless MALE (the Tsavo man-eaters): heavy build, deep chest, thick
 *  neck, big blocky head with a broad muzzle, and a short sparse ruff of mane tufts on the cheeks, neck and throat.
 *  Each leg is one smooth tapered shape (no round joints), planted by IK so the paws stay on the ground.
 *  Units: metres, nose to rump ~2.4 m, ~1.1 m at the shoulder. */
export const FlatLion: React.FC<{ x: number; y: number; ppm: number; pose: LionP; flip?: boolean; id: string; shade?: number }> = ({ x, y, ppm, pose, flip = false, id, shade = 1 }) => {
  const w = pose.walk ?? 0, ph = (pose.phase ?? 0) * Math.PI * 2, cr = pose.crouch ?? 0;
  const FUR = "#c58e4e", DARK = "#94602e", PALE = "#e9cfa0", FAR = "#8a5a2c", RUFF = "#a36a34", RUFF_D = "#6a4020";
  const drop = 0.18 * cr, bob = w * 0.02 * Math.sin(ph * 2);
  const sh = { x: 0.55, y: -1.0 + drop * 0.9 + bob }, hp = { x: -0.62, y: -0.95 + drop + bob };
  const legs = [
    { r: hp, o: 0.0, front: false, near: false }, { r: sh, o: 0.25, front: true, near: false },
    { r: hp, o: 0.5, front: false, near: true }, { r: sh, o: 0.75, front: true, near: true },
  ].map((L) => {
    const u = (((pose.phase ?? 0) + L.o) % 1 + 1) % 1;
    const swing = u > 0.62, k = swing ? (u - 0.62) / 0.38 : u / 0.62;
    const off = w * (swing ? -0.28 + 0.56 * (0.5 - 0.5 * Math.cos(Math.PI * k)) : 0.28 - 0.56 * k);
    const lift = swing ? w * 0.14 * Math.sin(Math.PI * k) : 0;
    const fx = L.r.x + (L.front ? 0.08 : 0.0) + off + (L.near ? 0.05 : -0.05), fy = -lift;
    const l1 = L.front ? 0.47 : 0.48, l2 = 0.46;
    const j = ik(L.r.x, L.r.y + 0.1, fx, fy - 0.07, l1, l2, L.front ? -1 : 1);
    return { ...L, fx, fy, j };
  });
  /** one smooth limb outline: wide at the body, narrowing through the joint to the paw (quadratic through the joint) */
  const limb = (L: typeof legs[number]) => {
    const rx = L.r.x + (L.front ? 0.0 : 0.06), ry = L.r.y + 0.1, fx = L.fx + 0.02, fy = L.fy - 0.07;
    const nrm = (ax: number, ay: number, bx: number, by: number) => { const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const [n1x, n1y] = nrm(rx, ry, L.j.jx, L.j.jy), [n2x, n2y] = nrm(L.j.jx, L.j.jy, fx, fy);
    const nj = [(n1x + n2x) / 2, (n1y + n2y) / 2];
    const wR = L.front ? 0.21 : 0.26, wJ = L.front ? 0.1 : 0.095, wF = L.front ? 0.08 : 0.07;
    return `M${P(rx + n1x * wR)},${P(ry + n1y * wR)} Q${P(L.j.jx + nj[0] * wJ * 1.6)},${P(L.j.jy + nj[1] * wJ * 1.6)} ${P(fx + n2x * wF)},${P(fy + n2y * wF)}
      L${P(fx - n2x * wF)},${P(fy - n2y * wF)} Q${P(L.j.jx - nj[0] * wJ * 1.6)},${P(L.j.jy - nj[1] * wJ * 1.6)} ${P(rx - n1x * wR)},${P(ry - n1y * wR)} Z`;
  };
  const paw = (L: typeof legs[number]) => ({ cx: L.fx + 0.06, cy: L.fy - 0.05 });
  const sil = (ls: typeof legs, col: string, extra: React.ReactNode[] = [], extraFill: React.ReactNode[] = []) => (
    <g>
      {ls.map((L, i) => <g key={`o${i}`} stroke={INK} strokeWidth={0.06} strokeLinejoin="round" fill={INK}>
        <path d={limb(L)} /><ellipse cx={paw(L).cx} cy={paw(L).cy} rx={0.125} ry={0.06} /></g>)}
      {extra}
      {ls.map((L, i) => <g key={`f${i}`} fill={col}><path d={limb(L)} /><ellipse cx={paw(L).cx} cy={paw(L).cy} rx={0.125} ry={0.06} /></g>)}
      {extraFill}
      {ls.map((L, i) => [0.0, 0.06, 0.11].map((t) => <path key={`t${i}${t}`} d={`M${P(paw(L).cx - 0.04 + t)},${P(paw(L).cy + 0.055)} v-0.035`} stroke={INK} strokeWidth={0.013} strokeLinecap="round" />))}
    </g>
  );
  const swish = Math.sin((pose.tail ?? 0) * 2.0) * 0.14;
  const eyes = pose.eyes ?? "normal", roar = pose.roar ?? 0;
  const hx = sh.x + 0.5 + 0.06 * cr, hy = sh.y - 0.16 + 0.26 * cr;
  const by = (v: number) => P(v);
  // heavy body: high shoulders, deep chest, thick neck up to the head, tucked belly, round haunch
  const body = `M${by(hp.x - 0.3)},${by(hp.y + 0.14)}
    C${by(hp.x - 0.34)},${by(hp.y - 0.14)} ${by(hp.x - 0.12)},${by(hp.y - 0.22)} ${by(hp.x + 0.15)},${by(hp.y - 0.16)}
    C${by(hp.x + 0.45)},${by(hp.y - 0.1)} ${by(sh.x - 0.45)},${by(sh.y - 0.1)} ${by(sh.x - 0.12)},${by(sh.y - 0.24)}
    C${by(sh.x + 0.08)},${by(sh.y - 0.3)} ${by(hx - 0.25)},${by(hy - 0.22)} ${by(hx - 0.02)},${by(hy - 0.14)}
    L${by(hx + 0.08)},${by(hy + 0.26)}
    C${by(sh.x + 0.4)},${by(sh.y + 0.3)} ${by(sh.x + 0.32)},${by(sh.y + 0.5)} ${by(sh.x + 0.05)},${by(sh.y + 0.52)}
    C${by(sh.x - 0.3)},${by(sh.y + 0.52)} ${by(hp.x + 0.55)},${by(hp.y + 0.3)} ${by(hp.x + 0.28)},${by(hp.y + 0.34)}
    C${by(hp.x + 0.05)},${by(hp.y + 0.44)} ${by(hp.x - 0.24)},${by(hp.y + 0.38)} ${by(hp.x - 0.3)},${by(hp.y + 0.14)} Z`;
  const tb = { x: hp.x - 0.28, y: hp.y - 0.04 };
  const tail = `M${P(tb.x)},${P(tb.y)} C${P(tb.x - 0.35)},${P(tb.y + 0.05)} ${P(tb.x - 0.45)},${P(tb.y + 0.45 + swish)} ${P(tb.x - 0.62)},${P(tb.y + 0.52 + swish * 1.4)}`;
  // sparse mane ruff: a ragged collar of short tufts behind the cheek, down the neck and under the throat
  const ruff = (() => {
    const pts: string[] = [];
    const n = 23;
    for (let i = 0; i <= n; i++) {
      const a = (-120 + (i / n) * 215) * Math.PI / 180;
      const r = i % 2 === 0 ? 1.0 : 0.87 + 0.04 * Math.sin(i * 2.3);
      pts.push(`${P(-0.08 + Math.cos(Math.PI - a) * 0.3 * r)},${P(0.06 + Math.sin(a) * 0.33 * r * (a > 0 ? 1.1 : 1))}`);
    }
    return `M${pts.join(" L")} L0.05,0.12 L-0.05,-0.12 Z`;
  })();
  return (
    <g transform={`translate(${P(x)},${P(y)}) scale(${P((flip ? -1 : 1) * ppm)},${P(ppm)})`} style={shade !== 1 ? { filter: `brightness(${shade})` } : undefined}>
      <defs>
        <linearGradient id={`lb${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ae7a3e" /><stop offset="0.3" stopColor={FUR} /><stop offset="0.78" stopColor={FUR} /><stop offset="1" stopColor={PALE} /></linearGradient>
        <radialGradient id={`lg${id}`}><stop offset="0" stopColor="#fff6b0" stopOpacity={0.95} /><stop offset="0.4" stopColor="#ffcf3a" stopOpacity={0.5} /><stop offset="1" stopColor="#ffb000" stopOpacity={0} /></radialGradient>
      </defs>
      <ellipse cx={0} cy={0} rx={1.1} ry={0.075} fill="rgba(10,5,10,0.35)" />
      {sil(legs.filter((l) => !l.near), FAR)}
      <path d={tail} stroke={INK} strokeWidth={0.08} fill="none" strokeLinecap="round" />
      <path d={tail} stroke={FUR} strokeWidth={0.045} fill="none" strokeLinecap="round" />
      <ellipse cx={tb.x - 0.64} cy={tb.y + 0.58 + swish * 1.4} rx={0.075} ry={0.11} transform={`rotate(${P(20 + swish * 60)},${P(tb.x - 0.64)},${P(tb.y + 0.58 + swish * 1.4)})`} fill="#3e2214" stroke={INK} strokeWidth={0.022} />
      {sil(legs.filter((l) => l.near), FUR,
        [<path key="bo" d={body} fill={INK} stroke={INK} strokeWidth={0.064} strokeLinejoin="round" />],
        [<path key="bf" d={body} fill={`url(#lb${id})`} />])}
      {/* muscle lines: shoulder blade, haunch, a darker line along the back */}
      <path d={`M${P(sh.x - 0.14)},${P(sh.y - 0.12)} q0.1,0.22 0.0,0.44`} stroke={DARK} strokeWidth={0.026} fill="none" strokeLinecap="round" opacity={0.6} />
      <path d={`M${P(hp.x + 0.2)},${P(hp.y - 0.1)} q-0.16,0.2 -0.02,0.44`} stroke={DARK} strokeWidth={0.026} fill="none" strokeLinecap="round" opacity={0.6} />
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(${P(6 * cr - 10 * roar)}) scale(1.3,1.32)`}>
        {/* the ruff, behind the head */}
        <path d={ruff} fill={RUFF} stroke={INK} strokeWidth={0.022} strokeLinejoin="round" />
        {[[-0.26, -0.02, -0.33, 0.06], [-0.22, 0.12, -0.3, 0.2], [-0.12, 0.24, -0.16, 0.32], [-0.2, -0.14, -0.28, -0.1]].map(([a, b, c, d], i) =>
          <path key={i} d={`M${a},${b} L${c},${d}`} stroke={RUFF_D} strokeWidth={0.02} strokeLinecap="round" />)}
        {/* ear: small, round, dark backed */}
        <ellipse cx={-0.06} cy={-0.18} rx={0.06} ry={0.068} fill={RUFF_D} stroke={INK} strokeWidth={0.022} />
        <ellipse cx={-0.05} cy={-0.17} rx={0.028} ry={0.036} fill="#a87a4a" />
        {/* skull + broad, deep muzzle + heavy chin */}
        <path d={`M-0.15,0.03 C-0.17,-0.14 0.0,-0.2 0.14,-0.16 C0.23,-0.13 0.28,-0.08 0.37,-0.07 C0.44,-0.06 0.46,0.01 0.45,0.08
          C0.44,${P(0.14 + 0.02 * roar)} 0.38,${P(0.16 + 0.02 * roar)} 0.31,${P(0.16 + 0.02 * roar)} L0.31,${P(0.18 + 0.12 * roar)} C0.22,${P(0.24 + 0.12 * roar)} 0.06,${P(0.24 + 0.1 * roar)} 0.0,${P(0.19 + 0.06 * roar)}
          C-0.1,0.18 -0.15,0.12 -0.15,0.03 Z`} fill={FUR} stroke={INK} strokeWidth={0.026} strokeLinejoin="round" />
        {/* cheek tufts (part of the sparse mane) */}
        <path d="M-0.1,0.0 L-0.17,0.05 L-0.1,0.08 L-0.16,0.13 L-0.07,0.13 L-0.1,0.19 L0.0,0.16" fill={RUFF} stroke={INK} strokeWidth={0.016} strokeLinejoin="round" />
        <path d="M0.2,0.02 C0.29,-0.01 0.4,0.0 0.44,0.07 C0.4,0.14 0.27,0.15 0.18,0.11 Z" fill={PALE} />
        <path d="M0.04,0.17 C0.1,0.22 0.22,0.22 0.29,0.18" stroke={PALE} strokeWidth={0.045} fill="none" strokeLinecap="round" />
        {roar > 0.1 && <path d={`M0.31,0.16 L0.12,${P(0.17 + 0.06 * roar)} L0.31,${P(0.18 + 0.12 * roar)} Z`} fill="#5a1a22" stroke={INK} strokeWidth={0.016} />}
        {/* nose bridge, broad dark nose, mouth line, whisker dots */}
        <path d="M0.16,-0.1 Q0.3,-0.08 0.4,-0.05" stroke={DARK} strokeWidth={0.02} fill="none" strokeLinecap="round" opacity={0.7} />
        <path d="M0.4,-0.06 Q0.47,-0.04 0.46,0.03 Q0.41,0.05 0.38,0.0 Z" fill="#2e1a1c" stroke={INK} strokeWidth={0.014} strokeLinejoin="round" />
        <path d="M0.44,0.06 Q0.41,0.12 0.34,0.13" stroke={INK} strokeWidth={0.014} fill="none" strokeLinecap="round" />
        {[0, 1, 2, 3].map((i) => <circle key={i} cx={0.27 + i * 0.03} cy={0.06 + (i % 2) * 0.02} r={0.006} fill="#5a3a2a" />)}
        {/* eye: small, set deep under a heavy brow, with the dark tear line */}
        {eyes === "glow" && <circle cx={0.15} cy={-0.07} r={0.14} fill={`url(#lg${id})`} />}
        <path d={`M0.11,-0.07 Q0.15,${eyes === "narrow" ? -0.09 : -0.1} 0.19,-0.074 Q0.15,${eyes === "narrow" ? -0.058 : -0.05} 0.11,-0.07 Z`} fill={eyes === "glow" ? "#fff3a0" : "#d9a030"} stroke={INK} strokeWidth={0.013} />
        <ellipse cx={0.155 + (pose.look ?? 0.4) * 0.006} cy={-0.073} rx={0.008} ry={eyes === "narrow" ? 0.01 : 0.017} fill={INK} />
        <path d="M0.07,-0.12 Q0.15,-0.15 0.23,-0.1" stroke={INK} strokeWidth={0.036} fill="none" strokeLinecap="round" />
        <path d="M0.19,-0.05 Q0.24,0.0 0.28,0.03" stroke={DARK} strokeWidth={0.016} fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
};
