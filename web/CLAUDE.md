# JobMaster Web Admin — Claude Instructions

> **⚙️ Shared Standards (SSOT):** [Coding Standards](../docs/CODING_STANDARDS.md) · [UI Patterns](../docs/UI_PATTERNS.md)
> These docs apply to ALL platforms. Read them first.

> **📋 Project rules:** Database, UUID, API routes → root [CLAUDE.md](../CLAUDE.md)

> **📖 Web-specific guides:** [Entity Screens](ENTITY-SCREEN-GUIDELINES.md) · [History](history.md) · [Todo](todo.md)

> **Crash recovery**: Always read `history.md` and `todo.md` at session start.


## Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI Library | Material UI v7 (MUI) |
| Data Grids | MUI X DataGrid |
| Styling | Tailwind CSS 4 + Emotion |
| Forms | react-hook-form + Zod |
| State | React Query (@tanstack/react-query) |
| Template | Vuexy (reference in `Vuexy_library_Reference/`) |
| Port | 3001 |

---

## Architecture
- **API client**: `src/lib/api.ts` — fetch wrapper, attaches JWT from localStorage
- **Auth**: `src/context/AuthContext.tsx` — calls `/api/mvp-auth/login`, no NextAuth
- **Shared types**: `@shared/contracts` → `../shared/contracts.ts` (configured in `tsconfig.json` + `next.config.ts`)
- **Navigation**: `src/data/navigation/verticalMenuData.tsx` — sidebar menu
- **Isolated**: Own `node_modules`, zero impact on mobile/backend

---

## Standardized Colors & CSS Variables — NON-NEGOTIABLE

**Never hardcode hex colors inline.** All reusable colors MUST be defined in `src/app/globals.css` as CSS variables within the `@theme` block.

### Action Button Colors

Action buttons (Create Request, Create Quote, Create Job, Create Invoice) use standardized colors across all entity detail pages:

| Action | Variable | Hex | Tailwind Class |
|--------|----------|-----|----------------|
| Create Request | `--color-action-request` | #F59E0B (Amber) | `bg-action-request` |
| Create Quote | `--color-action-quote` | #14B8A6 (Teal) | `bg-action-quote` |
| Create Job | `--color-action-job` | #3B82F6 (Blue) | `bg-action-job` |
| Create Invoice | `--color-action-invoice` | #10B981 (Green) | `bg-action-invoice` |
| Create Purchase Order | `--color-action-po` | #8B5CF6 (Violet) | `bg-action-po` |

**Usage in MUI components:**
```tsx
// ✅ CORRECT - Use CSS variables
<Button sx={{ bgcolor: 'var(--color-action-request)', '&:hover': { bgcolor: 'var(--color-action-request-hover)' } }}>
  Create Request
</Button>

// ❌ WRONG - Never hardcode hex colors
<Button sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}>
  Create Request
</Button>
```

**Usage in Tailwind classes:**
```tsx
// ✅ CORRECT - Use utility class
<div className="bg-action-request hover:bg-action-request-hover">...</div>
```

**When to add new colors:**
1. Define in `src/app/globals.css` `@theme` block as `--color-[name]` and `--color-[name]-hover`
2. Create utility class in `@layer utilities` section
3. Document in this file

> **See also:** [Coding Standards](../docs/CODING_STANDARDS.md#styling-philosophy) for Tailwind-first approach

---

## List Page Grid Pattern — NON-NEGOTIABLE

**All entity list pages MUST follow the `ClientsView.tsx` canonical implementation.** Do not invent alternatives.

### Required elements (copy from ClientsView, adapt field names)

| Element | Implementation |
|---------|---------------|
| Table styling | `import tableStyles from '@core/styles/table.module.css'`; use `<table className={tableStyles.table}>` |
| Draggable columns | `DraggableColumnHeader` + `DndContext` + `SortableContext` from `@dnd-kit` |
| Open edit on **double-click** | `<tr onDoubleClick={() => openEdit(row.original)}>` — NO separate edit button column |
| Column picker | Popover with `col.getToggleVisibilityHandler()` |
| Column filters toggle | `showFilters` state; `DraggableColumnHeader` renders sub-row filter input |
| Row density | `useLocalStorage`; compact / normal / comfortable; `paddingBlock: densityPy` on `<td>` |
| Global search | `<DebouncedInput>` → `setGlobalFilter`; `rankItem` fuzzy filter across all text fields |
| Pagination | `TablePagination` above AND below the table |
| Export | CSV + JSON via `downloadBlob`; in a dropdown `<Menu>` |
| Realtime updates | `useRealtimeTable({ table: 'snake_name', data })` for flashing row colors |
| Persisted state | `useLocalStorage` with `jm-{entity}-` prefix for `view-mode`, `page-size`, `col-visibility`, `col-order`, `density` |
| Card/List toggle | `ToggleButtonGroup` in `CardHeader` action; card view renders `[Entity]CardGrid` |
| URL deep links | `?add=1` → new-record drawer; `?edit={id}` → edit specific record |
| Avatars | `CustomAvatar` + `getInitials()`, color from entity status/type |
| Email/phone/URL | Always `<ContactLink type='email\|phone\|url' value={v} />` |

### Checklist before marking a list page "done"
- [ ] `tableStyles.table` applied
- [ ] Draggable columns (DraggableColumnHeader + DndContext)
- [ ] Double-click row opens edit drawer — no edit button column
- [ ] Column picker + column filter toggle
- [ ] Row density persisted
- [ ] Fuzzy search with DebouncedInput
- [ ] Pagination above + below
- [ ] Export CSV + JSON
- [ ] Card/List toggle persisted
- [ ] `useRealtimeTable` wired

---

## Desktop Form Design Principles — NON-NEGOTIABLE

The web app has much more screen real estate than mobile. Forms MUST take advantage of it:

1. **Multi-column layouts**: Use MUI `Grid` with 2–4 fields per row inside `Card` sections
2. **Data grids**: Use `MUI DataGrid` for list views with sorting, filtering, pagination, bulk actions
3. **Drawer/Dialog patterns**: Use MUI `Drawer` or `Dialog` for create/edit — NOT full-page navigation
4. **Reference mobile data models**: Same entities, same fields — reimagine layout for large screens
5. **Cards for sections**: Group related fields into MUI `Card` components with clear headers

```tsx
// ✅ CORRECT — Desktop multi-column layout
<Grid container spacing={3}>
  <Grid size={{ xs: 12, md: 6 }}><TextField label="First Name" /></Grid>
  <Grid size={{ xs: 12, md: 6 }}><TextField label="Last Name" /></Grid>
  <Grid size={{ xs: 12, md: 4 }}><TextField label="Phone" /></Grid>
  <Grid size={{ xs: 12, md: 4 }}><TextField label="Email" /></Grid>
  <Grid size={{ xs: 12, md: 4 }}><Select label="Type" /></Grid>
</Grid>

// ❌ WRONG — Mobile-style single-column
<TextField label="First Name" fullWidth />
<TextField label="Last Name" fullWidth />
```

---

## Vuexy Reference Library — CHECK FIRST NON-NEGOTIABLE

Before building **any** UI component, drawer, dialog, table, form, or layout element, you **MUST** first check if Vuexy or MUI already provides it:

1. **MUI components** (`@mui/material`) — Dialog, Drawer, DataGrid, Card, Chip, Avatar, Select, Switch, Tooltip, etc.  
2. **Vuexy theme overrides** (`src/@core/theme/overrides/`) — Already-styled MUI components (Dialog, Button, Input, etc.)  
3. **Vuexy reference** (`Vuexy_library_Reference/nextjs-typescript-version/full-version/src/`) — Complete pages, views, and component patterns to copy and adapt.  
4. **Existing project components** (`src/components/`) — Check what's already been built in this project.

**Rule**: If a Vuexy or MUI component exists that meets the need, **use it**. Do not recreate it. Only build a custom component if nothing in steps 1–4 covers the use case.

### 🚫 NEVER use browser-native dialogs — NON-NEGOTIABLE

```ts
// ❌ FORBIDDEN — never use these anywhere in the web app
alert('something')
confirm('are you sure?')
prompt('enter value')
window.alert(...)
```

Always use **MUI Dialog** (`@mui/material/Dialog`) instead:
```tsx
// ✅ CORRECT — always use MUI Dialog for confirmations, errors, and prompts
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
```

This applies to: validation errors, delete confirmations, unsaved-changes warnings, anything that would have been an `alert()` or `confirm()`.

Located at `Vuexy_library_Reference/nextjs-typescript-version/`:
- `full-version/` — Complete reference with all components, pages, and patterns
- `starter-kit/` — Minimal scaffolding (what the web app was bootstrapped from)
- `demo-configs/` — Theme configuration examples

**How to use**: Browse `full-version/src/views/` for page layout examples. Copy and adapt component patterns — don't import directly from the reference folder.

---

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Fetch wrapper with JWT |
| `src/context/AuthContext.tsx` | Login/logout state |
| `src/data/navigation/verticalMenuData.tsx` | Sidebar nav items |
| `src/views/dashboard/DashboardView.tsx` | Dashboard stats |
| `src/configs/themeConfig.ts` | App name = "JobMaster" |

## Current Build Status

| Page | Status |
|------|--------|
| Login | ✅ Complete — wired to `/api/mvp-auth` |
| Dashboard | ✅ Complete — fetches `/api/dashboard/stats` |
| Entity pages (13) | 📋 Stubs — ready to build out |
| Admin pages (6) | 📋 Stubs — ready to build out |

## Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:3000` | Hono backend URL |

## What's Shared from Mobile
- `shared/contracts.ts` — All TypeScript types and Zod schemas (`@shared/contracts`)
- All backend API routes — identical endpoints, same data shape
- React Query patterns — `useQuery`/`useMutation` hooks work the same

## Entity Naming Convention — NON-NEGOTIABLE

All entity UI elements follow the pattern **`[Entity] [Role]`** (singular noun + role noun):

| Page title | Drawer/Dialog | Details page | Route |
|-----------|---------------|--------------|-------|
| Client List | Client Edit | Client Details | `/clients` |
| Job List | Job Edit | Job Details | `/jobs` |
| Quote List | Quote Edit | Quote Details | `/quotes` |
| Invoice List | Invoice Edit | Invoice Details | `/invoices` |
| Request List | Request Edit | Request Details | `/requests` |
| Vendor List | Vendor Edit | Vendor Details | `/vendors` |
| PO List | PO Edit | PO Details | `/purchase-orders` |

**Never use**: "Clients List", "Edit Client", "View Job", etc. Always singular + role.

---

## What Must Be Rebuilt for Web
- All UI components — React Native components don't run in browser
- Forms — Desktop multi-column MUI Grid layouts
- Navigation — Next.js App Router (not Expo Router)
- Styling — MUI + Tailwind CSS (not NativeWind)

---

## UI Preference Persistence — NON-NEGOTIABLE

Always persist user UI choices (view mode, page size, column sort, filter selections) so they survive page reloads.

**Rule**: Use `useLocalStorage` (at `src/hooks/useLocalStorage.ts`) instead of `useState` for any user-facing preference.

**Key naming convention** — namespace keys by entity to avoid collisions:
```ts
// ✅ CORRECT
const [viewMode, setViewMode] = useLocalStorage<'list' | 'cards'>('jm-clients-view-mode', 'list')
const [pageSize, setPageSize] = useLocalStorage<number>('jm-clients-page-size', 10)
const [viewMode, setViewMode] = useLocalStorage<'list' | 'cards'>('jm-jobs-view-mode', 'list')

// ❌ WRONG — plain useState loses state on reload
const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')
```

**What to persist** per list page:
| Preference | Key pattern | Default |
|------------|-------------|---------|
| View mode (list/cards) | `jm-{entity}-view-mode` | `'list'` |
| Page size | `jm-{entity}-page-size` | `10` |
| Active type filter chip | `jm-{entity}-type-filter` | `'all'` |

---

## Reusable Global Components — NON-NEGOTIABLE

When building any UI piece for the web app, always ask: **"Can this be a global/shared component?"**

If a component or hook is used (or will be used) in more than one page, extract it to:
- **Components**: `src/components/` — e.g., `DebouncedInput.tsx`, `ContactLink.tsx`
- **Hooks**: `src/hooks/` — e.g., `useLocalStorage.ts`, `useFavorites.ts`

List pages (Clients, Jobs, Quotes, Invoices, Vendors, POs) share these patterns — build them once, reuse everywhere.

### AuditFooter — NON-NEGOTIABLE on every *FullPageDetail dialog

Every `*FullPageDetail` dialog **MUST** render an `<AuditFooter>` in its `DialogActions` footer.

```tsx
import AuditFooter from '@/components/AuditFooter'

{/* FIXED FOOTER CONTROLS */}
{entity && (
  <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', justifyContent: 'center' }}>
    <AuditFooter creAt={entity.creAt} creBy={entity.creBy} modAt={entity.modAt} modBy={entity.modBy} divider={false} />
  </DialogActions>
)}
```

- Wrap in `{entity && (...)}` — footer is hidden in create mode (no entity yet)
- Always pass `divider={false}` — the `DialogActions` border provides the visual separator
- **Never** use inline `<Typography>` for audit text — always use `<AuditFooter>`

---

### ContactLink — ALWAYS use for emails, phones, and URLs

Never render a raw email, phone number, or URL as plain text. Always use `ContactLink`:

```tsx
import ContactLink from '@components/ContactLink'

<ContactLink type='email' value={email} />   // → mailto:
<ContactLink type='phone' value={phone} />   // → tel: (initiates call on supported devices)
<ContactLink type='url'   value={url} />     // → opens new tab
```

This applies everywhere: table cells, card views, detail pages, drawers, tooltips, etc.

---

## Multi-Value Section Pattern — NON-NEGOTIABLE (Mobile Parity Rule)

This pattern is a **must-follow UI/UX rule** on the web app, matching the mobile app's established design.

### Rule: Every multi-value section MUST use the global shared components

Never inline phone/email/address/gallery lists in individual entity edit forms. Always import the global components from `src/components/`:

| Component | Import | Used for |
|-----------|--------|----------|
| `MultiPhoneSection` | `@/components/MultiPhoneSection` | Multiple phone numbers with type + default |
| `MultiEmailSection` | `@/components/MultiEmailSection` | Multiple email addresses with type + default |
| `MultiAddressSection` | `@/components/MultiAddressSection` | Multiple addresses with weather/maps/earth icons |
| `PhotoGallerySection` | `@/components/PhotoGallerySection` | Gallery with mic + camera + upload pattern |

### Required section header pattern — built into the components

Each component renders its own section header. DO NOT add an external title above it:

```tsx
// ✅ CORRECT — component owns its header with count + pill button
<MultiPhoneSection phones={phones} onChange={setPhones} phoneTypes={phoneTypes} />

// ❌ WRONG — duplicate title, the component already renders one
<Typography variant='overline'>Phone Numbers ({phones.length})</Typography>
<MultiPhoneSection phones={phones} onChange={setPhones} phoneTypes={phoneTypes} />
```

### Section header anatomy (enforced inside each component)

```
PHONE NUMBERS (2)                              [+ Add]
┌─────────────────────────────────────────────────────┐
│  ⭐  (301) 555-0100                            🗑️   │
│      Type: Mobile                                    │
└─────────────────────────────────────────────────────┘
```

- **Left**: `overline` label with live count in parentheses
- **Right**: Pill `Chip` button with `+ Add` label, `primary.lighter` background, hover effect
- **No** full-width outlined "Add" button at the bottom — the pill IS the add action

### Address section — additional icon buttons (mobile parity)

Each address card header includes 3 quick-action icon buttons to the right of the title:

| Icon | Target | Opens |
|------|--------|-------|
| `tabler-cloud` | Weather | NOAA forecast for the city |
| `tabler-world` | Google Earth | Satellite view of address |
| `tabler-map-pin` | Google Maps | Directions to address |

These must appear in the `MultiAddressSection` component (already implemented). Do **not** remove them.

### Gallery section pattern

Gallery sections follow the same pill `+ Add` header pattern. The section title shows `GALLERY (n)` with a camera icon. Action buttons (mic 🎤 + camera 📷 + upload ☁️) appear to the right of the title.

### When adding a new entity that needs these sections

1. Import the global component — do NOT write inline phone/email/address code
2. Fetch the required lookups via `useQuery` (phoneType, emailType, addressType, states, countries)
3. Maintain local `useState<PhoneEntry[]>`, `useState<EmailEntry[]>`, `useState<AddressEntry[]>` in the edit form
4. Map API response → entry format on load, and entry format → API format on save

```tsx
// Required lookups pattern
const { data: phoneTypes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'phoneType'], queryFn: () => api.get('/api/lookups/phoneType') })
const { data: emailTypes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'emailType'], queryFn: () => api.get('/api/lookups/emailType') })
const { data: addressTypes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'addressType'], queryFn: () => api.get('/api/lookups/addressType') })
const { data: states = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'state'], queryFn: () => api.get('/api/lookups/state') })
const { data: countries = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'country'], queryFn: () => api.get('/api/lookups/country') })
```

---

## Voice Explainers — Skill-Driven Workflow

Every list page and edit drawer in the web admin has an optional voice explainer — a contextual MP3 narration that plays when the screen or drawer opens. Audio is generated via ElevenLabs TTS and stored in the public Supabase **Explainers** bucket (Corp project: `otsodapoddxqtfbeovcl`).

### How to add an explainer — USE THE SKILL

**Do not do this manually.** Use the `explainer-creator` skill:

> "Add an explainer for the Roles page"
> "Add a voice explainer to the Assets list and edit drawer"

The skill handles all four steps automatically:
1. Reads the view/drawer component to enumerate fields and sections
2. Writes the TTS script text
3. Edits `generate-explainers.ts`, `VoiceExplainerPlayer.tsx`, and the drawer component
4. Runs `bun run scripts/generate-explainers.ts` to generate and upload the MP3s

### Key files

| File | Purpose |
|------|---------|
| `src/components/VoiceExplainerPlayer.tsx` | Route map (`EXPLAINER_ROUTES`), drawer map (`DRAWER_AUDIO`), floating player UI |
| `src/hooks/useDrawerExplainer.ts` | Hook called inside each edit drawer to activate drawer audio |
| `src/hooks/useVoiceExplainer.ts` | HTML5 Audio singleton management |
| `src/lib/state/voice-explainer-store.ts` | Zustand store (enabled flag, drawer override) |
| `scripts/generate-explainers.ts` | Bun script: ElevenLabs TTS → local cache → Supabase upload |
| `scripts/explainer-audio/` | Local MP3 cache — **do not delete** (avoids re-billing ElevenLabs) |

### Current explainers inventory

| Route / Drawer | MP3 file |
|----------------|----------|
| `/` `/home` `/dashboard` | DashboardView.mp3 |
| `/calendar` | CalendarView.mp3 |
| `/gallery` | GalleryView.mp3 |
| `/clients` | ClientList.mp3 |
| `/requests` | RequestList.mp3 |
| `/quotes` | QuoteList.mp3 |
| `/jobs` | JobList.mp3 |
| `/invoices` | InvoiceList.mp3 |
| `/vendors` | VendorList.mp3 |
| `/purchase-orders` | PurchaseOrderList.mp3 |
| `/team` | TeamList.mp3 |
| `/configuration/roles` | RolesView.mp3 |
| `/solutions` | SolutionList.mp3 |
| ClientEditDrawer | ClientEdit.mp3 |
| RequestEditDrawer | RequestEdit.mp3 |
| QuoteEditDrawer | QuoteEdit.mp3 |
| JobEditDrawer | JobEdit.mp3 |
| InvoiceEditDrawer | InvoiceEdit.mp3 |
| VendorEditDrawer | VendorEdit.mp3 |
| POEditDrawer | POEdit.mp3 |
| TeamEditDrawer | TeamEdit.mp3 |
| SolutionEditDrawer | SolutionEdit.mp3 |

### Critical rules

- **Never delete** cached MP3s in `scripts/explainer-audio/` — the script skips files that exist locally; deleting wastes ElevenLabs credits.
- **Corp Supabase only** — audio lives in `NEXT_PUBLIC_CORP_SUPABASE_URL`, not the per-tenant project.
- **Drawer key is TypeScript-enforced** — the string passed to `useDrawerExplainer(key, open)` must exactly match the key in `DRAWER_AUDIO`. A mismatch is a TS compile error.
- **Consistent voice** — always Rachel (`21m00Tcm4TlvDq8ikWAM`) + `eleven_turbo_v2_5`. Never change these.
- **Update this inventory table** when a new explainer is added.
