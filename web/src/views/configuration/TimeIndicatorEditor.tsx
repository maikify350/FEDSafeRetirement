'use client'

import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import useLocalStorage from '@/hooks/useLocalStorage'

// ─── Types ───────────────────────────────────────────────────────────────────
export type TimerIndicatorStyle = 'fab' | 'status-bar' | 'none'

// ─── Options ─────────────────────────────────────────────────────────────────
const TIMER_INDICATOR_OPTIONS: Array<{
  value: TimerIndicatorStyle
  label: string
  description: string
}> = [
  {
    value: 'fab',
    label: 'Floating Action Button',
    description: 'Orange button in bottom-right corner with pulsing animation'
  },
  {
    value: 'status-bar',
    label: 'Status Bar',
    description: 'Thin bar below header showing elapsed time'
  },
  {
    value: 'none',
    label: 'No Indicator',
    description: 'No visual indicator when timer is running'
  }
]

// ─── Component ───────────────────────────────────────────────────────────────
/**
 * Time tracking indicator editor for job time entries.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/views/configuration/TimeIndicatorEditor.tsx
 */
export default function TimeIndicatorEditor() {
  const [indicatorStyle, setIndicatorStyle] = useLocalStorage<TimerIndicatorStyle>(
    'jm-timer-indicator-style',
    'fab'
  )

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIndicatorStyle(event.target.value as TimerIndicatorStyle)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
        Choose how you'd like to be notified when a timer is running in the background.
        This setting affects the time tracking indicator across all screens.
      </Typography>

      <FormControl component='fieldset' fullWidth>
        <FormLabel component='legend' sx={{ mb: 2, fontSize: '0.875rem', fontWeight: 600 }}>
          Display Style
        </FormLabel>
        <RadioGroup value={indicatorStyle} onChange={handleChange}>
          <Stack spacing={0} divider={<Divider />}>
            {TIMER_INDICATOR_OPTIONS.map((option) => (
              <Box
                key={option.value}
                sx={{
                  py: 2,
                  px: 1.5,
                  '&:hover': { bgcolor: 'action.hover' },
                  borderRadius: 1,
                  transition: 'background-color 0.2s'
                }}
              >
                <FormControlLabel
                  value={option.value}
                  control={<Radio />}
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Typography variant='body1' fontWeight={500}>
                        {option.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {option.description}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    m: 0,
                    alignItems: 'flex-start',
                    '& .MuiRadio-root': { mt: -0.5 }
                  }}
                />
              </Box>
            ))}
          </Stack>
        </RadioGroup>
      </FormControl>

      <Typography variant='caption' color='text.disabled' sx={{ mt: 3, display: 'block', textAlign: 'center' }}>
        Changes are saved automatically to browser storage
      </Typography>
    </Box>
  )
}
