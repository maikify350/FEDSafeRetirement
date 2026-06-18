'use client'

import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import Card from '@mui/material/Card'
import Popper from '@mui/material/Popper'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import { api } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Job } from '@shared/contracts'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import JobFullPageDetail from '@/views/jobs/JobFullPageDetail'
import ScheduledEventEditor from './ScheduledEventEditor'

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const fmtMoney = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary'> = {
  scheduled: 'info', in_progress: 'warning', on_hold: 'error', completed: 'success', cancelled: 'secondary',
}

/**
 * Calendar board component used in the scheduling view with event rendering.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/scheduling/CalendarBoard.tsx
 */
export default function CalendarBoard() {
  const queryClient = useQueryClient()
  const [editingJobId, setEditingJobId] = useState<string | null>(null)

  // Scheduled Event Editor state
  const [editingEvent, setEditingEvent] = useState<any>(null)

  // Hover tooltip state
  const [hoveredJob, setHoveredJob] = useState<any>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // fetch scheduled jobs for the calendar
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', 'scheduling', 'all'],
    queryFn: () => api.get<Job[]>('/api/jobs')
  })

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Job> }) => {
      return api.patch(`/api/jobs/${id}`, updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    }
  })

  // Build calendar events from BOTH job.scheduledDate AND job.scheduledDates
  const scheduledEvents = jobs.flatMap(job => {
    const j = job as any
    const isResidential = (j.client?.customerType || '').toLowerCase() === 'residential'
    const events: any[] = []

    // If job has scheduledDates entries (from job_scheduled_date table), use those
    if (j.scheduledDates && j.scheduledDates.length > 0) {
      j.scheduledDates.forEach((sd: any) => {
        events.push({
          id: `sd_${sd.id}`,  // prefix to identify as scheduled_date record
          title: `${job.jobNumber || 'Draft'} - ${j.clientName || 'Unknown'}`,
          start: sd.startDate,
          end: sd.endDate,
          backgroundColor: isResidential ? 'var(--mui-palette-info-main)' : 'var(--mui-palette-success-main)',
          borderColor: isResidential ? 'var(--mui-palette-info-dark)' : 'var(--mui-palette-success-dark)',
          extendedProps: {
            job,
            scheduledDateId: sd.id,
            eventNotes: sd.notes,
            isLegacy: false,
          }
        })
      })
    }

    // Also show the primary scheduledDate if it exists (legacy / fallback)
    // Only show if there are NO scheduledDates entries for this job (avoid duplicates)
    if (job.scheduledDate && (!j.scheduledDates || j.scheduledDates.length === 0)) {
      const start = new Date(job.scheduledDate)
      const end = new Date(start.getTime() + 60 * 60 * 1000) // default 1hr

      events.push({
        id: `legacy_${job.id}`,
        title: `${job.jobNumber || 'Draft'} - ${j.clientName || 'Unknown'}`,
        start: start.toISOString(),
        end: end.toISOString(),
        backgroundColor: isResidential ? 'var(--mui-palette-info-main)' : 'var(--mui-palette-success-main)',
        borderColor: isResidential ? 'var(--mui-palette-info-dark)' : 'var(--mui-palette-success-dark)',
        extendedProps: {
          job,
          scheduledDateId: null,
          eventNotes: null,
          isLegacy: true,
        }
      })
    }

    return events
  })

  const handleEventReceive = (info: any) => {
    const { event } = info
    event.remove()
    const jobId = event.id
    const scheduledDate = event.startStr
    if (!jobId) return

    updateJobMutation.mutate({
      id: jobId,
      updates: { scheduledDate }
    }, {
      onSuccess: () => {
        // After drop, open the event editor so user can set end time / notes
        const start = new Date(scheduledDate)
        const end = new Date(start.getTime() + 60 * 60 * 1000)
        const job = jobs.find(j => j.id === jobId) as any

        setEditingEvent({
          id: `legacy_${jobId}`,
          jobId,
          jobNumber: job?.jobNumber,
          jobTitle: job?.title,
          clientName: job?.clientName,
          assignedToId: job?.assignedToId || null,
          assignedToName: job?.assignedTo?.name || null,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          notes: null,
          isLegacy: true,
          propertyStreet: job?.propertyStreet || null,
          propertyCity: job?.propertyCity || null,
          propertyState: job?.propertyState || null,
          propertyZipCode: job?.propertyZipCode || null,
          lineItems: job?.lineItems || [],
          total: job?.total ?? null,
          status: job?.status || null,
        })
      }
    })
  }

  const handleEventDrop = (info: any) => {
    const { event } = info
    const props = event.extendedProps

    if (props.isLegacy) {
      // Legacy event → update job.scheduledDate
      updateJobMutation.mutate({
        id: props.job.id,
        updates: { scheduledDate: event.startStr }
      })
    } else {
      // Real scheduled_date event → update the record
      const sdId = props.scheduledDateId
      api.patch(`/api/jobs/${props.job.id}/scheduled-dates/${sdId}`, {
        startDate: event.start?.toISOString(),
        endDate: event.end?.toISOString() || new Date(event.start!.getTime() + 60 * 60 * 1000).toISOString(),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] })
      })
    }
  }

  const handleEventResize = (info: any) => {
    const { event } = info
    const props = event.extendedProps

    if (!props.isLegacy && props.scheduledDateId) {
      api.patch(`/api/jobs/${props.job.id}/scheduled-dates/${props.scheduledDateId}`, {
        startDate: event.start?.toISOString(),
        endDate: event.end?.toISOString(),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] })
      })
    }
  }

  const handleEventClick = (info: any) => {
    // Clear hover on click
    setHoveredJob(null)
    setAnchorEl(null)

    const props = info.event.extendedProps
    const job = props.job as any

    // Open the Scheduled Event Editor (NOT the job detail)
    setEditingEvent({
      id: props.isLegacy ? null : props.scheduledDateId,
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobTitle: job.title,
      clientName: job.clientName,
      assignedToId: job.assignedToId || null,
      assignedToName: job.assignedTo?.name || null,
      startDate: info.event.start?.toISOString() || '',
      endDate: info.event.end?.toISOString() || new Date(info.event.start!.getTime() + 60 * 60 * 1000).toISOString(),
      notes: props.eventNotes || null,
      isLegacy: props.isLegacy,
      propertyStreet: job.propertyStreet || null,
      propertyCity: job.propertyCity || null,
      propertyState: job.propertyState || null,
      propertyZipCode: job.propertyZipCode || null,
      lineItems: job.lineItems || [],
      total: job.total ?? null,
      status: job.status || null,
    })
  }

  const handleEventMouseEnter = (info: any) => {
    // Small delay to avoid flicker on fast mouse movements
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      const job = info.event.extendedProps?.job
      if (job) {
        setHoveredJob(job)
        setAnchorEl(info.el)
      }
    }, 200)
  }

  const handleEventMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHoveredJob(null)
    setAnchorEl(null)
  }

  const j = hoveredJob as any

  return (
    <>
      <Card className='h-full flex flex-col p-4 w-full relative'>
         {isLoading && (
           <Box className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
             <CircularProgress />
           </Box>
         )}
         <div className='flex-1 h-full min-h-0 calendar-wrapper' style={{ minHeight: '500px' }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              editable={true}
              droppable={true}
              eventResizableFromStart={true}
              events={scheduledEvents}
              eventReceive={handleEventReceive}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              eventClick={handleEventClick}
              eventMouseEnter={handleEventMouseEnter}
              eventMouseLeave={handleEventMouseLeave}
              height="100%"
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
            />
         </div>
         <style>{`
           .calendar-wrapper .fc {
             --fc-event-bg-color: var(--mui-palette-primary-main);
             --fc-event-border-color: var(--mui-palette-primary-main);
           }
           .calendar-wrapper .fc-theme-standard th, .calendar-wrapper .fc-theme-standard td, .calendar-wrapper .fc-theme-standard th {
             border-color: var(--mui-palette-divider);
           }
           .calendar-wrapper .fc-col-header-cell-cushion {
             padding: 8px;
             color: var(--mui-palette-text-primary);
           }
           .calendar-wrapper .fc-timegrid-slot-label-cushion {
             color: var(--mui-palette-text-secondary);
           }
           .calendar-wrapper .fc-event {
             cursor: pointer;
             border-radius: 4px;
             padding: 2px 4px;
             font-size: 0.8rem;
           }
         `}</style>
      </Card>

      {/* Hover Info Popover — like a Google Maps peek card */}
      <Popper
        open={!!hoveredJob && !!anchorEl}
        anchorEl={anchorEl}
        placement="right-start"
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
          { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } },
        ]}
        sx={{ zIndex: 1400, pointerEvents: 'none' }}
      >
        {hoveredJob && (
          <Paper
            elevation={8}
            sx={{
              minWidth: 280,
              maxWidth: 340,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {/* Header stripe */}
            <Box sx={{
              px: 2, py: 1.5,
              bgcolor: STATUS_COLORS[hoveredJob.status] ? `${STATUS_COLORS[hoveredJob.status]}.main` : 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}>
              <i className='tabler-briefcase text-lg' />
              <Typography variant='subtitle2' fontWeight={700} noWrap sx={{ flex: 1 }}>
                {hoveredJob.jobNumber || 'Draft'}
              </Typography>
              {hoveredJob.status && (
                <Chip label={hoveredJob.status.replace(/_/g, ' ')} size='small' sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, textTransform: 'capitalize', height: 22 }} />
              )}
            </Box>

            <Box sx={{ px: 2, py: 1.5 }}>
              {/* Client */}
              {j?.clientName && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <i className='tabler-user text-base' style={{ color: 'var(--mui-palette-text-secondary)' }} />
                  <Typography variant='body2' fontWeight={600}>{j.clientName}</Typography>
                </Box>
              )}

              {/* Description */}
              {hoveredJob.description && (
                <Typography variant='body2' color='text.secondary' sx={{
                  mb: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {hoveredJob.description}
                </Typography>
              )}

              <Divider sx={{ my: 1 }} />

              {/* Key details grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                {/* Priority */}
                {hoveredJob.priority && (
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Priority</Typography>
                    <Typography variant='body2' fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                      {hoveredJob.priority}
                    </Typography>
                  </Box>
                )}

                {/* Scheduled */}
                <Box>
                  <Typography variant='caption' color='text.secondary'>Scheduled</Typography>
                  <Typography variant='body2' fontWeight={500}>{fmtDate(hoveredJob.scheduledDate)}</Typography>
                </Box>

                {/* Total */}
                {fmtMoney(hoveredJob.total) && (
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Total</Typography>
                    <Typography variant='body2' fontWeight={600} color='primary.main'>{fmtMoney(hoveredJob.total)}</Typography>
                  </Box>
                )}

                {/* Assigned */}
                {hoveredJob.assignedTo?.name && (
                  <Box>
                    <Typography variant='caption' color='text.secondary'>Assigned To</Typography>
                    <Typography variant='body2' fontWeight={500}>{hoveredJob.assignedTo.name}</Typography>
                  </Box>
                )}
              </Box>

              {/* Address */}
              {(j?.propertyStreet || j?.propertyCity) && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <i className='tabler-map-pin text-sm' style={{ marginTop: 2, color: 'var(--mui-palette-text-secondary)' }} />
                    <Typography variant='caption' color='text.secondary'>
                      {[j.propertyStreet, j.propertyCity, j.propertyState].filter(Boolean).join(', ')}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>

            {/* Footer hint */}
            <Box sx={{ px: 2, py: 0.75, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
                Click to edit schedule · Pencil for job details
              </Typography>
            </Box>
          </Paper>
        )}
      </Popper>

      {/* Scheduled Event Editor Dialog */}
      <ScheduledEventEditor
        open={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onOpenJobDetail={(jobId) => {
          setEditingEvent(null)
          setEditingJobId(jobId)
        }}
      />

      {/* Job Detail Dialog (opened from event editor's "View Job" button) */}
      <JobFullPageDetail
        jobId={editingJobId}
        open={!!editingJobId}
        onClose={() => setEditingJobId(null)}
        onEdit={() => {}}
      />
    </>
  )
}
