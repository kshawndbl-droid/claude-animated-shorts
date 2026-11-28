// <SceneFromJson src="slug/scene.json" />: renders a whole Short (or a preview of a few shots) from its scene spec:
// plates, cast, effects, camera moves, transitions, grade, titles, subtitles and the mix. Nothing here is specific
// to one story, so every Short gets the same quality floor and new Shorts are mostly data.
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Figure } from "../characters/rig";
import { WARDROBE, cast as castLook } from "../characters/looks";
import { CamJ, V2, V3, project, push, drift, shake, impact, moveStyle, facesLeft, Move } from "../scene/camera";
import { Plate, Foreground, flicker } from "../scene/Plate";
import { Actor, Crowd, CAST_LIGHT } from "../scene/Actor";
import * as FX from "../scene/fx";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import type { SceneSpec, ShotSpec } from "./spec";
import { plateDir } from "./spec";
import { actorState, resolveShot, ResolvedShot } from "./templates";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** load JSON files from public/ once (blocks rendering until they are there) */
export const useJsonFiles = <T,>(paths: string[]): (T | null)[] => {
  const [data, setData] = useState<(T | null)[]>(paths.map(() => null));
  const [handle] = useState(() => delayRender("json " + paths.join(",")));
  useEffect(() => {
    Promise.all(paths.map((p) => fetch(staticFile(p)).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((d) => { setData(d as (T | null)[]); continueRender(handle); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return data;
};

const lightOf = (s: ShotSpec) => String(s.set.light ?? "none");
const SHOT_LIGHT: Record<string, string> = { night_moon: "night_moon", dusk: "dusk", candle: "candle", storm: "storm", overcast: "overcast", golden: "golden", noon: "noon", morning: "morning", dawn: "dawn", interior_day: "interior_day" };

const cameraMove = (s: ResolvedShot, T: number, cam: CamJ | null, focusOf: (k: string) => V2 | null): Move => {
  const u = clamp01((T - s.t0) / (s.t1 - s.t0)), tt = T - s.t0, m = s.move;
  let f: V2 = [540, 900];
  if (typeof m.focus === "string") f = focusOf(m.focus) ?? f;
  else if (m.focus && m.focus.length === 3 && cam) { const P = project(cam, m.focus as V3); f = [P.x, P.y]; }
  else if (m.focus) f = m.focus as V2;
  let mv: Move;
  switch (m.kind) {
    case "static": mv = { zoom: m.to ?? 1.0, ox: f[0], oy: f[1], dx: 0, dy: 0, rot: 0 }; break;
    case "drift": case "track": mv = drift(u, { dx: m.dx ?? 50, dy: m.dy ?? 0, zoom: m.to ?? 1.06, focus: f }); break;
    case "handheld": mv = drift(u, { dx: m.dx ?? 0, zoom: m.to ?? 1.06, focus: f }); break;
    case "reveal": mv = push(u, { from: m.from ?? 1.4, to: m.to ?? 1.0, focus: f }); break;
    case "pull": mv = push(u, { from: m.from ?? 1.1, to: m.to ?? 1.0, focus: f }); break;
    case "crash": {
      const k = 0.78 * (1 - Math.exp(-tt / 0.16)) + 0.22 * u;
      mv = { zoom: (m.from ?? 1) + ((m.to ?? 1.16) - (m.from ?? 1)) * k, ox: f[0], oy: f[1], dx: 0, dy: 0, rot: 0 }; break;
    }
    default: mv = push(u, { from: m.from ?? 1.0, to: m.to ?? 1.07, focus: f });
  }
  const extra = { dx: 0, dy: 0, rot: 0 };
  if (m.kind === "handheld" || m.shake) { const sh = shake(T, m.shake ?? 5); extra.dx += sh.dx; extra.dy += sh.dy; extra.rot += sh.rot; }
  for (const t of m.impacts ?? []) { const h = impact(T, t, 18, 0.35); extra.dx += h.dx; extra.dy += h.dy; extra.rot += h.rot; }
  return { ...mv, dx: mv.dx + extra.dx, dy: mv.dy + extra.dy, rot: mv.rot + extra.rot };
};

/** named effects usable in scene.json "fx": [name, args]. World positions ("at": [x, y, z]) are projected. */
const renderFx = (name: string, a: Record<string, any>, T: number, cam: CamJ | null, key: string, ctx: { k: number; scene: SceneSpec; light: string }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const P = a.at && cam ? project(cam, a.at as V3) : { x: a.x ?? 540, y: a.y ?? 900, ppm: a.s ?? 100 };
  const id = `${name}${key}`;
  switch (name) {
    case "fog": return <FX.Fog key={key} T={T} id={id} y0={a.y0 ?? 1350} op={a.op ?? 0.25} col={a.col} spread={a.spread} />;
    case "rain": return <FX.Rain key={key} T={T} heavy={a.heavy} wind={a.wind} />;
    case "snow": return <FX.Snow key={key} T={T} amount={a.amount} wind={a.wind} />;
    case "dust": return <FX.Dust key={key} T={T} {...a} />;
    case "leaves": return <FX.Leaves key={key} T={T} n={a.n} wind={a.wind} />;
    case "birds": return <FX.Birds key={key} T={T} t0={a.t0 ?? 0} n={a.n ?? 6} y={a.y ?? 330} size={a.size ?? 11} speed={a.speed ?? 70} dir={a.dir ?? 1} col={a.col} />;
    case "godrays": return <FX.GodRays key={key} T={T} id={id} x={P.x} y={P.y} angle={a.angle} op={a.op} col={a.col} />;
    case "lightning": return <FX.Lightning key={key} T={T} at={a.times ?? []} x={a.x} />;
    case "flames": return <FX.Flames key={key} T={T} id={id} x={P.x} y={P.y} s={P.ppm * (a.size ?? 1)} k={ctx.k} width={a.width} />;
    case "embers": return <FX.Embers key={key} T={T} x={P.x} y={P.y} s={P.ppm} n={a.n} />;
    case "smoke": return <FX.Smoke key={key} T={T} id={id} x={P.x} y={P.y} s={P.ppm * (a.size ?? 1)} op={a.op} col={a.col} />;
    case "puff": return <FX.Puff key={key} T={T} id={id} t0={a.t0} x={P.x} y={P.y} s={P.ppm} size={a.size} col={a.col} />;
    case "splash": return <FX.Splash key={key} T={T} t0={a.t0} x={P.x} y={P.y} s={P.ppm} size={a.size} />;
    case "pool": return <FX.LightPool key={key} id={id} x={P.x} y={P.y} s={P.ppm} k={ctx.k} col={a.col} r={a.r} />;
    case "crowd": return cam ? <Crowd key={key} cam={cam} T={T} area={a.area} n={a.n} seed={a.seed} light={ctx.light}
      looks={(a.looks ?? ["farmer", "colonialWoman", "worker1900", "casual"]).map((l: string) => WARDROBE[l] ?? WARDROBE.casual)}
      react={a.react} face={a.face} /> : null;
    default: return null;
  }
};

const Title: React.FC<{ T: number; t: NonNullable<ShotSpec["title"]>; t0: number }> = ({ T, t, t0 }) => {
  const at = t0 + (t.at ?? 0.3), d = t.d ?? 2.4, k = clamp01((T - at) / 0.4) * (1 - clamp01((T - at - d) / 0.5));
  if (k <= 0) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 250, height: 400, opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>
      <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 84, color: "#fff", textAlign: "center", textShadow: "0 4px 18px rgba(0,0,0,0.7)", padding: "0 60px", lineHeight: 1.1 }}>{t.text}</div>
      {t.sub && <div style={{ fontFamily: "Georgia, serif", fontSize: 44, color: "#f0e2c4", marginTop: 18, letterSpacing: 4, textShadow: "0 3px 12px rgba(0,0,0,0.7)" }}>{t.sub}</div>}
    </AbsoluteFill>
  );
};

export const ShotView: React.FC<{ scene: SceneSpec; shot: ResolvedShot; cam: CamJ | null; T: number; fr: number }> = ({ scene, shot, cam, T, fr }) => {
  const light = lightOf(shot), k = flicker(T);
  const lit = (shot.layers ?? []).includes("flicker");
  const states = (shot.actors ?? []).filter((a) => !(a.hidden && T >= a.hidden[0] && T < a.hidden[1]))
    .map((a, i) => ({ a, i, s: actorState(a, T, { blinkSeed: i * 3 + 1 }) }));
  const focusOf = (key: string): V2 | null => {
    const st = states.find((x) => x.a.who === key);
    if (!st) return null;
    if (st.a.close) return [st.a.close.x, st.a.close.y - 1.1 * st.a.close.ppm];
    if (!cam) return null;
    const P = project(cam, st.s.pos); return [P.x, P.y - 0.9 * P.ppm];
  };
  const mv = cameraMove(shot, T, cam, focusOf);
  const fgMove = { ...mv, zoom: 1 + (mv.zoom - 1) * 1.5, dx: mv.dx * 1.4 };
  const dir = plateDir(scene, shot);
  const sorted = [...states].sort((x, y) => (cam ? project(cam, y.s.pos).depth - project(cam, x.s.pos).depth : 0));
  const actors = sorted.map(({ a, s, i }) => {
    const look = castLook(WARDROBE[scene.cast[a.who]?.look] ?? WARDROBE.casual, scene.cast[a.who]?.over ?? {});
    const L = a.light ?? SHOT_LIGHT[light] ?? "none";
    if (a.close) {
      return <svg key={i} width={1080} height={1920} style={{ position: "absolute", overflow: "visible" }}>
        <g style={{ filter: L === "none" ? undefined : (CAST_LIGHT[L] ?? L) }}>
          <Figure x={a.close.x} y={a.close.y} ppm={a.close.ppm} look={look} pose={s.pose} flip={a.face === "left"} />
        </g>
      </svg>;
    }
    if (!cam) return null;
    const flip = a.face === "left" ? true : a.face === "right" ? false : s.dir ? facesLeft(cam, s.pos, s.dir) : false;
    return <Actor key={i} cam={cam} at={s.pos} look={look} pose={s.pose} flip={flip} light={L} k={lit ? k : undefined} shadow={a.shadow ?? 0.5} />;
  });
  const fx = (shot.fx ?? []).map(([n, a], i) => renderFx(n, a ?? {}, T, cam, `${shot.id}_${i}`, { k, scene, light }));
  return <>
    <AbsoluteFill style={moveStyle(mv)}>
      <Plate dir={dir} flick={lit ? k : undefined} haze={(shot.layers ?? []).includes("depth") ? { color: night(light) ? "#30406a" : "#d8c4a8", amount: 0.22 } : undefined} />
      {fx.filter((_, i) => !["fog", "rain", "snow", "leaves", "lightning"].includes(shot.fx![i][0]))}
      {actors}
    </AbsoluteFill>
    {(shot.layers ?? []).includes("fg") && <AbsoluteFill style={moveStyle(fgMove)}><Foreground dir={dir} blur={2} /></AbsoluteFill>}
    {fx.filter((_, i) => ["fog", "rain", "snow", "leaves", "lightning"].includes(shot.fx![i][0]))}
    {shot.blows.map((t, i) => <FX.FlashCut key={i} T={T} at={t} d={0.1} />)}
    <FX.Grade fr={fr} look={shot.grade ?? "true"} vig={shot.vig} id={`g${shot.id}`} />
    {shot.title && <Title T={T} t={shot.title} t0={shot.t0} />}
  </>;
};
const night = (l: string) => ["night_moon", "candle", "storm", "dusk"].includes(l);

const transitionLayer = (shot: ResolvedShot, T: number) => {
  switch (shot.transition) {
    case "dip": return <FX.DipToBlack T={T} at={shot.t0} d={0.25} />;
    case "fade": return <FX.Fade T={T} at={shot.t0} d={0.5} />;
    case "flash": return <FX.FlashCut T={T} at={shot.t0} d={0.2} />;
    case "iris": return <FX.Iris T={T} at={shot.t0} d={0.7} dir="in" />;
    default: return null;
  }
};

/** props for the generic KzScene composition (tools/kz.py renders any Short through it) */
export type KzSceneProps = { src: string; from?: number; duration?: number; captions?: boolean; withAudio?: boolean };
export const kzSceneMetadata = ({ props }: { props: KzSceneProps }) => ({ durationInFrames: Math.max(1, Math.round((props.duration ?? 10) * 30)) });

export const SceneFromJson: React.FC<{ src: string; from?: number; captions?: boolean; withAudio?: boolean }> = ({ src, from = 0, captions = true, withAudio = true }) => {
  const [scene] = useJsonFiles<SceneSpec>([src]);
  if (!scene) return <AbsoluteFill style={{ background: "#000" }} />;
  return <SceneView scene={scene} from={from} captions={captions} withAudio={withAudio} />;
};

export const SceneView: React.FC<{ scene: SceneSpec; from?: number; captions?: boolean; withAudio?: boolean }> = ({ scene, from = 0, captions = true, withAudio = true }) => {
  const { fps } = useVideoConfig();
  const fr = useCurrentFrame(), T = from + fr / fps;
  const cams = useJsonFiles<CamJ>(scene.shots.map((s) => `${plateDir(scene, s)}/cam.json`));
  const [words] = useJsonFiles<Word[]>(scene.words ? [scene.words] : []);
  const shots = scene.shots.map((s) => resolveShot(s, scene));
  const i = Math.max(0, shots.findIndex((s) => T >= s.t0 - 1e-6 && T < s.t1 - 1e-6));
  const idx = T >= shots[shots.length - 1].t1 ? shots.length - 1 : i;
  const shot = shots[idx];
  // whip pans: the outgoing and incoming shots slide and blur through the cut
  const next = shots[idx + 1], whipOut = next?.transition === "whip" ? FX.whipPan(T, next.t0) : {};
  const whipIn = shot.transition === "whip" ? FX.whipPan(T, shot.t0) : {};
  const sub = defaultStyle(scene.subtitles?.mood ?? "serious", { key: "#3DF0FF", keyWords: scene.subtitles?.key ?? [], y: 0.74, maxChars: 16 });
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ ...whipOut, ...whipIn }}>
        <ShotView scene={scene} shot={shot} cam={cams[idx]} T={T} fr={fr} />
      </AbsoluteFill>
      {transitionLayer(shot, T)}
      {next?.transition === "dip" && <FX.DipToBlack T={T} at={next.t0} d={0.25} />}
      {next?.transition === "fade" && <FX.Fade T={T} at={next.t0} d={0.35} dir="out" />}
      {shots[0].t0 === 0 && <FX.Fade T={T} at={0} d={0.35} />}
      <FX.Fade T={T} at={shots[shots.length - 1].t1} d={0.6} dir="out" />
      {captions && words && <Subtitles words={words} style={sub} offset={-from} />}
      {withAudio && scene.audio && <Audio src={staticFile(scene.audio)} startFrom={Math.round(from * fps)} />}
    </AbsoluteFill>
  );
};
