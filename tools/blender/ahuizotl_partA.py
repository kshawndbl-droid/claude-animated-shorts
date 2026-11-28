# Part A plates for "The Ahuizotl" (lines 1-2): the same lakeshore set as tools/blender/ahuizotl_lake.py (imported, not
# changed), with new cameras. Plates are rendered at 1.25x the display density: 2400 plate px map to 1920 display px
# (the sensor height is 36 mm per 2400 px), so a 2D push-in of up to 1.25x never upscales; a plate may be taller or
# wider than 1350x2400 to leave room for a 2D tilt or pan (the Remotion side knows the plate size from cam.json).
# usage: .venv-bpy/bin/python tools/blender/ahuizotl_partA.py -- --shot a_high --out public/ahuizotl/a_high/ [--samples 24]
import json
import os
import sys
import time

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import ahuizotl_lake as lake  # noqa: E402

arg = lake.arg

PART_A = {
    # line 1 opening: high over the open water, tilting down from the moon over the mist to the black water below
    "a_high": dict(w=1350, h=3000, loc=(1.6, 3.6, 6.5), look=(2.2, 20.0, 1.2), lens=24, focus=(2.0, 14.0, 0.0), fstop=11, noedge=True),
    # "the deep water": low over the open water, looking down the moon's path into the dark (a push into the surface)
    "a_deep": dict(w=1350, h=2400, loc=(2.3, 3.3, 0.95), look=(2.9, 9.0, -0.3), lens=30, focus=(2.7, 7.0, -0.07), fstop=4.0, noedge=True),
    # "They called it the Ahuizotl": low at the waterline over open water by the fishing stakes (the 2D clump and the eyes are drawn in Remotion)
    "a_lurk": dict(w=1350, h=2400, loc=(0.95, 2.1, 0.32), look=(0.45, 4.5, 0.12), lens=32, focus=(0.45, 4.3, 0.1), fstop=4.0),
    # line 2: side tracking plate (wide, the window pans with him) from up the bank; he walks +x along y = -2.0
    "a_track": dict(w=3000, h=2400, loc=(-0.7, -4.6, 1.15), look=(-0.7, 0.0, 0.6), lens=28, focus=(-0.7, -2.0, 0.9), fstop=5.6, noedge=True),
    # a closer, lower walking angle a little ahead of him (he still faces screen right), wide for a pan
    "a_walk": dict(w=2300, h=2400, loc=(1.25, -4.35, 0.72), look=(0.55, -0.4, 1.05), lens=32, focus=(0.6, -2.0, 1.0), fstop=4.0, noedge=True),
    # the cry: head and shoulders where he stops at (0.9, -2.0), the reeds soft behind on the right
    "a_close": dict(w=1350, h=2400, loc=(1.05, -3.2, 1.42), look=(0.98, 0.0, 1.0), lens=42, focus=(0.95, -2.0, 1.42), fstop=2.8, noedge=True),
}

if __name__ == "__main__":
    name = arg("--shot")
    S = PART_A[name]
    lake.SHOTS[name] = S
    lake.SHOT = name
    sc = lake.build()
    W, H = S["w"], S["h"]
    c = lake.ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_fit, c.data.sensor_height, c.data.sensor_width = "VERTICAL", 36 * H / 2400, 36
    c.data.clip_start, c.data.clip_end = 0.05, 2000
    c.data.lens = S["lens"]
    c.data.dof.use_dof = True
    c.data.dof.aperture_fstop = S["fstop"]
    foc = lake.ts.link(bpy.data.objects.new("focus", None))
    foc.location = S["focus"]
    c.data.dof.focus_object = foc
    c.location = S["loc"]
    c.rotation_euler = (Vector(S["look"]) - Vector(S["loc"])).to_track_quat("-Z", "Y").to_euler()
    sc.camera = c
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = int(arg("--pct", "100"))
    out = os.path.abspath(arg("--out", f"public/ahuizotl/{name}/"))
    os.makedirs(out, exist_ok=True)
    bpy.context.view_layer.update()
    # "sensor": 36 = 36 mm per 2400 plate px (1920 display px), whatever the plate size
    json.dump({"shot": name, "w": W, "h": H, "frames": {"1": {"m": [list(r) for r in c.matrix_world], "lens": c.data.lens, "sensor": 36.0}}},
              open(os.path.join(out, "cam.json"), "w"))
    t0 = time.time()
    sc.render.filepath = os.path.join(out, "f_0001.png")
    bpy.ops.render.render(write_still=True)
    print("plate", name, round(time.time() - t0, 1), "s", flush=True)
