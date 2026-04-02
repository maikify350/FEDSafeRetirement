'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Tooltip from '@mui/material/Tooltip'
import EditPanel from '@/components/EditPanel'
import CustomTextField from '@core/components/mui/TextField'
import SectionHeader from '@/components/SectionHeader'
import DictationButton from '@/components/DictationButton'
import NotesEditorModal from '@/components/NotesEditorModal'
import AddressSelectionDialog from '@/components/AddressSelectionDialog'
import LineItemsSection, { type LineItemEntry } from '@/components/LineItemsSection'
import { api } from '@/lib/api'
import { useRequiredFieldsValidation } from '@/hooks/useRequiredFields'
import type { Quote, QuoteLineItem } from '@shared/contracts'

type LookupItem = { id: string; value: string; label?: string; isDefault?: boolean }
type TaxCode = { id: string; code: string; name: string; rate: number }
type ClientItem = { id: string; firstName?: string; lastName?: string; company?: string; useCompanyName?: boolean; addresses?: ClientAddress[] }
type ClientAddress = { id: string; street?: string; street2?: string; city?: string; state?: string; stateId?: string; zipCode?: string; addressType?: string }
type UserItem = { id: string; name: string }
type StatusDef = { id: string; status: string; enabledForQuote?: boolean }


function clientLabel(c: ClientItem) {
  return c.useCompanyName && c.company ? c.company : `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || '—'
}


interface QuoteEditPanelProps {
  quoteId: string | null
  open: boolean
  onClose: () => void
  onSaved: () => void
  inline?: boolean
  registerSave?: (saveFn: () => void) => void
  onStateChange?: (state: { isSaving: boolean; isValid: boolean }) => void
  initialClientId?: string | null  // Auto-select client (from Client detail "Create Quote" button)
  initialRequestId?: string | null // Pre-populate line items from request
  initialTaxCodeId?: string | null // Auto-select tax code (from Client detail)
}

/**
 * Full-screen edit drawer for Quote entity with pricing and line items.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/quotes/QuoteEditPanel.tsx
 */
export default function QuoteEditPanel({ quoteId, open, onClose, onSaved, inline, registerSave, onStateChange, initialClientId, initialRequestId, initialTaxCodeId }: QuoteEditPanelProps) {
  const queryClient = useQueryClient()

  // Fetch quote data (if editing)
  const { data: quote, isLoading: isLoadingQuote } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => api.get<Quote>(`/api/quotes/${quoteId}`),
    enabled: !!quoteId && open
  })

  // Fetch source request (to copy line items on create)
  const { data: sourceRequest } = useQuery({
    queryKey: ['request', initialRequestId],
    queryFn: () => api.get<any>(`/api/requests/${initialRequestId}`),
    enabled: !!initialRequestId && !quoteId && open
  })

  // Fetch lookups
  const { data: clients = [] } = useQuery<ClientItem[]>({ queryKey: ['clients-list'], queryFn: () => api.get('/api/clients') })
  const { data: taxCodes = [] } = useQuery<TaxCode[]>({ queryKey: ['tax-codes'], queryFn: () => api.get('/api/tax-codes?activeOnly=true') })
  const { data: paymentTerms = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'paymentTerms'], queryFn: () => api.get('/api/lookups/paymentTerms') })
  const { data: jobTypes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'jobType'], queryFn: () => api.get('/api/lookups/jobType') })
  const { data: users = [] } = useQuery<UserItem[]>({ queryKey: ['users-list'], queryFn: () => api.get('/api/users') })
  const { data: states = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'usState'], queryFn: () => api.get('/api/lookups/usState') })
  const { data: statusDefsRaw = [] } = useQuery<{ data: StatusDef[] }>({
    queryKey: ['status-definitions'],
    queryFn: () => api.get('/api/status-definitions')
  })
  const statusDefs = (statusDefsRaw as any)?.data ?? statusDefsRaw as StatusDef[]
  const quoteStatuses = (statusDefs as StatusDef[]).filter(s => s.enabledForQuote !== false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [statusId, setStatusId] = useState<string>('')
  const [clientId, setClientId] = useState('')
  const [jobTypeId, setJobTypeId] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [taxCodeId, setTaxCodeId] = useState('')
  const [paymentTermsId, setPaymentTermsId] = useState('')
  const [assignedToId, setAssignedToId] = useState('')

  // Property/Location
  const [propertyName, setPropertyName] = useState('')
  const [propertyStreet, setPropertyStreet] = useState('')
  const [propertyStreet2, setPropertyStreet2] = useState('')
  const [propertyCity, setPropertyCity] = useState('')
  const [propertyStateId, setPropertyStateId] = useState('')
  const [propertyZipCode, setPropertyZipCode] = useState('')

  // Pricing
  const [discountType, setDiscountType] = useState<'percent' | 'amount' | ''>('')
  const [discountValue, setDiscountValue] = useState<string>('')

  // Line items
  const [lineItems, setLineItems] = useState<LineItemEntry[]>([])

  // Notes & terms
  const [notes, setNotes] = useState('')
  const [customerMessage, setCustomerMessage] = useState('')
  const [termsConditions, setTermsConditions] = useState('')
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [customerMessageModalOpen, setCustomerMessageModalOpen] = useState(false)
  const [termsModalOpen, setTermsModalOpen] = useState(false)

  // Address selection (mobile parity)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const [selectedClientForPicker, setSelectedClientForPicker] = useState<ClientItem | null>(null)

  // Dynamic Validation (driven by required-fields config)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const { validate, isRequired } = useRequiredFieldsValidation('quote')

  const validationResult = useMemo(() => {
    if (!submitAttempted) return { valid: true, errors: [], fieldErrors: {} }
    return validate({
      title, clientId, jobType: jobTypeId, description,
      assignedTo: assignedToId, validUntil: expiryDate,
      lineItems: lineItems.filter(li => li.description.trim()),
      address: propertyStreet,
    })
  }, [submitAttempted, validate, title, clientId, jobTypeId, description, assignedToId, expiryDate, lineItems, propertyStreet])

  const titleError  = validationResult.fieldErrors['title'] || ''
  const clientError = validationResult.fieldErrors['clientId'] || ''
  const isFormValid = validationResult.valid

  // Populate form when quote loads or reset for new
  useEffect(() => {
    if (quote) {
      setTitle(quote.title || '')
      setDescription(quote.description || '')
      setStatusId((quote as any).statusId || '')
      setClientId((quote as any).clientId || '')
      setJobTypeId((quote as any).jobTypeId || '')
      setIssueDate(quote.issueDate?.split('T')[0] || '')
      setExpiryDate(quote.expiryDate?.split('T')[0] || '')
      setTaxCodeId((quote as any).taxCodeId || '')
      setPaymentTermsId((quote as any).paymentTermsId || '')
      setAssignedToId((quote as any).assignedToId || '')
      setLocationId((quote as any).locationId || null)
      setPropertyName(quote.propertyName || '')
      setPropertyStreet(quote.propertyStreet || '')
      setPropertyStreet2(quote.propertyStreet2 || '')
      setPropertyCity(quote.propertyCity || '')
      setPropertyStateId((quote as any).propertyStateId || '')
      setPropertyZipCode(quote.propertyZipCode || '')
      setDiscountType((quote.discountType as any) || '')
      setDiscountValue(quote.discountValue != null ? String(quote.discountValue) : '')
      setNotes(quote.notes || '')
      setCustomerMessage(quote.customerMessage || '')
      setTermsConditions(quote.termsConditions || '')
      if (quote.lineItems && quote.lineItems.length > 0) {
        setLineItems(quote.lineItems.map((li: QuoteLineItem) => ({
          id: li.id,
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxable: li.taxable,
          serviceItemId: li.serviceItemId || null,
          unitId: li.unitId || null,
        })))
      } else {
        setLineItems([])
      }
    } else if (!quoteId && open) {
      // Reset for new quote
      setTitle('')
      setDescription('')
      setStatusId('')
      setClientId('')
      setJobTypeId('')
      setIssueDate(new Date().toISOString().split('T')[0])
      setExpiryDate('')
      setTaxCodeId('')
      setPaymentTermsId('')
      setAssignedToId('')
      setPropertyName('')
      setPropertyStreet('')
      setPropertyStreet2('')
      setPropertyCity('')
      setPropertyStateId('')
      setPropertyZipCode('')
      setDiscountType('')
      setDiscountValue('')
      setNotes('')
      setCustomerMessage('')
      setTermsConditions('')
      setLineItems([])
    }
    setSubmitAttempted(false)
  }, [quote, quoteId, open])

  // Set default payment terms once lookup data loads (separate from reset to avoid re-triggering)
  useEffect(() => {
    if (!quoteId && open && !quote && paymentTerms.length > 0) {
      setPaymentTermsId(prev => {
        if (prev) return prev
        const def = paymentTerms.find(p => p.isDefault)
        return def ? def.id : prev
      })
    }
  }, [paymentTerms, quoteId, open, quote])

  // Auto-select client when coming from Client detail "Create Quote" button
  // Guard: only set after clients list is loaded to avoid MUI out-of-range loop
  useEffect(() => {
    if (!quoteId && open && initialClientId && clients.length > 0 && !clientId) {
      setClientId(initialClientId)
    }
  }, [initialClientId, quoteId, open, clientId, clients])

  // Auto-set tax code when coming from Client detail
  // Guard: only set after taxCodes list is loaded to avoid MUI out-of-range loop
  useEffect(() => {
    if (!quoteId && open && initialTaxCodeId && taxCodes.length > 0 && !taxCodeId) {
      setTaxCodeId(initialTaxCodeId)
    }
  }, [initialTaxCodeId, quoteId, open, taxCodeId, taxCodes])

  // Pre-populate all fields from source request
  useEffect(() => {
    if (!quoteId && open && sourceRequest) {
      if (sourceRequest.clientId) setClientId(sourceRequest.clientId)
      if (sourceRequest.title) setTitle(sourceRequest.title)
      if (sourceRequest.description != null) setDescription(sourceRequest.description)
      if (sourceRequest.taxCodeId) setTaxCodeId(sourceRequest.taxCodeId)
      if (sourceRequest.assignedToId) setAssignedToId(sourceRequest.assignedToId)
      if (sourceRequest.customerMessage) setCustomerMessage(sourceRequest.customerMessage)
      // Copy address (request uses street/city/zipCode, quote uses propertyStreet/propertyCity/propertyZipCode)
      if (sourceRequest.propertyName) setPropertyName(sourceRequest.propertyName)
      if (sourceRequest.street) setPropertyStreet(sourceRequest.street)
      if (sourceRequest.street2) setPropertyStreet2(sourceRequest.street2)
      if (sourceRequest.city) setPropertyCity(sourceRequest.city)
      if (sourceRequest.stateId) {
        setPropertyStateId(sourceRequest.stateId)
      } else if (sourceRequest.state && states.length > 0) {
        const match = states.find(s => s.value.toLowerCase() === sourceRequest.state.toLowerCase() || (s.label && s.label.toLowerCase() === sourceRequest.state.toLowerCase()))
        if (match) setPropertyStateId(match.id)
      }
      if (sourceRequest.zipCode) setPropertyZipCode(sourceRequest.zipCode)
      // Copy line items (strip IDs so they're created fresh)
      if (sourceRequest.lineItems?.length > 0) {
        setLineItems(sourceRequest.lineItems.map((li: any) => ({
          description: li.description,
          quantity: li.quantity ?? 1,
          unitPrice: li.unitPrice ?? 0,
          taxable: li.taxable ?? false,
          serviceItemId: li.serviceItemId ?? null,
          unitId: li.unitId ?? null,
        })))
      }
    }
  }, [sourceRequest, quoteId, open])

  // Show address picker when client changes (create mode only, mobile parity)
  // Skip when converting from a request — address is already copied from the request
  useEffect(() => {
    if (!quoteId && open && clientId && clients.length > 0 && !initialRequestId) {
      const client = clients.find(c => c.id === clientId)
      if (client && client.addresses && client.addresses.length > 0) {
        setSelectedClientForPicker(client)
        setAddressPickerOpen(true)
      }
    }
  }, [clientId, clients, quoteId, open])

  const handleAddressSelected = (addressId: string | null, addressData: ClientAddress | null) => {
    if (addressData) {
      setLocationId(addressId)
      setPropertyStreet(addressData.street || '')
      setPropertyStreet2(addressData.street2 || '')
      setPropertyCity(addressData.city || '')
      if (addressData.stateId) {
        setPropertyStateId(addressData.stateId)
      } else if (addressData.state && states.length > 0) {
        const match = states.find(s => s.value.toLowerCase() === addressData.state!.toLowerCase() || (s.label && s.label.toLowerCase() === addressData.state!.toLowerCase()))
        if (match) setPropertyStateId(match.id)
        else setPropertyStateId('')
      } else {
        setPropertyStateId('')
      }
      setPropertyZipCode(addressData.zipCode || '')
    } else {
      setLocationId(null)
    }
  }

  // Computed totals (following mobile pattern)
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
  const discount = discountType === 'percent'
    ? subtotal * ((Number(discountValue) || 0) / 100)
    : discountType === 'amount'
      ? Number(discountValue) || 0
      : 0
  const afterDiscount = subtotal - discount
  const selectedTaxCode = taxCodes.find(tc => tc.id === taxCodeId)
  const taxRate = selectedTaxCode?.rate || 0
  const tax = afterDiscount * (taxRate / 100)
  const total = afterDiscount + tax

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      quoteId
        ? api.patch(`/api/quotes/${quoteId}`, data)
        : api.post('/api/quotes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      if (quoteId) queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onSaved()
    }
  })

  const handleSave = () => {
    setSubmitAttempted(true)
    if (!isFormValid) return

    const validLineItems = lineItems.filter(li => li.description.trim())

    saveMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      statusId: statusId || undefined,
      clientId,
      jobTypeId: jobTypeId || undefined,
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      taxCodeId: taxCodeId || undefined,
      paymentTermsId: paymentTermsId || undefined,
      assignedToId: assignedToId || undefined,
      // locationId: locationId || undefined, // TODO: Uncomment after running migration
      propertyName: propertyName.trim() || undefined,
      propertyStreet: propertyStreet.trim() || undefined,
      propertyStreet2: propertyStreet2.trim() || undefined,
      propertyCity: propertyCity.trim() || undefined,
      propertyStateId: propertyStateId || undefined,
      propertyZipCode: propertyZipCode.trim() || undefined,
      discountType: discountType || undefined,
      discountValue: discountValue ? Number(discountValue) : undefined,
      notes: notes.trim() || undefined,
      customerMessage: customerMessage.trim() || undefined,
      termsConditions: termsConditions.trim() || undefined,
      lineItems: validLineItems.map(li => ({
        id: li.id,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxable: li.taxable,
        serviceItemId: li.serviceItemId || null,
        unitId: li.unitId || null,
      })),
    })
  }

  const isLoading = isLoadingQuote && !!quoteId

  useEffect(() => {
    if (registerSave) registerSave(handleSave)
  }, [registerSave, title, description, status, clientId, jobTypeId, issueDate, expiryDate, taxCodeId, paymentTermsId, assignedToId, propertyName, propertyStreet, propertyStreet2, propertyCity, propertyStateId, propertyZipCode, discountType, discountValue, notes, customerMessage, termsConditions, lineItems])

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
        <Box className='px-6 pt-4'>
          <Alert severity='error'>Failed to save quote. Please try again.</Alert>
        </Box>
      )}

      {!isLoading && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: inline ? 3 : '4px', py: inline ? 2 : '2px', '& .MuiFormControl-root': { mt: '2px', mb: 0 } }}>

          {/* ── Quote Details ─────────────────────────────────────────── */}
          <SectionHeader>Quote Details</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

              {/* Title */}
              <CustomTextField
                fullWidth
                label='Title' required={isRequired('title')}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='e.g. Kitchen Renovation, HVAC Service...'
                error={!!titleError}
                helperText={titleError}
              />

              {/* Client */}
              <CustomTextField
                select
                fullWidth
                label='Client' required={isRequired('clientId')}
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                error={!!clientError}
                helperText={clientError}
              >
                <MenuItem value=''>— Select Client —</MenuItem>
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>{clientLabel(c)}</MenuItem>
                ))}
              </CustomTextField>

              {/* Status | Job Type */}
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0, overflow: 'hidden' }}>
                  <CustomTextField select fullWidth label='Status' value={statusId} onChange={e => setStatusId(e.target.value)}>
                    {quoteStatuses.length > 0
                      ? quoteStatuses.map(s => <MenuItem key={s.id} value={s.id}>{s.status}</MenuItem>)
                      : ['Draft', 'Sent', 'Accepted', 'Declined', 'Expired'].map(s => (
                          <MenuItem key={s} value={s.toLowerCase()}>{s}</MenuItem>
                        ))
                    }
                  </CustomTextField>
                </Box>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0, overflow: 'hidden' }}>
                  <CustomTextField select fullWidth label='Job Type' value={jobTypeId} onChange={e => setJobTypeId(e.target.value)}>
                    <MenuItem value=''>None</MenuItem>
                    {jobTypes.map(jt => <MenuItem key={jt.id} value={jt.id}>{jt.value}</MenuItem>)}
                  </CustomTextField>
                </Box>
              </Box>

              {/* Issue Date | Expiry Date */}
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: 1 }}>
                  <CustomTextField
                    fullWidth type='date' label='Issue Date'
                    value={issueDate} onChange={e => setIssueDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <CustomTextField
                    fullWidth type='date' label='Expiry Date'
                    value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Box>

              {/* Tax Code | Payment Terms */}
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0, overflow: 'hidden' }}>
                  <CustomTextField select fullWidth label='Tax Code' value={taxCodeId} onChange={e => setTaxCodeId(e.target.value)}>
                    <MenuItem value=''>None</MenuItem>
                    {taxCodes.map(tc => <MenuItem key={tc.id} value={tc.id}>{tc.code} – {tc.name} ({tc.rate}%)</MenuItem>)}
                  </CustomTextField>
                </Box>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0, overflow: 'hidden' }}>
                  <CustomTextField select fullWidth label='Payment Terms' value={paymentTermsId} onChange={e => setPaymentTermsId(e.target.value)}>
                    <MenuItem value=''>None</MenuItem>
                    {paymentTerms.map(p => <MenuItem key={p.id} value={p.id}>{p.label || p.value}</MenuItem>)}
                  </CustomTextField>
                </Box>
              </Box>

              {/* Assigned To */}
              <CustomTextField select fullWidth label='Assigned To' value={assignedToId} onChange={e => setAssignedToId(e.target.value)}>
                <MenuItem value=''>Unassigned</MenuItem>
                {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
              </CustomTextField>
            </Box>
          </Box>

          {/* ── Description ───────────────────────────────────────────── */}
          <SectionHeader>Description</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <CustomTextField
              fullWidth multiline minRows={3}
              label='Description'
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder='Describe the scope of work...'
            />
          </Box>

          {/* ── Job Location ──────────────────────────────────────────── */}
          <SectionHeader>Job Location (Optional)</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <CustomTextField fullWidth label='Property Name' value={propertyName} onChange={e => setPropertyName(e.target.value)} placeholder='e.g. Main Office, Rental Unit 3B' />
              <CustomTextField fullWidth label='Street Address' value={propertyStreet} onChange={e => setPropertyStreet(e.target.value)} placeholder='123 Main St' />
              <CustomTextField fullWidth label='Street 2' value={propertyStreet2} onChange={e => setPropertyStreet2(e.target.value)} placeholder='Suite, Apt, Unit...' />
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: 2 }}>
                  <CustomTextField fullWidth label='City' value={propertyCity} onChange={e => setPropertyCity(e.target.value)} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <CustomTextField select fullWidth label='State' value={propertyStateId} onChange={e => setPropertyStateId(e.target.value)}>
                    <MenuItem value=''>—</MenuItem>
                    {states.map(s => <MenuItem key={s.id} value={s.id}>{s.value}</MenuItem>)}
                  </CustomTextField>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <CustomTextField fullWidth label='Zip' value={propertyZipCode} onChange={e => setPropertyZipCode(e.target.value)} />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* ── Line Items ────────────────────────────────────────────── */}
          <LineItemsSection lineItems={lineItems} onChange={setLineItems} />

          {/* ── Discount ──────────────────────────────────────────────── */}
          <SectionHeader>Discount (Optional)</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', gap: '2px' }}>
              <Box sx={{ flex: '0 0 calc(40% - 1px)', minWidth: 0 }}>
                <CustomTextField select fullWidth label='Discount Type' value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                  <MenuItem value=''>None</MenuItem>
                  <MenuItem value='percent'>Percent (%)</MenuItem>
                  <MenuItem value='amount'>Fixed Amount ($)</MenuItem>
                </CustomTextField>
              </Box>
              {discountType && (
                <Box sx={{ flex: 1 }}>
                  <CustomTextField
                    fullWidth label={discountType === 'percent' ? 'Discount %' : 'Discount Amount'}
                    type='number' inputProps={{ min: 0, step: 0.01 }}
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    InputProps={discountType === 'amount' ? { startAdornment: <InputAdornment position='start'>$</InputAdornment> } : undefined}
                  />
                </Box>
              )}
            </Box>
          </Box>

          {/* ── Totals Breakdown ──────────────────────────────────────── */}
          <SectionHeader>Totals</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>
              {/* Subtotal */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant='body2' color='text.secondary'>Subtotal</Typography>
                <Typography variant='body1' fontWeight={500}>
                  ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Box>

              {/* Discount (only if > 0) */}
              {discount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant='body2' color='text.secondary'>Discount</Typography>
                  <Typography variant='body1' fontWeight={500} color='success.main'>
                    -${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          {/* ── Customer Message ──────────────────────────────────────── */}
          <SectionHeader action={
            <IconButton size='small' onClick={() => setCustomerMessageModalOpen(true)} sx={{ color: 'text.secondary', p: 0.5 }}>
              <i className='tabler-pencil text-base' />
            </IconButton>
          }>Customer Message</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <CustomTextField
              fullWidth multiline minRows={2}
              label='Message to Customer'
              value={customerMessage}
              onChange={e => setCustomerMessage(e.target.value)}
              placeholder='Thank you for your business...'
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                    <DictationButton size='small' onTranscript={text => setCustomerMessage(prev => prev ? `${prev} ${text}` : text)} />
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {/* ── Terms & Conditions ────────────────────────────────────── */}
          <SectionHeader action={
            <IconButton size='small' onClick={() => setTermsModalOpen(true)} sx={{ color: 'text.secondary', p: 0.5 }}>
              <i className='tabler-pencil text-base' />
            </IconButton>
          }>Terms &amp; Conditions</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <CustomTextField
              fullWidth multiline minRows={3}
              label='Terms & Conditions'
              value={termsConditions}
              onChange={e => setTermsConditions(e.target.value)}
              placeholder='Payment due within 30 days of invoice date...'
            />
          </Box>

          {/* ── Internal Notes ────────────────────────────────────────── */}
          <SectionHeader action={
            <IconButton size='small' onClick={() => setNotesModalOpen(true)} sx={{ color: 'warning.main', p: 0.5 }}>
              <i className='tabler-pencil text-base' />
            </IconButton>
          }>Internal Notes (Admin Only)</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'warning.lighter' }}>
            <CustomTextField
              fullWidth multiline minRows={3}
              label='Internal Notes'
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Private notes — not visible to the customer...'
              helperText='These notes are not shown to the customer.'
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                    <DictationButton size='small' onTranscript={text => setNotes(prev => prev ? `${prev} ${text}` : text)} />
                  </InputAdornment>
                )
              }}
            />
          </Box>


          {/* Audit Footer */}
          
        </Box>
      )}
    </Box>
  )

  return (
    <>
      {inline ? (
        formContent
      ) : (
        <EditPanel
          open={open}
          onClose={onClose}
          onSave={handleSave}
          title={quoteId ? `Edit Quote${quote ? ` — ${quote.quoteNumber}` : ''}` : 'New Quote'}
          isSaving={saveMutation.isPending}
          saveDisabled={submitAttempted && !isFormValid}
          hasUnsavedChanges={title.trim() !== ''}
        >
          {formContent}
        </EditPanel>
      )}
      
      {/* Notes modals */}
      <NotesEditorModal
        open={customerMessageModalOpen}
        onClose={() => setCustomerMessageModalOpen(false)}
        title='Customer Message'
        value={customerMessage}
        onChange={setCustomerMessage}
        placeholder='Message that will be visible to the customer...'
      />
      <NotesEditorModal
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        title='Terms & Conditions'
        value={termsConditions}
        onChange={setTermsConditions}
        placeholder='Payment terms, warranty, cancellation policy...'
      />
      <NotesEditorModal
        open={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        title='Internal Notes (Admin Only)'
        value={notes}
        onChange={setNotes}
        placeholder='Private admin notes — not visible to the customer...'
      />

      {/* Address selection dialog (mobile parity) */}
      <AddressSelectionDialog
        open={addressPickerOpen}
        onClose={() => setAddressPickerOpen(false)}
        addresses={selectedClientForPicker?.addresses || []}
        onSelect={handleAddressSelected}
      />
    </>
  )
}
