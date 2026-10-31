# Explainer Studio prototype — "The Revolution of Trains"

First end-to-end run of the explainer platform on the original concept: a YouTube long-form
video on the evolution of trains, from Trevithick and Stephenson's Rocket to the Shinkansen
and the L0 maglev.

## What is in this folder

| File | What it is |
| --- | --- |
| `trains_plan.json` | The full Explainer Studio plan: brief, hook, 10 research beats, 8 chapters, 611-word narration, 26 time-coded shots with engine prompts, continuity bible, publishing kit, cost estimate, and the stored check results (`qa`). |
| `stills/` | Review frames rendered from the plan at 1920×1080. |

The plan is exactly what `/explainer-studio` produces and what `POST /api/explainer/handoff`
accepts, so it can be loaded into the studio, re-voiced, and sent to Video Studio unchanged.

## The brief

- **Target:** YouTube long form · 16:9 · 1920×1080 · 300 s
- **Style:** documentary · **Engine:** Hyperframes (Remotion, in-house, $0 per second)
- **Structure:** hook (a horse in 1829 vs Tokyo–Osaka today) → the bottleneck thesis →
  age of steam → the world shrinks → race for speed → diesel and the wire → Japan rewrites
  the rules → high-speed world and maglev → the next bottleneck + CTA
- **Animation:** 2D kinetic for 22 shots; 3D (Three.js) for the four hero shots
  (Rocket 1829, express steam 1900, Shinkansen 1964, maglev 2015). The 3D shots use the
  studio's procedural placeholders until GLB models are attached to the `hero_vehicle` slots.

## Checks

`runPlanChecks` on the plan: 12 pass, 0 errors, 1 warning. The warning is `voice_timing`
(no ElevenLabs take yet, so shot times are estimates). Word budget 611 / 681, every shot
2–15 s, contiguous coverage 0–300 s, hook inside the 6 s window, CTA on the last shot.

## How it was rendered

```bash
cd remotion && npm install
export CHROME=/opt/pw-browsers/chromium REMOTION_GL=swangle     # headless, no GPU
node scripts/render_explainer.mjs ../Docs/explainer-prototype/trains_plan.json --stills 3,40.25,130,228,276
node scripts/render_explainer.mjs ../Docs/explainer-prototype/trains_plan.json --draft    # 960×540, DRAFT stamp
node scripts/render_explainer.mjs ../Docs/explainer-prototype/trains_plan.json            # 1920×1080 + check_render.py
```

Scene backgrounds are flat poster-style PNGs generated procedurally
(`remotion/public/explainer/trains/*.png`) because the build sandbox cannot reach image
hosts or Krea's CDN. Replace them per shot with Krea/Higgsfield clips (`asset_url`) or
real stills (`scene_image`) and re-render; nothing else changes.

## What this run changed in the platform

- `ExplainerShot` gained `animation_mode` (per-shot 2D/3D override) and `scene_image`.
- `render_explainer.mjs` honours per-shot animation mode, `plan.music` / `plan.music_volume`,
  and derives duration from the shots.
- `ExplainerReel`: incoming shots now overlap the outgoing one by 14 frames, so no cut dips
  to black; the outgoing headline and era badge fade during the overlap; captions live in
  their own layer keyed to the active shot; kinetic headline word spacing fixed.
- `ExplainerScene3D`: procedural placeholders are era-aware (steam, bullet, maglev) chosen
  from the hero asset's name; backdrop image brighter.

## Still missing for a publishable cut

1. **Voice.** Run "Voice & time" in the studio (ElevenLabs with timestamps). That re-times
   every shot to a spoken word, enables word-synced captions, and clears the one warning.
   No TTS engine or voice model was reachable from the sandbox.
2. **Imagery.** Krea clips or licensed stills per shot; the engine prompts are ready in
   `shots[].engine_prompt`.
3. **3D models.** GLB files for the four hero slots (Rocket, express steam, Series 0
   Shinkansen, L0 maglev).
4. **Music.** `steady-horizon-v01.mp3` is a placeholder bed at 8 %.
