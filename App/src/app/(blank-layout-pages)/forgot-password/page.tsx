// Next Imports
import type { Metadata } from 'next'

// Component Imports
import ForgotPassword from '@views/ForgotPassword'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your FEDSafe Retirement account password'
}

const ForgotPasswordPage = async () => {
  const mode = await getServerMode()

  return <ForgotPassword mode={mode} />
}

export default ForgotPasswordPage
