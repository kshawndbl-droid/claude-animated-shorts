# 3D set for "The Man-Eaters of Tsavo", Part C: the House of Lords, 1898 (a generic Victorian Gothic chamber, our own
# build, no real likeness): red leather benches in tiers down both sides, dark oak panelling, tall stained-glass windows,
# brass chandeliers, a gilded canopy at the far end, the clerks' table in the middle. The flat 2D cast goes on top in
# Remotion through cam.json. Camera: a slow low push down the aisle toward the table where the Prime Minister speaks.
# usage: .venv-bpy/bin/python tools/blender/tsavo_lords.py -- --out out/tsavo/sets/lords/ [--range 1-130] [--step 2] [--res 720]
import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import test_scene as ts  # noqa: E402

arg, A = ts.arg, ts.A
N = 130


def mat(name, rgb, rough=0.6, metal=0.0, emit=0.0):
    return ts.flat_mat(name, rgb, rough=rough, metal=metal, emit=emit)


def box(loc, size, m, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        b = o.modifiers.new("bev", "BEVEL")
        b.width, b.segments = bevel, 2
    o.data.materials.append(m)
    return o


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.015, 0.012, 1)
    oak = ts.tex_mat("oak", os.path.join(A, "ambientcg", "Planks040"), "Planks040_1K-JPG", scale=3, tint=(0.42, 0.26, 0.15))
    floor = ts.tex_mat("floorwood", os.path.join(A, "ambientcg", "Planks040"), "Planks040_1K-JPG", scale=6, tint=(0.5, 0.33, 0.2))
    leather = mat("leather", (0.42, 0.04, 0.035), rough=0.45)
    leather_d = mat("leather_d", (0.26, 0.025, 0.02), rough=0.5)
    carpet = mat("carpet", (0.14, 0.025, 0.022), rough=0.95)
    gold = mat("gold", (0.85, 0.6, 0.25), rough=0.3, metal=1.0)
    dark = mat("darkoak", (0.09, 0.05, 0.03), rough=0.55)
    cloth = mat("tablecloth", (0.12, 0.1, 0.22), rough=0.9)
    stone = mat("stone", (0.42, 0.36, 0.3), rough=0.9)
    L, W = 32.0, 15.0
    box((0, L / 2, -0.05), (W, L + 4, 0.1), floor)
    box((0, L / 2, 0.005), (3.4, L - 4, 0.02), carpet)
    # side walls: oak panelling up to 5.5 m with vertical mouldings, stone above with tall windows, a dark ceiling
    for s in (-1, 1):
        box((s * W / 2, L / 2, 2.75), (0.3, L + 4, 5.5), oak)
        for i in range(17):
            box((s * (W / 2 - 0.17), 0.5 + i * 2.0, 2.75), (0.06, 0.12, 5.4), dark)
        box((s * (W / 2 - 0.2), L / 2, 5.55), (0.25, L + 4, 0.25), gold)
        box((s * W / 2, L / 2, 9.5), (0.4, L + 4, 8.0), stone)
        for i in range(6):
            y = 3.5 + i * 5.0
            gl = mat(f"glass{s}{i}", (1.0, 0.72, 0.42) if i % 2 else (0.85, 0.7, 0.55), emit=1.1)
            box((s * (W / 2 - 0.22), y, 9.2), (0.05, 2.2, 5.2), gl)
            bpy.ops.mesh.primitive_cylinder_add(vertices=3, radius=1.27, depth=0.05, location=(s * (W / 2 - 0.22), y, 12.15),
                                                rotation=(0, math.pi / 2, 0))
            bpy.context.object.rotation_euler = (math.pi / 2, 0, math.pi / 2)
            bpy.context.object.scale = (1, 0.7, 1)
            bpy.context.object.data.materials.append(gl)
            for dx in (-1.25, 1.25):
                box((s * (W / 2 - 0.25), y + dx, 9.5), (0.12, 0.25, 6.0), stone)
            box((s * (W / 2 - 0.26), y, 9.2), (0.05, 0.08, 5.2), dark)  # mullion
            box((s * (W / 2 - 0.26), y, 9.2), (0.05, 2.2, 0.06), dark)  # transom
            # daylight falling in through the window
            lt = ts.link(bpy.data.objects.new(f"win{s}{i}", bpy.data.lights.new(f"win{s}{i}", "AREA")))
            lt.data.energy, lt.data.color, lt.data.size = 260, (1.0, 0.82, 0.6), 2.2
            lt.location = (s * (W / 2 - 0.6), y, 9.2)
            lt.rotation_euler = (0, -s * math.radians(70), 0)
    box((0, L / 2, 13.6), (W + 1, L + 4, 0.3), dark)
    for i in range(9):
        box((0, 0.5 + i * 4, 13.4), (W, 0.25, 0.25), gold)
    # benches: four tiers each side, red leather seat and back on oak plinths, facing the aisle
    for s in (-1, 1):
        for k in range(4):
            x = s * (2.4 + k * 1.05)
            z = 0.25 * k
            box((x, 12.5, z / 2 + 0.01), (1.05, 21, z + 0.02), oak)
            box((x - s * 0.05, 12.5, z + 0.24), (0.6, 21, 0.18), leather, bevel=0.05)
            box((x + s * 0.34, 12.5, z + 0.62), (0.16, 21, 0.62), leather_d, bevel=0.04)
            box((x + s * 0.42, 12.5, z + 0.25), (0.06, 21, 0.5), dark)
        for y in (2.0, 23.0):
            box((s * 4.0, y, 0.6), (3.8, 0.12, 1.2), dark)
    # the table in the aisle with its brass-bound boxes and books, the red woolsack beyond, the gilded canopy at the end
    box((0, 13.0, 0.78), (1.6, 4.2, 0.08), cloth)
    box((0, 13.0, 0.38), (1.4, 4.0, 0.74), dark)
    for (x, y) in [(0.45, 11.6), (-0.45, 14.3)]:
        box((x, y, 0.92), (0.45, 0.32, 0.22), oak)
        box((x, y, 0.92), (0.47, 0.06, 0.24), gold)
    for (x, y, c) in [(-0.3, 12.4, (0.15, 0.25, 0.12)), (0.2, 13.8, (0.4, 0.1, 0.06)), (0.35, 12.9, (0.6, 0.5, 0.35))]:
        box((x, y, 0.86), (0.28, 0.2, 0.08), mat(f"book{x}", c))
    box((0, 21.5, 0.4), (2.2, 1.6, 0.8), leather, bevel=0.25)
    box((0, L - 0.3, 6), (W, 0.4, 12), oak)
    box((0, L - 0.6, 6.0), (6.0, 0.4, 9.0), gold)
    box((0, L - 0.85, 5.2), (4.6, 0.2, 6.6), mat("canopyred", (0.35, 0.03, 0.03), rough=0.7))
    for x in (-2.6, -1.3, 1.3, 2.6):
        box((x, L - 0.9, 5.5), (0.22, 0.3, 9.0), gold)
    box((0, L - 1.4, 1.2), (1.2, 0.8, 2.4), gold, bevel=0.1)
    box((0, L - 1.85, 0.6), (0.9, 0.6, 0.8), leather)
    box((0, L - 2.0, 0.15), (6, 3.0, 0.3), carpet)
    lamp = ts.link(bpy.data.objects.new("canopy", bpy.data.lights.new("canopy", "AREA")))
    lamp.data.energy, lamp.data.color, lamp.data.size = 400, (1.0, 0.75, 0.45), 3
    lamp.location, lamp.rotation_euler = (0, L - 6, 6), (math.radians(-60), 0, 0)
    # brass chandeliers: a ring of candle bulbs hanging on a rod, each with a warm point light
    bulb = mat("bulb", (1.0, 0.8, 0.5), emit=25.0)
    for y in (6.0, 14.0, 22.0):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.9, minor_radius=0.05, location=(0, y, 6.2))
        bpy.context.object.data.materials.append(gold)
        box((0, y, 9.9), (0.05, 0.05, 7.4), gold)
        for i in range(8):
            a = i * math.tau / 8
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=(0.9 * math.cos(a), y + 0.9 * math.sin(a), 6.32))
            bpy.context.object.data.materials.append(bulb)
        pl = ts.link(bpy.data.objects.new(f"ch{y}", bpy.data.lights.new(f"ch{y}", "POINT")))
        pl.data.energy, pl.data.color, pl.data.shadow_soft_size = 900, (1.0, 0.72, 0.42), 0.9
        pl.location = (0, y, 6.0)
    fill = ts.link(bpy.data.objects.new("fill", bpy.data.lights.new("fill", "SUN")))
    fill.data.energy, fill.data.color, fill.data.use_shadow = 0.25, (0.9, 0.8, 0.75), False
    fill.rotation_euler = (math.radians(30), 0, math.radians(160))
    sc.render.engine = "BLENDER_EEVEE"
    sc.eevee.taa_render_samples = int(arg("--samples", "12"))
    if hasattr(sc.eevee, "use_raytracing"):
        sc.eevee.use_raytracing = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "0.0"))
    sc.render.image_settings.file_format = "PNG"
    # camera: low in the aisle, pushing slowly toward the table, drifting a little to the right
    c = ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_width, c.data.clip_start, c.data.clip_end = 36, 0.05, 200
    c.data.dof.use_dof, c.data.dof.aperture_fstop = True, 4.0
    foc = ts.link(bpy.data.objects.new("focus", None))
    foc.location = (1.3, 12.6, 1.2)
    c.data.dof.focus_object = foc
    aim = ts.link(bpy.data.objects.new("aim", None))
    tc = c.constraints.new("TRACK_TO")
    tc.target, tc.track_axis, tc.up_axis = aim, "TRACK_NEGATIVE_Z", "UP_Y"
    for f, loc, look, lens in [(1, (-0.9, 3.5, 1.5), (0.5, 20, 2.6), 22), (N, (-0.6, 7.8, 1.4), (0.9, 18, 2.2), 25)]:
        c.location = loc
        c.keyframe_insert("location", frame=f)
        aim.location = look
        aim.keyframe_insert("location", frame=f)
        c.data.lens = lens
        c.data.keyframe_insert("lens", frame=f)
    sc.camera = c
    sc.frame_start, sc.frame_end = 1, N
    return sc, c


if __name__ == "__main__":
    sc, cam = build()
    res = int(arg("--res", "720"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(res * 16 / 9)
    out = os.path.abspath(arg("--out", "out/tsavo/sets/lords/"))
    os.makedirs(out, exist_ok=True)
    cams = {}
    for f in range(1, N + 1):
        sc.frame_set(f)
        cams[f] = {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36}
    json.dump({"shot": "lords", "frames": cams}, open(os.path.join(out, "cam.json"), "w"))
    import time
    a, b = (int(x) for x in arg("--range", f"1-{N}").split("-"))
    for f in range(a, b + 1, int(arg("--step", "1"))):
        p = os.path.join(out, f"f_{f:04d}.png")
        if os.path.exists(p):
            continue
        t0 = time.time()
        sc.frame_set(f)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        print("frame", f, round(time.time() - t0, 1), "s", flush=True)
