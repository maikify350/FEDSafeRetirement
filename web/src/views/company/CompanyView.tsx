'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'

import CustomTextField from '@core/components/mui/TextField'
import SectionHeader from '@/components/SectionHeader'
import AuditFooter from '@/components/AuditFooter'
import MultiPhoneSection, { type PhoneEntry } from '@/components/MultiPhoneSection'
import MultiEmailSection, { type EmailEntry } from '@/components/MultiEmailSection'
import MultiAddressSection, { type AddressEntry } from '@/components/MultiAddressSection'
import { api } from '@/lib/api'
import { getThumbUrl } from '@/lib/imageUtils'
import type { Company } from '@shared/contracts'

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const fmtDay = (d: string) => d.charAt(0).toUpperCase() + d.slice(1)

type TradeType  = { id: string; value: string }
type LookupItem = { id: string; value: string; label: string; isDefault?: boolean; abbreviation?: string }

function isValidUrl(v: string) {
  try { new URL(v.startsWith('http') ? v : `https://${v}`); return true } catch { return false }
}

/**
 * Company profile settings view with addresses, phones, emails, and social media links.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/company/CompanyView.tsx
 */
export default function CompanyView() {
  const queryClient = useQueryClient()

  const { data: company, isLoading, isError } = useQuery<Company>({
    queryKey: ['company'],
    queryFn: () => api.get('/api/company'),
  })

  // ── Lookups ──────────────────────────────────────────────────────────────
  const { data: tradeTypes       = [] } = useQuery<TradeType[]>({ queryKey: ['lookups', 'trade'],            queryFn: () => api.get('/api/lookups/trade') })
  const { data: phoneTypes       = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'phoneType'],       queryFn: () => api.get('/api/lookups/phoneType') })
  const { data: emailTypes       = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'emailType'],       queryFn: () => api.get('/api/lookups/emailType') })
  const { data: addressTypes     = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'addressType'],     queryFn: () => api.get('/api/lookups/addressType') })
  const { data: usStates         = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'usState'],         queryFn: () => api.get('/api/lookups/usState') })
  const { data: canadianProvinces= [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'canadianProvince'],queryFn: () => api.get('/api/lookups/canadianProvince') })
  const { data: mexicanStates    = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'mexicanState'],    queryFn: () => api.get('/api/lookups/mexicanState') })
  const { data: countries        = [] } = useQuery<LookupItem[]>({ queryKey: ['lookups', 'country'],         queryFn: () => api.get('/api/lookups/country') })

  // ── Form state ───────────────────────────────────────────────────────────
  const [name,                 setName]                = useState('')
  const [dba,                  setDba]                 = useState('')
  const [websiteUrl,           setWebsiteUrl]          = useState('')
  const [tradeTypeId,          setTradeTypeId]         = useState('')
  const [taxIdName,            setTaxIdName]           = useState('')
  const [taxIdNumber,          setTaxIdNumber]         = useState('')
  const [fin,                  setFin]                 = useState('')
  const [stateId,              setStateId]             = useState('')
  const [timeZone,             setTimeZone]            = useState('America/New_York')
  const [firstDayOfWeek,       setFirstDayOfWeek]      = useState('monday')
  const [defaultQuoteValidity, setDefaultQuoteValidity] = useState('30')
  const [facebookUrl,          setFacebookUrl]         = useState('')
  const [instagramUrl,         setInstagramUrl]        = useState('')
  const [xUrl,                 setXUrl]                = useState('')
  const [yelpUrl,              setYelpUrl]             = useState('')
  const [googleBusinessUrl,    setGoogleBusinessUrl]   = useState('')
  const [youtubeUrl,           setYoutubeUrl]          = useState('')
  const [contractorDisclaimer, setContractorDisclaimer] = useState('')
  const [defaultQuoteTerms,    setDefaultQuoteTerms]   = useState('')
  const [phones,               setPhones]              = useState<PhoneEntry[]>([])
  const [emails,               setEmails]              = useState<EmailEntry[]>([])
  const [addresses,            setAddresses]           = useState<AddressEntry[]>([])
  const [photoUrl,             setPhotoUrl]            = useState('')
  const [iconUrl,              setIconUrl]             = useState('')
  const [uploadingPhoto,       setUploadingPhoto]      = useState(false)
  const [uploadingIcon,        setUploadingIcon]       = useState(false)
  const [savedOk,              setSavedOk]             = useState(false)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const iconInputRef  = useRef<HTMLInputElement>(null)

  // ── Populate on load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!company) return
    setName(company.name || '')
    setDba(company.dba || '')
    setWebsiteUrl(company.websiteUrl || '')
    setTradeTypeId(company.tradeTypeId || '')
    setTaxIdName(company.taxIdName || '')
    setTaxIdNumber(company.taxIdNumber || '')
    setFin(company.fin || '')
    setStateId(company.stateId || '')
    setTimeZone(company.timeZone || 'America/New_York')
    setFirstDayOfWeek(company.firstDayOfWeek || 'monday')
    setDefaultQuoteValidity(String(company.defaultQuoteValidity ?? 30))
    setFacebookUrl(company.facebookUrl || '')
    setInstagramUrl(company.instagramUrl || '')
    setXUrl(company.xUrl || '')
    setYelpUrl(company.yelpUrl || '')
    setGoogleBusinessUrl(company.googleBusinessUrl || '')
    setYoutubeUrl(company.youtubeUrl || '')
    setContractorDisclaimer(company.contractorDisclaimer || '')
    setDefaultQuoteTerms(company.defaultQuoteTerms || '')
    setPhotoUrl(company.photoUrl || '')
    setIconUrl(company.iconUrl || '')

    setPhones((company.phones ?? []).map((p: any) => ({
      id: p.id, number: p.number, typeId: p.typeId || '', isDefault: p.isDefault,
    })))
    setEmails((company.emails ?? []).map((e: any) => ({
      id: e.id, address: e.address, typeId: e.typeId || '', customLabel: e.customLabel, isDefault: e.isDefault,
    })))
    setAddresses((company.addresses ?? []).map((a: any) => ({
      id: a.id, addressTypeId: a.addressTypeId || '', street: a.street || '', street2: a.street2 || '',
      city: a.city || '', stateId: a.stateId || null, zipCode: a.zipCode || '', countryId: a.countryId || '', isDefault: a.isDefault,
    })))
  }, [company])

  // ── Image upload ─────────────────────────────────────────────────────────
  const uploadImage = async (file: File, type: 'photo' | 'icon') => {
    const setter = type === 'photo' ? setUploadingPhoto : setUploadingIcon
    const urlSet = type === 'photo' ? setPhotoUrl       : setIconUrl
    setter(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('category', type === 'photo' ? 'company_photo' : 'company_icon')
      const data = await api.post<{ url: string; filename: string }>('/api/upload/file', form)
      const url = data.url || ''
      urlSet(url)
      // Auto-save the image URL to company immediately
      if (url) {
        const field = type === 'photo' ? 'photoUrl' : 'iconUrl'
        await api.patch('/api/company', { [field]: url })
        queryClient.invalidateQueries({ queryKey: ['company'] })
      }
    } catch (e) { console.error('Image upload failed', e) }
    finally { setter(false) }
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data: any) => api.patch('/api/company', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      name:                 name.trim(),
      dba:                  dba.trim()       || undefined,
      websiteUrl:           websiteUrl.trim()|| undefined,
      tradeTypeId:          tradeTypeId      || undefined,
      taxIdName:            taxIdName.trim() || undefined,
      taxIdNumber:          taxIdNumber.trim()|| undefined,
      fin:                  fin.trim()       || undefined,
      stateId:              stateId.trim()   || undefined,
      timeZone,
      firstDayOfWeek,
      defaultQuoteValidity: parseInt(defaultQuoteValidity) || 30,
      facebookUrl:          facebookUrl.trim()        || undefined,
      instagramUrl:         instagramUrl.trim()       || undefined,
      xUrl:                 xUrl.trim()               || undefined,
      yelpUrl:              yelpUrl.trim()            || undefined,
      googleBusinessUrl:    googleBusinessUrl.trim()  || undefined,
      youtubeUrl:           youtubeUrl.trim()         || undefined,
      contractorDisclaimer: contractorDisclaimer.trim()|| undefined,
      defaultQuoteTerms:    defaultQuoteTerms.trim()  || undefined,
      photoUrl:             photoUrl  || undefined,
      iconUrl:              iconUrl   || undefined,
      phones:   phones.map(p => ({ id: p.id, number: p.number, typeId: p.typeId, isDefault: p.isDefault })),
      emails:   emails.map(e => ({ id: e.id, address: e.address, typeId: e.typeId, customLabel: e.customLabel, isDefault: e.isDefault })),
      addresses: addresses.map(a => ({ id: a.id, addressTypeId: a.addressTypeId, street: a.street, street2: a.street2, city: a.city, stateId: a.stateId, zipCode: a.zipCode, countryId: a.countryId, isDefault: a.isDefault })),
    })
  }

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
  if (isError)   return <Alert severity='error' sx={{ m: 3 }}>Failed to load Company Settings. Check your backend connection.</Alert>

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', px: 3, py: 3 }}>

      {/* Hidden file inputs */}
      <input ref={photoInputRef} type='file' accept='image/*' style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'photo'); e.target.value = '' }} />
      <input ref={iconInputRef}  type='file' accept='image/*' style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'icon');  e.target.value = '' }} />

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant='h5' fontWeight={700}>Company Settings</Typography>
          <Typography variant='body2' color='text.secondary'>Business identity, contact info, and defaults</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {savedOk && <Typography variant='body2' color='success.main'>Saved!</Typography>}
          {saveMutation.isError && <Typography variant='body2' color='error.main'>Save failed</Typography>}
          <Button variant='contained' onClick={handleSave} disabled={saveMutation.isPending}
            startIcon={saveMutation.isPending ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}>
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* ── Business Info ── */}
      <SectionHeader>Business Info</SectionHeader>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 280px' }}>
          <CustomTextField fullWidth label='Company Name' required value={name} onChange={e => setName(e.target.value)} />
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <CustomTextField fullWidth label='DBA (Doing Business As)' value={dba} onChange={e => setDba(e.target.value)} />
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <CustomTextField select fullWidth label='Primary Trade' value={tradeTypeId} onChange={e => setTradeTypeId(e.target.value)}>
            <MenuItem value=''>— None —</MenuItem>
            {tradeTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.value}</MenuItem>)}
          </CustomTextField>
        </Box>
        <Box sx={{ flex: '1 1 260px' }}>
          <CustomTextField fullWidth label='Website URL' value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
            InputProps={{ endAdornment: websiteUrl && isValidUrl(websiteUrl) ? (
              <InputAdornment position='end'>
                <Tooltip title='Open website'>
                  <IconButton size='small' component='a'
                    href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                    target='_blank' rel='noopener noreferrer' onClick={e => e.stopPropagation()}>
                    <i className='tabler-external-link text-base' />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : undefined }}
          />
        </Box>
      </Box>

      {/* ── Tax & Legal IDs ── */}
      <SectionHeader>Tax & Legal IDs</SectionHeader>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'nowrap' }}>
        <Box sx={{ flex: '1 1 160px' }}>
          <CustomTextField select fullWidth label='State of Incorporation' value={stateId} onChange={e => setStateId(e.target.value)}>
            <MenuItem value=''>— None —</MenuItem>
            {usStates.map(s => <MenuItem key={s.id} value={s.id}>{s.abbreviation ? `${s.abbreviation} — ${s.value}` : s.value}</MenuItem>)}
          </CustomTextField>
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <CustomTextField fullWidth label='Tax ID Name (e.g. EIN)' value={taxIdName} onChange={e => setTaxIdName(e.target.value)} />
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <CustomTextField fullWidth label='Tax ID Number' value={taxIdNumber} onChange={e => setTaxIdNumber(e.target.value)} />
        </Box>
        <Box sx={{ flex: '1 1 200px' }}>
          <CustomTextField fullWidth label='FIN' value={fin} onChange={e => setFin(e.target.value)} />
        </Box>
      </Box>

      {/* ── Contact — phones, emails, addresses ── */}
      <MultiPhoneSection phones={phones} onChange={setPhones} phoneTypes={phoneTypes} minRequired={1} />
      <MultiEmailSection emails={emails} onChange={setEmails} emailTypes={emailTypes} minRequired={1} />
      <MultiAddressSection
        addresses={addresses} onChange={setAddresses}
        addressTypes={addressTypes} usStates={usStates}
        canadianProvinces={canadianProvinces} mexicanStates={mexicanStates} countries={countries}
      />

      {/* ── Defaults ── */}
      <SectionHeader>Defaults</SectionHeader>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 200px' }}>
          <CustomTextField fullWidth label='Time Zone' value={timeZone} onChange={e => setTimeZone(e.target.value)} placeholder='America/New_York' />
        </Box>
        <Box sx={{ flex: '1 1 180px' }}>
          <CustomTextField select fullWidth label='First Day of Week' value={firstDayOfWeek} onChange={e => setFirstDayOfWeek(e.target.value)}>
            {DAYS_OF_WEEK.map(d => <MenuItem key={d} value={d}>{fmtDay(d)}</MenuItem>)}
          </CustomTextField>
        </Box>
        <Box sx={{ flex: '1 1 180px' }}>
          <CustomTextField fullWidth label='Quote Validity (days)' type='number' value={defaultQuoteValidity} onChange={e => setDefaultQuoteValidity(e.target.value)} />
        </Box>
      </Box>

      {/* ── Social Media ── */}
      <SectionHeader>Social Media</SectionHeader>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {[
          { label: 'Facebook',       value: facebookUrl,       set: setFacebookUrl,       icon: 'tabler-brand-facebook' },
          { label: 'Instagram',      value: instagramUrl,      set: setInstagramUrl,      icon: 'tabler-brand-instagram' },
          { label: 'X (Twitter)',    value: xUrl,              set: setXUrl,              icon: 'tabler-brand-x' },
          { label: 'Yelp',           value: yelpUrl,           set: setYelpUrl,           icon: 'tabler-brand-yelp' },
          { label: 'Google Business',value: googleBusinessUrl, set: setGoogleBusinessUrl, icon: 'tabler-brand-google' },
          { label: 'YouTube',        value: youtubeUrl,        set: setYoutubeUrl,        icon: 'tabler-brand-youtube' },
        ].map(({ label, value, set, icon }) => (
          <Box key={label} sx={{ flex: '1 1 260px' }}>
            <CustomTextField fullWidth label={label} value={value} onChange={e => set(e.target.value)}
              InputProps={{
                startAdornment: <i className={`${icon} text-textSecondary mr-2`} />,
                endAdornment: value && isValidUrl(value) ? (
                  <InputAdornment position='end'>
                    <Tooltip title={`Open ${label}`}>
                      <IconButton size='small' component='a'
                        href={value.startsWith('http') ? value : `https://${value}`}
                        target='_blank' rel='noopener noreferrer' onClick={e => e.stopPropagation()}>
                        <i className='tabler-external-link text-base' />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : undefined,
              }}
            />
          </Box>
        ))}
      </Box>

      {/* ── Legal / Terms ── */}
      <SectionHeader>Legal & Terms</SectionHeader>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        <CustomTextField fullWidth multiline minRows={3} label='Contractor Disclaimer' value={contractorDisclaimer} onChange={e => setContractorDisclaimer(e.target.value)} />
        <CustomTextField fullWidth multiline minRows={3} label='Default Quote Terms' value={defaultQuoteTerms} onChange={e => setDefaultQuoteTerms(e.target.value)} />
      </Box>

      {/* ── Logo & Icon ── */}
      <SectionHeader>Logo &amp; Icon</SectionHeader>
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        {/* Company Photo — 16:9 */}
        <Box sx={{ flex: '1 1 420px' }}>
          <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>Company Photo (16:9)</Typography>
          <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%', bgcolor: 'background.default', borderRadius: 2, border: '1px dashed', borderColor: 'divider', overflow: 'hidden' }}>
            {photoUrl
              ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={getThumbUrl(photoUrl, { width: 800, height: 450, resize: 'cover' })} alt='Company banner' style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /></>
              : <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className='tabler-photo text-4xl text-textDisabled' />
                </Box>
            }
            <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 1 }}>
              <Tooltip title='Upload from device'>
                <IconButton size='small' onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
                  sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}>
                  {uploadingPhoto ? <CircularProgress size={18} /> : <i className='tabler-upload text-base' />}
                </IconButton>
              </Tooltip>
              {photoUrl && (
                <Tooltip title='Remove'>
                  <IconButton size='small' onClick={() => setPhotoUrl('')}
                    sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}>
                    <i className='tabler-trash text-base text-error' />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>
        {/* Company Icon — 1:1 */}
        <Box sx={{ flex: '0 0 180px' }}>
          <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>Company Icon (square)</Typography>
          <Box sx={{ position: 'relative', width: 180, height: 180, bgcolor: 'background.default', borderRadius: 2, border: '1px dashed', borderColor: 'divider', overflow: 'hidden' }}>
            {iconUrl
              ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={getThumbUrl(iconUrl, { width: 180, height: 180, resize: 'cover' })} alt='Company emblem' style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></>
              : <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className='tabler-building text-4xl text-textDisabled' />
                </Box>
            }
            <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 1 }}>
              <Tooltip title='Upload from device'>
                <IconButton size='small' onClick={() => iconInputRef.current?.click()} disabled={uploadingIcon}
                  sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}>
                  {uploadingIcon ? <CircularProgress size={18} /> : <i className='tabler-upload text-base' />}
                </IconButton>
              </Tooltip>
              {iconUrl && (
                <Tooltip title='Remove'>
                  <IconButton size='small' onClick={() => setIconUrl('')}
                    sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}>
                    <i className='tabler-trash text-base text-error' />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />
      {company && <AuditFooter creAt={company.creAt} creBy={company.creBy} modAt={company.modAt} modBy={company.modBy} />}
    </Box>
  )
}
