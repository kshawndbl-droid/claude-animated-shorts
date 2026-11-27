# Audio for the 10 s talking test: the character's line + an original ambience/music bed made in code
# (wind, sea swell, brazier crackle, gulls, a soft plucked-lyre motif, and a gull fly-by sting). All generated here, €0.
# usage: /home/user/venv-tts/bin/python tools/blender/talk_audio.py out/blender/talk/l2.wav 1.0 8.6 out/blender/talk/mix3.wav
import sys
import numpy as np
import soundfile as sf
import scipy.signal as ss

R, DUR = 48000, 10.0
voice_path, t0, t_hiss, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
n = int(R * DUR)
rng = np.random.default_rng(5)
t = np.arange(n) / R


def bp(x, lo, hi, o=2):
    return ss.sosfilt(ss.butter(o, [lo, hi], "band", fs=R, output="sos"), x)


def lp(x, f, o=2):
    return ss.sosfilt(ss.butter(o, f, "low", fs=R, output="sos"), x)


def hp(x, f, o=2):
    return ss.sosfilt(ss.butter(o, f, "high", fs=R, output="sos"), x)


def db(d):
    return 10 ** (d / 20)


def norm(x):
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-9)


L = np.zeros(n)
Rr = np.zeros(n)


def add(x, start, gain_db, pan=0.0):
    s = int(start * R)
    x = x[: max(0, n - s)]
    g = db(gain_db)
    L[s:s + len(x)] += x * g * np.sqrt(0.5 * (1 - pan))
    Rr[s:s + len(x)] += x * g * np.sqrt(0.5 * (1 + pan))


# wind: two decorrelated gusty noise beds
for pan, seed in ((-0.6, 1), (0.6, 2)):
    w = lp(np.random.default_rng(seed).standard_normal(n), 500)
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * (0.13 + seed * 0.04) * t + seed) * np.sin(2 * np.pi * 0.31 * t + seed * 2)
    add(norm(w) * gust, 0, -30, pan)
# sea swell from the left (the sea is on the left of the frame)
sea = bp(np.cumsum(rng.standard_normal(n)) * 0.02 + rng.standard_normal(n) * 0.3, 90, 1400)
swell = 0.35 + 0.65 * np.clip(np.sin(2 * np.pi * t / 4.3 - 1.0), 0, 1) ** 1.5
add(norm(sea) * swell, 0, -27, -0.7)
# brazier crackle behind him
cr = np.zeros(n)
for k in rng.choice(n - 400, 260, replace=False):
    m = int(rng.integers(30, 260))
    cr[k:k + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (m / 4)) * rng.uniform(0.2, 1)
add(norm(bp(cr, 900, 6000)) + 0.2 * norm(lp(rng.standard_normal(n), 300)), 0, -36, 0.15)


# gulls: gliding cries far away
def gull(dur=0.5):
    m = int(R * dur)
    tt = np.arange(m) / R
    f = 1500 - 650 * (tt / dur) + 120 * np.sin(2 * np.pi * 9 * tt)
    ph = 2 * np.pi * np.cumsum(f) / R
    x = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)
    env = np.sin(np.pi * tt / dur) ** 0.6
    return bp(x * env, 700, 5000)


for when, p in ((0.35, -0.5), (0.85, -0.45), (4.7, 0.4), (7.3, -0.3)):
    add(norm(gull(0.42 + 0.1 * rng.random())), when, -31, p)


# music: a soft plucked lyre (Karplus-Strong), playful little motif in D dorian, under the line
def pluck(f, dur=1.6):
    m = int(R * dur)
    N_ = int(R / f)
    buf = rng.uniform(-1, 1, N_)
    y = np.zeros(m)
    for i in range(m):
        y[i] = buf[i % N_]
        buf[i % N_] = 0.5 * (buf[i % N_] + buf[(i + 1) % N_]) * 0.996
    return lp(y, 3500)


D = 146.83
notes = [(0.0, 0), (0.25, 7), (0.5, 12), (1.0, 10), (1.25, 7), (2.0, 5), (2.25, 3), (2.5, 7), (3.0, 0), (3.5, 2),
         (4.0, 3), (4.25, 5), (4.5, 7), (5.0, 12), (5.25, 14), (5.5, 15), (6.0, 12)]
cache = {}
for beat, semi in notes:
    f = D * 2 ** (semi / 12)
    if semi not in cache:
        cache[semi] = pluck(f)
    add(norm(cache[semi]) * 0.5, 0.15 + beat * 1.12, -27, 0.25 if semi > 6 else -0.2)
# the sting: a gull screeches right past his head (loud, close, panning left to right) + wing flutter
m = int(R * 0.55)
tt = np.arange(m) / R
f = 2100 - 1300 * (tt / 0.55) ** 0.7 + 260 * np.sin(2 * np.pi * 14 * tt)
ph = 2 * np.pi * np.cumsum(f) / R
sq = (np.sin(ph) + 0.7 * np.sin(2 * ph) + 0.4 * np.sin(3 * ph)) * np.sin(np.pi * tt / 0.55) ** 0.4
sq = np.tanh(2.2 * sq) + 0.15 * hp(rng.standard_normal(m), 2500)
add(norm(bp(sq, 600, 7000)), t_hiss - 0.12, -13, -0.3)
fl = np.zeros(int(R * 0.7))
for k in range(9):
    s0 = int(k * 0.07 * R)
    seg = rng.standard_normal(int(0.05 * R)) * np.hanning(int(0.05 * R))
    fl[s0:s0 + len(seg)] += seg
add(norm(bp(fl, 150, 2500)), t_hiss - 0.25, -19, 0.4)
# a comic downward lyre slide after the fright
for i, semi in enumerate((7, 5, 3, 0, -5)):
    add(norm(pluck(D * 2 ** (semi / 12), 1.2)) * 0.5, t_hiss + 0.35 + i * 0.09, -25, 0)
# voice: centred, a touch of room, clearly on top
v, vr = sf.read(voice_path)
if v.ndim > 1:
    v = v.mean(1)
v = ss.resample_poly(v, R, vr)
room = np.convolve(v, np.r_[1, np.zeros(int(R * 0.03)), 0.18, np.zeros(int(R * 0.05)), 0.09])[: len(v)]
v = room / (np.max(np.abs(room)) + 1e-9)
add(v, t0, -4, 0)
# duck the bed under the voice a little
mix = np.stack([L, Rr], 1)
peak = np.max(np.abs(mix))
mix = mix / peak * 0.89
sf.write(out, mix, R, subtype="PCM_24")
print("wrote", out, mix.shape)
