'use client'

import { useState } from 'react'

import classnames from 'classnames'
import { usePathname, useRouter } from 'next/navigation'

import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'

import NavToggle from './NavToggle'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import NavbarClock from '@/components/NavbarClock'
import NavbarWeather from '@/components/NavbarWeather'
import UserDropdown from '@components/layout/shared/UserDropdown'
import SettingsDrawer from '@components/layout/shared/SettingsDrawer'
import VoiceExplainerPlayer from '@components/VoiceExplainerPlayer'
import QuickActionsBar from '@/components/QuickActionsBar'

import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'
import { COLORS } from '@/theme/designTokens'

const NavbarContent = () => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isDashboard  = pathname === '/' || pathname === '/dashboard'
  const isCalendar   = pathname === '/calendar'
  const isGallery    = pathname === '/gallery'

  // Active icon highlight style
  const activeIconSx = {
    backgroundColor: 'var(--mui-palette-primary-main)',
    color: `${COLORS.white} !important`,
    borderRadius: '10px',
    '&:hover': { backgroundColor: 'var(--mui-palette-primary-dark)' },
  }

  const handleToggle = (target: string, isActive: boolean) => {
    if (isActive) {
      router.push('/dashboard')
    } else {
      router.push(target)
    }
  }

  return (
    <>
      <div className={classnames(verticalLayoutClasses.navbarContent, 'grid grid-cols-[1fr_auto_1fr] items-stretch is-full')}>
        {/* Left: nav toggle + clock + weather */}
        <div className='flex items-center gap-3 px-2'>
          <NavToggle />
          <NavbarClock />
          <NavbarWeather />
        </div>

        {/* Center: Quick Actions — shrinks with available space */}
        <div className='flex items-center justify-center'>
          <QuickActionsBar />
        </div>

        {/* Right: player on top, icons on bottom */}
        <div className='flex flex-col justify-between items-end px-2 py-[2px]'>
          {/* Top: voice explainer (hidden when no audio active) */}
          <div className='flex justify-end'>
            <VoiceExplainerPlayer inline />
          </div>

          {/* Bottom: quick icons + user avatar */}
          <div className='flex items-center gap-1'>
            <ModeDropdown />
            <Tooltip title={isCalendar ? 'Close Calendar' : 'Calendar'}>
              <IconButton
                onClick={() => handleToggle('/calendar', isCalendar)}
                sx={{ p: 0.5, ...(isCalendar ? activeIconSx : {}) }}
                className={isCalendar ? '' : 'text-textPrimary'}
              >
                <i className='tabler-calendar text-[28px]' />
              </IconButton>
            </Tooltip>
            <Tooltip title={isGallery ? 'Close Gallery' : 'Gallery'}>
              <IconButton
                onClick={() => handleToggle('/gallery', isGallery)}
                sx={{ p: 0.5, ...(isGallery ? activeIconSx : {}) }}
                className={isGallery ? '' : 'text-textPrimary'}
              >
                <i className='tabler-photo text-[28px]' />
              </IconButton>
            </Tooltip>
            <Tooltip title={isDashboard ? 'Settings' : 'Settings (available on dashboard only)'}>
              <span>
                <IconButton
                  className='text-textPrimary'
                  onClick={() => setSettingsOpen(true)}
                  disabled={!isDashboard}
                  sx={{ opacity: isDashboard ? 1 : 0.35, p: 0.5 }}
                >
                  <i className='tabler-settings text-[28px]' />
                </IconButton>
              </span>
            </Tooltip>
            <UserDropdown />
          </div>
        </div>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export default NavbarContent
