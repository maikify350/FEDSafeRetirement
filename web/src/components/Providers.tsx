// Type Imports
import type { ChildrenType, Direction } from '@core/types'

// Context Imports
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'
import { AuthProvider } from '@/context/AuthContext'
import QueryProvider from '@/components/QueryProvider'
import { VoiceExplainerProvider } from '@/lib/state/VoiceExplainerProvider'

// Util Imports
import { getMode, getSettingsFromCookie, getSystemMode } from '@core/utils/serverHelpers'

type Props = ChildrenType & {
  direction: Direction
}

/**
 * Top-level React context providers wrapper (MUI theme, QueryClient, Auth, etc.).
 * Composes all application-wide providers in the correct nesting order.
 *
 * @module components/Providers
 */
const Providers = async (props: Props) => {
  const { children, direction } = props
  const mode = await getMode()
  const settingsCookie = await getSettingsFromCookie()
  const systemMode = await getSystemMode()

  return (
    <QueryProvider>
      <VerticalNavProvider>
        <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
          <ThemeProvider direction={direction} systemMode={systemMode}>
            <AuthProvider>
              <VoiceExplainerProvider>
                {children}
              </VoiceExplainerProvider>
            </AuthProvider>
          </ThemeProvider>
        </SettingsProvider>
      </VerticalNavProvider>
    </QueryProvider>
  )
}

export default Providers
