# 3D set for "The Ahuizotl" (Aztec legend), same look and pipeline as the Spider Woman and Tsavo Shorts: a real lit
# Blender set (EEVEE), NO characters; the flat 2D cast is drawn in Remotion on top through the same camera (cam.json).
# Set: a moonlit shore of Lake Texcoco around 1500. A soft mud bank (wet and glossy at the waterline), dark still water
# that mirrors the moon, beds of tall tule reeds standing in the shallows, a beached dugout canoe (acalli) and a few
# fishing stakes, low mist on the water, the far shore with the two volcanoes (Popocatepetl, Iztaccihuatl) under the moon.
# The plate is rendered wide (default 2400x1920) with a vertical sensor fit, so Remotion can pan a 1080x1920 window over
# it (a tripod pan: smooth at any frame rate, no plate frames to render) and project the cast with the same camera.
# usage: .venv-bpy/bin/python tools/blender/ahuizotl_lake.py -- --shot chartest --out public/ahuizotl/chartest/ [--w 2400 --h 1920] [--samples 64]
import json
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import test_scene as ts  # noqa: E402

arg = ts.arg
rnd = random.Random(1519)

SHOTS = {
    # character test plate: a still, low camera on the mud bank looking out over the lake; the walk line runs along the
    # bank (y = 0) 2.1 m in front of the lens; the reeds stand in the shallows behind it, densest on the right where he
    # stops at the water's edge. Wide (2400 px) so the walk test can pan with him.
    "chartest": dict(loc=(0.5, -2.1, 0.95), look=(0.5, 6.6, -0.43), lens=28, focus=(0.5, 0.1, 0.9), fstop=4.0),
}
SHOT = arg("--shot", "chartest")
WATER_Z = -0.07
MOON_DIR = Vector((0.15, 0.94, 0.30)).normalized()  # up and a little right, ahead of the camera (back light + rim), over Popocatepetl


def shore_z(x, y):
    """the mud bank: flat-ish where he walks, then sloping down under the water from y ~ 0.6"""
    base = 0.0 if y < 0.55 else -0.32 * min(1.0, (y - 0.55) / 1.4) ** 1.3
    return base + 0.025 * math.sin(x * 1.7 + y * 0.6) + 0.015 * math.sin(x * 4.1 - y * 2.3)


def mud_mat():
    m, nd, ln, bs = ts.new_mat("mud")
    tc = nd.new("ShaderNodeTexCoord")
    no = nd.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = 7.0
    no.inputs["Detail"].default_value = 10.0
    no.inputs["Roughness"].default_value = 0.65
    ln.new(tc.outputs["Object"], no.inputs["Vector"])
    ramp = nd.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (0.02, 0.017, 0.014, 1)
    ramp.color_ramp.elements[1].position = 0.7
    ramp.color_ramp.elements[1].color = (0.075, 0.062, 0.046, 1)
    ln.new(no.outputs["Fac"], ramp.inputs[0])
    # wet near the waterline: darker and glossy (it catches the moon)
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Object"], sep.inputs[0])
    wet = nd.new("ShaderNodeMapRange")
    wet.inputs["From Min"].default_value = 0.2
    wet.inputs["From Max"].default_value = 0.9
    ln.new(sep.outputs[1], wet.inputs["Value"])
    dk = nd.new("ShaderNodeMix")
    dk.data_type = "RGBA"
    dk.inputs[7].default_value = (0.02, 0.018, 0.016, 1)
    ln.new(wet.outputs[0], dk.inputs[0])
    ln.new(ramp.outputs[0], dk.inputs[6])
    ln.new(dk.outputs[2], bs.inputs["Base Color"])
    ro = nd.new("ShaderNodeMapRange")
    ro.inputs["To Min"].default_value = 0.8
    ro.inputs["To Max"].default_value = 0.12
    ln.new(wet.outputs[0], ro.inputs["Value"])
    # damp patches: large-scale noise above a soft threshold makes the mud a little glossier (they catch the moon)
    pn = nd.new("ShaderNodeTexNoise")
    pn.inputs["Scale"].default_value = 0.9
    pn.inputs["Detail"].default_value = 3.0
    ln.new(tc.outputs["Object"], pn.inputs["Vector"])
    pr = nd.new("ShaderNodeMapRange")
    pr.inputs["From Min"].default_value = 0.7
    pr.inputs["From Max"].default_value = 0.78
    ln.new(pn.outputs["Fac"], pr.inputs["Value"])
    rmin = nd.new("ShaderNodeMix")
    rmin.data_type = "FLOAT"
    rmin.inputs[3].default_value = 0.3
    ln.new(pr.outputs[0], rmin.inputs[0])
    ln.new(ro.outputs[0], rmin.inputs[2])
    ln.new(rmin.outputs[0], bs.inputs["Roughness"])
    bump = nd.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    n2 = nd.new("ShaderNodeTexNoise")
    n2.inputs["Scale"].default_value = 14.0
    n2.inputs["Detail"].default_value = 6.0
    ln.new(tc.outputs["Object"], n2.inputs["Vector"])
    ln.new(n2.outputs["Fac"], bump.inputs["Height"])
    ln.new(bump.outputs[0], bs.inputs["Normal"])
    return m


def water_mat():
    m, nd, ln, bs = ts.new_mat("water")
    bs.inputs["Base Color"].default_value = (0.004, 0.006, 0.01, 1)
    bs.inputs["Roughness"].default_value = 0.03
    bs.inputs["IOR"].default_value = 1.33
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.6, 4.0, 1.0)  # ripples stretched across the view (long, low swells)
    ln.new(tc.outputs["Object"], mp.inputs[0])
    no = nd.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = 1.6
    no.inputs["Detail"].default_value = 4.0
    ln.new(mp.outputs[0], no.inputs["Vector"])
    bump = nd.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.22
    ln.new(no.outputs["Fac"], bump.inputs["Height"])
    ln.new(bump.outputs[0], bs.inputs["Normal"])
    return m


def grid(name, x0, x1, y0, y1, nx, ny, zf, m):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [[bm.verts.new((x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, 0)) for i in range(nx + 1)] for j in range(ny + 1)]
    for j in range(ny + 1):
        for i in range(nx + 1):
            v = vs[j][i]
            v.co.z = zf(v.co.x, v.co.y)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
    bm.to_mesh(me)
    bm.free()
    o = ts.link(bpy.data.objects.new(name, me))
    o.data.materials.append(m)
    ts.smooth(o)
    return o


def reed_clump(name, n, radius, hs, r, stem, tip):
    """one clump of tule: round leafless stems, tapered and bowed, a few with a small brown seed tuft hanging at the top"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    SIDES, SEG = 5, 7
    tufts = []
    for k in range(n):
        a, d = r.uniform(0, 2 * math.pi), radius * math.sqrt(r.random())
        bx, by = d * math.cos(a), d * math.sin(a)
        h = r.uniform(*hs)
        lean = r.uniform(0.02, 0.16) * h if r.random() < 0.8 else r.uniform(0.2, 0.45) * h
        la = math.atan2(by, bx) + r.uniform(-0.6, 0.6)
        w0 = r.uniform(0.011, 0.02)
        rings = []
        for s in range(SEG + 1):
            t = s / SEG
            cx, cy, cz = bx + math.cos(la) * lean * t * t, by + math.sin(la) * lean * t * t, -0.4 + (h + 0.4) * t
            w = w0 * (1 - 0.7 * t * t)
            rings.append([bm.verts.new((cx + w * math.cos(2 * math.pi * q / SIDES), cy + w * math.sin(2 * math.pi * q / SIDES), cz)) for q in range(SIDES)])
        for s in range(SEG):
            for q in range(SIDES):
                f = bm.faces.new((rings[s][q], rings[s][(q + 1) % SIDES], rings[s + 1][(q + 1) % SIDES], rings[s + 1][q]))
                f.material_index = 0
        if r.random() < 0.35:
            tufts.append((bx + math.cos(la) * lean * 0.92, by + math.sin(la) * lean * 0.92, -0.4 + (h + 0.4) * 0.93))
    for (x, y, z) in tufts:  # small drooping spikelet clusters
        for j in range(3):
            s = r.uniform(0.018, 0.03)
            c = Vector((x + r.uniform(-0.03, 0.03), y + r.uniform(-0.03, 0.03), z - r.uniform(0.0, 0.06)))
            vs = [bm.verts.new(c + Vector(o) * s) for o in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1.8), (0, 0, -1.2))]
            for tri in ((0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)):
                f = bm.faces.new([vs[i] for i in tri])
                f.material_index = 1
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.data.materials.append(stem)
    o.data.materials.append(tip)
    ts.smooth(o)
    return o


def place(proto, loc, rot=None, s=1.0):
    o = bpy.data.objects.new(proto.name + "_i", proto.data)
    ts.link(o)
    o.location = loc
    o.rotation_euler[2] = rnd.uniform(0, 2 * math.pi) if rot is None else rot
    o.scale = (s, s, s * rnd.uniform(0.9, 1.1))
    return o


def canoe(loc, rot, m):
    """an acalli (dugout canoe) pulled half up the bank: a hollowed log, square-ish ends"""
    me = bpy.data.meshes.new("acalli")
    bm = bmesh.new()
    L, NS = 3.6, 14
    rings = []
    for i in range(NS + 1):
        t = i / NS
        x = -L / 2 + L * t
        k = math.sin(math.pi * t) ** 0.35
        w, d = 0.3 * (0.35 + 0.65 * k), 0.26 * (0.5 + 0.5 * k)
        # cross-section: a U, open on top, with wall thickness (outer, rim, inner)
        pts = []
        for a in range(9):
            ang = math.pi + math.pi * a / 8
            pts.append((x, w * math.cos(ang), d * math.sin(ang) + d))
        inner = [(x, p[1] * 0.82, (p[2] - d) * 0.8 + d + 0.01) for p in reversed(pts)]
        rings.append([bm.verts.new(p) for p in pts + inner])
    n = len(rings[0])
    for i in range(NS):
        for q in range(n - 1):
            bm.faces.new((rings[i][q], rings[i][q + 1], rings[i + 1][q + 1], rings[i + 1][q]))
    for i in (0, NS):
        bm.faces.new(rings[i] if i else list(reversed(rings[i])))
    bm.to_mesh(me)
    bm.free()
    o = ts.link(bpy.data.objects.new("acalli", me))
    o.location, o.rotation_euler = loc, (math.radians(-3), math.radians(4), rot)
    o.data.materials.append(m)
    bv = o.modifiers.new("sub", "SUBSURF")
    bv.levels = bv.render_levels = 1
    ts.smooth(o)
    return o


def mountains(m, snow):
    """far shore: a long low line of hills, Iztaccihuatl's long ridge and Popocatepetl's cone, faintly snow-capped"""
    def ridge(name, pts, y, mat):
        me = bpy.data.meshes.new(name)
        bm = bmesh.new()
        top = [bm.verts.new((x, y, z)) for x, z in pts]
        bot = [bm.verts.new((x, y + 1, -5)) for x, _ in pts]
        for i in range(len(pts) - 1):
            bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
        bm.to_mesh(me)
        bm.free()
        o = ts.link(bpy.data.objects.new(name, me))
        o.data.materials.append(mat)
        return o
    # x across the view at a distance; heights exaggerated a little for the 9:16 frame
    xs = [-520 + 10 * i for i in range(105)]
    hills = [(x, 6 + 5 * math.sin(x * 0.02) + 3 * math.sin(x * 0.067 + 1) + 2 * math.sin(x * 0.15)) for x in xs]
    ridge("hills", hills, 260, m)
    def cone(cx, h, wd):
        return lambda x: h * max(0.0, 1 - abs(x - cx) / wd) ** 1.25
    popo, izta = cone(150, 165, 175), lambda x: (max(0.0, 70 * (1 - abs(x + 120) / 240)) + 12 * math.exp(-((x + 175) / 40) ** 2) + 9 * math.exp(-((x + 60) / 50) ** 2)) if abs(x + 120) < 240 else 0.0
    far = [(x, 4 + max(popo(x), izta(x)) + 2 * math.sin(x * 0.05)) for x in [-700 + 10 * i for i in range(141)]]
    ridge("volcanoes", far, 900, m)
    caps = [(x, z) for x, z in far]
    snowline = [(x, z - (6 if z > 70 else 1e3)) for x, z in caps]
    me = bpy.data.meshes.new("snow")
    bm = bmesh.new()
    for i in range(len(caps) - 1):
        if caps[i][1] > 74 and caps[i + 1][1] > 74:
            a, b = caps[i], caps[i + 1]
            da, db = min(a[1] - 70, 30) + 6 * math.sin(i * 1.7), min(b[1] - 70, 30) + 6 * math.sin(i * 1.7 + 1.7)
            v = [bm.verts.new((a[0], 899, a[1])), bm.verts.new((b[0], 899, b[1])), bm.verts.new((b[0], 899, b[1] - db)), bm.verts.new((a[0], 899, a[1] - da))]
            bm.faces.new(v)
    bm.to_mesh(me)
    bm.free()
    o = ts.link(bpy.data.objects.new("snow", me))
    o.data.materials.append(snow)
    del snowline


def world():
    """night sky: a deep blue gradient, faint stars, a big soft moon with a halo; it lights and reflects in the water"""
    sc = bpy.context.scene
    wo = bpy.data.worlds.new("night")
    wo.use_nodes = True
    nd, ln = wo.node_tree.nodes, wo.node_tree.links
    bg = nd["Background"]
    tc = nd.new("ShaderNodeTexCoord")
    dirn = nd.new("ShaderNodeVectorMath")
    dirn.operation = "NORMALIZE"
    ln.new(tc.outputs["Generated"], dirn.inputs[0])
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(dirn.outputs[0], sep.inputs[0])
    grad = nd.new("ShaderNodeValToRGB")
    grad.color_ramp.elements[0].position = 0.0
    grad.color_ramp.elements[0].color = (0.035, 0.05, 0.085, 1)
    grad.color_ramp.elements[1].position = 0.55
    grad.color_ramp.elements[1].color = (0.004, 0.007, 0.02, 1)
    ln.new(sep.outputs[2], grad.inputs[0])
    dot = nd.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    dot.inputs[1].default_value = tuple(MOON_DIR)
    ln.new(dirn.outputs[0], dot.inputs[0])
    disc = nd.new("ShaderNodeMapRange")
    disc.inputs["From Min"].default_value = math.cos(math.radians(2.3))
    disc.inputs["From Max"].default_value = math.cos(math.radians(2.1))
    disc.inputs["To Max"].default_value = 9.0
    ln.new(dot.outputs["Value"], disc.inputs["Value"])
    # the moon's face: a little mottling (the maria)
    mn = nd.new("ShaderNodeTexNoise")
    mn.inputs["Scale"].default_value = 60.0
    ln.new(dirn.outputs[0], mn.inputs["Vector"])
    mr = nd.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 0.6
    ln.new(mn.outputs["Fac"], mr.inputs["Value"])
    dm = nd.new("ShaderNodeMath")
    dm.operation = "MULTIPLY"
    ln.new(disc.outputs[0], dm.inputs[0])
    ln.new(mr.outputs[0], dm.inputs[1])
    halo = nd.new("ShaderNodeMath")
    halo.operation = "POWER"
    hc = nd.new("ShaderNodeMath")
    hc.operation = "MAXIMUM"
    hc.inputs[1].default_value = 0.0
    ln.new(dot.outputs["Value"], hc.inputs[0])
    ln.new(hc.outputs[0], halo.inputs[0])
    halo.inputs[1].default_value = 90.0
    hk = nd.new("ShaderNodeMath")
    hk.operation = "MULTIPLY"
    hk.inputs[1].default_value = 0.22
    ln.new(halo.outputs[0], hk.inputs[0])
    # stars: tiny voronoi points, only above the horizon
    vo = nd.new("ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 220.0
    ln.new(dirn.outputs[0], vo.inputs["Vector"])
    st = nd.new("ShaderNodeMapRange")
    st.inputs["From Min"].default_value = 0.06
    st.inputs["From Max"].default_value = 0.0
    st.inputs["To Max"].default_value = 0.5
    ln.new(vo.outputs["Distance"], st.inputs["Value"])
    up = nd.new("ShaderNodeMapRange")
    up.inputs["From Min"].default_value = 0.05
    up.inputs["From Max"].default_value = 0.2
    ln.new(sep.outputs[2], up.inputs["Value"])
    sm = nd.new("ShaderNodeMath")
    sm.operation = "MULTIPLY"
    ln.new(st.outputs[0], sm.inputs[0])
    ln.new(up.outputs[0], sm.inputs[1])
    add1 = nd.new("ShaderNodeMath")
    add1.operation = "ADD"
    ln.new(dm.outputs[0], add1.inputs[0])
    ln.new(hk.outputs[0], add1.inputs[1])
    add2 = nd.new("ShaderNodeMath")
    add2.operation = "ADD"
    ln.new(add1.outputs[0], add2.inputs[0])
    ln.new(sm.outputs[0], add2.inputs[1])
    moonc = nd.new("ShaderNodeMix")
    moonc.data_type = "RGBA"
    moonc.blend_type = "ADD"
    moonc.inputs[0].default_value = 1.0
    ln.new(grad.outputs[0], moonc.inputs[6])
    tint = nd.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 1.0
    tint.inputs[7].default_value = (0.85, 0.9, 1.0, 1)
    cv = nd.new("ShaderNodeCombineXYZ")
    for i in range(3):
        ln.new(add2.outputs[0], cv.inputs[i])
    ln.new(cv.outputs[0], tint.inputs[6])
    ln.new(tint.outputs[2], moonc.inputs[7])
    ln.new(moonc.outputs[2], bg.inputs[0])
    bg.inputs[1].default_value = 1.0
    # thin haze over everything (depth); the low mist over the water is its own volume below
    vol = nd.new("ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = 0.006
    vol.inputs["Anisotropy"].default_value = 0.6
    vol.inputs["Color"].default_value = (0.7, 0.78, 0.95, 1)
    if float(arg("--haze", "0")) > 0:
        vol.inputs["Density"].default_value = float(arg("--haze", "0"))
        ln.new(vol.outputs[0], nd["World Output"].inputs["Volume"])
    sc.world = wo


def mist(loc, size, density):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = "mist"
    o.scale = size
    m, nd, ln, bs = ts.new_mat("mist")
    nd.remove(bs)
    out = nd["Material Output"]
    vp = nd.new("ShaderNodeVolumePrincipled")
    vp.inputs["Color"].default_value = (0.75, 0.82, 1.0, 1)
    vp.inputs["Anisotropy"].default_value = 0.5
    tc = nd.new("ShaderNodeTexCoord")
    no = nd.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = 2.2
    no.inputs["Detail"].default_value = 3.0
    ln.new(tc.outputs["Object"], no.inputs["Vector"])
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Generated"], sep.inputs[0])
    fall = nd.new("ShaderNodeMapRange")  # thick at the water, thinning upward
    fall.inputs["From Min"].default_value = 0.0
    fall.inputs["From Max"].default_value = 1.0
    fall.inputs["To Min"].default_value = 1.0
    fall.inputs["To Max"].default_value = 0.0
    ln.new(sep.outputs[2], fall.inputs["Value"])
    nr = nd.new("ShaderNodeMapRange")
    nr.inputs["From Min"].default_value = 0.4
    nr.inputs["From Max"].default_value = 0.7
    ln.new(no.outputs["Fac"], nr.inputs["Value"])
    mul = nd.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    ln.new(fall.outputs[0], mul.inputs[0])
    ln.new(nr.outputs[0], mul.inputs[1])
    mul2 = nd.new("ShaderNodeMath")
    mul2.operation = "MULTIPLY"
    mul2.inputs[1].default_value = density
    ln.new(mul.outputs[0], mul2.inputs[0])
    ln.new(mul2.outputs[0], vp.inputs["Density"])
    ln.new(vp.outputs[0], out.inputs["Volume"])
    o.data.materials.append(m)
    return o


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    world()
    grid("bank", -9, 9, -4, 2.6, 180, 66, shore_z, mud_mat())
    water = grid("water", -400, 400, -2, 900, 4, 4, lambda x, y: WATER_Z, water_mat())
    water.data.materials[0].diffuse_color = (0, 0, 0, 1)
    stem = ts.flat_mat("tule", (0.028, 0.042, 0.018), rough=0.5)
    tip = ts.flat_mat("tuft", (0.12, 0.07, 0.03), rough=0.8)
    protos = [reed_clump(f"clump{i}", n, rad, hs, random.Random(40 + i), stem, tip)
              for i, (n, rad, hs) in enumerate([(40, 0.45, (1.4, 2.3)), (26, 0.3, (1.1, 2.0)), (55, 0.6, (1.6, 2.5)), (18, 0.22, (0.8, 1.5))])]
    # reed beds in the shallows: a dense stand on the right (where he stops and kneels), a looser line along the shore,
    # and darker banks of reeds further out; a clear gap of open water in front of the walk line in the middle
    stands = [(2.4, 1.6, 2), (3.2, 1.95, 0), (2.9, 2.7, 2), (3.9, 1.5, 1), (4.5, 2.4, 2), (5.3, 1.8, 0), (6.2, 2.5, 2), (7.2, 1.7, 1),
              (1.85, 1.35, 3), (1.55, 1.7, 3), (-1.2, 1.8, 1), (-2.0, 2.6, 0), (-3.4, 1.9, 2), (-4.3, 2.5, 0), (-5.2, 1.6, 1),
              (-6.2, 2.4, 2), (-0.4, 3.8, 3), (0.6, 5.5, 3)]
    for x, y, k in stands:
        # no cast shadows from the near stands: the bank stays an even moonlit ground for the cast (their long striped
        # shadows toward the lens fought with the character's own shadow)
        place(protos[k], (x, y, WATER_Z), s=rnd.uniform(0.9, 1.15)).visible_shadow = False
    # broken reed stems and bits of drift lying on the mud (dull and dark, half sunk in)
    drift = ts.flat_mat("drift", (0.035, 0.03, 0.022), rough=0.9)
    for i in range(40):
        x, y = rnd.uniform(-6, 7), rnd.uniform(-1.6, 0.7)
        bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=rnd.uniform(0.006, 0.012), depth=rnd.uniform(0.15, 0.6), location=(x, y, shore_z(x, y) + 0.008))
        o = bpy.context.object
        o.rotation_euler = (math.radians(90), 0, rnd.uniform(0, math.pi))
        o.data.materials.append(drift)
    for i in range(90):  # far reed beds, scattered in bands, leaving the moon's path on the water open
        x = rnd.uniform(-30, 30)
        y = rnd.choice([rnd.uniform(9, 14), rnd.uniform(22, 35)])
        if -2.5 + 0.12 * y < x < 3.5 + 0.2 * y:
            continue
        place(protos[rnd.randrange(3)], (x, y, WATER_Z), s=rnd.uniform(1.0, 1.4))
    # short sedge tufts on the bank (along the waterline and in the near corners)
    for x, y, s in [(-4.0, 0.75, 0.35), (-2.0, 0.8, 0.3), (-0.6, 0.85, 0.32), (0.9, 0.7, 0.3), (2.0, 0.85, 0.4), (3.1, 0.7, 0.35),
                    (-2.6, -1.2, 0.3), (3.4, -1.0, 0.35), (-1.0, -1.6, 0.25), (2.2, -1.7, 0.28), (4.6, -0.2, 0.4), (-3.6, -0.3, 0.3)]:
        place(protos[3], (x, y, shore_z(x, y) + 0.36 * s), s=s).visible_shadow = False
    wood = ts.flat_mat("wood", (0.07, 0.05, 0.035), rough=0.8)
    canoe((-3.1, 0.95, -0.06), math.radians(-12), wood)
    for i, (x, y) in enumerate([(-0.4, 4.2), (-0.1, 5.0), (0.25, 5.9), (-4.5, 6.5)]):
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.035, depth=1.6, location=(x, y, 0.4 - 0.2 * (i % 2)))
        o = bpy.context.object
        o.rotation_euler = (rnd.uniform(-0.1, 0.1), rnd.uniform(-0.1, 0.1), 0)
        o.data.materials.append(wood)
    stone = ts.flat_mat("stone", (0.09, 0.09, 0.095), rough=0.7)
    for x, y, s in [(-1.2, 0.5, 0.13), (-1.05, 0.62, 0.07), (2.6, 0.45, 0.1), (-5.0, 0.2, 0.16), (4.4, 0.3, 0.12)]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=s, location=(x, y, shore_z(x, y) - s * 0.35))
        o = bpy.context.object
        o.scale = (1.3, 1.0, 0.6)
        o.data.materials.append(stone)
    mountains(ts.flat_mat("farland", (0.03, 0.04, 0.07), rough=1.0, emit=0.12), ts.flat_mat("snow", (0.3, 0.34, 0.45), rough=1.0, emit=0.35))
    # low mist lying on the water, thicker out on the lake
    mist((0, 16, 0.35), (60, 24, 0.9), 0.05)
    # moonlight: a cold sun from the moon's direction (back light: rims on the reeds, the glint path on the water)
    mo = ts.link(bpy.data.objects.new("moon", bpy.data.lights.new("moon", "SUN")))
    mo.data.energy, mo.data.color, mo.data.angle = 0.9, (0.62, 0.72, 1.0), math.radians(5)
    mo.rotation_euler = (-MOON_DIR).to_track_quat("-Z", "Y").to_euler()
    mo.data.specular_factor = 0.2  # its mirror image in the near water was a hard white ball; the 2D glints carry the shimmer
    # a faint cold fill from behind the camera so the bank and the reeds facing us are not black
    fl = bpy.data.lights.new("fill", "AREA")
    fl.size, fl.energy, fl.color = 8.0, 450, (0.42, 0.52, 0.85)
    o = ts.link(bpy.data.objects.new("fill", fl))
    o.location = (1.0, -6.0, 3.5)
    o.rotation_euler = (Vector((0, 2.0, 0.3)) - o.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "32"))
    ee.use_raytracing = True  # screen-space reflections: the reeds mirror in the still water
    try:
        ee.ray_tracing_method = "SCREEN"
        ee.ray_tracing_options.resolution_scale = "1"
    except Exception:
        pass
    ee.volumetric_tile_size = "4"
    ee.volumetric_samples = 64
    ee.use_volumetric_shadows = True
    ee.volumetric_end = 120
    sc.world.probe_resolution = "1024" if hasattr(sc.world, "probe_resolution") else None
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "1.4"))
    sc.render.image_settings.file_format = "PNG"
    return sc


def shot_camera(sc, name, w, h):
    S = SHOTS[name]
    c = ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    # vertical sensor fit: the sensor's 36 mm map to the plate's height, so a 1920-tall plate keeps the same pixel focal
    # length as the 1080x1920 frame (CharTest's project() is 1920-based) and a wide plate just adds width
    c.data.sensor_fit, c.data.sensor_height, c.data.sensor_width = "VERTICAL", 36 * h / 1920, 36
    c.data.clip_start, c.data.clip_end = 0.05, 2000
    c.data.lens = S["lens"]
    c.data.dof.use_dof = True
    c.data.dof.aperture_fstop = S["fstop"]
    foc = ts.link(bpy.data.objects.new("focus", None))
    foc.location = S["focus"]
    c.data.dof.focus_object = foc
    c.location = S["loc"]
    c.rotation_euler = (Vector(S["look"]) - Vector(S["loc"])).to_track_quat("-Z", "Y").to_euler()
    sc.camera = c
    return c


if __name__ == "__main__":
    W, H = int(arg("--w", "2400")), int(arg("--h", "1920"))
    sc = build()
    cam = shot_camera(sc, SHOT, W, H)
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = int(arg("--pct", "100"))
    out = os.path.abspath(arg("--out", f"public/ahuizotl/{SHOT}/"))
    os.makedirs(out, exist_ok=True)
    bpy.context.view_layer.update()
    json.dump({"shot": SHOT, "w": W, "h": H, "frames": {"1": {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36 * H / 1920}}},
              open(os.path.join(out, "cam.json"), "w"))
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
    import time
    t0 = time.time()
    sc.render.filepath = os.path.join(out, "f_0001.png")
    bpy.ops.render.render(write_still=True)
    print("plate", round(time.time() - t0, 1), "s", flush=True)
