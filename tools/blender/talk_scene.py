# 10-second talking-character test (Blender 5.3, EEVEE): a young Greek hero on a windy cliff by a temple at golden hour
# tells the camera about the 300 steps he just climbed. Lip-sync from phoneme timings (talk/<line>.json), eye darts, blinks,
# brows, expressions, head motion and body animation (KayKit CC0 rig) in a living world (sea, drifting clouds,
# trees and grass in the wind, braziers with flickering fire light, dust in the light, gulls).
# usage: .venv-bpy/bin/python tools/blender/talk_scene.py -- --out out/blender/talk/f_ [--frames 1,100] [--res 540] [--samples 16]
import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import face_rig as fr  # noqa: E402
import test_scene as ts  # noqa: E402
ts.CANOPY_SUB = 3

ROOT = ts.ROOT
A = ts.A
FPS, N = 30, 300
args = ts.args
arg = ts.arg
T0 = 1.0  # the line starts at 1.0 s
LINE = os.path.join(ROOT, "out", "blender", "talk", arg("--line", "l3") + ".json")


def F_(t):
    return 1 + round((T0 + t) * FPS)


def toonify_body(rig):
    """KayKit body parts: cel-shaded with their own texture (warm bronze armour, red cloak) + ink outlines"""
    base = bpy.data.materials["knight_texture"]
    img = [n for n in base.node_tree.nodes if n.type == "TEX_IMAGE"][0].image
    mats = {}

    def tex_toon(name, hue, sat, val, tint):
        m = fr.toon(name, (1, 1, 1), shadow=(0.6, 0.48, 0.58), lit=0.4)
        nd, ln = m.node_tree.nodes, m.node_tree.links
        t = nd.new("ShaderNodeTexImage")
        t.image = img
        t.interpolation = "Closest"
        hs = nd.new("ShaderNodeHueSaturation")
        hs.inputs["Hue"].default_value = hue
        hs.inputs["Saturation"].default_value = sat
        hs.inputs["Value"].default_value = val
        ln.new(t.outputs[0], hs.inputs["Color"])
        mul = [n for n in nd if n.type == "MIX"][0]
        tn = nd.new("ShaderNodeMix")
        tn.data_type = "RGBA"
        tn.blend_type = "MULTIPLY"
        tn.inputs[0].default_value = 1
        ln.new(hs.outputs[0], tn.inputs[6])
        tn.inputs[7].default_value = (*tint, 1)
        ln.new(tn.outputs[2], mul.inputs[6])
        return m

    armour = tex_toon("armour_toon", 0.5, 1.0, 1.7, (1.05, 0.58, 0.24))  # grey steel -> warm bronze
    for o in bpy.data.objects:
        if o.type != "MESH" or o.parent != rig:
            continue
        if o.name.startswith("Knight_Cape"):
            o.data.materials[0] = fr.toon("cloak", (0.55, 0.07, 0.05), shadow=(0.55, 0.4, 0.55), lit=0.4)
        else:
            o.data.materials[0] = armour
        for p in o.data.polygons:
            p.use_smooth = True
        s = o.modifiers.new("smooth", "SUBSURF")
        s.levels = 1
        s.render_levels = 1
        fr.add_outline(o, 0.012)


def gesture_track(rig, name, start, blend=6, influence=1.0, speed=1.0, length=None):
    act = bpy.data.actions.get(name)
    tr = rig.animation_data.nla_tracks.new()
    st = tr.strips.new(name, int(start), act)
    st.scale = 1.0 / speed
    if length:
        st.action_frame_end = act.frame_range[0] + length
    st.blend_in = blend
    st.blend_out = blend
    st.influence = influence
    st.use_animated_influence = False
    return st


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, N
    ts.world()
    w = sc.world
    # EEVEE's world volume is infinite and swallows the sky: use a local haze box around the set instead
    for n in list(w.node_tree.nodes):
        if n.type == "PRINCIPLED_VOLUME":
            w.node_tree.nodes.remove(n)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    # golden-hour sun from the front left, low; a cool rim from behind
    sun = bpy.data.objects["sun"]
    sun.data.energy = 3.6
    sun.rotation_euler = (Vector((0, 0, 0)) - Vector((-6, -9, 4.5))).to_track_quat("-Z", "Y").to_euler()
    rim = ts.link(bpy.data.objects.new("rim", bpy.data.lights.new("rim", "SUN")))
    rim.data.energy = 2.2
    rim.data.color = (0.75, 0.82, 1.0)
    rim.rotation_euler = (Vector((0, 0, 0)) - Vector((5, 8, 5))).to_track_quat("-Z", "Y").to_euler()
    ts.clouds()
    cm = bpy.data.materials["clouds"]
    for n in cm.node_tree.nodes:
        if n.type == "MAPPING":
            n.inputs["Scale"].default_value = (0.005, 0.009, 0.03)
        if n.type == "TEX_NOISE":
            n.inputs["Scale"].default_value = 2.2
            n.inputs["Detail"].default_value = 6
        if n.type == "EMISSION":
            n.inputs["Strength"].default_value = 1.1
    ts.sea()
    ts.terrain()
    marble = ts.tex_mat("marble", os.path.join(A, "blender", "Marble012"), "Marble012_2K-JPG", scale=2, tint=(1.0, 0.95, 0.88))
    ts.temple(marble)
    bark = ts.flat_mat("bark", (0.16, 0.12, 0.09), 0.9)
    leaf = ts.flat_mat("leaf", (0.16, 0.24, 0.09), 0.7)
    wt = ts.wind_texture("gust", 3.0)
    we = ts.wind_driver_empty("wind", (1.6, 0.6))
    for loc, s in [((-6, 20), 1.2), ((6.5, 24), 1.0), ((-9, 30), 1.4), ((8.5, 33), 1.1), ((3.6, 11.5), 0.9), ((-3.4, 9.8), 0.85)]:
        ts.olive_tree((loc[0], loc[1], ts.ground_z(*loc)), s, we, wt, bark, leaf)
    ts.grass_tufts(2600, ((-10, 10), (4, 26)), we, wt, ts.flat_mat("grassblade", (0.3, 0.32, 0.1), 0.8))
    bronze = ts.flat_mat("bronze", (0.55, 0.32, 0.12), 0.35, metal=0.9)
    fires = [ts.brazier((-1.9, 12.5, ts.ground_z(-1.9, 12.5)), bronze), ts.brazier((2.1, 13.5, ts.ground_z(2.1, 13.5)), bronze)]
    if "--fire" in args:
        for f in fires:
            ts.fire_sim(f)
    ts.dust(Vector((0, 11, 1.6)))
    ts.seagull((-30, 40, 9), (30, 30, 12), 0)
    ts.seagull((-34, 44, 10), (26, 34, 13), 1.7)
    ts.seagull((-26, 46, 8), (34, 38, 10), 3.1)

    # ---- hero
    bpy.ops.import_scene.gltf(filepath=os.path.join(A, "blender", "kaykit", "Knight.glb"))
    imported = list(bpy.context.selected_objects)
    rig = [o for o in imported if o.type == "ARMATURE"][0]
    for o in imported:
        if o.type == "MESH" and o.name.split(".")[0] in ("Knight_Head", "Knight_Helmet", "2H_Sword", "Badge_Shield", "Rectangle_Shield",
                                                         "Spike_Shield", "1H_Sword_Offhand", "Icosphere", "Round_Shield", "1H_Sword"):
            bpy.data.objects.remove(o, do_unlink=True)
    if rig.animation_data:
        rig.animation_data.action = None
    else:
        rig.animation_data_create()
    face = fr.build_head(rig)
    toonify_body(rig)
    HX, HY = 0.0, 8.0
    rig.location = (HX, HY, ts.ground_z(HX, HY) + 0.05)
    rig.rotation_euler = (0, 0, math.radians(-12))  # turned a little toward the camera's side
    ts.play(rig, "Idle", -20, N + 20, speed=0.9, blend=0)

    # ---- performance (timings from the line's words)
    L = json.load(open(LINE))
    words = L["words"]
    wt_ = {w["w"].strip(".,?!").lower(): w for w in words}
    fr.lipsync(face, [(t, v) for t, v in L["keys"]], F_(0), FPS)
    for v in fr.VISEMES:  # mouth closed after the line
        fr._key_sk(face.mouth, v, F_(words[-1]["e"]) + 3, 0.0)
    S = lambda w: F_(wt_[w]["s"])
    E = lambda w: F_(wt_[w]["e"])
    # before the line: catching his breath after the climb, glancing back at the temple
    fr.set_expr(face, 1, brow_sad=0.45, half=0.35)
    fr.look(face, 1, 0.7, 0.45)
    fr.look(face, 18, 0.0, 0.0, snap=3)
    fr.blink(face, 16)
    for t_ in (0.1, 0.45, 0.8):  # panting
        fr._key_sk(face.mouth, "A", 1 + round(t_ * FPS), 0.35)
        fr._key_sk(face.mouth, "A", 1 + round((t_ + 0.17) * FPS), 0.1)
    # "Okay." - a tired exhale
    fr.set_expr(face, S("okay"), brow_sad=0.55, half=0.35)
    # "Three hundred steps" - disbelief, eyes flick to the steps behind him
    fr.set_expr(face, S("300"), brow_up=0.85, frown=0.35, half=0.0)
    fr.look(face, S("300"), 0.75, 0.35, snap=2)
    fr.look(face, E("steps") + 2, 0.0, 0.0, snap=3)
    # "just to see one temple" - deadpan
    fr.set_expr(face, S("just"), brow_angry=0.35, frown=0.2, half=0.35)
    fr.set_expr(face, E("temple"), brow_angry=0.35, frown=0.2, half=0.35)
    fr.blink(face, E("temple") + 4)
    # "Was it worth it?" - weighing it up, eyes drift up
    fr.set_expr(face, S("was"), brow_up=0.55, brow_angry=0.0, frown=0.0, half=0.0)
    fr.look(face, S("was") + 4, -0.55, 0.65, snap=3)
    # "Honestly..." - a smile creeps in
    fr.set_expr(face, S("honestly"), brow_up=0.3, smile=0.25)
    fr.look(face, E("honestly") + 3, -0.3, 0.1, snap=4)
    fr.set_expr(face, S("yeah") - 4, brow_up=0.4, smile=0.6)
    fr.look(face, S("yeah") - 2, 0.0, 0.0, snap=3)
    fr.blink(face, S("yeah") + 6)
    # "Totally worth it!" - big happy grin
    fr.set_expr(face, S("totally"), grin=0.95, squint=0.7, brow_up=0.7, smile=0.0)
    end = F_(words[-1]["e"])
    fr.set_expr(face, end + 22, grin=0.95, squint=0.7, brow_up=0.7)
    # after: a gull swoops right past his head - startled, eyes up, then following it
    sting = end + 40
    fr.set_expr(face, sting, grin=0.0, smile=0.0, squint=0.0, brow_up=1.0)
    fr.set_expr(face, sting + 12, grin=0.0, frown=0.45, brow_up=0.7, brow_sad=0.5)
    for l in face.lids:
        fr._key_sk(l, "BLINK", sting - 1, 0.0)
        fr._key_sk(l, "BLINK", sting + 1, 0.8)
        fr._key_sk(l, "BLINK", sting + 3, 0.0)
    fr.look(face, sting + 2, 0.2, 0.9, snap=2)
    fr.look(face, sting + 14, -0.9, 0.5, snap=5)
    fr.look(face, sting + 32, -0.6, 0.0, snap=4)
    fr._key_sk(face.mouth, "O", sting, 0.0)
    fr._key_sk(face.mouth, "O", sting + 3, 0.8)
    fr._key_sk(face.mouth, "O", sting + 20, 0.4)
    fr._key_sk(face.mouth, "O", N, 0.4)
    # head: nods on stressed words, tilt on the grin, a duck at the gull
    hp = [(1, 6, 14, 0), (F_(0) - 2, 4, 0, 0), (S("okay") + 4, 9, 0, -3), (S("300"), -3, 14, 0), (S("steps"), 5, 4, 0),
          (S("one"), 3, 0, 0), (S("temple"), 7, 0, -2), (S("was"), -2, 0, 6), (E("worth") + 4, -6, -8, 8),
          (S("honestly"), -2, -10, 4), (S("yeah"), 7, 0, 0), (S("totally"), -5, 0, 8), (end, -3, -3, 10),
          (sting - 1, -3, -3, 8), (sting + 3, 12, 0, -4), (sting + 16, -10, -18, -4), (sting + 34, -4, -12, 0)]
    for f, p, y, r in hp:
        fr.head_pose(face, f, pitch=p, yaw=y, roll=r)
    # body acting on top of the idle
    gesture_track(rig, "Interact", S("was") - 4, blend=6, influence=0.7)
    gesture_track(rig, "Cheer", S("totally") - 2, blend=5, influence=0.6, speed=1.3)
    gesture_track(rig, "Block", sting, blend=4, influence=0.8)
    # the gull that buzzes him
    p0 = Vector((HX + 5, HY - 3.2, ts.ground_z(HX, HY) + 2.2))
    p1 = Vector((HX - 6, HY + 1.5, ts.ground_z(HX, HY) + 3.2))
    ts.seagull(tuple(p0), tuple(p1), 0.5)
    gull = sorted([o for o in bpy.data.objects if o.name.startswith("gull")], key=lambda o: o.name)[-1]
    gull.animation_data.action = None
    for o in [gull]:
        o.location = p0 + Vector((3, -2, -0.5))
        o.keyframe_insert("location", frame=sting - 8)
        o.location = (HX + 0.4, HY - 0.6, ts.ground_z(HX, HY) + 2.35)
        o.keyframe_insert("location", frame=sting + 2)
        o.location = p1
        o.keyframe_insert("location", frame=sting + 14)
        o.location = p1 + Vector((-8, 4, 3))
        o.keyframe_insert("location", frame=N)
    gull.rotation_euler = (0, 0, math.atan2(p1.y - p0.y, p1.x - p0.x))
    gull.scale = (1.2, 1.2, 1.2)

    # ---- cameras: wide establishing, medium, close-up, reaction push-in (cuts with markers)
    head = face.root
    look = ts.link(bpy.data.objects.new("focus", None))
    look.parent = head
    look.location = (0, -0.2, 0.42)
    def mkcam(name, loc, lens, aim, start, end_loc=None, end_lens=None, f0=1, f1=N, fstop=2.0):
        c = ts.link(bpy.data.objects.new(name, bpy.data.cameras.new(name)))
        c.data.lens = lens
        c.data.sensor_width = 36
        c.data.dof.use_dof = True
        c.data.dof.aperture_fstop = fstop
        c.data.dof.focus_object = look
        c.data.clip_start = 0.05
        tgt = ts.link(bpy.data.objects.new(name + "_aim", None))
        tgt.location = aim
        tc = c.constraints.new("TRACK_TO")
        tc.target = tgt
        tc.track_axis = "TRACK_NEGATIVE_Z"
        tc.up_axis = "UP_Y"
        c.location = loc
        c.keyframe_insert("location", frame=f0)
        c.data.keyframe_insert("lens", frame=f0)
        if end_loc:
            c.location = end_loc
            c.keyframe_insert("location", frame=f1)
        if end_lens:
            c.data.lens = end_lens
            c.data.keyframe_insert("lens", frame=f1)
        m = sc.timeline_markers.new(name, frame=start)
        m.camera = c
        return c, tgt
    gz = ts.ground_z(HX, HY)
    mkcam("cam_wide", (-3.4, HY - 8.5, gz + 0.9), 24, (0.3, HY + 3, gz + 2.4), 1, end_loc=(-2.6, HY - 6.5, gz + 1.15), f1=40, fstop=4)
    c2, _ = mkcam("cam_med", (1.2, HY - 3.4, gz + 1.65), 45, (0, HY, gz + 1.45), 41, end_loc=(0.6, HY - 3.0, gz + 1.6), f0=41, f1=150)
    mkcam("cam_close", (-0.5, HY - 2.4, gz + 1.75), 60, (0, HY, gz + 1.72), S("honestly") - 6, end_loc=(-0.3, HY - 2.0, gz + 1.72),
          f0=S("honestly") - 6, f1=sting - 6)
    mkcam("cam_react", (0.9, HY - 2.6, gz + 1.6), 50, (0, HY, gz + 1.7), sting - 5, end_loc=(0.45, HY - 1.7, gz + 1.7), end_lens=62,
          f0=sting - 5, f1=N)
    sc.camera = bpy.data.objects["cam_wide"]
    # a soft key light on the hero's face (front right), the warm sun stays as back/rim light
    key = ts.link(bpy.data.objects.new("key", bpy.data.lights.new("key", "SUN")))
    key.data.energy = 1.4
    key.data.color = (1.0, 0.9, 0.78)
    key.data.angle = math.radians(8)
    key.rotation_euler = (Vector((0, HY, gz + 1.5)) - Vector((3, HY - 6, gz + 4))).to_track_quat("-Z", "Y").to_euler()

    # only the sun casts shadows (CPU budget); fill, rim and fire lights are shadowless
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.name != "sun":
            o.data.use_shadow = False
    # warmer, deeper ground under the golden light
    g = bpy.data.materials.get("grass")
    if g:
        b_ = g.node_tree.nodes.get("Principled BSDF")
        if b_:
            b_.inputs["Roughness"].default_value = 1.0
            if "Specular IOR Level" in b_.inputs:
                b_.inputs["Specular IOR Level"].default_value = 0.0
            for l in list(b_.inputs["Roughness"].links):
                g.node_tree.links.remove(l)

    # ---- render settings
    sc.render.engine = "BLENDER_EEVEE"
    ee = sc.eevee
    ee.taa_render_samples = int(arg("--samples", "16"))
    if hasattr(ee, "use_volumetric_shadows"):
        ee.use_volumetric_shadows = False
    if hasattr(ee, "use_shadows"):
        ee.use_shadows = True
    if hasattr(ee, "shadow_resolution_scale"):
        ee.shadow_resolution_scale = 0.5
    if hasattr(ee, "use_raytracing"):
        ee.use_raytracing = "--rt" in args
    sc.view_settings.view_transform = arg("--view", "Standard")
    sc.view_settings.look = arg("--look", "AgX - Punchy" if sc.view_settings.view_transform == "AgX" else "Medium High Contrast")
    sc.view_settings.exposure = float(arg("--exposure", "-0.15"))
    res = int(arg("--res", "540"))
    sc.render.resolution_x, sc.render.resolution_y = res, int(res * 16 / 9)
    sc.render.image_settings.file_format = "PNG"
    return sc


if __name__ == "__main__":
    sc = build()
    if arg("--save"):
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--save")))
    out = os.path.abspath(arg("--out", "out/blender/talk/f_"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if "--fire" in args:
        for o in bpy.data.objects:
            if o.name.startswith("fire_domain"):
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
        a, b = (int(x) for x in arg("--range", f"1-{N}").split("-"))
        for f in range(a, b + 1):
            p = f"{out}{f:04d}.png"
            if os.path.exists(p):
                continue  # resume after an interruption
            sc.frame_set(f)
            sc.render.filepath = p
            bpy.ops.render.render(write_still=True)
            print("frame", f, flush=True)
