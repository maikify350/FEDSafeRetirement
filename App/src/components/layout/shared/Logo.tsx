'use client'

// React Imports
import type { CSSProperties } from 'react'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

const Logo = ({ color }: { color?: CSSProperties['color'] }) => {
  // Hooks
  const { isHovered, isBreakpointReached } = useVerticalNav()
  const { settings } = useSettings()

  // Vars
  const { layout } = settings

  return (
    <div className='flex items-center justify-center' style={{ padding: '8px 0' }}>
      {(isBreakpointReached || layout !== 'collapsed' || isHovered) && (
        <img
          src='/images/logo-150x150.jpg'
          alt='FEDSafe Retirement'
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid var(--mui-palette-primary-main)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        />
      )}
    </div>
  )
}

export default Logo
