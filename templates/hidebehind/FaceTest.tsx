import React from "react";
import { AbsoluteFill } from "remotion";
import { AttackFace } from "./attackFace";
export const FaceTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#050407" }}>
    <svg width={1080} height={1920}><AttackFace x={540} y={800} size={900} open={1} t={0.3} /></svg>
  </AbsoluteFill>
);
