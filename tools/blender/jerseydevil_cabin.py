# Part A set for "The Jersey Devil": the 1735 Pine Barrens cabin interior on a stormy night (real lit Blender set,
# EEVEE, NO characters; the 2D mother and the shadows are drawn in Remotion through the same camera, <shot>.json).
# Same pipeline as the Hidebehind camp (tools/blender/hidebehind_camp.py): one still camera per shot, slow 2.5D pushes in
# Remotion, the fire rendered "hi" and "lo" and cross-faded per frame for a real firelight flicker. Extra variants here:
#   flash  the lightning: the window and a cold blue-white light pouring in through it (fire mid)
#   out    the fire guttered low after the thing escapes up the chimney (s4 only)
#   rock   the cradle alone (everything else is a holdout, transparent film) at a range of rock angles, so Remotion can
#          rock it with correct perspective and light (it picks the two nearest angles per frame)
# Layout (world metres, floor z = 0): room x -2.6..2.6, y -3.0..2.4, ceiling 2.5. The fieldstone hearth is on the back
# wall (y = 2.4) centred on x = 0.6; the cradle stands left of it at CRADLE (long axis along y, hood toward the back
# wall), so the fire throws its shadow onto the LEFT wall (x = -2.6), where the shadow grows. Small window in the left
# wall at y ~ -0.6 (rain and lightning), dried herbs hang from the middle beam, a table with a candle on the right.
# usage: .venv-bpy/bin/python tools/blender/jerseydevil_cabin.py -- --shot s1 --variants hi,lo,flash,rock --out out/jerseydevil/cabin/ [--res 1296]
import math
import os
import random
import sys

import bpy  # noqa: I001
import bmesh
from mathutils import Matrix, Vector, noise

sys.path.insert(0, os.path.dirname(__file__))
import hidebehind_forest as F  # noqa: E402
import test_scene as ts  # noqa: E402

arg = ts.arg
rnd = random.Random(1735)
RX0, RX1, RY0, RY1, RH = -2.6, 2.6, -3.0, 2.4, 2.5
HEARTH_X = 0.6
FIRE = (HEARTH_X, 2.05, 0.3)
CRADLE = (-0.55, 1.3)
ROCKR = 0.55          # rocker radius: the cradle rolls on its rockers about an axis ROCKR above the floor
WIN = (-0.6, 1.3)     # window centre (y, z) on the left wall

# still cameras: (location, aim, lens, focus point, fstop)
CAMS = {
    "s1": ((1.3, -2.2, 1.35), (-0.6, 1.6, 0.95), 20, (-0.55, 1.0, 0.6), 4.0),   # wide: the room, window, cradle, hearth
    "s2": ((-1.9, -0.9, 1.25), (0.3, 2.0, 1.0), 26, (-0.6, 0.65, 1.1), 2.8),     # the mother against the fire
    "s3": ((1.0, -0.6, 1.1), (-2.6, 1.6, 0.85), 20, (-0.55, 1.3, 0.4), 5.6),     # the cradle and the left wall
    "s4": ((-0.6, -0.6, 0.75), (0.5, 2.3, 1.15), 20, (0.6, 2.0, 0.6), 4.0),       # low on the hearth, up to the flue
}
SHOT = F.SHOT
C = CAMS[SHOT]
F.ground_z = lambda x, y, lat=None: 0.05   # F.log sits the fire logs on the hearthstone


def plank_mat(name, dark, light, vertical=True, scale=7.0, bump=0.7):
    """worn boards: wave stripes across the board width, grain noise, dark gaps (as the shack set)"""
    m, nd, ln, bs = ts.new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    ln.new(tc.outputs["Object"], mp.inputs[0])
    if not vertical:
        mp.inputs["Rotation"].default_value = (0, 0, math.radians(90))
    wv = nd.new("ShaderNodeTexWave")
    wv.inputs["Scale"].default_value = scale
    wv.inputs["Distortion"].default_value = 0.4
    wv.wave_profile = "SAW"
    ln.new(mp.outputs[0], wv.inputs["Vector"])
    gap = F._maprange(nd, ln, wv.outputs["Fac"], 0.0, 0.06)
    gm = nd.new("ShaderNodeMapping")
    gm.inputs["Scale"].default_value = (12.0, 12.0, 0.6) if vertical else (0.6, 12.0, 12.0)
    ln.new(tc.outputs["Object"], gm.inputs[0])
    grain = F._noise(nd, ln, gm.outputs[0], 6.0, 10.0, 0.7)
    col = F._ramp(nd, ln, grain.outputs["Fac"], dark, light, 0.3, 0.75)
    c = F._mix(nd, ln, gap.outputs[0], (0.01, 0.008, 0.007), col.outputs[0]).outputs[2]
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.85
    h = F._math(nd, ln, "MULTIPLY", gap.outputs[0], grain.outputs["Fac"])
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = bump
    bp.inputs["Distance"].default_value = 0.02
    ln.new(h.outputs[0], bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])
    return m


def hewn_mat(name, dark, light, axis="z"):
    """adzed log / beam wood: long grain stretched along the axis, a few dark checks (cracks), worn lighter ridges"""
    m, nd, ln, bs = ts.new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = {"z": (1.0, 1.0, 0.07), "x": (0.07, 1.0, 1.0), "y": (1.0, 0.07, 1.0)}[axis]
    ln.new(tc.outputs["Object"], mp.inputs[0])
    g = F._noise(nd, ln, mp.outputs[0], 18.0, 10.0, 0.65)
    big = F._noise(nd, ln, tc.outputs["Object"], 2.5, 4.0)
    ck = F._noise(nd, ln, mp.outputs[0], 7.0, 2.0, 0.5)
    crack = F._maprange(nd, ln, ck.outputs["Fac"], 0.47, 0.5)
    col = F._ramp(nd, ln, g.outputs["Fac"], dark, light, 0.35, 0.7)
    col = F._mix(nd, ln, big.outputs["Fac"], col.outputs[0], (0.5, 0.45, 0.4), "MULTIPLY")
    c = F._mix(nd, ln, F._math(nd, ln, "SUBTRACT", 1.0, crack.outputs[0]).outputs[0], col.outputs[2], (0.01, 0.008, 0.006)).outputs[2]
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.85
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.6
    bp.inputs["Distance"].default_value = 0.02
    ln.new(F._math(nd, ln, "MULTIPLY", g.outputs["Fac"], crack.outputs[0]).outputs[0], bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])
    return m


def stone_mat(name="fieldstone", soot=0.0):
    """rounded fieldstones in dark mortar; soot > 0 blackens it from the bottom of the firebox up"""
    m, nd, ln, bs = ts.new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    vo = nd.new("ShaderNodeTexVoronoi")
    vo.feature = "DISTANCE_TO_EDGE"
    vo.inputs["Scale"].default_value = 5.5
    ln.new(tc.outputs["Object"], vo.inputs["Vector"])
    vc = nd.new("ShaderNodeTexVoronoi")
    vc.inputs["Scale"].default_value = 5.5
    ln.new(tc.outputs["Object"], vc.inputs["Vector"])
    mortar = F._maprange(nd, ln, vo.outputs["Distance"], 0.02, 0.08)
    no = F._noise(nd, ln, tc.outputs["Object"], 20.0, 8.0, 0.65)
    stone = F._ramp(nd, ln, vc.outputs["Color"], (0.09, 0.075, 0.06), (0.26, 0.22, 0.17), 0.0, 1.0)
    stone = F._mix(nd, ln, no.outputs["Fac"], stone.outputs[0], (0.05, 0.045, 0.04), "MULTIPLY")
    c = F._mix(nd, ln, mortar.outputs[0], (0.035, 0.03, 0.026), stone.outputs[2]).outputs[2]
    if soot:
        c = F._mix(nd, ln, soot, c, (0.012, 0.01, 0.009)).outputs[2]
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.85
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 1.0
    bp.inputs["Distance"].default_value = 0.05
    ln.new(F._math(nd, ln, "MULTIPLY", mortar.outputs[0], no.outputs["Fac"]).outputs[0], bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])
    return m


def daub_mat():
    """clay-and-moss chinking between the wall logs"""
    m, nd, ln, bs = ts.new_mat("daub")
    tc = nd.new("ShaderNodeTexCoord")
    no = F._noise(nd, ln, tc.outputs["Object"], 9.0, 8.0, 0.7)
    c = F._ramp(nd, ln, no.outputs["Fac"], (0.07, 0.055, 0.04), (0.2, 0.16, 0.11), 0.35, 0.7)
    ln.new(c.outputs[0], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.95
    return m


def ember_mat():
    m, nd, ln, bs = ts.new_mat("embers")
    tc = nd.new("ShaderNodeTexCoord")
    no = F._noise(nd, ln, tc.outputs["Object"], 14.0, 6.0, 0.6)
    k = F._maprange(nd, ln, no.outputs["Fac"], 0.45, 0.7)
    c = F._ramp(nd, ln, k.outputs[0], (0.02, 0.012, 0.01), (1.0, 0.32, 0.06))
    ln.new(c.outputs[0], bs.inputs["Base Color"])
    ln.new(c.outputs[0], bs.inputs["Emission Color"])
    e = F._math(nd, ln, "MULTIPLY", k.outputs[0], float(arg("--ember", "14")), clamp=False)
    ln.new(e.outputs[0], bs.inputs["Emission Strength"])
    return m


def box(name, loc, size, mat, rot=(0, 0, 0), coll=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.rotation_euler = rot
    o.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)   # textures in metres
    return o


def box2(name, x0, x1, y0, y1, z0, z1, mat):
    return box(name, ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (x1 - x0, y1 - y0, z1 - z0), mat)


def wall_log(name, p0, p1, z, r, bark, grain):
    """one hewn log of a wall course, axis from p0 to p1 (xy) at height z"""
    a, b = Vector((*p0, z)), Vector((*p1, z))
    ln_ = (b - a).length
    bm = bmesh.new()
    F._cone(bm, r, r * 0.95, ln_, Matrix(), segs=14)
    for f in bm.faces:
        if abs(f.normal.z) > 0.95:
            f.material_index = 1
    sd = rnd.uniform(0, 50)
    for v in bm.verts:
        v.co.x += 0.02 * noise.noise(v.co * 3 + Vector((sd, 0, 0)))
        v.co.y += 0.02 * noise.noise(v.co * 3 + Vector((0, sd, 0)))
    o = F.mesh_obj(name, bm, [bark, grain])
    o.location = (a + b) / 2
    d = (b - a).normalized()
    o.rotation_euler = (0, math.radians(90), math.atan2(d.y, d.x))
    return o


def walls(bark, grain, daub):
    r, step = 0.14, 0.255
    n = int(RH / step) + 1
    for i in range(n):
        z = 0.12 + i * step
        off = 0.08 if i % 2 else 0.0
        # back wall (hearth wall) and front wall run along x; logs stick out past the corners
        wall_log(f"lb{i}", (RX0 - 0.35 - off, RY1 + r), (RX1 + 0.35 + off, RY1 + r), z, r, bark, grain)
        wall_log(f"lf{i}", (RX0 - 0.35 - off, RY0 - r), (RX1 + 0.35 + off, RY0 - r), z, r, bark, grain)
        wall_log(f"lr{i}", (RX1 + r, RY0 - 0.35 + off), (RX1 + r, RY1 + 0.35 - off), z, r, bark, grain)
        # left wall: split around the window
        wy0, wy1, wz0, wz1 = WIN[0] - 0.36, WIN[0] + 0.36, WIN[1] - 0.36, WIN[1] + 0.38
        if wz0 - 0.1 < z < wz1 + 0.1:
            wall_log(f"ll{i}a", (RX0 - r, RY0 - 0.35 + off), (RX0 - r, wy0), z, r, bark, grain)
            wall_log(f"ll{i}b", (RX0 - r, wy1), (RX0 - r, RY1 + 0.35 - off), z, r, bark, grain)
        else:
            wall_log(f"ll{i}", (RX0 - r, RY0 - 0.35 + off), (RX0 - r, RY1 + 0.35 - off), z, r, bark, grain)
    # daub behind the logs (the chinking seen in the gaps)
    box2("daub_b", RX0 - 0.5, RX1 + 0.5, RY1 + 0.2, RY1 + 0.26, 0, RH + 0.2, daub)
    box2("daub_f", RX0 - 0.5, RX1 + 0.5, RY0 - 0.26, RY0 - 0.2, 0, RH + 0.2, daub)
    box2("daub_r", RX1 + 0.2, RX1 + 0.26, RY0 - 0.5, RY1 + 0.5, 0, RH + 0.2, daub)
    wy0, wy1, wz0, wz1 = WIN[0] - 0.36, WIN[0] + 0.36, WIN[1] - 0.36, WIN[1] + 0.38
    box2("daub_l1", RX0 - 0.26, RX0 - 0.2, RY0 - 0.5, wy0, 0, RH + 0.2, daub)
    box2("daub_l2", RX0 - 0.26, RX0 - 0.2, wy1, RY1 + 0.5, 0, RH + 0.2, daub)
    box2("daub_l3", RX0 - 0.26, RX0 - 0.2, wy0, wy1, 0, wz0, daub)
    box2("daub_l4", RX0 - 0.26, RX0 - 0.2, wy0, wy1, wz1, RH + 0.2, daub)


def ceiling_floor(floor, ceil, beam):
    box2("floor", RX0 - 0.4, RX1 + 0.4, RY0 - 0.4, RY1 + 0.4, -0.05, 0.0, floor)
    box2("ceiling", RX0 - 0.4, RX1 + 0.4, RY0 - 0.4, RY1 + 0.4, RH, RH + 0.05, ceil)
    for i, y in enumerate((-1.7, -0.1, 1.35)):
        b = box2(f"beam{i}", RX0 - 0.3, RX1 + 0.3, y - 0.1, y + 0.1, RH - 0.24, RH, beam)
        b.rotation_euler.x = rnd.uniform(-0.01, 0.01)


def window(trim, rainglass, iron):
    y, z = WIN
    x = RX0 - 0.1
    pane = box("win_pane", (x - 0.05, y, z), (0.02, 0.62, 0.64), rainglass)
    pane.visible_shadow = False   # the storm light outside shines in through it
    for dy, dz, sz in ((0, 0.35, (0.14, 0.76, 0.08)), (0, -0.35, (0.2, 0.8, 0.09)), (-0.34, 0, (0.14, 0.08, 0.76)), (0.34, 0, (0.14, 0.08, 0.76)),
                       (0, 0, (0.06, 0.035, 0.64)), (0, 0.0, (0.06, 0.62, 0.035))):
        box("win_frame", (x + 0.02, y + dy, z + dz), sz, trim)
    # a crooked shutter hanging open on the inside, an iron hook
    sh = box("shutter", (x + 0.16, y - 0.58, z), (0.035, 0.4, 0.7), trim, rot=(0, 0, math.radians(-38)))
    box("hook", (x + 0.06, y + 0.4, z - 0.1), (0.02, 0.02, 0.08), iron)
    return sh


def hearth(stone, soot_stone, wood, iron, bark, grain, embers):
    x0, x1 = HEARTH_X - 0.95, HEARTH_X + 0.95
    fx0, fx1 = HEARTH_X - 0.55, HEARTH_X + 0.55
    yb, yf = RY1 + 0.02, RY1 - 0.66
    oh = 1.05  # firebox opening height
    box2("jambL", x0, fx0, yf, yb, 0, oh, stone)
    box2("jambR", fx1, x1, yf, yb, 0, oh, stone)
    box2("fireback", fx0, fx1, yb - 0.12, yb, 0, RH, soot_stone)
    box2("lintel", x0 - 0.05, x1 + 0.05, yf - 0.06, yf + 0.14, oh, oh + 0.2, wood)
    # chimney breast above the lintel: front face and sides, hollow inside (the throat rises behind the lintel)
    box2("breast_f", x0, x1, yf, yf + 0.24, oh + 0.2, RH, stone)
    box2("breast_l", x0, fx0, yf, yb, oh + 0.2, RH, stone)
    box2("breast_r", fx1, x1, yf, yb, oh + 0.2, RH, stone)
    box2("smoke_shelf", fx0, fx1, yf, yf + 0.28, oh - 0.04, oh + 0.2, soot_stone)
    box2("flue_dark", fx0 - 0.1, fx1 + 0.1, yf + 0.2, yb, RH, RH + 0.6, ts.flat_mat("flue", (0.0, 0.0, 0.0)))
    # sooty inner cheeks of the firebox (angled), hearthstone, mantel shelf
    for s, xx in ((-1, fx0 + 0.06), (1, fx1 - 0.06)):
        box("cheek", (xx, yb - 0.32, oh / 2), (0.12, 0.6, oh), soot_stone, rot=(0, 0, math.radians(s * 18)))
    box2("hearthstone", x0 - 0.2, x1 + 0.2, yf - 0.5, yb - 0.1, 0.0, 0.05, stone)
    box2("mantel", x0 - 0.12, x1 + 0.12, yf - 0.2, yf + 0.02, 1.42, 1.48, wood)
    for i, (dx, h, r) in enumerate(((-0.75, 0.2, 0.06), (-0.5, 0.14, 0.07), (0.55, 0.24, 0.05), (0.78, 0.12, 0.08))):
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(HEARTH_X + dx, yf - 0.09, 1.48 + h / 2))
        o = bpy.context.object
        o.data.materials.append(ts.flat_mat(f"crock{i}", (0.24, 0.2, 0.15) if i % 2 else (0.13, 0.1, 0.08), rough=0.55))
        ts.smooth(o)
    # fire: three logs on andirons, a bed of embers
    box2("embers", fx0 + 0.15, fx1 - 0.15, yb - 0.55, yb - 0.15, 0.05, 0.075, embers)
    for i, (a, b, r) in enumerate((((HEARTH_X - 0.35, 2.02), (HEARTH_X + 0.32, 2.12), 0.07), ((HEARTH_X - 0.3, 1.9), (HEARTH_X + 0.25, 2.0), 0.06),
                                   ((HEARTH_X - 0.15, 1.92), (HEARTH_X + 0.3, 2.1), 0.055))):
        lo = F.log(f"firelog{i}", a, b, r, bark, grain)
        lo.location.z += 0.05 + 0.08 * (i == 2)
    for dx in (-0.3, 0.3):
        box2("andiron", HEARTH_X + dx - 0.02, HEARTH_X + dx + 0.02, yb - 0.6, yb - 0.25, 0.05, 0.2, iron)
    # crane with an iron pot over the fire
    box2("crane", fx0 + 0.05, fx0 + 0.09, yb - 0.2, yb - 0.16, 0.1, 0.9, iron)
    box2("crane_arm", fx0 + 0.05, HEARTH_X + 0.05, yb - 0.2, yb - 0.16, 0.86, 0.9, iron)
    box2("pothook", HEARTH_X - 0.01, HEARTH_X + 0.01, yb - 0.19, yb - 0.17, 0.6, 0.88, iron)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.17, location=(HEARTH_X, yb - 0.18, 0.5))
    o = bpy.context.object
    o.scale = (1, 1, 0.8)
    o.data.materials.append(iron)
    ts.smooth(o)
    return fx0, fx1, yb, oh


def cradle(wood, wool, linen):
    """hooded plank cradle on two rockers; every part is parented to an empty (the rocking pivot), collection 'cradle'"""
    cx, cy = CRADLE
    col = bpy.data.collections.new("cradle")
    bpy.context.scene.collection.children.link(col)
    piv = bpy.data.objects.new("cradle_pivot", None)
    col.objects.link(piv)
    piv.location = (cx, cy, ROCKR)
    parts = []
    W, L, z0, z1 = 0.46, 0.92, 0.13, 0.42
    parts.append(box("cr_bottom", (cx, cy, z0), (W, L, 0.025), wood))
    for s in (-1, 1):
        parts.append(box("cr_side", (cx + s * W / 2, cy, (z0 + z1) / 2), (0.025, L, z1 - z0), wood, rot=(0, math.radians(-s * 6), 0)))
    parts.append(box("cr_foot", (cx, cy - L / 2, (z0 + z1) / 2 - 0.02), (W + 0.03, 0.03, z1 - z0 - 0.04), wood))
    parts.append(box("cr_head", (cx, cy + L / 2, (z0 + z1 + 0.2) / 2), (W + 0.04, 0.035, z1 - z0 + 0.2), wood))
    for s in (-1, 1):  # top rails
        parts.append(box("cr_rail", (cx + s * (W / 2 + 0.02), cy, z1 + 0.01), (0.04, L + 0.02, 0.03), wood))
    # the hood: a half barrel over the head end
    bm = bmesh.new()
    segs = 12
    for i in range(segs + 1):
        a = math.pi * i / segs
        for yy in (0.0, 0.34):
            bm.verts.new((math.cos(a) * (W / 2 + 0.025), yy, math.sin(a) * 0.26))
    bm.verts.ensure_lookup_table()
    for i in range(segs):
        v = bm.verts
        bm.faces.new((v[2 * i], v[2 * i + 1], v[2 * i + 3], v[2 * i + 2]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.02)
    hood = F.mesh_obj("cr_hood", bm, [wood])
    hood.location = (cx, cy + L / 2 - 0.34, z1)
    ts.smooth(hood)
    parts.append(hood)
    # rockers: two curved boards across the cradle (it rocks side to side, about the long axis y)
    for s in (-1, 1):
        bm = bmesh.new()
        n = 16
        span = math.asin(0.36 / ROCKR)
        for i in range(n + 1):
            a = -span + 2 * span * i / n
            for zz in (0.0, 0.07):
                r = ROCKR - zz
                bm.verts.new((math.sin(a) * r, 0, ROCKR - math.cos(a) * r))
        bm.verts.ensure_lookup_table()
        for i in range(n):
            v = bm.verts
            bm.faces.new((v[2 * i], v[2 * i + 2], v[2 * i + 3], v[2 * i + 1]))
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.04)
        ro = F.mesh_obj("cr_rocker", bm, [wood])
        ro.location = (cx, cy + s * 0.3 - 0.02, 0.0)
        parts.append(ro)
        parts.append(box("cr_post", (cx, cy + s * 0.3, 0.1), (0.3, 0.035, 0.07), wood))
    # bedding: a folded wool blanket (a soft lump; the child is never shown) and a linen pillow under the hood
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=(cx, cy - 0.05, z0 + 0.1))
    bl = bpy.context.object
    bl.name = "cr_blanket"
    bl.scale = (1.0, 1.8, 0.42)
    for v in bl.data.vertices:
        v.co += Vector((noise.noise(v.co * 6), noise.noise(v.co * 6 + Vector((3, 1, 0))), 0.0)) * 0.03
    bl.data.materials.append(wool)
    ts.smooth(bl)
    parts.append(bl)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(cx, cy + 0.3, z0 + 0.08))
    pl = bpy.context.object
    pl.scale = (1.4, 0.8, 0.45)
    pl.data.materials.append(linen)
    ts.smooth(pl)
    parts.append(pl)
    for o in parts:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        col.objects.link(o)
        mw = o.matrix_world.copy()
        o.parent = piv
        o.matrix_parent_inverse = piv.matrix_world.inverted()
        o.matrix_world = mw
    return piv, col


def herbs(twine):
    """bunches of dried herbs hanging upside down from the middle beam"""
    for i in range(5):
        x = -2.3 + i * 0.3 + rnd.uniform(-0.05, 0.05)
        y = 1.35 + rnd.uniform(-0.06, 0.06)
        drop = rnd.uniform(0.18, 0.32)
        box("twine", (x, y, RH - 0.24 - drop / 2), (0.006, 0.006, drop), twine)
        bm = bmesh.new()
        hh = rnd.uniform(0.28, 0.42)
        for k in range(rnd.randint(22, 30)):
            a = rnd.uniform(0, 6.28)
            sp = rnd.uniform(0.02, 0.12)
            res = bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=0.003, radius2=0.008 + sp * 0.12, depth=hh * rnd.uniform(0.7, 1.0),
                                        matrix=Matrix.Translation((math.cos(a) * sp * 0.5, math.sin(a) * sp * 0.5, -hh / 2)) @ Matrix.Rotation(math.pi + rnd.uniform(-0.25, 0.25), 4, "X"))
        hue = rnd.choice(((0.11, 0.1, 0.04), (0.15, 0.1, 0.05), (0.09, 0.09, 0.05), (0.16, 0.06, 0.05)))
        o = F.mesh_obj(f"herbs{i}", bm, [ts.flat_mat(f"herbc{i}", hue, rough=0.9)])
        o.location = (x, y, RH - 0.24 - drop)
        o.rotation_euler.z = rnd.uniform(0, 6.28)


def furniture(wood, wood2, iron, linen):
    # table on the right with a candle in an iron holder, a bowl, a loaf; a three-legged stool; a broom by the hearth
    tx, ty = 1.75, -0.35
    box2("tabletop", tx - 0.45, tx + 0.45, ty - 0.7, ty + 0.7, 0.72, 0.77, wood)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box("tableleg", (tx + sx * 0.36, ty + sy * 0.6, 0.36), (0.06, 0.06, 0.72), wood2)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.022, depth=0.2, location=(tx - 0.15, ty + 0.25, 0.87))
    cd = bpy.context.object
    cd.data.materials.append(ts.flat_mat("tallow", (0.75, 0.68, 0.5), rough=0.4))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.015, location=(tx - 0.15, ty + 0.25, 0.775))
    bpy.context.object.data.materials.append(iron)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.14, location=(tx + 0.12, ty - 0.2, 0.8))
    bw = bpy.context.object
    bw.scale = (1, 1, 0.35)
    bw.data.materials.append(wood2)
    ts.smooth(bw)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(tx + 0.05, ty + 0.45, 0.81))
    lf = bpy.context.object
    lf.scale = (1.4, 0.9, 0.6)
    lf.data.materials.append(ts.flat_mat("bread", (0.3, 0.17, 0.07), rough=0.8))
    ts.smooth(lf)
    for i, (sx, sy) in enumerate(((1.0, 0.75), (-1.6, -1.6))):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.19, depth=0.05, location=(sx, sy, 0.45))
        bpy.context.object.data.materials.append(wood)
        for k in range(3):
            a = k * 2.094 + 0.3
            box("stoolleg", (sx + 0.12 * math.cos(a), sy + 0.12 * math.sin(a), 0.22), (0.04, 0.04, 0.46), wood2,
                rot=(0.12 * math.sin(a), -0.12 * math.cos(a), 0))
    # broom leaning by the right jamb
    box("broomstick", (HEARTH_X + 1.12, RY1 - 0.75, 0.75), (0.03, 0.03, 1.45), wood2, rot=(math.radians(-12), 0, 0))
    bpy.ops.mesh.primitive_cone_add(radius1=0.13, radius2=0.04, depth=0.4, location=(HEARTH_X + 1.12, RY1 - 0.92, 0.2))
    bpy.context.object.data.materials.append(ts.flat_mat("straw", (0.32, 0.24, 0.1), rough=0.95))
    # shelf with crockery on the right wall, a hanging shawl on a peg by the window
    box2("shelf", RX1 - 0.25, RX1, -2.0, -0.9, 1.55, 1.59, wood)
    for i in range(4):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.16 + 0.05 * (i % 2), location=(RX1 - 0.12, -1.85 + i * 0.25, 1.67))
        bpy.context.object.data.materials.append(ts.flat_mat(f"pot{i}", (0.2, 0.13, 0.08) if i % 2 else (0.32, 0.29, 0.24), rough=0.5))
    box("shawl", (RX0 + 0.06, -1.55, 1.25), (0.06, 0.38, 0.8), linen, rot=(math.radians(4), 0, 0))
    box("peg", (RX0 + 0.06, -1.55, 1.68), (0.12, 0.03, 0.03), wood2)
    return (tx - 0.15, ty + 0.25, 0.97)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    var = arg("--variant", "hi")
    wo = bpy.data.worlds.new("cabin")
    wo.use_nodes = True
    bg = wo.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.004, 0.006, 0.012, 1)
    bg.inputs[1].default_value = 1.0
    sc.world = wo
    bark = hewn_mat("logwood", (0.035, 0.025, 0.018), (0.15, 0.11, 0.075), "z")
    grain = F.endgrain_mat()
    daub = daub_mat()
    floor = plank_mat("floorboards", (0.08, 0.06, 0.042), (0.12, 0.088, 0.06), False, 5.0, 0.25)
    ceil = plank_mat("ceilboards", (0.012, 0.01, 0.008), (0.04, 0.032, 0.025), True, 6.0)
    beam = hewn_mat("beam", (0.025, 0.018, 0.013), (0.1, 0.075, 0.052), "x")
    trim = plank_mat("trim", (0.04, 0.03, 0.022), (0.12, 0.09, 0.065), True, 3.0)
    wood = plank_mat("cradlewood", (0.07, 0.04, 0.022), (0.22, 0.14, 0.08), True, 8.0)
    wood2 = plank_mat("darkwood", (0.035, 0.025, 0.018), (0.1, 0.075, 0.05), True, 6.0)
    stone = stone_mat()
    soot = stone_mat("sootstone", soot=0.85)
    iron = ts.flat_mat("iron", (0.03, 0.03, 0.032), rough=0.45, metal=0.8)
    wool = F.bark_mat("wool", (0.12, 0.09, 0.06), (0.3, 0.24, 0.17), stretch=1.0)
    linen = ts.flat_mat("linen", (0.42, 0.38, 0.3), rough=0.9)
    flash = var == "flash"
    glass = ts.flat_mat("rainglass", (0.1, 0.14, 0.24) if not flash else (0.75, 0.85, 1.0), rough=0.2, emit=0.35 if not flash else float(arg("--flashglass", "40")))
    walls(bark, grain, daub)
    ceiling_floor(floor, ceil, beam)
    window(trim, glass, iron)
    hearth(stone, soot, wood2, iron, bark, grain, ember_mat())
    piv, col = cradle(wood, wool, linen)
    herbs(ts.flat_mat("twine", (0.2, 0.16, 0.1)))
    candle = furniture(wood2, wood2, iron, linen)
    # fire: a cluster of warm point lights in the firebox (energy per variant: hi / lo / mid for flash+rock / out)
    fe = {"hi": 1.0, "lo": 0.62, "flash": 0.8, "rock": 0.8, "out": 0.22}[var] * float(arg("--fire", "320"))
    for i, (dx, dz, k) in enumerate(((0, 0.3, 0.6), (-0.25, 0.22, 0.2), (0.25, 0.25, 0.2))):
        la = bpy.data.lights.new(f"fire{i}", "POINT")
        la.energy, la.color = fe * k, (1.0, 0.42, 0.12)
        la.shadow_soft_size = 0.12
        o = ts.link(bpy.data.objects.new(f"fire{i}", la))
        o.location = (FIRE[0] + dx, FIRE[1] - 0.15, dz)
    # the fire's spill out of the firebox mouth (the jambs would otherwise keep the side walls dark): this is the light
    # that throws the cradle's shadow up the left wall
    la = bpy.data.lights.new("spill", "POINT")
    la.energy, la.color, la.shadow_soft_size = fe * float(arg("--spillk", "0.9")), (1.0, 0.45, 0.14), 0.08
    o = ts.link(bpy.data.objects.new("spill", la))
    o.location = (FIRE[0], 1.55, 0.35)
    # the candle on the table (small, warm)
    la = bpy.data.lights.new("candle", "POINT")
    la.energy, la.color, la.shadow_soft_size = float(arg("--candle", "6")), (1.0, 0.6, 0.28), 0.02
    o = ts.link(bpy.data.objects.new("candle", la))
    o.location = (candle[0], candle[1], candle[2] + 0.05)
    # storm outside the window: cold blue sky light coming in; the lightning flash floods it
    la = bpy.data.lights.new("storm", "AREA")
    la.shape, la.size, la.size_y = "RECTANGLE", 0.7, 0.7
    la.energy = float(arg("--flash", "550")) if flash else float(arg("--moon", "70"))
    la.color = (0.62, 0.74, 1.0)
    o = ts.link(bpy.data.objects.new("storm", la))
    o.location = (RX0 - 0.6, WIN[0] - 0.2, WIN[1] + 0.5)
    o.rotation_euler = Vector((1.0, 0.25, -0.55)).to_track_quat("-Z", "Y").to_euler()
    # a faint cool fill so the dark corners are not pure black
    la = bpy.data.lights.new("fill", "AREA")
    la.size, la.energy, la.color = 3.0, float(arg("--fill", "10")), (0.35, 0.48, 0.9)
    o = ts.link(bpy.data.objects.new("fill", la))
    o.location = (0.0, -2.0, RH - 0.1)
    o.rotation_euler = (0, 0, 0)
    # smoky air in the room (volumetric haze catches the firelight)
    if var != "rock":
        mv = bpy.data.materials.new("haze")
        mv.use_nodes = True
        nt = mv.node_tree
        nt.nodes.remove(nt.nodes["Principled BSDF"])
        pv = nt.nodes.new("ShaderNodeVolumePrincipled")
        pv.inputs["Density"].default_value = float(arg("--haze", "0.012"))
        pv.inputs["Color"].default_value = (0.8, 0.75, 0.7, 1)
        nt.links.new(pv.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
        hz = box2("haze", RX0, RX1, RY0, RY1, 0.0, RH, mv)
        hz.display_type = "WIRE"
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "32")) if var != "rock" else 16   # the lone cradle needs fewer
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    for k, v in (("volumetric_tile_size", "8"), ("volumetric_end", 12.0), ("volumetric_start", 0.1),
                 ("use_volumetric_shadows", True), ("volumetric_samples", 64), ("volumetric_sample_distribution", 0.6),
                 ("volumetric_shadow_samples", 8), ("shadow_ray_count", 2), ("shadow_step_count", 8)):
        if hasattr(ee, k):
            setattr(ee, k, v)
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "1.25"))
    sc.render.image_settings.file_format = "PNG"
    if var != "rock":
        # the plates show the room WITHOUT the cradle (it still casts its shadow and contact shadow); Remotion lays the
        # rocking cradle layer on top
        for ob in col.all_objects:
            ob.visible_camera = False
    if var == "rock":
        # only the cradle is seen: every other object is a holdout (it still casts light and shadow on the cradle)
        sc.render.film_transparent = True
        sc.render.image_settings.color_mode = "RGBA"
        for ob in sc.objects:
            if ob.type == "MESH" and col not in ob.users_collection:
                ob.is_holdout = True
    return sc, piv


def camera(sc):
    c = ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_width, c.data.clip_start, c.data.clip_end = 36, 0.05, 60
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
    sc, piv = build()
    cam = camera(sc)
    res = int(arg("--res", "1296"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(round(res * 16 / 9))
    out = os.path.abspath(arg("--out", "out/jerseydevil/cabin/"))
    os.makedirs(out, exist_ok=True)
    sc.frame_set(1)
    var = arg("--variant", "hi")
    json.dump({"shot": SHOT, "res": res, "cradle": [CRADLE[0], CRADLE[1], ROCKR], "fire": list(FIRE),
               "frames": {"1": {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36}}},
              open(os.path.join(out, f"{SHOT}.json"), "w"))
    if var == "rock":
        # rock angles in degrees; rolling on the rockers: rotate about y at the pivot and roll sideways by R * angle
        for a in [float(v) for v in arg("--angles", "-6,-4,-2,0,2,4,6").split(",")]:
            piv.rotation_euler = (0, math.radians(a), 0)
            piv.location.x = CRADLE[0] + ROCKR * math.radians(a)
            sc.render.filepath = os.path.join(out, f"{SHOT}_rock{int(round(a)):+d}.png")
            bpy.ops.render.render(write_still=True)
    else:
        sc.render.filepath = os.path.join(out, f"{SHOT}_{var}.png")
        bpy.ops.render.render(write_still=True)
    print("done", out)
