# Client Detail & Edit Implementation Plan — Web Admin

**Based on Task #312 and Mobile App Reference Implementation**

---

## 📋 Current State vs Required State

### ❌ Current (WRONG):
- Double-click client row → Edit drawer opens
- Save button at bottom (scrolls away)
- Single-column drawer layout

### ✅ Required (CORRECT):
- Double-click client row → Detail panel opens (right side)
- Detail panel → Edit button (pencil icon) → Edit panel
- New Client button → Edit panel directly
- Save/Edit/Close buttons → Always visible at TOP (sticky)
- Edit panel → Save → Returns to Detail panel
- Detail panel → Close (X) → Returns to List with refresh

---

## 🏗️ Architecture Overview

### Three-Panel System:
```
┌──────────────┬─────────────────┬──────────────────┐
│ Client List  │  Detail Panel   │   Edit Panel     │
│              │  (View Mode)    │   (Form Mode)    │
│              │                 │                  │
│ [Double      │  [Edit Button]  │   [Save Button]  │
│  Click]  ───>│      ├─────────>│        │         │
│              │      │          │        │         │
│              │  [Close (X)]    │        v         │
│              │      ^          │   [Detail Panel] │
│              │      │          │        │         │
│              │<─────┴──────────┴────────┘         │
└──────────────┴─────────────────┴──────────────────┘
```

---

## 📁 File Structure

### New Files to Create:

```
web/src/views/clients/
├── ClientsView.tsx          (EXISTS - needs modification)
├── ClientDetailPanel.tsx    (NEW - detail view, right panel)
└── ClientEditPanel.tsx      (NEW - edit form, replaces drawer)

web/src/components/
├── DetailPanel.tsx          (NEW - reusable detail panel wrapper)
├── EditPanel.tsx            (NEW - reusable edit panel wrapper)
├── MultiPhoneSection.tsx    (NEW - like mobile PhoneNumberList)
├── MultiEmailSection.tsx    (NEW - like mobile EmailList)
├── MultiAddressSection.tsx  (NEW - like mobile AddressListSection)
├── PhotoGallerySection.tsx  (NEW - like mobile PhotosSection)
└── StickyActionBar.tsx      (NEW - always-visible top actions)
```

---

## 🎨 Client Detail Panel Components

### Section Order (matching Mobile):

1. **Header Bar** (Sticky at top)
   - Back button (to List)
   - Client name
   - Edit button (pencil icon)
   - Close button (X)

2. **Header Card**
   - Avatar/Initials circle
   - Primary name (person or company based on useCompanyName)
   - Secondary name (if applicable)
   - Quick action icons (Phone, Email, Website)

3. **Tags Section**
   - Chip-style tags display
   - Only show if tags exist

4. **Phone Numbers Section**
   - Multiple phones with star icon for default
   - Click to call (tel: link)
   - Type label (Mobile, Work, etc.)

5. **Email Addresses Section**
   - Multiple emails with star icon for default
   - Click to email (mailto: link)
   - Type label

6. **Website Section**
   - Single field
   - Click to open in new tab

7. **Client Details Section**
   - Tax Code
   - Customer Type
   - Payment Terms
   - Credit Status

8. **Expand All / Collapse All Controls**
   - Toggle buttons for all accordions

9. **Addresses Accordion**
   - Multiple addresses
   - Map link/icon
   - Site Equipment link (if applicable)

10. **Related Records Accordions**
    - Requests (count, clickable list)
    - Quotes (count, clickable list)
    - Jobs (count, clickable list)
    - Invoices (count, clickable list)

11. **Notes Sections**
    - Technician Notes (read-only display)
    - Internal Notes (admin only, read-only)

12. **Photo Gallery**
    - Grid of client photos
    - Click to view full-size
    - Upload button

13. **Actions Section**
    - Create Request for this Client
    - Create Quote for this Client
    - Create Job for this Client
    - Create Invoice for this Client
    - View History for this Client

14. **Delete Button**
    - Red destructive button
    - Confirmation dialog

15. **Audit Footer**
    - Created by/at
    - Modified by/at

---

## ✏️ Client Edit Panel Components

### Section Order (matching Mobile):

1. **Header Bar** (Sticky at top)
   - Close button (X)
   - "Edit Client" title
   - Save button
   - Loading indicator when saving

2. **Basic Information Card**
   - Prefix (Select)
   - First Name* (Required)
   - Last Name* (Required)
   - Suffix (Select)
   - Company
   - Website
   - Use Company Name checkbox (only if company has value)
   - Customer Type
   - Role
   - Payment Terms
   - Credit Status
   - Tax Code

3. **Tags Section**
   - Tag input with chips

4. **Phone Numbers Section**
   - MultiPhoneSection component
   - Add/Remove phones
   - Set default with star icon
   - Phone type selection
   - Custom label option

5. **Email Addresses Section**
   - MultiEmailSection component
   - Add/Remove emails
   - Set default with star icon
   - Email type selection
   - Custom label option

6. **Addresses Section**
   - MultiAddressSection component
   - Add/Remove addresses
   - Set default with star icon
   - Address autocomplete
   - Map preview
   - Address type selection

7. **Technician Notes**
   - Multiline text area
   - Description helper text

8. **Internal Notes** (Admin Only)
   - Multiline text area
   - Admin-only badge
   - Description helper text

9. **Audit Footer**
   - Created by/at
   - Modified by/at

---

## 🔄 Navigation Flow Verification Checklist

### List → Detail:
- [ ] Double-click row opens Detail panel (NOT edit)
- [ ] Detail panel slides in from right
- [ ] Detail panel shows all sections
- [ ] Detail panel has Edit button at top
- [ ] Detail panel has Close (X) button at top
- [ ] Close button returns to List (no refresh needed - realtime updates)

### Detail → Edit:
- [ ] Click Edit button (pencil icon) opens Edit panel
- [ ] Edit panel replaces Detail panel (same position)
- [ ] Edit panel has Save button at top
- [ ] Edit panel has Close (X) button at top
- [ ] All fields populated from Detail data

### Edit → Detail:
- [ ] Click Save button submits form
- [ ] Show loading indicator on Save button
- [ ] On success, close Edit panel and show Detail panel
- [ ] Detail panel shows updated data
- [ ] Toast/notification confirms save

### Edit → List (Cancel):
- [ ] Click Close (X) without saving shows confirm dialog
- [ ] "Discard changes?" with Cancel/Discard buttons
- [ ] Discard closes Edit panel and returns to List

### New Client Flow:
- [ ] Click "New Client" button opens Edit panel directly
- [ ] Edit panel has empty form
- [ ] Save creates new client and shows Detail panel
- [ ] Close (X) cancels and returns to List

---

## 🎯 Sticky Action Bar Requirements

### Position:
- Always at TOP of panel (not bottom)
- Position: sticky, top: 0
- z-index: 10
- Background: solid (no transparency issues)
- Box shadow for depth

### Detail Panel Actions:
- Left: Back arrow + "Clients" text
- Center: Client name (truncate if long)
- Right: Edit button (pencil icon) + Close (X)

### Edit Panel Actions:
- Left: Close button (X)
- Center: "Edit Client" title
- Right: Save button
- Save button disabled when form invalid
- Save button shows loading spinner when submitting

---

## 📦 Reusable Components to Build

### 1. DetailPanel.tsx
**Props:**
```typescript
interface DetailPanelProps {
  open: boolean
  onClose: () => void
  onEdit?: () => void
  title: string
  children: React.ReactNode
  actions?: React.ReactNode // Custom action buttons
}
```

**Features:**
- Drawer component (anchor='right')
- Sticky header bar
- Responsive width (sm: 400px, md: 500px, lg: 600px)
- Smooth transitions
- Backdrop click closes

---

### 2. EditPanel.tsx
**Props:**
```typescript
interface EditPanelProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  title: string
  isSaving: boolean
  hasUnsavedChanges?: boolean
  children: React.ReactNode
}
```

**Features:**
- Drawer component (anchor='right')
- Sticky header bar with Save button
- Unsaved changes warning on close
- Responsive width (sm: 500px, md: 600px, lg: 700px)
- Form validation integration

---

### 3. MultiPhoneSection.tsx
**Based on:** `mobile/src/components/PhoneNumberList.tsx`

**Props:**
```typescript
interface MultiPhoneSectionProps {
  phones: PhoneEntry[]
  onChange: (phones: PhoneEntry[]) => void
  phoneTypes: LookupItem[]
}

type PhoneEntry = {
  id?: string // UUID for existing, undefined for new
  number: string
  typeId: string // UUID reference
  customLabel?: string
  isDefault: boolean
}
```

**Features:**
- Add/Remove phone rows
- Phone number formatting
- Type dropdown
- Custom label input (when type = "Other")
- Star icon to set default
- Validation (valid phone number)

---

### 4. MultiEmailSection.tsx
**Based on:** `mobile/src/components/EmailList.tsx`

**Props:**
```typescript
interface MultiEmailSectionProps {
  emails: EmailEntry[]
  onChange: (emails: EmailEntry[]) => void
  emailTypes: LookupItem[]
}

type EmailEntry = {
  id?: string
  address: string
  typeId: string
  customLabel?: string
  isDefault: boolean
}
```

**Features:**
- Add/Remove email rows
- Email validation
- Type dropdown
- Custom label input (when type = "Other")
- Star icon to set default

---

### 5. MultiAddressSection.tsx
**Based on:** `mobile/src/components/AddressListSection.tsx`

**Props:**
```typescript
interface MultiAddressSectionProps {
  addresses: AddressEntry[]
  onChange: (addresses: AddressEntry[]) => void
  addressTypes: LookupItem[]
  states: LookupItem[]
  countries: LookupItem[]
}

type AddressEntry = {
  id?: string
  addressTypeId: string
  street: string
  street2?: string
  city: string
  stateId: string | null
  zipCode: string
  countryId: string
  isDefault: boolean
}
```

**Features:**
- Add/Remove address cards
- Address autocomplete (Google Maps/Mapbox)
- Map preview icon
- Type dropdown
- Star icon to set default
- Country/State lookups

---

### 6. PhotoGallerySection.tsx
**Based on:** `mobile/src/components/PhotosSection.tsx`

**Props:**
```typescript
interface PhotoGallerySectionProps {
  entityId: string
  entityType: 'client' | 'job' | 'quote' | 'invoice' | 'request' | 'vendor' | 'purchase-order'
  category: string
  onPhotosChange?: () => void
}
```

**Features:**
- Grid layout (3-4 columns)
- Upload button
- Click to view full-size (lightbox)
- Delete photo
- Photo metadata (date, uploaded by)

---

## 🔍 Implementation Phases

### Phase 1: Core Panel Structure
- [ ] Create DetailPanel.tsx wrapper
- [ ] Create EditPanel.tsx wrapper
- [ ] Create StickyActionBar.tsx
- [ ] Modify ClientsView to support panel states
- [ ] Remove existing ClientEditDrawer usage

### Phase 2: Client Detail Panel
- [ ] Create ClientDetailPanel.tsx
- [ ] Implement header card section
- [ ] Implement tags section
- [ ] Implement phone numbers section (read-only)
- [ ] Implement email addresses section (read-only)
- [ ] Implement website section
- [ ] Implement client details section
- [ ] Implement expand/collapse controls

### Phase 3: Accordions & Related Records
- [ ] Implement addresses accordion
- [ ] Implement requests accordion
- [ ] Implement quotes accordion
- [ ] Implement jobs accordion
- [ ] Implement invoices accordion
- [ ] Implement notes sections (read-only)

### Phase 4: Gallery & Actions
- [ ] Implement PhotoGallerySection
- [ ] Implement actions section
- [ ] Implement delete button
- [ ] Implement audit footer

### Phase 5: Client Edit Panel - Basic Components
- [ ] Create MultiPhoneSection.tsx
- [ ] Create MultiEmailSection.tsx
- [ ] Create MultiAddressSection.tsx
- [ ] Test components in isolation

### Phase 6: Client Edit Panel - Full Form
- [ ] Create ClientEditPanel.tsx
- [ ] Implement basic information section
- [ ] Implement tags section
- [ ] Integrate MultiPhoneSection
- [ ] Integrate MultiEmailSection
- [ ] Integrate MultiAddressSection
- [ ] Implement notes sections
- [ ] Implement form validation
- [ ] Implement save handler

### Phase 7: Navigation Flow
- [ ] Wire List → Detail (double-click)
- [ ] Wire Detail → Edit (pencil button)
- [ ] Wire Edit → Detail (save)
- [ ] Wire panels → List (close)
- [ ] Wire New Client → Edit → Detail flow
- [ ] Implement unsaved changes warning

### Phase 8: Polish & Testing
- [ ] Test all navigation flows
- [ ] Test form validation
- [ ] Test multi-item sections (add/remove/reorder)
- [ ] Test sticky action bars
- [ ] Test responsive breakpoints
- [ ] Test dark mode (if applicable)
- [ ] Test accessibility
- [ ] Performance optimization

---

## 🔄 Apply to Other Entities

Once Client is perfected, apply same pattern to:

1. **Jobs** (`job/[id].tsx`, `job/edit/[id].tsx`)
2. **Quotes** (`quote/[id].tsx`, `quote/edit/[id].tsx`)
3. **Invoices** (`invoice/[id].tsx`, `invoice/edit/[id].tsx`)
4. **Requests** (`request/[id].tsx`, `request/edit/[id].tsx`)
5. **Vendors** (`vendor/[id].tsx`, `vendor/edit/[id].tsx`)
6. **Purchase Orders** (`purchase-order/[id].tsx`, `purchase-order/edit/[id].tsx`)

Each entity shares:
- DetailPanel wrapper
- EditPanel wrapper
- StickyActionBar
- MultiPhoneSection (Clients, Vendors only)
- MultiEmailSection (Clients, Vendors only)
- MultiAddressSection (Clients, Vendors only)
- PhotoGallerySection (all entities)
- Audit footer (all entities)

Entity-specific sections:
- Line items (Quotes, Invoices, Purchase Orders)
- Schedule dates (Jobs)
- Assessment details (Requests)
- Vendor-specific fields
- etc.

---

## ✅ Success Criteria

### User Experience:
- [ ] Navigation feels native and intuitive
- [ ] No confusion about how to edit vs view
- [ ] Action buttons always accessible (never scroll away)
- [ ] Multi-item sections (phones, emails, addresses) easy to manage
- [ ] Save/cancel behavior is clear
- [ ] No data loss (unsaved changes warning)

### Code Quality:
- [ ] Reusable components used across all entities
- [ ] No code duplication
- [ ] TypeScript types from shared contracts
- [ ] Proper error handling
- [ ] Loading states for all async operations
- [ ] Accessibility attributes

### Visual Consistency:
- [ ] Matches mobile app layout (adapted for desktop)
- [ ] Consistent spacing and typography
- [ ] MUI components used where appropriate
- [ ] Vuexy theme integration
- [ ] Responsive design

---

## 📚 Reference Files (Mobile)

### Components to Study:
- `mobile/src/components/PhoneNumberList.tsx`
- `mobile/src/components/EmailList.tsx`
- `mobile/src/components/AddressListSection.tsx`
- `mobile/src/components/PhotosSection.tsx`
- `mobile/src/components/FormHeader.tsx`
- `mobile/src/components/Accordion.tsx`
- `mobile/src/components/AddressAccordion.tsx`
- `mobile/src/components/ActionButton.tsx`
- `mobile/src/components/AuditFooter.tsx`
- `mobile/src/components/NotesSection.tsx`
- `mobile/src/components/QuickActionIcons.tsx`

### Screens to Study:
- `mobile/src/app/client/[id].tsx` (Detail)
- `mobile/src/app/client/edit/[id].tsx` (Edit redirect)
- `mobile/src/app/new-client.tsx` (Form)
- `mobile/src/app/job/[id].tsx` (Detail pattern)
- `mobile/src/app/quote/[id].tsx` (Detail pattern)

---

## 🚀 Execution Order

1. **Read and understand** this entire plan
2. **Study mobile reference files** listed above
3. **Create reusable components first** (bottom-up approach)
4. **Build Client Detail panel** with all sections
5. **Build Client Edit panel** with all sections
6. **Wire up navigation** between panels
7. **Test thoroughly** with real data
8. **Perfect Client** before moving to other entities
9. **Apply pattern** to Jobs, Quotes, Invoices, etc.
10. **Final verification** across all entities

---

## 💡 Key Design Decisions

### Why Detail Panel First?
Mobile app uses **View → Edit** pattern, not **List → Edit**. This:
- Gives users context before editing
- Prevents accidental edits
- Allows quick viewing without entering edit mode
- Matches iOS native app patterns
- Provides better UX for complex records

### Why Sticky Top Actions?
- Desktop users expect action buttons at top (menu bar pattern)
- Bottom buttons require scrolling to find
- Save button must always be visible for confidence
- Matches standard desktop app conventions

### Why Multi-Item Components?
- Clients can have multiple phones, emails, addresses
- Vendors can have multiple contacts
- Jobs can have multiple schedule dates
- Reusable across all entities
- Consistent UX for managing collections

---

## ⚠️ Critical Don'ts

- ❌ DON'T open edit on double-click
- ❌ DON'T put Save button at bottom
- ❌ DON'T create new components if mobile already has them
- ❌ DON'T skip Detail panel and go straight to Edit
- ❌ DON'T implement multi-items inline (use components)
- ❌ DON'T forget unsaved changes warning
- ❌ DON'T skip audit footer
- ❌ DON'T skip photo gallery section
- ❌ DON'T forget to study mobile implementation first

---

**This plan is the definitive guide. Follow it exactly. Perfect Clients first, then replicate to all other entities.**
