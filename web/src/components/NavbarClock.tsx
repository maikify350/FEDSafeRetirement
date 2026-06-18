'use client'

import { useState, useEffect, useRef } from 'react'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import { useSettings } from '@core/hooks/useSettings'
import useLocalStorage from '@/hooks/useLocalStorage'
import { ALPHA, COLORS } from '../theme/designTokens'


/**
 * Real-time clock display in the navbar with date and military time format.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/NavbarClock.tsx
 */
export const CLOCK_TIMEZONES = [
  { label: 'HST', desc: 'Hawaii',   tz: 'Pacific/Honolulu'    },
  { label: 'PST', desc: 'Pacific',  tz: 'America/Los_Angeles' },
  { label: 'MST', desc: 'Mountain', tz: 'America/Denver'      },
  { label: 'CST', desc: 'Central',  tz: 'America/Chicago'     },
  { label: 'EST', desc: 'Eastern',  tz: 'America/New_York'    },
]

export const CLOCK_VISIBLE_KEY = 'jm-clock-visible'
export const CLOCK_TZ_KEY      = 'jm-clock-tz'
export const CLOCK_12HR_KEY    = 'jm-clock-12hr'

export function useClockVisible() {
  return useLocalStorage<boolean>(CLOCK_VISIBLE_KEY, true)
}

export function useClockTz() {
  return useLocalStorage<string>(CLOCK_TZ_KEY, 'America/New_York')
}

export function useClock12Hr() {
  return useLocalStorage<boolean>(CLOCK_12HR_KEY, false)
}

function getTime(tz: string, hour12: boolean) {
  const raw = new Date().toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12,
  })
  if (hour12) {
    // raw = "02:30:45 PM"
    const [timePart, ampm] = raw.split(' ')
    return { timePart, ampm: ampm ?? '' }
  }
  return { timePart: raw, ampm: '' }
}

export default function NavbarClock() {
  const [visible] = useClockVisible()
  const [tz, setTz] = useClockTz()
  const [is12hr, setIs12hr] = useClock12Hr()
  const [mounted, setMounted] = useState(false)
  const [timeObj, setTimeObj] = useState({ timePart: '', ampm: '' })
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const { settings } = useSettings()

  useEffect(() => {
    setMounted(true)
    setTimeObj(getTime(tz, is12hr))
    const id = setInterval(() => setTimeObj(getTime(tz, is12hr)), 1000)
    return () => clearInterval(id)
  }, [tz, is12hr])

  if (!mounted || !visible) return null

  const [hh, mm, ss] = timeObj.timePart.split(':')
  const currentTz = CLOCK_TIMEZONES.find(t => t.tz === tz)

  return (
    <>
      {/* ── Clock face — night desk clock style ── */}
      <div
        ref={anchorRef}
        onClick={() => setOpen(o => !o)}
        title='Click to change timezone'
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '9px 10px 8px',
          borderRadius: 10,
          background: '#111',
          border: `1px solid ${COLORS.darkBg}`,
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.35)',
          cursor: 'pointer',
          userSelect: 'none',
          lineHeight: 1,
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = COLORS.orangeMui)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = COLORS.darkBg)}
      >
        {/* Digits */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 1 }}>
          {/* Ghost layer — dim "88:88:88" behind */}
          <span style={{
            position: 'absolute', inset: 0,
            fontFamily: '"Courier New", monospace',
            fontWeight: 700, letterSpacing: '0.06em',
            fontSize: '1.7rem',
            color: 'rgba(255,100,0,0.1)',
            whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            88:88:88{timeObj.ampm ? ' --' : ''}
          </span>
          {/* Real digits */}
          <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: '1.7rem', letterSpacing: '0.06em', color: COLORS.orangeMui, textShadow: `0 0 8px ${COLORS.orangeDeep}, 0 0 18px ${ALPHA.orangeAlpha}` }}>{hh}</span>
          <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: '1.7rem', color: COLORS.orangeMui, textShadow: `0 0 8px ${COLORS.orangeDeep}`, animation: 'jm-blink 1s step-end infinite' }}>:</span>
          <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: '1.7rem', letterSpacing: '0.06em', color: COLORS.orangeMui, textShadow: `0 0 8px ${COLORS.orangeDeep}, 0 0 18px ${ALPHA.orangeAlpha}` }}>{mm}</span>
          <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: '1.7rem', color: COLORS.orangeMui, textShadow: `0 0 8px ${COLORS.orangeDeep}`, animation: 'jm-blink 1s step-end infinite' }}>:</span>
          <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.06em', color: ALPHA.orangeBrand, textShadow: `0 0 6px ${COLORS.orangeDeep}` }}>{ss}</span>
          {timeObj.ampm && (
            <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: '0.75rem', color: ALPHA.orangeBrandAlt, textShadow: `0 0 4px ${COLORS.orangeDeep}`, marginLeft: 3, alignSelf: 'flex-end', paddingBottom: 3 }}>{timeObj.ampm}</span>
          )}
        </div>

        {/* Timezone */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.18em', color: COLORS.white }}>
            {currentTz?.desc}
          </span>
        </div>
      </div>

      {/* Timezone picker popover */}
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        transition
        disablePortal
        placement='bottom-start'
        className='!mbs-2 z-[1]'
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps}>
            <Paper
              className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}
              sx={{ p: 1.5, minWidth: 160 }}
            >
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Time Zone
                    </Typography>
                    <button
                      onClick={() => setIs12hr(v => !v)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        border: '1px solid var(--mui-palette-primary-main)',
                        background: 'var(--mui-palette-primary-main)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        transition: 'opacity 0.15s',
                      }}
                    >
                      {is12hr ? '12h' : '24h'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {CLOCK_TIMEZONES.map(t => (
                      <button
                        key={t.tz}
                        onClick={() => { setTz(t.tz); setOpen(false) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: `2px solid ${tz === t.tz ? 'var(--mui-palette-primary-main)' : 'transparent'}`,
                          background: tz === t.tz ? 'var(--mui-palette-primary-main)15' : 'var(--mui-palette-action-hover)',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{
                          fontFamily: '"Courier New", monospace',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          color: tz === t.tz ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-primary)',
                          minWidth: 30,
                        }}>
                          {t.label}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--mui-palette-text-secondary)' }}>
                          {t.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>

      <style>{`
        @keyframes jm-blink {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 0.15; }
        }
      `}</style>
    </>
  )
}
