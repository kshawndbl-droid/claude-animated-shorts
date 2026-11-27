# Word-by-word subtitles as an .ass file (burned in with ffmpeg): white bold text with a black outline, the spoken
# word yellow, key words/names/numbers cyan, max 2 lines, a small pop on each new chunk, in the lower safe area.
# usage: python3 tools/subs_ass.py words.json out.ass end_seconds "key,words,..." [y_frac]
import json, sys

words = json.load(open(sys.argv[1]))["words"]
out, end_t = sys.argv[2], float(sys.argv[3])
keys = {k.strip().lower() for k in sys.argv[4].split(",")}
yf = float(sys.argv[5]) if len(sys.argv) > 5 else 0.74
words = [w for w in words if w["s"] < end_t]
W_, H_ = 1080, 1920


def ts(t):
    t = max(t, 0)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def clean(w):
    return w.strip(".,?!").lower()


# chunks: up to 4 words, break after punctuation, at most ~22 characters per line, 2 lines max
chunks, cur = [], []
for w in words:
    cur.append(w)
    txt = " ".join(x["w"] for x in cur)
    if len(cur) >= 4 or w["w"][-1:] in ".,?!" or len(txt) > 20:
        chunks.append(cur)
        cur = []
if cur:
    chunks.append(cur)
YEL, CYA, WHT = "&H0000E6FF&", "&H00FFE000&", "&H00FFFFFF&"
lines = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W_}", f"PlayResY: {H_}", "WrapStyle: 0", "",
         "[V4+ Styles]",
         "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
         "Style: S,Inter ExtraBold,86,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,7,3,5,80,80,0,1", "",
         "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
x, y = W_ // 2, int(H_ * yf)
for ci, ch in enumerate(chunks):
    c_end = chunks[ci + 1][0]["s"] if ci + 1 < len(chunks) else min(ch[-1]["e"] + 0.6, end_t)
    for wi, w in enumerate(ch):
        s = w["s"]
        e = ch[wi + 1]["s"] if wi + 1 < len(ch) else c_end
        parts = []
        for k, x_ in enumerate(ch):
            col = YEL if k == wi else (CYA if clean(x_["w"]) in keys else WHT)
            parts.append(f"{{\\c{col}}}{x_['w'].upper()}")
        pop = "\\fscx112\\fscy112\\t(0,90,\\fscx100\\fscy100)" if wi == 0 else ""
        lines.append(f"Dialogue: 0,{ts(s)},{ts(e)},S,,0,0,0,,{{\\an5\\pos({x},{y}){pop}}}" + " ".join(parts))
open(out, "w").write("\n".join(lines) + "\n")
print("wrote", out, len(chunks), "chunks")
