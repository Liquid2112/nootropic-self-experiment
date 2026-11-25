# HyperFrames trial (ep 8)

Remake of Stack City ep 8 with HyperFrames 0.9.96. The 3D scene is the existing three.js engine (lib/scene.js) driven by hf-seek; captions, chapter pills, hook, flashes, punch-ins, CTA and SFX are HyperFrames clips with a GSAP timeline.

Setup: copy three.module.js into lib/, ep8 narration to assets/vo.wav, generate SFX (see gen/), then `python3 gen/build.py` and `npx hyperframes render`.
