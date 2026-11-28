# Render a library set plate: a lit Blender still + the cam.json the 2D cast is drawn through (+ optional layers).
# usage:
#   .venv-bpy/bin/python tools/kz-set.py -- --set village --period 1800s --light golden --cam wide [--heading 0]
#        [--stage x,y] [--seed 1] [--quality preview|final|push] [--out out/sets/<name>/] [--layers depth,fg,flicker]
#        [--lit 1] [--season summer|autumn|winter] [--kind ...] [--dist m --height m --lens mm --side m --aim m]
# Writes <out>/plate.png, cam.json, set.json (+ depth.png, fg.png, plate_hi.png / plate_lo.png for fire/lamp flicker).
# Same arguments = same image (seeded), so tools/kz.py can cache plates by a hash of the arguments + library code.
import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "library", "blender"))
from kaizen import core, lighting, sets  # noqa: E402

a = core.arg
t0 = time.time()
sc = core.reset()
name = a("--set", "village")
kw = {}
for k in ("period", "season", "kind"):
    if a("--" + k):
        kw[k] = a("--" + k)
if a("--seed"):
    kw["seed"] = int(a("--seed"))
light = a("--light", "golden")
night = light in ("night_moon", "dusk", "candle", "storm")
if name in ("village", "street"):
    kw["lit"] = bool(int(a("--lit", "1" if night else "0")))
marks = sets.RECIPES[name](sc, **kw)
lt = lighting.apply(sc, light, azimuth=float(a("--sun", "nan")) if a("--sun") else None,
                    exposure=float(a("--exposure")) if a("--exposure") else None)
q = core.render_settings(sc, a("--quality", "preview"), exposure=sc.view_settings.exposure)
stage = tuple(float(v) for v in a("--stage").split(",")) + (0.0,) if a("--stage") else marks["stage"]
stage = stage[:3]
f = lambda k: float(a(k)) if a(k) else None  # noqa: E731
loc, look, lens = core.preset_camera(stage, a("--cam", "wide"), float(a("--heading", str(marks.get("heading", 0.0)))),
                                     side=f("--side"), dist=f("--dist"), height=f("--height"), lens=f("--lens"), aim=f("--aim"))
cam = core.camera(sc, loc, look, lens, fstop=f("--fstop") or core.preset_fstop(a("--cam", "wide")), focus=(stage[0], stage[1], stage[2] + 1.0))
out = a("--out", f"out/sets/{name}/")
os.makedirs(out, exist_ok=True)
core.write_cam(cam, os.path.join(out, "cam.json"))
core.render_to(sc, os.path.join(out, "plate.png"))
layers = (a("--layers") or "").split(",")
flick = [l for l in marks.get("lights", []) if l.energy > 0]
if "flicker" in layers and flick:
    core.render_variant(sc, os.path.join(out, "plate_hi.png"), flick, 1.35)
    core.render_variant(sc, os.path.join(out, "plate_lo.png"), flick, 0.7)
if "depth" in layers:
    core.render_depth(sc, os.path.join(out, "depth.png"))
if "fg" in layers:
    core.render_foreground(sc, os.path.join(out, "fg.png"), cam, float(a("--near", "4")))
info = dict(set=name, args=core.ARGS, light=light, quality=q, stage=list(stage), cam=dict(loc=list(loc), look=list(look), lens=lens),
            marks={k: (list(v) if isinstance(v, tuple) else v) for k, v in marks.items() if k in ("stage", "door", "fire", "jetty", "path", "heading")},
            seconds=round(time.time() - t0, 1))
json.dump(info, open(os.path.join(out, "set.json"), "w"), indent=1)
print("done", out, info["seconds"], "s")
