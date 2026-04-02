'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'

type WeatherPopupProps = {
  address: string
  latitude?: number
  longitude?: number
  size?: 'small' | 'medium'
}

type WeatherData = {
  name: string
  temperature: number
  temperatureUnit: string
  shortForecast: string
  detailedForecast: string
  windSpeed: string
  windDirection: string
  isDaytime: boolean
  probabilityOfPrecipitation?: {
    value: number | null
  }
}

/**
 * Detailed weather forecast popup dialog with multi-day forecast and conditions.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/WeatherPopup.tsx
 */
export default function WeatherPopup({ address, latitude, longitude, size = 'small' }: WeatherPopupProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  const { data: weather, isLoading, error } = useQuery<WeatherData>({
    queryKey: ['weather', latitude, longitude],
    queryFn: async () => {
      if (!latitude || !longitude) {
        throw new Error('Coordinates required')
      }

      // Get NWS grid point
      const pointRes = await fetch(`https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`)

      if (!pointRes.ok) {
        throw new Error('Weather service unavailable')
      }

      const point = await pointRes.json()

      // Get forecast
      const forecastRes = await fetch(point.properties.forecast)

      if (!forecastRes.ok) {
        throw new Error('Forecast unavailable')
      }

      const forecast = await forecastRes.json()

      return forecast.properties.periods[0] // Current period
    },
    enabled: Boolean(anchorEl) && Boolean(latitude) && Boolean(longitude), // Only fetch when popup opens
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: 1
  })

  const getWeatherIcon = (forecast: string) => {
    const lower = forecast.toLowerCase()
    if (lower.includes('sunny') || lower.includes('clear')) return '☀️'
    if (lower.includes('rain') || lower.includes('shower') || lower.includes('drizzle')) return '🌧️'
    if (lower.includes('snow') || lower.includes('flurries')) return '❄️'
    if (lower.includes('wind')) return '💨'
    if (lower.includes('cloud') || lower.includes('overcast')) return '☁️'
    if (lower.includes('storm') || lower.includes('thunder')) return '⛈️'
    if (lower.includes('fog') || lower.includes('haze')) return '🌫️'
    return '🌤️'
  }

  const getWeatherColor = (forecast: string) => {
    const lower = forecast.toLowerCase()
    if (lower.includes('storm') || lower.includes('severe')) return 'error'
    if (lower.includes('rain') || lower.includes('snow')) return 'warning'
    if (lower.includes('cloud')) return 'info'
    return 'success'
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation() // Prevent triggering parent list item click
    setAnchorEl(e.currentTarget)
  }

  if (!latitude || !longitude) {
    return (
      <Tooltip title='No coordinates available'>
        <span>
          <IconButton size={size} disabled>
            <i className='tabler-cloud-off' />
          </IconButton>
        </span>
      </Tooltip>
    )
  }

  return (
    <>
      <Tooltip title='View weather conditions'>
        <IconButton
          size={size}
          onClick={handleClick}
          className='text-info-main hover:text-info-dark'
        >
          <i className='tabler-cloud' />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Card>
          <CardContent className='p-3' style={{ minWidth: 280, maxWidth: 350 }}>
            {isLoading ? (
              <Box className='flex justify-center py-4'>
                <CircularProgress size={30} />
              </Box>
            ) : error ? (
              <Alert severity='warning' className='p-2'>
                <Typography variant='caption'>
                  Weather unavailable for this location
                </Typography>
              </Alert>
            ) : weather ? (
              <>
                <Box className='flex items-center gap-2 mb-2'>
                  <Typography variant='h4'>
                    {getWeatherIcon(weather.shortForecast)}
                  </Typography>
                  <Box>
                    <Typography variant='subtitle1' className='font-bold'>
                      {weather.name}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {address}
                    </Typography>
                  </Box>
                </Box>

                <Box className='flex items-center gap-3 mb-2 p-2 bg-gray-50 rounded'>
                  <Box className='flex items-center gap-1'>
                    <Typography variant='h5' className='font-bold'>
                      {weather.temperature}°{weather.temperatureUnit}
                    </Typography>
                  </Box>
                  <Typography variant='body2' color='text.secondary'>
                    {weather.shortForecast}
                  </Typography>
                </Box>

                <Typography variant='body2' className='mb-2'>
                  {weather.detailedForecast}
                </Typography>

                <Box className='flex gap-3 flex-wrap'>
                  <Box className='flex items-center gap-1'>
                    <i className='tabler-wind text-base' />
                    <Typography variant='caption' color='text.secondary'>
                      {weather.windSpeed} {weather.windDirection}
                    </Typography>
                  </Box>
                  {weather.probabilityOfPrecipitation?.value && (
                    <Box className='flex items-center gap-1'>
                      <i className='tabler-droplet text-base' />
                      <Typography variant='caption' color='text.secondary'>
                        {weather.probabilityOfPrecipitation.value}% precip
                      </Typography>
                    </Box>
                  )}
                  <Box className='flex items-center gap-1'>
                    <i className={weather.isDaytime ? 'tabler-sun text-base' : 'tabler-moon text-base'} />
                    <Typography variant='caption' color='text.secondary'>
                      {weather.isDaytime ? 'Day' : 'Night'}
                    </Typography>
                  </Box>
                </Box>

                {(weather.shortForecast.toLowerCase().includes('storm') ||
                  weather.shortForecast.toLowerCase().includes('severe')) && (
                  <Alert severity='error' className='mt-2 p-1'>
                    <Typography variant='caption'>
                      ⚠️ Severe weather - consider rescheduling outdoor work
                    </Typography>
                  </Alert>
                )}
              </>
            ) : (
              <Typography variant='body2' color='text.secondary'>
                Weather data unavailable
              </Typography>
            )}
          </CardContent>
        </Card>
      </Popover>
    </>
  )
}
