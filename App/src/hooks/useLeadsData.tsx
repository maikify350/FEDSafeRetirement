'use client'

/**
 * useLeadsData — Shared leads data context that persists across navigation.
 *
 * This context lives at the dashboard layout level so that navigating away
 * from the Leads page and back does NOT trigger a fresh data fetch.
 * Instead, the cached data is returned instantly and a background refresh
 * is performed only when the data is considered stale (> STALE_THRESHOLD_MS).
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table'
import { isConditionActive, type ColFilterValue } from '@/lib/columnFilter'

// How long before cached data is considered stale and silently refreshed
const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

interface Lead {
  id: string
  first_name: string
  last_name: string
  middle_initial: string | null
  occupation_title: string | null
  grade_level: string | null
  annual_salary: number | null
  hourly_rate: number | null
  facility_name: string | null
  facility_address: string | null
  facility_city: string | null
  facility_state: string | null
  facility_zip_code: string | null
  entered_on_duty_date: string | null
  years_of_service: number | null
  gender: string | null
  date_of_birth: string | null
  source_file: string | null
  is_favorite: boolean
  personal_address: string | null
  personal_city: string | null
  personal_state: string | null
  personal_zip: string | null
  personal_email: string | null
  personal_phone: string | null
  cre_dt: string | null
  cre_by: string | null
  mod_by: string | null
  mod_dt: string | null
}

export type { Lead }

interface LeadsDataState {
  // Data
  leads: Lead[]
  totalRows: number
  loading: boolean

  // Pagination
  currentPage: number
  pageSize: number

  // Filters
  globalFilter: string
  debouncedSearch: string
  sorting: SortingState
  columnFilters: ColumnFiltersState
  stateFilter: string
  genderFilter: string
  favoriteFilter: boolean
  collectionFilter: string
  collections: { id: string; name: string }[]

  // Setters
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>
  setTotalRows: React.Dispatch<React.SetStateAction<number>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  setPageSize: React.Dispatch<React.SetStateAction<number>>
  setGlobalFilter: React.Dispatch<React.SetStateAction<string>>
  setDebouncedSearch: React.Dispatch<React.SetStateAction<string>>
  setSorting: React.Dispatch<React.SetStateAction<SortingState>>
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>
  setStateFilter: React.Dispatch<React.SetStateAction<string>>
  setGenderFilter: React.Dispatch<React.SetStateAction<string>>
  setFavoriteFilter: React.Dispatch<React.SetStateAction<boolean>>
  setCollectionFilter: React.Dispatch<React.SetStateAction<string>>
  setCollections: React.Dispatch<React.SetStateAction<{ id: string; name: string }[]>>

  // Actions
  fetchLeads: () => Promise<void>
  refreshCollections: () => void

  // Lifecycle
  hasInitialized: boolean
  lastFetchTime: number | null
  markStaleCheckOnResume: () => boolean
}

const LeadsDataContext = createContext<LeadsDataState | null>(null)

export function useLeadsData() {
  const ctx = useContext(LeadsDataContext)
  if (!ctx) throw new Error('useLeadsData must be used within LeadsDataProvider')
  return ctx
}

export function LeadsDataProvider({ children }: { children: React.ReactNode }) {
  // ── Data ─────────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)

  // ── Pagination ───────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // ── Filters ──────────────────────────────────────────────────────────────
  const [globalFilter, setGlobalFilter] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'last_name', desc: false }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [favoriteFilter, setFavoriteFilter] = useState(false)
  const [collectionFilter, setCollectionFilter] = useState<string>('')
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([])

  // ── Lifecycle tracking ───────────────────────────────────────────────────
  const [hasInitialized, setHasInitialized] = useState(false)
  const lastFetchTimeRef = useRef<number | null>(null)

  // ── Fetch leads ──────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const activeFilters = columnFilters
        .filter(cf => {
          const val = cf.value as ColFilterValue
          return val?.conditions?.some(isConditionActive)
        })
        .map(cf => ({ id: cf.id, value: cf.value }))

      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(pageSize),
        search: debouncedSearch,
        sort: JSON.stringify(sorting),
        filters: JSON.stringify(activeFilters),
        ...(stateFilter !== 'all' ? { state: stateFilter } : {}),
        ...(genderFilter !== 'all' ? { gender: genderFilter } : {}),
        ...(favoriteFilter ? { favorite: 'true' } : {}),
      })

      const res = await fetch(`/api/leads?${params}`, { cache: 'no-store' })
      const json = await res.json()

      if (json.error) {
        console.error('Leads API error:', json.error)
      } else {
        setLeads(json.data)
        setTotalRows(json.total)
      }

      lastFetchTimeRef.current = Date.now()
      if (!hasInitialized) setHasInitialized(true)
    } catch (err) {
      console.error('Failed to fetch leads:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, sorting, columnFilters, stateFilter, genderFilter, favoriteFilter, hasInitialized])

  // ── Fetch collections ────────────────────────────────────────────────────
  const refreshCollections = useCallback(() => {
    fetch('/api/collections').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCollections(data.map((c: any) => ({ id: c.id, name: c.name })))
    }).catch(() => {})
  }, [])

  // ── Stale check: returns true if data should be refreshed ────────────────
  const markStaleCheckOnResume = useCallback((): boolean => {
    if (!hasInitialized) return true
    if (lastFetchTimeRef.current === null) return true
    return Date.now() - lastFetchTimeRef.current > STALE_THRESHOLD_MS
  }, [hasInitialized])

  return (
    <LeadsDataContext.Provider
      value={{
        leads, totalRows, loading,
        currentPage, pageSize,
        globalFilter, debouncedSearch, sorting, columnFilters,
        stateFilter, genderFilter, favoriteFilter,
        collectionFilter, collections,
        setLeads, setTotalRows, setLoading,
        setCurrentPage, setPageSize,
        setGlobalFilter, setDebouncedSearch,
        setSorting, setColumnFilters,
        setStateFilter, setGenderFilter, setFavoriteFilter,
        setCollectionFilter, setCollections,
        fetchLeads, refreshCollections,
        hasInitialized, lastFetchTime: lastFetchTimeRef.current,
        markStaleCheckOnResume,
      }}
    >
      {children}
    </LeadsDataContext.Provider>
  )
}
