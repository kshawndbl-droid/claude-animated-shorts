// Style C ("flat bold, taller") rig for the Corporal Wojtek Short: flat colours, thick ink outlines, jointed
// two-bone limbs, a soldier and a Syrian brown bear (cub to adult). Everything returns SVG strings, so a frame is a
// pure function of its parameters. Local units: feet on y = 0, y grows downward, the character faces +x
// (flip mirrors it). Legs use two-bone IK toward planted foot positions, so feet never slide.
export const INK = "#2a2230";
const f = (n: number) => (Math.abs(n) < 1e-6 ? "0" : n.toFixed(1));
const rad = (d: number) => (d * Math.PI) / 180;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp01 = (k: number) => Math.max(0, Math.min(1, k));
export const ease = (k: number) => { const t = clamp01(k); return t * t * (3 - 2 * t); };
export const backOut = (k: number) => { const t = clamp01(k), c = 1.7, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
type P2 = [number, number];

/** two-bone IK: from root toward target with bone lengths l1, l2; bend = +1 bends the joint toward +x (knees), -1 toward -x */
export const ik = (root: P2, target: P2, l1: number, l2: number, bend: number): P2 => {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const a = Math.atan2(dy, dx), c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = a - bend * c;
  return [root[0] + Math.cos(ang) * l1, root[1] + Math.sin(ang) * l1];
};
/** angle chain: a = shoulder angle from hanging (deg, + swings toward +x/forward), e = elbow bend (deg, added) */
const chain = (r: P2, a: number, e: number, l1: number, l2: number): [P2, P2, number] => {
  const el: P2 = [r[0] + Math.sin(rad(a)) * l1, r[1] + Math.cos(rad(a)) * l1];
  const h: P2 = [el[0] + Math.sin(rad(a + e)) * l2, el[1] + Math.cos(rad(a + e)) * l2];
  return [el, h, a + e];
};
const armOf = (sh: P2, ang: [number, number] | undefined, def: [number, number], reach: P2 | undefined, l1: number, l2: number, bend: number): [P2, P2, number] => {
  if (!reach) return chain(sh, ...(ang ?? def), l1, l2);
  const el = ik(sh, reach, l1, l2, bend), d = Math.hypot(reach[0] - el[0], reach[1] - el[1]) || 1;
  const h: P2 = [el[0] + (reach[0] - el[0]) / d * l2, el[1] + (reach[1] - el[1]) / d * l2];
  return [el, h, (Math.atan2(h[0] - el[0], h[1] - el[1]) * 180) / Math.PI];
};
const limb = (pts: P2[], w: number, col: string, ink = 6) => {
  const d = "M" + pts.map((p) => `${f(p[0])},${f(p[1])}`).join(" L");
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + ink * 2}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const mitt = (p: P2, deg: number, r: number, col: string) =>
  `<g transform="translate(${f(p[0])},${f(p[1])}) rotate(${f(-deg)})"><ellipse cx="0" cy="${f(r * 0.3)}" rx="${f(r)}" ry="${f(r * 1.1)}" fill="${col}" stroke="${INK}" stroke-width="5"/>` +
  `<ellipse cx="${f(r * 0.85)}" cy="${f(-r * 0.05)}" rx="${f(r * 0.38)}" ry="${f(r * 0.62)}" transform="rotate(-30 ${f(r * 0.85)} ${f(-r * 0.05)})" fill="${col}" stroke="${INK}" stroke-width="4.5"/></g>`;
const boot = (p: P2, s = 1, col = "#2b231e") =>
  `<path d="M${f(p[0] - 16 * s)},${f(p[1])} Q${f(p[0] - 18 * s)},${f(p[1] - 28 * s)} ${f(p[0] + 2)},${f(p[1] - 28 * s)} Q${f(p[0] + 32 * s)},${f(p[1] - 24 * s)} ${f(p[0] + 38 * s)},${f(p[1])} Z" fill="${col}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
  `<path d="M${f(p[0] - 16 * s)},${f(p[1] - 3)} L${f(p[0] + 38 * s)},${f(p[1] - 3)}" stroke="#15100d" stroke-width="5"/>`;

export type Expr = "smile" | "happy" | "shock" | "grit" | "proud" | "neutral" | "worried";
export type Pose = {
  lean?: number; headTilt?: number; expr?: Expr; talk?: number; blink?: number; look?: number;
  armB?: [number, number]; armF?: [number, number];
  /** reach a hand to a local point instead (two-bone IK, elbow bends down/out) */
  reachF?: P2; reachB?: P2;
  /** planted feet in local units (x, y); default standing */
  footB?: P2; footF?: P2; hipY?: number; hipX?: number;
  /** sitting: hips at hipY over a seat, shins hang to the feet */
  hold?: "bottle" | null; holdDeg?: number; cheeks?: number; ears?: number; puff?: number;
};

// ------------------------------------------------------------------ soldier
export type SoldierLook = { uni: string; uniD: string; trou: string; trouD: string; cap: "beret" | "fieldcap"; capCol: string; hair: string; skin: string; skinD: string; mustache?: boolean };
export const PIOTR: SoldierLook = { uni: "#b79c63", uniD: "#957d48", trou: "#a48a55", trouD: "#836c3f", cap: "beret", capCol: "#4b5136", hair: "#3b2a1f", skin: "#f0cfac", skinD: "#d4ab83" };
export const JAN: SoldierLook = { uni: "#a99460", uniD: "#887444", trou: "#9a8350", trouD: "#7a653b", cap: "fieldcap", capCol: "#7d6a3e", hair: "#8a5a2c", skin: "#eec7a0", skinD: "#cf9f77", mustache: true };

const soldierFace = (L: SoldierLook, cx: number, cy: number, r: number, p: Pose) => {
  const ex = p.expr ?? "smile", out: string[] = [], eY = cy + r * 0.02, eX = r * 0.33, bl = p.blink ?? 0, lk = (p.look ?? 0) * r * 0.05;
  const brow = (s: number, lift: number, tilt: number) => `<path d="M${f(cx + s * eX - s * r * 0.16)},${f(eY - r * 0.24 - lift + s * tilt)} Q${f(cx + s * eX)},${f(eY - r * 0.33 - lift)} ${f(cx + s * eX + s * r * 0.16)},${f(eY - r * 0.22 - lift - s * tilt)}" fill="none" stroke="${L.hair}" stroke-width="${f(r * 0.085)}" stroke-linecap="round"/>`;
  [-1, 1].forEach((s) => {
    const x = cx + s * eX + lk;
    if (ex === "shock") out.push(`<ellipse cx="${f(x)}" cy="${f(eY)}" rx="${f(r * 0.15)}" ry="${f(r * 0.19)}" fill="#fff" stroke="${INK}" stroke-width="4.5"/><circle cx="${f(x)}" cy="${f(eY + 2)}" r="${f(r * 0.055)}" fill="${INK}"/>`);
    else if (ex === "happy" || bl > 0.6) out.push(`<path d="M${f(x - r * 0.1)},${f(eY + (ex === "happy" ? 3 : 0))} Q${f(x)},${f(eY + (ex === "happy" ? -r * 0.12 : r * 0.07))} ${f(x + r * 0.1)},${f(eY + (ex === "happy" ? 3 : 0))}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`);
    else if (ex === "grit") out.push(`<path d="M${f(x - r * 0.1)},${f(eY - s * 4)} L${f(x + r * 0.1)},${f(eY + s * 4)}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`);
    else out.push(`<ellipse cx="${f(x)}" cy="${f(eY)}" rx="${f(r * 0.07)}" ry="${f(r * 0.1)}" fill="${INK}"/>`);
    const lift = ex === "shock" ? r * 0.14 : ex === "worried" ? r * 0.05 : ex === "grit" ? -r * 0.04 : 0, tilt = ex === "grit" ? 6 : ex === "worried" ? -6 : 0;
    out.push(brow(s, lift, tilt));
  });
  out.push(`<path d="M${f(cx - r * 0.06)},${f(cy + r * 0.22)} Q${f(cx)},${f(cy + r * 0.28)} ${f(cx + r * 0.07)},${f(cy + r * 0.2)}" fill="none" stroke="${L.skinD}" stroke-width="${f(r * 0.05)}" stroke-linecap="round"/>`);
  const my = cy + r * 0.52, t = p.talk ?? 0;
  if (ex === "shock") out.push(`<ellipse cx="${f(cx)}" cy="${f(my + 4)}" rx="${f(r * 0.14)}" ry="${f(r * 0.19)}" fill="#5b1f2a" stroke="${INK}" stroke-width="4.5"/>`);
  else if (ex === "grit") out.push(`<rect x="${f(cx - r * 0.22)}" y="${f(my - r * 0.06)}" width="${f(r * 0.44)}" height="${f(r * 0.14)}" rx="4" fill="#fff" stroke="${INK}" stroke-width="4"/><path d="M${f(cx - r * 0.22)},${f(my + r * 0.01)} H${f(cx + r * 0.22)}" stroke="${INK}" stroke-width="2.5"/>`);
  else if (t > 0.15 || ex === "happy") out.push(`<path d="M${f(cx - r * 0.22)},${f(my - r * 0.05)} Q${f(cx)},${f(my - r * 0.02)} ${f(cx + r * 0.22)},${f(my - r * 0.05)} Q${f(cx + r * 0.16)},${f(my + r * (0.12 + 0.12 * Math.max(t, 0.6)))} ${f(cx)},${f(my + r * (0.14 + 0.12 * Math.max(t, 0.6)))} Q${f(cx - r * 0.16)},${f(my + r * (0.12 + 0.12 * Math.max(t, 0.6)))} ${f(cx - r * 0.22)},${f(my - r * 0.05)} Z" fill="#5b1f2a" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`);
  else if (ex === "worried") out.push(`<path d="M${f(cx - r * 0.18)},${f(my + 4)} q${f(r * 0.09)},-8 ${f(r * 0.18)},0 q${f(r * 0.09)},8 ${f(r * 0.18)},0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`);
  else out.push(`<path d="M${f(cx - r * 0.2)},${f(my - r * 0.04)} Q${f(cx)},${f(my + r * (ex === "proud" ? 0.12 : 0.16))} ${f(cx + r * 0.22)},${f(my - r * 0.07)}" fill="none" stroke="${INK}" stroke-width="${f(r * 0.06)}" stroke-linecap="round"/>`);
  if (L.mustache) out.push(`<path d="M${f(cx - r * 0.26)},${f(cy + r * 0.4)} Q${f(cx - r * 0.1)},${f(cy + r * 0.27)} ${f(cx)},${f(cy + r * 0.33)} Q${f(cx + r * 0.1)},${f(cy + r * 0.27)} ${f(cx + r * 0.26)},${f(cy + r * 0.4)} Q${f(cx)},${f(cy + r * 0.37)} ${f(cx - r * 0.26)},${f(cy + r * 0.4)} Z" fill="${L.hair}" stroke="${INK}" stroke-width="2.5"/>`);
  return out.join("");
};
const soldierHead = (L: SoldierLook, cx: number, cy: number, r: number, p: Pose) => {
  let s = "";
  [-1, 1].forEach((k) => (s += `<ellipse cx="${f(cx + k * r * 0.97)}" cy="${f(cy + r * 0.08)}" rx="${f(r * 0.17)}" ry="${f(r * 0.21)}" fill="${L.skin}" stroke="${INK}" stroke-width="5.5"/>`));
  s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${L.skin}" stroke="${INK}" stroke-width="6.5"/>`;
  s += `<path d="M${f(cx + r * 0.55)},${f(cy - r * 0.8)} A${f(r)},${f(r)} 0 0 1 ${f(cx + r * 0.55)},${f(cy + r * 0.8)} A${f(r * 1.3)},${f(r * 1.3)} 0 0 0 ${f(cx + r * 0.55)},${f(cy - r * 0.8)} Z" fill="${L.skinD}" opacity="0.6"/>`;
  [-1, 1].forEach((k) => (s += `<path d="M${f(cx + k * r * 0.72)},${f(cy - r * 0.62)} Q${f(cx + k * r * 0.98)},${f(cy - r * 0.25)} ${f(cx + k * r * 0.92)},${f(cy + r * 0.12)} Q${f(cx + k * r * 0.8)},${f(cy - r * 0.25)} ${f(cx + k * r * 0.58)},${f(cy - r * 0.55)} Z" fill="${L.hair}" stroke="${INK}" stroke-width="3.5"/>`));
  s += soldierFace(L, cx, cy, r, p);
  if (L.cap === "beret") {
    // a beret pulled down to one side: it sits ON the head (its band follows the skull) and droops over the right
    s += `<path d="M${f(cx - r * 0.98)},${f(cy - r * 0.34)} Q${f(cx - r * 1.08)},${f(cy - r * 1.12)} ${f(cx + r * 0.1)},${f(cy - r * 1.18)} Q${f(cx + r * 1.2)},${f(cy - r * 1.08)} ${f(cx + r * 1.22)},${f(cy - r * 0.48)} Q${f(cx + r * 1.0)},${f(cy - r * 0.36)} ${f(cx + r * 0.9)},${f(cy - r * 0.4)} Q${f(cx)},${f(cy - r * 0.56)} ${f(cx - r * 0.98)},${f(cy - r * 0.34)} Z" fill="${L.capCol}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
    s += `<path d="M${f(cx - r * 0.97)},${f(cy - r * 0.36)} Q${f(cx)},${f(cy - r * 0.58)} ${f(cx + r * 0.92)},${f(cy - r * 0.42)}" fill="none" stroke="#2c2f20" stroke-width="${f(r * 0.12)}" stroke-linecap="round"/>`;
    s += `<path d="M${f(cx - r * 0.97)},${f(cy - r * 0.36)} Q${f(cx)},${f(cy - r * 0.58)} ${f(cx + r * 0.92)},${f(cy - r * 0.42)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" transform="translate(0,${f(r * 0.07)})"/>`;
    s += `<path d="M${f(cx - r * 0.55)},${f(cy - r * 0.6)} l${f(r * 0.14)},${f(-r * 0.12)} l${f(r * 0.14)},${f(r * 0.12)} l${f(-r * 0.14)},${f(r * 0.13)} Z" fill="#d9b44a" stroke="${INK}" stroke-width="3"/>`;
    s += `<path d="M${f(cx - r * 0.4)},${f(cy - r * 1.0)} Q${f(cx)},${f(cy - r * 1.12)} ${f(cx + r * 0.4)},${f(cy - r * 1.04)}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="6" stroke-linecap="round"/>`;
  } else {
    // side cap (field cap), sitting on top of the hair, tilted
    s += `<path d="M${f(cx - r * 0.78)},${f(cy - r * 0.62)} L${f(cx - r * 0.6)},${f(cy - r * 1.12)} Q${f(cx + r * 0.1)},${f(cy - r * 1.22)} ${f(cx + r * 0.66)},${f(cy - r * 1.02)} L${f(cx + r * 0.82)},${f(cy - r * 0.58)} Q${f(cx)},${f(cy - r * 0.74)} ${f(cx - r * 0.78)},${f(cy - r * 0.62)} Z" fill="${L.capCol}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
    s += `<path d="M${f(cx - r * 0.76)},${f(cy - r * 0.74)} Q${f(cx)},${f(cy - r * 0.86)} ${f(cx + r * 0.8)},${f(cy - r * 0.7)}" fill="none" stroke="#5e4f2c" stroke-width="5"/>`;
  }
  return s;
};

/** a soldier; returns the svg and world-ish local joint positions (hands, head) for aligning props */
export const soldier = (L: SoldierLook, p: Pose) => {
  const r = 72, HIPY = p.hipY ?? -170, HIPX = p.hipX ?? 0, T1 = 80, T2 = 76, A1 = 78, A2 = 72;
  const torsoTop = HIPY - 155, cx = HIPX, lean = p.lean ?? 0;
  const hipB: P2 = [cx - 20, HIPY - 4], hipF: P2 = [cx + 20, HIPY - 4];
  const fB = p.footB ?? [-26, -24], fF = p.footF ?? [30, -24];
  const kB = ik(hipB, fB, T1, T2, 1), kF = ik(hipF, fF, T1, T2, 1);
  // torso pivot = hip centre; everything above rotates by lean
  const shB: P2 = [cx - 44, torsoTop + 22], shF: P2 = [cx + 44, torsoTop + 22];
  const [eB, hB, dB] = armOf(shB, p.armB, [-12, 10], p.reachB, A1, A2, 1), [eF, hF, dF] = armOf(shF, p.armF, [12, 14], p.reachF, A1, A2, -1);
  const hc: P2 = [cx + 4, torsoTop - 86];
  let s = "";
  s += limb([hipB, kB, [fB[0], fB[1]]], 28, L.trouD) + boot([fB[0], 0 + fB[1] + 24]);
  s += limb([hipF, kF, [fF[0], fF[1]]], 28, L.trou) + boot([fF[0], fF[1] + 24]);
  let up = "";
  up += limb([shB, eB, hB], 24, L.uniD) + mitt(hB, dB, 15, L.skinD);
  up += `<path d="M${f(cx - 54)},${f(torsoTop)} L${f(cx + 54)},${f(torsoTop)} L${f(cx + 48)},${f(HIPY + 6)} L${f(cx - 48)},${f(HIPY + 6)} Z" fill="${L.uni}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  up += `<path d="M${f(cx + 12)},${f(torsoTop)} L${f(cx + 54)},${f(torsoTop)} L${f(cx + 48)},${f(HIPY + 6)} L${f(cx + 22)},${f(HIPY + 6)} Z" fill="${L.uniD}" opacity="0.5"/>`;
  // battledress: collar, two chest pockets with flaps, belt with brass buckle, shoulder straps
  up += `<path d="M${f(cx - 26)},${f(torsoTop)} L${f(cx)},${f(torsoTop + 26)} L${f(cx + 26)},${f(torsoTop)} Z" fill="${L.skin}" stroke="${INK}" stroke-width="4"/>`;
  up += `<path d="M${f(cx - 34)},${f(torsoTop - 2)} L${f(cx - 4)},${f(torsoTop + 26)} L${f(cx - 18)},${f(torsoTop + 38)} L${f(cx - 42)},${f(torsoTop + 10)} Z M${f(cx + 34)},${f(torsoTop - 2)} L${f(cx + 4)},${f(torsoTop + 26)} L${f(cx + 18)},${f(torsoTop + 38)} L${f(cx + 42)},${f(torsoTop + 10)} Z" fill="${L.uniD}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
  [-1, 1].forEach((k) => (up += `<rect x="${f(cx + k * 26 - 15)}" y="${f(torsoTop + 46)}" width="30" height="30" rx="3" fill="${L.uni}" stroke="${INK}" stroke-width="3.5"/><path d="M${f(cx + k * 26 - 16)},${f(torsoTop + 46)} h32 l-4,12 h-24 Z" fill="${L.uniD}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`));
  up += `<rect x="${f(cx - 52)}" y="${f(HIPY - 30)}" width="104" height="18" fill="#6e5a35" stroke="${INK}" stroke-width="4"/><rect x="${f(cx - 11)}" y="${f(HIPY - 33)}" width="22" height="24" rx="3" fill="#d9b44a" stroke="${INK}" stroke-width="3.5"/>`;
  up += `<path d="M${f(cx)},${f(torsoTop + 26)} V${f(HIPY - 32)}" stroke="${L.uniD}" stroke-width="4"/>`;
  // white-red Poland shoulder flash on the back sleeve top
  up += soldierHead(L, hc[0], hc[1], r, p);
  let hold = "";
  if (p.hold === "bottle") {
    hold = `<g transform="translate(${f(hF[0])},${f(hF[1])}) rotate(${f(-(p.holdDeg ?? dF))})"><rect x="-13" y="-8" width="26" height="62" rx="9" fill="rgba(200,230,215,0.75)" stroke="${INK}" stroke-width="4.5"/><rect x="-11" y="14" width="22" height="38" rx="7" fill="#f6f1e4"/><rect x="-7" y="54" width="14" height="14" rx="3" fill="#d9a35a" stroke="${INK}" stroke-width="3.5"/><path d="M-4,68 Q0,82 4,68" fill="#d9a35a" stroke="${INK}" stroke-width="3"/><rect x="-14" y="22" width="28" height="18" fill="#c94a3c" stroke="${INK}" stroke-width="3"/></g>`;
  }
  up += limb([shF, eF, hF], 24, L.uni) + hold + mitt(hF, dF, 15, L.skin);
  s += `<g transform="rotate(${f(lean)} ${f(cx)} ${f(HIPY)})">${up}</g>`;
  // where the hand is after the lean (for props)
  const rot = (q: P2): P2 => { const c = Math.cos(rad(lean)), sn = Math.sin(rad(lean)), x = q[0] - cx, y = q[1] - HIPY; return [cx + x * c - y * sn, HIPY + x * sn + y * c]; };
  const tip = p.hold === "bottle" ? rot([hF[0] + Math.sin(rad(p.holdDeg ?? dF)) * 78, hF[1] + Math.cos(rad(p.holdDeg ?? dF)) * 78]) : rot(hF);
  return { svg: s, handF: rot(hF), handB: rot(hB), tip, head: rot(hc) };
};

// ------------------------------------------------------------------ bear
const BR = "#8d5a33", BR_D = "#6c4224", BR_L = "#c9925c", MUZ = "#e2bf92", NOSE = "#2a1d18";
/** Wojtek. age 0 (small cub) .. 1 (adult). Upright, faces +x. sit: legs stick forward on the ground. */
export const bear = (p: Pose & { age: number; sit?: boolean }) => {
  const ag = clamp01(p.age), hr = lerp(62, 84, ag), bodyH = lerp(110, 250, ag), bodyW = lerp(62, 118, ag), legL = lerp(32, 62, ag), armL = lerp(44, 84, ag);
  const sit = !!p.sit, HIPY = p.hipY ?? (sit ? -lerp(30, 56, ag) : -(legL * 1.75)), cx = p.hipX ?? 0, lean = p.lean ?? 0;
  const top = HIPY - bodyH, lw = lerp(24, 40, ag), aw = lerp(22, 38, ag);
  let s = "";
  const hipB: P2 = [cx - bodyW * 0.42, HIPY - 10], hipF: P2 = [cx + bodyW * 0.38, HIPY - 10];
  const paw = (q: P2, rr: number, col: string, flat = false) => `<ellipse cx="${f(q[0] + (flat ? rr * 0.3 : 0))}" cy="${f(q[1])}" rx="${f(rr * (flat ? 1.25 : 1))}" ry="${f(rr * (flat ? 0.7 : 1))}" fill="${col}" stroke="${INK}" stroke-width="5"/>` +
    [-1, 0, 1].map((k) => `<path d="M${f(q[0] + (flat ? rr * 1.1 : rr * 0.55) + (flat ? 0 : k * 2))},${f(q[1] + k * rr * 0.38)} l${f(rr * 0.35)},0" stroke="#efe6d6" stroke-width="3.5" stroke-linecap="round"/>`).join("");
  if (sit) {
    const fB: P2 = [cx + bodyW * 0.55, -lw * 0.5], fF: P2 = [cx + bodyW * 0.9, -lw * 0.5];
    s += limb([hipB, fB], lw, BR_D) + paw(fB, lw * 0.62, BR_D, true);
    s += limb([hipF, fF], lw, BR) + paw(fF, lw * 0.62, MUZ, true);
  } else {
    const fB = p.footB ?? [cx - bodyW * 0.32, 0], fF = p.footF ?? [cx + bodyW * 0.38, 0];
    const kB = ik(hipB, [fB[0], fB[1] - lw * 0.4], legL, legL * 0.85, 1), kF = ik(hipF, [fF[0], fF[1] - lw * 0.4], legL, legL * 0.85, 1);
    s += limb([hipB, kB, [fB[0], fB[1] - lw * 0.4]], lw, BR_D) + paw([fB[0] + lw * 0.2, fB[1] - lw * 0.38], lw * 0.62, BR_D, true);
    s += limb([hipF, kF, [fF[0], fF[1] - lw * 0.4]], lw, BR) + paw([fF[0] + lw * 0.2, fF[1] - lw * 0.38], lw * 0.62, BR, true);
  }
  const shB: P2 = [cx - bodyW * 0.55, top + bodyH * 0.2], shF: P2 = [cx + bodyW * 0.5, top + bodyH * 0.2];
  const [eB, hB] = armOf(shB, p.armB, [-18, 20], p.reachB, armL, armL * 0.9, 1), [eF, hF] = armOf(shF, p.armF, [18, 18], p.reachF, armL, armL * 0.9, -1);
  let up = limb([shB, eB, hB], aw, BR_D) + paw(hB, aw * 0.62, BR_D);
  // pear body, flat belly patch, shoulder hump
  const body = `M${f(cx - bodyW * 0.62)},${f(top + bodyH * 0.18)} Q${f(cx - bodyW * 0.5)},${f(top - bodyH * 0.06)} ${f(cx)},${f(top - bodyH * 0.04)} Q${f(cx + bodyW * 0.55)},${f(top - bodyH * 0.05)} ${f(cx + bodyW * 0.6)},${f(top + bodyH * 0.2)} Q${f(cx + bodyW * 1.02)},${f(HIPY - bodyH * 0.25)} ${f(cx + bodyW * 0.7)},${f(HIPY)} Q${f(cx)},${f(HIPY + bodyH * 0.12)} ${f(cx - bodyW * 0.74)},${f(HIPY)} Q${f(cx - bodyW * 1.04)},${f(HIPY - bodyH * 0.25)} ${f(cx - bodyW * 0.62)},${f(top + bodyH * 0.18)} Z`;
  up += `<path d="${body}" fill="${BR}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`;
  up += `<path d="M${f(cx + bodyW * 0.1)},${f(top + bodyH * 0.12)} Q${f(cx + bodyW * 0.95)},${f(HIPY - bodyH * 0.35)} ${f(cx + bodyW * 0.55)},${f(HIPY - 2)} L${f(cx + bodyW * 0.7)},${f(HIPY)} Q${f(cx + bodyW * 1.02)},${f(HIPY - bodyH * 0.25)} ${f(cx + bodyW * 0.6)},${f(top + bodyH * 0.2)} Z" fill="${BR_D}" opacity="0.45"/>`;
  up += `<ellipse cx="${f(cx + bodyW * 0.08)}" cy="${f(HIPY - bodyH * 0.4)}" rx="${f(bodyW * 0.44)}" ry="${f(bodyH * 0.32)}" fill="${BR_L}" stroke="${INK}" stroke-width="4"/>`;
  [0, 1, 2].forEach((i) => (up += `<path d="M${f(cx - bodyW * 0.2 + i * bodyW * 0.18)},${f(HIPY - bodyH * 0.55 + (i % 2) * 8)} l${f(bodyW * 0.06)},${f(bodyH * 0.06)}" stroke="${BR}" stroke-width="3.5" stroke-linecap="round"/>`));
  // head
  const hcx = cx + bodyW * 0.12, hcy = top - hr * 0.62, ears = (p.ears ?? 0) * 8, tilt = p.headTilt ?? 0;
  let h = "";
  [-1, 1].forEach((k) => {
    const ex = hcx + k * hr * 0.68, ey = hcy - hr * 0.72 - (k > 0 ? ears : -ears * 0.5);
    h += `<circle cx="${f(ex)}" cy="${f(ey)}" r="${f(hr * 0.3)}" fill="${BR}" stroke="${INK}" stroke-width="6"/><circle cx="${f(ex)}" cy="${f(ey + 3)}" r="${f(hr * 0.15)}" fill="${MUZ}"/>`;
  });
  h += `<ellipse cx="${f(hcx)}" cy="${f(hcy)}" rx="${f(hr * 1.02)}" ry="${f(hr * 0.94)}" fill="${BR}" stroke="${INK}" stroke-width="6.5"/>`;
  h += `<path d="M${f(hcx + hr * 0.5)},${f(hcy - hr * 0.75)} A${f(hr)},${f(hr * 0.94)} 0 0 1 ${f(hcx + hr * 0.5)},${f(hcy + hr * 0.76)} A${f(hr * 1.3)},${f(hr * 1.2)} 0 0 0 ${f(hcx + hr * 0.5)},${f(hcy - hr * 0.75)} Z" fill="${BR_D}" opacity="0.45"/>`;
  // face, pushed toward the facing side
  const fx = hcx + hr * 0.16, ex = p.expr ?? "smile", bl = p.blink ?? 0, eY = hcy - hr * 0.12, lk = (p.look ?? 0) * 3;
  const cheeks = p.cheeks ?? 0;
  [-1, 1].forEach((k) => {
    const x = fx + k * hr * 0.34 + lk;
    if (ex === "happy" || bl > 0.6) h += `<path d="M${f(x - hr * 0.1)},${f(eY + 3)} Q${f(x)},${f(eY - hr * (ex === "happy" ? 0.13 : -0.06))} ${f(x + hr * 0.1)},${f(eY + 3)}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`;
    else if (ex === "shock") h += `<ellipse cx="${f(x)}" cy="${f(eY)}" rx="${f(hr * 0.14)}" ry="${f(hr * 0.17)}" fill="#fff" stroke="${INK}" stroke-width="4.5"/><circle cx="${f(x)}" cy="${f(eY + 2)}" r="${f(hr * 0.06)}" fill="${INK}"/>`;
    else h += `<ellipse cx="${f(x)}" cy="${f(eY)}" rx="${f(hr * 0.075)}" ry="${f(hr * 0.1)}" fill="${INK}"/><circle cx="${f(x + 2)}" cy="${f(eY - 3)}" r="2.2" fill="#fff"/>`;
    const lift = ex === "proud" ? hr * 0.02 : ex === "grit" ? -hr * 0.05 : ex === "shock" ? hr * 0.12 : 0;
    h += `<path d="M${f(x - k * hr * 0.12)},${f(eY - hr * 0.2 - lift + (ex === "grit" ? k * -5 : 0))} L${f(x + k * hr * 0.12)},${f(eY - hr * 0.23 - lift + (ex === "grit" ? k * 5 : 0))}" stroke="${BR_D}" stroke-width="${f(hr * 0.08)}" stroke-linecap="round"/>`;
  });
  // muzzle with cheek puff (sucking the bottle)
  const mx = fx + hr * 0.08, my = hcy + hr * 0.3, mw = hr * (0.42 + cheeks * 0.08);
  h += `<ellipse cx="${f(mx)}" cy="${f(my)}" rx="${f(mw)}" ry="${f(hr * 0.3)}" fill="${MUZ}" stroke="${INK}" stroke-width="5"/>`;
  h += `<path d="M${f(mx - hr * 0.13)},${f(my - hr * 0.16)} Q${f(mx)},${f(my - hr * 0.26)} ${f(mx + hr * 0.13)},${f(my - hr * 0.16)} Q${f(mx + hr * 0.1)},${f(my - hr * 0.04)} ${f(mx)},${f(my - hr * 0.03)} Q${f(mx - hr * 0.1)},${f(my - hr * 0.04)} ${f(mx - hr * 0.13)},${f(my - hr * 0.16)} Z" fill="${NOSE}"/>`;
  h += `<ellipse cx="${f(mx - hr * 0.04)}" cy="${f(my - hr * 0.19)}" rx="${f(hr * 0.04)}" ry="${f(hr * 0.02)}" fill="rgba(255,255,255,0.5)"/>`;
  const t = p.talk ?? 0;
  if (ex === "happy" || ex === "shock" || t > 0.2) h += `<path d="M${f(mx - hr * 0.2)},${f(my + hr * 0.04)} Q${f(mx)},${f(my + hr * 0.08)} ${f(mx + hr * 0.2)},${f(my + hr * 0.04)} Q${f(mx + hr * 0.14)},${f(my + hr * (0.24 + 0.1 * t))} ${f(mx)},${f(my + hr * (0.26 + 0.1 * t))} Q${f(mx - hr * 0.14)},${f(my + hr * (0.24 + 0.1 * t))} ${f(mx - hr * 0.2)},${f(my + hr * 0.04)} Z" fill="#6a2430" stroke="${INK}" stroke-width="4"/><ellipse cx="${f(mx + 2)}" cy="${f(my + hr * 0.2)}" rx="${f(hr * 0.09)}" ry="${f(hr * 0.05)}" fill="#e7787f"/>`;
  else h += `<path d="M${f(mx)},${f(my - hr * 0.03)} V${f(my + hr * 0.08)} M${f(mx - hr * 0.15)},${f(my + hr * 0.06)} Q${f(mx - hr * 0.07)},${f(my + hr * 0.15)} ${f(mx)},${f(my + hr * 0.08)} Q${f(mx + hr * 0.07)},${f(my + hr * 0.15)} ${f(mx + hr * 0.15)},${f(my + hr * 0.06)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  up += `<g transform="rotate(${f(tilt)} ${f(hcx)} ${f(hcy + hr * 0.8)})">${h}</g>`;
  up += limb([shF, eF, hF], aw, BR) + paw(hF, aw * 0.62, BR);
  s += `<g transform="rotate(${f(lean)} ${f(cx)} ${f(HIPY)})">${up}</g>`;
  const rot = (q: P2): P2 => { const c = Math.cos(rad(lean)), sn = Math.sin(rad(lean)), x = q[0] - cx, y = q[1] - HIPY; return [cx + x * c - y * sn, HIPY + x * sn + y * c]; };
  return { svg: s, mouth: rot([mx + hr * 0.3, my + hr * 0.08]), handF: rot(hF), handB: rot(hB), head: rot([hcx, hcy]), height: -(hcy - hr) };
};

/** place a rig: x, y = ground point in the scene, s = scale, flip mirrors */
export const place = (svg: string, x: number, y: number, s: number, flip = false, shadowW = 0) =>
  (shadowW ? `<ellipse cx="${f(x)}" cy="${f(y + 2)}" rx="${f(shadowW * s)}" ry="${f(12 * s)}" fill="rgba(60,40,20,0.28)"/>` : "") +
  `<g transform="translate(${f(x)},${f(y)}) scale(${f(flip ? -s : s)},${f(s)})">${svg}</g>`;
/** scene point of a local rig point */
export const at = (q: P2, x: number, y: number, s: number, flip = false): P2 => [x + (flip ? -1 : 1) * q[0] * s, y + q[1] * s];
