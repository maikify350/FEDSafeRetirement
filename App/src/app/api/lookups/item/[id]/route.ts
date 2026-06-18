/**
 * PATCH /api/lookups/item/[id] — Update a single lookup item
 * DELETE /api/lookups/item/[id] — Delete a single lookup item
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data: { user } } = await supabase.auth.getUser()

  const updates: Record<string, any> = {}

  // Map both camelCase and snake_case input
  const fieldMap: Record<string, string> = {
    value: 'value',
    label: 'label',
    abbreviation: 'abbreviation',
    order: 'sort_order',
    sort_order: 'sort_order',
    is_active: 'is_active',
    isActive: 'is_active',
    is_default: 'is_default',
    isDefault: 'is_default',
    is_pinned: 'is_pinned',
    isPinned: 'is_pinned',
    hex: 'hex',
    rgb: 'rgb',
  }

  for (const [inputKey, dbCol] of Object.entries(fieldMap)) {
    if (inputKey in body) {
      updates[dbCol] = body[inputKey]
    }
  }

  updates.mod_by = user?.email ?? 'system'
  updates.mod_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('lookup')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('lookup')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
