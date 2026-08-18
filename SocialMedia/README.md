# FedSafe Retirement — Social Media Production Pipeline

Central hub for all video and creative content production for FedSafeRetirement.com across TikTok, Instagram Reels, YouTube, and Facebook.

---

## Quick Start

```bash
# Preview all compositions in Remotion Studio
cd June28WebinarReel
npm install
npm run preview

# Render a specific composition
npx remotion render src/index.tsx DidYouKnowReel out/dyk-fegli-costs.mp4 --codec=h264 --pixel-format=yuv420p
npx remotion render src/index.tsx PartnerSpotlightReel out/spotlight-mike.mp4 --codec=h264 --pixel-format=yuv420p
```

---

## Project Structure

```
SocialMedia/
├── .env                          # API keys (ElevenLabs, HeyGen, Higgsfield, etc.)
├── README.md                     # ← You are here
├── Script_2026Jun28.txt          # Original webinar voiceover script
│
├── June28WebinarReel/            # Remotion project (all compositions)
│   ├── src/
│   │   ├── Root.tsx              # Composition registry
│   │   ├── WebinarReel.tsx       # 79s webinar promo (9:16)
│   │   ├── WhoWeAreVideo.tsx     # 106s brand video (16:9)
│   │   ├── DidYouKnowReel.tsx    # 30s TikTok/Reel template (9:16)
│   │   ├── PartnerSpotlightReel.tsx  # 45s partner reel template (9:16)
│   │   └── components/
│   │       └── SharedComponents.tsx  # Reusable: palette, BrandBug, CTA, etc.
│   ├── public/                   # Static assets (images, audio, logos)
│   ├── out/                      # Rendered MP4s and stills
│   └── package.json
│
├── audio_rebalance/              # Audio mixing variants (vocal/music levels)
│
└── hyperframes/                  # (Future) HeyGen Hyperframes project
```

---

## Available Compositions

| ID | Dimensions | Duration | Platform | Status |
|---|---|---|---|---|
| `WebinarReel` | 1080×1920 | ~79s | IG Reels, TikTok | ✅ Production |
| `WhoWeAreVideo` | 1920×1080 | ~106s | Website, YouTube | ✅ Production |
| `DidYouKnowReel` | 1080×1920 | 30s | TikTok, IG Reels | 🆕 Template ready |
| `PartnerSpotlightReel` | 1080×1920 | 45s | TikTok, IG Reels | 🆕 Template ready |

---

## Tools & APIs

| Tool | Purpose | Config |
|---|---|---|
| **Remotion** | Programmatic video rendering (React → MP4) | `June28WebinarReel/package.json` |
| **ElevenLabs** | AI text-to-speech voiceover narration | `.env` → `ELEVENLABS_API_KEY` |
| **Higgsfield AI** | AI video/image generation (MCP server) | `~/.gemini/antigravity-ide/mcp_config.json` |
| **HeyGen Hyperframes** | HTML → video rendering for quick creatives | `.env` → `HEYGEN_API_KEY` |
| **FFmpeg** | Video encoding/processing (installed via winget) | System PATH |
| **Gemini** | YouTube analysis, script writing, image generation | Agent capability |

---

## Content Production Workflow

1. **Script** — Write voiceover copy (or adapt from existing content)
2. **Narrate** — Generate audio via ElevenLabs API
3. **Compose** — Build/update Remotion composition with scenes timed to narration
4. **Preview** — Review in Remotion Studio (`npm run preview`)
5. **Render** — Export MP4 (`npx remotion render ...`)
6. **Post** — Upload to platform (manual for now; API posting in future phase)

---

## Brand Guardrails

See: [`Marketing/From_Mike_Content/Social_Media_Directives.md`](file:///c:/WIP/FEDSafeRetirement/Marketing/From_Mike_Content/Social_Media_Directives.md)

Key rules:
- Education-first positioning, never sales pressure
- Always display SAM.gov badge
- No financial advice, no guaranteed returns
- No political content
- Tagline: **"The Future Favors the Prepared"**

---

## Platform Specs Reference

| Platform | Aspect Ratio | Max Duration | Resolution | Codec |
|---|---|---|---|---|
| TikTok | 9:16 | 10 min | 1080×1920 | H.264 |
| Instagram Reels | 9:16 | 90s | 1080×1920 | H.264 |
| Instagram Stories | 9:16 | 60s | 1080×1920 | H.264 |
| YouTube | 16:9 | Unlimited | 1920×1080 | H.264 |
| YouTube Shorts | 9:16 | 60s | 1080×1920 | H.264 |
| Facebook Feed | 1:1 or 4:5 | 240 min | 1080×1080 | H.264 |
| Facebook Reels | 9:16 | 90s | 1080×1920 | H.264 |
