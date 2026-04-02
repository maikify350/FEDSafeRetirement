'use client'

import { useQuery } from '@tanstack/react-query'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'

type DriveTimeDisplayProps = {
  fromLat?: number
  fromLng?: number
  toLat?: number
  toLng?: number
  techName?: string
  size?: 'small' | 'medium'
}

type DistanceMatrixResponse = {
  destination_addresses: string[]
  origin_addresses: string[]
  rows: Array<{
    elements: Array<{
      distance: {
        text: string
        value: number
      }
      duration: {
        text: string
        value: number
      }
      status: string
    }>
  }>
  status: string
}

/**
 * Estimated drive time chip calculated via Haversine formula between two
 * GPS coordinates. Color-codes by distance: green (<15 min), orange (<30 min),
 * red (>30 min). Auto-caches results for 5 minutes.
 *
 * @module components/DriveTimeDisplay
 */
export default function DriveTimeDisplay({
  fromLat,
  fromLng,
  toLat,
  toLng,
  techName,
  size = 'small'
}: DriveTimeDisplayProps) {
  const { data, isLoading, error } = useQuery<DistanceMatrixResponse>({
    queryKey: ['distance', fromLat, fromLng, toLat, toLng],
    queryFn: async () => {
      if (!fromLat || !fromLng || !toLat || !toLng) {
        throw new Error('Coordinates required')
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

      if (!apiKey) {
        throw new Error('Google API key not configured')
      }

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${fromLat},${fromLng}&destinations=${toLat},${toLng}&mode=driving&departure_time=now&key=${apiKey}`

      // Need to use a proxy or backend endpoint because Distance Matrix API doesn't support CORS
      // For now, we'll calculate rough estimate based on straight-line distance
      const distance = calculateDistance(fromLat, fromLng, toLat, toLng)
      const durationMinutes = Math.round(distance / 0.5) // Assume ~30 mph average

      return {
        destination_addresses: [''],
        origin_addresses: [''],
        rows: [{
          elements: [{
            distance: {
              text: `${distance.toFixed(1)} mi`,
              value: distance * 1609.34 // meters
            },
            duration: {
              text: durationMinutes < 60 ? `${durationMinutes} min` : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
              value: durationMinutes * 60 // seconds
            },
            status: 'OK'
          }]
        }],
        status: 'OK'
      }
    },
    enabled: Boolean(fromLat && fromLng && toLat && toLng),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1
  })

  // Haversine formula to calculate distance between two coordinates
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  function toRad(deg: number): number {
    return deg * (Math.PI / 180)
  }

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return null
  }

  if (isLoading) {
    return (
      <Chip
        label={<CircularProgress size={12} color='inherit' />}
        size={size}
        variant='outlined'
      />
    )
  }

  if (error || !data || data.rows[0].elements[0].status !== 'OK') {
    return null
  }

  const element = data.rows[0].elements[0]
  const durationMinutes = Math.round(element.duration.value / 60)

  // Color code based on drive time
  const getColor = (minutes: number) => {
    if (minutes <= 15) return 'success' // Green - nearby
    if (minutes <= 30) return 'warning' // Orange - moderate
    return 'error' // Red - far
  }

  const label = techName
    ? `${element.duration.text} away`
    : element.duration.text

  return (
    <Tooltip title={`${element.distance.text} • Estimated drive time`}>
      <Chip
        label={label}
        size={size}
        color={getColor(durationMinutes)}
        icon={<i className='tabler-clock' />}
        variant='outlined'
      />
    </Tooltip>
  )
}
