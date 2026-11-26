# Depth map for a background plate (Depth Anything V2 Small, Apache-2.0), used to give painted plates real 2.5D
# parallax in Remotion. Writes a 540x960 PNG: R = G = depth (255 = near), B = 128 (neutral displacement channel).
# usage: python depth_map.py plate.png out.png
import sys
import numpy as np
from PIL import Image, ImageFilter
from transformers import pipeline

pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src).convert("RGB")
    d = pipe(im.resize((540, 960)))["predicted_depth"]
    d = np.array(d.squeeze().cpu().numpy(), np.float32)
    d = (d - d.min()) / max(1e-6, d.max() - d.min())
    dm = Image.fromarray((d * 255).astype(np.uint8)).resize((540, 960), Image.BICUBIC).filter(ImageFilter.GaussianBlur(3))
    a = np.array(dm)
    out = np.stack([a, a, np.full_like(a, 128)], -1)
    Image.fromarray(out).save(dst)
    print("depth", dst, flush=True)
