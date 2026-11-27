# Rebuild a narration from its lines: drop some lines, tighten the pauses, speed up gently, and rewrite the line and
# word timings to match (no re-alignment needed).
# usage: python splice_lines.py <voicedir> <outdir> <tempo> <drop,list> [maxgap] [keepgap=i:sec,...]
import json, sys, os, subprocess
import numpy as np
import soundfile as sf
vd, od, tempo, drop = sys.argv[1], sys.argv[2], float(sys.argv[3]), {int(x) for x in sys.argv[4].split(",") if x}
maxgap = float(sys.argv[5]) if len(sys.argv) > 5 else 0.35
keep = {int(k): float(v) for k, v in (p.split(":") for p in sys.argv[6].split(","))} if len(sys.argv) > 6 and sys.argv[6] else {}
L = json.load(open(f"{vd}/lines.json")); Wd = json.load(open(f"{vd}/words.json"))
a, sr = sf.read(f"{vd}/voice.wav"); a = a if a.ndim == 1 else a[:, 0]
kept = [i for i in range(len(L)) if i not in drop]
out, t, NL, NW = [], 0.0, [], []
lead = L[kept[0]]["start"]
out.append(np.zeros(int(lead * sr))); t = lead
for j, i in enumerate(kept):
    s0, s1 = L[i]["start"] - 0.10, L[i]["end"] + 0.14
    seg = a[int(max(0, s0) * sr): int(s1 * sr)].copy(); f = int(0.012 * sr); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    off = t - s0
    NL.append({**L[i], "start": L[i]["start"] + off, "end": L[i]["end"] + off})
    for w in Wd:
        if w["line"] == i: NW.append({**w, "s": w["s"] + off, "e": w["e"] + off, "line": j})
    out.append(seg); t += len(seg) / sr
    if j < len(kept) - 1:
        nxt = kept[j + 1]; g0 = L[nxt]["start"] - L[i]["end"] - 0.24
        g = keep.get(i, min(maxgap, max(0.08, g0)))
        out.append(np.zeros(int(g * sr))); t += g
out.append(np.zeros(int(0.6 * sr)))
y = np.concatenate(out); os.makedirs(od, exist_ok=True)
sf.write(f"{od}/slow.wav", y, sr)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{od}/slow.wav", "-filter:a", f"atempo={tempo}", f"{od}/voice.wav"], check=True)
for l in NL: l["start"] /= tempo; l["end"] /= tempo
for w in NW: w["s"] /= tempo; w["e"] /= tempo
json.dump(NL, open(f"{od}/lines.json", "w"), indent=1); json.dump(NW, open(f"{od}/words.json", "w"), indent=1)
print("lines", len(NL), "voice", round(len(y) / sr / tempo, 2), "s")
