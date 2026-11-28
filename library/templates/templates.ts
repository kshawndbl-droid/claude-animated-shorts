// KAIZEN CLIPS SCENE TEMPLATES: the defaults each kind of shot gets (camera move, effects, sound, grade), so a shot
// in scene.json only says what is special about it. Every default can be overridden in the shot.
//
//   establishing  the place: slow push or drift, life in the background (birds, smoke, crowd), ambience
//   intro         the hook: a fast push that settles, an impact, optional title
//   walkTalk      characters walk along a path while talking; the camera drifts with them
//   conversation  two characters face each other; slow push toward whoever speaks (use two shots for shot/reverse)
//   chase         running along a path, handheld camera, whoosh and footsteps
//   discovery     a character finds something: push in toward it, a soft sting
//   action        fights, falls, impacts: handheld + camera hits + flashes on each blow
//   recreation    historical moments: a crowd, slow drift, period grade and a date/place title
//   reveal        the big reveal: start tight, pull out to show it, sting
//   reaction      close-up face: slow push, expression change, stronger vignette
import { SPEED, perform, travel, idle, lookAround, lookUp, talk, point, wave, startle, recoil, shrug, laugh, think, cheer,
  sit, crouch, fall, punch, swing, carry, aim, reach, Clip, Motion } from "../characters/motion";
import type { Pose } from "../characters/rig";
import { alongPath, V2, V3 } from "../scene/camera";
import type { GradeName } from "../scene/fx";
import type { ActorSpec, MoveSpec, ShotSpec, FxSpec, SceneSpec } from "./spec";

type A = Record<string, any>;  // eslint-disable-line @typescript-eslint/no-explicit-any
/** motion names usable in scene.json "do" lists. `at` is the action's start time (for one-shot actions). */
export const MOTIONS: Record<string, (a: A, at: number) => Motion> = {
  idle: (a) => idle(a), lookAround: (a) => lookAround(a), lookUp: (a) => lookUp(a.amount ?? 1, a.expr),
  talk: (a) => talk(a.level ?? 0.5, a.expr), point: (a) => point(a), wave: (a) => wave(a.expr), startle: (a, at) => startle(at, a.expr),
  recoil: (a) => recoil(a.expr), shrug: () => shrug(), laugh: () => laugh(), think: () => think(), cheer: () => cheer(),
  sit: (a, at) => sit(at, a.seat ?? 0.45, a.expr), crouch: (a) => crouch(a.amount ?? 0.8, a.expr), fall: (a, at) => fall(at, a.dir ?? -1, a.expr),
  punch: (_a, at) => punch(at), swing: (_a, at) => swing(at), carry: () => carry(), aim: () => aim(), reach: (a) => reach(a.height ?? 0),
  /** hold a fixed pose (any rig fields) */
  pose: (a) => (T) => ({ t: T, ...a }),
};
const ONE_SHOT = new Set(["punch", "swing", "startle", "fall"]);

export const speedOf = (s: number | string | undefined, run?: boolean) =>
  typeof s === "number" ? s : (SPEED as Record<string, number>)[s ?? (run ? "run" : "walk")] ?? SPEED.walk;

/** where an actor is and what it does at scene time T (position, facing direction, pose) */
export const actorState = (a: ActorSpec, T: number, defaults: { blinkSeed: number }) => {
  let pos: V3 = a.at ? [a.at[0], a.at[1], (a.at as number[])[2] ?? 0] : [0, 0, 0];
  let dir: V2 | undefined = Array.isArray(a.face) ? a.face as V2 : undefined;
  let dist = 0, walkW = 0, run = 0;
  if (a.path && a.path.length > 1) {
    let L = 0;
    for (let i = 1; i < a.path.length; i++) L += Math.hypot(a.path[i][0] - a.path[i - 1][0], a.path[i][1] - a.path[i - 1][1]);
    for (const g of a.go ?? []) {
      const ease = g.run ? 0.35 : 0.6;
      // speed "fit": exactly cover the whole path in the move's time (so authors only give times, not speeds)
      const V = g.speed === "fit" ? L / Math.max(0.2, g.t1 - g.t0 - ease) / (a.go!.length) : speedOf(g.speed, g.run);
      const m = travel(T, g.t0, g.t1, V, ease);
      dist += m.s;
      if (T >= g.t0 && T < g.t1) { walkW = m.w; run = g.run ? 1 : 0; }
    }
    const p = alongPath(a.path, dist);
    pos = [p.p[0], p.p[1], pos[2]];
    if (walkW > 0.01 || !dir) dir = p.dir;
  }
  const clips: Clip[] = (a.do ?? [[0, "idle"]]).map(([at, name, args]) => ({
    at, motion: (MOTIONS[name] ?? MOTIONS.idle)(args ?? {}, at), blend: ONE_SHOT.has(name) ? 0.15 : (args?.blend as number) ?? 0.3,
  }));
  if (clips[0].at > -1e3) clips.unshift({ at: -1e4, motion: idle() });
  const pose: Pose = { ...perform(T, clips, { blink: true, seed: defaults.blinkSeed }), ...(a.pose ?? {}) };
  if (a.hold) pose.hold = a.hold;
  if (walkW > 0 || dist > 0) { pose.dist = dist; pose.walk = walkW; if (run) pose.run = run; }
  return { pos, dir, pose };
};

// ---------------------------------------------------------------- template defaults
type Defaults = { move: MoveSpec; fx: FxSpec[]; grade?: GradeName; transition?: ShotSpec["transition"]; hits?: [string, number][]; vig?: number };
const night = (s: ShotSpec) => ["night_moon", "candle", "storm", "dusk"].includes(String(s.set.light));

export const TEMPLATES: Record<string, (s: ShotSpec, scene: SceneSpec) => Defaults> = {
  establishing: (s) => ({ move: { kind: "push", from: 1.0, to: 1.07 }, fx: night(s) ? [["fog", { op: 0.22 }]] : [["birds"]] }),
  intro: (s, sc) => ({ move: { kind: "crash", from: 1.0, to: 1.16 }, fx: [], hits: [[sc.genre === "comedy" ? "whoosh" : sc.genre === "horror" ? "riser" : "boom", s.t0]] }),
  walkTalk: () => ({ move: { kind: "track", dx: 70, to: 1.06 }, fx: [] }),
  conversation: () => ({ move: { kind: "push", from: 1.0, to: 1.04 }, fx: [] }),
  chase: (s) => ({ move: { kind: "handheld", shake: 7, to: 1.08, dx: 90 }, fx: [], hits: [["whoosh", s.t0]] }),
  discovery: (s) => ({ move: { kind: "push", from: 1.0, to: 1.16 }, fx: [], hits: [["sting", s.t0 + (s.t1 - s.t0) * 0.55]] }),
  action: () => ({ move: { kind: "handheld", shake: 5, to: 1.06 }, fx: [] }),
  recreation: () => ({ move: { kind: "drift", dx: 50, to: 1.06 }, fx: [["dust", {}]], grade: "history" }),
  reveal: (s) => ({ move: { kind: "reveal", from: 1.4, to: 1.0 }, fx: [], hits: [["sting", s.t0 + 0.25]] }),
  reaction: () => ({ move: { kind: "push", from: 1.0, to: 1.08 }, fx: [], vig: 0.72 }),
};

/** the shot with its template defaults filled in */
export const resolveShot = (s: ShotSpec, scene: SceneSpec) => {
  const d = (TEMPLATES[s.template] ?? TEMPLATES.establishing)(s, scene);
  // action shots: a camera hit on every blow, automatically
  const blows = s.template === "action" ? (s.actors ?? []).flatMap((a) => (a.do ?? []).filter(([, n]) => n === "punch" || n === "swing").map(([t]) => t + 0.18)) : [];
  const move: MoveSpec = { ...d.move, ...(s.move ?? {}) };
  if (blows.length) move.impacts = [...(move.impacts ?? []), ...blows];
  return { ...s, move, fx: s.fx ?? d.fx, grade: s.grade ?? d.grade ?? scene.grade, vig: d.vig, hits: [...(d.hits ?? []), ...(s.sound?.hits ?? []).map(([k, t]) => [k, t] as [string, number])], blows };
};
export type ResolvedShot = ReturnType<typeof resolveShot>;
