// The Ahuizotl, creature design sheet v1 (1080x1920 still): (1) full body side view, (2) the jumpscare face with the
// mouth stretched open, (3) the tail-hand grabbing a wrist, (4) how it lurks: only the eyes above dark water in the reeds.
import React from "react";
import { AbsoluteFill } from "remotion";
import { AHZ, AhzDefs, AhzFace, AhzSide, Drip, GlowEye, HumanHand, Rimmed, V, furPath, rnd, smooth, tube, add, pt, polyD } from "./creature";

const SERIF = "Georgia, 'Times New Roman', serif";
const CREAM = "#e9e2d6";
const MUTED = "#8f9ab0";

/** moonlit night: sky gradient, a moon with halo, distant tree line */
const Night: React.FC<{ x: number; y: number; w: number; h: number; moon: V; id: string; horizon: number }> = ({ x, y, w, h, moon, id, horizon }) => <g>
  <defs>
    <linearGradient id={id + "sky"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d1a2e" /><stop offset="0.7" stopColor="#081221" /><stop offset="1" stopColor="#0b1626" /></linearGradient>
    <radialGradient id={id + "halo"} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#cfe0ff" stopOpacity={0.45} /><stop offset="0.25" stopColor="#7d9ccc" stopOpacity={0.16} /><stop offset="1" stopColor="#7d9ccc" stopOpacity={0} /></radialGradient>
  </defs>
  <rect x={x} y={y} width={w} height={h} fill={`url(#${id}sky)`} />
  <circle cx={moon[0]} cy={moon[1]} r={260} fill={`url(#${id}halo)`} />
  <circle cx={moon[0]} cy={moon[1]} r={34} fill="#eef3ff" />
  <circle cx={moon[0] + 9} cy={moon[1] - 6} r={8} fill="#d3dcef" /><circle cx={moon[0] - 12} cy={moon[1] + 10} r={5} fill="#d3dcef" />
  {/* far shore: hills and trees, flat dark shapes */}
  <path d={`M${x},${horizon} ` + Array.from({ length: 28 }, (_, i) => `L${x + (i * w) / 27},${horizon - 30 - 34 * rnd(i + horizon) - 20 * Math.sin(i * 0.7)}`).join(" ") + ` L${x + w},${horizon} Z`} fill="#0a1424" />
  <path d={`M${x},${horizon} ` + Array.from({ length: 40 }, (_, i) => `L${x + (i * w) / 39},${horizon - 10 - 16 * rnd(i * 3 + 7)}`).join(" ") + ` L${x + w},${horizon} Z`} fill="#060c17" />
</g>;

/** still dark water with moon streaks */
const Water: React.FC<{ x: number; y: number; w: number; h: number; moonX: number; id: string }> = ({ x, y, w, h, moonX, id }) => <g>
  <defs><linearGradient id={id + "w"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0e1c30" /><stop offset="1" stopColor="#03070d" /></linearGradient></defs>
  <rect x={x} y={y} width={w} height={h} fill={`url(#${id}w)`} />
  {Array.from({ length: 18 }, (_, i) => { const yy = y + 6 + i * i * (h / 340) + i * 3, ww = 70 - i * 2.5 + 40 * rnd(i);
    return <path key={i} d={`M${moonX - ww / 2 + 30 * (rnd(i + 4) - 0.5)},${yy} l${ww},0`} stroke="#c8d8f4" strokeWidth={2 + i * 0.12} opacity={0.5 - i * 0.022} strokeLinecap="round" />; })}
</g>;

/** a reed bed: tall blades and cattails, black silhouettes with a thin moonlit edge */
const Reeds: React.FC<{ x0: number; x1: number; base: number; top: number; seed: number; n: number; tone?: string; rim?: number }> = ({ x0, x1, base, top, seed, n, tone = "#03060b", rim = 0.5 }) => <g>
  {Array.from({ length: n }, (_, i) => {
    const bx = x0 + (x1 - x0) * rnd(seed + i * 1.3), h = (base - top) * (0.55 + 0.45 * rnd(seed + i * 2.1)), lean = (rnd(seed + i * 5.3) - 0.5) * 70;
    const tip: V = [bx + lean, base - h], c: V = [bx + lean * 0.2, base - h * 0.55], wd = 3 + 4 * rnd(seed + i);
    const d = `M${bx - wd},${base} Q${pt(add(c, [-wd * 0.6, 0]))} ${pt(tip)} Q${pt(add(c, [wd * 0.6, 0]))} ${bx + wd},${base} Z`;
    const cat = rnd(seed + i * 9.1) > 0.72;
    return <g key={i}>
      <path d={d} fill={tone} />
      <path d={`M${bx + wd * 0.7},${base} Q${pt(add(c, [wd * 0.6, 0]))} ${pt(tip)}`} stroke={AHZ.rim} strokeWidth={1} fill="none" opacity={rim * (0.4 + 0.6 * rnd(seed + i))} />
      {cat && <ellipse cx={c[0] + (tip[0] - c[0]) * 0.55} cy={c[1] + (tip[1] - c[1]) * 0.55} rx={6} ry={22} fill="#120c0a" transform={`rotate(${lean * 0.25},${c[0] + (tip[0] - c[0]) * 0.55},${c[1] + (tip[1] - c[1]) * 0.55})`} />}
    </g>;
  })}
</g>;

const Panel: React.FC<{ x: number; y: number; w: number; h: number; n: number; title: string; note: string; id: string; children: React.ReactNode }> = ({ x, y, w, h, n, title, note, id, children }) => <g>
  <clipPath id={id}><rect x={x} y={y} width={w} height={h} rx={14} /></clipPath>
  <g clipPath={`url(#${id})`}>{children}</g>
  <rect x={x} y={y} width={w} height={h} rx={14} fill="none" stroke="#2c3a52" strokeWidth={3} />
  <rect x={x + 14} y={y + 14} width={42} height={42} rx={21} fill="#e9e2d6" />
  <text x={x + 35} y={y + 45} fontFamily={SERIF} fontSize={28} fontWeight={700} fill="#0a0e16" textAnchor="middle">{n}</text>
  <text x={x + 68} y={y + 44} fontFamily={SERIF} fontSize={27} fontWeight={700} fill={CREAM} style={{ paintOrder: "stroke" }} stroke="#000" strokeWidth={5}>{title}</text>
  <text x={x + 18} y={y + h - 16} fontFamily={SERIF} fontSize={20} fontStyle="italic" fill={MUTED} style={{ paintOrder: "stroke" }} stroke="#000" strokeWidth={4}>{note}</text>
</g>;

/** a label (one or more lines) with a thin leader line from `from` (the label's anchor point) to `to` */
const Callout: React.FC<{ at: V; from: V; to: V; text: string[]; anchor?: "start" | "end" | "middle" }> = ({ at, from, to, text, anchor = "start" }) => <g>
  <path d={`M${pt(from)} L${pt(to)}`} stroke={CREAM} strokeWidth={1.5} opacity={0.7} />
  <circle cx={to[0]} cy={to[1]} r={4} fill={CREAM} stroke="#000" strokeWidth={1.5} />
  {text.map((t, i) => <text key={i} x={at[0]} y={at[1] + i * 25} fontFamily={SERIF} fontSize={21} fill={CREAM} textAnchor={anchor} style={{ paintOrder: "stroke" }} stroke="#000" strokeWidth={4}>{t}</text>)}
</g>;

/* panel 3: the tail-hand around a wrist */
const GrabPanel: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => {
  const W = (px: number, py: number): V => [x + px, y + py + 40];
  // the fisherman's forearm, from his sleeve at the left to his hand at the right
  const armC: V[] = [W(-40, 222), W(150, 238), W(320, 256)];
  const arm = tube(armC, (u) => 120 - 30 * u, 10);
  // the tail rises out of the water behind his arm, arches over it, and the hand comes down on his wrist from above
  const tailC: V[] = [W(350, h + 40), W(330, 330), W(336, 200), W(326, 106), W(282, 72), W(232, 86)];
  const tailS = smooth(tailC, 10);
  const tailPoly = tube(tailC, (u) => 60 - 26 * u, 10);
  const sweep = (p: V): V => { let bi = 0, bd = 1e9; tailS.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; bi = i; } }); const a = tailS[Math.max(0, bi - 1)], b = tailS[Math.min(tailS.length - 1, bi + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const grip = { p: W(222, 92), ang: 102, s: 1.2, spread: 0.2, curl: [0.12, 0.1, 0.12, 0.16], fingerLen: 1.5, nailLen: 1.7, thumb: false };
  return <g>
    <Night x={x} y={y} w={w} h={h} moon={W(w - 70, 80)} id="g3" horizon={y + 170} />
    <Water x={x} y={y + 170} w={w} h={h - 170} moonX={x + w - 70} id="g3" />
    <Reeds x0={x - 20} x1={x + w + 20} base={y + 186} top={y + 80} seed={31} n={40} tone="#050a12" rim={0.3} />
    {[0, 1, 2].map((k) => <ellipse key={k} cx={x + 350} cy={y + h - 30} rx={60 + k * 46} ry={12 + k * 8} fill="none" stroke="#9fb6dc" strokeWidth={2} opacity={0.45 - k * 0.12} />)}
    <Rimmed d={furPath(tailPoly, { len: 14, sweep, seed: 77, lay: 0.4 })} fill="url(#ahzFurSide)" />
    {/* his forearm and sleeve */}
    <Rimmed d={polyD(arm)} fill="#7a5a4a" rim="#b39482" off={[-2, 5]} ink={5} rimOpacity={1} />
    <path d={`M${pt(W(30, 278))} Q${pt(W(180, 294))} ${pt(W(300, 296))}`} stroke="#4c362e" strokeWidth={16} opacity={0.4} fill="none" strokeLinecap="round" />
    <HumanHand p={W(306, 254)} ang={10} s={1} spread={1} curl={[0.2, 0.1, 0.16, 0.26]} skin="#86655a" lo="#563d34" nail="#cdbcae" nailLen={0.1} fingerLen={1} line="#1c1210" />
    <path d={`M${pt(W(-20, 140))} L${pt(W(80, 154))} Q${pt(W(92, 226))} ${pt(W(72, 304))} L${pt(W(-30, 304))} Z`} fill="#c9c0ae" stroke="#1c1210" strokeWidth={4} />
    <path d={`M${pt(W(78, 158))} Q${pt(W(88, 228))} ${pt(W(70, 300))}`} stroke="#8d8576" strokeWidth={6} fill="none" />
    {/* the pale hand: shadow on his skin, then the hand, long fingers clamped down across his wrist */}
    <g opacity={0.45} transform="translate(-5,8)"><HumanHand {...grip} p={grip.p as V} skin="#20140f" lo="#20140f" nail="#20140f" line="#20140f" /></g>
    <HumanHand {...grip} p={grip.p as V} />
    <Rimmed d={furPath(tube([W(248, 80), W(216, 94)], () => 42, 4), { len: 16, sweep: [-0.6, 0.6], seed: 9 })} fill="url(#ahzFurSide)" />
    <Drip p={W(160, 322)} t={0} phase={0.8} fall={60} s={1.4} />
    <Drip p={W(196, 318)} t={0} phase={0.3} fall={60} s={1.3} />
    <Drip p={W(300, 140)} t={0} phase={0.6} fall={60} s={1.2} />
  </g>;
};

/* panel 4: only the eyes, above dark water among reeds */
const LurkPanel: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => {
  const wl = y + 270, ex = x + 250;
  return <g>
    <Night x={x} y={y} w={w} h={h} moon={[x + w - 90, y + 110]} id="g4" horizon={y + 160} />
    <Water x={x} y={y + 160} w={w} h={h - 160} moonX={x + w - 90} id="g4" />
    <Reeds x0={x - 30} x1={x + w + 30} base={y + 176} top={y + 40} seed={51} n={50} tone="#040910" rim={0.25} />
    {/* the head top, only a moonlit edge above the waterline, ear tips */}
    <path d={`M${ex - 80},${wl} Q${ex - 78},${wl - 46} ${ex},${wl - 52} Q${ex + 78},${wl - 46} ${ex + 80},${wl} Z`} fill="#020407" />
    <path d={`M${ex + 30},${wl - 49} Q${ex + 70},${wl - 40} ${ex + 78},${wl - 8}`} stroke={AHZ.rim} strokeWidth={2} fill="none" opacity={0.7} />
    {[-1, 1].map((sd) => <path key={sd} d={`M${ex + sd * 34},${wl - 44} L${ex + sd * 60},${wl - 118} L${ex + sd * 70},${wl - 34} Z`} fill="#020407" stroke={sd > 0 ? AHZ.rim : "none"} strokeWidth={1.2} strokeOpacity={0.6} />)}
    <GlowEye c={[ex - 34, wl - 18]} r={11} look={[0.2, 0.2]} glow={1.3} />
    <GlowEye c={[ex + 34, wl - 18]} r={11} look={[0.2, 0.2]} glow={1.3} />
    {/* reflection, broken by ripples */}
    {[-34, 34].map((dx) => [0, 1, 2, 3].map((k) => <path key={dx + "r" + k} d={`M${ex + dx - 12 + k * 2},${wl + 14 + k * 10} l${20 - k * 3},0`} stroke={AHZ.eye} strokeWidth={4 - k * 0.7} opacity={0.55 - k * 0.12} strokeLinecap="round" />))}
    {[0, 1, 2, 3].map((k) => <ellipse key={k} cx={ex} cy={wl + 2} rx={100 + k * 52} ry={8 + k * 6} fill="none" stroke="#8aa4cc" strokeWidth={1.6} opacity={0.4 - k * 0.08} />)}
    {/* foreground reeds in front, darker */}
    <Reeds x0={x - 20} x1={x + 150} base={y + h} top={y + 120} seed={71} n={14} tone="#010204" rim={0.35} />
    <Reeds x0={x + w - 170} x1={x + w + 20} base={y + h} top={y + 90} seed={91} n={16} tone="#010204" rim={0.35} />
    {/* the tail-hand's fingers break the surface nearby */}
    <clipPath id="lurkhand"><rect x={x} y={y} width={w} height={wl + 96 - y} /></clipPath>
    <g clipPath="url(#lurkhand)"><HumanHand p={[x + 380, wl + 150]} ang={-84} s={0.62} spread={0.5} curl={[0.5, 0.45, 0.5, 0.55]} fingerLen={1.5} nailLen={1.5} /></g>
    {[0, 1].map((k) => <ellipse key={"hr" + k} cx={x + 392} cy={wl + 96} rx={40 + k * 30} ry={5 + k * 4} fill="none" stroke="#8aa4cc" strokeWidth={1.5} opacity={0.5 - k * 0.2} />)}
  </g>;
};

export const AhzCreatureSheet: React.FC = () => {
  const P1 = { x: 24, y: 168, w: 1032, h: 700 }, P2 = { x: 24, y: 888, w: 1032, h: 580 }, P3 = { x: 24, y: 1488, w: 510, h: 412 }, P4 = { x: 546, y: 1488, w: 510, h: 412 };
  const sx = 560, sy = P1.y + 632, ss = 0.8;
  const S = (px: number, py: number): V => [sx + px * ss, sy + py * ss];
  return (
    <AbsoluteFill style={{ backgroundColor: "#05080e" }}>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <AhzDefs />
        <text x={540} y={84} fontFamily={SERIF} fontSize={68} fontWeight={700} fill={CREAM} textAnchor="middle" letterSpacing={2}>The Ahuizotl</text>
        <text x={540} y={132} fontFamily={SERIF} fontSize={26} fill={MUTED} textAnchor="middle">creature design v1 · Aztec legend (Florentine Codex, Book 11)</text>

        <Panel {...P1} n={1} title="Full body, side" note="dog-sized · long low body · black wet fur in dripping spikes" id="p1">
          <Night x={P1.x} y={P1.y} w={P1.w} h={P1.h} moon={[P1.x + P1.w - 120, P1.y + 130]} id="g1" horizon={P1.y + 470} />
          <Water x={P1.x} y={P1.y + 470} w={P1.w} h={P1.h - 470} moonX={P1.x + P1.w - 120} id="g1" />
          <Reeds x0={P1.x - 20} x1={P1.x + 300} base={P1.y + 486} top={P1.y + 300} seed={11} n={26} tone="#050a12" rim={0.3} />
          <Reeds x0={P1.x + 760} x1={P1.x + P1.w + 20} base={P1.y + 486} top={P1.y + 320} seed={17} n={22} tone="#050a12" rim={0.3} />
          {/* the mud bank it crouches on */}
          <path d={`M${P1.x - 10},${sy + 4} Q${P1.x + 300},${sy - 14} ${P1.x + 640},${sy - 2} T${P1.x + P1.w + 10},${sy + 10} L${P1.x + P1.w + 10},${P1.y + P1.h} L${P1.x - 10},${P1.y + P1.h} Z`} fill="#0b0f16" />
          <path d={`M${P1.x - 10},${sy + 4} Q${P1.x + 300},${sy - 14} ${P1.x + 640},${sy - 2} T${P1.x + P1.w + 10},${sy + 10}`} stroke="#3a4660" strokeWidth={2} fill="none" />
          <ellipse cx={sx + 20} cy={sy + 6} rx={330} ry={14} fill="#000" opacity={0.6} />
          {[0, 1, 2].map((k) => <path key={k} d={`M${sx - 300 + k * 230},${sy + 18 + k * 4} q30,-4 60,0`} stroke="#5a6886" strokeWidth={2} opacity={0.4} fill="none" />)}
          <AhzSide x={sx} y={sy} s={ss} jaw={0.25} handOpen={0.9} />
          <Callout at={[P1.x + 22, P1.y + 150]} from={[P1.x + 150, P1.y + 182]} to={S(-282, -360)} text={["tall pointed", "ears"]} />
          <Callout at={[P1.x + 22, P1.y + 300]} from={[P1.x + 180, P1.y + 330]} to={S(-372, -214)} text={["eyeshine: the", "eyes glow"]} />
          <Callout at={[P1.x + 22, P1.y + 420]} from={[P1.x + 160, P1.y + 450]} to={S(-380, -165)} text={["wide mouth,", "needle teeth"]} />
          <Callout at={[P1.x + 22, P1.y + 560]} from={[P1.x + 180, P1.y + 590]} to={S(-262, -16)} text={["small black-nailed", "hands on all four"]} />
          <Callout at={[P1.x + 330, P1.y + 112]} from={[P1.x + 400, P1.y + 146]} to={S(130, -440)} text={["its tail ends in a", "pale human hand"]} />
          <Callout at={[P1.x + P1.w - 16, P1.y + 640]} from={[P1.x + P1.w - 80, P1.y + 612]} to={S(420, -200)} text={["very long tail"]} anchor="end" />
        </Panel>

        <Panel {...P2} n={2} title="Jumpscare face, mouth open" note="baby-like: big low eyes, tiny nose, crying brow · needle teeth in two rows" id="p2">
          <rect x={P2.x} y={P2.y} width={P2.w} height={P2.h} fill="#060a12" />
          <defs><radialGradient id="p2glow" cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="#1f3458" stopOpacity={0.9} /><stop offset="1" stopColor="#1f3458" stopOpacity={0} /></radialGradient></defs>
          <rect x={P2.x} y={P2.y} width={P2.w} height={P2.h} fill="url(#p2glow)" />
          {/* water bursting up around it */}
          {Array.from({ length: 30 }, (_, i) => { const a = (-160 + 140 * rnd(i + 2)) * Math.PI / 180, r0 = 280 + 200 * rnd(i + 5);
            return <path key={i} d={`M${540 + Math.cos(a) * r0},${P2.y + 330 + Math.sin(a) * r0 * 0.7} l${Math.cos(a) * 30},${Math.sin(a) * 22}`} stroke={AHZ.water} strokeWidth={3 + 4 * rnd(i)} strokeLinecap="round" opacity={0.4} />; })}
          {Array.from({ length: 40 }, (_, i) => <circle key={"d" + i} cx={P2.x + 30 + rnd(i * 3) * (P2.w - 60)} cy={P2.y + 60 + rnd(i * 5 + 1) * (P2.h - 120)} r={2 + 5 * rnd(i * 7)} fill={AHZ.water} opacity={0.35 + 0.3 * rnd(i)} />)}
          <AhzFace cx={540} cy={P2.y + 236} s={0.8} open={1} />
          {/* water sheeting off at the bottom */}
          <path d={`M${P2.x},${P2.y + P2.h - 30} Q${P2.x + 260},${P2.y + P2.h - 70} 540,${P2.y + P2.h - 50} T${P2.x + P2.w},${P2.y + P2.h - 36} L${P2.x + P2.w},${P2.y + P2.h} L${P2.x},${P2.y + P2.h} Z`} fill="#0e1c30" opacity={0.85} />
          <path d={`M${P2.x},${P2.y + P2.h - 30} Q${P2.x + 260},${P2.y + P2.h - 70} 540,${P2.y + P2.h - 50} T${P2.x + P2.w},${P2.y + P2.h - 36}`} stroke="#9fb6dc" strokeWidth={3} fill="none" opacity={0.6} />
          {/* closed-mouth inset for the animator */}
          <rect x={P2.x + P2.w - 230} y={P2.y + 20} width={210} height={190} rx={10} fill="#070b13" stroke="#2c3a52" strokeWidth={2} />
          <clipPath id="insetc"><rect x={P2.x + P2.w - 230} y={P2.y + 20} width={210} height={190} rx={10} /></clipPath>
          <g clipPath="url(#insetc)"><AhzFace cx={P2.x + P2.w - 125} cy={P2.y + 128} s={0.34} open={0} /></g>
          <rect x={P2.x + P2.w - 230} y={P2.y + 180} width={210} height={30} fill="#070b13" opacity={0.85} />
          <text x={P2.x + P2.w - 125} y={P2.y + 201} fontFamily={SERIF} fontSize={17} fill={MUTED} textAnchor="middle" style={{ paintOrder: "stroke" }} stroke="#000" strokeWidth={3}>closed: the crying lure</text>
        </Panel>

        <Panel {...P3} n={3} title="The tail-hand" note="pale, long-fingered, too human" id="p3">
          <GrabPanel {...P3} />
        </Panel>

        <Panel {...P4} n={4} title="How it lurks" note="only the eyeshine above the water" id="p4">
          <LurkPanel {...P4} />
        </Panel>
      </svg>
    </AbsoluteFill>
  );
};
