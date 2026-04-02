'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
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
import AddressAutocomplete from '@/components/AddressAutocomplete'
import AddressSelectionDialog from '@/components/AddressSelectionDialog'
import LineItemsSection, { type LineItemEntry, emptyLineItem } from '@/components/LineItemsSection'
import { api } from '@/lib/api'
import { useRequiredFieldsValidation } from '@/hooks/useRequiredFields'
import type { Request } from '@shared/contracts'

// ── Local types ─────────────────────────────────────────────────────────────
type LookupItem   = { id: string; value: string; label?: string; isDefault?: boolean; isActive?: boolean }
type ClientItem   = { id: string; firstName?: string; lastName?: string; company?: string; useCompanyName?: boolean; addresses?: ClientAddress[] }
type ClientAddress = { id: string; street?: string; street2?: string; city?: string; state?: string; stateId?: string; zipCode?: string; addressType?: string }
type UserItem     = { id: string; name: string }
type StatusDef    = { id: string; status: string; enabledForRequest?: boolean }
type TaxCode      = { id: string; code: string; name: string; rate: number }

function clientLabel(c: ClientItem) {
  return c.useCompanyName && c.company
    ? c.company
    : `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.company || '—'
}

// ── Props ────────────────────────────────────────────────────────────────────
interface RequestEditPanelProps {
  requestId: string | null   // null = new
  open: boolean
  onClose: () => void
  onSaved: () => void        // called after save → switch to detail panel
  inline?: boolean
  registerSave?: (saveFn: () => void) => void
  onStateChange?: (state: { isSaving: boolean; isValid: boolean }) => void
  initialClientId?: string | null  // Auto-select client (from Client detail "Create Request" button)
  initialTaxCodeId?: string | null // Auto-select tax code (from Client detail)
}

/**
 * Full-screen edit drawer for Request entity with client lookup and service items.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/requests/RequestEditPanel.tsx
 */
export default function RequestEditPanel({
  requestId,
  open,
  onClose,
  onSaved,
  inline,
  registerSave,
  onStateChange,
  initialClientId,
  initialTaxCodeId
}: RequestEditPanelProps) {
  const queryClient = useQueryClient()

  // ── Fetch existing request (edit mode only) ──────────────────────────────
  const { data: request, isLoading: isLoadingRequest } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.get<Request>(`/api/requests/${requestId}`),
    enabled: !!requestId && open
  })

  // ── Lookup data ──────────────────────────────────────────────────────────
  const { data: clients = [] }     = useQuery<ClientItem[]>({ queryKey: ['clients-list'], queryFn: () => api.get('/api/clients') })
  const { data: users = [] }       = useQuery<UserItem[]>({ queryKey: ['users'], queryFn: () => api.get('/api/users') })
  const { data: statusDefsRaw = [] } = useQuery<{ data: StatusDef[] }>({
    queryKey: ['status-definitions'],
    queryFn: () => api.get('/api/status-definitions')
  })
  const { data: states = [] }      = useQuery<LookupItem[]>({ queryKey: ['lookups', 'usState'], queryFn: () => api.get('/api/lookups/usState') })
  const { data: taxCodes = [] }    = useQuery<TaxCode[]>({ queryKey: ['tax-codes'], queryFn: () => api.get('/api/tax-codes?activeOnly=true') })
  const { data: leadSources = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'leadSource'], queryFn: () => api.get('/api/lookups/leadSource') })
  const { data: priorities = [] }  = useQuery<LookupItem[]>({ queryKey: ['lookups', 'priority'], queryFn: () => api.get('/api/lookups/priority') })
  const { data: jobTypes = [] }    = useQuery<LookupItem[]>({ queryKey: ['lookups', 'jobType'], queryFn: () => api.get('/api/lookups/jobType') })
  const { data: contactMethods = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'contactMethod'], queryFn: () => api.get('/api/lookups/contactMethod') })

  const statusDefs = (statusDefsRaw as any)?.data ?? statusDefsRaw as StatusDef[]
  const requestStatuses = (statusDefs as StatusDef[]).filter(s => s.enabledForRequest !== false)

  // ── Form state ───────────────────────────────────────────────────────────
  const [title,           setTitle]           = useState('')
  const [description,     setDescription]     = useState('')
  const [clientId,        setClientId]        = useState('')
  const [locationId,      setLocationId]      = useState<string | null>(null)
  const [statusId,        setStatusId]        = useState('')
  const [assessmentDate,  setAssessmentDate]  = useState('')
  const [assignedToId,    setAssignedToId]    = useState('')
  const [propertyName,    setPropertyName]    = useState('')
  const [street,          setStreet]          = useState('')
  const [street2,         setStreet2]         = useState('')
  const [city,            setCity]            = useState('')
  const [stateId,         setStateId]         = useState('')
  const [zipCode,         setZipCode]         = useState('')
  const [internalNotes,   setInternalNotes]   = useState('')
  const [customerMessage, setCustomerMessage] = useState('')
  const [taxCodeId,       setTaxCodeId]       = useState('')
  const [lineItems,       setLineItems]       = useState<LineItemEntry[]>([])
  const [leadSourceId,    setLeadSourceId]    = useState('')
  const [priorityId,      setPriorityId]      = useState('')
  const [jobTypeId,       setJobTypeId]       = useState('')
  const [requestDate,     setRequestDate]     = useState('')
  const [contactMethodId, setContactMethodId] = useState('')
  const [preferredContactTime,   setPreferredContactTime]   = useState('')
  const [tags,            setTags]            = useState('')

  // modal state
  const [descriptionModalOpen,     setDescriptionModalOpen]     = useState(false)
  const [internalNotesModalOpen,   setInternalNotesModalOpen]   = useState(false)
  const [customerMessageModalOpen, setCustomerMessageModalOpen] = useState(false)
  const [deleteDlgOpen,            setDeleteDlgOpen]            = useState(false)
  const [deleting,                 setDeleting]                 = useState(false)
  const [addressPickerOpen,        setAddressPickerOpen]        = useState(false)
  const [selectedClientForPicker,  setSelectedClientForPicker]  = useState<ClientItem | null>(null)

  const handlePlaceSelected = (place: { street: string; street2: string; city: string; state: string; zipCode: string; country: string }) => {
    setStreet(place.street || '')
    setCity(place.city || '')
    setZipCode(place.zipCode || '')

    if (place.state) {
      const match = states.find(s =>
        s.value.toLowerCase() === place.state.toLowerCase() ||
        (s.label && s.label.toLowerCase() === place.state.toLowerCase())
      )
      if (match) setStateId(match.id)
    }
  }

  const handleAddressSelected = (addressId: string | null, addressData: ClientAddress | null) => {
    if (addressData) {
      setLocationId(addressId)
      setStreet(addressData.street || '')
      setStreet2(addressData.street2 || '')
      setCity(addressData.city || '')
      setStateId(addressData.stateId || '')
      setZipCode(addressData.zipCode || '')
    } else {
      // Blank option selected - clear locationId but keep existing address fields
      setLocationId(null)
    }
  }

  // ── Dynamic Validation (driven by required-fields config) ─────────────────
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const { validate, isRequired } = useRequiredFieldsValidation('request')

  const validationResult = useMemo(() => {
    if (!submitAttempted) return { valid: true, errors: [], fieldErrors: {} }
    return validate({
      title, clientId,
      lineItems: lineItems.filter(li => li.description.trim()),
      address: street,
    })
  }, [submitAttempted, validate, title, clientId, lineItems, street])

  const titleError  = validationResult.fieldErrors['title'] || ''
  const clientError = validationResult.fieldErrors['clientId'] || ''
  const isFormValid = validationResult.valid

  // ── Populate form on open ────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      if (request && requestId) {
        setTitle(request.title || '')
        setDescription(request.description || '')
        setClientId((request as any).clientId || '')
        setLocationId((request as any).locationId || null)
        setStatusId((request as any).statusId || '')
        setAssessmentDate(request.assessmentDate?.split('T')[0] || '')
        setAssignedToId((request as any).assignedToId || '')
        setPropertyName((request as any).propertyName || '')
        setStreet((request as any).street || '')
        setStreet2((request as any).street2 || '')
        setCity((request as any).city || '')
        setStateId((request as any).stateId || '')
        setZipCode((request as any).zipCode || '')
        setInternalNotes(request.internalNotes || '')
        setCustomerMessage(request.customerMessage || '')
        setLineItems((request as any).lineItems?.map((li: any) => ({
          id: li.id, description: li.description || '', quantity: li.quantity ?? 1,
          unitPrice: li.unitPrice ?? 0, taxable: li.taxable ?? false,
          serviceItemId: li.serviceItemId ?? null, unitId: li.unitId ?? null,
        })) ?? [])
        setTaxCodeId((request as any).taxCodeId || '')
        setLeadSourceId((request as any).leadSourceId || '')
        setPriorityId((request as any).priorityId || '')
        setJobTypeId((request as any).jobTypeId || '')
        setRequestDate((request as any).requestDate?.split('T')[0] || '')
        setContactMethodId((request as any).contactMethodId || '')
        setPreferredContactTime((request as any).preferredContactTime || '')
        setTags((request as any).tags || '')
      } else if (!requestId) {
        // New — set default "New" status once statuses load
        const newStatus = (statusDefs as StatusDef[]).find(s => s.status === 'New' && s.enabledForRequest !== false)
        if (newStatus) setStatusId(newStatus.id)
      }
      setSubmitAttempted(false)
    }
  }, [open, request, requestId]) // deliberately omit statusDefs to avoid overwriting user selection

  // Set default status once statuses load (new request only)
  useEffect(() => {
    if (!requestId && open && !statusId && (statusDefs as StatusDef[]).length > 0) {
      const newStatus = (statusDefs as StatusDef[]).find(s => s.status === 'New' && s.enabledForRequest !== false)
      if (newStatus) setStatusId(newStatus.id)
    }
  }, [statusDefs, requestId, open, statusId])

  // Auto-select client when coming from Client detail "Create Request" button
  // Guard: only set after clients list is loaded to avoid MUI out-of-range loop
  useEffect(() => {
    if (!requestId && open && initialClientId && clients.length > 0 && !clientId) {
      setClientId(initialClientId)
    }
  }, [initialClientId, requestId, open, clientId, clients])

  // Auto-set tax code when coming from Client detail
  // Guard: only set after taxCodes list is loaded to avoid MUI out-of-range loop
  useEffect(() => {
    if (!requestId && open && initialTaxCodeId && taxCodes.length > 0 && !taxCodeId) {
      setTaxCodeId(initialTaxCodeId)
    }
  }, [initialTaxCodeId, requestId, open, taxCodeId, taxCodes])

  // Show address picker when client changes (create mode only, mobile parity)
  useEffect(() => {
    if (!requestId && open && clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId)
      if (client && client.addresses && client.addresses.length > 0) {
        setSelectedClientForPicker(client)
        setAddressPickerOpen(true)
      }
    }
  }, [clientId, clients, requestId, open])

  // ── Save mutation ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      requestId
        ? api.patch(`/api/requests/${requestId}`, data)
        : api.post('/api/requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      if (requestId) queryClient.invalidateQueries({ queryKey: ['request', requestId] })
      onSaved()
    }
  })

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/requests/${requestId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] })
      onClose()
    }
  })

  const handleSave = () => {
    setSubmitAttempted(true)
    if (!isFormValid) return

    saveMutation.mutate({
      title:           title.trim(),
      description:     description.trim() || undefined,
      clientId:        clientId || undefined,
      // locationId:      locationId || undefined, // TODO: Uncomment after running migration 013
      statusId:        statusId || undefined,
      assessmentDate:  assessmentDate || undefined,
      assignedToId:    assignedToId || undefined,
      propertyName:    propertyName.trim() || undefined,
      street:          street.trim() || undefined,
      street2:         street2.trim() || undefined,
      city:            city.trim() || undefined,
      stateId:         stateId || undefined,
      zipCode:         zipCode.trim() || undefined,
      taxCodeId:       taxCodeId || undefined,
      leadSourceId:    leadSourceId || undefined,
      priorityId:      priorityId || undefined,
      jobTypeId:       jobTypeId || undefined,
      requestDate:     requestDate || undefined,
      contactMethodId: contactMethodId || undefined,
      preferredContactTime:   preferredContactTime || undefined,
      tags:            tags.trim() || undefined,
      internalNotes:   internalNotes.trim() || undefined,
      customerMessage: customerMessage.trim() || undefined,
      lineItems:       lineItems.filter(li => li.description.trim()).map(li => ({
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

  useEffect(() => {
    if (registerSave) registerSave(handleSave)
  }, [registerSave, title, description, clientId, statusId, assessmentDate, assignedToId, propertyName, street, street2, city, stateId, zipCode, taxCodeId, leadSourceId, priorityId, jobTypeId, requestDate, contactMethodId, preferredContactTime, tags, internalNotes, customerMessage, lineItems])

  useEffect(() => {
    if (onStateChange) onStateChange({ isSaving: saveMutation.isPending, isValid: isFormValid })
  }, [onStateChange, saveMutation.isPending, isFormValid])

  const handleDelete = async () => {
    setDeleting(true)
    await deleteMutation.mutateAsync()
    setDeleting(false)
    setDeleteDlgOpen(false)
  }

  const isNew     = !requestId
  const isLoading = isLoadingRequest && !!requestId

  const isDirty = !!(
    title || description || clientId || statusId || assessmentDate ||
    assignedToId || propertyName || street || city || stateId || zipCode ||
    internalNotes || customerMessage
  )

  const formContent = (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {isLoading && (
        <Box className='flex justify-center items-center p-12'>
          <CircularProgress />
        </Box>
      )}

      {saveMutation.isError && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity='error'>Failed to save request. Please try again.</Alert>
        </Box>
      )}

      {!isLoading && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: inline ? 3 : '4px', py: inline ? 2 : '2px', '& .MuiFormControl-root': { mt: '2px', mb: 0 } }}>

          {/* ── Request Details ── */}
            <SectionHeader>Request Details</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <CustomTextField
                  fullWidth
                  label='Title' required={isRequired('title')}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder='e.g., Kitchen faucet repair'
                  error={!!titleError}
                  helperText={titleError}
                />
                <CustomTextField
                  fullWidth
                  multiline
                  minRows={3}
                  label='Description'
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder='Describe the request…'
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1, display: 'flex', gap: 0.5, pr: 0 }}>
                        <IconButton size='small' onClick={() => setDescriptionModalOpen(true)} edge='end'>
                          <i className='tabler-pencil text-base' />
                        </IconButton>
                        <DictationButton
                          size='small'
                          onTranscript={text => setDescription(prev => prev ? `${prev} ${text}` : text)}
                        />
                      </InputAdornment>
                    )
                  }}
                />
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
                helperText={clientError}
              >
                <MenuItem value=''>— None —</MenuItem>
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>{clientLabel(c)}</MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {/* ── Status & Assignment ── */}
            <SectionHeader>Status &amp; Assignment</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Box sx={{ display: 'flex', gap: '2px' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField select fullWidth label='Status' value={statusId} onChange={e => setStatusId(e.target.value)}>
                      <MenuItem value=''>— None —</MenuItem>
                      {requestStatuses.map(s => <MenuItem key={s.id} value={s.id}>{s.status}</MenuItem>)}
                    </CustomTextField>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField select fullWidth label='Assigned To' value={assignedToId} onChange={e => setAssignedToId(e.target.value)}>
                      <MenuItem value=''>— Unassigned —</MenuItem>
                      {users.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                    </CustomTextField>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField
                      fullWidth
                      type='date'
                      label='Assessment Date'
                      value={assessmentDate}
                      onChange={e => setAssessmentDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* ── Classification ── */}
            <SectionHeader>Classification</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <Box sx={{ display: 'flex', gap: '2px' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField select fullWidth label='Lead Source' value={leadSourceId} onChange={e => setLeadSourceId(e.target.value)}>
                      <MenuItem value=''>— None —</MenuItem>
                      {leadSources.map(l => <MenuItem key={l.id} value={l.id}>{l.value}</MenuItem>)}
                    </CustomTextField>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField select fullWidth label='Priority' value={priorityId} onChange={e => setPriorityId(e.target.value)}>
                      <MenuItem value=''>— None —</MenuItem>
                      {priorities.map(l => <MenuItem key={l.id} value={l.id}>{l.value}</MenuItem>)}
                    </CustomTextField>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField select fullWidth label='Job Type' value={jobTypeId} onChange={e => setJobTypeId(e.target.value)}>
                      <MenuItem value=''>— None —</MenuItem>
                      {jobTypes.map(l => <MenuItem key={l.id} value={l.id}>{l.value}</MenuItem>)}
                    </CustomTextField>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: '2px' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField
                      fullWidth
                      type='date'
                      label='Request Date'
                      value={requestDate}
                      onChange={e => setRequestDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField select fullWidth label='Contact Method' value={contactMethodId} onChange={e => setContactMethodId(e.target.value)} SelectProps={{ displayEmpty: true }}>
                      <MenuItem value=''>— None —</MenuItem>
                      {contactMethods.map(cm => <MenuItem key={cm.id} value={cm.id}>{cm.value}</MenuItem>)}
                    </CustomTextField>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField select fullWidth label='Contact Time' value={preferredContactTime} onChange={e => setPreferredContactTime(e.target.value)}>
                      <MenuItem value=''>— None —</MenuItem>
                      <MenuItem value='Morning'>Morning</MenuItem>
                      <MenuItem value='Afternoon'>Afternoon</MenuItem>
                      <MenuItem value='Evening'>Evening</MenuItem>
                      <MenuItem value='Anytime'>Anytime</MenuItem>
                    </CustomTextField>
                  </Box>
                </Box>
                <CustomTextField
                  fullWidth
                  label='Tags'
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder='e.g., online-booking, urgent'
                  helperText='Comma-separated tags'
                />
              </Box>
            </Box>

            {/* ── Property Location ── */}
            <SectionHeader>Property Location</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <CustomTextField fullWidth label='Property Name' value={propertyName} onChange={e => setPropertyName(e.target.value)} placeholder='e.g., Main Office' />
                <Box sx={{ display: 'flex', gap: '2px' }}>
                  <Box sx={{ flex: 2, minWidth: 0 }}>
                    <AddressAutocomplete
                      onPlaceSelected={handlePlaceSelected}
                      placeholder='123 Main St'
                      label='Street Address'
                      fullWidth
                      value={street}
                      onChange={setStreet}
                    />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField fullWidth label='Suite / Apt' value={street2} onChange={e => setStreet2(e.target.value)} placeholder='Suite 100' />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: '2px' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CustomTextField fullWidth label='City' value={city} onChange={e => setCity(e.target.value)} />
                  </Box>
                  <Box sx={{ flex: '0 0 140px', minWidth: 0 }}>
                    <CustomTextField select fullWidth label='State' value={stateId} onChange={e => setStateId(e.target.value)}>
                      <MenuItem value=''>—</MenuItem>
                      {states.map(s => <MenuItem key={s.id} value={s.id}>{s.value}</MenuItem>)}
                    </CustomTextField>
                  </Box>
                  <Box sx={{ flex: '0 0 110px', minWidth: 0 }}>
                    <CustomTextField fullWidth label='Zip' value={zipCode} onChange={e => setZipCode(e.target.value)} />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* ── Tax Code ── */}
            <SectionHeader>Tax</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <CustomTextField select fullWidth label='Tax Code' value={taxCodeId} onChange={e => setTaxCodeId(e.target.value)}>
                <MenuItem value=''>— No Tax —</MenuItem>
                {taxCodes.map(tc => (
                  <MenuItem key={tc.id} value={tc.id}>{tc.code} — {tc.name} ({tc.rate}%)</MenuItem>
                ))}
              </CustomTextField>
            </Box>

            {/* ── Line Items ── */}
            <LineItemsSection
              lineItems={lineItems}
              onChange={setLineItems}
              taxRate={taxCodes.find(tc => tc.id === taxCodeId)?.rate}
            />

            {/* ── Customer Message ── */}
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <CustomTextField
                fullWidth multiline minRows={3}
                label='Customer Message'
                value={customerMessage}
                onChange={e => setCustomerMessage(e.target.value)}
                placeholder='Message visible to customer…'
                helperText='This message is visible to the customer.'
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1, display: 'flex', gap: 0.5, pr: 0 }}>
                      <IconButton size='small' onClick={() => setCustomerMessageModalOpen(true)} edge='end'>
                        <i className='tabler-pencil text-base text-textSecondary' />
                      </IconButton>
                      <DictationButton size='small' onTranscript={text => setCustomerMessage(prev => prev ? `${prev} ${text}` : text)} />
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* ── Internal Notes (Admin Only) ── */}
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'warning.lighter' }}>
              <CustomTextField
                fullWidth multiline minRows={3}
                label='Internal Notes (Admin Only)'
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                placeholder='Notes for your team (not visible to customer)…'
                helperText='Admin-only — not visible to customers or technicians.'
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end' sx={{ alignSelf: 'flex-start', mt: 1, display: 'flex', gap: 0.5, pr: 0 }}>
                      <IconButton size='small' onClick={() => setInternalNotesModalOpen(true)} edge='end'>
                        <i className='tabler-pencil text-base text-warning' />
                      </IconButton>
                      <DictationButton size='small' onTranscript={text => setInternalNotes(prev => prev ? `${prev} ${text}` : text)} />
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* ── Audit footer (edit mode only) ── */}
            
            {/* ── Delete (edit mode only) ── */}
            {!isNew && !inline && (
              <Box sx={{ px: '2px', py: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant='tonal' color='error'
                  startIcon={<i className='tabler-trash' />}
                  onClick={() => setDeleteDlgOpen(true)}
                  disabled={saveMutation.isPending || deleting}>
                  Delete Request
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
          title={isNew ? 'New Request' : `Edit Request${request?.requestNumber ? ` — ${request.requestNumber}` : ''}`}
          isSaving={saveMutation.isPending}
          saveDisabled={submitAttempted && !isFormValid}
          hasUnsavedChanges={isDirty}
        >
          {formContent}
        </EditPanel>
      )}

      {/* Notes modals */}
      <NotesEditorModal
        open={descriptionModalOpen}
        onClose={() => setDescriptionModalOpen(false)}
        title='Description'
        value={description}
        onChange={setDescription}
      />
      <NotesEditorModal
        open={internalNotesModalOpen}
        onClose={() => setInternalNotesModalOpen(false)}
        title='Internal Notes'
        value={internalNotes}
        onChange={setInternalNotes}
      />
      <NotesEditorModal
        open={customerMessageModalOpen}
        onClose={() => setCustomerMessageModalOpen(false)}
        title='Customer Message'
        value={customerMessage}
        onChange={setCustomerMessage}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDlgOpen} onClose={() => setDeleteDlgOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-alert-triangle text-error text-2xl' />
          Delete Request?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>&ldquo;{request?.title}&rdquo;</strong>?
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
