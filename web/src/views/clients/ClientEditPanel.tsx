'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import EditPanel from '@/components/EditPanel'
import CustomTextField from '@core/components/mui/TextField'
import MultiPhoneSection, { type PhoneEntry } from '@/components/MultiPhoneSection'
import MultiEmailSection, { type EmailEntry } from '@/components/MultiEmailSection'
import MultiAddressSection, { type AddressEntry } from '@/components/MultiAddressSection'
import DictationButton from '@/components/DictationButton'
import NotesEditorModal from '@/components/NotesEditorModal'
import CustomFieldsEditSection from '@/components/CustomFieldsEditSection'
import IconButton from '@mui/material/IconButton'
import SectionHeader from '@/components/SectionHeader'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { api } from '@/lib/api'
import { useRequiredFieldsValidation } from '@/hooks/useRequiredFields'
import type { Client, ClientPhone, ClientEmail, ClientAddress } from '@shared/contracts'

type LookupItem = { id: string; value: string; label: string; isDefault?: boolean; isActive?: boolean }
type TaxCode = { id: string; code: string; name: string; rate: number }

interface ClientEditPanelProps {
  clientId: string | null
  open: boolean
  onClose: () => void
  onSaved: () => void // Called after successful save to switch to detail panel
  inline?: boolean
  registerSave?: (saveFn: () => void) => void
  onStateChange?: (state: { isSaving: boolean; isValid: boolean }) => void
}

/**
 * Full-screen edit drawer for Client entity with all fields, phones, emails, addresses, and custom fields.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/clients/ClientEditPanel.tsx
 */
export default function ClientEditPanel({
  clientId,
  open,
  onClose,
  onSaved,
  inline,
  registerSave,
  onStateChange
}: ClientEditPanelProps) {
  const queryClient = useQueryClient()

  // Fetch client data (if editing)
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => api.get<Client>(`/api/clients/${clientId}`),
    enabled: !!clientId && open
  })

  // Fetch all lookups
  const { data: prefixes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'clientPrefix'], queryFn: () => api.get('/api/lookups/clientPrefix') })
  const { data: suffixes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'clientSuffix'], queryFn: () => api.get('/api/lookups/clientSuffix') })
  const { data: customerTypes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'customerType'], queryFn: () => api.get('/api/lookups/customerType') })
  const { data: roles = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'role'], queryFn: () => api.get('/api/lookups/role') })
  const { data: paymentTerms = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'paymentTerms'], queryFn: () => api.get('/api/lookups/paymentTerms') })
  const { data: creditStatuses = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'creditStatus'], queryFn: () => api.get('/api/lookups/creditStatus') })
  const { data: taxCodes = [] } = useQuery<TaxCode[]>({ queryKey: ['tax-codes'], queryFn: () => api.get('/api/tax-codes?activeOnly=true') })
  const { data: phoneTypes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'phoneType'], queryFn: () => api.get('/api/lookups/phoneType') })
  const { data: emailTypes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'emailType'], queryFn: () => api.get('/api/lookups/emailType') })
  const { data: addressTypes = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'addressType'], queryFn: () => api.get('/api/lookups/addressType') })
  const { data: usStates = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'usState'], queryFn: () => api.get('/api/lookups/usState') })
  const { data: canadianProvinces = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'canadianProvince'], queryFn: () => api.get('/api/lookups/canadianProvince') })
  const { data: mexicanStates = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'mexicanState'], queryFn: () => api.get('/api/lookups/mexicanState') })
  const { data: countries = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'country'], queryFn: () => api.get('/api/lookups/country') })

  // Form state
  const [prefixId, setPrefixId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [suffixId, setSuffixId] = useState('')
  const [company, setCompany] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [useCompanyName, setUseCompanyName] = useState(false)
  const [customerTypeId, setCustomerTypeId] = useState('')
  const [roleId, setRoleId] = useState('')
  const [paymentTermsId, setPaymentTermsId] = useState('')
  const [creditStatusId, setCreditStatusId] = useState('')
  const [taxCodeId, setTaxCodeId] = useState('')
  const [tags, setTags] = useState('')
  const [phones, setPhones] = useState<PhoneEntry[]>([])
  const [emails, setEmails] = useState<EmailEntry[]>([])
  const [addresses, setAddresses] = useState<AddressEntry[]>([])
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [internalNotesModalOpen, setInternalNotesModalOpen] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({})

  // ── Dynamic Validation (driven by required-fields config) ─────────────────
  const { validate, isRequired } = useRequiredFieldsValidation('client')

  const validationResult = useMemo(() => {
    if (!submitAttempted) return { valid: true, errors: [], fieldErrors: {} }
    return validate({
      firstName, lastName, company, phones, emails,
      phone: phones.find(p => p.number.trim())?.number,
      email: emails.find(e => e.address.trim())?.address,
      customerType: customerTypeId || undefined,
    })
  }, [submitAttempted, validate, firstName, lastName, company, phones, emails, customerTypeId])

  const firstNameError = validationResult.fieldErrors['firstName'] || ''
  const lastNameError  = validationResult.fieldErrors['lastName'] || ''
  const isFormValid    = validationResult.valid
  
  const formInitRef = useRef<boolean>(false)

  // Populate form when client loads OR apply defaults for new client
  useEffect(() => {
    if (client && !formInitRef.current) {
      // Editing existing client - populate from client data

      setPrefixId(client.prefixId || '')
      setFirstName(client.firstName)
      setLastName(client.lastName)
      setSuffixId(client.suffixId || '')
      setCompany(client.company || '')
      setWebUrl(client.webUrl || '')
      setUseCompanyName(client.useCompanyName || false)
      setCustomerTypeId(client.customerTypeId || '')
      setRoleId(client.roleId || '')
      setPaymentTermsId(client.paymentTermsId || '')
      setCreditStatusId(client.creditStatusId || '')
      setTaxCodeId(client.taxCodeId || '')
      setTags(client.tags || '')
      setNotes(client.notes || '')
      setInternalNotes(client.internalNotes || '')
      setDateOfBirth(client.dateOfBirth || '')
      setCustomFieldValues(client.customFields || {})

      // Convert phones
      if (client.phoneNumbers) {
        setPhones(client.phoneNumbers.map((p: ClientPhone) => ({
          id: p.id,
          number: p.number,
          typeId: p.typeId,
          customLabel: p.customLabel || undefined,
          isDefault: p.isDefault
        })))
      }

      // Convert emails
      if (client.emails) {
        setEmails(client.emails.map((e: ClientEmail) => ({
          id: e.id,
          address: e.address,
          typeId: e.typeId,
          customLabel: e.customLabel || undefined,
          isDefault: e.isDefault
        })))
      }

      // Convert addresses
      if (client.addresses) {
        setAddresses(client.addresses.map((a: ClientAddress) => ({
          id: a.id,
          addressTypeId: a.addressTypeId || '',
          street: a.street || '',
          street2: a.street2 || '',
          city: a.city || '',
          stateId: a.stateId || null,
          zipCode: a.zipCode || '',
          countryId: a.countryId || '',
          isDefault: a.isDefault
        })))
      }
      formInitRef.current = true
    } else if (!clientId && open && !formInitRef.current) {
      // New client - apply configured defaults
      const defaultPaymentTerms = paymentTerms.find(p => p.isDefault)
      const defaultCreditStatus = creditStatuses.find(c => c.isDefault)

      if (defaultPaymentTerms) {
        setPaymentTermsId(defaultPaymentTerms.id)
      }
      if (defaultCreditStatus) {
        setCreditStatusId(defaultCreditStatus.id)
      }
      formInitRef.current = true
    }
    
    // Reset initialization when drawer/panel is closed
    if (!open) {
      formInitRef.current = false
    }

    setSubmitAttempted(false)
  }, [client, clientId, open, paymentTerms, creditStatuses])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      clientId
        ? api.patch(`/api/clients/${clientId}`, data)
        : api.post('/api/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      }
      onSaved()
    }
  })

  const handleSave = () => {
    setSubmitAttempted(true)
    if (!isFormValid) return   // inline errors will now show

    // Convert phone/email/address entries to API format
    const phoneNumbers = phones.map(p => ({
      id: p.id,
      number: p.number,
      typeId: p.typeId,
      customLabel: p.customLabel || null,
      isDefault: p.isDefault
    }))

    const emailAddresses = emails.map(e => ({
      id: e.id,
      address: e.address,
      typeId: e.typeId,
      customLabel: e.customLabel || null,
      isDefault: e.isDefault
    }))

    const addressList = addresses.map(a => ({
      id: a.id,
      addressTypeId: a.addressTypeId,
      street: a.street,
      street2: a.street2 || null,
      city: a.city,
      stateId: a.stateId,
      zipCode: a.zipCode,
      countryId: a.countryId,
      isDefault: a.isDefault
    }))

    saveMutation.mutate({
      prefixId: prefixId || undefined,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      suffixId: suffixId || undefined,
      company: company.trim() || undefined,
      webUrl: webUrl.trim() || undefined,
      useCompanyName: company.trim() ? useCompanyName : undefined,
      customerTypeId: customerTypeId || undefined,
      roleId: roleId || undefined,
      paymentTermsId: paymentTermsId || undefined,
      creditStatusId: creditStatusId || undefined,
      taxCodeId: taxCodeId || undefined,
      tags: tags.trim() || undefined,
      notes: notes.trim() || "",
      internalNotes: internalNotes.trim() || "",
      dateOfBirth: dateOfBirth || undefined,
      phoneNumbers,
      emails: emailAddresses,
      addresses: addressList,
      customFields: customFieldValues,
    })
  }

  const isLoading = isLoadingClient && !!clientId

  useEffect(() => {
    if (registerSave) registerSave(handleSave)
  }, [registerSave, prefixId, firstName, lastName, suffixId, company, webUrl, useCompanyName, customerTypeId, roleId, paymentTermsId, creditStatusId, taxCodeId, tags, notes, internalNotes, dateOfBirth, phones, emails, addresses, customFieldValues])

  useEffect(() => {
    if (onStateChange) onStateChange({ isSaving: saveMutation.isPending, isValid: isFormValid })
  }, [onStateChange, saveMutation.isPending, isFormValid])

  const formContent = (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {submitAttempted && !isFormValid && (
        <Box sx={{ mb: 2 }}>
          <Alert severity='warning'>Please fill in all required fields: {validationResult.errors.join(', ')}.</Alert>
        </Box>
      )}
      
      {isLoading && (
        <Box className='flex justify-center items-center p-12'>
          <CircularProgress />
        </Box>
      )}

      {saveMutation.isError && (
        <Box className='px-6 pt-4'>
          <Alert severity='error'>Failed to save client. Please try again.</Alert>
        </Box>
      )}

      {!isLoading && (
        <Box sx={{ px: inline ? 3 : '4px', py: inline ? 2 : '2px', '& .MuiFormControl-root': { mt: '2px', mb: 0 } }}>
          {/* Basic Information */}
          <SectionHeader>Basic Information</SectionHeader>
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Prefix | First | Last | Suffix — single row */}
              <Box sx={{ display: 'flex', gap: '2px', alignItems: 'flex-start' }}>
                <Box sx={{ width: 80, flexShrink: 0 }}>
                  <CustomTextField select fullWidth label='Prefix' value={prefixId} onChange={e => setPrefixId(e.target.value)} helperText=' '>
                    <MenuItem value=''>—</MenuItem>
                    {prefixes.map(p => <MenuItem key={p.id} value={p.id}>{p.value}</MenuItem>)}
                  </CustomTextField>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <CustomTextField
                    fullWidth label='First Name' required={isRequired('firstName')} value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder='John'
                    error={!!firstNameError}
                    helperText={firstNameError || ' '}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <CustomTextField
                    fullWidth label='Last Name' required={isRequired('lastName')} value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder='Smith'
                    error={!!lastNameError}
                    helperText={lastNameError || ' '}
                  />
                </Box>
                <Box sx={{ width: 80, flexShrink: 0 }}>
                  <CustomTextField select fullWidth label='Suffix' value={suffixId} onChange={e => setSuffixId(e.target.value)} helperText=' '>
                    <MenuItem value=''>—</MenuItem>
                    {suffixes.map(s => <MenuItem key={s.id} value={s.id}>{s.value}</MenuItem>)}
                  </CustomTextField>
                </Box>
              </Box>

              {/* Company — full width */}
              <CustomTextField fullWidth label='Company' value={company} onChange={e => setCompany(e.target.value)} placeholder='Smith & Sons' />

              {/* Website — full width */}
              <CustomTextField 
                fullWidth 
                label='Website' 
                value={webUrl} 
                onChange={e => setWebUrl(e.target.value)} 
                placeholder='https://www.example.com' 
                InputProps={{
                  endAdornment: webUrl && /^[^\s]+\.[^\s]+$/.test(webUrl) ? (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => window.open(webUrl.startsWith('http') ? webUrl : `https://${webUrl}`, '_blank')}
                        sx={{ p: '4px', '&:hover': { bgcolor: 'primary.main', color: 'common.white' } }}
                      >
                        <i className="tabler-external-link text-[22px]" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />

              {company.trim() && (
                <FormControlLabel
                  control={<Checkbox checked={useCompanyName} onChange={e => setUseCompanyName(e.target.checked)} />}
                  label='Use company name as the primary name'
                />
              )}

              {/* Customer Type | Role — locked 50/50, 2px gap */}
              <Box sx={{ display: 'flex', gap: '2px' }}>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0, overflow: 'hidden' }}>
                  <CustomTextField select fullWidth label='Customer Type' value={customerTypeId} onChange={e => setCustomerTypeId(e.target.value)} SelectProps={{ displayEmpty: true }}>
                    <MenuItem value=''>None</MenuItem>
                    {customerTypes.map(c => <MenuItem key={c.id} value={c.id}>{c.value}</MenuItem>)}
                  </CustomTextField>
                </Box>
                <Box sx={{ flex: '0 0 calc(50% - 1px)', minWidth: 0, overflow: 'hidden' }}>
                  <CustomTextField select fullWidth label='Role' value={roleId} onChange={e => setRoleId(e.target.value)} SelectProps={{ displayEmpty: true }}>
                    <MenuItem value=''>None</MenuItem>
                    {roles.map(r => <MenuItem key={r.id} value={r.id}>{r.value}</MenuItem>)}
                  </CustomTextField>
                </Box>
              </Box>

              {/* Payment Terms — full width */}
              <CustomTextField select fullWidth label='Payment Terms' value={paymentTermsId} onChange={e => setPaymentTermsId(e.target.value)} SelectProps={{ displayEmpty: true }}>
                <MenuItem value=''>None</MenuItem>
                {paymentTerms.map(p => <MenuItem key={p.id} value={p.id}>{p.label || p.value}</MenuItem>)}
              </CustomTextField>

              {/* Credit Status — full width */}
              <CustomTextField select fullWidth label='Credit Status' value={creditStatusId} onChange={e => setCreditStatusId(e.target.value)} SelectProps={{ displayEmpty: true }}>
                <MenuItem value=''>None</MenuItem>
                {creditStatuses.map(c => <MenuItem key={c.id} value={c.id}>{c.label || c.value}</MenuItem>)}
              </CustomTextField>

              {/* Tax Code — full width */}
              <CustomTextField select fullWidth label='Tax Code' value={taxCodeId} onChange={e => setTaxCodeId(e.target.value)}>
                <MenuItem value=''>None</MenuItem>
                {taxCodes.map(tc => <MenuItem key={tc.id} value={tc.id}>{tc.code} – {tc.name} ({tc.rate}%)</MenuItem>)}
              </CustomTextField>

              {/* Tags — full width */}
              <CustomTextField fullWidth label='Tags' value={tags} onChange={e => setTags(e.target.value)} placeholder='VIP, Referral, ...' helperText='Comma-separated' />

              {/* Date of Birth — type directly, no calendar scrolling */}
              <CustomTextField
                fullWidth
                label='Date of Birth'
                value={dateOfBirth ? new Date(dateOfBirth + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}
                onChange={e => {
                  const v = e.target.value
                  // Accept MM/DD/YYYY and convert to YYYY-MM-DD for backend
                  const match = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
                  if (match) {
                    const [, mm, dd, yyyy] = match
                    setDateOfBirth(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`)
                  } else if (!v) {
                    setDateOfBirth('')
                  }
                }}
                placeholder='MM/DD/YYYY'
                helperText='Type date, e.g. 03/15/1957'
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='tabler-cake text-[18px]' />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          </Box>


          {/* Phone Numbers */}
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <MultiPhoneSection phones={phones} onChange={setPhones} phoneTypes={phoneTypes} minRequired={isRequired('phone') ? 1 : 0} />
          </Box>

          {/* Email Addresses */}
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <MultiEmailSection emails={emails} onChange={setEmails} emailTypes={emailTypes} minRequired={isRequired('email') ? 1 : 0} />
          </Box>

          {/* Addresses */}
          <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
            <MultiAddressSection
              addresses={addresses}
              onChange={setAddresses}
              addressTypes={addressTypes}
              usStates={usStates}
              canadianProvinces={canadianProvinces}
              mexicanStates={mexicanStates}
              countries={countries}
            />
          </Box>

          {/* Custom Fields */}
          <CustomFieldsEditSection
            entityType='client'
            values={customFieldValues}
            onChange={setCustomFieldValues}
            submitAttempted={submitAttempted}
          />

          {/* Notes rendering when NOT inline */}
          {!inline && (
            <>
              {/* Technician Notes */}
              <SectionHeader action={
                <IconButton size='small' onClick={() => setNotesModalOpen(true)} sx={{ color: 'text.secondary', p: 0.5 }}>
                  <i className='tabler-pencil text-base' />
                </IconButton>
              }>Technician Notes</SectionHeader>
              <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'background.default' }}>
                <CustomTextField
                  fullWidth
                  multiline
                  minRows={3}
                  label='Notes'
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder='Visible to technicians...'
                  helperText='These notes are visible to all technicians working with this client.'
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

              {/* Internal Notes - Admin Only */}
              <SectionHeader action={
                <IconButton size='small' onClick={() => setInternalNotesModalOpen(true)} sx={{ color: 'warning.main', p: 0.5 }}>
                  <i className='tabler-pencil text-base' />
                </IconButton>
              }>Internal Notes (Admin Only)</SectionHeader>
              <Box sx={{ px: '2px', py: '2px', borderRadius: 1, mb: '2px', bgcolor: 'warning.lighter' }}>
                <CustomTextField
                  fullWidth
                  multiline
                  minRows={3}
                  label='Internal Notes'
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder='Private notes for admin only...'
                  helperText='Technicians cannot see this information.'
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
            </>
          )}

          {/* Notes modals */}
          <NotesEditorModal
            open={notesModalOpen}
            onClose={() => setNotesModalOpen(false)}
            title='Technician Notes'
            value={notes}
            onChange={setNotes}
            placeholder='Visible to all technicians working with this client...'
          />
          <NotesEditorModal
            open={internalNotesModalOpen}
            onClose={() => setInternalNotesModalOpen(false)}
            title='Internal Notes (Admin Only)'
            value={internalNotes}
            onChange={setInternalNotes}
            placeholder='Private admin notes — technicians cannot see this...'
          />


        </Box>
      )}
    </Box>
  )

  if (inline) {
    return (
      <PanelGroup direction="horizontal" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left scrollable form column */}
        <Panel defaultSize={70} minSize={40} style={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {formContent}
          </Box>
        </Panel>

        {/* Vertical divider */}
        <PanelResizeHandle className="w-2 bg-gray-100 border-x border-gray-200 cursor-col-resize flex items-center justify-center transition-colors hover:bg-primary-light">
          <div className="h-8 w-0.5 bg-gray-400 rounded-full" />
        </PanelResizeHandle>

        {/* Right notes column */}
        <Panel defaultSize={30} minSize={20} style={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', minHeight: 0 }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 4, gap: 4, minHeight: 0, overflow: 'hidden' }}>
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <SectionHeader action={
                <IconButton size='small' onClick={() => setNotesModalOpen(true)} sx={{ color: 'text.secondary', p: 0.5 }}>
                  <i className='tabler-pencil text-base' />
                </IconButton>
              }>Technician Notes</SectionHeader>
              <Box sx={{ flex: 1, p: 2, bgcolor: 'background.default', borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
                <CustomTextField
                  fullWidth
                  multiline
                  label='Notes'
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder='Visible to technicians...'
                  helperText='These notes are visible to all technicians working with this client.'
                  sx={{ flex: 1, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' } }}
                  InputProps={{
                    sx: { height: '100%' },
                    inputProps: { style: { height: '100%', resize: 'none' } },
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
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <SectionHeader action={
                <IconButton size='small' onClick={() => setInternalNotesModalOpen(true)} sx={{ color: 'warning.main', p: 0.5 }}>
                  <i className='tabler-pencil text-base' />
                </IconButton>
              }>Internal Notes (Admin Only)</SectionHeader>
              <Box sx={{ flex: 1, p: 2, bgcolor: 'warning.lighter', borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
                <CustomTextField
                  fullWidth
                  multiline
                  label='Internal Notes'
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder='Private notes for admin only...'
                  helperText='Technicians cannot see this information.'
                  sx={{ flex: 1, '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' } }}
                  InputProps={{
                    sx: { height: '100%' },
                    inputProps: { style: { height: '100%', resize: 'none' } },
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
            </Box>
          </Box>
        </Box>
      </Panel>
    </PanelGroup>
    )
  }

  return (
    <EditPanel
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title={clientId ? 'Edit Client' : 'New Client'}
      isSaving={saveMutation.isPending}
      saveDisabled={submitAttempted && !isFormValid}
      hasUnsavedChanges={firstName.trim() !== '' || lastName.trim() !== ''}
    >
      {formContent}
    </EditPanel>
  )
}
