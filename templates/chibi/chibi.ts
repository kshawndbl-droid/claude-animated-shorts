// An original chibi character rig drawn in Canvas2D: a big round head, a small rounded body, soft cel shading and a thin
// dark outline. Every limb, the eyes and the mouth are posed per frame, so characters really animate.
// Units: the character stands on y=0, about 1.0 tall (head included), facing +x. Scale and translate outside.
type Ctx = CanvasRenderingContext2D;

export type ChibiLook = {
  skin: string; hair: string; hairStyle: "long" | "curly" | "snakes" | "short" | "bald" | "wild";
  beard?: "none" | "full" | "long"; beardCol?: string;
  robe: string; robe2?: string; trim?: string; skirtLen?: number;   // skirtLen: 0 tunic .. 1 to the ankles
  helmet?: "none" | "crest" | "winged" | "crown" | "coral"; helmetCol?: string; crestCol?: string;
  cloak?: string; armor?: string; female?: boolean; scale?: number; eye?: string; glowEyes?: string;
};
export type ChibiPose = {
  x?: number; lean?: number; squash?: number; hop?: number; walk?: number; phase?: number;   // walk 0..1 blends a walk cycle
  armL?: [number, number]; armR?: [number, number];   // shoulder, elbow angles (0 = hanging down, + forward/up)
  legL?: [number, number]; legR?: [number, number];
  headTilt?: number; look?: number; lookY?: number;
  eyes?: "open" | "closed" | "angry" | "wide" | "sad" | "happy" | "sleep" | "glow";
  mouth?: "smile" | "open" | "o" | "frown" | "teeth" | "flat" | "grin" | "scream";
  blush?: number; sweat?: number; talk?: number; stone?: number;
  holdR?: "spear" | "sword" | "harpe" | "trident" | "bag" | "none"; holdL?: "shield" | "none" | "bag";
};

const OUT = "#2a1a16";
const mix = (a: string, b: string, k: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k);
  return "#" + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
};
const shade = (c: string, k = 0.28) => mix(c, "#1a1030", k);
const light = (c: string, k = 0.25) => mix(c, "#fff6e8", k);

function fillOut(g: Ctx, p: Path2D, col: string, lw: number, shadeCol?: string, shadeDir = 1) {
  g.fillStyle = col; g.fill(p);
  if (shadeCol) { // soft cel shadow on the far side
    g.save(); g.clip(p); const b = 0.6; const gr = g.createLinearGradient(-b * shadeDir, 0, b * shadeDir, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.55, "rgba(0,0,0,0)"); gr.addColorStop(0.56, shadeCol); gr.addColorStop(1, shadeCol);
    g.fillStyle = gr; g.globalAlpha = 0.55; g.fillRect(-2, -2, 4, 4); g.restore();
  }
  g.strokeStyle = OUT; g.lineWidth = lw; g.lineJoin = "round"; g.stroke(p);
}
function limb(g: Ctx, x0: number, y0: number, a1: number, l1: number, a2: number, l2: number, w: number, col: string, lw: number, end: string, endR: number) {
  const x1 = x0 + Math.sin(a1) * l1, y1 = y0 - Math.cos(a1) * l1 * -1;
  const x2 = x1 + Math.sin(a1 + a2) * l2, y2 = y1 + Math.cos(a1 + a2) * l2;
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = OUT; g.lineWidth = w + lw * 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  g.fillStyle = end; g.beginPath(); g.arc(x2, y2, endR, 0, 7); g.fill(); g.strokeStyle = OUT; g.lineWidth = lw; g.stroke();
  return [x2, y2];
}

/** draw a chibi. t = time (for idle motion), s = pixels per unit (keeps line width constant) */
export function drawChibi(g: Ctx, L: ChibiLook, P: ChibiPose, t: number, s: number) {
  const lw = 3.2 / s, k = L.scale ?? 1;
  const walk = P.walk ?? 0, ph = (P.phase ?? t * 7);
  const step = Math.sin(ph) * walk, bob = Math.abs(Math.cos(ph)) * 0.025 * walk;
  const sq = (P.squash ?? 0) + Math.sin(t * 2.2) * 0.012;
  g.save(); g.scale(k, k); g.translate(P.x ?? 0, -(P.hop ?? 0) - bob);
  const stone = P.stone ?? 0;
  const C = (c: string) => stone > 0 ? mix(c, mix("#9a968e", c, 0.0), stone) : c;
  const skin = C(L.skin), robe = C(L.robe), hair = C(L.hair);
  // ---- legs (behind the body) ----
  const legL = P.legL ?? [step * 0.6, Math.max(0, -step) * 0.6], legR = P.legR ?? [-step * 0.6, Math.max(0, step) * 0.6];
  const sandal = C("#7a4a2a");
  limb(g, -0.06, -0.2, legL[0], 0.1, legL[1], 0.09, 0.07, skin, lw, sandal, 0.04);
  limb(g, 0.06, -0.2, legR[0], 0.1, legR[1], 0.09, 0.07, skin, lw, sandal, 0.04);
  g.save(); g.translate(0, -0.2); g.scale(1 + sq, 1 - sq); g.rotate(P.lean ?? 0);
  // ---- back arm ----
  const aL = P.armL ?? [0.15 - step * 0.5, 0.3], aR = P.armR ?? [0.15 + step * 0.5, 0.3];
  const handL = limb(g, -0.11, -0.2, -aL[0], 0.09, -aL[1], 0.08, 0.065, C(L.cloak ?? robe), lw, skin, 0.042);
  if (P.holdL === "shield") { g.save(); g.translate(handL[0] - 0.02, handL[1]); const sp = new Path2D(); sp.arc(0, 0, 0.15, 0, 7); fillOut(g, sp, C("#c08a3a"), lw, shade(C("#c08a3a"))); const s2 = new Path2D(); s2.arc(0, 0, 0.11, 0, 7); g.strokeStyle = C("#8a5a20"); g.lineWidth = lw; g.stroke(s2); g.fillStyle = C("#e8c070"); g.beginPath(); g.arc(-0.04, -0.05, 0.03, 0, 7); g.fill(); g.restore(); }
  if (L.cloak) { const cp = new Path2D(); cp.moveTo(-0.12, -0.24); cp.quadraticCurveTo(-0.26 - step * 0.03, -0.1, -0.2 - Math.sin(t * 3) * 0.02, 0.02); cp.lineTo(0.0, 0.0); cp.lineTo(0.04, -0.25); cp.closePath(); fillOut(g, cp, C(L.cloak), lw, shade(C(L.cloak))); }
  // ---- body: a rounded robe / tunic ----
  const sl = 0.02 + (L.skirtLen ?? 0.4) * 0.16;
  const body = new Path2D(); body.moveTo(-0.1, -0.27); body.quadraticCurveTo(-0.14, -0.12, -0.15 - sl * 0.25, sl); body.lineTo(0.15 + sl * 0.25, sl); body.quadraticCurveTo(0.14, -0.12, 0.1, -0.27); body.quadraticCurveTo(0, -0.3, -0.1, -0.27); body.closePath();
  fillOut(g, body, robe, lw, shade(robe), 1);
  if (L.armor) { const ar = new Path2D(); ar.moveTo(-0.11, -0.25); ar.quadraticCurveTo(0, -0.29, 0.11, -0.25); ar.lineTo(0.12, -0.08); ar.quadraticCurveTo(0, -0.05, -0.12, -0.08); ar.closePath(); fillOut(g, ar, C(L.armor), lw, shade(C(L.armor))); g.strokeStyle = shade(C(L.armor), 0.4); g.lineWidth = lw * 0.8; g.beginPath(); g.moveTo(-0.07, -0.17); g.quadraticCurveTo(0, -0.14, 0.07, -0.17); g.stroke(); }
  if (L.trim) { g.strokeStyle = C(L.trim); g.lineWidth = lw * 2; g.beginPath(); g.moveTo(-0.14 - sl * 0.2, sl - 0.015); g.lineTo(0.14 + sl * 0.2, sl - 0.015); g.stroke(); g.beginPath(); g.moveTo(-0.13, -0.08); g.quadraticCurveTo(0, -0.05, 0.13, -0.08); g.stroke(); }
  // ---- front arm + held props ----
  const handR = limb(g, 0.11, -0.2, aR[0], 0.09, aR[1], 0.08, 0.065, C(L.cloak && !L.armor ? robe : robe), lw, skin, 0.042);
  const hold = P.holdR ?? "none"; const ha = aR[0] + aR[1];
  if (hold !== "none") { g.save(); g.translate(handR[0], handR[1]); g.rotate(-ha + Math.PI);
    if (hold === "spear" || hold === "trident") { g.strokeStyle = OUT; g.lineWidth = 0.03 + lw * 2; g.beginPath(); g.moveTo(0, 0.25); g.lineTo(0, -0.42); g.stroke(); g.strokeStyle = C("#8a5a30"); g.lineWidth = 0.03; g.stroke();
      const tip = new Path2D(); if (hold === "spear") { tip.moveTo(-0.035, -0.4); tip.lineTo(0, -0.52); tip.lineTo(0.035, -0.4); tip.closePath(); } else { for (const dx of [-0.07, 0, 0.07]) { tip.moveTo(dx - 0.015, -0.4); tip.lineTo(dx, -0.52); tip.lineTo(dx + 0.015, -0.4); } tip.rect(-0.08, -0.42, 0.16, 0.03); }
      fillOut(g, tip, C("#d8c070"), lw); }
    if (hold === "sword" || hold === "harpe") { const b = new Path2D(); b.moveTo(-0.018, -0.03); b.lineTo(-0.018, -0.3); if (hold === "harpe") { b.quadraticCurveTo(-0.02, -0.38, 0.06, -0.38); b.quadraticCurveTo(0.12, -0.37, 0.12, -0.31); b.quadraticCurveTo(0.08, -0.35, 0.04, -0.34); b.quadraticCurveTo(0.018, -0.33, 0.018, -0.28); } else b.lineTo(0, -0.34); b.lineTo(0.018, -0.03); b.closePath();
      fillOut(g, b, C("#dfe6ea"), lw); g.fillStyle = C("#c9a13e"); g.fillRect(-0.05, -0.04, 0.1, 0.025); g.strokeStyle = OUT; g.lineWidth = lw; g.strokeRect(-0.05, -0.04, 0.1, 0.025); }
    if (hold === "bag") { const b = new Path2D(); b.moveTo(-0.06, 0.02); b.quadraticCurveTo(-0.1, 0.16, 0, 0.17); b.quadraticCurveTo(0.1, 0.16, 0.06, 0.02); b.closePath(); fillOut(g, b, C("#8a5a2e"), lw, shade(C("#8a5a2e"))); }
    g.restore(); }
  g.restore();
  // ---- head ----
  g.save(); g.translate(0, -0.47 - sq * 0.1); g.rotate((P.headTilt ?? 0) + Math.sin(t * 1.6) * 0.02);
  const R = 0.22;
  // hair behind the head
  if (L.hairStyle === "long") { const hb = new Path2D(); hb.moveTo(-R * 0.9, -R * 0.4); hb.quadraticCurveTo(-R * 1.35, R * 0.8, -R * 1.0 + Math.sin(t * 2) * 0.01, R * 1.55); hb.quadraticCurveTo(-R * 0.2, R * 1.7, R * 0.2, R * 1.2); hb.quadraticCurveTo(R * 0.5, R * 0.6, R * 0.9, -R * 0.2); hb.closePath(); fillOut(g, hb, hair, lw, shade(hair)); }
  if (L.hairStyle === "snakes") snakeHair(g, R, t, lw, C, true);
  const head = new Path2D(); head.ellipse(0, 0, R * 1.02, R, 0, 0, 7);
  fillOut(g, head, skin, lw, shade(skin, 0.22), 1);
  // ear
  const ear = new Path2D(); ear.ellipse(-R * 0.72, R * 0.12, R * 0.14, R * 0.18, 0, 0, 7); if (!["long", "snakes"].includes(L.hairStyle)) fillOut(g, ear, skin, lw);
  // face: eyes, brows, mouth, cheeks (on the +x side, three-quarter)
  face(g, L, P, R, t, lw, skin);
  // beard
  if (L.beard && L.beard !== "none") { const bc = C(L.beardCol ?? L.hair); const bd = new Path2D(); const ln = L.beard === "long" ? 0.75 : 0.45; bd.moveTo(-R * 0.62, R * 0.15); bd.quadraticCurveTo(-R * 0.5, R * (0.9 + ln), R * 0.2, R * (1.0 + ln)); bd.quadraticCurveTo(R * 0.85, R * (0.8 + ln * 0.6), R * 0.95, R * 0.25); bd.quadraticCurveTo(R * 0.6, R * 0.62, R * 0.38, R * 0.55); bd.quadraticCurveTo(R * 0.1, R * 0.62, -R * 0.62, R * 0.15); bd.closePath(); fillOut(g, bd, bc, lw, shade(bc)); const mo = P.mouth ?? "flat"; if (mo !== "flat") { g.fillStyle = "#5a2020"; g.beginPath(); g.ellipse(R * 0.42, R * 0.62, R * 0.12, R * (mo === "open" || mo === "scream" || mo === "o" ? 0.1 : 0.03), 0, 0, 7); g.fill(); } }
  // hair on top
  hairTop(g, L, R, t, lw, hair);
  if (L.hairStyle === "snakes") snakeHair(g, R, t, lw, C, false);
  helmet(g, L, R, t, lw, C);
  g.restore();
  // stone cracks
  if (stone > 0.5) { g.strokeStyle = `rgba(40,36,32,${(stone - 0.5) * 1.6})`; g.lineWidth = lw * 0.8; g.beginPath(); g.moveTo(-0.08, -0.62); g.lineTo(-0.02, -0.52); g.lineTo(-0.06, -0.44); g.moveTo(0.05, -0.25); g.lineTo(0.02, -0.15); g.lineTo(0.07, -0.08); g.stroke(); }
  g.restore();
}

function face(g: Ctx, L: ChibiLook, P: ChibiPose, R: number, t: number, lw: number, skin: string) {
  const ex = [R * 0.12, R * 0.62], ey = R * 0.02, lk = (P.look ?? 0) * R * 0.06, lky = (P.lookY ?? 0) * R * 0.05;
  const blinkT = (t * 0.31 + (L.skin.charCodeAt(2) % 7) * 0.13) % 1; let eyes = P.eyes ?? "open";
  if (eyes === "open" && blinkT < 0.035) eyes = "closed";
  g.lineCap = "round";
  for (let i = 0; i < 2; i++) {
    const x = ex[i], far = i === 1, w = far ? R * 0.15 : R * 0.19, h = far ? R * 0.22 : R * 0.26;
    if (eyes === "closed" || eyes === "sleep" || eyes === "happy") {
      g.strokeStyle = OUT; g.lineWidth = lw * 1.6; g.beginPath();
      if (eyes === "happy") g.arc(x, ey + h * 0.2, w * 0.8, Math.PI * 1.1, Math.PI * 1.9); else g.arc(x, ey - h * 0.1, w * 0.8, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke(); continue;
    }
    const hh = eyes === "angry" ? h * 0.75 : eyes === "wide" ? h * 1.15 : eyes === "sad" ? h * 0.9 : h;
    g.fillStyle = "#fffaf2"; g.beginPath(); g.ellipse(x, ey, w, hh, 0, 0, 7); g.fill(); g.strokeStyle = OUT; g.lineWidth = lw; g.stroke();
    const ic = eyes === "glow" ? (L.glowEyes ?? "#9cff6a") : (L.eye ?? "#3a2a22");
    g.fillStyle = ic; g.beginPath(); g.ellipse(x + lk + w * 0.15, ey + lky + hh * 0.08, w * (eyes === "wide" ? 0.5 : 0.65), hh * (eyes === "wide" ? 0.55 : 0.72), 0, 0, 7); g.fill();
    if (eyes !== "glow") { g.fillStyle = "#120a08"; g.beginPath(); g.ellipse(x + lk + w * 0.18, ey + lky + hh * 0.12, w * 0.32, hh * 0.4, 0, 0, 7); g.fill(); }
    else { g.save(); g.globalCompositeOperation = "lighter"; const gg = g.createRadialGradient(x, ey, 0, x, ey, w * 3); gg.addColorStop(0, "rgba(160,255,110,0.9)"); gg.addColorStop(1, "rgba(160,255,110,0)"); g.fillStyle = gg; g.fillRect(x - w * 3, ey - w * 3, w * 6, w * 6); g.restore(); }
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x + lk - w * 0.1, ey + lky - hh * 0.3, w * 0.22, 0, 7); g.fill();
    // lids for moods
    if (eyes === "angry") { g.fillStyle = skin; g.beginPath(); g.moveTo(x - w * 1.3, ey - hh * 1.4); g.lineTo(x + w * 1.3, ey - hh * 1.4); g.lineTo(x + (far ? -w : w) * 1.2, ey - hh * (far ? 0.2 : 0.2)); g.closePath(); g.fill(); }
    if (eyes === "sad") { g.fillStyle = skin; g.beginPath(); g.moveTo(x - w * 1.3, ey - hh * 1.4); g.lineTo(x + w * 1.3, ey - hh * 1.4); g.lineTo(x + (far ? w : -w) * 1.2, ey - hh * 0.35); g.closePath(); g.fill(); }
    if (L.female) { g.strokeStyle = OUT; g.lineWidth = lw * 1.2; g.beginPath(); g.moveTo(x + w * 0.7, ey - hh * 0.75); g.lineTo(x + w * 1.15, ey - hh * 1.0); g.stroke(); }
    // brows
    g.strokeStyle = OUT; g.lineWidth = lw * 1.5; g.beginPath();
    const by = ey - h * 1.35; const tilt = eyes === "angry" ? (far ? -1 : 1) * R * 0.08 : eyes === "sad" ? (far ? 1 : -1) * R * 0.07 : 0;
    g.moveTo(x - w * 0.9, by - tilt); g.lineTo(x + w * 0.9, by + tilt); g.stroke();
  }
  // nose: a tiny tick
  g.strokeStyle = shade(skin, 0.45); g.lineWidth = lw; g.beginPath(); g.moveTo(R * 0.4, R * 0.22); g.lineTo(R * 0.45, R * 0.3); g.stroke();
  // mouth
  let mo = P.mouth ?? "flat"; if ((P.talk ?? 0) > 0 && Math.sin(t * 22) > 0.1) mo = mo === "smile" ? "open" : "o";
  const mx = R * 0.38, my = R * 0.52;
  g.strokeStyle = OUT; g.lineWidth = lw * 1.3; g.fillStyle = "#7a2a2a";
  if (mo === "smile" || mo === "grin") { g.beginPath(); g.arc(mx, my - R * 0.08, R * (mo === "grin" ? 0.16 : 0.12), Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
  else if (mo === "flat") { g.beginPath(); g.moveTo(mx - R * 0.09, my); g.lineTo(mx + R * 0.09, my); g.stroke(); }
  else if (mo === "frown") { g.beginPath(); g.arc(mx, my + R * 0.1, R * 0.11, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  else { const ow = mo === "o" ? 0.07 : mo === "scream" ? 0.13 : 0.11, oh = mo === "o" ? 0.08 : mo === "scream" ? 0.16 : 0.08; g.beginPath(); g.ellipse(mx, my, R * ow, R * oh, 0, 0, 7); g.fill(); g.stroke();
    if (mo === "teeth" || mo === "scream") { g.fillStyle = "#fff"; g.fillRect(mx - R * ow * 0.8, my - R * oh * 0.9, R * ow * 1.6, R * oh * 0.45); } }
  // cheeks and sweat
  const bl = (P.blush ?? (L.female ? 0.5 : 0.25)); if (bl > 0) { g.fillStyle = `rgba(240,120,120,${0.35 * bl})`; for (const x of [R * 0.05, R * 0.75]) { g.beginPath(); g.ellipse(x, R * 0.38, R * 0.12, R * 0.07, 0, 0, 7); g.fill(); } }
  if ((P.sweat ?? 0) > 0) { g.fillStyle = `rgba(160,210,255,${P.sweat})`; const sy = (t * 0.3) % 1; g.beginPath(); g.ellipse(-R * 0.35, -R * 0.4 + sy * R * 0.4, R * 0.06, R * 0.1, 0, 0, 7); g.fill(); g.strokeStyle = OUT; g.lineWidth = lw * 0.7; g.stroke(); }
}

function hairTop(g: Ctx, L: ChibiLook, R: number, t: number, lw: number, col: string) {
  const st = L.hairStyle; if (st === "bald" || st === "snakes") return;
  const p = new Path2D();
  if (st === "long") { p.moveTo(-R * 1.05, R * 0.3); p.quadraticCurveTo(-R * 1.2, -R * 1.2, R * 0.2, -R * 1.08); p.quadraticCurveTo(R * 1.05, -R * 0.95, R * 1.02, -R * 0.1); p.quadraticCurveTo(R * 0.7, -R * 0.55, R * 0.2, -R * 0.5); p.quadraticCurveTo(-R * 0.35, -R * 0.45, -R * 0.55, R * 0.4); p.closePath(); }
  else if (st === "curly") { for (let i = 0; i < 9; i++) { const a = Math.PI * (0.95 + i * 0.13); p.moveTo(Math.cos(a) * R * 0.95 + R * 0.16, Math.sin(a) * R * 0.95); p.arc(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, R * 0.19, 0, 7); } p.ellipse(-R * 0.1, -R * 0.55, R * 0.9, R * 0.5, 0, 0, 7); }
  else if (st === "wild") { p.moveTo(-R * 1.1, R * 0.4); for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.85 + i * 0.14); const r = R * (1.15 + (i % 2) * 0.22 + Math.sin(t * 3 + i) * 0.02); p.lineTo(Math.cos(a) * r, Math.sin(a) * r); } p.quadraticCurveTo(R * 0.6, -R * 0.4, -R * 0.4, R * 0.1); p.closePath(); }
  else { p.moveTo(-R * 1.0, R * 0.1); p.quadraticCurveTo(-R * 1.1, -R * 1.15, R * 0.3, -R * 1.05); p.quadraticCurveTo(R * 1.0, -R * 0.9, R * 0.95, -R * 0.35); p.quadraticCurveTo(R * 0.4, -R * 0.6, -R * 0.3, -R * 0.45); p.quadraticCurveTo(-R * 0.6, -R * 0.2, -R * 0.62, R * 0.15); p.closePath(); }
  fillOut(g, p, col, lw, shade(col)); g.save(); g.clip(p); g.strokeStyle = light(col, 0.35); g.lineWidth = lw * 1.4; g.beginPath(); g.arc(-R * 0.1, -R * 0.6, R * 0.6, Math.PI * 1.15, Math.PI * 1.55); g.stroke(); g.restore();
}

function snakeHair(g: Ctx, R: number, t: number, lw: number, C: (c: string) => string, back: boolean) {
  const n = back ? 6 : 7;
  for (let i = 0; i < n; i++) {
    const a0 = back ? Math.PI * (0.75 + i * 0.12) : Math.PI * (1.05 + i * 0.13), x0 = Math.cos(a0) * R * 0.85, y0 = Math.sin(a0) * R * 0.85;
    const pts: number[][] = []; let x = x0, y = y0, a = a0;
    for (let k = 0; k < 7; k++) { a += Math.sin(t * 4 + i * 1.7 + k * 0.9) * 0.35; x += Math.cos(a) * R * 0.11; y += Math.sin(a) * R * 0.11; pts.push([x, y]); }
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = OUT; g.lineWidth = R * 0.2 + lw * 2; g.beginPath(); g.moveTo(x0, y0); for (const q of pts) g.lineTo(q[0], q[1]); g.stroke();
    g.strokeStyle = C(back ? "#4c7a32" : "#64a040"); g.lineWidth = R * 0.2; g.stroke();
    const e = pts[pts.length - 1]; g.fillStyle = C(back ? "#4c7a32" : "#6eb046"); g.beginPath(); g.ellipse(e[0], e[1], R * 0.14, R * 0.1, a, 0, 7); g.fill(); g.strokeStyle = OUT; g.lineWidth = lw; g.stroke();
    if (!back) { g.fillStyle = "#fff2a0"; g.beginPath(); g.arc(e[0] + Math.cos(a) * R * 0.04, e[1] + Math.sin(a) * R * 0.04 - R * 0.03, R * 0.03, 0, 7); g.fill(); }
  }
}

function helmet(g: Ctx, L: ChibiLook, R: number, t: number, lw: number, C: (c: string) => string) {
  const h = L.helmet ?? "none"; if (h === "none") return;
  const col = C(L.helmetCol ?? "#c99a3e");
  if (h === "crest" || h === "winged") {
    if (h === "crest") { const cr = new Path2D(); cr.moveTo(R * 0.5, -R * 0.9); cr.quadraticCurveTo(R * 0.2, -R * 1.75, -R * 0.9, -R * 1.25); cr.quadraticCurveTo(-R * 1.3, -R * 0.6, -R * 1.05, -R * 0.2); cr.quadraticCurveTo(-R * 0.6, -R * 0.95, R * 0.5, -R * 0.9); fillOut(g, cr, C(L.crestCol ?? "#c0302a"), lw, shade(C(L.crestCol ?? "#c0302a"))); }
    const hp = new Path2D(); hp.moveTo(-R * 1.08, R * 0.15); hp.quadraticCurveTo(-R * 1.15, -R * 1.15, R * 0.1, -R * 1.1); hp.quadraticCurveTo(R * 1.1, -R * 1.0, R * 1.08, -R * 0.25); hp.lineTo(R * 0.8, -R * 0.28); hp.quadraticCurveTo(R * 0.2, -R * 0.42, -R * 0.45, -R * 0.3); hp.lineTo(-R * 0.55, R * 0.3); hp.closePath();
    fillOut(g, hp, col, lw, shade(col)); g.strokeStyle = light(col, 0.5); g.lineWidth = lw * 1.5; g.beginPath(); g.arc(-R * 0.1, -R * 0.55, R * 0.55, Math.PI * 1.2, Math.PI * 1.55); g.stroke();
    if (h === "winged") for (const sgn of [1]) { const fl = Math.sin(t * 9) * 0.15; g.save(); g.translate(-R * 0.75, -R * 0.55); g.rotate(-0.4 + fl); for (let k = 0; k < 3; k++) { const f = new Path2D(); f.ellipse(-R * (0.25 + k * 0.08), -R * (0.15 + k * 0.12), R * 0.32, R * 0.09, -0.5 - k * 0.25, 0, 7); fillOut(g, f, "#fbf8f0", lw); } g.restore(); void sgn; }
  } else if (h === "crown" || h === "coral") {
    const cp = new Path2D(); const y0 = -R * 0.72, top = -R * 1.25; cp.moveTo(-R * 0.75, y0);
    for (let i = 0; i <= 4; i++) { const x = -R * 0.75 + i * R * 0.375; cp.lineTo(x - R * 0.12, y0); cp.lineTo(x, top + (i % 2) * R * 0.12); cp.lineTo(x + R * 0.12, y0); }
    cp.lineTo(R * 0.75, y0 + R * 0.12); cp.lineTo(-R * 0.75, y0 + R * 0.12); cp.closePath();
    fillOut(g, cp, h === "coral" ? C("#e8684a") : col, lw, shade(h === "coral" ? C("#e8684a") : col));
    if (h === "crown") for (const x of [-R * 0.38, 0, R * 0.38]) { g.fillStyle = C("#b02a3a"); g.beginPath(); g.arc(x, y0 + R * 0.04, R * 0.05, 0, 7); g.fill(); }
  }
}
