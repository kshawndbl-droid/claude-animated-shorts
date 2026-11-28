# "Napoleon vs the Bunnies, 1807": original music + sound effects generated in code (free, nothing sampled), cut to the
# narration's real line/word timings, then mixed with the narration (-14 LUFS, true peak under -1 dBTP).
# Its own musical identity: a courtly harpsichord minuet + fife for the Emperor, pizzicato for the bunnies, a galop chase.
# usage: python napoleon_audio.py <voice.wav> <story_dir> <outdir>
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
R = rng(1807)
STORY = sys.argv[2] if len(sys.argv) > 2 else "../../stories/napoleon-rabbits"
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


def music():
    m = np.zeros((2, N))
    # 1 hook: a grand imperial fanfare... that wilts on "bunnies"
    bn = wt(0, "bunnies")
    for k, (mm, d) in enumerate([(62, 0.3), (66, 0.3), (69, 0.3), (74, 0.9)]):
        note(m, "horn", 0.3 + k * 0.32, mm, d, 0.6, -0.1); note(m, "horn", 0.3 + k * 0.32, mm - 12, d, 0.45, 0.1)
    place(m, pan(I.timpani(F(38), 0.7, R), 0), 0.3); place(m, pan(I.timpani(F(38), 0.7, R), 0), 1.26)
    padc(m, 0.3, "D", bn - 0.6, 0.25)
    minuet(m, 1.9, bn - 0.15, 132, 0, mel=True, vel=0.7)
    for k, mm in enumerate([69, 68, 67, 66]):        # the wilt: a sliding horn
        note(m, "soft", bn + k * 0.18, mm - 12, 0.2 if k < 3 else 0.7, 0.6)
    note(m, "box", bn + 0.4, 86, 0.3, 0.4)
    # 2 July 1807, the treaty: minuet proper, a fanfare + cymbal on "celebrate"
    cel = wt(1, "celebrate")
    minuet(m, S[1], cel - 0.05, 138, 0, vel=0.85)
    for k, mm in enumerate([62, 66, 69, 74, 78]):
        note(m, "horn", cel + k * 0.09, mm, 0.12 if k < 4 else 0.8, 0.65)
    place(m, pan(I.cymbal(0.6, R), 0.3), cel + 0.36); place(m, pan(I.timpani(F(38), 0.8, R), 0), cel + 0.36)
    # 3 Berthier's plan: a pompous little march on the harpsichord
    minuet(m, S[2], S[3], 150, 5, ("G", "C", "G", "D"), mel=False, vel=0.7)
    for k, mm in enumerate([67, 71, 74]):
        note(m, "glock", wt(2, "hunt") + k * 0.08, mm + 12, 0.3, 0.4)
    # 4 one problem: stop; then the farmers' sneaky pizzicato and a counting glock
    pb, hund, thou = wt(3, "problem"), wt(3, "hundreds"), wt(3, "thousands")
    note(m, "soft", pb - 0.05, 45, 0.6, 0.7)
    sneaky(m, pb + 0.6, hund - 0.1, 0.3, 0.5)
    for k in range(int((DUR and (thou - hund)) / 0.12) + 1):
        note(m, "box", hund + k * 0.12, 74 + (k % 5) * 2, 0.15, 0.35, (-1) ** k * 0.3)
    note(m, "stab", thou, 62, 0.3, 0.75); note(m, "stab", thou, 69, 0.3, 0.6)
    padc(m, hund, "Bm", S[4] - hund, 0.2)
    # 5 the cages open: tension, a drum roll building to the guns
    padc(m, S[4], "Dm", S[5] - S[4] + 0.3, 0.3, 700)
    rs = wt(4, "raise")
    for tt, vv in I.snare_roll(0, S[5] - rs, 0.15, 0.6, R):
        place(m, pan(I.snare(vv, R, dur=0.12), 0.1), rs + tt)
    place(m, pan(I.timpani(F(38), 0.6, R), 0), wt(4, "open"))
    # 6 instead of running away: a curious pizzicato, then everyone hops at Napoleon
    ra, nap = wt(5, "rabbits"), wt(5, "napoleon")
    sneaky(m, S[5] + 0.2, ra, 0.36, 0.45, (62, 64, 65, 64))
    sneaky(m, ra + 0.1, S[6] - 0.1, 0.17, 0.55, (62, 65, 69, 74, 69, 65))
    note(m, "stab", nap, 61, 0.35, 0.8); note(m, "stab", nap, 67, 0.35, 0.7)
    # 7 feeding time: music box lullaby + dinner bell
    fe = wt(6, "feeding")
    for k, mm in enumerate([74, 78, 81, 78, 76, 73, 74, 69]):
        note(m, "box", S[6] + 0.2 + k * 0.33, mm, 0.3, 0.45, 0.1)
    padc(m, S[6], "D", S[7] - S[6], 0.22, 1100)
    for k in range(3):
        note(m, "glock", fe + k * 0.14, 88, 0.2, 0.55)
    # 8 laughter (jolly minuet) -> they keep coming (minor, faster)
    kp = wt(7, "keep")
    minuet(m, S[7], kp - 0.1, 150, 0, vel=0.75)
    galop(m, kp - 0.1, S[8], 150, -2, ("Dm", "A7", "Dm", "A7"), vel=0.6, mel=False)
    # 9 the swarm: galop in minor, stab on each swing
    galop(m, S[8], S[9], 168, -2, ("Dm", "Gm", "A7", "Dm"), vel=0.75)
    note(m, "stab", wt(8, "swings"), 62, 0.2, 0.8)
    # 10 "Nothing works." full stop, one sad glock
    note(m, "soft", S[9] + 0.1, 38, 1.1, 0.5); note(m, "glock", wt(9, "works"), 74, 0.3, 0.3)
    # 11-12 the retreat: the galop at full tilt, all the way to the carriage
    galop(m, S[10], S[12], 176, 0, vel=0.95)
    for k, mm in enumerate([74, 78, 81, 86]):
        note(m, "horn", wt(10, "emperor") + k * 0.07, mm, 0.1 if k < 3 else 0.4, 0.5)
    th = wt(11, "there")
    place(m, pan(I.cymbal(0.5, R), 0.2), th + 0.35)
    # 13 hopped inside: sneaky pizz + glock plinks for each bunny
    sneaky(m, S[12], S[13], 0.25, 0.5, (62, 66, 69, 66))
    for k in range(3):
        note(m, "glock", wt(12, "hopped") - 0.2 + k * 0.3 + 0.4, 81 + k * 3, 0.3, 0.45)
    # 14 the memoirs: candlelit harpsichord, slow; a "maybe?" interval on exaggerated
    ex = wt(13, "exaggerated")
    minuet(m, S[13], S[14], 96, -5, ("Dm", "Gm", "A7", "Dm"), mel=False, vel=0.55)
    note(m, "box", ex, 81, 0.3, 0.5); note(m, "box", ex + 0.25, 80, 0.3, 0.45)
    # 15 the contrast: heroic horns (armies) -> a tiny squeaky version (bunnies)
    arm, ch = wt(14, "armies"), wt(14, "chased")
    padc(m, S[14], "D", ch - S[14], 0.3, 1300)
    for k, (mm, d) in enumerate([(62, 0.3), (66, 0.3), (69, 0.3), (74, 0.8)]):
        note(m, "horn", arm - 0.9 + k * 0.32, mm, d, 0.65); note(m, "horn", arm - 0.9 + k * 0.32, mm - 12, d, 0.45)
    place(m, pan(I.timpani(F(38), 0.8, R), 0), arm + 0.06)
    galop(m, ch - 0.1, S[15], 180, 12, vel=0.4, mel=False)
    # 16 Waterloo: a slow, sad horn at dusk; then the bunny's triumphant mini-fanfare + minuet reprise
    rb, first = wt(15, "rabbits"), wt(15, "first")
    padc(m, S[15], "Bm", rb - S[15], 0.3, 700)
    for k, (mm, d) in enumerate([(66, 0.7), (64, 0.5), (62, 0.5), (61, 1.2)]):
        t0 = S[15] + 0.3 + sum(x[1] for x in [(66, 0.7), (64, 0.5), (62, 0.5), (61, 1.2)][:k])
        if t0 < rb - 0.3:
            note(m, "soft", t0, mm - 12, d, 0.55)
    minuet(m, rb - 0.15, DUR, 138, 0, vel=0.8)
    for k, mm in enumerate([74, 78, 81, 86]):
        note(m, "glock", first + k * 0.08, mm, 0.3, 0.5)
    note(m, "horn", first + 0.3, 74, 1.4, 0.7); note(m, "horn", first + 0.3, 69, 1.4, 0.55); note(m, "horn", first + 0.3, 66, 1.4, 0.5)
    place(m, pan(I.cymbal(0.6, R), 0.3), first + 0.3)
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


def sfx():
    s = np.zeros((2, N)); r = rng(1807)
    outdoor = [(S[1], S[2]), (S[3], S[13]), (S[15], DUR)]
    for a, b in outdoor:
        place(s, fades(G.breeze(b - a, r, level=0.55, bright=900), 0.2, 0.2), a, 0.4)
        place(s, fades(G.bird_chirps(b - a, r, density=0.35), 0.3, 0.3), a, 0.3)
    for a in S[1:-1]:
        place(s, pan(G.whoosh(0.4, r, peak=0.25), 0.0), a - 0.18, 0.3)
    # 1: the portrait: bunny hops in and nibbles
    bn = wt(0, "bunnies")
    for k in range(3):
        place(s, pan(hop(r), 0.5 - k * 0.1), bn - 0.35 + k * 0.15, 0.9)
    place(s, pan(pop(r, 1200), 0.3), bn + 0.05, 0.6); place(s, pan(nibble(1.0, r), 0.3), bn + 0.6, 0.8)
    # 2: quill scratch on "signed", fireworks + crowd cheer on "celebrate"
    sg, cel = wt(1, "signed"), wt(1, "celebrate")
    place(s, pan(scratch(0.7, r), 0.1), sg, 0.8); place(s, pan(knock(r, 500, 0.3), 0), sg + 0.65, 0.6)
    for k, p in enumerate([-0.5, 0.5, 0.0]):
        place(s, pan(firework(r), p), cel + k * 0.25, 0.8)
    place(s, G.applause(1.8, r, 20), cel, 0.2)
    # 3: Berthier taps the board
    for k in range(3):
        place(s, pan(knock(r, 900, 0.25), 0.3), wt(2, "hunt") - 0.3 + k * 0.15, 0.6)
    # 4: coins, crates stacking
    place(s, pan(G.clink(r), 0), wt(3, "bought") + 0.1, 0.8); place(s, pan(G.clink(r), 0.1), wt(3, "bought") + 0.18, 0.6)
    hund = wt(3, "hundreds")
    for k in range(14):
        place(s, pan(knock(r, 300 + r.uniform(0, 200), 0.3), r.uniform(-0.7, 0.7)), hund - 0.2 + k * 0.1, 0.5)
    # 5: the cages creak open, the guns are cocked
    op, rs = wt(4, "open"), wt(4, "raise")
    place(s, pan(G.creak(0.6, r, 120, 200), -0.2), op - 0.05, 0.6); place(s, pan(G.creak(0.5, r, 140, 220), 0.3), op + 0.1, 0.5)
    for k in range(5):
        place(s, pan(click(r), -0.6 + k * 0.3), rs + 0.15 + k * 0.06, 0.6)
    # 6: the rabbits come out, then a stampede of hops toward the hunters
    ra = wt(5, "rabbits")
    place(s, pan(hops(ra - S[5], r, 5, 0.5), 0), S[5] + 0.3, 0.6)
    place(s, fades(hops(S[6] - ra, r, 30, 0.9), 0.1, 0.2), ra, 0.8)
    place(s, pan(G.whoa(r), 0.0), wt(5, "napoleon") + 0.1, 0.25)
    # 7: nibbling, dinner bell
    place(s, pan(nibble(S[7] - S[6], r, 10), 0.1), S[6] + 0.3, 0.5)
    # 8: laughter, then gulps of hops
    lg, kp = wt(7, "laughs"), wt(7, "keep")
    for k in range(3):
        place(s, pan(laugh(r, 105 + k * 20, kp - lg + 0.3), -0.5 + k * 0.5), lg - 0.05, 0.5)
    place(s, fades(hops(S[8] - kp + 0.3, r, 40, 0.8), 0.5, 0.2), kp - 0.3, 0.7)
    # 9: the swarm: hops everywhere, crop swishes, stick whacks, cries
    place(s, fades(hops(S[9] - S[8], r, 36, 0.8), 0.1, 0.1), S[8], 0.7)
    sw, stx = wt(8, "swings"), wt(8, "sticks")
    t = sw
    while t < stx - 0.2:
        place(s, pan(G.whoosh(0.25, r, peak=0.12, f_lo=900, f_hi=5000), 0.2), t, 0.7); t += 0.9
    t = stx
    while t < S[9] - 0.2:
        place(s, pan(G.whoosh(0.22, r, peak=0.1, f_lo=700, f_hi=4000), r.uniform(-0.6, 0.6)), t, 0.5); place(s, pan(knock(r, 400, 0.25), r.uniform(-0.6, 0.6)), t + 0.12, 0.3); t += 0.35
    for k in range(2):
        place(s, pan(G.babble(1.5, r, 120 + k * 30, 1.0), -0.4 + k * 0.8), stx, 0.25)
    # 10: nothing works: just nibbling and a cricket
    place(s, pan(nibble(S[10] - S[9], r, 18), 0), S[9], 0.6)
    place(s, fades(G.crickets(S[10] - S[9], r), 0.1, 0.2), S[9], 0.3)
    # 11-12: the run: boots + a river of hops, whip pan, door slam
    place(s, fades(hops(S[12] - S[10], r, 34, 0.9), 0.2, 0.2), S[10], 0.6)
    t = S[10]
    while t < wt(11, "there"):
        place(s, pan(G.boot(r, 0.7), 0.1), t, 0.45); t += 0.27
    place(s, pan(G.whoosh(0.5, r, peak=0.3), 0.4), wt(10, "carriage") - 0.35, 0.6)
    th = wt(11, "there")
    place(s, pan(G.whoosh(0.4, r, peak=0.25), 0.3), th - 0.2, 0.5); place(s, pan(G.push_thump(r), 0.2), th + 0.35, 1.0); place(s, pan(G.wood_crack(r), 0.2), th + 0.36, 0.25)
    # 13: bunnies hop in, one by one
    hp_ = wt(12, "hopped")
    for k in range(3):
        place(s, pan(hop(r), 0.3 - k * 0.2), hp_ - 0.2 + k * 0.3 + 0.5, 1.0); place(s, pan(pop(r, 1000 + 200 * k), 0), hp_ - 0.2 + k * 0.3 + 0.55, 0.4)
    place(s, pan(G.oof(r, kind="oof", base=120), 0), hp_ + 0.45, 0.4)
    # 14: the book thump, pages, quill, a "boing" when the sketch grows
    mem, ex = wt(13, "memoirs"), wt(13, "exaggerated")
    place(s, pan(knock(r, 180, 0.5), 0), mem - 0.1, 0.8); place(s, pan(G.whoosh(0.4, r, peak=0.2, f_lo=1500, f_hi=6000), 0), mem, 0.5)
    place(s, pan(scratch(ex - mem - 0.5, r), -0.2), mem + 0.5, 0.6)
    place(s, pan(tone(300, 700, 0.35, 0.25), 0), ex, 0.6); place(s, pan(knock(r, 120, 0.4), 0), ex + 0.1, 0.8)
    # 15: panels slap in; little army drums; hops in panel 2
    arm, ch = wt(14, "armies"), wt(14, "chased")
    place(s, pan(knock(r, 200, 0.4), 0), S[14] + 0.1, 0.7); place(s, pan(knock(r, 200, 0.4), 0), ch - 0.2, 0.7)
    for k in range(9):
        place(s, pan(I.snare(0.3, R), 0.1), arm - 0.8 + k * 0.11, 0.5)
    place(s, pan(hops(S[15] - ch, r, 16, 0.6), 0.2), ch, 0.6)
    # 16: dusk: crickets, slow footsteps; sparkle on "first"
    rb, first = wt(15, "rabbits"), wt(15, "first")
    place(s, fades(G.crickets(DUR - S[15], r), 0.5, 0.8), S[15], 0.25)
    t = S[15] + 0.2
    while t < rb - 0.3:
        place(s, pan(G.stroll_step(r, 0.4), -0.1), t, 0.35); t += 0.7
    place(s, pan(shing(r), 0), first, 0.5); place(s, pan(pop(r, 1400), 0), first + 0.05, 0.4)
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
