# Audio for the two "Man Who Mailed Himself" Shorts: the approved bm_fable narration (unchanged) + an original,
# code-made score and sound effects (€0). Film A ("The Crate"): a bouncy 1960s combo (twangy guitar, organ, walking
# bass, brushes). Film B ("Inside the Box"): a sneaky spy-jazz (vibraphone, muted bass, finger snaps, low strings).
# usage: /home/user/venv-tts/bin/python templates/audio/mailed_audio.py A|B out.wav
import json
import os
import sys
import numpy as np
import soundfile as sf
import scipy.signal as ss

R = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VAR = sys.argv[1].upper()
DUR = 77.6
n = int(R * DUR)
rng = np.random.default_rng(1964 if VAR == "A" else 4691)
t = np.arange(n) / R
_w = json.load(open(os.path.join(ROOT, "stories", "mailed-himself", "final", "words.json")))
words = _w["words"] if isinstance(_w, dict) else _w


def W(w, i=0):
    return [x for x in words if "".join(c for c in x["w"].lower() if c.isalnum()) == w][i]["s"]


def flt(x, kind, f, o=2):
    return ss.sosfilt(ss.butter(o, f, kind, fs=R, output="sos"), x)


def norm(x):
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-9)


L, Rr = np.zeros(n), np.zeros(n)
ML, MR = np.zeros(n), np.zeros(n)


def add(x, start, db, pan=0.0, music=False):
    s = int(start * R)
    if s >= n or s < 0 or len(x) == 0:
        return
    x = x[: max(0, n - s)]
    g = 10 ** (db / 20)
    a, b = (ML, MR) if music else (L, Rr)
    a[s:s + len(x)] += x * g * np.sqrt(0.5 * (1 - pan))
    b[s:s + len(x)] += x * g * np.sqrt(0.5 * (1 + pan))


def mx(*xs):
    out = np.zeros(max(len(x) for x in xs))
    for x in xs:
        out[:len(x)] += x
    return out


def tt_(dur):
    return np.arange(int(R * dur)) / R


# ------------------------------------------------------------------ instruments
_ks = {}


def pluck(f, dur=0.4, damp=0.996, bright=3500):
    k = (round(f, 2), dur, damp, bright)
    if k in _ks:
        return _ks[k]
    m = int(R * dur); p = max(2, int(R / f))
    buf = rng.uniform(-1, 1, p); out = np.zeros(m)
    for i in range(m):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * damp
    out = flt(out, "low", bright)
    _ks[k] = out
    return out


def twang(f, dur=0.35):
    """surf-style guitar: plucked string, a touch of drive and fast tremolo"""
    x = pluck(f, dur, 0.997, 4200)
    tt = tt_(dur)[:len(x)]
    return np.tanh(2.2 * x) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * tt)) * np.exp(-tt * 3)


def organ(f, dur):
    tt = tt_(dur)
    x = sum(a * np.sin(2 * np.pi * f * h * tt) for h, a in ((1, 1), (2, 0.5), (3, 0.3), (4, 0.15)))
    env = np.minimum(tt / 0.02, 1) * np.minimum((dur - tt) / 0.05, 1).clip(0, 1)
    return x * env * (1 + 0.1 * np.sin(2 * np.pi * 6 * tt))


def vibes(f, dur=1.0):
    tt = tt_(dur)
    x = (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt * 8)) * np.exp(-tt * 2.5)
    return x * (1 + 0.35 * np.sin(2 * np.pi * 5.5 * tt)) * np.minimum(tt / 0.003, 1)


def bass(f, dur=0.4, dec=6):
    tt = tt_(dur)
    return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * dec) * np.minimum(tt / 0.005, 1)


def strings(f, dur):
    tt = tt_(dur)
    x = sum(ss.sawtooth(2 * np.pi * f * d * tt) for d in (1, 1.004, 0.996)) / 3
    env = np.minimum(tt / 0.4, 1) * np.minimum((dur - tt) / 0.4, 1).clip(0, 1)
    return flt(x, "low", 1800) * env


def brush(dur=0.12):
    m = int(R * dur)
    return flt(rng.standard_normal(m), "band", [2500, 9000]) * np.exp(-np.arange(m) / (0.03 * R))


def snare(dur=0.15):
    m = int(R * dur)
    return mx(flt(rng.standard_normal(m), "band", [1500, 7000]) * np.exp(-np.arange(m) / (0.04 * R)), 0.5 * bass(190, dur, 30))


def kick(dur=0.2):
    tt = tt_(dur)
    return np.sin(2 * np.pi * (50 + 80 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 14)


def snap(dur=0.08):
    m = int(R * dur)
    return flt(rng.standard_normal(m), "band", [1800, 5000]) * np.exp(-np.arange(m) / (0.008 * R))


def bell(f, dur=0.6, dec=8):
    tt = tt_(dur)
    return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt * dec)


def noise_hit(dur, band, dec):
    m = int(R * dur)
    return flt(rng.standard_normal(m), "band", band) * np.exp(-np.arange(m) / (dec * R))


m2f = lambda key, s: key * 2 ** (s / 12)


def groove(t0, t1, key, bpm, chords, mel, lead="twang", mel_db=-27, ch_db=-31, bass_db=-22, dr_db=-36, drums="brush", half=False, swing=0.0):
    beat = 60 / bpm
    bar = 0
    while True:
        b0 = t0 + bar * 4 * beat
        if b0 > t1 - 0.1:
            break
        root, ch = chords[bar % len(chords)]
        for q in range(4):
            tq = b0 + q * beat
            if tq >= t1:
                break
            # walking / root-fifth bass
            if not half or q in (0, 2):
                st = [0, 4, 7, 9][q] if not half else (0 if q == 0 else 7)
                add(bass(m2f(key, root - 24 + st), beat * 0.9), tq, bass_db, -0.15, True)
            if drums == "brush":
                add(brush(), tq, dr_db, 0.3, True); add(brush(0.06), tq + beat * (0.5 + swing), dr_db - 6, 0.3, True)
                if q in (1, 3): add(snare(), tq, dr_db + 2, 0.1, True)
            elif drums == "snap":
                if q in (1, 3): add(snap(), tq, dr_db + 4, 0.25, True)
            elif drums == "kick":
                if q in (0, 2): add(kick(), tq, dr_db + 6, 0, True)
                if q in (1, 3): add(snare(), tq, dr_db, 0.1, True)
        # chords: organ (A) or soft strings (B)
        if lead == "twang":
            for q in (1, 3):
                if b0 + q * beat < t1:
                    add(sum(organ(m2f(key, s), beat * 0.45) for s in ch), b0 + q * beat, ch_db, -0.3, True)
        else:
            add(sum(strings(m2f(key, s - 12), min(4 * beat, t1 - b0)) for s in ch), b0, ch_db - 2, -0.3, True)
        bar += 1
    i = 0
    step = beat * 0.5
    while mel:
        te = t0 + i * step + (step * swing if i % 2 else 0)
        if te > t1 - 0.15:
            break
        s = mel[i % len(mel)]
        if s is not None:
            x = twang(m2f(key, s + 12), 0.35) if lead == "twang" else vibes(m2f(key, s + 12), 0.9)
            add(x, te, mel_db, 0.25, True)
        i += 1


# ------------------------------------------------------------------ sound effects
def whoosh(t0, dur=0.5, db=-28, f0=400, f1=2500, pan=0.0):
    m = int(R * dur); tt = np.arange(m) / R
    x = rng.standard_normal(m)
    env = np.sin(np.pi * tt / dur) ** 2
    lo = flt(x, "band", [f0, f1])
    add(norm(lo) * env, t0, db, pan)


def thud(t0, db=-26, f=70):
    add(norm(mx(noise_hit(0.15, [60, 700], 0.03), bass(f, 0.2, 14))), t0, db, 0)


def bang(t0, db=-22):
    add(norm(mx(noise_hit(0.12, [200, 3000], 0.02), 0.6 * bell(1900, 0.15, 30), 0.6 * bass(110, 0.12, 30))), t0, db, 0.1)


def creak(t0, dur=0.6, db=-32):
    tt = tt_(dur)
    f = 180 + 60 * np.sin(2 * np.pi * 1.3 * tt)
    x = ss.sawtooth(2 * np.pi * np.cumsum(f) / R) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 23 * tt)))
    add(norm(flt(x, "band", [300, 2500])) * np.sin(np.pi * tt / dur), t0, db, -0.1)


def twinkle(t0, db=-28):
    for i, f in enumerate((2093, 2637, 3136, 4186)):
        add(bell(f, 0.5, 9), t0 + i * 0.045, db, 0.3)


def ding(t0, db=-26):
    add(mx(bell(1318, 1.0, 3), 0.6 * bell(1046, 1.0, 3)), t0, db, 0.2)


def chime2(t0, db=-28):
    add(bell(988, 0.9, 3.5), t0, db, 0.3); add(bell(784, 1.0, 3.5), t0 + 0.32, db, 0.3)


def bleep(t0, dur, db=-30):
    tt = tt_(dur)
    add(np.sin(2 * np.pi * 1000 * tt) * np.minimum(tt / 0.01, 1) * np.minimum((dur - tt) / 0.01, 1).clip(0, 1), t0, db, 0)


def steps(t0, t1, every, db=-36, pan=0.0, band=(250, 2500)):
    s = t0
    while s < t1:
        k = rng.standard_normal(int(0.06 * R)) * np.exp(-np.arange(int(0.06 * R)) / (0.008 * R))
        add(norm(flt(k, "band", list(band))), s, db, pan)
        s += every


def drone(t0, t1, f, db, lp=400, wob=0.3):
    tt = tt_(t1 - t0)
    x = sum(ss.sawtooth(2 * np.pi * f * d * tt) for d in (1, 1.01, 2.003)) / 3
    env = np.minimum(tt / 0.6, 1) * np.minimum((t1 - t0 - tt) / 0.6, 1).clip(0, 1)
    add(flt(x, "low", lp) * env * (1 + wob * np.sin(2 * np.pi * 0.7 * tt)), t0, db, 0)


def room(t0, t1, db=-46, lp=400):
    tt = tt_(t1 - t0)
    e = np.minimum(tt / 0.3, 1) * np.minimum((t1 - t0 - tt) / 0.3, 1).clip(0, 1)
    add(norm(flt(rng.standard_normal(len(tt)), "low", lp)) * e, t0, db, 0)


def plop(t0, db=-28, f=300):
    tt = tt_(0.18)
    add(np.sin(2 * np.pi * (f + 400 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18), t0, db, 0.1)


def clink(t0, db=-30):
    add(mx(bell(2600, 0.3, 16), 0.5 * bell(3700, 0.25, 20)), t0, db, 0.2)


def phone_ring(t0, dur=1.2, db=-30):
    tt = tt_(dur)
    x = (np.sin(2 * np.pi * 1400 * tt) + np.sin(2 * np.pi * 1700 * tt)) * (np.sin(2 * np.pi * 20 * tt) > 0) * ((tt % 0.6) < 0.4)
    add(flt(x, "band", [800, 3500]), t0, db, 0.2)


def typer(t0, t1, db=-34):
    s = t0
    while s < t1:
        add(norm(noise_hit(0.03, [1500, 6000], 0.006)), s, db, rng.uniform(-0.3, 0.3)); s += rng.uniform(0.07, 0.14)


# ------------------------------------------------------------------ the two films
C = 261.63
if VAR == "A":
    G = 196.0
    CH = [(0, [4, 7, 12]), (5, [9, 12, 17]), (7, [11, 14, 19]), (0, [4, 7, 12])]
    CHM = [(0, [3, 7, 12]), (-4, [0, 3, 8]), (-5, [2, 7, 11]), (0, [3, 7, 12])]
    MEL = [12, None, 14, 16, 19, None, 16, 14, 12, None, 9, None, 7, 9, 12, None, 17, None, 16, 14, 12, 14, 16, None, 19, None, 21, 19, 16, None, None, None]
    MELM = [12, None, None, 15, None, None, 14, 12, 10, None, None, None, 8, None, 7, None]
    # hook: airliner drone + soft organ swell, then the groove
    drone(0.0, 4.2, 55, -34, 300, 0.15)
    groove(0.3, 6.3, G, 132, CH, MEL[:16] + [None] * 16, mel_db=-30, ch_db=-34, dr_db=-42)
    # England: a sad, slow minor version
    groove(6.3, 12.8, G, 96, CHM, MELM, mel_db=-28, ch_db=-33, bass_db=-25, dr_db=-99, half=True)
    # cargo job + the idea + building: the bouncy main groove
    groove(12.8, 25.6, G, 132, CH, MEL, mel_db=-27, ch_db=-32, dr_db=-37, swing=0.12)
    # packing + label + nails: same groove up a tone
    groove(25.6, 37.4, G * 2 ** (2 / 12), 132, CH, MEL[16:] + MEL[:16], mel_db=-28, ch_db=-32, dr_db=-38, swing=0.12)
    # hold: tense, quiet, half time, then the landing
    groove(37.6, 43.3, G, 88, CHM, [12, None, None, None, 11, None, None, None], mel_db=-30, ch_db=-35, bass_db=-25, dr_db=-99, half=True)
    # Bombay + oven: slow, woozy drone with sparse plucks
    drone(43.4, 52.4, 98, -36, 500, 0.4)
    groove(43.4, 52.3, G, 80, CHM, [12, None, None, 13, None, None, 12, None, None, None, 10, None, None, None, None, None], mel_db=-30, ch_db=-38, bass_db=-27, dr_db=-99, half=True)
    # Perth: tense tiptoe; the exit: sneaky
    groove(52.4, 57.6, G, 104, CHM, [12, None, 15, None, 14, None, 12, None], mel_db=-30, ch_db=-35, bass_db=-25, dr_db=-44, half=True)
    groove(57.6, 61.5, G, 116, CHM, [12, 15, 17, None, 15, 12, None, None], mel_db=-29, ch_db=-35, bass_db=-24, dr_db=-42)
    # 63 hours -> home: triumphant main theme, kick + snare
    groove(61.5, 68.3, G * 2 ** (3 / 12), 140, CH, MEL, mel_db=-26, ch_db=-31, dr_db=-36, drums="kick")
    # London phone + papers: urgent, then the final bright tag
    groove(68.3, 73.3, G, 150, CH, MEL[8:24], mel_db=-28, ch_db=-32, dr_db=-37, drums="kick")
    groove(73.3, 77.4, G, 132, CH, MEL[:16], mel_db=-28, ch_db=-32, dr_db=-38, swing=0.12)
    # --- SFX
    whoosh(0.4, 3.6, -38, 200, 1200)  # the airliner passing
    room(4.15, 6.3, -42, 250)          # cargo hold rumble
    creak(4.6, 0.5, -36)
    steps(6.4, W("javelin") + 0.1, 0.32, -38, -0.2)
    whoosh(W("javelin") + 0.15, 0.8, -30, 600, 4000, 0.4); thud(W("javelin") + 1.0, -30, 90)
    add(norm(noise_hit(0.6, [2000, 6000], 0.3)) * np.abs(np.sin(np.arange(int(0.6 * R)) / R * 2 * np.pi * 25)), W("broke") + 0.1, -40, 0.4)  # moth flutter
    twinkle(W("daughters") - 0.05, -30)
    steps(12.9, 17.4, 0.38, -38, 0.0)
    for i in range(4):
        whoosh(W("crates") - 0.2 + i * 0.25, 0.6, -34, 500, 3000, -0.6 + 0.4 * i)
    ding(W("brilliant") + 0.05, -26)
    for i in range(int((23.5 - 21.0) * 2.23)):  # hammering in the build shot (2.23 Hz)
        bang(21.0 + i / 2.23, -32)
    for i in range(4):
        add(norm(noise_hit(0.08, [300, 2000], 0.02)), W("built") + i * 0.2, -32, 0)
    creak(W("opened") - 0.15, 0.4, -30); twinkle(W("opened") + 0.1, -30)
    add(norm(noise_hit(0.3, [200, 1200], 0.08)), W("pillow"), -36, -0.3)  # pillow puff
    clink(W("torch") + 0.15, -32); add(norm(noise_hit(0.03, [2000, 7000], 0.005)), W("torch") + 0.35, -34, 0)
    for i in range(2): add(mx(bell(900, 0.2, 20), noise_hit(0.08, [300, 3000], 0.02)), W("tinned") + 0.2 + i * 0.08, -32, 0.2)
    clink(W("bottles") + 0.2, -30); clink(W("bottles") + 0.32, -32)
    twinkle(W("not") + 0.2, -32)
    add(norm(noise_hit(0.9, [1500, 6000], 0.3)), W("label") + 0.1, -38, 0)  # stencil spray
    thud(W("cash") - 0.02, -24, 80)
    for w in ("nailed", "it", "shut"):
        bang(W(w) - 0.02, -22)
    add(norm(noise_hit(0.12, [400, 3000], 0.02)), W("cargo", 1) - 0.08, -28, 0)  # sticker slap
    room(37.6, 43.4, -40, 220); drone(37.6, 43.4, 41, -32, 200, 0.1)
    creak(W("sneaked") - 0.4, 0.5, -32)
    chime2(W("landing") - 0.9, -26)
    whoosh(W("dived"), 0.35, -30, 400, 2500); thud(W("dived") + 0.45, -26)
    drone(43.4, 47.8, 140, -42, 900, 0.6)  # heat shimmer
    steps(43.6, 45.4, 0.4, -38, 0.3)
    whoosh(W("upside") - 0.35, 0.45, -30, 300, 2000); thud(W("upside") + 0.1, -22, 65)
    whoosh(W("stripped"), 0.5, -32, 600, 3000, 0.4)
    add(norm(noise_hit(1.2, [100, 800], 0.4)) * np.sin(np.arange(int(1.2 * R)) / R * np.pi / 1.2), W("pass") - 0.2, -38, 0)  # woozy
    room(52.4, 57.6, -44, 600); steps(52.5, 55.6, 0.5, -36, 0)
    bleep(W("swore") - 0.02, 0.45, -32); bleep(W("size") - 0.02, 0.35, -33)
    creak(57.7, 0.5, -32); whoosh(W("suit") - 0.1, 0.4, -34, 800, 4000); twinkle(W("suit") + 0.05, -32)
    steps(W("made") - 0.05, 61.4, 0.36, -36, 0.2)
    typer(61.6, 63.2, -36); ding(64.1, -30)
    steps(65.3, W("birthday", 1) - 0.3, 0.38, -38, -0.2); twinkle(W("birthday", 1) - 0.1, -26)
    phone_ring(68.0, 1.0, -30)
    for i, tw in enumerate((71.2, W("worldwide") - 0.1, W("worldwide") + 0.25)):
        whoosh(tw, 0.6, -30, 500, 4000, -0.4 + 0.4 * i)
    whoosh(W("shrugged") - 0.1, 0.3, -36, 500, 2500); twinkle(W("of", 3) + 0.15, -26)
else:
    D = 146.83
    CHB = [(0, [3, 7, 10, 14]), (5, [3, 8, 12, 15]), (-2, [2, 5, 9, 12]), (-5, [2, 5, 8, 11])]
    CHM = [(0, [3, 7, 10]), (-4, [0, 3, 7]), (1, [5, 8, 13]), (-5, [2, 7, 11])]
    SPY = [12, None, 15, None, 14, 12, None, 10, 12, None, None, 7, 10, None, 12, None]
    SPY2 = [19, None, 17, 15, None, 14, None, 12, 10, None, 12, None, 15, None, None, None]
    # hook: dark, torchlight, low strings + vibes
    drone(0.0, 6.3, 36.7, -36, 220, 0.1)
    groove(0.4, 6.3, D, 92, CHB, [12, None, None, None, 15, None, 14, None], lead="vibes", mel_db=-27, ch_db=-33, bass_db=-25, dr_db=-99, half=True)
    # bedsit: rain, lonely vibes
    groove(6.3, 12.8, D, 76, CHM, [12, None, None, 10, None, None, 8, None, 7, None, None, None, None, None, None, None], lead="vibes", mel_db=-28, ch_db=-34, bass_db=-26, dr_db=-99, half=True)
    # the job + the idea + the build: spy-jazz with finger snaps
    groove(12.8, 25.6, D, 118, CHB, SPY, lead="vibes", mel_db=-27, ch_db=-34, bass_db=-23, dr_db=-36, drums="snap", swing=0.18)
    groove(25.6, 37.4, D * 2 ** (2 / 12), 118, CHB, SPY2, lead="vibes", mel_db=-28, ch_db=-34, bass_db=-23, dr_db=-37, drums="snap", swing=0.18)
    # hold: almost silence, heartbeat bass
    for i in range(int((43.3 - 37.6) / 0.85)):
        add(bass(55, 0.2, 12), 37.7 + i * 0.85, -24, 0, True); add(bass(55, 0.2, 12), 37.95 + i * 0.85, -28, 0, True)
    drone(37.6, 43.3, 36.7, -36, 200, 0.05)
    # Bombay apron + the oven: hot, wobbly
    drone(43.4, 52.4, 73.4, -36, 600, 0.5)
    groove(43.4, 52.3, D, 70, CHM, [12, None, None, None, 13, None, None, None], lead="vibes", mel_db=-30, ch_db=-37, bass_db=-27, dr_db=-99, half=True)
    # Perth: tension, the exit: snaps tiptoe
    groove(52.4, 57.6, D, 100, CHM, [12, None, None, 13, 12, None, None, None], lead="vibes", mel_db=-30, ch_db=-34, bass_db=-24, dr_db=-40, drums="snap", half=True)
    groove(57.6, 61.5, D, 118, CHB, SPY, lead="vibes", mel_db=-29, ch_db=-35, bass_db=-24, dr_db=-38, drums="snap", swing=0.18)
    # home: warm and bright (major), the newsroom: busy, the end
    groove(61.5, 68.3, D * 2 ** (5 / 12), 124, [(0, [4, 7, 11, 14]), (5, [4, 9, 12, 16]), (7, [5, 11, 14, 17]), (0, [4, 7, 11, 14])],
           [12, None, 16, None, 19, None, 21, 19, 16, None, 14, None, 12, None, None, None], lead="vibes", mel_db=-27, ch_db=-33, bass_db=-23, dr_db=-36, drums="brush", swing=0.15)
    groove(68.3, 73.3, D, 132, CHB, SPY2, lead="vibes", mel_db=-29, ch_db=-34, bass_db=-23, dr_db=-37, drums="snap", swing=0.18)
    groove(73.3, 77.4, D * 2 ** (5 / 12), 118, [(0, [4, 7, 11, 14]), (5, [4, 9, 12, 16])], [12, None, 16, None, 19, None, None, None, 24, None, None, None, None, None, None, None],
           lead="vibes", mel_db=-27, ch_db=-33, bass_db=-24, dr_db=-38, drums="brush", swing=0.15)
    # --- SFX
    add(norm(noise_hit(0.05, [1500, 6000], 0.01)), 0.35, -28, 0)  # torch click
    room(0, 4.3, -44, 300)
    drone(4.3, 6.3, 55, -34, 400, 0.2)  # engines on the night runway
    rain = flt(rng.standard_normal(int(6.5 * R)), "band", [1500, 7000]) * 0.7
    add(norm(rain) * np.minimum(tt_(6.5) / 0.5, 1) * np.minimum((6.5 - tt_(6.5)) / 0.5, 1), 6.3, -42, 0)
    add(norm(noise_hit(0.6, [2000, 6000], 0.3)) * np.abs(np.sin(np.arange(int(0.6 * R)) / R * 2 * np.pi * 25)), W("broke") + 0.15, -40, 0.4)
    twinkle(W("birthday") - 0.05, -32)
    drone(12.8, 17.5, 55, -40, 400, 0.2); steps(13.0, 16.8, 0.42, -38, 0)
    thud(W("crates"), -32); thud(W("world") + 0.1, -34)
    ding(W("brilliant") + 0.05, -26)
    for i in range(int((W("box", 1) + 0.3 - 21.0) / 0.25)):  # sawing
        add(norm(noise_hit(0.2, [800, 5000], 0.1)), 21.0 + i * 0.25, -36, 0.2)
    for i in range(3): bang(W("straps") + 0.1 + i * 0.3, -32)
    creak(W("opened") - 0.15, 0.4, -30); add(mx(bell(700, 0.3, 10)), W("within") + 0.1, -30, 0)  # boing
    add(norm(noise_hit(0.3, [200, 1200], 0.08)), W("pillow"), -36, -0.3)
    add(norm(noise_hit(0.04, [1500, 6000], 0.01)), W("torch") + 0.2, -30, 0)
    for i in range(2): add(mx(bell(900, 0.2, 20), noise_hit(0.08, [300, 3000], 0.02)), W("tinned") + 0.2 + i * 0.08, -32, 0.2)
    clink(W("bottles") + 0.2, -30); clink(W("bottles") + 0.32, -32)
    add(norm(noise_hit(0.9, [1500, 6000], 0.3)), W("label") + 0.1, -38, 0)
    thud(W("cash") - 0.02, -26, 80)
    for w in ("nailed", "it", "shut"):
        bang(W(w) - 0.02, -20)
    room(37.6, 43.4, -42, 180)
    creak(W("sneaked") - 0.4, 0.5, -32)
    chime2(W("landing") - 0.9, -26)
    whoosh(W("dived"), 0.35, -30, 400, 2500); thud(W("dived") + 0.45, -26)
    steps(43.6, 45.6, 0.45, -38, 0.3)
    whoosh(W("upside") - 0.3, 0.45, -30, 300, 2000); thud(W("upside") + 0.12, -22, 65)
    whoosh(W("stripped"), 0.5, -32, 600, 3000, 0.4)
    add(norm(noise_hit(1.2, [100, 800], 0.4)) * np.sin(np.arange(int(1.2 * R)) / R * np.pi / 1.2), W("pass") - 0.2, -38, 0)
    room(52.4, 57.6, -44, 600)
    bleep(W("swore") - 0.02, 0.45, -32); bleep(W("size") - 0.02, 0.35, -33)
    for i in range(3): thud(53.0 + i * 0.9, -34, 60)  # the crate being jostled
    creak(57.7, 0.5, -32); twinkle(W("suit") + 0.05, -32)
    steps(W("made") - 0.05, 61.4, 0.36, -36, 0.2)
    add(norm(noise_hit(1.0, [800, 4000], 0.4)), 61.6, -40, 0)  # tag flutter
    for i in range(6): add(norm(noise_hit(0.04, [1000, 5000], 0.01)), 61.7 + i * 0.4, -34, 0)  # flip clock
    add(norm(noise_hit(0.15, [200, 2000], 0.04)), 65.4, -30, 0)  # door
    steps(65.5, 66.6, 0.18, -34, -0.2); twinkle(W("birthday", 1) - 0.1, -26)
    phone_ring(68.0, 1.0, -30); typer(68.8, 71.2, -34)
    for i, tw in enumerate((71.2, W("worldwide") - 0.1, W("worldwide") + 0.25)):
        whoosh(tw, 0.6, -30, 500, 4000, -0.4 + 0.4 * i)
    twinkle(W("of", 3) + 0.15, -26)

# ------------------------------------------------------------------ narration (unchanged) + duck
v, vr = sf.read(os.path.join(ROOT, "stories", "mailed-himself", "final", "voice.wav"))
if v.ndim > 1:
    v = v.mean(1)
if vr != R:
    v = ss.resample_poly(v, R, vr)
v = v[:n]
v = v / (np.max(np.abs(v)) + 1e-9)
envv = np.zeros(n); envv[:len(v)] = np.abs(v)
envv = flt(envv, "low", 4, 1); envv = envv / (envv.max() + 1e-9)
duck = 10 ** (-5 * np.clip(envv * 3, 0, 1) / 20)
add(v, 0.0, -3, 0)
mfin = np.minimum(t / 1.0, 1) ** 1.5
ML *= mfin; MR *= mfin
L += ML * duck; Rr += MR * duck
fo = np.clip((DUR - t) / 0.7, 0, 1)
L *= fo; Rr *= fo
mix = np.stack([L, Rr], 1)
mix = mix / np.max(np.abs(mix)) * 0.89
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[2])), exist_ok=True)
sf.write(sys.argv[2], mix, R, subtype="PCM_24")
print("wrote", sys.argv[2], DUR)
