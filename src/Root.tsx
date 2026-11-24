// Remotion root for the bridge short. The picture lives in templates/bridge/, the soundtrack is public/bridge/mix.wav
// (built by templates/audio/mix.py), and the final render is 1440x2560 (1080x1920 composition at --scale 1.3333).
import React from "react";
import { AbsoluteFill, Audio, Composition, staticFile } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "../templates/bridge/Bridge";
import { SubPreview } from "./vasa/SubPreview";
import { VasaShort, VASA_FRAMES } from "../templates/vasa/Vasa";
import { EmuWar, EMU_TOTAL } from "../templates/emu/EmuWar";
import { NapoleonRabbits, NAP_TOTAL } from "../templates/napoleon/NapoleonRabbits";

const WithSound: React.FC = () => (
  <AbsoluteFill>
    <BridgeShort />
    <Audio src={staticFile("bridge/mix.wav")} />
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={WithSound} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="BridgePicture" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="VasaShort" component={VasaShort} durationInFrames={VASA_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="NapoleonRabbits" component={NapoleonRabbits} durationInFrames={NAP_TOTAL} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="EmuWar" component={EmuWar} durationInFrames={EMU_TOTAL} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="VasaSubPreview" component={SubPreview} durationInFrames={20 * 30} fps={30} width={1080} height={1920} defaultProps={{ guides: false }} />
  </>
);
