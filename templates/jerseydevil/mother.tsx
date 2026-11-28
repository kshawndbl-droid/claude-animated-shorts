// The mother in the 1735 prologue of "The Jersey Devil" (our own design): a Pine Barrens farm wife in a 1730s working
// dress, seen in profile and mostly as a silhouette against the firelight. Linen mob cap with a soft frill, hair in a
// bun under it, a kerchief crossed over a laced bodice, elbow-length sleeves ending in a linen ruffle, a long full wool
// skirt with an apron to the floor (no feet show, so nothing can slide). Not a monster, not scary: tired and still.
// Same ink-outline language as the cast. Arms are soft tapered tubes that bend in one smooth curve (2-bone IK to a
// hand target, no hinge, no joint circle); the near hand can rest on the cradle rail and follow it as it rocks.
// Units are metres, feet on y = 0 (SVG y down, so the head is at y ~ -1.6), facing +x (flip mirrors).
// rim: how much warm firelight edges her front (+x) side; dark: 0..1 how silhouetted she is.
import React from "react";

const INK = "#120c0a";
type V = [number, number];
const f2 = (p: V) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const mixHex = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(lerp(v, pb[i], k)).toString(16).padStart(2, "0")).join("");
};

/** a soft tapered limb through a, (bent at) b, to c: one smooth quadratic curve, widths wa -> wc */
const tube = (a: V, b: V, c: V, wa: number, wc: number) => {
  const q: V = [2 * b[0] - (a[0] + c[0]) / 2, 2 * b[1] - (a[1] + c[1]) / 2], N = 16, pts: V[] = [];
  for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * q[0] + t * t * c[0], u * u * a[1] + 2 * u * t * q[1] + t * t * c[1]]); }
  const L: V[] = [], R: V[] = [];
  for (let i = 0; i <= N; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(N, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    const w = lerp(wa, wc, i / N);
    L.push([pts[i][0] - (dy / l) * w, pts[i][1] + (dx / l) * w]); R.push([pts[i][0] + (dy / l) * w, pts[i][1] - (dx / l) * w]);
  }
  return `M${f2(L[0])} ${L.slice(1).map((p) => "L" + f2(p)).join(" ")} A${wc},${wc} 0 0 1 ${f2(R[N])} ${R.slice(0, N).reverse().map((p) => "L" + f2(p)).join(" ")} Z`;
};

/** 2-bone IK: elbow for shoulder s, hand target h, bone lengths a, b; the elbow drops down and back (-x) */
const ik = (s: V, h: V, a: number, b: number): [V, V] => {
  let dx = h[0] - s[0], dy = h[1] - s[1];
  let d = Math.hypot(dx, dy);
  const dm = Math.min(d, (a + b) * 0.995);
  if (d > dm) { dx *= dm / d; dy *= dm / d; d = dm; }
  const hh: V = [s[0] + dx, s[1] + dy];
  const ca = clamp01((a * a + d * d - b * b) / (2 * a * d) * 0.5 + 0.5) * 2 - 1;
  const ang = Math.atan2(dy, dx) + Math.acos(Math.max(-1, Math.min(1, ca)));   // + = elbow bends down/back
  return [[s[0] + Math.cos(ang) * a, s[1] + Math.sin(ang) * a], hh];
};

export type MotherPose = {
  t?: number;          // seconds (breathing, a slight sway)
  lean?: number;       // degrees the upper body bends forward at the waist
  head?: number;       // degrees the head tips down (+) / up (-)
  handN?: V | null;    // near hand target in her local metres (null = hands folded at the waist)
  handF?: V | null;    // far hand target
  rim?: number;        // warm firelight on her front edge, 0..1
  dark?: number;       // 0 = coloured, 1 = full silhouette
};

export const Mother: React.FC<{ x: number; y: number; ppm: number; p?: MotherPose; flip?: boolean; id?: string }> = ({ x, y, ppm, p = {}, flip, id = "mo" }) => {
  const { t = 0, lean = 4, head = 10, handN = null, handF = null, rim = 0.8, dark = 0.7 } = p;
  const br = Math.sin(t * 1.6) * 0.004;                 // breathing: chest and shoulders rise a few mm
  const sway = Math.sin(t * 0.7) * 0.6;                 // a slow weight shift (degrees)
  const D = (c: string) => mixHex(c, "#140d0a", dark);
  const DRESS = D("#4a3428"), DRESS2 = D("#36261d"), APRON = D("#7d6f5c"), LINEN = D("#d8cdb8"), LINEN2 = D("#a89c86"), SKIN = D("#d6a886"), HAIR = D("#4a3020");
  const waist: V = [0.0, -0.98];
  // upper body transform: lean forward about the waist
  const la = ((lean + sway) * Math.PI) / 180;
  const up = (q: V): V => {
    const dx = q[0] - waist[0], dy = q[1] - waist[1];
    return [waist[0] + dx * Math.cos(la) - dy * Math.sin(la), waist[1] + dx * Math.sin(la) + dy * Math.cos(la)];
  };
  const shN = up([0.02, -1.31 - br]), shF = up([-0.03, -1.32 - br]);
  const neck = up([0.03, -1.36 - br]);
  const ha = ((head + lean * 0.3) * Math.PI) / 180;
  const hc: V = [neck[0] + Math.sin(0.35 + ha) * 0.1, neck[1] - Math.cos(0.35 + ha) * 0.1];
  const restN: V = [0.12, -1.0], restF: V = [0.1, -1.02];   // hands folded at the waist, over the apron
  const [eN, hN] = ik(shN, handN ?? restN, 0.29, 0.27);
  const [eF, hF] = ik(shF, handF ?? restF, 0.29, 0.27);
  // where the sleeve ends (the ruffle) along the forearm: just past the elbow
  const cuff = (e: V, h: V): V => [lerp(e[0], h[0], 0.18), lerp(e[1], h[1], 0.18)];
  const arm = (s: V, e: V, h: V, far: boolean) => {
    const c = cuff(e, h), dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    return <g>
      {/* forearm (skin) then the hand: a soft mitten shape */}
      <path d={tube(c, [lerp(c[0], h[0], 0.5), lerp(c[1], h[1], 0.5)], h, 0.028, 0.022)} fill={far ? D("#b48a6c") : SKIN} stroke={INK} strokeWidth={0.008} />
      <ellipse cx={h[0] + (dx / l) * 0.035} cy={h[1] + (dy / l) * 0.035} rx={0.045} ry={0.028} transform={`rotate(${(Math.atan2(dy, dx) * 180) / Math.PI} ${h[0] + (dx / l) * 0.035} ${h[1] + (dy / l) * 0.035})`}
        fill={far ? D("#b48a6c") : SKIN} stroke={INK} strokeWidth={0.008} />
      {/* sleeve to the elbow, full at the shoulder */}
      <path d={tube(s, [lerp(s[0], e[0], 0.5), lerp(s[1], e[1], 0.5)], c, 0.058, 0.05)} fill={far ? DRESS2 : DRESS} stroke={INK} strokeWidth={0.01} />
      {/* linen ruffle at the elbow */}
      <path d={`M${f2([c[0] + nx * 0.06, c[1] + ny * 0.06])} Q${f2([c[0] + (dx / l) * 0.07, c[1] + (dy / l) * 0.07])} ${f2([c[0] - nx * 0.06, c[1] - ny * 0.06])} Q${f2([c[0] + (dx / l) * 0.02, c[1] + (dy / l) * 0.02])} ${f2([c[0] + nx * 0.06, c[1] + ny * 0.06])} Z`}
        fill={far ? LINEN2 : LINEN} stroke={INK} strokeWidth={0.007} />
    </g>;
  };
  // the body (skirt, apron, bodice, kerchief, neck, head, cap) as one group
  const hem = 0.0, kx = Math.sin(t * 0.7) * 0.004;
  const skirt = `M${f2(up([-0.13, -0.99]))} C-0.26,-0.7 -0.33,-0.25 -0.36,${hem} Q0.0,${hem + 0.02} 0.33,${hem} C0.3,-0.3 0.24,-0.72 ${f2(up([0.14, -0.97]))} Z`;
  const apron = `M${f2(up([0.1, -0.98]))} C0.2,-0.7 0.27,-0.3 ${0.3 + kx},-0.05 L0.08,-0.03 C0.1,-0.4 0.06,-0.75 ${f2(up([0.0, -0.98]))} Z`;
  const bodice = `M${f2(up([-0.1, -0.97]))} C${f2(up([-0.14, -1.12]))} ${f2(up([-0.13, -1.25]))} ${f2(up([-0.09, -1.33 - br]))} L${f2(up([0.07, -1.34 - br]))} C${f2(up([0.13, -1.24 - br]))} ${f2(up([0.12, -1.08]))} ${f2(up([0.11, -0.97]))} Z`;
  const kerchief = `M${f2(up([-0.1, -1.3 - br]))} Q${f2(up([0.0, -1.2]))} ${f2(up([0.12, -1.16]))} L${f2(up([0.08, -1.34 - br]))} Q${f2(up([-0.02, -1.37 - br]))} ${f2(up([-0.1, -1.3 - br]))} Z`;
  const neckP = tube(neck, [lerp(neck[0], hc[0], 0.5), lerp(neck[1], hc[1], 0.5)], [hc[0] - 0.01, hc[1] + 0.05], 0.035, 0.035);
  const hd = (ha * 180) / Math.PI;
  const headG = (
    <g transform={`translate(${hc[0]} ${hc[1]}) rotate(${hd})`}>
      {/* hair bun at the nape, face profile (brow, nose, lips, chin), ear, then the mob cap over it all */}
      <ellipse cx={-0.075} cy={0.01} rx={0.05} ry={0.045} fill={HAIR} stroke={INK} strokeWidth={0.008} />
      <path d="M-0.07,-0.02 C-0.08,-0.09 -0.02,-0.115 0.04,-0.1 C0.08,-0.085 0.085,-0.05 0.083,-0.03 L0.1,0.005 L0.084,0.012 C0.088,0.025 0.084,0.03 0.08,0.034 C0.085,0.042 0.078,0.05 0.07,0.052 C0.06,0.075 0.04,0.085 0.02,0.083 C-0.03,0.08 -0.07,0.05 -0.07,-0.02 Z"
        fill={SKIN} stroke={INK} strokeWidth={0.008} strokeLinejoin="round" />
      <path d="M0.055,-0.035 q0.012,-0.006 0.02,0.002" stroke={INK} strokeWidth={0.006} fill="none" strokeLinecap="round" />
      <ellipse cx={-0.01} cy={0.0} rx={0.014} ry={0.02} fill={D("#c08f6e")} stroke={INK} strokeWidth={0.005} />
      <path d="M-0.1,-0.02 C-0.12,-0.12 -0.04,-0.17 0.03,-0.155 C0.09,-0.14 0.105,-0.1 0.09,-0.075 C0.07,-0.09 0.04,-0.095 0.02,-0.09 C-0.01,-0.07 -0.03,-0.03 -0.05,0.04 C-0.09,0.05 -0.11,0.02 -0.1,-0.02 Z"
        fill={LINEN} stroke={INK} strokeWidth={0.009} strokeLinejoin="round" />
      {/* the frill along the cap's edge */}
      <path d="M0.09,-0.075 Q0.1,-0.06 0.085,-0.055 Q0.075,-0.065 0.06,-0.06 Q0.06,-0.08 0.045,-0.08" stroke={LINEN2} strokeWidth={0.008} fill="none" />
      <path d="M-0.02,-0.08 Q-0.03,-0.05 -0.05,-0.02" stroke={LINEN2} strokeWidth={0.006} fill="none" />
    </g>
  );
  const body = (
    <g>
      {arm(shF, eF, hF, true)}
      <path d={skirt} fill={DRESS} stroke={INK} strokeWidth={0.012} strokeLinejoin="round" />
      {/* skirt folds */}
      {[-0.2, -0.08, 0.05].map((fx, i) => <path key={i} d={`M${fx + 0.03},-0.85 Q${fx - 0.02 + kx},-0.4 ${fx - 0.04},-0.01`} stroke={DRESS2} strokeWidth={0.012} fill="none" />)}
      <path d={apron} fill={APRON} stroke={INK} strokeWidth={0.01} strokeLinejoin="round" />
      <path d={bodice} fill={DRESS2} stroke={INK} strokeWidth={0.011} strokeLinejoin="round" />
      {/* lacing down the stomacher */}
      {[0, 1, 2, 3].map((i) => { const a = up([0.09, -1.0 - i * 0.07]), b = up([0.06, -1.035 - i * 0.07]); return <path key={i} d={`M${f2(a)} L${f2(b)}`} stroke={LINEN2} strokeWidth={0.006} />; })}
      <path d={neckP} fill={SKIN} stroke={INK} strokeWidth={0.008} />
      <path d={kerchief} fill={LINEN} stroke={INK} strokeWidth={0.009} strokeLinejoin="round" />
      {headG}
      {arm(shN, eN, hN, false)}
    </g>
  );
  const s = ppm * (flip ? -1 : 1);
  return (
    <g transform={`translate(${x} ${y}) scale(${s} ${ppm})`}>
      <defs>
        <filter id={`${id}rim`} x="-50%" y="-50%" width="200%" height="200%">
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.58  0 0 0 0 0.24  0 0 0 1 0" />
          <feGaussianBlur stdDeviation={0.01} />
        </filter>
      </defs>
      {/* firelight rim: a warm copy of the whole figure, nudged toward the fire (+x) and softened, behind the body */}
      {rim > 0 && <g transform="translate(0.022 -0.006)" filter={`url(#${id}rim)`} opacity={rim}>{body}</g>}
      {body}
    </g>
  );
};
