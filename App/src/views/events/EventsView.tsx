'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormHelperText from '@mui/material/FormHelperText'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import Card from '@mui/material/Card'
import Avatar from '@mui/material/Avatar'
import Autocomplete from '@mui/material/Autocomplete'

import Divider from '@mui/material/Divider'

import ConfirmDialog from '@/components/ConfirmDialog'
import { createClient } from '@/utils/supabase/client'

// ── US States ─────────────────────────────────────────────────────────────────
const US_STATES: { abbr: string; name: string }[] = [
  { abbr: 'AL', name: 'Alabama' },        { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' },        { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' },     { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' },    { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' },        { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' },         { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' },       { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' },           { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' },       { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' },          { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' },  { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' },      { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' },       { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' },       { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' },  { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' },     { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' }, { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' },           { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' },         { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' },   { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' },   { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' },          { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' },        { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' },     { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' },      { abbr: 'WY', name: 'Wyoming' },
  { abbr: 'DC', name: 'District of Columbia' },
]

const STATE_BY_ABBR = Object.fromEntries(US_STATES.map(s => [s.abbr, s.name]))

// ── Types ─────────────────────────────────────────────────────────────────────
interface AssignedUser {
  id: string
  first_name: string
  last_name: string
  email: string
  color: string | null
}
interface EventRecord {
  id: string
  event_seq: number
  description: string
  notes: string | null
  state_fk: string
  city: string
  event_date: string | null
  event_time: string | null
  duration: number | null
  expected_attendees: number
  expected_guests: number
  flyer_path: string | null
  flyer_filename: string | null
  flyer_uploaded_at: string | null
  flyer_uploaded_by: string | null
  explainer_path: string | null
  explainer_uploaded_at: string | null
  explainer_uploaded_by: string | null
  explainer_speed: number | null
  explainer_voice: string | null
  explainer_provider: string | null
  cre_dt: string
  assignedto: AssignedUser | null
}
interface CityPrediction { place_id: string; description: string; city: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
const userFullName = (u: AssignedUser) => `${u.first_name} ${u.last_name}`.trim()
const userInitials = (u: AssignedUser) => `${u.first_name?.[0]||''}${u.last_name?.[0]||''}`.toUpperCase()
const agentColor   = (u: AssignedUser | null) => u?.color || '#94a3b8'

function fmtDate(d: string | null) {
  if (!d) return null
  
return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(t: string | null) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)

  
return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`
}

function fmtDuration(min: number | null) {
  if (!min) return null
  if (min < 60) return `${min}m`
  const h = Math.floor(min/60), m = min%60

  
return m ? `${h}h ${m}m` : `${h}h`
}

const STATE_CHIP_COLORS: Record<string,string> = {}
const PALETTE = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
let _ci = 0

function stateChipColor(abbr: string) {
  if (!STATE_CHIP_COLORS[abbr]) STATE_CHIP_COLORS[abbr] = PALETTE[_ci++ % PALETTE.length]
  
return STATE_CHIP_COLORS[abbr]
}

const nativeInputSx = { '& input[type="date"], & input[type="time"]': { colorScheme: 'light dark' } }

// ── City Autocomplete ─────────────────────────────────────────────────────────
function CityAutocomplete({ value, onChange, stateName, error, helperText }: {
  value: string; onChange: (v: string)=>void; stateName: string; error?: boolean; helperText?: string
}) {
  const [options, setOptions]   = useState<CityPrediction[]>([])
  const [loading, setLoading]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  const fetchCities = useCallback((input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!input || input.length < 2) { setOptions([]); 

return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)

      try {
        const p = new URLSearchParams({ input })

        if (stateName) p.set('state', stateName)
        const res = await fetch(`/api/places/cities?${p}`)
        const data = await res.json()

        setOptions(data.predictions ?? [])
      } catch { setOptions([]) } finally { setLoading(false) }
    }, 300)
  }, [stateName])

  useEffect(() => { setOptions([]) }, [stateName])

  return (
    <Autocomplete
      freeSolo filterOptions={x=>x} options={options}
      getOptionLabel={o => typeof o === 'string' ? o : o.city}
      inputValue={value}
      onInputChange={(_,v,reason) => { if (reason==='input') { onChange(v); fetchCities(v) }}}
      onChange={(_,v) => { if (v && typeof v !== 'string') onChange((v as CityPrediction).city) }}
      loading={loading}
      noOptionsText={!stateName ? 'Select a state first' : value.length<2 ? 'Type to search…' : 'No cities found'}
      renderOption={(props, option) => (
        <li {...props} key={option.place_id}>
          <i className='tabler-building-community' style={{fontSize:14,marginRight:8,opacity:.5}} />
          <span><strong>{option.city}</strong>
            <span style={{opacity:.55,fontSize:12,marginLeft:6}}>{option.description.split(',').slice(1).join(',').trim()}</span>
          </span>
        </li>
      )}
      renderInput={params => (
        <TextField {...params} label='City *' placeholder={stateName?`Search cities in ${stateName}…`:'Select a state first'}
          disabled={!stateName} error={error} helperText={helperText}
          InputProps={{...params.InputProps, endAdornment:<>{loading&&<CircularProgress size={14} sx={{mr:1}}/>}{params.InputProps.endAdornment}</>}}
        />
      )}
    />
  )
}

// ── Event Form (shared by Add + Edit dialogs) ────────────────────────────────
interface EventFormState {
  description: string; notes: string; assignedtoFk: string
  stateAbbr: string; city: string; eventDate: string; eventTime: string; duration: string
  expectedAttendees: string; expectedGuests: string
}
const EMPTY_FORM: EventFormState = { description:'', notes:'', assignedtoFk:'', stateAbbr:'', city:'', eventDate:'', eventTime:'', duration:'', expectedAttendees:'', expectedGuests:'' }

function EventForm({ form, setForm, users, errors, setErrors, saving }: {
  form: EventFormState
  setForm: React.Dispatch<React.SetStateAction<EventFormState>>
  users: AssignedUser[]
  errors: Record<string,string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string,string>>>
  saving: boolean
}) {
  const clrErr = (k: string) => setErrors(prev => ({...prev, [k]:''}))

  const set = (k: keyof EventFormState) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
    setForm(prev => ({...prev, [k]: e.target.value})); clrErr(k)
  }

  const selectedStateName = form.stateAbbr ? (STATE_BY_ABBR[form.stateAbbr] ?? '') : ''

  return (
    <>
      {errors._api && (
        <Box sx={{bgcolor:'error.lighter',border:'1px solid',borderColor:'error.light',borderRadius:1.5,px:2,py:1.5}}>
          <Typography color='error' variant='body2' fontWeight={500}>{errors._api}</Typography>
        </Box>
      )}
      <TextField label='Description *' value={form.description} onChange={set('description')}
        fullWidth error={!!errors.description} helperText={errors.description} autoFocus
        placeholder='Brief description of the event' />
      <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:2}}>
        <TextField
          label={<>Event Date <Box component='span' sx={{color:'error.main',fontWeight:700}}>*</Box></>}
          type='date' value={form.eventDate}
          onChange={e=>{set('eventDate')(e);clrErr('eventDate')}}
          InputLabelProps={{shrink:true}} sx={nativeInputSx} fullWidth
          error={!!errors.eventDate} helperText={errors.eventDate} />
        <TextField
          label={<>Event Time <Box component='span' sx={{color:'error.main',fontWeight:700}}>*</Box></>}
          type='time' value={form.eventTime}
          onChange={e=>{set('eventTime')(e);clrErr('eventTime')}}
          InputLabelProps={{shrink:true}} sx={nativeInputSx} fullWidth
          error={!!errors.eventTime} helperText={errors.eventTime} />
        <TextField
          label={<>Duration (min) <Box component='span' sx={{color:'error.main',fontWeight:700}}>*</Box></>}
          type='number' value={form.duration}
          onChange={e=>{set('duration')(e);clrErr('duration')}}
          fullWidth error={!!errors.duration} helperText={errors.duration}
          placeholder='e.g. 90' inputProps={{min:1}}
          InputProps={{endAdornment:<InputAdornment position='end'>min</InputAdornment>}} />
      </Box>
      <FormControl fullWidth error={!!errors.stateAbbr}>
        <InputLabel>State *</InputLabel>
        <Select value={form.stateAbbr} label='State *'
          onChange={e => { setForm(prev=>({...prev, stateAbbr: e.target.value, city:''})); clrErr('stateAbbr') }}>
          {US_STATES.map(s=>(
            <MenuItem key={s.abbr} value={s.abbr}>
              <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
                <Typography variant='caption' color='text.disabled' sx={{minWidth:24,fontWeight:700}}>{s.abbr}</Typography>
                {s.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
        {errors.stateAbbr && <FormHelperText>{errors.stateAbbr}</FormHelperText>}
      </FormControl>
      <CityAutocomplete value={form.city} onChange={v=>{setForm(prev=>({...prev,city:v}));clrErr('city')}}
        stateName={selectedStateName} error={!!errors.city} helperText={errors.city} />
      <FormControl fullWidth>
        <InputLabel>Assign To (optional)</InputLabel>
        <Select value={form.assignedtoFk} onChange={e=>setForm(prev=>({...prev,assignedtoFk:e.target.value}))} label='Assign To (optional)'>
          <MenuItem value=''>
            <Typography color='text.secondary' variant='body2'>— Unassigned —</Typography>
          </MenuItem>
          {users.map(u=>(
            <MenuItem key={u.id} value={u.id}>
              <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
                <Avatar style={{width:26,height:26,fontSize:11,backgroundColor:agentColor(u)}}>{userInitials(u)}</Avatar>
                <Typography variant='body2' fontWeight={600}>{userFullName(u)}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2}}>
        <TextField label='Expected Attendees' type='number' value={form.expectedAttendees}
          onChange={set('expectedAttendees')} fullWidth placeholder='e.g. 25'
          inputProps={{min:0}} InputProps={{startAdornment:<InputAdornment position='start'><i className='tabler-users' style={{fontSize:14,opacity:.4}}/></InputAdornment>}} />
        <TextField label='Expected Guests' type='number' value={form.expectedGuests}
          onChange={set('expectedGuests')} fullWidth placeholder='e.g. 10'
          inputProps={{min:0}} InputProps={{startAdornment:<InputAdornment position='start'><i className='tabler-user-plus' style={{fontSize:14,opacity:.4}}/></InputAdornment>}} />
      </Box>
      <TextField label='Notes' value={form.notes} onChange={set('notes')}
        fullWidth multiline rows={3} placeholder='Optional notes about this event' />
    </>
  )
}

function validateEventForm(form: EventFormState) {
  const e: Record<string,string> = {}

  if (!form.description.trim()) e.description = 'Description is required'
  if (!form.eventDate)          e.eventDate   = 'Date is required'
  if (!form.eventTime)          e.eventTime   = 'Time is required'
  if (!form.duration || isNaN(Number(form.duration)) || Number(form.duration) < 1)
    e.duration = 'Duration is required (positive number)'
  if (!form.stateAbbr)          e.stateAbbr   = 'State is required'
  if (!form.city.trim())        e.city        = 'City is required'
  
return e
}

function formToPayload(form: EventFormState) {
  return {
    description: form.description, notes: form.notes || null,
    assignedto_fk: form.assignedtoFk || null,
    state_fk: form.stateAbbr, city: form.city,
    event_date: form.eventDate || null, event_time: form.eventTime || null,
    duration: form.duration ? Number(form.duration) : null,
    expected_attendees: form.expectedAttendees ? Number(form.expectedAttendees) : 0,
    expected_guests: form.expectedGuests ? Number(form.expectedGuests) : 0,
  }
}

// ── Flyer Panel (lives inside the Edit dialog) ────────────────────────────────
function FlyerPanel({ event, isAdmin, onChanged }: {
  event: EventRecord
  isAdmin: boolean
  onChanged: (next: Partial<EventRecord>) => void
}) {
  const [busy, setBusy]   = useState<'upload' | 'remove' | 'preview' | 'download' | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasFlyer = !!event.flyer_path

  const fetchSignedUrls = async () => {
    const res = await fetch(`/api/events/${event.id}/flyer/url`)

    if (!res.ok) throw new Error((await res.json()).error || 'Failed to load flyer')
    
return res.json() as Promise<{ download_url: string; view_url: string; filename: string }>
  }

  const handlePreview = async () => {
    setError(''); setBusy('preview')

    try {
      const { view_url } = await fetchSignedUrls()

      window.open(view_url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      setError(e.message || 'Failed to open flyer')
    } finally { setBusy(null) }
  }

  const handleDownload = async () => {
    setError(''); setBusy('download')

    try {
      const { download_url } = await fetchSignedUrls()

      // Trigger a download via signed URL with `?download=` already set server-side.
      const a = document.createElement('a')

      a.href = download_url
      a.rel  = 'noopener noreferrer'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch (e: any) {
      setError(e.message || 'Failed to download flyer')
    } finally { setBusy(null) }
  }

  const handleUpload = async (file: File) => {
    setError(''); setBusy('upload')

    try {
      const fd = new FormData()

      fd.append('file', file)
      const res = await fetch(`/api/events/${event.id}/flyer`, { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onChanged({
        flyer_path:        data.flyer_path,
        flyer_filename:    data.flyer_filename,
        flyer_uploaded_at: data.flyer_uploaded_at,
      })
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setBusy(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove the attached flyer? This cannot be undone.')) return
    setError(''); setBusy('remove')

    try {
      const res = await fetch(`/api/events/${event.id}/flyer`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Remove failed')
      onChanged({
        flyer_path:        null,
        flyer_filename:    null,
        flyer_uploaded_at: null,
      })
    } catch (e: any) {
      setError(e.message || 'Remove failed')
    } finally { setBusy(null) }
  }

  const fmtFullDate = (iso: string | null) => {
    if (!iso) return null
    
return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  }

  return (
    <Box sx={{
      borderRadius: 1.5,
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'action.hover',
      p: 1.75,
      display: 'flex', flexDirection: 'column', gap: 1,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
        <i className='tabler-file-type-pdf' style={{ fontSize: 18, color: 'var(--mui-palette-error-main)' }} />
        <Typography variant='subtitle2' fontWeight={700}>Flyer</Typography>
        {!isAdmin && (
          <Chip label='Read-only' size='small' variant='outlined'
            sx={{ height: 18, fontSize: 10, ml: 'auto' }} />
        )}
      </Box>

      {hasFlyer ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Typography variant='body2' fontWeight={600} noWrap>
            {event.flyer_filename || 'flyer.pdf'}
          </Typography>
          {event.flyer_uploaded_at && (
            <Typography variant='caption' color='text.secondary'>
              Uploaded {fmtFullDate(event.flyer_uploaded_at)}
            </Typography>
          )}
        </Box>
      ) : (
        <Typography variant='body2' color='text.secondary' fontStyle='italic'>
          No flyer attached yet.
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
        {hasFlyer && (
          <>
            <Button size='small' variant='outlined' onClick={handlePreview} disabled={!!busy}
              startIcon={busy === 'preview' ? <CircularProgress size={12}/> : <i className='tabler-eye' style={{ fontSize: 14 }}/>}>
              Preview
            </Button>
            <Button size='small' variant='outlined' onClick={handleDownload} disabled={!!busy}
              startIcon={busy === 'download' ? <CircularProgress size={12}/> : <i className='tabler-download' style={{ fontSize: 14 }}/>}>
              Download
            </Button>
          </>
        )}
        {isAdmin && (
          <>
            <Button size='small' variant='contained' onClick={() => fileInputRef.current?.click()}
              disabled={!!busy}
              startIcon={busy === 'upload' ? <CircularProgress size={12}/> : <i className={hasFlyer ? 'tabler-replace' : 'tabler-upload'} style={{ fontSize: 14 }}/>}>
              {hasFlyer ? 'Replace…' : 'Upload Flyer'}
            </Button>
            {hasFlyer && (
              <Button size='small' variant='outlined' color='error' onClick={handleRemove} disabled={!!busy}
                startIcon={busy === 'remove' ? <CircularProgress size={12}/> : <i className='tabler-trash' style={{ fontSize: 14 }}/>}>
                Remove
              </Button>
            )}
            <input
              ref={fileInputRef}
              type='file'
              accept='application/pdf,.pdf'
              hidden
              onChange={e => {
                const f = e.target.files?.[0]

                if (f) handleUpload(f)
              }}
            />
          </>
        )}
      </Box>

      {error && (
        <Typography variant='caption' color='error' sx={{ mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  )
}

// ── Explainer Panel ───────────────────────────────────────────────────────────
function ExplainerPanel({ event, isAdmin, onChanged }: {
  event: EventRecord
  isAdmin: boolean
  onChanged: (next: Partial<EventRecord>) => void
}) {
  const [busy, setBusy]   = useState<'generate' | 'remove' | 'load' | 'saveScript' | 'resetScript' | null>(null)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [scriptOpen,   setScriptOpen]   = useState(false)
  const [scriptText,   setScriptText]   = useState('')
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [scriptDirty,  setScriptDirty]  = useState(false)
  const [scriptIsDefault, setScriptIsDefault] = useState(true)
  const [speed,        setSpeed]        = useState(1.0)
  const [voice,        setVoice]        = useState('onyx')
  const [provider,     setProvider]     = useState<'openai' | 'elevenlabs'>('openai')

  const hasExplainer = !!event.explainer_path

  const VOICES_OPENAI = [
    { id: 'onyx',   label: 'Onyx',   desc: 'Deep, authoritative male' },
    { id: 'echo',   label: 'Echo',   desc: 'Neutral, clear male' },
    { id: 'fable',  label: 'Fable',  desc: 'Warm, narrative male' },
  ]


  // ElevenLabs: 5 male + 5 female, mid-age, high quality
  const VOICES_ELEVEN = [
    { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel',  gender: 'm', desc: 'Deep, authoritative' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh',    gender: 'm', desc: 'Natural, conversational' },
    { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold',  gender: 'm', desc: 'Strong, confident' },
    { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam',    gender: 'm', desc: 'Deep, natural' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', label: 'Sam',     gender: 'm', desc: 'Clear, professional' },
    { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel',  gender: 'f', desc: 'Warm, clear' },
    { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi',    gender: 'f', desc: 'Strong, natural' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli',    gender: 'f', desc: 'Confident, expressive' },
    { id: 'oWAxZDx7w5VEj9dCyTzz', label: 'Grace',   gender: 'f', desc: 'Warm, professional' },
    { id: 'LcfcDJNUP1GQjkzn1xUU', label: 'Emily',   gender: 'f', desc: 'Natural, friendly' },
  ]

  // Lazy-load the signed URL the first time the user expands the panel.
  useEffect(() => {
    if (!hasExplainer) { setAudioUrl(null); 

return }

    let cancelled = false

    setBusy('load')
    fetch(`/api/events/${event.id}/explainer/url`)
      .then(r => r.json())
      .then(j => { if (!cancelled && j.url) setAudioUrl(j.url) })
      .catch(() => { if (!cancelled) setError('Failed to load audio') })
      .finally(() => { if (!cancelled) setBusy(null) })
    
return () => { cancelled = true }
  }, [hasExplainer, event.id, event.explainer_uploaded_at])

  // Lazy-load the script the first time the editor is opened.
  const loadScript = async () => {
    try {
      const res = await fetch(`/api/events/${event.id}/explainer/script`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to load script')
      setScriptText(data.script ?? '')
      setScriptIsDefault(!!data.is_default)
      setScriptDirty(false)
      setScriptLoaded(true)
      if (typeof data.speed    === 'number' && data.speed > 0)        setSpeed(data.speed)
      if (typeof data.voice    === 'string' && data.voice.length > 0)    setVoice(data.voice)
      if (data.provider === 'elevenlabs') setProvider('elevenlabs')
      else setProvider('openai')
    } catch (e: any) {
      setError(e.message || 'Failed to load script')
    }
  }

  const handleToggleScript = async () => {
    const next = !scriptOpen

    setScriptOpen(next)
    if (next && !scriptLoaded) await loadScript()
  }

  const handleSaveScript = async () => {
    setError(''); setBusy('saveScript')

    try {
      const res = await fetch(`/api/events/${event.id}/explainer/script`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ script: scriptText, speed, voice, provider }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Save failed')
      setScriptDirty(false)
      setScriptIsDefault(!!data.cleared)
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally { setBusy(null) }
  }

  const handleResetScript = async () => {
    if (!confirm('Reset the script to the default template? Your edits will be lost.')) return
    setError(''); setBusy('resetScript')

    try {
      const res = await fetch(`/api/events/${event.id}/explainer/script`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ script: '' }),
      })

      if (!res.ok) {
        const data = await res.json()

        throw new Error(data.error || 'Reset failed')
      }


      // Re-load to pull the freshly-rebuilt default template.
      await loadScript()
    } catch (e: any) {
      setError(e.message || 'Reset failed')
    } finally { setBusy(null) }
  }

  const handleGenerate = async () => {
    if (hasExplainer && !confirm('Re-generate the explainer? This will overwrite the existing audio and consume TTS credits.')) return
    setError(''); setBusy('generate')

    try {
      // Send the in-memory script + speed if the editor is open so the
      // user gets audio matching exactly what they see (the API also
      // saves them). If unopened, the API uses the saved values.
      const init: RequestInit = { method: 'POST' }

      if (scriptOpen) {
        init.headers = { 'Content-Type': 'application/json' }
        init.body    = JSON.stringify({ script: scriptText, speed, voice, provider })
      }

      const res = await fetch(`/api/events/${event.id}/explainer`, init)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Generation failed')
      onChanged({
        explainer_path:        data.explainer_path,
        explainer_uploaded_at: data.explainer_uploaded_at,
      })
      setScriptDirty(false)
      setScriptIsDefault(false)
    } catch (e: any) {
      setError(e.message || 'Generation failed')
    } finally { setBusy(null) }
  }

  const handleRemove = async () => {
    if (!confirm('Remove the seminar explainer audio? This cannot be undone.')) return
    setError(''); setBusy('remove')

    try {
      const res = await fetch(`/api/events/${event.id}/explainer`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Remove failed')
      onChanged({
        explainer_path:        null,
        explainer_uploaded_at: null,
      })
      setAudioUrl(null)
    } catch (e: any) {
      setError(e.message || 'Remove failed')
    } finally { setBusy(null) }
  }

  const fmtFullDate = (iso: string | null) => {
    if (!iso) return null
    
return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  }

  return (
    <Box sx={{
      borderRadius: 1.5,
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'action.hover',
      p: 1.75,
      display: 'flex', flexDirection: 'column', gap: 1,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
        <i className='tabler-volume' style={{ fontSize: 18, color: 'var(--mui-palette-info-main)' }} />
        <Typography variant='subtitle2' fontWeight={700}>Seminar Explainer Audio</Typography>
        {!isAdmin && (
          <Chip label='Read-only' size='small' variant='outlined'
            sx={{ height: 18, fontSize: 10, ml: 'auto' }} />
        )}
      </Box>

      {hasExplainer ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography variant='caption' color='text.secondary'>
            Generated {fmtFullDate(event.explainer_uploaded_at)}
          </Typography>
          {audioUrl ? (
            <audio
              src={audioUrl}
              controls
              preload='none'
              style={{ width: '100%', height: 36 }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
              <CircularProgress size={14} />
              <Typography variant='caption' color='text.secondary'>Loading audio…</Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Typography variant='body2' color='text.secondary' fontStyle='italic'>
          No explainer audio generated yet.
        </Typography>
      )}

      {isAdmin && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
          <Button
            size='small'
            variant='contained'
            color='info'
            onClick={handleGenerate}
            disabled={!!busy}
            startIcon={busy === 'generate'
              ? <CircularProgress size={12} />
              : <i className={hasExplainer ? 'tabler-refresh' : 'tabler-microphone'} style={{ fontSize: 14 }}/>}
          >
            {busy === 'generate' ? 'Generating…' : hasExplainer ? 'Re-generate' : 'Generate Explainer'}
          </Button>
          <Button
            size='small'
            variant='outlined'
            onClick={handleToggleScript}
            startIcon={<i className={scriptOpen ? 'tabler-chevron-up' : 'tabler-edit'} style={{ fontSize: 14 }}/>}
          >
            {scriptOpen ? 'Hide Script' : 'Edit Script'}
          </Button>
          {hasExplainer && (
            <Button
              size='small'
              variant='outlined'
              color='error'
              onClick={handleRemove}
              disabled={!!busy}
              startIcon={busy === 'remove'
                ? <CircularProgress size={12} />
                : <i className='tabler-trash' style={{ fontSize: 14 }}/>}
            >
              Remove
            </Button>
          )}
        </Box>
      )}

      {scriptOpen && (
        <Box sx={{
          mt: 1,
          p: 1.25,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: '1px dashed',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='caption' fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Script
            </Typography>
            {scriptIsDefault && (
              <Chip label='Default template' size='small' variant='outlined'
                sx={{ height: 18, fontSize: 10 }} />
            )}
            {scriptDirty && (
              <Chip label='Unsaved' size='small' color='warning' variant='filled'
                sx={{ height: 18, fontSize: 10 }} />
            )}
            {(() => {
              const words = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0

              // ~155 wpm at speed=1.0; speed multiplies words-per-second.
              const estSec = words / (2.58 * speed)

              const fmtDur = estSec < 60
                ? `~${Math.round(estSec)} sec`
                : `~${Math.floor(estSec / 60)}m ${String(Math.round(estSec % 60)).padStart(2, '0')}s`

              const cost = (scriptText.length * 0.030 / 1000).toFixed(3)

              
return (
                <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto', textAlign: 'right' }}>
                  {fmtDur} @ {speed.toFixed(2)}× · {words.toLocaleString()} words · {scriptText.length.toLocaleString()} chars · ~${cost}
                </Typography>
              )
            })()}
          </Box>

          {/* Provider selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 0.5 }}>
            <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ minWidth: 56 }}>
              ENGINE
            </Typography>
            {(['openai', 'elevenlabs'] as const).map(p => (
              <Chip
                key={p}
                label={p === 'openai' ? 'OpenAI' : 'ElevenLabs'}
                size='small'
                clickable
                variant={provider === p ? 'filled' : 'outlined'}
                color={provider === p ? 'info' : 'default'}
                onClick={() => {
                  setProvider(p)

                  // Reset to sensible default voice for each engine
                  setVoice(p === 'openai' ? 'onyx' : 'onwK4e9ZLuTAKqWW03F9')
                  setScriptDirty(true)
                }}
                sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
              />
            ))}
            {provider === 'elevenlabs' && (
              <Typography variant='caption' color='text.secondary'>higher quality · speed 0.7–1.2×</Typography>
            )}
          </Box>

          {/* Voice selector — changes based on provider */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, px: 0.5 }}>
            <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ minWidth: 56, pt: 0.4 }}>
              VOICE
            </Typography>
            {provider === 'openai' ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {VOICES_OPENAI.map(v => (
                  <Tooltip key={v.id} title={v.desc}>
                    <Chip
                      label={v.label}
                      size='small'
                      clickable
                      variant={voice === v.id ? 'filled' : 'outlined'}
                      color={voice === v.id ? 'secondary' : 'default'}
                      onClick={() => { setVoice(v.id); setScriptDirty(true) }}
                      sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                    />
                  </Tooltip>
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography variant='caption' color='text.secondary' sx={{ minWidth: 28 }}>♂</Typography>
                  {VOICES_ELEVEN.filter(v => v.gender === 'm').map(v => (
                    <Tooltip key={v.id} title={v.desc}>
                      <Chip
                        label={v.label}
                        size='small'
                        clickable
                        variant={voice === v.id ? 'filled' : 'outlined'}
                        color={voice === v.id ? 'secondary' : 'default'}
                        onClick={() => { setVoice(v.id); setScriptDirty(true) }}
                        sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                      />
                    </Tooltip>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Typography variant='caption' color='text.secondary' sx={{ minWidth: 28 }}>♀</Typography>
                  {VOICES_ELEVEN.filter(v => v.gender === 'f').map(v => (
                    <Tooltip key={v.id} title={v.desc}>
                      <Chip
                        label={v.label}
                        size='small'
                        clickable
                        variant={voice === v.id ? 'filled' : 'outlined'}
                        color={voice === v.id ? 'secondary' : 'default'}
                        onClick={() => { setVoice(v.id); setScriptDirty(true) }}
                        sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Speed control — sits between header and textarea */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 0.5 }}>
            <Typography variant='caption' fontWeight={700} color='text.secondary' sx={{ minWidth: 56 }}>
              SPEED
            </Typography>
            {[1.0, 1.1, 1.2, 1.3, 1.5].map(preset => (
              <Chip
                key={preset}
                label={`${preset.toFixed(preset === 1.0 ? 1 : 1)}×`}
                size='small'
                clickable
                variant={Math.abs(speed - preset) < 0.005 ? 'filled' : 'outlined'}
                color={Math.abs(speed - preset) < 0.005 ? 'primary' : 'default'}
                onClick={() => { setSpeed(preset); setScriptDirty(true) }}
                sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
              />
            ))}
            <TextField
              type='number'
              size='small'
              value={speed.toFixed(2)}
              onChange={e => {
                const n = parseFloat(e.target.value)

                if (Number.isFinite(n)) {
                  const clamped = Math.min(2.0, Math.max(0.5, n))

                  setSpeed(clamped)
                  setScriptDirty(true)
                }
              }}
              inputProps={{ step: 0.05, min: 0.5, max: 2.0 }}
              sx={{ width: 80, '& input': { fontSize: 12, py: 0.5 } }}
            />
            <Typography variant='caption' color='text.secondary'>
              0.5× – 2.0× · OpenAI native
            </Typography>
          </Box>
          {scriptLoaded ? (
            <TextField
              multiline
              minRows={10}
              maxRows={20}
              value={scriptText}
              onChange={e => { setScriptText(e.target.value); setScriptDirty(true) }}
              disabled={!isAdmin}
              fullWidth
              variant='outlined'
              size='small'
              InputProps={{
                sx: {
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                },
              }}
              placeholder='Edit the narration script. Save Draft persists it; Generate Explainer renders it as audio.'
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={14} />
              <Typography variant='caption' color='text.secondary'>Loading script…</Typography>
            </Box>
          )}

          {isAdmin && scriptLoaded && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Button
                size='small'
                variant='contained'
                color='primary'
                onClick={handleSaveScript}
                disabled={!!busy || !scriptDirty}
                startIcon={busy === 'saveScript'
                  ? <CircularProgress size={12} />
                  : <i className='tabler-device-floppy' style={{ fontSize: 14 }}/>}
              >
                {busy === 'saveScript' ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button
                size='small'
                variant='outlined'
                onClick={handleResetScript}
                disabled={!!busy || scriptIsDefault}
                startIcon={busy === 'resetScript'
                  ? <CircularProgress size={12} />
                  : <i className='tabler-rotate' style={{ fontSize: 14 }}/>}
              >
                Reset to Default
              </Button>
              <Typography variant='caption' color='text.secondary' sx={{ alignSelf: 'center', ml: 'auto' }}>
                "Generate" above renders this script to audio.
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {error && (
        <Typography variant='caption' color='error' sx={{ mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  )
}

// ── Add Event Dialog ──────────────────────────────────────────────────────────
function AddEventDialog({ open, users, onClose, onSaved }: {
  open: boolean; users: AssignedUser[]; onClose: ()=>void; onSaved: (ev: EventRecord)=>void
}) {
  const [form, setForm]     = useState<EventFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})

  useEffect(() => { if (!open) { setForm(EMPTY_FORM); setErrors({}) } }, [open])

  const handleSave = async () => {
    const errs = validateEventForm(form)

    if (Object.keys(errs).length) { setErrors(errs); 

return }

    setSaving(true)

    try {
      const res = await fetch('/api/events', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(formToPayload(form)) })
      const data = await res.json()

      if (!res.ok) { setErrors({_api: data.error||'Save failed'}); 

return }

      onSaved(data)
    } catch { setErrors({_api:'Network error'}) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth PaperProps={{sx:{borderRadius:2.5}}}>
      <DialogTitle sx={{pb:1,display:'flex',alignItems:'center',gap:1.5}}>
        <Box sx={{width:36,height:36,borderRadius:2,bgcolor:'primary.lighter',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <i className='tabler-calendar-plus' style={{fontSize:18,color:'var(--mui-palette-primary-main)'}} />
        </Box>
        <Typography variant='h6' fontWeight={700}>Add New Event</Typography>
      </DialogTitle>
      <DialogContent sx={{display:'flex',flexDirection:'column',gap:2.5,pt:'16px !important'}}>
        <EventForm form={form} setForm={setForm} users={users} errors={errors} setErrors={setErrors} saving={saving} />
      </DialogContent>
      <DialogActions sx={{px:3,pb:2.5}}>
        <Button onClick={onClose} variant='tonal' color='secondary' disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant='contained' disabled={saving}
          startIcon={saving ? <CircularProgress size={14}/> : <i className='tabler-check'/>}>
          {saving ? 'Saving…' : 'Save Event'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Edit Event Dialog ─────────────────────────────────────────────────────────
function EditEventDialog({ event, users, isAdmin, onClose, onSaved, onFlyerChanged }: {
  event: EventRecord | null; users: AssignedUser[]; isAdmin: boolean
  onClose: ()=>void
  onSaved: (ev: EventRecord)=>void
  onFlyerChanged: (eventId: string, patch: Partial<EventRecord>) => void
}) {
  const [form, setForm]     = useState<EventFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string,string>>({})

  // Local mirror of the flyer fields so the panel updates without closing
  // the dialog (the form fields use their own local state above).
  const [liveEvent, setLiveEvent] = useState<EventRecord | null>(null)

  useEffect(() => {
    if (event) {
      setForm({
        description:  event.description,
        notes:        event.notes || '',
        assignedtoFk: event.assignedto?.id || '',
        stateAbbr:    event.state_fk,
        city:         event.city,
        eventDate:    event.event_date || '',
        eventTime:    event.event_time ? event.event_time.slice(0,5) : '',
        duration:     event.duration ? String(event.duration) : '',
        expectedAttendees: event.expected_attendees ? String(event.expected_attendees) : '',
        expectedGuests:    event.expected_guests ? String(event.expected_guests) : '',
      })
      setErrors({})
      setLiveEvent(event)
    } else {
      setLiveEvent(null)
    }
  }, [event])

  const handleSave = async () => {
    if (!event) return
    const errs = validateEventForm(form)

    if (Object.keys(errs).length) { setErrors(errs); 

return }

    setSaving(true)

    try {
      const res = await fetch(`/api/events?id=${event.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(formToPayload(form)) })
      const data = await res.json()

      if (!res.ok) { setErrors({_api: data.error||'Save failed'}); 

return }

      onSaved(data)
    } catch { setErrors({_api:'Network error'}) } finally { setSaving(false) }
  }

  return (
    <Dialog open={!!event} onClose={onClose} maxWidth='sm' fullWidth PaperProps={{sx:{borderRadius:2.5,maxWidth:800}}}>
      <DialogTitle sx={{pb:1,display:'flex',alignItems:'center',gap:1.5}}>
        <Box sx={{width:36,height:36,borderRadius:2,bgcolor:'primary.lighter',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <i className='tabler-calendar-edit' style={{fontSize:18,color:'var(--mui-palette-primary-main)'}} />
        </Box>
        <Box sx={{flex:1}}>
          <Typography variant='h6' fontWeight={700}>Edit Event</Typography>
          {event && <Typography variant='caption' color='text.secondary'>#{event.event_seq}</Typography>}
        </Box>
        <IconButton onClick={onClose} size='small' sx={{color:'text.secondary'}}>
          <i className='tabler-x' style={{fontSize:18}} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{display:'flex',flexDirection:'column',gap:2.5,pt:'16px !important'}}>
        <EventForm form={form} setForm={setForm} users={users} errors={errors} setErrors={setErrors} saving={saving} />
        {liveEvent && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <FlyerPanel
              event={liveEvent}
              isAdmin={isAdmin}
              onChanged={(patch) => {
                setLiveEvent(prev => prev ? { ...prev, ...patch } : prev)
                onFlyerChanged(liveEvent.id, patch)
              }}
            />
            <ExplainerPanel
              event={liveEvent}
              isAdmin={isAdmin}
              onChanged={(patch) => {
                setLiveEvent(prev => prev ? { ...prev, ...patch } : prev)
                onFlyerChanged(liveEvent.id, patch)
              }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{px:3,pb:2.5}}>
        <Button onClick={handleSave} variant='contained' disabled={saving}
          startIcon={saving ? <CircularProgress size={14}/> : <i className='tabler-check'/>}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Year Calendar Dialog ──────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW    = ['Su','Mo','Tu','We','Th','Fr','Sa']

function getDaysInMonth(year: number, month: number) { return new Date(year, month+1, 0).getDate() }

function getFirstDow(year: number, month: number)    { return new Date(year, month, 1).getDay() }

function YearCalendarDialog({ open, events, onClose, onEventClick }: {
  open: boolean; events: EventRecord[]; onClose: ()=>void; onEventClick: (ev: EventRecord)=>void
}) {
  const [year, setYear] = useState(() => new Date().getFullYear())

  // Build a map: "YYYY-MM-DD" → EventRecord[]
  const eventsByDate = useMemo(() => {
    const map: Record<string, EventRecord[]> = {}

    events.forEach(ev => {
      if (!ev.event_date) return
      if (!map[ev.event_date]) map[ev.event_date] = []
      map[ev.event_date].push(ev)
    })
    
return map
  }, [events])

  return (
    <Dialog open={open} onClose={onClose} maxWidth='lg' fullWidth PaperProps={{sx:{borderRadius:2.5,overflow:'hidden'}}}>
      <DialogTitle sx={{display:'flex',alignItems:'center',justifyContent:'space-between',pb:1,borderBottom:'1px solid',borderColor:'divider'}}>
        <Box sx={{display:'flex',alignItems:'center',gap:1.5}}>
          <Box sx={{width:34,height:34,borderRadius:2,bgcolor:'primary.lighter',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className='tabler-calendar-month' style={{fontSize:18,color:'var(--mui-palette-primary-main)'}} />
          </Box>
          <Typography variant='h6' fontWeight={700}>Event Calendar</Typography>
        </Box>
        <Box sx={{display:'flex',alignItems:'center',gap:1}}>
          <IconButton size='small' onClick={()=>setYear(y=>y-1)}><i className='tabler-chevron-left'/></IconButton>
          <Typography variant='h6' fontWeight={700} sx={{minWidth:52,textAlign:'center'}}>{year}</Typography>
          <IconButton size='small' onClick={()=>setYear(y=>y+1)}><i className='tabler-chevron-right'/></IconButton>
          <IconButton size='small' onClick={onClose} sx={{ml:1}}><i className='tabler-x'/></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{p:2.5}}>
        {/* 4×3 month grid */}
        <Box sx={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:2}}>
          {MONTHS.map((monthName, mIdx) => {
            const days = getDaysInMonth(year, mIdx)
            const firstDow = getFirstDow(year, mIdx)

            const cells: (number|null)[] = [
              ...Array(firstDow).fill(null),
              ...Array.from({length: days},(_,i)=>i+1),
            ]


            // Pad to complete last week
            while (cells.length % 7 !== 0) cells.push(null)

            return (
              <Box key={mIdx} sx={{border:'1px solid',borderColor:'divider',borderRadius:1.5,overflow:'hidden'}}>
                {/* Month header */}
                <Box sx={{bgcolor:'action.hover',px:1.5,py:0.75,borderBottom:'1px solid',borderColor:'divider'}}>
                  <Typography variant='caption' fontWeight={700} textTransform='uppercase' letterSpacing={0.5}>
                    {monthName}
                  </Typography>
                </Box>
                {/* DOW headers */}
                <Box sx={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',px:0.5,pt:0.5}}>
                  {DOW.map(d=>(
                    <Typography key={d} variant='caption' textAlign='center' color='text.disabled'
                      sx={{fontSize:9,fontWeight:700,lineHeight:'18px'}}>
                      {d}
                    </Typography>
                  ))}
                </Box>
                {/* Day cells */}
                <Box sx={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',px:0.5,pb:0.5,gap:'2px'}}>
                  {cells.map((day, ci) => {
                    if (!day) return <Box key={ci} sx={{height:48}} />
                    const dateKey = `${year}-${String(mIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                    const dayEvents = eventsByDate[dateKey] || []
                    const isToday = dateKey === new Date().toISOString().slice(0,10)

                    return (
                      <Box key={ci} sx={{
                        minHeight:48, display:'flex', flexDirection:'column',
                        alignItems:'center', justifyContent:'flex-start', pt:'3px',
                        borderRadius:1, position:'relative',
                        bgcolor: isToday ? 'primary.lighter' : undefined,
                      }}>
                        <Typography variant='caption' sx={{
                          fontSize:10, lineHeight:1, fontWeight: isToday ? 700 : 400,
                          color: isToday ? 'primary.main' : 'text.primary',
                          mb:'3px',
                        }}>
                          {day}
                        </Typography>
                        {/* Colored circles for events */}
                        {dayEvents.length > 0 && (
                          <Box sx={{display:'flex',gap:'2px',flexWrap:'wrap',justifyContent:'center',maxWidth:'100%',px:'1px'}}>
                            {dayEvents.slice(0,3).map(ev => (
                              <Tooltip key={ev.id} arrow title={
                                <div style={{lineHeight:1.6}}>
                                  <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{ev.description}</div>
                                  {ev.assignedto && <div style={{fontSize:11,opacity:.85}}>{userFullName(ev.assignedto)}</div>}
                                  {ev.event_time && <div style={{fontSize:11,opacity:.85}}>{fmtTime(ev.event_time)}</div>}
                                  <div style={{fontSize:11,opacity:.75}}>{ev.city}, {ev.state_fk}</div>
                                </div>
                              }>
                                <Box
                                  onClick={() => { onEventClick(ev) }}
                                  sx={{
                                    width:20, height:20, borderRadius:'50%',
                                    bgcolor: agentColor(ev.assignedto),
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    cursor:'pointer', flexShrink:0,
                                    boxShadow:'0 1px 3px rgba(0,0,0,.25)',
                                    '&:hover': { transform:'scale(1.15)', zIndex:10, boxShadow:'0 2px 6px rgba(0,0,0,.35)' },
                                    transition:'transform .15s, box-shadow .15s',
                                  }}
                                >
                                  <Typography sx={{fontSize:7,fontWeight:700,color:'#fff',lineHeight:1,userSelect:'none'}}>
                                    {ev.assignedto ? userInitials(ev.assignedto) : '?'}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            ))}
                            {dayEvents.length > 3 && (
                              <Box sx={{
                                width:20,height:20,borderRadius:'50%',
                                bgcolor:'action.selected',display:'flex',
                                alignItems:'center',justifyContent:'center',flexShrink:0,
                              }}>
                                <Typography sx={{fontSize:7,fontWeight:700,color:'text.secondary',lineHeight:1}}>
                                  +{dayEvents.length-3}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            )
          })}
        </Box>

        {/* Legend — agent colors */}
        <Box sx={{mt:2.5,pt:2,borderTop:'1px solid',borderColor:'divider'}}>
          <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{mb:1,display:'block'}}>
            AGENT LEGEND
          </Typography>
          <Box sx={{display:'flex',flexWrap:'wrap',gap:2}}>
            {/* Collect unique assigned agents from events */}
            {Array.from(
              new Map(
                events.filter(ev=>ev.assignedto).map(ev=>[ev.assignedto!.id, ev.assignedto!])
              ).values()
            ).map(agent=>(
              <Box key={agent.id} sx={{display:'flex',alignItems:'center',gap:0.75}}>
                <Box sx={{width:10,height:10,borderRadius:'50%',bgcolor:agentColor(agent),flexShrink:0}} />
                <Typography variant='caption'>{userFullName(agent)}</Typography>
              </Box>
            ))}
            {events.some(ev=>!ev.assignedto) && (
              <Box sx={{display:'flex',alignItems:'center',gap:0.75}}>
                <Box sx={{width:10,height:10,borderRadius:'50%',bgcolor:'#94a3b8',flexShrink:0}} />
                <Typography variant='caption' color='text.secondary'>Unassigned</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

// ── Grid columns ──────────────────────────────────────────────────────────────
const COLS = [
  {label:'#',           w:'56px'},
  {label:'Description', w:'2.5fr'},
  {label:'Date',        w:'130px'},
  {label:'State',       w:'80px'},
  {label:'City',        w:'130px'},
  {label:'Assigned To', w:'1fr'},

  {label:'',            w:'88px'},   // edit + delete
]

const GRID_COLS = COLS.map(c=>c.w).join(' ')

// ── Main View ─────────────────────────────────────────────────────────────────
export default function EventsView() {
  const [events, setEvents]       = useState<EventRecord[]>([])
  const [users, setUsers]         = useState<AssignedUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [addOpen, setAddOpen]     = useState(false)
  const [editEvent, setEditEvent] = useState<EventRecord|null>(null)
  const [calOpen, setCalOpen]     = useState(false)
  const [delTarget, setDelTarget] = useState<EventRecord|null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [isAdmin, setIsAdmin]     = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return

      const { data: row } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (row?.role === 'admin') setIsAdmin(true)
    })
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)

    try {
      const [er, ur] = await Promise.all([
        fetch('/api/events').then(r=>r.json()),
        fetch('/api/agents').then(r=>r.json()),
      ])

      if (Array.isArray(er)) setEvents(er)
      if (Array.isArray(ur)) setUsers(ur)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDeleteConfirm = async () => {
    if (!delTarget) return
    setDeleting(true)

    try {
      await fetch(`/api/events?id=${delTarget.id}`, {method:'DELETE'})
      setEvents(prev=>prev.filter(e=>e.id!==delTarget.id))
      setDelTarget(null)
    } finally { setDeleting(false) }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase()

    
return events.filter(ev =>
      ev.description.toLowerCase().includes(q) ||
      ev.state_fk.toLowerCase().includes(q) ||
      (STATE_BY_ABBR[ev.state_fk]??'').toLowerCase().includes(q) ||
      ev.city.toLowerCase().includes(q) ||
      (ev.assignedto ? userFullName(ev.assignedto).toLowerCase().includes(q) : false) ||
      (ev.notes||'').toLowerCase().includes(q)
    )
  }, [events, search])

  return (
    <Box sx={{p:{xs:2,md:4},maxWidth:1600,mx:'auto'}}>

      {/* Header */}
      <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',mb:4,flexWrap:'wrap',gap:2}}>
        <Box>
          <Typography variant='h4' fontWeight={700} sx={{mb:.5}}>Events</Typography>
          <Typography variant='body2' color='text.secondary'>Manage and assign events by state and city territory</Typography>
        </Box>
        <Box sx={{display:'flex',alignItems:'center',gap:2}}>
          <TextField size='small' placeholder='Search events…' value={search} onChange={e=>setSearch(e.target.value)} sx={{minWidth:240}}
            InputProps={{
              startAdornment:<InputAdornment position='start'><i className='tabler-search' style={{fontSize:16,opacity:.5}}/></InputAdornment>,
              endAdornment: search ? <InputAdornment position='end'><IconButton size='small' onClick={()=>setSearch('')}><i className='tabler-x' style={{fontSize:14}}/></IconButton></InputAdornment> : undefined,
            }}
          />
          {/* Calendar toggle */}
          <Tooltip title='View Year Calendar'>
            <IconButton
              onClick={()=>setCalOpen(true)}
              sx={{
                bgcolor:'action.hover', borderRadius:1.5,
                border:'1px solid', borderColor:'divider',
                '&:hover':{bgcolor:'primary.lighter', borderColor:'primary.main', color:'primary.main'},
                transition:'all .15s',
              }}
            >
              <i className='tabler-calendar-month' style={{fontSize:20}}/>
            </IconButton>
          </Tooltip>
          <Button variant='contained' startIcon={<i className='tabler-plus'/>} onClick={()=>setAddOpen(true)}>
            + Add Event
          </Button>
        </Box>
      </Box>

      {/* Grid */}
      <Card variant='outlined' sx={{borderRadius:2.5,overflow:'hidden'}}>
        <Box sx={{display:'grid',gridTemplateColumns:GRID_COLS,alignItems:'center',px:2,py:1.25,
          bgcolor:'action.hover',borderBottom:'1px solid',borderColor:'divider',gap:1}}>
          {COLS.map((c,i)=>(
            <Typography key={i} variant='caption' fontWeight={700} color='text.secondary'
              textTransform='uppercase' letterSpacing={.5} noWrap>{c.label}</Typography>
          ))}
        </Box>

        {loading ? (
          <Box sx={{display:'flex',justifyContent:'center',alignItems:'center',py:10}}><CircularProgress/></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',py:10,gap:2}}>
            <Box sx={{width:64,height:64,borderRadius:'50%',bgcolor:'action.hover',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className='tabler-calendar-off' style={{fontSize:30,opacity:.35}}/>
            </Box>
            <Typography color='text.secondary' fontWeight={500}>
              {search ? 'No events match your search' : 'No events yet'}
            </Typography>
            {!search && <Button variant='contained' startIcon={<i className='tabler-plus'/>} onClick={()=>setAddOpen(true)}>Add First Event</Button>}
          </Box>
        ) : (
          filtered.map((ev,idx)=>(
            <Box key={ev.id} onDoubleClick={()=>setEditEvent(ev)} sx={{
              display:'grid',gridTemplateColumns:GRID_COLS,alignItems:'center',
              px:2,py:1.5,gap:1,cursor:'pointer',
              borderBottom: idx<filtered.length-1 ? '1px solid' : 'none',
              borderColor:'divider',transition:'background .1s ease',
              '&:hover':{bgcolor:'action.hover'},
            }}>
              {/* # — colored by agent */}
              <Box sx={{display:'flex',alignItems:'center',gap:.75}}>
                <Box sx={{width:4,height:24,borderRadius:2,bgcolor:agentColor(ev.assignedto),flexShrink:0}}/>
                <Typography variant='body2' color='text.disabled' fontWeight={700}>{ev.event_seq}</Typography>
              </Box>

              <Typography variant='body2' fontWeight={600} noWrap>{ev.description}</Typography>

              <Box sx={{display:'flex',alignItems:'center',gap:.75}}>
                {ev.event_date
                  ? <><i className='tabler-calendar' style={{fontSize:13,opacity:.4}}/><Typography variant='body2' noWrap>{fmtDate(ev.event_date)}</Typography></>
                  : <Typography variant='body2' color='text.disabled'>—</Typography>}
              </Box>

              <Chip label={ev.state_fk} size='small'
                sx={{fontSize:11,height:22,fontWeight:700,maxWidth:'100%',
                  bgcolor:stateChipColor(ev.state_fk)+'18',color:stateChipColor(ev.state_fk),border:'none'}} />

              <Typography variant='body2' noWrap>{ev.city}</Typography>

              {ev.assignedto ? (
                <Box sx={{display:'flex',alignItems:'center',gap:1}}>
                  <Avatar sx={{width:24,height:24,fontSize:10,bgcolor:agentColor(ev.assignedto),flexShrink:0}}>
                    {userInitials(ev.assignedto)}
                  </Avatar>
                  <Typography variant='body2' fontWeight={600} noWrap>{userFullName(ev.assignedto)}</Typography>
                </Box>
              ) : <Typography variant='body2' color='text.disabled'>—</Typography>}



              {/* Edit + Delete */}
              <Box sx={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:.5}}>
                <Tooltip title='Edit event'>
                  <IconButton size='small' onClick={()=>setEditEvent(ev)}
                    sx={{opacity:.5,'&:hover':{opacity:1,color:'primary.main'}}}>
                    <i className='tabler-pencil' style={{fontSize:15}}/>
                  </IconButton>
                </Tooltip>
                <Tooltip title='Delete event'>
                  <IconButton size='small' color='error' onClick={()=>setDelTarget(ev)}
                    sx={{opacity:.5,'&:hover':{opacity:1}}}>
                    <i className='tabler-trash' style={{fontSize:15}}/>
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))
        )}

        {!loading && filtered.length > 0 && (
          <Box sx={{px:2,py:1,bgcolor:'action.hover',borderTop:'1px solid',borderColor:'divider'}}>
            <Typography variant='caption' color='text.secondary'>
              Showing {filtered.length} of {events.length} event{events.length!==1?'s':''}
            </Typography>
          </Box>
        )}
      </Card>

      {/* Dialogs */}
      <AddEventDialog open={addOpen} users={users} onClose={()=>setAddOpen(false)}
        onSaved={ev=>{setEvents(prev=>[...prev,ev]);setAddOpen(false)}} />

      <EditEventDialog
        event={editEvent}
        users={users}
        isAdmin={isAdmin}
        onClose={()=>setEditEvent(null)}
        onSaved={updated=>{setEvents(prev=>prev.map(e=>e.id===updated.id?updated:e))}}
        onFlyerChanged={(eventId, patch) => {
          setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...patch } : e))
        }}
      />

      <YearCalendarDialog open={calOpen} events={events} onClose={()=>setCalOpen(false)}
        onEventClick={ev=>{setCalOpen(false);setEditEvent(ev)}} />

      <ConfirmDialog open={!!delTarget} onClose={()=>setDelTarget(null)} onConfirm={handleDeleteConfirm}
        title='Delete Event'
        message={delTarget?`Are you sure you want to delete "${delTarget.description}"? This action cannot be undone.`:''}
        confirmLabel='Delete' cancelLabel='Cancel' confirmColor='error' icon='tabler-trash' loading={deleting} />
    </Box>
  )
}
