# Copy/Paste Prompt for Codex

Build a polished Next.js + Tailwind client review site for FedSafe Retirement artwork concepts.

Use the provided local data file `src/data/artworks.ts`. The site must display numbered cards for image concepts FS-001 through FS-018 and Suno music concepts MU-001 through MU-008.

Group cards into these sections:
- Hero Images
- Federal Roles
- Planning / Guidance
- Concern to Clarity
- Family / Legacy
- Workshops / Training
- Service & Honor
- Suno Music Concepts

Each card must show:
- ID
- title
- media type badge
- section badge
- thumbnail or polished placeholder
- use case
- tags
- why people relate
- full prompt in a collapsible area
- copy prompt button
- select/favorite toggle
- localStorage persistence

Add filters for:
- section
- media type
- appeal/emotion
- audience/relatability
- scenario
- diversity
- search by keyword, title, or ID

Add a selected-items panel with:
- copy selected IDs
- export selected as JSON
- export selected as CSV

Add a detail modal with:
- larger image preview when available
- all metadata
- full prompt
- copy prompt button

Use a clean, premium client-presentation design suitable for a federal retirement planning company. Favor a light background, navy accents, subtle gold highlights, card-based layout, generous spacing, and professional typography.

Do not require a backend. Use static local data and localStorage.

Return a complete working site scaffold, README with run instructions, and a simple place to drop future generated images under `public/artworks/generated/`.
