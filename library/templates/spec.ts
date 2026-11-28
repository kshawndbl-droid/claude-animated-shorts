// KAIZEN CLIPS SCENE SPEC: a whole Short as data (scene.json). The same file drives the Blender plates
// (tools/kz-plates.py), the picture (<SceneFromJson>) and the sound plan, so a change in one place updates all three.
//
// scene.json
// {
//   "slug": "the-pig-war", "genre": "comedy", "grade": "comedy",
//   "words": "the-pig-war/words.json", "audio": "the-pig-war/mix.wav",
//   "cast": { "cutlar": { "look": "frontiersman", "over": { "hair": "#5a3a22" } }, ... },
//   "shots": [
//     { "id": "s1", "t0": 0, "t1": 3.2, "template": "establishing",
//       "set": { "set": "village", "period": "1800s", "light": "golden", "cam": "wide", "aim": 2.3 },
//       "actors": [ { "who": "cutlar", "at": [3, 0], "do": [[0, "idle"], [1.4, "lookAround", {"side": -1}]] } ],
//       "fx": [ ["birds"], ["fog", {"op": 0.15}] ], "move": { "kind": "push", "to": 1.08 } }
//   ]
// }
// Every field except id/t0/t1/template/set has a sensible default from the template (library/templates/templates.ts).
import type { Look, Pose } from "../characters/rig";
import type { V2, V3 } from "../scene/camera";
import type { GradeName } from "../scene/fx";

/** one action: [start time (s, scene time), motion name, args object] (see MOTIONS in templates.ts) */
export type Do = [number, string, Record<string, unknown>?];
/** one move over the ground: from t0 to t1 at speed (m/s, a SPEED name, or "fit" = cover the path in that time), optionally running */
export type Go = { t0: number; t1: number; speed?: number | string; run?: boolean };

export type ActorSpec = {
  who: string;                // cast key
  at?: V2 | V3;               // standing position (world metres); z from the set's terrain if omitted (0 = flat)
  path?: V2[];                // ground path to walk/run along (starts at path[0])
  go?: Go[];                  // when to move along the path
  face?: V2 | "camera" | "left" | "right";   // facing when standing (world direction or screen side)
  do?: Do[];                  // actions over time (cross-faded)
  hold?: Pose["hold"];        // prop in hand
  pose?: Partial<Pose>;       // fixed pose overrides
  close?: { x: number; y: number; ppm: number };   // hand-framed close-up (screen px), ignores the camera
  hidden?: [number, number];  // not drawn between these times
  light?: string;             // CAST_LIGHT key (defaults to the shot light)
  shadow?: number;
};

export type FxSpec = [string, Record<string, unknown>?];

export type MoveSpec = {
  kind?: "static" | "push" | "pull" | "drift" | "handheld" | "reveal" | "track" | "crash";
  from?: number; to?: number;          // zoom
  focus?: V2 | V3 | string;            // screen px, world point, or an actor key
  dx?: number; dy?: number;            // drift px
  shake?: number;                      // handheld amplitude px
  impacts?: number[];                  // camera hits at these times
};

export type ShotSpec = {
  id: string; t0: number; t1: number;
  template: string;
  set: Record<string, string | number | boolean>;   // tools/kz-set.py arguments (set, light, cam, period, ...)
  plate?: string;                     // plate folder under public/ (default <slug>/plates/<id>), or reuse another shot's
  actors?: ActorSpec[];
  fx?: FxSpec[];
  move?: MoveSpec;
  grade?: GradeName;
  layers?: string[];                  // extra plate layers: depth, fg, flicker
  transition?: "cut" | "dip" | "fade" | "flash" | "whip" | "iris";
  title?: { text: string; sub?: string; at?: number; d?: number };   // on-screen title (intro hooks, dates, places)
  sound?: { ambience?: string; hits?: [string, number, number?][]; steps?: string };
  note?: string;                      // what the narration says here (for the plan document)
};

export type CastSpec = Record<string, { look: string; over?: Partial<Look> }>;

export type SceneSpec = {
  slug: string; genre: string; grade?: GradeName; fps?: number;
  words?: string; audio?: string; subtitles?: { mood?: string; key?: string[] };
  cast: CastSpec;
  shots: ShotSpec[];
};

export const sceneLength = (s: SceneSpec) => Math.max(...s.shots.map((x) => x.t1));
export const plateDir = (s: SceneSpec, shot: ShotSpec) => shot.plate ?? `${s.slug}/plates/${shot.id}`;
