# 06 — Enterprise Deployment

## When To Use Enterprise Deployment

Use enterprise deployment for clients with managed Chrome environments.

Typical signals:

- Client has Google Workspace.
- Client has Chrome Enterprise management.
- Client uses Microsoft Intune, Group Policy, or another MDM tool.
- IT wants users to receive the extension automatically.
- IT wants to prevent users from disabling/removing the extension.

## Option A — Force Install By Policy

The customer admin uses the Chrome extension ID and the Chrome Web Store update URL.

Example policy:

```json
{
  "abcdefghijklmnopabcdefghijklmnop": {
    "installation_mode": "force_installed",
    "update_url": "https://clients2.google.com/service/update2/crx",
    "toolbar_pin": "force_pinned"
  }
}
```

Replace:

```text
abcdefghijklmnopabcdefghijklmnop
```

with the actual extension ID from the Chrome Web Store URL.

## Option B — Normal Installed By Policy

This installs the extension automatically but allows users to disable it.

```json
{
  "abcdefghijklmnopabcdefghijklmnop": {
    "installation_mode": "normal_installed",
    "update_url": "https://clients2.google.com/service/update2/crx",
    "toolbar_pin": "default_pinned"
  }
}
```

## Option C — External Organization Private Publishing

Chrome began rolling out a private enterprise publishing option where a developer can publish privately to an external organization after the organization admin approves the publisher.

High-level flow:

```mermaid
flowchart LR
    A[VentureSoft Developer Account] --> B[Generate Organization Approval Link]
    B --> C[Client Admin Approves Publisher]
    C --> D[VentureSoft Selects Client Organization in Distribution]
    D --> E[Submit Extension for Review]
    E --> F[Visible Only to Approved Organization]
```

Use this for larger clients where:

- Unlisted link is not enough.
- Customer wants private organization-only visibility.
- Customer admin is available to approve VentureSoft.

## Client IT Questions

Ask enterprise clients:

```text
1. Do you manage Chrome through Google Admin Console, Intune, GPO, or another MDM?
2. Do users sign into Chrome with company Google Workspace accounts?
3. Can your admin force install Chrome Web Store extensions?
4. Do you require a security review before deployment?
5. Do you need a data processing agreement or vendor risk form?
6. Should users be able to disable the extension?
7. Should the toolbar icon be pinned?
8. Are there allowed/blocked host permission policies?
```

## Enterprise Install Package To Provide Client

Create a small client IT package containing:

```text
Extension name
Extension ID
Chrome Web Store URL
Update URL
Required host permissions
Data collected
Support contact
Privacy policy URL
Policy JSON example
Rollback/disabling instructions
```

## Do Not Do This

Do not email CRX files to enterprise users as the main install method.

Use Chrome Web Store hosted extension ID plus policy deployment unless a specific managed environment requires another approach.
