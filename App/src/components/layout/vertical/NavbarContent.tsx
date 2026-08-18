'use client'

// Third-party Imports
import classnames from 'classnames'

import Link from 'next/link'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

// Component Imports
import NavToggle from './NavToggle'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const NavbarContent = () => {
  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-4'>
        <NavToggle />
        <ModeDropdown />
      </div>
      <div className='flex items-center gap-2'>
        <Tooltip title='Media Gallery'>
          <IconButton component={Link} href='/gallery' size='small' className='text-textPrimary hover:bg-actionHover'>
            <i className='tabler-photo text-[22px]' />
          </IconButton>
        </Tooltip>
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
