'use client'

/**
 * EchoLeadsView — Seminar registrations captured by the AI phone agent.
 *
 * Built on the shared EntityListView grid (client-side mode — small dataset)
 * so it gets column sort / move / filter, density, column picker, export and
 * bulk-select for free. Echo-lead-specific bits live here:
 *   • Event link (echo_leads.event_id → events) + derived assigned agent
 *   • Event / Assigned-user filter combos (ANDed with the search box)
 *   • Listen-to-recording audio player
 *   • Edit dialog (double-click row or pencil) and delete (red trash)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'

import { createColumnHelper } from '@tanstack/react-table'

import EntityListView from '@/components/EntityListView'
import ConfirmDialog from '@/components/ConfirmDialog'
import { createClient } from '@/utils/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssignedUser {
  id: string
  first_name: string
  last_name: string
  email: string
  color: string | null
}

interface EventLite {
  id: string
  event_seq: number
  description: string
  city: string
  state_fk: string
  event_date: string | null
  assignedto: AssignedUser | null
}

interface EchoLead {
  id: string
  call_id: string
  call_date: string | null
  agent_name: string | null
  caller_phone: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  conference_location: string | null
  estimated_retirement_year: string | null
  guest_name: string | null
  guest_is_fed_employee: boolean | null
  call_summary: string | null
  call_duration_seconds: number | null
  call_score: number | null
  call_quality: string | null
  recording_url: string | null
  parse_confidence: string | null
  notes: string | null
  event_id: string | null
  cre_dt: string
  cre_by?: string
  mod_dt?: string
  mod_by?: string
  version_no?: number
}

// Echo lead enriched with its linked event (joined in memory by event_id)
type EnrichedEchoLead = EchoLead & { _event: EventLite | null }

// ── Helpers ─────────────────────────────────────────────────────────────────

const leadName = (l: { first_name: string | null; last_name: string | null; caller_phone: string | null }) =>
  [l.first_name, l.last_name].filter(Boolean).join(' ') || l.caller_phone || ''

const eventLabel = (e: EventLite) =>
  `#${e.event_seq} · ${e.description}${e.city ? ` (${e.city}, ${e.state_fk})` : ''}`

const userFullName = (u: AssignedUser) => `${u.first_name} ${u.last_name}`.trim()
const userInitials = (u: AssignedUser) => `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase()

// Normalize the embedded assignedto (PostgREST may hand back an array)
const normEvent = (e: any): EventLite => ({
  id: e.id,
  event_seq: e.event_seq,
  description: e.description,
  city: e.city,
  state_fk: e.state_fk,
  event_date: e.event_date,
  assignedto: Array.isArray(e.assignedto) ? (e.assignedto[0] ?? null) : (e.assignedto ?? null),
})

const confidenceColor = (c: string | null) =>
  c === 'high' ? 'success' : c === 'medium' ? 'warning' : 'default'

const locationColor = (loc: string | null) =>
  loc?.includes('Lexington') ? '#3b82f6' : loc?.includes('Greenville') ? '#10b981' : '#94a3b8'

const fmtDuration = (s: number | null) => {
  if (!s) return '—'
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString() : '—'

const columnHelper = createColumnHelper<EnrichedEchoLead>()

// ── Audio Player Dialog ───────────────────────────────────────────────────────

function AudioPlayerDialog({ lead, onClose }: { lead: EchoLead; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying]       = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)

  const name = leadName(lead) || 'Unknown'

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onLoaded  = () => {
      setDuration(audio.duration)
      setLoading(false)
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }
    const onTime    = () => setCurrentTime(audio.currentTime)
    const onEnded   = () => setPlaying(false)
    const onError   = () => { setError(true); setLoading(false) }
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else         { audio.play();  setPlaying(true)  }
  }

  const handleSeek = (_: Event, val: number | number[]) => {
    const t = val as number
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-phone-call' style={{ fontSize: 20, color: '#6366f1' }} />
          <Box>
            <Typography variant='subtitle1' fontWeight={700}>{name}</Typography>
            <Typography variant='caption' color='text.secondary'>
              {lead.conference_location ?? 'Unknown location'} &nbsp;·&nbsp;
              {lead.call_date ? new Date(lead.call_date).toLocaleDateString() : ''}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Hidden audio element */}
        <audio ref={audioRef} src={lead.recording_url!} preload='metadata' />

        {/* Player UI */}
        {error ? (
          <Box sx={{ py: 3, textAlign: 'center', color: 'error.main' }}>
            <i className='tabler-alert-circle' style={{ fontSize: 32 }} />
            <Typography mt={1}>Recording unavailable</Typography>
          </Box>
        ) : (
          <Box sx={{ px: 1 }}>
            {/* Play / Pause */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <IconButton
                onClick={togglePlay}
                disabled={loading}
                sx={{
                  width: 52, height: 52,
                  background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                  color: '#fff',
                  '&:hover': { background: 'linear-gradient(135deg,#4f46e5,#6366f1)' },
                  '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
                }}
              >
                {loading
                  ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                  : <i className={playing ? 'tabler-player-pause-filled' : 'tabler-player-play-filled'} style={{ fontSize: 22 }} />
                }
              </IconButton>

              <Box sx={{ flex: 1 }}>
                <Slider
                  min={0} max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={loading || duration === 0}
                  size='small'
                  sx={{ color: '#6366f1', '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
                  <Typography variant='caption' color='text.secondary'>{fmt(currentTime)}</Typography>
                  <Typography variant='caption' color='text.secondary'>{fmt(duration)}</Typography>
                </Box>
              </Box>
            </Box>

            {/* Summary */}
            {lead.call_summary && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant='caption' color='text.secondary' fontWeight={600} display='block' mb={0.5}>
                  AI SUMMARY
                </Typography>
                <Typography variant='body2'>{lead.call_summary}</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {lead.recording_url && (
          <Button
            component='a'
            href={lead.recording_url}
            download
            startIcon={<i className='tabler-download' />}
            size='small'
          >
            Download
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Edit Lead Dialog ──────────────────────────────────────────────────────────

function EditLeadDialog({
  lead,
  events,
  onClose,
  onSave,
}: {
  lead: EchoLead
  events: EventLite[]
  onClose: () => void
  onSave: (updated: EchoLead) => void
}) {
  const [form, setForm] = useState<EchoLead>({ ...lead })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const set = (field: keyof EchoLead, value: any) =>
    setForm(prev => ({ ...prev, [field]: value === '' ? null : value }))

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('echo_leads')
      .update({
        first_name:                form.first_name,
        last_name:                 form.last_name,
        email:                     form.email,
        phone:                     form.phone,
        address:                   form.address,
        city:                      form.city,
        state:                     form.state,
        zip:                       form.zip,
        conference_location:       form.conference_location,
        estimated_retirement_year: form.estimated_retirement_year,
        guest_name:                form.guest_name,
        guest_is_fed_employee:     form.guest_is_fed_employee,
        event_id:                  form.event_id,
        notes:                     form.notes,
        call_summary:              form.call_summary,
        mod_by:                    user?.email ?? 'portal',
        // mod_dt + version_no are bumped automatically by trg_echo_leads_mod_dt
      })
      .eq('id', lead.id)

    setSaving(false)
    if (!error) onSave(form)
  }

  const name = leadName(lead) || 'Unknown'

  return (
    <Dialog open onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-edit' style={{ fontSize: 20, color: '#6366f1' }} />
          <Box>
            <Typography variant='subtitle1' fontWeight={700}>Edit Lead — {name}</Typography>
            <Typography variant='caption' color='text.secondary'>
              {lead.call_date ? new Date(lead.call_date).toLocaleDateString() : ''} &nbsp;·&nbsp; Double-click any row to edit
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {/* Name */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='First Name'
              value={form.first_name ?? ''} onChange={e => set('first_name', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='Last Name'
              value={form.last_name ?? ''} onChange={e => set('last_name', e.target.value)} />
          </Grid>

          {/* Contact */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='Email'
              value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='Phone'
              value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
          </Grid>

          {/* Address */}
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size='small' label='Street Address'
              value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth size='small' label='City'
              value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField fullWidth size='small' label='State'
              value={form.state ?? ''} onChange={e => set('state', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size='small' label='ZIP'
              value={form.zip ?? ''} onChange={e => set('zip', e.target.value)} />
          </Grid>

          <Grid size={{ xs: 12 }}><Divider /></Grid>

          {/* Seminar */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth size='small' label='Conference Location'
              value={form.conference_location ?? ''}
              onChange={e => set('conference_location', e.target.value)}>
              <MenuItem value=''>— Unknown —</MenuItem>
              <MenuItem value='Lexington, Kentucky'>Lexington, Kentucky</MenuItem>
              <MenuItem value='Greenville, South Carolina'>Greenville, South Carolina</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='Est. Retirement Year'
              value={form.estimated_retirement_year ?? ''} onChange={e => set('estimated_retirement_year', e.target.value)} />
          </Grid>

          {/* Event link → carries the assigned agent */}
          <Grid size={{ xs: 12 }}>
            <TextField select fullWidth size='small' label='Linked Event'
              value={form.event_id ?? ''}
              onChange={e => set('event_id', e.target.value)}
              helperText='The assigned agent is derived from the linked event.'>
              <MenuItem value=''>— Not linked —</MenuItem>
              {events.map(ev => (
                <MenuItem key={ev.id} value={ev.id}>
                  {eventLabel(ev)}{ev.assignedto ? ` — ${userFullName(ev.assignedto)}` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Guest */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size='small' label='Guest Name'
              value={form.guest_name ?? ''} onChange={e => set('guest_name', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.guest_is_fed_employee ?? false}
                  onChange={e => set('guest_is_fed_employee', e.target.checked)}
                  size='small'
                />
              }
              label='Guest is Federal Employee'
            />
          </Grid>

          <Grid size={{ xs: 12 }}><Divider /></Grid>

          {/* Notes & Summary */}
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size='small' label='Notes' multiline rows={2}
              value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size='small' label='Call Summary' multiline rows={3}
              value={form.call_summary ?? ''} onChange={e => set('call_summary', e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant='contained'
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-device-floppy' />}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────────

export default function EchoLeadsView() {
  const supabase = createClient()
  const [leads, setLeads]         = useState<EchoLead[]>([])
  const [events, setEvents]       = useState<EventLite[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [eventFilter, setEventFilter] = useState('')   // event_id
  const [userFilter, setUserFilter]   = useState('')   // assigned user id
  const [playingLead, setPlayingLead] = useState<EchoLead | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [confirmLead, setConfirmLead] = useState<EchoLead | null>(null)
  const [editingLead, setEditingLead] = useState<EchoLead | null>(null)
  const [syncing, setSyncing]         = useState(false)
  const [syncResult, setSyncResult]   = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('echo_leads')
      .select('*')
      .order('call_date', { ascending: false })
      .limit(500)
    setLeads((data ?? []) as EchoLead[])
    setLoading(false)
  }, [supabase])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      if (Array.isArray(data)) setEvents(data.map(normEvent))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchLeads(); fetchEvents() }, [fetchLeads, fetchEvents])

  const runSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res  = await fetch('/api/echowin/sync', { method: 'POST' })
      const data = await res.json()
      setSyncResult(`Synced ${data.synced} · Skipped ${data.skipped} · Errors ${data.errors}`)
      await fetchLeads()
    } catch {
      setSyncResult('Sync failed — check console')
    } finally {
      setSyncing(false)
    }
  }

  const saveEditedLead = (updated: EchoLead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    setEditingLead(null)
  }

  const deleteLead = async (lead: EchoLead) => {
    setDeletingId(lead.id)
    await Promise.all([
      supabase.from('echo_leads').delete().eq('id', lead.id),
      supabase.from('echo_leads_blocked').upsert({ call_id: lead.call_id }, { onConflict: 'call_id' }),
    ])
    setLeads(prev => prev.filter(l => l.id !== lead.id))
    setConfirmLead(null)
    setDeletingId(null)
  }

  // ── Join events into leads + build filter option lists ────────────────────
  const eventMap = useMemo(() => new Map(events.map(e => [e.id, e])), [events])

  const enriched = useMemo<EnrichedEchoLead[]>(
    () => leads.map(l => ({ ...l, _event: l.event_id ? eventMap.get(l.event_id) ?? null : null })),
    [leads, eventMap]
  )

  // Participant (linked-lead) count per event
  const leadCountByEvent = useMemo(() => {
    const m = new Map<string, number>()
    leads.forEach(l => { if (l.event_id) m.set(l.event_id, (m.get(l.event_id) ?? 0) + 1) })
    return m
  }, [leads])

  // Venue combo lists every event (with its participant count); the agent combo
  // lists every agent assigned to an event. Both come from the full events
  // roster so the filters are usable even before any lead is linked.
  const eventOptions = events

  const userOptions = useMemo(() => {
    const m = new Map<string, AssignedUser>()
    events.forEach(e => { if (e.assignedto) m.set(e.assignedto.id, e.assignedto) })
    return [...m.values()].sort((a, b) => userFullName(a).localeCompare(userFullName(b)))
  }, [events])

  // Event + Assigned-user filters are ANDed; the grid's search box / column
  // filters then apply on top of this pre-filtered set.
  const filteredData = useMemo(
    () => enriched.filter(l =>
      (!eventFilter || l.event_id === eventFilter) &&
      (!userFilter  || l._event?.assignedto?.id === userFilter)
    ),
    [enriched, eventFilter, userFilter]
  )

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    columnHelper.accessor('call_date', {
      id: 'call_date', header: 'Date', size: 160,
      cell: ({ getValue }) => {
        const v = getValue()
        return (
          <Typography className='text-sm' color='text.secondary'>
            {v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
          </Typography>
        )
      },
    }),
    // When the record was ingested into our system (audit trail — shows calls
    // are being captured daily, nothing missed).
    columnHelper.accessor('cre_dt', {
      id: 'cre_dt', header: 'Received', size: 170,
      cell: ({ getValue }) => {
        const v = getValue()
        return (
          <Typography className='text-sm' color='text.secondary'>
            {v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
          </Typography>
        )
      },
    }),
    columnHelper.accessor(row => [row.first_name, row.last_name].filter(Boolean).join(' '), {
      id: 'name', header: 'Name', size: 150,
      cell: ({ getValue }) => {
        const n = getValue()
        // No parsed name → show a muted placeholder, not the phone (the Phone
        // column already shows it). Unparsed rows are incomplete/failed calls.
        return n
          ? <Typography className='text-sm' fontWeight={500}>{n}</Typography>
          : <Typography className='text-sm' color='text.disabled'>Unknown</Typography>
      },
    }),
    columnHelper.accessor(row => row.phone || row.caller_phone || '', {
      id: 'phone', header: 'Phone', size: 140,
      cell: ({ getValue }) => <Typography className='text-sm'>{getValue() || '—'}</Typography>,
    }),
    columnHelper.accessor('email', {
      id: 'email', header: 'Email', size: 200,
      cell: ({ getValue }) => <Typography className='text-sm' noWrap>{getValue() || '—'}</Typography>,
    }),
    columnHelper.accessor(row => [row.address, row.city, row.state, row.zip].filter(Boolean).join(', '), {
      id: 'address', header: 'Address', size: 220,
      cell: ({ getValue }) => <Typography className='text-sm' noWrap>{getValue() || '—'}</Typography>,
    }),
    columnHelper.accessor('conference_location', {
      id: 'conference_location', header: 'Conference', size: 140,
      cell: ({ getValue }) => {
        const loc = getValue()
        return loc ? (
          <Chip
            label={loc.split(',')[0]}
            size='small'
            sx={{
              background: locationColor(loc) + '20',
              color: locationColor(loc),
              fontWeight: 600, fontSize: 11,
              border: `1px solid ${locationColor(loc)}40`,
            }}
          />
        ) : <Typography className='text-sm' color='text.disabled'>—</Typography>
      },
    }),
    columnHelper.accessor(row => row._event ? eventLabel(row._event) : '', {
      id: 'event', header: 'Event', size: 200,
      cell: ({ row }) => {
        const ev = row.original._event
        return ev
          ? <Typography className='text-sm' noWrap>{`#${ev.event_seq} · ${ev.description}`}</Typography>
          : <Typography className='text-sm' color='text.disabled'>—</Typography>
      },
    }),
    columnHelper.accessor(row => row._event?.assignedto ? userFullName(row._event.assignedto) : '', {
      id: 'assigned_user', header: 'Assigned To', size: 170,
      cell: ({ row }) => {
        const u = row.original._event?.assignedto
        if (!u) return <Typography className='text-sm' color='text.disabled'>—</Typography>
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: u.color || '#94a3b8' }}>
              {userInitials(u)}
            </Avatar>
            <Typography className='text-sm' noWrap>{userFullName(u)}</Typography>
          </Box>
        )
      },
    }),
    columnHelper.accessor('estimated_retirement_year', {
      id: 'estimated_retirement_year', header: 'Ret. Year', size: 100,
      cell: ({ getValue }) => <Typography className='text-sm'>{getValue() || '—'}</Typography>,
    }),
    columnHelper.accessor('guest_name', {
      id: 'guest_name', header: 'Guest', size: 150,
      cell: ({ row }) => {
        const g = row.original.guest_name
        return g
          ? <Tooltip title={row.original.guest_is_fed_employee ? 'Federal employee' : 'Non-federal'}><span>{g}</span></Tooltip>
          : <Typography className='text-sm' color='text.disabled'>—</Typography>
      },
    }),
    columnHelper.accessor('call_duration_seconds', {
      id: 'call_duration_seconds', header: 'Duration', size: 100,
      cell: ({ getValue }) => <Typography className='text-sm' color='text.secondary'>{fmtDuration(getValue())}</Typography>,
    }),
    columnHelper.accessor('parse_confidence', {
      id: 'parse_confidence', header: 'Confidence', size: 110,
      cell: ({ getValue }) => (
        <Chip
          label={getValue() ?? '—'}
          size='small'
          color={confidenceColor(getValue()) as any}
          variant='outlined'
          sx={{ fontSize: 11, height: 22 }}
        />
      ),
    }),
    columnHelper.display({
      id: 'listen', header: 'Listen', size: 80,
      enableSorting: false, enableColumnFilter: false,
      cell: ({ row }) => row.original.recording_url ? (
        <Tooltip title='Listen to call recording'>
          <IconButton
            size='small'
            onClick={(e) => { e.stopPropagation(); setPlayingLead(row.original) }}
            sx={{
              background: 'linear-gradient(135deg,#6366f1,#818cf8)',
              color: '#fff', width: 30, height: 30,
              '&:hover': { background: 'linear-gradient(135deg,#4f46e5,#6366f1)', transform: 'scale(1.1)' },
              transition: 'all 0.15s',
            }}
          >
            <i className='tabler-player-play-filled' style={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      ) : <Typography className='text-sm' color='text.disabled'>—</Typography>,
    }),
  ], [])

  // ── Export ──────────────────────────────────────────────────────────────
  const exportRows = (rows: EnrichedEchoLead[]) => rows.map(r => ({
    date: r.call_date, name: leadName(r), phone: r.phone || r.caller_phone || '',
    email: r.email || '', address: [r.address, r.city, r.state, r.zip].filter(Boolean).join(', '),
    conference: r.conference_location || '',
    event: r._event ? eventLabel(r._event) : '',
    assigned_to: r._event?.assignedto ? userFullName(r._event.assignedto) : '',
    retirement_year: r.estimated_retirement_year || '', guest: r.guest_name || '',
    duration_seconds: r.call_duration_seconds ?? '', confidence: r.parse_confidence || '',
  }))

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const exportToCsv = (rows: EnrichedEchoLead[]) => {
    const recs = exportRows(rows)
    if (recs.length === 0) return
    const headers = Object.keys(recs[0])
    const csv = [
      headers.join(','),
      ...recs.map(r => headers.map(h => `"${String((r as any)[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    downloadBlob(csv, `echo_leads_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;')
  }

  const exportToJson = (rows: EnrichedEchoLead[]) =>
    downloadBlob(JSON.stringify(exportRows(rows), null, 2), `echo_leads_${new Date().toISOString().slice(0, 10)}.json`, 'application/json')

  // ── Filter combo chips (Event + Assigned user) ────────────────────────────
  const filterChips = (
    <Box className='flex flex-wrap items-center gap-2'>
      <Select
        size='small'
        displayEmpty
        value={eventFilter}
        onChange={(e) => setEventFilter(e.target.value)}
        renderValue={(val) => {
          const ev = eventOptions.find(o => o.id === val)
          return ev
            ? <span>{`#${ev.event_seq} · ${ev.description}`}</span>
            : <span style={{ color: 'var(--mui-palette-text-secondary)' }}>All Events</span>
        }}
        sx={{ height: 32, fontSize: 13, minWidth: 200 }}
      >
        <MenuItem value=''><em>All Events</em></MenuItem>
        {eventOptions.map(ev => (
          <MenuItem key={ev.id} value={ev.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, width: '100%' }}>
              <span>{eventLabel(ev)}</span>
              <Chip
                label={leadCountByEvent.get(ev.id) ?? 0}
                size='small'
                color='primary'
                variant='tonal'
                sx={{ height: 18, fontSize: 11, fontWeight: 600, '& .MuiChip-label': { px: 0.75 } }}
              />
            </Box>
          </MenuItem>
        ))}
      </Select>

      <Select
        size='small'
        displayEmpty
        value={userFilter}
        onChange={(e) => setUserFilter(e.target.value)}
        renderValue={(val) => {
          const u = userOptions.find(o => o.id === val)
          return u
            ? <span>{userFullName(u)}</span>
            : <span style={{ color: 'var(--mui-palette-text-secondary)' }}>All Agents</span>
        }}
        sx={{ height: 32, fontSize: 13, minWidth: 180 }}
      >
        <MenuItem value=''><em>All Agents</em></MenuItem>
        {userOptions.map(u => (
          <MenuItem key={u.id} value={u.id}>{userFullName(u)}</MenuItem>
        ))}
      </Select>

      {(eventFilter || userFilter) && (
        <Chip
          icon={<i className='tabler-x text-sm' />}
          label='Clear filters'
          size='small'
          variant='outlined'
          onClick={() => { setEventFilter(''); setUserFilter('') }}
          sx={{ cursor: 'pointer' }}
        />
      )}
    </Box>
  )

  // ── Sync / Refresh toolbar buttons ────────────────────────────────────────
  const toolbarActions = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {syncResult && <Typography variant='caption' color='text.secondary'>{syncResult}</Typography>}
      <Tooltip title='Pull new calls from echowin'>
        <span>
          <Button
            variant='outlined' size='small'
            startIcon={syncing ? <CircularProgress size={14} /> : <i className='tabler-cloud-download' />}
            onClick={runSync} disabled={syncing}
            sx={{ height: '100%' }}
          >
            {syncing ? 'Syncing…' : 'Sync Calls'}
          </Button>
        </span>
      </Tooltip>
      <Tooltip title='Refresh'>
        <IconButton
          size='small'
          onClick={() => { fetchLeads(); fetchEvents() }}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
        >
          <i className='tabler-refresh text-xl' />
        </IconButton>
      </Tooltip>
    </Box>
  )

  return (
    <>
      <EntityListView<EnrichedEchoLead>
        columns={columns as any}
        data={filteredData}
        title='Echo Leads'
        storageKey='fs-echo-leads'
        isLoading={loading}
        defaultSorting={[{ id: 'call_date', desc: true }]}
        // Date (call_date) now shows time and covers the "calls arriving" view;
        // Received (cre_dt) is the ingestion audit field — hidden by default,
        // toggleable in the column picker.
        defaultColVisibility={{ cre_dt: false }}
        filterChips={filterChips}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search name, phone, email, location…'
        toolbarActions={toolbarActions}
        onExportCsv={exportToCsv}
        onExportJson={exportToJson}
        emptyMessage={loading ? 'Loading…' : 'No leads yet. Calls will appear here after the webhook fires.'}
        onRowDoubleClick={(lead) => setEditingLead(lead)}
        onRowEdit={(lead) => setEditingLead(lead)}
        onRowDelete={(lead) => setConfirmLead(lead)}
      />

      {/* Edit Lead Dialog */}
      {editingLead && (
        <EditLeadDialog
          lead={editingLead}
          events={events}
          onClose={() => setEditingLead(null)}
          onSave={saveEditedLead}
        />
      )}

      {/* Audio Player Dialog */}
      {playingLead && (
        <AudioPlayerDialog
          lead={playingLead}
          onClose={() => setPlayingLead(null)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmLead}
        onClose={() => !deletingId && setConfirmLead(null)}
        onConfirm={() => confirmLead && deleteLead(confirmLead)}
        title='Delete record?'
        message={
          <Typography variant='body2'>
            This will permanently remove the record for{' '}
            <strong>{confirmLead ? (leadName(confirmLead) || 'this call') : ''}</strong>. This cannot be undone.
          </Typography>
        }
        confirmLabel='Delete'
        confirmColor='error'
        icon='tabler-trash'
        loading={!!deletingId}
      />
    </>
  )
}
