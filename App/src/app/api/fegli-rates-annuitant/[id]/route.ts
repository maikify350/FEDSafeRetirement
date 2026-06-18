/**
 * GET    /api/fegli-rates-annuitant/[id]                    — Get a single rate row (all users)
 * GET    /api/fegli-rates-annuitant/[id]?includeAudit=true  — Include audit/control fields
 * PUT    /api/fegli-rates-annuitant/[id]                    — Update a rate row (admin only)
 * DELETE /api/fegli-rates-annuitant/[id]                    — Delete a rate row (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

const DATA_COLS = 'id, age_min, age_max, basic_75, basic_50, basic_0, opt_a, opt_b, opt_c, notes'
const AUDIT_COLS = 'cre_by, cre_dt, mod_by, mod_dt'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const admin = createAdminClient()
  const { data: userRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  if (userRow?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 }) }
  }

  return { authUser, admin }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const includeAudit = request.nextUrl.searchParams.get('includeAudit') === 'true'
  const selectCols = includeAudit ? `${DATA_COLS}, ${AUDIT_COLS}` : DATA_COLS

  const { data, error } = await supabase
    .from('fegli_rates_annuitant')
    .select(selectCols)
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await requireAdmin()
  if ('error' in result && result.error) return result.error
  const { authUser, admin } = result as any

  const body = await request.json()

  // Validate
  const errors: string[] = []
  if (body.age_min !== undefined && body.age_max !== undefined && body.age_min > body.age_max) {
    errors.push('age_min must be ≤ age_max')
  }
  if (body.basic_75 < 0 || body.basic_50 < 0 || body.basic_0 < 0 || body.opt_a < 0 || body.opt_b < 0 || body.opt_c < 0) {
    errors.push('Rates must be ≥ 0')
  }
  if (errors.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
  }

  const { data, error } = await admin
    .from('fegli_rates_annuitant')
    .update({
      age_min: body.age_min,
      age_max: body.age_max,
      basic_75: body.basic_75,
      basic_50: body.basic_50,
      basic_0: body.basic_0,
      opt_a: body.opt_a,
      opt_b: body.opt_b,
      opt_c: body.opt_c,
      notes: body.notes ?? '',
      mod_by: authUser.email ?? 'system',
      mod_dt: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`${DATA_COLS}, ${AUDIT_COLS}`)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await requireAdmin()
  if ('error' in result && result.error) return result.error
  const { admin } = result as any

  const { error } = await admin
    .from('fegli_rates_annuitant')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
