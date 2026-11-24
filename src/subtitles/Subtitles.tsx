// Animated word-by-word subtitles for the new shorts (the bridge short stays caption-free).
// Timing comes only from words.json made from the real narration audio (tools/narrate.py: faster-whisper word
// timestamps matched onto the script text), so nothing here guesses when a word is spoken.
// Look: big white Montserrat ExtraBold with a black outline + soft shadow, the spoken word in the accent colour,
// key words (slang, numbers, names) in a second accent, max 2 lines, a small pop per line and per word.
// Position: lower-middle, above YouTube's bottom title/channel area and left of its right-hand button column.
import React from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, continueRender, delayRender } from "remotion";

export type Word = { w: string; s: number; e: number; line?: number };
export type SubStyle = {
  accent: string;        // the word being spoken
  key: string;           // important words when not being spoken
  keyWords: string[];    // lower-case words to mark as important
  size: number;          // px at 1080 wide
  pop: number;           // 0 = calm, 1 = bouncy
  maxChars: number;      // per subtitle line
  y: number;             // centre of the subtitle block, 0..1 of the height
  moves?: { from: number; to: number; y: number }[];  // seconds: lift the block where action is low in frame
};

// mood presets: the same design everywhere, only colour and energy follow the story
export const SUB_MOODS: Record<string, Partial<SubStyle>> = {
  funny:   { accent: "#FFD400", key: "#3DF0FF", pop: 1.0 },
  happy:   { accent: "#FFD400", key: "#FF9F1C", pop: 0.8 },
  mystery: { accent: "#FFD400", key: "#B79CFF", pop: 0.35 },
  sad:     { accent: "#FFE48A", key: "#9CC9FF", pop: 0.2 },
  serious: { accent: "#FFD400", key: "#FFFFFF", pop: 0.4 },
  action:  { accent: "#FFD400", key: "#FF4D4D", pop: 1.0 },
};

export const defaultStyle = (mood = "serious", over: Partial<SubStyle> = {}): SubStyle => ({
  accent: "#FFD400", key: "#3DF0FF", keyWords: [], size: 84, pop: 0.6, maxChars: 17, y: 0.66,
  ...SUB_MOODS[mood], ...over,
});

const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, "");
const ends = (w: string) => /[.!?]["')]*$/.test(w) || /\.\.\.$/.test(w);
const soft = (w: string) => /[,;:]$/.test(w);

export type Chunk = { lines: Word[][]; s: number; e: number };

// split the narration into readable chunks of max 2 lines: break at sentence ends, at pauses > 0.45 s,
// and at commas once a chunk has some words; keep each line within maxChars
export function chunkWords(words: Word[], maxChars: number): Chunk[] {
  const chunks: Chunk[] = [];
  let lines: Word[][] = [[]];
  const len = (l: Word[]) => l.reduce((n, w) => n + w.w.length + 1, -1);
  const flush = () => {
    const ls = lines.filter((l) => l.length);
    if (ls.length) chunks.push({ lines: ls, s: ls[0][0].s, e: ls[ls.length - 1][ls[ls.length - 1].length - 1].e });
    lines = [[]];
  };
  words.forEach((w, i) => {
    let cur = lines[lines.length - 1];
    if (cur.length && len(cur) + 1 + w.w.length > maxChars) {
      if (lines.length === 2) flush(); else lines.push([]);
      cur = lines[lines.length - 1];
    }
    cur.push(w);
    const next = words[i + 1];
    const count = lines.reduce((n, l) => n + l.length, 0);
    if (!next || ends(w.w) || next.s - w.e > 0.45 || (soft(w.w) && count >= 3) || next.line !== w.line) flush();
  });
  // never leave a lonely one-word line under a full line when it fits on the line above
  return chunks;
}

let fontReady = false;
export const useSubtitleFont = () => {
  const [h] = React.useState(() => (fontReady ? null : delayRender("subtitle font")));
  React.useEffect(() => {
    if (h === null) return;
    const f = new FontFace("SubFont", `url(${staticFile("fonts/montserrat-latin-800-normal.woff2")})`, { weight: "800" });
    f.load().then((ff) => { (document.fonts as any).add(ff); fontReady = true; continueRender(h); }).catch(() => continueRender(h));
  }, [h]);
};

export const Subtitles: React.FC<{ words: Word[]; style: SubStyle; offset?: number }> = ({ words, style, offset = 0 }) => {
  useSubtitleFont();
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps - offset;
  const chunks = React.useMemo(() => chunkWords(words, style.maxChars), [words, style.maxChars]);
  const k = chunks.findIndex((c, i) => t >= c.s - 0.08 && t < (chunks[i + 1] ? Math.min(chunks[i + 1].s - 0.08, c.e + 0.9) : c.e + 0.9));
  if (k < 0) return null;
  const c = chunks[k];
  const scale = width / 1080;
  const fs = style.size * scale;
  const mv = (style.moves || []).find((m) => t >= m.from && t < m.to);
  const y = (mv ? mv.y : style.y) * height;
  const age = (t - (c.s - 0.08)) * fps;
  const lineIn = spring({ frame: age, fps, config: { damping: 14 + (1 - style.pop) * 16, stiffness: 220, mass: 0.6 } });
  const fadeOut = interpolate(t, [c.e + 0.65, c.e + 0.9], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", left: 70 * scale, right: 150 * scale, top: y, transform: `translateY(-50%) scale(${0.86 + 0.14 * lineIn})`,
        opacity: Math.min(1, lineIn * 1.6) * fadeOut, display: "flex", flexDirection: "column", alignItems: "center", gap: fs * 0.08,
        fontFamily: "SubFont, Montserrat, Arial Black, sans-serif", fontWeight: 800, fontSize: fs, lineHeight: 1.08,
        textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 * scale,
      }}>
        {c.lines.map((ln, li) => (
          <div key={li} style={{ display: "flex", flexWrap: "nowrap", justifyContent: "center", gap: fs * 0.42 }}>
            {ln.map((w, wi) => {
              const on = t >= w.s - 0.03 && t < w.e + 0.05;
              const isKey = style.keyWords.includes(clean(w.w)) || /\d/.test(w.w);
              const pk = spring({ frame: (t - w.s) * fps, fps, config: { damping: 9 + (1 - style.pop) * 14, stiffness: 300, mass: 0.5 } });
              const bump = on ? 1 + 0.07 * style.pop * (1 - Math.abs(1 - pk)) + 0.03 : 1;
              const col = on ? style.accent : isKey ? style.key : "#FFFFFF";
              // a word never breaks inside itself (e.g. at a hyphen); a single very long word is shrunk to fit the line
              const fit = Math.min(1, ((1080 - 220) * scale * 0.98) / (w.w.length * fs * 0.74));
              return (
                <span key={wi} style={{
                  display: "inline-block", whiteSpace: "nowrap", flexShrink: 0, fontSize: fs * fit, color: col, margin: `0 ${((bump - 1) * w.w.length * fs * 0.7) / 2}px`, transform: `scale(${bump}) translateY(${on ? -2 * scale : 0}px)`,
                  WebkitTextStroke: `${fs * 0.13}px #000`, paintOrder: "stroke fill",
                  textShadow: `0 ${fs * 0.06}px ${fs * 0.12}px rgba(0,0,0,0.55)`,
                }}>{w.w.replace(/\.\.\.$/, "…")}</span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
