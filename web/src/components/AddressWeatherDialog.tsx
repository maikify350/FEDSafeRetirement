'use client'

import { useState, useEffect, useCallback } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Grow from '@mui/material/Grow'
import CircularProgress from '@mui/material/CircularProgress'
import useLocalStorage from '@/hooks/useLocalStorage'
import { ALPHA, COLORS, WEATHER } from '../theme/designTokens'


interface HourlySlot {
  time: string
  tempF: number
  code: number
  precipProb: number
}

interface WxData {
  tempF: number
  tempC: number
  feelsLikeF: number
  feelsLikeC: number
  code: number
  windMph: number
  windDir: number
  humidity: number
  precipProb: number
  highF: number
  highC: number
  lowF: number
  lowC: number
  sunrise: string
  sunset: string
  hourly: HourlySlot[]
  updatedAt: Date
}

function wmoInfo(code: number, windMph = 0): { icon: string; color: string; glow: string; label: string } {
  if (windMph > 30 && code < 45) return { icon: 'tabler-wind',         color: COLORS.infoLighter, glow: ALPHA.infoBgAlpha, label: 'Windy'         }
  if (code === 0)                 return { icon: 'tabler-sun',           color: ALPHA.yellowLight, glow: ALPHA.yellowAlpha, label: 'Clear'         }
  if (code <= 2)                  return { icon: 'tabler-sun-wind',      color: ALPHA.yellowMed, glow: ALPHA.warningBgLight, label: 'Partly Cloudy' }
  if (code === 3)                 return { icon: 'tabler-cloud',         color: COLORS.gray300, glow: ALPHA.gray400Alpha, label: 'Overcast'      }
  if (code <= 48)                 return { icon: 'tabler-cloud-fog',     color: COLORS.gray400, glow: ALPHA.gray500Alpha, label: 'Foggy'         }
  if (code <= 55)                 return { icon: 'tabler-cloud-rain',    color: COLORS.infoLighter, glow: ALPHA.infoLightAlpha, label: 'Drizzle'       }
  if (code <= 67)                 return { icon: 'tabler-cloud-rain',    color: COLORS.infoLight, glow: ALPHA.infoBgAlpha, label: 'Rain'          }
  if (code <= 77)                 return { icon: 'tabler-snowflake',     color: COLORS.infoSky, glow: ALPHA.infoSkyAlpha, label: 'Snow'          }
  if (code <= 82)                 return { icon: 'tabler-cloud-rain',    color: COLORS.info, glow: ALPHA.infoDarkAlpha, label: 'Showers'       }
  if (code <= 86)                 return { icon: 'tabler-snowflake',     color: COLORS.infoSky, glow: ALPHA.infoSkyAlpha, label: 'Snow Showers'  }
  return                                 { icon: 'tabler-bolt',          color: ALPHA.purpleLight, glow: ALPHA.violetAlpha, label: 'Storm'         }
}

function degToCompass(deg: number) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtHour(iso: string) {
  const h = new Date(iso).getHours()
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

interface AddressWeatherDialogProps {
  open: boolean
  onClose: () => void
  /** Geocodeable query string, e.g. "Springfield VA 20191" */
  query: string
  /** Human-readable label shown in the dialog header, e.g. "Springfield, VA" */
  label: string
}

export default function AddressWeatherDialog({ open, onClose, query, label }: AddressWeatherDialogProps) {
  const [wx, setWx]         = useState<WxData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(false)
  const [unit, setUnit]     = useLocalStorage<'F' | 'C'>('jm-wx-unit', 'F')

  const fetchWx = useCallback(async (lat: number, lon: number) => {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,precipitation_probability` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=2`
    )
    const j = await res.json()
    const c = j.current
    const d = j.daily

    const now = new Date()
    const localHourStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-') + 'T' + String(now.getHours()).padStart(2, '0') + ':00'
    const startIdx = Math.max(0, j.hourly.time.findIndex((t: string) => t >= localHourStr))

    const hourly: HourlySlot[] = j.hourly.time
      .slice(startIdx, startIdx + 24)
      .map((t: string, i: number) => ({
        time:       t,
        tempF:      Math.round(j.hourly.temperature_2m[startIdx + i]),
        code:       j.hourly.weather_code?.[startIdx + i] ?? j.hourly.weathercode?.[startIdx + i] ?? 0,
        precipProb: j.hourly.precipitation_probability[startIdx + i] ?? 0,
      }))

    setWx({
      tempF:      Math.round(c.temperature_2m),
      tempC:      Math.round((c.temperature_2m - 32) * 5 / 9),
      feelsLikeF: Math.round(c.apparent_temperature),
      feelsLikeC: Math.round((c.apparent_temperature - 32) * 5 / 9),
      code:       c.weather_code,
      windMph:    Math.round(c.wind_speed_10m),
      windDir:    c.wind_direction_10m,
      humidity:   c.relative_humidity_2m,
      precipProb: c.precipitation_probability ?? 0,
      highF:      Math.round(d.temperature_2m_max[0]),
      highC:      Math.round((d.temperature_2m_max[0] - 32) * 5 / 9),
      lowF:       Math.round(d.temperature_2m_min[0]),
      lowC:       Math.round((d.temperature_2m_min[0] - 32) * 5 / 9),
      sunrise:    d.sunrise[0],
      sunset:     d.sunset[0],
      hourly,
      updatedAt:  new Date(),
    })
  }, [])

  useEffect(() => {
    if (!open || !query) return
    setWx(null)
    setError(false)
    setLoading(true)

    const run = async () => {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'JobMaster/1.0' } }
        )
        const geoJ = await geoRes.json()
        if (!geoJ?.length) { setError(true); return }
        const lat = parseFloat(geoJ[0].lat)
        const lon = parseFloat(geoJ[0].lon)
        await fetchWx(lat, lon)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [open, query, fetchWx])

  const u           = unit
  const temp        = wx ? (u === 'F' ? wx.tempF      : wx.tempC)      : 0
  const feelsLike   = wx ? (u === 'F' ? wx.feelsLikeF : wx.feelsLikeC) : 0
  const high        = wx ? (u === 'F' ? wx.highF      : wx.highC)      : 0
  const low         = wx ? (u === 'F' ? wx.lowF       : wx.lowC)       : 0
  const { icon, color, glow, label: wxLabel } = wmoInfo(wx?.code ?? 0, wx?.windMph ?? 0)
  const next2       = wx?.hourly.slice(0, 2) ?? []
  const avgPrec     = next2.reduce((s, h) => s + h.precipProb, 0) / Math.max(next2.length, 1)
  const next2Cond   = wmoInfo(next2[0]?.code ?? wx?.code ?? 0).label
  const next2Text   = avgPrec > 60
    ? `${next2Cond} with ${Math.round(avgPrec)}% chance of precipitation`
    : avgPrec > 30
    ? `${next2Cond} — ${Math.round(avgPrec)}% chance of rain`
    : `${next2Cond} — conditions look dry`

  const STATS = wx ? [
    { icon: 'tabler-droplet',     label: 'Humidity',   value: `${wx.humidity}%`                              },
    { icon: 'tabler-wind',        label: 'Wind',        value: `${wx.windMph} mph ${degToCompass(wx.windDir)}` },
    { icon: 'tabler-cloud-rain',  label: 'Precip.',     value: `${wx.precipProb}%`                            },
    { icon: 'tabler-thermometer', label: 'Feels Like',  value: `${feelsLike}°${u}`                            },
  ] : []

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      TransitionComponent={Grow}
      transitionDuration={{ enter: 420, exit: 180 }}
      PaperProps={{
        style: { transformOrigin: 'left bottom' },
        sx: {
          '@keyframes addr-wx-slide-in': {
            '0%':   { transform: 'scale(0.15) translate(-60px, 60px)', opacity: 0 },
            '70%':  { transform: 'scale(1.03) translate(3px, -3px)',   opacity: 1 },
            '100%': { transform: 'scale(1)    translate(0,    0)',      opacity: 1 },
          },
          animation: open ? 'addr-wx-slide-in 0.42s cubic-bezier(0.34, 1.5, 0.64, 1) forwards' : 'none',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ p: 0 }}>
        <div style={{
          background: `linear-gradient(135deg, ${WEATHER.nightDark} 0%, ${WEATHER.nightMid} 60%, ${WEATHER.nightLight} 100%)`,
          padding: '16px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <Typography variant='h5' fontWeight={700} color={COLORS.white} lineHeight={1.2}>
              {label || 'Address Weather'}
            </Typography>
            {wx && (
              <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5, display: 'block' }}>
                Last update: {wx.updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Typography>
            )}
          </div>
          <IconButton onClick={onClose} size='small' sx={{ color: 'rgba(255,255,255,0.7)', mt: -0.5 }}>
            <i className='tabler-x text-[1.2rem]' />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '48px 24px' }}>
            <CircularProgress size={40} />
            <Typography variant='body2' color='text.secondary'>Fetching weather for {label}…</Typography>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px 24px' }}>
            <i className='tabler-cloud-off text-[3rem]' style={{ color: 'var(--mui-palette-text-disabled)' }} />
            <Typography variant='body1' color='text.secondary'>Could not locate address</Typography>
            <Typography variant='body2' color='text.disabled'>Try adding a city or ZIP code to this address</Typography>
          </div>
        )}

        {/* Weather content */}
        {!loading && !error && wx && (
          <>
            {/* Current conditions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px 16px' }}>
              <i className={`${icon} text-[3.2rem]`} style={{ color, filter: `drop-shadow(0 0 14px ${glow})`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <Typography variant='h3' fontWeight={800} lineHeight={1}>{temp}°{u}</Typography>
                <Typography variant='body1' color='text.secondary' mt={0.5}>Feels like {feelsLike}°{u} · {wxLabel}</Typography>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography variant='h6' fontWeight={700}>H: {high}° / L: {low}°</Typography>
                <Typography variant='body2' color='text.secondary'>Today</Typography>
              </div>
            </div>

            <Divider />

            {/* 4-stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {STATS.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '14px 8px', gap: 5,
                  borderRight: i < 3 ? '1px solid var(--mui-palette-divider)' : undefined,
                }}>
                  <i className={`${s.icon} text-[1.7rem]`} style={{ color: 'var(--mui-palette-primary-main)' }} />
                  <Typography variant='body2' color='text.secondary' sx={{ letterSpacing: '0.04em', textAlign: 'center' }}>{s.label}</Typography>
                  <Typography variant='body1' fontWeight={700} sx={{ textAlign: 'center' }}>{s.value}</Typography>
                </div>
              ))}
            </div>

            <Divider />

            {/* Sunrise / Sunset */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '12px 24px' }}>
              {[
                { icon: 'tabler-sunrise', color: COLORS.warning, label: 'Sunrise', time: wx.sunrise },
                { icon: 'tabler-sunset',  color: COLORS.orange, label: 'Sunset',  time: wx.sunset  },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className={`${s.icon} text-[2rem]`} style={{ color: s.color }} />
                  <div>
                    <Typography variant='body2' color='text.secondary' display='block'>{s.label}</Typography>
                    <Typography variant='body1' fontWeight={700}>{fmtTime(s.time)}</Typography>
                  </div>
                </div>
              ))}
            </div>

            <Divider />

            {/* Next 2 hours */}
            <div style={{ padding: '10px 24px 12px', background: 'var(--mui-palette-action-hover)' }}>
              <Typography variant='overline' color='text.secondary' display='block' sx={{ lineHeight: 1.4 }}>Next 2 Hours</Typography>
              <Typography variant='body1' fontWeight={500}>{next2Text}</Typography>
            </div>

            <Divider />

            {/* 24-hour forecast */}
            <div style={{ padding: '12px 16px 4px' }}>
              <Typography variant='overline' color='text.secondary'>24-Hour Forecast</Typography>
            </div>
            <div style={{ overflowX: 'auto', padding: '4px 16px 16px', display: 'flex', gap: 4 }}>
              {wx.hourly.map((h, i) => {
                const { icon: hi, color: hc } = wmoInfo(h.code)
                const htemp = unit === 'F' ? h.tempF : Math.round((h.tempF - 32) * 5 / 9)
                const isNow = i === 0
                return (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 12px', borderRadius: 8, minWidth: 68, flexShrink: 0,
                    background: isNow ? 'var(--mui-palette-primary-main)20' : undefined,
                    border: `1px solid ${isNow ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-divider)'}`,
                  }}>
                    <Typography variant='body2' color={isNow ? 'primary' : 'text.secondary'} fontWeight={isNow ? 700 : 400}>
                      {isNow ? 'Now' : fmtHour(h.time)}
                    </Typography>
                    <i className={`${hi} text-[1.5rem]`} style={{ color: hc }} />
                    <Typography variant='body1' fontWeight={700}>{htemp}°</Typography>
                    <Typography variant='caption' sx={{ color: h.precipProb > 10 ? COLORS.infoLight : 'transparent', fontSize: '0.75rem', lineHeight: 1 }}>
                      {h.precipProb}%
                    </Typography>
                  </div>
                )
              })}
            </div>

            {/* F/C toggle */}
            <div style={{ padding: '8px 24px 16px', display: 'flex', justifyContent: 'center' }}>
              <span
                onClick={() => setUnit(u => u === 'F' ? 'C' : 'F')}
                style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--mui-palette-text-secondary)',
                  textDecoration: 'underline dotted', userSelect: 'none', display: 'inline-block', width: 140, textAlign: 'center' }}
              >
                Switch to °{unit === 'F' ? 'C' : 'F'}
              </span>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
