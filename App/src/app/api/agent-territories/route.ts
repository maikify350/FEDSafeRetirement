/**
 * GET  /api/agent-territories          — All territory assignments
 * POST /api/agent-territories          — Create assignment(s)
 * DELETE /api/agent-territories?id=.. — Remove assignment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_territories')
    .select(`
      id,
      state,
      city,
      notes,
      cre_dt,
      agent:users!agent_territories_agent_id_fkey (
        id, first_name, last_name, email, phone
      )
    `)
    .order('state', { ascending: true })
    .order('city', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { agent_id, state, city, notes } = body
  if (!agent_id || !state) {
    return NextResponse.json({ error: 'agent_id and state are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('agent_territories')
    .insert({ agent_id, state: state.trim().toUpperCase(), city: city?.trim() || '', notes: notes || '', cre_by: 'app', mod_by: 'app' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('agent_territories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
