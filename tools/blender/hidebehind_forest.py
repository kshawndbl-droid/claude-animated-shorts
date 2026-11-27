# 3D sets for "The Hidebehind" (American logging-camp folklore, c. 1900): real lit Blender sets (EEVEE), NO characters;
# the flat 2D cast is drawn in Remotion on top through the same camera (cam.json per frame).
# Set: a cold northern pine forest at night. A narrow dirt-and-snow logging trail (sled ruts, patchy thin snow, needles)
# comes out of the dark, bends near the camera and crosses the frame; tall straight dark trunks in rows fading into
# ground mist, low spruces, stumps with axe-cut wedge tops, felled logs and a log pile; cold blue moonlight from high
# behind (rim light on the trunks, long shadows on the snow) and the faint warm glow of the camp far down the trail.
#
# TRAIL (world coords, ground z = 0 on the trail; walkers at z ~ 0.03):
#   centre polyline = TRAIL below (Catmull-Rom smoothed). Near the chartest camera it crosses the frame left-to-right:
#   C0 = [0.0, 3.5], D = [0.9846, -0.1748] (normalised tangent, walking left -> right on screen, toward +x),
#   RT = [-0.1748, -0.9846] (walker's right = toward the camera). Straight enough for dd = -2.5 .. +2.5 m; the trail is
#   ~2.4 m wide (dark mud with two sled ruts at |s| ~ 0.42 m), so keep walkers within s = -0.8 .. +0.8.
#   Far away (x ~ -3, y 8 .. 60) it runs into the dark along +y to the camp glow at CAMP.
#   HIDE tree trunk (good for something peeking out): HIDE = (2.1, 5.6), radius 0.38 (flare to ~0.6 at the base),
#   2.3 m behind the trail centre, ~6 m from the camera, centre-right in frame; a peek point ~ (2.1, 5.6, 1.6).
# usage: .venv-bpy/bin/python tools/blender/hidebehind_forest.py -- --shot chartest --out out/hidebehind/sets/chartest/ [--res 720]
import json
import math
import os
import random
import sys

import bpy  # noqa: I001  (bpy must come first: it registers bmesh/mathutils)
import bmesh
import numpy as np
from mathutils import Matrix, Vector, noise

sys.path.insert(0, os.path.dirname(__file__))
import test_scene as ts  # noqa: E402

arg = ts.arg
rnd = random.Random(1900)

SHOTS = {
    # character test plate: still camera 1.5 m up beside the trail bend; walkers cross the frame ~3.8 m away, the trail
    # runs off behind them into the dark toward the camp glow
    "chartest": dict(n=1, keys=[(1, (0.3, -0.4, 1.5), (-0.7, 12.0, 1.25), 22)], focus=(0.0, 3.5, 0.9), fstop=4.0),
}
SHOT = arg("--shot", "chartest")
TRAIL = [(9.0, 2.6), (5.0, 2.95), (2.0, 3.3), (0.0, 3.5), (-1.3, 3.9), (-2.4, 5.0), (-3.0, 7.0), (-3.2, 10.0),
         (-2.8, 15.0), (-3.4, 22.0), (-2.6, 32.0), (-3.0, 45.0), (-2.2, 60.0), (-2.0, 80.0)]
HIDE = (2.1, 5.6)
CAMP = (-2.4, 58.0)
CAM_XY = (0.3, -0.4)


# ------------------------------------------------------------------ trail geometry
def _catmull(pts, k=24):
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = (np.array(q, float) for q in p[i - 1:i + 3])
        for t in np.linspace(0, 1, k, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(np.array(pts[-1], float))
    return np.array(out)


TP = _catmull(TRAIL)


def lateral(xy):
    """signed distance (m) of points (N,2) from the trail centre line (+ = left of travel toward -x/+y, i.e. away from camera)"""
    xy = np.atleast_2d(np.asarray(xy, float))
    a, b = TP[:-1], TP[1:]
    ab = b - a
    L2 = (ab ** 2).sum(1)
    res = np.empty(len(xy))
    for s in range(0, len(xy), 4000):
        q = xy[s:s + 4000, None, :]
        t = np.clip(((q - a) * ab).sum(2) / L2, 0, 1)
        pr = a + t[..., None] * ab
        d2 = ((q - pr) ** 2).sum(2)
        j = d2.argmin(1)
        r = np.arange(len(j))
        cr = ab[j, 0] * (q[r, 0, 1] - a[j, 1]) - ab[j, 1] * (q[r, 0, 0] - a[j, 0])
        res[s:s + 4000] = np.sqrt(d2[r, j]) * np.sign(cr + 1e-9)
    return res


def ground_z(x, y, lat=None):
    if lat is None:
        lat = lateral([(x, y)])[0]
    k = min(1.0, max(0.0, (abs(lat) - 1.0) / 2.5))
    h = 0.22 * noise.noise(Vector((x * 0.13, y * 0.13, 0.5))) + 0.06 * noise.noise(Vector((x * 0.6, y * 0.6, 2.0)))
    return k * (h + 0.08)


# ------------------------------------------------------------------ materials
def _noise(nd, ln, vec, scale, detail=6.0, rough=0.55):
    no = nd.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = scale
    no.inputs["Detail"].default_value = detail
    no.inputs["Roughness"].default_value = rough
    if vec is not None:
        ln.new(vec, no.inputs["Vector"])
    return no


def _ramp(nd, ln, fac, c0, c1, p0=0.0, p1=1.0):
    r = nd.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position, r.color_ramp.elements[1].position = p0, p1
    r.color_ramp.elements[0].color = (*c0, 1) if len(c0) == 3 else c0
    r.color_ramp.elements[1].color = (*c1, 1) if len(c1) == 3 else c1
    ln.new(fac, r.inputs[0])
    return r


def _mix(nd, ln, fac, a, b, blend="MIX"):
    m = nd.new("ShaderNodeMix")
    m.data_type, m.blend_type = "RGBA", blend
    for sock, v in ((0, fac), (6, a), (7, b)):
        if isinstance(v, (int, float)):
            m.inputs[sock].default_value = v
        elif isinstance(v, tuple):
            m.inputs[sock].default_value = (*v, 1)
        else:
            ln.new(v, m.inputs[sock])
    return m


def _math(nd, ln, op, a, b=None, clamp=True):
    m = nd.new("ShaderNodeMath")
    m.operation, m.use_clamp = op, clamp
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            ln.new(v, m.inputs[i])
    return m


def _maprange(nd, ln, v, a, b, c=0.0, d=1.0):
    m = nd.new("ShaderNodeMapRange")
    m.interpolation_type = "SMOOTHSTEP"
    ln.new(v, m.inputs[0])
    m.inputs[1].default_value, m.inputs[2].default_value = a, b
    m.inputs[3].default_value, m.inputs[4].default_value = c, d
    return m


SNOW = (0.5, 0.56, 0.66)


def _snow_on_top(nd, ln, col, amount=1.0, scale=3.0):
    """dust snow on upward-facing surfaces, broken up by noise"""
    geo = nd.new("ShaderNodeNewGeometry")
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(geo.outputs["Normal"], sep.inputs[0])
    up = _maprange(nd, ln, sep.outputs[2], 0.55, 0.9)
    tc = nd.new("ShaderNodeTexCoord")
    nz = _noise(nd, ln, tc.outputs["Object"], scale, 4.0)
    br = _maprange(nd, ln, nz.outputs["Fac"], 0.42, 0.58)
    f = _math(nd, ln, "MULTIPLY", up.outputs[0], br.outputs[0])
    f = _math(nd, ln, "MULTIPLY", f.outputs[0], amount)
    return _mix(nd, ln, f.outputs[0], col, SNOW).outputs[2], f.outputs[0]


def bark_mat(name, dark, light, snow=0.0, stretch=0.12):
    m, nd, ln, bs = ts.new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 1.0, stretch)
    ln.new(tc.outputs["Object"], mp.inputs[0])
    vo = nd.new("ShaderNodeTexVoronoi")
    vo.feature = "DISTANCE_TO_EDGE"
    vo.inputs["Scale"].default_value = 9.0
    ln.new(mp.outputs[0], vo.inputs["Vector"])
    no = _noise(nd, ln, mp.outputs[0], 14.0, 10.0, 0.6)
    plates = _maprange(nd, ln, vo.outputs["Distance"], 0.0, 0.12)
    h = _math(nd, ln, "MULTIPLY", plates.outputs[0], no.outputs["Fac"])
    col = _ramp(nd, ln, h.outputs[0], dark, light, 0.05, 0.6)
    lich = _noise(nd, ln, tc.outputs["Object"], 2.2, 5.0)
    lm = _maprange(nd, ln, lich.outputs["Fac"], 0.6, 0.72, 0.0, 0.35)
    c = _mix(nd, ln, lm.outputs[0], col.outputs[0], (0.11, 0.12, 0.1)).outputs[2]
    if snow:
        c, _ = _snow_on_top(nd, ln, c, snow)
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.92
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.9
    bp.inputs["Distance"].default_value = 0.04
    ln.new(h.outputs[0], bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])
    return m


def endgrain_mat():
    m, nd, ln, bs = ts.new_mat("endgrain")
    tc = nd.new("ShaderNodeTexCoord")
    wv = nd.new("ShaderNodeTexWave")
    wv.wave_type = "RINGS"
    wv.inputs["Scale"].default_value = 3.0
    wv.inputs["Distortion"].default_value = 3.0
    ln.new(tc.outputs["Object"], wv.inputs["Vector"])
    col = _ramp(nd, ln, wv.outputs["Fac"], (0.16, 0.11, 0.07), (0.27, 0.2, 0.13))
    c, _ = _snow_on_top(nd, ln, col.outputs[0], 0.8, 6.0)
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.85
    return m


def needle_mat(name, snow=0.7):
    m, nd, ln, bs = ts.new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    no = _noise(nd, ln, tc.outputs["Object"], 18.0, 8.0, 0.7)
    col = _ramp(nd, ln, no.outputs["Fac"], (0.006, 0.012, 0.009), (0.025, 0.04, 0.028), 0.3, 0.75)
    c, _ = _snow_on_top(nd, ln, col.outputs[0], snow, 5.0)
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.8
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 1.0
    ln.new(no.outputs["Fac"], bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])
    return m


def ground_mat():
    """forest floor of needles and dark earth, a churned mud trail with sled ruts, patchy thin snow everywhere"""
    m, nd, ln, bs = ts.new_mat("ground")
    tc = nd.new("ShaderNodeTexCoord")
    at = nd.new("ShaderNodeAttribute")
    at.attribute_name = "lat"
    a = _math(nd, ln, "ABSOLUTE", at.outputs["Fac"], clamp=False)
    trail = _maprange(nd, ln, a.outputs[0], 1.25, 0.6)
    ru = _math(nd, ln, "SUBTRACT", a.outputs[0], 0.42, clamp=False)
    ru = _math(nd, ln, "ABSOLUTE", ru.outputs[0], clamp=False)
    rut = _maprange(nd, ln, ru.outputs[0], 0.2, 0.07)
    rut = _math(nd, ln, "MULTIPLY", rut.outputs[0], trail.outputs[0])
    # floor: needles (fine) over earth (coarse)
    fine = _noise(nd, ln, tc.outputs["Object"], 60.0, 6.0, 0.7)
    coarse = _noise(nd, ln, tc.outputs["Object"], 1.5, 6.0)
    floor = _ramp(nd, ln, coarse.outputs["Fac"], (0.018, 0.013, 0.009), (0.06, 0.042, 0.026), 0.3, 0.7)
    floor = _mix(nd, ln, fine.outputs["Fac"], floor.outputs[0], (0.09, 0.06, 0.035), "OVERLAY")
    mud = _ramp(nd, ln, coarse.outputs["Fac"], (0.03, 0.024, 0.02), (0.075, 0.06, 0.048), 0.35, 0.7)
    c = _mix(nd, ln, trail.outputs[0], floor.outputs[2], mud.outputs[0]).outputs[2]
    c = _mix(nd, ln, _math(nd, ln, "MULTIPLY", rut.outputs[0], 0.8).outputs[0], c, (0.018, 0.015, 0.013)).outputs[2]
    # patchy snow: big patches off the trail, a trodden grey crust on the trail, none in the ruts
    sn = _noise(nd, ln, tc.outputs["Object"], 0.55, 8.0, 0.62)
    sn2 = _noise(nd, ln, tc.outputs["Object"], 7.0, 4.0)
    s = _math(nd, ln, "ADD", sn.outputs["Fac"], _math(nd, ln, "MULTIPLY", sn2.outputs["Fac"], 0.25, clamp=False).outputs[0], clamp=False)
    snow = _maprange(nd, ln, s.outputs[0], 0.59, 0.66)
    tr_snow = _maprange(nd, ln, s.outputs[0], 0.66, 0.72, 0.0, 0.55)
    s_all = _mix(nd, ln, trail.outputs[0], snow.outputs[0], tr_snow.outputs[0])
    s_all = _math(nd, ln, "MULTIPLY", s_all.outputs[2], _math(nd, ln, "SUBTRACT", 1.0, rut.outputs[0]).outputs[0])
    snowcol = _mix(nd, ln, trail.outputs[0], SNOW, (0.24, 0.25, 0.28)).outputs[2]
    c = _mix(nd, ln, s_all.outputs[0], c, snowcol).outputs[2]
    ln.new(c, bs.inputs["Base Color"])
    rgh = _math(nd, ln, "MULTIPLY", s_all.outputs[0], -0.35, clamp=False)
    rgh = _math(nd, ln, "ADD", rgh.outputs[0], 0.95)
    ln.new(rgh.outputs[0], bs.inputs["Roughness"])
    # bump: needle litter + snow crust edges + rut troughs
    hgt = _math(nd, ln, "MULTIPLY", fine.outputs["Fac"], 0.5)
    hgt = _math(nd, ln, "ADD", hgt.outputs[0], _math(nd, ln, "MULTIPLY", s_all.outputs[0], 0.6).outputs[0])
    hgt = _math(nd, ln, "SUBTRACT", hgt.outputs[0], _math(nd, ln, "MULTIPLY", rut.outputs[0], 0.6).outputs[0], clamp=False)
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.6
    bp.inputs["Distance"].default_value = 0.05
    ln.new(hgt.outputs[0], bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])
    return m


# ------------------------------------------------------------------ geometry
def mesh_obj(name, bm, mats):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for mt in mats:
        me.materials.append(mt)
    for p in me.polygons:
        p.use_smooth = True
    return ts.link(bpy.data.objects.new(name, me))


def ground(mat):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=280, y_subdivisions=330, size=1)
    o = bpy.context.object
    o.name = "ground"
    me = o.data
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    # denser near the camera: remap y in [-0.5,0.5] -> [-6, 95] quadratically
    u = co[:, 1] + 0.5
    co[:, 1] = -6 + 101 * u ** 1.7
    co[:, 0] = co[:, 0] * 56
    lat = lateral(co[:, :2])
    for i in range(n):
        co[i, 2] = ground_z(co[i, 0], co[i, 1], lat[i])
    me.vertices.foreach_set("co", co.ravel())
    at = me.attributes.new("lat", "FLOAT", "POINT")
    at.data.foreach_set("value", np.clip(lat, -5, 5))
    me.update()
    me.materials.append(mat)
    ts.smooth(o)
    return o


def _cone(bm, r1, r2, depth, M, segs=14, mat=0):
    res = bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r1, radius2=r2, depth=depth, matrix=M)
    vs = set(res["verts"])
    for f in {f for v in vs for f in v.link_faces}:
        f.material_index = mat
    return res["verts"]


def tree_mesh(name, h, seed, bark, needles, canopy=True):
    """a tall straight conifer, unit trunk radius 1 at breast height -> scaled per instance in x/y by the radius"""
    r = random.Random(seed)
    bm = bmesh.new()
    # lofted trunk: root flare that blends into a slowly tapering, slightly lumpy shaft
    segs, zs = 20, [-0.4, 0.0, 0.15, 0.35, 0.6, 1.0, 1.6, 2.5, 4.0, 6.0, 9.0, 13.0, 18.0, h * 0.85, h]
    rings = []
    for z in zs:
        rz = 1.0 - 0.75 * max(0.0, z - 1.3) / h
        ring = []
        for k in range(segs):
            a = 2 * math.pi * k / segs
            fl = 0.55 * math.exp(-max(z, 0) / 0.35) * (0.6 + 0.4 * abs(math.sin(2.5 * a + seed)))  # buttress roots
            lump = 0.05 * math.sin(3 * a + seed) + 0.05 * noise.noise(Vector((math.cos(a) * 2, math.sin(a) * 2, z * 0.5 + seed)))
            rr = rz * (1 + fl + lump)
            ring.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, z)))
        rings.append(ring)
    for r0, r1 in zip(rings[:-1], rings[1:]):
        for k in range(segs):
            bm.faces.new((r0[k], r0[(k + 1) % segs], r1[(k + 1) % segs], r1[k]))
    bm.faces.new(rings[-1])
    # dead branch stubs on the lower trunk (dense forest self-prunes), drooping
    for i in range(r.randint(8, 14)):
        z = r.uniform(2.2, h * 0.62)
        a = r.uniform(0, 2 * math.pi)
        ln_ = r.uniform(0.5, 1.6) * (1.2 - z / h)
        rr = 1.0 * (1 - 0.78 * (z + 0.4) / h)
        M = Matrix.Translation((math.cos(a) * rr, math.sin(a) * rr, z)) @ Matrix.Rotation(a, 4, "Z") @ \
            Matrix.Rotation(math.radians(r.uniform(95, 120)), 4, "Y") @ Matrix.Translation((0, 0, ln_ / 2))
        # stubs are in trunk-radius units too; they get scaled with x/y, keep them thin
        _cone(bm, 0.09, 0.015, ln_, M, segs=5)
    if canopy:
        for i in range(r.randint(5, 8)):
            z = r.uniform(h * 0.6, h * 0.97)
            a = r.uniform(0, 2 * math.pi)
            off = r.uniform(0.0, 1.5) * (1 - z / h) * 4
            s = (1 - z / h) * 9 + 1.2
            res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0,
                                             matrix=Matrix.Translation((math.cos(a) * off, math.sin(a) * off, z)) @ Matrix.Diagonal((s, s, s * 0.55, 1)))
            for v in res["verts"]:
                d = noise.noise(v.co * 0.6 + Vector((seed, 0, 0)))
                v.co.x += (v.co.x - math.cos(a) * off) * d * 0.4
                v.co.y += (v.co.y - math.sin(a) * off) * d * 0.4
            for f in {f for v in res["verts"] for f in v.link_faces}:
                f.material_index = 1
    return mesh_obj(name, bm, [bark, needles])


def spruce(name, loc, hgt, needles, bark, seed):
    """a low young spruce: jagged stacked tiers"""
    r = random.Random(seed)
    bm = bmesh.new()
    tiers = 11
    for t in range(tiers):
        z0 = hgt * (0.06 + 0.88 * t / tiers)
        rad = (hgt * 0.4 * (1 - t / tiers) + 0.06) * r.uniform(0.75, 1.15)
        M = Matrix.Translation((r.uniform(-0.04, 0.04), r.uniform(-0.04, 0.04), z0 + hgt * 0.1)) @ Matrix.Rotation(r.uniform(-0.12, 0.12), 4, "X")
        vs = _cone(bm, rad, 0.015, hgt * 0.2, M, segs=34, mat=1)
        zb = min(v.co.z for v in vs)
        for v in vs:
            if abs(v.co.z - zb) < 0.03 and v.co.xy.length > 0.03:
                k = r.uniform(0.45, 1.35) if r.random() < 0.5 else r.uniform(0.85, 1.1)
                v.co.x *= k
                v.co.y *= k
                v.co.z -= r.uniform(0.0, 0.25) * rad
            v.co += Vector((noise.noise(v.co * 3 + Vector((seed, 0, 0))), noise.noise(v.co * 3 + Vector((0, seed, 0))), 0)) * 0.06
    _cone(bm, 0.05, 0.01, hgt, Matrix.Translation((0, 0, hgt / 2)), segs=6, mat=0)
    o = mesh_obj(name, bm, [bark, needles])
    o.location = (loc[0], loc[1], ground_z(*loc) - 0.05)
    o.rotation_euler[2] = r.uniform(0, 6.3)
    return o


def stump(name, loc, rad, h, bark, grain, seed):
    """a felled-tree stump: the axe-cut wedge top (chopped from two sides) and a little root flare"""
    r = random.Random(seed)
    bm = bmesh.new()
    _cone(bm, rad, rad * 0.92, h + 0.6, Matrix.Translation((0, 0, (h + 0.6) / 2 - 0.5)), segs=20)
    _cone(bm, rad * 1.35, rad, 0.35, Matrix.Translation((0, 0, -0.05)), segs=20)
    a = r.uniform(0, math.pi)
    for sgn in (1, -1):
        n = Vector((math.cos(a) * sgn * 0.5, math.sin(a) * sgn * 0.5, 1)).normalized()
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, h), plane_no=n, clear_outer=True)
        edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        if edges:
            fr = bmesh.ops.holes_fill(bm, edges=edges)
            for f in fr["faces"]:
                f.material_index = 1
    o = mesh_obj(name, bm, [bark, grain])
    o.location = (loc[0], loc[1], ground_z(*loc))
    return o


def log(name, p0, p1, rad, bark, grain):
    """a felled, limbed log lying on the ground between two xy points"""
    a, b = Vector((*p0, 0)), Vector((*p1, 0))
    ln_ = (b - a).length
    bm = bmesh.new()
    _cone(bm, rad, rad * 0.85, ln_, Matrix(), segs=20)
    for f in bm.faces:
        if abs(f.normal.z) > 0.95:
            f.material_index = 1
    for v in bm.verts:
        v.co.x += 0.015 * noise.noise(v.co * 4)
    o = mesh_obj(name, bm, [bark, grain])
    mid = (a + b) / 2
    z = max(ground_z(a.x, a.y), ground_z(b.x, b.y), ground_z(mid.x, mid.y))
    o.location = (mid.x, mid.y, z + rad * 0.85)
    d = (b - a).normalized()
    o.rotation_euler = (0, math.radians(90), math.atan2(d.y, d.x))
    return o


def cam_rel(lat, depth):
    """world xy of a point `depth` m ahead of the chartest camera and `lat` m to its right"""
    c, l = SHOTS["chartest"]["keys"][0][1], SHOTS["chartest"]["keys"][0][2]
    f = Vector((l[0] - c[0], l[1] - c[1])).normalized()
    rt = Vector((f.y, -f.x))
    p = Vector(c[:2]) + f * depth + rt * lat
    return (p.x, p.y)


def forest(bark, bark2, needles):
    variants = [tree_mesh(f"tree{i}", rnd.uniform(24, 32), i * 7 + 3, bark if i % 2 else bark2, needles) for i in range(6)]
    for v in variants:
        v.hide_render = True
        v.hide_viewport = True
    placed = []

    def put(x, y, rad, var=None):
        v = variants[var if var is not None else rnd.randrange(len(variants))]
        o = ts.link(bpy.data.objects.new("trunk", v.data))
        o.location = (x, y, ground_z(x, y) - 0.15)
        s = rad
        o.scale = (s, s, rnd.uniform(0.85, 1.1))
        o.rotation_euler = (rnd.uniform(-0.012, 0.012), rnd.uniform(-0.012, 0.012), rnd.uniform(0, 6.3))
        placed.append((x, y, rad))
        return o

    # hero trunks: the hide tree, and big foreground trunks cutting the frame edges
    put(*HIDE, 0.38, 0)
    put(*cam_rel(-1.25, 1.7), 0.33, 1)
    put(*cam_rel(1.45, 2.4), 0.42, 2)
    put(*cam_rel(-2.6, 6.5), 0.3, 3)
    # the rest: jittered grid, kept off the trail and out of the walkers' strip in front of the camera
    cx, cy = CAM_XY
    pts = []
    for gx in np.arange(-24, 24, 2.3):
        for gy in np.arange(-4, 92, 2.3):
            x, y = gx + rnd.uniform(-1.0, 1.0), gy + rnd.uniform(-1.0, 1.0)
            pts.append((x, y))
    lat = lateral(pts)
    for (x, y), la in zip(pts, lat):
        rad = rnd.uniform(0.16, 0.36) if rnd.random() > 0.15 else rnd.uniform(0.36, 0.5)
        if abs(la) < 1.5 + rad:
            continue
        if y < 1.0 and abs(x - cx) < 5:
            continue  # behind / beside the camera
        if math.hypot(x - cx, y - cy) < 7.5 and y < 7:
            continue  # the near clearing (hero trunks handle it)
        if any(math.hypot(x - px, y - py) < 1.0 + pr + rad for px, py, pr in placed):
            continue
        if rnd.random() < 0.12:
            continue
        put(x, y, rad)
    return placed


def scatter_debris(placed, mat, bark):
    """twigs and fallen branches on the floor"""
    for i in range(30):
        x, y = rnd.uniform(-7, 6), rnd.uniform(3.0, 14)
        if abs(lateral([(x, y)])[0]) < 1.0:
            continue
        ln_ = rnd.uniform(0.4, 1.2)
        bm = bmesh.new()
        r0 = rnd.uniform(0.02, 0.04)
        _cone(bm, r0, r0 * 0.3, ln_, Matrix.Translation((0, 0, ln_ / 2)), segs=6)
        for k in range(2):
            l2 = ln_ * rnd.uniform(0.25, 0.45)
            M = Matrix.Translation((0, 0, ln_ * rnd.uniform(0.3, 0.7))) @ Matrix.Rotation(rnd.choice((-1, 1)) * 0.7, 4, "X") @ Matrix.Translation((0, 0, l2 / 2))
            _cone(bm, r0 * 0.4, r0 * 0.1, l2, M, segs=5)
        o = mesh_obj("branch", bm, [bark])
        o.location = (x, y, ground_z(x, y) + r0 * 0.5)
        o.rotation_euler = (math.radians(90), rnd.uniform(-0.3, 0.3), rnd.uniform(0, 6.3))


def lights_world(sc):
    wo = bpy.data.worlds.new("night")
    wo.use_nodes = True
    nt = wo.node_tree
    nd, ln = nt.nodes, nt.links
    bg = nd["Background"]
    # faint sky with a few stars, bluer toward the moon side
    tc = nd.new("ShaderNodeTexCoord")
    vo = nd.new("ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 260.0
    ln.new(tc.outputs["Generated"], vo.inputs["Vector"])
    st = _maprange(nd, ln, vo.outputs["Distance"], 0.06, 0.0, 0.0, 1.0)
    sk = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Generated"], sk.inputs[0])
    upm = _maprange(nd, ln, sk.outputs[2], 0.1, 0.6)
    stars = _math(nd, ln, "MULTIPLY", st.outputs[0], upm.outputs[0])
    stars = _math(nd, ln, "MULTIPLY", stars.outputs[0], 0.25, clamp=False)
    base = _mix(nd, ln, upm.outputs[0], (0.006, 0.009, 0.018), (0.003, 0.005, 0.012)).outputs[2]
    col = _math(nd, ln, "ADD", stars.outputs[0], 0.0, clamp=False)
    add = _mix(nd, ln, 1.0, base, (0.0, 0.0, 0.0), "ADD")
    ln.new(stars.outputs[0], add.inputs[7])
    ln.new(add.outputs[2], bg.inputs[0])
    bg.inputs[1].default_value = 1.0
    vol = nd.new("ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = float(arg("--haze", "0.011"))
    vol.inputs["Anisotropy"].default_value = 0.6
    vol.inputs["Color"].default_value = (0.6, 0.68, 0.85, 1)
    ln.new(vol.outputs[0], nd["World Output"].inputs["Volume"])
    sc.world = wo
    _ = col
    # the moon: high, behind and to the right -> rim light on the trunks, long shadows toward camera
    mo = bpy.data.lights.new("moon", "SUN")
    mo.energy, mo.color, mo.angle = float(arg("--moon", "2.4")), (0.55, 0.68, 1.0), math.radians(1.0)
    o = ts.link(bpy.data.objects.new("moon", mo))
    o.rotation_euler = (math.radians(-42), 0, math.radians(-35))  # light travels toward -y (camera) and a bit -x
    # soft cold skylight filtering down through gaps
    fl = bpy.data.lights.new("sky", "AREA")
    fl.shape, fl.size, fl.size_y = "RECTANGLE", 14.0, 14.0
    fl.energy, fl.color = float(arg("--sky", "500")), (0.4, 0.5, 0.85)
    o = ts.link(bpy.data.objects.new("sky", fl))
    o.location = (-0.5, 4.0, 9.0)
    # the camp: warm glow far down the trail, haloed in the mist
    cl = bpy.data.lights.new("camp", "POINT")
    cl.energy, cl.color, cl.shadow_soft_size = 3500, (1.0, 0.45, 0.15), 1.0
    o = ts.link(bpy.data.objects.new("camp", cl))
    o.location = (CAMP[0], CAMP[1], 1.3)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, location=(CAMP[0], CAMP[1] - 0.5, 0.9))
    f = bpy.context.object
    f.data.materials.append(ts.flat_mat("fire", (1.0, 0.45, 0.12), emit=25))
    f.visible_shadow = False


def ground_mist(z0=0.0):
    """a layer of denser mist lying low in the distance (a box volume; the world adds a thin overall haze)"""
    m = bpy.data.materials.new("mist")
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    nd.remove(nd["Principled BSDF"])
    pv = nd.new("ShaderNodeVolumePrincipled")
    tc = nd.new("ShaderNodeTexCoord")
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Generated"], sep.inputs[0])
    hz = _maprange(nd, ln, sep.outputs[2], 0.65, 0.0)  # thick at the ground, thinning smoothly up through eye level
    yz = _maprange(nd, ln, sep.outputs[1], 0.02, 0.3)  # fade in with distance
    no = _noise(nd, ln, tc.outputs["Object"], 0.25, 3.0)
    nz = _maprange(nd, ln, no.outputs["Fac"], 0.35, 0.65, 0.3, 1.0)
    d = _math(nd, ln, "MULTIPLY", hz.outputs[0], yz.outputs[0])
    d = _math(nd, ln, "MULTIPLY", d.outputs[0], nz.outputs[0])
    d = _math(nd, ln, "MULTIPLY", d.outputs[0], float(arg("--mist", "0.16")), clamp=False)
    ln.new(d.outputs[0], pv.inputs["Density"])
    # a little self-light so the far rows stand in silhouette against cold moonlit mist
    em = _math(nd, ln, "MULTIPLY", d.outputs[0], float(arg("--mistglow", "0.4")), clamp=False)
    ln.new(em.outputs[0], pv.inputs["Emission Strength"])
    pv.inputs["Emission Color"].default_value = (0.3, 0.4, 0.65, 1)
    pv.inputs["Color"].default_value = (0.65, 0.72, 0.88, 1)
    pv.inputs["Anisotropy"].default_value = 0.5
    ln.new(pv.outputs[0], nd["Material Output"].inputs["Volume"])
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 4 + 45, 3.0))
    o = bpy.context.object
    o.name = "mistbox"
    o.scale = (60, 90, 6.0)
    o.data.materials.append(m)
    return o


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    lights_world(sc)
    bark = bark_mat("bark", (0.015, 0.012, 0.01), (0.12, 0.1, 0.085))
    bark2 = bark_mat("bark2", (0.013, 0.012, 0.012), (0.1, 0.095, 0.09))
    logbark = bark_mat("logbark", (0.014, 0.011, 0.009), (0.08, 0.064, 0.05), snow=0.9, stretch=0.12)
    grain = endgrain_mat()
    needles = needle_mat("needles", snow=0.35)
    ground(ground_mat())
    placed = forest(bark, bark2, needles)
    # logging: stumps with axe-cut tops, felled logs, a pile of cut logs by the trail
    for i, (x, y, r, h) in enumerate([(-1.9, 6.0, 0.3, 0.55), (3.3, 8.2, 0.36, 0.45), (-5.0, 9.5, 0.28, 0.6),
                                      (1.6, 12.5, 0.32, 0.5), (-0.9, 17.0, 0.3, 0.5), (-6.5, 4.2, 0.35, 0.5), (4.6, 4.4, 0.25, 0.4)]):
        stump(f"stump{i}", (x, y), r, h, logbark, grain, i)
    log("log0", cam_rel(-0.4, 1.9), cam_rel(-2.2, 2.9), 0.17, logbark, grain)
    log("log1", (3.0, 6.6), (6.5, 7.6), 0.27, logbark, grain)
    log("log2", (-6.0, 11.5), (-4.6, 14.5), 0.24, logbark, grain)
    for j, (dx, dz) in enumerate([(0, 0), (0.42, 0), (0.84, 0), (0.21, 0.38), (0.63, 0.38), (0.42, 0.74)]):
        lo = log(f"pile{j}", (-5.4 + dx, 17.5), (-5.4 + dx, 20.5), 0.2, logbark, grain)
        lo.location.z += dz
    for i, (x, y, hh) in enumerate([(-3.9, 6.8, 1.6), (4.6, 9.7, 2.3), (-6.2, 15.5, 2.0), (3.0, 16.0, 1.4),
                                    (-5.3, 11.2, 1.1), (5.6, 6.0, 1.8), (-4.8, 3.0, 1.3)]):
        spruce(f"spruce{i}", (x, y), hh, needles, logbark, i + 40)
    scatter_debris(placed, None, logbark)
    ground_mist()

    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "16"))
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    for k, v in (("volumetric_tile_size", "8"), ("volumetric_end", 90.0), ("volumetric_start", 0.5),
                 ("use_volumetric_shadows", True), ("volumetric_samples", 48)):
        if hasattr(ee, k):
            setattr(ee, k, v)
    if hasattr(ee, "shadow_resolution_scale"):
        ee.shadow_resolution_scale = 1.0
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "1.0"))
    sc.render.image_settings.file_format = "PNG"
    return sc


def shot_camera(sc, name):
    S = SHOTS[name]
    c = ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_width, c.data.clip_start, c.data.clip_end = 36, 0.05, 250
    c.data.dof.use_dof = True
    c.data.dof.aperture_fstop = S["fstop"]
    foc = ts.link(bpy.data.objects.new("focus", None))
    foc.location = S["focus"]
    c.data.dof.focus_object = foc
    aim = ts.link(bpy.data.objects.new("aim", None))
    tc = c.constraints.new("TRACK_TO")
    tc.target, tc.track_axis, tc.up_axis = aim, "TRACK_NEGATIVE_Z", "UP_Y"
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
    out = os.path.abspath(arg("--out", f"out/hidebehind/sets/{SHOT}/"))
    os.makedirs(out, exist_ok=True)
    n = SHOTS[SHOT]["n"]
    cams = {}
    for f in range(1, n + 1):
        sc.frame_set(f)
        cams[f] = {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36}
    json.dump({"shot": SHOT, "frames": cams}, open(os.path.join(out, "cam.json"), "w"))
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
    import time
    a, b = (int(x) for x in arg("--range", f"1-{n}").split("-"))
    for f in range(a, b + 1, int(arg("--step", "1"))):
        p = os.path.join(out, f"f_{f:04d}.png")
        t0 = time.time()
        sc.frame_set(f)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        print("frame", f, round(time.time() - t0, 1), "s", flush=True)
