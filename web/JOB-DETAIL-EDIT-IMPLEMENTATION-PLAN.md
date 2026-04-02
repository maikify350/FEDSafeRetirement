# Job Detail & Edit Implementation Plan — Web Admin

**Based on CLIENT-DETAIL-EDIT-IMPLEMENTATION-PLAN.md and working Request/Client implementations**

---

## 📋 Current State vs Required State

### ❌ Current (WRONG):
- Double-click job row → Detail panel opens (✅ correct)
- Detail panel → Edit button → JobEditDrawer (old drawer pattern)
- Save button at bottom (old pattern)

### ✅ Required (CORRECT):
- Double-click job row → Detail panel opens (already works)
- Detail panel → Edit button (pencil icon) → Edit panel
- New Job button → Edit panel directly
- Save/Edit/Close buttons → Always visible at TOP (sticky)
- Edit panel → Save → Returns to Detail panel
- Detail panel → Close (X) → Returns to List with refresh

---

## 🏗️ Architecture Overview

### Three-Panel System:
```
┌──────────────┬─────────────────┬──────────────────┐
│ Job List     │  Detail Panel   │   Edit Panel     │
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

### Files to Modify/Create:

```
web/src/views/jobs/
├── JobsView.tsx          (EXISTS - needs modification)
├── JobDetailPanel.tsx    (EXISTS - already correct)
├── JobEditDrawer.tsx     (EXISTS - DELETE after migration)
└── JobEditPanel.tsx      (NEW - replaces JobEditDrawer)
```

---

## 🎨 Job Detail Panel Components (ALREADY IMPLEMENTED)

**JobDetailPanel.tsx** already uses the DetailPanel wrapper and has:
- Header Bar with Edit button
- Job information sections
- Delete button
- Audit footer

**Status: ✅ Already complete**

---

## ✏️ Job Edit Panel Components (TO BE CREATED)

### Based on RequestEditPanel.tsx pattern

**File: `JobEditPanel.tsx`**

### Props:
```typescript
interface JobEditPanelProps {
  jobId: string | null   // null = new job
  open: boolean
  onClose: () => void
  onSaved: () => void    // called after save → switch to detail panel
}
```

### Section Order:

1. **Header Bar** (Sticky at top - provided by EditPanel wrapper)
   - Close button (X)
   - "Edit Job" / "New Job" title
   - Save button
   - Loading indicator when saving

2. **Job Details**
   - Title* (Required)
   - Description (multiline with dictation)
   - Client* (Required - Select)
   - Status (Select from job statuses)
   - Priority (Select: Low, Normal, High, Urgent)

3. **Assignment & Scheduling**
   - Assigned To (Select from users)
   - Scheduled Date (Date picker)
   - Needed By Date (Date picker)
   - Completed At Date (Date picker, read-only if not completed)

4. **Financial Details**
   - Tax Code (Select)

5. **Notes Sections**
   - Notes (multiline - general notes with dictation)
   - Internal Notes (multiline - admin only with dictation, warning background)

6. **Audit Footer** (if editing existing job)
   - Created by/at
   - Modified by/at

7. **Delete Button** (if editing existing job)
   - Red destructive button
   - Confirmation dialog

---

## 🔄 Navigation Flow Verification Checklist

### List → Detail:
- [x] Double-click row opens Detail panel (ALREADY WORKS)
- [x] Detail panel slides in from right (ALREADY WORKS)
- [x] Detail panel shows all sections (ALREADY WORKS)
- [x] Detail panel has Edit button at top (ALREADY WORKS)
- [x] Detail panel has Close (X) button at top (ALREADY WORKS)
- [x] Close button returns to List (ALREADY WORKS)

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

### New Job Flow:
- [ ] Click "New Job" button opens Edit panel directly
- [ ] Edit panel has empty form
- [ ] Save creates new job and shows Detail panel
- [ ] Close (X) cancels and returns to List

---

## 🎯 Sticky Action Bar Requirements

### Position:
- Always at TOP of panel (not bottom)
- Position: sticky, top: 0
- z-index: 10
- Background: solid (no transparency issues)
- Box shadow for depth

### Detail Panel Actions (ALREADY IMPLEMENTED):
- Left: Back arrow + "Jobs" text
- Center: Job Number / Title
- Right: Edit button (pencil icon) + Close (X)

### Edit Panel Actions (EditPanel wrapper provides):
- Left: Close button (X)
- Center: "Edit Job" / "New Job" title
- Right: Save button
- Save button disabled when form invalid
- Save button shows loading spinner when submitting

---

## 📦 Components to Use

### 1. EditPanel.tsx (ALREADY EXISTS)
Use the existing EditPanel wrapper at `@/components/EditPanel`

**Features:**
- Drawer component (anchor='right')
- Sticky header bar with Save button
- Unsaved changes warning on close
- Responsive width
- Form validation integration

---

## 🔍 Implementation Tasks

### Task 1: Create JobEditPanel.tsx
- [ ] Create new file based on RequestEditPanel.tsx pattern
- [ ] Import EditPanel wrapper
- [ ] Define form state (useState for each field)
- [ ] Fetch lookups (clients, users, statuses, tax codes)
- [ ] Populate form on open (useEffect)
- [ ] Implement validation (required fields: title, clientId)
- [ ] Implement save mutation
- [ ] Call onSaved() after successful save

### Task 2: Update JobsView.tsx
- [ ] Import JobEditPanel
- [ ] Replace JobEditDrawer with JobEditPanel
- [ ] Update props: change `onSave` to `onSaved`
- [ ] Wire onSaved to: close edit panel → open detail panel
- [ ] Test New Job flow: opens edit panel directly
- [ ] Test Edit flow: Detail → Edit → Save → Detail

### Task 3: Delete JobEditDrawer.tsx
- [ ] After verifying everything works
- [ ] Remove JobEditDrawer.tsx file
- [ ] Remove import from JobsView.tsx

---

## 📚 Reference Files

### Components to Study:
- `web/src/views/requests/RequestEditPanel.tsx` (primary reference)
- `web/src/views/purchase-orders/PurchaseOrderEditPanel.tsx` (just completed)
- `web/src/components/EditPanel.tsx` (wrapper)
- `web/src/components/DetailPanel.tsx` (already in use)

### Existing Job Files:
- `web/src/views/jobs/JobDetailPanel.tsx` (already correct)
- `web/src/views/jobs/JobEditDrawer.tsx` (to be replaced)
- `web/src/views/jobs/JobsView.tsx` (needs updates)

---

## 🚀 Execution Order

1. **Read RequestEditPanel.tsx** to understand the pattern
2. **Create JobEditPanel.tsx** following the same structure
3. **Test in isolation** (open with New Job button)
4. **Update JobsView.tsx** to use new panel
5. **Test all navigation flows** (List → Detail → Edit → Detail → List)
6. **Verify unsaved changes warning** works
7. **Delete JobEditDrawer.tsx** once confirmed working

---

## ✅ Success Criteria

### User Experience:
- [ ] Navigation feels native and intuitive
- [ ] No confusion about how to edit vs view
- [ ] Action buttons always accessible (never scroll away)
- [ ] Save/cancel behavior is clear
- [ ] No data loss (unsaved changes warning)

### Code Quality:
- [ ] Reusable EditPanel wrapper used
- [ ] TypeScript types from shared contracts
- [ ] Proper error handling
- [ ] Loading states for all async operations
- [ ] Follows RequestEditPanel pattern exactly

### Visual Consistency:
- [ ] Matches Requests, Clients, and POs edit panel layout
- [ ] Consistent spacing and typography
- [ ] MUI components used
- [ ] Vuexy theme integration
- [ ] Responsive design

---

## ⚠️ Critical Don'ts

- ❌ DON'T use old Drawer pattern (no direct Drawer import)
- ❌ DON'T put Save button at bottom
- ❌ DON'T skip unsaved changes warning
- ❌ DON'T forget to call onSaved() after successful save
- ❌ DON'T skip audit footer for existing jobs
- ❌ DON'T use alert() or confirm() (use MUI Dialog)
- ❌ DON'T use react-hook-form (use useState like RequestEditPanel)

---

**This plan follows the exact pattern established in Requests, Clients, and Purchase Orders. Apply it to Jobs only.**
