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

## Mem0 Cloud Memory & Knowledge Lifecycle
- **Entity Channel (`user_id`):** `FedSafeRetirement`
- **Application ID (`app_id`):** `FedSafeRetirement`
- **Agent ID:** `antigravity`
- **API Endpoint:** `https://api.mem0.ai/v1/memories/`

### Memory Protocols:
1. **Session Start (Recall):**
   - At the start of every session or task, query Mem0 (`POST https://api.mem0.ai/v1/memories/search/` with `user_id: "FedSafeRetirement"`) to recall project context, recent decisions, and handoff state.
2. **Periodic & Milestone Commits:**
   - Save memory entries to Mem0 upon reaching key milestones, making architectural/database schema modifications, or completing major feature implementations.
3. **Sub-Agent Task Orchestration:**
   - Record sub-agent task assignments, delegation scopes, and sub-agent results to Mem0 to preserve orchestration history.
4. **Session Close & Handoff (Context Reset):**
   - When closing a session or preparing a handoff (e.g. for context compaction/restart), save a structured handoff memory to Mem0 containing:
     - Completed tasks & changes made
     - Current state / blockers
     - Immediate next steps for the incoming session.

## 5. FedSafe Brand Bible & Editorial Law (Non-Negotiable)
- **Collaborative Master (Human / Mike Zaino):** [Google Doc (1sKs7udDUjNi-W1YudE5PY9nlWEvfC9447nDU0VAT4fo)](https://docs.google.com/document/d/1sKs7udDUjNi-W1YudE5PY9nlWEvfC9447nDU0VAT4fo/edit) + [Google Drive Asset Folder (1BrTO9rFFgLbLJQI1NhXWtblQ8EcA2Cis)](https://drive.google.com/drive/folders/1BrTO9rFFgLbLJQI1NhXWtblQ8EcA2Cis)
- **Codebase Master (Agent enforcement):** [`SocialMedia/FEDSAFE_SOCIAL_MEDIA_BIBLE.md`](file:///c:/WIP/FEDSafeRetirement/SocialMedia/FEDSAFE_SOCIAL_MEDIA_BIBLE.md)
- **Core Positioning:** *"The Future Favors the Prepared"* · *"No Generalists. No Side Practices. 100% Focused on Federal & Postal Benefits."* · *"80+ Years Combined Experience."*
- **Mandatory On Every Creative Asset:**
  1. FedSafe Shield Logo
  2. SAM.gov Contractor Badge (`UEI: PPQ9UAWNKQ84` | `CAGE: 1A8SS5`)
  3. CTA Phone `(774) 273 8473` / `771-FEDSAFE` & URL `FedSafeRetirement.com`
- **Strict Prohibitions:** No high-pressure sales talk/fear-mongering; No specific financial/tax/investment return guarantees; No political or partisan content.


