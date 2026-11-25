# Stack City finishing step (HyperFrames)

Standard pipeline since 2026-11-25 (Shubh approved the ep 8 trial).

1. Build the 3D episode in `../stack-city-renderer` (episodes/epN.js, narration vo/epN.wav + aligned vo/epN.json).
2. `node probe.js ep1 ep2 ...` (run inside the renderer folder with its http server on :8765) records each episode's chapter tags, beat times and CTA into probe.json.
3. `python3 finish.py epN` builds a HyperFrames project: the three.js scene (shared/scene.js, driven by hf-seek, engine UI off) plus a GSAP layer with a frame-0 hook title (first sentence), 2-3 word highlight captions, chapter-tag flips, beat flashes and punch-ins, CTA, whoosh/boom SFX.
4. `npx hyperframes check --json`, then `npx hyperframes render -o epN.mp4 --quality delivery`.

Paths at the top of finish.py point at the working copies; adjust when running elsewhere. SFX wavs are synthesized with ffmpeg (anoisesrc whoosh, sine boom).
