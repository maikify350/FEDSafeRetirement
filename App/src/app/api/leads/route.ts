/**
 * Server-side API route for leads data.
 *
 * Uses a hybrid approach:
 *   - For simple search + state filter: calls the optimized search_leads() RPC
 *   - For per-column multi-condition filters: uses PostgREST query builder
 *
 * Query params:
 *   page=0       – zero-indexed page number
 *   pageSize=25  – rows per page
 *   search=      – global case-insensitive search across key text fields
 *   sort=        – JSON: [{ id: 'last_name', desc: false }]
 *   filters=     – JSON: [{ id: 'facility_state', value: { combinator, conditions } }]
 *   state=       – quick state filter (shortcut, e.g. "CA")
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { ColFilterValue } from '@/lib/columnFilter'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { searchParams } = request.nextUrl
  const page       = parseInt(searchParams.get('page') ?? '0')
  const pageSize   = parseInt(searchParams.get('pageSize') ?? '25')
  const search     = searchParams.get('search') ?? ''
  const stateParam = searchParams.get('state') ?? ''
  const sortRaw    = searchParams.get('sort') ?? '[]'
  const filtersRaw = searchParams.get('filters') ?? '[]'

  let sorting: { id: string; desc: boolean }[] = []
  let columnFilters: { id: string; value: ColFilterValue }[] = []

  try { sorting = JSON.parse(sortRaw) } catch { /* ignore */ }
  try { columnFilters = JSON.parse(filtersRaw) } catch { /* ignore */ }

  // Determine if we have per-column filters (beyond just state)
  const hasColumnFilters = columnFilters.length > 0

  // ── Fast path: use RPC for search + state (most common case) ──────────────
  if (!hasColumnFilters) {
    const sortCol = sorting.length > 0 ? sorting[0].id : 'last_name'
    const sortDesc = sorting.length > 0 ? sorting[0].desc : false

    const favoriteParam = searchParams.get('favorite')

    const { data, error } = await supabase.rpc('search_leads', {
      p_search: search.trim(),
      p_state: stateParam,
      p_gender: searchParams.get('gender') ?? '',
      p_favorite: favoriteParam === 'true' ? true : null,
      p_sort_col: sortCol,
      p_sort_desc: sortDesc,
      p_limit: pageSize,
      p_offset: page * pageSize,
    })

    if (error) {
      console.error('[API /leads] RPC Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // RPC returns rows as { leads_data: jsonb, total_count: bigint }
    const rows = (data ?? [])
      .filter((r: any) => r.leads_data !== null)
      .map((r: any) => r.leads_data)
    const total = data?.[0]?.total_count ?? 0

    return NextResponse.json({
      data: rows,
      total: Number(total),
      page,
      pageSize,
    })
  }

  // ── Slow path: PostgREST for per-column multi-condition filters ───────────
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })

  // Apply state filter if present
  if (stateParam) {
    query = query.eq('facility_state', stateParam)
  }

  // Global search
  if (search.trim()) {
    const term = search.trim()
    if (term.length < 3) {
      query = query.or(
        `first_name.ilike.${term}%,last_name.ilike.${term}%,facility_state.ilike.${term}%`
      )
    } else {
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,occupation_title.ilike.%${term}%,facility_name.ilike.%${term}%,facility_city.ilike.%${term}%`
      )
    }
  }

  // Per-column filters
  for (const cf of columnFilters) {
    const { id: columnId, value: filterValue } = cf
    if (!filterValue?.conditions) continue

    const activeConditions = filterValue.conditions.filter(c =>
      c.op === 'isEmpty' || c.op === 'isNotEmpty' || c.value.trim() !== ''
    )
    if (activeConditions.length === 0) continue

    if (filterValue.combinator === 'or') {
      const orParts: string[] = []
      for (const cond of activeConditions) {
        const part = conditionToPostgrest(columnId, cond)
        if (part) orParts.push(part)
      }
      if (orParts.length > 0) {
        query = query.or(orParts.join(','))
      }
    } else {
      for (const cond of activeConditions) {
        query = applyConditionToQuery(query, columnId, cond)
      }
    }
  }

  // Sorting
  if (sorting.length > 0) {
    for (const s of sorting) {
      query = query.order(s.id, { ascending: !s.desc })
    }
  } else {
    query = query.order('last_name', { ascending: true })
  }

  // Pagination
  const from = page * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('[API /leads] PostgREST Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  })
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function conditionToPostgrest(column: string, cond: { op: string; value: string }): string | null {
  const v = cond.value.trim()

  switch (cond.op) {
    case 'contains':    return `${column}.ilike.%${v}%`
    case 'notContains': return `${column}.not.ilike.%${v}%`
    case 'startsWith':  return `${column}.ilike.${v}%`
    case 'endsWith':    return `${column}.ilike.%${v}`
    case 'equals':      return `${column}.eq.${v}`
    case 'notEquals':   return `${column}.not.ilike.${v}`
    case 'isEmpty':     return `${column}.is.null,${column}.eq.`
    case 'isNotEmpty':  return `${column}.neq.`
    default:            return null
  }
}

function applyConditionToQuery(query: any, column: string, cond: { op: string; value: string }) {
  const v = cond.value.trim()

  switch (cond.op) {
    case 'contains':    return query.ilike(column, `%${v}%`)
    case 'notContains': return query.not(column, 'ilike', `%${v}%`)
    case 'startsWith':  return query.ilike(column, `${v}%`)
    case 'endsWith':    return query.ilike(column, `%${v}`)
    case 'equals':      return query.eq(column, v)
    case 'notEquals':   return query.not(column, 'ilike', v)
    case 'isEmpty':     return query.or(`${column}.is.null,${column}.eq.`)
    case 'isNotEmpty':  return query.neq(column, '').not(column, 'is', null)
    default:            return query
  }
}
