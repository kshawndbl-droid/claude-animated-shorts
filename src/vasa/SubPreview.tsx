// Subtitle look test for the Vasa short: the approved narration + real word timings over a plain backdrop
// (the Vasa scenes are built separately). `guides` draws YouTube Shorts' interface areas so placement can be checked.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { Subtitles, defaultStyle, Word } from "../subtitles/Subtitles";
import words from "../../stories/vasa/words.json";

export const VASA_KEYWORDS = ["vasa", "aura", "cooked", "cap", "fumbled", "legend", "sixty-four", "thirty", "1961", "energy", "main", "character"];
export const vasaSubStyle = defaultStyle("funny", { keyWords: VASA_KEYWORDS });

export const SubPreview: React.FC<{ guides?: boolean }> = ({ guides }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #f6c77c 0%, #e8956b 38%, #2f6f8f 52%, #173f5a 100%)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 6, background: "rgba(255,255,255,0.35)",
        transform: `translateY(${Math.sin(f / 20) * 4}px)` }} />
      <Audio src={staticFile("vasa/voice.wav")} />
      <Subtitles words={words as Word[]} style={vasaSubStyle} />
      {guides && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "19%", background: "rgba(255,0,80,0.28)", color: "#fff", fontSize: 30, padding: 12 }}>YouTube title / channel / caption area</div>
          <div style={{ position: "absolute", right: 0, top: "38%", bottom: "19%", width: 130, background: "rgba(255,0,80,0.28)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "8%", background: "rgba(255,0,80,0.2)" }} />
        </>
      )}
    </AbsoluteFill>
  );
};
