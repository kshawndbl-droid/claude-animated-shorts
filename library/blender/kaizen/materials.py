"""Kaizen Clips procedural materials (no image textures needed, all free): ground types, wood, bark, stone, brick,
plaster, roofs, cloth, metal, glass and lit windows. Every material takes colours, so one function covers many looks.
`palette` gives period/mood colour sets so a whole set changes character with one word.
"""
import bpy  # noqa: I001

SNOW = (0.5, 0.56, 0.66)


def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes["Principled BSDF"]


# ------------------------------------------------------------------ node helpers (same as the Hidebehind set)
def noise(nd, ln, vec, scale, detail=6.0, rough=0.55):
    no = nd.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = scale
    no.inputs["Detail"].default_value = detail
    no.inputs["Roughness"].default_value = rough
    if vec is not None:
        ln.new(vec, no.inputs["Vector"])
    return no


def ramp(nd, ln, fac, c0, c1, p0=0.0, p1=1.0):
    r = nd.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position, r.color_ramp.elements[1].position = p0, p1
    r.color_ramp.elements[0].color = (*c0, 1) if len(c0) == 3 else c0
    r.color_ramp.elements[1].color = (*c1, 1) if len(c1) == 3 else c1
    ln.new(fac, r.inputs[0])
    return r


def mix(nd, ln, fac, a, b, blend="MIX"):
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


def math_(nd, ln, op, a, b=None, clamp=True):
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


def maprange(nd, ln, v, a, b, c=0.0, d=1.0):
    m = nd.new("ShaderNodeMapRange")
    m.interpolation_type = "SMOOTHSTEP"
    ln.new(v, m.inputs[0])
    m.inputs[1].default_value, m.inputs[2].default_value = a, b
    m.inputs[3].default_value, m.inputs[4].default_value = c, d
    return m


def bump(nd, ln, bs, height, strength=0.5, dist=0.03):
    bp = nd.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = strength
    bp.inputs["Distance"].default_value = dist
    ln.new(height, bp.inputs["Height"])
    ln.new(bp.outputs[0], bs.inputs["Normal"])


def snow_on_top(nd, ln, col, amount=1.0, scale=3.0):
    geo = nd.new("ShaderNodeNewGeometry")
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(geo.outputs["Normal"], sep.inputs[0])
    up = maprange(nd, ln, sep.outputs[2], 0.55, 0.9)
    tc = nd.new("ShaderNodeTexCoord")
    nz = noise(nd, ln, tc.outputs["Object"], scale, 4.0)
    br = maprange(nd, ln, nz.outputs["Fac"], 0.42, 0.58)
    f = math_(nd, ln, "MULTIPLY", up.outputs[0], br.outputs[0])
    f = math_(nd, ln, "MULTIPLY", f.outputs[0], amount)
    return mix(nd, ln, f.outputs[0], col, SNOW).outputs[2]


# ------------------------------------------------------------------ materials
def flat(name, rgb, rough=0.7, metal=0.0, emit=0.0):
    m, nd, ln, b = new_mat(name)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


def varied(name, dark, light, scale=4.0, rough=0.8, bump_k=0.3, snow=0.0):
    """a colour that varies in soft blotches (dirt, wear, sun-fading): the base of most surfaces"""
    m, nd, ln, bs = new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    no = noise(nd, ln, tc.outputs["Object"], scale, 6.0, 0.6)
    fine = noise(nd, ln, tc.outputs["Object"], scale * 12, 4.0, 0.6)
    c = ramp(nd, ln, no.outputs["Fac"], dark, light, 0.3, 0.7).outputs[0]
    c = mix(nd, ln, 0.25, c, fine.outputs["Color"], "OVERLAY").outputs[2]
    if snow:
        c = snow_on_top(nd, ln, c, snow)
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = rough
    if bump_k:
        bump(nd, ln, bs, fine.outputs["Fac"], bump_k)
    return m


GROUNDS = {
    # name: (dark, light, scale, rough, bump)
    "grass": ((0.05, 0.09, 0.025), (0.16, 0.24, 0.07), 1.2, 0.9, 0.4),
    "drygrass": ((0.16, 0.13, 0.06), (0.4, 0.33, 0.16), 1.2, 0.9, 0.4),
    "dirt": ((0.07, 0.05, 0.035), (0.2, 0.15, 0.1), 1.5, 0.95, 0.5),
    "mud": ((0.035, 0.028, 0.022), (0.09, 0.07, 0.05), 1.8, 0.55, 0.6),
    "sand": ((0.42, 0.34, 0.22), (0.62, 0.52, 0.36), 0.8, 0.9, 0.3),
    "snow": ((0.5, 0.55, 0.62), (0.75, 0.79, 0.85), 0.8, 0.6, 0.2),
    "floor": ((0.16, 0.1, 0.06), (0.28, 0.18, 0.1), 3.0, 0.6, 0.2),
}


def ground(kind="grass", path=None, path_kind="dirt", snow=0.0):
    """a ground material; with path=(attribute name) a worn path/road blends in where the attribute is near 0"""
    d, l, s, r, b = GROUNDS[kind]
    m, nd, ln, bs = new_mat(f"ground_{kind}")
    tc = nd.new("ShaderNodeTexCoord")
    coarse = noise(nd, ln, tc.outputs["Object"], s * 0.35, 6.0)
    fine = noise(nd, ln, tc.outputs["Object"], s * 40, 5.0, 0.7)
    c = ramp(nd, ln, coarse.outputs["Fac"], d, l, 0.3, 0.72).outputs[0]
    c = mix(nd, ln, fine.outputs["Fac"], c, tuple(v * 1.4 for v in l), "OVERLAY").outputs[2]
    if path:
        at = nd.new("ShaderNodeAttribute")
        at.attribute_name = path
        a = math_(nd, ln, "ABSOLUTE", at.outputs["Fac"], clamp=False)
        edge = noise(nd, ln, tc.outputs["Object"], 2.5, 3.0)
        a = math_(nd, ln, "ADD", a.outputs[0], math_(nd, ln, "MULTIPLY", edge.outputs["Fac"], 0.8, clamp=False).outputs[0], clamp=False)
        k = maprange(nd, ln, a.outputs[0], 1.9, 1.2)
        pd, pl, *_ = GROUNDS[path_kind]
        pc = ramp(nd, ln, coarse.outputs["Fac"], pd, pl, 0.3, 0.7).outputs[0]
        c = mix(nd, ln, k.outputs[0], c, pc).outputs[2]
    if snow:
        c = snow_on_top(nd, ln, c, snow, 0.6)
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = r
    bump(nd, ln, bs, fine.outputs["Fac"], b, 0.05)
    return m


def cobbles(name="cobbles", dark=(0.11, 0.1, 0.09), light=(0.22, 0.2, 0.18), scale=16.0):
    m, nd, ln, bs = new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    vo = nd.new("ShaderNodeTexVoronoi")
    vo.feature = "DISTANCE_TO_EDGE"
    vo.inputs["Scale"].default_value = scale
    ln.new(tc.outputs["Object"], vo.inputs["Vector"])
    vc = nd.new("ShaderNodeTexVoronoi")
    vc.inputs["Scale"].default_value = scale
    ln.new(tc.outputs["Object"], vc.inputs["Vector"])
    joint = maprange(nd, ln, vo.outputs["Distance"], 0.02, 0.09)
    stone = ramp(nd, ln, vc.outputs["Color"], dark, light, 0.0, 1.0)
    c = mix(nd, ln, joint.outputs[0], (0.03, 0.028, 0.025), stone.outputs[0]).outputs[2]
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.75
    bump(nd, ln, bs, joint.outputs[0], 0.8, 0.04)
    return m


def wood(name, dark=(0.1, 0.06, 0.035), light=(0.3, 0.2, 0.11), planks=True, stretch=18.0, rough=0.75):
    """planks / beams: grain stretched along local X; with planks=True, dark seams every ~20 cm"""
    m, nd, ln, bs = new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, stretch, stretch)
    ln.new(tc.outputs["Object"], mp.inputs[0])
    no = noise(nd, ln, mp.outputs[0], 3.0, 8.0, 0.65)
    c = ramp(nd, ln, no.outputs["Fac"], dark, light, 0.3, 0.75).outputs[0]
    if planks:
        wv = nd.new("ShaderNodeTexWave")
        wv.wave_type, wv.bands_direction = "BANDS", "Z"
        wv.inputs["Scale"].default_value = 2.5
        wv.inputs["Distortion"].default_value = 0.0
        ln.new(tc.outputs["Object"], wv.inputs["Vector"])
        seam = maprange(nd, ln, wv.outputs["Fac"], 0.03, 0.12)
        c = mix(nd, ln, seam.outputs[0], tuple(v * 0.35 for v in dark), c).outputs[2]
        bump(nd, ln, bs, seam.outputs[0], 0.5, 0.02)
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = rough
    return m


def bricks(name="brick", brick=(0.32, 0.12, 0.07), mortar=(0.45, 0.42, 0.38), scale=4.0, dirt=0.35):
    m, nd, ln, bs = new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    bt = nd.new("ShaderNodeTexBrick")
    bt.inputs["Scale"].default_value = scale
    bt.inputs["Mortar Size"].default_value = 0.018
    bt.inputs["Color1"].default_value = (*brick, 1)
    bt.inputs["Color2"].default_value = (*(v * 0.75 for v in brick), 1)
    bt.inputs["Mortar"].default_value = (*mortar, 1)
    ln.new(tc.outputs["Object"], bt.inputs["Vector"])
    no = noise(nd, ln, tc.outputs["Object"], 1.2, 5.0)
    c = mix(nd, ln, dirt, bt.outputs["Color"], no.outputs["Color"], "MULTIPLY").outputs[2]
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.85
    bump(nd, ln, bs, bt.outputs["Fac"], 0.6, 0.02)
    return m


def stone(name="stone", dark=(0.15, 0.14, 0.13), light=(0.38, 0.36, 0.33), blocks=True):
    m, nd, ln, bs = new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    no = noise(nd, ln, tc.outputs["Object"], 3.0, 8.0, 0.6)
    c = ramp(nd, ln, no.outputs["Fac"], dark, light, 0.3, 0.75).outputs[0]
    if blocks:
        bt = nd.new("ShaderNodeTexBrick")
        bt.inputs["Scale"].default_value = 1.6
        bt.inputs["Mortar Size"].default_value = 0.012
        bt.inputs["Color1"].default_value = (1, 1, 1, 1)
        bt.inputs["Color2"].default_value = (0.8, 0.8, 0.8, 1)
        bt.inputs["Mortar"].default_value = (0.25, 0.25, 0.25, 1)
        ln.new(tc.outputs["Object"], bt.inputs["Vector"])
        c = mix(nd, ln, 1.0, c, bt.outputs["Color"], "MULTIPLY").outputs[2]
        bump(nd, ln, bs, bt.outputs["Fac"], 0.6, 0.03)
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.9
    return m


def plaster(name, col=(0.62, 0.55, 0.44), dirt=0.4):
    return varied(name, tuple(v * (1 - dirt * 0.6) for v in col), col, scale=2.5, rough=0.9, bump_k=0.15)


def roof(name, kind="tiles", col=(0.35, 0.14, 0.08)):
    """tiles (rows), slate, shingle, thatch, tin"""
    m, nd, ln, bs = new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    if kind == "thatch":
        mp = nd.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (40.0, 1.0, 1.0)
        ln.new(tc.outputs["Object"], mp.inputs[0])
        no = noise(nd, ln, mp.outputs[0], 6.0, 8.0, 0.7)
        c = ramp(nd, ln, no.outputs["Fac"], (0.16, 0.12, 0.06), (0.42, 0.34, 0.18), 0.3, 0.75).outputs[0]
        bump(nd, ln, bs, no.outputs["Fac"], 0.8, 0.05)
        bs.inputs["Roughness"].default_value = 0.95
    else:
        wv = nd.new("ShaderNodeTexWave")
        wv.wave_type, wv.bands_direction = "BANDS", "Y" if kind != "tin" else "X"
        wv.inputs["Scale"].default_value = {"tiles": 9.0, "slate": 11.0, "shingle": 10.0, "tin": 14.0}[kind]
        ln.new(tc.outputs["Object"], wv.inputs["Vector"])
        no = noise(nd, ln, tc.outputs["Object"], 2.5, 5.0)
        base = ramp(nd, ln, no.outputs["Fac"], tuple(v * 0.6 for v in col), col, 0.3, 0.75).outputs[0]
        rows = maprange(nd, ln, wv.outputs["Fac"], 0.0, 0.35)
        c = mix(nd, ln, rows.outputs[0], tuple(v * 0.4 for v in col), base).outputs[2]
        bump(nd, ln, bs, rows.outputs[0], 0.7, 0.03)
        bs.inputs["Roughness"].default_value = 0.55 if kind == "tin" else 0.8
        if kind == "tin":
            bs.inputs["Metallic"].default_value = 0.5
    ln.new(c, bs.inputs["Base Color"])
    return m


def cloth(name, col=(0.5, 0.45, 0.35), rough=0.95):
    return varied(name, tuple(v * 0.75 for v in col), col, scale=6.0, rough=rough, bump_k=0.1)


def metal(name, col=(0.3, 0.3, 0.32), rough=0.45):
    return flat(name, col, rough=rough, metal=0.8)


def glass_lit(name, col=(1.0, 0.62, 0.28), strength=4.0):
    """a window lit from inside: warm emission (interiors at dusk/night) - pass strength 0 for a dark daytime pane"""
    m, nd, ln, bs = new_mat(name)
    bs.inputs["Base Color"].default_value = (0.03, 0.035, 0.04, 1) if strength == 0 else (*col, 1)
    bs.inputs["Roughness"].default_value = 0.08
    if strength:
        bs.inputs["Emission Color"].default_value = (*col, 1)
        bs.inputs["Emission Strength"].default_value = strength
    return m


def leaves(name, dark=(0.03, 0.07, 0.02), light=(0.12, 0.22, 0.05), autumn=0.0):
    if autumn:
        light = tuple(a * (1 - autumn) + b * autumn for a, b in zip(light, (0.5, 0.22, 0.04)))
        dark = tuple(a * (1 - autumn) + b * autumn for a, b in zip(dark, (0.18, 0.07, 0.02)))
    return varied(name, dark, light, scale=8.0, rough=0.7, bump_k=0.6)


def bark(name="bark", dark=(0.03, 0.025, 0.02), light=(0.16, 0.13, 0.1), snow=0.0):
    m, nd, ln, bs = new_mat(name)
    tc = nd.new("ShaderNodeTexCoord")
    mp = nd.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 1.0, 0.12)
    ln.new(tc.outputs["Object"], mp.inputs[0])
    vo = nd.new("ShaderNodeTexVoronoi")
    vo.feature = "DISTANCE_TO_EDGE"
    vo.inputs["Scale"].default_value = 9.0
    ln.new(mp.outputs[0], vo.inputs["Vector"])
    no = noise(nd, ln, mp.outputs[0], 14.0, 10.0, 0.6)
    plates = maprange(nd, ln, vo.outputs["Distance"], 0.0, 0.12)
    h = math_(nd, ln, "MULTIPLY", plates.outputs[0], no.outputs["Fac"])
    c = ramp(nd, ln, h.outputs[0], dark, light, 0.05, 0.6).outputs[0]
    if snow:
        c = snow_on_top(nd, ln, c, snow)
    ln.new(c, bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.92
    bump(nd, ln, bs, h.outputs[0], 0.9, 0.04)
    return m


# ------------------------------------------------------------------ palettes (period / mood colour sets)
PALETTES = {
    # walls, trim, roofs, doors: a few options each, picked per building by the set's random stream
    "1800s": dict(walls=[(0.62, 0.55, 0.42), (0.55, 0.42, 0.3), (0.7, 0.64, 0.52), (0.48, 0.36, 0.26)],
                  trim=[(0.2, 0.14, 0.09), (0.32, 0.26, 0.18)], roofs=[(0.25, 0.12, 0.07), (0.2, 0.19, 0.2), (0.32, 0.18, 0.1)],
                  doors=[(0.2, 0.1, 0.06), (0.12, 0.18, 0.14), (0.3, 0.08, 0.06)], roofkind="shingle", brick=0.4),
    "medieval": dict(walls=[(0.68, 0.62, 0.5), (0.6, 0.55, 0.44)], trim=[(0.12, 0.08, 0.05)], roofs=[(0.34, 0.27, 0.14)],
                     doors=[(0.18, 0.11, 0.06)], roofkind="thatch", brick=0.0, timber=True),
    "victorian": dict(walls=[(0.32, 0.13, 0.08), (0.4, 0.18, 0.1), (0.5, 0.46, 0.4)], trim=[(0.85, 0.82, 0.74), (0.15, 0.15, 0.16)],
                      roofs=[(0.16, 0.16, 0.18)], doors=[(0.08, 0.1, 0.12), (0.25, 0.05, 0.05)], roofkind="slate", brick=0.8),
    "1920s": dict(walls=[(0.55, 0.4, 0.3), (0.7, 0.66, 0.58), (0.42, 0.24, 0.16)], trim=[(0.9, 0.88, 0.82), (0.2, 0.22, 0.2)],
                  roofs=[(0.18, 0.18, 0.2), (0.3, 0.14, 0.09)], doors=[(0.12, 0.2, 0.15), (0.1, 0.1, 0.12)], roofkind="slate", brick=0.6),
    "mediterranean": dict(walls=[(0.86, 0.8, 0.68), (0.82, 0.62, 0.42), (0.9, 0.86, 0.78)], trim=[(0.2, 0.32, 0.45), (0.5, 0.3, 0.15)],
                          roofs=[(0.55, 0.22, 0.1)], doors=[(0.15, 0.3, 0.45), (0.35, 0.2, 0.1)], roofkind="tiles", brick=0.0),
    "japan": dict(walls=[(0.82, 0.78, 0.68), (0.3, 0.22, 0.15)], trim=[(0.15, 0.1, 0.07)], roofs=[(0.18, 0.18, 0.2)],
                  doors=[(0.75, 0.7, 0.58)], roofkind="tiles", brick=0.0, timber=True),
    "modern": dict(walls=[(0.75, 0.74, 0.7), (0.5, 0.52, 0.55), (0.62, 0.5, 0.4)], trim=[(0.2, 0.2, 0.22), (0.9, 0.9, 0.9)],
                   roofs=[(0.2, 0.2, 0.22)], doors=[(0.15, 0.15, 0.17), (0.5, 0.1, 0.08)], roofkind="tin", brick=0.3),
}
