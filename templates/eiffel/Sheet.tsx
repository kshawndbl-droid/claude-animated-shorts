// Character sheet for the style test: both leads, a few expressions and poses.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Figure, LUSTIG, POISSON } from "./figure";

export const Sheet: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#d9c7d8, #f1dcc4)" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <Figure id="a" look={LUSTIG} x={300} y={820} s={1.9} pose={{ expr: "sly", gesture: "present" }} />
        <Figure id="b" look={POISSON} x={790} y={820} s={1.9} flip pose={{ expr: "surprised", gesture: "shrug" }} />
        <Figure id="c" look={LUSTIG} x={180} y={1500} s={1.25} pose={{ expr: "happy", wink: true, gesture: "tip" }} />
        <Figure id="d" look={LUSTIG} x={430} y={1500} s={1.25} pose={{ expr: "neutral", walk: 1, phase: f / 30 }} />
        <Figure id="e" look={POISSON} x={680} y={1500} s={1.25} pose={{ expr: "worried", hold: "cash", gesture: "offer" }} />
        <Figure id="f" look={POISSON} x={920} y={1500} s={1.25} flip pose={{ expr: "laugh", gesture: "hips" }} />
      </svg>
    </AbsoluteFill>
  );
};
