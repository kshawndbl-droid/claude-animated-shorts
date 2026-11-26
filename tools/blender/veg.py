"""Vegetation for the 3D sets: fine natural grass, acacia trees with branches and leafy canopies, imported CC0 shrubs,
and one geometry-nodes wind deformer that bends anything by height (roots still, tips moving) with travelling gusts
plus a fast leaf flutter. Every plant gets its own amplitude, speed and phase so nothing moves in lockstep.

The wind uses the Scene Time node, so it plays at the render frame rate without keyframes."""
import math
import os
import random

import bpy
import bmesh
from mathutils import Vector

_WIND = None


def wind_group():
    """geometry nodes group: Geometry, Amp (m at the top), Height (m), Speed, Scale, Flutter (m), Phase (s)"""
    global _WIND
    if _WIND:
        return _WIND
    ng = bpy.data.node_groups.new("Wind", "GeometryNodeTree")
    it = ng.interface
    it.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    for nm, dv in (("Amp", 0.1), ("Height", 1.0), ("Speed", 1.0), ("Scale", 0.3), ("Flutter", 0.01), ("Phase", 0.0)):
        s = it.new_socket(nm, in_out="INPUT", socket_type="NodeSocketFloat")
        s.default_value = dv
    it.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nd, ln = ng.nodes, ng.links
    gi, go = nd.new("NodeGroupInput"), nd.new("NodeGroupOutput")
    pos = nd.new("GeometryNodeInputPosition")
    tm = nd.new("GeometryNodeInputSceneTime")
    t = nd.new("ShaderNodeMath"); t.operation = "ADD"
    ln.new(tm.outputs["Seconds"], t.inputs[0]); ln.new(gi.outputs["Phase"], t.inputs[1])
    ts_ = nd.new("ShaderNodeMath"); ts_.operation = "MULTIPLY"
    ln.new(t.outputs[0], ts_.inputs[0]); ln.new(gi.outputs["Speed"], ts_.inputs[1])
    # gusts travel along +x (the wind direction), slowly evolving
    drift = nd.new("ShaderNodeCombineXYZ")
    ln.new(ts_.outputs[0], drift.inputs[0])
    m03 = nd.new("ShaderNodeMath"); m03.operation = "MULTIPLY"; m03.inputs[1].default_value = 0.3
    ln.new(ts_.outputs[0], m03.inputs[0]); ln.new(m03.outputs[0], drift.inputs[1])
    sc = nd.new("ShaderNodeVectorMath"); sc.operation = "SCALE"
    ln.new(pos.outputs[0], sc.inputs[0]); ln.new(gi.outputs["Scale"], sc.inputs["Scale"])
    gv = nd.new("ShaderNodeVectorMath"); gv.operation = "ADD"
    ln.new(sc.outputs[0], gv.inputs[0]); ln.new(drift.outputs[0], gv.inputs[1])
    gn = nd.new("ShaderNodeTexNoise"); gn.inputs["Detail"].default_value = 1.5; gn.inputs["Scale"].default_value = 1.0
    ln.new(gv.outputs[0], gn.inputs["Vector"])
    # gust value 0..1 -> push mostly downwind (+x) with a little side sway
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(gn.outputs["Color"], sep.inputs[0])
    gx = nd.new("ShaderNodeMath"); gx.operation = "MULTIPLY_ADD"; gx.inputs[1].default_value = 2.2; gx.inputs[2].default_value = -0.85
    ln.new(sep.outputs[0], gx.inputs[0])
    gy = nd.new("ShaderNodeMath"); gy.operation = "MULTIPLY_ADD"; gy.inputs[1].default_value = 1.2; gy.inputs[2].default_value = -0.6
    ln.new(sep.outputs[1], gy.inputs[0])
    gvec = nd.new("ShaderNodeCombineXYZ")
    ln.new(gx.outputs[0], gvec.inputs[0]); ln.new(gy.outputs[0], gvec.inputs[1])
    ga = nd.new("ShaderNodeVectorMath"); ga.operation = "SCALE"
    ln.new(gvec.outputs[0], ga.inputs[0]); ln.new(gi.outputs["Amp"], ga.inputs["Scale"])
    # flutter: small fast noise for leaves and blade tips
    fs = nd.new("ShaderNodeVectorMath"); fs.operation = "SCALE"; fs.inputs["Scale"].default_value = 4.0
    ln.new(pos.outputs[0], fs.inputs[0])
    ft = nd.new("ShaderNodeMath"); ft.operation = "MULTIPLY"; ft.inputs[1].default_value = 3.0
    ln.new(t.outputs[0], ft.inputs[0])
    fn = nd.new("ShaderNodeTexNoise"); fn.noise_dimensions = "4D"; fn.inputs["Detail"].default_value = 0.5; fn.inputs["Scale"].default_value = 1.0
    ln.new(fs.outputs[0], fn.inputs["Vector"]); ln.new(ft.outputs[0], fn.inputs["W"])
    fc = nd.new("ShaderNodeVectorMath"); fc.operation = "SUBTRACT"; fc.inputs[1].default_value = (0.5, 0.5, 0.5)
    ln.new(fn.outputs["Color"], fc.inputs[0])
    fa = nd.new("ShaderNodeVectorMath"); fa.operation = "SCALE"
    ln.new(fc.outputs[0], fa.inputs[0]); ln.new(gi.outputs["Flutter"], fa.inputs["Scale"])
    tot = nd.new("ShaderNodeVectorMath"); tot.operation = "ADD"
    ln.new(ga.outputs[0], tot.inputs[0]); ln.new(fa.outputs[0], tot.inputs[1])
    # weight by height: (z / Height)^2, so roots stay planted and tips swing
    sz = nd.new("ShaderNodeSeparateXYZ"); ln.new(pos.outputs[0], sz.inputs[0])
    hr = nd.new("ShaderNodeMath"); hr.operation = "DIVIDE"; hr.use_clamp = True
    ln.new(sz.outputs[2], hr.inputs[0]); ln.new(gi.outputs["Height"], hr.inputs[1])
    w2 = nd.new("ShaderNodeMath"); w2.operation = "POWER"; w2.inputs[1].default_value = 2.0
    ln.new(hr.outputs[0], w2.inputs[0])
    off = nd.new("ShaderNodeVectorMath"); off.operation = "SCALE"
    ln.new(tot.outputs[0], off.inputs[0]); ln.new(w2.outputs[0], off.inputs["Scale"])
    sp = nd.new("GeometryNodeSetPosition")
    ln.new(gi.outputs["Geometry"], sp.inputs["Geometry"]); ln.new(off.outputs[0], sp.inputs["Offset"])
    ln.new(sp.outputs[0], go.inputs["Geometry"])
    _WIND = ng
    return ng


def add_wind(o, amp, height, speed=0.8, scale=0.25, flutter=0.01, phase=None, rnd=random):
    m = o.modifiers.new("wind", "NODES")
    m.node_group = wind_group()
    vals = dict(Amp=amp, Height=height, Speed=speed, Scale=scale, Flutter=flutter, Phase=rnd.uniform(0, 50) if phase is None else phase)
    for item in m.node_group.interface.items_tree:
        if getattr(item, "in_out", "") == "INPUT" and item.name in vals:
            try:
                getattr(m.properties.inputs, item.identifier).value = vals[item.name]
            except AttributeError:
                m[item.identifier] = vals[item.name]
    return m


# ------------------------------------------------------------------ materials
def grass_mat(name="finegrass"):
    """blades coloured per blade (attribute 'col'), dark at the root, lighter and a little translucent at the tip"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    b = nd["Principled BSDF"]
    at = nd.new("ShaderNodeAttribute"); at.attribute_name = "col"
    base = nd.new("ShaderNodeMix"); base.data_type = "RGBA"
    base.inputs[6].default_value = (0.09, 0.06, 0.03, 1)
    rr = nd.new("ShaderNodeMapRange"); rr.interpolation_type = "SMOOTHSTEP"
    rr.inputs["From Min"].default_value, rr.inputs["From Max"].default_value = 0.0, 0.55
    ln.new(at.outputs["Alpha"], rr.inputs[0])
    ln.new(rr.outputs[0], base.inputs[0])
    ln.new(at.outputs["Color"], base.inputs[7])
    ln.new(base.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.75
    b.inputs["Specular IOR Level"].default_value = 0.2
    if "Subsurface Weight" in b.inputs:
        b.inputs["Subsurface Weight"].default_value = 0.0
    tr = nd.new("ShaderNodeBsdfTranslucent")
    ln.new(base.outputs[2], tr.inputs["Color"])
    mx = nd.new("ShaderNodeMixShader"); mx.inputs[0].default_value = 0.25
    out = nd["Material Output"]
    ln.new(b.outputs[0], mx.inputs[1]); ln.new(tr.outputs[0], mx.inputs[2])
    ln.new(mx.outputs[0], out.inputs[0])
    return m


def leaf_mat(name, cols):
    """canopy: per-vertex colour variation (attribute 'col') with a fine noise for leafy texture"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    b = nd["Principled BSDF"]
    at = nd.new("ShaderNodeAttribute"); at.attribute_name = "col"
    tx = nd.new("ShaderNodeTexNoise"); tx.inputs["Scale"].default_value = 18.0; tx.inputs["Detail"].default_value = 4
    mul = nd.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 0.55
    ln.new(at.outputs["Color"], mul.inputs[6]); ln.new(tx.outputs["Color"], mul.inputs[7])
    ln.new(mul.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.85
    b.inputs["Specular IOR Level"].default_value = 0.15
    return m


def _col_layer(bm):
    return bm.loops.layers.float_color.new("col")


# ------------------------------------------------------------------ grass
GRASS_COLS = [(0.62, 0.48, 0.22), (0.72, 0.58, 0.3), (0.55, 0.42, 0.2), (0.8, 0.68, 0.42), (0.48, 0.42, 0.2), (0.6, 0.52, 0.3)]


def fine_grass(name, n, area, rnd, hs=(0.3, 0.75), blades=(10, 18), skip=lambda x, y: False, density=None):
    """natural dry savanna grass: tufts of thin curved blades (3 segments, tapering to a point), some with seed heads,
    each blade its own straw tone. One merged mesh; colour in the 'col' attribute (alpha = height along the blade)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    cl = _col_layer(bm)
    for i in range(n):
        x, y = rnd.uniform(*area[0]), rnd.uniform(*area[1])
        if skip(x, y) or (density and rnd.random() > density(x, y)):
            continue
        tuft_h = rnd.uniform(*hs)
        base_col = Vector(rnd.choice(GRASS_COLS))
        for b in range(rnd.randint(*blades)):
            h = tuft_h * rnd.uniform(0.55, 1.1)
            a = rnd.uniform(0, math.tau)
            out = rnd.uniform(0.05, 0.55)             # how far the blade arcs outward
            bx, by = x + math.cos(a) * rnd.uniform(0, 0.05), y + math.sin(a) * rnd.uniform(0, 0.05)
            w = rnd.uniform(0.004, 0.008)
            fa = a + math.pi / 2 + rnd.uniform(-0.6, 0.6)  # blade faces roughly sideways to its arc
            fx, fy = math.cos(fa), math.sin(fa)
            col = base_col * rnd.uniform(0.82, 1.15)
            pts = []
            for k in range(4):
                u = k / 3
                r = out * h * u * u
                pts.append((bx + math.cos(a) * r, by + math.sin(a) * r, h * (u - 0.35 * out * u * u)))
            verts = []
            for k, (px, py, pz) in enumerate(pts[:-1]):
                ww = w * (1 - k / 3)
                verts.append((bm.verts.new((px - fx * ww, py - fy * ww, pz)), bm.verts.new((px + fx * ww, py + fy * ww, pz)), k / 3))
            tip = bm.verts.new(pts[-1])
            faces = []
            for k in range(len(verts) - 1):
                (a1, a2, _), (b1, b2, _) = verts[k], verts[k + 1]
                faces.append(bm.faces.new((a1, a2, b2, b1)))
            faces.append(bm.faces.new((verts[-1][0], verts[-1][1], tip)))
            for f in faces:
                for lp in f.loops:
                    hz = max(0.0, lp.vert.co.z) / max(h, 1e-3)
                    lp[cl] = (col.x, col.y, col.z, hz)
            # a seed head on some blades: a thin stalk end with a small plume
            if rnd.random() < 0.12:
                tx, ty, tz = pts[-1]
                hd = rnd.uniform(0.06, 0.1)
                v1 = bm.verts.new((tx - fx * 0.006, ty - fy * 0.006, tz))
                v2 = bm.verts.new((tx + fx * 0.006, ty + fy * 0.006, tz))
                v3 = bm.verts.new((tx + math.cos(a) * 0.02, ty + math.sin(a) * 0.02, tz + hd))
                f = bm.faces.new((v1, v2, v3))
                for lp in f.loops:
                    lp[cl] = (0.66, 0.54, 0.32, 1.0)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    return o


# ------------------------------------------------------------------ acacia
def acacia(name, loc, s, rnd, bark, leaf):
    """umbrella-thorn acacia: a trunk that forks into spreading branches, each carrying a flat pad of leaf clusters;
    canopy pads in olive / grey-green tones with darker undersides. Returns the joined tree (trunk at z = 0)."""
    x, y = loc
    parts = []
    top_z = rnd.uniform(3.3, 4.2) * s
    width = rnd.uniform(2.6, 3.6) * s
    fork = Vector((rnd.uniform(-0.3, 0.3) * s, rnd.uniform(-0.2, 0.2) * s, rnd.uniform(1.4, 2.0) * s))

    def branch(p0, p1, r0, r1, bend=0.25):
        cu = bpy.data.curves.new("br", "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = 1.0
        cu.bevel_resolution = 2
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(1)
        d = p1 - p0
        a, b_ = sp.bezier_points
        a.co, b_.co = p0, p1
        a.handle_left, a.handle_right = p0 - d * 0.2, p0 + Vector((d.x * 0.15, d.y * 0.15, d.z * 0.7)) + Vector((0, 0, d.length * bend * 0.3))
        b_.handle_left, b_.handle_right = p1 - Vector((d.x * 0.5, d.y * 0.5, d.z * 0.15)), p1 + d * 0.1
        a.radius, b_.radius = r0, r1
        ob = bpy.data.objects.new("br", cu)
        bpy.context.scene.collection.objects.link(ob)
        cu.materials.append(bark)
        parts.append(ob)

    branch(Vector((0, 0, -0.2)), fork, 0.17 * s, 0.12 * s, 0.05)
    # spreading limbs to canopy pads
    pads = []
    nb = rnd.randint(4, 6)
    a0 = rnd.uniform(0, math.tau)
    for i in range(nb):
        a = a0 + i * math.tau / nb + rnd.uniform(-0.4, 0.4)
        rr = width * rnd.uniform(0.45, 0.85)
        end = Vector((fork.x + math.cos(a) * rr * 0.8, fork.y + math.sin(a) * rr * 0.55, top_z - rnd.uniform(0.1, 0.5) * s))
        branch(fork, end, 0.1 * s, 0.035 * s, 0.4)
        pads.append((end, rnd.uniform(0.9, 1.4) * s))
        # twigs
        for k in range(2):
            tw = end + Vector((rnd.uniform(-0.7, 0.7) * s, rnd.uniform(-0.5, 0.5) * s, rnd.uniform(0.05, 0.25) * s))
            branch(end, tw, 0.03 * s, 0.012 * s, 0.2)
    pads.append((Vector((fork.x, fork.y, top_z + 0.15 * s)), 1.2 * s))
    # canopy: many small flattened leaf clusters gathered into flat pads
    me = bpy.data.meshes.new("canopy")
    bm = bmesh.new()
    cl = _col_layer(bm)
    tone = Vector(rnd.choice([(0.24, 0.3, 0.12), (0.28, 0.32, 0.15), (0.22, 0.27, 0.13)]))
    for c, pr in pads:
        for k in range(int(26 * pr / s)):
            ang, dist = rnd.uniform(0, math.tau), pr * math.sqrt(rnd.random())
            cx, cy = c.x + math.cos(ang) * dist * 1.25, c.y + math.sin(ang) * dist
            cz = c.z + rnd.uniform(-0.12, 0.18) * s - 0.18 * (dist / pr) ** 2 * s
            r = rnd.uniform(0.22, 0.4) * s
            res = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
            vs = res["verts"]
            for v in vs:
                v.co.x = v.co.x * rnd.uniform(1.0, 1.3) + cx
                v.co.y = v.co.y + cy
                v.co.z = v.co.z * 0.38 + cz
            faces = {f for v in vs for f in v.link_faces}
            shade = rnd.uniform(0.85, 1.2)
            for f in faces:
                for lp in f.loops:
                    under = 0.55 if lp.vert.co.z < cz - 0.02 * s else 1.0
                    cc = tone * shade * under
                    lp[cl] = (cc.x, cc.y, cc.z, 1.0)
    bm.to_mesh(me)
    bm.free()
    can = bpy.data.objects.new("canopy", me)
    bpy.context.scene.collection.objects.link(can)
    dm = can.modifiers.new("leafy", "DISPLACE")
    t = bpy.data.textures.new("leafy", "VORONOI")
    t.noise_scale = 0.12 * s
    dm.texture = t
    dm.strength = 0.08 * s
    me.materials.append(leaf)
    me.shade_smooth() if hasattr(me, "shade_smooth") else None
    # join everything into one object at the trunk base
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
        bpy.context.view_layer.objects.active = p
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = can
    bpy.ops.object.convert(target="MESH")
    for p in parts + [can]:
        p.select_set(True)
    bpy.context.view_layer.objects.active = can
    bpy.ops.object.join()
    tree = bpy.context.view_layer.objects.active
    tree.name = name
    tree.location = (x, y, 0)
    add_wind(tree, amp=rnd.uniform(0.05, 0.09) * s, height=top_z, speed=rnd.uniform(0.35, 0.6), scale=0.12,
             flutter=rnd.uniform(0.025, 0.04) * s, rnd=rnd)
    return tree


# ------------------------------------------------------------------ imported CC0 shrubs (Poly Haven)
_SHRUBS = {}


DECIMATE = {"dry_branches_medium_01": 0.18, "searsia_lucida": 0.3}


def shrub_variants(A, name):
    """import a Poly Haven plant once; returns its separate variant objects with origins at their base, hidden"""
    if name in _SHRUBS:
        return _SHRUBS[name]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(A, "polyhaven", name, f"{name}_1k.gltf"))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in new:
        if o.parent:
            mw = o.matrix_world.copy()
            o.parent = None
            o.matrix_world = mw
    out = []
    for o in meshes:
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        if name in DECIMATE:  # lighter copies: these are instanced many times
            dm = o.modifiers.new("dec", "DECIMATE")
            dm.ratio = DECIMATE[name]
            bpy.ops.object.modifier_apply(modifier=dm.name)
        # origin to the bottom centre of the bounds
        zs = [v.co.z for v in o.data.vertices]
        xs = [v.co.x for v in o.data.vertices]
        ys = [v.co.y for v in o.data.vertices]
        c = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)))
        o.data.transform(__import__("mathutils").Matrix.Translation(-c))
        o.location = (0, 0, -1000)
        o.hide_render = True
        out.append((o, max(zs) - min(zs)))
    _SHRUBS[name] = out
    return out


def place_shrub(A, name, loc, rot, scale, rnd, amp=0.05, flutter=0.012):
    """a linked copy of one variant at loc, with its own wind settings"""
    src, h = rnd.choice(shrub_variants(A, name))
    o = bpy.data.objects.new(name, src.data)
    bpy.context.scene.collection.objects.link(o)
    o.location = (loc[0], loc[1], 0)
    o.rotation_euler = (0, 0, rot)
    o.scale = (scale, scale, scale)
    add_wind(o, amp=amp, height=max(0.3, h), speed=rnd.uniform(0.5, 0.9), scale=0.4, flutter=flutter, rnd=rnd)
    return o
