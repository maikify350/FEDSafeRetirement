'use client'

import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Grid from '@mui/material/Grid'

import { fmtStatus } from '@/utils/formatStatus'

// ⚠️ SCHEMA GOVERNANCE: import from shared contracts — do NOT redefine locally.
// If fields change in Supabase, update shared/contracts.ts first, then validate this component.
import type { Job } from '@shared/contracts'

const STATUS_COLORS: Record<string, 'warning' | 'info' | 'error' | 'success' | 'secondary'> = {
  unscheduled: 'error',
  scheduled: 'info',
  in_progress: 'warning',
  on_hold: 'error',
  completed: 'success',
  cancelled: 'secondary',
}

const PRIORITY_COLORS: Record<string, 'default' | 'success' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  normal: 'info',
  high: 'warning',
  urgent: 'error',
}

// Left border accent color per status (CSS color values)
const cardAccentColors: Record<string, string> = {
  scheduled: 'var(--mui-palette-info-main)',
  in_progress: 'var(--mui-palette-warning-main)',
  on_hold: 'var(--mui-palette-error-main)',
  completed: 'var(--mui-palette-success-main)',
  cancelled: 'var(--mui-palette-secondary-main)',
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const fmtMoney = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

type Props = {
  jobs: Job[]
  onJobClick: (job: Job) => void
}

/**
 * Card grid view for jobs.
 * Follows the same pattern as ClientCardGrid.
 */
const JobCardGrid = ({ jobs, onJobClick }: Props) => {
  return (
    <Grid container spacing={4} className='p-6'>
      {jobs.map(job => {
        const clientName = job.client
          ? `${job.client.firstName} ${job.client.lastName}${job.client.company ? ` (${job.client.company})` : ''}`
          : '—'

        return (
          <Grid key={job.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              variant='outlined'
              className='transition-all hover:shadow-md'
              onDoubleClick={() => onJobClick(job)}
              sx={{
                position: 'relative',
                cursor: 'default',
                borderLeftWidth: '4px',
                borderLeftColor: cardAccentColors[job.status ?? ''] ?? 'var(--mui-palette-divider)',
                '&:hover': {
                  borderColor: cardAccentColors[job.status ?? ''] ?? 'var(--mui-palette-primary-main)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <CardContent className='flex flex-col gap-3'>
                {/* Status + Priority chips — absolute top-right */}
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center'
                  }}
                >
                  {(job.client as any)?.customerType && (
                    <Chip
                      icon={<i className={(job.client as any).customerType.toLowerCase() === 'residential' ? 'tabler-home' : 'tabler-building'} style={{ fontSize: '0.7rem' }} />}
                      label={(job.client as any).customerType}
                      size='small'
                      variant='tonal'
                      color={(job.client as any).customerType.toLowerCase() === 'residential' ? 'info' : 'warning'}
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        '& .MuiChip-label': { px: '6px' },
                        '& .MuiChip-icon': { ml: '4px', mr: '-2px' }
                      }}
                    />
                  )}
                  {job.priority && (
                    <Chip
                      variant='outlined'
                      label={job.priority}
                      size='small'
                      color={PRIORITY_COLORS[job.priority] || 'default'}
                      className='capitalize'
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        '& .MuiChip-label': { px: '6px' }
                      }}
                    />
                  )}
                  {job.status && (() => {
                    const isUnscheduled = job.status === 'scheduled' && !job.scheduledDate
                    return (
                      <Chip
                        variant='tonal'
                        label={isUnscheduled ? 'Unscheduled' : fmtStatus(job.status)}
                        size='small'
                        color={isUnscheduled ? 'error' : (STATUS_COLORS[job.status] || 'secondary')}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          '& .MuiChip-label': { px: '6px' }
                        }}
                      />
                    )
                  })()}
                </div>

                {/* Job Number + Title */}
                <div className='flex flex-col gap-1'>
                  <Typography variant='body2' fontWeight={600} color='primary'>
                    {job.jobNumber}
                  </Typography>
                  <Typography className='font-medium truncate' color='text.primary'>
                    {job.title}
                  </Typography>
                </div>

                {/* Details */}
                <div className='flex flex-col gap-1'>
                  <div className='flex items-center gap-2'>
                    <i className='tabler-user text-textSecondary text-[16px]' />
                    <Typography variant='body2' className='truncate'>
                      {clientName}
                    </Typography>
                  </div>
                  {job.scheduledDate && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-calendar text-textSecondary text-[16px]' />
                      <Typography variant='body2'>{fmtDate(job.scheduledDate)}</Typography>
                    </div>
                  )}
                  {job.assignedTo?.name && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-user-check text-textSecondary text-[16px]' />
                      <Typography variant='body2'>{job.assignedTo.name}</Typography>
                    </div>
                  )}
                  {job.total != null && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-currency-dollar text-textSecondary text-[16px]' />
                      <Typography variant='body2' fontWeight={500}>
                        {fmtMoney(job.total)}
                      </Typography>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='flex items-center justify-end gap-1 border-bs pbs-2'>
                  <IconButton
                    size='small'
                    onClick={e => {
                      e.stopPropagation()
                      onJobClick(job)
                    }}
                  >
                    <i className='tabler-edit text-textSecondary text-[18px]' />
                  </IconButton>
                  <Tooltip title='Job Details — coming soon'>
                    <span>
                      <IconButton size='small' disabled sx={{ opacity: 0.4 }}>
                        <i className='tabler-eye text-textSecondary text-[18px]' />
                      </IconButton>
                    </span>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </Grid>
        )
      })}

      {jobs.length === 0 && (
        <Grid size={{ xs: 12 }}>
          <Typography className='text-center p-8' color='text.secondary'>
            No jobs found
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

export default JobCardGrid
