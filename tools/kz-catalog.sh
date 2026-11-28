#!/usr/bin/env bash
# Kaizen Clips library catalog: renders every catalog sheet into one folder so the whole library can be browsed at a
# glance (on the phone too). Re-run after adding looks, motions, sets or lights; set thumbnails are cached (delete a
# thumbnail to re-render it).
#   tools/kz-catalog.sh [outdir]   (default /mnt/project-files/library-catalog)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-/mnt/project-files/library-catalog}"
mkdir -p "$OUT/sets" "$OUT/sheets"
T0=$(date +%s)

# 1. characters: wardrobe, faces, motions, body types (Remotion stills, one bundle)
node tools/kz-still.mjs src/library/index.ts "$OUT/sheets" CatWardrobe:0 CatFaces:0 CatMotions:0 CatBodies:0

# 2. environments: every set recipe in a light that suits it (preview quality, cached)
# (core.arg reads the FIRST occurrence of a flag, so per-set extras come before the default --cam wide)
PY=.venv-bpy/bin/python
while read -r name light extra; do
  [ -z "$name" ] && continue
  d="$OUT/sets/${name/:/-}-$light"   # no ":" in folder names (Windows)
  if [ ! -f "$d/plate.png" ]; then
    # shellcheck disable=SC2086
    $PY tools/kz-set.py -- --set "${name%%:*}" --light "$light" --quality preview $extra --cam wide --out "$d/" 2>&1 | grep -E "^done|Error" || true
  fi
done <<'SETS'
village golden --period 1800s
village:night night_moon --period 1800s --lit 1
village:winter overcast --period medieval --season winter
street dusk --period victorian
forest morning
forest:night night_moon
field noon --kind farm
field:battle overcast --kind battlefield
interior candle --kind cottage --cam medium
interior:office interior_day --kind office --cam medium
shore golden
desert noon
SETS

# 3. one contact sheet of all sets, labelled
python3 - "$OUT" <<'PY'
import os, sys
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]
sets = sorted(d for d in os.listdir(f"{out}/sets") if os.path.isfile(f"{out}/sets/{d}/plate.png"))
W, H, cols = 270, 480, 4
rows = (len(sets) + cols - 1) // cols
sheet = Image.new("RGB", (W * cols, (H + 34) * rows), (16, 16, 20))
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
except OSError:
    font = ImageFont.load_default()
dr = ImageDraw.Draw(sheet)
for i, s in enumerate(sets):
    im = Image.open(f"{out}/sets/{s}/plate.png").convert("RGB").resize((W, H))
    x, y = (i % cols) * W, (i // cols) * (H + 34)
    sheet.paste(im, (x, y + 34))
    dr.text((x + 8, y + 7), s.replace(":", " "), fill=(235, 235, 235), font=font)
sheet.save(f"{out}/sheets/CatSets.png")
print("sets sheet:", len(sets), "sets")
PY
echo "catalog in $OUT ($(( $(date +%s) - T0 )) s)"
