# 02 — Owner Actions To Do Now — Non-Coding

These are the actions Ricardo / VentureSoft should complete before Claude starts implementation.

## 1. Create a Dedicated Google Publisher Account

Recommended pattern:

```text
chrome-publisher@venturesoftllc.com
```

or another dedicated Google account under the business domain.

Do not use a personal Gmail as the long-term publisher identity if this will become a commercial extension business.

Why:

- The publisher email receives important Chrome Web Store alerts.
- Google says the developer account email cannot be changed after account creation.
- It keeps ownership separate from personal accounts.
- Easier handoff if a future employee or partner needs admin access.

## 2. Register as a Chrome Web Store Developer

Go to the Chrome Web Store Developer Dashboard and register the publisher account.

Expected action:

```text
Chrome Web Store Developer Dashboard → register → accept agreement/policies → pay one-time registration fee
```

Use the dedicated publisher Google account.

## 3. Decide Publisher Display Name

Recommended:

```text
VentureSoft LLC
```

Alternative if product-specific:

```text
VentureSoft ACT Extensions
```

Use consistent branding across:

- Chrome Web Store account.
- Privacy policy page.
- Support email.
- Install page.
- Extension UI footer/about page.

## 4. Create Support Email

Recommended:

```text
support@venturesoftllc.com
```

or product-specific:

```text
actcopilot@venturesoftllc.com
```

This email should be monitored.

## 5. Create Tester Google Group

Create a Google Group for private beta testers.

Recommended group names:

```text
act-copilot-testers@venturesoftllc.com
fedsafe-act-copilot-testers@venturesoftllc.com
```

Use this group in the Chrome Web Store Private visibility setup.

Important: tester emails must be Google Accounts or Google Workspace accounts.

## 6. Collect Beta Tester Emails

For FedSafeRetirement beta, collect:

```text
Name
Email used for Chrome / Google account
Company
ACT database name or ID
Role
Beta permission level
```

Do not collect ACT passwords for this spreadsheet.

## 7. Prepare Public Web Pages

Before publishing, prepare these pages on VentureSoft or a product domain:

```text
/privacy
/support
/terms
/act-copilot
/act-copilot/install
```

At minimum, the privacy page must clearly describe:

- What data the extension collects.
- Why the extension collects it.
- Whether data is sent to VentureSoft backend.
- How license checks work.
- Whether AI services are used.
- How support access works.
- Limited Use disclosure if personal or sensitive data is handled.

## 8. Decide Extension Names

Recommended:

```text
ACT Copilot Beta
ACT Copilot by VentureSoft
```

Keep the extension single-purpose and narrow.

Avoid a broad name like:

```text
VentureSoft AI Browser Tools
```

Chrome review is easier when the extension has a clear single purpose.

## 9. Prepare Store Listing Assets

Needed:

- 128x128 PNG extension icon.
- 16x16, 32x32, 48x48, 128x128 icons in the extension package.
- Store screenshots.
- One short description.
- One detailed description.
- Support URL.
- Privacy policy URL.
- Test instructions for Google review.

See:

```text
/assets-placeholders/STORE_ASSETS_NEEDED.md
```

## 10. Decide Backend Base Domain

Recommended API domains:

```text
https://api.mustautomate.ai
https://act.mustautomate.ai
https://license.mustautomate.ai
```

Use one stable production endpoint before store submission so the privacy policy and store listing match actual behavior.

## 11. Decide License Authority

Pick where license state lives.

Recommended:

```text
Supabase multi-tenant database
```

Tables should include standard control fields:

```text
tenant_id
created_at
created_by
updated_at
updated_by
version
deleted
```

## 12. Decide Whether To Use Enterprise Publishing Later

For early FedSafeRetirement rollout, use Private beta or Unlisted production.

For larger managed clients, ask their IT admin whether they use:

- Google Workspace managed Chrome.
- Chrome Enterprise policies.
- Microsoft Intune / Group Policy for Chrome.

If yes, prepare enterprise install instructions later.
