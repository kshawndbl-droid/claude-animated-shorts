#!/usr/bin/env python3
"""kz: the Kaizen Clips pipeline in one command. A Short lives in two places:
  /mnt/project-files/shorts/<slug>/   what the user sees: script.txt, notes, voice, previews, final videos
  public/<slug>/                      what the renderer reads: scene.json, plates/, voice.wav, words.json, mix.wav

  kz new <slug> --genre horror|mystery|history|epic|comedy|true    folders, starter script and scene.json
  kz voice <slug> [--voice hollow] [--speed 0.95]                   narration + word timings from script.txt
  kz plan <slug>                                                    shot list against the narration (shot-plan.md)
  kz plates <slug> [--final] [--only s1,s2] [--force]               Blender plates (cached; only changed shots render)
  kz sound <slug>                                                   ambience, music, hits and footsteps mixed under the voice
  kz preview <slug> [--shots s1,s4]                                 low-res preview with sound and subtitles
  kz final <slug>                                                   full-quality video, rendered per shot (cached) and joined
  kz qc <video.mp4> [--scene <slug>]                                checks: 1080x1920, constant 30 fps, frames, loudness
  kz all <slug>                                                     voice -> sound -> plates -> preview (stops for approval)

Approval gates stay with the user: kz never renders a final before a preview exists, and never overwrites a delivered
video (every output gets the next version number).
"""
import glob
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PF = os.environ.get("KZ_PROJECT_FILES", "/mnt/project-files")
SEG_CACHE = os.path.join(PF, "cache", "segments")
ENTRY = os.path.join(ROOT, "src", "library", "index.ts")
FPS = 30


def sh(cmd, **kw):
    print("$", " ".join(str(c) for c in cmd)[:220], flush=True)
    return subprocess.run(cmd, check=True, cwd=ROOT, **kw)


def paths(slug):
    return dict(pf=os.path.join(PF, "shorts", slug), pub=os.path.join(ROOT, "public", slug),
                scene=os.path.join(ROOT, "public", slug, "scene.json"))


def load_scene(slug):
    return json.load(open(paths(slug)["scene"]))


def save_scene(slug, sc):
    json.dump(sc, open(paths(slug)["scene"], "w"), indent=1)


def next_version(folder, stem):
    os.makedirs(folder, exist_ok=True)
    n = 1
    while os.path.exists(os.path.join(folder, f"{stem}-v{n}.mp4")):
        n += 1
    return os.path.join(folder, f"{stem}-v{n}.mp4")


def opt(a, k, d=None):
    return a[a.index(k) + 1] if k in a else d


# ------------------------------------------------------------------ new
STARTERS = {
    "horror": dict(set={"set": "forest", "light": "night_moon"}, grade="horror", fx=[["fog", {"op": 0.25}]]),
    "mystery": dict(set={"set": "street", "period": "victorian", "light": "dusk"}, grade="mystery", fx=[["fog", {"op": 0.15}]]),
    "history": dict(set={"set": "village", "period": "1800s", "light": "golden"}, grade="history", fx=[["birds"]]),
    "epic": dict(set={"set": "field", "kind": "battlefield", "light": "overcast"}, grade="epic", fx=[]),
    "comedy": dict(set={"set": "village", "period": "1920s", "light": "noon"}, grade="comedy", fx=[["birds"]]),
    "true": dict(set={"set": "street", "period": "modern", "light": "morning"}, grade="true", fx=[]),
}


def cmd_new(slug, a):
    g = opt(a, "--genre", "true")
    P = paths(slug)
    for d in (P["pf"], os.path.join(P["pf"], "preview"), os.path.join(P["pf"], "voice"), P["pub"]):
        os.makedirs(d, exist_ok=True)
    sp = os.path.join(P["pf"], "script.txt")
    if not os.path.exists(sp):
        open(sp, "w").write("# One narration line per row. Optional: {pause=0.4 speed=0.95 gain=1.5} at the end of a line.\n"
                            "# The hook comes first: the most surprising true thing in one sentence.\n")
    if not os.path.exists(P["scene"]):
        st = STARTERS.get(g, STARTERS["true"])
        scene = {"slug": slug, "genre": g, "grade": st["grade"], "words": f"{slug}/words.json", "audio": f"{slug}/mix.wav",
                 "cast": {"hero": {"look": "casual"}},
                 "shots": [
                     {"id": "s1", "t0": 0, "t1": 3.0, "template": "intro", "set": {**st["set"], "cam": "low"}, "actors": [{"who": "hero", "at": [0, 0]}]},
                     {"id": "s2", "t0": 3.0, "t1": 6.5, "template": "establishing", "set": {**st["set"], "cam": "establishing"}, "fx": st["fx"]},
                     {"id": "s3", "t0": 6.5, "t1": 10.0, "template": "reaction", "set": {**st["set"], "cam": "close"}, "actors": [{"who": "hero", "at": [0, 0], "face": "right"}]}]}
        json.dump(scene, open(P["scene"], "w"), indent=1)
    print(f"new Short '{slug}' ({g}):\n  script  {sp}\n  scene   {P['scene']}\nNext: write the script, then `kz voice {slug}`.")


# ------------------------------------------------------------------ voice
def cmd_voice(slug, a):
    P = paths(slug)
    sh([sys.executable, "library/audio/kz_voice.py", os.path.join(P["pf"], "script.txt"), P["pub"],
        "--voice", opt(a, "--voice", "hollow"), "--speed", opt(a, "--speed", "0.95")])
    for f in ("voice.wav", "words.json", "lines.json"):
        shutil.copy2(os.path.join(P["pub"], f), os.path.join(P["pf"], "voice", f))
    sc = load_scene(slug)
    sc["words"] = f"{slug}/words.json"
    save_scene(slug, sc)
    shutil.copy2(os.path.join(P["pub"], "voice.wav"), os.path.join(P["pf"], "voice", f"{slug}-narration.wav"))
    print(f"Narration ready for review: {os.path.join(P['pf'], 'voice', slug + '-narration.wav')}")


# ------------------------------------------------------------------ plan
def cmd_plan(slug, a):
    P = paths(slug)
    sc = load_scene(slug)
    wp = os.path.join(P["pub"], "words.json")
    words = json.load(open(wp)) if os.path.exists(wp) else []
    end_voice = max([w["e"] for w in words] or [0])
    rows, warn, prev = [], [], 0.0
    for s in sc["shots"]:
        said = " ".join(w["w"] for w in words if s["t0"] <= (w["s"] + w["e"]) / 2 < s["t1"])
        st = s["set"]
        rows.append(f"| {s['id']} | {s['t0']:.1f}-{s['t1']:.1f} | {s['template']} | {st.get('set')} / {st.get('light')} / {st.get('cam')} | "
                    f"{', '.join(x['who'] for x in s.get('actors', [])) or '-'} | {said or '(no narration)'} |")
        if abs(s["t0"] - prev) > 1e-3:
            warn.append(f"gap or overlap before {s['id']} ({prev:.2f} -> {s['t0']:.2f})")
        if s["t1"] - s["t0"] > 6:
            warn.append(f"{s['id']} is {s['t1'] - s['t0']:.1f} s long: split it (no shot should outstay the line)")
        prev = s["t1"]
    if words and prev < end_voice + 0.8:
        warn.append(f"the shots end at {prev:.1f} s but the narration runs to {end_voice:.1f} s: add a shot or extend the last")
    md = [f"# {slug}: shot plan", "", f"{len(sc['shots'])} shots, {prev:.1f} s, genre {sc.get('genre')}", "",
          "| shot | time | template | set / light / camera | cast | narration |", "|---|---|---|---|---|---|", *rows]
    if warn:
        md += ["", "## Check", *[f"- {w}" for w in warn]]
    out = os.path.join(P["pf"], "shot-plan.md")
    os.makedirs(P["pf"], exist_ok=True)
    open(out, "w").write("\n".join(md) + "\n")
    print("\n".join(md))
    print("\nwrote", out)


# ------------------------------------------------------------------ plates / sound
def cmd_plates(slug, a):
    args = [sys.executable, "tools/kz-plates.py", paths(slug)["scene"], "--quality", "final" if "--final" in a else "preview"]
    if opt(a, "--only"):
        args += ["--only", opt(a, "--only")]
    if "--force" in a:
        args.append("--force")
    sh(args)


def cmd_sound(slug, a):
    P = paths(slug)
    v, w = os.path.join(P["pub"], "voice.wav"), os.path.join(P["pub"], "words.json")
    args = [sys.executable, "library/audio/kz_sound.py", P["scene"]] + ([v, w] if os.path.exists(v) else [])
    sh(args)
    sc = load_scene(slug)
    sc["audio"] = f"{slug}/mix.wav"
    save_scene(slug, sc)


# ------------------------------------------------------------------ rendering
def remotion(jobs):
    jf = os.path.join(ROOT, "out", f"kz-jobs-{os.getpid()}.json")
    os.makedirs(os.path.dirname(jf), exist_ok=True)
    json.dump(jobs, open(jf, "w"), indent=1)
    try:
        sh(["node", "tools/kz-remotion.mjs", ENTRY, jf])
    finally:
        os.remove(jf)


def scene_span(sc, only=None):
    shots = [s for s in sc["shots"] if not only or s["id"] in only]
    return min(s["t0"] for s in shots), max(s["t1"] for s in shots)


def cmd_preview(slug, a):
    P = paths(slug)
    sc = load_scene(slug)
    only = set(opt(a, "--shots").split(",")) if opt(a, "--shots") else None
    if "--no-plates" not in a:
        cmd_plates(slug, ["--only", ",".join(only)] if only else [])
    t0, t1 = scene_span(sc, only)
    out = next_version(os.path.join(P["pf"], "preview"), f"{slug}-preview")
    t = time.time()
    remotion([{"comp": "KzScene", "props": {"src": f"{slug}/scene.json", "from": t0, "duration": t1 - t0, "captions": True,
                                            "withAudio": os.path.exists(os.path.join(P["pub"], "mix.wav"))},
               "out": out, "scale": 0.5, "crf": 20}])
    print(f"preview {out} ({time.time() - t:.0f} s)")
    return out


def code_hash():
    h = hashlib.sha1()
    for f in sorted(glob.glob(os.path.join(ROOT, "library", "**", "*.ts*"), recursive=True) + [os.path.join(ROOT, "src", "subtitles", "Subtitles.tsx")]):
        h.update(open(f, "rb").read())
    return h.hexdigest()


def file_hash(p):
    return hashlib.sha1(open(p, "rb").read()).hexdigest() if os.path.exists(p) else "-"


def cmd_final(slug, a):
    P = paths(slug)
    sc = load_scene(slug)
    if not glob.glob(os.path.join(P["pf"], "preview", "*.mp4")) and "--no-preview-ok" not in a:
        sys.exit("No preview yet: run `kz preview` and get it approved before the final render.")
    if "--no-plates" not in a:
        cmd_plates(slug, ["--final"])
    ch, wh = code_hash(), file_hash(os.path.join(P["pub"], "words.json"))
    os.makedirs(os.path.join(SEG_CACHE, slug), exist_ok=True)
    segs, jobs = [], []
    shots = sc["shots"]
    for i, s in enumerate(shots):
        plate = os.path.join(ROOT, "public", s.get("plate") or f"{slug}/plates/{s['id']}")
        key = hashlib.sha1(json.dumps([s, shots[i + 1].get("transition") if i + 1 < len(shots) else None, i == 0, i == len(shots) - 1,
                                       sc.get("cast"), sc.get("grade"), sc.get("genre"), sc.get("subtitles"), wh, ch,
                                       [file_hash(f) for f in sorted(glob.glob(plate + "/*")) if not f.endswith("set.json")]], sort_keys=True).encode()).hexdigest()[:16]
        seg = os.path.join(SEG_CACHE, slug, f"{s['id']}-{key}.mp4")
        segs.append(seg)
        if not os.path.exists(seg):
            jobs.append({"comp": "KzScene", "props": {"src": f"{slug}/scene.json", "from": s["t0"], "duration": s["t1"] - s["t0"],
                                                      "captions": True, "withAudio": False}, "out": seg, "scale": 1, "crf": 14, "muted": True})
    print(f"segments: {len(segs)} shots, {len(jobs)} to render, {len(segs) - len(jobs)} cached")
    t = time.time()
    if jobs:
        remotion(jobs)
    lst = os.path.join(ROOT, "out", f"kz-concat-{slug}.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in segs))
    out = next_version(P["pf"], slug)
    mix = os.path.join(P["pub"], "mix.wav")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst]
    if os.path.exists(mix):
        cmd += ["-i", mix, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", str(FPS), "-fps_mode", "cfr",
            "-movflags", "+faststart", out]
    sh(cmd)
    os.remove(lst)
    print(f"final {out} ({time.time() - t:.0f} s)")
    cmd_qc(out, ["--scene", slug])
    return out


# ------------------------------------------------------------------ qc
def cmd_qc(video, a):
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", video], capture_output=True, text=True).stdout)
    v = next(s for s in pr["streams"] if s["codec_type"] == "video")
    au = [s for s in pr["streams"] if s["codec_type"] == "audio"]
    dur = float(pr["format"]["duration"])
    ok = []
    ok.append(("size 1080x1920", (v["width"], v["height"]) == (1080, 1920), f"{v['width']}x{v['height']}"))
    ok.append(("constant 30 fps", v["r_frame_rate"] == "30/1" and v.get("avg_frame_rate") == "30/1", f"{v['r_frame_rate']} avg {v.get('avg_frame_rate')}"))
    ok.append(("H.264 yuv420p", v["codec_name"] == "h264" and v["pix_fmt"] in ("yuv420p", "yuvj420p"), f"{v['codec_name']} {v['pix_fmt']}"))
    nb = int(v.get("nb_frames", 0))
    ok.append(("frame count matches duration", abs(nb - round(dur * FPS)) <= 2, f"{nb} frames, {dur:.2f} s"))
    md = subprocess.run(["ffmpeg", "-i", video, "-vf", "mpdecimate=hi=64*2:lo=64*1:frac=0.1", "-f", "null", "-"], capture_output=True, text=True).stderr
    kept = int((re.findall(r"frame=\s*(\d+)", md) or ["0"])[-1])
    ok.append(("no frozen stretches", nb - kept <= max(30, nb * 0.06), f"{nb - kept} repeated frames (fades and holds count)"))
    if a and "--scene" in a:
        t0, t1 = scene_span(load_scene(opt(a, "--scene")))
        ok.append(("length matches scene", abs(dur - (t1 - t0)) < 0.2, f"{dur:.2f} s vs scene {t1 - t0:.2f} s"))
    if au:
        eb = subprocess.run(["ffmpeg", "-hide_banner", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", eb)[-1])
        TP = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", eb)[-1])
        ok.append(("loudness about -14 LUFS", -15.5 <= I <= -12.5, f"{I} LUFS"))
        ok.append(("true peak <= -0.9 dBTP", TP <= -0.9, f"{TP} dBTP"))
    else:
        ok.append(("has audio", False, "no audio stream"))
    for name, good, info in ok:
        print(f"  {'PASS' if good else 'FAIL'}  {name:30} {info}")
    return all(g for _, g, _ in ok)


def cmd_all(slug, a):
    cmd_voice(slug, a)
    cmd_sound(slug, a)
    cmd_plan(slug, a)
    out = cmd_preview(slug, a)
    print(f"\nPreview ready for approval: {out}\nAfter approval: kz final {slug}")


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help", "help"):
        print(__doc__)
        return
    c, rest = a[0], a[1:]
    fn = {"new": cmd_new, "voice": cmd_voice, "plan": cmd_plan, "plates": cmd_plates, "sound": cmd_sound, "preview": cmd_preview,
          "final": cmd_final, "qc": cmd_qc, "all": cmd_all}.get(c)
    if not fn:
        sys.exit(__doc__)
    ok = fn(rest[0], rest[1:])
    if c == "qc" and ok is False:
        sys.exit(1)


if __name__ == "__main__":
    main()
