import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('cre_dt', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
