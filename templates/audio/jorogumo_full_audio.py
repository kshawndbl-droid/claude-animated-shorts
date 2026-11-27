# Full sound for "The Spider Woman" (41.0 s): the approved narration (unchanged, with its faint rain bed) plus a score
# and SFX made entirely in code (free). Cues come from the four picture parts:
#  A 0-7.4   rain, a dark drone, a web-thread twang (2.72), a cold swell as her face forms (4.9), a low hit as the eyes
#            open (6.72); 7.4-15.2 = the approved style preview sound (footsteps, creak, far thunder, scare 1 at 13.68)
#  B 15.2-25.2  biwa (Karplus-Strong plucked strings) on her plucks, then a slow eerie biwa figure; held breath before
#            scare 2 on "Silk" (22.36): tension snap, whip, hit, shriek
#  C 25.2-33.9  lantern sputter, chitin clicks as the eight legs unfold, FINAL scare 29.0-29.6 (reverse swell, distorted
#            inhuman scream, metallic shriek, growl, heavy impact; the loudest moment), black silence, the slash (30.3),
#            then after "The music stops." (31.72) only a faint room tone
#  D 33.9-41  dawn: rain gone, faint birds, a low drone that rises up the wall, a tiny sting on the red points (40.05),
#            a soft low thud on the cut to black (40.62)
# usage: python jorogumo_full_audio.py voice.wav out.wav
import json, subprocess, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, sawtooth

SR, DUR = 48000, 41.0
N = int(DUR * SR); t = np.arange(N) / SR
rng = np.random.default_rng(1603)
bp = lambda x, lo, hi, o=2: sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)
lp = lambda x, f: sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)
hp = lambda x, f: sosfilt(butter(2, f, "high", fs=SR, output="sos"), x)
env = lambda t0, a, d: np.where(t >= t0, np.minimum(1, (t - t0) / max(a, 1e-4)) * np.exp(-np.maximum(0, t - t0 - a) / d), 0)
ramp = lambda t0, t1: np.clip((t - t0) / (t1 - t0), 0, 1)
db = lambda v: 10 ** (v / 20)
sm = lambda v: np.clip(v, 0, 1) ** 2 * (3 - 2 * np.clip(v, 0, 1))

def place(sig, at, out, g=1.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if n > 0: out[i:i + n] += sig[:n] * g

voice = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                     capture_output=True).stdout, np.float32).astype(np.float64)
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]

# ---------- rain + storm (night: 0 to 29.0, gone by the dawn) ----------
night = 1 - ramp(28.9, 29.0)
rainL = hp(lp(rng.standard_normal(N), 7000), 700) * 0.6 + bp(rng.standard_normal(N), 150, 600) * 0.4
rainR = hp(lp(rng.standard_normal(N), 7000), 700) * 0.6 + bp(rng.standard_normal(N), 150, 600) * 0.4
gust = 0.75 + 0.25 * np.sin(t * 0.7) * np.sin(t * 0.23 + 1)
drips = np.zeros(N)
for k in range(200):
    i = int(rng.uniform(0, 29.0 * SR)); drips[i:i + 1200] += np.exp(-np.arange(1200) / 120) * np.sin(2 * np.pi * rng.uniform(1800, 3200) * np.arange(1200) / SR)
inside = 1 - 0.45 * ramp(15.0, 15.6) * (1 - ramp(25.0, 25.4))   # quieter under the biwa scene
rain = np.stack([rainL, rainR]) * gust * night * inside * db(-27) + drips * db(-38)
mono = np.zeros(N)

# ---------- drone (the bed of the whole film) ----------
drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 58.3 * t) + 0.4 * np.sin(2 * np.pi * 82.4 * t)) / 2
dlev = (0.5 + 0.5 * ramp(0, 3)) * (1 - ramp(29.0, 29.02)) + 0.6 * ramp(33.9, 35.0) * (1 + 0.8 * ramp(37.4, 39.6)) * (1 - ramp(40.62, 40.64))
mono += drone * dlev * db(-28)

# ---------- Part A ----------
# web-thread twang: a single low plucked string with a slow bend down (2.72)
def ks(freq, dur, bright=0.5, decay=0.996):
    n = int(dur * SR); L = max(2, int(SR / freq)); buf = rng.uniform(-1, 1, L) * 1.0
    buf = lp(buf, 1500 + 5000 * bright) if L > 30 else buf
    y = np.zeros(n)
    for i in range(n):
        y[i] = buf[i % L]
        buf[i % L] = decay * 0.5 * (buf[i % L] + buf[(i + 1) % L])
    return y
twang = ks(98, 2.2, 0.3, 0.998); twang *= np.exp(-np.arange(len(twang)) / SR / 0.9)
place(twang, 2.72, mono, db(-14))
# cold swell as the face forms in the web (4.9-6.7), then a low hit with a glassy ring as the eyes open (6.72)
sw = sum(np.sin(2 * np.pi * f * t) for f in (311, 330, 466)) / 3 * sm((t - 4.9) / 1.8) * (t < 6.72) * db(-26)
mono += sw
hitA = np.sin(2 * np.pi * (52 * np.exp(-np.maximum(0, t - 6.72) * 2)) * np.maximum(0, t - 6.72)) * env(6.72, 0.003, 0.6) * db(-6)
glass = sum(np.sin(2 * np.pi * f * t) for f in (1760, 2489, 3322)) / 3 * env(6.72, 0.002, 0.9) * db(-24)
mono += hitA + glass

# ---------- 7.4-15.2: the approved style preview sound (same code, shifted) ----------
OFF = 7.4
FLASH, FAR = 13.68, 9.05
dt = 1 / 240; ts = np.arange(0, 7.8, dt); v = 0.6 * sm((ts - 0.15) / 0.6) * sm((3.3 - ts) / 0.6) * (ts > 0.15) * (ts < 3.3)
dist = np.cumsum(v) * dt
steps = []
for o in (0.0, 0.5):
    c = np.floor(dist / 0.88 + o); steps += list(ts[1:][np.diff(c) > 0] + OFF)
for s in steps:
    L = int(0.12 * SR)
    burst = lp(rng.standard_normal(L), 900) * np.exp(-np.arange(L) / (0.02 * SR)) + 0.3 * bp(rng.standard_normal(L), 2000, 5000) * np.exp(-np.arange(L) / (0.01 * SR))
    place(burst, s, mono, db(-16))
mono += np.sin(2 * np.pi * (180 + 60 * np.sin(t * 9)) * t) * env(OFF + 3.35, 0.05, 0.25) * (1 + 0.5 * np.sign(np.sin(2 * np.pi * 34 * t))) * db(-34)
rum = lp(rng.standard_normal(N), 140)
mono += rum * env(FAR + 0.7, 0.4, 1.0) * db(-12)
duck1 = 1 - 0.75 * ramp(FLASH - 0.9, FLASH - 0.15) * (t < FLASH)
mono += hp(rng.standard_normal(N), 1500) * env(FLASH, 0.002, 0.08) * db(-8) + rum * env(FLASH, 0.01, 0.9) * db(-1)
mono += np.sin(2 * np.pi * (48 * np.exp(-np.maximum(0, t - FLASH) * 2.2)) * np.maximum(0, t - FLASH)) * env(FLASH, 0.003, 0.5) * db(-1)
rise = sum(np.sin(2 * np.pi * f * (1 + 0.25 * ramp(FLASH - 1.6, FLASH)) * t) for f in (220, 233, 311)) / 3
mono += rise * ramp(FLASH - 1.6, FLASH) * (t < FLASH) * db(-30)

# ---------- Part B: the biwa ----------
PLUCKS = [15.30, 15.92, 16.28, 16.90, 17.52, 17.86, 18.50, 19.12]
scale = [146.8, 164.8, 174.6, 220.0, 233.1, 293.7]   # D in-sen (D Eb... minor pentatonic-like, Japanese colour)
melody = [5, 3, 4, 2, 3, 0, 1, 0]
biwa = np.zeros(N)
def pluck(f, g=1.0, dur=1.6):
    y = ks(f, dur, 0.75, 0.9965); y2 = ks(f * 2.0, dur * 0.6, 0.9, 0.994); y[:len(y2)] += 0.35 * y2
    y += 0.6 * bp(rng.standard_normal(len(y)), 1500, 5000) * np.exp(-np.arange(len(y)) / (0.004 * SR))   # the bachi's buzz/sawari
    return np.tanh(1.5 * y) * g
for k, p in enumerate(PLUCKS):
    place(pluck(scale[melody[k]]), p, biwa, db(-12))
# after the close-up cut: a slow, sparser figure that bends flat as things go wrong, until the lantern scene
fig = [(19.9, 2, 1.0), (20.7, 0, 1.0), (21.4, 1, 0.985)]
for tt, k, bend in fig:
    place(pluck(scale[k] * bend, 0.8), tt, biwa, db(-15))
for tt in np.arange(23.4, 28.8, 0.78):
    k = [0, 1, 0, 4][int((tt - 23.4) / 0.78) % 4]
    place(pluck(scale[k] * (1 - 0.012 * (tt - 23.4) / 5), 0.7), tt, biwa, db(-17))
duck2 = 1 - 0.8 * ramp(21.55, 22.2) * (t < 22.36)
mono += biwa * duck2
# scare 2 on "Silk" (22.36): a thin string pulled tight snapping, a whip, a hit, a short shriek
S2 = 22.36
mono += np.sin(2 * np.pi * (900 + 1400 * ramp(S2 - 0.8, S2)) * t) * ramp(S2 - 0.8, S2) * (t < S2) * db(-34)
mono += hp(rng.standard_normal(N), 2500) * env(S2, 0.001, 0.05) * db(-12)
mono += bp(rng.standard_normal(N), 400, 3000) * env(S2 - 0.08, 0.06, 0.08) * db(-14)
mono += np.sin(2 * np.pi * (55 * np.exp(-np.maximum(0, t - S2) * 2.5)) * np.maximum(0, t - S2)) * env(S2, 0.003, 0.45) * db(-12)
mono += sum(np.sin(2 * np.pi * f * t + 2.5 * np.sin(2 * np.pi * 9 * t)) for f in (1480, 1568, 2217)) / 3 * env(S2, 0.004, 0.35) * db(-60)
mono += sum(np.sin(2 * np.pi * f * t) for f in (207.7, 220, 233.1)) / 3 * env(S2 + 0.2, 0.3, 1.6) * db(-30)

# ---------- Part C ----------
# lantern sputter (25.2-29.0): small crackles and a breathy flame
for k in range(40):
    tt = rng.uniform(25.2, 28.6); L = int(0.03 * SR)
    place(hp(rng.standard_normal(L), 2000) * np.exp(-np.arange(L) / (0.004 * SR)), tt, mono, db(-28))
mono += bp(rng.standard_normal(N), 200, 900) * ramp(25.2, 25.6) * (1 - ramp(28.45, 28.7)) * (0.6 + 0.4 * np.sin(t * 17)) * db(-36)
# chitin clicks as the eight legs unfold on the wall (27.0-28.7), getting faster
tt = 27.0
while tt < 28.6:
    L = int(0.02 * SR)
    place(bp(rng.standard_normal(L), 2500, 7000) * np.exp(-np.arange(L) / (0.003 * SR)), tt, mono, db(-20))
    tt += 0.16 - 0.1 * (tt - 27.0) / 1.7
mono += sum(np.sin(2 * np.pi * f * t) for f in (110, 116.5, 155.6)) / 3 * ramp(26.8, 28.5) * (1 - ramp(28.5, 28.7)) * db(-24)
# FINAL scare (as the approved Hidebehind v3 hit): 29.0-29.6, then hard silence
A, C = 29.2, 30.0   # the reveal: cut to her face on the end of "legs." (29.17), black at 30.0
n = int((C - A) * SR); u = np.arange(n) / SR
f0 = (480 + 520 * (1 - np.exp(-u / 0.12))) * (1 + 0.035 * np.sin(2 * np.pi * 6.5 * u))
src = sawtooth(2 * np.pi * np.cumsum(f0) / SR) + 0.6 * rng.standard_normal(n)
scream = bp(src, 700, 1000) + bp(src, 1050, 1400) * 0.8 + bp(src, 2600, 3300) * 0.6 + bp(src, 3800, 5200) * 0.3
scream = np.tanh(3 * scream / (np.abs(scream).max() + 1e-9))
shr = sum(np.sin(2 * np.pi * f * (1 + 0.15 * u) * u + i) for i, f in enumerate([1870, 2470, 3310, 4120, 5230])) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * u))
gr = bp(np.tanh(4 * sawtooth(2 * np.pi * np.cumsum(95 * np.exp(-u * 0.7) + 40) / SR) * (1 + np.sin(2 * np.pi * 29 * u))), 60, 1800)
imp = np.sin(2 * np.pi * np.cumsum(np.linspace(58, 24, n)) / SR) * np.exp(-u / 0.4) * 2.2 + rng.standard_normal(n) * np.exp(-u / 0.012) * 1.5
e = np.interp(u, [0, 0.006, 0.3, C - A], [0, 1, 0.9, 0.85])
hit = (0.9 * scream + 0.25 * shr / 5 + 0.6 * gr) * e + imp
hit = np.tanh(1.7 * hit / np.sqrt((hit ** 2).mean())) * 0.97
hit[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
m = int(0.32 * SR); swell = bp(rng.standard_normal(m), 300, 6000) * np.linspace(0, 1, m) ** 4 * 0.35
# the slash (30.3): a fast air rip and a bright blade ring in the black
SL = 30.3
slash = bp(rng.standard_normal(N), 1200, 9000) * np.exp(-((t - SL + 0.04) / 0.05) ** 2) * db(-4)
slash += sum(np.sin(2 * np.pi * f * t) for f in (2960, 4430, 5920)) / 3 * env(SL + 0.02, 0.002, 0.5) * db(-16)
mono += slash
# after "The music stops." only a faint room tone and one far drip
room = lp(rng.standard_normal(N), 400) * (ramp(31.9, 32.4) * (1 - ramp(33.8, 34.2))) * db(-46)
mono += room

# ---------- Part D: dawn ----------
birds = np.zeros(N)
for k in range(9):
    tt = 34.4 + k * 0.62 + rng.uniform(-0.15, 0.15); L = int(0.16 * SR); uu = np.arange(L) / SR
    fch = 3200 + 900 * np.sin(2 * np.pi * 6 * uu) + rng.uniform(-300, 300)
    place(np.sin(2 * np.pi * np.cumsum(fch) / SR) * np.sin(np.pi * uu / uu[-1]) ** 2, tt, birds, 1.0)
mono += hp(birds, 1500) * (1 - ramp(38.6, 39.6)) * db(-36)
mono += sum(np.sin(2 * np.pi * f * (1 + 0.06 * ramp(37.4, 39.8)) * t) for f in (73.4, 77.8, 110)) / 3 * ramp(37.2, 39.0) * (t < 40.62) * db(-26)
EY = 40.05
mono += sum(np.sin(2 * np.pi * f * t + 2 * np.sin(2 * np.pi * 11 * t)) for f in (2093, 2217)) / 2 * env(EY, 0.01, 0.25) * db(-24)
mono += bp(rng.standard_normal(N), 2000, 8000) * env(EY - 0.15, 0.15, 0.08) * db(-34)
mono += np.sin(2 * np.pi * (44 * np.exp(-np.maximum(0, t - 40.62) * 1.5)) * np.maximum(0, t - 40.62)) * env(40.62, 0.004, 0.35) * db(-8)

# ---------- mix ----------
silence = 1 - ramp(C, C + 0.01) * (1 - ramp(30.2, 30.21))    # dead black after the face (the slash is the only sound)
music_off = 1 - ramp(31.72, 31.76) * (1 - ramp(33.9, 33.95))
hush = 1 - 0.9 * ramp(28.4, 28.75) * (t < A)          # the room holds its breath under "eight legs."
bed = rain * duck1 * hush * silence * music_off + (mono * np.where((t >= FLASH - 0.02) & (t < FLASH + 2), 1, duck1) * hush * silence * music_off)[None]
# the slash and room tone survive the "music off" mutes; the final hit sits on top of everything
bed[:, int(30.0 * SR):int(31.0 * SR)] += slash[int(30.0 * SR):int(31.0 * SR)][None] * (1 - silence[int(30.0 * SR):int(31.0 * SR)])
bed += room[None] * (1 - music_off)
i = int(A * SR)
bed[:, i:i + n] = 0.2 * bed[:, i:i + n] + hit[None] * 1.0
bed[:, i - m:i] += swell[None]
mix = bed * db(-1.5) + voice[None] * db(1.5)
mix[:, i:i + n] = bed[:, i:i + n] * db(1.5) + voice[None, i:i + n] * db(1.5)
mix *= np.minimum(1, t / 0.05) * np.minimum(1, (DUR - t) / 0.08)
mix /= max(1e-9, np.abs(mix).max() / 0.95)
out = sys.argv[2]; raw = out + ".raw.wav"
sf.write(raw, mix.T, SR)
# two-pass loudness: measure, then ONE linear gain to -14 LUFS; only the few transient peaks above -1.5 dBFS are
# caught by a fast peak limiter (no dynamic loudness riding on the whole mix)
mm = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.0:LRA=20:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(mm[mm.rindex("{"):mm.rindex("}") + 1])
g = -14.0 - float(j["input_i"])
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", f"volume={g + 0.15:.2f}dB,aresample=192000,alimiter=limit=0.78:attack=0.5:release=40:level=disabled,aresample=48000", "-ar", str(SR), out], check=True)
print("measured", j["input_i"], j["input_tp"], "gain", round(g, 2), "->", out)
