# Audio for the Paris style test (first 11.6 s): narration (am_puck) + a code-made bed: a bouncy musette waltz on a
# reedy "accordion" (detuned saw pair), street ambience (distant chatter, footsteps, cobble rumble of two old cars,
# a bulb-horn honk), pigeons, and a twinkle on the smile. All generated here, €0.
# usage: /home/user/venv-tts/bin/python tools/blender/paris_audio.py out/blender/paris/mix.wav
import json
import os
import sys
import numpy as np
import soundfile as sf
import scipy.signal as ss

R = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DUR = 11.6
n = int(R * DUR)
rng = np.random.default_rng(1925)
t = np.arange(n) / R
words = json.load(open(os.path.join(ROOT, "stories", "eiffel-sale", "words_vis.json")))["words"]
W = lambda w, i=0: [x for x in words if x["w"].strip(".,?!").lower() == w][i]["s"]


def flt(x, kind, f, o=2):
    return ss.sosfilt(ss.butter(o, f, kind, fs=R, output="sos"), x)


def norm(x):
    return x / (np.sqrt(np.mean(x ** 2)) + 1e-9)


L, Rr = np.zeros(n), np.zeros(n)


def add(x, start, db, pan=0.0):
    s = int(start * R)
    x = x[: max(0, n - s)]
    g = 10 ** (db / 20)
    L[s:s + len(x)] += x * g * np.sqrt(0.5 * (1 - pan))
    Rr[s:s + len(x)] += x * g * np.sqrt(0.5 * (1 + pan))


def reed(f, dur, vel=1.0):
    m = int(R * dur)
    tt = np.arange(m) / R
    x = sum(ss.sawtooth(2 * np.pi * f * d * tt) for d in (1.0, 1.006, 0.995)) / 3
    env = np.minimum(tt / 0.02, 1) * np.minimum((dur - tt) / 0.05, 1).clip(0, 1)
    return flt(x * env * vel * (1 + 0.15 * np.sin(2 * np.pi * 5.5 * tt)), "low", 2600)


def pluck_bass(f, dur):
    m = int(R * dur)
    tt = np.arange(m) / R
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 6) + 0.3 * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 9)


# musette waltz in G at 168 bpm (3/4): oom-pah-pah bass/chords + a cheeky melody
bpm = 168
beat = 60 / bpm
G = 196.0
m2f = lambda s: G * 2 ** (s / 12)
chords = [(0, [4, 7, 12]), (-5, [2, 7, 11]), (0, [4, 7, 12]), (2, [5, 9, 14]), (-5, [2, 7, 11]), (0, [4, 7, 12])] * 3
mel = [12, 14, 16, 19, 16, 14, 12, 11, 12, 14, 11, 7, 9, 11, 12, 16, 14, 12, 11, 9, 7, 11, 14, 12, 16, 19, 21, 19, 16, 12, 14, 16, 14, 11, 12, 12]
for bar, (root, ch) in enumerate(chords):
    t0 = 0.05 + bar * 3 * beat
    if t0 > DUR:
        break
    add(pluck_bass(m2f(root - 12), beat * 0.9), t0, -20, -0.2)
    for b in (1, 2):
        add(sum(reed(m2f(s), beat * 0.55, 0.6) for s in ch), t0 + b * beat, -30, -0.1)
for i, s in enumerate(mel):
    t0 = 0.05 + i * 1.5 * beat
    if t0 > DUR:
        break
    add(reed(m2f(s + 12), beat * 1.3), t0, -27, 0.2)
# street ambience: distant chatter (filtered babble), wind, footsteps of Lustig until he stops
bab = flt(rng.standard_normal(n), "band", [250, 1800]) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 0.7 * t + np.sin(3.1 * t))))
add(norm(bab), 0, -38, 0.0)
add(norm(flt(rng.standard_normal(n), "low", 400)), 0, -36, -0.3)
stop = W("small") - 0.27
step = 0.0
while step < stop:
    k = rng.standard_normal(int(0.06 * R)) * np.exp(-np.arange(int(0.06 * R)) / (0.008 * R))
    add(norm(flt(k, "band", [300, 3500])), step + 0.2, -30, 0.1)
    step += 0.48
# two cars: a putter-putter engine + cobble rumble, panning by
for t0, t1, p0, p1 in ((0.0, 5.3, -0.6, -0.2), (4.0, 11.6, 0.6, 0.1)):
    m = int(R * (t1 - t0))
    tt = np.arange(m) / R
    eng = (np.sign(np.sin(2 * np.pi * 14 * tt)) * 0.5 + 0.5) * flt(rng.standard_normal(m), "low", 500)
    rum = flt(rng.standard_normal(m), "band", [60, 300])
    env = np.sin(np.pi * tt / (t1 - t0)) ** 0.8
    x = norm(eng + 0.6 * rum) * env
    add(x, t0, -26, (p0 + p1) / 2)
# bulb horn "ah-oo-gah"-ish honk (original synth) when the first car passes
m = int(R * 0.55)
tt = np.arange(m) / R
f = 330 + 120 * np.sin(np.pi * tt / 0.55)
honk = np.sign(np.sin(2 * np.pi * np.cumsum(f) / R)) * np.sin(np.pi * tt / 0.55) ** 0.5
add(norm(flt(honk, "band", [300, 2500])), 1.0, -24, -0.4)
# pigeons cooing
for t0 in (0.6, 6.2):
    m = int(R * 0.7)
    tt = np.arange(m) / R
    coo = np.sin(2 * np.pi * (380 + 60 * np.sin(2 * np.pi * 3 * tt)) * tt) * np.sin(np.pi * tt / 0.7) ** 2
    add(norm(flt(coo, "low", 900)), t0, -34, 0.5)
# twinkle on the smile
ts_ = W("smile") + 0.1
for i, f in enumerate((2093, 2637, 3136, 4186)):
    m = int(R * 0.5)
    tt = np.arange(m) / R
    add(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9), ts_ + i * 0.045, -24, 0.3)
# narration on top
v, vr = sf.read(os.path.join(ROOT, "stories", "eiffel-sale", "voice.wav"))
v = ss.resample_poly(v, R, vr)[:n]
v = v / (np.max(np.abs(v)) + 1e-9)
add(v, 0.0, -3, 0)
mix = np.stack([L, Rr], 1)
mix = mix / np.max(np.abs(mix)) * 0.89
sf.write(sys.argv[1], mix, R, subtype="PCM_24")
print("wrote", sys.argv[1])
