'use client'

import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Grid from '@mui/material/Grid'

import ContactLink from '@components/ContactLink'
import { fmtStatus } from '@/utils/formatStatus'

// ⚠️ SCHEMA GOVERNANCE: import from shared contracts — do NOT redefine locally.
import type { Request } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


// Status → accent color mapping (mirrors mobile STATUS_CONFIG)
const statusAccentColors: Record<string, string> = {
  New:                    'var(--mui-palette-info-main)',
  'Assessment Scheduled': 'var(--mui-palette-secondary-main)',
  'Assessment Complete':  'var(--mui-palette-success-main)',
  'Pending Review':       'var(--mui-palette-warning-main)',
  Approved:               'var(--mui-palette-success-main)',
  Converted:              'var(--mui-palette-primary-main)',
  'On Hold':              'var(--mui-palette-text-disabled)',
  Archived:               'var(--mui-palette-text-disabled)',
}

const statusChipColors: Record<string, 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  New:                    'info',
  'Assessment Scheduled': 'secondary',
  'Assessment Complete':  'success',
  'Pending Review':       'warning',
  Approved:               'success',
  Converted:              'primary',
  'On Hold':              'default',
  Archived:               'default',
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null

type Props = {
  requests: Request[]
  onRequestClick: (request: Request) => void
  isFavorite: (id: string) => boolean
  toggleFavorite: (id: string) => void
}

/**
 * Card grid view for requests.
 * Mirrors ClientCardGrid — same layout, Request-specific fields.
 */
const RequestCardGrid = ({ requests, onRequestClick, isFavorite, toggleFavorite }: Props) => {
  return (
    <Grid container spacing={4} className='p-6'>
      {requests.map(request => {
        const clientName = request.client
          ? (request.client.useCompanyName && request.client.company
              ? request.client.company
              : `${request.client.firstName || ''} ${request.client.lastName || ''}`.trim())
          : '—'
        const location = [request.city, request.state].filter(Boolean).join(', ')
        const favorited = isFavorite(request.id)
        const accentColor = statusAccentColors[request.status ?? ''] ?? 'var(--mui-palette-divider)'
        const assessmentDate = fmtDate(request.assessmentDate)
        const hasLinkedRecord = request.quote || request.job

        return (
          <Grid key={request.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              variant='outlined'
              className='transition-all hover:shadow-md'
              onDoubleClick={() => onRequestClick(request)}
              sx={{
                position: 'relative',
                cursor: 'default',
                borderLeftWidth: '4px',
                borderLeftColor: accentColor,
                '&:hover': {
                  borderColor: accentColor,
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <CardContent className='flex flex-col gap-3'>
                {/* Status chip — absolute top-right */}
                {request.status && (
                  <Chip
                    variant='tonal'
                    label={fmtStatus(request.status)}
                    size='small'
                    color={statusChipColors[request.status] ?? 'default'}
                    sx={{
                      position: 'absolute', top: 1, right: 1,
                      height: 18, fontSize: '0.65rem',
                      '& .MuiChip-label': { px: '6px' }
                    }}
                  />
                )}

                {/* Header row: favorite star + title */}
                <div className='flex items-start gap-2'>
                  {/* Favorite toggle */}
                  <Tooltip title={favorited ? 'Remove from favorites' : 'Add to favorites'}>
                    <IconButton size='small'
                      onClick={e => { e.stopPropagation(); toggleFavorite(request.id) }}
                      sx={{ mt: '-4px', ml: '-4px', flexShrink: 0 }}>
                      <i
                        className={`${favorited ? 'tabler-star-filled' : 'tabler-star'} text-[18px]`}
                        style={{ color: favorited ? COLORS.brandOrange : 'var(--mui-palette-text-secondary)' }}
                      />
                    </IconButton>
                  </Tooltip>

                  {/* Title + client */}
                  <div className='flex flex-col min-w-0 flex-1'>
                    <Typography className='font-medium truncate' color='text.primary'>
                      {request.title}
                    </Typography>
                    <Typography variant='body2' className='truncate' color='text.secondary'>
                      {clientName}
                    </Typography>
                  </div>
                </div>

                {/* Details */}
                <div className='flex flex-col gap-1'>
                  {assessmentDate && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-calendar text-textSecondary text-[16px]' />
                      <Typography variant='body2'>Assessment: {assessmentDate}</Typography>
                    </div>
                  )}
                  {request.assignedTo?.name && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-user-check text-textSecondary text-[16px]' />
                      <Typography variant='body2' className='truncate'>{request.assignedTo.name}</Typography>
                    </div>
                  )}
                  {request.clientPhone && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-phone text-textSecondary text-[16px]' />
                      <ContactLink type='phone' value={request.clientPhone} />
                    </div>
                  )}
                  {location && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-map-pin text-textSecondary text-[16px]' />
                      <Typography variant='body2'>{location}</Typography>
                    </div>
                  )}
                  {hasLinkedRecord && (
                    <div className='flex gap-1 flex-wrap'>
                      {request.quote && (
                        <Chip size='small' variant='outlined' color='secondary'
                          label={`Quote ${request.quote.quoteNumber}`}
                          sx={{ fontSize: '0.65rem', height: 18, '& .MuiChip-label': { px: '6px' } }} />
                      )}
                      {request.job && (
                        <Chip size='small' variant='outlined' color='info'
                          label={`Job ${request.job.jobNumber}`}
                          sx={{ fontSize: '0.65rem', height: 18, '& .MuiChip-label': { px: '6px' } }} />
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='flex items-center justify-end gap-1 border-bs pbs-2'>
                  <IconButton size='small' onClick={e => { e.stopPropagation(); onRequestClick(request) }}>
                    <i className='tabler-eye text-textSecondary text-[18px]' />
                  </IconButton>
                </div>
              </CardContent>
            </Card>
          </Grid>
        )
      })}

      {requests.length === 0 && (
        <Grid size={{ xs: 12 }}>
          <Typography className='text-center p-8' color='text.secondary'>
            No requests found
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

export default RequestCardGrid
