# Part D shot plan for the Hidebehind (story 37.70 - 50.67 s): per-frame camera keys for the Blender plates
#  dDawn  39.30-44.60  cold first light on the far trail: his lantern on its side in the snow where his tracks end,
#                      a slow low push; two men from the camp walk in and stop (2D, Remotion)
#  dEnd   44.60-50.67  night again: a slow push toward the hide tree; at the very end the faintest shape at its edge
# (37.70-38.60 is the approved attack, 38.60-39.30 pure black: no plates.) Writes stories/hidebehind/sets/partD_paths.json
import json

FPS = 30
LANT = (-2.82, 15.58)      # where his walk in the preview ended (inside the preview's cleared sight lines)


def sm(v):
    c = min(1.0, max(0.0, v)); return c * c * (3 - 2 * c)


def lerp(a, b, k): return [round(a[i] + (b[i] - a[i]) * k, 4) for i in range(len(a))]


out = {}
for name, t0, t1 in (("dDawn", 39.30, 44.60), ("dEnd", 44.60, 50.6667)):
    n = int(round((t1 - t0) * FPS)); fr = []
    for f in range(1, n + 1):
        k = sm((f - 1) / (n - 1))
        if name == "dDawn":
            cam, look, lens = lerp([-6.4, 15.0, 1.05], [-5.7, 15.45, 0.8], k), lerp([-2.9, 16.2, 0.35], [-2.85, 16.0, 0.3], k), 30 + 6 * k
            focus = [LANT[0], LANT[1], 0.15]
        else:
            cam, look, lens = lerp([0.3, -1.1, 1.5], [0.42, 0.25, 1.45], k), lerp([2.0, 5.6, 1.35], [2.05, 5.6, 1.3], k), 28 + 5 * k
            focus = [2.1, 5.6, 1.3]
        fr.append(dict(cam=cam, look=look, lens=round(lens, 3), focus=focus, logger=None, lantern=None))
    out[name] = dict(t0=t0, t1=t1, n=n, fstop=2.8, frames=fr)
json.dump(out, open("stories/hidebehind/sets/partD_paths.json", "w"))
print({k: v["n"] for k, v in out.items()})
