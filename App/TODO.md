# FEDSafe Retirement — TODO Tracker

> **Last Updated:** 2026-04-01 16:13 CST
> **Purpose:** Crash recovery and session continuity. Always check this file when resuming.

---

## ✅ COMPLETED

### Phase 0: Project Foundation
- [x] Analyze FOIA data source (472,576 records, 13 columns)
- [x] Create PRD.md — product requirements document
- [x] Create Database.md — schema, tables, triggers, indexes, RLS
- [x] Create UI-UX.md — design spec, component mapping, responsive rules
- [x] Create .agent/claude.md — agent instruction rules
- [x] Create .agent/antigravity.md — project metadata
- [x] Create lead.json — full schema with enrichment strategy & provider comparison
- [x] Initialize Git repo, .gitignore, initial commit
- [x] Create GitHub repo (maikify350/FEDSafeRetirement) and push
- [x] Update Supabase MCP config with new token (ricardo@mustautomate.ai account)

### Phase 1: App Initialization
- [x] Copy Vuexy starter-kit to App/ folder
- [x] Customize package.json (name, deps: Supabase, TanStack Table, react-hook-form, valibot, date-fns, react-toastify, xlsx)
- [x] npm install — all dependencies installed
- [x] Create Supabase client utilities (browser, server, middleware)
- [x] Create Next.js middleware for auth redirects
- [x] Customize themeConfig.ts (FEDSafe branding, wide layout, semiDark)
- [x] Create vertical navigation (Dashboard, Leads, Collections, Settings, Users)
- [x] Create horizontal navigation
- [x] Create route pages: /dashboard, /leads, /collections, /settings (placeholders)
- [x] Create ForgotPassword view with Supabase Auth integration
- [x] Create forgot-password route page
- [x] Create SQL migration script (001_initial_schema.sql)
- [x] Create migration runner scripts (Node.js)
- [x] Dev server tested — login screen renders correctly on localhost:8001

---

## 🔲 IN PROGRESS / NEXT SESSION

### Phase 1 Remaining: Database Migration
- [ ] **Run SQL migration against Supabase** — MCP token updated, retry via MCP `apply_migration` on next session
- [ ] Verify all 4 tables created (users, leads, collections, leads_to_collections)
- [ ] Verify seed user (rgarcia350@gmail.com) inserted
- [ ] Set up Supabase Auth user for login

### Phase 1 Remaining: Login Integration
- [ ] Wire Login.tsx view to Supabase Auth (email/password sign-in)
- [ ] Remove social login buttons (not needed for this use case)
- [ ] Test login → redirect to /dashboard flow
- [ ] Auth callback route for password reset

### Phase 2: Data Import
- [ ] Build data import script (Excel → Supabase batch insert)
- [ ] Import 472,576 records in 1,000-row chunks
- [ ] Compute years_of_service on import
- [ ] Verify import with count query

### Phase 3: Lead Search Grid
- [ ] Build LeadListTable using Vuexy UserListTable pattern + TanStack Table
- [ ] Server-side pagination via Supabase .range()
- [ ] Full-text search input (tsvector)
- [ ] Filter bar: state, salary range, grade, occupation, years of service
- [ ] Column sorting
- [ ] Row selection + "Add to Collection" action
- [ ] Export selected leads (CSV)

### Phase 4: Collections
- [ ] Collection CRUD (create, edit, delete, archive)
- [ ] Collection detail page showing assigned leads
- [ ] Add leads from search grid to collections
- [ ] Collection export functionality

### Phase 5: Enrichment (Future)
- [ ] Apollo.io API integration for email/phone enrichment
- [ ] Geocoding (facility addresses → lat/lon)
- [ ] LinkedIn/Facebook URL scraper
- [ ] Enrichment status dashboard

---

## 📋 KEY INFO FOR SESSION RESUME

| Item | Value |
|------|-------|
| **App Dir** | `c:\WIP\FEDSafeRetirement_App\App` |
| **Dev Server** | `npm run dev` → `http://localhost:8001` |
| **Supabase Project** | `gqarlkfmpgaotbezpkbs` |
| **Supabase Account** | `ricardo@mustautomate.ai` |
| **MCP Token** | Updated in `C:\Users\HomePC\.gemini\antigravity\mcp_config.json` |
| **GitHub Repo** | `maikify350/FEDSafeRetirement` |
| **Migration SQL** | `App/supabase/migrations/001_initial_schema.sql` |
| **Vuexy Reference** | `Docs/Vuexy_library_Reference/nextjs-typescript-version/` |

### First Thing Next Session:
1. Verify Supabase MCP connects (`list_projects` should show `gqarlkfmpgaotbezpkbs`)
2. Run migration via MCP `apply_migration`
3. Wire Login to Supabase Auth
4. Start data import
