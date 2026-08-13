/**
 * GET /api/leads/export
 *
 * Bulk export of leads matching the same filter set as /api/leads, but
 * without pagination. Hard-capped at 50,000 rows so a runaway request
 * can't drag down the DB or the client.
 *
 * Query params:
 *   search         – global search term (same semantics as /api/leads)
 *   state          – quick state filter (e.g. "CA")
 *   gender         – quick gender filter ("M" | "F")
 *   favorite       – "true" to limit to favorites only
 *   filters        – JSON column-filter array (same shape as /api/leads)
 *   sort           – JSON sort array (same shape as /api/leads)
 *   max            – upper bound on rows returned (default 50000, max 50000)
 *   format         – 'json' (default) or 'csv'
 *
 * Response:
 *   format=json → { data: Lead[], total, capped }
 *   format=csv  → text/csv attachment with the standard lead-export columns.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'
import type { ColFilterValue } from '@/lib/columnFilter'

const HARD_MAX = 50_000

type Lead = Record<string, any>

function escapeCsvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)

  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  
return s
}

function leadsToCsv(leads: Lead[]): string {
  const headers = [
    'First Name', 'Last Name', 'Occupation', 'Grade', 'Annual Salary', 'Hourly Rate',
    'Facility', 'City', 'State', 'Zip', 'Duty Date', 'Years of Service',
  ]

  const rows = leads.map(r => [
    r.first_name, r.last_name, r.occupation_title ?? '', r.grade_level ?? '',
    r.annual_salary ?? '', r.hourly_rate ?? '',
    r.facility_name ?? '', r.facility_city ?? '', r.facility_state ?? '', r.facility_zip_code ?? '',
    r.entered_on_duty_date ?? '', r.years_of_service ?? '',
  ])

  
return [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
}

function conditionToPostgrest(column: string, cond: { op: string; value: string }): string | null {
  const v = cond.value.trim()
  const isZip = column === 'facility_zip_code' || column === 'personal_zip'
  const likeMethod = isZip ? 'like' : 'ilike'

  switch (cond.op) {
    case 'contains':    return `${column}.${likeMethod}.%${v}%`
    case 'notContains': return `${column}.not.${likeMethod}.%${v}%`
    case 'startsWith':  return `${column}.${likeMethod}.${v}%`
    case 'endsWith':    return `${column}.${likeMethod}.%${v}`
    case 'equals':      return `${column}.eq.${v}`
    case 'notEquals':   return `${column}.not.${likeMethod}.${v}`
    case 'isEmpty':     return `${column}.is.null,${column}.eq.`
    case 'isNotEmpty':  return `${column}.neq.`
    default:            return null
  }
}

function applyConditionToQuery(query: any, column: string, cond: { op: string; value: string }) {
  const v = cond.value.trim()
  const isZip = column === 'facility_zip_code' || column === 'personal_zip'

  switch (cond.op) {
    case 'contains':    return isZip ? query.like(column, `%${v}%`) : query.ilike(column, `%${v}%`)
    case 'notContains': return query.not(column, isZip ? 'like' : 'ilike', `%${v}%`)
    case 'startsWith':  return isZip ? query.like(column, `${v}%`) : query.ilike(column, `${v}%`)
    case 'endsWith':    return isZip ? query.like(column, `%${v}`) : query.ilike(column, `%${v}`)
    case 'equals':      return query.eq(column, v)
    case 'notEquals':   return query.not(column, isZip ? 'like' : 'ilike', v)
    case 'isEmpty':     return query.or(`${column}.is.null,${column}.eq.`)
    case 'isNotEmpty':  return query.neq(column, '').not(column, 'is', null)
    default:            return query
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { searchParams } = request.nextUrl
  const search        = searchParams.get('search') ?? ''
  const stateParam    = searchParams.get('state') ?? ''
  const genderParam   = searchParams.get('gender') ?? ''
  const favoriteParam = searchParams.get('favorite')
  const sortRaw       = searchParams.get('sort') ?? '[]'
  const filtersRaw    = searchParams.get('filters') ?? '[]'
  const max           = Math.min(parseInt(searchParams.get('max') ?? String(HARD_MAX)) || HARD_MAX, HARD_MAX)
  const format        = (searchParams.get('format') ?? 'json').toLowerCase()

  let sorting: { id: string; desc: boolean }[] = []
  let columnFilters: { id: string; value: ColFilterValue }[] = []

  try { sorting       = JSON.parse(sortRaw)    } catch { /* ignore */ }
  try { columnFilters = JSON.parse(filtersRaw) } catch { /* ignore */ }

  const hasColumnFilters = columnFilters.length > 0

  // Supabase / PostgREST caps responses at 1,000 rows regardless of the
  // limit/range we ask for, so we always paginate in 1,000-row chunks.
  const PAGE = 1000
  const leads: Lead[] = []

  if (!hasColumnFilters) {
    // Fast path — search_leads RPC, paginated.
    const sortCol  = sorting.length > 0 ? sorting[0].id   : 'last_name'
    const sortDesc = sorting.length > 0 ? sorting[0].desc : false

    let offset = 0

    while (offset < max) {
      const limit = Math.min(PAGE, max - offset)

      const { data, error } = await supabase.rpc('search_leads', {
        p_search:    search.trim(),
        p_state:     stateParam,
        p_gender:    genderParam,
        p_favorite:  favoriteParam === 'true' ? true : null,
        p_sort_col:  sortCol,
        p_sort_desc: sortDesc,
        p_limit:     limit,
        p_offset:    offset,
      })

      if (error) {
        console.error('[API /leads/export] RPC Error:', error.message)
        
return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const batch = (data ?? [])
        .filter((r: any) => r.leads_data !== null)
        .map((r: any) => r.leads_data as Lead)

      if (batch.length === 0) break
      leads.push(...batch)
      if (batch.length < limit) break
      offset += limit
    }
  } else {
    // Slow path — PostgREST builder, paginated via .range().
    const applyFilters = (q: any) => {
      if (stateParam) q = q.eq('facility_state', stateParam)

      if (search.trim()) {
        const term = search.trim()

        if (term.length < 3) {
          q = q.or(`first_name.ilike.${term}%,last_name.ilike.${term}%,facility_state.ilike.${term}%`)
        } else {
          q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,occupation_title.ilike.%${term}%,facility_name.ilike.%${term}%,facility_city.ilike.%${term}%`)
        }
      }

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

          if (orParts.length > 0) q = q.or(orParts.join(','))
        } else {
          for (const cond of activeConditions) {
            q = applyConditionToQuery(q, columnId, cond)
          }
        }
      }

      return q
    }

    let offset = 0

    while (offset < max) {
      const limit = Math.min(PAGE, max - offset)
      let dataQuery = applyFilters(supabase.from('leads').select('*'))

      if (sorting.length > 0) {
        for (const s of sorting) dataQuery = dataQuery.order(s.id, { ascending: !s.desc })
      } else {
        dataQuery = dataQuery.order('last_name', { ascending: true })
      }

      dataQuery = dataQuery.range(offset, offset + limit - 1)

      const { data, error } = await dataQuery

      if (error) {
        console.error('[API /leads/export] PostgREST Error:', error.message)
        
return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const batch = (data ?? []) as Lead[]

      if (batch.length === 0) break
      leads.push(...batch)
      if (batch.length < limit) break
      offset += limit
    }
  }

  if (format === 'csv') {
    const csv = leadsToCsv(leads)
    const stamp = new Date().toISOString().slice(0, 10)

    
return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_${stamp}.csv"`,
        'Cache-Control':       'no-store',
      },
    })
  }

  return NextResponse.json({
    data:   leads,
    total:  leads.length,
    capped: leads.length === max,
  })
}
