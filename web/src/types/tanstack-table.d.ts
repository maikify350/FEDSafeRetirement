import type { FilterFn } from '@tanstack/react-table'

// Extend TanStack Table's FilterFns interface so TypeScript accepts
// our custom 'multiCondition' filterFn key in column/table configs.
declare module '@tanstack/react-table' {
  interface FilterFns {
    multiCondition: FilterFn<unknown>
  }
}
