// Asset check: every Poly Haven model from public/assets/manifest.json on an ambientCG cobblestone ground, either
// as downloaded (PBR, toon=false) or through the bridge pipeline (kitClone -> two-tone Lambert + InkPass, toon=true).
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Kit, kitClone } from "../../templates/bridge/build";
import { InkPass } from "../../templates/bridge/ink";
import { twoTone } from "../../templates/bridge/shade";

type Entry = { id: string; source: string; dir: string; files: string[] };
// target heights (m) so the props read at a believable scale next to each other
const H: Record<string, number> = { wine_barrel_01: 1.0, wooden_crate_01: 0.6, wooden_bucket_01: 0.35, wooden_lantern_01: 0.4, wicker_basket_01: 0.35,
  wooden_stool_01: 0.45, painted_wooden_bench: 0.5, wooden_table_02: 0.75, wooden_ladder: 2.2, wooden_axe: 0.8, tree_stump_01: 0.6,
  stone_fire_pit: 0.45, spinning_wheel_01: 1.0, kite_shield: 0.9, wooden_barrels_01: 1.1 };

const useAssets = () => {
  const [state, set] = useState<{ kit: Kit; ground: THREE.Texture; list: string[] } | null>(null);
  const [h] = useState(() => delayRender("assets"));
  useEffect(() => {
    (async () => {
      const man: Entry[] = await (await fetch(staticFile("assets/manifest.json"))).json();
      const loader = new GLTFLoader();
      const models = man.filter((m) => m.source === "polyhaven");
      const kit: Kit = {};
      for (const m of models) {
        const g = await loader.loadAsync(staticFile(`${m.dir.replace(/^public\//, "")}/${m.files.find((f) => f.endsWith(".gltf"))}`));
        kit[m.id] = g.scene;
      }
      const ground = await new THREE.TextureLoader().loadAsync(staticFile("assets/ambientcg/PavingStones130/PavingStones130_1K-JPG_Color.jpg"));
      ground.wrapS = ground.wrapT = THREE.RepeatWrapping; ground.repeat.set(6, 10); ground.colorSpace = THREE.SRGBColorSpace;
      set({ kit, ground, list: models.map((m) => m.id) });
      continueRender(h);
    })().catch((e) => { console.error(e); continueRender(h); });
  }, [h]);
  return state;
};

const Scene: React.FC<{ toon: boolean; kit: Kit; ground: THREE.Texture; list: string[] }> = ({ toon, kit, ground, list }) => {
  const { camera, scene } = useThree();
  const root = useMemo(() => {
    const g = new THREE.Group();
    const gm = toon ? twoTone(new THREE.MeshLambertMaterial({ map: ground })) : new THREE.MeshStandardMaterial({ map: ground, roughness: 0.9 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 20), gm);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    list.forEach((id, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      let o: THREE.Object3D | null;
      if (toon) o = kitClone(kit, id, H[id] ?? 0.8);
      else {
        const src = kit[id], box = new THREE.Box3().setFromObject(src), s = (H[id] ?? 0.8) / Math.max(0.01, box.max.y - box.min.y);
        o = src.clone(true); o.scale.setScalar(s); o.position.y = -box.min.y * s;
      }
      if (!o) return;
      o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
      const w = new THREE.Group(); w.add(o); w.position.set((col - 1) * 1.6, 0, -row * 1.7); w.rotation.y = 0.5; g.add(w);
    });
    const sun = new THREE.DirectionalLight("#fff4e0", toon ? 2.2 : 3.0); sun.position.set(4, 8, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -10 }); g.add(sun, sun.target);
    g.add(new THREE.HemisphereLight("#cfe3f2", "#8a7a60", toon ? 1.2 : 1.0));
    return g;
  }, [toon, kit, ground, list]);
  const ink = useMemo(() => new InkPass(scene, camera as THREE.PerspectiveCamera), [scene, camera]);
  const tone = useMemo(() => new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), []);
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(0, 6.5, 6.2); cam.lookAt(0, 0, -3.6); cam.updateProjectionMatrix();
  scene.background = new THREE.Color("#cfe3f2");
  return (
    <>
      <primitive object={root} dispose={null} />
      <EffectComposer multisampling={4}>
        {toon ? <primitive object={ink} dispose={null} /> : <></>}
        <primitive object={tone} dispose={null} />
      </EffectComposer>
    </>
  );
};

export const AssetTest: React.FC<{ toon: boolean }> = ({ toon }) => {
  const a = useAssets();
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {a && (
        <ThreeCanvas width={1080} height={1920} shadows camera={{ fov: 40, near: 0.1, far: 200 }} gl={{ antialias: false, stencil: false }}>
          <Scene toon={toon} {...a} />
        </ThreeCanvas>
      )}
    </AbsoluteFill>
  );
};
