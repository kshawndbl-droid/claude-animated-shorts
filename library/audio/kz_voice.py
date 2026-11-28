"""Kaizen Clips narration: a script (one sentence or short paragraph per line) -> natural Kokoro narration + exact
word timings for subtitles and shot timing. The Hidebehind recipe: whole sentences (Kokoro keeps its intonation),
pauses only between lines, a light room tone, no pitch shifting.

    python library/audio/kz_voice.py <script.txt> <outdir> [--voice hollow] [--speed 0.95]

script.txt: one line per narration line. Optional controls at the end of a line, in braces:
    They called it the Hidebehind. {pause=0.45 speed=0.95 gain=1.5}
pause = silence after the line (s, default 0.3), speed = pace for this line (x base), gain = dB.
Lines starting with # are notes and are not read.

Voices: the signature blends in /mnt/project-files/voices/signature/sig_<name>.npy (hollow = the approved horror
narrator) or any Kokoro voice id (am_onyx, bm_george ...). A new voice for a new genre needs the user's approval
on a sample first (project rule).
Writes <outdir>/voice.wav (48 kHz mono, -16 LUFS), lines.json, words.json (whisper-matched to the script).
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODELS = os.environ.get("KOKORO_DIR", "/home/user/tts-models")
SIG = "/mnt/project-files/voices/signature"
SR = 24000


def parse(script_path):
    lines = []
    for raw in open(script_path, encoding="utf-8"):
        raw = raw.strip()
        if not raw or raw.startswith("#"):
            continue
        opt = {"pause": 0.3, "speed": 1.0, "gain": 0.0}
        m = re.search(r"\{([^}]*)\}\s*$", raw)
        if m:
            for kv in m.group(1).split():
                k, v = kv.split("=")
                opt[k] = float(v)
            raw = raw[:m.start()].strip()
        lines.append((raw, opt))
    return lines


def voice_vec(name):
    p = os.path.join(SIG, f"sig_{name}.npy")
    return np.load(p) if os.path.exists(p) else name


def trim(a, th=0.01):
    i = np.where(np.abs(a) > th)[0]
    return a[max(0, i[0] - int(0.03 * SR)):i[-1] + int(0.15 * SR)] if len(i) else a


def narrate(script_path, outdir, voice="hollow", speed=0.95):
    from kokoro_onnx import Kokoro
    k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
    v = voice_vec(voice)
    lang = "en-gb" if isinstance(v, str) and v[:1] == "b" else "en-us"
    os.makedirs(outdir, exist_ok=True)
    out, lines, t = [np.zeros(int(0.25 * SR))], [], 0.25
    for text, o in parse(script_path):
        a, sr = k.create(text, voice=v, speed=speed * o["speed"], lang=lang)
        a = trim(a) * 10 ** (o["gain"] / 20)
        lines.append({"text": text, "start": round(t, 3), "end": round(t + len(a) / SR, 3)})
        out += [a, np.zeros(int(o["pause"] * SR))]
        t += len(a) / SR + o["pause"]
    raw = os.path.join(outdir, "voice.raw.wav")
    sf.write(raw, np.concatenate(out), SR)
    wav = os.path.join(outdir, "voice.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", "aecho=0.8:0.9:40:0.06,loudnorm=I=-16:TP=-1.5", "-ar", "48000", "-ac", "1", wav], check=True)
    os.remove(raw)
    story = os.path.join(outdir, "story.json")
    json.dump({"lines": lines}, open(story, "w"), indent=1)
    # exact word timings (faster-whisper matched to the script words)
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "whisper_words.py"), wav, story, outdir], check=True)
    print("narration", wav, round(t, 1), "s,", len(lines), "lines")
    return wav


if __name__ == "__main__":
    a = sys.argv[1:]
    opt = lambda k, d: a[a.index(k) + 1] if k in a else d  # noqa: E731
    narrate(a[0], a[1], opt("--voice", "hollow"), float(opt("--speed", "0.95")))
