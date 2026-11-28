"""Kaizen Clips props kit: small reusable objects that make a place feel lived in. Each returns its objects, tagged
"prop". Lights (lamps, fires, candles) return (objects, light) so the set can render hi/lo flicker plates.
"""
import math
import random

from mathutils import Matrix, Vector

from . import core
from . import materials as M
from . import lighting as L


def _at(objs, loc, rot=0.0):
    T = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot, 4, "Z")
    for o in objs:
        o.matrix_world = T @ o.matrix_basis
        core.tag(o, "prop")
    return objs


def barrel(loc, rot=0.0, mat=None, name="barrel"):
    mat = mat or M.wood("barrel_wood", (0.12, 0.07, 0.04), (0.3, 0.19, 0.1), planks=False)
    iron = M.metal("barrel_iron", (0.06, 0.06, 0.06))
    objs = [core.cyl(name, (0, 0, 0), (0, 0, 0.9), 0.32, mat, segs=16)]
    for z in (0.12, 0.45, 0.78):
        objs.append(core.cyl(name + "_hoop", (0, 0, z - 0.03), (0, 0, z + 0.03), 0.335, iron, segs=16))
    return _at(objs, loc, rot)


def crate(loc, rot=0.0, s=0.7, name="crate"):
    w = M.wood("crate_wood", (0.18, 0.12, 0.07), (0.4, 0.3, 0.18))
    return _at([core.box(name, (0, 0, s / 2), (s, s, s), w, bevel=0.02)], loc, rot)


def sack(loc, rot=0.0, name="sack"):
    o = core.box(name, (0, 0, 0.3), (0.5, 0.35, 0.6), M.cloth("sack_cloth", (0.5, 0.42, 0.3)), bevel=0.15)
    return _at([o], loc, rot)


def cart(loc, rot=0.0, name="cart"):
    w = M.wood("cart_wood", (0.15, 0.1, 0.06), (0.36, 0.25, 0.15))
    objs = [core.box(name + "_bed", (0, 0, 0.85), (2.2, 1.3, 0.12), w)]
    for sx in (-1, 1):
        objs.append(core.box(name + "_side", (0, sx * 0.62, 1.05), (2.2, 0.06, 0.35), w))
    objs.append(core.box(name + "_back", (-1.08, 0, 1.05), (0.06, 1.3, 0.35), w))
    for sy in (-1, 1):
        wh = core.cyl(name + "_wheel", (0.2, sy * 0.75, 0.6), (0.2, sy * 0.85, 0.6), 0.6, w, segs=20)
        objs.append(wh)
    objs.append(core.cyl(name + "_shaft", (1.1, -0.4, 0.75), (3.0, -0.35, 0.45), 0.05, w, segs=6))
    objs.append(core.cyl(name + "_shaft", (1.1, 0.4, 0.75), (3.0, 0.35, 0.45), 0.05, w, segs=6))
    return _at(objs, loc, rot)


def lamppost(loc, lit=True, kind="gas", name="lamp", energy=150.0):
    iron = M.metal("lamp_iron", (0.03, 0.035, 0.035))
    glow = M.glass_lit("lamp_glass", (1.0, 0.75, 0.4) if kind == "gas" else (1.0, 0.92, 0.8), 6.0 if lit else 0.0)
    h = 3.4
    objs = [core.cyl(name + "_pole", (0, 0, 0), (0, 0, h), 0.06, iron, segs=10),
            core.cyl(name + "_base", (0, 0, 0), (0, 0, 0.5), 0.12, iron, segs=10),
            core.box(name + "_head", (0, 0, h + 0.25), (0.32, 0.32, 0.45), glow),
            core.box(name + "_cap", (0, 0, h + 0.52), (0.42, 0.42, 0.08), iron)]
    _at(objs, loc)
    light = L.point(name + "_light", (loc[0], loc[1], loc[2] + h + 0.2), energy if lit else 0.0, (1.0, 0.7, 0.4), 0.15, cutoff=14.0)
    return objs, light


def bench(loc, rot=0.0, name="bench"):
    w = M.wood("bench_wood", (0.15, 0.1, 0.06), (0.36, 0.25, 0.15))
    objs = [core.box(name + "_seat", (0, 0, 0.45), (1.6, 0.42, 0.06), w), core.box(name + "_back", (0, 0.2, 0.75), (1.6, 0.05, 0.4), w)]
    for sx in (-0.7, 0.7):
        objs.append(core.box(name + "_leg", (sx, 0, 0.22), (0.06, 0.4, 0.45), w))
    return _at(objs, loc, rot)


def table(loc, rot=0.0, w=1.4, d=0.8, h=0.78, name="table"):
    m = M.wood("table_wood", (0.14, 0.08, 0.045), (0.34, 0.21, 0.12))
    objs = [core.box(name + "_top", (0, 0, h), (w, d, 0.06), m)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(core.box(name + "_leg", (sx * (w / 2 - 0.06), sy * (d / 2 - 0.06), h / 2), (0.06, 0.06, h), m))
    return _at(objs, loc, rot)


def chair(loc, rot=0.0, name="chair"):
    m = M.wood("chair_wood", (0.14, 0.08, 0.045), (0.34, 0.21, 0.12))
    objs = [core.box(name + "_seat", (0, 0, 0.45), (0.45, 0.45, 0.05), m), core.box(name + "_back", (0, 0.2, 0.75), (0.45, 0.04, 0.6), m)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(core.box(name + "_leg", (sx * 0.19, sy * 0.19, 0.22), (0.04, 0.04, 0.45), m))
    return _at(objs, loc, rot)


def fireplace(loc, rot=0.0, lit=True, name="hearth", energy=220.0):
    st = M.stone("hearth_stone")
    objs = [core.box(name + "_l", (-0.75, 0, 0.6), (0.4, 0.5, 1.2), st), core.box(name + "_r", (0.75, 0, 0.6), (0.4, 0.5, 1.2), st),
            core.box(name + "_top", (0, 0, 1.35), (1.9, 0.6, 0.3), st), core.box(name + "_back", (0, 0.2, 0.6), (1.1, 0.1, 1.2), M.flat("soot", (0.02, 0.018, 0.016))),
            core.box(name + "_chim", (0, 0.05, 2.2), (1.3, 0.5, 1.5), st)]
    fire = M.flat("fire", (1.0, 0.45, 0.12), emit=6.0 if lit else 0.0)
    objs.append(core.box(name + "_fire", (0, 0, 0.18), (0.6, 0.3, 0.2), fire))
    _at(objs, loc, rot)
    p = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot, 4, "Z") @ Vector((0, -0.3, 0.45))
    light = L.point(name + "_light", tuple(p), energy if lit else 0.0, (1.0, 0.5, 0.2), 0.25, cutoff=12.0)
    return objs, light


def campfire(loc, lit=True, name="campfire", energy=300.0, seed=4):
    r = random.Random(seed)
    stone_m = M.stone("fire_stone", blocks=False)
    log_m = M.bark("fire_log", (0.05, 0.035, 0.02), (0.15, 0.1, 0.06))
    objs = []
    for i in range(11):
        a = 2 * math.pi * i / 11
        o = core.box(name + "_st", (0.62 * math.cos(a), 0.62 * math.sin(a), 0.07), (0.25, 0.2, 0.15), stone_m, rot=a, bevel=0.05)
        objs.append(o)
    for i in range(4):
        a = 2 * math.pi * i / 4 + r.uniform(-0.2, 0.2)
        objs.append(core.cyl(name + "_log", (0.42 * math.cos(a), 0.42 * math.sin(a), 0.05), (0.05 * math.cos(a), 0.05 * math.sin(a), 0.4), 0.06, log_m, segs=6))
    objs.append(core.box(name + "_embers", (0, 0, 0.06), (0.5, 0.5, 0.06), M.flat("embers", (1.0, 0.35, 0.08), emit=8.0 if lit else 0.0), bevel=0.1))
    _at(objs, loc)
    light = L.point(name + "_light", (loc[0], loc[1], loc[2] + 0.6), energy if lit else 0.0, (1.0, 0.5, 0.18), 0.3, cutoff=16.0)
    return objs, light


def candle(loc, lit=True, name="candle", energy=8.0):
    objs = [core.cyl(name, (0, 0, 0), (0, 0, 0.18), 0.03, M.flat("wax", (0.9, 0.86, 0.72), 0.5), segs=10),
            core.box(name + "_flame", (0, 0, 0.21), (0.015, 0.015, 0.04), M.flat("flame", (1.0, 0.7, 0.3), emit=12.0 if lit else 0.0))]
    _at(objs, loc)
    light = L.point(name + "_light", (loc[0], loc[1], loc[2] + 0.25), energy if lit else 0.0, (1.0, 0.6, 0.25), 0.02, cutoff=6.0)
    return objs, light


def tent(loc, rot=0.0, name="tent", col=(0.62, 0.56, 0.44)):
    import bpy
    c = M.cloth("tent_canvas", col)
    me = bpy.data.meshes.new(name)
    w, d, h = 2.6, 3.2, 2.1
    me.from_pydata([(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (0, -d / 2, h), (-w / 2, d / 2, 0), (w / 2, d / 2, 0), (0, d / 2, h)], [],
                   [(0, 2, 5, 3), (1, 4, 5, 2), (0, 1, 2), (3, 5, 4)])
    me.materials.append(c)
    o = core.link(bpy.data.objects.new(name, me))
    return _at([o], loc, rot)


def cannon(loc, rot=0.0, name="cannon"):
    iron = M.metal("cannon_iron", (0.05, 0.05, 0.05), 0.4)
    w = M.wood("cannon_wood", (0.12, 0.07, 0.04), (0.3, 0.19, 0.1), planks=False)
    objs = [core.cyl(name + "_barrel", (-0.6, 0, 0.75), (1.3, 0, 0.9), 0.16, iron, segs=16), core.box(name + "_carriage", (-0.3, 0, 0.5), (1.3, 0.5, 0.35), w)]
    for sy in (-1, 1):
        objs.append(core.cyl(name + "_wheel", (-0.1, sy * 0.3, 0.55), (-0.1, sy * 0.4, 0.55), 0.55, w, segs=18))
    return _at(objs, loc, rot)


def sandbags(loc, rot=0.0, n=6, rows=2, name="sandbags"):
    m = M.cloth("sandbag", (0.45, 0.4, 0.3))
    objs = []
    for rw in range(rows):
        for i in range(n - rw):
            objs.append(core.box(name, (i * 0.62 + rw * 0.31 - n * 0.31, 0, 0.14 + rw * 0.26), (0.6, 0.38, 0.28), m, bevel=0.1))
    return _at(objs, loc, rot)


def well(loc, name="well"):
    st = M.stone("well_stone")
    w = M.wood("well_wood", (0.12, 0.07, 0.04), (0.3, 0.19, 0.1), planks=False)
    objs = [core.cyl(name + "_ring", (0, 0, 0), (0, 0, 0.8), 0.8, st, segs=20)]
    for sx in (-0.75, 0.75):
        objs.append(core.box(name + "_post", (sx, 0, 1.3), (0.12, 0.12, 1.4), w))
    objs.append(core.box(name + "_roof", (0, 0, 2.15), (1.9, 1.3, 0.08), M.roof("well_roof", "shingle", (0.3, 0.2, 0.12))))
    return _at(objs, loc)


def haystack(loc, s=1.0, name="hay"):
    o = core.box(name, (0, 0, 0.7 * s), (1.8 * s, 1.8 * s, 1.4 * s), M.varied("hay", (0.35, 0.27, 0.1), (0.7, 0.58, 0.28), 10.0, 0.95, 0.8), bevel=0.6 * s)
    return _at([o], loc)


def signpost(loc, rot=0.0, name="sign"):
    w = M.wood("sign_wood", (0.15, 0.1, 0.06), (0.36, 0.25, 0.15), planks=False)
    return _at([core.box(name + "_post", (0, 0, 1.1), (0.1, 0.1, 2.2), w), core.box(name + "_board", (0.4, 0, 1.8), (0.9, 0.05, 0.3), w)], loc, rot)


def flagpole(loc, col=(0.6, 0.1, 0.1), name="flag", h=6.0):
    objs = [core.cyl(name + "_pole", (0, 0, 0), (0, 0, h), 0.05, M.metal("pole", (0.5, 0.5, 0.5)), segs=8),
            core.box(name + "_cloth", (0.6, 0, h - 0.45), (1.2, 0.02, 0.8), M.cloth("flagcloth", col))]
    return _at(objs, loc)
