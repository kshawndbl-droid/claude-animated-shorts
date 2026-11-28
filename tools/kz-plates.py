"""Render (or fetch from cache) every Blender plate a scene.json needs.

    python3 tools/kz-plates.py public/<slug>/scene.json [--quality preview|final|push] [--only s1,s4] [--force]

Each shot's plate is keyed by a hash of its kz-set arguments + quality + the library's Blender code, and stored in
/mnt/project-files/cache/plates/<hash>/ (survives containers, never lost like the Hidebehind B/D plates). Unchanged shots
are copied from the cache in a second; only shots whose set, light or camera changed are rendered again. Shots that
share a plate (same "plate") are rendered once.
"""
import glob
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE = os.environ.get("KZ_PLATE_CACHE", "/mnt/project-files/cache/plates")
PY = os.path.join(ROOT, ".venv-bpy", "bin", "python")


def code_hash():
    h = hashlib.sha1()
    for f in sorted(glob.glob(os.path.join(ROOT, "library", "blender", "kaizen", "*.py")) + [os.path.join(ROOT, "tools", "kz-set.py")]):
        h.update(open(f, "rb").read())
    return h.hexdigest()[:10]


def set_args(shot, quality):
    a = []
    for k, v in shot["set"].items():
        if isinstance(v, (list, tuple)):
            v = ",".join(str(x) for x in v)
        a += [f"--{k}", str(v)]
    layers = list(shot.get("layers", []))
    if "depth" not in layers:
        layers.append("depth")
    a += ["--quality", quality, "--layers", ",".join(sorted(layers))]
    return a


def main():
    argv = sys.argv[1:]
    scene_p = argv[0]
    quality = argv[argv.index("--quality") + 1] if "--quality" in argv else "preview"
    only = set(argv[argv.index("--only") + 1].split(",")) if "--only" in argv else None
    force = "--force" in argv
    scene = json.load(open(scene_p))
    pub = os.path.join(ROOT, "public")
    ch = code_hash()
    done, report = {}, []
    for shot in scene["shots"]:
        if only and shot["id"] not in only:
            continue
        dest = os.path.join(pub, shot.get("plate") or f"{scene['slug']}/plates/{shot['id']}")
        args = set_args(shot, quality)
        key = hashlib.sha1(json.dumps([args, ch]).encode()).hexdigest()[:16]
        cdir = os.path.join(CACHE, key)
        if key in done and done[key] == dest:
            continue
        t0 = time.time()
        if force or not os.path.isfile(os.path.join(cdir, "plate.png")):
            os.makedirs(cdir, exist_ok=True)
            r = subprocess.run([PY, os.path.join(ROOT, "tools", "kz-set.py"), "--", *args, "--out", cdir + "/"], capture_output=True, text=True)
            if r.returncode or not os.path.isfile(os.path.join(cdir, "plate.png")):
                print(r.stdout[-2000:], r.stderr[-2000:])
                sys.exit(f"plate failed for shot {shot['id']}")
            how = "rendered"
        else:
            how = "cached"
        os.makedirs(dest, exist_ok=True)
        for f in os.listdir(cdir):
            shutil.copy2(os.path.join(cdir, f), os.path.join(dest, f))
        done[key] = dest
        report.append((shot["id"], how, round(time.time() - t0, 1)))
        print(f"{shot['id']:>6}  {how:8}  {report[-1][2]:6.1f} s  {os.path.relpath(dest, pub)}", flush=True)
    print("plates:", len(report), "rendered:", sum(1 for r in report if r[1] == "rendered"), "total s:", round(sum(r[2] for r in report), 1))


if __name__ == "__main__":
    main()
