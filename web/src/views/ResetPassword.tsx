'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { styled, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
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
 * Password reset page - validates token and sets a new password.
 * Auto-redirects to login on success after 3 seconds.
 *
 * @module views/ResetPassword
 */
const ResetPassword = ({ mode }: { mode: SystemMode }) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const { settings } = useSettings()
  const authBackground = useImageVariant(mode, '/images/pages/auth-mask-light.png', '/images/pages/auth-mask-dark.png')
  const illustration = useImageVariant(mode, '/images/illustrations/auth/v2-login-light.png', '/images/illustrations/auth/v2-login-dark.png')

  // Redirect to login after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => router.push('/login'), 3000)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  const passwordsMatch = password === confirmPassword
  const passwordLongEnough = password.length >= 8

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordsMatch || !passwordLongEnough || !token) return

    setError('')
    setIsLoading(true)

    try {
      const res = await fetch(`${BACKEND_URL}/api/mvp-auth/password-reset-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to reset password. The link may be expired.')
      }
    } catch {
      setError('Unable to connect to the server. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className='flex bs-full justify-center items-center min-bs-[100dvh] p-6'>
        <div className='flex flex-col items-center gap-4 max-is-[400px]'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src='/Logo_Teal_510x350.png' alt='JobMaster logo' width={200} height={137} style={{ width: 200, height: 'auto' }} />
          <Alert severity='error'>Invalid reset link. No token provided.</Alert>
          <Link href='/forgot-password' className='text-primary hover:underline'>Request a new reset link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className='flex bs-full justify-center'>
      <div className={classnames('flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden', { 'border-ie': settings.skin === 'bordered' })}>
        <Illustration src={illustration} alt='reset-password-illustration' />
        {!hidden && <MaskImg alt='mask' src={authBackground} className={classnames({ 'scale-x-[-1]': theme.direction === 'rtl' })} />}
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-0'>
          <div className='flex flex-col items-center gap-3'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src='/Logo_Teal_510x350.png' alt='JobMaster logo' width={200} height={137} style={{ width: 200, height: 'auto' }} />
            <Typography variant='h5'>Set New Password</Typography>
            {!success && (
              <Typography variant='body2' color='text.secondary' textAlign='center'>
                Enter your new password below. Must be at least 8 characters.
              </Typography>
            )}
          </div>

          {success ? (
            <div className='flex flex-col gap-4'>
              <Alert severity='success'>
                Password reset successfully! Redirecting to login...
              </Alert>
              <Link href='/login' className='text-center text-primary hover:underline'>Go to Login</Link>
            </div>
          ) : (
            <form noValidate autoComplete='off' onSubmit={handleSubmit} className='flex flex-col gap-5'>
              {error && <Alert severity='error'>{error}</Alert>}
              <CustomTextField
                autoFocus
                fullWidth
                label='New Password'
                placeholder='············'
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                error={password.length > 0 && !passwordLongEnough}
                helperText={password.length > 0 && !passwordLongEnough ? 'Must be at least 8 characters' : ''}
                slotProps={{ input: { endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton edge='end' onClick={() => setShowPassword(s => !s)} onMouseDown={e => e.preventDefault()}>
                      <i className={showPassword ? 'tabler-eye-off' : 'tabler-eye'} />
                    </IconButton>
                  </InputAdornment>
                )}}}
              />
              <CustomTextField
                fullWidth
                label='Confirm Password'
                placeholder='············'
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                error={confirmPassword.length > 0 && !passwordsMatch}
                helperText={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : ''}
                slotProps={{ input: { endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton edge='end' onClick={() => setShowConfirm(s => !s)} onMouseDown={e => e.preventDefault()}>
                      <i className={showConfirm ? 'tabler-eye-off' : 'tabler-eye'} />
                    </IconButton>
                  </InputAdornment>
                )}}}
              />
              <Button
                fullWidth
                variant='contained'
                type='submit'
                disabled={isLoading || !passwordLongEnough || !passwordsMatch}
              >
                {isLoading ? <CircularProgress size={22} color='inherit' /> : 'Reset Password'}
              </Button>
              <Link href='/login' className='text-center text-primary hover:underline'>Back to Login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
