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
