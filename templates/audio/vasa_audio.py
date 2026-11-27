# Soundtrack for "The Vasa, 1628": original music and sound effects, all synthesized here with our own DSP kit
# (dsp.py, instruments.py, sfx_gen.py: numpy + scipy, no samples, no licences), mixed under the approved narration.
# The cue times come from the narration's real word timings (stories/vasa/words.json) and the shot list (vstory.ts).
# Usage: python vasa_audio.py <voice.wav> <out_dir>   -> out_dir/{music,sfx,mix}.wav (48 kHz stereo, 24-bit)
import os
import sys
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, lp, hp, bp, colored, smooth_noise
import instruments as I
import sfx_gen as G

DUR = 75.0
N = ns(DUR)
F = I.m2f
R = rng(1628)

# chord tones (midi) for the pads and accompaniments
CH = {"D": [50, 57, 62, 66], "G": [43, 55, 59, 62], "A": [45, 57, 61, 64], "Bm": [47, 54, 59, 62], "Dm": [50, 57, 62, 65],
      "Gm": [43, 55, 58, 62], "A7": [45, 55, 61, 64], "Bb": [46, 53, 58, 62], "F": [41, 53, 57, 60], "Em": [40, 52, 55, 59]}


def note(buf, inst, t, m, dur, vel=0.7, p=0.0, **kw):
    if inst == "horn":
        x = I.brass(F(m), dur, vel, R, "horn", **kw)
    elif inst == "tuba":
        x = I.brass(F(m), dur, vel, R, "tuba", **kw)
    elif inst == "soft":
        x = I.brass(F(m), dur, vel, R, "soft", **kw)
    elif inst == "stab":
        x = I.brass(F(m), dur, vel, R, "stab", **kw)
    elif inst == "glock":
        x = I.glock(F(m), vel, R)
    elif inst == "box":
        x = I.musicbox(F(m), vel, R)
    elif inst == "pluck":
        x = I.pluck(F(m), vel, R, dur=max(0.3, dur))
    elif inst == "fife":
        x = I.fife(F(m), dur, vel, R)
    else:
        raise ValueError(inst)
    place(buf, pan(x, p), t)


def padc(buf, t, chord, dur, vel=0.35, warm=900, att=0.6, rel=0.9):
    place(buf, I.pad([F(m) for m in CH[chord]], dur, vel, R, att=att, rel=rel, warm=warm), t)


def snare(buf, t, vel=0.6, p=0.1):
    place(buf, pan(I.snare(vel, R), p), t)


def timp(buf, t, m, vel=0.7):
    place(buf, pan(I.timpani(F(m), vel, R), -0.2), t)


def cym(buf, t, vel=0.6):
    place(buf, pan(I.cymbal(vel, R), 0.3), t)


# ---------------------------------------------------------------- music
def music():
    m = np.zeros((2, N))
    # 0 - 5.25: majestic fanfare in D: horns over timpani, the mightiest warship in the world
    for k in range(10):
        timp(m, 0.05 + k * 0.12, 38, 0.25 + k * 0.03)
    fan = [(0.3, 62, 0.45), (0.75, 66, 0.25), (1.0, 69, 0.9), (2.0, 67, 0.3), (2.3, 66, 0.3), (2.6, 67, 0.3), (2.9, 69, 0.4), (3.3, 74, 1.6)]
    for t, n_, d in fan:
        note(m, "horn", t, n_, d, 0.75, -0.15); note(m, "horn", t, n_ - 12, d, 0.5, 0.2)
    for t, c in [(0.3, "D"), (2.0, "G"), (2.9, "A"), (3.3, "D")]:
        padc(m, t, c, 1.0 if t < 3 else 1.8, 0.4)
    cym(m, 3.3, 0.55); timp(m, 3.3, 38, 0.9)
    # 5.25: hard stop (record scratch is an sfx); 5.9 - 8.2: sad trombone "wah wah wah wahhh"
    for i, (t, n_, d) in enumerate([(5.95, 57, 0.4), (6.45, 56, 0.4), (6.95, 55, 0.4), (7.45, 54, 0.85)]):
        note(m, "soft", t, n_ - 12, d, 0.6, 0.0, fall=(-1.2 if i == 3 else 0.0))
    # 8.35 - 22.0: bouncy pizzicato + glockenspiel (main character energy, the test)
    Q = 0.5
    bass = [50, 57, 55, 57, 47, 54, 52, 54, 43, 50, 45, 52]
    mel = [(0, 74), (1, 76), (1.5, 78), (2, 81), (3, 78), (4, 76), (5, 74), (5.5, 76), (6, 78), (7, 74), (8, 79), (9, 78), (10, 76), (11, 73)]
    t0 = 8.4
    for bar in range(7):
        for k in range(12):
            t = t0 + bar * 6 + k * Q
            if t > 21.95:
                break
            note(m, "pluck", t, bass[k], 0.35, 0.55, -0.25)
            if k % 2 == 1:
                note(m, "pluck", t + 0.25, bass[k] + 12, 0.2, 0.3, 0.3)
        for b, n_ in mel:
            t = t0 + bar * 6 + b * Q
            if t < 21.95 and (bar > 0 or b >= 4):
                note(m, "glock", t, n_ + (0 if bar % 2 == 0 else -2), 0.3, 0.33, 0.35)
    # the sprint: snare on every step 15.5 - 21.9, getting louder
    t = 15.5
    while t < 21.9:
        snare(m, t, 0.18 + 0.25 * (t - 15.5) / 6.4); t += 0.25
    # the admiral stops it: stab + dead air
    note(m, "stab", 21.95, 62, 0.25, 0.8); note(m, "stab", 21.95, 50, 0.25, 0.7)
    # 24.0 "his big move?": a lonely tuba bwomp; 25.4 dreamy music box; 27.2 deadpan tuba fall
    note(m, "tuba", 24.05, 38, 0.5, 0.7, 0.0)
    for k, n_ in enumerate([74, 78, 81, 86, 81, 78, 74, 78, 81]):
        note(m, "box", 25.4 + k * 0.2, n_, 0.3, 0.32, 0.2)
    padc(m, 25.35, "D", 1.8, 0.18, warm=1400)
    note(m, "tuba", 27.25, 41, 0.9, 0.6, 0.0, fall=-3.0)
    # 28.8 - 34.1: proud march for the departure, cymbal on "full aura"
    march = [(0, 69, 1), (1, 74, 1), (2, 74, .5), (2.5, 76, .5), (3, 78, 1), (4, 76, .5), (4.5, 74, .5), (5, 76, 1), (6, 69, 1), (7, 71, .5),
             (7.5, 73, .5), (8, 74, 2)]
    tm = 28.85
    for b, n_, d in march:
        note(m, "horn", tm + b * 0.5, n_, d * 0.5, 0.65, -0.1); note(m, "horn", tm + b * 0.5, n_ - 5, d * 0.5, 0.4, 0.15)
    for k in range(20):
        tb = tm + k * 0.5
        note(m, "tuba", tb, [38, 45][k % 2], 0.3, 0.55)
        snare(m, tb + 0.25, 0.25)
    for t, c in [(tm, "D"), (tm + 1.5, "G"), (tm + 3.0, "A"), (tm + 4.0, "D")]:
        padc(m, t, c, 1.5, 0.25)
    cym(m, 33.25, 0.6)
    for k in range(6):
        note(m, "glock", 33.25 + k * 0.09, [86, 90, 93, 98, 93, 98][k], 0.2, 0.3, 0.4)
    # 34.1 - 44.8: the gusts: low pad, timpani heartbeat speeding up, stabs, snare roll as the sea pours in
    padc(m, 34.1, "Dm", 4.4, 0.32, warm=600)
    padc(m, 38.7, "Gm", 2.0, 0.36, warm=700)
    padc(m, 40.6, "A7", 4.2, 0.42, warm=900)
    t, gap = 34.2, 0.9
    while t < 44.6:
        timp(m, t, 38 if t < 40.6 else 40, 0.45 + 0.4 * (t - 34.2) / 10.4); t += gap; gap = max(0.28, gap * 0.93)
    note(m, "stab", 38.85, 50, 0.4, 0.9); note(m, "stab", 38.85, 57, 0.4, 0.8); note(m, "stab", 38.85, 62, 0.4, 0.8)
    t = 40.6
    while t < 44.7:
        snare(m, t, 0.08 + 0.4 * (t - 40.6) / 4.1, 0.05); t += 1 / 18
    cym(m, 44.75, 0.45)
    # 44.8 - 50.4: sombre: a soft pad and a slow music-box line, then almost nothing
    padc(m, 44.85, "Dm", 2.8, 0.26, warm=500, att=1.0)
    padc(m, 47.7, "Bb", 2.6, 0.2, warm=450, att=1.2, rel=1.6)
    for k, n_ in enumerate([69, 65, 62, 64, 65]):
        note(m, "box", 45.2 + k * 0.55, n_, 0.6, 0.24, -0.2)
    # 50.4 - 56.1: the diagram: toy-box bounce; "cooked": slide whistle down (sfx) + bonk
    for k in range(int((53.8 - 50.5) / 0.4)):
        t = 50.5 + k * 0.4
        note(m, "pluck", t, [50, 57, 54, 57][k % 4], 0.3, 0.45, -0.2)
        note(m, "box", t + 0.2, [81, 78, 74, 78][k % 4], 0.3, 0.25, 0.3)
    # 56.1 - 60.5: the inquiry: sneaky pizzicato and tuba, stop on "No cap", rimshot after it
    for k in range(int((58.75 - 56.2) / 0.3)):
        t = 56.2 + k * 0.3
        note(m, "pluck", t, [45, 52, 50, 52, 48, 52][k % 6], 0.25, 0.5, -0.2)
        if k % 2 == 0:
            note(m, "tuba", t, [33, 40][(k // 2) % 2], 0.2, 0.4)
    snare(m, 59.55, 0.7, 0.2); cym(m, 59.6, 0.4); note(m, "tuba", 59.55, 38, 0.15, 0.5)
    # 60.5 - 63.8: under the water: airy pad, slow glock drops
    padc(m, 60.5, "Em", 3.4, 0.22, warm=700, att=1.0)
    for k, n_ in enumerate([83, 79, 76, 79, 83, 86]):
        note(m, "glock", 60.8 + k * 0.5, n_, 0.4, 0.16, [-0.5, 0.5][k % 2])
    # 63.8 - 66.2: lifted out: rising brass swell
    for k, (c, t) in enumerate([("G", 63.85), ("A", 64.9)]):
        padc(m, t, c, 1.2, 0.3 + 0.1 * k, warm=1300)
    for n_ in [55, 62, 67]:
        note(m, "horn", 63.9, n_, 1.0, 0.35); note(m, "horn", 64.95, n_ + 2, 1.15, 0.5)
    timp(m, 66.15, 38, 0.8)
    # 66.2 - 75: the legend: warm theme reprise, big chord on "legend", gentle end
    rep = [(0, 74, 1), (1, 78, .5), (1.5, 81, .5), (2, 86, 1.5), (4, 83, .5), (4.5, 81, .5), (5, 78, 1), (6, 81, 2)]
    for b, n_, d in rep:
        note(m, "horn", 66.3 + b * 0.55, n_ - 12, d * 0.55, 0.55, -0.1); note(m, "glock", 66.3 + b * 0.55, n_, 0.3, 0.3, 0.3)
    for t, c in [(66.3, "D"), (67.95, "G"), (69.05, "A"), (70.1, "Bm"), (71.2, "G"), (72.4, "D")]:
        padc(m, t, c, 1.2 if t < 72 else 2.4, 0.3, warm=1100)
    note(m, "tuba", 70.05, 38, 0.4, 0.5, fall=-1.5)  # "fumbled"
    for n_ in [62, 66, 69, 74]:
        note(m, "horn", 72.45, n_, 1.9, 0.6, 0.0)
    cym(m, 72.4, 0.6); timp(m, 72.4, 38, 0.9)
    for k in range(8):
        note(m, "glock", 72.45 + k * 0.07, [86, 90, 93, 98][k % 4], 0.2, 0.28, 0.4)
    return m


# ---------------------------------------------------------------- sound effects
def tone(f0, f1, dur, vel=0.5, shape_="sine"):
    t = np.arange(ns(dur)) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) if shape_ == "sine" else np.sign(np.sin(ph)) * 0.4
    return fades(y * vel, 0.01, 0.06)


def scratch(r):
    """record scratch: a quick back-and-forth noise sweep"""
    n = ns(0.45); t = np.arange(n) / SR
    y = bp(colored(n, r, 1.0), 400, 4500, 1) * (np.sin(np.pi * t / 0.45) ** 0.6)
    y *= 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 9 * t))
    return fades(y * 0.35, 0.002, 0.05)


def knock(r, f=180, vel=0.5):
    n = ns(0.14); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.025) + bp(r.standard_normal(n), 600, 2500, 1) * np.exp(-t / 0.008) * 0.4
    return y * vel


def bosun_whistle(r):
    n = ns(0.7); t = np.arange(n) / SR
    f = 2100 + 260 * np.sin(2 * np.pi * 15 * t) + 300 * (t > 0.35)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + 0.03 * hp(r.standard_normal(n), 3000)
    return fades(y, 0.02, 0.08)


def bonk(r):
    n = ns(0.35); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * (520 * np.exp(-t * 3)) * t) * np.exp(-t / 0.09) + 0.4 * np.sin(2 * np.pi * 1100 * t) * np.exp(-t / 0.03)
    return y * 0.5


def shing(r):
    y = np.zeros(ns(1.6))
    for k, f in enumerate([2637, 3136, 3951, 5274]):
        g = I.glock(f / 2, 0.5, r, dur=1.2)
        i = ns(k * 0.04); y[i:i + len(g)] += g[: len(y) - i]
    return y * 0.5


def rumble(r, dur, lo=40, hi=160):
    n = ns(dur)
    return lp(hp(colored(n, r, 1.5), lo), hi) * 0.4


def sfx():
    s = np.zeros((2, N))
    r = rng(1961)
    # harbour bed: lapping water + breeze in every harbour shot (not under water, not inside)
    for a, b, lvl in [(0, 34.1, 0.32), (34.1, 44.8, 0.55), (44.8, 50.4, 0.42), (63.8, 66.2, 0.5)]:
        place(s, fades(G.water_bed(b - a, r, close=0.6), 0.15, 0.15), a, lvl)
        place(s, fades(G.breeze(b - a, r, level=0.6 if lvl < 0.5 else 1.2), 0.2, 0.2), a, 0.5)
    for a in [0.5, 2.8, 17.0, 20.0, 31.0]:
        place(s, pan(G.creak(0.9, r, 90, 140), -0.3), a, 0.25)
    place(s, G.flag_flutter(5.0, r), 0.0, 0.25)
    place(s, G.flag_flutter(5.3, r), 28.8, 0.35)
    # 5.3 record scratch, then glugging bubbles around the masts
    place(s, pan(scratch(r), 0), 5.27, 0.9)
    place(s, pan(G.bubbles(2.6, r, 7), 0.1), 5.7, 0.5)
    # 9.0 - 11.3 gunports thunk open stern to bow, guns roll out
    for k in range(12):
        place(s, pan(knock(r, 150 + k * 6, 0.45), -0.6 + k * 0.1), 9.0 + k * 0.19)
        place(s, pan(rumble(r, 0.4, 50, 220), -0.6 + k * 0.1), 9.35 + k * 0.19, 0.35)
    place(s, pan(shing(r), 0.2), 12.12, 0.8)
    # the stability test: running feet, the ship creaking harder, crew whoops, the admiral's whistle
    t = 15.5
    while t < 21.9:
        if t % 1.9 < 1.25:
            for _ in range(3):
                place(s, pan(G.stroll_step(r, 0.2), r.uniform(-0.6, 0.6)), t + r.uniform(0, 0.08), 0.35)
        t += 0.13
    for k, a in enumerate([16.6, 18.5, 20.4, 22.2]):
        place(s, pan(G.creak(1.2, r, 70, 110), -0.2), a, 0.35 + 0.15 * k)
    for a in [19.9, 20.4, 21.2]:
        place(s, pan(G.whoa(r), r.uniform(-0.5, 0.5)), a, 0.25)
    place(s, pan(bosun_whistle(r), -0.3), 21.92, 0.8)
    # 27.3: crickets for the deadpan
    place(s, fades(G.crickets(1.5, r), 0.1, 0.4), 27.3, 0.35)
    # departure cheers from the quay
    for k in range(10):
        place(s, pan(G.hurrah(r, r.uniform(110, 190), r.uniform(0.9, 1.15)), r.uniform(-0.8, 0.8)), 29.0 + k * 0.35 + r.uniform(0, 0.2), 0.12)
    place(s, fades(G.applause(4.0, r, people=24), 0.3, 1.0), 29.0, 0.12)
    place(s, pan(shing(r), 0.3), 33.25, 0.6)
    # gusts: whooshes, groaning timbers, the crew's shouts, water pouring in
    place(s, G.whoosh(2.0, r, peak=0.25, f_lo=250, f_hi=1600), 34.4, 0.9)
    place(s, pan(G.creak(1.6, r, 60, 95), -0.2), 35.0, 0.6)
    place(s, G.whoosh(2.6, r, peak=0.2, f_lo=200, f_hi=1400), 38.8, 1.1)
    place(s, pan(G.creak(2.2, r, 50, 80), 0.2), 39.5, 0.75)
    for a in [39.9, 40.3, 41.0]:
        place(s, pan(G.whoa(r), r.uniform(-0.6, 0.6)), a, 0.3)
    place(s, fades(G.water_bed(4.4, r, close=1.6, slosh_rate=1.6), 0.2, 0.3), 40.5, 0.9)
    for a in [40.9, 42.0, 43.1]:
        place(s, G.splash_big(r), a, 0.35)
    # sinking: deep rumble, big bubbles, then quiet water
    place(s, fades(rumble(r, 4.5, 30, 120), 0.4, 1.2), 44.9, 0.9)
    place(s, pan(G.bubbles(4.0, r, 10, 150, 900), 0), 46.0, 0.6)
    # the diagram: slide whistle down + bonk on "cooked"
    place(s, pan(tone(1600, 300, 0.8, 0.35), 0), 53.85, 1.0)
    place(s, pan(bonk(r), 0), 54.6, 0.9)
    # the inquiry: grumbling officials
    for k in range(6):
        place(s, pan(G.babble(2.3, r, r.uniform(100, 140), r.uniform(0.9, 1.1)), -0.7 + k * 0.28), 56.4 + k * 0.05, 0.16)
    # under the water: muffled rumble + bubbles
    place(s, fades(lp(rumble(r, 3.3, 25, 300), 400), 0.3, 0.4), 60.5, 0.8)
    place(s, pan(G.bubbles(3.2, r, 5, 250, 1200), 0.2), 60.6, 0.45)
    # raised: water cascading, cable creaks
    place(s, fades(G.water_bed(2.4, r, close=1.8, slosh_rate=2.0), 0.2, 0.3), 63.8, 0.9)
    place(s, pan(G.creak(1.4, r, 40, 70), 0.3), 64.2, 0.4)
    # museum: soft room tone and a murmur of visitors
    for k in range(4):
        place(s, pan(G.babble(8.6, r, r.uniform(110, 200), r.uniform(0.9, 1.15)), -0.6 + k * 0.4), 66.3, 0.05)
    return s


def limit(x, ceil):
    from scipy.ndimage import maximum_filter1d
    la = ns(0.005)
    pk = maximum_filter1d(np.abs(x).max(axis=0), size=2 * la + 1)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    rel = 1 - np.exp(-1 / (0.12 * SR))
    sm = g.copy()
    for i in range(1, len(sm)):
        sm[i] = g[i] if g[i] < sm[i - 1] else sm[i - 1] + rel * (g[i] - sm[i - 1])
    return x * sm[None, :]


def mix(voice_path, out):
    os.makedirs(out, exist_ok=True)
    v, sr = read_wav(voice_path)
    v = v[0] if v.ndim > 1 else v
    voice = np.zeros(N); voice[: min(N, len(v))] = v[: min(N, len(v))]
    mus, fx = music(), sfx()
    # light shared room on the music and the effects (not on the voice)
    ir = make_ir(1.1, 7, hf=1.6)
    mus = mus + 0.16 * convolve_st(mus, ir)
    fx = fx + 0.10 * convolve_st(fx, ir)
    # duck the music while the narrator speaks (envelope from the voice itself, 80 ms attack / 300 ms release)
    env = np.abs(voice)
    k = ns(0.05)
    env = np.convolve(env, np.ones(k) / k, "same")
    talk = np.clip(env / (np.percentile(env[env > 1e-4], 60) + 1e-9), 0, 1)
    sm = np.zeros_like(talk); a, rls = 1 - np.exp(-1 / (0.08 * SR)), 1 - np.exp(-1 / (0.3 * SR))
    for i in range(1, len(talk)):
        c = a if talk[i] > sm[i - 1] else rls
        sm[i] = sm[i - 1] + c * (talk[i] - sm[i - 1])
    duck = dbg(-7.0 * sm)
    # levels: voice on top, music bed about 14 LU under, effects about 12 LU under
    vs = pan(voice, 0) / np.sqrt(2)
    gv = dbg(-16 - integrated(vs))
    gm = dbg(-29 - integrated(mus))
    gf = dbg(-26 - integrated(fx))
    out_mix = vs * gv + mus * gm * duck[None, :] + fx * gf
    # loudness for Shorts: -14 LUFS integrated, true peak under -1 dBTP (look-ahead peak limiter, 5 ms / 120 ms)
    out_mix *= dbg(-14 - integrated(out_mix))
    out_mix = limit(out_mix, dbg(-1.5))
    out_mix *= dbg(-14 - integrated(out_mix))
    out_mix = limit(out_mix, dbg(-1.3))
    tp = true_peak(out_mix)
    if tp > -1.0:
        out_mix *= dbg(-1.0 - tp)
    out_mix = fades(out_mix, 0.0, 0.8)
    write_wav(os.path.join(out, "music.wav"), mus * gm)
    write_wav(os.path.join(out, "sfx.wav"), fx * gf)
    write_wav(os.path.join(out, "mix.wav"), out_mix)
    print("mix", round(integrated(out_mix), 2), "LUFS, TP", round(true_peak(out_mix), 2), "dBTP, voice LUFS", round(integrated(vs * gv), 1))


if __name__ == "__main__":
    mix(sys.argv[1], sys.argv[2])
