# "The Pig War, 1859": original music + sound effects generated in code (free, nothing sampled), cut to the
# narration's real line/word timings, then mixed with the narration (-14 LUFS, true peak under -1 dBTP).
# Its own musical identity: a frontier banjo hoedown, a Yankee fife-and-drum, British brass, a 6/8 sea shanty.
# usage: python pigwar_audio.py <voice.wav> <story_dir> <outdir>
import json
import math
import os
import sys
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, lp, hp, bp
import instruments as I
import sfx_gen as G
from vasa_audio import limit, tone, bonk, shing, knock

F = I.m2f
R = rng(1859)
STORY = sys.argv[2] if len(sys.argv) > 2 else "../../stories/pig-war"
LINES = json.load(open(os.path.join(STORY, "lines.json")))
WORDS = json.load(open(os.path.join(STORY, "words.json")))
DUR = math.ceil((LINES[-1]["end"] + 1.6) * 30) / 30
N = ns(DUR)
LEAD = 0.25
S = [0.0] + [l["start"] - LEAD for l in LINES[1:]] + [DUR]


def norm(w):
    return "".join(c for c in w.lower() if c.isalnum())


def wt(li, word, n=0):
    ws = [w for w in WORDS if w["line"] == li and norm(w["w"]) == norm(word)]
    return ws[n]["s"] if len(ws) > n else LINES[li]["start"]


CH = {"D": [50, 57, 62, 66], "A7": [45, 57, 61, 67], "G": [43, 55, 59, 62], "Bm": [47, 54, 59, 62], "E7": [52, 56, 59, 62], "A": [45, 57, 61, 64],
      "Dm": [50, 57, 62, 65], "Gm": [43, 55, 58, 62], "Bb": [46, 53, 58, 62], "Em": [40, 52, 55, 59], "C": [48, 55, 60, 64], "Fm": [41, 53, 56, 60]}


def note(buf, inst, t, m, dur, vel=0.7, p=0.0):
    if inst in ("horn", "tuba", "soft", "stab"):
        x = I.brass(F(m), dur, vel, R, inst)
    elif inst == "glock":
        x = I.glock(F(m), vel, R)
    elif inst == "harp":     # harpsichord-ish: very bright, short pluck
        x = I.pluck(F(m), vel, R, dur=max(0.3, dur), bright=0.85, pos=0.08)
    elif inst == "pizz":
        x = I.pluck(F(m), vel, R, dur=0.25, bright=0.35)
    elif inst == "fife":
        x = I.fife(F(m), dur, vel, R)
    elif inst == "box":
        x = I.musicbox(F(m), vel, R)
    else:
        raise ValueError(inst)
    place(buf, pan(x, p), t)


def padc(buf, t, chord, dur, vel=0.3, warm=900):
    if dur > 0.1:
        place(buf, I.pad([F(m) for m in CH[chord]], dur, vel, R, att=0.4, rel=0.8, warm=warm), t)


def minuet(buf, a, b, bpm=138, key=0, prog=("D", "A7", "D", "G", "D", "A7", "D", "D"), mel=True, vel=1.0):
    """a courtly 3/4 minuet: harpsichord bass + chords, fife tune"""
    beat = 60 / bpm
    tune = [74, 76, 78, 76, 74, 73, 71, 73, 74, 69, 71, 73, 74, 78, 81, 78, 76, 74, 73, 71, 69, 73, 74, 74]
    t, k = a, 0
    while t < b - 0.05:
        ch = CH[prog[(k // 3) % len(prog)]]
        if k % 3 == 0:
            note(buf, "harp", t, ch[0] - 12 + key, beat * 1.5, 0.6 * vel, -0.25)
        else:
            note(buf, "harp", t, ch[2] + key, beat * 0.6, 0.35 * vel, 0.25); note(buf, "harp", t, ch[3] + key, beat * 0.6, 0.3 * vel, 0.3)
        if mel:
            note(buf, "fife", t, tune[k % len(tune)] + key, beat * 0.9, 0.36 * vel, 0.05)
        t += beat; k += 1


def galop(buf, a, b, bpm=168, key=0, prog=("D", "A7", "D", "A7", "G", "D", "A7", "D"), vel=1.0, mel=True):
    """a fast 2/4 chase galop: oom-pah, snare, fife running eighths"""
    beat = 60 / bpm
    run = [74, 73, 74, 76, 78, 76, 78, 81, 79, 78, 76, 74, 73, 71, 73, 69]
    t, k = a, 0
    while t < b - 0.05:
        ch = CH[prog[(k // 4) % len(prog)]]
        if k % 2 == 0:
            note(buf, "tuba", t, ch[0] - 12 + key, beat * 0.6, 0.7 * vel, -0.2)
        else:
            note(buf, "harp", t, ch[2] + key, beat * 0.4, 0.45 * vel, 0.3); note(buf, "harp", t, ch[3] + key, beat * 0.4, 0.4 * vel, 0.3)
        place(buf, pan(I.snare((0.35 if k % 2 else 0.18) * vel, R), 0.15), t)
        if mel:
            note(buf, "fife", t, run[k % 16] + key, beat * 0.45, 0.33 * vel, 0.05)
            note(buf, "fife", t + beat / 2, run[(k * 2 + 1) % 16] + key, beat * 0.45, 0.28 * vel, 0.05)
        t += beat; k += 1


def sneaky(buf, a, b, step=0.3, vel=0.55, line=(62, 65, 67, 68, 69, 68, 67, 65)):
    t, k = a, 0
    while t < b - 0.05:
        note(buf, "pizz", t, line[k % len(line)], 0.2, vel, -0.3 + 0.6 * (k % 2)); t += step; k += 1


def hoedown(buf, a, b, bpm=150, key=0, prog=("G", "C", "G", "D7"), vel=1.0, mel=True):
    """frontier hoedown: banjo-ish rolls (bright pluck), bass on the beat, whistle tune"""
    beat = 60 / bpm
    tune = [67, 69, 71, 74, 76, 74, 71, 69, 67, 71, 74, 79, 76, 74, 72, 71]
    t, k = a, 0
    while t < b - 0.05:
        ch = CH2[prog[(k // 4) % len(prog)]]
        note(buf, "pizz", t, ch[0] - 12 + key, beat * 0.5, 0.55 * vel, -0.2)
        for j, m in enumerate([ch[1], ch[2], ch[3], ch[2]]):
            note(buf, "harp", t + j * beat / 4, m + key + 12, beat * 0.3, 0.22 * vel, 0.3 - 0.15 * j)
        if mel and k % 1 == 0:
            note(buf, "fife", t, tune[k % 16] + key, beat * 0.8, 0.3 * vel, 0.05)
        t += beat; k += 1


def fifedrum(buf, a, b, bpm=116, key=0, vel=1.0):
    """Yankee fife and drum march"""
    beat = 60 / bpm
    tune = [67, 67, 69, 71, 67, 71, 69, 62, 67, 67, 69, 71, 67, 67, 66, 62]
    t, k = a, 0
    while t < b - 0.05:
        note(buf, "fife", t, tune[k % 16] + key + 12, beat * 0.85, 0.32 * vel, 0.1)
        place(buf, pan(I.snare((0.4 if k % 2 == 0 else 0.22) * vel, R), -0.1), t)
        place(buf, pan(I.snare(0.15 * vel, R), -0.1), t + beat / 2)
        if k % 2 == 0:
            place(buf, pan(I.timpani(F(43 + key), 0.35 * vel, R), 0), t)
        t += beat; k += 1


def brassband(buf, a, b, bpm=96, key=0, vel=1.0):
    """pompous British brass: horn chords on a slow march"""
    beat = 60 / bpm
    prog = ["D", "A7", "D", "G", "D", "A7", "D", "D"]
    t, k = a, 0
    while t < b - 0.05:
        ch = CH[prog[(k // 2) % 8]]
        note(buf, "tuba", t, ch[0] - 12 + key, beat * 0.8, 0.6 * vel, -0.1)
        if k % 2 == 1:
            for m in ch[1:]:
                note(buf, "horn", t, m + key, beat * 0.7, 0.3 * vel, 0.2)
        t += beat; k += 1


def shanty(buf, a, b, bpm=120, key=0, vel=1.0):
    """a 6/8 sea shanty feel on concertina (pad) and whistle"""
    beat = 60 / bpm / 1.5
    tune = [62, 66, 69, 69, 71, 69, 66, 62, 64, 66, 64, 62, 61, 64, 69, 69, 71, 73, 74, 73, 71, 69, 66, 64]
    t, k = a, 0
    prog = ["Bm", "A", "Bm", "E7"]
    while t < b - 0.05:
        if k % 6 == 0:
            padc(buf, t, prog[(k // 6) % 4], beat * 6, 0.22 * vel, 1100)
            note(buf, "tuba", t, CH[prog[(k // 6) % 4]][0] - 12 + key, beat * 2, 0.45 * vel)
        note(buf, "fife", t, tune[k % 24] + key, beat * 0.9, 0.27 * vel, 0.05)
        t += beat; k += 1


CH2 = {"G": [43, 55, 59, 62], "C": [48, 55, 60, 64], "D7": [50, 57, 60, 66], "D": [50, 57, 62, 66], "Em": [40, 52, 55, 59], "Am": [45, 57, 60, 64]}


def music():
    m = np.zeros((2, N))
    # 1 hook: a tense standoff drum... then a silly oink-sting on "pig" and the hoedown kicks in
    pg, war = wt(0, "pig"), wt(0, "war")
    for k in range(int((pg - 0.4) / 0.5) + 1):
        place(m, pan(I.timpani(F(38), 0.4 + k * 0.03, R), 0), 0.3 + k * 0.5)
    padc(m, 0.3, "Bm", pg - 0.5, 0.25, 700)
    note(m, "stab", pg, 55, 0.2, 0.7); note(m, "stab", pg + 0.18, 50, 0.4, 0.7)
    hoedown(m, pg + 0.6, S[1], 150, 0, vel=0.6, mel=False)
    # 2 the map: hoedown proper; British horn / American fife on each flag
    hoedown(m, S[1], S[2], 150, 0, vel=0.8)
    # 3 the garden: lazy banjo, record-scratch stop on "potatoes"
    po = wt(2, "potatoes")
    hoedown(m, S[2], po, 120, 0, ("G", "G", "C", "G"), vel=0.7, mel=True)
    note(m, "soft", po + 0.05, 43, 0.6, 0.6)
    # 4 "He shot it.": silence, then one low timpani
    place(m, pan(I.timpani(F(36), 0.6, R), 0), wt(3, "shot") + 0.6)
    # 5 problem: a pompous-but-sad British funeral march for the pig
    brassband(m, S[4], S[5], 80, -2, vel=0.7)
    # 6 arrest + call the army: tension pad -> bugle call
    so, ca = wt(5, "so"), wt(5, "called")
    padc(m, S[5], "Bm", so - S[5], 0.3, 700)
    for k, (mm, d) in enumerate([(67, 0.18), (67, 0.18), (72, 0.18), (76, 0.5), (72, 0.25), (76, 0.8)]):
        note(m, "horn", ca + 0.1 + sum(x[1] for x in [(67, 0.18), (67, 0.18), (72, 0.18), (76, 0.5), (72, 0.25), (76, 0.8)][:k]), mm, d, 0.55)
    # 7 Pickett lands: Yankee fife and drum
    fifedrum(m, S[6], S[7], 120, 0)
    # 8 warships: the shanty arrives with British brass
    ws = wt(7, "warships")
    shanty(m, S[7], S[8], 120, 0, 0.8)
    for k, mm in enumerate([62, 66, 69, 74]):
        note(m, "horn", ws + k * 0.09, mm, 0.12 if k < 3 else 0.7, 0.6)
    # 9 the build-up: alternating fife-drum (Americans) and brass (British), getting bigger
    fv = wt(8, "five")
    fifedrum(m, S[8], fv - 0.2, 126, 0, vel=0.8)
    brassband(m, fv - 0.2, S[9], 110, 0, vel=0.9)
    for tt, vv in I.snare_roll(0, 1.2, 0.15, 0.7, R):
        place(m, pan(I.snare(vv, R, dur=0.12), 0.1), S[9] - 1.2 + tt)
    # 10 "All because of one pig.": cymbal choke, then a music box
    place(m, pan(I.cymbal(0.5, R, dur=0.6), 0.2), S[9])
    for k, mm in enumerate([79, 83, 86, 83, 79]):
        note(m, "box", wt(9, "one") + k * 0.2, mm, 0.3, 0.45)
    # 11 the admiral: dignified brass, a "no" stab
    brassband(m, S[10], S[11], 84, 0, vel=0.6)
    note(m, "stab", wt(10, "no"), 50, 0.35, 0.8)
    note(m, "box", wt(10, "pig") + 0.2, 86, 0.3, 0.4)
    # 12 stayed: crickets only + a single sleepy banjo
    for k in range(4):
        note(m, "harp", S[11] + 0.8 + k * 0.6, [67, 64, 62, 59][k], 0.4, 0.35, 0.2)
    # 13 twelve years: both themes together, a friendly hoedown with brass
    hoedown(m, S[12], S[13], 140, 0, vel=0.75)
    brassband(m, wt(12, "whisky") - 0.3, S[13], 70, 0, vel=0.5)
    # 14 the Kaiser: a stately oompah, stamp hit on "America"
    am = wt(13, "america")
    brassband(m, S[13], am - 0.05, 90, 5, vel=0.7)
    place(m, pan(I.timpani(F(38), 0.9, R), 0), am); note(m, "stab", am, 55, 0.4, 0.8)
    fifedrum(m, am + 0.2, S[14], 120, 0, vel=0.6)
    # 15 casualties: one pig: a heavenly music box + choir pad, a final oink-sting
    one = wt(14, "one")
    padc(m, S[14], "G", DUR - S[14], 0.3, 1600)
    for k, mm in enumerate([79, 83, 86, 91, 86, 83, 79, 83, 86, 91]):
        note(m, "box", one - 0.2 + k * 0.22, mm, 0.3, 0.42)
    note(m, "glock", one, 91, 0.3, 0.5)
    place(m, pan(I.cymbal(0.4, R), 0.3), one)
    return m


# ---------------------------------------------------------------- effects
def hop(r):
    """a soft little bunny thump on grass"""
    n = ns(0.08); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (110 + 40 * np.exp(-t * 60)) * t) * np.exp(-t / 0.02) + bp(r.standard_normal(n), 300, 1500, 1) * np.exp(-t / 0.008) * 0.3) * 0.5


def hops(dur, r, rate=8.0, level=1.0):
    y = np.zeros(ns(dur + 0.2)); k = 0
    while k / rate < dur:
        x = hop(r) * r.uniform(0.4, 1.0); i = ns(k / rate + r.uniform(0, 0.04)); y[i:i + len(x)] += x[: len(y) - i]; k += 1
    return y * level


def nibble(dur, r, rate=14.0):
    y = np.zeros(ns(dur + 0.1)); k = 0
    while k / rate < dur:
        n = ns(0.025); t = np.arange(n) / SR
        x = bp(r.standard_normal(n), 2500, 7000, 1) * np.exp(-t / 0.004) * r.uniform(0.3, 0.8)
        i = ns(k / rate + r.uniform(0, 0.01)); y[i:i + n] += x[: len(y) - i]; k += 1
    return y * 0.3


def pop(r, f=900):
    n = ns(0.12); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f * (1 + 2 * np.exp(-t * 60))) * t) * np.exp(-t / 0.03) * 0.35


def click(r):
    n = ns(0.06); t = np.arange(n) / SR
    return (bp(r.standard_normal(n), 1500, 6000, 1) * np.exp(-t / 0.006) + np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.01) * 0.4) * 0.6


def scratch(dur, r):
    t = np.arange(ns(dur)) / SR
    return bp(r.standard_normal(len(t)), 2000, 7000, 2) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 5.5 * t))) * 0.12


def firework(r):
    n = ns(1.2); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 60 * t) * np.exp(-t / 0.08) * 0.8 + bp(r.standard_normal(n), 400, 4000, 1) * np.exp(-t / 0.05) * 0.6
    for k in range(25):
        i = ns(0.1 + r.uniform(0, 0.9)); m = ns(0.03); y[i:i + m] += bp(r.standard_normal(m), 3000, 9000, 1) * np.exp(-np.arange(m) / SR / 0.006) * r.uniform(0.2, 0.5)
    return y * 0.5


def laugh(r, base, dur=2.2):
    y = np.zeros(ns(dur)); t0 = 0.0
    while t0 < dur - 0.2:
        x = G.oof(r, kind="oof", base=base * r.uniform(1.3, 1.6), scale=r.uniform(0.9, 1.1))
        i = ns(t0); y[i:i + len(x)] += x[: len(y) - i] * 0.5; t0 += r.uniform(0.16, 0.22)
    return y


def oink(r, base=1.0):
    """a cartoon oink: a nasal, noisy grunt glide"""
    n = ns(0.35); t = np.arange(n) / SR
    f = (220 + 160 * np.exp(-t * 10) - 40 * t) * base
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sign(np.sin(ph)) * 0.5 + np.sin(ph * 2) * 0.5) * (0.6 + 0.4 * bp(r.standard_normal(n), 200, 2000, 1))
    x = bp(x, 300, 3000, 2) * np.sin(np.pi * np.clip(t / 0.35, 0, 1)) ** 0.7
    return x * 0.5


def gunshot(r):
    n = ns(1.2); t = np.arange(n) / SR
    y = bp(r.standard_normal(n), 300, 6000, 1) * np.exp(-t / 0.03) + np.sin(2 * np.pi * 60 * t) * np.exp(-t / 0.12) * 0.9
    y += lp(r.standard_normal(n), 800) * np.exp(-t / 0.35) * 0.4   # echo tail
    return y * 0.6


def sfx():
    s = np.zeros((2, N)); r = rng(1859)
    for a, b in [(0, S[1]), (S[2], S[9] + 0.01), (S[11], S[13]), (S[14], DUR)]:
        place(s, fades(G.breeze(b - a, r, level=0.6, bright=800), 0.2, 0.2), a, 0.4)
        place(s, fades(G.bird_chirps(b - a, r, density=0.25), 0.3, 0.3), a, 0.25)
    for a, b in [(S[6], S[10])]:
        place(s, fades(lp(G.breeze(b - a, r, level=0.9, bright=500), 700), 0.3, 0.3), a, 0.35)   # surf
    for a in S[1:-1]:
        place(s, pan(G.whoosh(0.4, r, peak=0.25), 0.0), a - 0.18, 0.3)
    # 1 the pig trots in, oinks
    pg = wt(0, "pig")
    for k in range(6):
        place(s, pan(hop(r), -0.4 + k * 0.08), pg - 0.6 + k * 0.15, 0.6)
    place(s, pan(oink(r), 0), pg + 0.3, 0.9)
    # 2 map: pins
    place(s, pan(pop(r, 900), -0.5), S[1] + 0.9, 0.7); place(s, pan(pop(r, 1100), 0.5), S[1] + 1.3, 0.7)
    # 3 munching
    place(s, pan(nibble(S[3] - wt(2, "found"), r, 9), 0.2), wt(2, "found"), 0.7)
    place(s, pan(oink(r, 1.1), 0.3), wt(2, "potatoes") + 0.2, 0.7)
    # 4 the shot (off-screen) + a rolling potato
    sh = wt(3, "shot")
    place(s, pan(click(r), 0), sh - 0.35, 0.6); place(s, pan(gunshot(r), 0.2), sh, 1.0)
    place(s, pan(G.rattle(0.8, r, 10), 0.5), sh + 0.5, 0.35)
    # 5 problem: a gasp; Griffin grumbles
    place(s, pan(G.babble(1.8, r, 110, 1.0), 0.2), wt(4, "british"), 0.35)
    # 6 arrest paper + settlers shouting
    place(s, pan(G.whoosh(0.3, r, peak=0.2, f_lo=1500, f_hi=6000), 0.2), S[5] + 0.3, 0.5)
    so = wt(5, "so")
    for k in range(3):
        place(s, pan(G.babble(1.6, r, 130 + k * 25, 1.0), -0.5 + k * 0.5), so, 0.35)
    # 7 boats scrape, boots march
    place(s, pan(G.whoosh(0.8, r, peak=0.3, f_lo=200, f_hi=1500), 0), S[6] + 0.1, 0.5)
    t = S[6] + 0.3
    while t < S[7]:
        place(s, pan(G.boot(r, 0.8), r.uniform(-0.4, 0.4)), t, 0.5); t += 0.5
    # 8 ship horn / bell / cannon salute
    ws = wt(7, "warships")
    place(s, pan(I.glock(F(76), 0.6, R), 0.4), ws - 0.4, 0.5); place(s, pan(I.glock(F(76), 0.6, R), 0.4), ws - 0.1, 0.5)
    place(s, pan(tone(110, 105, 1.2, 0.5), 0.3), ws + 0.2, 0.6)
    # 9 counters pop, cannons roll in
    for w in ["four", "fourteen", "five", "two"]:
        place(s, pan(pop(r, 1000), 0), wt(8, w), 0.6)
    for k in range(5):
        place(s, pan(G.rattle(0.4, r, 14, heavy=True), -0.5 + k * 0.25), wt(8, "fourteen") + k * 0.08, 0.3)
    # 10 one pig: angelic shimmer + a little oink
    place(s, pan(shing(r), 0), wt(9, "one"), 0.6); place(s, pan(oink(r, 1.2), 0), wt(9, "pig") + 0.2, 0.6)
    # 11 the admiral's deck: creaks, gulls; finger wag
    place(s, fades(G.creak(S[11] - S[10], r, 60, 90), 0.3, 0.3), S[10], 0.25)
    place(s, pan(G.whoosh(0.25, r, peak=0.12), 0.3), wt(10, "no"), 0.5)
    # 12 stayed: crickets, a yawn
    place(s, fades(G.crickets(S[12] - S[11], r), 0.2, 0.4), S[11], 0.4)
    place(s, pan(G.oof(r, kind="oof", base=100), -0.3), wt(11, "stayed") + 0.3, 0.3)
    # 13 calendar flips, clinks, laughter
    tw = wt(12, "twelve")
    for k in range(12):
        place(s, pan(G.whoosh(0.15, r, peak=0.08, f_lo=2000, f_hi=7000), 0), tw - 0.2 + k * 0.17, 0.35)
    wh = wt(12, "whisky")
    place(s, pan(G.clink(r), 0), wh, 0.9); place(s, pan(G.clink(r), 0.1), wh + 0.03, 0.7)
    for k in range(2):
        place(s, pan(laugh(r, 110 + k * 30, 1.6), -0.4 + k * 0.8), wh + 0.2, 0.35)
    # 14 the Kaiser's stamp
    am = wt(13, "america")
    place(s, pan(knock(r, 90, 0.5), 0), am, 1.0); place(s, pan(bonk(r), 0), am + 0.03, 0.4)
    # 15 heaven: chimes, a last happy oink
    place(s, pan(shing(r), 0), wt(14, "one"), 0.6); place(s, pan(oink(r, 1.25), 0), wt(14, "pig") + 0.3, 0.8)
    place(s, fades(G.crickets(DUR - S[14], r), 0.5, 0.8), S[14], 0.2)
    return s


def mix(voice_path, out):
    os.makedirs(out, exist_ok=True)
    v, sr = read_wav(voice_path)
    v = v[0] if v.ndim > 1 else v
    voice = np.zeros(N); voice[: min(N, len(v))] = v[: min(N, len(v))]
    mus, fx = music(), sfx()
    ir = make_ir(1.1, 9, hf=1.4)
    mus = mus + 0.16 * convolve_st(mus, ir)
    fx = fx + 0.08 * convolve_st(fx, ir)
    env = np.abs(voice); k = ns(0.05)
    env = np.convolve(env, np.ones(k) / k, "same")
    talk = np.clip(env / (np.percentile(env[env > 1e-4], 60) + 1e-9), 0, 1)
    sm = np.zeros_like(talk); a, rls = 1 - np.exp(-1 / (0.08 * SR)), 1 - np.exp(-1 / (0.3 * SR))
    for i in range(1, len(talk)):
        c = a if talk[i] > sm[i - 1] else rls
        sm[i] = sm[i - 1] + c * (talk[i] - sm[i - 1])
    duck = dbg(-7.0 * sm)
    vs = pan(voice, 0) / np.sqrt(2)
    gv = dbg(-16 - integrated(vs)); gm = dbg(-29 - integrated(mus)); gf = dbg(-25 - integrated(fx))
    out_mix = vs * gv + mus * gm * duck[None, :] + fx * gf * dbg(-3.0 * sm)[None, :]
    out_mix *= dbg(-14 - integrated(out_mix)); out_mix = limit(out_mix, dbg(-1.5))
    out_mix *= dbg(-14 - integrated(out_mix)); out_mix = limit(out_mix, dbg(-1.3))
    tp = true_peak(out_mix)
    if tp > -1.0:
        out_mix *= dbg(-1.0 - tp)
    out_mix = fades(out_mix, 0.0, 0.8)
    write_wav(os.path.join(out, "music.wav"), mus * gm); write_wav(os.path.join(out, "sfx.wav"), fx * gf); write_wav(os.path.join(out, "mix.wav"), out_mix)
    print("mix", round(integrated(out_mix), 2), "LUFS, TP", round(true_peak(out_mix), 2), "dBTP, dur", DUR)


if __name__ == "__main__":
    mix(sys.argv[1], sys.argv[3])
