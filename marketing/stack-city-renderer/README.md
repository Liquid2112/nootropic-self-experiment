# Stack City Renderer

Reusable, deterministic JSON-driven renderer for vertical Stack City TikTok videos (`1080x1920`, `30fps`) built on Three.js, Playwright headless Chromium, and FFmpeg.

## Prerequisites

- **Node.js** (18+)
- **ffmpeg** on `PATH` (built with `libx264` and `loudnorm`)
- **Playwright Chromium** (`npx playwright install chromium` if not already cached)

Install dependencies:

```bash
cd marketing/stack-city-renderer
npm install
```

## Usage

Render a full `1080x1920` MP4:

```bash
node render.js episodes/ep1_prove_it.json out/ep1_prove_it.mp4
```

Render a quick contact sheet of specific timestamps (seconds):

```bash
node render.js episodes/ep1_prove_it.json out/ep1_stills.png --stills 0.6,3.2,8.5,12.5,17.0,20.8,23.2
```

CLI options:
- `--stills t1,t2,...`: Render only the listed timestamps and tile them into a contact sheet PNG.
- `--fps <n>`: Override frame rate (defaults to `episode.fps` or `30`).
- `--audio <path>`: Override voiceover audio file (muxed with `-af loudnorm=I=-14:TP=-1.5:LRA=11`).
- `--keep-frames`: Preserve intermediate PNG frame files.
- `--frames-dir <dir>`: Specify where intermediate PNG frames are written.

## File Layout

- `engine/scene.html` — `540x960` viewport (`deviceScaleFactor: 2` -> `1080x1920`) with Inter Black captions and chapter pill.
- `engine/main.js` — Episode loader, timeline evaluator, and deterministic `window.renderAt(t)` entry point.
- `engine/stage.js` — Night gradient backdrop, fog, 3-point + hemisphere lighting, deterministic bokeh, glowing grid floor, and camera presets.
- `engine/characters.js` — Low-poly box-primitive character builders and pose animation drivers.
- `engine/props.js` — 3D props and 2D CanvasTexture card builders.
- `engine/captions.js` — Chapter pill & word-by-word caption timing (auto-spaced or timestamp-driven).
- `engine/rng.js` — Mulberry32 seeded PRNG and easing helpers (no `Math.random` or wall clocks).
- `render.js` — Self-contained Playwright + FFmpeg CLI runner with embedded static HTTP server.
- `episodes/ep1_prove_it.json` — 24-second test fixture episode.

---

## Episode JSON Schema

```json
{
  "id": "ep1_prove_it",
  "title": "Episode Title",
  "duration": 24,
  "fps": 30,
  "voiceover": "audio/ep1_vo.wav",
  "wordTimestamps": "audio/ep1_words.json",
  "desk": { "visible": true, "pos": [0, -2.05, 1.1] },
  "beats": [ ... ]
}
```

### Top-Level Fields

| Field | Type | Description |
| --- | --- | --- |
| `duration` | `number` | Total video duration in seconds. |
| `fps` | `number` | Optional frame rate (default `30`). |
| `voiceover` / `audio` | `string` | Optional path to voiceover audio (resolved relative to episode JSON). Normalized to `-14 LUFS` during muxing. |
| `wordTimestamps` | `string \| Array` | Optional path to JSON or inline array of `{ word, start, end }` (or `{ text, t0, t1 }`) word timings. |
| `desk` | `boolean \| object` | Show or configure the studio desk (`false` hides it). |
| `cast` | `Array` | Optional pre-declared cast definitions. |
| `props` | `Array` | Optional global timed props (`{ id, type, t0, t1, ... }`). |
| `beats` | `Array<Beat>` | Ordered timeline beats covering `[0, duration]`. |

### Beat Object

```json
{
  "t0": 0.0,
  "t1": 2.4,
  "pill": "WHAT <b>IF?</b>",
  "caption": "You spend <hl>$90 a month on <hl>THIS.",
  "camera": { "preset": "punch_in", "ease": "ease_out", "transition": 0.5 },
  "cast": [
    { "id": "brian", "type": "brian", "pos": [0, 0, 0], "actions": ["talk", "point"], "brow": "up" }
  ],
  "props": [
    { "id": "jars", "type": "jars", "anim": "slam", "count": 5, "pos": [0, 0, 1.35] }
  ]
}
```

- **`pill`**: Top chapter pill text. Wrap accented segments in `<b>...</b>` for tangerine (`#FF5A36`). Omit or `null` to hide.
- **`caption`**:
  - String: space-separated words; prefix highlighted words with `<hl>` (e.g. `"<hl>$90"`). Timed evenly across 80% of `[t0, t1]` unless `wordTimestamps` is provided.
  - Array of strings or word objects: `[{ "text": "PROVE", "hl": true, "t0": 3.1, "t1": 3.5 }]`.
  - Object: `{ "words": [...], "timestamps": [...] }`.
- **`camera`**: String preset or object `{ preset, pos, target, offset, fov, transition, ease }`:
  - Presets: `punch_in`, `medium`, `wide`, `orbit` (`radius`, `angleStart`, `angleEnd`, `height`), `pov`.
  - Smoothly lerps from the previous beat's camera over `transition` seconds (default `0.55s`).

### Characters (`cast[].type`)

- `brian`: White lab coat, tangerine/lilac split brain cube head, tie, pocket pen.
- `benny`: Brown coffee-bean hoodie, paper coffee cup with sleeve on head.
- `tea`: Matcha green hoodie, leaf sprout on head.
- `shroom`: Shaggy cream hoodie with hood up, mushroom cap crown, sleepy eyes.
- `brick`: Tall gym bro, capsule-striped tank top, headband.

Supported `action` / `actions`: `idle`, `talk`, `blink`, `head_bob` (`bob`), `point`, `point_left`, `thumbs_up`, `flex`, `tap`, `wave`, `eyebrow_up`, `silent`.

### Props (`props[].type`)

- `desk`: Studio desk surface.
- `jars` / `supplement_jars`: `count`, `colors`, `anim` (`"slam"` | `"split_win"` | `"idle"`), `keepIndices`, `cutIndices`, `poofAt`.
- `mugs` / `cup_shuffle`: Two mugs executing a cup-shuffle (`swaps`, `shuffleDur`, `revealAt`).
- `phone_card`: Phone frame canvas card (`kicker`, `title`, `rows: [{ label, value, color }]`).
- `calendar_card`: 21-day grid flipping to tang/lilac then grey `"BLINDED"` (`flipStart`, `flipEnd`, `blindStart`, `blindEnd`, `blindBadge`).
- `reaction_button`: Glowing 3D button + `ms` readout (`tapTimes`, `startMs`, `msValues`, `label`).
- `verdict_card`: ON vs OFF bars + verdict stamp (`kicker`, `title`, `onLabel`, `onMs`, `offLabel`, `offMs`, `verdictText`, `verdictColor`).
- `line_chart`: Self-drawing multi-series line chart (`title`, `kicker`, `drawDuration`, `series: [{ label, color, points }]`).
- `coins_burst`: Radial gold coin burst (`count`, `pos`, `startAt`).
- `confetti_blocks`: Multi-color low-poly confetti shower (`count`, `pos`).
- `boxing_ring`: 3D arena mat, corner posts, and 3-tier ropes.
- `scoreboard`: Head-to-head VS scoreboard (`title`, `leftName`, `leftScore`, `leftColor`, `rightName`, `rightScore`, `rightColor`).
- `poll_card`: Animated poll bars (`kicker`, `question`, `options: [{ label, pct, color }]`).
- `logo_pill` / `brand_pill`: Placebo capsule logo pill (`text`, `subtitle`).
