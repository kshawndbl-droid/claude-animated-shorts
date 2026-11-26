# Turn a generated background into an illustrated plate that matches the characters: Lanczos upscale to 1080x1920
# with an unsharp mask, then an ink-and-flat-colour pass (bilateral smoothing, k-means colour flattening blended
# with the original, and adaptive-threshold ink lines in the characters' ink colour).
# usage: /home/user/venv-img/bin/python tools/ink_plate.py in.png out.png [ink_strength=0.55]
import sys
import cv2
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
ink_k = float(sys.argv[3]) if len(sys.argv) > 3 else 0.55
im = Image.open(src).convert("RGB")
if im.size != (1080, 1920):
    im = im.resize((1080, 1920), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=80, threshold=2))
a = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
sm = a.copy()
for _ in range(4):
    sm = cv2.bilateralFilter(sm, 9, 40, 7)
Z = sm.reshape(-1, 3).astype(np.float32)
crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 12, 1.0)
_, lab, cen = cv2.kmeans(Z, 28, None, crit, 2, cv2.KMEANS_PP_CENTERS)
flat = cen[lab.flatten()].reshape(sm.shape).astype(np.uint8)
col = cv2.addWeighted(flat, 0.65, sm, 0.35, 0)
g = cv2.medianBlur(cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY), 5)
edges = cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 4)
m = (255 - edges).astype(np.float32)[..., None] / 255 * ink_k
ink = np.array([0x30, 0x22, 0x2a], np.float32)  # INK #2a2230 in BGR
out = col.astype(np.float32) * (1 - m) + ink * m
cv2.imwrite(dst, np.clip(out, 0, 255).astype(np.uint8))
print("wrote", dst)
