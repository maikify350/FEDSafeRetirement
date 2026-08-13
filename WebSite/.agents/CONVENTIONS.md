# FEDSafe Retirement - Website Conventions

## Scope

This file defines current working conventions for `C:\WIP\FEDSafeRetirement\WebSite`.

## Core Rules

- Edit website source in `New/`.
- Do not manually edit generated deploy output in `dist/`.
- Do not modify `New - Copy/` (backup only).
- Keep existing FEDSafe visual language unless explicitly asked to redesign.

## Build Stack

- Static HTML/CSS/JS site with Node-based build scripts.
- Build pipeline is script-driven via npm in `package.json`.
- Production deploy target: `https://fedsaferetirement.com/`.

## Canonical Commands

From `WebSite/`:

```bash
npm run layout
npm run shared
npm run build
npm run preview
```

`npm run build` runs layout + shared component sync + Vercel build pipeline.

## Working Pattern

1. Update content/templates under `New/`.
2. Run `npm run build`.
3. Verify with `npm run preview`.
4. Commit only intentional changes.

## Documentation Priority

- First: source code + build scripts
- Then: `README.md`, `Docs/BUILD.md`, `Docs/LAYOUT.md`, `Docs/FORMS.md`
- Treat `session-handoff.md` and `PRD.md` as historical context, not canonical instructions.
