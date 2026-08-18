/**
 * POST /api/users/:id/invite — Generate or send invitation / password set link for a user
 * Admin only.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createClient, createAdminClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: callerRow } = await admin.from('users').select('role').eq('id', authUser.id).single()

  if (callerRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  // Get target user record
  const { data: target, error: targetErr } = await admin.from('users').select('*').eq('id', id).single()

  if (targetErr || !target) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 })
  }

  const origin = request.nextUrl.origin || 'https://fedsafe-retirement.vercel.app'
  const redirectTo = `${origin}/auth/callback?next=/dashboard`

  // Check if user already exists in auth.users
  const { data: listData } = await admin.auth.admin.listUsers()
  const authRecord = listData?.users?.find(u => u.email?.toLowerCase() === target.email?.toLowerCase())

  try {
    let linkResult: any

    if (!authRecord) {
      // Generate invite link for new user
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'invite',
        email: target.email,
        options: {
          data: {
            first_name: target.first_name,
            last_name: target.last_name,
            role: target.role,
          },
          redirectTo,
        },
      })

      if (error) {
        // If invite link fails, fallback to signup/recovery
        const signupRes = await admin.auth.admin.generateLink({
          type: 'signup',
          email: target.email,
          password: 'TempPassword$!2026',
          options: { redirectTo },
        })

        if (signupRes.error) throw new Error(signupRes.error.message)
        linkResult = signupRes.data
      } else {
        linkResult = data
      }
    } else {
      // User exists in auth -> generate password recovery / setup link
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: target.email,
        options: { redirectTo },
      })

      if (error) throw new Error(error.message)
      linkResult = data
    }

    return NextResponse.json({
      success: true,
      email: target.email,
      name: `${target.first_name} ${target.last_name}`.trim(),
      action_link: linkResult?.properties?.action_link || null,
      email_otp: linkResult?.properties?.email_otp || null,
      is_new: !authRecord,
      message: `Invitation link generated successfully for ${target.email}`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate invitation link' }, { status: 500 })
  }
}
