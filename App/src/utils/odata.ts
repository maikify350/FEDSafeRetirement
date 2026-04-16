/**
 * OData-style query parameter helpers for Supabase queries.
 *
 * Supported parameters:
 *   $select   – Comma-separated list of columns (e.g. "id,first_name,last_name")
 *   $top      – Maximum rows to return (limit)
 *   $skip     – Number of rows to skip (offset)
 *   $orderby  – Sort column and optional direction (e.g. "last_name desc")
 *   $filter   – Simple equality filters (e.g. "state_fk eq 'TX'")
 *
 * Usage:
 *   import { applyOData } from '@/utils/odata'
 *   let query = supabase.from('table').select(cols)
 *   query = applyOData(query, request.nextUrl.searchParams)
 */

export function applyOData<T extends {
  order: (col: string, opts: { ascending: boolean }) => T
  range: (from: number, to: number) => T
  eq: (col: string, val: string | number) => T
}>(query: T, params: URLSearchParams): T {
  // $orderby — e.g. "last_name desc" or "age_min asc"
  const orderby = params.get('$orderby')
  if (orderby) {
    const parts = orderby.trim().split(/\s+/)
    const col = parts[0]
    const dir = (parts[1] || 'asc').toLowerCase()
    query = query.order(col, { ascending: dir !== 'desc' })
  }

  // $filter — simple "col eq 'value'" or "col eq 123"
  const filter = params.get('$filter')
  if (filter) {
    // Support multiple filters separated by " and "
    const clauses = filter.split(/\s+and\s+/i)
    for (const clause of clauses) {
      const match = clause.trim().match(/^(\w+)\s+eq\s+(?:'([^']*)'|(\S+))$/i)
      if (match) {
        const col = match[1]
        const val = match[2] !== undefined ? match[2] : Number(match[3])
        query = query.eq(col, val)
      }
    }
  }

  // $skip + $top — pagination via range()
  const skip = params.get('$skip')
  const top = params.get('$top')
  if (skip || top) {
    const from = skip ? parseInt(skip, 10) : 0
    const to = top ? from + parseInt(top, 10) - 1 : from + 999
    query = query.range(from, to)
  }

  return query
}

/**
 * Parse $select to get column string for Supabase .select()
 * Returns null if $select is not provided (caller should use default cols).
 */
export function parseODataSelect(params: URLSearchParams): string | null {
  const select = params.get('$select')
  if (!select) return null
  // Sanitize: only allow word characters and commas
  return select
    .split(',')
    .map(c => c.trim())
    .filter(c => /^\w+$/.test(c))
    .join(', ')
}
