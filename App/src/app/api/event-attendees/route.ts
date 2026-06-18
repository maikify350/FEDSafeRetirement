/**
 * /api/event-attendees
 *
 * GET    ?event_id=...           — List all attendees for an event (with nested guests)
 * POST                           — Create attendee (invitee, lead, or guest)
 * PATCH  ?id=...                 — Update attendee
 * DELETE ?id=...                 — Delete attendee
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/server'

const ATTENDEE_SELECT = `
  id, event_fk, parent_fk,
  first_name, last_name, phone, email,
  attendee_type, checked_in, no_show, check_in_time,
  notes, cre_dt, upd_dt
`

// ── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event_id')

  if (!eventId) {
    return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('event_attendees')
    .select(ATTENDEE_SELECT)
    .eq('event_fk', eventId)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  const { event_fk, parent_fk, first_name, last_name, phone, email, attendee_type, notes } = body

  if (!event_fk) {
    return NextResponse.json({ error: 'event_fk is required' }, { status: 400 })
  }
  if (!first_name?.trim() && !last_name?.trim()) {
    return NextResponse.json({ error: 'At least first or last name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('event_attendees')
    .insert({
      event_fk,
      parent_fk: parent_fk || null,
      first_name: (first_name || '').trim(),
      last_name: (last_name || '').trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      attendee_type: attendee_type ?? 1,
      notes: notes?.trim() || null,
    })
    .select(ATTENDEE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// ── PATCH ───────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json()
  const updates: Record<string, unknown> = { upd_dt: new Date().toISOString() }

  if (body.first_name !== undefined)    updates.first_name    = (body.first_name || '').trim()
  if (body.last_name  !== undefined)    updates.last_name     = (body.last_name || '').trim()
  if (body.phone      !== undefined)    updates.phone         = body.phone?.trim() || null
  if (body.email      !== undefined)    updates.email         = body.email?.trim() || null
  if (body.attendee_type !== undefined) updates.attendee_type = body.attendee_type
  if (body.notes      !== undefined)    updates.notes         = body.notes?.trim() || null
  if (body.parent_fk  !== undefined)    updates.parent_fk     = body.parent_fk || null
  if (body.no_show    !== undefined)    updates.no_show       = body.no_show

  // Handle check-in toggle
  if (body.checked_in !== undefined) {
    updates.checked_in = body.checked_in
    if (body.checked_in) {
      updates.check_in_time = new Date().toISOString()
      updates.no_show = false
    } else {
      updates.check_in_time = null
    }
  }

  const { data, error } = await supabase
    .from('event_attendees')
    .update(updates)
    .eq('id', id)
    .select(ATTENDEE_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('event_attendees').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
