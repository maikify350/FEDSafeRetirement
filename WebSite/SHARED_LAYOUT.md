# Shared Layout Rule

The deployed site must use shared header and footer behavior instead of page-specific copies.

Current build behavior:

- `vercel-build.mjs` copies `New/` to `dist/`.
- `build-shared-components.mjs` then replaces every `dist/**/index.html` footer with the standard footer extracted from `dist/index.html`.
- The homepage footer is the footer source of truth until the static site is migrated to explicit partial templates.
- For local preview servers that serve `New/` directly, run `node build-shared-components.mjs --root New` after footer/header source changes.

When creating or reworking pages:

- Do not hand-style a one-off footer for a single page.
- Keep footer links, phone formatting, disclaimer sizing, and CTA formatting aligned with the homepage footer.
- Run `node vercel-build.mjs` before previewing or deploying so the shared footer is applied to all pages.
- Run `node build-shared-components.mjs --root New` when the local server is pointed at `New/` and you need to inspect the standardized footer immediately.
- If header/footer architecture changes, update the shared build step first, then pages.
