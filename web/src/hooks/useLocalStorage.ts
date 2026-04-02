import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Persists state to localStorage so user preferences survive page reloads.
 * Drop-in replacement for useState — same API.
 *
 * Automatically syncs across all hook instances on the same page via a
 * custom DOM event, so toggling in one component updates all others instantly.
 *
 * @example
 * const [viewMode, setViewMode] = useLocalStorage<'list' | 'cards'>('clients-view-mode', 'list')
 * const [pageSize, setPageSize] = useLocalStorage<number>('clients-page-size', 10)
 */
function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue

    try {
      const stored = window.localStorage.getItem(key)

      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  // Track current value in a ref to allow the setter to stay stable while reading the latest value
  const valueRef = useRef(value)
  valueRef.current = value

  // Write to localStorage when value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage unavailable — fail silently
    }
  }, [key, value])

  // Setter that also dispatches a custom event for cross-component sync
  const set = useCallback((v: T | ((prev: T) => T)) => {
    const next = typeof v === 'function' ? (v as (prev: T) => T)(valueRef.current) : v

    setValue(next)

    // Dispatch custom event so other instances of this hook (same key) can sync
    // This MUST be done outside of the setValue updater callback so we don't dispatch events during React's render phase
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('local-storage-sync', { detail: { key, value: next } })
      )
    }
  }, [key])

  // Listen for sync events from other hook instances
  useEffect(() => {
    const handler = (e: Event) => {
      const { key: k, value: v } = (e as CustomEvent).detail

      if (k === key) {
        setValue(v as T)
      }
    }

    window.addEventListener('local-storage-sync', handler)

    return () => window.removeEventListener('local-storage-sync', handler)
  }, [key])

  return [value, set]
}

export default useLocalStorage
