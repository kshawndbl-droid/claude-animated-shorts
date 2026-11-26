# 3D sets for "The Man-Eaters of Tsavo" in the 3D-set look: real lit Blender environments (EEVEE) with NO characters;
# the flat 2D cast (people with stick limbs, the lions) is drawn in Remotion on top. The railway camp at Tsavo, 1898:
# red earth, a railway line on sleepers, canvas ridge tents, a thorn-bush fence (boma), campfires with flickering light,
# flat-topped acacias, dry grass in the wind, crates and barrels, and the unfinished iron bridge in the distance.
# Two lightings: "dusk" (low orange sun) and "night" (moonlight, fires, lamps glowing in the tents).
# Writes PNG frames + cam.json (camera matrix, lens, sensor per frame) so the 2D cast stands on the 3D ground.
# usage: .venv-bpy/bin/python tools/blender/tsavo_camp.py -- --shot patterson --out out/tsavo/sets/patterson/ [--range 1-165] [--res 720] [--step 1]
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import test_scene as ts  # noqa: E402

arg = ts.arg
A = ts.A
rnd = random.Random(1898)

# shot: frames, light, camera keys (frame, location, aim, lens), focus, f-stop
SHOTS = {
    # Patterson by the line at dusk, tents behind him and the bridge girders far down the track: slow low push-in
    "patterson": dict(n=165, light="dusk", keys=[(1, (3.0, -6.5, 1.0), (2.2, 14, 1.9), 30), (165, (2.85, -4.6, 0.95), (2.2, 14, 1.85), 32)],
                      focus=(2.2, 0.0, 1.0), fstop=4.0),
    # night falls over the camp: a high wide crane down over the boma, the fires and the glowing tents
    "campnight": dict(n=45, light="night", keys=[(1, (16, -12, 9.5), (-1, 12, 0.5), 26), (45, (15, -10.5, 7.8), (-1, 12, 0.6), 26)],
                      focus=(-1, 12, 0.5), fstop=11.0),
    # outside the thorn fence, low in the grass, looking at the camp fires: where the lions wait
    "grass": dict(n=66, light="night", keys=[(1, (-2.6, -17.5, 1.05), (-2.0, 10, 0.9), 30), (66, (-2.6, -16.6, 0.98), (-2.0, 10, 0.9), 32)],
                  focus=(-2.4, -12.5, 0.5), fstop=2.8),
    # inside the camp: the camera trucks along the row of tents while the lions creep past
    "creep": dict(n=63, light="night", keys=[(1, (7.6, 1.6, 1.2), (-4.0, 9.5, 1.0), 26), (63, (7.6, 3.6, 1.2), (-4.0, 11.5, 1.0), 26)],
                  focus=(-0.5, 8.0, 0.6), fstop=4.0),
}
SHOT = arg("--shot", "patterson")
LIGHT = SHOTS[SHOT]["light"]
ts.N = max(s["n"] for s in SHOTS.values())


def toon_tint(m, rgb):
    return m


def mat(name, rgb, rough=0.8, emit=0.0):
    return ts.flat_mat(name, rgb, rough=rough, emit=emit)


def ground():
    bpy.ops.mesh.primitive_plane_add(size=260, location=(0, 40, 0))
    g = bpy.context.object
    g.modifiers.new("sub", "SUBSURF").levels = 0
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.subdivide(number_cuts=90)
    bpy.ops.object.mode_set(mode="OBJECT")
    d = g.modifiers.new("hills", "DISPLACE")
    t = bpy.data.textures.new("hills", "CLOUDS")
    t.noise_scale = 22
    d.texture = t
    d.strength = 1.4
    d.mid_level = 0.55
    # keep the camp itself flat: a vertex group falloff from the camp centre
    vg = g.vertex_groups.new(name="far")
    for v in g.data.vertices:
        w = g.matrix_world @ v.co
        r = math.hypot(w.x, w.y - 8)
        vg.add([v.index], min(1.0, max(0.0, (r - 22) / 30)), "REPLACE")
    d.vertex_group = "far"
    m = ts.tex_mat("redearth", os.path.join(A, "ambientcg", "Ground054"), "Ground054_1K-JPG", scale=60, tint=(1.0, 0.62, 0.42))
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Specular IOR Level"].default_value = 0.12
    g.data.materials.append(m)
    return g


def railway():
    sleeper = mat("sleeper", (0.22, 0.15, 0.1))
    steel = ts.flat_mat("rail", (0.32, 0.3, 0.3), rough=0.35, metal=0.8)
    for i in range(130):
        y = -12 + i * 0.75
        bpy.ops.mesh.primitive_cube_add(size=1, location=(4.0, y, 0.05))
        s = bpy.context.object
        s.scale = (2.4, 0.22, 0.1)
        s.rotation_euler.z = rnd.uniform(-0.03, 0.03)
        s.data.materials.append(sleeper)
    for x in (3.45, 4.55):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 36, 0.15))
        r = bpy.context.object
        r.scale = (0.08, 98, 0.12)
        r.data.materials.append(steel)


def tent(loc, rot, lit, canvas, pole, glow):
    """a ridge tent: two sloping canvas sides, triangular ends with a door flap, a lamp glow inside at night"""
    import bmesh
    x, y = loc
    w, d, h = 2.4, 3.2, 2.1
    me = bpy.data.meshes.new("tent")
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in [(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (0, -d / 2, h), (-w / 2, d / 2, 0), (w / 2, d / 2, 0), (0, d / 2, h)]]
    bm.faces.new((v[0], v[2], v[5], v[3]))
    bm.faces.new((v[1], v[4], v[5], v[2]))
    bm.faces.new((v[0], v[1], v[2]))
    bm.faces.new((v[3], v[5], v[4]))
    bm.to_mesh(me)
    bm.free()
    o = ts.link(bpy.data.objects.new("tent", me))
    o.location = (x, y, 0)
    o.rotation_euler.z = rot
    o.scale = (1.35, 1.35, 1.35)
    o.modifiers.new("sub", "SUBSURF").subdivision_type = "SIMPLE"
    o.modifiers["sub"].levels = 3
    c = o.modifiers.new("sag", "DISPLACE")
    t = bpy.data.textures.new("sag", "CLOUDS")
    t.noise_scale = 0.6
    c.texture = t
    c.strength = 0.06
    o.data.materials.append(glow if lit else canvas)
    for py in (-d / 2 - 0.05, d / 2 + 0.05):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.04, depth=h + 0.35, location=(0, py, (h + 0.35) / 2))
        p = bpy.context.object
        p.data.materials.append(pole)
        p.parent = o
    # guy ropes
    for sx in (-1, 1):
        for py in (-d / 2, d / 2):
            bpy.ops.mesh.primitive_cylinder_add(vertices=4, radius=0.012, depth=1.9, location=(sx * 1.55, py * 1.15, 1.0))
            r = bpy.context.object
            r.rotation_euler = (0, sx * -0.95, 0)
            r.data.materials.append(pole)
            r.parent = o
    if lit and LIGHT == "night":
        L = ts.link(bpy.data.objects.new("tentlamp", bpy.data.lights.new("tentlamp", "POINT")))
        L.location = (x, y, 1.2)
        L.data.color = (1.0, 0.62, 0.3)
        L.data.energy = 60
        L.data.shadow_soft_size = 0.3
    return o


def thorn_fence(center, radius, gap, mat_):
    """a boma: a ring of piled thorn-bush branches (many thin twisted twigs), with a gap for the gate"""
    import bmesh
    me = bpy.data.meshes.new("boma")
    bm = bmesh.new()
    n = int(radius * 2 * math.pi * 7)
    for i in range(n):
        a = i / n * math.tau
        if abs(((a - gap[0] + math.pi) % math.tau) - math.pi) < gap[1]:
            continue
        cx = center[0] + math.cos(a) * radius + rnd.uniform(-0.4, 0.4)
        cy = center[1] + math.sin(a) * radius + rnd.uniform(-0.4, 0.4)
        for k in range(5):
            L = rnd.uniform(0.8, 1.8)
            th, ph = rnd.uniform(0, math.tau), rnd.uniform(0.2, 1.3)
            p0 = Vector((cx + rnd.uniform(-0.3, 0.3), cy + rnd.uniform(-0.3, 0.3), rnd.uniform(0, 0.5)))
            dvec = Vector((math.cos(th) * math.cos(ph), math.sin(th) * math.cos(ph), math.sin(ph))) * L
            side = dvec.cross(Vector((0, 0, 1))).normalized() * 0.03
            a1, a2, a3 = bm.verts.new(p0 - side), bm.verts.new(p0 + side), bm.verts.new(p0 + dvec)
            bm.faces.new((a1, a2, a3))
            # thorny side twigs
            for j in range(3):
                q = p0 + dvec * rnd.uniform(0.2, 0.9)
                e = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.2, 0.8))).normalized() * rnd.uniform(0.2, 0.45)
                b1, b2, b3 = bm.verts.new(q - side * 0.6), bm.verts.new(q + side * 0.6), bm.verts.new(q + e)
                bm.faces.new((b1, b2, b3))
    bm.to_mesh(me)
    bm.free()
    o = ts.link(bpy.data.objects.new("boma", me))
    o.data.materials.append(mat_)
    return o


def acacia(loc, s, bark, leaf, wind_e, wind_t):
    """flat-topped acacia: a forked trunk and wide flat layered canopies"""
    x, y = loc
    for k, (dx, dy) in enumerate([(0.0, 0.0), (rnd.uniform(-1.2, 1.2) * s, rnd.uniform(-0.6, 0.6) * s)]):
        bpy.ops.curve.primitive_bezier_curve_add(location=(x, y, 0))
        cu = bpy.context.object
        sp = cu.data.splines[0]
        top = Vector((dx + rnd.uniform(-0.8, 0.8) * s, dy, (3.2 + 0.6 * k) * s))
        sp.bezier_points[0].co = (0, 0, 0)
        sp.bezier_points[0].handle_left = (0, 0, -0.5)
        sp.bezier_points[0].handle_right = (0, 0, 1.2 * s)
        sp.bezier_points[1].co = top
        sp.bezier_points[1].handle_left = top - Vector((top.x * 0.6, 0, 1.0 * s))
        sp.bezier_points[1].handle_right = top + Vector((top.x * 0.3, 0, 0.5 * s))
        cu.data.bevel_depth = 0.14 * s
        sp.bezier_points[0].radius = 1.4
        sp.bezier_points[1].radius = 0.35
        cu.data.materials.append(bark)
    for i in range(4):
        r = rnd.uniform(1.6, 2.6) * s
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=r, depth=0.5 * s,
                                            location=(x + rnd.uniform(-1.4, 1.4) * s, y + rnd.uniform(-1, 1) * s, (3.6 + rnd.uniform(-0.2, 0.6)) * s))
        c = bpy.context.object
        c.scale = (1.25, 1.0, 1.0)
        c.modifiers.new("sub", "SUBSURF").levels = 2
        dd = c.modifiers.new("leaves", "DISPLACE")
        tt = bpy.data.textures.new("lf", "VORONOI")
        tt.noise_scale = 0.35 * s
        dd.texture = tt
        dd.strength = 0.5 * s
        ts.smooth(c)
        ts.add_wind(c, wind_e, 0.08 * s, wind_t)
        c.data.materials.append(leaf)


def fire(loc, flame):
    """stone fire pit (Poly Haven, CC0) with crossed logs, flickering emissive flames and a flickering light"""
    try:
        bpy.ops.import_scene.gltf(filepath=os.path.join(A, "polyhaven", "stone_fire_pit", "stone_fire_pit_1k.gltf"))
        for o in bpy.context.selected_objects:
            o.location = (loc[0], loc[1], 0)
    except Exception as e:  # noqa: BLE001
        print("fire pit import failed", e)
    logs = mat("log", (0.18, 0.11, 0.07))
    for a in (0.3, 1.9, 3.3):
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.07, depth=0.9, location=(loc[0], loc[1], 0.18))
        l = bpy.context.object
        l.rotation_euler = (1.25, 0, a)
        l.data.materials.append(logs)
    if LIGHT != "night":
        return
    for k in range(5):
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.16 - 0.02 * k, radius2=0.0, depth=0.7 - 0.08 * k,
                                        location=(loc[0] + rnd.uniform(-0.12, 0.12), loc[1] + rnd.uniform(-0.12, 0.12), 0.5))
        f = bpy.context.object
        f.data.materials.append(flame)
        f.visible_shadow = False
        for fr_ in range(1, ts.N + 1, 2):
            f.scale = (1, 1, 0.7 + 0.45 * abs(math.sin(fr_ * (0.7 + 0.13 * k) + k * 2.1)))
            f.keyframe_insert("scale", frame=fr_)
    L = ts.link(bpy.data.objects.new("firelight", bpy.data.lights.new("firelight", "POINT")))
    L.location = (loc[0], loc[1], 0.9)
    L.data.color = (1.0, 0.5, 0.18)
    L.data.shadow_soft_size = 0.25
    for fr_ in range(1, ts.N + 1, 2):
        L.data.energy = 900 + 260 * math.sin(fr_ * 0.9 + loc[0]) + 160 * math.sin(fr_ * 2.3 + 1)
        L.data.keyframe_insert("energy", frame=fr_)


def props(wood, sack):
    for name, p, r in [("wooden_crate_01", (-1.2, 2.2), 0.3), ("wine_barrel_01", (-0.4, 2.8), 0), ("wooden_barrels_01", (5.8, 6.0), 1.2),
                       ("wooden_crate_01", (6.4, 4.6), 0.8), ("wooden_bucket_01", (-1.9, 6.6), 0), ("wooden_crate_01", (-6.8, 14.2), 1.0)]:
        try:
            bpy.ops.import_scene.gltf(filepath=os.path.join(A, "polyhaven", name, f"{name}_1k.gltf"))
            for o in bpy.context.selected_objects:
                if o.parent is None:
                    o.location = (p[0], p[1], 0)
                    o.rotation_euler.z = r
                    o.scale = (1.4, 1.4, 1.4)
        except Exception as e:  # noqa: BLE001
            print("prop failed", name, e)
    # stacked steel rails and sleepers waiting to be laid
    steel = ts.flat_mat("railstack", (0.3, 0.28, 0.27), rough=0.4, metal=0.7)
    for i in range(6):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(7.2, 9 + 0.02 * i, 0.08 + 0.14 * (i // 3)))
        o = bpy.context.object
        o.scale = (0.12, 5.0, 0.12)
        o.location.x += (i % 3) * 0.2
        o.data.materials.append(steel)


def bridge(steel, stone):
    """the unfinished girder bridge far down the line: stone piers and a lattice truss with a gap in the middle"""
    y0 = 62
    for px in (-14, 0, 14):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(4 + px, y0, 2.5))
        p = bpy.context.object
        p.scale = (2.2, 3.2, 9)
        p.location.z = -2
        p.data.materials.append(stone)
    for seg in (-1, 1):
        if seg == 1:
            continue  # the far span is not built yet
        x0 = 4 + seg * 7
        for side in (-1.2, 1.2):
            for z in (2.6, 6.0):
                bpy.ops.mesh.primitive_cube_add(size=1, location=(x0, y0 + side, z))
                b = bpy.context.object
                b.scale = (14, 0.25, 0.3)
                b.data.materials.append(steel)
            for i in range(8):
                bpy.ops.mesh.primitive_cube_add(size=1, location=(x0 - 6 + i * 1.75, y0 + side, 4.3))
                b = bpy.context.object
                b.scale = (0.18, 0.18, 4.6)
                b.rotation_euler.y = 0.55 if i % 2 else -0.55
                b.data.materials.append(steel)
    # scaffolding poles on the empty span
    pole = mat("scaff", (0.4, 0.3, 0.2))
    for i in range(7):
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.1, depth=7, location=(5 + i * 1.8, y0 + rnd.choice((-1.4, 1.4)), 1.5))
        bpy.context.object.data.materials.append(pole)


def sky_and_light(sc):
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    nd, ln = w.node_tree.nodes, w.node_tree.links
    bg = nd["Background"]
    tc = nd.new("ShaderNodeTexCoord")
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = nd.new("ShaderNodeValToRGB")
    mm = nd.new("ShaderNodeMath")
    mm.operation = "MULTIPLY_ADD"
    mm.inputs[1].default_value = 0.5
    mm.inputs[2].default_value = 0.5
    ln.new(sep.outputs["Z"], mm.inputs[0])
    ln.new(mm.outputs[0], ramp.inputs[0])
    els = ramp.color_ramp.elements
    if LIGHT == "dusk":
        cols = [(0.5, (1.0, 0.36, 0.08)), (0.53, (0.9, 0.3, 0.12)), (0.62, (0.45, 0.16, 0.2)), (0.8, (0.14, 0.08, 0.2)), (1.0, (0.04, 0.04, 0.12))]
        strength = 0.9
    else:
        cols = [(0.5, (0.03, 0.045, 0.11)), (0.55, (0.02, 0.03, 0.08)), (0.75, (0.008, 0.012, 0.035)), (1.0, (0.003, 0.005, 0.015))]
        strength = 1.0
    els[0].position, els[0].color = cols[0][0], (*cols[0][1], 1)
    els[1].position, els[1].color = cols[-1][0], (*cols[-1][1], 1)
    for p, c in cols[1:-1]:
        e = els.new(p)
        e.color = (*c, 1)
    ln.new(ramp.outputs[0], bg.inputs[0])
    bg.inputs[1].default_value = strength
    sun = ts.link(bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")))
    fill = ts.link(bpy.data.objects.new("fill", bpy.data.lights.new("fill", "SUN")))
    fill.data.use_shadow = False
    if LIGHT == "dusk":
        sun.data.energy, sun.data.color = 4.5, (1.0, 0.55, 0.28)
        sun.rotation_euler = (math.radians(78), 0, math.radians(195))
        fill.data.energy, fill.data.color = 0.5, (0.6, 0.55, 0.85)
        fill.rotation_euler = (math.radians(40), 0, math.radians(30))
    else:
        sun.data.energy, sun.data.color = 0.35, (0.55, 0.65, 1.0)
        sun.rotation_euler = (math.radians(55), 0, math.radians(150))
        fill.data.energy, fill.data.color = 0.08, (0.4, 0.5, 1.0)
        fill.rotation_euler = (math.radians(30), 0, math.radians(-40))
        # the moon and a scatter of stars, far behind the camp
        moon = mat("moon", (0.9, 0.92, 1.0), emit=6.0)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=6, location=(-40, 230, 70))
        bpy.context.object.data.materials.append(moon)
        star = mat("star", (1, 1, 1), emit=8.0)
        for i in range(220):
            a = rnd.uniform(-1.2, 1.2)
            el = rnd.uniform(0.12, 0.9)
            r = 300
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=rnd.uniform(0.35, 0.9),
                                                  location=(math.sin(a) * r * math.cos(el), math.cos(a) * r * math.cos(el) + 20, math.sin(el) * r))
            bpy.context.object.data.materials.append(star)


def grass(n, area, wind_e, wind_t, mat_, hs=(0.25, 0.6), skip=lambda x, y: False):
    """dry grass blades (thin triangles) merged into one mesh, swaying in the wind; skip() keeps paths and the camp clear"""
    import bmesh
    me = bpy.data.meshes.new("grass")
    bm = bmesh.new()
    for i in range(n):
        x, y = rnd.uniform(*area[0]), rnd.uniform(*area[1])
        if skip(x, y):
            continue
        for b in range(5):
            h = rnd.uniform(*hs)
            a = rnd.uniform(0, math.tau)
            lean = rnd.uniform(-0.3, 0.3)
            bx, by = x + math.cos(a) * 0.05, y + math.sin(a) * 0.05
            w = 0.02
            v1 = bm.verts.new((bx - w * math.sin(a), by + w * math.cos(a), 0))
            v2 = bm.verts.new((bx + w * math.sin(a), by - w * math.cos(a), 0))
            v3 = bm.verts.new((bx + lean * h * math.cos(a), by + lean * h * math.sin(a), h))
            bm.faces.new((v1, v2, v3))
    bm.to_mesh(me)
    bm.free()
    o = ts.link(bpy.data.objects.new("grass", me))
    o.data.materials.append(mat_)
    ts.add_wind(o, wind_e, 0.1, wind_t)
    return o


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    sky_and_light(sc)
    ground()
    railway()
    wind_t = ts.wind_texture("wind", 3.0)
    wind_e = ts.wind_driver_empty("windE", (0.6, 0.25))
    canvas = ts.tex_mat("canvas", os.path.join(A, "ambientcg", "Fabric079"), "Fabric079_1K-JPG", scale=2, tint=(1.0, 0.9, 0.72))
    glow = ts.tex_mat("canvasglow", os.path.join(A, "ambientcg", "Fabric079"), "Fabric079_1K-JPG", scale=2, tint=(1.0, 0.9, 0.72))
    if LIGHT == "night":
        b = glow.node_tree.nodes["Principled BSDF"]
        b.inputs["Emission Color"].default_value = (1.0, 0.55, 0.22, 1)
        b.inputs["Emission Strength"].default_value = 0.22
    pole = mat("pole", (0.3, 0.2, 0.12))
    for i, (x, y, r) in enumerate([(-3.2, 4.5, 0.1), (-3.6, 8.6, -0.05), (-3.1, 12.8, 0.08), (-3.5, 17.0, 0), (-8.0, 6.0, 1.45), (-8.4, 11.5, 1.6),
                                   (-7.6, 16.8, 1.5), (-12.5, 9.0, 0.2), (-12.0, 14.0, 0.1)]):
        tent((x, y), r, lit=i in (1, 3, 5, 7), canvas=canvas, pole=pole, glow=glow)
    thorn = mat("thorn", (0.16, 0.12, 0.08))
    thorn_fence((-2.5, 10.5), 12.5, (math.radians(-60), 0.28), thorn)
    bark = mat("bark", (0.2, 0.15, 0.1))
    leaf = mat("acacialeaf", (0.2, 0.28, 0.12))
    for (x, y, s) in [(-16, 2, 1.0), (10, 20, 1.2), (-20, 26, 1.3), (22, 40, 1.5), (-6, 48, 1.4), (14, 70, 1.6), (-30, 60, 1.8), (30, 8, 1.1), (-11, -10, 1.0)]:
        acacia((x, y), s, bark, leaf, wind_e, wind_t)
    flame = mat("flame", (1.0, 0.55, 0.15), emit=14.0)
    for p in [(0.6, 9.5), (-6.0, 3.0), (-5.6, 20.0)]:
        fire(p, flame)
    props(None, None)
    steel = ts.flat_mat("girder", (0.25, 0.2, 0.18), rough=0.5, metal=0.6)
    stone = mat("pier", (0.55, 0.45, 0.38))
    bridge(steel, stone)
    track = lambda x, y: abs(x - 4.0) < 1.6
    incamp = lambda x, y: math.hypot(x + 2.5, y - 10.5) < 11.0 and rnd.random() < 0.85
    grass_ = mat("drygrass", (0.62, 0.5, 0.26))
    grass(7000, ((-30, 30), (-22, 60)), wind_e, wind_t, grass_, skip=lambda x, y: track(x, y) or incamp(x, y))
    # taller grass right in front of the low "grass" camera
    grass(500, ((-7, 2), (-15.5, -11)), wind_e, wind_t, grass_, hs=(0.4, 0.95))
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "12"))
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    if hasattr(ee, "shadow_resolution_scale"):
        ee.shadow_resolution_scale = 0.5
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast" if LIGHT == "dusk" else "AgX - High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "-0.4" if LIGHT == "dusk" else "0.3"))
    sc.render.image_settings.file_format = "PNG"
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
        m = cam.matrix_world
        cams[f] = {"m": [list(r) for r in m], "lens": cam.data.lens, "sensor": 36}
    json.dump({"shot": SHOT, "frames": cams}, open(os.path.join(out, "cam.json"), "w"))
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
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
