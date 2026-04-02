'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import EditPanel from '@/components/EditPanel'
import CustomTextField from '@core/components/mui/TextField'
import SectionHeader from '@/components/SectionHeader'
import DictationButton from '@/components/DictationButton'
import NotesEditorModal from '@/components/NotesEditorModal'
import { api } from '@/lib/api'
import { useRequiredFieldsValidation } from '@/hooks/useRequiredFields'
import type { PurchaseOrder } from '@shared/contracts'
import LineItemsSection, { type LineItemEntry, emptyLineItem } from '@/components/LineItemsSection'
import AddressSelectionDialog from '@/components/AddressSelectionDialog'

// ── Local types ─────────────────────────────────────────────────────────────
type VendorItem = { id: string; company?: string; name?: string }
type JobItem = { id: string; jobNumber?: string; title?: string }
type CompanyAddress = { id: string; street?: string; street2?: string; city?: string; state?: string; stateId?: string; zipCode?: string; addressType?: string }
type UserItem = { id: string; name: string }
type StatusDef = { id: string; status: string; enabledForPurchaseOrder?: boolean }

function vendorLabel(v: VendorItem) {
  return v.company || v.name || '—'
}

function jobLabel(j: JobItem) {
  return j.jobNumber ? `${j.jobNumber} - ${j.title || ''}` : j.title || '—'
}



// ── Props ────────────────────────────────────────────────────────────────────
interface PurchaseOrderEditPanelProps {
  poId: string | null   // null = new
  open: boolean
  onClose: () => void
  onSaved: () => void   // called after save → switch to detail panel
  inline?: boolean
  registerSave?: (saveFn: () => void) => void
  onStateChange?: (state: { isSaving: boolean; isValid: boolean }) => void
  initialVendorId?: string | null
  initialTaxCodeId?: string | null
}

/**
 * Full-screen edit drawer for Purchase Order entity with vendor, line items, and shipping.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/purchase-orders/PurchaseOrderEditPanel.tsx
 */
export default function PurchaseOrderEditPanel({
  poId,
  open,
  onClose,
  onSaved,
  inline,
  registerSave,
  onStateChange,
  initialVendorId,
  initialTaxCodeId,
}: PurchaseOrderEditPanelProps) {
  const queryClient = useQueryClient()

  // ── Fetch existing PO (edit mode only) ──────────────────────────────────
  const { data: po, isLoading: isLoadingPO } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => api.get<PurchaseOrder>(`/api/purchase-orders/${poId}`),
    enabled: !!poId && open
  })

  // ── Lookup data ──────────────────────────────────────────────────────────
  const { data: vendors = [] } = useQuery<VendorItem[]>({
    queryKey: ['vendors-list'],
    queryFn: () => api.get('/api/vendors')
  })
  const { data: jobs = [] } = useQuery<JobItem[]>({
    queryKey: ['jobs-list'],
    queryFn: () => api.get('/api/jobs')
  })
  const { data: company } = useQuery<{ addresses?: CompanyAddress[] }>({
    queryKey: ['company'],
    queryFn: () => api.get('/api/company')
  })
  const companyAddresses = company?.addresses ?? []
  const { data: taxCodes = [] } = useQuery<{ id: string; code: string; name: string; rate: number }[]>({
    queryKey: ['tax-codes'],
    queryFn: () => api.get('/api/tax-codes')
  })
  const { data: users = [] } = useQuery<UserItem[]>({
    queryKey: ['users-list'],
    queryFn: () => api.get('/api/users')
  })
  const { data: statusDefsRaw = [] } = useQuery<{ data: StatusDef[] }>({
    queryKey: ['status-definitions'],
    queryFn: () => api.get('/api/status-definitions')
  })
  const statusDefs = (statusDefsRaw as any)?.data ?? statusDefsRaw as StatusDef[]
  const poStatuses = (statusDefs as StatusDef[]).filter(s => s.enabledForPurchaseOrder !== false)

  // ── Form state ───────────────────────────────────────────────────────────
  const [title,                  setTitle]                  = useState('')
  const [vendorId,               setVendorId]               = useState('')
  const [statusId,               setStatusId]               = useState('')
  const [issueDate,              setIssueDate]              = useState('')
  const [dueDate,                setDueDate]                = useState('')
  const [expectedDeliveryDate,   setExpectedDeliveryDate]   = useState('')
  const [issuePerson,            setIssuePerson]            = useState('')
  const [vendorReferenceNumber,  setVendorReferenceNumber]  = useState('')
  const [trackingNumber,         setTrackingNumber]         = useState('')
  const [freight,                setFreight]                = useState('')
  const [discount,               setDiscount]               = useState('')
  const [taxCodeId,              setTaxCodeId]              = useState('')
  const [notes,                  setNotes]                  = useState('')
  const [vendorMessage,          setVendorMessage]          = useState('')
  const [jobId,                  setJobId]                  = useState('')
  const [lineItems,              setLineItems]              = useState<LineItemEntry[]>([])

  // Ship-to address
  const [shipToAddressId,       setShipToAddressId]        = useState<string>('')  // '' = blank, 'id' = company address
  const [propertyName,          setPropertyName]           = useState('')
  const [propertyStreet,        setPropertyStreet]         = useState('')
  const [propertyStreet2,       setPropertyStreet2]        = useState('')
  const [propertyCity,          setPropertyCity]           = useState('')
  const [propertyStateId,       setPropertyStateId]        = useState('')
  const [propertyZipCode,       setPropertyZipCode]        = useState('')

  // modal state
  const [notesModalOpen,         setNotesModalOpen]         = useState(false)
  const [vendorMessageModalOpen, setVendorMessageModalOpen] = useState(false)
  const [deleteDlgOpen,          setDeleteDlgOpen]          = useState(false)
  const [deleting,               setDeleting]               = useState(false)
  const [addressPickerOpen,      setAddressPickerOpen]      = useState(false)

  // ── Pricing Calculations ─────────────────────────────────────────────────
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
  const freightAmount = Number(freight) || 0
  const discountAmount = Number(discount) || 0
  const selectedTaxCode = taxCodes.find(tc => tc.id === taxCodeId)
  const taxRate = selectedTaxCode?.rate || 0
  const beforeTax = subtotal + freightAmount - discountAmount
  const tax = beforeTax * (taxRate / 100)
  const total = beforeTax + tax

  // ── Dynamic Validation (driven by required-fields config) ─────────────────
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const { validate, isRequired } = useRequiredFieldsValidation('purchaseOrder')

  const validationResult = useMemo(() => {
    if (!submitAttempted) return { valid: true, errors: [], fieldErrors: {} }
    return validate({
      vendorId, title, dueDate, description: notes, notes,
      lineItems: lineItems.filter(li => li.description.trim()),
    })
  }, [submitAttempted, validate, vendorId, title, dueDate, notes, lineItems])

  const vendorError = validationResult.fieldErrors['vendorId'] || ''
  const isFormValid = validationResult.valid

  // ── Populate form on open ────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      if (po && poId) {
        setTitle(po.title || '')
        setVendorId((po as any).vendorId || '')
        setStatusId((po as any).statusId || '')
        setIssueDate(po.issueDate?.split('T')[0] || '')
        setDueDate(po.dueDate?.split('T')[0] || '')
        setExpectedDeliveryDate((po as any).expectedDeliveryDate?.split('T')[0] || '')
        setIssuePerson(po.issuePerson || '')
        setVendorReferenceNumber(po.vendorReferenceNumber || '')
        setTrackingNumber(po.trackingNumber || '')
        setFreight(po.freight != null ? String(po.freight) : '')
        setDiscount(po.discount != null ? String(po.discount) : '')
        setTaxCodeId(po.taxCodeId || '')
        setNotes(po.notes || '')
        setVendorMessage(po.vendorMessage || '')
        setJobId((po as any).jobId || '')
        setLineItems((po as any).lineItems?.map((li: any) => ({
          id: li.id, description: li.description || '', quantity: li.quantity ?? 1,
          unitPrice: li.unitPrice ?? 0, taxable: li.taxable ?? false,
          serviceItemId: li.serviceItemId ?? null, unitId: li.unitId ?? null,
        })) ?? [])
        setShipToAddressId('')
        setPropertyName((po as any).propertyName || '')
        setPropertyStreet((po as any).propertyStreet || '')
        setPropertyStreet2((po as any).propertyStreet2 || '')
        setPropertyCity((po as any).propertyCity || '')
        setPropertyStateId((po as any).propertyStateId || '')
        setPropertyZipCode((po as any).propertyZipCode || '')
      } else if (!poId) {
        // New PO - reset to defaults
        setTitle('')
        setVendorId('')
        setStatusId('')
        setIssueDate('')
        setDueDate('')
        setExpectedDeliveryDate('')
        setIssuePerson('')
        setVendorReferenceNumber('')
        setTrackingNumber('')
        setFreight('')
        setDiscount('')
        setTaxCodeId('')
        setNotes('')
        setVendorMessage('')
        setJobId('')
        setLineItems([])
        setShipToAddressId('')
        setPropertyName('')
        setPropertyStreet('')
        setPropertyStreet2('')
        setPropertyCity('')
        setPropertyStateId('')
        setPropertyZipCode('')
      }
      setSubmitAttempted(false)
    }
  }, [open, po, poId])

  // Auto-select vendor when coming from Vendor detail "Create PO" button
  useEffect(() => {
    if (!poId && open && initialVendorId && !vendorId) {
      setVendorId(initialVendorId)
    }
  }, [initialVendorId, poId, open, vendorId])

  // Auto-set tax code when coming from Vendor detail
  useEffect(() => {
    if (!poId && open && initialTaxCodeId && !taxCodeId) {
      setTaxCodeId(initialTaxCodeId)
    }
  }, [initialTaxCodeId, poId, open, taxCodeId])

  // When a company address is selected from the dropdown, populate the fields
  const handleShipToAddressChange = (addressId: string) => {
    setShipToAddressId(addressId)
    if (!addressId) {
      setPropertyName('')
      setPropertyStreet('')
      setPropertyStreet2('')
      setPropertyCity('')
      setPropertyStateId('')
      setPropertyZipCode('')
      return
    }
    const addr = companyAddresses.find(a => a.id === addressId)
    if (addr) {
      setPropertyName(addr.addressType || '')
      setPropertyStreet(addr.street || '')
      setPropertyStreet2(addr.street2 || '')
      setPropertyCity(addr.city || '')
      setPropertyStateId(addr.stateId || '')
      setPropertyZipCode(addr.zipCode || '')
    }
  }

  // Called by address picker dialog when user selects a company address
  const handleAddressPickerSelect = (addressId: string | null, addressData: CompanyAddress | null) => {
    if (addressId && addressData) {
      handleShipToAddressChange(addressId)
    }
    // else: blank — leave fields empty
  }

  // ── Save mutation ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      poId
        ? api.patch(`/api/purchase-orders/${poId}`, data)
        : api.post('/api/purchase-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      if (poId) queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
      onSaved()
    }
  })

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/purchase-orders/${poId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      onClose()
    }
  })

  const handleSave = () => {
    setSubmitAttempted(true)
    if (!isFormValid) return

    saveMutation.mutate({
      title:                  title.trim(),
      vendorId:               vendorId || undefined,
      statusId:               statusId || undefined,
      issueDate:              issueDate || undefined,
      dueDate:                dueDate || undefined,
      expectedDeliveryDate:   expectedDeliveryDate || undefined,
      issuePerson:            issuePerson.trim() || undefined,
      vendorReferenceNumber:  vendorReferenceNumber.trim() || undefined,
      trackingNumber:         trackingNumber.trim() || undefined,
      freight:                freight ? parseFloat(freight) : undefined,
      discount:               discount ? parseFloat(discount) : undefined,
      taxCodeId:              taxCodeId || undefined,
      taxRate:                taxRate || undefined,
      notes:                  notes.trim() || undefined,
      vendorMessage:          vendorMessage.trim() || undefined,
      jobId:                  jobId || undefined,
      propertyName:           propertyName.trim() || undefined,
      propertyStreet:         propertyStreet.trim() || undefined,
      propertyStreet2:        propertyStreet2.trim() || undefined,
      propertyCity:           propertyCity.trim() || undefined,
      propertyStateId:        propertyStateId || undefined,
      propertyZipCode:        propertyZipCode.trim() || undefined,
      lineItems:              lineItems.filter(li => li.description.trim()),
    })
  }

  const handleDelete = async () => {
    setDeleting(true)
    await deleteMutation.mutateAsync()
    setDeleting(false)
    setDeleteDlgOpen(false)
  }

  const isNew     = !poId
  const isLoading = isLoadingPO && !!poId

  const isDirty = !!(
    title || vendorId || status !== 'Draft' || issueDate || dueDate ||
    expectedDeliveryDate || issuePerson || vendorReferenceNumber ||
    trackingNumber || freight || discount || notes || vendorMessage || jobId
  )

  useEffect(() => {
    if (registerSave) registerSave(handleSave)
  }, [registerSave, title, vendorId, status, issueDate, dueDate, expectedDeliveryDate, issuePerson, vendorReferenceNumber, trackingNumber, freight, discount, notes, vendorMessage, jobId, propertyName, propertyStreet, propertyStreet2, propertyCity, propertyStateId, propertyZipCode, lineItems])

  useEffect(() => {
    if (onStateChange) onStateChange({ isSaving: saveMutation.isPending, isValid: isFormValid })
  }, [onStateChange, saveMutation.isPending, isFormValid])

  const formContent = (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {isLoading && (
        <Box className='flex justify-center items-center p-12'>
          <CircularProgress />
        </Box>
      )}

      {saveMutation.isError && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity='error'>Failed to save purchase order. Please try again.</Alert>
        </Box>
      )}

      {!isLoading && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: inline ? 3 : '4px', py: inline ? 2 : '2px', '& .MuiFormControl-root': { mt: '2px', mb: 0 } }}>

            {/* ── PO Details ── */}
            <SectionHeader>Purchase Order Details</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                  <CustomTextField
                    fullWidth
                    label='Title'
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder='e.g., Office supplies order'
                  />
                  <CustomTextField
                    select
                    label='Status'
                    value={statusId}
                    onChange={e => setStatusId(e.target.value)}
                    sx={{ minWidth: 140 }}
                  >
                    {poStatuses.length > 0
                      ? poStatuses.map(s => (
                          <MenuItem key={s.id} value={s.id}>{s.status}</MenuItem>
                        ))
                      : ['Draft', 'Sent', 'Partial', 'Received', 'Closed', 'Void'].map(s => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))
                    }
                  </CustomTextField>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                  <CustomTextField
                    select fullWidth
                    label='Vendor' required={isRequired('vendorId')}
                    value={vendorId}
                    onChange={e => {
                      setVendorId(e.target.value)
                      // In create mode: show company address picker after vendor selection
                      if (!poId && e.target.value && companyAddresses.length > 0) {
                        setAddressPickerOpen(true)
                      }
                    }}
                    error={!!vendorError}
                    helperText={vendorError}
                  >
                    <MenuItem value=''>— Select Vendor —</MenuItem>
                    {vendors.map(v => (
                      <MenuItem key={v.id} value={v.id}>{vendorLabel(v)}</MenuItem>
                    ))}
                  </CustomTextField>
                  <CustomTextField
                    select fullWidth
                    label='Related Job'
                    value={jobId}
                    onChange={e => setJobId(e.target.value)}
                  >
                    <MenuItem value=''>— None —</MenuItem>
                    {jobs.map(j => (
                      <MenuItem key={j.id} value={j.id}>{jobLabel(j)}</MenuItem>
                    ))}
                  </CustomTextField>
                </Box>
              </Box>
            </Box>

            {/* ── Dates ── */}
            <SectionHeader>Dates</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Issue Date'
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Due Date'
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Expected Delivery Date'
                  value={expectedDeliveryDate}
                  onChange={e => setExpectedDeliveryDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>

            {/* ── Issue & Tracking Details ── */}
            <SectionHeader>Issue &amp; Tracking Details</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                  <CustomTextField
                    select fullWidth
                    label='Issued By'
                    value={issuePerson}
                    onChange={e => setIssuePerson(e.target.value)}
                  >
                    <MenuItem value=''>— Select —</MenuItem>
                    {users.map(u => (
                      <MenuItem key={u.id} value={u.name}>{u.name}</MenuItem>
                    ))}
                  </CustomTextField>
                  <CustomTextField
                    fullWidth
                    label='Vendor Reference #'
                    value={vendorReferenceNumber}
                    onChange={e => setVendorReferenceNumber(e.target.value)}
                    placeholder='Vendor ref #'
                  />
                  <CustomTextField
                    fullWidth
                    label='Tracking #'
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder='Shipment tracking #'
                  />
                  <CustomTextField
                    fullWidth
                    label='Freight'
                    value={freight}
                    onChange={e => setFreight(e.target.value)}
                    placeholder='0.00'
                    type='number'
                    inputProps={{ step: '0.01', min: '0' }}
                    InputProps={{ startAdornment: <InputAdornment position='start'>$</InputAdornment> }}
                  />
                  <CustomTextField
                    fullWidth
                    label='Discount'
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    placeholder='0.00'
                    type='number'
                    inputProps={{ step: '0.01', min: '0' }}
                    InputProps={{ startAdornment: <InputAdornment position='start'>$</InputAdornment> }}
                  />
                  <CustomTextField
                    select fullWidth
                    label='Tax Code'
                    value={taxCodeId}
                    onChange={e => setTaxCodeId(e.target.value)}
                  >
                    <MenuItem value=''>— None —</MenuItem>
                    {taxCodes.map(tc => (
                      <MenuItem key={tc.id} value={tc.id}>{tc.code} – {tc.name} ({tc.rate}%)</MenuItem>
                    ))}
                  </CustomTextField>
                </Box>
              </Box>
            </Box>

            {/* ── Ship To Address ── */}
            <SectionHeader>Ship To Address</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <CustomTextField
                  select fullWidth
                  label='Select Company Address'
                  value={shipToAddressId}
                  onChange={e => handleShipToAddressChange(e.target.value)}
                >
                  <MenuItem value=''>— Blank (enter manually) —</MenuItem>
                  {companyAddresses.map(addr => (
                    <MenuItem key={addr.id} value={addr.id}>
                      {[addr.addressType, addr.street, addr.city, addr.state].filter(Boolean).join(' · ')}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <Box sx={{ display: 'flex', gap: '4px' }}>
                  <CustomTextField fullWidth label='Location Name' value={propertyName} onChange={e => setPropertyName(e.target.value)} placeholder='e.g., Main Office' />
                </Box>
                <CustomTextField fullWidth label='Street Address' value={propertyStreet} onChange={e => setPropertyStreet(e.target.value)} placeholder='123 Main St' />
                <Box sx={{ display: 'flex', gap: '4px' }}>
                  <CustomTextField fullWidth label='Suite / Unit' value={propertyStreet2} onChange={e => setPropertyStreet2(e.target.value)} />
                  <CustomTextField fullWidth label='City' value={propertyCity} onChange={e => setPropertyCity(e.target.value)} />
                  <CustomTextField fullWidth label='Zip' value={propertyZipCode} onChange={e => setPropertyZipCode(e.target.value)} sx={{ maxWidth: 110 }} />
                </Box>
              </Box>
            </Box>

            {/* ── Line Items ── */}
            <LineItemsSection lineItems={lineItems} onChange={setLineItems} />

            {/* ── Totals Breakdown ──────────────────────────────────── */}
            {lineItems.length > 0 && (
              <>
                <SectionHeader>Totals</SectionHeader>
                <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default', minWidth: '360px' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: '2px' }}>
                    {/* Subtotal */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant='body2' color='text.secondary'>Subtotal</Typography>
                      <Typography variant='body1' fontWeight={500}>
                        ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {/* Freight (only if > 0) */}
                    {freightAmount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>Freight</Typography>
                        <Typography variant='body1' fontWeight={500} color='warning.main'>
                          +${freightAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    )}

                    {/* Discount (only if > 0) */}
                    {discountAmount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>Discount</Typography>
                        <Typography variant='body1' fontWeight={500} color='success.main'>
                          -${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                    )}

                    {/* Tax */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant='body2' color='text.secondary'>
                        Tax {taxRate > 0 && `(${taxRate}%)`}
                      </Typography>
                      <Typography variant='body1' fontWeight={500}>
                        ${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {/* Total */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, mt: 1, borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant='body1' fontWeight={700}>Total</Typography>
                      <Typography variant='h6' fontWeight={700} color='primary'>
                        ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </>
            )}

            {/* ── Vendor Message + Notes (drawer only — right panel handles inline) ── */}
            {!inline && (
              <>
                <SectionHeader action={
                  <IconButton size='small' onClick={() => setVendorMessageModalOpen(true)} sx={{ color: 'text.secondary', p: 0.5 }}>
                    <i className='tabler-pencil text-base' />
                  </IconButton>
                }>Vendor Message</SectionHeader>
                <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
                  <CustomTextField
                    fullWidth multiline minRows={3}
                    label='Vendor Message'
                    value={vendorMessage}
                    onChange={e => setVendorMessage(e.target.value)}
                    placeholder='Message to vendor (shown on PO email/PDF)…'
                    helperText='This message will be included in the PO sent to the vendor.'
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                          <DictationButton size='small' onTranscript={text => setVendorMessage(prev => prev ? `${prev} ${text}` : text)} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>

                <SectionHeader action={
                  <IconButton size='small' onClick={() => setNotesModalOpen(true)} sx={{ color: 'warning.main', p: 0.5 }}>
                    <i className='tabler-pencil text-base' />
                  </IconButton>
                }>Internal Notes</SectionHeader>
                <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'warning.lighter' }}>
                  <CustomTextField
                    fullWidth multiline minRows={3}
                    label='Internal Notes'
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder='Internal notes (not visible to vendor)…'
                    helperText='Internal notes — not visible to vendor.'
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                          <DictationButton size='small' onTranscript={text => setNotes(prev => prev ? `${prev} ${text}` : text)} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>
              </>
            )}

            {/* ── Delete (edit mode only) ── */}
            {!isNew && (
              <Box sx={{ px: '2px', py: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant='tonal' color='error'
                  startIcon={<i className='tabler-trash' />}
                  onClick={() => setDeleteDlgOpen(true)}
                  disabled={saveMutation.isPending || deleting}>
                  Delete Purchase Order
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
  )

  const rightPanel = (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', minHeight: 0 }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 4, gap: 4, minHeight: 0, overflow: 'hidden' }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <SectionHeader action={
            <IconButton size='small' onClick={() => setVendorMessageModalOpen(true)} sx={{ color: 'text.secondary', p: 0.5 }}>
              <i className='tabler-pencil text-base' />
            </IconButton>
          }>Vendor Message</SectionHeader>
          <Box sx={{ flex: 1, p: 2, bgcolor: 'background.default', borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
            <CustomTextField
              fullWidth multiline
              label='Vendor Message'
              value={vendorMessage}
              onChange={e => setVendorMessage(e.target.value)}
              placeholder='Message to vendor (shown on PO email/PDF)…'
              helperText='This message will be included in the PO sent to the vendor.'
              sx={{ flex: 1, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' } }}
              InputProps={{
                sx: { height: '100%' },
                endAdornment: (
                  <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                    <DictationButton size='small' onTranscript={text => setVendorMessage(prev => prev ? `${prev} ${text}` : text)} />
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <SectionHeader action={
            <IconButton size='small' onClick={() => setNotesModalOpen(true)} sx={{ color: 'warning.main', p: 0.5 }}>
              <i className='tabler-pencil text-base' />
            </IconButton>
          }>Internal Notes</SectionHeader>
          <Box sx={{ flex: 1, p: 2, bgcolor: 'warning.lighter', borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
            <CustomTextField
              fullWidth multiline
              label='Internal Notes'
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Internal notes (not visible to vendor)…'
              helperText='Internal notes — not visible to vendor.'
              sx={{ flex: 1, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' } }}
              InputProps={{
                sx: { height: '100%' },
                endAdornment: (
                  <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                    <DictationButton size='small' onTranscript={text => setNotes(prev => prev ? `${prev} ${text}` : text)} />
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )

  return (
    <>
      {inline ? (
        <PanelGroup direction="horizontal" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Panel defaultSize={70} minSize={40} style={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {formContent}
            </Box>
          </Panel>
          <PanelResizeHandle style={{ width: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize' }}>
            <div className="h-8 w-0.5 bg-gray-400 rounded-full" />
          </PanelResizeHandle>
          <Panel defaultSize={30} minSize={20} style={{ display: 'flex', flexDirection: 'column' }}>
            {rightPanel}
          </Panel>
        </PanelGroup>
      ) : (
        <EditPanel
          open={open}
          onClose={onClose}
          onSave={handleSave}
          title={isNew ? 'New Purchase Order' : `Edit Purchase Order${po?.purchaseOrderNumber ? ` — ${po.purchaseOrderNumber}` : ''}`}
          isSaving={saveMutation.isPending}
          saveDisabled={submitAttempted && !isFormValid}
          hasUnsavedChanges={isDirty}
        >
          {formContent}
        </EditPanel>
      )}

      {/* Company address picker dialog (auto-opens after vendor selection in create mode) */}
      <AddressSelectionDialog
        open={addressPickerOpen}
        onClose={() => setAddressPickerOpen(false)}
        addresses={companyAddresses}
        onSelect={handleAddressPickerSelect}
      />

      {/* Notes modals */}
      <NotesEditorModal
        open={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        title='Internal Notes'
        value={notes}
        onChange={setNotes}
      />
      <NotesEditorModal
        open={vendorMessageModalOpen}
        onClose={() => setVendorMessageModalOpen(false)}
        title='Vendor Message'
        value={vendorMessage}
        onChange={setVendorMessage}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDlgOpen} onClose={() => setDeleteDlgOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-alert-triangle text-error text-2xl' />
          Delete Purchase Order?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>&ldquo;{po?.title}&rdquo;</strong>?
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
    </>
  )
}
