// Our Paris 1925 cast for "The Man Who Sold the Eiffel Tower", drawn as polished 2D vector characters (SVG):
// big round heads, small bodies in detailed period clothes, simple expressive faces, bold dark outlines and soft
// cel shading. Pure function of props, so every frame is deterministic.
// Units: head radius 100; origin at the feet on the ground; y grows downward (SVG), the character stands on y = 0.
// Walking is driven by the stance leg (walkPose): the planted foot never slides.
import React from "react";

export const INK = "#2a2230";
const SKIN = "#f3dcc0", SKIN_SH = "#d9b996", BLUSH = "rgba(236,128,118,0.32)";

export type EyeK = "dot" | "sly" | "happy" | "closed" | "wide" | "squint" | "worried";
export type MouthK = "smile" | "smirk" | "grin" | "open" | "o" | "flat" | "frown" | "wobble" | "A" | "E" | "U" | "M" | "F";
export type Expr = { eyes: EyeK; mouth: MouthK; brow: number; browTilt: number; blush?: number; sweat?: boolean };
export const EXPR: Record<string, Expr> = {
  neutral: { eyes: "dot", mouth: "flat", brow: 0, browTilt: 0 },
  sly: { eyes: "sly", mouth: "smirk", brow: -4, browTilt: -8 },
  smug: { eyes: "sly", mouth: "grin", brow: -6, browTilt: -10, blush: 0.6 },
  happy: { eyes: "happy", mouth: "grin", brow: -8, browTilt: 6, blush: 1 },
  smile: { eyes: "dot", mouth: "smile", brow: -3, browTilt: 4, blush: 0.6 },
  surprised: { eyes: "wide", mouth: "o", brow: -16, browTilt: 4 },
  amazed: { eyes: "wide", mouth: "open", brow: -16, browTilt: 6, blush: 0.8 },
  worried: { eyes: "worried", mouth: "wobble", brow: -6, browTilt: 14, sweat: true },
  stern: { eyes: "dot", mouth: "frown", brow: 4, browTilt: -14 },
  laugh: { eyes: "squint", mouth: "open", brow: -8, browTilt: 6, blush: 1 },
};

export type Look = {
  skin?: string; suit: string; suitDark: string; pin?: string; check?: string; vest: string; shirt: string; tie: string;
  shoes: string; trousers?: string; hat: "bowler" | "homburg" | "cap" | "none"; hatCol: string; band: string; hair: string;
  mustache?: "pencil" | "walrus"; glasses?: boolean; flower?: string; chain?: boolean; stout?: number; brows: string; sideburns?: boolean;
  /** modern wardrobe (all optional, the 1925 cast is unchanged): top style, hair without a hat, cap, stubble, lashes, a t-shirt print */
  top?: "suit" | "tee" | "hoodie" | "sweater"; hairStyle?: "short" | "messy" | "ponytail" | "bob" | "curly"; stubble?: string; lashes?: boolean; print?: string;
};
export const LUSTIG: Look = {
  suit: "#3b3f52", suitDark: "#2a2d3c", pin: "rgba(220,225,240,0.16)", vest: "#4a3a4e", shirt: "#f7f3ea", tie: "#8e2a3a",
  shoes: "#1e1a1e", trousers: "#353849", hat: "bowler", hatCol: "#24222b", band: "#5a2834", hair: "#1f1a1f",
  mustache: "pencil", flower: "#e0414b", chain: true, brows: "#1f1a1f",
};
export const POISSON: Look = {
  suit: "#8a6a45", suitDark: "#6a4f32", check: "rgba(70,45,25,0.28)", vest: "#b48d55", shirt: "#f4efe2", tie: "#2f5a4a",
  shoes: "#4a2e1e", trousers: "#7a5c3c", hat: "homburg", hatCol: "#6d6a66", band: "#2c2a28", hair: "#8d8780",
  mustache: "walrus", glasses: true, stout: 1, brows: "#6e6862", sideburns: true,
};

export type Gesture = "none" | "present" | "shrug" | "point" | "rub" | "wave" | "hips" | "offer" | "shake" | "tip" | "chin" | "cross" | "facepalm" | "write";
export type Pose = {
  expr?: string; ex?: Partial<Expr>; mouth?: MouthK | null; blink?: number; lookX?: number; lookY?: number; facing?: number;
  /** walk: phase 0..1 per full cycle (two steps), amt 0 standing .. 1 walking */
  phase?: number; walk?: number; bob?: number; lean?: number; headTilt?: number;
  gesture?: Gesture; gk?: number; gesture2?: Gesture; wink?: boolean; hatLift?: number; hold?: "letter" | "case" | "cash" | "cane" | "box" | "marker" | "flashlight" | "phone" | null; talk?: number;
};

const P = (n: number) => n.toFixed(2);
const pt = (x: number, y: number) => `${P(x)},${P(y)}`;
const rad = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** leg angles (deg) for a stance-driven walk; returns [backLeg, frontLeg] angles and foot lifts */
export const LEG = 62, SWING = 28;
export const walkPose = (phase: number) => {
  const leg = (ph: number) => {
    const u = ((ph % 1) + 1) % 1; // 0..0.5 stance, 0.5..1 swing
    const sA = Math.sin(rad(SWING));
    if (u < 0.5) { const s = sA * (1 - 4 * u); return { a: Math.asin(s) * 180 / Math.PI, lift: 0 }; }
    const v = (u - 0.5) / 0.5, s = -sA + 2 * sA * (0.5 - 0.5 * Math.cos(Math.PI * v));
    return { a: Math.asin(s) * 180 / Math.PI, lift: Math.sin(Math.PI * v) * 14 };
  };
  return [leg(phase), leg(phase + 0.5)];
};
/** ground distance (head-radius units) covered per walk cycle: two stances of 2 L sin(A) each */
export const STRIDE = 2 * 2 * LEG * Math.sin(rad(SWING));

const mouthPath = (k: MouthK, x: number, y: number, s: number): React.ReactNode => {
  const dark = "#5b1f2a", tongue = "#e5707a";
  switch (k) {
    case "smile": return <path d={`M${pt(x - 15 * s, y - 3)} Q${pt(x, y + 12)} ${pt(x + 15 * s, y - 3)}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    case "smirk": return <path d={`M${pt(x - 12 * s, y + 2)} Q${pt(x + 4, y + 7)} ${pt(x + 16 * s, y - 6)}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    case "flat": return <path d={`M${pt(x - 10 * s, y)} L${pt(x + 10 * s, y)}`} stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    case "frown": return <path d={`M${pt(x - 13 * s, y + 5)} Q${pt(x, y - 6)} ${pt(x + 13 * s, y + 5)}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    case "wobble": return <path d={`M${pt(x - 14 * s, y + 2)} q${P(5 * s)},-6 ${P(9 * s)},0 q${P(5 * s)},6 ${P(10 * s)},0 q${P(5 * s)},-6 ${P(9 * s)},0`} fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />;
    case "o": case "U": { const r = k === "U" ? 6 : 8; return <ellipse cx={x} cy={y + 2} rx={r * s} ry={r * 1.25} fill={dark} stroke={INK} strokeWidth={4} />; }
    case "M": return <path d={`M${pt(x - 9 * s, y + 1)} Q${pt(x, y + 3)} ${pt(x + 9 * s, y + 1)}`} fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />;
    case "F": return <g><path d={`M${pt(x - 11 * s, y - 2)} L${pt(x + 11 * s, y - 2)} L${pt(x + 9 * s, y + 6)} L${pt(x - 9 * s, y + 6)} Z`} fill={dark} stroke={INK} strokeWidth={4} strokeLinejoin="round" /><rect x={x - 9 * s} y={y - 2} width={18 * s} height={4} fill="#fff" /></g>;
    case "grin": case "open": case "A": case "E": {
      const w = (k === "grin" ? 20 : k === "E" ? 17 : k === "A" ? 13 : 16) * s, h = k === "grin" ? 15 : k === "E" ? 9 : k === "A" ? 17 : 19;
      const d = `M${pt(x - w, y - 4)} Q${pt(x, y - 8)} ${pt(x + w, y - 4)} Q${pt(x + w * 0.8, y + h)} ${pt(x, y + h)} Q${pt(x - w * 0.8, y + h)} ${pt(x - w, y - 4)} Z`;
      return (
        <g>
          <path d={d} fill={dark} />
          <clipPath id={`m${k}${Math.round(x)}`}><path d={d} /></clipPath>
          <g clipPath={`url(#m${k}${Math.round(x)})`}>
            <rect x={x - w} y={y - 10} width={2 * w} height={k === "grin" ? 11 : 9} fill="#fff" />
            {k !== "E" && <ellipse cx={x + 3} cy={y + h} rx={w * 0.55} ry={h * 0.45} fill={tongue} />}
          </g>
          <path d={d} fill="none" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
        </g>
      );
    }
  }
};

const Eye: React.FC<{ k: EyeK; x: number; y: number; side: number; lx: number; ly: number; blink: number }> = ({ k, x, y, side, lx, ly, blink }) => {
  const shut = blink > 0.6 && k !== "happy" && k !== "squint";
  if (shut) return <path d={`M${pt(x - 11, y + 2)} Q${pt(x, y + 7)} ${pt(x + 11, y + 2)}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />;
  const px = x + lx * 4, py = y + ly * 3;
  switch (k) {
    case "dot": return <g><ellipse cx={px} cy={py} rx={7.5} ry={blink > 0.2 ? 5 : 10} fill={INK} /><circle cx={px + 2.2} cy={py - 3.5} r={2.3} fill="#fff" /></g>;
    case "sly": return (
      <g>
        <ellipse cx={px} cy={py + 2} rx={8} ry={7} fill={INK} />
        <path d={`M${pt(x - 13, y - 2)} L${pt(x + 13, y - 2 + side * 0)}`} stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
        <rect x={x - 14} y={y - 14} width={28} height={11} fill="var(--skin)" />
        <path d={`M${pt(x - 13, y - 3)} Q${pt(x, y - 6)} ${pt(x + 13, y - 3)}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </g>
    );
    case "happy": return <path d={`M${pt(x - 11, y + 4)} Q${pt(x, y - 10)} ${pt(x + 11, y + 4)}`} fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />;
    case "closed": return <path d={`M${pt(x - 11, y + 2)} Q${pt(x, y + 7)} ${pt(x + 11, y + 2)}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    case "squint": return <path d={`M${pt(x - side * 10, y - 8)} L${pt(x + side * 8, y)} L${pt(x - side * 10, y + 8)}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />;
    case "worried": return <g><ellipse cx={px} cy={py + 1} rx={6.5} ry={8.5} fill={INK} /><circle cx={px + 2} cy={py - 2} r={2} fill="#fff" /></g>;
    case "wide": return (
      <g>
        <ellipse cx={x} cy={y} rx={14} ry={blink > 0.2 ? 9 : 16} fill="#fff" stroke={INK} strokeWidth={4} />
        <circle cx={px - side * 1} cy={py + 2} r={5.5} fill={INK} />
      </g>
    );
  }
};

/** one character. x, y in the parent's units (feet), s = scale (head radius in px / 100), flip = facing left */
export const Figure: React.FC<{ look: Look; pose: Pose; x: number; y: number; s: number; flip?: boolean; id: string; shadow?: boolean }> = ({ look: L, pose, x, y, s, flip = false, id, shadow = true }) => {
  const e: Expr = { ...EXPR[pose.expr ?? "neutral"], ...(pose.ex ?? {}) };
  const stout = L.stout ?? 0, fc = pose.facing ?? 0.35, walk = pose.walk ?? 0;
  const [l1, l2] = walkPose(pose.phase ?? 0);
  const legA = [l1.a * walk, l2.a * walk], lift = [l1.lift * walk, l2.lift * walk];
  // body bob: lowest at the double-support moments
  const bob = walk * 5 * Math.abs(Math.cos(2 * Math.PI * (pose.phase ?? 0) * 2)) + (pose.bob ?? 0);
  const hipY = -LEG - 2 + bob * 0.4, torsoTop = -150 + bob, torsoBot = hipY + 8;
  const tw = 46 + stout * 16, bw = 52 + stout * 24; // half widths top / bottom
  const lean = pose.lean ?? 0, tilt = (pose.headTilt ?? 0) + lean * 0.5;
  const headC = { x: fc * 4, y: -246 + bob };
  const fx = headC.x + fc * 26, fy = headC.y + 8;
  const skin = L.skin ?? SKIN;
  const gK = Math.max(0, Math.min(1, pose.gk ?? 1));
  // ---- arms: shoulder angles (deg, 0 = hanging, + = forward/up toward the facing side) ----
  const swing = walk * 30 * Math.sin(2 * Math.PI * (pose.phase ?? 0));
  // resting arms hang slightly away from the body, so both arms read clearly beside the torso (the back arm used to
  // hang straight down behind the torso and vanish); a slow independent sway keeps the two arms from moving as one
  const out = (18 + 14 * stout) * (1 - 0.5 * walk), ph = (pose.talk ?? 0) + (pose.bob ?? 0) * 0.05;
  let aB = -swing - out + 2.5 * Math.sin(ph * 1.7), aF = swing + 6 + 6 * stout + 2 * Math.sin(ph * 1.3 + 1), eB = 8, eF = 12;
  // gestures: [back angle, back elbow, front angle, front elbow]; + swings toward screen right, so a symmetric gesture
  // mirrors the signs between the two arms
  const G: Record<Gesture, [number, number, number, number]> = {
    none: [aB, eB, aF, eF], present: [aB, eB, 95, 25], shrug: [-70, -80, 70, 80], point: [aB, eB, 120, -10], rub: [22, 92, -22, -92],
    wave: [aB, eB, 125, -25 + 22 * Math.sin((pose.talk ?? 0) * 12)], hips: [-38, 112, 38, -112], offer: [aB, eB, 70, 20], shake: [aB, eB, 80, 4],
    tip: [aB, eB, 160, 110], chin: [aB - 4, eB + 6, 40, 135],
    cross: [30, 80, -30, -80], facepalm: [aB, eB, 135, 40], write: [aB, eB, 55, 55],
  };
  const g = G[pose.gesture ?? "none"];
  aB = lerp(aB, g[0], gK); eB = lerp(eB, g[1], gK); aF = lerp(aF, g[2], gK); eF = lerp(eF, g[3], gK);
  const arm = (side: number, a: number, el: number, front: boolean) => {
    const sx = side * (tw - 8), sy = torsoTop + 14;
    const up = 34, lo = 30;
    // side = -1 back (screen left), +1 front (screen right). Positive angle swings the hand toward screen right/up.
    const a1 = rad(a), ex = sx + Math.sin(a1) * up * (side < 0 ? 1 : 1), ey = sy + Math.cos(a1) * up;
    const a2 = a1 + rad(el), hx = ex + Math.sin(a2) * lo, hy = ey + Math.cos(a2) * lo;
    const sleeve = front ? L.suit : L.suitDark, top = L.top ?? "suit";
    const mx = sx + (ex - sx) * 0.75, my = sy + (ey - sy) * 0.75;
    return (
      <g key={`arm${side}`}>
        <path d={`M${pt(sx, sy)} L${pt(ex, ey)} L${pt(hx, hy)}`} fill="none" stroke={INK} strokeWidth={27} strokeLinecap="round" strokeLinejoin="round" />
        {top === "tee" ? (
          <g>
            <path d={`M${pt(sx, sy)} L${pt(ex, ey)} L${pt(hx, hy)}`} fill="none" stroke={front ? skin : SKIN_SH} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M${pt(sx, sy)} L${pt(mx, my)}`} fill="none" stroke={INK} strokeWidth={30} strokeLinecap="round" />
            <path d={`M${pt(sx, sy)} L${pt(mx, my)}`} fill="none" stroke={sleeve} strokeWidth={23} strokeLinecap="round" />
          </g>
        ) : <path d={`M${pt(sx, sy)} L${pt(ex, ey)} L${pt(hx, hy)}`} fill="none" stroke={sleeve} strokeWidth={19} strokeLinecap="round" strokeLinejoin="round" />}
        {top === "suit" && <path d={`M${pt(hx - Math.cos(a2) * 10, hy + Math.sin(a2) * 10)} L${pt(hx + Math.cos(a2) * 10, hy - Math.sin(a2) * 10)}`} stroke="#f7f3ea" strokeWidth={6} strokeLinecap="round" />}
        {(top === "hoodie" || top === "sweater") && <path d={`M${pt(hx - Math.cos(a2) * 11, hy + Math.sin(a2) * 11)} L${pt(hx + Math.cos(a2) * 11, hy - Math.sin(a2) * 11)}`} stroke={L.suitDark} strokeWidth={8} strokeLinecap="round" />}
        <circle cx={hx + Math.sin(a2) * 11} cy={hy + Math.cos(a2) * 11} r={11} fill={skin} stroke={INK} strokeWidth={4.5} />
        {front && pose.hold && hold(pose.hold, hx + Math.sin(a2) * 11, hy + Math.cos(a2) * 11)}
      </g>
    );
  };
  const hold = (k: string, hx: number, hy: number) => {
    if (k === "letter") return (
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(-12)`}>
        <rect x={-8} y={-44} width={40} height={52} rx={3} fill="#f7f1e0" stroke={INK} strokeWidth={3.5} />
        {[0, 1, 2, 3].map((i) => <line key={i} x1={-2} x2={26 - (i % 2) * 8} y1={-32 + i * 9} y2={-32 + i * 9} stroke="#8a7f70" strokeWidth={2} />)}
        <circle cx={22} cy={-4} r={5} fill="#b3262f" stroke={INK} strokeWidth={2} />
        <circle cx={0} cy={0} r={11} fill={skin} stroke={INK} strokeWidth={4.5} />
      </g>
    );
    if (k === "case") return (
      <g transform={`translate(${P(hx)},${P(hy)})`}>
        <rect x={-30} y={8} width={60} height={44} rx={6} fill="#7a4a2a" stroke={INK} strokeWidth={4} />
        <rect x={-30} y={22} width={60} height={5} fill="#5a341c" />
        <path d="M-10,8 v-8 h20 v8" fill="none" stroke={INK} strokeWidth={4} />
        <circle cx={0} cy={0} r={11} fill={skin} stroke={INK} strokeWidth={4.5} />
      </g>
    );
    if (k === "cash") return (
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(-20)`}>
        {[-14, 0, 14].map((r, i) => <rect key={i} x={-6} y={-40} width={30} height={46} rx={2} transform={`rotate(${r})`} fill="#9cc49a" stroke={INK} strokeWidth={3} />)}
        <circle cx={0} cy={0} r={11} fill={skin} stroke={INK} strokeWidth={4.5} />
      </g>
    );
    if (k === "box") return (
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(-6)`}>
        <rect x={-46} y={-34} width={92} height={70} rx={4} fill="#c99a62" stroke={INK} strokeWidth={4} />
        <path d="M-46,-14 H46 M-8,-34 V-14 M8,-34 V-14" stroke="#9a6e3e" strokeWidth={4} />
        <rect x={-8} y={-34} width={16} height={70} fill="rgba(240,220,180,0.55)" />
        <circle cx={-40} cy={0} r={11} fill={skin} stroke={INK} strokeWidth={4.5} />
      </g>
    );
    if (k === "marker") return (
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(30)`}>
        <rect x={-6} y={-40} width={12} height={36} rx={3} fill="#d8303a" stroke={INK} strokeWidth={3} />
        <rect x={-6} y={-48} width={12} height={10} rx={2} fill="#f2f2f2" stroke={INK} strokeWidth={3} />
        <circle cx={0} cy={0} r={11} fill={skin} stroke={INK} strokeWidth={4.5} />
      </g>
    );
    if (k === "flashlight") return (
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(-80)`}>
        <rect x={-7} y={-46} width={14} height={44} rx={4} fill="#3a3a48" stroke={INK} strokeWidth={3.5} />
        <rect x={-10} y={-56} width={20} height={12} rx={3} fill="#c8c8d0" stroke={INK} strokeWidth={3.5} />
        <circle cx={0} cy={0} r={11} fill={skin} stroke={INK} strokeWidth={4.5} />
      </g>
    );
    if (k === "phone") return (
      <g transform={`translate(${P(hx)},${P(hy)}) rotate(-8)`}>
        <rect x={-12} y={-46} width={26} height={44} rx={5} fill="#22222c" stroke={INK} strokeWidth={3.5} />
        <rect x={-8} y={-41} width={18} height={33} rx={2} fill="#7fd0ff" />
        <circle cx={0} cy={0} r={11} fill={skin} stroke={INK} strokeWidth={4.5} />
      </g>
    );
    return null;
  };
  // ---- legs ----
  const legEl = (i: number, front: boolean) => {
    const hx = (i ? 1 : -1) * (14 + stout * 5), a = rad(legA[i]);
    const fxp = hx + Math.sin(a) * LEG, fyp = hipY + Math.cos(a) * LEG - lift[i];
    const col = front ? (L.trousers ?? L.suit) : L.suitDark;
    return (
      <g key={`leg${i}`}>
        <path d={`M${pt(hx, hipY - 6)} L${pt(fxp, fyp - 8)}`} stroke={INK} strokeWidth={30} strokeLinecap="round" />
        <path d={`M${pt(hx, hipY - 6)} L${pt(fxp, fyp - 8)}`} stroke={col} strokeWidth={22} strokeLinecap="round" />
        <path d={`M${pt(fxp - 14, fyp - 2)} Q${pt(fxp - 14, fyp - 18)} ${pt(fxp + 4, fyp - 16)} Q${pt(fxp + 22, fyp - 14)} ${pt(fxp + 24, fyp - 2)} Z`}
          fill={L.shoes} stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
        <path d={`M${pt(fxp - 4, fyp - 12)} Q${pt(fxp + 8, fyp - 15)} ${pt(fxp + 16, fyp - 9)}`} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={3} strokeLinecap="round" />
      </g>
    );
  };
  // ---- torso ----
  const torso = `M${pt(-tw, torsoTop + 12)} Q${pt(-tw - 2, torsoTop)} ${pt(-tw + 16, torsoTop - 2)} L${pt(tw - 16, torsoTop - 2)} Q${pt(tw + 2, torsoTop)} ${pt(tw, torsoTop + 12)} L${pt(bw, torsoBot - 10)} Q${pt(bw + 2, torsoBot + 2)} ${pt(bw - 14, torsoBot + 4)} L${pt(-bw + 14, torsoBot + 4)} Q${pt(-bw - 2, torsoBot + 2)} ${pt(-bw, torsoBot - 10)} Z`;
  const cx = fc * 6;
  const vTop = torsoTop + 8, vBot = torsoTop + 62;
  const clip = `t${id}`;
  // ---- head ----
  const R = 100;
  const hatEl = () => {
    const { x: hx, y: hy } = headC;
    if (L.hat === "bowler") {
      const by = hy - 52, top = hy - 140;
      return (
        <g>
          <path d={`M${pt(hx - 80, by)} Q${pt(hx - 84, top + 6)} ${pt(hx, top)} Q${pt(hx + 84, top + 6)} ${pt(hx + 80, by)} Z`} fill={`url(#hatg${id})`} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <path d={`M${pt(hx - 79, by - 16)} Q${pt(hx, by - 24)} ${pt(hx + 79, by - 16)} L${pt(hx + 80, by - 2)} Q${pt(hx, by - 10)} ${pt(hx - 80, by - 2)} Z`} fill={L.band} />
          <path d={`M${pt(hx - 40, top + 22)} Q${pt(hx - 20, top + 8)} ${pt(hx + 8, top + 8)}`} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={7} strokeLinecap="round" />
          <path d={`M${pt(hx - 112, by + 2)} Q${pt(hx - 118, by - 14)} ${pt(hx - 96, by - 10)} Q${pt(hx, by + 4)} ${pt(hx + 96, by - 10)} Q${pt(hx + 118, by - 14)} ${pt(hx + 112, by + 2)} Q${pt(hx, by + 22)} ${pt(hx - 112, by + 2)} Z`}
            fill={L.hatCol} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        </g>
      );
    }
    if (L.hat === "homburg") {
      const by = hy - 56, top = hy - 140;
      return (
        <g>
          <path d={`M${pt(hx - 78, by)} L${pt(hx - 70, top + 8)} Q${pt(hx - 40, top - 4)} ${pt(hx - 8, top + 14)} Q${pt(hx + 4, top + 20)} ${pt(hx + 14, top + 12)} Q${pt(hx + 44, top - 4)} ${pt(hx + 70, top + 8)} L${pt(hx + 78, by)} Z`}
            fill={`url(#hatg${id})`} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <path d={`M${pt(hx - 4, top + 20)} L${pt(hx, by - 26)}`} stroke="rgba(0,0,0,0.22)" strokeWidth={5} strokeLinecap="round" />
          <path d={`M${pt(hx - 77, by - 20)} L${pt(hx + 77, by - 20)} L${pt(hx + 78, by - 2)} L${pt(hx - 78, by - 2)} Z`} fill={L.band} />
          <path d={`M${pt(hx - 122, by + 4)} Q${pt(hx - 128, by - 14)} ${pt(hx - 104, by - 8)} Q${pt(hx, by + 2)} ${pt(hx + 104, by - 8)} Q${pt(hx + 128, by - 14)} ${pt(hx + 122, by + 4)} Q${pt(hx, by + 24)} ${pt(hx - 122, by + 4)} Z`}
            fill={L.hatCol} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        </g>
      );
    }
    if (L.hat === "cap") {
      const by = hy - 48, top = hy - 112;
      return (
        <g>
          <path d={`M${pt(hx - 92, by)} Q${pt(hx - 96, top)} ${pt(hx, top - 4)} Q${pt(hx + 96, top)} ${pt(hx + 92, by)} Z`} fill={L.hatCol} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <path d={`M${pt(hx, top - 4)} L${pt(hx + 6, by)}`} stroke="rgba(0,0,0,0.18)" strokeWidth={4} />
          <circle cx={hx} cy={top - 4} r={7} fill={L.band} stroke={INK} strokeWidth={3} />
          <path d={`M${pt(hx + 20 + fc * 20, by - 6)} Q${pt(hx + 100 + fc * 30, by - 10)} ${pt(hx + 124 + fc * 22, by + 8)} Q${pt(hx + 80, by + 16)} ${pt(hx + 10, by + 6)} Z`} fill={L.band} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <path d={`M${pt(hx - 60, top + 26)} Q${pt(hx - 30, top + 10)} ${pt(hx, top + 10)}`} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={6} strokeLinecap="round" />
        </g>
      );
    }
    return null;
  };
  // ---- hair without a hat (modern cast): a back layer behind the head and a front cap with a fringe ----
  const hs = L.hairStyle, hcx = headC.x, hcy = headC.y;
  const swingP = Math.sin(2 * Math.PI * (pose.phase ?? 0) * 2) * walk * 6 + (pose.bob ?? 0) * 0.6;
  const hairBack = !hs ? null : hs === "bob" ? (
    <path d={`M${pt(hcx - 104, hcy - 20)} Q${pt(hcx - 118, hcy + 70)} ${pt(hcx - 84, hcy + 92)} L${pt(hcx + 84, hcy + 92)} Q${pt(hcx + 118, hcy + 70)} ${pt(hcx + 104, hcy - 20)} Z`} fill={L.hair} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
  ) : hs === "ponytail" ? (
    <g transform={`rotate(${P(swingP)} ${P(hcx - 88)} ${P(hcy - 52)})`}>
      <path d={`M${pt(hcx - 80, hcy - 66)} Q${pt(hcx - 150, hcy - 70)} ${pt(hcx - 150, hcy + 10)} Q${pt(hcx - 148, hcy + 70)} ${pt(hcx - 120, hcy + 96)} Q${pt(hcx - 122, hcy + 30)} ${pt(hcx - 92, hcy - 20)} Z`} fill={L.hair} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <ellipse cx={hcx - 92} cy={hcy - 60} rx={13} ry={10} fill={L.band} stroke={INK} strokeWidth={3.5} />
    </g>
  ) : hs === "curly" ? (
    <g>{[-1, 1].map((sd) => [0, 1, 2].map((i) => <circle key={`${sd}${i}`} cx={hcx + sd * (96 + i * 2)} cy={hcy - 40 + i * 38} r={26} fill={L.hair} stroke={INK} strokeWidth={5} />))}</g>
  ) : null;
  const hairFront = !hs || L.hat === "cap" ? (hs && L.hat === "cap" ? (
    <g>{[-1, 1].map((sd) => <path key={sd} d={`M${pt(hcx + sd * 80, hcy - 60)} Q${pt(hcx + sd * 100, hcy - 30)} ${pt(hcx + sd * 94, hcy + 4)} Q${pt(hcx + sd * 82, hcy - 26)} ${pt(hcx + sd * 62, hcy - 52)} Z`} fill={L.hair} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />)}</g>
  ) : null) : (
    <g>
      <path d={hs === "messy"
        ? `M${pt(hcx - 99, hcy - 6)} A100,100 0 0 1 ${pt(hcx + 99, hcy - 6)} L${pt(hcx + 84, hcy - 30)} L${pt(hcx + 70, hcy - 52)} L${pt(hcx + 52, hcy - 40)} L${pt(hcx + 34, hcy - 62)} L${pt(hcx + 12, hcy - 46)} L${pt(hcx - 10, hcy - 66)} L${pt(hcx - 30, hcy - 46)} L${pt(hcx - 52, hcy - 64)} L${pt(hcx - 70, hcy - 40)} L${pt(hcx - 88, hcy - 38)} Z`
        : hs === "curly"
        ? `M${pt(hcx - 99, hcy - 10)} A100,100 0 0 1 ${pt(hcx + 99, hcy - 10)} Q${pt(hcx + 80, hcy - 44)} ${pt(hcx + 50, hcy - 46)} Q${pt(hcx + 30, hcy - 70)} ${pt(hcx, hcy - 52)} Q${pt(hcx - 30, hcy - 70)} ${pt(hcx - 50, hcy - 46)} Q${pt(hcx - 80, hcy - 44)} ${pt(hcx - 99, hcy - 10)} Z`
        : `M${pt(hcx - 99, hcy - 8)} A100,100 0 0 1 ${pt(hcx + 99, hcy - 8)} Q${pt(hcx + 90, hcy - 40)} ${pt(hcx + 60, hcy - 54)} Q${pt(hcx + 10, hcy - 46)} ${pt(hcx - 28, hcy - 70)} Q${pt(hcx - 70, hcy - 50)} ${pt(hcx - 99, hcy - 8)} Z`}
        fill={L.hair} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <path d={`M${pt(hcx - 46, hcy - 82)} Q${pt(hcx - 10, hcy - 96)} ${pt(hcx + 30, hcy - 88)}`} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={6} strokeLinecap="round" />
    </g>
  );
  const eyeX = 34, eyeY = fy - 18;
  const lx = pose.lookX ?? 0, ly = pose.lookY ?? 0, bl = pose.blink ?? 0;
  const browY = eyeY - 30 + e.brow;
  const mouthK: MouthK = pose.mouth ?? e.mouth;
  const face = (
    <g style={{ ["--skin" as string]: skin } as React.CSSProperties}>
      {L.stubble && <path d={`M${pt(hcx - 80, hcy + 34)} Q${pt(hcx - 58, hcy + 97)} ${pt(hcx, hcy + 99)} Q${pt(hcx + 58, hcy + 97)} ${pt(hcx + 80, hcy + 34)} Q${pt(hcx + 52, hcy + 80)} ${pt(hcx, hcy + 82)} Q${pt(hcx - 52, hcy + 80)} ${pt(hcx - 80, hcy + 34)} Z`} fill={L.stubble} opacity={0.38} />}
      {L.lashes && bl < 0.6 && !["happy", "squint", "closed"].includes(e.eyes) && [-1, 1].map((sd) => {
        const ex2 = fx + sd * eyeX * (1 - Math.abs(fc) * 0.15);
        return <path key={`la${sd}`} d={`M${pt(ex2 + sd * 6, eyeY - 8)} l${sd * 9},-6 M${pt(ex2 + sd * 2, eyeY - 10)} l${sd * 6},-8`} stroke={INK} strokeWidth={3.5} strokeLinecap="round" />;
      })}
      {(e.blush ?? 0) > 0 && [-1, 1].map((sd) => <ellipse key={sd} cx={fx + sd * 50} cy={eyeY + 26} rx={17} ry={9} fill={BLUSH} opacity={e.blush} />)}
      {[-1, 1].map((sd) => (
        <Eye key={sd} k={pose.wink && sd > 0 ? "happy" : e.eyes} x={fx + sd * eyeX * (1 - Math.abs(fc) * 0.15)} y={eyeY} side={sd} lx={lx} ly={ly} blink={bl} />
      ))}
      {[-1, 1].map((sd) => {
        const bx = fx + sd * eyeX * (1 - Math.abs(fc) * 0.15), t = rad(sd * e.browTilt);
        const x0 = bx - sd * 15, x1 = bx + sd * 15, y0 = browY + Math.sin(t) * -15, y1 = browY + Math.sin(t) * 15;
        return <path key={`b${sd}`} d={`M${pt(x0, y0)} Q${pt(bx, browY - 5)} ${pt(x1, y1)}`} fill="none" stroke={L.brows} strokeWidth={7.5} strokeLinecap="round" />;
      })}
      {L.glasses && [-1, 1].map((sd) => {
        const gx = fx + sd * eyeX * (1 - Math.abs(fc) * 0.15);
        return <circle key={`g${sd}`} cx={gx} cy={eyeY} r={21} fill="rgba(220,235,255,0.18)" stroke="#5c4a30" strokeWidth={3.5} />;
      })}
      {L.glasses && <path d={`M${pt(fx - 14, eyeY - 3)} Q${pt(fx, eyeY - 9)} ${pt(fx + 14, eyeY - 3)}`} fill="none" stroke="#5c4a30" strokeWidth={3.5} />}
      {/* nose: a small soft curve */}
      <path d={`M${pt(fx + fc * 8 - 6, eyeY + 24)} Q${pt(fx + fc * 8, eyeY + 28)} ${pt(fx + fc * 8 + 6, eyeY + 23)}`} fill="none" stroke={SKIN_SH} strokeWidth={4} strokeLinecap="round" />
      {L.mustache === "walrus" && (
        <path d={`M${pt(fx - 34, eyeY + 48)} Q${pt(fx - 30, eyeY + 28)} ${pt(fx - 4, eyeY + 32)} Q${pt(fx, eyeY + 30)} ${pt(fx + 4, eyeY + 32)} Q${pt(fx + 30, eyeY + 28)} ${pt(fx + 34, eyeY + 48)} Q${pt(fx + 18, eyeY + 42)} ${pt(fx, eyeY + 44)} Q${pt(fx - 18, eyeY + 42)} ${pt(fx - 34, eyeY + 48)} Z`}
          fill={L.hair} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      )}
      {mouthPath(mouthK, fx + fc * 4, eyeY + (L.mustache === "walrus" ? 58 : 52), 1)}
      {L.mustache === "pencil" && [-1, 1].map((sd) => (
        <path key={`m${sd}`} d={`M${pt(fx + sd * 3, eyeY + 37)} Q${pt(fx + sd * 16, eyeY + 33)} ${pt(fx + sd * 27, eyeY + 40)} Q${pt(fx + sd * 15, eyeY + 39)} ${pt(fx + sd * 3, eyeY + 42)} Z`}
          fill={L.hair} stroke={L.hair} strokeWidth={2} strokeLinejoin="round" />
      ))}
      {e.sweat && <path d={`M${pt(headC.x + 70, headC.y - 50)} q8,14 0,20 q-8,-6 0,-20 Z`} fill="#a7d8ff" stroke={INK} strokeWidth={3} />}
    </g>
  );
  const head = (
    <g transform={`rotate(${P(tilt)} ${P(headC.x)} ${P(headC.y + R)})`}>
      {/* ears */}
      {[-1, 1].map((sd) => (
        <g key={`e${sd}`}>
          <ellipse cx={headC.x + sd * (R - 4) - fc * 10} cy={headC.y + 8} rx={17} ry={21} fill={skin} stroke={INK} strokeWidth={5.5} />
          <path d={`M${pt(headC.x + sd * (R - 2) - fc * 10, headC.y)} q${-sd * 6},8 0,16`} fill="none" stroke={SKIN_SH} strokeWidth={4} strokeLinecap="round" />
        </g>
      ))}
      {hairBack}
      <circle cx={headC.x} cy={headC.y} r={R} fill={`url(#skin${id})`} stroke={INK} strokeWidth={6.5} />
      {hairFront}
      {/* hair at the sides under the hat */}
      {(L.hat === "bowler" || L.hat === "homburg") && [-1, 1].map((sd) => (
        <path key={`h${sd}`} d={`M${pt(headC.x + sd * 74, headC.y - 66)} Q${pt(headC.x + sd * 98, headC.y - 30)} ${pt(headC.x + sd * 92, headC.y + (L.sideburns ? 22 : -2))} Q${pt(headC.x + sd * 80, headC.y - 24)} ${pt(headC.x + sd * 60, headC.y - 56)} Z`}
          fill={L.hair} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      ))}
      {(pose.hatLift ?? 0) > 0.02 && (
        <path d={`M${pt(headC.x - 90, headC.y - 42)} A100,100 0 0 1 ${pt(headC.x + 90, headC.y - 42)} Q${pt(headC.x + 40, headC.y - 70)} ${pt(headC.x - 10, headC.y - 60)} Q${pt(headC.x - 50, headC.y - 66)} ${pt(headC.x - 90, headC.y - 42)} Z`}
          fill={L.hair} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      )}
      {(pose.hatLift ?? 0) > 0.02 && <path d={`M${pt(headC.x - 40, headC.y - 88)} Q${pt(headC.x, headC.y - 98)} ${pt(headC.x + 36, headC.y - 86)}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={5} strokeLinecap="round" />}
      {face}
      <g transform={`translate(${P(-6 * (pose.hatLift ?? 0))},${P(-34 * (pose.hatLift ?? 0))}) rotate(${P(-12 * (pose.hatLift ?? 0))} ${P(headC.x)} ${P(headC.y - 60)})`}>{hatEl()}</g>
    </g>
  );
  // does the back hand end up over the chest? then that arm is in front of the body
  const across = (() => { const a1 = rad(aB), a2 = a1 + rad(eB); return -(tw - 8) + Math.sin(a1) * 34 + Math.sin(a2) * 41 > -(tw - 22); })();
  const flipT = flip ? -1 : 1;
  return (
    <g transform={`translate(${P(x)},${P(y)}) scale(${P(flipT * s / 1)},${P(s)})`}>
      <defs>
        <radialGradient id={`skin${id}`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fbecd8" />
          <stop offset="0.6" stopColor={skin} />
          <stop offset="1" stopColor={SKIN_SH} />
        </radialGradient>
        <linearGradient id={`hatg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={L.hatCol} />
          <stop offset="1" stopColor="#111014" />
        </linearGradient>
        <linearGradient id={`suit${id}`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor={L.suit} />
          <stop offset="0.75" stopColor={L.suit} />
          <stop offset="1" stopColor={L.suitDark} />
        </linearGradient>
        <clipPath id={clip}><path d={torso} /></clipPath>
        <pattern id={`pin${id}`} width="9" height="9" patternUnits="userSpaceOnUse">
          <line x1="4" y1="0" x2="4" y2="9" stroke={L.pin ?? "transparent"} strokeWidth="1.6" />
        </pattern>
        <pattern id={`chk${id}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M0,4 H16 M4,0 V16" stroke={L.check ?? "transparent"} strokeWidth="2.2" />
        </pattern>
      </defs>
      {shadow && <ellipse cx={0} cy={2} rx={62 + stout * 14} ry={11} fill="rgba(30,20,40,0.32)" />}
      <g transform={`rotate(${P(lean)} 0 ${P(hipY)})`}>
        {!across && arm(-1, aB, eB, false)}
        {legEl(0, false)}
        {legEl(1, true)}
        {L.top === "hoodie" && <path d={`M${pt(-tw - 4, torsoTop + 16)} Q${pt(-tw, torsoTop - 34)} ${pt(0, torsoTop - 30)} Q${pt(tw, torsoTop - 34)} ${pt(tw + 4, torsoTop + 16)} Z`} fill={L.suitDark} stroke={INK} strokeWidth={6} strokeLinejoin="round" />}
        <path d={torso} fill={`url(#suit${id})`} />
        <g clipPath={`url(#${clip})`}>
          <rect x={-bw - 10} y={torsoTop - 10} width={2 * bw + 20} height={200} fill={`url(#pin${id})`} />
          <rect x={-bw - 10} y={torsoTop - 10} width={2 * bw + 20} height={200} fill={`url(#chk${id})`} />
          {(L.top ?? "suit") !== "suit" && (
            <g>
              {L.top === "tee" && <path d={`M${pt(cx - 22, torsoTop - 4)} Q${pt(cx, torsoTop + 22)} ${pt(cx + 22, torsoTop - 4)} Z`} fill={skin} stroke={INK} strokeWidth={3.5} />}
              {L.top === "sweater" && <path d={`M${pt(cx - 26, torsoTop - 4)} Q${pt(cx, torsoTop + 18)} ${pt(cx + 26, torsoTop - 4)}`} fill="none" stroke={L.suitDark} strokeWidth={9} />}
              {L.top === "hoodie" && (
                <g>
                  <path d={`M${pt(cx - 16, torsoTop - 2)} L${pt(cx, torsoTop + 22)} L${pt(cx + 16, torsoTop - 2)} Z`} fill={L.shirt} stroke={INK} strokeWidth={3} />
                  {[-1, 1].map((sd) => <path key={sd} d={`M${pt(cx + sd * 10, torsoTop + 10)} L${pt(cx + sd * 13, torsoTop + 46)}`} stroke="#f4efe6" strokeWidth={3.5} strokeLinecap="round" />)}
                  <path d={`M${pt(cx - 34, torsoBot - 36)} L${pt(cx + 34, torsoBot - 36)} L${pt(cx + 44, torsoBot - 6)} L${pt(cx - 44, torsoBot - 6)} Z`} fill={L.suitDark} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
                </g>
              )}
              {L.print && <g transform={`translate(${P(cx)},${P(torsoTop + 52)})`}><circle r={15} fill={L.print} stroke={INK} strokeWidth={3} /><path d="M-7,-2 L0,6 L8,-6" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" /></g>}
              <path d={`M${pt(-bw, torsoBot - 6)} L${pt(bw, torsoBot - 6)}`} stroke="rgba(0,0,0,0.2)" strokeWidth={6} />
            </g>
          )}
          {(L.top ?? "suit") === "suit" && <g>
          {/* waistcoat V, shirt V, tie */}
          <path d={`M${pt(cx - 30, vTop)} L${pt(cx, vBot + 12)} L${pt(cx + 30, vTop)} Z`} fill={L.vest} stroke={INK} strokeWidth={3} />
          <path d={`M${pt(cx - 18, vTop)} L${pt(cx, vBot - 6)} L${pt(cx + 18, vTop)} Z`} fill={L.shirt} stroke={INK} strokeWidth={3} />
          <path d={`M${pt(cx - 6, vTop + 4)} L${pt(cx + 6, vTop + 4)} L${pt(cx + 8, vBot - 14)} L${pt(cx, vBot - 4)} L${pt(cx - 8, vBot - 14)} Z`} fill={L.tie} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
          {/* lapels */}
          {[-1, 1].map((sd) => (
            <path key={`l${sd}`} d={`M${pt(cx + sd * 30, vTop - 2)} L${pt(cx + sd * 4, vBot + 14)} L${pt(cx + sd * 22, vBot - 6)} L${pt(cx + sd * 40, vTop + 12)} Z`} fill={L.suitDark} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          ))}
          {[0, 1].map((i) => <circle key={`bt${i}`} cx={cx + 3} cy={vBot + 22 + i * 16} r={4} fill="#1a1820" />)}
          {L.chain && <path d={`M${pt(cx + 8, vBot + 6)} Q${pt(cx + 26, vBot + 22)} ${pt(cx + 38, vBot + 4)}`} fill="none" stroke="#e6c25a" strokeWidth={2.8} />}
          {/* pocket square */}
          <path d={`M${pt(cx - 40, vTop + 30)} l10,-8 l6,8 l6,-6 l2,8 Z`} fill="#f4efe0" stroke={INK} strokeWidth={2} />
          </g>}
          <path d={`M${pt(-bw, torsoBot - 12)} L${pt(bw, torsoBot - 12)}`} stroke="rgba(0,0,0,0.18)" strokeWidth={3} />
        </g>
        <path d={torso} fill="none" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        {L.flower && (
          <g transform={`translate(${P(cx + 30)},${P(vTop + 22)})`}>
            {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx={0} cy={-6} rx={5} ry={7} transform={`rotate(${r})`} fill={L.flower} stroke={INK} strokeWidth={2} />)}
            <circle r={3.5} fill="#ffd2d4" />
          </g>
        )}
        {across && arm(-1, aB, eB, false)}
        {arm(1, aF, eF, true)}
        {head}
      </g>
    </g>
  );
};
