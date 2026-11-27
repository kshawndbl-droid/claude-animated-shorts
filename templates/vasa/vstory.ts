// "The Vasa, 1628": timeline of the short, built only from the approved narration's real word timings
// (stories/vasa/words.json). Everything here is a pure function of time, so any frame renders on its own.
// World layout (metres): harbour water at y = 0, ship's bow toward +x, starboard = +z faces the quay (z ~ 28),
// the town and the royal palace stand behind the quay, open water toward -z. Interiors live far away on +-x.
export const FPS = 30;
export const DUR = 75.0;
export const TOTAL = Math.round(DUR * FPS);
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const lerp3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** piecewise-linear through [t, v] keys (clamped) */
export const keys = (k: [number, number][], t: number) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t < k[i][0]) return lerp(k[i - 1][1], k[i][1], smooth((t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])));
  return k[k.length - 1][1];
};

// ---------------- places ----------------
export const MOOR: V3 = [-40, 0, 12];          // the Vasa at the quay below the palace
export const SINK: V3 = [14, 0, -14];          // where she goes down
export const DIAG: V3 = [6000, 0, 0];          // the diagram stage
export const ROOM: V3 = [-6000, 0, 0];         // the inquiry room
export const MUSE: V3 = [9000, 0, 0];          // the museum hall
export const MUD_Y = -32;                       // harbour floor (32 m, Vasa Museum)

// ---------------- light / place per shot ----------------
export type Look = "day" | "storm" | "sink" | "diagram" | "room" | "under" | "dawn" | "museum";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: "harbour" | "diagram" | "room" | "museum"; dof?: number };
// shot boundaries in seconds, cut just before the word that starts each beat
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0.0, b: 5.25, look: "day", place: "harbour" },      // the mightiest warship in the world
  { id: 2, a: 5.25, b: 8.35, look: "day", place: "harbour" },     // it sank... (flash-forward: only the masts left)
  { id: 3, a: 8.35, b: 13.9, look: "day", place: "harbour", dof: 5 },  // Vasa, sixty-four guns, main character energy
  { id: 4, a: 13.9, b: 19.1, look: "day", place: "harbour" },     // thirty men run across her deck
  { id: 5, a: 19.1, b: 23.8, look: "day", place: "harbour" },     // she rocks so hard, the admiral stops the test
  { id: 6, a: 23.8, b: 28.8, look: "day", place: "harbour", dof: 9 },  // his big move? ...that was the plan
  { id: 7, a: 28.8, b: 34.1, look: "day", place: "harbour" },     // tenth of August: she sets sail, flags out, full aura
  { id: 8, a: 34.1, b: 38.7, look: "storm", place: "harbour" },   // a small gust tips her over, she comes back up
  { id: 9, a: 38.7, b: 40.6, look: "storm", place: "harbour" },   // then a stronger gust hits
  { id: 10, a: 40.6, b: 44.8, look: "storm", place: "harbour" },  // lower gunports wide open, the sea pours in
  { id: 11, a: 44.8, b: 50.4, look: "sink", place: "harbour" },   // she sinks; about thirty people die
  { id: 12, a: 50.4, b: 56.1, look: "diagram", place: "diagram" },// too much weight, way too high; cooked from day one
  { id: 13, a: 56.1, b: 60.5, look: "room", place: "room" },      // the inquiry: nobody was punished. No cap.
  { id: 14, a: 60.5, b: 63.8, look: "under", place: "harbour" },  // 333 years in the mud
  { id: 15, a: 63.8, b: 66.2, look: "dawn", place: "harbour" },   // 1961: lifted out
  { id: 16, a: 66.2, b: 69.9, look: "museum", place: "museum" },  // today: best-preserved 17th-century ship
  { id: 17, a: 69.9, b: DUR, look: "museum", place: "museum" },   // fumbled her first trip... and still became a legend
];
export const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];

// ---------------- the ship's motion ----------------
// stability test: three runs across the deck (port <-> starboard); the heel follows the crowd a little late
export const RUNS = [15.5, 17.4, 19.3, 21.2];   // crowd crossing starts; stopped at 22.0 by the admiral
export const crowdSide = (t: number) => {        // -1 = port rail, +1 = starboard rail
  if (t < RUNS[0]) return 1;
  for (let i = 0; i < 3; i++) if (t < RUNS[i + 1]) {
    const from = i % 2 ? -1 : 1, u = smooth((t - RUNS[i]) / 1.25);
    return lerp(from, -from, u);
  }
  return lerp(1, 0, smooth((t - RUNS[3]) / 0.9));  // after the third run they drift back to the middle
};
export const running = (t: number) => (t >= RUNS[0] && t < RUNS[3] + 0.9 ? 1 : 0);
const testHeel = (t: number) => {
  const amp = keys([[15, 2], [17.4, 4.5], [19.3, 8], [21.2, 12], [22.4, 12], [24.5, 3], [28.8, 1]], t);
  const c = crowdSide(t - 0.45);
  const wob = t > 22.0 ? Math.sin((t - 22.0) * 2.6) * Math.exp(-(t - 22.0) * 0.5) : 0;
  return -c * amp * (t > 22.0 ? 0 : 1) + wob * 11;
};

export type ShipState = { pos: V3; heel: number; pitch: number; yaw: number; ports: number; guns: number; flood: number;
  wreck: boolean; museum: boolean; sails: number; gust: number; flags: number };
const BASE: ShipState = { pos: MOOR, heel: 0, pitch: 0, yaw: 0, ports: 0, guns: 0, flood: 0, wreck: false, museum: false, sails: 0.35, gust: 0, flags: 1 };

/** where the ship is between leaving the quay (28.8 s) and going down */
export const sailPos = (t: number): V3 => {
  const u = clamp01((t - 28.8) / (44.8 - 28.8));
  const e = u * u * (3 - u) / 2;  // slow start
  return lerp3(MOOR, SINK, e);
};
const bob = (t: number, k = 1) => Math.sin(t * 1.3) * 0.6 * k;

export const shipAt = (t: number): ShipState => {
  const s = shotAt(t);
  const S: ShipState = { ...BASE, heel: bob(t) };
  if (s.id === 1) return S;
  if (s.id === 2) {            // flash-forward: only the masts left above the water, sinking a little more
    return { ...S, pos: [SINK[0], -40.5 - (t - s.a) * 0.6, SINK[2]], heel: -8, pitch: 2, ports: 1, flood: 1, sails: 0.1 };
  }
  if (s.id === 3) {            // gunports open stern to bow, then the guns roll out
    return { ...S, ports: clamp01((t - 9.0) / 2.2), guns: clamp01((t - 9.35) / 2.2) };
  }
  if (s.id >= 4 && s.id <= 6) return { ...S, heel: testHeel(t), ports: 0 };
  if (s.id === 7) return { ...S, pos: sailPos(t), sails: 0.6 + 0.4 * smooth((t - 29.5) / 2), flags: 1 + smooth((t - 32.3) / 0.5) * 0.6 };
  if (s.id >= 8 && s.id <= 10) {
    // gust 1 (34.6): heel to port, slowly back (36.2 - 37.8); gust 2 (39.4): over, the lower gunports dip under
    const g1 = keys([[34.5, 0], [35.4, 15], [36.2, 13], [37.8, 2], [38.7, 1]], t);
    const g2 = keys([[39.2, 0], [40.4, 30], [42.0, 38], [44.8, 46]], t);
    const gust = Math.max(smooth((t - 34.5) / 0.4) * (1 - smooth((t - 36.4) / 1)), smooth((t - 39.2) / 0.4));
    return { ...S, pos: sailPos(t), heel: -(g1 + g2) + bob(t, 0.3), sails: 1, gust, ports: 1, guns: 1,
      flood: smooth((t - 40.8) / 3.5), flags: 1.6 };
  }
  if (s.id === 11) {           // down in a few seconds, righting a little on the way; the masts stay above water
    const u = smooth((t - 45.0) / 5.0);
    const p = sailPos(44.8);
    return { ...S, pos: [p[0], keys([[44.8, -0.6], [46.6, -5.5], [48.6, -19], [50.4, -34]], t), p[2]], heel: lerp(-46, -14, u), pitch: lerp(0, 4, u), sails: 0.6, ports: 1, guns: 1, flood: 1, gust: 0.3 * (1 - u), flags: 1 };
  }
  if (s.id === 12) {           // diagram: rocks like a toy, then tips over on "cooked"
    const tip = smooth((t - 53.7) / 0.9);
    const rock = Math.sin((t - 50.4) * 2.4) * keys([[50.4, 3], [52.8, 9], [53.6, 14]], t);
    return { ...S, pos: DIAG, heel: lerp(rock, -78, tip), sails: 0.2, ports: 1, guns: 1, flags: 1 };
  }
  if (s.id === 13) return { ...S, pos: [ROOM[0], -200, ROOM[2]] };  // not in the room
  if (s.id === 14) return { ...S, pos: [SINK[0], MUD_Y + 4.8 - 1.2, SINK[2]], heel: 7, pitch: -2, wreck: true, flags: 0, sails: 0 };
  if (s.id === 15) {           // lifted out (1961): rising between the pontoons
    const u = smooth((t - 63.8) / 2.4);
    return { ...S, pos: [SINK[0], lerp(-8.5, -1.6, u), SINK[2]], heel: lerp(5, 2, u), wreck: true, flags: 0, sails: 0 };
  }
  return { ...S, pos: [MUSE[0], 5.6, MUSE[2]], heel: 0, wreck: true, museum: true, flags: 0, sails: 0 };
};

// ---------------- cameras ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number; local?: boolean };
type Key = { t: number; pos: V3; look: V3; fov: number; roll?: number };
const path = (ks: Key[], t: number, local = false): Cam => {
  let i = 0;
  while (i < ks.length - 2 && t >= ks[i + 1].t) i++;
  const a = ks[i], b = ks[Math.min(i + 1, ks.length - 1)];
  const u = b.t > a.t ? glide((t - a.t) / (b.t - a.t)) : 0;
  return { pos: lerp3(a.pos, b.pos, u), look: lerp3(a.look, b.look, u), fov: lerp(a.fov, b.fov, u), roll: lerp(a.roll ?? 0, b.roll ?? 0, u), local };
};
const M = MOOR;
const rel = (o: V3, d: V3): V3 => add3(o, d);

export const camAt = (t: number): Cam => {
  const s = shotAt(t);
  switch (s.id) {
    case 1: return path([  // low on the water off her port bow, slow push up toward the towering ship
      { t: 0, pos: rel(M, [70, 1.5, -62]), look: rel(M, [0, 6.5, 0]), fov: 52, roll: -0.025 },
      { t: 5.25, pos: rel(M, [60, 2.0, -53]), look: rel(M, [-2, 7.5, 0]), fov: 52, roll: -0.01 }], t);
    case 2: return path([  // smash cut: just the masts above the water
      { t: 5.25, pos: rel(SINK, [6, 2.2, -34]), look: rel(SINK, [0, 5.5, 0]), fov: 40 },
      { t: 8.35, pos: rel(SINK, [5, 2.0, -29]), look: rel(SINK, [0, 4.6, 0]), fov: 38 }], t);
    case 3: return path([  // dolly along the gun decks, then whip to a hero angle under the gilded stern
      { t: 8.35, pos: rel(M, [-20, 3.6, -15]), look: rel(M, [-8, 3.8, -5]), fov: 46 },
      { t: 11.9, pos: rel(M, [8, 3.4, -15.5]), look: rel(M, [18, 4.2, -4]), fov: 46 },
      { t: 12.25, pos: rel(M, [-40, 1.6, -15]), look: rel(M, [-22, 11, 0]), fov: 44, roll: 0.06 },
      { t: 13.9, pos: rel(M, [-37, 1.8, -13]), look: rel(M, [-22, 12, 0]), fov: 40, roll: 0.04 }], t);
    case 4: return path([  // high over the port side: thirty sailors sprinting rail to rail
      { t: 13.9, pos: rel(M, [6, 30, -21]), look: rel(M, [1, 5.5, 0.5]), fov: 44 },
      { t: 19.1, pos: rel(M, [3, 26, -18]), look: rel(M, [0, 5.5, 0.5]), fov: 42 }], t);
    case 5: return path([  // low on the water, bow-on: the masts swing like a metronome; admiral at the stern
      { t: 19.1, pos: rel(M, [62, 3.0, -6]), look: rel(M, [0, 15, 0]), fov: 38 },
      { t: 23.8, pos: rel(M, [56, 3.4, -5]), look: rel(M, [0, 14, 0]), fov: 36 }], t);
    case 6: return path([  // close on the admiral on the quarterdeck (ship-local: the camera rides the ship)
      { t: 23.8, pos: [-10.4, 10.6, -5.0], look: [-15.2, 10.3, 0], fov: 34 },
      { t: 28.8, pos: [-11.8, 10.6, -3.4], look: [-15.2, 10.45, 0], fov: 30 }], t, true);
    case 7: {              // aerial: she leaves the quay below the palace
      const p = sailPos(t);
      return path([
        { t: 28.8, pos: rel(p, [-34, 34, -62]), look: rel(p, [-6, 8, 24]), fov: 46 },
        { t: 34.1, pos: rel(p, [-18, 22, -52]), look: rel(p, [-2, 10, 18]), fov: 44 }], t);
    }
    case 8: case 9: {      // bow-on: the wind comes from screen left, she leans to screen right
      const p = sailPos(t);
      const c = path([
        { t: 34.1, pos: rel(p, [74, 5, -4]), look: rel(p, [0, 15, -2]), fov: 40 },
        { t: 40.6, pos: rel(p, [62, 4, -6]), look: rel(p, [0, 12, -4]), fov: 42 }], t);
      return { ...c, roll: -shipAt(t).heel * 0.004 };
    }
    case 10: {             // at the waterline on the port side: water rushing into the gunports
      const p = sailPos(t);
      return path([
        { t: 40.6, pos: rel(p, [19, 0.9, -15]), look: rel(p, [-2, 1.0, -6.5]), fov: 50, roll: 0.04 },
        { t: 44.8, pos: rel(p, [15, 0.8, -14]), look: rel(p, [-4, 0.6, -6.5]), fov: 46, roll: 0.02 }], t);
    }
    case 11: {             // wide and quiet: she goes down in front of the town
      const p = sailPos(44.8);
      return path([
        { t: 44.8, pos: rel(p, [-22, 3.0, -64]), look: rel(p, [-3, 8, 4]), fov: 42 },
        { t: 50.4, pos: rel(p, [-19, 2.5, -58]), look: rel(p, [-3, 5, 4]), fov: 40 }], t);
    }
    case 12: return path([ // diagram: straight from the bow, like a cross-section
      { t: 50.4, pos: rel(DIAG, [180, 12, 0]), look: rel(DIAG, [0, 11, 0]), fov: 15 },
      { t: 56.1, pos: rel(DIAG, [168, 11, 0]), look: rel(DIAG, [0, 10, 0]), fov: 15 }], t);
    case 13: {             // the inquiry: circling over the table, then everyone shrugs at us
      const a0 = -1.9 + (t - 56.1) * 0.22;
      const close = smooth((t - 58.75) / 0.35);
      const r = lerp(7.4, 6.0, close), h = lerp(6.4, 3.4, close);
      return { pos: rel(ROOM, [Math.cos(a0) * r, h, Math.sin(a0) * r]), look: rel(ROOM, [0, lerp(1.3, 1.9, close), 0]), fov: lerp(46, 50, close), roll: 0 };
    }
    case 14: return path([ // underwater: drifting down to the wreck in the mud
      { t: 60.5, pos: rel(SINK, [38, -14, -34]), look: rel(SINK, [0, -22, 0]), fov: 50 },
      { t: 63.8, pos: rel(SINK, [30, -21, -28]), look: rel(SINK, [0, -24, 0]), fov: 48 }], t);
    case 15: return path([ // 1961: she breaks the surface between the pontoons
      { t: 63.8, pos: rel(SINK, [52, 10, -26]), look: rel(SINK, [0, 0.5, 0]), fov: 44 },
      { t: 66.2, pos: rel(SINK, [44, 8.5, -22]), look: rel(SINK, [-2, 1.5, 0]), fov: 44 }], t);
    case 16: return path([ // the museum: low along the dark hull toward the gilded stern
      { t: 66.2, pos: rel(MUSE, [34, 2.4, -20]), look: rel(MUSE, [8, 13, 0]), fov: 50 },
      { t: 69.9, pos: rel(MUSE, [12, 3.4, -24]), look: rel(MUSE, [-10, 15, 0]), fov: 48 }], t);
    default: return path([ // pull back: the whole hall, the legend in the spotlight
      { t: 69.9, pos: rel(MUSE, [-34, 9, -40]), look: rel(MUSE, [-2, 15, 0]), fov: 46 },
      { t: 73.4, pos: rel(MUSE, [-40, 14, -74]), look: rel(MUSE, [0, 15, 0]), fov: 46 },
      { t: DUR, pos: rel(MUSE, [-41, 14.3, -76]), look: rel(MUSE, [0, 15, 0]), fov: 46 }], t);
  }
};

// ---------------- screen overlays ----------------
/** short dip/flash between shots: [time, colour, length s] */
export const FLASHES: [number, string, number][] = [[5.25, "#ffffff", 0.16], [12.12, "#fff6d8", 0.1], [63.8, "#ffffff", 0.14], [66.2, "#000000", 0.25]];
/** dims the picture for the deaths line: 0 = normal, 1 = full sombre */
export const sombre = (t: number) => (t < 47.6 ? 0 : t < 50.4 ? smooth((t - 47.6) / 0.8) : 0);
