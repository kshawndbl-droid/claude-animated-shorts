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
import { JMonsterSheet } from "../../templates/jorogumo/MonsterSheet";
import { JMonsterV2 } from "../../templates/jorogumo/MonsterV2";
import { JStylePreview, J_PREVIEW_FRAMES } from "../../templates/jorogumo/StylePreview";
import { JPartC, J_PARTC_FRAMES } from "../../templates/jorogumo/PartC";
import { JPartA, JPartAOpen, J_PARTA_FRAMES, J_OPEN_FRAMES } from "../../templates/jorogumo/PartA";
import { JPartB, J_PARTB_FRAMES } from "../../templates/jorogumo/PartB";
import { JPartD, J_PARTD_FRAMES } from "../../templates/jorogumo/PartD";
import { JFull, J_FULL_FRAMES } from "../../templates/jorogumo/Full";
import { HWalkTest, HStandTest, H_WALK_FRAMES, H_STAND_FRAMES } from "../../templates/hidebehind/CharTest";
import { HPreview, PREVIEW_FRAMES } from "../../templates/hidebehind/Preview";
import { CreatureSheet } from "../../templates/hidebehind/CreatureSheet";
import { HScareTest, SCARE_FRAMES } from "../../templates/hidebehind/ScareTest";
import { FaceTest } from "../../templates/hidebehind/FaceTest";
import { HPartD, PARTD_FRAMES } from "../../templates/hidebehind/PartD";
import { HFull, FULL_FRAMES } from "../../templates/hidebehind/Full";
import { HPartA, PART_A_FRAMES } from "../../templates/hidebehind/PartA";
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
    <Composition id="HPartA" component={HPartA} durationInFrames={PART_A_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="HPartB" component={HPreview} durationInFrames={PREVIEW_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: false, clean: true }} />
    <Composition id="HWalkTest" component={HWalkTest} durationInFrames={H_WALK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="HStandTest" component={HStandTest} durationInFrames={H_STAND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JWalkTest" component={JWalkTest} durationInFrames={J_WALK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JMonsterSheet" component={JMonsterSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="JMonsterV2" component={JMonsterV2} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="JStylePreview" component={JStylePreview} durationInFrames={J_PREVIEW_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JPartC" component={JPartC} durationInFrames={J_PARTC_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JStylePreviewClean" component={JStylePreview} durationInFrames={J_PREVIEW_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ clean: true }} />
    <Composition id="JPartAOpen" component={JPartAOpen} durationInFrames={J_OPEN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JPartA" component={JPartA} durationInFrames={J_PARTA_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JPartB" component={JPartB} durationInFrames={J_PARTB_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JPartD" component={JPartD} durationInFrames={J_PARTD_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JFull" component={JFull} durationInFrames={J_FULL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JStandTest" component={JStandTest} durationInFrames={J_STAND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ToonStandTest" component={ToonStandTest} durationInFrames={TOON_STAND_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Tsavo3DTest" component={Tsavo3DTest} durationInFrames={TSAVO3D_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MailedBv3" component={ShortB} durationInFrames={B_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ withAudio: true, v3: true }} />
  </>
);
