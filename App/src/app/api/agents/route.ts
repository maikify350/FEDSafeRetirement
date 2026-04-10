/**
 * GET /api/agents — All users with role='agent'
 * POST /api/agents — Upsert agent from Excel seed
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, phone, role, avatar_url')
    .in('role', ['agent', 'advisor', 'admin'])
    .order('last_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
