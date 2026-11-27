// Design sheet for the Hidebehind creature: full body (lurking, moonlit) and the attack close-up (lantern from below).
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Creature } from "./creature";

export const CreatureSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Img src={staticFile("hidebehind/chartest/f_0001.png")} style={{ position: "absolute", width: 1080, height: 1920, filter: "brightness(0.55) blur(3px)" }} />
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      {/* full body, lurking */}
      <g style={{ filter: "drop-shadow(0 0 18px rgba(120,150,210,0.35))" }}>
        <Creature x={330} y={1700} ppm={300} p={{ pose: "lurk", glow: 0.75, t: 1 }} />
      </g>
      {/* attack close-up */}
      <rect x={560} y={140} width={490} height={620} rx={18} fill="#050507" stroke="#333" strokeWidth={3} />
      <clipPath id="cu"><rect x={560} y={140} width={490} height={620} rx={18} /></clipPath>
      <g clipPath="url(#cu)">
        <radialGradient id="lant" cx="0.4" cy="1" r="0.9"><stop offset="0" stopColor="#ff9a40" stopOpacity={0.45} /><stop offset="1" stopColor="#ff9a40" stopOpacity={0} /></radialGradient>
        <rect x={560} y={140} width={490} height={620} fill="url(#lant)" />
        <Creature x={230} y={1500} ppm={520} p={{ pose: "lunge", open: 1, glow: 1, rim: 0.3 }} />
      </g>
    </svg>
    <div style={{ position: "absolute", left: 40, top: 60, color: "#ddd", font: "700 44px Arial", letterSpacing: 2 }}>THE HIDEBEHIND</div>
    <div style={{ position: "absolute", left: 570, top: 772, color: "#aaa", font: "600 28px Arial" }}>the attack (final jumpscare only)</div>
    <div style={{ position: "absolute", left: 40, top: 1760, color: "#aaa", font: "600 28px Arial", width: 1000 }}>about 2.7 m tall · bark-like hide so it blends into the trunks · shown only as a shadow until the end</div>
  </AbsoluteFill>
);
