// The Hidebehind's face for the attack close-up only (the body/silhouette stays in creature.tsx). Uncanny rather than
// cartoon: an almost-human, starved face stretched over a long skull, dark wet bark-grey skin, sunken slit sockets
// with tiny burning pupils, a lipless mouth torn far too wide (back to where the ears should be) with dark gums and
// crooked needle teeth of uneven length, strings of saliva, hard lantern light from below and black shadow above.
// Head space: centre (0,0), about 1 unit wide, facing the camera. open 0..1.
import React from "react";

const INK = "#050304";
const rnd = (i: number) => { const x = Math.sin(i * 91.7 + 3.1) * 43758.5453; return x - Math.floor(x); };

export const AttackFace: React.FC<{ x: number; y: number; size: number; open?: number; t?: number; id?: string }> = ({ x, y, size, open = 1, t = 0, id = "af" }) => {
  const J = 0.12 + 0.42 * open;                     // jaw drop
  const tw = Math.sin(t * 40) * 0.004;              // tremble
  // skull outline: tall, narrow temples, hollow cheeks, jaw hanging long
  const head = `M-0.30,-0.62 C-0.18,-0.74 0.18,-0.74 0.30,-0.62 C0.42,-0.48 0.44,-0.28 0.40,-0.12
    C0.37,0.0 0.44,0.08 0.41,${(0.2 + J * 0.4).toFixed(3)} C0.42,${(0.2 + J).toFixed(3)} 0.2,${(0.27 + J).toFixed(3)} 0,${(0.3 + J).toFixed(3)}
    C-0.2,${(0.27 + J).toFixed(3)} -0.42,${(0.2 + J).toFixed(3)} -0.41,${(0.2 + J * 0.4).toFixed(3)} C-0.44,0.08 -0.37,0.0 -0.40,-0.12
    C-0.44,-0.28 -0.42,-0.48 -0.30,-0.62 Z`;
  // the mouth: a wide torn gash, corners pulled up toward the cheekbones
  const mt = 0.1, mb = 0.1 + J;
  const mouth = `M-0.43,0.0 C-0.3,${(mt + 0.02).toFixed(3)} -0.12,${(mt - 0.03).toFixed(3)} 0,${(mt - 0.02).toFixed(3)} C0.12,${(mt - 0.03).toFixed(3)} 0.3,${(mt + 0.02).toFixed(3)} 0.43,0.0
    C0.38,${(mb * 0.6).toFixed(3)} 0.25,${(mb + 0.02).toFixed(3)} 0,${(mb + 0.04).toFixed(3)} C-0.25,${(mb + 0.02).toFixed(3)} -0.38,${(mb * 0.6).toFixed(3)} -0.43,0.0 Z`;
  const upper = Array.from({ length: 16 }, (_, i) => {
    const u = (i + 0.5) / 16, xx = -0.4 + u * 0.8, top = mt - 0.03 + 0.06 * Math.abs(u - 0.5) ** 2 * 4 * 0.35, L = 0.06 + 0.11 * rnd(i) * (1 - Math.abs(u - 0.5)) + 0.04 * open, w = 0.018 + 0.01 * rnd(i + 40);
    const lean = (rnd(i + 7) - 0.5) * 0.04;
    return <path key={"u" + i} d={`M${(xx - w).toFixed(3)},${top.toFixed(3)} Q${(xx + lean).toFixed(3)},${(top + L * 0.6).toFixed(3)} ${(xx + lean * 1.5).toFixed(3)},${(top + L).toFixed(3)} Q${(xx + w * 0.3).toFixed(3)},${(top + L * 0.5).toFixed(3)} ${(xx + w).toFixed(3)},${top.toFixed(3)} Z`}
      fill={rnd(i + 3) > 0.8 ? "#9a8e72" : "#cfc4a8"} stroke={INK} strokeWidth={0.004} />;
  });
  const lower = Array.from({ length: 14 }, (_, i) => {
    const u = (i + 0.5) / 14, xx = -0.36 + u * 0.72, bot = mb + 0.02 - 0.5 * J * Math.abs(u - 0.5) ** 2, L = 0.06 + 0.1 * rnd(i + 20) * (1 - Math.abs(u - 0.5)) + 0.03 * open, w = 0.016 + 0.01 * rnd(i + 60);
    const lean = (rnd(i + 17) - 0.5) * 0.04;
    return <path key={"l" + i} d={`M${(xx - w).toFixed(3)},${bot.toFixed(3)} Q${(xx + lean).toFixed(3)},${(bot - L * 0.6).toFixed(3)} ${(xx + lean * 1.5).toFixed(3)},${(bot - L).toFixed(3)} Q${(xx + w * 0.3).toFixed(3)},${(bot - L * 0.5).toFixed(3)} ${(xx + w).toFixed(3)},${bot.toFixed(3)} Z`}
      fill={rnd(i + 23) > 0.8 ? "#9a8e72" : "#cfc4a8"} stroke={INK} strokeWidth={0.004} />;
  });
  const drool = [-0.22, 0.05, 0.27].map((xx, i) => <path key={"d" + i}
    d={`M${xx},${(mt + 0.06).toFixed(3)} Q${(xx + 0.015 * Math.sin(t * 3 + i)).toFixed(3)},${((mt + mb) / 2).toFixed(3)} ${(xx + 0.01).toFixed(3)},${(mb - 0.02).toFixed(3)}`}
    stroke="rgba(210,220,200,0.55)" strokeWidth={0.006} fill="none" />);
  // sunken slit sockets under a heavy brow, tiny burning pupils
  const sock = (sx: number) => <g>
    <path d={sx < 0 ? `M${sx - 0.17},-0.3 C${sx - 0.1},-0.33 ${sx + 0.06},-0.3 ${sx + 0.15},-0.2 C${sx + 0.08},-0.12 ${sx - 0.12},-0.14 ${sx - 0.17},-0.3 Z`
      : `M${sx + 0.17},-0.3 C${sx + 0.1},-0.33 ${sx - 0.06},-0.3 ${sx - 0.15},-0.2 C${sx - 0.08},-0.12 ${sx + 0.12},-0.14 ${sx + 0.17},-0.3 Z`} fill="#000" stroke="#0a0705" strokeWidth={0.03} />
    <circle cx={sx + 0.01} cy={-0.235} r={0.06} fill={`url(#${id}-eye)`} opacity={0.35} />
    <circle cx={sx + 0.01} cy={-0.235} r={0.024} fill={`url(#${id}-eye)`} />
    <circle cx={sx + 0.01} cy={-0.235} r={0.008} fill="#fff8e8" />
  </g>;
  return (
    <g transform={`translate(${x},${y}) scale(${size}) translate(${tw},0)`}>
      <defs>
        <radialGradient id={`${id}-eye`}><stop offset="0" stopColor="#fff2c8" /><stop offset="0.45" stopColor="#ffb040" stopOpacity={0.9} /><stop offset="1" stopColor="#ff5010" stopOpacity={0} /></radialGradient>
        <linearGradient id={`${id}-under`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff8a3a" stopOpacity={0.35} /><stop offset="0.3" stopColor="#ff7020" stopOpacity={0.08} /><stop offset="0.6" stopColor="#000" stopOpacity={0.3} /><stop offset="1" stopColor="#000" stopOpacity={0.9} />
        </linearGradient>
        <filter id={`${id}-skin`} x="-0.2" y="-0.2" width="1.4" height="1.4">
          <feTurbulence type="fractalNoise" baseFrequency="9" numOctaves={3} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={0.025} />
        </filter>
        <filter id={`${id}-tex`}><feTurbulence type="fractalNoise" baseFrequency="14 4" numOctaves={4} seed={9} /><feColorMatrix values="0 0 0 0 0.03  0 0 0 0 0.025  0 0 0 0 0.02  0 0 0 1.6 -0.35" /></filter>
        <clipPath id={`${id}-clip`}><path d={head} /></clipPath>
      </defs>
      <g filter={`url(#${id}-skin)`}>
        <path d={head} fill="#4a4237" stroke={INK} strokeWidth={0.02} />
        <g clipPath={`url(#${id}-clip)`}>
          <rect x={-0.6} y={-0.8} width={1.2} height={2} filter={`url(#${id}-tex)`} />
          {/* hollow cheeks, temples, the brow ridge and skull ridges catching the underlight */}
          <path d="M-0.40,-0.05 C-0.3,-0.1 -0.24,0.02 -0.27,0.06 M0.40,-0.05 C0.3,-0.1 0.24,0.02 0.27,0.06" stroke="#14100c" strokeWidth={0.05} fill="none" opacity={0.7} />
          <path d="M-0.36,-0.36 C-0.2,-0.42 0.2,-0.42 0.36,-0.36" stroke="#5c5244" strokeWidth={0.035} fill="none" />
          <path d="M-0.05,-0.7 C-0.08,-0.5 -0.02,-0.45 -0.04,-0.38 M0.12,-0.68 C0.1,-0.55 0.15,-0.5 0.12,-0.4 M-0.25,-0.6 C-0.2,-0.5 -0.27,-0.45 -0.24,-0.4" stroke="#1a1510" strokeWidth={0.012} fill="none" />
          {/* nose: two torn slits in a flat bridge */}
          <path d="M-0.04,-0.16 C-0.06,-0.08 -0.05,-0.03 -0.03,0.0 M0.04,-0.16 C0.06,-0.08 0.05,-0.03 0.03,0.0" stroke="#000" strokeWidth={0.022} fill="none" strokeLinecap="round" />
          {sock(-0.17)}{sock(0.17)}
          {/* gums and the black throat */}
          <path d={mouth} fill="#2a0707" stroke={INK} strokeWidth={0.015} />
          <path d={`M-0.36,${(mt + 0.03).toFixed(3)} C-0.2,${(mt + 0.06).toFixed(3)} 0.2,${(mt + 0.06).toFixed(3)} 0.36,${(mt + 0.03).toFixed(3)} C0.3,${(mb - 0.02).toFixed(3)} 0.15,${(mb - 0.01).toFixed(3)} 0,${(mb - 0.0).toFixed(3)} C-0.15,${(mb - 0.01).toFixed(3)} -0.3,${(mb - 0.02).toFixed(3)} -0.36,${(mt + 0.03).toFixed(3)} Z`} fill="#000" />
          {/* skin torn and stretched at the corners of the mouth */}
          <path d={`M-0.43,0.0 L-0.47,-0.06 M-0.42,0.02 L-0.48,0.0 M-0.41,0.04 L-0.46,0.07 M0.43,0.0 L0.47,-0.06 M0.42,0.02 L0.48,0.0 M0.41,0.04 L0.46,0.07 M-0.33,-0.02 L-0.36,-0.1 M0.33,-0.02 L0.36,-0.1`} stroke="#0d0907" strokeWidth={0.01} />
          {drool}
          {upper}{lower}
          {/* lantern from below, darkness above */}
          <rect x={-0.6} y={-0.8} width={1.2} height={2} fill={`url(#${id}-under)`} />
        </g>
      </g>
    </g>
  );
};
