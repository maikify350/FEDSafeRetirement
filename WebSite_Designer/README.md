# FedSafe Retirement Artwork Review

This folder contains a complete Next.js + Tailwind review microsite for FedSafe Retirement artwork and Suno music concepts. Artwork selections are **shared and synced in real time** across all reviewers via Supabase — no sharing links needed.

## Supabase Setup (required for shared selections)

1. Create a free project at [supabase.com](https://supabase.com).
2. Apply the canonical migration from this monorepo:
   - `supabase/migrations/20260618000000_create_artwork_selections.sql`
3. Enable **Realtime** for the table: Database -> Replication -> enable `artwork_selections`.
4. Copy `.env.local.example` to `.env.local` and fill in your project URL and anon key (Settings -> API in the Supabase dashboard).
5. Add the same two env vars to your **Vercel project** (Settings -> Environment Variables) so the deployed site also connects.

If the env vars are missing the app falls back to localStorage — selections will work locally but won't sync across users.

---

## Run It

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

For a production build:

```bash
npm run build
npm start
```

The production build now uses webpack so the exported `_next` assets stay friendlier for static hosting.

## Deploying Under `/FSR_Review`

If you are building this to live under `www.mustautomate.ai/FSR_Review`, build with a base path so internal routes and assets resolve correctly.

PowerShell:

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/FSR_Review"
npm run build
```

Local development can stay unchanged with no base path set.

## Build A Copy-Ready Publish Folder

To create a static folder you can copy directly into `www.mustautomate.ai/FSR_Review`, build in static export mode and then copy the exported files into a publish folder.

PowerShell:

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/FSR_Review"
$env:BUILD_STATIC_EXPORT="1"
npm run build
```

That creates an `out/` folder. The contents of `out/` should live inside the target `FSR_Review` folder on the server.

## What’s Included

- Sectioned gallery for all `FS-001` through `FS-018` and `MU-001` through `MU-008`
- Filters for section, media type, appeal, audience, scenario, diversity, and keyword search
- Detail modal with full metadata and prompt copy
- Card-level collapsible prompts
- Supabase-backed `Select for Review` state — shared across all reviewers in real time (falls back to localStorage if Supabase is not configured)
- Selected-items panel with copy IDs, export JSON, and export CSV
- Placeholder treatments for concepts that do not yet have generated image files

## Content Source

The review site reads from:

- `src/data/artworks.ts`

Additional handoff docs are still included for reference:

- `CODEX_HANDOFF.md`
- `CODEX_BUILD_PROMPT.md`
- `IMAGE_PROMPTS.md`
- `SUNO_PROMPTS.md`
- `data/artworks.json`
- `data/artwork_index.csv`

Database migration policy is documented at:

- `../docs/database.md`

## Generated Artwork Folder

Drop future generated images into:

```text
public/artworks/generated/
```

Then update the matching `thumbnail` path in `src/data/artworks.ts`.

## Soundtrack Folder

Drop future review MP3s into:

```text
public/soundtracks/
```

Then add the matching `audioSrc` path to the relevant music concept in `src/data/artworks.ts`.

## Current Included Previews

The package already includes mapped preview images for:

- `FS-001`
- `FS-003`
- `FS-005`
- `FS-006`
- `FS-011`
- `FS-015`
