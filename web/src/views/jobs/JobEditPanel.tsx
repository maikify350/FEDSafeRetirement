'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
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
import EditPanel from '@/components/EditPanel'
import CustomTextField from '@core/components/mui/TextField'
import SectionHeader from '@/components/SectionHeader'
import DictationButton from '@/components/DictationButton'
import NotesEditorModal from '@/components/NotesEditorModal'
import AddressSelectionDialog from '@/components/AddressSelectionDialog'
import LineItemsSection, { type LineItemEntry, emptyLineItem } from '@/components/LineItemsSection'
import { api } from '@/lib/api'
import { useRequiredFieldsValidation } from '@/hooks/useRequiredFields'
import type { Job } from '@shared/contracts'

// ── Local types ─────────────────────────────────────────────────────────────
type LookupItem = { id: string; value: string; label?: string; isDefault?: boolean; abbreviation?: string }
type TaxCode    = { id: string; code: string; name: string; rate: number }
type ClientItem = { id: string; firstName?: string; lastName?: string; company?: string; useCompanyName?: boolean; addresses?: ClientAddress[] }
type ClientAddress = { id: string; street?: string; street2?: string; city?: string; state?: string; stateId?: string; zipCode?: string; addressType?: string }
type UserItem   = { id: string; name: string }
type StatusDef  = { id: string; status: string; enabledForJob?: boolean }

function clientLabel(c: ClientItem) {
  return c.useCompanyName && c.company
    ? c.company
    : `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || '—'
}


const JOB_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
const fmtLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// ── Props ────────────────────────────────────────────────────────────────────
interface JobEditPanelProps {
  jobId: string | null   // null = new
  open: boolean
  onClose: () => void
  onSaved: () => void    // called after save → switch to detail panel
  inline?: boolean
  registerSave?: (saveFn: () => void) => void
  onStateChange?: (state: { isSaving: boolean; isValid: boolean }) => void
  initialClientId?: string | null    // Auto-select client (from Client detail "Create Job" button)
  initialQuoteId?: string | null     // Pre-populate all fields from quote (from Quote detail "Create Job" button)
  initialRequestId?: string | null   // Pre-populate all fields from request (from Request detail "Create Job" button)
  initialTaxCodeId?: string | null   // Auto-select tax code (from Client detail)
}

/**
 * Full-screen edit drawer for Job entity with pricing, line items, and assignments.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/jobs/JobEditPanel.tsx
 */
export default function JobEditPanel({
  jobId,
  open,
  onClose,
  onSaved,
  inline,
  registerSave,
  onStateChange,
  initialClientId,
  initialQuoteId,
  initialRequestId,
  initialTaxCodeId
}: JobEditPanelProps) {
  const queryClient = useQueryClient()

  // ── Fetch existing job (edit mode only) ──────────────────────────────────
  const { data: job, isLoading: isLoadingJob } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get<Job>(`/api/jobs/${jobId}`),
    enabled: !!jobId && open
  })

  // ── Fetch source quote to copy details (new job from quote only) ──────────
  const { data: sourceQuote } = useQuery({
    queryKey: ['quote', initialQuoteId],
    queryFn: () => api.get<any>(`/api/quotes/${initialQuoteId}`),
    enabled: !!initialQuoteId && !jobId && open
  })

  // ── Fetch source request to copy details (new job from request only) ──────
  const { data: sourceRequest } = useQuery({
    queryKey: ['request', initialRequestId],
    queryFn: () => api.get<any>(`/api/requests/${initialRequestId}`),
    enabled: !!initialRequestId && !jobId && open
  })

  // ── Lookup data ──────────────────────────────────────────────────────────
  const { data: clients = [] }  = useQuery<ClientItem[]>({ queryKey: ['clients-list'], queryFn: () => api.get('/api/clients') })
  const { data: users = [] }    = useQuery<UserItem[]>({ queryKey: ['users'], queryFn: () => api.get('/api/users') })
  const { data: taxCodes = [] } = useQuery<TaxCode[]>({ queryKey: ['tax-codes'], queryFn: () => api.get('/api/tax-codes?activeOnly=true') })
  const { data: usStates = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'usState'], queryFn: () => api.get('/api/lookups/usState') })
  const { data: canadianProvinces = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'canadianProvince'], queryFn: () => api.get('/api/lookups/canadianProvince') })
  const { data: mexicanStates = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'mexicanState'], queryFn: () => api.get('/api/lookups/mexicanState') })
  const { data: countries = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'country'], queryFn: () => api.get('/api/lookups/country') })
  const { data: statusDefsRaw = [] } = useQuery<{ data: StatusDef[] }>({
    queryKey: ['status-definitions'],
    queryFn: () => api.get('/api/status-definitions')
  })
  const statusDefs = (statusDefsRaw as any)?.data ?? statusDefsRaw as StatusDef[]
  const jobStatuses = (statusDefs as StatusDef[]).filter(s => s.enabledForJob !== false)

  // ── Form state ───────────────────────────────────────────────────────────
  const [title,         setTitle]         = useState('')
  const [description,   setDescription]   = useState('')
  const [statusId,      setStatusId]      = useState('')
  const [priority,      setPriority]      = useState('normal')
  const [clientId,      setClientId]      = useState('')
  const [assignedToId,  setAssignedToId]  = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [neededBy,      setNeededBy]      = useState('')
  const [completedAt,   setCompletedAt]   = useState('')
  const [taxCodeId,     setTaxCodeId]     = useState('')
  const [discountType,  setDiscountType]  = useState<'percent' | 'amount' | ''>('')
  const [discountValue, setDiscountValue] = useState('')
  const [notes,         setNotes]         = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [lineItems,     setLineItems]     = useState<LineItemEntry[]>([])

  // modal state
  const [notesModalOpen,         setNotesModalOpen]         = useState(false)
  const [internalNotesModalOpen, setInternalNotesModalOpen] = useState(false)
  const [deleteDlgOpen,          setDeleteDlgOpen]          = useState(false)
  const [deleting,               setDeleting]               = useState(false)

  // Address selection (mobile parity)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const [selectedClientForPicker, setSelectedClientForPicker] = useState<ClientItem | null>(null)
  // Property address fields (copied from quote when converting)
  const [propertyName,     setPropertyName]     = useState('')
  const [propertyStreet,   setPropertyStreet]   = useState('')
  const [propertyStreet2,  setPropertyStreet2]  = useState('')
  const [propertyCity,     setPropertyCity]     = useState('')
  const [propertyState,    setPropertyState]    = useState('')
  const [propertyZipCode,  setPropertyZipCode]  = useState('')
  const [propertyCountry,  setPropertyCountry]  = useState('')

  // ── Property Address Helpers ─────────────────────────────────────────────
  const getStateLabel = (): string => {
    const country = countries.find(c => c.id === propertyCountry)
    const v = country?.value ?? ''
    if (v === 'CA' || v === 'Canada') return 'Province'
    return 'State'
  }

  const getStatesForCountry = (): LookupItem[] => {
    const country = countries.find(c => c.id === propertyCountry)
    const v = country?.value ?? ''
    if (v === 'CA' || v === 'Canada') return canadianProvinces
    if (v === 'MX' || v === 'Mexico') return mexicanStates
    return usStates // default: US
  }

  // ── Pricing Calculations ─────────────────────────────────────────────────
  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0)
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

  // ── Dynamic Validation (driven by required-fields config) ─────────────────
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const { validate, isRequired } = useRequiredFieldsValidation('job')

  const validationResult = useMemo(() => {
    if (!submitAttempted) return { valid: true, errors: [], fieldErrors: {} }
    return validate({
      title, clientId, jobType: status, description, priority,
      assignedTo: assignedToId, scheduledDate, neededBy,
      lineItems: lineItems.filter(li => li.description.trim()),
      address: propertyStreet,
    })
  }, [submitAttempted, validate, title, clientId, status, description, priority, assignedToId, scheduledDate, neededBy, lineItems, propertyStreet])

  const titleError  = validationResult.fieldErrors['title'] || ''
  const clientError = validationResult.fieldErrors['clientId'] || ''
  const isFormValid = validationResult.valid

  // ── Populate form on open ────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      if (job && jobId) {
        setTitle(job.title || '')
        setDescription(job.description || '')
        setStatusId((job as any).statusId || '')
        setPriority((job as any).priority || 'normal')
        setClientId((job as any).clientId || '')
        setAssignedToId((job as any).assignedToId || '')
        setLocationId((job as any).locationId || null)
        setScheduledDate(job.scheduledDate?.split('T')[0] || '')
        setNeededBy((job as any).neededBy?.split('T')[0] || '')
        setCompletedAt((job as any).completedAt?.split('T')[0] || '')
        setTaxCodeId((job as any).taxCodeId || '')
        setDiscountType((job as any).discountType || '')
        setDiscountValue((job as any).discountValue != null ? String((job as any).discountValue) : '')
        setNotes(job.notes || '')
        setInternalNotes((job as any).internalNotes || '')
        setLineItems((job as any).lineItems?.map((li: any) => ({
          id: li.id, description: li.description || '', quantity: li.quantity ?? 1,
          unitPrice: li.unitPrice ?? 0, taxable: li.taxable ?? false,
          serviceItemId: li.serviceItemId ?? null, unitId: li.unitId ?? null,
        })) ?? [])
        // Property address fields
        setPropertyName((job as any).propertyName || '')
        setPropertyStreet((job as any).propertyStreet || '')
        setPropertyStreet2((job as any).propertyStreet2 || '')
        setPropertyCity((job as any).propertyCity || '')
        setPropertyState((job as any).propertyStateId || '')
        setPropertyZipCode((job as any).propertyZipCode || '')
      } else if (!jobId) {
        // New job - reset to defaults
        setTitle('')
        setDescription('')
        setStatusId('')
        setPriority('normal')
        setClientId('')
        setAssignedToId('')
        setScheduledDate('')
        setNeededBy('')
        setCompletedAt('')
        setTaxCodeId('')
        setDiscountType('')
        setDiscountValue('')
        setNotes('')
        setInternalNotes('')
        setLineItems([])
        setPropertyName('')
        setPropertyStreet('')
        setPropertyStreet2('')
        setPropertyCity('')
        setPropertyState('')
        setPropertyZipCode('')
        setPropertyCountry('')
      }
      setSubmitAttempted(false)
    }
  }, [open, job, jobId])

  // Auto-select client when coming from Client detail "Create Job" button
  // Guard: only set after clients list is loaded to avoid MUI out-of-range loop
  useEffect(() => {
    if (!jobId && open && initialClientId && clients.length > 0 && !clientId) {
      setClientId(initialClientId)
    }
  }, [initialClientId, jobId, open, clientId, clients])

  // Auto-set tax code when coming from Client detail
  // Guard: only set after taxCodes list is loaded to avoid MUI out-of-range loop
  useEffect(() => {
    if (!jobId && open && initialTaxCodeId && taxCodes.length > 0 && !taxCodeId) {
      setTaxCodeId(initialTaxCodeId)
    }
  }, [initialTaxCodeId, jobId, open, taxCodeId, taxCodes])

  // Pre-populate all fields from source quote (Create Job from Quote)
  useEffect(() => {
    if (!jobId && open && sourceQuote) {
      setTitle(sourceQuote.title || '')
      setDescription(sourceQuote.description || '')
      setClientId(sourceQuote.clientId || '')
      setAssignedToId(sourceQuote.assignedToId || '')
      setTaxCodeId(sourceQuote.taxCodeId || '')
      setDiscountType(sourceQuote.discountType || '')
      setDiscountValue(sourceQuote.discountValue != null ? String(sourceQuote.discountValue) : '')
      setNotes(sourceQuote.notes || '')
      // Copy property address from quote (no address picker needed)
      setPropertyName(sourceQuote.propertyName || '')
      setPropertyStreet(sourceQuote.propertyStreet || '')
      setPropertyStreet2(sourceQuote.propertyStreet2 || '')
      setPropertyCity(sourceQuote.propertyCity || '')
      setPropertyZipCode(sourceQuote.propertyZipCode || '')
      setPropertyState(sourceQuote.propertyStateId || '')

      // Copy line items (strip IDs so they're created fresh)
      if (sourceQuote.lineItems?.length > 0) {
        setLineItems(sourceQuote.lineItems.map((li: any) => ({
          description: li.description,
          quantity: li.quantity ?? 1,
          unitPrice: li.unitPrice ?? 0,
          taxable: li.taxable ?? false,
          serviceItemId: li.serviceItemId ?? null,
          unitId: li.unitId ?? null,
        })))
      }
    }
  }, [sourceQuote, jobId, open])

  // Pre-populate all fields from source request (Create Job from Request)
  useEffect(() => {
    if (!jobId && open && sourceRequest) {
      setTitle(sourceRequest.title || '')
      setClientId(sourceRequest.clientId || '')
      setAssignedToId(sourceRequest.assignedToId || '')
      setTaxCodeId(sourceRequest.taxCodeId || '')
      setDescription(sourceRequest.description || '')
      setNotes(sourceRequest.customerMessage || '')
      // Copy address (request uses street/city/zipCode, job uses propertyStreet/propertyCity/propertyZipCode)
      setPropertyName(sourceRequest.propertyName || '')
      setPropertyStreet(sourceRequest.street || '')
      setPropertyStreet2(sourceRequest.street2 || '')
      setPropertyCity(sourceRequest.city || '')
      setPropertyZipCode(sourceRequest.zipCode || '')

      // Use stateId (UUID) directly from the request
      setPropertyState(sourceRequest.stateId || '')
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
  }, [sourceRequest, jobId, open])

  // Show address picker when client changes (create mode only, mobile parity)
  // Skip when converting from a quote or request — address is already copied
  useEffect(() => {
    if (!jobId && open && clientId && clients.length > 0 && !initialQuoteId && !initialRequestId) {
      const client = clients.find(c => c.id === clientId)
      if (client && client.addresses && client.addresses.length > 0) {
        setSelectedClientForPicker(client)
        setAddressPickerOpen(true)
      }
    }
  }, [clientId, clients, jobId, open])

  // Initialize default country (US) when form opens
  useEffect(() => {
    if (!jobId && open && !propertyCountry && countries.length > 0) {
      const defaultCountry = countries.find(c => c.value === 'US' || c.value === 'United States')
      if (defaultCountry) {
        setPropertyCountry(defaultCountry.id)
      }
    }
  }, [jobId, open, propertyCountry, countries])

  const handleAddressSelected = (addressId: string | null, addressData: ClientAddress | null) => {
    if (addressData) {
      setLocationId(addressId)
      setPropertyStreet(addressData.street || '')
      setPropertyStreet2(addressData.street2 || '')
      setPropertyCity(addressData.city || '')
      setPropertyZipCode(addressData.zipCode || '')

      // Map state abbreviation to state lookup ID
      const stateAbbr = addressData.state || ''
      const stateList = getStatesForCountry()
      const matchedState = stateList.find(s => s.value === stateAbbr || s.abbreviation === stateAbbr || s.label === stateAbbr)
      setPropertyState(matchedState?.id || '')
    } else {
      setLocationId(null)
    }
  }

  // ── Save mutation ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      jobId
        ? api.patch(`/api/jobs/${jobId}`, data)
        : api.post('/api/jobs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      if (jobId) queryClient.invalidateQueries({ queryKey: ['job', jobId] })
      onSaved()
    }
  })

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      onClose()
    }
  })

  const handleSave = () => {
    setSubmitAttempted(true)
    if (!isFormValid) return

    saveMutation.mutate({
      title:           title.trim(),
      description:     description.trim() || undefined,
      statusId:        statusId || undefined,
      priority:        priority || 'normal',
      clientId:        clientId || undefined,
      assignedToId:    assignedToId || undefined,
      // locationId:   locationId || undefined, // TODO: Uncomment after running migration
      scheduledDate:   scheduledDate || undefined,
      neededBy:        neededBy || undefined,
      completedAt:     completedAt || undefined,
      taxCodeId:       taxCodeId || undefined,
      taxRate:         taxRate || undefined,
      discountType:    discountType || undefined,
      discountValue:   discountValue ? Number(discountValue) : undefined,
      notes:           notes.trim() || undefined,
      internalNotes:   internalNotes.trim() || undefined,
      propertyName:    propertyName.trim() || undefined,
      propertyStreet:  propertyStreet.trim() || undefined,
      propertyStreet2: propertyStreet2.trim() || undefined,
      propertyCity:    propertyCity.trim() || undefined,
      propertyStateId: propertyState.trim() || undefined,
      propertyZipCode: propertyZipCode.trim() || undefined,
      lineItems:     lineItems.filter(li => li.description.trim()).map(li => ({
        id:            li.id,
        description:   li.description.trim(),
        quantity:      li.quantity,
        unitPrice:     li.unitPrice,
        taxable:       li.taxable,
        serviceItemId: li.serviceItemId || null,
        unitId:        li.unitId || null,
      })),
    })
  }

  const handleDelete = async () => {
    setDeleting(true)
    await deleteMutation.mutateAsync()
    setDeleting(false)
    setDeleteDlgOpen(false)
  }

  const isNew     = !jobId
  const isLoading = isLoadingJob && !!jobId

  const isDirty = !!(
    title || description || statusId || priority !== 'normal' ||
    clientId || assignedToId || scheduledDate || neededBy || completedAt ||
    taxCodeId || notes || internalNotes
  )

  useEffect(() => {
    if (registerSave) registerSave(handleSave)
  }, [registerSave, title, description, statusId, priority, clientId, assignedToId, scheduledDate, neededBy, completedAt, taxCodeId, discountType, discountValue, notes, internalNotes, lineItems, propertyName, propertyStreet, propertyStreet2, propertyCity, propertyState, propertyZipCode])

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
            <Alert severity='error'>Failed to save job. Please try again.</Alert>
          </Box>
        )}

        {!isLoading && (
          <Box sx={{ flex: 1, overflowY: 'auto', px: inline ? 3 : '4px', py: inline ? 2 : '2px', '& .MuiFormControl-root': { mt: '2px', mb: 0 } }}>

            {/* ── Job Details ── */}
            <SectionHeader>Job Details</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <CustomTextField
                  fullWidth
                  label='Title' required={isRequired('title')}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder='e.g., Kitchen renovation'
                  error={!!titleError}
                />
                <CustomTextField
                  fullWidth
                  multiline
                  minRows={3}
                  label='Description'
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder='Describe the job…'
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <DictationButton
                          size='small'
                          onTranscript={text => setDescription(prev => prev ? `${prev} ${text}` : text)}
                        />
                      </InputAdornment>
                    )
                  }}
                />
                <Box sx={{ display: 'flex', gap: '2px' }}>
                  <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                    <CustomTextField
                      select fullWidth
                      label='Status'
                      value={statusId}
                      onChange={e => setStatusId(e.target.value)}
                    >
                      {jobStatuses.length > 0
                        ? jobStatuses.map(s => (
                            <MenuItem key={s.id} value={s.id}>{s.status}</MenuItem>
                          ))
                        : ['Scheduled', 'In Progress', 'On Hold', 'Completed'].map(s => (
                            <MenuItem key={s} value={s.toLowerCase().replace(/ /g, '_')}>{s}</MenuItem>
                          ))
                      }
                    </CustomTextField>
                  </Box>
                  <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0 }}>
                    <CustomTextField
                      select fullWidth
                      label='Priority'
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                    >
                      {JOB_PRIORITIES.map(p => (
                        <MenuItem key={p} value={p}>{fmtLabel(p)}</MenuItem>
                      ))}
                    </CustomTextField>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* ── Client ── */}
            <SectionHeader>Client</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <CustomTextField
                select fullWidth
                label='Client' required={isRequired('clientId')}
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                error={!!clientError}
              >
                <MenuItem value=''>— None —</MenuItem>
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>{clientLabel(c)}</MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {/* ── Site Address ────────────────────────────────────── */}
            <SectionHeader>Site Address</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <CustomTextField fullWidth label='Property Name' value={propertyName} onChange={e => setPropertyName(e.target.value)} placeholder='e.g. Main Office' />
                <CustomTextField fullWidth label='Street Address' value={propertyStreet} onChange={e => setPropertyStreet(e.target.value)} placeholder='123 Main St' />
                <CustomTextField fullWidth label='Street 2' value={propertyStreet2} onChange={e => setPropertyStreet2(e.target.value)} placeholder='Suite, Apt, Unit...' />
                <Box sx={{ display: 'flex', gap: '2px' }}>
                  <Box sx={{ flex: 2 }}>
                    <CustomTextField fullWidth label='City' value={propertyCity} onChange={e => setPropertyCity(e.target.value)} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    {(() => {
                      const stateList = getStatesForCountry()
                      return (
                        <CustomTextField select fullWidth label={getStateLabel()} value={propertyState} onChange={e => setPropertyState(e.target.value)}>
                          <MenuItem value=''>—</MenuItem>
                          {stateList.map(s => (
                            <MenuItem key={s.id} value={s.id}>{s.abbreviation || s.value || s.label}</MenuItem>
                          ))}
                        </CustomTextField>
                      )
                    })()}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <CustomTextField fullWidth label='Zip' value={propertyZipCode} onChange={e => setPropertyZipCode(e.target.value)} />
                  </Box>
                </Box>
                <CustomTextField
                  select
                  fullWidth
                  label='Country'
                  value={propertyCountry}
                  onChange={e => {
                    setPropertyCountry(e.target.value)
                    setPropertyState('') // Clear state when country changes
                  }}
                >
                  {countries.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.label || c.value}</MenuItem>
                  ))}
                </CustomTextField>
              </Box>
            </Box>

            {/* ── Assignment, Scheduling & Financial ── */}
            <SectionHeader>Assignment &amp; Scheduling</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* Row 1: Assigned To | Tax Code */}
                <Box sx={{ display: 'flex', gap: '2px' }}>
                  <Box sx={{ flex: 1 }}>
                    <CustomTextField
                      select fullWidth
                      label='Assigned To'
                      value={assignedToId}
                      onChange={e => setAssignedToId(e.target.value)}
                    >
                      <MenuItem value=''>— Unassigned —</MenuItem>
                      {users.map(u => (
                        <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                      ))}
                    </CustomTextField>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <CustomTextField
                      select fullWidth
                      label='Tax Code'
                      value={taxCodeId}
                      onChange={e => setTaxCodeId(e.target.value)}
                    >
                      <MenuItem value=''>— None —</MenuItem>
                      {taxCodes.map(tc => (
                        <MenuItem key={tc.id} value={tc.id}>
                          {tc.code} – {tc.name} ({tc.rate}%)
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  </Box>
                </Box>
                {/* Row 2: Scheduled Date | Needed By | Completed At */}
                <Box sx={{ display: 'flex', gap: '2px', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <CustomTextField
                      fullWidth type='date'
                      label='Scheduled Date'
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <CustomTextField
                      fullWidth type='date'
                      label='Needed By'
                      value={neededBy}
                      onChange={e => setNeededBy(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <CustomTextField
                      fullWidth type='date'
                      label='Completed At'
                      value={completedAt}
                      onChange={e => setCompletedAt(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* ── Line Items ── */}
            <LineItemsSection lineItems={lineItems} onChange={setLineItems} />

            {/* ── Discount ── */}
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

            {/* ── Totals Breakdown ── */}
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
              </>
            )}

            {/* ── Notes (Technician-Visible) ── */}
            <SectionHeader action={
              <IconButton size='small' onClick={() => setNotesModalOpen(true)} sx={{ color: 'text.secondary', p: 0.5 }}>
                <i className='tabler-pencil text-base' />
              </IconButton>
            }>Notes (Technician-Visible)</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <CustomTextField
                fullWidth multiline minRows={3}
                label='Notes'
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder='Notes visible to technicians…'
                helperText='These notes are visible to technicians.'
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <DictationButton
                        size='small'
                        onTranscript={text => setNotes(prev => prev ? `${prev} ${text}` : text)}
                      />
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* ── Internal Notes (Admin Only) ── */}
            <SectionHeader action={
              <IconButton size='small' onClick={() => setInternalNotesModalOpen(true)} sx={{ color: 'warning.main', p: 0.5 }}>
                <i className='tabler-pencil text-base' />
              </IconButton>
            }>Internal Notes (Admin Only)</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'warning.lighter' }}>
              <CustomTextField
                fullWidth multiline minRows={3}
                label='Internal Notes'
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder='Internal notes (not visible to technicians)…'
                helperText='Admin-only — not visible to technicians.'
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <DictationButton
                        size='small'
                        onTranscript={text => setInternalNotes(prev => prev ? `${prev} ${text}` : text)}
                      />
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* ── Audit footer (edit mode only) ── */}
            {!inline && !isNew && job && (
              <Box sx={{ px: '2px', py: 2 }}>
                
              </Box>
            )}

            {/* ── Delete (edit mode only) ── */}
            {!inline && !isNew && (
              <Box sx={{ px: '2px', py: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant='tonal' color='error'
                  startIcon={<i className='tabler-trash' />}
                  onClick={() => setDeleteDlgOpen(true)}
                  disabled={saveMutation.isPending || deleting}>
                  Delete Job
                </Button>
              </Box>
            )}
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
          title={isNew ? 'New Job' : `Edit Job${job?.jobNumber ? ` — ${job.jobNumber}` : ''}`}
          isSaving={saveMutation.isPending}
          saveDisabled={submitAttempted && !isFormValid}
          hasUnsavedChanges={isDirty}
        >
          {formContent}
        </EditPanel>
      )}

      {/* Notes modals */}
      <NotesEditorModal
        open={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        title='Notes (Technician-Visible)'
        value={notes}
        onChange={setNotes}
      />
      <NotesEditorModal
        open={internalNotesModalOpen}
        onClose={() => setInternalNotesModalOpen(false)}
        title='Internal Notes (Admin Only)'
        value={internalNotes}
        onChange={setInternalNotes}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDlgOpen} onClose={() => setDeleteDlgOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-alert-triangle text-error text-2xl' />
          Delete Job?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>&ldquo;{job?.title}&rdquo;</strong>?
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
