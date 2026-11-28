// The one 3D prop of the Napoleon short: an imperial travelling carriage (berline) in toon shading with ink outlines,
// drawn in a transparent three.js layer locked to the 2D stage camera, like Truck3D. The horses stay off-screen (2D shots
// show them); the door can swing open and bunnies (2D) can sit in front of / behind it.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Cam, W, H } from "./stage";
import { toon, addInk } from "./Truck3D";

export type CarriageState = { x: number; z: number; yaw: number; bounce: number; roll: number; pitch: number; wheel: number; door: number; visible: boolean };

export function buildCarriage() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const blue = toon("#26346a"), blueD = toon("#1a2550"), gold = toon("#e2b847"), red = toon("#b23a2e"), black = toon("#221e22"), glass = toon("#a9d1df"), cream = toon("#efe2c2"), wood = toon("#8a5a32");
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };
  // cabin: a rounded box (box + rounded caps)
  const cab = add(new THREE.BoxGeometry(1.7, 1.25, 1.45), blue, 0, 1.6, 0);
  void cab;
  add(new THREE.CylinderGeometry(0.72, 0.72, 1.7, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 0.35, 1), blue, 0, 2.22, 0);   // curved roof
  add(new THREE.BoxGeometry(1.5, 0.08, 1.25), gold, 0, 2.5, 0);                    // luggage rail
  for (const s of [-1, 1]) for (const e of [-1, 1]) add(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), gold, e * 0.72, 2.45, s * 0.6);
  add(new THREE.BoxGeometry(1.2, 0.3, 1.0), black, -0.05, 2.62, 0);                 // trunk on the roof
  add(new THREE.BoxGeometry(1.8, 0.12, 1.55), gold, 0, 0.98, 0);                    // gold base trim
  add(new THREE.BoxGeometry(1.8, 0.08, 1.52), gold, 0, 2.2, 0);                     // waist trim
  // door with window on the +z (camera) side: hinged at its front edge
  const hinge = new THREE.Group(); hinge.position.set(0.45, 1.6, 0.735); body.add(hinge);
  add(new THREE.BoxGeometry(0.9, 1.1, 0.05), blueD, -0.45, 0, 0, hinge);
  add(new THREE.BoxGeometry(0.55, 0.42, 0.03), glass, -0.45, 0.22, 0.02, hinge);
  add(new THREE.BoxGeometry(0.62, 0.05, 0.04), gold, -0.45, -0.02, 0.03, hinge);
  add(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 18).rotateX(Math.PI / 2), gold, -0.45, -0.28, 0.03, hinge);   // the imperial "N" medallion
  add(new THREE.SphereGeometry(0.04, 8, 6), gold, -0.82, -0.05, 0.05, hinge);    // handle
  // dark interior behind the door + a cream seat
  add(new THREE.BoxGeometry(0.86, 1.05, 0.02), toon("#1a1420"), 0, 1.6, 0.72);
  add(new THREE.BoxGeometry(0.8, 0.25, 0.5), cream, 0, 1.2, 0.35);
  // side windows on the far ends
  for (const e of [-1, 1]) add(new THREE.BoxGeometry(0.03, 0.4, 0.6), glass, e * 0.86, 1.85, 0);
  // coachman's box up front, step, lamps
  add(new THREE.BoxGeometry(0.6, 0.5, 1.3), blueD, 1.2, 1.35, 0);
  add(new THREE.BoxGeometry(0.5, 0.12, 1.3), red, 1.25, 1.65, 0);
  add(new THREE.BoxGeometry(0.4, 0.06, 0.5), black, 0.0, 0.75, 0.85);
  for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.08, 0.06, 0.2, 10), gold, 0.95, 2.05, s * 0.78); add(new THREE.SphereGeometry(0.06, 10, 8), toon("#fff3c4"), 0.95, 2.05, s * 0.86); }
  // chassis: perch pole, leaf springs, shafts going forward to the (off-screen) horses
  add(new THREE.BoxGeometry(3.6, 0.1, 0.12), wood, 0.2, 0.72, 0);
  for (const e of [-0.75, 0.9]) add(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12, 1, true, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI).scale(1, 0.3, 1), black, e, 0.95, 0);
  for (const s of [-1, 1]) { const sh = add(new THREE.BoxGeometry(2.6, 0.07, 0.07), wood, 2.9, 0.62, s * 0.5); sh.rotation.z = -0.06; }
  // wheels (red, gold hubs, spokes): rear bigger than front
  const wheels: THREE.Group[] = [];
  for (const [x, s, rr] of [[-0.75, -1, 0.72], [-0.75, 1, 0.72], [1.15, -1, 0.55], [1.15, 1, 0.55]] as [number, number, number][]) {
    const w = new THREE.Group(); w.position.set(x, rr, s * 0.86); (w as THREE.Group & { r?: number }).userData.r = rr;
    w.add(new THREE.Mesh(new THREE.TorusGeometry(rr - 0.05, 0.05, 8, 28), red));
    w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12).rotateX(Math.PI / 2), gold));
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, (rr - 0.08) * 2, 0.04), red); sp.rotation.z = (i / 6) * Math.PI; w.add(sp); }
    root.add(w); wheels.push(w);
  }
  addInk(root, 0.035);
  return { root, body, wheels, hinge };
}

export const CarriageLayer: React.FC<{ cam: Cam; car: CarriageState; sunDir?: [number, number, number] }> = ({ cam, car, sunDir = [-0.5, 1, -0.6] }) => {
  const { camera } = useThree();
  const C = useMemo(() => buildCarriage(), []);
  const lights = useMemo(() => {
    const g = new THREE.Group();
    const sun = new THREE.DirectionalLight("#fff4de", 2.3); g.add(sun, sun.target);
    g.add(new THREE.HemisphereLight("#d6ecff", "#7aa05a", 1.35));
    return { g, sun };
  }, []);
  const c = camera as THREE.PerspectiveCamera;
  c.fov = THREE.MathUtils.radToDeg(2 * Math.atan(H / 2 / (cam.k * cam.f)));
  c.aspect = W / H; c.near = 0.2; c.far = 3000;
  c.position.set(cam.x, cam.y, -cam.z); c.rotation.set(0, 0, 0); c.up.set(0, 1, 0);
  c.setViewOffset(W, H, 0, -cam.tilt, W, H);
  c.updateProjectionMatrix();
  lights.sun.position.set(car.x + sunDir[0] * 50, sunDir[1] * 50, -car.z - sunDir[2] * 50); lights.sun.target.position.set(car.x, 0, -car.z);
  C.root.visible = car.visible;
  C.root.position.set(car.x, 0, -car.z);
  C.root.rotation.set(0, car.yaw, 0);
  C.body.position.y = car.bounce; C.body.rotation.set(car.roll, 0, car.pitch);
  C.wheels.forEach((w) => (w.rotation.z = -car.wheel / (w.userData.r as number)));
  C.hinge.rotation.y = car.door * 1.7;
  return (<><primitive object={C.root} dispose={null} /><primitive object={lights.g} dispose={null} /></>);
};
