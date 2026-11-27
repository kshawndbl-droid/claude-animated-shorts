// "Corporal Wojtek" in style C. Scenes are pure functions of the global time T (seconds into the 83.2 s narration,
// stories/wojtek/final/lines.json). Only the style test shots exist so far (lines 4-5, 24.0 - 33.9 s).
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { useSubtitleFont } from "../../src/subtitles/Subtitles";
import { soldier, bear, place, at, PIOTR, INK, lerp, clamp01, ease, backOut } from "./rig";

export const FPS = 30;
export const WOJ_TOTAL = Math.round(84 * FPS);
const f = (n: number) => n.toFixed(1);
const ramp = (T: number, a: number, d: number) => clamp01((T - a) / d);
const blinkAt = (T: number, seed: number) => { const p = (T + seed * 1.37) % 3.4; return p < 0.12 ? 1 : 0; };

// ------------------------------------------------------------------ flat desert-camp background (Iran, 1942)
const camp = (camX: number, zoom: number, horizon: number) => {
  const px = (k: number) => -camX * k;
  let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3c98c"/><stop offset="0.7" stop-color="#fae3b6"/><stop offset="1" stop-color="#fdf0d2"/></linearGradient></defs>`;
  s += `<rect x="-400" y="-400" width="1880" height="${horizon + 400}" fill="url(#sky)"/>`;
  s += `<circle cx="${f(760 + px(0.05))}" cy="${f(horizon - 520)}" r="96" fill="#fff4d6"/><circle cx="${f(760 + px(0.05))}" cy="${f(horizon - 520)}" r="128" fill="#fff4d6" opacity="0.35"/>`;
  // flat clouds drifting slowly, and a pair of birds
  const cl = (x: number, y: number, w: number) => `<g transform="translate(${f(x)},${f(y)})"><path d="M${-w},0 Q${-w},${-w * 0.35} ${-w * 0.55},${-w * 0.35} Q${-w * 0.4},${-w * 0.75} ${-w * 0.02},${-w * 0.62} Q${w * 0.3},${-w * 0.95} ${w * 0.6},${-w * 0.45} Q${w},${-w * 0.45} ${w},0 Z" fill="#fff7e6" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M${-w * 0.8},${-w * 0.12} H${w * 0.75}" stroke="#f0dcb8" stroke-width="10" stroke-linecap="round"/></g>`;
  s += cl(150 + px(0.08), horizon - 860, 120) + cl(820 + px(0.06), horizon - 700, 150) + cl(470 + px(0.1), horizon - 1020, 90);
  [[300, horizon - 620], [350, horizon - 660]].forEach(([x, y]) => (s += `<path d="M${x + px(0.2) - 18},${y} q9,-10 18,0 q9,-10 18,0" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`));
  // far mountains with snow caps
  const mx = px(0.12);
  s += `<path d="M${-400 + mx},${horizon} L${-120 + mx},${horizon - 300} L${60 + mx},${horizon - 200} L${300 + mx},${horizon - 420} L${520 + mx},${horizon - 230} L${720 + mx},${horizon - 360} L${980 + mx},${horizon - 180} L${1200 + mx},${horizon - 330} L${1500 + mx},${horizon} Z" fill="#c7a39b" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  s += `<path d="M${250 + mx},${horizon - 355} L${300 + mx},${horizon - 420} L${360 + mx},${horizon - 332} L${330 + mx},${horizon - 345} L${300 + mx},${horizon - 320} Z M${670 + mx},${horizon - 305} L${720 + mx},${horizon - 360} L${780 + mx},${horizon - 300} L${740 + mx},${horizon - 312} Z" fill="#f6efe6" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  // mid hills
  const hx = px(0.3);
  s += `<path d="M${-400 + hx},${horizon + 10} Q${-100 + hx},${horizon - 150} ${250 + hx},${horizon - 60} Q${560 + hx},${horizon - 170} ${900 + hx},${horizon - 70} Q${1200 + hx},${horizon - 140} ${1500 + hx},${horizon + 10} Z" fill="#e1b779" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  // ground
  s += `<rect x="-400" y="${horizon}" width="1880" height="1400" fill="#ebcf98"/><path d="M-400,${horizon} H1480" stroke="${INK}" stroke-width="5"/>`;
  // tents (ridge tents) in a row on the far ground
  const tx = px(0.55);
  [[-140, 0.8], [120, 0.95], [880, 0.85], [1160, 0.75]].forEach(([x, k], i) => {
    const X = x + tx, Y = horizon + 70 * k, w = 200 * k, h = 150 * k;
    s += `<path d="M${f(X - w)},${f(Y)} L${f(X - w * 0.6)},${f(Y - h)} L${f(X + w * 0.75)},${f(Y - h)} L${f(X + w)},${f(Y)} Z" fill="#b9a26c" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    s += `<path d="M${f(X - w)},${f(Y)} L${f(X - w * 0.6)},${f(Y - h)} L${f(X - w * 0.2)},${f(Y)} Z" fill="#9d8755" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M${f(X - w * 0.6)},${f(Y)} L${f(X - w * 0.6)},${f(Y - h * 0.55)} L${f(X - w * 0.42)},${f(Y)} Z" fill="#5f4e30"/>`;
    s += `<path d="M${f(X + w * 0.75)},${f(Y - h)} L${f(X + w * 1.25)},${f(Y)} M${f(X - w * 0.6)},${f(Y - h)} L${f(X - w * 1.2)},${f(Y)}" stroke="#6d5a3a" stroke-width="2.5"/>`;
    if (i === 1) s += `<path d="M${f(X + w * 0.1)},${f(Y - h)} V${f(Y - h - 120)}" stroke="${INK}" stroke-width="5"/><path d="M${f(X + w * 0.1)},${f(Y - h - 120)} h70 v22 h-70 Z" fill="#f6f2ea" stroke="${INK}" stroke-width="4"/><path d="M${f(X + w * 0.1)},${f(Y - h - 98)} h70 v22 h-70 Z" fill="#d8303f" stroke="${INK}" stroke-width="4"/>`;
  });
  // near ground marks: tufts and stones
  const gx = px(1);
  [[60, 120], [420, 240], [820, 160], [980, 330], [240, 420]].forEach(([x, y]) => {
    s += `<path d="M${x + gx - 14},${horizon + y} q6,-22 10,0 q4,-26 9,0 q6,-18 10,0" fill="none" stroke="#a88a52" stroke-width="5" stroke-linecap="round"/>`;
  });
  return `<g transform="translate(540,${horizon}) scale(${f(zoom)}) translate(-540,${-horizon})">${s}</g>`;
};
const crate = (x: number, y: number, w: number, h: number) =>
  `<rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" rx="4" fill="#ad8049" stroke="${INK}" stroke-width="6"/>` +
  `<path d="M${f(x - w / 2)},${f(y - h * 0.5)} H${f(x + w / 2)} M${f(x - w / 2 + 8)},${f(y - h + 8)} L${f(x + w / 2 - 8)},${f(y - 8)}" stroke="#7d5a30" stroke-width="7"/>` +
  `<text x="${f(x)}" y="${f(y - h * 0.62)}" text-anchor="middle" font-family="SubFont" font-weight="800" font-size="${f(h * 0.17)}" fill="#5b3f1f" opacity="0.8">MILK</text>`;
const puff = (x: number, y: number, k: number, s = 1) => {
  if (k <= 0 || k >= 1) return "";
  return [[-1, 0.2], [1, 0.1], [-0.4, -0.3], [0.5, -0.25]].map(([dx, dy], i) => {
    const r = (30 + 55 * ease(k)) * s * (1 - i * 0.1);
    return `<circle cx="${f(x + dx * 70 * s * ease(k))}" cy="${f(y + dy * 50 * s * ease(k))}" r="${f(r)}" fill="#f6e7c6" opacity="${f(0.85 * (1 - k))}"/>`;
  }).join("");
};

// ------------------------------------------------------------------ shots
type Shot = (T: number, a: number, b: number) => string;

/** line 4: "They name him Wojtek, and feed him condensed milk from an old vodka bottle." */
const S_Feed: Shot = (T, a, b) => {
  const t = T - a, push = ease(t / (b - a));
  const G = 1650, cs = 2.3, ss = 2.3, CH = 190;
  let s = camp(20 * push, 1 + 0.05 * push, 1100);
  // the name sign pops up on "Wojtek", above and behind the cub
  const sk = backOut(ramp(T, 24.25, 0.35)), sx = 830, sy = G - 360;
  if (sk > 0) s += `<g transform="translate(${sx},${sy}) scale(${f(sk)}) rotate(-4)"><rect x="-12" y="-420" width="24" height="420" fill="#8a6235" stroke="${INK}" stroke-width="6"/><rect x="-200" y="-560" width="400" height="150" rx="12" fill="#c49058" stroke="${INK}" stroke-width="7"/><path d="M-188,-486 H188" stroke="#a87540" stroke-width="5"/><text x="0" y="-452" text-anchor="middle" font-family="SubFont" font-weight="800" font-size="96" fill="#fdf6e6" stroke="${INK}" stroke-width="4" paint-order="stroke">WOJTEK</text></g>`;
  // the cub sits facing the soldier and sucks the bottle: cheeks pulse, ears wiggle
  const suck = 0.5 + 0.5 * Math.sin(T * 14), cx = 780;
  const cub = bear({ age: 0.12, sit: true, expr: "happy", cheeks: T > 25.4 ? suck : 0, ears: T > 25.4 ? Math.sin(T * 7) : 0, lean: -4 + 2 * Math.sin(T * 7), armF: [25, 30], armB: [10, 20], headTilt: 4 });
  s += place(cub.svg, cx, G, cs, true, 60);
  const mouth = at(cub.mouth, cx, G, cs, true);
  // the soldier sits on a crate; his hand puts the bottle tip at the cub's mouth from 25.4 s
  const X = 290, hd = 62, L = 78;
  const feed = ease(ramp(T, 25.2, 0.45));
  const tipL: [number, number] = [(mouth[0] - X) / ss, (mouth[1] - G) / ss];
  const hand: [number, number] = [lerp(60, tipL[0] - Math.sin(hd * Math.PI / 180) * L, feed), lerp(-150 - CH / ss, tipL[1] - Math.cos(hd * Math.PI / 180) * L, feed) + 2 * Math.sin(T * 14) * feed];
  s += crate(X - 30, G, 260, CH);
  const sol = soldier(PIOTR, { expr: T < 25.3 ? "smile" : "happy", hipY: -CH / ss + 8, hipX: -6, footB: [52, -24], footF: [84, -24], lean: 4 * feed, headTilt: 3 + 2 * Math.sin(T * 2),
    reachF: hand, hold: "bottle", holdDeg: lerp(150, hd, feed), armB: [-10, 40], blink: blinkAt(T, 1), talk: 0 });
  s += place(sol.svg, X, G, ss, false, 0);
  return s;
};

/** line 5: "He grows. And grows. He learns to wrestle the soldiers, and to salute." */
const S_Grow: Shot = (T) => {
  const G = 1690, sc = 1.9;
  const g1 = backOut(ramp(T, 29.15, 0.3)), g2 = backOut(ramp(T, 29.78, 0.32));
  const age = 0.22 + 0.36 * g1 + 0.42 * g2;
  const shake = (k: number) => (k > 0 && k < 1 ? Math.sin(k * 60) * 14 * (1 - k) : 0);
  const sh = shake(ramp(T, 29.15, 0.35)) + shake(ramp(T, 29.78, 0.4));
  // wrestle 30.46 - 31.98: both hop in and grapple, swaying; salute from 32.06: hop apart, salute
  const inK = ease(ramp(T, 30.4, 0.3)), outK = ease(ramp(T, 31.95, 0.3));
  const close = inK * (1 - outK), sway = close * Math.sin((T - 30.6) * 9);
  const hop = (k: number) => Math.sin(Math.PI * clamp01(k)) * 50;
  const bx = 800 - 110 * close + 10 * outK, sx = 250 + 80 * close - 10 * outK;
  const by = G - hop(ramp(T, 30.4, 0.3)) - hop(ramp(T, 31.95, 0.3)), sy = G - hop(ramp(T, 30.45, 0.3)) - hop(ramp(T, 31.95, 0.3));
  const sal = backOut(ramp(T, 32.25, 0.3)), salS = backOut(ramp(T, 32.45, 0.3));
  const zoom = 1 + 0.05 * ease(ramp(T, 28.9, 5));
  let s = `<g transform="translate(${f(sh)},0)">` + camp(-30 + 30 * ease(ramp(T, 28.9, 5)), zoom, 1150);
  s += crate(80, G - 330, 180, 130);
  // grapple targets (scene -> each rig's local space): the soldier pushes the bear's belly, the bear grabs his shoulders
  const toS = (q: [number, number]): [number, number] => [(q[0] - sx) / sc, (q[1] - sy) / sc];
  const toB = (q: [number, number]): [number, number] => [-(q[0] - bx) / sc, (q[1] - by) / sc];
  const belly: [number, number] = [bx - 20 * sc, by - 220 * sc], sShF: [number, number] = [sx + 44 * sc, sy - 300 * sc], sShB: [number, number] = [sx - 30 * sc, sy - 312 * sc];
  const B = bear({ age, expr: T < 29.75 ? "smile" : close > 0.3 ? "happy" : sal > 0.2 ? "proud" : "happy", lean: close > 0 ? 7 * close + 5 * sway : -3 * (1 - age),
    armF: close > 0.05 ? undefined : sal > 0 ? undefined : [18 + 4 * Math.sin(T * 3), 18],
    reachF: close > 0.05 ? toB(sShF) : sal > 0 ? [lerp(140, 104, sal), lerp(-200, -458, sal)] : undefined,
    reachB: close > 0.05 ? toB(sShB) : undefined, armB: [6, 14], blink: blinkAt(T, 2), ears: close * Math.sin(T * 12) });
  const S = soldier(PIOTR, { expr: T < 29.8 ? "smile" : T < 30.45 ? "shock" : close > 0.3 ? "grit" : salS > 0.2 ? "proud" : "worried",
    lean: (T > 29.8 && T < 30.45 ? -7 : 0) + (close > 0 ? 6 * close - 5 * sway : 0), look: T < 29.8 ? 1 : 0,
    armF: close > 0.05 || salS > 0 ? undefined : [12, 14], reachF: close > 0.05 ? toS([belly[0], belly[1]]) : salS > 0 ? [lerp(60, 66, salS), lerp(-160, -444, salS)] : undefined,
    reachB: close > 0.05 ? toS([belly[0] + 10, belly[1] + 60 * sc]) : undefined, armB: [-12, 10], blink: blinkAt(T, 3), headTilt: T > 29.8 && T < 30.45 ? -6 : 0 });
  s += place(B.svg, bx, by, sc, true, lerp(40, 85, age)) + place(S.svg, sx, sy, sc, false, 60);
  s += puff(800, G - 20, ramp(T, 29.15, 0.55), 1.1) + puff(800, G - 20, ramp(T, 29.78, 0.65), 1.6);
  if (close > 0.5) s += puff((sx + bx) / 2, G - 10, ((T - 30.7) % 0.5) / 0.5, 0.7);
  return s + "</g>";
};

const SHOTS: [number, Shot][] = [[24.0, S_Feed], [28.85, S_Grow]];
const END_TEST = 33.9;

export const Wojtek: React.FC<{ withAudio?: boolean }> = ({ withAudio = false }) => {
  useSubtitleFont();
  const T = useCurrentFrame() / FPS;
  let k = SHOTS.findIndex(([s0], i) => T >= s0 && T < (SHOTS[i + 1]?.[0] ?? 1e9));
  if (k < 0) k = 0;
  const [a, S] = SHOTS[k], b = SHOTS[k + 1]?.[0] ?? END_TEST;
  const svg = S(T, a, b);
  const cut = SHOTS.slice(1).reduce((m, [c]) => Math.min(m, Math.abs(T - c) * FPS), 99);
  return (
    <AbsoluteFill style={{ background: "#fae3b6" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" dangerouslySetInnerHTML={{ __html: svg }} />
      {cut < 2 && <AbsoluteFill style={{ background: "#fff", opacity: 0.25 * (2 - cut) / 2 }} />}
      {withAudio && <Audio src={staticFile("wojtek/voice.wav")} />}
    </AbsoluteFill>
  );
};
