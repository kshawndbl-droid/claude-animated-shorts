# Find the light sources painted into a plate (bright, compact blobs) so they can glow and flicker in the film.
# usage: python plate_lights.py lights.json name1=plate1.png name2=plate2.png ...  (merges into lights.json)
import json, os, sys
import cv2
import numpy as np

out = sys.argv[1]
data = json.load(open(out)) if os.path.exists(out) else {}
for arg in sys.argv[2:]:
    name, path = arg.split("=")
    im = cv2.imread(path)
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    v = hsv[..., 2].astype(np.float32)
    thr = max(225, np.percentile(v, 99.0))
    m = (v >= thr).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    H, W = v.shape
    found = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if area < 30 or area > 0.012 * W * H or w > 0.35 * W:
            continue
        cx, cy = cen[i]
        b, g, r = im[lab == i].mean(0)
        r2, g2, b2 = [int(min(255, c * 1.0 + 30)) for c in (r, g, b)]
        found.append((area, [round(cx * 1080 / W, 1), round(cy * 1920 / H, 1), round(max(18, (w + h) / 2 * 1080 / W * 0.9), 1), f"#{r2:02x}{g2:02x}{b2:02x}"]))
    found.sort(key=lambda f: -f[0])
    data[name] = [f[1] for f in found[:14]]
    print(name, len(data[name]))
json.dump(data, open(out, "w"), indent=1)
