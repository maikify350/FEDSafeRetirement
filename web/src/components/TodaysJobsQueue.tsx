'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import { api } from '@/lib/api'
import type { Job } from '@shared/contracts'

type TodaysJobsQueueProps = {
  onJobClick?: (job: Job) => void
}

/**
 * Chip + dialog showing jobs scheduled for today.
 * Auto-refreshes every 60 seconds. Clicking the chip opens a dialog
 * listing all today's jobs with time, client, and location info.
 *
 * @module components/TodaysJobsQueue
 */
export default function TodaysJobsQueue({ onJobClick }: TodaysJobsQueueProps) {
  const [open, setOpen] = useState(false)

  // Fetch today's jobs
  const { data: todaysJobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ['jobs', 'today'],
    queryFn: async () => {
      const allJobs = await api.get<Job[]>('/api/jobs')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Filter for jobs scheduled for today
      return allJobs.filter(job => {
        if (!job.scheduledDate) return false
        const jobDate = new Date(job.scheduledDate)
        return jobDate >= today && jobDate < tomorrow
      })
    },
    refetchInterval: 60000 // Refresh every minute
  })

  const count = todaysJobs.length

  if (count === 0) return null

  const handleJobClick = (job: Job) => {
    if (onJobClick) {
      onJobClick(job)
    }
    setOpen(false)
  }

  return (
    <>
      <Chip
        label={`Today's Jobs: ${count}`}
        color='primary'
        variant='filled'
        onClick={() => setOpen(true)}
        icon={<i className='tabler-calendar-check' />}
        sx={{
          fontWeight: 600,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'primary.dark'
          }
        }}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle className='flex items-center justify-between'>
          <Box className='flex items-center gap-2'>
            <i className='tabler-calendar-check text-2xl' />
            <span>Today's Jobs Queue</span>
            <Chip label={count} size='small' color='primary' />
          </Box>
          <IconButton size='small' onClick={() => setOpen(false)}>
            <i className='tabler-x' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {isLoading ? (
            <Box className='flex justify-center py-8'>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {todaysJobs.map((job) => {
                const scheduledTime = job.scheduledDate
                  ? new Date(job.scheduledDate).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'No time'

                return (
                  <ListItem key={job.id} disablePadding>
                    <ListItemButton onClick={() => handleJobClick(job)}>
                      <ListItemAvatar>
                        <Avatar
                          className={
                            job.tradeType === 'Residential'
                              ? 'bg-info-main'
                              : 'bg-success-main'
                          }
                        >
                          <i
                            className={
                              job.tradeType === 'Residential'
                                ? 'tabler-home'
                                : 'tabler-building'
                            }
                          />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box className='flex items-center gap-2'>
                            <Typography variant='body2' className='font-semibold'>
                              {job.jobNumber || 'Draft'}
                            </Typography>
                            <Chip label={scheduledTime} size='small' variant='outlined' />
                            {job.assignedTo && (
                              <Chip
                                label='Assigned'
                                size='small'
                                color='success'
                                icon={<i className='tabler-user-check' />}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography component='span' variant='body2' color='text.primary'>
                              {job.clientName || 'Unknown Client'}
                            </Typography>
                            <br />
                            <Typography component='span' variant='caption' color='text.secondary'>
                              {job.description || 'No description'}
                            </Typography>
                            {(job.propertyStreet || job.propertyCity) && (
                              <>
                                <br />
                                <Typography component='span' variant='caption' color='text.secondary'>
                                  📍 {[job.propertyStreet, job.propertyCity]
                                    .filter(Boolean)
                                    .join(', ')}
                                </Typography>
                              </>
                            )}
                          </>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                )
              })}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
