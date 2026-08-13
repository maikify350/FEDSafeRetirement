'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useMediaQuery from '@mui/material/useMediaQuery'
import { styled, useTheme } from '@mui/material/styles'
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
import { useAuth } from '@/context/AuthContext'

const LoginIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 680,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: { maxBlockSize: 550 },
  [theme.breakpoints.down('lg')]: { maxBlockSize: 450 }
}))

const MaskImg = styled('img')({
  blockSize: 'auto',
  maxBlockSize: 355,
  inlineSize: '100%',
  position: 'absolute',
  insetBlockEnd: 0,
  zIndex: -1
})

/**
 * Login page with email/password form, remember-me toggle, and forgot password link.
 * Handles session-kicked and idle-timeout redirect reasons with user-facing messages.
 *
 * @module views/Login
 */
const LoginPage = ({ mode }: { mode: SystemMode }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const darkImg = '/images/pages/auth-mask-dark.png'
  const lightImg = '/images/pages/auth-mask-light.png'
  const darkIllustration = '/images/illustrations/auth/v2-login-dark.png'
  const lightIllustration = '/images/illustrations/auth/v2-login-light.png'
  const borderedDarkIllustration = '/images/illustrations/auth/v2-login-dark-border.png'
  const borderedLightIllustration = '/images/illustrations/auth/v2-login-light-border.png'
  const router = useRouter()
  const { settings } = useSettings()
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const authBackground = useImageVariant(mode, lightImg, darkImg)
  const { login } = useAuth()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const characterIllustration = useImageVariant(mode, lightIllustration, darkIllustration, borderedLightIllustration, borderedDarkIllustration)

  // Map redirect reason to human-readable message
  const reasonMessage = reason === 'session_kicked'
    ? 'You were logged out because another session was started.'
    : reason === 'idle_timeout'
    ? 'Your session expired due to inactivity.'
    : reason === 'session_expired'
    ? 'Your session has expired. Please sign in again.'
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex bs-full justify-center'>
      <div className={classnames('flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden', { 'border-ie': settings.skin === 'bordered' })}>
        <LoginIllustration src={characterIllustration} alt='jobmaster-illustration' />
        {!hidden && <MaskImg alt='mask' src={authBackground} className={classnames({ 'scale-x-[-1]': theme.direction === 'rtl' })} />}
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-0'>
          <div className='flex flex-col items-center gap-3'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src='/Logo_Teal_510x350.png' alt='JobMaster logo' width={200} height={137} style={{ width: 200, height: 'auto' }} />
            <Typography variant='h5'>Sign in to your account</Typography>
          </div>
          {reasonMessage && !error && <Alert severity='info' sx={{ mb: -1 }}>{reasonMessage}</Alert>}
          {error && <Alert severity='error'>{error}</Alert>}
          <form noValidate autoComplete='off' onSubmit={handleSubmit} className='flex flex-col gap-5'>
            <CustomTextField autoFocus fullWidth label='Email' type='email' placeholder='admin@company.com' value={email} onChange={e => setEmail(e.target.value)} />
            <div>
              <CustomTextField
                fullWidth label='Password' placeholder='············'
                type={isPasswordShown ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                slotProps={{ input: { endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton edge='end' onClick={() => setIsPasswordShown(s => !s)} onMouseDown={e => e.preventDefault()}>
                      <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                    </IconButton>
                  </InputAdornment>
                )}}}
              />
              <div className='flex justify-end mt-1'>
                <Link href='/forgot-password' className='text-primary text-sm hover:underline'>Forgot Password?</Link>
              </div>
            </div>
            <Button fullWidth variant='contained' type='submit' disabled={isLoading}>
              {isLoading ? <CircularProgress size={22} color='inherit' /> : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
