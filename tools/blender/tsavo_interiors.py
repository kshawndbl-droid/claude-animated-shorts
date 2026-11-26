# Interior 3D sets for the last part of "The Man-Eaters of Tsavo" (story 65.3 s to the end), same look as the camp sets:
# lit Blender rooms (EEVEE) with NO characters; the flat 2D cast and the two lions are drawn in Remotion on top.
#   lab       a 2009 research lab: island bench, microscope, sample tray with bone and fur, shelves, daylight blinds
#   labclose  macro push over the sample tray (bone piece, fur tufts, labelled dishes)
#   study     Patterson's study years later: wooden floor with the two lion-skin rugs, fireplace, books, armchair
#   museum    the Field Museum, Chicago: a dark hall, a lit glass case with a painted savanna back wall
#   museumclose  over a visitor's shoulder, close on the case
# Writes PNG frames + cam.json like tsavo_camp.py.
# usage: .venv-bpy/bin/python tools/blender/tsavo_interiors.py -- --shot lab --out out/tsavo/sets/lab/ [--range a-b] [--step 2] [--res 720]
import json
import math
import os
import random
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(__file__))
import test_scene as ts  # noqa: E402

arg = ts.arg
rnd = random.Random(2009)

SHOTS = {
    "lab": dict(n=122, room="lab", keys=[(1, (-1.9, -2.6, 1.55), (0.2, 3.0, 1.05), 30), (122, (-0.9, -2.1, 1.5), (0.6, 3.0, 1.05), 31)],
                focus=(-0.5, 2.9, 1.0), fstop=4.0),
    "labclose": dict(n=60, room="lab", keys=[(1, (0.55, 2.05, 1.32), (1.25, 2.95, 0.93), 50), (60, (0.8, 2.35, 1.2), (1.3, 2.95, 0.93), 52)],
                     focus=(1.25, 2.95, 0.94), fstop=1.6),
    "study": dict(n=130, room="study", keys=[(1, (0.2, -3.6, 3.5), (0.1, 2.0, 0.1), 28), (130, (-0.4, -2.7, 2.8), (0.2, 2.1, 0.2), 29)],
                  focus=(0.1, 1.7, 0.0), fstop=5.6),
    "museum": dict(n=110, room="museum", keys=[(1, (-4.6, -1.8, 1.6), (0.3, 4.0, 1.05), 28), (110, (-3.9, -0.9, 1.55), (0.3, 4.0, 1.05), 30)],
                   focus=(0.0, 4.0, 1.0), fstop=4.0),
    "museumclose": dict(n=100, room="museum", keys=[(1, (-1.5, 1.2, 1.3), (0.6, 4.1, 1.05), 34), (100, (-1.1, 1.7, 1.25), (0.6, 4.1, 1.05), 40)],
                        focus=(0.4, 4.1, 1.0), fstop=2.8),
}
SHOT = arg("--shot", "lab")
ROOM = SHOTS[SHOT]["room"]


def mat(name, rgb, rough=0.7, metal=0.0, emit=0.0):
    return ts.flat_mat(name, rgb, rough=rough, metal=metal, emit=emit)


def box(name, loc, size, m, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.rotation_euler = (0, 0, rot)
    o.data.materials.append(m)
    return o


def cyl(loc, r, h, m, verts=24, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.object
    o.data.materials.append(m)
    return o


def wood_mat(name, a, b, scale=3.0, rough=0.45, planks=True):
    """procedural wood: stretched wave bands blended between two browns, plank seams from a brick texture"""
    m, nd, ln, bs = ts.new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale * 0.25, scale * 3, scale)
    ln.new(tc.outputs["Object"], mp.inputs[0])
    nz = nd.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.0
    nz.inputs["Detail"].default_value = 6
    wv = nd.new("ShaderNodeTexWave")
    wv.inputs["Scale"].default_value = 2.0
    wv.inputs["Distortion"].default_value = 6.0
    ln.new(mp.outputs[0], wv.inputs["Vector"])
    ramp = nd.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*a, 1)
    ramp.color_ramp.elements[1].color = (*b, 1)
    ln.new(wv.outputs["Fac"], ramp.inputs[0])
    col = ramp.outputs[0]
    if planks:
        br = nd.new("ShaderNodeTexBrick")
        br.inputs["Scale"].default_value = 1.2
        br.inputs["Mortar Size"].default_value = 0.006
        br.inputs["Brick Width"].default_value = 2.6
        br.inputs["Row Height"].default_value = 0.22
        br.inputs["Color1"].default_value = (1, 1, 1, 1)
        br.inputs["Color2"].default_value = (0.85, 0.85, 0.85, 1)
        br.inputs["Mortar"].default_value = (0.25, 0.25, 0.25, 1)
        ln.new(tc.outputs["Object"], br.inputs["Vector"])
        mx = nd.new("ShaderNodeMix")
        mx.data_type = "RGBA"
        mx.blend_type = "MULTIPLY"
        mx.inputs[0].default_value = 1.0
        ln.new(col, mx.inputs[6])
        ln.new(br.outputs["Color"], mx.inputs[7])
        col = mx.outputs[2]
    ln.new(col, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = rough
    return m


def text(body, loc, size, m, rot=(math.radians(90), 0, 0), align="CENTER"):
    cu = bpy.data.curves.new("txt", "FONT")
    cu.body = body
    cu.size = size
    cu.align_x = align
    cu.extrude = 0.002
    o = ts.link(bpy.data.objects.new("txt", cu))
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(m)
    return o


def area(loc, rot, size, energy, col, shape="RECTANGLE", sy=None):
    L = ts.link(bpy.data.objects.new("area", bpy.data.lights.new("area", "AREA")))
    L.location, L.rotation_euler = loc, rot
    L.data.shape = shape
    L.data.size = size
    if sy:
        L.data.size_y = sy
    L.data.energy, L.data.color = energy, col
    return L


def spot(loc, aim_rot, energy, col, angle=40, blend=0.5):
    L = ts.link(bpy.data.objects.new("spot", bpy.data.lights.new("spot", "SPOT")))
    L.location, L.rotation_euler = loc, aim_rot
    L.data.energy, L.data.color = energy, col
    L.data.spot_size, L.data.spot_blend = math.radians(angle), blend
    L.data.shadow_soft_size = 0.15
    return L


def room_shell(w, d, h, floor_m, wall_m, ceil_m, y0=-4.0):
    box("floor", (0, (y0 + d) / 2, -0.05), (w, d - y0, 0.1), floor_m)
    box("back", (0, d + 0.05, h / 2), (w, 0.1, h), wall_m)
    box("left", (-w / 2 - 0.05, (y0 + d) / 2, h / 2), (0.1, d - y0, h), wall_m)
    box("right", (w / 2 + 0.05, (y0 + d) / 2, h / 2), (0.1, d - y0, h), wall_m)
    box("ceil", (0, (y0 + d) / 2, h + 0.05), (w, d - y0, 0.1), ceil_m)


def world(col, strength):
    wd = bpy.data.worlds.new("w")
    wd.use_nodes = True
    bg = wd.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*col, 1)
    bg.inputs[1].default_value = strength
    bpy.context.scene.world = wd


def fur_tuft(loc, m, n=40, r=0.035, length=0.05):
    """a little tuft of tawny hair lying in a dish: thin cones fanning out flat"""
    for i in range(n):
        a = rnd.uniform(0, math.tau)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.0018, radius2=0.0, depth=length * rnd.uniform(0.6, 1.2),
                                        location=(loc[0] + r * 0.3 * math.cos(a), loc[1] + r * 0.3 * math.sin(a), loc[2] + 0.004),
                                        rotation=(math.radians(rnd.uniform(70, 88)), 0, a + rnd.uniform(-0.4, 0.4)))
        bpy.context.object.data.materials.append(m)


def dish(loc, glass, label_m, label):
    cyl((loc[0], loc[1], loc[2] + 0.006), 0.06, 0.012, glass, verts=32)
    text(label, (loc[0], loc[1] - 0.085, loc[2] + 0.001), 0.018, label_m, rot=(0, 0, 0))


# ------------------------------------------------------------------ rooms
def lab():
    world((0.6, 0.66, 0.7), 0.25)
    floor = mat("labfloor", (0.55, 0.56, 0.55), rough=0.35)
    wall = mat("labwall", (0.78, 0.8, 0.78), rough=0.9)
    room_shell(9, 6, 3.0, floor, wall, mat("ceil", (0.85, 0.85, 0.84)))
    # window with blinds in the back wall, daylight outside
    sky = mat("sky", (0.75, 0.85, 1.0), emit=3.0)
    box("outside", (0.0, 6.4, 1.8), (3.6, 0.05, 1.6), sky)
    bpy.data.objects["back"].hide_render = True
    wl = mat("labwall2", (0.78, 0.8, 0.78), rough=0.9)
    box("back_l", (-3.15, 6.05, 1.5), (2.7, 0.1, 3.0), wl)
    box("back_r", (3.15, 6.05, 1.5), (2.7, 0.1, 3.0), wl)
    box("back_b", (0, 6.05, 0.5), (3.6, 0.1, 1.0), wl)
    box("back_t", (0, 6.05, 2.8), (3.6, 0.1, 0.4), wl)
    slat = mat("slat", (0.9, 0.9, 0.86), rough=0.5)
    for k in range(13):
        box("slat", (0, 5.98, 1.08 + k * 0.11), (3.5, 0.06, 0.012), slat).rotation_euler = (math.radians(-35), 0, 0)
    area((0, 5.6, 1.8), (math.radians(90), 0, 0), 3.4, 900, (0.95, 0.97, 1.0), sy=1.5)
    for x in (-2.0, 2.0):
        area((x, 2.5, 2.95), (0, 0, 0), 1.2, 380, (1.0, 0.97, 0.92), sy=0.3)
        box("tube", (x, 2.5, 2.97), (1.2, 0.3, 0.02), mat("tubeglow", (1.0, 0.98, 0.94), emit=4.0))
    # island bench: cabinets + dark epoxy top
    top = mat("epoxy", (0.06, 0.07, 0.08), rough=0.25)
    cab = mat("cab", (0.62, 0.68, 0.72), rough=0.6)
    box("benchtop", (1.0, 2.95, 0.9), (3.4, 0.95, 0.05), top)
    box("benchcab", (1.0, 2.95, 0.44), (3.3, 0.88, 0.87), cab)
    for i in range(6):
        box("door", (-0.4 + i * 0.56, 2.5, 0.46), (0.5, 0.01, 0.78), mat(f"door{i % 2}", (0.58, 0.64, 0.68), rough=0.5))
    # microscope at the near end
    blk = mat("scopeblack", (0.05, 0.05, 0.06), rough=0.35)
    wht = mat("scopewhite", (0.86, 0.86, 0.84), rough=0.4)
    box("scopebase", (-0.35, 2.95, 0.95), (0.22, 0.3, 0.05), wht)
    box("scopearm", (-0.35, 3.07, 1.12), (0.08, 0.07, 0.3), wht).rotation_euler = (math.radians(-12), 0, 0)
    box("stage", (-0.35, 2.93, 1.04), (0.16, 0.14, 0.02), blk)
    cyl((-0.35, 2.95, 1.16), 0.035, 0.14, blk, rot=(math.radians(25), 0, 0))
    cyl((-0.35, 3.0, 1.31), 0.022, 0.16, blk, rot=(math.radians(-30), 0, 0))
    cyl((-0.35, 3.06, 1.38), 0.022, 0.12, blk, rot=(math.radians(-30), 0, 0))
    # sample tray: a bone piece and fur tufts in labelled dishes
    tray = mat("tray", (0.92, 0.92, 0.9), rough=0.3)
    box("tray", (1.25, 2.95, 0.93), (0.55, 0.34, 0.012), tray)
    bone = mat("bone", (0.86, 0.8, 0.66), rough=0.55)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.03, location=(1.12, 2.98, 0.955))
    b = bpy.context.object
    b.scale = (3.2, 1.0, 0.8)
    b.rotation_euler = (0, 0, 0.3)
    b.data.materials.append(bone)
    for dx in (-0.1, 0.1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.028, location=(1.12 + dx * math.cos(0.3), 2.98 + dx * math.sin(0.3), 0.958))
        bpy.context.object.data.materials.append(bone)
    glass = mat("dishglass", (0.85, 0.92, 0.95), rough=0.05)
    glass.blend_method = "BLEND" if hasattr(glass, "blend_method") else None
    lab_ = mat("ink", (0.05, 0.05, 0.08))
    fur = mat("fur", (0.72, 0.5, 0.25), rough=0.8)
    for (x, y, lab_t) in [(1.38, 2.9, "TSAVO 1"), (1.42, 3.06, "TSAVO 2")]:
        dish((x, y, 0.937), glass, lab_, lab_t)
        fur_tuft((x, y, 0.945), fur)
    # vials rack and a laptop showing a chart
    rack = mat("rack", (0.2, 0.45, 0.75), rough=0.5)
    box("rack", (1.95, 3.1, 0.96), (0.3, 0.1, 0.07), rack)
    for k in range(6):
        cyl((1.83 + k * 0.05, 3.1, 1.02), 0.012, 0.1, mat(f"vial{k % 3}", [(0.9, 0.9, 0.95), (0.95, 0.85, 0.6), (0.8, 0.9, 0.8)][k % 3], rough=0.1))
    box("laptopbase", (2.35, 2.85, 0.935), (0.34, 0.24, 0.015), mat("alu", (0.6, 0.6, 0.62), metal=0.6, rough=0.3))
    scr = box("laptopscr", (2.35, 2.98, 1.05), (0.34, 0.012, 0.22), mat("screen", (0.25, 0.55, 0.85), emit=1.2))
    scr.rotation_euler = (math.radians(-12), 0, 0)
    # wall shelves with jars and binders
    shelf = mat("shelf", (0.85, 0.85, 0.82))
    for z in (1.3, 1.75, 2.2):
        box("shelf", (-3.0, 5.75, z), (2.0, 0.35, 0.03), shelf)
        for k in range(8):
            c = rnd.choice([(0.15, 0.3, 0.6), (0.7, 0.2, 0.15), (0.2, 0.5, 0.3), (0.9, 0.85, 0.7), (0.3, 0.3, 0.32)])
            box("binder", (-3.85 + k * 0.22 + rnd.uniform(0, 0.03), 5.75, z + 0.16), (0.06 + rnd.uniform(0, 0.03), 0.28, 0.3), mat(f"b{k}{z}", c))
    # a tall fridge/freezer on the right
    box("freezer", (3.9, 4.6, 1.0), (0.9, 0.8, 2.0), mat("freezer", (0.9, 0.9, 0.9), rough=0.3))
    box("fz_handle", (3.43, 4.3, 1.1), (0.03, 0.03, 0.5), mat("chrome", (0.8, 0.8, 0.82), metal=1.0, rough=0.2))
    # a stool by the microscope
    cyl((-1.15, 2.6, 0.32), 0.02, 0.64, mat("chrome2", (0.75, 0.75, 0.78), metal=1.0, rough=0.25))
    cyl((-1.15, 2.6, 0.66), 0.18, 0.06, mat("seat", (0.1, 0.1, 0.12)))


def rug(name, loc, rot, s, fur_m, edge_m, head_m):
    """a lion-skin rug lying flat: pelt outline (body, four splayed legs, tail) with a felt edge and a raised head"""
    pts = [(0.0, 1.0), (0.18, 0.92), (0.3, 0.98), (0.62, 1.02), (0.68, 0.9), (0.42, 0.8), (0.36, 0.55), (0.4, 0.1), (0.44, -0.3),
           (0.36, -0.55), (0.72, -0.72), (0.78, -0.86), (0.4, -0.84), (0.2, -0.95), (0.06, -1.05), (0.04, -1.6), (0.1, -1.9),
           (0.0, -1.95)]
    full = pts + [(-x, y) for (x, y) in reversed(pts[:-1])][1:]
    full = full[:-1] if full[-1] == full[0] else full
    for k, (mm, grow, z) in enumerate([(edge_m, 1.06, 0.004), (fur_m, 1.0, 0.012)]):
        me = bpy.data.meshes.new(name)
        bm = bmesh.new()
        vs = [bm.verts.new((x * grow * s, y * grow * s, 0)) for (x, y) in full]
        bm.faces.new(vs)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bm.to_mesh(me)
        bm.free()
        o = ts.link(bpy.data.objects.new(f"{name}{k}", me))
        o.location = (loc[0], loc[1], z)
        o.rotation_euler = (0, 0, rot)
        o.data.materials.append(mm)
        sol = o.modifiers.new("t", "SOLIDIFY")
        sol.thickness = 0.01
    # the head: a low rounded form at the top of the pelt, muzzle and dark nose
    hx, hy = loc[0] - math.sin(rot) * 1.1 * s, loc[1] + math.cos(rot) * 1.1 * s
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.2 * s / 0.75, location=(hx, hy, 0.08))
    h = bpy.context.object
    h.scale = (1.0, 1.15, 0.55)
    h.rotation_euler = (0, 0, rot)
    h.data.materials.append(head_m)
    mx, my = loc[0] - math.sin(rot) * 1.32 * s, loc[1] + math.cos(rot) * 1.32 * s
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.1 * s / 0.75, location=(mx, my, 0.06))
    mz = bpy.context.object
    mz.scale = (1.0, 1.0, 0.6)
    mz.data.materials.append(head_m)
    nx, ny = loc[0] - math.sin(rot) * 1.42 * s, loc[1] + math.cos(rot) * 1.42 * s
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.03, location=(nx, ny, 0.09))
    bpy.context.object.data.materials.append(mat("nose", (0.15, 0.08, 0.06)))
    for side in (-1, 1):
        ex = hx - math.sin(rot) * 0.1 * s + math.cos(rot) * side * 0.09 * s
        ey = hy + math.cos(rot) * 0.1 * s + math.sin(rot) * side * 0.09 * s
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.018, location=(ex, ey, 0.13))
        bpy.context.object.data.materials.append(mat("eye", (0.05, 0.04, 0.03), rough=0.1))
        ax = hx + math.cos(rot) * side * 0.17 * s
        ay = hy + math.sin(rot) * side * 0.17 * s
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.05 * s / 0.75, location=(ax, ay, 0.11))
        bpy.context.object.data.materials.append(head_m)


def study():
    world((0.1, 0.12, 0.2), 0.15)
    floor = wood_mat("floorwood", (0.28, 0.15, 0.07), (0.45, 0.26, 0.13), scale=1.2)
    wall = mat("paper", (0.36, 0.3, 0.22), rough=0.9)
    room_shell(8, 5.5, 3.0, floor, wall, mat("ceil2", (0.6, 0.55, 0.48)))
    # wainscot
    pan = wood_mat("panel", (0.22, 0.12, 0.06), (0.32, 0.18, 0.09), scale=2.0, planks=False)
    box("wain_b", (0, 5.45, 0.5), (8, 0.06, 1.0), pan)
    box("wain_l", (-3.97, 0.75, 0.5), (0.06, 9.5, 1.0), pan)
    # fireplace in the back wall, right of centre, with a flickering fire
    stone = mat("mantel", (0.55, 0.5, 0.44), rough=0.8)
    box("fp_l", (1.35, 5.3, 0.6), (0.3, 0.3, 1.2), stone)
    box("fp_r", (2.85, 5.3, 0.6), (0.3, 0.3, 1.2), stone)
    box("fp_top", (2.1, 5.27, 1.28), (1.9, 0.38, 0.16), stone)
    box("fp_back", (2.1, 5.44, 0.55), (1.2, 0.05, 1.1), mat("soot", (0.03, 0.02, 0.02)))
    flame = mat("flame", (1.0, 0.45, 0.12), emit=12)
    logs = mat("logs", (0.15, 0.08, 0.04))
    for a in (-0.3, 0.3):
        cyl((2.1, 5.3, 0.12), 0.06, 0.8, logs, verts=8, rot=(0, math.radians(90), a))
    for k in range(5):
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.12 - 0.015 * k, radius2=0, depth=0.5 - 0.05 * k,
                                        location=(1.85 + 0.12 * k, 5.3, 0.38))
        f = bpy.context.object
        f.data.materials.append(flame)
        f.visible_shadow = False
        for fr in range(1, 131, 2):
            f.scale = (1, 1, 0.65 + 0.45 * abs(math.sin(fr * (0.6 + 0.11 * k) + k * 1.9)))
            f.keyframe_insert("scale", frame=fr)
    L = ts.link(bpy.data.objects.new("fire", bpy.data.lights.new("fire", "POINT")))
    L.location = (2.1, 4.9, 0.55)
    L.data.color = (1.0, 0.48, 0.16)
    L.data.shadow_soft_size = 0.3
    for fr in range(1, 131, 2):
        L.data.energy = 520 + 140 * math.sin(fr * 0.8) + 90 * math.sin(fr * 2.1 + 1)
        L.data.keyframe_insert("energy", frame=fr)
    # bookcase on the left of the back wall
    case = wood_mat("bookcase", (0.2, 0.1, 0.05), (0.28, 0.15, 0.07), scale=2.0, planks=False)
    box("bc", (-2.2, 5.3, 1.25), (2.4, 0.35, 2.5), case)
    for z in (0.35, 0.95, 1.55, 2.15):
        x = -3.3
        while x < -1.15:
            wdt = rnd.uniform(0.04, 0.08)
            c = rnd.choice([(0.35, 0.08, 0.06), (0.1, 0.18, 0.12), (0.4, 0.3, 0.15), (0.12, 0.1, 0.2), (0.5, 0.42, 0.3)])
            box("book", (x, 5.13, z + 0.17), (wdt, 0.25, rnd.uniform(0.3, 0.4)), mat(f"bk{rnd.randint(0, 9)}", c))
            x += wdt + 0.01
    # tall window on the left wall: night blue
    night = mat("night", (0.1, 0.16, 0.35), emit=1.2)
    box("win", (-3.93, 2.8, 1.7), (0.02, 1.2, 1.7), night)
    cur = mat("curtain", (0.35, 0.06, 0.05), rough=0.95)
    for dy in (-0.75, 0.75):
        box("curt", (-3.85, 2.8 + dy, 1.5), (0.06, 0.35, 2.6), cur)
    area((-3.6, 2.8, 1.7), (0, math.radians(90), 0), 1.2, 60, (0.5, 0.6, 1.0))
    # armchair, side table and lamp
    lea = mat("leather", (0.3, 0.1, 0.06), rough=0.45)
    box("seat", (-2.3, 3.2, 0.3), (0.9, 0.85, 0.4), lea)
    box("seatback", (-2.3, 3.6, 0.75), (0.9, 0.2, 0.7), lea)
    for dx in (-0.48, 0.48):
        box("arm", (-2.3 + dx, 3.25, 0.6), (0.18, 0.8, 0.25), lea)
    cyl((-1.4, 3.6, 0.3), 0.25, 0.04, case)
    cyl((-1.4, 3.6, 0.15), 0.03, 0.3, case)
    cyl((-1.4, 3.6, 0.55), 0.14, 0.2, mat("shade", (1.0, 0.8, 0.5), emit=2.0))
    Lp = ts.link(bpy.data.objects.new("lamp", bpy.data.lights.new("lamp", "POINT")))
    Lp.location, Lp.data.energy, Lp.data.color = (-1.4, 3.6, 0.6), 120, (1.0, 0.75, 0.45)
    # framed pictures, a mounted map
    box("frame", (0.0, 5.44, 1.9), (1.1, 0.04, 0.75), mat("gilt", (0.6, 0.45, 0.15), metal=0.8, rough=0.35))
    box("map", (0.0, 5.41, 1.9), (0.95, 0.02, 0.6), mat("mapcol", (0.75, 0.66, 0.45)))
    # the two lion-skin rugs on the floor
    fur = mat("pelt", (0.68, 0.45, 0.2), rough=0.9)
    edge = mat("felt", (0.18, 0.05, 0.04), rough=0.95)
    head = mat("pelthead", (0.62, 0.4, 0.18), rough=0.8)
    rug("rugA", (-0.9, 1.6), math.radians(-18), 0.72, fur, edge, head)
    rug("rugB", (1.0, 2.6), math.radians(30), 0.72, fur, edge, head)
    area((0, 1.8, 2.9), (0, 0, 0), 2.5, 120, (1.0, 0.85, 0.65))


def museum():
    world((0.02, 0.02, 0.03), 0.3)
    floor = mat("terrazzo", (0.16, 0.15, 0.14), rough=0.18)
    wall = mat("hallwall", (0.12, 0.12, 0.13), rough=0.9)
    room_shell(14, 8, 5.0, floor, wall, mat("ceil3", (0.05, 0.05, 0.06)))
    # the case: dark plinth, painted savanna back wall (emissive gradient), lit top box, slim bronze corner posts
    plinth = mat("plinth", (0.08, 0.07, 0.06), rough=0.5)
    box("plinth", (0.1, 4.4, 0.25), (4.4, 2.2, 0.5), plinth)
    box("deck", (0.1, 4.4, 0.51), (4.3, 2.1, 0.02), mat("deckgrass", (0.55, 0.42, 0.24), rough=0.95))
    m, nd, ln, bs = ts.new_mat("diorama")
    tc = nd.new("ShaderNodeTexCoord")
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = nd.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, (0.55, 0.35, 0.16, 1)
    els[1].position, els[1].color = 1.0, (0.3, 0.45, 0.62, 1)
    e = els.new(0.3)
    e.color = (0.85, 0.62, 0.32, 1)
    e2 = els.new(0.38)
    e2.color = (0.4, 0.42, 0.3, 1)
    ln.new(sep.outputs["Z"], ramp.inputs[0])
    em = nd.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 0.55
    ln.new(ramp.outputs[0], em.inputs[0])
    ln.new(em.outputs[0], nd["Material Output"].inputs[0])
    box("diorama", (0.1, 5.5, 1.75), (4.3, 0.05, 2.5), m)
    # a few dioramic shrubs and rocks on the deck
    shrub = mat("dshrub", (0.3, 0.3, 0.15), rough=0.9)
    rock = mat("drock", (0.45, 0.38, 0.3), rough=0.9)
    for (x, y, r, mm) in [(-1.8, 5.2, 0.35, shrub), (1.9, 5.0, 0.3, shrub), (1.5, 3.6, 0.22, rock), (-1.6, 3.7, 0.18, rock)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r, location=(x, y, 0.52 + r * 0.4))
        bpy.context.object.scale = (1.3, 1.0, 0.7)
        bpy.context.object.data.materials.append(mm)
    bronze = mat("bronze", (0.45, 0.32, 0.15), metal=0.9, rough=0.35)
    for x in (-2.05, 2.25):
        for y in (3.32, 5.48):
            box("post", (x, y, 1.75), (0.04, 0.04, 2.5), bronze)
    box("topbox", (0.1, 4.4, 3.1), (4.4, 2.2, 0.2), plinth)
    box("topglow", (0.1, 4.4, 2.99), (4.0, 1.9, 0.01), mat("topglow", (1.0, 0.92, 0.78), emit=2.5))
    for x in (-1.2, 0.1, 1.4):
        spot((x, 4.0, 2.9), (0, 0, 0), 420, (1.0, 0.9, 0.75), angle=55, blend=0.6)
    # plaque on a slanted stand in front
    box("stand", (-1.2, 2.7, 0.45), (0.06, 0.06, 0.9), bronze)
    pl = box("plaque", (-1.2, 2.68, 0.93), (0.7, 0.03, 0.42), mat("plaque", (0.1, 0.09, 0.08)))
    pl.rotation_euler = (math.radians(-40), 0, 0)
    gold = mat("gold", (0.9, 0.75, 0.4), emit=0.4)
    text("THE MAN-EATERS\nOF TSAVO", (-1.2, 2.655, 0.98), 0.07, gold, rot=(math.radians(50), 0, 0))
    # dim hall lights, a doorway glow far left, a bench
    area((-6.5, 2.0, 2.0), (0, math.radians(-90), 0), 2.0, 80, (0.9, 0.85, 0.8))
    box("door", (-6.95, 2.0, 1.4), (0.02, 1.6, 2.8), mat("doorglow", (0.9, 0.8, 0.6), emit=1.5))
    box("benchm", (-2.6, 1.2, 0.22), (1.6, 0.45, 0.06), mat("benchwood", (0.25, 0.15, 0.08)))
    for dx in (-0.65, 0.65):
        box("bl", (-2.6 + dx, 1.2, 0.1), (0.08, 0.4, 0.2), plinth)
    area((0.1, 1.0, 4.8), (0, 0, 0), 4.0, 60, (0.8, 0.82, 0.9))


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    {"lab": lab, "study": study, "museum": museum}[ROOM]()
    for o in bpy.data.objects:
        if o.animation_data:
            ts.set_linear(o)
        for x in (getattr(o, "data", None),):
            if x is not None and getattr(x, "animation_data", None):
                ts.set_linear(x)
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "12"))
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", {"lab": "-0.3", "study": "0.2", "museum": "0.4"}[ROOM]))
    sc.render.image_settings.file_format = "PNG"
    return sc


def shot_camera(sc, name):
    S = SHOTS[name]
    c = ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_width = 36
    c.data.clip_start = 0.02
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


if __name__ == "__main__":
    sc = build()
    cam = shot_camera(sc, SHOT)
    res = int(arg("--res", "720"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(res * 16 / 9)
    out = os.path.abspath(arg("--out", f"out/tsavo/sets/{SHOT}/"))
    os.makedirs(out, exist_ok=True)
    n = SHOTS[SHOT]["n"]
    a, b = (int(x) for x in arg("--range", f"1-{n}").split("-"))
    step = int(arg("--step", "1"))
    cams = {}
    for f in range(1, n + 1):
        sc.frame_set(f)
        cams[f] = {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36}
    json.dump({"shot": SHOT, "frames": cams}, open(os.path.join(out, "cam.json"), "w"))
    import time
    for f in range(a, b + 1, step):
        p = os.path.join(out, f"f_{f:04d}.png")
        if os.path.exists(p):
            continue
        t0 = time.time()
        sc.frame_set(f)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        print("frame", f, round(time.time() - t0, 1), "s", flush=True)
