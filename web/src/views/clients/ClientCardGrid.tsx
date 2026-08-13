'use client'

import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Grid from '@mui/material/Grid'

import CustomAvatar from '@core/components/mui/Avatar'
import ContactLink from '@components/ContactLink'
import { getInitials } from '@/utils/getInitials'

// ⚠️ SCHEMA GOVERNANCE: import from shared contracts — do NOT redefine locally.
// If fields change in Supabase, update shared/contracts.ts first, then validate this component.
import type { Client } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


type CustomerTypeColor = {
  [key: string]: 'primary' | 'success' | 'warning' | 'info' | 'error' | 'secondary'
}

const customerTypeColors: CustomerTypeColor = {
  Residential: 'primary',
  Commercial: 'success',
  Industrial: 'warning'
}

// Left border accent color per type (CSS color values)
const cardAccentColors: Record<string, string> = {
  Residential: 'var(--mui-palette-primary-main)',
  Commercial:  'var(--mui-palette-success-main)',
  Industrial:  'var(--mui-palette-warning-main)'
}

const getEmail = (client: Client) => {
  const defaultEmail = client.emails?.find((e: { address: string; isDefault: boolean }) => e.isDefault)
  return defaultEmail?.address || client.emails?.[0]?.address || client.email || ''
}

const getPhone = (client: Client) => {
  const defaultPhone = client.phoneNumbers?.find((p: { number: string; isDefault: boolean }) => p.isDefault)
  return defaultPhone?.number || client.phoneNumbers?.[0]?.number || client.phone || ''
}

type Props = {
  clients: Client[]
  onClientClick: (client: Client) => void
  isFavorite: (id: string) => boolean
  toggleFavorite: (id: string) => void
}

/**
 * Card grid view for clients.
 * Reusable pattern — can be adapted for Jobs, Quotes, Invoices, etc.
 */
const ClientCardGrid = ({ clients, onClientClick, isFavorite, toggleFavorite }: Props) => {
  return (
    <Grid container spacing={4} className='p-6'>
      {clients.map(client => {
        const fullName = `${client.firstName} ${client.lastName}`.trim()
        const email = getEmail(client)
        const phone = getPhone(client)
        const location = [client.city, client.state].filter(Boolean).join(', ')
        const favorited = isFavorite(client.id)

        return (
          <Grid key={client.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              variant='outlined'
              className='transition-all hover:shadow-md'
              onDoubleClick={() => onClientClick(client)}
              sx={{
                position: 'relative',
                cursor: 'default',
                borderLeftWidth: '4px',
                borderLeftColor: cardAccentColors[client.customerType ?? ''] ?? 'var(--mui-palette-divider)',
                '&:hover': {
                  borderColor: cardAccentColors[client.customerType ?? ''] ?? 'var(--mui-palette-primary-main)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <CardContent className='flex flex-col gap-3'>
                {/* Type chip — absolute top-right */}
                {client.customerType && (
                  <Chip
                    variant='tonal'
                    label={client.customerType}
                    size='small'
                    color={customerTypeColors[client.customerType] || 'secondary'}
                    className='capitalize'
                    sx={{
                      position: 'absolute',
                      top: 1,
                      right: 1,
                      height: 18,
                      fontSize: '0.65rem',
                      '& .MuiChip-label': { px: '6px' }
                    }}
                  />
                )}

                {/* Header row: favorite star + avatar + name (full width now) */}
                <div className='flex items-start gap-2'>
                  {/* Favorite toggle */}
                  <Tooltip title={favorited ? 'Remove from favorites' : 'Add to favorites'}>
                    <IconButton
                      size='small'
                      onClick={e => { e.stopPropagation(); toggleFavorite(client.id) }}
                      sx={{ mt: '-4px', ml: '-4px', flexShrink: 0 }}
                    >
                      <i
                        className={`${favorited ? 'tabler-star-filled' : 'tabler-star'} text-[18px]`}
                        style={{ color: favorited ? COLORS.brandOrange : 'var(--mui-palette-text-secondary)' }}
                      />
                    </IconButton>
                  </Tooltip>

                  {/* Avatar + name */}
                  <div className='flex items-center gap-3 flex-1 min-w-0'>
                    <CustomAvatar size={38} skin='light' color={customerTypeColors[client.customerType ?? ''] || 'secondary'}>
                      {getInitials(fullName)}
                    </CustomAvatar>
                    <div className='flex flex-col min-w-0'>
                      <Typography className='font-medium truncate' color='text.primary'>
                        {fullName}
                      </Typography>
                      <Typography variant='body2' className='truncate'>
                        {client.company || '—'}
                      </Typography>
                    </div>
                  </div>
                </div>

                {/* Contact details */}
                <div className='flex flex-col gap-1'>
                  {email && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-mail text-textSecondary text-[16px]' />
                      <ContactLink type='email' value={email} className='truncate' />
                    </div>
                  )}
                  {phone && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-phone text-textSecondary text-[16px]' />
                      <ContactLink type='phone' value={phone} />
                    </div>
                  )}
                  {location && (
                    <div className='flex items-center gap-2'>
                      <i className='tabler-map-pin text-textSecondary text-[16px]' />
                      <Typography variant='body2'>{location}</Typography>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='flex items-center justify-end gap-1 border-bs pbs-2'>
                  <IconButton
                    size='small'
                    onClick={e => { e.stopPropagation(); onClientClick(client) }}
                  >
                    <i className='tabler-edit text-textSecondary text-[18px]' />
                  </IconButton>
                  <Tooltip title='Client Details — coming soon'>
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

      {clients.length === 0 && (
        <Grid size={{ xs: 12 }}>
          <Typography className='text-center p-8' color='text.secondary'>
            No clients found
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

export default ClientCardGrid
