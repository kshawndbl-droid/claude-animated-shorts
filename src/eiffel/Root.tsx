// Remotion root for the Eiffel Short's style test (separate entry so the other Shorts stay untouched).
import React from "react";
import { Composition } from "remotion";
import { Sheet } from "../../templates/eiffel/Sheet";
import { StyleTest, TEST_FRAMES } from "../../templates/eiffel/StyleTest";
import { FullShort, FULL_FRAMES } from "../../templates/eiffel/FullShort";
import { Crickets, CRICKETS_FRAMES } from "../../templates/reddit/Crickets";
import { ShortA, A_FRAMES } from "../../templates/mailed/ShortA";
import { LionTest } from "../../templates/tsavo/LionTest";
import { TsavoTest, TSAVO_TEST_FRAMES } from "../../templates/tsavo/TsavoTest";
import { Tsavo3DTest, TSAVO3D_FRAMES } from "../../templates/tsavo3d/Tsavo3DTest";
import { EnvTest, EnvTest2, EnvTest3, ENVTEST_FRAMES } from "../../templates/tsavo3d/EnvTest";
import { ToonWalkTest, ToonStandTest, TOON_WALK_FRAMES, TOON_STAND_FRAMES } from "../../templates/tsavo3d/ToonTest";
import { JWalkTest, JStandTest, J_WALK_FRAMES, J_STAND_FRAMES } from "../../templates/jorogumo/CharTest";
import { HWalkTest, HStandTest, H_WALK_FRAMES, H_STAND_FRAMES } from "../../templates/hidebehind/CharTest";
import { DevilSheet } from "../../templates/jerseydevil/DevilSheet";
import { JDWalkTest, JDStandTest, JD_WALK_FRAMES, JD_STAND_FRAMES } from "../../templates/jerseydevil/CharTest";
import { HPreview, PREVIEW_FRAMES } from "../../templates/hidebehind/Preview";
import { CreatureSheet } from "../../templates/hidebehind/CreatureSheet";
import { HScareTest, SCARE_FRAMES } from "../../templates/hidebehind/ScareTest";
import { FaceTest } from "../../templates/hidebehind/FaceTest";
import { HPartD, PARTD_FRAMES } from "../../templates/hidebehind/PartD";
import { HFull, FULL_FRAMES } from "../../templates/hidebehind/Full";
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
    <Composition id="LionTest" component={LionTest} durationInFrames={60} fps={30} width={1080} height={1920} />
    <Composition id="TsavoTest" component={TsavoTest} durationInFrames={TSAVO_TEST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EnvTest3" component={EnvTest3} durationInFrames={ENVTEST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EnvTest2" component={EnvTest2} durationInFrames={ENVTEST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="EnvTest" component={EnvTest} durationInFrames={ENVTEST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ToonWalkTest" component={ToonWalkTest} durationInFrames={TOON_WALK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="HPreview" component={HPreview} durationInFrames={PREVIEW_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="HCreature" component={CreatureSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="HScareTest" component={HScareTest} durationInFrames={SCARE_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true }} />
    <Composition id="HFace" component={FaceTest} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="HFull" component={HFull} durationInFrames={FULL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="HPartD" component={HPartD} durationInFrames={PARTD_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="HPartB" component={HPreview} durationInFrames={PREVIEW_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: false, clean: true }} />
    <Composition id="HWalkTest" component={HWalkTest} durationInFrames={H_WALK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="HStandTest" component={HStandTest} durationInFrames={H_STAND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JDDevilSheet" component={DevilSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="JDWalkTest" component={JDWalkTest} durationInFrames={JD_WALK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JDStandTest" component={JDStandTest} durationInFrames={JD_STAND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JWalkTest" component={JWalkTest} durationInFrames={J_WALK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JStandTest" component={JStandTest} durationInFrames={J_STAND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ToonStandTest" component={ToonStandTest} durationInFrames={TOON_STAND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Tsavo3DTest" component={Tsavo3DTest} durationInFrames={TSAVO3D_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MailedBv3" component={ShortB} durationInFrames={B_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true, v3: true }} />
  </>
);
