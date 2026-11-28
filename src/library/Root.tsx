// Remotion root for the shared library: tests, catalog sheets and the scene-template demos.
// Each Short keeps its own entry; this one never changes an approved Short.
import React from "react";
import { Composition } from "remotion";
import { LibWalkTest, LibStandTest, H_WALK_FRAMES, H_STAND_FRAMES } from "../../library/tests/RigRegression";
import { HWalkTest, HStandTest } from "../../templates/hidebehind/CharTest";
import { DaylightTest, DAYLIGHT_FRAMES } from "../../library/tests/DaylightTest";
import { SceneFromJson } from "../../library/templates/Scene";
import { CatWardrobe, CatFaces, CatMotions, CatBodies } from "../../library/catalog/CharacterSheet";

const V = { fps: 30, width: 1080, height: 1920 } as const;
export const LibraryRoot: React.FC = () => (
  <>
    <Composition id="LibWalkTest" component={LibWalkTest} durationInFrames={H_WALK_FRAMES} {...V} />
    <Composition id="LibStandTest" component={LibStandTest} durationInFrames={H_STAND_FRAMES} {...V} />
    <Composition id="HWalkTest" component={HWalkTest} durationInFrames={H_WALK_FRAMES} {...V} />
    <Composition id="HStandTest" component={HStandTest} durationInFrames={H_STAND_FRAMES} {...V} />
    <Composition id="CatWardrobe" component={CatWardrobe} durationInFrames={1} {...V} />
    <Composition id="CatFaces" component={CatFaces} durationInFrames={1} {...V} />
    <Composition id="CatMotions" component={CatMotions} durationInFrames={1} {...V} />
    <Composition id="CatBodies" component={CatBodies} durationInFrames={1} {...V} />
    <Composition id="DaylightTest" component={DaylightTest} durationInFrames={DAYLIGHT_FRAMES} {...V} />
    <Composition id="KzDemo" component={SceneFromJson} defaultProps={{ src: "kz-demo/scene.json" }} durationInFrames={Math.round(31.5 * 30)} {...V} />
  </>
);
