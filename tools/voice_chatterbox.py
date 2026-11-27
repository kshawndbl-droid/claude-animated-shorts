# Expressive narration with Chatterbox (MIT, Resemble AI; ONNX export onnx-community/chatterbox-ONNX, MIT).
# Clones the approved Onyx narrator from a reference clip and adds a real emotion-intensity knob ("exaggeration").
# Free and offline after the model download; needs onnxruntime, transformers (tokenizer only), librosa, soundfile.
# Usage: python voice_chatterbox.py <ref.wav|mp3> <exaggeration 0.25-1.5> "text" out.wav
import os, sys, numpy as np, onnxruntime as ort, librosa, soundfile as sf
from transformers import AutoTokenizer

D = os.environ.get("CHATTERBOX_DIR", "/home/user/tts-models/chatterbox")
SR, START, STOP, LAYERS, HEADS, HD = 24000, 6561, 6562, 30, 16, 64
_S = {}


def sess():
    if not _S:
        o = ort.SessionOptions(); o.intra_op_num_threads = os.cpu_count()
        for n in ["speech_encoder", "embed_tokens", "language_model", "conditional_decoder"]:
            _S[n] = ort.InferenceSession(f"{D}/onnx/{n}.onnx", o, providers=["CPUExecutionProvider"])
        _S["tok"] = AutoTokenizer.from_pretrained(D)
    return _S


def speak(ref, exaggeration, text, max_tokens=1000, penalty=1.2):
    s = sess()
    audio = librosa.load(ref, sr=SR)[0][None, :].astype(np.float32)
    ids = s["tok"](text, return_tensors="np")["input_ids"].astype(np.int64)
    pos = np.where(ids >= START, 0, np.arange(ids.shape[1])[None, :] - 1)
    inp = {"input_ids": ids, "position_ids": pos, "exaggeration": np.array([exaggeration], np.float32)}
    gen = np.array([[START]], np.int64)
    for i in range(max_tokens):
        emb = s["embed_tokens"].run(None, inp)[0]
        if i == 0:
            cond, prompt_tok, xvec, feat = s["speech_encoder"].run(None, {"audio_values": audio})
            emb = np.concatenate((cond, emb), 1)
            pkv = {f"past_key_values.{l}.{k}": np.zeros([1, HEADS, 0, HD], np.float32) for l in range(LAYERS) for k in ("key", "value")}
            mask = np.ones((1, emb.shape[1]), np.int64)
        logits, *present = s["language_model"].run(None, dict(inputs_embeds=emb, attention_mask=mask, **pkv))
        lg = logits[:, -1, :].copy()
        sc = np.take_along_axis(lg, gen, 1); np.put_along_axis(lg, gen, np.where(sc < 0, sc * penalty, sc / penalty), 1)
        nxt = np.argmax(lg, -1, keepdims=True).astype(np.int64)
        gen = np.concatenate((gen, nxt), -1)
        if nxt[0, 0] == STOP:
            break
        inp["input_ids"], inp["position_ids"] = nxt, np.full((1, 1), i + 1, np.int64)
        mask = np.concatenate([mask, np.ones((1, 1), np.int64)], 1)
        for j, k in enumerate(pkv):
            pkv[k] = present[j]
    toks = np.concatenate([prompt_tok, gen[:, 1:-1] if gen[0, -1] == STOP else gen[:, 1:]], 1)
    wav = s["conditional_decoder"].run(None, {"speech_tokens": toks, "speaker_embeddings": xvec, "speaker_features": feat})[0]
    return np.squeeze(wav, 0)


if __name__ == "__main__":
    ref, ex, text, out = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4]
    sf.write(out, speak(ref, ex, text), SR)
