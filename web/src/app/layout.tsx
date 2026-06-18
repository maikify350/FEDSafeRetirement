// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import { Nunito } from 'next/font/google'

const nunito = Nunito({ subsets: ['latin'], display: 'swap', variable: '--font-nunito' })

// Third-party Imports
import 'react-perfect-scrollbar/dist/css/styles.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

export const metadata = {
  title: {
    default: 'JobMaster',
    template: '%s | JobMaster'
  },
  description: 'JobMaster — Field Service Management Platform by MustAutomate.AI',
  icons: {
    icon: '/favicon-jm.png',
    shortcut: '/favicon-jm.png',
  }
}

const RootLayout = async (props: ChildrenType) => {
  const { children } = props

  // Type guard to ensure lang is a valid Locale

  // Vars

  const systemMode = await getSystemMode()
  const direction = 'ltr'

  return (
    <html id='__next' lang='en' dir={direction} suppressHydrationWarning className={nunito.variable}>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        {children}
      </body>
    </html>
  )
}

export default RootLayout
