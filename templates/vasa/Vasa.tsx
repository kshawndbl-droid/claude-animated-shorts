// "The Vasa, 1628": our original short. One three.js world (vworld.ts) posed per frame from the timeline (vstory.ts),
// rendered through the shared toon post chain (ink lines -> lens blur -> bloom -> neutral tone map -> colour grade),
// with 2D overlays (cut flashes, the sombre dip, the 333-years counter, the legend crown), the approved animated
// subtitles and the soundtrack (approved narration + music + effects, public/vasa/mix.wav).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, getInputProps, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../bridge/grade";
import { VasaWorld, gradeOf } from "./vworld";
import { FPS, TOTAL, FLASHES, sombre, shotAt, smooth } from "./vstory";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import words from "../../stories/vasa/words.json";

export const VASA_FRAMES = TOTAL;
export const VASA_KEYWORDS = ["vasa", "aura", "cooked", "cap", "fumbled", "legend", "sixty-four", "thirty", "1961", "energy", "main", "character"];
export const vasaSubStyle = defaultStyle("funny", { keyWords: VASA_KEYWORDS });

type Toggles = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean; subs: boolean; audio: boolean };
const toggles = (): Toggles => ({ ink: true, lens: true, bloom: true, grade: true, subs: true, audio: true, ...((getInputProps() as { post?: Partial<Toggles> }).post ?? {}) });

const fwd = new THREE.Vector3();
const Inner: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const { camera, scene } = useThree();
  const world = useMemo(() => new VasaWorld(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 22, nearScale: 1.1 }),
    bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.55, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  const focus = world.update(t, cam, scene);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, focus.clone().sub(cam.position).dot(fwd));
  fx.lens.cInf = shotAt(t).dof ?? 0;
  gradeFor(fx.grade, gradeOf(t));
  return (<><primitive object={world.root} dispose={null} />{post}</>);
};

const Crown: React.FC<{ k: number }> = ({ k }) => (
  <svg viewBox="0 0 200 140" width={260} height={182} style={{ position: "absolute", left: 410, top: 300, transform: `scale(${0.6 + 0.4 * k}) rotate(${(1 - k) * -12}deg)`, opacity: k, filter: "drop-shadow(0 8px 10px rgba(0,0,0,.5))" }}>
    <path d="M20 120 L10 40 L60 80 L100 20 L140 80 L190 40 L180 120 Z" fill="#ffd400" stroke="#111" strokeWidth={9} strokeLinejoin="round" />
    {[10, 100, 190].map((x, i) => <circle key={i} cx={x} cy={i === 1 ? 20 : 40} r={12} fill="#ffd400" stroke="#111" strokeWidth={7} />)}
    <rect x={18} y={112} width={164} height={18} rx={6} fill="#e0a800" stroke="#111" strokeWidth={8} />
  </svg>
);

const Years: React.FC<{ t: number }> = ({ t }) => {
  const k = smooth((t - 60.6) / 0.3) * (1 - smooth((t - 63.55) / 0.25));
  if (k <= 0) return null;
  const y = Math.round(interpolate(t, [61.0, 63.0], [1628, 1961], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", opacity: k, fontFamily: "SubFont, Arial Black, sans-serif", fontWeight: 800 }}>
      <div style={{ fontSize: 150, color: "#ffffff", WebkitTextStroke: "16px #000", paintOrder: "stroke fill", letterSpacing: 4 }}>{y}</div>
      <div style={{ fontSize: 58, color: "#7fe6ff", WebkitTextStroke: "10px #000", paintOrder: "stroke fill", marginTop: -10 }}>{y - 1628} YEARS UNDER</div>
    </div>
  );
};

export const VasaShort: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const on = toggles();
  const flash = FLASHES.map(([at, col, len]) => ({ col, k: t >= at && t < at + len ? 1 - (t - at) / len : 0 })).find((x) => x.k > 0);
  const dim = sombre(t);
  const crown = smooth((t - 72.4) / 0.35);
  return (
    <AbsoluteFill style={{ background: "#10131a" }}>
      <AbsoluteFill style={{ filter: dim > 0 ? `saturate(${1 - 0.55 * dim}) brightness(${1 - 0.18 * dim})` : undefined }}>
        <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 45, near: 0.25, far: 3000 }}>
          <Inner />
        </ThreeCanvas>
      </AbsoluteFill>
      <Years t={t} />
      {crown > 0 && <Crown k={crown} />}
      {flash && <AbsoluteFill style={{ background: flash.col, opacity: flash.k * 0.9 }} />}
      {on.subs && <Subtitles words={words as Word[]} style={vasaSubStyle} />}
      {withAudio && on.audio && <Audio src={staticFile("vasa/mix.wav")} />}
    </AbsoluteFill>
  );
};
