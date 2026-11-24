// "Medusa" v2: bold-outline cartoon characters (generated with a free open model, then cut out), shown full body and
// animated (walk, bend, breathe, hop, squash), with expressive close-ups only at the big emotional beats, over busy,
// painted, slightly blurred backgrounds. Lots of camera energy.
import React from "react";
import { AbsoluteFill, Audio, Img, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, Word, defaultStyle } from "../../src/subtitles/Subtitles";
import lines from "../../stories/medusa/lines.json";
import words from "../../stories/medusa/words.json";

const W = 1080, H = 1920, FPS = 30;
const LINES = lines as { start: number; end: number; text: string }[];
const WORDS = words as Word[];
export const MED2_TOTAL = Math.ceil((LINES[LINES.length - 1].end + 1.9) * FPS);
const KEY = ["medusa", "hair", "poseidon", "athena", "snakes", "stone", "perseus", "head", "lowkey", "hermes", "shield", "sandals", "invisible", "reflection", "pegasus", "king", "court", "survivor", "monster", "villain", "victim", "forever", "swing"];
const subStyle = defaultStyle("mystery", { keyWords: KEY });

const LEAD = 0.25;
const SHOTS = LINES.map((l, i) => ({ a: i === 0 ? 0 : l.start - LEAD, b: i === LINES.length - 1 ? MED2_TOTAL / FPS : LINES[i + 1].start - LEAD }));
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
function wt(li: number, word: string, n = 0) { const ws = WORDS.filter((w) => w.line === li && norm(w.w) === norm(word)); return ws[n]?.s ?? LINES[li].start; }
const rel = (li: number, word: string, n = 0) => wt(li, word, n) - SHOTS[li].a;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const c = clamp01(x); return c * c * (3 - 2 * c); };
const since = (t: number, t0: number, d = 0.4) => smooth((t - t0) / d);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** springy overshoot 0..1 (for pop-ins) */
const pop = (t: number, t0: number, d = 0.45) => { const x = clamp01((t - t0) / d); return x <= 0 ? 0 : 1 + Math.sin(x * Math.PI * 1.5) * Math.exp(-x * 4) * 0.35 - (1 - x) * (1 - x) * (1 - x); };
const art = (n: string) => staticFile(`medusa/art/${n}`);

// ---------------------------------------------------------------- building blocks
const Bg: React.FC<{ src: string; u: number; blur?: number; z0?: number; z1?: number; dx?: number; dy?: number; dur?: number; tint?: string; bright?: number }> = ({ src, u, blur = 3, z0 = 1.12, z1 = 1.22, dx = 0, dy = 0, dur = 5, tint, bright = 1 }) => {
  const k = clamp01(u / dur), z = lerp(z0, z1, k);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={art(src + ".png")} style={{ position: "absolute", width: W, height: H, objectFit: "cover", transform: `translate(${dx * k}px, ${dy * k}px) scale(${z})`, filter: `blur(${blur}px) brightness(${bright}) saturate(1.15)` }} />
      {tint && <AbsoluteFill style={{ background: tint }} />}
    </AbsoluteFill>
  );
};

/** a cut-out character image; x,y is the bottom centre; rot pivots at the bottom (like a body leaning) */
const Cut: React.FC<{ src: string; x: number; y: number; w: number; rot?: number; sx?: number; sy?: number; flip?: boolean; op?: number; filter?: string; glow?: string }> = ({ src, x, y, w, rot = 0, sx = 1, sy = 1, flip = false, op = 1, filter = "", glow }) => (
  <Img src={art(src + "_cut.png")} style={{
    position: "absolute", left: x - w / 2, top: y - w * 1.25, width: w, transformOrigin: "50% 100%", opacity: op,
    transform: `rotate(${rot}rad) scale(${(flip ? -1 : 1) * sx}, ${sy})`,
    filter: `${filter} drop-shadow(0 0 0 #000) drop-shadow(6px 0 0 #111) drop-shadow(-6px 0 0 #111) drop-shadow(0 6px 0 #111) drop-shadow(0 -6px 0 #111)${glow ? ` drop-shadow(0 0 40px ${glow})` : ""} drop-shadow(0 30px 30px rgba(0,0,0,0.45))`,
  }} />
);

/** a full-body cut-out that really moves: the upper body bends and breathes around the waist, the whole figure walks
 *  (bob + sway), hops, squashes and leans. x,y = feet; h = figure height in px. */
type Act = { bend?: number; walk?: number; hop?: number; lean?: number; sq?: number; breathe?: number };
const Body: React.FC<{ src: string; x: number; y: number; h: number; t: number; act?: Act; flip?: boolean; op?: number; filter?: string; glow?: string; z?: number }> = ({ src, x, y, h, t, act = {}, flip = false, op = 1, filter = "", glow }) => {
  const w = h * (512 / 896), walk = act.walk ?? 0, ph = t * 8.5;
  const bob = Math.abs(Math.sin(ph)) * h * 0.018 * walk, sway = Math.sin(ph) * 0.035 * walk;
  const br = (act.breathe ?? 1) * Math.sin(t * 2.3) * 0.012, sq = act.sq ?? 0;
  const bend = (act.bend ?? 0) + Math.sin(t * 1.7) * 0.012 + Math.sin(ph * 2) * 0.02 * walk;
  const im = (clip: string, tf: string) => <Img src={art(src + "_cut.png")} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, clipPath: clip, transformOrigin: "50% 56%", transform: tf }} />;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h - (act.hop ?? 0) - bob, width: w, height: h, opacity: op, transformOrigin: "50% 100%",
      transform: `scale(${(flip ? -1 : 1) * (1 + sq)}, ${1 - sq}) rotate(${(act.lean ?? 0) + sway}rad)`,
      filter: `${filter} drop-shadow(5px 0 0 #111) drop-shadow(-5px 0 0 #111) drop-shadow(0 5px 0 #111) drop-shadow(0 -5px 0 #111)${glow ? ` drop-shadow(0 0 40px ${glow})` : ""} drop-shadow(0 26px 24px rgba(0,0,0,0.45))` }}>
      {im("inset(54% 0 0 0)", "none")}
      {im("inset(0 0 44% 0)", `rotate(${bend}rad) scale(${1 + br * 0.5}, ${1 + br})`)}
    </div>
  );
};
/** a polished bronze shield; `src` (a cut-out face) is shown in it as a reflection or a relief */
const Shield: React.FC<{ src: string; x: number; y: number; d: number; t: number; relief?: boolean; rot?: number }> = ({ src, x, y, d, t, relief, rot = 0 }) => (
  <div style={{ position: "absolute", left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: "50%", border: `${d * 0.04}px solid #7a4e1c`, transform: `rotate(${rot}rad)`, boxShadow: "0 0 0 8px #111, inset 0 0 0 8px #111, 0 30px 60px rgba(0,0,0,0.6)", overflow: "hidden", background: "radial-gradient(circle at 35% 30%, #f2cc84, #b07a38 60%, #6a4218)" }}>
    <Img src={art(src + "_cut.png")} style={{ position: "absolute", left: d * 0.06, top: d * 0.02 + Math.sin(t * 1.2) * 5, width: d * 0.85, filter: relief ? "sepia(1) saturate(1.6) brightness(0.85) contrast(1.3)" : "sepia(0.6) saturate(1.2) brightness(0.9)", opacity: relief ? 0.85 : 0.9, transform: "scaleX(-1)", mixBlendMode: relief ? "multiply" : "normal" }} />
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${110 + Math.sin(t) * 20}deg, rgba(255,240,200,0) 30%, rgba(255,240,200,0.4) 50%, rgba(255,240,200,0) 70%)` }} />
  </div>
);
const Harpe: React.FC<{ x: number; y: number; s: number; rot: number; glow?: number }> = ({ x, y, s, rot, glow = 0 }) => (
  <svg width={400} height={400} viewBox="-200 -200 400 400" style={{ position: "absolute", left: x - 200, top: y - 200, transform: `rotate(${rot}rad) scale(${s})`, overflow: "visible", filter: glow ? `drop-shadow(0 0 ${30 * glow}px rgba(255,240,180,1))` : undefined }}>
    <path d="M-12,160 L-12,-60 Q-14,-150 60,-160 Q120,-160 125,-100 Q95,-135 55,-128 Q14,-118 14,-50 L14,160 Z" fill="#e4ebef" stroke="#111" strokeWidth={9} strokeLinejoin="round" />
    <rect x={-40} y={60} width={80} height={22} fill="#c9a13e" stroke="#111" strokeWidth={7} /><rect x={-13} y={82} width={26} height={90} fill="#6a3e1e" stroke="#111" strokeWidth={7} />
  </svg>
);
const Wings: React.FC<{ x: number; y: number; s: number; t: number; op?: number }> = ({ x, y, s, t, op = 1 }) => (
  <svg width={300} height={200} viewBox="-150 -100 300 200" style={{ position: "absolute", left: x - 150, top: y - 100, transform: `scale(${s})`, opacity: op, overflow: "visible" }}>
    {[0, 1, 2].map((k) => <path key={k} d={`M0,0 Q${-60 - k * 15},${-40 - k * 22 + Math.sin(t * 24) * 16} ${-120 - k * 10},${-20 - k * 30 + Math.sin(t * 24) * 20} Q${-70},${-5 - k * 8} 0,10 Z`} fill="#fbf8f0" stroke="#111" strokeWidth={6} strokeLinejoin="round" />)}
  </svg>
);

/** a canvas of effects drawn per frame: particles, speed lines, light beams, flashes */
const FX: React.FC<{ t: number; kind: "dust" | "embers" | "spores" | "spray" | "none"; flash?: number; flashCol?: string; speed?: number; beams?: number; beamCol?: string }> = ({ t, kind, flash = 0, flashCol = "255,255,255", speed = 0, beams = 0, beamCol = "255,226,170" }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!; g.clearRect(0, 0, W, H);
    if (beams > 0) { g.save(); g.globalCompositeOperation = "screen"; for (let k = 0; k < 9; k++) { const x0 = 540 + (k - 4) * 50, x1 = 540 + (k - 4) * 280 + Math.sin(t * 0.6 + k) * 40; const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, `rgba(${beamCol},${0.3 * beams})`); lg.addColorStop(1, `rgba(${beamCol},0)`); g.fillStyle = lg; g.beginPath(); g.moveTo(x0 - 14, -10); g.lineTo(x0 + 14, -10); g.lineTo(x1 + 80, H); g.lineTo(x1 - 80, H); g.fill(); } g.restore(); }
    if (kind !== "none") {
      const col = kind === "spores" ? "170,255,120" : kind === "embers" ? "255,170,80" : kind === "spray" ? "235,250,255" : "255,235,200";
      let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      g.save(); g.globalCompositeOperation = "screen";
      for (let i = 0; i < 70; i++) { const sp = (kind === "embers" ? 120 : 40) + r() * 80, x = (r() * W + Math.sin(t * 0.8 + i) * 50 + W * 4) % W, y = (r() * H - t * sp + H * 60) % H, z = 2 + r() * 6;
        g.fillStyle = `rgba(${col},${0.3 + 0.4 * Math.abs(Math.sin(t * 2 + i))})`; g.beginPath(); g.arc(x, y, z, 0, 7); g.fill(); }
      g.restore();
    }
    if (speed > 0) { g.save(); g.strokeStyle = `rgba(255,255,255,${0.5 * speed})`; let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, r0 = 300 + r() * 300 + ((t * 2000 + i * 97) % 600), r1 = r0 + 200 + r() * 300; g.lineWidth = 2 + r() * 6; g.beginPath(); g.moveTo(540 + Math.cos(a) * r0, 960 + Math.sin(a) * r0); g.lineTo(540 + Math.cos(a) * r1, 960 + Math.sin(a) * r1); g.stroke(); } g.restore(); }
    if (flash > 0) { g.fillStyle = `rgba(${flashCol},${flash})`; g.fillRect(0, 0, W, H); }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
};
const Vignette: React.FC<{ a?: number }> = ({ a = 0.55 }) => <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${a}) 100%)` }} />;
const Title: React.FC<{ text: string; a: number; y?: number; size?: number; col?: string }> = ({ text, a, y = 520, size = 130, col = "#f4e6c4" }) => a > 0 ? (
  <div style={{ position: "absolute", top: y - size / 2, width: W, textAlign: "center", fontFamily: "Bitstream Charter, Caladea, serif", fontWeight: 700, fontSize: size, letterSpacing: size * 0.18, color: col, opacity: a, WebkitTextStroke: "6px #111", transform: `scale(${lerp(1.4, 1, smooth(a))})` }}>{text}</div>
) : null;


// ---------------------------------------------------------------- scenes (t = global time, u = time in shot)
type Scene = (t: number, u: number) => React.ReactNode;
const sc: Scene[] = [];

// 0. Medusa as a young woman by the sea: she walks in along the cliff path, then a punch-in on her face at "hair"
sc[0] = (t, u) => { const h = rel(0, "hair") - 0.2, close = u > h, arrive = since(u, 0, 2.2);
  return close ? (<>
    <Bg src="bg_sea" u={u} blur={7} z0={1.35} z1={1.42} />
    <Cut src="medusa_smile" x={540 + Math.sin(t * 1.2) * 10} y={H + 40} w={980} rot={Math.sin(t * 1.4) * 0.02} sx={pop(u, h, 0.4)} sy={pop(u, h, 0.4)} />
    <FX t={t} kind="dust" />
  </>) : (<>
    <Bg src="bg_sea" u={u} blur={2} dx={-50} z0={1.1} z1={1.18} />
    <Body src="fb_medusa" x={lerp(-120, 520, arrive)} y={1780} h={1250} t={t} act={{ walk: u < 2.2 ? 1 : 0, bend: u > 2.3 ? -0.05 : 0 }} />
    <FX t={t} kind="spray" />
  </>); };

// 1. the temple at night: the sea god looms in out of the storm; she backs away; close on her fear
sc[1] = (t, u) => { const pz = rel(1, "poseidon") - 0.3, at = rel(1, "attacked") - 0.15;
  const fl = Math.max(0, 1 - Math.abs(u - pz - 0.1) * 6) * 0.8;
  return u < at ? (<>
    <Bg src="bg_temple" u={u} blur={3} bright={0.75} />
    <Body src="fb_medusa_scared" x={lerp(560, 300, since(u, pz, 0.8))} y={1800} h={1050} t={t} act={{ bend: -0.08 * since(u, pz, 0.4), lean: -0.04 * since(u, pz, 0.5) }} />
    <Body src="fb_poseidon" x={lerp(1500, 860, since(u, pz, 0.7))} y={2050} h={1900} t={t} flip filter="brightness(0.8)" glow="rgba(60,200,255,0.6)" act={{ bend: 0.06 }} />
    <FX t={t} kind="spray" flash={fl} flashCol="200,230,255" />
  </>) : (<>
    <Bg src="bg_temple" u={u} blur={9} z0={1.4} bright={0.55} />
    <Cut src="medusa_scared" x={540 - (u - at) * 30 + Math.sin(t * 40) * 6 * Math.exp(-(u - at) * 4)} y={H + 40} w={1000} rot={0.04} sx={pop(u, at, 0.3)} sy={pop(u, at, 0.3)} />
    <AbsoluteFill style={{ background: "rgba(10,40,60,0.25)" }} />
  </>); };

// 2. Athena, furious, stamps in a blaze of light; then Medusa in tears at "punished Medusa"
sc[2] = (t, u) => { const pm = rel(2, "medusa") - 0.2, fu = rel(2, "furious") - 0.2;
  const stamp = u > fu ? Math.abs(Math.sin((u - fu) * 7)) * 40 * Math.exp(-(u - fu) * 1.2) : 0;
  return u < pm ? (<>
    <Bg src="bg_olympus" u={u} blur={3} />
    <FX t={t} kind="embers" beams={0.8} />
    <Body src="fb_athena_angry" x={540} y={1820} h={1450} t={t} glow="rgba(255,170,70,0.8)" act={{ hop: stamp, sq: stamp > 2 ? 0 : 0.03 * Math.exp(-(u - fu) * 2) * (u > fu ? 1 : 0), bend: 0.05 * Math.sin(t * 3) }} />
  </>) : (<>
    <Bg src="bg_temple" u={u} blur={9} z0={1.4} bright={0.55} />
    <Cut src="medusa_cry" x={540} y={H + 40} w={1000} sx={pop(u, pm, 0.35)} sy={pop(u, pm, 0.35)} rot={Math.sin(t * 1.5) * 0.02} />
  </>); };

// 3. the curse: green flash, snakes burst, the stare turns flesh to stone
sc[3] = (t, u) => { const sn = rel(3, "snakes") - 0.3, st = rel(3, "stone") - 0.2;
  const gf = Math.max(0, 1 - Math.abs(u - sn) * 4), sf = Math.max(0, 1 - Math.abs(u - st) * 5);
  const shake = Math.sin(t * 50) * 18 * Math.exp(-Math.max(0, u - sn) * 3) * (u > sn ? 1 : 0);
  return (<>
    <Bg src="bg_curse" u={u} blur={4} z0={1.2} z1={1.35} />
    <FX t={t} kind="spores" />
    {u < sn ? <Cut src="medusa_cry" x={540} y={H + 40} w={1000} rot={Math.sin(t * 6) * 0.03} />
      : <Cut src="gorgon_angry" x={540 + shake} y={H + 40} w={lerp(1000, 1100, clamp01((u - sn) / 3))} sx={pop(u, sn, 0.35)} sy={pop(u, sn, 0.35)} glow={u > st ? "rgba(140,255,90,0.9)" : "rgba(140,255,90,0.4)"} />}
    {u > st && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, rgba(170,255,120,${0.5 * (1 - since(u, st + 0.3, 1))}) 0%, rgba(0,0,0,0) 40%)` }} />}
    <FX t={t} kind="none" flash={Math.max(gf * 0.85, sf * 0.6)} flashCol="190,255,160" />
  </>); };

// 4. the edge of the world: she walks alone among the stone warriors toward her cave
sc[4] = (t, u) => (<>
  <Bg src="bg_edge" u={u} blur={2} z0={1.15} z1={1.3} dy={-60} dur={4.5} />
  <Body src="fb_gorgon" x={lerp(260, 720, clamp01(u / 5))} y={1760} h={900} t={t} act={{ walk: 0.7, bend: 0.06 }} />
  <FX t={t} kind="dust" />
  <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(200,210,210,0.45), rgba(0,0,0,0) 35%)" }} />
</>);

// 5. the king sends Perseus; "lowkey, a death sentence"
sc[5] = (t, u) => { const lk = rel(5, "lowkey") - 0.2, pin = rel(5, "perseus") - 0.3;
  return (<>
    <Bg src="bg_throne" u={u} blur={5} />
    <FX t={t} kind="embers" />
    <Body src="fb_king" x={290} y={1800} h={1250} t={t} act={{ bend: lerp(0, 0.1, since(u, 0.3, 0.4)) + Math.sin(t * 5) * 0.02 }} />
    <Body src="fb_perseus" x={lerp(1350, 800, since(u, pin, 0.6))} y={1830} h={1250} t={t} flip
      act={{ walk: u < pin + 0.6 && u > pin ? 1 : 0, hop: u > lk ? 70 * Math.exp(-(u - lk) * 6) * Math.abs(Math.sin((u - lk) * 12)) : 0, bend: u > lk ? -0.1 : 0, sq: u > lk ? 0.04 * Math.exp(-(u - lk) * 5) : 0 }} />
    {u > lk && <AbsoluteFill style={{ background: `rgba(120,0,0,${0.22 * since(u, lk, 0.3)})` }} />}
  </>); };

// 6. gifts of the gods: a curved blade drops out of the light; Athena brings the polished shield
sc[6] = (t, u) => { const hm = rel(6, "blade") - 0.5, at = rel(6, "athena") - 0.6, got = since(u, hm + 0.55, 0.3);
  return (<>
    <Bg src="bg_sky" u={u} blur={3} dy={60} />
    <FX t={t} kind="dust" beams={0.9} />
    <Body src="fb_athena_shield" x={lerp(1450, 820, since(u, at, 0.6))} y={1700} h={1150} t={t} flip act={{ bend: 0.05 }} glow="rgba(255,220,140,0.6)" />
    <Body src="fb_perseus" x={360} y={1830} h={1200} t={t} act={{ bend: lerp(0, -0.08, since(u, hm, 0.4)), hop: Math.abs(Math.sin(t * 4)) * 6 }} />
    {u > hm && <Harpe x={lerp(300, 420, since(u, hm, 0.55))} y={lerp(-200, 1080, since(u, hm, 0.55))} s={lerp(1.2, 0.85, got)} rot={lerp(2.5, 0.3, since(u, hm, 0.55)) + Math.sin(t * 3) * 0.05} glow={1 - got * 0.6} />}
  </>); };

// 7. winged sandals lift him into the air; then the helmet of darkness: he vanishes
sc[7] = (t, u) => { const sd = rel(7, "sandals") - 0.3, inv = rel(7, "invisible") - 0.1;
  const lift = since(u, sd + 0.3, 1.2), gone = since(u, inv, 0.6), fy = 1750 - lift * 420 + Math.sin(t * 3) * 25;
  return (<>
    <Bg src="bg_sky" u={u + 5} blur={4} dy={lift * 220} z0={1.25} />
    <FX t={t} kind="dust" speed={lift * (1 - gone) * 0.6} />
    <div style={{ opacity: 1 - gone, filter: gone > 0 ? `blur(${gone * 10}px)` : undefined }}>
      <Body src="fb_perseus_fly" x={540 + Math.sin(t * 2) * 30} y={fy} h={1250} t={t} act={{ lean: Math.sin(t * 2) * 0.05, bend: -0.04 }} />
      <Wings x={500 + Math.sin(t * 2) * 30} y={fy - 40} s={0.9} t={t} op={since(u, sd, 0.3)} />
      <div style={{ transform: "scaleX(-1)", position: "absolute", inset: 0 }}><Wings x={W - 600 - Math.sin(t * 2) * 30} y={fy - 40} s={0.9} t={t} op={since(u, sd, 0.3)} /></div>
    </div>
  </>); };

// 8. the cave: she sleeps; he looks only at her reflection in the shield
sc[8] = (t, u) => (<>
  <Bg src="bg_cave" u={u} blur={6} bright={0.7} />
  <FX t={t} kind="spores" />
  <Shield src="gorgon_sleep" x={540} y={1290} d={660} t={t} rot={Math.sin(t * 0.8) * 0.03} />
  <Cut src="perseus_focus" x={lerp(-200, 260, since(u, 0, 1.2))} y={1000} w={700} rot={0.05} />
  <Vignette a={0.7} />
</>);

// 9. one swing: he lunges, a blade flash, then Pegasus bursts up out of the light
sc[9] = (t, u) => { const sw = rel(9, "swing") - 0.05, pg = rel(9, "pegasus") - 0.9;
  const fl = since(u, sw, 0.08) * (1 - since(u, sw + 0.15, 0.6)), rise = since(u, pg, 1.4);
  const arcA = clamp01((u - sw + 0.05) / 0.2);
  return (<>
    <AbsoluteFill style={{ background: "#050807" }} />
    <Bg src="bg_cave" u={u} blur={14} bright={0.35} />
    {u < sw + 0.25 && <Body src="fb_perseus_swing" x={lerp(380, 560, since(u, 0, sw))} y={1850} h={1350} t={t} act={{ bend: lerp(-0.12, 0.2, arcA), lean: lerp(-0.03, 0.06, arcA), sq: 0.04 * arcA }} />}
    {arcA > 0 && arcA < 1 && <svg width={W} height={H} style={{ position: "absolute" }}><path d={`M100,700 Q540,${300 + arcA * 400} ${100 + 900 * arcA},${1300}`} stroke="white" strokeWidth={50 * (1 - arcA) + 6} fill="none" opacity={1 - arcA} style={{ filter: "drop-shadow(0 0 30px white)" }} /></svg>}
    {rise > 0 && <>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${lerp(80, 45, rise)}%, rgba(255,252,235,${0.8 * rise}) 0%, rgba(0,0,0,0) 55%)` }} />
      <Cut src="pegasus" x={540 + Math.sin(t * 2) * 30} y={lerp(2300, 1350, rise)} w={980 * lerp(0.7, 1, rise)} sy={1 + Math.sin(t * 9) * 0.03} rot={Math.sin(t * 4.5) * 0.04} glow="rgba(255,255,240,0.9)" />
    </>}
    <FX t={t} kind="dust" flash={fl} speed={rise * 0.7} />
  </>); };

// 10. the court: the king sees the head, and he and the whole hall turn to stone
sc[10] = (t, u) => { const hd = rel(10, "held") - 0.3, st = rel(10, "stone") - 0.25, lvl = since(u, st, 0.9);
  const stone = lvl > 0 ? `grayscale(${lvl}) brightness(${1 - 0.15 * lvl}) contrast(${1 + 0.2 * lvl})` : "";
  const shake = u > st ? Math.sin(t * 60) * 14 * Math.exp(-(u - st) * 3) : 0;
  const tt = u > st + 0.9 ? SHOTS[10].a + st + 0.9 : t;
  return (<>
    <div style={{ position: "absolute", inset: 0, filter: stone || undefined }}>
      <Bg src="bg_throne" u={Math.min(u, st + 0.9)} blur={5} bright={0.8} />
      {u < hd ? <Body src="fb_king" x={540 + shake} y={1820} h={1300} t={tt} act={{ bend: 0.04 }} />
        : <Cut src="king_shock" x={540 + shake} y={H + 40} w={1000} sx={pop(u, hd, 0.3)} sy={pop(u, hd, 0.3)} rot={lvl < 1 ? Math.sin(tt * 3) * 0.03 : 0} />}
    </div>
    <FX t={t} kind="embers" />
    {u > hd && <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 100%, rgba(150,255,110,${0.5 * since(u, hd, 0.5) * (1 - 0.6 * lvl)}) 0%, rgba(0,0,0,0) 60%)` }} />}
    <FX t={t} kind="none" flash={Math.max(0, 1 - Math.abs(u - st) * 6) * 0.5} flashCol="200,255,180" />
  </>); };

// 11. Athena sets the face on her shield forever
sc[11] = (t, u) => (<>
  <Bg src="bg_olympus" u={u} blur={4} />
  <FX t={t} kind="dust" beams={0.7} />
  <Body src="fb_athena_shield" x={lerp(560, 330, since(u, 0.3, 0.8))} y={1850} h={1300} t={t} act={{ bend: 0.04 }} />
  <Shield src="gorgon_stare" relief x={lerp(1300, 760, since(u, 0.3, 0.8))} y={1100} d={lerp(520, 620, clamp01(u / 4))} t={t} rot={Math.sin(t * 1.2) * 0.04} />
</>);

// 12. a survivor: at peace by the sea at sunset
sc[12] = (t, u) => { const sv = rel(12, "survivor") - 0.3;
  return (<>
    <Bg src="bg_sea" u={u} blur={5} z0={1.2} z1={1.28} dx={60} tint="linear-gradient(to bottom, rgba(255,120,40,0.35), rgba(120,30,80,0.35))" />
    <FX t={t} kind="spray" />
    <Body src="fb_gorgon" x={540} y={1900} h={lerp(1500, 1580, clamp01(u / 4))} t={t} filter={`brightness(${0.9 + 0.2 * since(u, sv, 0.6)}) sepia(0.15)`} glow={u > sv ? "rgba(255,200,140,0.7)" : undefined} act={{ breathe: 1.5 }} />
  </>); };

// 13. villain or victim: her stare fills the frame; the title
sc[13] = (t, u) => { const vt = rel(13, "victim") - 0.2, end = LINES[13].end - SHOTS[13].a + 0.1;
  return (<>
    <AbsoluteFill style={{ background: "#061010" }} />
    <Bg src="bg_curse" u={u} blur={14} bright={0.4} />
    <Cut src="gorgon_stare" x={540} y={lerp(H + 80, H + 300, clamp01(u / 5))} w={lerp(1050, 1350, clamp01(u / 5))} glow={u > vt ? "rgba(150,255,110,0.9)" : undefined} />
    <FX t={t} kind="spores" />
    <AbsoluteFill style={{ background: `rgba(2,6,6,${0.65 * since(u, end, 0.6)})` }} />
    <Title text="MEDUSA" a={since(u, end, 0.5)} />
  </>); };

// ---------------------------------------------------------------- camera + whip cuts
const HITS: [number, string, number, number][] = [
  [0, "monster", 0.05, 0], [1, "poseidon", 0.06, 8], [1, "attacked", 0.1, 14], [2, "furious", 0.08, 10], [2, "medusa", 0.08, 0],
  [3, "snakes", 0.12, 0], [3, "stone", 0.1, 0], [5, "head", 0.06, 0], [5, "lowkey", 0.08, 10], [6, "back", 0.05, 0],
  [7, "invisible", 0.08, 0], [8, "reflection", 0.08, 0], [9, "swing", 0.16, 24], [9, "pegasus", 0.08, 10], [10, "stone", 0.12, 0], [13, "victim", 0.1, 0],
];
const HIT_T = HITS.map(([l, w, z, sh]) => ({ l, t: wt(l, w), z, sh }));
function camera(k: number, t: number, u: number) {
  const snap = 1 - smooth(u / 0.45);
  let z = 1.02 + 0.1 * snap + 0.01 * u, sx = 0, sy = 0; const rot = (k % 2 ? 1 : -1) * 0.015 * snap;
  for (const h of HIT_T) { if (h.l !== k) continue; const d = t - h.t + 0.05; if (d < 0 || d > 1.2) continue; const e = Math.exp(-d * 4.5);
    z += h.z * (d < 0.08 ? d / 0.08 : 1) * e; if (h.sh) { const a = h.sh * Math.exp(-d * 7); sx += Math.sin(d * 70) * a; sy += Math.cos(d * 53) * a * 0.7; } }
  return { z, sx: sx + Math.sin(t * 0.7 + k) * 5, sy: sy + Math.cos(t * 0.5 + k) * 4, rot };
}
const Shot: React.FC<{ k: number; t: number; dx?: number; blur?: number }> = ({ k, t, dx = 0, blur = 0 }) => {
  const u = t - SHOTS[k].a, c = camera(k, t, u);
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `translateX(${dx}px)`, filter: blur ? `blur(${blur}px)` : undefined }}>
      <AbsoluteFill style={{ transform: `translate(${c.sx}px, ${c.sy}px) rotate(${c.rot}rad) scale(${c.z})` }}>{sc[k](t, u)}</AbsoluteFill>
    </AbsoluteFill>
  );
};
const XF = 0.22;
export const Medusa2: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const on = { subs: true, audio: true, ...((getInputProps() as { post?: { subs?: boolean; audio?: boolean } }).post ?? {}) };
  const i = SHOTS.findIndex((s) => t >= s.a && t < s.b); const k = i < 0 ? SHOTS.length - 1 : i; const u = t - SHOTS[k].a;
  const whip = k > 0 && u < XF; const e = smooth(u / XF), dir = k % 2 ? 1 : -1, bl = Math.sin(Math.PI * e) * 18;
  return (
    <AbsoluteFill style={{ background: "#050808" }}>
      {whip ? (<>
        <Shot k={k - 1} t={t} dx={-dir * W * e} blur={bl} />
        <Shot k={k} t={t} dx={dir * W * (1 - e)} blur={bl} />
      </>) : <Shot k={k} t={t} />}
      <Vignette a={0.45} />
      {on.subs && <Subtitles words={WORDS} style={subStyle} />}
      {withAudio && on.audio && <Audio src={staticFile("medusa/mix.wav")} />}
    </AbsoluteFill>
  );
};
