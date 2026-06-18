'use client'

import { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { api } from '@/lib/api'
import type { Job } from '@shared/contracts'
import WeatherPopup from '@/components/WeatherPopup'
import LocationQuickActions from '@/components/LocationQuickActions'
import PriorityBadge from '@/components/PriorityBadge'
import QuickNotesPopup from '@/components/QuickNotesPopup'
import JobsFilterSearch from '@/components/JobsFilterSearch'
import TodaysJobsQueue from '@/components/TodaysJobsQueue'

// Draggable Job Item Component
function DraggableJobItem({ job, children }: { job: Job; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

type JobsListProps = {
  selectedJobId: string | null
  onSelectJob: (id: string | null) => void
  selectedTechId: string | null
  onDispatch: () => void
  isDispatching: boolean
}

/** All known job statuses for the filter chips */
const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open',        color: 'warning'  as const },
  { value: 'unscheduled', label: 'Unscheduled', color: 'error'    as const },
  { value: 'draft',       label: 'Draft',       color: 'default'  as const },
  { value: 'scheduled',   label: 'Scheduled',   color: 'info'     as const },
  { value: 'in progress', label: 'In Progress', color: 'primary'  as const },
  { value: 'on hold',     label: 'On Hold',     color: 'secondary' as const },
  { value: 'completed',   label: 'Completed',   color: 'success'  as const },
]

export default function JobsList({ selectedJobId, onSelectJob, selectedTechId, onDispatch, isDispatching }: JobsListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [filters, setFilters] = useState<{
    priorities: string[]
    statuses: string[]
    tradeTypes: string[]
  }>({
    priorities: [],
    statuses: [],
    tradeTypes: []
  })

  // Fetch ALL jobs (filtering happens client-side via statusFilter)
  const { data: allJobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', 'dispatch', 'all'],
    queryFn: () => api.get<Job[]>('/api/jobs')
  })

  // Apply the status filter to get the base job set
  const jobs = useMemo(() => {
    switch (statusFilter) {
      case 'open':
        return allJobs.filter(job =>
          !job.assignedTo || job.status === 'scheduled' || job.status === 'draft'
        )
      case 'unscheduled':
        return allJobs.filter(job => !job.scheduledDate)
      default:
        return allJobs.filter(job =>
          job.status?.toLowerCase() === statusFilter.toLowerCase()
        )
    }
  }, [allJobs, statusFilter])

  // Get unique values for filters
  const availableFilters = useMemo(() => {
    const priorities = new Set<string>()
    const statuses = new Set<string>()
    const tradeTypes = new Set<string>()

    jobs.forEach(job => {
      if (job.priority) priorities.add(job.priority)
      if (job.status) statuses.add(job.status)
      if (job.tradeType) tradeTypes.add(job.tradeType)
    })

    return {
      priorities: Array.from(priorities),
      statuses: Array.from(statuses),
      tradeTypes: Array.from(tradeTypes)
    }
  }, [jobs])

  // Filter and search jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch =
          job.jobNumber?.toLowerCase().includes(search) ||
          job.clientName?.toLowerCase().includes(search) ||
          job.description?.toLowerCase().includes(search) ||
          job.propertyStreet?.toLowerCase().includes(search) ||
          job.propertyCity?.toLowerCase().includes(search)

        if (!matchesSearch) return false
      }

      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(job.priority || '')) {
        return false
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(job.status || '')) {
        return false
      }

      // Trade type filter
      if (filters.tradeTypes.length > 0 && !filters.tradeTypes.includes(job.tradeType || '')) {
        return false
      }

      return true
    })
  }, [jobs, searchTerm, filters])

  const canDispatch = selectedJobId && selectedTechId

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader
        title={
          <Box className='flex items-center gap-2'>
            <span>Jobs</span>
            <TodaysJobsQueue onJobClick={onSelectJob} />
          </Box>
        }
        subheader={`${jobs.length} ${statusFilter === 'open' ? 'jobs awaiting assignment' : `${statusFilter} jobs`}`}
        avatar={
          <Avatar className='bg-warning-main'>
            <i className='tabler-briefcase' />
          </Avatar>
        }
        action={
          <Button
            variant='contained'
            color='primary'
            disabled={!canDispatch || isDispatching}
            onClick={onDispatch}
            startIcon={isDispatching ? <CircularProgress size={20} /> : <i className='tabler-send' />}
          >
            Dispatch
          </Button>
        }
      />
      {/* Status Filter Chips */}
      <Box className='flex items-center gap-1 px-4 pb-2 flex-wrap'>
        {STATUS_OPTIONS.map(opt => (
          <Chip
            key={opt.value}
            label={opt.label}
            size='small'
            color={statusFilter === opt.value ? opt.color : 'default'}
            variant={statusFilter === opt.value ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter(opt.value)}
            sx={{ cursor: 'pointer', fontWeight: statusFilter === opt.value ? 600 : 400 }}
          />
        ))}
      </Box>

      <CardContent className='flex-1 overflow-y-auto p-0'>
        {isLoading ? (
          <Box className='flex items-center justify-center h-full'>
            <CircularProgress />
          </Box>
        ) : jobs.length === 0 ? (
          <Box className='flex flex-col items-center justify-center h-full p-4'>
            <i className='tabler-clipboard-check text-6xl text-gray-300 mb-2' />
            <Typography variant='body2' color='text.secondary'>
              No open jobs
            </Typography>
          </Box>
        ) : (
          <>
            {/* Filter and Search */}
            <JobsFilterSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filters={filters}
              onFiltersChange={setFilters}
              availableFilters={availableFilters}
            />

            {canDispatch && (
              <Alert severity='info' className='m-4 mb-0'>
                Click "Dispatch" to assign job #{jobs.find(j => j.id === selectedJobId)?.jobNumber?.split('-').pop()} to selected tech
              </Alert>
            )}

            {filteredJobs.length === 0 ? (
              <Box className='flex flex-col items-center justify-center p-8'>
                <i className='tabler-filter-off text-6xl text-gray-300 mb-2' />
                <Typography variant='body2' color='text.secondary'>
                  No jobs match your filters
                </Typography>
              </Box>
            ) : (
              <List>
                {filteredJobs.map((job) => {
                // Get status color
                const getStatusColor = (status: string | null | undefined) => {
                  if (!status) return 'default'
                  const s = status.toLowerCase()
                  if (s === 'scheduled') return 'warning'
                  if (s === 'assigned') return 'info'
                  if (s === 'in progress') return 'primary'
                  if (s === 'on hold') return 'default'
                  if (s === 'completed') return 'success'
                  return 'default'
                }

                // Get simulated lat/lng from address hash for demo
                // In production, these should be geocoded and stored in the job record
                const getCoordinates = (jobId: string) => {
                  const hash = jobId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
                  const latOffset = ((hash % 100) - 50) / 1000 // -0.05 to 0.05
                  const lngOffset = ((hash % 150) - 75) / 1000 // -0.075 to 0.075
                  return {
                    lat: 38.9072 + latOffset,
                    lng: -77.0369 + lngOffset
                  }
                }

                const coords = getCoordinates(job.id)

                return (
                  <DraggableJobItem key={job.id} job={job}>
                    <ListItem
                      disablePadding
                      className='relative'
                      secondaryAction={
                      <Box className='flex flex-col gap-1 items-end'>
                        <Chip
                          label={job.status}
                          size='small'
                          color={getStatusColor(job.status)}
                        />
                        {job.priority && <PriorityBadge priority={job.priority} size='small' />}
                      </Box>
                    }
                  >
                    {/* Priority border indicator */}
                    {job.priority && <PriorityBadge priority={job.priority} variant='border' />}

                    <ListItemButton
                      selected={selectedJobId === job.id}
                      onClick={() => onSelectJob(job.id === selectedJobId ? null : job.id)}
                      className='pl-3'
                    >
                      <ListItemAvatar>
                        <Avatar className={job.tradeType === 'Residential' ? 'bg-info-main' : 'bg-success-main'}>
                          <i className={job.tradeType === 'Residential' ? 'tabler-home' : 'tabler-building'} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box className='flex items-center gap-2'>
                            <Typography variant='body1' className='font-bold tracking-wide' sx={{ fontSize: '0.95rem', letterSpacing: '0.025em' }}>
                              {job.jobNumber || 'Draft'} - {job.clientName || 'Unknown Client'}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography component='span' variant='body2' color='text.primary' className='block'>
                              {job.description || 'No description'}
                            </Typography>
                            {(job.propertyStreet || job.propertyCity) && (
                              <Typography component='span' variant='caption' color='text.secondary' className='block mt-1 flex items-center gap-1'>
                                <i className='tabler-map-pin text-sm' />
                                {[job.propertyStreet, job.propertyCity, job.propertyState].filter(Boolean).join(', ')}
                              </Typography>
                            )}
                            <Box className='flex items-center gap-1 mt-1'>
                              <Typography variant='caption' color='text.secondary' className='flex items-center gap-1'>
                                <i className='tabler-calendar text-sm' />
                                {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'Not scheduled'}
                              </Typography>
                              {/* Quick actions */}
                              <Box className='ml-auto flex items-center gap-0'>
                                <QuickNotesPopup
                                  jobId={job.id}
                                  currentNotes={job.notes}
                                  jobNumber={job.jobNumber || undefined}
                                  size='small'
                                />
                                <WeatherPopup
                                  address={[job.propertyStreet, job.propertyCity].filter(Boolean).join(', ')}
                                  latitude={coords.lat}
                                  longitude={coords.lng}
                                  size='small'
                                />
                                <LocationQuickActions
                                  address={job.propertyStreet || ''}
                                  city={job.propertyCity || ''}
                                  state={job.propertyState || ''}
                                  zip={job.propertyZipCode || ''}
                                  latitude={coords.lat}
                                  longitude={coords.lng}
                                  size='small'
                                />
                              </Box>
                            </Box>
                          </>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  </DraggableJobItem>
                )
              })}
            </List>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
