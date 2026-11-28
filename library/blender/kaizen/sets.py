"""Kaizen Clips set recipes: whole locations from a few words (kind, period, season, seed). Each recipe builds the
scene and returns `marks`: named world points the shots and the 2D cast use (stage = where the main character stands,
path = where people walk, door, window, fire ...). The stage areas are kept flat at z = 0 so the cast stands on them.

Recipes are starting points: a Short calls one, then adds its own story props/buildings with the kits, so no two
Shorts share an identical place.

  village     dirt road through a village (period palette), houses, fences, carts, trees, far hills
  street      a town/city street seen along its length (cobbles or paved), facades both sides, lamps, props
  forest      a trail through conifer / broadleaf / autumn / winter woods
  field       open country: farm, meadow or battlefield (craters, sandbags, cannon), fences, far hills
  interior    a room: cottage, parlor, office, tavern; furniture, fireplace / window light
  shore       a lake or sea shore with a jetty, reeds/rocks, open water to the horizon
  desert      dunes, rocks, palms, a far mesa line
"""
import math
import random

from . import core
from . import materials as M
from . import nature as N
from . import buildings as B
from . import props as PR

SEASON_LEAF = {"summer": 0.0, "autumn": 0.85, "spring": 0.0, "winter": None}


def _trees_around(terrain, rnd, n, area, avoid, kind, bark, leaf, needles=None, hs=(5, 9)):
    placed = []
    for i in range(n * 3):
        if len(placed) >= n:
            break
        x, y = rnd.uniform(area[0], area[1]), rnd.uniform(area[2], area[3])
        if avoid(x, y) or any(math.hypot(x - px, y - py) < 2.2 for px, py in placed):
            continue
        z, h = terrain.height(x, y), rnd.uniform(*hs)
        if kind == "conifer" or (kind == "mixed" and rnd.random() < 0.5):
            N.conifer(f"tree{i}", (x, y), h, bark, needles or leaf, 100 + i, z)
        else:
            N.broadleaf(f"tree{i}", (x, y), h, bark, leaf, 100 + i, z, bare=SEASON_LEAF.get(kind) is None and kind == "winter")
        placed.append((x, y))
    return placed


def village(sc, period="1800s", season="summer", seed=1, lit=False):
    rnd = random.Random(seed)
    road = [(-60, -1.0), (-20, 0.3), (0, 0.0), (20, -0.4), (60, 1.2)]
    snow = 0.8 if season == "winter" else 0.0
    T = N.Terrain(path=road, path_w=2.2, hills=0.8, flat=[(0, 0, 6)], seed=seed)
    T.build(M.ground("snow" if snow else ("drygrass" if season == "autumn" else "grass"), path="path", path_kind="snow" if snow else "dirt", snow=snow))
    # houses on both sides of the road, so a camera looking along it (heading ~80) sees two rows recede into the distance
    B.street("far", -1, -30, 60, 8.0, period, lit=lit, seed=seed, gap=rnd.uniform(1.5, 4.0), shops=0.25, max_floors=2)
    B.street("near", 1, -30, 60, -8.5, period, lit=lit, seed=seed + 50, gap=rnd.uniform(2.0, 5.0), shops=0.2, max_floors=2)
    leaf = M.leaves("leaf", autumn=SEASON_LEAF.get(season) or 0.0)
    bark = M.bark("bark", snow=snow)
    _trees_around(T, rnd, 14, (-45, 45, 14, 40), lambda x, y: False, "broadleaf" if season != "winter" else "winter", bark, leaf)
    fw = M.wood("fence_wood", (0.12, 0.08, 0.05), (0.3, 0.22, 0.14), planks=False)
    B.fence("fence1", (-14, 4.0), (-3, 4.2), fw)
    B.fence("fence2", (5, 4.2), (16, 3.9), fw)
    PR.cart((9.0, 3.0, 0), math.radians(-12))
    PR.barrel((-4.4, 5.6, 0))
    PR.barrel((-3.7, 6.0, 0), 0.5)
    PR.crate((-5.0, 6.3, 0), 0.3)
    PR.well((-11.0, 2.8, 0))
    PR.haystack((19.0, 5.5, 0), 1.0)
    N.grass_tufts("grass", T, (-25, 40, -5, 5), 9000, leaf, seed, avoid=lambda x, y: T.lateral(x, y) < 2.4, hs=(0.06, 0.18))
    for i in range(16):
        x, y = rnd.uniform(-30, 50), rnd.choice((rnd.uniform(-5, -3.2), rnd.uniform(3.2, 5)))
        if T.lateral(x, y) > 3:
            N.bush(f"bush{i}", (x, y), rnd.uniform(0.6, 1.1), leaf, seed + i, T.height(x, y))
    hm = M.varied("hillmat", (0.08, 0.12, 0.06), (0.2, 0.26, 0.12), 0.05, 0.9, 0.0)
    for hd in (0, 90, -90):
        N.far_hills(f"hills{hd}", hm, dist=110, height=18, seed=seed + hd, heading=hd)
    return dict(stage=(0, 0, 0), path=road, heading=80.0, terrain=T)


def street(sc, period="victorian", seed=2, lit=False, paved=False, length=70.0):
    rnd = random.Random(seed)
    T = N.Terrain(path=[(0, -20), (0, 120)], path_w=6.0, hills=0.0, seed=seed)
    T.build(M.cobbles() if not paved else M.varied("asphalt", (0.05, 0.05, 0.055), (0.12, 0.12, 0.13), 3.0, 0.6, 0.2))
    side = M.stone("pavement", (0.2, 0.19, 0.18), (0.36, 0.34, 0.32))
    import bpy  # noqa: F401
    for sx in (-1, 1):
        core.tag(core.box(f"kerb{sx}", (sx * 4.6, length / 2 - 10, 0.08), (2.0, length + 20, 0.16), side), "ground")
    P = M.PALETTES[period]
    y, i = -12.0, 0
    lights = []
    while y < length:
        for sx in (-1, 1):
            w = rnd.uniform(5.5, 8.0)
            d = rnd.uniform(6, 8)
            wallc = rnd.choice(P["walls"])
            brick = rnd.random() < P.get("brick", 0.0)
            wall = M.bricks(f"st_b{i}{sx}", brick=wallc, scale=4.5) if brick else M.plaster(f"st_w{i}{sx}", wallc)
            B.house(f"st{i}_{sx}", (sx * (5.6 + d / 2), y + w / 2, 0), math.radians(90 if sx < 0 else -90), w=w, d=d, floors=rnd.randint(2, 4),
                    wall=wall, trim=M.wood(f"st_t{i}{sx}", tuple(v * 0.6 for v in rnd.choice(P["trim"])), rnd.choice(P["trim"]), planks=False),
                    roof_mat=M.roof(f"st_r{i}{sx}", P["roofkind"], rnd.choice(P["roofs"])), door_col=rnd.choice(P["doors"]),
                    windows_lit=lit and rnd.random() < 0.7, roof="flat" if rnd.random() < 0.5 else "gable", timber=P.get("timber", False),
                    shop=rnd.choice([(0.5, 0.1, 0.08), (0.1, 0.25, 0.18), (0.12, 0.16, 0.3)]) if rnd.random() < 0.4 else None, seed=seed * 17 + i)
        y += rnd.uniform(5.5, 8.0)
        i += 1
    for k in range(int(length / 12)):
        for sx in (-1, 1):
            _, lt = PR.lamppost((sx * 4.2, -4 + k * 12 + (6 if sx > 0 else 0), 0.16), lit=lit, kind="gas" if period != "modern" else "electric")
            lights.append(lt)
    for k in range(6):
        sx = rnd.choice((-1, 1))
        rnd.choice([PR.barrel, PR.crate])((sx * rnd.uniform(4.0, 5.0), rnd.uniform(2, 30), 0.16))
    if period in ("1800s", "victorian", "medieval"):
        PR.cart((2.2, 18.0, 0), math.radians(95))
    return dict(stage=(0, 2.0, 0), path=[(0, -10), (0, 60)], heading=0.0, terrain=T, lights=lights)


def forest(sc, kind="conifer", seed=3, season="summer"):
    rnd = random.Random(seed)
    trail = [(-40, -4), (-12, 1.0), (0, 2.0), (8, 4.0), (14, 10.0), (16, 30), (13, 70)]
    snow = 0.8 if season == "winter" else 0.0
    T = N.Terrain(path=trail, path_w=1.4, hills=1.0, flat=[(0, 2, 3)], seed=seed)
    T.build(M.ground("snow" if snow else "dirt" if kind == "conifer" else "grass", path="path", path_kind="snow" if snow else "dirt", snow=snow))
    bark = M.bark("bark", snow=snow)
    leaf = M.leaves("leaf", autumn=0.85 if season == "autumn" else 0.0)
    needles = M.leaves("needles", (0.01, 0.025, 0.015), (0.04, 0.08, 0.04))
    tk = "conifer" if kind == "conifer" else ("winter" if season == "winter" and kind != "conifer" else "mixed" if kind == "mixed" else "broadleaf")
    _trees_around(T, rnd, 90, (-40, 40, -6, 60), lambda x, y: T.lateral(x, y) < 2.6 or (abs(x) < 3 and -4 < y < 6), tk, bark, leaf, needles, hs=(7, 14))
    for i in range(30):
        x, y = rnd.uniform(-25, 25), rnd.uniform(-4, 30)
        if T.lateral(x, y) > 2.2:
            N.bush(f"bush{i}", (x, y), rnd.uniform(0.5, 1.0), needles if kind == "conifer" else leaf, seed + i, T.height(x, y))
    rk = M.stone("rock", blocks=False)
    for i in range(14):
        x, y = rnd.uniform(-20, 20), rnd.uniform(-4, 25)
        if T.lateral(x, y) > 2.0:
            N.rock(f"rock{i}", (x, y), rnd.uniform(0.3, 0.9), rk, seed + i, T.height(x, y))
    if not snow:
        N.grass_tufts("grass", T, (-15, 15, -6, 14), 1800, leaf, seed, avoid=lambda x, y: T.lateral(x, y) < 1.6)
    return dict(stage=(0, 2.0, 0), path=trail, heading=0.0, terrain=T)


def field(sc, kind="farm", seed=4, season="summer"):
    rnd = random.Random(seed)
    lane = [(-60, 0.5), (0, 0.0), (60, -0.8)]
    T = N.Terrain(path=lane if kind != "battlefield" else [], path_w=1.6, hills=1.2, flat=[(0, 0, 8)], seed=seed)
    gk = {"farm": "grass", "meadow": "grass", "battlefield": "mud"}[kind]
    T.build(M.ground(gk, path="path" if kind != "battlefield" else None))
    leaf = M.leaves("leaf", autumn=0.6 if season == "autumn" else 0.0)
    bark = M.bark("bark")
    fw = M.wood("fence_wood", (0.12, 0.08, 0.05), (0.3, 0.22, 0.14), planks=False)
    if kind == "battlefield":
        for i in range(6):
            PR.sandbags((rnd.uniform(-10, 10), rnd.uniform(3, 14), 0), rnd.uniform(-0.4, 0.4), n=rnd.randint(4, 7))
        PR.cannon((4.0, 6.0, 0), math.radians(-20))
        PR.cannon((-6.0, 9.0, 0), math.radians(15))
        PR.flagpole((-2.0, 12.0, 0))
        for i in range(8):
            x, y = rnd.uniform(-25, 25), rnd.uniform(8, 40)
            N.broadleaf(f"dead{i}", (x, y), rnd.uniform(4, 7), bark, leaf, 50 + i, T.height(x, y), bare=True)
        N.grass_tufts("grass", T, (-20, 20, -6, 14), 900, M.leaves("dgrass", (0.08, 0.07, 0.03), (0.22, 0.18, 0.08)), seed)
    else:
        B.fence("fence1", (-20, 3.5), (20, 3.5), fw)
        PR.haystack((-8, 9, 0), 1.2)
        PR.haystack((6, 14, 0), 1.0)
        B.log_cabin("farmhouse", (12, 22, 0), math.radians(-15), w=6, d=5, h=2.6, lit=False)
        _trees_around(T, rnd, 12, (-50, 50, 18, 50), lambda x, y: False, "broadleaf", bark, leaf)
        N.grass_tufts("grass", T, (-20, 20, -8, 12), 3000, leaf, seed, avoid=lambda x, y: T.lateral(x, y) < 1.8)
    N.far_hills("hills", M.varied("hillmat", (0.08, 0.12, 0.06), (0.2, 0.26, 0.12), 0.05, 0.9, 0.0), dist=120, height=20, seed=seed)
    return dict(stage=(0, 0, 0), path=lane, heading=0.0, terrain=T)


def interior(sc, kind="cottage", seed=5, lit_fire=True, window="left"):
    rnd = random.Random(seed)
    walls = {"cottage": M.plaster("iwall", (0.6, 0.52, 0.4)), "parlor": M.varied("paper", (0.3, 0.12, 0.1), (0.45, 0.2, 0.15), 30.0, 0.8, 0.05),
             "office": M.plaster("iwall", (0.7, 0.7, 0.66)), "tavern": M.wood("iwall", (0.1, 0.06, 0.035), (0.25, 0.16, 0.09))}[kind]
    B.room("room", 7.0, 5.5, 2.9, wall_mat=walls, window_wall=window, beams=kind in ("cottage", "tavern"))
    marks = dict(stage=(0, 2.4, 0), heading=0.0, lights=[])
    if kind in ("cottage", "parlor", "tavern"):
        _, fl = PR.fireplace((1.6, 5.2, 0), 0.0, lit=lit_fire)
        marks["lights"].append(fl)
        marks["fire"] = (1.6, 4.9, 0.4)
    PR.table((-1.2, 3.4, 0), 0.0)
    PR.chair((-1.9, 3.4, 0), math.radians(90))
    PR.chair((-0.5, 3.6, 0), math.radians(-90))
    if kind == "tavern":
        for i in range(3):
            PR.barrel((-3.0, 4.6 - i * 0.8, 0))
    _, cl = PR.candle((-1.2, 3.4, 0.81), lit=True)
    marks["lights"].append(cl)
    if kind == "office":
        PR.crate((2.6, 4.9, 0), 0.0, 0.9)
    return marks


def shore(sc, seed=6, sea=False):
    rnd = random.Random(seed)
    T = N.Terrain(path=[(-40, -2), (40, -2)], path_w=3.0, hills=0.5, flat=[(0, 0, 5)], seed=seed)
    T.build(M.ground("sand" if sea else "grass", path="path", path_kind="sand" if sea else "mud"))
    water = M.new_mat("water")
    m, nd, ln, bs = water
    bs.inputs["Base Color"].default_value = (0.02, 0.05, 0.07, 1) if not sea else (0.02, 0.08, 0.12, 1)
    bs.inputs["Roughness"].default_value = 0.08
    tc = nd.new("ShaderNodeTexCoord")
    no = M.noise(nd, ln, tc.outputs["Object"], 0.8, 4.0)
    M.bump(nd, ln, bs, no.outputs["Fac"], 0.15, 0.1)
    core.tag(core.box("water", (0, 140, -0.05), (600, 270, 0.1), m), "ground")
    w = M.wood("jetty", (0.1, 0.07, 0.05), (0.26, 0.2, 0.14))
    for k in range(8):
        core.tag(core.box("plank", (6, 4 + k * 1.2, 0.35), (1.6, 1.1, 0.08), w), "prop")
        for sx in (-0.75, 0.75):
            core.tag(core.cyl("pile", (6 + sx, 4 + k * 1.2, -1.0), (6 + sx, 4 + k * 1.2, 0.5), 0.08, w, 8), "prop")
    rk = M.stone("rock", blocks=False)
    for i in range(10):
        N.rock(f"rock{i}", (rnd.uniform(-20, 20), rnd.uniform(-1, 3)), rnd.uniform(0.3, 1.0), rk, seed + i)
    N.far_hills("hills", M.varied("hillmat", (0.08, 0.1, 0.08), (0.18, 0.22, 0.16), 0.05, 0.9, 0.0), dist=240, height=26, seed=seed)
    return dict(stage=(0, 0, 0), heading=0.0, terrain=T, jetty=(6, 4, 0.4))


def desert(sc, seed=7):
    rnd = random.Random(seed)
    T = N.Terrain(path=[(-40, 0), (40, 0)], path_w=2.0, hills=2.0, flat=[(0, 0, 6)], seed=seed)
    T.build(M.ground("sand"))
    bark = M.bark("palmbark", (0.15, 0.1, 0.06), (0.35, 0.25, 0.15))
    leaf = M.leaves("palmleaf", (0.05, 0.12, 0.03), (0.2, 0.3, 0.08))
    for i in range(5):
        x, y = rnd.uniform(-14, 14), rnd.uniform(6, 20)
        N.palm(f"palm{i}", (x, y), rnd.uniform(5, 8), bark, leaf, i, T.height(x, y))
    rk = M.stone("rock", (0.3, 0.2, 0.12), (0.55, 0.4, 0.26), blocks=False)
    for i in range(12):
        x, y = rnd.uniform(-25, 25), rnd.uniform(-4, 30)
        N.rock(f"rock{i}", (x, y), rnd.uniform(0.4, 1.4), rk, seed + i, T.height(x, y))
    N.far_hills("mesa", M.varied("mesamat", (0.35, 0.18, 0.1), (0.55, 0.32, 0.18), 0.05, 0.9, 0.0), dist=150, height=30, seed=seed)
    return dict(stage=(0, 0, 0), heading=0.0, terrain=T)


RECIPES = dict(village=village, street=street, forest=forest, field=field, interior=interior, shore=shore, desert=desert)
