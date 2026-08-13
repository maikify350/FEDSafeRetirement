# AGENTS.md - FEDSafeRetirement Workspace Router

Use this file as the default entrypoint for autonomous work in this workspace.

## Identify The Target Project First

- `WebSite/` - production static website, deployed to Vercel
- `WebSite_Designer/` - separate Next.js review app
- `SocialMedia/June28WebinarReel/` - separate Remotion video project

Do not assume a change in one folder automatically affects the others.

## Core Rules For `WebSite/`

- Edit source pages in `WebSite/New/`.
- Do not manually edit generated files in `WebSite/dist/`.
- Do not work in `WebSite/New - Copy/` (backup only).
- Use npm scripts in `WebSite/package.json` for layout/build/preview workflow.

## Preferred Docs By Topic

- Website build + preview: `WebSite/README.md`
- Agent conventions: `WebSite/.agents/CONVENTIONS.md`
- Legal/source content references: `WebSite_Designer/`
- Database migration policy: `docs/database.md`

## Files To Treat As Historical Or Ephemeral

- `WebSite/session-handoff.md` (session-specific history)
- `WebSite/PRD.md` (historical kickoff context)

Use current source code and current build scripts as the source of truth.
