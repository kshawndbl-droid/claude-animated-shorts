// Final assembly of "The Man-Eaters of Tsavo": the four rendered parts concatenated (public/tsavo/parts-concat.mp4),
// word-by-word subtitles over the whole video and the narration + generated music/SFX mix (public/tsavo/final_mix.wav).
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import wordsJson from "../../stories/tsavo/final/words.json";

export const TSAVO_FINAL_FRAMES = Math.round(84.5 * 30);
const WORDS: Word[] = (wordsJson as any[]).map((w) => ({ w: w.w, s: w.s, e: w.e }));
const KEY = ["1898", "kenya", "tsavo", "river", "john", "henry", "patterson", "lions", "manes", "thorn", "fences", "fires", "traps", "hundreds",
  "prime", "minister", "parliament", "december", "9th", "29th", "eight", "nine", "135", "2009", "35", "25", "rugs", "field", "museum", "chicago", "eye"];
const sub = defaultStyle("serious", { keyWords: KEY, y: 0.8, maxChars: 16 });

export const TsavoFinal: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <OffthreadVideo src={staticFile("tsavo/parts-concat.mp4")} muted />
    <Subtitles words={WORDS} style={sub} offset={0} />
    <Audio src={staticFile("tsavo/final_mix.wav")} />
  </AbsoluteFill>
);
