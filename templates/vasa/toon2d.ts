// 2D cartoon characters inside the 3D world (hybrid 2D/3D). Every person is a hand-drawn rubber-hose cartoon painted
// each frame into its own canvas and shown on an upright card that turns to the camera (the card keeps the deck's
// "up", so people heel with the ship). The drawing picks a side / front / back view from where the person faces
// relative to the lens, and is lit by the world's two-tone lighting (sun, cast shadows from sails and rigging), plus
// its own cel shade on the side away from the sun, so the drawings sit in the 3D light.
// Animation: springs on every pose value give overshoot and follow-through (hats, plumes, heads lag behind the body),
// run cycles squash on contact and stretch on push-off, idle breathing and blinks, and expressive faces.
// The API mirrors the old 3D figure (makePerson / pose) so the scene code stays the same.
import * as THREE from "three";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { rng } from "../bridge/paint";

export type Look = {
  coat: string; pants: string; skin?: string; hat: "cap" | "admiral" | "tall" | "none" | "beret"; hatCol?: string;
  hair?: string; beard?: string; stripes?: boolean; collar?: boolean; sash?: string; scale?: number; belly?: number; plume?: string;
};
export type Face = "neutral" | "happy" | "shock" | "angry" | "smug" | "dreamy" | "worried" | "shout" | "scared" | "grin";
/** arms: [swing forward, raise sideways, elbow bend] (radians, like before). New: face, sit, squash, hips, swim. */
export type Pose = {
  run?: number; phase?: number; armL?: [number, number, number]; armR?: [number, number, number]; headYaw?: number; headPitch?: number;
  lean?: number; brow?: number; mouthOpen?: number; bounce?: number; face?: Face; sit?: number; squash?: number; hips?: number; swim?: number;
  look?: number; // eyes: -1 back .. 1 forward
};
type View = "side" | "front" | "back";
export type Person = {
  g: THREE.Group; card: THREE.Mesh; blob: THREE.Mesh; height: number; L: Look; seed: number; skin: string;
  P: Pose; view: View; dir: number; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; res: number;
  sp: Record<string, { x: number; v: number }>; lastT: number;
};

const SKINS = ["#f3c9a0", "#e9b58a", "#f6d3b1", "#d79c72", "#c78960"];
const INK = "#16121c";
const CW = 2.6, CH = 3.1, FOOT = 0.12;   // card size in metres, feet this far above the card's bottom edge
const ALL: Person[] = [];

const shadeOf = (hex: string, k: number) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return "#" + c.getHexString(); };

const cardGeo = (() => {
  const g = new THREE.PlaneGeometry(CW, CH); g.translate(0, CH / 2 - FOOT, 0);
  // normals tilted up so the card takes the sun like an upright figure (not like a wall facing the lens)
  const n = g.attributes.normal; const v = new THREE.Vector3(0, 0.75, 1).normalize();
  for (let i = 0; i < n.count; i++) n.setXYZ(i, v.x, v.y, v.z);
  return g;
})();
const blobMat = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.26, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const blobGeo = new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2).scale(1.15, 1, 0.7);

const makeTex = (res: number) => {
  const c = document.createElement("canvas"); c.width = Math.round(res * CW / CH); c.height = res;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return { c, t };
};

export const makePerson = (L: Look, seed = 0): Person => {
  const r = rng(seed + 11);
  const skin = L.skin ?? SKINS[Math.floor(r() * SKINS.length)];
  const g = new THREE.Group();
  const res = 256, { c, t } = makeTex(res);
  const m = twoTone(new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide }));
  m.alphaToCoverage = true;
  const card = new THREE.Mesh(cardGeo, m); card.layers.set(NOINK); card.receiveShadow = true; card.castShadow = false; g.add(card);
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.position.y = 0.03; blob.layers.set(NOINK); g.add(blob);
  g.scale.setScalar(L.scale ?? 1);
  const p: Person = { g, card, blob, height: 1.9 * (L.scale ?? 1), L, seed, skin, P: {}, view: "side", dir: 1, canvas: c, tex: t, res, sp: {}, lastT: -99 };
  ALL.push(p);
  return p;
};
export const pose = (p: Person, P: Pose) => { p.P = P; };

// ---------------- springs (follow-through) ----------------
const spring = (p: Person, key: string, target: number, reset: boolean, k = 190, d = 15) => {
  let s = p.sp[key];
  if (!s || reset) { s = p.sp[key] = { x: target, v: 0 }; return s; }
  const h = 1 / 60;
  for (let i = 0; i < 2; i++) { s.v += (k * (target - s.x) - d * s.v) * h; s.x += s.v * h; }
  return s;
};

// ---------------- per-frame: turn cards to the camera, pick views, draw ----------------
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _up = new THREE.Vector3(), _n = new THREE.Vector3(),
  _r = new THREE.Vector3(), _f = new THREE.Vector3(), _m = new THREE.Matrix4(), _s = new THREE.Vector3();
const visibleInWorld = (o: THREE.Object3D) => { for (let x: THREE.Object3D | null = o; x; x = x.parent) if (!x.visible) return false; return true; };

export function drawToons(cam: THREE.PerspectiveCamera, t: number, sunWorldDir: THREE.Vector3) {
  for (const p of ALL) {
    if (!visibleInWorld(p.g)) { p.lastT = -99; continue; }
    const reset = Math.abs(t - p.lastT - 1 / 30) > 1e-3; p.lastT = t;
    p.g.updateWorldMatrix(true, false);
    p.g.matrixWorld.decompose(_p, _q, _s);
    _up.set(0, 1, 0).applyQuaternion(_q);
    _n.copy(cam.position).sub(_p); _n.addScaledVector(_up, -_n.dot(_up)); const dist = _n.length(); _n.normalize();
    _r.crossVectors(_up, _n).normalize();
    _m.makeBasis(_r, _up, _n); _qp.setFromRotationMatrix(_m);
    p.card.quaternion.copy(_q.clone().invert().multiply(_qp));
    // which way is the person facing on screen?  (local +x = forward)
    _f.set(1, 0, 0).applyQuaternion(_q);
    const fr = _f.dot(_r), fn = _f.dot(_n);
    const prev = p.view, sideLim = prev === "side" ? 0.38 : 0.55;
    p.view = Math.abs(fr) > sideLim ? "side" : fn > 0 ? "front" : "back";
    if (p.view === "side") p.dir = fr > 0 ? 1 : -1;
    // texture resolution from the on-screen size (1080x1920 output)
    const camDist = Math.max(0.5, cam.position.distanceTo(_p));
    const pxPerM = 960 / (camDist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) * _s.y;
    const need = pxPerM * CH;
    const res = [96, 160, 256, 384, 512, 768, 1024].find((v) => v >= need * 0.9) ?? 1024;
    if (res !== p.res) {
      p.tex.dispose(); const { c, t: tx } = makeTex(res); p.canvas = c; p.tex = tx; p.res = res;
      const mm = p.card.material as THREE.MeshLambertMaterial; mm.map = tx; mm.needsUpdate = true;
    }
    // cel-shade side: where the sun is, seen on the card
    const lightSide = Math.sign(sunWorldDir.dot(_r)) || 1;
    const olM = Math.min(0.05, 7.5 / Math.max(1, pxPerM)); // outline: ~0.05 m, at most ~7.5 px on screen
    paint(p, t, reset, lightSide, olM);
    p.tex.needsUpdate = true;
    void dist;
  }
}

// ---------------- the drawing ----------------
type V2 = [number, number];
type Ctx = CanvasRenderingContext2D;
const smooth = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

function paint(p: Person, t: number, reset: boolean, lightSide: number, OL: number) {
  const c = p.canvas, g = c.getContext("2d")!;
  const L = p.L, P = p.P, view = p.view;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  const k = c.height / CH;
  // metres, y up, origin at the feet; side view drawn facing +x (mirrored for dir -1)
  g.setTransform(k * (view === "side" ? p.dir : 1), 0, 0, -k, c.width / 2, c.height - FOOT * k);
  g.lineJoin = "round"; g.lineCap = "round";
  const ls = view === "side" ? lightSide * p.dir : lightSide; // light side in drawing space
  const r = rng(p.seed + 5); const ph0 = r() * 10;

  // ---- pose values through springs ----
  const run = P.run ?? 0, ph = (P.phase ?? 0) * Math.PI * 2, sit = P.sit ?? 0, swim = P.swim ?? 0;
  const aL0 = P.armL ?? [0.12, 0.12, run ? 1.5 : 0.25], aR0 = P.armR ?? [0.12, 0.12, run ? 1.5 : 0.25];
  const aL = aL0.map((v, i) => spring(p, "aL" + i, v, reset).x), aR = aR0.map((v, i) => spring(p, "aR" + i, v, reset).x);
  const leanS = spring(p, "lean", P.lean ?? run * 0.22, reset, 120, 12);
  const yawS = spring(p, "yaw", P.headYaw ?? 0, reset, 150, 13), pitchS = spring(p, "pitch", P.headPitch ?? 0, reset, 150, 13);
  const bounceS = spring(p, "bounce", P.bounce ?? 0, reset, 260, 14);
  const hips = spring(p, "hips", P.hips ?? 0, reset).x;
  // follow-through: the head and hat lag behind the body's sway
  const bodyAng = leanS.x;
  const headLag = spring(p, "headLag", bodyAng + (run ? Math.sin(ph - 0.9) * 0.06 : 0), reset, 90, 9);
  const hatLag = spring(p, "hatLag", -(leanS.v * 0.18 + bounceS.v * 0.8) + (run ? Math.sin(ph - 1.6) * 0.25 : 0), reset, 60, 6);

  // ---- body bob, squash and stretch ----
  const breathe = Math.sin(t * 2.2 + ph0) * 0.012;
  let bob = 0, sq = breathe + (P.squash ?? 0);
  if (run) {
    const c2 = Math.cos(ph * 2);                 // two contacts per cycle
    bob = (0.5 - 0.5 * c2) * 0.09 * run;         // up in mid-air
    sq += (-0.07 * Math.max(0, c2) ** 3 + 0.05 * Math.max(0, -c2)) * run; // squash at contact, stretch in the air
  }
  sq += -bounceS.v * 0.02 + bounceS.x * 0.6;
  bob += bounceS.x;
  const sy = 1 + sq, sx = 1 / Math.sqrt(Math.max(0.6, sy));

  const belly = L.belly ?? 1;
  const coat = L.coat, coatD = shadeOf(coat, 0.72), pants = L.pants, skin = p.skin;
  const hipY = sit ? 0.55 : 0.78, shoulderY = 1.36, headR = 0.35, headY = 1.74;

  // ---------- legs (below the squash transform's pivot) ----------
  g.save(); g.scale(sx, sy); g.translate(0, bob);
  const legW = 0.16, Lt = 0.42, Ls = 0.42;
  const drawLeg = (hx: number, th: number, bend: number, col: string, far: boolean) => {
    const H: V2 = [hx, hipY];
    const K: V2 = [H[0] + Math.sin(th) * Lt, H[1] - Math.cos(th) * Lt];
    const a2 = th - bend; let F: V2 = [K[0] + Math.sin(a2) * Ls, K[1] - Math.cos(a2) * Ls];
    if (!sit && !swim && F[1] < -bob) F = [F[0], -bob];
    hose(g, H, K, F, legW, far ? shadeOf(col, 0.8) : col, OL);
    boot(g, F, view === "side" ? 1 : hx > 0 ? 0.35 : -0.35, view, OL, far);
  };
  if (view === "side") {
    const sw = Math.sin(ph) * 0.85 * run;
    const kb = (s: number) => run * (0.25 + 1.0 * Math.max(0, Math.sin(ph + s + 1.2)));
    if (sit) { drawLeg(-0.04, 1.45, 1.45, pants, true); drawLeg(0.04, 1.45, 1.45, pants, false); }
    else if (swim) { drawLeg(-0.04, 0.4 * Math.sin(t * 6), 0.3, pants, true); drawLeg(0.04, -0.4 * Math.sin(t * 6), 0.3, pants, false); }
    else { drawLeg(-0.03, -sw, kb(Math.PI), pants, true); drawLeg(0.03, sw, kb(0), pants, false); }
  } else {
    const lift = (s: number) => run * Math.max(0, Math.sin(ph + s)) * 0.5;
    if (sit) { drawLeg(-0.14, 0, 0, pants, false); drawLeg(0.14, 0, 0, pants, false); }
    else { drawLeg(-0.13, -0.08 - lift(0) * 0.2, lift(0) * 1.6, pants, false); drawLeg(0.13, 0.08 + lift(Math.PI) * 0.2, -lift(Math.PI) * 1.6, pants, false); }
  }

  // ---------- upper body: lean about the hips ----------
  g.translate(0, hipY); g.rotate(-bodyAng * (view === "side" ? 1 : 0.15) - (view !== "side" ? Math.sin(ph) * 0.06 * run : 0)); g.translate(0, -hipY);

  // arm geometry: returns shoulder, elbow, hand
  const armPts = (a: number[], side: number): [V2, V2, V2] => {
    const S: V2 = view === "side" ? [0.02 * side, shoulderY] : [side * 0.27 * belly, shoulderY - 0.02];
    const L1 = 0.36, L2 = 0.34;
    let a1: number, a2: number;
    if (view === "side") {
      const sw = run ? Math.sin(ph + (side > 0 ? Math.PI : 0)) * 0.9 * run : 0;
      a1 = a[0] + sw + a[1] * 0.3; a2 = a1 + a[2];
      const E: V2 = [S[0] + Math.sin(a1) * L1, S[1] - Math.cos(a1) * L1];
      return [S, E, [E[0] + Math.sin(a2) * L2, E[1] - Math.cos(a2) * L2]];
    }
    const sw = run ? Math.sin(ph + (side > 0 ? Math.PI : 0)) * 0.35 * run : 0;
    a1 = Math.min(3.0, a[1] + a[0] * 0.85 + 0.12 + Math.abs(sw) * 0.3);
    a2 = a1 + a[2] * (1 - hips) - hips * 2.6;
    const E: V2 = [S[0] + side * Math.sin(a1) * L1, S[1] - Math.cos(a1) * L1];
    return [S, E, [E[0] + side * Math.sin(a2) * L2, E[1] - Math.cos(a2) * L2]];
  };
  const drawArm = (a: number[], side: number, far: boolean) => {
    const [S, E, H] = armPts(a, side);
    hose(g, S, E, H, 0.13, far ? coatD : coat, OL);
    // cuff + mitten hand
    disc(g, H, 0.095, far ? shadeOf(skin, 0.85) : skin, OL);
  };
  // far arm behind the body (side view)
  if (view === "side") drawArm(aR, -1, true);

  // torso: a soft bean, wider at the belly
  const tw = 0.32 * belly, top = shoulderY + 0.1;
  const torso = new Path2D();
  torso.moveTo(-tw * 0.75, hipY - 0.05);
  torso.bezierCurveTo(-tw * 1.25, hipY + 0.2, -tw * 1.05, top - 0.12, -tw * 0.62, top);
  torso.quadraticCurveTo(0, top + 0.07, tw * 0.62, top);
  torso.bezierCurveTo(tw * 1.05 + (view === "side" ? 0.05 * belly : 0), top - 0.12, tw * 1.25 + (view === "side" ? 0.1 * (belly - 1) * 2 : 0), hipY + 0.2, tw * 0.75, hipY - 0.05);
  torso.quadraticCurveTo(0, hipY - 0.14, -tw * 0.75, hipY - 0.05);
  fillOutlined(g, torso, coat, OL, () => {
    if (L.stripes) { g.fillStyle = "#f4f1e8"; for (let y = hipY - 0.1; y < top + 0.1; y += 0.13) g.fillRect(-1, y, 2, 0.065); }
    if (L.sash) { g.strokeStyle = L.sash; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-tw, top - 0.05); g.lineTo(tw, hipY + 0.12); g.stroke(); }
    // belt
    g.fillStyle = "#2a1d18"; g.fillRect(-1, hipY + 0.02, 2, 0.07);
    if (view === "front" && !L.stripes) { g.fillStyle = "#e7c45a"; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, hipY + 0.2 + i * 0.15, 0.028, 0, 7); g.fill(); } }
    celShade(g, ls, tw * 1.3, (hipY + top) / 2, 0.75);
  });
  if (L.collar) {
    const ruff = new Path2D(); const n = 9;
    for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; const rr = i % 2 ? 0.2 : 0.25; const x = Math.cos(a) * 0.3, y = top - 0.02 + Math.sin(a) * -0.07; i ? ruff.quadraticCurveTo(x * 1.1, y - rr * 0.25, x, y) : ruff.moveTo(x, y); }
    ruff.closePath();
    const rf = new Path2D(); rf.ellipse(0, top - 0.02, 0.32, 0.09, 0, 0, Math.PI * 2);
    fillOutlined(g, rf, "#fbf8f0", OL * 0.8);
  }

  // ---------- head (with follow-through) ----------
  g.save();
  g.translate(0, top - 0.04);
  g.rotate(-(headLag.x - bodyAng) * 0.8 * (view === "side" ? 1 : 0.3) + (view === "side" ? pitchS.x * 0.6 : yawS.x * 0.25));
  g.translate(0, headY - top + 0.04);
  const turn = view === "front" ? THREE.MathUtils.clamp(yawS.x, -0.6, 0.6) * 0.16 : 0;
  drawHead(g, p, t, view, headR, skin, OL, ls, turn, pitchS.x, hatLag.x);
  g.restore();

  // near arm in front
  if (view === "side") drawArm(aL, 1, false);
  else { drawArm(aL, 1, false); drawArm(aR, -1, false); }
  g.restore();
}

function drawHead(g: Ctx, p: Person, t: number, view: View, R: number, skin: string, OL: number, ls: number, turn: number, pitch: number, hatLag: number) {
  const L = p.L, P = p.P;
  const hair = L.hair ?? "#3b2618";
  // ears
  if (view === "side") { const e = new Path2D(); e.ellipse(-0.04, -0.01, 0.075, 0.1, 0, 0, 7); fillOutlined(g, e, skin, OL * 0.8); }
  else { for (const s of [-1, 1]) { const e = new Path2D(); e.ellipse(s * (R + 0.02) + turn * 0.3, -0.02, 0.07, 0.095, 0, 0, 7); fillOutlined(g, e, skin, OL * 0.8); } }
  // skull
  const head = new Path2D(); head.ellipse(0, 0, R * (view === "side" ? 1.0 : 1.02), R * 1.03, 0, 0, Math.PI * 2);
  fillOutlined(g, head, skin, OL, () => {
    // hair on the back / top
    if (L.hair && L.hat !== "tall") {
      g.fillStyle = hair; g.beginPath();
      if (view === "side") { g.ellipse(-R * 0.35, R * 0.35, R * 0.85, R * 0.72, -0.5, 0, 7); }
      else if (view === "back") { g.ellipse(0, 0.05, R * 1.1, R * 1.05, 0, 0, 7); }
      else { g.ellipse(turn * 0.3, R * 0.75, R * 1.0, R * 0.42, 0, 0, 7); }
      g.fill();
    }
    celShade(g, ls, R * 1.25, 0, 0.6);
    // cheeks
    if (view !== "back") { g.fillStyle = "rgba(230,90,80,0.28)"; const cx = view === "side" ? [R * 0.45] : [-R * 0.55 + turn, R * 0.55 + turn]; for (const x of cx) { g.beginPath(); g.ellipse(x, -R * 0.3, 0.07, 0.045, 0, 0, 7); g.fill(); } }
  });
  if (view === "back") { drawHat(g, L, view, R, OL, hatLag, ls); return; }
  // beard
  if (L.beard) {
    const b = new Path2D();
    // a chin beard under the mouth (never a mask over the face)
    if (view === "side") { b.moveTo(R * 0.1, -R * 0.5); b.quadraticCurveTo(R * 0.35, -R * 1.55, R * 0.85, -R * 0.68); b.quadraticCurveTo(R * 0.5, -R * 0.82, R * 0.1, -R * 0.5); }
    else { b.moveTo(-R * 0.62 + turn, -R * 0.55); b.quadraticCurveTo(-R * 0.4 + turn, -R * 1.5, turn, -R * 1.55); b.quadraticCurveTo(R * 0.4 + turn, -R * 1.5, R * 0.62 + turn, -R * 0.55); b.quadraticCurveTo(turn, -R * 0.82, -R * 0.62 + turn, -R * 0.55); }
    fillOutlined(g, b, L.beard, OL * 0.8);
  }
  // ---- face ----
  const face = faceOf(P);
  const talk = P.mouthOpen ?? 0;
  const blink = ((t * 0.37 + p.seed * 0.137) % 1) < 0.035;
  const eyeX = view === "side" ? [R * 0.52] : [-R * 0.36 + turn, R * 0.36 + turn];
  const eyeY = R * 0.12 - pitch * 0.1;
  const look = (P.look ?? 0.6) * (view === "side" ? 1 : 0) ;
  for (let i = 0; i < eyeX.length; i++) {
    const ex = eyeX[i], s = view === "side" ? 1 : i ? 1 : -1;
    const big = face === "shock" || face === "scared" ? 1.3 : 1;
    const ew = (view === "side" ? 0.085 : 0.095) * big, eh = 0.125 * big;
    if (face === "dreamy" || face === "happy" && talk < 0.2 || (blink && face !== "shock")) {
      // closed / happy arcs
      g.strokeStyle = INK; g.lineWidth = OL * 0.9; g.beginPath();
      if (face === "dreamy" || face === "happy") g.arc(ex, eyeY - 0.02, ew, Math.PI * 0.15, Math.PI * 0.85);
      else { g.moveTo(ex - ew, eyeY); g.lineTo(ex + ew, eyeY); }
      g.stroke();
    } else {
      const e = new Path2D(); e.ellipse(ex, eyeY, ew, eh, 0, 0, 7);
      fillOutlined(g, e, "#ffffff", OL * 0.7, () => {
        const pr = face === "shock" || face === "scared" ? 0.035 : 0.05;
        g.fillStyle = INK; g.beginPath(); g.arc(ex + look * 0.03 + (view === "front" ? turn * 0.25 : 0), eyeY - 0.01, pr, 0, 7); g.fill();
        g.fillStyle = "#ffffff"; g.beginPath(); g.arc(ex + look * 0.03 + 0.015, eyeY + 0.015, pr * 0.35, 0, 7); g.fill();
        // lids: stern / smug / tired
        const lid = face === "angry" || face === "shout" ? 0.45 : face === "smug" ? 0.55 : 0;
        if (lid) { g.fillStyle = shadeOf(p.skin, 0.95); g.fillRect(ex - 0.2, eyeY + eh - eh * 2 * lid, 0.4, 0.3); g.strokeStyle = INK; g.lineWidth = OL * 0.7; g.beginPath(); g.moveTo(ex - ew, eyeY + eh - eh * 2 * lid); g.lineTo(ex + ew, eyeY + eh - eh * 2 * lid); g.stroke(); }
      });
    }
    // brows
    const by = eyeY + 0.17 + (face === "shock" || face === "scared" || face === "worried" ? 0.05 : face === "angry" || face === "shout" ? -0.03 : 0);
    const tilt = face === "angry" || face === "shout" ? -0.45 : face === "worried" || face === "scared" ? 0.4 : face === "smug" ? (i ? 0.3 : -0.1) : 0;
    const inner = view === "side" ? -1 : -s; // brow's inner end toward the nose
    g.strokeStyle = L.hair ? shadeOf(hair === "#d9d4c8" ? "#9a958a" : hair, 0.8) : INK; g.lineWidth = 0.045;
    g.beginPath(); g.moveTo(ex - inner * 0.08 * -1 - 0.0, by + tilt * 0.06); g.lineTo(ex + inner * 0.08 * -1, by - tilt * 0.06); g.stroke();
  }
  // nose
  const nose = new Path2D();
  if (view === "side") nose.ellipse(R * 0.98, -R * 0.08, 0.09, 0.075, 0, 0, 7); else nose.ellipse(turn * 1.2, -R * 0.12, 0.075, 0.065, 0, 0, 7);
  fillOutlined(g, nose, shadeOf(p.skin, 0.93), OL * 0.7);
  // mouth
  const mx = view === "side" ? R * 0.62 : turn, my = -R * 0.5;
  drawMouth(g, face, talk, mx, my, view, OL);
  if (L.beard) { // moustache over the mouth
    const mo = new Path2D(); const w = view === "side" ? 0.16 : 0.2;
    mo.ellipse(mx - (view === "side" ? 0.02 : 0), my + 0.09, w, 0.05, view === "side" ? -0.2 : 0, 0, 7);
    fillOutlined(g, mo, L.beard, OL * 0.6);
  }
  if (face === "scared" || face === "worried" && (P.brow ?? 0) > 0.6) { // sweat drop
    const d = new Path2D(); const x = view === "side" ? -R * 0.2 : R * 0.9; const y = R * 0.6 - ((t * 0.8) % 1) * 0.25;
    d.moveTo(x, y + 0.08); d.quadraticCurveTo(x + 0.05, y - 0.02, x, y - 0.04); d.quadraticCurveTo(x - 0.05, y - 0.02, x, y + 0.08);
    fillOutlined(g, d, "#9fe0ff", OL * 0.6);
  }
  drawHat(g, L, view, R, OL, hatLag, ls);
}

function faceOf(P: Pose): Face {
  if (P.face) return P.face;
  const b = P.brow ?? 0, m = P.mouthOpen ?? 0;
  if (b > 0.5 && m > 0.3) return "shock";
  if (b > 0.5) return "worried";
  if (b < -0.3 && m > 0.3) return "shout";
  if (b < -0.3) return "angry";
  return "neutral";
}

function drawMouth(g: Ctx, face: Face, talk: number, x: number, y: number, view: View, OL: number) {
  const side = view === "side";
  const open = Math.max(talk, face === "shock" ? 0.8 : face === "shout" ? 0.9 : face === "scared" ? 0.5 : face === "grin" ? 0.45 : 0);
  if (open > 0.12) {
    const m = new Path2D(); const w = (side ? 0.11 : 0.15) * (face === "grin" || face === "shout" ? 1.35 : 1), h = 0.05 + open * 0.13;
    if (face === "shock" || face === "scared") m.ellipse(x, y, w * 0.75, h, 0, 0, 7);
    else if (face === "happy" || face === "grin") { m.moveTo(x - w, y + 0.03); m.quadraticCurveTo(x, y + 0.05, x + w, y + 0.03); m.quadraticCurveTo(x + w * 0.8, y - h * 1.4, x, y - h * 1.2); m.quadraticCurveTo(x - w * 0.8, y - h * 1.4, x - w, y + 0.03); }
    else { m.moveTo(x - w, y + h * 0.4); m.quadraticCurveTo(x, y + h * 0.7, x + w, y + h * 0.4); m.quadraticCurveTo(x + w, y - h, x, y - h); m.quadraticCurveTo(x - w, y - h, x - w, y + h * 0.4); }
    fillOutlined(g, m, "#5a1622", OL * 0.7, () => {
      g.fillStyle = "#e0606a"; g.beginPath(); g.ellipse(x, y - h * 0.8, w * 0.6, h * 0.45, 0, 0, 7); g.fill();          // tongue
      if (face === "grin" || face === "shout") { g.fillStyle = "#ffffff"; g.fillRect(x - w, y + h * 0.05, w * 2, 0.045); } // teeth
    });
    return;
  }
  g.strokeStyle = INK; g.lineWidth = OL * 0.85; g.beginPath();
  const w = side ? 0.1 : 0.13;
  if (face === "happy" || face === "dreamy") { g.moveTo(x - w, y + 0.04); g.quadraticCurveTo(x, y - 0.08, x + w, y + 0.04); }
  else if (face === "smug") { g.moveTo(x - w, y - 0.01); g.quadraticCurveTo(x + w * 0.2, y - 0.03, x + w * 1.1, y + 0.06); }
  else if (face === "angry") { g.moveTo(x - w, y - 0.03); g.quadraticCurveTo(x, y + 0.04, x + w, y - 0.03); }
  else if (face === "worried") { g.moveTo(x - w, y); g.bezierCurveTo(x - w * 0.3, y + 0.04, x + w * 0.3, y - 0.04, x + w, y); }
  else { g.moveTo(x - w * 0.8, y + 0.01); g.quadraticCurveTo(x, y - 0.035, x + w * 0.8, y + 0.01); }
  g.stroke();
}

function drawHat(g: Ctx, L: Look, view: View, R: number, OL: number, lag: number, ls: number) {
  const col = L.hatCol ?? L.coat;
  if (L.hat === "cap") {           // floppy stocking cap; its tip and bobble swing behind (follow-through)
    const cap = new Path2D();
    const tipA = -0.9 + lag * 0.9 + (view === "side" ? 0 : 0.6), tx = -Math.cos(tipA) * R * 1.25, ty = R * 0.9 + Math.sin(-tipA) * R * 0.2 + 0.05;
    cap.moveTo(-R * 1.02, R * 0.3); cap.quadraticCurveTo(-R * 0.9, R * 1.25, tx * 0.2, R * 1.2);
    cap.quadraticCurveTo(tx * 0.9, R * 1.4, tx, ty); cap.quadraticCurveTo(-R * 0.2, R * 0.9, R * 1.02, R * 0.3); cap.closePath();
    fillOutlined(g, cap, col, OL, () => celShade(g, ls, R * 1.2, R * 0.6, 0.6));
    const band = new Path2D(); band.roundRect(-R * 1.08, R * 0.2, R * 2.16, R * 0.28, 0.06); fillOutlined(g, band, shadeOf(col, 0.75), OL * 0.8);
    const bob = new Path2D(); bob.arc(tx, ty, 0.08, 0, 7); fillOutlined(g, bob, "#f4f1e8", OL * 0.7);
  } else if (L.hat === "beret") {
    const b = new Path2D(); b.ellipse(-R * 0.1 + lag * 0.05, R * 0.75, R * 1.15, R * 0.38, 0.18 + lag * 0.2, 0, 7);
    fillOutlined(g, b, col, OL, () => celShade(g, ls, R, R * 0.7, 0.5));
    const k = new Path2D(); k.arc(-R * 0.05, R * 1.15, 0.04, 0, 7); fillOutlined(g, k, col, OL * 0.6);
  } else if (L.hat === "tall") {
    const brim = new Path2D(); brim.ellipse(0, R * 0.72, R * 1.35, R * 0.2, lag * 0.1, 0, 7);
    const crown = new Path2D(); crown.moveTo(-R * 0.8, R * 0.72); crown.lineTo(-R * 0.7, R * 2.05); crown.quadraticCurveTo(0, R * 2.15, R * 0.7, R * 2.05); crown.lineTo(R * 0.8, R * 0.72); crown.closePath();
    g.save(); g.rotate(lag * 0.12);
    fillOutlined(g, crown, col, OL, () => { g.fillStyle = "#b8923a"; g.fillRect(-1, R * 0.8, 2, R * 0.22); celShade(g, ls, R, R * 1.4, 0.5); });
    fillOutlined(g, brim, col, OL);
    g.restore();
  } else if (L.hat === "admiral") {  // big bicorne with a plume that lags and bounces
    g.save(); g.rotate(-0.08 + lag * 0.08);
    const b = new Path2D();
    const w = view === "side" ? R * 1.0 : R * 1.75;
    b.moveTo(-w, R * 0.62); b.quadraticCurveTo(-w * 0.95, R * 1.35, -w * 0.3, R * 1.55); b.quadraticCurveTo(0, R * 1.7, w * 0.3, R * 1.55);
    b.quadraticCurveTo(w * 0.95, R * 1.35, w, R * 0.62); b.quadraticCurveTo(0, R * 0.85, -w, R * 0.62);
    fillOutlined(g, b, col, OL, () => { g.strokeStyle = "#e0b13b"; g.lineWidth = 0.05; g.beginPath(); g.moveTo(-w * 0.95, R * 0.7); g.quadraticCurveTo(0, R * 0.92, w * 0.95, R * 0.7); g.stroke(); celShade(g, ls, w, R * 1.1, 0.5); });
    const cock = new Path2D(); cock.arc(view === "side" ? R * 0.2 : 0, R * 1.0, 0.075, 0, 7); fillOutlined(g, cock, "#e0b13b", OL * 0.7);
    // plume
    const pa = 0.6 + lag * 1.4;
    const pl = new Path2D(); const bx = view === "side" ? -R * 0.4 : -R * 0.5, by = R * 1.45;
    const tx = bx - Math.cos(pa) * 0.75, ty = by + Math.sin(pa) * 0.55;
    pl.moveTo(bx, by - 0.04); pl.quadraticCurveTo((bx + tx) / 2 + 0.05, (by + ty) / 2 + 0.25, tx, ty);
    pl.quadraticCurveTo((bx + tx) / 2 - 0.12, (by + ty) / 2 - 0.05, bx, by - 0.04);
    fillOutlined(g, pl, L.plume ?? "#ffffff", OL * 0.8);
    g.restore();
  }
}

// ---------------- primitives ----------------
function fillOutlined(g: Ctx, path: Path2D, col: string, OL: number, inside?: () => void) {
  g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(path);
  g.fillStyle = col; g.fill(path);
  if (inside) { g.save(); g.clip(path); inside(); g.restore(); }
}
/** rubber-hose limb from A through (near) B to C */
function hose(g: Ctx, A: V2, B: V2, C: V2, w: number, col: string, OL: number) {
  const cx = 2 * B[0] - (A[0] + C[0]) / 2, cy = 2 * B[1] - (A[1] + C[1]) / 2;
  const path = () => { g.beginPath(); g.moveTo(A[0], A[1]); g.quadraticCurveTo(cx, cy, C[0], C[1]); };
  path(); g.strokeStyle = INK; g.lineWidth = w + OL * 2; g.stroke();
  path(); g.strokeStyle = col; g.lineWidth = w; g.stroke();
}
function disc(g: Ctx, P: V2, r: number, col: string, OL: number) { const d = new Path2D(); d.arc(P[0], P[1], r, 0, 7); fillOutlined(g, d, col, OL * 0.8); }
function boot(g: Ctx, F: V2, fwd: number, view: View, OL: number, far: boolean) {
  const b = new Path2D();
  if (view === "side") b.ellipse(F[0] + 0.07, F[1] + 0.03, 0.16, 0.085, 0, 0, 7);
  else b.ellipse(F[0] + fwd * 0.05, F[1] + 0.04, 0.11, 0.08, 0, 0, 7);
  fillOutlined(g, b, far ? "#1e1512" : "#2e2019", OL * 0.8);
}
/** flat cel shade: a darker crescent on the side away from the sun */
function celShade(g: Ctx, lightSide: number, w: number, cy: number, k: number) {
  g.fillStyle = `rgba(40,30,90,${0.26 * k})`;
  g.beginPath(); g.ellipse(-lightSide * w * 1.15, cy - w * 0.25, w * 0.95, w * 2.2, 0, 0, 7); g.fill();
  g.fillStyle = `rgba(255,250,235,${0.16 * k})`;
  g.beginPath(); g.ellipse(lightSide * w * 0.55, cy + w * 0.45, w * 0.22, w * 0.16, 0, 0, 7); g.fill();
}
export const smoothstep = smooth;
