'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ChildrenType } from '@core/types'

/**
 * React Query (TanStack) QueryClientProvider wrapper for the app.
 *
 * @module D:/WIP/JobMaster_Local_Dev/web/src/components/QueryProvider.tsx
 */
export default function QueryProvider({ children }: ChildrenType) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 min — avoid refetch hammering on tab focus
            retry: 1,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
