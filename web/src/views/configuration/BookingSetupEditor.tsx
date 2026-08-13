'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction'
import CustomTextField from '@core/components/mui/TextField'
import { toast } from 'react-toastify'
import { api } from '@/lib/api'
import type {
  BookingConfig,
  BookingConfigUpdate,
  BookingServiceItem,
  BookingFormFields,
} from '@shared/contracts'

// ── QR Code (lazy to avoid SSR issues) ───────────────────────────────────
import { QRCodeSVG } from 'qrcode.react'
import type { ServiceItem } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


type LookupItem = { id: string; value: string; label?: string; isActive?: boolean; order?: number }

// ── Component ────────────────────────────────────────────────────────────
/**
 * Configuration editor for the client-facing booking/request form settings.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/configuration/BookingSetupEditor.tsx
 */
export default function BookingSetupEditor() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)

  // ── Fetch config ──────────────────────────────────────────────────────
  const { data: config, isLoading, error } = useQuery<BookingConfig>({
    queryKey: ['booking-config'],
    queryFn: () => api.get('/api/booking-config'),
    staleTime: 0,
  })

  const { data: bookingServices = [], refetch: refetchServices } = useQuery<BookingServiceItem[]>({
    queryKey: ['booking-services'],
    queryFn: () => api.get('/api/booking-config/services'),
  })

  // ── Local state (synced from config) ──────────────────────────────────
  const [isEnabled, setIsEnabled] = useState(false)
  const [pageTitle, setPageTitle] = useState('Request a Service')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [thankYouMessage, setThankYouMessage] = useState('')
  const [primaryColor, setPrimaryColor] = useState(COLORS.infoDark)
  const [formFields, setFormFields] = useState<BookingFormFields>({
    address: { show: true, required: false },
    preferredDate: { show: true, required: false },
    contactPreferences: { show: true, required: false },
    photoUpload: { show: false, required: false },
    companyName: { show: true, required: false },
  })
  const [showAddress, setShowAddress] = useState(true)
  const [showPhone, setShowPhone] = useState(true)
  const [showEmail, setShowEmail] = useState(true)
  const [showHours, setShowHours] = useState(true)
  const [showSocialMedia, setShowSocialMedia] = useState(true)
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<string>('')
  const [minLeadTimeHours, setMinLeadTimeHours] = useState<string>('0')
  const [maxAdvanceDays, setMaxAdvanceDays] = useState<string>('90')
  const [adminEmails, setAdminEmails] = useState('')
  const [confirmationTemplate, setConfirmationTemplate] = useState('')
  const [termsUrl, setTermsUrl] = useState('')
  const [privacyUrl, setPrivacyUrl] = useState('')
  const [addServiceOpen, setAddServiceOpen] = useState(false)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null | undefined>(undefined)
  const [catalogSearch, setCatalogSearch] = useState('')

  // ── Trade-filtered catalog queries ──────────────────────────────────
  const { data: companyData } = useQuery<any>({
    queryKey: ['company'],
    queryFn: () => api.get('/api/company'),
  })

  // Initialize trade filter to company's trade type
  useEffect(() => {
    if (companyData !== undefined && selectedTradeId === undefined) {
      setSelectedTradeId(companyData.tradeTypeId ?? null)
    }
  }, [companyData]) // eslint-disable-line react-hooks/exhaustive-deps

  const tradeId = selectedTradeId ?? null

  const { data: trades = [] } = useQuery<LookupItem[]>({
    queryKey: ['lookups', 'trade'],
    queryFn: () => api.get('/api/lookups/trade'),
  })
  const activeTrades = trades.filter(t => t.isActive !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const selectedTradeName = activeTrades.find(t => t.id === tradeId)?.value || null

  const { data: catalogItems = [], isLoading: loadingCatalog } = useQuery<ServiceItem[]>({
    queryKey: ['service-items-catalog', tradeId],
    queryFn: () => {
      const params = new URLSearchParams({ isActive: 'true' })
      if (tradeId) params.set('tradeTypeId', tradeId)
      return api.get<ServiceItem[]>(`/api/service-items?${params}`)
    },
    enabled: addServiceOpen,
  })

  useEffect(() => {
    if (!config) return
    setIsEnabled(config.isEnabled)
    setPageTitle(config.pageTitle || 'Request a Service')
    setWelcomeMessage(config.welcomeMessage || '')
    setThankYouMessage(config.thankYouMessage || '')
    setPrimaryColor(config.primaryColor || COLORS.infoDark)
    setFormFields(config.formFields)
    setShowAddress(config.showAddress)
    setShowPhone(config.showPhone)
    setShowEmail(config.showEmail)
    setShowHours(config.showHours)
    setShowSocialMedia(config.showSocialMedia)
    setMaxBookingsPerDay(config.maxBookingsPerDay != null ? String(config.maxBookingsPerDay) : '')
    setMinLeadTimeHours(String(config.minLeadTimeHours ?? 0))
    setMaxAdvanceDays(String(config.maxAdvanceDays ?? 90))
    setAdminEmails((config.adminNotificationEmails || []).join(', '))
    setConfirmationTemplate(config.confirmationEmailTemplate || '')
    setTermsUrl(config.termsUrl || '')
    setPrivacyUrl(config.privacyUrl || '')
  }, [config])

  // ── Update mutation (auto-save) ───────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (payload: BookingConfigUpdate) => api.patch('/api/booking-config', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-config'] })
      toast.success('Booking settings saved', { autoClose: 1500 })
    },
    onError: () => toast.error('Failed to save'),
  })

  const save = (payload: BookingConfigUpdate) => updateMutation.mutate(payload)

  // ── Service mutations ─────────────────────────────────────────────────
  const addServiceMutation = useMutation({
    mutationFn: (serviceItemId: string) =>
      api.post('/api/booking-config/services', { serviceItemId, sortOrder: bookingServices.length }),
    onSuccess: () => { refetchServices(); toast.success('Service added') },
    onError: () => toast.error('Failed to add service'),
  })

  const removeServiceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/booking-config/services/${id}`),
    onSuccess: () => { refetchServices(); toast.success('Service removed') },
  })

  const toggleServiceMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      api.patch(`/api/booking-config/services/${id}`, { isEnabled }),
    onSuccess: () => refetchServices(),
  })

  // ── Booking URL ───────────────────────────────────────────────────────
  const subscriberId = companyData?.subscriberId || ''
  const bookingUrl = subscriberId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/booking/${subscriberId}`
    : ''

  // ── Available services (not yet added to booking) ─────────────────────
  const addedServiceIds = useMemo(() => new Set(bookingServices.map(s => s.serviceItemId)), [bookingServices])
  const availableServices = useMemo(() => {
    let items = catalogItems.filter(s => !addedServiceIds.has(s.id))
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase()
      items = items.filter(s => s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)))
    }
    return items
  }, [catalogItems, addedServiceIds, catalogSearch])

  // ── Loading / Error ───────────────────────────────────────────────────
  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
  if (error) return <Alert severity='error' sx={{ m: 2 }}>Failed to load booking config</Alert>

  // ── Tab Panels ────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 2 }}>
      {/* Master toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, borderRadius: 2, bgcolor: isEnabled ? 'success.lighter' : 'action.hover' }}>
        <Switch
          checked={isEnabled}
          onChange={(_, v) => { setIsEnabled(v); save({ isEnabled: v }) }}
          color='success'
        />
        <Box>
          <Typography variant='subtitle1' fontWeight={600}>
            Online Booking {isEnabled ? 'Enabled' : 'Disabled'}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {isEnabled ? 'Your booking page is live and accepting requests.' : 'Turn on to let customers book services online.'}
          </Typography>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='scrollable' scrollButtons='auto' sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label='General' />
        <Tab label='Services' />
        <Tab label='Form Fields' />
        <Tab label='Display' />
        <Tab label='Rules' />
        <Tab label='Notifications' />
        <Tab label='Share' />
      </Tabs>

      {/* ── Tab 0: General ─────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <CustomTextField
            fullWidth label='Page Title' value={pageTitle}
            onChange={e => setPageTitle(e.target.value)}
            onBlur={() => save({ pageTitle: pageTitle || null })}
          />
          <CustomTextField
            fullWidth label='Welcome Message' multiline rows={3} value={welcomeMessage}
            onChange={e => setWelcomeMessage(e.target.value)}
            onBlur={() => save({ welcomeMessage: welcomeMessage || null })}
            placeholder='Displayed at the top of your booking form'
          />
          <CustomTextField
            fullWidth label='Thank You Message' multiline rows={3} value={thankYouMessage}
            onChange={e => setThankYouMessage(e.target.value)}
            onBlur={() => save({ thankYouMessage: thankYouMessage || null })}
            placeholder='Shown after a customer submits a request'
          />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <CustomTextField
              label='Primary Color' value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              onBlur={() => save({ primaryColor })}
              sx={{ width: 200 }}
              slotProps={{ input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: primaryColor, border: '1px solid', borderColor: 'divider' }} />
                  </InputAdornment>
                ),
              }}}
            />
            <input
              type='color' value={primaryColor}
              onChange={e => { setPrimaryColor(e.target.value); save({ primaryColor: e.target.value }) }}
              style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', background: 'none' }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <CustomTextField
              fullWidth label='Terms of Service URL' value={termsUrl}
              onChange={e => setTermsUrl(e.target.value)}
              onBlur={() => save({ termsUrl: termsUrl || null })}
              placeholder='https://yoursite.com/terms'
            />
            <CustomTextField
              fullWidth label='Privacy Policy URL' value={privacyUrl}
              onChange={e => setPrivacyUrl(e.target.value)}
              onBlur={() => save({ privacyUrl: privacyUrl || null })}
              placeholder='https://yoursite.com/privacy'
            />
          </Box>
        </Box>
      )}

      {/* ── Tab 1: Services ────────────────────────────────────────────── */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant='subtitle2' color='text.secondary'>
              {bookingServices.length} service{bookingServices.length !== 1 ? 's' : ''} on booking page
            </Typography>
            <Chip
              label='+ Add Service' size='small' color='primary' variant='outlined'
              onClick={() => setAddServiceOpen(true)}
              sx={{ cursor: 'pointer' }}
            />
          </Box>

          {bookingServices.length === 0 ? (
            <Alert severity='info'>No services added yet. Click "+ Add Service" to choose which services appear on your booking page.</Alert>
          ) : (
            <List disablePadding>
              {bookingServices.map(s => (
                <ListItem key={s.id} divider sx={{ py: 1.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Switch
                      size='small' checked={s.isEnabled}
                      onChange={(_, v) => toggleServiceMutation.mutate({ id: s.id, isEnabled: v })}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={s.bookingName || s.serviceItemName}
                    secondary={s.bookingDescription || s.serviceItemDescription || 'No description'}
                    slotProps={{ primary: { sx: { fontWeight: 500, opacity: s.isEnabled ? 1 : 0.5 } } }}
                  />
                  {(s.bookingPrice ?? s.serviceItemPrice) != null && s.showPrice && (
                    <Typography variant='body2' color='text.secondary' sx={{ mr: 2 }}>
                      ${(s.bookingPrice ?? s.serviceItemPrice)?.toFixed(2)}
                    </Typography>
                  )}
                  <ListItemSecondaryAction>
                    <Tooltip title='Remove from booking'>
                      <IconButton size='small' onClick={() => removeServiceMutation.mutate(s.id)}>
                        <i className='tabler-trash text-base text-error' />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}

          {/* Add service catalog dialog — trade-filtered with search */}
          <Dialog open={addServiceOpen} onClose={() => { setAddServiceOpen(false); setCatalogSearch('') }} maxWidth='sm' fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className='tabler-package text-xl' />
                <Typography variant='h6'>Products &amp; Services Catalog</Typography>
              </Box>
              <IconButton size='small' onClick={() => { setAddServiceOpen(false); setCatalogSearch('') }}>
                <i className='tabler-x' />
              </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 2 }}>
              {/* Trade filter */}
              <CustomTextField
                select fullWidth label='Filter by Trade'
                value={tradeId || ''}
                onChange={e => setSelectedTradeId(e.target.value || null)}
                sx={{ mb: 2 }}
              >
                <MenuItem value=''>All Trades</MenuItem>
                {activeTrades.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.label ?? t.value}</MenuItem>
                ))}
              </CustomTextField>

              {/* Search */}
              <CustomTextField
                fullWidth placeholder='Search services...'
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                sx={{ mb: 2 }}
                slotProps={{ input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='tabler-search text-lg' />
                    </InputAdornment>
                  ),
                }}}
              />

              {/* Items list */}
              {loadingCatalog ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <CircularProgress size={24} />
                  <Typography color='text.secondary' sx={{ mt: 1 }}>Loading catalog...</Typography>
                </Box>
              ) : availableServices.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <i className='tabler-package-off text-4xl' style={{ color: 'var(--mui-palette-text-disabled)' }} />
                  <Typography color='text.secondary' sx={{ mt: 1 }}>
                    {catalogSearch ? 'No matching services found' : `No items found${selectedTradeName ? ` for ${selectedTradeName}` : ''}`}
                  </Typography>
                </Box>
              ) : (
                availableServices.map(item => (
                  <Box
                    key={item.id}
                    onClick={() => { addServiceMutation.mutate(item.id); setAddServiceOpen(false); setCatalogSearch('') }}
                    sx={{
                      p: 2, mb: 1, borderRadius: 1, border: 1, borderColor: 'divider',
                      cursor: 'pointer', bgcolor: 'background.paper',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.lightOpacity' },
                      transition: 'all 0.15s',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography fontWeight={600}>{item.name}</Typography>
                        {item.description && (
                          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25 }}>
                            {item.description}
                          </Typography>
                        )}
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                          ${(item.unitPrice ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} / {item.unit || 'each'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        {item.tradeType && (
                          <Chip label={item.tradeType} size='small' color='primary' variant='tonal' />
                        )}
                        {item.classification && (
                          <Chip label={item.classification} size='small' variant='outlined' />
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </DialogContent>
          </Dialog>
        </Box>
      )}

      {/* ── Tab 2: Form Fields ─────────────────────────────────────────── */}
      {tab === 2 && (
        <Box>
          <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
            Control which sections are visible and required on the booking form.
          </Typography>
          {([
            { key: 'address' as const, label: 'Service Address', desc: 'Street, city, state, zip code' },
            { key: 'preferredDate' as const, label: 'Preferred Date', desc: 'Customer picks a preferred service date' },
            { key: 'contactPreferences' as const, label: 'Contact Preferences', desc: 'Preferred contact method and time' },
            { key: 'photoUpload' as const, label: 'Photo Upload', desc: 'Customer can upload photos of the issue' },
            { key: 'companyName' as const, label: 'Company Name', desc: 'Customer\'s company or business name' },
          ]).map(f => (
            <Box key={f.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Typography variant='body2' fontWeight={500}>{f.label}</Typography>
                <Typography variant='caption' color='text.secondary'>{f.desc}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant='caption' color='text.secondary'>Show</Typography>
                  <Switch
                    size='small' checked={formFields[f.key].show}
                    onChange={(_, v) => {
                      const updated = { ...formFields, [f.key]: { ...formFields[f.key], show: v, required: v ? formFields[f.key].required : false } }
                      setFormFields(updated)
                      save({ formFields: updated })
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant='caption' color='text.secondary'>Required</Typography>
                  <Switch
                    size='small' checked={formFields[f.key].required} disabled={!formFields[f.key].show}
                    onChange={(_, v) => {
                      const updated = { ...formFields, [f.key]: { ...formFields[f.key], required: v } }
                      setFormFields(updated)
                      save({ formFields: updated })
                    }}
                  />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* ── Tab 3: Display ─────────────────────────────────────────────── */}
      {tab === 3 && (
        <Box>
          <Typography variant='caption' color='text.secondary' sx={{ mb: 2, display: 'block' }}>
            Choose which company info is shown in the booking page header.
          </Typography>
          {([
            { key: 'showAddress' as const, label: 'Company Address', state: showAddress, setter: setShowAddress },
            { key: 'showPhone' as const, label: 'Phone Number', state: showPhone, setter: setShowPhone },
            { key: 'showEmail' as const, label: 'Email Address', state: showEmail, setter: setShowEmail },
            { key: 'showHours' as const, label: 'Hours of Operation', state: showHours, setter: setShowHours },
            { key: 'showSocialMedia' as const, label: 'Social Media Links', state: showSocialMedia, setter: setShowSocialMedia },
          ]).map(f => (
            <Box key={f.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant='body2' fontWeight={500}>{f.label}</Typography>
              <Switch
                checked={f.state}
                onChange={(_, v) => { f.setter(v); save({ [f.key]: v } as any) }}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* ── Tab 4: Rules ───────────────────────────────────────────────── */}
      {tab === 4 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <CustomTextField
            fullWidth label='Max Bookings Per Day' type='number' value={maxBookingsPerDay}
            onChange={e => setMaxBookingsPerDay(e.target.value)}
            onBlur={() => save({ maxBookingsPerDay: maxBookingsPerDay ? Number(maxBookingsPerDay) : null })}
            helperText='Leave blank for unlimited'
          />
          <CustomTextField
            fullWidth label='Minimum Lead Time (hours)' type='number' value={minLeadTimeHours}
            onChange={e => setMinLeadTimeHours(e.target.value)}
            onBlur={() => save({ minLeadTimeHours: Number(minLeadTimeHours) || 0 })}
            helperText='How far in advance must a customer book? 0 = same day allowed'
          />
          <CustomTextField
            fullWidth label='Max Advance Days' type='number' value={maxAdvanceDays}
            onChange={e => setMaxAdvanceDays(e.target.value)}
            onBlur={() => save({ maxAdvanceDays: Number(maxAdvanceDays) || 90 })}
            helperText='How far into the future can a customer book?'
          />
        </Box>
      )}

      {/* ── Tab 5: Notifications ───────────────────────────────────────── */}
      {tab === 5 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <CustomTextField
            fullWidth label='Admin Notification Emails' value={adminEmails}
            onChange={e => setAdminEmails(e.target.value)}
            onBlur={() => save({ adminNotificationEmails: adminEmails.split(',').map(e => e.trim()).filter(Boolean) })}
            helperText='Comma-separated list of emails that receive new booking notifications'
            placeholder='admin@company.com, manager@company.com'
          />
          <CustomTextField
            fullWidth label='Confirmation Email Template' multiline rows={5} value={confirmationTemplate}
            onChange={e => setConfirmationTemplate(e.target.value)}
            onBlur={() => save({ confirmationEmailTemplate: confirmationTemplate || null })}
            helperText='Custom message sent to customers after booking. Use {{firstName}}, {{requestNumber}} as placeholders.'
            placeholder='Thank you {{firstName}}! Your service request {{requestNumber}} has been received...'
          />
        </Box>
      )}

      {/* ── Tab 6: Share ───────────────────────────────────────────────── */}
      {tab === 6 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {!subscriberId ? (
            <Alert severity='warning'>Subscriber ID not found. Save your company settings first.</Alert>
          ) : (
            <>
              {/* Booking URL */}
              <Box>
                <Typography variant='subtitle2' sx={{ mb: 1 }}>Your Booking URL</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <CustomTextField
                    fullWidth value={bookingUrl} slotProps={{ input: { readOnly: true } }}
                    sx={{ '& input': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                  />
                  <Tooltip title='Copy URL'>
                    <IconButton onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success('URL copied!') }}>
                      <i className='tabler-copy text-lg' />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* QR Code */}
              <Box>
                <Typography variant='subtitle2' sx={{ mb: 1 }}>QR Code</Typography>
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                  <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <QRCodeSVG value={bookingUrl} size={160} />
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                      Customers can scan this QR code to open your booking page directly on their phone.
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Right-click the QR code to save it as an image, or print it on business cards, flyers, and invoices.
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* Platform instructions */}
              <Box>
                <Typography variant='subtitle2' sx={{ mb: 1 }}>Add to Your Online Presence</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <ShareInstruction
                    icon='tabler-brand-google' title='Google Business Profile'
                    desc='Go to your Google Business Profile → Edit → Add booking link → Paste your URL'
                  />
                  <ShareInstruction
                    icon='tabler-brand-facebook' title='Facebook Page'
                    desc='Go to your Facebook Page → Add Action Button → "Book Now" → Paste your URL'
                  />
                  <ShareInstruction
                    icon='tabler-world' title='Your Website'
                    desc='Add a "Book Online" button that links to your booking URL, or embed it in an iframe'
                  />
                  <ShareInstruction
                    icon='tabler-mail' title='Email Signature'
                    desc='Add your booking URL to your email signature so every email invites customers to book'
                  />
                </Box>
              </Box>
            </>
          )}
        </Box>
      )}

      <Typography variant='caption' color='text.disabled' sx={{ mt: 3, display: 'block', textAlign: 'center' }}>
        Changes are saved automatically
      </Typography>
    </Box>
  )
}

function ShareInstruction({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
      <i className={`${icon} text-xl`} style={{ marginTop: 2 }} />
      <Box>
        <Typography variant='body2' fontWeight={600}>{title}</Typography>
        <Typography variant='caption' color='text.secondary'>{desc}</Typography>
      </Box>
    </Box>
  )
}
