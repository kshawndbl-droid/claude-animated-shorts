# Close-up check of the talking head (face_rig.py) on the KayKit body: renders a strip of expressions/visemes.
# usage: .venv-bpy/bin/python tools/blender/face_test.py -- out/blender/face/f_
import math, os, sys
import bpy
from mathutils import Vector
sys.path.insert(0, os.path.dirname(__file__))
import face_rig as fr

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
import json
A_ = sys.argv[sys.argv.index("--") + 1:]
out = A_[0]
GLB = A_[1] if len(A_) > 1 else "Knight"
LOOK = json.loads(A_[2]) if len(A_) > 2 else None
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, f"public/assets/blender/kaykit/{GLB}.glb"))
rig = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
for o in list(bpy.data.objects):
    if o.type == "MESH" and (o.name.endswith("_Head") or o.name.endswith("_Cape")) or o.type == "MESH" and o.name.split(".")[0] in ("Knight_Head", "Knight_Helmet", "1H_Crossbow", "2H_Crossbow", "Knife", "Knife_Offhand", "Throwable", "2H_Sword", "Badge_Shield", "Rectangle_Shield", "Spike_Shield", "1H_Sword_Offhand", "Icosphere", "Round_Shield", "1H_Sword"):
        bpy.data.objects.remove(o, do_unlink=True)
F = fr.build_head(rig, look=LOOK)
poses = [dict(), dict(v="A"), dict(v="O", brow_up=1), dict(v="E", smile=0.6), dict(v="M", brow_angry=1, frown=0.6),
         dict(grin=1, squint=1, brow_up=0.5), dict(blink=1), dict(v="U", brow_sad=1, look=(1, 0.3))]
for i, p in enumerate(poses):
    f = 1 + i * 10
    for n in fr.VISEMES:
        fr._key_sk(F.mouth, n, f, 1.0 if p.get("v") == n else 0.0)
    fr.set_expr(F, f, smile=p.get("smile", 0), grin=p.get("grin", 0), frown=p.get("frown", 0), brow_up=p.get("brow_up", 0),
                brow_angry=p.get("brow_angry", 0), brow_sad=p.get("brow_sad", 0), squint=p.get("squint", 0))
    for l in F.lids:
        fr._key_sk(l, "BLINK", f, p.get("blink", 0))
    lx, lz = p.get("look", (0, 0))
    for lp in F.looks:
        lp.location = (lx * 0.019, -0.004, lz * 0.017)
        lp.keyframe_insert("location", frame=f)
for o in bpy.data.objects:
    ad = o.animation_data
for a in bpy.data.actions:
    pass
# constant interpolation so each test frame shows its pose exactly
for o in list(bpy.data.objects) + [k for k in bpy.data.shape_keys]:
    ad = getattr(o, "animation_data", None)
    if ad and ad.action:
        act = ad.action
        for layer in getattr(act, "layers", []):
            for st in layer.strips:
                for cb in st.channelbags:
                    for fc in cb.fcurves:
                        for kp in fc.keyframe_points:
                            kp.interpolation = "CONSTANT"
# light + camera
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.6, 0.7, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
for name, rot, e, col in (("key", (55, 0, -35), 3.5, (1, 0.93, 0.82)), ("rim", (60, 0, 150), 2.0, (0.8, 0.85, 1))):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); sc.collection.objects.link(l)
    l.data.energy, l.data.color = e, col
    l.rotation_euler = [math.radians(a) for a in rot]
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 85
cam.location = (0.55, -3.0, 1.75)
cam.rotation_euler = (Vector((0, 0, 1.62)) - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.render.engine = "BLENDER_EEVEE"
sc.eevee.taa_render_samples = 16
sc.view_settings.view_transform = "Standard"
sc.render.resolution_x, sc.render.resolution_y = 400, 500
os.makedirs(os.path.dirname(out), exist_ok=True)
for i in range(len(poses)):
    sc.frame_set(1 + i * 10)
    sc.render.filepath = f"{out}{i}.png"
    bpy.ops.render.render(write_still=True)
