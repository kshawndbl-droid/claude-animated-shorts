# "D.B. Cooper, 1971": an original heist-noir score and sound design generated in code (free, nothing sampled), cut to
# the narration's word timings and mixed with it (-14 LUFS, true peak under -1 dBTP).
# Identity: a walking upright bass with brushes and vibraphone stabs (a 70s heist), a storm with a timpani roll and
# thunder for the jump, cold pads for the search, a lonely vibes figure for the river, typewriter and a final bass riff.
# usage: python cooper_audio.py <voice.wav> <story_dir> <outdir>
import json
import math
import os
import sys
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, lp, hp, bp, colored, smooth_noise
import instruments as I
import sfx_gen as G
from vasa_audio import limit, knock

F = I.m2f
R = rng(1971)
STORY = sys.argv[2] if len(sys.argv) > 2 else "../../stories/db-cooper"
LINES = json.load(open(os.path.join(STORY, "lines.json")))
WORDS = json.load(open(os.path.join(STORY, "words.json")))
DUR = math.ceil((LINES[-1]["end"] + 1.9) * 30) / 30
N = ns(DUR)
LEAD = 0.25
S = [0.0] + [l["start"] - LEAD for l in LINES[1:]] + [DUR]


def norm(w):
    return "".join(c for c in w.lower() if c.isalnum())


def wt(li, word, n=0):
    ws = [w for w in WORDS if w["line"] == li and norm(w["w"]) == norm(word)]
    return ws[n]["s"] if len(ws) > n else LINES[li]["start"]


CH = {"Em": [40, 52, 55, 59, 62], "Am": [45, 52, 57, 60, 64], "B7": [47, 51, 54, 57, 63], "C": [36, 52, 55, 60, 64], "Cm": [36, 51, 55, 60, 63], "Ebm": [39, 51, 54, 58, 61], "Bsus": [47, 52, 54, 59, 64]}


def bassn(buf, t, m, vel=0.6, dur=0.42):
    place(buf, pan(I.pluck(F(m), vel, R, dur=dur, bright=0.25, pos=0.3), -0.1), t)


def brush(buf, t, vel=0.35, swish=False):
    place(buf, pan(I.brush(vel, R, swish=swish), 0.25), t)


def vib(buf, t, ms, vel=0.4, p=0.2):
    for m in ms:
        place(buf, pan(I.vibes(F(m), vel, R, dur=1.4), p), t)


def padc(buf, t, ch, dur, vel=0.28, warm=700):
    if dur > 0.2:
        place(buf, I.pad([F(m) for m in CH[ch]], dur, vel, R, att=0.9, rel=1.4, warm=warm), t)


def heist(buf, a, b, bpm=96, vel=1.0):
    """walking bass + brushes + vibes stabs, E minor"""
    beat = 60.0 / bpm
    walk = [40, 43, 45, 47, 45, 43, 42, 38, 40, 47, 45, 43, 45, 48, 47, 46]
    t, k = a, 0
    while t < b - 0.05:
        bassn(buf, t, walk[k % len(walk)], 0.62 * vel)
        brush(buf, t, 0.22 * vel, swish=(k % 2 == 0))
        if k % 2 == 1:
            brush(buf, t + beat * 0.66, 0.12 * vel)
        if k % 8 == 0:
            vib(buf, t + beat * 0.5, [64, 67, 71], 0.3 * vel)
        if k % 8 == 5:
            vib(buf, t + beat * 0.5, [62, 66, 69], 0.25 * vel, -0.2)
        t += beat; k += 1


def music():
    buf = np.zeros((2, N))
    # 0-5: the heist groove, with a hard stop on "He has a bomb in his briefcase."
    heist(buf, 0.3, S[2] - 0.05, 96, 0.9)
    place(buf, pan(I.timpani(F(40), 0.8, R, dur=2.0), 0), S[2] + 0.05)
    padc(buf, S[2], "Cm", S[4] - S[2] + 0.5, 0.32, warm=500)
    heist(buf, S[4], S[6] - 0.1, 104, 1.0)
    # 6-7: the storm and the jump: a pad that darkens and a timpani roll into "jumps"
    padc(buf, S[6], "Ebm", S[8] - S[6], 0.36, warm=420)
    tj = wt(6, "jumps")
    t = tj - 2.2
    while t < tj:
        place(buf, pan(I.timpani(F(40), 0.25 + 0.5 * (1 - (tj - t) / 2.2), R, dur=0.6), 0), t); t += 0.09
    place(buf, pan(I.cymbal(0.7, R, dur=3.0), 0), tj); place(buf, pan(I.timpani(F(35), 1.0, R, dur=2.6), 0), tj)
    # 8-10: the search and the river: cold pads + a lonely vibes line
    padc(buf, S[8], "Am", S[9] - S[8] + 0.4, 0.3, warm=600)
    padc(buf, S[9], "C", S[10] - S[9] + 0.4, 0.28, warm=800)
    for j, m in enumerate([76, 74, 71, 69, 71, 67]):
        vib(buf, S[9] + 0.6 + j * 0.62, [m], 0.32, 0.3 * math.sin(j))
    padc(buf, S[10], "Em", S[11] - S[10] + 0.4, 0.3, warm=500)
    # 11-12: a light groove again for the name trivia, then the file
    heist(buf, S[11], S[12] - 0.05, 100, 0.65)
    padc(buf, S[12], "Am", S[13] - S[12] + 0.5, 0.3, warm=600)
    # 13: an unresolved ending: bass riff, a suspended chord left hanging
    for j, m in enumerate([40, 43, 47, 46]):
        bassn(buf, S[13] + 0.2 + j * 0.55, m, 0.6, 0.6)
    padc(buf, S[13] + 1.8, "Bsus", DUR - S[13] - 1.8, 0.32, warm=500)
    vib(buf, DUR - 2.6, [64, 66, 71], 0.35)
    return buf


# ---------------------------------------------------------------- effects
def rain_bed(dur, level=1.0, inside=False):
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2):
        hiss = bp(colored(n, R, 0.2), 1500, 9000, 1) * (0.7 + 0.3 * smooth_noise(n, R, 0.4))
        drops = G.bubbles(dur, R, 120, 2000, 6000, (0.002, 0.006)) * 0.4
        x = hiss * 0.5 + drops
        out[ch] = (lp(x, 900, 2) if inside else x) * level
    return out


def jet(dur, level=1.0, rise=0.0):
    n = ns(dur); t = np.arange(n) / SR
    g = (0.6 + 0.4 * np.clip(t / max(0.1, dur) * (1 + rise), 0, 1)) if rise else np.ones(n)
    out = np.zeros((2, n))
    for ch in range(2):
        roar = lp(colored(n, R, 1.0), 700 + 900 * rise, 2) * 0.8 + bp(colored(n, R, 0.0), 2500, 6000, 1) * 0.12 * (1 + rise)
        out[ch] = roar * g * level
    return out


def thunder(r):
    n = ns(3.2); t = np.arange(n) / SR
    y = lp(colored(n, r, 2.0), 300, 2) * (np.exp(-t / 1.2) * (1 + 0.6 * np.sin(2 * np.pi * 1.7 * t) ** 2))
    crack = bp(colored(n, r, 0.5), 800, 5000, 1) * np.exp(-t / 0.08) * 0.6
    return fades((y + crack) * 1.2, 0.002, 0.5)


def typekey(r):
    n = ns(0.06); t = np.arange(n) / SR
    return (bp(r.standard_normal(n), 1500, 6000, 1) * np.exp(-t / 0.006) + np.sin(2 * np.pi * 300 * t) * np.exp(-t / 0.01) * 0.5) * 0.6


def stamp():
    n = ns(0.4); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.06) + bp(colored(n, R, 0.5), 200, 3000, 1) * np.exp(-t / 0.02) * 0.8) * 0.9


def sfx():
    buf = np.zeros((2, N))
    # terminal rain, then the cabin hum while inside the plane
    place(buf, fades(rain_bed(S[1] + 0.5, 0.6, inside=True), 0.3, 0.5), 0.0)
    place(buf, fades(jet(S[5] - S[1] + 0.6, 0.35) * 1.0, 0.4, 0.5), S[1] - 0.3)
    place(buf, fades(lp(jet(S[5] - S[1] + 0.6, 0.6), 250, 2), 0.4, 0.5), S[1] - 0.3)
    # ticket stamp, ice in the glass, the note sliding, briefcase latches
    place(buf, pan(knock(R, 220, 0.5), 0.1), S[0] + 1.0)
    for j in range(3):
        place(buf, pan(G.clink(R, 3000 + j * 400, 0.06) * 0.35, 0.3), wt(1, "bourbon") + 0.2 + j * 0.11)
    place(buf, pan(G.whoosh(0.5, R, 0.15, 1500, 5000) * 0.35, -0.2), wt(1, "note") - 0.4)
    for j in range(2):
        place(buf, pan(G.clink(R, 1200 + j * 200, 0.05) * 0.5, -0.2 + j * 0.4), S[3] + 0.25 + j * 0.15)
    place(buf, pan(G.creak(0.9, R, 200, 260, scale=0.5) * 0.35, 0), S[3] + 0.4)
    # money rustle, four parachute thumps
    place(buf, fades(bp(colored(ns(2.4), R, 0.2), 2000, 8000, 1)[None, :].repeat(2, 0) * 0.12, 0.2, 0.6), S[4] + 0.1)
    for k in range(4):
        place(buf, pan(G.push_thump(R) * 0.7, -0.6 + k * 0.4), wt(4, "parachutes") - 0.4 + k * 0.22 + 0.24)
    # Seattle tarmac: rain, idling engines, then the takeoff roar
    place(buf, fades(rain_bed(S[6] - S[5] + 0.5, 0.5), 0.3, 0.5), S[5] - 0.2)
    tk = wt(5, "sends") - 0.2
    place(buf, fades(jet(tk - S[5] + 0.3, 0.5), 0.3, 0.3), S[5])
    place(buf, fades(jet(S[6] - tk + 0.6, 1.0, rise=1.0), 0.2, 0.6), tk)
    # the storm: heavy rain, wind, engines, thunder on the two flashes
    place(buf, fades(rain_bed(S[8] - S[6] + 0.5, 1.0), 0.3, 0.6), S[6] - 0.2)
    place(buf, fades(G.breeze(S[8] - S[6] + 0.5, R, 1.4, 0.5, 1500), 0.3, 0.6), S[6] - 0.2)
    place(buf, fades(jet(S[7] - S[6] + 0.4, 0.6), 0.3, 0.3), S[6])
    place(buf, pan(thunder(R), -0.3), S[6] + 0.8); place(buf, pan(thunder(R), 0.3), wt(6, "jumps") - 0.15)
    place(buf, fades(G.whoosh(3.0, R, 0.5, 300, 2500, 1.0, 0.8, 0.6) * 0.8, 0.1, 0.8), wt(6, "jumps") + 0.3)
    # the search: rain on leaves, footsteps, flashlight clicks
    place(buf, fades(rain_bed(S[9] - S[8] + 0.5, 0.45), 0.3, 0.5), S[8] - 0.2)
    for j in range(6):
        place(buf, pan(G.stroll_step(R, 0.8) * 0.4, -0.5 + j * 0.2), S[8] + 0.6 + j * 0.45)
    for j in range(3):
        place(buf, pan(G.clink(R, 2600, 0.03) * 0.4, -0.4 + j * 0.4), S[8] + 0.3 + j * 0.25)
    # the river in 1980: lapping water, birds, digging in sand
    place(buf, fades(G.water_bed(S[10] - S[9] + 0.4, R, close=0.4) * 0.6, 0.4, 0.5), S[9] - 0.2)
    place(buf, fades(G.bird_chirps(S[10] - S[9], R, 0.25), 0.3, 0.5), S[9])
    for j in range(8):
        place(buf, pan(fades(bp(colored(ns(0.18), R, 0.5), 600, 4000, 1) * 0.3, 0.01, 0.08), 0.3), S[9] + 0.4 + j * 0.37)
    # the leftover cash drifting: wind
    place(buf, fades(G.breeze(S[11] - S[10] + 0.4, R, 0.8, 0.3, 900), 0.4, 0.5), S[10] - 0.2)
    # typewriter for the name
    td = wt(11, "Dan") - 0.1
    for j in range(10):
        place(buf, pan(typekey(R), 0.1), td + j * 0.07)
    tdb = wt(11, "D.B.") - 0.25
    for j in range(12):
        place(buf, pan(typekey(R), 0.1), tdb + j * 0.06)
    place(buf, pan(I.triangle(0.4, R, 1.0, 2600.0), 0.2), tdb + 0.8)
    # the file stamped, then the woods at dawn
    place(buf, pan(stamp(), 0), wt(12, "gave") - 0.1)
    place(buf, fades(G.breeze(DUR - S[13], R, 0.5, 0.2, 700), 0.6, 1.2), S[13])
    for j in range(5):
        place(buf, pan(G.stroll_step(R, 0.6) * 0.25, 0.1), S[13] + 0.8 + j * 0.62)
    return buf


def mix(voice_path, out):
    os.makedirs(out, exist_ok=True)
    v, sr = read_wav(voice_path)
    v = v[0] if v.ndim > 1 else v
    voice = np.zeros(N); voice[: min(N, len(v))] = v[: min(N, len(v))]
    mus, fx = music(), sfx()
    ir = make_ir(1.4, 13, hf=1.2)
    mus = mus + 0.18 * convolve_st(mus, ir)
    fx = fx + 0.06 * convolve_st(fx, ir)
    env = np.abs(voice); k = ns(0.05)
    env = np.convolve(env, np.ones(k) / k, "same")
    talk = np.clip(env / (np.percentile(env[env > 1e-4], 60) + 1e-9), 0, 1)
    sm = np.zeros_like(talk); a, rls = 1 - np.exp(-1 / (0.08 * SR)), 1 - np.exp(-1 / (0.35 * SR))
    for i in range(1, len(talk)):
        c = a if talk[i] > sm[i - 1] else rls
        sm[i] = sm[i - 1] + c * (talk[i] - sm[i - 1])
    duck = dbg(-7.0 * sm)
    vs = pan(voice, 0) / np.sqrt(2)
    gv = dbg(-16 - integrated(vs)); gm = dbg(-28 - integrated(mus)); gf = dbg(-26 - integrated(fx))
    out_mix = vs * gv + mus * gm * duck[None, :] + fx * gf * dbg(-3.0 * sm)[None, :]
    out_mix *= dbg(-14 - integrated(out_mix)); out_mix = limit(out_mix, dbg(-1.5))
    out_mix *= dbg(-14 - integrated(out_mix)); out_mix = limit(out_mix, dbg(-1.3))
    tp = true_peak(out_mix)
    if tp > -1.0:
        out_mix *= dbg(-1.0 - tp)
    out_mix = fades(out_mix, 0.0, 1.2)
    write_wav(os.path.join(out, "music.wav"), mus * gm); write_wav(os.path.join(out, "sfx.wav"), fx * gf); write_wav(os.path.join(out, "mix.wav"), out_mix)
    print("mix", round(integrated(out_mix), 2), "LUFS, TP", round(true_peak(out_mix), 2), "dBTP, dur", DUR)


if __name__ == "__main__":
    mix(sys.argv[1], sys.argv[3])
