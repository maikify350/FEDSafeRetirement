'use client'

/**
 * useLeadFunnelData — Shared lead funnel data context that persists across navigation.
 *
 * Same pattern as useLeadsData: lives at the dashboard layout level so navigating
 * away from the Lead Funnel page and back does NOT trigger a fresh data fetch.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

const STALE_THRESHOLD_MS = 5 * 60 * 1000

interface LeadFunnelRow {
  id: string
  ext_appointment_id: number | null
  ext_lead_id: number | null
  event: string | null
  source: string | null
  lead_type: string | null
  status: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  cell_phone: string | null
  birth_year: number | null
  is_over_59: boolean | null
  agency: string | null
  years_employed: string | null
  city: string | null
  state: string | null
  zip: string | null
  marital_status: string | null
  fegli_options: string | null
  retirement_year: number | null
  tsp_value: number | null
  other_acct_value: number | null
  appointment_date: string | null
  ext_agent_id: number | null
  act_contact_id: string | null
  assigned_agent: string | null
  imported_at: string | null
  import_error: string | null
  notes: string | null
  processed: boolean
  cre_dt: string
}

export type { LeadFunnelRow }

interface LeadFunnelDataState {
  leads: LeadFunnelRow[]
  loading: boolean
  search: string
  setLeads: React.Dispatch<React.SetStateAction<LeadFunnelRow[]>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  fetchLeads: () => Promise<void>
  hasInitialized: boolean
  markStaleCheckOnResume: () => boolean
}

const LeadFunnelDataContext = createContext<LeadFunnelDataState | null>(null)

export function useLeadFunnelData() {
  const ctx = useContext(LeadFunnelDataContext)
  if (!ctx) throw new Error('useLeadFunnelData must be used within LeadFunnelDataProvider')
  return ctx
}

export function LeadFunnelDataProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<LeadFunnelRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [hasInitialized, setHasInitialized] = useState(false)
  const lastFetchTimeRef = useRef<number | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lead-funnel')
      const data = await res.json()
      if (Array.isArray(data)) setLeads(data)
      lastFetchTimeRef.current = Date.now()
      if (!hasInitialized) setHasInitialized(true)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [hasInitialized])

  const markStaleCheckOnResume = useCallback((): boolean => {
    if (!hasInitialized) return true
    if (lastFetchTimeRef.current === null) return true
    return Date.now() - lastFetchTimeRef.current > STALE_THRESHOLD_MS
  }, [hasInitialized])

  return (
    <LeadFunnelDataContext.Provider
      value={{
        leads, loading, search,
        setLeads, setLoading, setSearch,
        fetchLeads, hasInitialized, markStaleCheckOnResume,
      }}
    >
      {children}
    </LeadFunnelDataContext.Provider>
  )
}
