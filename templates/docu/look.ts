// The documentary look ("ink and lamplight"): each figure is painted on its own layer with soft interior lines, then
// lit as one form (a warm key gradient from the light side, a cool shadow on the other), shaded with fine engraving
// hatching in the shadow, and finally given one bold, slightly varying ink contour around the whole silhouette.
// A paper grain is laid over the finished frame. Everything is plain Canvas 2D, deterministic per frame.
type Ctx = CanvasRenderingContext2D;

const pool = new Map<string, HTMLCanvasElement>();
const cv = (key: string, w: number, h: number) => {
  let c = pool.get(key);
  if (!c) { c = document.createElement("canvas"); pool.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.filter = "none"; g.clearRect(0, 0, w, h);
  return { c, g };
};

const hatchCache = new Map<string, CanvasPattern | null>();
function hatch(g: Ctx, gap: number, ang: number, col: string, w: number) {
  const key = `${gap}|${ang}|${col}|${w}`;
  if (hatchCache.has(key)) return hatchCache.get(key)!;
  const s = 64, t = document.createElement("canvas"); t.width = t.height = s; const h = t.getContext("2d")!;
  h.strokeStyle = col; h.lineWidth = w; h.lineCap = "round";
  // lines at 45 deg wrap seamlessly in a square tile
  for (let i = -s; i < s * 2; i += gap) { h.beginPath(); h.moveTo(i, 0); h.lineTo(i + s, s); h.stroke(); }
  const pat = g.createPattern(t, "repeat"); if (pat && ang) pat.setTransform(new DOMMatrix().rotate(ang)); hatchCache.set(key, pat); return pat;
}

export type LightOpts = {
  box: [number, number, number, number];   // figure bounds in pixels (x0, y0, x1, y1)
  key?: number;                            // -1 light from the left, +1 from the right
  warm?: string; cool?: string;            // key tint and shadow tint
  ink?: string; contour?: number;          // outer contour colour and width in px
  hatchGap?: number; hatchCol?: string; hatchAmt?: number;
  rim?: string;                            // a thin rim of light on the key side
  shadowAmt?: number;
};

/** paint one figure (or a group) as a lit, inked layer onto g. draw() paints in pixel space onto the layer. */
export function litLayer(g: Ctx, W: number, H: number, draw: (fg: Ctx) => void, o: LightOpts, id = "f") {
  const F = cv("F" + id, W, H); draw(F.g);
  const [x0, y0, x1, y1] = o.box, key = o.key ?? -1;
  const ax = key < 0 ? x0 : x1, bx = key < 0 ? x1 : x0;
  // 1) light as one form: multiply a cool shadow gradient across the figure
  const T = cv("T" + id, W, H);
  const gr = T.g.createLinearGradient(ax, y0, bx, y0 + (y1 - y0) * 0.35);
  gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.45, "#f3eee8"); gr.addColorStop(0.62, o.cool ?? "#9aa3b8"); gr.addColorStop(1, shadeHex(o.cool ?? "#9aa3b8", 0.82));
  T.g.fillStyle = gr; T.g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  // a soft top-down falloff (faces and shoulders catch the light, legs sit lower in tone)
  const vg = T.g.createLinearGradient(0, y0, 0, y1); vg.addColorStop(0, "rgba(255,255,255,0)"); vg.addColorStop(1, `rgba(40,40,60,${0.22 * (o.shadowAmt ?? 1)})`);
  T.g.fillStyle = vg; T.g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  T.g.globalCompositeOperation = "destination-in"; T.g.drawImage(F.c, 0, 0);
  F.g.globalCompositeOperation = "multiply"; F.g.drawImage(T.c, 0, 0);
  // 2) engraving hatching in the shadow half
  const Hh = cv("H" + id, W, H);
  const pat = hatch(Hh.g, o.hatchGap ?? 7, key < 0 ? 0 : 90, o.hatchCol ?? "rgba(30,24,30,0.55)", 1.1);
  if (pat) { Hh.g.fillStyle = pat; Hh.g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  const m = Hh.g.createLinearGradient(ax, 0, bx, 0); m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(0.55, "rgba(0,0,0,0)"); m.addColorStop(0.8, `rgba(0,0,0,${0.7 * (o.hatchAmt ?? 1)})`); m.addColorStop(1, `rgba(0,0,0,${o.hatchAmt ?? 1})`);
  Hh.g.globalCompositeOperation = "destination-in"; Hh.g.fillStyle = m; Hh.g.fillRect(0, 0, W, H); Hh.g.drawImage(F.c, 0, 0);
  F.g.globalCompositeOperation = "multiply"; F.g.drawImage(Hh.c, 0, 0);
  // 3) warm key: a screen pass on the lit side
  const K = cv("K" + id, W, H);
  const kg = K.g.createLinearGradient(ax, y0, bx, y0); kg.addColorStop(0, o.warm ?? "rgba(255,196,120,0.45)"); kg.addColorStop(0.45, "rgba(255,196,120,0)");
  K.g.fillStyle = kg; K.g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  K.g.globalCompositeOperation = "destination-in"; K.g.drawImage(F.c, 0, 0);
  F.g.globalCompositeOperation = "screen"; F.g.drawImage(K.c, 0, 0);
  F.g.globalCompositeOperation = "source-over";
  // 4) one bold outer contour: stamp an ink-tinted copy around a ring, then the figure on top
  const C = cv("C" + id, W, H); C.g.drawImage(F.c, 0, 0); C.g.globalCompositeOperation = "source-in"; C.g.fillStyle = o.ink ?? "#1b1418"; C.g.fillRect(0, 0, W, H);
  const r = o.contour ?? 3;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.drawImage(C.c, Math.cos(a) * r, Math.sin(a) * r * 0.92 + r * 0.15); }
  // 5) rim light: the key-side edge, a figure copy minus itself shifted away from the light
  if (o.rim) {
    const R = cv("R" + id, W, H); R.g.drawImage(F.c, 0, 0); R.g.globalCompositeOperation = "source-in"; R.g.fillStyle = o.rim; R.g.fillRect(0, 0, W, H);
    R.g.globalCompositeOperation = "destination-out"; R.g.drawImage(F.c, -key * r * 1.4, r * 0.4);
    g.drawImage(F.c, 0, 0); g.drawImage(R.c, 0, 0);
  } else g.drawImage(F.c, 0, 0);
}

export const shadeHex = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16); const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
  return "#" + ((1 << 24) + (f((n >> 16) & 255) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
};

/** paper grain + a faint vignette over the whole frame (static grain, shifted a little per frame so it breathes) */
let grain: HTMLCanvasElement | null = null;
export function paperGrain(g: Ctx, W: number, H: number, frame: number, amt = 1) {
  if (!grain) {
    grain = document.createElement("canvas"); grain.width = 512; grain.height = 512; const q = grain.getContext("2d")!;
    const im = q.createImageData(512, 512); let s = 12345;
    for (let i = 0; i < im.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = 128 + ((s % 1000) / 1000 - 0.5) * 70; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    q.putImageData(im, 0, 0);
    // fibres
    q.globalAlpha = 0.08; q.strokeStyle = "#000"; for (let i = 0; i < 260; i++) { s = (s * 16807) % 2147483647; const x = s % 512; s = (s * 16807) % 2147483647; const y = s % 512; q.beginPath(); q.moveTo(x, y); q.lineTo(x + 6 + (s % 14), y + ((s >> 3) % 5) - 2); q.stroke(); }
  }
  g.save(); g.globalCompositeOperation = "overlay"; g.globalAlpha = 0.22 * amt;
  const pat = g.createPattern(grain, "repeat")!; const ox = (frame * 37) % 512, oy = (frame * 91) % 512;
  pat.setTransform(new DOMMatrix().translate(-ox, -oy)); g.fillStyle = pat; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "multiply"; g.globalAlpha = 1;
  const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H * 0.5, H * 0.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(40,30,30,${0.45 * amt})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H); g.restore();
}
