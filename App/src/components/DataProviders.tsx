'use client'

/**
 * DataProviders — Wraps the dashboard with all data context providers.
 *
 * This component groups together all the data provider contexts so they persist
 * across page navigation within the dashboard. Each provider caches its data
 * and prevents unnecessary refetches when the user navigates between sections.
 */

import { LeadsDataProvider } from '@/hooks/useLeadsData'
import { LeadFunnelDataProvider } from '@/hooks/useLeadFunnelData'

export default function DataProviders({ children }: { children: React.ReactNode }) {
  return (
    <LeadsDataProvider>
      <LeadFunnelDataProvider>
        {children}
      </LeadFunnelDataProvider>
    </LeadsDataProvider>
  )
}
