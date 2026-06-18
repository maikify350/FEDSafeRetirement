# FEDSafe Retirement — UI/UX Specification

> **Version:** 2.0 · **Date:** 2026-04-01 · **UI Library:** Vuexy v5.x (MUI + Next.js)

---

## 1. Foundational Rules

### 1.1 Styling — TailwindCSS ONLY

> [!CAUTION]
> **ALWAYS use Tailwind utility classes.** NEVER use inline CSS (`style={{}}` or `style=""`). This is a hard rule with zero exceptions.

```tsx
// ✅ CORRECT
<div className="flex items-center gap-4 p-6 bg-backgroundPaper rounded-lg">

// ❌ WRONG — inline CSS
<div style={{ display: 'flex', alignItems: 'center', padding: '24px' }}>
```

### 1.2 Responsive Design

All layouts MUST be responsive. Use Tailwind breakpoints:

| Breakpoint | Prefix | Min Width |
|------------|--------|-----------|
| Mobile | (default) | 0px |
| Small | `sm:` | 640px |
| Medium | `md:` | 768px |
| Large | `lg:` | 1024px |
| XL | `xl:` | 1280px |
| 2XL | `2xl:` | 1536px |

```tsx
// Responsive example — stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
```

### 1.3 Image Standard

- **Format:** `.webp` ONLY (no `.png`, `.jpg`, `.svg` for content images)
- **Icons:** Tabler Icons via Iconify `<i className="tabler-{name}" />`
- **SVG:** Allowed only for logos and icons, never for photos
- **Optimization:** All images must be compressed, max 200KB for content images

### 1.4 Vuexy Component Library — Always Check First

> [!IMPORTANT]
> Before building ANY component, check the Vuexy reference library at:
> `Docs/Vuexy_library_Reference/nextjs-typescript-version/full-version/src/`
>
> If a component exists there, **adapt it** — do NOT build from scratch.

---

## 2. Navigation Structure

### 2.1 Left Sidebar (Vertical Navigation)

```
┌─────────────────────────┐
│  🔐 FEDSafe Logo        │
├─────────────────────────┤
│  📊 Dashboard            │
│                          │
│  LEADS                   │
│  └─ 👥 Lead Search       │
│                          │
│  CAMPAIGNS               │
│  └─ 📁 Collections       │
│                          │
│  ACCOUNT                 │
│  ├─ ⚙️ Settings          │
│  ├─ 🔧 Configuration     │
│  └─ 👤 User Management   │
│     (Admin only)         │
├─────────────────────────┤
│  Ricardo Garcia          │
│  rgarcia350@gmail.com    │
│  [Logout]                │
└─────────────────────────┘
```

### 2.2 Top Navbar

- Breadcrumbs (left)
- Global search (center)
- Theme toggle (right)
- Notifications bell (right)
- User avatar + dropdown (right)

---

## 3. Page Layouts

### 3.1 Login Page

**Reference:** `Vuexy/src/views/Login.tsx`

- Split layout: illustration (left), form (right)
- Fields: Email, Password
- "Remember Me" checkbox
- "Forgot Password?" link → navigates to Forgot Password page
- Light/dark mode aware

### 3.2 Forgot Password Page

**Reference:** `Vuexy/src/views/ForgotPassword.tsx`

- Split layout: illustration (left), form (right)
- Single email field
- "Send Reset Link" button
- "Back to login" link with chevron icon

### 3.3 Lead Search Page (Primary Page)

**Reference:** `Vuexy/src/views/apps/user/list/UserListTable.tsx`

This is the core page. It must handle 472K records via **server-side pagination**.

#### Layout

```
┌──────────────────────────────────────────────┐
│ Card Header: "Federal Employee Leads"        │
├──────────────────────────────────────────────┤
│ FILTER BAR (collapsible)                     │
│ ┌──────┐ ┌──────────┐ ┌─────────┐ ┌───────┐ │
│ │State ▼│ │Occupation▼│ │Grade  ▼ │ │Salary │ │
│ └──────┘ └──────────┘ └─────────┘ └───────┘ │
│ ┌────────────┐ ┌────────────┐               │
│ │Duty Start ▼│ │Facility   ▼│  [Clear All]  │
│ └────────────┘ └────────────┘               │
├──────────────────────────────────────────────┤
│ [Page Size ▼] [🔍 Search...] [Export] [+ Add │
│                               to Collection] │
├──────────────────────────────────────────────┤
│ ☐ │ Name         │ Title     │ Grade │ Salary│
│───┼──────────────┼───────────┼───────┼───────│
│ ☐ │ Andrew Mayo   │ BLDG MAINT│ P9-05 │$73,831│
│ ☐ │ Julio Arzeno │ CARRIER   │ Q7-01 │$50,153│
│   │ ...          │           │       │       │
├──────────────────────────────────────────────┤
│ Showing 1-25 of 472,576  │ < 1 2 3 ... 100 >│
└──────────────────────────────────────────────┘
```

#### Key Behaviors
- **Server-side pagination** — never load all 472K rows
- **Debounced search** (500ms) — sends query to Supabase
- **Column sorting** — click header to toggle asc/desc
- **Row selection** — checkboxes for bulk actions
- **Row click** → opens Lead Detail drawer/dialog
- **Filter chips** — show active filters with clear buttons
- **Result count** — always show total matching records

#### Filter Components

| Filter | Component | Type |
|--------|-----------|------|
| State | `CustomTextField` (select, multi) | Dropdown with 54 states |
| Occupation Title | `CustomTextField` (select, multi) | Searchable dropdown with 112 options |
| Grade Level | `CustomTextField` (select, multi) | Dropdown with 120 options |
| Annual Salary | Range slider OR two number inputs | Min/Max |
| Entered on Duty Date | `react-datepicker` | Date range picker |
| Facility City | `CustomTextField` | Text input with autocomplete |

### 3.4 Lead Detail View

**Reference:** `Vuexy/src/views/apps/user/view/`

- Slide-out drawer OR full page
- Employee profile card with all 13 fields
- "Collections" tab showing which collections this lead belongs to
- "Add to Collection" action button
- "Export" single record

### 3.5 Collections List Page

**Reference:** `Vuexy/src/views/apps/invoice/list/`

- Card grid OR table view (toggle)
- Each collection shows: Name, Description, Status badge, Lead count, Created date
- Actions: View, Edit, Archive, Delete
- "New Collection" button → opens create dialog

### 3.6 Collection Detail Page

- Header: Collection name, description, status chip, tags
- Stats row: Total leads, Avg salary, Top states
- Data grid of collection members (same component as Lead Search)
- "Add Leads" button → opens Lead Search in selection mode
- "Remove Selected" bulk action
- "Export Collection" to CSV

### 3.7 Dashboard Page

**Reference:** `Vuexy/src/views/dashboards/`

- 4 KPI cards (Total Leads, Active Collections, Leads in Collections, Recent Exports)
- Charts:
  - Leads by State (horizontal bar chart, top 20)
  - Salary Distribution (histogram)
  - Grade Level Breakdown (donut chart)
- Recent activity list

### 3.8 Settings Page

**Reference:** `Vuexy/src/views/pages/`

- Profile tab: Name, Email, Phone, Avatar upload
- Preferences tab:
  - Theme mode (Light/Dark/System toggle)
  - Default page size (dropdown: 10, 25, 50, 100)
  - Default visible columns (multi-select checkboxes)
  - Sidebar collapsed preference (toggle)
- All preferences stored in `users.settings` JSONB column

### 3.9 User Management Page (Admin Only)

**Reference:** `Vuexy/src/views/apps/user/list/`

- User list table with role badges
- Add User drawer
- Edit user dialog
- Deactivate/delete user actions
- Role assignment (Admin, Advisor, Viewer)

---

## 4. Component Mapping (Vuexy Reference)

| App Component | Vuexy Reference Path | Notes |
|--------------|----------------------|-------|
| Login | `views/Login.tsx` | Adapt for Supabase Auth |
| Forgot Password | `views/ForgotPassword.tsx` | Adapt for Supabase Auth |
| Data Table | `views/apps/user/list/UserListTable.tsx` | Base for Lead Search grid |
| Table Filters | `views/apps/user/list/TableFilters.tsx` | Base for Lead filters |
| Add Drawer | `views/apps/user/list/AddUserDrawer.tsx` | Base for Add-to-Collection |
| Detail View | `views/apps/user/view/` | Base for Lead Detail |
| Custom TextField | `@core/components/mui/TextField` | Use everywhere for inputs |
| Custom Avatar | `@core/components/mui/Avatar` | User avatars |
| Option Menu | `@core/components/option-menu/` | Row action menus |
| Table Pagination | `components/TablePaginationComponent.tsx` | Pagination footer |
| Theme Config | `configs/themeConfig.ts` | Customize for FEDSafe brand |

---

## 5. Design Tokens

### 5.1 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#1B4332` (Dark Green) | Nav, buttons, links |
| Primary Light | `#2D6A4F` | Hover states |
| Secondary | `#40916C` | Secondary actions |
| Accent | `#95D5B2` | Badges, highlights |
| Background | `#F8F9FA` (light) / `#1A1A2E` (dark) | Page background |
| Surface | `#FFFFFF` (light) / `#16213E` (dark) | Cards |
| Error | `#E63946` | Validation, destructive |
| Warning | `#F4A261` | Warnings |
| Success | `#2A9D8F` | Success states |
| Info | `#457B9D` | Informational |

### 5.2 Typography

- **Font Family:** Inter (via Google Fonts) — matches Vuexy default
- **Headings:** `font-semibold` or `font-bold`
- **Body:** `font-normal`, 14px base

### 5.3 Spacing

Follow Tailwind's 4px grid: `p-1` (4px), `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px)

### 5.4 Border Radius

- Cards: `rounded-lg` (8px)
- Buttons: `rounded-md` (6px)
- Chips/Badges: `rounded-full`
- Inputs: `rounded-md` (6px)

---

## 6. Interaction Patterns

### 6.1 Loading States
- **Skeleton loaders** for tables (Vuexy provides these)
- **Spinner** for button actions
- **Progress bar** for data imports
- Never show empty content without a loading indicator

### 6.2 Toast Notifications
- Use `react-toastify` (already in Vuexy)
- Position: top-right (matches themeConfig)
- Success: green, auto-dismiss 3s
- Error: red, persist until dismissed
- Info: blue, auto-dismiss 5s

### 6.3 Empty States
- Meaningful illustrations + action buttons
- "No leads match your filters" with "Clear Filters" CTA
- "No collections yet" with "Create First Collection" CTA

### 6.4 Confirmation Dialogs
- Destructive actions (delete, remove from collection) always require confirmation
- Use MUI Dialog component

---

## 7. UI/UX Rules — NON-NEGOTIABLE

### 7.1 Confirmation Dialogs

> [!CAUTION]
> **NEVER use `window.alert()`, `window.confirm()`, or `window.prompt()`.** Always use the reusable `ConfirmDialog` component at `src/components/ConfirmDialog.tsx`.

```tsx
// ✅ CORRECT — styled ConfirmDialog
<ConfirmDialog
  open={confirm}
  onClose={() => setConfirm(false)}
  onConfirm={handleDelete}
  title='Delete Record'
  message='This cannot be undone.'
  confirmLabel='Delete'
  confirmColor='error'
  icon='tabler-trash'
/>

// ❌ FORBIDDEN
window.confirm('Are you sure?')
window.alert('Done!')
```

### 7.2 Required Field Labels

Required fields display a **bold red asterisk** after the label text using the `RequiredLabel` component:

```tsx
const RequiredLabel = ({ children }: { children: string }) => (
  <span>{children}<span style={{ color: '#ef4444', fontWeight: 700, marginLeft: 2 }}>*</span></span>
)

<CustomTextField label={<RequiredLabel>First Name</RequiredLabel>} />
```

Validation is enforced client-side in the save handler with an error message.

### 7.3 Favorites System Pattern

- **Database:** Boolean `is_favorite` column with partial index `WHERE is_favorite = true`
- **Grid:** Star icon column with optimistic toggle (gold when active)
- **Edit Dialog:** Star in header, left of Cancel button
- **Filters:** Favorites pill in filter bar + "Clear All" with ConfirmDialog
- **API:** Toggle endpoint (PATCH) + bulk clear endpoint (DELETE)

### 7.4 Bulk Actions & Selection Bar

- **Column 1** is always a checkbox selector in all grids
- When rows are selected, a floating bar appears at bottom center:
  - Shows "N selected" count
  - Export actions (CSV/JSON via field picker)
  - Custom bulk actions (e.g., "Push to ACT")
  - Clear selection button
- The `EntityListView` accepts `bulkActions` prop:
  ```tsx
  bulkActions={[
    { label: 'Push to ACT', icon: 'tabler-send', onClick: (rows) => { ... } },
  ]}
  ```

### 7.5 Export Field Picker

- Export always goes through `ExportFieldPickerDialog`
- User can select/deselect fields, drag-to-reorder, choose CSV/JSON
- Selections persist per storageKey to localStorage
- The `EntityListView` accepts `exportFields` prop (array of `{ key, label }`)

### 7.6 Column Resizing

- All data grid columns are resizable by dragging the right edge of the header
- Double-click resize handle to reset column width
- Column widths persist via `useGridPreferences` hook (columnSizing)

### 7.7 Button Positioning

- The primary "+Add" button is **always pinned to the far right** of the toolbar with 10px right padding
- This is enforced globally in `EntityListView.tsx`

### 7.8 Audit Footer

- All entity edit dialogs use `EntityEditDialog` which includes the `AuditFooter`
- Format: "Created by {user} on {date} • Last modified by {user} on {date}"
- Audit fields: `cre_dt`, `mod_dt`, `cre_by`, `mod_by` (NON-NEGOTIABLE naming)

---

## 8. Accessibility Requirements

- All interactive elements have visible focus rings
- ARIA labels on icon-only buttons
- Color contrast ratio ≥ 4.5:1
- Keyboard navigation support for data grid
- Screen reader friendly table headers
