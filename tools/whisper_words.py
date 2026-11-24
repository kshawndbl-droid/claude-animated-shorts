# Word timings for a narration from faster-whisper, matched onto the script words (difflib); unmatched script words
# (numbers spelled out, odd names) are spread evenly between their matched neighbours. Lines get start/end from words.
# usage: python whisper_words.py <voice.wav> <story.json> <outdir> [drop,list]
import json, sys, subprocess, difflib
import numpy as np
from faster_whisper import WhisperModel
wav, story, od = sys.argv[1], sys.argv[2], sys.argv[3]
drop = {int(x) for x in sys.argv[4].split(",")} if len(sys.argv) > 4 and sys.argv[4] else set()
S = json.load(open(story)); lines = [l["text"] for i, l in enumerate(S["lines"]) if i not in drop]
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
a = np.frombuffer(pcm, np.float32)
m = WhisperModel("/home/user/tts-models/whisper-small.en", device="cpu", compute_type="int8")
segs, _ = m.transcribe(a, language="en", beam_size=5, word_timestamps=True)
hw = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
nz = lambda w: "".join(c for c in w.lower() if c.isalnum())
sw = [(w, li) for li, t in enumerate(lines) for w in t.split()]
A, B = [nz(w) for w, _ in sw], [nz(w) for w, *_ in hw]
T = [None] * len(sw)
for blk in difflib.SequenceMatcher(None, A, B, autojunk=False).get_matching_blocks():
    for k in range(blk.size): T[blk.a + k] = (hw[blk.b + k][1], hw[blk.b + k][2])
# fill gaps
i = 0; matched = sum(t is not None for t in T)
while i < len(T):
    if T[i] is None:
        j = i
        while j < len(T) and T[j] is None: j += 1
        s0 = T[i - 1][1] if i > 0 else 0.0
        s1 = T[j][0] if j < len(T) else s0 + 0.4 * (j - i)
        n = j - i
        for k in range(n): T[i + k] = (s0 + (s1 - s0) * k / n, s0 + (s1 - s0) * (k + 1) / n)
        i = j
    else: i += 1
W = [{"w": w, "s": round(t[0], 3), "e": round(t[1], 3), "line": li} for (w, li), t in zip(sw, T)]
L = []
for li, t in enumerate(lines):
    ws = [w for w in W if w["line"] == li]; L.append({"text": t, "start": ws[0]["s"], "end": ws[-1]["e"]})
json.dump(W, open(f"{od}/words.json", "w"), indent=1); json.dump(L, open(f"{od}/lines.json", "w"), indent=1)
print("matched", matched, "of", len(sw))
