# CLAUDE.md — Standing Instructions

## Project Identity

This project designs and implements private Chrome extension distribution for VentureSoft LLC products, starting with ACT Copilot for ACT.com / FedSafeRetirement.

## Ricardo's Architecture Preferences

- Design and architecture should be explicit and documented.
- Prefer handoff-ready artifacts.
- Keep documentation in Markdown.
- Use Mermaid diagrams in horizontal left-to-right layout.
- Follow API-first design.
- Use Swagger/OpenAPI contracts for backend endpoints.
- Include `.env.example` placeholders.
- Include audit fields in all database tables.
- Use UUID primary keys.
- Include tenant_id for multi-tenant tables.
- Use soft delete flag: `deleted`.
- Include control fields: `created_at`, `created_by`, `updated_at`, `updated_by`, `version`.

## Chrome Extension Rules

- Manifest V3 only.
- No remotely hosted executable code.
- No extension secrets.
- No ACT credentials in frontend.
- No broad permissions unless justified.
- No hidden data collection.
- No premium feature without backend license validation.

## Backend Rules

- Backend is licensing authority.
- Backend returns short-lived signed session tokens.
- Backend returns feature flags.
- Backend controls kill switches.
- Backend logs license checks and denied access safely.
- Backend should not log unnecessary CRM page content.

## ACT Rules

- ACT credentials and ACT API tokens must be handled backend-side.
- Extension can send ACT database identity/context if discoverable.
- Extension must not scrape or transmit full records unless user explicitly triggers a supported feature.

## Initial Feature Philosophy

First release should be review-friendly and conservative:

- Drawer/icon injection.
- License check.
- Template/tool display.
- Read-only AI/rules where possible.
- Write actions disabled by default.

## Avoid

- Combining unrelated product purposes in the same extension.
- `<all_urls>` host permission unless unavoidable.
- Remote JS, eval, new Function.
- Permanent subscriber IDs as security tokens.
- Secrets in browser storage.
