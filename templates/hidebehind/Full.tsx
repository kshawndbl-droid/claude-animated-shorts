// "The Hidebehind" final assembly: the concatenated picture (parts A+B+C+D, 1520 frames, video only) + the approved
// mix v3 from 0 + the established word-highlight subtitles (same style as the approved preview).
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import wordsJson from "../../stories/hidebehind/final/words.json";

export const FULL_FRAMES = 1520;
const WORDS: Word[] = (wordsJson as any[]).map((w) => ({ w: w.w, s: w.s, e: w.e }));
const KEY = ["Hidebehind.", "after", "dark.", "behind", "you.", "logger", "alone.", "Crack.", "branch", "turned.", "Nothing.", "faster.",
  "Something", "faster", "too.", "lantern", "out.", "Silence.", "breathing...", "neck.", "Slowly.", "hide.", "taken", "walking."];
const sub = defaultStyle("serious", { key: "#3DF0FF", keyWords: KEY, y: 0.74, maxChars: 16 });

export const HFull: React.FC = () => {
  const T = useCurrentFrame() / 30;
  // no captions over the attack and the black after it (37.70-39.30 s), as in the approved jumpscare test
  const caps = T < 37.7 || T >= 39.3;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile("hidebehind/picture_v1.mp4")} muted style={{ width: 1080, height: 1920 }} />
      {caps && <Subtitles words={WORDS} style={sub} offset={0} />}
      <Audio src={staticFile("hidebehind/mix_v3.wav")} />
    </AbsoluteFill>
  );
};
