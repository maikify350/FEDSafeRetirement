import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, phone, role, color, avatar_url')
    .in('role', ['agent', 'advisor', 'admin'])
    .order('last_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
