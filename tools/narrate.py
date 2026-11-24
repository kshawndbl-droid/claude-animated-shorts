# Narration for a new short: pick a narrator from the story's mood, voice it, and get real word timings.
# 100 % free and offline: Kokoro-82M voices (Apache-2.0, kokoro-onnx MIT), Chatterbox ONNX (MIT) for emotion,
# faster-whisper (MIT) + Systran/faster-whisper-small.en (MIT) for word timestamps.
# The bridge short keeps its own pipeline (templates/audio/voice_*.py); this file only adds to it.
#
# story.json: {"lines": [{"text": "...", "mood": "funny", "emotion": 0.8, "gap": 0.3}, ...],
#              "voice": "<optional fixed voice id>", "engine": "chatterbox" | "kokoro"}
#
#   python narrate.py choose story.json            -> mood analysis, ranked voices, the pick and why
#   python narrate.py sample story.json out.mp3 [voice] [n_lines]   -> short approval sample
#   python narrate.py voice  story.json outdir     -> outdir/voice.wav + words.json (+ lines.json)
#   python narrate.py align  voice.wav story.json words.json   -> word timings from the real audio
import json, os, re, subprocess, sys, tempfile
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.environ.get("TTS_MODELS", "/home/user/tts-models")
SR = 48000

# ---------------------------------------------------------------- voice library (Kokoro v1.0 English voices)
# character: what the voice sounds like; fits: moods it suits best (first = strongest)
VOICES = {
    "am_onyx":    dict(name="Onyx",    accent="US", sex="m", character="deep, calm, documentary", fits=["serious", "mystery"]),
    "bm_george":  dict(name="George",  accent="UK", sex="m", character="deep British storyteller, professional", fits=["serious", "mystery", "sad"]),
    "bm_lewis":   dict(name="Lewis",   accent="UK", sex="m", character="low, dramatic British", fits=["mystery", "serious", "action"]),
    "bm_daniel":  dict(name="Daniel",  accent="UK", sex="m", character="soft, warm British", fits=["sad", "serious"]),
    "bm_fable":   dict(name="Fable",   accent="UK", sex="m", character="light, friendly British storyteller", fits=["happy", "funny"]),
    "am_michael": dict(name="Michael", accent="US", sex="m", character="warm, clear, upbeat", fits=["happy", "action", "funny"]),
    "am_puck":    dict(name="Puck",    accent="US", sex="m", character="playful, bright, expressive", fits=["funny", "happy"]),
    "am_fenrir":  dict(name="Fenrir",  accent="US", sex="m", character="strong, punchy", fits=["action", "funny"]),
    "am_eric":    dict(name="Eric",    accent="US", sex="m", character="confident, energetic", fits=["action", "happy"]),
    "am_adam":    dict(name="Adam",    accent="US", sex="m", character="neutral, steady", fits=["serious"]),
    "am_liam":    dict(name="Liam",    accent="US", sex="m", character="young, friendly", fits=["happy", "funny"]),
    "am_echo":    dict(name="Echo",    accent="US", sex="m", character="soft, airy", fits=["sad", "mystery"]),
    "af_heart":   dict(name="Heart",   accent="US", sex="f", character="warm, very natural, expressive", fits=["happy", "sad", "funny"]),
    "af_bella":   dict(name="Bella",   accent="US", sex="f", character="lively, expressive", fits=["funny", "happy", "action"]),
    "af_nicole":  dict(name="Nicole",  accent="US", sex="f", character="soft, intimate, near-whisper", fits=["mystery", "sad"]),
    "af_sarah":   dict(name="Sarah",   accent="US", sex="f", character="clear, gentle", fits=["sad", "serious"]),
    "af_sky":     dict(name="Sky",     accent="US", sex="f", character="light, bright", fits=["happy"]),
    "bf_emma":    dict(name="Emma",    accent="UK", sex="f", character="gentle British", fits=["sad", "serious"]),
    "bf_isabella": dict(name="Isabella", accent="UK", sex="f", character="confident British", fits=["serious", "mystery"]),
}
BACKUP = "am_onyx"   # the approved Onyx narrator (deeper documentary treatment) stays the fallback

# per mood: Kokoro pace and the Chatterbox emotion strength to start from
MOODS = {
    "funny":   dict(speed=1.00, emotion=0.85, words="funny joke laugh hilarious ridiculous fumbled cooked no cap aura plan oops awkward embarrassing somehow accidentally"),
    "happy":   dict(speed=1.00, emotion=0.75, words="cheer celebrate joy happy won victory smile proud legend best hero party"),
    "mystery": dict(speed=0.90, emotion=0.45, words="never seen vanished secret mystery strange unknown dark whisper locked disappeared nobody knows"),
    "sad":     dict(speed=0.88, emotion=0.35, words="died death lost alone waited grief tears never came back mourning gone"),
    "serious": dict(speed=0.92, emotion=0.50, words="king empire war ordered built century history inquiry treaty army"),
    "action":  dict(speed=1.05, emotion=1.00, words="crash hit pours fire charge storm explode sinks rushing run attack gust"),
}


def line_moods(story):
    """mood per line: the line's own tag, else keyword score, else the story's main mood"""
    out = []
    for ln in story["lines"]:
        if ln.get("mood"):
            out.append(ln["mood"]); continue
        t = " " + re.sub(r"[^a-z ]", " ", ln["text"].lower()) + " "
        sc = {m: sum(t.count(f" {w} ") for w in d["words"].split()) for m, d in MOODS.items()}
        out.append(max(sc, key=sc.get) if max(sc.values()) else None)
    return out


def analyze(story):
    """weights each mood by how much of the narration (in words) it covers"""
    moods, w = line_moods(story), {m: 0.0 for m in MOODS}
    for ln, m in zip(story["lines"], moods):
        if m:
            w[m] += len(ln["text"].split())
    tot = sum(w.values()) or 1
    return {m: round(v / tot, 2) for m, v in sorted(w.items(), key=lambda kv: -kv[1])}


def rank_voices(profile):
    """score = sum over moods of mood weight x fit (1st fit 1.0, 2nd 0.6, 3rd 0.35)"""
    rk = []
    for vid, v in VOICES.items():
        s = sum(profile.get(m, 0) * f for m, f in zip(v["fits"], (1.0, 0.6, 0.35)))
        rk.append((round(s, 3), vid))
    return [vid for s, vid in sorted(rk, reverse=True)]


def choose(story):
    prof = analyze(story)
    ranked = rank_voices(prof)
    pick = story.get("voice") or ranked[0]
    v = VOICES[pick]
    top = [m for m, x in prof.items() if x > 0][:3]
    why = (f"{v['name']} ({v['accent']}, {v['character']}). The story is " +
           ", ".join(f"{int(prof[m] * 100)} % {m}" for m in top) + f"; {v['name']} is a natural fit for " +
           " and ".join(m for m in v["fits"] if m in top[:2] or m == v["fits"][0]) + ".")
    return dict(profile=prof, ranked=ranked[:5], voice=pick, why=why, backup=BACKUP)


# ---------------------------------------------------------------- synthesis
_K = {}


def kokoro(text, voice, speed):
    """one line in a Kokoro voice -> float32 mono at SR"""
    from kokoro_onnx import Kokoro
    if "k" not in _K:
        vf = os.path.join(MODELS, "voices-all.npz")
        names = sorted(f[:-4] for f in os.listdir(os.path.join(MODELS, "voices")) if f.endswith(".bin"))
        if not os.path.exists(vf) or set(np.load(vf).files) != set(names):
            np.savez(vf, **{n: np.fromfile(os.path.join(MODELS, "voices", n + ".bin"), dtype=np.float32).reshape(-1, 1, 256) for n in names})
        _K["k"] = Kokoro(os.path.join(MODELS, "onnx", "model.onnx"), vf)
    a, sr = _K["k"].create(text, voice=voice, speed=speed, lang="en-gb" if voice[0] == "b" else "en-us")
    return resample(a, sr)


def resample(a, sr):
    with tempfile.TemporaryDirectory() as t:
        i, o = os.path.join(t, "i.wav"), os.path.join(t, "o.wav")
        sf.write(i, a, sr)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", i, "-ar", str(SR), "-ac", "1", o], check=True)
        return sf.read(o, dtype="float32")[0]


def onyx_locked(text):
    """the approved backup narrator, exactly as templates/audio/voice_kokoro.py makes it"""
    sys.path.insert(0, os.path.join(HERE, "..", "templates", "audio"))
    os.environ.setdefault("KOKORO_DIR", MODELS)
    import voice_kokoro as VK
    if "vk" not in _K:
        _K["vk"] = VK.engine()
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, "o.wav"); VK.say(_K["vk"], text, p)
        return sf.read(p, dtype="float32")[0]


def reference(voice):
    """a ~10 s neutral clip of the voice, for Chatterbox to copy"""
    p = os.path.join(MODELS, "refs", voice + ".wav")
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        txt = ("Long ago, in a small harbor town, the people gathered by the water. "
               "Some came to work, some came to watch, and everyone had a story to tell.")
        a = onyx_locked(txt) if voice == "am_onyx" else kokoro(txt, voice, 0.95)
        sf.write(p, a, SR)
    return p


def speak(text, voice, mood, emotion=None, engine="chatterbox"):
    m = MOODS.get(mood or "serious")
    if engine == "kokoro":
        return onyx_locked(text) if voice == "onyx-locked" else kokoro(text, voice, m["speed"])
    sys.path.insert(0, HERE)
    import voice_chatterbox as C
    ex = m["emotion"] if emotion is None else emotion
    parts = [p for p in re.split(r"(?<=[.!?])\s+", text.strip()) if p]  # one sentence per call: no dropped words
    out = []
    for p in parts:
        out += [resample(C.speak(reference(voice), ex, p), 24000), np.zeros(int(SR * 0.16), np.float32)]
    return np.concatenate(out[:-1])


def render_lines(story, voice, n=None):
    moods = line_moods(story)
    main = next(iter(analyze(story)))
    lines = story["lines"][:n] if n else story["lines"]
    buf, t, rows = [np.zeros(int(SR * 0.3), np.float32)], 0.3, []
    for ln, m in zip(lines, moods):
        a = speak(ln["text"], ln.get("voice", voice), m or main, ln.get("emotion"), story.get("engine", "chatterbox"))
        rows.append(dict(start=round(t, 3), end=round(t + len(a) / SR, 3), text=ln["text"], mood=m or main))
        g = ln.get("gap", 0.3)
        buf += [a, np.zeros(int(SR * g), np.float32)]
        t += len(a) / SR + g
    buf.append(np.zeros(int(SR * 0.7), np.float32))
    return np.concatenate(buf), rows


# ---------------------------------------------------------------- word timings from the real audio
def norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def align(wav, story_lines):
    """faster-whisper word timestamps, mapped onto the script's own words (exact spelling, punctuation kept).
    Script words whisper missed get times interpolated between their matched neighbours."""
    from faster_whisper import WhisperModel
    import difflib
    model = WhisperModel(os.path.join(MODELS, "whisper-small.en"), device="cpu", compute_type="int8")
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-ar", "16000", "-ac", "1", "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    segs, _ = model.transcribe(np.frombuffer(pcm, np.float32), word_timestamps=True, beam_size=5, language="en",
                               initial_prompt=" ".join(story_lines)[:800])
    heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
    script = [w for ln in story_lines for w in ln.split()]
    a, b = [norm(w) for w in script], [norm(h[0]) for h in heard]
    times = [None] * len(script)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        tag, i1, i2, j1, j2 = blk
        if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k][1], heard[j1 + k][2])
        elif tag == "replace" and j2 > j1:   # e.g. "1628" heard for "sixteen twenty-eight": spread the span
            s0, e0 = heard[j1][1], heard[j2 - 1][2]
            for k in range(i2 - i1):
                times[i1 + k] = (s0 + (e0 - s0) * k / (i2 - i1), s0 + (e0 - s0) * (k + 1) / (i2 - i1))
    for i in range(len(times)):  # fill the few unmatched words from their neighbours
        if times[i] is None:
            p = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), 0.0)
            n = next((times[j][0] for j in range(i + 1, len(times)) if times[j]), p + 0.3)
            times[i] = (p, max(p + 0.05, n))
    # a word whisper squeezed to (almost) nothing shares the span of its neighbour, split by letter count
    i = 0
    while i < len(times):
        if times[i][1] - times[i][0] < 0.08:
            j = i + 1 if i + 1 < len(times) and times[i + 1][0] - times[i][1] < 0.15 else i - 1
            if j < 0 or j >= len(times):
                i += 1; continue
            a_, b_ = min(i, j), max(i, j)
            s0, e0 = times[a_][0], times[b_][1]
            la, lb = len(script[a_]), len(script[b_])
            mid = s0 + (e0 - s0) * la / (la + lb)
            times[a_], times[b_] = (s0, mid), (mid, e0)
        i += 1
    # whisper can start a word inside the silence before it: move each start to where the voice actually begins
    x = np.frombuffer(pcm, np.float32); hop = 160  # 10 ms at 16 kHz
    rms = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, "same")[::hop])
    loud = rms > max(1e-4, 0.06 * np.percentile(rms, 95))
    for i in range(len(times) - 1, -1, -1):  # backwards, so a word in silence leans on its already-fixed neighbour
        s0, e0 = times[i]
        a0, a1 = int(s0 * 100), int(max(s0, e0 - 0.05) * 100)
        on = np.flatnonzero(loud[a0:a1 + 1])
        if len(on) and on[0] > 0:
            times[i] = (round((a0 + on[0]) / 100, 3), e0)
        elif not len(on) and i + 1 < len(times):  # no voice at all in its span: it sits just before the next word
            nx = times[i + 1][0]; pv = times[i - 1][1] if i else 0.0
            times[i] = (round(max(pv, nx - 0.18), 3), nx)
    matched = sum(1 for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks() for _ in range(blk.size))
    out, idx = [], 0
    for li, ln in enumerate(story_lines):
        for w in ln.split():
            s, e = times[idx]; idx += 1
            out.append({"w": w, "s": round(s, 3), "e": round(e, 3), "line": li})
    return out, round(matched / max(1, len(script)), 3)


# ---------------------------------------------------------------- cli
def main():
    cmd, story = sys.argv[1], json.load(open(sys.argv[2])) if len(sys.argv) > 2 and sys.argv[1] != "align" else None
    if cmd == "choose":
        print(json.dumps(choose(story), indent=1))
    elif cmd == "sample":
        out = sys.argv[3]
        voice = sys.argv[4] if len(sys.argv) > 4 else choose(story)["voice"]
        n = int(sys.argv[5]) if len(sys.argv) > 5 else 3
        a, rows = render_lines(story, voice, n)
        with tempfile.NamedTemporaryFile(suffix=".wav") as t:
            sf.write(t.name, a, SR)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", t.name, "-b:a", "160k", out], check=True)
        print(voice, round(len(a) / SR, 2), "s ->", out)
    elif cmd == "voice":
        od = sys.argv[3]; os.makedirs(od, exist_ok=True)
        voice = story.get("voice") or choose(story)["voice"]
        a, rows = render_lines(story, voice)
        sf.write(os.path.join(od, "voice.wav"), a, SR)
        json.dump(rows, open(os.path.join(od, "lines.json"), "w"), indent=1)
        words, q = align(os.path.join(od, "voice.wav"), [l["text"] for l in story["lines"]])
        json.dump(words, open(os.path.join(od, "words.json"), "w"), indent=0)
        print(voice, round(len(a) / SR, 2), "s;", len(words), "words, match", q)
    elif cmd == "align":
        wav, st, out = sys.argv[2], json.load(open(sys.argv[3])), sys.argv[4]
        words, q = align(wav, [l["text"] for l in st["lines"]])
        json.dump(words, open(out, "w"), indent=0)
        print(len(words), "words, match", q)


if __name__ == "__main__":
    main()
