#!/bin/bash
# Kaizen Clips: one-command setup of a fresh cloud container (4 CPU, no GPU) for the whole pipeline.
#   bash tools/bootstrap.sh                 # tools, models, voices
#   bash tools/bootstrap.sh hidebehind      # ... and unpack that Short's render assets (shorts/<slug>/assets/*.tar)
# Safe to re-run: every step checks first and skips what is already there.
# Big downloads are cached once in project files (/mnt/project-files/cache/), so the next container copies them
# instead of downloading again. Nothing in shorts/ is ever written or changed by this script.
set -e
cd "$(dirname "$0")/.."
REPO=$(pwd)
PF=${PF:-/mnt/project-files}
CACHE=$PF/cache
MODELS=${MODELS:-/home/user/tts-models}
T0=$(date +%s)
step() { echo; echo "== $1 ($(( $(date +%s) - T0 )) s)"; }
mkdir -p "$CACHE/wheels" "$CACHE/models" "$MODELS"

step "system packages, node modules, Blender (bpy)"
# bpy is ~400 MB: install from the cached wheel when there is one
if [ ! -x .venv-bpy/bin/python ]; then
  python3 -m venv .venv-bpy
  ls "$CACHE"/wheels/bpy-*.whl >/dev/null 2>&1 || .venv-bpy/bin/pip download -q --no-deps -d "$CACHE/wheels" bpy
  .venv-bpy/bin/pip install -q --find-links "$CACHE/wheels" bpy
fi
bash tools/setup-cloud.sh

step "python packages for voice, timing and sound"
python3 -c "import kokoro_onnx, soundfile, faster_whisper, scipy" 2>/dev/null || \
  pip install -q kokoro-onnx soundfile faster-whisper scipy numpy

step "Kokoro narrator models"
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  if [ ! -s "$MODELS/$f" ]; then
    if [ ! -s "$CACHE/models/$f" ]; then
      curl -sSfL -o "$CACHE/models/$f.part" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
      mv "$CACHE/models/$f.part" "$CACHE/models/$f"
    fi
    cp "$CACHE/models/$f" "$MODELS/$f"
  fi
done

step "faster-whisper word-timing model"
W=$MODELS/whisper-small.en
if [ ! -s "$W/model.bin" ]; then
  if [ -s "$CACHE/models/whisper-small.en/model.bin" ]; then cp -r "$CACHE/models/whisper-small.en" "$W"
  else
    HF_HUB_DISABLE_XET=1 python3 -c "from huggingface_hub import snapshot_download as s; s('Systran/faster-whisper-small.en', local_dir='$W')"
    cp -r "$W" "$CACHE/models/whisper-small.en"
  fi
fi

step "signature narrator voices"
ls "$PF"/voices/signature/*.npy 2>/dev/null | xargs -n1 basename | tr '\n' ' '; echo

if [ -n "$1" ]; then
  step "render assets for '$1'"
  for t in "$PF/shorts/$1/assets/"*.tar; do
    [ -e "$t" ] || continue
    dest=.
    while read -r slug glob d; do
      case "$slug" in ''|\#*) continue;; esac
      [ "$slug" = "$1" ] && [[ "$(basename "$t")" == $glob ]] && dest=$d
    done < tools/asset-map.txt
    mkdir -p "$dest"; echo "unpack $(basename "$t") -> $dest"; tar xf "$t" -C "$dest"
  done
fi

step "check"
.venv-bpy/bin/python -c "import bpy; print('blender', bpy.app.version_string)"
node -e "console.log('remotion', require('remotion/package.json').version)"
python3 -c "import kokoro_onnx, faster_whisper; print('kokoro + whisper ok')"
ffmpeg -hide_banner -version | head -1
echo "ready in $(( $(date +%s) - T0 )) s"
