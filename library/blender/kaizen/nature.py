"""Kaizen Clips nature kit: terrain with a worn path, conifers, broadleaf trees, bushes, rocks, grass tufts, far hills.
Everything is procedural, seeded (same seed = same set, so plates can be re-rendered and cached), and light on
geometry so CPU renders stay fast.
"""
import math
import random

import bmesh
import bpy  # noqa: I001
import numpy as np
from mathutils import Matrix, Vector, noise

from . import core


def mesh_obj(name, bm, mats):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for mt in mats:
        me.materials.append(mt)
    for p in me.polygons:
        p.use_smooth = True
    return core.link(bpy.data.objects.new(name, me))


class Terrain:
    """ground with gentle noise hills, kept flat along a path polyline (where characters walk) and around `flat` spots.
    height(x, y) gives the ground z anywhere, so props and the 2D cast stand on it."""

    def __init__(self, path=None, size=(120, 160), center=(0, 30), hills=0.6, flat=(), path_w=1.6, seed=1):
        self.path = [Vector((*p, 0)) for p in (path or [])]
        self.size, self.center, self.hills, self.flat, self.path_w, self.seed = size, center, hills, flat, path_w, seed

    def lateral(self, x, y):
        """signed-free distance to the path centre line (inf without a path)"""
        if len(self.path) < 2:
            return 1e9
        p = Vector((x, y, 0))
        best = 1e9
        for a, b in zip(self.path[:-1], self.path[1:]):
            ab = b - a
            t = max(0.0, min(1.0, (p - a).dot(ab) / max(1e-9, ab.length_squared)))
            best = min(best, (a + ab * t - p).length)
        return best

    def height(self, x, y):
        k = min(1.0, max(0.0, (self.lateral(x, y) - self.path_w) / 4.0))
        for fx, fy, fr in self.flat:
            d = math.hypot(x - fx, y - fy)
            k *= min(1.0, max(0.0, (d - fr) / 3.0))
        far = min(1.0, max(0.0, (math.hypot(x - self.center[0], y - self.center[1] + 30) - 25) / 40))
        h = self.hills * (0.35 * noise.noise(Vector((x * 0.08, y * 0.08, self.seed))) + 0.08 * noise.noise(Vector((x * 0.5, y * 0.5, self.seed + 2))))
        return k * (h + far * self.hills * 3.0 * max(0.0, noise.noise(Vector((x * 0.03, y * 0.03, self.seed + 5)))))

    def build(self, mat, res=240):
        bpy.ops.mesh.primitive_grid_add(x_subdivisions=res, y_subdivisions=res, size=1)
        o = bpy.context.object
        o.name = "ground"
        me = o.data
        n = len(me.vertices)
        co = np.empty(n * 3)
        me.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3)
        # denser near the action (around y = 0..20), coarser far away
        u = co[:, 1] + 0.5
        co[:, 1] = self.center[1] - self.size[1] * 0.25 + self.size[1] * u ** 1.5
        xs = co[:, 0] * 2
        co[:, 0] = self.center[0] + self.size[0] / 2 * np.sign(xs) * np.abs(xs) ** 1.3
        lat = np.array([self.lateral(x, y) for x, y in co[:, :2]])
        for i in range(n):
            co[i, 2] = self.height(co[i, 0], co[i, 1])
        me.vertices.foreach_set("co", co.ravel())
        at = me.attributes.new("path", "FLOAT", "POINT")
        at.data.foreach_set("value", np.clip(lat, 0, 50))
        me.update()
        me.materials.append(mat)
        core.smooth(o)
        return core.tag(o, "ground")


def _cone(bm, r1, r2, depth, M, segs=12, mat=0):
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r1, radius2=r2, depth=depth, matrix=M)
    for f in {f for v in res["verts"] for f in v.link_faces}:
        f.material_index = mat
    return res["verts"]


def _blob(bm, center, rad, squash, seed, mat=1, sub=2, rough=0.35):
    res = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0, matrix=Matrix.Translation(center) @ Matrix.Diagonal((rad, rad, rad * squash, 1)))
    for v in res["verts"]:
        v.co += (v.co - Vector(center)).normalized() * rad * rough * noise.noise(v.co * 0.9 + Vector((seed, seed * 0.3, 0)))
    for f in {f for v in res["verts"] for f in v.link_faces}:
        f.material_index = mat


def conifer(name, loc, h, bark, needles, seed, z=0.0, snow_tiers=False):
    """a spruce/fir: stacked jagged tiers on a thin trunk"""
    r = random.Random(seed)
    bm = bmesh.new()
    tiers = max(6, int(h * 1.6))
    for t in range(tiers):
        z0 = h * (0.12 + 0.82 * t / tiers)
        rad = (h * 0.3 * (1 - t / tiers) + 0.08) * r.uniform(0.8, 1.15)
        vs = _cone(bm, rad, 0.02, h * 0.18, Matrix.Translation((r.uniform(-0.04, 0.04), r.uniform(-0.04, 0.04), z0 + h * 0.09)), segs=24, mat=1)
        zb = min(v.co.z for v in vs)
        for v in vs:
            if abs(v.co.z - zb) < 0.03 and v.co.xy.length > 0.03:
                k = r.uniform(0.6, 1.3)
                v.co.x *= k
                v.co.y *= k
                v.co.z -= r.uniform(0.0, 0.2) * rad
    _cone(bm, 0.12 * h / 8 + 0.05, 0.02, h, Matrix.Translation((0, 0, h / 2)), segs=8, mat=0)
    o = mesh_obj(name, bm, [bark, needles])
    o.location = (loc[0], loc[1], z - 0.05)
    o.rotation_euler[2] = r.uniform(0, 6.3)
    return core.tag(o, "tree")


def broadleaf(name, loc, h, bark, leaf, seed, z=0.0, spread=1.0, bare=False):
    """an oak/elm-like tree: a lofted trunk that forks into limbs, and clumped leafy blobs (or bare winter limbs)"""
    r = random.Random(seed)
    bm = bmesh.new()
    trunk_h = h * r.uniform(0.35, 0.45)
    tr = 0.06 * h + 0.08
    _cone(bm, tr * 1.25, tr * 0.8, trunk_h, Matrix.Translation((0, 0, trunk_h / 2)), segs=12, mat=0)
    tops = []
    for i in range(r.randint(3, 5)):
        a = r.uniform(0, 2 * math.pi)
        tilt = r.uniform(25, 50)
        ln_ = h * r.uniform(0.35, 0.5)
        M = Matrix.Translation((0, 0, trunk_h * 0.92)) @ Matrix.Rotation(a, 4, "Z") @ Matrix.Rotation(math.radians(tilt), 4, "Y")
        _cone(bm, tr * 0.6, tr * 0.2, ln_, M @ Matrix.Translation((0, 0, ln_ / 2)), segs=8, mat=0)
        tops.append(M @ Vector((0, 0, ln_)))
    if not bare:
        cr = h * 0.26 * spread
        for i, tp in enumerate(tops):
            _blob(bm, tp, cr * r.uniform(0.8, 1.15), 0.75, seed + i)
        _blob(bm, (0, 0, trunk_h + h * 0.38), cr * 1.2, 0.8, seed + 9)
    o = mesh_obj(name, bm, [bark, leaf])
    o.location = (loc[0], loc[1], z - 0.05)
    o.rotation_euler[2] = r.uniform(0, 6.3)
    return core.tag(o, "tree")


def palm(name, loc, h, bark, leaf, seed, z=0.0):
    r = random.Random(seed)
    bm = bmesh.new()
    lean = r.uniform(-0.25, 0.25)
    n = 10
    for i in range(n):
        z0 = h * i / n
        _cone(bm, 0.18 - 0.07 * i / n, 0.16 - 0.07 * i / n, h / n * 1.05, Matrix.Translation((lean * z0 * z0 / h, 0, z0 + h / n / 2)), segs=8, mat=0)
    top = Vector((lean * h, 0, h))
    for k in range(9):
        a = 2 * math.pi * k / 9 + r.uniform(-0.2, 0.2)
        M = Matrix.Translation(top) @ Matrix.Rotation(a, 4, "Z") @ Matrix.Rotation(math.radians(r.uniform(70, 110)), 4, "Y") @ Matrix.Diagonal((0.12, 0.6, 1.0, 1))
        _cone(bm, 1.0, 0.1, h * 0.35, M @ Matrix.Translation((0, 0, h * 0.17)), segs=4, mat=1)
    o = mesh_obj(name, bm, [bark, leaf])
    o.location = (loc[0], loc[1], z - 0.05)
    return core.tag(o, "tree")


def bush(name, loc, s, leaf, seed, z=0.0):
    bm = bmesh.new()
    r = random.Random(seed)
    for i in range(r.randint(3, 5)):
        _blob(bm, (r.uniform(-0.4, 0.4) * s, r.uniform(-0.4, 0.4) * s, s * 0.45), s * r.uniform(0.45, 0.65), 0.7, seed + i, mat=0, sub=2)
    o = mesh_obj(name, bm, [leaf])
    o.location = (loc[0], loc[1], z - 0.05)
    return core.tag(o, "bush")


def rock(name, loc, s, mat, seed, z=0.0):
    bm = bmesh.new()
    _blob(bm, (0, 0, s * 0.3), s, 0.6, seed, mat=0, sub=2, rough=0.45)
    o = mesh_obj(name, bm, [mat])
    o.location = (loc[0], loc[1], z - s * 0.15)
    o.rotation_euler[2] = seed
    return core.tag(o, "rock")


def grass_tufts(name, terrain, area, n, mat, seed, avoid=lambda x, y: False, hs=(0.15, 0.4)):
    """many small blade fans in one mesh (cheap): area = (x0, x1, y0, y1)"""
    r = random.Random(seed)
    bm = bmesh.new()
    for _ in range(n):
        x, y = r.uniform(area[0], area[1]), r.uniform(area[2], area[3])
        if avoid(x, y):
            continue
        z = terrain.height(x, y) if terrain else 0.0
        hgt = r.uniform(*hs)
        for b in range(5):
            a = r.uniform(0, 2 * math.pi)
            lean = r.uniform(0.1, 0.4)
            v0 = bm.verts.new((x + math.cos(a + 1.57) * 0.015, y + math.sin(a + 1.57) * 0.015, z))
            v1 = bm.verts.new((x - math.cos(a + 1.57) * 0.015, y - math.sin(a + 1.57) * 0.015, z))
            v2 = bm.verts.new((x + math.cos(a) * lean * hgt, y + math.sin(a) * lean * hgt, z + hgt))
            bm.faces.new((v0, v1, v2))
    o = mesh_obj(name, bm, [mat])
    return core.tag(o, "grass")


def far_hills(name, mat, dist=90.0, height=14.0, width=260.0, seed=3, y_dir=1, heading=0.0):
    """a soft range of hills/mountains on the horizon (the sky haze makes them recede)"""
    bm = bmesh.new()
    n = 120
    top, bot = [], []
    for i in range(n + 1):
        x = -width / 2 + width * i / n
        hgt = height * (0.55 + 0.45 * noise.noise(Vector((x * 0.015, seed, 0)))) + height * 0.25 * noise.noise(Vector((x * 0.06, seed + 1, 0)))
        top.append(bm.verts.new((x, y_dir * dist, max(1.0, hgt))))
        bot.append(bm.verts.new((x, y_dir * dist, -2.0)))
    for i in range(n):
        bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
    o = mesh_obj(name, bm, [mat])
    o.rotation_euler[2] = -math.radians(heading)   # heading 0 = the range lies ahead along +y, 90 = along +x
    return core.tag(o, "backdrop")
