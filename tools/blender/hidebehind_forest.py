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
#
# STYLE PREVIEW shots pA pB pC pE: per-frame camera (location, aim, lens) + the logger's kerosene lantern (a warm point
# light, flickering) from stories/hidebehind/sets/preview_paths.json (tools/hidebehind_paths.py). Living background:
# the ground fog drifts and boils (animated 4D noise), the spruces, dead lower boughs and canopies sway in the wind
# (geometry-nodes "sway" driven by scene time), and a few far spruces move more than the wind should, once per shot.
# Nothing stands between any shot camera and the logger / lantern / hide tree (sight lines are cleared at build time).
# usage: .venv-bpy/bin/python tools/blender/hidebehind_forest.py -- --shot chartest --out out/hidebehind/sets/chartest/ [--res 720]
#        ... --shot pC --range 1-28            render part of a shot (frames f_0001.png ...)
#        ... --shot pC --fg hide               foreground pass fg_####.png (RGBA): only the hide tree, the rest held out
#        ... --shot pE --fg near               foreground pass: only trees / spruces nearer than 8 m to the camera
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
    "chartest": dict(n=1, keys=[(1, (0.3, -0.4, 1.5), (-0.7, 12.0, 1.25), 22)], focus=(0.0, 3.5, 0.9), fstop=4.0, t0=0.0),
}
TRAIL = [(9.0, 2.6), (5.0, 2.95), (2.0, 3.3), (0.0, 3.5), (-1.3, 3.9), (-2.4, 5.0), (-3.0, 7.0), (-3.2, 10.0),
         (-2.8, 15.0), (-3.4, 22.0), (-2.6, 32.0), (-3.0, 45.0), (-2.2, 60.0), (-2.0, 80.0)]
HIDE = (2.1, 5.6)
CAMP = (-2.4, 58.0)
CAM_XY = (0.3, -0.4)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PATHS = json.load(open(os.path.join(ROOT, "stories", "hidebehind", "sets", "preview_paths.json")))
# preview shots: per-frame keys straight from the shared plan; DOF on the logger (z 0.9), on the hide tree in pC
for _k, _fs in (("pA", 4.0), ("pB", 2.8), ("pC", 2.8), ("pE", 2.8)):
    _P = PATHS[_k]
    SHOTS[_k] = dict(n=_P["n"], t0=_P["t0"], fstop=_fs, mblur=(_k == "pC"),
                     keys=[(i + 1, fr["cam"], fr["look"], fr["lens"]) for i, fr in enumerate(_P["frames"])],
                     focus=[(fr["logger"]["x"], fr["logger"]["y"], 0.9) if fr["logger"] else (HIDE[0], HIDE[1], 1.3) for fr in _P["frames"]],
                     lantern=[fr["lantern"] for fr in _P["frames"]])
SHOT = arg("--shot", "chartest")
# the lantern: warm kerosene point light, small radius, soft shadows, a hard influence cutoff so it lights only a pool
LANTERN = dict(color=(1.0, 0.55, 0.22), radius=0.05, cutoff=float(arg("--lcut", "3.0")), base=float(arg("--lantern", "30")))


def lantern_energy(t, base=None):
    base = LANTERN["base"] if base is None else base
    return base * (0.86 + 0.09 * math.sin(t * 13.1) + 0.05 * math.sin(t * 31.3 + 1))


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
    snow = _maprange(nd, ln, s.outputs[0], 0.62, 0.69, 0.0, 0.85)
    tr_snow = _maprange(nd, ln, s.outputs[0], 0.68, 0.74, 0.0, 0.45)
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
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=380, y_subdivisions=380, size=1)
    o = bpy.context.object
    o.name = "ground"
    me = o.data
    n = len(me.vertices)
    co = np.empty(n * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    # denser near the action: y in [-0.5,0.5] -> [-12, 100], x -> [-48, 48], both finer toward the middle
    u = co[:, 1] + 0.5
    co[:, 1] = -12 + 112 * u ** 1.6
    xs = co[:, 0] * 2
    co[:, 0] = 48 * np.sign(xs) * np.abs(xs) ** 1.4
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
    sw = bm.verts.layers.float.new("sway")  # wind weight (m of sway per m of wind amplitude): trunk 0, boughs > 0
    # lofted trunk: root flare that blends into a slowly tapering, slightly lumpy shaft
    segs, zs = 20, [-0.4, 0.0, 0.15, 0.35, 0.6, 1.0, 1.6, 2.5, 4.0, 6.0, 9.0, 13.0, 18.0, 24.0, h * 0.85, h]
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
    # dead branch stubs on the lower trunk (dense forest self-prunes), drooping; some still carry a ragged flat spray
    # of needles at the tip. Their tips move a little in the wind (weight grows along the stub).
    for i in range(r.randint(10, 18)):
        z = r.uniform(2.0, h * 0.62)
        a = r.uniform(0, 2 * math.pi)
        ln_ = r.uniform(0.6, 2.0) * (1.2 - z / h)
        rr = 1.0 * (1 - 0.75 * max(0.0, z - 1.3) / h)
        M = Matrix.Translation((math.cos(a) * rr, math.sin(a) * rr, z)) @ Matrix.Rotation(a, 4, "Z") @ \
            Matrix.Rotation(math.radians(r.uniform(95, 120)), 4, "Y") @ Matrix.Translation((0, 0, ln_ / 2))
        # stubs are in trunk-radius units too; they get scaled with x/y, keep them thin
        for v in _cone(bm, 0.09, 0.015, ln_, M, segs=5):
            v[sw] = 0.14 * max(0.0, (v.co.xy.length - rr) / ln_) ** 1.5
        if z < 16 and r.random() < 0.4:
            for j in range(r.randint(4, 8)):
                k = r.uniform(0.45, 1.0)
                tip = M @ Vector((0, 0, ln_ * (k - 0.5)))
                cr = r.uniform(0.16, 0.32) * (0.6 + 0.6 * k)
                res = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=cr, matrix=Matrix.Translation(tip + Vector((0, 0, -cr * 0.3)))
                                                 @ Matrix.Rotation(r.uniform(0, 6.3), 4, "Z") @ Matrix.Diagonal((1.0, 0.7, 0.55, 1)))
                for v in res["verts"]:
                    v.co += Vector((noise.noise(v.co * 6 + Vector((seed, i, j))), noise.noise(v.co * 6 + Vector((i, seed, j))),
                                    noise.noise(v.co * 6 + Vector((j, i, seed))))) * cr * 0.6
                    v[sw] = 0.14 * k + 0.06
                for f in {f for v in res["verts"] for f in v.link_faces}:
                    f.material_index = 1
    if canopy:
        for i in range(r.randint(3, 5)):
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
                v[sw] = 1.0
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
    sw = bm.verts.layers.float.new("sway")
    for v in bm.verts:  # the whole little tree bends from the ground; tier tips flutter a bit more
        v[sw] = max(0.0, v.co.z / hgt) ** 1.6 + 0.25 * min(1.0, v.co.xy.length / 0.6) * max(0.0, v.co.z / hgt)
    o = mesh_obj(name, bm, [bark, needles])
    o["sway_r"] = 1.0
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


def frame_point(shot, fi, depth, frac):
    """world xy `depth` m ahead of a shot's camera (frame index fi, 0-based) at `frac` of the half frame width (+ = right)"""
    _, c, l, lens = SHOTS[shot]["keys"][fi]
    f = Vector((l[0] - c[0], l[1] - c[1])).normalized()
    rt = Vector((f.y, -f.x))
    p = Vector(c[:2]) + f * depth + rt * (frac * depth * (36 * 9 / 16 / 2) / lens)
    return (p.x, p.y)


# ------------------------------------------------------------------ sight lines: nothing may stand in front of the cast
def _sight_lines():
    """(cx, cy, tx, ty, half width at the target, half width at the start) ground segments that must stay clear, and
    every camera position of every shot. Camera -> logger / lantern / hide tree cones, plus a little misty depth kept
    open right behind the logger (so his silhouette reads against fog, not against a black trunk)"""
    segs, cams = [], []
    c = SHOTS["chartest"]["keys"][0][1]
    cams.append(c)
    for dd in np.arange(-2.5, 2.51, 0.5):  # the chartest walkers' strip
        p = np.array([0.0, 3.5]) + dd * np.array([0.9846, -0.1748])
        segs.append((c[0], c[1], p[0], p[1], 0.9, 0.0))
    for k in ("pA", "pB", "pC", "pE"):
        for fr in PATHS[k]["frames"]:
            cx, cy = fr["cam"][:2]
            cams.append(fr["cam"])
            if fr["logger"]:
                L = np.array([fr["logger"]["x"], fr["logger"]["y"]])
                segs.append((cx, cy, L[0], L[1], 0.45, 0.0))
                d = (L - (cx, cy)) / np.linalg.norm(L - (cx, cy))
                q, e = L + d * 0.5, L + d * 4.0
                segs.append((q[0], q[1], e[0], e[1], 0.8, 0.35))
            if fr["lantern"]:
                segs.append((cx, cy, fr["lantern"][0], fr["lantern"][1], 0.3, 0.0))
            if k == "pC":  # the hide tree must read clearly, whole, from the logger's eyes, against a lighter misty gap
                d = np.array(HIDE) - (cx, cy)
                d /= np.linalg.norm(d)
                p = np.array(HIDE) - d * 0.5
                segs.append((cx, cy, p[0], p[1], 0.6, 0.0))
                if fr is PATHS[k]["frames"][-1]:
                    q, e = np.array(HIDE) + d * 0.9, np.array(HIDE) + d * 16.0
                    segs.append((q[0], q[1], e[0], e[1], 2.2, 0.7))
    return np.array(segs, float), np.array(cams, float)


SEGS, CAMS = _sight_lines()


def clear_of_sight(x, y, r, near=1.2):
    """True when a round footprint at (x, y) with radius r leaves every sight line free and no camera inside it"""
    a, b = SEGS[:, :2], SEGS[:, 2:4]
    ab = b - a
    t = np.clip(((np.array([x, y]) - a) * ab).sum(1) / (ab ** 2).sum(1), 0, 1)
    d = np.linalg.norm(a + t[:, None] * ab - (x, y), axis=1)
    if (d < r + 0.12 + SEGS[:, 5] + (SEGS[:, 4] - SEGS[:, 5]) * t).any():  # a cone from the camera to the target's width
        return False
    return not (np.hypot(CAMS[:, 0] - x, CAMS[:, 1] - y) < r + near).any()


# ------------------------------------------------------------------ wind
SWAY = None


def sway_group():
    """geometry nodes: offset every vertex by its 'sway' weight x a gusty wind wave in story time (scene seconds + T0),
    phase-shifted by the object's position; plus an optional single slow lean-and-shiver centred on story time Tc"""
    ng = bpy.data.node_groups.new("sway", "GeometryNodeTree")
    ng.is_modifier = True
    io = ng.interface
    io.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    io.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    for nm in ("T0", "Amp", "Tc", "Uneasy"):
        io.new_socket(nm, in_out="INPUT", socket_type="NodeSocketFloat")
    nd, ln = ng.nodes, ng.links
    gi, go = nd.new("NodeGroupInput"), nd.new("NodeGroupOutput")
    st = nd.new("GeometryNodeInputSceneTime")
    oi = nd.new("GeometryNodeObjectInfo")
    ln.new(nd.new("GeometryNodeSelfObject").outputs[0], oi.inputs["Object"])
    sl = nd.new("ShaderNodeSeparateXYZ")
    ln.new(oi.outputs["Location"], sl.inputs[0])
    ps = nd.new("ShaderNodeSeparateXYZ")
    ln.new(nd.new("GeometryNodeInputPosition").outputs[0], ps.inputs[0])
    na = nd.new("GeometryNodeInputNamedAttribute")
    na.data_type = "FLOAT"
    na.inputs["Name"].default_value = "sway"

    def M(op, a, b=None, c=None):
        m = nd.new("ShaderNodeMath")
        m.operation = op
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                m.inputs[i].default_value = v
            else:
                ln.new(v, m.inputs[i])
        return m.outputs[0]

    t = M("ADD", st.outputs["Seconds"], gi.outputs["T0"])
    ph = M("ADD", M("MULTIPLY", sl.outputs[0], 0.37), M("MULTIPLY", sl.outputs[1], 0.23))

    def wave(f, pk, off, zk=0.0):
        a = M("MULTIPLY_ADD", t, f, M("MULTIPLY_ADD", ph, pk, off))
        if zk:
            a = M("MULTIPLY_ADD", ps.outputs[2], zk, a)
        return M("SINE", a)

    w1, w2, w3, w4 = wave(0.9, 1.0, 0.0), wave(2.1, 1.7, 1.3), wave(4.7, 3.1, 0.0, 0.9), wave(1.3, 0.8, 2.0)
    wx = M("MULTIPLY_ADD", w1, 0.6, M("MULTIPLY_ADD", w2, 0.3, M("MULTIPLY", w3, 0.15)))
    wy = M("MULTIPLY_ADD", w4, 0.35, M("MULTIPLY", w3, 0.1))
    u = M("DIVIDE", M("SUBTRACT", t, gi.outputs["Tc"]), 0.55)
    pulse = M("MULTIPLY", M("EXPONENT", M("MULTIPLY", M("MULTIPLY", u, u), -1.0)), gi.outputs["Uneasy"])
    shiv = M("MULTIPLY_ADD", M("SINE", M("MULTIPLY_ADD", t, 11.0, M("MULTIPLY", ps.outputs[2], 2.0))), 0.25, 1.0)
    lean = M("MULTIPLY", pulse, shiv)
    k = M("MULTIPLY", gi.outputs["Amp"], na.outputs["Attribute"])
    ox = M("MULTIPLY", M("ADD", wx, lean), k)
    oy = M("MULTIPLY", M("MULTIPLY_ADD", lean, 0.4, wy), k)
    cx = nd.new("ShaderNodeCombineXYZ")
    ln.new(ox, cx.inputs[0])
    ln.new(oy, cx.inputs[1])
    sp = nd.new("GeometryNodeSetPosition")
    ln.new(gi.outputs["Geometry"], sp.inputs["Geometry"])
    ln.new(cx.outputs[0], sp.inputs["Offset"])
    ln.new(sp.outputs[0], go.inputs["Geometry"])
    return ng


def add_sway(o, amp_m, tc=0.0, uneasy=0.0):
    """amp_m: wind amplitude in metres at sway weight 1 (divided by the object's x scale: the weights are local)"""
    global SWAY
    if SWAY is None:
        SWAY = sway_group()
    md = o.modifiers.new("sway", "NODES")
    md.node_group = SWAY
    ids = {it.name: it.identifier for it in SWAY.interface.items_tree if getattr(it, "in_out", "") == "INPUT"}
    for nm, v in (("T0", SHOTS[SHOT]["t0"] - 1 / 30), ("Amp", amp_m / o.scale[0]), ("Tc", tc), ("Uneasy", uneasy)):
        try:
            getattr(md.properties.inputs, ids[nm]).value = v
        except AttributeError:
            md[ids[nm]] = v


# ------------------------------------------------------------------ the forest
def forest(bark, bark2, needles):
    variants = [tree_mesh(f"tree{i}", rnd.uniform(30, 42), i * 7 + 3, bark if i % 2 else bark2, needles) for i in range(8)]
    for v in variants:
        v.hide_render = True
        v.hide_viewport = True
    placed = []

    def put(x, y, rad, var=None, name="trunk"):
        v = variants[var if var is not None else rnd.randrange(len(variants))]
        o = ts.link(bpy.data.objects.new(name, v.data))
        o.location = (x, y, ground_z(x, y) - 0.15)
        o.scale = (rad, rad, rnd.uniform(0.9, 1.1))
        o.rotation_euler = (rnd.uniform(-0.012, 0.012), rnd.uniform(-0.012, 0.012), rnd.uniform(0, 6.3))
        o["kind"] = "tree"
        placed.append((x, y, rad))
        return o

    def ok(x, y, rad, near=1.2):
        return clear_of_sight(x, y, rad * 1.12 + 0.05, near) and not any(math.hypot(x - px, y - py) < 0.7 + pr + rad for px, py, pr in placed)

    # hero trunks: the hide tree; big close trunks framing the chartest and the preview shots (dropped if in the way)
    put(*HIDE, 0.38, 0, name="trunk_HIDE")
    # (shot, frame index, depth, frame fraction (+ = right edge), radius): pushed outward / deeper until clear
    heroes = [("chartest", 0, 1.7, -1.6, 0.33), ("chartest", 0, 2.4, 1.6, 0.42), ("chartest", 0, 6.5, -1.0, 0.3),
              ("pA", 43, 3.6, -1.2, 0.72), ("pA", 43, 5.0, 1.15, 0.8), ("pA", 43, 10.0, -0.85, 0.6),
              ("pB", 38, 2.6, -1.1, 0.55), ("pB", 38, 6.5, 0.85, 0.62),
              ("pC", 0, 2.8, 1.0, 0.6), ("pC", 55, 7.5, -0.9, 0.65),
              ("pE", 60, 2.6, -1.1, 0.55), ("pE", 60, 10.0, 0.75, 0.75)]
    for i, (sh, fi, dep, fr, r) in enumerate(heroes):
        for k in range(40):
            x, y = frame_point(sh, fi, dep * (1 + 0.12 * (k // 8)), fr + math.copysign(0.1 * (k % 8), fr))
            if ok(x, y, r, near=1.0) and abs(lateral([(x, y)])[0]) > 1.4 + r:
                put(x, y, r, i % len(variants), name="trunk_hero")
                print("hero trunk", i, sh, round(x, 2), round(y, 2))
                break
        else:
            print("hero trunk", i, sh, "found no free spot")
    # the rest: a jittered grid, dense around the action, thinner far out; off the trail and out of every sight line
    pts = []
    for gx in np.arange(-44, 44, 1.85):
        for gy in np.arange(-11, 98, 1.85):
            x, y = gx + rnd.uniform(-0.8, 0.8), gy + rnd.uniform(-0.8, 0.8)
            if (abs(x) > 22 or y > 45) and rnd.random() < 0.5:
                continue
            pts.append((x, y))
    lat = lateral(pts)
    for (x, y), la in zip(pts, lat):
        rad = rnd.uniform(0.17, 0.4) if rnd.random() > 0.16 else rnd.uniform(0.42, 0.62)
        if abs(la) < 1.5 + rad or rnd.random() < 0.08 or not ok(x, y, rad):
            continue
        put(x, y, rad)
    return placed


def scatter_debris(placed, mat, bark):
    """twigs and fallen branches on the floor"""
    for i in range(40):
        x, y = rnd.uniform(-8, 6), rnd.uniform(-3.0, 16)
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


def undergrowth(placed, needles, bark):
    """young spruces scattered through the action area (all sway); and per preview shot one far spruce, back in the
    dark where the mist glows, that moves once more than the wind should"""
    spr = []

    def ok(x, y, h, loose=False):
        r = 0.42 * h
        if loose:  # the uneasy ones may stand right against a trunk
            return abs(lateral([(x, y)])[0]) > 1.2 + r and clear_of_sight(x, y, r + 0.1, near=1.0) and \
                not any(math.hypot(x - px, y - py) < pr + 0.35 for px, py, pr in placed + spr)
        if abs(lateral([(x, y)])[0]) < 1.2 + r or not clear_of_sight(x, y, r + 0.1, near=1.0):
            return False
        return not any(math.hypot(x - px, y - py) < pr * 1.25 + r * 0.45 for px, py, pr in placed) and \
            not any(math.hypot(x - px, y - py) < 0.6 * (r + pr) for px, py, pr in spr)

    fixed = [(-3.9, 6.8, 1.6), (4.6, 9.7, 2.3), (-6.2, 15.5, 2.0), (3.0, 16.0, 1.4), (-5.3, 11.2, 1.1), (5.6, 6.0, 1.8), (-4.8, 3.0, 1.3)]
    cand = fixed + [(rnd.uniform(-18, 18), rnd.uniform(-7, 34), rnd.uniform(0.7, 2.6)) for _ in range(160)]
    for i, (x, y, h) in enumerate(cand):
        if len(spr) >= 60 or not ok(x, y, h):
            continue
        o = spruce(f"spruce{i}", (x, y), h, needles, bark, i + 40)
        o["kind"] = "spruce"
        add_sway(o, 0.07)
        spr.append((x, y, 0.42 * h))
    # the uneasy ones: (shot, frame index, depth, frame fraction, height, story time of the movement)
    for k, (sh, fi, dep, fr, h, tc) in enumerate([("pA", 40, 15.0, 0.55, 2.6, 16.7), ("pB", 38, 12.0, 0.6, 2.4, 19.6),
                                                  ("pC", 30, 13.0, -0.6, 2.5, 21.6), ("pE", 70, 13.0, 0.45, 2.6, 24.6)]):
        tries = sorted(((abs(f2 - fr) + 0.04 * abs(d2 - dep), f2, d2) for f2 in np.arange(-0.9, 0.91, 0.15) for d2 in range(9, 21, 2)))
        for _, f2, d2 in tries:
            x, y = frame_point(sh, fi, d2, f2)
            if ok(x, y, h, True):
                break
        else:
            print("uneasy spruce", sh, "found no free spot")
            continue
        o = spruce(f"uneasy_{sh}", (x, y), h, needles, bark, 900 + k)
        o["kind"] = "spruce"
        add_sway(o, 0.07, tc, 6.0)
        spr.append((x, y, 0.42 * h))
        print("uneasy spruce", sh, round(x, 2), round(y, 2))
    return spr


def lights_world(sc):
    wo = bpy.data.worlds.new("night")
    wo.use_nodes = True
    nt = wo.node_tree
    nd, ln = nt.nodes, nt.links
    bg = nd["Background"]
    # near-black sky with a few faint stars
    tc = nd.new("ShaderNodeTexCoord")
    vo = nd.new("ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 260.0
    ln.new(tc.outputs["Generated"], vo.inputs["Vector"])
    st = _maprange(nd, ln, vo.outputs["Distance"], 0.06, 0.0, 0.0, 1.0)
    sk = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Generated"], sk.inputs[0])
    upm = _maprange(nd, ln, sk.outputs[2], 0.1, 0.6)
    stars = _math(nd, ln, "MULTIPLY", st.outputs[0], upm.outputs[0])
    stars = _math(nd, ln, "MULTIPLY", stars.outputs[0], 0.12, clamp=False)
    base = _mix(nd, ln, upm.outputs[0], (0.003, 0.0045, 0.009), (0.0015, 0.0025, 0.006)).outputs[2]
    add = _mix(nd, ln, 1.0, base, (0.0, 0.0, 0.0), "ADD")
    ln.new(stars.outputs[0], add.inputs[7])
    ln.new(add.outputs[2], bg.inputs[0])
    bg.inputs[1].default_value = 1.0
    vol = nd.new("ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = float(arg("--haze", "0.01"))
    vol.inputs["Anisotropy"].default_value = 0.6
    vol.inputs["Color"].default_value = (0.6, 0.68, 0.85, 1)
    ln.new(vol.outputs[0], nd["World Output"].inputs["Volume"])
    sc.world = wo
    # the moon: high, behind and to the right -> cold rim light on the trunks, long shadows toward camera, shafts in the mist
    mo = bpy.data.lights.new("moon", "SUN")
    mo.energy, mo.color, mo.angle = float(arg("--moon", "3.0")), (0.52, 0.66, 1.0), math.radians(1.0)
    o = ts.link(bpy.data.objects.new("moon", mo))
    o.rotation_euler = (math.radians(-42), 0, math.radians(-35))  # light travels toward -y (camera) and a bit -x
    # a faint cold skylight filtering down through gaps
    fl = bpy.data.lights.new("sky", "AREA")
    fl.shape, fl.size, fl.size_y = "RECTANGLE", 26.0, 26.0
    fl.energy, fl.color = float(arg("--sky", "260")), (0.4, 0.5, 0.85)
    fl.volume_factor = 0.0
    o = ts.link(bpy.data.objects.new("sky", fl))
    o.location = (-1.5, 4.0, 11.0)
    # the camp: a very faint warm glow far down the trail
    cl = bpy.data.lights.new("camp", "POINT")
    cl.energy, cl.color, cl.shadow_soft_size = float(arg("--camp", "500")), (1.0, 0.45, 0.15), 1.0
    o = ts.link(bpy.data.objects.new("camp", cl))
    o.location = (CAMP[0], CAMP[1], 1.3)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, location=(CAMP[0], CAMP[1] - 0.5, 0.9))
    f = bpy.context.object
    f.name = "campfire"
    f.data.materials.append(ts.flat_mat("fire", (1.0, 0.45, 0.12), emit=5))
    f.visible_shadow = False


def ground_mist():
    """cold layered ground fog in world space: very dense in the first half metre, thinning up through eye level, a
    thin veil to ~6 m; banks and wisps drift with the wind and slowly boil (animated 4D noise). Only far fog glows a
    little (moonlit), near fog just scatters the lights (the lantern makes a warm halo in it)."""
    m = bpy.data.materials.new("mist")
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    nd.remove(nd["Principled BSDF"])
    pv = nd.new("ShaderNodeVolumePrincipled")
    geo = nd.new("ShaderNodeNewGeometry")
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(geo.outputs["Position"], sep.inputs[0])
    z = sep.outputs[2]
    low = _math(nd, ln, "EXPONENT", _math(nd, ln, "MULTIPLY", z, -1 / 0.42, clamp=False).outputs[0], clamp=False)
    mid = _math(nd, ln, "EXPONENT", _math(nd, ln, "MULTIPLY", z, -1 / float(arg("--mist2h", "4.0")), clamp=False).outputs[0], clamp=False)
    # drift: mapping location and noise W keyed linearly over the shot (story time based -> continuous across shots)
    mp = nd.new("ShaderNodeMapping")
    ln.new(geo.outputs["Position"], mp.inputs["Vector"])
    nb = _noise(nd, ln, mp.outputs[0], 0.11, 4.0, 0.55)
    nw = _noise(nd, ln, mp.outputs[0], 0.55, 5.0, 0.6)
    for no in (nb, nw):
        no.noise_dimensions = "4D"
    S = SHOTS[SHOT]
    for f in (1, S["n"]):
        t = S["t0"] + (f - 1) / 30
        mp.inputs["Location"].default_value = (-0.55 * t, -0.1 * t, -0.03 * t)
        mp.inputs["Location"].keyframe_insert("default_value", frame=f)
        nb.inputs["W"].default_value = 0.06 * t
        nb.inputs["W"].keyframe_insert("default_value", frame=f)
        nw.inputs["W"].default_value = 0.25 * t
        nw.inputs["W"].keyframe_insert("default_value", frame=f)
    banks = _maprange(nd, ln, nb.outputs["Fac"], 0.3, 0.72, 0.12, 1.5)
    wisps = _maprange(nd, ln, nw.outputs["Fac"], 0.32, 0.7, 0.35, 1.35)
    d = _math(nd, ln, "MULTIPLY", low.outputs[0], wisps.outputs[0], clamp=False)
    d = _math(nd, ln, "MULTIPLY", d.outputs[0], float(arg("--mist", "0.32")), clamp=False)
    d2 = _math(nd, ln, "MULTIPLY", mid.outputs[0], float(arg("--mist2", "0.04")), clamp=False)
    d = _math(nd, ln, "ADD", d.outputs[0], d2.outputs[0], clamp=False)
    d = _math(nd, ln, "MULTIPLY", d.outputs[0], banks.outputs[0], clamp=False)
    ln.new(d.outputs[0], pv.inputs["Density"])
    cp = nd.new("ShaderNodeCombineXYZ")
    for f, loc, _, _ in S["keys"]:
        for i in range(3):
            cp.inputs[i].default_value = loc[i]
            cp.inputs[i].keyframe_insert("default_value", frame=f)
    dist = nd.new("ShaderNodeVectorMath")
    dist.operation = "DISTANCE"
    ln.new(geo.outputs["Position"], dist.inputs[0])
    ln.new(cp.outputs[0], dist.inputs[1])
    far = _maprange(nd, ln, dist.outputs["Value"], 3.0, 25.0, 0.0, 1.0)
    em = _math(nd, ln, "MULTIPLY", d.outputs[0], far.outputs[0], clamp=False)
    em = _math(nd, ln, "MULTIPLY", em.outputs[0], float(arg("--mistglow", "1.6")), clamp=False)
    ln.new(em.outputs[0], pv.inputs["Emission Strength"])
    pv.inputs["Emission Color"].default_value = (0.22, 0.32, 0.6, 1)
    pv.inputs["Color"].default_value = (0.62, 0.7, 0.86, 1)
    pv.inputs["Anisotropy"].default_value = 0.45
    ln.new(pv.outputs[0], nd["Material Output"].inputs["Volume"])
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 44, 3.5))
    o = bpy.context.object
    o.name = "mistbox"
    o.scale = (96, 112, 8.0)
    o.data.materials.append(m)
    return o


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    sc = bpy.context.scene
    sc.render.fps = 30
    lights_world(sc)
    bark = bark_mat("bark", (0.012, 0.01, 0.009), (0.1, 0.085, 0.072))
    bark2 = bark_mat("bark2", (0.011, 0.01, 0.01), (0.085, 0.08, 0.077))
    logbark = bark_mat("logbark", (0.014, 0.011, 0.009), (0.08, 0.064, 0.05), snow=0.9, stretch=0.12)
    grain = endgrain_mat()
    needles = needle_mat("needles", snow=0.3)
    ground(ground_mat())
    placed = forest(bark, bark2, needles)
    # canopies and dead boughs sway (only trees near this shot's camera: far ones are lost in the dark anyway)
    cams = np.array([k[1][:2] for k in SHOTS[SHOT]["keys"]])
    for o in list(sc.objects):
        if o.get("kind") == "tree" and np.hypot(*(cams - o.location.xy).T).min() < 30:
            add_sway(o, 0.3)

    # logging: stumps with axe-cut tops, felled logs, a pile of cut logs by the trail (none in a sight line)
    for i, (x, y, r, h) in enumerate([(-1.9, 6.0, 0.3, 0.55), (3.3, 8.2, 0.36, 0.45), (-5.0, 9.5, 0.28, 0.6), (1.6, 12.5, 0.32, 0.5),
                                      (-0.9, 17.0, 0.3, 0.5), (-6.5, 4.2, 0.35, 0.5), (4.6, 4.4, 0.25, 0.4), (-3.0, -2.5, 0.34, 0.5),
                                      (3.4, -1.5, 0.3, 0.45), (-8.4, 12.8, 0.33, 0.55)]):
        if clear_of_sight(x, y, r * 1.4 + 0.05, near=0.9) and abs(lateral([(x, y)])[0]) > 1.3:
            stump(f"stump{i}", (x, y), r, h, logbark, grain, i)
        else:
            print("stump", i, "dropped")

    def log_ok(p0, p1, r):
        return all(clear_of_sight(p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k, r + 0.05, near=0.9) for k in np.linspace(0, 1, 9))

    for i, (p0, p1, r) in enumerate([(cam_rel(-0.4, 1.9), cam_rel(-2.2, 2.9), 0.17), ((3.0, 6.6), (6.5, 7.6), 0.27),
                                     ((-6.0, 11.5), (-4.6, 14.5), 0.24), ((-4.5, -1.0), (-1.8, -0.2), 0.22)]):
        if log_ok(p0, p1, r):
            log(f"log{i}", p0, p1, r, logbark, grain)
        else:
            print("log", i, "dropped")
    if log_ok((-5.4, 17.5), (-4.56, 20.5), 0.3):
        for j, (dx, dz) in enumerate([(0, 0), (0.42, 0), (0.84, 0), (0.21, 0.38), (0.63, 0.38), (0.42, 0.74)]):
            lo = log(f"pile{j}", (-5.4 + dx, 17.5), (-5.4 + dx, 20.5), 0.2, logbark, grain)
            lo.location.z += dz
    undergrowth(placed, needles, logbark)
    scatter_debris(placed, None, logbark)
    ground_mist()

    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "16" if SHOTS[SHOT].get("mblur") else "12"))
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    for k, v in (("volumetric_tile_size", arg("--vtile", "8")), ("volumetric_end", 75.0), ("volumetric_start", 0.3),
                 ("use_volumetric_shadows", True), ("volumetric_samples", int(arg("--vsamples", "64"))),
                 ("volumetric_sample_distribution", 0.85), ("volumetric_shadow_samples", 8),
                 ("shadow_ray_count", 1), ("shadow_step_count", 6)):
        if hasattr(ee, k):
            setattr(ee, k, v)
    if hasattr(ee, "shadow_resolution_scale"):
        ee.shadow_resolution_scale = 1.0
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "1.3"))
    sc.render.image_settings.file_format = "PNG"
    return sc


def shot_camera(sc, name):
    S = SHOTS[name]
    c = ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_width, c.data.clip_start, c.data.clip_end = 36, 0.05, 250
    c.data.dof.use_dof = True
    c.data.dof.aperture_fstop = S["fstop"]
    foc = ts.link(bpy.data.objects.new("focus", None))
    c.data.dof.focus_object = foc
    aim = ts.link(bpy.data.objects.new("aim", None))
    tc = c.constraints.new("TRACK_TO")
    tc.target, tc.track_axis, tc.up_axis = aim, "TRACK_NEGATIVE_Z", "UP_Y"
    for i, (f, loc, look, lens) in enumerate(S["keys"]):
        c.location = loc
        c.keyframe_insert("location", frame=f)
        aim.location = look
        aim.keyframe_insert("location", frame=f)
        c.data.lens = lens
        c.data.keyframe_insert("lens", frame=f)
        foc.location = S["focus"][i] if isinstance(S["focus"], list) else S["focus"]
        foc.keyframe_insert("location", frame=f)
    sc.camera = c
    sc.frame_start, sc.frame_end = 1, S["n"]
    if S.get("mblur"):  # the whip pan in pC
        sc.render.use_motion_blur = True
        sc.render.motion_blur_shutter = float(arg("--shutter", "0.5"))
        if hasattr(sc.eevee, "motion_blur_steps"):
            sc.eevee.motion_blur_steps = int(arg("--mbsteps", "1"))
    # the logger's kerosene lantern: the main light near him (position per frame from the plan, flicker per frame)
    if any(p is not None for p in S.get("lantern", [])):
        la = bpy.data.lights.new("lantern", "POINT")
        la.color, la.shadow_soft_size = LANTERN["color"], LANTERN["radius"]
        la.use_shadow = True
        la.volume_factor = float(arg("--lvol", "0.0"))  # a soft warm halo in the fog, not a wall of orange
        if hasattr(la, "use_shadow_jitter"):
            la.use_shadow_jitter = bool(int(arg("--jitter", "0")))
        la.use_custom_distance, la.cutoff_distance = True, LANTERN["cutoff"]
        if hasattr(la, "use_soft_falloff"):
            la.use_soft_falloff = True
        lo = ts.link(bpy.data.objects.new("lantern", la))
        last = next(p for p in S["lantern"] if p is not None)
        for i, p in enumerate(S["lantern"]):
            f = i + 1
            t = S["t0"] + (f - 1) / 30
            last = p or last
            lo.location = last
            lo.keyframe_insert("location", frame=f)
            la.energy = lantern_energy(t) if p is not None else 0.0
            la.keyframe_insert("energy", frame=f)
    return c


def fg_set(sc, cam, mode):
    """names of the objects that make the foreground pass at the current frame"""
    if mode == "hide":
        return {"trunk_HIDE"}
    cp = cam.matrix_world.translation
    return {o.name for o in sc.objects if o.get("kind") in ("tree", "spruce") and not o.hide_render
            and math.hypot(o.location.x - cp.x, o.location.y - cp.y) < float(arg("--near", "8"))}


if __name__ == "__main__":
    sc = build()
    cam = shot_camera(sc, SHOT)
    res = int(arg("--res", "720"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(res * 16 / 9)
    fg = arg("--fg")
    if fg:
        # occluder pass: a coverage matte of the occluders alone (film transparent, everything else held out, no fog so
        # the alpha is clean; same camera, DOF and motion blur), then RGB taken from the beauty frame f_####.png of the
        # same shot, so the fg layer matches the plate pixel for pixel. Render the beauty frames first.
        sc.render.film_transparent = True
        sc.render.image_settings.color_mode = "RGBA"
        sc.eevee.taa_render_samples = int(arg("--samples", "8"))
        sc.world.node_tree.links.remove(sc.world.node_tree.nodes["World Output"].inputs["Volume"].links[0])
        bpy.data.objects["mistbox"].hide_render = True
        for o in sc.objects:  # coverage only: no lights, no shadows
            if o.type == "LIGHT":
                o.hide_render = True
        sc.eevee.use_shadows = False
    out = os.path.abspath(arg("--out", f"out/hidebehind/sets/{SHOT}/"))
    os.makedirs(out, exist_ok=True)
    n = SHOTS[SHOT]["n"]
    cams = {}
    for f in range(1, n + 1):
        sc.frame_set(f)
        cams[f] = {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36}
    if not fg:
        json.dump({"shot": SHOT, "frames": cams}, open(os.path.join(out, "cam.json"), "w"))
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
    import time
    a, b = (int(x) for x in arg("--range", f"1-{n}").split("-"))
    for f in range(a, b + 1, int(arg("--step", "1"))):
        p = os.path.join(out, f"{'fg' if fg else 'f'}_{f:04d}.png")
        if arg("--resume") and os.path.exists(p):
            continue
        t0 = time.time()
        sc.frame_set(f)
        if fg:
            keep = fg_set(sc, cam, fg)
            for o in sc.objects:
                if o.type == "MESH" and o.name != "mistbox":
                    o.is_holdout = o.name not in keep
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        if fg:
            bp = os.path.join(out, f"f_{f:04d}.png")
            if os.path.exists(bp):
                mi, bi = bpy.data.images.load(p), bpy.data.images.load(bp)
                w, h = mi.size
                m, b_ = np.empty(w * h * 4, np.float32), np.empty(w * h * 4, np.float32)
                mi.pixels.foreach_get(m)
                bi.pixels.foreach_get(b_)
                b_[3::4] = m[3::4]
                im = bpy.data.images.new("fgout", w, h, alpha=True)
                im.pixels.foreach_set(b_)
                im.filepath_raw, im.file_format = p, "PNG"
                im.save()
                for x in (mi, bi, im):
                    bpy.data.images.remove(x)
            else:
                print("WARNING: no beauty frame", bp, "- fg pass left as a raw matte render")
            print("fg objects:", len(keep), flush=True)
        print("frame", f, round(time.time() - t0, 1), "s", flush=True)
