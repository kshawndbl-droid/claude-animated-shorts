// Separate Remotion entry for checking the downloaded asset library (public/assets/) in the bridge look.
// It does not touch src/Root.tsx or the bridge short. Still: see tools/asset-still.mjs.
import { registerRoot } from "remotion";
import { Root } from "./Root";
registerRoot(Root);
