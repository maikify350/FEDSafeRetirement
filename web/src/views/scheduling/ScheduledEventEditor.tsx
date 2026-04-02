'use client'

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Avatar from '@mui/material/Avatar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface UserItem {
  id: string
  name: string
  role?: string
  avatar?: string
}

interface LineItemSummary {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface ScheduledEvent {
  id: string          // job_scheduled_date.id (or synthetic for legacy events)
  jobId: string
  jobNumber?: string
  jobTitle?: string
  clientName?: string
  assignedToId?: string | null
  assignedToName?: string | null
  startDate: string   // ISO string
  endDate: string     // ISO string
  notes?: string | null
  isLegacy?: boolean
  // Job context (passed from CalendarBoard)
  propertyStreet?: string | null
  propertyCity?: string | null
  propertyState?: string | null
  propertyZipCode?: string | null
  lineItems?: LineItemSummary[]
  total?: number | null
  status?: string | null
}

interface Props {
  open: boolean
  event: ScheduledEvent | null
  onClose: () => void
  onOpenJobDetail?: (jobId: string) => void
}

/** Format ISO string to date input value (YYYY-MM-DD) */
const toDateInput = (iso: string) => {
  const d = new Date(iso)
  return d.toISOString().split('T')[0]
}

/** Format ISO string to time input value (HH:MM) */
const toTimeInput = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Combine date string (YYYY-MM-DD) and time string (HH:MM) to ISO */
const combineDateTime = (date: string, time: string) => {
  return new Date(`${date}T${time}:00`).toISOString()
}

/** Format date for display: Mar 25, 2026 */
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** Format time for display: 10:45 AM */
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

/** Calculate duration between two ISO strings */
const calcDuration = (start: string, end: string) => {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/** Get initials from a name */
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

const fmtMoney = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function ScheduledEventEditor({ open, event, onClose, onOpenJobDetail }: Props) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

  // Fetch team members for Assigned To dropdown
  const { data: users = [] } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users'),
    enabled: open,
  })

  // Form state (only used in edit mode)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [notes, setNotes] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)

  // Populate form when event changes
  useEffect(() => {
    if (event) {
      setDate(toDateInput(event.startDate))
      setStartTime(toTimeInput(event.startDate))
      setEndTime(toTimeInput(event.endDate))
      setAssignedToId(event.assignedToId || '')
      setNotes(event.notes || '')
      setIsCompleted(event.status === 'completed' || event.status === 'Completed')
      setIsEditing(false) // Always start in view mode
    }
  }, [event])

  // Update mutation
  const updateEventMutation = useMutation({
    mutationFn: async (payload: { startDate: string; endDate: string; notes: string; assignedToId: string }) => {
      if (!event) throw new Error('No event')

      const promises: Promise<unknown>[] = []

      if (event.isLegacy) {
        const jobPatch: Record<string, unknown> = { scheduledDate: payload.startDate }
        if (payload.assignedToId) {
          jobPatch.assignedToId = payload.assignedToId
        }
        promises.push(api.patch(`/api/jobs/${event.jobId}`, jobPatch))
      } else {
        promises.push(
          api.patch(`/api/jobs/${event.jobId}/scheduled-dates/${event.id}`, {
            startDate: payload.startDate,
            endDate: payload.endDate,
            notes: payload.notes,
            assignedToId: payload.assignedToId || null,
          })
        )
        // Update job's assignedToId only if job doesn't already have one
        if (payload.assignedToId && !event.assignedToId) {
          promises.push(
            api.patch(`/api/jobs/${event.jobId}`, { assignedToId: payload.assignedToId })
          )
        }
      }

      return Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      onClose()
    },
    onError: (err: unknown) => {
      console.error('Failed to update event:', err)
      alert('Failed to update the scheduled event.')
    }
  })

  // Toggle completed status on the job
  const toggleCompletedMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      if (!event) throw new Error('No event')
      // We update status on the job record
      return api.patch(`/api/jobs/${event.jobId}`, {
        status: completed ? 'completed' : 'scheduled',
        completedAt: completed ? new Date().toISOString() : null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    }
  })

  // Delete mutation
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error('No event')
      if (event.isLegacy) {
        return api.patch(`/api/jobs/${event.jobId}`, { scheduledDate: null })
      } else {
        return api.delete(`/api/jobs/${event.jobId}/scheduled-dates/${event.id}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      onClose()
    },
    onError: (err: unknown) => {
      console.error('Failed to delete event:', err)
      alert('Failed to remove the scheduled event.')
    }
  })

  const handleSave = () => {
    const startDate = combineDateTime(date, startTime)
    const endDate = combineDateTime(date, endTime)

    if (new Date(endDate) <= new Date(startDate)) {
      alert('End time must be after start time.')
      return
    }

    updateEventMutation.mutate({ startDate, endDate, notes, assignedToId })
  }

  const handleDelete = () => {
    if (confirm('Remove this event from the calendar?')) {
      deleteEventMutation.mutate()
    }
  }

  const handleToggleCompleted = (checked: boolean) => {
    setIsCompleted(checked)
    toggleCompletedMutation.mutate(checked)
  }

  if (!event) return null

  const assignedUser = users.find(u => u.id === assignedToId)
  const address = [event.propertyStreet, event.propertyCity, event.propertyState, event.propertyZipCode].filter(Boolean).join(', ')
  const isSaving = updateEventMutation.isPending || deleteEventMutation.isPending

  // ── VIEW MODE (Jobber-style card) ──
  if (!isEditing) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' }
        }}
      >
        <DialogTitle sx={{ p: 0 }}>
          <Box sx={{
            px: 2.5, py: 1.5,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            borderBottom: '1px solid', borderColor: 'divider',
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                {event.clientName || 'Unknown'} – {event.jobTitle || 'Untitled'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Visit</Typography>
            </Box>
            <IconButton size="small" onClick={onClose} sx={{ mt: -0.5, mr: -1 }}>
              <i className="tabler-x text-lg" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, py: 2 }}>
          {/* Completed checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isCompleted}
                onChange={(_, checked) => handleToggleCompleted(checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Completed</Typography>}
            sx={{ mb: 1.5, ml: -0.5 }}
          />

          {/* Details: Client link + Job link */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Details
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">
              <Typography
                component="span" variant="body2"
                sx={{ color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={() => { if (onOpenJobDetail) { onClose(); onOpenJobDetail(event.jobId) } }}
              >
                {event.clientName || 'Unknown'}
              </Typography>
              {' – '}
              <Typography
                component="span" variant="body2"
                sx={{ color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                onClick={() => { if (onOpenJobDetail) { onClose(); onOpenJobDetail(event.jobId) } }}
              >
                {event.jobNumber || 'Draft'}
              </Typography>
            </Typography>
          </Box>

          {/* Team */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Team
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {assignedUser ? (
              <Chip
                avatar={<Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'success.main' }}>{getInitials(assignedUser.name)}</Avatar>}
                label={assignedUser.name}
                size="small"
                variant="outlined"
                onDelete={() => { setAssignedToId(''); /* don't sync to job on quick clear */ }}
                sx={{ fontWeight: 500 }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Unassigned</Typography>
            )}
            <Tooltip title="Change tech">
              <IconButton
                size="small"
                onClick={() => setIsEditing(true)}
                sx={{ border: '1px dashed', borderColor: 'divider', width: 28, height: 28 }}
              >
                <i className="tabler-plus text-sm" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Location */}
          {address && (
            <>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Location
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 2 }}>
                <i className="tabler-map-pin text-sm" style={{ marginTop: 3, color: 'var(--mui-palette-text-secondary)' }} />
                <Typography variant="body2">{address}</Typography>
              </Box>
            </>
          )}

          {/* Start / End */}
          <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Start</Typography>
              <Typography variant="body2">{fmtDate(event.startDate)}</Typography>
              <Typography variant="body2">{fmtTime(event.startDate)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary">End</Typography>
              <Typography variant="body2">{fmtDate(event.endDate)}</Typography>
              <Typography variant="body2">{fmtTime(event.endDate)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary">Duration</Typography>
              <Typography variant="body2">{calcDuration(event.startDate, event.endDate)}</Typography>
            </Box>
          </Box>

          {/* Line Items */}
          {event.lineItems && event.lineItems.length > 0 && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Line Items
              </Typography>
              {event.lineItems.map((li, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2">
                    {li.quantity}× {li.description}
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>{fmtMoney(li.total)}</Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Typography variant="body2" fontWeight={700}>
                  Total {fmtMoney(event.total ?? 0)}
                </Typography>
              </Box>
            </>
          )}

          {/* Notes */}
          {event.notes && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Notes
              </Typography>
              <Typography variant="body2" color="text.secondary">{event.notes}</Typography>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2, justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="outlined"
            onClick={() => setIsEditing(true)}
            sx={{ borderRadius: 2, flex: 1, mr: 1 }}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            onClick={() => { if (onOpenJobDetail) { onClose(); onOpenJobDetail(event.jobId) } }}
            sx={{ borderRadius: 2, flex: 1 }}
          >
            View Details
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  // ── EDIT MODE ──
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{
          px: 3, py: 2,
          bgcolor: 'primary.main', color: 'primary.contrastText',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className='tabler-calendar-event text-2xl' />
            <Box>
              <Typography variant='subtitle1' fontWeight={700} sx={{ lineHeight: 1.2 }}>
                Edit Event
              </Typography>
              <Typography variant='caption' sx={{ opacity: 0.85 }}>
                {event.jobNumber || 'Draft'} — {event.clientName || 'Unknown'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size='small' onClick={() => setIsEditing(false)}
              sx={{ color: 'inherit', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <i className='tabler-arrow-left text-lg' />
            </IconButton>
            <IconButton size='small' onClick={onClose}
              sx={{ color: 'inherit', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <i className='tabler-x text-lg' />
            </IconButton>
          </Box>
        </Box>

        {event.isLegacy && (
          <Box sx={{ px: 3, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Chip label="Primary Date" size="small" color="warning" variant="outlined" />
          </Box>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: '24px !important', px: 3, pb: 1 }}>
        {/* Assigned To */}
        <Box sx={{ mb: 3 }}>
          <TextField
            select
            label="Assigned To"
            value={assignedToId}
            onChange={e => setAssignedToId(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="">— Unassigned —</MenuItem>
            {users.map(u => (
              <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Date */}
        <Box sx={{ mb: 3 }}>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* Time Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
          <TextField
            label="Start Time"
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 300 }}
          />
          <TextField
            label="End Time"
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 300 }}
          />
        </Box>

        {/* Duration chip */}
        {date && startTime && endTime && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Chip
              icon={<i className='tabler-clock text-sm' />}
              label={`Duration: ${calcDuration(combineDateTime(date, startTime), combineDateTime(date, endTime))}`}
              size='small'
              variant='outlined'
              color='primary'
            />
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Notes */}
        <TextField
          label="Event Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          placeholder="Notes specific to this scheduled visit..."
          sx={{ mb: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider' }}>
        <Tooltip title="Remove from calendar">
          <Button
            color="error"
            variant="outlined"
            onClick={handleDelete}
            disabled={isSaving}
            startIcon={<i className='tabler-calendar-minus' />}
            sx={{ borderRadius: 2 }}
          >
            Remove
          </Button>
        </Tooltip>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={() => setIsEditing(false)} disabled={isSaving} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !date || !startTime || !endTime}
            startIcon={<i className='tabler-device-floppy' />}
            sx={{ borderRadius: 2 }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
