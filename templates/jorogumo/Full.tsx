// "The Spider Woman" final assembly: the four picture parts (A 0-15.2, B 15.2-25.2, C 25.2-33.9, D 33.9-41.0,
// concatenated losslessly into full_bg.mp4) as the background, the approved word-by-word subtitles (serious style,
// y 0.8, as in the approved style preview) and the full mix (approved narration + code-made score and SFX, -14 LUFS).
import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile } from "remotion";
import { Subtitles, defaultStyle, Word } from "../../src/subtitles/Subtitles";
import wordsJson from "../../stories/jorogumo/final/words.json";

export const J_FULL_FRAMES = 1230;
const SUB = defaultStyle("serious", { y: 0.8, maxChars: 14, keyWords: ["four", "hundred", "spider", "woman's", "samurai", "empty", "silk", "eight", "legs", "slashes", "black", "blood", "rafters"] });

export const JFull: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <OffthreadVideo src={staticFile("jorogumo/full_bg_v4.mp4")} muted />
    <Audio src={staticFile("jorogumo/full_mix_v4.wav")} />
    <Subtitles words={wordsJson as Word[]} style={SUB} offset={0} />
  </AbsoluteFill>
);
