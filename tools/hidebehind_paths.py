# Shared shot plan for the Hidebehind style preview (story 15.0 - 26.5 s): per-frame camera keys and the logger's
# world position, so Blender (tools/blender/hidebehind_forest.py: camera + the real lantern light) and Remotion
# (templates/hidebehind/Preview.tsx: the 2D logger) use exactly the same numbers. Writes
# stories/hidebehind/sets/preview_paths.json.  usage: python3 tools/hidebehind_paths.py
import json
import math
import os

import numpy as np

FPS = 30
TRAIL = [(9.0, 2.6), (5.0, 2.95), (2.0, 3.3), (0.0, 3.5), (-1.3, 3.9), (-2.4, 5.0), (-3.0, 7.0), (-3.2, 10.0),
         (-2.8, 15.0), (-3.4, 22.0), (-2.6, 32.0), (-3.0, 45.0), (-2.2, 60.0), (-2.0, 80.0)]
C0, D, RT = np.array([0.0, 3.5]), np.array([0.9846, -0.1748]), np.array([-0.1748, -0.9846])
HIDE = (2.1, 5.6)


def catmull(pts, k=24):
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = (np.array(q, float) for q in p[i - 1:i + 3])
        for t in np.linspace(0, 1, k, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(np.array(pts[-1], float))
    return np.array(out)


TP = catmull(TRAIL)
ARC = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(TP, axis=0), axis=1))])


def on_trail(s):
    """point and unit tangent at arc length s along the trail centre line"""
    x, y = np.interp(s, ARC, TP[:, 0]), np.interp(s, ARC, TP[:, 1])
    x2, y2 = np.interp(s + 0.05, ARC, TP[:, 0]), np.interp(s + 0.05, ARC, TP[:, 1])
    t = np.array([x2 - x, y2 - y]); return np.array([x, y]), t / (np.linalg.norm(t) + 1e-9)


def sm(v):
    c = min(1.0, max(0.0, v)); return c * c * (3 - 2 * c)


def integ(v, t0, T, dt=1 / 480):
    s, t = 0.0, t0
    while t < T:
        s += v(t) * dt; t += dt
    return s


# logger speed profiles (m/s) in story time
V1 = lambda t: 0.9 * (1 - sm((t - 18.1) / 0.35))                 # walking, freezes on the branch snap
V2 = lambda t: 1.45 * sm((t - 22.35) / 0.5)                       # "He walked faster"
S_E0 = float(np.interp(10.0, TP[:, 1][60:], ARC[60:]))            # arc length where the far trail passes y = 10


def logger(T):
    if T < 20.45:
        w = integ(V1, 15.0, T); dd = 2.3 - w
        p = C0 + dd * D + 0.15 * RT
        return dict(x=float(p[0]), y=float(p[1]), dist=w, walk=V1(T) / 0.9, dir=[float(-D[0]), float(-D[1])])
    if T < 22.3:
        return None
    w = integ(V2, 22.3, T); p, tg = on_trail(S_E0 + w)
    return dict(x=float(p[0]), y=float(p[1]), dist=w, walk=V2(T) / 1.45, dir=[float(tg[0]), float(tg[1])])


def lerp(a, b, k): return [a[i] + (b[i] - a[i]) * k for i in range(len(a))]


SHOTS = {"pA": (15.0, 17.9), "pB": (17.9, 20.45), "pC": (20.45, 22.3), "pE": (22.3, 26.5)}
out = {}
for name, (t0, t1) in SHOTS.items():
    n = int(round((t1 - t0) * FPS)); frames = []
    for f in range(1, n + 1):
        T = t0 + (f - 1) / FPS; k = (f - 1) / max(1, n - 1); L = logger(T)
        if name == "pA":    # wide, high and far: a slow creep forward, tall trunks and black space above him
            cam, look, lens = lerp([1.0, -5.6, 2.5], [0.85, -4.9, 2.35], sm(k)), [0.2, 4.2, 0.9], 26
        elif name == "pB":  # low, close, slow push in: he freezes; the dark he can't see fills the right of frame
            cam, look, lens = lerp([-1.75, 1.45, 0.55], [-1.55, 1.75, 0.55], sm(k)), [-0.1, 4.3, 1.05], 30
        elif name == "pC":  # his eyes: a fast turn (6 frames) onto the hide tree, then a slow creep in on "Nothing."
            a = sm((f - 1) / 6.0) ** 0.7
            cam = [-0.75, 3.32, 1.55]
            look = lerp([-4.6, 3.5, 1.35], [HIDE[0], HIDE[1], 1.3], a)
            lens = 30 + 8 * sm((T - 20.9) / 1.4)
        else:               # tracking beside him as he hurries; framed so the dark behind him is the empty side
            Lp = logger(max(22.3, T - 0.3))
            cam = [Lp["x"] - 3.9, Lp["y"] - 0.4, 1.2]
            look = [L["x"], L["y"] - 0.9, 0.95]
            lens = 28
        frames.append(dict(cam=[round(v, 4) for v in cam], look=[round(v, 4) for v in look], lens=round(lens, 3), logger=L,
                           lantern=None if L is None else [round(L["x"] + 0.12 * L["dir"][0], 4), round(L["y"] + 0.12 * L["dir"][1], 4), 0.42]))
    out[name] = dict(t0=t0, t1=t1, n=n, frames=frames)
os.makedirs("stories/hidebehind/sets", exist_ok=True)
json.dump(out, open("stories/hidebehind/sets/preview_paths.json", "w"))
for k, v in out.items():
    a, b = v["frames"][0]["logger"], v["frames"][-1]["logger"]
    print(k, v["n"], a and (round(a["x"], 2), round(a["y"], 2)), b and (round(b["x"], 2), round(b["y"], 2), round(b["dist"], 2)))
