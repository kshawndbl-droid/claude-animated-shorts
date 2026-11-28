// Everything the Vasa short is made of, built from scratch: painted canvas textures, the ship (lofted hull, two gun
// decks with opening ports, guns, gilded stern, lion figurehead, three masts with sails and Swedish flags), 3D toon
// people (sailors, the admiral, officials, visitors), rowing boats, pontoons, the harbour town and Tre Kronor palace.
// Only the shading/ink/grade infrastructure comes from the shared pipeline (twoTone, ctex, InkPass).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";

// ---------------- materials ----------------
const cache = new Map<string, THREE.Material>();
export const mat = (key: string, p: THREE.MeshLambertMaterialParameters = {}) => {
  let m = cache.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(p)); cache.set(key, m); }
  return m;
};
export const shiny = (key: string, color: string, spec = "#fff1c0", sh = 40) => {
  let m = cache.get(key) as THREE.MeshPhongMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshPhongMaterial({ color, specular: spec, shininess: sh }), 0.3); cache.set(key, m); }
  return m;
};
export const flat = (key: string, color: string) => {
  let m = cache.get(key) as THREE.MeshBasicMaterial | undefined;
  if (!m) { m = new THREE.MeshBasicMaterial({ color }); cache.set(key, m); }
  return m;
};
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];

// ---------------- painted textures (all new) ----------------
// hull: u along the length (stern 0 -> bow 1), v by height (y -5 -> 15 m)
export const HULL_Y0 = -5, HULL_Y1 = 15;
const hv = (y: number) => (y - HULL_Y0) / (HULL_Y1 - HULL_Y0);
export const hullTex = () => ctex("vasaHull", 1024, 1024, (g, r) => {
  const Y = (y: number) => 1024 * (1 - hv(y));
  // below the waterline: dark tarred oak
  g.fillStyle = "#4a2f24"; g.fillRect(0, Y(0.15), 1024, 1024);
  // planked sides: warm oak
  g.fillStyle = "#9a6a43"; g.fillRect(0, 0, 1024, Y(0.15));
  for (let y = 0.15; y < 15; y += 0.42) {
    g.fillStyle = pick(r, ["rgba(70,40,20,.18)", "rgba(255,220,170,.10)", "rgba(60,35,20,.10)"]);
    g.fillRect(0, Y(y + 0.42), 1024, Y(y) - Y(y + 0.42));
    g.fillStyle = "rgba(50,28,16,.55)"; g.fillRect(0, Y(y) - 1.2, 1024, 1.6);
    for (let k = 0; k < 6; k++) { const x = r() * 1024; g.fillRect(x, Y(y + 0.42), 1.5, Y(y) - Y(y + 0.42)); }
  }
  // waterline stripe
  g.fillStyle = "#e9dcc0"; g.fillRect(0, Y(0.35), 1024, Y(0.1) - Y(0.35));
  // black wales
  for (const y of [1.0, 3.35, 5.65]) { g.fillStyle = "#2a1c17"; g.fillRect(0, Y(y + 0.38), 1024, Y(y) - Y(y + 0.38)); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, Y(y + 0.38), 1024, 2); }
  // painted top strakes: royal red with gold trim, richest at the stern
  g.fillStyle = "#a8362b"; g.fillRect(0, 0, 1024, Y(6.15));
  g.fillStyle = "#e3b543"; g.fillRect(0, Y(6.28), 1024, 5); g.fillRect(0, Y(8.6), 1024, 4);
  for (let x = 0; x < 1024; x += 26) { g.fillStyle = "#e9be4e"; g.beginPath(); g.arc(x + 13, Y(7.35), 4.5, 0, 7); g.fill(); }
  // stern castle carvings (u < 0.2): gold scrolls on blue
  g.fillStyle = "#264b8c"; g.fillRect(0, 0, 200, Y(9.2));
  for (let k = 0; k < 40; k++) {
    g.strokeStyle = pick(r, ["#f0c24f", "#d9a43a"]); g.lineWidth = 4;
    g.beginPath(); const x = r() * 190, y = r() * Y(9.4);
    g.arc(x, y, 6 + r() * 10, r() * 3, r() * 3 + 3.5); g.stroke();
  }
});
// transom: the gilded stern face with windows and the royal sheaf (the Vasa emblem)
export const sternTex = () => ctex("vasaStern", 512, 1024, (g, r) => {
  g.fillStyle = "#284c8f"; g.fillRect(0, 0, 512, 1024);
  g.fillStyle = "#a8362b"; g.fillRect(0, 700, 512, 324);
  g.strokeStyle = "#f0c24f"; g.lineWidth = 10; g.strokeRect(18, 18, 476, 988);
  // windows: two galleries
  for (const [y, n] of [[560, 5], [680, 4]] as const) for (let i = 0; i < n; i++) {
    const w = 400 / n, x = 56 + i * w;
    g.fillStyle = "#f0c24f"; g.fillRect(x + 4, y - 6, w - 8, 92);
    g.fillStyle = "#1d1820"; g.fillRect(x + 12, y + 2, w - 24, 76);
    g.fillStyle = "rgba(255,230,160,.5)"; g.fillRect(x + 14, y + 4, 8, 30);
  }
  // the sheaf (vase) in a gold medallion
  g.fillStyle = "#f2c851"; g.beginPath(); g.ellipse(256, 300, 118, 150, 0, 0, 7); g.fill();
  g.fillStyle = "#284c8f"; g.beginPath(); g.ellipse(256, 300, 96, 128, 0, 0, 7); g.fill();
  g.strokeStyle = "#f2c851"; g.lineWidth = 9;
  for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(256, 380); g.quadraticCurveTo(256 + k * 12, 300, 256 + k * 20, 205); g.stroke(); }
  g.fillStyle = "#f2c851"; g.fillRect(212, 330, 88, 22);
  // crowns and scrolls
  for (const x of [110, 402]) { g.beginPath(); g.moveTo(x - 40, 140); g.lineTo(x - 40, 100); g.lineTo(x - 20, 120); g.lineTo(x, 90); g.lineTo(x + 20, 120); g.lineTo(x + 40, 100); g.lineTo(x + 40, 140); g.fill(); }
  for (let k = 0; k < 26; k++) { g.strokeStyle = "#e5b546"; g.lineWidth = 5; g.beginPath(); g.arc(40 + r() * 432, 470 + r() * 60, 8 + r() * 12, 0, 4); g.stroke(); }
});
export const sailTex = () => ctex("vasaSail", 256, 256, (g, r) => {
  g.fillStyle = "#f1e6cf"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = "rgba(160,130,90,.25)"; g.fillRect(x, 0, 2, 256); }
  for (let k = 0; k < 30; k++) { g.fillStyle = "rgba(200,170,120,.12)"; g.beginPath(); g.ellipse(r() * 256, r() * 256, 30, 14, r() * 3, 0, 7); g.fill(); }
  g.fillStyle = "rgba(120,90,60,.5)"; g.fillRect(0, 0, 256, 5); g.fillRect(0, 251, 256, 5);
});
export const swedeFlag = () => ctex("swedeFlag", 320, 200, (g) => {
  g.fillStyle = "#1f5fae"; g.fillRect(0, 0, 320, 200);
  g.fillStyle = "#f4c932"; g.fillRect(100, 0, 40, 200); g.fillRect(0, 80, 320, 40);
});
export const deckTex = () => ctex("vasaDeck", 512, 512, (g, r) => {
  g.fillStyle = "#c69862"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    g.fillStyle = pick(r, ["#c99a63", "#bf8f58", "#d0a36c", "#b98a55"]); g.fillRect(0, y, 512, 30);
    g.fillStyle = "rgba(70,40,20,.6)"; g.fillRect(0, y + 30, 512, 2);
    for (let k = 0; k < 3; k++) g.fillRect(r() * 512, y, 2, 30);
  }
});
export const stoneTex = (key: string, base: string, cols: string[]) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) for (let x = -(y / 64 % 2) * 48; x < 512; x += 96) {
    g.fillStyle = pick(r, cols); g.fillRect(x + 3, y + 3, 90, 58);
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 3, y + 3, 90, 6);
  }
});
/** Stockholm-style town house front: stepped gable, rows of windows, a door */
export const houseTex = (key: string, wall: string, frame: string, floors: number) => ctex(key, 256, 512, (g, r) => {
  g.fillStyle = wall; g.fillRect(0, 0, 256, 512);
  for (let k = 0; k < 40; k++) { g.fillStyle = "rgba(0,0,0,.04)"; g.fillRect(r() * 256, r() * 512, 20, 10); }
  const top = 512 - floors * 96;
  for (let f = 0; f < floors; f++) for (let i = 0; i < 3; i++) {
    const x = 28 + i * 76, y = top + 20 + f * 96;
    if (f === floors - 1 && i === 1) { g.fillStyle = "#4c2e22"; g.fillRect(x + 4, y + 6, 46, 70); continue; }
    g.fillStyle = frame; g.fillRect(x, y, 54, 62);
    g.fillStyle = "#2d3444"; g.fillRect(x + 6, y + 6, 42, 50);
    g.fillStyle = "rgba(180,210,240,.35)"; g.fillRect(x + 8, y + 8, 14, 22);
    g.fillStyle = frame; g.fillRect(x + 25, y + 6, 4, 50); g.fillRect(x + 6, y + 28, 42, 4);
  }
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, 500, 256, 12);
});
export const palaceTex = () => ctex("palaceWall", 512, 512, (g, r) => {
  g.fillStyle = "#e6dcc8"; g.fillRect(0, 0, 512, 512);
  for (let f = 0; f < 4; f++) for (let i = 0; i < 6; i++) {
    const x = 18 + i * 82, y = 40 + f * 118;
    g.fillStyle = "#b9a684"; g.fillRect(x - 4, y - 4, 50, 82);
    g.fillStyle = "#3a3c4a"; g.fillRect(x, y, 42, 74);
    g.fillStyle = "#b9a684"; g.fillRect(x + 19, y, 4, 74);
  }
  g.fillStyle = "rgba(120,100,80,.25)"; for (let k = 0; k < 4; k++) g.fillRect(0, 150 + k * 118, 512, 6);
});
export const cloudTex = (seed: number) => ctex("vcloud" + seed, 512, 256, (g) => {
  const r = rng(seed * 17 + 3);
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) puffs.push([90 + r() * 330, 150 - r() * 60, 40 + r() * 50]);
  g.fillStyle = "#c9d3ea"; for (const [x, y, s] of puffs) { g.beginPath(); g.arc(x, y + 10, s, 0, 7); g.fill(); }
  g.fillStyle = "#ffffff"; for (const [x, y, s] of puffs) { g.beginPath(); g.arc(x - 6, y, s * 0.86, 0, 7); g.fill(); }
  g.globalCompositeOperation = "destination-out"; g.fillRect(0, 196, 512, 60);
});
export const dotTex = (key: string, inner: string, outer: string) => ctex(key, 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
});
export const ringTex = () => ctex("bubble", 64, 64, (g) => {
  g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.stroke();
  g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(24, 23, 6, 0, 7); g.fill();
});
export const streakTex = () => ctex("windStreak", 512, 64, (g) => {
  g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 7; g.lineCap = "round";
  g.beginPath(); g.moveTo(20, 40); g.bezierCurveTo(160, 10, 300, 58, 420, 24); g.arc(430, 34, 12, 3.6, 7.4); g.stroke();
});
export const sparkTex = () => ctex("spark", 64, 64, (g) => {
  g.fillStyle = "#fff6c8"; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? 7 : 30; g.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr); }
  g.fill();
});
export const labelTex = (key: string, text: string, bg: string, fg: string) => ctex(key, 512, 160, (g) => {
  g.fillStyle = bg; g.beginPath(); g.roundRect(6, 6, 500, 148, 26); g.fill();
  g.lineWidth = 10; g.strokeStyle = "#111"; g.stroke();
  g.fillStyle = fg; let fs = 74; g.font = `800 ${fs}px SubFont, Arial Black, sans-serif`;
  while (g.measureText(text).width > 450 && fs > 20) { fs -= 2; g.font = `800 ${fs}px SubFont, Arial Black, sans-serif`; }
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 84);
});
export const gridTex = () => ctex("blueprint", 512, 512, (g) => {
  g.fillStyle = "#f3e7c9"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(120,90,50,.25)"; g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
});
export const mudTex = () => ctex("mud", 512, 512, (g, r) => {
  g.fillStyle = "#4e4a36"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 300; k++) { g.fillStyle = pick(r, ["rgba(90,85,60,.35)", "rgba(40,38,28,.3)", "rgba(110,100,70,.25)"]); g.beginPath(); g.ellipse(r() * 512, r() * 512, 6 + r() * 26, 4 + r() * 12, r() * 3, 0, 7); g.fill(); }
});
export const panelTex = () => ctex("panel", 512, 512, (g, r) => {
  g.fillStyle = "#7a4e31"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 128) for (let y = 0; y < 512; y += 170) {
    g.fillStyle = pick(r, ["#8b5b39", "#845535"]); g.fillRect(x + 10, y + 10, 108, 150);
    g.strokeStyle = "rgba(40,20,10,.6)"; g.lineWidth = 4; g.strokeRect(x + 16, y + 16, 96, 138);
  }
});

// ---------------- the hull ----------------
export const SHIP_L = 48, HALF_L = 24, BEAM = 6.2, KEEL = -4.8;
const u01 = (x: number) => (x + HALF_L) / SHIP_L;          // 0 stern .. 1 bow
/** top of the side (sheer) along the ship: low waist, tall stern castle, raised forecastle */
export const sheer = (x: number) => {
  const u = u01(x);
  return 7.2 + 7.6 * Math.pow(Math.max(0, 0.3 - u) / 0.3, 1.3) + 2.2 * Math.pow(Math.max(0, u - 0.78) / 0.22, 2);
};
export const keelY = (x: number) => { const u = u01(x); return KEEL + 7.5 * Math.pow(Math.max(0, u - 0.82) / 0.18, 2.2); };
/** maximum half-breadth per station: blunt stern, fine bow */
export const station = (x: number) => {
  const u = u01(x);
  if (u > 0.55) return BEAM * Math.pow(Math.max(0, 1 - Math.pow((u - 0.55) / 0.45, 2)), 0.62);
  return BEAM * (0.66 + 0.34 * Math.pow(Math.min(1, u / 0.4), 0.55));
};
/** half-breadth across the section: round bilge, widest at ~55 %, tumblehome above */
export const prof = (t: number) => t < 0.55 ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - t / 0.55, 2))) : 1 - 0.2 * Math.pow((t - 0.55) / 0.45, 1.4);
export const halfAt = (x: number, y: number) => {
  const k = keelY(x), h = sheer(x), t = (y - k) / (h - k);
  return t < 0 || t > 1 ? 0 : station(x) * prof(t);
};
export const deckY = (x: number) => sheer(x) - 1.05;    // the main deck sits a bulwark lower than the side top
export const WAIST_DECK = deckY(0);

const NU = 72, NT = 26;
export const hullGeometry = () => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const s of [-1, 1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= NU; i++) {
      const x = -HALF_L + (SHIP_L * i) / NU, k = keelY(x), h = sheer(x), w = station(x);
      for (let j = 0; j <= NT; j++) {
        const t = j / NT, y = k + (h - k) * t;
        pos.push(x, y, s * w * prof(t)); uv.push(i / NU, hv(y));
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NT; j++) {
      const a = base + i * (NT + 1) + j, b = a + NT + 1, c = b + 1, d = a + 1;
      if (s > 0) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** flat stern face (closes the hull at x = -HALF_L) */
export const transomGeometry = () => {
  const x = -HALF_L, k = keelY(x), h = sheer(x), w = station(x), pts: THREE.Vector2[] = [];
  for (let j = 0; j <= NT; j++) { const t = j / NT; pts.push(new THREE.Vector2(w * prof(t), k + (h - k) * t)); }
  for (let j = NT; j >= 0; j--) { const t = j / NT; pts.push(new THREE.Vector2(-w * prof(t), k + (h - k) * t)); }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  // map uv to the stern texture (the painted face covers from the waterline up)
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (2 * w), (p.getY(i) - 0.5) / (h - 0.5));
  g.rotateY(-Math.PI / 2); g.translate(x - 0.02, 0, 0);
  return g;
};
/** walkable deck: strip between the two sides at deck height */
export const deckGeometry = () => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const x = -HALF_L + 0.3 + ((SHIP_L - 1.6) * i) / n, y = deckY(x), w = Math.max(0.05, halfAt(x, y) - 0.05);
    pos.push(x, y, -w, x, y, w); uv.push(x / 4, 0, x / 4, (2 * w) / 4);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // normals point up
  const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
  return g;
};
/** outward unit normal of the hull side at (x, y) on side s */
export const hullNormal = (x: number, y: number, s: number) => {
  const e = 0.05;
  const dzdx = (halfAt(x + e, y) - halfAt(x - e, y)) / (2 * e), dzdy = (halfAt(x, y + e) - halfAt(x, y - e)) / (2 * e);
  return new THREE.Vector3(-dzdx, -dzdy, s).normalize();
};

const cyl = (r0: number, r1: number, h: number, seg = 10) => new THREE.CylinderGeometry(r1, r0, h, seg);
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);

export type Port = { lid: THREE.Object3D; gun: THREE.Object3D; hole: THREE.Mesh; x: number; y: number; s: number; order: number };
export type ShipParts = {
  root: THREE.Group; body: THREE.Group; hullMat: THREE.MeshLambertMaterial; ports: Port[];
  sails: { m: THREE.Mesh; w: number; h: number; base: Float32Array }[]; flags: { m: THREE.Mesh; base: Float32Array; s: number }[];
  topmasts: THREE.Object3D[]; rig: THREE.Object3D[]; deckHands: THREE.Group; gold: THREE.MeshPhongMaterial; diagram: THREE.Group;
};

export const buildShip = (): ShipParts => {
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const hullMat = mat("hull", { map: hullTex(), side: THREE.DoubleSide }) as THREE.MeshLambertMaterial;
  const gold = shiny("gold", "#e9b43c", "#fff2b0", 60) as THREE.MeshPhongMaterial;
  const add = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = body, shadow = true) => {
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  add(hullGeometry(), hullMat);
  add(transomGeometry(), mat("stern", { map: sternTex() }));
  const dm = deckTex(); dm.repeat.set(1, 1);
  add(deckGeometry(), mat("deck", { map: dm }));
  // stern castle: two gilded quarter galleries + lanterns; forecastle rail
  for (const s of [-1, 1]) {
    const x0 = -HALF_L + 1.2, y = 9.6, w = halfAt(x0, y);
    add(at(new THREE.BoxGeometry(2.2, 2.8, 0.7), x0 + 0.8, y + 0.4, s * (w + 0.12)), gold);
    add(at(new THREE.SphereGeometry(0.5, 12, 8), x0 + 0.8, y - 1.3, s * (w + 0.15)), gold);
  }
  for (const z of [-2.2, 0, 2.2]) {
    add(at(cyl(0.12, 0.12, 1.4, 8), -HALF_L - 0.1, sheer(-HALF_L) + 0.7, z), gold);
    add(at(new THREE.SphereGeometry(0.42, 12, 10), -HALF_L - 0.1, sheer(-HALF_L) + 1.7, z), shiny("lantern", "#ffe9a8", "#ffffff", 80));
  }
  // gilded sculpture band along the top rail at the stern
  for (let x = -HALF_L + 0.4; x < -HALF_L + 10; x += 1.0) for (const s of [-1, 1]) {
    const y = sheer(x) - 0.2, w = halfAt(x, y - 0.1);
    add(at(new THREE.SphereGeometry(0.22, 8, 6), x, y, s * (w + 0.08)), gold, body, false);
  }
  // beakhead + leaping lion figurehead
  const bx = HALF_L - 0.6, by = keelY(bx) + 1.0;
  const beak = cyl(0.55, 0.18, 9, 10); beak.rotateZ(-Math.PI / 2 + 0.35); add(at(beak, bx + 3.6, by + 2.3, 0), hullMat);
  const lion = new THREE.Group(); body.add(lion); lion.position.set(bx + 7.6, by + 4.0, 0); lion.rotation.z = -0.35;
  add(new THREE.SphereGeometry(0.95, 16, 12).scale(1.3, 1, 1), gold, lion);
  add(at(new THREE.SphereGeometry(0.75, 14, 12), 1.3, 0.7, 0), gold, lion);
  const mane = new THREE.TorusGeometry(0.72, 0.28, 8, 16); mane.rotateY(Math.PI / 2); add(at(mane, 1.15, 0.7, 0), gold, lion);
  for (const s of [-1, 1]) { const paw = cyl(0.2, 0.16, 1.4, 8); paw.rotateZ(1.2); add(at(paw, 1.6, -0.3, s * 0.45), gold, lion); }
  add(at(new THREE.SphereGeometry(0.16, 8, 6), 1.95, 0.95, 0.35), flat("eyeL", "#1a1210"), lion);
  add(at(new THREE.SphereGeometry(0.16, 8, 6), 1.95, 0.95, -0.35), flat("eyeL", "#1a1210"), lion);
  const bowsprit = cyl(0.32, 0.2, 20, 10); bowsprit.rotateZ(-Math.PI / 2 + 0.42);
  add(at(bowsprit, HALF_L + 4.5, sheer(HALF_L - 2) + 3.4, 0), mat("mastWood", { color: "#8c5a34" }));

  // ---- gunports: two decks of red lids, black openings, bronze guns ----
  const ports: Port[] = [];
  const lidM = mat("lid", { color: "#b3352c" }), holeM = flat("hole", "#120d0d"), gunM = shiny("bronze", "#a8712f", "#ffd89a", 50);
  const rows: [number, number, number, number][] = [[2.15, -15, 15, 12], [4.5, -17, 16, 12]];
  let order = 0;
  rows.forEach(([y, xa, xb, n]) => {
    for (let i = 0; i < n; i++) {
      const x = xa + ((xb - xa) * i) / (n - 1);
      for (const s of [-1, 1]) {
        const w = halfAt(x, y), nrm = hullNormal(x, y, s);
        const p = new THREE.Vector3(x, y, s * w);
        const frame = new THREE.Group(); body.add(frame); frame.position.copy(p).addScaledVector(nrm, 0.04);
        frame.lookAt(p.clone().add(nrm));
        const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), holeM); frame.add(hole);
        const hinge = new THREE.Group(); hinge.position.set(0, 0.5, 0.02); frame.add(hinge);
        const lid = new THREE.Mesh(at(new THREE.BoxGeometry(1.02, 1.02, 0.14), 0, -0.51, 0.07), lidM); lid.castShadow = true; hinge.add(lid);
        const gun = new THREE.Group(); frame.add(gun);
        const barrel = new THREE.Mesh(cyl(0.24, 0.17, 2.4, 12).rotateX(Math.PI / 2), gunM); barrel.position.z = 0.2; barrel.castShadow = true; gun.add(barrel);
        const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.07, 6, 12), gunM); muzzle.position.z = 1.4; gun.add(muzzle);
        ports.push({ lid: hinge, gun, hole, x, y, s, order: order++ });
      }
    }
  });

  // ---- masts, yards, sails, flags, rigging ----
  const wood = mat("mastWood", { color: "#8c5a34" }), rope = mat("rope", { color: "#4b3a2c" });
  const sails: ShipParts["sails"] = [], flags: ShipParts["flags"] = [], topmasts: THREE.Object3D[] = [], rig: THREE.Object3D[] = [];
  const sailM = mat("sail", { map: sailTex(), side: THREE.DoubleSide });
  const flagM = mat("flag", { map: swedeFlag(), side: THREE.DoubleSide });
  const masts: [number, number, number][] = [[13, 36, 0.62], [1.5, 46, 0.78], [-12.5, 30, 0.5]]; // x, height above deck, radius
  for (const [mx, H, r] of masts) {
    const y0 = deckY(mx);
    const lower = add(at(cyl(r, r * 0.8, H * 0.55, 12), mx, y0 + (H * 0.55) / 2, 0), wood);
    const top = new THREE.Group(); body.add(top); topmasts.push(top);
    add(at(cyl(r * 0.7, r * 0.35, H * 0.5, 10), mx, y0 + H * 0.55 + H * 0.22, 0), wood, top);
    // fighting top
    add(at(cyl(1.6, 1.3, 0.7, 14), mx, y0 + H * 0.55, 0), wood);
    lower.castShadow = true;
    // yards + sails: course (low) and topsail
    const yards: [number, number, number, number][] = [[y0 + H * 0.5, 9.5, 8.5, 0], [y0 + H * 0.86, 6.5, 6.8, 1]];
    for (const [yy, hw, sh, isTop] of yards) {
      const yard = cyl(0.22, 0.22, hw * 2, 8); yard.rotateX(Math.PI / 2);
      add(at(yard, mx + 0.6, yy, 0), wood, isTop ? top : body);
      const g = new THREE.PlaneGeometry(hw * 1.9, sh, 10, 8); g.rotateY(Math.PI / 2); g.translate(mx + 0.7, yy - sh / 2 - 0.2, 0);
      const m = add(g, sailM, isTop ? top : body);
      sails.push({ m, w: hw, h: sh, base: (g.attributes.position.array as Float32Array).slice() });
    }
    // flag on top
    const fg = new THREE.PlaneGeometry(5.2, 3.2, 10, 2); fg.translate(-2.6, 0, 0);
    const fm = new THREE.Mesh(fg, flagM); fm.position.set(mx, y0 + H + 0.2 - 1.6, 0); fm.castShadow = true; top.add(fm);
    flags.push({ m: fm, base: (fg.attributes.position.array as Float32Array).slice(), s: 1 });
    // shrouds: mast top to the sides
    for (const s of [-1, 1]) for (const dx of [-2.4, 0, 2.4]) {
      const a = new THREE.Vector3(mx, y0 + H * 0.55, 0), b = new THREE.Vector3(mx + dx, deckY(mx + dx) + 0.8, s * (halfAt(mx + dx, deckY(mx + dx) + 0.8) + 0.2));
      const len = a.distanceTo(b), g = cyl(0.05, 0.05, len, 4); const mm = new THREE.Mesh(g, rope);
      mm.position.copy(a).add(b).multiplyScalar(0.5); mm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      body.add(mm); rig.push(mm);
    }
  }
  // stern ensign
  const eg = new THREE.PlaneGeometry(6, 3.8, 10, 2); eg.translate(-3, 0, 0);
  const ens = new THREE.Mesh(eg, flagM); ens.position.set(-HALF_L - 1.0, sheer(-HALF_L) + 6.0, 0); body.add(ens);
  add(at(cyl(0.12, 0.12, 6.4, 6), -HALF_L - 0.9, sheer(-HALF_L) + 3.6, 0), wood);
  flags.push({ m: ens, base: (eg.attributes.position.array as Float32Array).slice(), s: 1.2 });
  // stays between the mastheads and to the bowsprit
  const stay = (a: THREE.Vector3, b: THREE.Vector3, parent: THREE.Object3D) => {
    const len = a.distanceTo(b), mm = new THREE.Mesh(cyl(0.06, 0.06, len, 4), rope);
    mm.position.copy(a).add(b).multiplyScalar(0.5); mm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); parent.add(mm); rig.push(mm);
  };
  stay(new THREE.Vector3(13, deckY(13) + 36 * 0.55, 0), new THREE.Vector3(HALF_L + 12, sheer(HALF_L - 2) + 7.5, 0), body);
  stay(new THREE.Vector3(1.5, deckY(1.5) + 46 * 0.55, 0), new THREE.Vector3(13, deckY(13) + 36 * 0.4, 0), body);
  stay(new THREE.Vector3(-12.5, deckY(-12.5) + 30 * 0.55, 0), new THREE.Vector3(1.5, deckY(1.5) + 46 * 0.35, 0), body);

  const deckHands = new THREE.Group(); body.add(deckHands);
  const diagram = new THREE.Group(); body.add(diagram); diagram.visible = false;
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, body, hullMat, ports, sails, flags, topmasts, rig, deckHands, gold, diagram };
};

// ---------------- people: 3D toon figures ----------------
export type Look = {
  coat: string; pants: string; skin?: string; hat: "cap" | "admiral" | "tall" | "none" | "beret"; hatCol?: string;
  hair?: string; beard?: string; stripes?: boolean; collar?: boolean; sash?: string; scale?: number; belly?: number; plume?: string;
};
export type Person = {
  g: THREE.Group; torso: THREE.Group; head: THREE.Group; armL: THREE.Group; armR: THREE.Group; legL: THREE.Group; legR: THREE.Group;
  foreL: THREE.Group; foreR: THREE.Group; brows: THREE.Mesh[]; mouth: THREE.Mesh; height: number;
};
const SKINS = ["#f3c9a0", "#e9b58a", "#f6d3b1", "#d79c72", "#c78960"];
const stripeTex = (key: string, base: string, stripe: string) => ctex(key, 64, 64, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 64, 64); g.fillStyle = stripe; for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 7);
});
export const makePerson = (L: Look, seed = 0): Person => {
  const r = rng(seed + 11);
  const skin = L.skin ?? SKINS[Math.floor(r() * SKINS.length)];
  const g = new THREE.Group(), torso = new THREE.Group(), head = new THREE.Group();
  const coatM = L.stripes ? mat("stripe" + L.coat, { map: stripeTex("st" + L.coat, "#f4f1e8", L.coat) }) : mat("c" + L.coat, { color: L.coat });
  const pantsM = mat("p" + L.pants, { color: L.pants }), skinM = mat("s" + skin, { color: skin });
  const ink = flat("ink", "#141018"), white = flat("white", "#ffffff");
  const belly = L.belly ?? 1;
  // legs (pivot at the hip)
  const leg = (s: number) => {
    const lg = new THREE.Group(); lg.position.set(0, 0.86, s * 0.14);
    lg.add(new THREE.Mesh(at(cyl(0.11, 0.13, 0.78, 8), 0, -0.39, 0), pantsM));
    lg.add(new THREE.Mesh(at(new THREE.BoxGeometry(0.3, 0.12, 0.17), 0.06, -0.8, 0), mat("boot", { color: "#2a1d18" })));
    g.add(lg); return lg;
  };
  const legL = leg(1), legR = leg(-1);
  // torso: a soft barrel shape
  g.add(torso); torso.position.y = 0.86;
  const tg = new THREE.LatheGeometry([[0.0, 0], [0.24 * belly, 0.02], [0.3 * belly, 0.22], [0.31 * belly, 0.42], [0.26, 0.62], [0.17, 0.74], [0.0, 0.76]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  torso.add(new THREE.Mesh(tg, coatM));
  if (L.sash) { const sm = new THREE.TorusGeometry(0.29 * belly, 0.05, 6, 16); sm.rotateX(Math.PI / 2); torso.add(new THREE.Mesh(at(sm, 0, 0.18, 0), mat("sash" + L.sash, { color: L.sash }))); }
  if (L.collar) { const c = new THREE.TorusGeometry(0.21, 0.09, 8, 18); c.rotateX(Math.PI / 2); torso.add(new THREE.Mesh(at(c, 0, 0.74, 0), mat("ruff", { color: "#fbf8f0" }))); }
  // arms (pivot at the shoulder), forearm hinge at the elbow
  const arm = (s: number) => {
    const a = new THREE.Group(); a.position.set(0, 0.66, s * 0.33); torso.add(a);
    a.add(new THREE.Mesh(at(cyl(0.085, 0.075, 0.36, 8), 0, -0.18, 0), coatM));
    const fore = new THREE.Group(); fore.position.y = -0.36; a.add(fore);
    fore.add(new THREE.Mesh(at(cyl(0.075, 0.065, 0.32, 8), 0, -0.16, 0), coatM));
    fore.add(new THREE.Mesh(at(new THREE.SphereGeometry(0.085, 8, 6), 0, -0.36, 0), skinM));
    return { a, fore };
  };
  const AL = arm(1), AR = arm(-1);
  // head: big cartoon head, eyes, brows, nose, mouth, hair/beard, hat
  head.position.y = 0.76 + 0.29; torso.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.29, 18, 14).scale(1, 1.06, 0.98), skinM));
  const brows: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8).scale(0.6, 1, 1), white); e.position.set(0.25, 0.04, s * 0.1); head.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), ink); p.position.set(0.3, 0.035, s * 0.1); head.add(p);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.12), mat("hair" + (L.hair ?? "#3b2618"), { color: L.hair ?? "#3b2618" })); b.position.set(0.27, 0.15, s * 0.1); head.add(b); brows.push(b);
  }
  head.add(new THREE.Mesh(at(new THREE.SphereGeometry(0.075, 8, 6), 0.3, -0.04, 0), skinM));
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.12), ink); mouth.position.set(0.27, -0.14, 0); head.add(mouth);
  if (L.hair) head.add(new THREE.Mesh(at(new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, 1.3).scale(1.02, 1, 1.02), -0.03, 0.03, 0), mat("hair" + L.hair, { color: L.hair })));
  if (L.beard) {
    const bd = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 10).rotateZ(Math.PI), mat("beard" + L.beard, { color: L.beard })); bd.position.set(0.22, -0.25, 0); head.add(bd);
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 4, 6).rotateX(Math.PI / 2 - s * 0.5), mat("beard" + L.beard, { color: L.beard })); m.position.set(0.29, -0.08, s * 0.08); head.add(m); }
  }
  const hatM = mat("hat" + (L.hatCol ?? L.coat), { color: L.hatCol ?? L.coat });
  if (L.hat === "cap") { head.add(new THREE.Mesh(at(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, 1.2), 0, 0.06, 0), hatM)); head.add(new THREE.Mesh(at(new THREE.SphereGeometry(0.07, 8, 6), -0.05, 0.36, 0), hatM)); }
  if (L.hat === "beret") head.add(new THREE.Mesh(at(new THREE.CylinderGeometry(0.33, 0.3, 0.1, 14), -0.03, 0.27, 0).rotateZ(0.15), hatM));
  if (L.hat === "tall") { head.add(new THREE.Mesh(at(cyl(0.26, 0.24, 0.45, 14), 0, 0.42, 0), hatM)); head.add(new THREE.Mesh(at(cyl(0.44, 0.44, 0.04, 16), 0, 0.2, 0), hatM)); }
  if (L.hat === "admiral") {
    head.add(new THREE.Mesh(at(cyl(0.56, 0.56, 0.05, 18), 0, 0.22, 0).rotateZ(0.12), hatM));
    head.add(new THREE.Mesh(at(cyl(0.27, 0.25, 0.26, 14), -0.02, 0.36, 0).rotateZ(0.12), hatM));
    const plume = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55, 4, 8), mat("plume" + (L.plume ?? "#ffffff"), { color: L.plume ?? "#ffffff" }));
    plume.position.set(-0.25, 0.48, 0.12); plume.rotation.set(0.3, 0, 1.1); head.add(plume);
  }
  g.scale.setScalar(L.scale ?? 1);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, torso, head, armL: AL.a, armR: AR.a, legL, legR, foreL: AL.fore, foreR: AR.fore, brows, mouth, height: 1.9 * (L.scale ?? 1) };
};
/** pose: walk/run phase, arms (shoulder pitch forward, raise sideways), elbow bend, head turn, brow mood */
export type Pose = { run?: number; phase?: number; armL?: [number, number, number]; armR?: [number, number, number]; headYaw?: number; headPitch?: number;
  lean?: number; brow?: number; mouthOpen?: number; bounce?: number };
export const pose = (p: Person, P: Pose) => {
  const run = P.run ?? 0, ph = (P.phase ?? 0) * Math.PI * 2;
  const sw = Math.sin(ph) * 0.9 * run;
  p.legL.rotation.z = sw; p.legR.rotation.z = -sw;
  const aL = P.armL ?? [-sw * 0.8, 0.12, run * 1.2], aR = P.armR ?? [sw * 0.8, 0.12, run * 1.2];
  p.armL.rotation.set(-aL[1], 0, aL[0]); p.foreL.rotation.set(0, 0, aL[2]);
  p.armR.rotation.set(aR[1], 0, aR[0]); p.foreR.rotation.set(0, 0, aR[2]);
  p.torso.rotation.z = -(P.lean ?? run * 0.25);
  p.torso.position.y = 0.86 + Math.abs(Math.sin(ph)) * 0.08 * run + (P.bounce ?? 0);
  p.head.rotation.set(0, P.headYaw ?? 0, P.headPitch ?? 0);
  const b = P.brow ?? 0;
  p.brows.forEach((m, i) => { m.rotation.x = (i ? 1 : -1) * b * 0.5; m.position.y = 0.15 + Math.abs(b) * 0.02; });
  p.mouth.scale.y = 1 + (P.mouthOpen ?? 0) * 3;
};

// ---------------- boats and pontoons ----------------
export const rowBoat = (col = "#8a5a36") => {
  const g = new THREE.Group();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push(new THREE.Vector2(Math.sin(a) * 1.0, -Math.cos(a) * 0.55)); }
  const hull = new THREE.LatheGeometry(pts, 18, 0, Math.PI * 2); hull.scale(2.6, 1, 1);
  const m = new THREE.Mesh(hull, mat("boat" + col, { color: col, side: THREE.DoubleSide })); m.position.y = 0.45; g.add(m);
  const rim = new THREE.TorusGeometry(1, 0.06, 6, 24); rim.rotateX(Math.PI / 2); rim.scale(2.6, 1, 1);
  g.add(new THREE.Mesh(at(rim, 0, 0.45, 0), mat("boatRim", { color: "#5a3a22" })));
  const oars: THREE.Mesh[] = [];
  for (const s of [-1, 1]) { const o = new THREE.Mesh(cyl(0.04, 0.04, 3.4, 5).rotateX(Math.PI / 2), mat("oar", { color: "#c49a64" })); o.position.set(0, 0.6, s * 1.5); g.add(o); oars.push(o); }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, oars };
};
export const pontoon = () => {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 5), mat("pontoon", { color: "#d8c04a" })); m.position.y = 0.8; g.add(m);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), mat("cab", { color: "#f4efe2" })); cab.position.set(-9, 3.6, 0); g.add(cab);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
};

// ---------------- the town: quay, houses with stepped gables, Tre Kronor, churches ----------------
export const buildTown = () => {
  const geos = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const put = (g: THREE.BufferGeometry, m: THREE.Material) => { const l = geos.get(m); const gg = g.index ? g.toNonIndexed() : g; if (l) l.push(gg); else geos.set(m, [gg]); };
  const r = rng(77);
  const quayM = mat("quay", { map: stoneTex("quayStone", "#8b8378", ["#a79e90", "#b3aa9b", "#9c9385", "#bdb4a4"]) });
  const groundM = mat("cobbleV", { map: stoneTex("vCobble", "#7a6f62", ["#9c8f7c", "#a89a86", "#8f8371", "#b1a28c"]) });
  (quayM.map as THREE.Texture).repeat.set(40, 1); (groundM.map as THREE.Texture).repeat.set(60, 20);
  // quay wall + street, north shore
  put(new THREE.BoxGeometry(900, 4, 6).translate(0, 0, 29), quayM);
  put(new THREE.PlaneGeometry(900, 300).rotateX(-Math.PI / 2).translate(0, 2.0, 182), groundM);
  // wooden pier where the Vasa is moored
  put(new THREE.BoxGeometry(40, 0.5, 6).translate(-40, 1.8, 23), mat("pier", { map: deckTex() }));
  for (let x = -58; x <= -22; x += 4) put(cyl(0.25, 0.25, 4, 8).translate(x, -0.2, 20.4), mat("pile", { color: "#5a3e2a" }));
  // houses
  const walls = ["#d9a441", "#c4573a", "#e2c27a", "#b9442f", "#e7d3a6", "#9f6b3f", "#d48b4a", "#c9b58c"];
  const roofM = mat("roofV", { color: "#7c3a2c" }), roof2 = mat("roofV2", { color: "#3d4450" });
  let x = -330, k = 0;
  const row = (z0: number, depth: number, hMul: number) => {
    x = -330;
    while (x < 330) {
      const w = 9 + r() * 6, floors = 3 + Math.floor(r() * 3), h = floors * 3.1 * hMul, wall = walls[k % walls.length];
      if (Math.abs(x + 90) < 48 && z0 < 60) { x = -90 + 48; continue; }  // keep the palace square clear
      const fm = mat("house" + k % 8 + floors, { map: houseTex("hf" + (k % 8) + floors, wall, "#f2eadb", floors) });
      const sideM = mat("hs" + k % 8, { color: wall });
      const box = new THREE.BoxGeometry(w, h, depth).translate(x + w / 2, 2 + h / 2, z0 + depth / 2);
      // front face uses the facade map: split into front + rest
      const front = new THREE.PlaneGeometry(w, h).rotateY(Math.PI).translate(x + w / 2, 2 + h / 2, z0 - 0.02);
      put(box, sideM); put(front, fm);
      // stepped gable on the front, or a plain pitched roof
      if (r() < 0.6) {
        for (let s = 0; s < 4; s++) { const sw = w * (1 - s * 0.22), sh = 1.4; put(new THREE.BoxGeometry(sw, sh, 0.6).translate(x + w / 2, 2 + h + s * sh + sh / 2, z0 + 0.3), sideM); }
        put(new THREE.BoxGeometry(w * 0.9, 0.3, depth).translate(x + w / 2, 2 + h + 0.15, z0 + depth / 2), roofM);
      } else {
        const rf = new THREE.CylinderGeometry(0.01, w * 0.62, 4.2, 4, 1).rotateY(Math.PI / 4).scale(1, 1, depth / w * 1.0).translate(x + w / 2, 2 + h + 2.1, z0 + depth / 2);
        put(rf, k % 3 ? roofM : roof2);
      }
      x += w + 0.4; k++;
    }
  };
  row(34, 12, 1); row(50, 12, 1.15); row(68, 14, 1.3);
  // Tre Kronor: the royal castle, a big block with a central tower and three golden crowns on its spire
  const palM = mat("palace", { map: palaceTex() }); (palM.map as THREE.Texture).repeat.set(4, 1);
  const goldM = shiny("gold", "#e9b43c", "#fff2b0", 60);
  put(new THREE.BoxGeometry(70, 26, 30).translate(-90, 15, 110), palM);
  put(new THREE.BoxGeometry(20, 30, 36).translate(-128, 17, 110), palM);
  put(new THREE.BoxGeometry(20, 30, 36).translate(-52, 17, 110), palM);
  put(new THREE.BoxGeometry(72, 2, 32).translate(-90, 29, 110), mat("palRoof", { color: "#41495a" }));
  put(new THREE.BoxGeometry(14, 52, 14).translate(-90, 28, 100), palM);
  put(new THREE.ConeGeometry(9, 22, 4).rotateY(Math.PI / 4).translate(-90, 65, 100), mat("spireGreen", { color: "#5d8f72" }));
  for (const [dx, dy] of [[0, 80], [-4, 72], [4, 72]] as const) {
    const cr = new THREE.CylinderGeometry(1.6, 1.3, 1.6, 10, 1, true); put(cr.translate(-90 + dx, dy, 100), goldM);
    put(new THREE.SphereGeometry(0.7, 8, 6).translate(-90 + dx, dy + 1.4, 100), goldM);
  }
  for (const xx of [-128, -52]) put(new THREE.ConeGeometry(11, 16, 4).rotateY(Math.PI / 4).translate(xx, 40, 110), mat("spireGreen", { color: "#5d8f72" }));
  // the great church tower further back
  put(new THREE.BoxGeometry(12, 44, 12).translate(40, 24, 120), mat("church", { color: "#c96f45" }));
  put(new THREE.ConeGeometry(8, 30, 8).translate(40, 61, 120), mat("spireBlack", { color: "#2f3540" }));
  // far south shore: low green hills with a few houses
  put(new THREE.PlaneGeometry(1600, 500).rotateX(-Math.PI / 2).translate(0, 1.5, -520), mat("grassV", { color: "#5f9a4e" }));
  for (let i = 0; i < 9; i++) put(new THREE.SphereGeometry(60 + r() * 50, 16, 10).scale(1.6, 0.35, 1).translate(-700 + i * 170, 0, -330 - r() * 80), mat("hill", { color: i % 2 ? "#5b9750" : "#6aa65a" }));
  for (let i = 0; i < 40; i++) {
    const w = 6 + r() * 5, h = 6 + r() * 7, hx = -500 + r() * 1000, hz = -275 - r() * 30;
    put(new THREE.BoxGeometry(w, h, 8).translate(hx, 1.5 + h / 2, hz), mat("hs" + (i % 8), { color: walls[i % walls.length] }));
    put(new THREE.ConeGeometry(w * 0.72, 4, 4).rotateY(Math.PI / 4).translate(hx, 1.5 + h + 2, hz), roofM);
  }
  // quay props: barrels, crates, a crane
  for (let i = 0; i < 30; i++) {
    const px = -120 + r() * 220, pz = 33 + r() * 1.5;
    if (r() < 0.5) put(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 10).translate(px, 2.55, pz), mat("barrel", { color: "#8a5a34" }));
    else put(new THREE.BoxGeometry(1.1, 1.1, 1.1).translate(px, 2.55, pz), mat("crate", { color: "#b58a55" }));
  }
  const group = new THREE.Group();
  for (const [m, list] of geos) {
    const clean = list.map((g) => { const c = new THREE.BufferGeometry(); c.setAttribute("position", g.attributes.position); c.setAttribute("normal", g.attributes.normal); c.setAttribute("uv", g.attributes.uv ?? new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return c; });
    const mesh = new THREE.Mesh(mergeGeometries(clean, false), m); mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; group.add(mesh);
  }
  return group;
};

/** sprite on the no-ink layer (fx: bubbles, spray, sparkles, wind streaks, clouds) */
export const sprite = (map: THREE.Texture, color = "#ffffff", additive = false) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, fog: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  s.layers.set(NOINK);
  return s;
};
