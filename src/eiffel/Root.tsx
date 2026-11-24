// Remotion root for the Eiffel Short's style test (separate entry so the other Shorts stay untouched).
import React from "react";
import { Composition } from "remotion";
import { Sheet } from "../../templates/eiffel/Sheet";
import { StyleTest, TEST_FRAMES } from "../../templates/eiffel/StyleTest";

export const EiffelRoot: React.FC = () => (
  <>
    <Composition id="EiffelSheet" component={Sheet} durationInFrames={60} fps={30} width={1080} height={1920} />
    <Composition id="EiffelStyleTest" component={StyleTest} durationInFrames={TEST_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
  </>
);
