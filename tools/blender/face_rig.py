# A stylized talking head for a rigged 3D body (Blender 5.3): a 3D toon-shaded skull, ears, nose and curly hair with
# inverted-hull outlines, plus a "drawn" face (eyes, irises, lids, brows, mouth) made of 2D shapes that are
# shrink-wrapped onto the 3D head. Each 2D shape carries its own ink outline band and is driven by shape keys:
#   mouth: visemes REST A E O U M F TH C + SMILE FROWN WIDE (lip-sync from phoneme timings)
#   lids:  BLINK (closed) SQUINT (happy) ; brows: UP ANGRY SAD ; irises: look target (x, z)
# The head hangs on the body's head bone through `head_root`, which also takes extra talking motion (nods, tilts).
import math

import bpy
import bmesh  # noqa: E402 (after bpy)
from mathutils import Matrix, Vector

INK = (0.02, 0.012, 0.01)


# ------------------------------------------------------------------ materials
def toon(name, rgb, shadow=(0.62, 0.5, 0.62), lit=0.42, soft=0.06, tex=None, spec=0.0):
    """cel shading: light intensity -> 2 tone ramp (warm lit, cool violet shade) x base colour, emitted flat"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    nd.clear()
    out = nd.new("ShaderNodeOutputMaterial")
    dif = nd.new("ShaderNodeBsdfDiffuse")
    s2r = nd.new("ShaderNodeShaderToRGB")
    ln.new(dif.outputs[0], s2r.inputs[0])
    bw = nd.new("ShaderNodeRGBToBW")
    ln.new(s2r.outputs[0], bw.inputs[0])
    ramp = nd.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = lit - soft, (*shadow, 1)
    e[1].position, e[1].color = lit + soft, (1, 1, 1, 1)
    ln.new(bw.outputs[0], ramp.inputs[0])
    mul = nd.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs[0].default_value = 1.0
    if tex is not None:
        ln.new(tex, mul.inputs[6])
    else:
        mul.inputs[6].default_value = (*rgb, 1)
    ln.new(ramp.outputs[0], mul.inputs[7])
    em = nd.new("ShaderNodeEmission")
    ln.new(mul.outputs[2], em.inputs[0])
    final = em
    if spec:
        # a small hard highlight (hair sheen, metal glint)
        gl = nd.new("ShaderNodeBsdfGlossy")
        gl.inputs["Roughness"].default_value = 0.25
        s2 = nd.new("ShaderNodeShaderToRGB")
        ln.new(gl.outputs[0], s2.inputs[0])
        b2 = nd.new("ShaderNodeRGBToBW")
        ln.new(s2.outputs[0], b2.inputs[0])
        st = nd.new("ShaderNodeMath")
        st.operation = "GREATER_THAN"
        st.inputs[1].default_value = 0.6
        ln.new(b2.outputs[0], st.inputs[0])
        sc = nd.new("ShaderNodeMath")
        sc.operation = "MULTIPLY"
        sc.inputs[1].default_value = spec
        ln.new(st.outputs[0], sc.inputs[0])
        add = nd.new("ShaderNodeMix")
        add.data_type = "RGBA"
        add.blend_type = "ADD"
        ln.new(sc.outputs[0], add.inputs[0])
        ln.new(mul.outputs[2], add.inputs[6])
        add.inputs[7].default_value = (1, 0.95, 0.85, 1)
        ln.new(add.outputs[2], em.inputs[0])
    ln.new(final.outputs[0], out.inputs[0])
    return m


def flat(name, rgb, alpha_clip=None):
    """unlit ink/paint colour for the drawn face parts; alpha_clip=(eye_white_object, a, b) clips to that eye's oval"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    nd.clear()
    out = nd.new("ShaderNodeOutputMaterial")
    em = nd.new("ShaderNodeEmission")
    em.inputs[0].default_value = (*rgb, 1)
    if alpha_clip:
        eye, a, b = alpha_clip
        tc = nd.new("ShaderNodeTexCoord")
        tc.object = eye
        sep = nd.new("ShaderNodeSeparateXYZ")
        ln.new(tc.outputs["Object"], sep.inputs[0])
        # (x/a)^2 + (z/b)^2 < 1  -> visible
        def sq(sock, d):
            dv = nd.new("ShaderNodeMath")
            dv.operation = "DIVIDE"
            dv.inputs[1].default_value = d
            ln.new(sock, dv.inputs[0])
            p = nd.new("ShaderNodeMath")
            p.operation = "POWER"
            p.inputs[1].default_value = 2
            ln.new(dv.outputs[0], p.inputs[0])
            return p.outputs[0]
        ad = nd.new("ShaderNodeMath")
        ad.operation = "ADD"
        ln.new(sq(sep.outputs[0], a), ad.inputs[0])
        ln.new(sq(sep.outputs[2], b), ad.inputs[1])
        lt = nd.new("ShaderNodeMath")
        lt.operation = "LESS_THAN"
        lt.inputs[1].default_value = 1.0
        ln.new(ad.outputs[0], lt.inputs[0])
        tr = nd.new("ShaderNodeBsdfTransparent")
        mix = nd.new("ShaderNodeMixShader")
        ln.new(lt.outputs[0], mix.inputs[0])
        ln.new(tr.outputs[0], mix.inputs[1])
        ln.new(em.outputs[0], mix.inputs[2])
        ln.new(mix.outputs[0], out.inputs[0])
    else:
        ln.new(em.outputs[0], out.inputs[0])
    return m


def mouth_mat():
    """inside of the mouth by UV (UVs ride along with the shape keys): upper teeth band, tongue at the bottom"""
    m = bpy.data.materials.new("mouth_in")
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    nd.clear()
    out = nd.new("ShaderNodeOutputMaterial")
    uv = nd.new("ShaderNodeUVMap")
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(uv.outputs[0], sep.inputs[0])
    teeth = nd.new("ShaderNodeMath")
    teeth.operation = "GREATER_THAN"
    teeth.inputs[1].default_value = 0.80
    ln.new(sep.outputs[1], teeth.inputs[0])
    # tongue: ellipse around (0.5, 0.0)
    vec = nd.new("ShaderNodeVectorMath")
    vec.operation = "MULTIPLY"
    sub = nd.new("ShaderNodeVectorMath")
    sub.operation = "SUBTRACT"
    sub.inputs[1].default_value = (0.5, 0.02, 0)
    ln.new(uv.outputs[0], sub.inputs[0])
    vec.inputs[1].default_value = (1.3, 1.0, 0)
    ln.new(sub.outputs[0], vec.inputs[0])
    ln_ = nd.new("ShaderNodeVectorMath")
    ln_.operation = "LENGTH"
    ln.new(vec.outputs[0], ln_.inputs[0])
    tongue = nd.new("ShaderNodeMath")
    tongue.operation = "LESS_THAN"
    tongue.inputs[1].default_value = 0.42
    ln.new(ln_.outputs["Value"], tongue.inputs[0])
    c1 = nd.new("ShaderNodeMix")
    c1.data_type = "RGBA"
    ln.new(tongue.outputs[0], c1.inputs[0])
    c1.inputs[6].default_value = (0.22, 0.035, 0.03, 1)
    c1.inputs[7].default_value = (0.78, 0.3, 0.3, 1)
    c2 = nd.new("ShaderNodeMix")
    c2.data_type = "RGBA"
    ln.new(teeth.outputs[0], c2.inputs[0])
    ln.new(c1.outputs[2], c2.inputs[6])
    c2.inputs[7].default_value = (0.96, 0.94, 0.88, 1)
    em = nd.new("ShaderNodeEmission")
    ln.new(c2.outputs[2], em.inputs[0])
    ln.new(em.outputs[0], out.inputs[0])
    return m


def outline_mat():
    m = bpy.data.materials.get("ink_hull")
    if m:
        return m
    m = bpy.data.materials.new("ink_hull")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*INK, 1)
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


def add_outline(o, width):
    """inverted hull: a flipped, slightly fatter shell that only shows around the silhouette"""
    o.data.materials.append(outline_mat())
    s = o.modifiers.new("outline", "SOLIDIFY")
    s.thickness = width / max(min(o.scale), 0.05)
    s.offset = 1
    s.use_flip_normals = True
    s.use_rim = False
    s.material_offset = len(o.data.materials) - 1
    o.visible_shadow = False if o.get("noshadow") else o.visible_shadow
    return s


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def ellipsoid(name, loc, scale, m, parent, outline=0.0, seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    o.parent = parent
    o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = True
    if outline:
        add_outline(o, outline)
    return o


# ------------------------------------------------------------------ 2D shapes on the head
def _ring_normals(rim):
    n = len(rim)
    out = []
    for i in range(n):
        a, b = rim[i - 1], rim[(i + 1) % n]
        tx, tz = b[0] - a[0], b[1] - a[1]
        l = math.hypot(tx, tz) or 1
        out.append((tz / l, -tx / l))  # outward for a counter-clockwise rim
    return out


def _disc_points(rim, lw, rings=(0.35, 0.7), band=None):
    """centre, inner rings, rim, outline ring -> flat list of (x, z); band(i) False = no ink at that rim point"""
    cx = sum(p[0] for p in rim) / len(rim)
    cz = sum(p[1] for p in rim) / len(rim)
    pts = [(cx, cz)]
    for f in rings:
        pts += [(cx + (x - cx) * f, cz + (z - cz) * f) for x, z in rim]
    pts += list(rim)
    nr = _ring_normals(rim)
    pts += [(x + nx * lw * (1 if band is None or band(i) else 0), z + nz * lw * (1 if band is None or band(i) else 0))
            for i, ((x, z), (nx, nz)) in enumerate(zip(rim, nr))]
    return pts


def disc(name, shapes, lw, fill, parent, loc, target, offset, ink=None, uv_from=None, band=None):
    """a flat 2D shape (rim polygon, counter-clockwise in x/z, facing -y) with an ink band of width lw.
    shapes: {"Basis": rim, "KEY": rim, ...}, all with the same point count. Shrink-wrapped onto `target`."""
    basis = shapes["Basis"]
    n = len(basis)
    rings = (0.35, 0.7)
    pts = _disc_points(basis, lw, rings, band)
    verts = [(x, 0, z) for x, z in pts]
    faces, mats = [], []
    R = lambda k, i: 1 + k * n + (i % n)  # ring k (0 = first inner ring) index
    for i in range(n):
        faces.append((0, R(0, i + 1), R(0, i)))  # careful winding so normals face -y
        mats.append(0)
    nring = len(rings) + 1  # inner rings + rim
    for k in range(nring - 1):
        for i in range(n):
            faces.append((R(k, i), R(k, i + 1), R(k + 1, i + 1), R(k + 1, i)))
            mats.append(0)
    for i in range(n):  # ink band
        faces.append((R(nring - 1, i), R(nring - 1, i + 1), R(nring, i + 1), R(nring, i)))
        mats.append(1 if lw > 0 and (band is None or (band(i) and band((i + 1) % n))) else 0)
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for p, mi in zip(me.polygons, mats):
        p.material_index = mi
    # make sure the faces point towards -y (the viewer)
    if me.polygons[0].normal.y > 0:
        for p in me.polygons:
            p.flip()
    o = link(bpy.data.objects.new(name, me))
    me.materials.append(fill)
    me.materials.append(ink or flat("ink_" + name, INK))
    # UVs from the reference shape (so the mouth's teeth/tongue ride with the lips)
    ref = _disc_points(shapes.get(uv_from or "Basis"), lw, rings)
    xs = [p[0] for p in ref[: 1 + nring * n]]
    zs = [p[1] for p in ref[: 1 + nring * n]]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    uvl = me.uv_layers.new(name="UVMap")
    for p in me.polygons:
        for li in p.loop_indices:
            vi = me.loops[li].vertex_index
            x, z = ref[vi]
            uvl.data[li].uv = ((x - x0) / max(x1 - x0, 1e-6), (z - z0) / max(z1 - z0, 1e-6))
    o.shape_key_add(name="Basis")
    for k, rim in shapes.items():
        if k == "Basis":
            continue
        sk = o.shape_key_add(name=k)
        sk.slider_min, sk.slider_max = -1, 2
        sk.value = 0.0  # Blender 5 creates new keys at full strength
        for i, (x, z) in enumerate(_disc_points(rim, lw, rings, band)):
            sk.data[i].co = (x, 0, z)
    o.parent = parent
    o.location = loc
    sw = o.modifiers.new("onhead", "SHRINKWRAP")
    sw.target = target
    sw.wrap_method = "NEAREST_SURFACEPOINT"
    sw.wrap_mode = "OUTSIDE_SURFACE"
    sw.offset = offset
    o.visible_shadow = False
    return o


def ellipse_rim(a, b, n=40, squash_bottom=1.0, cx=0.0, cz=0.0):
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        z = math.sin(t) * (b if math.sin(t) > 0 else b * squash_bottom)
        out.append((cx + a * math.cos(t), cz + z))
    return out


def mouth_rim(w, top, bot, corner=0.0, n=40, cupid=0.0):
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        c, s = math.cos(t), math.sin(t)
        z = (top if s > 0 else bot) * s
        if s > 0:
            z -= cupid * math.exp(-(c / 0.25) ** 2) * s  # little dip at the top centre
        z += corner * (c * c) - corner * 0.35
        out.append((w * c, z))
    return out


def lid_rim(a, b, close, n=40, squint=0.0, over=0.013):
    """upper eyelid: top arc slightly above the eye; lower edge moves from the top (open) to the bottom (closed).
    squint bends the lower edge up into a happy ^ shape."""
    half = n // 2
    top = []
    for i in range(half):  # right -> left across the top (counter-clockwise)
        t = math.pi * i / (half - 1)
        top.append(((a + over) * math.cos(t), (b + over) * math.sin(t) + over * 0.5))
    low = []
    for i in range(half):  # left -> right along the lid edge
        t = math.pi - math.pi * i / (half - 1)
        x = (a + over) * math.cos(t)
        z_open = b * math.sin(t) * 0.8 + b * 0.04
        z_closed = -(b * 0.9 + over) * math.sin(t) * 0.92
        z = z_open + (z_closed - z_open) * close
        z += squint * b * (math.sin(t) ** 2) * 0.9
        low.append((x, z))
    return top + low


def brow_rim(L, thick, arch, inner_drop, lift, side, n=32):
    """thick tapered brow; u=0 inner end, u=1 outer end; side=-1 for the brow on the -x side"""
    half = n // 2
    top, bot = [], []
    for i in range(half):
        u = i / (half - 1)
        x = (u - 0.5) * L
        zc = lift + arch * (1 - (2 * u - 1) ** 2) - inner_drop * (1 - u)
        th = thick * (1.15 - 0.6 * u) * (0.35 + 0.65 * math.sin(math.pi * (0.15 + 0.85 * u)) ** 0.5)
        top.append((x, zc + th / 2))
        bot.append((x, zc - th / 2))
    pts = bot + top[::-1]  # inner-bottom -> outer-bottom -> outer-top -> inner-top : counter-clockwise for +x outward
    if side < 0:
        pts = [(-x, z) for x, z in pts][::-1]
    return pts


# ------------------------------------------------------------------ the head
class Face:
    pass


def surface_point(rx, ry, rz, x, z):
    q = 1 - (x / rx) ** 2 - (z / rz) ** 2
    return Vector((x, -ry * math.sqrt(max(q, 0.0)), z))


def build_head(rig, bone="head", look=None):
    """build the head on the rig's head bone. Returns a Face with handles for animation."""
    L = dict(skin=(0.95, 0.62, 0.44), hair=(0.11, 0.06, 0.04), iris=(0.32, 0.2, 0.1), lips=(0.62, 0.3, 0.26),
             brow=(0.09, 0.05, 0.035), cheek=(0.95, 0.5, 0.45))
    L.update(look or {})
    F = Face()
    for b_ in rig.pose.bones:
        b_.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    pb = rig.pose.bones[bone]
    pivot = rig.matrix_world @ rig.data.bones[bone].head_local
    root = link(bpy.data.objects.new("head_root", None))
    root.empty_display_size = 0.1
    root.parent = rig
    root.parent_type = "BONE"
    root.parent_bone = bone
    bpy.context.view_layer.update()
    # the parent inverse cancels the bone's own transform, so the head's basis is identity at rest and
    # rotation_euler can be keyed as plain pitch/roll/yaw around the neck
    bone_tail = rig.matrix_world @ pb.matrix @ Matrix.Translation((0, rig.data.bones[bone].length, 0))
    root.matrix_parent_inverse = bone_tail.inverted()
    root.location = pivot
    root.rotation_mode = "XYZ"
    F.root = root
    # head: a slightly egg-shaped skull with fuller cheeks and a soft chin
    rx, ry, rz = 0.36, 0.335, 0.38
    c = Vector((0, 0, 0.40))
    skin = toon("skin", L["skin"], shadow=(0.78, 0.58, 0.62), lit=0.36)
    skull = ellipsoid("skull", c, (rx, ry, rz), skin, root, outline=0.011, seg=64)
    # shape the jaw/cheeks a little (in mesh space)
    for v in skull.data.vertices:
        z = v.co.z
        if z < 0:
            v.co.x *= 1.0 + 0.06 * math.sin(-z * math.pi) - 0.08 * (-z) ** 3  # cheeks out, narrower chin
            v.co.y *= 1.0 - 0.06 * (-z) ** 2
    proxy = ellipsoid("skull_wrap", c, (rx, ry, rz), skin, root)
    proxy.data = skull.data.copy()
    proxy.data.materials.clear()
    proxy.hide_render = True
    proxy.hide_viewport = True
    F.skull = skull
    neck = ellipsoid("neck", (0, 0.02, 0.06), (0.11, 0.1, 0.14), skin, root, outline=0.008, seg=24)
    for side in (-1, 1):
        ellipsoid("ear" + str(side), (side * rx * 0.98, 0.02, c.z - 0.02), (0.05, 0.035, 0.075), skin, root, outline=0.008, seg=24)
    nose = ellipsoid("nose", c + Vector((0, -ry * 0.99, -0.075)), (0.032, 0.03, 0.04), skin, root, outline=0.0, seg=24)
    # hair: a curly cap (ancient Greek youth) made of many small toon-shaded curls with ink outlines
    hair_m = toon("hair", L["hair"], shadow=(0.5, 0.45, 0.62), lit=0.42, soft=0.03, spec=L.get("hair_sheen", 0.0))
    import random
    import bmesh
    rnd = random.Random(L.get("seed", 3))
    bm = bmesh.new()
    if L.get("hair_style") == "slick":
        _slick_hair(bm, c, rx, ry, rz, L.get("part", 0.35))
    else:
        _curly_hair(bm, c, rx, ry, rz, rnd)
    me = bpy.data.meshes.new("hair")
    bm.to_mesh(me)
    bm.free()
    hair = link(bpy.data.objects.new("hair", me))
    hair.parent = root
    me.materials.append(hair_m)
    for p_ in me.polygons:
        p_.use_smooth = True
    add_outline(hair, 0.009)
    F.curls = [hair]
    F.hair = hair
    _face(F, L, root, proxy, c, rx, ry, rz)
    if L.get("mustache"):
        mp = surface_point(rx, ry, rz, 0, -0.118) + Vector((0, 0, c.z))
        F.mustache = disc("mustache", {"Basis": mustache_rim(), "UP": mustache_rim(lift=0.012)}, 0.006,
                          toon("mustache_c", L["hair"], shadow=(0.5, 0.45, 0.62), lit=0.42), root, mp, proxy, 0.0045, flat("ink_m", INK))
    if L.get("hat") == "bowler":
        F.hat = bowler(root, c, rx, ry, rz, L.get("hat_color", (0.07, 0.06, 0.06)), L.get("band", (0.25, 0.05, 0.05)))
    return F


def _curly_hair(bm, c, rx, ry, rz, rnd):

    def curl(p, s, n):
        """one curl: a squashed sphere leaning along the head normal"""
        q = n.to_track_quat("Z", "Y").to_matrix().to_4x4()
        mtx = Matrix.Translation(p) @ q @ Matrix.Diagonal((s, s * 0.9, s * 0.7, 1))
        bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=8, radius=1.0, matrix=mtx)

    for ring in range(7):
        el = math.radians(-38 + ring * 19)
        cnt = int(17 * math.cos(el)) + 4
        for j in range(cnt):
            az = 2 * math.pi * (j + 0.5 * (ring % 2) + rnd.uniform(-0.15, 0.15)) / cnt
            dirv = Vector((math.cos(el) * math.sin(az), math.cos(el) * math.cos(az), math.sin(el)))
            front = -dirv.y
            if front > 0.2 and el < math.radians(50) - 0.3 * abs(dirv.x):
                continue
            if el < math.radians(-5) and front > -0.45:
                continue
            p = c + Vector((dirv.x * rx, dirv.y * ry, dirv.z * rz)) * 1.0
            curl(p, 0.1 + rnd.random() * 0.035, dirv)
    for i in range(7):  # fringe along the hairline
        u = (i - 3) / 3.0
        x = u * rx * 0.78
        z = rz * (0.62 - 0.2 * u * u)
        p = surface_point(rx, ry, rz, x, z) + Vector((0, 0, c.z))
        n = Vector((x / rx ** 2, p.y / ry ** 2, z / rz ** 2)).normalized()
        curl(p + n * 0.01, 0.075 + rnd.random() * 0.02, n)


def _slick_hair(bm, c, rx, ry, rz, part):
    """1920s slicked-back hair: a smooth shell over the skull with a hairline above the forehead and a side part"""
    bmesh = __import__("bmesh")
    mtx = Matrix.Translation(c + Vector((0, 0.012, 0.02))) @ Matrix.Diagonal((rx * 1.06, ry * 1.08, rz * 1.05, 1))
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0, matrix=mtx)
    kill = []
    for v in bm.verts:
        d = v.co - c
        x, y, z = d.x / rx, d.y / ry, d.z / rz
        front = -y
        hairline = 0.5 - 0.22 * x * x  # forehead line, higher in the middle
        if front > 0.0 and z < hairline:
            kill.append(v)
        elif z < -0.15 and front > -0.5:  # sideburns stop above the ears
            kill.append(v)
        elif z < -0.55:
            kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context="VERTS")
    # a soft side part: pinch a groove into the shell
    for v in bm.verts:
        d = v.co - c
        if d.z > 0 and abs(d.x / rx - part) < 0.06 and d.y < 0.1:
            v.co -= (v.co - c).normalized() * 0.012


def mustache_rim(n=40, lift=0.0):
    """a neat 1920s mustache: two tapered wings that curl up at the tips (counter-clockwise rim)"""
    pts = []
    half = n // 2
    for i in range(half):  # bottom edge, left tip -> right tip
        u = -1 + 2 * i / (half - 1)
        x = u * 0.085
        z = -0.012 + 0.012 * abs(u) ** 3 + lift * abs(u) ** 2
        pts.append((x, z))
    for i in range(half):  # top edge, right tip -> left tip
        u = 1 - 2 * i / (half - 1)
        x = u * 0.08
        th = 0.03 * (1 - abs(u) ** 2.2) + 0.004
        z = -0.012 + 0.012 * abs(u) ** 3 + lift * abs(u) ** 2 + th - 0.006 * math.exp(-(u / 0.12) ** 2)
        pts.append((x, z))
    return pts


def bowler(root, c, rx, ry, rz, col, band_col):
    m = toon("hat", col, shadow=(0.55, 0.5, 0.65), lit=0.42, spec=0.1)
    crown = ellipsoid("hat_crown", c + Vector((0, 0.02, rz * 0.62)), (rx * 0.86, ry * 0.9, rz * 0.62), m, root, outline=0.01, seg=40)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.0, depth=1.0, location=c + Vector((0, 0.02, rz * 0.62)))
    brim = bpy.context.object
    brim.name = "hat_brim"
    brim.scale = (rx * 1.22, ry * 1.25, 0.012)
    brim.parent = root
    brim.data.materials.append(m)
    add_outline(brim, 0.008)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.0, depth=1.0, location=c + Vector((0, 0.02, rz * 0.68)))
    band = bpy.context.object
    band.name = "hat_band"
    band.scale = (rx * 0.875, ry * 0.915, 0.035)
    band.parent = root
    band.data.materials.append(toon("hatband", band_col, lit=0.42))
    # cut the crown flat at the bottom so it sits on the head
    for v in crown.data.vertices:
        if v.co.z < 0:
            v.co.z = 0
    return crown


def _face(F, L, root, proxy, c, rx, ry, rz):
    # ---- the drawn face
    white = flat("eyewhite", (0.98, 0.97, 0.94))
    ink = flat("ink", INK)
    eye_a, eye_b = 0.05, 0.062
    F.eyes, F.looks, F.lids, F.brows = [], [], [], []
    for side in (-1, 1):
        ex, ez = side * 0.125, -0.005
        p = surface_point(rx, ry, rz, ex, ez) + Vector((0, 0, c.z))
        eye = disc(f"eye{side}", {"Basis": ellipse_rim(eye_a, eye_b, squash_bottom=0.9)}, 0.0075, white, root, p, proxy, 0.001, ink,
                   band=lambda i: not (2 <= i <= 18))
        n = Vector((ex / rx ** 2, p.y / ry ** 2, ez / rz ** 2)).normalized()
        eye.rotation_mode = "QUATERNION"
        eye.rotation_quaternion = (-n).to_track_quat("Y", "Z")
        F.eyes.append(eye)
        lookp = link(bpy.data.objects.new(f"look{side}", None))
        lookp.parent = eye
        lookp.location = (0, 0, -0.004)
        F.looks.append(lookp)
        iris_m = flat(f"iris{side}", L["iris"], (eye, eye_a, eye_b * 0.95))
        pup_m = flat(f"pupil{side}", (0.03, 0.02, 0.02), (eye, eye_a, eye_b * 0.95))
        hl_m = flat(f"hilite{side}", (1, 1, 1), (eye, eye_a, eye_b * 0.95))
        iris = disc(f"iris{side}", {"Basis": ellipse_rim(0.031, 0.036)}, 0.0, iris_m, lookp, (0, -0.001, 0), proxy, 0.002)
        pupil = disc(f"pupil{side}", {"Basis": ellipse_rim(0.017, 0.02)}, 0.0, pup_m, lookp, (0, -0.002, 0.0), proxy, 0.0026)
        hl = disc(f"hl{side}", {"Basis": ellipse_rim(0.0085, 0.0095)}, 0.0, hl_m, lookp, (0.011, -0.003, 0.014), proxy, 0.0032)
        lid = disc(f"lid{side}", {"Basis": lid_rim(eye_a, eye_b, 0.0), "BLINK": lid_rim(eye_a, eye_b, 1.0),
                                  "HALF": lid_rim(eye_a, eye_b, 0.45), "SQUINT": lid_rim(eye_a, eye_b, 0.55, squint=0.9)},
                   0.011, toon(f"lidskin{side}", L["skin"], shadow=(0.78, 0.58, 0.62), lit=0.36), eye, (0, -0.0005, 0), proxy, 0.0055, ink,
                   band=lambda i: 20 <= i <= 39)
        F.lids.append(lid)
        # brows
        bz = ez + 0.105
        bp = surface_point(rx, ry, rz, side * 0.13, bz) + Vector((0, 0, c.z))
        sh = {"Basis": brow_rim(0.115, 0.03, 0.012, 0.0, 0.0, side),
              "UP": brow_rim(0.115, 0.03, 0.024, -0.004, 0.028, side),
              "ANGRY": brow_rim(0.115, 0.032, 0.004, 0.03, -0.006, side),
              "SAD": brow_rim(0.115, 0.028, 0.006, -0.026, 0.006, side)}
        brow = disc(f"brow{side}", sh, 0.0, flat(f"browc{side}", L["brow"]), root, bp, proxy, 0.003)
        F.brows.append(brow)
        # cheek blush: soft, no ink
        cp = surface_point(rx, ry, rz, side * 0.2, -0.1) + Vector((0, 0, c.z))
        disc(f"cheek{side}", {"Basis": ellipse_rim(0.04, 0.02)}, 0.0, blush_mat(L["cheek"]), root, cp, proxy, 0.0008)
    # mouth (visemes)
    mp = surface_point(rx, ry, rz, 0, -0.175) + Vector((0, 0, c.z))
    W = 0.062
    shapes = {
        "Basis": mouth_rim(W, 0.0035, 0.0035, 0.006),
        "A": mouth_rim(W * 1.0, 0.03, 0.075, 0.0, cupid=0.006),
        "E": mouth_rim(W * 1.25, 0.018, 0.04, 0.006),
        "O": mouth_rim(W * 0.6, 0.038, 0.058, -0.002),
        "U": mouth_rim(W * 0.45, 0.02, 0.024, -0.002),
        "M": mouth_rim(W * 0.95, 0.0015, 0.0015, 0.0),
        "F": mouth_rim(W * 1.05, 0.007, 0.016, 0.002),
        "TH": mouth_rim(W * 1.05, 0.012, 0.026, 0.0),
        "C": mouth_rim(W * 1.05, 0.012, 0.024, 0.003),
        "SMILE": mouth_rim(W * 1.25, 0.0035, 0.02, 0.03),
        "GRIN": mouth_rim(W * 1.45, 0.016, 0.042, 0.032, cupid=0.004),
        "FROWN": mouth_rim(W * 0.95, 0.0035, 0.0035, -0.02),
    }
    mouth = disc("mouth", shapes, 0.0075, mouth_mat(), root, mp, proxy, 0.0016, ink, uv_from="A")
    mouth.rotation_mode = "XYZ"
    F.mouth = mouth


def blush_mat(rgb):
    m = bpy.data.materials.new("blush")
    m.use_nodes = True
    nd, ln = m.node_tree.nodes, m.node_tree.links
    nd.clear()
    out = nd.new("ShaderNodeOutputMaterial")
    uv = nd.new("ShaderNodeUVMap")
    sub = nd.new("ShaderNodeVectorMath")
    sub.operation = "SUBTRACT"
    sub.inputs[1].default_value = (0.5, 0.5, 0)
    ln.new(uv.outputs[0], sub.inputs[0])
    lg = nd.new("ShaderNodeVectorMath")
    lg.operation = "LENGTH"
    ln.new(sub.outputs[0], lg.inputs[0])
    mr = nd.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.5
    mr.inputs["From Max"].default_value = 0.1
    mr.inputs["To Max"].default_value = 0.45
    ln.new(lg.outputs["Value"], mr.inputs[0])
    em = nd.new("ShaderNodeEmission")
    em.inputs[0].default_value = (*rgb, 1)
    tr = nd.new("ShaderNodeBsdfTransparent")
    mix = nd.new("ShaderNodeMixShader")
    ln.new(mr.outputs[0], mix.inputs[0])
    ln.new(tr.outputs[0], mix.inputs[1])
    ln.new(em.outputs[0], mix.inputs[2])
    ln.new(mix.outputs[0], out.inputs[0])
    m.surface_render_method = "BLENDED"
    return m


# ------------------------------------------------------------------ animation
VISEMES = ["A", "E", "O", "U", "M", "F", "TH", "C"]


def _key_sk(o, name, frame, value):
    kb = o.data.shape_keys.key_blocks[name]
    kb.value = value
    kb.keyframe_insert("value", frame=frame)


def lipsync(F, keys, start_frame, fps, lead=0.05, strength=1.0):
    """keys: [(t_seconds, viseme)] with 'REST' between words. Sets one key per viseme per change,
    with a short ease so shapes blend like real mouth motion; leads the audio slightly (animators' rule)."""
    m = F.mouth
    for v in VISEMES:
        _key_sk(m, v, start_frame - 2, 0.0)
    prev = None
    for i, (t, v) in enumerate(keys):
        f = start_frame + (t - lead) * fps
        nxt = keys[i + 1][0] if i + 1 < len(keys) else t + 0.2
        dur = max(nxt - t, 0.04)
        for name in VISEMES:
            target = (strength if name == v else 0.0)
            # vowels open fully, consonants are quicker and smaller
            if name == v and v in ("C", "TH", "F"):
                target *= 0.85
            _key_sk(m, name, f, target)
        if v != "REST" and dur > 0.22:  # long sounds relax a little before the next one
            for name in VISEMES:
                if name == v:
                    _key_sk(m, name, f + dur * fps * 0.7, strength * 0.75)
        prev = v


_LAST = {}


def _key_expr(o, name, frame, value, ramp=5):
    """expression keys hold their previous value until `ramp` frames before the change (no slow drifts)"""
    k = (o.name, name)
    pf, pv = _LAST.get(k, (None, 0.0))
    if pf is None:
        _key_sk(o, name, 1, pv)
    elif frame - ramp > pf:
        _key_sk(o, name, frame - ramp, pv)
    _key_sk(o, name, frame, value)
    _LAST[k] = (frame, value)


def set_expr(F, frame, smile=0.0, grin=0.0, frown=0.0, brow_up=0.0, brow_angry=0.0, brow_sad=0.0, squint=0.0, half=0.0, hold=0, ramp=5):
    for name, v in (("SMILE", smile), ("GRIN", grin), ("FROWN", frown)):
        _key_expr(F.mouth, name, frame, v, ramp)
    for b in F.brows:
        for name, v in (("UP", brow_up), ("ANGRY", brow_angry), ("SAD", brow_sad)):
            _key_expr(b, name, frame, v, ramp)
    for l in F.lids:
        for name, v in (("SQUINT", squint), ("HALF", half)):
            _key_expr(l, name, frame, v, ramp)


def blink(F, frame, dur=5):
    for l in F.lids:
        _key_sk(l, "BLINK", frame - 1, 0.0)
        _key_sk(l, "BLINK", frame + dur * 0.4, 1.0)
        _key_sk(l, "BLINK", frame + dur, 0.0)


def look(F, frame, x, z, snap=3):
    """eye direction: x right/left, z up/down in -1..1 (saccade: fast move, then hold)"""
    px, pz = getattr(F, "prev_look", (0.0, 0.0))
    for lp in F.looks:
        lp.location = (px * 0.019, -0.004, pz * 0.017)
        lp.keyframe_insert("location", frame=frame)
        lp.location = (x * 0.019, -0.004, z * 0.017)
        lp.keyframe_insert("location", frame=frame + snap)
    F.prev_look = (x, z)


def head_pose(F, frame, pitch=0.0, yaw=0.0, roll=0.0):
    F.root.rotation_euler = (math.radians(pitch), math.radians(roll), math.radians(yaw))
    F.root.keyframe_insert("rotation_euler", frame=frame)
