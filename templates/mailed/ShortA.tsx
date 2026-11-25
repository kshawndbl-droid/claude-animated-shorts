// "The Man Who Mailed Himself" — Film A, "The Crate": the story told from the outside world (sky, airports, handlers),
// daylight palette, bouncy 1960s score. Facts: Reg Spiers, London -> Perth as air freight, 1964 (see stories/mailed-himself).
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { Pose, FIGCFG } from "../eiffel/figure";
import { V3, setCfg, Haze, blinkAt, walker, Motes, Sparkle, clamp01, ramp } from "../eiffel/StyleTest";
import { Subtitles, defaultStyle } from "../../src/subtitles/Subtitles";
import {
  FPS, END, WORDS, W, KEY, hand, sans, useMarkerFont, Cam, at, PlateC, shadowAt, AF, Svg, push, ShotP, handAt,
  REG_A, REG_A_SUIT, REG_A_VEST, JOHN_A, HANDLER1, HANDLER2, HANDLER3, DAUGHTER,
  Crate, Plane, Cloud, Bottle, Pillow, Tin, Torch, Hammer, Javelin, Moth, Bulb, Grawlix, Card, Heat, Sun, Sweat, Cake, Newspaper, RouteMap, CrateInside, INK,
} from "./common";

export const A_FRAMES = Math.round(END * FPS);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// 1. hook: an airliner crossing a sunset sky, London to Australia
const S_Sky: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, u = t / (b - a);
  const px = lerp(-260, 1300, Easing.inOut(Easing.sin)(u)), py = 980 - 120 * u + 14 * Math.sin(T * 1.3);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#3a4a8a, #d87a6a 55%, #ffd08a)" }}>
      <Svg>
        <circle cx={760} cy={1250} r={170} fill="#ffe2a0" opacity={0.9} />
        {[0, 1, 2, 3, 4].map((i) => <Cloud key={i} x={((i * 290 - T * (40 + i * 18)) % 1500 + 1500) % 1500 - 200} y={520 + i * 260} s={1.1 + (i % 2) * 0.5} o={0.92} />)}
        <Plane x={px} y={py} s={1.5} rot={-4} t={T} />
        {[0, 1, 2].map((i) => <Cloud key={`f${i}`} x={((i * 470 - T * 220) % 1700 + 1700) % 1700 - 300} y={1500 + i * 150} s={2.2} />)}
        <Card k={(T - 2.8) / 0.4} text="LONDON → AUSTRALIA" y={380} w={820} />
      </Svg>
    </AbsoluteFill>
  );
};
// 2. ...inside a wooden box: into the cargo hold, the crate, an eye at the knot-hole
const S_HoldHook: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.1, z1: 1.35, cx: 540, cy: 1250 };
  const C = at(540, 1500, t, dur, c);
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_hold.png" t={t} dur={dur} c={c} bright={0.8} />
      <Haze top="rgba(80,110,200,0.12)" vig={0.5} />
      <Svg>
        <g transform={`rotate(${2 * Math.sin(T * 2)},540,1300)`}>
          <Crate x={C.x} y={C.y} w={560 * C.z} h={320 * C.z} shake={0.4} knot={{ blink: blinkAt(T, 3, [W("box") + 0.3]), look: Math.sin(T * 3) }} />
        </g>
      </Svg>
    </AbsoluteFill>
  );
};
// 3. the javelin: Reg's throw falls short in England
const S_Track: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.3, cx: 540, cy: 1600, dx: -60 };
  const rel = W("javelin") + 0.15, wk = walker(T, a, rel, 2.4), s = 1.35;
  const R = at(260 + wk.dist * s * 0.8, 1800, t, dur, c);
  const thrown = T > rel, fk = clamp01((T - rel) / 0.9);
  const jx = R.x + 100 + 700 * fk, jy = R.y - 420 * s * R.z / 1.35 - 380 * Math.sin(Math.PI * fk * 0.9) + 520 * fk * fk;
  const sad = T > W("stuck") - 0.1;
  const rp: Pose = { phase: wk.phase, walk: wk.walk, expr: sad ? "worried" : "stern", facing: 0.7, lean: thrown && !sad ? 10 : 0,
    gesture: sad ? "facepalm" : thrown ? "point" : "tip", gk: sad ? ramp(T, W("stuck") - 0.1, 0.3) : 1, blink: blinkAt(T, 4), lookX: 1 };
  const hp = handAt(R.x, R.y, s * R.z, 160, 110, 1);
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_track.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(200,210,230,0.1)" vig={0.3} />
      <Svg>
        {shadowAt(R.x, R.y, s * R.z)}
        <AF id="rt" look={REG_A} x={R.x} y={R.y} s={s * R.z} pose={rp} shadow={false} />
        {!thrown && <Javelin x={hp.x} y={hp.y} rot={-12} s={0.75 * R.z} />}
        {thrown && <Javelin x={jx} y={jy} rot={-20 + 60 * fk} s={0.75 * R.z} />}
        {fk >= 1 && <Sparkle x={jx + 120} y={jy + 40} k={(T - rel - 0.9) / 0.4} />}
        <Card k={(T - W("england") - 0.1) / 0.35} text="ENGLAND, 1964" y={420} />
      </Svg>
    </AbsoluteFill>
  );
};
// 4. broke, and a birthday coming up back home (thought bubble)
const S_Broke: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const bd = T > W("daughters") - 0.2;
  const pose: Pose = { expr: bd ? "worried" : "neutral", ex: bd ? { mouth: "wobble" } : { mouth: "flat", eyes: "dot" }, facing: 0.1, gesture: bd ? "chin" : "shrug",
    gk: bd ? ramp(T, W("daughters") - 0.2, 0.3) : ramp(T, W("broke") - 0.1, 0.25), blink: blinkAt(T, 5), lookX: bd ? 0.7 : 0, lookY: bd ? -0.6 : 0 };
  const mk = clamp01((T - W("broke") - 0.1) / 1.4);
  const bk = Easing.out(Easing.back(1.6))(clamp01((T - W("daughters") + 0.1) / 0.45));
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_track.png" t={t} dur={dur} c={{ z0: 1.55, z1: 1.65, cx: 540, cy: 1100 }} blur={3.2} bright={0.95} />
      <Haze top="rgba(200,210,230,0.1)" vig={0.36} />
      <Svg>
        <AF id="rb" look={REG_A} x={500} y={1900 + 20 * p} s={3.5 + 0.2 * p} pose={pose} shadow={false} />
        {mk > 0 && mk < 1 && <Moth x={500 + 380 * mk} y={1300 - 700 * mk + 40 * Math.sin(T * 9)} t={T} s={1.6} />}
        {bk > 0 && <g transform={`translate(800,420) scale(${bk})`}>
          {[[-170, 330, 22], [-120, 250, 32]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fffaf0" stroke={INK} strokeWidth={6} />)}
          <ellipse cx={0} cy={0} rx={230} ry={190} fill="#fffaf0" stroke={INK} strokeWidth={8} />
          <Cake x={-40} y={110} s={0.75} t={T} />
          <AF id="dg" look={DAUGHTER} x={120} y={140} s={0.62} pose={{ expr: "happy", facing: -0.4, gesture: "wave", gk: 1, talk: T * 1.3, blink: blinkAt(T, 6) }} flip shadow={false} />
          <text x={-150} y={-100} fontFamily={hand} fontSize={44} fill="#c0303a">ADELAIDE</text>
        </g>}
      </Svg>
    </AbsoluteFill>
  );
};
// 5. his job: the airport cargo shed, crates with labels from all over the world
const S_Shed: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.1, z1: 1.22, cx: 540, cy: 1600, dx: 40 };
  const wk = walker(T, a + 0.1, b + 0.2, 3.2), s = 1.3;
  const R = at(220 + wk.dist * s * 0.75, 1810, t, dur, c);
  const rp: Pose = { phase: wk.phase, walk: wk.walk, expr: "smile", facing: 0.6, hold: "box", blink: blinkAt(T, 7), lookX: 0.6 };
  const tags = ["NEW YORK", "CAIRO", "TOKYO", "SYDNEY"];
  const fl = W("crates") - 0.2;
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_shed.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,230,190,0.08)" vig={0.3} />
      <Svg>
        {tags.map((tg, i) => { const k = clamp01((T - fl - i * 0.25) / 1.4), x = lerp(-200 + i * 40, 1300, k), y = 1500 - i * 140 - 260 * Math.sin(Math.PI * k);
          return T > fl + i * 0.25 && k < 1 ? <g key={i} transform={`translate(${x},${y}) rotate(${-8 + 16 * k})`}><Crate x={0} y={0} w={220} h={130} label={false} arrows={false} />
            <g transform="translate(0,-70)"><rect x={-84} y={-22} width={168} height={40} rx={6} fill="#fbf6ea" stroke={INK} strokeWidth={4} />
            <text x={0} y={10} textAnchor="middle" fontFamily={hand} fontSize={28} fill="#2a2230">{tg}</text></g></g> : null; })}
        {shadowAt(R.x, R.y, s * R.z)}
        <AF id="rs" look={REG_A} x={R.x} y={R.y} s={s * R.z} pose={rp} shadow={false} />
        <Card k={(T - W("cargo") + 0.2) / 0.35} text="AIRPORT CARGO" y={360} />
        <Motes t={T} n={16} seed={3} />
      </Svg>
    </AbsoluteFill>
  );
};
// 6. the idea: Reg eyes up a crate... a very bad, very brilliant idea
const S_Idea: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const bad = T > W("bad") - 0.1, bri = T > W("brilliant") - 0.1;
  const pose: Pose = { expr: bri ? "smug" : bad ? "worried" : "sly", ex: bad && !bri ? { mouth: "frown" } : {}, facing: 0.35, gesture: bri ? "rub" : "chin", gk: 1,
    blink: blinkAt(T, 8), lookX: bri ? 0 : 1, lookY: bri ? 0 : 0.4, wink: T > W("idea") + 0.1 && T < W("idea") + 0.5 };
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_shed.png" t={t} dur={dur} c={{ z0: 1.5, z1: 1.62, cx: 760, cy: 1300 }} blur={3.4} bright={0.95} />
      <Haze top="rgba(255,230,190,0.08)" vig={0.36} />
      <Svg>
        <Crate x={930} y={1800} w={520} h={300} />
        <AF id="ri" look={REG_A} x={430} y={1900 + 20 * p} s={3.4 + 0.25 * p} pose={pose} shadow={false} />
        <Bulb x={430} y={420} k={(T - W("brilliant") + 0.15) / 0.6} s={1.1} />
      </Svg>
    </AbsoluteFill>
  );
};
// 7a. after hours: John builds the box, plank by plank, Reg watching
const S_Build: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.28, cx: 560, cy: 1620 };
  const J = at(780, 1800, t, dur, c), R = at(250, 1800, t, dur, c), s = 1.3, C = at(500, 1830, t, dur, c);
  const hk = 0.5 + 0.5 * Math.sin(T * 14);
  const jp: Pose = { expr: "stern", facing: -0.5, gesture: "point", gk: 0.35 + 0.65 * hk, blink: blinkAt(T, 9), lookX: -1, lookY: 0.6 };
  const ang = lerp(6, 120, 0.35 + 0.65 * hk), el = lerp(12, -10, 0.35 + 0.65 * hk);
  const hp = handAt(J.x, J.y, s * J.z, ang, el, 1, true);
  const planks = Math.min(4, Math.floor(clamp01((T - W("built")) / 1.0) * 5));
  const straps = T > W("straps") - 0.1;
  const rp: Pose = { expr: straps ? "happy" : "smile", facing: 0.5, gesture: straps ? "rub" : "hips", gk: 1, blink: blinkAt(T, 10), lookX: 1, lookY: 0.4 };
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_shed.png" t={t} dur={dur} c={c} bright={0.72} />
      <Haze top="rgba(255,200,140,0.12)" vig={0.48} />
      <Svg>
        <g transform={`translate(${C.x},${C.y})`}>
          {Array.from({ length: planks }, (_, i) => <rect key={i} x={-190 * C.z} y={(-60 - i * 50) * C.z} width={380 * C.z} height={46 * C.z} rx={5} fill="#c9955a" stroke={INK} strokeWidth={6} />)}
          {straps && [-90, 90].map((x) => <path key={x} d={`M${x * C.z},${-250 * C.z} v${240 * C.z}`} stroke="#5a3a22" strokeWidth={14} opacity={clamp01((T - W("straps")) / 0.3)} />)}
        </g>
        {shadowAt(J.x, J.y, s * J.z)}{shadowAt(R.x, R.y, s * R.z)}
        <AF id="jb" look={JOHN_A} x={J.x} y={J.y} s={s * J.z} flip pose={jp} shadow={false} />
        <Hammer x={hp.x} y={hp.y} s={0.85 * J.z} rot={-ang - el + 180 + 60} />
        {hk > 0.92 && <Sparkle x={hp.x - 60} y={hp.y + 60} k={0.5} />}
        <AF id="rw" look={REG_A} x={R.x} y={R.y} s={s * R.z} pose={rp} shadow={false} />
        <Card k={(T - W("john") + 0.1) / 0.35} text="JOHN, A FRIEND" y={380} />
      </Svg>
    </AbsoluteFill>
  );
};
// 7b. a lid that opens from within: Reg pops out like a jack-in-the-box
const S_Lid: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const op = clamp01((T - W("opened") + 0.15) / 0.35), up = Easing.out(Easing.back(2.2))(op);
  const pose: Pose = { expr: "happy", facing: 0.2, gesture: "wave", gk: 1, talk: T, blink: blinkAt(T, 11) };
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_shed.png" t={t} dur={dur} c={{ z0: 1.45, z1: 1.55, cx: 540, cy: 1400 }} blur={3} bright={0.75} />
      <Haze top="rgba(255,200,140,0.12)" vig={0.45} />
      <Svg>
        <defs><clipPath id="lidclip"><rect x={0} y={0} width={1080} height={1335} /></clipPath></defs>
        <g clipPath="url(#lidclip)">
          <AF id="rl" look={REG_A} x={540} y={1950 - 480 * up} s={2.6} pose={pose} shadow={false} />
        </g>
        <Crate x={540} y={1860 + 10 * p} w={900} h={520} lid={op} />
        <Sparkle x={820} y={1200} k={(T - W("opened")) / 0.45} />
      </Svg>
    </AbsoluteFill>
  );
};
// 8. packing: pillow, torch, tinned food, two bottles (one for water, one for... not water)
const S_Pack: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const drop = (w: string, n = 0) => Easing.out(Easing.bounce)(clamp01((T - W(w, n) + 0.05) / 0.45));
  const nw = T > W("not") - 0.1;
  const pose: Pose = { expr: nw ? "sly" : "smile", ex: nw ? { mouth: "smirk" } : {}, facing: 0.05, gesture: nw ? "shrug" : "rub", gk: 1, blink: blinkAt(T, 12),
    lookX: nw ? 0 : 0.8, lookY: nw ? 0 : 0.6, wink: T > W("water", 1) && T < W("water", 1) + 0.45 };
  return (
    <CrateInside t={T}>
      <Svg>
        <g transform={`translate(540,960) scale(${1 + 0.05 * p}) translate(-540,-960)`}>
          <Pillow x={300} y={1000 - 600 * (1 - drop("pillow"))} s={1.6} rot={-8} />
          <AF id="rp" look={REG_A} x={560} y={1790} s={3.0} pose={pose} shadow={false} />
          <Torch x={190} y={1660 - 900 * (1 - drop("torch"))} s={1.3} rot={-20} on={drop("torch") > 0.9} />
          <Tin x={860} y={1830 - 900 * (1 - drop("tinned"))} s={1.6} rot={6} />
          <Tin x={980} y={1830 - 900 * (1 - drop("tinned"))} s={1.6} rot={-4} />
          <Bottle x={140} y={1880 - 1000 * (1 - drop("bottles"))} s={1.5} label="WATER" />
          <Bottle x={950} y={1600 - 1000 * (1 - drop("bottles"))} s={1.4} label={nw ? "NOT WATER" : "???"} col="#e8d070" rot={4} />
        </g>
        <Sparkle x={980} y={1260} k={(T - W("not") - 0.2) / 0.5} />
      </Svg>
    </CrateInside>
  );
};
// 9. the label: Perth, cash on delivery (stamp slams)
const S_Label: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const lk = clamp01((T - W("label") - 0.1) / 0.9);
  return (
    <AbsoluteFill style={{ background: "#2a1a12" }}>
      <Svg>
        <g transform={`translate(540,1200) scale(${1.0 + 0.08 * p}) rotate(${-3 + 2 * p}) translate(-540,-1200)`}>
          <Crate x={540} y={1700} w={1300} h={900} label={false} cod={(T - W("cash") + 0.05) / 0.3} />
          <defs><clipPath id="lbl"><rect x={0} y={1000} width={100 + 900 * lk} height={300} /></clipPath></defs>
          <g clipPath="url(#lbl)"><text x={540} y={1150} textAnchor="middle" fontFamily={hand} fontSize={130} fill="#2a2230">TO: PERTH, W.A.</text></g>
          <text x={540} y={1330} textAnchor="middle" fontFamily={hand} fontSize={52} fill="#2a2230" opacity={clamp01((T - W("madeup")) / 0.3) * 0.85}>(a customer who doesn't exist)</text>
        </g>
      </Svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 50%, rgba(20,10,10,0.6) 100%)" }} />
    </AbsoluteFill>
  );
};
// 10. John nails it shut (bang, bang, bang): Reg is now cargo
const S_Nail: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.2, z1: 1.35, cx: 540, cy: 1600 };
  const J = at(800, 1800, t, dur, c), s = 1.35, C = at(450, 1820, t, dur, c);
  const bangs = [W("nailed"), W("it"), W("shut")];
  const hk = bangs.reduce((m, bt) => Math.max(m, T > bt - 0.15 && T < bt + 0.1 ? 1 - Math.abs(T - bt + 0.03) / 0.13 : 0), 0);
  const g = 1 - clamp01(hk);
  const jp: Pose = { expr: "stern", ex: { mouth: "flat" }, facing: -0.5, gesture: "point", gk: 0.35 + 0.65 * g, blink: blinkAt(T, 13), lookX: -1, lookY: 0.6 };
  const ang = lerp(6, 120, 0.35 + 0.65 * g), el = lerp(12, -10, 0.35 + 0.65 * g), hp = handAt(J.x, J.y, s * J.z, ang, el, 1, true);
  const cargo = T > W("cargo", 1) - 0.1;
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_shed.png" t={t} dur={dur} c={c} bright={0.72} />
      <Haze top="rgba(255,200,140,0.12)" vig={0.48} />
      <Svg>
        <Crate x={C.x} y={C.y} w={520 * C.z} h={300 * C.z} cod={1} shake={hk} knot={{ blink: blinkAt(T, 14, bangs), look: cargo ? 1 : 0 }} />
        {shadowAt(J.x, J.y, s * J.z)}
        <AF id="jn" look={JOHN_A} x={J.x} y={J.y} s={s * J.z} flip pose={jp} shadow={false} />
        <Hammer x={hp.x} y={hp.y} s={0.85 * J.z} rot={-ang - el + 240} />
        {bangs.map((bt, i) => <Sparkle key={i} x={C.x + 140 - i * 90} y={C.y - 310 * C.z} k={(T - bt) / 0.3} />)}
        {cargo && <g transform={`translate(${C.x},${C.y - 420 * C.z}) rotate(-6) scale(${Easing.out(Easing.back(2))(clamp01((T - W("cargo", 1) + 0.1) / 0.3))})`}>
          <rect x={-170} y={-50} width={340} height={100} rx={10} fill="#ffd04a" stroke={INK} strokeWidth={7} />
          <text x={0} y={22} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={60} fill="#2a2230">CARGO</text></g>}
      </Svg>
    </AbsoluteFill>
  );
};
// 11. mid-flight: out into the dark hold to stretch... the plane tips for landing, back in!
const S_Stretch: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.12, z1: 1.25, cx: 540, cy: 1500 };
  const C = at(460, 1700, t, dur, c), s = 1.3;
  const outT = W("sneaked"), dive = W("dived") + 0.2;
  const lid = T < outT - 0.4 ? 0 : T < dive + 0.35 ? clamp01((T - outT + 0.4) / 0.3) : 1 - clamp01((T - dive - 0.35) / 0.15);
  const rise = T < dive ? Easing.out(Easing.cubic)(clamp01((T - outT + 0.1) / 0.5)) : 1 - Easing.in(Easing.cubic)(clamp01((T - dive) / 0.35));
  const stand = T > W("stretch") - 0.2 && T < dive;
  const tilt = T > W("landing") - 0.9 ? -7 * Easing.inOut(Easing.sin)(clamp01((T - W("landing") + 0.9) / 0.6)) : 0;
  const rx = stand ? C.x + 260 * C.z * Easing.inOut(Easing.sin)(clamp01((T - W("stretch") + 0.2) / 0.6)) : C.x;
  const rp: Pose = { expr: T > W("dived") - 0.5 ? "surprised" : stand ? "happy" : "sly", facing: 0.3, gesture: stand ? "shrug" : "none", gk: stand ? ramp(T, W("stretch"), 0.3) : 0,
    lean: tilt * -1.5, blink: blinkAt(T, 15), lookX: T > W("dived") - 0.5 ? 1 : 0, ex: stand && T < W("dived") - 0.5 ? { eyes: "closed", mouth: "open" } : {} };
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `rotate(${tilt}deg) scale(1.1)` }}>
        <PlateC src="mailed/a_hold.png" t={t} dur={dur} c={c} bright={0.75} />
      </AbsoluteFill>
      <Haze top="rgba(80,110,200,0.14)" vig={0.55} />
      <Svg>
        <g transform={`rotate(${tilt},540,1400)`}>
          <defs><clipPath id="hc"><rect x={0} y={0} width={1080} height={C.y - 150 * C.z} /></clipPath></defs>
          {!stand && <g clipPath="url(#hc)"><AF id="rh" look={REG_A} x={C.x} y={C.y + 30 * C.z - 300 * C.z * rise} s={s * C.z} pose={rp} shadow={false} /></g>}
          <Crate x={C.x} y={C.y} w={460 * C.z} h={260 * C.z} cod={1} lid={lid} />
          {stand && <g>{shadowAt(rx, C.y + 10, s * C.z)}<AF id="rh2" look={REG_A} x={rx} y={C.y + 10} s={s * C.z} pose={rp} shadow={false} /></g>}
        </g>
        <g transform="translate(860,330)" opacity={T > W("landing") - 1 ? 0.6 + 0.4 * Math.sin(T * 12) : 0.25}>
          <rect x={-120} y={-50} width={240} height={100} rx={14} fill="#2a2230" stroke={INK} strokeWidth={5} />
          <text x={0} y={16} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={38} fill="#ffd04a">LANDING</text>
        </g>
      </Svg>
    </AbsoluteFill>
  );
};
// 12. Bombay: the blazing tarmac, and a handler sets the crate down upside down
const S_Bombay: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.12, z1: 1.26, cx: 540, cy: 1600 };
  const C = at(470, 1790, t, dur, c), s = 1.3;
  const flipT = W("upside") - 0.35, fk = Easing.inOut(Easing.cubic)(clamp01((T - flipT) / 0.45));
  const wk = walker(T, flipT + 0.5, b + 0.5, 2.2);
  const H = at(760 + (T > flipT + 0.5 ? wk.dist * s * 0.7 : 0), 1800, t, dur, c);
  const hp: Pose = { phase: wk.phase, walk: wk.walk, expr: T > flipT + 0.5 ? "happy" : "neutral", facing: T > flipT + 0.5 ? 0.6 : -0.5, gesture: T < flipT + 0.5 ? "offer" : "none", gk: 1,
    blink: blinkAt(T, 16), lookX: T > flipT + 0.5 ? 1 : -1 };
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_bombay.png" t={t} dur={dur} c={c} bright={1.08} />
      <Haze top="rgba(255,220,140,0.22)" vig={0.25} />
      <Svg>
        <Sun x={860} y={330} t={T} r={110} />
        <Heat t={T} y0={1750} o={0.55} />
        <Crate x={C.x} y={C.y} w={460 * C.z} h={260 * C.z} cod={1} rot={180 * fk} />
        {shadowAt(H.x, H.y, s * H.z)}
        <AF id="hb" look={HANDLER3} x={H.x} y={H.y} s={s * H.z} flip={T < flipT + 0.5} pose={hp} shadow={false} />
        <Card k={(T - W("bombay") + 0.1) / 0.35} text="BOMBAY" y={560} />
      </Svg>
    </AbsoluteFill>
  );
};
// 13. inside: an oven, upside down; off come the clothes
const S_Oven: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const strip = T > W("stripped") - 0.05, sk = clamp01((T - W("stripped") + 0.05) / 0.6);
  const faint = T > W("pass") - 0.2;
  const pose: Pose = { expr: "worried", ex: faint ? { eyes: "closed", mouth: "wobble" } : { mouth: "open" }, facing: 0.1, gesture: strip ? "wave" : "shrug", gk: 1, talk: T * 1.5,
    blink: blinkAt(T, 17), headTilt: faint ? 8 * Math.sin(T * 3) : 0 };
  return (
    <CrateInside t={T} hot={clamp01(t / 1.2)} light={0.9}>
      <Svg>
        <g transform={`rotate(180,540,1000) translate(540,1000) scale(${1 + 0.06 * p}) translate(-540,-1000)`}>
          <AF id="ro" look={strip ? REG_A_VEST : REG_A} x={540} y={1950} s={3.3} pose={pose} shadow={false} />
        </g>
        <Sweat x={540} y={1050} t={T} n={5} s={1.6} dir={-1} />
        {sk > 0 && sk < 1 && <g transform={`translate(${540 + 500 * sk},${1100 - 500 * Math.sin(Math.PI * sk)}) rotate(${300 * sk})`}>
          <path d="M-90,-60 L90,-60 L130,40 L80,50 L70,90 L-70,90 L-80,50 L-130,40 Z" fill="#2f4f7a" stroke={INK} strokeWidth={6} strokeLinejoin="round" /></g>}
        <Card k={(T - W("upside") - 0.1) / 0.3} text="(still upside down)" y={360} rot={2} />
      </Svg>
    </CrateInside>
  );
};
// 14. Perth: two handlers haul the crate, swearing about its size
const S_Perth: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.28, cx: 540, cy: 1600, dx: -30 };
  const s = 1.3, H1 = at(260, 1800, t, dur, c), H2 = at(820, 1800, t, dur, c), C = at(540, 1700, t, dur, c);
  const lift = 40 + 18 * Math.sin(T * 3.2);
  const p1: Pose = { expr: "worried", ex: { mouth: "open", sweat: true }, facing: 0.6, gesture: "offer", gk: 1, lean: 8, blink: blinkAt(T, 18), lookX: 1 };
  const p2: Pose = { expr: "stern", ex: { mouth: "frown", sweat: true }, facing: -0.6, gesture: "offer", gk: 1, lean: 8, blink: blinkAt(T, 19), lookX: -1 };
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_perth.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,190,140,0.1)" vig={0.34} />
      <Svg>
        {shadowAt(H1.x, H1.y, s * H1.z)}{shadowAt(H2.x, H2.y, s * H2.z)}
        <Crate x={C.x} y={C.y - lift} w={480 * C.z} h={270 * C.z} cod={1} rot={2 * Math.sin(T * 2.4)} />
        <AF id="h1" look={HANDLER1} x={H1.x} y={H1.y} s={s * H1.z} pose={p1} shadow={false} />
        <AF id="h2" look={HANDLER2} x={H2.x} y={H2.y} s={s * H2.z} flip pose={p2} shadow={false} />
        <Grawlix x={H1.x + 40} y={H1.y - 560} k={(T - W("swore") + 0.1) / 1.2} s={0.9} />
        <Grawlix x={H2.x - 40} y={H2.y - 620} k={(T - W("size") + 0.1) / 1.1} s={0.85} flip text="!@#$" />
        <Card k={(T - W("perth", 1) + 0.1) / 0.35} text="PERTH" y={420} />
      </Svg>
    </AbsoluteFill>
  );
};
// 15. inside: not a sound (eyes darting, holding his breath)
const S_Hush: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const pose: Pose = { expr: "worried", ex: { mouth: "M", sweat: true }, facing: 0, gesture: "cross", gk: 1, blink: 0, lookX: Math.sin(T * 5) > 0 ? 1 : -1, lookY: -0.2 };
  return (
    <CrateInside t={T} light={0.7}>
      <Svg>
        <g transform={`translate(0,${6 * Math.sin(T * 6)})`}>
          <AF id="rq" look={REG_A_VEST} x={540} y={1900 + 30 * p} s={3.9 + 0.25 * p} pose={pose} shadow={false} />
        </g>
        <g opacity={0.45}><Grawlix x={250} y={420} k={0.5} s={0.7} /><Grawlix x={830} y={560} k={0.5} s={0.6} flip text="!@#" /></g>
      </Svg>
    </CrateInside>
  );
};
// 16. out of the crate, into his suit, and away unnoticed
const S_Exit: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.15, z1: 1.25, cx: 540, cy: 1620, dx: 30 };
  const C = at(380, 1800, t, dur, c), s = 1.3;
  const lid = clamp01((T - a - 0.1) / 0.3), rise = Easing.out(Easing.cubic)(clamp01((T - W("out", 2) + 0.2) / 0.45));
  const suit = T > W("suit") - 0.1;
  const wk = walker(T, W("made") - 0.1, b + 0.6, 3.6);
  const out = T > W("made") - 0.1;
  const R = at(out ? 600 + wk.dist * s * 0.75 : 600, 1810, t, dur, c);
  const rp: Pose = { phase: wk.phase, walk: wk.walk, expr: out ? "sly" : "smile", facing: 0.6, gesture: suit && !out ? "tip" : "none", gk: suit && !out ? ramp(T, W("suit") - 0.1, 0.3) : 0,
    blink: blinkAt(T, 20), lookX: out ? -0.6 : 0.6 };
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_perth.png" t={t} dur={dur} c={c} bright={0.55} />
      <Haze top="rgba(90,110,200,0.18)" vig={0.55} />
      <Svg>
        {!suit && <g><defs><clipPath id="ec"><rect x={0} y={0} width={1080} height={C.y - 150 * C.z} /></clipPath></defs>
          <g clipPath="url(#ec)"><AF id="re" look={REG_A_VEST} x={C.x} y={C.y + 40 - 300 * C.z * rise} s={s * C.z} pose={{ expr: "sly", facing: 0.4, blink: blinkAt(T, 21), lookX: 1 }} shadow={false} /></g></g>}
        <Crate x={C.x} y={C.y} w={460 * C.z} h={260 * C.z} cod={1} lid={lid} />
        {suit && <g>{shadowAt(R.x, R.y, s * R.z)}<AF id="re2" look={REG_A_SUIT} x={R.x} y={R.y} s={s * R.z} pose={rp} shadow={false} /></g>}
        <Sparkle x={620} y={1300} k={(T - W("suit") + 0.1) / 0.4} />
        <Motes t={T} n={10} seed={9} />
      </Svg>
    </AbsoluteFill>
  );
};
// 17. sixty-three hours: the route on a map, the counter running
const S_Map: React.FC<ShotP> = ({ T, a, b }) => {
  const k = clamp01((T - a - 0.1) / 2.6);
  return (
    <AbsoluteFill>
      <Svg>
        <g transform={`translate(540,960) scale(${1.05 + 0.05 * (T - a) / (b - a)}) translate(-540,-960)`}>
          <RouteMap k={k} t={T} hours={63 * clamp01((T - a) / 1.6)} />
        </g>
      </Svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(60,30,20,0.35) 100%)" }} />
    </AbsoluteFill>
  );
};
// 18. hitchhiking across Australia to Adelaide, just in time
const S_Outback: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, c: Cam = { z0: 1.1, z1: 1.24, cx: 540, cy: 1650 };
  const wk = walker(T, a, W("birthday", 1) - 0.3, 2.6), s = 1.3;
  const R = at(300 + wk.dist * s * 0.6, 1820, t, dur, c);
  const bd = T > W("birthday", 1) - 0.25;
  const rp: Pose = { phase: wk.phase, walk: wk.walk, expr: bd ? "happy" : "smile", facing: bd ? 0.1 : 0.6, gesture: bd ? "wave" : "offer", gk: 1, talk: T, blink: blinkAt(T, 22), lookX: bd ? 0 : -1 };
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_outback.png" t={t} dur={dur} c={c} />
      <Haze top="rgba(255,210,150,0.12)" vig={0.3} />
      <Svg>
        <g transform={`translate(${at(820, 1800, t, dur, c).x},${at(820, 1800, t, dur, c).y})`}>
          <rect x={-8} y={-300} width={16} height={300} fill="#8a6a4a" stroke={INK} strokeWidth={4} />
          <path d="M-10,-300 H190 L230,-260 L190,-220 H-10 Z" fill="#2f6a3a" stroke={INK} strokeWidth={6} />
          <text x={95} y={-248} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={30} fill="#fff">ADELAIDE</text>
        </g>
        {shadowAt(R.x, R.y, s * R.z)}
        <AF id="ro2" look={REG_A_SUIT} x={R.x} y={R.y} s={s * R.z} pose={rp} shadow={false} />
        {bd && <g transform={`translate(540,640) scale(${Easing.out(Easing.back(1.6))(clamp01((T - W("birthday", 1) + 0.25) / 0.4))})`}>
          <Cake x={0} y={120} s={1.1} t={T} />
          <text x={0} y={-110} textAnchor="middle" fontFamily={hand} fontSize={76} fill="#c0303a" stroke="#fffaf0" strokeWidth={10} paintOrder="stroke">JUST IN TIME!</text></g>}
        <Card k={(T - W("hitchhiked") + 0.1) / 0.35} text="PERTH → ADELAIDE" y={360} sub="by thumb" />
      </Svg>
    </AbsoluteFill>
  );
};
// 19. back in London: John on the telephone, worried
const S_Phone: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const pose: Pose = { expr: "worried", ex: { mouth: T > W("called") ? "open" : "wobble" }, facing: 0.25, gesture: "chin", gk: 1, talk: T * 2, blink: blinkAt(T, 23), lookX: 0.5 };
  const x = 520, y = 1900 + 20 * p, s = 3.4 + 0.2 * p;
  const hp = handAt(x, y, s, 40, 135, 1);
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_shed.png" t={t} dur={dur} c={{ z0: 1.5, z1: 1.6, cx: 300, cy: 1200 }} blur={3.4} bright={0.85} />
      <Haze top="rgba(160,170,210,0.14)" vig={0.4} />
      <Svg>
        <AF id="jp" look={JOHN_A} x={x} y={y} s={s} pose={pose} shadow={false} />
        <g transform={`translate(${hp.x},${hp.y}) rotate(-70) scale(${s / 3.4})`}>
          <path d="M-70,-18 Q0,-40 70,-18 L76,16 Q40,6 30,22 L-30,22 Q-40,6 -76,16 Z" fill="#2a2230" stroke={INK} strokeWidth={5} />
        </g>
        <Card k={(T - W("london", 2) + 0.1) / 0.35} text="MEANWHILE, LONDON" y={380} />
      </Svg>
    </AbsoluteFill>
  );
};
// 20. the story goes around the world: spinning newspapers
const S_News: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a;
  const papers = [{ t0: a, x: 540, y: 980, r: -6, h: "MAN POSTS HIMSELF HOME" }, { t0: W("worldwide") - 0.1, x: 300, y: 760, r: 10, h: "HUMAN CARGO!" }, { t0: W("worldwide") + 0.25, x: 780, y: 1240, r: -14, h: "BOXED ATHLETE" }];
  return (
    <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${t * 20}deg at 50% 50%, #c0303a 0deg 12deg, #d84a4a 12deg 24deg)` }}>
      <Svg>
        {papers.map((pp, i) => { const k = clamp01((T - pp.t0) / 0.6); if (T < pp.t0) return null;
          return <Newspaper key={i} x={pp.x} y={pp.y} s={0.95 * Easing.out(Easing.back(1.4))(k)} rot={pp.r + 720 * (1 - Easing.out(Easing.cubic)(k))} head={pp.h} sub="Stowaway flew as freight" />; })}
      </Svg>
    </AbsoluteFill>
  );
};
// 21. scared? a shrug and a grin
const S_End: React.FC<ShotP> = ({ T, a, b }) => {
  const t = T - a, dur = b - a, p = push(t, dur);
  const sh = T > W("shrugged") - 0.15, fr = T > W("frightened") - 0.1;
  const pose: Pose = { expr: fr ? "smug" : sh ? "smile" : "neutral", facing: 0.15, gesture: sh ? "shrug" : "none", gk: ramp(T, W("shrugged") - 0.15, 0.3), talk: T,
    wink: T > W("of", 3) + 0.15 && T < W("of", 3) + 0.6, blink: blinkAt(T, 24), lookX: fr ? 0 : 0.5 };
  return (
    <AbsoluteFill>
      <PlateC src="mailed/a_outback.png" t={t} dur={dur} c={{ z0: 1.5, z1: 1.62, cx: 540, cy: 1250 }} blur={3.2} />
      <Haze top="rgba(255,210,150,0.12)" vig={0.36} />
      <Svg>
        <Crate x={880} y={1880} w={480} h={280} cod={1} />
        <AF id="rend" look={REG_A_SUIT} x={450} y={1900 + 20 * p} s={3.6 + 0.2 * p} pose={pose} shadow={false} />
        <Sparkle x={760} y={560} k={(T - W("of", 3) - 0.1) / 0.5} />
      </Svg>
    </AbsoluteFill>
  );
};

const SHOTS: [number, React.FC<ShotP>][] = [
  [0, S_Sky], [4.15, S_HoldHook], [6.3, S_Track], [9.3, S_Broke], [12.8, S_Shed], [17.5, S_Idea], [20.8, S_Build], [23.5, S_Lid],
  [25.6, S_Pack], [31.9, S_Label], [35.1, S_Nail], [37.6, S_Stretch], [43.4, S_Bombay], [47.8, S_Oven], [52.4, S_Perth], [55.7, S_Hush],
  [57.6, S_Exit], [61.5, S_Map], [65.3, S_Outback], [68.3, S_Phone], [71.2, S_News], [73.3, S_End],
];
const sub = defaultStyle("funny", { keyWords: KEY, y: 0.86, maxChars: 16 });
const subS = { ...sub, moves: [{ from: 0, to: 4.15, y: 0.6 }, { from: 4.15, to: 6.3, y: 0.3 }, { from: 6.3, to: 9.3, y: 0.62 }, { from: 9.3, to: 12.8, y: 0.86 },
  { from: 12.8, to: 17.5, y: 0.62 }, { from: 20.8, to: 23.5, y: 0.6 }, { from: 23.5, to: 25.6, y: 0.3 }, { from: 25.6, to: 31.9, y: 0.22 }, { from: 31.9, to: 35.1, y: 0.25 },
  { from: 35.1, to: 37.6, y: 0.6 }, { from: 37.6, to: 43.4, y: 0.62 }, { from: 43.4, to: 47.8, y: 0.62 }, { from: 47.8, to: 52.4, y: 0.86 }, { from: 52.4, to: 55.7, y: 0.6 },
  { from: 55.7, to: 57.6, y: 0.25 }, { from: 57.6, to: 61.5, y: 0.6 }, { from: 61.5, to: 65.3, y: 0.18 }, { from: 65.3, to: 68.3, y: 0.62 }, { from: 71.2, to: 73.3, y: 0.86 }] };

export const ShortA: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  setCfg(V3);
  FIGCFG.v2 = false;
  FIGCFG.v3 = false;
  useMarkerFont();
  const f = useCurrentFrame(), T = f / FPS;
  let k = SHOTS.findIndex(([s0], i) => T >= s0 && T < (SHOTS[i + 1]?.[0] ?? 1e9));
  if (k < 0) k = SHOTS.length - 1;
  const [a, S] = SHOTS[k], b = SHOTS[k + 1]?.[0] ?? END;
  const cutK = SHOTS.slice(1).reduce((m, [c]) => Math.min(m, Math.abs(T - c) * FPS), 99);
  const fadeIn = interpolate(T, [0, 0.25], [1, 0], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(T, [END - 0.7, END - 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#1a1420" }}>
      <S T={T} a={a} b={b} />
      <AbsoluteFill style={{ background: "linear-gradient(rgba(255,180,120,0.08), rgba(255,200,150,0.0) 50%, rgba(80,40,90,0.10))", mixBlendMode: "soft-light" }} />
      {cutK < 1.5 && <AbsoluteFill style={{ background: "#fff", opacity: 0.12 * (1.5 - cutK) }} />}
      <Subtitles words={WORDS} style={subS} />
      {withAudio && <Audio src={staticFile("mailed/a_mix.wav")} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
      {fadeOut > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />}
    </AbsoluteFill>
  );
};
