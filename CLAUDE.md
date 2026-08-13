# FEDSafe Retirement — Claude Code guide

## Repo layout
- `App/` — the main Next.js app (admin portal + APIs), deployed to Vercel. **Most work happens here.**
- `web/` — separate public website project (has its own `CLAUDE.md`).
- `Docs/` — handoff notes and integration docs.

## App stack
- Next.js (App Router) + TypeScript + MUI, Supabase (Postgres + Auth + Storage).
- Deployed on Vercel (Pro). Supabase project lives under the **Mustautomate.Ai** org (Pro).
- Auth gate: `App/src/utils/supabase/middleware.ts` redirects unauthenticated users to `/login`
  (everything except `/login`, `/auth`, `/api/*`).

## Tooling & DB access — know your capabilities
- **Secrets live in `App/.env`**: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_DIRECT_CONNECTION_STRING`
  (direct Postgres URI), `ECHOWIN_API_KEY`, `OPENAI`/etc. Read them from `.env` in throwaway
  scripts; never print the values.
- **Row CRUD on production** → `@supabase/supabase-js` with the service-role key. This is how to
  do data ops (backfills, password sets via `auth.admin`, attendee imports, re-links, verification).
  Run as one-off Node ESM scripts in `App/scratch/` and delete them after.
- **DDL / migrations (ALTER/CREATE/TRIGGER)** → NOT possible through supabase-js (PostgREST is
  CRUD-only). Run raw SQL via `psql`/Supabase CLI using `NEXT_PUBLIC_DIRECT_CONNECTION_STRING`,
  or paste into the Supabase SQL Editor. (If `psql`/CLI isn't installed in the env, say so and
  offer to run it once available, rather than assuming you can't touch the DB.)
- **Live app verification** → the Playwright MCP browser tools are available; log in at
  `https://fedsafe-retirement.vercel.app/login` to click through real pages.
- **Deploy** → push to `master` (GitHub `maikify350/FEDSafeRetirement`) triggers the Vercel build.
  Migrations must be applied to Supabase around the same time as a deploy that depends on them.

## Database conventions — READ BEFORE TOUCHING THE SCHEMA
Full rules: **`App/supabase/DATABASE_CONVENTIONS.md`**. The essentials:

- **Every table MUST have the audit fields** (NON-NEGOTIABLE):
  `cre_dt`, `cre_by`, `mod_dt`, `mod_by`, `version_no`.
- Use `cre_dt`/`mod_dt` — **never** `created_at`/`updated_at`.
- `mod_dt` + `version_no` are bumped automatically by the `trg_<table>_mod_dt` trigger
  (shared `public.update_mod_dt()` function). **App code must not set them** — set only
  `cre_by` on insert and `mod_by` on update.
- Migrations are plain SQL in `App/supabase/migrations/NNN_*.sql`, **run manually** in the
  Supabase Dashboard → SQL Editor (no automated migration runner). Make them idempotent
  (`IF NOT EXISTS`, guarded renames).

## echowin call ingestion (Echo Leads)
- Real-time: `POST /api/echowin/webhook` — echowin posts a small body (e.g. `{ "phone": "$phone" }`);
  the handler resolves the full call from echowin's API (by call id or phone) and upserts it.
- Backup: `POST /api/echowin/sync` (Vercel cron) — echowin's API ignores the `after` filter, so the
  sync skips calls already stored to avoid re-processing everything.
- echowin leads link to an `events` row by **conference city** (`resolveEventIdByCity`), which carries
  the assigned agent (`events.assignedto_fk`). Webinars have no city, so they're linked manually.

## Conventions
- Reuse the shared grid `App/src/components/EntityListView.tsx` for entity list pages.
- Confirmation dialogs use `App/src/components/ConfirmDialog.tsx` (never `window.confirm`).

## Source-code context workflow (global rule)
- For any new SDK/library integration, avoid guessing API names from memory or docs alone.
- Put upstream source references under `reference/repos/github.com/<owner>/<repo>`.
- Current local references preloaded:
  - `reference/repos/github.com/supabase/supabase-js`
  - `C:\WIP\refs\nextjs` (preferred Next.js source mirror; short path avoids Windows filename limits)
- Additional external reference packs (manually mounted on disk, outside this repo):
  - `C:\WIP\#Utils\Vuexy-Admin-v10.11.1\nextjs-version\typescript-version`
  - `C:\WIP\TailwindPlus`
- Before coding integration logic:
  1. Search the local reference source folder for current API and usage patterns.
  2. Implement the smallest viable adapter/service and one calling route/component.
  3. In handoff notes, list which source files/functions were referenced.
- Do not add replacement dependencies just because an API guess failed; search source first.
