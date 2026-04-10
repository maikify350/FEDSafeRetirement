'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

import ConfirmDialog from '@/components/ConfirmDialog'

// ── US States ───────────────────────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

// ── Types ────────────────────────────────────────────────────────────────────
interface AssignedUser {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface EventRecord {
  id: string
  event_seq: number
  description: string
  notes: string | null
  state_fk: string
  city: string
  event_date: string | null   // ISO date "YYYY-MM-DD"
  event_time: string | null   // "HH:MM"
  duration: number | null     // minutes
  cre_dt: string
  assignedto: AssignedUser | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function userFullName(u: AssignedUser) {
  return `${u.first_name} ${u.last_name}`.trim()
}
function userInitials(u: AssignedUser) {
  return `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase()
}

/** Format "YYYY-MM-DD" → "Apr 10, 2026" */
function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format "HH:MM" → "2:30 PM" */
function fmtTime(t: string | null) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

/** minutes → "1h 30m" */
function fmtDuration(min: number | null) {
  if (!min) return null
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const STATE_CHIP_COLORS: Record<string, string> = {}
const PALETTE = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
let _ci = 0
function stateChipColor(state: string) {
  if (!STATE_CHIP_COLORS[state]) STATE_CHIP_COLORS[state] = PALETTE[_ci++ % PALETTE.length]
  return STATE_CHIP_COLORS[state]
}

// ── Shared input style for native date/time inputs ───────────────────────────
const nativeInputSx = {
  '& input[type="date"], & input[type="time"]': {
    colorScheme: 'light dark',
  },
}

// ── Add Event Dialog ─────────────────────────────────────────────────────────
function AddEventDialog({
  open, users, onClose, onSaved,
}: {
  open: boolean
  users: AssignedUser[]
  onClose: () => void
  onSaved: (event: EventRecord) => void
}) {
  const [description, setDescription]   = useState('')
  const [notes, setNotes]               = useState('')
  const [assignedtoFk, setAssignedtoFk] = useState('')
  const [stateFk, setStateFk]           = useState('')
  const [city, setCity]                 = useState('')
  const [eventDate, setEventDate]       = useState('')   // "YYYY-MM-DD"
  const [eventTime, setEventTime]       = useState('')   // "HH:MM"
  const [duration, setDuration]         = useState('')   // numeric string
  const [saving, setSaving]             = useState(false)
  const [errors, setErrors]             = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) {
      setDescription(''); setNotes(''); setAssignedtoFk('')
      setStateFk(''); setCity(''); setEventDate(''); setEventTime('')
      setDuration(''); setErrors({})
    }
  }, [open])

  const clrErr = (key: string) => setErrors(prev => ({ ...prev, [key]: '' }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!description.trim())           e.description = 'Description is required'
    if (!stateFk)                      e.stateFk     = 'State is required'
    if (!city.trim())                  e.city        = 'City is required'
    if (duration !== '' && (isNaN(Number(duration)) || Number(duration) < 1))
      e.duration = 'Duration must be a positive number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          notes: notes || null,
          assignedto_fk: assignedtoFk || null,
          state_fk: stateFk,
          city,
          event_date: eventDate || null,
          event_time: eventTime || null,
          duration: duration ? Number(duration) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErrors({ _api: data.error || 'Save failed' }); return }
      onSaved(data)
    } catch { setErrors({ _api: 'Network error' }) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth PaperProps={{ sx: { borderRadius: 2.5 } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2,
          bgcolor: 'primary.lighter', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className='tabler-calendar-plus' style={{ fontSize: 18, color: 'var(--mui-palette-primary-main)' }} />
        </Box>
        <Typography variant='h6' fontWeight={700}>Add New Event</Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
        {errors._api && (
          <Box sx={{ bgcolor: 'error.lighter', border: '1px solid', borderColor: 'error.light', borderRadius: 1.5, px: 2, py: 1.5 }}>
            <Typography color='error' variant='body2' fontWeight={500}>{errors._api}</Typography>
          </Box>
        )}

        {/* Description */}
        <TextField
          label='Description *'
          value={description}
          onChange={e => { setDescription(e.target.value); clrErr('description') }}
          fullWidth
          error={!!errors.description}
          helperText={errors.description}
          autoFocus
          placeholder='Brief description of the event'
        />

        {/* Date · Time · Duration row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          {/* Event Date — native date picker */}
          <TextField
            label='Event Date'
            type='date'
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ style: { cursor: 'pointer' } }}
            sx={nativeInputSx}
            size='medium'
            fullWidth
          />

          {/* Event Time — native time picker */}
          <TextField
            label='Event Time'
            type='time'
            value={eventTime}
            onChange={e => setEventTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ style: { cursor: 'pointer' } }}
            sx={nativeInputSx}
            fullWidth
          />

          {/* Duration (minutes) */}
          <TextField
            label='Duration (min)'
            type='number'
            value={duration}
            onChange={e => { setDuration(e.target.value); clrErr('duration') }}
            fullWidth
            error={!!errors.duration}
            helperText={errors.duration}
            placeholder='e.g. 90'
            inputProps={{ min: 1 }}
            InputProps={{
              endAdornment: <InputAdornment position='end'>min</InputAdornment>,
            }}
          />
        </Box>

        {/* State & City row */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth error={!!errors.stateFk}>
            <InputLabel>State *</InputLabel>
            <Select
              value={stateFk}
              onChange={e => { setStateFk(e.target.value); clrErr('stateFk') }}
              label='State *'
            >
              {US_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
            {errors.stateFk && <FormHelperText>{errors.stateFk}</FormHelperText>}
          </FormControl>

          <TextField
            label='City *'
            value={city}
            onChange={e => { setCity(e.target.value); clrErr('city') }}
            fullWidth
            error={!!errors.city}
            helperText={errors.city}
            placeholder='e.g. Chicago'
          />
        </Box>

        {/* Assigned Agent */}
        <FormControl fullWidth>
          <InputLabel>Assign To (optional)</InputLabel>
          <Select value={assignedtoFk} onChange={e => setAssignedtoFk(e.target.value)} label='Assign To (optional)'>
            <MenuItem value=''>
              <Typography color='text.secondary' variant='body2'>— Unassigned —</Typography>
            </MenuItem>
            {users.map(u => (
              <MenuItem key={u.id} value={u.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 26, height: 26, fontSize: 11, bgcolor: 'primary.main' }}>{userInitials(u)}</Avatar>
                  <Box>
                    <Typography variant='body2' fontWeight={600}>{userFullName(u)}</Typography>
                    <Typography variant='caption' color='text.secondary'>{u.email}</Typography>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Notes */}
        <TextField
          label='Notes'
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder='Optional notes about this event'
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant='tonal' color='secondary' disabled={saving}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant='contained'
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : <i className='tabler-check' />}
        >
          {saving ? 'Saving…' : 'Save Event'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Grid column definitions (header labels + widths) ─────────────────────────
const COLS = [
  { label: '#',           w: '56px'  },
  { label: 'Description', w: '1.5fr' },
  { label: 'Date',        w: '130px' },
  { label: 'Time',        w: '96px'  },
  { label: 'Duration',    w: '96px'  },
  { label: 'State',       w: '80px'  },
  { label: 'City',        w: '120px' },
  { label: 'Assigned To', w: '1fr'   },
  { label: 'Notes',       w: '1.2fr' },
  { label: '',            w: '52px'  },
]
const GRID_COLS = COLS.map(c => c.w).join(' ')

// ── Main View ────────────────────────────────────────────────────────────────
export default function EventsView() {
  const [events, setEvents]       = useState<EventRecord[]>([])
  const [users, setUsers]         = useState<AssignedUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [addOpen, setAddOpen]     = useState(false)
  const [delTarget, setDelTarget] = useState<EventRecord | null>(null)
  const [deleting, setDeleting]   = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [er, ur] = await Promise.all([
        fetch('/api/events').then(r => r.json()),
        fetch('/api/agents').then(r => r.json()),
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
      await fetch(`/api/events?id=${delTarget.id}`, { method: 'DELETE' })
      setEvents(prev => prev.filter(e => e.id !== delTarget.id))
      setDelTarget(null)
    } finally { setDeleting(false) }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLowerCase()
    return events.filter(ev =>
      ev.description.toLowerCase().includes(q) ||
      ev.state_fk.toLowerCase().includes(q) ||
      ev.city.toLowerCase().includes(q) ||
      (ev.assignedto ? userFullName(ev.assignedto).toLowerCase().includes(q) : false) ||
      (ev.notes || '').toLowerCase().includes(q)
    )
  }, [events, search])

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: 'auto' }}>

      {/* ── Page Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' fontWeight={700} sx={{ mb: 0.5 }}>Events</Typography>
          <Typography variant='body2' color='text.secondary'>
            Manage and assign events by state and city territory
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            size='small'
            placeholder='Search events…'
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <i className='tabler-search' style={{ fontSize: 16, opacity: 0.5 }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position='end'>
                  <IconButton size='small' onClick={() => setSearch('')}>
                    <i className='tabler-x' style={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={() => setAddOpen(true)}
          >
            + Add Event
          </Button>
        </Box>
      </Box>

      {/* ── Grid / Table ── */}
      <Card variant='outlined' sx={{ borderRadius: 2.5, overflow: 'hidden' }}>

        {/* Table Header */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: GRID_COLS,
          alignItems: 'center',
          px: 2, py: 1.25,
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
          gap: 1,
        }}>
          {COLS.map((c, i) => (
            <Typography key={i} variant='caption' fontWeight={700} color='text.secondary' textTransform='uppercase' letterSpacing={0.5} noWrap>
              {c.label}
            </Typography>
          ))}
        </Box>

        {/* Rows */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%',
              bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className='tabler-calendar-off' style={{ fontSize: 30, opacity: 0.35 }} />
            </Box>
            <Typography color='text.secondary' fontWeight={500}>
              {search ? 'No events match your search' : 'No events yet'}
            </Typography>
            {!search && (
              <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setAddOpen(true)}>
                Add First Event
              </Button>
            )}
          </Box>
        ) : (
          filtered.map((ev, idx) => (
            <Box
              key={ev.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                alignItems: 'center',
                px: 2, py: 1.5,
                gap: 1,
                borderBottom: idx < filtered.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
                transition: 'background .1s ease',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {/* # */}
              <Typography variant='body2' color='text.disabled' fontWeight={700}>{ev.event_seq}</Typography>

              {/* Description */}
              <Typography variant='body2' fontWeight={600} noWrap>{ev.description}</Typography>

              {/* Date */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {ev.event_date ? (
                  <>
                    <i className='tabler-calendar' style={{ fontSize: 14, opacity: 0.4, flexShrink: 0 }} />
                    <Typography variant='body2' noWrap>{fmtDate(ev.event_date)}</Typography>
                  </>
                ) : (
                  <Typography variant='body2' color='text.disabled'>—</Typography>
                )}
              </Box>

              {/* Time */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {ev.event_time ? (
                  <>
                    <i className='tabler-clock' style={{ fontSize: 14, opacity: 0.4, flexShrink: 0 }} />
                    <Typography variant='body2' noWrap>{fmtTime(ev.event_time)}</Typography>
                  </>
                ) : (
                  <Typography variant='body2' color='text.disabled'>—</Typography>
                )}
              </Box>

              {/* Duration */}
              {ev.duration ? (
                <Chip
                  label={fmtDuration(ev.duration)}
                  size='small'
                  icon={<i className='tabler-hourglass' style={{ fontSize: 12 }} />}
                  sx={{ fontSize: 11, height: 22, bgcolor: 'action.selected' }}
                />
              ) : (
                <Typography variant='body2' color='text.disabled'>—</Typography>
              )}

              {/* State */}
              <Chip
                label={ev.state_fk}
                size='small'
                sx={{
                  fontSize: 11, height: 22, fontWeight: 700,
                  bgcolor: stateChipColor(ev.state_fk) + '18',
                  color: stateChipColor(ev.state_fk),
                  border: 'none',
                }}
              />

              {/* City */}
              <Typography variant='body2' noWrap>{ev.city}</Typography>

              {/* Assigned To */}
              {ev.assignedto ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: 'primary.main', flexShrink: 0 }}>
                    {userInitials(ev.assignedto)}
                  </Avatar>
                  <Typography variant='body2' fontWeight={600} noWrap>{userFullName(ev.assignedto)}</Typography>
                </Box>
              ) : (
                <Typography variant='body2' color='text.disabled'>—</Typography>
              )}

              {/* Notes */}
              <Typography variant='body2' color='text.secondary' noWrap>
                {ev.notes || <span style={{ opacity: 0.3 }}>—</span>}
              </Typography>

              {/* Delete */}
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Tooltip title='Delete event'>
                  <IconButton
                    size='small'
                    color='error'
                    onClick={() => setDelTarget(ev)}
                    sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
                  >
                    <i className='tabler-trash' style={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <Box sx={{
            px: 2, py: 1, bgcolor: 'action.hover',
            borderTop: '1px solid', borderColor: 'divider',
          }}>
            <Typography variant='caption' color='text.secondary'>
              Showing {filtered.length} of {events.length} event{events.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        )}
      </Card>

      {/* ── Add Event Dialog ── */}
      <AddEventDialog
        open={addOpen}
        users={users}
        onClose={() => setAddOpen(false)}
        onSaved={(ev) => { setEvents(prev => [...prev, ev]); setAddOpen(false) }}
      />

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDeleteConfirm}
        title='Delete Event'
        message={
          delTarget
            ? `Are you sure you want to delete "${delTarget.description}"? This action cannot be undone.`
            : ''
        }
        confirmLabel='Delete'
        cancelLabel='Cancel'
        confirmColor='error'
        icon='tabler-trash'
        loading={deleting}
      />
    </Box>
  )
}
