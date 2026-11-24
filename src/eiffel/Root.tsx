// Remotion root for the Eiffel Short's style test (separate entry so the other Shorts stay untouched).
import React from "react";
import { Composition } from "remotion";
import { Sheet } from "../../templates/eiffel/Sheet";
import { StyleTest, TEST_FRAMES } from "../../templates/eiffel/StyleTest";
import { FullShort, FULL_FRAMES } from "../../templates/eiffel/FullShort";

export const EiffelRoot: React.FC = () => (
  <>
    <Composition id="EiffelSheet" component={Sheet} durationInFrames={60} fps={30} width={1080} height={1920} />
    <Composition id="EiffelStyleTest" component={StyleTest} durationInFrames={TEST_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="EiffelBgTest" component={StyleTest} durationInFrames={TEST_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true, bg: "v3" as const }} />
    <Composition id="EiffelBgTest4" component={StyleTest} durationInFrames={TEST_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true, bg: "v4" as const }} />
    <Composition id="EiffelFull" component={FullShort} durationInFrames={FULL_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
  </>
);
