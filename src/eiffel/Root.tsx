// Remotion root for the Eiffel Short's style test (separate entry so the other Shorts stay untouched).
import React from "react";
import { Composition } from "remotion";
import { Sheet } from "../../templates/eiffel/Sheet";
import { StyleTest, TEST_FRAMES } from "../../templates/eiffel/StyleTest";
import { FullShort, FULL_FRAMES } from "../../templates/eiffel/FullShort";
import { Crickets, CRICKETS_FRAMES } from "../../templates/reddit/Crickets";
import { ShortA, A_FRAMES } from "../../templates/mailed/ShortA";
import { ShortB, B_FRAMES } from "../../templates/mailed/ShortB";

export const EiffelRoot: React.FC = () => (
  <>
    <Composition id="EiffelSheet" component={Sheet} durationInFrames={60} fps={30} width={1080} height={1920} />
    <Composition id="EiffelStyleTest" component={StyleTest} durationInFrames={TEST_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="EiffelBgTest" component={StyleTest} durationInFrames={TEST_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true, bg: "v3" as const }} />
    <Composition id="EiffelBgTest4" component={StyleTest} durationInFrames={TEST_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true, bg: "v4" as const }} />
    <Composition id="EiffelFull" component={FullShort} durationInFrames={FULL_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="RedditCrickets" component={Crickets} durationInFrames={CRICKETS_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="MailedA" component={ShortA} durationInFrames={A_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="MailedB" component={ShortB} durationInFrames={B_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="MailedBv3" component={ShortB} durationInFrames={B_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true, v3: true }} />
  </>
);
