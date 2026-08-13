'use client'

import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type { TeamMember } from './TeamFullPageDetail'

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

type Props = {
  data: TeamMember[]
  onEdit: (m: TeamMember) => void
}

/**
 * Mobile-style card grid for team members with avatar and role badges.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/teams/TeamCardGrid.tsx
 */
export default function TeamCardGrid({ data, onEdit }: Props) {
  if (!data.length) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-3 text-center'>
        <i className='tabler-users-group text-5xl opacity-20' />
        <Typography color='text.secondary'>No team members found</Typography>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4'>
      {data.map(member => {
        const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim()
        return (
        <Card key={member.id} variant='outlined' sx={{ position: 'relative', '&:hover': { boxShadow: 3 } }}>
          <CardContent className='flex flex-col items-center gap-2 pt-6 pb-4'>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 20 }}>
              {initials(fullName)}
            </Avatar>
            <Typography variant='subtitle1' fontWeight={600} textAlign='center'>
              {fullName || '—'}
            </Typography>
            {member.role && (
              <Chip label={member.role} size='small' variant='tonal' color='primary' />
            )}
            {member.email && (
              <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 180 }}>
                {member.email}
              </Typography>
            )}
            {member.phone && (
              <Typography variant='caption' color='text.secondary'>{member.phone}</Typography>
            )}
            {member.status && (
              <Chip
                label={member.status.replace('_', ' ')}
                size='small'
                color={member.status === 'ACTIVE' ? 'success' : 'default'}
                variant='tonal'
              />
            )}
          </CardContent>
          <Tooltip title='Edit'>
            <IconButton size='small' onClick={() => onEdit(member)} sx={{ position: 'absolute', top: 8, right: 8 }}>
              <i className='tabler-edit text-base' />
            </IconButton>
          </Tooltip>
        </Card>
        )
      })}
    </div>
  )
}
