# FEDSafeRetirement Workspace

This workspace contains multiple related projects. Only one of them is currently the production website repo.

## Project Map

- `WebSite/` - production FEDSafe Retirement static site (GitHub + Vercel deployment target)
- `WebSite_Designer/` - Next.js artwork review app used for creative review workflows
- `SocialMedia/June28WebinarReel/` - Remotion project for video assets
- `_ARCHIVE_20260606/` - historical archive material; not active development

## Vercel Project Mapping

- `fed-safe-retirement-web-site` -> deploys `WebSite/` (main public site)
- `fedsafe-retirement` -> deploys `WebSite_Designer/` (review app)

If Vercel fails after monorepo changes, verify each project's Root Directory in Vercel settings.

## Where To Start

If you are working on the main site, start in `WebSite/`:

1. Read `WebSite/README.md`
2. Read `WebSite/.agents/CONVENTIONS.md`
3. Make content changes in `WebSite/New/`
4. Run the build/preview commands from `WebSite/package.json`

## Root Monorepo Scripts

Run from workspace root:

- `npm run build:website`
- `npm run build:designer`
- `npm run typecheck:designer`
- `npm run render:social`

## Database Migrations

- Canonical migration path: `supabase/migrations/`
- Policy and lifecycle: `docs/database.md`

## Environment And Secrets

- Never commit `.env` or `.env.*` files.
- Use example files for placeholders only.
- Rotate any key that was ever committed or shared in plain text.
