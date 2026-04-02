# FEDSafe Retirement — TODO Tracker

> **Last Updated:** 2026-04-01 20:00 CST
> **Purpose:** Crash recovery and session continuity. Always check this file when resuming.

---

## ✅ COMPLETED

### Phase 0: Project Foundation
- [x] Analyze FOIA data source (472,576 records, 13 columns)
- [x] Create PRD.md — product requirements document
- [x] Create Database.md — schema, tables, triggers, indexes, RLS
- [x] Create UI-UX.md — design spec, components, Vuexy mapping
- [x] Create .agent/claude.md — agent instruction rules
- [x] Create lead.json — full schema with enrichment strategy & provider comparison
- [x] Initialize Git repo, .gitignore, initial commit
- [x] Create GitHub repo (maikify350/FEDSafeRetirement) and push

### Phase 1: App Initialization & Auth
- [x] Copy Vuexy starter-kit to App/ folder
- [x] Customize package.json (Supabase, TanStack Table, react-hook-form, etc.)
- [x] Create Supabase client utilities (browser, server, middleware)
- [x] Create Next.js middleware for auth redirects
- [x] Customize themeConfig.ts (FEDSafe branding, wide layout, semiDark)
- [x] Create vertical/horizontal navigation
- [x] Create route pages: /dashboard, /leads, /collections, /settings
- [x] Create Login/ForgotPassword views with Supabase Auth
- [x] Run SQL migration (001_initial_schema.sql) — all tables created
- [x] Wire Login → Dashboard → User Profile → Logout flow
- [x] Deploy admin-create-user edge function
- [x] Custom FEDSafe logo in sidebar, login, favicon

### Phase 2: Data Import (Session 2)
- [x] Build FOIA Excel import script (import-foia-data.mjs)
- [x] Import 472,576 records in batches
- [x] Compute years_of_service on import
- [x] Verify import with count query
- [x] Seed US States lookup table (54 entries)

### Phase 3: Lead Search Grid (Session 2-3)
- [x] Build EntityListView — shared data-grid shell (reusable for all entities)
- [x] Server-side pagination via Supabase RPC (search_leads)
- [x] Full-text search (debounced, server-side)
- [x] Filter pills: State (CA/TX/NY/FL/IL), Gender (Male/Female/All)
- [x] Column sorting (server-side via RPC)
- [x] Multi-condition column filters (contains/starts with/equals/empty with AND/OR)
- [x] Column picker (show/hide + drag-to-reorder)
- [x] Column resizing with persistence (TanStack enableColumnResizing)
- [x] Density toggle (compact/normal/comfortable)
- [x] Row selection checkboxes (column 1)
- [x] DraggableColumnHeader — sort + reorder + filter + resize
- [x] Persisted grid preferences via useGridPreferences hook (Supabase + localStorage)

### Phase 3.5: Lead Edit & CRUD (Session 3)
- [x] Create EntityEditDialog — shared edit dialog shell with audit footer
- [x] Create LeadEditDialog with all 18+ fields
- [x] Layout: First/MI/Last on one line, Facility 1/3 + Location 2/3
- [x] Address autocomplete (Google Places API) for facility address
- [x] Required field validation: First Name*, Last Name*, State* (red asterisks)
- [x] Audit footer: "Created by X on date • Last modified by Y on date"
- [x] Audit fields: cre_dt, mod_dt, cre_by, mod_by (NON-NEGOTIABLE naming)
- [x] AuditFooter reusable component
- [x] SectionHeader reusable component

### Phase 3.6: Favorites System (Session 3)
- [x] Add `is_favorite` boolean column to leads table
- [x] Partial index on is_favorite WHERE true
- [x] API: PATCH /api/leads/[id]/favorite (toggle)
- [x] API: DELETE /api/leads/favorites (clear all)
- [x] RPC: search_leads updated with p_favorite filter
- [x] Grid: Star column with optimistic toggle (gold when favorited)
- [x] Edit dialog: Star toggle in header (left of Cancel)
- [x] Filter pill: ⭐ Favorites
- [x] Clear All Favorites with ConfirmDialog

### Phase 3.7: Bulk Actions & Export (Session 3)
- [x] Checkbox multi-select in all grids
- [x] Floating bulk selection bar ("N selected" + action buttons)
- [x] ExportFieldPickerDialog — pick/reorder fields for export
- [x] Field selections persist to localStorage per storageKey
- [x] CSV and JSON export with user-selected fields
- [x] "Push to ACT" bulk action button
- [x] PushToActDialog — fake progress spinner → green checkmark (placeholder)
- [x] "+Add" button always pinned to far right with 10px padding (global)

### Phase 4: Collections (Session 2-3)
- [x] Collections grid page with CRUD
- [x] Collection filter combobox on leads grid
- [x] New Collection button

### Phase 5: UI/UX Standards (Session 3)
- [x] ConfirmDialog reusable component (RULE: never use alert()/confirm())
- [x] Remove "New Collection" from nav (already in grid)
- [x] Configuration page with US States lookup editor
- [x] User Management page with grid
- [x] Settings page

---

## 🔲 IN PROGRESS / NEXT SESSION

### Phase 6: ACT CRM Integration
- [ ] Research ACT.COM API documentation
- [ ] Build API endpoint: POST /api/act/push
- [ ] Replace fake PushToActDialog with real API calls
- [ ] Map lead fields to ACT contact fields
- [ ] Error handling and retry logic

### Phase 7: Advanced Features
- [ ] "Save as Collection" — save current filtered lead views as a named collection
- [ ] "Add Lead" form (currently placeholder)
- [ ] Bulk assignment of leads to collections
- [ ] Lead detail full-page view
- [ ] Dashboard KPI cards and charts

### Phase 8: Enrichment (Future)
- [ ] Apollo.io API integration for email/phone enrichment
- [ ] USPS Address Verification API for address standardization
- [ ] Name-based gender inference for existing records
- [ ] Geocoding (facility addresses → lat/lon)
- [ ] LinkedIn/Facebook URL scraper
- [ ] Enrichment status dashboard

### Infrastructure
- [ ] Fix Supabase RLS infinite recursion on users table (affects preference DB persistence)
- [ ] Add error boundary components
- [ ] Production build optimization

---

## 📋 KEY INFO FOR SESSION RESUME

| Item | Value |
|------|-------|
| **App Dir** | `c:\WIP\FEDSafeRetirement_App\App` |
| **Dev Server** | `npm run dev` → `http://localhost:8001` |
| **Supabase Project** | `ypteqfmxsjolpfzbkbxo` |
| **GitHub Repo** | `maikify350/FEDSafeRetirement` |
| **Login Credentials** | `rgarcia350@gmail.com` / `FedSafe2026!` |
| **Vuexy Reference** | `Docs/Vuexy_library_Reference/nextjs-typescript-version/` |

### Key Reusable Components
| Component | File | Purpose |
|-----------|------|---------|
| EntityListView | `src/components/EntityListView.tsx` | Shared data-grid for all entity pages |
| EntityEditDialog | `src/components/EntityEditDialog.tsx` | Shared edit dialog shell with audit footer |
| DraggableColumnHeader | `src/components/DraggableColumnHeader.tsx` | Column header with sort+reorder+filter+resize |
| ExportFieldPickerDialog | `src/components/ExportFieldPickerDialog.tsx` | Export field selection with reorder & persistence |
| ConfirmDialog | `src/components/ConfirmDialog.tsx` | Styled confirmation (NEVER use alert/confirm) |
| PushToActDialog | `src/components/PushToActDialog.tsx` | ACT CRM push progress (currently fake) |
| AuditFooter | `src/components/AuditFooter.tsx` | Created/modified audit timestamp footer |
| useGridPreferences | `src/hooks/useGridPreferences.ts` | Persisted grid prefs (Supabase + localStorage) |

### UI/UX Rules (NON-NEGOTIABLE)
1. **Never use `window.alert()` or `window.confirm()`** — use ConfirmDialog
2. **All audit fields must be named `cre_dt`, `mod_dt`, `cre_by`, `mod_by`**
3. **All tables must have UUID primary keys**
4. **Required fields show bold red asterisk labels**
5. **"+Add" button always far right with 10px padding**
6. **Grid preferences persist per-user (column visibility, order, sizing, density, filters)**
