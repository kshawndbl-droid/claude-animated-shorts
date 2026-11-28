# Part C plates for "The Ahuizotl" (templates/ahuizotl/PartC.tsx): the same lakeshore set as tools/blender/ahuizotl_lake.py
# (imported as is), with two new cameras. Both use the fixed field of view (36 mm sensor = plate height), rendered at
# 1.25x of the 1920 display height (2400 px), without the 2D edge clump ("noedge": Remotion draws it).
#  c_walk:  his walk DOWN the bank to the water (line 6). The rig is drawn in profile, so this camera looks back along
#           the shore (toward -x) with the bank on the left and the lake on the right: his path from (0.44, -2.0) down to
#           the waterline runs across the frame, left to right. A wide plate (1700 px display) for a following pan.
#  c_close: low close-up at kneeling height, a little to his front, the edge clump and the reed bed soft behind.
# usage: .venv-bpy/bin/python tools/blender/ahuizotl_partc.py -- --shot c_walk --w 2125 --h 2400 --samples 24 --out public/ahuizotl/c_walk/
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import ahuizotl_lake as lake  # noqa: E402

lake.SHOTS.update({
    "c_walk": dict(loc=(4.38, -2.67, 1.3), look=(0.6, -0.65, 0.72), lens=40, focus=(0.6, -0.65, 0.9), fstop=5.6, fixed=True, noedge=True),
    "c_close": dict(loc=(1.17, -0.05, 1.13), look=(1.72, 1.5, 1.03), lens=45, focus=(1.3, 0.95, 1.1), fstop=2.8, fixed=True, noedge=True),
})

if __name__ == "__main__":
    W, H = int(lake.arg("--w", "1350")), int(lake.arg("--h", "2400"))
    sc = lake.build()
    cam = lake.shot_camera(sc, lake.SHOT, W, H)
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = int(lake.arg("--pct", "100"))
    out = os.path.abspath(lake.arg("--out", f"public/ahuizotl/{lake.SHOT}/"))
    os.makedirs(out, exist_ok=True)
    import bpy
    import json
    import time
    bpy.context.view_layer.update()
    json.dump({"shot": lake.SHOT, "w": W, "h": H, "frames": {"1": {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": cam.data.sensor_height}}},
              open(os.path.join(out, "cam.json"), "w"))
    t0 = time.time()
    sc.render.filepath = os.path.join(out, "f_0001.png")
    bpy.ops.render.render(write_still=True)
    print("plate", round(time.time() - t0, 1), "s", flush=True)
