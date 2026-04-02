'use client'

import { useRef, useMemo, useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTheme } from '@mui/material/styles'
import useLocalStorage from '@/hooks/useLocalStorage'

// FullCalendar
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core'

// MUI
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Select from '@mui/material/Select'
import MuiMenuItem from '@mui/material/MenuItem'
import { COLORS } from '../../theme/designTokens'


const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

const STATUS_COLORS: Record<string, string> = {
  scheduled:   COLORS.info,
  in_progress: COLORS.violet,
  on_hold:     COLORS.warning,
  completed:   COLORS.success,
  cancelled:   COLORS.gray500,
}

const PRIORITY_BORDER: Record<string, string> = {
  urgent: COLORS.error,
  high:   COLORS.orange,
}

const STATUS_PILLS = [
  { key: 'all',         label: 'All Jobs' },
  { key: 'scheduled',   label: 'Scheduled',   color: COLORS.info },
  { key: 'in_progress', label: 'In Progress',  color: COLORS.violet },
  { key: 'on_hold',     label: 'On Hold',      color: COLORS.warning },
  { key: 'completed',   label: 'Completed',    color: COLORS.success },
  { key: 'cancelled',   label: 'Cancelled',    color: COLORS.gray500 },
]

const PRIORITY_PILLS = [
  { key: 'all',    label: 'All Priority' },
  { key: 'urgent', label: 'Urgent',  color: COLORS.error },
  { key: 'high',   label: 'High',    color: COLORS.orange },
  { key: 'normal', label: 'Normal',  color: COLORS.info },
  { key: 'low',    label: 'Low',     color: COLORS.gray400 },
]

interface CalendarJob {
  id: string
  jobNumber: string
  title: string | null
  status: string | null
  scheduledDate: string | null
  priority: string | null
  client: { firstName: string; lastName: string; company?: string | null; useCompanyName?: boolean } | null
  assignedTo: { name: string } | null
  propertyCity: string | null
}

function clientLabel(job: CalendarJob): string {
  if (!job.client) return ''
  return (job.client.useCompanyName && job.client.company)
    ? job.client.company
    : `${job.client.firstName} ${job.client.lastName}`
}

/** Custom event pill rendered inside FullCalendar */
function EventContent({ info }: { info: EventContentArg }) {
  const job = info.event.extendedProps as CalendarJob
  const color = STATUS_COLORS[job.status ?? ''] ?? COLORS.gray500
  const borderLeft = PRIORITY_BORDER[job.priority ?? '']
  const client = clientLabel(job)
  const isMonth = info.view.type === 'dayGridMonth'

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant='caption' fontWeight={700}>{info.event.title}</Typography>
          {client && <Typography variant='caption' display='block'>{client}</Typography>}
          {job.assignedTo && <Typography variant='caption' display='block'>👤 {job.assignedTo.name}</Typography>}
          {job.propertyCity && <Typography variant='caption' display='block'>📍 {job.propertyCity}</Typography>}
          <Typography variant='caption' display='block' sx={{ textTransform: 'capitalize', mt: 0.5 }}>
            {job.status?.replace('_', ' ')} · {job.priority ?? 'normal'}
          </Typography>
        </Box>
      }
      arrow
      placement='top'
    >
      <Box
        sx={{
          width: '100%',
          px: 0.75,
          py: isMonth ? 0.2 : 0.4,
          borderRadius: '4px',
          bgcolor: `${color}22`,
          borderLeft: borderLeft ? `3px solid ${borderLeft}` : `3px solid ${color}`,
          cursor: 'pointer',
          overflow: 'hidden',
          lineHeight: 1.3,
        }}
      >
        <Typography
          variant='caption'
          sx={{ color, fontWeight: 600, fontSize: '0.72rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {info.timeText && <span style={{ opacity: 0.8, marginRight: 3 }}>{info.timeText}</span>}
          {info.event.title}
        </Typography>
        {!isMonth && client && (
          <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.68rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client}
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}

export default function CalendarView() {
  const theme = useTheme()
  const router = useRouter()
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null)
  const isDark = theme.palette.mode === 'dark'

  const [statusFilter, setStatusFilter]   = useLocalStorage<string>('calendar-status-filter', 'all')
  const [priorityFilter, setPriorityFilter] = useLocalStorage<string>('calendar-priority-filter', 'all')

  // Track the calendar's currently displayed date for the title dropdowns
  const now = new Date()
  const [navMonth, setNavMonth] = useState(now.getMonth())   // 0-indexed
  const [navYear, setNavYear]   = useState(now.getFullYear())
  const [navDay, setNavDay]     = useState(now.getDate())
  const [viewType, setViewType] = useLocalStorage<string>('calendar-view', 'dayGridMonth')

  const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const DAYS_IN_MONTH = new Date(navYear, navMonth + 1, 0).getDate()

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    // arg.start is the first day in the current view range
    const mid = new Date((arg.start.getTime() + arg.end.getTime()) / 2)
    setNavMonth(mid.getMonth())
    setNavYear(mid.getFullYear())
    setNavDay(arg.start.getDate())
    setViewType(arg.view.type)
  }, [])

  const jumpTo = useCallback((month: number, year: number, day?: number) => {
    calendarRef.current?.getApi().gotoDate(new Date(year, month, day ?? 1))
  }, [])

  const { data: jobs = [], isLoading } = useQuery<CalendarJob[]>({
    queryKey: ['jobs-calendar'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND}/api/jobs?include=client,assignedTo`)
      if (!res.ok) throw new Error('Failed to fetch jobs')
      return res.json()
    },
    staleTime: 60_000,
  })

  // Map filtered jobs → FullCalendar EventInput objects
  const events = useMemo(() => {
    const filtered = jobs.filter(j => {
      if (!j.scheduledDate) return false
      if (statusFilter !== 'all' && j.status !== statusFilter) return false
      if (priorityFilter !== 'all' && (j.priority ?? 'normal') !== priorityFilter) return false
      return true
    })

    return filtered.map(j => ({
      id: j.id,
      title: j.title || `Job #${j.jobNumber}`,
      start: j.scheduledDate!,
      end: new Date(new Date(j.scheduledDate!).getTime() + 60 * 60 * 1000).toISOString(),
      color: STATUS_COLORS[j.status ?? ''] ?? COLORS.gray500,
      extendedProps: j,
    }))
  }, [jobs, statusFilter, priorityFilter])

  const handleEventClick = useCallback((_info: EventClickArg) => {
    router.push('/jobs')
  }, [router])

  const visibleCount = events.length
  const totalCount = jobs.filter(j => j.scheduledDate).length

  // FullCalendar custom styles — overrides FC defaults to match MUI theme
  const fcStyles = `
    .fc { font-family: ${theme.typography.fontFamily}; }
    .fc-toolbar-title { display: none !important; }
    .fc-button-primary {
      background-color: ${theme.palette.primary.main} !important;
      border-color: ${theme.palette.primary.main} !important;
      font-size: 0.82rem !important;
      padding: 5px 14px !important;
      border-radius: 6px !important;
      text-transform: capitalize !important;
      margin-left: 4px !important;
    }
    .fc-button-group { gap: 4px !important; display: inline-flex !important; }
    .fc-button-group .fc-button-primary { margin-left: 0 !important; }
    .fc-toolbar-chunk { display: flex; align-items: center; gap: 6px; }
    .fc-button-primary:hover { filter: brightness(1.12) !important; }
    .fc-button-primary:disabled { opacity: 0.4 !important; }
    .fc-button-active { filter: brightness(0.88) !important; }
    .fc-col-header-cell { padding: 6px 0 !important; }
    .fc-col-header-cell-cushion { font-weight: 600; font-size: 0.8rem; color: ${theme.palette.text.secondary}; text-decoration: none !important; }
    .fc-daygrid-day-number { font-size: 0.82rem; color: ${theme.palette.text.secondary}; text-decoration: none !important; }
    .fc-daygrid-day.fc-day-today { background: ${theme.palette.primary.main}14 !important; }
    .fc-timegrid-slot { height: 44px !important; }
    .fc-timegrid-slot-label { font-size: 0.72rem; color: ${theme.palette.text.secondary}; }
    .fc-list-event:hover td { background: ${theme.palette.action.hover} !important; cursor: pointer; }
    .fc-list-day-cushion { background: ${isDark ? theme.palette.background.default : COLORS.gray100} !important; }
    .fc-scrollgrid, .fc-scrollgrid td, .fc-scrollgrid th { border-color: ${theme.palette.divider} !important; }
    .fc-event { border: none !important; background: transparent !important; }
    .fc-event-main { padding: 1px 0 !important; }
    .fc-more-link { font-size: 0.72rem; color: ${theme.palette.primary.main}; }
    .fc-timegrid-now-indicator-line { border-color: ${theme.palette.error.main} !important; }
    .fc-timegrid-now-indicator-arrow { border-color: ${theme.palette.error.main} !important; }
  `

  return (
    <Box sx={{ p: 3 }}>
      <style>{fcStyles}</style>

      {/* ─── Header row ────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant='h4'>Calendar</Typography>
        {isLoading && <CircularProgress size={22} />}

        {/* Month / Year (+ Day in day view) quick-nav dropdowns */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
          <Select
            size='small'
            value={navMonth}
            onChange={e => { const m = Number(e.target.value); setNavMonth(m); jumpTo(m, navYear, viewType === 'timeGridDay' ? navDay : undefined) }}
            sx={{ fontSize: '0.9rem', fontWeight: 600, minWidth: 120 }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 320 } }, MenuListProps: { dense: true, sx: { py: 0.5, '& .MuiMenuItem-root': { py: '3px', minHeight: 'unset', fontSize: '0.875rem' } } } }}
          >
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((name, i) => (
              <MuiMenuItem key={i} value={i}>{name}</MuiMenuItem>
            ))}
          </Select>

          {/* Day selector — only visible in day view */}
          {viewType === 'timeGridDay' && (
            <>
              <Select
                size='small'
                value={navDay}
                onChange={e => { const d = Number(e.target.value); setNavDay(d); jumpTo(navMonth, navYear, d) }}
                sx={{ fontSize: '0.9rem', fontWeight: 600, minWidth: 70 }}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } }, MenuListProps: { dense: true, sx: { py: 0.25, '& .MuiMenuItem-root': { py: '2px', minHeight: 'unset', fontSize: '0.875rem' } } } }}
              >
                {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map(d => (
                  <MuiMenuItem key={d} value={d}>{d}</MuiMenuItem>
                ))}
              </Select>
              <Typography variant='body1' fontWeight={600} color='text.secondary'>
                {WEEKDAYS[new Date(navYear, navMonth, navDay).getDay()]}
              </Typography>
            </>
          )}

          <Select
            size='small'
            value={navYear}
            onChange={e => { const y = Number(e.target.value); setNavYear(y); jumpTo(navMonth, y, viewType === 'timeGridDay' ? navDay : undefined) }}
            sx={{ fontSize: '0.9rem', fontWeight: 600, minWidth: 90 }}
            MenuProps={{ PaperProps: { sx: { maxHeight: 320 } }, MenuListProps: { dense: true, sx: { py: 0.5, '& .MuiMenuItem-root': { py: '3px', minHeight: 'unset', fontSize: '0.875rem' } } } }}
          >
            {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
              <MuiMenuItem key={y} value={y}>{y}</MuiMenuItem>
            ))}
          </Select>
        </Box>

        {!isLoading && (
          <Typography variant='body2' color='text.secondary'>
            {visibleCount === totalCount ? `${totalCount} job${totalCount !== 1 ? 's' : ''}` : `${visibleCount} of ${totalCount} jobs`}
          </Typography>
        )}
      </Box>

      {/* ─── Filter pills ───────────────────────────────────────────── */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important', display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* Status row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant='caption' color='text.secondary' sx={{ minWidth: 56, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Status
            </Typography>
            {STATUS_PILLS.map(pill => {
              const active = statusFilter === pill.key
              return (
                <Chip
                  key={pill.key}
                  label={pill.label}
                  size='small'
                  onClick={() => setStatusFilter(pill.key)}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: active ? 700 : 400,
                    bgcolor: active
                      ? pill.color ? `${pill.color}22` : 'primary.main'
                      : 'transparent',
                    color: active
                      ? pill.color ?? 'primary.contrastText'
                      : 'text.secondary',
                    border: '1px solid',
                    borderColor: active
                      ? pill.color ?? 'primary.main'
                      : 'divider',
                    '&:hover': {
                      bgcolor: pill.color ? `${pill.color}18` : 'action.hover',
                      borderColor: pill.color ?? 'primary.main',
                    },
                    transition: 'all 0.15s',
                  }}
                />
              )
            })}
          </Box>

          <Divider />

          {/* Priority row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant='caption' color='text.secondary' sx={{ minWidth: 56, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Priority
            </Typography>
            {PRIORITY_PILLS.map(pill => {
              const active = priorityFilter === pill.key
              return (
                <Chip
                  key={pill.key}
                  label={pill.label}
                  size='small'
                  onClick={() => setPriorityFilter(pill.key)}
                  icon={pill.color ? (
                    <Box component='span' sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: pill.color, ml: '6px !important', mr: '-2px !important', flexShrink: 0 }} />
                  ) : undefined}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: active ? 700 : 400,
                    bgcolor: active
                      ? pill.color ? `${pill.color}22` : 'primary.main'
                      : 'transparent',
                    color: active
                      ? pill.color ?? 'primary.contrastText'
                      : 'text.secondary',
                    border: '1px solid',
                    borderColor: active
                      ? pill.color ?? 'primary.main'
                      : 'divider',
                    '&:hover': {
                      bgcolor: pill.color ? `${pill.color}18` : 'action.hover',
                      borderColor: pill.color ?? 'primary.main',
                    },
                    transition: 'all 0.15s',
                  }}
                />
              )
            })}
          </Box>
        </CardContent>
      </Card>

      {/* ─── FullCalendar ───────────────────────────────────────────── */}
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <FullCalendar
            key={viewType}
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={viewType}
            headerToolbar={{
              left:   'prev,next today',
              center: 'title',
              right:  'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
            }}
            buttonText={{
              today: 'Today',
              month: 'Month',
              week:  'Week',
              day:   'Day',
              list:  'Agenda',
            }}
            events={events}
            eventContent={info => <EventContent info={info} />}
            eventClick={handleEventClick}
            datesSet={handleDatesSet}
            height='auto'
            dayMaxEvents={4}
            nowIndicator
            weekends
            selectable
            selectMirror
            scrollTime='08:00:00'
            views={{
              timeGridDay: {
                dayHeaderFormat: { weekday: 'long', month: 'short', day: 'numeric' },
              },
              timeGridWeek: {
                dayHeaderFormat: { weekday: 'short', day: 'numeric' },
              },
            }}
          />
        </CardContent>
      </Card>
    </Box>
  )
}
