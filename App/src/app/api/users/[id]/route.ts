import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Authorization check: must be admin OR the user themselves
  const { data: callerRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  const isAdmin = callerRow?.role === 'admin'
  const isSelf = authUser.id === id

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await admin.from('users').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Authorization check: must be admin OR the user themselves
  const { data: callerRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  const isAdmin = callerRow?.role === 'admin'
  const isSelf = authUser.id === id

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const updates: Record<string, any> = {}
  
  // Define allowed fields
  const allowed = ['first_name', 'last_name', 'phone', 'alternate_phone', 'avatar_url', 'color', 'bio', 'bio_short', 'bio_long']
  
  // Only admins can change user roles
  if (isAdmin) {
    allowed.push('role')
  }

  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  updates.mod_by = authUser.email ?? 'system'

  const { data, error } = await admin.from('users').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Only admins may delete users
  const { data: callerRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  if (callerRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  // Prevent self-deletion
  if (authUser.id === id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  // Delete from users table first
  const { error: dbError } = await admin.from('users').delete().eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Delete from Supabase Auth
  const { error: authError } = await admin.auth.admin.deleteUser(id)
  if (authError) {
    // Row already gone from our table — log but don't fail the request
    console.warn('[DELETE /api/users/:id] Auth delete warning:', authError.message)
  }

  return NextResponse.json({ ok: true })
}

