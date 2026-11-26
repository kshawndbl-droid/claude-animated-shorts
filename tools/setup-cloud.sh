#!/bin/bash
# One-time setup of a Linux (Ubuntu 24.04) render box without a GPU, e.g. a Claude Code cloud container.
# Installs: Node deps (Remotion + three.js), FFmpeg, Python audio deps, Festival placeholder voice,
# Mesa EGL (software OpenGL for Blender EEVEE/Workbench), and Blender as a Python module (bpy) in ./.venv-bpy.
# Safe to re-run. Usage: bash tools/setup-cloud.sh
set -e
cd "$(dirname "$0")/.."
export DEBIAN_FRONTEND=noninteractive
need=""
for p in ffmpeg festival festvox-us-slt-hts libegl1 libegl-mesa0 libgl1-mesa-dri libgles2; do dpkg -s $p >/dev/null 2>&1 || need="$need $p"; done
if [ -n "$need" ]; then apt-get update -q && apt-get install -y -q $need; fi
python3 -c "import numpy, scipy" 2>/dev/null || pip install -q numpy scipy
[ -d node_modules ] || npm ci --no-audit --no-fund
if [ ! -x .venv-bpy/bin/python ]; then python3 -m venv .venv-bpy && .venv-bpy/bin/pip install -q bpy; fi
.venv-bpy/bin/python -c "import bpy; print('bpy', bpy.app.version_string)"
ffmpeg -hide_banner -version | head -1
echo "Software WebGL for Remotion on this box: REMOTION_GL=swangle; BROWSER_EXECUTABLE=<chrome or chrome-headless-shell>"
