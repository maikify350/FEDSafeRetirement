/**
 * GET  /api/lookups/[type] — Get all items for a lookup type
 * POST /api/lookups/[type] — Create a new lookup item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const supabase = await createClient()
  const activeOnly = request.nextUrl.searchParams.get('activeOnly') === 'true'

  let query = supabase
    .from('lookup')
    .select('*')
    .eq('type', type)
    .order('sort_order', { ascending: true })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('lookup')
    .insert({
      type,
      value: body.value,
      label: body.label || body.value,
      abbreviation: body.abbreviation || null,
      sort_order: body.order ?? body.sort_order ?? 0,
      is_active: body.isActive ?? body.is_active ?? true,
      is_default: body.isDefault ?? body.is_default ?? false,
      cre_by: user?.email ?? 'system',
      mod_by: user?.email ?? 'system',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
