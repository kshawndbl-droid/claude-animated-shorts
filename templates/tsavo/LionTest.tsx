import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Lion } from "./lion";
export const LionTest: React.FC = () => {
  const T = useCurrentFrame() / 30;
  return (
    <AbsoluteFill style={{ background: "#6a8a9a" }}>
      <svg width={1080} height={1920}>
        <Lion id="a" x={420} y={500} s={1.2} pose={{ phase: T * 0.55, walk: 1, tail: T }} />
        <Lion id="b" x={420} y={900} s={1.2} pose={{ crouch: 1, eyes: "glow", tail: T, lookX: 1 }} />
        <Lion id="c" x={420} y={1300} s={1.2} pose={{ roar: 1, eyes: "narrow", tail: T }} />
        <Lion id="d" x={420} y={1750} s={1.2} pose={{ pounce: 1, roar: 0.6, tail: T }} />
      </svg>
    </AbsoluteFill>
  );
};
