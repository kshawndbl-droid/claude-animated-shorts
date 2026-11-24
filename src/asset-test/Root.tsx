import React from "react";
import { Composition } from "remotion";
import { AssetTest } from "./AssetTest";
export const Root: React.FC = () => (
  <>
    <Composition id="AssetToon" component={AssetTest} defaultProps={{ toon: true }} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="AssetRaw" component={AssetTest} defaultProps={{ toon: false }} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
