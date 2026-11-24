# Full audio for "The Man Who Sold the Eiffel Tower": narration (am_puck) + a code-made score and sound effects, €0.
# The first 11.6 s are the same bed as the approved style test (musette waltz, street, cars, honk, pigeons, twinkle);
# after that the music follows the story: a grander waltz for the pitch, a quick getaway, a sad little waltz for
# Poisson, the cheeky theme again, a swing for Chicago, a low foghorn drone for Alcatraz and the waltz to finish.
# usage: /home/user/venv-tts/bin/python templates/audio/eiffel_audio.py public/eiffel/full_mix.wav
import json
import os
import sys
import numpy as np
import soundfile as sf
import scipy.signal as ss

R = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DUR = 69.5
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
ML, MR = np.zeros(n), np.zeros(n)  # music bus (ducked under the voice later)


def add(x, start, db, pan=0.0, music=False):
    s = int(start * R)
    if s >= n:
        return
    x = x[: max(0, n - s)]
    g = 10 ** (db / 20)
    a, b = (ML, MR) if music else (L, Rr)
    a[s:s + len(x)] += x * g * np.sqrt(0.5 * (1 - pan))
    b[s:s + len(x)] += x * g * np.sqrt(0.5 * (1 + pan))


def reed(f, dur, vel=1.0, cut=2600):
    m = int(R * dur)
    tt = np.arange(m) / R
    x = sum(ss.sawtooth(2 * np.pi * f * d * tt) for d in (1.0, 1.006, 0.995)) / 3
    env = np.minimum(tt / 0.02, 1) * np.minimum((dur - tt) / 0.05, 1).clip(0, 1)
    return flt(x * env * vel * (1 + 0.15 * np.sin(2 * np.pi * 5.5 * tt)), "low", cut)


def pluck_bass(f, dur, decay=6):
    m = int(R * dur)
    tt = np.arange(m) / R
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * decay) + 0.3 * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 9)


def clar(f, dur, vel=1.0):
    """a soft woody 'clarinet': odd harmonics, breathy attack"""
    m = int(R * dur)
    tt = np.arange(m) / R
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * tt) * np.minimum(tt / 0.25, 1)
    ph = 2 * np.pi * f * np.cumsum(vib) / R
    x = np.sin(ph) + 0.35 * np.sin(3 * ph) + 0.15 * np.sin(5 * ph)
    env = np.minimum(tt / 0.04, 1) * np.minimum((dur - tt) / 0.06, 1).clip(0, 1)
    return flt(x * env * vel, "low", 3000)


def bell(f, dur=0.6, dec=8):
    m = int(R * dur)
    tt = np.arange(m) / R
    return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt * dec)


def noise_hit(dur, band, dec):
    m = int(R * dur)
    return flt(rng.standard_normal(m), "band", band) * np.exp(-np.arange(m) / (dec * R))


def mx(*xs):
    """sum sounds of different lengths"""
    out = np.zeros(max(len(x) for x in xs))
    for x in xs:
        out[:len(x)] += x
    return out


# ------------------------------------------------------------------ music
def waltz(t_start, t_end, key, bpm, mel, chords, mel_db=-27, chord_db=-30, bass_db=-20, cut=2600, mel_every=1.5):
    beat = 60 / bpm
    m2f = lambda s: key * 2 ** (s / 12)
    bar = 0
    while True:
        t0 = t_start + bar * 3 * beat
        if t0 > t_end - 0.1:
            break
        root, ch = chords[bar % len(chords)]
        add(pluck_bass(m2f(root - 12), beat * 0.9), t0, bass_db, -0.2, True)
        for b in (1, 2):
            if t0 + b * beat < t_end:
                add(sum(reed(m2f(s), beat * 0.55, 0.6, cut) for s in ch), t0 + b * beat, chord_db, -0.1, True)
        bar += 1
    i = 0
    while mel:
        t0 = t_start + i * mel_every * beat
        if t0 > t_end - 0.15:
            break
        s = mel[i % len(mel)]
        if s is not None:
            add(reed(m2f(s + 12), min(beat * 1.3, t_end - t0), 1.0, cut), t0, mel_db, 0.2, True)
        i += 1


CH_G = [(0, [4, 7, 12]), (-5, [2, 7, 11]), (0, [4, 7, 12]), (2, [5, 9, 14]), (-5, [2, 7, 11]), (0, [4, 7, 12])]
MEL = [12, 14, 16, 19, 16, 14, 12, 11, 12, 14, 11, 7, 9, 11, 12, 16, 14, 12, 11, 9, 7, 11, 14, 12, 16, 19, 21, 19, 16, 12, 14, 16, 14, 11, 12, 12]
S_PITCH = 23.6
# A: the style-test bed, continuing through the letterhead and the invitation
waltz(0.05, S_PITCH, 196.0, 168, MEL, CH_G)
# B: the pitch and the sale, up a tone and a touch grander (extra octave doubling)
waltz(S_PITCH, 34.85, 220.0, 168, MEL[8:] + MEL[:8], CH_G, mel_db=-26)
waltz(S_PITCH, 34.85, 110.0, 168, [None, None, 12, None, None, 7], CH_G, mel_db=-33, chord_db=-60, bass_db=-60, mel_every=1.0)
# C: getaway (station), quick 2/4 oom-pah in G with running eighths
bpm = 200; beat = 60 / bpm
for i in range(int((37.7 - 34.95) / beat)):
    t0 = 34.95 + i * beat
    if i % 2 == 0:
        add(pluck_bass(98 * (1.5 if i % 4 == 2 else 1), beat * 0.8), t0, -20, -0.2, True)
    else:
        add(sum(reed(196 * 2 ** (s / 12), beat * 0.4, 0.6) for s in (4, 7, 12)), t0, -31, -0.1, True)
    run = [0, 2, 4, 7, 9, 7, 4, 2][i % 8] + (5 if i >= 8 else 0)
    add(reed(392 * 2 ** (run / 12), beat * 0.45), t0, -28, 0.2, True)
# D: Poisson's embarrassment, a slow sad waltz in E minor (clarinet)
CH_E = [(0, [3, 7, 12]), (-4, [3, 8, 12]), (-7, [2, 5, 9]), (-5, [2, 7, 11])]
MEL_D = [7, None, 5, 3, None, 2, 0, None, None, 3, None, 2, -1, None, None, 0, None, None]
beat = 60 / 110
for bar in range(int((43.05 - 37.85) / (3 * beat)) + 1):
    t0 = 37.85 + bar * 3 * beat
    if t0 > 42.9:
        break
    root, ch = CH_E[bar % 4]
    add(pluck_bass(164.8 * 2 ** ((root - 12) / 12), beat * 0.9, 4), t0, -22, -0.2, True)
    for b in (1, 2):
        add(sum(reed(164.8 * 2 ** (s / 12), beat * 0.5, 0.5, 1600) for s in ch), t0 + b * beat, -34, -0.1, True)
for i, s in enumerate(MEL_D):
    t0 = 37.85 + i * beat
    if t0 > 42.6:
        break
    if s is not None:
        add(clar(329.6 * 2 ** (s / 12), beat * 1.8), t0, -25, 0.2, True)
# E: back for another go: the cheeky theme again, cut off by the sting on "rat"
RAT = W("rat")
waltz(43.15, RAT - 0.05, 196.0, 176, MEL[18:] + MEL[:18], CH_G)
for i, f in enumerate((233.1, 220.0, 207.7, 155.6)):  # descending 'uh-oh' on a muted reed
    add(reed(f, 0.22 if i < 3 else 0.6, 1.0, 1800), RAT + 0.02 + i * 0.2, -24, 0.0, True)
# F: Chicago, a lazy swing in D minor: walking bass, brushed hi-hat, clarinet riff
S_CHI = 49.62
bpm = 120; beat = 60 / bpm
walk_b = [0, 3, 5, 7, 8, 7, 5, 3, 0, 3, 5, 6, 7, 5, 3, 2]
riff = [(0, 12, 0.6), (0.66, 15, 0.3), (1, 17, 0.9), (2, 15, 0.5), (2.66, 12, 0.3), (3, 10, 0.9)]
nb = int((57.7 - S_CHI) / beat)
for i in range(nb):
    t0 = S_CHI + i * beat
    add(pluck_bass(73.4 * 2 ** (walk_b[i % 16] / 12), beat * 0.95, 3), t0, -18, -0.2, True)
    hh = noise_hit(0.08, [5000, 11000], 0.02)
    add(hh, t0, -40, 0.3, True)
    add(noise_hit(0.05, [6000, 12000], 0.01), t0 + beat * 0.66, -44, 0.3, True)
for bar in range(nb // 4):
    for off, s, d in riff:
        add(clar(293.7 * 2 ** (s / 12) / 2, d * beat), S_CHI + bar * 4 * beat + off * beat, -26 if bar % 2 == 0 else -28, 0.25, True)
# G: Alcatraz: low drone + foghorns, waves; then a lonely clarinet in the cell
for f in (55.0, 82.4):
    m = int(R * (65.2 - 57.75))
    tt = np.arange(m) / R
    drone = flt(ss.sawtooth(2 * np.pi * f * tt) + ss.sawtooth(2 * np.pi * f * 1.004 * tt), "low", 300)
    add(drone * np.minimum(tt / 1.0, 1) * np.minimum((65.2 - 57.75 - tt) / 0.6, 1).clip(0, 1), 57.75, -34, 0.0, True)
for i, s in enumerate([7, 5, 3, 2, 3, None, 0]):
    if s is not None:
        add(clar(220.0 * 2 ** (s / 12), 0.7), 61.2 + i * 0.55, -29, 0.2, True)
# H: finale, the waltz once more (up a tone), ending on a held chord
waltz(65.25, 68.3, 196.0, 168, [12, 16, 19, 24, 19, 16, 12, 12], CH_G, mel_db=-25)
for s in (0, 4, 7, 12, 16):
    add(reed(196 * 2 ** (s / 12), 1.15, 0.8), 68.25, -29, 0.0, True)
add(pluck_bass(98, 1.2, 2), 68.25, -19, 0, True)

# ------------------------------------------------------------------ sound effects
# A: street ambience under shot 1, footsteps, two cars, honk, pigeons, twinkle (as in the style test)
bab = flt(rng.standard_normal(int(R * 11.6)), "band", [250, 1800]) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 0.7 * t[:int(R * 11.6)] + np.sin(3.1 * t[:int(R * 11.6)]))))
fade = np.minimum((11.6 - t[:int(R * 11.6)]) / 0.4, 1)
fin = np.minimum(t[:int(R * 11.6)] / 1.5, 1)  # ambience eases in
add(norm(bab) * fade * fin, 0, -42, 0.0)
add(norm(flt(rng.standard_normal(int(R * 11.6)), "low", 400)) * fade * fin, 0, -42, -0.3)
stop = W("small") - 0.27
step = 0.0
while step < stop:
    k = rng.standard_normal(int(0.06 * R)) * np.exp(-np.arange(int(0.06 * R)) / (0.008 * R))
    add(norm(flt(k, "band", [300, 2500])), step + 0.2, -38, 0.1)
    step += 0.48
for t0, t1, p0, p1 in ((0.0, 5.3, -0.6, -0.2), (4.0, 11.6, 0.6, 0.1)):
    m = int(R * (t1 - t0))
    tt = np.arange(m) / R
    eng = (np.sign(np.sin(2 * np.pi * 14 * tt)) * 0.5 + 0.5) * flt(rng.standard_normal(m), "low", 500)
    rum = flt(rng.standard_normal(m), "band", [60, 300])
    env = np.sin(np.pi * tt / (t1 - t0)) ** 0.8
    add(norm(flt(0.4 * eng + rum, "low", 260)) * env, t0, -42, (p0 + p1) / 2)  # soft distant traffic
m = int(R * 0.55)
tt = np.arange(m) / R
f = 330 + 120 * np.sin(np.pi * tt / 0.55)
honk = np.sign(np.sin(2 * np.pi * np.cumsum(f) / R)) * np.sin(np.pi * tt / 0.55) ** 0.5
# (honk removed after review: too startling at the start)


def coo(t0, pan=0.5, db=-34):
    m = int(R * 0.7)
    tt = np.arange(m) / R
    c = np.sin(2 * np.pi * (380 + 60 * np.sin(2 * np.pi * 3 * tt)) * tt) * np.sin(np.pi * tt / 0.7) ** 2
    add(norm(flt(c, "low", 900)), t0, db, pan)


def twinkle(t0, db=-24):
    for i, f in enumerate((2093, 2637, 3136, 4186)):
        add(bell(f, 0.5, 9), t0 + i * 0.045, db, 0.3)


def room_tone(t0, t1, db=-44, lp=300):
    m = int(R * (t1 - t0))
    tt = np.arange(m) / R
    env = np.minimum(tt / 0.15, 1) * np.minimum((t1 - t0 - tt) / 0.15, 1).clip(0, 1)
    add(norm(flt(rng.standard_normal(m), "low", lp)) * env, t0, db, 0)


def paper(t0, dur=0.35, db=-30):
    m = int(R * dur)
    x = flt(rng.standard_normal(m), "band", [1500, 7000]) * (np.abs(np.sin(np.arange(m) / R * 70)) ** 2) * np.sin(np.pi * np.arange(m) / m)
    add(norm(x), t0, db, 0.1)


def stamp(t0, db=-20):
    add(norm(noise_hit(0.12, [80, 900], 0.02)) + 0.6 * pluck_bass(70, 0.12, 30)[:int(R * 0.12)], t0, db, 0)


def steps(t0, t1, every, db=-31, pan=0.0, band=(300, 3500)):
    s = t0
    while s < t1:
        k = rng.standard_normal(int(0.06 * R)) * np.exp(-np.arange(int(0.06 * R)) / (0.008 * R))
        add(norm(flt(k, "band", list(band))), s, db, pan)
        s += every


coo(1.4, 0.5, -40); coo(6.2)
twinkle(W("smile") + 0.1)
# room: city murmur through the window, newspaper rustles, stamping the letterhead
room_tone(11.6, 17.55, -44, 500)
paper(11.75); paper(13.95, 0.25, -33)
for k in range(3):
    stamp(15.55 + k * 0.62)
paper(17.1, 0.3, -32)
# salon: murmur of the room, the dealers' steps on marble, a clock tick, a 'hush' on "top secret"
room_tone(17.55, 34.85, -42, 900)
steps(19.7, 22.9, 0.5, -33, -0.3, (500, 5000))
steps(19.9, 22.9, 0.55, -34, 0.3, (500, 5000))
add(norm(flt(rng.standard_normal(int(R * 0.6)), "band", [2500, 9000])) * np.sin(np.pi * np.arange(int(R * 0.6)) / (R * 0.6)), W("top") + 0.05, -34, 0)
# tearing down: a creak and a far rumble; thousands of tons: a heavy clang
m = int(R * 0.9); tt = np.arange(m) / R
add(np.sin(2 * np.pi * (140 - 50 * tt) * tt) * np.exp(-tt * 2) * 0.6 + 0.5 * norm(flt(rng.standard_normal(m), "low", 200)) * np.exp(-tt * 3), W("tearing") + 0.1, -26, 0)
add(mx(bell(98, 1.2, 3), 0.5 * bell(147, 1.0, 4)), W("tons") - 0.05, -24, 0)
# one lucky bidder: a gavel knock
stamp(W("bidder") + 0.25, -22)
# bit: a reel whizz for "hook, line"
m = int(R * 0.5); tt = np.arange(m) / R
add(np.sign(np.sin(2 * np.pi * np.cumsum(900 + 600 * tt / 0.5) / R)) * np.sin(np.pi * tt / 0.5) * 0.4, W("hook") - 0.1, -32, 0.2)
add(bell(1568, 0.4, 10), W("line"), -28, 0.2)
add(bell(1175, 0.5, 8), W("tower", 3) + 0.1, -28, 0.2)
# cash in hand: a register ding and a riffle of notes
add(mx(bell(2349, 0.8, 5), bell(3136, 0.6, 6)), W("cash") + 0.05, -26, 0.2)
paper(W("hand"), 0.3, -32)
# station: steam hiss, chuffs, a whistle, quick steps
room_tone(34.85, 37.75, -40, 1200)
for k in range(9):
    add(norm(noise_hit(0.18, [400, 5000], 0.05)), 34.95 + k * 0.31, -33, -0.3)
m = int(R * 0.9); tt = np.arange(m) / R
wh = sum(np.sin(2 * np.pi * f * tt) for f in (587, 740, 880)) * np.minimum(tt / 0.05, 1) * np.minimum((0.9 - tt) / 0.15, 1).clip(0, 1)
add(wh * 0.5, 36.6, -30, 0.3)
steps(35.05, 37.4, 0.24, -31, 0.0)
# police: night street, rain drip, slow steps, the door he never opens, a sad trombone-ish slide
room_tone(37.75, 43.05, -40, 700)
steps(37.95, 39.3, 0.5, -32, -0.1)
steps(41.4, 42.9, 0.5, -33, 0.1)
for k in range(14):
    add(bell(3000 + 900 * rng.random(), 0.15, 30), 37.9 + rng.random() * 5, -42, rng.random() - 0.5)
# again: salon murmur, sniff sniff, a squeak on "rat"
room_tone(43.05, 47.75, -42, 900)
for k in range(2):
    add(norm(flt(rng.standard_normal(int(R * 0.12)), "band", [1200, 6000])) * np.hanning(int(R * 0.12)), W("smelled") - 0.3 + k * 0.2, -32, 0.2)
m = int(R * 0.25); tt = np.arange(m) / R
add(np.sin(2 * np.pi * (2600 + 900 * np.sin(2 * np.pi * 9 * tt)) * tt) * np.sin(np.pi * tt / 0.25), RAT + 0.05, -30, 0.3)
# liner: gulls, water, the big horn, quick steps on wood
room_tone(47.75, 49.62, -38, 600)
coo(47.9, -0.4, -36)
m = int(R * 1.3); tt = np.arange(m) / R
horn = flt(ss.sawtooth(2 * np.pi * 73 * tt) + ss.sawtooth(2 * np.pi * 110 * tt), "low", 500) * np.minimum(tt / 0.1, 1) * np.minimum((1.3 - tt) / 0.3, 1).clip(0, 1)
add(horn, W("america") - 0.2, -22, 0.0)
steps(47.85, 49.3, 0.26, -32, 0.0, (250, 2500))
# Chicago: register on "$5,000", a crank and printing clacks, notes fluttering
room_tone(49.62, 57.7, -44, 500)
add(mx(bell(2349, 0.8, 5), bell(3136, 0.6, 6)), 50.6, -26, 0.2)
for k in range(10):
    add(norm(noise_hit(0.04, [1500, 6000], 0.01)), 53.0 + k * 0.17, -32, 0.1)
for k in range(10):
    paper(55.5 + k * 0.22, 0.2, -36)
twinkle(W("real") + 0.05, -28)
# Alcatraz: waves, foghorns, a gull; the cell door slam on "Alcatraz"
m = int(R * (61.1 - 57.75)); tt = np.arange(m) / R
add(norm(flt(rng.standard_normal(m), "low", 500)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * tt)) * np.minimum(tt / 0.4, 1), 57.75, -32, 0)
for t0 in (57.9, 60.3):
    m = int(R * 1.4); tt = np.arange(m) / R
    fh = flt(ss.sawtooth(2 * np.pi * 65 * tt), "low", 260) * np.minimum(tt / 0.2, 1) * np.minimum((1.4 - tt) / 0.4, 1).clip(0, 1)
    add(fh, t0, -24, 0)
add(mx(norm(noise_hit(0.5, [60, 2500], 0.12)), 0.8 * bell(180, 0.6, 7), 0.5 * bell(271, 0.5, 8)), W("alcatraz") + 0.45, -18, 0)
room_tone(61.1, 65.2, -40, 300)
for k in range(5):
    add(bell(2600, 0.12, 30), 61.4 + k * 0.85, -44, -0.3)
# finale: birds, a soft breeze, a last twinkle on the tower
room_tone(65.2, 69.5, -42, 1500)
coo(65.6, 0.4, -35)
twinkle(W("sale") + 0.25, -26)

# ------------------------------------------------------------------ narration + duck
v, vr = sf.read(os.path.join(ROOT, "stories", "eiffel-sale", "voice.wav"))
if v.ndim > 1:
    v = v.mean(1)
v = ss.resample_poly(v, R, vr)[:n]
v = v / (np.max(np.abs(v)) + 1e-9)
# gentle side-chain duck of the music bus while the narrator speaks (narration stays on top)
envv = np.zeros(n)
envv[:len(v)] = np.abs(v)
envv = flt(envv, "low", 4, 1)
envv = envv / (envv.max() + 1e-9)
duck = 10 ** (-4 * np.clip(envv * 3, 0, 1) / 20)
add(v, 0.0, -3, 0)
mfin = np.minimum(t / 1.2, 1) ** 1.5  # the score eases in, no hard start
ML *= mfin; MR *= mfin
L += ML * duck
Rr += MR * duck
# fade out the last 0.6 s
fo = np.clip((DUR - t) / 0.6, 0, 1)
L *= fo; Rr *= fo
mix = np.stack([L, Rr], 1)
mix = mix / np.max(np.abs(mix)) * 0.89
sf.write(sys.argv[1], mix, R, subtype="PCM_24")
print("wrote", sys.argv[1], DUR)
