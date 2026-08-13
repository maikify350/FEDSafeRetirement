'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

/**
 * AuthGuard — wraps (dashboard) layout.
 *
 * 1. If no token → redirect to /login
 * 2. While checking → show loading spinner
 * 3. Admin mode → skip the redirect (dev convenience)
 * 4. Listens for idle-warning custom events from AuthContext
 */
export default function AuthGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isLoading, isAuthenticated, adminModeEnabled } = useAuth()
  const router = useRouter()
  const [idleWarning, setIdleWarning] = useState(false)

  // Handle redirect when not authenticated
  useEffect(() => {
    if (isLoading) return  // still checking

    // Admin mode bypass — skip auth check entirely
    if (adminModeEnabled) return

    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, adminModeEnabled, router])

  // Listen for idle-warning events from AuthContext
  useEffect(() => {
    const handleIdleWarning = () => {
      setIdleWarning(true)
    }

    globalThis.addEventListener('jm:idle-warning', handleIdleWarning)
    return () => globalThis.removeEventListener('jm:idle-warning', handleIdleWarning)
  }, [])

  // Reset idle warning on any user activity
  useEffect(() => {
    if (!idleWarning) return
    const dismiss = () => setIdleWarning(false)
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart'] as const
    events.forEach(e => globalThis.addEventListener(e, dismiss, { once: true }))
    return () => { events.forEach(e => globalThis.removeEventListener(e, dismiss)) }
  }, [idleWarning])

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: 'var(--mui-palette-background-default)'
      }}>
        <CircularProgress size={48} />
      </div>
    )
  }

  // Not authenticated and not admin mode → don't render children (redirect is happening)
  if (!isAuthenticated && !adminModeEnabled) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: 'var(--mui-palette-background-default)'
      }}>
        <CircularProgress size={48} />
      </div>
    )
  }

  return (
    <>
      {children}

      {/* Idle timeout warning snackbar */}
      <Snackbar
        open={idleWarning}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity='warning'
          variant='filled'
          sx={{ width: '100%', fontSize: '0.95rem' }}
          action={
            <button
              onClick={() => setIdleWarning(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 6,
                padding: '4px 12px',
                color: 'var(--mui-palette-common-white)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem'
              }}
            >
              I&apos;m here
            </button>
          }
        >
          Your session will expire in 60 seconds due to inactivity
        </Alert>
      </Snackbar>
    </>
  )
}
