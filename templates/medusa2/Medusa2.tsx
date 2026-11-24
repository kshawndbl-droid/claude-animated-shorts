// "Medusa" v2: bold-outline cartoon characters (generated with a free open model, then cut out) animated as cut-out
// puppets and expressive close-ups over busy, painted, slightly blurred backgrounds. Lots of camera energy.
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

type Pose = { lean?: number; aL?: [number, number]; aR?: [number, number]; walk?: number; hop?: number; tilt?: number };
/** a cut-out puppet: a big generated head-and-shoulders on a small drawn body with jointed arms and legs */
const Puppet: React.FC<{ head: string; x: number; y: number; s: number; robe: string; skin: string; pose: Pose; flip?: boolean; op?: number; filter?: string; feetWings?: number; t: number; glow?: string }> = ({ head, x, y, s, robe, skin, pose, flip, op = 1, filter = "", feetWings = 0, t, glow }) => {
  const lean = pose.lean ?? 0, walk = pose.walk ?? 0, hop = pose.hop ?? 0;
  const ph = walk ? Math.sin(t * 9) : 0, bob = walk ? Math.abs(Math.cos(t * 9)) * 10 : 0;
  const arm = (side: number, [sh, el]: [number, number]) => {
    const ax = side * 92, ay = -300; const a1 = (side * sh) - side * 0.15, x1 = ax + Math.sin(a1) * 90, y1 = ay + Math.cos(a1) * 90;
    const a2 = a1 + side * el, x2 = x1 + Math.sin(a2) * 80, y2 = y1 + Math.cos(a2) * 80;
    return (
      <g key={side}>
        <path d={`M${ax},${ay} L${x1},${y1} L${x2},${y2}`} stroke="#111" strokeWidth={46} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${ax},${ay} L${x1},${y1} L${x2},${y2}`} stroke={robe} strokeWidth={32} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x2} cy={y2} r={22} fill={skin} stroke="#111" strokeWidth={7} />
      </g>
    );
  };
  const leg = (side: number) => { const sw = ph * side * 0.45; const fx = side * 36 + Math.sin(sw) * 70, fy = -Math.max(0, Math.cos(sw)) * 4;
    return (<g key={"l" + side}>
      <path d={`M${side * 36},-150 L${fx},${fy - 14}`} stroke="#111" strokeWidth={40} strokeLinecap="round" /><path d={`M${side * 36},-150 L${fx},${fy - 14}`} stroke={skin} strokeWidth={26} strokeLinecap="round" />
      <ellipse cx={fx + 14} cy={fy - 6} rx={34} ry={14} fill="#6a4426" stroke="#111" strokeWidth={7} />
      {feetWings > 0 && [0, 1, 2].map((k) => <path key={k} d={`M${fx - 20},${fy - 20} q-50,${-30 - k * 18 + Math.sin(t * 22) * 14} -80,${-10 - k * 22}`} stroke="#111" strokeWidth={4} fill="#fff" opacity={feetWings} />)}
    </g>); };
  return (
    <div style={{ position: "absolute", left: x, top: y - hop - bob, transform: `scale(${flip ? -s : s}, ${s}) rotate(${lean}rad)`, transformOrigin: "0 0", opacity: op, filter }}>
      <svg width={600} height={700} viewBox="-300 -600 600 700" style={{ position: "absolute", left: -300, top: -600, overflow: "visible" }}>
        {leg(-1)}{leg(1)}
        <path d="M-120,-330 Q-150,-190 -125,-130 L125,-130 Q150,-190 120,-330 Z" fill={robe} stroke="#111" strokeWidth={8} />
        <path d="M-60,-300 Q-70,-200 -50,-140 M40,-310 Q55,-210 45,-140" stroke="rgba(0,0,0,0.25)" strokeWidth={6} fill="none" />
        {arm(-1, pose.aL ?? [0.2, 0.2])}
      </svg>
      <Img src={art(head + "_cut.png")} style={{ position: "absolute", left: -230, top: -890, width: 460, transformOrigin: "50% 92%", transform: `rotate(${pose.tilt ?? 0}rad)`,
        filter: `drop-shadow(5px 0 0 #111) drop-shadow(-5px 0 0 #111) drop-shadow(0 -5px 0 #111)${glow ? ` drop-shadow(0 0 30px ${glow})` : ""}` }} />
      <svg width={600} height={700} viewBox="-300 -600 600 700" style={{ position: "absolute", left: -300, top: -600, overflow: "visible" }}>{arm(1, pose.aR ?? [0.2, 0.2])}</svg>
    </div>
  );
};

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

const TEAL = "#1d6a6c", SKIN = "#f1c8a6", GREEN = "#5f9a4a";

// ---------------------------------------------------------------- scenes (t = global time, u = time in shot)
type Scene = (t: number, u: number) => React.ReactNode;
const sc: Scene[] = [];

// 0. Medusa as a young woman by the sea: she strolls in, then a punch-in on her face at "hair"
sc[0] = (t, u) => { const h = rel(0, "hair") - 0.2, close = u > h;
  return close ? (<>
    <Bg src="bg_sea" u={u} blur={6} z0={1.3} z1={1.36} />
    <Cut src="medusa_smile" x={540 + Math.sin(t * 1.2) * 10} y={H + 40} w={980} rot={Math.sin(t * 1.4) * 0.02} sx={pop(u, h, 0.4)} sy={pop(u, h, 0.4)} />
    <FX t={t} kind="spray" />
  </>) : (<>
    <Bg src="bg_sea" u={u} blur={2} dx={-40} />
    <Puppet head="medusa_smile" x={lerp(-150, 540, since(u, 0, 1.6))} y={1600} s={1.15} robe={TEAL} skin={SKIN} t={t}
      pose={{ walk: u < 1.6 ? 1 : 0, aR: u > 1.7 ? [2.6 + Math.sin(t * 10) * 0.25, 0.4] : [0.3, 0.3], aL: [0.25, 0.3], tilt: Math.sin(t * 2) * 0.05, lean: Math.sin(t * 2) * 0.02 }} />
    <FX t={t} kind="spray" />
  </>); };

// 1. the temple: Poseidon looms in out of the storm; cut to Medusa, terrified
sc[1] = (t, u) => { const pz = rel(1, "poseidon") - 0.3, at = rel(1, "attacked") - 0.15;
  const fl = Math.max(0, 1 - Math.abs(u - pz - 0.1) * 6) * 0.7;
  return u < at ? (<>
    <Bg src="bg_temple" u={u} blur={3} bright={0.8} />
    <Cut src="poseidon" x={lerp(1300, 640, since(u, pz, 0.5))} y={H + 60} w={1150} rot={-0.05 + Math.sin(t * 1.3) * 0.02} filter="brightness(0.85) saturate(1.1)" glow="rgba(60,200,255,0.6)" />
    <FX t={t} kind="spray" flash={fl} flashCol="200,230,255" />
  </>) : (<>
    <Bg src="bg_temple" u={u} blur={8} z0={1.4} bright={0.6} />
    <Cut src="medusa_scared" x={540 - (u - at) * 30 + Math.sin(t * 40) * 6 * Math.exp(-(u - at) * 4)} y={H + 40} w={1000} rot={0.04} sx={pop(u, at, 0.3)} sy={pop(u, at, 0.3)} />
    <AbsoluteFill style={{ background: "rgba(10,40,60,0.25)" }} />
  </>); };

// 2. Athena, furious, stamps and flares; then Medusa in tears at "punished Medusa"
sc[2] = (t, u) => { const pm = rel(2, "medusa") - 0.2;
  return u < pm ? (<>
    <Bg src="bg_olympus" u={u} blur={3} />
    <FX t={t} kind="embers" beams={0.8} />
    <Puppet head="athena_angry" x={540} y={1650} s={1.25} robe="#eeeae0" skin={SKIN} t={t} glow="rgba(255,180,80,0.7)"
      pose={{ hop: Math.abs(Math.sin(t * 6)) * 30 * (u > 0.4 ? 1 : 0), aR: [2.9, 0.2], aL: [1.6 + Math.sin(t * 8) * 0.3, 0.8], tilt: Math.sin(t * 6) * 0.06, lean: Math.sin(t * 3) * 0.04 }} />
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
  <Puppet head="gorgon_sad" x={lerp(300, 700, clamp01(u / 4.5))} y={1700} s={0.8} robe={TEAL} skin="#8fbf74" t={t} pose={{ walk: 1, aL: [0.2, 0.3], aR: [0.15, 0.3], tilt: 0.12 }} />
  <FX t={t} kind="dust" />
  <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(200,210,210,0.45), rgba(0,0,0,0) 35%)" }} />
</>);

// 5. the king sends Perseus; "lowkey, a death sentence"
sc[5] = (t, u) => { const lk = rel(5, "lowkey") - 0.2, pin = rel(5, "perseus") - 0.3;
  return (<>
    <Bg src="bg_throne" u={u} blur={4} />
    <FX t={t} kind="embers" />
    <Puppet head="king_smug" x={300} y={1600} s={1.05} robe="#5a2a6a" skin="#e2b48e" t={t} pose={{ aR: [lerp(0.3, 1.7, since(u, 0.3, 0.4)), 0.05], aL: [0.3, 0.6], tilt: Math.sin(t * 3) * 0.06, hop: Math.abs(Math.sin(t * 5)) * 8 }} />
    <Puppet head={u > lk ? "perseus_shock" : "perseus_brave"} x={lerp(1350, 800, since(u, pin, 0.6))} y={1650} s={1.05} robe="#2a2224" skin="#e8b993" flip t={t}
      pose={{ walk: u < pin + 0.6 && u > pin ? 1 : 0, hop: u > lk ? 60 * Math.exp(-(u - lk) * 6) * Math.abs(Math.sin((u - lk) * 12)) : 0, aL: u > lk ? [2.4, 0.6] : [0.3, 0.3], aR: u > lk ? [2.5, 0.5] : [1.0, 1.4], tilt: u > lk ? -0.1 : 0 }} />
    {u > lk && <AbsoluteFill style={{ background: `rgba(120,0,0,${0.22 * since(u, lk, 0.3)})` }} />}
  </>); };

// 6. gifts of the gods: Hermes swoops down with the blade, Athena brings the shield
sc[6] = (t, u) => { const hm = rel(6, "hermes") - 0.9, at = rel(6, "athena") - 0.6;
  return (<>
    <Bg src="bg_sky" u={u} blur={3} dy={60} />
    <FX t={t} kind="dust" beams={0.9} />
    <Cut src="hermes" x={lerp(300, 330, since(u, hm, 0.6))} y={lerp(-200, 1050, since(u, hm, 0.6)) + Math.sin(t * 3) * 20} w={620} rot={Math.sin(t * 2.4) * 0.05} />
    <Cut src="athena_calm" x={lerp(1400, 780, since(u, at, 0.6))} y={1150 + Math.sin(t * 2.6) * 16} w={620} rot={-0.04} />
    <Puppet head="perseus_brave" x={540} y={1800} s={0.95} robe="#2a2224" skin="#e8b993" t={t} pose={{ aL: [lerp(0.3, 2.6, since(u, hm + 0.5, 0.4)), 0.3], aR: [lerp(0.3, 2.6, since(u, at + 0.5, 0.4)), 0.3], hop: Math.abs(Math.sin(t * 4)) * 10, tilt: Math.sin(t * 2) * 0.05 }} />
  </>); };

// 7. winged sandals lift him into the air; then the helmet of darkness: he vanishes
sc[7] = (t, u) => { const sd = rel(7, "sandals") - 0.3, inv = rel(7, "invisible") - 0.1;
  const lift = since(u, sd + 0.3, 1.2), gone = since(u, inv, 0.6);
  return (<>
    <Bg src="bg_sky" u={u + 5} blur={4} dy={lift * 200} z0={1.25} />
    <FX t={t} kind="dust" speed={lift * (1 - gone) * 0.6} />
    <Puppet head="perseus_brave" x={540 + Math.sin(t * 2) * 30} y={1650 - lift * 500 + Math.sin(t * 3) * 25} s={1.05} robe="#2a2224" skin="#e8b993" t={t} feetWings={since(u, sd, 0.3)}
      op={1 - gone} filter={gone > 0 ? `blur(${gone * 10}px)` : ""} pose={{ aL: [2.2, 0.4], aR: [2.4, 0.3], lean: Math.sin(t * 2) * 0.06, tilt: -0.08 }} />
  </>); };

// 8. the cave: she sleeps; he looks only at her reflection in the shield
const ShieldMirror: React.FC<{ t: number; u: number }> = ({ t }) => (
  <div style={{ position: "absolute", left: 540 - 330, top: 960 - 130, width: 660, height: 660, borderRadius: "50%", border: "26px solid #7a4e1c", boxShadow: "0 0 0 8px #111, inset 0 0 0 8px #111, 0 30px 60px rgba(0,0,0,0.6)", overflow: "hidden", background: "radial-gradient(circle at 35% 30%, #f2cc84, #b07a38 60%, #6a4218)" }}>
    <Img src={art("gorgon_sleep_cut.png")} style={{ position: "absolute", left: 40, top: 30 + Math.sin(t * 1.2) * 6, width: 560, filter: "sepia(0.6) saturate(1.2) brightness(0.9)", opacity: 0.9, transform: "scaleX(-1)" }} />
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${110 + Math.sin(t) * 20}deg, rgba(255,240,200,0) 30%, rgba(255,240,200,0.35) 50%, rgba(255,240,200,0) 70%)` }} />
  </div>
);
sc[8] = (t, u) => (<>
  <Bg src="bg_cave" u={u} blur={6} bright={0.7} />
  <FX t={t} kind="spores" />
  <ShieldMirror t={t} u={u} />
  <Cut src="perseus_focus" x={lerp(-200, 260, since(u, 0, 1.2))} y={1000} w={700} rot={0.05} />
  <Vignette a={0.7} />
</>);

// 9. one swing: blade flash, then Pegasus bursts up out of the light
sc[9] = (t, u) => { const sw = rel(9, "swing") - 0.05, pg = rel(9, "pegasus") - 0.9;
  const fl = since(u, sw, 0.08) * (1 - since(u, sw + 0.15, 0.6)), rise = since(u, pg, 1.4);
  const arcA = clamp01((u - sw + 0.05) / 0.2);
  return (<>
    <AbsoluteFill style={{ background: "#050807" }} />
    <Bg src="bg_cave" u={u} blur={14} bright={0.35} />
    {u < sw + 0.2 && <Cut src="perseus_focus" x={lerp(700, 560, since(u, 0, sw))} y={1400} w={760} rot={lerp(0.1, -0.15, arcA)} />}
    {arcA > 0 && arcA < 1 && <svg width={W} height={H} style={{ position: "absolute" }}><path d={`M100,700 Q540,${300 + arcA * 400} ${100 + 900 * arcA},${1300}`} stroke="white" strokeWidth={50 * (1 - arcA) + 6} fill="none" opacity={1 - arcA} style={{ filter: "drop-shadow(0 0 30px white)" }} /></svg>}
    {rise > 0 && <>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${lerp(80, 45, rise)}%, rgba(255,252,235,${0.8 * rise}) 0%, rgba(0,0,0,0) 55%)` }} />
      <Cut src="pegasus" x={540 + Math.sin(t * 2) * 30} y={lerp(2300, 1250, rise)} w={980 * lerp(0.7, 1, rise)} sy={1 + Math.sin(t * 9) * 0.03} rot={Math.sin(t * 4.5) * 0.04} glow="rgba(255,255,240,0.9)" />
    </>}
    <FX t={t} kind="dust" flash={fl} speed={rise * 0.7} />
  </>); };

// 10. the court: the king and his nobles see the head, and turn to stone
sc[10] = (t, u) => { const hd = rel(10, "held") - 0.3, st = rel(10, "stone") - 0.25, lvl = since(u, st, 0.9);
  const stone = lvl > 0 ? `grayscale(${lvl}) brightness(${1 - 0.15 * lvl}) contrast(${1 + 0.2 * lvl})` : "";
  const shake = u > st ? Math.sin(t * 60) * 14 * Math.exp(-(u - st) * 3) : 0;
  const frozen = u > st + 0.9 ? st + 0.9 : u;
  return (<>
    <Bg src="bg_throne" u={u} blur={6} bright={0.75} />
    <FX t={t} kind="embers" />
    <Cut src="courtier1" x={210 + shake} y={1350} w={520} rot={-0.06 + (lvl < 1 ? Math.sin(frozen * 5) * 0.04 : 0)} filter={stone} />
    <Cut src="courtier2" x={880 - shake} y={1380} w={520} rot={0.05} filter={stone} />
    <Cut src={u > hd ? "king_shock" : "king_smug"} x={540 + shake} y={1500} w={760} sx={u > hd ? pop(u, hd, 0.3) : 1} sy={u > hd ? pop(u, hd, 0.3) : 1} rot={lvl < 1 ? Math.sin(frozen * 3) * 0.04 : 0} filter={stone} />
    {u > hd && <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 100%, rgba(150,255,110,${0.55 * since(u, hd, 0.5)}) 0%, rgba(0,0,0,0) 60%)` }} />}
    <FX t={t} kind="none" flash={Math.max(0, 1 - Math.abs(u - st) * 6) * 0.5} flashCol="200,255,180" />
  </>); };

// 11. Athena sets the face on her shield forever
sc[11] = (t, u) => (<>
  <Bg src="bg_olympus" u={u} blur={4} />
  <FX t={t} kind="dust" beams={0.7} />
  <Puppet head="athena_calm" x={lerp(540, 330, since(u, 0.3, 0.8))} y={1700} s={1.05} robe="#eeeae0" skin={SKIN} t={t} pose={{ aR: [1.4, 0.3], aL: [0.3, 0.4], tilt: Math.sin(t * 1.5) * 0.04 }} />
  <Cut src="shield_face" x={lerp(1300, 760, since(u, 0.3, 0.8))} y={1450} w={lerp(560, 700, clamp01(u / 4))} rot={Math.sin(t * 1.2) * 0.04} glow="rgba(255,210,120,0.6)" />
</>);

// 12. a survivor: at peace by the sea at sunset
sc[12] = (t, u) => { const sv = rel(12, "survivor") - 0.3;
  return (<>
    <Bg src="bg_sunset" u={u} blur={5} z0={1.15} z1={1.25} />
    <FX t={t} kind="spray" />
    <Cut src="gorgon_sad" x={540 + Math.sin(t * 0.8) * 10} y={H + 40} w={lerp(900, 980, clamp01(u / 4))} rot={Math.sin(t * 1.1) * 0.02} filter={`brightness(${1 + 0.15 * since(u, sv, 0.6)})`} glow={u > sv ? "rgba(255,200,140,0.6)" : undefined} />
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
