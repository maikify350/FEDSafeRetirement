'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Draggable } from '@fullcalendar/interaction'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { api } from '@/lib/api'
import type { Job } from '@shared/contracts'
import PriorityBadge from '@/components/PriorityBadge'
import JobsFilterSearch from '@/components/JobsFilterSearch'
import JobFullPageDetail from '@/views/jobs/JobFullPageDetail'

/** Normalize status strings for consistent comparison.
 *  'Un-Scheduled' → 'unscheduled', 'In Progress' → 'in_progress', etc. */
const normalizeStatus = (s: string) => s.toLowerCase().replace(/-/g, '').replace(/\s+/g, '_')

export default function UnscheduledJobsList() {
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{
    priorities: string[]
    statuses: string[]
    tradeTypes: string[]
  }>({
    priorities: [],
    statuses: ['unscheduled'],
    tradeTypes: []
  })

  const containerRef = useRef<HTMLDivElement>(null)

  const { data: allJobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', 'scheduling', 'all'],
    queryFn: () => api.get<Job[]>('/api/jobs')
  })

  // Filter to only show unscheduled
  const jobs = useMemo(() => {
    return allJobs.filter(job => !job.scheduledDate)
  }, [allJobs])

  // Re-run when loading finishes and the container element mounts
  const hasJobs = !isLoading && jobs.length > 0

  useEffect(() => {
    if (!containerRef.current) return
    const draggable = new Draggable(containerRef.current, {
      itemSelector: '.fc-event-job',
      eventData: function(eventEl) {
        return {
          id: eventEl.dataset.id,
          title: eventEl.dataset.title,
          duration: '01:00', // default 1-hour block on the calendar
          create: true,
        }
      }
    })
    return () => draggable.destroy()
  }, [hasJobs])

  const availableFilters = useMemo(() => {
    const priorities = new Set<string>()
    const statuses = new Set<string>()
    const tradeTypes = new Set<string>()

    jobs.forEach(job => {
      const j = job as any
      if (job.priority) priorities.add(job.priority)
      if (job.status) {
        // Normalize: status_definition may return 'Un-Scheduled' etc.
        const normalized = normalizeStatus(job.status)
        const effectiveStatus = (!job.scheduledDate && normalized === 'scheduled') ? 'unscheduled' : normalized
        statuses.add(effectiveStatus)
      }
      if (j.tradeType) tradeTypes.add(j.tradeType)
    })

    return {
      priorities: Array.from(priorities),
      statuses: Array.from(statuses),
      tradeTypes: Array.from(tradeTypes)
    }
  }, [jobs])

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const j = job as any
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch =
          job.jobNumber?.toLowerCase().includes(search) ||
          (j.clientName as string)?.toLowerCase().includes(search) ||
          job.description?.toLowerCase().includes(search) ||
          job.propertyStreet?.toLowerCase().includes(search) ||
          job.propertyCity?.toLowerCase().includes(search)

        if (!matchesSearch) return false
      }

      if (filters.priorities.length > 0 && !filters.priorities.includes(job.priority || '')) {
        return false
      }

      if (filters.statuses.length > 0) {
        // Normalize status for comparison (handles 'Un-Scheduled' → 'unscheduled' etc.)
        const normalized = normalizeStatus(job.status || '')
        const effectiveStatus = (!job.scheduledDate && normalized === 'scheduled') ? 'unscheduled' : normalized
        if (!filters.statuses.includes(effectiveStatus)) return false
      }

      if (filters.tradeTypes.length > 0 && !filters.tradeTypes.includes(j.tradeType || '')) {
        return false
      }

      return true
    })
  }, [jobs, searchTerm, filters])

  const cardContent = (
    <Card className='h-full flex flex-col'>
      <CardHeader
        title='Unscheduled Jobs'
        subheader={`${jobs.length} job${jobs.length === 1 ? '' : 's'} need${jobs.length === 1 ? 's' : ''} to be scheduled`}
        avatar={
          <Avatar className='bg-error-main'>
            <i className='tabler-calendar-off' />
          </Avatar>
        }
      />
      
      <CardContent className='flex-1 overflow-y-auto p-0'>
        {isLoading ? (
          <Box className='flex items-center justify-center h-full'>
            <CircularProgress />
          </Box>
        ) : jobs.length === 0 ? (
          <Box className='flex flex-col items-center justify-center h-full p-4'>
            <i className='tabler-calendar-check text-6xl text-gray-300 mb-2' />
            <Typography variant='body2' color='text.secondary'>
              No unscheduled jobs
            </Typography>
          </Box>
        ) : (
          <Box ref={containerRef} className='h-full flex flex-col'>
            <Box className='flex-shrink-0'>
                <JobsFilterSearch
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  filters={filters}
                  onFiltersChange={setFilters}
                  availableFilters={availableFilters}
                />
            </Box>

            {filteredJobs.length === 0 ? (
              <Box className='flex flex-col items-center justify-center p-8'>
                <i className='tabler-filter-off text-6xl text-gray-300 mb-2' />
                <Typography variant='body2' color='text.secondary'>
                  No jobs match your filters
                </Typography>
              </Box>
            ) : (
              <List className='flex-1 overflow-y-auto min-h-0'>
                {filteredJobs.map((job) => {
                  const j = job as any
                  const isResidential = (j.client?.customerType || '').toLowerCase() === 'residential'
                  return (
                    <ListItem
                      key={job.id}
                      disablePadding
                      className='relative fc-event-job select-none cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0'
                      data-id={job.id}
                      data-title={`${job.jobNumber || 'Draft'} - ${j.clientName || 'Unknown'}`}
                      data-tradetype={j.tradeType}
                      data-clientname={j.clientName}
                      secondaryAction={
                        <Box
                          className='flex items-center gap-1'
                          onMouseDown={e => e.stopPropagation()}
                        >
                          {job.priority && <PriorityBadge priority={job.priority} size='small' />}
                          <Tooltip title='Edit Job'>
                            <IconButton
                              size='small'
                              onClick={() => setEditingJobId(job.id)}
                              sx={{ color: 'primary.main' }}
                            >
                              <i className='tabler-pencil text-lg' />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      {job.priority && <PriorityBadge priority={job.priority} variant='border' />}

                      <Box className='flex items-center gap-2 py-2 pl-3 pr-1 w-full'>
                        <ListItemAvatar>
                          <Avatar className={isResidential ? 'bg-info-main' : 'bg-success-main'}>
                            <i className={isResidential ? 'tabler-home' : 'tabler-building'} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box className='flex items-center gap-1'>
                              <Typography
                                component='span'
                                variant='body1'
                                className='font-bold tracking-wide'
                                sx={{
                                  fontSize: '0.95rem',
                                  letterSpacing: '0.025em',
                                  color: 'primary.main',
                                  cursor: 'pointer',
                                  '&:hover': { textDecoration: 'underline' },
                                  pointerEvents: 'auto',
                                }}
                                onMouseDown={e => e.stopPropagation()}
                                onClick={() => setEditingJobId(job.id)}
                              >
                                {job.jobNumber || 'Draft'} - {j.clientName || 'Unknown Client'}
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
                            </>
                          }
                        />
                      </Box>
                    </ListItem>
                  )
                })}
              </List>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )

  return (
    <>
      {cardContent}

      {/* Inline Job Edit Dialog */}
      <JobFullPageDetail
        jobId={editingJobId}
        open={!!editingJobId}
        onClose={() => setEditingJobId(null)}
        onEdit={() => {}}
      />
    </>
  )
}
