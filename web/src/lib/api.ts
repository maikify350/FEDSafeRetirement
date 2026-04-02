/**
 * JobMaster API client for the web admin.
 * Talks to the same Hono backend as the mobile app.
 * Base URL comes from NEXT_PUBLIC_BACKEND_URL env var.
 *
 * Features:
 * - Auto-attaches JWT Bearer token from localStorage
 * - Global 401 interceptor → clears session, redirects to /login
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

type RequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const token = typeof window !== 'undefined' ? localStorage.getItem('jm_token') : null
  const isFormData = body instanceof FormData

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      // Don't set Content-Type for FormData — browser sets it with the boundary automatically
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {})
  })

  // ── Global 401 handler ────────────────────────────────────────────────────
  // If the backend returns 401, the session was kicked or the token is invalid.
  // Clear localStorage and redirect to login (unless we're already on the login page).
  if (res.status === 401 && typeof window !== 'undefined') {
    const isLoginCall = path.includes('/login') || path.includes('/refresh')
    if (!isLoginCall) {
      localStorage.removeItem('jm_token')
      localStorage.removeItem('jm_user')
      localStorage.removeItem('jm_refresh_token')
      localStorage.removeItem('jm_expires_at')
      window.location.href = '/login?reason=session_kicked'
      throw new Error('Session expired — redirecting to login')
    }
  }

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || `Request failed: ${res.status}`)
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
}
