// KAIZEN CLIPS MOTION LIBRARY: reusable actions for the library rig (./rig.tsx).
// Every motion is a pure function of time (seconds) that returns a Pose, so it renders identically on every frame,
// in any order, on any number of render workers (no state, no randomness that changes between frames).
//
// Build a character's performance as a list of clips; `perform()` cross-fades between neighbouring clips
// (arm angles, head tilt, lean, crouch ...), so there are never snaps between actions:
//
//   const pose = perform(T, [
//     { at: 0,   motion: idle() },
//     { at: 1.2, motion: lookAround({ side: -1 }) },
//     { at: 2.6, motion: point({ height: 0.3 }), blend: 0.35 },
//     { at: 4.0, motion: startle(4.0) },
//   ], { blink: true, seed: 3 });
//
// Movement over the ground (walk / run) comes from `travel()`: distance and walk weight with eased starts and stops,
// so the planted feet never slide. Use its `dist` for the rig and its `s` to place the character in the set.
import type { Pose, Expr } from "./rig";
import { strideFor } from "./rig";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const sm = (v: number) => { const c = clamp01(v); return c * c * (3 - 2 * c); };
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
/** a bump 0 -> 1 -> 0 between t0 and t1 with eased edges of length e */
export const bump = (T: number, t0: number, t1: number, e = 0.3) => sm((T - t0) / e) * (1 - sm((T - (t1 - e)) / e));

export type Motion = (T: number) => Pose;

// ---------------------------------------------------------------- moving over the ground
/** distance covered at time T for a move from t0 to t1 at speed V (m/s), easing in and out over `ease` seconds.
 *  Returns s (metres), w (walk weight 0..1) and the speed. A run is the same with a higher V and run: 1 on the pose. */
export const travel = (T: number, t0: number, t1: number, V: number, ease = 0.6) => {
  const v = (t: number) => V * sm((t - t0) / ease) * sm((t1 - t) / ease);
  let s = 0; const dt = 1 / 240;
  for (let t = t0; t < Math.min(T, t1); t += dt) s += v(t) * dt;
  return { s, w: v(T) / V, v: v(T) };
};
/** typical speeds (m/s in rig metres): stroll, walk, hurry, jog, run, sprint */
export const SPEED = { stroll: 0.7, walk: 1.0, hurry: 1.4, jog: 2.2, run: 3.2, sprint: 4.2 };

/** walk (or run) clip: from t0 to t1 at speed V; run 0..1 */
export const walk = (t0: number, t1: number, V = SPEED.walk, extra: Pose = {}): Motion => (T) => {
  const m = travel(T, t0, t1, V, V > 2 ? 0.35 : 0.6);
  return { dist: m.s, walk: m.w, t: T, lookX: 0.4, ...extra };
};
export const run = (t0: number, t1: number, V = SPEED.run, extra: Pose = {}): Motion => (T) => {
  const m = travel(T, t0, t1, V, 0.35);
  return { dist: m.s, walk: m.w, run: 1, t: T, lookX: 0.5, expr: "determined", ...extra };
};

// ---------------------------------------------------------------- standing actions
/** standing idle: breathing and a slow weight shift come from the rig; adds slow small glances */
export const idle = (extra: Pose = {}): Motion => (T) => ({ t: T, lookX: 0.35 + 0.15 * Math.sin(T * 0.45), ...extra });

/** look over a shoulder (side -1 = back, +1 = ahead/up), head turns first, eyes lead */
export const lookAround = (o: { side?: number; up?: number; expr?: Expr } = {}): Motion => (T) => ({
  t: T, lookX: o.side === undefined ? 0.35 : o.side < 0 ? -0.85 : 0.85, lookY: o.up ? -o.up : 0,
  tilt: (o.side ?? 0) < 0 ? -6 : 4, expr: o.expr ?? "worried",
});

/** look up at something high (a tower, the sky, a creature on a roof) */
export const lookUp = (amount = 1, expr: Expr = "surprised"): Motion => (T) => ({ t: T, lookX: 0.5, lookY: -amount, tilt: -9 * amount, expr });

/** talking: mouth driven by `talk`, small beat gestures with the near hand. `level` 0 calm .. 1 animated */
export const talk = (level = 0.5, expr: Expr = "neutral"): Motion => (T) => {
  const beat = Math.max(0, Math.sin(T * 2.3)) * level;
  return { t: T, talk: T, expr, lookX: 0.45, armNear: [10 + 30 * beat, 30 + 40 * beat], handNear: "open", tilt: 2 * Math.sin(T * 1.7) * level };
};

/** point at something: arm rises and holds; height -1 (down) .. 1 (up high) */
export const point = (o: { height?: number; far?: boolean; expr?: Expr } = {}): Motion => (T) => {
  const h = o.height ?? 0.2, arm: [number, number] = [80 + 45 * h, 6];
  return o.far ? { t: T, armFar: arm, handFar: "point", lookX: 0.6, expr: o.expr ?? "surprised", lean: 3 }
    : { t: T, armNear: arm, handNear: "point", lookX: 0.6, lookY: -0.4 * h, expr: o.expr ?? "surprised", lean: 3 };
};

/** wave hello / call someone over */
export const wave = (expr: Expr = "smile"): Motion => (T) => ({ t: T, armFar: [165 + 8 * Math.sin(T * 9), 25 + 25 * Math.sin(T * 9)], handFar: "open", expr, lookX: 0.5, tilt: -3 });

/** startle: a jump-back reaction starting at t0 (flinch, arms up, eyes wide), then frozen fear */
export const startle = (t0: number, expr: Expr = "scared"): Motion => (T) => {
  const k = sm((T - t0) / 0.12), j = Math.exp(-Math.max(0, T - t0) / 0.25) * k;
  return { t: T, expr: T < t0 ? "neutral" : expr, lean: -10 * k - 4 * j, crouch: 0.15 * k, armNear: [45 * k + 30 * j, 70 * k], armFar: [40 * k + 25 * j, 75 * k],
    handNear: "open", handFar: "open", lookX: 0.6, tilt: -5 * k };
};

/** recoil: backs off with a hand raised to shield the face */
export const recoil = (expr: Expr = "scared"): Motion => (T) => ({ t: T, expr, lean: -14, armNear: [110, 95], handNear: "open", armFar: [30, 40], lookX: 0.7, crouch: 0.1 });

/** shrug */
export const shrug = (): Motion => (T) => { const k = bump(T % 2.4, 0.2, 1.4, 0.25); return { t: T, armNear: [20, 90 * k + 10], armFar: [15, 85 * k + 10], tilt: 6 * k, expr: "smug", handNear: "open" }; };

/** laugh: shoulders bounce, head back */
export const laugh = (): Motion => (T) => ({ t: T, expr: "laugh", tilt: -6 - 3 * Math.abs(Math.sin(T * 9)), lean: -4, armNear: [25, 80], handNear: "open", crouch: 0.03 * Math.abs(Math.sin(T * 9)) });

/** think: hand to chin */
export const think = (): Motion => (T) => ({ t: T, armNear: [35, 135], handNear: "fist", expr: "neutral", lookX: 0.2, lookY: -0.5, tilt: 4 });

/** cheer: both arms up */
export const cheer = (): Motion => (T) => ({ t: T, armNear: [105 + 10 * Math.sin(T * 7), 70], armFar: [172 + 6 * Math.sin(T * 7 + 1), 8], handNear: "fist", handFar: "fist", expr: "laugh" });

/** sit down on a seat (starts at t0, takes 0.8 s), then sit */
export const sit = (t0: number, seat = 0.45, expr: Expr = "neutral"): Motion => (T) => ({ t: T, sit: sm((T - t0) / 0.8), seat, expr, armNear: [25, 45], armFar: [20, 45] });

/** crouch / hide low */
export const crouch = (amount = 0.8, expr: Expr = "scared"): Motion => (T) => ({ t: T, crouch: amount, expr, armNear: [55, 60], armFar: [50, 60], lookX: 0.7 });

/** fall: stumble at t0 and topple (dir +1 forward, -1 back), arms fly out, then lie still */
export const fall = (t0: number, dir = -1, expr: Expr = "pain"): Motion => (T) => {
  const k = sm((T - t0) / 0.7), fl = bump(T, t0, t0 + 0.9, 0.2);
  return { t: T, fall: k, fallDir: dir, expr: T < t0 ? "scared" : expr, armNear: [60 + 90 * fl, 30], armFar: [40 + 100 * fl, 20], handNear: "open", handFar: "open" };
};

/** punch: wind-up then a fast jab at t0 (fist), recovers */
export const punch = (t0: number): Motion => (T) => {
  const wind = bump(T, t0 - 0.35, t0 + 0.02, 0.12), hit = bump(T, t0, t0 + 0.3, 0.06);
  return { t: T, expr: "angry", lean: 6 * hit - 4 * wind, armNear: [20 + 70 * hit - 10 * wind, 110 * wind + 110 * (1 - hit) * (T > t0 ? 1 : 0) * 0.3 + 10], handNear: "fist", armFar: [30, 110], handFar: "fist", lookX: 0.8 };
};

/** swing a held weapon/tool (sword, axe, shovel) down at t0 */
export const swing = (t0: number): Motion => (T) => {
  const up = bump(T, t0 - 0.5, t0 + 0.02, 0.2), down = sm((T - t0) / 0.15);
  return { t: T, expr: "angry", armNear: [mix(160, 40, down) * (T < t0 - 0.5 ? 0.2 : 1) + 20 * up, 20], lean: mix(-6, 10, down) };
};

/** carry something heavy in both arms (a crate, a sack): arms forward, leaning back a little */
export const carry = (): Motion => (T) => ({ t: T, armNear: [45, 55], armFar: [50, 50], lean: -3, expr: "determined" });

/** aim a rifle / pistol forward */
export const aim = (): Motion => (T) => ({ t: T, hold: "rifle", aiming: true, armNear: [62, 30], armFar: [80, 8], handNear: "fist", lookX: 0.9, expr: "determined", lean: 2 });

/** reach out toward something (to grab, to open a door) */
export const reach = (height = 0): Motion => (T) => ({ t: T, armNear: [70 + 40 * height, 10], handNear: "open", lean: 6, lookX: 0.7, expr: "neutral" });

// ---------------------------------------------------------------- performing a list of clips
export type Clip = { at: number; motion: Motion; blend?: number };
type Num = keyof Pose;
const NUMERIC: Num[] = ["lookX", "lookY", "tilt", "lean", "crouch", "sit", "fall", "seat"];

const lerpArm = (a: [number, number] | undefined, b: [number, number] | undefined, k: number, restA: [number, number]) => {
  if (!a && !b) return undefined;
  const A = a ?? restA, Bb = b ?? restA;
  return [mix(A[0], Bb[0], k), mix(A[1], Bb[1], k)] as [number, number];
};

/** the pose at time T for a list of clips (sorted by `at`), cross-fading over each clip's `blend` seconds (0.3 default).
 *  Options: blink (automatic natural blinks, 2.5-5 s apart, seeded), seed. */
export const perform = (T: number, clips: Clip[], o: { blink?: boolean; seed?: number } = {}): Pose => {
  let i = 0;
  for (let k = 0; k < clips.length; k++) if (T >= clips[k].at) i = k;
  const cur = clips[i].motion(T);
  let pose: Pose = cur;
  const bl = clips[i].blend ?? 0.3;
  if (i > 0 && T < clips[i].at + bl) {
    const prev = clips[i - 1].motion(T), k = sm((T - clips[i].at) / bl);
    pose = { ...prev, ...cur };
    for (const n of NUMERIC) {
      const a = prev[n] as number | undefined, b = cur[n] as number | undefined;
      if (a !== undefined || b !== undefined) (pose as Record<string, unknown>)[n] = mix(a ?? 0, b ?? 0, k);
    }
    pose.armNear = lerpArm(prev.armNear, cur.armNear, k, [3, 9]);
    pose.armFar = lerpArm(prev.armFar, cur.armFar, k, [2, 9]);
    if (k < 0.5) { pose.expr = prev.expr ?? pose.expr; pose.handNear = prev.handNear; pose.handFar = prev.handFar; }
    // keep feet continuous: distance and walk weight come from whichever clip is moving
    if (prev.dist !== undefined && cur.dist === undefined) { pose.dist = prev.dist; pose.walk = mix(prev.walk ?? 0, 0, k); }
  }
  if (o.blink && !pose.blink) pose.blink = blinkAt(T, o.seed ?? 1);
  return pose;
};

/** natural blinks: ~0.12 s long, 2.5-5 s apart, deterministic per seed */
export const blinkAt = (T: number, seed = 1) => {
  let t = 0.8 + (seed % 7) * 0.31, n = 0;
  while (t < T + 0.2 && n < 400) {
    if (T >= t && T < t + 0.12) return true;
    const r = Math.sin((n + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    t += 2.5 + 2.5 * (r - Math.floor(r)); n++;
  }
  return false;
};

/** metres covered per second for a given speed and run blend (sanity helper for placing characters) */
export const strideRate = (V: number, runBlend = 0) => V / strideFor(runBlend);
