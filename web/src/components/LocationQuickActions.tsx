'use client'

import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'

type LocationQuickActionsProps = {
  address: string
  city?: string
  state?: string
  zip?: string
  latitude?: number
  longitude?: number
  size?: 'small' | 'medium'
}

/**
 * Action buttons for Google Earth and Google Maps directions from a property address.
 * Renders two icon buttons: a globe for Google Earth and a map pin for Maps directions.
 *
 * @module components/LocationQuickActions
 */
export default function LocationQuickActions({
  address,
  city,
  state,
  zip,
  latitude,
  longitude,
  size = 'small'
}: LocationQuickActionsProps) {
  const fullAddress = [address, city, state, zip].filter(Boolean).join(', ')

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering parent list item click
  }

  // Google Earth URL
  const earthUrl = `https://earth.google.com/web/search/${encodeURIComponent(fullAddress)}`

  // Google Maps URL - prefer coordinates for accuracy, fallback to address
  const mapsUrl = latitude && longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(fullAddress)}`

  return (
    <Box className='flex items-center gap-1'>
      <Tooltip title='View in Google Earth'>
        <IconButton
          size={size}
          href={earthUrl}
          target='_blank'
          rel='noopener noreferrer'
          onClick={handleClick}
          className='text-success-main hover:text-success-dark'
        >
          <i className='tabler-world' />
        </IconButton>
      </Tooltip>

      <Tooltip title='Get directions in Google Maps'>
        <IconButton
          size={size}
          href={mapsUrl}
          target='_blank'
          rel='noopener noreferrer'
          onClick={handleClick}
          className='text-primary-main hover:text-primary-dark'
        >
          <i className='tabler-map-pin' />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
