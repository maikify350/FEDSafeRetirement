# WebSite Scripts

This folder contains operational scripts used by the main website workflow.

## Active

- `serve-dist-range.mjs` - local static server used by `npm run preview` and `npm run dev` workflows.

## Notes

- Build orchestration lives in root-level scripts (`apply-shared-layout.mjs`, `build-shared-components.mjs`, `vercel-build.mjs`) and is exposed through `package.json` scripts.
