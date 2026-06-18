# JobMaster Web Admin — Product Requirements Document (PRD)

## Vision

JobMaster Web Admin is a desktop-first admin panel for office managers, dispatchers, and business owners. It provides the same operational capabilities as the mobile app — managing clients, jobs, quotes, invoices, vendors, and the back office — but optimized for large screens with multi-column layouts, data grids, and bulk operations.

---

## Architecture

| Layer | Technology |
|-------|-----------:|
| Web Admin | Next.js 16 (App Router, Turbopack), port 3001 |
| UI | Material UI v7, Vuexy template |
| Styling | Tailwind CSS 4 + Emotion |
| State | React Query (@tanstack/react-query) |
| Forms | react-hook-form + Zod validation |
| Backend | Bun + Hono (port 3000) — **shared with mobile** |
| Tenant DB | Supabase PostgreSQL (`fwykmduwnykynxxcbbec`) |
| Corp DB | Supabase PostgreSQL (`otsodapoddxqtfbeovcl`) |
| Auth | MVP auth (email/password via `/api/mvp-auth`) |
| Shared Types | `shared/contracts.ts` (Zod schemas + TypeScript) |

---

## Implemented Features

### Authentication
- [x] Email/password login (MVP auth flow)
- [x] JWT stored in localStorage
- [x] AuthContext with login/logout state

### Dashboard
- [x] Stats overview from `/api/dashboard/stats`
- [x] Client count, open jobs, pending quotes, outstanding invoices

### Navigation
- [x] Sidebar vertical menu with all entity links
- [x] Admin section with nested items (Company, Lookups, Tax Codes, etc.)

---

## Entity Pages (All Stubs — Ready to Build)

Each entity page should follow this desktop pattern:
1. **List view**: MUI DataGrid with sorting, filtering, pagination
2. **Create/Edit**: MUI Drawer or Dialog with multi-column Grid form
3. **Detail view**: Card-based layout (optional — can use inline DataGrid expansion)

### Core Entities
| Entity | Route | API Endpoint | Status |
|--------|-------|-------------|--------|
| Clients | `/clients` | `/api/clients` | 📋 Stub |
| Jobs | `/jobs` | `/api/jobs` | 📋 Stub |
| Quotes | `/quotes` | `/api/quotes` | 📋 Stub |
| Invoices | `/invoices` | `/api/invoices` | 📋 Stub |
| Requests | `/requests` | `/api/requests` | 📋 Stub |
| Vendors | `/vendors` | `/api/vendors` | 📋 Stub |
| Purchase Orders | `/purchase-orders` | `/api/purchase-orders` | 📋 Stub |

### Supporting Entities
| Entity | Route | API Endpoint | Status |
|--------|-------|-------------|--------|
| Team | `/team` | `/api/users` | 📋 Stub |
| Service Items | `/service-items` | `/api/service-items` | 📋 Stub |
| Site Equipment | `/site-equipment` | `/api/site-equipment` | 📋 Stub |
| Solutions | `/solutions` | `/api/solutions` | 📋 Stub |

### Admin Pages
| Page | Route | API Endpoint | Status |
|------|-------|-------------|--------|
| Company Settings | `/admin/company` | `/api/company` | 📋 Stub |
| Lookups | `/admin/lookups` | `/api/lookups` | 📋 Stub |
| Tax Codes | `/admin/tax-codes` | `/api/tax-codes` | 📋 Stub |
| Subscribers | `/admin/subscribers` | `/api/subscribers` | 📋 Stub |
| Referrals | `/admin/referrals` | `/api/referrals` | 📋 Stub |
| Feedback | `/admin/feedback` | `/api/suggestions` | 📋 Stub |

---

## Desktop UI Patterns (Different from Mobile)

### List Views
- **Mobile**: Simple FlatList with pull-to-refresh
- **Web**: MUI DataGrid with columns, sorting, filtering, pagination, row selection, bulk actions

### Create/Edit Forms
- **Mobile**: Full-screen scrollable form, single column
- **Web**: Drawer or Dialog with MUI Grid (2-4 fields per row), grouped in Card sections

### Navigation
- **Mobile**: Bottom tab bar + stack navigation
- **Web**: Sidebar menu with collapsible admin section

### Detail Views
- **Mobile**: Dedicated read-only screen (`[entity]/[id].tsx`)
- **Web**: Either DataGrid row expansion OR dedicated page with Card layout

---

## What's Shared from Mobile App

These are identical and must NOT be rebuilt:
- All backend API routes (same endpoints, same data shape)
- `shared/contracts.ts` (all Zod schemas and TypeScript types)
- Database schema (both Supabase projects)
- Business rules (auto-numbering, status workflows, lookups)

---

## API Reference

Same as mobile app. See `mobile/prd.md` for complete API route listing.

All routes use the Hono backend at `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:3000`).

---

## Feature Backlog (Web-Specific)

### High Priority
- [ ] Build out all 13 entity pages with DataGrid list views
- [ ] Client create/edit form in Drawer with multi-column layout
- [ ] Job create/edit with scheduling calendar widget
- [ ] Invoice/Quote views with printable PDF preview panel

### Medium Priority
- [ ] Drag-and-drop job scheduling (calendar view)
- [ ] Bulk operations (status changes, delete, export)
- [ ] Dashboard charts (revenue trends, job status breakdown)
- [ ] Advanced filtering and saved filter presets

### Lower Priority
- [ ] Report generation and export (CSV, PDF)
- [ ] Dark mode theme toggle
- [ ] Keyboard shortcuts for power users
- [ ] Multi-tab workflow (open multiple entities)

---

*Last updated: March 2026 — reflects current scaffold state*
