# Part A set for "The Hidebehind": a north-woods logging camp at night, c. 1900 (real lit Blender set, EEVEE, NO
# characters; the 2D cast is drawn in Remotion through the same camera, cam.json). Reuses the forest set's materials and
# builders (tools/blender/hidebehind_forest.py): same bark, needles, end grain, conifers, spruces, stumps, logs, the same
# moon/sky/haze and the same drifting ground mist, so Part A cuts cleanly into Part B's forest.
# Layout (world metres, ground z ~ 0): the campfire at FIRE = (0, 0) in a trodden snowy yard; a long log bunkhouse
# behind it (y ~ 9, lit windows, stovepipe chimney); a small cabin to the right; a logging sled and a skidway of cut
# logs; axes stuck in a chopping stump; the dark forest wall all around from ~13 m, thick on the west (-x) side where
# the forest-edge shot looks out between the trunks.
# Each shot is ONE still camera (moves are a slow 2.5D push in Remotion on an oversized plate). Every shot is rendered
# twice, fire "hi" and fire "lo"; Remotion cross-fades them per frame for a real firelight flicker on the set.
# usage: .venv-bpy/bin/python tools/blender/hidebehind_camp.py -- --shot a1 --fire hi --out out/hidebehind/camp/ [--res 1296]
import math
import os
import random
import sys

import bpy  # noqa: I001
import bmesh
import numpy as np
from mathutils import Matrix, Vector, noise

sys.path.insert(0, os.path.dirname(__file__))
import hidebehind_forest as F  # noqa: E402
import test_scene as ts  # noqa: E402

arg = ts.arg
rnd = random.Random(1897)
FIRE = (0.0, 0.0)

# still cameras: (location, aim, lens, focus point, fstop)
CAMS = {
    "a1": ((2.0, -9.0, 3.1), (-0.5, 4.5, 1.5), 24, (0.0, 0.0, 1.0), 5.6),      # wide establishing shot of the camp
    "a2": ((0.35, -4.3, 1.05), (0.0, 0.6, 1.0), 30, (0.0, 0.6, 1.0), 3.2),     # low at the fire: the men around it
    "a3": ((-0.35, -0.95, 1.1), (-1.75, 0.85, 1.45), 42, (-1.7, 0.75, 1.4), 1.4),  # close on the old logger's face
    "a4": ((-4.6, 1.2, 1.35), (-20.0, 4.2, 1.7), 30, (-8.2, 2.0, 1.2), 4.0),    # the forest edge, looking out west
}
SHOT = F.SHOT
CLEAR = 13.0  # no trunk in the camera's view cone closer than this (the camp itself must read)
C = CAMS[SHOT]
F.SHOTS[SHOT] = dict(n=1, t0=0.0, keys=[(1, C[0], C[1], C[2])], focus=C[3], fstop=C[4])


def ground_z(x, y, lat=None):
    d = math.hypot(x - FIRE[0], y - FIRE[1] - 3)
    k = min(1.0, max(0.0, (d - 9.0) / 8.0))
    return 0.03 * noise.noise(Vector((x * 0.5, y * 0.5, 1.0))) + k * 0.25 * (noise.noise(Vector((x * 0.12, y * 0.12, 0.5))) + 0.6)


F.ground_z = ground_z  # the shared builders (spruce, stump, log) sit on this ground


def snow_ground_mat():
    """deep old snow, crusted and wind-rippled; trodden grey-brown paths in the yard (attribute 'tr' 0..1)"""
    m, nd, ln, bs = ts.new_mat("snowground")
    tc = nd.new("ShaderNodeTexCoord")
    at = nd.new("ShaderNodeAttribute")
    at.attribute_name = "tr"
    fine = F._noise(nd, ln, tc.outputs["Object"], 40.0, 6.0, 0.7)
    coarse = F._noise(nd, ln, tc.outputs["Object"], 1.2, 6.0)
    br = F._noise(nd, ln, tc.outputs["Object"], 5.0, 4.0)
    tr = F._math(nd, ln, "ADD", at.outputs["Fac"], F._math(nd, ln, "MULTIPLY", br.outputs["Fac"], 0.5, clamp=False).outputs[0], clamp=False)
    tr = F._maprange(nd, ln, tr.outputs[0], 0.55, 0.85)
    snow = F._ramp(nd, ln, coarse.outputs["Fac"], (0.36, 0.41, 0.5), F.SNOW, 0.3, 0.7)
    mud = F._ramp(nd, ln, fine.outputs["Fac"], (0.03, 0.025, 0.021), (0.14, 0.13, 0.13), 0.3, 0.7)
    c = F._mix(nd, ln, tr.outputs[0], snow.outputs[0], mud.outputs[0]).outputs[2]
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.75
    hgt = F._math(nd, ln, "ADD", fine.outputs["Fac"], F._math(nd, ln, "MULTIPLY", tr.outputs[0], 0.8).outputs[0])
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.35
    bp.inputs["Distance"].default_value = 0.04
    ln.new(hgt.outputs[0], bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])
    return m


def ground(mat):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=300, y_subdivisions=300, size=1)
    o = bpy.context.object
    o.name = "ground"
    me = o.data
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    xs, ys = co[:, 0] * 2, co[:, 1] * 2
    co[:, 0] = 70 * np.sign(xs) * np.abs(xs) ** 1.5
    co[:, 1] = 3 + 70 * np.sign(ys) * np.abs(ys) ** 1.5
    tr = np.zeros(n)
    for i in range(n):
        x, y = co[i, 0], co[i, 1]
        co[i, 2] = ground_z(x, y)
        d = math.hypot(x, y)
        # trodden: a ring around the fire, a path to the bunkhouse door and the cabin, the sled track
        t = max(0.0, 1 - abs(d - 1.9) / 1.4)
        t = max(t, max(0.0, 1 - abs(x - 0.8) / 0.9) if 0 < y < 8.6 else 0)
        t = max(t, max(0.0, 1 - abs((y - 1.0) - 0.45 * (x - 1.0)) / 0.8) if 1.0 < x < 8.0 else 0)
        t = max(t, max(0.0, 1 - abs(y - 3.0) / 0.9) if -9 < x < -2 else 0)
        tr[i] = t
    me.vertices.foreach_set("co", co.ravel())
    at = me.attributes.new("tr", "FLOAT", "POINT")
    at.data.foreach_set("value", tr)
    me.update()
    me.materials.append(mat)
    ts.smooth(o)
    return o


def cyl(name, p0, p1, rad, mats, segs=14, jitter=0.012):
    a, b = Vector(p0), Vector(p1)
    ln_ = (b - a).length
    bm = bmesh.new()
    F._cone(bm, rad, rad * 0.94, ln_, Matrix(), segs=segs)
    for f in bm.faces:
        if abs(f.normal.z) > 0.95 and len(mats) > 1:
            f.material_index = 1
    for v in bm.verts:
        v.co.x += jitter * noise.noise(v.co * 4)
    o = F.mesh_obj(name, bm, mats)
    o.location = (a + b) / 2
    o.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return o


def box(name, loc, size, mat, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.rotation_euler[2] = rot
    o.data.materials.append(mat)
    return o


def log_building(name, cx, cy, w, d, h, rot, logbark, grain, roofmat, plank, glass, windows, door, chimney):
    """a horizontal-log building: notched log walls with overhanging ends, a low gable roof of snowy boards, glowing
    windows (emissive panes recessed in dark frames), a plank door, a stovepipe chimney"""
    R = Matrix.Rotation(rot, 4, "Z")
    T = Matrix.Translation((cx, cy, 0))
    objs = []
    r = 0.16
    nl = int(h / (2 * r * 0.92))
    for i in range(nl):
        z = r + i * 2 * r * 0.92
        jx, jy = rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05)
        for (p0, p1, rr) in (((-w / 2 - 0.35 + jx, -d / 2, z), (w / 2 + 0.35 + jx, -d / 2, z), r),
                             ((-w / 2 - 0.35 + jy, d / 2, z), (w / 2 + 0.35 + jy, d / 2, z), r),
                             ((-w / 2, -d / 2 - 0.35, z + r * 0.92), (-w / 2, d / 2 + 0.35, z + r * 0.92), r * 0.98),
                             ((w / 2, -d / 2 - 0.35, z + r * 0.92), (w / 2, d / 2 + 0.35, z + r * 0.92), r * 0.98)):
            objs.append(cyl(f"{name}_log", T @ R @ Vector(p0), T @ R @ Vector(p1), rr, [logbark, grain]))
    top = r + nl * 2 * r * 0.92
    # gable ends (log stubs stepping up) and the roof
    rise = d * 0.32
    for side in (-1, 1):
        for k in range(1, 6):
            z = top + (k - 0.5) * rise / 5
            hw = (d / 2) * (1 - (k - 0.5) / 5)
            objs.append(cyl(f"{name}_gab", T @ R @ Vector((side * w / 2, -hw, z)), T @ R @ Vector((side * w / 2, hw, z)), r * 0.95, [logbark, grain]))
    for side in (-1, 1):
        ang = math.atan2(rise, d / 2)
        ln_ = math.hypot(rise, d / 2) + 0.55
        bpy.ops.mesh.primitive_cube_add(size=1)
        o = bpy.context.object
        o.name = f"{name}_roof"
        o.scale = (w + 1.1, ln_, 0.16)
        o.rotation_euler = (side * ang, 0, 0)
        o.location = (0, -side * (d / 4 + 0.05), top + rise / 2 + 0.07)
        o.data.materials.append(roofmat)
        o.matrix_world = T @ R @ o.matrix_basis
        objs.append(o)
    for (wx, wz, ww, wh) in windows:  # on the front (-y) wall
        objs.append(box(f"{name}_wframe", (wx, -d / 2 - r - 0.02, wz), (ww + 0.16, 0.12, wh + 0.16), plank))
        objs.append(box(f"{name}_pane", (wx, -d / 2 - r - 0.06, wz), (ww, 0.04, wh), glass))
        for mx in (-0.25, 0.25):  # muntins
            objs.append(box(f"{name}_mun", (wx + mx * ww, -d / 2 - r - 0.09, wz), (0.035, 0.03, wh), plank))
        objs.append(box(f"{name}_mun", (wx, -d / 2 - r - 0.09, wz), (ww, 0.03, 0.035), plank))
        for o in objs[-6:]:
            o.matrix_world = T @ R @ o.matrix_basis
    if door is not None:
        dx = door
        for o in (box(f"{name}_door", (dx, -d / 2 - r - 0.03, 0.95), (0.95, 0.1, 1.9), plank),
                  box(f"{name}_lintel", (dx, -d / 2 - r - 0.06, 1.95), (1.2, 0.18, 0.16), plank)):
            o.matrix_world = T @ R @ o.matrix_basis
    if chimney is not None:
        sx = chimney
        pipe = cyl(f"{name}_pipe", T @ R @ Vector((sx, 0.6, top + rise * 0.6)), T @ R @ Vector((sx, 0.6, top + rise + 1.3)), 0.13,
                   [ts.flat_mat("iron", (0.03, 0.028, 0.027), rough=0.5, metal=0.6)], segs=12, jitter=0.0)
        objs.append(pipe)
    return objs


def campfire(stone, logbark, grain):
    for i in range(13):
        a = 2 * math.pi * i / 13 + rnd.uniform(-0.1, 0.1)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=rnd.uniform(0.13, 0.19),
                                              location=(FIRE[0] + 0.72 * math.cos(a), FIRE[1] + 0.72 * math.sin(a), 0.06))
        o = bpy.context.object
        o.scale.z = 0.65
        o.data.materials.append(stone)
    for i in range(5):  # a teepee of burning split logs
        a = 2 * math.pi * i / 5 + 0.4
        cyl("firelog", (FIRE[0] + 0.5 * math.cos(a), FIRE[1] + 0.5 * math.sin(a), 0.06), (FIRE[0], FIRE[1], 0.62), 0.065, [logbark, grain])
    ember = ts.flat_mat("embers", (1.0, 0.32, 0.06), emit=float(arg("--ember", "6")))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.42, location=(FIRE[0], FIRE[1], 0.02))
    o = bpy.context.object
    o.scale.z = 0.18
    o.data.materials.append(ember)
    o.visible_shadow = False
    # the flame body is drawn in 2D (Remotion); here only the light it throws
    hi = arg("--fire", "hi") == "hi"
    for nm, z, e, col, soft in (("fire", 0.75, 420 if hi else 290, (1.0, 0.42, 0.13), 0.35),
                                ("fire_low", 0.3, 80 if hi else 55, (1.0, 0.3, 0.08), 0.5)):
        fl = bpy.data.lights.new(nm, "POINT")
        fl.energy, fl.color, fl.shadow_soft_size = float(arg("--firee", "1")) * e, col, soft
        fl.use_custom_distance, fl.cutoff_distance = True, 22.0
        fl.volume_factor = float(arg("--firevol", "0.05"))
        o = ts.link(bpy.data.objects.new(nm, fl))
        o.location = (FIRE[0] + (0.06 if hi else -0.05), FIRE[1], z)


def sled(wood, iron, logbark, grain):
    """a logging bob-sled: two runners, bunks, a load of three logs chained on"""
    x0, y0, rot = -3.2, -5.8, 0.35
    R = Matrix.Rotation(rot, 4, "Z")
    T = Matrix.Translation((x0, y0, 0))
    for sy in (-0.55, 0.55):
        for o in (box("runner", (0, sy, 0.12), (3.2, 0.12, 0.18), wood), box("shoe", (0, sy, 0.03), (3.3, 0.1, 0.04), iron)):
            o.matrix_world = T @ R @ o.matrix_basis
        tip = cyl("tip", T @ R @ Vector((1.6, sy, 0.1)), T @ R @ Vector((1.85, sy, 0.38)), 0.06, [wood], segs=8, jitter=0.0)
    for bx in (-0.9, 0.9):
        o = box("bunk", (bx, 0, 0.32), (0.22, 1.6, 0.18), wood)
        o.matrix_world = T @ R @ o.matrix_basis
    for k, (dy, dz, r) in enumerate(((-0.33, 0.62, 0.22), (0.33, 0.62, 0.22), (0.0, 0.98, 0.21))):
        cyl("load", T @ R @ Vector((-1.7, dy, dz)), T @ R @ Vector((1.8, dy, dz)), r, [logbark, grain], segs=18)


def skidway(logbark, grain):
    """a deck of cut logs stacked on two skids, ends to the camera side"""
    x0, y0 = 6.2, -2.5
    for k, (dx, dz) in enumerate(((0, 0), (0.48, 0), (0.96, 0), (1.44, 0), (1.92, 0), (0.24, 0.42), (0.72, 0.42), (1.2, 0.42), (1.68, 0.42), (0.48, 0.83), (0.96, 0.83), (1.44, 0.83))):
        r = 0.22 + rnd.uniform(-0.03, 0.02)
        cyl("deck", (x0 + dx, y0 - 1.8, 0.28 + dz), (x0 + dx + rnd.uniform(-0.1, 0.1), y0 + 2.2, 0.28 + dz), r, [logbark, grain], segs=18)


def axes_in_stump(logbark, grain, wood, iron):
    F.stump("chopstump", (2.2, -1.9), 0.36, 0.55, logbark, grain, 3)
    for k, (dx, ang, rz) in enumerate(((-0.08, 0.55, 0.3), (0.12, -0.45, 2.1))):
        head = box(f"axehead{k}", (0, 0, 0), (0.2, 0.05, 0.12), iron)
        handle = cyl(f"axehandle{k}", (0, 0, 0), (0, 0, 0.82), 0.022, [wood], segs=8, jitter=0.0)
        piv = ts.link(bpy.data.objects.new(f"axe{k}", None))
        head.parent = handle.parent = piv
        handle.location = (0.06, 0, 0.41)
        head.location = (0.0, 0, 0.0)
        piv.location = (2.2 + dx, -1.9, 0.5)
        piv.rotation_euler = (0, ang, rz)
    # a chopping block with split firewood next to it
    for i in range(7):
        cyl("split", (1.3 + rnd.uniform(-0.3, 0.3), -2.5 + rnd.uniform(-0.2, 0.2), 0.08 + 0.1 * (i // 3)),
            (1.3 + rnd.uniform(-0.3, 0.3), -2.0 + rnd.uniform(-0.2, 0.2), 0.08 + 0.1 * (i // 3)), 0.06, [logbark, grain], segs=6)


def forest_ring(bark, bark2, needles):
    variants = [F.tree_mesh(f"tree{i}", rnd.uniform(28, 40), i * 7 + 3, bark if i % 2 else bark2, needles) for i in range(8)]
    for v in variants:
        v.hide_render = v.hide_viewport = True
    cam, aim = np.array(C[0][:2]), np.array(C[1][:2])
    fwd = (aim - cam) / np.linalg.norm(aim - cam)
    placed = []

    def blocked(x, y, r):
        p = np.array([x, y]) - cam
        along = p @ fwd
        if along < 0:
            return False
        if np.linalg.norm(p) < 2.0 + r:
            return True
        lat = abs(p[0] * fwd[1] - p[1] * fwd[0])
        if SHOT == "a4":  # keep the man's area clear (he stands ~3.6 m out), then the trunks close in
            return along < 5.5 and lat < 1.6 + r
        return along < CLEAR and lat < 0.3 * along + 0.8 + r

    for i in range(1400):
        a = rnd.uniform(0, 2 * math.pi)
        # the clearing: ~12.5 m around the yard, ragged; the west side (forest-edge shot) comes in closer
        r0 = 12.5 + 2.5 * noise.noise(Vector((math.cos(a) * 2, math.sin(a) * 2, 0.3)))
        if math.cos(a) < -0.6:
            r0 -= 1.5
        d = r0 + rnd.random() ** 1.3 * 50
        x, y = FIRE[0] + d * math.cos(a), 3 + d * math.sin(a)
        rad = rnd.uniform(0.2, 0.42) * (1.15 if d > 25 else 1.0)
        if blocked(x, y, rad) or any(math.hypot(x - px, y - py) < 0.9 + pr + rad for px, py, pr in placed[-400:]):
            continue
        if len(placed) > 700:
            break
        o = ts.link(bpy.data.objects.new("trunk", variants[rnd.randrange(8)].data))
        o.location = (x, y, ground_z(x, y) - 0.15)
        o.scale = (rad, rad, rnd.uniform(0.9, 1.1))
        o.rotation_euler = (rnd.uniform(-0.012, 0.012), rnd.uniform(-0.012, 0.012), rnd.uniform(0, 6.3))
        placed.append((x, y, rad))
    # young spruces along the clearing edge and stumps of the trees the camp cut
    for i in range(60):
        a = rnd.uniform(0, 2 * math.pi)
        d = 11.0 + rnd.uniform(0, 5)
        x, y = d * math.cos(a), 3 + d * math.sin(a)
        if not blocked(x, y, 1.0):
            F.spruce(f"spruce{i}", (x, y), rnd.uniform(1.2, 3.2), needles, bark, i)
    return placed


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    F.lights_world(sc)
    for nm in ("camp", "campfire"):  # the forest set's distant camp glow: here we ARE the camp
        bpy.data.objects.remove(bpy.data.objects[nm])
    bark = F.bark_mat("bark", (0.012, 0.01, 0.009), (0.1, 0.085, 0.072))
    bark2 = F.bark_mat("bark2", (0.011, 0.01, 0.01), (0.085, 0.08, 0.077))
    logbark = F.bark_mat("logbark", (0.02, 0.015, 0.011), (0.12, 0.09, 0.065), snow=0.9, stretch=0.12)
    grain = F.endgrain_mat()
    needles = F.needle_mat("needles", snow=0.45)
    roof = F.bark_mat("roof", (0.03, 0.025, 0.02), (0.09, 0.075, 0.06), snow=1.0, stretch=1.0)
    plank = ts.flat_mat("plank", (0.05, 0.035, 0.025), rough=0.9)
    glass = ts.flat_mat("window", (1.0, 0.52, 0.2), emit=float(arg("--win", "9")))
    stone = ts.flat_mat("stone", (0.08, 0.08, 0.085), rough=0.9)
    iron = ts.flat_mat("ironm", (0.05, 0.05, 0.055), rough=0.4, metal=0.8)
    wood = ts.flat_mat("wood", (0.11, 0.07, 0.04), rough=0.8)
    ground(snow_ground_mat())
    log_building("bunk", -1.0, 10.0, 11.0, 5.5, 2.3, 0.0, logbark, grain, roof, plank, glass,
                 windows=[(-3.5, 1.3, 0.9, 0.75), (2.6, 1.3, 0.9, 0.75)], door=0.8, chimney=-1.5)
    log_building("cabin", 8.8, 5.2, 5.0, 4.0, 2.0, math.radians(-62), logbark, grain, roof, plank, glass,
                 windows=[(-1.0, 1.1, 0.55, 0.5)], door=1.0, chimney=1.2)
    log_building("shed", -8.6, 9.5, 4.0, 3.2, 1.8, math.radians(40), logbark, grain, roof, plank, glass,
                 windows=[], door=0.3, chimney=None)
    # warm spill from the windows onto the snow in front of them
    for (x, y) in ((-4.5, 6.6), (1.6, 6.6), (7.2, 3.6)):
        wl = bpy.data.lights.new("winlight", "AREA")
        wl.size, wl.energy, wl.color = 0.8, float(arg("--winl", "60")), (1.0, 0.55, 0.22)
        o = ts.link(bpy.data.objects.new("winlight", wl))
        o.location = (x, y, 1.25)
        o.rotation_euler = (math.radians(-80), 0, 0)
    campfire(stone, logbark, grain)
    sled(wood, iron, logbark, grain)
    skidway(logbark, grain)
    axes_in_stump(logbark, grain, wood, iron)
    for i, (x, y) in enumerate(((-6.5, -4.5), (4.5, 9.0), (-3.0, -8.0), (8.0, -6.5), (-10.0, 1.0), (10.5, 0.5))):
        F.stump(f"stump{i}", (x, y), rnd.uniform(0.28, 0.38), rnd.uniform(0.4, 0.6), logbark, grain, i + 10)
    forest_ring(bark, bark2, needles)
    F.ground_mist()
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "24"))
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    for k, v in (("volumetric_tile_size", arg("--vtile", "8")), ("volumetric_end", 75.0), ("volumetric_start", 0.3),
                 ("use_volumetric_shadows", True), ("volumetric_samples", int(arg("--vsamples", "64"))),
                 ("volumetric_sample_distribution", 0.85), ("volumetric_shadow_samples", 8),
                 ("shadow_ray_count", 1), ("shadow_step_count", 6)):
        if hasattr(ee, k):
            setattr(ee, k, v)
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "1.3"))
    sc.render.image_settings.file_format = "PNG"
    return sc


def camera(sc):
    c = ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_width, c.data.clip_start, c.data.clip_end = 36, 0.05, 250
    c.data.lens = C[2]
    c.location = C[0]
    c.data.dof.use_dof = True
    c.data.dof.aperture_fstop = C[4]
    c.data.dof.focus_distance = (Vector(C[3]) - Vector(C[0])).length
    d = Vector(C[1]) - Vector(C[0])
    c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.camera = c
    sc.frame_start = sc.frame_end = 1
    return c


if __name__ == "__main__":
    import json
    sc = build()
    cam = camera(sc)
    res = int(arg("--res", "1296"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(round(res * 16 / 9))
    out = os.path.abspath(arg("--out", "out/hidebehind/camp/"))
    os.makedirs(out, exist_ok=True)
    sc.frame_set(1)
    json.dump({"shot": SHOT, "res": res, "frames": {"1": {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36}}},
              open(os.path.join(out, f"{SHOT}.json"), "w"))
    sc.render.filepath = os.path.join(out, f"{SHOT}_{arg('--fire', 'hi')}.png")
    bpy.ops.render.render(write_still=True)
