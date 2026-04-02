import type { Metadata } from 'next'
import ForgotPassword from '@views/ForgotPassword'
import { getServerMode } from '@core/utils/serverHelpers'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your JobMaster password'
}

const ForgotPasswordPage = async () => {
  const mode = await getServerMode()
  return <ForgotPassword mode={mode} />
}

export default ForgotPasswordPage
