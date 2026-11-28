// KAIZEN CLIPS SCENE CAMERA: project 3D set points (metres, from Blender) to the 1080x1920 frame through the same
// cam.json every set writes (tools/kz-set.py), plus the 2.5D camera moves we do on still plates.
//
//   const P = project(cam, [x, y, z]);   // P.x, P.y in px, P.ppm = pixels per metre at that depth (rig scale)
//   const mv = push(u, { from: 1, to: 1.08, focus: [P.x, P.y - 200] });  // zoom + transform origin
//
// Shot lists: `shotAt(T, SHOTS)` finds the active shot and its local progress u (0..1), so a whole scene is a table.
import type React from "react";

export type CamFrame = { m: number[][]; lens: number; sensor: number };
export type CamJ = { frames: Record<string, CamFrame>; [k: string]: unknown };
export type V3 = [number, number, number];
export type V2 = [number, number];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export const W = 1080, H = 1920;

/** world point -> screen (px) and pixels-per-metre at that depth. `frame` picks an animated camera frame if present. */
export const project = (cam: CamJ, p: V3, frame = 1) => {
  const c = cam.frames[String(frame)] ?? cam.frames["1"], m = c.m;
  const d = [p[0] - m[0][3], p[1] - m[1][3], p[2] - m[2][3]];
  const X = m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2];
  const Y = m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2];
  const Z = m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2];
  const fpx = (c.lens / c.sensor) * H, z = Math.max(0.05, -Z);
  return { x: W / 2 + (fpx * X) / z, y: H / 2 - (fpx * Y) / z, ppm: fpx / z, depth: z, behind: Z > 0 };
};

/** a point at distance s along a ground path (list of [x, y] points) and the walking direction there */
export const alongPath = (path: V2[], s: number) => {
  let left = Math.max(0, s);
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1], L = Math.hypot(bx - ax, by - ay);
    if (left <= L || i === path.length - 2) {
      const k = L > 0 ? Math.min(1, left / L) : 0;
      return { p: [ax + (bx - ax) * k, ay + (by - ay) * k] as V2, dir: [(bx - ax) / (L || 1), (by - ay) / (L || 1)] as V2 };
    }
    left -= L;
  }
  return { p: path[0], dir: [0, 1] as V2 };
};

/** does a world direction move left on screen? (decides the rig's flip so characters face where they walk) */
export const facesLeft = (cam: CamJ, at: V3, dir: V2) => {
  const a = project(cam, at), b = project(cam, [at[0] + dir[0] * 0.3, at[1] + dir[1] * 0.3, at[2]]);
  return b.x < a.x;
};

// ---------------------------------------------------------------- 2.5D moves on a still plate
export type Move = { zoom: number; ox: number; oy: number; dx: number; dy: number; rot: number };
/** slow push in (or pull out with to < from) toward a focus point; plates are rendered a little oversized for this */
export const push = (u: number, o: { from?: number; to?: number; focus?: V2; ease?: boolean } = {}): Move => {
  const k = o.ease === false ? clamp01(u) : sm(u);
  const f = o.focus ?? [W / 2, H / 2];
  return { zoom: mix(o.from ?? 1, o.to ?? 1.07, k), ox: f[0], oy: f[1], dx: 0, dy: 0, rot: 0 };
};
/** lateral drift (a truck / pan feeling): px over the shot; combine with a small zoom so edges never show */
export const drift = (u: number, o: { dx?: number; dy?: number; zoom?: number; focus?: V2 } = {}): Move => {
  const k = sm(u), f = o.focus ?? [W / 2, H / 2];
  return { zoom: o.zoom ?? 1.06, ox: f[0], oy: f[1], dx: (o.dx ?? 40) * (k - 0.5), dy: (o.dy ?? 0) * (k - 0.5), rot: 0 };
};
/** handheld: tiny organic shake (amp px), for tension, chases and documentary feel. Deterministic per T. */
export const shake = (T: number, amp = 4, speed = 1): Pick<Move, "dx" | "dy" | "rot"> => ({
  dx: amp * (Math.sin(T * 2.1 * speed) * 0.6 + Math.sin(T * 5.3 * speed + 1.2) * 0.4),
  dy: amp * (Math.sin(T * 1.7 * speed + 0.4) * 0.6 + Math.sin(T * 4.6 * speed + 2.1) * 0.4),
  rot: amp * 0.04 * Math.sin(T * 1.3 * speed + 0.7),
});
/** a camera impact (hit, explosion, jumpscare): decaying shake starting at t0 */
export const impact = (T: number, t0: number, amp = 26, len = 0.5) => {
  const k = T < t0 ? 0 : Math.exp(-((T - t0) / len) * 4);
  return { dx: amp * k * Math.sin((T - t0) * 61), dy: amp * k * 0.7 * Math.cos((T - t0) * 53), rot: amp * k * 0.03 * Math.sin((T - t0) * 37) };
};
export const moveStyle = (m: Move, extra: Partial<Pick<Move, "dx" | "dy" | "rot">> = {}): React.CSSProperties => ({
  transform: `translate(${m.dx + (extra.dx ?? 0)}px, ${m.dy + (extra.dy ?? 0)}px) rotate(${m.rot + (extra.rot ?? 0)}deg) scale(${m.zoom})`,
  transformOrigin: `${m.ox}px ${m.oy}px`,
});

// ---------------------------------------------------------------- shot tables
export type Shot = { id: string; t0: number; t1: number; [k: string]: unknown };
/** the active shot at time T (seconds) and its local progress u 0..1 and local time tt */
export const shotAt = <S extends Shot>(T: number, shots: S[]) => {
  const s = shots.find((x) => T >= x.t0 - 1e-6 && T < x.t1 - 1e-6) ?? shots[shots.length - 1];
  return { shot: s, u: clamp01((T - s.t0) / (s.t1 - s.t0)), tt: T - s.t0 };
};
