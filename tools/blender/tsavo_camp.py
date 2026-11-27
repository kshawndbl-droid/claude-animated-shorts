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
import veg  # noqa: E402

arg = ts.arg
A = ts.A
rnd = random.Random(1898)

# shot: frames, light, camera keys (frame, location, aim, lens), focus, f-stop
SHOTS = {
    # Patterson by the line at dusk, tents behind him and the bridge girders far down the track: slow low push-in
    # Part A opening: night, high over the river valley, the unfinished bridge under the moon; a slow drift toward it
    "bridgenight": dict(n=100, light="night", keys=[(1, (13, 44, 7.5), (1.8, 66, 0.5), 30), (100, (11.2, 48, 6.2), (2.0, 66, 0.5), 32)],
                        focus=(4.0, 66, 0), fstop=11.0),
    # Part A: a lit tent at night, low and close on its door flap, which is thrown open and swings, then hangs still
    "flap": dict(n=55, light="night", keys=[(1, (-11.2, 2.9, 0.95), (-12.05, 6.9, 1.0), 30), (55, (-11.35, 3.4, 0.95), (-12.05, 6.9, 1.0), 33)],
                 focus=(-12.05, 6.9, 1.0), fstop=2.8),
    # Part A: from inside the camp toward the gap in the thorn fence and the black bush beyond, where the lions vanish
    "bush": dict(n=65, light="night", keys=[(1, (-0.6, 6.2, 1.15), (6.5, -4.5, 0.55), 30), (65, (-0.3, 5.6, 1.1), (6.8, -4.8, 0.55), 31)],
                 focus=(4.0, -0.8, 0.5), fstop=4.0),
    "patterson": dict(n=170, light="dusk", keys=[(1, (3.0, -6.5, 1.0), (2.2, 14, 1.9), 30), (165, (2.85, -4.6, 0.95), (2.2, 14, 1.85), 32)],
                      focus=(2.2, 0.0, 1.0), fstop=4.0),
    # night falls over the camp: a high wide crane down over the boma, the fires and the glowing tents
    "campnight": dict(n=100, light="night", keys=[(1, (16.5, -12.5, 10.5), (-1, 12, 0.5), 26), (100, (14.5, -9.8, 7.0), (-1, 12, 0.6), 27)],
                      focus=(-1, 12, 0.5), fstop=11.0),
    # outside the thorn fence, low in the grass, looking at the camp fires: where the lions wait
    "grass": dict(n=98, light="night", keys=[(1, (-2.6, -17.5, 1.05), (-2.0, 10, 0.9), 30), (98, (-2.6, -16.6, 0.98), (-2.0, 10, 0.9), 32)],
                  focus=(-2.4, -12.5, 0.5), fstop=2.8),
    # inside the camp: the camera trucks along the row of tents while the lions creep past
    "creep": dict(n=80, light="night", keys=[(1, (7.6, 1.6, 1.2), (-4.0, 9.5, 1.0), 26), (80, (7.6, 3.6, 1.2), (-4.0, 11.5, 1.0), 26)],
                  focus=(-0.5, 8.0, 0.6), fstop=4.0),
    # living-environment test: a slow sideways truck at dusk past grass close to the lens, the camp and its fire smoke in
    # the middle distance, acacias and the bridge far off, so near, middle and far layers slide at different speeds
    "envtest": dict(n=150, light="dusk", keys=[(1, (-1.6, -5.4, 1.45), (0.4, 12, 0.9), 28), (150, (0.2, -5.0, 1.5), (1.6, 12, 0.9), 29)],
                    focus=(-0.6, 1.2, 0.8), fstop=5.6),
    # character test plate: a still camera inside the camp at dusk looking east across the line, for walks across frame
    "chartest": dict(n=1, light="dusk", keys=[(1, (-1.5, 0.5, 1.0), (10.0, 4.5, 1.3), 28)],
                     focus=(1.8, 1.7, 0.8), fstop=5.6),
}
SHOT = arg("--shot", "patterson")
LIGHT = SHOTS[SHOT]["light"]
ts.N = max(s["n"] for s in SHOTS.values())


def toon_tint(m, rgb):
    return m


def drift(nd, ln, coord, name, speed, scale, detail=5.0):
    """a noise field sliding at `speed` (units per second) over the shot: returns the noise node (Fac output)"""
    mp = nd.new("ShaderNodeMapping")
    ln.new(coord, mp.inputs[0])
    n = max(SHOTS[SHOT]["n"], 2)
    mp.inputs["Location"].default_value = (0, 0, 0)
    mp.inputs["Location"].keyframe_insert("default_value", frame=1)
    mp.inputs["Location"].default_value = (speed[0] * n / 30, speed[1] * n / 30, 0)
    mp.inputs["Location"].keyframe_insert("default_value", frame=n)
    no = nd.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = scale
    no.inputs["Detail"].default_value = detail
    no.inputs["Roughness"].default_value = 0.55
    ln.new(mp.outputs[0], no.inputs["Vector"])
    return no


def mask(nd, ln, fac, lo, hi):
    """noise -> soft 0..1 mask between lo and hi"""
    mr = nd.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = lo, hi
    ln.new(fac, mr.inputs[0])
    return mr.outputs[0]


def linear_all():
    for idb in list(bpy.data.objects) + list(bpy.data.worlds) + list(bpy.data.materials) + list(bpy.data.lights):
        tgt = getattr(idb, "node_tree", None) if not isinstance(idb, bpy.types.Object) else None
        for x in (idb, tgt):
            if x is not None and getattr(x, "animation_data", None):
                ts.set_linear(x)


HAZE = {"dusk": ((0.95, 0.42, 0.2), 0.85), "night": ((0.03, 0.045, 0.1), 1.0)}
RIVER_Y = 66.0


def river_y(x):
    """centre line of the Tsavo river valley, meandering gently across the plain"""
    return RIVER_Y + 3.0 * math.sin(x / 23.0) + 1.5 * math.sin(x / 9.0 + 1.0)


def add_haze(m, near=60.0, far=1400.0, top=1.0):
    """aerial perspective: blend the surface toward the horizon sky colour with distance from the camera"""
    if m is None or not m.use_nodes:
        return m
    nd, ln = m.node_tree.nodes, m.node_tree.links
    out = next(n for n in nd if n.type == "OUTPUT_MATERIAL")
    if not out.inputs[0].links:
        return m
    src = out.inputs[0].links[0].from_socket
    cd = nd.new("ShaderNodeCameraData")
    mr = nd.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = near, far
    mr.inputs["To Max"].default_value = top
    ln.new(cd.outputs["View Distance"], mr.inputs[0])
    em = nd.new("ShaderNodeEmission")
    col, st = HAZE[LIGHT]
    em.inputs["Color"].default_value = (*col, 1)
    em.inputs["Strength"].default_value = st
    mx = nd.new("ShaderNodeMixShader")
    ln.new(mr.outputs[0], mx.inputs[0]); ln.new(src, mx.inputs[1]); ln.new(em.outputs[0], mx.inputs[2])
    ln.new(mx.outputs[0], out.inputs[0])
    return m


def mat(name, rgb, rough=0.8, emit=0.0):
    return ts.flat_mat(name, rgb, rough=rough, emit=emit)


def ground():
    bpy.ops.mesh.primitive_plane_add(size=260, location=(0, 40, 0))
    g = bpy.context.object
    g.modifiers.new("sub", "SUBSURF").levels = 0
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.subdivide(number_cuts=150)
    bpy.ops.object.mode_set(mode="OBJECT")
    # the Tsavo river valley crossing the line: sloping banks down to a flat bed
    for v in g.data.vertices:
        w = g.matrix_world @ v.co
        dy = abs(w.y - river_y(w.x))
        k = min(1.0, max(0.0, (9.5 - dy) / 4.5))
        v.co.z -= 4.6 * k * k * (3 - 2 * k)
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
        edge = min(1.0, max(0.0, (130 - max(abs(w.x), abs(w.y - 40))) / 25))
        river = min(1.0, abs(w.y - river_y(w.x)) / 14)
        vg.add([v.index], min(1.0, max(0.0, (r - 22) / 30)) * edge * river, "REPLACE")
    d.vertex_group = "far"
    m = ts.tex_mat("redearth", os.path.join(A, "ambientcg", "Ground054"), "Ground054_1K-JPG", scale=60, tint=(1.0, 0.62, 0.42))
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Specular IOR Level"].default_value = 0.12
    # cloud shadows drifting over the ground (the same drift as the sky clouds)
    nd, ln = m.node_tree.nodes, m.node_tree.links
    tc = nd.new("ShaderNodeTexCoord")
    no = drift(nd, ln, tc.outputs["Object"], "cloudshadow", (0.05, 0.03), 0.04, 3.0)
    sh = mask(nd, ln, no.outputs["Fac"], 0.5, 0.62)
    dim = nd.new("ShaderNodeMath")
    dim.operation = "MULTIPLY_ADD"
    dim.inputs[1].default_value = -0.38 if LIGHT == "dusk" else -0.2
    dim.inputs[2].default_value = 1.0
    ln.new(sh, dim.inputs[0])
    src = b.inputs["Base Color"].links[0].from_socket
    mul = nd.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs[0].default_value = 1.0
    ln.new(src, mul.inputs[6])
    cmb = nd.new("ShaderNodeCombineXYZ")
    for i in range(3):
        ln.new(dim.outputs[0], cmb.inputs[i])
    ln.new(cmb.outputs[0], mul.inputs[7])
    ln.new(mul.outputs[2], b.inputs["Base Color"])
    g.data.materials.append(add_haze(m))
    far_land(m)
    return g


def far_land(near_mat):
    """the plain going on to the horizon: a huge ground sheet just under the detailed one, darker scrub patches on it"""
    import bmesh
    me = bpy.data.meshes.new("farland")
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    O_, (ix0, ix1, iy0, iy1) = 3500, (-127.0, 127.0, -87.0, 167.0)
    outer = [bm.verts.new(p_) for p_ in ((-O_, -O_, -0.06), (O_, -O_, -0.06), (O_, O_, -0.06), (-O_, O_, -0.06))]
    inner = [bm.verts.new(p_) for p_ in ((ix0, iy0, -0.06), (ix1, iy0, -0.06), (ix1, iy1, -0.06), (ix0, iy1, -0.06))]
    for i in range(4):  # a frame of four quads around the detailed ground (it has the river valley cut into it)
        f_ = bm.faces.new((outer[i], outer[(i + 1) % 4], inner[(i + 1) % 4], inner[i]))
        for lp in f_.loops:
            lp[uv].uv = (lp.vert.co.x / 7000 + 0.5, lp.vert.co.y / 7000 + 0.5)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for p_ in me.polygons:
        if p_.normal.z < 0:
            p_.flip()
    f = ts.link(bpy.data.objects.new("farland", me))
    m = ts.tex_mat("farearth", os.path.join(A, "ambientcg", "Ground054"), "Ground054_1K-JPG", scale=900, tint=(0.9, 0.55, 0.36))
    nd, ln = m.node_tree.nodes, m.node_tree.links
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Specular IOR Level"].default_value = 0.08
    tc = nd.new("ShaderNodeTexCoord")
    no = nd.new("ShaderNodeTexNoise"); no.inputs["Scale"].default_value = 140.0; no.inputs["Detail"].default_value = 6
    ln.new(tc.outputs["Object"], no.inputs["Vector"])
    mk = mask(nd, ln, no.outputs["Fac"], 0.52, 0.6)
    src = b.inputs["Base Color"].links[0].from_socket
    mx = nd.new("ShaderNodeMix"); mx.data_type = "RGBA"
    ln.new(mk, mx.inputs[0]); ln.new(src, mx.inputs[6]); mx.inputs[7].default_value = (0.16, 0.15, 0.07, 1)
    ln.new(mx.outputs[2], b.inputs["Base Color"])
    f.data.materials.append(add_haze(m, 40, 1800))
    return f


def hills():
    """a ring of low hills and a few higher ranges on the far horizon (Tsavo is ringed by hills), soft in the haze"""
    import bmesh
    from mathutils import noise
    me = bpy.data.meshes.new("hills")
    bm = bmesh.new()
    NA, NR = 260, 14
    rows = []
    for j in range(NR):
        r = 650 + j * 95
        row = []
        for i in range(NA):
            a = i / NA * math.tau
            x, y = math.sin(a) * r, math.cos(a) * r + 40
            prof = math.sin(math.pi * j / (NR - 1))
            ridge = 0.5 + 0.5 * noise.noise(Vector((math.cos(a) * 3.0, math.sin(a) * 3.0, j * 0.12)))
            big = max(0.0, noise.noise(Vector((math.cos(a) * 1.3 + 5, math.sin(a) * 1.3, 0.4))))
            h = prof * (25 + 70 * ridge + 260 * big ** 1.5)
            row.append(bm.verts.new((x, y, h - 2)))
        rows.append(row)
    for j in range(NR - 1):
        for i in range(NA):
            bm.faces.new((rows[j][i], rows[j][(i + 1) % NA], rows[j + 1][(i + 1) % NA], rows[j + 1][i]))
    bm.to_mesh(me)
    bm.free()
    o = ts.link(bpy.data.objects.new("hills", me))
    for p_ in me.polygons:
        p_.use_smooth = True
    m = mat("hillmat", (0.28, 0.17, 0.14), rough=0.95)
    o.data.materials.append(add_haze(m, 300, 1900, 0.88))
    return o


def far_trees():
    """scattered acacias and bush across the plain beyond the camp: cheap trunk + flat canopy, fading into the haze"""
    import bmesh
    me = bpy.data.meshes.new("fartrees")
    bm = bmesh.new()
    n = 0
    while n < 260:
        a, r = rnd.uniform(0, math.tau), 70 + 520 * rnd.random() ** 1.6
        x, y = math.sin(a) * r, math.cos(a) * r + 30
        if (abs(x - 4) < 8 and y > 0) or abs(y - river_y(x)) < 13:
            continue
        n += 1
        s_ = rnd.uniform(0.7, 1.6)
        if rnd.random() < 0.6:  # tree
            res = bmesh.ops.create_cone(bm, cap_ends=False, segments=5, radius1=0.18 * s_, radius2=0.08 * s_, depth=3.4 * s_)
            for v in res["verts"]:
                v.co += Vector((x, y, 1.7 * s_))
            for k in range(rnd.randint(1, 3)):
                c = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rnd.uniform(1.8, 2.8) * s_)
                ox, oy = rnd.uniform(-1.2, 1.2) * s_, rnd.uniform(-1.0, 1.0) * s_
                for v in c["verts"]:
                    v.co.x = v.co.x * 1.3 + x + ox
                    v.co.y = v.co.y + y + oy
                    v.co.z = v.co.z * 0.3 + (3.5 + rnd.uniform(-0.2, 0.4)) * s_
        else:  # low bush clump
            for k in range(rnd.randint(2, 4)):
                c = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rnd.uniform(0.8, 1.5) * s_)
                ox, oy = rnd.uniform(-1.5, 1.5), rnd.uniform(-1.5, 1.5)
                for v in c["verts"]:
                    v.co.x += x + ox
                    v.co.y += y + oy
                    v.co.z = v.co.z * 0.6 + 0.5 * s_
    bm.to_mesh(me)
    bm.free()
    o = ts.link(bpy.data.objects.new("fartrees", me))
    m = mat("farleaf", (0.18, 0.2, 0.09), rough=0.9)
    o.data.materials.append(add_haze(m, 60, 1300, 0.95))
    o.visible_shadow = False
    return o


def railway():
    sleeper = mat("sleeper", (0.22, 0.15, 0.1))
    steel = ts.flat_mat("rail", (0.32, 0.3, 0.3), rough=0.35, metal=0.8)
    end = river_y(4.0)
    for i in range(int((end + 12) / 0.75)):
        y = -12 + i * 0.75
        on_span = y > end - 9.5
        bpy.ops.mesh.primitive_cube_add(size=1, location=(4.0, y, 0.72 if on_span else 0.05))
        s = bpy.context.object
        s.scale = (2.4, 0.22, 0.1)
        s.rotation_euler.z = rnd.uniform(-0.03, 0.03)
        s.data.materials.append(sleeper)
    for x in (3.45, 4.55):
        for (y0, y1, z) in ((-12, end - 9.5, 0.15), (end - 9.5, end, 0.82)):
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x, (y0 + y1) / 2, z))
            r = bpy.context.object
            r.scale = (0.08, y1 - y0, 0.12)
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
    is_flap = SHOT == "flap" and abs(x + 12.5) < 0.01 and abs(y - 9.0) < 0.01
    if not is_flap:  # the flap shot's tent has an open doorway with a hinged flap instead of a closed end
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
    if is_flap:
        door_flap(o, w, d, h, glow if (lit and LIGHT == "night") else canvas)
    if lit and LIGHT == "night":
        L = ts.link(bpy.data.objects.new("tentlamp", bpy.data.lights.new("tentlamp", "POINT")))
        L.location = (x, y, 1.2)
        L.data.color = (1.0, 0.62, 0.3)
        L.data.energy = 60 if not is_flap else 160
        L.data.shadow_soft_size = 0.3
    return o


def thorn_fence(center, radius, gap, mat_):
    """a boma: a ring of cut thorn-bush branches piled about waist to chest high, with a gap for the gate.
    Built from a CC0 scan of dry branches (Poly Haven), stacked in two loose layers at random angles."""
    n = int(radius * math.tau / 0.55)
    for i in range(n):
        a = i / n * math.tau
        if abs(((a - gap[0] + math.pi) % math.tau) - math.pi) < gap[1]:
            continue
        for layer in range(3):
            r = radius + rnd.uniform(-0.3, 0.3)
            x, y = center[0] + math.cos(a) * r, center[1] + math.sin(a) * r
            o = veg.place_shrub(A, "dry_branches_medium_01", (x, y), rnd.uniform(0, math.tau),
                                rnd.uniform(1.2, 1.6), rnd, amp=0.0, flutter=0.0)
            o.modifiers.clear()
            # one piece lies as the base, two stand up steeply so the twigs bristle to chest height
            tilt = rnd.uniform(-0.3, 0.3) if layer == 0 else rnd.choice((-1, 1)) * rnd.uniform(1.0, 1.4)
            o.rotation_euler = (tilt, rnd.uniform(-0.3, 0.3), o.rotation_euler.z)
            o.location.z = 0.0 if layer == 0 else rnd.uniform(0.1, 0.3)

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


def door_flap(o, w, d, h, canvas):
    """one half of the front door of a tent, hinged on its outer edge: thrown open around frame 6, swinging back and
    forth less and less, then hanging still half open (the shot never shows what happened inside)"""
    import bmesh
    me = bpy.data.meshes.new("flap")
    bm = bmesh.new()
    # a half-triangle of canvas: hinge along the sloping outer edge is approximated by a vertical hinge at x = -w*0.42
    v = [bm.verts.new(p) for p in [(0, 0, 0), (w * 0.42, 0, 0), (w * 0.42, 0, h * 0.97), (0, 0, h * 0.17)]]
    bm.faces.new(v)
    bm.to_mesh(me)
    bm.free()
    f = ts.link(bpy.data.objects.new("flap", me))
    f.parent = o
    f.location = (-w * 0.42, -d / 2 - 0.03, 0)
    sol = f.modifiers.new("sol", "SOLIDIFY"); sol.thickness = 0.01
    f.data.materials.append(canvas)
    for fr, ang in [(1, 0), (5, 0), (8, -1.35), (13, -0.55), (18, -1.05), (24, -0.7), (31, -0.92), (40, -0.8), (55, -0.82)]:
        f.rotation_euler.z = ang
        f.keyframe_insert("rotation_euler", frame=fr)
    # the closed door's other half
    g = ts.link(bpy.data.objects.new("flap2", me.copy()))
    g.parent = o
    g.location = (w * 0.42, -d / 2 - 0.02, 0)
    g.scale.x = -1
    g.data.materials.append(canvas)


def bridge(steel, stone):
    """the unfinished Tsavo bridge where the line crosses the river: masonry abutments and a pier standing in the
    river, a finished lattice-girder span resting on them, and the far span still only timber falsework"""
    x0, yb = 4.0, river_y(4.0)
    y_near, y_mid, y_far = yb - 9.5, yb, yb + 9.5
    rock = ts.tex_mat("masonry", os.path.join(A, "ambientcg", "Rock030"), "Rock030_1K-JPG", scale=1.5, tint=(0.95, 0.78, 0.62))
    add_haze(rock, 60, 1400)
    for (yy, w_, depth) in ((y_near, 3.2, 2.0), (y_mid, 2.6, 2.0), (y_far, 3.2, 2.0)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x0, yy, -2.25))
        p = bpy.context.object
        p.scale = (w_ + 0.6, depth, 4.9)
        bev = p.modifiers.new("bev", "BEVEL"); bev.width = 0.06
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        p.data.materials.append(rock)
        # a capstone course
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x0, yy, 0.25))
        c = bpy.context.object
        c.scale = (w_ + 0.9, depth + 0.3, 0.3)
        c.data.materials.append(rock)
    # the finished span: two lattice girders along the line, cross girders and a deck with the rails
    L = y_mid - y_near
    for side in (-1.25, 1.25):
        for z in (0.55, 3.0):
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x0 + side, (y_near + y_mid) / 2, z))
            bc = bpy.context.object
            bc.scale = (0.22, L + 0.8, 0.28)
            bc.data.materials.append(steel)
        for i in range(9):
            yy = y_near + 0.4 + i * (L - 0.8) / 8
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x0 + side, yy + (L - 0.8) / 16, 1.78))
            dgn = bpy.context.object
            dgn.scale = (0.12, 0.12, 2.9)
            dgn.rotation_euler.x = 0.5 if i % 2 else -0.5
            dgn.data.materials.append(steel)
    for i in range(6):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x0, y_near + 0.5 + i * (L - 1) / 5, 0.5))
        cg = bpy.context.object
        cg.scale = (2.7, 0.18, 0.2)
        cg.data.materials.append(steel)
    for i in range(6):  # top bracing
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x0, y_near + 1 + i * (L - 2) / 5, 3.0))
        tb = bpy.context.object
        tb.scale = (2.5, 0.12, 0.12)
        tb.data.materials.append(steel)
    # the far span: timber falsework trestles in the river, no girders yet
    wood = mat("falsework", (0.32, 0.22, 0.14))
    for k in range(3):
        yy = y_mid + 2.4 + k * 2.4
        for side in (-1.0, 1.0):
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x0 + side, yy, -2.0))
            t_ = bpy.context.object
            t_.scale = (0.2, 0.2, 4.6)
            t_.data.materials.append(wood)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x0, yy, 0.2))
        cap = bpy.context.object
        cap.scale = (2.6, 0.25, 0.22)
        cap.data.materials.append(wood)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x0, yy, -1.8))
        br = bpy.context.object
        br.scale = (0.12, 0.12, 2.9)
        br.rotation_euler.y = 1.0
        br.data.materials.append(wood)
    # the river: a slow brown-green stream on the valley floor
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, RIVER_Y, -4.15))
    rv = bpy.context.object
    rv.scale = (300, 9, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    me = rv.data
    for v in me.vertices:
        v.co.y = v.co.y + (river_y(v.co.x) - RIVER_Y)
    sub = rv.modifiers.new("sub", "SUBSURF")
    sub.subdivision_type = "SIMPLE"; sub.levels = 5
    water = ts.flat_mat("water", (0.06, 0.07, 0.05), rough=0.08, metal=0.0)
    rv.data.materials.append(add_haze(water, 60, 1400))
    # trees along the banks, greener where there is water
    leaf = veg.leaf_mat("bankleaf", None)
    barkm = mat("bankbark", (0.2, 0.15, 0.1))
    for i, xx in enumerate((-46, -30, -19, 14, 22, 33, 48, 62, -60)):
        side = 1 if i % 2 else -1
        veg.acacia(f"bank{i}", (xx, river_y(xx) + side * rnd.uniform(9.5, 12)), rnd.uniform(1.1, 1.5), rnd, barkm, leaf)


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
    # drifting clouds: noise projected onto a flat cloud deck (direction.xy / direction.z), thinning toward the zenith
    div = nd.new("ShaderNodeVectorMath")
    div.operation = "DIVIDE"
    zz = nd.new("ShaderNodeMath")
    zz.operation = "ADD"
    zz.inputs[1].default_value = 0.06
    ln.new(sep.outputs["Z"], zz.inputs[0])
    zv = nd.new("ShaderNodeCombineXYZ")
    for i in range(3):
        ln.new(zz.outputs[0], zv.inputs[i])
    ln.new(tc.outputs["Generated"], div.inputs[0])
    ln.new(zv.outputs[0], div.inputs[1])
    no = drift(nd, ln, div.outputs[0], "clouds", (0.012, 0.006), 0.9, 6.0)
    cm = mask(nd, ln, no.outputs["Fac"], 0.5, 0.68)
    hz = nd.new("ShaderNodeMapRange")
    hz.interpolation_type = "SMOOTHSTEP"
    hz.inputs["From Min"].default_value, hz.inputs["From Max"].default_value = 0.0, 0.1
    ln.new(sep.outputs["Z"], hz.inputs[0])
    top = nd.new("ShaderNodeMapRange")
    top.inputs["From Min"].default_value, top.inputs["From Max"].default_value = 0.75, 0.2
    ln.new(sep.outputs["Z"], top.inputs[0])
    k1 = nd.new("ShaderNodeMath"); k1.operation = "MULTIPLY"
    ln.new(cm, k1.inputs[0]); ln.new(hz.outputs[0], k1.inputs[1])
    k2 = nd.new("ShaderNodeMath"); k2.operation = "MULTIPLY"
    ln.new(k1.outputs[0], k2.inputs[0]); ln.new(top.outputs[0], k2.inputs[1])
    k2.inputs[1].default_value = 1.0
    amt = nd.new("ShaderNodeMath"); amt.operation = "MULTIPLY"
    amt.inputs[1].default_value = 0.85
    ln.new(k2.outputs[0], amt.inputs[0])
    # cloud colour: sunset-lit undersides low down, darker higher up (dusk); faint moonlit grey at night
    cc = nd.new("ShaderNodeValToRGB")
    ln.new(mm.outputs[0], cc.inputs[0])
    ce = cc.color_ramp.elements
    if LIGHT == "dusk":
        ce[0].position, ce[0].color = 0.5, (1.0, 0.5, 0.25, 1)
        ce[1].position, ce[1].color = 0.75, (0.3, 0.14, 0.24, 1)
    else:
        ce[0].position, ce[0].color = 0.5, (0.05, 0.06, 0.1, 1)
        ce[1].position, ce[1].color = 0.8, (0.02, 0.025, 0.05, 1)
    mixc = nd.new("ShaderNodeMix")
    mixc.data_type = "RGBA"
    ln.new(amt.outputs[0], mixc.inputs[0])
    ln.new(ramp.outputs[0], mixc.inputs[6])
    ln.new(cc.outputs[0], mixc.inputs[7])
    ln.new(mixc.outputs[2], bg.inputs[0])
    # the light fades a little as the sun sinks over the shot
    n = max(SHOTS[SHOT]["n"], 2)
    bg.inputs[1].default_value = strength
    bg.inputs[1].keyframe_insert("default_value", frame=1)
    bg.inputs[1].default_value = strength * (0.9 if LIGHT == "dusk" else 1.0)
    bg.inputs[1].keyframe_insert("default_value", frame=n)
    sun = ts.link(bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")))
    fill = ts.link(bpy.data.objects.new("fill", bpy.data.lights.new("fill", "SUN")))
    fill.data.use_shadow = False
    if LIGHT == "dusk":
        sun.data.energy, sun.data.color = 4.5, (1.0, 0.55, 0.28)
        sun.rotation_euler = (math.radians(78), 0, math.radians(195))
        fill.data.energy, fill.data.color = 0.5, (0.6, 0.55, 0.85)
        fill.rotation_euler = (math.radians(40), 0, math.radians(30))
        # the sun sinks: slightly dimmer and redder by the end, with a soft dip as a cloud edge crosses it
        n = max(SHOTS[SHOT]["n"], 2)
        for f in range(1, n + 1, 5):
            u = (f - 1) / (n - 1)
            dip = 0.12 * math.exp(-((u - 0.55) / 0.15) ** 2)
            sun.data.energy = 4.5 * (1 - 0.1 * u - dip)
            sun.data.keyframe_insert("energy", frame=f)
            sun.data.color = (1.0, 0.55 - 0.06 * u, 0.28 - 0.05 * u)
            sun.data.keyframe_insert("color", frame=f)
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


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    sky_and_light(sc)
    ground()
    railway()
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
    leaf = veg.leaf_mat("acacialeaf", None)
    for i, (x, y, s) in enumerate([(-16, 2, 1.0), (10, 20, 1.2), (-20, 26, 1.3), (22, 40, 1.5), (-6, 48, 1.4), (14, 82, 1.6), (-30, 49, 1.8),
                                   (30, 8, 1.1), (-11, -10, 1.0), (9, 3, 0.8), (-24, 12, 1.1), (40, 28, 1.4), (-40, 40, 1.6), (26, 95, 1.9), (-14, 110, 2.0)]):
        veg.acacia(f"acacia{i}", (x, y), s, rnd, bark, leaf)
    # shrubs and bushes (Poly Haven CC0): Searsia (an African shrub), wild rooibos, scrub, dry fallen branches
    for (x, y, nm, sc_) in [(7.5, -1.5, "searsia_lucida", 0.8), (-8.5, -6.5, "searsia_lucida", 0.7), (12, 12, "searsia_lucida", 1.0),
                            (-17, 18, "searsia_lucida", 0.9), (6.5, 24, "shrub_02", 0.5), (-12, -3, "shrub_02", 0.45), (16, -6, "shrub_02", 0.55),
                            (-5.5, -4.5, "wild_rooibos_bush", 1.0), (2.8, -2.8, "wild_rooibos_bush", 0.9), (-9, 1.5, "wild_rooibos_bush", 1.1),
                            (6.2, 4.5, "shrub_04", 2.2), (-1.8, -3.0, "shrub_04", 1.8), (1.5, -6.8, "shrub_04", 2.0)]:
        veg.place_shrub(A, nm, (x, y), rnd.uniform(0, math.tau), sc_, rnd, amp=0.04 if nm != "shrub_04" else 0.03)
    for (x, y) in [(-6.6, -2.2), (8.5, 1.0), (-3.6, -6.0)]:
        veg.place_shrub(A, "dry_branches_medium_01", (x, y), rnd.uniform(0, math.tau), 1.0, rnd, amp=0.0, flutter=0.0)
    # red termite mounds, typical of the Tsavo plains
    earth = mat("mound", (0.42, 0.16, 0.08), rough=0.95)
    for (x, y, h) in [(11, 9, 1.6), (-14, 30, 2.2), (18, 32, 1.3), (-22, -4, 1.8)]:
        bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.7 * h / 1.6, radius2=0.12, depth=h, location=(x, y, h / 2 - 0.05))
        mo = bpy.context.object
        mo.modifiers.new("sub", "SUBSURF").levels = 2
        dm = mo.modifiers.new("lumps", "DISPLACE")
        tx = bpy.data.textures.new("lumps", "CLOUDS"); tx.noise_scale = 0.35
        dm.texture, dm.strength = tx, 0.22
        mo.data.materials.append(earth)
    flame = mat("flame", (1.0, 0.55, 0.15), emit=14.0)
    for p in [(0.6, 9.5), (-6.0, 3.0), (-5.6, 20.0)]:
        fire(p, flame)
    props(None, None)
    steel = ts.flat_mat("girder", (0.25, 0.2, 0.18), rough=0.5, metal=0.6)
    stone = mat("pier", (0.55, 0.45, 0.38))
    bridge(steel, stone)
    hills()
    far_trees()
    for m_ in (leaf, bark, steel):
        add_haze(m_)
    track = lambda x, y: abs(x - 4.0) < 1.6 or abs(y - river_y(x)) < 10.5
    incamp = lambda x, y: math.hypot(x + 2.5, y - 10.5) < 11.0 and rnd.random() < 0.85
    gm = veg.grass_mat()
    # fine savanna grass: dense close to the camp, thinner far away (beyond ~35 m it reads as texture anyway)
    near = veg.fine_grass("grass_near", 5200, ((-24, 24), (-20, 34)), rnd, skip=lambda x, y: track(x, y) or incamp(x, y))
    far = veg.fine_grass("grass_far", 4200, ((-45, 45), (-30, 75)), rnd, hs=(0.35, 0.8), blades=(6, 10),
                         skip=lambda x, y: track(x, y) or incamp(x, y) or (abs(x) < 24 and -20 < y < 34))
    lowc = veg.fine_grass("grass_low", 700, ((-7, 2), (-15.5, -11)), rnd, hs=(0.45, 0.9))
    parts = [near, far, lowc]
    # each shot gets a dense patch of grass where its camera looks closest
    dense = {"envtest": ((-9, 9), (-6.5, 5)), "patterson": ((-3, 9), (-8, 4)), "bush": ((3, 11), (-9, -1)), "grass": ((-8, 3), (-16, -9))}.get(SHOT)
    if dense:
        parts.append(veg.fine_grass("grass_dense", int(16 * (dense[0][1] - dense[0][0]) * (dense[1][1] - dense[1][0])), dense, rnd,
                                    skip=lambda x, y: track(x, y) or math.hypot(x + 2.5, y - 10.5) < 12.8))
    far.visible_shadow = False
    for g_ in parts:
        g_.data.materials.append(gm)
        veg.add_wind(g_, amp=0.16, height=0.8, speed=1.1, scale=0.18, flutter=0.03, phase=0.0)
    linear_all()
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
    # --fg CLIP: a foreground layer for compositing. Only what is nearer than CLIP metres is rendered, on a transparent
    # background, so grass and thorn branches in front of the 2D cast can be laid over them.
    fg = arg("--fg")
    if fg:
        sc.render.film_transparent = True
        sc.render.image_settings.color_mode = "RGBA"
        cam.data.clip_end = float(fg)
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
    if not fg:
        json.dump({"shot": SHOT, "frames": cams}, open(os.path.join(out, "cam.json"), "w"))
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
    import time
    for f in range(a, b + 1, step):
        p = os.path.join(out, f"{'fg' if fg else 'f'}_{f:04d}.png")
        if os.path.exists(p):
            continue
        t0 = time.time()
        sc.frame_set(f)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        print("frame", f, round(time.time() - t0, 1), "s", flush=True)
