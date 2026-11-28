# "The Great Emu War, 1932": original music + sound effects, generated in code (free, nothing sampled), cut to the
# narration's real line/word timings, then mixed with the narration (-14 LUFS, true peak under -1 dBTP).
# usage: python emu_audio.py <voice.wav> <story_dir> <outdir>
import json
import math
import os
import sys
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, lp, hp, bp, colored
import instruments as I
import sfx_gen as G
from vasa_audio import limit, tone, bonk, shing, knock

F = I.m2f
R = rng(1932)
STORY = sys.argv[2] if len(sys.argv) > 2 else "../../stories/emu-war"
LINES = json.load(open(os.path.join(STORY, "lines.json")))
WORDS = json.load(open(os.path.join(STORY, "words.json")))
DUR = math.ceil((LINES[-1]["end"] + 1.6) * 30) / 30
N = ns(DUR)
LEAD = 0.25
SH = [0.0] + [l["start"] - LEAD for l in LINES[1:]] + [DUR]   # shot boundaries (same rule as EmuWar.tsx)


def norm(w):
    return "".join(c for c in w.lower() if c.isalnum())


def wt(li, word, n=0):
    ws = [w for w in WORDS if w["line"] == li and norm(w["w"]) == norm(word)]
    return ws[n]["s"] if len(ws) > n else LINES[li]["start"]


CH = {"G": [43, 55, 59, 62], "C": [48, 55, 60, 64], "D": [50, 57, 62, 66], "D7": [50, 57, 60, 66], "Em": [40, 52, 55, 59], "Am": [45, 57, 60, 64],
      "Cm": [48, 55, 60, 63], "Eb": [51, 58, 63, 67], "Bb": [46, 53, 58, 62], "Fm": [41, 53, 56, 60]}


def note(buf, inst, t, m, dur, vel=0.7, p=0.0):
    if inst in ("horn", "tuba", "soft", "stab"):
        x = I.brass(F(m), dur, vel, R, inst)
    elif inst == "glock":
        x = I.glock(F(m), vel, R)
    elif inst == "pluck":
        x = I.pluck(F(m), vel, R, dur=max(0.25, dur))
    elif inst == "fife":
        x = I.fife(F(m), dur, vel, R)
    elif inst == "vibes":
        x = I.vibes(F(m), vel, R)
    else:
        raise ValueError(inst)
    place(buf, pan(x, p), t)


def padc(buf, t, chord, dur, vel=0.3, warm=900):
    place(buf, I.pad([F(m) for m in CH[chord]], dur, vel, R, att=0.4, rel=0.8, warm=warm), t)


def snare(buf, t, vel=0.5, p=0.15):
    place(buf, pan(I.snare(vel, R), p), t)


def march(buf, a, b, bpm=116, key=0, prog=("G", "D7", "G", "C", "G", "D7", "G", "G"), mel=True, vel=1.0):
    """comic military march: tuba oom-pah, snare, plucked off-beats, fife tune"""
    beat = 60 / bpm
    tune = [67, 71, 74, 71, 72, 69, 66, 62, 67, 71, 74, 79, 78, 74, 69, 67]
    t, k = a, 0
    while t < b - 0.05:
        ch = CH[prog[(k // 4) % len(prog)]]
        if k % 2 == 0:
            note(buf, "tuba", t, ch[0] - 12 + key, beat * 0.8, 0.75 * vel, -0.2)
        else:
            note(buf, "pluck", t, ch[2] + key, beat * 0.5, 0.45 * vel, 0.3)
            note(buf, "pluck", t, ch[3] + key, beat * 0.5, 0.35 * vel, 0.35)
        snare(buf, t, (0.45 if k % 4 == 3 else 0.25) * vel)
        if k % 4 == 3:
            snare(buf, t + beat / 2, 0.2 * vel)
        if mel and k % 1 == 0:
            note(buf, "fife", t, tune[k % len(tune)] + key, beat * 0.9, 0.42 * vel, 0.1)
        t += beat; k += 1


def music():
    m = np.zeros((2, N))
    s = SH
    # 1 hook: a stately bugle call that gets cut off by the emu (record stop on "birds")
    pop = wt(0, "birds")
    for k, (mm, d) in enumerate([(67, 0.35), (72, 0.35), (76, 0.35), (79, 0.9), (76, 0.3), (79, 1.2)]):
        tt = 0.3 + sum(x[1] for x in [(67, 0.35), (72, 0.35), (76, 0.35), (79, 0.9), (76, 0.3), (79, 1.2)][:k])
        if tt < pop - 0.1:
            note(m, "horn", tt, mm, d, 0.6, -0.1)
    padc(m, 0.3, "G", pop - 0.4, 0.22)
    # 2 "And the birds won." sad trombone
    for k, mm in enumerate([62, 61, 60]):
        note(m, "soft", s[1] + 0.35 + k * 0.42, mm - 12, 0.4, 0.7)
    note(m, "soft", s[1] + 1.6, 59 - 12, 1.1, 0.7)
    # 3-6: the march of the emus and the farmers' trouble, the army arrives
    march(m, s[2], s[4], 112, 0, ("G", "C", "D7", "G"), mel=True, vel=0.8)
    march(m, s[4], s[5], 100, -2, ("Em", "Am", "D7", "G"), mel=False, vel=0.6)
    march(m, s[5], s[7], 120, 0, ("G", "D7", "G", "C"), mel=True, vel=1.0)
    for k, w in enumerate(["three", "two", "ten"]):
        note(m, "stab", wt(5, w), 67 + k * 2, 0.25, 0.8)
    # 8 day one: confident march, interrupted by a cymbal + slide on "scattered"
    sc = wt(7, "scattered")
    march(m, s[7], sc - 0.05, 120, 0, ("G", "G", "D7", "G"), mel=True, vel=0.9)
    place(m, pan(I.cymbal(0.6, R), 0.3), sc)
    for k in range(10):
        note(m, "pluck", sc + k * 0.07, 79 - k * 2, 0.12, 0.5, (-1) ** k * 0.4)
    # 9 the ambush: low tension pulse
    for k in range(int((s[9] - s[8]) / 0.5) + 1):
        place(m, pan(I.timpani(F(43), 0.45 + 0.03 * k, R), -0.2), s[8] + k * 0.5)
    padc(m, s[8], "Cm", s[9] - s[8] + 0.3, 0.32, 600)
    # 10 the big moment: rising tension, then silence on "jammed"
    jam = wt(9, "jammed")
    padc(m, s[9], "Fm", jam - s[9] - 0.75, 0.32, 800)
    t = s[9]
    while t < jam - 0.75:
        place(m, pan(I.timpani(F(41), 0.5, R), -0.2), t); t += 0.42
    for tt, vv in I.snare_roll(0, 0.6, 0.2, 0.7, R):
        place(m, pan(I.snare(vv, R, dur=0.12), 0.1), jam - 1.35 + tt)
    # 11 truck chase: fast gallop
    march(m, s[10], s[11], 150, 2, ("D", "G", "D", "D7"), mel=True, vel=0.85)
    # 12 the lookout: sneaky pizzicato
    beat = 0.32
    sneaky = [55, 58, 60, 61, 62, 61, 60, 58]
    t, k = s[11], 0
    while t < s[12] - 0.1:
        note(m, "pluck", t, sneaky[k % 8], 0.2, 0.55, -0.3 + 0.6 * (k % 2)); t += beat; k += 1
    bb = wt(11, "big")
    for k, mm in enumerate([79, 83, 86, 91]):
        note(m, "glock", bb + k * 0.06, mm, 0.4, 0.45)
    # 13 retreat (sad tuba) -> parliament (silly waltz) -> medal fanfare
    pol, med = wt(12, "politicians"), wt(12, "medals")
    for k, mm in enumerate([50, 49, 48, 47]):
        note(m, "tuba", s[12] + 0.2 + k * 0.5, mm - 12, 0.45, 0.6)
    t = pol - 0.2
    while t < med - 0.1:
        note(m, "tuba", t, 43 - 12, 0.3, 0.5); note(m, "pluck", t + 0.25, 59, 0.2, 0.4, 0.3); note(m, "pluck", t + 0.5, 62, 0.2, 0.4, 0.3); t += 0.75
    for k, mm in enumerate([67, 71, 74, 79]):
        note(m, "horn", med + k * 0.11, mm, 0.6 if k == 3 else 0.12, 0.65)
    # 14 round two: march again, heavier
    march(m, s[13], s[14], 124, 0, ("G", "C", "D7", "G"), mel=False, vel=0.9)
    # 15 tanks: low tuba stomp
    for k in range(int((s[15] - s[14]) / 0.6)):
        note(m, "tuba", s[14] + k * 0.6, [43, 46, 43, 41][k % 4] - 12, 0.45, 0.7)
    # 16 denied x3: stabs on each stamp; "No." big hit
    for j in range(3):
        note(m, "stab", s[15] + 0.15 + j * 0.62 + 0.32, [62, 61, 60][j], 0.25, 0.8)
    place(m, pan(I.timpani(F(38), 0.9, R), 0), wt(15, "no"))
    note(m, "stab", wt(15, "no"), 50, 0.6, 0.9)
    # 17 today: triumphant reprise of the bugle call, cymbal on "Undefeated"
    und = wt(16, "undefeated")
    padc(m, s[16], "G", DUR - s[16], 0.3, 1200)
    for k, (mm, d) in enumerate([(67, 0.3), (72, 0.3), (76, 0.3), (79, 0.6)]):
        note(m, "horn", und - 1.6 + k * 0.32, mm, d, 0.6)
    note(m, "horn", und, 79, 1.6, 0.8); note(m, "horn", und, 74, 1.6, 0.6); note(m, "horn", und, 71, 1.6, 0.5)
    place(m, pan(I.cymbal(0.7, R), 0.3), und)
    place(m, pan(I.timpani(F(43), 0.8, R), 0), und)
    return m


# ---------------------------------------------------------------- effects
def gunfire(dur, r, rate=9.5):
    """a Lewis gun burst: sharp cracks with a low thump each"""
    y = np.zeros(ns(dur + 0.4))
    k = 0
    while k / rate < dur:
        n = ns(0.18); t = np.arange(n) / SR
        crack = bp(r.standard_normal(n), 900, 6000, 1) * np.exp(-t / 0.012) + 0.8 * np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.05)
        i = ns(k / rate + r.uniform(0, 0.01)); y[i:i + n] += crack[: len(y) - i] * r.uniform(0.7, 1.0)
        k += 1
    return y * 0.5


def clunk(r):
    n = ns(0.5); t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * 140 * t) + 0.5 * np.sin(2 * np.pi * 310 * t)) * np.exp(-t / 0.06) + bp(r.standard_normal(n), 300, 2000, 1) * np.exp(-t / 0.02) * 0.6
    return y * 0.6


def boing(r):
    n = ns(0.7); t = np.arange(n) / SR
    f = 220 + 160 * np.sin(2 * np.pi * 7 * t) * np.exp(-t * 4) + 120 * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3) * 0.4


def engine(dur, r, rpm=1.0):
    t = np.arange(ns(dur)) / SR
    f = 32 * rpm * (1 + 0.05 * np.sin(2 * np.pi * 0.7 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sign(np.sin(ph)) * 0.3 + np.sin(ph * 2) * 0.3) * (0.7 + 0.3 * np.sin(ph / 2) ** 2)
    return lp(y + 0.2 * bp(colored(len(t), r, 1.0), 80, 600), 900) * 0.5


def emu_drum(r):
    """the emu's deep drumming 'boom'"""
    n = ns(0.45); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (70 + 10 * np.exp(-t * 8)) * t) * (1 - np.exp(-t / 0.02)) * np.exp(-t / 0.18) * 0.7


def patter(dur, r, rate=7.0, feet=1.0):
    y = np.zeros(ns(dur + 0.2)); k = 0
    while k / rate < dur:
        n = ns(0.06); t = np.arange(n) / SR
        h = bp(r.standard_normal(n), 400, 2500, 1) * np.exp(-t / 0.012) * r.uniform(0.4, 1.0)
        i = ns(k / rate + r.uniform(0, 0.03)); y[i:i + n] += h[: len(y) - i]; k += 1
    return y * 0.35 * feet


def pop(r, f=900):
    n = ns(0.12); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (f * (1 + 2 * np.exp(-t * 60))) * t) * np.exp(-t / 0.03) * 0.35


def stamp(r):
    n = ns(0.35); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.07) + bp(r.standard_normal(n), 200, 3000, 1) * np.exp(-t / 0.02) * 0.7) * 0.7


def laugh(r, base, dur=2.2):
    """a cartoon 'ha-ha-ha' from the vowel synth"""
    y = np.zeros(ns(dur)); t0 = 0.0
    while t0 < dur - 0.2:
        x = G.oof(r, kind="oof", base=base * r.uniform(1.3, 1.6), scale=r.uniform(0.9, 1.1))
        i = ns(t0); y[i:i + len(x)] += x[: len(y) - i] * 0.5; t0 += r.uniform(0.16, 0.22)
    return y


def sfx():
    s = np.zeros((2, N)); r = rng(1932)
    S = SH
    outdoor = [(0, S[2]), (S[3], S[12] + 0.01), (S[13], S[15])]
    for a, b in outdoor:
        place(s, fades(G.breeze(b - a, r, level=0.7, bright=700), 0.2, 0.2), a, 0.45)
    # cut whooshes
    for a in S[1:-1]:
        place(s, pan(G.whoosh(0.45, r, peak=0.3), 0.0), a - 0.2, 0.35)
    # 1: the emu pops up
    p = wt(0, "birds"); place(s, pan(boing(r), 0.4), p - 0.05, 0.6); place(s, pan(emu_drum(r), 0.3), p + 0.2, 0.9)
    place(s, pan(pop(r, 700), 0), 0.35, 0.8)  # "1932"
    # 2: scoreboard ding, emu strut steps
    place(s, pan(I.glock(F(84), 0.6, R), 0.2), S[1] + 0.6, 0.6)
    place(s, pan(patter(1.3, r, 3.0), 0.3), S[1], 0.5)
    # 3: map emus streaming
    place(s, pan(patter(S[3] - S[2] - 0.4, r, 18, 0.5), -0.2), S[2] + 0.3, 0.4)
    place(s, pan(pop(r, 1200), 0.2), S[2] + 1.0, 0.7)
    # 4: pecking, then the fence crash
    for k in range(int((S[4] - S[3]) * 4)):
        place(s, pan(knock(r, 900 + r.uniform(-100, 300), 0.25), r.uniform(-0.6, 0.6)), S[3] + k * 0.25 + r.uniform(0, 0.1), 0.6)
    sm = wt(3, "smashed")
    place(s, pan(patter(0.7, r, 9), -0.4), sm - 0.7, 0.8)
    place(s, pan(G.wood_crack(r), 0.0), sm, 1.0); place(s, pan(G.timber_tear(r, 0.6), 0.2), sm + 0.05, 0.6)
    # 5: grumbling farmers, letter whoosh
    for k in range(3):
        place(s, pan(G.babble(1.6, r, r.uniform(100, 140), r.uniform(0.9, 1.1)), -0.5 + k * 0.5), S[4] + 0.2, 0.25)
    place(s, pan(G.whoosh(0.8, r, peak=0.4), 0.5), wt(4, "asked") + 1.0, 0.5)
    # 6: truck arrives, brakes, men hop down, guns + crates pop
    place(s, fades(engine(2.0, r, 1.2), 0.3, 0.6), S[5], 0.7)
    place(s, pan(tone(1400, 900, 0.4, 0.15), 0), S[5] + 1.1, 0.5)
    for k, w in enumerate(["three", "two", "ten"]):
        place(s, pan(pop(r, 800 + 200 * k), 0), wt(5, w), 0.8)
    for k in range(3):
        place(s, pan(G.boot(r), -0.3 + 0.3 * k), wt(5, "three") - 0.1 + k * 0.42 + 0.35, 0.7)
    # 7: the Major's ding of confidence, the emu peeks (curious drum)
    place(s, pan(shing(r), 0.3), S[6] + 0.4, 0.35); place(s, pan(emu_drum(r), 0.5), S[6] + 1.2, 0.7)
    # 8: day one: "!" pings, then the scatter
    lk, sc = wt(7, "look"), wt(7, "scattered")
    for k in range(5):
        place(s, pan(pop(r, 1500 + k * 120), -0.6 + k * 0.3), lk + k * 0.04, 0.4)
    place(s, pan(patter(2.0, r, 30, 1.0), 0), sc, 0.9)
    for k in range(4):
        place(s, pan(G.whoosh(0.5, r, peak=0.2), -0.8 + k * 0.5), sc + k * 0.08, 0.5)
    # 9: the ambush: hundreds of footsteps getting closer, emu drumming
    place(s, fades(patter(S[9] - S[8], r, 22, 0.5), 0.8, 0.2), S[8], 0.55)
    for k in range(5):
        place(s, pan(emu_drum(r), r.uniform(-0.7, 0.7)), S[8] + 0.4 + k * 0.7, 0.5)
    # 10: the burst, the clunk, the spring
    jam = wt(9, "jammed")
    place(s, pan(gunfire(0.65, r), 0.1), jam - 0.7, 0.9)
    place(s, pan(clunk(r), 0.1), jam, 1.0); place(s, pan(boing(r), 0.2), jam + 0.1, 0.6)
    place(s, pan(G.whoosh(0.6, r, peak=0.2, f_lo=2000, f_hi=6000), 0.2), jam + 0.15, 0.4)   # steam hiss
    place(s, pan(patter(1.5, r, 24, 0.8), 0), jam + 0.4, 0.6)
    # 11: truck chase: engine, rattles, emu feet passing
    place(s, fades(engine(S[11] - S[10], r, 1.6), 0.2, 0.3), S[10], 0.75)
    place(s, fades(G.rattle(S[11] - S[10], r, 20, heavy=True), 0.2, 0.2), S[10], 0.4)
    place(s, pan(patter(S[11] - S[10], r, 16), 0.4), S[10], 0.6)
    place(s, pan(G.whoosh(0.6, r, peak=0.35), 0.6), wt(10, "outran"), 0.6)
    # 12: lookout honk, scatter, big brain sparkle
    kp = wt(11, "keeping"); place(s, pan(emu_drum(r), 0), kp, 1.0); place(s, pan(emu_drum(r), 0), kp + 0.3, 0.8)
    place(s, pan(shing(r), 0.2), wt(11, "big"), 0.5)
    for k in range(3):
        place(s, pan(knock(r, 600, 0.3), 0.3), wt(11, "big") + k * 0.11, 0.6)   # tapping its head
    # 13: retreat steps, parliament laughter, medal ding
    place(s, pan(patter(1.6, r, 2.2, 1.0), -0.2), S[12] + 0.1, 0.6)
    pol, med = wt(12, "politicians"), wt(12, "medals")
    for k in range(4):
        place(s, pan(laugh(r, 110 + k * 25, med - pol + 0.2), -0.6 + k * 0.4), pol - 0.05, 0.5)
    place(s, G.applause(max(0.5, med - pol), r, 16), pol, 0.15)
    place(s, pan(I.glock(F(88), 0.7, R), 0), med, 0.8); place(s, pan(shing(r), 0), med + 0.1, 0.5)
    # 14: round two: firing bursts, casings tinkle, counter ticks
    t = S[13] + 0.5
    while t < S[14] - 0.4:
        place(s, pan(gunfire(0.5, r), -0.3), t, 0.55); t += 0.9
    for k in range(25):
        place(s, pan(G.clink(r), r.uniform(-0.5, 0.0)), S[13] + 0.6 + k * (S[14] - S[13] - 1.0) / 25, 0.35)
    place(s, pan(pop(r, 1000), 0), wt(13, "nearly") - 0.2, 0.6); place(s, pan(pop(r, 1300), 0), wt(13, "fewer") - 0.2, 0.6)
    # 15: thought bubble pop, tank rumble + squeak
    place(s, pan(pop(r, 600), 0.3), S[14] + 0.4, 0.7)
    place(s, fades(lp(G.rattle(S[15] - S[14] - 0.5, r, 12, heavy=True), 600), 0.3, 0.3), S[14] + 0.5, 0.45)
    # 16: paper slaps, stamps, the big NO
    for j in range(3):
        a = S[15] + 0.15 + j * 0.62
        place(s, pan(G.whoosh(0.3, r, peak=0.2), 0.1), a - 0.05, 0.5); place(s, pan(stamp(r), 0), a + 0.32, 1.0)
    place(s, pan(stamp(r), 0), wt(15, "no"), 1.0); place(s, pan(bonk(r), 0), wt(15, "no") + 0.05, 0.5)
    # 17: evening crickets, emu drum, sparkle on "Undefeated"
    place(s, fades(G.crickets(DUR - S[16], r), 0.5, 0.8), S[16], 0.25)
    place(s, pan(emu_drum(r), 0), wt(16, "undefeated") - 0.3, 0.8); place(s, pan(shing(r), 0), wt(16, "undefeated"), 0.5)
    return s


def mix(voice_path, out):
    os.makedirs(out, exist_ok=True)
    v, sr = read_wav(voice_path)
    v = v[0] if v.ndim > 1 else v
    voice = np.zeros(N); voice[: min(N, len(v))] = v[: min(N, len(v))]
    mus, fx = music(), sfx()
    ir = make_ir(1.0, 7, hf=1.6)
    mus = mus + 0.14 * convolve_st(mus, ir)
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
