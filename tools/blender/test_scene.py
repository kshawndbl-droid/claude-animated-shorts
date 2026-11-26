# 10-second 3D test scene (Blender 5.3, EEVEE): a hero walks up a cliff path toward a Greek temple at golden hour.
# Everything moves: an Ocean-modifier sea, drifting procedural clouds, olive trees and grass in the wind, dust motes,
# seagulls, a burning brazier, a rigged character (CC0 KayKit rig + its walk/idle animations), and a tracking camera
# with depth of field. Assets: Poly Haven HDRI (CC0), ambientCG textures (CC0), KayKit Adventurers (CC0).
# usage: .venv-bpy/bin/python tools/blender/test_scene.py --out out/blender/test/f_ [--frames 1,90,200] [--res 720] [--save x.blend]
import math
import os
import random
import sys

import bpy
from mathutils import Euler, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
A = os.path.join(ROOT, "public", "assets")
FPS, N = 30, 300
CANOPY_SUB = 4
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]


def arg(name, default=None):
    return args[args.index(name) + 1] if name in args else default


random.seed(7)


# ------------------------------------------------------------------ helpers
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes["Principled BSDF"]


def tex_mat(name, folder, prefix, scale=1.0, tint=None, rough=None, disp=0.0):
    m, nd, ln, b = new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    ln.new(tc.outputs["UV"], mp.inputs[0])

    def img(kind, non_color=False):
        p = os.path.join(folder, f"{prefix}_{kind}.jpg")
        if not os.path.exists(p):
            return None
        t = nd.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(p)
        if non_color:
            t.image.colorspace_settings.name = "Non-Color"
        ln.new(mp.outputs[0], t.inputs[0])
        return t

    c = img("Color")
    if c:
        if tint:
            mix = nd.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = 1.0
            ln.new(c.outputs[0], mix.inputs[6])
            mix.inputs[7].default_value = (*tint, 1)
            ln.new(mix.outputs[2], b.inputs["Base Color"])
        else:
            ln.new(c.outputs[0], b.inputs["Base Color"])
    r = img("Roughness", True)
    if r:
        ln.new(r.outputs[0], b.inputs["Roughness"])
    elif rough is not None:
        b.inputs["Roughness"].default_value = rough
    n = img("NormalGL", True)
    if n:
        nm = nd.new("ShaderNodeNormalMap")
        ln.new(n.outputs[0], nm.inputs["Color"])
        ln.new(nm.outputs[0], b.inputs["Normal"])
    return m


def flat_mat(name, rgb, rough=0.6, metal=0.0, emit=0.0):
    m, nd, ln, b = new_mat(name)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True


def wind_texture(name, size=2.0):
    t = bpy.data.textures.new(name, "CLOUDS")
    t.noise_scale = size
    t.noise_depth = 2
    return t


def wind_driver_empty(name, speed):
    """an empty that slides through a noise texture over time: a Displace modifier using it as texture coordinates
    turns static geometry into geometry swaying in gusts of wind"""
    e = bpy.data.objects.new(name, None)
    link(e)
    e.location = (0, 0, 0)
    e.keyframe_insert("location", frame=1)
    e.location = (speed[0] * N / FPS, speed[1] * N / FPS, 0)
    e.keyframe_insert("location", frame=N)
    for fc in e.animation_data.action.fcurves if hasattr(e.animation_data.action, "fcurves") else []:
        for k in fc.keyframe_points:
            k.interpolation = "LINEAR"
    set_linear(e)
    return e


def set_linear(o):
    ad = o.animation_data
    if not ad or not ad.action:
        return
    act = ad.action
    curves = []
    if hasattr(act, "fcurves"):
        curves = list(act.fcurves)
    else:  # Blender 5 layered actions
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    curves += list(cb.fcurves)
    for fc in curves:
        for k in fc.keyframe_points:
            k.interpolation = "LINEAR"


def fcurves(o):
    act = o.animation_data.action
    if hasattr(act, "fcurves"):
        return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                out += list(cb.fcurves)
    return out


def add_wind(o, empty, strength, tex):
    d = o.modifiers.new("wind", "DISPLACE")
    d.texture = tex
    d.texture_coords = "OBJECT"
    d.texture_coords_object = empty
    d.strength = strength
    d.mid_level = 0.5
    d.direction = "X"
    d2 = o.modifiers.new("wind2", "DISPLACE")
    d2.texture = tex
    d2.texture_coords = "OBJECT"
    d2.texture_coords_object = empty
    d2.strength = strength * 0.6
    d2.direction = "Y"
    return d


# ------------------------------------------------------------------ world: sky, light
def world():
    sc = bpy.context.scene
    w = bpy.data.worlds.new("sky")
    sc.world = w
    w.use_nodes = True
    nd, ln = w.node_tree.nodes, w.node_tree.links
    env = nd.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(A, "blender", "sky.hdr"))
    mp = nd.new("ShaderNodeMapping")
    tc = nd.new("ShaderNodeTexCoord")
    ln.new(tc.outputs["Generated"], mp.inputs[0])
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(200))
    ln.new(mp.outputs[0], env.inputs[0])
    ln.new(env.outputs[0], nd["Background"].inputs[0])
    nd["Background"].inputs[1].default_value = 0.9
    # volumetric haze in the air: gives god rays from the sun and depth
    vol = nd.new("ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = 0.0035
    vol.inputs["Color"].default_value = (1.0, 0.86, 0.7, 1)
    vol.inputs["Anisotropy"].default_value = 0.55
    ln.new(vol.outputs[0], nd["World Output"].inputs["Volume"])
    # the sun, low and warm (moving clouds below cast moving shadows)
    sun = link(bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")))
    sun.data.energy = 4.5
    sun.data.color = (1.0, 0.78, 0.55)
    sun.data.angle = math.radians(1.2)
    sun.rotation_euler = Euler((math.radians(72), 0, math.radians(-125)))


def clouds():
    """a big curved sky card with drifting procedural clouds in front of the HDRI sky; the texture offset animates"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=400, segments=48, ring_count=24, location=(0, 0, -40))
    o = bpy.context.object
    o.name = "cloud_dome"
    o.scale = (1, 1, 0.35)
    m, nd, ln, b = new_mat("clouds")
    nd.remove(b)
    out = nd["Material Output"]
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    ln.new(tc.outputs["Object"], mp.inputs[0])
    mp.inputs["Scale"].default_value = (0.012, 0.012, 0.03)
    mp.inputs["Location"].keyframe_insert("default_value", frame=1)
    mp.inputs["Location"].default_value = (0.6, 0.25, 0)
    mp.inputs["Location"].keyframe_insert("default_value", frame=N)
    nz = nd.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.0
    nz.inputs["Detail"].default_value = 8
    nz.inputs["Roughness"].default_value = 0.6
    ln.new(mp.outputs[0], nz.inputs[0])
    ramp = nd.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.52
    ramp.color_ramp.elements[1].position = 0.75
    ln.new(nz.outputs[0], ramp.inputs[0])
    # height mask: clouds only in a band above the horizon
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Generated"], sep.inputs[0])
    band = nd.new("ShaderNodeMapRange")
    band.inputs["From Min"].default_value = 0.52
    band.inputs["From Max"].default_value = 0.75
    ln.new(sep.outputs[2], band.inputs[0])
    mul = nd.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    ln.new(ramp.outputs[0], mul.inputs[0])
    ln.new(band.outputs[0], mul.inputs[1])
    em = nd.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (1.0, 0.78, 0.62, 1)
    em.inputs["Strength"].default_value = 1.6
    tr = nd.new("ShaderNodeBsdfTransparent")
    mix = nd.new("ShaderNodeMixShader")
    ln.new(mul.outputs[0], mix.inputs[0])
    ln.new(tr.outputs[0], mix.inputs[1])
    ln.new(em.outputs[0], mix.inputs[2])
    ln.new(mix.outputs[0], out.inputs["Surface"])
    m.surface_render_method = "BLENDED"
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.flip()
    o.visible_shadow = False


# ------------------------------------------------------------------ sea, cliff, path
def sea():
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, -6))
    o = bpy.context.object
    o.name = "sea"
    oc = o.modifiers.new("ocean", "OCEAN")
    oc.resolution = 12
    oc.spatial_size = 120
    oc.repeat_x = 4
    oc.repeat_y = 4
    oc.wave_scale = 1.2
    oc.choppiness = 1.3
    oc.wind_velocity = 14
    oc.use_foam = False
    oc.time = 1
    oc.keyframe_insert("time", frame=1)
    oc.time = 1 + N / FPS
    oc.keyframe_insert("time", frame=N)
    set_linear(o)
    o.location = (-200, 40, -6)
    m = flat_mat("water", (0.03, 0.16, 0.22), rough=0.05)
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Specular IOR Level"].default_value = 0.8
    o.data.materials.append(m)
    smooth(o)


def terrain():
    # cliff top with a path: a subdivided plane shaped by displacement, grass and rock materials
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=160, y_subdivisions=160, size=60, location=(0, 10, 0))
    g = bpy.context.object
    g.name = "ground"
    for v in g.data.vertices:
        x, y = v.co.x, v.co.y + 10
        # a gentle hill rising toward the temple (+y), falling off to the sea on the left (-x)
        h = 0.06 * y + 0.4 * math.sin(x * 0.25) * math.cos(y * 0.2)
        if x < -12:
            h -= (x + 12) ** 2 * 0.35
        v.co.z = h
    smooth(g)
    dm = g.modifiers.new("detail", "DISPLACE")
    t = bpy.data.textures.new("lumps", "CLOUDS")
    t.noise_scale = 1.5
    dm.texture = t
    dm.strength = 0.25
    g.data.materials.append(tex_mat("grass", os.path.join(A, "ambientcg", "Grass004"), "Grass004_1K-JPG", scale=18, tint=(0.95, 0.85, 0.6)))
    g.data.uv_layers.active  # grid has UVs
    # the stone path: a strip of paving following the walk line x=0
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=8, y_subdivisions=120, size=1, location=(0, 0, 0))
    p = bpy.context.object
    p.name = "path"
    p.scale = (2.2, 40, 1)
    bpy.ops.object.transform_apply(scale=True)
    p.location = (0, 6, 0)
    for v in p.data.vertices:
        y = v.co.y + 6
        v.co.z = 0.06 * y + 0.4 * math.sin(v.co.x * 0.25) * math.cos(y * 0.2) + 0.08
    p.data.materials.append(tex_mat("paving", os.path.join(A, "ambientcg", "PavingStones130"), "PavingStones130_1K-JPG", scale=6, tint=(1.0, 0.92, 0.8)))
    smooth(p)
    return g


def ground_z(x, y):
    h = 0.06 * y + 0.4 * math.sin(x * 0.25) * math.cos(y * 0.2)
    return h


# ------------------------------------------------------------------ temple
def temple(marble):
    base = Vector((0, 30, ground_z(0, 30)))
    objs = []
    for i, (w, d, h) in enumerate([(16, 10, 0.35), (15.2, 9.2, 0.35), (14.4, 8.4, 0.35)]):
        bpy.ops.mesh.primitive_cube_add(location=base + Vector((0, 0, 0.175 + i * 0.35)))
        s = bpy.context.object
        s.scale = (w / 2, d / 2, h / 2)
        objs.append(s)
    top = base.z + 1.05
    # fluted Doric columns: a 20-sided cylinder with a bevel, plus capitals
    for side in (-1, 1):
        for k in range(6):
            x = -6.2 + k * 2.48
            for yy in ([-3.6, 3.6] if side < 0 else []):
                pass
    cols = [(-6.2 + k * 2.48, -3.6) for k in range(6)] + [(-6.2 + k * 2.48, 3.6) for k in range(6)] + [(-6.2, 0), (6.2, 0)]
    for (x, y) in cols:
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.55, depth=6.0, location=(x, base.y + y, top + 3.0))
        c = bpy.context.object
        sm = c.modifiers.new("taper", "SIMPLE_DEFORM")
        sm.deform_method = "TAPER"
        sm.factor = -0.12
        bv = c.modifiers.new("bev", "BEVEL")
        bv.width = 0.03
        objs.append(c)
        bpy.ops.mesh.primitive_cube_add(location=(x, base.y + y, top + 6.12))
        cap = bpy.context.object
        cap.scale = (0.68, 0.68, 0.12)
        objs.append(cap)
    # architrave, frieze and the pediment
    for z, sc in ((top + 6.55, (7.2, 4.3, 0.32)), (top + 7.15, (7.3, 4.4, 0.28))):
        bpy.ops.mesh.primitive_cube_add(location=(0, base.y, z))
        b = bpy.context.object
        b.scale = sc
        objs.append(b)
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=7.6, depth=8.8, location=(0, base.y, top + 8.3), rotation=(math.pi / 2, 0, 0))
    ped = bpy.context.object
    ped.scale = (1, 0.28, 1)
    ped.rotation_euler = (math.pi / 2, 0, 0)
    objs.append(ped)
    for o in objs:
        o.data.materials.append(marble)
    return base


def statue(marble, base):
    # a big seated goddess silhouette inside the cella (simple, read through the columns and haze)
    pass


# ------------------------------------------------------------------ olive trees, grass, rocks
def olive_tree(loc, scale, wind_e, wind_t, bark, leaf):
    bpy.ops.curve.primitive_bezier_curve_add(location=loc)
    cu = bpy.context.object
    sp = cu.data.splines[0]
    sp.bezier_points[0].co = (0, 0, 0)
    sp.bezier_points[0].handle_left = (0, 0, -0.5)
    sp.bezier_points[0].handle_right = (0.3 * scale, 0.1, 0.8 * scale)
    sp.bezier_points[1].co = (0.5 * scale, 0.2, 2.6 * scale)
    sp.bezier_points[1].handle_left = (0.1 * scale, 0.1, 1.8 * scale)
    sp.bezier_points[1].handle_right = (0.8 * scale, 0.3, 3.2 * scale)
    cu.data.bevel_depth = 0.16 * scale
    cu.data.bevel_resolution = 4
    sp.bezier_points[0].radius = 1.3
    sp.bezier_points[1].radius = 0.6
    cu.data.materials.append(bark)
    # canopy: clusters of displaced spheres that sway in the wind
    top = Vector(loc) + Vector((0.5 * scale, 0.2, 2.6 * scale))
    for i in range(7):
        off = Vector((random.uniform(-1.4, 1.4), random.uniform(-1.0, 1.0), random.uniform(-0.2, 1.0))) * scale
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=CANOPY_SUB, radius=random.uniform(0.7, 1.05) * scale, location=top + off)
        c = bpy.context.object
        c.scale = (1.2, 1.0, 0.75)
        d = c.modifiers.new("leaves", "DISPLACE")
        tt = bpy.data.textures.new("leafnoise", "VORONOI")
        tt.noise_scale = 0.25
        d.texture = tt
        d.strength = 0.35 * scale
        smooth(c)
        add_wind(c, wind_e, 0.18 * scale, wind_t)
        c.data.materials.append(leaf)


def grass_tufts(n, area, wind_e, wind_t, mat):
    """hundreds of real grass blades (thin bent cones) merged into one mesh, bent by the wind displacement"""
    import bmesh
    me = bpy.data.meshes.new("grass")
    bm = bmesh.new()
    for i in range(n):
        x = random.uniform(*area[0])
        y = random.uniform(*area[1])
        if abs(x) < 1.6:
            continue
        z = ground_z(x, y)
        for b in range(5):
            h = random.uniform(0.25, 0.6)
            a = random.uniform(0, math.tau)
            lean = random.uniform(-0.3, 0.3)
            bx, by = x + math.cos(a) * 0.05, y + math.sin(a) * 0.05
            w = 0.025
            v1 = bm.verts.new((bx - w * math.sin(a), by + w * math.cos(a), z))
            v2 = bm.verts.new((bx + w * math.sin(a), by - w * math.cos(a), z))
            v3 = bm.verts.new((bx + lean * h * math.cos(a), by + lean * h * math.sin(a), z + h))
            bm.faces.new((v1, v2, v3))
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new("grass", me))
    o.data.materials.append(mat)
    add_wind(o, wind_e, 0.12, wind_t)
    return o


# ------------------------------------------------------------------ brazier with fire (Mantaflow)
def brazier(loc, bronze):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.07, depth=1.1, location=Vector(loc) + Vector((0, 0, 0.55)))
    bpy.context.object.data.materials.append(bronze)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.18, radius2=0.45, depth=0.35, location=Vector(loc) + Vector((0, 0, 1.25)))
    bowl = bpy.context.object
    bowl.data.materials.append(bronze)
    # fire light that flickers
    L = link(bpy.data.objects.new("firelight", bpy.data.lights.new("firelight", "POINT")))
    L.location = Vector(loc) + Vector((0, 0, 1.7))
    L.data.color = (1.0, 0.55, 0.2)
    L.data.shadow_soft_size = 0.2
    for f in range(1, N + 1, 3):
        L.data.energy = 220 + 90 * math.sin(f * 0.9) + 60 * math.sin(f * 2.3 + 1)
        L.data.keyframe_insert("energy", frame=f)
    return Vector(loc) + Vector((0, 0, 1.45))


def fire_sim(at):
    """a real fluid fire simulation in a small domain over the brazier bowl (baked on the CPU)"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.28, location=at)
    em = bpy.context.object
    em.name = "fire_emitter"
    em.hide_render = True
    bpy.ops.object.modifier_add(type="FLUID")
    em.modifiers["Fluid"].fluid_type = "FLOW"
    fs = em.modifiers["Fluid"].flow_settings
    fs.flow_type = "FIRE"
    fs.flow_behavior = "INFLOW"
    fs.fuel_amount = 1.4
    fs.surface_distance = 0.1
    bpy.ops.mesh.primitive_cube_add(location=at + Vector((0, 0, 1.0)))
    dom = bpy.context.object
    dom.name = "fire_domain"
    dom.scale = (0.9, 0.9, 1.3)
    bpy.ops.object.modifier_add(type="FLUID")
    dom.modifiers["Fluid"].fluid_type = "DOMAIN"
    ds = dom.modifiers["Fluid"].domain_settings
    ds.domain_type = "GAS"
    ds.resolution_max = 48
    ds.use_noise = False
    ds.cache_frame_start = 1
    ds.cache_frame_end = N
    ds.cache_type = "ALL"
    ds.cache_directory = os.path.join(ROOT, "out", "blender", "firecache")
    ds.burning_rate = 0.65
    ds.flame_smoke = 0.6
    ds.vorticity = 0.25
    # fire shader: flame emission from the "flame" grid, soft smoke
    m = bpy.data.materials.new("fire")
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    nd.remove(nd["Principled BSDF"])
    pv = nd.new("ShaderNodeVolumePrincipled")
    pv.inputs["Density"].default_value = 3.0
    pv.inputs["Color"].default_value = (0.25, 0.22, 0.2, 1)
    pv.inputs["Blackbody Intensity"].default_value = 1.0
    at_ = nd.new("ShaderNodeAttribute")
    at_.attribute_name = "flame"
    ml = nd.new("ShaderNodeMath")
    ml.operation = "MULTIPLY"
    ml.inputs[1].default_value = 6.0
    ln.new(at_.outputs["Fac"], ml.inputs[0])
    ln.new(ml.outputs[0], pv.inputs["Emission Strength"])
    pv.inputs["Emission Color"].default_value = (1.0, 0.45, 0.1, 1)
    ln.new(pv.outputs[0], nd["Material Output"].inputs["Volume"])
    dom.data.materials.append(m)
    return dom


# ------------------------------------------------------------------ dust motes and seagulls
def dust(center):
    bpy.ops.mesh.primitive_cube_add(location=center)
    e = bpy.context.object
    e.name = "dust_emitter"
    e.scale = (6, 10, 2)
    e.hide_render = True
    ps = e.modifiers.new("dust", "PARTICLE_SYSTEM").particle_system.settings
    ps.count = 900
    ps.frame_start = -200
    ps.frame_end = N
    ps.lifetime = 400
    ps.emit_from = "VOLUME"
    ps.normal_factor = 0
    ps.effector_weights.gravity = 0
    ps.brownian_factor = 0.12
    ps.render_type = "OBJECT"
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.012, location=(0, 0, -50))
    mote = bpy.context.object
    mote.data.materials.append(flat_mat("mote", (1.0, 0.85, 0.6), emit=4.0))
    ps.instance_object = mote
    ps.particle_size = 1
    ps.size_random = 0.7


def seagull(path_start, path_end, phase):
    """a low-poly gull: body + two wings that flap (shape keys driven by keyframes) flying along a line"""
    import bmesh
    me = bpy.data.meshes.new("gull")
    bm = bmesh.new()
    body = [bm.verts.new(v) for v in [(0.35, 0, 0), (-0.35, 0, 0.02), (0, 0.07, 0.06), (0, -0.07, 0.06), (0, 0, -0.06)]]
    bm.faces.new((body[0], body[2], body[1]))
    bm.faces.new((body[0], body[1], body[3]))
    bm.faces.new((body[0], body[4], body[2]))
    bm.faces.new((body[0], body[3], body[4]))
    for s in (1, -1):
        a = bm.verts.new((0.08, 0.05 * s, 0.03))
        b = bm.verts.new((-0.1, 0.05 * s, 0.03))
        c = bm.verts.new((-0.05, 0.75 * s, 0.05))
        bm.faces.new((a, b, c))
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new("gull", me))
    o.data.materials.append(flat_mat("gull_mat", (0.95, 0.95, 0.93), 0.7))
    o.shape_key_add(name="Basis")
    k = o.shape_key_add(name="up")
    for i, v in enumerate(k.data):
        if abs(v.co.y) > 0.6:
            v.co.z += 0.45
    k2 = o.shape_key_add(name="down")
    for i, v in enumerate(k2.data):
        if abs(v.co.y) > 0.6:
            v.co.z -= 0.35
    for f in range(1, N + 1, 2):
        ph = f * 0.55 + phase
        k.value = max(0, math.sin(ph))
        k2.value = max(0, -math.sin(ph))
        k.keyframe_insert("value", frame=f)
        k2.keyframe_insert("value", frame=f)
    o.location = path_start
    o.keyframe_insert("location", frame=1)
    o.location = path_end
    o.keyframe_insert("location", frame=N)
    d = Vector(path_end) - Vector(path_start)
    o.rotation_euler = (0, 0, math.atan2(d.y, d.x))
    o.scale = (1.4, 1.4, 1.4)
    set_linear(o)


# ------------------------------------------------------------------ the hero (CC0 KayKit rig and animations)
def hero(bronze_tint=(1.0, 0.72, 0.42)):
    bpy.ops.import_scene.gltf(filepath=os.path.join(A, "blender", "kaykit", "Knight.glb"))
    objs = list(bpy.context.selected_objects)
    rig = [o for o in objs if o.type == "ARMATURE"][0]
    for o in objs:
        if o.name.split(".")[0] in ("2H_Sword", "Badge_Shield", "Rectangle_Shield", "Spike_Shield", "1H_Sword_Offhand", "Icosphere"):
            bpy.data.objects.remove(o, do_unlink=True)
    meshes = [o for o in bpy.data.objects if o.type == "MESH" and o.parent == rig or (o.type == "MESH" and o.name.startswith(("Knight_", "Round_Shield", "1H_Sword")))]
    # Greek bronze: the armour pieces get a warm hue shift; the head (skin, face) keeps its own colours
    base_mat = bpy.data.materials["knight_texture"]
    bronze = base_mat.copy()
    bronze.name = "hero_bronze"
    nt = bronze.node_tree
    tex = [n for n in nt.nodes if n.type == "TEX_IMAGE"][0]
    bsdf = nt.nodes["Principled BSDF"]
    hs = nt.nodes.new("ShaderNodeHueSaturation")
    hs.inputs["Hue"].default_value = 0.08
    hs.inputs["Saturation"].default_value = 1.25
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs[0].default_value = 0.85
    nt.links.new(tex.outputs[0], hs.inputs["Color"])
    nt.links.new(hs.outputs[0], mix.inputs[6])
    mix.inputs[7].default_value = (*bronze_tint, 1)
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    bsdf.inputs["Metallic"].default_value = 0.35
    bsdf.inputs["Roughness"].default_value = 0.4
    for o in bpy.data.objects:
        if o.type == "MESH" and o.name.startswith(("Knight_Helmet", "Knight_Body", "Knight_Arm", "Knight_Leg", "Round_Shield")):
            o.data.materials[0] = bronze
    for o in bpy.data.objects:
        if o.type == "MESH" and (o.name.startswith("Knight_") or o.name.startswith(("Round_Shield", "1H_Sword"))):
            s = o.modifiers.new("smooth", "SUBSURF")
            s.levels = 1
            s.render_levels = 2
            smooth(o)
    # red cloak instead of the blue cape
    cape = bpy.data.objects.get("Knight_Cape")
    if cape:
        cm = flat_mat("cloak", (0.45, 0.05, 0.04), 0.75)
        cape.data.materials[0] = cm
    return rig


def play(rig, name, start, end, speed=1.0, blend=6):
    """put an action on the rig's NLA as a strip from frame `start` to `end`, looped"""
    act = bpy.data.actions.get(name)
    if not rig.animation_data:
        rig.animation_data_create()
    tr = rig.animation_data.nla_tracks.new()
    st = tr.strips.new(name, int(start), act)
    st.scale = 1.0 / speed
    length = (act.frame_range[1] - act.frame_range[0]) / speed
    st.repeat = max(1.0, (end - start) / max(length, 1))
    st.blend_in = blend
    st.blend_out = blend
    st.extrapolation = "NOTHING"
    return st


# ------------------------------------------------------------------ camera
def camera(rig):
    cam = link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    bpy.context.scene.camera = cam
    cam.data.lens = 35
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = 2.2
    cam.data.dof.focus_object = rig
    cam.data.sensor_width = 36
    track = cam.constraints.new("TRACK_TO")
    tgt = link(bpy.data.objects.new("look", None))
    track.target = tgt
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    return cam, tgt


def key(o, attr, frame, value, interp="BEZIER"):
    setattr(o, attr, value)
    o.keyframe_insert(attr, frame=frame)


# ------------------------------------------------------------------ build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, N
    world()
    clouds()
    sea()
    terrain()
    marble = tex_mat("marble", os.path.join(A, "blender", "Marble012"), "Marble012_2K-JPG", scale=2, tint=(1.0, 0.95, 0.88))
    tbase = temple(marble)
    bark = flat_mat("bark", (0.16, 0.12, 0.09), 0.9)
    leaf = flat_mat("leaf", (0.12, 0.2, 0.08), 0.7)
    wt = wind_texture("gust", 3.0)
    we = wind_driver_empty("wind", (1.6, 0.6))
    for loc, s in [((-6, 8), 1.2), ((5.5, 12), 1.0), ((-8, 20), 1.4), ((7.5, 22), 1.1), ((-4.5, -2), 0.9), ((9, 4), 1.3)]:
        olive_tree((loc[0], loc[1], ground_z(*loc)), s, we, wt, bark, leaf)
    grass_tufts(1800, ((-14, 14), (-8, 26)), we, wt, flat_mat("grassblade", (0.28, 0.3, 0.1), 0.8))
    bronze = flat_mat("bronze", (0.55, 0.32, 0.12), 0.35, metal=0.9)
    fires = [brazier((-2.2, 23.5, ground_z(-2.2, 23.5)), bronze), brazier((2.2, 23.5, ground_z(2.2, 23.5)), bronze)]
    if "--fire" in args:
        for f in fires:
            fire_sim(f)
    dust(Vector((0, 8, 2.5)))
    seagull((-40, 30, 14), (30, 10, 18), 0)
    seagull((-45, 36, 16), (25, 16, 19), 1.7)
    seagull((-38, 26, 12), (34, 4, 15), 3.1)
    # hero: walks up the path, slows, stops and looks up at the temple
    rig = hero()
    rig.rotation_mode = "XYZ"
    rig.scale = (0.9, 0.9, 0.9)
    walk_end = 210
    for f, y in ((1, -4.0), (walk_end, 14.0)):
        rig.location = (0, y, ground_z(0, y) + 0.08)
        rig.keyframe_insert("location", frame=f)
    rig.location = (0, 14.35, ground_z(0, 14.35) + 0.08)
    rig.keyframe_insert("location", frame=walk_end + 18)
    rig.rotation_euler = (0, 0, 0)  # KayKit faces +Y? (checked in the stills)
    rig.keyframe_insert("rotation_euler", frame=1)
    play(rig, "Walking_A", 1, walk_end + 10, speed=1.0, blend=0)
    play(rig, "Idle", walk_end, N, blend=12)
    # camera: wide crane shot behind/side, tracking him, then swinging round to a low close-up as he looks up
    cam, tgt = camera(rig)
    for f, cl, tl, lens in ((1, (6.5, -12, 3.2), (0, -3, 1.4), 30), (120, (5.0, 1.0, 2.2), (0, 6, 1.3), 32), (210, (2.8, 10.5, 1.4), (0, 14, 1.2), 40),
                             (260, (1.2, 17.5, 1.25), (0, 14.4, 1.35), 50), (300, (0.9, 17.0, 1.1), (0, 14.4, 1.5), 55)):
        cam.location = cl
        cam.keyframe_insert("location", frame=f)
        tgt.location = (tl[0], tl[1], ground_z(tl[0], tl[1]) + tl[2])
        tgt.keyframe_insert("location", frame=f)
        cam.data.lens = lens
        cam.data.keyframe_insert("lens", frame=f)
    # render settings
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "32"))
    if hasattr(ee, "use_volumetric_shadows"):
        ee.use_volumetric_shadows = True
    if hasattr(ee, "volumetric_tile_size"):
        ee.volumetric_tile_size = "8"
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = True
    if hasattr(ee, "use_shadows"):
        ee.use_shadows = True
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    res = int(arg("--res", "720"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(res * 16 / 9)
    sc.render.image_settings.file_format = "PNG"
    return sc


if __name__ == "__main__":
    sc = build()
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
    out = os.path.abspath(arg("--out", "out/blender/test/f_"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if "--fire" in args:
        for o in bpy.data.objects:
            if o.name.startswith("fire_domain"):
                bpy.context.view_layer.objects.active = o
                with bpy.context.temp_override(object=o, active_object=o):
                    bpy.ops.fluid.bake_all()
    frames = arg("--frames")
    if frames:
        for f in [int(x) for x in frames.split(",")]:
            sc.frame_set(f)
            sc.render.filepath = f"{out}{f:04d}.png"
            bpy.ops.render.render(write_still=True)
            print("frame", f, flush=True)
    else:
        sc.render.filepath = out
        bpy.ops.render.render(animation=True)
