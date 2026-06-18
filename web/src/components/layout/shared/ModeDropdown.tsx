'use client'

import { useRef, useState } from 'react'

import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'

import type { Mode } from '@core/types'
import { useSettings } from '@core/hooks/useSettings'
import primaryColorConfig from '@/configs/primaryColorConfig'

const ModeDropdown = () => {
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const { settings, updateSettings } = useSettings()

  const handleClose = () => { setOpen(false); setTooltipOpen(false) }

  const handleModeSwitch = (mode: Mode) => {
    updateSettings({ mode })
    // Don't close — let user pick color too
  }

  const handleColorSwitch = (colorName: string) => {
    const config = primaryColorConfig.find(c => c.name === colorName)
    if (config) {
      updateSettings({ primaryColor: config.main as any })
    }
    handleClose()
  }

  const getModeIcon = () => {
    if (settings.mode === 'dark') return 'tabler-moon-stars'
    if (settings.mode === 'system') return 'tabler-device-laptop'
    return 'tabler-sun'
  }

  const modes: { mode: Mode; icon: string; label: string }[] = [
    { mode: 'light',  icon: 'tabler-sun',           label: 'Light'  },
    { mode: 'dark',   icon: 'tabler-moon-stars',     label: 'Dark'   },
    { mode: 'system', icon: 'tabler-device-laptop',  label: 'System' },
  ]

  return (
    <>
      <Tooltip
        title='Theme'
        onOpen={() => setTooltipOpen(true)}
        onClose={() => setTooltipOpen(false)}
        open={open ? false : tooltipOpen}
      >
        <IconButton ref={anchorRef} onClick={() => setOpen(o => !o)} className='text-textPrimary'>
          <i className={`${getModeIcon()} text-[28px]`} />
        </IconButton>
      </Tooltip>

      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-start'
        anchorEl={anchorRef.current}
        className='min-is-[200px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-start' ? 'left top' : 'right top' }}>
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'} sx={{ p: 2 }}>
              <ClickAwayListener onClickAway={handleClose}>
                <div>
                  {/* ── Mode ── */}
                  <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Mode
                  </Typography>
                  <div className='flex gap-1 mb-3'>
                    {modes.map(({ mode, icon, label }) => (
                      <button
                        key={mode}
                        onClick={() => handleModeSwitch(mode)}
                        title={label}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          borderRadius: 8,
                          border: `2px solid ${settings.mode === mode ? 'var(--mui-palette-primary-main)' : 'transparent'}`,
                          background: settings.mode === mode ? 'var(--mui-palette-primary-main)15' : 'var(--mui-palette-action-hover)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <i className={`${icon} text-lg`} style={{ color: settings.mode === mode ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-secondary)' }} />
                        <span style={{ fontSize: 10, color: 'var(--mui-palette-text-secondary)' }}>{label}</span>
                      </button>
                    ))}
                  </div>

                  <Divider sx={{ mb: 1.5 }} />

                  {/* ── Color ── */}
                  <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Color
                  </Typography>
                  <div className='flex flex-wrap gap-2'>
                    {primaryColorConfig.map(color => {
                      const isActive = (settings as any).primaryColor === color.main
                      return (
                        <Tooltip key={color.name} title={color.label || color.name}>
                          <button
                            onClick={() => handleColorSwitch(color.name!)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              backgroundColor: color.main,
                              border: `3px solid ${isActive ? 'var(--mui-palette-text-primary)' : 'transparent'}`,
                              outline: isActive ? `2px solid ${color.main}` : 'none',
                              outlineOffset: 2,
                              cursor: 'pointer',
                              transition: 'transform 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                          />
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default ModeDropdown
