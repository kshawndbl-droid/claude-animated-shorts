// LIBRARY TEST: the new motions, actors, effects and grades on library Blender sets in daylight and candlelight
// (proof that the system is not only horror). Plates: tools/kz-set.py, see tools/kz-library-test.sh.
//  s1 0.0-4.5   golden village, wide: a colonist walks down the road toward us, a woman waves; crowd and birds behind
//  s2 4.5-8.5   medium: the two talk; he points down the road, she laughs, he shrugs
//  s3 8.5-11.5  cottage by candle and firelight: she warms her hands, a knock (startle), she turns to the door
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { WARDROBE, cast, HAIR, SKIN } from "../characters/looks";
import { perform, idle, walk, wave, talk, point, laugh, shrug, lookAround, startle, think, SPEED } from "../characters/motion";
import { Plate, Foreground, flicker } from "../scene/Plate";
import { Actor, Crowd } from "../scene/Actor";
import { CamJ, project, push, drift, moveStyle, shotAt, impact } from "../scene/camera";
import { Birds, Dust, Flames, Grade, DipToBlack, Fade, Smoke, LightPool } from "../scene/fx";
import camW from "../../public/library/test/v_wide/cam.json";
import camM from "../../public/library/test/v_med/cam.json";
import camC from "../../public/library/test/cottage/cam.json";

export const DAYLIGHT_FRAMES = 345;
const SHOTS = [{ id: "s1", t0: 0, t1: 4.5 }, { id: "s2", t0: 4.5, t1: 8.5 }, { id: "s3", t0: 8.5, t1: 11.5 }];
const HE = cast(WARDROBE.colonist1700s, { hair: HAIR.brown });
const SHE = cast(WARDROBE.colonialWoman, { skin: SKIN.light, hair: HAIR.auburn });
const CROWD = [WARDROBE.farmer, WARDROBE.colonialWoman, WARDROBE.colonist1700s, WARDROBE.medievalPeasant, WARDROBE.streetUrchin].filter(Boolean);
const GOLD_HAZE = { color: "#e8b880", amount: 0.2 };

export const DaylightTest: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const fr = useCurrentFrame(), T = fr / 30;
  const { shot, u } = shotAt(T, SHOTS);
  let body: React.ReactNode = null, look: "golden" | "mystery" = "golden";

  if (shot.id === "s1") {
    const cam = camW as CamJ;
    // he walks down the road toward the camera (world -x), she stands by the fence and waves when he is close
    const mv = walk(0.2, 4.0, SPEED.hurry)(T);
    const hx = 8.8 - (mv.dist ?? 0);
    const he = perform(T, [{ at: 0, motion: walk(0.2, 4.0, SPEED.hurry, { expr: "smile", lookX: 0.5 }) }], { blink: true, seed: 2 });
    const she = perform(T, [{ at: 0, motion: idle({ expr: "neutral" }) }, { at: 2.6, motion: wave("smile"), blend: 0.4 }], { blink: true, seed: 5 });
    const F = project(cam, [4.2, -1.3, 0]);
    const m = push(u, { from: 1.0, to: 1.06, focus: [F.x, F.y - 250] });
    const mf = push(u, { from: 1.0, to: 1.1, focus: [F.x, F.y - 250] });   // the near layer moves more: parallax
    const ch = project(cam, [26, 9.5, 6.8]);
    body = <>
      <AbsoluteFill style={moveStyle(m)}>
        <Plate dir="library/test/v_wide" haze={GOLD_HAZE} />
        <Smoke x={ch.x} y={ch.y} s={ch.ppm} T={T} op={0.5} id="ch1" />
        <Birds T={T} n={6} y={330} size={11} speed={70} />
        <Crowd cam={cam} T={T} looks={CROWD} area={[17, 32, -2.2, 2.2]} n={9} seed={4} light="golden" />
        <Actor cam={cam} at={[hx, 0.5, 0]} dir={[-1, 0]} look={HE} pose={he} light="golden" />
        <Actor cam={cam} at={[4.2, -1.3, 0]} dir={[1, 0.3]} look={SHE} pose={she} light="golden" />
      </AbsoluteFill>
      <AbsoluteFill style={moveStyle(mf)}><Foreground dir="library/test/v_wide" blur={2} /></AbsoluteFill>
    </>;
  } else if (shot.id === "s2") {
    const cam = camM as CamJ, tt = T - 4.5;
    const he = perform(T, [
      { at: 0, motion: talk(0.6, "smile") }, { at: 5.6, motion: point({ height: 0.15, expr: "surprised" }), blend: 0.35 },
      { at: 6.8, motion: talk(0.4, "neutral") }, { at: 7.5, motion: shrug(), blend: 0.3 }], { blink: true, seed: 3 });
    const she = perform(T, [
      { at: 0, motion: idle({ expr: "smile", lookX: 0.6 }) }, { at: 6.2, motion: laugh(), blend: 0.3 }, { at: 7.6, motion: talk(0.5, "smile") }], { blink: true, seed: 8 });
    const P = project(cam, [2.4, 0.2, 0]);
    const m = { ...drift(u, { dx: 30, zoom: 1.06, focus: [P.x, P.y - 400] }) };
    body = <AbsoluteFill style={moveStyle(m)}>
      <Plate dir="library/test/v_med" haze={{ ...GOLD_HAZE, amount: 0.22 }} />
      <Birds T={T} t0={4.5} n={4} y={260} size={9} speed={55} dir={-1} />
      <Actor cam={cam} at={[2.5, 0.75, 0]} dir={[0, -1]} look={HE} pose={{ ...he, t: tt + 3 }} light="golden" />
      <Actor cam={cam} at={[2.3, -0.75, 0]} dir={[0, 1]} look={SHE} pose={she} light="golden" />
      <Dust T={T} cx={700} cy={800} rx={300} ry={500} n={30} />
    </AbsoluteFill>;
  } else {
    look = "mystery";
    const cam = camC as CamJ, k = flicker(T), tt = T - 8.5;
    const she = perform(T, [
      { at: 0, motion: think() }, { at: 10.1, motion: startle(10.1, "scared") }, { at: 10.7, motion: lookAround({ side: -1, expr: "worried" }), blend: 0.4 }],
      { blink: true, seed: 6 });
    const fire = project(cam, [1.6, 5.2, 0.08]);
    const m = push(u, { from: 1.02, to: 1.1, focus: [fire.x - 150, fire.y - 200] });
    const hit = impact(T, 10.1, 9, 0.35);
    body = <AbsoluteFill style={moveStyle(m, hit)}>
      <Plate dir="library/test/cottage" flick={k} />
      <Flames x={fire.x} y={fire.y} s={fire.ppm * 0.7} T={T} k={k} id="cf" />
      <Actor cam={cam} at={[0.55, 3.7, 0]} dir={[1, 0.4]} look={SHE} pose={{ ...she, t: tt }} light="candle" k={k} />
      <LightPool x={fire.x} y={fire.y + 0.2 * fire.ppm} s={fire.ppm} k={k} r={2.2} id="cfp" />
    </AbsoluteFill>;
  }

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {body}
      <Grade fr={fr} look={look} />
      <DipToBlack T={T} at={8.5} d={0.3} />
      <Fade T={T} at={0} d={0.4} />
      <Fade T={T} at={11.5} d={0.5} dir="out" />
      {withAudio && <Audio src={staticFile("library/test/mix.wav")} />}
    </AbsoluteFill>
  );
};
