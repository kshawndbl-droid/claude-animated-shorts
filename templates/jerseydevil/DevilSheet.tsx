// Design sheet for the Jersey Devil: full body standing upright (wings half open, moonlit, in front of the shack),
// the wings-spread rearing pose, and the attack close-up (face head-on, fire from below).
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { JerseyDevil, DevilFace } from "./devil";

export const DevilSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Img src={staticFile("jerseydevil/chartest/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920, filter: "brightness(0.5) blur(3px)" }} />
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <g style={{ filter: "drop-shadow(0 0 16px rgba(120,150,210,0.35))" }}>
        <JerseyDevil x={300} y={1720} ppm={330} p={{ wings: 0.35, open: 0.25, glow: 1, t: 1 }} />
      </g>
      <rect x={560} y={130} width={490} height={600} rx={18} fill="#050507" stroke="#333" strokeWidth={3} />
      <clipPath id="cu"><rect x={560} y={130} width={490} height={600} rx={18} /></clipPath>
      <g clipPath="url(#cu)">
        <radialGradient id="fire" cx="0.5" cy="1" r="0.9"><stop offset="0" stopColor="#ff8a30" stopOpacity={0.5} /><stop offset="1" stopColor="#ff8a30" stopOpacity={0} /></radialGradient>
        <rect x={560} y={130} width={490} height={600} fill="url(#fire)" />
        <DevilFace x={805} y={380} size={300} open={1} t={1} />
      </g>
      <rect x={600} y={820} width={450} height={720} rx={18} fill="#050507" stroke="#333" strokeWidth={3} />
      <clipPath id="cu2"><rect x={600} y={820} width={450} height={720} rx={18} /></clipPath>
      <g clipPath="url(#cu2)">
        <rect x={600} y={820} width={450} height={720} fill="url(#fire)" opacity={0.5} />
        <JerseyDevil x={760} y={1520} ppm={190} p={{ wings: 1, reach: 1, open: 1, glow: 1, t: 2, rim: 1 }} />
      </g>
    </svg>
    <div style={{ position: "absolute", left: 40, top: 50, color: "#ddd", font: "700 44px Arial", letterSpacing: 2 }}>THE JERSEY DEVIL</div>
    <div style={{ position: "absolute", left: 570, top: 742, color: "#aaa", font: "600 26px Arial" }}>final jumpscare (face fills the screen)</div>
    <div style={{ position: "absolute", left: 610, top: 1552, color: "#aaa", font: "600 26px Arial" }}>rearing up, wings spread</div>
    <div style={{ position: "absolute", left: 40, top: 1770, color: "#aaa", font: "600 27px Arial", width: 1000 }}>about 2.4 m tall · horse skull head, goat horns, bat wings, hooves, forked tail · only shadows until the final scare</div>
  </AbsoluteFill>
);
