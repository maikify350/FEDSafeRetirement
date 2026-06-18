'use client'

/**
 * useCurrentUser — Fetches the currently logged-in user from the users table
 * and exposes role-based helpers (isAdmin, isAdvisor, etc.).
 *
 * Caches the result in a module-level variable so repeated calls across
 * components don't trigger extra fetches within the same page navigation.
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface CurrentUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

interface UseCurrentUserResult {
  user: CurrentUser | null
  loading: boolean
  isAdmin: boolean
}

let cachedUser: CurrentUser | null = null
let fetchPromise: Promise<CurrentUser | null> | null = null

async function fetchUser(): Promise<CurrentUser | null> {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .eq('id', authUser.id)
    .single()

  return data as CurrentUser | null
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(cachedUser)
  const [loading, setLoading] = useState(!cachedUser)

  useEffect(() => {
    if (cachedUser) {
      setUser(cachedUser)
      setLoading(false)
      return
    }

    if (!fetchPromise) {
      fetchPromise = fetchUser()
    }

    fetchPromise.then(u => {
      cachedUser = u
      setUser(u)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  return {
    user,
    loading,
    isAdmin: user?.role === 'admin',
  }
}
