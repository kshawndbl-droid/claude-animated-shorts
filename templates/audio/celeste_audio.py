# "The Mary Celeste, 1872": an original score and sound design generated in code (free, nothing sampled), cut to the
# narration's real line and word timings, then mixed with the narration (-14 LUFS, true peak under -1 dBTP).
# Musical identity: a slow D-minor music-box motif (a nod to the ship's name) over a cold string pad, a heartbeat
# timpani, low swells into the cuts, and a sea that never stops: waves, wind in the rigging, creaking timber.
# usage: python celeste_audio.py <voice.wav> <story_dir> <outdir>
import json
import math
import os
import sys
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, lp, hp, bp, colored, smooth_noise
import instruments as I
import sfx_gen as G
from vasa_audio import limit, tone, knock

F = I.m2f
R = rng(1872)
STORY = sys.argv[2] if len(sys.argv) > 2 else "../../stories/mary-celeste"
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


CH = {"Dm": [38, 50, 57, 62, 65], "Bb": [34, 50, 58, 62, 65], "Gm": [31, 50, 55, 58, 62], "A": [33, 49, 57, 61, 64], "F": [29, 48, 53, 57, 60],
      "C": [36, 48, 55, 60, 64], "Dsus": [38, 50, 57, 62, 67], "Edim": [40, 52, 55, 58, 64], "A7": [33, 49, 55, 61, 64]}


def padc(buf, t, chord, dur, vel=0.3, warm=700, att=1.2, rel=1.6):
    if dur > 0.2:
        place(buf, I.pad([F(m) for m in CH[chord]], dur, vel, R, att=att, rel=rel, warm=warm), t)


def box(buf, t, m, vel=0.55, p=0.0):
    place(buf, pan(I.musicbox(F(m), vel, R, dur=2.4), p), t)


def timp(buf, t, m=38, vel=0.6):
    place(buf, pan(I.timpani(F(m), vel, R, dur=2.0), 0.0), t)


def swell(dur, f0=55.0):
    """a low cello-ish swell into a cut"""
    n = ns(dur); t = np.arange(n) / SR
    env = (t / dur) ** 2.2
    y = sum(np.sin(2 * np.pi * f0 * k * t + k) / k ** 1.3 for k in range(1, 7)) * env
    y += lp(colored(n, R, 1.0), 400, 2) * env * 0.3
    return fades(y * 0.35, 0.01, 0.04)


MOTIF = [(0, 74), (1, 69), (2, 70), (3, 69), (4, 65), (5.5, 67), (6, 69)]   # D-A-Bb-A-F . G-A (an open question)


def music():
    buf = np.zeros((2, N))
    prog = ["Dm", "Bb", "Gm", "A"]
    # an evolving pad under the whole story, two bars per chord at ~60 bpm, with a darker middle
    t, k = 0.0, 0
    while t < DUR - 1:
        ch = prog[k % 4]
        if S[4] - 0.5 < t < S[5]:
            ch = "Edim"
        padc(buf, t, ch, 4.4, 0.32 if t < S[8] else 0.38, warm=600 + 200 * (k % 2))
        t += 4.0; k += 1
    # the music-box motif: opening, at the family portraits, and at the end
    for t0, sc in [(0.6, 1.0), (S[3] + 0.3, 0.8), (S[11] + 0.2, 0.9), (S[12] + 0.8, 0.75)]:
        for b, m in MOTIF:
            box(buf, t0 + b * 0.55, m, 0.5 * sc, 0.25 * math.sin(b))
    # a heartbeat timpani while the mystery deepens (lines 6-9)
    t = S[6]
    while t < S[9] - 0.3:
        timp(buf, t, 38, 0.38); timp(buf, t + 0.32, 38, 0.24); t += 1.6
    # tension pulse (low strings) during the theories
    t = S[9]
    while t < S[10] - 0.4:
        place(buf, pan(I.pluck(F(38), 0.5, R, dur=0.5, bright=0.2), -0.2), t); place(buf, pan(I.pluck(F(45), 0.35, R, dur=0.4, bright=0.2), 0.2), t + 0.4); t += 0.8
    # a gentler, lighter colour for the myth line (a little irony), then the sombre close
    for j, m in enumerate([62, 65, 69, 67, 65, 62]):
        box(buf, S[10] + 1.2 + j * 0.45, m + 12, 0.32, 0.4)
    padc(buf, S[11], "Gm", S[12] - S[11] + 0.5, 0.36, warm=500)
    padc(buf, S[12], "Dsus", DUR - S[12], 0.34, warm=500, rel=2.5)
    # swells into the big cuts
    for i in (1, 4, 8, 11):
        sw = swell(1.4, 55.0 if i != 4 else 46.0)
        place(buf, pan(sw, 0.0), S[i] - 1.35)
    # "They found no one." a deep hit with the pad dropping out
    timp(buf, wt(4, "no") - 0.05, 33, 0.9)
    return buf


# ---------------------------------------------------------------- effects
def sea_bed(dur, level=1.0, close=0.5):
    n = ns(dur); out = np.zeros((2, n)); t = np.arange(n) / SR
    for ch in range(2):
        wave = 0.55 + 0.45 * np.sin(2 * np.pi * t / (6.5 + ch * 0.7) + ch) ** 2
        surf = bp(colored(n, R, 1.0), 150, 2400, 1) * wave * 0.5
        hiss = bp(colored(n, R, 0.3), 2500, 7000, 1) * wave ** 3 * 0.12
        rum = lp(colored(n, R, 2.0), 120, 2) * 0.4
        out[ch] = (surf + hiss + rum) * level
    return out


def chalk(dur):
    n = ns(dur); t = np.arange(n) / SR
    strokes = (np.sin(2 * np.pi * 3.1 * t) > -0.2).astype(float) * (0.6 + 0.4 * smooth_noise(n, R, 8))
    y = bp(colored(n, R, 0.4), 1500, 6000, 2) * strokes
    return fades(y * 0.35, 0.01, 0.05)


def stamp():
    n = ns(0.4); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.06) + bp(colored(n, R, 0.5), 200, 3000, 1) * np.exp(-t / 0.02) * 0.8
    return y * 0.9


def sfx():
    buf = np.zeros((2, N))
    # the sea outdoors (shots 0, 1, 4, 9 top-down, 12, 13), muffled indoors
    outdoor = [(0, 2), (4, 5), (8, 9), (11, 13)]
    for a, b in outdoor:
        t0, t1 = S[a], S[b] if b < len(S) else DUR
        x = sea_bed(t1 - t0 + 0.6, 1.0); place(buf, fades(x, 0.4, 0.6), t0 - 0.3)
        place(buf, fades(G.breeze(t1 - t0 + 0.6, R, 0.5, 0.15, 800), 0.5, 0.6), t0 - 0.3)
    for a, b in [(2, 4), (5, 8), (9, 11)]:
        x = lp(sea_bed(S[b] - S[a] + 0.6, 0.6), 500, 2); place(buf, fades(x, 0.4, 0.6), S[a] - 0.3)
    # creaking timber and ropes on the empty ship
    for t0 in [1.5, 5.0, S[4] + 0.6, S[5] + 1.0, S[5] + 4.2, S[6] + 0.8, S[12] + 1.5]:
        place(buf, pan(G.creak(1.1 + R.uniform(0, 0.6), R, 70, 130, scale=0.9) * 0.5, R.uniform(-0.6, 0.6)), t0)
    # the spyglass is drawn out
    place(buf, pan(G.whoosh(0.35, R, 0.2, 900, 3000) * 0.4, 0.3), S[1] + 0.2)
    for j in range(3):
        place(buf, pan(G.clink(R, 2400 + j * 300, 0.08) * 0.25, 0.3), S[1] + 0.25 + j * 0.09)
    # the door swinging on the deck, a slow hinge creak
    place(buf, pan(G.creak(1.6, R, 40, 90, scale=1.4) * 0.6, -0.5), S[4] + 0.2)
    # the chair sliding with the roll ("lowkey creepy")
    place(buf, pan(G.creak(0.9, R, 140, 200, scale=0.7) * 0.5, -0.3), wt(5, "lowkey") - 0.2)
    # the lifeboat ropes, the empty desk
    place(buf, pan(G.rattle(0.7, R, 18) * 0.25, 0.2), S[6] + 0.5)
    # chalk on the slate
    place(buf, pan(chalk(2.6), -0.1), S[7] + 0.3)
    # water sloshing in the hold, the sounding rod
    place(buf, fades(G.water_bed(3.0, R, close=0.6), 0.4, 0.5), S[9] + 0.2)
    # theories: a pump clank, a fizz of fumes, wind and spray of the waterspout
    for j in range(3):
        place(buf, pan(G.clink(R, 600 + j * 90, 0.18, 0.6) * 0.5, 0.2), S[9] + 0.6 + j * 0.55)
    tf = wt(9, "Maybe", 1)
    place(buf, pan(fades(bp(colored(ns(1.6), R, 0.0), 3000, 9000, 1) * 0.08, 0.3, 0.6), 0.0), tf)
    ts = wt(9, "waterspout") - 0.6
    place(buf, fades(G.breeze(2.6, R, 1.6, 0.6, 1800), 0.4, 0.8), ts)
    # the MYTH stamp, then the magazine sliding in
    place(buf, pan(stamp(), 0.0), wt(10, "Pure"))
    place(buf, pan(G.whoosh(0.5, R, 0.25, 500, 2500) * 0.5, 0.0), wt(10, "young") + 0.2)
    # a distant bell for the ten people (respectful), and a last long creak as she sails into the fog
    place(buf, pan(I.glock(F(50), 0.35, R, dur=4.0), 0.0), S[11] + 0.4)
    place(buf, pan(G.creak(2.4, R, 30, 60, scale=1.6) * 0.5, 0.4), S[12] + 2.2)
    return buf


def mix(voice_path, out):
    os.makedirs(out, exist_ok=True)
    v, sr = read_wav(voice_path)
    v = v[0] if v.ndim > 1 else v
    voice = np.zeros(N); voice[: min(N, len(v))] = v[: min(N, len(v))]
    mus, fx = music(), sfx()
    ir = make_ir(1.8, 11, hf=1.2)
    mus = mus + 0.22 * convolve_st(mus, ir)
    fx = fx + 0.08 * convolve_st(fx, ir)
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
