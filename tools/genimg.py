# Free image generation for the cut-out style: LCM Dreamshaper v7 (open weights, MIT model card, built on SD 1.5
# under CreativeML OpenRAIL-M, commercial use allowed) on CPU, 4-6 steps, plus optional rembg cut-out (Apache-2.0 U2Net).
# usage: python genimg.py jobs.json outdir
#   jobs.json: [{"name": "medusa_face", "prompt": "...", "w": 512, "h": 768, "seed": 1, "cut": true, "steps": 6}]
import json
import os
import sys
import time

import torch
from diffusers import DiffusionPipeline

STYLE = ", 2d cartoon illustration, adult animated series style, bold thick black outlines, flat cel shading, expressive face, large expressive eyes, clean line art, vibrant flat colors"
BG = ", detailed painted background art for an animated film, soft depth of field, cinematic lighting, rich colors, no people in foreground"
NEG = "nsfw, nude, naked, cleavage, bare chest, lingerie, sexy, revealing clothes, blurry, lowres, deformed, extra fingers, bad anatomy, text, watermark, signature, logo, anime, photo"


def main():
    jobs = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
    torch.set_num_threads(os.cpu_count() or 4)
    # Dreamshaper 8 (CreativeML OpenRAIL-M, commercial use allowed) with a real negative prompt and the safety checker ON
    from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
    pipe = StableDiffusionPipeline.from_pretrained("Lykon/dreamshaper-8", torch_dtype=torch.float32)
    if pipe.safety_checker is None:
        from diffusers.pipelines.stable_diffusion.safety_checker import StableDiffusionSafetyChecker
        from transformers import CLIPImageProcessor
        pipe.safety_checker = StableDiffusionSafetyChecker.from_pretrained("CompVis/stable-diffusion-safety-checker")
        pipe.feature_extractor = CLIPImageProcessor.from_pretrained("openai/clip-vit-base-patch32")
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True, algorithm_type="dpmsolver++", final_sigmas_type="sigma_min")
    pipe.to("cpu")
    rem = None
    for j in jobs:
        p = os.path.join(out, j["name"] + ".png")
        if os.path.exists(p) and not j.get("force"):
            print("skip", j["name"]); continue
        t0 = time.time()
        g = torch.Generator("cpu").manual_seed(j.get("seed", 1))
        res = pipe(prompt=j["prompt"] + (BG if j.get("bg") else j.get("style", STYLE)), negative_prompt=NEG, width=j.get("w", 512), height=j.get("h", 768),
                   num_inference_steps=j.get("steps", 16), guidance_scale=j.get("cfg", 6.5), generator=g)
        if res.nsfw_content_detected and res.nsfw_content_detected[0]:
            print("REJECTED (safety)", j["name"], flush=True); continue
        im = res.images[0]
        im.save(p)
        if j.get("cut"):
            if rem is None:
                from rembg import new_session, remove
                rem = (new_session("u2net"), remove)
            rem[1](im, session=rem[0]).save(os.path.join(out, j["name"] + "_cut.png"))
        print("done", j["name"], round(time.time() - t0, 1), "s", flush=True)


if __name__ == "__main__":
    main()
