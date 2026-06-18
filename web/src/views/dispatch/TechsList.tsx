'use client'

import { useQuery } from '@tanstack/react-query'
import { useDroppable } from '@dnd-kit/core'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { api } from '@/lib/api'
import type { User, Job } from '@shared/contracts'
import DriveTimeDisplay from '@/components/DriveTimeDisplay'
import SkillBadges from '@/components/SkillBadges'

// Droppable Tech Item Component
function DroppableTechItem({ tech, children }: { tech: User; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: tech.id
  })

  const style = {
    backgroundColor: isOver ? 'rgba(25, 118, 210, 0.1)' : undefined,
    borderRadius: '8px',
    transition: 'background-color 0.2s'
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  )
}

type TechsListProps = {
  selectedTechId: string | null
  onSelectTech: (id: string | null) => void
  selectedJobId: string | null
  hiddenTechIds: Set<string>
  onToggleTechVisibility: (techId: string) => void
  onToggleAllTechs: (techIds: string[]) => void
}

/**
 * Compact technician list for scheduling sidebar with availability indicators.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/dispatch/TechsList.tsx
 */
export default function TechsList({ selectedTechId, onSelectTech, selectedJobId, hiddenTechIds, onToggleTechVisibility, onToggleAllTechs }: TechsListProps) {
  // Fetch field techs
  const { data: techs = [], isLoading } = useQuery<User[]>({
    queryKey: ['team-members', 'field'],
    queryFn: async () => {
      const allMembers = await api.get<TeamMember[]>('/api/users')
      // Filter for active field techs (you can adjust this filter based on your role system)
      return allMembers.filter(member => member.status === 'ACTIVE')
    }
  })

  // Fetch selected job for drive time calculation
  const { data: selectedJob } = useQuery<Job>({
    queryKey: ['jobs', selectedJobId],
    queryFn: async () => {
      const allJobs = await api.get<Job[]>('/api/jobs')
      const job = allJobs.find(j => j.id === selectedJobId)
      if (!job) throw new Error('Job not found')
      return job
    },
    enabled: Boolean(selectedJobId)
  })

  // Simulated GPS status - in production this would come from real GPS data
  const getGpsStatus = (techId: string) => {
    const statuses = ['online', 'offline', 'driving'] as const
    const hash = techId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return statuses[hash % statuses.length]
  }

  // Simulated skills - in production this would come from user profile
  const getTechSkills = (techId: string) => {
    const skillSets = [
      ['Plumbing', 'HVAC'],
      ['Electrical'],
      ['HVAC', 'General'],
      ['Plumbing'],
      ['General', 'Carpentry'],
      ['Electrical', 'HVAC'],
      ['Roofing', 'General']
    ]
    const hash = techId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return skillSets[hash % skillSets.length]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success'
      case 'driving':
        return 'warning'
      case 'offline':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return 'tabler-circle-check'
      case 'driving':
        return 'tabler-car'
      case 'offline':
        return 'tabler-circle-x'
      default:
        return 'tabler-circle'
    }
  }

  // Get simulated GPS coordinates for techs (in production, use real GPS data)
  const getTechCoordinates = (techId: string) => {
    const hash = techId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const latOffset = ((hash % 100) - 50) / 500 // -0.1 to 0.1
    const lngOffset = ((hash % 150) - 75) / 500 // -0.15 to 0.15
    return {
      lat: 38.9072 + latOffset,
      lng: -77.0369 + lngOffset
    }
  }

  // Get job coordinates (same as JobsList - should be centralized in production)
  const getJobCoordinates = (jobId: string) => {
    const hash = jobId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const latOffset = ((hash % 100) - 50) / 1000
    const lngOffset = ((hash % 150) - 75) / 1000
    return {
      lat: 38.9072 + latOffset,
      lng: -77.0369 + lngOffset
    }
  }

  const allHidden = hiddenTechIds.size === techs.length && techs.length > 0

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader
        title='Available Techs'
        subheader={`${techs.length} techs available today`}
        avatar={
          <Avatar className='bg-success-main'>
            <i className='tabler-users-group' />
          </Avatar>
        }
        action={
          <Tooltip title={allHidden ? 'Show all techs on map' : 'Hide all techs from map'}>
            <IconButton
              size='small'
              onClick={() => onToggleAllTechs(techs.map(t => t.id))}
            >
              <i className={allHidden ? 'tabler-eye-off' : 'tabler-eye'} />
            </IconButton>
          </Tooltip>
        }
      />
      <CardContent className='flex-1 overflow-y-auto p-0'>
        {isLoading ? (
          <Box className='flex items-center justify-center h-full'>
            <CircularProgress />
          </Box>
        ) : techs.length === 0 ? (
          <Box className='flex flex-col items-center justify-center h-full p-4'>
            <i className='tabler-user-off text-6xl text-gray-300 mb-2' />
            <Typography variant='body2' color='text.secondary'>
              No techs available
            </Typography>
          </Box>
        ) : (
          <List>
            {techs.map((tech) => {
              const gpsStatus = getGpsStatus(tech.id)
              const initials = `${tech.firstName?.[0] || ''}${tech.lastName?.[0] || ''}`
              const techCoords = getTechCoordinates(tech.id)
              const jobCoords = selectedJobId ? getJobCoordinates(selectedJobId) : null
              const skills = getTechSkills(tech.id)
              const isHidden = hiddenTechIds.has(tech.id)

              return (
                <DroppableTechItem key={tech.id} tech={tech}>
                  <ListItem
                    disablePadding
                    secondaryAction={
                    <Box className='flex items-center gap-1'>
                      <Box className='flex flex-col gap-1 items-end'>
                        <Chip
                          label={gpsStatus}
                          size='small'
                          color={getStatusColor(gpsStatus)}
                          icon={<i className={getStatusIcon(gpsStatus)} />}
                        />
                        {selectedJobId && jobCoords && (
                          <DriveTimeDisplay
                            fromLat={techCoords.lat}
                            fromLng={techCoords.lng}
                            toLat={jobCoords.lat}
                            toLng={jobCoords.lng}
                            size='small'
                          />
                        )}
                      </Box>
                      <Tooltip title={isHidden ? 'Show on map' : 'Hide from map'}>
                        <IconButton
                          size='small'
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleTechVisibility(tech.id)
                          }}
                          className={isHidden ? 'text-gray-400' : 'text-primary-main'}
                        >
                          <i className={isHidden ? 'tabler-eye-off' : 'tabler-eye'} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton
                    selected={selectedTechId === tech.id}
                    onClick={() => onSelectTech(tech.id === selectedTechId ? null : tech.id)}
                    sx={{
                      opacity: 1,
                      '&.Mui-disabled': {
                        opacity: 1
                      }
                    }}
                  >
                    {/* Contact Action Icons */}
                    <Box className='flex flex-col gap-1 mr-3'>
                      {tech.phone && (
                        <Tooltip title={`Call ${tech.phone}`} placement='left'>
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `tel:${tech.phone}`
                            }}
                            className='bg-success-lighter hover:bg-success-light text-success-main'
                            sx={{ width: 32, height: 32 }}
                          >
                            <i className='tabler-phone text-lg' />
                          </IconButton>
                        </Tooltip>
                      )}
                      {tech.email && (
                        <Tooltip title={`Email ${tech.email}`} placement='left'>
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `mailto:${tech.email}`
                            }}
                            className='bg-info-lighter hover:bg-info-light text-info-main'
                            sx={{ width: 32, height: 32 }}
                          >
                            <i className='tabler-mail text-lg' />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    <ListItemText
                      primary={
                        <Typography variant='body1' sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {`${tech.firstName || ''} ${tech.lastName || ''}`.trim() || 'Unnamed Tech'}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography component='span' variant='body2' sx={{ color: 'text.primary', opacity: 0.9 }}>
                            {tech.email || 'No email'}
                          </Typography>
                          <br />
                          <Typography component='span' variant='caption' sx={{ color: 'text.secondary', opacity: 0.8 }}>
                            {tech.role || 'Field Tech'}
                          </Typography>
                          <Box className='mt-1'>
                            <SkillBadges skills={skills} size='small' maxDisplay={2} />
                          </Box>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                </DroppableTechItem>
              )
            })}
          </List>
        )}
      </CardContent>
    </Card>
  )
}
