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
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import Avatar from '@mui/material/Avatar'
import Collapse from '@mui/material/Collapse'
import Badge from '@mui/material/Badge'
import Checkbox from '@mui/material/Checkbox'
import LinearProgress from '@mui/material/LinearProgress'
import Fade from '@mui/material/Fade'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

// ── Countdown Hook ────────────────────────────────────────────────────────────
function useCountdown(eventDate: string | null, eventTime: string | null) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!eventDate || !eventTime) return null
  const target = new Date(`${eventDate}T${eventTime}`)
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return 'LIVE'
  const hrs = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}`
}

// ── Compact Stat Pill ─────────────────────────────────────────────────────────
function StatPill({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <Box sx={{
      py: 0.5, px: 0.5, borderRadius: 2, textAlign: 'center',
      background: `linear-gradient(135deg, ${color}10 0%, ${color}22 100%)`,
      border: `1px solid ${color}33`,
    }}>
      <Typography variant='h6' fontWeight={800} sx={{ color, lineHeight: 1.2, fontSize: 18 }}>{value}</Typography>
      <Typography variant='caption' fontWeight={600} color='text.secondary' sx={{ fontSize: 8, lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  )
}

// ── Countdown Badge ───────────────────────────────────────────────────────────
function CountdownBadge({ eventDate, eventTime }: { eventDate: string | null; eventTime: string | null }) {
  const countdown = useCountdown(eventDate, eventTime)
  if (!countdown) return null
  const isLive = countdown === 'LIVE'
  return (
    <Box sx={{
      px: 1, py: 0.25, borderRadius: 1.5, ml: 1, whiteSpace: 'nowrap',
      bgcolor: isLive ? '#10b98120' : '#6366f118',
      border: `1px solid ${isLive ? '#10b98140' : '#6366f130'}`,
      display: 'flex', alignItems: 'center', gap: 0.5,
    }}>
      {isLive && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', animation: 'pulse 1.5s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />}
      <Typography variant='caption' fontWeight={700} sx={{ fontSize: 11, color: isLive ? '#10b981' : '#6366f1' }}>
        {isLive ? 'LIVE' : countdown}
      </Typography>
    </Box>
  )
}

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
  cre_dt: string
  assignedto: AssignedUser | null
}

interface Attendee {
  id: string
  event_fk: string
  parent_fk: string | null
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  attendee_type: number // 1=Invitee, 2=Lead, 3=Guest
  checked_in: boolean
  no_show: boolean
  check_in_time: string | null
  notes: string | null
  cre_dt: string
  upd_dt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fullName = (a: Attendee) => `${a.first_name} ${a.last_name}`.trim() || 'Unnamed'
const initials = (a: Attendee) => `${a.first_name?.[0] || ''}${a.last_name?.[0] || ''}`.toUpperCase() || '?'

function fmtDate(d: string | null) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const TYPE_LABELS: Record<number, string> = { 1: 'Invitee', 2: 'Lead', 3: 'Guest' }
// Two-color scheme: GREEN for subscribers (invitees + leads), BLUE for guests
const COLOR_SUBSCRIBER = '#10b981' // green
const COLOR_GUEST      = '#3b82f6' // blue
const TYPE_COLORS: Record<number, string> = {
  1: COLOR_SUBSCRIBER,
  2: COLOR_SUBSCRIBER,
  3: COLOR_GUEST,
}
const TYPE_BG: Record<number, string> = {
  1: '#10b98118',
  2: '#10b98118',
  3: '#3b82f618',
}
const TYPE_ICONS: Record<number, string> = {
  1: 'tabler-user-check',
  2: 'tabler-user-star',
  3: 'tabler-users',
}

// ── Add / Edit Attendee Dialog ────────────────────────────────────────────────
interface AttendeeFormState {
  first_name: string
  last_name: string
  phone: string
  email: string
  attendee_type: number
  notes: string
}

const EMPTY_ATTENDEE_FORM: AttendeeFormState = {
  first_name: '', last_name: '', phone: '', email: '', attendee_type: 2, notes: '',
}

function AttendeeDialog({
  open, onClose, onSaved, eventId, existing, parentId, defaultType,
}: {
  open: boolean
  onClose: () => void
  onSaved: (a: Attendee) => void
  eventId: string
  existing?: Attendee | null  // if editing
  parentId?: string | null    // if adding a guest under a lead/invitee
  defaultType?: number
}) {
  const [form, setForm] = useState<AttendeeFormState>(EMPTY_ATTENDEE_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      if (existing) {
        setForm({
          first_name: existing.first_name,
          last_name: existing.last_name,
          phone: existing.phone || '',
          email: existing.email || '',
          attendee_type: existing.attendee_type,
          notes: existing.notes || '',
        })
      } else {
        setForm({ ...EMPTY_ATTENDEE_FORM, attendee_type: defaultType ?? (parentId ? 3 : 2) })
      }
      setError('')
    }
  }, [open, existing, parentId, defaultType])

  const handleSave = async () => {
    if (!form.first_name.trim() && !form.last_name.trim()) {
      setError('Please enter at least a first or last name.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const isEdit = !!existing
      const url = isEdit ? `/api/event-attendees?id=${existing!.id}` : '/api/event-attendees'
      const method = isEdit ? 'PATCH' : 'POST'
      const payload: Record<string, unknown> = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        email: form.email || null,
        attendee_type: form.attendee_type,
        notes: form.notes || null,
      }
      if (!isEdit) {
        payload.event_fk = eventId
        payload.parent_fk = parentId || null
      }
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed'); return }
      onSaved(data)
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const isGuest = !!parentId
  const title = existing
    ? `Edit ${TYPE_LABELS[existing.attendee_type]}`
    : isGuest ? 'Add Guest' : 'Add Attendee'
  const icon = existing ? 'tabler-user-edit' : isGuest ? 'tabler-user-plus' : 'tabler-user-plus'

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3, m: 1,
          maxHeight: 'calc(100vh - 16px)',
          width: 'calc(100% - 16px)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2,
          bgcolor: TYPE_BG[form.attendee_type] || 'primary.lighter',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={icon} style={{ fontSize: 18, color: TYPE_COLORS[form.attendee_type] || '#6366f1' }} />
        </Box>
        <Typography variant='h6' fontWeight={700}>{title}</Typography>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {error && (
          <Alert severity='error' variant='filled' sx={{ borderRadius: 2 }}>{error}</Alert>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField label='First Name' value={form.first_name} autoFocus
            onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
            size='small' />
          <TextField label='Last Name' value={form.last_name}
            onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
            size='small' />
        </Box>
        <TextField label='Phone' value={form.phone} type='tel'
          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
          size='small' InputProps={{
            startAdornment: <InputAdornment position='start'><i className='tabler-phone' style={{ fontSize: 16, opacity: .4 }} /></InputAdornment>,
          }} />
        <TextField label='Email' value={form.email} type='email'
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          size='small' InputProps={{
            startAdornment: <InputAdornment position='start'><i className='tabler-mail' style={{ fontSize: 16, opacity: .4 }} /></InputAdornment>,
          }} />
        {!isGuest && (
          <FormControl size='small' fullWidth>
            <InputLabel>Type</InputLabel>
            <Select value={form.attendee_type} label='Type'
              onChange={e => setForm(p => ({ ...p, attendee_type: Number(e.target.value) }))}>
              <MenuItem value={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='tabler-user-check' style={{ color: TYPE_COLORS[1], fontSize: 16 }} />
                  Invitee (Pre-registered)
                </Box>
              </MenuItem>
              <MenuItem value={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='tabler-user-star' style={{ color: TYPE_COLORS[2], fontSize: 16 }} />
                  Lead (New prospect)
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        )}
        <TextField label='Notes' value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          size='small' multiline rows={2} placeholder='Optional notes…' />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose} variant='outlined' color='secondary' disabled={saving}
          sx={{ borderRadius: 2 }}>Cancel</Button>
        <Button onClick={handleSave} variant='contained' disabled={saving}
          sx={{ borderRadius: 2 }}
          startIcon={saving ? <CircularProgress size={14} /> : <i className='tabler-check' />}>
          {saving ? 'Saving…' : existing ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Attendee Row (Accordion) ──────────────────────────────────────────────────
function AttendeeRow({
  attendee, guests, onCheckIn, onEdit, onDelete, onAddGuest,
  onMarkNoShow, onEditGuest, onDeleteGuest, onCheckInGuest,
}: {
  attendee: Attendee
  guests: Attendee[]
  onCheckIn: (id: string, checked: boolean) => void
  onEdit: (a: Attendee) => void
  onDelete: (a: Attendee) => void
  onAddGuest: (parentId: string) => void
  onMarkNoShow: (id: string, noShow: boolean) => void
  onEditGuest: (a: Attendee) => void
  onDeleteGuest: (a: Attendee) => void
  onCheckInGuest: (id: string, checked: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const typeColor = TYPE_COLORS[attendee.attendee_type]
  const hasGuests = guests.length > 0
  const checkedGuests = guests.filter(g => g.checked_in).length

  return (
    <Box sx={{
      borderBottom: '1px solid', borderColor: 'divider',
      bgcolor: attendee.no_show ? 'rgba(239,68,68,0.04)' : attendee.checked_in ? 'rgba(16,185,129,0.04)' : 'transparent',
      transition: 'background .2s',
    }}>
      {/* Main Row */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
          cursor: 'pointer',
          '&:active': { bgcolor: 'action.hover' },
          transition: 'background .15s',
        }}
      >
        {/* Check-in checkbox */}
        <Checkbox
          checked={attendee.checked_in}
          disabled={attendee.no_show}
          onClick={e => e.stopPropagation()}
          onChange={e => onCheckIn(attendee.id, e.target.checked)}
          sx={{
            p: 0.5,
            color: typeColor,
            '&.Mui-checked': { color: typeColor },
          }}
        />

        {/* Avatar with type indicator */}
        <Badge
          overlap='circular'
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            hasGuests ? (
              <Box sx={{
                bgcolor: '#10b981', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 9, fontWeight: 700,
                border: '2px solid var(--mui-palette-background-paper)',
              }}>{guests.length}</Box>
            ) : null
          }
        >
          <Avatar sx={{
            width: 38, height: 38, fontSize: 13, fontWeight: 700,
            bgcolor: attendee.no_show ? '#94a3b8' : typeColor,
            opacity: attendee.no_show ? 0.5 : 1,
            transition: 'all .25s',
          }}>
            {attendee.no_show ? (
              <i className='tabler-user-off' style={{ fontSize: 18 }} />
            ) : attendee.checked_in ? (
              <i className='tabler-check' style={{ fontSize: 18 }} />
            ) : (
              initials(attendee)
            )}
          </Avatar>
        </Badge>

        {/* Name + meta */}
        <Box sx={{ flex: 1, minWidth: 0, ml: 0.5 }}>
          <Typography
            variant='body2' fontWeight={600} noWrap
            sx={{
              textDecoration: attendee.no_show ? 'line-through' : 'none',
              opacity: attendee.no_show ? 0.5 : 1,
            }}
          >
            {fullName(attendee)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
            <Chip
              label={TYPE_LABELS[attendee.attendee_type]}
              size='small'
              icon={<i className={TYPE_ICONS[attendee.attendee_type]} style={{ fontSize: 12, color: typeColor }} />}
              sx={{
                height: 20, fontSize: 10, fontWeight: 700,
                bgcolor: TYPE_BG[attendee.attendee_type],
                color: typeColor,
                '& .MuiChip-icon': { ml: 0.5 },
              }}
            />
            {attendee.checked_in && attendee.check_in_time && (
              <Typography variant='caption' color='success.main' sx={{ fontSize: 10 }}>
                ✓ {new Date(attendee.check_in_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Typography>
            )}
            {attendee.no_show && (
              <Chip label='No Show' size='small' color='error' variant='outlined'
                sx={{ height: 18, fontSize: 9, fontWeight: 700 }} />
            )}
            {hasGuests && (
              <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10 }}>
                {checkedGuests}/{guests.length} guests
              </Typography>
            )}
          </Box>
        </Box>

        {/* Expand / actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Tooltip title='Add Guest'>
            <IconButton size='small' onClick={e => { e.stopPropagation(); onAddGuest(attendee.id) }}
              sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: '#10b981' } }}>
              <i className='tabler-user-plus' style={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={attendee.no_show ? 'Undo No-Show' : 'Mark No-Show'}>
            <IconButton size='small' onClick={e => { e.stopPropagation(); onMarkNoShow(attendee.id, !attendee.no_show) }}
              sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: '#ef4444' } }}>
              <i className={attendee.no_show ? 'tabler-user-check' : 'tabler-user-off'} style={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <IconButton size='small' sx={{ opacity: 0.3 }}>
            <i className={expanded ? 'tabler-chevron-up' : 'tabler-chevron-down'} style={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Expanded Content — Guest list + actions */}
      <Collapse in={expanded} timeout={200}>
        <Box sx={{ pl: 6, pr: 1.5, pb: 1.5 }}>
          {/* Contact info */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {attendee.phone && (
              <Chip icon={<i className='tabler-phone' style={{ fontSize: 12 }} />}
                label={attendee.phone} size='small' variant='outlined'
                sx={{ height: 24, fontSize: 11 }}
                component='a' href={`tel:${attendee.phone}`} clickable />
            )}
            {attendee.email && (
              <Chip icon={<i className='tabler-mail' style={{ fontSize: 12 }} />}
                label={attendee.email} size='small' variant='outlined'
                sx={{ height: 24, fontSize: 11 }}
                component='a' href={`mailto:${attendee.email}`} clickable />
            )}
          </Box>
          {attendee.notes && (
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
              {attendee.notes}
            </Typography>
          )}

          {/* Guests */}
          {guests.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant='caption' fontWeight={700} color='text.secondary'
                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, mb: 0.5, display: 'block' }}>
                Guests ({guests.length})
              </Typography>
              {guests.map(g => (
                <Box key={g.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  py: 0.75, px: 1, borderRadius: 1.5,
                  bgcolor: g.checked_in ? 'rgba(59,130,246,0.08)' : g.no_show ? 'rgba(239,68,68,0.04)' : 'action.hover',
                  mb: 0.5, transition: 'background .15s',
                }}>
                  <Checkbox checked={g.checked_in} disabled={g.no_show} size='small'
                    onChange={e => onCheckInGuest(g.id, e.target.checked)}
                    sx={{ p: 0.25, '&.Mui-checked': { color: COLOR_GUEST } }} />
                  <Avatar sx={{
                    width: 26, height: 26, fontSize: 10, fontWeight: 700,
                    bgcolor: g.no_show ? '#94a3b8' : COLOR_GUEST,
                  }}>
                    {g.no_show ? <i className='tabler-user-off' style={{ fontSize: 12 }} />
                      : g.checked_in ? <i className='tabler-check' style={{ fontSize: 12 }} />
                        : initials(g)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant='body2' fontSize={13} fontWeight={500} noWrap
                      sx={{ textDecoration: g.no_show ? 'line-through' : 'none', opacity: g.no_show ? 0.5 : 1 }}>
                      {fullName(g)}
                    </Typography>
                    {g.phone && (
                      <Typography variant='caption' color='text.disabled' sx={{ fontSize: 10 }}>{g.phone}</Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <IconButton size='small' onClick={() => onEditGuest(g)}
                      sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}>
                      <i className='tabler-pencil' style={{ fontSize: 13 }} />
                    </IconButton>
                    <IconButton size='small' onClick={() => onMarkNoShow(g.id, !g.no_show)}
                      sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: '#ef4444' } }}>
                      <i className={g.no_show ? 'tabler-user-check' : 'tabler-user-off'} style={{ fontSize: 13 }} />
                    </IconButton>
                    <IconButton size='small' color='error' onClick={() => onDeleteGuest(g)}
                      sx={{ opacity: 0.3, '&:hover': { opacity: 1 } }}>
                      <i className='tabler-trash' style={{ fontSize: 13 }} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Button size='small' variant='outlined' color='success' onClick={() => onAddGuest(attendee.id)}
              startIcon={<i className='tabler-user-plus' style={{ fontSize: 14 }} />}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
              Add Guest
            </Button>
            <Button size='small' variant='outlined' color='primary' onClick={() => onEdit(attendee)}
              startIcon={<i className='tabler-pencil' style={{ fontSize: 14 }} />}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
              Edit
            </Button>
            <Button size='small' variant='outlined' color='error' onClick={() => onDelete(attendee)}
              startIcon={<i className='tabler-trash' style={{ fontSize: 14 }} />}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
              Remove
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}

// ── Main Event Check-In View ──────────────────────────────────────────────────
export default function EventCheckInView() {
  // ── State ───────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<EventRecord[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingAttendees, setLoadingAttendees] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Attendee | null>(null)
  const [guestParentId, setGuestParentId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Attendee | null>(null)

  // Notifications
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'success',
  })
  const showSnack = (message: string, severity: 'success' | 'error' | 'info' = 'success') =>
    setSnack({ open: true, message, severity })

  // ── Fetch events ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/events')
        const data = await res.json()
        if (Array.isArray(data)) setEvents(data)
      } finally { setLoading(false) }
    })()
  }, [])

  // ── Fetch attendees when event changes ────────────────────────────────
  const fetchAttendees = useCallback(async (eventId: string) => {
    if (!eventId) { setAttendees([]); return }
    setLoadingAttendees(true)
    try {
      const res = await fetch(`/api/event-attendees?event_id=${eventId}`)
      const data = await res.json()
      if (Array.isArray(data)) setAttendees(data)
    } finally { setLoadingAttendees(false) }
  }, [])

  useEffect(() => {
    if (selectedEventId) fetchAttendees(selectedEventId)
    else setAttendees([])
  }, [selectedEventId, fetchAttendees])

  // ── Derived data ──────────────────────────────────────────────────────
  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId])

  // Separate top-level (invitees/leads) from guests
  const { topLevel, guestsByParent } = useMemo(() => {
    const tl: Attendee[] = []
    const gMap: Record<string, Attendee[]> = {}
    attendees.forEach(a => {
      if (a.parent_fk) {
        if (!gMap[a.parent_fk]) gMap[a.parent_fk] = []
        gMap[a.parent_fk].push(a)
      } else {
        tl.push(a)
      }
    })
    // Sort guests alphabetically within each parent
    Object.values(gMap).forEach(arr => arr.sort((a, b) => fullName(a).localeCompare(fullName(b))))
    return { topLevel: tl, guestsByParent: gMap }
  }, [attendees])

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return topLevel
    const q = search.toLowerCase()
    return topLevel.filter(a => {
      const nameMatch = fullName(a).toLowerCase().includes(q)
      const guests = guestsByParent[a.id] || []
      const guestMatch = guests.some(g => fullName(g).toLowerCase().includes(q))
      return nameMatch || guestMatch ||
        (a.phone || '').includes(q) ||
        (a.email || '').toLowerCase().includes(q)
    })
  }, [topLevel, search, guestsByParent])

  // Stats
  const stats = useMemo(() => {
    const totalAttendees = topLevel.length
    const totalGuests = attendees.filter(a => a.parent_fk).length
    const totalPersons = attendees.length
    const checkedIn = attendees.filter(a => a.checked_in).length
    const noShows = attendees.filter(a => a.no_show).length
    const expected = (selectedEvent?.expected_attendees || 0) + (selectedEvent?.expected_guests || 0)
    const pct = expected > 0 ? Math.round((checkedIn / expected) * 100) : totalPersons > 0 ? Math.round((checkedIn / totalPersons) * 100) : 0

    return {
      totalAttendees, totalGuests, totalPersons,
      checkedIn, noShows, expected,
      pct: Math.min(pct, 100),
      expectedAttendees: selectedEvent?.expected_attendees || 0,
      expectedGuests: selectedEvent?.expected_guests || 0,
    }
  }, [attendees, topLevel, selectedEvent])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCheckIn = async (id: string, checked: boolean) => {
    // Optimistic update
    setAttendees(prev => prev.map(a => a.id === id ? { ...a, checked_in: checked, no_show: checked ? false : a.no_show, check_in_time: checked ? new Date().toISOString() : null } : a))
    try {
      await fetch(`/api/event-attendees?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked_in: checked }),
      })
      showSnack(checked ? 'Checked in!' : 'Check-in removed', checked ? 'success' : 'info')
    } catch {
      showSnack('Failed to update check-in', 'error')
      fetchAttendees(selectedEventId) // rollback
    }
  }

  const handleMarkNoShow = async (id: string, noShow: boolean) => {
    setAttendees(prev => prev.map(a => a.id === id ? { ...a, no_show: noShow, checked_in: noShow ? false : a.checked_in } : a))
    try {
      const body: Record<string, unknown> = { no_show: noShow }
      if (noShow) body.checked_in = false
      await fetch(`/api/event-attendees?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      showSnack(noShow ? 'Marked as no-show' : 'No-show status removed', noShow ? 'info' : 'success')
    } catch {
      showSnack('Failed to update status', 'error')
      fetchAttendees(selectedEventId)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/event-attendees?id=${deleteTarget.id}`, { method: 'DELETE' })
      setAttendees(prev => prev.filter(a => a.id !== deleteTarget.id && a.parent_fk !== deleteTarget.id))
      setDeleteTarget(null)
      showSnack('Removed successfully')
    } catch {
      showSnack('Failed to remove', 'error')
    }
  }

  const openAdd = () => {
    setEditTarget(null)
    setGuestParentId(null)
    setDialogOpen(true)
  }

  const openAddGuest = (parentId: string) => {
    setEditTarget(null)
    setGuestParentId(parentId)
    setDialogOpen(true)
  }

  const openEdit = (a: Attendee) => {
    setEditTarget(a)
    setGuestParentId(a.parent_fk)
    setDialogOpen(true)
  }

  const handleSaved = (saved: Attendee) => {
    if (editTarget) {
      setAttendees(prev => prev.map(a => a.id === saved.id ? saved : a))
      showSnack('Updated!')
    } else {
      setAttendees(prev => [...prev, saved])
      showSnack(`${TYPE_LABELS[saved.attendee_type]} added!`)
    }
    setDialogOpen(false)
    setEditTarget(null)
    setGuestParentId(null)
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Box sx={{
      maxWidth: 600, mx: 'auto',
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      bgcolor: 'background.paper',
    }}>
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <Box sx={{
        px: 2, pt: 1.5, pb: 1,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: '#fff',
        position: 'sticky', top: 0, zIndex: 20,
        borderRadius: '0 0 16px 16px',
        boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className='tabler-clipboard-check' style={{ fontSize: 18 }} />
            </Box>
            <Typography variant='subtitle1' fontWeight={800} sx={{ lineHeight: 1.2 }}>Event Check-In</Typography>
          </Box>
        </Box>

        {/* Event Selector */}
        <FormControl fullWidth size='small' sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(255,255,255,0.15)',
            color: '#fff',
            borderRadius: 2,
            '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#fff' },
          },
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
          '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.7)' },
        }}>
          <InputLabel>Select Event</InputLabel>
          <Select
            value={selectedEventId}
            label='Select Event'
            onChange={e => setSelectedEventId(e.target.value)}
          >
            <MenuItem value=''>
              <Typography color='text.secondary' variant='body2'>— Choose an event —</Typography>
            </MenuItem>
            {events.map(ev => (
              <MenuItem key={ev.id} value={ev.id}>
                <Box>
                  <Typography variant='body2' fontWeight={600}>{ev.description}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {fmtDate(ev.event_date)} {fmtTime(ev.event_time)} • {ev.city}, {ev.state_fk}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* ─── Event Selected Content ───────────────────────────────────── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
          <CircularProgress />
        </Box>
      ) : !selectedEventId ? (
        // Empty state
        <Box sx={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2, px: 3,
        }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%',
            bgcolor: 'action.hover',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className='tabler-calendar-event' style={{ fontSize: 36, opacity: 0.3 }} />
          </Box>
          <Typography variant='h6' fontWeight={600} color='text.secondary' textAlign='center'>
            Select an event to begin check-in
          </Typography>
          <Typography variant='body2' color='text.disabled' textAlign='center'>
            Choose from the dropdown above to view and manage attendees
          </Typography>
        </Box>
      ) : (
        <>
          {/* ── Stats Dashboard (compact) ─────────────────────────────── */}
          <Box sx={{ px: 2, pt: 1.5 }}>
            {/* Event Info + Countdown */}
            {selectedEvent && (
              <Box sx={{
                p: 1, mb: 1, borderRadius: 2,
                bgcolor: 'action.hover',
                border: '1px solid', borderColor: 'divider',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant='body2' fontWeight={700} noWrap>{selectedEvent.description}</Typography>
                    <Typography variant='caption' color='text.secondary' noWrap>
                      {fmtDate(selectedEvent.event_date)} • {fmtTime(selectedEvent.event_time)}
                      {selectedEvent.city && ` • ${selectedEvent.city}, ${selectedEvent.state_fk}`}
                    </Typography>
                  </Box>
                  <CountdownBadge eventDate={selectedEvent.event_date} eventTime={selectedEvent.event_time} />
                </Box>
              </Box>
            )}

            {/* Compact Stats Row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75, mb: 1 }}>
              <StatPill value={stats.checkedIn} label='Checked In' color={COLOR_SUBSCRIBER} />
              <StatPill value={stats.expected || stats.totalPersons} label='Expected' color='#6366f1' />
              <StatPill value={`${stats.pct}%`} label='Attendance'
                color={stats.pct >= 75 ? COLOR_SUBSCRIBER : stats.pct >= 50 ? '#f59e0b' : '#ef4444'} />
              <StatPill value={stats.noShows} label='No-Shows' color='#ef4444' />
            </Box>

            {/* Progress Bar */}
            <LinearProgress
              variant='determinate'
              value={stats.pct}
              sx={{
                height: 4, borderRadius: 2, mb: 0.75,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  background: stats.pct >= 75
                    ? 'linear-gradient(90deg, #10b981, #059669)'
                    : stats.pct >= 50
                      ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                      : 'linear-gradient(90deg, #ef4444, #dc2626)',
                  transition: 'transform .6s cubic-bezier(.4,0,.2,1)',
                },
              }}
            />
            {/* Breakdown chips */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              <Chip size='small' sx={{ height: 20, fontSize: 9, fontWeight: 600 }}
                icon={<i className='tabler-user-check' style={{ fontSize: 11, color: COLOR_SUBSCRIBER }} />}
                label={`${stats.totalAttendees} subscribers`} variant='outlined' />
              <Chip size='small' sx={{ height: 20, fontSize: 9, fontWeight: 600 }}
                icon={<i className='tabler-users' style={{ fontSize: 11, color: COLOR_GUEST }} />}
                label={`${stats.totalGuests} guests`} variant='outlined' />
              {stats.noShows > 0 && (
                <Chip size='small' sx={{ height: 20, fontSize: 9, fontWeight: 600 }}
                  icon={<i className='tabler-user-off' style={{ fontSize: 11, color: '#ef4444' }} />}
                  label={`${stats.noShows} no-show (${stats.expected > 0 ? Math.round((stats.noShows / stats.expected) * 100) : 0}%)`}
                  variant='outlined' color='error' />
              )}
            </Box>
          </Box>

          {/* ── Search + Add Bar ────────────────────────────────────────── */}
          <Box sx={{
            px: 2, pb: 1, display: 'flex', gap: 1,
            position: 'sticky', top: 110, zIndex: 10,
            bgcolor: 'background.paper',
            pt: 0.5,
          }}>
            <TextField
              size='small' fullWidth placeholder='Search attendees…'
              value={search} onChange={e => setSearch(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='tabler-search' style={{ fontSize: 16, opacity: 0.4 }} />
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
              variant='contained' onClick={openAdd}
              sx={{
                minWidth: 44, borderRadius: 2.5, px: 1.5,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                '&:hover': { boxShadow: '0 4px 12px rgba(99,102,241,0.5)' },
              }}
            >
              <i className='tabler-user-plus' style={{ fontSize: 20 }} />
            </Button>
          </Box>

          {/* ── Attendee List ──────────────────────────────────────────── */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {loadingAttendees ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                py: 6, px: 3, gap: 1.5,
              }}>
                <Box sx={{
                  width: 56, height: 56, borderRadius: '50%',
                  bgcolor: 'action.hover',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className='tabler-users-minus' style={{ fontSize: 26, opacity: 0.3 }} />
                </Box>
                <Typography color='text.secondary' fontWeight={500} textAlign='center'>
                  {search ? 'No attendees match your search' : 'No attendees yet'}
                </Typography>
                {!search && (
                  <Button variant='contained' size='small' onClick={openAdd}
                    startIcon={<i className='tabler-user-plus' />}
                    sx={{ borderRadius: 2 }}>
                    Add First Attendee
                  </Button>
                )}
              </Box>
            ) : (
              <Fade in timeout={300}>
                <Box>
                  {filtered.map(a => (
                    <AttendeeRow
                      key={a.id}
                      attendee={a}
                      guests={guestsByParent[a.id] || []}
                      onCheckIn={handleCheckIn}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onAddGuest={openAddGuest}
                      onMarkNoShow={handleMarkNoShow}
                      onEditGuest={openEdit}
                      onDeleteGuest={setDeleteTarget}
                      onCheckInGuest={handleCheckIn}
                    />
                  ))}
                  {/* List footer */}
                  <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                    <Typography variant='caption' color='text.secondary'>
                      Showing {filtered.length} of {topLevel.length} attendees
                      {search && ` matching "${search}"`}
                    </Typography>
                  </Box>
                </Box>
              </Fade>
            )}
          </Box>
        </>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <AttendeeDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); setGuestParentId(null) }}
        onSaved={handleSaved}
        eventId={selectedEventId}
        existing={editTarget}
        parentId={guestParentId}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth='xs' fullWidth
        PaperProps={{ sx: { borderRadius: 3, m: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2,
            bgcolor: 'error.lighter', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className='tabler-trash' style={{ fontSize: 18, color: 'var(--mui-palette-error-main)' }} />
          </Box>
          <Typography variant='h6' fontWeight={700}>Remove Attendee</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            Are you sure you want to remove <strong>{deleteTarget && fullName(deleteTarget)}</strong>?
            {deleteTarget && !deleteTarget.parent_fk && (guestsByParent[deleteTarget.id]?.length || 0) > 0 && (
              <> This will also remove their <strong>{guestsByParent[deleteTarget.id]?.length}</strong> guest(s).</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} variant='outlined' color='secondary' sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant='contained' color='error' sx={{ borderRadius: 2 }}
            startIcon={<i className='tabler-trash' />}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack(p => ({ ...p, open: false }))}
          severity={snack.severity}
          variant='filled'
          sx={{ borderRadius: 2, width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
