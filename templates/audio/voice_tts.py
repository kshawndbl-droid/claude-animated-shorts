# Placeholder narration for the bridge short, so the full short renders from a fresh clone with no recorded voice.
# It speaks the approved script (templates/SCRIPT_example.md) with Festival's offline HTS voice and places each line
# at the start of its picture section (section times from cues.md), speeding a line up only if it would overrun.
# Writes <BRIDGE_ROOT>/voice/voice.wav (48 kHz mono) and words.json ([{"w", "s", "e"}], seconds), the two files
# mix.py reads. Replace both with your own recording + word timings for a real release.
# Needs: festival + festvox-us-slt-hts (apt), ffmpeg.  Usage: BRIDGE_ROOT=<dir> python voice_tts.py
import json
import os
import subprocess
import tempfile
import numpy as np
from dsp import SR, read_wav, write_wav
import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("BRIDGE_ROOT", os.path.dirname(HERE))
LEAD = 0.12   # silence before a line inside its section
TAIL = 0.15   # minimum gap before the next section starts

# (section start s, section end s, text): one entry per script sentence, in the picture sections of cues.md
LINES = [
    (0.00, 4.33, "Seventy-four soldiers knocked down an iron bridge just by walking across it."),
    (4.33, 9.43, "It's eighteen thirty-one, and the brand new bridge over the river is the pride of the whole town."),
    (9.43, 14.80, "The men are marching home four across, every boot hitting the planks at the exact same moment."),
    (14.80, 17.90, "Halfway over, the bridge starts bouncing under their feet."),
    (17.90, 21.43, "A normal person would slow down, but these guys think it's hilarious."),
    (21.43, 27.43, "Somebody starts whistling a marching tune, and the whole column stomps along to it, a little harder every step."),
    (27.43, 32.90, "The bounce gets bigger, the chains start groaning, and nobody wants to be the one who breaks step."),
    (32.90, 37.80, "Then a single bolt snaps, and the whole end of the bridge drops into the river."),
    (37.80, 40.60, "Luckily, the river was only two feet deep."),
    (40.60, 43.43, "Unluckily, the river was only two feet deep."),
    (43.43, 47.03, "You see, every bridge has a rhythm it naturally likes to sway at."),
    (47.03, 54.00, "Ever pushed a kid on a swing? Each push is tiny, but if they all land at just the right moment, the swing goes higher and higher."),
    (54.00, 57.83, "Seventy-four men stepping together were pushing that bridge like a swing."),
    (57.83, 62.10, "Nobody died, but the army made a rule: never cross a bridge in step."),
    (62.10, 67.50, "So now, the best drilled soldiers in the world cross every bridge like a crowd of tourists."),
]


def say(text, tmp):
    wav, scm = os.path.join(tmp, "l.wav"), os.path.join(tmp, "l.scm")
    q = text.replace('"', '\\"')
    open(scm, "w").write(
        "(voice_cmu_us_slt_arctic_hts)\n"
        f'(set! u (SynthText "{q}"))\n'
        f'(utt.save.wave u "{wav}" \'riff)\n'
        "(mapcar (lambda (w) (format t \"%s %f %f\\n\" (item.name w) (item.feat w \"word_start\") (item.feat w \"word_end\")))"
        " (utt.relation.items u 'Word))\n")
    out = subprocess.run(["festival", "-b", scm], capture_output=True, text=True, check=True).stdout
    words = [(a, float(b), float(c)) for a, b, c in (l.split() for l in out.splitlines() if l.count(" ") == 2)]
    return wav, words


def fit(wav, tmp, speed):
    """resample to SR mono, sped up by `speed` (pitch kept) when the line would overrun its section"""
    o = os.path.join(tmp, "f.wav")
    af = f"atempo={speed:.4f}," if speed > 1.0001 else ""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", f"{af}aresample={SR}", "-ac", "1", o], check=True)
    x, sr = read_wav(o)
    return x[0]


def main():
    os.makedirs(os.path.join(ROOT, "voice"), exist_ok=True)
    voice, words = np.zeros(int(T.DUR * SR)), []
    with tempfile.TemporaryDirectory() as tmp:
        for a, b, text in LINES:
            wav, ws = say(text, tmp)
            dur = ws[-1][2]
            room = (b - a) - LEAD - TAIL
            speed = max(1.0, dur / room)
            x = fit(wav, tmp, speed)
            t0 = a + LEAD
            i0 = int(t0 * SR)
            n = min(len(x), len(voice) - i0)
            voice[i0:i0 + n] += x[:n]
            words += [{"w": w, "s": round(t0 + s / speed, 3), "e": round(t0 + e / speed, 3)} for w, s, e in ws]
            print(f"{a:6.2f}-{b:6.2f}  {dur:5.2f}s speech  x{speed:.2f}  {text[:50]}")
    write_wav(os.path.join(ROOT, "voice", "voice.wav"), voice[None, :] * 0.9)
    json.dump(words, open(os.path.join(ROOT, "voice", "words.json"), "w"), indent=0)
    print(len(words), "words ->", os.path.join(ROOT, "voice"))


if __name__ == "__main__":
    main()
