# Explainer Studio — immersive explainer video generator

**Route:** `/explainer-studio` (admin portal) · **Code:** `App/src/views/explainer/`, `App/src/app/api/explainer/*`, `App/src/lib/explainer/*`

Explainer Studio clones the production flow used by immersive-history YouTube/Instagram creators
("the evolution of trains, from the steam locomotive to Japan's bullet trains") and turns it into
a repeatable, one-screen generator that hands off to the existing **Video Studio** (`/videos`) for
voice, captions and rendering.

## Reference workflows this mirrors (all MIT, by Sirio Berati / TEIN)

| Repo | What we took from it | Where |
| --- | --- | --- |
| [showhow](https://github.com/sirioberati/showhow) | Voice **first** with ElevenLabs word timestamps; every scene change inside real silence; caption blocks ≤ 8 words with one key word; checks that PASS/FAIL (plan: pace 2.6–3.8 w/s, handover silence ≥ 0.15 s; render: freeze > 1.2 s, cuts, speed > 12, loudness −14 LUFS / −1.5 dBTP); half-size DRAFT stamped before the final; stills at word cues; an MCP server exposing each step | `lib/explainer/timing.ts`, `api/explainer/voice`, `lib/explainer/checks.ts`, `remotion/scripts/*.py`, `remotion/scripts/render_explainer.mjs`, `remotion/src/ExplainerReel.tsx` (WordCaption, Guides, DraftStamp), `explainer-mcp/` |
| [YouTube-AI-Motion-Graphics](https://github.com/sirioberati/YouTube-AI-Motion-Graphics) | A living **DO / DON'T rules file** the generator reads before writing and the checks enforce; safe-zone guides (padding, camera box); word-level sync of boards to the voice; Chrome + ffmpeg frame-exact export | `lib/explainer/rules.ts` (`EXPLAINER_RULES`), ExplainerReel `guides` prop |
| [YouTube-AI-Video-Editing-System](https://github.com/sirioberati/YouTube-AI-Video-Editing-System) | Role split (writing → design → animation → review) and JSON schemas for board timelines / edit plans | Pipeline stepper + `ExplainerPlan` shape |
| Genjustsu / Emotion-Control workflows | Character / face replacement with Seedance (draft first, approve before 1080p) — not used by the explainer flow; kept as a reference for presenter-style videos | — |

The code here is an original implementation of those ideas; nothing is copied. Attribution is kept in this file.

### Voice-first timing (the heart of the showhow flow)

1. `POST /api/explainer/voice` sends the narration to ElevenLabs **with timestamps** (`/v1/text-to-speech/<voice>/with-timestamps`),
   gets every character's start/end, stores the MP3 in the `videos` bucket at `explainer/<stamp>/voice.mp3`.
2. `timing.ts` turns characters into words, finds silences (gaps ≥ 0.12 s), maps each shot's narration onto the words,
   builds caption blocks (≤ 8 words, one key word), and **re-times every shot** so it starts halfway through the silence
   before its first spoken word. The last shot runs to the end of the audio (+0.7 s tail).
3. Checks 16–19 now run: pace, handover-in-silence, caption block length, unmatched narration.
4. `ExplainerReel` receives `words` + `captionBlocks` and renders the word-synced caption: a word appears as it is spoken,
   the current word is bold, said words go grey, the key word keeps a marker.

## The stack (mirrors the reference creator's "exact stack")

| Reference stack | Where it lives in this repo |
| --- | --- |
| **Claude Code** | Drives the pipeline through the MCP server in `explainer-mcp/` (see below) |
| **ElevenLabs** | Narration — existing Video Studio voice pipeline (`/api/videos/render` → ElevenLabs TTS) |
| **Remotion** | `remotion/src/ExplainerReel.tsx` — one composition, size/duration from props (16:9, 9:16, 4:5) |
| **Three.js** | `remotion/src/ExplainerScene3D.tsx` — `@remotion/three` + react-three-fiber; glTF hero models on real camera paths |
| **Headless Chrome** | Remotion's renderer (use `--gl=angle` for WebGL scenes: `npm run render:explainer:gl`) |
| **ffmpeg** | Remotion's encode step (`--codec=h264 --pixel-format=yuv420p`) |
| **MCP** | `explainer-mcp/server.mjs` exposes plan / checks / clips / hand-off as MCP tools |

### The only two ways to animate

Every shot carries an `animation_mode`:

| Mode | How it renders | Use when |
| --- | --- | --- |
| `2d_kinetic` | Scene image + CSS camera move (`cameraTransform2D`) + kinetic on-screen text, era badge, captions | Stills/AI clips, cheapest, deterministic |
| `3d_threejs` | `<ThreeCanvas>` with a camera path per `camera_motion` (`cameraPath3D`: orbit, fly-by, dolly, aerial reveal…), glTF model from the shot's **3D asset slot**, procedural placeholder until the GLB is supplied | True camera moves around one consistent subject across eras |

### 3D asset library

Slot-based (`ASSET_3D_LIBRARY`): `hero_vehicle`, `environment`, `prop`, `character`, `diagram`. The plan fills slots with
concrete, era-accurate names; you attach a GLB URL per slot (`assets_3d[].source_url`) — CC0 libraries, Blender
exports, or AI-generated meshes (Krea `generate_3d`). Keep GLBs < 20 MB / < 200k tris; labels stay in the 2D overlay.

### Checks that catch every mistake

`App/src/lib/explainer/checks.ts` runs 15 checks on every plan (live in the UI, stored as `plan.qa`, exposed via
`POST /api/explainer/validate` and the MCP `explainer_validate_plan` tool): runtime cap, word budget (±15 %),
contiguous timeline coverage, shot length bounds, narration/visual presence, per-shot pacing, on-screen text ≤ 6 words,
no baked-in text requested from the video model, camera vocabulary per engine, Krea clip caps, hook speed, chapter
coverage, CTA on the last shot, 3D asset slots, engine sanity. Hand-off is blocked while any check is at `error`.

### MCP server (turning it into a tool Claude Code can drive)

`explainer-mcp/` — stdio MCP server with six tools (`explainer_list_presets`, `explainer_fetch_transcript`,
`explainer_generate_plan`, `explainer_validate_plan`, `explainer_krea_clip`, `explainer_create_video`). It calls the
app's `/api/explainer/*` routes with `EXPLAINER_SERVICE_KEY`. Setup and a `.mcp.json` snippet are in
`explainer-mcp/README.md`.

## The production flow it reproduces

| Stage | What the creator does by hand | What the studio does |
| --- | --- | --- |
| 1. Brief | Picks a topic with a clear arc (origin → breakthroughs → today → what's next) | **Describe the topic** card: title, brief, audience, tone, visual style |
| 2. Format | Decides platform first because it dictates aspect ratio, hook speed, caption style, max runtime | **Length & social media target** card: YouTube long / Shorts / Instagram Reel / Instagram Feed / TikTok presets with safe zones + runtime caps and a word budget (2.58 words/s) |
| 3. Research | Collects 5–8 verifiable beats with years and numbers | `research_beats` + `chapters` in the generated plan |
| 4. Script | Writes a 2-sentence pattern-interrupt hook, then narration to the word budget | `hook` + `script`, sized to runtime |
| 5. Storyboard | Breaks narration into 4–10s shots, one visual idea each, era badge, on-screen text | `shots[]` — time-coded hyperframes with `visual_prompt`, `onscreen_text`, `camera_motion`, `transition`, `era`, `sound_design` |
| 6. Continuity | Keeps one subject design, palette, lens across eras | `continuity_bible` (subject, palette, lighting, lens, motifs, negative prompt) injected into every shot prompt |
| 7. Generate | Runs each shot through a video model | **Technology** card: Hyperframes (Remotion, in-house), Higgsfield DoP (camera presets), Krea (any frontier model) — each shot gets an engine-specific prompt; Krea shots can be generated in-app |
| 8. Assemble | Voice, captions, music, export per platform | **Send to Video Studio** creates a `videos` row with script + hyperframes; existing ElevenLabs/Remotion pipeline takes over |
| 9. Publish | Titles, description, hashtags, thumbnail | **Publishing kit** tab + export spec + cost estimate |

A **Reference video** card accepts a YouTube URL. Its transcript is used only to emulate *structure and pacing*
(hook pattern, escalation, landing) — the generator is instructed never to copy sentences.

## Technology choices

| Engine | Integration | Cost (planning) | Camera vocabulary |
| --- | --- | --- | --- |
| **Hyperframes (Remotion)** | Direct: hyperframes map 1:1 onto the `videos.hyperframes` JSON the `/videos` renderer already consumes | $0 | static, pan_slow_right, push_forward, orbit, tilt_up |
| **Higgsfield DoP** | Prompt export (copy per shot). Prompts carry motion preset, aspect, duration, continuity lock | ~$0.028/s | drone_fly_by, dynamic_orbit, push_forward, pan_slow_right, fly_by_left/right, crash_zoom, dolly_out |
| **Krea video models** | `POST /api/explainer/krea` → Krea public API; per-shot **Draft** (480p) and **Generate** buttons with job polling. Finished clip URLs attach to hyperframes as `asset_url` on hand-off | per model (Seedance 2.5 ≈ $0.035/s) | static, slow_dolly_in, tracking_shot, aerial_reveal, orbit, handheld |

Krea model catalogue (`KREA_VIDEO_MODELS` in `App/src/lib/explainer/presets.ts`) was taken from Krea's
`list_models` / `get_model_schema` MCP output on 2026-10-31: Seedance 2.5 / 2.0 / 2.0 Fast, Veo 3.1 / Fast,
Kling 4.0 / 3.0, Hailuo 2.3, Runway Gen-4.5, Wan 3.0, LTX-2.5 Pro. Input fields used: `prompt`,
`aspect_ratio`, `duration`, `resolution`, `draft`, optional `start_image`, `reference_images`, `seed`.

> **Verify before first use:** `KREA_API_BASE` defaults to `https://api.krea.ai/v1` and the job poll path to
> `/jobs/{id}` (the schema's `endpointPath` is `video/<model>`). docs.krea.ai was not reachable from the build
> sandbox, so confirm the base URL in Krea's API settings and adjust the env var if needed.

## API routes

| Route | Purpose | Env |
| --- | --- | --- |
| `POST /api/explainer/transcript` `{ url }` | Reference transcript + metadata. Provider chain: SerpApi (`engine=youtube_video`) → SearchApi.io (`engine=youtube_transcripts`) → direct YouTube caption track. Returns 422 with the attempt log when nothing works, and the UI falls back to a paste box | `SERPAPI_API_KEY`, `SEARCHAPI_API_KEY` |
| `POST /api/explainer/generate` (ExplainerBrief) | Full plan as JSON (OpenAI `gpt-4o`, JSON mode). Without a key returns a deterministic template plan flagged `generated_by: "fallback"` so the UI still works | `OPENAI_API_KEY`, `EXPLAINER_LLM_MODEL` |
| `POST /api/explainer/krea` / `GET ?job=` | Submit / poll one clip | `KREA_API_KEY`, `KREA_API_BASE` |
| `POST /api/explainer/validate` `{ plan }` | Run the 15 checks | — |
| `GET /api/explainer/presets` | All presets + which keys are configured (MCP discovery) | — |
| `POST /api/explainer/handoff` `{ plan, title?, clipUrls?, force? }` | Server-side hand-off to `videos` (MCP); 422 while checks have errors | — |

All routes accept a signed-in Supabase user **or** `Authorization: Bearer $EXPLAINER_SERVICE_KEY` (MCP server).

**No migration is needed** — the
hand-off writes to the existing `videos` table and stores the brief, chapters, publishing kit, engine and
cost estimate under `videos.metadata.explainer`.

## Hand-off mapping to `videos`

| Explainer | `videos` column |
| --- | --- |
| narration script | `script` |
| shots | `hyperframes[]` (`text_segment`, `visual_prompt`, `transition`, `camera_motion`, `asset_url`) |
| engine → model | hyperframes → `remotion-kinetic` (static), higgsfield → `higgsfield`, krea → `seeddance` (+ real model id in `metadata.explainer.krea_model`) |
| composition | `metadata.remotion_composition = 'ExplainerReel'`; `/api/videos/render` builds `ExplainerReel` props (scenes with `onscreenText`, `era`, `cameraMotion`, `animationMode`, `assets3d`, `clip`) when that composition is requested |
| runtime | `duration_sec`; `format` = `long` when > 180s |
| platform | `platforms[]`, aspect/resolution in metadata |
| chapters | `onscreen_structure` |
| all engine prompts | `broll_notes` |
| CTA | `cta_text`, `end_screen_text` |

## Example brief (the train video)

> **Topic:** The evolution of trains — from Stephenson's Rocket and the age of steam, through diesel and
> electrification, to Japan's Shinkansen and today's maglev records. Show how each leap was driven by a
> bottleneck (speed, reliability, capacity); end on what 600 km/h travel means for cities.
> **Target:** YouTube Shorts · 60s · **Style:** Documentary · **Engine:** Krea → Seedance 2.5 · **Voice:** Max

Produces ~15 four-second shots (1829 Rainhill trials → 1930s streamliners → 1964 Tokaido Shinkansen →
L0 maglev), each with a Seedance prompt locked to one continuity bible.

## Reference video note (2026-10-31)

The requested reference `https://youtu.be/P9t0nmxGXF4` could **not** be transcribed from the build sandbox:
`www.youtube.com` is outside the session's allowed network domains and the SerpApi transcript script lives on the
HP dev laptop, not in this repo. Options: (a) run the laptop script and paste the transcript into the Reference card;
(b) commit the script under `scripts/` and set `SERPAPI_API_KEY` so `/api/explainer/transcript` can use it;
(c) start a Remote Control session from the laptop folder so a cloud session can run it there.
The structure was reconstructed from the video's own outline (stack → two ways to animate → 8 steps → 3D asset
library → checks → MCP server) and from the creator's public repos listed above.

## Rendering an explainer locally

```bash
cd remotion && npm install          # Remotion packages are pinned to one version (required by Remotion)
# export the plan from /explainer-studio (Export .json) after "Voice & time"
node scripts/render_explainer.mjs plan.json --draft            # half size, DRAFT stamp, 30 fps
node scripts/render_explainer.mjs plan.json --stills 1.2,8.4   # frames at word cues, --guides for safe zones
node scripts/render_explainer.mjs plan.json                    # final + check_render.py + loudness.py --fix
# no GPU (CI, cloud):  REMOTION_GL=swangle CHROME=/path/to/chrome node scripts/render_explainer.mjs plan.json
```

Verified in the build sandbox: a 4 s mixed 2D + Three.js test rendered at 540×960 with `--gl=swangle`, and
`check_render.py` passed on it (freeze 1.20 s, no cuts, peak speed 8.2).

Or from the app: Video Studio → the hand-off record → Render with composition `ExplainerReel`
(`POST /api/videos/render { video_id, composition_id: 'ExplainerReel', output_filename }`).

## Files touched

- `App/src/lib/explainer/presets.ts` — platforms, lengths, styles, engines, Krea models, word budget, URL parsing
- `App/src/lib/explainer/types.ts` — `ExplainerBrief`, `ExplainerPlan`, `ExplainerShot`
- `App/src/app/api/explainer/{transcript,generate,krea}/route.ts`
- `App/src/views/explainer/ExplainerStudioView.tsx`, `App/src/app/(dashboard)/explainer-studio/page.tsx`
- `App/src/data/navigation/verticalMenuData.tsx` — "Explainer Studio" menu entry
- `App/.env.example` — new keys
- `App/src/lib/explainer/checks.ts`, `auth.ts`, `handoff.ts` — checks, service-key auth, shared hand-off payload
- `App/src/app/api/explainer/{validate,presets,handoff}/route.ts`
- `App/src/app/api/videos/render/route.ts`, `render-service/server.ts` — `ExplainerReel` allowed + props builder
- `remotion/src/ExplainerReel.tsx`, `remotion/src/ExplainerScene3D.tsx`, `remotion/src/Root.tsx`, `remotion/package.json` (three, @react-three/fiber, @remotion/three)
- `explainer-mcp/` — MCP server package (now also `explainer_voice`, `explainer_render`, `explainer_stills`, `explainer_check_render`)
- `App/src/lib/explainer/timing.ts`, `rules.ts`; `App/src/app/api/explainer/voice/route.ts`
- `remotion/scripts/check_render.py`, `loudness.py`, `render_explainer.mjs`
