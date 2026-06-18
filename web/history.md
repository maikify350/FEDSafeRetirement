---

## 2026-03-25 — Login Page Refresh + Forgot Password Flow

**Feature:** Refreshed login page with JobMaster logo and full password reset flow.

### Login Page (`web/src/views/Login.tsx`)
- Added JobMaster Teal logo prominently displayed
- Added "Forgot Password?" link below password field
- Clean, professional layout

### Forgot Password Page (new)
- `web/src/views/ForgotPassword.tsx` — Email input with "Send Reset Link"
- `web/src/app/(blank-layout-pages)/forgot-password/page.tsx` — Route
- Recovery email fallback toggle ("Use recovery email instead")
- Success message: "Check your inbox"

### Reset Password Page (new)
- `web/src/views/ResetPassword.tsx` — Token-based password reset
- `web/src/app/(blank-layout-pages)/reset-password/page.tsx` — Route
- New password + confirm fields, min 8 char validation
- Auto-redirect to login on success

### Backend Auth Routes (`backend/src/routes/auth.ts`)
- Wired `sendEmail()` from Resend service into password reset request handler
- Branded HTML email template with reset button and 1-hour expiry notice
- Support for `useRecoveryEmail` flag to send to alternate email
- Auth routes mounted in `index.ts` (were previously orphaned/unmounted)

### Database Migration (pending)
- `recovery_email` column on `mvp_master_user` (Corp DB) — migration created but Supabase pooler is down

### Shared Contracts
- Added `recoveryEmail` to `mvpMasterUserSchema` in `shared/contracts.ts`

---

## 2026-03-25 — Tax Code Resolution Fix (Quotes & Invoices)

**Bug:** Tax code selected on quotes/invoices was not saving the calculated rate.

### Root Cause
- Frontend sends `taxCodeId` (UUID) but backend used `body.taxRate ?? 0`, defaulting to 0
- Refetch queries after create/update were missing `tax_code(*)` join

### Fix (`backend/src/routes/quotes.ts` + `invoices.ts`)
- Added DB lookup of `tax_code.rate` when `taxCodeId` is provided
- Expanded all refetch queries to include full joins matching GET single
- Added `taxCodeId` to recalculation trigger conditions

---

## 2026-03-25 — Edit Panel Titles with Entity Numbers

**Fix:** Job and PO edit panels now show entity numbers (e.g. "Edit Job — JOB-2026-0001").
- `web/src/views/jobs/JobEditPanel.tsx`
- `web/src/views/purchase-orders/PurchaseOrderEditPanel.tsx`

---

## 2026-03-25 — Booking Setup Admin Feature

**Feature:** Admin can now fully customize the public booking page from Admin → Configuration → Booking & Lead Gen → Booking Setup.

### Database Tables (Tenant DB)
- `booking_config` — Singleton config table: is_enabled, page_title, welcome_message, thank_you_message, form_fields (JSONB array), show_address, show_phone, show_email, show_hours, show_social_media, max_bookings_per_day, min_lead_time_hours, max_advance_days, admin_notification_emails (TEXT[]), confirmation_email_template, primary_color, terms_url, privacy_url + audit columns
- `booking_service_item` — Junction table (service_item_id FK unique): id, service_item_id, is_enabled, booking_name, booking_description, booking_price, show_price, sort_order + audit columns

### Backend Routes (`/api/booking-config`)
- `GET /api/booking-config` — Returns singleton config (auto-creates default if none)
- `PATCH /api/booking-config` — Update config fields
- `GET /api/booking-config/services` — List enabled services joined with service_item
- `POST /api/booking-config/services` — Add service to booking
- `PATCH /api/booking-config/services/:id` — Update service overrides
- `DELETE /api/booking-config/services/:id` — Remove service from booking
- `PATCH /api/booking-config/services/reorder` — Bulk sort_order update

### Admin UI Component
- `web/src/views/configuration/BookingSetupEditor.tsx` — 7-tab editor:
  - General: Enable/disable booking, page title, welcome message, thank you message
  - Services: Manage enabled services with custom names, descriptions, prices
  - Form Fields: Toggle which form fields display (contact, address, phone, email, hours, social media)
  - Display: Primary color branding, terms/privacy URLs, custom email template
  - Rules: Max bookings per day, min lead time hours, max advance days
  - Notifications: Admin notification email recipients
  - Share: QR code generator for public booking URL (uses `qrcode.react`)

### Public Booking Frontend Updates
- Public booking form respects all config toggles (form field visibility, min/max dates, custom text)
- Company header uses primary_color for branding
- Services list respects enable/disable and sort_order
- Confirmation page shows custom thank_you_message

### Dependencies
- Added `qrcode.react` to web for QR code generation

---

## 2026-03-25 — Public Booking Page (Online Service Requests)

**Feature:** Customers can submit service requests online through a public booking page at `/booking/{subscriberId}` — no login required. Based on Jobber competitive gap analysis (priority #1).

### Backend
- `backend/src/routes/public-booking.ts` (**NEW**): Two public endpoints:
  - `GET /api/public/booking-config/{subscriberId}` — Returns company info, service items, states for SSR
  - `POST /api/public/booking/{subscriberId}` — Submit booking (creates client + request in tenant DB)
- Auto-fills: `lead_source_id` → "Website", `tags` → "online-booking", `status_id` → "New", `cre_by` → "Online Booking"
- Client match-or-create by email on submission
- `/api/public` added to `publicPaths` in `index.ts` (bypasses auth)
- `backend/src/services/email.ts` (**NEW**): Resend email wrapper
- `backend/src/templates/booking-confirmation.ts` (**NEW**): HTML email templates (customer confirmation + admin notification)

### Shared Contracts
- `shared/contracts.ts`: Added to request schemas: `leadSourceId`, `leadSource`, `priorityId`, `priority`, `jobTypeId`, `jobType`, `requestDate`, `preferredContactMethod`, `preferredContactTime`, `tags`
- New schemas: `publicBookingSubmissionSchema`, `publicBookingResponseSchema`, `bookingPageConfigSchema`

### Backend — Request API Updates
- `backend/src/routes/requests.ts`: Exposed all new fields in converter, SELECT queries (with lookup JOINs), INSERT, and UPDATE

### Frontend — Public Booking Page
- `web/src/app/(public)/layout.tsx` (**NEW**): Minimal public layout (no sidebar/auth)
- `web/src/app/(public)/booking/[subscriberId]/page.tsx` (**NEW**): SSR page, fetches config from backend
- `web/src/views/booking/BookingPageClient.tsx` (**NEW**): Client wrapper managing form → confirmation flow
- `web/src/views/booking/CompanyHeader.tsx` (**NEW**): Branded company header with logo, contact, social media
- `web/src/views/booking/BookingForm.tsx` (**NEW**): Full booking form (contact, service, address, preferences)
- `web/src/views/booking/BookingConfirmation.tsx` (**NEW**): Confetti celebration screen using `canvas-confetti`

### Frontend — Admin Request Forms
- `web/src/views/requests/RequestEditPanel.tsx`: Added Classification section (Lead Source, Priority, Job Type, Request Date, Contact Method/Time, Tags)
- `web/src/views/requests/RequestFullPageDetail.tsx`: Added display fields for Lead Source, Priority, Job Type, Request Date, Contact Method/Time, Tags (with Chip display for tags)

### Dependencies
- `web/`: Added `canvas-confetti` + `@types/canvas-confetti`
- `backend/`: Added `resend` (email provider)

---

## 2026-03-17 — Task #359: Tax calculation on Request line items

- Added `tax_code_id` FK column to `request` table via Supabase migration
- `shared/contracts.ts`: added `taxCodeId`/`taxCode` to request schemas (read + create + update)
- `backend/src/routes/requests.ts`: join `tax_code` in all selects, persist `tax_code_id` on insert/update
- `web/src/views/requests/RequestEditPanel.tsx`: Tax Code dropdown (section header "Tax"), populates on load, included in save payload
- `web/src/components/LineItemsSection.tsx`: accepts optional `taxRate` prop; shows Subtotal + Tax (rate%) + Total breakdown
- `web/src/views/requests/RequestFullPageDetail.tsx`: detail accordion shows subtotal + tax + total; fixed missing `CircularProgress` import

---

## 🚇 Cloudflare Tunnel — Backend Exposure for Production Testing

**Purpose**: Exposes the local Hono backend (port 3000) to the internet so the Vercel-deployed frontend can reach the API.

**Installed at**: `C:\Program Files (x86)\cloudflared\cloudflared.exe`

**How to start** (run this in a separate terminal, keep it open):
```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
```

**What to do after starting:**
1. Wait ~10 seconds for cloudflared to connect
2. Look in the terminal output for the banner line like:
   ```
   | https://some-random-name.trycloudflare.com |
   ```
3. Copy that URL (e.g. `https://abc-def-123.trycloudflare.com`)
4. Go to **Vercel → Settings → Environment Variables**
5. Update `NEXT_PUBLIC_BACKEND_URL` to that URL
6. Trigger a Vercel redeploy (or wait for next push to auto-deploy)

> **Note**: The tunnel URL changes every time you restart cloudflared (it's a quick tunnel, not a named tunnel). For a stable URL, set up a **named tunnel** via `cloudflared tunnel create jobmaster-backend` — see https://developers.cloudflare.com/cloudflare-one/connections/connect-apps

> **Shortcut**: Run `.\start-dev.ps1` from the repo root — it kills old processes, starts backend + web + tunnel, and prints the tunnel URL clearly so you can copy it to Vercel.

---

## Vercel Deployment — Setup (confirmed working as of March 9, 2026)


- **GitHub repo**: `https://github.com/maikify350/JobMaster_Local_Dev`
- **Vercel project**: connected to the above repo, Root Directory set to `web/`
- **Build**: `pnpm install && pnpm build` (vercel.json specifies pnpm)
- **Deploy trigger**: push to `main` branch auto-deploys to Vercel
- **Public URL**: visible in Vercel dashboard → Domains tab (something like `job-master-local-dev.vercel.app`)
- **Preview URLs**: each push also gets a unique hash URL (e.g. `job-master-local-kjh4xs9a6-*.vercel.app`)

### Required Vercel Environment Variables (Settings → Environment Variables)

| Variable | Purpose | Status |
|----------|---------|--------|
| `NEXT_PUBLIC_BACKEND_URL` | Hono backend URL | Must point to production backend |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase realtime | ✅ Should be set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase realtime auth | ✅ Should be set |
| `NEXT_PUBLIC_CORP_SUPABASE_URL` | VoiceExplainerPlayer audio bucket | ⚠️ Value: `https://otsodapoddxqtfbeovcl.supabase.co` |
| `NEXT_PUBLIC_APP_VERSION` | Footer version display | ✅ Should be set |
| `NEXT_PUBLIC_OPENAI_API_KEY` | AI chat (client-side) | ✅ Should be set |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | Gemini AI integration | ✅ Should be set |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Maps | ✅ Should be set |
| `GEMINI_API_KEY` | Server-side AI search (`/api/ai/entity-search`) | ⚠️ Confirm it's in Vercel |

> **Note**: `NEXT_PUBLIC_ELEVENLABS_API_KEY` is only used by the `generate-explainers.ts` script locally, not needed in Vercel.

---

## March 9, 2026

### Project Reorganization
- Created `web/CLAUDE.md` with Vuexy + MUI desktop patterns
- Created `web/PRD.md` with entity page plan and desktop UI patterns
- Created `web/vercel.json` for Vercel deployment
- Skills consolidated to root `/.claude/skills/` (4 skills including new `vuexy-web-design` and `supabase-api-patterns`)
- Root `CLAUDE.md` slimmed from 42.6k → ~7k chars
- Root `AGENTS.md` created for multi-app config
- Initial commit pushed to `https://github.com/maikify350/JobMaster_Local_Dev.git`

### UI & Entities Built (Session 1 + 2)
- Login page wired to `/api/mvp-auth`
- Dashboard with stats, quick actions, status accordions
- Gallery view (Supabase photos, category filters, full-size modal)
- Calendar (FullCalendar, Supabase events)
- Top navbar: Calendar + Gallery + Settings icons
- Combined theme picker (mode + color swatches, Mocha added)
- Settings Drawer (right-side slide-over)
- QueryProvider wired to Providers.tsx

### Entity List Pages Built
All use: TanStack Table, global fuzzy search, sortable columns, column picker, multi-condition filters, table/card toggle, bulk select, CSV/JSON export, realtime Supabase updates (flash on insert/update/delete), persisted preferences (view mode, page size, column order via localStorage).

| Entity | Route | Edit Drawer |
|--------|-------|-------------|
| Clients | `/clients` | ✅ Full fields |
| Requests | `/requests` | ✅ |
| Quotes | `/quotes` | ✅ |
| Jobs | `/jobs` | ✅ |
| Invoices | `/invoices` | ✅ |
| Vendors | `/vendors` | ✅ |
| Purchase Orders | `/purchase-orders` | ✅ |
| Teams | `/team` | ✅ |

### Voice Explainer System
- Script: `web/scripts/generate-explainers.ts` — generates MP3s via ElevenLabs, uploads to Supabase `Explainers` bucket
- Player: `web/src/components/VoiceExplainerPlayer.tsx` — VCR-style player, appears when explainers enabled in Settings
- Hook: `useDrawerExplainer` — pauses list explainer when edit drawer opens, resumes on close
- Files: `ClientList.mp3`, `ClientEdit.mp3`, `RequestList.mp3`, `RequestEdit.mp3`, `QuoteList.mp3`, `QuoteEdit.mp3`, `JobList.mp3`, `JobEdit.mp3`, `InvoiceList.mp3`, `InvoiceEdit.mp3`, `VendorList.mp3`, `VendorEdit.mp3`, `PurchaseOrderList.mp3`, `POEdit.mp3`, `TeamList.mp3`, `TeamEdit.mp3`, `DashboardView.mp3`, `CalendarView.mp3`, `GalleryView.mp3` — all in Supabase `Explainers` bucket (otsodapoddxqtfbeovcl)

---

## March 10, 2026

### Latest Changes (commit `da24283`)
- **Teams entity**: full list view fetching `/api/users` (team_member table), TeamEditDrawer, TeamCardGrid, realtime on `team_member`
- **Teams in sidebar**: added above About with divider; removed from Settings Administration
- **Settings**: removed Display Style row; removed Team row from Administration
- **Full-width layout**: removed compact max-width cap from `StyledMain`; hardcoded wide in `LayoutContent` — bypasses the cookie so takes effect immediately
- **Layout padding**: reduced from 24px → 8px; footer block padding 16px → 8px
- **NavbarContent**: added `'use client'` to fix Next.js server/client error
- **useEntityCounts**: added `teams` field (maps to `totalTeamMembers` from dashboard stats)
- **VoiceExplainerPlayer**: added `/team` route → `TeamList.mp3`,- **SolutionEditDrawer**: `SolutionEdit.mp3`
- **Semgrep**: 0 findings (263 files, 50 rules, p/typescript + p/react)

---

## March 14, 2026

### Dispatch Enhancements - In Progress
**Started**: Session began
**Goal**: Add drag-and-drop job assignment + SMS notifications to dispatch system

**Current dispatch system** (already built):
- Split-panel interface (jobs list + techs list + map)
- Manual assignment workflow (select job + select tech + click "Dispatch" button)
- GPS tracking (simulated movement)
- Route visualization with ETA
- Database tables: `dispatch_event`, `gps_location`
- Backend routes: `POST /api/dispatch`, `GET /api/dispatch/events`, GPS endpoints

### Drag-and-Drop Job Assignment - ✅ COMPLETE

**Implementation**:
- ✅ Wrapped DispatchView with `DndContext` from `@dnd-kit/core`
- ✅ Made job list items draggable with `useDraggable` + visual feedback (opacity 0.5, cursor grabbing)
- ✅ Made tech list items droppable with `useDroppable` + hover highlight (blue background)
- ✅ Added `DragOverlay` showing dragged job card preview
- ✅ Confirmation dialog before dispatching with job/tech details
- ✅ Moved dispatch mutation to DispatchView for centralized control
- ✅ Preserved existing select-and-click workflow (both methods work)

**Files modified**:
- `web/src/views/dispatch/DispatchView.tsx` — DndContext, dispatch mutation, confirmation dialog
- `web/src/views/dispatch/JobsList.tsx` — DraggableJobItem wrapper component
- `web/src/views/dispatch/TechsList.tsx` — DroppableTechItem wrapper component

**How it works**:
1. User drags job card from top panel
2. Drag overlay shows job preview while dragging
3. Tech cards in bottom panel highlight blue on hover
4. User drops job onto tech card
5. Confirmation dialog appears: "Assign job JOB-2026-0123 (Client Name) to John Doe?"
6. User confirms → job assigned via `PATCH /api/jobs/{id}` with `{ assignedTo: techId, status: 'Assigned' }`
7. Both lists refresh, selections clear

---

## March 12, 2026

### Templates Feature (full stack)

**New files:**
- `backend/src/routes/templates.ts` — Hono CRUD route (GET list, GET by id, POST, PATCH, DELETE)
- `shared/contracts.ts` — Added `Template`, `CreateTemplateRequest`, `UpdateTemplateRequest`, `TemplateQuery` schemas + `templateAppliesToValues` enum
- `web/src/app/(dashboard)/admin/templates/page.tsx` — Next.js route page
- `web/src/views/templates/TemplatesView.tsx` — TanStack Table list (fuzzy search, draggable columns, column picker, density, export CSV/JSON, pagination)
- `web/src/views/templates/TemplateEditDialog.tsx` — Full-screen MUI Dialog with TinyMCE editor, Active/Inactive header switch, placeholder injection, delete confirmation
- `web/src/lib/templatePlaceholders.ts` — Placeholder token registry grouped by section (contacts/jobs/quotes/invoices/purchase_orders/requests/general)
- `web/public/tinymce/` — Self-hosted TinyMCE (10 MB, copied from node_modules)
- `docs/migrations/create_template_table.sql` — DDL for Supabase Tenant DB

**Modified files:**
- `backend/src/index.ts` — Import + mount `/api/templates`
- `web/src/data/navigation/verticalMenuData.tsx` — Added Templates at bottom of Settings submenu

**Table schema:** `template` in Tenant DB (`fwykmduwnykynxxcbbec`)
Columns: `id` (UUID PK), `name` (VARCHAR 25), `description` (TEXT), `applies_to` (TEXT enum), `body` (TEXT HTML), `is_enabled` (BOOLEAN), + standard 4 audit columns (`cre_at`, `mod_at`, `cre_by`, `mod_by`)

**⚠️ Pending:** Run `docs/migrations/create_template_table.sql` in Supabase Tenant DB SQL Editor to create the table.
