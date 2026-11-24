# "Medusa": an original ancient-Greek-flavoured score and sound design generated in code (free, nothing sampled), cut to
# the narration's word timings and mixed with it (-14 LUFS, true peak under -1 dBTP).
# Identity: a plucked lyre in D Phrygian over a drone, a frame-drum heartbeat, low choir-like pads for the gods,
# a harp sweep for the gifts, a rising drum ride into the strike, snake hiss and grinding stone, wing beats for Pegasus.
# usage: python medusa_audio.py <voice.wav> <story_dir> <outdir>
import json
import math
import os
import sys
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav, lp, hp, bp, colored, smooth_noise
import instruments as I
import sfx_gen as G
from vasa_audio import limit

F = I.m2f
R = rng(1628 + 7)
STORY = sys.argv[2] if len(sys.argv) > 2 else "../../stories/medusa"
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


# D Phrygian: D Eb F G A Bb C
CH = {"Dm": [38, 50, 57, 62, 65], "Eb": [39, 51, 58, 63, 67], "Gm": [43, 55, 58, 62, 67], "Bb": [46, 50, 58, 62, 65], "Csus": [36, 48, 55, 60, 65], "Dsus": [38, 50, 57, 62, 67], "Am": [45, 52, 57, 60, 64]}


def lyre(buf, t, m, vel=0.5, p=0.0, dur=1.6):
    place(buf, pan(I.pluck(F(m), vel, R, dur=dur, bright=0.55, pos=0.13), p), t)


def drum(buf, t, vel=0.6, low=True):
    place(buf, pan(I.timpani(F(33 if low else 40), vel, R, dur=0.7 if low else 0.4), 0), t)


def padc(buf, t, ch, dur, vel=0.3, warm=650, trem=None):
    if dur > 0.2:
        place(buf, I.pad([F(m) for m in CH[ch]], dur, vel, R, att=1.0, rel=1.5, warm=warm, trem=trem), t)


def lyre_line(buf, a, b, notes, step=0.42, vel=0.45):
    t, k = a, 0
    while t < b - 0.1:
        lyre(buf, t, notes[k % len(notes)], vel * (1.0 if k % 4 == 0 else 0.75), 0.25 * math.sin(k))
        t += step; k += 1


def heartbeat(buf, a, b, period=1.1, vel=0.5):
    t = a
    while t < b - 0.2:
        drum(buf, t, vel); drum(buf, t + 0.22, vel * 0.6); t += period


def music():
    buf = np.zeros((2, N))
    # 0: a calm lyre over a drone (the young woman by the sea)
    padc(buf, 0.0, "Dm", S[1] + 0.4, 0.26, warm=800)
    lyre_line(buf, 0.4, S[1], [62, 65, 69, 67, 65, 63, 62, 57], 0.46, 0.42)
    # 1: the temple: the drone darkens, a low hit on "attacked"
    padc(buf, S[1], "Eb", S[2] - S[1] + 0.4, 0.3, warm=500)
    place(buf, pan(I.timpani(F(31), 0.9, R, dur=2.4), 0), wt(1, "attacked") - 0.05)
    # 2: Athena's judgement: a stern choir-like pad, a drum on "punished Medusa"
    padc(buf, S[2], "Gm", S[3] - S[2] + 0.4, 0.34, warm=450)
    drum(buf, wt(2, "punished", 1) - 0.05, 0.9)
    # 3: the curse: tremolo pad, hits on "snakes" and "stone"
    padc(buf, S[3], "Eb", S[4] - S[3] + 0.4, 0.34, warm=420, trem=7.0)
    drum(buf, wt(3, "snakes") - 0.05, 0.9); place(buf, pan(I.cymbal(0.4, R, dur=2.0, bright=0.6), 0), wt(3, "stone") - 0.05)
    # 4: the edge of the world: a thin drone and a slow heartbeat
    padc(buf, S[4], "Dsus", S[5] - S[4] + 0.4, 0.26, warm=380)
    heartbeat(buf, S[4] + 0.3, S[5], 1.2, 0.45)
    # 5-8: the quest: a driving lyre ostinato over a frame drum
    padc(buf, S[5], "Dm", S[6] - S[5] + 0.4, 0.28, warm=600)
    drum(buf, wt(5, "lowkey") - 0.05, 0.8)
    padc(buf, S[6], "Bb", S[8] - S[6] + 0.4, 0.28, warm=800)
    lyre_line(buf, S[6] + 0.1, S[8], [62, 69, 67, 69, 65, 69, 63, 69], 0.21, 0.36)
    t = S[6] + 0.1
    while t < S[8] - 0.2:
        drum(buf, t, 0.42, low=True); drum(buf, t + 0.63, 0.25, low=False); t += 0.84
    # harp sweeps for each gift
    for w in [(6, "hermes"), (6, "athena"), (7, "sandals"), (7, "bag"), (7, "helmet")]:
        t0 = wt(*w) - 0.35
        for j, m in enumerate([62, 63, 65, 67, 69, 70, 72, 74]):
            lyre(buf, t0 + j * 0.035, m, 0.22, -0.4 + j * 0.1, dur=1.2)
    # 8: the cave: hush, a single lyre note now and then
    padc(buf, S[8], "Eb", S[9] - S[8] + 0.3, 0.24, warm=350)
    for j in range(3):
        lyre(buf, S[8] + 0.6 + j * 1.6, [57, 58, 57][j], 0.3, 0.2)
    # 9: the strike: a drum roll into "swing", then a bright open chord for Pegasus
    ts = wt(9, "swing"); t = ts - 1.6
    while t < ts:
        drum(buf, t, 0.25 + 0.5 * (1 - (ts - t) / 1.6), low=False); t += 0.08
    place(buf, pan(I.timpani(F(29), 1.0, R, dur=2.8), 0), ts); place(buf, pan(I.cymbal(0.8, R, dur=3.0), 0), ts)
    padc(buf, wt(9, "pegasus") - 0.3, "Dsus", S[10] - wt(9, "pegasus") + 0.6, 0.38, warm=1400)
    for j, m in enumerate([62, 69, 74, 76, 81]):
        lyre(buf, wt(9, "pegasus") - 0.2 + j * 0.12, m, 0.4, -0.3 + j * 0.15, dur=2.2)
    # 10: the court turns to stone: driving heartbeat and a crash
    padc(buf, S[10], "Gm", S[11] - S[10] + 0.4, 0.32, warm=500, trem=6.0)
    heartbeat(buf, S[10] + 0.2, wt(10, "stone") - 0.2, 0.75, 0.55)
    place(buf, pan(I.timpani(F(31), 1.0, R, dur=2.6), 0), wt(10, "stone") - 0.05); place(buf, pan(I.cymbal(0.6, R, dur=2.6, bright=0.7), 0), wt(10, "stone") - 0.05)
    # 11-13: resolution and the question: the opening lyre theme returns, slower, and is left unresolved
    padc(buf, S[11], "Bb", S[12] - S[11] + 0.4, 0.28, warm=700)
    padc(buf, S[12], "Dm", S[13] - S[12] + 0.4, 0.28, warm=900)
    lyre_line(buf, S[12] + 0.3, S[13], [62, 65, 69, 67, 65, 63], 0.6, 0.36)
    padc(buf, S[13], "Eb", DUR - S[13], 0.3, warm=500)
    for j, m in enumerate([62, 63, 65, 63]):
        lyre(buf, S[13] + 0.4 + j * 0.7, m, 0.38, 0.1)
    lyre(buf, DUR - 2.0, 63, 0.4, 0, dur=2.4)
    return buf


# ---------------------------------------------------------------- effects
def hiss(dur, level=1.0):
    n = ns(dur); t = np.arange(n) / SR
    env = np.clip(np.sin(np.pi * np.clip(t / dur, 0, 1)), 0, 1) ** 0.5
    x = bp(colored(n, R, 0.0), 3500, 9500, 2) * env * (0.6 + 0.4 * smooth_noise(n, R, 6.0))
    return pan(x * level, 0)


def grind(dur, level=1.0):
    n = ns(dur); t = np.arange(n) / SR
    rum = lp(colored(n, R, 1.5), 180, 2) * 1.2
    crk = G.rattle(dur, R, density=40.0, heavy=True) * 0.5 if hasattr(G, "rattle") else 0
    env = np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.6, 0, 1)
    return pan((rum + crk) * env * level, 0)


def wingbeat():
    return G.whoosh(0.45, R, 0.35, 200, 1400, 0.9, 0.2, 0.3) * 0.9


def sfx():
    buf = np.zeros((2, N))
    # sea and wind by the shore
    place(buf, fades(G.water_bed(S[1] + 0.5, R, close=0.3) * 0.5, 0.5, 0.6), 0.0)
    place(buf, fades(G.breeze(S[1] + 0.5, R, 0.6, 0.3, 1100), 0.5, 0.6), 0.0)
    # the temple: a cold sea surge on "Poseidon"
    place(buf, fades(G.water_bed(2.6, R, close=1.0, slosh_rate=1.2) * 0.8, 0.6, 1.0), wt(1, "poseidon") - 0.5)
    place(buf, fades(G.whoosh(2.0, R, 0.4, 150, 900, 1.0, 0.6) * 0.6, 0.3, 0.8), wt(1, "poseidon") - 0.2)
    # the curse: snake hiss swelling, then stone
    place(buf, hiss(2.6, 0.5), wt(3, "snakes") - 0.4)
    place(buf, hiss(1.6, 0.3), wt(3, "snakes") + 1.6)
    place(buf, grind(1.8, 0.8), wt(3, "stone") - 0.1)
    # the edge of the world: wind, a far hiss from the cave
    place(buf, fades(G.breeze(S[5] - S[4] + 0.5, R, 1.0, 0.4, 700), 0.4, 0.6), S[4] - 0.2)
    place(buf, hiss(1.8, 0.2), S[4] + 2.0)
    # gifts: a metallic ring for the blade and the shield
    place(buf, pan(G.clink(R, 2400, 1.4, 1.4) * 0.6, -0.3), wt(6, "hermes") + 0.1)
    place(buf, pan(G.clink(R, 900, 1.8, 0.8) * 0.7, 0.3), wt(6, "athena") + 0.1)
    for k in range(3):
        place(buf, pan(wingbeat() * 0.4, -0.3), wt(7, "sandals") + k * 0.3)
    # the cave: drips and slow breathing hiss of sleeping snakes
    for j in range(6):
        place(buf, pan(G.clink(R, 1800 + j * 90, 0.08, 0.5) * 0.25, -0.6 + j * 0.25), S[8] + 0.4 + j * 0.7)
    place(buf, hiss(3.0, 0.18), S[8] + 0.5)
    # the strike: a blade swish, then wing beats as Pegasus rises
    place(buf, G.whoosh(0.5, R, 0.25, 1200, 7000, 0.7, 0.15, 0.6) * 1.2, wt(9, "swing") - 0.1)
    for k in range(5):
        place(buf, pan(wingbeat() * (0.6 + 0.1 * k), 0.2 * math.sin(k)), wt(9, "pegasus") - 0.2 + k * 0.42)
    # the court: murmurs cut off by grinding stone
    st = wt(10, "stone")
    place(buf, fades(G.babble(st - S[10], R, 130, 1.0, active=0.5) * 0.25, 0.4, 0.2), S[10])
    place(buf, pan(hiss(1.4, 0.35)[0], 0), wt(10, "held") - 0.2)
    place(buf, grind(2.4, 1.0), st - 0.2)
    # the shield: a long metallic ring
    place(buf, pan(G.clink(R, 700, 2.4, 0.7) * 0.6, 0), S[11] + 0.3)
    # shore again for the survivor, then a last hiss
    place(buf, fades(G.water_bed(S[13] - S[12] + 0.5, R, close=0.3) * 0.45, 0.6, 0.6), S[12] - 0.2)
    place(buf, hiss(2.2, 0.3), DUR - 3.0)
    return buf


def mix(voice_path, out):
    os.makedirs(out, exist_ok=True)
    v, sr = read_wav(voice_path)
    v = v[0] if v.ndim > 1 else v
    voice = np.zeros(N); voice[: min(N, len(v))] = v[: min(N, len(v))]
    mus, fx = music(), sfx()
    ir = make_ir(2.2, 21, hf=1.0)          # a big stone hall
    mus = mus + 0.24 * convolve_st(mus, ir)
    fx = fx + 0.1 * convolve_st(fx, ir)
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
