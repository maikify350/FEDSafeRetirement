# 10 — Chrome Review Submission Notes

## Goal

Make the first store review boring, narrow, and easy to approve.

## First Release Scope

Recommended first release:

```text
Detect ACT page
Show toolbar/icon/drawer
Validate license
Display approved tools/templates
Call backend APIs over HTTPS
No broad web automation
No destructive writes by default
```

## Store Listing Description Draft

```text
ACT Copilot by VentureSoft helps approved ACT.com users access licensed workflow tools and templates directly inside supported ACT.com pages. The extension validates the user’s license with VentureSoft services and enables features assigned to the user’s organization.
```

## Single Purpose Draft

```text
Provide licensed workflow assistance for approved ACT.com users inside supported ACT.com pages.
```

## Permission Justification Draft

```text
The extension requests access to supported ACT.com pages so it can detect the current ACT context and display the licensed ACT Copilot drawer. It uses storage to save a non-secret install identifier and cached feature state. It communicates with VentureSoft backend services over HTTPS to validate license status and retrieve assigned feature configuration.
```

## Test Instructions Draft

```text
1. Install the extension.
2. Open the supplied test ACT-compatible page or staging page.
3. Sign in using the provided test user.
4. Confirm the ACT Copilot icon/drawer appears.
5. Confirm the license check succeeds for the test user.
6. Confirm unlicensed test user receives disabled UI.
```

## Review Avoidance

Avoid submitting a first version that:

- Requests `<all_urls>`.
- Executes fetched JS.
- Scrapes unrelated websites.
- Includes hidden automation.
- Includes screenshots or recording features.
- Has unclear AI data transfer.
- Combines ACT Copilot, nopCommerce theme tools, scraping, and report writer in one extension.

Create separate extensions for separate purposes if needed.
