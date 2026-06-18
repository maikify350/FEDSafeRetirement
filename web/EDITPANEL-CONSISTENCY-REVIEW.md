# EditPanel Consistency Review

**Date**: 2026-03-13
**Scope**: Clients, Quotes, Requests, Jobs, Invoices, Purchase Orders, Vendors
**Solutions**: No EditPanel found (entity may not exist yet)

---

## Executive Summary

Reviewed all 7 existing EditPanel implementations for consistency, required field validation, UUID usage, and pattern adherence. Found **significant inconsistencies** in:

- Delete button implementation (only 4 of 7 have it)
- Unsaved changes detection (inconsistent patterns)
- Required fields discrepancies vs mobile app
- Lookup field validation completeness
- Section structure patterns

**Critical Issues**:
1. ClientEditPanel is missing Delete button + confirmation dialog
2. QuoteEditPanel and InvoiceEditPanel are missing Delete functionality
3. Required field validation doesn't match mobile app defaults (see Required Fields Comparison table below)

---

## Feature Comparison Matrix

| Feature | Client | Quote | Request | Job | Invoice | PO | Vendor |
|---------|--------|-------|---------|-----|---------|----|----|
| **EditPanel wrapper** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **useState (not react-hook-form)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **onSaved callback** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SectionHeader pattern** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **NotesEditorModal** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DictationButton for notes** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AuditFooter (edit mode)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Delete button** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Delete confirmation dialog** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Unsaved changes warning** | ⚠️ Weak | ⚠️ Weak | ✅ Full | ✅ Full | ⚠️ Weak | ✅ Full | ✅ Full |
| **Loading state** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Error state** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Multi-value sections** | ✅ | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A |

**Legend**:
- ✅ = Fully implemented
- ❌ = Missing
- ⚠️ = Partial / inconsistent
- N/A = Not applicable to entity

---

## Required Fields Comparison

Comparing web app validation against **mobile app defaults** from `mobile/src/lib/state/required-fields-store.ts`:

| Entity | Field | Mobile Default | Web Implementation | Status |
|--------|-------|----------------|-------------------|--------|
| **Client** | firstName | ✅ Required | ✅ Required | ✅ Match |
| | lastName | ❌ Optional | ❌ Optional | ✅ Match |
| | company | ❌ Optional | ❌ Optional | ✅ Match |
| | phone | ✅ Required (at least one) | ✅ Required (at least one) | ✅ Match |
| | email | ❌ Optional | ❌ Optional | ✅ Match |
| | address | ❌ Optional | ❌ Optional | ✅ Match |
| | customerType | ❌ Optional | ❌ Optional | ✅ Match |
| **Quote** | clientId | ✅ Required | ✅ Required | ✅ Match |
| | title | ❌ Optional | ✅ Required | ⚠️ Discrepancy |
| | jobType | ❌ Optional | ❌ Optional | ✅ Match |
| | description | ❌ Optional | ❌ Optional | ✅ Match |
| | lineItems | ✅ Required (at least one) | ❌ No validation | ❌ Missing |
| **Request** | clientId | ✅ Required | ✅ Required | ✅ Match |
| | title | ✅ Required | ✅ Required | ✅ Match |
| | tradeType | ❌ Optional | ❌ No field | ⚠️ Field missing |
| | lineItems | ✅ Required (at least one) | ❌ No field | ❌ Missing |
| | address | ❌ Optional | ❌ Optional | ✅ Match |
| **Job** | clientId | ✅ Required | ✅ Required | ✅ Match |
| | title | ✅ Required | ✅ Required | ✅ Match |
| | jobType | ✅ Required | ❌ Optional | ❌ Missing |
| | description | ❌ Optional | ❌ Optional | ✅ Match |
| | priority | ❌ Optional | ❌ Optional | ✅ Match |
| **Invoice** | clientId | ✅ Required | ✅ Required | ✅ Match |
| | title | ❌ Not in mobile | ✅ Required | ⚠️ Web-only field |
| | lineItems | ✅ Required (at least one) | ❌ No validation | ❌ Missing |
| | dueDate | ❌ Optional | ❌ Optional | ✅ Match |
| **PO** | vendorId | ✅ Required | ✅ Required | ✅ Match |
| | title | ❌ Optional | ✅ Required | ⚠️ Discrepancy |
| | lineItems | ✅ Required (at least one) | ❌ No field | ❌ Missing |
| | dueDate | ❌ Optional | ❌ Optional | ✅ Match |
| **Vendor** | company | ✅ Required | ⚠️ Company OR name | ⚠️ Partial |
| | name | ❌ Optional | ⚠️ Company OR name | ⚠️ Partial |
| | phone | ✅ Required (at least one) | ❌ Optional | ❌ Missing |
| | email | ✅ Required | ❌ Optional | ❌ Missing |

**Legend**:
- ✅ Match = Web validation matches mobile default
- ❌ Missing = Web doesn't validate this required field
- ⚠️ Discrepancy = Different requirement level

---

## Lookup Field Consistency

All EditPanels correctly use **UUID values** for dropdown menus (not text). Verified:

| Entity | UUID Lookups Used |
|--------|------------------|
| Client | ✅ prefixId, suffixId, customerTypeId, roleId, paymentTermsId, creditStatusId, taxCodeId, phoneTypes, emailTypes, addressTypes, states, countries |
| Quote | ✅ clientId, jobTypeId, taxCodeId, paymentTermsId, assignedToId, unitId |
| Request | ✅ clientId, statusId, assignedToId, stateId |
| Job | ✅ clientId, assignedToId, taxCodeId |
| Invoice | ✅ clientId, jobTypeId, taxCodeId, paymentTermsId, assignedToId, unitId |
| PO | ✅ vendorId, jobId |
| Vendor | ✅ paymentTermsId |

**All panels correctly populate dropdowns from `/api/lookups/*` endpoints.**

---

## Unsaved Changes Detection Patterns

Three different implementations found:

### Pattern A: Weak (Clients, Quotes, Invoices)
```tsx
hasUnsavedChanges={firstName.trim() !== '' || lastName.trim() !== ''}
hasUnsavedChanges={title.trim() !== ''}
```
**Issue**: Only checks if SOME field is filled, not if it's different from original value.

### Pattern B: Strong (Requests, Jobs, POs, Vendors)
```tsx
const isDirty = !!(
  title || description || clientId || statusId || assessmentDate ||
  assignedToId || propertyName || street || city || stateId || zipCode ||
  internalNotes || customerMessage
)
hasUnsavedChanges={isDirty}
```
**Better**: Checks if ANY field has a value, but still doesn't compare against original.

### Recommended Pattern (not currently implemented anywhere):
```tsx
const hasChanges = useMemo(() => {
  if (!originalData) return true; // new record
  return (
    title !== originalData.title ||
    description !== originalData.description ||
    clientId !== originalData.clientId
    // ... check all fields
  );
}, [title, description, clientId, originalData]);
```
This compares current state against loaded data to detect actual changes.

---

## Section Structure Patterns

All panels follow the standard pattern:

```tsx
<SectionHeader>Section Title</SectionHeader>
<Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    {/* Fields */}
  </Box>
</Box>
```

**Consistent across all 7 panels** ✅

---

## Notes Field Patterns

### Pattern A: Dual Notes (Clients, Jobs)
- **Technician Notes**: Visible to field workers (default background)
- **Internal Notes (Admin Only)**: Hidden from technicians (`warning.lighter` background)

### Pattern B: Single Internal Notes (Quotes, Invoices, POs)
- **Internal Notes (Admin Only)**: Hidden from customer (`warning.lighter` background)

### Pattern C: Dual Customer-Facing (Requests)
- **Customer Message**: Visible to customer (default background)
- **Internal Notes (Admin Only)**: Hidden from customer (`warning.lighter` background)

### Pattern D: Single Notes (Vendors)
- **Notes**: General vendor notes (default background)

**Recommendation**: Standardize on Pattern A or C depending on whether the entity is customer-facing or internal.

---

## Delete Implementation Discrepancies

| Panel | Delete Button | Confirmation Dialog | Dialog Quality |
|-------|---------------|---------------------|----------------|
| Client | ❌ Missing | ❌ Missing | N/A |
| Quote | ❌ Missing | ❌ Missing | N/A |
| Request | ✅ Present | ✅ Present | Full MUI Dialog with icon, disabled state |
| Job | ✅ Present | ✅ Present | Full MUI Dialog with icon, disabled state |
| Invoice | ❌ Missing | ❌ Missing | N/A |
| PO | ✅ Present | ✅ Present | Full MUI Dialog with icon, disabled state |
| Vendor | ✅ Present | ✅ Present | Full MUI Dialog with icon, disabled state |

**Canonical delete pattern** (from Request/Job/PO/Vendor):
```tsx
// In state
const [deleteDlgOpen, setDeleteDlgOpen] = useState(false)
const [deleting, setDeleting] = useState(false)

// Delete mutation
const deleteMutation = useMutation({
  mutationFn: () => api.delete(`/api/entity/${id}`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entities'] })
    onClose()
  }
})

// Delete button (inside EditPanel content, edit mode only)
{!isNew && (
  <Box sx={{ px: '2px', py: 2, display: 'flex', justifyContent: 'flex-end' }}>
    <Button variant='tonal' color='error'
      startIcon={<i className='tabler-trash' />}
      onClick={() => setDeleteDlgOpen(true)}
      disabled={saveMutation.isPending || deleting}>
      Delete Entity
    </Button>
  </Box>
)}

// Confirmation dialog (outside EditPanel)
<Dialog open={deleteDlgOpen} onClose={() => setDeleteDlgOpen(false)} maxWidth='xs' fullWidth>
  <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <i className='tabler-alert-triangle text-error text-2xl' />
    Delete Entity?
  </DialogTitle>
  <DialogContent>
    <DialogContentText>
      Are you sure you want to delete <strong>&ldquo;{entity?.title}&rdquo;</strong>?
      This action cannot be undone.
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button variant='tonal' color='secondary' onClick={() => setDeleteDlgOpen(false)} disabled={deleting}>
      Cancel
    </Button>
    <Button variant='contained' color='error' onClick={handleDelete} disabled={deleting}
      startIcon={deleting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-trash' />}>
      {deleting ? 'Deleting…' : 'Delete'}
    </Button>
  </DialogActions>
</Dialog>
```

---

## Line Items Pattern (Quotes, Invoices)

Quotes and Invoices share nearly identical line item UI:

### Common features:
- `lineItems: LineItemEntry[]` state
- `emptyLineItem()` factory function
- `addLineItem()`, `removeLineItem(idx)`, `updateLineItem(idx, patch)` helpers
- Service item picker dropdown (optional autocomplete)
- Qty + Unit Price + Unit columns
- Taxable checkbox
- Row total display
- "Add Line Item" button at section header + bottom

### Quote-specific:
- `applyServiceItem(idx, svcId)` — auto-fills description, unitPrice, unitId from service catalog

### Invoice-specific:
- Same pattern as Quote

**Both panels correctly filter out empty line items on save:**
```tsx
const validLineItems = lineItems.filter(li => li.description.trim())
```

**However**: Neither panel validates that at least one line item exists before saving, despite mobile app requiring `lineItems: true` for both entities.

---

## Discrepancies Summary

### Critical (Must Fix)

1. **Missing Delete functionality** (Client, Quote, Invoice)
   - Client should have delete for edit mode
   - Quote should have delete for edit mode
   - Invoice should have delete for edit mode
   - Copy pattern from Request/Job/PO/Vendor

2. **Missing line item validation** (Quote, Invoice, Request, PO)
   - Mobile app requires at least one line item for Quotes, Invoices, Requests, POs
   - Web panels accept empty arrays (only filters out blank descriptions)
   - Add validation: `const hasLineItems = lineItems.some(li => li.description.trim())`

3. **Job missing jobType required validation**
   - Mobile: `jobType: true` (required)
   - Web: `jobType` is optional dropdown
   - Add validation: `jobTypeError = submitAttempted && !jobTypeId ? 'Job type is required' : ''`

4. **Request missing tradeType field + lineItems**
   - Mobile has `tradeType` dropdown (optional by default, but field exists)
   - Mobile requires `lineItems: true`
   - Web Request has no tradeType dropdown
   - Web Request has no line items section

5. **Vendor missing phone + email required validation**
   - Mobile: `phone: true`, `email: true` (both required)
   - Web: phone and email are optional text inputs (not even validated)
   - Add validation: `phoneError`, `emailError`

### Medium Priority

6. **PO missing line items section**
   - Mobile: `lineItems: true` (required)
   - Web: PO has no line items UI
   - Need to add same line items section as Quote/Invoice

7. **Quote title should be optional** (mobile default)
   - Mobile: `title: false` (optional)
   - Web: `title` is required
   - Change validation to make title optional if matching mobile defaults

8. **Unsaved changes detection weak** (Client, Quote, Invoice)
   - Only checks if fields are filled, not if they differ from original
   - Upgrade to comprehensive `isDirty` pattern from Request/Job/PO/Vendor

---

## Recommendations

### Immediate Actions (Non-Negotiable)

1. **Add Delete functionality to Client, Quote, Invoice**
   - Copy full pattern from Request/Job/PO/Vendor
   - Include confirmation dialog with entity name interpolation
   - Add `deleting` state for button disabled state

2. **Add line item validation to Quote, Invoice**
   - Add to form validation: `const hasLineItems = lineItems.some(li => li.description.trim())`
   - Update `isFormValid`: `isFormValid = !!title.trim() && !!clientId && hasLineItems`
   - Add error message: `lineItemsError = submitAttempted && !hasLineItems ? 'At least one line item is required' : ''`

3. **Add jobType required validation to Job**
   - Add to validation: `const jobTypeError = submitAttempted && !jobTypeId ? 'Job type is required' : ''`
   - Update `isFormValid`: `isFormValid = !!title.trim() && !!clientId && !!jobTypeId`

4. **Add tradeType field + lineItems to Request**
   - Fetch `tradeTypes` lookup
   - Add tradeType dropdown (optional for now, configurable later)
   - Add line items section (same pattern as Quote/Invoice)
   - Add line items validation

5. **Add phone + email validation to Vendor**
   - Change to required: `phoneError`, `emailError`
   - Update `isFormValid`: `isFormValid = !!(company.trim() || name.trim()) && !!phone.trim() && !!email.trim()`

6. **Add line items section to PO**
   - Same pattern as Quote/Invoice
   - Add line items validation

### Code Quality Improvements

7. **Standardize unsaved changes detection**
   - Implement comprehensive `isDirty` pattern in Client, Quote, Invoice
   - Compare all form fields against loaded data

8. **Extract line items section to reusable component**
   - `<LineItemsSection>` component
   - Shared by Quote, Invoice, Request, PO
   - Props: `lineItems`, `onChange`, `serviceItems`, `units`

9. **Document required fields mapping**
   - Create `web/REQUIRED-FIELDS.md`
   - Map each entity to mobile defaults
   - Note web-specific additions (Invoice.title, PO.title)

---

## File Reference

| Entity | EditPanel File |
|--------|----------------|
| Client | `D:\wip\JobMaster_Local_Dev\web\src\views\clients\ClientEditPanel.tsx` |
| Quote | `D:\wip\JobMaster_Local_Dev\web\src\views\quotes\QuoteEditPanel.tsx` |
| Request | `D:\wip\JobMaster_Local_Dev\web\src\views\requests\RequestEditPanel.tsx` |
| Job | `D:\wip\JobMaster_Local_Dev\web\src\views\jobs\JobEditPanel.tsx` |
| Invoice | `D:\wip\JobMaster_Local_Dev\web\src\views\invoices\InvoiceEditPanel.tsx` |
| PO | `D:\wip\JobMaster_Local_Dev\web\src\views\purchase-orders\PurchaseOrderEditPanel.tsx` |
| Vendor | `D:\wip\JobMaster_Local_Dev\web\src\views\vendors\VendorEditPanel.tsx` |

**Mobile Required Fields Store**: `D:\wip\JobMaster_Local_Dev\mobile\src\lib\state\required-fields-store.ts`

---

## Conclusion

All EditPanels follow the correct overall architecture (EditPanel wrapper, useState, lookups from API, UUID values). However, there are **significant gaps** in:

1. Delete functionality (3 panels missing)
2. Line item validation (4 entities not validating required line items)
3. Required field alignment with mobile app defaults

**Priority**: Fix all Critical discrepancies before considering EditPanels "complete" and consistent.
