/**
 * GET    /api/events          — List all events (with assigned user info + color)
 * POST   /api/events          — Create new event
 * PATCH  /api/events?id=...   — Update event
 * DELETE /api/events?id=...   — Delete event by UUID
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'
import { applyOData } from '@/utils/odata'

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
  expected_attendees,
  expected_guests,
  cre_dt,
  assignedto:users!events_assignedto_fk_fkey (
    id, first_name, last_name, email, color
  )
`

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  let query = supabase
    .from('events')
    .select(EVENT_SELECT)
    .order('event_seq', { ascending: true })

  // Apply OData query options
  query = applyOData(query, req.nextUrl.searchParams)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  const { description, notes, assignedto_fk, state_fk, city, event_date, event_time, duration, expected_attendees, expected_guests } = body

  if (!description?.trim() || !state_fk?.trim() || !city?.trim()) {
    return NextResponse.json({ error: 'description, state_fk, and city are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      description: description.trim(),
      notes: notes?.trim() || null,
      assignedto_fk: assignedto_fk || null,
      state_fk: state_fk.trim().toUpperCase(),
      city: city.trim(),
      event_date: event_date || null,
      event_time: event_time ? (event_time.length === 5 ? `${event_time}:00` : event_time) : null,
      duration: duration ? Number(duration) : null,
      expected_attendees: expected_attendees ? Number(expected_attendees) : 0,
      expected_guests: expected_guests ? Number(expected_guests) : 0,
    })
    .select(EVENT_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json()
  const { description, notes, assignedto_fk, state_fk, city, event_date, event_time, duration, expected_attendees, expected_guests } = body

  const updates: Record<string, unknown> = {}
  if (description !== undefined) updates.description = description.trim()
  if (notes       !== undefined) updates.notes       = notes?.trim() || null
  if (assignedto_fk !== undefined) updates.assignedto_fk = assignedto_fk || null
  if (state_fk    !== undefined) updates.state_fk   = state_fk.trim().toUpperCase()
  if (city        !== undefined) updates.city        = city.trim()
  if (event_date  !== undefined) updates.event_date  = event_date || null
  if (event_time  !== undefined) {
    // Browser time inputs send HH:MM; Postgres TIME columns need HH:MM:SS
    const t = event_time as string | null
    updates.event_time = t ? (t.length === 5 ? `${t}:00` : t) : null
  }
  if (duration    !== undefined) updates.duration    = duration ? Number(duration) : null
  if (expected_attendees !== undefined) updates.expected_attendees = Number(expected_attendees) || 0
  if (expected_guests    !== undefined) updates.expected_guests    = Number(expected_guests) || 0

  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select(EVENT_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
