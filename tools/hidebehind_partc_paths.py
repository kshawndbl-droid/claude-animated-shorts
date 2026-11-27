# Shot plan for Hidebehind Part C (story 26.50 - 37.70 s): still cameras (one full-res plate each, the slow pushes are
# done in Remotion on the oversized plate) placed on the sight line that Part B's last tracking frame already keeps
# clear (pE camera -> logger), so nothing in the forest blocks them. The logger stands where Part B leaves him on the far
# trail, facing +y (camp ahead = screen left); the dark behind him (-y) is screen right.
# Writes stories/hidebehind/sets/partc_paths.json (read by tools/blender/hidebehind_forest.py and PartC.tsx).
import json
import os

import numpy as np

L = np.array([-2.8249, 15.5847])               # Part B's last logger position
DIR = np.array([-0.0676, 0.9977])              # he faces along the trail toward camp
U = np.array([-6.7042, 14.7502]) - L
U /= np.linalg.norm(U)                          # from him toward Part B's camera (the cleared side)
LAN = L + 0.12 * DIR


def cam(target, dist, z, tz, lens):
    c = target + dist * U
    return dict(cam=[round(float(c[0]), 4), round(float(c[1]), 4), z], look=[round(float(target[0]), 4), round(float(target[1]), 4), tz], lens=lens)


SHOTS = {
    # close on the lantern at his hip (lit and dark plates of the same camera; the flame dies in Remotion + plate fade)
    "c1L": dict(t0=26.5, lantern=[round(float(LAN[0]), 4), round(float(LAN[1]), 4), 0.42], **cam(LAN, 1.5, 0.62, 0.55, 35)),
    "c1D": dict(t0=26.5, lantern=None, **cam(LAN, 1.5, 0.62, 0.55, 35)),
    # extreme close-up of his face in profile: moonlight only
    "c2": dict(t0=28.55, lantern=None, **cam(L, 1.25, 1.2, 1.17, 50)),
    # medium: the slow turn, then the push in on his face (same camera, a punch-in crop after the cut on action)
    "c3": dict(t0=32.45, lantern=None, **cam(L, 2.4, 1.12, 1.0, 35)),
}
out = {k: dict(t0=v["t0"], n=1, frames=[dict(cam=v["cam"], look=v["look"], lens=v["lens"], lantern=v["lantern"],
                                               logger=dict(x=float(L[0]), y=float(L[1]), dist=0.0, walk=0.0, dir=[float(DIR[0]), float(DIR[1])]))])
       for k, v in SHOTS.items()}
os.makedirs("stories/hidebehind/sets", exist_ok=True)
json.dump(out, open("stories/hidebehind/sets/partc_paths.json", "w"), indent=1)
for k, v in out.items():
    print(k, v["frames"][0]["cam"], v["frames"][0]["look"])
