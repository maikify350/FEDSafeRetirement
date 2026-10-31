# 🎬 FEDSafe Retirement — Video Generation & Voice Cloning Architecture Guide

**Last Updated:** August 18, 2026  
**Status:** Production Ready  
**Deployment Target:** `https://fedsafe-retirement.vercel.app/videos` & `https://fedsafe-retirement.vercel.app/gallery`

---

## 1. Executive Summary & Core Rules

1. **Brand Transparency Strict Mandate (Mike Zaino Rule):**
   - **Zero White Box Policy:** All brand logos in video reels, social posts, and dark mode UI must use **100% alpha transparency with tight, minimal borders** (`fedsafe-double-logo-transparent.png`, `fedsafe-shield-logo-transparent.png`, `fedsafe-sam-badge-transparent.png`, `fedsafe-logo-tagline-transparent.png`).
   - Never place uncropped white-background logos over video footage or colored backgrounds.
2. **Interactive Teleprompter & Instant Voice Cloning:**
   - Mike Zaino records 2–3 minutes of natural speech (440 words) using the in-app **Voice Calibration & Teleprompter Studio**.
   - Cloned in **~5 seconds** via ElevenLabs Instant Voice Cloning (`POST /api/voices/clone`) at **0 generation token cost**.
   - Accessible across all video models with the **"🌟 Partner Voice: Mike Zaino"** badge.
3. **Hyperframes Engine:**
   - Sentence-by-sentence narrative synchronization.
   - Text Overlays: Bold Headline Banner, Stat Pill (e.g. `1.1% Multiplier`, `$115k High-3`), Cautionary Lower-Third (`FEGLI Spike`, `FEHB 5-Year Rule`), Quote Frosted Glass Pill.
   - Camera Motion & Fly-Bys: `drone_fly_by`, `dynamic_orbit`, `push_forward`, `pan_slow_right`, `fly_by_left`, `fly_by_right`.

---

## 2. Real-Time Cloud Production Cost Model

The Video Generator calculates exact estimated costs in real-time as the creator edits scripts, durations, and AI motion engines:

| Component | Engine / Model | Rate Calculation | Est. Cost (40s Reel) |
| :--- | :--- | :--- | :--- |
| **Voiceover TTS** | ElevenLabs Multilingual v2 | ~$0.00003 per character | **~$0.015** (500 chars) |
| | OpenAI TTS-1 / TTS-1-HD | ~$0.015 / 1k chars | ~$0.008 |
| **Motion Video** | Higgsfield DoP (Camera Motion) | ~$0.018 per second | **~$0.720** (40s) |
| | SeedDance 1.5 Pro | ~$0.022 per second | ~$0.880 (40s) |
| | OpenAI Sora Turbo | ~$0.040 per second | ~$1.600 (40s) |
| | Kling AI 1.5 High-Def | ~$0.015 per second | ~$0.600 (40s) |
| | Qwen Wan 2.1 (OpenRouter) | ~$0.012 per second | ~$0.480 (40s) |
| **Infographics** | Static Image Slides + Ken Burns | ~$0.010 per slide | **~$0.050** (5 slides) |
| **LLM Validation**| Claude 3.5 Sonnet / GPT-4o-mini | Pacing & Hyperframe parsing | **~$0.003** per run |
| **Total Est. Cost**| **Generative Motion Reel (40s)**| **Voice + Video + LLM** | **~$0.74 / run** |
| | **Static Slide Reel (40s)** | **Voice + Slides + LLM** | **~$0.07 / run** |

---

## 3. Voice Cloning Pipeline (ElevenLabs & F5-TTS)

### A. Teleprompter & Live Studio (`VoiceCloneStudioDialog.tsx`)
- **Route:** In-app modal accessible from the **"🎙️ Record Mike's Voice"** button in `/videos`.
- **Features:**
  - Full 3-minute scrolling teleprompter with phonetic, numerical, and emotional breakdown.
  - Live in-browser microphone recording with audio waveform and timer (`MediaRecorder` API).
  - Drag-and-drop uploader for iPhone Voice Memos (`.m4a`, `.mp3`, `.wav`).
  - 1-click **"Copy Script"** for reading on iPad or physical paper.

### B. Endpoint Architecture (`POST /api/voices/clone`)
- **Multipart Form Payload:** `file` (audio binary), `name` (`Mike Zaino (Official)`), `description`.
- **ElevenLabs API Request:** `POST https://api.elevenlabs.io/v1/voices/add` with `xi-api-key`.
- **Response:** Returns `voice_id` which is immediately injected into the voice selector dropdown.

---

## 4. UI/UX Workflow & Features

1. **Dual Video Duplication / Cloning:**
   - **Grid Actions Column:** 1-click **Clone Button (`tabler-copy`)** creates `"[Title] (Copy)"` with all scripts, Hyperframes, and continuity assets duplicated.
   - **Video Edit Dialog:** Top header **"Save as Copy"** button clones the current working draft.
2. **Eye Screen Preview Player (`tabler-eye`):**
   - Launches a large cinema-style modal player with high-contrast backdrop, full 9:16 / 16:9 responsive playback, spoken script snippet, and 1-click **"Copy Video URL"** and **"Edit Video"** buttons.
3. **Gender-Coded Voice Selector:**
   - Male voices styled with soft light-blue tint (`rgba(59, 130, 246, 0.12)`) and `M` badge.
   - Female voices styled with soft light-pink tint (`rgba(236, 72, 153, 0.12)`) and `F` badge.
4. **Maximized Viewport Canvas:**
   - Dialog expanded to `95vw × 94vh` with 8-row script editor and 3-row AI directive to eliminate internal scrolling.
5. **Strict Modal Confirmation:**
   - Zero `window.alert()` / `window.confirm()`. Red delete actions open styled Material-UI [`<ConfirmDialog>`](file:///c:/WIP/FEDSafeRetirement/App/src/components/ConfirmDialog.tsx).

---

## 5. API Reference Summary

- `GET /api/videos` — Retrieve all active video records from Supabase `public.videos`.
- `POST /api/videos` — Create a new video record or clone.
- `PUT /api/videos/[id]` — Update video script, Hyperframes, continuity references, and thumbnail.
- `DELETE /api/videos/[id]` — Soft-delete video record.
- `POST /api/voices/preview` — Generate on-the-fly audio preview for any selected voice and script text.
- `POST /api/voices/clone` — Clone Mike Zaino's 3-minute recording into an ElevenLabs voice profile.
- `POST /api/videos/script-validate` — Algorithmic and LLM pacing estimation with auto-generated Hyperframe timestamps.

---

## 6. Render Pipeline (MVP 1) — Production

**Flow:** `/videos` → *Render & Replace* → `POST /api/videos/render` (Vercel) → proxied to the Railway render service → ElevenLabs narration (or existing `audio_url`) → `npx remotion render <composition>` → upload to Supabase Storage `videos/renders/` → `videos.video_url` + `status='ready'` patched → UI polls `GET /api/videos/render/status?job=` every 2s.

**Config:** Vercel needs `RENDER_SERVICE_URL`, `RENDER_SERVICE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ELEVENLABS_API_KEY`. Railway needs `RENDER_SERVICE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ELEVENLABS_API_KEY`, optional `APP_URL`. No key is baked into the code — a missing variable fails loudly.

**Invariants (2026-10-31):**
- The composition allowlists in `render-service/server.ts` and `App/src/app/api/videos/render/route.ts` must match the `<Composition id>` entries in `remotion/src/Root.tsx` (15 today, including `WebinarReel`).
- `DynamicScriptReel` length is computed by `calculateMetadata` from the sum of scene durations, so a 35s script renders a 35s file (previously always 90s).
- `videos.status` only accepts `draft | generating | ready | failed`; the render service writes `ready`. A failed DB patch fails the job instead of reporting success.

**Local smoke test (no API keys needed):**
```bash
cd remotion && npm ci
npx remotion render src/index.tsx DynamicScriptReel out/smoke.mp4 \
  --codec=h264 --pixel-format=yuv420p --props=out/props_test.json
```
