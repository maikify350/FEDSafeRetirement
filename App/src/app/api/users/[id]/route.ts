/**
 * GET/PUT /api/users/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { data: { user } } = await supabase.auth.getUser()

  const updates: Record<string, any> = {}
  const allowed = ['first_name', 'last_name', 'phone', 'role', 'avatar_url']
  for (const key of allowed) { if (key in body) updates[key] = body[key] }
  updates.mod_by = user?.email ?? 'system'

  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
