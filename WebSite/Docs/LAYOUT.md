# Shared Layout

Shared layout behavior is script-driven and applies across pages.

## Source of Truth

- `apply-shared-layout.mjs`
- `build-shared-components.mjs`
- `SHARED_LAYOUT.md` (legacy explanation)

## Workflow

1. Make shared header/footer updates through scripts, not one-off page copies.
2. Re-run layout and shared scripts before building.
3. Verify in preview that repeated sections remain consistent across pages.
