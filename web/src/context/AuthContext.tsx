'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
  role?: string | null
  gender?: string | null
  teamMemberId?: string | null
}

type AuthContextType = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: (reason?: string) => void
  adminModeEnabled: boolean
  setAdminModeEnabled: (enabled: boolean) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TOKEN_KEY = 'jm_token'
const USER_KEY = 'jm_user'
const REFRESH_KEY = 'jm_refresh_token'
const EXPIRES_KEY = 'jm_expires_at'
const ADMIN_MODE_KEY = 'jm_admin_mode'
const IDLE_WARNING_MS = 60_000        // 60 seconds warning before auto-logout
const REFRESH_BUFFER_MS = 5 * 60_000  // refresh 5 minutes before expiry

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [adminModeEnabled, setAdminModeRaw] = useState(false)

  const router = useRouter()
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimeoutMs = useRef(60 * 60_000) // default 60 min — overridden by tenant setting

  // ── Admin mode persistence ──────────────────────────────────────────────────
  const setAdminModeEnabled = useCallback((enabled: boolean) => {
    setAdminModeRaw(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_MODE_KEY, String(enabled))
    }
  }, [])

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback((reason?: string) => {
    // Call backend logout (fire-and-forget)
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/mvp-auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => { /* ignore */ })
    }

    // Clear local storage
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(EXPIRES_KEY)
    setUser(null)

    // Clear timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)

    // Redirect with optional reason
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : ''
    router.push(`/login${query}`)
  }, [router])

  // ── Token refresh ───────────────────────────────────────────────────────────
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)

    const expiresAt = localStorage.getItem(EXPIRES_KEY)
    if (!expiresAt) return

    const msUntilExpiry = new Date(expiresAt).getTime() - Date.now()
    const refreshIn = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, 5000) // at least 5s

    refreshTimerRef.current = setTimeout(async () => {
      const refreshToken = localStorage.getItem(REFRESH_KEY)
      if (!refreshToken) { logout('session_expired'); return }

      try {
        const res = await api.post<{
          token: string
          refreshToken: string
          expiresAt: string
        }>('/api/mvp-auth/refresh', { refreshToken })

        localStorage.setItem(TOKEN_KEY, res.token)
        localStorage.setItem(REFRESH_KEY, res.refreshToken)
        localStorage.setItem(EXPIRES_KEY, res.expiresAt)
        scheduleRefresh() // re-schedule for next refresh
      } catch {
        logout('session_expired')
      }
    }, refreshIn)
  }, [logout])

  // ── Idle timeout ────────────────────────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    // Don't track idle if admin mode is on
    if (localStorage.getItem(ADMIN_MODE_KEY) === 'true') return
    if (!localStorage.getItem(TOKEN_KEY)) return

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

    // Main idle timer → show warning
    idleTimerRef.current = setTimeout(() => {
      // Show a warning toast — emit a custom event the Navbar/layout can listen to
      window.dispatchEvent(new CustomEvent('jm:idle-warning'))

      // After warning period → auto-logout
      warningTimerRef.current = setTimeout(() => {
        logout('idle_timeout')
      }, IDLE_WARNING_MS)
    }, idleTimeoutMs.current - IDLE_WARNING_MS)
  }, [logout])

  // ── Mount: restore session ──────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const stored = localStorage.getItem(USER_KEY)
    const adminMode = localStorage.getItem(ADMIN_MODE_KEY)

    if (adminMode === 'true') setAdminModeRaw(true)

    if (token && stored) {
      // Check JWT expiry
      const payload = parseJwt(token)
      const exp = payload?.exp as number | undefined
      if (exp && exp * 1000 < Date.now()) {
        // Token expired — try refresh
        const refreshToken = localStorage.getItem(REFRESH_KEY)
        if (refreshToken) {
          api.post<{ token: string; refreshToken: string; expiresAt: string }>('/api/mvp-auth/refresh', { refreshToken })
            .then(res => {
              localStorage.setItem(TOKEN_KEY, res.token)
              localStorage.setItem(REFRESH_KEY, res.refreshToken)
              localStorage.setItem(EXPIRES_KEY, res.expiresAt)
              try { setUser(JSON.parse(stored)) } catch { /* ignore */ }
              scheduleRefresh()
            })
            .catch(() => {
              // Refresh failed — clear everything
              localStorage.removeItem(TOKEN_KEY)
              localStorage.removeItem(USER_KEY)
              localStorage.removeItem(REFRESH_KEY)
              localStorage.removeItem(EXPIRES_KEY)
            })
            .finally(() => setIsLoading(false))
          return
        }
        // No refresh token — clear
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } else {
        try { setUser(JSON.parse(stored)) } catch {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
        }
        scheduleRefresh()
      }
    }
    setIsLoading(false)
  }, [scheduleRefresh])

  // ── Attach idle listeners ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }))
    resetIdleTimer()
    return () => { events.forEach(e => window.removeEventListener(e, resetIdleTimer)) }
  }, [user, resetIdleTimer])

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const res = await api.post<{
      token: string
      refreshToken: string
      expiresAt: string
      user: AuthUser
    }>('/api/mvp-auth/login', { email, password })

    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(REFRESH_KEY, res.refreshToken)
    localStorage.setItem(EXPIRES_KEY, res.expiresAt)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
    setUser(res.user)
    scheduleRefresh()
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated,
      login, logout,
      adminModeEnabled, setAdminModeEnabled,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
