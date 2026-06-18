# FEDSafe Retirement Lead Manager — Agent Instructions

> This file governs AI agent behavior for the FEDSafe Retirement project.

---

## Project Context

- **App:** FEDSafe Retirement Lead Manager (mini-CRM)
- **Stack:** Next.js 16 + Vuexy v5.x (MUI) + Supabase + TailwindCSS v4
- **Data:** 472,576 USPS federal employee records (FOIA 2025)
- **Workspace:** `c:\WIP\FEDSafeRetirement_App\App`
- **Supabase Project ID:** `gqarlkfmpgaotbezpkbs`

---

## MANDATORY RULES

### 1. Vuexy Library — ALWAYS Check First

**BEFORE writing ANY component**, check the Vuexy reference library at:

```
Docs/Vuexy_library_Reference/nextjs-typescript-version/full-version/src/
```

Key locations to check:
- `views/` — Page-level components (Login, ForgotPassword, etc.)
- `views/apps/` — Application modules (user list, invoice, etc.)
- `@core/components/` — Reusable core components (TextField, Avatar, etc.)
- `components/` — App-level shared components
- `configs/` — Theme and config files
- `@layouts/` — Layout system
- `@menu/` — Navigation menu system

**If Vuexy already provides a component, ADAPT it. Do NOT build from scratch.**

### 2. TailwindCSS ONLY — No Inline CSS

```tsx
// ✅ CORRECT
<div className="flex items-center gap-4 p-6">

// ❌ FORBIDDEN — inline styles
<div style={{ display: 'flex', padding: '24px' }}>
<div style="display: flex; padding: 24px;">
```

**Zero exceptions.** All styling must use Tailwind utility classes.

### 3. Database Audit Fields — NON-NEGOTIABLE

Every table MUST include these 6 columns:

| Column | Type | Default |
|--------|------|---------|
| `cre_dt` | `timestamptz` | `now()` |
| `cre_by` | `text` | `''` |
| `mod_dt` | `timestamptz` | `now()` |
| `mod_by` | `text` | `''` |
| `version_no` | `integer` | `1` |
| `tenant_id` | `uuid` | `NULL` |

This applies to ALL tables including junction/bridge tables. No exceptions.

### 4. UUID Primary Keys

All tables use `uuid` primary keys with `gen_random_uuid()`. No serial/auto-increment.

### 5. Image Format

Use `.webp` format exclusively for all content images. SVG is acceptable only for icons and logos.

### 6. Responsive Design

All layouts must be responsive using Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`).

### 7. Confirmation Dialogs — NEVER use alert()/confirm()

All confirmations must use the reusable `ConfirmDialog` component. Never use `window.alert()`, `window.confirm()`, or `window.prompt()`.

### 8. Required Fields — Red Asterisk Labels

Required fields display a **bold red asterisk** using `RequiredLabel` component. Validation enforced in save handler.

### 9. Grid Preferences Persistence

Column visibility, order, sizing, density, and page size all persist per-user via `useGridPreferences` hook (localStorage + Supabase JSONB).

### 10. "+Add" Button Positioning

The primary action button ("+Add Lead", "+Add User", etc.) is always pinned to the far right of the toolbar with 10px right padding.

### 11. Export Field Picker

All CSV/JSON exports go through `ExportFieldPickerDialog` which lets users pick/reorder fields. Selections persist to localStorage.

---

## PowerShell / Windows Terminal Compatibility

This project is developed on **Windows** using **PowerShell**. Follow these rules:

### Command Chaining
```powershell
# ✅ CORRECT — use semicolons in PowerShell
command1; command2; command3

# ❌ WRONG — && is not standard PowerShell (only works in PS 7+)
command1 && command2

# ✅ If you need conditional chaining, use:
command1; if ($LASTEXITCODE -eq 0) { command2 }
```

### Path Separators
```powershell
# ✅ Both work in PowerShell
"c:\WIP\FEDSafeRetirement_App\App"
"c:/WIP/FEDSafeRetirement_App/App"
```

### Environment Variables
```powershell
# ✅ Reading env vars in PowerShell
$env:NEXT_PUBLIC_SUPABASE_URL

# ❌ WRONG — bash syntax
$NEXT_PUBLIC_SUPABASE_URL
```

### Common Commands
```powershell
# Create directory
New-Item -ItemType Directory -Path "folder_name" -Force

# List files
Get-ChildItem -Path "." -Recurse

# Remove directory
Remove-Item -Path "folder_name" -Recurse -Force

# Copy file
Copy-Item -Path "source" -Destination "target"

# Find file content
Select-String -Path "*.ts" -Pattern "searchTerm"
```

---

## Project Documentation

| Document | Purpose |
|----------|---------|
| `PRD.md` | Product requirements, features, phased plan |
| `Database.md` | Schema, tables, indexes, triggers, RLS |
| `UI-UX.md` | Design spec, components, Vuexy mapping |
| `TODO.md` | Current task tracker — keep updated |
| `.agent/claude.md` | This file — agent behavior rules |

---

## Communication Rules

### Progress Updates — MANDATORY

**Always provide periodic progress updates on long-running tasks.** When running background processes, batch operations, scraping, builds, deployments, or any task that takes more than ~30 seconds:

- Report progress at regular intervals (every 25% or every meaningful milestone)
- Include: what's done, what's remaining, any issues encountered
- If a task is running in background, check on it and report status proactively
- Never go silent during multi-minute operations — keep the user informed

---

## Development Workflow

1. **Check TODO.md** before starting any work
2. **Reference Vuexy library** before writing components
3. **Use server-side pagination** for the 472K leads table — never client-side
4. **Test in PowerShell** — no bash-specific syntax
5. **Update TODO.md** after completing tasks
6. **Commit incrementally** to GitHub with descriptive messages

---

## Key File Paths

```
c:\WIP\FEDSafeRetirement_App\
├── App\                          ← Next.js application root
│   ├── .env                      ← Environment variables
│   ├── PRD.md                    ← Product requirements
│   ├── Database.md               ← Schema documentation
│   ├── UI-UX.md                  ← UI/UX specification
│   └── TODO.md                   ← Task tracker
├── DataSeed\                     ← Source data files
│   └── 00 FOIA 2025 PO REVISED.xlsx
├── Docs\
│   └── Vuexy_library_Reference\  ← Vuexy UI library reference
│       └── nextjs-typescript-version\
│           ├── full-version\     ← Complete component library
│           └── starter-kit\      ← Minimal starter template
└── .agent\
    └── claude.md                 ← This file
```

---

## Skills Available (Global)

The following skills are available globally at `C:\Users\HomePC\.gemini\skills\` — do NOT duplicate them:

- **skill_agent_builder** — For creating/refining AI task skills
- **webseo** — SEO audit and implementation (`/webseo audit|plan|implement|verify`)

---

## Supabase Connection

```
URL:        https://gqarlkfmpgaotbezpkbs.supabase.co
Project ID: gqarlkfmpgaotbezpkbs
```

API keys and connection strings are in `App/.env`.
