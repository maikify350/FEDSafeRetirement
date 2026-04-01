# Antigravity Agent Configuration — FEDSafe Retirement

## Project
- **Name:** FEDSafe Retirement Lead Manager
- **Type:** Next.js Web Application (mini-CRM)
- **Language:** TypeScript
- **Framework:** Next.js 16 + Vuexy v5.x (MUI)
- **Database:** Supabase (PostgreSQL)
- **Styling:** TailwindCSS v4 (utility classes only)
- **Deployment:** Vercel

## Workspace
- **Root:** `c:\WIP\FEDSafeRetirement_App`
- **App:** `c:\WIP\FEDSafeRetirement_App\App`
- **Data:** `c:\WIP\FEDSafeRetirement_App\DataSeed`
- **Docs:** `c:\WIP\FEDSafeRetirement_App\Docs`

## Key Rules
1. Always check Vuexy library (`Docs/Vuexy_library_Reference/`) before building components
2. TailwindCSS classes only — no inline CSS
3. All DB tables must have audit fields (cre_dt, cre_by, mod_dt, mod_by, version_no, tenant_id)
4. UUID primary keys on all tables
5. .webp images only
6. PowerShell-compatible commands (use `;` not `&&` for chaining)
7. Server-side pagination for large datasets
8. Update TODO.md after completing tasks

## Documentation
- `App/PRD.md` — Product requirements
- `App/Database.md` — Schema, tables, triggers
- `App/UI-UX.md` — Design spec, components
- `App/TODO.md` — Task tracker (crash recovery)
- `.agent/claude.md` — Detailed agent instructions
