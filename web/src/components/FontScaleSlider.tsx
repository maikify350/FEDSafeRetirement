'use client'

import { useEffect } from 'react'
import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import useLocalStorage from '@/hooks/useLocalStorage'

const MIN = 80
const MAX = 160
const STEP = 5
const DEFAULT = 100

/**
 * Floating zoom control widget (bottom-right corner) for adjusting the
 * global page font scale. Persists the user's preferred scale to localStorage.
 * Includes zoom-in, zoom-out buttons and a slider.
 *
 * @module components/FontScaleSlider
 */
export default function FontScaleSlider() {
  const [scale, setScale] = useLocalStorage<number>('jm-font-scale', DEFAULT)

  useEffect(() => {
    document.documentElement.style.fontSize = `${scale}%`
  }, [scale])

  const adjust = (delta: number) => {
    setScale(prev => Math.min(MAX, Math.max(MIN, (prev ?? DEFAULT) + delta)))
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 12,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '20px',
        px: 1.25,
        py: 0.5,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        opacity: 0.75,
        '&:hover': { opacity: 1 },
        transition: 'opacity 0.2s',
        userSelect: 'none',
      }}
    >
      <Tooltip title='Zoom out'>
        <IconButton size='small' onClick={() => adjust(-STEP)} disabled={scale <= MIN}
          sx={{ p: 0.25, color: 'text.secondary' }}>
          <i className='tabler-zoom-out' style={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Tooltip>

      <Slider
        value={scale}
        min={MIN}
        max={MAX}
        step={STEP}
        onChange={(_, v) => setScale(v as number)}
        sx={{
          width: 90,
          mx: 0.5,
          '& .MuiSlider-thumb': { width: 12, height: 12 },
          '& .MuiSlider-rail': { opacity: 0.3 },
        }}
      />

      <Tooltip title='Zoom in'>
        <IconButton size='small' onClick={() => adjust(STEP)} disabled={scale >= MAX}
          sx={{ p: 0.25, color: 'text.secondary' }}>
          <i className='tabler-zoom-in' style={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Tooltip>

      <Tooltip title='Reset to 100%'>
        <Typography
          variant='caption'
          onClick={() => setScale(DEFAULT)}
          sx={{
            minWidth: 32,
            textAlign: 'center',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: scale === DEFAULT ? 'text.disabled' : 'primary.main',
            cursor: scale === DEFAULT ? 'default' : 'pointer',
            '&:hover': scale !== DEFAULT ? { textDecoration: 'underline' } : {},
          }}
        >
          {scale}%
        </Typography>
      </Tooltip>
    </Box>
  )
}
