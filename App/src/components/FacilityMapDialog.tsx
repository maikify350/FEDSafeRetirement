'use client'

/**
 * FacilityMapDialog — Floating dialog that shows a Google Maps embed
 * pinned to a facility address. Uses the free embed URL (no API key required).
 */

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Skeleton from '@mui/material/Skeleton'
import { useState } from 'react'

interface FacilityMapDialogProps {
  open: boolean
  onClose: () => void
  facilityName: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export default function FacilityMapDialog({
  open,
  onClose,
  facilityName,
  address,
  city,
  state,
  zip,
}: FacilityMapDialogProps) {
  const [mapLoaded, setMapLoaded] = useState(false)

  // Build full address string for the map query
  const parts = [address, city, state, zip].filter(Boolean)
  const fullAddress = parts.join(', ')
  const encodedAddress = encodeURIComponent(fullAddress)

  // Google Maps embed URL (no API key needed for basic embed)
  const mapSrc = `https://maps.google.com/maps?q=${encodedAddress}&output=embed&z=15`

  // Google Maps link for opening in a new tab
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`

  const handleClose = () => {
    setMapLoaded(false)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          pb: 1,
          background: 'linear-gradient(135deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-primary-dark) 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Google Maps pin icon */}
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <i className='tabler-map-pin' style={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant='subtitle1' fontWeight={700} color='inherit' lineHeight={1.2}>
              {facilityName || 'Facility Location'}
            </Typography>
            <Typography variant='caption' color='rgba(255,255,255,0.75)' noWrap>
              {fullAddress || 'No address available'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title='Open in Google Maps'>
            <IconButton
              size='small'
              component='a'
              href={mapsLink}
              target='_blank'
              rel='noopener noreferrer'
              sx={{ color: 'rgba(255,255,255,0.85)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <i className='tabler-external-link' style={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title='Close'>
            <IconButton
              size='small'
              onClick={handleClose}
              sx={{ color: 'rgba(255,255,255,0.85)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <i className='tabler-x' style={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: 'relative', height: 400 }}>
        {!mapLoaded && (
          <Skeleton
            variant='rectangular'
            width='100%'
            height='100%'
            sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
            animation='wave'
          />
        )}
        {fullAddress ? (
          <iframe
            src={mapSrc}
            width='100%'
            height='100%'
            style={{ border: 0, display: 'block' }}
            loading='lazy'
            referrerPolicy='no-referrer-when-downgrade'
            onLoad={() => setMapLoaded(true)}
            title={`Map of ${facilityName || fullAddress}`}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.disabled',
              gap: 1.5,
            }}
          >
            <i className='tabler-map-off' style={{ fontSize: 48 }} />
            <Typography variant='body2'>No address available for this facility</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid var(--mui-palette-divider)' }}>
        <Typography variant='caption' color='text.disabled' sx={{ flex: 1 }}>
          {fullAddress}
        </Typography>
        <Button
          variant='outlined'
          size='small'
          href={mapsLink}
          target='_blank'
          rel='noopener noreferrer'
          startIcon={<i className='tabler-external-link text-sm' />}
          disabled={!fullAddress}
        >
          Open in Maps
        </Button>
        <Button variant='contained' size='small' onClick={handleClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
