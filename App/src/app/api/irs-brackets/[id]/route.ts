/**
 * GET    /api/irs-brackets/[id]                    — Get a single bracket row (all users)
 * GET    /api/irs-brackets/[id]?includeAudit=true  — Include audit/control fields
 * PUT    /api/irs-brackets/[id]                    — Update a bracket row (admin only)
 * DELETE /api/irs-brackets/[id]                    — Delete a bracket row (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

const DATA_COLS = 'id, filing_status, floor, ceiling, base_tax, marginal_rate, notes'
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
  const supabase = createAdminClient()
  const includeAudit = request.nextUrl.searchParams.get('includeAudit') === 'true'
  const selectCols = includeAudit ? `${DATA_COLS}, ${AUDIT_COLS}` : DATA_COLS

  const { data, error } = await supabase
    .from('irs_brackets')
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
    .update({
      filing_status: body.filing_status,
      floor: body.floor,
      ceiling: body.ceiling,
      base_tax: body.base_tax,
      marginal_rate: body.marginal_rate,
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
    .from('irs_brackets')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
