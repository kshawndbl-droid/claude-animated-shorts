# 3D set for "The Jersey Devil" (Pine Barrens folklore, our retelling set c. 1935): real lit Blender set (EEVEE), NO
# characters; the flat 2D cast is drawn in Remotion on top through the same camera (cam.json). Same pipeline as the
# Hidebehind (materials/conifer builders/moon/haze/drifting mist come from tools/blender/hidebehind_forest.py), but a new
# place: pale Pine Barrens sand and needle litter (no snow), short crooked pitch pines with high ragged crowns, low
# scrub-oak brush, and the trapper's small board-and-batten shack with a cedar-shingle roof, a fieldstone chimney on its
# right gable (where it comes back in), a warm firelit window, a plank door, traps and pelts hung on the wall.
#
# WALK PATH (world metres, ground z ~ 0, walkers at z ~ 0.03): a sandy footpath crossing the frame in front of the
# shack: C0 = [0.0, 3.5], D = [1, 0] (left -> right on screen), RT = [0, -1] (walker's right = toward camera).
# Shack: front wall at y = SHACK_Y, centred on x = 0, door at x ~ 0.3, window at x ~ -1.1, chimney at x ~ +2.35.
# usage: .venv-bpy/bin/python tools/blender/jerseydevil_set.py -- --shot chartest --out out/jerseydevil/sets/chartest/ [--res 1080]
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
rnd = random.Random(1735)
SHACK_Y, SW, SD, WALL_H = 7.0, 4.4, 3.4, 2.3
CAMS = {
    # character tests: still camera beside the path, the shack behind the walker
    "chartest": ((0.25, 0.9, 1.35), (0.0, 9.0, 1.45), 22, (0.0, 3.5, 0.9), 4.0),
    # full video, part B (all still cameras; moves are 2.5D pushes/pans on oversized plates in Remotion)
    "ext1": ((0.6, -2.6, 1.75), (0.0, 8.0, 2.35), 24, (0.0, 7.0, 1.5), 5.6),        # wide: the shack in the pines
    "in1": ((-1.75, 7.45, 1.35), (1.7, 8.9, 1.0), 19, (1.1, 8.75, 1.0), 4.0),        # inside: him at the fire
    "in3": ((1.35, 10.0, 1.35), (-1.1, 7.0, 1.4), 22, (-1.1, 7.0, 1.45), 4.0),      # inside: the window, him in front
    "in4": ((-1.7, 9.9, 1.0), (1.6, 8.6, 2.75), 17, (1.6, 8.7, 2.4), 4.0),          # inside: rafters + chimney breast
    "in5": ((0.55, 9.75, 0.75), (1.85, 8.7, 0.72), 24, (1.75, 8.7, 0.7), 2.8),       # close: the hearth opening
    "flue": ((30.0, 30.0, 0.2), (30.0, 30.03, 5.0), 16, (30.0, 30.0, 2.5), 8.0),     # POV straight up the flue
}
FIRE = float(arg("--fire", "1"))   # hearth fire strength (render hi = 1 and lo ~ 0.7, cross-fade in Remotion)
SHOT = F.SHOT
INTERIOR = SHOT.startswith("in") or SHOT == "flue"
C = CAMS[SHOT]
F.SHOTS[SHOT] = dict(n=1, t0=0.0, keys=[(1, C[0], C[1], C[2])], focus=C[3], fstop=C[4])


def ground_z(x, y, lat=None):
    d_path = abs(y - 3.5)
    yard = 1.0 if (abs(x) < SW / 2 + 1.5 and 3.5 < y < SHACK_Y + SD + 1) else 0.0
    k = min(1.0, max(0.0, (d_path - 1.0) / 2.5)) * (1 - yard)
    return 0.025 * noise.noise(Vector((x * 0.7, y * 0.7, 1.0))) + k * (0.18 * noise.noise(Vector((x * 0.15, y * 0.15, 0.5))) + 0.08)


F.ground_z = ground_z


def sand_mat():
    """pale grey-tan Pine Barrens sand; the path and yard are bare trodden sand, elsewhere a litter of brown pine
    needles, dark patches and leaves (attribute 'tr' 0..1 = trodden)"""
    m, nd, ln, bs = ts.new_mat("sand")
    tc = nd.new("ShaderNodeTexCoord")
    at = nd.new("ShaderNodeAttribute")
    at.attribute_name = "tr"
    fine = F._noise(nd, ln, tc.outputs["Object"], 55.0, 8.0, 0.75)
    coarse = F._noise(nd, ln, tc.outputs["Object"], 1.5, 6.0)
    br = F._noise(nd, ln, tc.outputs["Object"], 4.0, 4.0)
    tr = F._math(nd, ln, "ADD", at.outputs["Fac"], F._math(nd, ln, "MULTIPLY", br.outputs["Fac"], 0.5, clamp=False).outputs[0], clamp=False)
    tr = F._maprange(nd, ln, tr.outputs[0], 0.55, 0.9)
    sand = F._ramp(nd, ln, fine.outputs["Fac"], (0.16, 0.145, 0.12), (0.36, 0.33, 0.28), 0.3, 0.7)
    litter = F._ramp(nd, ln, coarse.outputs["Fac"], (0.03, 0.022, 0.015), (0.12, 0.08, 0.05), 0.3, 0.7)
    lit2 = F._mix(nd, ln, F._maprange(nd, ln, fine.outputs["Fac"], 0.45, 0.6).outputs[0], litter.outputs[0], (0.07, 0.05, 0.03)).outputs[2]
    c = F._mix(nd, ln, tr.outputs[0], lit2, sand.outputs[0]).outputs[2]
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.95
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.45
    bp.inputs["Distance"].default_value = 0.03
    ln.new(fine.outputs["Fac"], bp.inputs["Height"])
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
    co[:, 0] = 60 * np.sign(xs) * np.abs(xs) ** 1.5
    co[:, 1] = 6 + 60 * np.sign(ys) * np.abs(ys) ** 1.5
    tr = np.zeros(n)
    for i in range(n):
        x, y = co[i, 0], co[i, 1]
        co[i, 2] = ground_z(x, y)
        t = max(0.0, 1 - abs(y - 3.5) / 1.1) * (1.0 if abs(x) < 14 else max(0.0, 1 - (abs(x) - 14) / 6))
        if abs(x - 0.3) < 0.8 and 3.5 < y < SHACK_Y:   # trodden spur to the door
            t = max(t, 1 - abs(x - 0.3) / 0.8)
        if abs(x) < SW / 2 + 1.2 and 3.5 < y < SHACK_Y + 0.6:
            t = max(t, 0.6)
        tr[i] = t
    me.vertices.foreach_set("co", co.ravel())
    at = me.attributes.new("tr", "FLOAT", "POINT")
    at.data.foreach_set("value", tr)
    me.update()
    me.materials.append(mat)
    ts.smooth(o)
    return o


def plank_mat(name, dark, light, vertical=True, scale=7.0):
    """weathered grey-brown boards: wave stripes across the board width, grain noise, dark gaps"""
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
    bs.inputs["Roughness"].default_value = 0.9
    h = F._math(nd, ln, "MULTIPLY", gap.outputs[0], grain.outputs["Fac"])
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.7
    bp.inputs["Distance"].default_value = 0.02
    ln.new(h.outputs[0], bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])
    return m


def stone_mat():
    m, nd, ln, bs = ts.new_mat("fieldstone")
    tc = nd.new("ShaderNodeTexCoord")
    vo = nd.new("ShaderNodeTexVoronoi")
    vo.feature = "DISTANCE_TO_EDGE"
    vo.inputs["Scale"].default_value = 4.5
    ln.new(tc.outputs["Object"], vo.inputs["Vector"])
    vc = nd.new("ShaderNodeTexVoronoi")
    vc.inputs["Scale"].default_value = 4.5
    ln.new(tc.outputs["Object"], vc.inputs["Vector"])
    mortar = F._maprange(nd, ln, vo.outputs["Distance"], 0.02, 0.07)
    no = F._noise(nd, ln, tc.outputs["Object"], 20.0, 8.0, 0.65)
    stone = F._ramp(nd, ln, vc.outputs["Color"], (0.07, 0.06, 0.05), (0.2, 0.17, 0.14), 0.0, 1.0)
    stone = F._mix(nd, ln, no.outputs["Fac"], stone.outputs[0], (0.04, 0.035, 0.03), "MULTIPLY")
    c = F._mix(nd, ln, mortar.outputs[0], (0.03, 0.028, 0.025), stone.outputs[2]).outputs[2]
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.88
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 1.0
    bp.inputs["Distance"].default_value = 0.05
    ln.new(F._math(nd, ln, "MULTIPLY", mortar.outputs[0], no.outputs["Fac"]).outputs[0], bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])
    return m


def box(name, loc, size, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def shack(boards, shingles, stone, trim, glass_mat, iron, pelt):
    x0, y0 = 0.0, SHACK_Y
    ys = y0 + SD / 2
    # walls (board and batten): one box per wall, slightly lifted on sill stones
    box("wall_front", (x0, y0, WALL_H / 2 + 0.12), (SW, 0.12, WALL_H), boards)
    box("wall_back", (x0, y0 + SD, WALL_H / 2 + 0.12), (SW, 0.12, WALL_H), boards)
    for s in (-1, 1):
        box(f"wall_side{s}", (x0 + s * SW / 2, ys, WALL_H / 2 + 0.12), (0.12, SD, WALL_H), boards)
        # gable triangles
        bm = bmesh.new()
        h = 1.25
        vs = [bm.verts.new(v) for v in ((0, -SD / 2 - 0.06, 0), (0, SD / 2 + 0.06, 0), (0, 0, h), (0.12, -SD / 2 - 0.06, 0), (0.12, SD / 2 + 0.06, 0), (0.12, 0, h))]
        bm.faces.new((vs[0], vs[1], vs[2]))
        bm.faces.new((vs[3], vs[5], vs[4]))
        for a, b in ((0, 1), (1, 2), (2, 0)):
            bm.faces.new((vs[a], vs[b], vs[b + 3], vs[a + 3]))
        o = F.mesh_obj(f"gable{s}", bm, [boards])
        o.location = (x0 + s * SW / 2 - 0.06, ys, WALL_H + 0.12)
    # battens: thin vertical strips on the front
    for i in range(15):
        bx = x0 - SW / 2 + 0.15 + i * (SW - 0.3) / 14
        if abs(bx + 1.1) < 0.5 or abs(bx - 0.3) < 0.5:
            continue
        box(f"batten{i}", (bx, y0 - 0.075, WALL_H / 2 + 0.12), (0.05, 0.03, WALL_H), trim)
    # roof: two sagging shingle slabs on the ridge along x, overhanging
    for s in (-1, 1):
        o = box(f"roof{s}", (x0, ys + s * SD / 4 - s * 0.02, WALL_H + 0.12 + 0.62), (SW + 0.7, SD / 2 / math.cos(math.radians(36)) + 0.35, 0.09),
                shingles, rot=(-s * math.radians(36), 0, 0))
        o.location.y += s * 0.08
    box("ridge", (x0, ys, WALL_H + 0.12 + 1.27), (SW + 0.75, 0.16, 0.08), trim)
    # door (planks + frame + iron latch), window (frame + muntins + warm glowing panes, a curtain rag)
    box("door", (0.3, y0 - 0.075, 0.95 + 0.12), (0.86, 0.05, 1.9), plank_mat("doorplank", (0.04, 0.03, 0.022), (0.1, 0.075, 0.055), True, 9.0))
    for dx, sz in ((-0.46, (0.08, 0.08, 2.0)), (1.06 - 0.3, (0.08, 0.08, 2.0))):
        box("doorframe", (0.3 + dx if dx < 0 else 0.3 + 0.46, y0 - 0.09, 1.12), sz, trim)
    box("doorhead", (0.3, y0 - 0.09, 2.12), (1.0, 0.08, 0.08), trim)
    box("latch", (0.62, y0 - 0.11, 1.1), (0.04, 0.03, 0.14), iron)
    wx, wz = -1.1, 1.45
    box("pane", (wx, y0 - 0.04, wz), (0.78, 0.02, 0.62), glass_mat)
    for dx, dz, sz in ((0, 0.34, (0.9, 0.07, 0.07)), (0, -0.34, (0.95, 0.1, 0.07)), (-0.42, 0, (0.07, 0.07, 0.74)), (0.42, 0, (0.07, 0.07, 0.74)),
                       (0, 0, (0.04, 0.05, 0.62)), (0, 0.0, (0.78, 0.05, 0.035))):
        box("wframe", (wx + dx, y0 - 0.08, wz + dz), sz, trim)
    # fieldstone chimney on the right gable, wider at the base, rising past the ridge (where it comes back in)
    cx = x0 + SW / 2 + 0.32
    box("chim_base", (cx, ys, 0.9), (0.62, 1.05, 1.8), stone)
    box("chim_shoulder", (cx - 0.02, ys, 1.95), (0.56, 0.85, 0.3), stone, rot=(0, math.radians(-8), 0))
    box("chim_stack", (cx - 0.05, ys, 2.1 + 1.25), (0.5, 0.62, 2.5), stone)
    box("chim_cap", (cx - 0.05, ys, 4.62), (0.58, 0.7, 0.08), stone)
    # inner flue: a black hole at the top with a faint warm glow from the fire far below
    box("flue", (cx - 0.05, ys, 4.64), (0.3, 0.4, 0.04), ts.flat_mat("fluehole", (0.0, 0.0, 0.0)))
    # traps and pelts on the front wall, a chopping block, a stack of split wood, a bucket
    for i, (px, pz) in enumerate(((1.25, 1.75), (1.55, 1.55), (1.85, 1.8))):
        tor = bpy.ops.mesh.primitive_torus_add(major_radius=0.11, minor_radius=0.008, location=(px, y0 - 0.1, pz), rotation=(math.radians(90), 0, 0))
        o = bpy.context.object
        o.name = f"trap{i}"
        o.data.materials.append(iron)
        box(f"chain{i}", (px, y0 - 0.1, pz + 0.2), (0.01, 0.01, 0.3), iron)
    for i, (px, pz, s) in enumerate(((-1.85, 1.45, 0.9), (1.15, 1.2, 0.75))):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.28, location=(px, y0 - 0.1, pz))
        o = bpy.context.object
        o.name = f"pelt{i}"
        o.scale = (0.75 * s, 0.12, 1.25 * s)
        o.data.materials.append(pelt)
        ts.smooth(o)
    block = F.stump("block", (-2.9, 4.9), 0.24, 0.45, F.bark_mat("blockbark", (0.02, 0.015, 0.012), (0.1, 0.08, 0.06)), F.endgrain_mat(), 3)
    for j in range(9):
        lo = F.log(f"split{j}", (-2.75 + (j % 3) * 0.2, y0 + 0.35), (-2.75 + (j % 3) * 0.2, y0 + 1.25), 0.085,
                   F.bark_mat("splitbark", (0.03, 0.022, 0.016), (0.12, 0.09, 0.06)), F.endgrain_mat())
        lo.location.z += 0.08 + (j // 3) * 0.16
    bpy.ops.mesh.primitive_cylinder_add(radius=0.16, depth=0.3, location=(0.95, y0 - 0.35, 0.15))
    o = bpy.context.object
    o.data.materials.append(plank_mat("bucket", (0.05, 0.04, 0.03), (0.12, 0.1, 0.08), True, 20.0))
    return cx, ys


def interior(boards, stone, trim, iron, pelt):
    """the inside of the shack: plank floor, rafters, the fieldstone fireplace on the right wall with a low fire, a
    table with a lantern, a stool, shelves, traps and pelts on the walls; and the flue (a separate stone tube far away,
    for the POV straight up the chimney to a square of night sky)"""
    y0 = SHACK_Y
    floor = plank_mat("floor", (0.03, 0.022, 0.016), (0.1, 0.075, 0.055), False, 6.0)
    box("floor", (0, y0 + SD / 2, 0.07), (SW - 0.1, SD - 0.1, 0.14), floor)
    for i, yy in enumerate((y0 + 0.75, y0 + 1.7, y0 + 2.65)):
        box(f"rafter{i}", (0, yy, WALL_H + 0.12), (SW - 0.1, 0.14, 0.16), trim)
    box("ridgebeam", (0, y0 + SD / 2, WALL_H + 1.27), (SW, 0.16, 0.16), trim)
    for s_ in (-1, 1):
        for i in range(4):
            xx = -1.6 + i * 1.07
            box(f"spar{s_}{i}", (xx, y0 + SD / 2 + s_ * SD / 4, WALL_H + 0.12 + 0.6), (0.08, SD / 2 / math.cos(math.radians(36)), 0.1), trim, rot=(-s_ * math.radians(36), 0, 0))
    # fireplace on the inside of the right wall: hearthstone, two jambs, a lintel, back, and the breast up to the roof
    hx, hy = SW / 2 - 0.36, y0 + SD / 2
    box("hearthstone", (hx - 0.18, hy, 0.17), (0.95, 1.7, 0.06), stone)
    box("jambL", (hx, hy - 0.58, 0.55), (0.6, 0.36, 0.9), stone)
    box("jambR", (hx, hy + 0.58, 0.55), (0.6, 0.36, 0.9), stone)
    box("lintel", (hx, hy, 1.15), (0.62, 1.55, 0.36), stone)
    box("fireback", (SW / 2 - 0.08, hy, 0.6), (0.06, 0.85, 1.0), ts.flat_mat("soot", (0.012, 0.01, 0.009), rough=0.95))
    box("mantel", (hx - 0.32, hy, 1.36), (0.2, 1.75, 0.09), trim)
    box("breast", (hx + 0.08, hy, 2.4), (0.45, 1.15, 2.1), stone)
    # the flue mouth above the fire (dark), the fire: split logs, glowing coals, flame tongues
    box("fluemouth", (hx + 0.05, hy, 1.0), (0.4, 0.75, 0.05), ts.flat_mat("fluedark", (0.0, 0.0, 0.0)))
    fb = F.bark_mat("firelog", (0.02, 0.012, 0.008), (0.07, 0.04, 0.025))
    gr = ts.flat_mat("coals", (1.0, 0.28, 0.05), emit=6.0 * FIRE)
    for j, (a, b) in enumerate((((hx - 0.15, hy - 0.3), (hx + 0.12, hy + 0.25)), ((hx + 0.1, hy - 0.28), (hx - 0.12, hy + 0.3)))):
        lo = F.log(f"firelog{j}", a, b, 0.07, fb, gr)
        lo.location.z = 0.27 + 0.08 * j
    bpy.ops.mesh.primitive_plane_add(size=1, location=(hx, hy, 0.215))
    o = bpy.context.object
    o.scale = (0.45, 0.7, 1)
    o.data.materials.append(gr)
    flame = ts.flat_mat("flame", (1.0, 0.45, 0.1), emit=14.0 * FIRE)
    for j in range(7):
        bpy.ops.mesh.primitive_cone_add(radius1=0.05 + 0.03 * rnd.random(), radius2=0.0, depth=0.22 + 0.2 * rnd.random(),
                                        location=(hx + rnd.uniform(-0.12, 0.08), hy + rnd.uniform(-0.25, 0.25), 0.42))
        o = bpy.context.object
        o.data.materials.append(flame)
        o.visible_shadow = False
    for nm, e, loc in (("firelight", 90.0, (hx - 0.25, hy, 0.55)), ("fireglow", 25.0, (hx - 0.6, hy, 0.4))):
        la = bpy.data.lights.new(nm, "POINT")
        la.energy, la.color, la.shadow_soft_size = e * FIRE, (1.0, 0.42, 0.13), 0.15
        ts.link(bpy.data.objects.new(nm, la)).location = loc
    # table with a lamp (unlit: the fire is the light), a stool, a shelf with jars, traps, pelts, a bunk
    tw = plank_mat("tabletop", (0.05, 0.035, 0.025), (0.14, 0.1, 0.07), False, 8.0)
    box("table", (-1.2, y0 + 2.6, 0.82), (1.1, 0.65, 0.06), tw)
    for dx in (-0.48, 0.48):
        for dy in (-0.26, 0.26):
            box("tleg", (-1.2 + dx, y0 + 2.6 + dy, 0.47), (0.06, 0.06, 0.66), trim)
    box("stool", (0.45, y0 + 2.2, 0.42), (0.36, 0.36, 0.05), tw)
    for dx in (-0.14, 0.14):
        box("sleg", (0.45 + dx, y0 + 2.2, 0.27), (0.04, 0.3, 0.28), trim)
    box("shelf", (-SW / 2 + 0.2, y0 + 1.7, 1.6), (0.22, 1.2, 0.04), trim)
    jar = ts.flat_mat("jar", (0.12, 0.1, 0.06), rough=0.3)
    for j in range(5):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.14 + 0.06 * (j % 2), location=(-SW / 2 + 0.2, y0 + 1.25 + j * 0.22, 1.7))
        bpy.context.object.data.materials.append(jar)
    box("bunk", (-SW / 2 + 0.5, y0 + SD - 0.6, 0.45), (0.9, 1.0, 0.1), tw)
    box("blanket", (-SW / 2 + 0.5, y0 + SD - 0.6, 0.53), (0.86, 0.95, 0.07), ts.flat_mat("wool", (0.18, 0.05, 0.04), rough=1.0))
    for i, (px, py, pz) in enumerate(((-SW / 2 + 0.08, y0 + 0.8, 1.7), (-SW / 2 + 0.08, y0 + 1.1, 1.5), (0.9, y0 + SD - 0.08, 1.8), (1.3, y0 + SD - 0.08, 1.6))):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.009, location=(px, py, pz),
                                         rotation=((math.radians(90), 0, math.radians(90)) if px < 0 else (math.radians(90), 0, 0)))
        bpy.context.object.data.materials.append(iron)
    for i, (px, py, pz, rz) in enumerate(((-0.4, y0 + SD - 0.08, 1.5, 0), (-SW / 2 + 0.08, y0 + 2.4, 1.4, 90))):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(px, py, pz))
        o = bpy.context.object
        o.scale = (0.7, 0.1, 1.2) if rz == 0 else (0.1, 0.7, 1.2)
        o.data.materials.append(pelt)
    # moonlight through the window: a cold area light outside the pane, shining in
    la = bpy.data.lights.new("winmoon", "AREA")
    la.shape, la.size, la.energy, la.color = "SQUARE", 0.9, float(arg("--winmoon", "120")), (0.5, 0.62, 1.0)
    o = ts.link(bpy.data.objects.new("winmoon", la))
    o.location = (-1.1, y0 - 0.9, 1.9)
    o.rotation_euler = (math.radians(-70), 0, 0)
    # the flue: a stone tube 3.5 m tall, open to the night sky at the top, soot black lower down
    fx, fy = 30.0, 30.0
    soot = ts.flat_mat("soot2", (0.01, 0.009, 0.008), rough=1.0)
    for nm, loc, size in (("fw1", (fx - 0.25, fy, 1.8), (0.1, 0.6, 3.6)), ("fw2", (fx + 0.25, fy, 1.8), (0.1, 0.6, 3.6)),
                          ("fw3", (fx, fy - 0.3, 1.8), (0.6, 0.1, 3.6)), ("fw4", (fx, fy + 0.3, 1.8), (0.6, 0.1, 3.6))):
        box(nm, loc, size, stone)
        box(nm + "s", (loc[0] * 0.999 + fx * 0.001, loc[1], 0.8), (size[0] * 1.01, size[1] * 1.01, 1.6), soot)
    la = bpy.data.lights.new("fluemoon", "SPOT")
    la.energy, la.color, la.spot_size = 300.0, (0.55, 0.68, 1.0), math.radians(25)
    o = ts.link(bpy.data.objects.new("fluemoon", la))
    o.location = (fx + 0.1, fy, 6.5)
    o.rotation_euler = (0, math.radians(3), 0)
    la = bpy.data.lights.new("flueember", "POINT")
    la.energy, la.color = 6.0 * FIRE, (1.0, 0.4, 0.12)
    ts.link(bpy.data.objects.new("flueember", la)).location = (fx, fy, 0.05)


def pitch_pine_variants(bark, needles):
    """short, crooked Pine Barrens pitch pines: the shared conifer builder, shorter (9-15 m), canopy-only high up"""
    vs = [F.tree_mesh(f"pine{i}", rnd.uniform(22, 30), i * 11 + 5, bark, needles) for i in range(6)]
    for v in vs:
        v.hide_render = v.hide_viewport = True
    return vs


def pines(variants):
    cam = Vector(C[0])
    aim = (Vector(C[1]) - cam).normalized()
    placed = []

    def blocks_view(x, y, r):
        p = Vector((x, y, 1.0)) - cam
        dep = p.dot(aim)
        if dep <= 0:
            return False
        # keep the shack, its chimney and the path in front of it open
        if 2.0 < y < SHACK_Y + SD + 0.5 and abs(x) < SW / 2 + 1.7:
            return True
        if abs(y - 3.5) < 1.3 + r:
            return True
        return False

    def put(x, y, rad, name="pine"):
        v = variants[rnd.randrange(len(variants))]
        o = ts.link(bpy.data.objects.new(name, v.data))
        o.location = (x, y, ground_z(x, y) - 0.12)
        o.scale = (rad, rad, rnd.uniform(0.85, 1.1))
        o.rotation_euler = (rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), rnd.uniform(0, 6.3))
        o["kind"] = "tree"
        placed.append((x, y, rad))
        return o

    # framing trunks close to camera left and right, a few beside the shack
    for x, y, r in ((-3.7, 2.4, 0.2), (3.6, 2.0, 0.22), (-4.2, 8.4, 0.24), (4.3, 9.2, 0.27), (-1.6, SHACK_Y + SD + 2.2, 0.22), (2.0, SHACK_Y + SD + 3.0, 0.25)):
        put(x, y, r, "pine_hero")
    for gx in np.arange(-40, 40, 2.3):
        for gy in np.arange(-8, 80, 2.3):
            x, y = gx + rnd.uniform(-1, 1), gy + rnd.uniform(-1, 1)
            if (abs(x) > 20 or y > 40) and rnd.random() < 0.5:
                continue
            r = rnd.uniform(0.13, 0.28)
            if blocks_view(x, y, r) or (y < 3.0 and abs(x) < 4.5 + y):
                continue
            if any(math.hypot(x - px, y - py) < 0.9 + pr + r for px, py, pr in placed):
                continue
            put(x, y, r)
    return placed


def scrub(needles, placed):
    """low scrub oak / huckleberry brush: lumpy dark clumps knee to waist high (sway a little)"""
    leaf = needles
    for i in range(150):
        x, y = rnd.uniform(-14, 14), rnd.uniform(-2, 30)
        if abs(y - 3.5) < 1.2 or (abs(x) < SW / 2 + 1.0 and 3.0 < y < SHACK_Y + SD + 0.3) or (y < 2.4 and abs(x) < 4.0 + y):
            continue
        h = rnd.uniform(0.35, 1.0)
        bm = bmesh.new()
        for k in range(rnd.randint(3, 6)):
            cr = h * rnd.uniform(0.35, 0.6)
            res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=cr, matrix=Matrix.Translation((rnd.uniform(-0.4, 0.4) * h, rnd.uniform(-0.4, 0.4) * h, cr * 0.8)))
            for v in res["verts"]:
                v.co += Vector((noise.noise(v.co * 5 + Vector((i, k, 0))), noise.noise(v.co * 5 + Vector((k, i, 1))), noise.noise(v.co * 5 + Vector((0, k, i))))) * cr * 0.45
        o = F.mesh_obj("scrub", bm, [leaf])
        o.location = (x, y, ground_z(x, y) - 0.05)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    F.lights_world(sc)
    for n in ("camp", "campfire"):  # no far camp here: the only warm light is the trapper's own window
        o = bpy.data.objects.get(n)
        if o:
            bpy.data.objects.remove(o)
    bark = F.bark_mat("pinebark", (0.02, 0.013, 0.01), (0.13, 0.085, 0.06))   # pitch pine: reddish plated bark
    needles = F.needle_mat("pineneedles", snow=0.0)
    scrubm = F.needle_mat("scrubleaf", snow=0.0)
    ground(sand_mat())
    boards = plank_mat("boards", (0.035, 0.03, 0.026), (0.13, 0.115, 0.1), True, 9.0)
    shingles = plank_mat("shingles", (0.018, 0.016, 0.015), (0.07, 0.06, 0.052), False, 14.0)
    trim = plank_mat("trim", (0.03, 0.025, 0.02), (0.09, 0.075, 0.06), True, 3.0)
    stone = stone_mat()
    glass = ts.flat_mat("windowglow", (1.0, 0.5, 0.18), emit=float(arg("--window", "6")))
    if INTERIOR:  # seen from inside: a dark night pane with a faint cold sheen
        glass = ts.flat_mat("windownight", (0.05, 0.07, 0.12), emit=0.25)
    iron = ts.flat_mat("iron", (0.03, 0.03, 0.032), rough=0.5, metal=0.8)
    pelt = F.bark_mat("pelt", (0.05, 0.03, 0.018), (0.2, 0.13, 0.07), stretch=0.6)
    shack(boards, shingles, stone, trim, glass, iron, pelt)
    if INTERIOR:
        interior(boards, stone, trim, iron, pelt)
    placed = pines(pitch_pine_variants(bark, needles))
    scrub(scrubm, placed)
    # firelight spilling from the window and under the door onto the sand (warm, small)
    for nm, loc, e, sz in (("winspill", (-1.1, SHACK_Y - 0.25, 1.45), float(arg("--spill", "60")), 0.6), ("doorspill", (0.3, SHACK_Y - 0.12, 0.08), 8.0, 0.5)):
        la = bpy.data.lights.new(nm, "AREA")
        la.shape, la.size, la.energy, la.color = "SQUARE", sz, e, (1.0, 0.5, 0.2)
        la.use_custom_distance, la.cutoff_distance = True, 7.0
        o = ts.link(bpy.data.objects.new(nm, la))
        o.location = loc
        o.rotation_euler = (math.radians(90 + 25), 0, 0)  # facing -y, tilted down to the sand
    # a faint glow from inside the chimney top (the fire below)
    if not INTERIOR:
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


if __name__ == "__main__":
    import json
    sc = build()
    cam = F.shot_camera(sc, SHOT)
    res = int(arg("--res", "1080"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(res * 16 / 9)
    out = os.path.abspath(arg("--out", f"out/jerseydevil/sets/{SHOT}/"))
    os.makedirs(out, exist_ok=True)
    sc.frame_set(1)
    json.dump({"shot": SHOT, "frames": {"1": {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36}}},
              open(os.path.join(out, "cam.json"), "w"))
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
    sc.render.filepath = os.path.join(out, "f_0001.png")
    bpy.ops.render.render(write_still=True)
    print("done", out)
