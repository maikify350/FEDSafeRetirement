# Database Migrations

This monorepo uses versioned SQL migrations for shared database changes.

## Canonical Location

- `supabase/migrations/`

## Current Canonical Table

- `public.artwork_selections` for review selections used by `WebSite_Designer`.

## Workflow

1. Create a timestamped SQL file in `supabase/migrations/`.
2. Keep migration SQL idempotent when possible.
3. Do not keep canonical schema changes only in README prose or ad-hoc scripts.
4. If emergency dashboard SQL is used, backfill the same change into a migration file immediately.

## Notes

- Legacy ad-hoc scripts are archived under `WebSite/scripts/archive/` and are not the source of truth.
- Any credentials must remain in local `.env` files only and never in committed scripts.
- Example local variables for script-based checks are in `WebSite/.env.example`.
