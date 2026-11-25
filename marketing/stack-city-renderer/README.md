# Stack City renderer

Code-rendered blocky 3D vertical videos (1080x1920, 30fps) for Placebo marketing.

- `engine.html`: shared scene, characters (Brian, Benny, Tea, Brick), props, word-synced captions.
- `episodes/epN.js`: one file per episode (display caption text + `build`/`update` animation).
- `vo/epN.json`: word timings from `align.py` (pocketsphinx forced alignment of the voiceover).
- `render2.js`: Playwright frame capture. `mk.sh epN` renders frames and muxes `vo/epN.wav`.

Run from this folder: `npm i`, `python3 -m http.server 8765 &`, then `./mk.sh ep1`.
Voiceover wavs are not committed (Gemini TTS / edge-tts outputs).
