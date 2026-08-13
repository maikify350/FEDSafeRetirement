'use client'

// React Imports
import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const MenuVisibilityDrawer = dynamic(() => import('@/components/MenuVisibilityDrawer'), { ssr: false })
import type { MouseEvent } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import { styled } from '@mui/material/styles'
import Badge from '@mui/material/Badge'
import Avatar from '@mui/material/Avatar'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import MenuList from '@mui/material/MenuList'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'

import { useSettings } from '@core/hooks/useSettings'
import { useQuickActionsVisible } from '@/components/QuickActionsBar'
import { useClockVisible } from '@/components/NavbarClock'
import { useWeatherVisible } from '@/components/NavbarWeather'
import { useAuth } from '@/context/AuthContext'
import { getInitials } from '@/utils/getInitials'
import CustomAvatar from '@core/components/mui/Avatar'

// Styled component for badge content
const BadgeContentSpan = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  cursor: 'pointer',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
})

const UserDropdown = () => {
  const [open, setOpen] = useState(false)
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false)
  const [showQuickActions, setShowQuickActions] = useQuickActionsVisible()
  const [clockVisible, setClockVisible] = useClockVisible()
  const [weatherVisible, setWeatherVisible] = useWeatherVisible()

  // Refs
  const anchorRef = useRef<HTMLDivElement>(null)

  // Hooks
  const router = useRouter()
  const { user, logout } = useAuth()

  const { settings } = useSettings()

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'
  const userEmail = user?.email || ''
  const avatarColor = user?.gender === 'F' ? 'info' : 'success' // light blue for female, light green for male

  const handleDropdownOpen = () => {
    !open ? setOpen(true) : setOpen(false)
  }

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) {
      router.push(url)
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  const handleUserLogout = async () => {
    logout()
    router.push('/login')
  }

  return (
    <>
      <Badge
        ref={anchorRef}
        overlap='circular'
        badgeContent={<BadgeContentSpan onClick={handleDropdownOpen} />}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className='mis-2'
      >
        {user?.avatar ? (
          <Avatar
            ref={anchorRef}
            alt={fullName}
            src={user.avatar}
            onClick={handleDropdownOpen}
            className='cursor-pointer bs-[38px] is-[38px]'
          />
        ) : (
          <CustomAvatar
            ref={anchorRef}
            size={38}
            skin='light'
            color={avatarColor as any}
            onClick={handleDropdownOpen}
            className='cursor-pointer'
          >
            {getInitials(fullName)}
          </CustomAvatar>
        )}
      </Badge>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[240px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList>
                  <div className='flex items-center plb-2 pli-6 gap-2' tabIndex={-1}>
                    {user?.avatar ? (
                      <Avatar alt={fullName} src={user.avatar} />
                    ) : (
                      <CustomAvatar size={40} skin='light' color={avatarColor as any}>
                        {getInitials(fullName)}
                      </CustomAvatar>
                    )}
                    <div className='flex items-start flex-col'>
                      <Typography className='font-medium' color='text.primary'>
                        {fullName}
                      </Typography>
                      <Typography variant='caption'>{userEmail}</Typography>
                    </div>
                  </div>
                  <Divider className='mlb-1' />
                  <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, user?.id ? `/team?edit=${user.id}` : '/team')}>
                    <i className='tabler-user' />
                    <Typography color='text.primary'>My Profile</Typography>
                  </MenuItem>
                  <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e)}>
                    <i className='tabler-help-circle' />
                    <Typography color='text.primary'>FAQ</Typography>
                  </MenuItem>
                  <MenuItem className='mli-2 gap-3' onClick={() => { setOpen(false); setMenuDrawerOpen(true) }}>
                    <i className='tabler-layout-sidebar' />
                    <Typography color='text.primary'>Show Menus</Typography>
                  </MenuItem>
                  <Divider className='mlb-1' />
                  <div className='pli-4 plb-1'>
                    <FormControlLabel
                      control={
                        <Switch
                          size='small'
                          checked={showQuickActions}
                          onChange={(_, checked) => setShowQuickActions(checked)}
                        />
                      }
                      label={
                        <Typography variant='body2' color='text.primary' sx={{ ml: 0.5 }}>
                          Quick Actions
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  </div>
                  <div className='pli-4 plb-1'>
                    <FormControlLabel
                      control={
                        <Switch
                          size='small'
                          checked={clockVisible}
                          onChange={(_, checked) => setClockVisible(checked)}
                        />
                      }
                      label={
                        <Typography variant='body2' color='text.primary' sx={{ ml: 0.5 }}>
                          Display Clock
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  </div>
                  <div className='pli-4 plb-1'>
                    <FormControlLabel
                      control={
                        <Switch
                          size='small'
                          checked={weatherVisible}
                          onChange={(_, checked) => setWeatherVisible(checked)}
                        />
                      }
                      label={
                        <Typography variant='body2' color='text.primary' sx={{ ml: 0.5 }}>
                          Show Weather
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  </div>
                  <div className='flex items-center plb-2 pli-3'>
                    <Button
                      fullWidth
                      variant='contained'
                      color='error'
                      size='small'
                      endIcon={<i className='tabler-logout' />}
                      onClick={handleUserLogout}
                      sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                    >
                      Logout
                    </Button>
                  </div>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
      <MenuVisibilityDrawer open={menuDrawerOpen} onClose={() => setMenuDrawerOpen(false)} />
    </>
  )
}

export default UserDropdown
