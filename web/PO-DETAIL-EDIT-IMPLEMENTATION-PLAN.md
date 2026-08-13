# Purchase Order Detail & Edit Implementation Plan — Web Admin

**Based on CLIENT-DETAIL-EDIT-IMPLEMENTATION-PLAN.md and working Request/Client implementations**

---

## 📋 Current State vs Required State

### ❌ Current (WRONG):
- Double-click PO row → Detail panel opens (✅ correct)
- Detail panel → Edit button → POEditDrawer (old drawer pattern)
- Save button at bottom (old pattern)

### ✅ Required (CORRECT):
- Double-click PO row → Detail panel opens (already works)
- Detail panel → Edit button (pencil icon) → Edit panel
- New PO button → Edit panel directly
- Save/Edit/Close buttons → Always visible at TOP (sticky)
- Edit panel → Save → Returns to Detail panel
- Detail panel → Close (X) → Returns to List with refresh

---

## 🏗️ Architecture Overview

### Three-Panel System:
```
┌──────────────┬─────────────────┬──────────────────┐
│ PO List      │  Detail Panel   │   Edit Panel     │
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
web/src/views/purchase-orders/
├── PurchaseOrdersView.tsx          (EXISTS - needs modification)
├── PurchaseOrderDetailPanel.tsx    (EXISTS - already correct)
├── POEditDrawer.tsx                (EXISTS - DELETE after migration)
└── PurchaseOrderEditPanel.tsx      (NEW - replaces POEditDrawer)
```

---

## 🎨 PO Detail Panel Components (ALREADY IMPLEMENTED)

**PurchaseOrderDetailPanel.tsx** already uses the DetailPanel wrapper and has:
- Header Bar with Edit button
- PO information sections
- Delete button
- Audit footer

**Status: ✅ Already complete**

---

## ✏️ PO Edit Panel Components (TO BE CREATED)

### Based on RequestEditPanel.tsx pattern

**File: `PurchaseOrderEditPanel.tsx`**

### Props:
```typescript
interface PurchaseOrderEditPanelProps {
  poId: string | null   // null = new PO
  open: boolean
  onClose: () => void
  onSaved: () => void   // called after save → switch to detail panel
}
```

### Section Order:

1. **Header Bar** (Sticky at top - provided by EditPanel wrapper)
   - Close button (X)
   - "Edit Purchase Order" title
   - Save button
   - Loading indicator when saving

2. **Basic Information Card**
   - Title* (Required)
   - Vendor* (Required - Select from vendors list)
   - Status (Select from PO statuses)
   - Issue Date (Date picker)
   - Due Date (Date picker)
   - Expected Delivery Date (Date picker)

3. **Issue Details**
   - Issued By (text field)
   - Vendor Reference Number
   - Tracking Number

4. **Financial Details**
   - Subtotal (read-only, calculated from line items)
   - Freight (decimal input)
   - Discount (decimal input)
   - Total (read-only, calculated)

5. **Line Items Section**
   - DataGrid or table with add/remove rows
   - Columns: Description, Quantity, Unit Price, Total
   - Add Line Item button
   - Remove line item button

6. **Notes Sections**
   - Vendor Message (multiline - shown on PO email/PDF)
   - Internal Notes (multiline - admin only)

7. **Audit Footer** (if editing existing PO)
   - Created by/at
   - Modified by/at

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

### New PO Flow:
- [ ] Click "New PO" button opens Edit panel directly
- [ ] Edit panel has empty form
- [ ] Save creates new PO and shows Detail panel
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
- Left: Back arrow + "Purchase Orders" text
- Center: PO Number
- Right: Edit button (pencil icon) + Close (X)

### Edit Panel Actions (EditPanel wrapper provides):
- Left: Close button (X)
- Center: "Edit Purchase Order" title
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

### 2. Line Items Component (NEW or reuse existing)
Check if `MultiLineItemSection.tsx` or similar exists for Quotes/Invoices
- Add/Remove line item rows
- Description, Quantity, Unit Price, Total columns
- Calculate subtotals automatically

---

## 🔍 Implementation Tasks

### Task 1: Create PurchaseOrderEditPanel.tsx
- [ ] Create new file based on RequestEditPanel.tsx pattern
- [ ] Import EditPanel wrapper
- [ ] Define form state (useState for each field)
- [ ] Fetch lookups (vendors, statuses)
- [ ] Populate form on open (useEffect)
- [ ] Implement validation (required fields: title, vendorId)
- [ ] Implement save mutation
- [ ] Handle line items (add/remove/calculate totals)
- [ ] Call onSaved() after successful save

### Task 2: Update PurchaseOrdersView.tsx
- [ ] Import PurchaseOrderEditPanel
- [ ] Replace POEditDrawer with PurchaseOrderEditPanel
- [ ] Update props: change `onSave` to `onSaved`
- [ ] Wire onSaved to: close edit panel → open detail panel
- [ ] Test New PO flow: opens edit panel directly
- [ ] Test Edit flow: Detail → Edit → Save → Detail

### Task 3: Delete POEditDrawer.tsx
- [ ] After verifying everything works
- [ ] Remove POEditDrawer.tsx file
- [ ] Remove import from PurchaseOrdersView.tsx

---

## 📚 Reference Files

### Components to Study:
- `web/src/views/requests/RequestEditPanel.tsx` (primary reference)
- `web/src/views/clients/ClientEditPanel.tsx` (secondary reference)
- `web/src/components/EditPanel.tsx` (wrapper)
- `web/src/components/DetailPanel.tsx` (already in use)

### Existing PO Files:
- `web/src/views/purchase-orders/PurchaseOrderDetailPanel.tsx` (already correct)
- `web/src/views/purchase-orders/POEditDrawer.tsx` (to be replaced)
- `web/src/views/purchase-orders/PurchaseOrdersView.tsx` (needs updates)

---

## 🚀 Execution Order

1. **Read RequestEditPanel.tsx** to understand the pattern
2. **Create PurchaseOrderEditPanel.tsx** following the same structure
3. **Test in isolation** (open with New PO button)
4. **Update PurchaseOrdersView.tsx** to use new panel
5. **Test all navigation flows** (List → Detail → Edit → Detail → List)
6. **Verify unsaved changes warning** works
7. **Delete POEditDrawer.tsx** once confirmed working

---

## ✅ Success Criteria

### User Experience:
- [ ] Navigation feels native and intuitive
- [ ] No confusion about how to edit vs view
- [ ] Action buttons always accessible (never scroll away)
- [ ] Line items section easy to manage
- [ ] Save/cancel behavior is clear
- [ ] No data loss (unsaved changes warning)

### Code Quality:
- [ ] Reusable EditPanel wrapper used
- [ ] TypeScript types from shared contracts
- [ ] Proper error handling
- [ ] Loading states for all async operations
- [ ] Follows RequestEditPanel pattern exactly

### Visual Consistency:
- [ ] Matches Requests and Clients edit panel layout
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
- ❌ DON'T skip audit footer for existing POs
- ❌ DON'T use alert() or confirm() (use MUI Dialog)
- ❌ DON'T forget line items calculation

---

**This plan follows the exact pattern established in Requests and Clients. Apply it to Purchase Orders only.**
