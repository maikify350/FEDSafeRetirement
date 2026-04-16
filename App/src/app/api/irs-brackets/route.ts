/**
 * GET  /api/irs-brackets                                         — List all brackets
 * GET  /api/irs-brackets?includeAudit=true                       — Include audit fields
 * GET  /api/irs-brackets?filingStatus=Single                     — Filter by filing status
 * GET  /api/irs-brackets?income=75000                            — Find bracket containing income
 * GET  /api/irs-brackets?filingStatus=Married&income=120000      — Lookup specific bracket
 * GET  /api/irs-brackets?floor=36551&ceiling=74550               — Filter by exact range
 * POST /api/irs-brackets                                         — Create (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

const DATA_COLS = 'id, filing_status, floor, ceiling, base_tax, marginal_rate, notes'
const AUDIT_COLS = 'cre_by, cre_dt, mod_by, mod_dt'

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const params = request.nextUrl.searchParams
  const includeAudit = params.get('includeAudit') === 'true'
  const selectCols = includeAudit ? `${DATA_COLS}, ${AUDIT_COLS}` : DATA_COLS

  let query = supabase.from('irs_brackets').select(selectCols)

  // ?filingStatus=Single → filter by filing status
  const filingStatus = params.get('filingStatus')
  if (filingStatus) query = query.eq('filing_status', filingStatus)

  // ?income=75000 → find the bracket where floor <= 75000 AND ceiling >= 75000
  const income = params.get('income')
  if (income) {
    const incomeNum = parseFloat(income)
    query = query.lte('floor', incomeNum).gte('ceiling', incomeNum)
  }

  // ?floor=36551 → exact match on floor
  const floor = params.get('floor')
  if (floor) query = query.eq('floor', parseFloat(floor))

  // ?ceiling=74550 → exact match on ceiling
  const ceiling = params.get('ceiling')
  if (ceiling) query = query.eq('ceiling', parseFloat(ceiling))

  const { data, error } = await query
    .order('filing_status', { ascending: true })
    .order('floor', { ascending: true })

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
  if (!body.filing_status) errors.push('filing_status is required')
  if (body.floor === undefined || body.floor === null) errors.push('floor is required')
  if (body.ceiling === undefined || body.ceiling === null) errors.push('ceiling is required')
  if (body.floor !== undefined && body.ceiling !== undefined && body.floor > body.ceiling) {
    errors.push('floor must be ≤ ceiling')
  }
  if (body.base_tax < 0 || body.base_tax > 1) errors.push('base_tax must be between 0 and 1')
  if (body.marginal_rate < 0 || body.marginal_rate > 1) errors.push('marginal_rate must be between 0 and 1')
  if (errors.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
  }

  const { data, error } = await admin
    .from('irs_brackets')
    .insert({
      filing_status: body.filing_status,
      floor: body.floor,
      ceiling: body.ceiling,
      base_tax: body.base_tax,
      marginal_rate: body.marginal_rate,
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
