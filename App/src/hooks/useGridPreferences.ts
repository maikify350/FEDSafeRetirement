'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Grid-specific preferences (used by EntityListView) */
export interface GridPrefs {
  columnVisibility?: Record<string, boolean>
  columnOrder?:      string[]
  columnSizing?:     Record<string, number>
  density?:          'compact' | 'normal' | 'comfortable'
  pageSize?:         number
  showFilters?:      boolean
  viewMode?:         'list' | 'cards'
}

/** The full settings structure stored in users.settings */
export interface AllPrefs {
  grids?:     Record<string, GridPrefs>
  [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache
// ─────────────────────────────────────────────────────────────────────────────

const prefsCache: Record<string, AllPrefs>             = {}
const pendingFetch: Record<string, Promise<AllPrefs>>  = {}

const DEBOUNCE_MS = 800

async function fetchAllPrefs(userId: string): Promise<AllPrefs> {
  if (prefsCache[userId]) return prefsCache[userId]

  if (!pendingFetch[userId]) {
    const supabase = createClient()

    pendingFetch[userId] = supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        prefsCache[userId] = (data?.settings as AllPrefs) ?? {}
        delete pendingFetch[userId]
        return prefsCache[userId]
      })
      .catch(() => {
        delete pendingFetch[userId]
        return {}
      })
  }

  return pendingFetch[userId]
}

function updateCacheAndSave(userId: string, section: string, key: string | undefined, value: Record<string, unknown>) {
  if (!prefsCache[userId]) prefsCache[userId] = {}
  const cache = prefsCache[userId] as Record<string, any>

  if (key) {
    if (!cache[section]) cache[section] = {}
    cache[section][key] = { ...(cache[section][key] ?? {}), ...value }
  } else {
    cache[section] = { ...(cache[section] ?? {}), ...value }
  }

  // Save to Supabase — merge into the settings JSONB field
  const supabase = createClient()

  supabase
    .from('users')
    .update({ settings: prefsCache[userId] })
    .eq('id', userId)
    .then(({ error }) => {
      if (error) console.warn('[useGridPreferences] Save failed:', error.message)
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// useGridPreferences — for EntityListView (grids section)
// ─────────────────────────────────────────────────────────────────────────────

export function useGridPreferences(
  storageKey: string,
  defaultPrefs: GridPrefs,
): [GridPrefs, (update: GridPrefs | ((prev: GridPrefs) => GridPrefs)) => void, boolean] {
  const [userId, setUserId] = useState<string | null>(null)

  const lsKey = `${storageKey}-prefs`

  // Seed immediately from localStorage (avoids flash of defaults on first render)
  const [prefs, setPrefsState] = useState<GridPrefs>(() => {
    if (typeof globalThis.window === 'undefined') return defaultPrefs
    try {
      const stored = globalThis.window.localStorage.getItem(lsKey)
      return stored ? { ...defaultPrefs, ...(JSON.parse(stored) as GridPrefs) } : defaultPrefs
    } catch {
      return defaultPrefs
    }
  })

  const [isLoaded, setIsLoaded] = useState(false)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  const debouncedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get current user ID
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  // Fetch from DB on mount
  useEffect(() => {
    if (!userId) { setIsLoaded(true); return }

    fetchAllPrefs(userId).then(all => {
      const db = all.grids?.[storageKey]
      if (db) setPrefsState(prev => ({ ...prev, ...db }))
      setIsLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, storageKey])

  const setPrefs = useCallback((update: GridPrefs | ((prev: GridPrefs) => GridPrefs)) => {
    setPrefsState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update }
      prefsRef.current = next

      // Mirror to localStorage as instant offline fallback
      try { globalThis.window.localStorage.setItem(lsKey, JSON.stringify(next)) } catch { /* ignore */ }

      // Debounced save to Supabase
      if (debouncedTimer.current) clearTimeout(debouncedTimer.current)
      debouncedTimer.current = setTimeout(() => {
        if (userId) {
          updateCacheAndSave(userId, 'grids', storageKey, next as Record<string, unknown>)
        }
      }, DEBOUNCE_MS)

      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lsKey, userId, storageKey])

  return [prefs, setPrefs, isLoaded]
}
