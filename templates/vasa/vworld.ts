// The Vasa short's whole world in one three.js scene, posed per frame from vstory.ts (pure function of time):
// harbour (sea, sky, clouds, town, Tre Kronor), the ship, her crew and admiral, rowing boats and swimmers, the
// diagram stage, the inquiry room, the sea floor, the 1961 pontoons and the museum hall, plus sprite effects.
import * as THREE from "three";
import { TONE, LFB, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import {
  buildShip, buildTown, rowBoat, pontoon, sprite, mat, flat, ShipParts,
  cloudTex, dotTex, ringTex, streakTex, sparkTex, labelTex, gridTex, mudTex, panelTex, deckY, halfAt, HALF_L, sheer,
} from "./vparts";
import { makePerson, pose, drawToons, Person, Look as PLook } from "./toon2d";
import { FPS, SHOTS, shotAt, shipAt, camAt, Look, V3, MOOR, SINK, DIAG, ROOM, MUSE, MUD_Y, smooth, clamp01, crowdSide, running, RUNS, lerp, keys, sailPos } from "./vstory";

type C3 = [number, number, number];
type LookDef = {
  sky: [string, string, string] | null; fog: string; near: number; far: number; sun: V3;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;
  sea: { near: string; far: string; crest: string; under: string; shade: C3 }; grade: "day" | "golden"; cloud: string;
};
const LOOKS: Record<Look, LookDef> = {
  day: { sky: ["#d6e6f2", "#93bde6", "#4f86d1"], fog: "#cadcec", near: 140, far: 1100, sun: [-0.45, 0.62, -0.64],
    lit: [1.55, 1.46, 1.32], shade: [0.42, 0.42, 0.56], lift: [0.05, 0.06, 0.1], lambert: 0.35, sideK: 0.85, term: 0.2,
    sea: { near: "#2b86ad", far: "#79b2d0", crest: "#c8ecf4", under: "#86d0d6", shade: [0.55, 0.6, 0.75] }, grade: "day", cloud: "#ffffff" },
  storm: { sky: ["#a9b2bd", "#7c899c", "#4d5a72"], fog: "#9aa5b2", near: 80, far: 700, sun: [-0.5, 0.55, -0.67],
    lit: [1.12, 1.12, 1.18], shade: [0.38, 0.4, 0.52], lift: [0.04, 0.05, 0.08], lambert: 0.4, sideK: 0.85, term: 0.25,
    sea: { near: "#2a6177", far: "#6a8597", crest: "#e3edf2", under: "#7fb6bd", shade: [0.6, 0.62, 0.72] }, grade: "day", cloud: "#cfd6e0" },
  sink: { sky: ["#b2b8bf", "#8e98a6", "#67748a"], fog: "#a3abb5", near: 70, far: 760, sun: [-0.45, 0.6, -0.66],
    lit: [1.0, 1.0, 1.06], shade: [0.42, 0.43, 0.52], lift: [0.04, 0.05, 0.08], lambert: 0.4, sideK: 0.86, term: 0.25,
    sea: { near: "#33627a", far: "#7c8f9d", crest: "#dfe7ec", under: "#7fb6bd", shade: [0.62, 0.64, 0.72] }, grade: "day", cloud: "#d9dde3" },
  diagram: { sky: null, fog: "#f3e7c9", near: 900, far: 2000, sun: [0.6, 0.55, -0.58],
    lit: [1.3, 1.27, 1.2], shade: [0.62, 0.6, 0.68], lift: [0.05, 0.05, 0.06], lambert: 0.3, sideK: 0.9, term: 0.2,
    sea: { near: "#2b86ad", far: "#2b86ad", crest: "#c8ecf4", under: "#86d0d6", shade: [1, 1, 1] }, grade: "day", cloud: "#ffffff" },
  room: { sky: null, fog: "#3a2a22", near: 30, far: 90, sun: [-0.55, 0.55, -0.62],
    lit: [1.55, 1.25, 0.9], shade: [0.36, 0.29, 0.33], lift: [0.06, 0.04, 0.05], lambert: 0.35, sideK: 0.85, term: 0.22,
    sea: { near: "#000000", far: "#000000", crest: "#000000", under: "#000000", shade: [1, 1, 1] }, grade: "golden", cloud: "#ffffff" },
  under: { sky: null, fog: "#1d5a62", near: 4, far: 85, sun: [0.15, 1, 0.1],
    lit: [0.62, 0.98, 0.95], shade: [0.24, 0.4, 0.46], lift: [0.03, 0.08, 0.09], lambert: 0.4, sideK: 0.8, term: 0.3,
    sea: { near: "#2a7d88", far: "#2a7d88", crest: "#9ae6e6", under: "#8ad8d8", shade: [1, 1, 1] }, grade: "day", cloud: "#ffffff" },
  dawn: { sky: ["#ffd6a8", "#f4ab9b", "#7d90c4"], fog: "#f2c6a8", near: 120, far: 1000, sun: [0.55, 0.35, -0.76],
    lit: [1.65, 1.15, 0.82], shade: [0.38, 0.35, 0.56], lift: [0.06, 0.05, 0.1], lambert: 0.35, sideK: 0.84, term: 0.15,
    sea: { near: "#3c6f98", far: "#e6b49c", crest: "#ffe2c6", under: "#86d0d6", shade: [0.55, 0.55, 0.75] }, grade: "golden", cloud: "#ffe6d0" },
  museum: { sky: null, fog: "#151821", near: 70, far: 260, sun: [0.32, 0.85, -0.42],
    lit: [1.75, 1.48, 1.12], shade: [0.17, 0.18, 0.25], lift: [0.02, 0.03, 0.06], lambert: 0.4, sideK: 0.8, term: 0.2,
    sea: { near: "#000000", far: "#000000", crest: "#000000", under: "#000000", shade: [1, 1, 1] }, grade: "day", cloud: "#ffffff" },
};
export const gradeOf = (t: number) => LOOKS[shotAt(t).look].grade;

const SEA_DECL = /* glsl */ `#include <common>
uniform vec3 uNear, uFar, uCrest, uUnder, uSeaShade; uniform float uTime, uGust, uFoamK; uniform vec4 uShip;
varying vec3 vWP;`;
const SEA_COL = /* glsl */ `
  float dd = length(vWP.xz - cameraPosition.xz);
  vec3 c = mix(uNear, uFar, smoothstep(25.0, 520.0, dd));
  float w1 = sin(vWP.x * 0.21 + vWP.z * 0.13 + uTime * 1.1) + sin(-vWP.x * 0.17 + vWP.z * 0.29 + uTime * 0.8 + 1.3) + 0.6 * sin(vWP.x * 0.55 - vWP.z * 0.43 + uTime * 1.9);
  float crest = smoothstep(1.62 - uGust * 0.7, 1.95 - uGust * 0.7, w1) * (1.0 - smoothstep(70.0, 380.0, dd)) * smoothstep(8.0, 45.0, dd) * 0.8;
  vec2 q = vWP.xz - uShip.xy; q = vec2(q.x / uShip.z, q.y / uShip.w); float e = length(q);
  float foam = smoothstep(1.22, 0.98, e) * (0.55 + 0.45 * sin(uTime * 3.0 + atan(q.y, q.x) * 9.0)) * uFoamK;
  c = mix(c, uCrest, clamp(max(crest * 0.85, foam), 0.0, 1.0));
  if (!gl_FrontFacing) c = uUnder;
  diffuseColor.rgb = c;`;

const PL = (p: V3) => new THREE.Vector3(...p);

export class VasaWorld {
  root = new THREE.Group();
  private ship: ShipParts;
  private harbour = new THREE.Group(); private diagram = new THREE.Group(); private room = new THREE.Group();
  private museum = new THREE.Group(); private seabed = new THREE.Group(); private raise = new THREE.Group();
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial; private clouds: THREE.Sprite[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight; private fog = new THREE.Fog("#ffffff", 100, 1000);
  private sea: THREE.Mesh; private SU: Record<string, THREE.IUniform>;
  private crew: { p: Person; x: number; z: number; k: number }[] = [];
  private admiral: Person;
  private boats: { b: ReturnType<typeof rowBoat>; rowers: Person[] }[] = [];
  private swimmers: Person[] = [];
  private officials: Person[] = [];
  private visitors: Person[] = [];
  private fx: Record<string, THREE.Sprite[]> = {};
  private rays: THREE.Mesh[] = [];
  private fish: THREE.Mesh[] = [];
  private v = new THREE.Vector3(); private m = new THREE.Matrix4();

  constructor() {
    const R = this.root;
    // ---- sky ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, 0.18, el)); c = mix(c, c2, smoothstep(0.18, 0.9, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 40, 20), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    for (let i = 0; i < 14; i++) {
      const c = sprite(cloudTex(i % 5)); (c.material as THREE.SpriteMaterial).fog = false;
      const a = (i / 14) * Math.PI * 2 + 0.2, d = 700 + (i % 3) * 120, w = 160 + (i % 4) * 50;
      c.position.set(Math.cos(a) * d, 110 + (i % 5) * 34, Math.sin(a) * d); c.scale.set(w, w / 2, 1);
      this.clouds.push(c); this.harbour.add(c);
    }
    // ---- lights ----
    this.hemi = new THREE.HemisphereLight("#dcecff", "#6c5c4c", 0.5);
    this.sun = new THREE.DirectionalLight("#fff2dc", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0004;
    R.add(this.hemi, this.sun, this.sun.target);

    // ---- sea ----
    this.SU = {
      uNear: { value: new THREE.Color() }, uFar: { value: new THREE.Color() }, uCrest: { value: new THREE.Color() }, uUnder: { value: new THREE.Color() },
      uSeaShade: { value: new THREE.Vector3(0.6, 0.6, 0.75) }, uTime: { value: 0 }, uGust: { value: 0 }, uFoamK: { value: 1 },
      uShip: { value: new THREE.Vector4(0, 0, 26, 7) },
    };
    const seaM = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    seaM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.SU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", SEA_DECL).replace("#include <map_fragment>", SEA_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(uSeaShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    seaM.customProgramCacheKey = () => "vasaSea1";
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200).rotateX(-Math.PI / 2), seaM);
    this.sea.receiveShadow = true; this.harbour.add(this.sea);
    this.harbour.add(buildTown());
    R.add(this.harbour);

    // ---- the ship ----
    this.ship = buildShip(); R.add(this.ship.root);
    // crew: 30 sailors in a 6 x 5 block on the waist
    const crewLooks: PLook[] = [
      { coat: "#2f5fa8", pants: "#e9e1cc", hat: "cap", hatCol: "#c8392f", stripes: true },
      { coat: "#c8392f", pants: "#40475a", hat: "beret", hatCol: "#2f3b55", stripes: true },
      { coat: "#7c8f3e", pants: "#6b4a2f", hat: "none", hair: "#6b3f22" },
      { coat: "#d8c9a5", pants: "#4b5b7a", hat: "cap", hatCol: "#3d6db2", hair: "#2b1b12" },
      { coat: "#9b5b34", pants: "#30363f", hat: "beret", hatCol: "#c8392f", beard: "#6b3f22" },
    ];
    for (let i = 0; i < 30; i++) {
      const p = makePerson({ ...crewLooks[i % 5], scale: 0.95 + ((i * 7) % 5) * 0.03 }, i * 13);
      const col = i % 6, row = Math.floor(i / 6);
      this.crew.push({ p, x: -7.5 + col * 3.3 + (row % 2) * 0.9, z: -2.6 + row * 1.3, k: i });
      this.ship.deckHands.add(p.g);
    }
    this.admiral = makePerson({ coat: "#1d3f7a", pants: "#1a2440", hat: "admiral", hatCol: "#1a1a22", hair: "#d9d4c8", beard: "#d9d4c8",
      sash: "#e0b13b", collar: true, scale: 1.12, belly: 1.25, plume: "#f4f1ea", skin: "#f1c6a0" }, 999);
    this.ship.deckHands.add(this.admiral.g);

    // ---- boats + swimmers (the rescue) ----
    for (let i = 0; i < 3; i++) {
      const b = rowBoat(["#8a5a36", "#6f4a30", "#9b6a40"][i]);
      const rowers = [0, 1].map((k) => { const p = makePerson({ coat: ["#5b6f8c", "#a5492f", "#6d7f3e"][(i + k) % 3], pants: "#3b3a40", hat: k ? "cap" : "none", hair: "#4a2c18", hatCol: "#384a6a" }, 300 + i * 7 + k); p.g.position.set(k ? -0.9 : 0.7, -0.15, 0); b.g.add(p.g); return p; });
      this.boats.push({ b, rowers }); this.harbour.add(b.g);
    }
    for (let i = 0; i < 6; i++) { const p = makePerson({ coat: ["#2f5fa8", "#c8392f", "#d8c9a5"][i % 3], pants: "#333", hat: i % 2 ? "cap" : "none", hair: "#3a2414", hatCol: "#c8392f", stripes: i % 2 === 0 }, 500 + i); this.swimmers.push(p); this.harbour.add(p.g); }

    // ---- diagram stage: blueprint backdrop, see-through water, labels on the ship ----
    const back = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshBasicMaterial({ map: (() => { const t = gridTex(); t.repeat.set(10, 10); return t; })(), fog: false }));
    back.rotation.y = Math.PI / 2; back.position.set(DIAG[0] - 70, 20, DIAG[2]); back.layers.set(NOINK); this.diagram.add(back);
    const water = new THREE.Mesh(new THREE.BoxGeometry(110, 80, 140), new THREE.MeshBasicMaterial({ color: "#3d8fc2", transparent: true, opacity: 0.42, depthWrite: false, fog: false }));
    water.position.set(DIAG[0], -40, DIAG[2]); water.layers.set(NOINK); water.renderOrder = 3; this.diagram.add(water);
    const line = new THREE.Mesh(new THREE.BoxGeometry(120, 0.35, 140), flat("waterline", "#1f5f92")); line.position.set(DIAG[0], 0, DIAG[2]); this.diagram.add(line);
    R.add(this.diagram);
    const D = this.ship.diagram, plane = (tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthTest: false }));
      m.rotation.y = Math.PI / 2; m.position.set(x, y, z); m.layers.set(NOINK); m.renderOrder = 5; D.add(m); return m;
    };
    const ironM = mat("iron", { color: "#4a4e58" });
    for (const s of [-1, 1]) for (const y of [2.6, 5.0]) {
      const blk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 1.5, 4).rotateY(Math.PI / 4), ironM); blk.position.set(34, y + 0.4, s * 3.3); D.add(blk);
    }
    plane(labelTex("lblGuns", "64 GUNS", "#ffd400", "#111"), 11, 3.4, 36, 11.2, 0);
    plane(labelTex("lblHigh", "WAY TOO HIGH", "#ff4d4d", "#fff"), 13, 4.0, 36, 17.4, 0);
    const cg = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.fillStyle = "#111"; g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 62, 0, Math.PI / 2); g.fill(); g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 62, Math.PI, Math.PI * 1.5); g.fill(); g.lineWidth = 6; g.strokeStyle = "#111"; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), fog: false }));
    cg.rotation.y = Math.PI / 2; cg.position.set(37, 7.6, 0); cg.layers.set(NOINK); cg.renderOrder = 6; D.add(cg);
    const bal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 2.4), ironM); bal.position.set(34, -3.6, 0); D.add(bal);
    plane(labelTex("lblBal", "ballast", "#ffffff", "#444"), 5, 1.6, 36, -1.7, 0);

    // ---- the inquiry room ----
    const rm = this.room, O = PL(ROOM);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18).rotateX(-Math.PI / 2), mat("roomFloor", { map: (() => { const t = panelTex(); return t; })(), color: "#c9a27c" }));
    floor.position.copy(O); floor.receiveShadow = true; rm.add(floor);
    const wallM = mat("roomWall", { map: panelTex(), side: THREE.DoubleSide });
    for (const [x, z, ry] of [[0, 9, 0], [0, -9, 0], [9, 0, Math.PI / 2], [-9, 0, Math.PI / 2]] as const) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), wallM); w.position.set(O.x + x, 4, O.z + z); w.rotation.y = ry; w.receiveShadow = true; rm.add(w);
    }
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.0), fog: false })); win.position.set(O.x - 3, 4.2, O.z - 8.95); rm.add(win);
    const win2 = win.clone(); win2.position.x = O.x + 3; rm.add(win2);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.16, 28), mat("table", { color: "#6b3e22" })); table.position.set(O.x, 0.95, O.z); table.castShadow = table.receiveShadow = true; rm.add(table);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.9, 10), mat("table", { color: "#6b3e22" })); leg.position.set(O.x, 0.45, O.z); rm.add(leg);
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.7), mat("paper", { color: "#f4ecd8" })); paper.position.set(O.x + 0.3, 1.05, O.z - 0.2); paper.rotation.y = 0.4; rm.add(paper);
    const offLooks: PLook[] = [
      { coat: "#1c1c22", pants: "#1c1c22", hat: "tall", hatCol: "#15151a", collar: true, beard: "#5a3a22", hair: "#5a3a22" },
      { coat: "#3b2f4a", pants: "#1c1c22", hat: "none", collar: true, hair: "#c9c2b5", beard: "#c9c2b5" },
      { coat: "#8b1f2a", pants: "#2a1c1c", hat: "tall", hatCol: "#15151a", collar: true, beard: "#2b1b12", belly: 1.2 },
      { coat: "#1f3a2f", pants: "#1c1c22", hat: "beret", hatCol: "#111", collar: true, hair: "#8a5a30" },
      { coat: "#1c1c22", pants: "#1c1c22", hat: "none", collar: true, hair: "#2b1b12", beard: "#2b1b12", belly: 1.15 },
      { coat: "#4a3a2a", pants: "#1c1c22", hat: "tall", hatCol: "#15151a", collar: true, beard: "#9a8a70" },
    ];
    offLooks.forEach((L, i) => { const p = makePerson(L, 700 + i); this.officials.push(p); rm.add(p.g); });
    R.add(rm);

    // ---- sea floor: mud, light shafts, fish ----
    const mud = new THREE.Mesh(new THREE.PlaneGeometry(500, 500, 40, 40).rotateX(-Math.PI / 2), mat("mud", { map: (() => { const t = mudTex(); t.repeat.set(20, 20); return t; })() }));
    const mp = mud.geometry.attributes.position; for (let i = 0; i < mp.count; i++) mp.setY(i, Math.sin(mp.getX(i) * 0.08) * 0.6 + Math.cos(mp.getZ(i) * 0.11) * 0.5);
    mud.geometry.computeVertexNormals(); mud.position.set(SINK[0], MUD_Y, SINK[2]); mud.receiveShadow = true; this.seabed.add(mud);
    const rayM = new THREE.MeshBasicMaterial({ color: "#bff3ee", transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(6, 70), rayM); r.layers.set(NOINK); r.position.set(SINK[0] - 20 + i * 9, -14, SINK[2] - 8 + (i % 3) * 6); r.rotation.set(0, 0.6 + i * 0.3, 0.25); this.rays.push(r); this.seabed.add(r); }
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 6).scale(1.8, 0.7, 0.35), mat("fish" + (i % 2), { color: i % 2 ? "#e0a03c" : "#6a8f9a" })); this.fish.push(f); this.seabed.add(f); }
    R.add(this.seabed);

    // ---- 1961: pontoons and cables ----
    for (const s of [-1, 1]) { const p = pontoon(); p.position.set(SINK[0], 0, SINK[2] + s * 12); this.raise.add(p); }
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 14, 5), mat("cable", { color: "#2b2b30" }));
      c.position.set(SINK[0] - 15 + i * 6, -4, SINK[2] + s * 9.2); c.rotation.x = s * 0.4; this.raise.add(c);
    }
    R.add(this.raise);

    // ---- the museum hall ----
    const mu = this.museum, MO = PL(MUSE);
    const hall = new THREE.Mesh(new THREE.BoxGeometry(160, 80, 120), mat("hallWall", { color: "#3a3f4e", side: THREE.BackSide }));
    hall.position.set(MO.x, 39.9, MO.z); hall.receiveShadow = true; mu.add(hall);
    const mfloor = new THREE.Mesh(new THREE.PlaneGeometry(160, 120).rotateX(-Math.PI / 2), mat("hallFloor", { color: "#4a4a52" }));
    mfloor.position.set(MO.x, 0, MO.z); mfloor.receiveShadow = true; mu.add(mfloor);
    for (let i = -3; i <= 3; i++) {   // cradle
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 8), mat("cradle", { color: "#2c2e36" })); c.position.set(MO.x + i * 6, 1.1, MO.z); c.castShadow = c.receiveShadow = true; mu.add(c);
    }
    const poolM = new THREE.MeshBasicMaterial({ map: dotTex("pool", "rgba(255,226,170,0.55)", "rgba(255,226,170,0)"), transparent: true, depthWrite: false, fog: false });
    for (let i = 0; i < 8; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(16, 16).rotateX(-Math.PI / 2), poolM); p.position.set(MO.x - 35 + i * 10, 0.05, MO.z - 14); p.layers.set(NOINK); mu.add(p); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(110, 0.12, 0.12), mat("rail", { color: "#c9c4b8" })); rail.position.set(MO.x, 1.1, MO.z - 13); mu.add(rail);
    for (let i = 0; i < 12; i++) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), mat("rail", { color: "#c9c4b8" })); post.position.set(MO.x - 50 + i * 9, 0.55, MO.z - 13); mu.add(post); }
    const visLooks = ["#e2574c", "#3d7cc9", "#f2c14e", "#5aa36b", "#8a5cc2", "#f08a3c", "#2fa6a0"];
    for (let i = 0; i < 14; i++) {
      const p = makePerson({ coat: visLooks[i % 7], pants: i % 3 ? "#2e3445" : "#6b5a48", hat: i % 4 === 0 ? "cap" : "none", hatCol: "#222", hair: ["#2b1b12", "#c99a4b", "#6b3f22", "#111"][i % 4], scale: i % 5 === 4 ? 0.7 : 1 }, 900 + i);
      p.g.position.set(MO.x - 45 + i * 6.6 + (i % 2) * 1.5, 0, MO.z - 14.6 - (i % 3) * 0.9);
      this.visitors.push(p); mu.add(p.g);
    }
    R.add(mu);

    // ---- sprite pools ----
    const pool = (name: string, n: number, tex: THREE.Texture, color = "#ffffff", add = false) => {
      this.fx[name] = Array.from({ length: n }, () => { const s = sprite(tex, color, add); s.visible = false; R.add(s); return s; });
    };
    pool("bubble", 60, ringTex(), "#e8ffff");
    pool("spray", 90, dotTex("spray", "rgba(255,255,255,1)", "rgba(200,240,255,0)"), "#e6f7ff");
    pool("streak", 26, streakTex(), "#ffffff");
    pool("spark", 34, sparkTex(), "#fff3b8", true);
  }

  private hideFx() { for (const k in this.fx) for (const s of this.fx[k]) s.visible = false; }
  private fxN: Record<string, number> = {};
  private emit(name: string, x: number, y: number, z: number, size: number, op = 1) {
    const i = this.fxN[name] ?? 0, s = this.fx[name][i];
    if (!s) return;
    this.fxN[name] = i + 1;
    s.visible = true; s.position.set(x, y, z); s.scale.set(size, name === "streak" ? size / 8 : size, 1);
    (s.material as THREE.SpriteMaterial).opacity = op;
  }

  /** poses the world for time t; returns the camera's focus point */
  update(t: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const shot = shotAt(t), L = LOOKS[shot.look], S = shipAt(t), C = camAt(t);
    const place = shot.place;
    this.harbour.visible = place === "harbour"; this.diagram.visible = place === "diagram"; this.room.visible = place === "room";
    this.museum.visible = place === "museum"; this.seabed.visible = shot.id === 14; this.raise.visible = shot.id === 15;
    // ---- ship pose ----
    const SR = this.ship.root;
    SR.visible = shot.id !== 13;
    SR.position.set(...S.pos);
    SR.rotation.set(THREE.MathUtils.degToRad(S.heel), 0, THREE.MathUtils.degToRad(S.pitch), "XYZ");
    SR.updateMatrixWorld(true);
    // ---- camera ----
    const cp = PL(C.pos), cl = PL(C.look);
    if (C.local) { cp.applyMatrix4(SR.matrixWorld); cl.applyMatrix4(SR.matrixWorld); }
    cam.position.copy(cp); cam.up.set(0, 1, 0); cam.lookAt(cl); cam.rotateZ(C.roll);
    cam.fov = C.fov; cam.near = 0.25; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    // ---- light ----
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(0, 0, 0); TONE.uSat.value = 1.08;
    const sunDir = PL(L.sun).normalize(), focus = cl.clone();
    const dist = cp.distanceTo(focus), Rr = THREE.MathUtils.clamp(dist * 0.9 + 14, 18, 120);
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 50; sc.far = 700; sc.updateProjectionMatrix();
    this.sun.shadow.normalBias = 0.02 * (Rr / 20);
    untone(L.fog, this.fog.color); this.fog.near = L.near; this.fog.far = L.far; scene.fog = this.fog; scene.background = null;
    this.sky.visible = !!L.sky && place === "harbour" && shot.id !== 14;
    if (L.sky) { const u = this.skyMat.uniforms; untone(L.sky[0], u.c0.value); untone(L.sky[1], u.c1.value); untone(L.sky[2], u.c2.value); }
    this.sky.position.copy(cam.position);
    for (const c of this.clouds) { c.visible = this.sky.visible; (c.material as THREE.SpriteMaterial).color.set(L.cloud); c.position.x += 0; }
    // ---- sea ----
    const U = this.SU, sea = L.sea;
    untone(sea.near, U.uNear.value); untone(sea.far, U.uFar.value); untone(sea.crest, U.uCrest.value); untone(sea.under, U.uUnder.value);
    U.uSeaShade.value.set(...sea.shade); U.uTime.value = t; U.uGust.value = S.gust;
    U.uShip.value.set(S.pos[0], S.pos[2], 26, 7.2);
    U.uFoamK.value = shot.id === 15 ? 1 : S.pos[1] > -3 && place === "harbour" ? 0.7 : shot.id === 2 || shot.id === 11 ? 0.22 : 0;
    if (shot.id === 2 || shot.id === 11) U.uShip.value.set(S.pos[0], S.pos[2], 9, 6);
    // ---- the ship's details ----
    this.poseShip(t, S, shot.id);
    // ---- people ----
    this.poseCrew(t, shot.id, S);
    this.poseRescue(t, shot.id);
    this.poseRoom(t, shot.id);
    this.poseMuseum(t, shot.id);
    // ---- effects ----
    this.hideFx(); this.fxN = {};
    this.effects(t, shot.id, S, cam);
    // underwater extras
    if (shot.id === 14) {
      this.fish.forEach((f, i) => { const a = t * 0.25 + i * 0.7; f.position.set(SINK[0] + Math.cos(a) * (16 + i * 2), -18 - (i % 4) * 3, SINK[2] + Math.sin(a) * (14 + i)); f.rotation.y = -a; });
      this.rays.forEach((r, i) => ((r.material as THREE.MeshBasicMaterial).opacity = 0.09 + 0.04 * Math.sin(t * 0.8 + i)));
    }
    // 2D cartoon people: turn cards to the lens, pick views, draw this frame
    this.root.updateMatrixWorld(true);
    drawToons(cam, t, this.sun.position.clone().sub(this.sun.target.position).normalize());
    return focus;
  }

  private poseShip(t: number, S: ReturnType<typeof shipAt>, id: number) {
    const P = this.ship;
    // hull colour: painted ship, wreck under water, salvaged hull, museum oak
    const tint = id === 14 ? "#77907e" : id === 15 ? "#8a8270" : S.museum ? "#a38a72" : "#ffffff";
    P.hullMat.color.set(tint);
    P.topmasts.forEach((m) => (m.visible = !S.wreck));
    P.sails.forEach((s) => (s.m.visible = !S.wreck));
    P.flags.forEach((f) => (f.m.visible = !S.wreck));
    P.rig.forEach((r) => (r.visible = !S.wreck || S.museum));
    P.diagram.visible = id === 12;
    // gunports open stern -> bow; guns roll out after them
    for (const p of P.ports) {
      const u = (p.x + HALF_L) / 48, k = clamp01(S.ports * 1.35 - u * 0.35);
      const open = S.wreck ? (p.order % 3 === 0 ? 0.3 : 0) : k;
      p.lid.rotation.x = -open * 1.45;
      const g = S.wreck ? 0 : clamp01(S.guns * 1.35 - u * 0.35);
      p.gun.visible = g > 0.01; p.gun.position.z = lerp(-1.5, 0, g);
    }
    // sails: billow with the wind; flags wave
    for (const s of P.sails) {
      const pos = s.m.geometry.attributes.position as THREE.BufferAttribute, base = s.base;
      const b = (0.6 + 1.8 * S.sails + 1.2 * S.gust) * (s.w / 9);
      for (let i = 0; i < pos.count; i++) {
        const z = base[i * 3 + 2], y = base[i * 3 + 1];
        const v = Math.cos((z / s.w) * Math.PI * 0.5), h = Math.sin(clamp01((y - (base[1] - s.h)) / s.h) * Math.PI);
        pos.setX(i, base[i * 3] + b * v * (0.4 + 0.6 * h) + Math.sin(t * 2 + y * 0.3) * 0.08);
      }
      pos.needsUpdate = true; s.m.geometry.computeVertexNormals();
    }
    for (const f of P.flags) {
      const pos = f.m.geometry.attributes.position as THREE.BufferAttribute, base = f.base;
      const k = S.flags * f.s;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        pos.setX(i, x * k); pos.setY(i, base[i * 3 + 1] * (0.8 + 0.2 * k) + Math.sin(t * 6 + x * 0.9) * 0.18 * -x * 0.3);
        pos.setZ(i, Math.sin(t * 5 + x * 1.1) * 0.35 * (-x / 5));
      }
      pos.needsUpdate = true; f.m.geometry.computeVertexNormals();
    }
  }

  private poseCrew(t: number, id: number, S: ReturnType<typeof shipAt>) {
    const show = [1, 3, 4, 5, 6, 7, 8, 9, 10].includes(id) && !S.wreck;
    this.ship.deckHands.visible = show;
    if (!show) return;
    const side = crowdSide(t), run = running(t);
    for (const c of this.crew) {
      const p = c.p, x = c.x, k = c.k;
      let z = c.z, yaw = Math.PI / 2, P: Parameters<typeof pose>[1] = {};
      if (id >= 4 && id <= 6) {
        // the stability test: everyone sprints to the other rail
        const lag = (k % 6) * 0.06, sd = crowdSide(t - lag), sd2 = crowdSide(t - lag + 0.05);
        z = sd * 2.9 + (c.z * 0.32);
        const dir = Math.sign(sd2 - sd);
        const moving = Math.abs(sd2 - sd) > 0.002 && run;
        yaw = moving ? (dir > 0 ? -Math.PI / 2 : Math.PI / 2) : Math.PI / 2 + Math.sin(k) * 0.4;
        P = moving ? { run: 1, phase: t * 2.6 + k * 0.17, face: k % 3 === 0 ? "shock" : "grin" } : { armL: [0.1, 0.15, 0.2], armR: [0.1, 0.15, 0.2], headYaw: Math.sin(t + k) * 0.3, face: k % 2 ? "worried" : "neutral", squash: -0.05 * Math.max(0, 1 - Math.abs(sd2 - sd) * 50) };
        if (id === 6) P = { armL: [0.05, 0.12, 0.3], armR: [0.05, 0.12, 0.3], headYaw: -0.6, face: "worried" };
      } else if (id >= 8) {
        // the gusts: hanging on, leaning against the heel
        z = c.z * 0.9; yaw = Math.PI / 2 + (k % 2 ? 0.5 : -0.5);
        P = { armL: [1.2, 0.5, 0.4], armR: [1.4, 0.4, 0.2], lean: 0.3, brow: 0.8, mouthOpen: 0.6, headYaw: 0.2, face: "scared" };
      } else if (id === 7) {
        z = c.z; P = { armR: [2.7, 0.2 + Math.sin(t * 9 + k) * 0.4, 0.3 + Math.sin(t * 9 + k) * 0.5], armL: [0.1, 0.12, 0.2], mouthOpen: 0.4, face: "happy", bounce: Math.abs(Math.sin(t * 4.5 + k)) * 0.05 };  // waving goodbye
      } else {
        P = { armL: [0.1, 0.12, 0.2], armR: [0.1, 0.12, 0.2], headYaw: Math.sin(t * 0.7 + k) * 0.5, face: k % 4 ? "neutral" : "happy" };
      }
      const y = deckY(x);
      p.g.position.set(x, y, Math.max(-halfAt(x, y) + 0.6, Math.min(halfAt(x, y) - 0.6, z)));
      p.g.rotation.y = yaw;
      p.g.visible = id !== 1 || k % 3 === 0;
      pose(p, P);
    }
    // the admiral on the quarterdeck
    const A = this.admiral, ax = -15.2;
    A.g.visible = id >= 4 && id <= 7;
    A.g.position.set(ax, deckY(ax), 0);
    let P: Parameters<typeof pose>[1] = { armL: [0.1, 0.2, 0.3], armR: [0.1, 0.2, 0.3] }, yaw = Math.PI / 2 + 0.5;
    if (id === 5) { const up = smooth((t - 21.9) / 0.18), pre = smooth((t - 21.62) / 0.22) * (1 - up); P = { armR: [lerp(0.1, 2.8, up) - pre * 0.6, 0.25, lerp(0.3, 0.1, up) + pre * 1.2], armL: [0.1 - pre * 0.3, 0.2, 0.3 + pre * 0.6], bounce: -0.07 * pre, squash: -0.08 * pre + 0.06 * up * (1 - smooth((t - 22.1) / 0.3)), brow: up * 0.9, mouthOpen: up * 0.8, face: up > 0.3 ? "shout" : pre > 0.2 ? "angry" : "worried" }; yaw = 0.2; }
    if (id === 6) {
      yaw = 0.8;
      if (t < 24.35) P = { armR: [2.8, 0.25 + Math.sin(t * 14) * 0.08, 0.1], armL: [0.1, 0.2, 0.3], brow: -0.6, mouthOpen: 0.6 + Math.sin(t * 18) * 0.3, face: "shout" };
      else if (t < 25.3) P = { armL: [0.2, 0.75, 1.9], armR: [0.2, 0.75, 1.9], hips: 1, brow: -0.5, headPitch: -0.05, face: "smug", bounce: -0.04 * (1 - smooth((t - 24.35) / 0.25)) };            // hands on hips
      else if (t < 27.15) { const d = Math.sin((t - 25.3) * 2) * 0.05; P = { armL: [0.3, 0.2, 2.4], armR: [0.3, 0.2, 2.4], headPitch: 0.28 + d, headYaw: -0.35, face: "dreamy", lean: -0.08, bounce: d * 0.5 }; } // dreamy, hands clasped
      else { const b = Math.abs(Math.sin((t - 27.15) * 5)) * 0.04 * (t < 28.1 ? 1 : 0); const pre = 1 - smooth((t - 27.15) / 0.15); P = { armL: [0.55 - pre * 0.4, 0.65 - pre * 0.4, 1.3], armR: [0.55 - pre * 0.4, 0.65 - pre * 0.4, 1.3], headYaw: 0.05, bounce: b - pre * 0.05, squash: 0.05 * (1 - pre) * Math.max(0, 1 - (t - 27.3) * 3), face: "grin" }; } // shrug
    }
    if (id === 7) { P = { armR: [2.5, 0.3 + Math.sin(t * 8) * 0.3, 0.3], armL: [0.1, 0.2, 0.3], mouthOpen: 0.5, face: "happy" }; yaw = 0.6; }
    A.g.rotation.y = yaw;
    pose(A, P);
  }

  private poseRescue(t: number, id: number) {
    const show = id === 11;
    const p0 = sailPos(44.8);
    this.boats.forEach((B, i) => {
      B.b.g.visible = show;
      if (!show) return;
      const u = clamp01((t - 45.5) / 5);
      const from = [[-62, -22], [52, -30], [-34, -44]][i], to = [[-13, -15], [11, -17], [-3, -23]][i];
      B.b.g.position.set(p0[0] + lerp(from[0], to[0], u), 0.1, p0[2] + lerp(from[1], to[1], u));
      B.b.g.rotation.y = Math.atan2(-(to[1] - from[1]), to[0] - from[0]);
      const ph = t * 1.6 + i;
      B.b.oars.forEach((o, k) => (o.rotation.y = Math.sin(ph) * 0.5 * (k ? 1 : -1)));
      B.rowers.forEach((r, k) => { r.g.rotation.y = Math.PI; pose(r, { armL: [1.3 + Math.sin(ph) * 0.6, 0.3, 0.6], armR: [1.3 + Math.sin(ph) * 0.6, 0.3, 0.6], lean: -0.2 + Math.sin(ph) * 0.25, sit: 1, face: "angry" }); });
    });
    this.swimmers.forEach((s, i) => {
      s.g.visible = show && t > 46.4;
      if (!s.g.visible) return;
      const a = i * 1.05 + 0.3, r = 14 + (i % 3) * 5;
      s.g.position.set(p0[0] + Math.cos(a) * r - 4, -1.55 + Math.sin(t * 2 + i) * 0.08, p0[2] + Math.sin(a) * r * 0.6 - 10);
      s.g.rotation.y = -a + Math.PI;
      pose(s, { armR: [2.6 + Math.sin(t * 5 + i) * 0.3, 0.2, 0.2], armL: [0.6, 0.4, 0.4], mouthOpen: 0.5, brow: 0.8, headPitch: 0.1 });
    });
  }

  private poseRoom(t: number, id: number) {
    if (id !== 13) return;
    const n = this.officials.length, O = PL(ROOM);
    const blame = smooth((t - 56.95) / 0.3), shrug = smooth((t - 58.75) / 0.25);
    const cam = camAt(t).pos;
    this.officials.forEach((p, i) => {
      const a = (i / n) * Math.PI * 2, x = O.x + Math.cos(a) * 2.55, z = O.z + Math.sin(a) * 2.55;
      p.g.position.set(x, 0, z);
      const toCenter = Math.atan2(-(O.z - z), O.x - x);
      const b = ((i + 1) % n) / n * Math.PI * 2, nx = O.x + Math.cos(b) * 2.55, nz = O.z + Math.sin(b) * 2.55;
      const toNext = Math.atan2(-(nz - z), nx - x), toCam = Math.atan2(-(cam[2] - z), cam[0] - x);
      const yaw = shrug > 0 ? lerp(toNext, toCam, shrug) : lerp(toCenter, toNext, blame);
      p.g.rotation.y = yaw;
      if (shrug > 0) pose(p, { armL: [0.55, 0.7 * shrug, 1.35], armR: [0.55, 0.7 * shrug, 1.35], brow: 0.8, bounce: Math.abs(Math.sin((t - 58.75) * 6)) * 0.03, face: i % 2 ? "worried" : "grin" });
      else pose(p, { armR: [lerp(0.1, 1.55, blame), 0.12, lerp(0.3, 0.05, blame)], armL: [0.15, 0.15, 0.4], brow: -0.8 * blame, mouthOpen: blame * 0.6 * (0.5 + 0.5 * Math.sin(t * 9 + i)), headYaw: (1 - blame) * Math.sin(t * 2 + i) * 0.4, face: blame > 0.5 ? "shout" : "neutral", bounce: blame * Math.abs(Math.sin(t * 7 + i)) * 0.03 });
    });
  }

  private poseMuseum(t: number, id: number) {
    if (id < 16) return;
    this.visitors.forEach((p, i) => {
      p.g.rotation.y = -Math.PI / 2 + Math.sin(i * 1.3) * 0.3;     // facing the ship (+z)
      const pointing = i % 4 === 1;
      pose(p, { armR: pointing ? [2.1, 0.2, 0.1] : [0.1, 0.12, 0.2], armL: [0.1, 0.12, 0.2], headPitch: 0.3, headYaw: Math.sin(t * 0.5 + i) * 0.2, bounce: Math.sin(t * 1.5 + i) * 0.005 });
    });
  }

  private effects(t: number, id: number, S: ReturnType<typeof shipAt>, cam: THREE.PerspectiveCamera) {
    const sp = S.pos;
    // bubbles: around the sunken masts (2), the sinking ship (11), drifting up from the wreck (14)
    if (id === 2 || id === 11 || id === 14) {
      for (let i = 0; i < 40; i++) {
        const ph = ((t * (0.35 + (i % 5) * 0.06) + i * 0.137) % 1);
        if (id === 14) this.emit("bubble", sp[0] - 14 + (i * 7.3) % 28, MUD_Y + 6 + ph * 26, sp[2] - 6 + (i * 3.1) % 12, 0.5 + (i % 3) * 0.3, 0.75 * (1 - ph));
        else if (id === 2 || t > 46) this.emit("bubble", sp[0] - 10 + (i * 5.3) % 20, 0.15 + ph * 0.6, sp[2] - 4 + (i * 2.7) % 8, 0.6 + ph * 1.2, 0.9 * (1 - ph));
      }
    }
    // wind streaks for the gusts, from screen left (+z) toward the ship
    if ((id === 8 || id === 9) && S.gust > 0.05) {
      for (let i = 0; i < 18; i++) {
        const ph = ((t * 0.9 + i * 0.173) % 1);
        this.emit("streak", sp[0] + 10 - (i % 6) * 6, 6 + (i * 7.7) % 34, sp[2] + 40 - ph * 80, 16, S.gust * Math.sin(ph * Math.PI) * 0.9);
      }
    }
    // the sea pours in: spray at every lower gunport near the waterline on the port side
    if (id === 10 || (id === 9 && t > 40.2)) {
      const R = this.ship.root;
      let n = 0;
      for (const p of this.ship.ports) {
        if (p.s > 0) continue;
        this.v.set(p.x, p.y, p.s * halfAt(p.x, p.y)).applyMatrix4(R.matrixWorld);
        if (this.v.y > 0.8 || this.v.y < -1.3) continue;
        for (let k = 0; k < 4 && n < 88; k++, n++) {
          const ph = (t * 1.7 + k * 0.25 + p.order * 0.11) % 1;
          this.emit("spray", this.v.x + Math.sin(k * 2 + p.order) * 0.4, Math.max(0.05, this.v.y + 0.25 + Math.sin(ph * Math.PI) * 0.7), this.v.z - (1 - ph) * 1.6, 0.28 + ph * 0.35, 0.9 * (1 - ph * 0.5));
        }
      }
    }
    // 1961: water cascading off the hull
    if (id === 15) {
      for (let i = 0; i < 70; i++) {
        const ph = (t * 1.2 + i * 0.137) % 1, x = sp[0] - 22 + (i * 0.63) % 44, s = i % 2 ? 1 : -1;
        const top = sp[1] + Math.min(8, sheer(x - sp[0]) - 1);
        this.emit("spray", x, top - ph * (top + 0.2), sp[2] + s * (halfAt(x - sp[0], 1) + 0.6 + ph * 0.6), 0.9, 0.85);
      }
    }
    // sparkles: "main character energy" at the stern; "full aura" around the whole ship
    if (id === 3 && t > 12.1) {
      for (let i = 0; i < 18; i++) { const ph = (t * 1.5 + i * 0.29) % 1; this.emit("spark", sp[0] - 22 + (i * 3.7) % 8, 6 + (i * 5.1) % 12, sp[2] - 6 + (i % 3) * 0.6, 0.8 + Math.sin(ph * Math.PI) * 1.6, Math.sin(ph * Math.PI)); }
    }
    if (id === 7 && t > 33.15) {
      const k = smooth((t - 33.15) / 0.3);
      for (let i = 0; i < 34; i++) { const ph = (t * 1.1 + i * 0.21) % 1, a = i * 0.9; this.emit("spark", sp[0] + Math.cos(a) * 22, 4 + (i * 4.3) % 40, sp[2] + Math.sin(a) * 9, (2 + Math.sin(ph * Math.PI) * 3) * k, Math.sin(ph * Math.PI) * k); }
    }
  }
}
