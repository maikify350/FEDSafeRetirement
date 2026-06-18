'use client'

import { useState } from 'react'
import { styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import classnames from 'classnames'
import type { SystemMode } from '@core/types'
import Link from '@components/Link'
import CustomTextField from '@core/components/mui/TextField'
import { useImageVariant } from '@core/hooks/useImageVariant'
import { useSettings } from '@core/hooks/useSettings'

const MaskImg = styled('img')({
  blockSize: 'auto',
  maxBlockSize: 355,
  inlineSize: '100%',
  position: 'absolute',
  insetBlockEnd: 0,
  zIndex: -1
})

const Illustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 680,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: { maxBlockSize: 550 },
  [theme.breakpoints.down('lg')]: { maxBlockSize: 450 }
}))

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

/**
 * Forgot password page - sends a password reset email via Supabase Auth.
 * Supports both primary and recovery email addresses.
 *
 * @module views/ForgotPassword
 */
const ForgotPassword = ({ mode }: { mode: SystemMode }) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)

  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const { settings } = useSettings()
  const authBackground = useImageVariant(mode, '/images/pages/auth-mask-light.png', '/images/pages/auth-mask-dark.png')
  const illustration = useImageVariant(mode, '/images/illustrations/auth/v2-login-light.png', '/images/illustrations/auth/v2-login-dark.png')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setError('')
    setIsLoading(true)

    try {
      const res = await fetch(`${BACKEND_URL}/api/mvp-auth/password-reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), useRecoveryEmail: useRecovery }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Unable to connect to the server. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex bs-full justify-center'>
      <div className={classnames('flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden', { 'border-ie': settings.skin === 'bordered' })}>
        <Illustration src={illustration} alt='forgot-password-illustration' />
        {!hidden && <MaskImg alt='mask' src={authBackground} className={classnames({ 'scale-x-[-1]': theme.direction === 'rtl' })} />}
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-0'>
          <div className='flex flex-col items-center gap-3'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src='/Logo_Teal_510x350.png' alt='JobMaster logo' width={200} height={137} style={{ width: 200, height: 'auto' }} />
            <Typography variant='h5'>Forgot Password</Typography>
            {!success && (
              <Typography variant='body2' color='text.secondary' textAlign='center'>
                {useRecovery
                  ? 'Enter your recovery email and we\'ll send you a link to reset your password.'
                  : 'Enter your account email and we\'ll send you a link to reset your password.'}
              </Typography>
            )}
          </div>

          {success ? (
            <div className='flex flex-col gap-4'>
              <Alert severity='success'>
                If an account exists with that email, a password reset link has been sent. Check your inbox (and spam folder).
              </Alert>
              <Typography variant='body2' color='text.secondary' textAlign='center'>
                The link expires in 1 hour.
              </Typography>
              {!useRecovery && (
                <Button
                  variant='text'
                  size='small'
                  onClick={() => { setSuccess(false); setUseRecovery(true); setEmail('') }}
                >
                  Didn&apos;t get it? Try your recovery email
                </Button>
              )}
              <Link href='/login' className='text-center text-primary hover:underline'>Back to Login</Link>
            </div>
          ) : (
            <form noValidate autoComplete='off' onSubmit={handleSubmit} className='flex flex-col gap-5'>
              {error && <Alert severity='error'>{error}</Alert>}
              <CustomTextField
                autoFocus
                fullWidth
                label={useRecovery ? 'Recovery Email' : 'Email'}
                type='email'
                placeholder={useRecovery ? 'your-recovery@email.com' : 'admin@company.com'}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Button fullWidth variant='contained' type='submit' disabled={isLoading || !email.trim()}>
                {isLoading ? <CircularProgress size={22} color='inherit' /> : 'Send Reset Link'}
              </Button>
              {!useRecovery && (
                <Button
                  variant='text'
                  size='small'
                  onClick={() => { setUseRecovery(true); setEmail(''); setError('') }}
                >
                  Use recovery email instead
                </Button>
              )}
              {useRecovery && (
                <Button
                  variant='text'
                  size='small'
                  onClick={() => { setUseRecovery(false); setEmail(''); setError('') }}
                >
                  Use account email instead
                </Button>
              )}
              <Link href='/login' className='text-center text-primary hover:underline'>Back to Login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
