'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { api } from '@/lib/api'
import type { Job, User } from '@shared/contracts'
import { COLORS } from '../../theme/designTokens'


type DispatchMapProps = {
  selectedJobId: string | null
  selectedTechId: string | null
  isDetached: boolean
  hiddenTechIds: Set<string>
  hideMapClutter: boolean
  simulationEnabled: boolean
}

type TruckLocation = {
  id: string
  techId: string
  techName: string
  lat: number
  lng: number
  heading: number
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px'
}

// Default center (Washington DC area - adjust to your service area)
const defaultCenter = {
  lat: 38.9072,
  lng: -77.0369
}

/**
 * Google Maps component showing technician GPS pins and job locations.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/dispatch/DispatchMap.tsx
 */
export default function DispatchMap({ selectedJobId, selectedTechId, isDetached, hiddenTechIds, hideMapClutter, simulationEnabled }: DispatchMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [hoveredJob, setHoveredJob] = useState<string | null>(null)
  const [hoveredTruck, setHoveredTruck] = useState<string | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [truckLocations, setTruckLocations] = useState<TruckLocation[]>([])
  const [currentZoom, setCurrentZoom] = useState<number>(12)

  // Fetch jobs
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ['jobs', 'dispatch', 'open'],
    queryFn: async () => {
      const allJobs = await api.get<Job[]>('/api/jobs')
      return allJobs.filter(job =>
        !job.assignedTo ||
        job.status === 'scheduled' ||
        job.status === 'draft'
      )
    }
  })

  // Fetch techs
  const { data: techs = [] } = useQuery<User[]>({
    queryKey: ['team-members', 'field'],
    queryFn: async () => {
      const allMembers = await api.get<User[]>('/api/users')
      return allMembers.filter(member => member.status === 'ACTIVE')
    }
  })

  // Initialize simulated truck locations
  useEffect(() => {
    if (techs.length > 0 && truckLocations.length === 0) {
      const initialLocations: TruckLocation[] = techs.map((tech, index) => ({
        id: tech.id,
        techId: tech.id,
        techName: `${tech.firstName || ''} ${tech.lastName || ''}`.trim() || 'Unknown',
        // Spread trucks around the default center
        lat: defaultCenter.lat + (Math.random() - 0.5) * 0.1,
        lng: defaultCenter.lng + (Math.random() - 0.5) * 0.1,
        heading: Math.random() * 360
      }))
      setTruckLocations(initialLocations)
    }
  }, [techs, truckLocations.length])

  // Simulate truck movement (update every 5 seconds) - only when simulation is enabled
  useEffect(() => {
    if (!simulationEnabled) return

    const interval = setInterval(() => {
      setTruckLocations(prev =>
        prev.map(truck => ({
          ...truck,
          lat: truck.lat + (Math.random() - 0.5) * 0.001,
          lng: truck.lng + (Math.random() - 0.5) * 0.001,
          heading: (truck.heading + (Math.random() - 0.5) * 20) % 360
        }))
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [simulationEnabled])

  // Generate stable simulated job locations (TODO: replace with real job addresses)
  const jobLocations = useMemo(() => {
    const locations = new Map<string, { lat: number; lng: number }>()
    jobs.forEach((job) => {
      // Use job ID as seed for consistent positioning
      const seed = job.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const seedRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000
        return x - Math.floor(x)
      }
      locations.set(job.id, {
        lat: defaultCenter.lat + (seedRandom(seed) - 0.5) * 0.05,
        lng: defaultCenter.lng + (seedRandom(seed + 1000) - 0.5) * 0.05
      })
    })
    return locations
  }, [jobs])

  // Get directions when both job and tech are selected
  useEffect(() => {
    if (selectedJobId && selectedTechId && map) {
      const job = jobs.find(j => j.id === selectedJobId)
      const truck = truckLocations.find(t => t.techId === selectedTechId)
      const jobLocation = jobLocations.get(selectedJobId)

      if (job && truck && jobLocation && window.google) {
        const directionsService = new google.maps.DirectionsService()

        directionsService.route(
          {
            origin: { lat: truck.lat, lng: truck.lng },
            destination: jobLocation,
            travelMode: google.maps.TravelMode.DRIVING
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              setDirections(result)
            }
          }
        )
      }
    } else {
      setDirections(null)
    }
  }, [selectedJobId, selectedTechId, jobs, truckLocations, map, jobLocations])

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
    setCurrentZoom(map.getZoom() || 12)

    // Listen for zoom changes
    map.addListener('zoom_changed', () => {
      setCurrentZoom(map.getZoom() || 12)
    })
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Truck icon (rotated based on heading)
  const getTruckIcon = (heading: number, isSelected: boolean) => ({
    path: 'M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638l-2.222-8.51C2.417,10.773,11.3,7.755,20.625,10.773z M3.748,21.713v4.492l-2.73-0.349 V14.502L3.748,21.713z M1.018,37.938V27.579l2.73,0.343v8.196L1.018,37.938z M2.575,40.882l2.218-3.336h13.771l2.219,3.336H2.575z M19.328,35.805v-7.872l2.729-0.355v10.048L19.328,35.805z',
    fillColor: isSelected ? COLORS.infoMui : COLORS.successMui,
    fillOpacity: 1,
    strokeColor: COLORS.white,
    strokeWeight: 2,
    scale: 0.6,
    rotation: heading,
    anchor: { x: 11.5, y: 23.5 } as google.maps.Point
  })

  const selectedJob = jobs.find(j => j.id === selectedJobId)
  const selectedTruck = truckLocations.find(t => t.techId === selectedTechId)

  // Calculate ETA (from directions if available)
  const eta = directions?.routes[0]?.legs[0]?.duration?.text || 'Calculating...'
  const distance = directions?.routes[0]?.legs[0]?.distance?.text || 'Calculating...'

  // Map styles to hide distracting locations
  const mapStyles = useMemo(() => {
    if (!hideMapClutter) return []

    return [
      // Hide all POIs (points of interest)
      {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
      },
      // Hide transit stations
      {
        featureType: 'transit',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
      },
      // Hide business labels
      {
        featureType: 'poi.business',
        elementType: 'all',
        stylers: [{ visibility: 'off' }]
      }
    ]
  }, [hideMapClutter])

  if (!isLoaded) {
    return (
      <Box className='h-full rounded overflow-hidden relative flex items-center justify-center'>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box className='h-full rounded overflow-hidden relative'>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={12}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            streetViewControl: false,
            mapTypeControl: true,
            fullscreenControl: !isDetached,
            zoomControl: true,
            zoomControlOptions: {
              position: 8 // google.maps.ControlPosition.RIGHT_CENTER
            },
            scaleControl: true,
            rotateControl: true,
            gestureHandling: 'greedy',
            styles: mapStyles
          }}
        >
          {/* Job markers (houses/buildings) */}
          {jobs.map((job) => {
            const jobLocation = jobLocations.get(job.id)
            if (!jobLocation) return null

            const isResidential = job.tradeType === 'Residential'
            const isSelected = job.id === selectedJobId
            const useIcons = currentZoom >= 14 // Show icons when zoomed in

            // Icon-based marker (zoom level >= 14)
            const iconMarker = {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? COLORS.warningMui : isResidential ? COLORS.successMui : COLORS.warningMui}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  ${isResidential
                    ? '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>'
                    : '<path d="M3 21h18"></path><path d="M9 8h1"></path><path d="M9 12h1"></path><path d="M9 16h1"></path><path d="M14 8h1"></path><path d="M14 12h1"></path><path d="M14 16h1"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>'}
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 36)
            }

            // Circle marker (zoom level < 14)
            const circleMarker = {
              path: 0, // google.maps.SymbolPath.CIRCLE
              scale: 10,
              fillColor: isSelected ? COLORS.infoMui : isResidential ? COLORS.successMui : COLORS.warningMui,
              fillOpacity: 1,
              strokeColor: COLORS.white,
              strokeWeight: 2
            }

            return (
              <Marker
                key={job.id}
                position={jobLocation}
                icon={useIcons ? iconMarker : circleMarker}
                onMouseOver={() => setHoveredJob(job.id)}
                onMouseOut={() => setHoveredJob(null)}
              >
                {hoveredJob === job.id && (
                  <InfoWindow onCloseClick={() => setHoveredJob(null)}>
                    <Card elevation={0}>
                      <CardContent className='p-2'>
                        <Typography variant='subtitle2' className='font-bold mb-1'>
                          {job.jobNumber || 'Draft'}
                        </Typography>
                        <Typography variant='body2' className='mb-1'>
                          {job.clientName || 'Unknown Client'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' className='block mb-1'>
                          {job.description || 'No description'}
                        </Typography>
                        <Chip
                          label={isResidential ? 'Residential' : 'Commercial'}
                          size='small'
                          icon={<i className={isResidential ? 'tabler-home' : 'tabler-building'} />}
                        />
                        {job.scheduledDate && (
                          <Typography variant='caption' color='text.secondary' className='block mt-1'>
                            Scheduled: {new Date(job.scheduledDate).toLocaleDateString()}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </InfoWindow>
                )}
              </Marker>
            )
          })}

          {/* Truck markers */}
          {truckLocations
            .filter(truck => !hiddenTechIds.has(truck.techId))
            .map((truck) => (
            <Marker
              key={truck.id}
              position={{ lat: truck.lat, lng: truck.lng }}
              icon={getTruckIcon(truck.heading, truck.techId === selectedTechId)}
              onMouseOver={() => setHoveredTruck(truck.id)}
              onMouseOut={() => setHoveredTruck(null)}
            >
              {hoveredTruck === truck.id && (
                <InfoWindow onCloseClick={() => setHoveredTruck(null)}>
                  <Card elevation={0}>
                    <CardContent className='p-2'>
                      <Typography variant='subtitle2' className='font-bold mb-1'>
                        {truck.techName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        GPS Status: Active
                      </Typography>
                    </CardContent>
                  </Card>
                </InfoWindow>
              )}
            </Marker>
          ))}

          {/* Directions renderer */}
          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>

      {/* ETA Panel - shows when job and tech are selected */}
      {selectedJob && selectedTruck && directions && (
        <Card className='absolute bottom-4 left-4 right-4 z-10 shadow-lg'>
          <CardContent className='p-3'>
            <Box className='flex items-center justify-between'>
              <Box className='flex-1'>
                <Typography variant='subtitle2' className='font-bold mb-1'>
                  Route to {selectedJob.jobNumber}
                </Typography>
                <Box className='flex gap-4'>
                  <Chip
                    label={`ETA: ${eta}`}
                    size='small'
                    color='primary'
                    icon={<i className='tabler-clock' />}
                  />
                  <Chip
                    label={`Distance: ${distance}`}
                    size='small'
                    icon={<i className='tabler-route' />}
                  />
                </Box>
              </Box>
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-send' />}
              >
                Send to Tech
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
