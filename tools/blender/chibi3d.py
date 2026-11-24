# Original chibi characters built in Blender (bpy): a big soft-shaded round head with small simple features, a compact
# body, jointed arms/legs as separate objects (so they can be keyframed), inverted-hull outlines, soft 3-point light.
# Renders with a transparent background so the figure can be composited over the painted backgrounds in Remotion.
# usage: .venv-bpy/bin/python tools/blender/chibi3d.py out.png [look] [engine]
import math
import sys

import bpy
from mathutils import Vector

OUTLINE = (0.025, 0.017, 0.014, 1)


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(name, rgb, rough=0.55, emit=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = 0.25
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


def outline_mat():
    m = bpy.data.materials.get("outline")
    if m:
        return m
    m = bpy.data.materials.new("outline")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    # inverted hull: the shell's faces that point at the camera (after the normal flip) are its far side, which peeks
    # out around the silhouette; the near side is back-facing and made fully transparent
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = OUTLINE
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    mix = nt.nodes.new("ShaderNodeMixShader")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(geo.outputs["Backfacing"], mix.inputs[0])
    nt.links.new(em.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    m.use_backface_culling = True
    return m


def finish(o, m, outline=0.012, smooth=True, subsurf=1):
    o.data.materials.append(m)
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    if subsurf:
        s = o.modifiers.new("sub", "SUBSURF")
        s.levels = subsurf
        s.render_levels = subsurf
    if outline:
        o.data.materials.append(outline_mat())
        sol = o.modifiers.new("outline", "SOLIDIFY")
        sol.thickness = outline / max(min(o.scale), 0.05)
        sol.offset = 1
        sol.use_flip_normals = True
        sol.material_offset = 1
    return o


def sphere(name, loc, scale, m, parent=None, outline=0.012, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    if parent:
        o.parent = parent
    return finish(o, m, outline, subsurf=0)


def cyl(name, loc, r1, r2, depth, m, parent=None, outline=0.012, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if parent:
        o.parent = parent
    return finish(o, m, outline, subsurf=0)


def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    if parent:
        o.parent = parent
    return o


def limb(name, pivot, length, r, m_sleeve, m_end, end_r, parent):
    """an arm or leg: an empty at the joint (rotate it to pose), a rounded capsule and a hand/foot at the end"""
    j = empty(name, pivot, parent)
    cyl(name + "_seg", (0, 0, -length / 2), r, r * 0.9, length, m_sleeve, parent=j)
    sphere(name + "_top", (0, 0, 0), (r, r, r), m_sleeve, parent=j)
    sphere(name + "_end", (0, 0, -length), (end_r, end_r, end_r), m_end, parent=j)
    return j


LOOKS = {
    "medusa": dict(skin=(0.95, 0.84, 0.7), hair=(0.045, 0.026, 0.018), robe=(0.9, 0.87, 0.8), trim=(0.3, 0.45, 0.62), female=True),
}


def build(look):
    L = LOOKS[look]
    skin, hair, robe, trim = mat("skin", L["skin"], 0.6), mat("hair", L["hair"], 0.45), mat("robe", L["robe"], 0.7), mat("trim", L["trim"], 0.5)
    white, dark, mouth = mat("eyewhite", (0.97, 0.96, 0.93), 0.3), mat("ink", (0.08, 0.06, 0.05), 0.3), mat("mouth", (0.35, 0.12, 0.1), 0.5)
    sandal = mat("sandal", (0.36, 0.22, 0.12), 0.7)
    root = empty("root", (0, 0, 0))
    # body: a soft bell-shaped robe
    body = empty("body", (0, 0, 0.42), root)
    cyl("robe", (0, 0, -0.06), 0.3, 0.15, 0.46, robe, parent=body)
    cyl("hem", (0, 0, -0.27), 0.306, 0.29, 0.04, trim, parent=body, outline=0.008)
    cyl("belt", (0, 0, 0.04), 0.205, 0.195, 0.03, trim, parent=body, outline=0.008)
    # legs (mostly hidden by the robe) and sandals
    for side in (-1, 1):
        lg = limb("leg" + ("L" if side < 0 else "R"), (side * 0.08, 0, 0.2), 0.14, 0.05, skin, sandal, 0.06, root)
    # arms
    for side in (-1, 1):
        a = limb("arm" + ("L" if side < 0 else "R"), (side * 0.19, -0.02, 0.56), 0.22, 0.055, robe, skin, 0.06, root)
        a.rotation_euler = (0.15, side * 0.45, 0)
    # head
    head = empty("head", (0, 0, 0.92), root)
    sphere("skull", (0, 0, 0), (0.36, 0.34, 0.33), skin, parent=head, outline=0.014, seg=64)
    # face on the -Y side (towards the camera), small and low
    for side in (-1, 1):
        ex = side * 0.12
        e = sphere("eye" + str(side), (ex, -0.31, -0.04), (0.06, 0.03, 0.04), white, parent=head, outline=0.006)
        sphere("pupil" + str(side), (ex + 0.008, -0.333, -0.045), (0.022, 0.015, 0.024), dark, parent=head, outline=0)
        b = cyl("brow" + str(side), (ex, -0.31, 0.06), 0.008, 0.008, 0.09, dark, parent=head, outline=0, rot=(0, math.pi / 2 + side * 0.12, 0))
        if L.get("female"):
            cyl("lash" + str(side), (ex + side * 0.065, -0.315, -0.01), 0.006, 0.004, 0.035, dark, parent=head, outline=0, rot=(0, side * 0.9, 0))
    sphere("mouth", (0.0, -0.325, -0.15), (0.03, 0.012, 0.012), mouth, parent=head, outline=0)
    for side in (-1, 1):
        sphere("cheek" + str(side), (side * 0.2, -0.27, -0.1), (0.05, 0.02, 0.03), mat("blush", (0.95, 0.6, 0.55), 0.8), parent=head, outline=0)
    # hair: a cap over the top/back with a parted fringe, plus long hair down the back
    sphere("haircap", (0, 0.03, 0.05), (0.375, 0.36, 0.33), hair, parent=head, outline=0.014, seg=96)
    cut = sphere("capcut", (0, -0.35, -0.12), (0.34, 0.25, 0.25), hair, parent=head, outline=0, seg=64)
    bo = bpy.data.objects["haircap"].modifiers.new("cut", "BOOLEAN")
    bo.object = cut
    bo.operation = "DIFFERENCE"
    bpy.data.objects["haircap"].modifiers.move(len(bpy.data.objects["haircap"].modifiers) - 1, 0)
    cut.hide_render = True
    cut.hide_viewport = True
    sphere("hairback", (0, 0.12, -0.3), (0.34, 0.2, 0.42), hair, parent=head, outline=0.014, seg=32)
    for side in (-1, 1):
        sphere("lock" + str(side), (side * 0.3, 0.06, -0.3), (0.08, 0.1, 0.3), hair, parent=head, outline=0.012, seg=32)
    return root


def stage(w, h, engine):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.film_transparent = True
    sc.render.engine = engine
    if engine == "CYCLES":
        sc.cycles.samples = 24
        sc.cycles.use_denoising = True
        sc.cycles.device = "CPU"
    sc.view_settings.view_transform = "Standard"
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.lens = 70
    cam.location = (1.7, -3.9, 1.15)
    d = Vector((0, 0, 0.72)) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.72, 0.8, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    if engine == "BLENDER_EEVEE":
        sc.eevee.taa_render_samples = 48
    for name, loc, energy, col in (("key", (3, -3, 4), 3.2, (1, 0.94, 0.86)), ("fill", (-3, -2, 1), 0.8, (0.85, 0.85, 1.0)), ("rim", (-2, 3, 3), 3.0, (0.8, 0.85, 1.0))):
        l = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN"))
        sc.collection.objects.link(l)
        l.data.energy = energy
        l.data.color = col
        l.data.angle = 0.3
        l.rotation_euler = (Vector((0, 0, 0.7)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


if __name__ == "__main__":
    out = sys.argv[1]
    look = sys.argv[2] if len(sys.argv) > 2 else "medusa"
    engine = sys.argv[3] if len(sys.argv) > 3 else "BLENDER_EEVEE_NEXT"
    clear()
    build(look)
    stage(540, 960, engine)
    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("wrote", out)
