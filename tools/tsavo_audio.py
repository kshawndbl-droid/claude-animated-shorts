# Music + sound for the full Tsavo Short, generated in code (numpy/scipy, no samples, so it is free to use) and mixed
# under the narration with ducking. Times are story seconds (words.json / lines.json).
# usage: python3 tools/tsavo_audio.py <voice.wav|mp3> <words.json> <out.wav> [length_s]
import json
import subprocess
import sys

import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
voice_p, words_p, out_p = sys.argv[1:4]
LEN = float(sys.argv[4]) if len(sys.argv) > 4 else 84.5
N = int(LEN * SR)
rng = np.random.default_rng(1898)
t = np.arange(N) / SR


def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "lowpass", fs=SR, output="sos"), x)


def env(a, b, fade=1.0):
    """0..1 gate over story time a..b with fades"""
    return np.clip(np.minimum((t - a) / fade, (b - t) / fade), 0, 1)


def place(buf, x, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += gain * x[:n]


def decay(dur, k):
    tt = np.arange(int(dur * SR)) / SR
    return tt, np.exp(-tt * k)


def reverb(x, secs=1.8, wet=0.3):
    tt = np.arange(int(secs * SR)) / SR
    ir = rng.standard_normal(len(tt)) * np.exp(-tt * 3.5 / secs)
    ir = lp(ir, 5000)
    y = fftconvolve(x, ir)[:len(x)]
    return x + wet * y / (np.max(np.abs(y)) + 1e-9) * np.max(np.abs(x))


music = np.zeros(N)
sfx = np.zeros(N)

# --- drones: a low pad that changes colour per section (night minor, parliament, morning, lab, study, museum)
def pad(freqs, a, b, gain, fade=1.5, wob=0.15):
    g = env(a, b, fade)
    s = sum(np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * wob * t + i)) / (i + 1) for i, f in enumerate(freqs))
    return g * gain * s


music += pad([55, 82.4, 110, 130.8], 0, 22.2, 0.12)           # A minor night
music += pad([49, 73.4, 98, 116.5], 21.6, 40.2, 0.13)          # G minor, tighter
music += pad([65.4, 98, 130.8, 164.8], 39.6, 44.4, 0.10)       # C major-ish, Parliament
music += pad([46.2, 69.3, 92.5, 110], 44.0, 50.1, 0.14, fade=0.8)  # F# dark, platform
music += pad([58.3, 87.3, 116.5, 146.8], 50.6, 65.5, 0.10)     # Bb, morning and aftermath
music += pad([61.7, 92.5, 123.5, 185], 65.2, 73.6, 0.08)       # B, lab (cooler)
music += pad([55, 82.4, 110, 164.8], 73.2, 78.0, 0.10)         # A, study
music += pad([43.7, 65.4, 87.3, 130.8, 174.6], 77.6, LEN, 0.12, fade=2.0)  # F, museum swell
music += 0.5 * lp(rng.standard_normal(N), 180) * env(77.6, LEN, 3) * np.clip((t - 77.6) / 6, 0, 1) * 0.15

# --- pulse / drums for the hunt sections
def drum(at, gain, f0=60, dur=0.6):
    tt, e = decay(dur, 7)
    x = np.sin(2 * np.pi * (f0 + 40 * np.exp(-tt * 25)) * tt) * e + 0.3 * lp(rng.standard_normal(len(tt)), 900) * np.exp(-tt * 30)
    place(music, x, at, gain)


bt = 22.0
while bt < 34.0:
    drum(bt, 0.5 + 0.3 * (bt - 22) / 12)
    drum(bt + 0.75, 0.3, f0=72)
    bt += 1.5 - 0.6 * (bt - 22) / 12
for k, b0 in enumerate(np.arange(35.6, 38.4, 1.4)):
    drum(b0, 0.35, f0=50)
# heartbeat on the platform, speeding up toward the shot
hb = 44.4
while hb < 49.7:
    r = 1.0 - 0.45 * (hb - 44.4) / 5.3
    drum(hb, 0.55, f0=48, dur=0.35)
    drum(hb + 0.22, 0.35, f0=44, dur=0.3)
    hb += r

# --- night ambience: crickets (pulsed high tones) and a little wind
def crickets(a, b, gain):
    """real-sounding crickets: short trains of 3-4 scratchy pulses (band-passed noise, no pure tones), several
    insects at different rates and distances, so it is a soft texture and never a whistle"""
    g = env(a, b, 1.5)
    c = np.zeros(N)
    for k in range(7):
        rate = rng.uniform(0.9, 1.8)              # chirps per second
        f0 = rng.uniform(3600, 5200)
        lvl = rng.uniform(0.3, 1.0)
        at = a + rng.uniform(0, 1)
        while at < b:
            for p in range(rng.integers(3, 5)):
                tt, e = decay(0.018, 260)
                place(c, rng.standard_normal(len(tt)) * e * lvl, at + p * 0.028, 1.0)
            at += 1 / rate * rng.uniform(0.85, 1.15)
    c = bp(c, 3400, 6200)
    return g * gain * c


sfx += crickets(0, 21.9, 0.09) + crickets(21.6, 39.9, 0.07) + crickets(44.0, 50.0, 0.08)
wind = bp(rng.standard_normal(N), 200, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t))
sfx += wind * 0.05 * (env(0, 39.9, 2) + env(44, 50.2, 1))
# fire crackle under the thorn fences and in the study
crack = np.zeros(N)
for at in np.sort(rng.uniform(0, LEN, 900)):
    tt, e = decay(0.03, 160)
    place(crack, rng.standard_normal(len(tt)) * e, at, rng.uniform(0.2, 1.0))
crack = bp(crack, 1200, 7000) + 0.3 * lp(rng.standard_normal(N), 300)
sfx += crack * 0.08 * (env(21.8, 26.0, 0.8) + env(73.3, 77.9, 0.6))

# --- lion growls (filtered noise with a slow rumble), never close
def growl(at, dur, gain):
    tt = np.arange(int(dur * SR)) / SR
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 23 * tt) * np.sin(np.pi * tt / dur)
    x = bp(rng.standard_normal(len(tt)), 70, 400) * am * np.sin(np.pi * tt / dur) ** 0.7
    x = x + 0.4 * np.sin(2 * np.pi * (55 + 8 * np.sin(5 * tt)) * tt) * np.sin(np.pi * tt / dur)
    place(sfx, reverb(x, 1.5, 0.4), at, gain)


growl(13.4, 1.8, 0.35)
growl(16.9, 1.4, 0.3)
growl(26.2, 1.2, 0.28)
growl(83.45, 1.6, 0.22)

# --- stingers / hits
def hit(at, gain, f0=38):
    tt, e = decay(2.5, 1.8)
    x = np.sin(2 * np.pi * f0 * tt) * e + 0.5 * lp(rng.standard_normal(len(tt)), 200) * np.exp(-tt * 4)
    place(music, reverb(x, 2.5, 0.5), at, gain)


hit(0.05, 0.6)
hit(5.0, 0.55)
hit(62.4, 0.5)
hit(83.2, 0.55, f0=43.7)
# nothing: everything drops out for a beat
duck_nothing = 1 - 0.85 * env(34.2, 35.3, 0.15)
music *= duck_nothing

# --- gunshots: a sharp crack with a long outdoor tail; nine distant, quieter shots for the second lion
def shot(at, gain, dist=False):
    tt, e = decay(0.25, 40)
    x = rng.standard_normal(len(tt)) * e + 0.8 * np.sin(2 * np.pi * 80 * tt) * np.exp(-tt * 25)
    if dist:
        x = lp(x, 1500)
    place(sfx, reverb(x, 2.2, 0.6), at, gain)


shot(49.92, 0.9)
music *= 1 - 0.9 * env(49.95, 50.6, 0.1)   # silence after the shot
for k in range(9):
    shot(58.25 + k * 0.15 + rng.uniform(0, 0.04), 0.22, dist=True)
# morning birds
for at in np.arange(50.9, 54.3, 0.55):
    tt = np.arange(int(0.18 * SR)) / SR
    f = 2600 + 900 * np.sin(np.pi * tt / 0.18) + rng.uniform(-300, 300)
    place(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.18) * 0.5, at + rng.uniform(0, 0.2), 0.12)
# lab: soft clock ticks and a chime on "35"
for at in np.arange(65.5, 73.2, 0.5):
    tt, e = decay(0.03, 200)
    place(sfx, bp(rng.standard_normal(len(tt)), 2000, 6000) * e, at, 0.12)
tt, e = decay(2.0, 2.0)
place(music, (np.sin(2 * np.pi * 880 * tt) + 0.5 * np.sin(2 * np.pi * 1320 * tt)) * e, 70.62, 0.12)
# study: a slow low piano-like figure
for k, (at, f) in enumerate([(73.4, 220), (74.4, 196), (75.4, 174.6), (76.4, 164.8)]):
    tt, e = decay(2.5, 1.6)
    place(music, (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(4 * np.pi * f * tt)) * e * (1 - np.exp(-tt * 200)), at, 0.12)
# museum: room tone
sfx += lp(rng.standard_normal(N), 400) * 0.03 * env(77.7, LEN, 1)

# --- duck the music under the narration
W = json.load(open(words_p))
speech = np.zeros(N)
for w in W:
    a, b = int(max(0, w["s"] - 0.08) * SR), int(min(LEN, w["e"] + 0.15) * SR)
    speech[a:b] = 1
speech = lp(speech, 3, order=1)
duck = 1 - 0.55 * np.clip(speech, 0, 1)

voice = load(voice_p)[:N]
voice = np.pad(voice, (0, N - len(voice)))
bed = (music * duck * 0.55 + sfx * (1 - 0.3 * np.clip(speech, 0, 1)))
fade = np.clip((LEN - t) / 1.0, 0, 1)
mix = (voice * 1.0 + bed) * fade
mix /= max(1.0, np.max(np.abs(mix)) / 0.95)
import wave
with wave.open(out_p, "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((mix * 32767).astype(np.int16).tobytes())
print("wrote", out_p, LEN, "s")
