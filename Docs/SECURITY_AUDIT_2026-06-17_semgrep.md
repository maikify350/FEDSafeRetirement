# Security Audit — Semgrep Static Analysis

**Project:** FEDSafe Retirement (`App/`)
**Date:** 2026-06-17
**Tool:** Semgrep 1.159.0
**Scope:** `App/src` — 356 files scanned, 219 rules run (~99.9% parsed)
**Rulesets:** `p/default`, `p/security-audit`, `p/owasp-top-ten`, `p/secrets`, `p/nextjs`, `p/react`, `p/typescript`, `p/command-injection`
**Not scanned:** `node_modules`, the Vuexy reference libraries, and the separate `web/` project.

Reproduce:
```bash
# Windows: force UTF-8 so rule download doesn't hit a cp1252 encoding error
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 semgrep scan \
  --config p/default --config p/security-audit --config p/owasp-top-ten \
  --config p/secrets --config p/nextjs --config p/react --config p/typescript \
  --config p/command-injection --metrics off App/src
```

---

## Executive summary

**No exploitable vulnerabilities found.** Semgrep reported **9 findings** (1 ERROR, 6 WARNING, 2 INFO). After manual triage:

| Triage outcome | Count |
|---|---|
| False positive | 6 |
| Low risk — defense-in-depth recommended | 3 |
| Confirmed exploitable | 0 |

The one `ERROR`-severity finding (a "generic secret") is a **false positive** — it's Cloudflare's public, documented test key, and real secrets are read from environment variables. The remaining findings are path-handling and logging patterns that are either fed by hardcoded literals or whitelisted input.

---

## Findings & triage

### 1. ERROR — `detected-generic-secret` · `src/app/api/public/_turnstile.ts:12`
```ts
const LOCAL_TEST_SECRET = '1x0000000000000000000000000000000AA'
```
**Status: FALSE POSITIVE.** `1x0000000000000000000000000000000AA` is Cloudflare Turnstile's **publicly documented "always passes" test secret**, used only when no env var is set *and* `NODE_ENV !== 'production'` (`turnstileSecret()` returns `null` in production if unconfigured). Real secrets come from `TURNSTILE_SECRET_KEY` / `CLOUDFLARE_TURNSTILE_SECRET_KEY` / `CF_TURNSTILE_SECRET_KEY`. No action required.
*Optional:* add `// nosemgrep: detected-generic-secret` with a comment to silence it.

### 2–4, 6–7, 9. WARNING — `path-join-resolve-traversal` (path handling)
Locations: `blueprint/generate-pdf/route.ts:43,88,89`, `proxy/calculatefinal/route.ts:41,42`, `lib/pdfgen/cowboy_pdf_preparer_api.js:433`.

Two sub-cases:

- **`loadBundledJson(...)`** — `generate-pdf:88-89`, `calculatefinal:41-42`.
  **Status: FALSE POSITIVE.** The function is only ever called with **string literals** (`loadBundledJson('state_income_tax_rates.json')`, `'state_retirement_tax_rules.json'`). No user input reaches `path.resolve`.

- **`loadDocumentFieldMap(mapFileName)`** — `generate-pdf:43` and the analogous `cowboy_pdf_preparer_api.js:433`.
  **Status: LOW RISK (defense-in-depth).** The map filename derives from a form key that is validated against the `FORM_KEY_MAP` allow-list (unknown forms are rejected with HTTP 400 before any file read). Not directly attacker-controlled today.
  **Recommendation:** add an explicit guard so it stays safe even if a caller changes — e.g. `path.basename(mapFileName)` and/or assert the resolved path stays under `public/pdfmaps`:
  ```ts
  const safe = path.basename(mapFileName)               // strip any ../ segments
  const mapPath = path.join(process.cwd(), 'public', 'pdfmaps', safe)
  ```

### 5, 8. INFO — `unsafe-formatstring` · `echowin/sync/route.ts:173`, `assets/iconify-icons/bundle-icons-css.ts:217`
```ts
console.error(`[echowin/sync] call ${call.id}:`, err)   // sync route
```
**Status: NEGLIGIBLE / FALSE POSITIVE.** These are template-literal `console` calls (not `util.format` with attacker-supplied format specifiers). Worst case is cosmetic log-forging. `bundle-icons-css.ts` is a build-time script, not runtime code. No action required.

---

## Recommendations (priority order)

1. **(Low) Harden PDF map loading** — apply `path.basename()` + a containment check in `loadDocumentFieldMap` (`generate-pdf/route.ts:43`, `cowboy_pdf_preparer_api.js:433`). Pure defense-in-depth; not currently exploitable.
2. **(Housekeeping) Silence the test-key false positive** — annotate `_turnstile.ts:12` with `// nosemgrep` so future scans stay clean.
3. **(Process) Add Semgrep to CI** — run the same command on pull requests (e.g. a GitHub Action) so regressions are caught automatically. Use `PYTHONUTF8=1` on Windows runners.

## Notes
- Secrets are correctly sourced from environment variables throughout; no hardcoded production credentials were found in `App/src`.
- The Supabase service-role key and connection string live in `App/.env` (gitignored) — confirm `.env` is never committed.
- This audit covers **static analysis only**. It does not cover dependency CVEs (`npm audit`), runtime/authz logic, or the `web/` project.
