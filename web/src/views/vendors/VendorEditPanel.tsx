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
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import EditPanel from '@/components/EditPanel'
import CustomTextField from '@core/components/mui/TextField'
import SectionHeader from '@/components/SectionHeader'
import DictationButton from '@/components/DictationButton'
import NotesEditorModal from '@/components/NotesEditorModal'
import MultiAddressSection, { type AddressEntry } from '@/components/MultiAddressSection'
import { api } from '@/lib/api'
import { useRequiredFieldsValidation } from '@/hooks/useRequiredFields'
import type { Vendor } from '@shared/contracts'

// ── Local types ─────────────────────────────────────────────────────────────
type LookupItem = { id: string; value: string; label?: string; isDefault?: boolean; abbreviation?: string }

// ── Props ────────────────────────────────────────────────────────────────────
interface VendorEditPanelProps {
  vendorId: string | null   // null = new
  open: boolean
  onClose: () => void
  onSaved: () => void        // called after save → switch to detail panel
  inline?: boolean
  registerSave?: (saveFn: () => void) => void
  onStateChange?: (state: { isSaving: boolean; isValid: boolean }) => void
}

/**
 * Full-screen edit drawer for Vendor entity with addresses, phones, and emails.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/vendors/VendorEditPanel.tsx
 */
export default function VendorEditPanel({
  vendorId,
  open,
  onClose,
  onSaved,
  inline,
  registerSave,
  onStateChange
}: VendorEditPanelProps) {
  const queryClient = useQueryClient()

  // ── Fetch existing vendor (edit mode only) ──────────────────────────────────
  const { data: vendor, isLoading: isLoadingVendor } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => api.get<Vendor>(`/api/vendors/${vendorId}`),
    enabled: !!vendorId && open
  })

  // ── Lookup data ──────────────────────────────────────────────────────────
  const { data: paymentTerms = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'paymentTerms'],
    queryFn: () => api.get('/api/lookups/paymentTerms')
  })
  const { data: taxCodes = [] } = useQuery<{ id: string; code: string; name: string; rate: number }[]>({
    queryKey: ['tax-codes'],
    queryFn: () => api.get('/api/tax-codes')
  })
  const { data: addressTypes = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'addressType'],
    queryFn: () => api.get('/api/lookups/addressType')
  })
  const { data: usStates = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'usState'],
    queryFn: () => api.get('/api/lookups/usState')
  })
  const { data: canadianProvinces = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'canadianProvince'],
    queryFn: () => api.get('/api/lookups/canadianProvince')
  })
  const { data: mexicanStates = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'mexicanState'],
    queryFn: () => api.get('/api/lookups/mexicanState')
  })
  const { data: countries = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'country'],
    queryFn: () => api.get('/api/lookups/country')
  })

  // ── Form state ───────────────────────────────────────────────────────────
  const [company,        setCompany]        = useState('')
  const [name,           setName]           = useState('')
  const [webUrl,         setWebUrl]         = useState('')
  const [phone,          setPhone]          = useState('')
  const [email,          setEmail]          = useState('')
  const [paymentTermsId, setPaymentTermsId] = useState('')
  const [taxCodeId,      setTaxCodeId]      = useState('')
  const [notes,          setNotes]          = useState('')
  const [inactive,       setInactive]       = useState(false)
  const [tax1099,        setTax1099]        = useState(false)
  const [addresses,      setAddresses]      = useState<AddressEntry[]>([])

  // modal state
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [deleteDlgOpen,  setDeleteDlgOpen]  = useState(false)
  const [deleting,       setDeleting]       = useState(false)

  // ── Dynamic Validation (driven by required-fields config) ─────────────────
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const { validate, isRequired } = useRequiredFieldsValidation('vendor')

  const validationResult = useMemo(() => {
    if (!submitAttempted) return { valid: true, errors: [], fieldErrors: {} }
    return validate({ company, name, phone, email })
  }, [submitAttempted, validate, company, name, phone, email])

  const companyOrNameError = validationResult.fieldErrors['company'] || validationResult.fieldErrors['name'] || ''
  const isFormValid = validationResult.valid

  // ── Populate form on open ────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      if (vendor && vendorId) {
        setCompany(vendor.company || '')
        setName(vendor.name || '')
        setWebUrl(vendor.webUrl || '')
        setPhone(vendor.phone || '')
        setEmail(vendor.email || '')
        setPaymentTermsId((vendor as any).paymentTermsId || '')
        setTaxCodeId(vendor.taxCodeId || '')
        setNotes(vendor.notes || '')
        setInactive(vendor.inactive ?? false)
        setTax1099(vendor.tax1099 ?? false)
        // Map vendor_address records → AddressEntry[]
        const vendorAddresses = (vendor as any).addresses ?? []
        setAddresses(vendorAddresses.map((a: any) => ({
          id:            a.id,
          addressTypeId: a.addressTypeId ?? '',
          street:        a.street ?? '',
          street2:       a.street2 ?? '',
          city:          a.city ?? '',
          stateId:       a.stateId ?? null,
          zipCode:       a.zipCode ?? '',
          countryId:     a.countryId ?? '',
          isDefault:     a.isDefault ?? false,
        })))
      } else if (!vendorId) {
        setCompany(''); setName(''); setWebUrl(''); setPhone(''); setEmail('')
        setPaymentTermsId(''); setTaxCodeId(''); setNotes('')
        setInactive(false); setTax1099(false); setAddresses([])
      }
      setSubmitAttempted(false)
    }
  }, [open, vendor, vendorId])

  // ── Save mutation ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      vendorId
        ? api.patch(`/api/vendors/${vendorId}`, data)
        : api.post('/api/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      if (vendorId) queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      onSaved()
    }
  })

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/vendors/${vendorId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      onClose()
    }
  })

  const handleSave = () => {
    setSubmitAttempted(true)
    if (!isFormValid) return

    saveMutation.mutate({
      company:        company.trim() || undefined,
      name:           name.trim() || undefined,
      webUrl:         webUrl.trim() || undefined,
      phone:          phone.trim() || undefined,
      email:          email.trim() || undefined,
      paymentTermsId: paymentTermsId || undefined,
      taxCodeId:      taxCodeId || undefined,
      notes:          notes.trim() || undefined,
      inactive,
      tax1099,
      addresses: addresses.map((a, i) => ({
        id:            a.id,
        addressTypeId: a.addressTypeId || undefined,
        street:        a.street || undefined,
        street2:       a.street2 || undefined,
        city:          a.city || undefined,
        stateId:       a.stateId || undefined,
        zipCode:       a.zipCode || undefined,
        countryId:     a.countryId || undefined,
        isDefault:     a.isDefault,
        order:         i,
      })),
    })
  }

  const handleDelete = async () => {
    setDeleting(true)
    await deleteMutation.mutateAsync()
    setDeleting(false)
    setDeleteDlgOpen(false)
  }

  const isNew     = !vendorId
  const isLoading = isLoadingVendor && !!vendorId

  const isDirty = !!(company || name || webUrl || phone || email || paymentTermsId || taxCodeId || notes || inactive || tax1099 || addresses.length)

  useEffect(() => {
    if (registerSave) registerSave(handleSave)
  }, [registerSave, company, name, webUrl, phone, email, paymentTermsId, taxCodeId, notes, inactive, tax1099, addresses])

  useEffect(() => {
    if (onStateChange) onStateChange({ isSaving: saveMutation.isPending, isValid: isFormValid })
  }, [onStateChange, saveMutation.isPending, isFormValid])

  const formContent = (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!isLoading && (
        <Box sx={{ flex: 1, overflowY: 'auto', px: inline ? 3 : '4px', py: inline ? 2 : '2px', '& .MuiFormControl-root': { mt: '2px', mb: 0 } }}>

            {/* ── Vendor Details ── */}
            <SectionHeader>Vendor Details</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <CustomTextField
                  fullWidth
                  label='Company'
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder='e.g., ACME Corp'
                  error={!!companyOrNameError}
                  helperText={companyOrNameError || 'Company name (if applicable)'}
                />
                <CustomTextField
                  fullWidth
                  label='Contact Name'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder='e.g., John Smith'
                  error={!!companyOrNameError}
                  helperText={companyOrNameError || 'Contact person name'}
                />
                <CustomTextField
                  fullWidth
                  label='Website'
                  value={webUrl}
                  onChange={e => setWebUrl(e.target.value)}
                  placeholder='https://example.com'
                />
                <CustomTextField
                  fullWidth
                  label='Phone'
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder='(555) 123-4567'
                />
                <CustomTextField
                  fullWidth
                  label='Email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='vendor@example.com'
                  type='email'
                />
              </Box>
            </Box>

            {/* ── Addresses ── */}
            <MultiAddressSection
              addresses={addresses}
              onChange={setAddresses}
              addressTypes={addressTypes}
              usStates={usStates}
              canadianProvinces={canadianProvinces}
              mexicanStates={mexicanStates}
              countries={countries}
            />

            {/* ── Financial Details ── */}
            <SectionHeader>Financial Details</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <CustomTextField
                  select fullWidth
                  label='Payment Terms'
                  value={paymentTermsId}
                  onChange={e => setPaymentTermsId(e.target.value)}
                >
                  <MenuItem value=''>— None —</MenuItem>
                  {paymentTerms.map(pt => (
                    <MenuItem key={pt.id} value={pt.id}>{pt.value}</MenuItem>
                  ))}
                </CustomTextField>
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
                <FormControlLabel
                  control={<Checkbox checked={tax1099} onChange={e => setTax1099(e.target.checked)} />}
                  label='1099 Vendor'
                />
                <FormControlLabel
                  control={<Checkbox checked={inactive} onChange={e => setInactive(e.target.checked)} />}
                  label='Inactive'
                />
              </Box>
            </Box>

            {/* ── Notes ── */}
            <SectionHeader action={
              <IconButton size='small' onClick={() => setNotesModalOpen(true)} sx={{ color: 'text.secondary', p: 0.5 }}>
                <i className='tabler-pencil text-base' />
              </IconButton>
            }>Notes</SectionHeader>
            <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
              <CustomTextField
                fullWidth multiline minRows={3}
                label='Notes'
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder='Internal vendor notes…'
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

            {/* ── Delete (edit mode only) ── */}
            {!inline && !isNew && (
              <Box sx={{ px: '2px', py: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant='tonal' color='error'
                  startIcon={<i className='tabler-trash' />}
                  onClick={() => setDeleteDlgOpen(true)}
                  disabled={saveMutation.isPending || deleting}>
                  Delete Vendor
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
          title={isNew ? 'New Vendor' : 'Edit Vendor'}
          isSaving={saveMutation.isPending}
          saveDisabled={submitAttempted && !isFormValid}
          hasUnsavedChanges={isDirty}
        >
          {isLoading && (
            <Box className='flex justify-center items-center p-12'>
              <CircularProgress />
            </Box>
          )}
          {saveMutation.isError && (
            <Box sx={{ px: 3, pt: 2 }}>
              <Alert severity='error'>Failed to save vendor. Please try again.</Alert>
            </Box>
          )}
          {formContent}
        </EditPanel>
      )}

      <NotesEditorModal
        open={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        title='Vendor Notes'
        value={notes}
        onChange={setNotes}
      />

      <Dialog open={deleteDlgOpen} onClose={() => setDeleteDlgOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-alert-triangle text-error text-2xl' />
          Delete Vendor?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>&ldquo;{vendor?.company || vendor?.name}&rdquo;</strong>?
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
