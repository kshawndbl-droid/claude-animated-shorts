"""Kaizen Clips buildings kit: modular houses (any period via palettes), shopfronts, timber-frame cottages, log cabins,
a whole street of facades, walls and fences. A building is a group (empty + parts), placed by its front-door point.

Front of a building faces -y in its own space (toward a camera on the street); rot turns the whole building.
Door height ~2.0 m, so the 2D cast (~1.45 m) reads with a slightly stylized scale.
"""
import math
import random

import bpy  # noqa: I001
from mathutils import Matrix, Vector

from . import core
from . import materials as M


def _place(objs, loc, rot):
    T = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot, 4, "Z")
    for o in objs:
        o.matrix_world = T @ o.matrix_basis
    return objs


def gable_roof(name, w, d, top, rise, mat, over=0.35, thick=0.14):
    objs = []
    ang = math.atan2(rise, d / 2)
    ln_ = math.hypot(rise, d / 2) + over
    for side in (-1, 1):
        o = core.box(f"{name}_roof", (0, -side * (d / 4 + over / 4), top + rise / 2), (w + 2 * over, ln_, thick), mat)
        o.rotation_euler = (side * ang, 0, 0)
        objs.append(o)
    # gable triangles
    for sx in (-1, 1):
        me = bpy.data.meshes.new(f"{name}_gable")
        me.from_pydata([(sx * w / 2, -d / 2, top), (sx * w / 2, d / 2, top), (sx * w / 2, 0, top + rise)], [], [(0, 1, 2)])
        o = core.link(bpy.data.objects.new(f"{name}_gable", me))
        objs.append(o)
    return objs


def house(name, loc=(0, 0, 0), rot=0.0, w=6.0, d=5.0, floors=2, floor_h=2.8, wall=None, trim=None, roof_mat=None, door_col=None,
          windows_lit=False, roof="gable", timber=False, chimney=True, shop=None, seed=1, glass_col=(1.0, 0.62, 0.28)):
    """a house/shop: walls, windows on every floor of the front (and sides), a door, a roof (gable or flat with a
    parapet), optional timber framing, an optional shopfront (shop = sign colour) with an awning"""
    r = random.Random(seed)
    h = floors * floor_h
    wall = wall or M.plaster(f"{name}_wall")
    trim = trim or M.wood(f"{name}_trim", planks=False)
    glass = M.glass_lit(f"{name}_glass", glass_col, 3.5 if windows_lit else 0.0)
    door_m = M.wood(f"{name}_door", *(((tuple(v * 0.6 for v in door_col), door_col)) if door_col else ()))
    objs = [core.box(f"{name}_walls", (0, 0, h / 2), (w, d, h), wall)]
    # a plinth
    objs.append(core.box(f"{name}_plinth", (0, -0.02, 0.2), (w + 0.08, d + 0.08, 0.4), M.stone(f"{name}_plinth", blocks=False)))
    nwin = max(1, int(w / 1.9))
    for f in range(floors):
        zc = f * floor_h + (1.3 if f > 0 else 1.25)
        for i in range(nwin):
            x = -w / 2 + w * (i + 0.5) / nwin
            if f == 0 and (i == nwin // 2 or (shop and abs(x) < w * 0.35)):
                continue
            ww, wh = 0.85, 1.25
            objs.append(core.box(f"{name}_wframe", (x, -d / 2 - 0.04, zc), (ww + 0.2, 0.1, wh + 0.22), trim))
            objs.append(core.box(f"{name}_pane", (x, -d / 2 - 0.06, zc), (ww, 0.06, wh), glass))
            objs.append(core.box(f"{name}_sill", (x, -d / 2 - 0.1, zc - wh / 2 - 0.1), (ww + 0.3, 0.16, 0.08), trim))
            objs.append(core.box(f"{name}_mun", (x, -d / 2 - 0.1, zc), (0.04, 0.03, wh), trim))
            objs.append(core.box(f"{name}_mun", (x, -d / 2 - 0.1, zc + wh * 0.1), (ww, 0.03, 0.04), trim))
            if r.random() < 0.35 and not windows_lit:   # shutters
                for sx in (-1, 1):
                    objs.append(core.box(f"{name}_shut", (x + sx * (ww / 2 + 0.25), -d / 2 - 0.07, zc), (0.42, 0.05, wh + 0.1), door_m))
    # door
    dx = 0.0 if not shop else -w * 0.35 + 0.6
    objs.append(core.box(f"{name}_door", (dx, -d / 2 - 0.04, 1.02), (1.05, 0.1, 2.05), door_m))
    objs.append(core.box(f"{name}_dframe", (dx, -d / 2 - 0.05, 1.07), (1.3, 0.08, 2.25), trim))
    objs.append(core.box(f"{name}_step", (dx, -d / 2 - 0.3, 0.08), (1.5, 0.5, 0.16), M.stone(f"{name}_step", blocks=False)))
    if shop:
        objs.append(core.box(f"{name}_shopwin", (w * 0.12, -d / 2 - 0.06, 1.3), (w * 0.55, 0.06, 1.7), glass))
        objs.append(core.box(f"{name}_shopframe", (w * 0.12, -d / 2 - 0.04, 1.3), (w * 0.55 + 0.2, 0.08, 1.9), trim))
        objs.append(core.box(f"{name}_sign", (0, -d / 2 - 0.1, floor_h - 0.25), (w * 0.9, 0.12, 0.5), M.flat(f"{name}_signc", shop, 0.6)))
        aw = core.box(f"{name}_awning", (0, -d / 2 - 0.65, floor_h - 0.65), (w * 0.85, 1.3, 0.05), M.cloth(f"{name}_awn", shop))
        aw.rotation_euler[0] = math.radians(-18)
        objs.append(aw)
    if timber:
        tm = M.wood(f"{name}_beam", (0.06, 0.035, 0.02), (0.14, 0.09, 0.05), planks=False)
        for f in range(floors + 1):
            objs.append(core.box(f"{name}_beamh", (0, -d / 2 - 0.03, f * floor_h + 0.05), (w + 0.04, 0.08, 0.16), tm))
        for i in range(nwin + 1):
            objs.append(core.box(f"{name}_beamv", (-w / 2 + w * i / nwin, -d / 2 - 0.03, h / 2), (0.16, 0.08, h), tm))
        for f in range(floors):
            for i in range(nwin):
                x0 = -w / 2 + w * i / nwin
                b = core.box(f"{name}_beamd", (x0 + w / nwin / 2, -d / 2 - 0.025, f * floor_h + floor_h * 0.28), (w / nwin * 0.9, 0.07, 0.12), tm)
                b.rotation_euler[1] = math.radians(25 * (1 if i % 2 else -1))
                objs.append(b)
    if roof == "gable":
        objs += gable_roof(name, w, d, h, d * 0.45, roof_mat or M.roof(f"{name}_roof"))
        for o in objs[-2:]:
            o.data.materials.append(wall)
    else:  # flat with a parapet and a cornice
        objs.append(core.box(f"{name}_cornice", (0, -0.05, h + 0.15), (w + 0.2, d + 0.1, 0.3), trim))
    if chimney:
        cx = r.uniform(-w * 0.3, w * 0.3)
        objs.append(core.box(f"{name}_chim", (cx, d * 0.15, h + d * 0.45 * 0.7), (0.55, 0.55, d * 0.45 * 1.2 + 0.6), M.bricks(f"{name}_chimb", scale=12.0)))
    _place(objs, loc, rot)
    for o in objs:
        core.tag(o, "building")
    return objs


def street(name, side=-1, x0=-14.0, x1=26.0, y=6.0, palette="1800s", lit=False, seed=3, gap=0.0, shops=0.35, max_floors=3):
    """a continuous row of house fronts along x at distance y (side -1 = fronts face -y, toward a camera at y < row)"""
    r = random.Random(seed)
    P = M.PALETTES[palette]
    x, i, objs = x0, 0, []
    while x < x1:
        w = r.uniform(5.0, 7.5)
        floors = r.randint(2, max_floors)
        wallc = r.choice(P["walls"])
        brick = r.random() < P.get("brick", 0.0)
        wall = M.bricks(f"{name}_b{i}", brick=wallc, scale=r.uniform(3.5, 5.0)) if brick else M.plaster(f"{name}_w{i}", wallc)
        shop = r.choice([(0.5, 0.1, 0.08), (0.1, 0.25, 0.18), (0.12, 0.16, 0.3), (0.35, 0.25, 0.08)]) if r.random() < shops else None
        objs += house(f"{name}{i}", (x + w / 2, y, 0), 0.0 if side < 0 else math.pi, w=w, d=r.uniform(5, 7), floors=floors,
                      wall=wall, trim=M.wood(f"{name}_t{i}", tuple(v * 0.6 for v in r.choice(P["trim"])), r.choice(P["trim"]), planks=False),
                      roof_mat=M.roof(f"{name}_r{i}", P["roofkind"], r.choice(P["roofs"])), door_col=r.choice(P["doors"]),
                      windows_lit=lit and r.random() < 0.7, roof="gable" if r.random() < 0.6 or P.get("timber") else "flat",
                      timber=P.get("timber", False), shop=shop, seed=seed * 31 + i)
        x += w + gap
        i += 1
    return objs


def log_cabin(name, loc=(0, 0, 0), rot=0.0, w=5.0, d=4.0, h=2.4, lit=True, seed=2):
    """a horizontal-log cabin (Hidebehind camp style): notched log walls, plank gable roof, glowing window, plank door"""
    bark = M.bark(f"{name}_logbark", (0.05, 0.035, 0.022), (0.2, 0.14, 0.09))
    plank = M.wood(f"{name}_plank")
    objs, r = [], 0.15
    nl = int(h / (2 * r * 0.92))
    for i in range(nl):
        z = r + i * 2 * r * 0.92
        for (p0, p1) in (((-w / 2 - 0.3, -d / 2, z), (w / 2 + 0.3, -d / 2, z)), ((-w / 2 - 0.3, d / 2, z), (w / 2 + 0.3, d / 2, z)),
                         ((-w / 2, -d / 2 - 0.3, z + r * 0.9), (-w / 2, d / 2 + 0.3, z + r * 0.9)), ((w / 2, -d / 2 - 0.3, z + r * 0.9), (w / 2, d / 2 + 0.3, z + r * 0.9))):
            objs.append(core.cyl(f"{name}_log", p0, p1, r, bark, segs=10))
    top = r + nl * 2 * r * 0.92
    objs.append(core.box(f"{name}_fill", (0, 0, top / 2), (w - 0.1, d - 0.1, top), plank))
    objs += gable_roof(name, w, d, top, d * 0.35, M.wood(f"{name}_roofb", (0.08, 0.06, 0.04), (0.2, 0.15, 0.1)), over=0.45)
    for o in objs[-2:]:
        o.data.materials.append(plank)
    glass = M.glass_lit(f"{name}_glass", (1.0, 0.6, 0.25), 4.0 if lit else 0.0)
    objs.append(core.box(f"{name}_win", (w * 0.25, -d / 2 - r - 0.04, 1.3), (0.8, 0.06, 0.7), glass))
    objs.append(core.box(f"{name}_wfr", (w * 0.25, -d / 2 - r - 0.02, 1.3), (0.96, 0.08, 0.86), plank))
    objs.append(core.box(f"{name}_door", (-w * 0.2, -d / 2 - r - 0.03, 0.98), (0.95, 0.1, 1.95), plank))
    objs.append(core.cyl(f"{name}_pipe", (w * 0.3, 0.5, top + 0.5), (w * 0.3, 0.5, top + d * 0.35 + 1.2), 0.12, M.metal(f"{name}_iron", (0.03, 0.03, 0.03))))
    _place(objs, loc, rot)
    for o in objs:
        core.tag(o, "building")
    return objs


def fence(name, p0, p1, mat, h=1.1, post_every=2.0, rails=2):
    a, b = Vector((*p0, 0)), Vector((*p1, 0))
    n = max(1, int((b - a).length / post_every))
    objs = []
    for i in range(n + 1):
        p = a + (b - a) * (i / n)
        objs.append(core.box(f"{name}_post", (p.x, p.y, h / 2), (0.1, 0.1, h), mat))
    for k in range(rails):
        z = h * (0.35 + 0.5 * k / max(1, rails - 1))
        objs.append(core.cyl(f"{name}_rail", (a.x, a.y, z), (b.x, b.y, z), 0.035, mat, segs=6))
    for o in objs:
        core.tag(o, "prop")
    return objs


def wall(name, p0, p1, h, mat, thick=0.4):
    a, b = Vector((*p0, 0)), Vector((*p1, 0))
    c = (a + b) / 2
    o = core.box(name, (c.x, c.y, h / 2), ((b - a).length, thick, h), mat, rot=math.atan2(b.y - a.y, b.x - a.x))
    return [core.tag(o, "building")]


def room(name, w=6.0, d=5.0, h=2.8, wall_mat=None, floor_mat=None, ceiling=True, window_wall="left", window_lit=0.0, beams=False):
    """an interior box open toward -y (the camera side): floor, back wall, side walls, ceiling, a window opening
    in one side wall with a bright pane (daylight) and optional ceiling beams"""
    wall_mat = wall_mat or M.plaster(f"{name}_wall", (0.62, 0.55, 0.44))
    floor_mat = floor_mat or M.wood(f"{name}_floor", (0.12, 0.07, 0.04), (0.3, 0.19, 0.1))
    objs = [core.box(f"{name}_floor", (0, d / 2, -0.05), (w, d, 0.1), floor_mat),
            core.box(f"{name}_back", (0, d + 0.1, h / 2), (w, 0.2, h), wall_mat)]
    for sx in (-1, 1):
        if (window_wall == "left" and sx < 0) or (window_wall == "right" and sx > 0):
            # wall with a window hole: four pieces around it
            wy, wz, ww, wh = d * 0.55, 1.5, 1.3, 1.4
            objs += [core.box(f"{name}_sw1", (sx * (w / 2 + 0.1), (wy - ww / 2) / 2, h / 2), (0.2, wy - ww / 2, h), wall_mat),
                     core.box(f"{name}_sw2", (sx * (w / 2 + 0.1), (d + wy + ww / 2) / 2, h / 2), (0.2, d - wy - ww / 2, h), wall_mat),
                     core.box(f"{name}_sw3", (sx * (w / 2 + 0.1), wy, (wz - wh / 2) / 2), (0.2, ww, wz - wh / 2), wall_mat),
                     core.box(f"{name}_sw4", (sx * (w / 2 + 0.1), wy, (h + wz + wh / 2) / 2), (0.2, ww, h - wz - wh / 2), wall_mat)]
            objs.append(core.box(f"{name}_pane", (sx * (w / 2 + 0.25), wy, wz), (0.04, ww, wh),
                                 M.glass_lit(f"{name}_sky", (0.75, 0.82, 0.95), window_lit) if window_lit else M.flat(f"{name}_skyc", (0.6, 0.7, 0.85), emit=2.0)))
        else:
            objs.append(core.box(f"{name}_side{sx}", (sx * (w / 2 + 0.1), d / 2, h / 2), (0.2, d, h), wall_mat))
    if ceiling:
        objs.append(core.box(f"{name}_ceil", (0, d / 2, h + 0.05), (w + 0.4, d, 0.1), wall_mat))
    if beams:
        bm_ = M.wood(f"{name}_beams", (0.06, 0.035, 0.02), (0.15, 0.1, 0.06), planks=False)
        for i in range(4):
            objs.append(core.box(f"{name}_beam", (-w / 2 + w * (i + 0.5) / 4, d / 2, h - 0.12), (0.2, d, 0.22), bm_))
    for o in objs:
        core.tag(o, "building")
    return objs
