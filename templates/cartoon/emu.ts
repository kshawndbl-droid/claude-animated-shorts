// 2D cartoon emu: shaggy feather body, long bendy neck with a lagging head (follow-through), big googly eyes, short
// beak, long backward-kneed legs with a springy run (squash on contact, stretch in the air), a tiny wing for gestures.
// Deterministic like figure.ts: springs are replayed from the pose function (settleEmu).
import { rng } from "../bridge/paint";
import { shadeOf } from "./figure";

export type EmuFace = "neutral" | "smug" | "shock" | "happy" | "angry" | "curious" | "proud";
export type EmuPose = {
  run?: number; phase?: number; neck?: number;   // neck: -1 tucked .. 0 upright .. 1 stretched forward
  peck?: number;                                  // 0..1 head down to the ground
  tall?: number;                                  // 0..1 lookout stretch (neck straight up, on tiptoe)
  headTilt?: number; look?: number; face?: EmuFace; beak?: number; bounce?: number; squash?: number; wing?: number; // wing 0..1 raised
  wingTap?: number;                               // 0..1 tapping its head with the wing tip
  medal?: boolean; scale?: number;
};
export type Emu = { seed: number; P: EmuPose; sp: Record<string, { x: number; v: number }>; body: string; neck: string };
type Ctx = CanvasRenderingContext2D;
const INK = "#16121c";

export const makeEmu = (seed = 0): Emu => {
  const r = rng(seed + 3);
  const bodies = ["#6b5646", "#5e4c3f", "#776050", "#584638"];
  return { seed, P: {}, sp: {}, body: bodies[Math.floor(r() * bodies.length)], neck: r() > 0.5 ? "#7f93b0" : "#8a9bb5" };
};
const spring = (p: Emu, key: string, target: number, reset: boolean, k = 170, d = 13) => {
  let s = p.sp[key];
  if (!s || reset) { s = p.sp[key] = { x: target, v: 0 }; return s; }
  const h = 1 / 60;
  for (let i = 0; i < 2; i++) { s.v += (k * (target - s.x) - d * s.v) * h; s.x += s.v * h; }
  return s;
};
function emuSprings(e: Emu, reset: boolean) {
  const P = e.P, run = P.run ?? 0, ph = (P.phase ?? 0) * Math.PI * 2;
  const neck = spring(e, "neck", (P.neck ?? 0) + run * 0.55, reset, 120, 11);
  const peck = spring(e, "peck", P.peck ?? 0, reset, 220, 16);
  const tall = spring(e, "tall", P.tall ?? 0, reset, 110, 12);
  const bounce = spring(e, "bounce", P.bounce ?? 0, reset, 260, 14);
  const wing = spring(e, "wing", P.wing ?? 0, reset, 200, 12);
  const tap = spring(e, "tap", P.wingTap ?? 0, reset, 200, 14);
  // follow-through: the head lags the neck swing, the feathers lag the bounce
  const headLag = spring(e, "headLag", -(neck.v * 0.05) + (run ? Math.sin(ph * 2 - 1.1) * 0.16 * run : 0), reset, 80, 7);
  const fluff = spring(e, "fluff", (run ? Math.cos(ph * 2) * 0.05 : 0) - bounce.v * 0.06, reset, 70, 6);
  return { run, ph, neck: neck.x, peck: peck.x, tall: tall.x, bounce: { ...bounce }, wing: wing.x, tap: tap.x, headLag: headLag.x, fluff: fluff.x };
}
type ESt = ReturnType<typeof emuSprings>;
export function settleEmu(e: Emu, poseAt: (t: number) => EmuPose, t: number, t0 = -1e9): ESt {
  const n = Math.max(0, Math.min(45, Math.floor((t - t0) * 30 + 1e-6)));
  let st!: ESt;
  for (let i = n; i >= 0; i--) { e.P = poseAt(t - i / 30); st = emuSprings(e, i === n); }
  return st;
}

function fo(g: Ctx, path: Path2D, col: string, OL: number, inside?: () => void) {
  g.strokeStyle = INK; g.lineWidth = OL * 2; g.stroke(path); g.fillStyle = col; g.fill(path);
  if (inside) { g.save(); g.clip(path); inside(); g.restore(); }
}

/** draw at the current transform: metres, y up, origin between the feet; side view faces +x (dir -1 mirrors) */
export function drawEmu(g: Ctx, e: Emu, st: ESt, t: number, view: "side" | "front" | "back", dir: number, lightSide: number, OL: number) {
  const P = e.P, r = rng(e.seed + 9), ph0 = r() * 10;
  g.save(); if (view === "side" && dir < 0) g.scale(-1, 1);
  g.lineJoin = "round"; g.lineCap = "round";
  const ls = view === "side" ? lightSide * dir : lightSide;
  const { run, ph, neck, peck, tall, bounce, wing, tap, headLag, fluff } = st;
  // bob / squash / stretch
  let bob = Math.sin(t * 2.4 + ph0) * 0.008, sq = (P.squash ?? 0) - bounce.v * 0.02 + bounce.x * 0.5;
  if (run) { const c2 = Math.cos(ph * 2); bob += (0.5 - 0.5 * c2) * 0.14 * run; sq += (-0.09 * Math.max(0, c2) ** 3 + 0.07 * Math.max(0, -c2)) * run; }
  bob += bounce.x + tall * 0.12;
  const sy = 1 + sq, sx = 1 / Math.sqrt(Math.max(0.6, sy));
  const body = e.body, bodyD = shadeOf(body, 0.7), skin = e.neck;
  const legC = "#5d6470";
  const bodyY = 1.02;

  // ---------- legs ----------
  const leg = (x0: number, th: number, lift: number, far: boolean) => {
    const H: [number, number] = [x0, bodyY - 0.18 + bob];
    // backward knee: the "knee" (ankle) sits behind the line, then the shank goes down-forward to the foot
    const K: [number, number] = [H[0] + Math.sin(th) * 0.38 - 0.1, H[1] - 0.42 + lift * 0.18];
    let F: [number, number] = [K[0] + Math.sin(th * 1.2) * 0.32 + 0.06 + lift * 0.12, Math.max(0, K[1] - 0.46 + lift * 0.3)];
    if (!run) F = [F[0], 0];
    const c = far ? shadeOf(legC, 0.8) : legC;
    g.strokeStyle = INK; g.lineWidth = 0.075 + OL * 2; g.beginPath(); g.moveTo(...H); g.lineTo(...K); g.lineTo(...F); g.stroke();
    g.strokeStyle = c; g.lineWidth = 0.075; g.beginPath(); g.moveTo(...H); g.lineTo(...K); g.lineTo(...F); g.stroke();
    // three toes
    for (const a of [-0.5, 0, 0.5]) {
      const tx = F[0] + Math.cos(a) * 0.14 * (view === "side" ? 1 : 0.6), ty = F[1] + Math.sin(a) * 0.02 - 0.01;
      g.strokeStyle = INK; g.lineWidth = 0.05 + OL * 1.6; g.beginPath(); g.moveTo(...F); g.lineTo(tx, ty); g.stroke();
      g.strokeStyle = c; g.lineWidth = 0.05; g.beginPath(); g.moveTo(...F); g.lineTo(tx, ty); g.stroke();
    }
  };
  g.save(); g.scale(sx, sy);
  if (view === "side") {
    const sw = Math.sin(ph) * 0.75 * run;
    const lf = (s: number) => run * Math.max(0, Math.sin(ph + s)) ;
    leg(-0.04, -sw, lf(Math.PI), true); leg(0.04, sw, lf(0), false);
  } else {
    const lf = (s: number) => run * Math.max(0, Math.sin(ph + s)) * 0.6;
    for (const s of [-1, 1]) { g.save(); g.translate(s * 0.17, 0); leg(0, 0, lf(s > 0 ? 0 : Math.PI), false); g.restore(); }
  }

  // ---------- body: a shaggy feather mop ----------
  const bw = view === "side" ? 0.56 : 0.42, bh = 0.36;
  const bx = view === "side" ? -0.06 : 0, by = bodyY + bob;
  const shag = new Path2D();
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const under = Math.sin(a) < -0.1;   // lower half: long hanging feathers
    const rr = 1 + (under ? 0.22 + 0.12 * ((i % 2) ? 1 : -0.4) + fluff * (i % 3 - 1) : 0.03 * ((i % 2) ? 1 : -1));
    const x = bx + Math.cos(a) * bw * rr - (view === "side" ? Math.max(0, -Math.cos(a)) * 0.08 * Math.max(0, -Math.sin(a)) : 0);
    const y = by + Math.sin(a) * bh * rr * (under ? 1.15 : 1);
    i ? shag.lineTo(x, y) : shag.moveTo(x, y);
  }
  shag.closePath();
  g.save(); g.lineJoin = "round";
  fo(g, shag, body, OL, () => {
    // feather scallops
    g.strokeStyle = bodyD; g.lineWidth = 0.025;
    for (let i = 0; i < 16; i++) {
      const rr2 = rng(e.seed * 7 + i); const x = bx + (rr2() - 0.5) * bw * 1.6, y = by + (rr2() - 0.4) * bh * 1.5;
      g.beginPath(); g.moveTo(x - 0.06, y + 0.03); g.quadraticCurveTo(x, y - 0.06 + fluff * 0.3, x + 0.06, y + 0.03); g.stroke();
    }
    g.fillStyle = "rgba(40,30,90,0.22)"; g.beginPath(); g.ellipse(bx - ls * bw * 0.9, by - bh * 0.6, bw * 1.1, bh * 1.2, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(255,245,225,0.14)"; g.beginPath(); g.ellipse(bx + ls * bw * 0.35, by + bh * 0.45, bw * 0.35, bh * 0.22, 0, 0, 7); g.fill();
  });
  g.restore();
  // tiny wing
  const wingPath = (wx: number, wy: number, ang: number) => {
    const w = new Path2D(); g.save(); g.translate(wx, wy); g.rotate(ang);
    w.moveTo(0, 0); w.quadraticCurveTo(0.12, -0.05, 0.22, -0.12); w.quadraticCurveTo(0.1, -0.12, 0, -0.06); w.closePath();
    fo(g, w, bodyD, OL * 0.8); g.restore();
  };

  // ---------- neck + head ----------
  // neck base at the front of the body; tip position from upright/forward/peck/tall
  const nb: [number, number] = view === "side" ? [bx + bw * 0.62, by + bh * 0.35] : [0, by + bh * 0.6];
  const len = 0.62 + tall * 0.35;
  const fwd = view === "side" ? neck * 0.55 + peck * 0.55 : 0;
  let hx = nb[0] + Math.sin(fwd) * len * (view === "side" ? 1 : 0), hy = nb[1] + Math.cos(fwd) * len;
  if (peck > 0) { hx = hx * (1 - peck) + (nb[0] + 0.45) * peck; hy = hy * (1 - peck) + 0.12 * peck; }
  const ctrl: [number, number] = view === "side" ? [nb[0] + 0.05 - neck * 0.05, (nb[1] + hy) / 2 + 0.05] : [Math.sin(t * 1.3 + ph0) * 0.04, (nb[1] + hy) / 2];
  const neckW = 0.11;
  g.strokeStyle = INK; g.lineWidth = neckW + OL * 2; g.beginPath(); g.moveTo(...nb); g.quadraticCurveTo(...ctrl, hx, hy); g.stroke();
  g.strokeStyle = skin; g.lineWidth = neckW; g.beginPath(); g.moveTo(...nb); g.quadraticCurveTo(...ctrl, hx, hy); g.stroke();
  // fluffy neck collar where the neck meets the body
  const collar = new Path2D(); collar.ellipse(nb[0] - (view === "side" ? 0.03 : 0), nb[1] + 0.02, 0.13, 0.1, 0, 0, 7); fo(g, collar, body, OL * 0.8);
  if (P.medal) {
    const mx = view === "side" ? nb[0] - 0.05 : 0, my = nb[1] - 0.12;
    g.strokeStyle = "#c8392f"; g.lineWidth = 0.05; g.beginPath(); g.moveTo(mx - 0.1, my + 0.14); g.lineTo(mx, my); g.lineTo(mx + 0.1, my + 0.14); g.stroke();
    const m = new Path2D(); m.arc(mx, my - 0.03, 0.07, 0, 7); fo(g, m, "#f2c94c", OL * 0.7, () => { g.fillStyle = "#fff6c2"; g.beginPath(); g.arc(mx - 0.02, my - 0.01, 0.022, 0, 7); g.fill(); });
  }
  // wing (behind or in front depending on gesture)
  const wingAng = view === "side" ? -0.3 + wing * 1.6 + tap * 2.2 : 0;
  if (view === "side") wingPath(bx + bw * 0.15, by + bh * 0.25, wingAng);
  else { wingPath(bw * 0.85, by + bh * 0.2, -0.4 + wing * 1.2); g.save(); g.scale(-1, 1); wingPath(bw * 0.85, by + bh * 0.2, -0.4 + wing * 1.2 + tap * 1.8); g.restore(); }

  // head
  g.save(); g.translate(hx, hy); g.rotate(-(P.headTilt ?? 0) - headLag - (view === "side" ? peck * 0.9 : 0));
  const face = P.face ?? "neutral", beakOpen = Math.max(P.beak ?? 0, face === "shock" ? 0.7 : 0);
  const head = new Path2D(); head.ellipse(0, 0.02, view === "side" ? 0.13 : 0.12, 0.12, 0, 0, 7);
  fo(g, head, skin, OL, () => { g.fillStyle = shadeOf(e.body, 0.9); g.beginPath(); g.ellipse(-0.05, 0.12, 0.13, 0.06, 0, 0, 7); g.fill(); });
  // little head tuft (lags)
  g.strokeStyle = shadeOf(e.body, 0.8); g.lineWidth = 0.03; g.beginPath(); g.moveTo(-0.02, 0.13); g.quadraticCurveTo(-0.06 - headLag * 0.4, 0.22, -0.12 - headLag * 0.8, 0.2); g.stroke();
  // beak
  const bk = view === "side" ? 0.09 : 0;
  const upper = new Path2D(); const lower = new Path2D();
  if (view === "side") {
    upper.moveTo(0.08, 0.02); upper.quadraticCurveTo(0.2, 0.03, 0.24, -0.01 + beakOpen * 0.02); upper.lineTo(0.08, -0.02); upper.closePath();
    lower.moveTo(0.08, -0.02); lower.lineTo(0.21, -0.03 - beakOpen * 0.08); lower.lineTo(0.08, -0.05 - beakOpen * 0.03); lower.closePath();
  } else if (view === "front") {
    upper.moveTo(-0.05, -0.02); upper.lineTo(0.05, -0.02); upper.lineTo(0, -0.08 - beakOpen * 0.02); upper.closePath();
    lower.ellipse(0, -0.07 - beakOpen * 0.03, 0.03, 0.015 + beakOpen * 0.03, 0, 0, 7);
  }
  if (view !== "back") { if (beakOpen > 0.1) fo(g, lower, "#4a2e2a", OL * 0.6); fo(g, upper, "#3a3a40", OL * 0.6); }
  // eyes
  if (view !== "back") {
    const eyes = view === "side" ? [[0.03 + bk * 0.2, 0.05]] : [[-0.06, 0.04], [0.06, 0.04]];
    const big = face === "shock" ? 1.35 : 1;
    for (const [ex, ey] of eyes) {
      const ew = 0.055 * big, eh = 0.065 * big;
      const blink = ((t * 0.29 + e.seed * 0.173) % 1) < 0.03;
      if (face === "happy" || face === "proud" && (t * 0.5 + e.seed) % 2 < 0.4 || blink) {
        g.strokeStyle = INK; g.lineWidth = OL * 0.9; g.beginPath(); g.arc(ex, ey - 0.01, ew, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); continue;
      }
      const eye = new Path2D(); eye.ellipse(ex, ey, ew, eh, 0, 0, 7);
      fo(g, eye, "#ffffff", OL * 0.6, () => {
        const lx = (P.look ?? 0.4) * 0.018 * (view === "side" ? 1 : 0);
        const pr = face === "shock" ? 0.017 : 0.026;
        g.fillStyle = "#c2552d"; g.beginPath(); g.arc(ex + lx, ey - 0.005, pr * 1.55, 0, 7); g.fill();   // emus have orange-red irises
        g.fillStyle = INK; g.beginPath(); g.arc(ex + lx, ey - 0.005, pr, 0, 7); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + lx + 0.008, ey + 0.01, pr * 0.4, 0, 7); g.fill();
        const lid = face === "smug" || face === "proud" ? 0.5 : face === "angry" ? 0.42 : face === "curious" ? 0.15 : 0;
        if (lid) { g.fillStyle = skin; g.fillRect(ex - 0.1, ey + eh - eh * 2 * lid, 0.2, 0.2); g.strokeStyle = INK; g.lineWidth = OL * 0.7; g.beginPath(); g.moveTo(ex - ew, ey + eh - eh * 2 * lid + (face === "angry" ? 0.015 : 0)); g.lineTo(ex + ew, ey + eh - eh * 2 * lid - (face === "angry" ? 0.015 : 0)); g.stroke(); }
      });
    }
  }
  g.restore();
  g.restore();
  g.restore();
}
