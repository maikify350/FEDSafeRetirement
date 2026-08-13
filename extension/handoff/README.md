# Private Chrome Extension Deployment Handoff

Prepared for: Ricardo Garcia / VentureSoft LLC  
Primary use case: ACT.com / FedSafeRetirement private Chrome extension deployment  
Prepared date: 2026-05-15

## Decision Summary

Use Chrome Web Store distribution, not direct `.crx` file distribution, for normal client installs.

Recommended channels:

1. **Development** — local Chrome `Load unpacked`.
2. **Beta** — Chrome Web Store **Private** listing with trusted testers or Google Group.
3. **Production** — Chrome Web Store **Unlisted** listing plus private customer install page.
4. **Enterprise clients** — Chrome Enterprise / Google Workspace managed deployment, including force install or private organization publishing where available.

Security should not depend on hiding the Chrome Web Store URL. The extension must be a thin client. All premium functionality must be server-side license-gated.

## What This Package Contains

```text
chrome-extension-private-deployment-handoff/
├── README.md
├── docs/
│   ├── 01_deployment_strategy.md
│   ├── 02_owner_actions_now.md
│   ├── 03_chrome_web_store_setup.md
│   ├── 04_release_channels.md
│   ├── 05_license_handshake_architecture.md
│   ├── 06_enterprise_deployment.md
│   ├── 07_privacy_security_compliance.md
│   ├── 08_mv3_manifest_requirements.md
│   ├── 09_client_onboarding_sop.md
│   ├── 10_review_submission_notes.md
│   └── 99_official_source_links.md
├── checklists/
│   ├── owner_non_coding_checklist.md
│   ├── claude_build_readiness_checklist.md
│   ├── chrome_store_review_checklist.md
│   └── client_beta_rollout_checklist.md
├── configs/
│   ├── license_request.example.json
│   ├── license_response.example.json
│   ├── tenant_feature_flags.example.json
│   ├── chrome_enterprise_extension_policy.example.json
│   └── project_manifest.json
├── prompts/
│   └── claude_master_prompt.md
├── .claude/
│   └── CLAUDE.md
└── assets-placeholders/
    ├── STORE_ASSETS_NEEDED.md
    └── PRIVACY_POLICY_DRAFT.md
```

## Claude Instructions

Start with:

```text
/prompts/claude_master_prompt.md
```

Then use:

```text
/.claude/CLAUDE.md
```

as standing project guidance.

## Non-Negotiables

- Manifest V3 only.
- No remotely hosted executable JavaScript or WASM.
- No ACT credentials in the extension frontend.
- No permanent raw subscriber IDs as authorization tokens.
- All license, tenant, feature, and premium access checks must be server-side.
- Extension should gracefully hide/disable premium UI when license validation fails.
- Use least-privilege permissions and narrow host permissions.
- Store listing privacy disclosures must match actual data collection.
