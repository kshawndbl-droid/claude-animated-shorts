# Part D plates for "The Ahuizotl" (after the final jumpscare): the same lake set as tools/blender/ahuizotl_lake.py
# (imported, unchanged), two new portrait camera set-ups in the style-preview convention (1350x2400, fixed field of view,
# no edge clump: Remotion draws it in 2D so it is the same clump in every shot).
#   lakeD:  from the bank just behind the spot where he knelt, looking down over the edge onto the water where he went
#           under (ripples, his floating net and the edge clump are drawn in Remotion)
#   reedsD: low on the bank, a long lens on the edge clump and the reed bed behind it (the eyes rise in the gap)
# usage: .venv-bpy/bin/python tools/blender/ahuizotl_partd.py -- --shot lakeD --w 1350 --h 2400 --out public/ahuizotl/lakeD/
import json
import os
import sys
import time

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import ahuizotl_lake as L  # noqa: E402

L.SHOTS.update({
    "lakeD": dict(loc=(0.95, -0.75, 1.3), look=(1.75, 1.75, -0.05), lens=28, focus=(1.6, 1.2, 0.0), fstop=5.6, fixed=True, noedge=True),
    "reedsD": dict(loc=(1.3, -0.3, 0.8), look=(1.85, 1.6, 0.35), lens=42, focus=(1.8, 1.55, 0.1), fstop=4.0, fixed=True, noedge=True),
})

if __name__ == "__main__":
    W, H = int(L.arg("--w", "1350")), int(L.arg("--h", "2400"))
    sc = L.build()
    cam = L.shot_camera(sc, L.SHOT, W, H)
    sc.render.resolution_x, sc.render.resolution_y = W, H
    out = os.path.abspath(L.arg("--out", f"public/ahuizotl/{L.SHOT}/"))
    os.makedirs(out, exist_ok=True)
    bpy.context.view_layer.update()
    json.dump({"shot": L.SHOT, "w": W, "h": H, "frames": {"1": {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": cam.data.sensor_height}}},
              open(os.path.join(out, "cam.json"), "w"))
    t0 = time.time()
    sc.render.filepath = os.path.join(out, "f_0001.png")
    bpy.ops.render.render(write_still=True)
    print("plate", round(time.time() - t0, 1), "s", flush=True)
