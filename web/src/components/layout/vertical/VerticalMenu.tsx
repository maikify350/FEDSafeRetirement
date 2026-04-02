'use client'

import { useState } from 'react'

// MUI Imports
import { useTheme } from '@mui/material/styles'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Grow from '@mui/material/Grow'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem, SubMenu } from '@menu/vertical-menu'
import AboutView from '@/views/about/AboutView'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useEntityCounts } from '@/hooks/useEntityCounts'
import { useMenuVisibility } from '@/hooks/useMenuVisibility'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='tabler-chevron-right' />
  </StyledVerticalNavExpandIcon>
)

/** Small pill badge for record counts. Hidden when count is 0. */
function CountBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        padding: '0 5px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1,
        background: 'color-mix(in srgb, var(--mui-palette-primary-main) 18%, transparent)',
        color: 'var(--mui-palette-primary-main)',
      }}
    >
      {count > 999 ? '999+' : count}
    </span>
  )
}

const VerticalMenu = ({ scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const counts = useEntityCounts()
  const { isVisible, mounted } = useMenuVisibility()

  // State
  const [aboutOpen, setAboutOpen] = useState(false)

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <>
      <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
      <ScrollWrapper
        {...(isBreakpointReached
          ? {
              className: 'bs-full overflow-y-auto overflow-x-hidden',
              onScroll: container => scrollMenu(container, false)
            }
          : {
              options: { wheelPropagation: false, suppressScrollX: true },
              onScrollY: container => scrollMenu(container, true)
            })}
      >
        {/* Vertical Menu */}
        <Menu
          popoutMenuOffset={{ mainAxis: 23 }}
          menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
          renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
          renderExpandedMenuItemIcon={{ icon: <i className='tabler-circle text-xs' /> }}
          menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
        >
          {isVisible('home') && (
            <MenuItem href='/home' icon={<i className='tabler-smart-home' />}>
              Home Dashboard
            </MenuItem>
          )}
          {isVisible('clients') && (
            <MenuItem href='/clients' icon={<i className='tabler-users' />} suffix={<CountBadge count={counts.clients} />}>
              Clients
            </MenuItem>
          )}
          {isVisible('requests') && (
            <MenuItem href='/requests' icon={<i className='tabler-inbox' />} suffix={<CountBadge count={counts.requests} />}>
              Requests
            </MenuItem>
          )}
          {isVisible('quotes') && (
            <MenuItem href='/quotes' icon={<i className='tabler-file-description' />} suffix={<CountBadge count={counts.quotes} />}>
              Quotes
            </MenuItem>
          )}
          {isVisible('jobs') && (
            <MenuItem href='/jobs' icon={<i className='tabler-briefcase' />} suffix={<CountBadge count={counts.jobs} />}>
              Jobs
            </MenuItem>
          )}
          {isVisible('invoices') && (
            <MenuItem href='/invoices' icon={<i className='tabler-file-invoice' />} suffix={<CountBadge count={counts.invoices} />}>
              Invoices
            </MenuItem>
          )}
          {isVisible('vendors') && (
            <MenuItem href='/vendors' icon={<i className='tabler-building-store' />} suffix={<CountBadge count={counts.vendors} />}>
              Vendors
            </MenuItem>
          )}
          {isVisible('pos') && (
            <MenuItem href='/purchase-orders' icon={<i className='tabler-clipboard-list' />} suffix={<CountBadge count={counts.pos} />}>
              POs
            </MenuItem>
          )}
          {isVisible('solutions') && (
            <MenuItem href='/solutions' icon={<i className='tabler-bulb' />}>
              Solutions
            </MenuItem>
          )}
          {isVisible('fleet') && (
            <MenuItem href='/fleet' icon={<i className='tabler-car' />}>
              Fleet
            </MenuItem>
          )}
          {isVisible('reports') && (
            <MenuItem href='/reports' icon={<i className='tabler-file-analytics' />}>
              Reports
            </MenuItem>
          )}
          {isVisible('scheduling') && (
            <MenuItem href='/scheduling' icon={<i className='tabler-calendar-event' />}>
              Scheduling
            </MenuItem>
          )}
          {isVisible('dispatch') && (
            <MenuItem href='/dispatch' icon={<i className='tabler-truck-delivery' />}>
              Dispatch
            </MenuItem>
          )}
          <Divider sx={{ mx: 2, my: 1, borderBottomWidth: 3, borderColor: 'var(--mui-palette-primary-main)', opacity: 0.25 }} />
          {isVisible('admin') && (
            <SubMenu icon={<i className='tabler-settings-2' />} label='Admin'>
              <MenuItem href='/team' icon={<i className='tabler-users-group' />} suffix={<CountBadge count={counts.teams ?? 0} />}>
                Teams
              </MenuItem>

              <MenuItem href='/configuration' icon={<i className='tabler-adjustments-horizontal' />}>
                Configuration
              </MenuItem>
              <MenuItem href='/admin/templates' icon={<i className='tabler-template' />}>
                Templates
              </MenuItem>
              <MenuItem href='/tasks' icon={<i className='tabler-checkbox' />}>
                Dev Tasks
              </MenuItem>
            </SubMenu>
          )}
          {isVisible('about') && (
            <MenuItem onClick={() => setAboutOpen(true)} icon={<i className='tabler-info-circle' />}>
              About
            </MenuItem>
          )}
        </Menu>
      </ScrollWrapper>
      </div>

      {/* About dialog — same diagonal grow-from-bottom-left animation as weather */}
      <Dialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        maxWidth='sm'
        fullWidth
        TransitionComponent={Grow}
        transitionDuration={{ enter: 420, exit: 180 }}
        PaperProps={{
          style: { transformOrigin: 'left bottom' },
          sx: {
            '@keyframes about-slide-in': {
              '0%':   { transform: 'scale(0.15) translate(-60px, 60px)', opacity: 0 },
              '70%':  { transform: 'scale(1.03) translate(3px, -3px)',   opacity: 1 },
              '100%': { transform: 'scale(1)    translate(0,    0)',      opacity: 1 },
            },
            animation: aboutOpen ? 'about-slide-in 0.42s cubic-bezier(0.34, 1.5, 0.64, 1) forwards' : 'none',
          }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            size='small'
            onClick={() => setAboutOpen(false)}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
          >
            <i className='tabler-x text-lg' />
          </IconButton>
          <AboutView hideCloseButton />
        </DialogContent>
      </Dialog>

    </>
  )
}

export default VerticalMenu
