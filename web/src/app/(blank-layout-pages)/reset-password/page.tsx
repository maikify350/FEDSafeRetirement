import type { Metadata } from 'next'
import ResetPassword from '@views/ResetPassword'
import { getServerMode } from '@core/utils/serverHelpers'

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your JobMaster account'
}

const ResetPasswordPage = async () => {
  const mode = await getServerMode()
  return <ResetPassword mode={mode} />
}

export default ResetPasswordPage
