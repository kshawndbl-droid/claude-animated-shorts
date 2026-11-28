// KAIZEN CLIPS ACTORS: put a library-rig character into a Blender set at a world position, standing on the ground,
// at the right size for its depth, with a contact shadow and the set's light on it.
//
//   <Actor cam={cam} at={[x, y, z]} look={WARDROBE.colonist1700s} pose={perform(T, clips)} light="golden" />
//
// Walking along a path:  const { p, dir } = alongPath(PATH, mv.s);  <Actor at={[p[0], p[1], z]} dir={dir} ... />
// `dir` (a world direction) makes the character face the way it moves on screen.
import React from "react";
import { Figure, Look, Pose } from "../characters/rig";
import { CamJ, V2, V3, facesLeft, project } from "./camera";
import { ContactShadow } from "./fx";

/** how the set's light falls on the 2D cast (CSS filter on the figure): matches the Blender lighting presets */
export const CAST_LIGHT: Record<string, string> = {
  night_moon: "brightness(0.62) saturate(0.7) hue-rotate(-8deg)",
  dawn: "brightness(0.82) saturate(0.75)",
  morning: "brightness(0.98) saturate(0.98)",
  noon: "brightness(1.04) saturate(1.0) contrast(1.04)",
  golden: "brightness(0.96) sepia(0.2) saturate(1.1)",
  dusk: "brightness(0.78) sepia(0.18) saturate(0.95)",
  overcast: "brightness(0.9) saturate(0.82)",
  storm: "brightness(0.72) saturate(0.7) contrast(1.05)",
  candle: "brightness(0.8) sepia(0.28) saturate(1.05)",
  interior_day: "brightness(0.94) sepia(0.08)",
  none: "none",
};

export const Actor: React.FC<{
  cam: CamJ; at: V3; look: Look; pose: Pose;
  dir?: V2;               // world walking direction: faces the character that way on screen
  flip?: boolean;         // or face explicitly (true = facing screen left)
  light?: string;         // key of CAST_LIGHT, or a raw CSS filter string
  k?: number;             // practical-light flicker 0..1: warms the figure with fire/candle light
  shadow?: number;        // contact shadow opacity (0 = none)
  frame?: number;
}> = ({ cam, at, look, pose, dir, flip, light = "none", k, shadow = 0.5, frame = 1 }) => {
  const P = project(cam, at, frame);
  if (P.behind) return null;
  const f = flip ?? (dir ? facesLeft(cam, at, dir) : false);
  let filter = CAST_LIGHT[light] ?? light;
  if (k !== undefined) filter = `${filter === "none" ? "" : filter} brightness(${0.9 + 0.14 * k}) sepia(${0.12 + 0.08 * k})`;
  return <>
    {shadow > 0 && <ContactShadow x={P.x} y={P.y} ppm={P.ppm} op={shadow} />}
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <g style={{ filter: filter === "none" ? undefined : filter }}>
        <Figure x={P.x} y={P.y} ppm={P.ppm} look={look} pose={pose} flip={f} />
      </g>
    </svg>
  </>;
};

/** a background crowd (market, battlefield, audience): N simple figures scattered in a ground rectangle, idling,
 *  sorted far to near. looks are cycled; everything is seeded so it is identical every frame. */
export const Crowd: React.FC<{
  cam: CamJ; T: number; looks: Look[]; area: [number, number, number, number]; n?: number; seed?: number;
  z?: (x: number, y: number) => number; light?: string; react?: { at: number; expr: Pose["expr"]; arms?: boolean };
  face?: V2;
}> = ({ cam, T, looks, area, n = 12, seed = 1, z = () => 0, light = "none", react, face }) => {
  const h = (i: number, k: number) => { const v = Math.sin((i + seed * 13.1) * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  const people = Array.from({ length: n }).map((_, i) => {
    const x = area[0] + (area[1] - area[0]) * h(i, 1), y = area[2] + (area[3] - area[2]) * h(i, 2);
    return { i, at: [x, y, z(x, y)] as V3, d: project(cam, [x, y, z(x, y)]).depth };
  }).sort((a, b) => b.d - a.d);
  return <>{people.map(({ i, at }) => {
    const on = react && T >= react.at + 0.15 * h(i, 5);
    const pose: Pose = {
      t: T + 7 * h(i, 3), lookX: 0.2 + 0.6 * h(i, 4) + 0.1 * Math.sin(T * 0.4 + i), blink: ((T + h(i, 6) * 4) % 3.7) < 0.1,
      expr: on ? react!.expr : (["neutral", "smile", "worried"] as const)[i % 3],
      ...(on && react!.arms ? { armNear: [100 + 20 * Math.sin(T * 6 + i), 60], handNear: "fist" as const } : {}),
    };
    return <Actor key={i} cam={cam} at={at} look={looks[i % looks.length]} pose={pose} light={light} shadow={0.35}
      flip={face ? undefined : h(i, 7) > 0.5} dir={face} />;
  })}</>;
};
