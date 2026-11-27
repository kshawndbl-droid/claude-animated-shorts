#!/usr/bin/env python3
# Download the project's free CC0 asset library into public/assets/ (git-ignored: it is re-fetched, not committed).
#   Poly Haven models  -> public/assets/polyhaven/<id>/<id>_1k.gltf (+ .bin + textures/)   https://polyhaven.com (CC0)
#   ambientCG textures -> public/assets/ambientcg/<id>/<id>_1K-JPG_{Color,NormalGL,Roughness,...}.jpg  https://ambientcg.com (CC0)
# Writes public/assets/manifest.json (id, source, license, files, bytes). Safe to re-run: existing files are skipped.
# Needs network access to api.polyhaven.com, dl.polyhaven.org and ambientcg.com.
# Usage: python3 tools/fetch-assets.py [--res 1k]
import io, json, os, sys, urllib.request, zipfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets")
RES = sys.argv[sys.argv.index("--res") + 1] if "--res" in sys.argv else "1k"

# Low-poly props that fit a pre-1900 town, harbour, farm or battlefield.
POLYHAVEN_MODELS = [
    "wine_barrel_01", "wooden_crate_01", "wooden_bucket_01", "wooden_lantern_01", "wicker_basket_01",
    "wooden_stool_01", "painted_wooden_bench", "wooden_table_02", "wooden_ladder", "wooden_axe",
    "tree_stump_01", "stone_fire_pit", "spinning_wheel_01", "kite_shield", "wooden_barrels_01",
    # cannon_01 left out: its .bin on dl.polyhaven.org is smaller than its glTF declares (broken upstream, 2026-11)
]
# Tileable PBR surfaces (we use the Color map, optionally Normal/Roughness) for ground, walls, roofs, decks.
AMBIENTCG_TEXTURES = [
    "Planks040", "PavingStones130", "Bricks097", "RoofingTiles014A", "Ground054",
    "Grass004", "Rock030", "ThatchedRoof001A", "Fabric079",
]
UA = {"User-Agent": "claude-animated-shorts asset fetcher"}


def get(url, size=None, tries=4):
    """download; with `size`, retry until the byte count matches (a cut-off transfer can end without an error)"""
    for t in range(tries):
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
            data = r.read()
        if size is None or len(data) == size:
            return data
    raise IOError(f"{url}: got {len(data)} bytes, expected {size}")


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(data)


def polyhaven(aid):
    files = json.loads(get(f"https://api.polyhaven.com/files/{aid}"))
    g = files["gltf"][RES]["gltf"]
    out_dir = os.path.join(ROOT, "polyhaven", aid)
    items = [(os.path.basename(g["url"]), g["url"], g["size"])] + [(rel, v["url"], v["size"]) for rel, v in g.get("include", {}).items()]
    for rel, url, size in items:
        p = os.path.join(out_dir, rel)
        if not os.path.exists(p) or os.path.getsize(p) != size:
            save(p, get(url, size))
    return out_dir, [rel for rel, _, _ in items]


def ambientcg(aid):
    out_dir = os.path.join(ROOT, "ambientcg", aid)
    tag = f"{RES.upper()}-JPG"
    if not os.path.isdir(out_dir) or not os.listdir(out_dir):
        z = zipfile.ZipFile(io.BytesIO(get(f"https://ambientcg.com/get?file={aid}_{tag}.zip")))
        for n in z.namelist():
            if n.lower().endswith((".jpg", ".png")) and "NormalDX" not in n:
                save(os.path.join(out_dir, os.path.basename(n)), z.read(n))
    return out_dir, sorted(os.listdir(out_dir))


def main():
    manifest = []
    for src, ids, fn, home in (("polyhaven", POLYHAVEN_MODELS, polyhaven, "https://polyhaven.com/a/"),
                               ("ambientcg", AMBIENTCG_TEXTURES, ambientcg, "https://ambientcg.com/view?id=")):
        for aid in ids:
            try:
                d, files = fn(aid)
                size = sum(os.path.getsize(os.path.join(d, f)) for f in files)
                manifest.append({"id": aid, "source": src, "url": home + aid, "license": "CC0", "res": RES,
                                 "dir": os.path.relpath(d, os.path.join(ROOT, "..")).replace(os.sep, "/"), "files": files, "bytes": size})
                print(f"ok   {src:9s} {aid:22s} {size / 1e6:6.2f} MB")
            except Exception as e:  # keep going; report at the end
                print(f"FAIL {src:9s} {aid:22s} {e}")
    save(os.path.join(ROOT, "manifest.json"), json.dumps(manifest, indent=1).encode())
    print(len(manifest), "assets,", round(sum(m["bytes"] for m in manifest) / 1e6, 1), "MB ->", os.path.normpath(ROOT))


if __name__ == "__main__":
    main()
