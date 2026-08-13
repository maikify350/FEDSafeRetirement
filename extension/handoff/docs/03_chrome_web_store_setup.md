# 03 — Chrome Web Store Setup

## Account Setup

Use a dedicated publisher Google account controlled by VentureSoft LLC.

Recommended:

```text
chrome-publisher@venturesoftllc.com
```

Do not use a personal account as the long-term owner.

## Developer Registration

Steps:

1. Sign into the Chrome Web Store Developer Dashboard.
2. Register as a developer.
3. Accept the developer agreement and policies.
4. Pay the one-time developer registration fee.
5. Set publisher information.
6. Add support/contact details.
7. Add trusted tester emails or Google Groups.

## Store Items

Create two listings if ongoing beta will continue:

```text
ACT Copilot Beta      → Private visibility
ACT Copilot           → Unlisted visibility
```

## Visibility Definitions

| Visibility | Meaning | Best Use |
|---|---|---|
| Public | Searchable and installable by everyone | Not recommended initially |
| Unlisted | Not searchable; anyone with URL can install | Production private-link rollout |
| Private | Limited to specified users/groups | Beta/testing |
| Domain / Organization private publishing | Visible only to approved organization | Larger managed enterprise clients |

## Dashboard Information Needed

Prepare this before upload:

```text
Extension name
Short description
Detailed description
Category
Language
Store icon
Screenshots
Privacy policy URL
Support URL
Homepage URL
Single-purpose statement
Data collection disclosure
Permission justification
Test instructions
Trusted testers or Google Group
Distribution visibility
Regions
```

## Publishing Package Rule

The uploaded ZIP must contain `manifest.json` at the root.

Correct:

```text
extension-upload.zip
├── manifest.json
├── service-worker.js
├── content-scripts/
├── icons/
└── popup/
```

Incorrect:

```text
extension-upload.zip
└── act-copilot-extension/
    └── manifest.json
```

## Version Rule

Every store update must increment the manifest version.

Recommended starting version:

```text
0.1.0
```

Recommended beta versions:

```text
0.1.0-beta.1  # internal repo tag only, not manifest version if Chrome rejects semver suffixes
0.1.1
0.1.2
```

Chrome manifest version should be numeric dot-separated, for example:

```json
"version": "0.1.1"
```

## Test Instructions For Google Review

Provide a reviewer-safe test account and steps:

```text
1. Install extension.
2. Open supported ACT test URL.
3. Sign in with test credentials or use provided mock tenant.
4. Confirm top-nav icon appears.
5. Open drawer.
6. Validate license check.
7. Confirm no premium data is visible without valid license.
```

Do not provide production ACT credentials in the store review instructions.
