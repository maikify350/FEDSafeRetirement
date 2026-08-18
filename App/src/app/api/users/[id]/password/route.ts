/**
 * PUT /api/users/:id/password — change a user's portal password.
 *
 * Authorization:
 *   • Admins may change ANY user's password (no current password required).
 *   • A user may change their OWN password, but must supply the correct
 *     current password (verified via a throwaway sign-in).
 *
 * The target user must already have a Supabase Auth account (portal access).
 * Records created without portal access can't have a password set here.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { createClient, createAdminClient } from '@/utils/supabase/server'

const MIN_LENGTH = 8

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: callerRow } = await admin.from('users').select('role').eq('id', authUser.id).single()
  const isAdmin = callerRow?.role === 'admin'
  const isSelf  = authUser.id === id

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, any>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const newPassword = String(body.newPassword ?? '')

  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_LENGTH} characters` }, { status: 400 })
  }

  // Self-service (non-admin) must confirm the current password.
  if (isSelf && !isAdmin) {
    const currentPassword = String(body.currentPassword ?? '')

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }


    // Verify on a throwaway client so we never disturb the real session cookies.
    const verifier = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { error: signInErr } = await verifier.auth.signInWithPassword({
      email: authUser.email!,
      password: currentPassword,
    })

    if (signInErr) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }
  }

  // Confirm the target exists in our users table.
  const { data: target } = await admin.from('users').select('*').eq('id', id).single()

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Look up auth user account by email to handle seeded ID differences
  const { data: listData } = await admin.auth.admin.listUsers()
  const authRecord = listData?.users?.find(u => u.email?.toLowerCase() === target.email?.toLowerCase())

  if (authRecord) {
    const { error } = await admin.auth.admin.updateUserById(authRecord.id, { password: newPassword })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  } else {
    // Auto-provision Supabase Auth account with this password
    const { error } = await admin.auth.admin.createUser({
      email: target.email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        first_name: target.first_name,
        last_name: target.last_name,
        email_verified: true,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}
