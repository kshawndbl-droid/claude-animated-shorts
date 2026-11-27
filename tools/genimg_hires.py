# Two-pass background generation (Dreamshaper 8, CreativeML OpenRAIL-M): a 512x768 base image, then an img2img
# "hires" pass at 768x1152 that adds real detail instead of just upscaling. Same model and safety checker as genimg.py.
# usage: python genimg_hires.py jobs.json outdir   (jobs: name, prompt, seed, steps, cfg, strength)
import json, os, sys, time
import torch
from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline, DPMSolverMultistepScheduler

NEG = ("people, person, man, woman, figure, crowd, text, letters, watermark, signature, logo, blurry, lowres, jpeg artifacts, "
       "deformed, collage, split screen, triptych, frame, border, photo, 3d render, modern car, smartphone, flat screen")


def main():
    jobs = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
    torch.set_num_threads(os.cpu_count() or 4)
    pipe = StableDiffusionPipeline.from_pretrained("Lykon/dreamshaper-8", torch_dtype=torch.float32)
    if pipe.safety_checker is None:
        from diffusers.pipelines.stable_diffusion.safety_checker import StableDiffusionSafetyChecker
        from transformers import CLIPImageProcessor
        pipe.safety_checker = StableDiffusionSafetyChecker.from_pretrained("CompVis/stable-diffusion-safety-checker")
        pipe.feature_extractor = CLIPImageProcessor.from_pretrained("openai/clip-vit-base-patch32")
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True, algorithm_type="dpmsolver++", final_sigmas_type="sigma_min")
    i2i = StableDiffusionImg2ImgPipeline(**pipe.components)
    for j in jobs:
        p = os.path.join(out, j["name"] + ".png")
        if os.path.exists(p) and not j.get("force"):
            print("skip", j["name"], flush=True); continue
        t0 = time.time()
        g = torch.Generator("cpu").manual_seed(j["seed"])
        base = os.path.join(out, j["name"] + "_base.png")
        if os.path.exists(base):
            from PIL import Image
            im = Image.open(base).convert("RGB")
        else:
            r = pipe(prompt=j["prompt"], negative_prompt=NEG, width=512, height=768, num_inference_steps=j.get("steps", 24), guidance_scale=j.get("cfg", 7.0), generator=g)
            if r.nsfw_content_detected and r.nsfw_content_detected[0]:
                print("REJECTED (safety)", j["name"], flush=True); continue
            im = r.images[0]; im.save(base)
            print("base", j["name"], round(time.time() - t0, 1), "s", flush=True)
        if j.get("base_only"):
            continue
        up = im.resize((768, 1152), resample=3)
        r = i2i(prompt=j["prompt"], negative_prompt=NEG, image=up, strength=j.get("strength", 0.42), num_inference_steps=j.get("hsteps", 22), guidance_scale=j.get("cfg", 7.0), generator=g)
        if r.nsfw_content_detected and r.nsfw_content_detected[0]:
            print("REJECTED hires (safety)", j["name"], flush=True); continue
        r.images[0].save(p)
        print("done", j["name"], round(time.time() - t0, 1), "s", flush=True)


if __name__ == "__main__":
    main()
