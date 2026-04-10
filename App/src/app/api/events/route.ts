/**
 * GET    /api/events          — List all events (with assigned user info)
 * POST   /api/events          — Create new event
 * DELETE /api/events?id=...   — Delete event by UUID
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const EVENT_SELECT = `
  id,
  event_seq,
  description,
  notes,
  state_fk,
  city,
  event_date,
  event_time,
  duration,
  cre_dt,
  assignedto:users!events_assignedto_fk_fkey (
    id, first_name, last_name, email
  )
`

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .order('event_seq', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { description, notes, assignedto_fk, state_fk, city, event_date, event_time, duration } = body

  if (!description?.trim() || !state_fk?.trim() || !city?.trim()) {
    return NextResponse.json(
      { error: 'description, state_fk, and city are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      description: description.trim(),
      notes: notes?.trim() || null,
      assignedto_fk: assignedto_fk || null,
      state_fk: state_fk.trim().toUpperCase(),
      city: city.trim(),
      event_date: event_date || null,       // "YYYY-MM-DD" or null
      event_time: event_time || null,       // "HH:MM" or null
      duration: duration ? Number(duration) : null,  // integer minutes
    })
    .select(EVENT_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
