# Full audio for the Reddit-style Short "The Cricket Box": narration (Kokoro af_heart) + a code-made score and
# sound effects, €0. Same approach as the Eiffel mix (soft start, side-chain duck, SFX on story beats) but an
# original score: a bouncy marimba + pizzicato tune for the setup, a sneaky tiptoe for the plan, a spooky little
# night version while Dave hunts, and a bright return for the happy ending.
# usage: /home/user/venv-tts/bin/python templates/audio/reddit_crickets_audio.py public/reddit/crickets_mix.wav
import json
import os
import sys
import numpy as np
import soundfile as sf
import scipy.signal as ss

R = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DUR = 61.5
n = int(R * DUR)
rng = np.random.default_rng(2024)
t = np.arange(n) / R
words = json.load(open(os.path.join(ROOT, "stories", "reddit-crickets", "words.json")))
words = words["words"] if isinstance(words, dict) else words


def W(w, i=0):
    return [x for x in words if x["w"].strip(".,?!:").lower() == w][i]["s"]


def flt(x, kind, f, o=2):
    return ss.sosfilt(ss.butter(o, f, kind, fs=R, output="sos"), x)


def norm(x):
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-9)


L, Rr = np.zeros(n), np.zeros(n)
ML, MR = np.zeros(n), np.zeros(n)  # music bus (ducked under the voice)


def add(x, start, db, pan=0.0, music=False):
    s = int(start * R)
    if s >= n or s < 0:
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


def env_ad(m, a, d):
    tt = np.arange(m) / R
    return np.minimum(tt / a, 1) * np.exp(-tt * d)


# ------------------------------------------------------------------ instruments
def marimba(f, dur=0.5):
    m = int(R * dur); tt = np.arange(m) / R
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9) + 0.35 * np.sin(2 * np.pi * f * 4.0 * tt) * np.exp(-tt * 30) \
        + 0.12 * np.sin(2 * np.pi * f * 9.9 * tt) * np.exp(-tt * 60)
    return x * np.minimum(tt / 0.002, 1)


def pizz(f, dur=0.35):
    """Karplus-Strong plucked string"""
    m = int(R * dur); p = max(2, int(R / f))
    buf = rng.uniform(-1, 1, p); out = np.zeros(m)
    for i in range(m):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.994
    return flt(out, "low", 3500) * np.exp(-np.arange(m) / R * 6)


def bass(f, dur=0.4):
    m = int(R * dur); tt = np.arange(m) / R
    return (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 7) * np.minimum(tt / 0.004, 1)


def bell(f, dur=0.6, dec=8):
    m = int(R * dur); tt = np.arange(m) / R
    return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt * dec)


def shaker(dur=0.06):
    m = int(R * dur)
    return flt(rng.standard_normal(m), "high", 5000) * np.exp(-np.arange(m) / (0.012 * R))


def noise_hit(dur, band, dec):
    m = int(R * dur)
    return flt(rng.standard_normal(m), "band", band) * np.exp(-np.arange(m) / (dec * R))


m2f = lambda key, s: key * 2 ** (s / 12)
# precompute pizz cache (Karplus-Strong in python is slow)
_pz = {}


def pz(f, dur=0.35):
    k = (round(f, 2), dur)
    if k not in _pz:
        _pz[k] = pizz(f, dur)
    return _pz[k]


def bounce(t0, t1, key, bpm, mel, chords, mel_db=-26, pz_db=-29, bass_db=-22, shk_db=-40, inst="marimba", swing=0.0):
    """a 4/4 bouncy groove: bass on 1 and 3, pizzicato chord stabs on the off-beats, a melody in eighths"""
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
            if q in (0, 2):
                add(bass(m2f(key, root - 12 + (7 if q == 2 else 0))), tq, bass_db, -0.15, True)
            else:
                add(sum(pz(m2f(key, s), 0.3) for s in ch), tq, pz_db, -0.25, True)
            for e in (0, 1):
                te = tq + e * beat * (0.5 + swing)
                if te < t1 and shk_db > -90:
                    add(shaker(), te, shk_db + (0 if e else -5), 0.35, True)
        bar += 1
    i = 0
    while mel:
        te = t0 + i * beat * 0.5 + (beat * swing if i % 2 else 0)
        if te > t1 - 0.15:
            break
        s = mel[i % len(mel)]
        if s is not None:
            x = marimba(m2f(key, s + 12), 0.45) if inst == "marimba" else pz(m2f(key, s + 12), 0.4)
            add(x, te, mel_db, 0.25, True)
        i += 1


# ------------------------------------------------------------------ music
C = 261.63
CH = [(0, [4, 7, 12]), (-3, [0, 4, 9]), (5, [9, 12, 17]), (7, [11, 14, 19])]  # C  Am  F  G (I vi IV V)
MEL = [12, None, 16, 19, 16, None, 12, 14, 9, None, 12, 16, 12, None, 9, 12, 17, None, 16, 14, 12, None, 14, 16, 19, None, 17, 16, 14, None, None, None]
BPM = 118
# A: setup (0 to the plan): bright bouncy groove, softer under the "missing" bits
bounce(0.05, 19.3, C, BPM, MEL, CH, mel_db=-27)
# B: the plan (marker, label, speaker): sneaky staccato tiptoe in A minor, lower and quieter, pizzicato melody
AM = 220.0
CH_B = [(0, [3, 7, 12]), (-4, [0, 3, 8]), (-2, [2, 5, 10]), (-5, [2, 7, 11])]
SNEAK = [0, None, 3, None, 7, None, 3, None, 8, 7, None, 3, 2, None, None, None]
bounce(19.35, 31.9, AM, 104, SNEAK, CH_B, mel_db=-26, pz_db=-31, bass_db=-23, shk_db=-46, inst="pizz")
# C: the bait + ten minutes later: tiptoe continues, then a tiny cymbal-less 'gone' stinger (bells below)
bounce(31.95, 35.4, AM, 104, SNEAK[8:] + SNEAK[:8], CH_B, mel_db=-27, pz_db=-32, bass_db=-24, shk_db=-48, inst="pizz")
# D: night: Dave yelling and searching: sparse, spooky-silly low marimba + held pizz, slower
DM = 146.83
CH_D = [(0, [3, 7]), (1, [4, 8]), (0, [3, 7]), (-1, [2, 6])]
SPOOK = [12, None, None, 13, None, None, 12, None, 10, None, None, None, 12, None, 15, None]
bounce(35.45, 41.7, DM, 90, SPOOK, CH_D, mel_db=-28, pz_db=-34, bass_db=-25, shk_db=-99)
# E: the return + "I think your crickets got loose": the main tune comes back, half-time feel
bounce(41.75, 51.8, C, BPM, MEL[16:] + MEL[:16], CH, mel_db=-28, pz_db=-31, bass_db=-23, shk_db=-44)
# F: "weird. must be a sign." a beat of near-silence then the bright finale to the end
bounce(W("must") + 0.1, 61.4, C * 2 ** (2 / 12), BPM, MEL, CH, mel_db=-26, pz_db=-29, bass_db=-22, shk_db=-40)

# ------------------------------------------------------------------ sound effects
def twinkle(t0, db=-26):
    for i, f in enumerate((2093, 2637, 3136, 4186)):
        add(bell(f, 0.5, 9), t0 + i * 0.045, db, 0.3)


def poof(t0, db=-27):
    m = int(R * 0.45); tt = np.arange(m) / R
    x = flt(rng.standard_normal(m), "band", [300, 2500]) * np.sin(np.pi * np.minimum(tt / 0.45, 1)) ** 0.6 * np.exp(-tt * 5)
    add(norm(x), t0, db, 0.0)
    add(bell(1568, 0.25, 18), t0 + 0.02, db - 6, 0.2)


def steps(t0, t1, every, db=-36, pan=0.0, band=(250, 2500)):
    s = t0
    while s < t1:
        k = rng.standard_normal(int(0.06 * R)) * np.exp(-np.arange(int(0.06 * R)) / (0.008 * R))
        add(norm(flt(k, "band", list(band))), s, db, pan)
        s += every


def chirp(t0, db=-30, pan=0.0, f=4300):
    """a cricket chirp: 3 to 4 fast pulses of a bright tone"""
    for k in range(int(rng.integers(3, 5))):
        m = int(R * 0.022); tt = np.arange(m) / R
        x = np.sin(2 * np.pi * f * tt) * np.sin(np.pi * tt / 0.022) ** 2
        add(x, t0 + k * 0.035, db, pan)


def chirps(t0, t1, db=-30, pan=0.0, every=0.55):
    s = t0
    while s < t1:
        chirp(s, db, pan, 4200 + rng.uniform(-150, 150))
        s += every * rng.uniform(0.8, 1.2)


def room_tone(t0, t1, db=-46, lp=400):
    m = int(R * (t1 - t0)); tt = np.arange(m) / R
    e = np.minimum(tt / 0.3, 1) * np.minimum((t1 - t0 - tt) / 0.3, 1).clip(0, 1)
    add(norm(flt(rng.standard_normal(m), "low", lp)) * e, t0, db, 0)


def birds(t0, t1, db=-40):
    s = t0 + 0.3
    while s < t1 - 0.4:
        m = int(R * 0.18); tt = np.arange(m) / R
        f0 = rng.uniform(2600, 3600)
        x = np.sin(2 * np.pi * (f0 + 900 * np.sin(2 * np.pi * 9 * tt)) * tt) * np.sin(np.pi * tt / 0.18) ** 2
        add(x, s, db, rng.uniform(-0.6, 0.6))
        s += rng.uniform(1.2, 2.4)


def squeak(t0, dur=0.5, db=-34):
    m = int(R * dur); tt = np.arange(m) / R
    x = flt(rng.standard_normal(m), "band", [2500, 6500]) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * tt))) * np.sin(np.pi * tt / dur)
    add(norm(x), t0, db, 0.1)


def knock(t0, db=-22):
    for k in range(3):
        add(norm(mx(noise_hit(0.09, [120, 1400], 0.015), 0.5 * bass(95, 0.09))), t0 + k * 0.16, db, -0.1)


def thud(t0, db=-28):
    add(norm(mx(noise_hit(0.15, [60, 700], 0.03), bass(70, 0.18))), t0, db, 0)


def slide_whistle(t0, f0, f1, dur, db=-30):
    m = int(R * dur); tt = np.arange(m) / R
    f = f0 * (f1 / f0) ** (tt / dur)
    x = np.sin(2 * np.pi * np.cumsum(f) / R) * np.sin(np.pi * tt / dur) ** 0.5
    add(x, t0, db, 0.1)


# 0-2.9 hook: street, birds, Dave's sneaky steps (soft start; ambience eases in)
fin = np.minimum(t[:int(R * 5.6)] / 1.5, 1)
m = int(R * 5.6)
add(norm(flt(rng.standard_normal(m), "low", 900)) * fin, 0, -46, 0)
birds(0.0, 5.6, -42)
steps(0.6, 2.8, 0.3, -40, 0.3)
# missing: a poof per vanished parcel, a tiny twinkle on "cozy cabin", poof on the candle
poof(W("shoes") - 0.05); poof(W("blender") - 0.05)
twinkle(W("cozy") + 0.05, -30)
poof(W("cabin") + 0.35)
# excuse: street birds again, a little 'boing' of innocence on "oh"
birds(12.7, 16.2, -44)
slide_whistle(W("oh") - 0.05, 500, 900, 0.3, -34)
# name: a thud as the giant-letter box lands
thud(W("giant") - 0.1, -28)
# write: marker squeak
room_tone(19.35, 25.3, -48, 500)
squeak(W("wrote") + 0.05, 0.55, -33); squeak(W("live") + 0.05, 0.4, -35); squeak(W("do") + 0.1, 0.45, -35)
# inside: flaps open, then the speaker's crickets, a loop 'blip', a battery charge-up
add(norm(noise_hit(0.25, [400, 3000], 0.06)), 25.4, -32, 0)
chirps(W("cricket") - 0.2, 30.2, -31, 0.0, 0.5)
add(bell(1760, 0.2, 14), W("loop"), -32, 0.2); add(bell(1760, 0.2, 14), W("loop") + 0.25, -34, 0.2)
slide_whistle(W("battery"), 600, 1500, 0.6, -38)
twinkle(30.5, -32)  # Mia's scheming grin
# bait: porch birds, set the box down, the 'ten minutes later' tick, poof
birds(31.95, 35.4, -44)
thud(32.3, -34)
for k in range(4):
    add(bell(2400, 0.08, 40), W("ten") - 0.1 + k * 0.12, -40, 0.3)
poof(W("gone") - 0.02, -25)
# night: crickets everywhere, Dave's yell is a comic 'boing' hop, flashlight click and shuffling
room_tone(35.45, 41.75, -48, 300)
chirps(35.5, 41.7, -33, -0.5, 0.7); chirps(35.8, 41.7, -35, 0.5, 0.8)
for k in range(3):
    slide_whistle(W("yelling") - 0.15 + k * 0.45, 300, 700, 0.25, -36)
add(norm(noise_hit(0.03, [2000, 7000], 0.005)), 38.0, -32, 0.2)  # flashlight click
steps(38.3, 41.5, 0.55, -42, 0.0, (150, 1200))
# return: day, knock knock knock, the stack wobbles
birds(41.75, 48.0, -44)
knock(W("knocked") - 0.05)
# stack: a pop per item
for w in ("shoes", "blender", "candle"):
    add(mx(bell(1200, 0.15, 25), 0.5 * bell(1800, 0.12, 30)), W(w, 1) - 0.02, -30, 0.1)
# tired: a single cricket chirp after "loose"
chirp(W("crickets", 2) + 0.8, -32, 0.6)
# sign: wink twinkle on "sign"
twinkle(W("sign") + 0.1, -26)
# safe: parcels drop (soft thuds) and birds, end: a last lonely chirp at night
birds(54.05, 57.05, -43)
for k in range(4):
    thud(54.5 + k * 0.45, -36)
room_tone(57.05, 61.5, -48, 300)
chirps(57.3, 61.0, -34, 0.6, 0.9)

# ------------------------------------------------------------------ narration + duck
v, vr = sf.read(os.path.join(ROOT, "stories", "reddit-crickets", "voice.wav"))
if v.ndim > 1:
    v = v.mean(1)
v = ss.resample_poly(v, R, vr)[:n]
v = v / (np.max(np.abs(v)) + 1e-9)
envv = np.zeros(n); envv[:len(v)] = np.abs(v)
envv = flt(envv, "low", 4, 1); envv = envv / (envv.max() + 1e-9)
duck = 10 ** (-4 * np.clip(envv * 3, 0, 1) / 20)
add(v, 0.0, -3, 0)
mfin = np.minimum(t / 1.2, 1) ** 1.5
ML *= mfin; MR *= mfin
L += ML * duck; Rr += MR * duck
fo = np.clip((DUR - t) / 0.6, 0, 1)
L *= fo; Rr *= fo
mix = np.stack([L, Rr], 1)
mix = mix / np.max(np.abs(mix)) * 0.89
os.makedirs(os.path.dirname(os.path.abspath(sys.argv[1])), exist_ok=True)
sf.write(sys.argv[1], mix, R, subtype="PCM_24")
print("wrote", sys.argv[1], DUR)
