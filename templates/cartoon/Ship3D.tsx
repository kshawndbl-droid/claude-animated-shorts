// The 3D prop of the Pig War short: a British steam frigate (black hull, white gun-port band, three masts with furled
// sails, a funnel, the red ensign), toon-shaded with ink outlines, drawn in a transparent three.js layer locked to the
// 2D stage camera like Truck3D. Several ships can be drawn at once. The hull is cut at the waterline (painted 2D sea).
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Cam, W, H } from "./stage";
import { toon, addInk } from "./Truck3D";

export type ShipState = { x: number; z: number; yaw: number; roll: number; pitch: number; heave: number; smoke?: number; fire?: number };

export function buildShip(seed = 0) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const black = toon("#24222a"), white = toon("#efe8d6"), wood = toon("#a8743f"), sail = toon("#efe4c6"), red = toon("#c03030"), gold = toon("#e2b847"), port = toon("#3a1a14");
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, p: THREE.Object3D = body) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p.add(o); return o; };
  // hull: an extruded side profile (length along +x), cut at the waterline
  const sh = new THREE.Shape(); sh.moveTo(-6, 0); sh.lineTo(5.2, 0); sh.quadraticCurveTo(6.6, 0.6, 7.0, 2.0); sh.lineTo(-6.2, 2.0); sh.lineTo(-6.4, 1.0); sh.closePath();
  const hullG = new THREE.ExtrudeGeometry(sh, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.3, bevelSegments: 3, curveSegments: 10 });
  hullG.translate(0, 0, -1.3);
  add(hullG, black, 0, 0, 0);
  add(new THREE.BoxGeometry(12.4, 0.4, 3.3), white, 0.3, 1.25, 0);          // gun-port band
  for (let i = 0; i < 11; i++) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.4, 0.3, 0.06), port, -4.8 + i * 1.0, 1.25, s * 1.66);
  add(new THREE.BoxGeometry(12.2, 0.12, 3.0), wood, 0.3, 2.3, 0);           // deck
  // masts, yards, furled sails
  for (const [mx, h] of [[3.6, 9.5], [0.2, 11], [-3.6, 8.5]] as [number, number][]) {
    add(new THREE.CylinderGeometry(0.11, 0.16, h, 8), wood, mx, 2.3 + h / 2, 0);
    for (const [yy, w] of [[0.45, 1.0], [0.7, 0.8], [0.9, 0.55]] as [number, number][]) {
      const yd = add(new THREE.CylinderGeometry(0.06, 0.06, 4.0 * w, 6), wood, mx, 2.3 + h * yy, 0); yd.rotation.x = Math.PI / 2;
      const sl = add(new THREE.CylinderGeometry(0.22, 0.22, 3.8 * w, 8), sail, mx + 0.05, 2.3 + h * yy - 0.18, 0); sl.rotation.x = Math.PI / 2;
    }
  }
  const bs = add(new THREE.CylinderGeometry(0.07, 0.12, 4.2, 6), wood, 8.2, 3.2, 0); bs.rotation.z = -1.15;   // bowsprit
  add(new THREE.CylinderGeometry(0.45, 0.5, 2.6, 14), black, -1.6, 3.6, 0);    // funnel
  add(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 14), red, -1.6, 4.85, 0);
  add(new THREE.BoxGeometry(1.6, 0.5, 2.6), white, -5.0, 2.6, 0);              // stern cabin
  add(new THREE.BoxGeometry(1.7, 0.12, 2.7), gold, -5.0, 2.9, 0);
  // the red ensign at the stern
  const pole = add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), wood, -6.2, 3.4, 0);
  const flag = new THREE.Group(); flag.position.set(-6.25, 4.2, 0); body.add(flag);
  add(new THREE.BoxGeometry(1.6, 0.9, 0.03), red, -0.8, 0, 0, flag);
  add(new THREE.BoxGeometry(0.8, 0.45, 0.04), toon("#2a3f8a"), -0.4, 0.22, 0.005, flag);
  add(new THREE.BoxGeometry(0.8, 0.08, 0.05), white, -0.4, 0.22, 0.01, flag);
  add(new THREE.BoxGeometry(0.1, 0.45, 0.05), white, -0.4, 0.22, 0.01, flag);
  void pole; void seed;
  addInk(root, 0.05);
  return { root, body, flag };
}

const ShipOne: React.FC<{ s: ShipState; seed: number; t: number }> = ({ s, seed, t }) => {
  const S = useMemo(() => buildShip(seed), [seed]);
  S.root.position.set(s.x, 0, -s.z);
  S.root.rotation.set(0, s.yaw, 0);
  S.body.position.y = s.heave; S.body.rotation.set(s.roll, 0, s.pitch);
  S.flag.rotation.y = Math.sin(t * 3 + seed) * 0.25;
  return <primitive object={S.root} dispose={null} />;
};

export const ShipLayer: React.FC<{ cam: Cam; ships: ShipState[]; t: number }> = ({ cam, ships, t }) => {
  const { camera } = useThree();
  const lights = useMemo(() => {
    const g = new THREE.Group();
    const sun = new THREE.DirectionalLight("#fff4de", 2.2); sun.position.set(-30, 50, 30); g.add(sun, sun.target);
    g.add(new THREE.HemisphereLight("#d6e8ff", "#5a7a8a", 1.4));
    return g;
  }, []);
  const c = camera as THREE.PerspectiveCamera;
  c.fov = THREE.MathUtils.radToDeg(2 * Math.atan(H / 2 / (cam.k * cam.f)));
  c.aspect = W / H; c.near = 0.2; c.far = 5000;
  c.position.set(cam.x, cam.y, -cam.z); c.rotation.set(0, 0, 0); c.up.set(0, 1, 0);
  c.setViewOffset(W, H, 0, -cam.tilt, W, H);
  c.updateProjectionMatrix();
  return (<>{ships.map((s, i) => <ShipOne key={i} s={s} seed={i} t={t} />)}<primitive object={lights} dispose={null} /></>);
};
