"""Kaizen Clips sound kit: ambience beds, genre music beds, hits and Foley, and a narrator-first mix. Everything is
synthesised in code (free, no samples, no licences), seeded so the same plan always gives the same sound.

Use from a plan file (what `kz` will call):

    python library/audio/kz_sound.py plan.json

    {"genre": "history", "voice": "narration.wav", "words": "words.json", "out": "mix.m4a",
     "ambience": [{"kind": "village_day", "from": 0, "to": 12}, {"kind": "battlefield", "from": 12}],
     "music": {"from": 0, "gain": 1.0},
     "hits": [{"kind": "cannon", "at": 13.2}, {"kind": "impact", "at": 21.0, "gain": 1.2}],
     "steps": [{"surface": "grass", "from": 2.0, "to": 6.0, "rate": 1.9}]}

Rules learned on earlier Shorts (all built in): the narrator is always on top (beds duck ~7 dB under speech), ambience
stays quiet and varied (never crickets only), wind is soft, horror hits are strong and bypass the soft clip,
loudness ends at -14 LUFS / -1 dBTP like every Short.

Genres: horror, mystery, history, epic, comedy, true. Ambience: forest_night, forest_day, village_day, village_night,
street_1800s, city_modern, interior, tavern, battlefield, shore, lake, desert, rain, storm, field, cave.
Hits: horror_hit, horror_hit_x (extreme), sting, impact, boom, riser, whoosh, cannon, musket, gunshot, thunder,
boing, pop, slide_whistle, ding, crash, door_creak, door_slam, heartbeat, gasp_swell, crowd_gasp, cheer, bell.
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.signal import butter, fftconvolve, sawtooth, sosfilt

SR = 48000


# ------------------------------------------------------------------ primitives
def R(seed):
    return np.random.default_rng(seed)


def n_(sec):
    return int(round(sec * SR))


def tvec(sec):
    return np.arange(n_(sec)) / SR


def _f(kind, f, o=2):
    return butter(o, f, kind, fs=SR, output="sos")


def lp(x, f, o=2): return sosfilt(_f("lowpass", f, o), x)
def hp(x, f, o=2): return sosfilt(_f("highpass", f, o), x)
def bp(x, lo, hi, o=2): return sosfilt(_f("bandpass", [lo, hi], o), x)


def norm(x, peak=1.0):
    return x * (peak / (np.max(np.abs(x)) + 1e-9))


def env(n, a, r):
    """attack / release envelope (seconds) over n samples"""
    e = np.ones(n)
    na, nr = min(n, n_(a)), min(n, n_(r))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def place(buf, x, at, g=1.0):
    i = n_(at)
    if i >= len(buf) or i + len(x) <= 0:
        return buf
    a, b = max(0, -i), min(len(x), len(buf) - i)
    buf[i + a:i + b] += g * x[a:b]
    return buf


def reverb(x, sec=1.8, wet=0.3, seed=7, damp=5000):
    r = R(seed)
    k = tvec(sec)
    ir = r.standard_normal(len(k)) * np.exp(-k * 6.9 / sec)
    ir = lp(ir, damp)
    ir[0] = 0
    y = fftconvolve(x, ir)[:len(x)]
    return (1 - wet) * x + wet * norm(y, np.max(np.abs(x)) + 1e-9)


def tone(f, sec, kind="sine", ph=0.0):
    k = tvec(sec)
    f = np.broadcast_to(f, k.shape) if np.ndim(f) else np.full(k.shape, f)
    p = 2 * np.pi * np.cumsum(f) / SR + ph
    return {"sine": np.sin(p), "saw": sawtooth(p), "square": np.sign(np.sin(p)), "tri": sawtooth(p, 0.5)}[kind]


def slow_lfo(N, rate, seed, depth=1.0):
    """smooth random 0..1 control curve (gusts, crowd swells)"""
    r = R(seed)
    pts = r.uniform(0, 1, int(N / SR * rate) + 3)
    return np.interp(np.arange(N) / SR * rate, np.arange(len(pts)), pts) ** (1 / max(0.2, depth))


# ------------------------------------------------------------------ ambience layers
def breeze(N, seed, level=1.0):
    r = R(seed)
    x = hp(lp(np.cumsum(r.standard_normal(N)) * 0.02, 700), 120)
    return norm(x) * (0.35 + 0.65 * slow_lfo(N, 0.15, seed + 1)) * level


def birds(N, seed, density=0.4):
    r = R(seed)
    out = np.zeros(N)
    t = r.uniform(0.2, 1.5)
    while t < N / SR:
        f0 = r.uniform(2600, 4800)
        for c in range(r.integers(2, 6)):
            d = r.uniform(0.04, 0.11)
            k = tvec(d)
            f = f0 * (1 + r.uniform(-0.25, 0.25) * k / d) + 300 * np.sin(2 * np.pi * r.uniform(20, 40) * k)
            place(out, tone(f, d) * np.sin(np.pi * k / d) ** 2, t + c * r.uniform(0.07, 0.16), r.uniform(0.3, 1))
        t += r.exponential(1.0 / density)
    return reverb(out, 1.2, 0.25, seed)


def crickets(N, seed):
    r = R(seed)
    out = np.zeros(N)
    for v in range(3):
        f = r.uniform(4200, 5200)
        k = np.arange(N) / SR
        g = (np.sin(2 * np.pi * r.uniform(2.5, 4) * k) > 0.3) * (np.sin(2 * np.pi * 30 * k) > 0)
        out += np.sin(2 * np.pi * f * k) * lp(g.astype(float), 300) * r.uniform(0.3, 0.6)
    return out


def owl(N, seed):
    r = R(seed)
    out = np.zeros(N)
    t = r.uniform(3, 7)
    while t < N / SR:
        for j, d in enumerate((0.35, 0.18, 0.5)):
            k = tvec(d)
            place(out, tone(360 - 25 * k / d, d) * np.sin(np.pi * k / d), t + j * 0.42, 0.6)
        t += r.uniform(9, 16)
    return reverb(out, 2.5, 0.5, seed)


def babble(N, seed, people=10):
    """distant crowd chatter: formant-filtered pulses (no words)"""
    r = R(seed)
    out = np.zeros(N)
    for p in range(people):
        f0 = r.uniform(95, 230)
        k = np.arange(N) / SR
        src = sawtooth(2 * np.pi * np.cumsum(f0 * (1 + 0.08 * np.sin(2 * np.pi * r.uniform(2, 5) * k + p))) / SR)
        syl = lp((r.uniform(0, 1, int(N / SR * 4.5) + 2) > 0.35).astype(float), 1)[:]
        gate = np.interp(k * 4.5, np.arange(len(syl)), syl)
        out += (bp(src, 300, 900) + 0.6 * bp(src, 1200, 2600)) * lp(gate, 12) * r.uniform(0.4, 1)
    return lp(norm(out), 2400)


def hooves_cart(N, seed):
    r = R(seed)
    out = np.zeros(N)
    t = r.uniform(1, 4)
    while t < N / SR:
        dur = r.uniform(3, 6)
        g = np.sin(np.pi * np.linspace(0, 1, 40)) * 0.7
        for i in range(40):
            for off in (0, 0.11):
                k = tvec(0.05)
                place(out, bp(r.standard_normal(len(k)), 400, 2500) * np.exp(-k * 90), t + i * dur / 40 + off, g[i] * r.uniform(0.6, 1))
        t += dur + r.uniform(5, 12)
    return out


def waves(N, seed):
    r = R(seed)
    out = np.zeros(N)
    t = 0.0
    while t < N / SR:
        d = r.uniform(3.5, 6)
        k = tvec(d)
        e = np.interp(k, [0, d * 0.45, d * 0.55, d], [0, 1, 0.8, 0]) ** 1.5
        place(out, lp(r.standard_normal(len(k)), 1200 + 800 * r.uniform()) * e, t, r.uniform(0.6, 1))
        t += d * r.uniform(0.55, 0.8)
    return out


def water_laps(N, seed):
    r = R(seed)
    out = np.zeros(N)
    t = 0.3
    while t < N / SR:
        m = n_(r.uniform(0.35, 0.8))
        place(out, bp(r.standard_normal(m), r.uniform(180, 300), r.uniform(600, 1100)) * np.sin(np.linspace(0, np.pi, m)) ** 2, t, r.uniform(0.5, 1))
        t += r.uniform(0.9, 2.2)
    return lp(out, 450)


def rain(N, seed, heavy=0.6):
    r = R(seed)
    hiss = bp(r.standard_normal(N), 900, 9000) * (0.7 + 0.3 * slow_lfo(N, 0.2, seed))
    drops = np.zeros(N)
    for i in r.integers(0, N - 500, int(N / SR * (80 + 300 * heavy))):
        k = np.arange(300) / SR
        drops[i:i + 300] += np.sin(2 * np.pi * r.uniform(2000, 6000) * k) * np.exp(-k * 400) * r.uniform(0.2, 1)
    return norm(norm(hiss) * (0.5 + 0.5 * heavy) + 0.35 * norm(drops))


def fire_crackle(N, seed):
    r = R(seed)
    roar = lp(r.standard_normal(N), 500) * (0.6 + 0.4 * slow_lfo(N, 1.5, seed))
    cr = np.zeros(N)
    for i in r.integers(0, N - 800, int(N / SR * 9)):
        k = np.arange(800) / SR
        cr[i:i + 800] += hp(r.standard_normal(800), 2000) * np.exp(-k * r.uniform(150, 500)) * r.uniform(0.2, 1)
    return norm(0.6 * norm(roar) + 0.5 * norm(cr))


def clock_tick(N, seed, bpm=60):
    out = np.zeros(N)
    k = tvec(0.03)
    tick = bp(R(seed).standard_normal(len(k)), 2500, 6000) * np.exp(-k * 300)
    for i, t in enumerate(np.arange(0.3, N / SR, 60 / bpm)):
        place(out, tick, t, 0.7 if i % 2 else 1.0)
    return reverb(out, 0.6, 0.2)


def room_tone(N, seed):
    return norm(lp(R(seed).standard_normal(N), 250)) * 0.6


def distant_battle(N, seed):
    r = R(seed)
    out = np.zeros(N)
    t = r.uniform(0.5, 2)
    while t < N / SR:
        place(out, HITS["cannon"](seed + int(t * 10)) * 0.5, t, r.uniform(0.2, 0.6))
        t += r.uniform(2.5, 6)
    t = r.uniform(0.2, 1)
    while t < N / SR:
        for j in range(r.integers(1, 6)):
            place(out, HITS["musket"](seed + j) * 0.3, t + j * r.uniform(0.05, 0.3), r.uniform(0.1, 0.35))
        t += r.uniform(1, 3)
    return lp(reverb(out, 2.5, 0.5, seed), 3500)


def traffic(N, seed):
    r = R(seed)
    rumble = lp(r.standard_normal(N), 200) * (0.6 + 0.4 * slow_lfo(N, 0.3, seed))
    out = norm(rumble)
    t = r.uniform(1, 3)
    while t < N / SR:
        d = r.uniform(2.5, 4)
        k = tvec(d)
        place(out, bp(r.standard_normal(len(k)), 150, 1500) * np.sin(np.pi * k / d) ** 2, t, r.uniform(0.3, 0.7))
        t += r.uniform(2, 6)
    return out


def cave_drips(N, seed):
    r = R(seed)
    out = np.zeros(N)
    t = 0.7
    while t < N / SR:
        k = tvec(0.08)
        f0 = r.uniform(700, 1300)
        place(out, np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.5 * k / k[-1])) / SR) * np.exp(-k * 45), t, r.uniform(0.3, 1))
        t += r.uniform(1.5, 4)
    return reverb(out, 3.0, 0.6)


AMBIENCE = {   # each: list of (layer, gain). Keep beds varied; quiet relative to the voice (mix sets the level)
    "forest_night": [(breeze, 0.5), (owl, 0.35), (crickets, 0.08)],
    "forest_day": [(breeze, 0.45), (birds, 0.5)],
    "village_day": [(breeze, 0.3), (birds, 0.35), (babble, 0.18), (hooves_cart, 0.25)],
    "village_night": [(breeze, 0.4), (crickets, 0.07), (owl, 0.25)],
    "street_1800s": [(babble, 0.35), (hooves_cart, 0.45), (breeze, 0.2)],
    "city_modern": [(traffic, 0.5), (babble, 0.2)],
    "interior": [(room_tone, 0.4), (clock_tick, 0.2)],
    "tavern": [(room_tone, 0.3), (babble, 0.45), (fire_crackle, 0.25)],
    "fireside": [(fire_crackle, 0.6), (breeze, 0.2)],
    "battlefield": [(distant_battle, 0.7), (breeze, 0.35)],
    "shore": [(waves, 0.7), (breeze, 0.3)],
    "lake": [(water_laps, 0.7), (breeze, 0.35)],
    "desert": [(breeze, 0.8)],
    "field": [(breeze, 0.5), (birds, 0.3)],
    "rain": [(rain, 0.8), (breeze, 0.25)],
    "storm": [(lambda N, s: rain(N, s, 1.0), 0.8), (lambda N, s: breeze(N, s, 1.4), 0.5)],
    "cave": [(cave_drips, 0.6), (room_tone, 0.3)],
}


def ambience(kind, sec, seed=1):
    N = n_(sec)
    out = np.zeros(N)
    for i, (fn, g) in enumerate(AMBIENCE[kind]):
        out += norm(fn(N, seed + i * 17)) * g
    return norm(out)


# ------------------------------------------------------------------ hits and Foley (each returns a mono clip)
def _impact(seed, f0=60, f1=24, sec=0.9, crack=1.4):
    k = tvec(sec)
    return tone(np.linspace(f0, f1, len(k)), sec) * np.exp(-k / 0.4) * 2.0 + R(seed).standard_normal(len(k)) * np.exp(-k / 0.012) * crack


def _scream(k, f_start, f_end, rough, seed):
    f0 = (f_start + (f_end - f_start) * (1 - np.exp(-k / 0.12))) * (1 + 0.035 * np.sin(2 * np.pi * 6.5 * k))
    src = sawtooth(2 * np.pi * np.cumsum(f0) / SR) + rough * R(seed).standard_normal(len(k))
    x = bp(src, 700, 1000) + 0.8 * bp(src, 1050, 1400) + 0.6 * bp(src, 2600, 3300) + 0.3 * bp(src, 3800, 5200)
    return np.tanh(3 * norm(x))


def horror_hit(seed=1, extreme=False):
    """the jumpscare stab: inhuman scream + metallic shriek + growl + brass/strings + impact (Ahuizotl v4 'X' when extreme)"""
    D = 1.5 if extreme else 0.9
    k = tvec(D)
    growl = bp(np.tanh(5 * sawtooth(2 * np.pi * np.cumsum(90 * np.exp(-k * 0.6) + 35) / SR) * (1 + np.sin(2 * np.pi * 27 * k))), 50, 2000)
    shriek = sum(np.sin(2 * np.pi * f * (1 + 0.25 * k) * k + i) for i, f in enumerate([1870, 2470, 3310, 4120, 5230, 6170])) / 6 * (0.5 + 0.5 * np.sin(2 * np.pi * 31 * k))
    brass = lp(sum(np.tanh(2 * sawtooth(2 * np.pi * f * k)) for f in (73.4, 77.8, 110, 116.5, 155.6)), 1800) * np.exp(-k * 0.9)
    strings = bp(sum(sawtooth(2 * np.pi * f * (1 + 0.006 * np.sin(2 * np.pi * 9 * k + f)) * k) for f in (1244, 1318, 1864, 1976, 2489))
                 + 0.5 * R(seed).standard_normal(len(k)), 1000, 8000) * np.exp(-k * 1.2)
    e = np.interp(k, [0, 0.004, 0.5, 1.2 if extreme else 0.8, D], [0, 1, 0.95, 0.8, 0.0])
    imp = _impact(seed, 62, 22, D, 1.8)
    hit = (_scream(k, 420, 1400, 1.0, seed) + 0.6 * _scream(k, 300, 900, 1.2, seed + 1) + 0.4 * shriek + 0.8 * growl
           + 0.6 * norm(brass) + 0.5 * norm(strings)) * e + 1.4 * imp
    hit = np.tanh((2.6 if extreme else 1.7) * hit / np.sqrt((hit ** 2).mean()))
    if extreme:
        hit *= 0.85 + 0.15 * np.sign(np.sin(2 * np.pi * 14 * k))
    return hit * np.interp(k, [0, D - 0.01, D], [1, 1, 0])


def sting(seed=1):
    """mystery reveal: a bright dissonant cluster swelling and cut, with a low thud"""
    k = tvec(1.6)
    cl = sum(tone(f * (1 + 0.003 * np.sin(2 * np.pi * 5 * k)), 1.6, "saw") for f in (622, 659, 932, 988))
    return norm(bp(cl, 400, 6000) * np.interp(k, [0, 0.05, 0.6, 1.6], [0, 1, 0.5, 0]) + 0.8 * _impact(seed, 70, 35, 1.6, 0.3) * 0.5)


def boom(seed=1):
    """epic / trailer boom: deep sub drop + crack + long tail"""
    k = tvec(2.5)
    return norm(reverb(_impact(seed, 55, 20, 2.5, 1.0) + 0.4 * lp(R(seed).standard_normal(len(k)), 400) * np.exp(-k * 2), 2.5, 0.35, seed))


def riser(seed=1, sec=2.0):
    k = tvec(sec)
    nz = bp(R(seed).standard_normal(len(k)), 300, 8000) * (k / sec) ** 3
    sw = tone(200 + 1600 * (k / sec) ** 2, sec, "saw") * 0.15 * (k / sec) ** 2
    return norm(nz + sw)


def whoosh(seed=1, sec=0.6):
    k = tvec(sec)
    e = np.sin(np.pi * k / sec) ** 2
    return norm(bp(R(seed).standard_normal(len(k)), 300, 3500) * e)


def cannon(seed=1):
    k = tvec(2.2)
    r = R(seed)
    blast = r.standard_normal(len(k)) * np.exp(-k / 0.05) + tone(np.linspace(70, 30, len(k)), 2.2) * np.exp(-k / 0.5) * 1.5
    return norm(reverb(lp(blast, 3000), 2.4, 0.45, seed))


def musket(seed=1):
    k = tvec(0.8)
    return norm(reverb(bp(R(seed).standard_normal(len(k)), 200, 6000) * np.exp(-k / 0.03) + 0.3 * lp(R(seed + 1).standard_normal(len(k)), 300) * np.exp(-k / 0.2), 1.4, 0.35, seed))


def gunshot(seed=1):
    k = tvec(0.6)
    return norm(hp(R(seed).standard_normal(len(k)), 500) * np.exp(-k / 0.012) + 0.6 * tone(np.linspace(180, 60, len(k)), 0.6) * np.exp(-k / 0.06))


def thunder(seed=1):
    r = R(seed)
    k = tvec(4.0)
    crack = hp(r.standard_normal(len(k)), 800) * np.exp(-k / 0.06)
    roll = lp(r.standard_normal(len(k)), 180) * np.interp(k, [0, 0.2, 1.2, 4], [0, 1, 0.6, 0]) * (0.6 + 0.4 * slow_lfo(len(k), 6, seed))
    return norm(0.6 * crack + norm(roll))


def boing(seed=1):
    k = tvec(0.7)
    f = 180 + 220 * np.exp(-k * 6) * (1 + 0.5 * np.sin(2 * np.pi * 14 * k))
    return norm(tone(f, 0.7) * np.exp(-k * 4))


def pop(seed=1):
    k = tvec(0.12)
    return norm(tone(np.linspace(900, 300, len(k)), 0.12) * np.exp(-k * 40))


def slide_whistle(seed=1, up=True, sec=0.7):
    k = tvec(sec)
    f = np.interp(k, [0, sec], [500, 1800] if up else [1800, 500]) * (1 + 0.02 * np.sin(2 * np.pi * 6 * k))
    return norm(tone(f, sec) * env(len(k), 0.03, 0.08))


def ding(seed=1):
    k = tvec(1.5)
    return norm(sum(np.sin(2 * np.pi * f * k) * np.exp(-k * d) * g for f, d, g in ((1568, 3, 1), (3920, 6, 0.4), (6272, 9, 0.2))))


def crash(seed=1):
    """comedy crash: pots/wood/glass tumbling"""
    r = R(seed)
    out = np.zeros(n_(1.4))
    for i in range(14):
        k = tvec(0.25)
        f = r.uniform(300, 3000)
        place(out, (np.sin(2 * np.pi * f * k) * 0.5 + bp(r.standard_normal(len(k)), f * 0.5, min(20000, f * 3))) * np.exp(-k * r.uniform(15, 40)), r.uniform(0, 0.9) ** 1.6, r.uniform(0.3, 1))
    return norm(out)


def door_creak(seed=1, sec=1.4):
    k = tvec(sec)
    rate = 110 + 70 * (k / sec)
    pulses = (np.sin(2 * np.pi * np.cumsum(rate) / SR) > 0.97).astype(float)
    return norm(bp(lp(pulses, 4000) + 0.05 * R(seed).standard_normal(len(k)), 300, 3000) * env(len(k), 0.05, 0.2))


def door_slam(seed=1):
    k = tvec(1.0)
    return norm(reverb(_impact(seed, 110, 50, 1.0, 1.0), 0.9, 0.3, seed))


def heartbeat(seed=1, beats=4, bpm=70):
    out = np.zeros(n_(beats * 60 / bpm + 0.5))
    for b in range(beats):
        for off, g in ((0, 1.0), (0.22, 0.7)):
            k = tvec(0.18)
            place(out, np.sin(2 * np.pi * 48 * k) * np.exp(-k * 22), b * 60 / bpm + off, g)
    return norm(out)


def gasp_swell(seed=1, sec=0.8):
    k = tvec(sec)
    return norm(bp(R(seed).standard_normal(len(k)), 300, 5000) * (k / sec) ** 4)


def crowd_gasp(seed=1):
    k = tvec(1.2)
    b = babble(len(k), seed, 14)
    return norm(hp(b, 300) * np.interp(k, [0, 0.08, 0.5, 1.2], [0, 1, 0.4, 0]))


def cheer(seed=1, sec=2.5):
    k = tvec(sec)
    b = babble(len(k), seed, 20)
    return norm((b + 0.5 * bp(R(seed).standard_normal(len(k)), 800, 4000)) * np.interp(k, [0, 0.2, sec * 0.6, sec], [0, 1, 0.8, 0]))


def bell(seed=1, f=220):
    k = tvec(4)
    return norm(sum(np.sin(2 * np.pi * f * m * k) * np.exp(-k * d) * g for m, d, g in ((1, 0.9, 1), (2.0, 1.5, 0.6), (2.4, 2.2, 0.4), (3.0, 2.8, 0.3), (4.2, 3.5, 0.2))))


HITS = {
    "horror_hit": horror_hit, "horror_hit_x": lambda s=1: horror_hit(s, True), "sting": sting, "impact": lambda s=1: norm(_impact(s)),
    "boom": boom, "riser": riser, "whoosh": whoosh, "cannon": cannon, "musket": musket, "gunshot": gunshot, "thunder": thunder,
    "boing": boing, "pop": pop, "slide_whistle": slide_whistle, "slide_down": lambda s=1: slide_whistle(s, False), "ding": ding,
    "crash": crash, "door_creak": door_creak, "door_slam": door_slam, "heartbeat": heartbeat, "gasp_swell": gasp_swell,
    "crowd_gasp": crowd_gasp, "cheer": cheer, "bell": bell,
}
LOUD_HITS = {"horror_hit", "horror_hit_x"}      # bypass the soft clip: the scare must be stronger than everything


def footstep(surface="grass", seed=1):
    r = R(seed)
    k = tvec(0.16)
    band = {"grass": (300, 3000, 40), "dirt": (150, 2000, 55), "snow": (400, 5000, 25), "wood": (100, 1200, 60),
            "stone": (600, 6000, 90), "gravel": (800, 7000, 30), "mud": (80, 900, 30)}[surface]
    x = bp(r.standard_normal(len(k)), band[0], band[1]) * np.exp(-k * band[2])
    if surface == "wood":
        x += 0.6 * np.sin(2 * np.pi * 140 * k) * np.exp(-k * 40)
    if surface == "snow":
        x *= 0.6 + 0.4 * (r.uniform(0, 1, len(k)) > 0.5)
    return norm(x)


def steps(sec, surface, t0, t1, rate=1.9, seed=1):
    out = np.zeros(n_(sec))
    for i, t in enumerate(np.arange(t0, t1, 1 / rate)):
        place(out, footstep(surface, seed + i), t, 0.7 + 0.3 * (i % 2))
    return out


# ------------------------------------------------------------------ genre music beds
def _pad(freqs, sec, warm=900, det=0.35, seed=1):
    out = np.zeros(n_(sec))
    for f in freqs:
        for d in (-det, 0, det):
            out += tone(f + d, sec, "saw") * 0.3 + tone(f + d, sec) * 0.7
    return lp(out, warm)


def _notes(seq, sec, bpm, voice, gain=1.0, seed=1):
    """seq: list of (beat, midi, beats_len) placed in a bar loop; voice(f, sec) -> clip"""
    out = np.zeros(n_(sec))
    beat = 60 / bpm
    loop = max(b + l for b, _, l in seq)
    t = 0.0
    while t < sec:
        for b, m, l in seq:
            if m is not None:
                place(out, voice(440 * 2 ** ((m - 69) / 12), l * beat), t + b * beat, gain)
        t += loop * beat
    return out


def _pluck(f, d):
    k = tvec(min(d, 0.6) + 0.2)
    return (np.sin(2 * np.pi * f * k) + 0.3 * np.sin(4 * np.pi * f * k)) * np.exp(-k * 9)


def _piano(f, d):
    k = tvec(d + 0.8)
    return sum(np.sin(2 * np.pi * f * m * k) * g for m, g in ((1, 1), (2, 0.4), (3, 0.15))) * np.exp(-k * 2.2) * env(len(k), 0.004, 0.3)


def _timp(f, d):
    k = tvec(1.6)
    return (np.sin(2 * np.pi * f * k) + 0.4 * lp(R(int(f)).standard_normal(len(k)), 300)) * np.exp(-k * 3)


def music(genre, sec, seed=1, intensity=None):
    """a loopable bed per genre. intensity: optional array (0..1 per sample) that builds the music toward key moments"""
    k = np.arange(n_(sec)) / SR
    if genre == "horror":      # creeping low minor/tritone cluster with slow tremolo (Ahuizotl/Hidebehind language)
        x = norm(_pad([55.0, 65.4, 77.8, 110.0], sec, 420)) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.23 * k))
    elif genre == "mystery":   # dark pulse + sparse glassy motif
        x = norm(_pad([73.4, 87.3, 110.0], sec, 600)) * 0.6
        x += 0.35 * norm(_notes([(0, 81, 1), (1.5, 84, 1), (3, 80, 2), (6, None, 2)], sec, 70, lambda f, d: _piano(f, d) * 0.6))
        x = reverb(x, 2.5, 0.4, seed)
    elif genre in ("history", "epic"):   # minor string pad, low pulse, timpani on the bar
        x = norm(_pad([98.0, 116.5, 146.8, 196.0], sec, 1400, 0.5)) * 0.7
        x += 0.45 * norm(_notes([(0, 43, 1), (2, 43, 0.5), (2.5, 43, 0.5)], sec, 84, _timp))
        if genre == "epic":
            x += 0.3 * norm(_notes([(0, 67, 2), (2, 70, 2), (4, 74, 3), (7, 72, 1)], sec, 84, lambda f, d: lp(tone(f, d + 0.3, "saw") * env(n_(d + 0.3), 0.15, 0.3), 2500)))
        x = reverb(x, 2.2, 0.35, seed)
    elif genre == "comedy":    # bouncy pizzicato + oompah bass, major, quick
        x = norm(_notes([(0, 72, 0.5), (0.5, 76, 0.5), (1, 79, 0.5), (1.5, 76, 0.5), (2, 77, 0.5), (2.5, 74, 0.5), (3, 71, 1)], sec, 132, _pluck))
        x += 0.6 * norm(_notes([(0, 48, 0.5), (1, 55, 0.5), (2, 43, 0.5), (3, 55, 0.5)], sec, 132, _pluck))
        x = reverb(x, 0.8, 0.15, seed)
    else:                      # true stories / documentary: soft piano arpeggio over a warm pad
        x = norm(_pad([110.0, 130.8, 164.8], sec, 700)) * 0.4
        x += 0.6 * norm(_notes([(0, 57, 1), (1, 64, 1), (2, 69, 1), (3, 72, 1), (4, 53, 1), (5, 60, 1), (6, 65, 1), (7, 69, 1)], sec, 76, _piano))
        x = reverb(x, 2.0, 0.3, seed)
    x = norm(x)
    if intensity is not None:
        x *= 0.6 + 0.4 * np.clip(intensity, 0, 1)
    return x * env(len(x), 1.5, 1.5)


# ------------------------------------------------------------------ narrator-first mix
def speech_gate(words, N, pre=0.08, post=0.15):
    g = np.zeros(N)
    for w in words:
        a, b = n_(max(0, w["s"] - pre)), n_(w["e"] + post)
        g[a:min(N, b)] = 1
    return np.clip(lp(g, 3), 0, 1)


def mix(voice, beds, sfx, loud, words, duck_db=7.0):
    """voice on top: beds duck under speech, sfx sit between, loud hits bypass the soft clip"""
    N = len(voice)
    g = speech_gate(words, N) if words else np.zeros(N)
    duck = 10 ** (-duck_db * g / 20)
    v = norm(voice, 0.42) if np.any(voice) else voice
    m = v + beds * duck + sfx
    m = np.tanh(m * 1.6) / np.tanh(1.6)
    return m + 1.7 * loud


def read_wav(path):
    import soundfile as sf
    x, sr = sf.read(path, always_2d=True)
    x = x.mean(axis=1)
    if sr != SR:
        from scipy.signal import resample_poly
        x = resample_poly(x, SR, sr)
    return x


def render_plan(plan, base="."):
    P = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
    seed = plan.get("seed", 1)
    voice = read_wav(P(plan["voice"])) if plan.get("voice") else None
    words = []
    if plan.get("words"):
        words = [{"s": w.get("s", w.get("start")), "e": w.get("e", w.get("end"))} for w in json.load(open(P(plan["words"])))]
    sec = plan.get("duration") or ((len(voice) / SR + plan.get("tail", 2.0)) if voice is not None else 30.0)
    N = n_(sec)
    voice = np.pad(voice, (0, max(0, N - len(voice))))[:N] if voice is not None else np.zeros(N)
    G = plan.get("gains", {})
    beds = np.zeros(N)
    for i, a in enumerate(plan.get("ambience", [])):
        t0, t1 = a.get("from", 0), a.get("to", sec)
        x = ambience(a["kind"], t1 - t0 + 1.0, seed + i) * env(n_(t1 - t0 + 1.0), 0.8, 1.0)
        place(beds, x * a.get("gain", 1.0), t0 - 0.5, G.get("ambience", 0.09))
    if plan.get("music") is not False:
        mu = plan.get("music", {}) or {}
        t0, t1 = mu.get("from", 0), mu.get("to", sec)
        place(beds, music(mu.get("genre", plan.get("genre", "true")), t1 - t0, seed) * mu.get("gain", 1.0), t0, G.get("music", 0.08))
    sfx, loud = np.zeros(N), np.zeros(N)
    for i, h in enumerate(plan.get("hits", [])):
        x = HITS[h["kind"]](seed + i)
        if h["kind"] in LOUD_HITS:
            place(loud, x, h["at"], h.get("gain", 1.0))
            if h.get("swell", True):
                place(sfx, gasp_swell(seed + i, 0.5) * 0.35, h["at"] - 0.5)
            if h.get("cut", True):      # silence the beds through the hit, like the approved Shorts
                tc = np.arange(N) / SR - h["at"]
                beds *= np.clip(np.maximum(-tc / 0.05, (tc - h.get("hold", 1.2)) / 1.5), 0, 1)
        else:
            place(sfx, x, h["at"], h.get("gain", 1.0) * G.get("sfx", 0.35))
    for i, s in enumerate(plan.get("steps", [])):
        sfx += steps(sec, s.get("surface", "grass"), s["from"], s["to"], s.get("rate", 1.9), seed + 100 + i) * s.get("gain", 1.0) * G.get("steps", 0.12)
    m = mix(voice, beds, sfx, loud, words, plan.get("duck_db", 7.0))
    m *= env(N, 0.02, plan.get("fade_out", 1.2))
    return m


def write_master(m, out):
    """-14 LUFS integrated, -1 dBTP: the loudness every Short is delivered at"""
    import soundfile as sf
    tmp = out + ".raw.wav"
    sf.write(tmp, m, SR)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", "loudnorm=I=-14:TP=-1.0:LRA=14", "-ar", "48000",
                    *(["-c:a", "aac", "-b:a", "192k"] if out.endswith((".m4a", ".aac", ".mp4")) else []), out], check=True)
    os.remove(tmp)
    print("wrote", out)


# ------------------------------------------------------------------ sound plan straight from a scene.json
# (template hits mirror library/templates/templates.ts TEMPLATES; keep both in step)
TEMPLATE_HITS = {"intro": lambda g: {"comedy": "whoosh", "horror": "riser"}.get(g, "boom"), "chase": lambda g: "whoosh",
                 "discovery": lambda g: "sting", "reveal": lambda g: "sting"}
HIT_AT = {"intro": 0.0, "chase": 0.0, "discovery": 0.55, "reveal": 0.08}     # fraction of the shot


def set_ambience(st):
    name, light, kind = st.get("set"), st.get("light", ""), st.get("kind", "")
    night = light in ("night_moon", "dusk", "storm")
    if light == "storm":
        return "storm"
    return {"forest": "forest_night" if night else "forest_day", "village": "village_night" if night else "village_day",
            "street": "street_1800s", "field": "battlefield" if kind == "battlefield" else "field", "shore": "shore",
            "desert": "desert", "interior": "tavern" if kind == "tavern" else ("fireside" if light == "candle" else "interior")}.get(name, "field")


def scene_plan(scene, voice=None, words=None):
    """a kz_sound plan from a scene spec: ambience per shot (merged while the place stays the same), the genre's music,
    template hits, blows in action shots, footsteps for walking/running actors, and each shot's own sound list"""
    g = scene.get("genre", "true")
    amb, hits, steps = [], [], []
    for sh in scene["shots"]:
        k = sh.get("sound", {}).get("ambience") or set_ambience(sh["set"])
        if amb and amb[-1]["kind"] == k and abs(amb[-1]["to"] - sh["t0"]) < 0.01:
            amb[-1]["to"] = sh["t1"]
        else:
            amb.append({"kind": k, "from": sh["t0"], "to": sh["t1"]})
        tp = sh["template"]
        if tp in TEMPLATE_HITS:
            hits.append({"kind": TEMPLATE_HITS[tp](g), "at": sh["t0"] + HIT_AT[tp] * (sh["t1"] - sh["t0"])})
        for a in sh.get("actors", []):
            for at, name, *_ in a.get("do", []):
                if tp == "action" and name in ("punch", "swing"):
                    hits.append({"kind": "impact", "at": at + 0.18})
                if name == "fall":
                    hits.append({"kind": "door_slam", "at": at + 0.45, "gain": 0.5})
            for go in a.get("go", []):
                fast = go.get("run")
                steps.append({"surface": sh.get("sound", {}).get("steps", "dirt"), "from": go["t0"] + 0.2, "to": go["t1"] - 0.1,
                              "rate": 3.0 if fast else 1.8, "gain": 0.8 if fast else 0.6})
        for h in sh.get("sound", {}).get("hits", []):
            hits.append({"kind": h[0], "at": h[1], **({"gain": h[2]} if len(h) > 2 else {})})
    end = max(s["t1"] for s in scene["shots"])
    return {"genre": g, "duration": end + 1.0, "voice": voice, "words": words, "ambience": amb, "music": {"genre": g},
            "hits": hits, "steps": steps, "gains": {"ambience": 0.14, "music": 0.1} if not voice else {}}


if __name__ == "__main__":
    pf = sys.argv[1]
    plan = json.load(open(pf))
    if "shots" in plan:      # a scene.json: build the plan from it (optional voice/words args), keep a copy next to it
        plan = scene_plan(plan, *(sys.argv[2:4]))
        plan["out"] = "mix.wav"
        json.dump(plan, open(os.path.join(os.path.dirname(os.path.abspath(pf)), "sound.plan.json"), "w"), indent=1)
    write_master(render_plan(plan, os.path.dirname(os.path.abspath(pf))), os.path.join(os.path.dirname(os.path.abspath(pf)), plan.get("out", "mix.wav")))
