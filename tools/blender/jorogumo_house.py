# 3D sets for "Jorogumo: The Spider Woman" (Japanese legend), same look as the Tsavo Short: real lit Blender sets (EEVEE),
# NO characters; the flat 2D cast is drawn in Remotion on top through the same camera (cam.json per frame).
# Set: an abandoned house at night. Worn tatami, old dark posts and beams, shoji screens glowing with moonlight
# (some panes torn), faded fusuma doors, a paper floor lantern (andon), a cushion, and cobwebs in the corners.
# usage: .venv-bpy/bin/python tools/blender/jorogumo_house.py -- --shot chartest --out out/jorogumo/sets/chartest/ [--res 720]
import json
import math
import os
import random
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import test_scene as ts  # noqa: E402

arg = ts.arg
rnd = random.Random(1603)

SHOTS = {
    # character test plate: still camera, low at the room's front edge, looking at the shoji wall; walks cross the frame
    # v2: lower, closer and wider so the room fills the 9:16 frame (ceiling beams above, tatami below), shallow focus
    # on the walk line 2.1 m in front of the lens, a dark post and a hanging web close to the lens for depth
    "chartest": dict(n=1, keys=[(1, (0.0, -3.4, 1.12), (0.0, 6.0, 0.95), 22)], focus=(0.0, -1.3, 0.9), fstop=2.4),
    # Part A opening (line 1): ONE tall still (1:2.67) looking from the room into the back-left ceiling corner where the
    # old spider lives; Remotion pans a 9:16 window over it (rafters first, then a slow tilt down onto the moonlit shoji
    # and the tatami), so the move is smooth at 30 fps without rendering a moving Blender camera
    "rafters": dict(n=1, keys=[(1, (-2.0, 3.2, 1.0), (-4.2, 6.0, 1.0), 15)], focus=(-4.0, 5.8, 2.4), fstop=5.6, ar=8 / 3),
    # Part B close-up: lens a hand above the tatami, looking along the floor past his folded feet toward the lantern;
    # the feet are drawn in Remotion at (-0.25, 0.2, 0) in sharp focus, the lantern glows out of focus behind
    "anklecu": dict(n=1, keys=[(1, (-0.3, -0.85, 0.2), (0.6, 3.0, 0.12), 24)], focus=(-0.25, 0.2, 0.06), fstop=1.8),
    # Part D (dawn, render with --light dawn): the empty room the morning after, her biwa left on the tatami and a
    # trail of black drips running to the back-left corner post and up it into the rafters
    "dawn_wide": dict(n=1, keys=[(1, (2.0, -1.3, 1.2), (-0.7, 3.4, 0.3), 20)], focus=(0.9, 1.0, 0.1), fstop=4.0),
    # the trail and the climb up the wall into the rafters: ONE tall plate (--tall 2.2) panned bottom to top in Remotion
    "dawn_climb": dict(n=1, keys=[(1, (-2.55, 3.45, 1.25), (-4.1, 5.8, 1.25), 19)], focus=(-3.9, 5.4, 1.0), fstop=5.6),
}
LIGHT = arg("--light", "night")
SHOT = arg("--shot", "chartest")
W, D0, D1, H = 4.2, -5.0, 6.0, 2.7  # room half-width, front/back wall y, ceiling height


def wood_mat(name, a, b, stretch=18.0, rough=0.75):
    m, nd, ln, bs = ts.new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 1.0, stretch)
    ln.new(tc.outputs["Object"], mp.inputs[0])
    no = nd.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = 6.0
    no.inputs["Detail"].default_value = 8.0
    ln.new(mp.outputs[0], no.inputs["Vector"])
    ramp = nd.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*a, 1)
    ramp.color_ramp.elements[1].color = (*b, 1)
    ln.new(no.outputs["Fac"], ramp.inputs[0])
    ln.new(ramp.outputs[0], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = rough
    return m


def stain_mat(name, base, dark, scale=3.0, rough=0.9, emit=None, emit_k=0.0):
    """flat colour with blotchy age stains (plaster, paper, cloth)"""
    m, nd, ln, bs = ts.new_mat(name)
    no = nd.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = scale
    no.inputs["Detail"].default_value = 6.0
    ramp = nd.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].position = 0.7
    ramp.color_ramp.elements[1].color = (*base, 1)
    ln.new(no.outputs["Fac"], ramp.inputs[0])
    ln.new(ramp.outputs[0], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = rough
    if emit:
        bs.inputs["Emission Color"].default_value = (*emit, 1)
        mm = nd.new("ShaderNodeMath")
        mm.operation = "MULTIPLY"
        mm.inputs[1].default_value = emit_k
        ln.new(no.outputs["Fac"], mm.inputs[0])
        ln.new(mm.outputs[0], bs.inputs["Emission Strength"])
    return m


def tatami_mat():
    m, nd, ln, bs = ts.new_mat("tatami")
    tc = nd.new("ShaderNodeTexCoord")
    wv = nd.new("ShaderNodeTexWave")
    wv.inputs["Scale"].default_value = 70.0
    wv.inputs["Distortion"].default_value = 1.5
    ln.new(tc.outputs["Object"], wv.inputs["Vector"])
    no = nd.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = 2.5
    mixc = nd.new("ShaderNodeMix")
    mixc.data_type = "RGBA"
    mixc.inputs[6].default_value = (0.5, 0.42, 0.24, 1)
    mixc.inputs[7].default_value = (0.66, 0.57, 0.34, 1)
    ln.new(wv.outputs["Fac"], mixc.inputs[0])
    dk = nd.new("ShaderNodeMix")
    dk.data_type = "RGBA"
    dk.blend_type = "MULTIPLY"
    dk.inputs[0].default_value = 0.6
    ln.new(mixc.outputs[2], dk.inputs[6])
    rm = nd.new("ShaderNodeValToRGB")
    rm.color_ramp.elements[0].color = (0.45, 0.4, 0.32, 1)
    rm.color_ramp.elements[1].color = (1, 1, 1, 1)
    ln.new(no.outputs["Fac"], rm.inputs[0])
    ln.new(rm.outputs[0], dk.inputs[7])
    ln.new(dk.outputs[2], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.85
    return m


def box(name, loc, size, m, rot=0.0, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = size
    o.rotation_euler[2] = rot
    if bevel:
        bv = o.modifiers.new("bv", "BEVEL")
        bv.width, bv.segments = bevel, 2
    o.data.materials.append(m)
    return o


def plane(name, loc, size, rot, m):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = (size[0], size[1], 1)
    o.data.materials.append(m)
    return o


def curve(name, pts, m, r=0.0025):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (*q, 1)
    o = ts.link(bpy.data.objects.new(name, cu))
    o.data.materials.append(m)
    return o


def tatami(m, edge):
    """worn mats laid in staggered rows (each row offset half a mat); black cloth borders along the long sides"""
    row, y = 0, D0
    while y < D1 - 0.05:
        d = min(0.9, D1 - y)
        x = -W - (0.9 if row % 2 else 0.0)
        while x < W - 0.05:
            x0, x1 = max(x, -W), min(x + 1.8, W)
            if x1 - x0 > 0.05:
                cx, cy, w = (x0 + x1) / 2, y + d / 2, x1 - x0
                o = box(f"mat{row}_{x:.1f}", (cx, cy, 0.025), (w - 0.012, d - 0.012, 0.05), m, bevel=0.01)
                o.color = (rnd.uniform(0.8, 1.0),) * 3 + (1,)
                for sgn in (-1, 1):
                    box("edge", (cx, cy + sgn * (d / 2 - 0.025), 0.03), (w - 0.012, 0.045, 0.052), edge)
            x += 1.8
        y += 0.9
        row += 1
    box("subfloor", (0, (D0 + D1) / 2, -0.01), (2 * W, D1 - D0, 0.02), edge)


def shoji(x0, x1, y, wood, paper, torn):
    """sliding paper screens: a wooden lattice over moonlit paper, some panes torn out"""
    hgt, cols, rows = 1.9, 4, 7
    n = int(round((x1 - x0) / 0.95))
    pw = (x1 - x0) / n
    for i in range(n):
        cx = x0 + pw * (i + 0.5)
        yy = y - (0.03 if i % 2 else 0.0)
        for s in (-1, 1):
            box("stile", (cx + s * (pw / 2 - 0.025), yy, hgt / 2), (0.05, 0.035, hgt), wood)
        for z in (0.03, hgt - 0.03):
            box("rail", (cx, yy, z), (pw, 0.035, 0.06), wood)
        for c in range(1, cols):
            box("kumiko", (cx - pw / 2 + c * pw / cols, yy - 0.004, hgt / 2), (0.012, 0.02, hgt - 0.1), wood)
        for r in range(1, rows):
            box("kumiko", (cx, yy - 0.004, 0.06 + r * (hgt - 0.12) / rows), (pw - 0.06, 0.02, 0.012), wood)
        for c in range(cols):
            for r in range(rows):
                if (i, c, r) in torn:
                    continue
                plane("pane", (cx - pw / 2 + 0.025 + (c + 0.5) * (pw - 0.05) / cols, yy + 0.012, 0.06 + (r + 0.5) * (hgt - 0.12) / rows),
                      ((pw - 0.05) / cols, (hgt - 0.12) / rows), (math.radians(90), 0, 0), paper)
    box("lintel", ((x0 + x1) / 2, y, hgt + 0.05), (x1 - x0, 0.1, 0.1), wood)


def andon(loc, wood, glow, lit=True):
    x, y = loc
    for dx in (-0.14, 0.14):
        for dy in (-0.14, 0.14):
            box("leg", (x + dx, y + dy, 0.33), (0.03, 0.03, 0.66), wood)
    pa = box("paper", (x, y, 0.42), (0.26, 0.26, 0.4), glow)
    pa.visible_shadow = False
    for z in (0.2, 0.63):
        box("ring", (x, y, z), (0.31, 0.31, 0.03), wood)
    box("base", (x, y, 0.06), (0.32, 0.32, 0.03), wood)
    if not lit:
        return
    li = bpy.data.lights.new("lamp", "POINT")
    li.energy, li.color, li.shadow_soft_size = 45, (1.0, 0.5, 0.2), 0.1
    o = ts.link(bpy.data.objects.new("lamp", li))
    o.location = (x, y, 0.42)


def cobweb(corner, out1, out2, m, n_rad=7, n_ring=6):
    """a sagging corner web between two edges meeting at `corner`"""
    import mathutils as mu
    c, a, b = mu.Vector(corner), mu.Vector(out1), mu.Vector(out2)
    spokes = []
    for k in range(n_rad):
        t = k / (n_rad - 1)
        e = a.lerp(b, t)
        e = c + (e - c) * rnd.uniform(0.75, 1.0)
        spokes.append(e)
        curve("spoke", [tuple(c), tuple(c.lerp(e, 0.5) + mu.Vector((0, 0, -0.03))), tuple(e)], m)
    for r in range(1, n_ring + 1):
        f = r / (n_ring + 0.6)
        pts = []
        for k in range(n_rad):
            p = c.lerp(spokes[k], f)
            pts.append(tuple(p))
            if k < n_rad - 1:
                q = c.lerp(spokes[k + 1], f)
                mid = p.lerp(q, 0.5) - (p.lerp(q, 0.5) - c) * 0.12 + mu.Vector((0, 0, -0.02 * f))
                pts.append(tuple(mid))
        curve("ring", pts, m, r=0.0016)


def biwa(loc, rot):
    """her lute, dropped on the tatami: a lacquered pear-shaped body, a short neck with a bent-back pegbox, four strings"""
    lac = stain_mat("lacquer", (0.26, 0.11, 0.05), (0.1, 0.04, 0.02), scale=6.0, rough=0.35)
    pale = ts.flat_mat("biwaface", (0.36, 0.17, 0.07), rough=0.45)
    x, y = loc
    c, sn = math.cos(rot), math.sin(rot)
    P = lambda u, v, z: (x + u * c - v * sn, y + u * sn + v * c, z)  # noqa: E731  (u along the neck)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=P(0, 0, 0.05))
    b = bpy.context.object
    b.scale, b.rotation_euler[2] = (0.27, 0.17, 0.045), rot
    b.data.materials.append(lac)
    ts.smooth(b)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=P(0.0, 0, 0.068))
    f = bpy.context.object
    f.scale, f.rotation_euler[2] = (0.25, 0.155, 0.03), rot
    f.data.materials.append(pale)
    ts.smooth(f)
    box("neck", P(0.36, 0, 0.07), (0.24, 0.045, 0.03), lac, rot=rot, bevel=0.008)
    pb = box("pegbox", P(0.53, 0, 0.055), (0.13, 0.05, 0.03), lac, rot=rot, bevel=0.008)
    pb.rotation_euler[1] = math.radians(18)
    for k, du in enumerate((0.49, 0.53, 0.57, 0.61)):
        box("peg", P(du, 0.045 * (1 if k % 2 else -1), 0.06), (0.012, 0.07, 0.012), lac, rot=rot)
    box("bridge", P(-0.13, 0, 0.1), (0.02, 0.1, 0.012), ts.flat_mat("bridge", (0.05, 0.03, 0.02)), rot=rot)
    sm_ = ts.flat_mat("silk", (0.85, 0.8, 0.7), rough=0.4)
    for v in (-0.033, -0.011, 0.011, 0.033):
        curve("string", [P(-0.13, v, 0.105), P(0.48, v * 0.6, 0.09)], sm_, r=0.0012)
    # the bachi (plectrum) fell beside it
    bc = box("bachi", P(0.05, -0.32, 0.012), (0.16, 0.09, 0.01), ts.flat_mat("bachi", (0.55, 0.48, 0.36), rough=0.5), rot=rot + 0.9)
    bc.scale[1] = 0.07


def blood_trail(m):
    """dark drips (legend's black blood, never a body): from the cushion to the back-left corner post, then up it"""
    r = random.Random(77)
    a, b = (0.55, 0.75), (-4.1, 5.5)
    n = 44
    for i in range(n):
        k = i / (n - 1)
        x = a[0] + (b[0] - a[0]) * k + 0.18 * math.sin(k * 7.0)
        y = a[1] + (b[1] - a[1]) * k + 0.12 * math.sin(k * 5.0 + 1)
        for j in range(r.choice((1, 1, 2))):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=(x + r.uniform(-0.05, 0.05), y + r.uniform(-0.05, 0.05), 0.0505))
            o = bpy.context.object
            s = r.uniform(0.012, 0.035) * (1.2 if j == 0 else 0.55)
            o.scale = (s * r.uniform(1.0, 3.2), s * r.uniform(0.6, 1.0), 0.0015)
            o.rotation_euler[2] = math.atan2(b[1] - a[1], b[0] - a[0]) + r.uniform(-0.4, 0.4)
            o.data.materials.append(m)
            ts.smooth(o)
    # up the wall beside the corner post (pale plaster, so the dark runs read), wavering up to the beam and the web
    for i in range(46):
        k = i / 45
        z = 0.05 + k * (H - 0.15)
        y = 5.55 + 0.12 * math.sin(k * 9.0) + r.uniform(-0.04, 0.04)
        x = -W + (0.028 if z < 0.9 else 0.004)
        ln = r.uniform(0.03, 0.09)
        o = box("smear", (x, y, z), (0.003, r.uniform(0.015, 0.045), ln), m)
        if r.random() < 0.35:  # a drip running down from it
            dl = r.uniform(0.06, 0.25)
            box("run", (x, y + r.uniform(-0.01, 0.01), z - dl / 2), (0.003, 0.007, dl), m)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 30
    wo = bpy.data.worlds.new("night")
    wo.use_nodes = True
    DAWN = LIGHT == "dawn"
    wo.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.024, 0.032, 1) if DAWN else (0.004, 0.006, 0.014, 1)
    wo.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    vol = wo.node_tree.nodes.new("ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = 0.03 if DAWN else 0.022
    vol.inputs["Anisotropy"].default_value = 0.35
    vol.inputs["Color"].default_value = (0.7, 0.75, 0.9, 1)
    wo.node_tree.links.new(vol.outputs[0], wo.node_tree.nodes["World Output"].inputs["Volume"])
    sc.world = wo

    wood = wood_mat("oldwood", (0.06, 0.035, 0.022), (0.17, 0.1, 0.06))
    beam = wood_mat("beam", (0.04, 0.025, 0.018), (0.12, 0.075, 0.045))
    tatami(tatami_mat(), ts.flat_mat("cloth", (0.03, 0.03, 0.035), rough=0.9))
    # moonlit paper with water stains; the moon is behind it
    paper = stain_mat("paper", (0.78, 0.8, 0.86), (0.5, 0.48, 0.42), scale=4.0, rough=0.9, emit=(0.78, 0.8, 0.86) if DAWN else (0.6, 0.7, 1.0), emit_k=0.8 if DAWN else 0.55)
    torn = {(0, 1, 2), (0, 2, 2), (0, 1, 3), (1, 3, 5), (2, 0, 1), (2, 1, 1), (3, 2, 4), (3, 2, 5), (3, 3, 5), (4, 0, 6)}
    shoji(-W, W, D1, wood, paper, torn)
    plaster = stain_mat("plaster", (0.22, 0.19, 0.15), (0.08, 0.07, 0.06), scale=2.0)
    box("ranma", (0, D1 + 0.02, (1.95 + H) / 2 + 0.05), (2 * W, 0.06, H - 1.95), plaster)
    # outside: a dark moonlit garden wall far behind the torn panes
    box("outside", (0, D1 + 3.0, 1.5), (14, 0.1, 5), stain_mat("garden", (0.05, 0.07, 0.12), (0.02, 0.03, 0.05), emit=(0.25, 0.32, 0.5), emit_k=0.5)).visible_shadow = not DAWN
    # left wall: stained plaster over a plank wainscot; right wall: faded fusuma doors, one left ajar on darkness
    box("lwall", (-W - 0.05, (D0 + D1) / 2, H / 2), (0.1, D1 - D0, H), plaster)
    for i in range(18):
        box("plank", (-W + 0.01, D0 + 0.03 + i * (D1 - D0) / 18 + 0.3, 0.45), (0.03, (D1 - D0) / 18 - 0.01, 0.9), wood)
    fus = stain_mat("fusuma", (0.42, 0.37, 0.27), (0.2, 0.17, 0.12), scale=3.0)
    for i, y in enumerate([0.0, 1.0, 2.6, 3.6, 4.6]):
        box("fusuma", (W - 0.02, y + 0.5, 0.95), (0.04, 0.96, 1.9), fus)
        box("frame", (W - 0.045, y + 0.5, 0.95), (0.02, 1.0, 1.94), beam)
    box("dark", (W + 0.4, 2.1, 0.95), (0.05, 0.9, 1.9), ts.flat_mat("void", (0.0, 0.0, 0.0), rough=1.0))
    box("rwall", (W + 0.05, (D0 + D1) / 2, H / 2), (0.1, D1 - D0, H), plaster).hide_render = False
    # posts, beams and a plank ceiling
    for (x, y) in [(-W + 0.07, D1 - 0.06), (W - 0.07, D1 - 0.06), (-W + 0.07, 0.0), (W - 0.07, -0.05), (-W + 0.07, -4.0), (W - 0.07, -4.0)]:
        box("post", (x, y, H / 2), (0.15, 0.15, H), beam, bevel=0.01)
    for y in [D1 - 0.06, 2.0, -2.0]:
        box("beamx", (0, y, H - 0.08), (2 * W, 0.16, 0.18), beam)
    box("beamy", (0, (D0 + D1) / 2, H - 0.22), (0.2, D1 - D0, 0.2), beam)
    for i in range(22):
        box("ceil", (-W + (i + 0.5) * 2 * W / 22, (D0 + D1) / 2, H + 0.02), (2 * W / 22 - 0.01, D1 - D0, 0.03), wood)
    # the lantern she plays by, her cushion, and a fallen roof tile (the house is abandoned)
    andon((1.05, 1.5), beam, ts.flat_mat("andon", (0.55, 0.5, 0.42) if DAWN else (1.0, 0.5, 0.2), emit=0.0 if DAWN else 1.6), lit=not DAWN)
    web = ts.flat_mat("web", (0.75, 0.76, 0.8), rough=0.5, emit=0.25)
    if DAWN:
        biwa((0.95, 0.35), 2.3)
        blood_trail(ts.flat_mat("blackblood", (0.008, 0.004, 0.006), rough=0.12))
        # a fresh web high in the corner above the post, where the trail ends
        cobweb((-W + 0.1, D1 - 0.1, H - 0.02), (-W + 0.1, D1 - 0.1, H - 0.7), (-W + 0.75, D1 - 0.1, H - 0.02), web, n_rad=9, n_ring=8)
    box("zabuton", (0.4, 1.85, 0.05), (0.55, 0.6, 0.08), stain_mat("cushion", (0.32, 0.06, 0.07), (0.15, 0.03, 0.04)), rot=0.15, bevel=0.03)
    box("tile", (-2.2, 1.2, 0.03), (0.28, 0.22, 0.03), ts.flat_mat("tile", (0.12, 0.12, 0.13)), rot=0.6)
    cobweb((-W + 0.12, D1 - 0.12, H - 0.18), (-W + 0.12, D1 - 0.12, H - 1.0), (-W + 0.9, D1 - 0.12, H - 0.18), web)
    cobweb((W - 0.12, D1 - 0.12, H - 0.18), (W - 0.12, D1 - 0.12, H - 0.8), (W - 0.12, D1 - 0.9, H - 0.18), web)
    cobweb((-W + 0.1, 2.0 - 0.1, H - 0.17), (-W + 0.1, 1.2, H - 0.17), (-W + 0.1, 1.9, H - 0.9), web)
    # foreground (close to the lens, out of focus): a dark post on the left, a sagging web strand and a rope top right
    box("fgpost", (-0.5, -2.25, H / 2), (0.16, 0.16, H), beam, bevel=0.01)
    box("fgsill", (-0.5, -2.25, 0.06), (0.5, 0.2, 0.12), beam)
    cobweb((-0.42, -2.25, 2.25), (-0.42, -2.25, 1.85), (-0.1, -2.25, 2.25), ts.flat_mat("fgweb", (0.5, 0.5, 0.55), rough=0.5, emit=0.06), n_rad=5, n_ring=4)
    curve("rope", [(0.55, -2.0, H), (0.57, -2.0, 2.2), (0.56, -2.0, 1.9)], ts.flat_mat("rope", (0.18, 0.14, 0.1)), r=0.012)
    if SHOT == "rafters":  # old exposed rafters and a brace in the back-left corner, where the spider lives
        for x in [-3.75, -3.05, -2.35]:
            box("rafter", (x, 4.3, H - 0.1), (0.13, 3.4, 0.14), beam, bevel=0.01)
        box("purlin", (-2.9, 5.2, H - 0.25), (2.6, 0.14, 0.12), beam, bevel=0.01)
        box("brace", (-3.75, 5.55, H - 0.45), (0.1, 0.9, 0.1), beam, rot=0.0).rotation_euler = (math.radians(40), 0, 0)
    # warm bounce from the lantern up onto the ceiling, so the top of the frame is a lit ceiling, not black
    bo = bpy.data.lights.new("bounce", "AREA")
    bo.size, bo.energy, bo.color = 2.0, (0 if DAWN else 22), (1.0, 0.6, 0.3)
    o = ts.link(bpy.data.objects.new("bounce", bo))
    o.location, o.rotation_euler = (0.9, 1.5, 0.9), (math.radians(180), 0, 0)
    # light: moon behind the screens, the lantern, and a faint cold fill
    mo = bpy.data.lights.new("moon", "AREA")
    mo.shape, mo.size, mo.size_y = "RECTANGLE", 8.0, 2.5
    mo.energy, mo.color = (1500, (0.78, 0.82, 0.95)) if DAWN else (900, (0.55, 0.65, 1.0))
    o = ts.link(bpy.data.objects.new("moon", mo))
    o.location, o.rotation_euler = (0.0, D1 + 1.2, 1.4), (math.radians(-90), 0, 0)
    if DAWN:  # grey morning skylight filling the room from above, soft (the room reads; no lantern now)
        sk = bpy.data.lights.new("sky", "AREA")
        sk.shape, sk.size, sk.size_y, sk.energy, sk.color = "RECTANGLE", 7.0, 9.0, 700, (0.7, 0.75, 0.88)
        o = ts.link(bpy.data.objects.new("sky", sk))
        o.location = (0.0, 0.5, H - 0.05)
    if DAWN:  # low sun just risen: a hard shaft through the torn panes, slanting down across the floor
        su = bpy.data.lights.new("sun", "SUN")
        su.energy, su.color, su.angle = 2.2, (1.0, 0.86, 0.7), math.radians(1.5)
        o = ts.link(bpy.data.objects.new("sun", su))
        o.rotation_euler = (math.radians(-68), math.radians(-14), math.radians(-8))
    fl = bpy.data.lights.new("fill", "AREA")
    fl.size, fl.energy, fl.color = (6.0, 1400, (0.62, 0.68, 0.85)) if DAWN else (4.0, 500, (0.45, 0.55, 0.9))
    o = ts.link(bpy.data.objects.new("fill", fl))
    o.location, o.rotation_euler = (0.0, -3.0, H - 0.1), (math.radians(30), 0, 0)
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "16"))
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    if hasattr(ee, "volumetric_tile_size"):
        ee.volumetric_tile_size = "4"
    if hasattr(ee, "volumetric_samples"):
        ee.volumetric_samples = 96
    if hasattr(ee, "use_volumetric_shadows"):
        ee.use_volumetric_shadows = True
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - High Contrast"
    sc.view_settings.exposure = float(arg("--exposure", "1.1"))
    sc.render.image_settings.file_format = "PNG"
    return sc


def shot_camera(sc, name):
    S = SHOTS[name]
    c = ts.link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam")))
    c.data.sensor_width, c.data.clip_start, c.data.clip_end = 36, 0.05, 200
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
    tall = float(arg("--tall", "1"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(round(res * SHOTS[SHOT].get("ar", 16 / 9 * tall)))
    if tall != 1:  # taller frame, same pixel focal length (sensor maps to 16:9 height), so projection stays 1920-based
        cam.data.sensor_fit, cam.data.sensor_height = "VERTICAL", 36 * tall
    fg = arg("--fg")
    if fg:  # foreground layer: only what is nearer than FG metres, on transparency, laid over the cast
        sc.render.film_transparent = True
        sc.render.image_settings.color_mode = "RGBA"
        cam.data.clip_end = float(fg)
        sc.world.node_tree.links.remove(sc.world.node_tree.nodes["World Output"].inputs["Volume"].links[0])
    out = os.path.abspath(arg("--out", f"out/jorogumo/sets/{SHOT}/"))
    os.makedirs(out, exist_ok=True)
    n = SHOTS[SHOT]["n"]
    cams = {}
    for f in range(1, n + 1):
        sc.frame_set(f)
        cams[f] = {"m": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": 36}
    if not fg:
        json.dump({"shot": SHOT, "frames": cams}, open(os.path.join(out, "cam.json"), "w"))
    import time
    a, b = (int(x) for x in arg("--range", f"1-{n}").split("-"))
    for f in range(a, b + 1, int(arg("--step", "1"))):
        p = os.path.join(out, f"{'fg' if fg else 'f'}_{f:04d}.png")
        t0 = time.time()
        sc.frame_set(f)
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        print("frame", f, round(time.time() - t0, 1), "s", flush=True)
