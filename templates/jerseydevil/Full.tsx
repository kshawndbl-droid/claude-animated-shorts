// "The Jersey Devil" final assembly: the concatenated picture (Part A 0-12.8 s + Part B 12.8-36.5 s, 1095 frames,
// video only) + the approved mix v2 from 0 + the established word-highlight subtitles (same style as the Hidebehind).
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import wordsJson from "../../stories/jerseydevil/final/words.json";

export const JD_FULL_FRAMES = 1095;
const WORDS: Word[] = (wordsJson as any[]).map((w) => ({ w: w.w, s: w.s, e: w.e }));
const KEY = ["1735,", "Pine", "Barrens", "cursed", "thirteenth", "hooves,", "wings", "tail...", "chimney.", "trapper", "alone",
  "roof.", "Hooves.", "shadow", "scraping", "Soot", "up.", "chimney.", "back", "in."];
const sub = defaultStyle("serious", { key: "#3DF0FF", keyWords: KEY, y: 0.74, maxChars: 16 });

export const JDFull: React.FC = () => {
  const T = useCurrentFrame() / 30;
  const caps = T < 33.6;   // no captions over the attack and the black after it
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile("jerseydevil/picture_v1.mp4")} muted style={{ width: 1080, height: 1920 }} />
      {caps && <Subtitles words={WORDS} style={sub} offset={0} />}
      <Audio src={staticFile("jerseydevil/mix_v2.wav")} />
    </AbsoluteFill>
  );
};
