/**
 * GET  /api/fegli-rates                        — List all FEGLI rates
 * GET  /api/fegli-rates?includeAudit=true      — Include audit/control fields
 * GET  /api/fegli-rates?age=42                 — Find the rate band containing age 42
 * GET  /api/fegli-rates?ageMin=40&ageMax=44    — Filter by exact age range
 * POST /api/fegli-rates                        — Create a new rate row (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { applyOData, parseODataSelect } from '@/utils/odata'

const DATA_COLS = 'id, age_min, age_max, opt_a, opt_b, opt_c, notes'
const AUDIT_COLS = 'cre_by, cre_dt, mod_by, mod_dt'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const params = request.nextUrl.searchParams
  const includeAudit = params.get('includeAudit') === 'true'
  const selectCols = includeAudit ? `${DATA_COLS}, ${AUDIT_COLS}` : DATA_COLS

  let query = supabase.from('fegli_rates').select(parseODataSelect(params) || selectCols)

  // ?age=42 → find the band where age_min <= 42 AND age_max >= 42
  const age = params.get('age')
  if (age) {
    const ageNum = parseInt(age, 10)
    query = query.lte('age_min', ageNum).gte('age_max', ageNum)
  }

  // ?ageMin=40 → exact match on age_min
  const ageMin = params.get('ageMin')
  if (ageMin) query = query.eq('age_min', parseInt(ageMin, 10))

  // ?ageMax=44 → exact match on age_max
  const ageMax = params.get('ageMax')
  if (ageMax) query = query.eq('age_max', parseInt(ageMax, 10))

  // Apply OData query options ($orderby, $top, $skip, $filter)
  query = applyOData(query, params)

  const { data, error } = await query.order('age_min', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin role
  const admin = createAdminClient()
  const { data: userRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  if (userRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const body = await request.json()

  // Validate required fields
  const errors: string[] = []
  if (body.age_min === undefined || body.age_min === null) errors.push('age_min is required')
  if (body.age_max === undefined || body.age_max === null) errors.push('age_max is required')
  if (body.age_min !== undefined && body.age_max !== undefined && body.age_min > body.age_max) {
    errors.push('age_min must be ≤ age_max')
  }
  if (body.opt_a < 0 || body.opt_b < 0 || body.opt_c < 0) errors.push('Rates must be ≥ 0')
  if (errors.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
  }

  const { data, error } = await admin
    .from('fegli_rates')
    .insert({
      age_min: body.age_min,
      age_max: body.age_max,
      opt_a: body.opt_a,
      opt_b: body.opt_b,
      opt_c: body.opt_c,
      notes: body.notes ?? '',
      cre_by: authUser.email ?? 'system',
      mod_by: authUser.email ?? 'system',
    })
    .select(`${DATA_COLS}, ${AUDIT_COLS}`)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
