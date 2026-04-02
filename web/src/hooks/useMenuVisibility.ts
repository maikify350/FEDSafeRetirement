'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useAuth } from '@/context/AuthContext'

/**
 * All sidebar menu entries that can be toggled.
 * The `id` must match the key used in VerticalMenu.tsx to conditionally render.
 */
export const MENU_ENTRIES = [
  { id: 'home',            label: 'Home Dashboard',   icon: 'tabler-smart-home' },
  { id: 'clients',         label: 'Clients',          icon: 'tabler-users' },
  { id: 'requests',        label: 'Requests',         icon: 'tabler-inbox' },
  { id: 'quotes',          label: 'Quotes',           icon: 'tabler-file-description' },
  { id: 'jobs',            label: 'Jobs',             icon: 'tabler-briefcase' },
  { id: 'invoices',        label: 'Invoices',         icon: 'tabler-file-invoice' },
  { id: 'vendors',         label: 'Vendors',          icon: 'tabler-building-store' },
  { id: 'pos',             label: 'Purchase Orders',  icon: 'tabler-clipboard-list' },
  { id: 'solutions',       label: 'Solutions',        icon: 'tabler-bulb' },
  { id: 'fleet',           label: 'Fleet',            icon: 'tabler-car' },
  { id: 'reports',         label: 'Reports',          icon: 'tabler-file-analytics' },
  { id: 'scheduling',      label: 'Scheduling',       icon: 'tabler-calendar-event' },
  { id: 'dispatch',        label: 'Dispatch',         icon: 'tabler-truck-delivery' },
  { id: 'admin',           label: 'Admin',            icon: 'tabler-settings-2' },
  { id: 'about',           label: 'About',            icon: 'tabler-info-circle' },
] as const

export type MenuEntryId = typeof MENU_ENTRIES[number]['id']

// Default: all visible
const ALL_VISIBLE: Record<MenuEntryId, boolean> = Object.fromEntries(
  MENU_ENTRIES.map(e => [e.id, true])
) as Record<MenuEntryId, boolean>

/**
 * Hook to manage per-user sidebar menu visibility.
 * Preferences are stored in localStorage keyed by user ID so each
 * logged-in user gets their own menu layout.
 *
 * `mounted` is exported so VerticalMenu can hide the whole menu area
 * via CSS `visibility:hidden` during SSR, preventing any flash.
 * The items still occupy space (no layout shift); once mounted the
 * correct visibility state from localStorage is already loaded.
 */
export function useMenuVisibility() {
  const { user } = useAuth()
  const storageKey = `jm-menu-vis-${user?.id ?? 'anon'}`

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [visibility, setVisibility] = useLocalStorage<Record<MenuEntryId, boolean>>(
    storageKey,
    ALL_VISIBLE
  )

  /** Toggle a single menu item on/off */
  const toggle = useCallback(
    (id: MenuEntryId) => {
      setVisibility(prev => ({ ...prev, [id]: !prev[id] }))
    },
    [setVisibility]
  )

  /** Show all menu items */
  const showAll = useCallback(() => {
    setVisibility(ALL_VISIBLE)
  }, [setVisibility])

  /**
   * Check if a specific menu item is visible.
   * Returns the real stored value (even before mount) so the DOM always
   * matches the correct state. The parent component uses `mounted` + CSS
   * `visibility:hidden` to prevent the flash.
   */
  const isVisible = useCallback(
    (id: MenuEntryId): boolean => visibility[id] ?? true,
    [visibility]
  )

  /** Count of currently hidden items */
  const hiddenCount = useMemo(
    () => MENU_ENTRIES.filter(e => !visibility[e.id]).length,
    [visibility]
  )

  return { visibility, toggle, showAll, isVisible, hiddenCount, mounted }
}

