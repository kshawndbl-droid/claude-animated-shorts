# Narration with the project's chosen FREE voice: Kokoro-82M (Apache-2.0) "am_onyx", deeper documentary treatment.
# Locked settings (approved 2026-11-24, do not change without the user's OK):
#   voice am_onyx, lang en-us, speed 0.88; then ffmpeg: pitch -6 % at the same tempo
#   (asetrate=sr*0.94, aresample, atempo=1/0.94) + a light room echo (aecho=0.8:0.6:40:0.08).
# Same interface as voice_tts.py: LINES = (section start s, section end s, text) in a JSON file; writes
# <BRIDGE_ROOT>/voice/voice.wav (48 kHz mono) + words.json (line-level spans split evenly per word).
# Needs: pip install kokoro-onnx soundfile; model + voices from huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX
#   (onnx/model.onnx, voices/am_onyx.bin) in $KOKORO_DIR (default ~/tts-models); ffmpeg.
# Usage: BRIDGE_ROOT=<dir> python voice_kokoro.py lines.json      or: python voice_kokoro.py --say "text" out.wav
import json, os, subprocess, sys, tempfile
import numpy as np

VOICE, LANG, SPEED = "am_onyx", "en-us", 0.88
POST = "asetrate={sr}*0.94,aresample={sr},atempo=1/0.94,aecho=0.8:0.6:40:0.08"
SR_OUT = 48000
KDIR = os.environ.get("KOKORO_DIR", os.path.expanduser("~/tts-models"))


def engine():
    from kokoro_onnx import Kokoro
    vfile = os.path.join(KDIR, "voices.npz")
    if not os.path.exists(vfile):  # build the voice pack from the raw Hugging Face voice file
        np.savez(vfile, **{VOICE: np.fromfile(os.path.join(KDIR, "voices", f"{VOICE}.bin"), dtype=np.float32).reshape(-1, 1, 256)})
    return Kokoro(os.path.join(KDIR, "onnx", "model.onnx"), vfile)


def say(k, text, out_wav, speed=1.0):
    """one line in the locked voice -> out_wav (48 kHz mono). `speed` > 1 only to squeeze a line into its slot."""
    import soundfile as sf
    a, sr = k.create(text, voice=VOICE, speed=SPEED * speed, lang=LANG)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as t:
        sf.write(t.name, a, sr)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", t.name, "-af", POST.format(sr=sr) + f",aresample={SR_OUT}", "-ac", "1", out_wav], check=True)
    os.unlink(t.name)


def main():
    k = engine()
    if sys.argv[1] == "--say":
        say(k, sys.argv[2], sys.argv[3]); return
    from dsp import read_wav, write_wav
    import timeline as T
    lines = json.load(open(sys.argv[1]))
    root = os.environ.get("BRIDGE_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.makedirs(os.path.join(root, "voice"), exist_ok=True)
    voice, words = np.zeros(int(T.DUR * SR_OUT)), []
    with tempfile.TemporaryDirectory() as tmp:
        for a, b, text in lines:
            p = os.path.join(tmp, "l.wav"); say(k, text, p)
            x = read_wav(p)[0][0]
            room = (b - a) - 0.27
            if len(x) / SR_OUT > room:  # too long for its slot: re-speak slightly faster
                say(k, text, p, speed=(len(x) / SR_OUT) / room); x = read_wav(p)[0][0]
            i0 = int((a + 0.12) * SR_OUT); n = min(len(x), len(voice) - i0)
            voice[i0:i0 + n] += x[:n]
            ws, t0, d = text.split(), a + 0.12, n / SR_OUT
            words += [{"w": w, "s": round(t0 + d * i / len(ws), 3), "e": round(t0 + d * (i + 1) / len(ws), 3)} for i, w in enumerate(ws)]
    write_wav(os.path.join(root, "voice", "voice.wav"), voice[None, :])
    json.dump(words, open(os.path.join(root, "voice", "words.json"), "w"), indent=0)


if __name__ == "__main__":
    main()
