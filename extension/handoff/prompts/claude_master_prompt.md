# Claude Master Prompt — Private Chrome Extension Deployment

You are working on a private Chrome extension deployment project for Ricardo Garcia / VentureSoft LLC.

Primary product: ACT Copilot  
Primary beta client: FedSafeRetirement  
Goal: Build a Manifest V3 Chrome extension and supporting backend deployment workflow that can be distributed privately through the Chrome Web Store.

## Read These Files First

1. `README.md`
2. `docs/01_deployment_strategy.md`
3. `docs/05_license_handshake_architecture.md`
4. `docs/07_privacy_security_compliance.md`
5. `docs/08_mv3_manifest_requirements.md`
6. `.claude/CLAUDE.md`

## Build Objective

Create a Chrome extension scaffold and backend contract that supports:

- Local dev via `Load unpacked`.
- Private Chrome Web Store beta release.
- Unlisted Chrome Web Store production release.
- Enterprise deployment using extension ID and Chrome policy.
- Server-side license validation.
- Tenant/user/seat-based feature flags.
- Safe ACT.com page detection.
- No secrets in extension package.
- No remotely hosted executable code.

## Non-Negotiable Rules

- Manifest V3 only.
- No remote JavaScript or WASM execution.
- No ACT passwords or tokens stored in extension frontend.
- No static license secrets in extension source or package.
- No premium feature enabled without backend license validation.
- Keep permissions minimal.
- Use exact host permissions; avoid `<all_urls>` unless formally justified.
- Maintain a clear single purpose: licensed workflow assistance for ACT.com users.

## Recommended Deliverables

Produce implementation artifacts in a repo-ready structure:

```text
/apps/act-copilot-extension
/apps/license-api
/docs
/.claude
```

At minimum:

```text
manifest.json
service worker
content script
extension drawer/popup/side panel placeholder
license client
feature flag client
install id generation
safe disabled state
build script for Chrome Web Store ZIP
backend API contract
README for local testing
README for store upload
```

## API Contract

Use these contracts as starting point:

- `configs/license_request.example.json`
- `configs/license_response.example.json`
- `configs/tenant_feature_flags.example.json`

## Initial Feature Flags

Start with safe beta behavior:

```json
{
  "copilot_drawer": true,
  "letter_ai_templates": true,
  "ai_rules": true,
  "dom_write_actions": false,
  "admin_tools": false,
  "debug_panel": true,
  "telemetry": true
}
```

## Important Security Interpretation

The Chrome Web Store install link is not secret. Anyone with an Unlisted URL can install the extension. The backend must disable all premium functionality for unlicensed users.

## Review-Friendly First Release

Keep first Chrome Web Store submission narrow:

- Detect ACT page.
- Show drawer/icon.
- Validate license.
- Display allowed tools/templates.
- No destructive writes.
- No broad scraping.
- No hidden background data collection.

## Output Expectations

When generating code later, include:

- Clear file structure.
- Comments explaining why security decisions were made.
- `.env.example` only, never real secrets.
- Build command that generates a ZIP with `manifest.json` at root.
- Version increment instructions.
- Chrome review notes.
