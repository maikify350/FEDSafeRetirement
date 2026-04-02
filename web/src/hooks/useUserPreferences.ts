'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Grid-specific preferences (used by EntityListView) */
export interface GridPrefs {
  columnVisibility?: Record<string, boolean>
  columnOrder?:      string[]
  density?:          'compact' | 'normal' | 'comfortable'
  pageSize?:         number
  showFilters?:      boolean
  viewMode?:         'list' | 'cards'
}

/** App-level preferences (theme, clock, weather, timezone, etc.) */
export interface AppPrefs {
  theme?:        string           // 'light' | 'dark' | 'system'
  timezone?:     string           // e.g. 'America/New_York'
  clockFormat?:  '12h' | '24h'
  showClock?:    boolean
  showWeather?:  boolean
  language?:     string
  [key: string]: unknown          // extensible without schema changes
}

/** Dashboard widget preferences */
export interface DashboardPrefs {
  showAlerts?:     boolean
  compactCards?:   boolean
  defaultView?:    string
  [key: string]:   unknown
}

/** Mobile-specific preferences (font size, haptics, etc.) */
export interface MobilePrefs {
  fontSize?:    number
  haptics?:     boolean
  mapDefault?:  string
  [key: string]: unknown
}

/** The full ui_preferences structure stored in team_member */
export interface AllPrefs {
  app?:       AppPrefs
  dashboard?: DashboardPrefs
  grids?:     Record<string, GridPrefs>
  mobile?:    MobilePrefs
  [key: string]: unknown  // any future section works without migration
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache (keyed by teamMemberId to avoid unnecessary DB fetches)
// ─────────────────────────────────────────────────────────────────────────────

const prefsCache: Record<string, AllPrefs>             = {}
const pendingFetch: Record<string, Promise<AllPrefs>>  = {}

const DEBOUNCE_MS = 800

async function fetchAllPrefs(teamMemberId: string): Promise<AllPrefs> {
  if (prefsCache[teamMemberId]) return prefsCache[teamMemberId]

  if (!pendingFetch[teamMemberId]) {
    pendingFetch[teamMemberId] = api
      .get<AllPrefs>(`/api/users/${teamMemberId}/preferences`)
      .then(data => {
        prefsCache[teamMemberId] = data ?? {}
        delete pendingFetch[teamMemberId]
        return prefsCache[teamMemberId]
      })
      .catch(() => {
        delete pendingFetch[teamMemberId]
        return {}
      })
  }

  return pendingFetch[teamMemberId]
}

function updateCache(teamMemberId: string, section: string, key: string | undefined, value: Record<string, unknown>) {
  if (!prefsCache[teamMemberId]) prefsCache[teamMemberId] = {}
  const cache = prefsCache[teamMemberId] as Record<string, any>

  if (key) {
    if (!cache[section]) cache[section] = {}
    cache[section][key] = { ...(cache[section][key] ?? {}), ...value }
  } else {
    cache[section] = { ...(cache[section] ?? {}), ...value }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic preference saver (shared debounce logic)
// ─────────────────────────────────────────────────────────────────────────────

function makeDebouncedSave(teamMemberId: string | null, section: string, key: string | undefined) {
  let timer: ReturnType<typeof setTimeout> | null = null

  return (value: Record<string, unknown>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (!teamMemberId) return
      updateCache(teamMemberId, section, key, value)
      api.patch(`/api/users/${teamMemberId}/preferences`, { section, key, value })
        .catch(err => console.warn('[useUserPreferences] Save failed:', err))
    }, DEBOUNCE_MS)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useGridPreferences — for EntityListView (grids section)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replaces all useLocalStorage calls in EntityListView.
 *
 * @param storageKey   Grid identifier, e.g. 'jm-clients'
 * @param defaultPrefs Fallback used before DB data arrives
 *
 * Returns [prefs, setPrefs, isLoaded]
 */
export function useGridPreferences(
  storageKey: string,
  defaultPrefs: GridPrefs,
): [GridPrefs, (update: GridPrefs | ((prev: GridPrefs) => GridPrefs)) => void, boolean] {
  const { user } = useAuth()
  const teamMemberId = user?.teamMemberId ?? null

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

  const debouncedSave = useRef(makeDebouncedSave(teamMemberId, 'grids', storageKey))

  // Re-create debounced saver if teamMemberId changes (login/logout)
  useEffect(() => {
    debouncedSave.current = makeDebouncedSave(teamMemberId, 'grids', storageKey)
  }, [teamMemberId, storageKey])

  // Fetch from DB on mount
  useEffect(() => {
    if (!teamMemberId) { setIsLoaded(true); return }

    fetchAllPrefs(teamMemberId).then(all => {
      const db = all.grids?.[storageKey]
      if (db) setPrefsState(prev => ({ ...prev, ...db }))
      setIsLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberId, storageKey])

  const setPrefs = useCallback((update: GridPrefs | ((prev: GridPrefs) => GridPrefs)) => {
    setPrefsState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update }
      prefsRef.current = next

      // Mirror to localStorage as instant offline fallback
      try { globalThis.window.localStorage.setItem(lsKey, JSON.stringify(next)) } catch { /* ignore */ }

      debouncedSave.current(next as Record<string, unknown>)
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lsKey])

  return [prefs, setPrefs, isLoaded]
}

// ─────────────────────────────────────────────────────────────────────────────
// useAppPreference — for any named section (app, dashboard, mobile, …)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic hook for any non-grid preference section.
 *
 * @example
 *   const [appPrefs, setAppPref] = useAppPreference<AppPrefs>('app', { theme: 'light', showClock: true })
 *   setAppPref({ theme: 'dark' })   // only updates theme, merges the rest
 *
 *   const [dashPrefs, setDashPref] = useAppPreference<DashboardPrefs>('dashboard', { showAlerts: true })
 */
export function useAppPreference<T extends Record<string, unknown>>(
  section: string,
  defaults: T,
): [T, (update: Partial<T>) => void, boolean] {
  const { user } = useAuth()
  const teamMemberId = user?.teamMemberId ?? null

  const lsKey = `jm-prefs-${section}`

  const [prefs, setPrefsState] = useState<T>(() => {
    if (typeof globalThis.window === 'undefined') return defaults
    try {
      const stored = globalThis.window.localStorage.getItem(lsKey)
      return stored ? { ...defaults, ...(JSON.parse(stored) as T) } : defaults
    } catch {
      return defaults
    }
  })

  const [isLoaded, setIsLoaded] = useState(false)
  const debouncedSave = useRef(makeDebouncedSave(teamMemberId, section, undefined))

  useEffect(() => {
    debouncedSave.current = makeDebouncedSave(teamMemberId, section, undefined)
  }, [teamMemberId, section])

  useEffect(() => {
    if (!teamMemberId) { setIsLoaded(true); return }

    fetchAllPrefs(teamMemberId).then(all => {
      const db = all[section] as T | undefined
      if (db) setPrefsState(prev => ({ ...prev, ...db }))
      setIsLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMemberId, section])

  const setPrefs = useCallback((update: Partial<T>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...update }
      try { globalThis.window.localStorage.setItem(lsKey, JSON.stringify(next)) } catch { /* ignore */ }
      debouncedSave.current(update as Record<string, unknown>)
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lsKey])

  return [prefs, setPrefs, isLoaded]
}

// Re-export for backwards compatibility with any code already importing this name
export { useGridPreferences as useUserPreferences }
