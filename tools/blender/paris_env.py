# Background plates for the Eiffel Short in the illustrated "big-head 2D characters on a soft painted world" look:
# Paris 1925 at dusk WITHOUT characters (they are drawn in 2D and composited in Remotion). Reuses the Paris street
# from paris_scene.py and adds plane trees, a cafe terrace, Morris columns, parked cars, warm haze (mist pass) and
# camera depth of field. Writes PNG frames plus cam.json (camera matrix, lens, sensor per frame) so the 2D cast can be
# placed on the 3D ground with the right perspective and no foot sliding.
# usage: .venv-bpy/bin/python tools/blender/paris_env.py -- --shot wide --out out/eiffel/plates/wide/ [--range 1-120] [--res 720]
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import face_rig as fr  # noqa: E402
import test_scene as ts  # noqa: E402
import paris_scene as ps  # noqa: E402

arg = ts.arg
FPS = 30
rnd = random.Random(1926)

# shot definitions: frames, camera keys (frame, location, aim, lens), focus point, render scale
SHOTS = {
    # wide establishing: a slow crane up from the kerb, the street opening up to the tower at sunset
    "wide": dict(n=120, keys=[(1, (3.2, -4.0, 1.4), (0.6, 60, 6.0), 22), (120, (2.4, 2.5, 5.2), (0.0, 80, 9.0), 24)], focus=(4.8, 22, 1.0), fstop=8.0),
    # two-shot: the camera trucks along the cafe side while two people meet on the pavement
    "two": dict(n=150, keys=[(1, (1.6, 18.6, 1.15), (6.4, 22.4, 1.5), 30), (150, (1.6, 21.6, 1.2), (6.4, 25.0, 1.5), 30)], focus=(5.6, 23.5, 0.9), fstop=2.0),
    # close-up: tight on a face, the street and the tower melting into the dusk behind
    "close": dict(n=90, keys=[(1, (4.0, 17.2, 1.15), (5.4, 40, 3.2), 50), (90, (4.05, 17.6, 1.17), (5.3, 40, 3.3), 52)], focus=(4.95, 20.4, 1.2), fstop=1.4),
}


def toon(name, rgb, lit=0.4, shadow=(0.62, 0.55, 0.7)):
    return ps.toon(name, rgb, lit=lit, shadow=shadow)


def plane_tree(loc, s, wind_e, wind_t, bark, leaf):
    ts.CANOPY_SUB = 3
    ts.olive_tree(loc, s, wind_e, wind_t, bark, leaf)


def morris_column(loc):
    body = toon("morris", (0.13, 0.3, 0.22), lit=0.35)
    post = toon("poster", (0.92, 0.82, 0.55), lit=0.35)
    x, y = loc
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.55, depth=2.6, location=(x, y, 1.45))
    o = bpy.context.object
    o.data.materials.append(post)
    fr.add_outline(o, 0.02)
    for z, r, d in ((0.12, 0.66, 0.24), (2.8, 0.66, 0.16)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=d, location=(x, y, z))
        b = bpy.context.object
        b.data.materials.append(body)
        fr.add_outline(b, 0.02)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=8, radius=0.62, location=(x, y, 2.9))
    d = bpy.context.object
    d.scale = (1, 1, 0.55)
    d.data.materials.append(body)
    fr.add_outline(d, 0.02)


def terrace(x0, y0, y1, side):
    iron = toon("bistro_iron", (0.08, 0.08, 0.09))
    top = toon("bistro_top", (0.85, 0.82, 0.76), lit=0.35)
    cane = toon("cane", (0.62, 0.42, 0.22), lit=0.35)
    y = y0
    while y < y1:
        for dx in (0.0, 1.1):
            x = x0 - side * dx
            bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.32, depth=0.04, location=(x, y, 0.88))
            t = bpy.context.object
            t.data.materials.append(top)
            fr.add_outline(t, 0.015)
            bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.025, depth=0.72, location=(x, y, 0.52))
            bpy.context.object.data.materials.append(iron)
            for a in (0.6, 3.6):
                cx, cy = x + 0.5 * math.cos(a), y + 0.5 * math.sin(a)
                bpy.ops.mesh.primitive_cube_add(location=(cx, cy, 0.6))
                c = bpy.context.object
                c.scale = (0.2, 0.2, 0.03)
                c.data.materials.append(cane)
                bpy.ops.mesh.primitive_cube_add(location=(cx + 0.18 * math.cos(a), cy + 0.18 * math.sin(a), 0.85))
                b = bpy.context.object
                b.scale = (0.04, 0.2, 0.25)
                b.rotation_euler = (0, 0, a)
                b.data.materials.append(cane)
                fr.add_outline(b, 0.01)
            if rnd.random() < 0.6:  # a wine glass / coffee cup glint
                bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.04, depth=0.09, location=(x + 0.1, y, 0.95))
                bpy.context.object.data.materials.append(ps.glow("cupglow", (1.0, 0.9, 0.75), 1.2))
        y += 2.2


def shopfronts():
    """lit shop windows and painted signs on the ground floor near the camera"""
    warm = ps.glow("shopwin", (1.0, 0.68, 0.36), 2.6)
    sign_cols = [(0.55, 0.1, 0.1), (0.1, 0.25, 0.2), (0.12, 0.16, 0.35), (0.35, 0.22, 0.08)]
    frame = toon("shopframe", (0.18, 0.12, 0.08))
    for side in (-1, 1):
        y = 8.0
        i = 0
        while y < 70:
            x = side * 7.55
            bpy.ops.mesh.primitive_cube_add(location=(x, y + 2.0, 1.4))
            w = bpy.context.object
            w.scale = (0.05, 1.6, 0.9)
            w.data.materials.append(warm)
            bpy.ops.mesh.primitive_cube_add(location=(x - side * 0.04, y + 2.0, 1.4))
            f = bpy.context.object
            f.scale = (0.04, 1.75, 1.02)
            f.data.materials.append(frame)
            fr.add_outline(f, 0.02)
            bpy.ops.mesh.primitive_cube_add(location=(x - side * 0.08, y + 2.0, 2.75))
            s = bpy.context.object
            s.scale = (0.06, 1.9, 0.28)
            s.data.materials.append(toon(f"sign{i % 4}", sign_cols[i % 4], lit=0.4))
            fr.add_outline(s, 0.02)
            y += rnd.uniform(5.5, 7.5)
            i += 1


def build_env():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    ts.world()
    w = sc.world
    for n in list(w.node_tree.nodes):
        if n.type == "PRINCIPLED_VOLUME":
            w.node_tree.nodes.remove(n)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    for n in w.node_tree.nodes:
        if n.type == "MAPPING":
            n.inputs["Rotation"].default_value = (0, 0, math.radians(95))
    sun = bpy.data.objects["sun"]
    sun.data.energy = 2.6
    sun.data.color = (1.0, 0.66, 0.42)
    sun.rotation_euler = (Vector((0, 0, 0)) - Vector((-4, 12, 1.9))).to_track_quat("-Z", "Y").to_euler()
    ts.clouds()
    for n in bpy.data.materials["clouds"].node_tree.nodes:
        if n.type == "MAPPING":
            n.inputs["Scale"].default_value = (0.005, 0.009, 0.03)
        if n.type == "EMISSION":
            n.inputs["Color"].default_value = (1.0, 0.62, 0.58, 1)
            n.inputs["Strength"].default_value = 0.95
    ps.street()
    ps.facades()
    ps.lamps()
    ps.eiffel()
    shopfronts()
    ps.car((0.45, 0.07, 0.06), ((-2.6, 2), (-2.6, 75)), 1, 160)
    ps.car((0.07, 0.12, 0.3), ((-2.4, 90), (-2.4, 8)), 60, 260)
    ps.car((0.12, 0.1, 0.08), ((3.4, 44), (3.4, 44.01)), 1, 300)  # parked
    for i, (p0, p1, ph) in enumerate((((-20, 30, 9), (25, 46, 12), 0.0), ((-24, 34, 10), (22, 50, 13), 1.3))):
        ts.seagull(p0, p1, ph)
    for o in bpy.data.objects:
        if o.name.startswith("gull") and o.type == "MESH":
            o.scale = (0.7, 0.7, 0.7)
            o.data.materials[0] = toon("pigeon", (0.45, 0.47, 0.52))
    # plane trees along both pavements, swaying
    wind_t = ts.wind_texture("wind", 3.0)
    wind_e = ts.wind_driver_empty("wind_e", (0.6, 0.25))
    bark = toon("bark", (0.45, 0.38, 0.3), lit=0.35)
    for side in (-1, 1):
        for k, y in enumerate(range(10, 120, 11)):
            leaf = toon(f"leaf{k % 3}", [(0.22, 0.4, 0.16), (0.27, 0.45, 0.18), (0.3, 0.42, 0.14)][k % 3], lit=0.42)
            plane_tree((side * 5.35, y + side * 2.5, 0.16), 1.25, wind_e, wind_t, bark, leaf)
    terrace(6.6, 24.0, 33.0, 1)
    terrace(-6.6, 14.0, 21.0, -1)
    morris_column((5.6, 14.2))
    morris_column((-5.6, 38.0))
    ts.dust(Vector((0, 16, 1.5)))
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name != "sun":
            o.data.use_shadow = False
    key = ts.link(bpy.data.objects.new("key", bpy.data.lights.new("key", "SUN")))
    key.data.energy = 1.2
    key.data.color = (1.0, 0.86, 0.78)
    key.data.use_shadow = False
    key.rotation_euler = (Vector((0, 0, 0)) - Vector((3, -6, 4))).to_track_quat("-Z", "Y").to_euler()
    rim = ts.link(bpy.data.objects.new("rimL", bpy.data.lights.new("rimL", "SUN")))
    rim.data.energy = 1.6
    rim.data.color = (0.75, 0.7, 1.0)
    rim.data.use_shadow = False
    rim.rotation_euler = (Vector((0, 0, 0)) - Vector((-4, 8, 4))).to_track_quat("-Z", "Y").to_euler()
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "8"))
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    if hasattr(ee, "shadow_resolution_scale"):
        ee.shadow_resolution_scale = 0.5
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "Medium High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "-0.15"))
    sc.render.image_settings.file_format = "PNG"
    # mist pass for the dusk haze (applied in post by tools/eiffel_plates.py)
    vl = sc.view_layers[0]
    vl.use_pass_mist = True
    sc.world.mist_settings.start = 6
    sc.world.mist_settings.depth = 260
    sc.world.mist_settings.falloff = "QUADRATIC"
    return sc


def shot_camera(sc, name):
    S = SHOTS[name]
    c = ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_width = 36
    c.data.clip_start = 0.05
    c.data.clip_end = 1500
    c.data.dof.use_dof = True
    c.data.dof.aperture_fstop = S["fstop"]
    foc = ts.link(bpy.data.objects.new("focus", None))
    foc.location = S["focus"]
    c.data.dof.focus_object = foc
    aim = ts.link(bpy.data.objects.new("aim", None))
    tc = c.constraints.new("TRACK_TO")
    tc.target = aim
    tc.track_axis = "TRACK_NEGATIVE_Z"
    tc.up_axis = "UP_Y"
    for f, loc, look, lens in S["keys"]:
        c.location = loc
        c.keyframe_insert("location", frame=f)
        aim.location = look
        aim.keyframe_insert("location", frame=f)
        c.data.lens = lens
        c.data.keyframe_insert("lens", frame=f)
    sc.camera = c
    sc.frame_start, sc.frame_end = 1, S["n"]
    return c


def setup_mist_output(sc, mist_dir):
    """compositor: write the mist pass next to the beauty (Blender 5 node-group compositor, older API as fallback)"""
    try:
        ng = bpy.data.node_groups.new("comp", "CompositorNodeTree")
        sc.compositing_node_group = ng
        rl = ng.nodes.new("CompositorNodeRLayers")
        out = ng.nodes.new("NodeGroupOutput")
        ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        ng.links.new(rl.outputs["Image"], out.inputs[0])
        fo = ng.nodes.new("CompositorNodeOutputFile")
        try:
            fo.directory = mist_dir
        except AttributeError:
            fo.base_path = mist_dir
        fo.format.file_format = "PNG"
        fo.format.color_depth = "16"
        fo.format.color_mode = "BW"
        try:
            fo.file_output_items.new("FLOAT", "m_")
            ng.links.new(rl.outputs["Mist"], fo.inputs[0])
        except Exception:
            ng.links.new(rl.outputs["Mist"], fo.inputs[0])
        print("mist output ok", flush=True)
    except Exception as e:  # noqa: BLE001
        print("mist output failed:", e, flush=True)


if __name__ == "__main__":
    name = arg("--shot", "wide")
    sc = build_env()
    cam = shot_camera(sc, name)
    res = int(arg("--res", "540"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(res * 16 / 9)
    out = os.path.abspath(arg("--out", f"out/eiffel/plates/{name}/"))
    os.makedirs(out, exist_ok=True)
    setup_mist_output(sc, os.path.join(out, "mist"))
    a, b = (int(x) for x in arg("--range", f"1-{SHOTS[name]['n']}").split("-"))
    step = int(arg("--step", "1"))
    cams = {}
    for f in range(1, SHOTS[name]["n"] + 1):
        sc.frame_set(f)
        m = cam.matrix_world
        cams[f] = {"m": [list(r) for r in m], "lens": cam.data.lens, "sensor": 36, "w": res, "h": int(res * 16 / 9)}
    json.dump({"shot": name, "focus": SHOTS[name]["focus"], "frames": cams}, open(os.path.join(out, "cam.json"), "w"))
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
    for f in range(a, b + 1, step):
        p = os.path.join(out, f"f_{f:04d}.png")
        if os.path.exists(p):
            continue
        sc.frame_set(f)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        print("frame", f, flush=True)
