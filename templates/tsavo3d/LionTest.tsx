// Still test sheet for the redrawn FlatLion (maneless male): standing, walking, stalking, roaring, glowing eyes at night.
import React from "react";
import { AbsoluteFill } from "remotion";
import { FlatLion } from "./stick";

export const MaleLionTest: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#d98a4a 0%, #b5683a 48%, #1a1a2e 52%, #0b0b18 100%)" }}>
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <rect x={0} y={420} width={1080} height={10} fill="#7a4a2a" opacity={0.5} />
      <FlatLion id="a" x={540} y={440} ppm={250} pose={{ eyes: "normal", tail: 0.3, look: 0.5 }} />
      <FlatLion id="b" x={540} y={880} ppm={250} flip pose={{ walk: 1, phase: 0.3, tail: 1.2 }} />
      <FlatLion id="c" x={540} y={1350} ppm={250} pose={{ crouch: 1, eyes: "narrow", walk: 0.5, phase: 0.6, tail: 2 }} />
      <FlatLion id="d" x={540} y={1800} ppm={250} flip pose={{ crouch: 0.6, roar: 0.8, eyes: "glow", tail: 0.7 }} shade={0.75} />
    </svg>
  </AbsoluteFill>
);
