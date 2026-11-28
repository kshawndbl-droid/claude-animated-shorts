"""Kaizen Clips Blender core: scene setup, render quality presets, cameras, the cam.json the 2D cast is drawn through,
and plate rendering (beauty, light-variant for flicker, depth for 2D haze, foreground layer for parallax).

All library sets are real lit EEVEE scenes with NO characters: the 2D ink cast is drawn in Remotion on top, through the
same camera (cam.json), exactly like the Hidebehind. Units: metres; the 2D rig is ~1.45 m tall.
"""
import json
import math
import os
import random
import sys

import bpy  # noqa: I001
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default


def flag(name):
    return name in ARGS


# ------------------------------------------------------------------ scene and objects
def reset(fps=30):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    sc = bpy.context.scene
    sc.render.fps = fps
    return sc


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def tag(o, kind):
    """mark an object (kind = tree, building, prop, ground, fx ...) for passes and cleanup"""
    o["kind"] = kind
    return o


def box(name, loc, size, mat, rot=0.0, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.rotation_euler[2] = rot
    if mat is not None:
        o.data.materials.append(mat)
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width, m.segments = bevel, 2
    return o


def cyl(name, p0, p1, rad, mat, segs=12):
    a, b = Vector(p0), Vector(p1)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=segs, radius=rad, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object
    o.name = name
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    if mat is not None:
        o.data.materials.append(mat)
    return smooth(o)


def parent_all(objs, name, loc=(0, 0, 0), rot=0.0):
    """group objects under an empty so a whole building/prop can be moved and turned as one"""
    e = link(bpy.data.objects.new(name, None))
    for o in objs:
        o.parent = e
    e.location = loc
    e.rotation_euler[2] = rot
    return e


# ------------------------------------------------------------------ quality presets
QUALITY = {
    # fast look-dev and previews: half resolution, few samples, cheap volumes
    "preview": dict(res=540, samples=6, vsamples=24, vtile=16, shadow=0.5),
    # approved shots: full 1080x1920, enough samples for clean soft shadows, full volumes
    "final": dict(res=1080, samples=24, vsamples=64, vtile=8, shadow=1.0),
    # oversized plates for slow 2.5D pushes (the Hidebehind used ~1296 wide stills)
    "push": dict(res=1296, samples=24, vsamples=64, vtile=8, shadow=1.0),
}


def render_settings(sc, quality="preview", exposure=0.0, look="AgX - Medium High Contrast"):
    q = dict(QUALITY[quality])
    if arg("--res"):
        q["res"] = int(arg("--res"))
    if arg("--samples"):
        q["samples"] = int(arg("--samples"))
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = q["samples"]
    # screen-space ray tracing + fast GI = soft contact shadows / ambient occlusion and light bouncing off walls:
    # what makes daylight sets look solid instead of flat (cheap on CPU at these resolutions; --nogi turns it off)
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = not flag("--nogi")
        if ee.use_raytracing:
            ee.ray_tracing_method = "SCREEN"
            ee.use_fast_gi = True
            try:
                ee.fast_gi_method = "GLOBAL_ILLUMINATION"
            except TypeError:
                pass
            ee.fast_gi_distance = 6.0
    for k, v in (("volumetric_tile_size", str(q["vtile"])), ("volumetric_end", 120.0), ("volumetric_start", 0.3),
                 ("use_volumetric_shadows", True), ("volumetric_samples", q["vsamples"]), ("volumetric_sample_distribution", 0.85),
                 ("shadow_ray_count", 1), ("shadow_step_count", 6), ("shadow_resolution_scale", q["shadow"])):
        if hasattr(ee, k):
            try:
                setattr(ee, k, v)
            except Exception:
                pass
    sc.render.resolution_x, sc.render.resolution_y = q["res"], round(q["res"] * 16 / 9)
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = look
    except TypeError:
        pass
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = "PNG"
    sc.render.film_transparent = False
    return q


# ------------------------------------------------------------------ cameras
# Presets relative to a subject point S (where the character stands, ground level) and a heading: the direction the
# camera looks along, in degrees (0 = looking toward +y). dist/height in metres, lens in mm (36 mm sensor, 9:16).
CAM_PRESETS = {
    "establishing": dict(dist=16.0, height=4.5, lens=20, aim=1.0),   # whole place, small figures
    "wide": dict(dist=7.5, height=1.6, lens=26, aim=0.9, fstop=5.6),            # place + full figure
    "medium": dict(dist=3.8, height=1.35, lens=35, aim=0.95, fstop=3.5),        # full figure, interactions
    "close": dict(dist=1.9, height=1.25, lens=50, aim=1.15, fstop=2.0),         # head and shoulders
    "extreme": dict(dist=1.1, height=1.22, lens=70, aim=1.2, fstop=1.8),        # face only
    "low": dict(dist=3.2, height=0.35, lens=22, aim=1.25, fstop=4.0),           # powerful, looming
    "high": dict(dist=5.5, height=6.5, lens=28, aim=0.4),            # small, vulnerable, overview
    "ots": dict(dist=1.6, height=1.45, lens=40, aim=1.0, side=0.55, fstop=2.8),  # over the shoulder (S = the listener)
    "ground": dict(dist=2.2, height=0.12, lens=24, aim=0.3),         # feet / tracks / objects on the ground
}


def preset_camera(S, preset="wide", heading=0.0, side=None, dist=None, height=None, lens=None, aim=None):
    """camera location, look-at point and lens for a preset around subject point S (x, y, z_ground)"""
    p = dict(CAM_PRESETS[preset])
    for k, v in (("dist", dist), ("height", height), ("lens", lens), ("aim", aim), ("side", side)):
        if v is not None:
            p[k] = v
    h = math.radians(heading)
    fx, fy = math.sin(h), math.cos(h)          # forward (camera looks along this)
    rx, ry = math.cos(h), -math.sin(h)         # camera right
    sd = p.get("side", 0.0)
    loc = (S[0] - fx * p["dist"] + rx * sd, S[1] - fy * p["dist"] + ry * sd, S[2] + p["height"])
    look = (S[0], S[1], S[2] + p["aim"])
    return loc, look, p["lens"]


def preset_fstop(preset):
    """depth of field per preset (None = everything sharp): wide shots stay mostly sharp, close-ups blur the background"""
    return CAM_PRESETS[preset].get("fstop")


def camera(sc, loc, look, lens, fstop=None, focus=None, clip_end=400.0):
    c = link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_width, c.data.clip_start, c.data.clip_end = 36, 0.05, clip_end
    c.data.lens = lens
    c.location = loc
    d = Vector(look) - Vector(loc)
    c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    if fstop:
        c.data.dof.use_dof = True
        c.data.dof.aperture_fstop = fstop
        c.data.dof.focus_distance = (Vector(focus or look) - Vector(loc)).length
    sc.camera = c
    bpy.context.view_layer.update()
    return c


def write_cam(cam, path, extra=None):
    """the same cam.json schema every Short uses: Remotion projects world points through it to draw the 2D cast"""
    d = {"frames": {"1": {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36}}}
    if extra:
        d.update(extra)
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    json.dump(d, open(path, "w"), indent=1)


# ------------------------------------------------------------------ rendering plates
def render_to(sc, path):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("wrote", path)


def render_variant(sc, path, lights, factor):
    """render again with some lights scaled (fire/candle 'hi' and 'lo' plates, cross-faded in 2D for a living flicker)"""
    keep = [(lt, lt.energy) for lt in lights]
    for lt, e in keep:
        lt.energy = e * factor
    render_to(sc, path)
    for lt, e in keep:
        lt.energy = e


def render_depth(sc, path, near=1.0, far=60.0):
    """a grey depth plate (white = near, black = far) for 2D haze, fog and depth-of-field in Remotion: unlit emission
    override, so it costs a fraction of a beauty render"""
    m = bpy.data.materials.new("kz_depth")
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    for n in list(nd):
        nd.remove(n)
    cd = nd.new("ShaderNodeCameraData")
    mr = nd.new("ShaderNodeMapRange")
    mr.inputs[1].default_value, mr.inputs[2].default_value = near, far
    mr.inputs[3].default_value, mr.inputs[4].default_value = 1.0, 0.0
    ln.new(cd.outputs["View Distance"], mr.inputs[0])
    em = nd.new("ShaderNodeEmission")
    ln.new(mr.outputs[0], em.inputs["Color"])
    out = nd.new("ShaderNodeOutputMaterial")
    ln.new(em.outputs[0], out.inputs["Surface"])
    vl = bpy.context.view_layer
    old_world, old_look, old_view = sc.world, sc.view_settings.look, sc.view_settings.view_transform
    vl.material_override = m
    sc.world = None
    sc.view_settings.view_transform = "Standard"
    old_samples = sc.eevee.taa_render_samples
    sc.eevee.taa_render_samples = 1
    hidden = [o for o in sc.objects if o.get("kind") == "fx" and not o.hide_render]
    for o in hidden:
        o.hide_render = True
    render_to(sc, path)
    for o in hidden:
        o.hide_render = False
    vl.material_override = None
    sc.world = old_world
    sc.view_settings.view_transform = old_view
    try:
        sc.view_settings.look = old_look
    except TypeError:
        pass
    sc.eevee.taa_render_samples = old_samples


def render_foreground(sc, path, cam, near=4.0):
    """an RGBA layer with only the objects nearer than `near` metres (everything else held out): slide it a little
    faster than the background in 2D for real parallax from still plates"""
    cp = cam.matrix_world.translation
    changed = []
    for o in sc.objects:
        if o.type != "MESH" or o.get("kind") in ("ground", "grass", "backdrop"):
            # ground, scattered grass (one mesh spread over the whole set) and backdrops never go in the near layer:
            # they would be drawn over the characters far away
            if o.type == "MESH":
                changed.append((o, o.is_holdout))
                o.is_holdout = True
            continue
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        d = (sum(bb, Vector()) / 8 - cp).length          # bounding-box centre, not the origin (parented props, rows)
        if d > near:
            changed.append((o, o.is_holdout))
            o.is_holdout = True
    sc.render.film_transparent = True
    sc.render.image_settings.color_mode = "RGBA"
    render_to(sc, path)
    sc.render.film_transparent = False
    sc.render.image_settings.color_mode = "RGB"
    for o, h in changed:
        o.is_holdout = h


def seed_all(seed):
    random.seed(seed)
    return random.Random(seed)
