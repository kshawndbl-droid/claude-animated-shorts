# Style test for "The Man Who Sold the Eiffel Tower" (Blender 5.3, EEVEE): Paris, 1925, at dusk. A street of
# Haussmann facades (lit windows, iron balconies, mansard roofs, cafe awnings, flags in the wind, street lamps),
# an old car rolling by, pigeons, drifting clouds, and the Eiffel Tower at the end of the street (procedural lattice).
# Victor Lustig (KayKit CC0 rig + our talking toon head: slick hair, pencil mustache, bowler) strolls in, shrugs,
# winks and flashes his million-franc smile, acting to the narration (stories/eiffel-sale/words_vis.json).
# usage: .venv-bpy/bin/python tools/blender/paris_scene.py -- --out out/blender/paris/f_ [--frames 1,120] [--res 540]
import json
import math
import os
import random
import sys

import bpy
import bmesh  # noqa: E402 (after bpy)
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(__file__))
import face_rig as fr  # noqa: E402
import test_scene as ts  # noqa: E402

ROOT, A = ts.ROOT, ts.A
FPS = 30
args = ts.args
arg = ts.arg
END_T = 11.6
N = int(END_T * FPS)
ts.N = N
WORDS = json.load(open(os.path.join(ROOT, "stories", "eiffel-sale", "words_vis.json")))["words"]
rnd = random.Random(1925)


def W(word, which=0, key="s"):
    hits = [w for w in WORDS if w["w"].strip(".,?!").lower() == word]
    return 1 + round(hits[which][key] * FPS)


# ------------------------------------------------------------------ materials
def toon(name, rgb, lit=0.4, shadow=(0.62, 0.55, 0.7), spec=0.0):
    return fr.toon(name, rgb, shadow=shadow, lit=lit, spec=spec)


def glow(name, rgb, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nd = m.node_tree.nodes
    nd.clear()
    em = nd.new("ShaderNodeEmission")
    em.inputs[0].default_value = (*rgb, 1)
    em.inputs[1].default_value = strength
    out = nd.new("ShaderNodeOutputMaterial")
    m.node_tree.links.new(em.outputs[0], out.inputs[0])
    return m


def stripes(name, c1, c2, n=8.0):
    m = fr.toon(name, (1, 1, 1), shadow=(0.6, 0.52, 0.66), lit=0.4)
    nd, ln = m.node_tree.nodes, m.node_tree.links
    tc = nd.new("ShaderNodeTexCoord")
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["UV"], sep.inputs[0])
    mul = nd.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = n
    ln.new(sep.outputs[0], mul.inputs[0])
    fr_ = nd.new("ShaderNodeMath")
    fr_.operation = "FRACT"
    ln.new(mul.outputs[0], fr_.inputs[0])
    gt = nd.new("ShaderNodeMath")
    gt.operation = "GREATER_THAN"
    gt.inputs[1].default_value = 0.5
    ln.new(fr_.outputs[0], gt.inputs[0])
    mx = nd.new("ShaderNodeMix")
    mx.data_type = "RGBA"
    ln.new(gt.outputs[0], mx.inputs[0])
    mx.inputs[6].default_value = (*c1, 1)
    mx.inputs[7].default_value = (*c2, 1)
    mul_node = [n_ for n_ in nd if n_.type == "MIX" and n_.blend_type == "MULTIPLY"][0]
    ln.new(mx.outputs[2], mul_node.inputs[6])
    return m


def box(bm, center, size, rot_z=0.0):
    mtx = Matrix.Translation(center) @ Matrix.Rotation(rot_z, 4, "Z") @ Matrix.Diagonal((*size, 1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=mtx)


def mesh_from(bm, name, mat, outline=0.0):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = ts.link(bpy.data.objects.new(name, me))
    me.materials.append(mat)
    if outline:
        fr.add_outline(o, outline)
    return o


# ------------------------------------------------------------------ the street
def street():
    road = ts.tex_mat("cobbles", os.path.join(A, "ambientcg", "PavingStones130"), "PavingStones130_1K-JPG", scale=30, tint=(0.62, 0.58, 0.6))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 120, 0))
    r = bpy.context.object
    r.scale = (10, 300, 1)
    r.data.materials.append(road)
    walk = toon("sidewalk", (0.62, 0.6, 0.58), lit=0.35)
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(location=(side * 6.5, 120, 0.08))
        s = bpy.context.object
        s.scale = (1.5, 150, 0.08)
        s.data.materials.append(walk)
        fr.add_outline(s, 0.03)


def facades():
    """two rows of Haussmann buildings, merged per material so the CPU renderer stays fast"""
    stone, dark, lit, iron, slate, frame = (bmesh.new() for _ in range(6))
    awnings = []
    tones = [(0.86, 0.78, 0.64), (0.9, 0.84, 0.72), (0.82, 0.72, 0.58), (0.88, 0.8, 0.7)]
    stone_mats = []
    blocks = []
    for side in (-1, 1):
        y = -12.0
        while y < 190:
            w = rnd.uniform(8, 12)
            floors = rnd.choice((5, 6, 6, 7))
            fh = 3.3
            h = 4.5 + floors * fh
            x_face = side * 7.6
            cx = side * (7.6 + 6)
            blocks.append((cx, y + w / 2, w, h, rnd.choice(range(len(tones)))))
            # windows on the street side
            cols = max(3, int(w / 2.4))
            for f in range(floors):
                z = 4.5 + f * fh + 1.0
                for k in range(cols):
                    yy = y + (k + 0.5) * w / cols
                    is_lit = rnd.random() < 0.32
                    box(lit if is_lit else dark, (x_face - side * 0.02, yy, z + 0.25), (0.1, 1.1, 1.9))
                    box(frame, (x_face - side * 0.03, yy, z + 0.25), (0.06, 0.08, 1.9))  # mullion
                    box(frame, (x_face - side * 0.06, yy, z - 0.75), (0.2, 1.4, 0.14))  # sill
                    box(frame, (x_face - side * 0.06, yy, z + 1.35), (0.2, 1.4, 0.22))  # lintel
                if f in (0, floors - 2):  # continuous iron balconies on the 2nd and 5th floors
                    box(iron, (x_face - side * 0.55, y + w / 2, z - 0.35), (0.5, w / 2 - 0.2, 0.05))
                    box(iron, (x_face - side * 1.0, y + w / 2, z - 0.1), (0.03, w / 2 - 0.2, 0.28))
            # mansard roof with dormers
            mtx = Matrix.Translation((cx, y + w / 2, h + 1.6)) @ Matrix.Diagonal((6.2, w / 2, 1.6, 1))
            ret = bmesh.ops.create_cube(slate, size=2.0, matrix=mtx)
            for v in ret["verts"]:
                if v.co.z > h + 1.6:
                    v.co.x = cx + (v.co.x - cx) * 0.55
            for k in range(max(2, cols - 1)):
                yy = y + (k + 0.5) * w / max(2, cols - 1)
                box(slate, (x_face + side * 0.9, yy, h + 1.6), (0.7, 0.55, 1.0))
                box(lit if rnd.random() < 0.25 else dark, (x_face + side * 0.2, yy, h + 1.6), (0.05, 0.35, 0.55))
            # shop front with an awning at street level (only near the camera, where it is seen)
            if y < 80:
                box(dark, (x_face - side * 0.02, y + w / 2, 1.7), (0.08, w / 2 - 0.8, 1.4))
                awnings.append((x_face, y + w / 2, w - 1.8, side))
            y += w + rnd.uniform(0.0, 0.3)
    # stone volumes, a few tones
    for ti, tone in enumerate(tones):
        bm = bmesh.new()
        for cx, cy, w, h, t in blocks:
            if t == ti:
                box(bm, (cx, cy, h / 2), (6, w / 2, h / 2))
                box(bm, (cx - math.copysign(6.05, cx), cy, h - 0.2), (0.12, w / 2, 0.22))  # cornice
                box(bm, (cx - math.copysign(6.04, cx), cy, 4.4), (0.1, w / 2, 0.15))  # string course
        stone_mats.append(mesh_from(bm, f"stone{ti}", toon(f"stone{ti}", tone, lit=0.33), outline=0.05))
    mesh_from(dark, "win_dark", toon("windark", (0.1, 0.12, 0.16), lit=0.5))
    mesh_from(lit, "win_lit", glow("winlit", (1.0, 0.72, 0.38), 3.5))
    mesh_from(iron, "iron", toon("ironm", (0.06, 0.06, 0.07)))
    mesh_from(slate, "roofs", toon("slate", (0.3, 0.34, 0.42), lit=0.38), outline=0.05)
    mesh_from(frame, "frames", toon("framem", (0.92, 0.88, 0.8)))
    # awnings: striped cloth that ripples in the breeze
    cols = [((0.62, 0.08, 0.07), (0.95, 0.92, 0.85)), ((0.08, 0.32, 0.18), (0.95, 0.92, 0.85)), ((0.12, 0.18, 0.4), (0.95, 0.92, 0.85))]
    for i, (x, yc, w, side) in enumerate(awnings):
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=4, y_subdivisions=24, size=1, location=(x - side * 1.0, yc, 3.6))
        a = bpy.context.object
        a.scale = (2.0, w, 1)
        a.rotation_euler = (0, side * math.radians(22), 0)
        c1, c2 = cols[i % 3]
        a.data.materials.append(stripes(f"awning{i}", c1, c2, n=w / 0.7))
        wv = a.modifiers.new("ripple", "WAVE")
        wv.height = 0.05
        wv.width = 1.2
        wv.speed = 0.06
        wv.use_normal = True
        fr.add_outline(a, 0.03)
    # flags (tricolour) on a few balconies, waving
    for (x, y, z) in ((-7.6, 18, 12), (7.6, 34, 14), (-7.6, 52, 13)):
        side = 1 if x > 0 else -1
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.04, depth=2.4, location=(x - side * 1.0, y, z), rotation=(0, side * math.radians(-50), 0))
        bpy.context.object.data.materials.append(toon("pole", (0.1, 0.1, 0.1)))
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=20, y_subdivisions=8, size=1, location=(x - side * 1.9, y + 0.55, z + 0.3))
        f = bpy.context.object
        f.scale = (1.0, 1.0, 1)
        f.rotation_euler = (math.radians(90), 0, side * math.radians(90))
        f.data.uv_layers.active
        tri = stripes("flag", (0.05, 0.15, 0.55), (0.92, 0.9, 0.88), n=1.5)
        f.data.materials.append(tri)
        wv = f.modifiers.new("wave", "WAVE")
        wv.use_y = False
        wv.height = 0.12
        wv.width = 0.6
        wv.speed = 0.35
        wv.start_position_x = -0.5


def lamps():
    pole_m = toon("lamp", (0.05, 0.06, 0.06))
    lamp_m = glow("lampglass", (1.0, 0.78, 0.45), 6.0)
    for side in (-1, 1):
        for i, y in enumerate(range(6, 120, 14)):
            x = side * 5.5
            bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.07, depth=4.2, location=(x, y + side * 3, 2.1))
            p = bpy.context.object
            p.data.materials.append(pole_m)
            fr.add_outline(p, 0.02)
            bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.22, radius2=0.32, depth=0.45, location=(x, y + side * 3, 4.45))
            g = bpy.context.object
            g.data.materials.append(lamp_m)
            if i < 3:
                L = ts.link(bpy.data.objects.new("lampl", bpy.data.lights.new("lampl", "POINT")))
                L.location = (x, y + side * 3, 4.3)
                L.data.energy = 140
                L.data.color = (1.0, 0.7, 0.4)
                L.data.use_shadow = False


# ------------------------------------------------------------------ the Eiffel Tower (procedural lattice)
def eiffel(base=Vector((0, 430, 0)), s=1.0):
    def w(z):
        return 58 * math.exp(-z / 70) + 3

    m = toon("eiffel", (0.42, 0.3, 0.22), lit=0.3, shadow=(0.6, 0.55, 0.7))
    bm = bmesh.new()

    def tube(z0, z1, rings, segs, center_fn, half_fn):
        verts = []
        for r in range(rings + 1):
            z = z0 + (z1 - z0) * r / rings
            cx, cy = center_fn(z)
            hw = half_fn(z)
            ring = []
            for k in range(4 * segs):
                side, t = divmod(k, segs)
                u = -1 + 2 * t / segs
                pts = [(u, -1), (1, u), (-u, 1), (-1, -u)][side]
                ring.append(bm.verts.new((base.x + cx + pts[0] * hw, base.y + cy + pts[1] * hw, base.z + z)))
            verts.append(ring)
        for r in range(rings):
            a, b = verts[r], verts[r + 1]
            n = len(a)
            for k in range(n):
                bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))

    # four legs up to the first platform, leaning in along the corners
    for sx in (-1, 1):
        for sy in (-1, 1):
            tube(0, 57, 8, 2, lambda z, sx=sx, sy=sy: (sx * (w(z) - w(z) * 0.22), sy * (w(z) - w(z) * 0.22)), lambda z: w(z) * 0.22)
    tube(57, 276, 30, 3, lambda z: (0, 0), lambda z: w(z))
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new("eiffel")
    bm.to_mesh(me)
    bm.free()
    t = ts.link(bpy.data.objects.new("eiffel", me))
    me.materials.append(m)
    wf = t.modifiers.new("lattice", "WIREFRAME")
    wf.thickness = 0.55
    wf.use_replace = True
    # platforms, the arches under the first floor, the top
    pm = bmesh.new()
    for z, hw, th in ((57, w(57) + 1.5, 3.0), (115, w(115) + 1.0, 2.2), (276, w(276) + 0.8, 3.0)):
        box(pm, base + Vector((0, 0, z)), (hw, hw, th / 2))
    box(pm, base + Vector((0, 0, 290)), (1.6, 1.6, 12))
    box(pm, base + Vector((0, 0, 305)), (0.3, 0.3, 6))
    for ang in range(4):  # the big arches: a row of short beams following a curve
        for i in range(24):
            u = -1 + 2 * i / 23
            span = w(0) * 0.6
            z = 40 + 14 * math.cos(u * math.pi / 2) ** 0.6
            p = Vector((u * span, -w(30) * 0.95, z))
            p.rotate(Matrix.Rotation(ang * math.pi / 2, 3, "Z"))
            box(pm, base + p, (1.8, 0.6, 0.6), rot_z=ang * math.pi / 2)
    plat = mesh_from(pm, "eiffel_floors", m)
    for o in (t, plat):
        o.scale = (s, s, s)
    return t


# ------------------------------------------------------------------ a 1920s car
def car(color, path, f0, f1):
    root = ts.link(bpy.data.objects.new("car", None))
    body_m = toon("carbody", color, lit=0.4, spec=0.3)
    blk = toon("carblack", (0.04, 0.04, 0.05), spec=0.2)
    chrome = toon("chrome", (0.8, 0.8, 0.78), spec=0.6)
    parts = []
    def add(op, mat, loc, scale, rot=(0, 0, 0), outline=0.02, **kw):
        op(location=loc, rotation=rot, **kw)
        o = bpy.context.object
        o.scale = scale
        o.parent = root
        o.data.materials.append(mat)
        for p in o.data.polygons:
            p.use_smooth = True
        if outline:
            fr.add_outline(o, outline)
        parts.append(o)
        return o
    cube = bpy.ops.mesh.primitive_cube_add
    cyl = bpy.ops.mesh.primitive_cylinder_add
    add(cube, body_m, (0, 0.2, 0.75), (0.75, 1.6, 0.28))  # lower body
    add(cube, body_m, (0, -1.1, 0.95), (0.55, 0.75, 0.25))  # long hood
    add(cube, blk, (0, 0.55, 1.45), (0.72, 0.85, 0.42))  # cabin roof box
    add(cube, glow("carglass", (0.55, 0.62, 0.7), 0.4), (0, -0.33, 1.42), (0.62, 0.02, 0.3), outline=0)  # windscreen
    add(cube, chrome, (0, -1.88, 0.95), (0.5, 0.06, 0.3))  # radiator
    for sx in (-1, 1):
        add(cube, blk, (sx * 0.85, 0.2, 0.42), (0.18, 1.9, 0.05))  # running boards
        add(bpy.ops.mesh.primitive_uv_sphere_add, glow("headlamp", (1, 0.9, 0.7), 3.0), (sx * 0.5, -1.95, 1.1), (0.13, 0.08, 0.13), outline=0.01)
    wheels = []
    for sx in (-1, 1):
        for sy in (-1.2, 1.3):
            wl = add(cyl, blk, (sx * 0.8, sy, 0.42), (0.42, 0.42, 0.14), rot=(0, math.radians(90), 0), vertices=20)
            wl.rotation_mode = "XYZ"
            wheels.append(wl)
            add(cyl, chrome, (sx * 0.95, sy, 0.42), (0.16, 0.16, 0.04), rot=(0, math.radians(90), 0), vertices=12, outline=0)
    (x0, y0), (x1, y1) = path
    root.rotation_euler = (0, 0, math.atan2(-(x1 - x0), (y1 - y0)) + math.pi)
    root.location = (x0, y0, 0)
    root.keyframe_insert("location", frame=f0)
    root.location = (x1, y1, 0)
    root.keyframe_insert("location", frame=f1)
    ts.set_linear(root)
    dist = math.hypot(x1 - x0, y1 - y0)
    turns = dist / (2 * math.pi * 0.42)
    for wl in wheels:
        wl.keyframe_insert("rotation_euler", frame=f0)
        wl.rotation_euler.x += turns * 2 * math.pi * (1 if y1 > y0 else -1)
        wl.keyframe_insert("rotation_euler", frame=f1)
        ts.set_linear(wl)
    # a little bounce on the cobbles
    for f in range(f0, f1, 4):
        root.location.z = 0.025 * math.sin(f * 1.7)
        root.keyframe_insert("location", index=2, frame=f)
    return root


# ------------------------------------------------------------------ Lustig
def lustig():
    bpy.ops.import_scene.gltf(filepath=os.path.join(A, "blender", "kaykit", "Rogue.glb"))
    imported = list(bpy.context.selected_objects)
    rig = [o for o in imported if o.type == "ARMATURE"][0]
    for o in imported:
        if o.type == "MESH" and (o.name.startswith(("Rogue_Head", "Rogue_Cape", "1H_Crossbow", "2H_Crossbow", "Knife", "Throwable"))
                                 or o.name.split(".")[0] == "Icosphere"):
            bpy.data.objects.remove(o, do_unlink=True)
    if rig.animation_data:
        rig.animation_data.action = None
    else:
        rig.animation_data_create()
    face = fr.build_head(rig, look=dict(hair_style="slick", mustache=True, hat="bowler", hair=(0.04, 0.03, 0.03), hair_sheen=0.2,
                                        skin=(0.93, 0.64, 0.48), iris=(0.18, 0.22, 0.3), brow=(0.05, 0.035, 0.03)))
    # a charcoal 1920s suit: the Rogue body's own texture, desaturated and darkened (gloved hands)
    base = [o for o in bpy.data.objects if o.name.startswith("Rogue_Body")][0].data.materials[0]
    img = [n for n in base.node_tree.nodes if n.type == "TEX_IMAGE"][0].image
    suit = fr.toon("suit", (1, 1, 1), shadow=(0.55, 0.5, 0.65), lit=0.4)
    nd, ln = suit.node_tree.nodes, suit.node_tree.links
    t = nd.new("ShaderNodeTexImage")
    t.image = img
    hs = nd.new("ShaderNodeHueSaturation")
    hs.inputs["Saturation"].default_value = 0.15
    hs.inputs["Value"].default_value = 0.55
    ln.new(t.outputs[0], hs.inputs["Color"])
    tn = nd.new("ShaderNodeMix")
    tn.data_type = "RGBA"
    tn.blend_type = "MULTIPLY"
    tn.inputs[0].default_value = 1
    ln.new(hs.outputs[0], tn.inputs[6])
    tn.inputs[7].default_value = (0.5, 0.52, 0.62, 1)
    mul = [n for n in nd if n.type == "MIX" and n.blend_type == "MULTIPLY" and n != tn][0]
    ln.new(tn.outputs[2], mul.inputs[6])
    for o in bpy.data.objects:
        if o.type == "MESH" and o.parent == rig and o.name.startswith("Rogue_"):
            o.data.materials[0] = suit
            for p in o.data.polygons:
                p.use_smooth = True
            sm = o.modifiers.new("smooth", "SUBSURF")
            sm.levels = 1
            sm.render_levels = 1
            fr.add_outline(o, 0.012)
    # white collar + red tie + a carnation, on the chest bone
    chest = ts.link(bpy.data.objects.new("chest_root", None))
    chest.parent = rig
    chest.parent_type = "BONE"
    chest.parent_bone = "chest"
    bpy.context.view_layer.update()
    pb = rig.pose.bones["chest"]
    tail = rig.matrix_world @ pb.matrix @ Matrix.Translation((0, rig.data.bones["chest"].length, 0))
    chest.matrix_parent_inverse = tail.inverted()
    white = fr.toon("shirt", (0.96, 0.95, 0.92), lit=0.4)
    red = fr.toon("tie", (0.62, 0.06, 0.06), lit=0.4, spec=0.2)
    fr.ellipsoid("collar", (0, -0.1, 1.2), (0.2, 0.12, 0.06), white, chest, outline=0.008, seg=24)
    tie = fr.ellipsoid("tie", (0, -0.33, 1.02), (0.06, 0.03, 0.17), red, chest, outline=0.008, seg=16)
    fr.ellipsoid("knot", (0, -0.27, 1.17), (0.045, 0.035, 0.04), red, chest, outline=0.006, seg=12)
    fr.ellipsoid("carnation", (0.22, -0.3, 1.1), (0.05, 0.04, 0.05), fr.toon("flower", (0.85, 0.1, 0.15), lit=0.4), chest, outline=0.006, seg=12)
    return rig, face


def wink(face, frame, side=1, hold=8):
    lid = face.lids[0 if side < 0 else 1]
    fr._key_sk(lid, "BLINK", frame - 1, 0.0)
    fr._key_sk(lid, "BLINK", frame + 2, 1.0)
    fr._key_sk(lid, "BLINK", frame + 2 + hold, 1.0)
    fr._key_sk(lid, "BLINK", frame + 5 + hold, 0.0)


def sparkle(parent, loc, frame):
    """a tall-tale gag: a twinkling star glint on the grin"""
    bm = bmesh.new()
    pts = []
    for i in range(8):
        r = 1.0 if i % 2 == 0 else 0.22
        a = i * math.pi / 4
        pts.append(bm.verts.new((r * math.cos(a), 0, r * math.sin(a))))
    c = bm.verts.new((0, 0, 0))
    for i in range(8):
        bm.faces.new((c, pts[i], pts[(i + 1) % 8]))
    s = mesh_from(bm, "sparkle", glow("sparklem", (1, 1, 0.92), 6.0))
    s.parent = parent
    s.location = loc
    s.rotation_mode = "XYZ"
    for f, sc, rot in ((frame - 1, 0.0, 0), (frame + 3, 0.07, 30), (frame + 7, 0.04, 60), (frame + 10, 0.065, 80), (frame + 16, 0.0, 120)):
        s.scale = (sc, sc, sc)
        s.keyframe_insert("scale", frame=f)
        s.rotation_euler = (0, math.radians(rot), 0)
        s.keyframe_insert("rotation_euler", frame=f)
    s.scale = (0, 0, 0)
    s.keyframe_insert("scale", frame=1)
    return s


# ------------------------------------------------------------------ build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, N
    ts.world()
    w = sc.world
    for n in list(w.node_tree.nodes):
        if n.type == "PRINCIPLED_VOLUME":
            w.node_tree.nodes.remove(n)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.55
    for n in w.node_tree.nodes:
        if n.type == "MAPPING":
            n.inputs["Rotation"].default_value = (0, 0, math.radians(95))  # the sunset glow at the end of the street
    sun = bpy.data.objects["sun"]
    sun.data.energy = 2.4
    sun.data.color = (1.0, 0.7, 0.45)
    sun.rotation_euler = (Vector((0, 0, 0)) - Vector((-5, 12, 2.2))).to_track_quat("-Z", "Y").to_euler()
    ts.clouds()
    for n in bpy.data.materials["clouds"].node_tree.nodes:
        if n.type == "MAPPING":
            n.inputs["Scale"].default_value = (0.005, 0.009, 0.03)
        if n.type == "EMISSION":
            n.inputs["Color"].default_value = (1.0, 0.68, 0.55, 1)
            n.inputs["Strength"].default_value = 0.9
    street()
    facades()
    lamps()
    eiffel()
    car((0.45, 0.07, 0.06), ((-2.6, 2), (-2.6, 75)), 1, 160)
    car((0.07, 0.12, 0.3), ((-2.4, 90), (-2.4, 8)), 120, 330)
    for i, (p0, p1, ph) in enumerate((((-20, 30, 9), (25, 46, 12), 0.0), ((-24, 34, 10), (22, 50, 13), 1.3), ((-18, 26, 8), (28, 40, 10), 2.1))):
        ts.seagull(p0, p1, ph)
    for o in bpy.data.objects:
        if o.name.startswith("gull") and o.type == "MESH":
            o.scale = (0.7, 0.7, 0.7)
            o.data.materials[0] = toon("pigeon", (0.45, 0.47, 0.52))
    ts.dust(Vector((0, 16, 1.5)))

    # ---- Lustig strolls up the street, stops, acts to the narration
    rig, face = lustig()
    HX, HY = 0.4, 14.0
    rig.location = (HX, HY + 11, 0.16)
    rig.keyframe_insert("location", frame=1)
    stop = W("small") - 8
    rig.location = (HX, HY, 0.16)
    rig.keyframe_insert("location", frame=stop)
    ts.set_linear(rig)
    ts.play(rig, "Walking_A", -10, stop + 6, speed=1.0, blend=0)
    ts.play(rig, "Idle", stop - 4, N + 20, speed=0.85, blend=8)
    gesture = lambda name, f, infl=0.8, speed=1.0, blend=5: _strip(rig, name, f, infl, speed, blend)
    # face: pleased with himself, a sly half-lidded look
    fr.set_expr(face, 1, smile=0.35, half=0.3, brow_up=0.2)
    fr.look(face, 1, 0.4, 0.5)  # admiring the tower... no, the street
    fr.look(face, 40, -0.3, 0.2, snap=4)
    fr.blink(face, 30)
    fr.blink(face, 70)
    # "Small problem..." - stops, looks at us, a guilty little grimace
    fr.look(face, W("small") - 2, 0.0, 0.0, snap=3)
    fr.set_expr(face, W("small"), smile=0.0, frown=0.25, brow_up=0.7, brow_sad=0.3, half=0.0)
    gesture("Interact", W("small") - 3, 0.65)
    # "...it wasn't his." - wink + grin
    fr.set_expr(face, W("wasn't") - 2, grin=0.75, frown=0.0, brow_up=0.4, brow_sad=0.0, half=0.15)
    wink(face, W("his", 0) - 2, side=1, hold=9)
    # "His name was Victor Lustig." - presents himself, chin up
    fr.set_expr(face, W("victor"), grin=0.0, smile=0.55, brow_up=0.6, half=0.25)
    fr.blink(face, W("name") - 2)
    gesture("Cheer", W("victor") - 6, 0.35, speed=1.4)
    # "dozens of fake names" - shifty eyes left, right
    fr.look(face, W("dozens"), -0.85, 0.0, snap=2)
    fr.look(face, W("fake"), 0.85, 0.0, snap=2)
    fr.look(face, W("names") + 4, 0.0, 0.0, snap=3)
    fr.set_expr(face, W("dozens"), smile=0.3, brow_angry=0.25, brow_up=0.0, half=0.35)
    # "a smile that could sell sand in the desert" - the million-franc smile + sparkle
    fr.set_expr(face, W("smile") - 3, grin=1.0, squint=0.65, brow_up=0.75, brow_angry=0.0, smile=0.0, half=0.0)
    fr.set_expr(face, N, grin=1.0, squint=0.65, brow_up=0.75)
    sparkle(face.root, Vector((0.085, -0.38, 0.27)), W("smile"))
    for f, p, y, r in ((1, 3, -10, 0), (stop, 0, -6, 0), (W("small"), -3, 0, 4), (W("problem") + 6, 4, 0, -3),
                       (W("wasn't"), -2, 6, 8), (W("his", 1), -6, 0, 0), (W("lustig"), -8, -4, -3), (W("con"), 2, 0, 0),
                       (W("dozens"), 3, -10, 0), (W("fake"), 3, 10, 0), (W("names") + 6, 0, 0, 0),
                       (W("smile"), -5, 0, 7), (W("desert"), -3, 0, 9), (N, -3, 0, 9)):
        fr.head_pose(face, f, pitch=p, yaw=y, roll=r)

    # ---- cameras
    look = ts.link(bpy.data.objects.new("focus", None))
    look.parent = face.root
    look.location = (0, -0.2, 0.42)

    def mkcam(name, start, f0, f1, loc0, loc1, aim, lens0, lens1=None, fstop=2.2, focus=look):
        c = ts.link(bpy.data.objects.new(name, bpy.data.cameras.new(name)))
        c.data.sensor_width = 36
        c.data.dof.use_dof = True
        c.data.dof.aperture_fstop = fstop
        c.data.dof.focus_object = focus
        c.data.clip_start = 0.05
        c.data.clip_end = 1500
        tgt = ts.link(bpy.data.objects.new(name + "_aim", None))
        tgt.location = aim
        tc = c.constraints.new("TRACK_TO")
        tc.target = tgt
        tc.track_axis = "TRACK_NEGATIVE_Z"
        tc.up_axis = "UP_Y"
        for f, l, ln_ in ((f0, loc0, lens0), (f1, loc1, lens1 or lens0)):
            c.location = l
            c.keyframe_insert("location", frame=f)
            c.data.lens = ln_
            c.data.keyframe_insert("lens", frame=f)
        sc.timeline_markers.new(name, frame=start).camera = c
        return c
    cut2 = W("small") - 6
    cut3 = W("his", 1) - 3
    cut4 = W("smile") - 10
    mkcam("cam_street", 1, 1, cut2, (2.6, HY - 9, 1.0), (2.0, HY - 6.5, 1.25), (0.0, HY + 40, 9), 20, 22, fstop=5.6)
    mkcam("cam_med", cut2, cut2, cut3, (1.0, HY - 3.6, 1.45), (0.7, HY - 3.1, 1.5), (HX, HY, 1.45), 40, 42)
    mkcam("cam_hero", cut3, cut3, cut4, (-0.9, HY - 2.6, 0.55), (-0.6, HY - 2.2, 0.6), (HX, HY, 1.75), 28, 30, fstop=2.8)
    mkcam("cam_close", cut4, cut4, N, (0.35, HY - 1.6, 1.78), (0.25, HY - 1.15, 1.76), (HX, HY, 1.76), 50, 62)
    sc.camera = bpy.data.objects["cam_street"]
    key = ts.link(bpy.data.objects.new("key", bpy.data.lights.new("key", "SUN")))
    key.data.energy = 1.6
    key.data.color = (1.0, 0.9, 0.8)
    key.rotation_euler = (Vector((0, 0, 0)) - Vector((3, -6, 4))).to_track_quat("-Z", "Y").to_euler()
    rim = ts.link(bpy.data.objects.new("rimL", bpy.data.lights.new("rimL", "SUN")))
    rim.data.energy = 2.0
    rim.data.color = (0.7, 0.8, 1.0)
    rim.rotation_euler = (Vector((0, 0, 0)) - Vector((-4, 8, 4))).to_track_quat("-Z", "Y").to_euler()
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name != "sun":
            o.data.use_shadow = False
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "8"))
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    if hasattr(ee, "shadow_resolution_scale"):
        ee.shadow_resolution_scale = 0.5
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "Medium High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "-0.1"))
    res = int(arg("--res", "540"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(res * 16 / 9)
    sc.render.image_settings.file_format = "PNG"
    return sc


def _strip(rig, name, start, infl, speed, blend):
    act = bpy.data.actions.get(name)
    tr = rig.animation_data.nla_tracks.new()
    st = tr.strips.new(name, int(start), act)
    st.scale = 1.0 / speed
    st.blend_in = blend
    st.blend_out = blend
    st.use_animated_influence = True
    st.influence = infl
    st.keyframe_insert("influence", frame=start)
    return st


if __name__ == "__main__":
    sc = build()
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
    out = os.path.abspath(arg("--out", "out/blender/paris/f_"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    frames = arg("--frames")
    todo = [int(x) for x in frames.split(",")] if frames else range(*(lambda a, b: (a, b + 1))(*(int(x) for x in arg("--range", f"1-{N}").split("-"))))
    for f in todo:
        p = f"{out}{f:04d}.png"
        if not frames and os.path.exists(p):
            continue
        sc.frame_set(f)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        print("frame", f, flush=True)
