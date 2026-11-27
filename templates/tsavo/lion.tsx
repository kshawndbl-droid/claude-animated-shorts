// A maneless Tsavo lion drawn in the v2 cast style (ink outlines, flat fills with a soft gradient, a big readable head).
// Units: feet on y = 0, body ~300 long, head on the +x side; flip faces left. Stance-driven four-legged walk (no sliding
// when the caller moves x by the walker's distance), crouch / stalk, pounce stretch, roar, glowing night eyes,
// a swishing tail and a lying-down pose.
import React from "react";

const INK = "#2a2230";
const FUR = "#c9934e", FUR_D = "#a5733a", FUR_L = "#e8c48e", MUZ = "#ead0a2";
const rad = (d: number) => (d * Math.PI) / 180;
const P = (n: number) => n.toFixed(1);

export type LionPose = {
  phase?: number;   // walk cycle 0..1
  walk?: number;    // 0 standing .. 1 walking
  crouch?: number;  // 0 upright .. 1 low stalking crouch
  pounce?: number;  // 0 .. 1 stretched leap
  roar?: number;    // mouth open 0..1
  eyes?: "normal" | "glow" | "narrow" | "closed";
  lookX?: number; lookY?: number;
  tail?: number;    // time for the tail swish
  headTurn?: number; // -1 .. 1 (turn toward camera)
  lie?: number;     // 0 .. 1 lying on its side (dead / asleep)
};

const seg = (ax: number, ay: number, bx: number, by: number, wa: number, wb: number, fill: string, o: number, k: string) => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, A = wa + o, B = wb + o;
  return (
    <g key={k}>
      <path d={`M${P(ax + nx * A)},${P(ay + ny * A)} L${P(bx + nx * B)},${P(by + ny * B)} L${P(bx - nx * B)},${P(by - ny * B)} L${P(ax - nx * A)},${P(ay - ny * A)} Z`} fill={fill} />
      <circle cx={ax} cy={ay} r={A} fill={fill} /><circle cx={bx} cy={by} r={B} fill={fill} />
    </g>
  );
};

/** leg: hip (hx, hy) to paw on the ground; ang swings the paw forward (+) or back; lift raises it; knee bends backward for
 *  hind legs and forward for front legs */
const leg = (hx: number, hy: number, ang: number, lift: number, front: boolean, near: boolean, k: string, crouch: number) => {
  const len = 150 - 40 * crouch;
  const fx = hx + Math.sin(rad(ang)) * len, fy = hy + Math.cos(rad(ang)) * len - lift;
  const footY = fy;
  const mx = (hx + fx) / 2 + (front ? 10 : -16) * (1 + crouch), my = (hy + footY) / 2;
  const col = near ? FUR : FUR_D;
  return (
    <g key={k}>
      {seg(hx, hy, mx, my, front ? 22 : 28, 15, INK, 4.5, "a")}{seg(mx, my, fx, footY - 10, 15, 12, INK, 4.5, "b")}
      {seg(hx, hy, mx, my, front ? 22 : 28, 15, col, 0, "c")}{seg(mx, my, fx, footY - 10, 15, 12, col, 0, "d")}
      <ellipse cx={fx + 8} cy={footY - 9} rx={21} ry={12} fill={col} stroke={INK} strokeWidth={4.5} />
      {[0, 1, 2].map((i) => <path key={i} d={`M${P(fx + i * 8)},${P(footY - 3)} l2,-7`} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />)}
    </g>
  );
};

export const Lion: React.FC<{ x: number; y: number; s: number; flip?: boolean; pose: LionPose; id: string }> = ({ x, y, s, flip = false, pose, id }) => {
  const walk = pose.walk ?? 0, ph = pose.phase ?? 0, cr = pose.crouch ?? 0, pn = pose.pounce ?? 0, roar = pose.roar ?? 0, lie = pose.lie ?? 0;
  const T = pose.tail ?? 0;
  // four-beat walk: each leg has its own phase offset; stance moves the paw back, swing lifts it forward
  const legPh = [0, 0.5, 0.25, 0.75];
  const legs = legPh.map((o) => {
    const u = (((ph + o) % 1) + 1) % 1;
    if (u < 0.6) { const k = u / 0.6; return { ang: (22 - 44 * k) * walk, lift: 0 }; }
    const k = (u - 0.6) / 0.4; return { ang: (-22 + 44 * (0.5 - 0.5 * Math.cos(Math.PI * k))) * walk, lift: Math.sin(Math.PI * k) * 22 * walk };
  });
  const bob = walk * 4 * Math.sin(ph * Math.PI * 4);
  const bodyY = -185 + 56 * cr + bob - 20 * pn;
  const hipX = -105 - 20 * pn, shX = 78 + 30 * pn;
  // leap: legs stretch fore and aft
  const pl = (i: number) => pn > 0 ? { ang: (i < 2 ? -55 : 70) * pn, lift: 20 * pn } : legs[i];
  const headX = shX + 78 + 20 * pn, headY = bodyY - 42 + 40 * cr - 10 * (pose.lookY ?? 0) * -1;
  const turn = pose.headTurn ?? 0;
  const lx = (pose.lookX ?? 0.6) * 5, ly = (pose.lookY ?? 0) * 4;
  const eyes = pose.eyes ?? "normal";
  const swish = Math.sin(T * 2.2) * 26 + Math.sin(T * 5.1) * 8;
  // deep chest, tucked waist, strong haunches
  const body = `M${P(hipX - 34)},${P(bodyY + 10)} C${P(hipX - 44)},${P(bodyY - 50)} ${P(hipX + 40)},${P(bodyY - 52)} ${P((hipX + shX) / 2)},${P(bodyY - 40)}
    C${P(shX - 20)},${P(bodyY - 62)} ${P(shX + 40)},${P(bodyY - 66)} ${P(shX + 50)},${P(bodyY - 24)}
    C${P(shX + 60)},${P(bodyY + 30)} ${P(shX + 40)},${P(bodyY + 92)} ${P(shX - 10)},${P(bodyY + 88)}
    C${P(shX - 50)},${P(bodyY + 84)} ${P((hipX + shX) / 2)},${P(bodyY + 44)} ${P(hipX + 10)},${P(bodyY + 58)}
    C${P(hipX - 20)},${P(bodyY + 66)} ${P(hipX - 30)},${P(bodyY + 40)} ${P(hipX - 34)},${P(bodyY + 10)} Z`;
  const fl = flip ? -1 : 1;
  const tailBase = { x: hipX - 32, y: bodyY - 2 };
  const tailEnd = { x: hipX - 120, y: bodyY + 20 + swish };
  const tail = `M${P(tailBase.x)},${P(tailBase.y)} Q${P(hipX - 90)},${P(bodyY - 40 - swish * 0.4)} ${P(tailEnd.x)},${P(tailEnd.y)}`;
  const jaw = roar * 34;
  const lieRot = -lie * 0; // lying handled by a squash below
  return (
    <g transform={`translate(${P(x)},${P(y)}) scale(${P(fl * s)},${P(s)})`}>
      <defs>
        <linearGradient id={`lb${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={FUR_L} /><stop offset="0.55" stopColor={FUR} /><stop offset="1" stopColor={FUR_D} /></linearGradient>
        <radialGradient id={`lh${id}`} cx="0.42" cy="0.35" r="0.75"><stop offset="0" stopColor={FUR_L} /><stop offset="0.65" stopColor={FUR} /><stop offset="1" stopColor={FUR_D} /></radialGradient>
        <radialGradient id={`le${id}`}><stop offset="0" stopColor="#fff6b0" stopOpacity={0.95} /><stop offset="0.4" stopColor="#ffd040" stopOpacity={0.5} /><stop offset="1" stopColor="#ffb000" stopOpacity={0} /></radialGradient>
      </defs>
      {lie <= 0.01 && <ellipse cx={-10} cy={2} rx={170 + 40 * pn} ry={16} fill="rgba(20,12,20,0.3)" opacity={1 - pn} />}
      <g transform={lie > 0 ? `translate(0,${P(70 * lie)}) scale(1,${P(1 - 0.45 * lie)})` : pn > 0 ? `translate(0,${P(-90 * pn)}) rotate(${P(-10 * pn)})` : undefined}>
        {/* far legs */}
        {leg(hipX + 6, bodyY + 40, pl(1).ang, pl(1).lift, false, false, "l1", cr)}
        {leg(shX - 8, bodyY + 36, pl(3).ang, pl(3).lift, true, false, "l3", cr)}
        {/* tail */}
        <path d={tail} fill="none" stroke={INK} strokeWidth={17} strokeLinecap="round" />
        <path d={tail} fill="none" stroke={FUR} strokeWidth={9} strokeLinecap="round" />
        <ellipse cx={tailEnd.x} cy={tailEnd.y} rx={14} ry={20} transform={`rotate(${P(30 + swish)},${P(tailEnd.x)},${P(tailEnd.y)})`} fill="#4a2e1e" stroke={INK} strokeWidth={4} />
        {/* body */}
        <path d={body} fill={`url(#lb${id})`} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <path d={`M${P(hipX + 10)},${P(bodyY + 58)} Q${P((hipX + shX) / 2)},${P(bodyY + 72)} ${P(shX - 10)},${P(bodyY + 56)}`} fill="none" stroke={MUZ} strokeWidth={10} opacity={0.6} />
        <path d={`M${P(hipX - 6)},${P(bodyY - 20)} q22,-8 40,4 M${P(hipX + 30)},${P(bodyY - 34)} q20,-6 34,6`} stroke={FUR_D} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.7} />
        {/* near legs */}
        {leg(hipX + 20, bodyY + 44, pl(0).ang, pl(0).lift, false, true, "l0", cr)}
        {leg(shX + 6, bodyY + 40, pl(2).ang, pl(2).lift, true, true, "l2", cr)}
        {/* head */}
        <g transform={`translate(${P(headX)},${P(headY)}) scale(1.28) rotate(${P(-8 * pn + 6 * roar - 4 * (pose.lookY ?? 0))})`}>
          {/* neck ruff: maneless, only a thin fringe of darker fur */}
          <path d="M-60,-30 Q-80,10 -50,52 L-20,40 Q-40,0 -30,-36 Z" fill={FUR_D} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          {/* ears */}
          {[-1, 1].map((sd) => <g key={sd} transform={`translate(${P(-24 + sd * 24 - turn * 6)},-58)`}>
            <ellipse rx={15} ry={13} fill={FUR} stroke={INK} strokeWidth={5} /><ellipse rx={7} ry={6} cy={2} fill="#8a5a3a" /></g>)}
          {/* skull */}
          <path d="M-58,-8 C-60,-62 40,-74 62,-26 C74,0 70,30 52,44 C30,62 -40,60 -54,30 Z" fill={`url(#lh${id})`} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          {/* muzzle and lower jaw */}
          <g transform={`translate(${P(34 + turn * 6)},18)`}>
            <path d={`M-34,10 Q-30,${P(40 + jaw)} 8,${P(44 + jaw)} Q36,${P(40 + jaw)} 40,10 Z`} fill={MUZ} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
            {roar > 0.05 && <path d={`M-22,18 Q8,${P(30 + jaw)} 30,18 Z`} fill="#6a1e2a" stroke={INK} strokeWidth={3.5} />}
            {roar > 0.05 && [-14, 22].map((tx) => <path key={tx} d={`M${tx},14 l5,${P(8 + jaw * 0.25)} l5,${P(-8 - jaw * 0.25)} Z`} fill="#fffaf0" stroke={INK} strokeWidth={2} />)}
            <ellipse cx={10} cy={-2} rx={40} ry={22} fill={MUZ} stroke={INK} strokeWidth={5} />
            <path d="M-6,-14 L16,-14 L5,-2 Z" fill="#3a2026" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            <path d="M5,-2 v8 M5,6 q-9,6 -16,0 M5,6 q9,6 16,0" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
            {[-1, 1].map((sd) => [0, 1, 2].map((i) => <circle key={`${sd}${i}`} cx={5 + sd * (12 + i * 6)} cy={2 + i * 3} r={1.8} fill="#6a4a3a" />))}
          </g>
          {/* eyes: amber with slit pupils; at night they glow */}
          {[-1, 1].map((sd) => {
            const ex = 14 + sd * 22 + turn * 8, ey = -16;
            return <g key={`e${sd}`}>
              {eyes === "glow" && <circle cx={ex} cy={ey} r={34} fill={`url(#le${id})`} />}
              {eyes === "closed" ? <path d={`M${ex - 11},${ey + 2} q11,6 22,0`} fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" /> : <g>
                <ellipse cx={ex} cy={ey} rx={11} ry={eyes === "narrow" ? 5 : 9.5} fill={eyes === "glow" ? "#fff3a0" : "#e8b030"} stroke={INK} strokeWidth={4} />
                <ellipse cx={ex + lx * 0.5} cy={ey + ly * 0.4} rx={2.6} ry={eyes === "narrow" ? 3.5 : 7} fill={INK} />
              </g>}
              {/* heavy brow: menacing */}
              <path d={`M${ex - 15},${ey - 13 + (sd > 0 ? -3 : 3)} L${ex + 13},${ey - 13 + (sd > 0 ? 4 : -4)}`} stroke={INK} strokeWidth={6} strokeLinecap="round" transform={`scale(1,1)`} />
            </g>;
          })}
        </g>
      </g>
    </g>
  );
};

/** a four-legged walker: distance covered for a stance-driven walk (same idea as the people's walker) */
export const lionWalker = (T: number, a: number, b: number, stride = 150, rate = 0.55) => {
  const t = Math.max(0, Math.min(T, b) - a), on = T >= a && T <= b ? 1 : 0;
  return { phase: t * rate, walk: on, dist: t * rate * stride };
};
