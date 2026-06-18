/**
 * GET /api/collections — List all collections (client-side, small dataset)
 * POST /api/collections — Create a new collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('collections')
    .select('*, users:created_by_user_id(email, first_name, last_name)')
    .order('cre_dt', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('collections')
    .insert({
      name: body.name,
      description: body.description || '',
      status: body.status || 'active',
      tags: body.tags || [],
      filter_criteria: body.filter_criteria || {},
      created_by_user_id: user?.id,
      cre_by: user?.email ?? 'system',
      mod_by: user?.email ?? 'system',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
