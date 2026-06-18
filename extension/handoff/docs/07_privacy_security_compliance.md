# 07 — Privacy, Security, and Compliance

## Chrome Review Requirements

The store listing and privacy tab must accurately disclose:

- Extension single purpose.
- Permissions used.
- Data collected.
- Why the data is collected.
- Where data is sent.
- Whether data is sold or used for advertising.
- Whether personal or sensitive data is handled.
- Limited Use certification when applicable.

## Single-Purpose Statement

Recommended statement:

```text
ACT Copilot helps licensed ACT.com users access VentureSoft-approved workflow assistance, templates, and account-specific productivity tools directly inside supported ACT.com pages.
```

Avoid broad statements like:

```text
This extension automates anything on any web page using AI.
```

## Permission Strategy

Use least privilege.

Prefer specific host permissions:

```json
"host_permissions": [
  "https://*.act.com/*",
  "https://*.actcrm.com/*",
  "https://act.mustautomate.ai/*",
  "https://api.mustautomate.ai/*"
]
```

Avoid:

```json
"host_permissions": ["<all_urls>"]
```

unless truly required and defensible.

## Remote Hosted Code Rule

Manifest V3 extensions must bundle executable code inside the extension package.

Allowed from backend:

```text
JSON configuration
feature flags
license status
template data
text prompts
CSS-like data if not executable
```

Not allowed:

```text
remote JavaScript loaded and executed
remote WASM loaded and executed
eval of fetched code
new Function() from backend text
script tags pointing to remote JS
```

## ACT Credential Handling

Never store ACT passwords in Chrome storage.

Never send ACT passwords from the extension directly to third-party services.

Preferred:

```text
Extension → VentureSoft backend → ACT API
```

The backend owns ACT token exchange, token storage, refresh, and audit.

## User Data Handling

Collect the minimum needed:

```text
user email
extension version
install id
ACT database id/name
tenant id
feature usage events
non-sensitive page context needed for the requested action
```

Avoid collecting:

```text
full page screenshots
unnecessary contact notes
full CRM record dumps
passwords
credit card numbers
SSNs
medical data
financial details unless explicitly required and approved
```

## Privacy Policy Must Mention

- The extension works only for licensed customers.
- User and tenant identifiers are sent to VentureSoft backend for licensing and feature control.
- Data is encrypted in transit.
- Data is not sold.
- Data is not used for personalized or retargeted advertising.
- Human access to customer data is restricted and only used for support/security/legal reasons or with user consent.
- AI features may process user-provided text if enabled.

## Store Review Risk Areas

Reviewers may flag:

- Broad host permissions.
- Broad scripting permission.
- Remote code patterns.
- Hidden data collection.
- Undisclosed AI or third-party data transfer.
- Mismatch between listing description and actual behavior.
- Extension doing too many unrelated things.

## Safer First Release

First release should be narrow:

```text
Detect supported ACT pages
Show licensed drawer
Validate license
Display templates/tools
Read-only assistance where possible
No destructive write automation by default
```

Add advanced write/macros later after successful review history.
