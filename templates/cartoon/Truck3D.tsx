// The one 3D actor of the Emu War short: a 1930s army truck in toon shading with ink outlines (inverted hull), drawn in a
// transparent three.js layer whose camera is locked to the 2D stage camera, so 2D emus and soldiers can run in front of
// and behind it. Cheap: a few dozen meshes, no post-processing.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Cam, W, H } from "./stage";

export type TruckState = { x: number; z: number; yaw: number; bounce: number; pitch: number; roll: number; wheel: number; visible: boolean };

const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const toon = (c: string) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });
const inkM = new THREE.MeshBasicMaterial({ color: "#16121c", side: THREE.BackSide });

export function addInk(root: THREE.Object3D, k = 0.045) {
  const list: THREE.Mesh[] = [];
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !m.userData.ink) list.push(m); });
  for (const m of list) {
    const geo = m.geometry.clone(); geo.computeBoundingSphere();
    const hull = new THREE.Mesh(geo, inkM); hull.userData.ink = true;
    // push the hull out along normals by a fixed thickness
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nor.getX(i) * k / (m.scale.x || 1), pos.getY(i) + nor.getY(i) * k / (m.scale.y || 1), pos.getZ(i) + nor.getZ(i) * k / (m.scale.z || 1));
    m.add(hull);
  }
}

export function buildTruck() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const olive = toon("#6f7a42"), oliveD = toon("#55602f"), wood = toon("#b07d48"), black = toon("#2a2622"), chrome = toon("#d9d2b8"), glass = toon("#9fc7d6"), lamp = toon("#fff3c4");
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const g = new THREE.BoxGeometry(w, h, d); const b = new THREE.Mesh(g, m); b.position.set(x, y, z); body.add(b); return b; };
  // chassis + bed (length along +x = forward)
  box(5.2, 0.25, 1.7, black, 0, 0.75, 0);
  box(2.9, 0.15, 2.0, wood, -1.15, 1.0, 0);
  for (const s of [-1, 1]) box(2.9, 0.55, 0.1, wood, -1.15, 1.35, s * 0.97);
  box(0.1, 0.55, 2.0, wood, -2.55, 1.35, 0);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) box(0.08, 0.6, 0.12, oliveD, -2.4 + i * 0.85, 1.35, s * 1.0);
  // cab
  box(1.25, 1.2, 1.8, olive, 0.95, 1.6, 0);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.4, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2).scale(0.75, 0.25, 1.32), olive);
  roof.position.set(0.95, 2.18, 0); body.add(roof);
  box(0.05, 0.55, 1.5, glass, 1.58, 1.85, 0);
  for (const s of [-1, 1]) box(0.75, 0.45, 0.04, glass, 0.95, 1.85, s * 0.91);
  // hood + radiator
  const hood = box(1.4, 0.75, 1.15, olive, 2.25, 1.32, 0);
  hood.scale.set(1, 1, 1);
  box(0.12, 0.85, 1.15, chrome, 3.0, 1.35, 0);
  for (let i = 0; i < 5; i++) box(0.14, 0.7, 0.03, black, 3.02, 1.35, -0.45 + i * 0.225);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), lamp); l.position.set(3.0, 1.85, s * 0.62); body.add(l); }
  // fenders
  for (const [x, s] of [[2.25, -1], [2.25, 1], [-1.6, -1], [-1.6, 1]] as [number, number][]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 18, 1, true, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2 - Math.PI / 2), oliveD);
    f.rotation.z = 0; f.position.set(x, 0.62, s * 0.88); f.material = oliveD; (f.material as THREE.Material).side = THREE.DoubleSide; body.add(f);
  }
  box(1.0, 0.08, 0.4, black, 0.95, 0.9, 1.0); box(1.0, 0.08, 0.4, black, 0.95, 0.9, -1.0);   // running boards
  // wheels
  const wheels: THREE.Group[] = [];
  for (const [x, s] of [[2.25, -1], [2.25, 1], [-1.6, -1], [-1.6, 1]] as [number, number][]) {
    const w = new THREE.Group(); w.position.set(x, 0.5, s * 0.88);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.14, 10, 22), black); w.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 14).rotateX(Math.PI / 2), olive); w.add(hub);
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.05), chrome); sp.rotation.z = (i / 5) * Math.PI; sp.position.z = s * 0.07; w.add(sp); }
    root.add(w); wheels.push(w);
  }
  // white army star / number plate on the door
  const plate = box(0.5, 0.3, 0.02, chrome, 0.95, 1.4, 0.92);
  plate.scale.set(1, 1, 1);
  addInk(root);
  root.traverse((o) => { o.castShadow = true; });
  return { root, body, wheels };
}

export const TruckLayer: React.FC<{ cam: Cam; truck: TruckState; sunDir?: [number, number, number] }> = ({ cam, truck, sunDir = [-0.5, 1, -0.6] }) => {
  const { camera, scene } = useThree();
  const T = useMemo(() => buildTruck(), []);
  const lights = useMemo(() => {
    const g = new THREE.Group();
    const sun = new THREE.DirectionalLight("#fff4de", 2.4); g.add(sun, sun.target);
    const amb = new THREE.HemisphereLight("#cfe4ff", "#b8925a", 1.3); g.add(amb);
    return { g, sun };
  }, []);
  const c = camera as THREE.PerspectiveCamera;
  c.fov = THREE.MathUtils.radToDeg(2 * Math.atan(H / 2 / (cam.k * cam.f)));
  c.aspect = W / H; c.near = 0.2; c.far = 3000;
  c.position.set(cam.x, cam.y, -cam.z); c.rotation.set(0, 0, 0); c.up.set(0, 1, 0);
  c.setViewOffset(W, H, 0, -cam.tilt, W, H);
  c.updateProjectionMatrix();
  lights.sun.position.set(truck.x + sunDir[0] * 50, sunDir[1] * 50, -truck.z - sunDir[2] * 50); lights.sun.target.position.set(truck.x, 0, -truck.z);
  T.root.visible = truck.visible;
  T.root.position.set(truck.x, 0, -truck.z);
  T.root.rotation.set(0, truck.yaw, 0);
  T.body.position.y = truck.bounce; T.body.rotation.set(truck.roll, 0, truck.pitch);
  T.wheels.forEach((w) => (w.rotation.z = -truck.wheel));
  void scene;
  return (<><primitive object={T.root} dispose={null} /><primitive object={lights.g} dispose={null} /></>);
};
