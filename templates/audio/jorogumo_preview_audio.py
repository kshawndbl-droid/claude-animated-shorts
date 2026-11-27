# Sound for the spider woman style preview (story 7.4-15.2 s): the approved narration (unchanged, with its faint rain
# bed), plus code-made rain, the samurai's footsteps on tatami (timed from the same walk the picture uses), a floor
# creak, distant thunder, a held-breath build (drone + rising strings, everything ducks), then the scare: thunder
# crack + sub hit + a shrieking string sting, and a low drone after. Free: everything generated here.
import json, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt

SR, OFF, DUR = 48000, 7.4, 7.8
CUT, FLASH, FAR = 11.1 - OFF, 13.68 - OFF, 9.05 - OFF
N = int(DUR * SR); t = np.arange(N) / SR
rng = np.random.default_rng(1603)
bp = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
lp = lambda x, f: sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)
hp = lambda x, f: sosfilt(butter(2, f, "high", fs=SR, output="sos"), x)
env = lambda t0, a, d: np.where(t >= t0, np.minimum(1, (t - t0) / max(a, 1e-4)) * np.exp(-np.maximum(0, t - t0 - a) / d), 0)
db = lambda v: 10 ** (v / 20)

voice = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-ss", str(OFF), "-t", str(DUR), "-i", sys.argv[1], "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                     capture_output=True).stdout, np.float32).astype(np.float64)
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]

# held breath: everything but the voice sinks before the scare, then returns
duck = 1 - 0.75 * np.clip((t - (FLASH - 0.9)) / 0.75, 0, 1) * (t < FLASH)
rainL = hp(lp(rng.standard_normal(N), 7000), 700) * 0.6 + bp(rng.standard_normal(N), 150, 600) * 0.4
rainR = hp(lp(rng.standard_normal(N), 7000), 700) * 0.6 + bp(rng.standard_normal(N), 150, 600) * 0.4
gust = 0.75 + 0.25 * np.sin(t * 0.7) * np.sin(t * 0.23 + 1)
drips = np.zeros(N)
for k in range(40):
    i = int(rng.uniform(0, N - 2000)); drips[i:i + 1200] += np.exp(-np.arange(1200) / 120) * np.sin(2 * np.pi * rng.uniform(1800, 3200) * np.arange(1200) / SR)
rain = np.stack([rainL, rainR]) * gust * db(-27) + drips * db(-38)

# footsteps: same walk as the picture (speed 0.6 m/s from 0.15 to 3.3 s, eased 0.6 s), stride 0.88 m, two feet
sm = lambda v: np.clip(v, 0, 1) ** 2 * (3 - 2 * np.clip(v, 0, 1))
dt = 1 / 240; ts = np.arange(0, DUR, dt); v = 0.6 * sm((ts - 0.15) / 0.6) * sm((3.3 - ts) / 0.6) * (ts > 0.15) * (ts < 3.3)
dist = np.cumsum(v) * dt
steps = []
for o in (0.0, 0.5):
    c = np.floor(dist / 0.88 + o); steps += list(ts[1:][np.diff(c) > 0])
foot = np.zeros(N)
for s in steps:
    i = int(s * SR); L = int(0.12 * SR)
    burst = lp(rng.standard_normal(L), 900) * np.exp(-np.arange(L) / (0.02 * SR)) + 0.3 * bp(rng.standard_normal(L), 2000, 5000) * np.exp(-np.arange(L) / (0.01 * SR))
    foot[i:i + L] += burst[: N - i]
foot *= db(-16)
creak = np.sin(2 * np.pi * (180 + 60 * np.sin(t * 9)) * t) * env(3.35, 0.05, 0.25) * (1 + 0.5 * np.sign(np.sin(2 * np.pi * 34 * t))) * db(-34)

# distant thunder (sound arrives after the far flash), then the scare's thunder crack right on the flash
rum = lp(rng.standard_normal(N), 140)
thunder_far = rum * env(FAR + 0.7, 0.4, 1.0) * db(-12)
crack = hp(rng.standard_normal(N), 1500) * env(FLASH, 0.002, 0.08) * db(-8) + lp(rng.standard_normal(N), 220) * env(FLASH, 0.01, 0.9) * db(-1)
sub = np.sin(2 * np.pi * (48 * np.exp(-np.maximum(0, t - FLASH) * 2.2)) * np.maximum(0, t - FLASH)) * env(FLASH, 0.003, 0.5) * db(-1)
# strings: a slow rise under the held breath, then a shrieking cluster on the scare
rise = sum(np.sin(2 * np.pi * f * (1 + 0.25 * np.clip((t - (FLASH - 1.6)) / 1.6, 0, 1)) * t) for f in (220, 233, 311)) / 3
rise *= np.clip((t - (FLASH - 1.6)) / 1.6, 0, 1) * (t < FLASH) * db(-30)
shriek = sum(np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 7.5 * t)) for f in (1250, 1330, 1790, 2410)) / 4
shriek *= env(FLASH, 0.004, 0.45) * db(-11)
drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 58.3 * t) + 0.4 * np.sin(2 * np.pi * 82.4 * t)) / 2
drone *= (0.35 + 0.65 * np.clip((t - 4.0) / 2.0, 0, 1)) * db(-27)

mono = foot + creak + thunder_far + crack + sub + rise + shriek + drone
mix = rain * duck + (mono * np.where(t >= FLASH - 0.02, 1, duck))[None] + voice[None] * db(0)
fade = np.minimum(1, t / 0.05) * np.minimum(1, (DUR - t) / 0.12)
mix *= fade
mix /= max(1e-9, np.abs(mix).max() / 0.9)
out = sys.argv[2]
raw = out + ".raw.wav"
import soundfile as sf
sf.write(raw, mix.T, SR)
# two-pass linear loudnorm to -14 LUFS
m = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
af = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", af, "-ar", str(SR), out], check=True)
print("steps", [round(s, 2) for s in sorted(steps)], out)
