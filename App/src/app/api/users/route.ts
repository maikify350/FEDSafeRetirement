import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: callerRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  
  if (callerRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('users')
    .select('*')
    .order('cre_dt', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

/**
 * POST /api/users — create a new user RECORD (admin only).
 *
 * This does NOT grant portal access (no Supabase Auth account is created).
 * Not every user in the firm needs to log in; portal access is granted later
 * via a separate "Invite" action on the user edit screen.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: callerRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  if (callerRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const allowedRoles = ['admin', 'partner', 'agent', 'advisor', 'viewer']
  const role = allowedRoles.includes(body.role) ? body.role : 'viewer'

  // Reject duplicates up front for a friendlier message than the unique-constraint error.
  const { data: existing } = await admin.from('users').select('id').eq('email', email).maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 })
  }

  const row = {
    email,
    first_name: String(body.first_name ?? '').trim(),
    last_name: String(body.last_name ?? '').trim(),
    phone: String(body.phone ?? '').trim(),
    alternate_phone: String(body.alternate_phone ?? '').trim(),
    role,
    cre_by: authUser.email ?? 'system',
    mod_by: authUser.email ?? 'system',
  }

  const { data, error } = await admin.from('users').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

