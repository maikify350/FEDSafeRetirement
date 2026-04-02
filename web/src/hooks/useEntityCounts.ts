'use client'

/**
 * useEntityCounts
 *
 * Returns live record counts for all sidebar entities sourced from
 * /api/dashboard/stats. Uses React Query so results are automatically
 * invalidated when any mutation on the entity pages calls
 * queryClient.invalidateQueries(['dashboard-stats']).
 *
 * staleTime: 30s — low-traffic polling is fine; no WebSocket needed.
 * refetchInterval: 60s — passive background refresh.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface EntityCounts {
  clients:  number
  requests: number
  quotes:   number
  jobs:     number
  invoices: number
  vendors:  number
  pos:      number  // purchase orders
  teams:    number
}

interface DashboardStats {
  totalClients:       number
  totalRequests:      number
  totalQuotes:        number
  totalJobs:          number
  totalInvoices:      number
  totalVendors:       number
  totalPurchaseOrders: number
  [key: string]: number
}

export const ENTITY_COUNTS_QUERY_KEY = ['dashboard-stats'] as const

export function useEntityCounts(): EntityCounts {
  const { data } = useQuery<DashboardStats>({
    queryKey: ENTITY_COUNTS_QUERY_KEY,
    queryFn: () => api.get<DashboardStats>('/api/dashboard/stats'),
    staleTime: 30_000,        // 30 s before considered stale
    refetchInterval: 60_000,  // passive background refresh every 60 s
    refetchOnWindowFocus: true,
  })

  return {
    clients:  data?.totalClients       ?? 0,
    requests: data?.totalRequests      ?? 0,
    quotes:   data?.totalQuotes        ?? 0,
    jobs:     data?.totalJobs          ?? 0,
    invoices: data?.totalInvoices      ?? 0,
    vendors:  data?.totalVendors       ?? 0,
    pos:      data?.totalPurchaseOrders ?? 0,
    teams:    data?.totalTeamMembers    ?? 0,
  }
}
