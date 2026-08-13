# FEDSafe Retirement — Lead Management App (PRD)

> **Version:** 1.0 · **Date:** 2026-04-01 · **Author:** Ricardo Garcia · **Status:** Draft

---

## 1. Executive Summary

FEDSafe Retirement Lead Manager is a **mini-CRM web application** purpose-built for prospecting federal employees who may benefit from retirement planning services. The primary data source is a **FOIA 2025 US Postal Service employee roster** containing **472,576 records** with employment details such as name, occupation, grade level, salary, facility location, and duty start date.

The application allows users to **search, filter, and organize** these leads into **Collections (Campaigns)** for outreach and follow-up, turning raw public data into actionable prospect lists.

---

## 2. Problem Statement

Federal retirement advisors need a way to efficiently sift through hundreds of thousands of public employee records to identify high-value prospects based on criteria like salary band, years of service, geographic location, and job title — then organize those prospects into targeted campaign lists for marketing outreach.

Currently this is done manually with spreadsheets, which is slow, error-prone, and doesn't scale.

---

## 3. Target Users

| Role | Description |
|------|-------------|
| **Admin** | Full access — manage users, settings, data imports, collections |
| **Advisor** | Search leads, create/manage collections, export data |
| **Viewer** | Read-only access to leads and collections |

---

## 4. Data Source

| Attribute | Detail |
|-----------|--------|
| **Source** | FOIA 2025 US Postal Service Employee Roster |
| **File** | `DataSeed/00 FOIA 2025 PO REVISED.xlsx` |
| **Records** | 472,576 |
| **Columns** | 13 |

### Source Columns

| # | Column Name | Type | Example |
|---|-------------|------|---------|
| 1 | First Name | string | Andrew |
| 2 | Last Name | string | Mayo |
| 3 | Middle Initial | string | S |
| 4 | Occupation Title | string | BUILDING MAINTENANCE CUSTODIAN |
| 5 | Grade Level | string | P9-05 |
| 6 | Annual Salary | integer | 73831 |
| 7 | Hourly Rate | float | 35.50 |
| 8 | Facility Name | string | AGAWAM PO |
| 9 | Facility Address | string | 600 SUFFIELO ST |
| 10 | Facility City | string | AGAWAM |
| 11 | Facility State | string | MA |
| 12 | Facility Zip Code | string | 01001-9998 |
| 13 | Entered on Duty Date | date | 2005-09-17 |

### Data Statistics
- **Unique Grade Levels:** 120
- **Unique Occupation Titles:** 112
- **Unique States:** 54 (includes territories)
- **Salary Range:** $0 – $192,470

---

## 5. Core Features

### 5.1 Authentication & Authorization
- Email/password login via **Supabase Auth**
- **Forgot Password** flow (email reset link)
- Role-based access control (Admin, Advisor, Viewer)
- Session management with JWT tokens

### 5.2 Lead Search & Browse
- **Searchable Data Grid** (TanStack Table + Vuexy styling)
  - Full-text search across name, occupation, facility
  - Column-level filters: State, Grade Level, Occupation Title, Salary Range, Duty Start Date Range
  - Sortable columns
  - Pagination (10/25/50/100 per page)
  - Row selection (checkbox) for bulk actions
- **Lead Detail View** — click a row to see full profile card
- **Export** selected leads to CSV/Excel

### 5.3 Collections (Campaigns)
- Create named collections with description and optional tags
- **Add leads to collections** via:
  - Individual row action
  - Bulk add from selected rows
  - Filter-based add (save current filter as collection members)
- View collection members in the same data grid
- Remove leads from collections
- Collection statistics (total leads, avg salary, state breakdown)

### 5.4 Dashboard
- KPI cards: Total Leads, Total Collections, Leads in Active Collections
- Charts: Leads by State (map or bar), Salary Distribution, Grade Level Breakdown
- Recent activity feed

### 5.5 User Settings
- Profile management (name, email, phone, avatar)
- App preferences stored in `settings` JSON field:
  - Theme mode (light/dark/system)
  - Default page size
  - Default columns visible
  - Notification preferences
  - Sidebar collapsed state

### 5.6 Admin Panel
- User management (CRUD)
- Data import/re-import management
- System health overview

---

## 6. Technical Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, TypeScript) |
| **UI Library** | Vuexy MUI NextJS Admin Template v5.x |
| **Component Library** | MUI v7 (Material UI) |
| **Styling** | TailwindCSS v4 (utility classes only — no inline CSS) |
| **Data Tables** | TanStack React Table v8 |
| **Forms** | react-hook-form + valibot |
| **State Management** | Redux Toolkit |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Icons** | Tabler Icons (via Iconify) |
| **Charts** | ApexCharts / Recharts |
| **Hosting** | Vercel |
| **Source Control** | GitHub |

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Page Load** | < 2s for search results (server-side pagination) |
| **Search Response** | < 500ms for filtered queries |
| **Responsiveness** | Full mobile/tablet/desktop support |
| **Image Format** | .webp only |
| **Browser Support** | Chrome, Edge, Firefox, Safari (latest 2 versions) |
| **Accessibility** | WCAG 2.1 AA baseline |

---

## 8. Phased Implementation

### Phase 1 — Foundation (MVP)
- [x] Project setup (Next.js + Vuexy starter kit)
- [ ] Supabase schema creation (all tables with audit fields)
- [ ] Authentication (login, register, forgot password)
- [ ] Seed admin user
- [ ] Data import script (Excel → Supabase)
- [ ] Left nav bar (Leads, Collections)
- [ ] Lead search/grid page
- [ ] Lead detail view

### Phase 2 — Collections & Campaigns
- [ ] Collections CRUD
- [ ] leads_to_collections junction table
- [ ] Add/remove leads to collections (single + bulk)
- [ ] Collection detail view with member grid
- [ ] Export to CSV

### Phase 3 — Dashboard & Analytics
- [ ] Dashboard page with KPI cards
- [ ] Charts (state distribution, salary breakdown)
- [ ] Activity feed

### Phase 4 — Polish & Admin
- [ ] User settings page (JSON settings field)
- [ ] Admin user management
- [ ] Data re-import capability
- [ ] Performance optimization (server-side pagination for 472K records)
- [ ] Deploy to Vercel production

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| All 472K leads searchable | 100% of source data loaded |
| Search latency | < 500ms for any filter combination |
| Collections created per user | Track usage |
| Export frequency | Track CSV downloads |
| User sessions | Track DAU/MAU |

---

## 10. Constraints & Assumptions

1. Data is **public FOIA data** — no PII concerns beyond standard handling
2. Single tenant initially (tenant_id reserved for future multi-tenancy)
3. Vuexy is a **licensed commercial template** — code from the reference library should be adapted, not blindly copied
4. The 472K records require **server-side pagination** — client-side loading of all records is not feasible
5. Supabase free tier limits apply during development

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Lead** | A federal employee record from the FOIA data source |
| **Collection** | A named group of leads organized for a specific outreach campaign |
| **FOIA** | Freedom of Information Act — the legal mechanism through which the employee data was obtained |
| **Grade Level** | Federal pay grade classification (e.g., P9-05, Q7-01) |
